-- ============================================================
-- Envios de aviso pagos, no Completo e no Premium (pedido do Breno em
-- 14/10/2026: "o completo e o Premium paguem para enviar notificações/email
-- aos usuários, mas o Premium ter desconto para enviar"; promoções: "só o
-- Premium publica"; pagamento: pacote de envios antes, como as moedas do
-- GetNinjas)
-- ============================================================
--   Sai o adicional de Promoções do SQL 20261014140000: só o Premium publica
--   promoções (promocoes_liberadas).
--   academias.envios_de_aviso  o saldo de envios da academia. O admin soma
--                        (somar_envios) depois do Pix; cada e-mail mandado
--                        gasta 1, só quando alguém recebe. O valor de cada
--                        envio é combinado (o Premium paga menos).
--   destinatarios_da_academia  quem recebe: ligou "Avisos e promoções" na
--                        conta, confirmou o e-mail, não administra a academia
--                        e favoritou a academia ou está perto (cidade da conta
--                        ou das preferências, busca salva ou última busca a
--                        até 25 km).
--   avisos_das_academias o aviso escrito pela academia (Completo e Premium).
--   enviar_aviso_da_academia  manda o aviso; avisar_promocao manda a
--                        promoção (Premium). Os dois gastam 1 envio e valem
--                        no máximo 1 por semana por academia.
--   avisos_da_minha_academia  o saldo e os avisos já mandados.
-- Pode rodar de novo sem estragar nada.

-- Só o Premium publica promoções ---------------------------------------------
create or replace function public.promocoes_liberadas(a public.academias)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(a.plano, 'basico') = 'premium';
$$;

-- O saldo de envios -----------------------------------------------------------
alter table public.academias add column if not exists envios_de_aviso integer not null default 0;
alter table public.academias drop constraint if exists academias_envios_ok;
alter table public.academias add constraint academias_envios_ok check (envios_de_aviso >= 0);

-- O saldo não é informação da ficha: não muda a data "atualizada há…".
create or replace function public.dados_da_ficha(p jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select p - array['id', 'created_at', 'status', 'pago', 'plano', 'pausada', 'pausada_ate',
    'pausada_pela_academia', 'source', 'nome_solicitante', 'contato_solicitante',
    'revisar_desde', 'publicada_em', 'confirmada', 'dados_atualizados_em', 'lat', 'lng',
    'envios_de_aviso'];
$$;

create or replace function public.marcar_dados_atualizados()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pausa boolean := coalesce(current_setting('guiatennis.pausa_da_academia', true), '') = 'sim';
  v_envio boolean := coalesce(current_setting('guiatennis.gastar_envio', true), '') <> '';
  v_da_academia boolean;
begin
  if tg_op = 'INSERT' then
    new.dados_atualizados_em := now();
    return new;
  end if;
  new.dados_atualizados_em := old.dados_atualizados_em;
  if v_pausa or v_envio then
    return new;
  end if;
  v_da_academia := auth.uid() is not null and not public.eh_admin()
    and exists (select 1 from public.academia_vinculos
                where user_id = auth.uid() and academia_id = old.id);
  if v_da_academia
     or public.dados_da_ficha(to_jsonb(new)) is distinct from public.dados_da_ficha(to_jsonb(old)) then
    new.dados_atualizados_em := now();
  end if;
  return new;
end $$;

-- O gatilho que protege a ficha (igual ao do SQL 20261014140000): o saldo só
-- muda pelo admin ou ao gastar um envio; sai o adicional.
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
  v_envio boolean := coalesce(current_setting('guiatennis.gastar_envio', true), '') = old.id::text;
begin
  -- Gastar um envio (gastar_envio_de_aviso): só o saldo muda.
  if v_envio then
    v_linha := old;
    v_linha.envios_de_aviso := new.envios_de_aviso;
    return v_linha;
  end if;
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
  new.envios_de_aviso := old.envios_de_aviso;
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

alter table public.academias drop column if exists adicional_promocoes;

create or replace function public.gastar_envio_de_aviso(p_academia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('guiatennis.gastar_envio', p_academia::text, true);
  update public.academias set envios_de_aviso = greatest(envios_de_aviso - 1, 0) where id = p_academia;
  perform set_config('guiatennis.gastar_envio', '', true);
end $$;

-- Quem recebe os avisos da academia --------------------------------------------
create or replace function public.destinatarios_da_academia(p_academia uuid)
returns table (user_id uuid, nome text, email text, token_avisos uuid, favorita boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select x.user_id, x.nome, x.email, x.token_avisos,
         coalesce(x.guardados -> 'favoritas', '[]'::jsonb) ? a.id::text
  from public.academias a
  join public.jogadores x on true
  where a.id = p_academia
    and x.promocoes and x.email_confirmado_em is not null and public.email_valido(x.email)
    and not exists (select 1 from public.academia_vinculos v
                    where v.academia_id = a.id and v.user_id = x.user_id)
    and (coalesce(x.guardados -> 'favoritas', '[]'::jsonb) ? a.id::text
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
                                          a.lat, a.lng) <= 25))));
$$;

-- Os avisos escritos pela academia ------------------------------------------------
create table if not exists public.avisos_das_academias (
  id uuid primary key default gen_random_uuid(),
  academia_id uuid not null references public.academias(id) on delete cascade,
  titulo text not null,
  mensagem text not null,
  criado_por uuid references auth.users(id) on delete set null,
  avisados integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists avisos_das_academias_academia on public.avisos_das_academias (academia_id, created_at desc);
alter table public.avisos_das_academias enable row level security;
revoke all on public.avisos_das_academias from anon, authenticated;

-- No máximo 1 envio por semana por academia (aviso ou promoção que chegou a alguém).
create or replace function public.avisou_nesta_semana(p_academia uuid, p_fora uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.promocoes x
                 where x.academia_id = p_academia and x.id is distinct from p_fora
                   and x.avisada_em > now() - interval '7 days')
      or exists (select 1 from public.avisos_das_academias x
                 where x.academia_id = p_academia and x.id is distinct from p_fora
                   and x.avisados > 0 and x.created_at > now() - interval '7 days');
$$;

-- O aviso da promoção (Premium): gasta 1 envio quando alguém recebe ---------------
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
  if public.avisou_nesta_semana(p.academia_id, p.id) then
    return 'semana';
  end if;
  if coalesce(a.envios_de_aviso, 0) < 1 then
    return 'sem_envios';
  end if;
  v_link := public.site_dos_emails() || '/academia/' || public.slug_da_academia(a.name, a.id) || '?utm_source=Email-promocao';
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
        || public.email_p('As condições são combinadas direto com a academia, pelo WhatsApp da ficha.'),
        'Ver a academia', v_link,
        'Você recebe este aviso porque pediu, na sua conta do GuiaTennis, avisos e promoções das academias favoritas e perto de você. '
        || '<a href="' || public.html_texto(v_parar) || '" style="color:#6B6458">Não quero mais receber</a>'
        || ' · <a href="' || public.html_texto(public.site_dos_emails() || '/perfil') || '" style="color:#6B6458">Mudar os avisos</a>.'),
      'Olá, ' || v_primeiro || '! A ' || a.name || ', '
        || case when j.favorita then 'uma das suas academias favoritas no GuiaTennis'
                else 'perto de você' || coalesce(', em ' || nullif(btrim(a.cidade), ''), '') end
        || ', está com uma promoção: '
        || p.titulo || coalesce(E'\n' || nullif(btrim(p.detalhes), ''), '')
        || E'\nVálida até ' || public.data_por_extenso(p.valida_ate) || '.'
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

-- Criar ou mudar a promoção (só o Premium) ------------------------------------------
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

-- Avisar depois a promoção valendo ---------------------------------------------------
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
    raise exception 'As promoções são do plano Premium.' using errcode = '42501';
  end if;
  if p.valida_ate < public.hoje_em_brasilia() then
    raise exception 'Essa promoção já terminou.' using errcode = '22023';
  end if;
  if p.avisada_em is not null then
    raise exception 'Essa promoção já foi avisada por e-mail.' using errcode = '22023';
  end if;
  if coalesce(a.envios_de_aviso, 0) < 1 then
    raise exception 'A academia não tem envios de aviso. Compre um pacote de envios para avisar os jogadores.' using errcode = '22023';
  end if;
  v_aviso := public.avisar_promocao(p.id);
  return jsonb_build_object('aviso', v_aviso, 'avisados', (select avisados from public.promocoes where id = p.id),
    'saldo', (select envios_de_aviso from public.academias where id = p.academia_id));
end $$;

-- O aviso escrito pela academia (Completo e Premium) -----------------------------------
create or replace function public.enviar_aviso_da_academia(p_academia uuid, p_titulo text, p_mensagem text)
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
  insert into public.avisos_das_academias (academia_id, titulo, mensagem, criado_por)
    values (p_academia, v_titulo, v_mensagem, auth.uid())
    returning id into v_id;
  v_link := public.site_dos_emails() || '/academia/' || public.slug_da_academia(a.name, a.id) || '?utm_source=Email-aviso-da-academia';
  v_caixa := '<div style="margin:6px 0 16px;padding:14px 16px;border:1px solid #DCD6C8;border-radius:12px;background:#FAF8F3">'
    || '<p style="margin:0;font-size:16px;font-weight:700;color:#1F2A24">' || public.html_texto(v_titulo) || '</p>'
    || '<p style="margin:6px 0 0;font-size:14px;line-height:1.5;color:#1F2A24">' || public.html_texto(v_mensagem) || '</p></div>';
  for j in select * from public.destinatarios_da_academia(p_academia) loop
    v_primeiro := split_part(btrim(j.nome), ' ', 1);
    v_parar := public.link_parar_avisos(j.token_avisos, 'promocoes');
    if public.por_na_fila(
      'aviso-da-academia:' || v_id || ':' || j.user_id, 'aviso_da_academia', j.email,
      a.name || ': ' || v_titulo,
      public.email_montado('Aviso da ' || public.html_texto(a.name),
        public.email_p('Olá, ' || public.html_texto(v_primeiro) || '! A <strong>' || public.html_texto(a.name)
          || '</strong>, ' || case when j.favorita then 'uma das suas academias favoritas no GuiaTennis'
                                  else 'perto de você' || coalesce(', em ' || public.html_texto(nullif(btrim(a.cidade), '')), '') end
          || ', mandou um aviso:')
        || v_caixa
        || public.email_p('Para combinar, chame a academia pelo WhatsApp da ficha.'),
        'Ver a academia', v_link,
        'Você recebe este aviso porque pediu, na sua conta do GuiaTennis, avisos e promoções das academias favoritas e perto de você. '
        || '<a href="' || public.html_texto(v_parar) || '" style="color:#6B6458">Não quero mais receber</a>'
        || ' · <a href="' || public.html_texto(public.site_dos_emails() || '/perfil') || '" style="color:#6B6458">Mudar os avisos</a>.'),
      'Olá, ' || v_primeiro || '! A ' || a.name || ', '
        || case when j.favorita then 'uma das suas academias favoritas no GuiaTennis'
                else 'perto de você' || coalesce(', em ' || nullif(btrim(a.cidade), ''), '') end
        || ', mandou um aviso: ' || v_titulo || E'\n' || v_mensagem
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

-- O saldo e os avisos já mandados (quem administra a academia ou o admin) -------------
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
                                                              'avisados', x.avisados, 'created_at', x.created_at)
                                           order by x.created_at desc)
                          from (select * from public.avisos_das_academias
                                where academia_id = p_academia order by created_at desc limit 20) x), '[]'::jsonb),
      'semana', public.avisou_nesta_semana(p_academia))
  end;
$$;

-- O admin soma (ou corrige) o saldo depois do pagamento --------------------------------
create or replace function public.somar_envios(p_academia uuid, p_quantos integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_saldo integer;
begin
  if not public.eh_admin() then
    raise exception 'Só o admin muda os envios.' using errcode = '42501';
  end if;
  update public.academias set envios_de_aviso = greatest(envios_de_aviso + coalesce(p_quantos, 0), 0)
    where id = p_academia
    returning envios_de_aviso into v_saldo;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  return v_saldo;
end $$;

revoke all on function public.gastar_envio_de_aviso(uuid) from public, anon, authenticated;
revoke all on function public.destinatarios_da_academia(uuid) from public, anon, authenticated;
revoke all on function public.avisou_nesta_semana(uuid, uuid) from public, anon, authenticated;
revoke all on function public.avisar_promocao(uuid) from public, anon, authenticated;
revoke all on function public.enviar_aviso_da_academia(uuid, text, text) from public, anon;
grant execute on function public.enviar_aviso_da_academia(uuid, text, text) to authenticated;
revoke all on function public.avisos_da_minha_academia(uuid) from public, anon;
grant execute on function public.avisos_da_minha_academia(uuid) to authenticated;
revoke all on function public.somar_envios(uuid, integer) from public, anon;
grant execute on function public.somar_envios(uuid, integer) to authenticated;
revoke all on function public.salvar_promocao(uuid, uuid, text, text, date, boolean) from public, anon;
grant execute on function public.salvar_promocao(uuid, uuid, text, text, date, boolean) to authenticated;
revoke all on function public.avisar_minha_promocao(uuid) from public, anon;
grant execute on function public.avisar_minha_promocao(uuid) to authenticated;

notify pgrst, 'reload schema';
