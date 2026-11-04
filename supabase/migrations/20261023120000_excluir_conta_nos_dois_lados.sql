-- ============================================================
-- Excluir a conta nos dois lados (pedido do Breno em 23/10/2026: "crie a
-- opção de pode excluir a conta no jogadores, deixe como algo mútuo e crie
-- esse aviso, excluir a conta dos jogadores irá excluir dos parceiros")
-- ============================================================
-- É o mesmo login no site dos jogadores e no GuiaTennis Parceiros, como a
-- Conta do Google: excluir num lugar exclui nos dois.
--   excluir_minha_conta_jogador  a conta que também administra academias
--                                sai inteira, como pelo Parceiros
--                                (excluir_minha_conta_parceiros: as
--                                academias ficam no Guia, o mais antigo da
--                                equipe vira o responsável ou a academia
--                                volta ao Básico). Antes, só a parte de
--                                jogador saía e o login ficava.
-- Pode rodar de novo sem estragar nada.

create or replace function public.excluir_minha_conta_jogador()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.academia_acessos where user_id = auth.uid()) then
    perform public.excluir_minha_conta_parceiros();
    return;
  end if;
  if not public.sou_jogador() then
    raise exception 'Essa conta não é de jogador.' using errcode = '42501';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.excluir_minha_conta_jogador() from public, anon;
grant execute on function public.excluir_minha_conta_jogador() to authenticated;

notify pgrst, 'reload schema';
