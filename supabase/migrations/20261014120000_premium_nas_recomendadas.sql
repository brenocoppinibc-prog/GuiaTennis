-- Premium nas recomendadas (pedido do Breno em 14/10/2026, regra 101): na
-- página inicial, as "Academias recomendadas" começam pelas do plano
-- Premium. O e-mail "Plano novo" passa a contar isso no que a academia
-- ganha ao subir para o Premium (ou deixa de ter ao sair dele).
-- Pode rodar de novo sem estragar nada.

-- O que a academia ganha (subindo) ou deixa de ter (descendo) entre dois
-- planos, na ordem da página Planos. Mesma régua do site (LIMITES_DO_PLANO
-- e oQueMudaAoBaixarOPlano).
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
    (6, 3, 'O selo dourado ao lado do nome'),
    (7, 3, 'O topo da busca da região, marcado como “Patrocinado”'),
    (8, 3, 'Entre as “Academias recomendadas” da página inicial'),
    (9, 3, 'Promoções na ficha e na busca'),
    (10, 3, 'Todos os números em Desempenho'),
    (11, 3, 'O relatório completo do mês por e-mail')) as t(ordem, nivel, item)
  where t.nivel > least(v_de, v_para) and t.nivel <= greatest(v_de, v_para);
  v_itens := v_itens || ('Pessoas com acesso: até ' || public.limite_de_pessoas(p_para)
    || ' (antes, até ' || public.limite_de_pessoas(p_de) || ')');
  select '<ul style="margin:0 0 14px;padding-left:20px;font-size:15px;line-height:1.6;color:#1F2A24">'
           || string_agg('<li>' || public.html_texto(i) || '</li>', '') || '</ul>',
         string_agg('• ' || i, E'\n')
    into html, texto
  from unnest(v_itens) as i;
end $$;
