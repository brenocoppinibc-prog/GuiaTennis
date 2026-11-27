-- Regra 319 (23/11/2026). Três pedidos do Breno no PR #5:
--
-- 1) "não quero 30 fundadoras e sim 15 que eu próprio adicionar não devem
--    ganhar esse emblema" (resposta na conversa: "Dono assumiu, conta"). O selo
--    "Fundadora" vai para as 15 primeiras academias cujo responsável entrou
--    sozinho no Parceiros (cadastrou a academia ou pediu a ficha), mesmo que a
--    ficha tenha sido cadastrada pelo GuiaTennis. Não contam a conta do admin
--    nem os acessos criados por ele (usuário e senha provisória, e-mail
--    @acesso.guiatennis.com.br, criar_acesso_academia).
-- 2) "preciso que essas metas entrem no meu painel que eu posso fazer análises
--    semanalmente": as metas do GuiaTennis (editáveis) e os números de cada
--    semana, como o painel de metas semanais das startups (North Star: os
--    contatos com as academias). Os números que não têm histórico (fichas com
--    preço e foto, fundadoras, pagantes) ficam num retrato por semana, gravado
--    sempre que o admin abre as metas.
-- 3) "a mesma ideia do Spotify de publicar minha academia teve tantos
--    acessos": os números que a academia pode divulgar (acessos dos últimos 30
--    dias e desde o começo; contatos no Completo e no Premium, como já veem).
--
-- Pode rodar de novo sem estragar.

-- 1) Fundadoras ---------------------------------------------------------------
create or replace function public.conta_de_fundadora(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = p_user
      and lower(coalesce(u.email, '')) <> 'guiatennis1@gmail.com'
      and lower(coalesce(u.email, '')) not like '%@acesso.guiatennis.com.br'
      and not (coalesce(u.raw_user_meta_data, '{}'::jsonb) ? 'academia_id'));
$$;

create or replace function public.marcar_academia_fundadora()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.conta_de_fundadora(new.user_id)
     and (select count(*) from public.academias_fundadoras) < 15 then
    insert into public.academias_fundadoras (academia_id) values (new.academia_id) on conflict do nothing;
  end if;
  return new;
end $$;

-- O selo ainda não chegou ao banco de verdade (vai com o merge do PR #5, logo
-- depois do 20261121120000, que marcou as 30 primeiras por qualquer acesso):
-- a lista é refeita pela data em que a conta da academia entrou, até 15. A
-- academia que já não tem ninguém no Parceiros mantém o selo (é para sempre).
delete from public.academias_fundadoras f
where exists (select 1 from public.academia_vinculos v where v.academia_id = f.academia_id);
insert into public.academias_fundadoras (academia_id, desde)
select v.academia_id, min(v.created_at) from public.academia_vinculos v
where public.conta_de_fundadora(v.user_id)
group by v.academia_id
order by min(v.created_at)
limit greatest(0, 15 - (select count(*) from public.academias_fundadoras))
on conflict do nothing;

revoke all on function public.conta_de_fundadora(uuid) from public, anon, authenticated;
revoke all on function public.marcar_academia_fundadora() from public, anon, authenticated;

-- 2) Metas da semana ----------------------------------------------------------
create table if not exists public.metas_do_guia (
  chave text primary key,
  valor numeric not null check (valor >= 0),
  atualizado_em timestamptz not null default now()
);
alter table public.metas_do_guia enable row level security;
revoke all on public.metas_do_guia from anon, authenticated;
insert into public.metas_do_guia (chave, valor) values
  ('contatos', 50), ('conversao', 5), ('visitas', 500), ('avaliacoes', 10), ('parceiros', 3),
  ('com_preco', 70), ('com_foto', 80), ('fundadoras', 15), ('pagantes', 5), ('receita', 250)
on conflict (chave) do nothing;

create table if not exists public.metas_retratos (
  semana date primary key,
  fichas integer not null default 0,
  com_preco integer not null default 0,
  com_foto integer not null default 0,
  fundadoras integer not null default 0,
  pagantes integer not null default 0,
  gravado_em timestamptz not null default now()
);
alter table public.metas_retratos enable row level security;
revoke all on public.metas_retratos from anon, authenticated;

-- A segunda-feira da semana, no horário de Brasília.
create or replace function public.semana_de(p_quando timestamptz)
returns date
language sql
immutable
set search_path = ''
as $$
  select date_trunc('week', p_quando at time zone 'America/Sao_Paulo')::date;
$$;

create or replace function public.metas_da_semana(p_semanas integer default 8)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seg date := public.semana_de(now());
  v_n integer := least(greatest(coalesce(p_semanas, 8), 2), 26);
  v_ini timestamptz;
  v_fichas integer; v_preco integer; v_foto integer; v_fund integer; v_pag integer;
  v_semanas jsonb;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis vê as metas.' using errcode = '42501';
  end if;
  v_ini := (v_seg - 7 * (v_n - 1))::timestamp at time zone 'America/Sao_Paulo';

  select count(*),
         count(*) filter (where coalesce(a.price_aula, '') ~ '[1-9]' or coalesce(a.price_locacao, '') ~ '[1-9]'
                            or coalesce(a.price_range, '') ~ '[1-9]' or coalesce(a.catalogo::text, '') ~ '"preco": "?[^",]*[1-9]'),
         count(*) filter (where jsonb_typeof(a.photos) = 'array' and jsonb_array_length(a.photos) > 0)
    into v_fichas, v_preco, v_foto
  from public.academias a where a.status = 'published';
  select count(*) into v_fund from public.academias_fundadoras;
  select count(distinct c.academia_id) into v_pag
  from public.compras_de_creditos c join public.academias a on a.id = c.academia_id
  where c.tipo = 'plano' and c.situacao = 'paga' and not c.de_teste and a.plano = 'premium'
    and c.paga_em >= now() - case when c.periodo = 'anual' then interval '370 days' else interval '35 days' end;

  insert into public.metas_retratos (semana, fichas, com_preco, com_foto, fundadoras, pagantes, gravado_em)
  values (v_seg, v_fichas, v_preco, v_foto, v_fund, v_pag, now())
  on conflict (semana) do update set fichas = excluded.fichas, com_preco = excluded.com_preco,
    com_foto = excluded.com_foto, fundadoras = excluded.fundadoras, pagantes = excluded.pagantes,
    gravado_em = now();

  with s as (select (v_seg - 7 * g)::date as ini from generate_series(0, v_n - 1) g),
  c as (select public.semana_de(created_at) as sem, tipo from public.cliques where created_at >= v_ini),
  p as (select v.academia_id, min(v.created_at) as m from public.academia_vinculos v
        where public.conta_de_fundadora(v.user_id) group by v.academia_id)
  select jsonb_agg(jsonb_build_object(
    'semana', s.ini,
    'visitas', (select count(*) from c where c.sem = s.ini and c.tipo = 'acesso_site'),
    'buscas', (select count(*) from c where c.sem = s.ini and c.tipo = 'busca'),
    'fichas_abertas', (select count(*) from c where c.sem = s.ini and c.tipo = 'visualizacao'),
    'contatos', (select count(*) from c where c.sem = s.ini and c.tipo in ('whatsapp', 'site', 'instagram', 'reserva')),
    'avaliacoes', (select count(*) from public.avaliacoes a where public.semana_de(a.created_at) = s.ini),
    'parceiros', (select count(*) from p where public.semana_de(p.m) = s.ini),
    'receita', (select coalesce(sum(coalesce(x.valor_pago, x.valor) - x.valor_estornado), 0)
                from public.compras_de_creditos x
                where x.situacao = 'paga' and not x.de_teste and public.semana_de(x.paga_em) = s.ini),
    'retrato', (select jsonb_build_object('fichas', r.fichas, 'com_preco', r.com_preco, 'com_foto', r.com_foto,
                                          'fundadoras', r.fundadoras, 'pagantes', r.pagantes)
                from public.metas_retratos r where r.semana = s.ini)
  ) order by s.ini desc) into v_semanas
  from s;

  return jsonb_build_object(
    'metas', (select jsonb_object_agg(chave, valor) from public.metas_do_guia),
    'agora', jsonb_build_object('fichas', v_fichas, 'com_preco', v_preco, 'com_foto', v_foto,
                                'fundadoras', v_fund, 'pagantes', v_pag),
    'semanas', coalesce(v_semanas, '[]'::jsonb));
end $$;

create or replace function public.salvar_metas(p_metas jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  k text;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis muda as metas.' using errcode = '42501';
  end if;
  for k in select jsonb_object_keys(coalesce(p_metas, '{}'::jsonb)) loop
    if k not in ('contatos', 'conversao', 'visitas', 'avaliacoes', 'parceiros', 'com_preco', 'com_foto', 'fundadoras', 'pagantes', 'receita') then
      raise exception 'Meta desconhecida: %.', k using errcode = '22023';
    end if;
    if jsonb_typeof(p_metas -> k) <> 'number' or (p_metas ->> k)::numeric < 0 then
      raise exception 'A meta precisa ser um número igual ou maior que zero.' using errcode = '22023';
    end if;
    insert into public.metas_do_guia (chave, valor, atualizado_em) values (k, (p_metas ->> k)::numeric, now())
    on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();
  end loop;
end $$;

revoke all on function public.semana_de(timestamptz) from public, anon, authenticated;
revoke all on function public.metas_da_semana(integer) from public, anon;
grant execute on function public.metas_da_semana(integer) to authenticated;
revoke all on function public.salvar_metas(jsonb) from public, anon;
grant execute on function public.salvar_metas(jsonb) to authenticated;

-- 3) Os números para a academia divulgar ----------------------------------------
create or replace function public.numeros_para_divulgar(p_academia uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_plano text;
  v_desde timestamptz := now() - interval '30 days';
  v_contatos boolean;
begin
  if not (public.eh_admin() or exists (select 1 from public.academia_vinculos where user_id = auth.uid() and academia_id = p_academia)) then
    raise exception 'Entre na conta da academia.' using errcode = '42501';
  end if;
  select coalesce(plano, 'basico') into v_plano from public.academias where id = p_academia;
  v_contatos := v_plano in ('completo', 'premium');
  return jsonb_build_object(
    'plano', v_plano,
    'acessos_30', (select count(*) from public.cliques where academia_id = p_academia and tipo = 'visualizacao' and created_at >= v_desde),
    'acessos_total', (select count(*) from public.cliques where academia_id = p_academia and tipo = 'visualizacao'),
    'contatos_30', case when v_contatos then (select count(*) from public.cliques where academia_id = p_academia
                     and tipo in ('whatsapp', 'site', 'instagram', 'reserva') and created_at >= v_desde) end,
    'contatos_total', case when v_contatos then (select count(*) from public.cliques where academia_id = p_academia
                     and tipo in ('whatsapp', 'site', 'instagram', 'reserva')) end);
end $$;

revoke all on function public.numeros_para_divulgar(uuid) from public, anon;
grant execute on function public.numeros_para_divulgar(uuid) to authenticated;

notify pgrst, 'reload schema';
