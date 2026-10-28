# GuiaTennis — contexto do projeto

Versão enxuta (28/10/2026). Basta ler este arquivo para continuar o
trabalho. O texto antigo completo (regras 1 a 167, resumos de cada chat,
todas as seções) está em `historico/CONTEXTO-completo-ate-28-10-2026.md`;
a descrição completa do PR #5 (seções 1 a 73, passos 1 a 99), em
`historico/PR5-descricao-completa-ate-28-10-2026.md`. **Não ler esses dois
inteiros:** procurar com `grep` só quando precisar de um detalhe
("regra 133", "seção 4" e afins nos comentários do código e do SQL apontam
para o histórico).

**Atualizado em:** 28/10/2026 (regra 169)

| | |
|---|---|
| Dono | Breno (brenocoppini.bc@gmail.com) |
| Repositório | `brenocoppinibc-prog/GuiaTennis` (público) |
| No ar | guiatennis.com.br (Netlify publica a `main` sozinho) |
| PR aberto | **#5**, branch `ccr-0a610d86-k6plx0` → `main`, com tudo desde 30/09/2026 |
| Prévia do PR | https://deploy-preview-5--stately-salamander-652f72.netlify.app (banco de teste) |
| Banco de verdade | Supabase `eultezheqwmxyakvgyjy` |
| Banco de teste | Supabase `ohvbengbujdioxdtewsy` (projeto `guiatennis-teste`) |
| Admin | entra com o e-mail `guiatennis1@gmail.com` (`isAdmin` é pelo e-mail) |
| Contatos | WhatsApp Business (11) 92745-6457 (`WHATSAPP_GUIA`), Instagram @guiatennis, contato@guiatennis.com.br (chega no Gmail do admin) |

## 0. Chat novo: por onde começar

1. `git fetch origin` e trabalhar na branch do PR aberto
   (`ccr-0a610d86-k6plx0`). Se o PR #5 já entrou na `main`, trabalho novo
   vai numa branch nova a partir da `main`, com PR novo.
2. Voltar a acompanhar o PR #5 (inscrição nos eventos do PR).
3. `bash testes/check-js.sh` antes de qualquer outra coisa.
4. Ler a seção 9 (estado e pendências) deste arquivo.

## 1. Como o Breno trabalha (importante)

- Fala português, pelo celular, manda print. **Respostas curtas**, em
  português, sem jargão e **sem narrar** o que está sendo feito: dizer o
  que foi feito e o que depende dele. Ele está com pouco limite de uso.
- Quer **comparação com referências internacionais grandes** (Google,
  Booking, Airbnb, hoteis.com, trivago, Instagram, Nubank, Shopify…) nas
  decisões de site, Instagram e marketing — **na conversa**. No site,
  nenhuma comparação com outros sites.
- **Tudo atualizado no mesmo push:** código, Termos e Privacidade (texto e
  "Última atualização", quando tocam no assunto), chat de ajuda, este
  arquivo e a descrição do PR (seção 2).
- **Nunca fazer o merge sem ele dizer "pode subir"** na hora, depois de ver
  a prévia. Mudança pedida depois disso volta para a prévia. **Não lembrar
  disso no fim das respostas.**
- **Senha e endereço do banco nunca pelo chat:** vão nos segredos do GitHub.
  No código, só chaves públicas.
- SQL entra sozinho pelo GitHub; mesmo assim, contar na conversa o que o
  SQL novo muda. Consulta só de leitura vai em bloco pronto para copiar.
- Testa no celular, muitas vezes logado como admin (admin não grava
  estatística; visitante = aba anônima).
- Só coisa certa e legal ("se não for legal eu não quero").
- Não gosta de mensagem automática no WhatsApp nem de botão em pílula para
  contato. Não gosta de depender de botão para o que o site faz sozinho.
- **Sem a palavra "pôr"** (nem "põe", "ponha"): usar adicionar, incluir,
  informar, colocar ou cadastrar.
- Prints de tela só quando o pedido é de visual, e com a fonte de verdade
  (seção 6).
- Mensagem de erro simples, dizendo o que fazer; o técnico vai para o
  `?diagnostico`.

## 2. Como entregar cada pedido (checklist)

1. Código no `index.html` (e SQL novo em `supabase/migrations/`, seção 5).
2. Teste: criar ou ajustar `testes/<tema>.js`; rodar os afetados; no fim,
   a bateria completa (`bash testes/rodar-todos.sh`, seção 6). SQL novo:
   seção nova no `testes/banco-emails.py`.
3. Termos/Privacidade quando o pedido toca no que eles dizem, com a data
   de "Última atualização" nos dois (`ficha-basica.js` e
   `regras-de-conteudo.js` conferem a data). Chat de ajuda (`CHAT_TEMAS`,
   `CHAT_DETALHES*`) e "Como funcionam as avaliações" quando for o caso.
4. **Este arquivo:** trocar o parágrafo da seção 9 (não acumular),
   acrescentar uma linha na seção 10 e os números de teste.
5. **Descrição do PR (curta):** uma linha em "Pedidos depois de 28/10", o
   SQL novo na lista e um passo em "Para testar". Salvar com
   `update_pull_request` e conferir (ler o PR e comparar o `body` com o
   arquivo local com `jq -r .body` + `diff`).
6. Commit em português, com as linhas finais de autoria pedidas pela
   sessão; push; conferir o "Banco de dados" (Actions) e a prévia do
   Netlify. Sem identificador de modelo em commit, PR ou código.
7. Resposta curta ao Breno: o que mudou e o link da prévia.

## 3. O que é e regras que valem sempre

Guia de **quadras e academias de tênis**: a pessoa diz onde está, vê as
academias mais perto, compara preço, estrutura e nota e fala direto com a
academia pelo WhatsApp. O GuiaTennis **não reserva, não cobra taxa e não
fica no meio**. Dois sites no mesmo `index.html`: o dos **jogadores** e o
**GuiaTennis Parceiros** (`/parceiros`, das academias), mais o **painel do
admin** (`/admin`, só o admin vê).

Texto e visual
- Só quadra e academia, **nunca clube**. "Guia" com G maiúsculo. O
  GuiaTennis é **site, não app**.
- O site **não narra o que faz**; opção pequena não se explica; o
  complexo vai para a Ajuda ("Saiba mais"); dica que facilita fica.
- Sem preço = **"Sob consulta"** + "fale com a academia" (`SEM_PRECO`).
- Botão que desconecta diz **"Sair da conta"**.
- Visual limpo e espaçado: Inter no texto (`--fonte-texto`), Playfair só
  nos títulos (`--fonte-titulo`), creme, verde e dourado; nada abaixo de
  12px, campos com 16px, botões com 48px; sem caixa dentro de caixa. Regra
  nova de visual vai na camada "Acabamento limpo", no fim do `<style>`.
- **Telas novas sem desenho decorativo e sem animação** de entrada ou de
  progresso ("cara de IA"), com a cara do GuiaTennis.
- Campo vazio não desenha bloco; academia sem foto não mostra nada no
  lugar da foto.
- Filtros e listas sempre na mesma ordem (`naOrdem`, constantes `*_OPTS`).
- Números públicos arredondados para baixo (`numeroRedondo`), totais desde
  o começo.
- O logo é um desenho só (`logoDesenho`); as imagens saem dele por
  `divulgacao/gerar-imagens.js`.
- No celular, janela aberta ocupa a tela toda. O que se digita vai calado
  para o rascunho da aba (sem "Rascunho salvo") e sair com algo não salvo
  pergunta "Sair sem salvar?" (`data-aviso-sair`, `data-rascunho-de`).

Técnica
- **Um arquivo, sem build, sem framework, sem dependência nova e sem IA**
  (o site entende textos por palavras-chave). De fora só Supabase,
  Leaflet/OpenStreetMap, Nominatim, Overpass, ViaCEP/awesomeapi e as
  fontes do Google.
- Coluna nova no banco **degrada com elegância** (o site funciona com o
  banco antigo: `lerPublico` com a lista de colunas novas, `faltaColunaNova`).
- Commits, comentários e nomes de função em português.
- **Privacidade:** de uma busca guarda só bairro, cidade, CEP e o ponto
  arredondado (~100 m); de cada acesso, origem e aparelho; nunca IP,
  endereço digitado ou identificador do aparelho. Admin não grava nada.
  Mudou isso, muda a Política de Privacidade.

Produto (o que já foi decidido)
- **Contas:** uma conta só para jogador e Parceiros (o mesmo e-mail e
  senha); e-mail confirmado por código de 6 números; nome e sobrenome em
  **dois campos obrigatórios**; excluir num lado exclui nos dois.
  Buscar, ver e chamar não pedem login; depois da segunda academia chamada
  sem conta, o convite para criar conta.
- **Avaliações:** só com conta de e-mail confirmado, **uma por academia,
  editável** (mostra "editada"); aceite "Minha avaliação é verídica e
  segue os Termos de Uso."; qualquer conta denuncia; quem administra a
  academia não avalia ela (o banco garante); a academia responde (uma
  resposta por avaliação, editável, "editada") e pede análise, mas não
  apaga. Conta excluída ou nome suspenso: "Usuário do GuiaTennis".
- **Nome que desrespeita os Termos:** o admin suspende por 15 dias
  (e-mails, lembrete a 3 dias); sem troca, a conta é excluída sozinha.
  Racismo, homofobia, xenofobia e qualquer discriminação não são tolerados.
- **Planos** (todos grátis por enquanto; a academia é avisada antes de
  cobrar): **Básico** (3 comodidades, 3 fotos, só WhatsApp, 1 pessoa),
  **Completo** (ficha inteira, 5 fotos, 5 pessoas, promoção na ficha paga
  por semana), **Premium** (10 pessoas, foto de cada opção do catálogo,
  números da ficha, selo dourado, até 2 "Patrocinado" no topo da busca a
  até 10 km e de novo no lugar delas sem a marcação, primeiro nas
  recomendadas, leilão de promoções por e-mail, a semana da promoção 20%
  menos). O plano aparece num lugar só (página Plano); fora dela,
  "Disponível no plano …". Posição paga sempre escrita "Patrocinado"
  (CDC, art. 36). "Melhores avaliadas" seguem só a nota.
- **Quem administra a academia:** academia nova de conta com e-mail
  confirmado entra no ar na hora; academia do Guia sem responsável passa à
  conta na hora (com a declaração); com responsável, o pedido vai a ele;
  "Contestar" vira disputa com código ao WhatsApp antigo da academia (à
  mão pelo admin, em até 1 dia útil, até a Meta liberar o envio
  automático).
- **Veracidade:** o WhatsApp novo da ficha só entra depois do código **e**
  da aprovação do admin; a ficha pública nunca diz "em confirmação" (a
  academia vê "precisa de confirmação"). "Informar um problema" na ficha;
  2 contas dizendo que o WhatsApp não é da academia tiram o botão. A
  academia que avisa que fechou sai do site na hora; "Fechou" guarda como
  cadastro inativo, que pode reabrir.
- **Ficha** no jeito da página de hotel do hoteis.com (capa, nome no meio,
  destaques, Estrutura, Explore a região, Sobre, Escolha o que você quer,
  Contato, Avaliações, Outras academias por perto, Horário, Cancelamento,
  Perguntas, e no fim "Confirmada pela academia", "É o responsável?" e
  "Algo errado nesta ficha?"). Fotos só na capa e nos cartões das opções.
  **Catálogo** só com modalidade e valor. No cadastro, duas partes em
  caminho: **Aulas** (para quem: adultos e/ou crianças, as crianças em
  faixas de idade de 3 a 17 anos, uma para cada turma > formatos individual,
  dupla, grupo > um cartão por formato com a avulsa, a mensal e a foto; em
  branco não é oferecida, sem valor nenhum = "Sob consulta" sem cobrança) e
  **Locação** (quadrado "A academia não oferece locação de quadra"; sem ele,
  avulsa e/ou mensal, cada uma com o valor e a foto; academia nova começa
  oferecendo). As modalidades saem das duas partes. Foto no Premium. Na
  ficha, as aulas das crianças são "Aula infantil …", com a idade, e têm o
  filtro "Crianças". Corte das fotos como o "Cortar" do Instagram.
- **Busca** "bairro, cidade" fica na cidade digitada. Telas de código com
  uma caixa por número e "Confirmar" só com todas preenchidas.

## 4. Como é feito

- **`index.html`** (~26.700 linhas, ~1,7 MB): HTML, CSS e JS. `render()`
  reescreve `#app` inteiro e chama `attachEvents()`; estado no objeto
  global `state`; `isAdmin`, `contaAcademia` e `jogador` fora dele.
  Rotas com endereços de verdade (`/academia/<nome>-<id>`, `/quadras/…`,
  `/busca?…`, `/comparar`, `/perfil`, `/parceiros/…`, `/admin/…`), lidas
  por `lerLink`/`aplicarLink` e escritas por `syncUrl`.
- **Achar código:** `grep -n "function nome"` (as linhas mudam muito). Os
  blocos novos começam com um comentário `// ---------- … (regra N) ----------`
  e trazem o pedido do Breno entre aspas.
- **O que fica no aparelho:** quase tudo da conta vai para o banco
  (`lerDaConta`/`gravarNaConta`); no navegador, só o que é da aba ou de
  conveniência (vistas recentes, última busca, hora das dicas).
- **Funções da Netlify** (`netlify/functions/`): `onde.mjs` (cidade da
  conexão), `pagamento.mjs` (Mercado Pago e o pagamento de teste da
  prévia), `cnpj.mjs` (Receita, para o "Conferir" do admin),
  `receber-email.mjs` (encaminha os e-mails do domínio, pelo Resend).
- **E-mails** saem do banco pela fila `emails_a_enviar` (Resend, pg_net e
  pg_cron).

## 5. Banco (Supabase)

- **SQL novo** = arquivo `supabase/migrations/AAAAMMDDhhmmss_nome.sql`,
  que pode rodar de novo sem estragar (`if not exists`, `create or
  replace`, `drop … if exists`). `.github/workflows/banco.yml` roda
  `supabase/aplicar.sh`: PR para a `main` → banco de **teste**; merge →
  banco de **verdade**. Depois, `supabase/conferir.sh` testa pela API o que
  o site lê. Resultado: Actions → "Banco de dados".
- **Último SQL:** `20261028120000_avaliacao_editada` (74 arquivos na pasta; 71 deles entraram neste PR).
- **Coluna nova que o site lê:** `grant select (coluna) … to anon,
  authenticated` (a leitura é liberada coluna por coluna) e a coluna na
  lista de colunas novas do `lerPublico`. Função chamada pelo visitante
  nunca usa `select *` em `academias`/`avaliacoes`. Em função
  `returns table` de plpgsql, usar apelido nas tabelas (o nome da coluna de
  saída vira variável e fica ambíguo).
- **E-mails no SQL:** `por_na_fila(chave, tipo, para, assunto, html,
  texto)` (a chave evita repetir), `email_montado`, `email_p`,
  `html_texto`, `aviso_ao_admin`, `quem_recebe_da_academia`,
  `link_parar_avisos`, `hoje_em_brasilia()`. pg_cron só se a extensão
  existir.
- **Tabelas principais:** `academias` (ficha; `plano`, `status`
  published/pending/fechada, `catalogo`, `politica`, `acesso`, `horario`,
  colunas do WhatsApp a confirmar), `avaliacoes` (`user_id`, `autor_oculto`,
  `editada_em`; `user_id` não é público: a conta lê as dela por
  `minhas_avaliacoes()`), `respostas` (uma por avaliação, `editada_em`),
  `jogadores`, `academia_acessos` e `academia_vinculos` (contas do
  Parceiros e as academias de cada uma), `pedidos_de_acesso`, `cliques`
  (estatísticas; tipo novo entra na trava `cliques_tipo_valido`),
  `passos_das_visitas`, `buscas_salvas`, `promocoes`, `lances` e
  `leilao_config` (leilão), `compras_de_creditos`, `precos_dos_planos`,
  `pedidos_de_plano`, `pedidos_para_sair`, `pedidos_de_reabertura`,
  `codigos_do_whatsapp`, `denuncias_de_avaliacao`, `problemas_na_ficha`,
  `nomes_suspensos`, `contas_excluidas`, `lembretes_de_ficha`,
  `falhas_do_site`, `conversas_de_ajuda`, `emails_a_enviar` e
  `whatsapp_a_enviar`.
- **Segredos do GitHub** (só os nomes): `BANCO_TESTE_URL`,
  `BANCO_REAL_URL` (endereço Session pooler), `RESEND_API_KEY`,
  `SUPABASE_ACCESS_TOKEN`. Na Netlify (ainda por ligar):
  `MERCADOPAGO_ACCESS_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## 6. Testes

- `bash testes/check-js.sh` (sintaxe do `<script>`): sempre primeiro.
- Navegador: `cd testes && NODE_PATH=$(npm root -g) node <tema>.js`. O
  `harness.js` abre o `index.html` no Chromium com o Supabase trocado pelo
  `mock.js` (sem internet). `abrir({ jogador, jogadorConfirmado, admin,
  academia, avaliacoes, respostas, … })` monta o cenário; `sem*` finge o
  banco antigo. Mudou o banco? Ensinar o mesmo ao `mock.js`.
- **Bateria completa:** `bash testes/rodar-todos.sh` (~10 minutos; em
  segundo plano). Último resultado (28/10/2026): **2.117 verificações** nos
  72 arquivos do navegador, mais `onde.mjs`, `pagamento.mjs` e
  `cnpj.mjs`, nenhuma falha. O `falhas.txt` sempre aparece na lista (força
  erros de propósito).
- **Banco local** para o `testes/banco-emails.py` (**679 conferências**,
  nenhuma falha): Postgres 16 em `/var/lib/postgresql/gt`. Ele cai entre um
  pedido e outro; para subir:
  `D=/var/lib/postgresql/gt; su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D $D/data -o '-p 5433 -k $D/sock' -l $D/log start"`.
  Aplicar o SQL novo: `psql postgresql://postgres@127.0.0.1:5433/postgres -f <arquivo>`.
  Rodar: `BANCO_URL=postgresql://postgres@127.0.0.1:5433/postgres python3 testes/banco-emails.py`.
  Contêiner novo sem o banco: montar do zero como diz
  `testes/banco-local-base.sql` e aplicar `supabase/aplicar.sh teste`.
- `testes/banco-acesso.py` precisa do GoTrue; tem 11 falhas antigas
  conhecidas.
- **Prints com a letra de verdade:** `abrir({ fontes: <pasta> })`, com o
  CSS do Google Fonts baixado por `curl` e os `.woff2` anotados em
  `mapa.txt`; sem isso, a letra sai trocada.
- A rede deste ambiente não alcança o Supabase nem o Nominatim (403): a
  produção se confere pelos registros do Actions e pela prévia.

## 7. Publicação

- Vão para o ar: `index.html`, `404.html`, `netlify.toml`, `robots.txt`,
  `sitemap.xml`, os `.png`, `google7b66589ffc303f37.html` e
  `netlify/functions/`. O resto (este arquivo, `historico/`, `testes/`,
  `supabase/`, `divulgacao/`, `SQL-*.sql`, `.github/`) devolve 404 pelo
  `netlify.toml`. **Arquivo ou pasta nova na raiz vai para o ar sozinho**:
  se não for do site, ganha uma regra de 404.
- Netlify grátis: 300 créditos por mês, **15 por publicação na `main`**,
  prévia de PR não gasta. O `ignore` do `netlify.toml` pula a publicação
  quando o merge não mexe em arquivo do site. Por isso, juntar mudanças
  num PR só. Não arrastar zip.
- Merge só com "pode subir" (pela ferramenta do GitHub). Depois: conferir a
  execução do "Banco de dados" da `main` e pedir ao Breno para abrir o
  site em aba anônima.

## 8. Armadilhas já pisadas

- `render()` a cada tecla tira o foco: campos gravam no estado em
  `oninput` sem redesenhar. Re-render mata o scroll de pedaços que
  carregam sozinhos: atualizar só o pedaço.
- Logado e visitante não leem `select('*')` em `academias`/`avaliacoes`;
  coluna nova sem `grant select` deixa o site vazio para o visitante (a
  esteira fica vermelha no `conferir.sh`).
- Links e arquivos sempre com caminho absoluto (`/academia/…`): a página
  roda em caminhos.
- Nominatim: uma busca por segundo. Overpass: consulta pequena, 3 espelhos
  em paralelo, tempo curto.
- `lat`/`lng` às vezes vêm como texto (`numeroOuNulo`). Localizar academia
  nunca grava o centro da cidade (resultado "grosso" não é gravado).
- `innerText` respeita `text-transform` (testes comparam com o texto da
  tela). Teste que lê opacidade logo depois de mexer pega a transição no
  meio: esperar ~250 ms.
- No `banco-emails.py`, `um()` devolve a última linha da saída: texto com
  quebra de linha precisa de `replace(texto, E'\n', ' ')`; `strip()` come
  espaços nas pontas. Academia de teste tem mais de um responsável.
- Gatilho `before update` reescreve datas: um `update` de correção de
  dados em migração precisa de `alter table … disable trigger` em volta.
- `create or replace function` com outro `returns table` exige `drop`
  antes; `create or replace view` só aceita coluna nova no fim.
- Login do Supabase quebra com token nulo em `auth.users` (gravar `''`).
- Android força modo escuro: `color-scheme: light` no site.
- `pkill -f` com texto do próprio comando mata o terminal.

## 9. Estado atual e pendências (28/10/2026)

O PR #5 está **verde e sem conflito**, com tudo até a **regra 169** (o
catálogo em caminho: Aulas e Locação em partes separadas; sem SQL novo: o
item da aula das crianças leva `publico`, `idadeDe` e `idadeAte` dentro do
`catalogo`, e a aula sem valor vai com `cobranca: ""`). A descrição do PR foi
encurtada em 28/10/2026; o texto longo ficou no histórico. Testes: 2.117
no navegador e 679 no banco, nenhuma falha.

**Pendências do Breno:**
1. Testar na prévia o que entrou de 26 a 28/10 (veracidade, ficha no
   jeito do hoteis.com, catálogo com adultos e crianças, corte das fotos,
   nome suspenso, busca "bairro, cidade", sobrenome, avaliação editada) e
   dizer "pode subir".
2. Ligar o Mercado Pago na Netlify (variáveis da seção 5) depois de testar
   o pagamento de teste na prévia.
3. Definir os preços dos planos e o preço da semana da promoção na ficha
   (hoje R$ 0, o admin muda em Leilões).
4. Decidir: a promoção paga na ficha devolve as semanas que faltam se a
   academia voltar ao Básico (hoje não); o leilão só abre em bairro com um
   mínimo de jogadores; o "Confirmar depois" fica na tela do e-mail do
   cadastro.
5. **WhatsApp automático do código: esperando o CNPJ** (a Meta só libera o
   modelo de autenticação para empresa verificada). **Não puxar o assunto
   antes de o Breno avisar.** Até lá, o admin manda o código à mão.
6. Depois do merge: enviar o `sitemap.xml` no Google Search Console,
   trocar o webhook do Resend para o site de verdade, criar o acesso de
   cada academia e mandar a mensagem (seção 11), trocar a foto do perfil
   do WhatsApp Business pela de `divulgacao/`.
7. Antigos: fechar o PR #1; no Supabase de teste, desligar o cadastro
   aberto; backup mensal; 2 etapas nas contas.

**Próximo número:** regra 170.

## 10. Regras recentes (uma linha cada; o detalhe está no histórico)

- 156 (26/10) Veracidade: WhatsApp por código, "Informar um problema",
  avaliar com e-mail confirmado, "Denunciar", "Conferir" do admin
  (Google Maps, mapa aberto, Receita). SQL `20261026120000_veracidade`.
- 157 (26/10) A ficha só mostra o que está certo; todo número novo espera o
  admin; a academia que avisou que fechou sai do site; fichas paradas há
  3 meses no painel. SQL `20261026180000_so_o_que_esta_certo`.
- 158 (26/10) A academia vê "precisa de confirmação"; "Fechou" guarda
  (cadastro inativo) e reabre; todas as pendências e o sino no painel.
  SQL `20261026200000_academia_fechada_fica_guardada`.
- 159 (26/10) A ficha no jeito do hoteis.com.
- 160 (26/10) Barra de cima da ficha sem o nome, quase transparente.
- 161 (26/10) Uma caixa por número do código; "Confirmar" só completo.
- 162 (26/10) Catálogo de aulas e locação; contato depois das opções;
  ficha sem o nome do plano. SQL `20261026220000_catalogo`.
- 163 (27/10) Nomes e conteúdo sem ofensa nem discriminação (Termos e
  Privacidade).
- 164 (27/10) Enquadramento das fotos; foto só na capa e nas opções.
- 165 (27/10) Corte no jeito do Instagram; nome suspenso por 15 dias;
  "Usuário do GuiaTennis"; e-mail do nome da academia trocado pelo admin.
  SQL `20261027120000_nome_suspenso`.
- 166 (27/10) Busca "bairro, cidade"; "Confirmada pela academia" no fim;
  nome e sobrenome em dois campos obrigatórios.
- 167 (28/10) Avaliação uma vez e editável, com "editada"; a resposta da
  academia do mesmo jeito; e-mail à academia quando uma avaliação é
  editada. SQL `20261028120000_avaliacao_editada`.
- 168 (28/10) Catálogo em blocos: aulas para adultos e para crianças (com a
  idade), formatos escolhidos uma vez e a grade com avulsa e mensal; "Não
  divulgar os valores"; "Copiar das aulas para adultos"; uma foto por aula;
  "Aula infantil" e o filtro "Crianças" na ficha, na busca e na comparação.
  Sem SQL. Teste: `catalogo.js` (refeito).
- 169 (28/10) Catálogo em caminho: parte Aulas (para quem > formatos por
  faixa de idade > cartão com valores e foto) e parte Locação ("não
  oferece" ou avulsa/mensal com valor e foto); "Alterações salvas" num
  cartão sobre o painel, com um X só e o agradecimento; "Pedir análise" em
  vermelho. Sem SQL. Testes: `catalogo.js`, `cadastro.js` e as listas de
  partes.

## 11. WhatsApp e mensagem para as academias

- No site, o contato do GuiaTennis aparece só com o nome e o logo pequeno
  ("Chat de ajuda", Instagram, E-mail); o WhatsApp do Breno fica atrás do
  chat de ajuda. Número e e-mail por escrito, só nos Termos e na
  Privacidade. **Sem mensagens automáticas** no WhatsApp Business.
- Mensagem para as academias (pedir horário, preços, cancelamento, como
  chegar, quadras, comodidades e até 5 fotos, oferecendo o QR code da
  ficha): o texto pronto está no histórico, seção 13.
