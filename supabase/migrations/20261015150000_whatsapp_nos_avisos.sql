-- ============================================================
-- "Chamar no WhatsApp" nos e-mails de aviso e de promoção (pedido do Breno
-- em 15/10/2026: "crie um atalho para o whatsapp da academia com base nesse
-- assunto")
-- ============================================================
--   url_codificada            o texto pronto para ir num link (%C3%A1…).
--   link_whatsapp_do_email    o link da ficha que abre o WhatsApp da
--                             academia com a mensagem sobre o assunto
--                             (/academia/…?chamar=whatsapp&assunto=…): o site
--                             conta o contato e abre o WhatsApp. Sem WhatsApp
--                             na ficha, vazio.
--   avisar_promocao,          o botão principal vira "Chamar no WhatsApp";
--   enviar_aviso_da_academia  "veja a ficha da academia" fica no texto.
-- Pode rodar de novo sem estragar nada.

create or replace function public.url_codificada(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(string_agg(case when b between 48 and 57 or b between 65 and 90 or b between 97 and 122 or b in (45, 46, 95, 126)
                                  then chr(b) else '%' || upper(lpad(to_hex(b), 2, '0')) end, '' order by i), '')
  from (select get_byte(convert_to(coalesce(p, ''), 'UTF8'), i) as b, i
        from generate_series(0, octet_length(convert_to(coalesce(p, ''), 'UTF8')) - 1) as i) x;
$$;

create or replace function public.link_whatsapp_do_email(a public.academias, p_assunto text, p_origem text)
returns text
language sql
stable
set search_path = ''
as $$
  select case when nullif(regexp_replace(coalesce(a.phone, ''), '\D', '', 'g'), '') is null then null
    else public.site_dos_emails() || '/academia/' || public.slug_da_academia(a.name, a.id)
      || '?chamar=whatsapp&assunto=' || public.url_codificada(left(p_assunto, 120))
      || '&utm_source=' || public.url_codificada(p_origem) end;
$$;

create or replace function public.avisar_promocao(p_promocao uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.promocoes;
  a public.academias;
  j record;
  v_link text;
  v_parar text;
  v_primeiro text;
  v_caixa text;
  v_whats text;
  v_n int := 0;
begin
  select * into p from public.promocoes where id = p_promocao;
  if not found then
    return null;
  end if;
  select * into a from public.academias where id = p.academia_id;
  if public.avisou_nesta_semana(p.academia_id, p.id) then
    return 'semana';
  end if;
  if coalesce(a.envios_de_aviso, 0) < 1 then
    return 'sem_envios';
  end if;
  v_link := public.site_dos_emails() || '/academia/' || public.slug_da_academia(a.name, a.id) || '?utm_source=Email-promocao';
  v_whats := public.link_whatsapp_do_email(a, 'a promoção "' || p.titulo || '"', 'Email-promocao');
  v_caixa := '<div style="margin:6px 0 16px;padding:14px 16px;border:1px solid #D8B865;border-radius:12px;background:#FBF7EC">'
    || '<p style="margin:0;font-size:16px;font-weight:700;color:#1F2A24">' || public.html_texto(p.titulo) || '</p>'
    || case when nullif(btrim(p.detalhes), '') is not null
         then '<p style="margin:6px 0 0;font-size:14px;line-height:1.5;color:#1F2A24">' || public.html_texto(p.detalhes) || '</p>' else '' end
    || '<p style="margin:8px 0 0;font-size:13px;color:#6B6458">Válida até ' || public.data_por_extenso(p.valida_ate) || '</p></div>';
  for j in select * from public.destinatarios_da_academia(p.academia_id) loop
    v_primeiro := split_part(btrim(j.nome), ' ', 1);
    v_parar := public.link_parar_avisos(j.token_avisos, 'promocoes');
    if public.por_na_fila(
      'promocao:' || p.id || ':' || j.user_id, 'promocao', j.email,
      'Promoção na ' || a.name || ': ' || p.titulo,
      public.email_montado('Promoção na ' || public.html_texto(a.name),
        public.email_p('Olá, ' || public.html_texto(v_primeiro) || '! A <strong>' || public.html_texto(a.name)
          || '</strong>, ' || case when j.favorita then 'uma das suas academias favoritas no GuiaTennis'
                                  else 'perto de você' || coalesce(', em ' || public.html_texto(nullif(btrim(a.cidade), '')), '') end
          || ', está com uma promoção:')
        || v_caixa
        || case when v_whats is null then public.email_p('As condições são combinadas direto com a academia, pelo WhatsApp da ficha.')
                else public.email_p('As condições são combinadas direto com a academia. Ou <a href="' || public.html_texto(v_link) || '" style="color:#1F4D3A">veja a ficha da academia</a>.') end,
        case when v_whats is null then 'Ver a academia' else 'Chamar no WhatsApp' end, coalesce(v_whats, v_link),
        'Você recebe este aviso porque pediu, na sua conta do GuiaTennis, avisos e promoções das academias favoritas e perto de você. '
        || '<a href="' || public.html_texto(v_parar) || '" style="color:#6B6458">Não quero mais receber</a>'
        || ' · <a href="' || public.html_texto(public.site_dos_emails() || '/perfil') || '" style="color:#6B6458">Mudar os avisos</a>.'),
      'Olá, ' || v_primeiro || '! A ' || a.name || ', '
        || case when j.favorita then 'uma das suas academias favoritas no GuiaTennis'
                else 'perto de você' || coalesce(', em ' || nullif(btrim(a.cidade), ''), '') end
        || ', está com uma promoção: '
        || p.titulo || coalesce(E'\n' || nullif(btrim(p.detalhes), ''), '')
        || E'\nVálida até ' || public.data_por_extenso(p.valida_ate) || '.'
        || coalesce(E'\n\nChamar no WhatsApp: ' || v_whats, '')
        || E'\n\nVer a academia: ' || v_link
        || E'\n\nNão quer mais receber? ' || v_parar,
      v_parar) then
      v_n := v_n + 1;
    end if;
  end loop;
  update public.promocoes
    set avisados = v_n, avisada_em = case when v_n > 0 then now() end
    where id = p.id;
  if v_n > 0 then
    perform public.gastar_envio_de_aviso(a.id);
  end if;
  return case when v_n > 0 then 'enviado' else 'ninguem' end;
end $$;

create or replace function public.enviar_aviso_da_academia(p_academia uuid, p_titulo text, p_mensagem text, p_tipo text default 'aviso')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  j record;
  v_id uuid;
  v_titulo text := btrim(coalesce(p_titulo, ''));
  v_mensagem text := btrim(coalesce(p_mensagem, ''));
  v_link text;
  v_parar text;
  v_primeiro text;
  v_caixa text;
  v_n int := 0;
  v_promo boolean := coalesce(p_tipo, 'aviso') = 'promocao';
  v_que text;
  v_whats text;
begin
  if coalesce(p_tipo, 'aviso') not in ('aviso', 'promocao') then
    raise exception 'Tipo de aviso inválido.' using errcode = '22023';
  end if;
  v_que := case when v_promo then 'uma promoção' else 'um aviso' end;
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  select * into a from public.academias where id = p_academia;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if coalesce(a.plano, 'basico') not in ('completo', 'premium') then
    raise exception 'Os avisos por e-mail são do Completo e do Premium.' using errcode = '42501';
  end if;
  if not public.academia_no_ar(a) then
    raise exception 'A academia precisa estar no ar para mandar avisos.' using errcode = '22023';
  end if;
  if char_length(v_titulo) < 3 or char_length(v_titulo) > 60 then
    raise exception 'Escreva o assunto em até 60 letras (por exemplo, "Turma nova aos sábados").' using errcode = '22023';
  end if;
  if char_length(v_mensagem) < 10 or char_length(v_mensagem) > 500 then
    raise exception 'A mensagem precisa ter de 10 a 500 letras.' using errcode = '22023';
  end if;
  if public.avisou_nesta_semana(p_academia) then
    return jsonb_build_object('aviso', 'semana', 'avisados', 0, 'saldo', a.envios_de_aviso);
  end if;
  if coalesce(a.envios_de_aviso, 0) < 1 then
    raise exception 'A academia não tem envios de aviso. Compre um pacote de envios para avisar os jogadores.' using errcode = '22023';
  end if;
  insert into public.avisos_das_academias (academia_id, titulo, mensagem, criado_por, tipo)
    values (p_academia, v_titulo, v_mensagem, auth.uid(), case when v_promo then 'promocao' else 'aviso' end)
    returning id into v_id;
  v_link := public.site_dos_emails() || '/academia/' || public.slug_da_academia(a.name, a.id) || '?utm_source=Email-aviso-da-academia';
  v_whats := public.link_whatsapp_do_email(a, case when v_promo then 'a promoção "' else 'o aviso "' end || v_titulo || '"', 'Email-aviso-da-academia');
  v_caixa := '<div style="margin:6px 0 16px;padding:14px 16px;border:1px solid #DCD6C8;border-radius:12px;background:#FAF8F3">'
    || case when v_promo then '<p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8E6D25">Promoção</p>' else '' end
    || '<p style="margin:0;font-size:16px;font-weight:700;color:#1F2A24">' || public.html_texto(v_titulo) || '</p>'
    || '<p style="margin:6px 0 0;font-size:14px;line-height:1.5;color:#1F2A24">' || public.html_texto(v_mensagem) || '</p></div>';
  for j in select * from public.destinatarios_da_academia(p_academia) loop
    v_primeiro := split_part(btrim(j.nome), ' ', 1);
    v_parar := public.link_parar_avisos(j.token_avisos, 'promocoes');
    if public.por_na_fila(
      'aviso-da-academia:' || v_id || ':' || j.user_id, 'aviso_da_academia', j.email,
      case when v_promo then 'Promoção da ' else '' end || a.name || ': ' || v_titulo,
      public.email_montado(case when v_promo then 'Promoção da ' else 'Aviso da ' end || public.html_texto(a.name),
        public.email_p('Olá, ' || public.html_texto(v_primeiro) || '! A <strong>' || public.html_texto(a.name)
          || '</strong>, ' || case when j.favorita then 'uma das suas academias favoritas no GuiaTennis'
                                  else 'perto de você' || coalesce(', em ' || public.html_texto(nullif(btrim(a.cidade), '')), '') end
          || ', mandou ' || v_que || ':')
        || v_caixa
        || case when v_whats is null then public.email_p('Para combinar, chame a academia pelo WhatsApp da ficha.')
                else public.email_p('Para combinar, chame a academia. Ou <a href="' || public.html_texto(v_link) || '" style="color:#1F4D3A">veja a ficha da academia</a>.') end,
        case when v_whats is null then 'Ver a academia' else 'Chamar no WhatsApp' end, coalesce(v_whats, v_link),
        'Você recebe este aviso porque pediu, na sua conta do GuiaTennis, avisos e promoções das academias favoritas e perto de você. '
        || '<a href="' || public.html_texto(v_parar) || '" style="color:#6B6458">Não quero mais receber</a>'
        || ' · <a href="' || public.html_texto(public.site_dos_emails() || '/perfil') || '" style="color:#6B6458">Mudar os avisos</a>.'),
      'Olá, ' || v_primeiro || '! A ' || a.name || ', '
        || case when j.favorita then 'uma das suas academias favoritas no GuiaTennis'
                else 'perto de você' || coalesce(', em ' || nullif(btrim(a.cidade), ''), '') end
        || ', mandou ' || v_que || ': ' || v_titulo || E'\n' || v_mensagem
        || coalesce(E'\n\nChamar no WhatsApp: ' || v_whats, '')
        || E'\n\nVer a academia: ' || v_link
        || E'\n\nNão quer mais receber? ' || v_parar,
      v_parar) then
      v_n := v_n + 1;
    end if;
  end loop;
  update public.avisos_das_academias set avisados = v_n where id = v_id;
  if v_n > 0 then
    perform public.gastar_envio_de_aviso(p_academia);
  end if;
  return jsonb_build_object('id', v_id, 'aviso', case when v_n > 0 then 'enviado' else 'ninguem' end,
    'avisados', v_n, 'saldo', (select envios_de_aviso from public.academias where id = p_academia));
end $$;

notify pgrst, 'reload schema';
