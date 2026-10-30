-- ============================================================
-- Adicional de Promoções no Completo e o aviso para quem está perto
-- (pedido do Breno em 14/10/2026: "quero que o plano completo possa pagar
-- um adicional para as promoções e que as notificações possam ser enviadas
-- por academias sobre promoções também"; quem recebe: "todos")
-- ============================================================
--   academias.adicional_promocoes  o admin liga no painel; vale no Completo.
--                        Só o admin muda (proteger_ficha_da_academia).
--   promocoes_liberadas  Premium, ou Completo com o adicional.
--   avisar_promocao      vai para quem ligou "Promoções" na conta e
--                        favoritou a academia OU está perto dela: a cidade da
--                        conta ou das preferências é a da academia, ou uma
--                        busca salva ou a última busca fica a até 25 km.
--                        Continua: e-mail confirmado, nunca quem administra a
--                        academia, no máximo um aviso por academia a cada 7
--                        dias.
--   salvar_promocao      ganha p_avisar: a academia escolhe se avisa ao
--                        publicar.
--   avisar_minha_promocao a academia avisa depois, numa promoção valendo
--                        que ainda não avisou ninguém.
-- Pode rodar de novo sem estragar nada.

alter table public.academias add column if not exists adicional_promocoes boolean not null default false;
grant select (adicional_promocoes) on public.academias to anon, authenticated;

create or replace function public.promocoes_liberadas(a public.academias)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(a.plano, 'basico') = 'premium'
      or (coalesce(a.plano, 'basico') = 'completo' and coalesce(a.adicional_promocoes, false));
$$;

create or replace function public.promocao_visivel(p_academia uuid, p_valida_ate date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_valida_ate >= public.hoje_em_brasilia()
     and exists (select 1 from public.academias a
                 where a.id = p_academia and public.promocoes_liberadas(a) and public.academia_no_ar(a));
$$;

-- O gatilho que protege a ficha (igual ao do SQL 20261006140000), agora
-- também com o adicional: só o admin liga ou desliga.
create or replace function public.proteger_ficha_da_academia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pausa boolean := coalesce(current_setting('guiatennis.pausa_da_academia', true), '') = 'sim';
  v_no_ar boolean := coalesce(current_setting('guiatennis.academia_nova_no_ar', true), '') = old.id::text;
  v_linha public.academias;
begin
  if v_no_ar then
    return new;
  end if;
  if v_pausa then
    v_linha := old;
    v_linha.pausada := new.pausada;
    v_linha.pausada_ate := new.pausada_ate;
    v_linha.pausada_pela_academia := new.pausada_pela_academia;
    return v_linha;
  end if;
  if auth.uid() is null or public.eh_admin() then
    if new.pausada is distinct from old.pausada or new.pausada_ate is distinct from old.pausada_ate then
      new.pausada_pela_academia := false;
    end if;
    return new;
  end if;
  new.id := old.id;
  new.created_at := old.created_at;
  new.status := old.status;
  new.pago := old.pago;
  new.plano := old.plano;
  new.adicional_promocoes := old.adicional_promocoes;
  new.pausada := old.pausada;
  new.pausada_ate := old.pausada_ate;
  new.pausada_pela_academia := old.pausada_pela_academia;
  new.source := old.source;
  new.nome_solicitante := old.nome_solicitante;
  new.contato_solicitante := old.contato_solicitante;
  new.revisar_desde := old.revisar_desde;
  new.confirmada := true;
  update public.academia_vinculos
    set ficha_atualizada_em = now()
    where user_id = auth.uid() and academia_id = new.id;
  update public.academia_acessos
    set ficha_atualizada_em = now()
    where user_id = auth.uid() and academia_id = new.id;
  return new;
end $$;

-- O aviso por e-mail da promoção ------------------------------------------
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
  v_n int := 0;
begin
  select * into p from public.promocoes where id = p_promocao;
  if not found then
    return null;
  end if;
  select * into a from public.academias where id = p.academia_id;
  if exists (select 1 from public.promocoes x
             where x.academia_id = p.academia_id and x.id <> p.id
               and x.avisada_em > now() - interval '7 days') then
    return 'semana';
  end if;
  v_link := public.site_dos_emails() || '/academia/' || public.slug_da_academia(a.name, a.id) || '?utm_source=Email-promocao';
  v_caixa := '<div style="margin:6px 0 16px;padding:14px 16px;border:1px solid #D8B865;border-radius:12px;background:#FBF7EC">'
    || '<p style="margin:0;font-size:16px;font-weight:700;color:#1F2A24">' || public.html_texto(p.titulo) || '</p>'
    || case when nullif(btrim(p.detalhes), '') is not null
         then '<p style="margin:6px 0 0;font-size:14px;line-height:1.5;color:#1F2A24">' || public.html_texto(p.detalhes) || '</p>' else '' end
    || '<p style="margin:8px 0 0;font-size:13px;color:#6B6458">Válida até ' || public.data_por_extenso(p.valida_ate) || '</p></div>';
  for j in
    select x.*, coalesce(x.guardados -> 'favoritas', '[]'::jsonb) ? p.academia_id::text as favorita
    from public.jogadores x
    where x.promocoes and x.email_confirmado_em is not null and public.email_valido(x.email)
      and not exists (select 1 from public.academia_vinculos v
                      where v.academia_id = p.academia_id and v.user_id = x.user_id)
      and (coalesce(x.guardados -> 'favoritas', '[]'::jsonb) ? p.academia_id::text
           or (nullif(btrim(a.cidade), '') is not null
               and public.slug(a.cidade) in (public.slug(coalesce(x.cidade, '')),
                                             public.slug(coalesce(x.guardados -> 'preferencias' ->> 'cidade', ''))))
           or (a.lat is not null and a.lng is not null
               and (exists (select 1 from public.buscas_salvas b
                            where b.user_id = x.user_id and b.lat is not null and b.lng is not null
                              and public.km_entre(b.lat, b.lng, a.lat, a.lng) <= 25)
                    or (jsonb_typeof(x.guardados -> 'ultima_busca' -> 'lat') = 'number'
                        and jsonb_typeof(x.guardados -> 'ultima_busca' -> 'lng') = 'number'
                        and public.km_entre((x.guardados -> 'ultima_busca' ->> 'lat')::double precision,
                                            (x.guardados -> 'ultima_busca' ->> 'lng')::double precision,
                                            a.lat, a.lng) <= 25))))
  loop
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
        || public.email_p('As condições são combinadas direto com a academia, pelo WhatsApp da ficha.'),
        'Ver a academia', v_link,
        'Você recebe este aviso porque pediu, na sua conta do GuiaTennis, avisos de promoções das academias favoritas e perto de você. '
        || '<a href="' || public.html_texto(v_parar) || '" style="color:#6B6458">Não quero mais receber promoções</a>'
        || ' · <a href="' || public.html_texto(public.site_dos_emails() || '/perfil') || '" style="color:#6B6458">Mudar os avisos</a>.'),
      'Olá, ' || v_primeiro || '! A ' || a.name || ', '
        || case when j.favorita then 'uma das suas academias favoritas no GuiaTennis'
                else 'perto de você' || coalesce(', em ' || nullif(btrim(a.cidade), ''), '') end
        || ', está com uma promoção: '
        || p.titulo || coalesce(E'\n' || nullif(btrim(p.detalhes), ''), '')
        || E'\nVálida até ' || public.data_por_extenso(p.valida_ate) || '.'
        || E'\n\nVer a academia: ' || v_link
        || E'\n\nNão quer mais receber promoções? ' || v_parar,
      v_parar) then
      v_n := v_n + 1;
    end if;
  end loop;
  update public.promocoes
    set avisados = v_n, avisada_em = case when v_n > 0 then now() end
    where id = p.id;
  return case when v_n > 0 then 'enviado' else 'ninguem' end;
end $$;

-- Criar ou mudar: a academia escolhe se avisa ao publicar ----------------------
drop function if exists public.salvar_promocao(uuid, uuid, text, text, date);
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
    raise exception 'As promoções são do plano Premium ou do Completo com o adicional de Promoções.' using errcode = '42501';
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
    if (select count(*) from public.promocoes
        where academia_id = p_academia and valida_ate >= v_hoje) >= 3 then
      raise exception 'A academia já tem 3 promoções valendo. Encerre uma para criar outra.' using errcode = '22023';
    end if;
    insert into public.promocoes (academia_id, titulo, detalhes, valida_ate, criada_por)
      values (p_academia, v_titulo, v_detalhes, p_valida_ate, auth.uid())
      returning id into v_id;
    v_aviso := case when coalesce(p_avisar, true) then public.avisar_promocao(v_id) else 'depois' end;
  else
    if (select count(*) from public.promocoes
        where academia_id = p_academia and id <> v_id and valida_ate >= v_hoje) >= 3 then
      raise exception 'A academia já tem 3 promoções valendo. Encerre uma para criar outra.' using errcode = '22023';
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

-- Avisar depois: a promoção valendo que ainda não avisou ninguém ----------------
create or replace function public.avisar_minha_promocao(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.promocoes;
  a public.academias;
  v_aviso text;
begin
  select * into p from public.promocoes where id = p_id;
  if not found then
    raise exception 'Promoção não encontrada.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p.academia_id) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  select * into a from public.academias where id = p.academia_id;
  if not public.promocoes_liberadas(a) then
    raise exception 'As promoções são do plano Premium ou do Completo com o adicional de Promoções.' using errcode = '42501';
  end if;
  if p.valida_ate < public.hoje_em_brasilia() then
    raise exception 'Essa promoção já terminou.' using errcode = '22023';
  end if;
  if p.avisada_em is not null then
    raise exception 'Essa promoção já foi avisada por e-mail.' using errcode = '22023';
  end if;
  v_aviso := public.avisar_promocao(p.id);
  return jsonb_build_object('aviso', v_aviso, 'avisados', (select avisados from public.promocoes where id = p.id));
end $$;

revoke all on function public.salvar_promocao(uuid, uuid, text, text, date, boolean) from public, anon;
grant execute on function public.salvar_promocao(uuid, uuid, text, text, date, boolean) to authenticated;
revoke all on function public.avisar_minha_promocao(uuid) from public, anon;
grant execute on function public.avisar_minha_promocao(uuid) to authenticated;
revoke all on function public.avisar_promocao(uuid) from public, anon, authenticated;

notify pgrst, 'reload schema';
