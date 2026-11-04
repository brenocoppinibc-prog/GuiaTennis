-- ============================================================
-- "Acessos" no lugar de "Pessoas" nos e-mails (pedido do Breno em
-- 13/10/2026, com print do e-mail de pessoa nova: "não seria melhor usar a
-- palavra acessos? até no site mesmo")
-- ============================================================
-- A página do GuiaTennis Parceiros "Pessoas" virou "Acessos"
-- (/parceiros/acessos; o endereço antigo continua abrindo), como o
-- "Acessos ao Parceiros" do painel do admin e o "Pessoas e acesso" do Google
-- Business Profile. Os avisos acompanham:
--   pessoa nova     "Acesso novo na academia", "Tire o acesso dela em
--                   Acessos" e "Ver os acessos"
--   plano novo      "o responsável principal tira quem passar do limite em
--                   Acessos"
--   pedido de acesso "aceite em Acessos"
-- Só os textos e os links mudam; quem recebe continua igual (SQL
-- 20261013120000 e 20261013130000). Pode rodar de novo sem estragar nada.

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
  v_dados text;
  v_link text := public.site_dos_emails() || '/parceiros/acessos?abrir=' || right(replace(new.academia_id::text, '-', ''), 8)
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
  v_dados := concat_ws(' · ', nullif(btrim(coalesce(p.cargo, '')), ''), v_email);
  for r in
    select q.user_id, q.email, q.token_avisos, v.papel
    from public.quem_recebe_da_academia(new.academia_id) q
    join public.academia_vinculos v on v.user_id = q.user_id and v.academia_id = new.academia_id
    where q.user_id <> new.user_id and q.user_id is distinct from auth.uid()
  loop
    v_parar := public.link_parar_avisos(r.token_avisos, 'parceiros');
    v_corpo := public.email_p('<strong>' || public.html_texto(v_quem) || '</strong>'
        || case when v_dados <> '' then ' (' || public.html_texto(v_dados) || ')' else '' end
        || ' agora também administra a <strong>' || public.html_texto(v_academia) || '</strong> no GuiaTennis Parceiros'
        || case when new.papel = 'principal' then ', como responsável principal.' else '.' end)
      || public.email_p(case when r.papel = 'principal'
           then 'Não conhece essa pessoa? Tire o acesso dela em <strong>Acessos</strong>, no painel da academia.'
           else 'Não conhece essa pessoa? Fale com o responsável principal da academia ou com o GuiaTennis.' end);
    perform public.por_na_fila(
      'pessoa-nova:' || new.academia_id || ':' || new.user_id || ':' || r.user_id || ':' || v_dia, 'pessoa_nova', r.email,
      v_quem || ' agora administra a ' || v_academia || ' com você',
      public.email_montado('Acesso novo na academia', v_corpo,
        case when r.papel = 'principal' then 'Ver os acessos' else 'Abrir o GuiaTennis Parceiros' end,
        case when r.papel = 'principal' then v_link
             else public.site_dos_emails() || '/parceiros/painel?utm_source=Email-pessoa' end,
        'Você recebe este e-mail porque administra a ' || public.html_texto(v_academia)
        || ' no GuiaTennis Parceiros. <a href="' || public.html_texto(v_parar)
        || '" style="color:#6B6458">Não quero mais receber avisos por e-mail</a>.'),
      v_quem || case when v_dados <> '' then ' (' || v_dados || ')' else '' end
        || ' agora também administra a ' || v_academia || ' no GuiaTennis Parceiros'
        || case when new.papel = 'principal' then ', como responsável principal.' else '.' end
        || E'\n\n' || case when r.papel = 'principal'
             then 'Não conhece essa pessoa? Tire o acesso dela em Acessos, no painel da academia: ' || v_link
             else 'Não conhece essa pessoa? Fale com o responsável principal da academia ou com o GuiaTennis.' end
        || E'\n\nNão quer mais receber avisos por e-mail? ' || v_parar,
      v_parar);
  end loop;
  return new;
exception when others then
  raise warning 'aviso de pessoa nova: %', sqlerrm;
  return new;
end $$;

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
             || ' permite até ' || v_limite || ': o responsável principal tira quem passar do limite em <strong>Acessos</strong>.') else '' end;
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
             || public.nome_do_plano(v_para) || ' permite até ' || v_limite || ': o responsável principal tira quem passar do limite em Acessos.' else '' end
        || E'\n\nVer o plano: ' || v_link
        || E'\n\nNão quer mais receber avisos por e-mail? ' || v_parar,
      v_parar);
  end loop;
  return new;
exception when others then
  raise warning 'aviso de plano novo: %', sqlerrm;
  return new;
end $$;

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
             then 'Se a pessoa trabalha com você, aceite em <strong>Acessos</strong>, no painel da academia. Se não conhece, recuse: ela não vê nada da academia.'
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
               then 'Se a pessoa trabalha com você, aceite em Acessos, no painel da academia. Se não conhece, recuse.'
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

revoke all on function public.aviso_de_pessoa_nova() from public, anon, authenticated;
revoke all on function public.aviso_de_plano_novo() from public, anon, authenticated;
revoke all on function public.aviso_de_pedido_de_acesso() from public, anon, authenticated;
