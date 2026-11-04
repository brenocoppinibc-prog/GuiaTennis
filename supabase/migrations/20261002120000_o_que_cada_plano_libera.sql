-- ============================================================
-- O que cada plano libera (pedido do Breno em 02/10/2026)
-- ============================================================
--   Básico (grátis)  1 pessoa · ficha básica (até 3 comodidades, até 3
--                    fotos, só o WhatsApp) · sem números
--   Completo         5 pessoas · ficha completa (todas as comodidades,
--                    5 fotos, WhatsApp, Instagram e site) · sem números
--   Premium          10 pessoas · ficha completa · todos os números
--                    (Desempenho) e o relatório do mês por e-mail
--
-- O que aparece na ficha o site corta pelo plano. Aqui o banco confere
-- quantas pessoas entram e quem vê os números.
-- Pode rodar de novo sem estragar nada.

create or replace function public.limite_de_pessoas(p_plano text)
returns int
language sql
immutable
set search_path = ''
as $$
  select case p_plano when 'premium' then 10 when 'completo' then 5 else 1 end;
$$;

-- A função antiga, com os números de cada plano, vira a de dentro: só a
-- nova a chama, e só para o Premium (ou para o admin).
do $$
begin
  if to_regprocedure('public.numeros_completos_da_academia(int, uuid)') is null then
    alter function public.numeros_da_academia(int, uuid) rename to numeros_completos_da_academia;
  end if;
end $$;
revoke all on function public.numeros_completos_da_academia(int, uuid) from public, anon, authenticated;

create or replace function public.numeros_da_academia(
  p_dias int default 30, p_academia uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_plano text;
begin
  if p_academia is not null and public.eh_admin() then
    v_id := p_academia;
  else
    select academia_id into v_id from public.academia_acessos
      where user_id = auth.uid() limit 1;
  end if;
  if v_id is null then
    raise exception 'Sem acesso aos números dessa academia.' using errcode = '42501';
  end if;
  select coalesce(a.plano, 'basico') into v_plano from public.academias a where a.id = v_id;
  -- Básico e Completo: nenhum número, só o aviso de que é do Premium.
  if v_plano <> 'premium' then
    return jsonb_build_object('plano', v_plano, 'trancado', true);
  end if;
  return public.numeros_completos_da_academia(p_dias, p_academia);
end $$;

revoke all on function public.numeros_da_academia(int, uuid) from public, anon;
grant execute on function public.numeros_da_academia(int, uuid) to authenticated;

notify pgrst, 'reload schema';
