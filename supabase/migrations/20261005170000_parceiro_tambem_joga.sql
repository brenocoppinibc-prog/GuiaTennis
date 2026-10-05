-- ============================================================
-- Conta do GuiaTennis Parceiros também joga (pedido do Breno em 05/10/2026)
-- ============================================================
-- "Quando um e-mail que tem acesso ao Parceiros estiver no site dos
-- jogadores, deixar como um e-mail normal": como no Google (a conta do
-- Google Business Profile avalia outros lugares no Maps) e no Booking (o
-- dono de hotel também viaja com a mesma conta), quem administra academia
-- usa o site dos jogadores como qualquer pessoa — perfil, buscas salvas,
-- avisos por e-mail, viagem e avaliações. A única trava: não avalia a
-- academia que administra (antes, conta de academia não avaliava nenhuma).
--
--   ativar_conta_de_jogador   cria (uma vez) a parte de jogador da conta,
--                             com o nome e o e-mail do Parceiros; o site
--                             chama sozinho, sem botão
--   avaliacao_de_parceiro     barra só a academia que a conta administra
--                             (e o e-mail ou WhatsApp de quem a administra,
--                             ou o WhatsApp dela)
--   excluir_minha_conta_jogador  para quem também é do Parceiros, apaga só
--                             a parte de jogador: o login continua
-- Pode rodar de novo sem estragar nada.

create or replace function public.ativar_conta_de_jogador()
returns public.jogadores
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.jogadores;
  x public.academia_acessos;
  v_email text;
begin
  select * into j from public.jogadores where user_id = auth.uid();
  if found then
    return j;
  end if;
  select * into x from public.academia_acessos where user_id = auth.uid();
  if not found then
    raise exception 'Entre na sua conta.' using errcode = '42501';
  end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  if not public.email_valido(v_email) then
    v_email := lower(btrim(coalesce(x.email, '')));
  end if;
  insert into public.jogadores (user_id, nome, email, email_confirmado_em, termos_aceitos_em)
  values (auth.uid(),
    coalesce(nullif(btrim(x.nome_responsavel), ''), nullif(split_part(v_email, '@', 1), ''), 'Jogador'),
    v_email, x.email_confirmado_em, coalesce(x.termos_aceitos_em, now()))
  on conflict (user_id) do nothing;
  select * into j from public.jogadores where user_id = auth.uid();
  return j;
end $$;

-- Quem administra a academia não avalia ela. As outras, avalia normalmente.
create or replace function public.avaliacao_de_parceiro()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contatos text[];
  v_tels text[];
begin
  if public.eh_admin() then
    return new;
  end if;
  if exists (select 1 from public.academia_vinculos
             where user_id = auth.uid() and academia_id = new.academia_id) then
    raise exception 'Você administra essa academia: responda às avaliações pelo painel do GuiaTennis Parceiros.'
      using errcode = '42501';
  end if;
  -- O e-mail e o WhatsApp de quem avalia (o da conta e o digitado).
  select array_remove(array[lower(btrim(coalesce(new.contato_autor, ''))), lower(j.email)], ''),
         array_remove(array[public.telefone_normal(new.contato_autor)], '')
    into v_contatos, v_tels
    from (select 1) um left join public.jogadores j on j.user_id = auth.uid();
  if exists (select 1 from public.academia_vinculos m
             join public.academia_acessos x on x.user_id = m.user_id
             left join auth.users u on u.id = x.user_id
             where m.academia_id = new.academia_id
               and (lower(x.email) = any (v_contatos) or lower(u.email) = any (v_contatos)
                    or (length(public.telefone_normal(x.whatsapp)) >= 10 and public.telefone_normal(x.whatsapp) = any (v_tels))))
     or exists (select 1 from public.academias a
                where a.id = new.academia_id
                  and length(public.telefone_normal(a.phone)) >= 10
                  and public.telefone_normal(a.phone) = any (v_tels)) then
    raise exception 'Esse contato é da própria academia: quem administra a academia não avalia ela.'
      using errcode = '42501';
  end if;
  return new;
end $$;

-- Avaliar: com a conta de jogador (também a de quem é do Parceiros).
drop policy if exists "Enviar avaliacao" on public.avaliacoes;
create policy "Enviar avaliacao" on public.avaliacoes
  for insert
  with check (stars between 1 and 5
              and length(coalesce(comment, '')) <= 2000
              and public.sou_jogador());

-- Excluir a conta de jogador. Quem também é do Parceiros perde só a parte
-- de jogador (perfil, avisos, buscas salvas); o login e as academias ficam.
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
  if exists (select 1 from public.academia_acessos where user_id = auth.uid()) then
    update public.avaliacoes set user_id = null where user_id = auth.uid();
    delete from public.jogadores where user_id = auth.uid();
    return;
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.ativar_conta_de_jogador() from public, anon;
grant execute on function public.ativar_conta_de_jogador() to authenticated;
revoke all on function public.avaliacao_de_parceiro() from public, anon, authenticated;

notify pgrst, 'reload schema';
