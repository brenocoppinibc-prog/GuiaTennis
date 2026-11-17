-- Regra 294 (17/11/2026): "tem academias que oferecem locação para eventos,
-- rankings, aulas com projeto social, como incluir isso no site também";
-- depois: eventos e ranking no catálogo e o projeto social à parte, "tire a
-- opção torneios, deixe só ranking".
--
-- Locação para eventos e Ranking entram no catálogo que já existe
-- (academias.catalogo, tipos "eventos" e "ranking"): sem SQL. O projeto social
-- não é produto à venda: tem uma coluna própria, com o texto da academia
-- (como funciona e quem pode participar), e aparece em todos os planos.
--   academias.projeto_social   o texto (até 300 letras); vazio, sem projeto.
-- Pode rodar de novo sem estragar.

alter table public.academias add column if not exists projeto_social text;

alter table public.academias drop constraint if exists academias_projeto_social_tamanho;
alter table public.academias add constraint academias_projeto_social_tamanho
  check (projeto_social is null or char_length(projeto_social) <= 300);

grant select (projeto_social) on public.academias to anon, authenticated;

notify pgrst, 'reload schema';
