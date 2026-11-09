-- Regra 224 (pedido do Breno em 09/11/2026): "nos jogadores outros usuários
-- também podem denunciar outras contas, nomes e etc". Como o "Denunciar
-- perfil" do Google Maps e do Instagram: no mesmo "Denunciar" da avaliação,
-- o jogador escolhe se o problema é a avaliação ou a conta de quem escreveu
-- (nome ofensivo, conta falsa ou se passando por outra pessoa, conta da
-- academia ou de concorrente, outro). Nada muda na hora; quem foi denunciado
-- não sabe quem denunciou; o admin decide em Pendências: manter ou suspender
-- o nome (o "Suspender o nome" que já existe, SQL 20261027120000).
-- Pode rodar de novo sem estragar.

create table if not exists public.denuncias_de_conta (
  id uuid primary key default gen_random_uuid(),
  denunciado uuid not null references auth.users (id) on delete cascade,
  denunciou uuid references auth.users (id) on delete set null,
  avaliacao_id uuid references public.avaliacoes (id) on delete set null,
  nome_visto text,
  motivo text not null check (motivo in ('nome', 'falsa', 'academia', 'outro')),
  detalhes text,
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  resolucao text check (resolucao in ('manteve', 'suspendeu'))
);
create unique index if not exists denuncias_de_conta_aberta
  on public.denuncias_de_conta (denunciado, denunciou) where resolvido_em is null;
alter table public.denuncias_de_conta enable row level security;
revoke all on public.denuncias_de_conta from anon, authenticated;

create or replace function public.nome_da_denuncia_de_conta(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p when 'nome' then 'nome ofensivo ou impróprio' when 'falsa' then 'conta falsa ou se passando por outra pessoa'
    when 'academia' then 'conta da academia ou de um concorrente' when 'outro' then 'outro problema' else p end;
$$;

-- O jogador denuncia a conta de quem escreveu a avaliação (o site não sabe
-- quem é: o banco acha pela avaliação).
create or replace function public.denunciar_conta(p_avaliacao uuid, p_motivo text, p_detalhes text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.avaliacoes;
  a public.academias;
  v_det text := left(nullif(btrim(coalesce(p_detalhes, '')), ''), 500);
  v_id uuid;
begin
  if not public.sou_jogador() then
    raise exception 'Entre na sua conta para denunciar.' using errcode = '42501';
  end if;
  if coalesce(p_motivo, '') not in ('nome', 'falsa', 'academia', 'outro') then
    raise exception 'Escolha o motivo.' using errcode = '22023';
  end if;
  if p_motivo = 'outro' and v_det is null then
    raise exception 'Conte o que está errado na conta.' using errcode = '22023';
  end if;
  select * into v from public.avaliacoes where id = p_avaliacao;
  if not found or v.user_id is null then
    raise exception 'Avaliação não encontrada.' using errcode = '22023';
  end if;
  if v.user_id = auth.uid() then
    raise exception 'Essa conta é sua.' using errcode = '22023';
  end if;
  if (select count(*) from public.denuncias_de_conta
      where denunciou = auth.uid() and criado_em > now() - interval '1 day') >= 10 then
    raise exception 'Você já denunciou 10 contas hoje. Tente de novo amanhã.' using errcode = '22023';
  end if;
  if exists (select 1 from public.denuncias_de_conta
             where denunciado = v.user_id and denunciou = auth.uid() and resolvido_em is null) then
    return 'ja_enviada';
  end if;
  insert into public.denuncias_de_conta (denunciado, denunciou, avaliacao_id, nome_visto, motivo, detalhes)
  values (v.user_id, auth.uid(), v.id, v.nome_autor, p_motivo, v_det)
  returning id into v_id;
  select * into a from public.academias where id = v.academia_id;
  perform public.aviso_ao_admin('conta_denunciada:' || v.user_id || ':' || public.hoje_em_brasilia(), 'conta_denunciada',
    'Conta denunciada: ' || coalesce(v.nome_autor, 'jogador'), 'Conta denunciada',
    public.email_p('Um jogador denunciou a conta de <strong>' || public.html_texto(coalesce(v.nome_autor, '')) || '</strong> (avaliação na '
      || public.html_texto(coalesce(a.name, 'academia')) || '): ' || public.nome_da_denuncia_de_conta(p_motivo)
      || coalesce('. “' || public.html_texto(v_det) || '”', '') || '.')
    || public.email_p('Nada mudou. Em Pendências, verifique e decida: manter ou suspender o nome.'),
    'Um jogador denunciou a conta de ' || coalesce(v.nome_autor, '') || ' (avaliação na ' || coalesce(a.name, 'academia') || '): '
      || public.nome_da_denuncia_de_conta(p_motivo) || coalesce('. "' || v_det || '"', '')
      || E'.\n\nNada mudou. Em Pendências, verifique e decida: manter ou suspender o nome.');
  return 'enviada';
end $$;

-- O admin: uma linha por conta denunciada, com os motivos e as avaliações.
create or replace function public.denuncias_de_conta_admin()
returns table (denunciado uuid, nome text, email text, nome_visto text, denuncias bigint, motivos text[], detalhes text[],
  academias text[], avaliacoes bigint, nome_suspenso boolean, primeira timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select d.denunciado,
    coalesce((select nullif(btrim(j.nome), '') from public.jogadores j where j.user_id = d.denunciado),
             (select nullif(btrim(x.nome_responsavel), '') from public.academia_acessos x where x.user_id = d.denunciado)),
    (select u.email from auth.users u where u.id = d.denunciado)::text,
    (array_agg(d.nome_visto order by d.criado_em desc))[1],
    count(*), array_agg(distinct d.motivo), array_remove(array_agg(d.detalhes order by d.criado_em), null),
    array_remove(array_agg(distinct a.name), null),
    (select count(*) from public.avaliacoes v where v.user_id = d.denunciado),
    exists (select 1 from public.nomes_suspensos s where s.user_id = d.denunciado and s.resolvido_em is null),
    min(d.criado_em)
  from public.denuncias_de_conta d
  left join public.avaliacoes v on v.id = d.avaliacao_id
  left join public.academias a on a.id = v.academia_id
  where public.eh_admin() and d.resolvido_em is null
  group by d.denunciado
  order by min(d.criado_em);
$$;

-- Manter (fecha as denúncias) ou suspender o nome (com o motivo, que vai no
-- e-mail para a pessoa, como no "Suspender o nome").
create or replace function public.resolver_denuncia_de_conta(p_user uuid, p_suspender boolean, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis decide a denúncia.' using errcode = '42501';
  end if;
  if p_suspender and not exists (select 1 from public.nomes_suspensos where user_id = p_user and resolvido_em is null) then
    perform public.suspender_nome_admin(p_user, p_motivo, null);
  end if;
  update public.denuncias_de_conta
    set resolvido_em = now(), resolucao = case when p_suspender then 'suspendeu' else 'manteve' end
    where denunciado = p_user and resolvido_em is null;
end $$;

revoke all on function public.denunciar_conta(uuid, text, text), public.denuncias_de_conta_admin(),
  public.resolver_denuncia_de_conta(uuid, boolean, text) from public, anon;
grant execute on function public.denunciar_conta(uuid, text, text), public.denuncias_de_conta_admin(),
  public.resolver_denuncia_de_conta(uuid, boolean, text) to authenticated;

notify pgrst, 'reload schema';
