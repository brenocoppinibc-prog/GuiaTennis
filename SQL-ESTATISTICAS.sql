-- ============================================================
-- GuiaTennis — rode isto no SQL Editor do Supabase, de uma vez
-- ============================================================

-- 1) Onde a busca fica guardada (só bairro e cidade, nada mais)
alter table cliques add column if not exists detalhe text;

-- 2) Os números públicos: 30 dias + totais de sempre
create or replace view estatisticas_publicas as
select
  (select count(*) from cliques
     where tipo = 'acesso_site' and created_at > now() - interval '30 days')  as acessos,
  (select count(*) from cliques
     where tipo = 'visualizacao' and created_at > now() - interval '30 days') as fichas_abertas,
  (select count(*) from cliques
     where tipo in ('whatsapp','site','instagram','compartilhar')
       and created_at > now() - interval '30 days')                           as contatos,
  (select count(*) from cliques where tipo = 'acesso_site')                   as acessos_total,
  (select count(*) from cliques where tipo = 'busca')                         as buscas_total;

-- 3) Qualquer visitante pode ler a visão (e só ela)
grant select on estatisticas_publicas to anon, authenticated;

-- ============================================================
-- Ainda pendentes das mudanças anteriores, se você não rodou:
-- ============================================================
alter table academias add column if not exists politica jsonb not null default '{}'::jsonb;
alter table academias add column if not exists acesso   jsonb not null default '{}'::jsonb;
