-- Revisão do português nos e-mails (regra 258, 13/11/2026)
--
-- A regra 252 revisou os textos do site; os e-mails, que saem do banco,
-- ficaram de fora. Aqui, as mesmas regras: sem "pôs", crase em "Responder à
-- avaliação", "este" no lugar de "esse" para o próprio e-mail, frase com
-- sujeito ("Se for recusado", "Depois da troca", "assim que confirmar"),
-- "nem" em frase negativa, "a conhece", "poderia", "pelo chat de ajuda",
-- "no começo de cada mês", "ignore este e-mail" e "de fato".
-- Também: o link do aviso de responsável principal vai a /parceiros/acessos
-- (a página "Pessoas" virou "Acessos" em 13/10/2026; o endereço antigo
-- continua funcionando).
--
-- Cada função abaixo é a versão mais nova (da migração indicada), só com o
-- texto trocado. "create or replace" mantém as permissões e os gatilhos.
-- Pode rodar de novo sem estragar.

-- aviso_de_avaliacao_nova (de 20261005160000_avisos_por_email.sql)
create or replace function public.aviso_de_avaliacao_nova()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia text;
  v_nome text;
  v_comentario text;
  v_estrelas text;
  v_link text := public.site_dos_emails() || '/parceiros/painel?utm_source=Email-avaliacao';
  v_corpo text;
  r record;
begin
  select name into v_academia from public.academias where id = new.academia_id;
  if v_academia is null then
    return new;
  end if;
  v_nome := coalesce(nullif(btrim(new.nome_autor), ''), 'Um jogador');
  v_comentario := left(btrim(coalesce(new.comment, '')), 600);
  v_estrelas := repeat('★', new.stars) || repeat('☆', 5 - new.stars);
  v_corpo := public.email_p('<strong>' || public.html_texto(v_nome) || '</strong> avaliou a <strong>'
               || public.html_texto(v_academia) || '</strong> no GuiaTennis:')
    || '<p style="margin:0 0 4px;font-size:24px;letter-spacing:2px;color:#C9A227">' || v_estrelas || '</p>'
    || '<p style="margin:0 0 12px;font-size:13px;color:#6B6458">' || new.stars || ' de 5</p>'
    || case when v_comentario <> '' then
         '<p style="margin:0 0 14px;padding:12px 14px;background:#F6F1E7;border-radius:10px;font-size:15px;line-height:1.55;color:#1F2A24">“'
         || public.html_texto(v_comentario) || '”</p>' else '' end
    || public.email_p('Responder mostra aos próximos jogadores que a academia cuida de quem joga lá. A resposta aparece embaixo da avaliação, no site.')
    || case when new.stars <= 2 then
         public.email_p('A avaliação não parece ser de quem jogou na academia? No painel, toque em <strong>Pedir análise</strong> no cartão da avaliação.') else '' end;
  for r in select * from public.quem_recebe_da_academia(new.academia_id) loop
    perform public.por_na_fila(
      'avaliacao:' || new.id || ':' || r.user_id, 'avaliacao', r.email,
      v_academia || ' recebeu uma avaliação nova (' || new.stars || ' de 5)',
      public.email_montado('Avaliação nova', v_corpo, 'Responder à avaliação', v_link,
        'Você recebe este e-mail porque administra a ' || public.html_texto(v_academia)
        || ' no GuiaTennis Parceiros. <a href="' || public.html_texto(public.link_parar_avisos(r.token_avisos, 'parceiros'))
        || '" style="color:#6B6458">Não quero mais receber avisos por e-mail</a>.'),
      v_nome || ' avaliou a ' || v_academia || ' no GuiaTennis: ' || v_estrelas || ' (' || new.stars || ' de 5)'
        || case when v_comentario <> '' then E'\n\n"' || v_comentario || '"' else '' end
        || E'\n\nResponda pelo painel: ' || v_link
        || E'\n\nNão quer mais receber avisos por e-mail? ' || public.link_parar_avisos(r.token_avisos, 'parceiros'),
      public.link_parar_avisos(r.token_avisos, 'parceiros'));
  end loop;
  return new;
exception when others then
  raise warning 'aviso de avaliação nova: %', sqlerrm;
  return new;
end $$;

-- aviso_de_pedido_de_acesso (de 20261013140000_acessos_nos_emails.sql)
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
      v_link := public.site_dos_emails() || case when r.papel = 'principal' then '/parceiros/acessos' else '/parceiros/painel' end
        || '?utm_source=Email-pedido';
      v_corpo := public.email_p('<strong>' || public.html_texto(v_quem) || '</strong>'
          || case when v_dados <> '' then ' (' || public.html_texto(v_dados) || ')' else '' end
          || ' pediu para administrar a <strong>' || public.html_texto(a.name) || '</strong> com você no GuiaTennis Parceiros.')
        || public.email_p(case when r.papel = 'principal'
             then 'Se a pessoa trabalha com você, aceite em <strong>Acessos</strong>, no painel da academia. Se não a conhece, recuse: ela não vê nada da academia.'
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
               then 'Se a pessoa trabalha com você, aceite em Acessos, no painel da academia. Se não a conhece, recuse.'
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

-- preparar_lembretes_de_volta (de 20261020160000_guia_com_g_maiusculo.sql)
create or replace function public.preparar_lembretes_de_volta()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  j record;
  v_meses int;
  v_primeiro text;
  v_ids uuid[];
  v_total int;
  v_lista record;
  v_assunto text;
  v_titulo text;
  v_corpo text;
  v_texto text;
  v_botao text;
  v_link text;
  v_parar text;
  v_n int := 0;
begin
  for j in
    select x.user_id, x.nome, x.email, x.cidade, x.token_avisos, v.ultima
    from public.jogadores x
    join auth.users u on u.id = x.user_id
    cross join lateral (select greatest(x.visto_em, u.last_sign_in_at, x.created_at) as ultima) v
    where x.lembrete_de_volta
      and x.email_confirmado_em is not null
      and public.email_valido(x.email)
      and v.ultima < now() - interval '3 months'
      and (x.lembrado_de_volta_em is null or x.lembrado_de_volta_em < v.ultima)
      and not exists (select 1 from public.academia_acessos p where p.user_id = x.user_id)
    order by v.ultima desc
    limit 200
  loop
    v_meses := greatest(3, (extract(year from age(now(), j.ultima)) * 12 + extract(month from age(now(), j.ultima)))::int);
    v_primeiro := nullif(split_part(btrim(coalesce(j.nome, '')), ' ', 1), '');
    v_ids := '{}';
    v_total := 0;
    if nullif(btrim(j.cidade), '') is not null then
      v_ids := array(
        select c.id from public.academias c
        where public.academia_no_ar(c) and c.publicada_em > j.ultima
          and public.slug(c.cidade) = public.slug(j.cidade)
        order by c.publicada_em desc
        limit 6);
      select count(*) into v_total from public.academias c
        where public.academia_no_ar(c) and public.slug(c.cidade) = public.slug(j.cidade);
    end if;
    v_parar := public.link_parar_avisos(j.token_avisos, 'volta');
    v_corpo := public.email_p('Olá' || coalesce(', <strong>' || public.html_texto(v_primeiro) || '</strong>', '')
      || '. Faz ' || v_meses || ' meses que você não entra no GuiaTennis.');
    v_texto := 'Olá' || coalesce(', ' || v_primeiro, '') || '. Faz ' || v_meses || ' meses que você não entra no GuiaTennis.';
    if cardinality(v_ids) > 0 then
      v_lista := public.lista_de_academias_email(v_ids, 'Email-volta');
      v_assunto := case when cardinality(v_ids) = 1 then '1 academia nova em ' else cardinality(v_ids) || ' academias novas em ' end
        || btrim(j.cidade) || ' desde a sua última visita';
      v_titulo := 'Academias novas em ' || btrim(j.cidade);
      v_corpo := v_corpo || public.email_p('Desde a sua última visita, '
          || case when cardinality(v_ids) = 1 then 'entrou esta academia' else 'entraram estas academias' end || ' no Guia:')
        || v_lista.html;
      v_texto := v_texto || E'\n\nDesde a sua última visita, '
        || case when cardinality(v_ids) = 1 then 'entrou esta academia' else 'entraram estas academias' end || E' no Guia:\n' || v_lista.texto;
    else
      v_assunto := 'Faz tempo que você não passa no GuiaTennis';
      v_titulo := 'Onde jogar tênis perto de você';
    end if;
    v_corpo := v_corpo || public.email_p('Compare preço, estrutura e comodidades de academias de tênis — e fale direto com elas.'
      || case when v_total > 1 then ' Hoje são ' || v_total || ' academias em ' || public.html_texto(btrim(j.cidade)) || ' no GuiaTennis.' else '' end);
    v_texto := v_texto || E'\n\nCompare preço, estrutura e comodidades de academias de tênis — e fale direto com elas.'
      || case when v_total > 1 then ' Hoje são ' || v_total || ' academias em ' || btrim(j.cidade) || ' no GuiaTennis.' else '' end;
    if v_total > 0 then
      v_botao := 'Ver academias em ' || btrim(j.cidade);
      v_link := public.site_dos_emails() || '/quadras/' || public.slug(j.cidade) || '?utm_source=Email-volta';
    else
      v_botao := 'Buscar academias';
      v_link := public.site_dos_emails() || '/?utm_source=Email-volta';
    end if;
    if public.por_na_fila(
      'volta:' || j.user_id || ':' || to_char(j.ultima at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS'), 'volta', j.email,
      v_assunto,
      public.email_montado(v_titulo, v_corpo, v_botao, v_link,
        'Você recebe este e-mail porque tem conta no GuiaTennis e faz ' || v_meses || ' meses que não entra. '
        || 'Ele só volta a ser enviado depois da sua próxima visita. <a href="' || public.html_texto(v_parar)
        || '" style="color:#6B6458">Não quero mais receber este lembrete</a>.'),
      v_texto || E'\n\n' || v_botao || ': ' || v_link
        || E'\n\nNão quer mais receber este lembrete? ' || v_parar,
      v_parar) then
      update public.jogadores set lembrado_de_volta_em = now() where user_id = j.user_id;
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end $$;

-- pedir_para_sair_do_guia (de 20261020170000_academia_que_fechou.sql)
create or replace function public.pedir_para_sair_do_guia(p_academia uuid, p_motivo text, p_detalhes text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  x public.academia_acessos;
  v_id uuid;
  v_detalhes text := nullif(btrim(coalesce(p_detalhes, '')), '');
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia and papel = 'principal') then
    raise exception 'Quem avisa que a academia fechou é o responsável principal.' using errcode = '42501';
  end if;
  if coalesce(p_motivo, '') <> 'fechou' then
    raise exception 'Só a academia que fechou as portas sai do Guia. Se for por um tempo, use Pausar no site.' using errcode = '22023';
  end if;
  if char_length(coalesce(v_detalhes, '')) > 500 then
    raise exception 'Os detalhes cabem em até 500 letras.' using errcode = '22023';
  end if;
  select * into a from public.academias where id = p_academia;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if exists (select 1 from public.pedidos_para_sair where academia_id = p_academia and resolvido_em is null) then
    raise exception 'Já existe um aviso de que esta academia fechou.' using errcode = '22023';
  end if;
  insert into public.pedidos_para_sair (academia_id, academia_nome, user_id, motivo, detalhes)
    values (p_academia, a.name, auth.uid(), 'fechou', v_detalhes)
    returning id into v_id;
  select * into x from public.academia_acessos where user_id = auth.uid();
  perform public.aviso_ao_admin(
    'sair:' || v_id, 'pedido_para_sair', 'A academia fechou: ' || a.name,
    'Academia fechou as portas',
    public.email_p('<strong>' || public.html_texto(coalesce(x.nome_responsavel, x.email, 'O responsável')) || '</strong> avisou que a <strong>'
      || public.html_texto(a.name) || '</strong> fechou as portas.')
    || coalesce(public.email_p('Detalhes: ' || public.html_texto(v_detalhes) || '.'), '')
    || public.email_p('Confira se ela fechou de fato (Google, Instagram, telefone) e responda no painel: "Fechou: tirar do Guia" ou "Continua aberta".'),
    coalesce(x.nome_responsavel, x.email, 'O responsável') || ' avisou que a ' || a.name || ' fechou as portas.'
      || coalesce(' Detalhes: ' || v_detalhes || '.', ''));
  return v_id;
end $$;

-- aviso_de_whatsapp_para_confirmar (de 20261026120000_veracidade.sql)
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
    public.email_p('A <strong>' || public.html_texto(a.name) || '</strong> informou o WhatsApp <strong>'
      || public.html_texto(a.whatsapp_a_confirmar) || '</strong> na ficha'
      || case when a.whatsapp_antes is not null then ', no lugar de ' || public.html_texto(a.whatsapp_antes) else '' end || '.')
    || public.email_p('Em <strong>Pendências</strong>, gere o código e mande para esse número. O número só aparece na ficha depois que alguém da academia digitar o código'
      || case when a.whatsapp_antes is not null then ' e você aprovar a troca' else '' end || '.'),
    'A ' || a.name || ' informou o WhatsApp ' || a.whatsapp_a_confirmar || ' na ficha'
      || case when a.whatsapp_antes is not null then ', no lugar de ' || a.whatsapp_antes else '' end
      || E'.\n\nEm Pendências, gere o código e mande para esse número.');
end $$;

-- resolver_pedido_para_sair (de 20261026200000_academia_fechada_fica_guardada.sql)
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
  v_fato text;
  o jsonb;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis resolve esse aviso.' using errcode = '42501';
  end if;
  select * into p from public.pedidos_para_sair where id = p_id and resolvido_em is null;
  if not found then
    raise exception 'Aviso não encontrado ou já resolvido.' using errcode = '22023';
  end if;
  select x.email, x.nome_responsavel into v_email, v_nome from public.academia_acessos x where x.user_id = p.user_id;
  v_quem := coalesce(nullif(btrim(v_nome), ''), 'O responsável principal');
  v_fato := case when p.user_id is null then 'O GuiaTennis confirmou que a ' || p.academia_nome || ' fechou as portas'
                 else v_quem || ' avisou que a ' || p.academia_nome || ' fechou as portas' end;
  if p.academia_id is not null then
    select coalesce(jsonb_agg(jsonb_build_object('user_id', q.user_id, 'email', q.email, 'token', q.token_avisos)), '[]'::jsonb)
      into v_outros
      from public.quem_recebe_da_academia(p.academia_id) q
      where q.user_id is distinct from p.user_id;
  end if;
  update public.pedidos_para_sair
    set resolvido_em = now(), resolucao = case when p_remover then 'removida' else 'mantida' end, resposta = v_resposta
    where id = p_id;
  if p_remover and p.academia_id is not null then
    perform public.guardar_academia_fechada(p.academia_id);
  end if;
  -- A resposta para quem avisou.
  if v_email is not null then
    begin
      perform public.por_na_fila('sair-resposta:' || p_id, 'pedido_para_sair_resposta', v_email,
        case when p_remover then 'A ' || p.academia_nome || ' saiu do GuiaTennis'
             else 'A ' || p.academia_nome || ' continua no GuiaTennis' end,
        public.email_montado(case when p_remover then 'A academia saiu do Guia' else 'A academia continua no Guia' end,
          public.email_p('Olá' || coalesce(', ' || public.html_texto(split_part(btrim(v_nome), ' ', 1)), '') || '!')
          || case when p_remover
               then public.email_p('Conferimos que a <strong>' || public.html_texto(p.academia_nome) || '</strong> fechou as portas, e ela não aparece mais no GuiaTennis.')
                    || public.email_p('O cadastro fica guardado, com as avaliações. Se a academia reabrir, entre no GuiaTennis Parceiros com este e-mail: o site pergunta se você quer administrá-la de novo.')
               else public.email_p('A <strong>' || public.html_texto(p.academia_nome) || '</strong> continua no GuiaTennis: ela ainda aparece aberta ou com informações públicas.')
                    || coalesce(public.email_p(public.html_texto(v_resposta)), '')
                    || public.email_p('Para tirar a ficha da busca por um tempo, use Suas academias › Pausar no site.') end,
          'Abrir o GuiaTennis Parceiros',
          public.site_dos_emails() || case when p_remover then '/parceiros' else '/parceiros/academias' end,
          'Aviso automático do GuiaTennis Parceiros.'),
        case when p_remover then 'Conferimos que a ' || p.academia_nome || ' fechou as portas, e ela não aparece mais no GuiaTennis.'
                  || E'\n\nO cadastro fica guardado, com as avaliações. Se a academia reabrir, entre no GuiaTennis Parceiros com este e-mail: o site pergunta se você quer administrá-la de novo.'
             else 'A ' || p.academia_nome || ' continua no GuiaTennis: ela ainda aparece aberta ou com informações públicas.'
                  || coalesce(E'\n\n' || v_resposta, '') end);
    exception when others then
      raise warning 'resposta do aviso de que fechou: %', sqlerrm;
    end;
  end if;
  -- E para as outras pessoas da academia.
  for o in select * from jsonb_array_elements(v_outros) loop
    begin
      v_parar := public.link_parar_avisos((o->>'token')::uuid, 'parceiros');
      perform public.por_na_fila('sair-resposta:' || p_id || ':' || (o->>'user_id'), 'pedido_para_sair_resposta', o->>'email',
        case when p_remover then 'A ' || p.academia_nome || ' saiu do GuiaTennis'
             else 'A ' || p.academia_nome || ' continua no GuiaTennis' end,
        public.email_montado(case when p_remover then 'A academia saiu do Guia' else 'A academia continua no Guia' end,
          case when p_remover
            then public.email_p(public.html_texto(v_fato) || ', e ela não aparece mais no GuiaTennis. O cadastro fica guardado, com as avaliações: se ela reabrir, entre no GuiaTennis Parceiros com este e-mail.')
            else public.email_p(public.html_texto(v_fato) || ', mas ela continua no Guia: ainda aparece aberta ou com informações públicas.')
                 || coalesce(public.email_p(public.html_texto(v_resposta)), '') end,
          'Abrir o GuiaTennis Parceiros',
          public.site_dos_emails() || case when p_remover then '/parceiros' else '/parceiros/academias' end,
          case when p_remover then 'Você recebe este e-mail porque administrava a ' else 'Você recebe este e-mail porque administra a ' end
          || public.html_texto(p.academia_nome) || ' no GuiaTennis Parceiros. <a href="' || public.html_texto(v_parar)
          || '" style="color:#6B6458">Não quero mais receber avisos por e-mail</a>.'),
        case when p_remover
          then v_fato || ', e ela não aparece mais no GuiaTennis. O cadastro fica guardado, com as avaliações: se ela reabrir, entre no GuiaTennis Parceiros com este e-mail.'
          else v_fato || ', mas ela continua no Guia: ainda aparece aberta ou com informações públicas.'
               || coalesce(E'\n\n' || v_resposta, '') end
          || E'\n\nNão quer mais receber avisos por e-mail? ' || v_parar,
        v_parar);
    exception when others then
      raise warning 'resposta do aviso de que fechou (equipe): %', sqlerrm;
    end;
  end loop;
end $$;

-- suspender_nome_admin (de 20261027120000_nome_suspenso.sql)
create or replace function public.suspender_nome_admin(p_user uuid, p_motivo text, p_nome text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_nome text;
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_prazo timestamptz := now() + interval '15 days';
  v_link text;
  v_id uuid;
  j public.jogadores;
  x public.academia_acessos;
begin
  if not public.eh_admin() then
    raise exception 'Só o admin.' using errcode = '42501';
  end if;
  if length(v_motivo) < 5 then
    raise exception 'Escreva o motivo (vai no e-mail para a pessoa).' using errcode = '22023';
  end if;
  if char_length(v_motivo) > 300 then
    raise exception 'O motivo cabe em até 300 letras.' using errcode = '22023';
  end if;
  select lower(email) into v_email from auth.users where id = p_user;
  if v_email is null then
    raise exception 'Conta não encontrada.' using errcode = '22023';
  end if;
  if v_email = 'guiatennis1@gmail.com' then
    raise exception 'O nome do admin não pode ser suspenso.' using errcode = '22023';
  end if;
  if exists (select 1 from public.nomes_suspensos where user_id = p_user and resolvido_em is null) then
    raise exception 'O nome dessa conta já está suspenso.' using errcode = '22023';
  end if;
  select * into j from public.jogadores where user_id = p_user;
  select * into x from public.academia_acessos where user_id = p_user;
  -- O nome que o admin viu, se ainda é um dos nomes da conta; senão, o da
  -- conta de jogador (o das avaliações).
  v_nome := case when nullif(btrim(coalesce(p_nome, '')), '') is not null
                  and (public.mesmo_nome(j.nome, p_nome) or public.mesmo_nome(x.nome_responsavel, p_nome))
                 then btrim(p_nome)
                 else coalesce(nullif(btrim(j.nome), ''), nullif(btrim(x.nome_responsavel), '')) end;
  if v_nome is null then
    raise exception 'Essa conta não tem nome para suspender.' using errcode = '22023';
  end if;
  insert into public.nomes_suspensos (user_id, email, nome, motivo, prazo)
    values (p_user, v_email, v_nome, v_motivo, v_prazo)
    returning id into v_id;
  -- O nome trocado que o admin suspendeu de novo já foi conferido.
  update public.nomes_suspensos set conferido_em = now()
    where user_id = p_user and resolucao = 'trocou' and conferido_em is null;
  update public.avaliacoes set nome_autor = null, autor_oculto = true where user_id = p_user;
  v_link := public.link_para_trocar_o_nome(p_user, v_nome);
  perform public.por_na_fila('nome-suspenso:' || v_id, 'nome_suspenso', v_email,
    'O seu nome no GuiaTennis foi suspenso',
    public.email_montado('O seu nome foi suspenso',
      public.email_p('O nome <strong>' || public.html_texto(v_nome) || '</strong> não segue os Termos de Uso do GuiaTennis: o nome da conta não pode ter palavrão, ofensa, discriminação nem nada que a lei brasileira proíba.')
      || public.email_p('Motivo: ' || public.html_texto(v_motivo) || '.')
      || public.email_p('Enquanto isso, o nome não aparece no site: nas suas avaliações, aparece <strong>Usuário do GuiaTennis</strong>.')
      || public.email_p('<strong>Troque o nome até ' || public.data_de_brasilia(v_prazo) || '</strong> (15 dias). Depois da troca, ele volta a aparecer na hora. Se não trocar, a conta será excluída, e as avaliações ficam no site como Usuário do GuiaTennis.'),
      'Trocar o nome', v_link, public.rodape_da_conta()),
    'O nome ' || v_nome || ' não segue os Termos de Uso do GuiaTennis: o nome da conta não pode ter palavrão, ofensa, discriminação nem nada que a lei brasileira proíba.'
      || E'\n\nMotivo: ' || v_motivo || '.'
      || E'\n\nEnquanto isso, o nome não aparece no site: nas suas avaliações, aparece Usuário do GuiaTennis.'
      || E'\n\nTroque o nome até ' || public.data_de_brasilia(v_prazo) || ' (15 dias): ' || v_link
      || E'\nDepois da troca, ele volta a aparecer na hora. Se não trocar, a conta será excluída, e as avaliações ficam no site como Usuário do GuiaTennis.');
  return v_id;
end $$;

-- aviso_de_nome_da_academia (de 20261027120000_nome_suspenso.sql)
create or replace function public.aviso_de_nome_da_academia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_link text := public.site_dos_emails() || '/parceiros/ficha?abrir=' || right(replace(new.id::text, '-', ''), 8) || '&utm_source=Email-nome-da-academia';
begin
  if not public.eh_admin() or new.name is not distinct from old.name or new.status = 'pending' then
    return new;
  end if;
  for r in
    select distinct x.email
    from public.academia_vinculos m
    join public.academia_acessos x on x.user_id = m.user_id
    where m.academia_id = new.id and x.email_confirmado_em is not null and public.email_valido(x.email)
  loop
    perform public.por_na_fila('nome-academia:' || new.id || ':' || md5(coalesce(old.name, '') || '>' || new.name) || ':' || r.email,
      'academia_nome_alterado', r.email, 'O GuiaTennis alterou o nome da ' || new.name,
      public.email_montado('O nome da academia foi alterado',
        public.email_p('O GuiaTennis alterou o nome da academia na ficha: de <strong>' || public.html_texto(old.name)
          || '</strong> para <strong>' || public.html_texto(new.name) || '</strong>.')
        || public.email_p('Pelos Termos de Uso, o nome da academia é o nome com que ela é conhecida, sem palavrão, ofensa ou discriminação. Acha que foi um engano? Fale com o GuiaTennis pelo chat de ajuda do Parceiros.'),
        'Ver a ficha', v_link,
        'Você recebe este e-mail porque administra a ' || public.html_texto(new.name) || ' no GuiaTennis Parceiros.'),
      'O GuiaTennis alterou o nome da academia na ficha: de ' || old.name || ' para ' || new.name || '.'
        || E'\n\nPelos Termos de Uso, o nome da academia é o nome com que ela é conhecida, sem palavrão, ofensa ou discriminação. Acha que foi um engano? Fale com o GuiaTennis pelo chat de ajuda do Parceiros.'
        || E'\n\nVer a ficha: ' || v_link);
  end loop;
  return new;
end $$;

-- aviso_de_avaliacao_editada (de 20261028120000_avaliacao_editada.sql)
create or replace function public.aviso_de_avaliacao_editada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia text;
  v_nome text;
  v_comentario text;
  v_estrelas text;
  v_antes text := '';
  v_respondeu boolean;
  v_link text := public.site_dos_emails() || '/parceiros/painel?utm_source=Email-avaliacao-editada';
  v_corpo text;
  r record;
begin
  if new.editada_em is null or new.editada_em is not distinct from old.editada_em then
    return new;
  end if;
  select name into v_academia from public.academias where id = new.academia_id;
  if v_academia is null then
    return new;
  end if;
  v_nome := case when new.autor_oculto then 'Usuário do GuiaTennis' else coalesce(nullif(btrim(new.nome_autor), ''), 'Um jogador') end;
  v_comentario := left(btrim(coalesce(new.comment, '')), 600);
  v_estrelas := repeat('★', new.stars) || repeat('☆', 5 - new.stars);
  if new.stars <> old.stars then
    v_antes := ' (antes, ' || old.stars || ' de 5)';
  end if;
  v_respondeu := exists (select 1 from public.respostas where avaliacao_id = new.id);
  v_corpo := public.email_p('<strong>' || public.html_texto(v_nome) || '</strong> editou a avaliação da <strong>'
               || public.html_texto(v_academia) || '</strong> no GuiaTennis. Ficou assim:')
    || '<p style="margin:0 0 4px;font-size:24px;letter-spacing:2px;color:#C9A227">' || v_estrelas || '</p>'
    || '<p style="margin:0 0 12px;font-size:13px;color:#6B6458">' || new.stars || ' de 5' || public.html_texto(v_antes) || '</p>'
    || case when v_comentario <> '' then
         '<p style="margin:0 0 14px;padding:12px 14px;background:#F6F1E7;border-radius:10px;font-size:15px;line-height:1.55;color:#1F2A24">“'
         || public.html_texto(v_comentario) || '”</p>' else '' end
    || public.email_p('No site, a avaliação aparece como <strong>editada</strong>.'
         || case when v_respondeu then ' A resposta da academia continua embaixo dela; se precisar, edite a resposta pelo painel.'
                 else ' Responder mostra aos próximos jogadores que a academia cuida de quem joga lá.' end);
  for r in select * from public.quem_recebe_da_academia(new.academia_id) loop
    perform public.por_na_fila(
      'avaliacao-editada:' || new.id || ':' || public.hoje_em_brasilia() || ':' || r.user_id, 'avaliacao_editada', r.email,
      v_academia || ': uma avaliação foi editada (' || new.stars || ' de 5)',
      public.email_montado('Avaliação editada', v_corpo, case when v_respondeu then 'Ver a avaliação' else 'Responder à avaliação' end, v_link,
        'Você recebe este e-mail porque administra a ' || public.html_texto(v_academia)
        || ' no GuiaTennis Parceiros. <a href="' || public.html_texto(public.link_parar_avisos(r.token_avisos, 'parceiros'))
        || '" style="color:#6B6458">Não quero mais receber avisos por e-mail</a>.'),
      v_nome || ' editou a avaliação da ' || v_academia || ' no GuiaTennis: ' || v_estrelas || ' (' || new.stars || ' de 5)' || v_antes
        || case when v_comentario <> '' then E'\n\n"' || v_comentario || '"' else '' end
        || E'\n\nNo site, a avaliação aparece como editada.'
        || E'\n\nVer pelo painel: ' || v_link
        || E'\n\nNão quer mais receber avisos por e-mail? ' || public.link_parar_avisos(r.token_avisos, 'parceiros'),
      public.link_parar_avisos(r.token_avisos, 'parceiros'));
  end loop;
  return new;
exception when others then
  raise warning 'aviso de avaliação editada: %', sqlerrm;
  return new;
end $$;

-- avisar_principal_novo (de 20261029190000_funcoes_e_pagamentos.sql)
create or replace function public.avisar_principal_novo(p_academia uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia text;
  v_novo text;
  v_quem text;
  v_link text := public.site_dos_emails() || '/parceiros/acessos?abrir=' || right(replace(p_academia::text, '-', ''), 8)
    || '&utm_source=Email-principal';
  v_texto text;
  r record;
begin
  select name into v_academia from public.academias where id = p_academia;
  v_novo := coalesce((select coalesce(nullif(btrim(nome_responsavel), ''), email) from public.academia_acessos where user_id = p_user), 'Uma pessoa');
  v_quem := coalesce((select coalesce(nullif(btrim(nome_responsavel), ''), email) from public.academia_acessos where user_id = auth.uid()), 'O responsável principal');
  for r in select * from public.principais_da_academia(p_academia) loop
    v_texto := case when r.user_id = p_user
      then v_quem || ' tornou você responsável principal da ' || v_academia || ' no GuiaTennis Parceiros. Agora você pode mudar o plano, adicionar e remover pessoas e escolher o que cada uma pode fazer.'
      else v_quem || ' tornou ' || v_novo || ' responsável principal da ' || v_academia || ' no GuiaTennis Parceiros. Agora essa pessoa pode mudar o plano, adicionar e remover pessoas e escolher o que cada uma pode fazer.' end;
    perform public.por_na_fila(
      'principal-novo:' || p_academia || ':' || p_user || ':' || r.user_id || ':' || public.hoje_em_brasilia(), 'principal_novo', r.email,
      case when r.user_id = p_user then 'Você é responsável principal da ' || v_academia
           else v_novo || ' é responsável principal da ' || v_academia end,
      public.email_montado('Responsável principal', public.email_p(public.html_texto(v_texto))
          || public.email_p('Não conhece essa pessoa? Fale com o GuiaTennis pelo chat de ajuda: só o GuiaTennis tira um responsável principal.'),
        'Ver os acessos', v_link,
        'Você recebe este e-mail porque é responsável principal da ' || public.html_texto(v_academia) || ' no GuiaTennis Parceiros.'),
      v_texto || E'\n\nNão conhece essa pessoa? Fale com o GuiaTennis pelo chat de ajuda: só o GuiaTennis tira um responsável principal.\n\n' || v_link);
  end loop;
exception when others then
  raise warning 'aviso de principal novo: %', sqlerrm;
end $$;

-- avisar_convite (de 20261030120000_convite_por_email.sql)
create or replace function public.avisar_convite(p_academia uuid, p_email text, p_quem text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia text;
  v_quem text;
  v_link text := public.site_dos_emails() || '/parceiros/entrar?utm_source=Email-convite';
  v_texto text;
begin
  select name into v_academia from public.academias where id = p_academia;
  v_quem := coalesce(p_quem,
    (select coalesce(nullif(btrim(nome_responsavel), ''), email) from public.academia_acessos where user_id = auth.uid()),
    'O GuiaTennis');
  v_texto := v_quem || ' convidou você para administrar a ' || v_academia
    || ' no GuiaTennis Parceiros, o site das academias do GuiaTennis. Crie a sua conta com este e-mail ('
    || p_email || ') e a sua própria senha: quando você confirmar o e-mail, a academia já aparece na sua conta.';
  perform public.por_na_fila(
    'convite:' || p_academia || ':' || p_email || ':' || public.hoje_em_brasilia(), 'convite', p_email,
    'Convite para a ' || v_academia || ' no GuiaTennis Parceiros',
    public.email_montado('Convite', public.email_p(public.html_texto(v_texto)),
      'Criar minha conta', v_link,
      'Você recebe este e-mail porque este endereço foi informado para administrar a ' || public.html_texto(v_academia)
        || ' no GuiaTennis Parceiros. Se não conhece a academia, ignore este e-mail.'),
    v_texto || E'\n\n' || v_link);
exception when others then
  raise warning 'convite por e-mail: %', sqlerrm;
end $$;

-- rodar_acompanhamentos (de 20261101120000_acompanhamento.sql)
create or replace function public.rodar_acompanhamentos(p_agora timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_n int := 0;
  v_agora timestamp := p_agora at time zone 'America/Sao_Paulo';
  v_primeiro text;
  v_parar text;
  v_rodape text;
  v_corpo text;
  v_texto text;
  v_botoes text;
  v_aula boolean;
  v_loc boolean;
  v_oque text;
  v_dia text;
  v_hora text;
  v_endereco text;
  v_rota text;
  v_whats text;
  v_ficha text;
  v_linha text;
  v_oque_linha text;
begin
  -- 4.1 "Você marcou?": no dia seguinte à chamada, das 10h às 21h.
  if extract(hour from v_agora) between 10 and 20 then
    for r in
      select x.id, x.chave, x.criado_em, j.nome, j.email, j.token_avisos, a.name as academia, a.modalidades
      from public.acompanhamentos x
      join public.jogadores j on j.user_id = x.user_id
      join public.academias a on a.id = x.academia_id
      where x.status = 'aguardando' and x.perguntado_em is null
        and (x.criado_em at time zone 'America/Sao_Paulo')::date < v_agora::date
        and x.criado_em > p_agora - interval '7 days'
        and j.acompanhamento and j.email_confirmado_em is not null
      order by x.criado_em
      limit 300
    loop
      v_primeiro := nullif(split_part(btrim(coalesce(r.nome, '')), ' ', 1), '');
      v_parar := public.link_parar_avisos(r.token_avisos, 'acompanhamento');
      v_aula := coalesce(r.modalidades, '[]'::jsonb) ? 'aulas_proprias' or not (coalesce(r.modalidades, '[]'::jsonb) ? 'locacao');
      v_loc := coalesce(r.modalidades, '[]'::jsonb) ? 'locacao' or not (coalesce(r.modalidades, '[]'::jsonb) ? 'aulas_proprias');
      v_botoes := '<p style="margin:18px 0 4px">'
        || case when v_aula then '<a href="' || public.html_texto(public.link_do_acompanhamento(r.chave, 'aula')) || '" style="display:inline-block;margin:0 8px 8px 0;background:#1F4D3A;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 18px;border-radius:10px">Marquei aula</a>' else '' end
        || case when v_loc then '<a href="' || public.html_texto(public.link_do_acompanhamento(r.chave, 'locacao')) || '" style="display:inline-block;margin:0 8px 8px 0;background:#1F4D3A;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 18px;border-radius:10px">Marquei locação</a>' else '' end
        || '<a href="' || public.html_texto(public.link_do_acompanhamento(r.chave, 'nao')) || '" style="display:inline-block;margin:0 8px 8px 0;background:#FFFFFF;color:#1F4D3A;text-decoration:none;font-weight:bold;font-size:15px;padding:11px 17px;border-radius:10px;border:1px solid #1F4D3A">Ainda não</a>'
        || '</p>';
      v_corpo := public.email_p('Olá' || coalesce(', <strong>' || public.html_texto(v_primeiro) || '</strong>', '')
          || '. No dia ' || public.data_por_extenso((r.criado_em at time zone 'America/Sao_Paulo')::date)
          || ', você chamou a <strong>' || public.html_texto(r.academia) || '</strong> pelo GuiaTennis.')
        || public.email_p('Se marcou, conte o dia e a hora: duas horas antes, mandamos como chegar e a regra de cancelamento e reposição.')
        || v_botoes;
      v_texto := 'Olá' || coalesce(', ' || v_primeiro, '') || '. No dia '
        || public.data_por_extenso((r.criado_em at time zone 'America/Sao_Paulo')::date)
        || ', você chamou a ' || r.academia || E' pelo GuiaTennis.\n\nSe marcou, conte o dia e a hora: duas horas antes, mandamos como chegar e a regra de cancelamento e reposição.\n\n'
        || case when v_aula then 'Marquei aula: ' || public.link_do_acompanhamento(r.chave, 'aula') || E'\n' else '' end
        || case when v_loc then 'Marquei locação: ' || public.link_do_acompanhamento(r.chave, 'locacao') || E'\n' else '' end
        || 'Ainda não: ' || public.link_do_acompanhamento(r.chave, 'nao');
      v_rodape := 'Você recebe este e-mail porque chamou uma academia pelo GuiaTennis com a sua conta. '
        || '<a href="' || public.html_texto(v_parar) || '" style="color:#6B6458">Não quero mais este acompanhamento</a>.';
      perform public.por_na_fila('acomp-pergunta:' || r.id, 'acompanhamento', r.email,
        'Você marcou na ' || r.academia || '?',
        public.email_montado('Você marcou na ' || r.academia || '?', v_corpo, null, null, v_rodape),
        v_texto || E'\n\nNão quer mais este acompanhamento? ' || v_parar, v_parar);
      update public.acompanhamentos set perguntado_em = now() where id = r.id;
      v_n := v_n + 1;
    end loop;
  end if;

  -- 4.2 O lembrete, duas horas antes.
  for r in
    select x.id, x.chave, x.tipo, x.quando, x.instrucoes, j.email, j.token_avisos, a as academia_linha
    from public.acompanhamentos x
    join public.jogadores j on j.user_id = x.user_id
    join public.academias a on a.id = x.academia_id
    where x.status = 'marcou' and x.lembrado_em is null
      and x.quando > p_agora and x.quando <= p_agora + interval '2 hours 5 minutes'
      and j.acompanhamento and j.email_confirmado_em is not null
    order by x.quando
    limit 300
  loop
    v_parar := public.link_parar_avisos(r.token_avisos, 'acompanhamento');
    v_oque := case when r.tipo = 'locacao' then 'Locação' else 'Aula' end;
    v_dia := case when (r.quando at time zone 'America/Sao_Paulo')::date = v_agora::date then 'hoje' else 'amanhã' end;
    v_hora := public.hora_por_extenso(r.quando);
    v_endereco := coalesce(public.texto_das_instrucoes(r.instrucoes, 'endereco', 200),
      nullif(concat_ws(', ', nullif(btrim(concat_ws(', ', nullif(btrim((r.academia_linha).address), ''), nullif(btrim((r.academia_linha).numero), ''))), ''),
        nullif(btrim((r.academia_linha).bairro), ''), nullif(btrim((r.academia_linha).cidade), '')), ''));
    v_rota := 'https://www.google.com/maps/dir/?api=1&destination='
      || case when (r.academia_linha).lat is not null and (r.academia_linha).lng is not null
           then (r.academia_linha).lat::text || '%2C' || (r.academia_linha).lng::text
           else public.url_codificada(coalesce(v_endereco, (r.academia_linha).name)) end;
    v_whats := public.link_whatsapp_do_email(r.academia_linha,
      case when r.tipo = 'locacao' then 'a locação marcada ' else 'a aula marcada ' end || v_dia || ' às ' || v_hora, 'Email-lembrete');
    v_ficha := public.site_dos_emails() || '/academia/' || public.slug_da_academia((r.academia_linha).name, (r.academia_linha).id) || '?utm_source=Email-lembrete';
    v_corpo := public.email_p('<strong>' || public.html_texto((r.academia_linha).name) || '</strong>'
        || coalesce('<br>' || public.html_texto(v_endereco), ''));
    v_texto := (r.academia_linha).name || coalesce(E'\n' || v_endereco, '');
    for v_linha, v_oque_linha in
      select t.rotulo, t.valor from (values
        (1, 'Na chegada', public.texto_das_instrucoes(r.instrucoes, 'chegada', 600)),
        (2, 'Estacionamento', public.texto_das_instrucoes(r.instrucoes, 'estacionamento', 600)),
        (3, 'Cancelamento e reposição', public.texto_das_instrucoes(r.instrucoes, 'cancelamento', 800))
      ) as t(o, rotulo, valor)
      where t.valor is not null order by t.o
    loop
      v_corpo := v_corpo || public.email_p('<strong>' || public.html_texto(v_linha) || ':</strong> ' || public.html_texto(v_oque_linha));
      v_texto := v_texto || E'\n\n' || v_linha || ': ' || v_oque_linha;
    end loop;
    v_corpo := v_corpo || public.email_p(
      case when v_whats is not null then '<a href="' || public.html_texto(v_whats) || '" style="color:#1F4D3A;font-weight:bold">Falar com a academia no WhatsApp</a> · ' else '' end
      || '<a href="' || public.html_texto(v_ficha) || '" style="color:#1F4D3A;font-weight:bold">Ver a ficha</a>');
    v_texto := v_texto || coalesce(E'\n\nFalar com a academia no WhatsApp: ' || v_whats, '') || E'\nVer a ficha: ' || v_ficha;
    v_rodape := 'Você recebe este lembrete porque contou ao GuiaTennis que marcou este horário. Não vai mais? '
      || '<a href="' || public.html_texto(public.link_do_acompanhamento(r.chave, 'cancelar')) || '" style="color:#6B6458">Tirar o lembrete</a>. '
      || '<a href="' || public.html_texto(v_parar) || '" style="color:#6B6458">Não quero mais este acompanhamento</a>.';
    perform public.por_na_fila('acomp-lembrete:' || r.id || ':' || to_char(r.quando at time zone 'UTC', 'YYYYMMDDHH24MI'), 'acompanhamento', r.email,
      v_oque || ' ' || v_dia || ' às ' || v_hora || ': ' || (r.academia_linha).name,
      public.email_montado(v_oque || ' ' || v_dia || ' às ' || v_hora, v_corpo, 'Como chegar', v_rota, v_rodape),
      v_oque || ' ' || v_dia || ' às ' || v_hora || E'\n\n' || v_texto || E'\n\nComo chegar: ' || v_rota
        || E'\n\nNão vai mais? Tirar o lembrete: ' || public.link_do_acompanhamento(r.chave, 'cancelar')
        || E'\nNão quer mais este acompanhamento? ' || v_parar,
      v_parar);
    update public.acompanhamentos set lembrado_em = now() where id = r.id;
    v_n := v_n + 1;
  end loop;

  -- 4.3 "Como foi?": três horas depois, das 9h às 21h, para quem ainda não
  -- avaliou a academia.
  if extract(hour from v_agora) between 9 and 20 then
    for r in
      select x.id, x.tipo, j.nome, j.email, j.token_avisos, a.id as academia_id, a.name as academia
      from public.acompanhamentos x
      join public.jogadores j on j.user_id = x.user_id
      join public.academias a on a.id = x.academia_id
      where x.status = 'marcou' and x.como_foi_em is null
        and x.quando <= p_agora - interval '3 hours' and x.quando > p_agora - interval '3 days'
        and j.acompanhamento and j.email_confirmado_em is not null
        and not exists (select 1 from public.avaliacoes v where v.user_id = x.user_id and v.academia_id = x.academia_id)
      order by x.quando
      limit 300
    loop
      v_primeiro := nullif(split_part(btrim(coalesce(r.nome, '')), ' ', 1), '');
      v_parar := public.link_parar_avisos(r.token_avisos, 'acompanhamento');
      v_ficha := public.site_dos_emails() || '/academia/' || public.slug_da_academia(r.academia, r.academia_id) || '?utm_source=Email-como-foi#avaliacoes';
      v_corpo := public.email_p('Olá' || coalesce(', <strong>' || public.html_texto(v_primeiro) || '</strong>', '')
          || '. Conte como foi a ' || case when r.tipo = 'locacao' then 'locação' else 'aula' end
          || ' na <strong>' || public.html_texto(r.academia) || '</strong>: a sua avaliação ajuda outros jogadores a escolher.');
      perform public.por_na_fila('acomp-como-foi:' || r.id, 'acompanhamento', r.email,
        'Como foi na ' || r.academia || '?',
        public.email_montado('Como foi na ' || r.academia || '?', v_corpo, 'Avaliar a academia', v_ficha,
          'Você recebe este e-mail porque contou ao GuiaTennis que marcou um horário. '
          || '<a href="' || public.html_texto(v_parar) || '" style="color:#6B6458">Não quero mais este acompanhamento</a>.'),
        'Olá' || coalesce(', ' || v_primeiro, '') || '. Conte como foi a ' || case when r.tipo = 'locacao' then 'locação' else 'aula' end
          || ' na ' || r.academia || E': a sua avaliação ajuda outros jogadores a escolher.\n\nAvaliar a academia: ' || v_ficha
          || E'\n\nNão quer mais este acompanhamento? ' || v_parar,
        v_parar);
      update public.acompanhamentos set como_foi_em = now() where id = r.id;
      v_n := v_n + 1;
    end loop;
  end if;

  -- 4.4 Nada fica guardado depois de 60 dias.
  delete from public.acompanhamentos where criado_em < p_agora - interval '60 days';
  return v_n;
end $$;

-- aviso_de_disputa (de 20261109130000_whatsapp_em_confirmacao_e_disputa_com_dois_codigos.sql)
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
    when 'confirme_email' then 'Quem contestou ainda não confirmou o e-mail: assim que confirmar, o código sai sozinho pelo WhatsApp.'
    else 'Em Pendências, mande um código para o número que quem contestou informou e outro para o WhatsApp da ficha, de quem administra.' end
    || ' A academia não muda sozinha: com os códigos, os documentos e o que diz cada lado, analise e decida.';
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

-- confirmar_whatsapp_da_ficha (de 20261109130000_whatsapp_em_confirmacao_e_disputa_com_dois_codigos.sql)
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
    || public.email_p('O código mostra que a pessoa tem o número, não que ele é da academia. Confira (Google, Instagram, site, a Receita em <strong>Conferir</strong>) e responda em <strong>Pendências</strong>: confirmar ou recusar. Se for recusado, '
      || case when v_troca then 'volta o número de antes.' else 'a ficha fica sem WhatsApp.' end),
    'Alguém da ' || a.name || ' digitou o código mandado ao WhatsApp ' || a.whatsapp_a_confirmar || ', que já está na ficha'
      || case when v_troca then ' no lugar do ' || a.phone else '' end
      || E', com o aviso "WhatsApp em confirmação pelo GuiaTennis".\n\nConfira e responda em Pendências: confirmar ou recusar.');
  return 'publicado';
end $$;

-- avaliar_o_guia (de 20261110140000_nota_do_guiatennis.sql)
create or replace function public.avaliar_o_guia(p_publico text, p_nota integer, p_pontos text[], p_comentario text,
  p_pode_mostrar boolean, p_quer_contato boolean, p_momento text, p_academia uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.jogadores;
  v_nome text;
  v_academia uuid;
  v_texto text := nullif(btrim(regexp_replace(coalesce(p_comentario, ''), '\s+', ' ', 'g')), '');
  v_pontos text[] := coalesce((select array_agg(distinct x) from unnest(coalesce(p_pontos, '{}'::text[])) x
                               where x ~ '^[a-z_]{2,30}$'), '{}'::text[]);
  r public.avaliacoes_do_guia;
  v_quem text;
  v_resumo text;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para avaliar o GuiaTennis.' using errcode = '42501';
  end if;
  if public.eh_admin() then
    raise exception 'O admin não avalia o GuiaTennis.' using errcode = '42501';
  end if;
  if coalesce(p_publico, '') not in ('jogador', 'parceiro') then
    raise exception 'Avaliação inválida.' using errcode = '22023';
  end if;
  if p_nota is null or p_nota < 1 or p_nota > 5 then
    raise exception 'Escolha de 1 a 5 estrelas.' using errcode = '22023';
  end if;
  if length(coalesce(v_texto, '')) > 600 then
    raise exception 'O comentário pode ter até 600 letras.' using errcode = '22023';
  end if;
  if coalesce(array_length(v_pontos, 1), 0) > 6 then
    v_pontos := v_pontos[1:6];
  end if;
  if p_publico = 'parceiro' then
    if p_academia is null or not exists (select 1 from public.academia_vinculos
                                         where user_id = auth.uid() and academia_id = p_academia) then
      raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
    end if;
    v_academia := p_academia;
    select name into v_nome from public.academias where id = p_academia;
  else
    select * into j from public.jogadores where user_id = auth.uid();
    if not found then
      raise exception 'Entre na sua conta para avaliar o GuiaTennis.' using errcode = '42501';
    end if;
    if j.email_confirmado_em is null then
      raise exception 'Confirme o seu e-mail para avaliar o GuiaTennis.' using errcode = '42501';
    end if;
    -- "Ana J.": o primeiro nome e a inicial do sobrenome, como no Airbnb.
    v_nome := nullif(btrim(split_part(btrim(j.nome), ' ', 1) || coalesce(' ' || nullif(left(split_part(btrim(j.nome), ' ', 2), 1), '') || '.', '')), '');
  end if;
  insert into public.avaliacoes_do_guia (user_id, publico, academia_id, nota, pontos, comentario, pode_mostrar, nome_publico, quer_contato, momento)
    values (auth.uid(), p_publico, v_academia, p_nota, v_pontos, v_texto, coalesce(p_pode_mostrar, false), v_nome,
            coalesce(p_quer_contato, false) and p_nota <= 3, left(coalesce(p_momento, ''), 40))
  on conflict (user_id, publico) do update
    set academia_id = excluded.academia_id, nota = excluded.nota, pontos = excluded.pontos, comentario = excluded.comentario,
        pode_mostrar = excluded.pode_mostrar, nome_publico = excluded.nome_publico, quer_contato = excluded.quer_contato,
        momento = excluded.momento, updated_at = now()
  returning * into r;
  v_quem := coalesce(v_nome, 'Alguém') || case when p_publico = 'parceiro' then ' (academia)' else ' (jogador)' end;
  v_resumo := v_quem || ' deu ' || p_nota || ' de 5 ao GuiaTennis'
    || case when r.quer_contato then ' e pediu que o GuiaTennis entre em contato' else '' end
    || case when v_texto is not null then ': "' || v_texto || '"' else '.' end;
  perform public.aviso_ao_admin('nota-do-guia:' || r.id || ':' || extract(epoch from r.updated_at)::bigint, 'avaliacao_do_guia',
    'Nota do GuiaTennis: ' || p_nota || ' de 5' || case when r.quer_contato then ' (quer contato)' else '' end,
    'Avaliação do GuiaTennis', public.email_p(public.html_texto(v_resumo))
      || public.email_p('Responda em Nota do GuiaTennis, no painel: a resposta chega por e-mail para quem avaliou.'),
    v_resumo, 'nota');
  return to_jsonb(r) - 'user_id';
end $$;

-- responder_avaliacao_do_guia (de 20261110140000_nota_do_guiatennis.sql)
create or replace function public.responder_avaliacao_do_guia(p_id uuid, p_resposta text, p_feito text, p_oculta boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.avaliacoes_do_guia;
  v_resposta text := nullif(btrim(coalesce(p_resposta, '')), '');
  v_feito text := nullif(btrim(coalesce(p_feito, '')), '');
  v_email text;
  v_link text;
  v_texto text;
begin
  if not public.eh_admin() then
    raise exception 'Só o admin responde.' using errcode = '42501';
  end if;
  if length(coalesce(v_resposta, '')) > 1000 or length(coalesce(v_feito, '')) > 300 then
    raise exception 'Texto longo demais.' using errcode = '22023';
  end if;
  select * into a from public.avaliacoes_do_guia where id = p_id;
  if not found then
    raise exception 'Avaliação não encontrada.' using errcode = '22023';
  end if;
  select u.email into v_email from auth.users u where u.id = a.user_id;
  v_link := public.site_dos_emails() || case when a.publico = 'parceiro' then '/parceiros/perfil' else '/perfil' end || '?utm_source=Email-nota-do-guia';
  if v_resposta is not null and v_resposta is distinct from a.resposta then
    update public.avaliacoes_do_guia set resposta = v_resposta, respondida_em = now() where id = p_id;
    v_texto := 'Obrigado por avaliar o GuiaTennis. Esta é a nossa resposta: ' || v_resposta;
    if public.email_valido(v_email) then
      perform public.por_na_fila('resposta-do-guia:' || p_id || ':' || md5(v_resposta), 'resposta_do_guia', v_email,
        'O GuiaTennis respondeu à sua avaliação',
        public.email_montado('O GuiaTennis respondeu', public.email_p('Obrigado por avaliar o GuiaTennis. Esta é a nossa resposta:')
            || public.email_p(public.html_texto(v_resposta)),
          'Ver a sua avaliação', v_link, 'Você recebe este e-mail porque avaliou o GuiaTennis.'),
        v_texto || E'\n\n' || v_link);
    end if;
  end if;
  if v_feito is not null and a.feito_em is null then
    update public.avaliacoes_do_guia set feito_texto = v_feito, feito_em = now() where id = p_id;
    if public.email_valido(v_email) then
      perform public.por_na_fila('feito-do-guia:' || p_id, 'feito_do_guia', v_email,
        'O que você pediu já está no GuiaTennis',
        public.email_montado('Você pediu, nós fizemos', public.email_p('Quando você avaliou o GuiaTennis, contou o que poderia melhorar. Já está no ar:')
            || public.email_p(public.html_texto(v_feito)) || public.email_p('Obrigado por ajudar a melhorar o GuiaTennis.'),
          'Ver o GuiaTennis', v_link, 'Você recebe este e-mail porque avaliou o GuiaTennis.'),
        'Quando você avaliou o GuiaTennis, contou o que poderia melhorar. Já está no ar: ' || v_feito || E'\n\n' || v_link);
    end if;
  end if;
  if p_oculta is not null then
    update public.avaliacoes_do_guia set oculta = p_oculta where id = p_id;
  end if;
  select * into a from public.avaliacoes_do_guia where id = p_id;
  return to_jsonb(a) - 'user_id';
end $$;

-- preparar_resumos_do_mes (de 20261110160000_reserva_online.sql)
CREATE OR REPLACE FUNCTION public.preparar_resumos_do_mes(p_hoje date DEFAULT NULL::date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_hoje date := coalesce(p_hoje, public.hoje_em_brasilia());
  v_ini date := (date_trunc('month', v_hoje) - interval '1 month')::date;
  v_fim date := date_trunc('month', v_hoje)::date;
  v_ant date := (date_trunc('month', v_hoje) - interval '2 months')::date;
  v_ini_ts timestamptz := v_ini::timestamp at time zone 'America/Sao_Paulo';
  v_fim_ts timestamptz := v_fim::timestamp at time zone 'America/Sao_Paulo';
  v_ant_ts timestamptz := v_ant::timestamp at time zone 'America/Sao_Paulo';
  v_mes text := public.mes_por_extenso(v_ini);
  v_mes_ant text := public.mes_por_extenso(v_ant);
  a record;
  r record;
  v_acessos int;
  v_antes int;
  v_aval int;
  v_media numeric;
  v_sem_resposta int;
  v_whats int;
  v_insta int;
  v_site int;
  v_reserva int;
  v_compart int;
  v_origens text;
  v_premium boolean;
  v_linha text;
  v_corpo text;
  v_texto text;
  v_link text;
  v_botao text;
  v_parar text;
  v_n int := 0;
  -- Um número grande com a legenda embaixo, como o relatório do Google.
  numero constant text := '<td style="padding:10px 12px;background:#F6F1E7;border-radius:10px;vertical-align:top">';
begin
  if extract(day from v_hoje) > 7 then
    return 0;
  end if;
  for a in
    select x.id, x.name, coalesce(x.plano, 'basico') as plano
    from public.academias x
    where public.academia_no_ar(x)
      and coalesce(x.publicada_em, x.created_at) < v_fim_ts
      and exists (select 1 from public.academia_vinculos v where v.academia_id = x.id)
  loop
    select count(*) filter (where c.created_at >= v_ini_ts),
           count(*) filter (where c.created_at < v_ini_ts)
      into v_acessos, v_antes
      from public.cliques c
      where c.academia_id = a.id and c.tipo = 'visualizacao'
        and c.created_at >= v_ant_ts and c.created_at < v_fim_ts;
    select count(*), round(avg(v.stars)::numeric, 1) into v_aval, v_media
      from public.avaliacoes v
      where v.academia_id = a.id and v.created_at >= v_ini_ts and v.created_at < v_fim_ts;
    select count(*) into v_sem_resposta
      from public.avaliacoes v
      where v.academia_id = a.id and not exists (select 1 from public.respostas x where x.avaliacao_id = v.id);
    v_premium := a.plano = 'premium';

    v_linha := case
      when v_antes = 0 then ''
      when v_acessos = v_antes then 'O mesmo número de ' || v_mes_ant || '.'
      when v_acessos > v_antes then round((v_acessos - v_antes) * 100.0 / v_antes) || '% a mais que em ' || v_mes_ant || ' (' || v_antes || ').'
      else round((v_antes - v_acessos) * 100.0 / v_antes) || '% a menos que em ' || v_mes_ant || ' (' || v_antes || ').'
    end;
    v_corpo := public.email_p('Os números da ficha da <strong>' || public.html_texto(a.name) || '</strong> no GuiaTennis em ' || v_mes || ':')
      || '<table role="presentation" cellpadding="0" cellspacing="6" border="0" style="width:100%;border-collapse:separate;margin:0 0 8px"><tr>'
      || numero || '<div style="font-size:26px;font-weight:bold;color:#1F4D3A">' || v_acessos || '</div>'
      || '<div style="font-size:13px;color:#6B6458">' || case when v_acessos = 1 then 'acesso à ficha' else 'acessos à ficha' end || '</div></td>'
      || numero || '<div style="font-size:26px;font-weight:bold;color:#1F4D3A">' || v_aval || '</div>'
      || '<div style="font-size:13px;color:#6B6458">' || case when v_aval = 1 then 'avaliação nova' else 'avaliações novas' end
      || case when v_aval > 0 then ' · média ' || replace(v_media::text, '.', ',') || ' ★' else '' end || '</div></td>'
      || '</tr></table>'
      || case when v_linha <> '' then '<p style="margin:0 0 12px;font-size:13px;color:#6B6458">Acessos: ' || v_linha || '</p>' else '' end;
    v_texto := 'Os números da ficha da ' || a.name || ' no GuiaTennis em ' || v_mes || E':\n\n'
      || '• ' || v_acessos || case when v_acessos = 1 then ' acesso à ficha' else ' acessos à ficha' end
      || case when v_linha <> '' then ' (' || v_linha || ')' else '' end || E'\n'
      || '• ' || v_aval || case when v_aval = 1 then ' avaliação nova' else ' avaliações novas' end
      || case when v_aval > 0 then ' (média ' || replace(v_media::text, '.', ',') || ' ★)' else '' end;

    if v_premium then
      select count(*) filter (where c.tipo = 'whatsapp'), count(*) filter (where c.tipo = 'instagram'),
             count(*) filter (where c.tipo = 'site'), count(*) filter (where c.tipo = 'compartilhar'),
             count(*) filter (where c.tipo = 'reserva')
        into v_whats, v_insta, v_site, v_compart, v_reserva
        from public.cliques c
        where c.academia_id = a.id and c.created_at >= v_ini_ts and c.created_at < v_fim_ts;
      select string_agg(o.nome || ' (' || o.n || ')', ', ' order by o.n desc, o.nome) into v_origens
        from (select coalesce(nullif(c.origem, ''), 'Direto') as nome, count(*) as n
              from public.cliques c
              where c.academia_id = a.id and c.tipo = 'visualizacao'
                and c.created_at >= v_ini_ts and c.created_at < v_fim_ts
              group by 1 order by 2 desc, 1 limit 3) o;
      v_corpo := v_corpo
        || public.email_p('<strong>Quem chamou:</strong> WhatsApp ' || v_whats || ' · Instagram ' || v_insta || ' · site ' || v_site
             || case when v_reserva > 0 then ' · reserva online ' || v_reserva else '' end
             || '. ' || case when v_compart = 1 then '1 pessoa compartilhou' else v_compart || ' pessoas compartilharam' end || ' a ficha.')
        || case when v_origens is not null then public.email_p('<strong>De onde vieram:</strong> ' || public.html_texto(v_origens) || '.') else '' end;
      v_texto := v_texto || E'\n• Quem chamou: WhatsApp ' || v_whats || ' · Instagram ' || v_insta || ' · site ' || v_site
             || case when v_reserva > 0 then ' · reserva online ' || v_reserva else '' end
        || E'\n• Compartilharam a ficha: ' || v_compart
        || case when v_origens is not null then E'\n• De onde vieram: ' || v_origens else '' end;
    end if;

    if v_sem_resposta > 0 then
      v_corpo := v_corpo || public.email_p(case when v_sem_resposta = 1 then '1 avaliação espera' else v_sem_resposta || ' avaliações esperam' end
        || ' resposta. Responder mostra aos próximos jogadores que a academia cuida de quem joga lá.');
      v_texto := v_texto || E'\n\n' || case when v_sem_resposta = 1 then '1 avaliação espera' else v_sem_resposta || ' avaliações esperam' end
        || ' resposta. Responder mostra aos próximos jogadores que a academia cuida de quem joga lá.';
    end if;

    v_botao := case when v_premium then 'Ver o desempenho' else 'Abrir o GuiaTennis Parceiros' end;
    v_link := public.site_dos_emails() || '/parceiros/' || case when v_premium then 'desempenho' else 'painel' end
      || '?abrir=' || right(replace(a.id::text, '-', ''), 8) || '&utm_source=Email-resumo';

    for r in select * from public.quem_recebe_da_academia(a.id) loop
      v_parar := public.link_parar_avisos(r.token_avisos, 'parceiros');
      if public.por_na_fila(
        'resumo:' || a.id || ':' || r.user_id || ':' || to_char(v_ini, 'YYYY-MM'), 'resumo_do_mes', r.email,
        initcap(v_mes) || ' na ' || a.name || ': ' || v_acessos || case when v_acessos = 1 then ' acesso à ficha' else ' acessos à ficha' end,
        public.email_montado('O mês de ' || v_mes || ' na ' || a.name, v_corpo, v_botao, v_link,
          'Você recebe este resumo no começo de cada mês porque administra a ' || public.html_texto(a.name)
          || ' no GuiaTennis Parceiros. <a href="' || public.html_texto(v_parar)
          || '" style="color:#6B6458">Não quero mais receber avisos por e-mail</a>.'),
        v_texto || E'\n\n' || v_botao || ': ' || v_link
          || E'\n\nNão quer mais receber avisos por e-mail? ' || v_parar,
        v_parar) then
        v_n := v_n + 1;
      end if;
    end loop;
  end loop;
  return v_n;
end $function$;

-- responder_no_chat (de 20261112120000_chat_com_o_guia_e_relatos.sql)
create or replace function public.responder_no_chat(p_conversa uuid, p_texto text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.conversas_de_ajuda;
  r public.respostas_no_chat;
  v_texto text := btrim(coalesce(p_texto, ''));
  v_email text;
  v_link text;
begin
  if not public.eh_admin() then
    raise exception 'Só o admin responde no chat.' using errcode = '42501';
  end if;
  if char_length(v_texto) = 0 or char_length(v_texto) > 1000 then
    raise exception 'Escreva a mensagem (até 1000 letras).' using errcode = '22023';
  end if;
  select * into c from public.conversas_de_ajuda where id = p_conversa;
  if not found then
    raise exception 'Conversa não encontrada.' using errcode = '22023';
  end if;
  insert into public.respostas_no_chat (conversa_id, user_id, texto) values (c.id, c.user_id, v_texto) returning * into r;
  update public.conversas_de_ajuda set resolvida = false, atualizada_em = now() where id = c.id;
  select u.email into v_email from auth.users u where u.id = c.user_id;
  v_link := public.site_dos_emails() || case when c.site = 'parceiros' then '/parceiros' else '/' end
    || '?chat=' || c.id || '&utm_source=Email-chat';
  if public.email_valido(v_email) then
    perform public.por_na_fila('resposta-no-chat:' || r.id, 'resposta_no_chat', v_email,
      'O GuiaTennis respondeu no chat',
      public.email_montado('O GuiaTennis respondeu no chat',
          public.email_p('Na conversa "' || public.html_texto(c.titulo) || '", o GuiaTennis respondeu:')
          || public.email_p(public.html_texto(v_texto)),
        'Abrir a conversa', v_link, 'Você recebe este e-mail porque conversou pelo chat de ajuda do GuiaTennis.'),
      'Na conversa "' || c.titulo || '", o GuiaTennis respondeu: ' || v_texto || E'\n\n' || v_link);
  end if;
  return jsonb_build_object('id', r.id, 'texto', r.texto, 'em', r.criada_em, 'lida_em', r.lida_em);
end $$;
