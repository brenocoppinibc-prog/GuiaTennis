-- ============================================================
-- Feedback: a nota do GuiaTennis só para o admin (pedido do Breno em
-- 11/11/2026, regra 238: "renomeie a página de avaliação para feedback ... a
-- nota não mostrar por agr em nenhum lugar e só quem vê sou eu e entrando na
-- página de feedback ver a que fez e a minha resposta")
-- ============================================================
-- Por enquanto, a nota que jogadores e academias dão ao GuiaTennis e os
-- comentários não aparecem no site:
--   nota_do_guia                    a mesma de 20261110140000, mas só devolve
--                                   a nota ao admin (para os outros, nada).
--   pagina_das_avaliacoes_do_guia   sai: a página pública da regra 235 virou
--                                   a página Feedback, onde cada conta vê só o
--                                   próprio feedback e a resposta (pela
--                                   minha_avaliacao_do_guia, que já existe).
--   sitemap                         volta ao de 20260930150000_parceiros_no_sitemap,
--                                   sem a página /avaliacoes.
-- O 20261110150000_pagina_das_avaliacoes_do_guia rodou só no banco de teste e
-- saiu da pasta; este desfaz o que ele criou lá e, no banco de verdade, só
-- refaz o que já existe. Pode rodar de novo sem estragar nada.

drop function if exists public.pagina_das_avaliacoes_do_guia(text, integer, integer, integer);

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
  from (values ('jogador'), ('parceiro')) p(publico)
  where public.eh_admin();
$$;

grant execute on function public.nota_do_guia() to anon, authenticated;

-- O sitemap sem /avaliacoes (o mesmo de 20260930150000_parceiros_no_sitemap).
create or replace function public.sitemap()
returns public."*/*"
language plpgsql
stable
set search_path = ''
as $$
declare
  xml text;
begin
  with no_ar as (
    -- Só colunas que o visitante lê: o sitemap roda com a permissão dele.
    select a.id, a.name, a.cidade, a.bairro, a.created_at from public.academias a
    where a.status = 'published'
      and (a.pausada is not true or a.pausada_ate <= now())
  ),
  enderecos as (
    -- A home primeiro, depois as regiões e as fichas.
    select 1 as grupo, 'https://guiatennis.com.br/' as loc, null::text as ordem
    union all
    -- GuiaTennis Parceiros: apresentação, planos, ajuda e cadastro.
    select 1, 'https://guiatennis.com.br/parceiros' || p, p
      from unnest(array['', '/planos', '/ajuda', '/cadastro']) as p
    union all
    select distinct 2, 'https://guiatennis.com.br/quadras/' || public.slug(cidade), public.slug(cidade)
      from no_ar where public.slug(cidade) <> ''
    union all
    select distinct 2, 'https://guiatennis.com.br/quadras/' || public.slug(cidade) || '/' || public.slug(bairro),
        public.slug(cidade) || '/' || public.slug(bairro)
      from no_ar where public.slug(cidade) <> '' and public.slug(bairro) <> ''
    union all
    select 3, 'https://guiatennis.com.br/academia/' || public.slug_da_academia(name, id),
        to_char(created_at, 'YYYYMMDDHH24MISS') || id::text
      from no_ar
  )
  select xmlroot(
    xmlelement(name urlset,
      xmlattributes('http://www.sitemaps.org/schemas/sitemap/0.9' as xmlns),
      (select xmlagg(
          xmlelement(name url,
            xmlelement(name loc, e.loc),
            xmlelement(name changefreq, 'weekly'),
            case when e.loc = 'https://guiatennis.com.br/' then xmlelement(name priority, '1.0') end)
          order by e.grupo, e.ordem nulls first)
         from enderecos e)),
    version '1.0', standalone yes)::text
  into xml;
  perform set_config('response.headers',
    '[{"Content-Type": "application/xml; charset=utf-8"}, {"Cache-Control": "public, max-age=3600"}]', true);
  return convert_to(xml, 'UTF8')::public."*/*";
end;
$$;

grant execute on function public.sitemap() to anon, authenticated;

notify pgrst, 'reload schema';
