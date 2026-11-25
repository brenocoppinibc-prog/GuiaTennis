-- ============================================================
-- Nota fiscal automática (regra 331, 25/11/2026: "não, já quero fazer agora")
-- ============================================================
-- A cada compra paga, a NFS-e de São Paulo sai sozinha pelo web service da
-- Prefeitura (NFS-e Paulistana), assinada com o e-CNPJ A1 do GuiaTennis, como
-- a Shopify e a Hotmart fazem. O que a Contabilizei definiu (25/11/2026): CCM
-- 05930642, código de serviço 02917 para planos e anúncios, ISS de 2,01%
-- (Simples Nacional, que ainda usa o leiaute 1 da Prefeitura). A função
-- netlify/functions/nota-fiscal.mjs monta, assina e envia; o banco guarda a
-- fila, a configuração e o certificado (no cofre, vault).
--   nota_configuracao            uma linha: ligada, ambiente (teste: a
--                                Prefeitura só confere, nada é emitido;
--                                producao: emite de verdade), CCM, código,
--                                alíquota, série, próximo RPS, descrição e os
--                                dados do certificado (sem a chave).
--   notas_fiscais                uma por compra paga.
--   avisar_compra_paga           com a nota ligada, põe a compra na fila (e
--                                não pede mais para emitir à mão).
--   cancelar nota no estorno     o estorno total pede o cancelamento.
--   nota_configuracao_do_admin, salvar_nota_configuracao, pedir_nota,
--   notas_fiscais_do_admin       só o admin.
--   nota_para_emitir, registrar_nota, notas_para_processar,
--   nota_para_cancelar, guardar_certificado_da_nota,
--   certificado_da_nota          só a função da Netlify (service_role).
--   minhas_compras               traz o link da nota emitida.
--   lembrar_notas_do_mes         no dia 1, o lembrete do CSV para a
--                                Contabilizei (até o dia 5) e da alíquota.
-- Pode rodar de novo sem estragar nada.

create table if not exists public.nota_configuracao (
  id int primary key default 1 check (id = 1),
  ligada boolean not null default false,
  ambiente text not null default 'teste' check (ambiente in ('teste', 'producao')),
  ccm text not null default '05930642',
  codigo_servico text not null default '02917',
  aliquota numeric(6, 4) not null default 0.0201,
  serie text not null default 'GT',
  proximo_rps bigint not null default 1,
  descricao text not null default 'Prestação de serviços de disponibilização de espaço publicitário, veiculação de anúncios e assinatura de planos na plataforma GuiaTennis.',
  certificado_cnpj text,
  certificado_titular text,
  certificado_valido_ate timestamptz,
  certificado_enviado_em timestamptz,
  ultimo_teste_em timestamptz,
  ultimo_teste text,
  updated_at timestamptz not null default now()
);
insert into public.nota_configuracao (id) values (1) on conflict (id) do nothing;
alter table public.nota_configuracao enable row level security;
revoke all on public.nota_configuracao from anon, authenticated;

create table if not exists public.notas_fiscais (
  compra_id uuid primary key references public.compras_de_creditos (id) on delete cascade,
  situacao text not null default 'pendente'
    check (situacao in ('pendente', 'processando', 'emitida', 'testada', 'erro', 'cancelar', 'cancelada')),
  ambiente text,
  serie text,
  numero_rps bigint,
  numero_nfe bigint,
  codigo_verificacao text,
  mensagem text,
  tentativas int not null default 0,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  emitida_em timestamptz,
  cancelada_em timestamptz
);
create unique index if not exists notas_fiscais_rps on public.notas_fiscais (serie, numero_rps) where numero_rps is not null;
alter table public.notas_fiscais enable row level security;
revoke all on public.notas_fiscais from anon, authenticated;

-- O link público da nota no site da Prefeitura (o mesmo do PDF que ela gera).
create or replace function public.link_da_nota(p_numero bigint, p_codigo text)
returns text
language sql
stable
set search_path = ''
as $$
  select case when p_numero is null or coalesce(p_codigo, '') = '' then null
    else 'https://nfe.prefeitura.sp.gov.br/contribuinte/notaprint.aspx?ccm='
      || (select ccm from public.nota_configuracao where id = 1)
      || '&nf=' || p_numero || '&cod=' || p_codigo end;
$$;

-- ---------- Admin ----------
create or replace function public.nota_configuracao_do_admin()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.nota_configuracao;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis.' using errcode = '42501';
  end if;
  select * into c from public.nota_configuracao where id = 1;
  return jsonb_build_object(
    'ligada', c.ligada, 'ambiente', c.ambiente, 'ccm', c.ccm, 'codigo_servico', c.codigo_servico,
    'aliquota', c.aliquota, 'serie', c.serie, 'proximo_rps', c.proximo_rps, 'descricao', c.descricao,
    'certificado_cnpj', c.certificado_cnpj, 'certificado_titular', c.certificado_titular,
    'certificado_valido_ate', c.certificado_valido_ate, 'certificado_enviado_em', c.certificado_enviado_em,
    'ultimo_teste_em', c.ultimo_teste_em, 'ultimo_teste', c.ultimo_teste,
    'pendentes', (select count(*) from public.notas_fiscais where situacao in ('pendente', 'processando', 'cancelar')),
    'com_erro', (select count(*) from public.notas_fiscais where situacao = 'erro'));
end $$;

create or replace function public.salvar_nota_configuracao(
  p_ligada boolean, p_ambiente text, p_codigo text, p_aliquota numeric, p_serie text, p_descricao text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo text := regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g');
  v_serie text := upper(btrim(coalesce(p_serie, '')));
  v_descricao text := regexp_replace(btrim(coalesce(p_descricao, '')), '\s+', ' ', 'g');
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis.' using errcode = '42501';
  end if;
  if p_ambiente not in ('teste', 'producao') then
    raise exception 'Escolha Teste ou Produção.' using errcode = '22023';
  end if;
  if v_codigo !~ '^[0-9]{4,5}$' then
    raise exception 'O código do serviço tem 4 ou 5 números (ex.: 02917).' using errcode = '22023';
  end if;
  if p_aliquota is null or p_aliquota < 0 or p_aliquota > 0.05 then
    raise exception 'A alíquota do ISS vai de 0%% a 5%%.' using errcode = '22023';
  end if;
  if v_serie !~ '^[A-Z0-9]{1,5}$' then
    raise exception 'A série tem de 1 a 5 letras ou números.' using errcode = '22023';
  end if;
  if length(v_descricao) < 10 or length(v_descricao) > 1000 then
    raise exception 'A descrição tem de 10 a 1.000 letras.' using errcode = '22023';
  end if;
  update public.nota_configuracao
    set ligada = coalesce(p_ligada, false), ambiente = p_ambiente, codigo_servico = lpad(v_codigo, 5, '0'),
        aliquota = round(p_aliquota, 4), serie = v_serie, descricao = v_descricao, updated_at = now()
    where id = 1;
  return public.nota_configuracao_do_admin();
end $$;

-- "Emitir a nota" (ou "Emitir de novo") numa compra paga: entra na fila.
create or replace function public.pedir_nota(p_compra uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.compras_de_creditos;
  n public.notas_fiscais;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis.' using errcode = '42501';
  end if;
  select * into c from public.compras_de_creditos where id = p_compra;
  if not found or c.situacao <> 'paga' then
    raise exception 'Só compra paga tem nota.' using errcode = '22023';
  end if;
  select * into n from public.notas_fiscais where compra_id = p_compra for update;
  if found and n.situacao = 'emitida' then
    return 'ja_emitida';
  end if;
  insert into public.notas_fiscais (compra_id) values (p_compra)
    on conflict (compra_id) do update set situacao = 'pendente', tentativas = 0, mensagem = null, atualizada_em = now();
  return 'pendente';
end $$;

create or replace function public.notas_fiscais_do_admin()
returns table (compra_id uuid, situacao text, ambiente text, numero_rps bigint, numero_nfe bigint,
               codigo_verificacao text, link text, mensagem text, atualizada_em timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis.' using errcode = '42501';
  end if;
  return query
    select n.compra_id, n.situacao, n.ambiente, n.numero_rps, n.numero_nfe, n.codigo_verificacao,
           public.link_da_nota(n.numero_nfe, n.codigo_verificacao), n.mensagem, n.atualizada_em
      from public.notas_fiscais n
      order by n.atualizada_em desc
      limit 300;
end $$;

-- ---------- A função da Netlify (service_role) ----------
-- O certificado fica no cofre (vault), cifrado: a chave e o certificado em
-- PEM, num JSON. A configuração guarda só o CNPJ, o titular e a validade.
create or replace function public.guardar_certificado_da_nota(
  p_segredo text, p_cnpj text, p_titular text, p_valido_ate timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if coalesce(p_segredo, '') = '' then
    raise exception 'Certificado vazio.' using errcode = '22023';
  end if;
  select id into v_id from vault.secrets where name = 'nota_certificado';
  if v_id is null then
    perform vault.create_secret(p_segredo, 'nota_certificado', 'Certificado A1 do GuiaTennis para a nota fiscal automática');
  else
    perform vault.update_secret(v_id, p_segredo);
  end if;
  update public.nota_configuracao
    set certificado_cnpj = p_cnpj, certificado_titular = p_titular, certificado_valido_ate = p_valido_ate,
        certificado_enviado_em = now(), updated_at = now()
    where id = 1;
end $$;

create or replace function public.certificado_da_nota()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v text;
begin
  select decrypted_secret into v from vault.decrypted_secrets where name = 'nota_certificado' limit 1;
  return v;
exception when others then
  return null;
end $$;

-- A configuração para o "Testar com a Prefeitura" (sem os dados do certificado).
create or replace function public.nota_configuracao_do_servico()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('ambiente', c.ambiente, 'ccm', c.ccm, 'codigo_servico', c.codigo_servico, 'aliquota', c.aliquota,
                            'serie', c.serie, 'proximo_rps', c.proximo_rps, 'descricao', c.descricao)
    from public.nota_configuracao c where c.id = 1;
$$;

create or replace function public.registrar_teste_da_nota(p_resultado text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.nota_configuracao set ultimo_teste_em = now(), ultimo_teste = left(p_resultado, 1000) where id = 1;
$$;

-- O que a função precisa para montar o RPS. Em produção, o número do RPS é
-- reservado uma vez por compra (mandar de novo nunca gera outra nota: a
-- Prefeitura recusa RPS repetido). Compra de teste (prévia) nunca vira nota
-- de verdade.
create or replace function public.nota_para_emitir(p_compra uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cfg public.nota_configuracao;
  c public.compras_de_creditos;
  n public.notas_fiscais;
  v_rps bigint;
  v_academia text;
begin
  select * into n from public.notas_fiscais where compra_id = p_compra for update;
  if not found or n.situacao not in ('pendente', 'processando', 'erro') then
    return null;
  end if;
  select * into c from public.compras_de_creditos where id = p_compra;
  select * into cfg from public.nota_configuracao where id = 1 for update;
  if c.situacao <> 'paga' then
    update public.notas_fiscais set situacao = 'cancelada', mensagem = 'A compra não está paga.', atualizada_em = now()
      where compra_id = p_compra;
    return null;
  end if;
  if cfg.ambiente = 'producao' and c.de_teste then
    update public.notas_fiscais set situacao = 'cancelada', mensagem = 'Compra de teste: não vira nota de verdade.', atualizada_em = now()
      where compra_id = p_compra;
    return null;
  end if;
  v_rps := n.numero_rps;
  if cfg.ambiente = 'producao' and v_rps is null then
    v_rps := cfg.proximo_rps;
    update public.nota_configuracao set proximo_rps = proximo_rps + 1 where id = 1;
  end if;
  update public.notas_fiscais
    set situacao = 'processando', tentativas = tentativas + 1, ambiente = cfg.ambiente,
        serie = case when cfg.ambiente = 'producao' then coalesce(serie, cfg.serie) else serie end,
        numero_rps = case when cfg.ambiente = 'producao' then v_rps else numero_rps end,
        atualizada_em = now()
    where compra_id = p_compra;
  select name into v_academia from public.academias where id = c.academia_id;
  return jsonb_build_object(
    'compra', c.id, 'ambiente', cfg.ambiente, 'ccm', cfg.ccm, 'codigo_servico', cfg.codigo_servico,
    'aliquota', cfg.aliquota, 'serie', coalesce(case when cfg.ambiente = 'producao' then n.serie end, cfg.serie),
    'numero_rps', coalesce(v_rps, cfg.proximo_rps), 'descricao', cfg.descricao,
    'valor', coalesce(c.valor_pago, c.valor), 'data', to_char(coalesce(c.paga_em, now()) at time zone 'America/Sao_Paulo', 'YYYY-MM-DD'),
    'tipo', c.tipo, 'plano', c.plano, 'periodo', c.periodo, 'academia', v_academia,
    'tomador', jsonb_build_object('documento', c.nota_documento, 'nome', c.nota_nome, 'email', c.nota_email));
end $$;

-- O resultado da Prefeitura. Emitida: a compra fica com a nota e o e-mail com
-- o link vai para o e-mail da nota. Erro: o admin é avisado (uma vez por
-- compra e por mensagem).
create or replace function public.registrar_nota(
  p_compra uuid, p_situacao text, p_numero_nfe bigint, p_codigo text, p_mensagem text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.compras_de_creditos;
  v_academia text;
  v_link text;
  v_texto text;
begin
  if p_situacao not in ('emitida', 'testada', 'erro', 'cancelada') then
    raise exception 'Situação inválida.' using errcode = '22023';
  end if;
  update public.notas_fiscais
    set situacao = p_situacao,
        numero_nfe = coalesce(p_numero_nfe, numero_nfe),
        codigo_verificacao = coalesce(nullif(p_codigo, ''), codigo_verificacao),
        mensagem = left(p_mensagem, 1000),
        emitida_em = case when p_situacao = 'emitida' then now() else emitida_em end,
        cancelada_em = case when p_situacao = 'cancelada' then now() else cancelada_em end,
        atualizada_em = now()
    where compra_id = p_compra;
  select * into c from public.compras_de_creditos where id = p_compra;
  if not found then
    return;
  end if;
  select name into v_academia from public.academias where id = c.academia_id;
  if p_situacao = 'emitida' then
    update public.compras_de_creditos set nota_emitida_em = now() where id = p_compra;
    v_link := public.link_da_nota(p_numero_nfe, p_codigo);
    if coalesce(c.nota_email, '') <> '' then
      v_texto := 'A nota fiscal da compra de R$ ' || coalesce(c.valor_pago, c.valor) || ' da ' || coalesce(v_academia, 'academia')
        || ' no GuiaTennis foi emitida: nota n.º ' || p_numero_nfe || ', código de verificação ' || p_codigo || '.';
      perform public.por_na_fila(
        'nota-emitida:' || c.id, 'nota_emitida', c.nota_email,
        'Nota fiscal do GuiaTennis n.º ' || p_numero_nfe,
        public.email_montado('Sua nota fiscal', public.email_p(public.html_texto(v_texto)),
          'Ver a nota fiscal', v_link,
          'Você recebe este e-mail porque este endereço recebe as notas fiscais da ' || public.html_texto(coalesce(v_academia, 'academia')) || ' no GuiaTennis Parceiros.'),
        v_texto || E'\n\nVer a nota fiscal: ' || v_link);
    end if;
  elsif p_situacao = 'erro' then
    v_texto := coalesce(v_academia, 'Academia') || ', R$ ' || coalesce(c.valor_pago, c.valor) || ': ' || coalesce(p_mensagem, 'erro sem mensagem') || '.';
    perform public.aviso_ao_admin('nota-erro:' || c.id || ':' || md5(coalesce(p_mensagem, '')), 'nota_erro',
      'A nota não saiu: ' || coalesce(v_academia, 'academia'), 'Nota fiscal com erro',
      public.email_p(public.html_texto(v_texto))
        || public.email_p('Corrija em Admin › Compras e notas › Nota fiscal automática e toque em "Emitir de novo".'),
      v_texto || E'\n\nCorrija em Admin › Compras e notas › Nota fiscal automática e toque em "Emitir de novo".',
      'compras');
  end if;
exception when others then
  raise warning 'registrar nota: %', sqlerrm;
end $$;

-- A fila: o que falta emitir (o erro tenta de novo até 3 vezes, de meia em
-- meia hora; "processando" parado há 15 minutos volta) e o que cancelar.
create or replace function public.notas_para_processar()
returns table (compra_id uuid, acao text)
language sql
stable
security definer
set search_path = ''
as $$
  select n.compra_id, case when n.situacao = 'cancelar' then 'cancelar' else 'emitir' end
    from public.notas_fiscais n
    where n.situacao = 'pendente'
       or n.situacao = 'cancelar'
       or (n.situacao = 'processando' and n.atualizada_em < now() - interval '15 minutes')
       or (n.situacao = 'erro' and n.tentativas < 3 and n.atualizada_em < now() - interval '30 minutes')
    order by n.criada_em
    limit 20;
$$;

create or replace function public.nota_para_cancelar(p_compra uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('compra', n.compra_id, 'ccm', cfg.ccm, 'numero_nfe', n.numero_nfe, 'ambiente', n.ambiente)
    from public.notas_fiscais n, public.nota_configuracao cfg
    where n.compra_id = p_compra and cfg.id = 1 and n.situacao = 'cancelar' and n.numero_nfe is not null;
$$;

-- ---------- O pagamento põe a compra na fila ----------
create or replace function public.avisar_compra_paga(p_compra uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.compras_de_creditos;
  v_academia text;
  v_quem text;
  v_que text;
  v_texto text;
  v_link text;
  v_doc text;
  r record;
begin
  select * into c from public.compras_de_creditos where id = p_compra;
  if not found or c.situacao <> 'paga' then
    return;
  end if;
  select name into v_academia from public.academias where id = c.academia_id;
  v_quem := coalesce((select coalesce(nullif(btrim(nome_responsavel), ''), email) from public.academia_acessos where user_id = c.user_id),
                     'Alguém da academia');
  v_que := case when c.tipo = 'plano'
    then 'o plano ' || public.nome_do_plano(c.plano) || case when c.periodo = 'anual' then ' anual' else ' mensal' end
    else 'créditos de promoções' end;
  v_link := public.site_dos_emails() || '/parceiros/pagamentos?abrir=' || right(replace(c.academia_id::text, '-', ''), 8)
    || '&utm_source=Email-compra';
  for r in select * from public.principais_da_academia(c.academia_id) loop
    v_texto := case when r.user_id = c.user_id then 'Você comprou ' else v_quem || ' comprou ' end
      || v_que || ' para a ' || v_academia || ': R$ ' || c.valor || ', com ' || case when c.forma = 'pix' then 'Pix' else 'cartão' end || '.';
    perform public.por_na_fila(
      'compra-paga:' || c.id || ':' || r.user_id, 'compra_paga', r.email,
      'Compra na ' || v_academia || ': R$ ' || c.valor,
      public.email_montado('Compra confirmada', public.email_p(public.html_texto(v_texto))
          || public.email_p('Não reconhece essa compra? Fale com o GuiaTennis pelo chat de ajuda.'),
        'Ver os pagamentos', v_link,
        'Você recebe este e-mail porque é responsável principal da ' || public.html_texto(v_academia) || ' no GuiaTennis Parceiros.'),
      v_texto || E'\n\nNão reconhece essa compra? Fale com o GuiaTennis pelo chat de ajuda.\n\n' || v_link);
  end loop;
  -- Regra 331: com a nota automática ligada, a compra entra na fila da nota.
  if coalesce((select ligada from public.nota_configuracao where id = 1), false) then
    insert into public.notas_fiscais (compra_id) values (c.id) on conflict (compra_id) do nothing;
    return;
  end if;
  -- Desligada: o admin emite à mão no portal da Prefeitura de São Paulo.
  begin
    v_doc := coalesce(c.nota_documento, 'sem CNPJ ou CPF');
    v_texto := v_academia || ' pagou R$ ' || c.valor || ' (' || v_que || '). Nota para '
      || coalesce(c.nota_nome, v_academia) || ', ' || v_doc || coalesce(', ' || c.nota_email, '') || '.';
    perform public.aviso_ao_admin('nota-a-emitir:' || c.id, 'nota_a_emitir',
      case when c.de_teste then 'Teste: ' else '' end || 'Emitir a nota: ' || v_academia || ', R$ ' || c.valor, 'Nota fiscal para emitir',
      public.email_p(public.html_texto(v_texto))
        || public.email_p('Emita no portal da NFS-e da Prefeitura de São Paulo e marque "Nota emitida" em Compras e notas. Ou ligue a nota automática em Compras e notas.'),
      v_texto || E'\n\nEmita no portal da NFS-e da Prefeitura de São Paulo e marque "Nota emitida" em Compras e notas. Ou ligue a nota automática em Compras e notas.',
      'compras');
  end;
exception when others then
  raise warning 'aviso de compra paga: %', sqlerrm;
end $$;

-- ---------- O estorno total cancela a nota ----------
create or replace function public.nota_no_estorno()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.situacao = 'estornada' and old.situacao is distinct from 'estornada' then
    update public.notas_fiscais set situacao = 'cancelar', atualizada_em = now()
      where compra_id = new.id and situacao = 'emitida';
    update public.notas_fiscais set situacao = 'cancelada', mensagem = 'Compra estornada antes da nota.', atualizada_em = now()
      where compra_id = new.id and situacao in ('pendente', 'erro', 'testada');
  end if;
  return new;
end $$;
drop trigger if exists nota_no_estorno on public.compras_de_creditos;
create trigger nota_no_estorno after update of situacao on public.compras_de_creditos
  for each row execute function public.nota_no_estorno();

-- ---------- Pagamentos da academia: o link da nota ----------
create or replace function public.minhas_compras(p_academia uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.posso(p_academia, 'pagamentos')
    then coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'valor', c.valor, 'forma', c.forma,
                     'situacao', c.situacao, 'created_at', c.created_at, 'paga_em', c.paga_em,
                     'tipo', c.tipo, 'plano', c.plano, 'periodo', c.periodo, 'de_teste', c.de_teste,
                     'nota_emitida_em', c.nota_emitida_em, 'nota_email', c.nota_email,
                     'nota_link', (select public.link_da_nota(n.numero_nfe, n.codigo_verificacao)
                                   from public.notas_fiscais n where n.compra_id = c.id and n.situacao = 'emitida'),
                     'valor_estornado', c.valor_estornado, 'estornada_em', c.estornada_em,
                     'reembolso', (select jsonb_build_object('situacao', p.situacao, 'created_at', p.created_at, 'resposta', p.resposta)
                                   from public.pedidos_de_reembolso p where p.compra_id = c.id order by p.created_at desc limit 1),
                     'quem', (select coalesce(nullif(btrim(x.nome_responsavel), ''), x.email)
                              from public.academia_acessos x where x.user_id = c.user_id)) order by c.created_at desc)
                   from (select * from public.compras_de_creditos where academia_id = p_academia
                         order by created_at desc limit 20) c), '[]'::jsonb)
    else null end;
$$;

-- ---------- No dia 1: o CSV para a Contabilizei e a alíquota ----------
create or replace function public.lembrar_notas_do_mes()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hoje date := public.hoje_em_brasilia();
  v_mes text;
  v_texto text;
begin
  if extract(day from v_hoje) <> 1 then
    return;
  end if;
  v_mes := (array['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro',
                  'outubro', 'novembro', 'dezembro'])[extract(month from (v_hoje - 1))::int];
  v_texto := 'Baixe no portal da NFS-e da Prefeitura de São Paulo o arquivo das notas de ' || v_mes
    || ' (CSV, Layout V. 004) e envie à Contabilizei (Minhas Rotinas › Importar notas fiscais) até o dia 5. '
    || 'Confira também a alíquota do ISS deste mês em Notas Fiscais › Minhas Alíquotas, na Contabilizei, '
    || 'e, se mudou, atualize em Admin › Compras e notas › Nota fiscal automática.';
  perform public.aviso_ao_admin('notas-do-mes:' || to_char(v_hoje, 'YYYY-MM'), 'notas_do_mes',
    'Notas de ' || v_mes || ': envie o arquivo à Contabilizei até o dia 5', 'Notas do mês',
    public.email_p(public.html_texto(v_texto)), v_texto, 'compras');
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'guiatennis-notas-do-mes';
    perform cron.schedule('guiatennis-notas-do-mes', '7 12 1 * *', 'select public.lembrar_notas_do_mes()');
  end if;
exception when others then
  raise warning 'notas do mês: o relógio não ligou (%).', sqlerrm;
end $$;

-- ---------- Permissões ----------
revoke all on function public.link_da_nota(bigint, text) from public, anon, authenticated;
revoke all on function public.nota_configuracao_do_admin() from public, anon;
revoke all on function public.salvar_nota_configuracao(boolean, text, text, numeric, text, text) from public, anon;
revoke all on function public.pedir_nota(uuid) from public, anon;
revoke all on function public.notas_fiscais_do_admin() from public, anon;
grant execute on function public.nota_configuracao_do_admin(), public.salvar_nota_configuracao(boolean, text, text, numeric, text, text),
  public.pedir_nota(uuid), public.notas_fiscais_do_admin() to authenticated;
revoke all on function public.guardar_certificado_da_nota(text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.certificado_da_nota() from public, anon, authenticated;
revoke all on function public.registrar_teste_da_nota(text) from public, anon, authenticated;
revoke all on function public.nota_configuracao_do_servico() from public, anon, authenticated;
revoke all on function public.nota_para_emitir(uuid) from public, anon, authenticated;
revoke all on function public.registrar_nota(uuid, text, bigint, text, text) from public, anon, authenticated;
revoke all on function public.notas_para_processar() from public, anon, authenticated;
revoke all on function public.nota_para_cancelar(uuid) from public, anon, authenticated;
revoke all on function public.nota_no_estorno() from public, anon, authenticated;
revoke all on function public.lembrar_notas_do_mes() from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.guardar_certificado_da_nota(text, text, text, timestamptz), public.certificado_da_nota(),
      public.registrar_teste_da_nota(text), public.nota_configuracao_do_servico(), public.nota_para_emitir(uuid), public.registrar_nota(uuid, text, bigint, text, text),
      public.notas_para_processar(), public.nota_para_cancelar(uuid) to service_role;
  end if;
end $$;
