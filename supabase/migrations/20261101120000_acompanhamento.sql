-- ============================================================
-- Acompanhamento do jogador depois de chamar uma academia (regra 193,
-- pedido do Breno em 01/11/2026: "quero criar um sistema de acompanhamento
-- ao jogador que vai para academia depois de ter entrado em contato, dar as
-- instruções novamente de como chegar e reposições por whatsapp ou email.
-- confirmando se ele fez um agendamento, se aula ou locação e avisando 2h
-- antes de como fazer"; e "sim pode fazer assim por enquanto e deixar o
-- whatsapp opcional")
-- ============================================================
-- Como os e-mails do Booking e do Airbnb antes da chegada, o lembrete do
-- OpenTable e o "Você foi?" do Google Maps. O GuiaTennis não reserva: ele
-- pergunta ao jogador o que ele combinou com a academia.
--
--   1. A conta com o e-mail confirmado toca em "Falar no WhatsApp" de uma
--      academia: o site chama registrar_chamada (uma por academia a cada 7
--      dias; quem administra a academia e o admin ficam de fora).
--   2. No dia seguinte, das 10h às 21h (Brasília), o e-mail "Você marcou na
--      …?" com "Marquei aula", "Marquei locação" e "Ainda não".
--   3. Marcou: o site pergunta o dia e a hora e guarda como chegar, o
--      estacionamento e a regra de cancelamento e reposição que a ficha
--      mostra naquele momento (o texto da própria ficha).
--   4. Duas horas antes, o e-mail com o endereço, "Como chegar", a chegada,
--      o estacionamento, o cancelamento e a reposição e o WhatsApp da
--      academia; "Não vou mais" tira o lembrete.
--   5. Três horas depois do horário, "Como foi?" com o convite para avaliar
--      (não sai para quem já avaliou a academia).
--   Tudo é apagado 60 dias depois da chamada.
--
-- O WhatsApp do jogador é opcional, com o aceite guardado
-- (jogadores.whatsapp, whatsapp_aceite_em). O lembrete pelo WhatsApp entra
-- quando a Meta liberar o envio automático (depende do CNPJ); até lá, só
-- por e-mail. O acompanhamento começa ligado (jogadores.acompanhamento) e
-- desliga em Minha conta › Avisos por e-mail ou pelo link de cada e-mail.
--
-- Pode rodar de novo sem estragar nada.

alter table public.jogadores add column if not exists acompanhamento boolean not null default true;
alter table public.jogadores add column if not exists whatsapp text;
alter table public.jogadores add column if not exists whatsapp_aceite_em timestamptz;
alter table public.jogadores drop constraint if exists jogadores_whatsapp_valido;
alter table public.jogadores add constraint jogadores_whatsapp_valido
  check (whatsapp is null or (whatsapp ~ '^[0-9]{10,13}$' and whatsapp_aceite_em is not null));
grant update (acompanhamento) on table public.jogadores to authenticated;

create table if not exists public.acompanhamentos (
  id uuid primary key default gen_random_uuid(),
  chave uuid not null unique default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  academia_id uuid not null references public.academias (id) on delete cascade,
  criado_em timestamptz not null default now(),
  status text not null default 'aguardando',
  tipo text,
  quando timestamptz,
  instrucoes jsonb not null default '{}'::jsonb,
  respondido_em timestamptz,
  perguntado_em timestamptz,
  lembrado_em timestamptz,
  como_foi_em timestamptz
);
alter table public.acompanhamentos drop constraint if exists acompanhamentos_status_valido;
alter table public.acompanhamentos add constraint acompanhamentos_status_valido
  check (status in ('aguardando', 'marcou', 'nao_marcou', 'cancelado'));
alter table public.acompanhamentos drop constraint if exists acompanhamentos_tipo_valido;
alter table public.acompanhamentos add constraint acompanhamentos_tipo_valido
  check (tipo is null or tipo in ('aula', 'locacao'));
create index if not exists acompanhamentos_da_conta on public.acompanhamentos (user_id, academia_id, criado_em desc);
create index if not exists acompanhamentos_quando on public.acompanhamentos (status, quando);

alter table public.acompanhamentos enable row level security;
drop policy if exists "Jogador vê os próprios acompanhamentos" on public.acompanhamentos;
create policy "Jogador vê os próprios acompanhamentos" on public.acompanhamentos
  for select using (user_id = auth.uid() or public.eh_admin());
revoke all on table public.acompanhamentos from anon, authenticated;
grant select (id, chave, academia_id, criado_em, status, tipo, quando) on table public.acompanhamentos to authenticated;

-- 1. A chamada ----------------------------------------------------------------
create or replace function public.registrar_chamada(p_academia uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null or p_academia is null or public.eh_admin() then
    return null;
  end if;
  if not exists (select 1 from public.jogadores j
                 where j.user_id = v_user and j.email_confirmado_em is not null and j.acompanhamento) then
    return null;
  end if;
  if not exists (select 1 from public.academias a where a.id = p_academia and public.academia_no_ar(a)) then
    return null;
  end if;
  if exists (select 1 from public.academia_vinculos v where v.user_id = v_user and v.academia_id = p_academia) then
    return null;
  end if;
  select x.id into v_id from public.acompanhamentos x
    where x.user_id = v_user and x.academia_id = p_academia
      and (x.criado_em > now() - interval '7 days' or (x.status = 'marcou' and x.quando > now()))
    order by x.criado_em desc limit 1;
  if v_id is not null then
    return v_id;
  end if;
  -- No máximo 10 academias novas por dia em cada conta.
  if (select count(*) from public.acompanhamentos x where x.user_id = v_user and x.criado_em > now() - interval '1 day') >= 10 then
    return null;
  end if;
  insert into public.acompanhamentos (user_id, academia_id) values (v_user, p_academia) returning id into v_id;
  return v_id;
end $$;

-- 2. O link dos e-mails: quem tem a chave vê e responde, sem entrar ----------
create or replace function public.acompanhamento_por_chave(p_chave uuid)
returns table (academia_id uuid, academia text, status text, tipo text, quando timestamptz, tem_whatsapp boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select x.academia_id, a.name, x.status, x.tipo, x.quando, j.whatsapp is not null
  from public.acompanhamentos x
  join public.academias a on a.id = x.academia_id
  left join public.jogadores j on j.user_id = x.user_id
  where x.chave = p_chave;
$$;

-- O texto de um campo das instruções: só texto, curto.
create or replace function public.texto_das_instrucoes(p jsonb, p_campo text, p_max int)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(left(btrim(regexp_replace(coalesce(p ->> p_campo, ''), '\s+', ' ', 'g')), p_max), '');
$$;

create or replace function public.responder_acompanhamento(
  p_chave uuid, p_resposta text, p_dia date default null, p_hora text default null,
  p_instrucoes jsonb default '{}'::jsonb, p_whatsapp text default null, p_aceite_whatsapp boolean default false)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  x public.acompanhamentos;
  v_quando timestamptz;
  v_whats text := nullif(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), '');
  v_inst jsonb;
begin
  select * into x from public.acompanhamentos where chave = p_chave;
  if not found then
    raise exception 'Este link não vale mais.' using errcode = '22023';
  end if;
  if p_resposta = 'nao' then
    update public.acompanhamentos set status = 'nao_marcou', respondido_em = now() where id = x.id;
    return 'nao_marcou';
  elsif p_resposta = 'cancelar' then
    update public.acompanhamentos set status = 'cancelado', respondido_em = now() where id = x.id;
    return 'cancelado';
  elsif p_resposta not in ('aula', 'locacao') then
    raise exception 'Resposta inválida.' using errcode = '22023';
  end if;
  if p_dia is null or coalesce(p_hora, '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    raise exception 'Escolha o dia e a hora.' using errcode = '22023';
  end if;
  v_quando := (p_dia::text || ' ' || p_hora)::timestamp at time zone 'America/Sao_Paulo';
  if v_quando < now() - interval '30 minutes' then
    raise exception 'Esse horário já passou. Confira o dia e a hora.' using errcode = '22023';
  end if;
  if v_quando > now() + interval '60 days' then
    raise exception 'Escolha um dia nos próximos 60 dias.' using errcode = '22023';
  end if;
  if v_whats is not null and not coalesce(p_aceite_whatsapp, false) then
    raise exception 'Para guardar o WhatsApp, marque que aceita receber os lembretes nele.' using errcode = '22023';
  end if;
  if v_whats is not null and v_whats !~ '^[0-9]{10,13}$' then
    raise exception 'Confira o WhatsApp: DDD e número.' using errcode = '22023';
  end if;
  v_inst := jsonb_strip_nulls(jsonb_build_object(
    'endereco', public.texto_das_instrucoes(p_instrucoes, 'endereco', 200),
    'chegada', public.texto_das_instrucoes(p_instrucoes, 'chegada', 600),
    'estacionamento', public.texto_das_instrucoes(p_instrucoes, 'estacionamento', 600),
    'cancelamento', public.texto_das_instrucoes(p_instrucoes, 'cancelamento', 800)));
  update public.acompanhamentos
    set status = 'marcou', tipo = p_resposta, quando = v_quando, instrucoes = v_inst, respondido_em = now(),
        lembrado_em = null, como_foi_em = null
    where id = x.id;
  if v_whats is not null then
    update public.jogadores set whatsapp = v_whats, whatsapp_aceite_em = now() where user_id = x.user_id;
  end if;
  return 'marcou';
end $$;

-- 3. O WhatsApp opcional, na conta -------------------------------------------
create or replace function public.salvar_whatsapp_do_jogador(p_whatsapp text, p_aceite boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_whats text := nullif(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), '');
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta.' using errcode = '42501';
  end if;
  if v_whats is null then
    update public.jogadores set whatsapp = null, whatsapp_aceite_em = null where user_id = auth.uid();
    return null;
  end if;
  if v_whats !~ '^[0-9]{10,13}$' then
    raise exception 'Confira o WhatsApp: DDD e número.' using errcode = '22023';
  end if;
  if not coalesce(p_aceite, false) then
    raise exception 'Para guardar o WhatsApp, marque que aceita receber os lembretes nele.' using errcode = '22023';
  end if;
  update public.jogadores
    set whatsapp = v_whats,
        whatsapp_aceite_em = case when whatsapp = v_whats and whatsapp_aceite_em is not null then whatsapp_aceite_em else now() end
    where user_id = auth.uid();
  return v_whats;
end $$;

-- 4. Os e-mails ----------------------------------------------------------------
create or replace function public.hora_por_extenso(t timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select case when extract(minute from t at time zone 'America/Sao_Paulo') = 0
    then to_char(t at time zone 'America/Sao_Paulo', 'FMHH24"h"')
    else to_char(t at time zone 'America/Sao_Paulo', 'FMHH24"h"MI') end;
$$;

create or replace function public.link_do_acompanhamento(p_chave uuid, p_resposta text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select public.site_dos_emails() || '/?marquei=' || p_chave::text
    || case when p_resposta is null then '' else '&r=' || p_resposta end;
$$;

-- p_agora: o relógio (o teste do banco passa outro).
drop function if exists public.rodar_acompanhamentos();
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
begin
  -- 4.1 "Você marcou?": no dia seguinte à chamada, das 10h às 21h.
  if extract(hour from v_agora) between 10 and 20 then
    for r in
      select x.id, x.chave, x.criado_em, j.nome, j.email, j.token_avisos, a.name as academia, a.modalidades
      from public.acompanhamentos x
      join public.jogadores j on j.user_id = x.user_id
      join public.academias a on a.id = x.academia_id
      where x.status = 'aguardando' and x.perguntado_em is null
        and (x.criado_em at time zone 'America/Sao_Paulo')::date < v_agora::date
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
        || public.email_p('Se marcou, conte o dia e a hora: duas horas antes, mandamos como chegar e a regra de cancelamento e reposição.')
        || v_botoes;
      v_texto := 'Olá' || coalesce(', ' || v_primeiro, '') || '. No dia '
        || public.data_por_extenso((r.criado_em at time zone 'America/Sao_Paulo')::date)
        || ', você chamou a ' || r.academia || E' pelo GuiaTennis.\n\nSe marcou, conte o dia e a hora: duas horas antes, mandamos como chegar e a regra de cancelamento e reposição.\n\n'
        || case when v_aula then 'Marquei aula: ' || public.link_do_acompanhamento(r.chave, 'aula') || E'\n' else '' end
        || case when v_loc then 'Marquei locação: ' || public.link_do_acompanhamento(r.chave, 'locacao') || E'\n' else '' end
        || 'Ainda não: ' || public.link_do_acompanhamento(r.chave, 'nao');
      v_rodape := 'Você recebe este e-mail porque chamou uma academia pelo GuiaTennis com a sua conta. '
        || '<a href="' || public.html_texto(v_parar) || '" style="color:#6B6458">Não quero mais esse acompanhamento</a>.';
      perform public.por_na_fila('acomp-pergunta:' || r.id, 'acompanhamento', r.email,
        'Você marcou na ' || r.academia || '?',
        public.email_montado('Você marcou na ' || r.academia || '?', v_corpo, null, null, v_rodape),
        v_texto || E'\n\nNão quer mais esse acompanhamento? ' || v_parar, v_parar);
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
      || '<a href="' || public.html_texto(v_parar) || '" style="color:#6B6458">Não quero mais esse acompanhamento</a>.';
    perform public.por_na_fila('acomp-lembrete:' || r.id || ':' || to_char(r.quando at time zone 'UTC', 'YYYYMMDDHH24MI'), 'acompanhamento', r.email,
      v_oque || ' ' || v_dia || ' às ' || v_hora || ': ' || (r.academia_linha).name,
      public.email_montado(v_oque || ' ' || v_dia || ' às ' || v_hora, v_corpo, 'Como chegar', v_rota, v_rodape),
      v_oque || ' ' || v_dia || ' às ' || v_hora || E'\n\n' || v_texto || E'\n\nComo chegar: ' || v_rota
        || E'\n\nNão vai mais? Tirar o lembrete: ' || public.link_do_acompanhamento(r.chave, 'cancelar')
        || E'\nNão quer mais esse acompanhamento? ' || v_parar,
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
          || '<a href="' || public.html_texto(v_parar) || '" style="color:#6B6458">Não quero mais esse acompanhamento</a>.'),
        'Olá' || coalesce(', ' || v_primeiro, '') || '. Conte como foi a ' || case when r.tipo = 'locacao' then 'locação' else 'aula' end
          || ' na ' || r.academia || E': a sua avaliação ajuda outros jogadores a escolher.\n\nAvaliar a academia: ' || v_ficha
          || E'\n\nNão quer mais esse acompanhamento? ' || v_parar,
        v_parar);
      update public.acompanhamentos set como_foi_em = now() where id = r.id;
      v_n := v_n + 1;
    end loop;
  end if;

  -- 4.4 Nada fica guardado depois de 60 dias.
  delete from public.acompanhamentos where criado_em < p_agora - interval '60 days';
  return v_n;
end $$;

-- 5. "Não quero mais esse acompanhamento" (o link de cada e-mail) -------------
create or replace function public.parar_avisos(p_token uuid, p_aviso text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if p_token is null then
    return null;
  end if;
  select user_id into v_user from public.jogadores where token_avisos = p_token;
  if v_user is not null then
    if p_aviso = 'viagem' then
      update public.jogadores set avisos_viagem = false, avisos_mudados_em = now() where user_id = v_user;
      return 'viagem';
    elsif p_aviso = 'novas' then
      update public.jogadores set avisos_academias = false, avisos_mudados_em = now() where user_id = v_user;
      update public.buscas_salvas set avisar = false where user_id = v_user;
      return 'novas';
    elsif p_aviso = 'promocoes' then
      update public.jogadores set promocoes = false, avisos_mudados_em = now() where user_id = v_user;
      return 'promocoes';
    elsif p_aviso = 'volta' then
      update public.jogadores set lembrete_de_volta = false, avisos_mudados_em = now() where user_id = v_user;
      return 'volta';
    elsif p_aviso = 'acompanhamento' then
      update public.jogadores set acompanhamento = false, avisos_mudados_em = now() where user_id = v_user;
      return 'acompanhamento';
    end if;
    update public.jogadores
      set avisos_academias = false, promocoes = false, novidades = false, avisos_viagem = false,
          lembrete_de_volta = false, acompanhamento = false, avisos_mudados_em = now()
      where user_id = v_user;
    update public.buscas_salvas set avisar = false where user_id = v_user;
    return 'todos';
  end if;
  select user_id into v_user from public.academia_acessos where token_avisos = p_token;
  if v_user is not null then
    update public.academia_acessos set avisos_por_email = false, updated_at = now() where user_id = v_user;
    return 'parceiros';
  end if;
  return null;
end $$;

revoke all on function public.registrar_chamada(uuid) from public, anon;
grant execute on function public.registrar_chamada(uuid) to authenticated;
revoke all on function public.acompanhamento_por_chave(uuid) from public;
grant execute on function public.acompanhamento_por_chave(uuid) to anon, authenticated;
revoke all on function public.responder_acompanhamento(uuid, text, date, text, jsonb, text, boolean) from public;
grant execute on function public.responder_acompanhamento(uuid, text, date, text, jsonb, text, boolean) to anon, authenticated;
revoke all on function public.salvar_whatsapp_do_jogador(text, boolean) from public, anon;
grant execute on function public.salvar_whatsapp_do_jogador(text, boolean) to authenticated;
revoke all on function public.texto_das_instrucoes(jsonb, text, int) from public, anon, authenticated;
revoke all on function public.hora_por_extenso(timestamptz) from public, anon, authenticated;
revoke all on function public.link_do_acompanhamento(uuid, text) from public, anon, authenticated;
revoke all on function public.rodar_acompanhamentos(timestamptz) from public, anon, authenticated;
revoke all on function public.parar_avisos(uuid, text) from public;
grant execute on function public.parar_avisos(uuid, text) to anon, authenticated;

-- O relógio: a cada 10 minutos.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'guiatennis-acompanhamento';
    perform cron.schedule('guiatennis-acompanhamento', '*/10 * * * *', 'select public.rodar_acompanhamentos()');
  end if;
exception when others then
  raise warning 'acompanhamento: o relógio não ligou (%).', sqlerrm;
end $$;

notify pgrst, 'reload schema';
