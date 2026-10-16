-- ============================================================
-- Declaração de quem pede uma academia (pedido do Breno em 06/10/2026)
-- ============================================================
-- "Isso de a pessoa confirmar que se responsabiliza… coloque com aquele
-- quadradinho, igual 'eu li e concordo'": no GuiaTennis Parceiros, pedir
-- para administrar uma academia (ou cadastrar uma nova) só vai com a
-- caixinha "Declaro que estou autorizado(a) pela academia… e que respondo
-- pelas informações que publicar" marcada. O banco guarda quando ela foi
-- marcada — é a prova da declaração, como o aceite dos Termos.
--
--   pedidos_de_acesso.declarou_em   quando a pessoa marcou a declaração
--   pedir_para_administrar(p_academia, p_declaro)
--       p_declaro = true  → guarda a hora
--       p_declaro = false → recusa ("Marque a declaração…")
--       sem p_declaro     → o site antigo, nos minutos da publicação: pede
--                           como antes, sem a hora
--   pedido_da_academia_nova   academia nova da conta: o formulário só
--                             envia com a caixinha marcada, então guarda a hora
--
-- A confirmação da academia continua igual (código no WhatsApp da ficha ou
-- o responsável aceitar; academia nova, o GuiaTennis publica).
-- Pode rodar de novo sem estragar nada.

alter table public.pedidos_de_acesso add column if not exists declarou_em timestamptz;

drop function if exists public.pedir_para_administrar(uuid);
create or replace function public.pedir_para_administrar(p_academia uuid, p_declaro boolean default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text;
begin
  if not exists (select 1 from public.academia_acessos where user_id = auth.uid()) then
    raise exception 'Entre na sua conta do GuiaTennis Parceiros.' using errcode = '42501';
  end if;
  if p_declaro is false then
    raise exception 'Marque a declaração para pedir.' using errcode = '22023';
  end if;
  if exists (select 1 from public.academia_vinculos
             where user_id = auth.uid() and academia_id = p_academia) then
    raise exception 'A sua conta já administra essa academia.' using errcode = '22023';
  end if;
  select name into v_nome from public.academias
    where id = p_academia and status = 'published';
  if v_nome is null then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if (select count(*) from public.pedidos_de_acesso
      where user_id = auth.uid() and academia_id <> p_academia) >= 10 then
    raise exception 'A sua conta já tem 10 pedidos abertos. Espere algum ser confirmado ou cancele um.' using errcode = '22023';
  end if;
  insert into public.pedidos_de_acesso (user_id, academia_id, nome, destino, pedido_em, declarou_em)
  values (auth.uid(), p_academia, v_nome,
    case when exists (select 1 from public.academia_vinculos y
                      where y.academia_id = p_academia and y.papel = 'principal')
         then 'responsavel' else 'guiatennis' end,
    now(), case when p_declaro then now() end)
  on conflict (user_id, academia_id) do update
    set nome = excluded.nome, destino = excluded.destino, pedido_em = now(),
        declarou_em = coalesce(excluded.declarou_em, public.pedidos_de_acesso.declarou_em);
  update public.academia_acessos set updated_at = now() where user_id = auth.uid();
end $$;

revoke all on function public.pedir_para_administrar(uuid, boolean) from public, anon;
grant execute on function public.pedir_para_administrar(uuid, boolean) to authenticated;

create or replace function public.pedido_da_academia_nova()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.eh_admin()
     and exists (select 1 from public.academia_acessos where user_id = auth.uid()) then
    insert into public.pedidos_de_acesso (user_id, academia_id, nome, destino, pedido_em, declarou_em)
    values (auth.uid(), new.id, new.name, 'guiatennis', now(), now())
    on conflict (user_id, academia_id) do update
      set nome = excluded.nome, pedido_em = now(), declarou_em = now();
  end if;
  return new;
end $$;

notify pgrst, 'reload schema';
