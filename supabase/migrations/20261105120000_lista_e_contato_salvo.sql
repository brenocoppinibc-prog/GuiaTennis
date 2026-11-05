-- Os cliques dos botões do WhatsApp (regra 209, 05/11/2026: "o site precisa
-- poder contabilizar o clique nos contatos e tudo mais"): "Mandar para o meu
-- WhatsApp" conta 'lista_whatsapp' para cada academia da lista, e "Salvar os
-- contatos" conta 'contato_salvo' para cada uma, como o Perfil da Empresa do
-- Google, que mostra quantos salvaram e compartilharam o perfil. Os números
-- entram em "guardaram" no Desempenho do Completo (30 dias) e do Premium (o
-- período escolhido). Pode rodar de novo sem estragar nada.

-- A trava e a regra de envio aceitam os dois tipos novos.
alter table public.cliques drop constraint if exists cliques_tipo_valido;
alter table public.cliques add constraint cliques_tipo_valido
  check (tipo in ('acesso_site', 'busca', 'visualizacao', 'whatsapp',
                  'site', 'instagram', 'compartilhar', 'lista_whatsapp', 'contato_salvo'));

drop policy if exists "Registrar clique" on public.cliques;
create policy "Registrar clique" on public.cliques
  for insert
  with check (tipo in ('acesso_site', 'busca', 'visualizacao', 'whatsapp',
                       'site', 'instagram', 'compartilhar', 'lista_whatsapp', 'contato_salvo'));

-- Quantos guardaram a academia: mandaram a lista para o próprio WhatsApp e
-- salvaram o contato no celular.
create or replace function public.guardaram_da_academia(p_academia uuid, p_desde timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'lista', count(*) filter (where c.tipo = 'lista_whatsapp'),
    'contato', count(*) filter (where c.tipo = 'contato_salvo'))
  from public.cliques c
  where c.academia_id = p_academia and c.created_at >= p_desde;
$$;

-- Os números da academia (SQL 20261102120000) com o "guardaram".
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
  v_dias int;
  r jsonb;
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
      || case when v_plano = 'completo' then jsonb_build_object(
           'contatos', (select count(*) from public.cliques c
             where c.academia_id = v_id and c.tipo in ('whatsapp', 'instagram', 'site') and c.created_at >= v_desde),
           'guardaram', public.guardaram_da_academia(v_id, v_desde))
         else '{}'::jsonb end;
  end if;
  r := public.numeros_completos_da_academia(p_dias, p_academia);
  v_dias := coalesce((r->>'dias')::int, 30);
  return r || jsonb_build_object('guardaram', public.guardaram_da_academia(v_id,
    case when v_dias = 0 then '-infinity'::timestamptz
      else ((v_hoje - (v_dias - 1)) at time zone 'America/Sao_Paulo') end));
end $$;

revoke all on function public.guardaram_da_academia(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.numeros_da_academia(int, uuid) from public, anon;
grant execute on function public.numeros_da_academia(int, uuid) to authenticated;

notify pgrst, 'reload schema';
