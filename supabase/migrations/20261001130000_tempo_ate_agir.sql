-- ============================================================
-- Tempo até agir (01/10/2026)
-- ============================================================
-- Pedido do Breno: quanto tempo a pessoa fica no site até fazer alguma
-- coisa — o "tempo até a conversão" dos painéis grandes (Google Analytics,
-- Booking Analytics). Em cada visita, a chegada (acesso_site) leva 0 —
-- marca a visita como medida —, e só a primeira busca e o primeiro
-- contato com uma academia (WhatsApp, Instagram ou site) levam:
--
--   segundos        quantos segundos depois de chegar ao site
--   segundos_ficha  no contato: quanto tempo a pessoa olhou a ficha antes
--
-- São só números: não ligam a ninguém (GUIATENNIS-CONTEXTO.md, regra 9).
-- A regra "Registrar clique" e as permissões da tabela valem para as
-- colunas novas sem mudar nada.
-- Pode rodar de novo sem estragar nada.

alter table public.cliques add column if not exists segundos int;
alter table public.cliques add column if not exists segundos_ficha int;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cliques_segundos') then
    alter table public.cliques add constraint cliques_segundos
      check (segundos is null or segundos between 0 and 86400);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cliques_segundos_ficha') then
    alter table public.cliques add constraint cliques_segundos_ficha
      check (segundos_ficha is null or segundos_ficha between 0 and 86400);
  end if;
end $$;

notify pgrst, 'reload schema';
