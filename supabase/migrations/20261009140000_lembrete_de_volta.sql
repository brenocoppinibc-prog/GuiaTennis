-- ============================================================
-- Lembrete para o jogador que não entra há 3 meses (pedido do Breno em
-- 09/10/2026: "quero fazer um lembrete aos usuários que não entraram a 3
-- meses", e, perguntado, "todos com e-mail confirmado")
-- ============================================================
-- Como o "Sentimos sua falta" do Booking e do Airbnb, mas com o que serve
-- para quem joga: as academias que entraram na cidade da conta desde a
-- última visita. Diferente dos outros avisos do jogador (que começam
-- desligados, regra 23), este começa LIGADO para toda conta com o e-mail
-- confirmado; a pessoa desliga em Minha conta › Avisos por e-mail ou pelo
-- link do próprio e-mail ("Não quero mais receber este lembrete").
--
--   jogadores.visto_em               última vez que o site abriu com a
--                                    conta aberta (no máximo uma vez a
--                                    cada 12 horas, marcar_visita_da_conta)
--   jogadores.lembrete_de_volta      a pessoa quer o lembrete (de saída, sim)
--   jogadores.lembrado_de_volta_em   quando foi lembrada
--
-- A última visita é a mais recente entre visto_em, o último login do
-- Supabase e a criação da conta. Sai junto com os avisos do dia, uma vez
-- por ausência: só volta a sair depois de a pessoa entrar de novo e ficar
-- mais 3 meses sem entrar. Quem administra academia no Parceiros não
-- recebe (já recebe o resumo do mês). No máximo 200 por dia, para o
-- domínio do e-mail não parecer envio em massa.
--
-- Pode rodar de novo sem estragar nada.

alter table public.jogadores add column if not exists visto_em timestamptz;
alter table public.jogadores add column if not exists lembrete_de_volta boolean not null default true;
alter table public.jogadores add column if not exists lembrado_de_volta_em timestamptz;
grant update (lembrete_de_volta) on table public.jogadores to authenticated;

-- O site chama ao abrir com a conta aberta.
create or replace function public.marcar_visita_da_conta()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.jogadores set visto_em = now()
  where user_id = auth.uid() and (visto_em is null or visto_em < now() - interval '12 hours');
$$;

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
          || case when cardinality(v_ids) = 1 then 'entrou esta academia' else 'entraram estas academias' end || ' no guia:')
        || v_lista.html;
      v_texto := v_texto || E'\n\nDesde a sua última visita, '
        || case when cardinality(v_ids) = 1 then 'entrou esta academia' else 'entraram estas academias' end || E' no guia:\n' || v_lista.texto;
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

-- O link "Não quero mais receber" ganha o lembrete de volta (SQL
-- 20261008140000, mais o 'volta'; "todos" também desliga ele).
create or replace function public.parar_avisos(p_token uuid, p_aviso text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if p_token is null then
    return null;
  end if;
  select user_id into v_user from public.jogadores where token_avisos = p_token;
  if v_user is not null then
    if p_aviso = 'viagem' then
      update public.jogadores set avisos_viagem = false, avisos_mudados_em = now() where user_id = v_user;
      return 'viagem';
    elsif p_aviso = 'novas' then
      update public.jogadores set avisos_academias = false, avisos_mudados_em = now() where user_id = v_user;
      update public.buscas_salvas set avisar = false where user_id = v_user;
      return 'novas';
    elsif p_aviso = 'promocoes' then
      update public.jogadores set promocoes = false, avisos_mudados_em = now() where user_id = v_user;
      return 'promocoes';
    elsif p_aviso = 'volta' then
      update public.jogadores set lembrete_de_volta = false, avisos_mudados_em = now() where user_id = v_user;
      return 'volta';
    end if;
    update public.jogadores
      set avisos_academias = false, promocoes = false, novidades = false, avisos_viagem = false,
          lembrete_de_volta = false, avisos_mudados_em = now()
      where user_id = v_user;
    update public.buscas_salvas set avisar = false where user_id = v_user;
    return 'todos';
  end if;
  select user_id into v_user from public.academia_acessos where token_avisos = p_token;
  if v_user is not null then
    update public.academia_acessos set avisos_por_email = false, updated_at = now() where user_id = v_user;
    return 'parceiros';
  end if;
  return null;
end $$;

revoke all on function public.marcar_visita_da_conta() from public, anon;
grant execute on function public.marcar_visita_da_conta() to authenticated;
revoke all on function public.preparar_lembretes_de_volta() from public, anon, authenticated;
revoke all on function public.parar_avisos(uuid, text) from public;
grant execute on function public.parar_avisos(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
