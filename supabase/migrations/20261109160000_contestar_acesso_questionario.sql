-- Regra 225 (pedido do Breno em 09/11/2026): o questionário da contestação
-- de acesso começa por quem contesta (quem é na academia, o que faz, há
-- quanto tempo está lá), depois a outra pessoa (conhece? quem é? o que faz?
-- suspeita de algo? por quê?), e a pessoa contestada também responde (quem
-- é, o que faz, há quanto tempo, o lado dela), sem saber quem contestou.
-- O admin vê os dois lados. Pode rodar de novo sem estragar.

alter table public.contestacoes_de_acesso add column if not exists contestou_quem_e text;
alter table public.contestacoes_de_acesso add column if not exists contestou_o_que_faz text;
alter table public.contestacoes_de_acesso add column if not exists contestou_desde text;
alter table public.contestacoes_de_acesso add column if not exists suspeita text;
alter table public.contestacoes_de_acesso add column if not exists resposta_quem_e text;
alter table public.contestacoes_de_acesso add column if not exists resposta_o_que_faz text;
alter table public.contestacoes_de_acesso add column if not exists resposta_desde text;
alter table public.contestacoes_de_acesso add column if not exists resposta_texto text;
alter table public.contestacoes_de_acesso add column if not exists respondido_em timestamptz;

create or replace function public.nome_da_suspeita(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p when 'nenhuma' then 'nenhuma, só quer conferir' when 'ficha' then 'muda a ficha sem autorização'
    when 'avaliacoes' then 'responde avaliações sem autorização' when 'outra_pessoa' then 'pode estar usando a conta de outra pessoa'
    when 'outra' then 'outra suspeita' else p end;
$$;
create or replace function public.nome_do_tempo(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p when 'menos_6m' then 'menos de 6 meses' when '6m_2a' then 'de 6 meses a 2 anos'
    when 'mais_2a' then 'mais de 2 anos' else p end;
$$;

drop function if exists public.contestar_acesso(uuid, uuid, boolean, text, text, text, text);
create or replace function public.contestar_acesso(p_academia uuid, p_user uuid,
  p_meu_quem_e text, p_meu_o_que_faz text, p_meu_desde text,
  p_conhece boolean, p_quem_e text, p_o_que_faz text, p_suspeita text, p_motivo text, p_detalhes text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  x public.academia_acessos;
  y public.academia_acessos;
  v_meu text := left(nullif(btrim(coalesce(p_meu_o_que_faz, '')), ''), 200);
  v_faz text := left(nullif(btrim(coalesce(p_o_que_faz, '')), ''), 200);
  v_det text := left(nullif(btrim(coalesce(p_detalhes, '')), ''), 1000);
  v_id uuid;
  v_resumo text;
begin
  if not exists (select 1 from public.academia_vinculos where user_id = auth.uid() and academia_id = p_academia) then
    raise exception 'Só quem tem acesso à academia contesta um acesso.' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'Você não pode contestar o próprio acesso.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.academia_vinculos where user_id = p_user and academia_id = p_academia) then
    raise exception 'Essa pessoa não tem acesso à academia.' using errcode = '22023';
  end if;
  if coalesce(p_meu_quem_e, '') not in ('funcionario', 'professor', 'socio')
     or coalesce(p_meu_desde, '') not in ('menos_6m', '6m_2a', 'mais_2a') or coalesce(length(v_meu), 0) < 3 then
    raise exception 'Conte quem você é na academia, o que faz e há quanto tempo está lá.' using errcode = '22023';
  end if;
  if p_conhece is null or coalesce(p_quem_e, '') not in ('funcionario', 'professor', 'socio', 'ex', 'nao_sei')
     or coalesce(p_suspeita, '') not in ('nenhuma', 'ficha', 'avaliacoes', 'outra_pessoa', 'outra')
     or coalesce(p_motivo, '') not in ('saiu', 'nao_trabalha', 'nao_deveria', 'outro') then
    raise exception 'Responda às perguntas.' using errcode = '22023';
  end if;
  if p_quem_e <> 'nao_sei' and coalesce(length(v_faz), 0) < 3 then
    raise exception 'Conte o que essa pessoa faz (ou fazia) na academia.' using errcode = '22023';
  end if;
  if exists (select 1 from public.contestacoes_de_acesso
             where academia_id = p_academia and contestado = p_user and contestou = auth.uid() and resolvido_em is null) then
    return 'ja_enviada';
  end if;
  insert into public.contestacoes_de_acesso (academia_id, contestado, contestou, contestou_quem_e, contestou_o_que_faz, contestou_desde,
    conhece, quem_e, o_que_faz, suspeita, motivo, detalhes)
  values (p_academia, p_user, auth.uid(), p_meu_quem_e, v_meu, p_meu_desde, p_conhece, p_quem_e, v_faz, p_suspeita, p_motivo, v_det)
  returning id into v_id;
  select * into a from public.academias where id = p_academia;
  select * into x from public.academia_acessos where user_id = auth.uid();
  select * into y from public.academia_acessos where user_id = p_user;
  v_resumo := 'Quem contestou: ' || public.nome_de_quem_e(p_meu_quem_e) || ', ' || v_meu || ', há ' || public.nome_do_tempo(p_meu_desde)
    || '. Conhece a pessoa: ' || case when p_conhece then 'sim' else 'não' end || '. Quem é: ' || public.nome_de_quem_e(p_quem_e)
    || coalesce('. O que faz: ' || v_faz, '') || '. Suspeita: ' || public.nome_da_suspeita(p_suspeita)
    || '. Motivo: ' || public.nome_do_motivo_de_acesso(p_motivo) || coalesce('. ' || v_det, '') || '.';
  perform public.aviso_ao_admin('acesso_contestado:' || v_id, 'acesso_contestado',
    'Acesso contestado: ' || a.name, 'Acesso contestado',
    public.email_p('<strong>' || public.html_texto(coalesce(x.nome_responsavel, x.email, '')) || '</strong> contestou o acesso de <strong>'
      || public.html_texto(coalesce(y.nome_responsavel, y.email, '')) || '</strong> à <strong>' || public.html_texto(a.name) || '</strong>.')
    || public.email_p(public.html_texto(v_resumo))
    || public.email_p('A pessoa contestada foi chamada a responder também. Nada mudou: em Pendências, verifique e decida.'),
    coalesce(x.nome_responsavel, x.email, '') || ' contestou o acesso de ' || coalesce(y.nome_responsavel, y.email, '') || ' à ' || a.name
      || E'.\n\n' || v_resumo || E'\n\nA pessoa contestada foi chamada a responder também. Nada mudou: em Pendências, verifique e decida.');
  -- A pessoa contestada responde, sem saber quem contestou.
  if y.email is not null then
    perform public.por_na_fila('acesso_em_verificacao:' || v_id, 'acesso_em_verificacao', y.email,
      'Seu acesso à ' || a.name || ' está em verificação',
      public.email_montado('Seu acesso está em verificação',
        public.email_p('O GuiaTennis está verificando quem tem acesso à <strong>' || public.html_texto(a.name)
          || '</strong> no GuiaTennis Parceiros. Responda a três perguntas rápidas sobre você na academia.')
        || public.email_p('Até o GuiaTennis decidir, nada muda no seu acesso.'),
        'Responder', public.site_dos_emails() || '/parceiros/painel', 'Aviso do GuiaTennis Parceiros.'),
      'O GuiaTennis está verificando quem tem acesso à ' || a.name || E' no GuiaTennis Parceiros. Responda a três perguntas rápidas sobre você na academia.\n\nAté o GuiaTennis decidir, nada muda no seu acesso.\n\nResponder: '
        || public.site_dos_emails() || '/parceiros/painel');
  end if;
  return 'enviada';
end $$;

-- A pessoa contestada: as verificações abertas do acesso dela (sem quem contestou).
create or replace function public.verificacoes_do_meu_acesso()
returns table (id uuid, academia_id uuid, academia text, criado_em timestamptz, respondido_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.academia_id, a.name, c.criado_em, c.respondido_em
  from public.contestacoes_de_acesso c
  join public.academias a on a.id = c.academia_id
  where c.contestado = auth.uid() and c.resolvido_em is null
  order by c.criado_em;
$$;

create or replace function public.responder_verificacao_de_acesso(p_academia uuid, p_quem_e text, p_o_que_faz text, p_desde text, p_texto text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_faz text := left(nullif(btrim(coalesce(p_o_que_faz, '')), ''), 200);
  v_txt text := left(nullif(btrim(coalesce(p_texto, '')), ''), 1000);
  a public.academias;
  y public.academia_acessos;
begin
  if not exists (select 1 from public.contestacoes_de_acesso
                 where academia_id = p_academia and contestado = auth.uid() and resolvido_em is null) then
    return 'sem_verificacao';
  end if;
  if coalesce(p_quem_e, '') not in ('funcionario', 'professor', 'socio', 'ex')
     or coalesce(p_desde, '') not in ('menos_6m', '6m_2a', 'mais_2a') or coalesce(length(v_faz), 0) < 3 then
    raise exception 'Conte quem você é na academia, o que faz e há quanto tempo está lá.' using errcode = '22023';
  end if;
  update public.contestacoes_de_acesso
    set resposta_quem_e = p_quem_e, resposta_o_que_faz = v_faz, resposta_desde = p_desde, resposta_texto = v_txt, respondido_em = now()
    where academia_id = p_academia and contestado = auth.uid() and resolvido_em is null;
  select * into a from public.academias where id = p_academia;
  select * into y from public.academia_acessos where user_id = auth.uid();
  perform public.aviso_ao_admin('acesso_respondido:' || p_academia || ':' || auth.uid(), 'acesso_contestado',
    'Acesso contestado: ' || coalesce(y.nome_responsavel, y.email, '') || ' respondeu', 'A pessoa contestada respondeu',
    public.email_p('<strong>' || public.html_texto(coalesce(y.nome_responsavel, y.email, '')) || '</strong> respondeu sobre o acesso à <strong>'
      || public.html_texto(a.name) || '</strong>: ' || public.html_texto(public.nome_de_quem_e(p_quem_e) || ', ' || v_faz || ', há ' || public.nome_do_tempo(p_desde))
      || coalesce('. “' || public.html_texto(v_txt) || '”', '') || '.')
    || public.email_p('Em Pendências, compare com o que disse quem contestou e decida.'),
    coalesce(y.nome_responsavel, y.email, '') || ' respondeu sobre o acesso à ' || a.name || ': ' || public.nome_de_quem_e(p_quem_e) || ', ' || v_faz
      || ', há ' || public.nome_do_tempo(p_desde) || coalesce('. "' || v_txt || '"', '') || E'.\n\nEm Pendências, compare com o que disse quem contestou e decida.');
  return 'respondida';
end $$;

drop function if exists public.contestacoes_de_acesso_admin();
create or replace function public.contestacoes_de_acesso_admin()
returns table (id uuid, academia_id uuid, academia text, contestado uuid, contestado_nome text, contestado_email text,
  contestado_cargo text, contestado_papel text, contestado_desde timestamptz, contestou_nome text, contestou_email text,
  contestou_cargo text, contestou_papel text, conhece boolean, quem_e text, o_que_faz text, motivo text, detalhes text,
  criado_em timestamptz, contestou_quem_e text, contestou_o_que_faz text, contestou_desde text, suspeita text,
  resposta_quem_e text, resposta_o_que_faz text, resposta_desde text, resposta_texto text, respondido_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.academia_id, a.name, c.contestado, y.nome_responsavel, y.email, y.cargo, vy.papel, vy.created_at,
    x.nome_responsavel, x.email, x.cargo, vx.papel, c.conhece, c.quem_e, c.o_que_faz, c.motivo, c.detalhes, c.criado_em,
    c.contestou_quem_e, c.contestou_o_que_faz, c.contestou_desde, c.suspeita,
    c.resposta_quem_e, c.resposta_o_que_faz, c.resposta_desde, c.resposta_texto, c.respondido_em
  from public.contestacoes_de_acesso c
  join public.academias a on a.id = c.academia_id
  left join public.academia_acessos y on y.user_id = c.contestado
  left join public.academia_vinculos vy on vy.user_id = c.contestado and vy.academia_id = c.academia_id
  left join public.academia_acessos x on x.user_id = c.contestou
  left join public.academia_vinculos vx on vx.user_id = c.contestou and vx.academia_id = c.academia_id
  where public.eh_admin() and c.resolvido_em is null
  order by c.criado_em;
$$;

revoke all on function public.contestar_acesso(uuid, uuid, text, text, text, boolean, text, text, text, text, text),
  public.verificacoes_do_meu_acesso(), public.responder_verificacao_de_acesso(uuid, text, text, text, text),
  public.contestacoes_de_acesso_admin() from public, anon;
grant execute on function public.contestar_acesso(uuid, uuid, text, text, text, boolean, text, text, text, text, text),
  public.verificacoes_do_meu_acesso(), public.responder_verificacao_de_acesso(uuid, text, text, text, text),
  public.contestacoes_de_acesso_admin() to authenticated;

notify pgrst, 'reload schema';
