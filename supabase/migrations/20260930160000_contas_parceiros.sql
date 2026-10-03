-- ============================================================
-- Contas do GuiaTennis Parceiros (30/09/2026)
-- ============================================================
-- Pedido do Breno, no modelo do Booking para Parceiros e do Google
-- Business Profile:
--
--   * O cadastro começa pelo e-mail. Quem não tem conta cria uma (nome,
--     WhatsApp, senha e o aceite dos Termos) e depois pede para administrar
--     uma academia do guia ou cadastra uma nova — sem digitar os dados de
--     novo. O GuiaTennis confere e libera. Publicar a academia nova libera
--     a conta junto.
--   * O responsável principal põe mais pessoas na academia, cada uma com o
--     próprio e-mail. O plano decide quantas: Básico 2, Completo 5,
--     Premium 10.
--   * Conta de academia não avalia academia nenhuma — nem logada, nem
--     digitando o e-mail ou o WhatsApp dela (ou o da academia) na
--     avaliação. Continua respondendo as avaliações da própria.
--   * Quem recebeu usuário do GuiaTennis também entra pelo e-mail que
--     informou no primeiro acesso.
--
-- Pode rodar de novo sem estragar nada.

-- Conta sem academia (ainda), papel e pedido --------------------------

alter table public.academia_acessos alter column academia_id drop not null;
alter table public.academia_acessos
  add column if not exists papel text not null default 'principal';
alter table public.academia_acessos
  add column if not exists pedido_academia_id uuid
    references public.academias (id) on delete set null;
alter table public.academia_acessos add column if not exists pedido_nome text;
alter table public.academia_acessos add column if not exists pedido_em timestamptz;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'academia_acessos_papel') then
    alter table public.academia_acessos
      add constraint academia_acessos_papel check (papel in ('principal', 'equipe'));
  end if;
end $$;

-- Ajudantes -----------------------------------------------------------

-- Conta sem academia devolve nulo aqui: fica de fora das regras.
create or replace function public.minhas_academias()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select academia_id from public.academia_acessos
  where user_id = auth.uid() and academia_id is not null;
$$;

-- Quem está logado tem conta no GuiaTennis Parceiros (com ou sem academia)?
create or replace function public.sou_parceiro()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.academia_acessos where user_id = auth.uid());
$$;

-- Telefone só com os números do Brasil: tira o 55 da frente.
create or replace function public.telefone_normal(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when length(d) in (12, 13) and left(d, 2) = '55' then substr(d, 3) else d end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) s;
$$;

create or replace function public.limite_de_pessoas(p_plano text)
returns int
language sql
immutable
set search_path = ''
as $$
  select case p_plano when 'premium' then 10 when 'completo' then 5 else 2 end;
$$;

-- Cria o login no mesmo formato do Supabase (igual a criar_acesso_academia).
create or replace function public.criar_login(p_email text, p_senha text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at, raw_app_meta_data,
    raw_user_meta_data, created_at, updated_at, confirmation_token,
    recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated',
    'authenticated', p_email,
    extensions.crypt(p_senha, extensions.gen_salt('bf', 10)), now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{}'::jsonb, now(), now(), '', '', '', '');
  insert into auth.identities (provider_id, user_id, identity_data,
    provider, last_sign_in_at, created_at, updated_at)
  values (v_id::text, v_id,
    jsonb_build_object('sub', v_id::text, 'email', p_email,
      'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now());
  return v_id;
end $$;

-- E-mail -> login ---------------------------------------------------

-- Tem conta com esse e-mail? Devolve o e-mail de entrar (o do login) ou
-- nada. Serve ao "Continuar" do cadastro e ao login pelo e-mail do
-- responsável, para quem recebeu usuário do GuiaTennis.
create or replace function public.login_do_email(p_email text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email
  from public.academia_acessos x
  join auth.users u on u.id = x.user_id
  where btrim(coalesce(p_email, '')) like '%@%'
    and (lower(u.email) = lower(btrim(p_email)) or lower(x.email) = lower(btrim(p_email)))
  order by (lower(u.email) = lower(btrim(p_email))) desc, x.created_at
  limit 1;
$$;

-- Conta nova, feita pela própria academia ---------------------------

create or replace function public.criar_minha_conta(
  p_email text, p_senha text, p_nome text, p_whatsapp text, p_aceite boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_whats text := public.telefone_normal(p_whatsapp);
  v_id uuid;
begin
  if auth.uid() is not null then
    raise exception 'Saia da conta atual para criar outra.' using errcode = '22023';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or v_email like '%@acesso.guiatennis.com.br' then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_nome, ''))) < 3 then
    raise exception 'Escreva o seu nome.' using errcode = '22023';
  end if;
  if length(v_whats) not between 10 and 11 then
    raise exception 'WhatsApp inválido: use o DDD e o número.' using errcode = '22023';
  end if;
  if length(coalesce(p_senha, '')) < 8 then
    raise exception 'A senha precisa ter pelo menos 8 caracteres.' using errcode = '22023';
  end if;
  if not coalesce(p_aceite, false) then
    raise exception 'Falta aceitar os Termos de Uso e a Política de Privacidade.' using errcode = '22023';
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email)
     or exists (select 1 from public.academia_acessos where lower(email) = v_email or usuario = v_email) then
    raise exception 'Esse e-mail já tem conta no GuiaTennis Parceiros. Entre com a sua senha.'
      using errcode = '23505';
  end if;
  -- Freio contra robô: muitas contas novas na mesma hora esperam um pouco.
  if (select count(*) from public.academia_acessos
      where academia_id is null and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Muitos cadastros agora. Tente de novo em alguns minutos.' using errcode = '54000';
  end if;

  v_id := public.criar_login(v_email, p_senha);
  insert into public.academia_acessos (user_id, academia_id, usuario,
    nome_responsavel, email, whatsapp, termos_aceitos_em, dados_completos_em,
    senha_trocada_em, papel)
  values (v_id, null, v_email, btrim(p_nome), v_email, v_whats, now(), now(),
    now(), 'principal');
end $$;

-- Pedido para administrar uma academia do guia --------------------------

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
  if v.academia_id is not null then
    raise exception 'A sua conta já administra uma academia.' using errcode = '22023';
  end if;
  select name into v_nome from public.academias
    where id = p_academia and status = 'published';
  if v_nome is null then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  update public.academia_acessos
    set pedido_academia_id = p_academia, pedido_nome = v_nome,
        pedido_em = now(), updated_at = now()
    where user_id = auth.uid();
end $$;

create or replace function public.cancelar_meu_pedido()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.academia_acessos
    set pedido_academia_id = null, pedido_nome = null, pedido_em = null, updated_at = now()
    where user_id = auth.uid() and academia_id is null;
$$;

-- Academia nova mandada por uma conta sem academia: vira o pedido dela.
create or replace function public.pedido_da_academia_nova()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.eh_admin() then
    update public.academia_acessos
      set pedido_academia_id = new.id, pedido_nome = new.name,
          pedido_em = now(), updated_at = now()
      where user_id = auth.uid() and academia_id is null;
  end if;
  return new;
end $$;

drop trigger if exists pedido_da_academia_nova on public.academias;
create trigger pedido_da_academia_nova
  after insert on public.academias
  for each row execute function public.pedido_da_academia_nova();

-- Liga a conta à academia: principal se a academia ainda não tem um.
create or replace function public.ligar_conta_a_academia(p_user uuid, p_academia uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.academia_acessos
    set academia_id = p_academia,
        papel = case when exists (select 1 from public.academia_acessos y
                                  where y.academia_id = p_academia and y.papel = 'principal')
                     then 'equipe' else 'principal' end,
        pedido_academia_id = null, pedido_nome = null, pedido_em = null,
        updated_at = now()
    where user_id = p_user and academia_id is null;
$$;

-- O admin publicou a academia nova: quem mandou passa a administrar.
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
    for r in select user_id from public.academia_acessos
             where pedido_academia_id = new.id and academia_id is null
             order by pedido_em loop
      perform public.ligar_conta_a_academia(r.user_id, new.id);
    end loop;
  end if;
  return new;
end $$;

drop trigger if exists liberar_pedidos_da_academia on public.academias;
create trigger liberar_pedidos_da_academia
  after update on public.academias
  for each row execute function public.liberar_pedidos_da_academia();

create or replace function public.aprovar_pedido_de_acesso(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.academia_acessos;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis aprova pedidos.' using errcode = '42501';
  end if;
  select * into v from public.academia_acessos where user_id = p_user;
  if not found or v.pedido_academia_id is null then
    raise exception 'Pedido não encontrado.' using errcode = '22023';
  end if;
  if v.academia_id is not null then
    raise exception 'Essa conta já administra uma academia.' using errcode = '22023';
  end if;
  perform public.ligar_conta_a_academia(p_user, v.pedido_academia_id);
end $$;

create or replace function public.recusar_pedido_de_acesso(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis recusa pedidos.' using errcode = '42501';
  end if;
  update public.academia_acessos
    set pedido_academia_id = null, pedido_nome = null, pedido_em = null, updated_at = now()
    where user_id = p_user;
end $$;

-- Pessoas da academia ---------------------------------------------------

create or replace function public.pessoas_da_minha_academia()
returns table (user_id uuid, nome text, email text, papel text,
  dados_completos_em timestamptz, ultimo_acesso timestamptz, sou_eu boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select x.user_id, x.nome_responsavel, coalesce(x.email, x.usuario), x.papel,
    x.dados_completos_em, u.last_sign_in_at, x.user_id = auth.uid()
  from public.academia_acessos x
  left join auth.users u on u.id = x.user_id
  where x.academia_id is not null
    and x.academia_id = (select academia_id from public.academia_acessos where user_id = auth.uid())
  order by (x.papel = 'principal') desc, x.created_at;
$$;

-- O responsável principal põe mais uma pessoa. Conta que já existe (sem
-- academia) entra na academia; e-mail novo ganha login com a senha
-- provisória que a tela gerou, para o responsável mandar à pessoa.
create or replace function public.adicionar_pessoa(p_email text, p_nome text, p_senha text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu public.academia_acessos;
  v_outro public.academia_acessos;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_plano text;
  v_limite int;
  v_id uuid;
begin
  select * into v_eu from public.academia_acessos where user_id = auth.uid();
  if not found or v_eu.academia_id is null then
    raise exception 'A sua conta ainda não administra uma academia.' using errcode = '42501';
  end if;
  if v_eu.papel <> 'principal' then
    raise exception 'Só o responsável principal adiciona pessoas.' using errcode = '42501';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or v_email like '%@acesso.guiatennis.com.br' then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;
  select coalesce(plano, 'basico') into v_plano from public.academias where id = v_eu.academia_id;
  v_limite := public.limite_de_pessoas(v_plano);
  if (select count(*) from public.academia_acessos where academia_id = v_eu.academia_id) >= v_limite then
    raise exception 'O seu plano permite até % pessoas. Aprimore o plano para adicionar mais.', v_limite
      using errcode = '22023';
  end if;

  select x.* into v_outro
    from public.academia_acessos x join auth.users u on u.id = x.user_id
    where lower(u.email) = v_email or lower(x.email) = v_email
    limit 1;
  if found then
    if v_outro.academia_id is not null then
      raise exception 'Esse e-mail já tem acesso a uma academia no GuiaTennis Parceiros.' using errcode = '23505';
    end if;
    -- Quem pediu outra academia não é puxado para esta.
    if v_outro.pedido_academia_id is not null and v_outro.pedido_academia_id <> v_eu.academia_id then
      raise exception 'Essa pessoa já pediu para administrar outra academia.' using errcode = '23505';
    end if;
    perform public.ligar_conta_a_academia(v_outro.user_id, v_eu.academia_id);
    return 'ligada';
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'Esse e-mail não pode ser usado.' using errcode = '23505';
  end if;
  if length(coalesce(p_senha, '')) < 8 then
    raise exception 'A senha precisa ter pelo menos 8 caracteres.' using errcode = '22023';
  end if;

  v_id := public.criar_login(v_email, p_senha);
  insert into public.academia_acessos (user_id, academia_id, usuario, nome_responsavel, email, papel)
  values (v_id, v_eu.academia_id, v_email, nullif(btrim(coalesce(p_nome, '')), ''), v_email, 'equipe');
  return 'criada';
end $$;

create or replace function public.remover_pessoa(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu public.academia_acessos;
  v_ele public.academia_acessos;
begin
  select * into v_eu from public.academia_acessos where user_id = auth.uid();
  if not found or v_eu.academia_id is null or v_eu.papel <> 'principal' then
    raise exception 'Só o responsável principal remove pessoas.' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'Você não pode remover a si mesmo.' using errcode = '22023';
  end if;
  select * into v_ele from public.academia_acessos
    where user_id = p_user and academia_id = v_eu.academia_id;
  if not found then
    raise exception 'Pessoa não encontrada.' using errcode = '22023';
  end if;
  if v_ele.papel = 'principal' then
    raise exception 'Outro responsável principal só o GuiaTennis remove.' using errcode = '42501';
  end if;
  delete from public.academia_acessos where user_id = p_user;
end $$;

-- A lista do admin ganha o papel e os pedidos (o tipo de retorno mudou:
-- por isso o drop).
drop function if exists public.acessos_das_academias();
create function public.acessos_das_academias()
returns table (
  user_id uuid, academia_id uuid, usuario text, nome_responsavel text,
  cargo text, email text, whatsapp text, cnpj text,
  recebe_relatorio boolean, termos_aceitos_em timestamptz,
  dados_completos_em timestamptz, senha_trocada_em timestamptz,
  ficha_atualizada_em timestamptz, created_at timestamptz,
  ultimo_acesso timestamptz, papel text, pedido_academia_id uuid,
  pedido_nome text, pedido_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select x.user_id, x.academia_id, x.usuario, x.nome_responsavel, x.cargo,
    x.email, x.whatsapp, x.cnpj, x.recebe_relatorio, x.termos_aceitos_em,
    x.dados_completos_em, x.senha_trocada_em, x.ficha_atualizada_em,
    x.created_at, u.last_sign_in_at, x.papel, x.pedido_academia_id,
    x.pedido_nome, x.pedido_em
  from public.academia_acessos x
  left join auth.users u on u.id = x.user_id
  where public.eh_admin()
  order by x.created_at;
$$;

-- Avaliação: conta de academia não avalia ---------------------------------

drop policy if exists "Enviar avaliacao" on public.avaliacoes;
create policy "Enviar avaliacao" on public.avaliacoes
  for insert
  with check (stars between 1 and 5
              and length(coalesce(comment, '')) <= 2000
              and not public.sou_parceiro());

-- A regra acima barra quem está logado; o gatilho barra também o visitante
-- que digita o e-mail ou o WhatsApp de uma conta de academia (ou o
-- WhatsApp de uma academia) — com a mensagem que a tela mostra.
create or replace function public.avaliacao_de_parceiro()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contato text := lower(btrim(coalesce(new.contato_autor, '')));
  v_tel text := public.telefone_normal(new.contato_autor);
begin
  if public.eh_admin() then
    return new;
  end if;
  if public.sou_parceiro() then
    raise exception 'Contas do GuiaTennis Parceiros não avaliam academias.' using errcode = '42501';
  end if;
  if v_contato <> '' and (
       exists (select 1 from public.academia_acessos x
               left join auth.users u on u.id = x.user_id
               where lower(x.email) = v_contato or lower(u.email) = v_contato
                  or (length(v_tel) >= 10 and public.telefone_normal(x.whatsapp) = v_tel))
    or (length(v_tel) >= 10 and exists (select 1 from public.academias a
               where public.telefone_normal(a.phone) = v_tel))) then
    raise exception 'Esse contato é de uma academia do GuiaTennis, e academias não avaliam academias.'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists avaliacao_de_parceiro on public.avaliacoes;
create trigger avaliacao_de_parceiro
  before insert on public.avaliacoes
  for each row execute function public.avaliacao_de_parceiro();

-- Permissões ------------------------------------------------------------

revoke all on function public.sou_parceiro() from public;
grant execute on function public.sou_parceiro(), public.minhas_academias() to anon, authenticated;

revoke all on function public.login_do_email(text) from public;
revoke all on function public.criar_minha_conta(text, text, text, text, boolean) from public;
grant execute on function public.login_do_email(text),
  public.criar_minha_conta(text, text, text, text, boolean)
  to anon, authenticated;

revoke all on function public.pedir_para_administrar(uuid) from public, anon;
revoke all on function public.cancelar_meu_pedido() from public, anon;
revoke all on function public.aprovar_pedido_de_acesso(uuid) from public, anon;
revoke all on function public.recusar_pedido_de_acesso(uuid) from public, anon;
revoke all on function public.pessoas_da_minha_academia() from public, anon;
revoke all on function public.adicionar_pessoa(text, text, text) from public, anon;
revoke all on function public.remover_pessoa(uuid) from public, anon;
revoke all on function public.acessos_das_academias() from public, anon;
grant execute on function public.pedir_para_administrar(uuid),
  public.cancelar_meu_pedido(),
  public.aprovar_pedido_de_acesso(uuid),
  public.recusar_pedido_de_acesso(uuid),
  public.pessoas_da_minha_academia(),
  public.adicionar_pessoa(text, text, text),
  public.remover_pessoa(uuid),
  public.acessos_das_academias()
  to authenticated;

-- Só servem por dentro das outras funções e dos gatilhos.
revoke all on function public.criar_login(text, text) from public, anon, authenticated;
revoke all on function public.ligar_conta_a_academia(uuid, uuid) from public, anon, authenticated;
revoke all on function public.pedido_da_academia_nova() from public, anon, authenticated;
revoke all on function public.liberar_pedidos_da_academia() from public, anon, authenticated;
revoke all on function public.avaliacao_de_parceiro() from public, anon, authenticated;

notify pgrst, 'reload schema';
