-- Convite por e-mail (regra 187, pedido do Breno em 30/10/2026: "quando o
-- acesso for criado para um email, deixe que ele próprio crie a senha e o
-- email já que for logado e confirmado tudo certo, já ter a academia
-- cadastrada"). Como o convite de equipe da Shopify e o "Adicionar usuário"
-- do Google Business Profile: sem senha provisória. O GuiaTennis (no
-- painel) ou o responsável principal (em Acessos) convida pelo e-mail; a
-- pessoa cria a conta com esse e-mail e a própria senha e, quando confirma
-- o e-mail, a academia já está na conta. Pode rodar de novo sem estragar.

create table if not exists public.convites_de_acesso (
  id uuid primary key default gen_random_uuid(),
  academia_id uuid not null references public.academias(id) on delete cascade,
  email text not null,
  nome text,
  convidado_por uuid,
  created_at timestamptz not null default now(),
  unique (academia_id, email)
);
alter table public.convites_de_acesso enable row level security;
revoke all on public.convites_de_acesso from anon, authenticated;

-- O e-mail do convite, pela fila de sempre. Quem convida: o nome de quem
-- está na conta ou, no painel, o GuiaTennis.
create or replace function public.avisar_convite(p_academia uuid, p_email text, p_quem text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia text;
  v_quem text;
  v_link text := public.site_dos_emails() || '/parceiros/entrar?utm_source=Email-convite';
  v_texto text;
begin
  select name into v_academia from public.academias where id = p_academia;
  v_quem := coalesce(p_quem,
    (select coalesce(nullif(btrim(nome_responsavel), ''), email) from public.academia_acessos where user_id = auth.uid()),
    'O GuiaTennis');
  v_texto := v_quem || ' convidou você para administrar a ' || v_academia
    || ' no GuiaTennis Parceiros, o site das academias do GuiaTennis. Crie a sua conta com este e-mail ('
    || p_email || ') e a sua própria senha: quando você confirmar o e-mail, a academia já aparece na sua conta.';
  perform public.por_na_fila(
    'convite:' || p_academia || ':' || p_email || ':' || public.hoje_em_brasilia(), 'convite', p_email,
    'Convite para a ' || v_academia || ' no GuiaTennis Parceiros',
    public.email_montado('Convite', public.email_p(public.html_texto(v_texto)),
      'Criar minha conta', v_link,
      'Você recebe este e-mail porque este endereço foi informado para administrar a ' || public.html_texto(v_academia)
        || ' no GuiaTennis Parceiros. Se não conhece a academia, ignore.'),
    v_texto || E'\n\n' || v_link);
exception when others then
  raise warning 'convite por e-mail: %', sqlerrm;
end $$;

-- Liga a conta às academias para as quais o e-mail dela foi convidado. A
-- primeira fica aberta; o convite usado sai da lista.
create or replace function public.aceitar_convites(p_user uuid, p_email text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_emails text[];
  r record;
  n int := 0;
begin
  v_emails := array_remove(array[
    lower(btrim(coalesce(p_email, ''))),
    lower(btrim(coalesce((select email from auth.users where id = p_user), '')))], '');
  for r in select * from public.convites_de_acesso where email = any(v_emails) order by created_at loop
    perform public.ligar_conta_a_academia(p_user, r.academia_id, n = 0);
    delete from public.convites_de_acesso where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Na hora em que o e-mail da conta é confirmado (ou a conta do Parceiros
-- nasce já confirmada), os convites viram academias na conta.
create or replace function public.convites_ao_confirmar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmado_em is not null and (tg_op = 'INSERT' or old.email_confirmado_em is null) then
    perform public.aceitar_convites(new.user_id, new.email);
  end if;
  return null;
exception when others then
  raise warning 'aceitar convites: %', sqlerrm;
  return null;
end $$;
drop trigger if exists convites_ao_confirmar on public.academia_acessos;
create trigger convites_ao_confirmar
  after insert or update of email_confirmado_em on public.academia_acessos
  for each row execute function public.convites_ao_confirmar();

-- O responsável principal inclui mais uma pessoa. Conta do Parceiros que já
-- existe ganha a academia na hora, como antes; e-mail sem conta (ou conta
-- só de jogador) recebe o convite. O p_senha fica só para o site antigo e
-- não é mais usado.
create or replace function public.adicionar_pessoa(p_email text, p_nome text, p_senha text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia uuid;
  v_papel text;
  v_outro public.academia_acessos;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_plano text;
  v_limite int;
begin
  select x.academia_id, m.papel into v_academia, v_papel
    from public.academia_acessos x
    join public.academia_vinculos m on m.user_id = x.user_id and m.academia_id = x.academia_id
    where x.user_id = auth.uid();
  if v_academia is null then
    raise exception 'A sua conta ainda não administra uma academia.' using errcode = '42501';
  end if;
  if v_papel <> 'principal' then
    raise exception 'Só o responsável principal adiciona pessoas.' using errcode = '42501';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or v_email like '%@acesso.guiatennis.com.br' then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;
  if exists (select 1 from public.convites_de_acesso where academia_id = v_academia and email = v_email) then
    raise exception 'Essa pessoa já foi convidada.' using errcode = '23505';
  end if;
  select coalesce(plano, 'basico') into v_plano from public.academias where id = v_academia;
  v_limite := public.limite_de_pessoas(v_plano);
  if (select count(*) from public.academia_vinculos where academia_id = v_academia)
     + (select count(*) from public.convites_de_acesso where academia_id = v_academia) >= v_limite then
    raise exception 'O seu plano permite até % %. Aprimore o plano para adicionar mais.',
      v_limite, case when v_limite = 1 then 'pessoa' else 'pessoas' end
      using errcode = '22023';
  end if;

  select x.* into v_outro
    from public.academia_acessos x join auth.users u on u.id = x.user_id
    where lower(u.email) = v_email or lower(x.email) = v_email
    limit 1;
  if found then
    if exists (select 1 from public.academia_vinculos
               where user_id = v_outro.user_id and academia_id = v_academia) then
      raise exception 'Essa pessoa já tem acesso a esta academia.' using errcode = '23505';
    end if;
    perform public.ligar_conta_a_academia(v_outro.user_id, v_academia, false);
    return 'ligada';
  end if;

  insert into public.convites_de_acesso (academia_id, email, nome, convidado_por)
  values (v_academia, v_email, nullif(btrim(coalesce(p_nome, '')), ''), auth.uid())
  on conflict (academia_id, email) do nothing;
  perform public.avisar_convite(v_academia, v_email);
  return 'convidada';
end $$;

-- Os convites da academia aberta, para a lista de Acessos.
create or replace function public.convites_da_minha_academia()
returns table (email text, nome text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.email, c.nome, c.created_at
  from public.convites_de_acesso c
  where c.academia_id = (select e.academia_id from public.academia_acessos e
                         join public.academia_vinculos m
                           on m.user_id = e.user_id and m.academia_id = e.academia_id
                         where e.user_id = auth.uid())
  order by c.created_at;
$$;

-- O responsável principal cancela um convite que ainda não foi usado.
create or replace function public.cancelar_convite(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia uuid;
  v_papel text;
begin
  select x.academia_id, m.papel into v_academia, v_papel
    from public.academia_acessos x
    join public.academia_vinculos m on m.user_id = x.user_id and m.academia_id = x.academia_id
    where x.user_id = auth.uid();
  if v_academia is null or v_papel <> 'principal' then
    raise exception 'Só o responsável principal cancela convites.' using errcode = '42501';
  end if;
  delete from public.convites_de_acesso
    where academia_id = v_academia and email = lower(btrim(coalesce(p_email, '')));
end $$;

-- O GuiaTennis, no painel, convida a academia pelo e-mail dela. Conta do
-- Parceiros que já existe ganha a academia na hora.
create or replace function public.convidar_academia(p_academia uuid, p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_outro public.academia_acessos;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis convida pelo painel.' using errcode = '42501';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or v_email like '%@acesso.guiatennis.com.br' then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;
  select x.* into v_outro
    from public.academia_acessos x join auth.users u on u.id = x.user_id
    where lower(u.email) = v_email or lower(x.email) = v_email
    limit 1;
  if found then
    perform public.ligar_conta_a_academia(v_outro.user_id, p_academia, false);
    return 'ligada';
  end if;
  insert into public.convites_de_acesso (academia_id, email, convidado_por)
  values (p_academia, v_email, auth.uid())
  on conflict (academia_id, email) do nothing;
  perform public.avisar_convite(p_academia, v_email, 'O GuiaTennis');
  return 'convidada';
end $$;

-- Os convites que esperam a conta, para o painel.
create or replace function public.convites_pendentes()
returns table (academia_id uuid, email text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.academia_id, c.email, c.created_at
  from public.convites_de_acesso c
  where public.eh_admin()
  order by c.created_at;
$$;

revoke all on function public.avisar_convite(uuid, text, text) from public, anon, authenticated;
revoke all on function public.aceitar_convites(uuid, text) from public, anon, authenticated;
revoke all on function public.convites_ao_confirmar() from public, anon, authenticated;
grant execute on function public.adicionar_pessoa(text, text, text) to authenticated;
grant execute on function public.convites_da_minha_academia() to authenticated;
grant execute on function public.cancelar_convite(text) to authenticated;
grant execute on function public.convidar_academia(uuid, text) to authenticated;
grant execute on function public.convites_pendentes() to authenticated;
