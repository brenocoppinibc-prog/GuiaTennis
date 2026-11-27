-- "Você marcou?" mais cedo e sem repetir a frase na notificação (regra 297, 17/11/2026).
--
-- Antes: a pergunta saía no dia seguinte à chamada, das 10h às 21h, e o título
-- dentro do e-mail era igual ao assunto ("Você marcou na …?"), então o aviso do
-- celular mostrava a mesma frase duas vezes (o assunto e o começo do e-mail).
--
-- Agora:
--   * banco de verdade: duas horas depois da chamada, das 9h às 21h (Brasília);
--     chamada depois das 19h sai às 9h do dia seguinte;
--   * banco de teste (o site dos e-mails não é o guiatennis.com.br): 10 minutos
--     depois, a qualquer hora, para testar na prévia;
--   * o assunto continua "Você marcou na …?"; o título do e-mail passa a ser
--     "Receba como chegar duas horas antes".
-- Pode rodar de novo sem estragar (create or replace).

create or replace function public.rodar_acompanhamentos(p_agora timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_n int := 0;
  v_agora timestamp := p_agora at time zone 'America/Sao_Paulo';
  v_primeiro text;
  v_parar text;
  v_rodape text;
  v_corpo text;
  v_texto text;
  v_botoes text;
  v_aula boolean;
  v_loc boolean;
  v_oque text;
  v_dia text;
  v_hora text;
  v_endereco text;
  v_rota text;
  v_whats text;
  v_ficha text;
  v_linha text;
  v_oque_linha text;
  v_teste boolean;
begin
  -- 4.1 "Você marcou?": duas horas depois da chamada, das 9h às 21h (regra 297);
  -- no banco de teste, 10 minutos depois, a qualquer hora.
  v_teste := public.site_dos_emails() <> 'https://guiatennis.com.br';
  if v_teste or extract(hour from v_agora) between 9 and 20 then
    for r in
      select x.id, x.chave, x.criado_em, j.nome, j.email, j.token_avisos, a.name as academia, a.modalidades
      from public.acompanhamentos x
      join public.jogadores j on j.user_id = x.user_id
      join public.academias a on a.id = x.academia_id
      where x.status = 'aguardando' and x.perguntado_em is null
        and x.criado_em <= p_agora - case when v_teste then interval '10 minutes' else interval '2 hours' end
        and x.criado_em > p_agora - interval '7 days'
        and j.acompanhamento and j.email_confirmado_em is not null
      order by x.criado_em
      limit 300
    loop
      v_primeiro := nullif(split_part(btrim(coalesce(r.nome, '')), ' ', 1), '');
      v_parar := public.link_parar_avisos(r.token_avisos, 'acompanhamento');
      v_aula := coalesce(r.modalidades, '[]'::jsonb) ? 'aulas_proprias' or not (coalesce(r.modalidades, '[]'::jsonb) ? 'locacao');
      v_loc := coalesce(r.modalidades, '[]'::jsonb) ? 'locacao' or not (coalesce(r.modalidades, '[]'::jsonb) ? 'aulas_proprias');
      v_botoes := '<p style="margin:18px 0 4px">'
        || case when v_aula then '<a href="' || public.html_texto(public.link_do_acompanhamento(r.chave, 'aula')) || '" style="display:inline-block;margin:0 8px 8px 0;background:#1F4D3A;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 18px;border-radius:10px">Marquei aula</a>' else '' end
        || case when v_loc then '<a href="' || public.html_texto(public.link_do_acompanhamento(r.chave, 'locacao')) || '" style="display:inline-block;margin:0 8px 8px 0;background:#1F4D3A;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 18px;border-radius:10px">Marquei locação</a>' else '' end
        || '<a href="' || public.html_texto(public.link_do_acompanhamento(r.chave, 'nao')) || '" style="display:inline-block;margin:0 8px 8px 0;background:#FFFFFF;color:#1F4D3A;text-decoration:none;font-weight:bold;font-size:15px;padding:11px 17px;border-radius:10px;border:1px solid #1F4D3A">Ainda não</a>'
        || '</p>';
      v_corpo := public.email_p('Olá' || coalesce(', <strong>' || public.html_texto(v_primeiro) || '</strong>', '')
          || '. No dia ' || public.data_por_extenso((r.criado_em at time zone 'America/Sao_Paulo')::date)
          || ', você chamou a <strong>' || public.html_texto(r.academia) || '</strong> pelo GuiaTennis.')
        || public.email_p('Se marcou, conte o dia e a hora: além de como chegar, mandamos a regra de cancelamento e reposição.')
        || v_botoes;
      v_texto := 'Olá' || coalesce(', ' || v_primeiro, '') || '. No dia '
        || public.data_por_extenso((r.criado_em at time zone 'America/Sao_Paulo')::date)
        || ', você chamou a ' || r.academia || E' pelo GuiaTennis.\n\nSe marcou, conte o dia e a hora: duas horas antes, mandamos como chegar e a regra de cancelamento e reposição.\n\n'
        || case when v_aula then 'Marquei aula: ' || public.link_do_acompanhamento(r.chave, 'aula') || E'\n' else '' end
        || case when v_loc then 'Marquei locação: ' || public.link_do_acompanhamento(r.chave, 'locacao') || E'\n' else '' end
        || 'Ainda não: ' || public.link_do_acompanhamento(r.chave, 'nao');
      v_rodape := 'Você recebe este e-mail porque chamou uma academia pelo GuiaTennis com a sua conta. '
        || '<a href="' || public.html_texto(v_parar) || '" style="color:#6B6458">Não quero mais este acompanhamento</a>.';
      perform public.por_na_fila('acomp-pergunta:' || r.id, 'acompanhamento', r.email,
        'Você marcou na ' || r.academia || '?',
        public.email_montado('Receba como chegar duas horas antes', v_corpo, null, null, v_rodape),
        v_texto || E'\n\nNão quer mais este acompanhamento? ' || v_parar, v_parar);
      update public.acompanhamentos set perguntado_em = now() where id = r.id;
      v_n := v_n + 1;
    end loop;
  end if;

  -- 4.2 O lembrete, duas horas antes.
  for r in
    select x.id, x.chave, x.tipo, x.quando, x.instrucoes, j.email, j.token_avisos, a as academia_linha
    from public.acompanhamentos x
    join public.jogadores j on j.user_id = x.user_id
    join public.academias a on a.id = x.academia_id
    where x.status = 'marcou' and x.lembrado_em is null
      and x.quando > p_agora and x.quando <= p_agora + interval '2 hours 5 minutes'
      and j.acompanhamento and j.email_confirmado_em is not null
    order by x.quando
    limit 300
  loop
    v_parar := public.link_parar_avisos(r.token_avisos, 'acompanhamento');
    v_oque := case when r.tipo = 'locacao' then 'Locação' else 'Aula' end;
    v_dia := case when (r.quando at time zone 'America/Sao_Paulo')::date = v_agora::date then 'hoje' else 'amanhã' end;
    v_hora := public.hora_por_extenso(r.quando);
    v_endereco := coalesce(public.texto_das_instrucoes(r.instrucoes, 'endereco', 200),
      nullif(concat_ws(', ', nullif(btrim(concat_ws(', ', nullif(btrim((r.academia_linha).address), ''), nullif(btrim((r.academia_linha).numero), ''))), ''),
        nullif(btrim((r.academia_linha).bairro), ''), nullif(btrim((r.academia_linha).cidade), '')), ''));
    v_rota := 'https://www.google.com/maps/dir/?api=1&destination='
      || case when (r.academia_linha).lat is not null and (r.academia_linha).lng is not null
           then (r.academia_linha).lat::text || '%2C' || (r.academia_linha).lng::text
           else public.url_codificada(coalesce(v_endereco, (r.academia_linha).name)) end;
    v_whats := public.link_whatsapp_do_email(r.academia_linha,
      case when r.tipo = 'locacao' then 'a locação marcada ' else 'a aula marcada ' end || v_dia || ' às ' || v_hora, 'Email-lembrete');
    v_ficha := public.site_dos_emails() || '/academia/' || public.slug_da_academia((r.academia_linha).name, (r.academia_linha).id) || '?utm_source=Email-lembrete';
    v_corpo := public.email_p('<strong>' || public.html_texto((r.academia_linha).name) || '</strong>'
        || coalesce('<br>' || public.html_texto(v_endereco), ''));
    v_texto := (r.academia_linha).name || coalesce(E'\n' || v_endereco, '');
    for v_linha, v_oque_linha in
      select t.rotulo, t.valor from (values
        (1, 'Na chegada', public.texto_das_instrucoes(r.instrucoes, 'chegada', 600)),
        (2, 'Estacionamento', public.texto_das_instrucoes(r.instrucoes, 'estacionamento', 600)),
        (3, 'Cancelamento e reposição', public.texto_das_instrucoes(r.instrucoes, 'cancelamento', 800))
      ) as t(o, rotulo, valor)
      where t.valor is not null order by t.o
    loop
      v_corpo := v_corpo || public.email_p('<strong>' || public.html_texto(v_linha) || ':</strong> ' || public.html_texto(v_oque_linha));
      v_texto := v_texto || E'\n\n' || v_linha || ': ' || v_oque_linha;
    end loop;
    v_corpo := v_corpo || public.email_p(
      case when v_whats is not null then '<a href="' || public.html_texto(v_whats) || '" style="color:#1F4D3A;font-weight:bold">Falar com a academia no WhatsApp</a> · ' else '' end
      || '<a href="' || public.html_texto(v_ficha) || '" style="color:#1F4D3A;font-weight:bold">Ver a ficha</a>');
    v_texto := v_texto || coalesce(E'\n\nFalar com a academia no WhatsApp: ' || v_whats, '') || E'\nVer a ficha: ' || v_ficha;
    v_rodape := 'Você recebe este lembrete porque contou ao GuiaTennis que marcou este horário. Não vai mais? '
      || '<a href="' || public.html_texto(public.link_do_acompanhamento(r.chave, 'cancelar')) || '" style="color:#6B6458">Tirar o lembrete</a>. '
      || '<a href="' || public.html_texto(v_parar) || '" style="color:#6B6458">Não quero mais este acompanhamento</a>.';
    perform public.por_na_fila('acomp-lembrete:' || r.id || ':' || to_char(r.quando at time zone 'UTC', 'YYYYMMDDHH24MI'), 'acompanhamento', r.email,
      v_oque || ' ' || v_dia || ' às ' || v_hora || ': ' || (r.academia_linha).name,
      public.email_montado(v_oque || ' ' || v_dia || ' às ' || v_hora, v_corpo, 'Como chegar', v_rota, v_rodape),
      v_oque || ' ' || v_dia || ' às ' || v_hora || E'\n\n' || v_texto || E'\n\nComo chegar: ' || v_rota
        || E'\n\nNão vai mais? Tirar o lembrete: ' || public.link_do_acompanhamento(r.chave, 'cancelar')
        || E'\nNão quer mais este acompanhamento? ' || v_parar,
      v_parar);
    update public.acompanhamentos set lembrado_em = now() where id = r.id;
    v_n := v_n + 1;
  end loop;

  -- 4.3 "Como foi?": três horas depois, das 9h às 21h, para quem ainda não
  -- avaliou a academia.
  if extract(hour from v_agora) between 9 and 20 then
    for r in
      select x.id, x.tipo, j.nome, j.email, j.token_avisos, a.id as academia_id, a.name as academia
      from public.acompanhamentos x
      join public.jogadores j on j.user_id = x.user_id
      join public.academias a on a.id = x.academia_id
      where x.status = 'marcou' and x.como_foi_em is null
        and x.quando <= p_agora - interval '3 hours' and x.quando > p_agora - interval '3 days'
        and j.acompanhamento and j.email_confirmado_em is not null
        and not exists (select 1 from public.avaliacoes v where v.user_id = x.user_id and v.academia_id = x.academia_id)
      order by x.quando
      limit 300
    loop
      v_primeiro := nullif(split_part(btrim(coalesce(r.nome, '')), ' ', 1), '');
      v_parar := public.link_parar_avisos(r.token_avisos, 'acompanhamento');
      v_ficha := public.site_dos_emails() || '/academia/' || public.slug_da_academia(r.academia, r.academia_id) || '?utm_source=Email-como-foi#avaliacoes';
      v_corpo := public.email_p('Olá' || coalesce(', <strong>' || public.html_texto(v_primeiro) || '</strong>', '')
          || '. Conte como foi a ' || case when r.tipo = 'locacao' then 'locação' else 'aula' end
          || ' na <strong>' || public.html_texto(r.academia) || '</strong>: a sua avaliação ajuda outros jogadores a escolher.');
      perform public.por_na_fila('acomp-como-foi:' || r.id, 'acompanhamento', r.email,
        'Como foi na ' || r.academia || '?',
        public.email_montado('Como foi na ' || r.academia || '?', v_corpo, 'Avaliar a academia', v_ficha,
          'Você recebe este e-mail porque contou ao GuiaTennis que marcou um horário. '
          || '<a href="' || public.html_texto(v_parar) || '" style="color:#6B6458">Não quero mais este acompanhamento</a>.'),
        'Olá' || coalesce(', ' || v_primeiro, '') || '. Conte como foi a ' || case when r.tipo = 'locacao' then 'locação' else 'aula' end
          || ' na ' || r.academia || E': a sua avaliação ajuda outros jogadores a escolher.\n\nAvaliar a academia: ' || v_ficha
          || E'\n\nNão quer mais este acompanhamento? ' || v_parar,
        v_parar);
      update public.acompanhamentos set como_foi_em = now() where id = r.id;
      v_n := v_n + 1;
    end loop;
  end if;

  -- 4.4 Nada fica guardado depois de 60 dias.
  delete from public.acompanhamentos where criado_em < p_agora - interval '60 days';
  return v_n;
end $$;

notify pgrst, 'reload schema';
