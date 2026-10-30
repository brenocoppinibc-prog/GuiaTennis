-- O texto da academia em "Sobre a academia" (regra 189, pedido do Breno em
-- 30/10/2026: "no cadastro a academia conte o diferencial delas junto a
-- estrutura que eles possuem com um limite de caracteres, acho que 750 está
-- bom"). 750 é o limite da descrição do Perfil da Empresa no Google. A
-- academia escreve no cadastro, na parte Quadras e estrutura; o site não
-- deixa telefone, link nem preço no texto (eles têm lugar próprio na ficha,
-- e o WhatsApp passa pelo código). Pode rodar de novo sem estragar.

alter table public.academias add column if not exists sobre text;

alter table public.academias drop constraint if exists academias_sobre_tamanho;
alter table public.academias add constraint academias_sobre_tamanho
  check (sobre is null or char_length(sobre) <= 750);

grant select (sobre) on public.academias to anon, authenticated;

notify pgrst, 'reload schema';
