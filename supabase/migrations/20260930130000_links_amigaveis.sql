-- ============================================================
-- Links no padrão dos sites grandes (30/09/2026)
-- ============================================================
-- A ficha deixa de ser ?court=<id> e vira /academia/<nome>-<fim do id>,
-- e cada região ganha página própria: /quadras/<cidade> e
-- /quadras/<cidade>/<bairro> — como as páginas de hotel e de cidade do
-- Booking e do TripAdvisor. O sitemap passa a listar esses endereços.
--
-- slug() faz o mesmo que slugTexto() do index.html: os dois precisam dar o
-- mesmo resultado, senão o endereço do sitemap e o da ficha divergem.
-- Pode rodar de novo sem estragar nada.

create or replace function public.slug(texto text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(lower(translate(coalesce(texto, ''),
    'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñÝýÿ',
    'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNnYyy')),
    '[^a-z0-9]+', '-', 'g'), '-');
$$;

-- /academia/<nome até 60 letras>-<últimos 8 do id sem hífen>
create or replace function public.slug_da_academia(nome text, id uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select concat_ws('-',
    nullif(rtrim(left(public.slug(nome), 60), '-'), ''),
    right(replace(id::text, '-', ''), 8));
$$;

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
            case when e.grupo = 1 then xmlelement(name priority, '1.0') end)
          order by e.grupo, e.ordem nulls first)
         from enderecos e)),
    version '1.0', standalone yes)::text
  into xml;
  perform set_config('response.headers',
    '[{"Content-Type": "application/xml; charset=utf-8"}, {"Cache-Control": "public, max-age=3600"}]', true);
  return convert_to(xml, 'UTF8')::public."*/*";
end;
$$;

-- O sitemap roda com a permissão de quem chama (o visitante só enxerga as
-- publicadas), então as duas funções de apoio ficam abertas a ele.
grant execute on function public.slug(text), public.slug_da_academia(text, uuid)
  to anon, authenticated;
grant execute on function public.sitemap() to anon, authenticated;

notify pgrst, 'reload schema';
