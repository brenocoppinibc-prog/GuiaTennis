# Verificador de gramática (regra 322)

LanguageTool pt-BR 6.4 pelo Maven, sem instalar nada além do Java e do Maven
(os dois já vêm no contêiner).

    cd testes/gramatica
    mvn -q -B compile dependency:build-classpath -Dmdep.outputFile=cp.txt   # uma vez por contêiner
    python3 extrai.py /tmp/textos.txt        # todo texto do index.html (e das funções do banco local, se estiver no ar)
    java -cp "target/classes:$(cat cp.txt)" Checa /tmp/textos.txt > /tmp/lt.txt

Cada linha do resultado: regra, sugestões, trecho e mensagem. A maioria é
marcação falsa (nomes como GuiaTennis, código, espaços da extração): olhar
as regras que não são MORFOLOGIK, SPACE_*, UPPERCASE_* e *_WHITESPACE. O
verificador não pega o estilo do Breno ("pra", "te", "pôr", "a gente",
"sai por"): procurar com grep.
