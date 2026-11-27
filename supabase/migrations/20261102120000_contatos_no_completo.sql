-- O Completo vê quantos chamaram a academia (regra 196, pedido do Breno em
-- 02/11/2026: "mostrar para o completo quantos entraram em contato é bom
-- para tentar vender mais"). Como o Google Business Profile, que mostra a
-- toda empresa quantas ligações e mensagens recebeu, e o LinkedIn, que mostra
-- o número e deixa o detalhe para o Premium: no Completo, os acessos e os
-- contatos (WhatsApp, Instagram e site) dos últimos 30 dias; o resto (canal,
-- dia a dia, de onde vieram, bairros, comparação) segue no Premium. O Básico
-- continua só com os acessos. Pode rodar de novo sem estragar nada.

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
  v_desde timestamptz;
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
  v_desde := (v_hoje - 29) at time zone 'America/Sao_Paulo';
  if v_plano <> 'premium' then
    return jsonb_build_object('plano', v_plano, 'trancado', true, 'dias', 30,
      'acessos', (select count(*) from public.cliques c
                  where c.academia_id = v_id and c.tipo = 'visualizacao' and c.created_at >= v_desde))
      || case when v_plano = 'completo' then jsonb_build_object('contatos',
           (select count(*) from public.cliques c
            where c.academia_id = v_id and c.tipo in ('whatsapp', 'instagram', 'site') and c.created_at >= v_desde))
         else '{}'::jsonb end;
  end if;
  return public.numeros_completos_da_academia(p_dias, p_academia);
end $$;

revoke all on function public.numeros_da_academia(int, uuid) from public, anon;
grant execute on function public.numeros_da_academia(int, uuid) to authenticated;

notify pgrst, 'reload schema';
