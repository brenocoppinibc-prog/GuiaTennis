-- ============================================================
-- Pedido de acesso vai para o responsável (pedido do Breno em 03/10/2026)
-- ============================================================
-- Como o "Solicitar acesso" do Google Business Profile: quem pede para
-- administrar uma academia que já tem responsável principal no GuiaTennis
-- Parceiros não entra pelo código no WhatsApp da ficha. O pedido vai para o
-- responsável, que aceita (a pessoa entra na equipe, se o plano couber) ou
-- recusa. O responsável também continua podendo incluir a pessoa diretamente, pelo
-- e-mail (adicionar_pessoa). O GuiaTennis ainda aprova à mão nos casos
-- difíceis (o responsável saiu da academia, por exemplo).
--
-- Pode rodar de novo sem estragar nada.

alter table public.academia_acessos add column if not exists pedido_destino text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'academia_acessos_pedido_destino') then
    alter table public.academia_acessos add constraint academia_acessos_pedido_destino
      check (pedido_destino is null or pedido_destino in ('guiatennis', 'responsavel'));
  end if;
end $$;

-- O pedido anota para quem foi: o responsável (academia com principal) ou o
-- GuiaTennis (academia sem ninguém, que confirma pelo código).
create or replace function public.pedir_para_administrar(p_academia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.academia_acessos;
  v_nome text;
begin
  select * into v from public.academia_acessos where user_id = auth.uid();
  if not found then
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
  update public.academia_acessos
    set pedido_academia_id = p_academia, pedido_nome = v_nome, pedido_em = now(),
        pedido_destino = case when exists (select 1 from public.academia_vinculos y
                                           where y.academia_id = p_academia and y.papel = 'principal')
                              then 'responsavel' else 'guiatennis' end,
        updated_at = now()
    where user_id = auth.uid();
end $$;

-- O código no WhatsApp da ficha é só para academia sem responsável.
create or replace function public.gerar_codigo_do_pedido(p_user uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.academia_acessos;
  v_codigo text := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000))::text, 6, '0');
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis gera o código.' using errcode = '42501';
  end if;
  select * into v from public.academia_acessos where user_id = p_user;
  if not found or v.pedido_academia_id is null then
    raise exception 'Pedido não encontrado.' using errcode = '22023';
  end if;
  if exists (select 1 from public.academia_vinculos
             where user_id = p_user and academia_id = v.pedido_academia_id) then
    raise exception 'Essa conta já administra essa academia.' using errcode = '22023';
  end if;
  if exists (select 1 from public.academia_vinculos
             where academia_id = v.pedido_academia_id and papel = 'principal') then
    raise exception 'Essa academia já tem responsável: o pedido está com ele.' using errcode = '22023';
  end if;
  insert into public.codigos_de_verificacao (user_id, academia_id, codigo_hash, criado_em, tentativas)
  values (p_user, v.pedido_academia_id, extensions.crypt(v_codigo, extensions.gen_salt('bf', 8)), now(), 0)
  on conflict (user_id) do update
    set academia_id = excluded.academia_id, codigo_hash = excluded.codigo_hash,
        criado_em = now(), tentativas = 0;
  return v_codigo;
end $$;

-- O código antigo (gerado antes de a academia ter responsável) não vale mais.
create or replace function public.confirmar_meu_codigo(p_codigo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.academia_acessos;
  c public.codigos_de_verificacao;
  v_codigo text := regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g');
begin
  select * into v from public.academia_acessos where user_id = auth.uid();
  if not found then
    raise exception 'Entre na sua conta do GuiaTennis Parceiros.' using errcode = '42501';
  end if;
  select * into c from public.codigos_de_verificacao where user_id = auth.uid();
  if not found or v.pedido_academia_id is distinct from c.academia_id then
    return 'sem_codigo';
  end if;
  if exists (select 1 from public.academia_vinculos
             where academia_id = c.academia_id and papel = 'principal') then
    delete from public.codigos_de_verificacao where user_id = auth.uid();
    return 'sem_codigo';
  end if;
  if c.criado_em < now() - interval '72 hours' then
    return 'venceu';
  end if;
  if c.tentativas >= 5 then
    return 'tentativas';
  end if;
  if length(v_codigo) <> 6 or extensions.crypt(v_codigo, c.codigo_hash) <> c.codigo_hash then
    update public.codigos_de_verificacao set tentativas = tentativas + 1 where user_id = auth.uid();
    return 'errado';
  end if;
  perform public.ligar_conta_a_academia(auth.uid(), c.academia_id, true);
  delete from public.codigos_de_verificacao where user_id = auth.uid();
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
  select x.user_id, x.nome_responsavel, coalesce(x.email, x.usuario), x.cargo, x.pedido_em
  from public.academia_acessos x
  where x.pedido_academia_id = (
          select e.academia_id from public.academia_acessos e
          join public.academia_vinculos m on m.user_id = e.user_id and m.academia_id = e.academia_id
          where e.user_id = auth.uid() and m.papel = 'principal')
    and x.user_id <> auth.uid()
  order by x.pedido_em;
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
  if not exists (select 1 from public.academia_acessos
                 where user_id = p_user and pedido_academia_id = v_academia) then
    raise exception 'Pedido não encontrado.' using errcode = '22023';
  end if;
  if not coalesce(p_aceitar, false) then
    update public.academia_acessos
      set pedido_academia_id = null, pedido_nome = null, pedido_em = null,
          pedido_destino = null, updated_at = now()
      where user_id = p_user;
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

revoke all on function public.pedidos_para_minha_academia() from public, anon;
revoke all on function public.responder_pedido_de_acesso(uuid, boolean) from public, anon;
grant execute on function public.pedidos_para_minha_academia(),
  public.responder_pedido_de_acesso(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
