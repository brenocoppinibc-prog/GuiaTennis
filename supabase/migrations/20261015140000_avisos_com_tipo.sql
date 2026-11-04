-- ============================================================
-- Avisos por e-mail também como promoção (pedido do Breno em 15/10/2026:
-- "os avisos por email também podem ser promoções e seria melhor ver uma
-- prévia de como vai a mensagem")
-- ============================================================
--   avisos_das_academias.tipo    'aviso' ou 'promocao'.
--   enviar_aviso_da_academia     ganha p_tipo (vazio = aviso): a promoção
--                                sai como "Promoção da <academia>", com a
--                                etiqueta "Promoção" na caixa da mensagem.
--   avisos_da_minha_academia     devolve o tipo de cada aviso.
-- Pode rodar de novo sem estragar nada.

alter table public.avisos_das_academias add column if not exists tipo text not null default 'aviso';
alter table public.avisos_das_academias drop constraint if exists avisos_das_academias_tipo;
alter table public.avisos_das_academias add constraint avisos_das_academias_tipo check (tipo in ('aviso', 'promocao'));

-- A versão de 3 argumentos sai: chamada com 3, cai nesta (p_tipo vazio).
drop function if exists public.enviar_aviso_da_academia(uuid, text, text);
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
        || public.email_p('Para combinar, chame a academia pelo WhatsApp da ficha.'),
        'Ver a academia', v_link,
        'Você recebe este aviso porque pediu, na sua conta do GuiaTennis, avisos e promoções das academias favoritas e perto de você. '
        || '<a href="' || public.html_texto(v_parar) || '" style="color:#6B6458">Não quero mais receber</a>'
        || ' · <a href="' || public.html_texto(public.site_dos_emails() || '/perfil') || '" style="color:#6B6458">Mudar os avisos</a>.'),
      'Olá, ' || v_primeiro || '! A ' || a.name || ', '
        || case when j.favorita then 'uma das suas academias favoritas no GuiaTennis'
                else 'perto de você' || coalesce(', em ' || nullif(btrim(a.cidade), ''), '') end
        || ', mandou ' || v_que || ': ' || v_titulo || E'\n' || v_mensagem
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

revoke all on function public.enviar_aviso_da_academia(uuid, text, text, text) from public, anon;
grant execute on function public.enviar_aviso_da_academia(uuid, text, text, text) to authenticated;

create or replace function public.avisos_da_minha_academia(p_academia uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.eh_admin() or exists (select 1 from public.academia_vinculos v
                                                 where v.user_id = auth.uid() and v.academia_id = p_academia)
    then jsonb_build_object(
      'saldo', (select envios_de_aviso from public.academias where id = p_academia),
      'avisos', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'titulo', x.titulo, 'mensagem', x.mensagem,
                                                              'avisados', x.avisados, 'created_at', x.created_at, 'tipo', x.tipo)
                                           order by x.created_at desc)
                          from (select * from public.avisos_das_academias
                                where academia_id = p_academia order by created_at desc limit 20) x), '[]'::jsonb),
      'semana', public.avisou_nesta_semana(p_academia))
  end;
$$;

notify pgrst, 'reload schema';
