-- ============================================================
-- Pagamento de teste (pedido do Breno em 19/10/2026: "eu quero simular as
-- transações escolhendo plano e créditos com um falso Gateway, sem
-- funcionar de vdd ainda, depois de testar eu conecto")
-- ============================================================
-- Como o "modo de teste" do Stripe e o cartão "APRO" do Mercado Pago: no
-- banco de teste, enquanto o Mercado Pago não está ligado, a compra de
-- créditos e a de plano passam por um gateway fingido, que aprova ou
-- recusa na hora, sem dinheiro nenhum. Os créditos e o plano mudam como se
-- o pagamento fosse de verdade (confirmar_compra).
--   pagamento_de_teste          o interruptor, uma linha só, desligada. O
--                               supabase/aplicar.sh liga no banco de teste
--                               e desliga no de verdade a cada rodada.
--   precos_dos_planos           preço de teste do Completo e do Premium,
--                               mensal e anual (2 meses grátis). O site de
--                               verdade segue "Grátis por enquanto".
--   compras_de_creditos         ganha tipo (créditos ou plano), plano,
--                               período e de_teste.
--   criar_compra_de_plano       só o responsável principal.
--   simular_pagamento           o gateway fingido; recusa com o
--                               interruptor desligado.
-- Pode rodar de novo sem estragar nada.

create table if not exists public.pagamento_de_teste (
  id boolean primary key default true check (id),
  ligado boolean not null default false
);
insert into public.pagamento_de_teste (id) values (true) on conflict do nothing;
alter table public.pagamento_de_teste enable row level security;

create table if not exists public.precos_dos_planos (
  plano text not null check (plano in ('completo', 'premium')),
  periodo text not null check (periodo in ('mensal', 'anual')),
  valor integer not null check (valor between 20 and 5000),
  primary key (plano, periodo)
);
insert into public.precos_dos_planos (plano, periodo, valor) values
  ('completo', 'mensal', 49), ('completo', 'anual', 490),
  ('premium', 'mensal', 99), ('premium', 'anual', 990)
on conflict do nothing;
alter table public.precos_dos_planos enable row level security;

-- O site pergunta se o pagamento de teste está ligado e os preços de teste.
create or replace function public.pagamento_de_teste()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'ligado', coalesce((select ligado from public.pagamento_de_teste), false),
    'precos', coalesce((select jsonb_object_agg(plano || '_' || periodo, valor) from public.precos_dos_planos), '{}'::jsonb));
$$;

alter table public.compras_de_creditos add column if not exists tipo text not null default 'creditos';
alter table public.compras_de_creditos add column if not exists plano text;
alter table public.compras_de_creditos add column if not exists periodo text;
alter table public.compras_de_creditos add column if not exists de_teste boolean not null default false;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'compras_de_creditos_tipo') then
    alter table public.compras_de_creditos
      add constraint compras_de_creditos_tipo check (tipo in ('creditos', 'plano')
        and (tipo = 'creditos' or (plano in ('completo', 'premium') and periodo in ('mensal', 'anual'))));
  end if;
end $$;

create or replace function public.criar_compra_de_plano(p_academia uuid, p_plano text, p_periodo text, p_forma text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_valor integer;
  v_id uuid;
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia and papel = 'principal') then
    raise exception 'Só o responsável principal muda o plano da academia.' using errcode = '42501';
  end if;
  if coalesce(p_plano, '') not in ('completo', 'premium') or coalesce(p_periodo, '') not in ('mensal', 'anual') then
    raise exception 'Plano inválido.' using errcode = '22023';
  end if;
  if coalesce(p_forma, '') not in ('pix', 'cartao') then
    raise exception 'Escolha Pix ou cartão.' using errcode = '22023';
  end if;
  if (select coalesce(plano, 'basico') from public.academias where id = p_academia) = p_plano then
    raise exception 'A academia já está nesse plano.' using errcode = '22023';
  end if;
  select valor into v_valor from public.precos_dos_planos where plano = p_plano and periodo = p_periodo;
  if v_valor is null then
    raise exception 'Plano sem preço.' using errcode = '22023';
  end if;
  insert into public.compras_de_creditos (academia_id, user_id, valor, forma, tipo, plano, periodo)
    values (p_academia, auth.uid(), v_valor, p_forma, 'plano', p_plano, p_periodo)
    returning id into v_id;
  return v_id;
end $$;

-- A função do Netlify precisa saber se a compra é de plano (o texto da
-- cobrança e a página da volta).
create or replace function public.compra_para_cobrar(p_compra uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', c.id, 'valor', c.valor, 'forma', c.forma, 'situacao', c.situacao,
    'gateway_id', c.gateway_id, 'academia', a.name, 'tipo', c.tipo, 'plano', c.plano, 'periodo', c.periodo,
    'email', coalesce((select x.email from public.academia_acessos x where x.user_id = c.user_id and public.email_valido(x.email) limit 1),
                      (select j.email from public.jogadores j where j.user_id = c.user_id), ''))
  from public.compras_de_creditos c join public.academias a on a.id = c.academia_id
  where c.id = p_compra;
$$;

-- Paga: a compra de créditos soma os créditos; a de plano muda o plano
-- (o e-mail do plano novo sai pelo gatilho de sempre). Uma vez só.
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
    return 'paga';
  end if;
  if p_situacao in ('rejected', 'cancelled', 'refunded', 'charged_back') then
    update public.compras_de_creditos set situacao = 'recusada', gateway_id = coalesce(p_gateway_id, gateway_id), updated_at = now()
      where id = p_compra;
    return 'recusada';
  end if;
  return 'aberta';
end $$;

-- O gateway fingido: aprova ou recusa a compra aberta, só com o interruptor
-- ligado e só para quem abriria a compra.
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
  update public.compras_de_creditos set de_teste = true, gateway = 'teste', updated_at = now()
    where id = p_compra and situacao = 'aberta';
  return public.confirmar_compra(p_compra, 'teste-' || left(p_compra::text, 8), c.valor,
    case when p_resultado = 'aprovado' then 'approved' else 'rejected' end);
end $$;

create or replace function public.minhas_compras(p_academia uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when exists (select 1 from public.academia_vinculos
                           where user_id = auth.uid() and academia_id = p_academia)
    then coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'valor', c.valor, 'forma', c.forma,
                     'situacao', c.situacao, 'created_at', c.created_at, 'paga_em', c.paga_em,
                     'tipo', c.tipo, 'plano', c.plano, 'periodo', c.periodo, 'de_teste', c.de_teste) order by c.created_at desc)
                   from (select * from public.compras_de_creditos where academia_id = p_academia
                         order by created_at desc limit 10) c), '[]'::jsonb)
    else null end;
$$;

create or replace function public.compras_do_admin()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o admin vê as compras.' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'academia', a.name, 'valor', c.valor, 'forma', c.forma,
                     'situacao', c.situacao, 'created_at', c.created_at, 'paga_em', c.paga_em,
                     'tipo', c.tipo, 'plano', c.plano, 'periodo', c.periodo, 'de_teste', c.de_teste) order by c.created_at desc)
                   from public.compras_de_creditos c join public.academias a on a.id = c.academia_id
                   where c.created_at >= now() - interval '30 days'), '[]'::jsonb);
end $$;

revoke all on function public.pagamento_de_teste() from public;
grant execute on function public.pagamento_de_teste() to anon, authenticated;
revoke all on function public.criar_compra_de_plano(uuid, text, text, text) from public, anon;
grant execute on function public.criar_compra_de_plano(uuid, text, text, text) to authenticated;
revoke all on function public.simular_pagamento(uuid, text) from public, anon;
grant execute on function public.simular_pagamento(uuid, text) to authenticated;
revoke all on function public.compra_para_cobrar(uuid) from public, anon, authenticated;
revoke all on function public.confirmar_compra(uuid, text, numeric, text) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.compra_para_cobrar(uuid) to service_role;
    grant execute on function public.confirmar_compra(uuid, text, numeric, text) to service_role;
  end if;
end $$;
revoke all on function public.minhas_compras(uuid) from public, anon;
grant execute on function public.minhas_compras(uuid) to authenticated;
revoke all on function public.compras_do_admin() from public, anon;
grant execute on function public.compras_do_admin() to authenticated;

notify pgrst, 'reload schema';
