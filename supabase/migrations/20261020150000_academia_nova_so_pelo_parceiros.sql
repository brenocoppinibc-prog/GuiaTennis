-- ============================================================
-- Academia nova direto no ar só pela conta do Parceiros (19/10/2026, o
-- Breno: "como assim jogador cadastrar academia?")
-- ============================================================
-- O SQL 20261020140000 deixou a conta de jogador com o e-mail confirmado
-- publicar academia nova na hora. Não era o pedido: no site dos jogadores
-- não há cadastro de academia, e "acessos com o e-mail confirmado" são as
-- contas do GuiaTennis Parceiros, que já publicavam na hora (regra 60).
-- Volta o gatilho de antes: só a conta do Parceiros publica na hora; o resto
-- espera a aprovação. Ficam do 20261020140000 o e-mail "Academia nova no
-- ar" com "pause ou corrija" e a lista "Foram ao ar sozinhas: revise".
-- Pode rodar de novo sem estragar nada.

create or replace function public.pedido_da_academia_nova()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  x public.academia_acessos;
begin
  if auth.uid() is null or public.eh_admin() then
    return new;
  end if;
  select * into x from public.academia_acessos where user_id = auth.uid();
  if not found then
    return new;
  end if;
  if new.status = 'pending' and x.email_confirmado_em is not null and x.dados_completos_em is not null then
    perform set_config('guiatennis.academia_nova_no_ar', new.id::text, true);
    update public.academias
      set status = 'published', confirmada = true, revisar_desde = now()
      where id = new.id;
    perform set_config('guiatennis.academia_nova_no_ar', '', true);
    perform public.ligar_conta_a_academia(auth.uid(), new.id, true);
    update public.academia_vinculos set declarou_em = coalesce(declarou_em, now())
      where user_id = auth.uid() and academia_id = new.id;
    perform public.aviso_de_academia_no_ar(new.id, auth.uid());
  else
    insert into public.pedidos_de_acesso (user_id, academia_id, nome, destino, pedido_em, declarou_em)
    values (auth.uid(), new.id, new.name, 'guiatennis', now(), now())
    on conflict (user_id, academia_id) do update
      set nome = excluded.nome, pedido_em = now(), declarou_em = now();
  end if;
  return new;
end $$;


revoke all on function public.pedido_da_academia_nova() from public, anon, authenticated;

notify pgrst, 'reload schema';
