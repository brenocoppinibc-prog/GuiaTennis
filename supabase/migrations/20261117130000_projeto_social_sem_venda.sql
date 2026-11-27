-- Regra 295 (17/11/2026): "dê um limite para a escrita do projeto, algo até
-- 100, e não permitir qualquer intenção para que ocorra venda".
--
-- O texto do projeto social (academias.projeto_social, regra 294) passa a ter
-- até 100 letras e não aceita o que é venda: preço (R$), link, @, telefone e as
-- palavras de venda (promoção, desconto, oferta, plano, pacote, matrícula,
-- mensalidade, valor, preço, pagamento, compra). O site confere antes de
-- salvar e explica; aqui é a trava do banco. O texto que já estava e passa do
-- limite é cortado em 100. Pode rodar de novo sem estragar.

alter table public.academias drop constraint if exists academias_projeto_social_tamanho;
alter table public.academias drop constraint if exists academias_projeto_social_sem_venda;

update public.academias set projeto_social = left(projeto_social, 100)
  where projeto_social is not null and char_length(projeto_social) > 100;
update public.academias set projeto_social = null
  where projeto_social is not null and (
    projeto_social ~* '(https?://|www\.|@[a-z0-9_]|r\$|[0-9][0-9 ().-]{7,}[0-9])'
    or projeto_social ~* '\m(promo[cç][aã]o|promo[cç][oõ]es|promo|descontos?|ofertas?|imperd[ií]ve(l|is)|pacotes?|matr[ií]culas?|mensalidades?|pre[cç]os?|valor(es)?|pagamentos?|pague|parcelas?|compre|comprar|vendas?|vendemos|barat[oa]s?|planos?)\M'
  );

alter table public.academias add constraint academias_projeto_social_tamanho
  check (projeto_social is null or char_length(projeto_social) <= 100);
alter table public.academias add constraint academias_projeto_social_sem_venda
  check (projeto_social is null or not (
    projeto_social ~* '(https?://|www\.|@[a-z0-9_]|r\$|[0-9][0-9 ().-]{7,}[0-9])'
    or projeto_social ~* '\m(promo[cç][aã]o|promo[cç][oõ]es|promo|descontos?|ofertas?|imperd[ií]ve(l|is)|pacotes?|matr[ií]culas?|mensalidades?|pre[cç]os?|valor(es)?|pagamentos?|pague|parcelas?|compre|comprar|vendas?|vendemos|barat[oa]s?|planos?)\M'
  ));
