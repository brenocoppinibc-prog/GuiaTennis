-- ============================================================
-- A nota do GuiaTennis (pedido do Breno em 10/11/2026, regra 234: "criar
-- algo para avaliarem, darem feedback e mostrar essa nota aos jogadores e
-- principalmente aos parceiros para vender mais. pense em situações para
-- ajudar o público que avaliaria tbm, smp ser uma via de mão dupla")
-- ============================================================
-- Como a nota de um app na App Store e no Google Play e as avaliações do
-- Trustpilot: jogadores e academias dão de 1 a 5 estrelas ao GuiaTennis, com
-- o que mais ajudou ou o que faltou e um comentário opcional. Uma avaliação
-- por conta em cada lado (jogador ou parceiro), que a pessoa pode mudar
-- quando quiser. A nota que aparece no site é a média de todas, sem filtro;
-- o comentário só aparece com a permissão de quem escreveu (jogador: o
-- primeiro nome e a inicial; parceiro: o nome da academia). Mão dupla: o
-- GuiaTennis responde cada uma (a resposta chega por e-mail e aparece junto
-- do comentário) e, quando o pedido vira melhoria, avisa "o que você pediu já
-- está no GuiaTennis". Nota baixa pode pedir contato do GuiaTennis.
--   avaliacoes_do_guia             uma por conta e lado (só pelas funções).
--   avaliar_o_guia                 grava ou muda a avaliação; avisa o admin.
--   minha_avaliacao_do_guia        a da conta, com a resposta.
--   nota_do_guia                   pública: média, total e os comentários
--                                  liberados de cada lado.
--   avaliacoes_do_guia_admin       todas, com o e-mail de quem avaliou.
--   responder_avaliacao_do_guia    só o admin: responde, marca o que foi
--                                  feito e tira o comentário do site.
-- Pode rodar de novo sem estragar nada.

create table if not exists public.avaliacoes_do_guia (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  publico text not null check (publico in ('jogador', 'parceiro')),
  academia_id uuid references public.academias (id) on delete set null,
  nota smallint not null check (nota between 1 and 5),
  pontos text[] not null default '{}',
  comentario text,
  pode_mostrar boolean not null default false,
  nome_publico text,
  quer_contato boolean not null default false,
  momento text,
  resposta text,
  respondida_em timestamptz,
  feito_texto text,
  feito_em timestamptz,
  oculta boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, publico)
);
alter table public.avaliacoes_do_guia enable row level security;
revoke all on public.avaliacoes_do_guia from anon, authenticated;

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
    || case when r.quer_contato then ' e pediu que o GuiaTennis fale com ele' else '' end
    || case when v_texto is not null then ': "' || v_texto || '"' else '.' end;
  perform public.aviso_ao_admin('nota-do-guia:' || r.id || ':' || extract(epoch from r.updated_at)::bigint, 'avaliacao_do_guia',
    'Nota do GuiaTennis: ' || p_nota || ' de 5' || case when r.quer_contato then ' (quer contato)' else '' end,
    'Avaliação do GuiaTennis', public.email_p(public.html_texto(v_resumo))
      || public.email_p('Responda em Nota do GuiaTennis, no painel: a resposta chega por e-mail para quem avaliou.'),
    v_resumo, 'nota');
  return to_jsonb(r) - 'user_id';
end $$;

create or replace function public.minha_avaliacao_do_guia(p_publico text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(a) - 'user_id' from public.avaliacoes_do_guia a
  where a.user_id = auth.uid() and a.publico = p_publico;
$$;

-- Pública: a nota de cada lado é a média de todas as avaliações; os
-- comentários são só os liberados por quem escreveu e não tirados pelo
-- GuiaTennis, os mais novos primeiro, com a resposta.
create or replace function public.nota_do_guia()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_object_agg(p.publico, jsonb_build_object(
    'media', (select round(avg(a.nota)::numeric, 1) from public.avaliacoes_do_guia a where a.publico = p.publico),
    'total', (select count(*) from public.avaliacoes_do_guia a where a.publico = p.publico),
    'comentarios', coalesce((select jsonb_agg(jsonb_build_object('nome', x.nome_publico, 'nota', x.nota, 'texto', x.comentario,
                       'quando', x.updated_at, 'resposta', x.resposta) order by x.updated_at desc)
                     from (select * from public.avaliacoes_do_guia a
                           where a.publico = p.publico and a.pode_mostrar and not a.oculta and a.comentario is not null
                           order by a.updated_at desc limit 6) x), '[]'::jsonb)))
  from (values ('jogador'), ('parceiro')) p(publico);
$$;

create or replace function public.avaliacoes_do_guia_admin()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o admin vê as avaliações do GuiaTennis.' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg((to_jsonb(a) - 'user_id') || jsonb_build_object(
             'email', (select u.email from auth.users u where u.id = a.user_id),
             'academia', (select ac.name from public.academias ac where ac.id = a.academia_id))
           order by (a.resposta is null) desc, a.updated_at desc)
         from public.avaliacoes_do_guia a), '[]'::jsonb);
end $$;

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
        public.email_montado('Você pediu, nós fizemos', public.email_p('Quando você avaliou o GuiaTennis, contou o que podia melhorar. Já está no ar:')
            || public.email_p(public.html_texto(v_feito)) || public.email_p('Obrigado por ajudar a melhorar o GuiaTennis.'),
          'Ver o GuiaTennis', v_link, 'Você recebe este e-mail porque avaliou o GuiaTennis.'),
        'Quando você avaliou o GuiaTennis, contou o que podia melhorar. Já está no ar: ' || v_feito || E'\n\n' || v_link);
    end if;
  end if;
  if p_oculta is not null then
    update public.avaliacoes_do_guia set oculta = p_oculta where id = p_id;
  end if;
  select * into a from public.avaliacoes_do_guia where id = p_id;
  return to_jsonb(a) - 'user_id';
end $$;

revoke all on function public.avaliar_o_guia(text, integer, text[], text, boolean, boolean, text, uuid) from public, anon;
grant execute on function public.avaliar_o_guia(text, integer, text[], text, boolean, boolean, text, uuid) to authenticated;
revoke all on function public.minha_avaliacao_do_guia(text) from public, anon;
grant execute on function public.minha_avaliacao_do_guia(text) to authenticated;
revoke all on function public.nota_do_guia() from public;
grant execute on function public.nota_do_guia() to anon, authenticated;
revoke all on function public.avaliacoes_do_guia_admin() from public, anon;
grant execute on function public.avaliacoes_do_guia_admin() to authenticated;
revoke all on function public.responder_avaliacao_do_guia(uuid, text, text, boolean) from public, anon;
grant execute on function public.responder_avaliacao_do_guia(uuid, text, text, boolean) to authenticated;
