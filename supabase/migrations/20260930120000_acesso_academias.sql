-- ============================================================
-- Acesso das academias (30/09/2026)
-- ============================================================
-- Cada academia ganha um login para editar a própria ficha e responder as
-- avaliações — como o "Google Business Profile", o "Yelp for Business" e
-- o "Management Center" do TripAdvisor. O GuiaTennis cria o usuário e uma
-- senha provisória; no primeiro acesso a academia completa os dados do
-- responsável e troca a senha.
--
-- A academia NÃO pode: apagar avaliação, avaliar a si mesma, mudar status,
-- plano, pausa ou origem da ficha, mexer em outra academia, ler contato de
-- quem avaliou ou de quem pediu cadastro, nem ver os cliques do site.
--
-- Pode rodar de novo sem estragar nada.

-- Senha com o mesmo formato do login do Supabase (bcrypt). No Supabase o
-- pgcrypto já vem no esquema "extensions".
do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'extensions') then
    create schema extensions;
  end if;
  if not exists (select 1 from pg_extension where extname = 'pgcrypto') then
    create extension pgcrypto with schema extensions;
  end if;
end $$;

-- Quem é o admin (o mesmo e-mail das regras antigas).
create or replace function public.eh_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'email') = 'guiatennis1@gmail.com', false);
$$;

-- Tabelas -----------------------------------------------------

-- Um login por linha. O e-mail do login é <usuario>@acesso.guiatennis.com.br
-- (ninguém recebe nada nele); o e-mail de verdade do responsável fica aqui.
create table if not exists public.academia_acessos (
  user_id uuid primary key references auth.users (id) on delete cascade,
  academia_id uuid not null references public.academias (id) on delete cascade,
  usuario text not null unique,
  nome_responsavel text,
  cargo text,
  email text,
  whatsapp text,
  cnpj text,
  recebe_relatorio boolean not null default false,
  termos_aceitos_em timestamptz,
  dados_completos_em timestamptz,
  senha_trocada_em timestamptz,
  ficha_atualizada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists academia_acessos_academia
  on public.academia_acessos (academia_id);

-- Resposta da academia a uma avaliação: uma por avaliação, pública.
create table if not exists public.respostas (
  avaliacao_id uuid primary key
    references public.avaliacoes (id) on delete cascade,
  texto text not null
    check (length(btrim(texto)) between 1 and 2000),
  user_id uuid default auth.uid()
    references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Quem é de qual academia -------------------------------------
-- "security definer" para as regras das outras tabelas perguntarem sem
-- abrir a tabela de acessos para ninguém.

create or replace function public.minhas_academias()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select academia_id from public.academia_acessos
  where user_id = auth.uid();
$$;

create or replace function public.avaliacao_da_minha_academia(p_avaliacao uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.avaliacoes a
    join public.academia_acessos x on x.academia_id = a.academia_id
    where a.id = p_avaliacao and x.user_id = auth.uid()
  );
$$;

-- Regras (RLS) ------------------------------------------------

alter table public.academia_acessos enable row level security;
alter table public.respostas enable row level security;

-- Academias: a academia vê e edita só a própria ficha (mesmo pausada).
drop policy if exists "Academia ve a propria ficha" on public.academias;
create policy "Academia ve a propria ficha" on public.academias
  for select
  using (id in (select public.minhas_academias()));

drop policy if exists "Academia edita a propria ficha" on public.academias;
create policy "Academia edita a propria ficha" on public.academias
  for update
  using (id in (select public.minhas_academias()))
  with check (id in (select public.minhas_academias()));

-- Avaliações: ninguém avalia a própria academia.
drop policy if exists "Enviar avaliacao" on public.avaliacoes;
create policy "Enviar avaliacao" on public.avaliacoes
  for insert
  with check (stars between 1 and 5
              and length(coalesce(comment, '')) <= 2000
              and not (academia_id in (select public.minhas_academias())));

-- Acessos: cada um lê o seu; o admin lê todos. Gravar, só pelas funções.
drop policy if exists "Ver o proprio acesso" on public.academia_acessos;
create policy "Ver o proprio acesso" on public.academia_acessos
  for select
  using (user_id = auth.uid() or public.eh_admin());

-- Respostas: todo mundo lê; a academia escreve nas avaliações dela; o
-- admin pode apagar (moderação).
drop policy if exists "Ver respostas" on public.respostas;
create policy "Ver respostas" on public.respostas
  for select
  using (true);

drop policy if exists "Academia responde" on public.respostas;
create policy "Academia responde" on public.respostas
  for insert
  with check (public.avaliacao_da_minha_academia(avaliacao_id));

drop policy if exists "Academia edita a resposta" on public.respostas;
create policy "Academia edita a resposta" on public.respostas
  for update
  using (public.avaliacao_da_minha_academia(avaliacao_id))
  with check (public.avaliacao_da_minha_academia(avaliacao_id));

drop policy if exists "Apagar resposta" on public.respostas;
create policy "Apagar resposta" on public.respostas
  for delete
  using (public.avaliacao_da_minha_academia(avaliacao_id) or public.eh_admin());

-- A ficha da academia muda só no que é dela ---------------------
-- Status, plano, pausa, origem e quem pediu o cadastro continuam com o
-- GuiaTennis. Salvar a ficha pela conta da academia confirma as
-- informações (sai o aviso de "ficha básica").

create or replace function public.proteger_ficha_da_academia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.eh_admin() then
    return new;
  end if;
  new.id := old.id;
  new.created_at := old.created_at;
  new.status := old.status;
  new.pago := old.pago;
  new.plano := old.plano;
  new.pausada := old.pausada;
  new.pausada_ate := old.pausada_ate;
  new.source := old.source;
  new.nome_solicitante := old.nome_solicitante;
  new.contato_solicitante := old.contato_solicitante;
  new.confirmada := true;
  update public.academia_acessos
    set ficha_atualizada_em = now()
    where user_id = auth.uid() and academia_id = new.id;
  return new;
end $$;

drop trigger if exists proteger_ficha_da_academia on public.academias;
create trigger proteger_ficha_da_academia
  before update on public.academias
  for each row execute function public.proteger_ficha_da_academia();

create or replace function public.resposta_editada()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.avaliacao_id := old.avaliacao_id;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists resposta_editada on public.respostas;
create trigger resposta_editada
  before update on public.respostas
  for each row execute function public.resposta_editada();

-- Apagou o acesso (ou a academia): o login some junto.
create or replace function public.apagar_login_do_acesso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users where id = old.user_id;
  return old;
end $$;

drop trigger if exists apagar_login_do_acesso on public.academia_acessos;
create trigger apagar_login_do_acesso
  after delete on public.academia_acessos
  for each row execute function public.apagar_login_do_acesso();

-- Funções do admin --------------------------------------------

create or replace function public.criar_acesso_academia(
  p_academia uuid, p_usuario text, p_senha text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario text := lower(btrim(coalesce(p_usuario, '')));
  v_email text;
  v_id uuid := gen_random_uuid();
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis cria acesso.' using errcode = '42501';
  end if;
  if v_usuario !~ '^[a-z0-9][a-z0-9._-]{2,39}$' then
    raise exception 'Usuário inválido: use de 3 a 40 letras sem acento, números, ponto ou hífen.'
      using errcode = '22023';
  end if;
  if length(coalesce(p_senha, '')) < 8 then
    raise exception 'A senha precisa ter pelo menos 8 caracteres.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.academias where id = p_academia) then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  v_email := v_usuario || '@acesso.guiatennis.com.br';
  if exists (select 1 from public.academia_acessos where usuario = v_usuario)
     or exists (select 1 from auth.users where email = v_email) then
    raise exception 'Esse usuário já existe. Escolha outro.' using errcode = '23505';
  end if;

  insert into auth.users (instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at, raw_app_meta_data,
    raw_user_meta_data, created_at, updated_at, confirmation_token,
    recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated',
    'authenticated', v_email,
    extensions.crypt(p_senha, extensions.gen_salt('bf', 10)), now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('academia_id', p_academia), now(), now(),
    '', '', '', '');

  insert into auth.identities (provider_id, user_id, identity_data,
    provider, last_sign_in_at, created_at, updated_at)
  values (v_id::text, v_id,
    jsonb_build_object('sub', v_id::text, 'email', v_email,
      'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now());

  insert into public.academia_acessos (user_id, academia_id, usuario)
  values (v_id, p_academia, v_usuario);
  return v_id;
end $$;

-- Senha provisória nova: derruba quem estava conectado e pede para a
-- academia trocar de novo no próximo acesso.
create or replace function public.nova_senha_academia(p_user uuid, p_senha text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis troca a senha de uma academia.' using errcode = '42501';
  end if;
  if length(coalesce(p_senha, '')) < 8 then
    raise exception 'A senha precisa ter pelo menos 8 caracteres.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.academia_acessos where user_id = p_user) then
    raise exception 'Acesso não encontrado.' using errcode = '22023';
  end if;
  update auth.users
    set encrypted_password = extensions.crypt(p_senha, extensions.gen_salt('bf', 10)),
        updated_at = now()
    where id = p_user;
  delete from auth.sessions where user_id = p_user;
  update public.academia_acessos
    set senha_trocada_em = null, updated_at = now()
    where user_id = p_user;
end $$;

create or replace function public.remover_acesso_academia(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis remove um acesso.' using errcode = '42501';
  end if;
  delete from public.academia_acessos where user_id = p_user;
end $$;

-- A lista do painel, com o último acesso de cada login.
create or replace function public.acessos_das_academias()
returns table (
  user_id uuid, academia_id uuid, usuario text, nome_responsavel text,
  cargo text, email text, whatsapp text, cnpj text,
  recebe_relatorio boolean, termos_aceitos_em timestamptz,
  dados_completos_em timestamptz, senha_trocada_em timestamptz,
  ficha_atualizada_em timestamptz, created_at timestamptz,
  ultimo_acesso timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select x.user_id, x.academia_id, x.usuario, x.nome_responsavel, x.cargo,
    x.email, x.whatsapp, x.cnpj, x.recebe_relatorio, x.termos_aceitos_em,
    x.dados_completos_em, x.senha_trocada_em, x.ficha_atualizada_em,
    x.created_at, u.last_sign_in_at
  from public.academia_acessos x
  left join auth.users u on u.id = x.user_id
  where public.eh_admin()
  order by x.created_at;
$$;

-- Contatos que só o admin vê: quem pediu o cadastro e o WhatsApp de quem
-- avaliou. As colunas ficam fechadas para quem está logado (abaixo).
create or replace function public.contatos_privados()
returns table (tabela text, id uuid, nome text, contato text)
language sql
stable
security definer
set search_path = ''
as $$
  select 'academias', a.id, a.nome_solicitante, a.contato_solicitante
  from public.academias a
  where public.eh_admin()
    and (a.nome_solicitante is not null or a.contato_solicitante is not null)
  union all
  select 'avaliacoes', v.id, null, v.contato_autor
  from public.avaliacoes v
  where public.eh_admin() and v.contato_autor is not null;
$$;

-- Funções da academia -----------------------------------------

-- Primeiro acesso (e "Meus dados" depois): dados do responsável e o
-- aceite dos Termos, que fica com a data da primeira vez.
create or replace function public.completar_meu_acesso(
  p_nome text, p_cargo text, p_email text, p_whatsapp text,
  p_cnpj text, p_recebe_relatorio boolean, p_aceite boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_acesso public.academia_acessos;
  v_whats text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
  v_cnpj text := regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g');
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  select * into v_acesso from public.academia_acessos where user_id = auth.uid();
  if not found then
    raise exception 'Acesso não encontrado.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_nome, ''))) < 3 then
    raise exception 'Escreva o nome do responsável.' using errcode = '22023';
  end if;
  if btrim(coalesce(p_cargo, '')) = '' then
    raise exception 'Escolha o cargo.' using errcode = '22023';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;
  if length(v_whats) not between 10 and 13 then
    raise exception 'WhatsApp inválido: use o DDD e o número.' using errcode = '22023';
  end if;
  if v_cnpj <> '' and length(v_cnpj) <> 14 then
    raise exception 'CNPJ inválido: são 14 números.' using errcode = '22023';
  end if;
  if v_acesso.termos_aceitos_em is null and not coalesce(p_aceite, false) then
    raise exception 'Falta aceitar os Termos de Uso e a Política de Privacidade.' using errcode = '22023';
  end if;
  update public.academia_acessos set
    nome_responsavel = btrim(p_nome),
    cargo = btrim(p_cargo),
    email = v_email,
    whatsapp = v_whats,
    cnpj = nullif(v_cnpj, ''),
    recebe_relatorio = coalesce(p_recebe_relatorio, false),
    termos_aceitos_em = coalesce(termos_aceitos_em, now()),
    dados_completos_em = coalesce(dados_completos_em, now()),
    updated_at = now()
  where user_id = auth.uid();
end $$;

-- Chamada depois que a academia troca a senha provisória pelo login.
create or replace function public.marcar_senha_trocada()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.academia_acessos
    set senha_trocada_em = now(), updated_at = now()
    where user_id = auth.uid();
$$;

-- Permissões --------------------------------------------------

-- Quem está logado (admin ou academia) lê as mesmas colunas do visitante:
-- o contato de quem pediu cadastro e de quem avaliou só sai pela função
-- contatos_privados(), que confere se é o admin.
revoke select on public.academias from authenticated;
do $$
declare colunas text;
begin
  select string_agg(quote_ident(column_name), ', ') into colunas
  from information_schema.columns
  where table_schema = 'public' and table_name = 'academias'
    and column_name not in ('nome_solicitante', 'contato_solicitante');
  execute format('grant select (%s) on public.academias to authenticated', colunas);
end $$;

revoke select on public.avaliacoes from authenticated;
do $$
declare colunas text;
begin
  select string_agg(quote_ident(column_name), ', ') into colunas
  from information_schema.columns
  where table_schema = 'public' and table_name = 'avaliacoes'
    and column_name <> 'contato_autor';
  execute format('grant select (%s) on public.avaliacoes to authenticated', colunas);
end $$;

revoke all on public.academia_acessos from anon, authenticated;
grant select on public.academia_acessos to authenticated;

revoke all on public.respostas from anon, authenticated;
grant select (avaliacao_id, texto, created_at, updated_at)
  on public.respostas to anon, authenticated;
grant insert (avaliacao_id, texto), update (texto), delete
  on public.respostas to authenticated;
grant all on public.academia_acessos, public.respostas to service_role;

revoke all on function public.eh_admin() from public;
revoke all on function public.minhas_academias() from public;
revoke all on function public.avaliacao_da_minha_academia(uuid) from public;
grant execute on function public.eh_admin(), public.minhas_academias(),
  public.avaliacao_da_minha_academia(uuid) to anon, authenticated;

-- Funções que só servem logado: o visitante não chama.
revoke all on function public.criar_acesso_academia(uuid, text, text) from public, anon;
revoke all on function public.nova_senha_academia(uuid, text) from public, anon;
revoke all on function public.remover_acesso_academia(uuid) from public, anon;
revoke all on function public.acessos_das_academias() from public, anon;
revoke all on function public.contatos_privados() from public, anon;
revoke all on function public.completar_meu_acesso(text, text, text, text, text, boolean, boolean) from public, anon;
revoke all on function public.marcar_senha_trocada() from public, anon;
grant execute on function public.criar_acesso_academia(uuid, text, text),
  public.nova_senha_academia(uuid, text),
  public.remover_acesso_academia(uuid),
  public.acessos_das_academias(),
  public.contatos_privados(),
  public.completar_meu_acesso(text, text, text, text, text, boolean, boolean),
  public.marcar_senha_trocada()
  to authenticated;

-- As funções de gatilho não são chamadas por ninguém de fora.
revoke all on function public.proteger_ficha_da_academia() from public, anon, authenticated;
revoke all on function public.resposta_editada() from public, anon, authenticated;
revoke all on function public.apagar_login_do_acesso() from public, anon, authenticated;

notify pgrst, 'reload schema';
