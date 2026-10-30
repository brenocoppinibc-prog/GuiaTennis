-- ============================================================
-- O admin exclui a conta de quem descumprir os Termos (pedido do Breno em
-- 06/10/2026: "eu como admin quero poder excluir uma conta se infringir
-- as leis de uso")
-- ============================================================
-- Vale para a conta de jogador e para a do GuiaTennis Parceiros (é o
-- mesmo login). A conta sai do GuiaTennis; as academias que ela
-- administrava continuam no guia, sem ela. As avaliações dela ficam com o
-- nome, sem a ligação, ou saem também, se o admin escolher.
--
--   contas_excluidas            e-mail, nome, tipo, motivo e quando — a
--                               prova do que foi feito e o bloqueio: esse
--                               e-mail não cria outra conta (só o admin lê)
--   excluir_conta_admin(user, motivo, apagar_avaliacoes)
--   contas_excluidas_admin()    a lista do painel do admin
--   liberar_email_admin(email)  tira o bloqueio
--   bloquear_email_excluido     gatilho em jogadores e academia_acessos
-- Pode rodar de novo sem estragar nada.

create table if not exists public.contas_excluidas (
  email text primary key,
  nome text,
  tipo text,
  motivo text not null,
  avaliacoes_apagadas boolean not null default false,
  excluida_em timestamptz not null default now()
);
alter table public.contas_excluidas enable row level security;
revoke all on table public.contas_excluidas from anon, authenticated;

create or replace function public.excluir_conta_admin(
  p_user uuid, p_motivo text, p_apagar_avaliacoes boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_nome text;
  j public.jogadores;
  x public.academia_acessos;
begin
  if not public.eh_admin() then
    raise exception 'Só o admin.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Escreva o motivo da exclusão.' using errcode = '22023';
  end if;
  select lower(email) into v_email from auth.users where id = p_user;
  if v_email is null then
    raise exception 'Conta não encontrada.' using errcode = '22023';
  end if;
  if v_email = 'guiatennis1@gmail.com' then
    raise exception 'A conta do admin não pode ser excluída.' using errcode = '22023';
  end if;
  select * into j from public.jogadores where user_id = p_user;
  select * into x from public.academia_acessos where user_id = p_user;
  v_nome := coalesce(j.nome, x.nome_responsavel);
  -- O e-mail de contato do Parceiros também fica bloqueado.
  insert into public.contas_excluidas (email, nome, tipo, motivo, avaliacoes_apagadas)
  select e, v_nome,
    case when j.user_id is not null and x.user_id is not null then 'jogador e GuiaTennis Parceiros'
         when x.user_id is not null then 'GuiaTennis Parceiros' else 'jogador' end,
    btrim(p_motivo), coalesce(p_apagar_avaliacoes, false)
  from (select distinct lower(t.e) as e from unnest(array[v_email, j.email, x.email]) as t(e) where t.e is not null and t.e <> '') m
  on conflict (email) do update
    set nome = excluded.nome, tipo = excluded.tipo, motivo = excluded.motivo,
        avaliacoes_apagadas = excluded.avaliacoes_apagadas, excluida_em = now();
  if coalesce(p_apagar_avaliacoes, false) then
    delete from public.avaliacoes where user_id = p_user;
  else
    update public.avaliacoes set user_id = null where user_id = p_user;
  end if;
  delete from auth.users where id = p_user;
end $$;

create or replace function public.contas_excluidas_admin()
returns table (email text, nome text, tipo text, motivo text, avaliacoes_apagadas boolean, excluida_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.email, c.nome, c.tipo, c.motivo, c.avaliacoes_apagadas, c.excluida_em
  from public.contas_excluidas c
  where public.eh_admin()
  order by c.excluida_em desc;
$$;

create or replace function public.liberar_email_admin(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o admin.' using errcode = '42501';
  end if;
  delete from public.contas_excluidas where email = lower(btrim(p_email));
end $$;

-- E-mail de conta excluída não cria conta de novo (nem de jogador, nem do
-- Parceiros): o cadastro inteiro volta atrás.
create or replace function public.bloquear_email_excluido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_emails text[] := array[lower(btrim(coalesce(new.email, '')))];
begin
  -- A tabela academia_acessos tem também o usuário (o e-mail do login).
  if tg_table_name = 'academia_acessos' then
    v_emails := v_emails || lower(btrim(coalesce(to_jsonb(new) ->> 'usuario', '')));
  end if;
  if exists (select 1 from public.contas_excluidas c where c.email = any (v_emails)) then
    raise exception 'Esse e-mail não pode criar conta no GuiaTennis. Fale com o GuiaTennis.' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists bloquear_email_excluido on public.jogadores;
create trigger bloquear_email_excluido
  before insert on public.jogadores
  for each row execute function public.bloquear_email_excluido();
drop trigger if exists bloquear_email_excluido on public.academia_acessos;
create trigger bloquear_email_excluido
  before insert on public.academia_acessos
  for each row execute function public.bloquear_email_excluido();

revoke all on function public.excluir_conta_admin(uuid, text, boolean) from public, anon;
grant execute on function public.excluir_conta_admin(uuid, text, boolean) to authenticated;
revoke all on function public.contas_excluidas_admin() from public, anon;
grant execute on function public.contas_excluidas_admin() to authenticated;
revoke all on function public.liberar_email_admin(text) from public, anon;
grant execute on function public.liberar_email_admin(text) to authenticated;
revoke all on function public.bloquear_email_excluido() from public, anon, authenticated;

notify pgrst, 'reload schema';
