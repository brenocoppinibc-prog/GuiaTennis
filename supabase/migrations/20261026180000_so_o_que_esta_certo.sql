-- ============================================================
-- A ficha só mostra o que está certo (pedido do Breno em 26/10/2026: "não
-- acho legal aparecer publicamente whatsapp em confirmação, algum grande faz
-- isso? mas ainda sim se colocar um número falso, verificado, não pode dar
-- erro? quando uma academia avisar que ele fechou, pausar no site, os
-- jogadores não querem ver academia fechada; eu quero ter um controle para
-- se manter os dados atualizados, algo há 3 meses e aparecer no meu perfil")
-- ============================================================
-- 1. Nada de "em confirmação" na ficha. O Google Business Profile só mostra
--    o telefone depois de aprovado e não anuncia o que está em análise; o
--    Booking e o Airbnb, idem. O visitante não sabe que há um número
--    esperando: sai a coluna calculada whatsapp_situacao (SQL
--    20261026120000), que ele lia.
-- 2. Todo número novo passa pelo GuiaTennis. O código prova que a pessoa tem
--    o número, não que ele é da academia: quem cadastra uma academia (ou
--    assume uma ficha sem responsável) com o próprio celular passaria no
--    código. Antes, só a troca esperava o admin; agora o primeiro número
--    também ('revisao'), como o Google revisa o perfil novo antes de mostrar
--    o telefone.
-- 3. A academia que avisou que fechou sai do site na hora: fica pausada
--    pelo GuiaTennis enquanto o admin confere, como o Booking fecha o
--    anúncio para reservas (o jogador não vê academia fechada). "Continua
--    aberta", ou o aviso cancelado, devolve a pausa de antes, guardada no
--    próprio aviso (pedidos_para_sair.pausa_antes). Enquanto isso, a
--    academia não pausa nem volta sozinha.
-- 4. O controle das fichas paradas, no admin: fichas_paradas_admin (no ar e
--    sem mudar há 3 meses, com o último lembrete e a última conferência do
--    GuiaTennis), lembrar_ficha_admin (o e-mail "Está tudo certo na
--    ficha?", agora) e ficha_conferida_admin ("Conferi: está certo": sai da
--    lista por 3 meses, sem mudar a data que o jogador vê, que é a da
--    academia).
-- Pode rodar de novo sem estragar nada.

-- 1. O visitante não lê mais a situação do WhatsApp ------------------------
alter table public.academias drop column if exists whatsapp_situacao;

-- 2. O código certo leva sempre à conferência do GuiaTennis -----------------
-- Também 'errado', 'tentativas', 'venceu', 'sem_codigo' e 'sem_numero'.
create or replace function public.confirmar_whatsapp_da_ficha(p_academia uuid, p_codigo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  k public.codigos_do_whatsapp;
  v_codigo text := regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g');
  v_troca boolean;
begin
  if not public.administro_a_academia(p_academia) then
    raise exception 'Só quem administra a academia confirma o WhatsApp.' using errcode = '42501';
  end if;
  select * into a from public.academias where id = p_academia;
  if a.whatsapp_a_confirmar is null then
    return 'sem_numero';
  end if;
  if a.whatsapp_codigo_ok_em is not null then
    return 'revisao';
  end if;
  select * into k from public.codigos_do_whatsapp where academia_id = p_academia;
  if not found or not public.mesmo_whatsapp(k.numero, a.whatsapp_a_confirmar) then
    return 'sem_codigo';
  end if;
  if k.criado_em < now() - interval '72 hours' then
    return 'venceu';
  end if;
  if k.tentativas >= 5 then
    return 'tentativas';
  end if;
  if length(v_codigo) <> 6 or extensions.crypt(v_codigo, k.codigo_hash) <> k.codigo_hash then
    update public.codigos_do_whatsapp set tentativas = tentativas + 1 where academia_id = p_academia;
    return 'errado';
  end if;
  perform set_config('guiatennis.mudanca_do_guia', p_academia::text, true);
  update public.academias set whatsapp_codigo_ok_em = now() where id = p_academia;
  perform set_config('guiatennis.mudanca_do_guia', '', true);
  delete from public.codigos_do_whatsapp where academia_id = p_academia;
  v_troca := a.whatsapp_antes is not null;
  perform public.aviso_ao_admin('whatsapp-aprovar:' || p_academia || ':' || coalesce(public.numero_do_whatsapp(a.whatsapp_a_confirmar), ''),
    'whatsapp_para_aprovar',
    case when v_troca then 'Troca de WhatsApp para aprovar: ' else 'WhatsApp para aprovar: ' end || a.name,
    case when v_troca then 'Troca de WhatsApp para aprovar' else 'WhatsApp para aprovar' end,
    public.email_p('Alguém da <strong>' || public.html_texto(a.name) || '</strong> digitou o código mandado ao WhatsApp <strong>'
      || public.html_texto(a.whatsapp_a_confirmar) || '</strong>, que vai '
      || case when v_troca then 'substituir o ' || public.html_texto(a.whatsapp_antes) || ' na ficha.'
              else 'entrar na ficha (hoje ela está sem WhatsApp).' end)
    || public.email_p('O código mostra que a pessoa tem o número, não que ele é da academia. Confira (Google, Instagram, site, a Receita em <strong>Conferir</strong>) e responda em <strong>Pendências</strong>: aprovar ou recusar. Até lá, '
      || case when v_troca then 'a ficha continua com o número de antes.' else 'a ficha fica sem o botão do WhatsApp.' end),
    'Alguém da ' || a.name || ' digitou o código mandado ao WhatsApp ' || a.whatsapp_a_confirmar || ', que vai '
      || case when v_troca then 'substituir o ' || a.whatsapp_antes || ' na ficha.' else 'entrar na ficha (hoje ela está sem WhatsApp).' end
      || E'\n\nConfira e responda em Pendências: aprovar ou recusar.');
  return 'revisao';
end $$;

-- 3. A academia que avisou que fechou sai do site na hora --------------------
alter table public.pedidos_para_sair add column if not exists pausa_antes jsonb;

-- O aviso aberto por quem administra (não o do admin, que tira na hora)
-- pausa a ficha; quando ele fecha sem tirar a academia, a pausa de antes
-- volta. Só a data muda quando a data muda.
create or replace function public.sincronizar_aviso_de_fechou()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia uuid := coalesce(case when tg_op <> 'DELETE' then new.academia_id end, old.academia_id);
  v_desde timestamptz;
  v_antes jsonb;
  a public.academias;
begin
  if v_academia is null then
    return null;
  end if;
  select min(pedido_em) into v_desde from public.pedidos_para_sair
    where academia_id = v_academia and resolvido_em is null and user_id is not null;
  select * into a from public.academias where id = v_academia;
  if not found or a.avisou_que_fechou_em is not distinct from v_desde then
    return null;
  end if;
  perform set_config('guiatennis.mudanca_do_guia', v_academia::text, true);
  if a.avisou_que_fechou_em is null then
    update public.academias
      set avisou_que_fechou_em = v_desde, pausada = true, pausada_ate = null, pausada_pela_academia = false
      where id = v_academia;
    update public.pedidos_para_sair
      set pausa_antes = jsonb_build_object('pausada', coalesce(a.pausada, false), 'ate', a.pausada_ate,
                                           'pela_academia', coalesce(a.pausada_pela_academia, false))
      where academia_id = v_academia and resolvido_em is null and user_id is not null and pausa_antes is null;
  elsif v_desde is null then
    v_antes := case when tg_op <> 'DELETE' then new.pausa_antes else old.pausa_antes end;
    update public.academias
      set avisou_que_fechou_em = null,
          pausada = case when v_antes is null then pausada else coalesce((v_antes->>'pausada')::boolean, false) end,
          pausada_ate = case when v_antes is null then pausada_ate else (v_antes->>'ate')::timestamptz end,
          pausada_pela_academia = case when v_antes is null then pausada_pela_academia
                                       else coalesce((v_antes->>'pela_academia')::boolean, false) end
      where id = v_academia;
  else
    update public.academias set avisou_que_fechou_em = v_desde where id = v_academia;
  end if;
  perform set_config('guiatennis.mudanca_do_guia', '', true);
  return null;
end $$;

-- Os avisos abertos de hoje: a ficha sai do site, e a pausa de antes fica
-- guardada.
do $$
declare
  r record;
begin
  for r in select p.id, a.id as academia, a.pausada, a.pausada_ate, a.pausada_pela_academia
           from public.pedidos_para_sair p
           join public.academias a on a.id = p.academia_id
           where p.resolvido_em is null and p.user_id is not null and p.pausa_antes is null loop
    update public.pedidos_para_sair
      set pausa_antes = jsonb_build_object('pausada', coalesce(r.pausada, false), 'ate', r.pausada_ate,
                                           'pela_academia', coalesce(r.pausada_pela_academia, false))
      where id = r.id;
    perform set_config('guiatennis.mudanca_do_guia', r.academia::text, true);
    update public.academias set pausada = true, pausada_ate = null, pausada_pela_academia = false
      where id = r.academia;
  end loop;
  perform set_config('guiatennis.mudanca_do_guia', '', true);
end $$;

-- Enquanto o GuiaTennis confere, a academia não pausa nem volta sozinha
-- (pausar e voltar a desfaria). O resto como no SQL 20261005130000.
create or replace function public.pausar_minha_academia(
  p_academia uuid, p_pausar boolean, p_ate timestamptz default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  select * into a from public.academias where id = p_academia;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if a.status <> 'published' then
    raise exception 'A academia ainda está em análise: ela só aparece no site depois que o GuiaTennis publicar.' using errcode = '22023';
  end if;
  if a.avisou_que_fechou_em is not null then
    raise exception 'Vocês avisaram que a academia fechou: ela fica fora do site até o GuiaTennis conferir. Para ela voltar, cancele o aviso em Suas academias.' using errcode = '22023';
  end if;
  if coalesce(p_pausar, false) and p_ate is not null and p_ate <= now() then
    raise exception 'Escolha uma data depois de hoje.' using errcode = '22023';
  end if;
  if not coalesce(p_pausar, false) and a.pausada and not a.pausada_pela_academia
     and (a.pausada_ate is null or a.pausada_ate > now()) then
    raise exception 'Essa academia foi pausada pelo GuiaTennis. Fale com a gente para ela voltar a aparecer.' using errcode = '42501';
  end if;
  perform set_config('guiatennis.pausa_da_academia', 'sim', true);
  update public.academias
    set pausada = coalesce(p_pausar, false),
        pausada_ate = case when coalesce(p_pausar, false) then p_ate end,
        pausada_pela_academia = coalesce(p_pausar, false)
    where id = p_academia;
  perform set_config('guiatennis.pausa_da_academia', '', true);
end $$;

-- 4. O controle das fichas paradas ------------------------------------------
-- A tabela do lembrete (SQL 20261009130000) guarda também quando o
-- GuiaTennis conferiu a ficha; lembrada_em fica vazia se só conferiu.
alter table public.lembretes_de_ficha alter column lembrada_em drop not null;
alter table public.lembretes_de_ficha alter column lembrada_em drop default;
alter table public.lembretes_de_ficha add column if not exists conferida_em timestamptz;

-- No ar e sem mudar há 3 meses, a mais parada primeiro. recebem: quantas
-- pessoas da academia recebem o e-mail (0: ninguém para lembrar).
create or replace function public.fichas_paradas_admin()
returns table (academia_id uuid, nome text, atualizada_em timestamptz, lembrada_em timestamptz,
  conferida_em timestamptz, com_responsavel boolean, recebem int)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.name, coalesce(a.dados_atualizados_em, a.created_at), l.lembrada_em, l.conferida_em,
    exists (select 1 from public.academia_vinculos v where v.academia_id = a.id),
    (select count(*)::int from public.quem_recebe_da_academia(a.id))
  from public.academias a
  left join public.lembretes_de_ficha l on l.academia_id = a.id
  where public.eh_admin() and public.academia_no_ar(a)
    and coalesce(a.dados_atualizados_em, a.created_at) < now() - interval '3 months'
    and (l.conferida_em is null or l.conferida_em < now() - interval '3 months')
  order by coalesce(a.dados_atualizados_em, a.created_at), a.name;
$$;

-- "Lembrar agora": o mesmo e-mail do lembrete automático, para quem recebe
-- os avisos da academia. Um por dia. Devolve quantas pessoas vão receber.
create or replace function public.lembrar_ficha_admin(p_academia uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  v_desde date;
  v_quando text;
  v_n int;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis manda esse lembrete.' using errcode = '42501';
  end if;
  select * into a from public.academias where id = p_academia;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if exists (select 1 from public.lembretes_de_ficha
             where academia_id = p_academia
               and (lembrada_em at time zone 'America/Sao_Paulo')::date = public.hoje_em_brasilia()) then
    raise exception 'A academia já recebeu o lembrete hoje.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.quem_recebe_da_academia(p_academia)) then
    raise exception 'Ninguém da academia recebe os e-mails do GuiaTennis (e-mail não confirmado ou avisos desligados). Fale pelo WhatsApp.' using errcode = '22023';
  end if;
  v_desde := (coalesce(a.dados_atualizados_em, a.created_at) at time zone 'America/Sao_Paulo')::date;
  v_quando := public.data_por_extenso(v_desde) || ' de ' || extract(year from v_desde);
  v_n := public.aviso_para_a_equipe(p_academia, 'ficha-parada-admin:' || p_academia || ':' || public.hoje_em_brasilia(),
    'ficha_parada', 'Confira a ficha da ' || a.name || ' no GuiaTennis', 'Está tudo certo na ficha?',
    public.email_p('A ficha da <strong>' || public.html_texto(a.name) || '</strong> no GuiaTennis não muda desde <strong>'
      || v_quando || '</strong>. Na ficha, o jogador vê quando ela foi atualizada pela última vez.')
    || public.email_p('Preço, horário, quadras e professores mudam com o tempo. Confira a ficha e salve: '
      || 'salvar, mesmo sem mudar nada, mostra ao jogador que está tudo certo, e a ficha volta a dizer <strong>“atualizada hoje”</strong>.'),
    'A ficha da ' || a.name || ' no GuiaTennis não muda desde ' || v_quando || '.'
      || E'\n\nPreço, horário, quadras e professores mudam com o tempo. Confira a ficha e salve: salvar, mesmo sem mudar nada, mostra ao jogador que está tudo certo.',
    'Conferir a ficha', 'ficha');
  insert into public.lembretes_de_ficha (academia_id, lembrada_em) values (p_academia, now())
    on conflict (academia_id) do update set lembrada_em = excluded.lembrada_em;
  return v_n;
end $$;

-- "Conferi: está certo": o GuiaTennis conferiu (telefone, Google, Instagram)
-- e a ficha sai da lista por 3 meses. A data da ficha, que o jogador vê,
-- continua a da academia.
create or replace function public.ficha_conferida_admin(p_academia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis marca a ficha como conferida.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.academias where id = p_academia) then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  insert into public.lembretes_de_ficha (academia_id, lembrada_em, conferida_em) values (p_academia, null, now())
    on conflict (academia_id) do update set conferida_em = excluded.conferida_em;
end $$;

-- Permissões ---------------------------------------------------------------
revoke all on function public.sincronizar_aviso_de_fechou() from public, anon, authenticated;
revoke all on function public.confirmar_whatsapp_da_ficha(uuid, text) from public, anon;
revoke all on function public.pausar_minha_academia(uuid, boolean, timestamptz) from public, anon;
revoke all on function public.fichas_paradas_admin() from public, anon;
revoke all on function public.lembrar_ficha_admin(uuid) from public, anon;
revoke all on function public.ficha_conferida_admin(uuid) from public, anon;
grant execute on function public.confirmar_whatsapp_da_ficha(uuid, text), public.pausar_minha_academia(uuid, boolean, timestamptz),
  public.fichas_paradas_admin(), public.lembrar_ficha_admin(uuid), public.ficha_conferida_admin(uuid) to authenticated;

notify pgrst, 'reload schema';
