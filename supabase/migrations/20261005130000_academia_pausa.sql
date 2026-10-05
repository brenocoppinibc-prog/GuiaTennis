-- ============================================================
-- A academia pausa a própria ficha (pedido do Breno em 05/10/2026)
-- ============================================================
-- Como o "temporariamente fechado" do Google Business Profile e o "fechar
-- a propriedade para reservas" do Booking: quem administra a academia no
-- GuiaTennis Parceiros tira a ficha da busca por um tempo (ou até voltar) e
-- traz de volta quando quiser. Cada academia pausa separada. Pausa feita
-- pelo GuiaTennis só o GuiaTennis desfaz.
--
--   academias.pausada_pela_academia   a pausa de agora foi da academia
--   pausar_minha_academia(…)          pausa ou volta, conferindo o vínculo
--
-- Pode rodar de novo sem estragar nada.

alter table public.academias add column if not exists pausada_pela_academia boolean not null default false;

-- O gatilho que protege a ficha deixa passar a pausa só quando quem pede é
-- a função abaixo (ela marca a transação). O admin pausando ou voltando
-- desmarca a pausa da academia.
create or replace function public.proteger_ficha_da_academia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pausa boolean := coalesce(current_setting('guiatennis.pausa_da_academia', true), '') = 'sim';
  v_linha public.academias;
begin
  -- A pausa pedida pela academia muda só a pausa: o resto fica como estava
  -- (nem marca a ficha como confirmada).
  if v_pausa then
    v_linha := old;
    v_linha.pausada := new.pausada;
    v_linha.pausada_ate := new.pausada_ate;
    v_linha.pausada_pela_academia := new.pausada_pela_academia;
    return v_linha;
  end if;
  if auth.uid() is null or public.eh_admin() then
    if new.pausada is distinct from old.pausada or new.pausada_ate is distinct from old.pausada_ate then
      new.pausada_pela_academia := false;
    end if;
    return new;
  end if;
  new.id := old.id;
  new.created_at := old.created_at;
  new.status := old.status;
  new.pago := old.pago;
  new.plano := old.plano;
  new.pausada := old.pausada;
  new.pausada_ate := old.pausada_ate;
  new.pausada_pela_academia := old.pausada_pela_academia;
  new.source := old.source;
  new.nome_solicitante := old.nome_solicitante;
  new.contato_solicitante := old.contato_solicitante;
  new.confirmada := true;
  update public.academia_vinculos
    set ficha_atualizada_em = now()
    where user_id = auth.uid() and academia_id = new.id;
  update public.academia_acessos
    set ficha_atualizada_em = now()
    where user_id = auth.uid() and academia_id = new.id;
  return new;
end $$;

-- Pausar (p_pausar = true, com p_ate opcional: a ficha volta sozinha nesse
-- dia) ou voltar a aparecer (p_pausar = false).
drop function if exists public.pausar_minha_academia(uuid, boolean, date);
create or replace function public.pausar_minha_academia(
  p_academia uuid, p_pausar boolean, p_ate timestamptz default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  select * into a from public.academias where id = p_academia;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if a.status <> 'published' then
    raise exception 'A academia ainda está em análise: ela só aparece no site depois que o GuiaTennis publicar.' using errcode = '22023';
  end if;
  if coalesce(p_pausar, false) and p_ate is not null and p_ate <= now() then
    raise exception 'Escolha uma data depois de hoje.' using errcode = '22023';
  end if;
  if not coalesce(p_pausar, false) and a.pausada and not a.pausada_pela_academia
     and (a.pausada_ate is null or a.pausada_ate > now()) then
    raise exception 'Essa academia foi pausada pelo GuiaTennis. Fale com a gente para ela voltar a aparecer.' using errcode = '42501';
  end if;
  perform set_config('guiatennis.pausa_da_academia', 'sim', true);
  update public.academias
    set pausada = coalesce(p_pausar, false),
        pausada_ate = case when coalesce(p_pausar, false) then p_ate end,
        pausada_pela_academia = coalesce(p_pausar, false)
    where id = p_academia;
  perform set_config('guiatennis.pausa_da_academia', '', true);
end $$;

-- A lista "Suas academias" passa a trazer até quando e quem pausou.
drop function if exists public.academias_da_minha_conta();
create or replace function public.academias_da_minha_conta()
returns table (academia_id uuid, nome text, papel text, status text,
  pausada boolean, plano text, bairro text, cidade text, aberta boolean,
  pausada_ate timestamptz, pausada_pela_academia boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select v.academia_id, a.name, v.papel, a.status,
    coalesce(a.pausada, false) and (a.pausada_ate is null or a.pausada_ate > now()),
    coalesce(a.plano, 'basico'), a.bairro, a.cidade,
    v.academia_id = x.academia_id,
    a.pausada_ate, coalesce(a.pausada_pela_academia, false)
  from public.academia_vinculos v
  join public.academias a on a.id = v.academia_id
  join public.academia_acessos x on x.user_id = v.user_id
  where v.user_id = auth.uid()
  order by a.name;
$$;

revoke all on function public.pausar_minha_academia(uuid, boolean, timestamptz) from public, anon;
revoke all on function public.academias_da_minha_conta() from public, anon;
grant execute on function public.pausar_minha_academia(uuid, boolean, timestamptz),
  public.academias_da_minha_conta() to authenticated;

notify pgrst, 'reload schema';
