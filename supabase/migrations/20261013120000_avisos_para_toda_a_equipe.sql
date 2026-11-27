-- ============================================================
-- Avisos para todas as pessoas da academia (pedido do Breno em 13/10/2026:
-- "eu quero que ao alterar o plano os administradores da academia recebam
-- um email no nosso estilo… se atualizações sobre as academias não forem
-- todos os administradores que recebem os emails, mude isso para todos
-- receberem, se quando tiver um novo acesso na mesma academia,
-- administradores que já tem o acesso receber informando sobre a outra
-- pessoa")
-- ============================================================
-- Como o Google Business Profile, que avisa todos os donos e gerentes do
-- perfil quando entra alguém novo, e o Booking para Parceiros e a Shopify,
-- que mandam o resumo do plano novo a quem administra a conta:
--
--   plano          o plano da academia mudou → todos que administram, com
--                  o que a academia ganha ou deixa de ter
--   pessoa_nova    alguém passou a administrar a academia → quem já
--                  administrava (menos quem incluiu a pessoa)
--   pedido de acesso (antes, só o responsável principal) → todos: o
--                  responsável com "Ver o pedido"; a equipe fica sabendo
--   resposta do pedido para tirar do guia (antes, só quem pediu) → todos
--
-- Avaliação nova, o lembrete da ficha parada e o resumo do mês já iam para
-- todos. Como os outros avisos da academia: só para o e-mail confirmado,
-- com os avisos ligados, e com "Não quero mais receber".
-- Pode rodar de novo sem estragar nada.

-- Ajudantes -------------------------------------------------------------------
create or replace function public.nome_do_plano(p_plano text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_plano when 'premium' then 'Premium' when 'completo' then 'Completo' else 'Básico' end;
$$;

create or replace function public.nivel_do_plano(p_plano text)
returns int
language sql
immutable
set search_path = ''
as $$
  select case p_plano when 'premium' then 3 when 'completo' then 2 else 1 end;
$$;

-- O que a academia ganha (subindo) ou deixa de ter (descendo) entre dois
-- planos, na ordem da página Planos. Mesma régua do site (LIMITES_DO_PLANO
-- e oQueMudaAoBaixarOPlano).
create or replace function public.o_que_muda_no_plano(p_de text, p_para text, out html text, out texto text)
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_de int := public.nivel_do_plano(p_de);
  v_para int := public.nivel_do_plano(p_para);
  v_itens text[];
begin
  select coalesce(array_agg(t.item order by t.ordem), '{}') into v_itens
  from (values
    (1, 2, 'Todas as comodidades na ficha (no Básico, até 3)'),
    (2, 2, 'Até 5 fotos (no Básico, 3)'),
    (3, 2, 'Instagram e site'),
    (4, 2, 'A regra de cancelamento'),
    (5, 2, 'Como chegar: fachada, entrada e onde estacionar'),
    (6, 3, 'O selo dourado ao lado do nome'),
    (7, 3, 'O topo da busca da região, marcado como “Patrocinado”'),
    (8, 3, 'Promoções na ficha e na busca'),
    (9, 3, 'Todos os números em Desempenho'),
    (10, 3, 'O relatório completo do mês por e-mail')) as t(ordem, nivel, item)
  where t.nivel > least(v_de, v_para) and t.nivel <= greatest(v_de, v_para);
  v_itens := v_itens || ('Pessoas com acesso: até ' || public.limite_de_pessoas(p_para)
    || ' (antes, até ' || public.limite_de_pessoas(p_de) || ')');
  select '<ul style="margin:0 0 14px;padding-left:20px;font-size:15px;line-height:1.6;color:#1F2A24">'
           || string_agg('<li>' || public.html_texto(i) || '</li>', '') || '</ul>',
         string_agg('• ' || i, E'\n')
    into html, texto
  from unnest(v_itens) as i;
end $$;

-- 1. O plano mudou → todos que administram a academia --------------------------
-- O admin às vezes toca num plano e volta: o e-mail que ainda não saiu (o
-- relógio manda a cada minuto) é trocado pelo novo, contando do plano de
-- antes do primeiro toque; se voltou ao mesmo plano, nenhum e-mail sai.
create or replace function public.aviso_de_plano_novo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_para text := case when new.plano in ('completo', 'premium') then new.plano else 'basico' end;
  v_de text;
  v_sobe boolean;
  v_muda record;
  v_link text;
  v_parar text;
  v_corpo text;
  v_pessoas int;
  v_limite int;
  v_pendente text;
  r record;
begin
  v_link := public.site_dos_emails() || '/parceiros/plano?abrir=' || right(replace(new.id::text, '-', ''), 8)
    || '&utm_source=Email-plano';
  select count(*) into v_pessoas from public.academia_vinculos where academia_id = new.id;
  v_limite := public.limite_de_pessoas(v_para);
  for r in
    select q.user_id, q.email, q.token_avisos, x.nome_responsavel
    from public.quem_recebe_da_academia(new.id) q
    join public.academia_acessos x on x.user_id = q.user_id
  loop
    v_de := case when old.plano in ('completo', 'premium') then old.plano else 'basico' end;
    -- O e-mail desta mudança que ainda espera na fila sai dela.
    select split_part(e.chave, ':', 4) into v_pendente
      from public.emails_a_enviar e
      where e.tipo = 'plano' and e.chave like 'plano:' || new.id || ':' || r.user_id || ':%'
        and e.enviado_em is null and e.pedido_id is null and e.tentativas = 0
      order by e.criado_em limit 1;
    if v_pendente is not null then
      v_de := v_pendente;
      delete from public.emails_a_enviar e
        where e.tipo = 'plano' and e.chave like 'plano:' || new.id || ':' || r.user_id || ':%'
          and e.enviado_em is null and e.pedido_id is null and e.tentativas = 0;
    end if;
    continue when v_de = v_para;

    v_sobe := public.nivel_do_plano(v_para) > public.nivel_do_plano(v_de);
    select * into v_muda from public.o_que_muda_no_plano(v_de, v_para);
    v_parar := public.link_parar_avisos(r.token_avisos, 'parceiros');
    v_corpo := case when nullif(btrim(coalesce(r.nome_responsavel, '')), '') is not null
                 then public.email_p('Olá, ' || public.html_texto(split_part(btrim(r.nome_responsavel), ' ', 1)) || '!') else '' end
      || public.email_p('O plano da <strong>' || public.html_texto(new.name) || '</strong> no GuiaTennis passou do <strong>'
           || public.nome_do_plano(v_de) || '</strong> para o <strong>' || public.nome_do_plano(v_para) || '</strong>.')
      || public.email_p(case when v_sobe then 'A academia passa a ter:'
                             else 'Com o ' || public.nome_do_plano(v_para) || ', a academia deixa de ter:' end)
      || v_muda.html
      || case when v_sobe then '' else
           public.email_p('Nada é apagado: o que vocês preencheram continua guardado e volta a aparecer se o plano subir de novo.') end
      || case when v_pessoas > v_limite then
           public.email_p('Hoje ' || v_pessoas || ' pessoas têm acesso à academia, e o ' || public.nome_do_plano(v_para)
             || ' permite até ' || v_limite || ': o responsável principal tira quem passar do limite em <strong>Pessoas</strong>.') else '' end;
    perform public.por_na_fila(
      'plano:' || new.id || ':' || r.user_id || ':' || v_de || ':' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint,
      'plano', r.email,
      case when v_sobe then 'A ' || new.name || ' agora está no plano ' || public.nome_do_plano(v_para)
           else 'O plano da ' || new.name || ' mudou para o ' || public.nome_do_plano(v_para) end,
      public.email_montado('Plano novo: ' || public.nome_do_plano(v_para), v_corpo, 'Ver o plano', v_link,
        'Você recebe este e-mail porque administra a ' || public.html_texto(new.name)
        || ' no GuiaTennis Parceiros. <a href="' || public.html_texto(v_parar)
        || '" style="color:#6B6458">Não quero mais receber avisos por e-mail</a>.'),
      'O plano da ' || new.name || ' no GuiaTennis passou do ' || public.nome_do_plano(v_de)
        || ' para o ' || public.nome_do_plano(v_para) || E'.\n\n'
        || case when v_sobe then 'A academia passa a ter:' else 'Com o ' || public.nome_do_plano(v_para) || ', a academia deixa de ter:' end
        || E'\n' || v_muda.texto
        || case when v_sobe then '' else E'\n\nNada é apagado: o que vocês preencheram continua guardado e volta a aparecer se o plano subir de novo.' end
        || case when v_pessoas > v_limite then E'\n\nHoje ' || v_pessoas || ' pessoas têm acesso à academia, e o '
             || public.nome_do_plano(v_para) || ' permite até ' || v_limite || ': o responsável principal tira quem passar do limite em Pessoas.' else '' end
        || E'\n\nVer o plano: ' || v_link
        || E'\n\nNão quer mais receber avisos por e-mail? ' || v_parar,
      v_parar);
  end loop;
  return new;
exception when others then
  raise warning 'aviso de plano novo: %', sqlerrm;
  return new;
end $$;

drop trigger if exists aviso_de_plano_novo on public.academias;
create trigger aviso_de_plano_novo
  after update of plano on public.academias
  for each row
  when (coalesce(old.plano, 'basico') is distinct from coalesce(new.plano, 'basico'))
  execute function public.aviso_de_plano_novo();

-- 2. Pessoa nova na academia → quem já administrava ----------------------------
-- Vale para todo jeito de entrar: o responsável incluiu em Pessoas, aceitou
-- o pedido, o GuiaTennis aprovou ou a pessoa digitou o código. Quem fez a
-- inclusão não recebe (já sabe). Na disputa, quem administrava sai antes de
-- a pessoa nova entrar: ninguém recebe este aviso.
create or replace function public.aviso_de_pessoa_nova()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia text;
  p public.academia_acessos;
  v_quem text;
  v_email text;
  v_link text := public.site_dos_emails() || '/parceiros/pessoas?abrir=' || right(replace(new.academia_id::text, '-', ''), 8)
    || '&utm_source=Email-pessoa';
  v_parar text;
  v_corpo text;
  v_dia text := public.hoje_em_brasilia()::text;
  r record;
begin
  select name into v_academia from public.academias where id = new.academia_id;
  select * into p from public.academia_acessos where user_id = new.user_id;
  if v_academia is null or p.user_id is null then
    return new;
  end if;
  v_quem := coalesce(nullif(btrim(p.nome_responsavel), ''), case when public.email_valido(p.email) then p.email end, 'Uma pessoa');
  v_email := case when public.email_valido(p.email) and lower(p.email) <> lower(v_quem) then p.email end;
  for r in
    select q.user_id, q.email, q.token_avisos, v.papel
    from public.quem_recebe_da_academia(new.academia_id) q
    join public.academia_vinculos v on v.user_id = q.user_id and v.academia_id = new.academia_id
    where q.user_id <> new.user_id and q.user_id is distinct from auth.uid()
  loop
    v_parar := public.link_parar_avisos(r.token_avisos, 'parceiros');
    v_corpo := public.email_p('<strong>' || public.html_texto(v_quem) || '</strong>'
        || case when v_email is not null then ' (' || public.html_texto(v_email) || ')' else '' end
        || ' agora também administra a <strong>' || public.html_texto(v_academia) || '</strong> no GuiaTennis Parceiros'
        || case when new.papel = 'principal' then ', como responsável principal.' else '.' end)
      || public.email_p(case when r.papel = 'principal'
           then 'Não conhece essa pessoa? Tire o acesso dela em <strong>Pessoas</strong>, no painel da academia.'
           else 'Não conhece essa pessoa? Fale com o responsável principal da academia ou com o GuiaTennis.' end);
    perform public.por_na_fila(
      'pessoa-nova:' || new.academia_id || ':' || new.user_id || ':' || r.user_id || ':' || v_dia, 'pessoa_nova', r.email,
      v_quem || ' agora administra a ' || v_academia || ' com você',
      public.email_montado('Pessoa nova na academia', v_corpo,
        case when r.papel = 'principal' then 'Ver as pessoas' else 'Abrir o GuiaTennis Parceiros' end,
        case when r.papel = 'principal' then v_link
             else public.site_dos_emails() || '/parceiros/painel?utm_source=Email-pessoa' end,
        'Você recebe este e-mail porque administra a ' || public.html_texto(v_academia)
        || ' no GuiaTennis Parceiros. <a href="' || public.html_texto(v_parar)
        || '" style="color:#6B6458">Não quero mais receber avisos por e-mail</a>.'),
      v_quem || case when v_email is not null then ' (' || v_email || ')' else '' end
        || ' agora também administra a ' || v_academia || ' no GuiaTennis Parceiros'
        || case when new.papel = 'principal' then ', como responsável principal.' else '.' end
        || E'\n\n' || case when r.papel = 'principal'
             then 'Não conhece essa pessoa? Tire o acesso dela em Pessoas, no painel da academia: ' || v_link
             else 'Não conhece essa pessoa? Fale com o responsável principal da academia ou com o GuiaTennis.' end
        || E'\n\nNão quer mais receber avisos por e-mail? ' || v_parar,
      v_parar);
  end loop;
  return new;
exception when others then
  raise warning 'aviso de pessoa nova: %', sqlerrm;
  return new;
end $$;

drop trigger if exists aviso_de_pessoa_nova on public.academia_vinculos;
create trigger aviso_de_pessoa_nova
  after insert on public.academia_vinculos
  for each row execute function public.aviso_de_pessoa_nova();

-- 3. Pedido de acesso → todos que administram ----------------------------------
-- (Igual ao do SQL 20261005160000, que mandava só ao responsável principal.)
-- Quem aceita ou recusa continua sendo o responsável; a equipe fica sabendo.
create or replace function public.aviso_de_pedido_de_acesso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  p public.academia_acessos;
  c public.emails_configuracao;
  v_quem text;
  v_dados text;
  v_link text;
  v_corpo text;
  v_principal text;
  v_dia text := public.hoje_em_brasilia()::text;
  v_parar text;
  r record;
begin
  select * into a from public.academias where id = new.academia_id;
  select * into p from public.academia_acessos where user_id = new.user_id;
  if a.id is null or p.user_id is null then
    return new;
  end if;
  v_quem := coalesce(nullif(btrim(p.nome_responsavel), ''), p.email, 'Uma pessoa');
  v_dados := concat_ws(' · ', nullif(btrim(coalesce(p.cargo, '')), ''),
    case when public.email_valido(p.email) then p.email end);

  if new.destino = 'responsavel' then
    select nullif(btrim(x.nome_responsavel), '') into v_principal
      from public.academia_vinculos v join public.academia_acessos x on x.user_id = v.user_id
      where v.academia_id = new.academia_id and v.papel = 'principal' limit 1;
    for r in
      select q.user_id, q.email, q.token_avisos, v.papel
      from public.quem_recebe_da_academia(new.academia_id) q
      join public.academia_vinculos v on v.user_id = q.user_id and v.academia_id = new.academia_id
    loop
      continue when r.user_id = new.user_id;
      v_parar := public.link_parar_avisos(r.token_avisos, 'parceiros');
      v_link := public.site_dos_emails() || case when r.papel = 'principal' then '/parceiros/pessoas' else '/parceiros/painel' end
        || '?utm_source=Email-pedido';
      v_corpo := public.email_p('<strong>' || public.html_texto(v_quem) || '</strong>'
          || case when v_dados <> '' then ' (' || public.html_texto(v_dados) || ')' else '' end
          || ' pediu para administrar a <strong>' || public.html_texto(a.name) || '</strong> com você no GuiaTennis Parceiros.')
        || public.email_p(case when r.papel = 'principal'
             then 'Se a pessoa trabalha com você, aceite em <strong>Pessoas</strong>, no painel da academia. Se não conhece, recuse: ela não vê nada da academia.'
             else 'Quem aceita ou recusa é o responsável principal' || coalesce(' (' || public.html_texto(v_principal) || ')', '')
                  || '. Se vocês não conhecem essa pessoa, avise o responsável.' end);
      perform public.por_na_fila(
        'pedido:' || new.user_id || ':' || new.academia_id || ':' || r.user_id || ':' || v_dia,
        case when r.papel = 'principal' then 'pedido_responsavel' else 'pedido_equipe' end, r.email,
        v_quem || ' pediu acesso à ' || a.name,
        public.email_montado('Pedido de acesso', v_corpo,
          case when r.papel = 'principal' then 'Ver o pedido' else 'Abrir o GuiaTennis Parceiros' end, v_link,
          'Você recebe este e-mail porque administra a ' || public.html_texto(a.name)
          || ' no GuiaTennis Parceiros. <a href="' || public.html_texto(v_parar)
          || '" style="color:#6B6458">Não quero mais receber avisos por e-mail</a>.'),
        v_quem || case when v_dados <> '' then ' (' || v_dados || ')' else '' end
          || ' pediu para administrar a ' || a.name || E' com você no GuiaTennis Parceiros.\n\n'
          || case when r.papel = 'principal'
               then 'Se a pessoa trabalha com você, aceite em Pessoas, no painel da academia. Se não conhece, recuse.'
                    || E'\n\nVer o pedido: ' || v_link
               else 'Quem aceita ou recusa é o responsável principal' || coalesce(' (' || v_principal || ')', '')
                    || '. Se vocês não conhecem essa pessoa, avise o responsável.' end
          || E'\n\nNão quer mais receber avisos por e-mail? ' || v_parar,
        v_parar);
    end loop;
  else
    -- Para o GuiaTennis conferir: vai para o e-mail do admin.
    select * into c from public.emails_configuracao where id;
    v_link := public.site_dos_emails() || '/?utm_source=Email-pedido';
    v_dados := concat_ws(' · ', v_dados,
      case when coalesce(p.whatsapp, '') <> '' then 'WhatsApp ' || p.whatsapp end);
    v_corpo := public.email_p('<strong>' || public.html_texto(v_quem) || '</strong>'
        || case when v_dados <> '' then ' (' || public.html_texto(v_dados) || ')' else '' end
        || case when a.status = 'published'
             then ' pediu para administrar a <strong>' || public.html_texto(a.name) || '</strong>.'
             else ' cadastrou a <strong>' || public.html_texto(a.name) || '</strong> e pediu para administrar.' end)
      || public.email_p(case when a.status = 'published'
           then 'Confira em <strong>Pedidos para administrar</strong>, no painel do admin, e gere o código.'
           else 'Confira a academia nas pendentes do painel do admin e publique: quem pediu passa a administrar.' end);
    perform public.por_na_fila(
      'pedido-guiatennis:' || new.user_id || ':' || new.academia_id || ':' || v_dia,
      'pedido_guiatennis', coalesce(c.admin, 'guiatennis1@gmail.com'),
      case when a.status = 'published' then 'Pedido para administrar a ' || a.name
           else 'Academia nova para aprovar: ' || a.name end,
      public.email_montado(case when a.status = 'published' then 'Pedido para administrar' else 'Academia nova para aprovar' end,
        v_corpo, 'Abrir o GuiaTennis', v_link, 'Aviso automático do GuiaTennis Parceiros.'),
      v_quem || case when v_dados <> '' then ' (' || v_dados || ')' else '' end
        || case when a.status = 'published' then ' pediu para administrar a ' || a.name || '.'
                else ' cadastrou a ' || a.name || ' e pediu para administrar.' end
        || E'\n\nAbrir o GuiaTennis: ' || v_link);
  end if;
  return new;
exception when others then
  raise warning 'aviso de pedido de acesso: %', sqlerrm;
  return new;
end $$;

-- 4. Resposta do pedido para tirar do guia → todos ------------------------------
-- (Igual ao do SQL 20261008150000, que respondia só a quem pediu.) As outras
-- pessoas da academia ficam sabendo do pedido e do que o GuiaTennis decidiu.
-- Quem recebe é guardado antes de a ficha ser apagada (os vínculos vão
-- junto com ela).
create or replace function public.resolver_pedido_para_sair(p_id uuid, p_remover boolean, p_resposta text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.pedidos_para_sair;
  v_email text;
  v_nome text;
  v_quem text;
  v_resposta text := nullif(btrim(coalesce(p_resposta, '')), '');
  v_outros jsonb := '[]'::jsonb;
  v_parar text;
  o jsonb;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis resolve esse pedido.' using errcode = '42501';
  end if;
  select * into p from public.pedidos_para_sair where id = p_id and resolvido_em is null;
  if not found then
    raise exception 'Pedido não encontrado ou já resolvido.' using errcode = '22023';
  end if;
  select x.email, x.nome_responsavel into v_email, v_nome from public.academia_acessos x where x.user_id = p.user_id;
  v_quem := coalesce(nullif(btrim(v_nome), ''), 'O responsável principal');
  if p.academia_id is not null then
    select coalesce(jsonb_agg(jsonb_build_object('user_id', q.user_id, 'email', q.email, 'token', q.token_avisos)), '[]'::jsonb)
      into v_outros
      from public.quem_recebe_da_academia(p.academia_id) q
      where q.user_id <> p.user_id;
  end if;
  update public.pedidos_para_sair
    set resolvido_em = now(), resolucao = case when p_remover then 'removida' else 'mantida' end, resposta = v_resposta
    where id = p_id;
  if p_remover and p.academia_id is not null then
    delete from public.academias where id = p.academia_id;
  end if;
  -- A resposta para quem pediu.
  begin
    perform public.por_na_fila('sair-resposta:' || p_id, 'pedido_para_sair_resposta', v_email,
      case when p_remover then 'A ' || p.academia_nome || ' saiu do GuiaTennis'
           else 'Sobre o pedido para tirar a ' || p.academia_nome || ' do GuiaTennis' end,
      public.email_montado(case when p_remover then 'A academia saiu do guia' else 'A academia continua no guia' end,
        public.email_p('Olá' || coalesce(', ' || public.html_texto(split_part(btrim(v_nome), ' ', 1)), '') || '!')
        || case when p_remover
             then public.email_p('Como você pediu, a <strong>' || public.html_texto(p.academia_nome) || '</strong> não aparece mais no GuiaTennis.')
             else public.email_p('A <strong>' || public.html_texto(p.academia_nome) || '</strong> continua no GuiaTennis.')
                  || coalesce(public.email_p(public.html_texto(v_resposta)), '')
                  || public.email_p('Para tirar a ficha da busca por um tempo, use Suas academias › Pausar no site.') end,
        case when p_remover then null else 'Abrir o GuiaTennis Parceiros' end,
        case when p_remover then null else public.site_dos_emails() || '/parceiros/academias' end,
        'Aviso automático do GuiaTennis Parceiros.'),
      case when p_remover then 'Como você pediu, a ' || p.academia_nome || ' não aparece mais no GuiaTennis.'
           else 'A ' || p.academia_nome || ' continua no GuiaTennis.' || coalesce(E'\n\n' || v_resposta, '') end);
  exception when others then
    raise warning 'resposta do pedido para sair: %', sqlerrm;
  end;
  -- E para as outras pessoas da academia.
  for o in select * from jsonb_array_elements(v_outros) loop
    begin
      v_parar := public.link_parar_avisos((o->>'token')::uuid, 'parceiros');
      perform public.por_na_fila('sair-resposta:' || p_id || ':' || (o->>'user_id'), 'pedido_para_sair_resposta', o->>'email',
        case when p_remover then 'A ' || p.academia_nome || ' saiu do GuiaTennis'
             else 'A ' || p.academia_nome || ' continua no GuiaTennis' end,
        public.email_montado(case when p_remover then 'A academia saiu do guia' else 'A academia continua no guia' end,
          case when p_remover
            then public.email_p('A pedido de <strong>' || public.html_texto(v_quem) || '</strong>, a <strong>'
                   || public.html_texto(p.academia_nome) || '</strong> não aparece mais no GuiaTennis. A ficha foi apagada, com as avaliações.')
            else public.email_p('<strong>' || public.html_texto(v_quem) || '</strong> pediu para tirar a <strong>'
                   || public.html_texto(p.academia_nome) || '</strong> do GuiaTennis, e ela continua no guia.')
                 || coalesce(public.email_p(public.html_texto(v_resposta)), '') end,
          case when p_remover then null else 'Abrir o GuiaTennis Parceiros' end,
          case when p_remover then null else public.site_dos_emails() || '/parceiros/academias' end,
          case when p_remover then 'Você recebe este e-mail porque administrava a ' else 'Você recebe este e-mail porque administra a ' end
          || public.html_texto(p.academia_nome) || ' no GuiaTennis Parceiros. <a href="' || public.html_texto(v_parar)
          || '" style="color:#6B6458">Não quero mais receber avisos por e-mail</a>.'),
        case when p_remover
          then 'A pedido de ' || v_quem || ', a ' || p.academia_nome || ' não aparece mais no GuiaTennis. A ficha foi apagada, com as avaliações.'
          else v_quem || ' pediu para tirar a ' || p.academia_nome || ' do GuiaTennis, e ela continua no guia.'
               || coalesce(E'\n\n' || v_resposta, '') end
          || E'\n\nNão quer mais receber avisos por e-mail? ' || v_parar,
        v_parar);
    exception when others then
      raise warning 'resposta do pedido para sair (equipe): %', sqlerrm;
    end;
  end loop;
end $$;

-- Permissões ------------------------------------------------------------------
revoke all on function public.nome_do_plano(text) from public, anon, authenticated;
revoke all on function public.nivel_do_plano(text) from public, anon, authenticated;
revoke all on function public.o_que_muda_no_plano(text, text) from public, anon, authenticated;
revoke all on function public.aviso_de_plano_novo() from public, anon, authenticated;
revoke all on function public.aviso_de_pessoa_nova() from public, anon, authenticated;
revoke all on function public.aviso_de_pedido_de_acesso() from public, anon, authenticated;
revoke all on function public.resolver_pedido_para_sair(uuid, boolean, text) from public, anon;
grant execute on function public.resolver_pedido_para_sair(uuid, boolean, text) to authenticated;

notify pgrst, 'reload schema';
