-- ============================================================
-- Uma promoção por vez (pedido do Breno em 16/10/2026: "uma promoção por
-- vez")
-- ============================================================
--   salvar_promocao   a academia tem no máximo uma promoção valendo na
--                     ficha (eram 3). Mudar a de agora continua livre. As
--                     que já estavam valendo ficam; o site mostra só a
--                     mais nova. O site manda p_avisar falso: a ficha não
--                     manda e-mail (regra 113, parte Por e-mail).
-- Pode rodar de novo sem estragar nada.

create or replace function public.salvar_promocao(
  p_academia uuid, p_id uuid, p_titulo text, p_detalhes text, p_valida_ate date, p_avisar boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  v_id uuid := p_id;
  v_hoje date := public.hoje_em_brasilia();
  v_titulo text := btrim(coalesce(p_titulo, ''));
  v_detalhes text := nullif(btrim(coalesce(p_detalhes, '')), '');
  v_aviso text;
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  select * into a from public.academias where id = p_academia;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if not public.promocoes_liberadas(a) then
    raise exception 'As promoções são do plano Premium.' using errcode = '42501';
  end if;
  if a.status <> 'published' then
    raise exception 'A academia ainda está em análise: a promoção pode ser criada quando ela estiver no ar.' using errcode = '22023';
  end if;
  if char_length(v_titulo) < 3 or char_length(v_titulo) > 60 then
    raise exception 'Escreva a promoção em até 60 letras (por exemplo, "Primeira aula grátis").' using errcode = '22023';
  end if;
  if char_length(coalesce(v_detalhes, '')) > 280 then
    raise exception 'Os detalhes cabem em até 280 letras.' using errcode = '22023';
  end if;
  if p_valida_ate is null or p_valida_ate < v_hoje or p_valida_ate > v_hoje + 90 then
    raise exception 'Escolha até quando a promoção vale: de hoje até 90 dias.' using errcode = '22023';
  end if;
  if v_id is null then
    if exists (select 1 from public.promocoes
               where academia_id = p_academia and valida_ate >= v_hoje) then
      raise exception 'A academia já tem uma promoção valendo. Mude ou encerre a de agora para publicar outra.' using errcode = '22023';
    end if;
    insert into public.promocoes (academia_id, titulo, detalhes, valida_ate, criada_por)
      values (p_academia, v_titulo, v_detalhes, p_valida_ate, auth.uid())
      returning id into v_id;
    v_aviso := case when coalesce(p_avisar, true) then public.avisar_promocao(v_id) else 'depois' end;
  else
    -- Mudar a que está valendo sempre pode; reabrir uma encerrada, só sem
    -- outra valendo.
    if not exists (select 1 from public.promocoes where id = v_id and valida_ate >= v_hoje)
       and exists (select 1 from public.promocoes
                   where academia_id = p_academia and id <> v_id and valida_ate >= v_hoje) then
      raise exception 'A academia já tem uma promoção valendo. Mude ou encerre a de agora para publicar outra.' using errcode = '22023';
    end if;
    update public.promocoes
      set titulo = v_titulo, detalhes = v_detalhes, valida_ate = p_valida_ate, updated_at = now()
      where id = v_id and academia_id = p_academia;
    if not found then
      raise exception 'Promoção não encontrada.' using errcode = '22023';
    end if;
  end if;
  return jsonb_build_object('id', v_id, 'aviso', v_aviso,
    'avisados', (select avisados from public.promocoes where id = v_id));
end $$;

revoke all on function public.salvar_promocao(uuid, uuid, text, text, date, boolean) from public, anon;
grant execute on function public.salvar_promocao(uuid, uuid, text, text, date, boolean) to authenticated;

notify pgrst, 'reload schema';
