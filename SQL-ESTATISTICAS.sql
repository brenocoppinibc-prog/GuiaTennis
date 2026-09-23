-- ============================================================
-- GuiaTennis — o que falta rodar no SQL Editor do Supabase
-- ============================================================
-- Já rodado: a primeira versão da visão estatisticas_publicas
-- (acessos, fichas_abertas, contatos dos últimos 30 dias).
--
-- O que vem abaixo acrescenta: a coluna onde a busca guarda a
-- região, as duas colunas jsonb da academia e os totais de sempre.

alter table cliques add column if not exists detalhe text;

alter table academias add column if not exists politica jsonb not null default '{}'::jsonb;

alter table academias add column if not exists acesso jsonb not null default '{}'::jsonb;

-- As três primeiras colunas seguem com o mesmo nome e na mesma ordem,
-- então o "replace" passa. O corte de 30 dias desceu para dentro de cada
-- filter porque os dois números novos contam desde o começo do site.
-- "contatos" de propósito não inclui 'compartilhar': a frase que aparece
-- na home é "de quem abre chama a academia", e compartilhar não é chamar.
create or replace view estatisticas_publicas as
select
  count(*) filter (where tipo = 'acesso_site'  and created_at > now() - interval '30 days') as acessos,
  count(*) filter (where tipo = 'visualizacao' and created_at > now() - interval '30 days') as fichas_abertas,
  count(*) filter (where tipo in ('whatsapp','site','instagram')
                                                and created_at > now() - interval '30 days') as contatos,
  count(*) filter (where tipo = 'acesso_site')                                               as acessos_total,
  count(*) filter (where tipo = 'busca')                                                     as buscas_total
from cliques;

grant select on estatisticas_publicas to anon, authenticated;

-- Conferir: devem vir cinco colunas.
-- select * from estatisticas_publicas;
