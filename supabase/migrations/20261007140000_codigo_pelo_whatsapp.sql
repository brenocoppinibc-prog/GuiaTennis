-- ============================================================
-- O código da disputa sai sozinho pelo WhatsApp (pedido do Breno em
-- 07/10/2026: "quero automatizar o código por whatsapp em conflitos de
-- acesso com a academia")
-- ============================================================
-- Como o Google Business Profile, o Uber e o iFood: o código vai pela API
-- oficial do WhatsApp (WhatsApp Business Platform, da Meta), num modelo de
-- autenticação ("123456 é o seu código de verificação.", com o botão
-- "Copiar código"). Nada de programa que imita o WhatsApp no celular: a
-- Meta bane o número e não é permitido.
--
--   contestar_academia(academia)      vira disputa e, com o e-mail
--                                     confirmado, o código sai na hora
--   pedir_codigo_da_disputa(academia) "Mandar outro código" (quem pediu):
--                                     um por hora, até 3 em 3 dias
--   mandar_codigo_admin(user, academia)  o admin manda pelo WhatsApp do
--                                     GuiaTennis (sem limite)
--   confirmar_meu_email               a disputa que esperava o e-mail manda
--                                     o código
--   enviar_whatsapps()                a fila, a cada minuto (pg_net)
--   configurar_whatsapp(...)          para o GitHub: o token vai para o
--                                     cofre (Vault)
--   situacao_do_whatsapp()            para o admin
--
-- Sem o token, sem o número ou sem o pg_net, nada muda: o admin gera o
-- código e manda do WhatsApp dele, como antes. No banco de teste, a
-- mensagem só vai para o número de teste (o WhatsApp das fichas de teste é
-- inventado e pode ser de alguém de verdade); sem ele, não sai nada.
--
-- Pode rodar de novo sem estragar nada.

-- Configuração -----------------------------------------------------------
create table if not exists public.whatsapp_configuracao (
  id boolean primary key default true check (id),
  -- "Identificação do número de telefone" no painel da Meta (não é segredo).
  numero_id text,
  modelo text not null default 'codigo_guiatennis',
  idioma text not null default 'pt_BR',
  versao text not null default 'v23.0',
  -- Só o banco de verdade manda para o WhatsApp das academias.
  real boolean not null default false,
  numero_de_teste text
);
insert into public.whatsapp_configuracao (id) values (true) on conflict (id) do nothing;
alter table public.whatsapp_configuracao enable row level security;
revoke all on table public.whatsapp_configuracao from anon, authenticated;

-- A fila. O corpo leva o código: some assim que a mensagem sai (ou desiste).
create table if not exists public.whatsapp_a_enviar (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'codigo',
  para text not null,
  user_id uuid,
  academia_id uuid,
  origem text not null,
  corpo jsonb,
  criado_em timestamptz not null default now(),
  tentativas int not null default 0,
  pedido_id bigint,
  pedido_em timestamptz,
  enviado_em timestamptz,
  mensagem_id text,
  erro text
);
create index if not exists whatsapp_a_enviar_pendentes
  on public.whatsapp_a_enviar (criado_em) where enviado_em is null;
create index if not exists whatsapp_a_enviar_pedido
  on public.whatsapp_a_enviar (user_id, academia_id, criado_em);
alter table public.whatsapp_a_enviar enable row level security;
revoke all on table public.whatsapp_a_enviar from anon, authenticated;
grant all on table public.whatsapp_a_enviar to service_role;

-- Ajudantes --------------------------------------------------------------

-- (11) 98765-4321 → 5511987654321. Sem DDD ou com número estranho: nada.
create or replace function public.numero_do_whatsapp(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when length(d) in (10, 11) and left(d, 1) <> '0' then '55' || d end
  from (select regexp_replace(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '^55(?=\d{10,11}$)', '') as d) x;
$$;

create or replace function public.token_do_whatsapp()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v text;
begin
  select decrypted_secret into v from vault.decrypted_secrets where name = 'whatsapp_token' limit 1;
  return nullif(btrim(coalesce(v, '')), '');
exception when others then
  return null;
end $$;

-- Está tudo pronto para mandar?
create or replace function public.whatsapp_ligado()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.whatsapp_configuracao;
begin
  select * into c from public.whatsapp_configuracao where id;
  return coalesce(c.numero_id, '') <> ''
    and (c.real or public.numero_do_whatsapp(c.numero_de_teste) is not null)
    and public.token_do_whatsapp() is not null
    and to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is not null;
end $$;

-- Para onde vai o código: na disputa, o WhatsApp que a ficha tinha quando o
-- responsável de agora assumiu sem código; senão, o da ficha.
create or replace function public.whatsapp_do_pedido(p_user uuid, p_academia uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select public.numero_do_whatsapp(coalesce(
    case when exists (select 1 from public.pedidos_de_acesso
                      where user_id = p_user and academia_id = p_academia and destino = 'disputa')
         then (select v.telefone_da_ficha from public.academia_vinculos v
               where v.academia_id = p_academia and v.papel = 'principal' and v.telefone_da_ficha is not null
               order by v.created_at limit 1) end,
    (select phone from public.academias where id = p_academia)));
$$;

-- Sorteia o código e guarda só a versão cifrada (vale 72 horas, como antes).
create or replace function public.novo_codigo(p_user uuid, p_academia uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo text := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000))::text, 6, '0');
begin
  insert into public.codigos_de_verificacao (user_id, academia_id, codigo_hash, criado_em, tentativas)
  values (p_user, p_academia, extensions.crypt(v_codigo, extensions.gen_salt('bf', 8)), now(), 0)
  on conflict (user_id, academia_id) do update
    set codigo_hash = excluded.codigo_hash, criado_em = now(), tentativas = 0;
  return v_codigo;
end $$;

-- Coloca o código na fila e já tenta mandar (o pg_net manda quando a
-- transação termina). Devolve 'mandado', 'sem_whatsapp' ou 'desligado'.
create or replace function public.codigo_pelo_whatsapp(p_user uuid, p_academia uuid, p_origem text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.whatsapp_configuracao;
  v_para text;
  v_codigo text;
begin
  if not public.whatsapp_ligado() then
    return 'desligado';
  end if;
  v_para := public.whatsapp_do_pedido(p_user, p_academia);
  if v_para is null then
    return 'sem_whatsapp';
  end if;
  select * into c from public.whatsapp_configuracao where id;
  if not c.real then
    v_para := public.numero_do_whatsapp(c.numero_de_teste);
  end if;
  v_codigo := public.novo_codigo(p_user, p_academia);
  insert into public.whatsapp_a_enviar (para, user_id, academia_id, origem, corpo)
  values (v_para, p_user, p_academia, p_origem, jsonb_build_object(
    'messaging_product', 'whatsapp',
    'recipient_type', 'individual',
    'to', v_para,
    'type', 'template',
    'template', jsonb_build_object(
      'name', c.modelo,
      'language', jsonb_build_object('code', c.idioma),
      'components', jsonb_build_array(
        jsonb_build_object('type', 'body', 'parameters',
          jsonb_build_array(jsonb_build_object('type', 'text', 'text', v_codigo))),
        jsonb_build_object('type', 'button', 'sub_type', 'url', 'index', '0', 'parameters',
          jsonb_build_array(jsonb_build_object('type', 'text', 'text', v_codigo)))))));
  perform public.enviar_whatsapps();
  return 'mandado';
end $$;

-- A conta que contestou pede o código. Um por hora, até 3 em 3 dias, para
-- ninguém encher o WhatsApp da academia de mensagens.
create or replace function public.codigo_da_disputa_pela_conta(p_user uuid, p_academia uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.pedidos_de_acesso
                 where user_id = p_user and academia_id = p_academia and destino = 'disputa') then
    return 'sem_disputa';
  end if;
  if not exists (select 1 from public.academia_acessos
                 where user_id = p_user and email_confirmado_em is not null) then
    return 'confirme_email';
  end if;
  if not public.whatsapp_ligado() then
    return 'desligado';
  end if;
  if exists (select 1 from public.whatsapp_a_enviar
             where user_id = p_user and academia_id = p_academia and origem <> 'admin'
               and criado_em > now() - interval '1 hour') then
    return 'espere';
  end if;
  if (select count(*) from public.whatsapp_a_enviar
      where user_id = p_user and academia_id = p_academia and origem <> 'admin'
        and criado_em > now() - interval '3 days') >= 3 then
    return 'limite';
  end if;
  return public.codigo_pelo_whatsapp(p_user, p_academia, 'conta');
end $$;

-- "Mandar outro código", no cartão da disputa.
create or replace function public.pedir_codigo_da_disputa(p_academia uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.academia_acessos where user_id = auth.uid()) then
    raise exception 'Entre na sua conta do GuiaTennis Parceiros.' using errcode = '42501';
  end if;
  return public.codigo_da_disputa_pela_conta(auth.uid(), p_academia);
end $$;

-- O admin manda o código pelo WhatsApp do GuiaTennis. As mesmas regras do
-- "Gerar código" (só sem responsável ou em disputa); 'desligado': o painel
-- volta ao jeito antigo (gera e o Breno manda).
create or replace function public.mandar_codigo_admin(p_user uuid, p_academia uuid default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia uuid;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis manda o código.' using errcode = '42501';
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
  return public.codigo_pelo_whatsapp(p_user, v_academia, 'admin');
end $$;

-- O envio ---------------------------------------------------------------
-- Lê o que a Meta respondeu e manda o que está na fila. Erro 4xx (modelo
-- que não existe, token vencido, número inválido) não adianta repetir;
-- 429 e 5xx tentam de novo, até 3 vezes em 2 horas (código atrasado não
-- serve). O que sai ou desiste perde o código guardado no corpo.
create or replace function public.enviar_whatsapps()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.whatsapp_configuracao;
  v_token text;
  v_id bigint;
  v_n int := 0;
  r record;
begin
  if to_regclass('net._http_response') is not null then
    for r in
      select w.id, h.status_code, h.content, h.error_msg, h.timed_out
      from public.whatsapp_a_enviar w
      join net._http_response h on h.id = w.pedido_id
      where w.enviado_em is null and w.pedido_id is not null
    loop
      if r.status_code between 200 and 299 then
        update public.whatsapp_a_enviar
          set enviado_em = now(), erro = null, corpo = null,
              mensagem_id = left(substring(coalesce(r.content, '') from '"id"\s*:\s*"(wamid[^"]+)"'), 200)
          where id = r.id;
      else
        update public.whatsapp_a_enviar
          set pedido_id = null,
              tentativas = case when r.status_code = 429 then tentativas
                                when r.status_code between 400 and 499 then 99
                                else tentativas end,
              erro = left(concat_ws(' ', r.status_code::text,
                       coalesce(substring(coalesce(r.content, '') from '"message"\s*:\s*"([^"]+)"'),
                                r.error_msg, nullif(r.content, ''),
                                case when r.timed_out then 'demorou demais' end)), 300)
          where id = r.id;
      end if;
    end loop;
  end if;
  update public.whatsapp_a_enviar
    set pedido_id = null, erro = coalesce(erro, 'sem resposta da Meta')
    where enviado_em is null and pedido_id is not null and pedido_em < now() - interval '15 minutes';
  update public.whatsapp_a_enviar set corpo = null
    where enviado_em is null and corpo is not null
      and (tentativas >= 3 or criado_em < now() - interval '2 hours');

  v_token := public.token_do_whatsapp();
  select * into c from public.whatsapp_configuracao where id;
  if v_token is null or coalesce(c.numero_id, '') = ''
     or to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then
    return 0;
  end if;

  for r in
    select * from public.whatsapp_a_enviar
    where enviado_em is null and pedido_id is null and corpo is not null and tentativas < 3
    order by criado_em
    limit 5
    for update skip locked
  loop
    select net.http_post(
      url := 'https://graph.facebook.com/' || c.versao || '/' || c.numero_id || '/messages',
      body := r.corpo,
      params := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_token),
      timeout_milliseconds := 10000) into v_id;
    update public.whatsapp_a_enviar
      set pedido_id = v_id, pedido_em = now(), tentativas = tentativas + 1
      where id = r.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- Para o GitHub: o token vai para o cofre; o número, o banco (real ou
-- teste) e o número que recebe no teste, para a configuração. Só o dono do
-- banco roda (o GitHub entra como ele).
create or replace function public.configurar_whatsapp(p_token text, p_numero_id text,
  p_numero_de_teste text default null, p_real boolean default false)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if coalesce(btrim(p_token), '') = '' or coalesce(btrim(p_numero_id), '') = '' then
    return 'sem WhatsApp: o código da disputa continua pelo admin';
  end if;
  select id into v_id from vault.secrets where name = 'whatsapp_token';
  if v_id is null then
    perform vault.create_secret(btrim(p_token), 'whatsapp_token', 'Token da Meta para o código da disputa no WhatsApp do GuiaTennis');
  else
    perform vault.update_secret(v_id, btrim(p_token));
  end if;
  update public.whatsapp_configuracao
    set numero_id = regexp_replace(p_numero_id, '\D', '', 'g'),
        real = coalesce(p_real, false),
        numero_de_teste = public.numero_do_whatsapp(p_numero_de_teste)
    where id;
  if not coalesce(p_real, false) and public.numero_do_whatsapp(p_numero_de_teste) is null then
    return 'token do WhatsApp guardado; banco de teste sem WHATSAPP_NUMERO_DE_TESTE: não manda nada';
  end if;
  return 'token do WhatsApp guardado';
end $$;

-- Para o admin: o WhatsApp está mandando? (painel, junto dos e-mails)
create or replace function public.situacao_do_whatsapp()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.whatsapp_configuracao;
  v_relogio boolean := false;
begin
  if not public.eh_admin() then
    raise exception 'Só o admin.' using errcode = '42501';
  end if;
  select * into c from public.whatsapp_configuracao where id;
  begin
    execute 'select exists (select 1 from cron.job where jobname = ''guiatennis-enviar-whatsapp'' and active)' into v_relogio;
  exception when others then
    v_relogio := false;
  end;
  return jsonb_build_object(
    'ligado', public.whatsapp_ligado(),
    'token', public.token_do_whatsapp() is not null,
    'numero', coalesce(c.numero_id, '') <> '',
    'real', c.real,
    'numero_de_teste', public.numero_do_whatsapp(c.numero_de_teste) is not null,
    'envio', to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is not null,
    'relogio', v_relogio,
    'enviados_30_dias', (select count(*) from public.whatsapp_a_enviar where enviado_em > now() - interval '30 days'),
    'falharam', (select count(*) from public.whatsapp_a_enviar where enviado_em is null and corpo is null),
    'ultimo_erro', (select erro from public.whatsapp_a_enviar where erro is not null and enviado_em is null order by criado_em desc limit 1));
end $$;

-- A disputa -----------------------------------------------------------------

-- O e-mail ao admin diz se o código já saiu sozinho.
drop function if exists public.aviso_de_disputa(uuid, uuid);
create or replace function public.aviso_de_disputa(p_academia uuid, p_user uuid, p_codigo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  x public.academia_acessos;
  v_quem text;
  v_o_que text;
begin
  select * into a from public.academias where id = p_academia;
  select * into x from public.academia_acessos where user_id = p_user;
  v_quem := coalesce(x.nome_responsavel, x.email) || ' (' || coalesce(x.email, x.usuario) || ')';
  v_o_que := case p_codigo
    when 'mandado' then 'O código já saiu sozinho pelo WhatsApp do GuiaTennis para o WhatsApp da academia: quem digitar passa a ser o responsável. Acompanhe em Pendências; sem como usar o código, peça documento e decida.'
    when 'confirme_email' then 'Quem pediu ainda não confirmou o e-mail: confirmado, o código sai sozinho pelo WhatsApp. Acompanhe em Pendências.'
    when 'sem_whatsapp' then 'A ficha não tem WhatsApp para mandar o código. Em Pendências, peça documento e decida.'
    else 'Em Pendências, mande o código para o WhatsApp da academia: quem digitar passa a ser o responsável. Sem como mandar o código, peça documento e decida.' end;
  perform public.aviso_ao_admin('disputa:' || p_academia || ':' || p_user || ':' || public.hoje_em_brasilia(), 'disputa',
    'Disputa: ' || a.name, 'Academia em disputa',
    public.email_p('<strong>' || public.html_texto(v_quem) || '</strong> contesta quem administra a <strong>'
      || public.html_texto(a.name) || '</strong> no GuiaTennis Parceiros.')
    || public.email_p(public.html_texto(v_o_que)),
    v_quem || ' contesta quem administra a ' || a.name || E' no GuiaTennis Parceiros.\n\n' || v_o_que);
end $$;

-- Contestar: vira disputa e, com o e-mail confirmado, o código sai na hora.
-- Devolve o que aconteceu com o código ('mandado', 'confirme_email',
-- 'desligado', 'sem_whatsapp', 'espere' ou 'limite').
drop function if exists public.contestar_academia(uuid);
create or replace function public.contestar_academia(p_academia uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo text;
begin
  if not exists (select 1 from public.pedidos_de_acesso
                 where user_id = auth.uid() and academia_id = p_academia and destino = 'responsavel') then
    raise exception 'Peça para administrar a academia antes de contestar.' using errcode = '22023';
  end if;
  update public.pedidos_de_acesso set destino = 'disputa', pedido_em = now()
    where user_id = auth.uid() and academia_id = p_academia;
  v_codigo := public.codigo_da_disputa_pela_conta(auth.uid(), p_academia);
  perform public.aviso_de_disputa(p_academia, auth.uid(), v_codigo);
  return v_codigo;
end $$;

-- Confirmou o e-mail: o que esperava por ele vai em frente sozinho (como no
-- SQL 20261007130000) e, agora, a disputa manda o código.
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
  for r in select p.academia_id from public.pedidos_de_acesso p
           where p.user_id = auth.uid() and p.destino = 'disputa'
             and not exists (select 1 from public.codigos_de_verificacao k
                             where k.user_id = p.user_id and k.academia_id = p.academia_id) loop
    perform public.codigo_da_disputa_pela_conta(auth.uid(), r.academia_id);
  end loop;
end $$;

-- Admin: os pedidos, agora com a última mensagem do WhatsApp (quando saiu,
-- quem mandou e o erro).
drop function if exists public.pedidos_de_acesso_admin();
create or replace function public.pedidos_de_acesso_admin()
returns table (user_id uuid, academia_id uuid, nome text, destino text, pedido_em timestamptz,
  codigo_em timestamptz, nome_responsavel text, tratamento text, cargo text, email text,
  usuario text, whatsapp text, telefone_antes text,
  whatsapp_em timestamptz, whatsapp_enviado_em timestamptz, whatsapp_origem text, whatsapp_erro text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.academia_id, coalesce(a.name, p.nome), p.destino, p.pedido_em, k.criado_em,
    x.nome_responsavel, x.tratamento, x.cargo, x.email, x.usuario, x.whatsapp,
    (select v.telefone_da_ficha from public.academia_vinculos v
     where v.academia_id = p.academia_id and v.papel = 'principal' and v.telefone_da_ficha is not null
     order by v.created_at limit 1),
    w.criado_em, w.enviado_em, w.origem, w.erro
  from public.pedidos_de_acesso p
  join public.academia_acessos x on x.user_id = p.user_id
  left join public.academias a on a.id = p.academia_id
  left join public.codigos_de_verificacao k on k.user_id = p.user_id and k.academia_id = p.academia_id
  left join lateral (select z.criado_em, z.enviado_em, z.origem, z.erro from public.whatsapp_a_enviar z
                     where z.user_id = p.user_id and z.academia_id = p.academia_id
                     order by z.criado_em desc limit 1) w on true
  where public.eh_admin()
  order by p.pedido_em;
$$;

-- O relógio -------------------------------------------------------------
-- A cada minuto: lê a resposta da Meta e tenta de novo o que falhou. (O
-- código sai na hora, pelo próprio pedido; o relógio só arremata.)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'guiatennis-enviar-whatsapp';
    perform cron.schedule('guiatennis-enviar-whatsapp', '* * * * *', 'select public.enviar_whatsapps()');
  end if;
exception when others then
  raise warning 'código pelo WhatsApp: o relógio não ligou (%). O código sai na hora mesmo assim.', sqlerrm;
end $$;

-- Permissões ------------------------------------------------------------
revoke all on function public.numero_do_whatsapp(text) from public, anon, authenticated;
revoke all on function public.token_do_whatsapp() from public, anon, authenticated;
revoke all on function public.whatsapp_ligado() from public, anon, authenticated;
revoke all on function public.whatsapp_do_pedido(uuid, uuid) from public, anon, authenticated;
revoke all on function public.novo_codigo(uuid, uuid) from public, anon, authenticated;
revoke all on function public.codigo_pelo_whatsapp(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.codigo_da_disputa_pela_conta(uuid, uuid) from public, anon, authenticated;
revoke all on function public.enviar_whatsapps() from public, anon, authenticated;
revoke all on function public.configurar_whatsapp(text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.aviso_de_disputa(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.assumir_pedidos_da_conta() from public, anon, authenticated;
revoke all on function public.pedir_codigo_da_disputa(uuid) from public, anon;
revoke all on function public.mandar_codigo_admin(uuid, uuid) from public, anon;
revoke all on function public.situacao_do_whatsapp() from public, anon;
revoke all on function public.contestar_academia(uuid) from public, anon;
revoke all on function public.pedidos_de_acesso_admin() from public, anon;
grant execute on function public.pedir_codigo_da_disputa(uuid),
  public.mandar_codigo_admin(uuid, uuid),
  public.situacao_do_whatsapp(),
  public.contestar_academia(uuid),
  public.pedidos_de_acesso_admin()
  to authenticated;

notify pgrst, 'reload schema';
