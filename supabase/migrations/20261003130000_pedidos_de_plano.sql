-- ============================================================
-- Pedidos de plano (pedido do Breno em 03/10/2026)
-- ============================================================
-- O cadastro da academia não trava mais nada pelo plano: ela preenche do
-- jeito dela e, ao finalizar, vê o que o Básico esconde da ficha e escolhe
-- o plano — como o "Quase lá" do Booking e o upgrade do Google Business
-- Profile. Quem escolhe Completo ou Premium deixa o pedido anotado aqui; o
-- Breno vê no painel, combina o valor pelo WhatsApp e muda o plano. Mudar o
-- plano da academia para o pedido (ou um maior) tira o pedido da lista.
--
-- Nada é cobrado sozinho: o plano só muda quando o GuiaTennis muda.
-- Pode rodar de novo sem estragar nada.

create table if not exists public.pedidos_de_plano (
  academia_id uuid primary key references public.academias (id) on delete cascade,
  plano text not null,
  user_id uuid references auth.users (id) on delete set null,
  onde text,
  created_at timestamptz not null default now()
);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pedidos_de_plano_plano') then
    alter table public.pedidos_de_plano
      add constraint pedidos_de_plano_plano check (plano in ('completo', 'premium'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pedidos_de_plano_onde') then
    alter table public.pedidos_de_plano
      add constraint pedidos_de_plano_onde check (onde is null or onde in ('cadastro', 'edicao', 'painel'));
  end if;
end $$;

alter table public.pedidos_de_plano enable row level security;
drop policy if exists "Admin ve pedidos de plano" on public.pedidos_de_plano;
create policy "Admin ve pedidos de plano" on public.pedidos_de_plano
  for select using (public.eh_admin());
drop policy if exists "Admin tira pedido de plano" on public.pedidos_de_plano;
create policy "Admin tira pedido de plano" on public.pedidos_de_plano
  for delete using (public.eh_admin());
revoke all on public.pedidos_de_plano from anon, authenticated;
grant select, delete on public.pedidos_de_plano to authenticated;
grant all on public.pedidos_de_plano to service_role;

create or replace function public.ordem_do_plano(p text)
returns int
language sql
immutable
set search_path = ''
as $$
  select case p when 'premium' then 3 when 'completo' then 2 else 1 end;
$$;

-- A conta pede um plano para uma academia dela, ou para a academia nova
-- que ela mandou (ainda em análise, é o pedido da conta).
create or replace function public.pedir_plano(p_academia uuid, p_plano text, p_onde text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_atual text;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta do GuiaTennis Parceiros.' using errcode = '42501';
  end if;
  if p_plano not in ('completo', 'premium') then
    raise exception 'Plano inválido.' using errcode = '22023';
  end if;
  if not (p_academia in (select public.minhas_academias())
          or exists (select 1 from public.academia_acessos
                     where user_id = auth.uid() and pedido_academia_id = p_academia)) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  select coalesce(plano, 'basico') into v_atual from public.academias where id = p_academia;
  if v_atual is null then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if public.ordem_do_plano(v_atual) >= public.ordem_do_plano(p_plano) then
    return;
  end if;
  insert into public.pedidos_de_plano (academia_id, plano, user_id, onde, created_at)
  values (p_academia, p_plano, auth.uid(),
    case when p_onde in ('cadastro', 'edicao', 'painel') then p_onde end, now())
  on conflict (academia_id) do update
    set plano = excluded.plano, user_id = excluded.user_id,
        onde = excluded.onde, created_at = now();
end $$;

-- O admin mudou o plano: o pedido atendido sai da lista.
create or replace function public.pedido_de_plano_atendido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.plano, 'basico') is distinct from coalesce(old.plano, 'basico') then
    delete from public.pedidos_de_plano
      where academia_id = new.id
        and public.ordem_do_plano(plano) <= public.ordem_do_plano(coalesce(new.plano, 'basico'));
  end if;
  return new;
end $$;

drop trigger if exists pedido_de_plano_atendido on public.academias;
create trigger pedido_de_plano_atendido
  after update of plano on public.academias
  for each row execute function public.pedido_de_plano_atendido();

-- A lista do painel do admin, com quem pediu e o WhatsApp para combinar.
create or replace function public.pedidos_de_plano_admin()
returns table (academia_id uuid, nome text, status text, plano_atual text,
  plano text, onde text, created_at timestamptz, pessoa text, email text,
  whatsapp text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.academia_id, a.name, a.status, coalesce(a.plano, 'basico'), p.plano,
    p.onde, p.created_at, x.nome_responsavel, coalesce(x.email, x.usuario),
    x.whatsapp
  from public.pedidos_de_plano p
  join public.academias a on a.id = p.academia_id
  left join public.academia_acessos x on x.user_id = p.user_id
  where public.eh_admin()
  order by p.created_at desc;
$$;

revoke all on function public.pedir_plano(uuid, text, text) from public, anon;
grant execute on function public.pedir_plano(uuid, text, text) to authenticated;
revoke all on function public.pedidos_de_plano_admin() from public, anon;
grant execute on function public.pedidos_de_plano_admin() to authenticated;
revoke all on function public.pedido_de_plano_atendido() from public, anon, authenticated;

notify pgrst, 'reload schema';
