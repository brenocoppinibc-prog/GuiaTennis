-- ============================================================
-- Resumo do mês por e-mail para quem administra a academia (pedido do
-- Breno em 09/10/2026: "para parceiros também é legal algo para relembrar
-- dos números que tiverem mês a mês"; perguntado, "todos, com os números
-- do plano")
-- ============================================================
-- Como o relatório de desempenho do mês do Google Business Profile e o
-- resumo do mês do Booking para parceiros. Mudou a regra 21 (antes, o
-- relatório do mês por e-mail era só do Premium): agora todo plano recebe
-- o resumo com o que já vê no painel, e o Premium recebe o relatório
-- completo.
--
--   Todos: acessos à ficha no mês (com o mês anterior ao lado), avaliações
--          novas no mês (com a média) e as que esperam resposta.
--   Premium: também quem chamou (WhatsApp, Instagram, site), quantos
--          compartilharam a ficha e de onde vieram os acessos.
--
-- Sai com os avisos do dia (10h de Brasília) nos primeiros 7 dias do mês,
-- uma vez por academia e pessoa (a chave da fila tem o mês), para a
-- academia no ar com alguém no Parceiros, a quem tem o e-mail confirmado
-- e os avisos ligados (Perfil › Avisos por e-mail). Os números são os
-- mesmos do painel: o admin e a própria academia logada não contam.
--
-- Pode rodar de novo sem estragar nada.

create or replace function public.mes_por_extenso(d date)
returns text
language sql
immutable
set search_path = ''
as $$
  select (array['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'])[extract(month from d)::int];
$$;

-- p_hoje: só para o teste conferir outro dia do mês.
create or replace function public.preparar_resumos_do_mes(p_hoje date default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
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
             count(*) filter (where c.tipo = 'site'), count(*) filter (where c.tipo = 'compartilhar')
        into v_whats, v_insta, v_site, v_compart
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
             || '. ' || case when v_compart = 1 then '1 pessoa compartilhou' else v_compart || ' pessoas compartilharam' end || ' a ficha.')
        || case when v_origens is not null then public.email_p('<strong>De onde vieram:</strong> ' || public.html_texto(v_origens) || '.') else '' end;
      v_texto := v_texto || E'\n• Quem chamou: WhatsApp ' || v_whats || ' · Instagram ' || v_insta || ' · site ' || v_site
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
end $$;

-- Os avisos do dia (SQL 20261005160000 e 20261009130000) com o lembrete do
-- jogador que não entra há 3 meses e o resumo do mês do Parceiros. Cada um
-- num bloco à parte: um erro num não segura os outros.
create or replace function public.preparar_avisos_do_dia()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.preparar_aviso_de_viagem(null);
  perform public.preparar_avisos_de_academias_novas();
  begin
    perform public.preparar_lembretes_de_ficha();
  exception when others then
    raise warning 'lembrete de conferir a ficha: %', sqlerrm;
  end;
  begin
    perform public.preparar_lembretes_de_volta();
  exception when others then
    raise warning 'lembrete de volta do jogador: %', sqlerrm;
  end;
  begin
    perform public.preparar_resumos_do_mes();
  exception when others then
    raise warning 'resumo do mês: %', sqlerrm;
  end;
  delete from public.emails_a_enviar where criado_em < now() - interval '60 days';
  begin
    execute 'delete from cron.job_run_details where end_time < now() - interval ''7 days''';
  exception when others then
    null;
  end;
end $$;

revoke all on function public.preparar_resumos_do_mes(date) from public, anon, authenticated;
revoke all on function public.preparar_avisos_do_dia() from public, anon, authenticated;
