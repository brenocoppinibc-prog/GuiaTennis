-- ============================================================
-- O catálogo de aulas e locações da academia (pedido do Breno em 26/10/2026:
-- "quero criar catálogos melhores para aulas em grupo, individuais, dupla e
-- locações avulsas, mensal")
-- ============================================================
-- Como os tipos de quarto do Booking e as opções de preço do Mindbody e do
-- Playtomic: cada item é uma opção que a academia vende — aula individual,
-- em dupla, em grupo ou locação, avulsa ou mensal (com quantas vezes por
-- semana), até quantos alunos, o valor e uma observação curta (sem duração:
-- "duração de aula e locação eu não quero colocar", 27/10/2026).
-- Fica em academias.catalogo, uma lista (jsonb) que o site monta; o
-- price_aula e o price_locacao continuam, com o menor valor avulso de cada
-- um, para a ordem por preço, o filtro e a comparação.
-- A data "atualizada há…" já acompanha a coluna nova (dados_da_ficha olha
-- a linha inteira).
-- Pode rodar de novo sem estragar nada.

alter table public.academias add column if not exists catalogo jsonb not null default '[]'::jsonb;

alter table public.academias drop constraint if exists catalogo_e_uma_lista;
alter table public.academias add constraint catalogo_e_uma_lista
  check (jsonb_typeof(catalogo) = 'array' and jsonb_array_length(catalogo) <= 30);

-- O visitante e quem está logado leem só as colunas da lista (estrutura
-- inicial e 20260930120000): coluna nova que o site lê entra aqui também.
grant select (catalogo) on public.academias to anon, authenticated;

notify pgrst, 'reload schema';
