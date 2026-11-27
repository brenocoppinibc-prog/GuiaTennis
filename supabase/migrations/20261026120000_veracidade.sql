-- ============================================================
-- Veracidade como os grandes (pedido do Breno em 26/10/2026: "faça o que
-- for possível como os grandes fazem em tudo para sempre garantir a
-- veracidade, pegue os melhores dados que garantem isso atualizados também")
-- ============================================================
-- 1. O WhatsApp da ficha só entra confirmado por código. Como o Google
--    Business Profile (verificação por telefone, e nova verificação quando
--    a empresa muda dados importantes), o Booking e o Airbnb (telefone
--    confirmado antes de o anúncio ir ao ar): o número que uma conta do
--    Parceiros põe na ficha (academia nova ou troca) fica guardado, fora
--    do site, até alguém digitar o código mandado a ele. Na troca (a ficha
--    já tinha WhatsApp), o GuiaTennis ainda confere antes, como o Google
--    revisa as edições; até lá, a ficha mostra o número de antes.
--      academias.whatsapp_a_confirmar   o número novo (o visitante não lê)
--      academias.whatsapp_antes         o número de antes, na troca
--      academias.whatsapp_situacao      o que o visitante lê: 'confirmando'
--                                       (ficha sem número, esperando o
--                                       código) ou 'revisao' (jogadores
--                                       disseram que não é da academia)
--      codigos_do_whatsapp              o código, cifrado (72 horas, 5
--                                       tentativas)
--      confirmar_whatsapp_da_ficha, pedir_codigo_do_whatsapp,
--      desistir_do_whatsapp_novo, whatsapp_das_minhas_academias (Parceiros)
--      whatsapps_para_confirmar_admin, gerar_codigo_do_whatsapp_admin,
--      mandar_codigo_do_whatsapp_admin, aprovar_whatsapp_admin,
--      recusar_whatsapp_admin (admin)
-- 2. "Informar um problema" na ficha, como o "Sugerir uma alteração" do
--    Google Maps e o "Denunciar este anúncio" do Airbnb: quem tem conta, com
--    o e-mail confirmado, avisa que o WhatsApp não é da academia, que ela
--    fechou, que o endereço, o preço ou o horário estão errados. Duas contas
--    dizendo que o WhatsApp não é da academia tiram o botão até o GuiaTennis
--    conferir. A academia fica sabendo (como o Google avisa o dono) e, ao
--    salvar a ficha, resolve os avisos de dados.
--      problemas_na_ficha, informar_problema, problemas_da_minha_academia,
--      problemas_admin, resolver_problema_admin, manter_whatsapp_admin,
--      tirar_whatsapp_admin
-- 3. Avaliar só com o e-mail confirmado, como o Tripadvisor e o Yelp.
-- 4. "Denunciar avaliação", como o Google, o Booking e o Airbnb:
--      denuncias_de_avaliacao, denunciar_avaliacao, denuncias_admin,
--      resolver_denuncia_admin
-- 5. A academia que avisou que fechou aparece assim na ficha enquanto o
--    GuiaTennis confere, como o "Fechado permanentemente" do Google:
--      academias.avisou_que_fechou_em (o visitante lê)
--
-- Mudança feita pelo próprio GuiaTennis na ficha (tirar o botão, aprovar o
-- número): guiatennis.mudanca_do_guia = id da academia. Passa pelo gatilho
-- que protege a ficha e não muda a data "atualizada há…" (quem atualizou
-- não foi a academia), a não ser quando o número novo entra.
-- Pode rodar de novo sem estragar nada.

-- 1. Colunas -------------------------------------------------------------
alter table public.academias add column if not exists whatsapp_a_confirmar text;
alter table public.academias add column if not exists whatsapp_antes text;
alter table public.academias add column if not exists whatsapp_pedido_em timestamptz;
alter table public.academias add column if not exists whatsapp_pedido_por uuid;
alter table public.academias add column if not exists whatsapp_codigo_ok_em timestamptz;
alter table public.academias add column if not exists whatsapp_confirmado_em timestamptz;
alter table public.academias add column if not exists whatsapp_em_revisao_desde timestamptz;
alter table public.academias add column if not exists whatsapp_em_revisao_numero text;
alter table public.academias add column if not exists avisou_que_fechou_em timestamptz;
alter table public.academias add column if not exists whatsapp_situacao text
  generated always as (case when whatsapp_em_revisao_desde is not null then 'revisao'
                            when whatsapp_a_confirmar is not null and phone is null then 'confirmando' end) stored;
-- O visitante lê só a situação e o aviso de que fechou; nunca o número que
-- espera o código nem o que está em revisão.
grant select (whatsapp_situacao, avisou_que_fechou_em) on public.academias to anon, authenticated;

-- A data "atualizada há…" não conta essas colunas.
create or replace function public.dados_da_ficha(p jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select p - array['id', 'created_at', 'status', 'pago', 'plano', 'pausada', 'pausada_ate',
    'pausada_pela_academia', 'source', 'nome_solicitante', 'contato_solicitante',
    'revisar_desde', 'publicada_em', 'confirmada', 'dados_atualizados_em', 'lat', 'lng',
    'envios_de_aviso', 'whatsapp_a_confirmar', 'whatsapp_antes', 'whatsapp_pedido_em',
    'whatsapp_pedido_por', 'whatsapp_codigo_ok_em', 'whatsapp_confirmado_em',
    'whatsapp_em_revisao_desde', 'whatsapp_em_revisao_numero', 'avisou_que_fechou_em',
    'whatsapp_situacao'];
$$;

create or replace function public.marcar_dados_atualizados()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pausa boolean := coalesce(current_setting('guiatennis.pausa_da_academia', true), '') = 'sim';
  v_envio boolean := coalesce(current_setting('guiatennis.gastar_envio', true), '') <> '';
  v_guia boolean := tg_op = 'UPDATE' and coalesce(current_setting('guiatennis.mudanca_do_guia', true), '') = old.id::text;
  v_da_academia boolean;
begin
  if tg_op = 'INSERT' then
    new.dados_atualizados_em := now();
    return new;
  end if;
  -- Mudança do GuiaTennis: a data só muda se a própria função mudar.
  if v_guia then
    return new;
  end if;
  new.dados_atualizados_em := old.dados_atualizados_em;
  if v_pausa or v_envio then
    return new;
  end if;
  v_da_academia := auth.uid() is not null and not public.eh_admin()
    and exists (select 1 from public.academia_vinculos
                where user_id = auth.uid() and academia_id = old.id);
  if v_da_academia
     or public.dados_da_ficha(to_jsonb(new)) is distinct from public.dados_da_ficha(to_jsonb(old)) then
    new.dados_atualizados_em := now();
  end if;
  return new;
end $$;

-- 2. O número novo espera o código ---------------------------------------

-- Os mesmos números, escritos de jeitos diferentes? ("(11) 98765-4321" e
-- "11987654321")
create or replace function public.mesmo_whatsapp(p_a text, p_b text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(public.numero_do_whatsapp(p_a) = public.numero_do_whatsapp(p_b), false)
    or btrim(coalesce(p_a, '')) = btrim(coalesce(p_b, ''));
$$;

-- O gatilho que protege a ficha (igual ao do SQL 20261015120000), mais:
-- as colunas do WhatsApp e do aviso de que fechou só mudam pelas funções; o
-- número novo que a conta escreve vai para whatsapp_a_confirmar e a ficha
-- continua com o de antes; salvar a ficha resolve os avisos de dados que os
-- jogadores deram.
create or replace function public.proteger_ficha_da_academia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pausa boolean := coalesce(current_setting('guiatennis.pausa_da_academia', true), '') = 'sim';
  v_no_ar boolean := coalesce(current_setting('guiatennis.academia_nova_no_ar', true), '') = old.id::text;
  v_guia boolean := coalesce(current_setting('guiatennis.mudanca_do_guia', true), '') = old.id::text;
  v_linha public.academias;
  v_envio boolean := coalesce(current_setting('guiatennis.gastar_envio', true), '') = old.id::text;
  v_plano boolean := coalesce(current_setting('guiatennis.plano_da_academia', true), '') = old.id::text;
  v_txt text;
begin
  -- Gastar um envio (gastar_envio_de_aviso): só o saldo muda.
  if v_envio then
    v_linha := old;
    v_linha.envios_de_aviso := new.envios_de_aviso;
    return v_linha;
  end if;
  -- O responsável escolheu o plano (escolher_plano): só o plano muda.
  if v_plano then
    v_linha := old;
    v_linha.plano := new.plano;
    return v_linha;
  end if;
  if v_no_ar or v_guia then
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
    -- O admin escreveu o número: vale na hora, e o que esperava sai.
    if not public.mesmo_whatsapp(new.phone, old.phone) then
      new.whatsapp_a_confirmar := null;
      new.whatsapp_antes := null;
      new.whatsapp_pedido_em := null;
      new.whatsapp_pedido_por := null;
      new.whatsapp_codigo_ok_em := null;
    end if;
    return new;
  end if;
  new.id := old.id;
  new.created_at := old.created_at;
  new.status := old.status;
  new.pago := old.pago;
  new.plano := old.plano;
  new.envios_de_aviso := old.envios_de_aviso;
  new.pausada := old.pausada;
  new.pausada_ate := old.pausada_ate;
  new.pausada_pela_academia := old.pausada_pela_academia;
  new.source := old.source;
  new.nome_solicitante := old.nome_solicitante;
  new.contato_solicitante := old.contato_solicitante;
  new.revisar_desde := old.revisar_desde;
  new.confirmada := true;
  new.whatsapp_a_confirmar := old.whatsapp_a_confirmar;
  new.whatsapp_antes := old.whatsapp_antes;
  new.whatsapp_pedido_em := old.whatsapp_pedido_em;
  new.whatsapp_pedido_por := old.whatsapp_pedido_por;
  new.whatsapp_codigo_ok_em := old.whatsapp_codigo_ok_em;
  new.whatsapp_confirmado_em := old.whatsapp_confirmado_em;
  new.whatsapp_em_revisao_desde := old.whatsapp_em_revisao_desde;
  new.whatsapp_em_revisao_numero := old.whatsapp_em_revisao_numero;
  new.avisou_que_fechou_em := old.avisou_que_fechou_em;
  -- O WhatsApp: tirar vale na hora; o número novo espera o código.
  v_txt := nullif(btrim(coalesce(new.phone, '')), '');
  if v_txt is null then
    if old.phone is not null or old.whatsapp_a_confirmar is not null then
      new.phone := null;
      new.whatsapp_a_confirmar := null;
      new.whatsapp_antes := null;
      new.whatsapp_pedido_em := null;
      new.whatsapp_pedido_por := null;
      new.whatsapp_codigo_ok_em := null;
      new.whatsapp_confirmado_em := null;
      delete from public.codigos_do_whatsapp where academia_id = old.id;
    end if;
  elsif public.mesmo_whatsapp(v_txt, old.phone) then
    new.phone := old.phone;
  else
    new.phone := old.phone;
    if not public.mesmo_whatsapp(v_txt, old.whatsapp_a_confirmar) then
      if public.numero_do_whatsapp(v_txt) is null then
        raise exception 'Confira o WhatsApp da academia: DDD e número.' using errcode = '22023';
      end if;
      new.whatsapp_a_confirmar := v_txt;
      new.whatsapp_antes := coalesce(old.phone, old.whatsapp_em_revisao_numero);
      new.whatsapp_pedido_em := now();
      new.whatsapp_pedido_por := auth.uid();
      new.whatsapp_codigo_ok_em := null;
      delete from public.codigos_do_whatsapp where academia_id = old.id;
    end if;
  end if;
  update public.academia_vinculos
    set ficha_atualizada_em = now()
    where user_id = auth.uid() and academia_id = new.id;
  update public.academia_acessos
    set ficha_atualizada_em = now()
    where user_id = auth.uid() and academia_id = new.id;
  -- Salvar a ficha mostra que a academia conferiu: os avisos de dados que
  -- os jogadores deram se resolvem (o do WhatsApp, só o GuiaTennis).
  update public.problemas_na_ficha
    set resolvido_em = now(), resolucao = 'academia_salvou'
    where academia_id = old.id and resolvido_em is null and motivo <> 'whatsapp';
  return new;
end $$;

-- Academia nova: o que é do GuiaTennis começa vazio; o WhatsApp que a conta
-- do Parceiros escreveu espera o código.
create or replace function public.whatsapp_da_academia_nova()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_txt text := nullif(btrim(coalesce(new.phone, '')), '');
begin
  if public.eh_admin() then
    return new;
  end if;
  new.whatsapp_a_confirmar := null;
  new.whatsapp_antes := null;
  new.whatsapp_pedido_em := null;
  new.whatsapp_pedido_por := null;
  new.whatsapp_codigo_ok_em := null;
  new.whatsapp_confirmado_em := null;
  new.whatsapp_em_revisao_desde := null;
  new.whatsapp_em_revisao_numero := null;
  new.avisou_que_fechou_em := null;
  if auth.uid() is not null and v_txt is not null
     and exists (select 1 from public.academia_acessos where user_id = auth.uid()) then
    if public.numero_do_whatsapp(v_txt) is null then
      raise exception 'Confira o WhatsApp da academia: DDD e número.' using errcode = '22023';
    end if;
    new.phone := null;
    new.whatsapp_a_confirmar := v_txt;
    new.whatsapp_pedido_em := now();
    new.whatsapp_pedido_por := auth.uid();
  end if;
  return new;
end $$;

drop trigger if exists whatsapp_da_academia_nova on public.academias;
create trigger whatsapp_da_academia_nova
  before insert on public.academias
  for each row execute function public.whatsapp_da_academia_nova();

-- O código ---------------------------------------------------------------
create table if not exists public.codigos_do_whatsapp (
  academia_id uuid primary key references public.academias (id) on delete cascade,
  numero text not null,
  codigo_hash text not null,
  criado_em timestamptz not null default now(),
  tentativas int not null default 0,
  origem text not null default 'automatico'
);
alter table public.codigos_do_whatsapp enable row level security;
revoke all on table public.codigos_do_whatsapp from anon, authenticated;

-- Sorteia o código do número que espera e guarda só a versão cifrada.
create or replace function public.novo_codigo_do_whatsapp(p_academia uuid, p_origem text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_numero text;
  v_codigo text := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000))::text, 6, '0');
begin
  select whatsapp_a_confirmar into v_numero from public.academias where id = p_academia;
  if v_numero is null then
    return null;
  end if;
  insert into public.codigos_do_whatsapp (academia_id, numero, codigo_hash, criado_em, tentativas, origem)
  values (p_academia, v_numero, extensions.crypt(v_codigo, extensions.gen_salt('bf', 8)), now(), 0, p_origem)
  on conflict (academia_id) do update
    set numero = excluded.numero, codigo_hash = excluded.codigo_hash, criado_em = now(),
        tentativas = 0, origem = excluded.origem;
  return v_codigo;
end $$;

-- O aviso ao admin quando o código não sai sozinho (sem o WhatsApp da Meta):
-- ele manda do WhatsApp dele, em até 1 dia útil.
create or replace function public.aviso_de_whatsapp_para_confirmar(p_academia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
begin
  select * into a from public.academias where id = p_academia;
  if a.whatsapp_a_confirmar is null then
    return;
  end if;
  perform public.aviso_ao_admin('whatsapp-novo:' || p_academia || ':' || coalesce(public.numero_do_whatsapp(a.whatsapp_a_confirmar), ''),
    'whatsapp_para_confirmar', 'WhatsApp para confirmar: ' || a.name, 'WhatsApp para confirmar',
    public.email_p('A <strong>' || public.html_texto(a.name) || '</strong> pôs o WhatsApp <strong>'
      || public.html_texto(a.whatsapp_a_confirmar) || '</strong> na ficha'
      || case when a.whatsapp_antes is not null then ', no lugar de ' || public.html_texto(a.whatsapp_antes) else '' end || '.')
    || public.email_p('Em <strong>Pendências</strong>, gere o código e mande para esse número. O número só aparece na ficha depois que alguém da academia digitar o código'
      || case when a.whatsapp_antes is not null then ' e você aprovar a troca' else '' end || '.'),
    'A ' || a.name || ' pôs o WhatsApp ' || a.whatsapp_a_confirmar || ' na ficha'
      || case when a.whatsapp_antes is not null then ', no lugar de ' || a.whatsapp_antes else '' end
      || E'.\n\nEm Pendências, gere o código e mande para esse número.');
end $$;

-- Manda o código ao número novo: pelo WhatsApp do GuiaTennis, se estiver
-- ligado; senão, o admin fica sabendo. Devolve 'mandado', 'desligado' ou
-- 'sem_numero'.
create or replace function public.codigo_do_whatsapp_da_ficha(p_academia uuid, p_origem text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.whatsapp_configuracao;
  v_numero text;
  v_para text;
  v_codigo text;
begin
  select whatsapp_a_confirmar into v_numero from public.academias where id = p_academia;
  if v_numero is null then
    return 'sem_numero';
  end if;
  if not public.whatsapp_ligado() then
    if p_origem = 'automatico' then
      perform public.aviso_de_whatsapp_para_confirmar(p_academia);
    end if;
    return 'desligado';
  end if;
  select * into c from public.whatsapp_configuracao where id;
  v_para := public.numero_do_whatsapp(v_numero);
  -- No banco de teste, só o número de teste recebe.
  if not c.real then
    v_para := public.numero_do_whatsapp(c.numero_de_teste);
  end if;
  v_codigo := public.novo_codigo_do_whatsapp(p_academia, p_origem);
  insert into public.whatsapp_a_enviar (tipo, para, user_id, academia_id, origem, corpo)
  values ('whatsapp_da_ficha', v_para, null, p_academia, p_origem, jsonb_build_object(
    'messaging_product', 'whatsapp',
    'recipient_type', 'individual',
    'to', v_para,
    'type', 'template',
    'template', jsonb_build_object(
      'name', c.modelo,
      'language', jsonb_build_object('code', c.idioma),
      'components', jsonb_build_array(
        jsonb_build_object('type', 'body', 'parameters',
          jsonb_build_array(jsonb_build_object('type', 'text', 'text', v_codigo))),
        jsonb_build_object('type', 'button', 'sub_type', 'url', 'index', '0', 'parameters',
          jsonb_build_array(jsonb_build_object('type', 'text', 'text', v_codigo)))))));
  perform public.enviar_whatsapps();
  return 'mandado';
end $$;

-- Assim que o número novo aparece, o código sai (ou o admin fica sabendo).
create or replace function public.whatsapp_novo_manda_codigo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.whatsapp_a_confirmar is null
     or (tg_op = 'UPDATE' and old.whatsapp_a_confirmar is not distinct from new.whatsapp_a_confirmar) then
    return null;
  end if;
  begin
    perform public.codigo_do_whatsapp_da_ficha(new.id, 'automatico');
  exception when others then
    raise warning 'código do WhatsApp da ficha: %', sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists whatsapp_novo_manda_codigo on public.academias;
-- Sem "update of": quem muda a coluna é o gatilho que protege a ficha, e o
-- "update of" só vê as colunas escritas pelo site.
create trigger whatsapp_novo_manda_codigo
  after insert or update on public.academias
  for each row execute function public.whatsapp_novo_manda_codigo();

-- Quem administra a academia? (qualquer pessoa da equipe edita a ficha)
create or replace function public.administro_a_academia(p_academia uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia);
$$;

-- Para o Parceiros: o número que espera o código em cada academia da conta.
create or replace function public.whatsapp_das_minhas_academias()
returns table (academia_id uuid, numero text, troca boolean, pedido_em timestamptz,
  codigo_em timestamptz, codigo_ok_em timestamptz, em_revisao boolean, ligado boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.whatsapp_a_confirmar, a.whatsapp_antes is not null, a.whatsapp_pedido_em,
    k.criado_em, a.whatsapp_codigo_ok_em, a.whatsapp_em_revisao_desde is not null,
    public.whatsapp_ligado()
  from public.academias a
  join public.academia_vinculos v on v.academia_id = a.id and v.user_id = auth.uid()
  left join public.codigos_do_whatsapp k on k.academia_id = a.id
    and public.mesmo_whatsapp(k.numero, a.whatsapp_a_confirmar)
  where a.whatsapp_a_confirmar is not null or a.whatsapp_em_revisao_desde is not null;
$$;

-- "Mandar outro código": só com o WhatsApp do GuiaTennis ligado, um por
-- hora, até 3 em 3 dias (para ninguém encher o WhatsApp de alguém).
create or replace function public.pedir_codigo_do_whatsapp(p_academia uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.administro_a_academia(p_academia) then
    raise exception 'Só quem administra a academia pede o código.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.academias where id = p_academia and whatsapp_a_confirmar is not null) then
    return 'sem_numero';
  end if;
  if not public.whatsapp_ligado() then
    return 'desligado';
  end if;
  if exists (select 1 from public.whatsapp_a_enviar
             where academia_id = p_academia and tipo = 'whatsapp_da_ficha' and origem <> 'admin'
               and criado_em > now() - interval '1 hour') then
    return 'espere';
  end if;
  if (select count(*) from public.whatsapp_a_enviar
      where academia_id = p_academia and tipo = 'whatsapp_da_ficha' and origem <> 'admin'
        and criado_em > now() - interval '3 days') >= 3 then
    return 'limite';
  end if;
  return public.codigo_do_whatsapp_da_ficha(p_academia, 'conta');
end $$;

-- O número novo entra na ficha (quem chama já conferiu tudo).
create or replace function public.whatsapp_novo_na_ficha(p_academia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('guiatennis.mudanca_do_guia', p_academia::text, true);
  update public.academias
    set phone = whatsapp_a_confirmar, whatsapp_a_confirmar = null, whatsapp_antes = null,
        whatsapp_pedido_em = null, whatsapp_pedido_por = null, whatsapp_codigo_ok_em = null,
        whatsapp_confirmado_em = now(), whatsapp_em_revisao_desde = null, whatsapp_em_revisao_numero = null,
        -- O número que o jogador vê mudou: a ficha foi atualizada.
        dados_atualizados_em = now()
    where id = p_academia and whatsapp_a_confirmar is not null;
  perform set_config('guiatennis.mudanca_do_guia', '', true);
  delete from public.codigos_do_whatsapp where academia_id = p_academia;
  update public.problemas_na_ficha set resolvido_em = now(), resolucao = 'whatsapp_novo'
    where academia_id = p_academia and motivo = 'whatsapp' and resolvido_em is null;
end $$;

-- A pessoa digita o código. Academia sem WhatsApp na ficha: o número entra
-- na hora ('ok'). Troca: o GuiaTennis confere antes ('revisao'). Também
-- 'errado', 'tentativas', 'venceu', 'sem_codigo' e 'sem_numero'.
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
  if a.whatsapp_antes is null then
    perform public.whatsapp_novo_na_ficha(p_academia);
    return 'ok';
  end if;
  perform set_config('guiatennis.mudanca_do_guia', p_academia::text, true);
  update public.academias set whatsapp_codigo_ok_em = now() where id = p_academia;
  perform set_config('guiatennis.mudanca_do_guia', '', true);
  delete from public.codigos_do_whatsapp where academia_id = p_academia;
  perform public.aviso_ao_admin('whatsapp-troca:' || p_academia || ':' || coalesce(public.numero_do_whatsapp(a.whatsapp_a_confirmar), ''),
    'whatsapp_troca', 'Troca de WhatsApp para aprovar: ' || a.name, 'Troca de WhatsApp para aprovar',
    public.email_p('Alguém da <strong>' || public.html_texto(a.name) || '</strong> digitou o código mandado ao WhatsApp <strong>'
      || public.html_texto(a.whatsapp_a_confirmar) || '</strong>, que vai substituir o '
      || public.html_texto(a.whatsapp_antes) || ' na ficha.')
    || public.email_p('O código mostra que a pessoa tem o número novo, não que ele é da academia. Confira (Google, Instagram, o número de antes) e responda em <strong>Pendências</strong>: aprovar ou recusar a troca. Até lá, a ficha continua com o número de antes.'),
    'Alguém da ' || a.name || ' digitou o código mandado ao WhatsApp ' || a.whatsapp_a_confirmar
      || ', que vai substituir o ' || a.whatsapp_antes || E' na ficha.\n\nConfira e responda em Pendências: aprovar ou recusar a troca.');
  return 'revisao';
end $$;

-- "Cancelar": o número novo sai e a ficha fica como está.
create or replace function public.desistir_do_whatsapp_novo(p_academia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.administro_a_academia(p_academia) then
    raise exception 'Só quem administra a academia muda o WhatsApp.' using errcode = '42501';
  end if;
  perform set_config('guiatennis.mudanca_do_guia', p_academia::text, true);
  update public.academias
    set whatsapp_a_confirmar = null, whatsapp_antes = null, whatsapp_pedido_em = null,
        whatsapp_pedido_por = null, whatsapp_codigo_ok_em = null
    where id = p_academia;
  perform set_config('guiatennis.mudanca_do_guia', '', true);
  delete from public.codigos_do_whatsapp where academia_id = p_academia;
end $$;

-- Avisos para quem administra a academia (o e-mail confirmado, os avisos
-- ligados e o "Não quero mais receber"), como os outros do Parceiros.
create or replace function public.aviso_para_a_equipe(p_academia uuid, p_chave text, p_tipo text,
  p_assunto text, p_titulo text, p_html text, p_texto text, p_botao text, p_aba text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  r record;
  v_parar text;
  v_link text;
  v_n int := 0;
begin
  select * into a from public.academias where id = p_academia;
  if not found then
    return 0;
  end if;
  -- ?abrir= abre esta academia no painel (a conta pode ter várias).
  v_link := public.site_dos_emails() || '/parceiros/' || p_aba || '?abrir=' || right(replace(a.id::text, '-', ''), 8);
  for r in select * from public.quem_recebe_da_academia(p_academia) loop
    begin
      v_parar := public.link_parar_avisos(r.token_avisos, 'parceiros');
      if public.por_na_fila(p_chave || ':' || r.user_id, p_tipo, r.email, p_assunto,
        public.email_montado(p_titulo, p_html, p_botao, v_link,
          'Você recebe este e-mail porque administra a ' || public.html_texto(a.name)
          || ' no GuiaTennis Parceiros. <a href="' || public.html_texto(v_parar)
          || '" style="color:#6B6458">Não quero mais receber avisos por e-mail</a>.'),
        p_texto || E'\n\n' || p_botao || ': ' || v_link || E'\n\nNão quer mais receber avisos por e-mail? ' || v_parar,
        v_parar) then
        v_n := v_n + 1;
      end if;
    exception when others then
      raise warning 'aviso para a equipe: %', sqlerrm;
    end;
  end loop;
  return v_n;
end $$;

-- Admin ------------------------------------------------------------------
create or replace function public.whatsapps_para_confirmar_admin()
returns table (academia_id uuid, nome text, bairro text, cidade text, numero text, antes text,
  pedido_em timestamptz, codigo_em timestamptz, codigo_origem text, codigo_ok_em timestamptz,
  quem text, email text, ligado boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.name, a.bairro, a.cidade, a.whatsapp_a_confirmar, a.whatsapp_antes, a.whatsapp_pedido_em,
    k.criado_em, k.origem, a.whatsapp_codigo_ok_em,
    coalesce(x.nome_responsavel, j.nome), coalesce(x.email, x.usuario, j.email), public.whatsapp_ligado()
  from public.academias a
  left join public.codigos_do_whatsapp k on k.academia_id = a.id
    and public.mesmo_whatsapp(k.numero, a.whatsapp_a_confirmar)
  left join public.academia_acessos x on x.user_id = a.whatsapp_pedido_por
  left join public.jogadores j on j.user_id = a.whatsapp_pedido_por
  where public.eh_admin() and a.whatsapp_a_confirmar is not null
  order by a.whatsapp_codigo_ok_em nulls last, a.whatsapp_pedido_em;
$$;

-- O admin gera o código e manda do WhatsApp dele (o jeito de sempre).
create or replace function public.gerar_codigo_do_whatsapp_admin(p_academia uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo text;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis gera o código.' using errcode = '42501';
  end if;
  v_codigo := public.novo_codigo_do_whatsapp(p_academia, 'admin');
  if v_codigo is null then
    raise exception 'Essa academia não tem WhatsApp esperando o código.' using errcode = '22023';
  end if;
  return v_codigo;
end $$;

-- Ou pelo WhatsApp do GuiaTennis, quando estiver ligado.
create or replace function public.mandar_codigo_do_whatsapp_admin(p_academia uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis manda o código.' using errcode = '42501';
  end if;
  return public.codigo_do_whatsapp_da_ficha(p_academia, 'admin');
end $$;

create or replace function public.aprovar_whatsapp_admin(p_academia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis aprova o WhatsApp.' using errcode = '42501';
  end if;
  select * into a from public.academias where id = p_academia;
  if a.whatsapp_a_confirmar is null then
    raise exception 'Essa academia não tem WhatsApp esperando.' using errcode = '22023';
  end if;
  perform public.whatsapp_novo_na_ficha(p_academia);
  perform public.aviso_para_a_equipe(p_academia, 'whatsapp-aprovado:' || p_academia || ':' || public.hoje_em_brasilia(),
    'whatsapp_aprovado', 'O WhatsApp novo está na ficha da ' || a.name, 'O WhatsApp novo está na ficha',
    public.email_p('O GuiaTennis conferiu, e o WhatsApp <strong>' || public.html_texto(a.whatsapp_a_confirmar)
      || '</strong> já aparece na ficha da <strong>' || public.html_texto(a.name) || '</strong>.'),
    'O GuiaTennis conferiu, e o WhatsApp ' || a.whatsapp_a_confirmar || ' já aparece na ficha da ' || a.name || '.',
    'Ver a ficha', 'ficha');
end $$;

create or replace function public.recusar_whatsapp_admin(p_academia uuid, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis recusa o WhatsApp.' using errcode = '42501';
  end if;
  select * into a from public.academias where id = p_academia;
  if a.whatsapp_a_confirmar is null then
    raise exception 'Essa academia não tem WhatsApp esperando.' using errcode = '22023';
  end if;
  perform set_config('guiatennis.mudanca_do_guia', p_academia::text, true);
  update public.academias
    set whatsapp_a_confirmar = null, whatsapp_antes = null, whatsapp_pedido_em = null,
        whatsapp_pedido_por = null, whatsapp_codigo_ok_em = null
    where id = p_academia;
  perform set_config('guiatennis.mudanca_do_guia', '', true);
  delete from public.codigos_do_whatsapp where academia_id = p_academia;
  perform public.aviso_para_a_equipe(p_academia, 'whatsapp-recusado:' || p_academia || ':' || public.hoje_em_brasilia(),
    'whatsapp_recusado', 'O WhatsApp novo não entrou na ficha da ' || a.name, 'O WhatsApp novo não entrou',
    public.email_p('O GuiaTennis não confirmou que o WhatsApp <strong>' || public.html_texto(a.whatsapp_a_confirmar)
      || '</strong> é da <strong>' || public.html_texto(a.name) || '</strong>, e ele não entrou na ficha.')
    || coalesce(public.email_p(public.html_texto(v_motivo)), '')
    || public.email_p('Se o número é da academia, fale com o GuiaTennis no WhatsApp.'),
    'O GuiaTennis não confirmou que o WhatsApp ' || a.whatsapp_a_confirmar || ' é da ' || a.name
      || ', e ele não entrou na ficha.' || coalesce(E'\n\n' || v_motivo, ''),
    'Abrir a ficha', 'ficha');
end $$;

-- 3. Problemas que os jogadores informam ------------------------------------
create table if not exists public.problemas_na_ficha (
  id uuid primary key default gen_random_uuid(),
  academia_id uuid not null references public.academias (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  motivo text not null,
  detalhes text,
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  resolucao text
);
alter table public.problemas_na_ficha drop constraint if exists problemas_na_ficha_ok;
alter table public.problemas_na_ficha add constraint problemas_na_ficha_ok
  check (motivo in ('whatsapp', 'fechou', 'endereco', 'preco_horario', 'outro')
         and (detalhes is null or char_length(detalhes) <= 500));
create unique index if not exists problemas_na_ficha_um_aberto
  on public.problemas_na_ficha (academia_id, user_id, motivo) where resolvido_em is null;
create index if not exists problemas_na_ficha_abertos
  on public.problemas_na_ficha (academia_id) where resolvido_em is null;
alter table public.problemas_na_ficha enable row level security;
revoke all on table public.problemas_na_ficha from anon, authenticated;

create or replace function public.nome_do_problema(p_motivo text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_motivo
    when 'whatsapp' then 'o WhatsApp não é da academia'
    when 'fechou' then 'a academia fechou'
    when 'endereco' then 'o endereço ou o lugar no mapa está errado'
    when 'preco_horario' then 'o preço ou o horário está errado'
    else 'outro problema' end;
$$;

-- Duas contas dizendo que o WhatsApp não é da academia: o botão sai até o
-- GuiaTennis conferir (o número fica guardado, fora do site).
create or replace function public.whatsapp_em_revisao(p_academia uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
begin
  select * into a from public.academias where id = p_academia;
  if a.phone is null or a.whatsapp_em_revisao_desde is not null then
    return false;
  end if;
  if (select count(distinct user_id) from public.problemas_na_ficha
      where academia_id = p_academia and motivo = 'whatsapp' and resolvido_em is null) < 2 then
    return false;
  end if;
  perform set_config('guiatennis.mudanca_do_guia', p_academia::text, true);
  update public.academias
    set whatsapp_em_revisao_desde = now(), whatsapp_em_revisao_numero = phone, phone = null
    where id = p_academia;
  perform set_config('guiatennis.mudanca_do_guia', '', true);
  perform public.aviso_ao_admin('whatsapp-revisao:' || p_academia || ':' || public.hoje_em_brasilia(),
    'whatsapp_em_revisao', 'WhatsApp em revisão: ' || a.name, 'WhatsApp em revisão',
    public.email_p('Duas contas informaram que o WhatsApp <strong>' || public.html_texto(a.phone)
      || '</strong> não é da <strong>' || public.html_texto(a.name) || '</strong>. O botão do WhatsApp saiu da ficha.')
    || public.email_p('Confira (Google, Instagram, o próprio número) e responda em <strong>Pendências</strong>: manter o WhatsApp ou tirar da ficha.'),
    'Duas contas informaram que o WhatsApp ' || a.phone || ' não é da ' || a.name
      || E'. O botão do WhatsApp saiu da ficha.\n\nConfira e responda em Pendências.');
  perform public.aviso_para_a_equipe(p_academia, 'whatsapp-revisao-equipe:' || p_academia || ':' || public.hoje_em_brasilia(),
    'whatsapp_em_revisao', 'O WhatsApp da ' || a.name || ' está em revisão', 'O WhatsApp está em revisão',
    public.email_p('Jogadores informaram que o WhatsApp <strong>' || public.html_texto(a.phone)
      || '</strong> não é da <strong>' || public.html_texto(a.name) || '</strong>. Enquanto o GuiaTennis confere, o botão do WhatsApp não aparece na ficha.')
    || public.email_p('O número está certo? Não precisa fazer nada: o GuiaTennis confere em até 1 dia útil. Mudou de número? Escreva o novo em Minha ficha: ele passa pelo código e pela conferência do GuiaTennis.'),
    'Jogadores informaram que o WhatsApp ' || a.phone || ' não é da ' || a.name
      || '. Enquanto o GuiaTennis confere, o botão do WhatsApp não aparece na ficha.',
    'Abrir a ficha', 'painel');
  return true;
end $$;

-- O jogador informa. Devolve 'ok' ou 'whatsapp_em_revisao' (o botão saiu).
create or replace function public.informar_problema(p_academia uuid, p_motivo text, p_detalhes text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.jogadores;
  a public.academias;
  v_detalhes text := nullif(btrim(coalesce(p_detalhes, '')), '');
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para informar um problema.' using errcode = '42501';
  end if;
  if public.administro_a_academia(p_academia) then
    raise exception 'Vocês administram esta academia: corrijam em Minha ficha, no GuiaTennis Parceiros.' using errcode = '42501';
  end if;
  select * into j from public.jogadores where user_id = auth.uid();
  if not found then
    raise exception 'Entre na sua conta para informar um problema.' using errcode = '42501';
  end if;
  if j.email_confirmado_em is null then
    raise exception 'Confirme o seu e-mail para informar um problema.' using errcode = '42501';
  end if;
  if coalesce(p_motivo, '') not in ('whatsapp', 'fechou', 'endereco', 'preco_horario', 'outro') then
    raise exception 'Escolha o que está errado.' using errcode = '22023';
  end if;
  if p_motivo = 'outro' and v_detalhes is null then
    raise exception 'Conte o que está errado.' using errcode = '22023';
  end if;
  if char_length(coalesce(v_detalhes, '')) > 500 then
    raise exception 'O texto cabe em até 500 letras.' using errcode = '22023';
  end if;
  select * into a from public.academias where id = p_academia and status = 'published';
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if p_motivo = 'whatsapp' and a.phone is null and a.whatsapp_em_revisao_desde is null then
    raise exception 'Esta academia não tem WhatsApp na ficha.' using errcode = '22023';
  end if;
  if (select count(*) from public.problemas_na_ficha
      where user_id = auth.uid() and criado_em > now() - interval '1 day') >= 10 then
    raise exception 'Você já informou 10 problemas hoje. Tente de novo amanhã.' using errcode = '22023';
  end if;
  insert into public.problemas_na_ficha (academia_id, user_id, motivo, detalhes)
  values (p_academia, auth.uid(), p_motivo, v_detalhes)
  on conflict (academia_id, user_id, motivo) where resolvido_em is null
  do update set detalhes = coalesce(excluded.detalhes, public.problemas_na_ficha.detalhes)
  returning id into v_id;
  perform public.aviso_ao_admin('problema:' || p_academia || ':' || public.hoje_em_brasilia(),
    'problema_na_ficha', 'Problema informado: ' || a.name, 'Problema informado na ficha',
    public.email_p('Um jogador informou que ' || public.html_texto(public.nome_do_problema(p_motivo))
      || ' na ficha da <strong>' || public.html_texto(a.name) || '</strong>.')
    || coalesce(public.email_p('“' || public.html_texto(v_detalhes) || '”'), '')
    || public.email_p('Confira em <strong>Pendências</strong>.'),
    'Um jogador informou que ' || public.nome_do_problema(p_motivo) || ' na ficha da ' || a.name || '.'
      || coalesce(E'\n\n"' || v_detalhes || '"', ''));
  if p_motivo <> 'whatsapp' then
    perform public.aviso_para_a_equipe(p_academia, 'problema-equipe:' || p_academia || ':' || public.hoje_em_brasilia(),
      'problema_na_ficha', 'Um jogador informou um problema na ficha da ' || a.name, 'Um jogador informou um problema',
      public.email_p('Um jogador informou que ' || public.html_texto(public.nome_do_problema(p_motivo))
        || ' na ficha da <strong>' || public.html_texto(a.name) || '</strong>.')
      || coalesce(public.email_p('“' || public.html_texto(v_detalhes) || '”'), '')
      || public.email_p('Confira a ficha e salve: salvar, mesmo sem mudar nada, mostra que está tudo certo.'),
      'Um jogador informou que ' || public.nome_do_problema(p_motivo) || ' na ficha da ' || a.name || '.'
        || coalesce(E'\n\n"' || v_detalhes || '"', '')
        || E'\n\nConfira a ficha e salve: salvar, mesmo sem mudar nada, mostra que está tudo certo.',
      'Conferir a ficha', 'ficha');
  end if;
  if p_motivo = 'whatsapp' and public.whatsapp_em_revisao(p_academia) then
    return 'whatsapp_em_revisao';
  end if;
  return 'ok';
end $$;

-- Para o Parceiros: o que os jogadores informaram (sem dizer quem).
create or replace function public.problemas_da_minha_academia(p_academia uuid)
returns table (id uuid, motivo text, detalhes text, criado_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.motivo, p.detalhes, p.criado_em
  from public.problemas_na_ficha p
  where p.academia_id = p_academia and p.resolvido_em is null
    and public.administro_a_academia(p_academia)
  order by p.criado_em desc
  limit 20;
$$;

create or replace function public.problemas_admin()
returns table (id uuid, academia_id uuid, nome text, bairro text, cidade text, motivo text, detalhes text,
  criado_em timestamptz, quem text, email text, telefone text, em_revisao boolean, numero_em_revisao text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.academia_id, a.name, a.bairro, a.cidade, p.motivo, p.detalhes, p.criado_em,
    j.nome, j.email, coalesce(a.phone, a.whatsapp_em_revisao_numero),
    a.whatsapp_em_revisao_desde is not null, a.whatsapp_em_revisao_numero
  from public.problemas_na_ficha p
  join public.academias a on a.id = p.academia_id
  left join public.jogadores j on j.user_id = p.user_id
  where public.eh_admin() and p.resolvido_em is null
  order by (a.whatsapp_em_revisao_desde is not null) desc, p.criado_em;
$$;

create or replace function public.resolver_problema_admin(p_id uuid, p_resolucao text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis resolve esse aviso.' using errcode = '42501';
  end if;
  if coalesce(p_resolucao, '') not in ('corrigido', 'sem_problema') then
    raise exception 'Resolução inválida.' using errcode = '22023';
  end if;
  update public.problemas_na_ficha set resolvido_em = now(), resolucao = p_resolucao
    where id = p_id and resolvido_em is null;
end $$;

-- O WhatsApp em revisão é da academia: volta para a ficha.
create or replace function public.manter_whatsapp_admin(p_academia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis decide.' using errcode = '42501';
  end if;
  select * into a from public.academias where id = p_academia;
  perform set_config('guiatennis.mudanca_do_guia', p_academia::text, true);
  update public.academias
    set phone = coalesce(whatsapp_em_revisao_numero, phone), whatsapp_em_revisao_desde = null, whatsapp_em_revisao_numero = null
    where id = p_academia;
  perform set_config('guiatennis.mudanca_do_guia', '', true);
  update public.problemas_na_ficha set resolvido_em = now(), resolucao = 'whatsapp_mantido'
    where academia_id = p_academia and motivo = 'whatsapp' and resolvido_em is null;
  if a.whatsapp_em_revisao_desde is not null then
    perform public.aviso_para_a_equipe(p_academia, 'whatsapp-mantido:' || p_academia || ':' || public.hoje_em_brasilia(),
      'whatsapp_mantido', 'O WhatsApp voltou para a ficha da ' || a.name, 'O WhatsApp voltou para a ficha',
      public.email_p('O GuiaTennis conferiu o WhatsApp <strong>' || public.html_texto(a.whatsapp_em_revisao_numero)
        || '</strong>, e o botão voltou para a ficha da <strong>' || public.html_texto(a.name) || '</strong>.'),
      'O GuiaTennis conferiu o WhatsApp ' || a.whatsapp_em_revisao_numero || ', e o botão voltou para a ficha da ' || a.name || '.',
      'Ver a ficha', 'ficha');
  end if;
end $$;

-- Não é da academia: o número sai de vez. A academia escreve o certo em
-- Minha ficha (código e conferência do GuiaTennis).
create or replace function public.tirar_whatsapp_admin(p_academia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  v_numero text;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis decide.' using errcode = '42501';
  end if;
  select * into a from public.academias where id = p_academia;
  v_numero := coalesce(a.whatsapp_em_revisao_numero, a.phone);
  perform set_config('guiatennis.mudanca_do_guia', p_academia::text, true);
  update public.academias
    set phone = null, whatsapp_em_revisao_desde = null, whatsapp_em_revisao_numero = null, whatsapp_confirmado_em = null,
        -- O jogador deixa de ver o número: a ficha mudou.
        dados_atualizados_em = now()
    where id = p_academia;
  perform set_config('guiatennis.mudanca_do_guia', '', true);
  update public.problemas_na_ficha set resolvido_em = now(), resolucao = 'whatsapp_tirado'
    where academia_id = p_academia and motivo = 'whatsapp' and resolvido_em is null;
  if v_numero is not null then
    perform public.aviso_para_a_equipe(p_academia, 'whatsapp-tirado:' || p_academia || ':' || public.hoje_em_brasilia(),
      'whatsapp_tirado', 'O WhatsApp saiu da ficha da ' || a.name, 'O WhatsApp saiu da ficha',
      public.email_p('O GuiaTennis não confirmou que o WhatsApp <strong>' || public.html_texto(v_numero)
        || '</strong> é da <strong>' || public.html_texto(a.name) || '</strong>, e ele saiu da ficha.')
      || public.email_p('Escreva o WhatsApp certo da academia em Minha ficha: ele passa pelo código e pela conferência do GuiaTennis.'),
      'O GuiaTennis não confirmou que o WhatsApp ' || v_numero || ' é da ' || a.name
        || E', e ele saiu da ficha.\n\nEscreva o WhatsApp certo da academia em Minha ficha.',
      'Abrir a ficha', 'ficha');
  end if;
end $$;

-- 4. Avaliar só com o e-mail confirmado ----------------------------------
create or replace function public.avaliacao_do_jogador()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.jogadores;
begin
  if public.eh_admin() then
    return new;
  end if;
  select * into j from public.jogadores where user_id = auth.uid();
  if not found then
    raise exception 'Entre na sua conta para avaliar.' using errcode = '42501';
  end if;
  if j.email_confirmado_em is null then
    raise exception 'Confirme o seu e-mail para avaliar.' using errcode = '42501';
  end if;
  if exists (select 1 from public.avaliacoes where academia_id = new.academia_id and user_id = j.user_id) then
    raise exception 'Você já avaliou essa academia.' using errcode = '23505';
  end if;
  new.user_id := j.user_id;
  new.nome_autor := j.nome;
  new.contato_autor := j.email;
  return new;
end $$;

-- 5. Denunciar avaliação -------------------------------------------------
create table if not exists public.denuncias_de_avaliacao (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  motivo text not null,
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  resolucao text
);
alter table public.denuncias_de_avaliacao drop constraint if exists denuncias_de_avaliacao_ok;
alter table public.denuncias_de_avaliacao add constraint denuncias_de_avaliacao_ok
  check (motivo in ('falsa', 'ofensiva', 'propaganda', 'conflito', 'pessoal'));
create unique index if not exists denuncias_uma_por_conta
  on public.denuncias_de_avaliacao (avaliacao_id, user_id);
alter table public.denuncias_de_avaliacao enable row level security;
revoke all on table public.denuncias_de_avaliacao from anon, authenticated;

create or replace function public.nome_da_denuncia(p_motivo text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_motivo
    when 'falsa' then 'falsa ou não é sobre esta academia'
    when 'ofensiva' then 'ofensiva, com ameaça ou discriminação'
    when 'propaganda' then 'propaganda ou spam'
    when 'conflito' then 'escrita pela própria academia ou por um concorrente'
    else 'mostra dados pessoais' end;
$$;

create or replace function public.denunciar_avaliacao(p_avaliacao uuid, p_motivo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.avaliacoes;
  a public.academias;
begin
  if not public.sou_jogador() then
    raise exception 'Entre na sua conta para denunciar.' using errcode = '42501';
  end if;
  if coalesce(p_motivo, '') not in ('falsa', 'ofensiva', 'propaganda', 'conflito', 'pessoal') then
    raise exception 'Escolha o motivo.' using errcode = '22023';
  end if;
  select * into v from public.avaliacoes where id = p_avaliacao;
  if not found then
    raise exception 'Avaliação não encontrada.' using errcode = '22023';
  end if;
  if v.user_id = auth.uid() then
    raise exception 'Essa avaliação é sua.' using errcode = '22023';
  end if;
  if (select count(*) from public.denuncias_de_avaliacao
      where user_id = auth.uid() and criado_em > now() - interval '1 day') >= 10 then
    raise exception 'Você já denunciou 10 avaliações hoje. Tente de novo amanhã.' using errcode = '22023';
  end if;
  insert into public.denuncias_de_avaliacao (avaliacao_id, user_id, motivo)
  values (p_avaliacao, auth.uid(), p_motivo)
  on conflict (avaliacao_id, user_id) do update
    set motivo = excluded.motivo, criado_em = now(), resolvido_em = null, resolucao = null;
  select * into a from public.academias where id = v.academia_id;
  perform public.aviso_ao_admin('denuncia:' || p_avaliacao || ':' || public.hoje_em_brasilia(),
    'avaliacao_denunciada', 'Avaliação denunciada: ' || coalesce(a.name, 'academia'), 'Avaliação denunciada',
    public.email_p('Um jogador denunciou uma avaliação da <strong>' || public.html_texto(coalesce(a.name, 'academia'))
      || '</strong>: ' || public.html_texto(public.nome_da_denuncia(p_motivo)) || '.')
    || public.email_p('Confira em <strong>Pendências</strong>: manter ou remover.'),
    'Um jogador denunciou uma avaliação da ' || coalesce(a.name, 'academia') || ': ' || public.nome_da_denuncia(p_motivo) || '.');
  return 'ok';
end $$;

create or replace function public.denuncias_admin()
returns table (avaliacao_id uuid, academia_id uuid, academia text, stars int, comentario text, autor text,
  avaliada_em timestamptz, denuncias int, motivos text[], primeira_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id, v.academia_id, a.name, v.stars, v.comment, v.nome_autor, v.created_at,
    count(*)::int, array_agg(distinct d.motivo), min(d.criado_em)
  from public.denuncias_de_avaliacao d
  join public.avaliacoes v on v.id = d.avaliacao_id
  left join public.academias a on a.id = v.academia_id
  where public.eh_admin() and d.resolvido_em is null
  group by v.id, a.name
  order by count(*) desc, min(d.criado_em);
$$;

-- Manter (fecha as denúncias) ou remover a avaliação (as denúncias vão
-- junto).
create or replace function public.resolver_denuncia_admin(p_avaliacao uuid, p_remover boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis decide.' using errcode = '42501';
  end if;
  if coalesce(p_remover, false) then
    delete from public.avaliacoes where id = p_avaliacao;
  else
    update public.denuncias_de_avaliacao set resolvido_em = now(), resolucao = 'mantida'
      where avaliacao_id = p_avaliacao and resolvido_em is null;
  end if;
end $$;

-- 6. A academia que avisou que fechou --------------------------------------
-- O aviso aberto do responsável (pedidos_para_sair, SQL 20261020170000)
-- aparece na ficha até o GuiaTennis conferir; cancelado ou resolvido, some.
create or replace function public.sincronizar_aviso_de_fechou()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia uuid := coalesce(case when tg_op <> 'DELETE' then new.academia_id end, old.academia_id);
  v_desde timestamptz;
begin
  if v_academia is null then
    return null;
  end if;
  select min(pedido_em) into v_desde from public.pedidos_para_sair
    where academia_id = v_academia and resolvido_em is null and user_id is not null;
  if exists (select 1 from public.academias where id = v_academia and avisou_que_fechou_em is distinct from v_desde) then
    perform set_config('guiatennis.mudanca_do_guia', v_academia::text, true);
    update public.academias set avisou_que_fechou_em = v_desde where id = v_academia;
    perform set_config('guiatennis.mudanca_do_guia', '', true);
  end if;
  return null;
end $$;

drop trigger if exists sincronizar_aviso_de_fechou on public.pedidos_para_sair;
create trigger sincronizar_aviso_de_fechou
  after insert or update or delete on public.pedidos_para_sair
  for each row execute function public.sincronizar_aviso_de_fechou();

-- Os avisos abertos de hoje passam para a ficha.
do $$
declare
  r record;
begin
  for r in select academia_id, min(pedido_em) as desde from public.pedidos_para_sair
           where resolvido_em is null and user_id is not null and academia_id is not null
           group by academia_id loop
    perform set_config('guiatennis.mudanca_do_guia', r.academia_id::text, true);
    update public.academias set avisou_que_fechou_em = r.desde where id = r.academia_id;
  end loop;
  perform set_config('guiatennis.mudanca_do_guia', '', true);
end $$;

-- Permissões ---------------------------------------------------------------
revoke all on function public.mesmo_whatsapp(text, text) from public, anon, authenticated;
revoke all on function public.whatsapp_da_academia_nova() from public, anon, authenticated;
revoke all on function public.novo_codigo_do_whatsapp(uuid, text) from public, anon, authenticated;
revoke all on function public.aviso_de_whatsapp_para_confirmar(uuid) from public, anon, authenticated;
revoke all on function public.codigo_do_whatsapp_da_ficha(uuid, text) from public, anon, authenticated;
revoke all on function public.whatsapp_novo_manda_codigo() from public, anon, authenticated;
revoke all on function public.whatsapp_novo_na_ficha(uuid) from public, anon, authenticated;
revoke all on function public.aviso_para_a_equipe(uuid, text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.whatsapp_em_revisao(uuid) from public, anon, authenticated;
revoke all on function public.nome_do_problema(text) from public, anon, authenticated;
revoke all on function public.nome_da_denuncia(text) from public, anon, authenticated;
revoke all on function public.sincronizar_aviso_de_fechou() from public, anon, authenticated;
revoke all on function public.avaliacao_do_jogador() from public, anon, authenticated;
revoke all on function public.administro_a_academia(uuid) from public, anon;
grant execute on function public.administro_a_academia(uuid) to authenticated;
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.whatsapp_das_minhas_academias()', 'public.pedir_codigo_do_whatsapp(uuid)',
    'public.confirmar_whatsapp_da_ficha(uuid, text)', 'public.desistir_do_whatsapp_novo(uuid)',
    'public.whatsapps_para_confirmar_admin()', 'public.gerar_codigo_do_whatsapp_admin(uuid)',
    'public.mandar_codigo_do_whatsapp_admin(uuid)', 'public.aprovar_whatsapp_admin(uuid)',
    'public.recusar_whatsapp_admin(uuid, text)', 'public.informar_problema(uuid, text, text)',
    'public.problemas_da_minha_academia(uuid)', 'public.problemas_admin()',
    'public.resolver_problema_admin(uuid, text)', 'public.manter_whatsapp_admin(uuid)',
    'public.tirar_whatsapp_admin(uuid)', 'public.denunciar_avaliacao(uuid, text)',
    'public.denuncias_admin()', 'public.resolver_denuncia_admin(uuid, boolean)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';
