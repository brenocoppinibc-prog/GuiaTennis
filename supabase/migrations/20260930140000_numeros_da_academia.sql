-- ============================================================
-- Números da academia no GuiaTennis Parceiros (30/09/2026)
-- ============================================================
-- Como o "Desempenho" do Google Business Profile e o trivago Business
-- Studio: a academia vê quantas pessoas abriram a ficha e chamaram, e o
-- plano decide o quanto de detalhe aparece. Quem confere o plano é o banco:
-- a tela só mostra o que a função devolve.
--
--   Básico (grátis)  visitas e contatos dos últimos 30 dias
--   Completo         + dia a dia, até 90 dias, período anterior, canais,
--                      de onde vieram e aparelho
--   Premium          + bairros de quem procurou antes de abrir a ficha,
--                      média das academias da cidade e o histórico inteiro
--
-- Nada identifica ninguém: são contagens da tabela cliques, que já guarda
-- só origem, aparelho e a região da busca (ver GUIATENNIS-CONTEXTO.md,
-- regra 9). A posição na busca não depende do plano.
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
  v_cidade text;
  v_dias int;
  v_desde timestamptz;
  v_antes timestamptz;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  r jsonb;
begin
  -- A academia vê só a dela. O admin pode abrir a de qualquer uma.
  if p_academia is not null and public.eh_admin() then
    v_id := p_academia;
  else
    select academia_id into v_id from public.academia_acessos
      where user_id = auth.uid() limit 1;
  end if;
  if v_id is null then
    raise exception 'Sem acesso aos números dessa academia.' using errcode = '42501';
  end if;
  select coalesce(a.plano, 'basico'), a.cidade into v_plano, v_cidade
    from public.academias a where a.id = v_id;

  -- Período que o plano libera. 0 = desde o começo (só premium).
  v_dias := case
    when v_plano = 'premium' then case when coalesce(p_dias, 30) <= 0 then 0 else least(p_dias, 3650) end
    when v_plano = 'completo' then least(greatest(coalesce(p_dias, 30), 7), 90)
    else 30 end;
  v_desde := case when v_dias = 0 then '-infinity'::timestamptz
    else ((v_hoje - (v_dias - 1)) at time zone 'America/Sao_Paulo') end;
  v_antes := case when v_dias = 0 then null
    else ((v_hoje - (2 * v_dias - 1)) at time zone 'America/Sao_Paulo') end;

  select jsonb_build_object(
      'plano', v_plano,
      'dias', v_dias,
      'visitas', count(*) filter (where c.tipo = 'visualizacao'),
      'contatos', count(*) filter (where c.tipo in ('whatsapp', 'instagram', 'site')))
    into r
    from public.cliques c
    where c.academia_id = v_id and c.created_at >= v_desde;

  if v_plano in ('completo', 'premium') then
    r := r || jsonb_build_object(
      'canais', (select jsonb_build_object(
          'whatsapp', count(*) filter (where c.tipo = 'whatsapp'),
          'instagram', count(*) filter (where c.tipo = 'instagram'),
          'site', count(*) filter (where c.tipo = 'site'),
          'compartilhar', count(*) filter (where c.tipo = 'compartilhar'))
        from public.cliques c where c.academia_id = v_id and c.created_at >= v_desde),
      'anterior', case when v_antes is null then null else (select jsonb_build_object(
          'visitas', count(*) filter (where c.tipo = 'visualizacao'),
          'contatos', count(*) filter (where c.tipo in ('whatsapp', 'instagram', 'site')))
        from public.cliques c
        where c.academia_id = v_id and c.created_at >= v_antes and c.created_at < v_desde) end,
      'por_dia', (select coalesce(jsonb_agg(jsonb_build_object(
            'dia', d.dia, 'visitas', coalesce(x.visitas, 0), 'contatos', coalesce(x.contatos, 0))
          order by d.dia), '[]'::jsonb)
        from (select g::date as dia from generate_series(
            (case when v_dias = 0 then coalesce((select min((c.created_at at time zone 'America/Sao_Paulo')::date)
              from public.cliques c where c.academia_id = v_id), v_hoje) else v_hoje - (v_dias - 1) end)::timestamp,
            v_hoje::timestamp, interval '1 day') as g) d
        left join (select (c.created_at at time zone 'America/Sao_Paulo')::date as dia,
            count(*) filter (where c.tipo = 'visualizacao') as visitas,
            count(*) filter (where c.tipo in ('whatsapp', 'instagram', 'site')) as contatos
          from public.cliques c where c.academia_id = v_id and c.created_at >= v_desde
          group by 1) x on x.dia = d.dia),
      'origens', (select coalesce(jsonb_agg(jsonb_build_object('nome', o.nome, 'n', o.n) order by o.n desc, o.nome), '[]'::jsonb)
        from (select coalesce(nullif(c.origem, ''), 'Direto') as nome, count(*) as n
          from public.cliques c
          where c.academia_id = v_id and c.tipo = 'visualizacao' and c.created_at >= v_desde
          group by 1 order by 2 desc limit 8) o),
      'aparelhos', (select coalesce(jsonb_agg(jsonb_build_object('nome', a.nome, 'n', a.n) order by a.n desc, a.nome), '[]'::jsonb)
        from (select coalesce(nullif(c.dispositivo, ''), 'Não informado') as nome, count(*) as n
          from public.cliques c
          where c.academia_id = v_id and c.tipo = 'visualizacao' and c.created_at >= v_desde
          group by 1) a));
  end if;

  if v_plano = 'premium' then
    r := r || jsonb_build_object(
      'regioes', (select coalesce(jsonb_agg(jsonb_build_object('nome', g.nome, 'n', g.n) order by g.n desc, g.nome), '[]'::jsonb)
        from (select c.detalhe as nome, count(*) as n
          from public.cliques c
          where c.academia_id = v_id and c.tipo = 'visualizacao' and c.created_at >= v_desde
            and coalesce(c.detalhe, '') <> ''
          group by 1 order by 2 desc limit 8) g),
      -- Média por academia publicada da mesma cidade, no mesmo período.
      'media_cidade', (select jsonb_build_object(
          'cidade', v_cidade,
          'academias', count(distinct a.id),
          'visitas', round(count(c.*) filter (where c.tipo = 'visualizacao')::numeric / greatest(count(distinct a.id), 1), 1),
          'contatos', round(count(c.*) filter (where c.tipo in ('whatsapp', 'instagram', 'site'))::numeric / greatest(count(distinct a.id), 1), 1))
        from public.academias a
        left join public.cliques c on c.academia_id = a.id and c.created_at >= v_desde
        where a.status = 'published' and v_cidade is not null and a.cidade = v_cidade));
  end if;

  return r;
end $$;

revoke all on function public.numeros_da_academia(int, uuid) from public, anon;
grant execute on function public.numeros_da_academia(int, uuid) to authenticated;

notify pgrst, 'reload schema';
