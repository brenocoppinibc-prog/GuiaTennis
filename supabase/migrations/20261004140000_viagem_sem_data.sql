-- ============================================================
-- Aviso de viagem sem data obrigatória (pedido do Breno em 04/10/2026)
-- ============================================================
-- A data de ida deixa de ser obrigatória no aviso "Vou viajar" (quando o
-- e-mail sai ainda vai ser definido). A regra da 20261004130000 já rodou no
-- banco de teste exigindo a ida: aqui ela volta sem a data.
-- Pode rodar de novo sem estragar nada.

alter table public.jogadores drop constraint if exists jogadores_viagem_completa;
alter table public.jogadores add constraint jogadores_viagem_completa
  check (not avisos_viagem or (viagem_uf is not null and viagem_cidade is not null));

notify pgrst, 'reload schema';
