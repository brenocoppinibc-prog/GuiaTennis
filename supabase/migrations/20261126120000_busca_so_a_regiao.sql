-- Regra 336 (26/11/2026): "dizer que não guardamos o endereço digitado é uma ilusão, porque se guardamos o CEP, o
-- ponto no mapa e tudo mais, só não temos o número da casa, mas temos o nome da rua e todo o resto".
-- A estatística da busca (tabela cliques) passa a guardar só a região, como a "localização aproximada" do iPhone:
-- os 5 primeiros números do CEP (a região, não a rua) e o ponto arredondado em cerca de 1 km (2 casas decimais).
-- O site já manda assim; aqui, as linhas antigas ficam do mesmo jeito. Pode rodar de novo sem estragar.
update public.cliques
   set cep = left(regexp_replace(cep, '\D', '', 'g'), 5)
 where cep is not null
   and cep <> left(regexp_replace(cep, '\D', '', 'g'), 5);

update public.cliques
   set lat = round(lat, 2),
       lng = round(lng, 2)
 where (lat is not null and lat <> round(lat, 2))
    or (lng is not null and lng <> round(lng, 2));
