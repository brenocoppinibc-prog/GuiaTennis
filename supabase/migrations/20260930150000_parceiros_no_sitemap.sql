-- ============================================================
-- GuiaTennis Parceiros no sitemap (30/09/2026)
-- ============================================================
-- O site das academias (/parceiros) entra no Google: a apresentação, os
-- planos, a ajuda e o cadastro. O resto (entrar, painel, desempenho…) fica
-- fora. Mesmo sitemap() de 20260930130000_links_amigaveis, com essas linhas.
-- Pode rodar de novo sem estragar nada.

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
