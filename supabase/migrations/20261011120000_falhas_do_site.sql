-- ============================================================
-- Falhas do site (pedido do Breno em 11/10/2026: "eu preciso saber em
-- algum lugar se alguma ação do site apresentou falha ou não e direcionar
-- melhor os clientes quando algo não funcionar")
-- ============================================================
-- Como o Sentry, o "Issues" do Vercel e o registro de erros do painel do
-- Stripe: cada vez que algo do site não funciona (o banco não respondeu, a
-- internet caiu, um serviço de fora como o do CEP falhou, ou o próprio
-- código do site deu erro), o site manda uma linha para cá. O painel do
-- admin junta as iguais (a mesma ação com a mesma mensagem), diz quantas
-- vezes e para quantas visitas aconteceu, em que aparelho, e deixa marcar
-- como resolvida. A pessoa vê um código curto ("K7Q2MX"), como o "ID da
-- solicitação" do Stripe e da Microsoft: mandado no WhatsApp, o admin acha a
-- falha exata pelo código.
--
-- Sem dados de quem usa (regra 9): não guarda conta, e-mail, IP nem
-- identificador do aparelho. A visita é o mesmo número sorteado do percurso
-- (vale só para aquela visita). A mensagem técnica perde e-mails, telefones e
-- chaves antes de entrar (falha_sem_dados), no site e aqui de novo. Fica 90
-- dias.
--
-- Falha nova (que não tinha aparecido nas últimas 24 horas) ou que voltou
-- depois de marcada como resolvida manda um e-mail ao admin, no máximo um a
-- cada 3 horas (as outras ficam só no painel). Falha do próprio admin não
-- manda e-mail, nem a de conexão (quase sempre a internet de quem usa: fica
-- no painel, para ver se se repete).
--
-- Pode rodar de novo sem estragar nada.

create table if not exists public.falhas_do_site (
  id uuid not null default gen_random_uuid() primary key,
  codigo text not null,
  grupo text not null,
  visita text,
  site text not null default 'jogadores',
  acao text not null,
  tipo text not null default 'codigo',
  mensagem text,
  detalhe text,
  tela text,
  quem text not null default 'visitante',
  academia_id uuid references public.academias (id) on delete set null,
  dispositivo text,
  navegador text,
  sistema text,
  aviso_na_tela boolean not null default false,
  resolvida_em timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'falhas_visita') then
    alter table public.falhas_do_site add constraint falhas_visita check (visita is null or visita ~ '^[a-z0-9]{8,32}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'falhas_site') then
    alter table public.falhas_do_site add constraint falhas_site check (site in ('jogadores', 'parceiros', 'admin'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'falhas_tipo') then
    alter table public.falhas_do_site add constraint falhas_tipo check (tipo in ('rede', 'banco', 'servico', 'codigo'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'falhas_quem') then
    alter table public.falhas_do_site add constraint falhas_quem check (quem in ('visitante', 'jogador', 'academia', 'admin'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'falhas_tamanhos') then
    alter table public.falhas_do_site add constraint falhas_tamanhos
      check (char_length(acao) between 1 and 80 and length(coalesce(mensagem, '')) <= 300
             and length(coalesce(detalhe, '')) <= 200 and length(coalesce(tela, '')) <= 120
             and length(coalesce(dispositivo, '')) <= 20 and length(coalesce(navegador, '')) <= 40
             and length(coalesce(sistema, '')) <= 40);
  end if;
end $$;

-- O código tem 6 letras e números, sem os que confundem (0, O, 1, I).
alter table public.falhas_do_site drop constraint if exists falhas_codigo;
alter table public.falhas_do_site add constraint falhas_codigo check (codigo ~ '^[A-HJ-NP-Z2-9]{6}$');

create index if not exists falhas_do_site_quando on public.falhas_do_site (created_at desc);
create index if not exists falhas_do_site_grupo on public.falhas_do_site (grupo, created_at desc);
create index if not exists falhas_do_site_codigo on public.falhas_do_site (codigo);
create index if not exists falhas_do_site_visita on public.falhas_do_site (visita, created_at);

-- Ninguém grava direto nem lê: o site manda pela função, e só o admin lê.
alter table public.falhas_do_site enable row level security;
drop policy if exists "Admin le falhas" on public.falhas_do_site;
create policy "Admin le falhas" on public.falhas_do_site
  for select
  using (public.eh_admin());
revoke all on public.falhas_do_site from anon, authenticated;
grant select on public.falhas_do_site to authenticated;
grant all on public.falhas_do_site to service_role;

-- Tira da mensagem o que pode ser de alguém: e-mail, telefone, números
-- longos (CPF, cartão), chaves de login. O site faz o mesmo antes de mandar.
create or replace function public.falha_sem_dados(t text, p_tamanho int default 300)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(left(btrim(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(coalesce(t, ''), '(Bearer\s+\S+|eyJ[A-Za-z0-9._-]{10,}|sb_[a-z]+_[A-Za-z0-9_-]{10,})', '[chave]', 'g'),
          '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[e-mail]', 'g'),
        '\(?\d{2}\)?[ .-]?\d{4,5}[ .-]?\d{4}', '[número]', 'g'),
      '\d{8,}', '[número]', 'g')), p_tamanho), '');
$$;

-- A mesma falha junta: a ação, o tipo e a mensagem sem números nem ids.
create or replace function public.grupo_da_falha(p_acao text, p_tipo text, p_mensagem text)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(md5(lower(coalesce(p_acao, '')) || '|' || coalesce(p_tipo, '') || '|' ||
    regexp_replace(regexp_replace(lower(coalesce(p_mensagem, '')),
      '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'id', 'g'), '[0-9]+', '#', 'g')), 16);
$$;

create or replace function public.nome_do_tipo_de_falha(p_tipo text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_tipo when 'rede' then 'conexão' when 'banco' then 'banco'
    when 'servico' then 'serviço de fora' else 'código do site' end;
$$;

-- O site manda: {codigo, visita, site, acao, tipo, mensagem, detalhe, tela,
-- academia, dispositivo, navegador, sistema, aviso}. Quem é (visitante,
-- jogador, academia ou admin) o banco descobre pelo login. Devolve true se
-- guardou. Nunca dá erro para o site: o que não serve é ignorado.
create or replace function public.registrar_falha(p_falha jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  f jsonb := coalesce(p_falha, '{}'::jsonb);
  v_codigo text := upper(btrim(coalesce(f->>'codigo', '')));
  v_visita text := nullif(lower(btrim(coalesce(f->>'visita', ''))), '');
  v_site text := coalesce(nullif(f->>'site', ''), 'jogadores');
  v_acao text := left(btrim(coalesce(f->>'acao', '')), 80);
  v_tipo text := coalesce(nullif(f->>'tipo', ''), 'codigo');
  v_mensagem text := public.falha_sem_dados(f->>'mensagem', 300);
  v_detalhe text := public.falha_sem_dados(f->>'detalhe', 200);
  v_tela text := left(split_part(split_part(coalesce(f->>'tela', ''), '?', 1), '#', 1), 120);
  v_academia uuid;
  v_admin boolean := public.eh_admin();
  v_quem text;
  v_grupo text;
  v_ultima public.falhas_do_site;
  v_nova boolean;
  v_voltou boolean;
  v_onde text;
  v_aparelho text;
  v_janela text;
begin
  if v_codigo !~ '^[A-HJ-NP-Z2-9]{6}$' or v_acao = '' then
    return false;
  end if;
  if v_visita is not null and v_visita !~ '^[a-z0-9]{8,32}$' then
    v_visita := null;
  end if;
  if v_site not in ('jogadores', 'parceiros', 'admin') then v_site := 'jogadores'; end if;
  if v_tipo not in ('rede', 'banco', 'servico', 'codigo') then v_tipo := 'codigo'; end if;
  -- Nada de encher a tabela: até 30 por visita e 500 no site inteiro por hora.
  if v_visita is not null and (select count(*) from public.falhas_do_site
      where visita = v_visita and created_at > now() - interval '1 hour') >= 30 then
    return false;
  end if;
  if (select count(*) from public.falhas_do_site where created_at > now() - interval '1 hour') >= 500 then
    return false;
  end if;
  if (f->>'academia') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select id into v_academia from public.academias where id = (f->>'academia')::uuid;
  end if;
  v_quem := case
    when v_admin then 'admin'
    when auth.uid() is null then 'visitante'
    when exists (select 1 from public.academia_acessos where user_id = auth.uid()) then 'academia'
    when exists (select 1 from public.jogadores where user_id = auth.uid()) then 'jogador'
    else 'visitante' end;
  v_grupo := public.grupo_da_falha(v_acao, v_tipo, v_mensagem);
  select * into v_ultima from public.falhas_do_site
    where grupo = v_grupo order by created_at desc limit 1;
  v_voltou := found and v_ultima.resolvida_em is not null;
  v_nova := not found or v_ultima.created_at < now() - interval '24 hours';

  insert into public.falhas_do_site (codigo, grupo, visita, site, acao, tipo, mensagem, detalhe, tela, quem,
                                     academia_id, dispositivo, navegador, sistema, aviso_na_tela)
  values (v_codigo, v_grupo, v_visita, v_site, v_acao, v_tipo, v_mensagem, v_detalhe, nullif(v_tela, ''), v_quem,
          v_academia, left(nullif(f->>'dispositivo', ''), 20), left(nullif(f->>'navegador', ''), 40),
          left(nullif(f->>'sistema', ''), 40), coalesce(f->>'aviso', '') in ('true', '1'));

  -- O que passou de 90 dias sai.
  delete from public.falhas_do_site where created_at < now() - interval '90 days';

  -- Falha nova ou que voltou: um e-mail ao admin a cada 3 horas, no máximo.
  if not v_admin and v_tipo <> 'rede' and (v_nova or v_voltou) then
    v_onde := case v_site when 'parceiros' then 'no GuiaTennis Parceiros' when 'admin' then 'no painel do admin' else 'no site dos jogadores' end;
    v_aparelho := concat_ws(', ', nullif(f->>'dispositivo', ''), nullif(f->>'navegador', ''), nullif(f->>'sistema', ''));
    v_janela := to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') || ':'
      || floor(extract(hour from now() at time zone 'America/Sao_Paulo') / 3)::int;
    perform public.aviso_ao_admin(
      'falha:' || v_janela, 'falha_no_site',
      case when v_voltou then 'Falha voltou no site: ' else 'Falha no site: ' end || v_acao,
      case when v_voltou then 'Uma falha voltou a aparecer' else 'Apareceu uma falha no site' end,
      public.email_p('<strong>' || public.html_texto(v_acao) || '</strong> não funcionou para '
        || case v_quem when 'jogador' then 'um jogador com conta' when 'academia' then 'uma conta do Parceiros' else 'um visitante' end
        || ' ' || v_onde || ' (' || public.nome_do_tipo_de_falha(v_tipo) || ').'
        || case when v_voltou then ' Ela tinha sido marcada como resolvida.' else '' end)
      || coalesce(public.email_p('Mensagem: ' || public.html_texto(v_mensagem)), '')
      || public.email_p(concat_ws(' · ', 'Código ' || v_codigo, 'Tela ' || public.html_texto(nullif(v_tela, '')),
           public.html_texto(nullif(v_aparelho, ''))))
      || public.email_p('Nas próximas horas, as outras falhas ficam só no painel, sem e-mail.'),
      v_acao || ' não funcionou ' || v_onde || ' (' || public.nome_do_tipo_de_falha(v_tipo) || ').'
        || coalesce(E'\nMensagem: ' || v_mensagem, '') || E'\nCódigo ' || v_codigo
        || coalesce(' · tela ' || nullif(v_tela, ''), '') || coalesce(' · ' || nullif(v_aparelho, ''), ''),
      'falhas');
  end if;
  return true;
exception when others then
  raise warning 'registrar falha: %', sqlerrm;
  return false;
end $$;

-- O admin ------------------------------------------------------------------
-- As falhas dos últimos dias (ou as de um código, de qualquer dia).
create or replace function public.falhas_admin(p_dias int default 30, p_codigo text default null)
returns table (id uuid, codigo text, grupo text, visita text, site text, acao text, tipo text, mensagem text,
               detalhe text, tela text, quem text, academia_id uuid, academia_nome text, dispositivo text,
               navegador text, sistema text, aviso_na_tela boolean, resolvida_em timestamptz, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    return;
  end if;
  return query
    select f.id, f.codigo, f.grupo, f.visita, f.site, f.acao, f.tipo, f.mensagem, f.detalhe, f.tela, f.quem,
           f.academia_id, a.name, f.dispositivo, f.navegador, f.sistema, f.aviso_na_tela, f.resolvida_em, f.created_at
    from public.falhas_do_site f
    left join public.academias a on a.id = f.academia_id
    where case when nullif(btrim(coalesce(p_codigo, '')), '') is not null
               then f.codigo = upper(replace(btrim(p_codigo), '-', ''))
               else f.created_at > now() - make_interval(days => least(greatest(coalesce(p_dias, 30), 1), 90)) end
    order by f.created_at desc
    limit 3000;
end $$;

-- "Marcar como resolvida": todas as daquele grupo até agora. Se voltar a
-- acontecer, aparece como "Voltou" e manda e-mail de novo.
create or replace function public.resolver_falhas_admin(p_grupo text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis marca a falha como resolvida.' using errcode = '42501';
  end if;
  update public.falhas_do_site set resolvida_em = now()
    where grupo = p_grupo and resolvida_em is null;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.falha_sem_dados(text, int) from public, anon, authenticated;
revoke all on function public.grupo_da_falha(text, text, text) from public, anon, authenticated;
revoke all on function public.nome_do_tipo_de_falha(text) from public, anon, authenticated;
revoke all on function public.registrar_falha(jsonb) from public;
revoke all on function public.falhas_admin(int, text) from public, anon;
revoke all on function public.resolver_falhas_admin(text) from public, anon;
grant execute on function public.registrar_falha(jsonb) to anon, authenticated;
grant execute on function public.falhas_admin(int, text), public.resolver_falhas_admin(text) to authenticated;

notify pgrst, 'reload schema';
