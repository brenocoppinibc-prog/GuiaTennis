-- Regra 314 (21/11/2026): a cobrança automática do plano, no cartão ou no Pix
-- Automático ("quero fazer as cobranças automáticas em Pix ou cartão tudo"),
-- como o Spotify e a Netflix: a academia autoriza uma vez e o Mercado Pago
-- cobra sozinho todo mês (ou todo ano), pelas Assinaturas do Mercado Pago
-- (preapproval). Cada cobrança aprovada vira uma compra paga (a mesma de
-- "Compras e notas", com a nota fiscal) e soma o prazo da assinatura
-- (confirmar_compra). Cancelar pausa a cobrança no Mercado Pago na hora (a
-- função pagamento.mjs sincroniza o que a academia quer, "desejada", com o que
-- o Mercado Pago tem, "situacao"); o Premium fica até o fim do prazo, como antes.
-- O mês grátis continua sem cartão: a renovação automática é opcional.

create table if not exists public.cobrancas_automaticas (
  id uuid primary key default gen_random_uuid(),
  academia_id uuid not null references public.academias (id) on delete cascade,
  user_id uuid,
  plano text not null check (plano in ('completo', 'premium')),
  periodo text not null check (periodo in ('mensal', 'anual')),
  forma text not null check (forma in ('cartao', 'pix')),
  valor integer not null check (valor between 20 and 5000),
  gateway_id text,
  situacao text not null default 'aguardando' check (situacao in ('aguardando', 'ativa', 'pausada', 'cancelada')),
  desejada text not null default 'ativa' check (desejada in ('ativa', 'pausada', 'cancelada')),
  bandeira text,
  final text,
  comeca_em timestamptz,
  ultima_cobranca_em timestamptz,
  nota_documento text,
  nota_nome text,
  nota_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cobrancas_automaticas_por_academia on public.cobrancas_automaticas (academia_id, created_at desc);
alter table public.cobrancas_automaticas enable row level security;
revoke all on public.cobrancas_automaticas from anon, authenticated;

-- A cobrança automática que vale agora: a mais nova que não acabou.
create or replace function public.cobranca_automatica_ligada(p_academia uuid)
returns public.cobrancas_automaticas
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.cobrancas_automaticas
  where academia_id = p_academia and situacao <> 'cancelada' and desejada <> 'cancelada'
  order by created_at desc limit 1;
$$;
revoke all on function public.cobranca_automatica_ligada(uuid) from public, anon, authenticated;

-- O que a tela de Plano mostra, agora com a renovação automática (o id só
-- para o responsável principal e o admin, que trocam o cartão).
create or replace function public.minha_assinatura(p_academia uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.assinaturas;
  a public.cobrancas_automaticas;
  v_auto jsonb;
begin
  if not (public.eh_admin() or exists (select 1 from public.academia_vinculos where user_id = auth.uid() and academia_id = p_academia)) then
    raise exception 'Entre na conta da academia.' using errcode = '42501';
  end if;
  a := public.cobranca_automatica_ligada(p_academia);
  if a.id is not null then
    v_auto := jsonb_build_object(
      'id', case when public.eh_admin() or public.sou_principal_da_academia(p_academia) then a.id end,
      'forma', a.forma, 'situacao', a.situacao, 'desejada', a.desejada, 'plano', a.plano, 'periodo', a.periodo,
      'valor', a.valor, 'bandeira', a.bandeira, 'final', a.final, 'comeca_em', a.comeca_em,
      'conferir', a.gateway_id is not null and a.situacao <> a.desejada);
  end if;
  select * into s from public.assinaturas where academia_id = p_academia;
  if not found then
    return jsonb_build_object('ativa', false, 'teste_usado', false, 'automatica', v_auto);
  end if;
  return jsonb_build_object(
    'ativa', s.encerrada_em is null,
    'plano', s.plano, 'ate', s.ate, 'depois', s.depois, 'teste', s.teste,
    'teste_usado', s.teste_usado_em is not null, 'cancelada', s.cancelada_em is not null,
    'automatica', v_auto);
end $$;

-- Ligar a renovação automática: o responsável principal escolhe o plano, o
-- período e a forma (cartão ou Pix Automático). Com o plano já pago (ou no mês
-- grátis), a primeira cobrança é no fim do prazo de agora; sem ele, na hora.
create or replace function public.criar_cobranca_automatica(p_academia uuid, p_plano text, p_periodo text, p_forma text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  n public.dados_para_nota;
  s public.assinaturas;
  v_valor integer;
  v_comeca timestamptz := now();
  v_id uuid;
begin
  if not public.sou_principal_da_academia(p_academia) then
    raise exception 'Só o responsável principal muda o plano da academia.' using errcode = '42501';
  end if;
  if coalesce(p_plano, '') not in ('completo', 'premium') or coalesce(p_periodo, '') not in ('mensal', 'anual') then
    raise exception 'Plano inválido.' using errcode = '22023';
  end if;
  if coalesce(p_forma, '') not in ('pix', 'cartao') then
    raise exception 'Escolha cartão ou Pix Automático.' using errcode = '22023';
  end if;
  if exists (select 1 from public.cobrancas_automaticas
             where academia_id = p_academia and situacao in ('ativa', 'pausada') and desejada = 'ativa') then
    raise exception 'A renovação automática já está ligada: o próximo pagamento será feito automaticamente.' using errcode = '22023';
  end if;
  if (select coalesce(plano, 'basico') from public.academias where id = p_academia) = p_plano
     and not exists (select 1 from public.assinaturas where academia_id = p_academia and plano = p_plano and encerrada_em is null) then
    raise exception 'A academia já está nesse plano.' using errcode = '22023';
  end if;
  select valor into v_valor from public.precos_dos_planos where plano = p_plano and periodo = p_periodo;
  if coalesce(v_valor, 0) < 20 then
    raise exception 'Plano sem preço.' using errcode = '22023';
  end if;
  -- Regra 304: no Pix, 5% de desconto no plano (também no Pix Automático).
  if p_forma = 'pix' then
    v_valor := public.preco_no_pix(v_valor);
  end if;
  select * into n from public.dados_para_nota where academia_id = p_academia;
  if not found then
    raise exception 'Informe os dados para a nota fiscal.' using errcode = '22023';
  end if;
  select * into s from public.assinaturas where academia_id = p_academia and plano = p_plano and encerrada_em is null;
  if found and s.ate > now() + interval '10 minutes' then
    v_comeca := s.ate;
  end if;
  -- Uma tentativa anterior que não chegou ao fim (o Pix Automático não
  -- autorizado, o cartão que não passou) sai do caminho.
  update public.cobrancas_automaticas set desejada = 'cancelada', updated_at = now()
    where academia_id = p_academia and situacao = 'aguardando' and desejada <> 'cancelada';
  insert into public.cobrancas_automaticas (academia_id, user_id, plano, periodo, forma, valor, comeca_em,
                                            nota_documento, nota_nome, nota_email)
    values (p_academia, auth.uid(), p_plano, p_periodo, p_forma, v_valor, v_comeca, n.documento, n.nome, n.email)
    returning id into v_id;
  return v_id;
end $$;
revoke all on function public.criar_cobranca_automatica(uuid, text, text, text) from public, anon;
grant execute on function public.criar_cobranca_automatica(uuid, text, text, text) to authenticated;

-- Para a função do Netlify (só ela, com a chave service_role).
create or replace function public.cobranca_automatica_para_assinar(p_cobranca uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', a.id, 'academia_id', a.academia_id, 'academia', x.name, 'plano', a.plano, 'periodo', a.periodo,
    'forma', a.forma, 'valor', a.valor, 'situacao', a.situacao, 'desejada', a.desejada, 'gateway_id', a.gateway_id,
    'comeca_em', a.comeca_em, 'nota_documento', a.nota_documento, 'nota_nome', a.nota_nome, 'nota_email', a.nota_email,
    'email', coalesce((select y.email from public.academia_acessos y where y.user_id = a.user_id and public.email_valido(y.email) limit 1),
                      (select j.email from public.jogadores j where j.user_id = a.user_id), ''))
  from public.cobrancas_automaticas a join public.academias x on x.id = a.academia_id
  where a.id = p_cobranca;
$$;

-- O que o Mercado Pago diz da assinatura (authorized, paused, cancelled ou
-- pending). Ligada de verdade, desfaz um cancelamento da assinatura e encerra
-- as outras cobranças automáticas da academia.
create or replace function public.registrar_cobranca_automatica(p_cobranca uuid, p_gateway_id text, p_status text,
                                                               p_bandeira text default null, p_final text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.cobrancas_automaticas;
  v_sit text := case p_status when 'authorized' then 'ativa' when 'paused' then 'pausada' when 'cancelled' then 'cancelada' else 'aguardando' end;
begin
  update public.cobrancas_automaticas set
      gateway_id = coalesce(nullif(p_gateway_id, ''), gateway_id), situacao = v_sit,
      bandeira = coalesce(nullif(left(p_bandeira, 20), ''), bandeira),
      final = coalesce(nullif(right(regexp_replace(coalesce(p_final, ''), '\D', '', 'g'), 4), ''), final),
      desejada = case when v_sit = 'cancelada' then 'cancelada' else desejada end, updated_at = now()
    where id = p_cobranca
    returning * into a;
  if not found then
    return 'nao_achou';
  end if;
  if v_sit = 'ativa' and a.desejada = 'ativa' then
    update public.cobrancas_automaticas set desejada = 'cancelada', updated_at = now()
      where academia_id = a.academia_id and id <> a.id and desejada <> 'cancelada';
    update public.assinaturas set cancelada_em = null, depois = case when a.plano = 'premium' then 'completo' else 'basico' end, updated_at = now()
      where academia_id = a.academia_id and plano = a.plano and encerrada_em is null and cancelada_em is not null;
  end if;
  return v_sit;
end $$;

-- O que precisa mudar no Mercado Pago (pausar, voltar ou cancelar).
create or replace function public.cobrancas_para_sincronizar(p_academia uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'gateway_id', gateway_id,
           'status', case desejada when 'ativa' then 'authorized' when 'pausada' then 'paused' else 'cancelled' end)), '[]'::jsonb)
  from public.cobrancas_automaticas
  where academia_id = p_academia and gateway_id is not null and situacao <> 'cancelada' and situacao <> desejada
    and not (situacao = 'aguardando' and desejada = 'ativa');
$$;

-- Cada cobrança do Mercado Pago, uma vez só (pelo id do pagamento): aprovada,
-- vira uma compra paga e soma o prazo; recusada, avisa o responsável. Uma
-- cobrança que a academia já não queria ("nao_quer") é devolvida pela função.
create or replace function public.pagamento_automatico(p_cobranca uuid, p_pagamento text, p_valor numeric, p_situacao text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.cobrancas_automaticas;
  v_sit text;
  v_compra uuid;
  r record;
  v_nome text;
  v_meio text;
  v_texto text;
  v_link text;
begin
  select * into a from public.cobrancas_automaticas where id = p_cobranca for update;
  if not found then
    return 'nao_achou';
  end if;
  if coalesce(p_pagamento, '') = '' then
    return 'aberta';
  end if;
  select situacao into v_sit from public.compras_de_creditos where academia_id = a.academia_id and gateway_id = p_pagamento limit 1;
  if found then
    return v_sit;
  end if;
  if p_situacao = 'approved' then
    if a.desejada <> 'ativa' then
      return 'nao_quer';
    end if;
    insert into public.compras_de_creditos (academia_id, user_id, valor, forma, tipo, plano, periodo,
                                            nota_documento, nota_nome, nota_email, gateway_id)
      values (a.academia_id, a.user_id, a.valor, a.forma, 'plano', a.plano, a.periodo,
              a.nota_documento, a.nota_nome, a.nota_email, p_pagamento)
      returning id into v_compra;
    v_sit := public.confirmar_compra(v_compra, p_pagamento, p_valor, 'approved');
    if v_sit = 'paga' then
      update public.cobrancas_automaticas set ultima_cobranca_em = now(),
          situacao = case when situacao = 'aguardando' then 'ativa' else situacao end, updated_at = now()
        where id = a.id;
    end if;
    return v_sit;
  end if;
  if p_situacao = 'rejected' then
    v_nome := coalesce((select name from public.academias where id = a.academia_id), 'academia');
    v_meio := case when a.forma = 'pix' then 'no Pix Automático' else 'no cartão' || coalesce(' final ' || a.final, '') end;
    v_link := public.site_dos_emails() || '/parceiros/plano?abrir=' || right(replace(a.academia_id::text, '-', ''), 8) || '&utm_source=Email-assinatura';
    v_texto := 'O pagamento de R$ ' || a.valor || ' da renovação do ' || public.nome_do_plano(a.plano) || ' da ' || v_nome || ' foi recusado ' || v_meio || '. '
      || case when a.forma = 'pix' then 'Confira a autorização no aplicativo do banco.' else 'O Mercado Pago tenta de novo nos próximos dias; para trocar o cartão, vá em Plano.' end
      || ' Sem pagamento, a academia passa para o ' || public.nome_do_plano(case when a.plano = 'premium' then 'completo' else 'basico' end) || ' no fim do prazo.';
    for r in select * from public.principais_da_academia(a.academia_id) loop
      perform public.por_na_fila(
        'automatica-recusada:' || p_pagamento || ':' || r.user_id, 'assinatura', r.email,
        'Pagamento recusado: renovação do ' || public.nome_do_plano(a.plano) || ' da ' || v_nome,
        public.email_montado('Pagamento recusado', public.email_p(public.html_texto(v_texto)),
          case when a.forma = 'pix' then 'Ver a assinatura' else 'Trocar o cartão' end, v_link,
          'Você recebe este e-mail porque é responsável principal da ' || public.html_texto(v_nome) || ' no GuiaTennis Parceiros.'),
        v_texto || E'\n\n' || v_link);
    end loop;
    return 'recusada';
  end if;
  return 'aberta';
end $$;

do $$
declare
  f text;
begin
  foreach f in array array['cobranca_automatica_para_assinar(uuid)', 'registrar_cobranca_automatica(uuid, text, text, text, text)',
                           'cobrancas_para_sincronizar(uuid)', 'pagamento_automatico(uuid, text, numeric, text)'] loop
    execute 'revoke all on function public.' || f || ' from public, anon, authenticated';
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute 'grant execute on function public.' || f || ' to service_role';
    end if;
  end loop;
end $$;

-- Cancelar: o Premium fica até o fim do prazo e a renovação automática pausa
-- na hora (continuar volta a ligá-la). O resto é o de antes (SQL 20261121120000).
create or replace function public.cancelar_assinatura(p_academia uuid, p_depois text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ate timestamptz;
begin
  if not public.sou_principal_da_academia(p_academia) then
    raise exception 'Só o responsável principal cancela a assinatura.' using errcode = '42501';
  end if;
  if coalesce(p_depois, '') not in ('basico', 'completo') then
    raise exception 'Escolha o Completo ou o Básico.' using errcode = '22023';
  end if;
  update public.assinaturas set depois = p_depois, cancelada_em = now(), updated_at = now()
    where academia_id = p_academia and encerrada_em is null
    returning ate into v_ate;
  if v_ate is null then
    raise exception 'A academia não tem assinatura ativa.' using errcode = '22023';
  end if;
  update public.cobrancas_automaticas
    set desejada = case when situacao = 'aguardando' then 'cancelada' else 'pausada' end, updated_at = now()
    where academia_id = p_academia and desejada = 'ativa';
  return v_ate;
end $$;

create or replace function public.continuar_assinatura(p_academia uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ate timestamptz;
begin
  if not public.sou_principal_da_academia(p_academia) then
    raise exception 'Só o responsável principal muda a assinatura.' using errcode = '42501';
  end if;
  update public.assinaturas set cancelada_em = null, depois = 'completo', updated_at = now()
    where academia_id = p_academia and encerrada_em is null
    returning ate into v_ate;
  update public.cobrancas_automaticas set desejada = 'ativa', updated_at = now()
    where academia_id = p_academia and desejada = 'pausada' and situacao in ('ativa', 'pausada');
  return v_ate;
end $$;

-- Comprar o plano à parte (o Pix deste mês) não vale com a renovação
-- automática ligada: seria cobrar duas vezes. O resto é o de antes.
create or replace function public.criar_compra_de_plano(p_academia uuid, p_plano text, p_periodo text, p_forma text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  n public.dados_para_nota;
  v_valor integer;
  v_id uuid;
begin
  if not public.sou_principal_da_academia(p_academia) then
    raise exception 'Só o responsável principal muda o plano da academia.' using errcode = '42501';
  end if;
  if coalesce(p_plano, '') not in ('completo', 'premium') or coalesce(p_periodo, '') not in ('mensal', 'anual') then
    raise exception 'Plano inválido.' using errcode = '22023';
  end if;
  if coalesce(p_forma, '') not in ('pix', 'cartao') then
    raise exception 'Escolha Pix ou cartão.' using errcode = '22023';
  end if;
  if exists (select 1 from public.cobrancas_automaticas
             where academia_id = p_academia and situacao = 'ativa' and desejada = 'ativa') then
    raise exception 'A renovação automática já está ligada: o próximo pagamento será feito automaticamente.' using errcode = '22023';
  end if;
  if (select coalesce(plano, 'basico') from public.academias where id = p_academia) = p_plano
     and not exists (select 1 from public.assinaturas where academia_id = p_academia and plano = p_plano and encerrada_em is null) then
    raise exception 'A academia já está nesse plano.' using errcode = '22023';
  end if;
  select valor into v_valor from public.precos_dos_planos where plano = p_plano and periodo = p_periodo;
  if v_valor is null then
    raise exception 'Plano sem preço.' using errcode = '22023';
  end if;
  if p_forma = 'pix' then
    v_valor := public.preco_no_pix(v_valor);
  end if;
  select * into n from public.dados_para_nota where academia_id = p_academia;
  if not found then
    raise exception 'Informe os dados para a nota fiscal.' using errcode = '22023';
  end if;
  insert into public.compras_de_creditos (academia_id, user_id, valor, forma, tipo, plano, periodo,
                                          nota_documento, nota_nome, nota_email)
    values (p_academia, auth.uid(), v_valor, p_forma, 'plano', p_plano, p_periodo, n.documento, n.nome, n.email)
    returning id into v_id;
  return v_id;
end $$;

-- Descer de plano direto encerra a assinatura e cancela a renovação automática.
create or replace function public.escolher_plano(p_academia uuid, p_plano text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes text;
begin
  if coalesce(p_plano, '') not in ('basico', 'completo', 'premium') then
    raise exception 'Plano inválido.' using errcode = '22023';
  end if;
  if not public.sou_principal_da_academia(p_academia) then
    raise exception 'Só o responsável principal muda o plano da academia.' using errcode = '42501';
  end if;
  select coalesce(plano, 'basico') into v_antes from public.academias where id = p_academia;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if p_plano = 'premium' and v_antes <> 'premium' then
    raise exception 'O Premium começa pelo mês grátis ou pelo pagamento, em Plano.' using errcode = '22023';
  end if;
  if v_antes <> p_plano then
    update public.assinaturas set encerrada_em = now(), teste = false, updated_at = now()
      where academia_id = p_academia and encerrada_em is null;
    update public.cobrancas_automaticas set desejada = 'cancelada', updated_at = now()
      where academia_id = p_academia and desejada <> 'cancelada';
    perform public.trocar_plano_da_assinatura(p_academia, p_plano);
  end if;
  delete from public.pedidos_de_plano where academia_id = p_academia;
  return p_plano;
end $$;

-- O relógio (de hora em hora). Com a renovação automática ligada, o prazo tem
-- 3 dias de folga (o Mercado Pago cobra no dia e tenta de novo se não passar),
-- e o e-mail de cinco dias antes diz quando e onde vai ser cobrado (como o
-- "seu teste grátis termina em breve" do Spotify). O resto é o de antes.
create or replace function public.rodar_assinaturas()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  r record;
  a public.cobrancas_automaticas;
  v_nome text;
  v_quando text;
  v_texto text;
  v_link text;
  v_meio text;
begin
  for s in select x.*, y.name, coalesce(y.plano, 'basico') as plano_agora
           from public.assinaturas x join public.academias y on y.id = x.academia_id
           where x.encerrada_em is null and x.ate <= now()
             and not (x.ate > now() - interval '3 days' and exists (
               select 1 from public.cobrancas_automaticas c
               where c.academia_id = x.academia_id and c.plano = x.plano and c.situacao = 'ativa' and c.desejada = 'ativa')) loop
    update public.assinaturas set encerrada_em = now(), teste = false, updated_at = now() where academia_id = s.academia_id;
    update public.cobrancas_automaticas set desejada = 'cancelada', updated_at = now()
      where academia_id = s.academia_id and desejada <> 'cancelada';
    if s.plano_agora = s.plano then
      perform public.trocar_plano_da_assinatura(s.academia_id, s.depois);
    end if;
  end loop;

  for s in select x.*, y.name from public.assinaturas x join public.academias y on y.id = x.academia_id
           where x.encerrada_em is null and x.aviso_em is null and x.ate <= now() + interval '5 days' and x.ate > now() loop
    update public.assinaturas set aviso_em = now() where academia_id = s.academia_id;
    a := public.cobranca_automatica_ligada(s.academia_id);
    if a.id is not null and not (a.situacao = 'ativa' and a.desejada = 'ativa' and a.plano = s.plano) then
      a := null;
    end if;
    v_nome := coalesce(s.name, 'academia');
    v_quando := to_char(s.ate at time zone 'America/Sao_Paulo', 'DD/MM');
    v_link := public.site_dos_emails() || '/parceiros/plano?abrir=' || right(replace(s.academia_id::text, '-', ''), 8) || '&utm_source=Email-assinatura';
    v_meio := case when a.id is null then '' when a.forma = 'pix' then 'no Pix Automático' else 'no cartão' || coalesce(' ' || public.nome_da_bandeira(a.bandeira), '') || coalesce(' final ' || a.final, '') end;
    v_texto := case
      when s.cancelada_em is not null then
        'O Premium da ' || v_nome || ' vai até ' || v_quando || '. Depois, a academia passa para o ' || public.nome_do_plano(s.depois) || ', como vocês escolheram. Mudou de ideia? Continue no Premium em Plano.'
      when a.id is not null and s.teste then
        'O mês grátis do Premium da ' || v_nome || ' acaba em ' || v_quando || '. Nesse dia, a renovação automática cobra R$ ' || a.valor || ' ' || v_meio || ', e o Premium continua ativo sem que vocês precisem fazer nada. Para não ser cobrado, cancele em Plano até lá.'
      when a.id is not null then
        'O ' || public.nome_do_plano(s.plano) || ' da ' || v_nome || ' será renovado automaticamente em ' || v_quando || ': R$ ' || a.valor || ' ' || v_meio || '. Não precisa fazer nada. Para mudar ou cancelar, vá em Plano.'
      when s.teste then
        'O mês grátis do Premium da ' || v_nome || ' acaba em ' || v_quando || '. Para continuar com o selo, o Patrocinado, as promoções e os números, pague o próximo mês em Plano. Sem pagamento, a academia passa para o ' || public.nome_do_plano(s.depois) || ' e nada é cobrado.'
      else
        'O ' || public.nome_do_plano(s.plano) || ' da ' || v_nome || ' vale até ' || v_quando || '. Para continuar, pague o próximo mês em Plano. Sem pagamento, a academia passa para o ' || public.nome_do_plano(s.depois) || ' e nada é cobrado.'
      end;
    for r in select * from public.principais_da_academia(s.academia_id) loop
      perform public.por_na_fila(
        'assinatura-aviso:' || s.academia_id || ':' || to_char(s.ate, 'YYYYMMDDHH24MI') || ':' || r.user_id, 'assinatura', r.email,
        case when s.teste and s.cancelada_em is null then 'O mês grátis do Premium acaba em ' || v_quando
             when a.id is not null and s.cancelada_em is null then 'O ' || public.nome_do_plano(s.plano) || ' da ' || v_nome || ' renova em ' || v_quando
             else 'O ' || public.nome_do_plano(s.plano) || ' da ' || v_nome || ' vai até ' || v_quando end,
        public.email_montado(case when s.teste and s.cancelada_em is null then 'O mês grátis acaba em 5 dias'
                                  when a.id is not null and s.cancelada_em is null then 'A assinatura renova em 5 dias'
                                  else 'A assinatura vence em 5 dias' end,
          public.email_p(public.html_texto(v_texto)),
          case when s.cancelada_em is not null or a.id is not null then 'Ver o plano' else 'Continuar no Premium' end, v_link,
          'Você recebe este e-mail porque é responsável principal da ' || public.html_texto(v_nome) || ' no GuiaTennis Parceiros.'),
        v_texto || E'\n\n' || v_link);
    end loop;
  end loop;
end $$;

-- O nome da bandeira como a academia conhece (o Mercado Pago manda "master").
create or replace function public.nome_da_bandeira(p_bandeira text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case lower(coalesce(p_bandeira, ''))
    when 'visa' then 'Visa' when 'master' then 'Mastercard' when 'amex' then 'American Express' when 'elo' then 'Elo'
    when 'hipercard' then 'Hipercard' when 'diners' then 'Diners' when '' then null else initcap(p_bandeira) end;
$$;
