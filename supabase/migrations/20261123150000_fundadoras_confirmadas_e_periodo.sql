-- Regra 320 (23/11/2026). Pedidos do Breno no PR #5:
--
-- 1) "Na verdade, são para os 15 donos que chegarem primeiro. Tem academias
--    que já foram confirmadas no site, e essas podem ser com selo do
--    fundador." O selo vai para as 15 primeiras academias cujo dono chegou:
--    a ficha confirmada pela academia (confirmada = true, no ar) ou o
--    responsável que entrou sozinho no Parceiros (regra 319). A ordem é a da
--    chegada: quando a ficha confirmada entrou no ar ou quando a conta da
--    academia entrou, o que vier primeiro.
-- 2) "Divulgue seu desempenho … com o tempo determinado pela academia": os
--    números do período escolhido (7, 30, 90 ou 365 dias, ou desde o
--    início; 0 = desde o início) e as avaliações novas do período.
-- 3) "Como será a devolução de quem colocou mais dinheiro e não usou": a
--    academia vê em cada promoção quanto do alcance voltou para os créditos.
--
-- Roda uma vez pelo supabase/aplicar.sh (schema_migrations); pode rodar de
-- novo sem erro.

-- 1) Fundadoras ---------------------------------------------------------------
create or replace function public.marcar_fundadora_confirmada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.confirmada and new.status = 'published'
     and (tg_op = 'INSERT' or not (coalesce(old.confirmada, false) and old.status = 'published'))
     and (select count(*) from public.academias_fundadoras) < 15 then
    insert into public.academias_fundadoras (academia_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists marcar_fundadora_confirmada on public.academias;
create trigger marcar_fundadora_confirmada after insert or update of confirmada, status on public.academias
  for each row execute function public.marcar_fundadora_confirmada();
revoke all on function public.marcar_fundadora_confirmada() from public, anon, authenticated;

-- A lista refeita pela chegada do dono (o banco de verdade recebe o selo só
-- com o merge do PR #5, junto com este arquivo).
delete from public.academias_fundadoras;
insert into public.academias_fundadoras (academia_id, desde)
select academia_id, min(quando) from (
  select a.id as academia_id, coalesce(a.publicada_em, a.created_at, now()) as quando
  from public.academias a where a.confirmada and a.status = 'published'
  union all
  select v.academia_id, v.created_at from public.academia_vinculos v
  where public.conta_de_fundadora(v.user_id)
) x
group by academia_id
order by min(quando), academia_id
limit 15
on conflict do nothing;

-- 2) Os números do período escolhido pela academia ---------------------------
drop function if exists public.numeros_para_divulgar(uuid);
create or replace function public.numeros_para_divulgar(p_academia uuid, p_dias integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_plano text;
  v_inicio timestamptz;
  v_desde timestamptz;
  v_contatos boolean;
begin
  if not (public.eh_admin() or exists (select 1 from public.academia_vinculos where user_id = auth.uid() and academia_id = p_academia)) then
    raise exception 'Entre na conta da academia.' using errcode = '42501';
  end if;
  select coalesce(plano, 'basico'), coalesce(publicada_em, created_at) into v_plano, v_inicio
  from public.academias where id = p_academia;
  v_desde := case when coalesce(p_dias, 0) > 0 then now() - make_interval(days => least(p_dias, 3660)) end;
  v_contatos := v_plano in ('completo', 'premium');
  return jsonb_build_object(
    'plano', v_plano,
    'dias', greatest(coalesce(p_dias, 0), 0),
    'inicio', v_inicio,
    'acessos', (select count(*) from public.cliques where academia_id = p_academia and tipo = 'visualizacao'
                and (v_desde is null or created_at >= v_desde)),
    'acessos_total', (select count(*) from public.cliques where academia_id = p_academia and tipo = 'visualizacao'),
    'contatos', case when v_contatos then (select count(*) from public.cliques where academia_id = p_academia
                  and tipo in ('whatsapp', 'site', 'instagram', 'reserva') and (v_desde is null or created_at >= v_desde)) end,
    'avaliacoes', (select count(*) from public.avaliacoes where academia_id = p_academia
                   and (v_desde is null or created_at >= v_desde)));
end $$;
revoke all on function public.numeros_para_divulgar(uuid, integer) from public, anon;
grant execute on function public.numeros_para_divulgar(uuid, integer) to authenticated;

-- 3) Quanto do alcance voltou para os créditos ---------------------------------
create or replace function public.alcance_das_promocoes(p_academia uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.posso(p_academia, 'promocoes') then
    coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'alcance', p.alcance, 'gasto', round(p.alcance_gasto, 2),
      'exibicoes', p.exibicoes, 'toques', p.toques, 'devolvido_em', p.alcance_devolvido_em,
      'emails', (select count(*) from public.lances l where l.promocao_id = p.id and l.situacao in ('ganhou', 'enviado')),
      'avisados', (select coalesce(sum(l.avisados), 0) from public.lances l where l.promocao_id = p.id)))
     from public.promocoes p where p.academia_id = p_academia), '[]'::jsonb)
  else null end;
$$;
revoke all on function public.alcance_das_promocoes(uuid) from public, anon;
grant execute on function public.alcance_das_promocoes(uuid) to authenticated;

notify pgrst, 'reload schema';
