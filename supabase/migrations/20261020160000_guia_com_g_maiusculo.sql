-- ============================================================
-- "Guia" com G maiúsculo, como nome (pedido do Breno em 19/10/2026: "todos
-- os lugares que citarem 'guia' deixe com o G maiúsculo, como uma marca um
-- nome")
-- ============================================================
-- Os e-mails que ainda diziam "no guia": a academia assumida (para o admin)
-- e o lembrete de volta do jogador ("entraram estas academias no Guia").
-- Só o texto muda. Pode rodar de novo sem estragar nada.

create or replace function public.aviso_de_academia_assumida(p_academia uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  x public.academia_acessos;
  v_quem text;
begin
  select * into a from public.academias where id = p_academia;
  select * into x from public.academia_acessos where user_id = p_user;
  v_quem := coalesce(x.nome_responsavel, x.email) || ' (' || coalesce(x.email, x.usuario) || ')';
  perform public.aviso_ao_admin('assumida:' || p_academia || ':' || p_user, 'academia_assumida',
    'Academia assumida: ' || a.name, 'Academia assumida',
    public.email_p('<strong>' || public.html_texto(v_quem) || '</strong> passou a administrar a <strong>'
      || public.html_texto(a.name) || '</strong>, que já estava no Guia sem responsável, e declarou estar autorizado(a) pela academia.')
    || public.email_p('Confira no painel do admin, em <strong>Pendências</strong>. Se não for da academia, tire o acesso ou exclua a conta.'),
    v_quem || ' passou a administrar a ' || a.name || ', que já estava no Guia sem responsável, e declarou estar autorizado(a) pela academia.');
end $$;

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
        || 'Ele só volta a sair depois da sua próxima visita. <a href="' || public.html_texto(v_parar)
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

revoke all on function public.aviso_de_academia_assumida(uuid, uuid) from public, anon, authenticated;
revoke all on function public.preparar_lembretes_de_volta() from public, anon, authenticated;

notify pgrst, 'reload schema';
