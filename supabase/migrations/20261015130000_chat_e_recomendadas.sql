-- ============================================================
-- Chat de ajuda na conta também no site dos jogadores, com "Em aberto" ou
-- "Resolvida", e o Completo nas recomendadas (pedidos do Breno em
-- 15/10/2026: "deixe que o chat possa ser salvo na conta e ter abas de
-- navegação dentro dos chat com títulos e resolvida ou não"; "as academias
-- no completo também podem aparecer nas recomendadas quanto mais
-- preenchidas")
-- ============================================================
--   conversas_de_ajuda.resolvida   a pessoa marca (ou o chat, quando ela diz
--                                  que resolveu); pergunta nova reabre.
--   guardar_conversa_de_ajuda      ganha p_resolvida (vazio = não muda) e
--                                  guarda as 50 mais recentes de cada site.
--   o_que_muda_no_plano            o e-mail "Plano novo" conta o Completo
--                                  nas recomendadas.
-- Pode rodar de novo sem estragar nada.

alter table public.conversas_de_ajuda add column if not exists resolvida boolean not null default false;

-- A versão de 4 argumentos sai: chamada com 4, cai nesta (p_resolvida vazio).
drop function if exists public.guardar_conversa_de_ajuda(uuid, text, text, jsonb);
create or replace function public.guardar_conversa_de_ajuda(p_id uuid, p_site text, p_titulo text, p_mensagens jsonb, p_resolvida boolean default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_titulo text;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para guardar a conversa.' using errcode = '42501';
  end if;
  if p_site is null or p_site not in ('parceiros', 'jogadores') then
    raise exception 'Chat inválido.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_mensagens) is distinct from 'array' or jsonb_array_length(p_mensagens) = 0
     or jsonb_array_length(p_mensagens) > 120 or pg_column_size(p_mensagens) > 65536 then
    raise exception 'Conversa inválida.' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_mensagens) m
             where jsonb_typeof(m) is distinct from 'object'
                or coalesce(m->>'de', '') not in ('eu', 'gt')
                or jsonb_typeof(m->'texto') is distinct from 'string'
                or char_length(m->>'texto') > 2000
                or (m->>'de' = 'eu' and char_length(m->>'texto') > 300)) then
    raise exception 'Conversa inválida.' using errcode = '22023';
  end if;
  v_titulo := nullif(left(btrim(coalesce(p_titulo, '')), 80), '');
  if v_titulo is null then
    select nullif(left(btrim(e.m->>'texto'), 80), '') into v_titulo
      from jsonb_array_elements(p_mensagens) with ordinality e(m, i)
      where e.m->>'de' = 'eu' order by e.i limit 1;
  end if;
  if v_titulo is null then
    raise exception 'Escreva a sua dúvida antes.' using errcode = '22023';
  end if;

  if p_id is not null then
    update public.conversas_de_ajuda
      set mensagens = p_mensagens, titulo = v_titulo, atualizada_em = now(),
          resolvida = coalesce(p_resolvida, resolvida)
      where id = p_id and user_id = auth.uid()
      returning id into v_id;
  end if;
  -- Conversa nova (ou apagada em outro aparelho enquanto estava aberta).
  if v_id is null then
    insert into public.conversas_de_ajuda (user_id, site, titulo, mensagens, resolvida)
      values (auth.uid(), p_site, v_titulo, p_mensagens, coalesce(p_resolvida, false))
      returning id into v_id;
    delete from public.conversas_de_ajuda
      where id in (select c.id from public.conversas_de_ajuda c
                   where c.user_id = auth.uid() and c.site = p_site
                   order by c.atualizada_em desc, c.criada_em desc
                   offset 50);
  end if;
  return v_id;
end $$;

revoke all on function public.guardar_conversa_de_ajuda(uuid, text, text, jsonb, boolean) from public, anon;
grant execute on function public.guardar_conversa_de_ajuda(uuid, text, text, jsonb, boolean) to authenticated;

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
    (6, 2, 'Entre as “Academias recomendadas” da página inicial, quanto mais completa a ficha'),
    (7, 3, 'O selo dourado ao lado do nome'),
    (8, 3, 'O topo da busca da região, marcado como “Patrocinado”'),
    (9, 3, 'Primeiro entre as recomendadas, marcada como “Patrocinado”'),
    (10, 3, 'Promoções na ficha e na busca'),
    (11, 3, 'Todos os números em Desempenho'),
    (12, 3, 'O relatório completo do mês por e-mail')) as t(ordem, nivel, item)
  where t.nivel > least(v_de, v_para) and t.nivel <= greatest(v_de, v_para);
  v_itens := v_itens || ('Pessoas com acesso: até ' || public.limite_de_pessoas(p_para)
    || ' (antes, até ' || public.limite_de_pessoas(p_de) || ')');
  select '<ul style="margin:0 0 14px;padding-left:20px;font-size:15px;line-height:1.6;color:#1F2A24">'
           || string_agg('<li>' || public.html_texto(i) || '</li>', '') || '</ul>',
         string_agg('• ' || i, E'\n')
    into html, texto
  from unnest(v_itens) as i;
end $$;

notify pgrst, 'reload schema';
