-- ============================================================
-- Leilão das notificações por região (pedido do Breno em 18/10/2026: "quero
-- fazer igual o trivago que eles próprios enviam as novidades, mas com
-- novidades enviadas pelas academias e quem me pagar mais eu enviarei
-- notificação por região")
-- ============================================================
-- Como o trivago (quem anuncia dá lance; a ordem mistura lance e qualidade),
-- o Google Ads (paga o necessário para passar o segundo colocado) e o
-- Groupon (um e-mail da plataforma por região, com as ofertas das lojas).
-- Escolhas do Breno: cobra por semana ganha, a região é o bairro, duas
-- notificações por semana no começo, e o e-mail da academia para os
-- seguidores sai (só o GuiaTennis manda).
--
--   leilao_config               lance mínimo (R$ 10), desconto do Premium
--                               (20%) e o raio do bairro (4 km).
--   lances                      um lance por academia por semana: a
--                               promoção (título e mensagem) e o valor
--                               máximo, em reais inteiros.
--   regiao_da_academia          "cidade/bairro" (sem bairro, sem leilão).
--   proximo_fechamento          o próximo domingo às 20h de Brasília.
--   qualidade_do_lance          0,70 a 1,00: fotos, avaliações e uma
--                               promoção bem explicada.
--   destinatarios_da_regiao     quem pediu promoções e favoritou uma
--                               academia do bairro, salvou uma busca nele
--                               ou buscou perto (até o raio).
--   meu_leilao, dar_lance,      o Parceiros (Completo e Premium).
--   cancelar_lance
--   fechar_leiloes              domingo 20h: as duas maiores notas (lance ×
--                               qualidade) ganham; cada uma paga o
--                               necessário para passar a seguinte + R$ 1
--                               (no máximo o próprio lance; no Premium,
--                               20% menos). 1º lugar sai na terça às 10h,
--                               2º na sexta às 10h.
--   enviar_notificacoes_do_leilao  manda na hora marcada; se ninguém
--                               recebe, devolve o valor.
--   rodar_leiloes               os dois, de hora em hora (pg_cron).
--   leiloes_do_admin,           o painel do admin: os lances da semana, os
--   cancelar_envio_do_lance,    envios marcados (com "Não enviar", que
--   mudar_lance_minimo          devolve) e o lance mínimo.
-- O saldo é a coluna de sempre, academias.envios_de_aviso, que passa a
-- guardar créditos em reais (o admin soma depois do Pix, somar_envios).
-- Pode rodar de novo sem estragar nada.

create table if not exists public.leilao_config (
  id integer primary key default 1 check (id = 1),
  lance_minimo integer not null default 10 check (lance_minimo >= 1),
  desconto_premium numeric not null default 0.20 check (desconto_premium >= 0 and desconto_premium < 1),
  raio_km numeric not null default 4 check (raio_km > 0),
  updated_at timestamptz not null default now()
);
insert into public.leilao_config (id) values (1) on conflict (id) do nothing;
alter table public.leilao_config enable row level security;

create table if not exists public.lances (
  id uuid primary key default gen_random_uuid(),
  academia_id uuid not null references public.academias (id) on delete cascade,
  regiao text not null,
  regiao_nome text not null,
  fecha_em timestamptz not null,
  titulo text not null,
  mensagem text not null,
  valor integer not null check (valor >= 1),
  qualidade numeric,
  situacao text not null default 'aberto'
    check (situacao in ('aberto', 'ganhou', 'perdeu', 'sem_saldo', 'enviado', 'cancelado')),
  posicao integer,
  preco integer,
  envio_em timestamptz,
  enviado_em timestamptz,
  avisados integer not null default 0,
  criado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academia_id, fecha_em)
);
create index if not exists lances_por_leilao on public.lances (regiao, fecha_em);
create index if not exists lances_por_envio on public.lances (situacao, envio_em);
alter table public.lances enable row level security;

-- A região: "sao-paulo/pinheiros". Sem bairro ou cidade, a academia não
-- entra no leilão.
create or replace function public.regiao_da_academia(a public.academias)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when nullif(btrim(coalesce(a.bairro, '')), '') is null or nullif(btrim(coalesce(a.cidade, '')), '') is null
              then null
              else public.slug(a.cidade) || '/' || public.slug(a.bairro) end;
$$;

create or replace function public.nome_da_regiao(a public.academias)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(a.bairro) || ', ' || btrim(a.cidade);
$$;

-- O próximo domingo às 20h de Brasília (o Brasil não tem horário de verão
-- desde 2019).
create or replace function public.proximo_fechamento(p_agora timestamptz default now())
returns timestamptz
language sql
stable
set search_path = ''
as $$
  with l as (select (p_agora at time zone 'America/Sao_Paulo') as agora),
       d as (select agora, agora::date + ((7 - extract(dow from agora)::integer) % 7) as dia from l)
  select ((case when dia = agora::date and agora::time >= time '20:00' then dia + 7 else dia end) + time '20:00')
         at time zone 'America/Sao_Paulo'
  from d;
$$;

create or replace function public.centro_da_regiao(p_regiao text, out lat double precision, out lng double precision)
language sql
stable
security definer
set search_path = ''
as $$
  select avg(a.lat), avg(a.lng) from public.academias a
  where public.regiao_da_academia(a) = p_regiao and a.lat is not null and a.lng is not null;
$$;

-- Nota de qualidade, como o Índice de qualidade do Google: a academia com
-- fotos, boas avaliações e a promoção bem explicada passa na frente de quem
-- só paga mais.
create or replace function public.qualidade_do_lance(p_academia uuid, p_mensagem text)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select least(1.0,
    0.70
    + case when jsonb_typeof(to_jsonb(a.photos)) = 'array' and jsonb_array_length(to_jsonb(a.photos)) > 0 then 0.10 else 0 end
    + case when r.n = 0 then 0.05 when r.media >= 4 then 0.10 else 0 end
    + case when char_length(btrim(coalesce(p_mensagem, ''))) >= 40 then 0.10 else 0 end)
  from public.academias a
  cross join lateral (select count(*) as n, avg(v.stars) as media
                      from public.avaliacoes v where v.academia_id = a.id) r
  where a.id = p_academia;
$$;

-- Quem recebe a notificação do bairro: pediu promoções, confirmou o e-mail,
-- não administra a academia que ganhou, e favoritou uma academia do bairro,
-- salvou uma busca nele ou buscou perto dele.
create or replace function public.destinatarios_da_regiao(p_regiao text, p_academia uuid)
returns table (user_id uuid, nome text, email text, token_avisos uuid)
language sql
stable
security definer
set search_path = ''
as $$
  with c as (select * from public.centro_da_regiao(p_regiao)),
       cfg as (select raio_km from public.leilao_config where id = 1),
       da_regiao as (select a.id::text as id from public.academias a where public.regiao_da_academia(a) = p_regiao)
  select x.user_id, x.nome, x.email, x.token_avisos
  from public.jogadores x, c, cfg
  where x.promocoes and x.email_confirmado_em is not null and public.email_valido(x.email)
    and not exists (select 1 from public.academia_vinculos v
                    where v.academia_id = p_academia and v.user_id = x.user_id)
    and (exists (select 1 from da_regiao r where coalesce(x.guardados -> 'favoritas', '[]'::jsonb) ? r.id)
         or exists (select 1 from public.buscas_salvas b
                    where b.user_id = x.user_id
                      and ((nullif(btrim(coalesce(b.bairro, '')), '') is not null and nullif(btrim(coalesce(b.cidade, '')), '') is not null
                            and public.slug(b.cidade) || '/' || public.slug(b.bairro) = p_regiao)
                           or (c.lat is not null and b.lat is not null and b.lng is not null
                               and public.km_entre(b.lat, b.lng, c.lat, c.lng) <= cfg.raio_km)))
         or (c.lat is not null
             and jsonb_typeof(x.guardados -> 'ultima_busca' -> 'lat') = 'number'
             and jsonb_typeof(x.guardados -> 'ultima_busca' -> 'lng') = 'number'
             and public.km_entre((x.guardados -> 'ultima_busca' ->> 'lat')::double precision,
                                 (x.guardados -> 'ultima_busca' ->> 'lng')::double precision,
                                 c.lat, c.lng) <= cfg.raio_km));
$$;

-- Mexer nos créditos (o saldo de sempre) sem passar pela proteção da ficha
-- e sem mudar a data "atualizada há…".
create or replace function public.mexer_creditos(p_academia uuid, p_delta integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('guiatennis.gastar_envio', p_academia::text, true);
  update public.academias set envios_de_aviso = greatest(envios_de_aviso + coalesce(p_delta, 0), 0) where id = p_academia;
  perform set_config('guiatennis.gastar_envio', '', true);
end $$;

create or replace function public.lance_em_json(l public.lances)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('id', l.id, 'regiao_nome', l.regiao_nome, 'fecha_em', l.fecha_em,
    'titulo', l.titulo, 'mensagem', l.mensagem, 'valor', l.valor, 'situacao', l.situacao,
    'posicao', l.posicao, 'preco', l.preco, 'envio_em', l.envio_em, 'enviado_em', l.enviado_em,
    'avisados', l.avisados, 'created_at', l.created_at);
$$;

-- O Parceiros ---------------------------------------------------------------
create or replace function public.meu_leilao(p_academia uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  cfg public.leilao_config;
  v_regiao text;
  v_fecha timestamptz := public.proximo_fechamento();
  l public.lances;
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia) then
    return null;
  end if;
  select * into a from public.academias where id = p_academia;
  select * into cfg from public.leilao_config where id = 1;
  v_regiao := public.regiao_da_academia(a);
  select * into l from public.lances where academia_id = p_academia and fecha_em = v_fecha and situacao = 'aberto';
  return jsonb_build_object(
    'regiao', v_regiao,
    'regiao_nome', case when v_regiao is null then null else public.nome_da_regiao(a) end,
    'fecha_em', v_fecha,
    'envios', jsonb_build_array(v_fecha + interval '1 day 14 hours', v_fecha + interval '4 days 14 hours'),
    'lance_minimo', cfg.lance_minimo,
    'desconto_premium', cfg.desconto_premium,
    'creditos', coalesce(a.envios_de_aviso, 0),
    'alcance', case when v_regiao is null then 0 else (select count(*) from public.destinatarios_da_regiao(v_regiao, p_academia)) end,
    'lance', case when l.id is null then null else public.lance_em_json(l) end,
    'historico', coalesce((select jsonb_agg(public.lance_em_json(h) order by h.fecha_em desc)
                           from (select * from public.lances
                                 where academia_id = p_academia and situacao <> 'aberto'
                                 order by fecha_em desc limit 10) h), '[]'::jsonb));
end $$;

create or replace function public.dar_lance(p_academia uuid, p_titulo text, p_mensagem text, p_valor integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  cfg public.leilao_config;
  v_regiao text;
  v_fecha timestamptz := public.proximo_fechamento();
  v_titulo text := btrim(coalesce(p_titulo, ''));
  v_mensagem text := btrim(coalesce(p_mensagem, ''));
  l public.lances;
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
    raise exception 'A academia precisa estar no ar para entrar no leilão.' using errcode = '22023';
  end if;
  v_regiao := public.regiao_da_academia(a);
  if v_regiao is null then
    raise exception 'Para entrar no leilão, a ficha precisa do bairro e da cidade.' using errcode = '22023';
  end if;
  if char_length(v_titulo) < 3 or char_length(v_titulo) > 60 then
    raise exception 'Escreva a promoção em até 60 letras (por exemplo, "Primeira aula grátis").' using errcode = '22023';
  end if;
  if char_length(v_mensagem) < 10 or char_length(v_mensagem) > 500 then
    raise exception 'A mensagem precisa ter de 10 a 500 letras.' using errcode = '22023';
  end if;
  select * into cfg from public.leilao_config where id = 1;
  if p_valor is null or p_valor < cfg.lance_minimo then
    raise exception 'O lance mínimo é de R$ %.', cfg.lance_minimo using errcode = '22023';
  end if;
  if p_valor > 100000 then
    raise exception 'O lance passa do limite.' using errcode = '22023';
  end if;
  if p_valor > coalesce(a.envios_de_aviso, 0) then
    raise exception 'A academia tem R$ % de créditos. Compre créditos ou dê um lance menor.', coalesce(a.envios_de_aviso, 0) using errcode = '22023';
  end if;
  insert into public.lances (academia_id, regiao, regiao_nome, fecha_em, titulo, mensagem, valor, criado_por)
    values (p_academia, v_regiao, public.nome_da_regiao(a), v_fecha, v_titulo, v_mensagem, p_valor, auth.uid())
    on conflict (academia_id, fecha_em) do update
      set titulo = excluded.titulo, mensagem = excluded.mensagem, valor = excluded.valor,
          regiao = excluded.regiao, regiao_nome = excluded.regiao_nome, updated_at = now()
      where public.lances.situacao = 'aberto'
    returning * into l;
  if l.id is null then
    raise exception 'O leilão desta semana já fechou.' using errcode = '22023';
  end if;
  return public.lance_em_json(l);
end $$;

create or replace function public.cancelar_lance(p_academia uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  delete from public.lances
    where academia_id = p_academia and fecha_em = public.proximo_fechamento() and situacao = 'aberto';
  return found;
end $$;

-- O fechamento (domingo 20h) ---------------------------------------------------
create or replace function public.fechar_leiloes(p_agora timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  cfg public.leilao_config;
  r record;
  v_ids uuid[];
  v_notas numeric[];
  v_quals numeric[];
  v_valores integer[];
  v_i integer;
  v_pos integer;
  v_preco integer;
  v_fechados integer := 0;
  a public.academias;
begin
  select * into cfg from public.leilao_config where id = 1;
  for r in select distinct regiao, fecha_em from public.lances where situacao = 'aberto' and fecha_em <= p_agora loop
    -- Quem não está mais no plano ou no ar sai antes de contar.
    update public.lances l set situacao = 'cancelado', updated_at = now()
      from public.academias x
      where l.regiao = r.regiao and l.fecha_em = r.fecha_em and l.situacao = 'aberto' and x.id = l.academia_id
        and (coalesce(x.plano, 'basico') not in ('completo', 'premium') or not public.academia_no_ar(x));
    update public.lances l set qualidade = coalesce(public.qualidade_do_lance(l.academia_id, l.mensagem), 0.70)
      where l.regiao = r.regiao and l.fecha_em = r.fecha_em and l.situacao = 'aberto';
    select array_agg(id order by nota desc, created_at), array_agg(nota order by nota desc, created_at),
           array_agg(qualidade order by nota desc, created_at), array_agg(valor order by nota desc, created_at)
      into v_ids, v_notas, v_quals, v_valores
      from (select id, created_at, qualidade, valor, valor * qualidade as nota from public.lances
            where regiao = r.regiao and fecha_em = r.fecha_em and situacao = 'aberto') t;
    v_pos := 0;
    for v_i in 1 .. coalesce(array_length(v_ids, 1), 0) loop
      if v_pos >= 2 then
        update public.lances set situacao = 'perdeu', updated_at = now() where id = v_ids[v_i];
        continue;
      end if;
      -- Paga o necessário para passar o seguinte, mais R$ 1 (como o Google).
      v_preco := case when v_i < array_length(v_ids, 1)
                      then ceil(v_notas[v_i + 1] / v_quals[v_i])::integer + 1
                      else cfg.lance_minimo end;
      v_preco := least(v_valores[v_i], greatest(v_preco, cfg.lance_minimo));
      select x.* into a from public.academias x join public.lances l on l.academia_id = x.id where l.id = v_ids[v_i];
      if a.plano = 'premium' then
        v_preco := greatest(1, floor(v_preco * (1 - cfg.desconto_premium))::integer);
      end if;
      if coalesce(a.envios_de_aviso, 0) < v_preco then
        update public.lances set situacao = 'sem_saldo', updated_at = now() where id = v_ids[v_i];
        continue;
      end if;
      v_pos := v_pos + 1;
      perform public.mexer_creditos(a.id, -v_preco);
      update public.lances
        set situacao = 'ganhou', posicao = v_pos, preco = v_preco, updated_at = now(),
            envio_em = r.fecha_em + case when v_pos = 1 then interval '1 day 14 hours' else interval '4 days 14 hours' end
        where id = v_ids[v_i];
    end loop;
    v_fechados := v_fechados + 1;
  end loop;
  return v_fechados;
end $$;

-- O envio (terça e sexta, 10h) -------------------------------------------------
create or replace function public.enviar_notificacoes_do_leilao(p_agora timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.lances;
  a public.academias;
  j record;
  v_bairro text;
  v_link text;
  v_whats text;
  v_parar text;
  v_primeiro text;
  v_caixa text;
  v_n integer;
  v_feitos integer := 0;
begin
  for l in select * from public.lances where situacao = 'ganhou' and envio_em <= p_agora and enviado_em is null order by envio_em loop
    select * into a from public.academias where id = l.academia_id;
    if not found or not public.academia_no_ar(a) then
      if found then perform public.mexer_creditos(a.id, coalesce(l.preco, 0)); end if;
      update public.lances set situacao = 'cancelado', preco = 0, updated_at = now() where id = l.id;
      continue;
    end if;
    v_bairro := split_part(l.regiao_nome, ', ', 1);
    v_link := public.site_dos_emails() || '/academia/' || public.slug_da_academia(a.name, a.id) || '?utm_source=Email-leilao';
    v_whats := public.link_whatsapp_do_email(a, 'a promoção "' || l.titulo || '"', 'Email-leilao');
    v_caixa := '<div style="margin:6px 0 16px;padding:14px 16px;border:1px solid #D8B865;border-radius:12px;background:#FBF7EC">'
      || '<p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8E6D25">Patrocinado · ' || public.html_texto(a.name) || '</p>'
      || '<p style="margin:0;font-size:16px;font-weight:700;color:#1F2A24">' || public.html_texto(l.titulo) || '</p>'
      || '<p style="margin:6px 0 0;font-size:14px;line-height:1.5;color:#1F2A24">' || public.html_texto(l.mensagem) || '</p></div>';
    v_n := 0;
    for j in select * from public.destinatarios_da_regiao(l.regiao, l.academia_id) loop
      v_primeiro := split_part(btrim(j.nome), ' ', 1);
      v_parar := public.link_parar_avisos(j.token_avisos, 'promocoes');
      if public.por_na_fila(
        'leilao:' || l.id || ':' || j.user_id, 'notificacao_do_leilao', j.email,
        'Promoção em ' || v_bairro || ': ' || l.titulo,
        public.email_montado('Novidade em ' || public.html_texto(v_bairro),
          public.email_p('Olá, ' || public.html_texto(v_primeiro) || '! A <strong>' || public.html_texto(a.name)
            || '</strong>, em ' || public.html_texto(v_bairro) || ', está com uma promoção:')
          || v_caixa
          || case when v_whats is null then public.email_p('Para combinar, chame a academia pelo WhatsApp da ficha.')
                  else public.email_p('Para combinar, chame a academia. Ou <a href="' || public.html_texto(v_link) || '" style="color:#1F4D3A">veja a ficha da academia</a>.') end,
          case when v_whats is null then 'Ver a academia' else 'Chamar no WhatsApp' end, coalesce(v_whats, v_link),
          'Você recebe este e-mail porque pediu, na sua conta do GuiaTennis, promoções das academias favoritas e perto de você. '
          || 'Promoção patrocinada: a academia pagou para aparecer aqui. '
          || '<a href="' || public.html_texto(v_parar) || '" style="color:#6B6458">Não quero mais receber</a>'
          || ' · <a href="' || public.html_texto(public.site_dos_emails() || '/perfil') || '" style="color:#6B6458">Mudar o que recebo</a>.'),
        'Olá, ' || v_primeiro || '! A ' || a.name || ', em ' || v_bairro || ', está com uma promoção (patrocinado): '
          || l.titulo || E'\n' || l.mensagem
          || coalesce(E'\n\nChamar no WhatsApp: ' || v_whats, '')
          || E'\n\nVer a academia: ' || v_link
          || E'\n\nNão quer mais receber? ' || v_parar,
        v_parar) then
        v_n := v_n + 1;
      end if;
    end loop;
    -- Ninguém recebeu: devolve o que pagou.
    if v_n = 0 and coalesce(l.preco, 0) > 0 then
      perform public.mexer_creditos(a.id, l.preco);
    end if;
    update public.lances
      set situacao = 'enviado', enviado_em = now(), avisados = v_n,
          preco = case when v_n = 0 then 0 else preco end, updated_at = now()
      where id = l.id;
    v_feitos := v_feitos + 1;
  end loop;
  return v_feitos;
end $$;

create or replace function public.rodar_leiloes()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.fechar_leiloes();
  perform public.enviar_notificacoes_do_leilao();
end $$;

-- O painel do admin ------------------------------------------------------------
create or replace function public.leiloes_do_admin()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_linha jsonb;
begin
  if not public.eh_admin() then
    raise exception 'Só o admin vê os leilões.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'config', (select to_jsonb(c) - 'id' from public.leilao_config c where id = 1),
    'fecha_em', public.proximo_fechamento(),
    'lances', coalesce((select jsonb_agg(public.lance_em_json(l)
                          || jsonb_build_object('academia_id', l.academia_id, 'academia', x.name,
                               'qualidade', coalesce(l.qualidade, public.qualidade_do_lance(l.academia_id, l.mensagem)))
                          order by l.fecha_em desc, l.regiao, l.situacao, l.valor desc)
                        from public.lances l join public.academias x on x.id = l.academia_id
                        where l.fecha_em >= now() - interval '30 days'), '[]'::jsonb));
end $$;

create or replace function public.cancelar_envio_do_lance(p_lance uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.lances;
begin
  if not public.eh_admin() then
    raise exception 'Só o admin cancela o envio.' using errcode = '42501';
  end if;
  select * into l from public.lances where id = p_lance and situacao in ('ganhou', 'aberto') for update;
  if not found then
    return false;
  end if;
  if l.situacao = 'ganhou' then
    perform public.mexer_creditos(l.academia_id, coalesce(l.preco, 0));
  end if;
  update public.lances set situacao = 'cancelado', preco = 0, updated_at = now() where id = p_lance;
  return true;
end $$;

create or replace function public.mudar_lance_minimo(p_valor integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o admin muda o lance mínimo.' using errcode = '42501';
  end if;
  if p_valor is null or p_valor < 1 or p_valor > 10000 then
    raise exception 'O lance mínimo vai de R$ 1 a R$ 10.000.' using errcode = '22023';
  end if;
  update public.leilao_config set lance_minimo = p_valor, updated_at = now() where id = 1;
  return p_valor;
end $$;

-- O relógio: de hora em hora, fecha o que venceu e manda o que chegou a hora.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'guiatennis-leiloes';
    perform cron.schedule('guiatennis-leiloes', '7 * * * *', 'select public.rodar_leiloes()');
  end if;
exception when others then
  raise warning 'leilão: o relógio não ligou (%).', sqlerrm;
end $$;

revoke all on function public.centro_da_regiao(text) from public, anon, authenticated;
revoke all on function public.qualidade_do_lance(uuid, text) from public, anon, authenticated;
revoke all on function public.destinatarios_da_regiao(text, uuid) from public, anon, authenticated;
revoke all on function public.mexer_creditos(uuid, integer) from public, anon, authenticated;
revoke all on function public.fechar_leiloes(timestamptz) from public, anon, authenticated;
revoke all on function public.enviar_notificacoes_do_leilao(timestamptz) from public, anon, authenticated;
revoke all on function public.rodar_leiloes() from public, anon, authenticated;
revoke all on function public.meu_leilao(uuid) from public, anon;
grant execute on function public.meu_leilao(uuid) to authenticated;
revoke all on function public.dar_lance(uuid, text, text, integer) from public, anon;
grant execute on function public.dar_lance(uuid, text, text, integer) to authenticated;
revoke all on function public.cancelar_lance(uuid) from public, anon;
grant execute on function public.cancelar_lance(uuid) to authenticated;
revoke all on function public.leiloes_do_admin() from public, anon;
grant execute on function public.leiloes_do_admin() to authenticated;
revoke all on function public.cancelar_envio_do_lance(uuid) from public, anon;
grant execute on function public.cancelar_envio_do_lance(uuid) to authenticated;
revoke all on function public.mudar_lance_minimo(integer) from public, anon;
grant execute on function public.mudar_lance_minimo(integer) to authenticated;

notify pgrst, 'reload schema';
