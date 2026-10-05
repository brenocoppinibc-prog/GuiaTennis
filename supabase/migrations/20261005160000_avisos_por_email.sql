-- ============================================================
-- Avisos por e-mail pelo Resend (pedido do Breno em 05/10/2026)
-- ============================================================
-- Como o Google Business Profile ("Você recebeu uma avaliação nova",
-- "Alguém pediu acesso ao seu perfil"), o Airbnb e o Booking ("Sua viagem
-- para…") e o Zillow e o Idealista (alerta de anúncio novo na busca
-- salva), o GuiaTennis manda sozinho, por e-mail:
--
--   avaliacao           avaliação nova → quem administra a academia
--   pedido_responsavel  pedido de acesso → o responsável principal
--   pedido_guiatennis   pedido para o GuiaTennis conferir → o admin
--   pedido_aceito       pedido aceito → quem pediu
--   viagem              "Vou viajar" → o jogador, 7 dias antes da ida (ou
--                       logo, se a viagem não tem data ou falta menos)
--   academias_novas     academia nova na cidade da conta ou numa busca
--                       salva com aviso → o jogador, uma vez por dia, às 10h
--
-- Como funciona, sem servidor novo: cada aviso entra na fila
-- (emails_a_enviar) e, a cada minuto, o relógio do banco (pg_cron) chama
-- enviar_emails(), que manda pela API do Resend (pg_net). A chave do Resend
-- fica no cofre do Supabase (Vault), nunca no código: quem põe é o GitHub,
-- a partir do segredo RESEND_API_KEY (.github/workflows/banco.yml).
--
-- Só recebe aviso quem confirmou o e-mail pelo código; o jogador escolhe
-- os avisos na conta (começam desligados) e todo e-mail tem o link "não
-- quero mais receber", que funciona sem entrar na conta.
--
-- Sem a chave, sem o pg_net ou sem o pg_cron, os avisos ficam na fila e
-- nada quebra: avaliar, pedir acesso e salvar a conta continuam iguais.
-- Pode rodar de novo sem estragar nada.

-- Extensões -----------------------------------------------------------
-- No Supabase, as duas vêm prontas para ligar (Database → Extensions). Se
-- não ligar, avisa e segue.
do $$
begin
  begin
    create extension if not exists pg_net with schema extensions;
  exception when others then
    begin
      create extension if not exists pg_net;
    exception when others then
      raise warning 'avisos por e-mail: o pg_net não ligou (%). Os e-mails ficam na fila.', sqlerrm;
    end;
  end;
  begin
    create extension if not exists pg_cron with schema pg_catalog;
  exception when others then
    begin
      create extension if not exists pg_cron;
    exception when others then
      raise warning 'avisos por e-mail: o pg_cron não ligou (%). Os e-mails ficam na fila.', sqlerrm;
    end;
  end;
end $$;

-- Configuração ----------------------------------------------------------
-- O endereço do site nos links (no banco de teste, a prévia do PR) e o
-- remetente, o mesmo do código de confirmação.
create table if not exists public.emails_configuracao (
  id boolean primary key default true check (id),
  site text not null default 'https://guiatennis.com.br',
  remetente text not null default 'GuiaTennis <nao-responda@guiatennis.com.br>',
  prefixo text not null default '',
  admin text not null default 'guiatennis1@gmail.com'
);
insert into public.emails_configuracao (id) values (true) on conflict (id) do nothing;
alter table public.emails_configuracao enable row level security;
revoke all on table public.emails_configuracao from anon, authenticated;

-- A fila ----------------------------------------------------------------
-- "chave" não deixa o mesmo aviso sair duas vezes.
create table if not exists public.emails_a_enviar (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  tipo text not null,
  para text not null,
  assunto text not null,
  html text not null,
  texto text not null,
  descadastro text,
  criado_em timestamptz not null default now(),
  tentativas int not null default 0,
  pedido_id bigint,
  pedido_em timestamptz,
  enviado_em timestamptz,
  resend_id text,
  erro text
);
create index if not exists emails_a_enviar_pendentes
  on public.emails_a_enviar (criado_em) where enviado_em is null;
alter table public.emails_a_enviar enable row level security;
revoke all on table public.emails_a_enviar from anon, authenticated;
grant all on table public.emails_a_enviar to service_role;

-- Colunas novas -----------------------------------------------------------
-- O link "não quero mais receber" leva um número sorteado de cada conta.
alter table public.jogadores add column if not exists token_avisos uuid not null default gen_random_uuid();
alter table public.jogadores add column if not exists academias_avisadas_ate timestamptz;
alter table public.academia_acessos add column if not exists token_avisos uuid not null default gen_random_uuid();
-- Avaliação nova e pedido de acesso: avisos de serviço, começam ligados
-- (como no Google Business Profile) e a academia desliga no Perfil.
alter table public.academia_acessos add column if not exists avisos_por_email boolean not null default true;
-- Quando a academia entrou no guia (para o aviso de academia nova). As que
-- já estavam publicadas não contam como novas.
alter table public.academias add column if not exists publicada_em timestamptz;
update public.academias set publicada_em = coalesce(created_at, now())
  where status = 'published' and publicada_em is null;

create or replace function public.marcar_publicada_em()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and auth.uid() is not null and not public.eh_admin() then
    new.publicada_em := old.publicada_em;
  end if;
  if new.status = 'published' and new.publicada_em is null then
    new.publicada_em := now();
  end if;
  return new;
end $$;
drop trigger if exists marcar_publicada_em on public.academias;
create trigger marcar_publicada_em
  before insert or update on public.academias
  for each row execute function public.marcar_publicada_em();

-- Ajudantes ---------------------------------------------------------------
create or replace function public.site_dos_emails()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select rtrim(site, '/') from public.emails_configuracao where id), 'https://guiatennis.com.br');
$$;

create or replace function public.email_valido(p text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p, '') ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     and lower(p) not like '%@acesso.guiatennis.com.br';
$$;

create or replace function public.html_texto(t text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(replace(replace(coalesce(t, ''),
    '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;');
$$;

-- Um parágrafo do e-mail (o texto já vem em HTML seguro).
create or replace function public.email_p(p_html text)
returns text
language sql
immutable
set search_path = ''
as $$
  select '<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#1F2A24">' || coalesce(p_html, '') || '</p>';
$$;

-- O e-mail inteiro, no mesmo visual do código de confirmação
-- (divulgacao/email-codigo.html).
create or replace function public.email_montado(
  p_titulo text, p_corpo text, p_botao text, p_link text, p_rodape text)
returns text
language sql
immutable
set search_path = ''
as $$
  select '<div style="margin:0;padding:24px 12px;background:#F6F1E7;font-family:Arial,Helvetica,sans-serif;color:#1F2A24">'
    || '<div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:28px 24px;border:1px solid #E7DFD0">'
    || '<p style="margin:0 0 18px;font-family:Georgia,''Times New Roman'',serif;font-size:22px;font-weight:bold;color:#1F4D3A">GuiaTennis</p>'
    || '<h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:#1F2A24">' || public.html_texto(p_titulo) || '</h1>'
    || coalesce(p_corpo, '')
    || case when p_botao is null then '' else
         '<p style="margin:22px 0 4px"><a href="' || public.html_texto(p_link) || '" style="display:inline-block;background:#1F4D3A;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 22px;border-radius:10px">'
         || public.html_texto(p_botao) || '</a></p>' end
    || '<p style="margin:26px 0 0;padding-top:14px;border-top:1px solid #EFE8DA;font-size:12px;line-height:1.5;color:#6B6458">' || coalesce(p_rodape, '') || '</p>'
    || '<p style="margin:8px 0 0;font-size:12px;color:#6B6458">GuiaTennis · guiatennis.com.br</p>'
    || '</div></div>';
$$;

create or replace function public.link_parar_avisos(p_token uuid, p_aviso text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select public.site_dos_emails() || '/?parar-avisos=' || p_token::text || '&aviso=' || p_aviso;
$$;

-- Põe um aviso na fila. Devolve se entrou (o mesmo aviso não entra duas vezes).
create or replace function public.por_na_fila(
  p_chave text, p_tipo text, p_para text, p_assunto text, p_html text, p_texto text,
  p_descadastro text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.email_valido(p_para) then
    return false;
  end if;
  insert into public.emails_a_enviar (chave, tipo, para, assunto, html, texto, descadastro)
  values (p_chave, p_tipo, lower(btrim(p_para)), left(p_assunto, 200), p_html, p_texto, p_descadastro)
  on conflict (chave) do nothing
  returning id into v_id;
  return v_id is not null;
end $$;

create or replace function public.data_por_extenso(d date)
returns text
language sql
immutable
set search_path = ''
as $$
  select extract(day from d)::int || ' de ' || (array['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'])[extract(month from d)::int];
$$;

create or replace function public.datas_da_viagem(p_ida date, p_volta date)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_ida is null then null
    when p_volta is null then 'A partir de ' || public.data_por_extenso(p_ida)
    when p_volta = p_ida then public.data_por_extenso(p_ida)
    when date_trunc('month', p_ida) = date_trunc('month', p_volta)
      then extract(day from p_ida)::int || ' a ' || public.data_por_extenso(p_volta)
    else public.data_por_extenso(p_ida) || ' a ' || public.data_por_extenso(p_volta)
  end;
$$;

create or replace function public.km_entre(
  lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 2 * 6371 * asin(least(1, sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2))));
$$;

-- Filtro da busca salva (piso, cobertura, modalidade): vazio aceita tudo;
-- com valores, basta a academia ter um deles, como no site.
create or replace function public.combina_com_o_filtro(p_tem jsonb, p_quer jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_quer is null or jsonb_typeof(p_quer) <> 'array' or jsonb_array_length(p_quer) = 0
      or (jsonb_typeof(p_tem) = 'array'
          and exists (select 1 from jsonb_array_elements_text(p_quer) q where p_tem ? q));
$$;

create or replace function public.academia_no_ar(a public.academias)
returns boolean
language sql
stable
set search_path = ''
as $$
  select a.status = 'published' and (coalesce(a.pausada, false) = false or a.pausada_ate <= now());
$$;

-- A lista de academias do e-mail (viagem e academias novas), na ordem
-- dada: nome com link para a ficha, bairro, o que oferece e a nota.
create or replace function public.lista_de_academias_email(
  p_ids uuid[], p_utm text, out html text, out texto text)
language sql
stable
security definer
set search_path = ''
as $$
  with a as (
    select x.ord, c.id, c.name,
      nullif(concat_ws(', ', nullif(btrim(c.bairro), ''), nullif(btrim(c.cidade), '')), '') as lugar,
      case
        when c.modalidades ? 'aulas_proprias' and c.modalidades ? 'locacao' then 'Aulas e locação'
        when c.modalidades ? 'aulas_proprias' then 'Aulas'
        when c.modalidades ? 'locacao' then 'Locação de quadra'
      end as oferece,
      (select count(*) from public.avaliacoes v where v.academia_id = c.id) as n,
      (select round(avg(v.stars)::numeric, 1) from public.avaliacoes v where v.academia_id = c.id) as nota
    from unnest(p_ids) with ordinality as x(id, ord)
    join public.academias c on c.id = x.id
  ), l as (
    select ord, name,
      public.site_dos_emails() || '/academia/' || public.slug_da_academia(name, id) || '?utm_source=' || p_utm as link,
      concat_ws(' · ', lugar, oferece,
        case when n > 0 then replace(nota::text, '.', ',') || ' ★ (' || n || ')' end) as sub
    from a
  )
  select
    coalesce(string_agg(
      '<div style="padding:12px 0;border-top:1px solid #EFE8DA">'
      || '<a href="' || public.html_texto(link) || '" style="font-size:16px;font-weight:bold;color:#1F4D3A;text-decoration:none">' || public.html_texto(name) || '</a>'
      || case when sub <> '' then '<div style="margin-top:3px;font-size:13px;line-height:1.4;color:#6B6458">' || public.html_texto(sub) || '</div>' else '' end
      || '</div>', '' order by ord), ''),
    coalesce(string_agg('• ' || name || case when sub <> '' then ' (' || sub || ')' else '' end || E'\n  ' || link, E'\n' order by ord), '')
  from l;
$$;

-- Quem da academia recebe: as pessoas com e-mail confirmado e com os
-- avisos ligados (p_principal: só o responsável principal).
create or replace function public.quem_recebe_da_academia(p_academia uuid, p_principal boolean default false)
returns table (user_id uuid, email text, token_avisos uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select x.user_id, x.email, x.token_avisos
  from public.academia_vinculos m
  join public.academia_acessos x on x.user_id = m.user_id
  where m.academia_id = p_academia
    and (not p_principal or m.papel = 'principal')
    and x.avisos_por_email
    and x.email_confirmado_em is not null
    and public.email_valido(x.email);
$$;

create or replace function public.hoje_em_brasilia()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- 1. Avaliação nova → quem administra a academia ----------------------------
create or replace function public.aviso_de_avaliacao_nova()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia text;
  v_nome text;
  v_comentario text;
  v_estrelas text;
  v_link text := public.site_dos_emails() || '/parceiros/painel?utm_source=Email-avaliacao';
  v_corpo text;
  r record;
begin
  select name into v_academia from public.academias where id = new.academia_id;
  if v_academia is null then
    return new;
  end if;
  v_nome := coalesce(nullif(btrim(new.nome_autor), ''), 'Um jogador');
  v_comentario := left(btrim(coalesce(new.comment, '')), 600);
  v_estrelas := repeat('★', new.stars) || repeat('☆', 5 - new.stars);
  v_corpo := public.email_p('<strong>' || public.html_texto(v_nome) || '</strong> avaliou a <strong>'
               || public.html_texto(v_academia) || '</strong> no GuiaTennis:')
    || '<p style="margin:0 0 4px;font-size:24px;letter-spacing:2px;color:#C9A227">' || v_estrelas || '</p>'
    || '<p style="margin:0 0 12px;font-size:13px;color:#6B6458">' || new.stars || ' de 5</p>'
    || case when v_comentario <> '' then
         '<p style="margin:0 0 14px;padding:12px 14px;background:#F6F1E7;border-radius:10px;font-size:15px;line-height:1.55;color:#1F2A24">“'
         || public.html_texto(v_comentario) || '”</p>' else '' end
    || public.email_p('Responder mostra aos próximos jogadores que a academia cuida de quem joga lá. A resposta aparece embaixo da avaliação, no site.')
    || case when new.stars <= 2 then
         public.email_p('A avaliação não parece ser de quem jogou aí? No painel, toque em <strong>Pedir análise</strong> no cartão da avaliação.') else '' end;
  for r in select * from public.quem_recebe_da_academia(new.academia_id) loop
    perform public.por_na_fila(
      'avaliacao:' || new.id || ':' || r.user_id, 'avaliacao', r.email,
      v_academia || ' recebeu uma avaliação nova (' || new.stars || ' de 5)',
      public.email_montado('Avaliação nova', v_corpo, 'Responder a avaliação', v_link,
        'Você recebe este e-mail porque administra a ' || public.html_texto(v_academia)
        || ' no GuiaTennis Parceiros. <a href="' || public.html_texto(public.link_parar_avisos(r.token_avisos, 'parceiros'))
        || '" style="color:#6B6458">Não quero mais receber avisos por e-mail</a>.'),
      v_nome || ' avaliou a ' || v_academia || ' no GuiaTennis: ' || v_estrelas || ' (' || new.stars || ' de 5)'
        || case when v_comentario <> '' then E'\n\n"' || v_comentario || '"' else '' end
        || E'\n\nResponda pelo painel: ' || v_link
        || E'\n\nNão quer mais receber avisos por e-mail? ' || public.link_parar_avisos(r.token_avisos, 'parceiros'),
      public.link_parar_avisos(r.token_avisos, 'parceiros'));
  end loop;
  return new;
exception when others then
  raise warning 'aviso de avaliação nova: %', sqlerrm;
  return new;
end $$;

drop trigger if exists aviso_de_avaliacao_nova on public.avaliacoes;
create trigger aviso_de_avaliacao_nova
  after insert on public.avaliacoes
  for each row execute function public.aviso_de_avaliacao_nova();

-- 2. Pedido de acesso → o responsável (ou o GuiaTennis) ---------------------
create or replace function public.aviso_de_pedido_de_acesso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  p public.academia_acessos;
  c public.emails_configuracao;
  v_quem text;
  v_dados text;
  v_link text;
  v_corpo text;
  v_dia text := public.hoje_em_brasilia()::text;
  r record;
begin
  select * into a from public.academias where id = new.academia_id;
  select * into p from public.academia_acessos where user_id = new.user_id;
  if a.id is null or p.user_id is null then
    return new;
  end if;
  v_quem := coalesce(nullif(btrim(p.nome_responsavel), ''), p.email, 'Uma pessoa');
  v_dados := concat_ws(' · ', nullif(btrim(coalesce(p.cargo, '')), ''),
    case when public.email_valido(p.email) then p.email end);

  if new.destino = 'responsavel' then
    v_link := public.site_dos_emails() || '/parceiros/pessoas?utm_source=Email-pedido';
    v_corpo := public.email_p('<strong>' || public.html_texto(v_quem) || '</strong>'
        || case when v_dados <> '' then ' (' || public.html_texto(v_dados) || ')' else '' end
        || ' pediu para administrar a <strong>' || public.html_texto(a.name) || '</strong> com você no GuiaTennis Parceiros.')
      || public.email_p('Se a pessoa trabalha com você, aceite em <strong>Pessoas</strong>, no painel da academia. Se não conhece, recuse: ela não vê nada da academia.');
    for r in select * from public.quem_recebe_da_academia(new.academia_id, true) loop
      continue when r.user_id = new.user_id;
      perform public.por_na_fila(
        'pedido:' || new.user_id || ':' || new.academia_id || ':' || r.user_id || ':' || v_dia,
        'pedido_responsavel', r.email,
        v_quem || ' pediu acesso à ' || a.name,
        public.email_montado('Pedido de acesso', v_corpo, 'Ver o pedido', v_link,
          'Você recebe este e-mail porque é o responsável pela ' || public.html_texto(a.name)
          || ' no GuiaTennis Parceiros. <a href="' || public.html_texto(public.link_parar_avisos(r.token_avisos, 'parceiros'))
          || '" style="color:#6B6458">Não quero mais receber avisos por e-mail</a>.'),
        v_quem || case when v_dados <> '' then ' (' || v_dados || ')' else '' end
          || ' pediu para administrar a ' || a.name || E' com você no GuiaTennis Parceiros.\n\n'
          || 'Se a pessoa trabalha com você, aceite em Pessoas, no painel da academia. Se não conhece, recuse.'
          || E'\n\nVer o pedido: ' || v_link
          || E'\n\nNão quer mais receber avisos por e-mail? ' || public.link_parar_avisos(r.token_avisos, 'parceiros'),
        public.link_parar_avisos(r.token_avisos, 'parceiros'));
    end loop;
  else
    -- Para o GuiaTennis conferir: vai para o e-mail do admin.
    select * into c from public.emails_configuracao where id;
    v_link := public.site_dos_emails() || '/?utm_source=Email-pedido';
    v_dados := concat_ws(' · ', v_dados,
      case when coalesce(p.whatsapp, '') <> '' then 'WhatsApp ' || p.whatsapp end);
    v_corpo := public.email_p('<strong>' || public.html_texto(v_quem) || '</strong>'
        || case when v_dados <> '' then ' (' || public.html_texto(v_dados) || ')' else '' end
        || case when a.status = 'published'
             then ' pediu para administrar a <strong>' || public.html_texto(a.name) || '</strong>.'
             else ' cadastrou a <strong>' || public.html_texto(a.name) || '</strong> e pediu para administrar.' end)
      || public.email_p(case when a.status = 'published'
           then 'Confira em <strong>Pedidos para administrar</strong>, no painel do admin, e gere o código.'
           else 'Confira a academia nas pendentes do painel do admin e publique: quem pediu passa a administrar.' end);
    perform public.por_na_fila(
      'pedido-guiatennis:' || new.user_id || ':' || new.academia_id || ':' || v_dia,
      'pedido_guiatennis', coalesce(c.admin, 'guiatennis1@gmail.com'),
      case when a.status = 'published' then 'Pedido para administrar a ' || a.name
           else 'Academia nova para aprovar: ' || a.name end,
      public.email_montado(case when a.status = 'published' then 'Pedido para administrar' else 'Academia nova para aprovar' end,
        v_corpo, 'Abrir o GuiaTennis', v_link, 'Aviso automático do GuiaTennis Parceiros.'),
      v_quem || case when v_dados <> '' then ' (' || v_dados || ')' else '' end
        || case when a.status = 'published' then ' pediu para administrar a ' || a.name || '.'
                else ' cadastrou a ' || a.name || ' e pediu para administrar.' end
        || E'\n\nAbrir o GuiaTennis: ' || v_link);
  end if;
  return new;
exception when others then
  raise warning 'aviso de pedido de acesso: %', sqlerrm;
  return new;
end $$;

drop trigger if exists aviso_de_pedido_de_acesso on public.pedidos_de_acesso;
create trigger aviso_de_pedido_de_acesso
  after insert on public.pedidos_de_acesso
  for each row execute function public.aviso_de_pedido_de_acesso();

-- 3. Pedido aceito → quem pediu -----------------------------------------------
-- Pelo responsável, pelo admin ou pela academia nova publicada. Quem digitou
-- o código não recebe: já viu na tela.
create or replace function public.aviso_de_pedido_aceito()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia text;
  p public.academia_acessos;
  v_link text := public.site_dos_emails() || '/parceiros/academias?utm_source=Email-pedido';
begin
  if auth.uid() is not distinct from new.user_id then
    return new;
  end if;
  if not exists (select 1 from public.pedidos_de_acesso
                 where user_id = new.user_id and academia_id = new.academia_id) then
    return new;
  end if;
  select name into v_academia from public.academias where id = new.academia_id;
  select * into p from public.academia_acessos where user_id = new.user_id;
  if v_academia is null or p.user_id is null or not p.avisos_por_email or p.email_confirmado_em is null then
    return new;
  end if;
  perform public.por_na_fila(
    'pedido-aceito:' || new.user_id || ':' || new.academia_id, 'pedido_aceito', p.email,
    'Pronto: você já administra a ' || v_academia,
    public.email_montado('Pedido aceito',
      public.email_p('O seu pedido foi aceito: você já administra a <strong>' || public.html_texto(v_academia)
        || '</strong> no GuiaTennis Parceiros.')
      || public.email_p('Atualize a ficha, responda às avaliações e veja quem mais tem acesso. Quanto mais completa a ficha, mais jogadores chamam a academia.'),
      'Abrir o painel', v_link,
      'Você recebe este e-mail porque pediu para administrar a ' || public.html_texto(v_academia)
      || ' no GuiaTennis Parceiros. <a href="' || public.html_texto(public.link_parar_avisos(p.token_avisos, 'parceiros'))
      || '" style="color:#6B6458">Não quero mais receber avisos por e-mail</a>.'),
    'O seu pedido foi aceito: você já administra a ' || v_academia || E' no GuiaTennis Parceiros.\n\nAbrir o painel: ' || v_link
      || E'\n\nNão quer mais receber avisos por e-mail? ' || public.link_parar_avisos(p.token_avisos, 'parceiros'),
    public.link_parar_avisos(p.token_avisos, 'parceiros'));
  return new;
exception when others then
  raise warning 'aviso de pedido aceito: %', sqlerrm;
  return new;
end $$;

drop trigger if exists aviso_de_pedido_aceito on public.academia_vinculos;
create trigger aviso_de_pedido_aceito
  after insert on public.academia_vinculos
  for each row execute function public.aviso_de_pedido_aceito();

-- 4. Vou viajar → o jogador -------------------------------------------------
-- 7 dias antes da ida, como os lembretes de viagem do Airbnb e do Booking;
-- sem data (ou com menos de 7 dias), logo ao salvar. Só com academia no
-- guia na cidade (sem nenhuma, espera: se entrar uma antes da viagem, o
-- aviso sai). Viagem que já acabou não recebe. Uma vez por viagem.
create or replace function public.preparar_aviso_de_viagem(p_user uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.jogadores;
  v_hoje date := public.hoje_em_brasilia();
  v_chave text;
  v_total int;
  v_ids uuid[];
  l record;
  v_datas text;
  v_lugar text;
  v_link text;
  v_parar text;
  v_n int := 0;
begin
  for j in
    select * from public.jogadores x
    where (p_user is null or x.user_id = p_user)
      and x.avisos_viagem and nullif(btrim(x.viagem_cidade), '') is not null
      and x.email_confirmado_em is not null and public.email_valido(x.email)
      and (x.viagem_ida is null or x.viagem_ida - 7 <= v_hoje)
      and coalesce(x.viagem_volta, x.viagem_ida, v_hoje) >= v_hoje
  loop
    v_chave := 'viagem:' || j.user_id || ':' || public.slug(j.viagem_cidade) || ':' || coalesce(j.viagem_ida::text, 'sem-data');
    continue when exists (select 1 from public.emails_a_enviar where chave = v_chave);
    select count(*) into v_total from public.academias c
      where public.academia_no_ar(c) and public.slug(c.cidade) = public.slug(j.viagem_cidade);
    continue when v_total = 0;
    v_ids := array(
      select c.id from public.academias c
      where public.academia_no_ar(c) and public.slug(c.cidade) = public.slug(j.viagem_cidade)
      order by coalesce(c.confirmada, true) desc,
        (select avg(v.stars) from public.avaliacoes v where v.academia_id = c.id) desc nulls last,
        c.name
      limit 6);
    l := public.lista_de_academias_email(v_ids, 'Email-viagem');
    v_datas := public.datas_da_viagem(j.viagem_ida, j.viagem_volta);
    v_lugar := j.viagem_cidade || coalesce(', ' || nullif(j.viagem_uf, ''), '');
    v_link := public.site_dos_emails() || '/quadras/' || public.slug(j.viagem_cidade) || '?utm_source=Email-viagem';
    v_parar := public.link_parar_avisos(j.token_avisos, 'viagem');
    if public.por_na_fila(v_chave, 'viagem', j.email,
      'Sua viagem para ' || j.viagem_cidade || ': ' || v_total || ' ' || case when v_total = 1 then 'academia de tênis' else 'academias de tênis' end || ' para jogar',
      public.email_montado('Sua viagem para ' || v_lugar,
        case when v_datas is not null then '<p style="margin:-6px 0 14px;font-size:14px;color:#6B6458">' || public.html_texto(v_datas) || '</p>' else '' end
        || public.email_p('Olá, ' || public.html_texto(split_part(btrim(j.nome), ' ', 1)) || '! '
             || case when v_total = 1 then 'Esta é a academia de tênis de ' else 'Estas são as academias de tênis de ' end
             || public.html_texto(j.viagem_cidade) || ' no GuiaTennis. Compare e chame direto no WhatsApp.')
        || l.html,
        case when v_total > 6 then 'Ver as ' || v_total || ' academias' else 'Ver no mapa' end, v_link,
        'Você recebe este aviso porque marcou "Vou viajar" na sua conta do GuiaTennis. '
        || '<a href="' || public.html_texto(v_parar) || '" style="color:#6B6458">Não quero mais receber avisos de viagem</a>.'),
      'Sua viagem para ' || v_lugar || coalesce(' (' || v_datas || ')', '') || E'\n\n'
        || case when v_total = 1 then 'Esta é a academia de tênis de ' else 'Estas são as academias de tênis de ' end
        || j.viagem_cidade || E' no GuiaTennis:\n\n' || l.texto
        || E'\n\nVer todas: ' || v_link
        || E'\n\nNão quer mais receber avisos de viagem? ' || v_parar,
      v_parar) then
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end $$;

-- Ao salvar a viagem (ou confirmar o e-mail), já confere se é hora.
create or replace function public.aviso_de_viagem_mudou()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.avisos_viagem then
    perform public.preparar_aviso_de_viagem(new.user_id);
  end if;
  return new;
exception when others then
  raise warning 'aviso de viagem: %', sqlerrm;
  return new;
end $$;

drop trigger if exists aviso_de_viagem_mudou on public.jogadores;
create trigger aviso_de_viagem_mudou
  after update of avisos_viagem, viagem_uf, viagem_cidade, viagem_ida, viagem_volta, email_confirmado_em
  on public.jogadores
  for each row execute function public.aviso_de_viagem_mudou();

-- 5. Academias novas → o jogador ----------------------------------------------
-- Uma vez por dia (às 10h), só quando há novidade: as academias que entraram
-- na cidade da conta (aviso "Academias novas na minha cidade") e perto de
-- cada busca salva com aviso ligado (dentro da distância da busca, ou 10 km;
-- a busca da página da cidade vale a cidade inteira), com o mesmo piso,
-- cobertura e modalidade. Cada academia aparece uma vez
-- no e-mail. Nunca o que entrou antes de a pessoa ligar o aviso, nem há
-- mais de 30 dias.
create or replace function public.preparar_avisos_de_academias_novas()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.jogadores;
  b public.buscas_salvas;
  l record;
  v_limite timestamptz := now() - interval '30 days';
  v_desde timestamptz;
  v_raio double precision;
  v_ids uuid[];
  v_todas uuid[];
  v_html text;
  v_texto text;
  v_botao_link text;
  v_primeiro text;
  v_unica text;
  v_parar text;
  v_link_busca text;
  v_n int := 0;
begin
  for j in
    select * from public.jogadores x
    where x.email_confirmado_em is not null and public.email_valido(x.email)
      and ((x.avisos_academias and nullif(btrim(x.cidade), '') is not null)
           or exists (select 1 from public.buscas_salvas s where s.user_id = x.user_id and s.avisar))
  loop
    v_todas := '{}';
    v_html := '';
    v_texto := '';
    v_botao_link := null;
    if j.avisos_academias and nullif(btrim(j.cidade), '') is not null then
      v_desde := greatest(v_limite, coalesce(j.academias_avisadas_ate, '-infinity'::timestamptz),
                          coalesce(j.avisos_mudados_em, j.created_at));
      v_ids := array(
        select c.id from public.academias c
        where public.academia_no_ar(c) and c.publicada_em > v_desde
          and public.slug(c.cidade) = public.slug(j.cidade)
        order by c.publicada_em desc
        limit 10);
      if cardinality(v_ids) > 0 then
        l := public.lista_de_academias_email(v_ids, 'Email-academias-novas');
        v_html := v_html || '<h2 style="margin:18px 0 4px;font-size:16px;color:#1F2A24">Em ' || public.html_texto(j.cidade) || '</h2>' || l.html;
        v_texto := v_texto || 'Em ' || j.cidade || E':\n' || l.texto || E'\n\n';
        v_todas := v_todas || v_ids;
        v_botao_link := public.site_dos_emails() || '/quadras/' || public.slug(j.cidade) || '?utm_source=Email-academias-novas';
      end if;
    end if;
    for b in
      select * from public.buscas_salvas s
      where s.user_id = j.user_id and s.avisar
        and ((s.lat is not null and s.lng is not null) or nullif(btrim(s.cidade), '') is not null)
      order by s.created_at
    loop
      v_desde := greatest(v_limite, coalesce(b.avisada_ate, b.avisar_desde, b.created_at));
      v_raio := coalesce(case when b.filtros ->> 'distancia' ~ '^[0-9]+(\.[0-9]+)?$' then (b.filtros ->> 'distancia')::double precision end, 10);
      v_ids := array(
        select c.id from public.academias c
        where public.academia_no_ar(c) and c.publicada_em > v_desde
          and not (c.id = any (v_todas))
          and case when b.lat is not null and b.lng is not null
                   then c.lat is not null and c.lng is not null and public.km_entre(b.lat, b.lng, c.lat, c.lng) <= v_raio
                   else public.slug(c.cidade) = public.slug(b.cidade) end
          and public.combina_com_o_filtro(c.modalidades, b.filtros -> 'modalidade')
          and public.combina_com_o_filtro(c.pisos, b.filtros -> 'piso')
          and public.combina_com_o_filtro(c.cobertura, b.filtros -> 'cobertura')
        order by case when b.lat is not null and b.lng is not null and c.lat is not null and c.lng is not null
                      then public.km_entre(b.lat, b.lng, c.lat, c.lng) end nulls last, c.publicada_em desc
        limit 10);
      continue when cardinality(v_ids) = 0;
      l := public.lista_de_academias_email(v_ids, 'Email-academias-novas');
      v_link_busca := public.site_dos_emails() || b.link || case when position('?' in b.link) > 0 then '&' else '?' end || 'utm_source=Email-academias-novas';
      v_html := v_html || '<h2 style="margin:18px 0 4px;font-size:16px;color:#1F2A24">Na sua busca: <a href="'
        || public.html_texto(v_link_busca) || '" style="color:#1F2A24">' || public.html_texto(b.termo) || '</a></h2>' || l.html;
      v_texto := v_texto || 'Na sua busca "' || b.termo || E'":\n' || l.texto || E'\n\n';
      v_todas := v_todas || v_ids;
      v_botao_link := coalesce(v_botao_link, v_link_busca);
    end loop;
    continue when cardinality(v_todas) = 0;

    select name into v_unica from public.academias where id = v_todas[1];
    v_primeiro := split_part(btrim(j.nome), ' ', 1);
    v_parar := public.link_parar_avisos(j.token_avisos, 'novas');
    if public.por_na_fila(
      'novas:' || j.user_id || ':' || public.hoje_em_brasilia()::text, 'academias_novas', j.email,
      case when cardinality(v_todas) = 1 then 'Academia nova no GuiaTennis: ' || v_unica
           else cardinality(v_todas) || ' academias novas no GuiaTennis' end,
      public.email_montado(case when cardinality(v_todas) = 1 then 'Academia nova para você' else 'Academias novas para você' end,
        public.email_p('Olá, ' || public.html_texto(v_primeiro) || '! '
          || case when cardinality(v_todas) = 1 then 'Uma academia de tênis entrou' else cardinality(v_todas) || ' academias de tênis entraram' end
          || ' no GuiaTennis onde você procura quadra.')
        || v_html,
        'Ver no GuiaTennis', v_botao_link,
        'Você recebe este aviso porque pediu, na sua conta do GuiaTennis, avisos de academias novas. '
        || '<a href="' || public.html_texto(v_parar) || '" style="color:#6B6458">Não quero mais receber avisos de academias novas</a>'
        || ' · <a href="' || public.html_texto(public.site_dos_emails() || '/perfil') || '" style="color:#6B6458">Mudar os avisos</a>.'),
      'Olá, ' || v_primeiro || E'! Academias de tênis novas no GuiaTennis onde você procura quadra:\n\n' || v_texto
        || 'Não quer mais receber avisos de academias novas? ' || v_parar,
      v_parar) then
      v_n := v_n + 1;
    end if;
    update public.jogadores set academias_avisadas_ate = now() where user_id = j.user_id;
    update public.buscas_salvas set avisada_ate = now() where user_id = j.user_id and avisar;
  end loop;
  return v_n;
end $$;

-- O envio ---------------------------------------------------------------
-- A cada minuto: lê o que o Resend respondeu dos envios anteriores e manda
-- os próximos da fila. Dois por vez (o Resend aceita 2 por segundo); quem
-- falhou tenta de novo, até 5 vezes, por até 3 dias. Muitos pedidos ao
-- mesmo tempo (429) não contam como tentativa. A chave de idempotência faz
-- o Resend não mandar duas vezes o mesmo e-mail.
create or replace function public.enviar_emails()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.emails_configuracao;
  v_chave text;
  v_id bigint;
  v_n int := 0;
  r record;
begin
  if to_regclass('net._http_response') is not null then
    for r in
      select e.id, h.status_code, h.content, h.error_msg, h.timed_out
      from public.emails_a_enviar e
      join net._http_response h on h.id = e.pedido_id
      where e.enviado_em is null and e.pedido_id is not null
    loop
      if r.status_code between 200 and 299 then
        update public.emails_a_enviar
          set enviado_em = now(), erro = null,
              resend_id = left(substring(coalesce(r.content, '') from '"id"\s*:\s*"([^"]+)"'), 80)
          where id = r.id;
      else
        update public.emails_a_enviar
          set pedido_id = null,
              tentativas = case when r.status_code = 429 then greatest(tentativas - 1, 0) else tentativas end,
              erro = left(concat_ws(' ', r.status_code::text,
                       coalesce(r.error_msg, nullif(r.content, ''), case when r.timed_out then 'demorou demais' end)), 300)
          where id = r.id;
      end if;
    end loop;
  end if;
  update public.emails_a_enviar
    set pedido_id = null, erro = coalesce(erro, 'sem resposta do Resend')
    where enviado_em is null and pedido_id is not null and pedido_em < now() - interval '15 minutes';

  begin
    select decrypted_secret into v_chave from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  exception when others then
    v_chave := null;
  end;
  if coalesce(v_chave, '') = '' or to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then
    return 0;
  end if;
  select * into c from public.emails_configuracao where id;

  for r in
    select * from public.emails_a_enviar
    where enviado_em is null and pedido_id is null and tentativas < 5
      and criado_em > now() - interval '3 days'
    order by criado_em
    limit 2
    for update skip locked
  loop
    select net.http_post(
      url := 'https://api.resend.com/emails',
      body := jsonb_build_object(
          'from', coalesce(c.remetente, 'GuiaTennis <nao-responda@guiatennis.com.br>'),
          'to', jsonb_build_array(r.para),
          'subject', coalesce(c.prefixo, '') || r.assunto,
          'html', r.html,
          'text', r.texto,
          'tags', jsonb_build_array(jsonb_build_object('name', 'aviso', 'value', r.tipo)))
        || case when r.descadastro is null then '{}'::jsonb
                else jsonb_build_object('headers', jsonb_build_object('List-Unsubscribe', '<' || r.descadastro || '>')) end,
      params := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_chave,
        'Idempotency-Key', 'guiatennis-' || r.id::text),
      timeout_milliseconds := 10000) into v_id;
    update public.emails_a_enviar
      set pedido_id = v_id, pedido_em = now(), tentativas = tentativas + 1
      where id = r.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- Uma vez por dia (10h de Brasília): viagens que chegaram aos 7 dias,
-- academias novas e limpeza do que já saiu há mais de 60 dias.
create or replace function public.preparar_avisos_do_dia()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.preparar_aviso_de_viagem(null);
  perform public.preparar_avisos_de_academias_novas();
  delete from public.emails_a_enviar where criado_em < now() - interval '60 days';
  begin
    execute 'delete from cron.job_run_details where end_time < now() - interval ''7 days''';
  exception when others then
    null;
  end;
end $$;

-- Para o GitHub: guarda a chave do Resend no cofre e o endereço do site.
-- Só o dono do banco roda (o GitHub entra como ele).
create or replace function public.configurar_emails(p_chave text, p_site text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_site text := rtrim(btrim(coalesce(p_site, '')), '/');
begin
  if v_site ~ '^https://[^\s/]+$' then
    update public.emails_configuracao
      set site = v_site,
          prefixo = case when v_site = 'https://guiatennis.com.br' then '' else '[Teste] ' end
      where id;
  end if;
  if coalesce(btrim(p_chave), '') = '' then
    return 'sem chave: os avisos ficam na fila';
  end if;
  select id into v_id from vault.secrets where name = 'resend_api_key';
  if v_id is null then
    perform vault.create_secret(btrim(p_chave), 'resend_api_key', 'Chave do Resend para os avisos por e-mail do GuiaTennis');
  else
    perform vault.update_secret(v_id, btrim(p_chave));
  end if;
  return 'chave do Resend guardada';
end $$;

-- O relógio -------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job
      where jobname in ('guiatennis-enviar-emails', 'guiatennis-avisos-do-dia');
    perform cron.schedule('guiatennis-enviar-emails', '* * * * *', 'select public.enviar_emails()');
    perform cron.schedule('guiatennis-avisos-do-dia', '0 13 * * *', 'select public.preparar_avisos_do_dia()');
  end if;
exception when others then
  raise warning 'avisos por e-mail: o relógio não ligou (%). Os e-mails ficam na fila.', sqlerrm;
end $$;

-- Parar os avisos pelo link do e-mail (sem entrar na conta) -----------------
-- p_aviso: viagem, novas (cidade e buscas salvas), todos (do jogador) ou
-- parceiros (avaliação nova e pedidos de acesso). Devolve o que parou, ou
-- nada se o link não vale.
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
    end if;
    update public.jogadores
      set avisos_academias = false, promocoes = false, novidades = false, avisos_viagem = false,
          avisos_mudados_em = now()
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

-- Ligar ou desligar os avisos da conta do GuiaTennis Parceiros (Perfil).
create or replace function public.mudar_avisos_dos_parceiros(p_ligado boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.academia_acessos where user_id = auth.uid()) then
    raise exception 'Entre na sua conta do GuiaTennis Parceiros.' using errcode = '42501';
  end if;
  update public.academia_acessos
    set avisos_por_email = coalesce(p_ligado, false), updated_at = now()
    where user_id = auth.uid();
end $$;

-- Para o admin: os avisos estão saindo? (painel de Estatísticas)
create or replace function public.situacao_dos_emails()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_chave boolean := false;
  v_relogio boolean := false;
begin
  if not public.eh_admin() then
    raise exception 'Só o admin.' using errcode = '42501';
  end if;
  begin
    select exists (select 1 from vault.secrets where name = 'resend_api_key') into v_chave;
  exception when others then
    v_chave := false;
  end;
  begin
    execute 'select exists (select 1 from cron.job where jobname = ''guiatennis-enviar-emails'' and active)' into v_relogio;
  exception when others then
    v_relogio := false;
  end;
  return jsonb_build_object(
    'chave', v_chave,
    'envio', to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is not null,
    'relogio', v_relogio,
    'na_fila', (select count(*) from public.emails_a_enviar where enviado_em is null and tentativas < 5 and criado_em > now() - interval '3 days'),
    'enviados_7_dias', (select count(*) from public.emails_a_enviar where enviado_em > now() - interval '7 days'),
    'falharam', (select count(*) from public.emails_a_enviar where enviado_em is null and (tentativas >= 5 or criado_em <= now() - interval '3 days')),
    'ultimo_erro', (select erro from public.emails_a_enviar where erro is not null and enviado_em is null order by criado_em desc limit 1),
    'por_tipo', coalesce((select jsonb_object_agg(tipo, n) from (
        select tipo, count(*) as n from public.emails_a_enviar
        where enviado_em > now() - interval '30 days' group by tipo) t), '{}'::jsonb));
end $$;

-- Permissões ------------------------------------------------------------
revoke all on function public.marcar_publicada_em() from public, anon, authenticated;
revoke all on function public.site_dos_emails() from public, anon, authenticated;
revoke all on function public.link_parar_avisos(uuid, text) from public, anon, authenticated;
revoke all on function public.por_na_fila(text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.lista_de_academias_email(uuid[], text) from public, anon, authenticated;
revoke all on function public.quem_recebe_da_academia(uuid, boolean) from public, anon, authenticated;
revoke all on function public.aviso_de_avaliacao_nova() from public, anon, authenticated;
revoke all on function public.aviso_de_pedido_de_acesso() from public, anon, authenticated;
revoke all on function public.aviso_de_pedido_aceito() from public, anon, authenticated;
revoke all on function public.preparar_aviso_de_viagem(uuid) from public, anon, authenticated;
revoke all on function public.aviso_de_viagem_mudou() from public, anon, authenticated;
revoke all on function public.preparar_avisos_de_academias_novas() from public, anon, authenticated;
revoke all on function public.enviar_emails() from public, anon, authenticated;
revoke all on function public.preparar_avisos_do_dia() from public, anon, authenticated;
revoke all on function public.configurar_emails(text, text) from public, anon, authenticated, service_role;
revoke all on function public.parar_avisos(uuid, text) from public;
grant execute on function public.parar_avisos(uuid, text) to anon, authenticated;
revoke all on function public.mudar_avisos_dos_parceiros(boolean) from public, anon;
grant execute on function public.mudar_avisos_dos_parceiros(boolean) to authenticated;
revoke all on function public.situacao_dos_emails() from public, anon;
grant execute on function public.situacao_dos_emails() to authenticated;

notify pgrst, 'reload schema';
