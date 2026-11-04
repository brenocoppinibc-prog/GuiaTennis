-- O que o Supabase já traz e o Postgres da máquina não: papéis, o esquema
-- auth (com auth.users, auth.identities, auth.uid(), auth.jwt() e
-- auth.role()) e o pgcrypto em extensions. Roda uma vez, num banco novo,
-- antes do supabase/aplicar.sh (GUIATENNIS-CONTEXTO.md, seção 6).
--
--   D=/var/lib/postgresql/gt; mkdir -p $D/sock && chown -R postgres:postgres $D
--   su postgres -c "/usr/lib/postgresql/16/bin/initdb -D $D/data -A trust -U postgres"
--   su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D $D/data -o '-p 5433 -k $D/sock' -l $D/log start"
--   U=postgresql://postgres@127.0.0.1:5433/postgres
--   psql $U -X -q -v ON_ERROR_STOP=1 -f testes/banco-local-base.sql
--   BANCO_URL=$U bash supabase/aplicar.sh teste
--   (echo "set session_replication_role = replica;"; cat supabase/seed.sql) | psql $U -X -q -v ON_ERROR_STOP=1
--   BANCO_URL=$U python3 testes/banco-emails.py
--
-- Nunca rode isto no banco de verdade nem no de teste do Supabase.

create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create role authenticator login noinherit; create role supabase_auth_admin login;
grant anon, authenticated, service_role to authenticator;
create schema extensions; create extension pgcrypto schema extensions;
create schema auth authorization supabase_auth_admin;
create table auth.users (id uuid primary key, instance_id uuid, email text, aud text, role text, encrypted_password text,
  email_confirmed_at timestamptz, raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}',
  created_at timestamptz default now(), updated_at timestamptz default now(), confirmation_token text default '',
  recovery_token text default '', email_change_token_new text default '', email_change text default '',
  last_sign_in_at timestamptz, is_sso_user boolean default false, deleted_at timestamptz, phone text, banned_until timestamptz);
create table auth.identities (id uuid primary key default gen_random_uuid(), provider_id text, user_id uuid references auth.users on delete cascade,
  identity_data jsonb, provider text, last_sign_in_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now(), email text);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub', '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select auth.jwt()->>'role' $$;
grant usage on schema auth, public, extensions to anon, authenticated, service_role;
grant select on auth.users to service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter database postgres set search_path = public, extensions;
