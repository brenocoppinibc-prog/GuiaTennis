-- ============================================================
-- Conta do jogador (pedido do Breno em 02/10/2026)
-- ============================================================
-- Como trivago, Booking e TripAdvisor: buscar, comparar e chamar a academia
-- continuam sem conta; a conta serve para avaliar e para escolher os avisos
-- por e-mail (academias novas e favoritas, promoções das academias,
-- novidades do GuiaTennis). Avaliar agora exige estar logado, e o banco põe
-- o nome e o e-mail da conta na avaliação — ninguém avalia em nome de outro.
-- Uma avaliação por conta em cada academia, como no Google.
-- Pode rodar de novo sem estragar nada.

create table if not exists public.jogadores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  cidade text,
  -- Avisos por e-mail: começam desligados (LGPD); a pessoa liga o que quiser.
  avisos_academias boolean not null default false,
  promocoes boolean not null default false,
  novidades boolean not null default false,
  avisos_mudados_em timestamptz,
  termos_aceitos_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.jogadores enable row level security;

drop policy if exists "Jogador vê a própria conta" on public.jogadores;
create policy "Jogador vê a própria conta" on public.jogadores
  for select using (user_id = auth.uid() or public.eh_admin());
drop policy if exists "Jogador muda a própria conta" on public.jogadores;
create policy "Jogador muda a própria conta" on public.jogadores
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on table public.jogadores from anon, authenticated;
grant select on table public.jogadores to authenticated;
grant update (nome, cidade, avisos_academias, promocoes, novidades, avisos_mudados_em)
  on table public.jogadores to authenticated;

create or replace function public.sou_jogador()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.jogadores where user_id = auth.uid());
$$;

-- Criar a conta: nome, e-mail, senha, cidade (opcional), os avisos que a
-- pessoa marcou e o aceite dos Termos. Entra na hora, sem esperar e-mail.
create or replace function public.criar_conta_jogador(
  p_email text, p_senha text, p_nome text, p_aceite boolean,
  p_cidade text default null, p_avisos_academias boolean default false,
  p_promocoes boolean default false, p_novidades boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id uuid;
  v_avisos boolean := coalesce(p_avisos_academias, false) or coalesce(p_promocoes, false) or coalesce(p_novidades, false);
begin
  if auth.uid() is not null then
    raise exception 'Saia da conta atual para criar outra.' using errcode = '22023';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or v_email like '%@acesso.guiatennis.com.br' then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_nome, ''))) < 3 then
    raise exception 'Escreva o seu nome.' using errcode = '22023';
  end if;
  if length(coalesce(p_senha, '')) < 8 then
    raise exception 'A senha precisa ter pelo menos 8 caracteres.' using errcode = '22023';
  end if;
  if not coalesce(p_aceite, false) then
    raise exception 'Falta aceitar os Termos de Uso e a Política de Privacidade.' using errcode = '22023';
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email)
     or exists (select 1 from public.academia_acessos where lower(email) = v_email or usuario = v_email) then
    raise exception 'Esse e-mail já tem conta no GuiaTennis. Entre com a sua senha.' using errcode = '23505';
  end if;
  -- Freio contra robô: muitas contas novas na mesma hora esperam um pouco.
  if (select count(*) from public.jogadores where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Muitos cadastros agora. Tente de novo em alguns minutos.' using errcode = '54000';
  end if;

  v_id := public.criar_login(v_email, p_senha);
  insert into public.jogadores (user_id, nome, email, cidade, avisos_academias,
    promocoes, novidades, avisos_mudados_em)
  values (v_id, btrim(p_nome), v_email, nullif(btrim(coalesce(p_cidade, '')), ''),
    coalesce(p_avisos_academias, false), coalesce(p_promocoes, false),
    coalesce(p_novidades, false), case when v_avisos then now() end);
end $$;

-- Excluir a conta (LGPD): some o login e os dados; as avaliações ficam,
-- com o nome, mas sem a ligação com a conta.
alter table public.avaliacoes add column if not exists user_id uuid;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'avaliacoes_user_id_fkey') then
    alter table public.avaliacoes add constraint avaliacoes_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete set null;
  end if;
end $$;

create or replace function public.excluir_minha_conta_jogador()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.sou_jogador() then
    raise exception 'Essa conta não é de jogador.' using errcode = '42501';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

-- Avaliação: só com conta de jogador, e com o nome e o e-mail da conta.
create unique index if not exists avaliacoes_uma_por_conta
  on public.avaliacoes (academia_id, user_id) where user_id is not null;

drop policy if exists "Enviar avaliacao" on public.avaliacoes;
create policy "Enviar avaliacao" on public.avaliacoes
  for insert
  with check (stars between 1 and 5
              and length(coalesce(comment, '')) <= 2000
              and not public.sou_parceiro()
              and public.sou_jogador());

create or replace function public.avaliacao_do_jogador()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.jogadores;
begin
  if public.eh_admin() then
    return new;
  end if;
  select * into j from public.jogadores where user_id = auth.uid();
  if not found then
    raise exception 'Entre na sua conta para avaliar.' using errcode = '42501';
  end if;
  if exists (select 1 from public.avaliacoes where academia_id = new.academia_id and user_id = j.user_id) then
    raise exception 'Você já avaliou essa academia.' using errcode = '23505';
  end if;
  new.user_id := j.user_id;
  new.nome_autor := j.nome;
  new.contato_autor := j.email;
  return new;
end $$;

-- "avaliacao_do_jogador" roda depois de "avaliacao_de_parceiro" (ordem
-- alfabética): a conta de academia é barrada antes.
drop trigger if exists avaliacao_do_jogador on public.avaliacoes;
create trigger avaliacao_do_jogador
  before insert on public.avaliacoes
  for each row execute function public.avaliacao_do_jogador();

-- Permissões ------------------------------------------------------------
revoke all on function public.sou_jogador() from public;
grant execute on function public.sou_jogador() to anon, authenticated;
revoke all on function public.criar_conta_jogador(text, text, text, boolean, text, boolean, boolean, boolean) from public;
grant execute on function public.criar_conta_jogador(text, text, text, boolean, text, boolean, boolean, boolean) to anon, authenticated;
revoke all on function public.excluir_minha_conta_jogador() from public, anon;
grant execute on function public.excluir_minha_conta_jogador() to authenticated;
revoke all on function public.avaliacao_do_jogador() from public, anon, authenticated;

notify pgrst, 'reload schema';
