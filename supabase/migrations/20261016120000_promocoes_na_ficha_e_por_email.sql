-- ============================================================
-- Promoções na ficha e por e-mail (pedido do Breno em 16/10/2026: "quero
-- tirar tudo sobre avisos, unifique tudo como promoção, e uma parte para
-- promoção na ficha e outro por email")
-- ============================================================
-- O que a academia manda por e-mail aos jogadores agora é sempre uma
-- promoção. Os nomes no banco ficam (avisos_das_academias, envios_de_aviso,
-- enviar_aviso_da_academia); mudam os textos que alguém lê.
--   avisos_das_academias.tipo    tudo vira 'promocao' (e o padrão também).
--   enviar_aviso_da_academia     sempre promoção (p_tipo fica, sem efeito);
--                                e-mail "Promoção da <academia>" e as
--                                mensagens de erro falam de promoção.
--   avisar_minha_promocao        sem uso no site: a promoção da ficha vai
--                                por e-mail pela parte "Por e-mail"; os
--                                textos acompanham.
-- Pode rodar de novo sem estragar nada.

update public.avisos_das_academias set tipo = 'promocao' where tipo <> 'promocao';
alter table public.avisos_das_academias alter column tipo set default 'promocao';

create or replace function public.enviar_aviso_da_academia(p_academia uuid, p_titulo text, p_mensagem text, p_tipo text default 'promocao')
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
  v_whats text;
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  select * into a from public.academias where id = p_academia;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if coalesce(a.plano, 'basico') not in ('completo', 'premium') then
    raise exception 'As promoções por e-mail são do Completo e do Premium.' using errcode = '42501';
  end if;
  if not public.academia_no_ar(a) then
    raise exception 'A academia precisa estar no ar para mandar promoções por e-mail.' using errcode = '22023';
  end if;
  if char_length(v_titulo) < 3 or char_length(v_titulo) > 60 then
    raise exception 'Escreva a promoção em até 60 letras (por exemplo, "Primeira aula grátis").' using errcode = '22023';
  end if;
  if char_length(v_mensagem) < 10 or char_length(v_mensagem) > 500 then
    raise exception 'A mensagem precisa ter de 10 a 500 letras.' using errcode = '22023';
  end if;
  if public.avisou_nesta_semana(p_academia) then
    return jsonb_build_object('aviso', 'semana', 'avisados', 0, 'saldo', a.envios_de_aviso);
  end if;
  if coalesce(a.envios_de_aviso, 0) < 1 then
    raise exception 'A academia não tem envios. Compre um pacote de envios para mandar a promoção por e-mail.' using errcode = '22023';
  end if;
  insert into public.avisos_das_academias (academia_id, titulo, mensagem, criado_por, tipo)
    values (p_academia, v_titulo, v_mensagem, auth.uid(), 'promocao')
    returning id into v_id;
  v_link := public.site_dos_emails() || '/academia/' || public.slug_da_academia(a.name, a.id) || '?utm_source=Email-promocao-da-academia';
  v_whats := public.link_whatsapp_do_email(a, 'a promoção "' || v_titulo || '"', 'Email-promocao-da-academia');
  v_caixa := '<div style="margin:6px 0 16px;padding:14px 16px;border:1px solid #D8B865;border-radius:12px;background:#FBF7EC">'
    || '<p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8E6D25">Promoção</p>'
    || '<p style="margin:0;font-size:16px;font-weight:700;color:#1F2A24">' || public.html_texto(v_titulo) || '</p>'
    || '<p style="margin:6px 0 0;font-size:14px;line-height:1.5;color:#1F2A24">' || public.html_texto(v_mensagem) || '</p></div>';
  for j in select * from public.destinatarios_da_academia(p_academia) loop
    v_primeiro := split_part(btrim(j.nome), ' ', 1);
    v_parar := public.link_parar_avisos(j.token_avisos, 'promocoes');
    if public.por_na_fila(
      'aviso-da-academia:' || v_id || ':' || j.user_id, 'aviso_da_academia', j.email,
      'Promoção da ' || a.name || ': ' || v_titulo,
      public.email_montado('Promoção da ' || public.html_texto(a.name),
        public.email_p('Olá, ' || public.html_texto(v_primeiro) || '! A <strong>' || public.html_texto(a.name)
          || '</strong>, ' || case when j.favorita then 'uma das suas academias favoritas no GuiaTennis'
                                  else 'perto de você' || coalesce(', em ' || public.html_texto(nullif(btrim(a.cidade), '')), '') end
          || ', mandou uma promoção:')
        || v_caixa
        || case when v_whats is null then public.email_p('Para combinar, chame a academia pelo WhatsApp da ficha.')
                else public.email_p('Para combinar, chame a academia. Ou <a href="' || public.html_texto(v_link) || '" style="color:#1F4D3A">veja a ficha da academia</a>.') end,
        case when v_whats is null then 'Ver a academia' else 'Chamar no WhatsApp' end, coalesce(v_whats, v_link),
        'Você recebe este e-mail porque pediu, na sua conta do GuiaTennis, promoções das academias favoritas e perto de você. '
        || '<a href="' || public.html_texto(v_parar) || '" style="color:#6B6458">Não quero mais receber</a>'
        || ' · <a href="' || public.html_texto(public.site_dos_emails() || '/perfil') || '" style="color:#6B6458">Mudar o que recebo</a>.'),
      'Olá, ' || v_primeiro || '! A ' || a.name || ', '
        || case when j.favorita then 'uma das suas academias favoritas no GuiaTennis'
                else 'perto de você' || coalesce(', em ' || nullif(btrim(a.cidade), ''), '') end
        || ', mandou uma promoção: ' || v_titulo || E'\n' || v_mensagem
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
