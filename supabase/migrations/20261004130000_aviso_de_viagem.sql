-- ============================================================
-- Aviso de viagem por e-mail (pedido do Breno em 04/10/2026)
-- ============================================================
-- Junto dos avisos da conta do jogador, "Vou viajar": a pessoa marca, diz
-- o estado, a cidade e as datas (opcionais), e o e-mail traz as academias
-- para jogar lá (o envio é o próximo passo, com o Resend). Como os
-- outros avisos, começa desligado (LGPD) e a pessoa muda ou desliga em
-- "Minha conta". Só a própria conta lê e muda (regras de jogadores).
-- Pode rodar de novo sem estragar nada.

alter table public.jogadores add column if not exists avisos_viagem boolean not null default false;
alter table public.jogadores add column if not exists viagem_uf text;
alter table public.jogadores add column if not exists viagem_cidade text;
alter table public.jogadores add column if not exists viagem_ida date;
alter table public.jogadores add column if not exists viagem_volta date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'jogadores_viagem_completa') then
    alter table public.jogadores add constraint jogadores_viagem_completa
      check (not avisos_viagem or (viagem_uf is not null and viagem_cidade is not null));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'jogadores_viagem_datas') then
    alter table public.jogadores add constraint jogadores_viagem_datas
      check (viagem_volta is null or viagem_ida is null or viagem_volta >= viagem_ida);
  end if;
end $$;

grant update (avisos_viagem, viagem_uf, viagem_cidade, viagem_ida, viagem_volta)
  on table public.jogadores to authenticated;

notify pgrst, 'reload schema';
