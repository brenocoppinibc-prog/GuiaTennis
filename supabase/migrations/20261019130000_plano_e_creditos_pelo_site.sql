-- ============================================================
-- Plano e créditos pelo próprio site (pedido do Breno em 19/10/2026: "eu
-- quero que as academias possam comprar direto no site a quantidade de
-- créditos e selecionar o plano tbm")
-- ============================================================
-- Plano: por enquanto todos são grátis ("ainda não sei, vamos deixar
-- gratuito"), então o responsável principal escolhe e o plano muda na hora,
-- como o "Mudar de plano" da Shopify e do Google Workspace.
--   escolher_plano              só o responsável principal; tira o pedido de
--                               plano que estava esperando o admin.
--   proteger_ficha_da_academia  deixa passar só o plano quando quem muda é
--                               escolher_plano.
-- Créditos do leilão: a academia escolhe o valor (atalhos de R$ 50, 100 e
-- 200, ou outro, de R$ 20 a R$ 5.000) e paga com Pix na própria tela ou com
-- cartão na página do Mercado Pago (netlify/functions/pagamento.mjs). O
-- valor sai sempre do banco, nunca do navegador; os créditos só entram
-- quando o Mercado Pago confirma.
--   compras_de_creditos         cada compra, com a situação.
--   criar_compra_de_creditos    quem administra a academia (Completo e
--                               Premium) abre a compra.
--   compra_para_cobrar,         só a função do Netlify (service_role):
--   registrar_cobranca,         lê a compra, anota a cobrança e confirma o
--   confirmar_compra            pagamento (uma vez só).
--   minhas_compras              as últimas compras da academia.
--   compras_do_admin            as compras dos últimos 30 dias.
-- Pode rodar de novo sem estragar nada.

-- O plano ---------------------------------------------------------------------
create or replace function public.proteger_ficha_da_academia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pausa boolean := coalesce(current_setting('guiatennis.pausa_da_academia', true), '') = 'sim';
  v_no_ar boolean := coalesce(current_setting('guiatennis.academia_nova_no_ar', true), '') = old.id::text;
  v_linha public.academias;
  v_envio boolean := coalesce(current_setting('guiatennis.gastar_envio', true), '') = old.id::text;
  v_plano boolean := coalesce(current_setting('guiatennis.plano_da_academia', true), '') = old.id::text;
begin
  -- Gastar um envio (gastar_envio_de_aviso): só o saldo muda.
  if v_envio then
    v_linha := old;
    v_linha.envios_de_aviso := new.envios_de_aviso;
    return v_linha;
  end if;
  -- O responsável escolheu o plano (escolher_plano): só o plano muda.
  if v_plano then
    v_linha := old;
    v_linha.plano := new.plano;
    return v_linha;
  end if;
  if v_no_ar then
    return new;
  end if;
  if v_pausa then
    v_linha := old;
    v_linha.pausada := new.pausada;
    v_linha.pausada_ate := new.pausada_ate;
    v_linha.pausada_pela_academia := new.pausada_pela_academia;
    return v_linha;
  end if;
  if auth.uid() is null or public.eh_admin() then
    if new.pausada is distinct from old.pausada or new.pausada_ate is distinct from old.pausada_ate then
      new.pausada_pela_academia := false;
    end if;
    return new;
  end if;
  new.id := old.id;
  new.created_at := old.created_at;
  new.status := old.status;
  new.pago := old.pago;
  new.plano := old.plano;
  new.envios_de_aviso := old.envios_de_aviso;
  new.pausada := old.pausada;
  new.pausada_ate := old.pausada_ate;
  new.pausada_pela_academia := old.pausada_pela_academia;
  new.source := old.source;
  new.nome_solicitante := old.nome_solicitante;
  new.contato_solicitante := old.contato_solicitante;
  new.revisar_desde := old.revisar_desde;
  new.confirmada := true;
  update public.academia_vinculos
    set ficha_atualizada_em = now()
    where user_id = auth.uid() and academia_id = new.id;
  update public.academia_acessos
    set ficha_atualizada_em = now()
    where user_id = auth.uid() and academia_id = new.id;
  return new;
end $$;

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
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia and papel = 'principal') then
    raise exception 'Só o responsável principal muda o plano da academia.' using errcode = '42501';
  end if;
  select coalesce(plano, 'basico') into v_antes from public.academias where id = p_academia;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if v_antes <> p_plano then
    perform set_config('guiatennis.plano_da_academia', p_academia::text, true);
    update public.academias set plano = p_plano where id = p_academia;
    perform set_config('guiatennis.plano_da_academia', '', true);
  end if;
  delete from public.pedidos_de_plano where academia_id = p_academia;
  return p_plano;
end $$;

-- Os créditos -----------------------------------------------------------------
create table if not exists public.compras_de_creditos (
  id uuid primary key default gen_random_uuid(),
  academia_id uuid not null references public.academias (id) on delete cascade,
  user_id uuid,
  valor integer not null check (valor between 20 and 5000),
  forma text not null check (forma in ('pix', 'cartao')),
  situacao text not null default 'aberta' check (situacao in ('aberta', 'paga', 'recusada')),
  gateway text not null default 'mercadopago',
  gateway_id text,
  valor_pago numeric,
  created_at timestamptz not null default now(),
  paga_em timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists compras_de_creditos_por_academia on public.compras_de_creditos (academia_id, created_at desc);
alter table public.compras_de_creditos enable row level security;

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

-- Só a função do Netlify (service_role) chama as três abaixo.
create or replace function public.compra_para_cobrar(p_compra uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', c.id, 'valor', c.valor, 'forma', c.forma, 'situacao', c.situacao,
    'gateway_id', c.gateway_id, 'academia', a.name,
    'email', coalesce((select x.email from public.academia_acessos x where x.user_id = c.user_id and public.email_valido(x.email) limit 1),
                      (select j.email from public.jogadores j where j.user_id = c.user_id), ''))
  from public.compras_de_creditos c join public.academias a on a.id = c.academia_id
  where c.id = p_compra;
$$;

create or replace function public.registrar_cobranca(p_compra uuid, p_gateway_id text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  update public.compras_de_creditos set gateway_id = p_gateway_id, updated_at = now()
    where id = p_compra and situacao = 'aberta'
  returning true;
$$;

-- p_situacao é a do Mercado Pago (approved, rejected, cancelled, pending…).
-- Os créditos entram uma vez só, e só se o valor pago cobre a compra.
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
    perform public.mexer_creditos(c.academia_id, c.valor);
    return 'paga';
  end if;
  if p_situacao in ('rejected', 'cancelled', 'refunded', 'charged_back') then
    update public.compras_de_creditos set situacao = 'recusada', gateway_id = coalesce(p_gateway_id, gateway_id), updated_at = now()
      where id = p_compra;
    return 'recusada';
  end if;
  return 'aberta';
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
                     'situacao', c.situacao, 'created_at', c.created_at, 'paga_em', c.paga_em) order by c.created_at desc)
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
                     'situacao', c.situacao, 'created_at', c.created_at, 'paga_em', c.paga_em) order by c.created_at desc)
                   from public.compras_de_creditos c join public.academias a on a.id = c.academia_id
                   where c.created_at >= now() - interval '30 days'), '[]'::jsonb);
end $$;

revoke all on function public.escolher_plano(uuid, text) from public, anon;
grant execute on function public.escolher_plano(uuid, text) to authenticated;
revoke all on function public.criar_compra_de_creditos(uuid, integer, text) from public, anon;
grant execute on function public.criar_compra_de_creditos(uuid, integer, text) to authenticated;
revoke all on function public.compra_para_cobrar(uuid) from public, anon, authenticated;
revoke all on function public.registrar_cobranca(uuid, text) from public, anon, authenticated;
revoke all on function public.confirmar_compra(uuid, text, numeric, text) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.compra_para_cobrar(uuid) to service_role;
    grant execute on function public.registrar_cobranca(uuid, text) to service_role;
    grant execute on function public.confirmar_compra(uuid, text, numeric, text) to service_role;
  end if;
end $$;
revoke all on function public.minhas_compras(uuid) from public, anon;
grant execute on function public.minhas_compras(uuid) to authenticated;
revoke all on function public.compras_do_admin() from public, anon;
grant execute on function public.compras_do_admin() to authenticated;

notify pgrst, 'reload schema';
