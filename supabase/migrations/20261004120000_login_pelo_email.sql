-- ============================================================
-- Quem recebeu usuário passa a entrar pelo e-mail (pedido do Breno em 04/10/2026)
-- ============================================================
-- O acesso criado pelo GuiaTennis entra com <usuario>@acesso.guiatennis.com.br,
-- que não recebe e-mail: o "Esqueci a senha" não tinha como mandar o código.
-- Agora, quando o responsável informa o e-mail de verdade (primeiro acesso ou
-- "Editar dados"), o login da conta passa a ser esse e-mail — como o Google
-- faz quando a conta ganha um e-mail próprio. O usuário continua entrando:
-- o site pergunta ao banco qual é o login dele (login_do_usuario).
-- Não troca se o e-mail já for de outra conta. Quem já tinha feito o primeiro
-- acesso é trocado aqui mesmo.
--
-- Pode rodar de novo sem estragar nada.

create or replace function public.login_pelo_email_de_contato(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_login text;
begin
  select lower(btrim(x.email)), u.email into v_email, v_login
    from public.academia_acessos x
    join auth.users u on u.id = x.user_id
    where x.user_id = p_user;
  if v_login is null or v_login not like '%@acesso.guiatennis.com.br' then
    return false;
  end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     or v_email like '%@acesso.guiatennis.com.br' then
    return false;
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email and id <> p_user) then
    return false;
  end if;
  update auth.users set email = v_email, updated_at = now() where id = p_user;
  update auth.identities
    set identity_data = identity_data || jsonb_build_object('email', v_email), updated_at = now()
    where user_id = p_user and provider = 'email';
  return true;
end $$;

-- O e-mail de contato mudou: se a conta ainda entra pelo domínio interno,
-- passa a entrar por ele.
create or replace function public.login_segue_o_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null and new.email is distinct from coalesce(old.email, '') then
    perform public.login_pelo_email_de_contato(new.user_id);
  end if;
  return new;
end $$;

drop trigger if exists login_segue_o_email on public.academia_acessos;
create trigger login_segue_o_email
  after update of email on public.academia_acessos
  for each row execute function public.login_segue_o_email();

-- O usuário dado pelo GuiaTennis continua entrando: devolve o login atual.
create or replace function public.login_do_usuario(p_usuario text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email
  from public.academia_acessos x
  join auth.users u on u.id = x.user_id
  where btrim(coalesce(p_usuario, '')) !~ '@'
    and x.usuario = lower(btrim(p_usuario))
  limit 1;
$$;

-- Quem já fez o primeiro acesso troca agora.
select public.login_pelo_email_de_contato(x.user_id)
from public.academia_acessos x
where x.email is not null;

revoke all on function public.login_pelo_email_de_contato(uuid) from public, anon, authenticated;
revoke all on function public.login_segue_o_email() from public, anon, authenticated;
revoke all on function public.login_do_usuario(text) from public;
grant execute on function public.login_do_usuario(text) to anon, authenticated;

notify pgrst, 'reload schema';
