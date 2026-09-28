-- ============================================================
-- GuiaTennis — segurança do banco (rodar uma vez no SQL Editor)
-- ============================================================
-- 1. O visitante deixa de ler quem pediu o cadastro da academia e o
--    WhatsApp de quem avaliou. O admin continua vendo tudo.
-- 2. Os envios abertos (avaliação, clique, cadastro) passam a aceitar só
--    o que o site manda de verdade — resolve os avisos
--    "RLS Policy Always True" do Security Advisor.
-- Pode rodar de novo sem problema.

-- Colunas que o site lê. Se alguma já existe, nada muda.
alter table academias add column if not exists plano text not null default 'basico';
alter table academias add column if not exists pago boolean not null default false;
alter table academias add column if not exists pausada boolean not null default false;
alter table academias add column if not exists pausada_ate timestamptz;
alter table academias add column if not exists politica jsonb not null default '{}'::jsonb;
alter table academias add column if not exists acesso jsonb not null default '{}'::jsonb;
alter table academias add column if not exists horario jsonb not null default '{}'::jsonb;

-- 1. Visitante lê todas as colunas, menos as de contato.
revoke select on public.academias from anon;
do $$
declare colunas text;
begin
  select string_agg(quote_ident(column_name), ', ') into colunas
  from information_schema.columns
  where table_schema = 'public' and table_name = 'academias'
    and column_name not in ('nome_solicitante', 'contato_solicitante');
  execute format('grant select (%s) on public.academias to anon', colunas);
end $$;

revoke select on public.avaliacoes from anon;
do $$
declare colunas text;
begin
  select string_agg(quote_ident(column_name), ', ') into colunas
  from information_schema.columns
  where table_schema = 'public' and table_name = 'avaliacoes'
    and column_name <> 'contato_autor';
  execute format('grant select (%s) on public.avaliacoes to anon', colunas);
end $$;

-- 2. Envios só com o que o site manda.
drop policy if exists "Enviar avaliacao" on public.avaliacoes;
create policy "Enviar avaliacao" on public.avaliacoes
  for insert
  with check (stars between 1 and 5 and length(coalesce(comment, '')) <= 2000);

drop policy if exists "Registrar clique" on public.cliques;
create policy "Registrar clique" on public.cliques
  for insert
  with check (tipo in ('acesso_site', 'busca', 'visualizacao', 'whatsapp', 'site', 'instagram', 'compartilhar'));

drop policy if exists "Enviar academia para analise" on public.academias;
create policy "Enviar academia para analise" on public.academias
  for insert
  with check (status = 'pending' and coalesce(pago, false) = false and coalesce(plano, 'basico') = 'basico');

-- Conferir: deve dar erro de permissão (o visitante não lê o contato).
-- set role anon; select contato_autor from avaliacoes limit 1; reset role;
