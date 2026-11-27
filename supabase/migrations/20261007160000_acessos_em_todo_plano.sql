-- ============================================================
-- Os acessos da ficha em todo plano (pedido do Breno em 07/10/2026: "pode
-- subir um pouco mais os números e deixe mais atrativos como acessos")
-- ============================================================
-- Como o LinkedIn ("X pessoas viram o seu perfil", e quem viu só no
-- Premium) e o Google Business Profile: todo plano vê quantas pessoas
-- abriram a ficha nos últimos 30 dias. O resto — quem chamou, por qual
-- canal, dia a dia, de onde vieram, bairros e a comparação com a cidade —
-- continua só no Premium (regra 22).
--
--   numeros_da_academia, fora do Premium: {plano, trancado, dias: 30,
--   acessos}  (antes: só {plano, trancado})
--
-- Pode rodar de novo sem estragar nada.

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
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
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
  -- Básico e Completo: só os acessos dos últimos 30 dias (os mesmos que o
  -- Premium vê como "Visitas na ficha": o admin e a própria academia
  -- logada não contam, porque nem chegam a ser gravados).
  if v_plano <> 'premium' then
    return jsonb_build_object('plano', v_plano, 'trancado', true, 'dias', 30,
      'acessos', (select count(*) from public.cliques c
                  where c.academia_id = v_id and c.tipo = 'visualizacao'
                    and c.created_at >= ((v_hoje - 29) at time zone 'America/Sao_Paulo')));
  end if;
  return public.numeros_completos_da_academia(p_dias, p_academia);
end $$;

revoke all on function public.numeros_da_academia(int, uuid) from public, anon;
grant execute on function public.numeros_da_academia(int, uuid) to authenticated;

notify pgrst, 'reload schema';
