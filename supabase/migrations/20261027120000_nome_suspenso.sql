-- ============================================================
-- Nome suspenso por 15 dias e a avaliação de conta excluída como "Usuário do
-- GuiaTennis" (pedido do Breno em 27/10/2026: "será enviado email quando isso
-- do nome for solicitado ou já alterado? e quando eu ver algo que não condiz
-- com os termos, suspenda o nome por 15 dias e se não, a conta será excluída,
-- e avaliação aparece tipo no Instagram quando a conta é excluída mas ainda
-- permanece a avaliação")
-- ============================================================
-- Como a suspensão do Instagram ("restam N dias para..." e, depois, a conta
-- desativada) e o "Usuário do Instagram" que fica no lugar de quem excluiu a
-- conta:
--   avaliacoes.autor_oculto     a avaliação fica no site sem o nome: aparece
--                               "Usuário do GuiaTennis" (conta excluída ou
--                               nome suspenso).
--   ocultar_autor_sem_conta     gatilho: a conta saiu (pela pessoa, pelo
--                               admin, pelos 15 dias ou pelo Supabase), a
--                               avaliação fica, sem o nome e sem o e-mail.
--   nomes_suspensos             o nome suspenso, o motivo, o prazo (15 dias)
--                               e como terminou: trocou, cancelada (o admin
--                               voltou atrás) ou excluida.
--   suspender_nome_admin / suspender_nome_pela_avaliacao_admin
--                               o nome some das avaliações na hora e a
--                               pessoa recebe o e-mail para trocar.
--   nome_da_conta_mudou         gatilho em jogadores e academia_acessos: o
--                               nome novo vai para as avaliações (e, com o
--                               nome suspenso, para o outro lado da mesma
--                               conta); com ele trocado, a suspensão acaba, a
--                               pessoa recebe a confirmação e o admin
--                               confere o nome novo.
--   avaliacao_com_nome_suspenso enquanto o nome está suspenso, a conta não
--                               avalia.
--   aplicar_suspensoes_de_nome  de hora em hora: o lembrete a 3 dias do fim e,
--                               no fim do prazo, a conta excluída (o e-mail
--                               fica bloqueado, como na exclusão pelo admin).
--   cancelar_suspensao_admin, nome_trocado_conferido_admin,
--   nomes_suspensos_admin, meu_nome_suspenso
--   aviso_de_nome_da_academia   o admin trocou o nome de uma academia: quem
--                               a administra recebe um e-mail ("já
--                               alterado").
-- Pode rodar de novo sem estragar nada.

-- 1. A avaliação sem o nome ---------------------------------------------------
alter table public.avaliacoes add column if not exists autor_oculto boolean not null default false;
grant select (autor_oculto) on table public.avaliacoes to anon, authenticated;

create or replace function public.ocultar_autor_sem_conta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.user_id is not null and new.user_id is null then
    new.autor_oculto := true;
    new.nome_autor := null;
    new.contato_autor := null;
  end if;
  return new;
end $$;

drop trigger if exists ocultar_autor_sem_conta on public.avaliacoes;
create trigger ocultar_autor_sem_conta
  before update of user_id on public.avaliacoes
  for each row execute function public.ocultar_autor_sem_conta();

-- As avaliações de contas que já foram excluídas: as do admin (o e-mail está
-- em contas_excluidas) e as de quem saiu sozinho depois das contas de
-- jogador (02/10/2026: o e-mail da avaliação não tem mais login).
update public.avaliacoes v
  set autor_oculto = true, nome_autor = null, contato_autor = null
  where v.user_id is null and not v.autor_oculto
    and v.contato_autor is not null
    and (exists (select 1 from public.contas_excluidas c where c.email = lower(btrim(v.contato_autor)))
         or (v.created_at >= '2026-10-02' and v.contato_autor like '%@%'
             and not exists (select 1 from auth.users u where lower(u.email) = lower(btrim(v.contato_autor)))));

-- 2. O nome suspenso ------------------------------------------------------------
create table if not exists public.nomes_suspensos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  nome text not null,
  motivo text not null,
  suspenso_em timestamptz not null default now(),
  prazo timestamptz not null,
  lembrete_em timestamptz,
  resolvido_em timestamptz,
  resolucao text,
  nome_novo text,
  conferido_em timestamptz,
  constraint nomes_suspensos_resolucao_ok check (resolucao is null or resolucao in ('trocou', 'cancelada', 'excluida'))
);
create unique index if not exists nomes_suspensos_um_por_conta
  on public.nomes_suspensos (user_id) where resolvido_em is null;
alter table public.nomes_suspensos enable row level security;
revoke all on table public.nomes_suspensos from anon, authenticated;

-- O mesmo nome, sem ligar para maiúsculas e espaços.
create or replace function public.mesmo_nome(a text, b text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(btrim(coalesce(a, '')), '\s+', ' ', 'g'))
       = lower(regexp_replace(btrim(coalesce(b, '')), '\s+', ' ', 'g'));
$$;

-- Onde o nome suspenso ainda está: na conta do site dos jogadores (Minha
-- conta) e/ou no Perfil do GuiaTennis Parceiros.
create or replace function public.onde_esta_o_nome(p_user uuid, p_nome text)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_remove(array[
    case when exists (select 1 from public.jogadores j where j.user_id = p_user and public.mesmo_nome(j.nome, p_nome)) then 'minha_conta' end,
    case when exists (select 1 from public.academia_acessos x where x.user_id = p_user and public.mesmo_nome(x.nome_responsavel, p_nome)) then 'parceiros' end
  ], null);
$$;

create or replace function public.link_para_trocar_o_nome(p_user uuid, p_nome text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select public.site_dos_emails()
    || case when 'minha_conta' = any(public.onde_esta_o_nome(p_user, p_nome)) or not exists (select 1 from public.academia_acessos x where x.user_id = p_user)
            then '/perfil' else '/parceiros/perfil' end
    || '?utm_source=Email-nome';
$$;

create or replace function public.data_de_brasilia(p timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select public.data_por_extenso((p at time zone 'America/Sao_Paulo')::date);
$$;

create or replace function public.rodape_da_conta()
returns text
language sql
immutable
set search_path = ''
as $$
  select 'Você recebe este e-mail porque tem uma conta no GuiaTennis. Achou que foi um engano? Responda pelo chat de ajuda do site.';
$$;

-- Suspende o nome da conta: some das avaliações na hora, e a pessoa recebe o
-- e-mail com o prazo.
create or replace function public.suspender_nome_admin(p_user uuid, p_motivo text, p_nome text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_nome text;
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_prazo timestamptz := now() + interval '15 days';
  v_link text;
  v_id uuid;
  j public.jogadores;
  x public.academia_acessos;
begin
  if not public.eh_admin() then
    raise exception 'Só o admin.' using errcode = '42501';
  end if;
  if length(v_motivo) < 5 then
    raise exception 'Escreva o motivo (vai no e-mail para a pessoa).' using errcode = '22023';
  end if;
  if char_length(v_motivo) > 300 then
    raise exception 'O motivo cabe em até 300 letras.' using errcode = '22023';
  end if;
  select lower(email) into v_email from auth.users where id = p_user;
  if v_email is null then
    raise exception 'Conta não encontrada.' using errcode = '22023';
  end if;
  if v_email = 'guiatennis1@gmail.com' then
    raise exception 'O nome do admin não pode ser suspenso.' using errcode = '22023';
  end if;
  if exists (select 1 from public.nomes_suspensos where user_id = p_user and resolvido_em is null) then
    raise exception 'O nome dessa conta já está suspenso.' using errcode = '22023';
  end if;
  select * into j from public.jogadores where user_id = p_user;
  select * into x from public.academia_acessos where user_id = p_user;
  -- O nome que o admin viu, se ainda é um dos nomes da conta; senão, o da
  -- conta de jogador (o das avaliações).
  v_nome := case when nullif(btrim(coalesce(p_nome, '')), '') is not null
                  and (public.mesmo_nome(j.nome, p_nome) or public.mesmo_nome(x.nome_responsavel, p_nome))
                 then btrim(p_nome)
                 else coalesce(nullif(btrim(j.nome), ''), nullif(btrim(x.nome_responsavel), '')) end;
  if v_nome is null then
    raise exception 'Essa conta não tem nome para suspender.' using errcode = '22023';
  end if;
  insert into public.nomes_suspensos (user_id, email, nome, motivo, prazo)
    values (p_user, v_email, v_nome, v_motivo, v_prazo)
    returning id into v_id;
  -- O nome trocado que o admin suspendeu de novo já foi conferido.
  update public.nomes_suspensos set conferido_em = now()
    where user_id = p_user and resolucao = 'trocou' and conferido_em is null;
  update public.avaliacoes set nome_autor = null, autor_oculto = true where user_id = p_user;
  v_link := public.link_para_trocar_o_nome(p_user, v_nome);
  perform public.por_na_fila('nome-suspenso:' || v_id, 'nome_suspenso', v_email,
    'O seu nome no GuiaTennis foi suspenso',
    public.email_montado('O seu nome foi suspenso',
      public.email_p('O nome <strong>' || public.html_texto(v_nome) || '</strong> não segue os Termos de Uso do GuiaTennis: o nome da conta não pode ter palavrão, ofensa, discriminação ou nada que a lei brasileira proíba.')
      || public.email_p('Motivo: ' || public.html_texto(v_motivo) || '.')
      || public.email_p('Enquanto isso, o nome não aparece no site: nas suas avaliações, aparece <strong>Usuário do GuiaTennis</strong>.')
      || public.email_p('<strong>Troque o nome até ' || public.data_de_brasilia(v_prazo) || '</strong> (15 dias). Trocou, ele volta a aparecer na hora. Se não trocar, a conta será excluída, e as avaliações ficam no site como Usuário do GuiaTennis.'),
      'Trocar o nome', v_link, public.rodape_da_conta()),
    'O nome ' || v_nome || ' não segue os Termos de Uso do GuiaTennis: o nome da conta não pode ter palavrão, ofensa, discriminação ou nada que a lei brasileira proíba.'
      || E'\n\nMotivo: ' || v_motivo || '.'
      || E'\n\nEnquanto isso, o nome não aparece no site: nas suas avaliações, aparece Usuário do GuiaTennis.'
      || E'\n\nTroque o nome até ' || public.data_de_brasilia(v_prazo) || ' (15 dias): ' || v_link
      || E'\nTrocou, ele volta a aparecer na hora. Se não trocar, a conta será excluída, e as avaliações ficam no site como Usuário do GuiaTennis.');
  return v_id;
end $$;

create or replace function public.suspender_nome_pela_avaliacao_admin(p_avaliacao uuid, p_motivo text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.avaliacoes;
begin
  if not public.eh_admin() then
    raise exception 'Só o admin.' using errcode = '42501';
  end if;
  select * into v from public.avaliacoes where id = p_avaliacao;
  if not found then
    raise exception 'Avaliação não encontrada.' using errcode = '22023';
  end if;
  if v.user_id is null then
    raise exception 'Essa avaliação não tem conta ligada: a conta saiu ou é de antes das contas. Exclua a avaliação, se for o caso.' using errcode = '22023';
  end if;
  return public.suspender_nome_admin(v.user_id, p_motivo, v.nome_autor);
end $$;

-- O nome volta às avaliações (trocou ou o admin cancelou).
create or replace function public.mostrar_nome_nas_avaliacoes(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.avaliacoes v
    set nome_autor = j.nome, autor_oculto = false
    from public.jogadores j
    where j.user_id = p_user and v.user_id = p_user and v.autor_oculto;
$$;

create or replace function public.cancelar_suspensao_admin(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.nomes_suspensos;
begin
  if not public.eh_admin() then
    raise exception 'Só o admin.' using errcode = '42501';
  end if;
  update public.nomes_suspensos set resolvido_em = now(), resolucao = 'cancelada'
    where id = p_id and resolvido_em is null
    returning * into s;
  if s.id is null then
    raise exception 'Essa suspensão já terminou.' using errcode = '22023';
  end if;
  perform public.mostrar_nome_nas_avaliacoes(s.user_id);
  perform public.por_na_fila('nome-cancelado:' || s.id, 'nome_suspensao_cancelada', s.email,
    'A suspensão do seu nome no GuiaTennis foi cancelada',
    public.email_montado('A suspensão do seu nome foi cancelada',
      public.email_p('O GuiaTennis revisou, e o nome <strong>' || public.html_texto(s.nome) || '</strong> pode continuar. Ele já voltou a aparecer no site, também nas suas avaliações.')
      || public.email_p('Não precisa fazer nada.'),
      null, null, public.rodape_da_conta()),
    'O GuiaTennis revisou, e o nome ' || s.nome || ' pode continuar. Ele já voltou a aparecer no site, também nas suas avaliações.'
      || E'\n\nNão precisa fazer nada.');
end $$;

create or replace function public.nome_trocado_conferido_admin(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o admin.' using errcode = '42501';
  end if;
  update public.nomes_suspensos set conferido_em = now()
    where id = p_id and resolucao = 'trocou' and conferido_em is null;
end $$;

-- O painel: as suspensões que correm e as que terminaram há até 30 dias
-- (o nome trocado espera o admin conferir).
create or replace function public.nomes_suspensos_admin()
returns table (id uuid, user_id uuid, email text, nome text, motivo text, suspenso_em timestamptz, prazo timestamptz,
  lembrete_em timestamptz, resolvido_em timestamptz, resolucao text, nome_novo text, conferido_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.user_id, s.email, s.nome, s.motivo, s.suspenso_em, s.prazo, s.lembrete_em, s.resolvido_em,
    s.resolucao, s.nome_novo, s.conferido_em
  from public.nomes_suspensos s
  where public.eh_admin()
    and (s.resolvido_em is null or s.resolvido_em > now() - interval '30 days'
         or (s.resolucao = 'trocou' and s.conferido_em is null))
  order by (s.resolvido_em is null) desc, s.prazo, s.resolvido_em desc;
$$;

-- Para a própria conta: o aviso no alto dos dois sites.
create or replace function public.meu_nome_suspenso()
returns table (nome text, motivo text, suspenso_em timestamptz, prazo timestamptz, trocar_em text[])
language sql
stable
security definer
set search_path = ''
as $$
  select s.nome, s.motivo, s.suspenso_em, s.prazo, public.onde_esta_o_nome(s.user_id, s.nome)
  from public.nomes_suspensos s
  where s.user_id = auth.uid() and s.resolvido_em is null;
$$;

-- 3. O nome muda ---------------------------------------------------------------
create or replace function public.nome_da_conta_mudou()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_col text := case when tg_table_name = 'jogadores' then 'nome' else 'nome_responsavel' end;
  v_novo text := to_jsonb(new) ->> v_col;
  s public.nomes_suspensos;
begin
  if v_novo is not distinct from (to_jsonb(old) ->> v_col) then
    return new;
  end if;
  -- O nome das avaliações é o da conta de jogador, como o nome do perfil nos
  -- comentários do Instagram.
  if tg_table_name = 'jogadores' then
    update public.avaliacoes set nome_autor = new.nome where user_id = new.user_id and not autor_oculto;
  end if;
  select * into s from public.nomes_suspensos where user_id = new.user_id and resolvido_em is null;
  if s.id is null then
    return new;
  end if;
  -- É o mesmo login: trocar o nome num lugar troca o nome suspenso no outro
  -- (Minha conta e o Perfil do Parceiros), e uma troca basta.
  if tg_table_name = 'jogadores' then
    update public.academia_acessos set nome_responsavel = btrim(v_novo)
      where user_id = new.user_id and public.mesmo_nome(nome_responsavel, s.nome);
  else
    update public.jogadores set nome = btrim(v_novo)
      where user_id = new.user_id and public.mesmo_nome(nome, s.nome);
  end if;
  -- A troca do outro lado já pode ter encerrado a suspensão.
  if not exists (select 1 from public.nomes_suspensos where id = s.id and resolvido_em is null)
     or cardinality(public.onde_esta_o_nome(new.user_id, s.nome)) > 0 then
    return new;
  end if;
  update public.nomes_suspensos set resolvido_em = now(), resolucao = 'trocou', nome_novo = btrim(v_novo) where id = s.id;
  perform public.mostrar_nome_nas_avaliacoes(new.user_id);
  perform public.por_na_fila('nome-trocado:' || s.id, 'nome_trocado', s.email,
    'O seu nome voltou a aparecer no GuiaTennis',
    public.email_montado('O seu nome voltou a aparecer',
      public.email_p('Obrigado por trocar o nome. Agora a conta aparece como <strong>' || public.html_texto(btrim(v_novo)) || '</strong>, também nas suas avaliações, e a suspensão acabou.'),
      null, null, public.rodape_da_conta()),
    'Obrigado por trocar o nome. Agora a conta aparece como ' || btrim(v_novo) || ', também nas suas avaliações, e a suspensão acabou.');
  perform public.aviso_ao_admin('nome-trocado-admin:' || s.id, 'nome_para_conferir',
    'Nome trocado: de ' || s.nome || ' para ' || btrim(v_novo), 'Nome trocado para conferir',
    public.email_p('A conta ' || public.html_texto(s.email) || ', com o nome suspenso (<strong>' || public.html_texto(s.nome)
      || '</strong>), trocou para <strong>' || public.html_texto(btrim(v_novo)) || '</strong>. O nome novo já aparece no site.')
    || public.email_p('Confira em <strong>Pendências</strong> › "Nomes suspensos": "Está certo" ou "Suspender de novo".'),
    'A conta ' || s.email || ', com o nome suspenso (' || s.nome || '), trocou para ' || btrim(v_novo) || '. O nome novo já aparece no site.');
  return new;
end $$;

drop trigger if exists nome_da_conta_mudou on public.jogadores;
create trigger nome_da_conta_mudou
  after update of nome on public.jogadores
  for each row execute function public.nome_da_conta_mudou();
drop trigger if exists nome_da_conta_mudou on public.academia_acessos;
create trigger nome_da_conta_mudou
  after update of nome_responsavel on public.academia_acessos
  for each row execute function public.nome_da_conta_mudou();

-- Com o nome suspenso, a conta não avalia.
create or replace function public.avaliacao_com_nome_suspenso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() and exists (select 1 from public.nomes_suspensos where user_id = auth.uid() and resolvido_em is null) then
    raise exception 'O seu nome está suspenso: troque o nome em Minha conta para avaliar.' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists avaliacao_com_nome_suspenso on public.avaliacoes;
create trigger avaliacao_com_nome_suspenso
  before insert on public.avaliacoes
  for each row execute function public.avaliacao_com_nome_suspenso();

-- 4. O lembrete e o fim do prazo -------------------------------------------------
create or replace function public.excluir_conta_pelo_nome(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.nomes_suspensos;
  j public.jogadores;
  x public.academia_acessos;
  v_email text;
begin
  select * into s from public.nomes_suspensos where id = p_id and resolvido_em is null;
  if s.id is null then
    return;
  end if;
  update public.nomes_suspensos set resolvido_em = now(), resolucao = 'excluida' where id = s.id;
  if s.user_id is null then
    return;
  end if;
  select lower(email) into v_email from auth.users where id = s.user_id;
  select * into j from public.jogadores where user_id = s.user_id;
  select * into x from public.academia_acessos where user_id = s.user_id;
  perform public.por_na_fila('nome-excluida:' || s.id, 'conta_excluida_nome', coalesce(v_email, s.email),
    'A sua conta do GuiaTennis foi excluída',
    public.email_montado('A sua conta foi excluída',
      public.email_p('O nome <strong>' || public.html_texto(s.nome) || '</strong> ficou suspenso por 15 dias e não foi trocado, como dizem os Termos de Uso. Por isso, a conta foi excluída hoje.')
      || public.email_p('As avaliações continuam no site, como <strong>Usuário do GuiaTennis</strong>, sem o seu nome.')
      || public.email_p('Este e-mail não cria outra conta no GuiaTennis.'),
      null, null, public.rodape_da_conta()),
    'O nome ' || s.nome || ' ficou suspenso por 15 dias e não foi trocado, como dizem os Termos de Uso. Por isso, a conta foi excluída hoje.'
      || E'\n\nAs avaliações continuam no site, como Usuário do GuiaTennis, sem o seu nome.'
      || E'\n\nEste e-mail não cria outra conta no GuiaTennis.');
  -- Como a exclusão pelo admin: o e-mail fica bloqueado até o admin liberar.
  insert into public.contas_excluidas (email, nome, tipo, motivo, avaliacoes_apagadas)
  select e, coalesce(j.nome, x.nome_responsavel, s.nome),
    case when j.user_id is not null and x.user_id is not null then 'jogador e GuiaTennis Parceiros'
         when x.user_id is not null then 'GuiaTennis Parceiros' else 'jogador' end,
    'Nome suspenso e não trocado em 15 dias: ' || s.motivo, false
  from (select distinct lower(t.e) as e from unnest(array[v_email, s.email, j.email, x.email]) as t(e) where t.e is not null and t.e <> '') m
  on conflict (email) do update
    set nome = excluded.nome, tipo = excluded.tipo, motivo = excluded.motivo,
        avaliacoes_apagadas = false, excluida_em = now();
  perform public.soltar_academias_da_conta(s.user_id);
  update public.avaliacoes set user_id = null where user_id = s.user_id;
  delete from auth.users where id = s.user_id;
  perform public.aviso_ao_admin('nome-excluida-admin:' || s.id, 'conta_excluida_nome',
    'Conta excluída: o nome ' || s.nome || ' não foi trocado', 'Conta excluída pelo nome',
    public.email_p('O nome <strong>' || public.html_texto(s.nome) || '</strong> (' || public.html_texto(s.email)
      || ') ficou suspenso por 15 dias sem ser trocado, e a conta foi excluída. As avaliações ficaram como Usuário do GuiaTennis.')
    || public.email_p('O e-mail está em <strong>Contas excluídas</strong>, onde você libera quando quiser.'),
    'O nome ' || s.nome || ' (' || s.email || ') ficou suspenso por 15 dias sem ser trocado, e a conta foi excluída. As avaliações ficaram como Usuário do GuiaTennis.',
    'excluidas');
end $$;

create or replace function public.aplicar_suspensoes_de_nome()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.nomes_suspensos;
  v_dias int;
  v_link text;
begin
  for s in
    select * from public.nomes_suspensos
    where resolvido_em is null and lembrete_em is null and prazo > now() and prazo <= now() + interval '3 days'
  loop
    v_dias := greatest(1, ceil(extract(epoch from (s.prazo - now())) / 86400)::int);
    v_link := public.link_para_trocar_o_nome(s.user_id, s.nome);
    perform public.por_na_fila('nome-lembrete:' || s.id, 'nome_lembrete', s.email,
      case when v_dias = 1 then 'Falta 1 dia para trocar o seu nome no GuiaTennis'
           else 'Faltam ' || v_dias || ' dias para trocar o seu nome no GuiaTennis' end,
      public.email_montado(case when v_dias = 1 then 'Falta 1 dia para trocar o seu nome' else 'Faltam ' || v_dias || ' dias para trocar o seu nome' end,
        public.email_p('O nome <strong>' || public.html_texto(s.nome) || '</strong> continua suspenso, porque não segue os Termos de Uso do GuiaTennis.')
        || public.email_p('<strong>Troque até ' || public.data_de_brasilia(s.prazo) || '.</strong> Se não trocar, a conta será excluída nesse dia, e as avaliações ficam no site como Usuário do GuiaTennis.'),
        'Trocar o nome', v_link, public.rodape_da_conta()),
      'O nome ' || s.nome || ' continua suspenso, porque não segue os Termos de Uso do GuiaTennis.'
        || E'\n\nTroque até ' || public.data_de_brasilia(s.prazo) || ': ' || v_link
        || E'\nSe não trocar, a conta será excluída nesse dia, e as avaliações ficam no site como Usuário do GuiaTennis.');
    update public.nomes_suspensos set lembrete_em = now() where id = s.id;
  end loop;
  for s in select * from public.nomes_suspensos where resolvido_em is null and prazo <= now() loop
    begin
      perform public.excluir_conta_pelo_nome(s.id);
    exception when others then
      raise warning 'nome suspenso %: %', s.id, sqlerrm;
    end;
  end loop;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'guiatennis-nomes-suspensos';
    perform cron.schedule('guiatennis-nomes-suspensos', '23 * * * *', 'select public.aplicar_suspensoes_de_nome()');
  end if;
exception when others then
  raise warning 'nomes suspensos: o relógio não ligou (%).', sqlerrm;
end $$;

-- 5. O nome da academia, trocado pelo admin ("já alterado") --------------------
create or replace function public.aviso_de_nome_da_academia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_link text := public.site_dos_emails() || '/parceiros/ficha?abrir=' || right(replace(new.id::text, '-', ''), 8) || '&utm_source=Email-nome-da-academia';
begin
  if not public.eh_admin() or new.name is not distinct from old.name or new.status = 'pending' then
    return new;
  end if;
  for r in
    select distinct x.email
    from public.academia_vinculos m
    join public.academia_acessos x on x.user_id = m.user_id
    where m.academia_id = new.id and x.email_confirmado_em is not null and public.email_valido(x.email)
  loop
    perform public.por_na_fila('nome-academia:' || new.id || ':' || md5(coalesce(old.name, '') || '>' || new.name) || ':' || r.email,
      'academia_nome_alterado', r.email, 'O GuiaTennis alterou o nome da ' || new.name,
      public.email_montado('O nome da academia foi alterado',
        public.email_p('O GuiaTennis alterou o nome da academia na ficha: de <strong>' || public.html_texto(old.name)
          || '</strong> para <strong>' || public.html_texto(new.name) || '</strong>.')
        || public.email_p('Pelos Termos de Uso, o nome da academia é o nome com que ela é conhecida, sem palavrão, ofensa ou discriminação. Achou que foi um engano? Responda pelo chat de ajuda do Parceiros.'),
        'Ver a ficha', v_link,
        'Você recebe este e-mail porque administra a ' || public.html_texto(new.name) || ' no GuiaTennis Parceiros.'),
      'O GuiaTennis alterou o nome da academia na ficha: de ' || old.name || ' para ' || new.name || '.'
        || E'\n\nPelos Termos de Uso, o nome da academia é o nome com que ela é conhecida, sem palavrão, ofensa ou discriminação. Achou que foi um engano? Responda pelo chat de ajuda do Parceiros.'
        || E'\n\nVer a ficha: ' || v_link);
  end loop;
  return new;
end $$;

drop trigger if exists aviso_de_nome_da_academia on public.academias;
create trigger aviso_de_nome_da_academia
  after update of name on public.academias
  for each row execute function public.aviso_de_nome_da_academia();

-- Permissões ------------------------------------------------------------------
revoke all on function public.ocultar_autor_sem_conta() from public, anon, authenticated;
revoke all on function public.onde_esta_o_nome(uuid, text) from public, anon, authenticated;
revoke all on function public.link_para_trocar_o_nome(uuid, text) from public, anon, authenticated;
revoke all on function public.mostrar_nome_nas_avaliacoes(uuid) from public, anon, authenticated;
revoke all on function public.nome_da_conta_mudou() from public, anon, authenticated;
revoke all on function public.avaliacao_com_nome_suspenso() from public, anon, authenticated;
revoke all on function public.excluir_conta_pelo_nome(uuid) from public, anon, authenticated;
revoke all on function public.aplicar_suspensoes_de_nome() from public, anon, authenticated;
revoke all on function public.aviso_de_nome_da_academia() from public, anon, authenticated;
revoke all on function public.suspender_nome_admin(uuid, text, text) from public, anon;
grant execute on function public.suspender_nome_admin(uuid, text, text) to authenticated;
revoke all on function public.suspender_nome_pela_avaliacao_admin(uuid, text) from public, anon;
grant execute on function public.suspender_nome_pela_avaliacao_admin(uuid, text) to authenticated;
revoke all on function public.cancelar_suspensao_admin(uuid) from public, anon;
grant execute on function public.cancelar_suspensao_admin(uuid) to authenticated;
revoke all on function public.nome_trocado_conferido_admin(uuid) from public, anon;
grant execute on function public.nome_trocado_conferido_admin(uuid) to authenticated;
revoke all on function public.nomes_suspensos_admin() from public, anon;
grant execute on function public.nomes_suspensos_admin() to authenticated;
revoke all on function public.meu_nome_suspenso() from public, anon;
grant execute on function public.meu_nome_suspenso() to authenticated;

notify pgrst, 'reload schema';
