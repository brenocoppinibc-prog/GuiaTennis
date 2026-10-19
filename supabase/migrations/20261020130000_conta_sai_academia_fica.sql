-- ============================================================
-- A conta sai, a academia fica (pedido do Breno em 19/10/2026: "eu quero
-- que o usuário consiga cancelar a conta do parceiros e jogadores, no
-- parceiros se cancelar a conta não exclui a academia e sim volta como
-- básica, tirar opções de excluir academia do site pq quero que sempre há
-- a academia que tenha informações públicas")
-- ============================================================
-- Como o Google Business Profile e o Yelp: a ficha pública da academia não
-- some quando quem a administra vai embora.
--   soltar_academias_da_conta     na academia de que a conta era a
--                                 responsável principal: com outro acesso,
--                                 a pessoa mais antiga da equipe vira a
--                                 responsável principal e o plano continua,
--                                 agora em nome dela, que recebe um e-mail
--                                 ("o responsável exclui, vai para o outro
--                                 acesso e será cobrado dela"); sem outro
--                                 acesso, a academia volta ao Básico e fica
--                                 sem responsável.
--   excluir_minha_conta_parceiros a própria conta do Parceiros se exclui
--                                 (com a parte de jogador, que é o mesmo
--                                 login). As avaliações ficam, com o nome.
--                                 O e-mail não fica bloqueado.
--   excluir_conta_admin           também solta as academias do mesmo jeito.
--   "Admin exclui academias"      só o cadastro em análise (que ainda não
--                                 apareceu no site); a ficha publicada não
--                                 se apaga pelo site.
--   pedir_para_sair_do_guia e     fechados: o pedido para tirar do guia
--   resolver_pedido_para_sair     saiu do site; os abertos ficam
--                                 "cancelado".
-- Pode rodar de novo sem estragar nada.

create or replace function public.soltar_academias_da_conta(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia uuid;
  v_novo uuid;
  v_nome text;
  v_plano text;
  v_quem text := coalesce((select nullif(btrim(nome_responsavel), '') from public.academia_acessos where user_id = p_user), 'O responsável principal');
  v_link text;
  v_parar text;
  v_corpo text;
  r record;
begin
  for v_academia in
    select academia_id from public.academia_vinculos where user_id = p_user and papel = 'principal'
  loop
    delete from public.academia_vinculos where user_id = p_user and academia_id = v_academia;
    -- Outro responsável principal já cuida da academia: nada muda.
    continue when exists (select 1 from public.academia_vinculos where academia_id = v_academia and papel = 'principal');
    select name, coalesce(plano, 'basico') into v_nome, v_plano from public.academias where id = v_academia;
    select user_id into v_novo from public.academia_vinculos
      where academia_id = v_academia order by created_at, user_id limit 1;
    if v_novo is null then
      -- Ninguém mais administra: a ficha fica no guia, no Básico.
      perform set_config('guiatennis.plano_da_academia', v_academia::text, true);
      update public.academias set plano = 'basico' where id = v_academia and coalesce(plano, 'basico') <> 'basico';
      perform set_config('guiatennis.plano_da_academia', '', true);
      delete from public.pedidos_de_plano where academia_id = v_academia;
      continue;
    end if;
    update public.academia_vinculos set papel = 'principal' where academia_id = v_academia and user_id = v_novo;
    -- O e-mail para quem passa a responder pela academia (e pelo plano).
    v_link := public.site_dos_emails() || '/parceiros/plano?abrir=' || right(replace(v_academia::text, '-', ''), 8)
      || '&utm_source=Email-responsavel';
    for r in select q.email, q.token_avisos from public.quem_recebe_da_academia(v_academia) q where q.user_id = v_novo loop
      v_parar := public.link_parar_avisos(r.token_avisos, 'parceiros');
      v_corpo := public.email_p(public.html_texto(v_quem) || ' excluiu a conta do GuiaTennis Parceiros. Agora você é o(a) <strong>responsável principal</strong> da <strong>'
          || public.html_texto(v_nome) || '</strong>: decide o plano e quem tem acesso.')
        || public.email_p(case when v_plano = 'basico' then 'A academia está no plano Básico, que é grátis.'
             else 'O plano <strong>' || public.html_texto(public.nome_do_plano(v_plano)) || '</strong> continua, agora em seu nome. Se não quiser mantê-lo, mude o plano em <strong>Plano</strong>.' end);
      perform public.por_na_fila(
        'novo-responsavel:' || v_academia || ':' || v_novo || ':' || public.hoje_em_brasilia()::text, 'novo_responsavel', r.email,
        'Agora você é o(a) responsável pela ' || v_nome,
        public.email_montado('Você é o(a) responsável principal', v_corpo, 'Ver o plano', v_link,
          'Você recebe este e-mail porque administra a ' || public.html_texto(v_nome)
          || ' no GuiaTennis Parceiros. <a href="' || public.html_texto(v_parar)
          || '" style="color:#6B6458">Não quero mais receber avisos por e-mail</a>.'),
        v_quem || ' excluiu a conta do GuiaTennis Parceiros. Agora você é o(a) responsável principal da ' || v_nome
          || ': decide o plano e quem tem acesso.' || E'\n\n'
          || case when v_plano = 'basico' then 'A academia está no plano Básico, que é grátis.'
             else 'O plano ' || public.nome_do_plano(v_plano) || ' continua, agora em seu nome. Se não quiser mantê-lo, mude o plano em Plano: ' || v_link end
          || E'\n\nNão quer mais receber avisos por e-mail? ' || v_parar,
        v_parar);
    end loop;
  end loop;
end $$;

create or replace function public.excluir_minha_conta_parceiros()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists (select 1 from public.academia_acessos where user_id = v_uid) then
    raise exception 'Essa conta não é do GuiaTennis Parceiros.' using errcode = '42501';
  end if;
  if (select lower(email) from auth.users where id = v_uid) = 'guiatennis1@gmail.com' then
    raise exception 'A conta do admin não pode ser excluída.' using errcode = '22023';
  end if;
  perform public.soltar_academias_da_conta(v_uid);
  update public.avaliacoes set user_id = null where user_id = v_uid;
  delete from auth.users where id = v_uid;
end $$;

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
  perform public.soltar_academias_da_conta(p_user);
  if coalesce(p_apagar_avaliacoes, false) then
    delete from public.avaliacoes where user_id = p_user;
  else
    update public.avaliacoes set user_id = null where user_id = p_user;
  end if;
  delete from auth.users where id = p_user;
end $$;

-- A ficha publicada não se apaga pelo site: o admin só recusa o cadastro
-- que ainda está em análise.
drop policy if exists "Admin exclui academias" on public.academias;
create policy "Admin exclui academias" on public.academias
  for delete
  using ((auth.jwt() ->> 'email') = 'guiatennis1@gmail.com' and status = 'pending');

-- O pedido para tirar do guia saiu do site.
update public.pedidos_para_sair set resolvido_em = now(), resolucao = 'cancelado'
  where resolvido_em is null;
revoke all on function public.pedir_para_sair_do_guia(uuid, text, text) from public, anon, authenticated;
revoke all on function public.resolver_pedido_para_sair(uuid, boolean, text) from public, anon, authenticated;

revoke all on function public.soltar_academias_da_conta(uuid) from public, anon, authenticated;
revoke all on function public.excluir_minha_conta_parceiros() from public, anon;
grant execute on function public.excluir_minha_conta_parceiros() to authenticated;
revoke all on function public.excluir_conta_admin(uuid, text, boolean) from public, anon;
grant execute on function public.excluir_conta_admin(uuid, text, boolean) to authenticated;

notify pgrst, 'reload schema';
