-- ============================================================
-- A página pública das avaliações do GuiaTennis (pedido do Breno em
-- 10/11/2026, regra 235: "quero que aparece sem login sobre as avaliações")
-- ============================================================
-- Como a página de uma empresa no Trustpilot e a parte "Notas e avaliações"
-- de um app na App Store e no Google Play: qualquer pessoa, sem entrar, vê a
-- nota de jogadores e de academias, quantas avaliações de cada estrela, os
-- comentários liberados por quem escreveu (com a resposta do GuiaTennis e o
-- "Você pediu, nós fizemos") e as melhorias que vieram dos pedidos.
--   pagina_das_avaliacoes_do_guia   pública: o resumo de cada lado e os
--                                   comentários de 20 em 20, com filtro por
--                                   lado (jogador ou parceiro) e por estrela.
--   sitemap                         o mesmo de 20260930150000_parceiros_no_sitemap,
--                                   com a página /avaliacoes (entra no Google).
-- A média e as estrelas contam todas as avaliações, sem filtro; o comentário
-- só aparece com a permissão de quem escreveu e se o GuiaTennis não o tirou
-- do site. Não sai e-mail, conta nem academia_id. Pode rodar de novo sem
-- estragar nada.

create or replace function public.pagina_das_avaliacoes_do_guia(p_publico text default null, p_nota integer default null,
  p_limite integer default 20, p_pular integer default 0)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with
  filtro as (
    select case when p_publico in ('jogador', 'parceiro') then p_publico end as publico,
           case when p_nota between 1 and 5 then p_nota end as nota,
           least(greatest(coalesce(p_limite, 20), 1), 50) as limite,
           greatest(coalesce(p_pular, 0), 0) as pular
  ),
  visiveis as (
    select a.* from public.avaliacoes_do_guia a, filtro f
    where a.pode_mostrar and not a.oculta and a.comentario is not null
      and (f.publico is null or a.publico = f.publico)
      and (f.nota is null or a.nota = f.nota)
  ),
  pagina as (
    select v.* from visiveis v, filtro f
    order by v.updated_at desc, v.id
    limit (select limite + 1 from filtro) offset (select pular from filtro)
  )
  select jsonb_build_object(
    'resumo', (select jsonb_object_agg(p.publico, jsonb_build_object(
        'media', (select round(avg(a.nota)::numeric, 1) from public.avaliacoes_do_guia a where a.publico = p.publico),
        'total', (select count(*) from public.avaliacoes_do_guia a where a.publico = p.publico),
        'respondidas', (select count(*) from public.avaliacoes_do_guia a where a.publico = p.publico and a.resposta is not null),
        'estrelas', (select jsonb_build_object(
            '1', count(*) filter (where a.nota = 1), '2', count(*) filter (where a.nota = 2), '3', count(*) filter (where a.nota = 3),
            '4', count(*) filter (where a.nota = 4), '5', count(*) filter (where a.nota = 5))
          from public.avaliacoes_do_guia a where a.publico = p.publico)))
      from (values ('jogador'), ('parceiro')) p(publico)),
    'feitos', coalesce((select jsonb_agg(jsonb_build_object('texto', x.feito_texto, 'quando', x.feito_em) order by x.feito_em desc)
      from (select a.feito_texto, a.feito_em from public.avaliacoes_do_guia a
            where a.feito_texto is not null and a.feito_em is not null
            order by a.feito_em desc limit 8) x), '[]'::jsonb),
    'encontradas', (select count(*) from visiveis),
    'comentarios', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'publico', x.publico, 'nome', x.nome_publico,
        'nota', x.nota, 'texto', x.comentario, 'quando', x.updated_at,
        'resposta', x.resposta, 'feito', x.feito_texto) order by x.updated_at desc, x.id)
      from (select * from pagina order by updated_at desc, id limit (select limite from filtro)) x), '[]'::jsonb),
    'mais', (select count(*) from pagina) > (select limite from filtro)
  );
$$;

grant execute on function public.pagina_das_avaliacoes_do_guia(text, integer, integer, integer) to anon, authenticated;

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
    -- As avaliações do GuiaTennis (regra 235).
    select 1, 'https://guiatennis.com.br/avaliacoes', 'zz'
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
