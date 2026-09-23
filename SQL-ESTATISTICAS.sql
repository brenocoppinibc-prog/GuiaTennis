-- ============================================================
-- GuiaTennis — o que falta rodar no SQL Editor do Supabase
-- ============================================================
-- Já rodado: a primeira versão da visão estatisticas_publicas.
--
-- Este bloco: a coluna onde a busca guarda a região, as duas colunas
-- jsonb da academia, e a troca da visão por uma função que devolve os
-- totais do site desde o começo.
--
-- Por que função e não visão: uma visão pertence ao postgres e roda com
-- a permissão dele, então passa por cima do RLS da tabela cliques. É o
-- que a gente quer (somar uma tabela fechada), mas o Supabase marca isso
-- como "Security Definer View — CRITICAL", porque quase sempre é engano.
-- A função faz o mesmo de um jeito que o Supabase reconhece: devolve só
-- quatro números e nunca uma linha de cliques.

alter table cliques add column if not exists detalhe text;

alter table academias add column if not exists politica jsonb not null default '{}'::jsonb;

alter table academias add column if not exists acesso jsonb not null default '{}'::jsonb;

drop view if exists public.estatisticas_publicas;

drop function if exists public.estatisticas_publicas();

create function public.estatisticas_publicas()
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

-- Conferir: devem vir quatro números.
-- select * from public.estatisticas_publicas();
