-- ============================================================
-- Percurso de cada visita (pedido do Breno em 05/10/2026)
-- ============================================================
-- Como a "exploração de caminho" e o "funil" do Google Analytics: cada
-- visita ao site dos jogadores e ao GuiaTennis Parceiros vira uma lista de
-- passos — de onde veio, por qual meio, em que aparelho, cada tela, busca,
-- ficha, contato e etapa do cadastro, e o tempo desde a chegada. O painel do
-- admin monta o caminho de cada visita e o funil.
--
-- Sem identificar ninguém (regra 9): a visita é um número aleatório que o
-- navegador sorteia e que vale só para aquela visita (nem para o aparelho,
-- nem para a conta). Da busca vai só a região (bairro e cidade), nunca o
-- endereço digitado; da tela, o caminho do link, sem a parte de depois do
-- "?". O admin conectado não grava nada.
--
-- Pode rodar de novo sem estragar nada.

create table if not exists public.passos_das_visitas (
  id uuid not null default gen_random_uuid() primary key,
  visita text not null,
  site text not null default 'jogadores',
  ordem int not null default 1,
  tipo text not null,
  tela text,
  detalhe text,
  academia_id uuid references public.academias (id) on delete set null,
  origem text,
  meio text,
  dispositivo text,
  segundos int not null default 0,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'passos_visita') then
    alter table public.passos_das_visitas add constraint passos_visita
      check (visita ~ '^[a-z0-9]{8,32}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'passos_site') then
    alter table public.passos_das_visitas add constraint passos_site
      check (site in ('jogadores', 'parceiros'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'passos_tipo') then
    alter table public.passos_das_visitas add constraint passos_tipo
      check (tipo in ('chegada', 'tela', 'busca', 'ficha', 'contato', 'acao', 'saida'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'passos_tamanhos') then
    alter table public.passos_das_visitas add constraint passos_tamanhos
      check (length(coalesce(tela, '')) <= 120 and length(coalesce(detalhe, '')) <= 160
             and length(coalesce(origem, '')) <= 60 and length(coalesce(meio, '')) <= 60
             and length(coalesce(dispositivo, '')) <= 20);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'passos_numeros') then
    alter table public.passos_das_visitas add constraint passos_numeros
      check (ordem between 1 and 1000 and segundos between 0 and 86400);
  end if;
end $$;

create index if not exists passos_das_visitas_quando
  on public.passos_das_visitas (created_at desc);
create index if not exists passos_das_visitas_visita
  on public.passos_das_visitas (visita, segundos, ordem);

-- Qualquer visitante grava passos; só o admin lê.
alter table public.passos_das_visitas enable row level security;
drop policy if exists "Registrar passo" on public.passos_das_visitas;
create policy "Registrar passo" on public.passos_das_visitas
  for insert
  with check (true);
drop policy if exists "Admin le passos" on public.passos_das_visitas;
create policy "Admin le passos" on public.passos_das_visitas
  for select
  using (public.eh_admin());

revoke all on public.passos_das_visitas from anon, authenticated;
grant insert on public.passos_das_visitas to anon, authenticated;
grant select on public.passos_das_visitas to authenticated;
grant all on public.passos_das_visitas to service_role;

notify pgrst, 'reload schema';
