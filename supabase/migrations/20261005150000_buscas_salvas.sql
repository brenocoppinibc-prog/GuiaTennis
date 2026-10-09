-- ============================================================
-- Buscas salvas na conta do jogador (pedido do Breno em 05/10/2026)
-- ============================================================
-- Como o "Salvar busca" do Booking e o "Save search" do Zillow e do
-- Idealista: na busca, a pessoa toca em "Salvar busca" e ela fica na conta
-- (em qualquer aparelho), com o lugar e os filtros. Cada busca salva pode
-- avisar por e-mail quando entrar academia nova nela — o aviso começa
-- desligado (LGPD) e a pessoa liga busca por busca.
--
-- Guarda o que a pessoa digitou (para refazer a busca), o bairro e a cidade
-- achados, o ponto arredondado para ~100 m (3 casas, como o resto do site) e
-- os filtros. A página da cidade (/quadras/sao-paulo) também se salva: sem
-- ponto, vale a cidade inteira. Só a própria conta lê, muda e apaga; excluir a conta apaga
-- tudo. Até 20 buscas por conta.
-- Pode rodar de novo sem estragar nada.

create table if not exists public.buscas_salvas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.jogadores (user_id) on delete cascade,
  termo text not null,
  bairro text,
  cidade text,
  lat double precision,
  lng double precision,
  filtros jsonb not null default '{}'::jsonb,
  link text not null,
  avisar boolean not null default false,
  avisar_desde timestamptz,
  avisada_ate timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists buscas_salvas_uma_por_link
  on public.buscas_salvas (user_id, link);

alter table public.buscas_salvas enable row level security;
drop policy if exists "Ver as proprias buscas" on public.buscas_salvas;
create policy "Ver as proprias buscas" on public.buscas_salvas
  for select using (user_id = auth.uid());
drop policy if exists "Salvar busca" on public.buscas_salvas;
create policy "Salvar busca" on public.buscas_salvas
  for insert with check (user_id = auth.uid() and public.sou_jogador());
drop policy if exists "Mudar o aviso da busca" on public.buscas_salvas;
create policy "Mudar o aviso da busca" on public.buscas_salvas
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Apagar busca" on public.buscas_salvas;
create policy "Apagar busca" on public.buscas_salvas
  for delete using (user_id = auth.uid());

revoke all on table public.buscas_salvas from anon, authenticated;
grant select, insert, delete on table public.buscas_salvas to authenticated;
grant update (avisar) on table public.buscas_salvas to authenticated;
grant all on table public.buscas_salvas to service_role;

-- Arruma o que chega do site: o link só pode ser de busca do próprio site
-- (/busca?… ou a página da cidade, /quadras/sao-paulo),
-- o ponto vai arredondado e os textos têm tamanho máximo. Ligar o aviso
-- marca desde quando avisar (academia publicada antes disso não entra).
create or replace function public.arrumar_busca_salva()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.buscas_salvas where user_id = new.user_id) >= 20 then
      raise exception 'Você já tem 20 buscas salvas. Apague uma para salvar outra.' using errcode = '22023';
    end if;
    new.termo := left(btrim(coalesce(new.termo, '')), 120);
    if new.termo = '' then
      raise exception 'Faça a busca antes de salvar.' using errcode = '22023';
    end if;
    if new.link !~ '^/(busca|quadras/[a-z0-9-]+(/[a-z0-9-]+)?)(\?[^#\s]*)?$' or length(new.link) > 600 then
      raise exception 'Busca inválida.' using errcode = '22023';
    end if;
    new.bairro := nullif(left(btrim(coalesce(new.bairro, '')), 80), '');
    new.cidade := nullif(left(btrim(coalesce(new.cidade, '')), 80), '');
    new.lat := case when new.lat between -90 and 90 then round(new.lat::numeric, 3)::double precision end;
    new.lng := case when new.lng between -180 and 180 then round(new.lng::numeric, 3)::double precision end;
    if jsonb_typeof(new.filtros) is distinct from 'object' or length(new.filtros::text) > 1000 then
      new.filtros := '{}'::jsonb;
    end if;
    new.created_at := now();
    new.avisada_ate := null;
    new.avisar_desde := case when new.avisar then now() end;
  elsif new.avisar and not old.avisar then
    new.avisar_desde := now();
    new.avisada_ate := null;
  end if;
  return new;
end $$;

drop trigger if exists arrumar_busca_salva on public.buscas_salvas;
create trigger arrumar_busca_salva
  before insert or update on public.buscas_salvas
  for each row execute function public.arrumar_busca_salva();

revoke all on function public.arrumar_busca_salva() from public, anon, authenticated;

notify pgrst, 'reload schema';
