-- ============================================================
-- Academia nova da conta vai ao ar sozinha (pedido do Breno em 06/10/2026)
-- ============================================================
-- O Breno escolheu: academia NOVA cadastrada por uma conta do GuiaTennis
-- Parceiros com o e-mail confirmado (e a declaração marcada, que o site
-- exige) entra no ar na hora, e o admin revisa depois no painel — como o
-- Google Maps faz com lugar novo. Academia que JÁ está no guia continua
-- pedindo a confirmação (código no WhatsApp da ficha ou o responsável
-- aceitar): sem isso, qualquer pessoa tomaria a ficha de outra academia.
--
--   academias.revisar_desde          foi ao ar sozinha e o admin ainda não
--                                    revisou (só o admin vê, pela função)
--   academia_vinculos.declarou_em    a hora da declaração fica com quem
--                                    administra (antes ia embora com o pedido)
--   pedido_da_academia_nova()        publica, liga a conta como responsável
--                                    e avisa o admin por e-mail; sem e-mail
--                                    confirmado, ou com 3 academias novas em
--                                    24 horas, vira pedido como antes
--   academias_para_revisar_admin()   a lista do painel do admin
--   marcar_academia_revisada(id)     tira da lista
--
-- A ficha entra como confirmada (quem preencheu foi a própria academia),
-- no plano Básico. Pode rodar de novo sem estragar nada.

alter table public.academias add column if not exists revisar_desde timestamptz;
alter table public.academia_vinculos add column if not exists declarou_em timestamptz;

-- Liga a conta à academia (igual a antes) e guarda a hora da declaração do
-- pedido no vínculo, antes de o pedido sair.
create or replace function public.ligar_conta_a_academia(
  p_user uuid, p_academia uuid, p_abrir boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_papel text;
begin
  insert into public.academia_vinculos (user_id, academia_id, papel)
  values (p_user, p_academia,
    case when exists (select 1 from public.academia_vinculos y
                      where y.academia_id = p_academia and y.papel = 'principal')
         then 'equipe' else 'principal' end)
  on conflict (user_id, academia_id) do nothing;
  update public.academia_vinculos v
    set declarou_em = coalesce(v.declarou_em, p.declarou_em)
    from public.pedidos_de_acesso p
    where p.user_id = p_user and p.academia_id = p_academia
      and v.user_id = p_user and v.academia_id = p_academia;
  select papel into v_papel from public.academia_vinculos
    where user_id = p_user and academia_id = p_academia;
  update public.academia_acessos
    set academia_id = case when p_abrir or academia_id is null then p_academia else academia_id end,
        papel = case when p_abrir or academia_id is null then v_papel else papel end,
        updated_at = now()
    where user_id = p_user;
  delete from public.pedidos_de_acesso where user_id = p_user and academia_id = p_academia;
  delete from public.codigos_de_verificacao where user_id = p_user and academia_id = p_academia;
end $$;

-- O gatilho que protege a ficha (igual ao do SQL 20261005130000) deixa
-- passar a publicação feita pela função abaixo, só para a academia dela.
create or replace function public.proteger_ficha_da_academia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pausa boolean := coalesce(current_setting('guiatennis.pausa_da_academia', true), '') = 'sim';
  v_no_ar boolean := coalesce(current_setting('guiatennis.academia_nova_no_ar', true), '') = old.id::text;
  v_linha public.academias;
begin
  if v_no_ar then
    return new;
  end if;
  if v_pausa then
    v_linha := old;
    v_linha.pausada := new.pausada;
    v_linha.pausada_ate := new.pausada_ate;
    v_linha.pausada_pela_academia := new.pausada_pela_academia;
    return v_linha;
  end if;
  if auth.uid() is null or public.eh_admin() then
    if new.pausada is distinct from old.pausada or new.pausada_ate is distinct from old.pausada_ate then
      new.pausada_pela_academia := false;
    end if;
    return new;
  end if;
  new.id := old.id;
  new.created_at := old.created_at;
  new.status := old.status;
  new.pago := old.pago;
  new.plano := old.plano;
  new.pausada := old.pausada;
  new.pausada_ate := old.pausada_ate;
  new.pausada_pela_academia := old.pausada_pela_academia;
  new.source := old.source;
  new.nome_solicitante := old.nome_solicitante;
  new.contato_solicitante := old.contato_solicitante;
  new.revisar_desde := old.revisar_desde;
  new.confirmada := true;
  update public.academia_vinculos
    set ficha_atualizada_em = now()
    where user_id = auth.uid() and academia_id = new.id;
  update public.academia_acessos
    set ficha_atualizada_em = now()
    where user_id = auth.uid() and academia_id = new.id;
  return new;
end $$;

-- O e-mail para o admin: academia nova já no ar, para revisar.
create or replace function public.aviso_de_academia_no_ar(p_academia uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  x public.academia_acessos;
  cfg record;
  v_lugar text;
  v_link text;
begin
  select * into a from public.academias where id = p_academia;
  select * into x from public.academia_acessos where user_id = p_user;
  select * into cfg from public.emails_configuracao where id;
  v_lugar := concat_ws(', ', nullif(a.bairro, ''), nullif(a.cidade, ''));
  v_link := public.site_dos_emails() || '/admin/pendencias';
  perform public.por_na_fila(
    'no-ar:' || p_academia, 'academia_no_ar', coalesce(cfg.admin, 'guiatennis1@gmail.com'),
    'Academia nova no ar: ' || a.name,
    public.email_montado('Academia nova no ar',
      public.email_p('<strong>' || public.html_texto(coalesce(x.nome_responsavel, x.email)) || '</strong>'
        || ' (' || public.html_texto(coalesce(x.email, x.usuario)) || ') cadastrou a <strong>' || public.html_texto(a.name) || '</strong>'
        || case when v_lugar <> '' then ', em ' || public.html_texto(v_lugar) else '' end
        || ', e declarou estar autorizado(a) pela academia. Ela já está no site.')
      || public.email_p('Confira no painel do admin, em <strong>Pendências</strong>: se algo estiver errado, pause ou exclua a ficha.'),
      'Abrir o painel', v_link, 'Aviso automático do GuiaTennis Parceiros.'),
    coalesce(x.nome_responsavel, x.email) || ' cadastrou a ' || a.name
      || case when v_lugar <> '' then ', em ' || v_lugar else '' end
      || ', e declarou estar autorizado(a) pela academia. Ela já está no site.'
      || E'\n\nConfira no painel do admin: ' || v_link);
exception when others then
  raise warning 'aviso de academia no ar: %', sqlerrm;
end $$;

-- Academia nova mandada por uma conta: no ar na hora (e-mail confirmado,
-- até 3 academias novas em 24 horas), ou um pedido como antes.
create or replace function public.pedido_da_academia_nova()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  x public.academia_acessos;
  v_novas int;
begin
  if auth.uid() is null or public.eh_admin() then
    return new;
  end if;
  select * into x from public.academia_acessos where user_id = auth.uid();
  if not found then
    return new;
  end if;
  select count(*) into v_novas
    from public.academia_vinculos v join public.academias a on a.id = v.academia_id
    where v.user_id = auth.uid() and a.id <> new.id and a.created_at > now() - interval '1 day';
  if new.status = 'pending' and x.email_confirmado_em is not null and x.dados_completos_em is not null and v_novas < 3 then
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

-- Painel do admin: as academias que foram ao ar sozinhas e ainda esperam a
-- revisão, com quem cadastrou.
create or replace function public.academias_para_revisar_admin()
returns table (id uuid, nome text, bairro text, cidade text, no_ar_desde timestamptz,
  quem text, email text, whatsapp text, declarou_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.name, a.bairro, a.cidade, a.revisar_desde,
    x.nome_responsavel, coalesce(x.email, x.usuario), x.whatsapp, v.declarou_em
  from public.academias a
  left join public.academia_vinculos v on v.academia_id = a.id and v.papel = 'principal'
  left join public.academia_acessos x on x.user_id = v.user_id
  where public.eh_admin() and a.revisar_desde is not null
  order by a.revisar_desde desc;
$$;

create or replace function public.marcar_academia_revisada(p_academia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o admin.' using errcode = '42501';
  end if;
  update public.academias set revisar_desde = null where id = p_academia;
end $$;

revoke all on function public.ligar_conta_a_academia(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.pedido_da_academia_nova() from public, anon, authenticated;
revoke all on function public.aviso_de_academia_no_ar(uuid, uuid) from public, anon, authenticated;
revoke all on function public.academias_para_revisar_admin() from public, anon;
grant execute on function public.academias_para_revisar_admin() to authenticated;
revoke all on function public.marcar_academia_revisada(uuid) from public, anon;
grant execute on function public.marcar_academia_revisada(uuid) to authenticated;

notify pgrst, 'reload schema';
