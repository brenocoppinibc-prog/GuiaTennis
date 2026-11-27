-- Regra 223 (pedido do Breno em 09/11/2026): "um usuário pode contestar a
-- participação de outro acesso e deixar pendente para eu verificar o acesso
-- dessa pessoa, faça um pré-questionário (...) sabendo quem essa pessoa é, o
-- que faz na academia". Como o "Denunciar um usuário" do Google Business
-- Profile: quem tem acesso à academia responde a umas perguntas sobre outra
-- pessoa com acesso; nada muda na hora, e o GuiaTennis verifica e decide
-- (manter ou tirar o acesso). A pessoa contestada não é avisada.
-- Pode rodar de novo sem estragar.

create table if not exists public.contestacoes_de_acesso (
  id uuid primary key default gen_random_uuid(),
  academia_id uuid not null references public.academias (id) on delete cascade,
  contestado uuid not null references auth.users (id) on delete cascade,
  contestou uuid references auth.users (id) on delete set null,
  conhece boolean not null,
  quem_e text not null check (quem_e in ('funcionario', 'professor', 'socio', 'ex', 'nao_sei')),
  o_que_faz text,
  motivo text not null check (motivo in ('saiu', 'nao_trabalha', 'nao_deveria', 'outro')),
  detalhes text,
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  resolucao text check (resolucao in ('manteve', 'tirou'))
);
create unique index if not exists contestacoes_de_acesso_aberta
  on public.contestacoes_de_acesso (academia_id, contestado, contestou) where resolvido_em is null;
alter table public.contestacoes_de_acesso enable row level security;
revoke all on public.contestacoes_de_acesso from anon, authenticated;

create or replace function public.nome_de_quem_e(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p when 'funcionario' then 'funcionário(a) da academia' when 'professor' then 'professor(a)'
    when 'socio' then 'sócio(a) ou dono(a)' when 'ex' then 'ex-funcionário(a) ou ex-sócio(a)'
    when 'nao_sei' then 'não sabe quem é' else p end;
$$;

create or replace function public.nome_do_motivo_de_acesso(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p when 'saiu' then 'saiu da academia' when 'nao_trabalha' then 'não trabalha na academia'
    when 'nao_deveria' then 'não deveria mexer na ficha' when 'outro' then 'outro motivo' else p end;
$$;

-- Quem tem acesso à academia contesta o acesso de outra pessoa.
create or replace function public.contestar_acesso(p_academia uuid, p_user uuid, p_conhece boolean,
  p_quem_e text, p_o_que_faz text, p_motivo text, p_detalhes text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  x public.academia_acessos;
  y public.academia_acessos;
  v_faz text := nullif(btrim(coalesce(p_o_que_faz, '')), '');
  v_det text := left(nullif(btrim(coalesce(p_detalhes, '')), ''), 1000);
  v_id uuid;
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
  if p_conhece is null or p_quem_e not in ('funcionario', 'professor', 'socio', 'ex', 'nao_sei')
     or p_motivo not in ('saiu', 'nao_trabalha', 'nao_deveria', 'outro') then
    raise exception 'Responda às perguntas.' using errcode = '22023';
  end if;
  if p_quem_e <> 'nao_sei' and coalesce(length(v_faz), 0) < 3 then
    raise exception 'Conte o que essa pessoa faz (ou fazia) na academia.' using errcode = '22023';
  end if;
  if exists (select 1 from public.contestacoes_de_acesso
             where academia_id = p_academia and contestado = p_user and contestou = auth.uid() and resolvido_em is null) then
    return 'ja_enviada';
  end if;
  insert into public.contestacoes_de_acesso (academia_id, contestado, contestou, conhece, quem_e, o_que_faz, motivo, detalhes)
  values (p_academia, p_user, auth.uid(), p_conhece, p_quem_e, left(v_faz, 200), p_motivo, v_det)
  returning id into v_id;
  select * into a from public.academias where id = p_academia;
  select * into x from public.academia_acessos where user_id = auth.uid();
  select * into y from public.academia_acessos where user_id = p_user;
  perform public.aviso_ao_admin('acesso_contestado:' || v_id, 'acesso_contestado',
    'Acesso contestado: ' || a.name, 'Acesso contestado',
    public.email_p('<strong>' || public.html_texto(coalesce(x.nome_responsavel, x.email, '')) || '</strong> contestou o acesso de <strong>'
      || public.html_texto(coalesce(y.nome_responsavel, y.email, '')) || '</strong> à <strong>' || public.html_texto(a.name) || '</strong>.')
    || public.email_p('Conhece a pessoa: ' || case when p_conhece then 'sim' else 'não' end || '. Quem é: ' || public.nome_de_quem_e(p_quem_e)
      || coalesce('. O que faz: ' || public.html_texto(v_faz), '') || '. Motivo: ' || public.nome_do_motivo_de_acesso(p_motivo)
      || coalesce('. ' || public.html_texto(v_det), '') || '.')
    || public.email_p('Nada mudou. Em Pendências, verifique e decida: manter ou tirar o acesso.'),
    coalesce(x.nome_responsavel, x.email, '') || ' contestou o acesso de ' || coalesce(y.nome_responsavel, y.email, '') || ' à ' || a.name
      || E'.\n\nConhece a pessoa: ' || case when p_conhece then 'sim' else 'não' end || '. Quem é: ' || public.nome_de_quem_e(p_quem_e)
      || coalesce('. O que faz: ' || v_faz, '') || '. Motivo: ' || public.nome_do_motivo_de_acesso(p_motivo) || coalesce('. ' || v_det, '')
      || E'.\n\nNada mudou. Em Pendências, verifique e decida: manter ou tirar o acesso.');
  return 'enviada';
end $$;

-- As contestações abertas de quem pergunta, na academia (a lista de Acessos
-- mostra "Em verificação pelo GuiaTennis").
create or replace function public.minhas_contestacoes_de_acesso(p_academia uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.contestado from public.contestacoes_de_acesso c
  where c.academia_id = p_academia and c.contestou = auth.uid() and c.resolvido_em is null;
$$;

-- O admin: as contestações abertas, com os dois lados.
create or replace function public.contestacoes_de_acesso_admin()
returns table (id uuid, academia_id uuid, academia text, contestado uuid, contestado_nome text, contestado_email text,
  contestado_cargo text, contestado_papel text, contestado_desde timestamptz, contestou_nome text, contestou_email text,
  contestou_cargo text, contestou_papel text, conhece boolean, quem_e text, o_que_faz text, motivo text, detalhes text,
  criado_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.academia_id, a.name, c.contestado, y.nome_responsavel, y.email, y.cargo, vy.papel, vy.created_at,
    x.nome_responsavel, x.email, x.cargo, vx.papel, c.conhece, c.quem_e, c.o_que_faz, c.motivo, c.detalhes, c.criado_em
  from public.contestacoes_de_acesso c
  join public.academias a on a.id = c.academia_id
  left join public.academia_acessos y on y.user_id = c.contestado
  left join public.academia_vinculos vy on vy.user_id = c.contestado and vy.academia_id = c.academia_id
  left join public.academia_acessos x on x.user_id = c.contestou
  left join public.academia_vinculos vx on vx.user_id = c.contestou and vx.academia_id = c.academia_id
  where public.eh_admin() and c.resolvido_em is null
  order by c.criado_em;
$$;

-- Manter ou tirar o acesso (só desta academia; a conta continua).
create or replace function public.resolver_contestacao_de_acesso(p_id uuid, p_tirar boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.contestacoes_de_acesso;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis decide a contestação.' using errcode = '42501';
  end if;
  select * into c from public.contestacoes_de_acesso where id = p_id;
  if not found then
    raise exception 'Contestação não encontrada.' using errcode = '22023';
  end if;
  if p_tirar then
    delete from public.academia_vinculos where user_id = c.contestado and academia_id = c.academia_id;
    -- A conta continua (é a mesma do site dos jogadores): só deixa de abrir
    -- esta academia.
    update public.academia_acessos x
      set academia_id = (select v.academia_id from public.academia_vinculos v where v.user_id = c.contestado order by v.created_at limit 1)
      where x.user_id = c.contestado and x.academia_id = c.academia_id;
  end if;
  update public.contestacoes_de_acesso
    set resolvido_em = now(), resolucao = case when p_tirar then 'tirou' else 'manteve' end
    where academia_id = c.academia_id and contestado = c.contestado and resolvido_em is null;
end $$;

revoke all on function public.contestar_acesso(uuid, uuid, boolean, text, text, text, text),
  public.minhas_contestacoes_de_acesso(uuid), public.contestacoes_de_acesso_admin(),
  public.resolver_contestacao_de_acesso(uuid, boolean) from public, anon;
grant execute on function public.contestar_acesso(uuid, uuid, boolean, text, text, text, text),
  public.minhas_contestacoes_de_acesso(uuid), public.contestacoes_de_acesso_admin(),
  public.resolver_contestacao_de_acesso(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
