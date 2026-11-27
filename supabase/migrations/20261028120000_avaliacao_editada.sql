-- ============================================================
-- Avaliação editada (pedido do Breno em 28/10/2026: "Avaliações em academias
-- podem ser feitas uma vez e podem ser editadas. E aparecer que foi editada.
-- o mesmo pode ser feito com as academias")
-- ============================================================
-- Como o Google Maps e o Instagram: cada conta avalia uma vez cada academia
-- (o índice avaliacoes_uma_por_conta já garante), muda a nota e o texto
-- quando quiser, e a avaliação mostra "editada". A resposta da academia,
-- também uma por avaliação (a chave de respostas), segue a mesma regra.
--
--   avaliacoes.editada_em       a última vez que o autor mudou a nota ou o
--                               texto. As outras mudanças (o nome da conta,
--                               a conta excluída) não contam.
--   respostas.editada_em        o mesmo para a resposta da academia; antes, o
--                               site comparava updated_at com created_at.
--   minhas_avaliacoes()         as avaliações da conta, para a ficha mostrar
--                               "Sua avaliação" com o "Editar".
--   editar_minha_avaliacao      o autor muda a nota e o texto, com as regras
--                               de quem avalia (nome suspenso, quem
--                               administra a academia não avalia ela).
--   aviso_de_avaliacao_editada  quem administra a academia recebe um e-mail
--                               com a nota e o texto novos (no máximo um por
--                               avaliação por dia).
-- ============================================================

-- 1. A avaliação editada ---------------------------------------------------------
alter table public.avaliacoes add column if not exists editada_em timestamptz;
grant select (editada_em) on table public.avaliacoes to anon, authenticated;

create or replace function public.minhas_avaliacoes()
returns table (id uuid, academia_id uuid, stars int, comment text, created_at timestamptz, editada_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id, v.academia_id, v.stars, v.comment, v.created_at, v.editada_em
  from public.avaliacoes v
  where auth.uid() is not null and v.user_id = auth.uid()
  order by v.created_at desc;
$$;

create or replace function public.editar_minha_avaliacao(p_avaliacao uuid, p_stars int, p_comment text)
returns table (id uuid, academia_id uuid, stars int, comment text, created_at timestamptz, editada_em timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.avaliacoes;
  v_texto text := btrim(coalesce(p_comment, ''));
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para editar a avaliação.' using errcode = '42501';
  end if;
  select * into v from public.avaliacoes a where a.id = p_avaliacao and a.user_id = auth.uid();
  if not found then
    raise exception 'Essa avaliação não é da sua conta.' using errcode = '42501';
  end if;
  if p_stars is null or p_stars not between 1 and 5 then
    raise exception 'Escolha de 1 a 5 estrelas.' using errcode = '22023';
  end if;
  if length(v_texto) > 2000 then
    raise exception 'O texto passa de 2.000 letras.' using errcode = '22023';
  end if;
  if exists (select 1 from public.nomes_suspensos n where n.user_id = auth.uid() and n.resolvido_em is null) then
    raise exception 'O seu nome está suspenso: troque o nome em Minha conta para editar a avaliação.' using errcode = '42501';
  end if;
  if exists (select 1 from public.academia_vinculos m where m.user_id = auth.uid() and m.academia_id = v.academia_id) then
    raise exception 'Você administra essa academia: responda às avaliações pelo painel do GuiaTennis Parceiros.' using errcode = '42501';
  end if;
  -- Salvar sem mudar nada não marca "editada".
  if p_stars <> v.stars or v_texto <> btrim(coalesce(v.comment, '')) then
    update public.avaliacoes a set stars = p_stars, comment = v_texto, editada_em = now()
    where a.id = v.id;
  end if;
  return query
    select a.id, a.academia_id, a.stars, a.comment, a.created_at, a.editada_em
    from public.avaliacoes a where a.id = v.id;
end $$;

-- 2. A academia fica sabendo -------------------------------------------------------
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
      public.email_montado('Avaliação editada', v_corpo, case when v_respondeu then 'Ver a avaliação' else 'Responder a avaliação' end, v_link,
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

drop trigger if exists aviso_de_avaliacao_editada on public.avaliacoes;
create trigger aviso_de_avaliacao_editada
  after update of editada_em on public.avaliacoes
  for each row execute function public.aviso_de_avaliacao_editada();

-- 3. A resposta da academia editada ----------------------------------------------
alter table public.respostas add column if not exists editada_em timestamptz;
grant select (editada_em) on table public.respostas to anon, authenticated;

-- As respostas que o site já mostrava como "editada" (updated_at mais de um
-- minuto depois de created_at) continuam assim. Sem o gatilho, que trocaria
-- as datas.
alter table public.respostas disable trigger resposta_editada;
update public.respostas set editada_em = updated_at
where editada_em is null and updated_at > created_at + interval '1 minute';
alter table public.respostas enable trigger resposta_editada;

create or replace function public.resposta_editada()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.avaliacao_id := old.avaliacao_id;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  -- "editada" só quando o texto muda; salvar o mesmo texto não conta.
  new.editada_em := case when btrim(new.texto) is distinct from btrim(old.texto) then now() else old.editada_em end;
  return new;
end $$;

-- Permissões ------------------------------------------------------------------
revoke all on function public.aviso_de_avaliacao_editada() from public, anon, authenticated;
revoke all on function public.minhas_avaliacoes() from public, anon;
grant execute on function public.minhas_avaliacoes() to authenticated;
revoke all on function public.editar_minha_avaliacao(uuid, int, text) from public, anon;
grant execute on function public.editar_minha_avaliacao(uuid, int, text) to authenticated;

notify pgrst, 'reload schema';
