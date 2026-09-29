-- /sitemap.xml: o Netlify repassa para esta função, que lista a página
-- inicial e a ficha de cada academia publicada. Academia nova entra no
-- sitemap sozinha, sem publicar o site — e sem gastar crédito do Netlify.
--
-- O tipo "*/*" faz o Supabase (PostgREST) devolver o XML puro para
-- qualquer pedido — o Google pede "text/html, …, */*", e com outro tipo a
-- resposta viria embrulhada em JSON. O Content-Type sai daqui mesmo.

do $$
begin
  create domain public."*/*" as bytea;
exception when duplicate_object then null;
end $$;

create or replace function public.sitemap()
returns public."*/*"
language plpgsql
stable
set search_path = ''
as $$
declare
  xml text;
begin
  select xmlroot(
    xmlelement(name urlset,
      xmlattributes('http://www.sitemaps.org/schemas/sitemap/0.9' as xmlns),
      xmlelement(name url,
        xmlelement(name loc, 'https://guiatennis.com.br/'),
        xmlelement(name changefreq, 'weekly'),
        xmlelement(name priority, '1.0')),
      (select xmlagg(
          xmlelement(name url,
            xmlelement(name loc, 'https://guiatennis.com.br/?court=' || a.id),
            xmlelement(name changefreq, 'weekly'))
          order by a.created_at)
         from public.academias a
        where a.status = 'published'
          and (a.pausada is not true or a.pausada_ate <= now()))),
    version '1.0', standalone yes)::text
  into xml;
  perform set_config('response.headers',
    '[{"Content-Type": "application/xml; charset=utf-8"}, {"Cache-Control": "public, max-age=3600"}]', true);
  return convert_to(xml, 'UTF8')::public."*/*";
end;
$$;

-- Roda com a permissão de quem chama: o visitante só enxerga as
-- publicadas, pelas regras (RLS) da tabela.
grant execute on function public.sitemap() to anon, authenticated;

notify pgrst, 'reload schema';
