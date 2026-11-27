-- ============================================================
-- O chat de ajuda como canal com o GuiaTennis (regra 251, pedido do Breno em
-- 12/11/2026: "o chat de ajuda também pode funcionar como um canal para
-- feedback e reportar erros ... acompanhar com os clientes como eles estão
-- trabalhando para corrigir" e "quero poder ter acesso as conversas do chat
-- como admin e até poder enviar mensagens")
-- ============================================================
-- Como o Feedback Assistant da Apple e as conversas do Intercom:
--   relatos_do_chat            o erro ou a sugestão que a pessoa manda pelo
--                              chat (com a conta aberta), com a situação:
--                              recebido › em_andamento › concluido (ou
--                              nao_sera_feito). A pessoa acompanha na página
--                              Feedback; cada mudança vai por e-mail.
--   respostas_no_chat          as mensagens que o admin manda numa conversa
--                              guardada; aparecem no chat da pessoa e vão
--                              por e-mail.
--   guardar_conversa_de_ajuda  aceita as mensagens {de: 'equipe'} só quando
--                              elas existem em respostas_no_chat (o texto
--                              vem do banco, ninguém escreve no nome do
--                              GuiaTennis).
--   conversas_do_chat_admin,   o admin lê as conversas guardadas, responde
--   conversa_do_chat_admin,    e muda a situação dos relatos.
--   responder_no_chat,
--   relatos_do_chat_admin,
--   mudar_situacao_do_relato
--   sitemap                    ganha /sobre (regra 248).
-- Excluir a conta apaga tudo junto. Pode rodar de novo sem estragar nada.

create table if not exists public.relatos_do_chat (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  site text not null,
  conversa_id uuid references public.conversas_de_ajuda (id) on delete set null,
  tipo text not null,
  texto text not null,
  pagina text,
  situacao text not null default 'recebido',
  criado_em timestamptz not null default now(),
  situacao_em timestamptz not null default now()
);
alter table public.relatos_do_chat drop constraint if exists relatos_do_chat_ok;
alter table public.relatos_do_chat add constraint relatos_do_chat_ok
  check (site in ('parceiros', 'jogadores')
         and tipo in ('erro', 'sugestao')
         and char_length(texto) between 5 and 1000
         and char_length(coalesce(pagina, '')) <= 200
         and situacao in ('recebido', 'em_andamento', 'concluido', 'nao_sera_feito'));
create index if not exists relatos_do_chat_da_conta on public.relatos_do_chat (user_id, criado_em desc);
create index if not exists relatos_do_chat_abertos on public.relatos_do_chat (situacao, criado_em desc);

alter table public.relatos_do_chat enable row level security;
drop policy if exists "Ver os proprios relatos" on public.relatos_do_chat;
create policy "Ver os proprios relatos" on public.relatos_do_chat
  for select using (user_id = auth.uid());
revoke all on table public.relatos_do_chat from anon, authenticated;
grant select on table public.relatos_do_chat to authenticated;
grant all on table public.relatos_do_chat to service_role;

create table if not exists public.respostas_no_chat (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas_de_ajuda (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  texto text not null,
  criada_em timestamptz not null default now(),
  lida_em timestamptz
);
alter table public.respostas_no_chat drop constraint if exists respostas_no_chat_ok;
alter table public.respostas_no_chat add constraint respostas_no_chat_ok
  check (char_length(texto) between 1 and 1000);
create index if not exists respostas_no_chat_da_conta on public.respostas_no_chat (user_id, criada_em);
create index if not exists respostas_no_chat_da_conversa on public.respostas_no_chat (conversa_id, criada_em);

alter table public.respostas_no_chat enable row level security;
drop policy if exists "Ver as respostas das proprias conversas" on public.respostas_no_chat;
create policy "Ver as respostas das proprias conversas" on public.respostas_no_chat
  for select using (user_id = auth.uid());
revoke all on table public.respostas_no_chat from anon, authenticated;
grant select on table public.respostas_no_chat to authenticated;
grant all on table public.respostas_no_chat to service_role;

-- A conversa guardada aceita as respostas do GuiaTennis ({de: 'equipe', id})
-- só quando elas existem nesta conversa; o texto e a hora vêm do banco.
create or replace function public.guardar_conversa_de_ajuda(p_id uuid, p_site text, p_titulo text, p_mensagens jsonb, p_resolvida boolean default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_titulo text;
  v_msgs jsonb;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para guardar a conversa.' using errcode = '42501';
  end if;
  if p_site is null or p_site not in ('parceiros', 'jogadores') then
    raise exception 'Chat inválido.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_mensagens) is distinct from 'array' or jsonb_array_length(p_mensagens) = 0
     or jsonb_array_length(p_mensagens) > 120 or pg_column_size(p_mensagens) > 65536 then
    raise exception 'Conversa inválida.' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_mensagens) m
             where jsonb_typeof(m) is distinct from 'object'
                or coalesce(m->>'de', '') not in ('eu', 'gt', 'equipe')
                or jsonb_typeof(m->'texto') is distinct from 'string'
                or char_length(m->>'texto') > 2000
                or (m->>'de' = 'eu' and char_length(m->>'texto') > 300)) then
    raise exception 'Conversa inválida.' using errcode = '22023';
  end if;
  -- Só as respostas que existem nesta conversa, com o texto do banco.
  select coalesce(jsonb_agg(case when x.m->>'de' = 'equipe'
             then jsonb_build_object('de', 'equipe', 'id', r.id, 'texto', r.texto, 'em', r.criada_em)
             else x.m end order by x.i), '[]'::jsonb)
    into v_msgs
    from jsonb_array_elements(p_mensagens) with ordinality x(m, i)
    left join public.respostas_no_chat r
      on x.m->>'de' = 'equipe' and r.id::text = x.m->>'id' and r.conversa_id = p_id and r.user_id = auth.uid()
    where x.m->>'de' <> 'equipe' or r.id is not null;
  if jsonb_array_length(v_msgs) = 0 then
    raise exception 'Conversa inválida.' using errcode = '22023';
  end if;
  v_titulo := nullif(left(btrim(coalesce(p_titulo, '')), 80), '');
  if v_titulo is null then
    select nullif(left(btrim(e.m->>'texto'), 80), '') into v_titulo
      from jsonb_array_elements(v_msgs) with ordinality e(m, i)
      where e.m->>'de' = 'eu' order by e.i limit 1;
  end if;
  if v_titulo is null then
    raise exception 'Escreva a sua dúvida antes.' using errcode = '22023';
  end if;

  if p_id is not null then
    update public.conversas_de_ajuda
      set mensagens = v_msgs, titulo = v_titulo, atualizada_em = now(),
          resolvida = coalesce(p_resolvida, resolvida)
      where id = p_id and user_id = auth.uid()
      returning id into v_id;
  end if;
  -- Conversa nova (ou apagada em outro aparelho enquanto estava aberta).
  if v_id is null then
    insert into public.conversas_de_ajuda (user_id, site, titulo, mensagens, resolvida)
      values (auth.uid(), p_site, v_titulo, v_msgs, coalesce(p_resolvida, false))
      returning id into v_id;
    delete from public.conversas_de_ajuda
      where id in (select c.id from public.conversas_de_ajuda c
                   where c.user_id = auth.uid() and c.site = p_site
                   order by c.atualizada_em desc, c.criada_em desc
                   offset 50);
  end if;
  return v_id;
end $$;

revoke all on function public.guardar_conversa_de_ajuda(uuid, text, text, jsonb, boolean) from public, anon;
grant execute on function public.guardar_conversa_de_ajuda(uuid, text, text, jsonb, boolean) to authenticated;

-- O nome de quem tem a conta, para o admin: o do jogador ou o do Parceiros.
create or replace function public.nome_da_conta(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select nullif(btrim(j.nome), '') from public.jogadores j where j.user_id = p_user),
    (select nullif(btrim(x.nome_responsavel), '') from public.academia_acessos x where x.user_id = p_user),
    'Sem nome');
$$;
revoke all on function public.nome_da_conta(uuid) from public, anon, authenticated;

-- O erro ou a sugestão mandada pelo chat. Até 10 por dia por conta.
create or replace function public.enviar_relato_do_chat(p_site text, p_tipo text, p_texto text, p_pagina text, p_conversa uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.relatos_do_chat;
  v_texto text := left(btrim(coalesce(p_texto, '')), 1000);
  v_email text;
  v_quem text;
  v_resumo text;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para acompanhar o que você mandou.' using errcode = '42501';
  end if;
  if p_site is null or p_site not in ('parceiros', 'jogadores') or p_tipo is null or p_tipo not in ('erro', 'sugestao') then
    raise exception 'Relato inválido.' using errcode = '22023';
  end if;
  if char_length(v_texto) < 5 then
    raise exception 'Conte um pouco mais, em uma ou duas frases.' using errcode = '22023';
  end if;
  if (select count(*) from public.relatos_do_chat x where x.user_id = auth.uid() and x.criado_em > now() - interval '1 day') >= 10 then
    raise exception 'Você já mandou muitos relatos hoje. Tente de novo amanhã.' using errcode = '54000';
  end if;
  insert into public.relatos_do_chat (user_id, site, conversa_id, tipo, texto, pagina)
    values (auth.uid(), p_site,
            (select c.id from public.conversas_de_ajuda c where c.id = p_conversa and c.user_id = auth.uid()),
            p_tipo, v_texto, nullif(left(btrim(coalesce(p_pagina, '')), 200), ''))
    returning * into r;
  select u.email into v_email from auth.users u where u.id = auth.uid();
  v_quem := public.nome_da_conta(auth.uid()) || ' (' || coalesce(v_email, 'sem e-mail') || ', '
    || case when p_site = 'parceiros' then 'GuiaTennis Parceiros' else 'site dos jogadores' end || ')';
  v_resumo := v_quem || case when p_tipo = 'erro' then ' informou um erro' else ' mandou uma sugestão' end
    || coalesce(' em ' || r.pagina, '') || ': "' || v_texto || '"';
  perform public.aviso_ao_admin('relato-do-chat:' || r.id, 'relato_do_chat',
    case when p_tipo = 'erro' then 'Erro informado no chat' else 'Sugestão no chat' end,
    case when p_tipo = 'erro' then 'Erro informado no chat' else 'Sugestão no chat' end,
    public.email_p(public.html_texto(v_resumo))
      || public.email_p('Responda no chat e mude a situação em Chat de ajuda, no painel: a pessoa acompanha na página Feedback.'),
    v_resumo, 'chat');
  return to_jsonb(r) - 'user_id';
end $$;

-- Marca como lidas as respostas do GuiaTennis numa conversa da própria conta.
create or replace function public.marcar_respostas_lidas(p_conversa uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.respostas_no_chat set lida_em = now()
  where conversa_id = p_conversa and user_id = auth.uid() and lida_em is null;
$$;

-- As conversas guardadas, para o admin: sem as mensagens (vêm uma a uma).
create or replace function public.conversas_do_chat_admin()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o admin vê as conversas do chat.' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
             'id', c.id, 'site', c.site, 'titulo', c.titulo, 'resolvida', c.resolvida,
             'atualizada_em', c.atualizada_em, 'criada_em', c.criada_em,
             'mensagens', jsonb_array_length(c.mensagens),
             'nome', public.nome_da_conta(c.user_id),
             'email', (select u.email from auth.users u where u.id = c.user_id),
             'respostas', (select count(*) from public.respostas_no_chat r where r.conversa_id = c.id),
             'relatos', (select count(*) from public.relatos_do_chat x where x.conversa_id = c.id))
           order by c.atualizada_em desc)
         from (select * from public.conversas_de_ajuda order by atualizada_em desc limit 200) c), '[]'::jsonb);
end $$;

-- Uma conversa inteira, com as respostas que a pessoa ainda não abriu.
create or replace function public.conversa_do_chat_admin(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.conversas_de_ajuda;
begin
  if not public.eh_admin() then
    raise exception 'Só o admin vê as conversas do chat.' using errcode = '42501';
  end if;
  select * into c from public.conversas_de_ajuda where id = p_id;
  if not found then
    raise exception 'Conversa não encontrada.' using errcode = '22023';
  end if;
  return jsonb_build_object(
    'id', c.id, 'site', c.site, 'titulo', c.titulo, 'resolvida', c.resolvida, 'atualizada_em', c.atualizada_em,
    'nome', public.nome_da_conta(c.user_id),
    'email', (select u.email from auth.users u where u.id = c.user_id),
    'mensagens', c.mensagens,
    'respostas', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'texto', r.texto, 'em', r.criada_em, 'lida_em', r.lida_em) order by r.criada_em)
                           from public.respostas_no_chat r where r.conversa_id = c.id), '[]'::jsonb));
end $$;

-- O admin responde numa conversa: a mensagem aparece no chat da pessoa e vai
-- por e-mail, com o link que abre a conversa.
create or replace function public.responder_no_chat(p_conversa uuid, p_texto text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.conversas_de_ajuda;
  r public.respostas_no_chat;
  v_texto text := btrim(coalesce(p_texto, ''));
  v_email text;
  v_link text;
begin
  if not public.eh_admin() then
    raise exception 'Só o admin responde no chat.' using errcode = '42501';
  end if;
  if char_length(v_texto) = 0 or char_length(v_texto) > 1000 then
    raise exception 'Escreva a mensagem (até 1000 letras).' using errcode = '22023';
  end if;
  select * into c from public.conversas_de_ajuda where id = p_conversa;
  if not found then
    raise exception 'Conversa não encontrada.' using errcode = '22023';
  end if;
  insert into public.respostas_no_chat (conversa_id, user_id, texto) values (c.id, c.user_id, v_texto) returning * into r;
  update public.conversas_de_ajuda set resolvida = false, atualizada_em = now() where id = c.id;
  select u.email into v_email from auth.users u where u.id = c.user_id;
  v_link := public.site_dos_emails() || case when c.site = 'parceiros' then '/parceiros' else '/' end
    || '?chat=' || c.id || '&utm_source=Email-chat';
  if public.email_valido(v_email) then
    perform public.por_na_fila('resposta-no-chat:' || r.id, 'resposta_no_chat', v_email,
      'O GuiaTennis respondeu no chat',
      public.email_montado('O GuiaTennis respondeu no chat',
          public.email_p('Na conversa "' || public.html_texto(c.titulo) || '", o GuiaTennis respondeu:')
          || public.email_p(public.html_texto(v_texto)),
        'Abrir a conversa', v_link, 'Você recebe este e-mail porque conversou com o chat de ajuda do GuiaTennis.'),
      'Na conversa "' || c.titulo || '", o GuiaTennis respondeu: ' || v_texto || E'\n\n' || v_link);
  end if;
  return jsonb_build_object('id', r.id, 'texto', r.texto, 'em', r.criada_em, 'lida_em', r.lida_em);
end $$;

-- Os relatos, para o admin: os abertos primeiro.
create or replace function public.relatos_do_chat_admin()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o admin vê os relatos.' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg((to_jsonb(x) - 'user_id') || jsonb_build_object(
             'nome', public.nome_da_conta(x.user_id),
             'email', (select u.email from auth.users u where u.id = x.user_id))
           order by (x.situacao in ('concluido', 'nao_sera_feito')), x.criado_em desc)
         from (select * from public.relatos_do_chat order by criado_em desc limit 300) x), '[]'::jsonb);
end $$;

-- O admin muda a situação; a pessoa recebe um e-mail a cada mudança.
create or replace function public.mudar_situacao_do_relato(p_id uuid, p_situacao text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  x public.relatos_do_chat;
  v_email text;
  v_link text;
  v_rotulo text;
  v_frase text;
begin
  if not public.eh_admin() then
    raise exception 'Só o admin muda a situação.' using errcode = '42501';
  end if;
  if p_situacao is null or p_situacao not in ('recebido', 'em_andamento', 'concluido', 'nao_sera_feito') then
    raise exception 'Situação inválida.' using errcode = '22023';
  end if;
  select * into x from public.relatos_do_chat where id = p_id;
  if not found then
    raise exception 'Relato não encontrado.' using errcode = '22023';
  end if;
  if x.situacao = p_situacao then
    return to_jsonb(x) - 'user_id';
  end if;
  update public.relatos_do_chat set situacao = p_situacao, situacao_em = now() where id = p_id returning * into x;
  v_rotulo := case p_situacao
    when 'recebido' then 'Recebido'
    when 'em_andamento' then case when x.tipo = 'erro' then 'Em correção' else 'Em andamento' end
    when 'concluido' then case when x.tipo = 'erro' then 'Corrigido' else 'No ar' end
    else 'Não vamos fazer agora' end;
  v_frase := case p_situacao
    when 'em_andamento' then case when x.tipo = 'erro' then 'Estamos corrigindo o erro que você informou.' else 'Estamos trabalhando na sua sugestão.' end
    when 'concluido' then case when x.tipo = 'erro' then 'O erro que você informou foi corrigido. Obrigado por avisar.' else 'A sua sugestão já está no ar. Obrigado por ajudar a melhorar o GuiaTennis.' end
    when 'nao_sera_feito' then 'Analisamos com cuidado e, por enquanto, não vamos seguir com isso. Obrigado por contar.'
    else 'Recebemos o que você mandou e vamos analisar.' end;
  select u.email into v_email from auth.users u where u.id = x.user_id;
  v_link := public.site_dos_emails() || case when x.site = 'parceiros' then '/parceiros/feedback' else '/feedback' end || '?utm_source=Email-relato';
  if public.email_valido(v_email) then
    perform public.por_na_fila('relato-situacao:' || x.id || ':' || p_situacao, 'relato_situacao', v_email,
      (case when x.tipo = 'erro' then 'O erro que você informou' else 'A sua sugestão' end) || ': ' || lower(v_rotulo),
      public.email_montado(v_rotulo, public.email_p(public.html_texto(v_frase))
          || public.email_p('Você escreveu: "' || public.html_texto(x.texto) || '"'),
        'Acompanhar no GuiaTennis', v_link, 'Você recebe este e-mail porque mandou um relato pelo chat de ajuda do GuiaTennis.'),
      v_frase || E'\n\nVocê escreveu: "' || x.texto || '"' || E'\n\n' || v_link);
  end if;
  return to_jsonb(x) - 'user_id';
end $$;

revoke all on function public.enviar_relato_do_chat(text, text, text, text, uuid) from public, anon;
grant execute on function public.enviar_relato_do_chat(text, text, text, text, uuid) to authenticated;
revoke all on function public.marcar_respostas_lidas(uuid) from public, anon;
grant execute on function public.marcar_respostas_lidas(uuid) to authenticated;
revoke all on function public.conversas_do_chat_admin() from public, anon;
grant execute on function public.conversas_do_chat_admin() to authenticated;
revoke all on function public.conversa_do_chat_admin(uuid) from public, anon;
grant execute on function public.conversa_do_chat_admin(uuid) to authenticated;
revoke all on function public.responder_no_chat(uuid, text) from public, anon;
grant execute on function public.responder_no_chat(uuid, text) to authenticated;
revoke all on function public.relatos_do_chat_admin() from public, anon;
grant execute on function public.relatos_do_chat_admin() to authenticated;
revoke all on function public.mudar_situacao_do_relato(uuid, text) from public, anon;
grant execute on function public.mudar_situacao_do_relato(uuid, text) to authenticated;

-- O sitemap com /sobre (regra 248); o resto igual ao de 20261111120000.
create or replace function public.sitemap()
returns public."*/*"
language plpgsql
stable
set search_path = ''
as $$
declare
  xml text;
begin
  with no_ar as (
    -- Só colunas que o visitante lê: o sitemap roda com a permissão dele.
    select a.id, a.name, a.cidade, a.bairro, a.created_at from public.academias a
    where a.status = 'published'
      and (a.pausada is not true or a.pausada_ate <= now())
  ),
  enderecos as (
    -- A home primeiro, depois o Sobre, as regiões e as fichas.
    select 1 as grupo, 'https://guiatennis.com.br/' as loc, null::text as ordem
    union all
    select 1, 'https://guiatennis.com.br/sobre', '0'
    union all
    -- GuiaTennis Parceiros: apresentação, planos, ajuda e cadastro.
    select 1, 'https://guiatennis.com.br/parceiros' || p, p
      from unnest(array['', '/planos', '/ajuda', '/cadastro']) as p
    union all
    select distinct 2, 'https://guiatennis.com.br/quadras/' || public.slug(cidade), public.slug(cidade)
      from no_ar where public.slug(cidade) <> ''
    union all
    select distinct 2, 'https://guiatennis.com.br/quadras/' || public.slug(cidade) || '/' || public.slug(bairro),
        public.slug(cidade) || '/' || public.slug(bairro)
      from no_ar where public.slug(cidade) <> '' and public.slug(bairro) <> ''
    union all
    select 3, 'https://guiatennis.com.br/academia/' || public.slug_da_academia(name, id),
        to_char(created_at, 'YYYYMMDDHH24MISS') || id::text
      from no_ar
  )
  select xmlroot(
    xmlelement(name urlset,
      xmlattributes('http://www.sitemaps.org/schemas/sitemap/0.9' as xmlns),
      (select xmlagg(
          xmlelement(name url,
            xmlelement(name loc, e.loc),
            xmlelement(name changefreq, 'weekly'),
            case when e.loc = 'https://guiatennis.com.br/' then xmlelement(name priority, '1.0') end)
          order by e.grupo, e.ordem nulls first)
         from enderecos e)),
    version '1.0', standalone yes)::text
  into xml;
  perform set_config('response.headers',
    '[{"Content-Type": "application/xml; charset=utf-8"}, {"Cache-Control": "public, max-age=3600"}]', true);
  return convert_to(xml, 'UTF8')::public."*/*";
end;
$$;

grant execute on function public.sitemap() to anon, authenticated;

notify pgrst, 'reload schema';
