-- ============================================================
-- "Confirmada pela academia · atualizada há 4 dias" na ficha (análise do
-- GuiaTennis em 07/10/2026: o maior risco do guia é o dado velho)
-- ============================================================
-- Como o "Atualizado pela empresa há 2 semanas" do Google Maps e o selo
-- "Claimed" do Yelp: o jogador vê se a ficha é da academia e quando ela
-- foi atualizada pela última vez.
--
--   academias.dados_atualizados_em   quando a informação que o jogador vê
--                                    mudou, ou quando a academia salvou a
--                                    ficha (salvar sem mudar nada confirma
--                                    que está tudo certo)
--
-- Só o gatilho escreve a data: o que vier do site é trocado por ela. Pausar,
-- publicar, mudar o plano ou o selo de confirmada não conta como atualizar.
-- A coordenada do mapa também não (o endereço, sim).
-- As academias que já estão no guia começam com a última vez que alguém da
-- academia salvou a ficha, senão com o dia em que entraram no guia.
-- Pode rodar de novo sem estragar nada.

alter table public.academias add column if not exists dados_atualizados_em timestamptz;

update public.academias a
  set dados_atualizados_em = coalesce(
    (select max(v.ficha_atualizada_em) from public.academia_vinculos v where v.academia_id = a.id),
    a.created_at, now())
  where a.dados_atualizados_em is null;

alter table public.academias alter column dados_atualizados_em set default now();

-- O que não é informação da ficha para o jogador.
create or replace function public.dados_da_ficha(p jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select p - array['id', 'created_at', 'status', 'pago', 'plano', 'pausada', 'pausada_ate',
    'pausada_pela_academia', 'source', 'nome_solicitante', 'contato_solicitante',
    'revisar_desde', 'publicada_em', 'confirmada', 'dados_atualizados_em', 'lat', 'lng'];
$$;

create or replace function public.marcar_dados_atualizados()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pausa boolean := coalesce(current_setting('guiatennis.pausa_da_academia', true), '') = 'sim';
  v_da_academia boolean;
begin
  if tg_op = 'INSERT' then
    new.dados_atualizados_em := now();
    return new;
  end if;
  new.dados_atualizados_em := old.dados_atualizados_em;
  if v_pausa then
    return new;
  end if;
  v_da_academia := auth.uid() is not null and not public.eh_admin()
    and exists (select 1 from public.academia_vinculos
                where user_id = auth.uid() and academia_id = old.id);
  if v_da_academia
     or public.dados_da_ficha(to_jsonb(new)) is distinct from public.dados_da_ficha(to_jsonb(old)) then
    new.dados_atualizados_em := now();
  end if;
  return new;
end $$;

-- Roda antes do proteger_ficha_da_academia (ordem alfabética). O que ele
-- devolve ao que era (situação, plano…) já fica fora da comparação.
drop trigger if exists marcar_dados_atualizados on public.academias;
create trigger marcar_dados_atualizados
  before insert or update on public.academias
  for each row execute function public.marcar_dados_atualizados();

revoke all on function public.marcar_dados_atualizados() from public, anon, authenticated;
revoke all on function public.dados_da_ficha(jsonb) from public, anon, authenticated;

-- O visitante e quem está logado leem a coluna nova (ver 20261005180000).
grant select (dados_atualizados_em) on public.academias to anon, authenticated;

notify pgrst, 'reload schema';
