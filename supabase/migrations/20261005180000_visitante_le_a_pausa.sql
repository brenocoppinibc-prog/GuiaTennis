-- ============================================================
-- O site lê "pausada pela academia" (correção de 05/10/2026)
-- ============================================================
-- A coluna academias.pausada_pela_academia (SQL 20261005130000) entrou sem
-- a leitura liberada: o visitante e quem está logado só leem as colunas da
-- lista (estrutura inicial e 20260930120000). O site contornava lendo sem
-- ela, mas a conferência do GitHub (supabase/conferir.sh), que lê com as
-- colunas do index.html, recusava ("permission denied for table
-- academias"). Coluna nova que o site lê entra aqui também.
-- Pode rodar de novo sem estragar nada.

grant select (pausada_pela_academia) on public.academias to anon, authenticated;

notify pgrst, 'reload schema';
