-- ============================================================
-- GuiaTennis — estrutura do banco, igual à do banco de verdade
-- ============================================================
-- Copiada do retrato do banco de verdade (SQL-RETRATO.sql, 28/09/2026):
-- mesmas colunas, travas, regras (RLS), permissões e função. Serve para
-- montar o banco de teste igual ao de verdade.
--
-- Pode rodar de novo, e até no banco de verdade, sem mudar nada: tabela
-- que já existe fica como está, e regra, permissão e função são
-- recriadas iguais.

-- Tabelas -----------------------------------------------------

create table if not exists public.academias (
  id uuid not null default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  name text not null,
  address text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  endereco text,
  lat double precision,
  lng double precision,
  phone text,
  instagram text,
  site text,
  price_range text,
  price_aula text,
  price_locacao text,
  amenities jsonb default '[]'::jsonb,
  modalidades jsonb default '[]'::jsonb,
  pisos jsonb default '[]'::jsonb,
  cobertura jsonb default '[]'::jsonb,
  quadras jsonb default '{}'::jsonb,
  photos jsonb default '[]'::jsonb,
  source text default 'custom',
  status text default 'pending',
  pago boolean default false,
  plano text not null default 'basico',
  politica jsonb not null default '{}'::jsonb,
  acesso jsonb not null default '{}'::jsonb,
  horario jsonb not null default '{}'::jsonb,
  pausada boolean default false,
  pausada_ate timestamptz,
  nome_solicitante text,
  contato_solicitante text
);

create table if not exists public.avaliacoes (
  id uuid not null default gen_random_uuid() primary key,
  academia_id uuid references public.academias(id) on delete cascade,
  stars integer not null check (stars >= 1 and stars <= 5),
  comment text,
  nome_autor text,
  contato_autor text,
  created_at timestamptz default now()
);

-- Tipo novo de clique precisa entrar nesta trava e na regra "Registrar
-- clique" lá embaixo — senão o banco recusa em silêncio.
create table if not exists public.cliques (
  id uuid not null default gen_random_uuid() primary key,
  academia_id uuid references public.academias(id) on delete cascade,
  tipo text not null,
  detalhe text,
  cep text,
  lat numeric,
  lng numeric,
  origem text,
  dispositivo text,
  created_at timestamptz default now(),
  constraint cliques_tipo_valido
    check (tipo in ('acesso_site', 'busca', 'visualizacao', 'whatsapp', 'site', 'instagram', 'compartilhar'))
);

-- Regras (RLS) ------------------------------------------------
-- Admin é quem entra com guiatennis1@gmail.com.

alter table public.academias enable row level security;
alter table public.avaliacoes enable row level security;
alter table public.cliques enable row level security;

drop policy if exists "Ver academias publicadas" on public.academias;
create policy "Ver academias publicadas" on public.academias
  for select
  using (status = 'published' and (pausada = false or pausada_ate <= now()));

drop policy if exists "Admin ve pendentes" on public.academias;
create policy "Admin ve pendentes" on public.academias
  for select
  using ((auth.jwt() ->> 'email') = 'guiatennis1@gmail.com');

drop policy if exists "Enviar academia para analise" on public.academias;
create policy "Enviar academia para analise" on public.academias
  for insert
  with check (status = 'pending' and coalesce(pago, false) = false and coalesce(plano, 'basico') = 'basico');

drop policy if exists "Admin edita academias" on public.academias;
create policy "Admin edita academias" on public.academias
  for update
  using ((auth.jwt() ->> 'email') = 'guiatennis1@gmail.com');

drop policy if exists "Admin exclui academias" on public.academias;
create policy "Admin exclui academias" on public.academias
  for delete
  using ((auth.jwt() ->> 'email') = 'guiatennis1@gmail.com');

drop policy if exists "Ver avaliacoes" on public.avaliacoes;
create policy "Ver avaliacoes" on public.avaliacoes
  for select
  using (true);

drop policy if exists "Enviar avaliacao" on public.avaliacoes;
create policy "Enviar avaliacao" on public.avaliacoes
  for insert
  with check (stars between 1 and 5 and length(coalesce(comment, '')) <= 2000);

drop policy if exists "Admin exclui avaliacoes" on public.avaliacoes;
create policy "Admin exclui avaliacoes" on public.avaliacoes
  for delete
  using ((auth.jwt() ->> 'email') = 'guiatennis1@gmail.com');

drop policy if exists "Admin ve cliques" on public.cliques;
create policy "Admin ve cliques" on public.cliques
  for select
  using ((auth.jwt() ->> 'email') = 'guiatennis1@gmail.com');

drop policy if exists "Registrar clique" on public.cliques;
create policy "Registrar clique" on public.cliques
  for insert
  with check (tipo in ('acesso_site', 'busca', 'visualizacao', 'whatsapp', 'site', 'instagram', 'compartilhar'));

-- Permissões --------------------------------------------------
-- O visitante lê tudo menos os contatos: quem pediu o cadastro da
-- academia e o WhatsApp de quem avaliou. Coluna nova em academias ou
-- avaliacoes precisa entrar nesta lista para o visitante enxergar.

revoke select on public.academias from anon;
grant select (id, created_at, name, address, numero, complemento, bairro, cidade,
  endereco, lat, lng, phone, instagram, site, price_range, price_aula, price_locacao,
  amenities, modalidades, pisos, cobertura, quadras, photos, source, status, pago,
  plano, politica, acesso, horario, pausada, pausada_ate)
  on public.academias to anon;

revoke select on public.avaliacoes from anon;
grant select (id, academia_id, stars, comment, nome_autor, created_at)
  on public.avaliacoes to anon;

-- Números públicos da home ------------------------------------
-- Função e não visão: devolve só quatro totais, sem abrir a tabela
-- cliques para o visitante (ver GUIATENNIS-CONTEXTO.md).

create or replace function public.estatisticas_publicas()
returns table (
  acessos_total  bigint,
  buscas_total   bigint,
  fichas_total   bigint,
  contatos_total bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*) filter (where tipo = 'acesso_site'),
    count(*) filter (where tipo = 'busca'),
    count(*) filter (where tipo = 'visualizacao'),
    count(*) filter (where tipo in ('whatsapp','site','instagram'))
  from public.cliques;
$$;

revoke all on function public.estatisticas_publicas() from public;
grant execute on function public.estatisticas_publicas() to anon, authenticated;
