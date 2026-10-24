-- ============================================================
-- E-mail confirmado por código (pedido do Breno em 02/10/2026)
-- ============================================================
-- Como o Google e o trivago: depois de criar a conta, o GuiaTennis manda um
-- código de 6 números para o e-mail; quem digita o código prova que o
-- e-mail existe e é dela. O mesmo código serve para o "Esqueci a senha".
-- Quem manda o e-mail é o login do Supabase (com o serviço de e-mail ligado
-- no painel — ver GUIATENNIS-CONTEXTO.md, seção 11). O banco só anota
-- quando a pessoa confirmou, e só aceita a anotação de quem entrou pelo
-- código (o login por código marca "otp" no token).
-- Pode rodar de novo sem estragar nada.

alter table public.jogadores add column if not exists email_confirmado_em timestamptz;
alter table public.academia_acessos add column if not exists email_confirmado_em timestamptz;

create or replace function public.confirmar_meu_email()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta.' using errcode = '42501';
  end if;
  if not coalesce((auth.jwt() -> 'amr') @> '[{"method": "otp"}]'::jsonb, false) then
    raise exception 'Confirme o e-mail pelo código.' using errcode = '42501';
  end if;
  update public.jogadores set email_confirmado_em = coalesce(email_confirmado_em, now())
    where user_id = auth.uid();
  update public.academia_acessos set email_confirmado_em = coalesce(email_confirmado_em, now())
    where user_id = auth.uid();
end $$;

revoke all on function public.confirmar_meu_email() from public, anon;
grant execute on function public.confirmar_meu_email() to authenticated;

notify pgrst, 'reload schema';
