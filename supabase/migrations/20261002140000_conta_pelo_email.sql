-- ============================================================
-- Um lugar só para o e-mail (pedido do Breno em 02/10/2026)
-- ============================================================
-- Como Booking, Airbnb e Google: a pessoa digita o e-mail e o site diz se
-- ela já tem conta (vai para a senha) ou não (completa o cadastro). Vale
-- para o jogador e para o GuiaTennis Parceiros.
-- Devolve o tipo da conta e o e-mail de entrar, ou nada.
-- Pode rodar de novo sem estragar nada.

create or replace function public.conta_do_email(p_email text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_login text;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return null;
  end if;
  if v_email = 'guiatennis1@gmail.com' then
    return jsonb_build_object('tipo', 'admin', 'login', v_email);
  end if;
  v_login := public.login_do_email(v_email);
  if v_login is not null then
    return jsonb_build_object('tipo', 'academia', 'login', v_login);
  end if;
  if exists (select 1 from public.jogadores where lower(email) = v_email) then
    return jsonb_build_object('tipo', 'jogador', 'login', v_email);
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    return jsonb_build_object('tipo', 'outra', 'login', v_email);
  end if;
  return null;
end $$;

revoke all on function public.conta_do_email(text) from public;
grant execute on function public.conta_do_email(text) to anon, authenticated;

notify pgrst, 'reload schema';
