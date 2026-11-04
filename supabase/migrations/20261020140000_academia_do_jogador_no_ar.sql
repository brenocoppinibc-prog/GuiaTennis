-- ============================================================
-- Conta com o e-mail confirmado publica a academia nova direto (pedido do
-- Breno em 19/10/2026: "acessos que já tem o email confirmado, é autorizado
-- publicar academia direto no site, sem minha autorização mas aparecer para
-- mim só para checar mesmo")
-- ============================================================
-- A conta do Parceiros já fazia isso (regra 60, SQL 20261006140000). Agora
-- a conta de jogador com o e-mail confirmado também: a academia que ela
-- manda vai ao ar na hora, como ficha básica (sem "confirmada pela
-- academia" e sem responsável, porque o jogador não declara representar a
-- academia), como o "Adicionar um lugar" do Google Maps. O admin recebe o
-- e-mail "Academia nova no ar" e a vê em Pendências › "Foram ao ar
-- sozinhas: revise", só para checar. Visitante sem conta e jogador sem o
-- e-mail confirmado continuam esperando a aprovação.
--   pedido_da_academia_nova      o caminho do jogador.
--   aviso_de_academia_no_ar      diz quem mandou (jogador ou responsável) e
--                                "pause ou corrija" (a ficha publicada não
--                                se apaga mais, regra 121).
--   academias_para_revisar_admin quem mandou também quando é jogador.
-- Pode rodar de novo sem estragar nada.

create or replace function public.aviso_de_academia_no_ar(p_academia uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  x public.academia_acessos;
  j public.jogadores;
  cfg record;
  v_lugar text;
  v_link text;
  v_quem text;
  v_email text;
  v_como text;
begin
  select * into a from public.academias where id = p_academia;
  select * into x from public.academia_acessos where user_id = p_user;
  select * into j from public.jogadores where user_id = p_user;
  select * into cfg from public.emails_configuracao where id;
  v_lugar := concat_ws(', ', nullif(a.bairro, ''), nullif(a.cidade, ''));
  v_link := public.site_dos_emails() || '/admin/pendencias';
  v_quem := coalesce(x.nome_responsavel, j.nome, x.email, j.email, 'Uma conta');
  v_email := coalesce(x.email, x.usuario, j.email, '');
  v_como := case when x.user_id is not null then ', e declarou estar autorizado(a) pela academia. Ela já está no site.'
                 else ' pela conta de jogador, com o e-mail confirmado. Ela já está no site, como ficha básica, sem responsável.' end;
  perform public.por_na_fila(
    'no-ar:' || p_academia, 'academia_no_ar', coalesce(cfg.admin, 'guiatennis1@gmail.com'),
    'Academia nova no ar: ' || a.name,
    public.email_montado('Academia nova no ar',
      public.email_p('<strong>' || public.html_texto(v_quem) || '</strong>'
        || case when v_email <> '' then ' (' || public.html_texto(v_email) || ')' else '' end
        || ' cadastrou a <strong>' || public.html_texto(a.name) || '</strong>'
        || case when v_lugar <> '' then ', em ' || public.html_texto(v_lugar) else '' end
        || public.html_texto(v_como))
      || public.email_p('Confira no painel do admin, em <strong>Pendências</strong>: se algo estiver errado, pause ou corrija a ficha.'),
      'Abrir o painel', v_link, 'Aviso automático do GuiaTennis.'),
    v_quem || case when v_email <> '' then ' (' || v_email || ')' else '' end
      || ' cadastrou a ' || a.name
      || case when v_lugar <> '' then ', em ' || v_lugar else '' end
      || v_como
      || E'\n\nConfira no painel do admin: ' || v_link);
exception when others then
  raise warning 'aviso de academia no ar: %', sqlerrm;
end $$;

create or replace function public.pedido_da_academia_nova()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  x public.academia_acessos;
  j public.jogadores;
begin
  if auth.uid() is null or public.eh_admin() then
    return new;
  end if;
  select * into x from public.academia_acessos where user_id = auth.uid();
  if not found then
    -- Conta de jogador com o e-mail confirmado: no ar na hora, como ficha
    -- básica, sem responsável.
    select * into j from public.jogadores where user_id = auth.uid();
    if found and new.status = 'pending' and j.email_confirmado_em is not null then
      perform set_config('guiatennis.academia_nova_no_ar', new.id::text, true);
      update public.academias
        set status = 'published', revisar_desde = now(),
            nome_solicitante = coalesce(nullif(btrim(nome_solicitante), ''), j.nome),
            contato_solicitante = coalesce(nullif(btrim(contato_solicitante), ''), j.email)
        where id = new.id;
      perform set_config('guiatennis.academia_nova_no_ar', '', true);
      perform public.aviso_de_academia_no_ar(new.id, auth.uid());
    end if;
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

-- Quem mandou: o responsável (com a declaração) ou, sem responsável, quem
-- cadastrou pela conta de jogador.
create or replace function public.academias_para_revisar_admin()
returns table (id uuid, nome text, bairro text, cidade text, no_ar_desde timestamptz,
  quem text, email text, whatsapp text, declarou_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.name, a.bairro, a.cidade, a.revisar_desde,
    coalesce(x.nome_responsavel, a.nome_solicitante),
    coalesce(x.email, x.usuario, a.contato_solicitante), x.whatsapp, v.declarou_em
  from public.academias a
  left join public.academia_vinculos v on v.academia_id = a.id and v.papel = 'principal'
  left join public.academia_acessos x on x.user_id = v.user_id
  where public.eh_admin() and a.revisar_desde is not null
  order by a.revisar_desde desc;
$$;

revoke all on function public.pedido_da_academia_nova() from public, anon, authenticated;
revoke all on function public.aviso_de_academia_no_ar(uuid, uuid) from public, anon, authenticated;
revoke all on function public.academias_para_revisar_admin() from public, anon;
grant execute on function public.academias_para_revisar_admin() to authenticated;

notify pgrst, 'reload schema';
