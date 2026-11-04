-- ============================================================
-- Vários pedidos de academia na mesma conta (pedido do Breno em 05/10/2026)
-- ============================================================
-- Como o Google Business Profile (várias empresas "aguardando
-- verificação" ao mesmo tempo) e o Booking (várias propriedades em
-- análise): a conta do GuiaTennis Parceiros pede outra academia mesmo com um
-- pedido ainda aberto. Antes, a conta tinha um pedido só (as colunas
-- pedido_* de academia_acessos); agora cada pedido é uma linha:
--
--   pedidos_de_acesso        um pedido por conta e academia, com o destino
--                            (o GuiaTennis, que confirma pelo código, ou o
--                            responsável principal da academia)
--   codigos_de_verificacao   um código por conta e academia
--
-- As colunas pedido_* de academia_acessos ficam, vazias, para nada quebrar
-- se alguém ainda olhar para elas.
--
-- Pode rodar de novo sem estragar nada.

create table if not exists public.pedidos_de_acesso (
  user_id uuid not null references public.academia_acessos (user_id) on delete cascade,
  academia_id uuid not null references public.academias (id) on delete cascade,
  nome text,
  destino text,
  pedido_em timestamptz not null default now(),
  primary key (user_id, academia_id)
);
create index if not exists pedidos_de_acesso_academia
  on public.pedidos_de_acesso (academia_id);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pedidos_de_acesso_destino') then
    alter table public.pedidos_de_acesso add constraint pedidos_de_acesso_destino
      check (destino is null or destino in ('guiatennis', 'responsavel'));
  end if;
end $$;

-- O pedido que já existia vira a primeira linha (e sai das colunas antigas).
insert into public.pedidos_de_acesso (user_id, academia_id, nome, destino, pedido_em)
select x.user_id, x.pedido_academia_id, x.pedido_nome, x.pedido_destino, coalesce(x.pedido_em, now())
from public.academia_acessos x
join public.academias a on a.id = x.pedido_academia_id
where x.pedido_academia_id is not null
on conflict (user_id, academia_id) do nothing;
update public.academia_acessos
  set pedido_academia_id = null, pedido_nome = null, pedido_em = null, pedido_destino = null
  where pedido_academia_id is not null;

alter table public.pedidos_de_acesso enable row level security;
drop policy if exists "Ver os proprios pedidos" on public.pedidos_de_acesso;
create policy "Ver os proprios pedidos" on public.pedidos_de_acesso
  for select
  using (user_id = auth.uid() or public.eh_admin());
revoke all on public.pedidos_de_acesso from anon, authenticated;
grant select on public.pedidos_de_acesso to authenticated;
grant all on public.pedidos_de_acesso to service_role;

-- Um código por conta e academia (antes, um por conta).
do $$
declare
  v_pk text;
  v_colunas int;
begin
  select c.conname, array_length(c.conkey, 1) into v_pk, v_colunas
  from pg_constraint c
  where c.conrelid = 'public.codigos_de_verificacao'::regclass and c.contype = 'p';
  if v_pk is not null and v_colunas = 1 then
    execute format('alter table public.codigos_de_verificacao drop constraint %I', v_pk);
    alter table public.codigos_de_verificacao
      add constraint codigos_de_verificacao_pkey primary key (user_id, academia_id);
  end if;
end $$;

-- Academia apagada: quem só administrava ela (e não tem pedido de outra)
-- perde o login, como antes.
create or replace function public.contas_da_academia_apagada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.academia_acessos x
  where exists (select 1 from public.academia_vinculos v
                where v.user_id = x.user_id and v.academia_id = old.id)
    and not exists (select 1 from public.academia_vinculos v
                    where v.user_id = x.user_id and v.academia_id <> old.id)
    and not exists (select 1 from public.pedidos_de_acesso p
                    where p.user_id = x.user_id and p.academia_id <> old.id);
  return old;
end $$;

-- Liga a conta a mais uma academia e fecha o pedido dela.
create or replace function public.ligar_conta_a_academia(
  p_user uuid, p_academia uuid, p_abrir boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_papel text;
begin
  insert into public.academia_vinculos (user_id, academia_id, papel)
  values (p_user, p_academia,
    case when exists (select 1 from public.academia_vinculos y
                      where y.academia_id = p_academia and y.papel = 'principal')
         then 'equipe' else 'principal' end)
  on conflict (user_id, academia_id) do nothing;
  select papel into v_papel from public.academia_vinculos
    where user_id = p_user and academia_id = p_academia;
  update public.academia_acessos
    set academia_id = case when p_abrir or academia_id is null then p_academia else academia_id end,
        papel = case when p_abrir or academia_id is null then v_papel else papel end,
        updated_at = now()
    where user_id = p_user;
  delete from public.pedidos_de_acesso where user_id = p_user and academia_id = p_academia;
  delete from public.codigos_de_verificacao where user_id = p_user and academia_id = p_academia;
end $$;

-- Pedir uma academia: soma aos pedidos que a conta já tem. O destino é o
-- responsável (academia com principal) ou o GuiaTennis (academia sem
-- ninguém, que confirma pelo código).
create or replace function public.pedir_para_administrar(p_academia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text;
begin
  if not exists (select 1 from public.academia_acessos where user_id = auth.uid()) then
    raise exception 'Entre na sua conta do GuiaTennis Parceiros.' using errcode = '42501';
  end if;
  if exists (select 1 from public.academia_vinculos
             where user_id = auth.uid() and academia_id = p_academia) then
    raise exception 'A sua conta já administra essa academia.' using errcode = '22023';
  end if;
  select name into v_nome from public.academias
    where id = p_academia and status = 'published';
  if v_nome is null then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if (select count(*) from public.pedidos_de_acesso
      where user_id = auth.uid() and academia_id <> p_academia) >= 10 then
    raise exception 'A sua conta já tem 10 pedidos abertos. Espere algum ser confirmado ou cancele um.' using errcode = '22023';
  end if;
  insert into public.pedidos_de_acesso (user_id, academia_id, nome, destino, pedido_em)
  values (auth.uid(), p_academia, v_nome,
    case when exists (select 1 from public.academia_vinculos y
                      where y.academia_id = p_academia and y.papel = 'principal')
         then 'responsavel' else 'guiatennis' end,
    now())
  on conflict (user_id, academia_id) do update
    set nome = excluded.nome, destino = excluded.destino, pedido_em = now();
  update public.academia_acessos set updated_at = now() where user_id = auth.uid();
end $$;

-- Cancelar um pedido (p_academia) ou todos (sem p_academia, como antes).
drop function if exists public.cancelar_meu_pedido();
create or replace function public.cancelar_meu_pedido(p_academia uuid default null)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.codigos_de_verificacao
    where user_id = auth.uid() and (p_academia is null or academia_id = p_academia)
      and academia_id in (select academia_id from public.pedidos_de_acesso where user_id = auth.uid());
  delete from public.pedidos_de_acesso
    where user_id = auth.uid() and (p_academia is null or academia_id = p_academia);
$$;

-- Academia nova mandada por uma conta: vira um pedido dela (os outros
-- continuam).
create or replace function public.pedido_da_academia_nova()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.eh_admin()
     and exists (select 1 from public.academia_acessos where user_id = auth.uid()) then
    insert into public.pedidos_de_acesso (user_id, academia_id, nome, destino, pedido_em)
    values (auth.uid(), new.id, new.name, 'guiatennis', now())
    on conflict (user_id, academia_id) do update
      set nome = excluded.nome, pedido_em = now();
  end if;
  return new;
end $$;

-- Publicar a academia nova libera quem pediu.
create or replace function public.liberar_pedidos_da_academia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  if new.status = 'published' and coalesce(old.status, '') <> 'published' then
    for r in select user_id from public.pedidos_de_acesso
             where academia_id = new.id
             order by pedido_em loop
      perform public.ligar_conta_a_academia(r.user_id, new.id, true);
    end loop;
  end if;
  return new;
end $$;

-- O pedido certo do admin: o da academia dita, ou o único da conta.
create or replace function public.pedido_da_conta(p_user uuid, p_academia uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_academia uuid;
begin
  if p_academia is not null then
    select academia_id into v_academia from public.pedidos_de_acesso
      where user_id = p_user and academia_id = p_academia;
  elsif (select count(*) from public.pedidos_de_acesso where user_id = p_user) = 1 then
    select academia_id into v_academia from public.pedidos_de_acesso where user_id = p_user;
  end if;
  if v_academia is null then
    raise exception 'Pedido não encontrado.' using errcode = '22023';
  end if;
  return v_academia;
end $$;

drop function if exists public.aprovar_pedido_de_acesso(uuid);
create or replace function public.aprovar_pedido_de_acesso(p_user uuid, p_academia uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis aprova pedidos.' using errcode = '42501';
  end if;
  perform public.ligar_conta_a_academia(p_user, public.pedido_da_conta(p_user, p_academia), true);
end $$;

drop function if exists public.recusar_pedido_de_acesso(uuid);
create or replace function public.recusar_pedido_de_acesso(p_user uuid, p_academia uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia uuid;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis recusa pedidos.' using errcode = '42501';
  end if;
  v_academia := public.pedido_da_conta(p_user, p_academia);
  delete from public.codigos_de_verificacao where user_id = p_user and academia_id = v_academia;
  delete from public.pedidos_de_acesso where user_id = p_user and academia_id = v_academia;
end $$;

-- O código no WhatsApp da ficha é só para academia sem responsável.
drop function if exists public.gerar_codigo_do_pedido(uuid);
create or replace function public.gerar_codigo_do_pedido(p_user uuid, p_academia uuid default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia uuid;
  v_codigo text := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000))::text, 6, '0');
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis gera o código.' using errcode = '42501';
  end if;
  v_academia := public.pedido_da_conta(p_user, p_academia);
  if exists (select 1 from public.academia_vinculos
             where user_id = p_user and academia_id = v_academia) then
    raise exception 'Essa conta já administra essa academia.' using errcode = '22023';
  end if;
  if exists (select 1 from public.academia_vinculos
             where academia_id = v_academia and papel = 'principal') then
    raise exception 'Essa academia já tem responsável: o pedido está com ele.' using errcode = '22023';
  end if;
  insert into public.codigos_de_verificacao (user_id, academia_id, codigo_hash, criado_em, tentativas)
  values (p_user, v_academia, extensions.crypt(v_codigo, extensions.gen_salt('bf', 8)), now(), 0)
  on conflict (user_id, academia_id) do update
    set codigo_hash = excluded.codigo_hash, criado_em = now(), tentativas = 0;
  return v_codigo;
end $$;

-- Digitar o código de um dos pedidos. Sem p_academia (site antigo), vale o
-- código mais novo da conta.
drop function if exists public.confirmar_meu_codigo(text);
create or replace function public.confirmar_meu_codigo(p_codigo text, p_academia uuid default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.codigos_de_verificacao;
  v_codigo text := regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g');
begin
  if not exists (select 1 from public.academia_acessos where user_id = auth.uid()) then
    raise exception 'Entre na sua conta do GuiaTennis Parceiros.' using errcode = '42501';
  end if;
  select k.* into c from public.codigos_de_verificacao k
    join public.pedidos_de_acesso p on p.user_id = k.user_id and p.academia_id = k.academia_id
    where k.user_id = auth.uid() and (p_academia is null or k.academia_id = p_academia)
    order by k.criado_em desc
    limit 1;
  if not found then
    return 'sem_codigo';
  end if;
  if exists (select 1 from public.academia_vinculos
             where academia_id = c.academia_id and papel = 'principal') then
    delete from public.codigos_de_verificacao where user_id = auth.uid() and academia_id = c.academia_id;
    return 'sem_codigo';
  end if;
  if c.criado_em < now() - interval '72 hours' then
    return 'venceu';
  end if;
  if c.tentativas >= 5 then
    return 'tentativas';
  end if;
  if length(v_codigo) <> 6 or extensions.crypt(v_codigo, c.codigo_hash) <> c.codigo_hash then
    update public.codigos_de_verificacao set tentativas = tentativas + 1
      where user_id = auth.uid() and academia_id = c.academia_id;
    return 'errado';
  end if;
  perform public.ligar_conta_a_academia(auth.uid(), c.academia_id, true);
  return 'ok';
end $$;

-- O responsável principal da academia aberta vê quem pediu acesso a ela.
create or replace function public.pedidos_para_minha_academia()
returns table (user_id uuid, nome text, email text, cargo text, pedido_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select x.user_id, x.nome_responsavel, coalesce(x.email, x.usuario), x.cargo, p.pedido_em
  from public.pedidos_de_acesso p
  join public.academia_acessos x on x.user_id = p.user_id
  where p.academia_id = (
          select e.academia_id from public.academia_acessos e
          join public.academia_vinculos m on m.user_id = e.user_id and m.academia_id = e.academia_id
          where e.user_id = auth.uid() and m.papel = 'principal')
    and p.user_id <> auth.uid()
  order by p.pedido_em;
$$;

-- Aceitar (entra na equipe, se o plano couber) ou recusar.
create or replace function public.responder_pedido_de_acesso(p_user uuid, p_aceitar boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia uuid;
  v_papel text;
  v_plano text;
  v_limite int;
begin
  select x.academia_id, m.papel into v_academia, v_papel
    from public.academia_acessos x
    join public.academia_vinculos m on m.user_id = x.user_id and m.academia_id = x.academia_id
    where x.user_id = auth.uid();
  if v_academia is null or v_papel <> 'principal' then
    raise exception 'Só o responsável principal responde aos pedidos.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.pedidos_de_acesso
                 where user_id = p_user and academia_id = v_academia) then
    raise exception 'Pedido não encontrado.' using errcode = '22023';
  end if;
  if not coalesce(p_aceitar, false) then
    delete from public.codigos_de_verificacao where user_id = p_user and academia_id = v_academia;
    delete from public.pedidos_de_acesso where user_id = p_user and academia_id = v_academia;
    return;
  end if;
  select coalesce(plano, 'basico') into v_plano from public.academias where id = v_academia;
  v_limite := public.limite_de_pessoas(v_plano);
  if (select count(*) from public.academia_vinculos where academia_id = v_academia) >= v_limite then
    raise exception 'O seu plano permite até % %. Aprimore o plano para aceitar mais gente.',
      v_limite, case when v_limite = 1 then 'pessoa' else 'pessoas' end
      using errcode = '22023';
  end if;
  perform public.ligar_conta_a_academia(p_user, v_academia, true);
end $$;

-- Tira a pessoa da academia aberta. Quem fica sem academia e sem pedido
-- perde o login, como antes.
create or replace function public.remover_pessoa(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia uuid;
  v_papel text;
  v_ele public.academia_vinculos;
begin
  select x.academia_id, m.papel into v_academia, v_papel
    from public.academia_acessos x
    join public.academia_vinculos m on m.user_id = x.user_id and m.academia_id = x.academia_id
    where x.user_id = auth.uid();
  if v_academia is null or v_papel <> 'principal' then
    raise exception 'Só o responsável principal remove pessoas.' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'Você não pode remover a si mesmo.' using errcode = '22023';
  end if;
  select * into v_ele from public.academia_vinculos
    where user_id = p_user and academia_id = v_academia;
  if not found then
    raise exception 'Pessoa não encontrada.' using errcode = '22023';
  end if;
  if v_ele.papel = 'principal' then
    raise exception 'Outro responsável principal só o GuiaTennis remove.' using errcode = '42501';
  end if;
  delete from public.academia_vinculos where user_id = p_user and academia_id = v_academia;
  delete from public.academia_acessos x
    where x.user_id = p_user
      and not exists (select 1 from public.pedidos_de_acesso where user_id = p_user)
      and not exists (select 1 from public.academia_vinculos where user_id = p_user);
end $$;

-- Pedido de plano: vale também para a academia nova ainda em pedido.
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
          or exists (select 1 from public.pedidos_de_acesso
                     where user_id = auth.uid() and academia_id = p_academia)) then
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

-- Os pedidos da conta logada, com o que a tela precisa (o código já
-- gerado e o WhatsApp da ficha, escondido pela tela).
create or replace function public.meus_pedidos_de_acesso()
returns table (academia_id uuid, nome text, destino text, pedido_em timestamptz,
  status text, codigo_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.academia_id, coalesce(a.name, p.nome), p.destino, p.pedido_em, a.status, k.criado_em
  from public.pedidos_de_acesso p
  left join public.academias a on a.id = p.academia_id
  left join public.codigos_de_verificacao k on k.user_id = p.user_id and k.academia_id = p.academia_id
  where p.user_id = auth.uid()
  order by p.pedido_em;
$$;

-- Admin: um pedido por linha, com os dados de quem pediu.
create or replace function public.pedidos_de_acesso_admin()
returns table (user_id uuid, academia_id uuid, nome text, destino text, pedido_em timestamptz,
  codigo_em timestamptz, nome_responsavel text, tratamento text, cargo text, email text,
  usuario text, whatsapp text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.academia_id, coalesce(a.name, p.nome), p.destino, p.pedido_em, k.criado_em,
    x.nome_responsavel, x.tratamento, x.cargo, x.email, x.usuario, x.whatsapp
  from public.pedidos_de_acesso p
  join public.academia_acessos x on x.user_id = p.user_id
  left join public.academias a on a.id = p.academia_id
  left join public.codigos_de_verificacao k on k.user_id = p.user_id and k.academia_id = p.academia_id
  where public.eh_admin()
  order by p.pedido_em;
$$;

-- A lista do admin (logins): o pedido que aparece em cada linha é o mais
-- novo da conta (a lista completa vem de pedidos_de_acesso_admin).
create or replace function public.acessos_das_academias()
returns table (
  user_id uuid, academia_id uuid, usuario text, nome_responsavel text,
  cargo text, email text, whatsapp text, cnpj text,
  recebe_relatorio boolean, termos_aceitos_em timestamptz,
  dados_completos_em timestamptz, senha_trocada_em timestamptz,
  ficha_atualizada_em timestamptz, created_at timestamptz,
  ultimo_acesso timestamptz, papel text, pedido_academia_id uuid,
  pedido_nome text, pedido_em timestamptz, tratamento text,
  codigo_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select x.user_id, v.academia_id, x.usuario, x.nome_responsavel, x.cargo,
    x.email, x.whatsapp, x.cnpj, x.recebe_relatorio, x.termos_aceitos_em,
    x.dados_completos_em, x.senha_trocada_em,
    case when v.academia_id is null then x.ficha_atualizada_em else v.ficha_atualizada_em end,
    x.created_at, u.last_sign_in_at, coalesce(v.papel, x.papel), p.academia_id,
    p.nome, p.pedido_em, x.tratamento, k.criado_em
  from public.academia_acessos x
  left join public.academia_vinculos v on v.user_id = x.user_id
  left join auth.users u on u.id = x.user_id
  left join lateral (select q.academia_id, q.nome, q.pedido_em from public.pedidos_de_acesso q
                     where q.user_id = x.user_id order by q.pedido_em desc limit 1) p on true
  left join public.codigos_de_verificacao k on k.user_id = x.user_id and k.academia_id = p.academia_id
  where public.eh_admin()
  order by x.created_at, v.created_at;
$$;

-- Permissões ------------------------------------------------------------

revoke all on function public.pedido_da_conta(uuid, uuid) from public, anon, authenticated;
revoke all on function public.cancelar_meu_pedido(uuid) from public, anon;
revoke all on function public.aprovar_pedido_de_acesso(uuid, uuid) from public, anon;
revoke all on function public.recusar_pedido_de_acesso(uuid, uuid) from public, anon;
revoke all on function public.gerar_codigo_do_pedido(uuid, uuid) from public, anon;
revoke all on function public.confirmar_meu_codigo(text, uuid) from public, anon;
revoke all on function public.meus_pedidos_de_acesso() from public, anon;
revoke all on function public.pedidos_de_acesso_admin() from public, anon;
grant execute on function public.cancelar_meu_pedido(uuid),
  public.aprovar_pedido_de_acesso(uuid, uuid),
  public.recusar_pedido_de_acesso(uuid, uuid),
  public.gerar_codigo_do_pedido(uuid, uuid),
  public.confirmar_meu_codigo(text, uuid),
  public.meus_pedidos_de_acesso(),
  public.pedidos_de_acesso_admin()
  to authenticated;

notify pgrst, 'reload schema';
