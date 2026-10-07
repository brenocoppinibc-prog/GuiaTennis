-- ============================================================
-- O código no WhatsApp da academia só em disputa (pedido do Breno em
-- 07/10/2026: "eu quero manter o código em casos de disputa, para novas
-- não", "Academia que já está no guia continua precisando do código: não
-- precisa disso" e "São até 3 por conta em 24 horas: tire isso")
-- ============================================================
-- Como o Google e o Booking: confirmam por código e só pedem documento
-- quando há disputa. Agora:
--
--   academia nova da conta         no ar na hora (com o e-mail confirmado),
--                                  sem o limite de 3 em 24 horas
--   academia que já está no guia   sem responsável: a conta com o e-mail
--                                  confirmado e a declaração passa a
--                                  administrar na hora, e o admin revisa
--                                  depois (Pendências, como a academia nova)
--   academia com responsável       o pedido vai para ele, como antes
--   disputa                        quem pediu contesta ("a academia é minha
--                                  e não conheço quem administra"): o
--                                  GuiaTennis manda o código ao WhatsApp da
--                                  academia; quem digita vira o responsável
--                                  e quem administrava sai. Sem código
--                                  possível, o GuiaTennis pede documento e
--                                  decide (aprovar o pedido em disputa).
--
--   pedidos_de_acesso.destino          + 'disputa'
--   academia_vinculos.telefone_da_ficha   o WhatsApp que a ficha tinha
--                                  quando a conta assumiu sem código: na
--                                  disputa, o código vai para ele, mesmo que
--                                  a ficha tenha mudado de número depois
--   pedir_para_administrar(academia, declaro)  devolve 'assumiu' ou 'pedido'
--   contestar_academia(academia)       o pedido ao responsável vira disputa
--   assumir_academia, vencer_disputa   (internas)
--   confirmar_meu_email                assume os pedidos que esperavam o e-mail
--
-- Pode rodar de novo sem estragar nada.

alter table public.pedidos_de_acesso drop constraint if exists pedidos_de_acesso_destino;
alter table public.pedidos_de_acesso add constraint pedidos_de_acesso_destino
  check (destino is null or destino in ('guiatennis', 'responsavel', 'disputa'));

alter table public.academia_vinculos add column if not exists telefone_da_ficha text;

-- Avisos ao admin --------------------------------------------------------

create or replace function public.aviso_ao_admin(p_chave text, p_tipo text, p_assunto text,
  p_titulo text, p_html text, p_texto text, p_aba text default 'pendencias')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cfg record;
  v_link text := public.site_dos_emails() || '/admin/' || p_aba;
begin
  select * into cfg from public.emails_configuracao where id;
  perform public.por_na_fila(p_chave, p_tipo, coalesce(cfg.admin, 'guiatennis1@gmail.com'), p_assunto,
    public.email_montado(p_titulo, p_html, 'Abrir o painel', v_link, 'Aviso automático do GuiaTennis Parceiros.'),
    p_texto || E'\n\nAbrir o painel: ' || v_link);
exception when others then
  raise warning 'aviso ao admin: %', sqlerrm;
end $$;

create or replace function public.aviso_de_academia_assumida(p_academia uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  x public.academia_acessos;
  v_quem text;
begin
  select * into a from public.academias where id = p_academia;
  select * into x from public.academia_acessos where user_id = p_user;
  v_quem := coalesce(x.nome_responsavel, x.email) || ' (' || coalesce(x.email, x.usuario) || ')';
  perform public.aviso_ao_admin('assumida:' || p_academia || ':' || p_user, 'academia_assumida',
    'Academia assumida: ' || a.name, 'Academia assumida',
    public.email_p('<strong>' || public.html_texto(v_quem) || '</strong> passou a administrar a <strong>'
      || public.html_texto(a.name) || '</strong>, que já estava no guia sem responsável, e declarou estar autorizado(a) pela academia.')
    || public.email_p('Confira no painel do admin, em <strong>Pendências</strong>. Se não for da academia, tire o acesso ou exclua a conta.'),
    v_quem || ' passou a administrar a ' || a.name || ', que já estava no guia sem responsável, e declarou estar autorizado(a) pela academia.');
end $$;

create or replace function public.aviso_de_disputa(p_academia uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  x public.academia_acessos;
  v_quem text;
begin
  select * into a from public.academias where id = p_academia;
  select * into x from public.academia_acessos where user_id = p_user;
  v_quem := coalesce(x.nome_responsavel, x.email) || ' (' || coalesce(x.email, x.usuario) || ')';
  perform public.aviso_ao_admin('disputa:' || p_academia || ':' || p_user || ':' || public.hoje_em_brasilia(), 'disputa',
    'Disputa: ' || a.name, 'Academia em disputa',
    public.email_p('<strong>' || public.html_texto(v_quem) || '</strong> contesta quem administra a <strong>'
      || public.html_texto(a.name) || '</strong> no GuiaTennis Parceiros.')
    || public.email_p('Em <strong>Pendências</strong>, gere o código e mande para o WhatsApp da academia: quem digitar passa a ser o responsável. Sem como mandar o código, peça documento e decida.'),
    v_quem || ' contesta quem administra a ' || a.name || E' no GuiaTennis Parceiros.\n\n'
      || 'Em Pendências, gere o código e mande para o WhatsApp da academia: quem digitar passa a ser o responsável.');
end $$;

-- Assumir e vencer a disputa ------------------------------------------------

-- A conta passa a administrar uma academia que já está no guia, sem
-- responsável e sem código. O admin revisa depois (revisar_desde).
create or replace function public.assumir_academia(p_user uuid, p_academia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_telefone text;
begin
  select phone into v_telefone from public.academias where id = p_academia;
  -- Antes do vínculo: assim a data da ficha não muda (nada mudou nela).
  perform set_config('guiatennis.academia_nova_no_ar', p_academia::text, true);
  update public.academias set revisar_desde = now() where id = p_academia;
  perform set_config('guiatennis.academia_nova_no_ar', '', true);
  perform public.ligar_conta_a_academia(p_user, p_academia, true);
  update public.academia_vinculos
    set declarou_em = coalesce(declarou_em, now()), telefone_da_ficha = v_telefone
    where user_id = p_user and academia_id = p_academia;
  -- Quem mais esperava pela academia agora pede ao responsável.
  update public.pedidos_de_acesso set destino = 'responsavel'
    where academia_id = p_academia and destino = 'guiatennis';
  perform public.aviso_de_academia_assumida(p_academia, p_user);
end $$;

-- Quem venceu a disputa (pelo código ou pelo admin) vira o responsável; quem
-- administrava a academia sai dela (a conta continua).
create or replace function public.vencer_disputa(p_user uuid, p_academia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.academia_vinculos where academia_id = p_academia and user_id <> p_user;
  perform public.ligar_conta_a_academia(p_user, p_academia, true);
  update public.academia_vinculos set papel = 'principal'
    where user_id = p_user and academia_id = p_academia;
  update public.academia_acessos set papel = 'principal'
    where user_id = p_user and academia_id = p_academia;
end $$;

-- Pedir uma academia ---------------------------------------------------------

drop function if exists public.pedir_para_administrar(uuid, boolean);
create or replace function public.pedir_para_administrar(p_academia uuid, p_declaro boolean default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  x public.academia_acessos;
  v_nome text;
begin
  select * into x from public.academia_acessos where user_id = auth.uid();
  if not found then
    raise exception 'Entre na sua conta do GuiaTennis Parceiros.' using errcode = '42501';
  end if;
  if p_declaro is false then
    raise exception 'Marque a declaração para pedir.' using errcode = '22023';
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
  -- Sem responsável, sem disputa: a conta com o e-mail confirmado assume.
  if p_declaro is true and x.email_confirmado_em is not null and x.dados_completos_em is not null
     and not exists (select 1 from public.academia_vinculos
                     where academia_id = p_academia and papel = 'principal') then
    delete from public.pedidos_de_acesso where user_id = auth.uid() and academia_id = p_academia;
    perform public.assumir_academia(auth.uid(), p_academia);
    update public.academia_acessos set updated_at = now() where user_id = auth.uid();
    return 'assumiu';
  end if;
  if (select count(*) from public.pedidos_de_acesso
      where user_id = auth.uid() and academia_id <> p_academia) >= 10 then
    raise exception 'A sua conta já tem 10 pedidos abertos. Espere algum ser confirmado ou cancele um.' using errcode = '22023';
  end if;
  insert into public.pedidos_de_acesso (user_id, academia_id, nome, destino, pedido_em, declarou_em)
  values (auth.uid(), p_academia, v_nome,
    case when exists (select 1 from public.academia_vinculos y
                      where y.academia_id = p_academia and y.papel = 'principal')
         then 'responsavel' else 'guiatennis' end,
    now(), case when p_declaro then now() end)
  on conflict (user_id, academia_id) do update
    set nome = excluded.nome, destino = excluded.destino, pedido_em = now(),
        declarou_em = coalesce(excluded.declarou_em, public.pedidos_de_acesso.declarou_em);
  update public.academia_acessos set updated_at = now() where user_id = auth.uid();
  return 'pedido';
end $$;

revoke all on function public.pedir_para_administrar(uuid, boolean) from public, anon;
grant execute on function public.pedir_para_administrar(uuid, boolean) to authenticated;

-- "A academia é minha e não conheço quem administra": o pedido ao
-- responsável vira disputa, com o GuiaTennis.
create or replace function public.contestar_academia(p_academia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.pedidos_de_acesso
                 where user_id = auth.uid() and academia_id = p_academia and destino = 'responsavel') then
    raise exception 'Peça para administrar a academia antes de contestar.' using errcode = '22023';
  end if;
  update public.pedidos_de_acesso set destino = 'disputa', pedido_em = now()
    where user_id = auth.uid() and academia_id = p_academia;
  perform public.aviso_de_disputa(p_academia, auth.uid());
end $$;

revoke all on function public.contestar_academia(uuid) from public, anon;
grant execute on function public.contestar_academia(uuid) to authenticated;

-- O código: só para academia sem responsável ou em disputa.
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
             where academia_id = v_academia and papel = 'principal')
     and not exists (select 1 from public.pedidos_de_acesso
                     where user_id = p_user and academia_id = v_academia and destino = 'disputa') then
    raise exception 'Essa academia já tem responsável: o pedido está com ele.' using errcode = '22023';
  end if;
  insert into public.codigos_de_verificacao (user_id, academia_id, codigo_hash, criado_em, tentativas)
  values (p_user, v_academia, extensions.crypt(v_codigo, extensions.gen_salt('bf', 8)), now(), 0)
  on conflict (user_id, academia_id) do update
    set codigo_hash = excluded.codigo_hash, criado_em = now(), tentativas = 0;
  return v_codigo;
end $$;

create or replace function public.confirmar_meu_codigo(p_codigo text, p_academia uuid default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.codigos_de_verificacao;
  v_disputa boolean;
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
  v_disputa := exists (select 1 from public.pedidos_de_acesso
                       where user_id = auth.uid() and academia_id = c.academia_id and destino = 'disputa');
  if not v_disputa and exists (select 1 from public.academia_vinculos
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
  if v_disputa then
    perform public.vencer_disputa(auth.uid(), c.academia_id);
  else
    perform public.ligar_conta_a_academia(auth.uid(), c.academia_id, true);
  end if;
  return 'ok';
end $$;

-- O admin aprova: na disputa (decidida por documento), quem pediu vence.
create or replace function public.aprovar_pedido_de_acesso(p_user uuid, p_academia uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia uuid;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis aprova pedidos.' using errcode = '42501';
  end if;
  v_academia := public.pedido_da_conta(p_user, p_academia);
  if exists (select 1 from public.pedidos_de_acesso
             where user_id = p_user and academia_id = v_academia and destino = 'disputa') then
    perform public.vencer_disputa(p_user, v_academia);
  else
    perform public.ligar_conta_a_academia(p_user, v_academia, true);
  end if;
end $$;

-- O responsável não vê nem responde à disputa: ela é do GuiaTennis.
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
    and coalesce(p.destino, '') <> 'disputa'
  order by p.pedido_em;
$$;

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
                 where user_id = p_user and academia_id = v_academia
                   and coalesce(destino, '') <> 'disputa') then
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

-- Admin: os pedidos, com o WhatsApp que a ficha tinha quando o responsável
-- de agora assumiu sem código (na disputa, o código vai para ele).
drop function if exists public.pedidos_de_acesso_admin();
create or replace function public.pedidos_de_acesso_admin()
returns table (user_id uuid, academia_id uuid, nome text, destino text, pedido_em timestamptz,
  codigo_em timestamptz, nome_responsavel text, tratamento text, cargo text, email text,
  usuario text, whatsapp text, telefone_antes text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.academia_id, coalesce(a.name, p.nome), p.destino, p.pedido_em, k.criado_em,
    x.nome_responsavel, x.tratamento, x.cargo, x.email, x.usuario, x.whatsapp,
    (select v.telefone_da_ficha from public.academia_vinculos v
     where v.academia_id = p.academia_id and v.papel = 'principal' and v.telefone_da_ficha is not null
     order by v.created_at limit 1)
  from public.pedidos_de_acesso p
  join public.academia_acessos x on x.user_id = p.user_id
  left join public.academias a on a.id = p.academia_id
  left join public.codigos_de_verificacao k on k.user_id = p.user_id and k.academia_id = p.academia_id
  where public.eh_admin()
  order by p.pedido_em;
$$;
revoke all on function public.pedidos_de_acesso_admin() from public, anon;
grant execute on function public.pedidos_de_acesso_admin() to authenticated;

-- Academia nova da conta: no ar na hora com o e-mail confirmado, sem o
-- limite de 3 em 24 horas (o resto igual ao SQL 20261006140000).
create or replace function public.pedido_da_academia_nova()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  x public.academia_acessos;
begin
  if auth.uid() is null or public.eh_admin() then
    return new;
  end if;
  select * into x from public.academia_acessos where user_id = auth.uid();
  if not found then
    return new;
  end if;
  if new.status = 'pending' and x.email_confirmado_em is not null and x.dados_completos_em is not null then
    perform set_config('guiatennis.academia_nova_no_ar', new.id::text, true);
    update public.academias
      set status = 'published', confirmada = true, revisar_desde = now()
      where id = new.id;
    perform set_config('guiatennis.academia_nova_no_ar', '', true);
    perform public.ligar_conta_a_academia(auth.uid(), new.id, true);
    update public.academia_vinculos set declarou_em = coalesce(declarou_em, now())
      where user_id = auth.uid() and academia_id = new.id;
    perform public.aviso_de_academia_no_ar(new.id, auth.uid());
  else
    insert into public.pedidos_de_acesso (user_id, academia_id, nome, destino, pedido_em, declarou_em)
    values (auth.uid(), new.id, new.name, 'guiatennis', now(), now())
    on conflict (user_id, academia_id) do update
      set nome = excluded.nome, pedido_em = now(), declarou_em = now();
  end if;
  return new;
end $$;

-- Confirmou o e-mail: o que esperava por ele vai em frente sozinho (a
-- academia nova vai ao ar; a do guia sem responsável passa a ser da conta).
create or replace function public.assumir_pedidos_da_conta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  x public.academia_acessos;
  r record;
begin
  select * into x from public.academia_acessos where user_id = auth.uid();
  if not found or x.email_confirmado_em is null or x.dados_completos_em is null then
    return;
  end if;
  for r in select p.academia_id, a.status from public.pedidos_de_acesso p
           join public.academias a on a.id = p.academia_id
           where p.user_id = auth.uid() and p.destino = 'guiatennis' and p.declarou_em is not null
           order by p.pedido_em loop
    if r.status = 'pending' then
      perform set_config('guiatennis.academia_nova_no_ar', r.academia_id::text, true);
      -- Publicar liga quem pediu (gatilho liberar_pedidos_da_academia).
      update public.academias set status = 'published', confirmada = true, revisar_desde = now()
        where id = r.academia_id;
      perform set_config('guiatennis.academia_nova_no_ar', '', true);
      perform public.aviso_de_academia_no_ar(r.academia_id, auth.uid());
    elsif r.status = 'published' and not exists (select 1 from public.academia_vinculos
                                                  where academia_id = r.academia_id and papel = 'principal') then
      perform public.assumir_academia(auth.uid(), r.academia_id);
    end if;
  end loop;
end $$;

create or replace function public.confirmar_meu_email()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta.' using errcode = '42501';
  end if;
  if not coalesce((auth.jwt() -> 'amr') @> '[{"method": "otp"}]'::jsonb, false) then
    raise exception 'Confirme o e-mail pelo código.' using errcode = '42501';
  end if;
  update public.jogadores set email_confirmado_em = coalesce(email_confirmado_em, now())
    where user_id = auth.uid();
  update public.academia_acessos set email_confirmado_em = coalesce(email_confirmado_em, now())
    where user_id = auth.uid();
  perform public.assumir_pedidos_da_conta();
end $$;

revoke all on function public.aviso_ao_admin(text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.aviso_de_academia_assumida(uuid, uuid) from public, anon, authenticated;
revoke all on function public.aviso_de_disputa(uuid, uuid) from public, anon, authenticated;
revoke all on function public.assumir_academia(uuid, uuid) from public, anon, authenticated;
revoke all on function public.vencer_disputa(uuid, uuid) from public, anon, authenticated;
revoke all on function public.assumir_pedidos_da_conta() from public, anon, authenticated;
revoke all on function public.pedido_da_academia_nova() from public, anon, authenticated;

notify pgrst, 'reload schema';
