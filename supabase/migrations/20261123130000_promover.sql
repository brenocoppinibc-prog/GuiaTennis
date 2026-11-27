-- Regra 317 (23/11/2026): "Promover", tudo num pagamento só ("não podemos
-- deixar tudo isso incluído para a academia não ter que pagar duas vezes em
-- coisas diferentes"). Como o Instagram, que distribui um valor só entre o
-- feed, os stories e o explorar: a academia escreve a promoção, escolhe as
-- semanas (o mínimo, que garante a promoção na ficha) e o alcance (quanto
-- mais quer investir). O alcance compra aparições na faixa patrocinada do
-- início e da busca, perto da academia, e, no Premium, entra sozinho no
-- e-mail da semana do bairro (o leilão deixa de ter lance separado).
--   * O preço da aparição muda todo dia: o dinheiro de todas as academias do
--     bairro dividido pelas aparições estimadas (os acessos das últimas duas
--     semanas), nunca abaixo de preco_mil_faixa (R$ 30 por mil). Cada academia
--     aparece na proporção do que investiu, ajustado pela qualidade da ficha.
--   * Premium: 15% de desconto em tudo (desconto_premium = 0,15).
--   * A mesma pessoa vê a mesma faixa no máximo 3 vezes por dia.
--   * O alcance que sobra no fim volta aos créditos.

update public.leilao_config set desconto_premium = 0.15 where id = 1;
alter table public.leilao_config add column if not exists preco_mil_faixa integer not null default 30;

alter table public.promocoes add column if not exists alcance integer not null default 0;
alter table public.promocoes add column if not exists alcance_gasto numeric not null default 0;
alter table public.promocoes add column if not exists gasto_hoje numeric not null default 0;
alter table public.promocoes add column if not exists gasto_dia date;
alter table public.promocoes add column if not exists exibicoes integer not null default 0;
alter table public.promocoes add column if not exists toques integer not null default 0;
alter table public.promocoes add column if not exists alcance_devolvido_em timestamptz;
alter table public.lances add column if not exists promocao_id uuid references public.promocoes (id) on delete set null;

create table if not exists public.exibicoes_da_faixa (
  promocao_id uuid not null references public.promocoes (id) on delete cascade,
  visitante text not null,
  dia date not null,
  vezes integer not null default 0,
  toques integer not null default 0,
  primary key (promocao_id, visitante, dia)
);
alter table public.exibicoes_da_faixa enable row level security;
revoke all on public.exibicoes_da_faixa from anon, authenticated;

-- Quantas aparições o bairro tem por dia: os acessos das últimas duas semanas
-- nas fichas do bairro e nas buscas perto dele (no mínimo 30).
create or replace function public.exibicoes_do_bairro(p_regiao text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with c as (select lat, lng from public.centro_da_regiao(p_regiao)),
       daqui as (select a.id from public.academias a where public.regiao_da_academia(a) = p_regiao)
  select greatest(30, (count(*) / 14)::integer)
  from public.cliques k, c
  where k.created_at > now() - interval '14 days'
    and (k.academia_id in (select id from daqui)
         or (k.academia_id is null and k.lat is not null and c.lat is not null
             and abs(k.lat - c.lat) < 0.03 and abs(k.lng - c.lng) < 0.035));
$$;

-- O que as academias do bairro ainda têm para gastar por dia.
create or replace function public.orcamento_diario(p public.promocoes)
returns numeric
language sql
stable
set search_path = ''
as $$
  select case when p.valida_ate < public.hoje_em_brasilia() or p.alcance <= p.alcance_gasto then 0
              else (p.alcance - p.alcance_gasto) / greatest(1, p.valida_ate - public.hoje_em_brasilia() + 1) end;
$$;

create or replace function public.orcamentos_do_bairro(p_regiao text, p_menos uuid default null)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(public.orcamento_diario(p)), 0)
  from public.promocoes p join public.academias a on a.id = p.academia_id
  where public.regiao_da_academia(a) = p_regiao and p.alcance > p.alcance_gasto
    and p.valida_ate >= public.hoje_em_brasilia() and (p_menos is null or p.id <> p_menos);
$$;

-- O preço de uma aparição no bairro hoje (sem o desconto do Premium): o que
-- as OUTRAS academias do bairro investem dividido pelas aparições, nunca
-- abaixo do mínimo. Como no Google, cada uma paga o que a concorrência pede,
-- não contra o próprio orçamento: sozinha no bairro, paga o mínimo.
drop function if exists public.preco_da_exibicao(text);
create or replace function public.preco_da_exibicao(p_regiao text, p_menos uuid default null)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select greatest((select preco_mil_faixa from public.leilao_config where id = 1) / 1000.0,
                  public.orcamentos_do_bairro(p_regiao, p_menos) / public.exibicoes_do_bairro(p_regiao));
$$;

-- A estimativa na tela de Promover: as aparições do bairro, o preço de hoje,
-- quantas aparições o valor rende e o valor sugerido para aparecer em cerca
-- de 1 a cada 4 buscas.
create or replace function public.estimativa_de_alcance(p_academia uuid, p_alcance integer, p_semanas integer, p_promocao uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  a public.academias;
  p public.promocoes;
  v_regiao text;
  v_dias integer;
  v_v integer;
  v_outros numeric;
  v_minimo numeric;
  v_d numeric;
  v_fator numeric := 1;
  v_preco numeric;
  v_parte numeric;
  v_por_dia numeric;
  v_sugerido numeric;
begin
  if not public.posso(p_academia, 'promocoes') then
    raise exception 'Entre na conta da academia.' using errcode = '42501';
  end if;
  select * into a from public.academias where id = p_academia;
  v_regiao := public.regiao_da_academia(a);
  if v_regiao is null then
    return jsonb_build_object('sem_bairro', true);
  end if;
  v_dias := greatest(7, 7 * coalesce(p_semanas, 0));
  if p_promocao is not null then
    select * into p from public.promocoes where id = p_promocao and academia_id = p_academia;
    if found and p.valida_ate >= public.hoje_em_brasilia() then
      v_dias := (p.valida_ate - public.hoje_em_brasilia() + 1) + 7 * coalesce(p_semanas, 0);
    end if;
  end if;
  if coalesce(a.plano, 'basico') = 'premium' then
    v_fator := 1 - (select desconto_premium from public.leilao_config where id = 1);
  end if;
  v_v := public.exibicoes_do_bairro(v_regiao);
  v_outros := public.orcamentos_do_bairro(v_regiao, p_promocao);
  v_minimo := (select preco_mil_faixa from public.leilao_config where id = 1) / 1000.0;
  v_d := coalesce(p_alcance, 0)::numeric / v_dias;
  v_preco := greatest(v_minimo, v_outros / v_v);
  v_parte := case when v_outros + v_d > 0 then v_d / (v_outros + v_d) else 0 end;
  v_por_dia := least(v_v * v_parte, v_d / (v_preco * v_fator));
  v_sugerido := ceil(greatest(v_outros / 3, 0.25 * v_v * v_minimo) * v_fator * v_dias / 5) * 5;
  return jsonb_build_object('bairro', public.nome_da_regiao(a), 'exibicoes_dia', v_v, 'preco_mil', round(v_preco * v_fator * 1000, 2),
    'dias', v_dias, 'exibicoes_min', floor(v_por_dia * v_dias * 0.8), 'exibicoes_max', ceil(v_por_dia * v_dias * 1.2),
    'parte', round(v_parte, 3), 'sugerido', v_sugerido, 'gasto_estimado', round(least(coalesce(p_alcance, 0), v_por_dia * v_dias * v_preco * v_fator), 2), 'concorrentes', (select count(*) from public.promocoes x join public.academias y on y.id = x.academia_id
      where public.regiao_da_academia(y) = v_regiao and x.alcance > x.alcance_gasto and x.valida_ate >= public.hoje_em_brasilia()
        and (p_promocao is null or x.id <> p_promocao) and x.academia_id <> p_academia));
end $$;
revoke all on function public.estimativa_de_alcance(uuid, integer, integer, uuid) from public, anon;
grant execute on function public.estimativa_de_alcance(uuid, integer, integer, uuid) to authenticated;

-- Promover: a promoção na ficha (salvar_promocao, as semanas) e o alcance, num
-- pagamento só, com os créditos.
create or replace function public.promover(p_academia uuid, p_id uuid, p_titulo text, p_detalhes text, p_semanas integer, p_alcance integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
  v_id uuid;
  v_alcance integer := coalesce(p_alcance, 0);
  v_saldo integer;
begin
  if v_alcance < 0 or v_alcance > 5000 or (v_alcance > 0 and v_alcance < 10) then
    raise exception 'O alcance vai de R$ 10 a R$ 5.000 (ou nenhum).' using errcode = '22023';
  end if;
  r := public.salvar_promocao(p_academia, p_id, p_titulo, p_detalhes, p_semanas);
  v_id := (r ->> 'id')::uuid;
  if v_alcance > 0 then
    select coalesce(envios_de_aviso, 0) into v_saldo from public.academias where id = p_academia;
    if v_alcance > v_saldo then
      raise exception 'A academia tem R$ % de créditos. Compre créditos ou escolha um alcance menor.', v_saldo using errcode = '22023';
    end if;
    perform public.mexer_creditos(p_academia, -v_alcance);
    update public.promocoes set alcance = alcance + v_alcance, alcance_devolvido_em = null, updated_at = now() where id = v_id;
  end if;
  return r || jsonb_build_object('alcance', v_alcance, 'pago', coalesce((r ->> 'pago')::integer, 0) + v_alcance,
    'creditos', (select envios_de_aviso from public.academias where id = p_academia));
end $$;
revoke all on function public.promover(uuid, uuid, text, text, integer, integer) from public, anon;
grant execute on function public.promover(uuid, uuid, text, text, integer, integer) to authenticated;

-- A faixa patrocinada: uma promoção perto do lugar buscado, sorteada na
-- proporção do orçamento do dia e da qualidade da ficha (o Premium vale 15% a
-- mais). Cada aparição sai do alcance pelo preço do bairro; a mesma pessoa vê
-- a mesma faixa no máximo 3 vezes por dia.
create or replace function public.faixa_patrocinada(p_lat double precision, p_lng double precision, p_visitante text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hoje date := public.hoje_em_brasilia();
  v_desc numeric := (select desconto_premium from public.leilao_config where id = 1);
  x record;
  v_preco numeric;
begin
  if p_lat is null or p_lng is null or coalesce(p_visitante, '') !~ '^[A-Za-z0-9_-]{8,64}$' then
    return null;
  end if;
  select p.*, a.name as academia, a.plano as plano_da_academia, public.regiao_da_academia(a) as regiao_da_academia
    into x
    from public.promocoes p join public.academias a on a.id = p.academia_id
    where p.valida_ate >= v_hoje and p.alcance > p.alcance_gasto
      and public.academia_no_ar(a) and public.promocoes_liberadas(a)
      and a.lat is not null and abs(a.lat - p_lat) < 0.045 and abs(a.lng - p_lng) < 0.05
      and coalesce(public.qualidade_do_lance(a.id, p.titulo || ' ' || coalesce(p.detalhes, '')), 0) >= 0.80
      and (case when p.gasto_dia = v_hoje then p.gasto_hoje else 0 end) < public.orcamento_diario(p)
      and coalesce((select e.vezes from public.exibicoes_da_faixa e where e.promocao_id = p.id and e.visitante = p_visitante and e.dia = v_hoje), 0) < 3
    order by -ln(1 - random()) / (public.orcamento_diario(p)
             * coalesce(public.qualidade_do_lance(a.id, p.titulo || ' ' || coalesce(p.detalhes, '')), 0.8)
             * case when a.plano = 'premium' then 1 / (1 - v_desc) else 1 end)
    limit 1;
  if not found then
    return null;
  end if;
  v_preco := public.preco_da_exibicao(x.regiao_da_academia, x.id) * case when x.plano_da_academia = 'premium' then 1 - v_desc else 1 end;
  update public.promocoes set
      alcance_gasto = least(alcance, alcance_gasto + v_preco),
      gasto_hoje = (case when gasto_dia = v_hoje then gasto_hoje else 0 end) + v_preco,
      gasto_dia = v_hoje, exibicoes = exibicoes + 1
    where id = x.id;
  insert into public.exibicoes_da_faixa (promocao_id, visitante, dia, vezes) values (x.id, p_visitante, v_hoje, 1)
    on conflict (promocao_id, visitante, dia) do update set vezes = public.exibicoes_da_faixa.vezes + 1;
  return jsonb_build_object('promocao', x.id, 'academia_id', x.academia_id, 'academia', x.academia, 'titulo', x.titulo, 'detalhes', x.detalhes);
end $$;
revoke all on function public.faixa_patrocinada(double precision, double precision, text) from public;
grant execute on function public.faixa_patrocinada(double precision, double precision, text) to anon, authenticated;

create or replace function public.tocar_na_faixa(p_promocao uuid, p_visitante text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.exibicoes_da_faixa set toques = toques + 1
    where promocao_id = p_promocao and visitante = p_visitante and dia = public.hoje_em_brasilia() and toques < vezes;
  if found then
    update public.promocoes set toques = toques + 1 where id = p_promocao;
  end if;
end $$;
revoke all on function public.tocar_na_faixa(uuid, text) from public;
grant execute on function public.tocar_na_faixa(uuid, text) to anon, authenticated;

-- Os resultados de cada promoção para a academia (Promoções).
create or replace function public.alcance_das_promocoes(p_academia uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.posso(p_academia, 'promocoes') then
    coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'alcance', p.alcance, 'gasto', round(p.alcance_gasto, 2),
      'exibicoes', p.exibicoes, 'toques', p.toques,
      'emails', (select count(*) from public.lances l where l.promocao_id = p.id and l.situacao in ('ganhou', 'enviado')),
      'avisados', (select coalesce(sum(l.avisados), 0) from public.lances l where l.promocao_id = p.id)))
     from public.promocoes p where p.academia_id = p_academia), '[]'::jsonb)
  else null end;
$$;
revoke all on function public.alcance_das_promocoes(uuid) from public, anon;
grant execute on function public.alcance_das_promocoes(uuid) to authenticated;

-- As promoções no ar para o admin acompanhar e divulgar no Instagram.
create or replace function public.promocoes_do_admin()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o admin vê as promoções.' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'academia_id', a.id, 'academia', a.name, 'bairro', a.bairro, 'cidade', a.cidade,
      'plano', coalesce(a.plano, 'basico'), 'instagram', a.instagram, 'titulo', p.titulo, 'detalhes', p.detalhes, 'valida_ate', p.valida_ate,
      'semanas', p.semanas, 'pago', p.pago, 'alcance', p.alcance, 'gasto', round(p.alcance_gasto, 2), 'exibicoes', p.exibicoes, 'toques', p.toques,
      'emails', (select coalesce(sum(l.avisados), 0) from public.lances l where l.promocao_id = p.id))
      order by p.alcance + p.pago desc, p.created_at desc)
    from public.promocoes p join public.academias a on a.id = p.academia_id
    where p.valida_ate >= public.hoje_em_brasilia() - 7), '[]'::jsonb);
end $$;
revoke all on function public.promocoes_do_admin() from public, anon;
grant execute on function public.promocoes_do_admin() to authenticated;

-- Encerrar a promoção devolve também o alcance que sobrou (o resto é o de
-- antes, SQL 20261029190000).
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
  end if;
  if p.alcance_devolvido_em is null and p.alcance > p.alcance_gasto then
    v_volta := v_volta + floor(p.alcance - p.alcance_gasto)::integer;
  end if;
  if v_volta > 0 then
    perform public.mexer_creditos(p.academia_id, v_volta);
  end if;
  update public.lances set situacao = 'cancelado', updated_at = now() where promocao_id = p_id and situacao = 'aberto';
  delete from public.promocoes where id = p_id;
  return v_volta;
end $$;

-- O fechamento do leilão: o lance que veio de uma promoção (Promover) sai do
-- alcance dela, não dos créditos (o resto é o de antes, SQL 20261022120000).
create or replace function public.fechar_leiloes(p_agora timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  cfg public.leilao_config;
  r record;
  v_ids uuid[];
  v_notas numeric[];
  v_quals numeric[];
  v_valores integer[];
  v_i integer;
  v_pos integer;
  v_preco integer;
  v_fechados integer := 0;
  v_promo uuid;
  a public.academias;
begin
  select * into cfg from public.leilao_config where id = 1;
  for r in select distinct regiao, fecha_em from public.lances where situacao = 'aberto' and fecha_em <= p_agora loop
    update public.lances l set situacao = 'cancelado', updated_at = now()
      from public.academias x
      where l.regiao = r.regiao and l.fecha_em = r.fecha_em and l.situacao = 'aberto' and x.id = l.academia_id
        and (coalesce(x.plano, 'basico') <> 'premium' or not public.academia_no_ar(x));
    update public.lances l set qualidade = coalesce(public.qualidade_do_lance(l.academia_id, l.mensagem), 0.70)
      where l.regiao = r.regiao and l.fecha_em = r.fecha_em and l.situacao = 'aberto';
    select array_agg(id order by nota desc, created_at), array_agg(nota order by nota desc, created_at),
           array_agg(qualidade order by nota desc, created_at), array_agg(valor order by nota desc, created_at)
      into v_ids, v_notas, v_quals, v_valores
      from (select id, created_at, qualidade, valor, valor * qualidade as nota from public.lances
            where regiao = r.regiao and fecha_em = r.fecha_em and situacao = 'aberto') t;
    v_pos := 0;
    for v_i in 1 .. coalesce(array_length(v_ids, 1), 0) loop
      if v_pos >= 2 then
        update public.lances set situacao = 'perdeu', updated_at = now() where id = v_ids[v_i];
        continue;
      end if;
      v_preco := case when v_i < array_length(v_ids, 1)
                      then ceil(v_notas[v_i + 1] / v_quals[v_i])::integer + 1
                      else cfg.lance_minimo end;
      v_preco := least(v_valores[v_i], greatest(v_preco, cfg.lance_minimo));
      select x.* into a from public.academias x join public.lances l on l.academia_id = x.id where l.id = v_ids[v_i];
      select promocao_id into v_promo from public.lances where id = v_ids[v_i];
      if v_promo is not null then
        if not exists (select 1 from public.promocoes where id = v_promo and alcance - alcance_gasto >= v_preco) then
          update public.lances set situacao = 'sem_saldo', updated_at = now() where id = v_ids[v_i];
          continue;
        end if;
        update public.promocoes set alcance_gasto = alcance_gasto + v_preco, updated_at = now() where id = v_promo;
      else
        if coalesce(a.envios_de_aviso, 0) < v_preco then
          update public.lances set situacao = 'sem_saldo', updated_at = now() where id = v_ids[v_i];
          continue;
        end if;
        perform public.mexer_creditos(a.id, -v_preco);
      end if;
      v_pos := v_pos + 1;
      update public.lances
        set situacao = 'ganhou', posicao = v_pos, preco = v_preco, updated_at = now(),
            envio_em = r.fecha_em + case when v_pos = 1 then interval '1 day 14 hours' else interval '4 days 14 hours' end
        where id = v_ids[v_i];
    end loop;
    v_fechados := v_fechados + 1;
  end loop;
  return v_fechados;
end $$;

-- O relógio do alcance (de hora em hora): devolve o alcance que sobrou das
-- promoções que terminaram e, no Premium, coloca a promoção no leilão da
-- semana do bairro, com o valor do alcance da semana (sem lance separado).
create or replace function public.rodar_alcance()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  v_hoje date := public.hoje_em_brasilia();
  v_fecha timestamptz := public.proximo_fechamento();
  v_minimo integer := (select lance_minimo from public.leilao_config where id = 1);
  v_semanas integer;
  v_valor integer;
begin
  for p in select * from public.promocoes where valida_ate < v_hoje and alcance > alcance_gasto and alcance_devolvido_em is null loop
    if floor(p.alcance - p.alcance_gasto) > 0 then
      perform public.mexer_creditos(p.academia_id, floor(p.alcance - p.alcance_gasto)::integer);
    end if;
    update public.promocoes set alcance_devolvido_em = now() where id = p.id;
  end loop;
  for p in select x.*, a.plano as plano_da_academia, public.regiao_da_academia(a) as regiao_da_academia, public.nome_da_regiao(a) as nome_da_regiao
           from public.promocoes x join public.academias a on a.id = x.academia_id
           where x.valida_ate >= v_hoje and x.alcance > x.alcance_gasto and coalesce(a.plano, 'basico') = 'premium'
             and public.academia_no_ar(a) and public.regiao_da_academia(a) is not null
             and not exists (select 1 from public.lances l where l.academia_id = x.academia_id and l.fecha_em = v_fecha) loop
    v_semanas := greatest(1, ceil((p.valida_ate - v_hoje + 1) / 7.0)::integer);
    v_valor := floor((p.alcance - p.alcance_gasto) / v_semanas)::integer;
    if v_valor < v_minimo then
      continue;
    end if;
    begin
      insert into public.lances (academia_id, regiao, regiao_nome, fecha_em, titulo, mensagem, valor, criado_por, promocao_id)
        values (p.academia_id, p.regiao_da_academia, p.nome_da_regiao, v_fecha, p.titulo, coalesce(p.detalhes, p.titulo), v_valor, p.criada_por, p.id);
    exception when others then
      raise warning 'alcance: o lance da promoção % não entrou (%).', p.id, sqlerrm;
    end;
  end loop;
end $$;

do $$
declare
  f text;
begin
  foreach f in array array['exibicoes_do_bairro(text)', 'orcamentos_do_bairro(text, uuid)', 'preco_da_exibicao(text, uuid)',
                           'orcamento_diario(public.promocoes)', 'rodar_alcance()'] loop
    execute 'revoke all on function public.' || f || ' from public, anon, authenticated';
  end loop;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'guiatennis-alcance';
    perform cron.schedule('guiatennis-alcance', '23 * * * *', 'select public.rodar_alcance()');
  end if;
exception when others then
  raise warning 'alcance: o relógio não ligou (%).', sqlerrm;
end $$;
