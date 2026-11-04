-- ============================================================
-- O que cada pessoa da academia pode fazer, mais de um responsável
-- principal e o e-mail de cada compra (pedido do Breno em 29/10/2026,
-- regra 180: "quero que implemente a aba pagamentos e email, quero que o
-- principal consiga definir alguém como principal também e funções que
-- outros acessos pode fazer")
-- ============================================================
-- Como as permissões dos usuários da extranet da Booking (Finanças,
-- Avaliações, Promoções…) e da equipe da Shopify: o responsável principal
-- pode tudo; cada pessoa da equipe faz só o que ele liberar.
--   academia_vinculos.funcoes    ficha, avaliacoes, promocoes e pagamentos
--                                (quem já era da equipe fica com as três
--                                primeiras; Pagamentos, o principal libera).
--   posso(academia, funcao)      a conta logada pode fazer aquilo ali?
--   exigir_funcao                recusa com "fale com o responsável principal".
--   mudar_funcoes_da_pessoa      o principal escolhe as funções de alguém da equipe.
--   tornar_principal             o principal passa alguém da equipe a
--                                responsável principal (pode haver vários).
--   deixar_de_ser_principal      o principal volta para a equipe, se houver
--                                outro; tirar outro principal continua com o
--                                GuiaTennis.
--   A regra da ficha (editar), as das respostas, a promoção, o leilão, o
--   WhatsApp da ficha, a análise da avaliação e a compra de créditos
--   passam a conferir a função. As compras (Pagamentos) mostram quem comprou.
--   E-mail aos responsáveis principais a cada compra paga (quem comprou, o
--   quê e o valor) e quando alguém vira responsável principal.
-- Pode rodar de novo sem estragar nada.

alter table public.academia_vinculos
  add column if not exists funcoes text[] not null default array['ficha', 'avaliacoes', 'promocoes']::text[];
alter table public.academia_vinculos drop constraint if exists academia_vinculos_funcoes;
alter table public.academia_vinculos add constraint academia_vinculos_funcoes
  check (funcoes <@ array['ficha', 'avaliacoes', 'promocoes', 'pagamentos']::text[]);

-- As funções ----------------------------------------------------------------
create or replace function public.nome_da_funcao(p_funcao text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_funcao when 'ficha' then 'Editar a ficha' when 'avaliacoes' then 'Responder avaliações'
    when 'promocoes' then 'Promoções e leilão' when 'pagamentos' then 'Pagamentos' else p_funcao end;
$$;

create or replace function public.posso(p_academia uuid, p_funcao text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.academia_vinculos v
                 where v.user_id = auth.uid() and v.academia_id = p_academia
                   and (v.papel = 'principal' or p_funcao = any (v.funcoes)));
$$;

-- Quem administra a academia mas não tem a função: recusa dizendo o que
-- falta. Quem não administra cai na conferência de sempre de cada função.
create or replace function public.exigir_funcao(p_academia uuid, p_funcao text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.academia_vinculos v
             where v.user_id = auth.uid() and v.academia_id = p_academia)
     and not public.posso(p_academia, p_funcao) then
    raise exception 'Na sua conta, "%" não está liberado. Fale com o responsável principal da academia.',
      public.nome_da_funcao(p_funcao) using errcode = '42501';
  end if;
end $$;

create or replace function public.posso_responder(p_avaliacao uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.avaliacoes a
                 where a.id = p_avaliacao and public.posso(a.academia_id, 'avaliacoes'));
$$;

-- A ficha e as respostas: só quem tem a função --------------------------------
drop policy if exists "Academia edita a propria ficha" on public.academias;
create policy "Academia edita a propria ficha" on public.academias
  for update
  using (public.posso(id, 'ficha'))
  with check (public.posso(id, 'ficha'));

drop policy if exists "Academia responde" on public.respostas;
create policy "Academia responde" on public.respostas
  for insert
  with check (public.posso_responder(avaliacao_id));

drop policy if exists "Academia edita a resposta" on public.respostas;
create policy "Academia edita a resposta" on public.respostas
  for update
  using (public.posso_responder(avaliacao_id))
  with check (public.posso_responder(avaliacao_id));

drop policy if exists "Apagar resposta" on public.respostas;
create policy "Apagar resposta" on public.respostas
  for delete
  using (public.posso_responder(avaliacao_id) or public.eh_admin());

-- As pessoas e as academias da conta, com as funções ------------------------
drop function if exists public.pessoas_da_minha_academia();
create or replace function public.pessoas_da_minha_academia()
returns table (user_id uuid, nome text, email text, papel text,
  dados_completos_em timestamptz, ultimo_acesso timestamptz, sou_eu boolean, funcoes text[])
language sql
stable
security definer
set search_path = ''
as $$
  select x.user_id, x.nome_responsavel, coalesce(x.email, x.usuario), v.papel,
    x.dados_completos_em, u.last_sign_in_at, x.user_id = auth.uid(), v.funcoes
  from public.academia_vinculos v
  join public.academia_acessos x on x.user_id = v.user_id
  left join auth.users u on u.id = x.user_id
  where v.academia_id = (select e.academia_id from public.academia_acessos e
                         join public.academia_vinculos m
                           on m.user_id = e.user_id and m.academia_id = e.academia_id
                         where e.user_id = auth.uid())
  order by (v.papel = 'principal') desc, v.created_at;
$$;

drop function if exists public.academias_da_minha_conta();
create or replace function public.academias_da_minha_conta()
returns table (academia_id uuid, nome text, papel text, status text,
  pausada boolean, plano text, bairro text, cidade text, aberta boolean,
  pausada_ate timestamptz, pausada_pela_academia boolean, funcoes text[])
language sql
stable
security definer
set search_path = ''
as $$
  select v.academia_id, a.name, v.papel, a.status,
    coalesce(a.pausada, false) and (a.pausada_ate is null or a.pausada_ate > now()),
    coalesce(a.plano, 'basico'), a.bairro, a.cidade,
    v.academia_id = x.academia_id,
    a.pausada_ate, coalesce(a.pausada_pela_academia, false), v.funcoes
  from public.academia_vinculos v
  join public.academias a on a.id = v.academia_id
  join public.academia_acessos x on x.user_id = v.user_id
  where v.user_id = auth.uid()
  order by a.name;
$$;

-- O principal da academia aberta: quem chama e a pessoa da equipe ------------
create or replace function public.academia_do_principal()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_academia uuid;
  v_papel text;
begin
  select x.academia_id, m.papel into v_academia, v_papel
    from public.academia_acessos x
    join public.academia_vinculos m on m.user_id = x.user_id and m.academia_id = x.academia_id
    where x.user_id = auth.uid();
  if v_academia is null or v_papel <> 'principal' then
    raise exception 'Só o responsável principal muda o que cada pessoa pode fazer.' using errcode = '42501';
  end if;
  return v_academia;
end $$;

create or replace function public.mudar_funcoes_da_pessoa(p_user uuid, p_funcoes text[])
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia uuid := public.academia_do_principal();
  v_ele public.academia_vinculos;
  v_funcoes text[];
begin
  select * into v_ele from public.academia_vinculos where user_id = p_user and academia_id = v_academia;
  if not found then
    raise exception 'Pessoa não encontrada.' using errcode = '22023';
  end if;
  if v_ele.papel = 'principal' then
    raise exception 'O responsável principal pode tudo: não tem funções para escolher.' using errcode = '22023';
  end if;
  -- Na ordem de sempre, sem repetir e só as que existem.
  select coalesce(array_agg(f order by o), '{}') into v_funcoes
    from unnest(array['ficha', 'avaliacoes', 'promocoes', 'pagamentos']) with ordinality as t(f, o)
    where f = any (coalesce(p_funcoes, '{}'));
  update public.academia_vinculos set funcoes = v_funcoes where user_id = p_user and academia_id = v_academia;
  return v_funcoes;
end $$;

create or replace function public.tornar_principal(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia uuid := public.academia_do_principal();
  v_ele public.academia_vinculos;
begin
  select * into v_ele from public.academia_vinculos where user_id = p_user and academia_id = v_academia;
  if not found then
    raise exception 'Pessoa não encontrada.' using errcode = '22023';
  end if;
  if v_ele.papel = 'principal' then
    raise exception 'Essa pessoa já é responsável principal.' using errcode = '22023';
  end if;
  update public.academia_vinculos set papel = 'principal' where user_id = p_user and academia_id = v_academia;
  update public.academia_acessos set papel = 'principal', updated_at = now()
    where user_id = p_user and academia_id = v_academia;
  perform public.avisar_principal_novo(v_academia, p_user);
end $$;

-- Voltar para a equipe: fica com todas as funções, e a academia continua
-- com pelo menos um responsável principal.
create or replace function public.deixar_de_ser_principal()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia uuid := public.academia_do_principal();
begin
  if not exists (select 1 from public.academia_vinculos
                 where academia_id = v_academia and papel = 'principal' and user_id <> auth.uid()) then
    raise exception 'A academia precisa de um responsável principal: torne outra pessoa principal antes.' using errcode = '22023';
  end if;
  update public.academia_vinculos
    set papel = 'equipe', funcoes = array['ficha', 'avaliacoes', 'promocoes', 'pagamentos']
    where user_id = auth.uid() and academia_id = v_academia;
  update public.academia_acessos set papel = 'equipe', updated_at = now()
    where user_id = auth.uid() and academia_id = v_academia;
end $$;

-- Os e-mails --------------------------------------------------------------------
-- Quem recebe o que é do responsável principal: a conta com o e-mail
-- confirmado, mesmo com os avisos desligados (é a nota da compra, como os
-- recibos da Shopify e do Google).
create or replace function public.principais_da_academia(p_academia uuid)
returns table (user_id uuid, email text, nome text)
language sql
stable
security definer
set search_path = ''
as $$
  select x.user_id, x.email, x.nome_responsavel
  from public.academia_vinculos m
  join public.academia_acessos x on x.user_id = m.user_id
  where m.academia_id = p_academia and m.papel = 'principal'
    and x.email_confirmado_em is not null and public.email_valido(x.email);
$$;

create or replace function public.avisar_principal_novo(p_academia uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia text;
  v_novo text;
  v_quem text;
  v_link text := public.site_dos_emails() || '/parceiros/pessoas?abrir=' || right(replace(p_academia::text, '-', ''), 8)
    || '&utm_source=Email-principal';
  v_texto text;
  r record;
begin
  select name into v_academia from public.academias where id = p_academia;
  v_novo := coalesce((select coalesce(nullif(btrim(nome_responsavel), ''), email) from public.academia_acessos where user_id = p_user), 'Uma pessoa');
  v_quem := coalesce((select coalesce(nullif(btrim(nome_responsavel), ''), email) from public.academia_acessos where user_id = auth.uid()), 'O responsável principal');
  for r in select * from public.principais_da_academia(p_academia) loop
    v_texto := case when r.user_id = p_user
      then v_quem || ' tornou você responsável principal da ' || v_academia || ' no GuiaTennis Parceiros. Agora você pode mudar o plano, adicionar e remover pessoas e escolher o que cada uma pode fazer.'
      else v_quem || ' tornou ' || v_novo || ' responsável principal da ' || v_academia || ' no GuiaTennis Parceiros. Agora essa pessoa pode mudar o plano, adicionar e remover pessoas e escolher o que cada uma pode fazer.' end;
    perform public.por_na_fila(
      'principal-novo:' || p_academia || ':' || p_user || ':' || r.user_id || ':' || public.hoje_em_brasilia(), 'principal_novo', r.email,
      case when r.user_id = p_user then 'Você é responsável principal da ' || v_academia
           else v_novo || ' é responsável principal da ' || v_academia end,
      public.email_montado('Responsável principal', public.email_p(public.html_texto(v_texto))
          || public.email_p('Não conhece essa pessoa? Fale com o GuiaTennis pelo chat de ajuda: só o GuiaTennis tira um responsável principal.'),
        'Ver os acessos', v_link,
        'Você recebe este e-mail porque é responsável principal da ' || public.html_texto(v_academia) || ' no GuiaTennis Parceiros.'),
      v_texto || E'\n\nNão conhece essa pessoa? Fale com o GuiaTennis pelo chat de ajuda: só o GuiaTennis tira um responsável principal.\n\n' || v_link);
  end loop;
exception when others then
  raise warning 'aviso de principal novo: %', sqlerrm;
end $$;

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
exception when others then
  raise warning 'aviso de compra paga: %', sqlerrm;
end $$;

-- As compras da academia (Pagamentos), com quem comprou --------------------------
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
                     'quem', (select coalesce(nullif(btrim(x.nome_responsavel), ''), x.email)
                              from public.academia_acessos x where x.user_id = c.user_id)) order by c.created_at desc)
                   from (select * from public.compras_de_creditos where academia_id = p_academia
                         order by created_at desc limit 20) c), '[]'::jsonb)
    else null end;
$$;

-- As funções que passam a conferir a função -------------------------------------
create or replace function public.salvar_promocao(
  p_academia uuid, p_id uuid, p_titulo text, p_detalhes text, p_semanas integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  p public.promocoes;
  v_id uuid := p_id;
  v_hoje date := public.hoje_em_brasilia();
  v_titulo text := btrim(coalesce(p_titulo, ''));
  v_detalhes text := nullif(btrim(coalesce(p_detalhes, '')), '');
  v_semanas integer := coalesce(p_semanas, 0);
  v_preco integer;
  v_ate date;
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  perform public.exigir_funcao(p_academia, 'promocoes');
  select * into a from public.academias where id = p_academia;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if not public.promocoes_liberadas(a) then
    raise exception 'As promoções na ficha são dos planos Completo e Premium.' using errcode = '42501';
  end if;
  if a.status <> 'published' then
    raise exception 'A academia ainda está em análise: a promoção pode ser criada quando ela estiver no ar.' using errcode = '22023';
  end if;
  if char_length(v_titulo) < 3 or char_length(v_titulo) > 30 then
    raise exception 'Escreva a promoção em até 30 letras (por exemplo, "Primeira aula grátis").' using errcode = '22023';
  end if;
  if char_length(coalesce(v_detalhes, '')) > 150 then
    raise exception 'Os detalhes cabem em até 150 letras.' using errcode = '22023';
  end if;
  if v_semanas < 0 or v_semanas > 12 then
    raise exception 'Escolha de 1 a 12 semanas.' using errcode = '22023';
  end if;
  if v_id is not null then
    select * into p from public.promocoes where id = v_id and academia_id = p_academia;
    if not found then
      raise exception 'Promoção não encontrada.' using errcode = '22023';
    end if;
  end if;
  -- Nova ou reaberta: escolhe as semanas. Valendo: o texto muda de graça e
  -- dá para somar semanas.
  if (v_id is null or p.valida_ate < v_hoje) and v_semanas < 1 then
    raise exception 'Escolha de 1 a 12 semanas.' using errcode = '22023';
  end if;
  if exists (select 1 from public.promocoes
             where academia_id = p_academia and valida_ate >= v_hoje
               and (v_id is null or id <> v_id))
     and (v_id is null or p.valida_ate < v_hoje) then
    raise exception 'A academia já tem uma promoção valendo. Altere ou encerre a de agora para publicar outra.' using errcode = '22023';
  end if;
  v_ate := case when v_semanas = 0 then p.valida_ate
                when v_id is null or p.valida_ate < v_hoje then v_hoje + 7 * v_semanas - 1
                else p.valida_ate + 7 * v_semanas end;
  if v_semanas > 0 and v_ate > v_hoje + 83 then
    raise exception 'A promoção vale no máximo 12 semanas à frente.' using errcode = '22023';
  end if;
  v_preco := public.preco_da_promocao(a) * v_semanas;
  if v_preco > coalesce(a.envios_de_aviso, 0) then
    raise exception 'A academia tem R$ % de créditos. Compre créditos ou escolha menos semanas.', coalesce(a.envios_de_aviso, 0) using errcode = '22023';
  end if;
  if v_preco > 0 then
    perform public.mexer_creditos(p_academia, -v_preco);
  end if;
  if v_id is null then
    insert into public.promocoes (academia_id, titulo, detalhes, valida_ate, criada_por, semanas, pago)
      values (p_academia, v_titulo, v_detalhes, v_ate, auth.uid(), v_semanas, v_preco)
      returning id into v_id;
  elsif p.valida_ate < v_hoje then
    -- Reabrir conta do zero: as semanas e o pago de antes já acabaram.
    update public.promocoes
      set titulo = v_titulo, detalhes = v_detalhes, valida_ate = v_ate, semanas = v_semanas, pago = v_preco,
          created_at = now(), updated_at = now()
      where id = v_id;
  else
    update public.promocoes
      set titulo = v_titulo, detalhes = v_detalhes, valida_ate = v_ate,
          semanas = semanas + v_semanas, pago = pago + v_preco, updated_at = now()
      where id = v_id;
  end if;
  return jsonb_build_object('id', v_id, 'valida_ate', v_ate, 'pago', v_preco,
    'creditos', (select envios_de_aviso from public.academias where id = p_academia));
end $$;

create or replace function public.apagar_promocao(p_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.promocoes;
  v_hoje date := public.hoje_em_brasilia();
  v_volta integer := 0;
begin
  select * into p from public.promocoes where id = p_id;
  if not found then
    return 0;
  end if;
  if not public.eh_admin() and not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p.academia_id) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  if not public.eh_admin() then
    perform public.exigir_funcao(p.academia_id, 'promocoes');
  end if;
  if p.valida_ate >= v_hoje and p.semanas > 0 and p.pago > 0 then
    v_volta := least(p.pago, ((p.valida_ate - v_hoje) / 7) * (p.pago / p.semanas));
    if v_volta > 0 then
      perform public.mexer_creditos(p.academia_id, v_volta);
    end if;
  end if;
  delete from public.promocoes where id = p_id;
  return v_volta;
end $$;

create or replace function public.dar_lance(p_academia uuid, p_titulo text, p_mensagem text, p_valor integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  cfg public.leilao_config;
  v_regiao text;
  v_fecha timestamptz := public.proximo_fechamento();
  v_titulo text := btrim(coalesce(p_titulo, ''));
  v_mensagem text := btrim(coalesce(p_mensagem, ''));
  l public.lances;
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  perform public.exigir_funcao(p_academia, 'promocoes');
  select * into a from public.academias where id = p_academia;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if coalesce(a.plano, 'basico') <> 'premium' then
    raise exception 'O leilão de promoções é do plano Premium.' using errcode = '42501';
  end if;
  if not public.academia_no_ar(a) then
    raise exception 'A academia precisa estar no ar para entrar no leilão.' using errcode = '22023';
  end if;
  v_regiao := public.regiao_da_academia(a);
  if v_regiao is null then
    raise exception 'Para entrar no leilão, a ficha precisa do bairro e da cidade.' using errcode = '22023';
  end if;
  if char_length(v_titulo) < 3 or char_length(v_titulo) > 30 then
    raise exception 'Escreva a promoção em até 30 letras (por exemplo, "Primeira aula grátis").' using errcode = '22023';
  end if;
  if char_length(v_mensagem) < 10 or char_length(v_mensagem) > 300 then
    raise exception 'A mensagem precisa ter de 10 a 300 letras.' using errcode = '22023';
  end if;
  select * into cfg from public.leilao_config where id = 1;
  if p_valor is null or p_valor < cfg.lance_minimo then
    raise exception 'O lance mínimo é de R$ %.', cfg.lance_minimo using errcode = '22023';
  end if;
  if p_valor > 100000 then
    raise exception 'O lance passa do limite.' using errcode = '22023';
  end if;
  if p_valor > coalesce(a.envios_de_aviso, 0) then
    raise exception 'A academia tem R$ % de créditos. Compre créditos ou dê um lance menor.', coalesce(a.envios_de_aviso, 0) using errcode = '22023';
  end if;
  insert into public.lances (academia_id, regiao, regiao_nome, fecha_em, titulo, mensagem, valor, criado_por)
    values (p_academia, v_regiao, public.nome_da_regiao(a), v_fecha, v_titulo, v_mensagem, p_valor, auth.uid())
    on conflict (academia_id, fecha_em) do update
      set titulo = excluded.titulo, mensagem = excluded.mensagem, valor = excluded.valor,
          regiao = excluded.regiao, regiao_nome = excluded.regiao_nome, updated_at = now()
      where public.lances.situacao = 'aberto'
    returning * into l;
  if l.id is null then
    raise exception 'O leilão desta semana já fechou.' using errcode = '22023';
  end if;
  return public.lance_em_json(l);
end $$;

create or replace function public.cancelar_lance(p_academia uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  perform public.exigir_funcao(p_academia, 'promocoes');
  delete from public.lances
    where academia_id = p_academia and fecha_em = public.proximo_fechamento() and situacao = 'aberto';
  return found;
end $$;

create or replace function public.pedir_analise_da_avaliacao(p_avaliacao uuid, p_motivo text, p_detalhes text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.avaliacoes;
  a public.academias;
  v_detalhes text := nullif(btrim(coalesce(p_detalhes, '')), '');
begin
  select * into v from public.avaliacoes where id = p_avaliacao;
  if not found then
    raise exception 'Avaliação não encontrada.' using errcode = '22023';
  end if;
  if not public.administro_a_academia(v.academia_id) then
    raise exception 'Só quem administra a academia pede a análise.' using errcode = '42501';
  end if;
  perform public.exigir_funcao(v.academia_id, 'avaliacoes');
  if coalesce(p_motivo, '') not in ('falsa', 'ofensiva', 'propaganda', 'conflito', 'pessoal') then
    raise exception 'Escolha o motivo.' using errcode = '22023';
  end if;
  if char_length(coalesce(v_detalhes, '')) > 500 then
    raise exception 'Os detalhes cabem em até 500 letras.' using errcode = '22023';
  end if;
  insert into public.denuncias_de_avaliacao (avaliacao_id, user_id, motivo, da_academia, detalhes)
  values (p_avaliacao, auth.uid(), p_motivo, true, v_detalhes)
  on conflict (avaliacao_id, user_id) do update
    set motivo = excluded.motivo, da_academia = true, detalhes = excluded.detalhes,
        criado_em = now(), resolvido_em = null, resolucao = null;
  select * into a from public.academias where id = v.academia_id;
  perform public.aviso_ao_admin('analise:' || p_avaliacao || ':' || public.hoje_em_brasilia(),
    'analise_pedida', 'A academia pediu análise de uma avaliação: ' || coalesce(a.name, 'academia'), 'Análise de avaliação pedida',
    public.email_p('A <strong>' || public.html_texto(coalesce(a.name, 'academia')) || '</strong> pediu a análise de uma avaliação ('
      || v.stars || ' de 5, de ' || public.html_texto(coalesce(v.nome_autor, 'um jogador')) || '): '
      || public.html_texto(public.nome_da_denuncia(p_motivo)) || '.')
    || coalesce(public.email_p('Detalhes: ' || public.html_texto(v_detalhes) || '.'), '')
    || public.email_p('Confira em <strong>Pendências</strong> › "Avaliações denunciadas": manter ou remover.'),
    'A ' || coalesce(a.name, 'academia') || ' pediu a análise de uma avaliação (' || v.stars || ' de 5): '
      || public.nome_da_denuncia(p_motivo) || '.' || coalesce(' Detalhes: ' || v_detalhes || '.', ''));
  return 'ok';
end $$;

create or replace function public.pedir_codigo_do_whatsapp(p_academia uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.administro_a_academia(p_academia) then
    raise exception 'Só quem administra a academia pede o código.' using errcode = '42501';
  end if;
  perform public.exigir_funcao(p_academia, 'ficha');
  if not exists (select 1 from public.academias where id = p_academia and whatsapp_a_confirmar is not null) then
    return 'sem_numero';
  end if;
  if not public.whatsapp_ligado() then
    return 'desligado';
  end if;
  if exists (select 1 from public.whatsapp_a_enviar
             where academia_id = p_academia and tipo = 'whatsapp_da_ficha' and origem <> 'admin'
               and criado_em > now() - interval '1 hour') then
    return 'espere';
  end if;
  if (select count(*) from public.whatsapp_a_enviar
      where academia_id = p_academia and tipo = 'whatsapp_da_ficha' and origem <> 'admin'
        and criado_em > now() - interval '3 days') >= 3 then
    return 'limite';
  end if;
  return public.codigo_do_whatsapp_da_ficha(p_academia, 'conta');
end $$;

create or replace function public.confirmar_whatsapp_da_ficha(p_academia uuid, p_codigo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  k public.codigos_do_whatsapp;
  v_codigo text := regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g');
  v_troca boolean;
begin
  if not public.administro_a_academia(p_academia) then
    raise exception 'Só quem administra a academia confirma o WhatsApp.' using errcode = '42501';
  end if;
  perform public.exigir_funcao(p_academia, 'ficha');
  select * into a from public.academias where id = p_academia;
  if a.whatsapp_a_confirmar is null then
    return 'sem_numero';
  end if;
  if a.whatsapp_codigo_ok_em is not null then
    return 'revisao';
  end if;
  select * into k from public.codigos_do_whatsapp where academia_id = p_academia;
  if not found or not public.mesmo_whatsapp(k.numero, a.whatsapp_a_confirmar) then
    return 'sem_codigo';
  end if;
  if k.criado_em < now() - interval '72 hours' then
    return 'venceu';
  end if;
  if k.tentativas >= 5 then
    return 'tentativas';
  end if;
  if length(v_codigo) <> 6 or extensions.crypt(v_codigo, k.codigo_hash) <> k.codigo_hash then
    update public.codigos_do_whatsapp set tentativas = tentativas + 1 where academia_id = p_academia;
    return 'errado';
  end if;
  perform set_config('guiatennis.mudanca_do_guia', p_academia::text, true);
  update public.academias set whatsapp_codigo_ok_em = now() where id = p_academia;
  perform set_config('guiatennis.mudanca_do_guia', '', true);
  delete from public.codigos_do_whatsapp where academia_id = p_academia;
  v_troca := a.whatsapp_antes is not null;
  perform public.aviso_ao_admin('whatsapp-aprovar:' || p_academia || ':' || coalesce(public.numero_do_whatsapp(a.whatsapp_a_confirmar), ''),
    'whatsapp_para_aprovar',
    case when v_troca then 'Troca de WhatsApp para aprovar: ' else 'WhatsApp para aprovar: ' end || a.name,
    case when v_troca then 'Troca de WhatsApp para aprovar' else 'WhatsApp para aprovar' end,
    public.email_p('Alguém da <strong>' || public.html_texto(a.name) || '</strong> digitou o código mandado ao WhatsApp <strong>'
      || public.html_texto(a.whatsapp_a_confirmar) || '</strong>, que vai '
      || case when v_troca then 'substituir o ' || public.html_texto(a.whatsapp_antes) || ' na ficha.'
              else 'entrar na ficha (hoje ela está sem WhatsApp).' end)
    || public.email_p('O código mostra que a pessoa tem o número, não que ele é da academia. Confira (Google, Instagram, site, a Receita em <strong>Conferir</strong>) e responda em <strong>Pendências</strong>: aprovar ou recusar. Até lá, '
      || case when v_troca then 'a ficha continua com o número de antes.' else 'a ficha fica sem o botão do WhatsApp.' end),
    'Alguém da ' || a.name || ' digitou o código mandado ao WhatsApp ' || a.whatsapp_a_confirmar || ', que vai '
      || case when v_troca then 'substituir o ' || a.whatsapp_antes || ' na ficha.' else 'entrar na ficha (hoje ela está sem WhatsApp).' end
      || E'\n\nConfira e responda em Pendências: aprovar ou recusar.');
  return 'revisao';
end $$;

create or replace function public.desistir_do_whatsapp_novo(p_academia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.administro_a_academia(p_academia) then
    raise exception 'Só quem administra a academia muda o WhatsApp.' using errcode = '42501';
  end if;
  perform public.exigir_funcao(p_academia, 'ficha');
  perform set_config('guiatennis.mudanca_do_guia', p_academia::text, true);
  update public.academias
    set whatsapp_a_confirmar = null, whatsapp_antes = null, whatsapp_pedido_em = null,
        whatsapp_pedido_por = null, whatsapp_codigo_ok_em = null
    where id = p_academia;
  perform set_config('guiatennis.mudanca_do_guia', '', true);
  delete from public.codigos_do_whatsapp where academia_id = p_academia;
end $$;

create or replace function public.criar_compra_de_creditos(p_academia uuid, p_valor integer, p_forma text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  v_id uuid;
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  perform public.exigir_funcao(p_academia, 'pagamentos');
  select * into a from public.academias where id = p_academia;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if coalesce(a.plano, 'basico') not in ('completo', 'premium') then
    raise exception 'Os créditos são do leilão do Completo e do Premium.' using errcode = '42501';
  end if;
  if p_valor is null or p_valor < 20 or p_valor > 5000 then
    raise exception 'Escolha um valor de R$ 20 a R$ 5.000.' using errcode = '22023';
  end if;
  if coalesce(p_forma, '') not in ('pix', 'cartao') then
    raise exception 'Escolha Pix ou cartão.' using errcode = '22023';
  end if;
  insert into public.compras_de_creditos (academia_id, user_id, valor, forma)
    values (p_academia, auth.uid(), p_valor, p_forma)
    returning id into v_id;
  return v_id;
end $$;

create or replace function public.simular_pagamento(p_compra uuid, p_resultado text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.compras_de_creditos;
begin
  if not coalesce((select ligado from public.pagamento_de_teste), false) then
    raise exception 'O pagamento de teste só funciona no banco de teste.' using errcode = '42501';
  end if;
  if coalesce(p_resultado, '') not in ('aprovado', 'recusado') then
    raise exception 'Resultado inválido.' using errcode = '22023';
  end if;
  select * into c from public.compras_de_creditos where id = p_compra;
  if not found then
    raise exception 'Compra não encontrada.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = c.academia_id
                   and (c.tipo = 'creditos' or papel = 'principal')) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  if c.tipo = 'creditos' then
    perform public.exigir_funcao(c.academia_id, 'pagamentos');
  end if;
  update public.compras_de_creditos set de_teste = true, gateway = 'teste', updated_at = now()
    where id = p_compra and situacao = 'aberta';
  return public.confirmar_compra(p_compra, 'teste-' || left(p_compra::text, 8), c.valor,
    case when p_resultado = 'aprovado' then 'approved' else 'rejected' end);
end $$;

create or replace function public.confirmar_compra(p_compra uuid, p_gateway_id text, p_valor_pago numeric, p_situacao text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.compras_de_creditos;
begin
  select * into c from public.compras_de_creditos where id = p_compra for update;
  if not found then
    return 'nao_achou';
  end if;
  if c.situacao <> 'aberta' then
    return c.situacao;
  end if;
  if p_situacao = 'approved' and coalesce(p_valor_pago, 0) >= c.valor then
    update public.compras_de_creditos
      set situacao = 'paga', paga_em = now(), valor_pago = p_valor_pago,
          gateway_id = coalesce(p_gateway_id, gateway_id), updated_at = now()
      where id = p_compra;
    if c.tipo = 'plano' then
      perform set_config('guiatennis.plano_da_academia', c.academia_id::text, true);
      update public.academias set plano = c.plano where id = c.academia_id and coalesce(plano, 'basico') <> c.plano;
      perform set_config('guiatennis.plano_da_academia', '', true);
      delete from public.pedidos_de_plano where academia_id = c.academia_id;
    else
      perform public.mexer_creditos(c.academia_id, c.valor);
    end if;
    perform public.avisar_compra_paga(p_compra);
    return 'paga';
  end if;
  if p_situacao in ('rejected', 'cancelled', 'refunded', 'charged_back') then
    update public.compras_de_creditos set situacao = 'recusada', gateway_id = coalesce(p_gateway_id, gateway_id), updated_at = now()
      where id = p_compra;
    return 'recusada';
  end if;
  return 'aberta';
end $$;

-- Permissões --------------------------------------------------------------------
revoke all on function public.nome_da_funcao(text) from public;
grant execute on function public.nome_da_funcao(text) to anon, authenticated;
revoke all on function public.posso(uuid, text) from public;
grant execute on function public.posso(uuid, text) to anon, authenticated;
revoke all on function public.posso_responder(uuid) from public;
grant execute on function public.posso_responder(uuid) to anon, authenticated;
revoke all on function public.exigir_funcao(uuid, text) from public, anon, authenticated;
revoke all on function public.academia_do_principal() from public, anon, authenticated;
revoke all on function public.principais_da_academia(uuid) from public, anon, authenticated;
revoke all on function public.avisar_principal_novo(uuid, uuid) from public, anon, authenticated;
revoke all on function public.avisar_compra_paga(uuid) from public, anon, authenticated;
revoke all on function public.pessoas_da_minha_academia() from public, anon;
revoke all on function public.academias_da_minha_conta() from public, anon;
revoke all on function public.mudar_funcoes_da_pessoa(uuid, text[]) from public, anon;
revoke all on function public.tornar_principal(uuid) from public, anon;
revoke all on function public.deixar_de_ser_principal() from public, anon;
grant execute on function public.pessoas_da_minha_academia(), public.academias_da_minha_conta(),
  public.mudar_funcoes_da_pessoa(uuid, text[]), public.tornar_principal(uuid),
  public.deixar_de_ser_principal() to authenticated;

notify pgrst, 'reload schema';
