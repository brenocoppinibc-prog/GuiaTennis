-- Regra 222 (pedido do Breno em 09/11/2026). Pode rodar de novo sem estragar.
--
-- 1. O WhatsApp da ficha entra no site assim que o código é confirmado
--    ("publicar no site mas deixar para o admin pendente para confirmar e
--    mostrar isso no site, WhatsApp em confirmação pelo GuiaTennis"), como o
--    Google Maps, que mostra a edição do dono na hora e revisa depois. Até o
--    admin confirmar, a ficha mostra "WhatsApp em confirmação pelo
--    GuiaTennis" (a coluna pública `academias.whatsapp_em_confirmacao`);
--    confirmado, fica só o "Confirmada pela academia". Recusado, volta o
--    número de antes (ou a ficha fica sem WhatsApp).
-- 2. A disputa com dois códigos ("a pessoa que contesta deve informar o
--    número que ela acha certo e validar o código, o outro que já tinha o
--    número também precisa validar o código e eu vou analisar o mais
--    correto"): quem contesta informa o WhatsApp da academia e confirma com
--    o código mandado a ele (`pedidos_de_acesso.numero_contestado`); quem
--    administra confirma o WhatsApp da ficha com outro código
--    (`responsavel_codigo_ok_em`). O admin compara e decide; dando a academia
--    a quem contestou, o número confirmado por ela vai para a ficha.

-- 1. WhatsApp no ar, em confirmação ------------------------------------------
alter table public.academias add column if not exists whatsapp_em_confirmacao boolean
  generated always as (whatsapp_codigo_ok_em is not null and whatsapp_a_confirmar is not null and phone is not null) stored;
grant select (whatsapp_em_confirmacao) on public.academias to anon, authenticated;

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
    'whatsapp_situacao', 'whatsapp_em_confirmacao'];
$$;

-- O que esperava o admin com o código confirmado (antes desta regra) entra
-- no site do mesmo jeito.
do $$
declare
  r record;
begin
  for r in select id from public.academias
           where whatsapp_codigo_ok_em is not null and whatsapp_a_confirmar is not null
             and not public.mesmo_whatsapp(phone, whatsapp_a_confirmar) loop
    perform set_config('guiatennis.mudanca_do_guia', r.id::text, true);
    update public.academias set phone = whatsapp_a_confirmar, dados_atualizados_em = now() where id = r.id;
    perform set_config('guiatennis.mudanca_do_guia', '', true);
  end loop;
end $$;

-- O código certo: o número entra na ficha na hora, em confirmação.
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
  perform public.exigir_funcao(p_academia, 'ficha');
  select * into a from public.academias where id = p_academia;
  if a.whatsapp_a_confirmar is null then
    return 'sem_numero';
  end if;
  if a.whatsapp_codigo_ok_em is not null then
    return 'publicado';
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
  update public.academias
    set phone = whatsapp_a_confirmar, whatsapp_codigo_ok_em = now(), dados_atualizados_em = now()
    where id = p_academia;
  perform set_config('guiatennis.mudanca_do_guia', '', true);
  delete from public.codigos_do_whatsapp where academia_id = p_academia;
  v_troca := a.phone is not null;
  perform public.aviso_ao_admin('whatsapp-aprovar:' || p_academia || ':' || coalesce(public.numero_do_whatsapp(a.whatsapp_a_confirmar), ''),
    'whatsapp_para_aprovar',
    'WhatsApp em confirmação: ' || a.name,
    'WhatsApp em confirmação',
    public.email_p('Alguém da <strong>' || public.html_texto(a.name) || '</strong> digitou o código mandado ao WhatsApp <strong>'
      || public.html_texto(a.whatsapp_a_confirmar) || '</strong>, que já está na ficha'
      || case when v_troca then ' no lugar do ' || public.html_texto(a.phone) else '' end
      || ', com o aviso "WhatsApp em confirmação pelo GuiaTennis".')
    || public.email_p('O código mostra que a pessoa tem o número, não que ele é da academia. Confira (Google, Instagram, site, a Receita em <strong>Conferir</strong>) e responda em <strong>Pendências</strong>: confirmar ou recusar. Recusado, '
      || case when v_troca then 'volta o número de antes.' else 'a ficha fica sem WhatsApp.' end),
    'Alguém da ' || a.name || ' digitou o código mandado ao WhatsApp ' || a.whatsapp_a_confirmar || ', que já está na ficha'
      || case when v_troca then ' no lugar do ' || a.phone else '' end
      || E', com o aviso "WhatsApp em confirmação pelo GuiaTennis".\n\nConfira e responda em Pendências: confirmar ou recusar.');
  return 'publicado';
end $$;

-- Confirmado pelo admin: o número fica, sem o aviso (a data "atualizada há…"
-- só muda se o número mudar).
create or replace function public.whatsapp_novo_na_ficha(p_academia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('guiatennis.mudanca_do_guia', p_academia::text, true);
  update public.academias
    set dados_atualizados_em = case when public.mesmo_whatsapp(phone, whatsapp_a_confirmar) then dados_atualizados_em else now() end,
        phone = whatsapp_a_confirmar, whatsapp_a_confirmar = null, whatsapp_antes = null,
        whatsapp_pedido_em = null, whatsapp_pedido_por = null, whatsapp_codigo_ok_em = null,
        whatsapp_confirmado_em = now(), whatsapp_em_revisao_desde = null, whatsapp_em_revisao_numero = null
    where id = p_academia and whatsapp_a_confirmar is not null;
  perform set_config('guiatennis.mudanca_do_guia', '', true);
  delete from public.codigos_do_whatsapp where academia_id = p_academia;
  update public.problemas_na_ficha set resolvido_em = now(), resolucao = 'whatsapp_novo'
    where academia_id = p_academia and motivo = 'whatsapp' and resolvido_em is null;
end $$;

-- Recusado: o número sai da ficha e volta o de antes (ou fica sem WhatsApp).
create or replace function public.recusar_whatsapp_admin(p_academia uuid, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_no_ar boolean;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis recusa o WhatsApp.' using errcode = '42501';
  end if;
  select * into a from public.academias where id = p_academia;
  if a.whatsapp_a_confirmar is null then
    raise exception 'Essa academia não tem WhatsApp esperando.' using errcode = '22023';
  end if;
  v_no_ar := a.whatsapp_codigo_ok_em is not null and public.mesmo_whatsapp(a.phone, a.whatsapp_a_confirmar);
  perform set_config('guiatennis.mudanca_do_guia', p_academia::text, true);
  update public.academias
    set phone = case when v_no_ar then whatsapp_antes else phone end,
        dados_atualizados_em = case when v_no_ar then now() else dados_atualizados_em end,
        whatsapp_a_confirmar = null, whatsapp_antes = null, whatsapp_pedido_em = null,
        whatsapp_pedido_por = null, whatsapp_codigo_ok_em = null
    where id = p_academia;
  perform set_config('guiatennis.mudanca_do_guia', '', true);
  delete from public.codigos_do_whatsapp where academia_id = p_academia;
  perform public.aviso_para_a_equipe(p_academia, 'whatsapp-recusado:' || p_academia || ':' || public.hoje_em_brasilia(),
    'whatsapp_recusado', 'O WhatsApp novo saiu da ficha da ' || a.name, 'O WhatsApp novo não foi confirmado',
    public.email_p('O GuiaTennis não confirmou que o WhatsApp <strong>' || public.html_texto(a.whatsapp_a_confirmar)
      || '</strong> é da <strong>' || public.html_texto(a.name) || '</strong>, e ele '
      || case when v_no_ar then 'saiu da ficha' || case when a.whatsapp_antes is not null then '; voltou o ' || public.html_texto(a.whatsapp_antes) else '' end
              else 'não entrou na ficha' end || '.')
    || coalesce(public.email_p(public.html_texto(v_motivo)), '')
    || public.email_p('Se o número é da academia, fale com o GuiaTennis no WhatsApp.'),
    'O GuiaTennis não confirmou que o WhatsApp ' || a.whatsapp_a_confirmar || ' é da ' || a.name || ', e ele '
      || case when v_no_ar then 'saiu da ficha' || coalesce('; voltou o ' || a.whatsapp_antes, '') else 'não entrou na ficha' end
      || '.' || coalesce(E'\n\n' || v_motivo, ''),
    'Abrir a ficha', 'ficha');
end $$;

-- Desistir do número que já está no ar em confirmação: volta o de antes.
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
  perform public.exigir_funcao(p_academia, 'ficha');
  perform set_config('guiatennis.mudanca_do_guia', p_academia::text, true);
  update public.academias
    set phone = case when whatsapp_codigo_ok_em is not null and public.mesmo_whatsapp(phone, whatsapp_a_confirmar)
                     then whatsapp_antes else phone end,
        whatsapp_a_confirmar = null, whatsapp_antes = null, whatsapp_pedido_em = null,
        whatsapp_pedido_por = null, whatsapp_codigo_ok_em = null
    where id = p_academia;
  perform set_config('guiatennis.mudanca_do_guia', '', true);
  delete from public.codigos_do_whatsapp where academia_id = p_academia;
end $$;

-- 2. A disputa com dois códigos ----------------------------------------------
alter table public.pedidos_de_acesso add column if not exists numero_contestado text;
alter table public.pedidos_de_acesso add column if not exists responsavel_codigo_ok_em timestamptz;
alter table public.pedidos_de_acesso add column if not exists responsavel_numero text;

-- O responsável principal mais antigo: o código de quem administra fica
-- guardado no nome dele (qualquer responsável principal digita).
create or replace function public.responsavel_da_disputa(p_academia uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select v.user_id from public.academia_vinculos v
  where v.academia_id = p_academia and v.papel = 'principal'
  order by v.created_at limit 1;
$$;

-- Para onde vai o código: na disputa, o número que quem contestou informou;
-- para quem administra (e fora da disputa), o WhatsApp da ficha.
create or replace function public.whatsapp_do_pedido(p_user uuid, p_academia uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select public.numero_do_whatsapp(coalesce(
    (select coalesce(p.numero_contestado,
                     (select v.telefone_da_ficha from public.academia_vinculos v
                      where v.academia_id = p_academia and v.papel = 'principal' and v.telefone_da_ficha is not null
                      order by v.created_at limit 1))
     from public.pedidos_de_acesso p
     where p.user_id = p_user and p.academia_id = p_academia and p.destino = 'disputa'),
    (select phone from public.academias where id = p_academia)));
$$;

-- O código de quem administra, pelo WhatsApp do GuiaTennis (ligado). Um por
-- hora, até 3 em 3 dias, como o de quem contestou.
create or replace function public.codigo_do_responsavel(p_academia uuid, p_origem text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dono uuid := public.responsavel_da_disputa(p_academia);
begin
  if v_dono is null or not exists (select 1 from public.pedidos_de_acesso
                                   where academia_id = p_academia and destino = 'disputa') then
    return 'sem_disputa';
  end if;
  if not public.whatsapp_ligado() then
    return 'desligado';
  end if;
  if p_origem <> 'admin' then
    if exists (select 1 from public.whatsapp_a_enviar
               where user_id = v_dono and academia_id = p_academia and origem <> 'admin'
                 and criado_em > now() - interval '1 hour') then
      return 'espere';
    end if;
    if (select count(*) from public.whatsapp_a_enviar
        where user_id = v_dono and academia_id = p_academia and origem <> 'admin'
          and criado_em > now() - interval '3 days') >= 3 then
      return 'limite';
    end if;
  end if;
  return public.codigo_pelo_whatsapp(v_dono, p_academia, p_origem);
end $$;

-- Contestar agora pede o WhatsApp que a pessoa acha certo; o código vai para
-- ele, e quem administra recebe outro, no WhatsApp da ficha.
drop function if exists public.contestar_academia(uuid);
create or replace function public.contestar_academia(p_academia uuid, p_numero text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo text;
  a public.academias;
begin
  if not exists (select 1 from public.pedidos_de_acesso
                 where user_id = auth.uid() and academia_id = p_academia and destino = 'responsavel') then
    raise exception 'Peça para administrar a academia antes de contestar.' using errcode = '22023';
  end if;
  if public.numero_do_whatsapp(p_numero) is null then
    raise exception 'Informe o WhatsApp da academia com DDD.' using errcode = '22023';
  end if;
  update public.pedidos_de_acesso
    set destino = 'disputa', pedido_em = now(), numero_contestado = btrim(p_numero),
        codigo_ok_em = null, responsavel_codigo_ok_em = null, responsavel_numero = null
    where user_id = auth.uid() and academia_id = p_academia;
  v_codigo := public.codigo_da_disputa_pela_conta(auth.uid(), p_academia);
  perform public.aviso_de_disputa(p_academia, auth.uid(), v_codigo);
  perform public.codigo_do_responsavel(p_academia, 'disputa');
  select * into a from public.academias where id = p_academia;
  perform public.aviso_para_a_equipe(p_academia, 'disputa-responsavel:' || p_academia || ':' || public.hoje_em_brasilia(),
    'disputa_responsavel', 'Confirme o WhatsApp da ' || a.name, 'Confirme o WhatsApp da academia',
    public.email_p('Outra pessoa pediu para administrar a <strong>' || public.html_texto(a.name)
      || '</strong> no GuiaTennis Parceiros e contestou quem administra hoje.')
    || public.email_p('Para o GuiaTennis analisar, confirme o WhatsApp que está na ficha: digite, no GuiaTennis Parceiros, o código de 6 números mandado a ele. Até o GuiaTennis decidir, nada muda na academia.'),
    'Outra pessoa pediu para administrar a ' || a.name || E' no GuiaTennis Parceiros e contestou quem administra hoje.\n\n'
      || 'Para o GuiaTennis analisar, confirme o WhatsApp que está na ficha: digite, no GuiaTennis Parceiros, o código de 6 números mandado a ele. Até o GuiaTennis decidir, nada muda na academia.',
    'Confirmar o WhatsApp', 'painel');
  return v_codigo;
end $$;

-- "Mandar outro código", no cartão de quem administra.
create or replace function public.pedir_codigo_do_responsavel(p_academia uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia and papel = 'principal') then
    raise exception 'Só o responsável principal confirma o WhatsApp da academia.' using errcode = '42501';
  end if;
  return public.codigo_do_responsavel(p_academia, 'responsavel');
end $$;

-- Quem administra digita o código: guarda a prova e avisa o admin.
create or replace function public.confirmar_codigo_do_responsavel(p_academia uuid, p_codigo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.codigos_de_verificacao;
  a public.academias;
  v_codigo text := regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g');
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia and papel = 'principal') then
    raise exception 'Só o responsável principal confirma o WhatsApp da academia.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.pedidos_de_acesso where academia_id = p_academia and destino = 'disputa') then
    return 'sem_disputa';
  end if;
  if exists (select 1 from public.pedidos_de_acesso
             where academia_id = p_academia and destino = 'disputa' and responsavel_codigo_ok_em is not null) then
    return 'analise';
  end if;
  select k.* into c from public.codigos_de_verificacao k
    join public.academia_vinculos v on v.user_id = k.user_id and v.academia_id = k.academia_id and v.papel = 'principal'
    where k.academia_id = p_academia
    order by k.criado_em desc
    limit 1;
  if not found then
    return 'sem_codigo';
  end if;
  if c.criado_em < now() - interval '72 hours' then
    return 'venceu';
  end if;
  if c.tentativas >= 5 then
    return 'tentativas';
  end if;
  if length(v_codigo) <> 6 or extensions.crypt(v_codigo, c.codigo_hash) <> c.codigo_hash then
    update public.codigos_de_verificacao set tentativas = tentativas + 1
      where user_id = c.user_id and academia_id = p_academia;
    return 'errado';
  end if;
  select * into a from public.academias where id = p_academia;
  update public.pedidos_de_acesso set responsavel_codigo_ok_em = now(), responsavel_numero = a.phone
    where academia_id = p_academia and destino = 'disputa';
  delete from public.codigos_de_verificacao where user_id = c.user_id and academia_id = p_academia;
  perform public.aviso_ao_admin('disputa_responsavel:' || p_academia, 'disputa',
    'Disputa: quem administra confirmou o WhatsApp da ' || a.name, 'Quem administra confirmou o WhatsApp',
    public.email_p('Quem administra a <strong>' || public.html_texto(a.name) || '</strong> digitou o código mandado ao WhatsApp da ficha, <strong>'
      || public.html_texto(coalesce(a.phone, '')) || '</strong>.')
    || public.email_p('A academia não muda sozinha. Em Pendências, compare com o número de quem contestou e decida.'),
    'Quem administra a ' || a.name || ' digitou o código mandado ao WhatsApp da ficha, ' || coalesce(a.phone, '')
      || E'.\n\nA academia não muda sozinha. Em Pendências, compare com o número de quem contestou e decida.');
  return 'analise';
end $$;

-- A disputa das academias que a conta administra (o cartão do responsável).
create or replace function public.disputas_das_minhas_academias()
returns table (academia_id uuid, nome text, numero text, codigo_em timestamptz, codigo_ok_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.name, a.phone,
    (select k.criado_em from public.codigos_de_verificacao k
     where k.academia_id = a.id and k.user_id = public.responsavel_da_disputa(a.id)),
    (select max(p.responsavel_codigo_ok_em) from public.pedidos_de_acesso p
     where p.academia_id = a.id and p.destino = 'disputa')
  from public.academias a
  where exists (select 1 from public.academia_vinculos v
                where v.academia_id = a.id and v.user_id = auth.uid() and v.papel = 'principal')
    and exists (select 1 from public.pedidos_de_acesso p where p.academia_id = a.id and p.destino = 'disputa');
$$;

-- O admin gera (ou manda pelo WhatsApp do GuiaTennis) o código de quem
-- administra, como o de quem contestou.
create or replace function public.gerar_codigo_do_responsavel(p_academia uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dono uuid := public.responsavel_da_disputa(p_academia);
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis gera o código.' using errcode = '42501';
  end if;
  if v_dono is null or not exists (select 1 from public.pedidos_de_acesso
                                   where academia_id = p_academia and destino = 'disputa') then
    raise exception 'Essa academia não está em disputa.' using errcode = '22023';
  end if;
  return public.novo_codigo(v_dono, p_academia);
end $$;

create or replace function public.mandar_codigo_do_responsavel_admin(p_academia uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis manda o código.' using errcode = '42501';
  end if;
  return public.codigo_do_responsavel(p_academia, 'admin');
end $$;

-- O código certo de quem contestou (regra 221), agora com o número no aviso.
create or replace function public.confirmar_meu_codigo(p_codigo text, p_academia uuid default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.codigos_de_verificacao;
  v_disputa boolean;
  v_codigo text := regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g');
  a public.academias;
  x public.academia_acessos;
  v_quem text;
  v_numero text;
begin
  if not exists (select 1 from public.academia_acessos where user_id = auth.uid()) then
    raise exception 'Entre na sua conta do GuiaTennis Parceiros.' using errcode = '42501';
  end if;
  select k.* into c from public.codigos_de_verificacao k
    join public.pedidos_de_acesso p on p.user_id = k.user_id and p.academia_id = k.academia_id
    where k.user_id = auth.uid() and (p_academia is null or k.academia_id = p_academia)
    order by k.criado_em desc
    limit 1;
  if not found then
    if exists (select 1 from public.pedidos_de_acesso
               where user_id = auth.uid() and (p_academia is null or academia_id = p_academia)
                 and destino = 'disputa' and codigo_ok_em is not null) then
      return 'analise';
    end if;
    return 'sem_codigo';
  end if;
  v_disputa := exists (select 1 from public.pedidos_de_acesso
                       where user_id = auth.uid() and academia_id = c.academia_id and destino = 'disputa');
  if not v_disputa and exists (select 1 from public.academia_vinculos
                               where academia_id = c.academia_id and papel = 'principal') then
    delete from public.codigos_de_verificacao where user_id = auth.uid() and academia_id = c.academia_id;
    return 'sem_codigo';
  end if;
  if c.criado_em < now() - interval '72 hours' then
    return 'venceu';
  end if;
  if c.tentativas >= 5 then
    return 'tentativas';
  end if;
  if length(v_codigo) <> 6 or extensions.crypt(v_codigo, c.codigo_hash) <> c.codigo_hash then
    update public.codigos_de_verificacao set tentativas = tentativas + 1
      where user_id = auth.uid() and academia_id = c.academia_id;
    return 'errado';
  end if;
  if not v_disputa then
    perform public.ligar_conta_a_academia(auth.uid(), c.academia_id, true);
    return 'ok';
  end if;
  update public.pedidos_de_acesso set codigo_ok_em = now()
    where user_id = auth.uid() and academia_id = c.academia_id;
  delete from public.codigos_de_verificacao where user_id = auth.uid() and academia_id = c.academia_id;
  select * into a from public.academias where id = c.academia_id;
  select * into x from public.academia_acessos where user_id = auth.uid();
  v_quem := coalesce(x.nome_responsavel, x.email) || ' (' || coalesce(x.email, x.usuario) || ')';
  v_numero := coalesce((select numero_contestado from public.pedidos_de_acesso
                        where user_id = auth.uid() and academia_id = c.academia_id), 'o WhatsApp da academia');
  perform public.aviso_ao_admin('disputa_codigo:' || c.academia_id || ':' || auth.uid(), 'disputa',
    'Disputa: código confirmado na ' || a.name, 'Código confirmado na disputa',
    public.email_p('<strong>' || public.html_texto(v_quem) || '</strong> digitou o código certo na disputa da <strong>'
      || public.html_texto(a.name) || '</strong>: tem o WhatsApp <strong>' || public.html_texto(v_numero) || '</strong>, que informou como o da academia.')
    || public.email_p('A academia não muda sozinha. Em Pendências, compare com o WhatsApp de quem administra e decida.'),
    v_quem || ' digitou o código certo na disputa da ' || a.name || ': tem o WhatsApp ' || v_numero
    || E', que informou como o da academia.\n\nA academia não muda sozinha. Em Pendências, compare com o WhatsApp de quem administra e decida.');
  return 'analise';
end $$;

-- O admin dá a academia a quem contestou: o número que essa pessoa confirmou
-- vai para a ficha. Fora da disputa, como antes.
create or replace function public.aprovar_pedido_de_acesso(p_user uuid, p_academia uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia uuid;
  p public.pedidos_de_acesso;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis aprova pedidos.' using errcode = '42501';
  end if;
  v_academia := public.pedido_da_conta(p_user, p_academia);
  select * into p from public.pedidos_de_acesso
    where user_id = p_user and academia_id = v_academia and destino = 'disputa';
  if not found then
    perform public.ligar_conta_a_academia(p_user, v_academia, true);
    return;
  end if;
  delete from public.codigos_de_verificacao k
    where k.academia_id = v_academia
      and exists (select 1 from public.academia_vinculos v where v.user_id = k.user_id and v.academia_id = k.academia_id);
  perform public.vencer_disputa(p_user, v_academia);
  if p.codigo_ok_em is not null and public.numero_do_whatsapp(p.numero_contestado) is not null then
    perform set_config('guiatennis.mudanca_do_guia', v_academia::text, true);
    update public.academias
      set dados_atualizados_em = case when public.mesmo_whatsapp(phone, p.numero_contestado) then dados_atualizados_em else now() end,
          phone = p.numero_contestado, whatsapp_confirmado_em = now(),
          whatsapp_a_confirmar = null, whatsapp_antes = null, whatsapp_pedido_em = null,
          whatsapp_pedido_por = null, whatsapp_codigo_ok_em = null
      where id = v_academia;
    perform set_config('guiatennis.mudanca_do_guia', '', true);
    delete from public.codigos_do_whatsapp where academia_id = v_academia;
  end if;
end $$;

-- Manter com quem administra: o código de quem administra também sai.
create or replace function public.recusar_pedido_de_acesso(p_user uuid, p_academia uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia uuid;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis recusa pedidos.' using errcode = '42501';
  end if;
  v_academia := public.pedido_da_conta(p_user, p_academia);
  delete from public.codigos_de_verificacao where user_id = p_user and academia_id = v_academia;
  delete from public.pedidos_de_acesso where user_id = p_user and academia_id = v_academia;
  if not exists (select 1 from public.pedidos_de_acesso where academia_id = v_academia and destino = 'disputa') then
    delete from public.codigos_de_verificacao k
      where k.academia_id = v_academia
        and exists (select 1 from public.academia_vinculos v where v.user_id = k.user_id and v.academia_id = k.academia_id);
  end if;
end $$;

-- O aviso de disputa nova, com os dois códigos.
create or replace function public.aviso_de_disputa(p_academia uuid, p_user uuid, p_codigo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  x public.academia_acessos;
  v_quem text;
  v_numero text;
  v_o_que text;
begin
  select * into a from public.academias where id = p_academia;
  select * into x from public.academia_acessos where user_id = p_user;
  select numero_contestado into v_numero from public.pedidos_de_acesso where user_id = p_user and academia_id = p_academia;
  v_quem := coalesce(x.nome_responsavel, x.email) || ' (' || coalesce(x.email, x.usuario) || ')';
  v_o_que := case p_codigo
    when 'mandado' then 'Os códigos já saíram pelo WhatsApp do GuiaTennis: um para o número que quem contestou informou e outro para o WhatsApp da ficha, de quem administra.'
    when 'confirme_email' then 'Quem contestou ainda não confirmou o e-mail: confirmado, o código dele sai sozinho pelo WhatsApp.'
    else 'Em Pendências, mande um código para o número que quem contestou informou e outro para o WhatsApp da ficha, de quem administra.' end
    || ' A academia não muda sozinha: com os códigos, documentos e o que diz cada lado, analise e decida.';
  perform public.aviso_ao_admin('disputa:' || p_academia || ':' || p_user || ':' || public.hoje_em_brasilia(), 'disputa',
    'Disputa: ' || a.name, 'Academia em disputa',
    public.email_p('<strong>' || public.html_texto(v_quem) || '</strong> contesta quem administra a <strong>'
      || public.html_texto(a.name) || '</strong> no GuiaTennis Parceiros'
      || coalesce(' e informou o WhatsApp <strong>' || public.html_texto(v_numero) || '</strong> como o da academia', '')
      || ' (o da ficha é ' || public.html_texto(coalesce(a.phone, 'nenhum')) || ').')
    || public.email_p(public.html_texto(v_o_que)),
    v_quem || ' contesta quem administra a ' || a.name || ' no GuiaTennis Parceiros'
      || coalesce(' e informou o WhatsApp ' || v_numero || ' como o da academia', '')
      || ' (o da ficha é ' || coalesce(a.phone, 'nenhum') || E').\n\n' || v_o_que);
end $$;

-- Os pedidos da conta e do admin com os números e os dois códigos.
drop function if exists public.meus_pedidos_de_acesso();
create or replace function public.meus_pedidos_de_acesso()
returns table (academia_id uuid, nome text, destino text, pedido_em timestamptz,
  status text, codigo_em timestamptz, codigo_ok_em timestamptz, numero_contestado text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.academia_id, coalesce(a.name, p.nome), p.destino, p.pedido_em, a.status, k.criado_em, p.codigo_ok_em, p.numero_contestado
  from public.pedidos_de_acesso p
  left join public.academias a on a.id = p.academia_id
  left join public.codigos_de_verificacao k on k.user_id = p.user_id and k.academia_id = p.academia_id
  where p.user_id = auth.uid()
  order by p.pedido_em;
$$;

drop function if exists public.pedidos_de_acesso_admin();
create or replace function public.pedidos_de_acesso_admin()
returns table (user_id uuid, academia_id uuid, nome text, destino text, pedido_em timestamptz,
  codigo_em timestamptz, nome_responsavel text, tratamento text, cargo text, email text,
  usuario text, whatsapp text, telefone_antes text,
  whatsapp_em timestamptz, whatsapp_enviado_em timestamptz, whatsapp_origem text, whatsapp_erro text,
  codigo_ok_em timestamptz, numero_contestado text, responsavel_codigo_em timestamptz,
  responsavel_codigo_ok_em timestamptz, responsavel_numero text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.academia_id, coalesce(a.name, p.nome), p.destino, p.pedido_em, k.criado_em,
    x.nome_responsavel, x.tratamento, x.cargo, x.email, x.usuario, x.whatsapp,
    (select v.telefone_da_ficha from public.academia_vinculos v
     where v.academia_id = p.academia_id and v.papel = 'principal' and v.telefone_da_ficha is not null
     order by v.created_at limit 1),
    w.criado_em, w.enviado_em, w.origem, w.erro, p.codigo_ok_em, p.numero_contestado,
    case when p.destino = 'disputa' then
      (select r.criado_em from public.codigos_de_verificacao r
       where r.academia_id = p.academia_id and r.user_id = public.responsavel_da_disputa(p.academia_id)) end,
    p.responsavel_codigo_ok_em, p.responsavel_numero
  from public.pedidos_de_acesso p
  join public.academia_acessos x on x.user_id = p.user_id
  left join public.academias a on a.id = p.academia_id
  left join public.codigos_de_verificacao k on k.user_id = p.user_id and k.academia_id = p.academia_id
  left join lateral (select z.criado_em, z.enviado_em, z.origem, z.erro from public.whatsapp_a_enviar z
                     where z.user_id = p.user_id and z.academia_id = p.academia_id
                     order by z.criado_em desc limit 1) w on true
  where public.eh_admin()
  order by p.pedido_em;
$$;

revoke all on function public.responsavel_da_disputa(uuid) from public, anon, authenticated;
revoke all on function public.codigo_do_responsavel(uuid, text) from public, anon, authenticated;
revoke all on function public.whatsapp_do_pedido(uuid, uuid) from public, anon, authenticated;
revoke all on function public.whatsapp_novo_na_ficha(uuid) from public, anon, authenticated;
revoke all on function public.aviso_de_disputa(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.contestar_academia(uuid, text), public.pedir_codigo_do_responsavel(uuid),
  public.confirmar_codigo_do_responsavel(uuid, text), public.disputas_das_minhas_academias(),
  public.gerar_codigo_do_responsavel(uuid), public.mandar_codigo_do_responsavel_admin(uuid),
  public.confirmar_meu_codigo(text, uuid), public.aprovar_pedido_de_acesso(uuid, uuid),
  public.recusar_pedido_de_acesso(uuid, uuid), public.meus_pedidos_de_acesso(),
  public.pedidos_de_acesso_admin(), public.confirmar_whatsapp_da_ficha(uuid, text),
  public.recusar_whatsapp_admin(uuid, text), public.desistir_do_whatsapp_novo(uuid) from public, anon;
grant execute on function public.contestar_academia(uuid, text), public.pedir_codigo_do_responsavel(uuid),
  public.confirmar_codigo_do_responsavel(uuid, text), public.disputas_das_minhas_academias(),
  public.gerar_codigo_do_responsavel(uuid), public.mandar_codigo_do_responsavel_admin(uuid),
  public.confirmar_meu_codigo(text, uuid), public.aprovar_pedido_de_acesso(uuid, uuid),
  public.recusar_pedido_de_acesso(uuid, uuid), public.meus_pedidos_de_acesso(),
  public.pedidos_de_acesso_admin(), public.confirmar_whatsapp_da_ficha(uuid, text),
  public.recusar_whatsapp_admin(uuid, text), public.desistir_do_whatsapp_novo(uuid)
  to authenticated;

notify pgrst, 'reload schema';
