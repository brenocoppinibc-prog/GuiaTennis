-- ============================================================
-- Reserva online na ficha (pedido do Breno em 10/11/2026, regra 237: "eu
-- queria poder implementar sistema de reserva para não perder para
-- concorrentes, eu consigo trazer outro sistema e fazer que consigam
-- visualizar no site?" ... "começar pelo 1 e 2")
-- ============================================================
-- Como o trivago, que manda para o site que faz a reserva, e o "Reservar"
-- do Perfil da Empresa no Google, que abre o sistema parceiro: a academia
-- informa o link do sistema de reserva que ela já usa, e a ficha ganha o
-- botão "Reservar online" (no Completo e no Premium, como o Instagram e o
-- site). Quando o sistema oferece a agenda para incorporar, ela abre numa
-- janela dentro do GuiaTennis. O GuiaTennis não faz a reserva nem recebe
-- o pagamento: só leva o jogador até o sistema da academia.
--   academias.reserva_link           o link (https, até 300 letras).
--   cliques.tipo = 'reserva'         o clique em "Reservar online": conta
--                                    como contato, num canal próprio.
--   numeros_completos_da_academia,   os mesmos de antes, com a reserva nos
--   numeros_da_academia,             contatos e em "canais"; o resumo do
--   estatisticas_publicas,           mês do Premium diz quantos abriram a
--   preparar_resumos_do_mes          reserva.
-- Pode rodar de novo sem estragar nada.

alter table public.academias add column if not exists reserva_link text;

alter table public.academias drop constraint if exists academias_reserva_link_valido;
alter table public.academias add constraint academias_reserva_link_valido
  check (reserva_link is null
    or (char_length(reserva_link) <= 300 and reserva_link ~ '^https://[^[:space:]<>"]+$'));

grant select (reserva_link) on public.academias to anon, authenticated;

-- A trava e a regra de envio dos cliques aceitam o tipo novo.
alter table public.cliques drop constraint if exists cliques_tipo_valido;
alter table public.cliques add constraint cliques_tipo_valido
  check (tipo in ('acesso_site', 'busca', 'visualizacao', 'whatsapp',
                  'site', 'instagram', 'compartilhar', 'lista_whatsapp', 'contato_salvo', 'reserva'));

drop policy if exists "Registrar clique" on public.cliques;
create policy "Registrar clique" on public.cliques
  for insert
  with check (tipo in ('acesso_site', 'busca', 'visualizacao', 'whatsapp',
                       'site', 'instagram', 'compartilhar', 'lista_whatsapp', 'contato_salvo', 'reserva'));

-- Os números da academia, com a reserva nos contatos e em "canais".
CREATE OR REPLACE FUNCTION public.numeros_completos_da_academia(p_dias integer DEFAULT 30, p_academia uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      'contatos', count(*) filter (where c.tipo in ('whatsapp', 'instagram', 'site', 'reserva')))
    into r
    from public.cliques c
    where c.academia_id = v_id and c.created_at >= v_desde;

  if v_plano in ('completo', 'premium') then
    r := r || jsonb_build_object(
      'canais', (select jsonb_build_object(
          'whatsapp', count(*) filter (where c.tipo = 'whatsapp'),
          'instagram', count(*) filter (where c.tipo = 'instagram'),
          'site', count(*) filter (where c.tipo = 'site'),
          'reserva', count(*) filter (where c.tipo = 'reserva'),
          'compartilhar', count(*) filter (where c.tipo = 'compartilhar'))
        from public.cliques c where c.academia_id = v_id and c.created_at >= v_desde),
      'anterior', case when v_antes is null then null else (select jsonb_build_object(
          'visitas', count(*) filter (where c.tipo = 'visualizacao'),
          'contatos', count(*) filter (where c.tipo in ('whatsapp', 'instagram', 'site', 'reserva')))
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
            count(*) filter (where c.tipo in ('whatsapp', 'instagram', 'site', 'reserva')) as contatos
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
          'contatos', round(count(c.*) filter (where c.tipo in ('whatsapp', 'instagram', 'site', 'reserva'))::numeric / greatest(count(distinct a.id), 1), 1))
        from public.academias a
        left join public.cliques c on c.academia_id = a.id and c.created_at >= v_desde
        where a.status = 'published' and v_cidade is not null and a.cidade = v_cidade));
  end if;

  return r;
end $function$;

-- O que cada plano vê (SQL 20261105130000), com a reserva nos contatos do Completo.
CREATE OR REPLACE FUNCTION public.numeros_da_academia(p_dias integer DEFAULT 30, p_academia uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      || case when v_plano = 'completo' then jsonb_build_object('contatos',
           (select count(*) from public.cliques c
            where c.academia_id = v_id and c.tipo in ('whatsapp', 'instagram', 'site', 'reserva') and c.created_at >= v_desde))
         else '{}'::jsonb end;
  end if;
  r := public.numeros_completos_da_academia(p_dias, p_academia);
  v_dias := coalesce((r->>'dias')::int, 30);
  return r || jsonb_build_object('guardaram', public.guardaram_da_academia(v_id,
    case when v_dias = 0 then '-infinity'::timestamptz
      else ((v_hoje - (v_dias - 1)) at time zone 'America/Sao_Paulo') end));
end $function$;

-- Os totais do site.
CREATE OR REPLACE FUNCTION public.estatisticas_publicas()
 RETURNS TABLE(acessos_total bigint, buscas_total bigint, fichas_total bigint, contatos_total bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    count(*) filter (where tipo = 'acesso_site'),
    count(*) filter (where tipo = 'busca'),
    count(*) filter (where tipo = 'visualizacao'),
    count(*) filter (where tipo in ('whatsapp','site','instagram','reserva'))
  from public.cliques;
$function$;

-- O resumo do mês (SQL 20261009150000): no Premium, quantos abriram a reserva.
CREATE OR REPLACE FUNCTION public.preparar_resumos_do_mes(p_hoje date DEFAULT NULL::date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_hoje date := coalesce(p_hoje, public.hoje_em_brasilia());
  v_ini date := (date_trunc('month', v_hoje) - interval '1 month')::date;
  v_fim date := date_trunc('month', v_hoje)::date;
  v_ant date := (date_trunc('month', v_hoje) - interval '2 months')::date;
  v_ini_ts timestamptz := v_ini::timestamp at time zone 'America/Sao_Paulo';
  v_fim_ts timestamptz := v_fim::timestamp at time zone 'America/Sao_Paulo';
  v_ant_ts timestamptz := v_ant::timestamp at time zone 'America/Sao_Paulo';
  v_mes text := public.mes_por_extenso(v_ini);
  v_mes_ant text := public.mes_por_extenso(v_ant);
  a record;
  r record;
  v_acessos int;
  v_antes int;
  v_aval int;
  v_media numeric;
  v_sem_resposta int;
  v_whats int;
  v_insta int;
  v_site int;
  v_reserva int;
  v_compart int;
  v_origens text;
  v_premium boolean;
  v_linha text;
  v_corpo text;
  v_texto text;
  v_link text;
  v_botao text;
  v_parar text;
  v_n int := 0;
  -- Um número grande com a legenda embaixo, como o relatório do Google.
  numero constant text := '<td style="padding:10px 12px;background:#F6F1E7;border-radius:10px;vertical-align:top">';
begin
  if extract(day from v_hoje) > 7 then
    return 0;
  end if;
  for a in
    select x.id, x.name, coalesce(x.plano, 'basico') as plano
    from public.academias x
    where public.academia_no_ar(x)
      and coalesce(x.publicada_em, x.created_at) < v_fim_ts
      and exists (select 1 from public.academia_vinculos v where v.academia_id = x.id)
  loop
    select count(*) filter (where c.created_at >= v_ini_ts),
           count(*) filter (where c.created_at < v_ini_ts)
      into v_acessos, v_antes
      from public.cliques c
      where c.academia_id = a.id and c.tipo = 'visualizacao'
        and c.created_at >= v_ant_ts and c.created_at < v_fim_ts;
    select count(*), round(avg(v.stars)::numeric, 1) into v_aval, v_media
      from public.avaliacoes v
      where v.academia_id = a.id and v.created_at >= v_ini_ts and v.created_at < v_fim_ts;
    select count(*) into v_sem_resposta
      from public.avaliacoes v
      where v.academia_id = a.id and not exists (select 1 from public.respostas x where x.avaliacao_id = v.id);
    v_premium := a.plano = 'premium';

    v_linha := case
      when v_antes = 0 then ''
      when v_acessos = v_antes then 'O mesmo número de ' || v_mes_ant || '.'
      when v_acessos > v_antes then round((v_acessos - v_antes) * 100.0 / v_antes) || '% a mais que em ' || v_mes_ant || ' (' || v_antes || ').'
      else round((v_antes - v_acessos) * 100.0 / v_antes) || '% a menos que em ' || v_mes_ant || ' (' || v_antes || ').'
    end;
    v_corpo := public.email_p('Os números da ficha da <strong>' || public.html_texto(a.name) || '</strong> no GuiaTennis em ' || v_mes || ':')
      || '<table role="presentation" cellpadding="0" cellspacing="6" border="0" style="width:100%;border-collapse:separate;margin:0 0 8px"><tr>'
      || numero || '<div style="font-size:26px;font-weight:bold;color:#1F4D3A">' || v_acessos || '</div>'
      || '<div style="font-size:13px;color:#6B6458">' || case when v_acessos = 1 then 'acesso à ficha' else 'acessos à ficha' end || '</div></td>'
      || numero || '<div style="font-size:26px;font-weight:bold;color:#1F4D3A">' || v_aval || '</div>'
      || '<div style="font-size:13px;color:#6B6458">' || case when v_aval = 1 then 'avaliação nova' else 'avaliações novas' end
      || case when v_aval > 0 then ' · média ' || replace(v_media::text, '.', ',') || ' ★' else '' end || '</div></td>'
      || '</tr></table>'
      || case when v_linha <> '' then '<p style="margin:0 0 12px;font-size:13px;color:#6B6458">Acessos: ' || v_linha || '</p>' else '' end;
    v_texto := 'Os números da ficha da ' || a.name || ' no GuiaTennis em ' || v_mes || E':\n\n'
      || '• ' || v_acessos || case when v_acessos = 1 then ' acesso à ficha' else ' acessos à ficha' end
      || case when v_linha <> '' then ' (' || v_linha || ')' else '' end || E'\n'
      || '• ' || v_aval || case when v_aval = 1 then ' avaliação nova' else ' avaliações novas' end
      || case when v_aval > 0 then ' (média ' || replace(v_media::text, '.', ',') || ' ★)' else '' end;

    if v_premium then
      select count(*) filter (where c.tipo = 'whatsapp'), count(*) filter (where c.tipo = 'instagram'),
             count(*) filter (where c.tipo = 'site'), count(*) filter (where c.tipo = 'compartilhar'),
             count(*) filter (where c.tipo = 'reserva')
        into v_whats, v_insta, v_site, v_compart, v_reserva
        from public.cliques c
        where c.academia_id = a.id and c.created_at >= v_ini_ts and c.created_at < v_fim_ts;
      select string_agg(o.nome || ' (' || o.n || ')', ', ' order by o.n desc, o.nome) into v_origens
        from (select coalesce(nullif(c.origem, ''), 'Direto') as nome, count(*) as n
              from public.cliques c
              where c.academia_id = a.id and c.tipo = 'visualizacao'
                and c.created_at >= v_ini_ts and c.created_at < v_fim_ts
              group by 1 order by 2 desc, 1 limit 3) o;
      v_corpo := v_corpo
        || public.email_p('<strong>Quem chamou:</strong> WhatsApp ' || v_whats || ' · Instagram ' || v_insta || ' · site ' || v_site
             || case when v_reserva > 0 then ' · reserva online ' || v_reserva else '' end
             || '. ' || case when v_compart = 1 then '1 pessoa compartilhou' else v_compart || ' pessoas compartilharam' end || ' a ficha.')
        || case when v_origens is not null then public.email_p('<strong>De onde vieram:</strong> ' || public.html_texto(v_origens) || '.') else '' end;
      v_texto := v_texto || E'\n• Quem chamou: WhatsApp ' || v_whats || ' · Instagram ' || v_insta || ' · site ' || v_site
             || case when v_reserva > 0 then ' · reserva online ' || v_reserva else '' end
        || E'\n• Compartilharam a ficha: ' || v_compart
        || case when v_origens is not null then E'\n• De onde vieram: ' || v_origens else '' end;
    end if;

    if v_sem_resposta > 0 then
      v_corpo := v_corpo || public.email_p(case when v_sem_resposta = 1 then '1 avaliação espera' else v_sem_resposta || ' avaliações esperam' end
        || ' resposta. Responder mostra aos próximos jogadores que a academia cuida de quem joga lá.');
      v_texto := v_texto || E'\n\n' || case when v_sem_resposta = 1 then '1 avaliação espera' else v_sem_resposta || ' avaliações esperam' end
        || ' resposta. Responder mostra aos próximos jogadores que a academia cuida de quem joga lá.';
    end if;

    v_botao := case when v_premium then 'Ver o desempenho' else 'Abrir o GuiaTennis Parceiros' end;
    v_link := public.site_dos_emails() || '/parceiros/' || case when v_premium then 'desempenho' else 'painel' end
      || '?abrir=' || right(replace(a.id::text, '-', ''), 8) || '&utm_source=Email-resumo';

    for r in select * from public.quem_recebe_da_academia(a.id) loop
      v_parar := public.link_parar_avisos(r.token_avisos, 'parceiros');
      if public.por_na_fila(
        'resumo:' || a.id || ':' || r.user_id || ':' || to_char(v_ini, 'YYYY-MM'), 'resumo_do_mes', r.email,
        initcap(v_mes) || ' na ' || a.name || ': ' || v_acessos || case when v_acessos = 1 then ' acesso à ficha' else ' acessos à ficha' end,
        public.email_montado('O mês de ' || v_mes || ' na ' || a.name, v_corpo, v_botao, v_link,
          'Você recebe este resumo todo começo de mês porque administra a ' || public.html_texto(a.name)
          || ' no GuiaTennis Parceiros. <a href="' || public.html_texto(v_parar)
          || '" style="color:#6B6458">Não quero mais receber avisos por e-mail</a>.'),
        v_texto || E'\n\n' || v_botao || ': ' || v_link
          || E'\n\nNão quer mais receber avisos por e-mail? ' || v_parar,
        v_parar) then
        v_n := v_n + 1;
      end if;
    end loop;
  end loop;
  return v_n;
end $function$;

notify pgrst, 'reload schema';
