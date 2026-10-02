# GuiaTennis — contexto do projeto

Documento para abrir um chat novo sem perder nada. Quem chegar aqui deve
conseguir continuar o trabalho lendo só este arquivo e o `index.html`.

**Dono:** Breno (brenocoppini.bc@gmail.com)
**Repositório:** `brenocoppinibc-prog/GuiaTennis`
**Branches:** `main` = o que está no ar e branch padrão do GitHub (criada
em 28/09/2026). O trabalho novo entra por pedido de mudança (PR) de uma
branch de trabalho (`claude/…` ou `ccr-…`) para a `main`. Já entraram: **PR #2** (banco de teste e
publicação pelo GitHub, 28/09) e **PR #3** (SQL automático, ficha básica,
WhatsApp, buscador do mapa e sitemap, 29/09, merge `92e5685`), os dois da
`claude/github-supabase-connection-n1w3rr`. **PR #5** (30/09 e 01/10):
branch `ccr-0a610d86-k6plx0` → `main`, com área da academia, GuiaTennis
Parceiros, links, visual limpo e tempo até agir — esperando o Breno testar
na prévia e dizer "pode subir". O **PR #1** (`new-session` →
`trivago`) ficou velho e segue aberto; pode ser fechado. As outras
`claude/…` são antigas.
**No ar:** guiatennis.com.br (Netlify, publica a `main` sozinho) · teste na
prévia de cada PR, `deploy-preview-N--….netlify.app` (seção 7). Cada um com
o seu banco: o de verdade `eultezheqwmxyakvgyjy` e o de teste
`ohvbengbujdioxdtewsy`, projeto `guiatennis-teste` (seção 4, "Banco de
teste")
**Instagram:** @guiatennis · **WhatsApp Business:** (11) 92745-6457 (`WHATSAPP_GUIA`) · **E-mail:** guiatennis1@gmail.com
**Atualizado em:** 01/10/2026

> **Estado (01/10/2026):** tudo está no **PR #5** (branch
> `ccr-0a610d86-k6plx0` → `main`), ainda **sem merge**: a **área da
> academia** (seção 4), o site das academias **GuiaTennis Parceiros**
> (`/parceiros`, seção 3: conta por e-mail, cadastro no modelo do trivago
> com barra de etapas, código no WhatsApp da ficha, equipe por plano,
> desempenho por plano, ofertas de plano, rodapé verde), os **links no
> padrão dos grandes** (seção 3, "Endereços"), o visual mais limpo, o
> **tempo até agir** no painel do admin (seção 4, `cliques`) e, ainda em
> 01/10, o **logo de três riscos em todo lugar**, o **menu no jeito do
> trivago**, a **home com a última busca, as parecidas e as chamadas**, as
> **preferências de busca** e o **cadastro passo a passo** (seção 3, "Menu,
> home pessoal e cadastro passo a passo"). Os SQL
> `20260930120000` a `20261001130000` entraram sozinhos no banco de teste
> pelo PR. Prévia: `deploy-preview-5--stately-salamander-652f72.netlify.app`.
> Falta o Breno testar na prévia (seção 11, primeiro item) e dizer "pode
> subir" — só então fazer o merge. Depois: criar o acesso de cada academia
> e mandar pelo WhatsApp. Ainda em aberto de antes: conferir o site do PR #3
> e o Google Search Console.

### Como abrir o chat novo
Anexe este arquivo e diga em qual branch trabalhar. No chat novo, antes de
mexer:
1. `git fetch origin main` e começar a branch do chat a partir dela
   (`git checkout -B <branch> origin/main`). Se houver PR aberto para a
   `main`, continuar na branch dele. PR que já entrou na `main` não recebe
   mais nada: trabalho novo vai num PR novo.
2. Rodar `testes/check-js.sh` e os testes da seção 6.
3. Ler a seção 11 (em aberto) e a seção 2 (regras fixas).

### Como o Breno trabalha (importante)
- Fala português, pelo celular, e manda print. Resposta curta, direta, em
  português, sem jargão.
- **Publica aprovando o PR no GitHub** (desde 28/09/2026 — seção 7). Não
  mandar mais zip, a não ser que ele peça: cada zip arrastado gasta
  crédito do Netlify.
- **Cadastro pelo admin: só o nome é obrigatório** (pedido de 29/09/2026;
  o banco não aceita academia sem nome). Sem asteriscos e sem o aceite dos
  Termos; o endereço é montado só com o que foi preenchido
  (`montarEndereco`). Quem pede cadastro pelo site continua mandando
  endereço, WhatsApp, quadras, modalidade e o aceite.
- **Nunca subir (merge) sem ele confirmar na hora.** Ele diz "pode subir"
  depois de ver a prévia; se pedir mais alguma mudança depois disso, a
  mudança vai para a prévia e ele confirma de novo antes do merge.
- **SQL entra sozinho pelo GitHub** (desde 28/09/2026 — seção 4,
  "Automação do banco"). Mostrar o SQL novo na conversa mesmo assim, para
  ele saber o que vai mudar. Consulta que só lê (e o bloco manual, se a
  automação estiver sem os segredos) continua em bloco pronto para
  copiar; ele roda no SQL Editor e manda o resultado em tabela.
- Testa no celular, muitas vezes **logado como admin** — o que não grava
  estatística. Para testar como visitante: aba anônima.
- Quer comparação com referências internacionais grandes (site,
  Instagram, marketing) quando o assunto é GuiaTennis.
- Não gosta de depender de botão para o que o site pode fazer sozinho
  ("ele deveria consultar direito").
- **Senha e endereço do banco nunca pelo chat.** Vão direto nos segredos do
  GitHub (seção 4, "Automação do banco"). No código só entram as chaves
  públicas (anon e publishable).
- **Só coisa certa e legal** ("se não for legal eu não quero"). Dados de
  academia: seção 4, "Academias do mapa aberto".
- Não gosta de mensagem automática no WhatsApp (seção 12) nem de botão em
  pílula para contato. Prefere texto com logo pequeno.
- **Quer o site limpo e espaçado** (30/09/2026: "muito aglomerado"). Letra
  sem serifa no texto, ar entre os blocos, nada de caixa dentro de caixa
  (seção 8, "Visual").
- Mensagem de erro tem de ser simples, dizendo o que fazer ("O mapa está
  lento agora. Espere um pouco…"). O motivo técnico vai para o
  `?diagnostico`.

---

## 1. O que é

Guia online de **quadras e academias de tênis**. A pessoa diz onde está,
vê as academias mais perto, compara preço/estrutura/nota e fala direto
com a academia pelo WhatsApp. O GuiaTennis **não reserva horário, não
cobra taxa e não fica no meio** da negociação.

## 2. Regras fixas (não mudar sem o Breno pedir)

1. **Só quadra e academia. Sem clube.** Nenhum texto do site pode falar
   em clube.
2. **O site não narra o que "a gente faz".** O texto responde dúvida de
   quem está chegando. Nada de "a academia nos enviou", "arredondamos
   para baixo", "atualiza sozinho" fora do bloco que fala com academias.
3. **Sem preço = "Sob consulta" + "fale com a academia"** (pedido de 01/10/2026; antes "Não incluído") (`SEM_PRECO` /
   `SEM_PRECO_SUB`). Nunca explicar o motivo de faltar o valor.
4. **Número público sempre arredondado para baixo**, com `+` e ponto de
   milhar (`numeroRedondo`). São **totais do site desde o começo**, nunca
   uma janela de 30 dias. O site nunca promete mais do que aconteceu.
5. **Filtro e lista de opções na mesma ordem no site inteiro.** Use
   `naOrdem()` / `rotulosNaOrdem()` com a constante `*_OPTS`, nunca a
   ordem que veio do banco.
6. **Nenhuma dependência nova.** Um arquivo, sem build, sem framework. O
   QR code foi escrito do zero justamente para não depender de serviço de
   terceiro. As únicas coisas de fora são Supabase, Leaflet/OSM, Overpass
   e as fontes do Google. Nada de IA: o texto da academia é entendido por
   palavras-chave, no próprio site (seção 4, `acesso`).
7. **Coluna nova no banco degrada com elegância:** se o `insert`/`update`
   falhar por a coluna não existir, salva sem ela e avisa o admin com o
   SQL exato (`faltaColunaNova` / `avisarSqlColunas`). O mesmo vale para
   a função de estatísticas: sem ela, o bloco de números some, e nada
   quebra.
8. **Commits, comentários e nomes de função em português.**
9. **Privacidade:** de uma busca fica guardado **bairro, cidade, CEP (o
   digitado ou o da região achada) e o ponto arredondado para ~100 m**
   (`pontoAproximado`, 3 casas decimais). De cada acesso, **origem**
   (Instagram, Google, Direto…) e **aparelho** (celular, tablet,
   computador). Cada clique de academia (ficha aberta, WhatsApp, Instagram,
   site, compartilhar) leva também a origem, o aparelho e a região da
   última busca (`state.ultimaBusca`), para o painel mostrar o público de
   cada academia e o "Copiar resumo pra mandar" incluir isso. Admin
   conectado não grava nada (`trackClick` sai no começo). Nunca o endereço digitado, a coordenada exata, IP ou
   identificador do aparelho. Pedido do Breno em 28/09/2026. Qualquer
   mudança nisso obriga a mexer na Política de Privacidade — e a data de
   "Última atualização" dos dois textos legais tem de acompanhar.
10. **SQL novo vira um arquivo em `supabase/migrations/`** e o GitHub
    aplica: no banco de teste com o PR, no de verdade com o merge (pedido
    do Breno em 28/09/2026). O SQL também vai escrito na conversa. Se a
    automação não puder rodar, o bloco pronto para copiar volta a ser o
    caminho — o Breno roda à mão no SQL Editor.
11. **Campo vazio não desenha bloco.** Academia que não preencheu
    horário, política ou acesso tem a ficha limpa, sem caixa vazia.
    **Academia sem foto não mostra nada no lugar da foto** (pedido de
    29/09/2026): nem "Foto em breve", nem bolinha, nem quadrado cinza — na
    página inicial, na busca, no mapa, na comparação, em "outras academias
    por perto" e na ficha (sem foto, a ficha começa direto no nome). O
    selo do cartão da busca, que ficava em cima da foto, vai para cima do
    nome (`rcard-tag solto`).
12. **Informação da mesma natureza mora no mesmo lugar.** Fachada,
    chegada e estacionamento ficam juntos, no mesmo formato.
13. **Sem IA.** O Breno pediu e depois recusou IA para padronizar textos
    ("não precisa de IA, é tipo como acontece na comparação"). O site
    entende por palavra-chave (seção 4, "Entendimento dos textos").
14. **Números públicos da home:** só acessos, "1 em N abre a ficha" e "% de
    quem abre chama a academia", **lado a lado** em colunas iguais, também
    no celular. **Não mostrar total de buscas** no site (fica no painel).
15. **Textos pedidos pelo Breno:** frase embaixo da busca "Compare preço,
    estrutura e comodidades de academias de tênis — e fale direto com
    elas."; filtro "Empréstimo de raquete"; "consulte com a academia";
    "aula com professor da academia". Nunca "lista alfabética" nem "quem
    pagou mais".
16. **Posição paga: por enquanto, não.** Hoje os planos do GuiaTennis
    Parceiros só liberam números, pessoas e novidades; a ordem da busca é a
    mesma para todas. O Breno disse (30/09/2026) que **mais para frente
    haverá posição paga** — então não prometer "nunca" em lugar nenhum.
    Quando vier, aparece marcada como patrocinada (Termos, seção 4, e a
    pergunta "A ordem das academias é paga?" do site já dizem isso).
17. **Sempre oferecer o plano de cima.** Pedido do Breno: toda tela da
    academia vende o próximo plano (painel, desempenho, conta, plano). No
    Premium, o que vem aí (promoções e avisos para os alunos).
18. **Academia não avalia academia.** Conta do GuiaTennis Parceiros (logada)
    e contato de academia (e-mail/WhatsApp de conta, WhatsApp de academia)
    não avaliam nenhuma academia; só respondem as da própria. Quem garante
    é o banco (gatilho `avaliacao_de_parceiro`).
19. **O logo é um desenho só** (pedido de 01/10/2026: "não deixe diferente
    onde tem a logo"): raquete com a bola no meio, **três riscos** saindo
    pela esquerda e cabo reto com a ponta. Sai de `logoDesenho()` no
    cabeçalho, rodapé, GuiaTennis Parceiros e QR code; os ícones, a imagem de
    compartilhar, a 404 e as imagens do WhatsApp saem do mesmo desenho pelo
    `divulgacao/gerar-imagens.js`. Mudou o logo? Rode o gerador.
21. **Relatório do mês por e-mail é só do Premium** (pedido de 02/10/2026):
    sem caixa "Quero receber por e-mail…" no cadastro nem no primeiro acesso
    (as colunas `recebe_relatorio` continuam no banco, sempre falsas).
22. **O que cada plano libera** (pedido de 02/10/2026): todos têm nome,
    endereço, quadras e tipos, modalidade, preço, horário, cancelamento,
    como chegar, WhatsApp, avaliações e QR code. **Básico** (grátis): até 3
    comodidades, até 3 fotos, só o WhatsApp, 1 pessoa, sem números.
    **Completo**: todas as comodidades, 5 fotos, Instagram e site, 5
    pessoas, sem números. **Premium**: o mesmo, 10 pessoas, todos os números
    (Desempenho) e o relatório do mês. O site corta a ficha pelo plano em
    `aplicarPlano` (dentro do `mapRow`; o que passou fica em `c.integral` e
    o formulário de edição usa ele); `LIMITES_DO_PLANO` também trava o
    formulário. O banco confere pessoas (`limite_de_pessoas`) e números
    (`numeros_da_academia` devolve `{trancado: true}` fora do Premium;
    SQL `20261002120000`).
20. **Contato do GuiaTennis fica por último** no menu ("Fale com a gente")
    e no rodapé (última coluna) — pedido de 01/10/2026.

## 3. Como é feito

Página única: **`index.html`** (~422 KB, ~8.000 linhas) com HTML, CSS e JS num arquivo
só. Sem build, sem npm, sem framework. Abrir o arquivo já é rodar o site.

- **Render:** `render()` reescreve `#app.innerHTML` inteiro e depois
  chama `attachEvents()`. Guarda e devolve `window.scrollY` e o
  `scrollTop` das folhas, então re-renderizar não faz a tela pular.
- **Estado:** um objeto global `state`. `let isAdmin` fica fora dele.
- **Rotas:** endereços de verdade, no padrão dos sites grandes (abaixo,
  "Endereços"). Páginas: `home`, `search`, `court`, `comparar`.
- **Navegador (`localStorage`):** favoritos (`guiatennis_favorites_v1`),
  comparação (`guiatennis_compare_v1`), vistas recentemente
  (`guiatennis_recentes_v1`), quem está avaliando
  (`guiatennis_visitor_v1`), o cache do "o que tem por perto"
  (`guiatennis_perto_v1`) e, desde 01/10/2026, a última busca
  (`guiatennis_ultima_busca_v1`), as academias chamadas
  (`guiatennis_chamadas_v1`) e as preferências de busca
  (`guiatennis_preferencias_v1`). Nada disso vai para o banco.

### Menu, home pessoal e cadastro passo a passo (pedido do Breno em 01/10/2026)
- **Menu no jeito do trivago** (`renderMenu`): "Menu" no meio com a seta de
  voltar; Início, Buscar quadra, Comparar; **Minhas quadras** (Favoritas,
  Vistas recentemente, Academias que você chamou — com a contagem na
  direita); **Preferências** (Preferências de busca, com a cidade na
  direita); **Suporte** (Como funciona, Perguntas frequentes, Por que o
  GuiaTennis, Termos, Privacidade, GuiaTennis Parceiros "para academias");
  **Fale com a gente** (WhatsApp, Instagram, E-mail) por último. As três
  listas abrem a folha "Minhas quadras" (`renderListaSheet`, abas
  Favoritas/Vistas/Chamadas, com "Apagar o histórico"/"Apagar a lista").
- **Home pessoal** (como "Visualizações recentes" e "Ofertas com base nas
  suas pesquisas recentes" do trivago): "Vistas recentemente" começa pelo
  cartão da **última busca** (lugar, o que procura, piso/cobertura e a
  lupa; um toque refaz a busca com os filtros — `refazerUltimaBusca`, link
  `/busca?q=…`); "Com base na sua última busca" (`academiasParecidas`: até 8
  academias a até 50 km de onde buscou, com os mesmos filtros, primeiro as
  ainda não vistas; sem busca, "Perto de <cidade das preferências>");
  "Academias que você chamou" ("Você chamou no WhatsApp · hoje"). Depois
  vêm Recomendadas e o resto. A academia chamada é lembrada em
  `trackClick` antes do `naoConta()` — fica no aparelho até para o admin,
  e o banco continua sem receber nada do admin.
- **Preferências de busca** (`renderPrefsSheet`): **estado primeiro**
  (lista dos 27, `ESTADOS`), **depois a cidade** (o campo só abre com o
  estado; sugere as cidades que têm academia) e "O que você costuma
  procurar". A cidade escolhida: abre a lista de cidades da home, vira a
  busca quando a pessoa toca em "Pesquisar" sem digitar e quando abre
  "Buscar quadra" pelo menu, e ordena as sugestões. Cidade ainda sem
  academia é localizada no Nominatim ao salvar (ponto arredondado).
- **Sem o "+" no canto da busca.** O cadastro de academia continua pelo
  menu, rodapé, bloco da home e ficha (GuiaTennis Parceiros).
- **Cadastro passo a passo** (`REG_PASSOS`, `regPassoHtml`, `irParaPasso`;
  como o "Anuncie seu espaço" do Airbnb, o cadastro do Booking para
  Parceiros e o primeiro acesso do Google Business Profile): uma parte por
  tela, barra "Parte N de 9", abas de cada parte (com ✓ quando
  preenchida) e "Voltar"/"Continuar" presos embaixo. Ordem: **Nome e
  endereço → Modalidade e preço → Quadras (e comodidades) → Contato →
  Fotos → Horário → Cancelamento → Como chegar → Revisar** — as quatro
  primeiras são o que o jogador usa para achar e chamar, o que a academia
  quer (contato) e o que o GuiaTennis precisa para aprovar; as outras
  completam a ficha ("Pular" quando vazias). Quem pede cadastro só envia
  na última parte, e "Continuar" cobra o que falta na parte; o admin e a
  edição salvam de qualquer parte. A revisão mostra ✓/Falta/Opcional e
  um toque leva à parte; erro no envio volta para a primeira parte que
  falta (`irParaFalta`). Todos os campos gravam em `window.__form` ao
  digitar, então trocar de parte não perde nada.

### Endereços (pedido do Breno em 30/09/2026: "igual os grandes em tudo")
Como Booking, TripAdvisor, Airbnb e Trivago, cada tela tem o próprio link
e tudo o que está nela vai junto: quem recebe o link vê a mesma coisa,
recarregar não perde nada e o "voltar" do celular desfaz o último passo.

| Tela | Endereço | Google |
|---|---|---|
| Home | `/` | indexa |
| Ficha | `/academia/<nome>-<últimos 8 do id>` (ex.: `/academia/quadra-exemplo-moema-00000002`) | indexa; pausada/pendente, não |
| Seção da ficha | `…#avaliacoes` (`visao`, `precos`, `cancelamento`, `estrutura`, `localizacao`, `avaliacoes`, `duvidas`, `contato`) | — |
| Região | `/quadras/<cidade>` e `/quadras/<cidade>/<bairro>` (título "Quadras e academias de tênis em Moema, São Paulo") | indexa |
| Busca | `/busca?q=…&piso=…&cobertura=…&modalidade=…&comodidades=…&nota=…&preco=…&distancia=…&favoritas=1&comparando=1&ordem=…&ver=mapa` | `noindex, follow` |
| Comparação | `/comparar?academias=<id8>,<id8>` | `noindex, follow` |

- O fim do id faz o link da ficha sobreviver à troca de nome (a academia
  agora edita o nome): o site acha pela ponta do id e corrige o endereço.
  Academia que saiu do guia: home com aviso e `noindex`.
- Links antigos (`?court=`, `?busca=`, `?comparar=1`) continuam abrindo e
  viram o endereço novo, mantendo `utm_source` (QR codes já impressos
  seguem valendo).
- Filtros sempre na ordem das listas (`naOrdem`), para o mesmo filtro dar o
  mesmo link. Mexer em filtro/ordem/mapa entra no histórico (o "voltar"
  desfaz); com a gaveta de filtros aberta, só vira um passo ao fechar. A
  busca refeita pelo "voltar" não conta de novo (`doSearch({ registrar:
  false })`). Busca pelo GPS vai para `/busca` sem nada (nunca a posição).
- Para o Google: canônica sem filtros (`urlCanonica`), título e descrição
  da região, `robots` por tela (`seoDaPagina`), dados com o caminho
  "Início › Quadras em São Paulo › Moema › Academia" (`BreadcrumbList`). O
  caminho da ficha, o bloco das cidades da home e o rodapé ("Quadras por
  cidade", como os destinos populares do TripAdvisor) são links de verdade
  para as regiões.
- `slugTexto` (site) e `slug()` (banco) têm de dar o mesmo resultado —
  conferido com acento, ç, ñ, º, ª, símbolos e nome longo.
- **Netlify:** `/academia/*`, `/quadras`, `/quadras/*`, `/busca`,
  `/comparar`, `/parceiros` e `/parceiros/*` entregam o `index.html`
  (status 200, `netlify.toml`).
- Ainda não é igual aos grandes: a prévia do link no WhatsApp mostra a
  imagem e o texto gerais do site, não os da academia — isso exige montar a
  página no servidor (função do Netlify), que gasta crédito. Fica para
  depois, se valer a pena.

### GuiaTennis Parceiros (pedido do Breno em 30/09/2026)
"Igual trivago para hoteleiros, Uber, iFood… outro site para os
responsáveis, com menu, ajuda, FAQ e benefícios — copie tudo dos grandes."
Referências: trivago Business Studio, Booking para Parceiros (join.booking
e o extranet), iFood Parceiros (portal do parceiro), Uber para motoristas e
o Google Business Profile ("reivindicar o perfil" e "Desempenho"). O site
das academias fica em **`/parceiros`**, no mesmo `index.html`, mas com
cabeçalho, menu, rodapé e largura próprios (de ponta a ponta no
computador) e, logado no celular, a barra de atalhos embaixo como nos apps
de parceiro. Não existe mais botão solto de "cadastre sua academia": tudo
o que é da academia leva para cá.

| Página | Endereço | Google |
|---|---|---|
| Apresentação: benefícios, como funciona, números do site, planos, perguntas | `/parceiros` (logado vai para o painel) | indexa |
| Planos (tabela do que cada plano libera) | `/parceiros/planos` | indexa |
| Ajuda (10 perguntas + WhatsApp e e-mail) | `/parceiros/ajuda` | indexa |
| Cadastro: 1) e-mail → 2) conta (nome, WhatsApp, senha, aceite) → 3) academia: "Administrar" uma do guia ou "Cadastrar academia nova" | `/parceiros/cadastro` (`?academia=<id8>` já pede aquela) | indexa; com `?academia`, não |
| Entrar (usuário e senha) | `/parceiros/entrar` | não |
| Painel, Desempenho, Avaliações, Minha ficha, Plano, Conta | `/parceiros/painel` etc. — sem login, cai no Entrar e volta para a página pedida | não |

**Planos** (`PC_PLANOS`, `PC_RECURSOS`): **Básico** grátis — ficha,
WhatsApp direto sem comissão, responder avaliações, QR code, visitas e
contatos dos últimos 30 dias. **Completo** — + dia a dia até 90 dias,
comparação com o período anterior, contatos por canal, de onde vieram e o
aparelho. **Premium** — + bairros de quem procurou, média das academias da
cidade e o histórico desde o começo. **Pessoas com acesso:** Básico 2,
Completo 5, Premium 10 (`PC_PLANOS.pessoas` e `limite_de_pessoas` no banco
— mudar nos dois). No Premium, "Em breve: promoções na ficha e avisos para
os seus alunos" (`PC_EM_BREVE`). Preço dos pagos: "Fale com a gente"
(WhatsApp do guia) — **o Breno ainda não definiu valores**; não inventar
preço. O admin muda o plano na ficha, como antes (`plano` da tabela). Hoje
a ordem da busca não depende do plano (regra 16).

**Conta do GuiaTennis Parceiros (pedido do Breno em 30/09 e 01/10/2026)** —
como o trivago Business Studio, o Booking e o Google Business Profile. Em
cima, a **barra do processo do trivago** (`pcEtapas`): trilho com a parte
feita preenchida, um ponto por etapa e os nomes embaixo — DADOS DE
CONTATO, SUA ACADEMIA, INÍCIO. O cadastro começa pelo e-mail:
1. **E-mail** → `login_do_email` diz se já tem conta. Tem: "Entrar com esse
   e-mail" (o Entrar aceita e-mail ou usuário; quem recebeu usuário do
   GuiaTennis entra também pelo e-mail que deu no primeiro acesso). Não tem:
2. **Dados de contato** (igual ao formulário do trivago) → tratamento (Sr.,
   Sra., prefiro não informar), nome e sobrenome, cargo na academia,
   telefone com "Brasil (+55)", senha, "quero receber dicas, novidades e o
   relatório do mês" (desmarcado) e o aceite → "Salvar e continuar"
   (`criar_minha_conta`, chamada pelo visitante; o login é criado direto no
   `auth.users`, com um freio de 20 contas novas por hora). Entra na hora,
   **sem academia**. O primeiro acesso de quem recebeu usuário do Breno usa
   os mesmos campos (`camposDeContato`).
3. **Sua academia** (a tela do trivago "Nice to meet you! Before we get
   started…") → "Prazer em conhecer você, Joana! Antes de começar, vamos
   ver se a sua academia já está no GuiaTennis." Busca pelo nome e o bairro,
   a lista é de escolha (uma marcada por vez); a que o site acha pelo
   e-mail (domínio do e-mail = domínio do site da academia; gmail/hotmail…
   não contam) ou a do link da ficha já vem marcada; o botão "Administrar
   esta academia" só acende com uma marcada (`pedir_para_administrar`), ou
   "Cadastrar academia nova" (o formulário não pede de novo nome, WhatsApp
   nem aceite: vão os da conta; o gatilho `pedido_da_academia_nova` faz da
   academia nova o pedido da conta). Pedido do Breno (01/10): as outras
   opções ficam **discretas, numa linha de texto com link** ("Não é essa?
   Procurar a minha academia ›", "A sua academia ainda não está no
   GuiaTennis? Cadastrar academia nova ›"), como nos sites grandes — não em
   caixas grandes.
- **Quem o Breno cadastrou com usuário e senha** não tem e-mail no começo:
  entra pelo usuário e a senha provisória (a linha "Recebeu usuário e senha
  do GuiaTennis, ou já tem conta? Entrar ›" do cadastro leva ao Entrar). O
  e-mail entra no primeiro acesso; dali em diante, entra pelo usuário ou
  pelo e-mail.
4. **Verificação pelo WhatsApp da ficha** (como o Google faz com o telefone
   da empresa) → no painel do admin, "Pedidos para administrar": "Gerar
   código para o WhatsApp da academia" (`gerar_codigo_do_pedido`, 6
   números de bytes aleatórios) e "Mandar o código ao WhatsApp da
   academia" — o Breno manda, pelo WhatsApp dele, para o número que está
   na ficha, com o nome de quem pediu e "se ninguém da academia pediu, é
   só ignorar". Quem pediu vê "(11) •••••-0001" e digita o código
   (`confirmar_meu_codigo`): certo, a conta passa a administrar na hora. O
   código fica cifrado numa tabela fechada (`codigos_de_verificacao`), vale
   72 horas e 5 tentativas (a função devolve 'ok', 'errado', 'tentativas',
   'venceu' ou 'sem_codigo' em vez de dar erro, para a tentativa ficar
   contada). Sem WhatsApp na ficha, ou se o número não é deles: documento
   (CNPJ ou contrato social) pelo WhatsApp do guia, e o Breno aprova à mão
   (Aprovar/Recusar continuam). Academia nova: publicar já libera a conta
   (gatilho `liberar_pedidos_da_academia`). Quem é liberado vira
   **responsável principal** se a academia ainda não tem um; senão, equipe.
- **Não confere se o e-mail é mesmo da pessoa** (o site não manda e-mail):
  quem garante é o código no WhatsApp da academia ou o documento.
- **Pessoas com acesso (Conta):** o responsável principal adiciona pelo
  e-mail (`adicionar_pessoa`): e-mail novo ganha login com senha
  provisória que a tela gera e mostra uma vez, com "Mandar pelo WhatsApp"
  (o responsável manda) e "Copiar"; e-mail de conta sem academia entra
  direto, com a senha dela. Remove com `remover_pessoa` (o login some). A
  equipe vê a lista, edita a ficha e responde avaliações, mas não mexe em
  pessoas. Plano cheio: some o formulário e aparece "Aprimorar para o…".
- Conta sem academia vê o painel com o pedido (ou "Falta escolher a sua
  academia"), menu curto (Painel, Plano, Conta, Ajuda) e sem a barra de
  baixo.

**Página de apresentação (pedido do Breno em 01/10):** os benefícios
vendem sem citar outras marcas (nada de "como no Google/TripAdvisor" em
texto que a academia lê; nas perguntas também não); "responder **às**
avaliações", com crase, em todo o site. "Como funciona" em 4 passos ligados
por uma linha — crie a conta (2 minutos), encontre a academia (na hora),
confirme pelo WhatsApp (o código), complete a ficha e receba alunos (todo
dia) — com o botão "Começar agora — é grátis". No rodapé dos parceiros, a
marca e a frase aparecem uma vez só, na faixa verde.

**Tela cheia e rodapé (mesmo pedido):** o formulário da ficha (editar,
cadastrar academia nova, admin) ocupa a tela inteira, com atalhos por parte
no topo (Nome e endereço, Horário, Fotos, Quadras, Modalidade e preço,
Cancelamento, Como chegar, Contato), como as abas do "Editar perfil" do
Google. Os dois sites terminam com a **faixa do trivago, no verde do
GuiaTennis** (`--green`, pedido do Breno em 01/10; o selo "Parceiros" fica
dourado nela)
(`rodapeFaixa`): marca, o que é e o copyright, de ponta a ponta.

**Desempenho:** vem de `numeros_da_academia(p_dias)` (SQL
`20260930140000`): o banco devolve só os números da academia do login e
corta pelo plano (pedir 90 dias no Básico devolve 30). Visitas na ficha,
contatos (WhatsApp, Instagram e site; compartilhar não conta como
contato), taxa de contato, variação contra o período anterior. Gráficos de
**uma série cada** (visitas embaixo de contatos, nunca dois eixos),
colunas finas com a leitura do dia ao tocar/passar o dedo, "Ver os números
em tabela", soma por semana acima de 92 dias. O que o plano não libera
aparece **trancado** com "Disponível no plano X · ver planos" — nunca com
número inventado. Academia logada e admin não contam nas visitas.

**Entradas a partir do site dos jogadores:** menu "Para academias" ›
"GuiaTennis Parceiros" (logado: "Painel da minha academia"), rodapé,
bloco da home ("Conhecer o GuiaTennis Parceiros") e a ficha ("Gerencie a ficha no
GuiaTennis Parceiros" → Cadastro já com a academia). No portal, "Ir para o
GuiaTennis (jogadores)" volta.

**Código:** `PC_*`, `perguntasParceiros`, `irParceiros(aba)` (a porta de
entrada de tudo), `carregarNumeros`, `graficoColunas`, `listaBarras`,
`blocoTrancado`, `pcTopo`/`pcRodape`/`pcBarraDeBaixo`, uma função por
página (`pcInicio`, `pcPlanos`, `pcAjuda`, `pcCadastro`, `pcEntrar`,
`pcPrimeiroAcesso`, `pcPainel`, `pcDesempenho`, `pcAvaliacoes`, `pcFicha`,
`pcConta`) e `ligarEventosParceiros`. CSS em `.pc-*`. O `renderContaSheet`
(folha por cima do site) saiu.

**Cartão da busca (mesmo pedido):** a caixa de preço ficou só com os
preços ("Aula / Locação", "a partir de, por hora") e o botão, como a caixa
de oferta do trivago; as comodidades ("✓ Coberta", "✓ Estacionamento
grátis") subiram para junto do endereço e das quadras (`.rcard-selos`).

### Mapa do `index.html` (linhas de 30/09/2026, aproximadas)

| Linha | O quê |
|---|---|
| topo | `<meta>`, canonical, JSON-LD (com `telephone`), CSS inteiro dentro de `<style>` (área da academia: `.conta-*`, `.dono-box`, `.rev-resp*`, `.acesso-*`; GuiaTennis Parceiros: `.pc-*`, perto da linha 1210; no fim, a camada "Acabamento limpo") |
| 1384 | `BANCO_DE_TESTE`, `NO_SITE_DE_TESTE`, `USANDO_BANCO_DE_TESTE`, Supabase |
| 1394 | `isAdmin`, `contaAcademia`, `EMAIL_ADMIN`, `DOMINIO_ACESSO`, `LINK_ENTRAR`, `emailDoLogin`, `naoConta` |
| 1477 | ícones (inclui `whatsapp`, `mail`, `info`, `barchart`, `historico`, `ajustes`, `ajuda`, `predio`), `bolaGirando`, **logo**: `logoDesenho` (entre `LOGO-INICIO` e `LOGO-FIM`) e `logoSvg()` |
| ~1510 | constantes `*_OPTS` (comodidade, piso, cobertura, modalidade, reposição, plano, ordem, distância) |
| 1572 | `horasDaReposicao` — prazo 12/24/48 ou personalizado |
| 1586 | `acessoDe`, `arrumarTexto`, `entenderEstacionar`, `acessoFicha`, `estacionarLinhas` |
| 1779 | `horarioDe`, `agruparDias`, `horarioLinhas`, `abertoAgora` |
| 1888 | `politicaDe` — cancelamento, igual ou separado por modalidade |
| 1988 | `mapRow` / `toRow` (banco ↔ objeto; `confirmada`) |
| 2087 | `COLUNAS_*_PUBLICAS`, `COLUNAS_ACADEMIA_NOVAS`, `lerPublico`, `lerContatosPrivados`, `lerRespostas`, `loadEverything` |
| 2291 | `DIAGNOSTICO`/`diag`, `trackClick`, `origemDoAcesso`, `registrarBusca` |
| 2408 | `state` |
| 2521 | geocodificação: `geocodeCep`, `localizarAcademia`, `completarCoordenadas`, `geocodeFormAddress`, `reverseGeocode` |
| 2825 | `getResults`, `render()` (no fim, `sincronizarLink`; `#app` ganha `pc-cheio` no site dos parceiros); SEO: `urlCanonica`, `seoDaPagina`, `atualizarSeo` |
| 3662 | `WHATSAPP_GUIA`, `whatsappGuia`, `CONTATOS_GUIA`, `linksContato`, `linkResponsavel` |
| 3698 | **endereços**: `SITE`, `slugTexto`, `idCurto`, `slugDaAcademia`, `caminhoDaFicha`, `caminhoDaRegiao`, `linkDaFicha` |
| 3762 | **área da academia**: `carregarConta`, `carregarAcessos`, `senhaProvisoria`, `mensagemDoAcesso`, `faltasDaFicha`, `blocoResposta`, `cartaoAvaliacao`, `formDadosConta`, `formTrocarSenha`, `blocoDono`, `blocoAcessoAdmin`, `blocoAcessosPainel`, `abrirConta`, `salvarDadosConta`, `publicarResposta`, `criarAcesso`, `ligarEventosConta` |
| 4709 | **GuiaTennis Parceiros**: `PC_*`, `irParceiros`, `carregarNumeros`, `graficoColunas`, `pcTopo`, `renderParceiros`, `pcInicio` … `pcConta`, `ligarEventosParceiros` |
| ~6560 | o que fica no aparelho: `lerUltimaBusca`/`guardarUltimaBusca`, `lerChamadas`/`lembrarChamada`, `ESTADOS`, `lerPreferencias`, `pontoDaPreferencia` |
| 5528 | `renderCabecalho`, `renderMenu`, `minhasQuadras`, `renderListaSheet`, `renderPrefsSheet`/`salvarPreferencias`, blocos da home (`blocoVistas`, `academiasParecidas`, `blocoChamadas`), `blocoMediasAcademias`, `renderSiteFooter` (cidades) |
| 5913 | navegação: `PARAMETROS_DA_TELA`, `filtrosNoLink`/`filtrosDoLink`, `urlDoEstado`, `syncUrl`, `sincronizarLink`, `lerLink` (inclui `/parceiros/<página>` e o antigo `?entrar`), `academiaDoSlug`, `regiaoDoLink`, `aplicarLink`, `irParaSecao`, `goHome`/`goSearch`/`abrirRegiao`/`openCourt`, `popstate` |
| ~6500 | página de busca, filtros, card da academia (`.rcard-selos`, caixa de preço `.offer-precos`) |
| 6625 | "o que tem por perto" (`POI_SERVIDORES`, `pedirOverpass`) |
| 6785 | academias do mapa aberto no painel: `MAPA_*`, `consultaMapa`, `carregarMapaAberto`, `adicionarDoMapa`, `conviteAcademia`, `blocoMapaAberto` |
| 7767 | `htAcesso`, `htHorario`, `htPolitica`, `perguntasAcademia`, `htCaminho` (links das regiões) |
| 8136 | `renderCourtPage` — a ficha inteira (aviso de ficha básica, `.ficha-dono`, bloco do dono) |
| 8428 | formulário de cadastro (`blocoPoliticaForm`, `REG_PASSOS`, `regFaltas`, `regPreenchido`, `regPassoHtml`, `renderRegisterSheet`, `irParaPasso`) |
| 8693 | estatísticas do admin (`statsAgregado`, `renderStatsPanel`) |
| 8795 | Termos de Uso (`TERMS_HTML`) e Política de Privacidade (`PRIVACY_HTML`) |
| 8879 | `renderLoginSheet` (admin; a academia entra pelo `/parceiros/entrar`), `renderAdminPanel` |
| 8940 | `attachEvents()` (login: academia vai para o GuiaTennis Parceiros; no fim, `ligarEventosConta` e `ligarEventosParceiros`) |
| 10095 | `doSearch(opcoes)`, `faltaColunaNova`, `montarEndereco`, `doRegisterSubmit` |
| 10306 | `init()` (o link manda na tela: `aplicarLink(lerLink())`; abrindo direto no painel/desempenho, busca os números) |

## 4. Banco (Supabase)

`SUPABASE_URL` e `SUPABASE_ANON_KEY` estão no `index.html` (chave
pública, é assim mesmo). Admin entra por e-mail/senha do Supabase Auth;
desde 30/09/2026 `isAdmin` só vale para o e-mail `guiatennis1@gmail.com`
(`carregarConta`); as academias entram pelo mesmo login, com usuário
(seção 4, "Área da academia").

### `academias`
`id, name, address, numero, complemento, bairro, cidade, endereco,
lat, lng, phone, instagram, site, price_range, price_aula,
price_locacao, amenities[], modalidades[], pisos[], cobertura[],
quadras(jsonb), photos[], source, status ('published'|'pending'),
pago, plano, politica(jsonb), acesso(jsonb), horario(jsonb),
pausada, pausada_ate, confirmada, nome_solicitante, contato_solicitante`

**`confirmada`** (desde 29/09/2026): `false` = **ficha básica**, listada
com dados públicos e ainda não confirmada pela academia. A ficha mostra
"Ficha básica. Informações públicas, ainda não confirmadas pela academia —
confirme horário e preço direto com ela." Toda ficha tem, no fim, o
link "É o responsável por esta academia? Fale com o GuiaTennis no
WhatsApp" (`linkResponsavel`): abre o WhatsApp do guia com a mensagem
"Sou responsável pela [academia] e quero atualizar a ficha (ou pedir a
remoção): [link]". O admin marca "Informações confirmadas pela academia"
no formulário. As 8 academias que já estavam no guia viraram `true` na
migração (29/09/2026, no banco de verdade). Banco sem a coluna conta como
confirmada (`row.confirmada !== false`).

**`politica`** — a academia escolhe uma regra para tudo ou uma para cada
modalidade:
```json
{ "modo": "igual",
  "reposicao": "24", "foraDoPrazo": "texto" }

{ "modo": "separado",
  "aula":    { "reposicao": "24", "foraDoPrazo": "texto" },
  "locacao": { "reposicao": "12", "foraDoPrazo": "texto" } }
```
`reposicao` é `"12" | "24" | "48" | "nao"` ou um número de horas de 1 a 720, quando a academia usa "Personalizar" (`horasDaReposicao`). A escolha "Aula e locação
diferentes" só aparece para quem marcou as duas modalidades; quem só dá
aula (ou só aluga) tem um bloco só, e salva só a regra do que oferece
(`politicaParaSalvar`). Na ficha, `politicaDe` também esconde a regra da
modalidade que a academia não oferece.

**`acesso`** — `{ fachada, entrada, estacionar }`, os três em texto
livre. "Empréstimo de raquete" **não** mora aqui: é a comodidade `raquete`.
`estacionar` só existe para quem **não** marcou estacionamento grátis ou
pago: com vaga própria o campo some do cadastro e o texto não é salvo.
No cadastro, esses três campos ficam depois do cancelamento.

**Entendimento dos textos, sem IA.** O banco guarda o texto como a
academia escreveu; quem arruma é a ficha, na hora de mostrar:
- `arrumarTexto` — tira emoji e caixa alta, troca "!!!" por ponto, põe
  horas como 19h/19h30 e valores como R$ 15, corrige acentos comuns
  (até, não, tênis, às 19h…), maiúscula no começo e ponto no fim. Vale
  para fachada, chegada, observação do horário e texto do cancelamento.
- `entenderEstacionar` — quebra o texto em trechos e classifica cada um
  por palavra-chave (`TERMOS_ESTACIONAR`), como a comparação faz nas
  anotações: manobrista, convênio, zona azul, difícil parar, pago perto,
  livre. Trecho sem palavra-chave segue o anterior ("zona azul até 19h,
  depois libera").
- `acessoFicha` — frase sobre estacionamento escrita na fachada ou na
  chegada muda para o bloco de estacionamento.
- `estacionarLinhas` — o modelo único, sempre na mesma ordem: No local ·
  Na rua (Livre / Zona azul / Difícil parar) · Pago perto · Manobrista ·
  Convênio. Com vaga própria, só "No local". O cadastro mostra a prévia
  ao sair do campo "Onde estacionar".

**`horario`** — dois modos de preenchimento:
```json
{ "modo": "igual", "semana": {...}, "sabado": {...}, "domingo": {...}, "nota": "" }
{ "modo": "dia", "seg": {...}, "ter": {...}, ..., "sabado": {...}, "domingo": {...} }
```
Cada faixa é `{ de: "06:00", ate: "22:00", fechado: false }`. No modo
`dia`, dias seguidos com o mesmo horário viram uma linha na ficha
("Seg a qua 6h às 22h").

### `avaliacoes`
`id, academia_id, stars, comment, nome_autor, contato_autor, created_at`

### `respostas` (30/09/2026)
`avaliacao_id (chave, uma resposta por avaliação), texto, user_id,
created_at, updated_at`. Resposta pública da academia embaixo da avaliação
("Resposta da academia"). O visitante lê tudo menos `user_id`.

### `academia_acessos` (30/09/2026)
`user_id (auth.users), academia_id, usuario, nome_responsavel, cargo,
email, whatsapp, cnpj, recebe_relatorio, termos_aceitos_em,
dados_completos_em, senha_trocada_em, ficha_atualizada_em, created_at,
updated_at`. Um login por academia. Ninguém de fora lê; a academia lê a
linha dela; o admin lê todas pela função `acessos_das_academias()`. Gravar,
só pelas funções (seção 4, "Área da academia").

### `cliques`
`id, academia_id, tipo, detalhe, cep, lat, lng, origem, dispositivo, segundos, segundos_ficha, created_at`

**Tempo até agir (pedido do Breno em 01/10/2026, SQL `20261001130000`):**
"quanto tempo o cliente fica no site até buscar ou chamar", como o tempo
até a conversão do Google Analytics. Em cada visita (`trackClick` →
`tempoAteAgir`): a chegada (`acesso_site`) leva `segundos = 0` — marca a
visita como medida —; a **primeira** busca e o **primeiro** contato
(WhatsApp, Instagram ou site) levam os segundos desde a chegada; o contato
feito da ficha leva também `segundos_ficha` (tempo olhando a ficha). As
outras buscas e contatos da mesma visita vão sem tempo. Teto de 86400 s.
Banco sem as colunas: a linha vai sem o tempo, com o resto
(`trackClick` tenta de novo). No painel de estatísticas do admin, bloco
"Tempo até agir" (`blocoTempoAteAgir`): **mediana** até a primeira busca,
até chamar uma academia e olhando a ficha (mediana, porque a média se perde
com quem deixou a aba aberta), quantas visitas medidas buscaram/chamaram
(%), e as faixas (até 10 s, 10–30 s, 30 s–1 min, 1–3 min, 3–10 min, mais de
10 min). Só para o admin por enquanto; dá para virar número do plano
Premium no GuiaTennis Parceiros. Está na Política de Privacidade.

`tipo`: `acesso_site`, `busca`, `visualizacao`, `whatsapp`, `site`,
`instagram`, `compartilhar`. `detalhe` e `cep` só são usados em `busca`:
`detalhe` guarda "Bairro, Cidade" e `cep` o CEP digitado ("05422-000"),
da busca (digitado ou achado no mapa). `lat`/`lng` são o ponto da busca
arredondado; `origem` e `dispositivo` vêm do `acesso_site` (e o aparelho
também da busca). O painel do admin mostra de onde vieram, aparelho, mapa
das buscas, regiões e CEPs. A trava `cliques_tipo_valido` lista os tipos.

**RLS:** a tabela é fechada para leitura — só o admin lê. O envio só
aceita os `tipo` da lista acima (`SQL-SEGURANCA.sql`). Quem responde
ao visitante é a **função** `estatisticas_publicas()`, que devolve quatro
totais somados e nada por academia.

### `estatisticas_publicas()` — função, não visão
Devolve `acessos_total, buscas_total, fichas_total, contatos_total`,
todos desde o começo do site.

Era uma visão, e o Supabase marcava como **"Security Definer View —
CRITICAL"**: uma visão pertence ao `postgres` e passa por cima do RLS.
Ligar `security_invoker` **não** resolve — a visão passaria a rodar como
o visitante, o RLS bloquearia `cliques` e os números viriam vazios. A
função `security definer` com `search_path` fixo faz o mesmo de um jeito
que o Supabase reconhece. O site tenta a função e, se ela não existir,
cai na visão antiga; sem nenhuma das duas, o bloco de números some.

### Segurança (`SQL-SEGURANCA.sql` e `20260930120000_acesso_academias`)
- Admin é quem tem o e-mail `guiatennis1@gmail.com` no login: as regras
  de editar, apagar e ver pendentes/cliques conferem `auth.jwt() ->> 'email'`
  (desde 30/09 também pela função `eh_admin()`).
  O cadastro de novos usuários no Supabase Auth está **desligado** — os
  logins das academias são criados pelo admin, pela função do banco.
- **Quem está logado (`authenticated`: admin ou academia) lê as mesmas
  colunas do visitante** desde 30/09/2026. Antes lia tudo, e com as
  academias logando uma leria o WhatsApp de quem avaliou as outras. O admin
  vê `nome_solicitante`, `contato_solicitante` e `contato_autor` pela função
  `contatos_privados()` (o site junta em `loadEverything`). Por isso
  **nenhuma leitura logada pode pedir `*`**: `select('*')` e `.select()`
  sem colunas são negados (o insert do admin usa `.select('id')`).
- O visitante (`anon`) lê **só colunas liberadas uma a uma**: tudo menos
  `nome_solicitante`/`contato_solicitante` (academias) e `contato_autor`
  (avaliações). O site pede essas colunas pelo nome
  (`COLUNAS_ACADEMIA_PUBLICAS`, `COLUNAS_AVALIACAO_PUBLICAS`, `lerPublico`);
  se a lista falhar, tenta `*`, que funciona antes do SQL.
- Envio de avaliação só com nota de 1 a 5; clique só com `tipo` conhecido;
  cadastro só como `pending`, sem plano pago.
- Avisos do Security Advisor que ficam, de propósito:
  `estatisticas_publicas` como `SECURITY DEFINER` executável por anon e
  authenticated — é assim que o visitante vê os quatro totais sem ler a
  tabela `cliques` (ver acima).

### Área da academia (pedido do Breno em 30/09/2026)
Cada academia ganha um login para **editar a própria ficha e responder as
avaliações** — como o Google Business Profile, o Yelp for Business, o
Management Center do TripAdvisor e o extranet do Booking. Como o Breno já
publicou academias sem elas saberem (fichas básicas), o fluxo é o "pré
login" pedido por ele:

1. **Admin cria o acesso** na ficha da academia, bloco "Acesso da
   academia": o site sugere o usuário pelo nome (`quadra.locacao`) e gera
   uma senha provisória fácil de digitar (`k2fj-sux4`, sem l/o/0/1). A
   senha só aparece nessa hora (não fica guardada em lugar nenhum legível);
   perdeu, "Gerar nova senha". Botões "Mandar pelo WhatsApp" (abre o
   WhatsApp da academia com a mensagem pronta: link da ficha, link
   `/parceiros/entrar`, usuário e senha — o Breno manda ele mesmo) e "Copiar
   mensagem". "Remover acesso" apaga o login (a ficha fica).
2. **A academia entra** pelo **GuiaTennis Parceiros** (seção 3, "GuiaTennis
   Parceiros"): link `guiatennis.com.br/parceiros/entrar?utm_source=WhatsApp-academias`
   (`LINK_ENTRAR`; o antigo `/?entrar` continua abrindo e vira esse), pelo
   menu do site ("Para academias" › "GuiaTennis Parceiros"), pelo rodapé ou
   pela ficha ("É o responsável por esta academia? Gerencie a ficha no
   GuiaTennis Parceiros").
   Digita o **usuário** (sem @); o site monta o e-mail
   `<usuario>@acesso.guiatennis.com.br` (`emailDoLogin`) — ninguém recebe
   nada nele. Com @, é o login do admin.
3. **Primeiro acesso** (obrigatório para editar): nome do responsável,
   cargo (Dono(a) ou sócio(a), Gerente, Professor(a), Recepção, Outro),
   e-mail, WhatsApp do responsável, CNPJ (opcional), senha nova (a
   provisória deixa de valer), "quero receber o relatório do mês" (opcional,
   desmarcado — LGPD) e o aceite "Represento esta academia e aceito os
   Termos…". Nada disso aparece no site.
4. **Painel da academia**, no GuiaTennis Parceiros (`/parceiros/painel`;
   no site dos jogadores, a faixa verde "abrir o painel" leva para lá):
   situação da ficha (no ar confirmada, ficha básica, pausada, em análise),
   os números do período, "Ficha 5 de 9 completa" (endereço, WhatsApp,
   horário, preço, cancelamento, quadras, comodidades, como chegar, fotos —
   o "complete seu perfil" do Google), Editar a ficha, Ver a ficha, QR code
   para a recepção. Páginas próprias para **Desempenho**, **Avaliações**
   (Responder / Editar / Apagar resposta e "Pedir análise ao GuiaTennis"),
   **Minha ficha**, **Plano** e **Conta** (dados do responsável, trocar
   senha, sair).
5. **Na ficha dela**, a academia vê o bloco "Área da academia" com Editar e
   o painel, responde embaixo de cada avaliação, e no lugar de "Avalie"
   aparece "Vocês não podem avaliar a própria academia". O link "É o
   responsável?" some para ela.

**O que a academia não pode** (garantido pelo banco, não pela tela):
apagar avaliação, avaliar a si mesma, mudar status, plano, pago, pausa,
origem ou quem pediu o cadastro (o gatilho `proteger_ficha_da_academia`
devolve os valores antigos), mexer em outra academia, apagar a ficha, ler
contato de quem avaliou/pediu cadastro, ler cliques, criar acesso ou trocar
senha de ninguém. Salvar a ficha pela conta da academia marca
`confirmada = true` (sai o aviso de ficha básica) e anota
`ficha_atualizada_em` para o admin. Pausar ou remover continua pelo
WhatsApp do guia.

**Admin:** o bloco "Acesso da academia" mostra usuário, "Esperando o
primeiro acesso" ou "Ativo desde…" com responsável, cargo, e-mail,
WhatsApp, CNPJ, se quer o relatório, último acesso, "ficha atualizada pela
academia em…" e "ainda com a senha provisória". O painel (prancheta) lista
"Acessos das academias". O admin pode apagar resposta (moderação).

**Estatísticas:** academia logada não grava nada (`naoConta()`), como o
admin — senão cada visita dela à própria ficha contaria.

**Funções do banco** (todas `security definer`, `search_path = ''`):
`criar_acesso_academia(academia, usuario, senha)`,
`nova_senha_academia(user, senha)` (derruba as sessões e pede troca de
novo), `remover_acesso_academia(user)`, `acessos_das_academias()`,
`contatos_privados()` — só admin; `completar_meu_acesso(...)` e
`marcar_senha_trocada()` — só a própria academia; `minhas_academias()` e
`avaliacao_da_minha_academia(id)` servem às regras. O login é criado
direto em `auth.users` + `auth.identities` com `extensions.crypt(senha,
gen_salt('bf', 10))`, o mesmo formato do Supabase, e com os campos de token
em `''` (nulo quebra o login do Supabase). Apagar o acesso (ou a academia)
apaga o login junto (gatilho `apagar_login_do_acesso`).

**Troca de senha:** pelo login do Supabase (`auth.updateUser`), mandando a
senha atual junto (`current_password`) — funciona com "Secure password
change" e "Require current password" ligados ou desligados (conferido no
GoTrue local). No primeiro acesso a senha provisória fica só na memória da
página até a troca. Esqueceu a senha: WhatsApp do guia → "Gerar nova
senha".

**Conferido aqui (30/09/2026):** Postgres 16 local com as migrações + o
login de verdade do Supabase (`supabase/auth`, commit de 22/09/2026,
compilado daqui): `testes/banco-acesso.py`, 133 conferências — a academia
entra com a senha provisória, troca a senha, edita só o que é dela, não
apaga nem se avalia, responde só as avaliações dela, não lê contato nem
cliques; nova senha derruba a sessão; remover acesso e excluir academia
apagam o login; `numeros_da_academia` corta o período e os detalhes pelo
plano, devolve só os números da própria academia e o visitante não chama;
conta por e-mail, pedido, aprovação, publicar libera, equipe com limite do
plano, e-mail ou WhatsApp de academia sem avaliar, o freio de contas
novas, os dados de contato completos e o código (só o admin gera, ninguém lê
a tabela, errado conta a tentativa, 5 tentativas, 72 horas, certo libera). Também com a biblioteca do site (`@supabase/auth-js`
2.117): entrar com usuário, `same_password`, troca com a senha atual.

### GitHub ↔ Supabase
O Breno ligou o repositório pelo painel do Supabase (Project Settings →
Integrations → GitHub) em 28/09/2026, e ela aponta para o projeto de
**teste** (`ohvbengbujdioxdtewsy`). O site **não depende** disso: ele fala
com o banco pela chave do `index.html`, e quem aplica o SQL é a esteira do
GitHub ("Automação do banco", abaixo).

Em cada PR aparece o check "Supabase Preview" como `skipped` ("This git
branch is not associated with any Supabase Branch"). É normal: ele só
agiria com o Branching (plano Pro) e com um `supabase/config.toml`, que
não existe de propósito (ver "Banco de teste"). Não é erro e não bloqueia
nada.

### Banco de teste (pedido do Breno em 28/09/2026)
O Breno quer testar como os sites grandes: um ambiente de teste com banco
próprio ("staging"), separado do de verdade. Até aqui o site de teste
(lucky-liger-1c29a3.netlify.app) gravava no banco de verdade, e o teste
em aba anônima inflava os números da home.

- **Caminho escolhido: grátis.** Um segundo projeto no Supabase
  (`guiatennis-teste`, plano grátis permite dois). O Branching (banco
  novo a cada PR) exige o plano Pro (US$ 25/mês) mais US$ 0,01344 por hora
  de cada banco de teste, e o crédito do plano não cobre isso. Pode entrar
  depois, sem refazer nada.
- **No site:** `BANCO_DE_TESTE = { url, chave }` no começo do `<script>`.
  Preenchido, a prévia de PR (`deploy-preview-N--….netlify.app`), o site
  de teste antigo (`lucky-liger-1c29a3.netlify.app` e as versões de deploy
  dele) e o `localhost` usam esse banco e mostram uma faixa amarela "Banco
  de teste" (`NO_SITE_DE_TESTE`). Qualquer outro endereço usa
  sempre o de verdade. O banco nunca é escolhido por parâmetro no link: isso
  deixaria alguém apontar o guiatennis.com.br para um banco falso com
  WhatsApp de golpe. Teste: `testes/banco-de-teste.js`.
- **Chave:** só a "publishable" ou "anon public". Nunca a "secret" nem a
  "service_role".
- **Estrutura:** `SQL-RETRATO.sql` só lê e devolve colunas, regras (RLS),
  travas, índices, funções e permissões. O Breno rodou no banco de verdade
  em 28/09/2026 e mandou o CSV (Export → Download CSV — colar a tabela no
  chat corta no meio). Rodar de novo sempre que quiser conferir se o
  banco de verdade e a pasta `supabase/` continuam iguais.
- **Pasta `supabase/`:**
  - `migrations/20260928150000_estrutura_inicial.sql` — a estrutura igual
    à do banco de verdade. Pode rodar de novo, até no banco de verdade,
    sem mudar nada.
  - `migrations/20260929120000_ficha_basica.sql` — coluna `confirmada`
    (as academias que já existiam viram `true`; a de exemplo `…0002` do
    banco de teste fica `false`) e a leitura dela para o visitante.
  - `migrations/20260929120100_sitemap.sql` — domínio `"*/*"` e a função
    `sitemap()`.
  - `migrations/20260930130000_links_amigaveis.sql` — `slug()`,
    `slug_da_academia()` e o `sitemap()` com os endereços novos (seção 3,
    "Endereços").
  - `migrations/20260930120000_acesso_academias.sql` — área da academia:
    tabelas `academia_acessos` e `respostas`, regras, gatilhos, funções e
    as colunas de contato fechadas para quem está logado (seção 4, "Área da
    academia").
  - `migrations/20260930140000_numeros_da_academia.sql` — função
    `numeros_da_academia(p_dias, p_academia)`: os números da própria
    academia para o Desempenho do GuiaTennis Parceiros, cortados pelo plano
    (seção 3, "GuiaTennis Parceiros"). O admin pode passar `p_academia`.
  - `migrations/20260930150000_parceiros_no_sitemap.sql` — o `sitemap()`
    com `/parceiros`, `/parceiros/planos`, `/parceiros/ajuda` e
    `/parceiros/cadastro`.
  - `migrations/20260930160000_contas_parceiros.sql` — conta sem academia
    (`academia_id` pode ser nulo), `papel` (principal/equipe), pedido
    (`pedido_academia_id`, `pedido_nome`, `pedido_em`), `login_do_email`,
    `criar_minha_conta`, `pedir_para_administrar`, `cancelar_meu_pedido`,
    `aprovar_pedido_de_acesso`, `recusar_pedido_de_acesso`,
    `pessoas_da_minha_academia`, `adicionar_pessoa`, `remover_pessoa`,
    `acessos_das_academias` com papel e pedido, e o bloqueio de avaliação
    de academia (regra "Enviar avaliacao" + gatilho `avaliacao_de_parceiro`).
    **Atenção:** rodar de novo o `20260930120000` ou o `SQL-SEGURANCA.sql`
    à mão desfaz a regra nova de avaliação — rodar este depois.
  - `migrations/20261001120000_cadastro_e_verificacao.sql` — `tratamento`
    na conta, `criar_minha_conta` e `completar_meu_acesso` com os campos
    novos (tratamento, cargo, novidades; a chamada antiga continua
    valendo), tabela fechada `codigos_de_verificacao`,
    `gerar_codigo_do_pedido` (admin), `confirmar_meu_codigo` (a conta) e
    `acessos_das_academias` com tratamento e `codigo_em`.
  - `migrations/20261001130000_tempo_ate_agir.sql` — colunas `segundos` e
    `segundos_ficha` em `cliques`, com trava de 0 a 86400.
  - `seed.sql` — cinco academias inventadas ("Exemplo", telefones que
    não existem): aula e locação, só locação, só aula com horário por dia
    e prazo de 36h, uma pausada e uma pendente; mais avaliações e
    cliques. Para antes de gravar se o banco tiver academia de verdade. No
    fim marca todas como confirmadas, menos a `…0002` (ficha básica).
  - `aplicar.sh` e `conferir.sh` — a esteira (ver "Automação do banco").
  - **Sem `config.toml` de propósito.** Sem ele a integração do GitHub
    não age. Com ele, as configurações de login iriam junto (valores
    padrão do Supabase, como cadastro de usuários ligado). Só criar
    quando for ligar o Branching ou o "Deploy to production", e com
    `enable_signup = false` em `[auth]` e `[auth.email]`.
  - Mudança nova no banco vira um arquivo novo em `migrations/`
    (`AAAAMMDDhhmmss_nome.sql`), além do bloco na conversa para o Breno.
- **Conferido aqui (28/09/2026):** banco zerado + migração + seed dá o
  mesmo retrato do banco de verdade (84 de 84 linhas); migração e seed
  rodam duas vezes sem erro nem duplicar; como visitante, vê 3 academias
  (sem a pausada e a pendente), não lê contato, não lê cliques, só grava
  clique conhecido, nota de 1 a 5 e cadastro pendente; o admin vê as 5 e
  os cliques; outra conta logada vê como visitante; o site abre as fichas
  de exemplo sem erro.
- **Projeto de teste:** `guiatennis-teste`, URL
  `https://ohvbengbujdioxdtewsy.supabase.co`, chave publishable
  `sb_publishable_NEF5wHWslCi3Uu9GfbHruQ_Ut3r_BBT` já no `BANCO_DE_TESTE`
  (28/09/2026). Estrutura e exemplos: o Breno colou a migração + `seed.sql`
  no SQL Editor em 28/09 (em três blocos de linhas curtas: o colar pelo
  celular com tudo junto deu "syntax error at or near ')'"). Desde então a
  esteira mantém o banco de teste em dia (29/09: "visitante lê as
  academias: 3 publicadas"). Login de admin no site de teste é o usuário
  do projeto de teste, não o do de verdade.
- **Onde se testa:** na prévia do PR (seção 7), que abre o banco de teste
  por causa do endereço `deploy-preview-N--….netlify.app`. O lucky-liger
  também abriria, mas ficou aposentado para não gastar crédito.
- **A conferir com o Breno:** se o usuário admin
  (`guiatennis1@gmail.com`) foi criado no projeto de teste (Authentication
  → Users → Add user) e se o cadastro de usuários está desligado lá
  (Authentication → Sign In / Providers → "Allow new users to sign up").

### Academias do mapa aberto (pedido do Breno em 29/09/2026)
O guia tinha 8 academias e precisava de mais para atrair público (o "ovo e
a galinha" dos sites de dois lados — Yelp, TripAdvisor e Doctoralia
listaram com dados públicos e depois convidaram o dono a assumir). Regra
combinada: **nome, endereço, telefone comercial e horário, um por um, pode;
copiar do Google em massa, fotos, avaliações, textos e logo, não.**
- O Breno perguntou (29/09) se pode pegar do Google Maps ou do Instagram
  nome, endereço e WhatsApp. **Pode**, olhando e digitando à mão, uma
  academia por vez, e a ficha entra como básica (`confirmada = false`).
  Fato básico não tem dono. Não pode: robô ou programa que copia do Google
  (os termos do Google Maps proíbem), foto, avaliação, nota, texto de
  descrição e logo. Na dúvida sobre foto, pedir à academia (mensagem da
  seção 13).
- No painel do admin (botão da prancheta), no fim, **"Academias no mapa
  que ainda não estão no guia"**, do OpenStreetMap (licença ODbL: uso
  livre, até comercial, com crédito). O admin digita uma região (bairro,
  cidade ou CEP, pelo mesmo caminho da busca do site) e escolhe até 3, 5
  ou 10 km; o mapa procura só em volta dela, nos mesmos 3 servidores do
  "o que tem por perto". A primeira versão consultava a cidade inteira ao
  abrir o painel e não voltava no celular do Breno; a segunda procurava
  "tênis" no nome de tudo o que tinha `leisure` e também não voltava.
  Hoje: etiqueta `sport~tennis` com nome, mais centros esportivos com
  "tênis" no nome; se os servidores não responderem, tenta de novo
  sozinho uma vez. Mensagens simples: "Não achei essa região…" ou "O mapa
  está lento agora…". O motivo técnico vai só para o `?diagnostico`.
- Cada academia mostra nome, endereço, distância e o telefone do mapa.
  Com telefone: botão "Chamar no WhatsApp" com o convite escrito
  (`conviteAcademia`) — o Breno manda ele mesmo. Sem telefone: "Procurar o
  telefone" abre a busca do Google com o nome e o bairro (consulta manual,
  um por um).
- Fica de fora o que não é academia pela regra do guia (`MAPA_FORA`:
  clube, country, condomínio, colégio, SESC, hotel…) e o que já está no
  guia (a menos de 200 m ou com o mesmo nome).
- "Adicionar como pendente" grava com `source = 'osm'`, `confirmada =
  false`, endereço das etiquetas do mapa (ou do Nominatim, se faltar) e o
  telefone só com dígitos. O admin confere, completa e aprova como sempre.
- Ficha com `source = 'osm'` mostra "Nome e localização: © colaboradores
  do OpenStreetMap". Termos (item 2 e 3) e Privacidade (item 1, 3 e 5)
  explicam a ficha básica, as fontes públicas e o pedido de remoção.

### Sitemap automático (29/09/2026)
`/sitemap.xml` não é mais o arquivo do repositório: o `netlify.toml`
repassa (proxy, `force = true`) para a função `sitemap()` do banco de
verdade, com a chave pública no cabeçalho. Ela lista a home, as páginas
públicas do GuiaTennis Parceiros, as páginas de
cada cidade e bairro com academia (`/quadras/…`, desde 30/09/2026) e a
ficha de cada academia publicada e em exibição (`/academia/…`) — academia
nova entra sozinha, sem publicar o site. A função roda com a permissão do
visitante: só pode pedir colunas que ele lê (com `a.*` ela quebrou no
teste local, porque o visitante não lê os contatos). A função devolve o tipo `"*/*"` (domínio sobre `bytea`)
e põe o `Content-Type: application/xml` ela mesma: com o tipo
`"text/xml"`, o PostgREST só devolve XML puro quando o pedido diz
`Accept: text/xml`, e o Google pede `text/html, …, */*` (viria JSON).
Conferido num PostgREST 12.2.3 local. A prévia do Netlify também aponta
para o banco de verdade. **No ar desde 29/09/2026:** a esteira conferiu no
banco de verdade "sitemap: 9 endereços" (a home e as 8 fichas). O
`sitemap.xml` do repositório fica de reserva, só vale se a regra do
`netlify.toml` sair.

### Automação do banco (pedido do Breno em 28/09/2026)
Os sites grandes guardam o SQL junto com o código e deixam a esteira
aplicar. **Funcionando nos dois bancos desde 29/09/2026** (segredos
colocados pelo Breno). Aqui:
- **`.github/workflows/banco.yml`** roda `supabase/aplicar.sh`:
  PR para a `main` que mexe em `supabase/` → banco de **teste**; merge na
  `main` → banco de **verdade**. Também roda à mão (Actions → Banco de
  dados → Run workflow, escolhendo teste ou real). Grátis: repositório
  público.
- **`supabase/aplicar.sh`** roda, na ordem, cada arquivo de
  `supabase/migrations/` que ainda não está no histórico
  (`supabase_migrations.schema_migrations`, a mesma tabela do Supabase),
  numa transação só junto com a anotação: entra inteiro ou nada. SQL com
  erro deixa a esteira vermelha e não muda o banco.
- A estrutura inicial (`20260928150000`) veio do banco de verdade: lá ela
  é só anotada, sem rodar (`JA_NO_BANCO_REAL` no script). No banco de
  teste ela roda (pode rodar de novo sem mudar nada).
- As academias de exemplo (`seed.sql`) só entram no banco de teste, e só
  se ele estiver sem nenhuma academia.
- **Segredos** (GitHub → Settings → Secrets and variables → Actions):
  `BANCO_TESTE_URL` e `BANCO_REAL_URL`, cada um com o endereço **Session
  pooler** do projeto (Supabase → Connect), com a senha do banco no lugar
  de `[YOUR-PASSWORD]`. O endereço direto (`db.<ref>.supabase.co`) é só
  IPv6 e o GitHub não alcança. Sem o segredo, a esteira avisa e não faz
  nada. Senha só com letras e números (caractere especial precisa ser
  codificado na URL).
- **SQL novo:** arquivo `supabase/migrations/AAAAMMDDhhmmss_nome.sql`,
  que pode rodar de novo sem estragar (`if not exists`, `drop … if
  exists`). Coluna nova em `academias`/`avaliacoes` entra também no
  `grant select (…)` para o visitante enxergar (ver seção 9).
- Testado num Postgres local: banco de teste como o Breno deixou, banco
  novo, banco igual ao de verdade (a estrutura inicial não roda lá) e SQL
  com erro (nada entra, saída com erro).
- Antes de conectar, o script mostra usuário, servidor, porta e o tamanho
  da senha, e avisa colchete, porta errada, endereço direto ou caractere
  especial — sem mostrar a senha. Tira espaço e quebra de linha colados.
  Na primeira vez, a senha recém-trocada no Supabase levou uns minutos
  para valer no pooler ("password authentication failed").
- Depois do SQL, `supabase/conferir.sh` testa pela API, com a chave
  pública, o que o site lê: as academias com as colunas do `index.html`,
  as respostas das academias, que a tabela de acessos fica fechada para o
  visitante, e o sitemap sem pedir formato (tem de vir XML).
- **Onde ver o resultado:** GitHub → Actions → "Banco de dados" → a
  execução → passo "Aplicar…". Linhas esperadas: `aplicada: <arquivo>`,
  `anotada sem rodar…`, `visitante lê as academias: N publicadas`,
  `visitante lê as respostas das academias`, `visitante não lê os acessos
  das academias (resposta 401)`, `sitemap: N endereços (F fichas, R
  regiões)` — e erro se o sitemap ainda tiver `?court=`. Do chat, o Claude lê pela ferramenta do GitHub
  (lista as execuções do `banco.yml` e lê o registro do job). É o jeito de
  conferir produção daqui, já que a rede deste ambiente não alcança o site
  nem o Supabase.
- **Coluna nova que o visitante lê** entra também em
  `COLUNAS_ACADEMIA_NOVAS`: na publicação, o site pode ir para o ar antes
  do SQL; aí ele lê sem as colunas novas em vez de cair no `*`, que o
  visitante não pode ler (o site ficaria vazio).

- **Postgres na máquina:** `/usr/lib/postgresql/16/bin`, como usuário
  `postgres`, com os dados em `/var/lib/postgresql/…` (no scratchpad o
  ambiente fecha as permissões de tempos em tempos e o Postgres cai):
  `initdb -D <dir>/data -A trust -U postgres` e
  `pg_ctl -D <dir>/data -o '-p 5433 -k <dir>/sock' start`. Antes da
  migração, criar os papéis `anon`, `authenticated` e a função
  `auth.jwt()` que o Supabase já traz.

## 5. Banco: o que já rodou e o que falta

**Já rodado pelo Breno (confirmado):**
- colunas `politica`, `acesso`, `horario` em `academias`;
- colunas `detalhe` e `cep` em `cliques`;
- função `estatisticas_publicas()`;
- trava `cliques_tipo_valido` com "busca" — trocou a `cliques_tipo_check`
  antiga, que recusava toda busca (confirmado em 28/09/2026);
- cadastro de novos usuários desligado no Supabase Auth;
- colunas do público em `cliques` (`lat`, `lng`, `origem`, `dispositivo`)
  e o `SQL-SEGURANCA.sql` inteiro — confirmados pelo retrato de
  28/09/2026: o visitante não lê `nome_solicitante`,
  `contato_solicitante` nem `contato_autor`, e as regras de envio estão
  fechadas.

**Estrutura do banco de verdade** (retrato de 28/09/2026, igual à
`supabase/migrations/`): as listas de `academias` (`amenities`,
`modalidades`, `pisos`, `cobertura`, `photos`) são **jsonb**, não
`text[]`; `lat`/`lng` de academias são `float8` e os de cliques,
`numeric`; os `id` são todos `uuid`. Regras: "Ver academias publicadas"
(publicada e não pausada, ou pausa vencida), "Admin ve pendentes",
"Enviar academia para analise", "Admin edita academias", "Admin exclui
academias", "Ver avaliacoes", "Enviar avaliacao", "Admin exclui
avaliacoes", "Admin ve cliques", "Registrar clique". Sem gatilhos e sem
índices além das chaves.

**Aplicado pela esteira no banco de verdade (29/09/2026, merge do PR #3):**
```
anotada sem rodar (veio do banco de verdade): 20260928150000_estrutura_inicial
aplicada: 20260929120000_ficha_basica
aplicada: 20260929120100_sitemap
visitante lê as academias: 8 publicadas
sitemap: 9 endereços
```
O histórico fica em `supabase_migrations.schema_migrations` nos dois
bancos.

**Esperando o merge (30/09/2026):** `20260930120000_acesso_academias`
(área da academia), `20260930130000_links_amigaveis` (sitemap com os
endereços novos), `20260930140000_numeros_da_academia` (Desempenho do
GuiaTennis Parceiros) e `20260930150000_parceiros_no_sitemap`, `20260930160000_contas_parceiros`
(conta por e-mail, pedidos, equipe, academia não avalia) e
`20261001120000_cadastro_e_verificacao` (dados de contato completos e o
código no WhatsApp da academia) e `20261001130000_tempo_ate_agir`. Entra no
banco de teste com o PR e no de verdade com o merge, sozinho. Pode rodar
de novo sem estragar.

**Falta confirmar / rodar** (tudo seguro para rodar de novo):

1. Morumbi Tennis, se ainda estiver fora do lugar no mapa:
```sql
update academias set lat = null, lng = null where name = 'Morumbi Tennis';
```
   e o admin abrir o site — ele localiza de novo, pelo nome.

**Consultas úteis (só leitura):**
```sql
-- últimos registros
select tipo, detalhe, cep, origem, dispositivo, created_at
from cliques order by created_at desc limit 20;

-- total por tipo desde o começo
select tipo, count(*), max(created_at) from cliques group by tipo;

-- travas da tabela cliques
select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'public.cliques'::regclass and contype = 'c';
```

## 6. Como testar

Os testes estão em `testes/` e não vão para o ar. Rodam sem internet: o
`harness.js` abre o `index.html` no Chromium com o Supabase trocado pelo
`mock.js`, o Leaflet por um stub e as APIs de CEP/endereço respondendo
fixo.

```
testes/check-js.sh
cd testes && for t in busca-e-ficha cadastro entendimento seguranca publico banco-de-teste ficha-basica acesso-academia links parceiros tempo menu-e-home planos; do NODE_PATH=$(npm root -g) node $t.js; done
```

Em 30/09/2026 (área da academia, links, visual limpo, GuiaTennis Parceiros
e contas por e-mail, tempo até agir, logo, menu, home pessoal,
preferências e cadastro passo a passo — 01/10): **439 verificações, todas
passando** (160 de antes, 66 da área da academia, 34 dos links, 127 do
GuiaTennis Parceiros, 16 do tempo até agir e 31 do `menu-e-home.js`), mais
as 133 do `banco-acesso.py` no banco e login locais.

- `check-js.sh` — tira o `<script>` e roda `node --check`. **Rodar sempre
  antes de qualquer outra coisa.**
- Formulário da ficha nos testes: é uma parte por tela. `irParte(page,
  "contato")` (do `harness.js`) vai direto para a parte antes de procurar
  o campo.

- `busca-e-ficha.js` — frase da home, busca registrada com região e CEP
  (e sem as colunas novas), admin não conta, política por modalidade na
  ficha, textos fixos.
- `cadastro.js` — cancelamento por modalidade, "Onde estacionar" só sem
  vaga própria, ordem dos campos, edição que não apaga horário nem regra.
- `publico.js` — origem e aparelho do acesso, link compartilhado com a
  etiqueta `Compartilhado`, CEP e ponto aproximado da busca, painel do
  admin e Política de Privacidade.
- `seguranca.js` — site funciona com o banco fechado (depois do
  `SQL-SEGURANCA.sql`), com o banco antigo e com o de hoje.
- `entendimento.js` — ficha e pergunta frequente com o texto arrumado e o
  estacionamento no modelo, frase trocando de lugar, prévia no cadastro.
- `ficha-basica.js` — aviso da ficha básica e link do responsável (vai ao
  Cadastro do GuiaTennis Parceiros, que pede o acesso no WhatsApp), banco sem a coluna nova, caixa do admin, busca do mapa aberto
  por região (sem clube, sem o que já está no guia, adicionar como
  pendente, mensagens de região não achada e de mapa lento), contatos em
  texto com logo e sem os dados, nada no lugar da foto, admin publica só
  com o nome (o visitante continua com os campos essenciais) e textos
  legais.
- `acesso-academia.js` — `/parceiros/entrar` (e o antigo `?entrar`), login
  por usuário, senha errada, primeiro acesso no portal (validação, troca da
  senha provisória, aceite), painel com os números e o que falta, Conta,
  responder/apagar resposta, pedir análise, editar só a
  própria ficha sem mandar status/plano, ficha básica que vira confirmada,
  não avaliar a si mesma, nada de editar/responder em outra academia,
  academia logada não conta, trocar senha, login sem acesso, admin cria o
  acesso e a mensagem do WhatsApp, admin continua vendo os contatos,
  moderação de resposta, banco sem o SQL novo e textos legais.
- `links.js` — endereço de cada tela: ficha por nome e id, nome antigo,
  `?court=` antigo, academia que saiu, região com título e canônica,
  caminho da ficha como link, filtros/ordem/mapa no link e na ordem das
  listas, gaveta vira um passo, "voltar" desfaz e não conta busca de novo,
  `?busca=` antigo, comparação, cartões e QR com o endereço novo, `noindex`
  da busca e da comparação, dados do caminho para o Google.
- `tempo.js` — tempo até agir: primeira busca e primeiro contato levam os
  segundos, os seguintes não, a chegada leva 0, contato pela ficha leva o
  tempo olhando a ficha, banco sem as colunas, admin não conta, painel do
  admin com medianas, porcentagens só das visitas medidas e faixas.
  `abrir({ semTempo })` finge o banco sem as colunas.
- `parceiros.js` — GuiaTennis Parceiros: apresentação, planos (o que cada
  um libera), ajuda, cabeçalho de ponta a ponta, menu do celular com
  âncoras, cadastro que procura a academia ("Administrar", "Não é essa",
  academia nova), entradas pelo site dos jogadores, caixa de preço da busca
  sem as comodidades, página privada sem login volta depois de entrar,
  Desempenho no Básico/Completo/Premium (períodos trancados, gráficos de
  uma série, leitura da coluna, 90 dias, desde o começo por semana,
  bairros e média da cidade), menu e rodapé de quem está logado, `noindex`
  e banco sem a função dos números. Também: cadastro pelo e-mail (e-mail
  que já tem conta, entrar pelo e-mail de contato, criar conta com os
  avisos, "Achamos pelo seu e-mail", pedido, cancelar, academia nova sem
  repetir os dados), admin aprova e publicar libera, link da ficha já pede
  a academia, pessoas com acesso (adicionar, plano cheio, remover, e-mail
  de outra academia, equipe sem mexer), ofertas de plano e "Em breve" do
  Premium, "Ver planos" separado, formulário em tela cheia com atalhos,
  faixa verde nos dois sites e visitante com contato de academia sem
  avaliar.
- `banco-acesso.py` — **não roda com os outros**: precisa de Postgres e do
  login do Supabase locais (abaixo, "Banco e login locais"). Confere no
  banco de verdade (não no mock) tudo o que a academia pode e não pode.
- `banco-de-teste.js` — a prévia do Netlify e o site de teste abrem o
  banco de teste; o guiatennis.com.br, o endereço do Netlify do site de
  verdade, link com `?banco=` e endereço parecido, nunca.

O `mock.js` tem as academias `a1` (só aula, estacionamento grátis, regra
separada) e `a2` (só locação, regra única). Chaves: `__admin` (sessão com
o e-mail do admin), `__semDetalhe`, `__semCep`, `__colunasFechadas`,
`__semPlano`, `__semConfirmada` (a `a2` é ficha básica), `__academia`
(academia logada, com acesso completo; `__acessoNovo` = primeiro acesso) e
`__semAcesso` (banco sem o SQL da área da academia); `abrir({ plano })`
escolhe o plano que `numeros_da_academia` devolve. `abrir({ avaliacoes,
respostas })` começa com avaliações e respostas. O mock finge o login
(`signInWithPassword` com as senhas de `window.__senhas`, `updateUser` em
`__senhaNova`), as funções do banco (`window.__rpcs`) e o gatilho que
protege a ficha quando quem salva é a academia. `abrir({ overpass })` responde o
OpenStreetMap com um JSON fixo; `abrir({ host })` finge outro endereço
(prévia, guiatennis.com.br) e o `createClient` do mock anota em
`window.__banco` qual banco o site escolheu. Teste de cadastro como
visitante precisa preencher antes a folha "quem está avaliando"
(`saveVisitor`), que abre primeiro. O que o site
grava fica em `window.__db` e `window.__cliques`; o último `update` em
`window.__ultimoUpdate`.

Playwright + Chromium já estão na máquina, mas **em `npm root -g`** — por
isso o `NODE_PATH`. A suíte inteira passa de 2 minutos: rode em segundo
plano ou um arquivo por vez.

**No site de verdade:** `guiatennis.com.br/?diagnostico` mostra uma caixa
preta com cada passo da busca e a resposta do banco a cada gravação
("gravado no banco" ou "o banco recusou … motivo"). Só aparece para quem
abre com `?diagnostico`, até fechar a aba. Foi assim que se achou a trava
que recusava as buscas.

**Banco e login locais (para `banco-acesso.py`):** Postgres como na seção
4 ("Postgres na máquina"), papéis `anon`, `authenticated`,
`service_role`, `authenticator`, `supabase_auth_admin` e o esquema `auth`
do dono `supabase_auth_admin`. O login do Supabase (GoTrue) se compila
daqui pelo proxy do Go, sem GitHub: `go mod download
github.com/supabase/auth@<commit>`, copiar a pasta, **apagar a linha
`replace github.com/joho/godotenv => ./internal/forks/godotenv`** do
`go.mod` (a pasta não vem no pacote) e `go build`. `gotrue migrate` cria o
`auth` (inclui `auth.uid()` e `auth.jwt()`); depois `supabase/aplicar.sh
teste` com `BANCO_URL` local e `gotrue serve` (variáveis
`GOTRUE_JWT_SECRET`, `DATABASE_URL` com `supabase_auth_admin`,
`GOTRUE_DISABLE_SIGNUP=true`, `API_EXTERNAL_URL`, `PORT`). O teste cria o
admin pela API de admin do GoTrue com um token `service_role` assinado
com o segredo.

**Daqui não se alcança o Supabase nem o site** (a rede do ambiente
bloqueia, "CONNECT tunnel failed, response 403"). Diagnóstico de produção
depende de print do Breno, das consultas da seção 5 e do registro da
esteira do banco (seção 4, "Onde ver o resultado"). O GitHub se alcança
pelas ferramentas do GitHub (PR, checks, Actions).

## 7. Arquivos que vão para o ar

`index.html`, `404.html`, `netlify.toml`, `robots.txt`, `sitemap.xml`,
`favicon-32.png`, `favicon-192.png`, `apple-touch-icon.png`,
`og-image.png`, `google7b66589ffc303f37.html` (verificação do Search
Console).

O `GUIATENNIS-CONTEXTO.md`, o `SQL-ESTATISTICAS.sql`, o
`SQL-SEGURANCA.sql`, o `SQL-RETRATO.sql` e as pastas `testes/`,
`supabase/`, `divulgacao/` e `.github/`
ficam no repositório mas fora do ar —
`netlify.toml` devolve 404 para eles. Arquivo novo na raiz vai para o ar
sozinho: se não for do site, ganha uma regra de 404 no `netlify.toml`.

**Como publicar (desde 28/09/2026):** o projeto guiatennis.com.br do Netlify
está ligado ao GitHub, com a `main` como branch de produção.
1. O trabalho vai para uma branch `claude/…` com PR para a `main`.
2. O Netlify monta a **prévia** do PR (`deploy-preview-N--….netlify.app`,
   o link aparece no PR). Ela usa o **banco de teste** e mostra a faixa
   amarela. Cada push atualiza a prévia.
3. O Breno testa na prévia e diz "pode subir". Aí o Claude faz o merge
   pela ferramenta do GitHub (ou o Breno aprova no próprio GitHub). O
   Netlify publica a `main` no guiatennis.com.br sozinho, e a esteira do
   banco aplica o SQL novo no banco de verdade.
4. Depois do merge: conferir o registro da esteira do banco e pedir ao
   Breno para abrir o site numa aba anônima.

**Créditos do Netlify** (plano grátis, 28/09/2026): 300 por mês, com
**teto**: acabou, os sites saem do ar até o mês virar. Cada publicação na
`main` gasta **15** (máximo de 20 por mês, menos o que for de tráfego:
20 por GB e 2 por 10 mil acessos). Prévia de PR e branch deploy gastam
**0**. Por isso:
- juntar várias mudanças num PR só, em vez de aprovar um por um;
- o `ignore` do `netlify.toml` pula a publicação quando o merge não mexe
  em nenhum arquivo do site (contexto, SQL, testes, `supabase/`);
- "Branch deploys" fica em "Deploy only the production branch";
- não arrastar zip no lucky-liger nem no guiatennis.com.br — zip no
  projeto é publicação de produção e, pelo jeito, gasta os mesmos 15.
  O lucky-liger ficou aposentado (a prévia do PR faz o papel dele);
- o consumo aparece no Netlify em Team → Usage.
- publicações pelo GitHub até aqui: merge do PR #2 (28/09) e do PR #3
  (29/09), 15 cada. Os zips arrastados antes disso também contaram.

**Emergência (Netlify fora ou sem crédito):** o zip com os 10 arquivos
acima ainda funciona — **só o `index.html` não basta**, porque ele aponta
para os ícones e a imagem de compartilhamento.

As imagens do site (favicons, ícone do iPhone, `og-image.png`) e o logo da
`404.html` saem do `logoDesenho` pelo `divulgacao/gerar-imagens.js`
(desde 01/10/2026; regra 19). A `og-image.png` é o logo com o nome
GUIATENNIS no meio de um fundo creme, 1200×630 — a que o Breno mandou.
O ícone do iPhone e o perfil do WhatsApp são quadrados (o aparelho
arredonda ou corta em círculo).

## 8. Referências de design

- **Ficha da academia:** hoteis.com — galeria, abas, cartão de contato
  fixo na direita, "Explore a região", perguntas frequentes.
- **Busca e home:** Trivago — card com oferta, mapa com pino de preço,
  filtros em gaveta, blocos da home.
- **Comparação:** TudoCelular — vagas no topo, tabela alinhada de uma
  linha por característica e ✓ verde em quem ganha cada linha.
- **Ficha básica e "É o responsável?":** Yelp, TripAdvisor e Google
  Business Profile ("Claim this business" / "Reivindicar esta empresa") —
  listar com dado público e convidar o dono a assumir a página.
- **Endereços:** Booking e TripAdvisor (ficha e cidade com endereço
  próprio, busca interna fora do Google, caminho "Início › Cidade › Bairro"),
  Airbnb e Trivago (filtros, ordem e mapa no link; "voltar" desfaz),
  Mercado Livre e TripAdvisor (id no endereço para o link não quebrar),
  TudoCelular (comparação com as academias no link).
- **Área da academia:** Google Business Profile (editar o perfil, "complete
  seu perfil", responder avaliação como "Resposta do proprietário", não
  apagar avaliação — só denunciar), Yelp for Business (responder em
  público, "Report review"), TripAdvisor Management Center (cargo do
  responsável + "sou representante autorizado"), Booking extranet (dados do
  responsável e CNPJ para cobrança futura) e o QR code de avaliação na
  recepção.
- **Menu e home pessoal (01/10/2026):** trivago — menu em tela com "Menu"
  no meio, grupos em negrito, ícone de traço e valor na direita
  ("Minha trivago", "Viagens: Favoritos, Visualizações recentes, Reservas",
  "Preferências de pesquisa", "Suporte", "trivago para hoteleiros"); home
  com "Visualizações recentes" começando pela última pesquisa e "Ofertas
  com base nas suas pesquisas recentes".
- **Cadastro passo a passo (01/10/2026):** Airbnb ("Anuncie seu espaço":
  uma pergunta por tela, barra de progresso, Voltar/Avançar), Booking para
  Parceiros (o essencial primeiro, revisão com o que falta antes de
  enviar) e Google Business Profile (nome, local e contato antes de
  horário e fotos; na edição, partes separadas).
- **GuiaTennis Parceiros:** trivago Business Studio (site separado para o
  hoteleiro, números da página, planos que não mexem na posição), Booking
  para Parceiros (apresentação com benefícios, "como funciona", perguntas
  frequentes e cadastro), iFood Parceiros e Uber para motoristas (portal
  com menu próprio e barra de atalhos no celular), Google Business Profile
  (procurar a empresa antes de cadastrar e "reivindicar"; "Desempenho" com
  visitas, contatos, período e comparação com o anterior).
- **Publicação e teste:** o fluxo dos sites grandes — prévia por PR com
  banco de teste (staging), SQL guardado no repositório e aplicado pela
  esteira, merge publica.

### Visual (pedido do Breno em 30/09/2026: "deixe mais clean")
O site usava a Playfair Display em tudo — texto, botão, rótulo e letra
miúda — e parecia aglomerado. Hoje, no padrão de Airbnb e Booking:
- **Letras:** `--fonte-texto` (Inter, do Google Fonts, com as do sistema
  de reserva) em todo o texto; `--fonte-titulo` (Playfair) só em
  `.display`, `.sheet-title` e `.sec-title` — marca, títulos de página e de
  seção. Nome de academia em cartão é Inter.
- **Tamanhos:** texto base 15px (16px no "Sobre a academia"), nada abaixo
  de 12px; campos com 16px (o iPhone não dá zoom); botões com 48px de
  altura; rótulos de campo e de filtro em letra normal, sem CAIXA ALTA.
- **Espaço:** mais ar entre as seções da home e da ficha, cartões com
  16–20px de respiro, bordas mais claras (`--border: #E9E3D7`).
- Tudo isso é a camada **"Acabamento limpo"**, no fim do `<style>` — vale
  sobre o resto. Regra nova de visual entra nela.
- No celular estreito, o "Compartilhar" sai da barra de baixo da ficha (já
  está na barra de cima) para o "Chamar no WhatsApp" caber numa linha.

## 9. Armadilhas já pisadas (não repetir)

- **`position: sticky` em item de grid** só gruda dentro da própria área
  do grid. Em coluna única, vira nada.
- **Sticky só funciona se o elemento vier antes do conteúdo que ele deve
  cobrir.** A barra de vagas da comparação ficou inútil enquanto estava
  abaixo do painel.
- **Re-render mata o scroll.** Quando só um pedaço muda (o "o que tem por
  perto"), atualize o slot (`#ht-poi-slot`) em vez de chamar `render()`.
- **`render()` a cada tecla tira o foco do campo.** Campos de texto e de
  hora usam `oninput`/`onchange` que só gravam no estado, sem redesenhar.
- **Overpass é lento.** São 3 espelhos em paralelo com `Promise.any` e 12
  segundos de orçamento total, consulta por `bbox`. Sequencial dava dois
  minutos.
- **Nominatim aceita uma busca por segundo.** O "gerar as coordenadas que
  faltam" espera 1,1s entre cada uma.
- **Academia sem `lat`/`lng` não aparece no mapa** e some da busca por
  distância. Foi o caso do Morumbi Tennis. Hoje o site resolve sozinho:
  `completarCoordenadas` roda quando o admin abre o site ou entra, a
  aprovação e a edição de endereço localizam de novo, e o cadastro novo
  entra mesmo sem achar a coordenada. `localizarAcademia` usa o CEP e o
  endereço completo quando rua/bairro/cidade não estão em campos
  separados. O que não achar aparece numa faixa amarela para o admin.
- **Tipo novo em `cliques` precisa entrar na trava `cliques_tipo_valido`.**
  A tabela nasceu com `cliques_tipo_check` sem "busca", e toda busca foi
  recusada em silêncio até 27/09/2026 — o site tentava três vezes e as
  três batiam na mesma trava. Criou tipo novo? Troque a trava. Para ver na
  hora o que o banco responde, abra o site com `?diagnostico`.
- **Link com `?busca=` precisa refazer a busca.** Recarregar, link salvo
  e aba reaberta pelo celular chegam assim; sem `doSearch()` no `init`, a
  página aparece sem buscar e nada é gravado.
- **Android força modo escuro** e destroi a paleta. Resolvido com
  `<meta name="color-scheme" content="light">` e `color-scheme: light`.
- **`lat`/`lng` vêm como texto do banco** às vezes. `numeroOuNulo()`
  normaliza — sem isso o mapa e a distância falham em silêncio.
- **QR code:** os bits de formato são linha/coluna trocados nas duas
  cópias, e o polinômio gerador de Reed-Solomon é montado em ordem
  decrescente. Errar isso gera um código que parece certo e não lê.
- **Botão de menu:** `.menu-btn > span:not(.menu-conta)` — sem o `:not`,
  o contador da comparação vira uma barrinha verde.
- **Os cards são `<button>`, não link.** Sem `<a href="?court=…">` o
  Google não chega em ficha nenhuma. Os minis da home são âncoras com
  `preventDefault` no clique; se criar card novo, faça igual.
- **`innerText` respeita `text-transform`.** Desde 30/09/2026 os rótulos
  (`.field-label`, `.fgroup-title`) não são mais em caixa alta; o que
  continua em maiúsculas (selos, `.menu-grupo`, `.ct-secao`) sai assim nos
  testes. Compare com o texto como aparece na tela.
- **Foto de tela sem a letra de verdade engana.** O `harness.js` bloqueia a
  internet, e o Chromium cai numa fonte qualquer. Para julgar o visual, use
  `abrir({ fontes: <pasta> })` com as fontes do Google baixadas por `curl`
  (`fontes.css`, os `.woff2` e `mapa.txt` com "url arquivo").
- **Admin conectado não conta nas estatísticas.** `registrarBusca` e o
  `acesso_site` saem se `isAdmin`. Quem testa logado (a sessão fica no
  celular) acha que a busca "não registrou". O painel avisa isso.
- **Editar academia tem de carregar tudo o que o formulário salva.** A
  edição não carregava `horario` (salvar apagava o horário) e carregava a
  política já transformada por `politicaDe` (a regra única sumia). Hoje usa
  `politicaParaForm` e uma cópia de `c.horario`.
- **Coluna nova em `academias` ou `avaliacoes` não aparece para o
  visitante sozinha.** A leitura do `anon` é liberada coluna por coluna.
  Depois de `alter table ... add column`, rode de novo o
  `SQL-SEGURANCA.sql` (ele libera todas menos as de contato) **antes** de
  pôr a coluna em `COLUNAS_ACADEMIA_PUBLICAS`; senão o site fica vazio
  para quem não é admin.
- **Localizar academia nunca pode gravar o centro da cidade.** O
  endereço da Morumbi não era achado com o bairro ("Vila Progredior"), a
  busca generalizava até "São Paulo" e gravava o marco zero. Hoje:
  rua+cidade antes de rua+bairro; resultado só de bairro/cidade vem
  marcado `grosso` e nunca é gravado; a busca pelo nome da academia no
  OpenStreetMap vale se estiver perto (1,5 km, ou 20 km quando o endereço
  foi grosso).
- **Duas academias no mesmo ponto: um pino escondia o outro** (Morumbi
  atrás da Mesqtennis). Pinos com a mesma coordenada (4 casas) ficam
  empilhados, um acima do outro.
- **Entendimento de texto não pode apagar informação.** Com vaga própria,
  a frase da fachada que falava de "estacionamento" ia para o bloco de
  estacionamento, que só mostra "No local", e sumia. Hoje nada sai da
  fachada/chegada com vaga própria, "garagem" e "vaga" não movem frase, e
  a fachada nunca fica vazia por causa disso.
- **Admin não grava nenhum clique** (`trackClick` sai no começo), nem de
  academia. Quem testa logado vê a faixa "Essa busca não foi gravada".
- **Netlify ligado ao GitHub publica a branch de produção sozinho.** O
  Breno ligou o Netlify ao GitHub em 28/09/2026 (app `netlify` aparece nos
  commits a partir do 556753c). A branch padrão do GitHub era a
  `claude/trivago-style-court-interface-fvd0v6` (b972d53, de 21/09), cujo
  `index.html` lê `select('*')`: depois do `SQL-SEGURANCA.sql` isso é
  negado ao visitante e o site fica **sem academias para quem não é
  admin** — e o admin logado vê tudo normal. Conferir sempre em aba
  anônima. Socorro: Netlify → Deploys → deploy anterior → "Publish
  deploy", e "Stop auto publishing" até a branch de produção estar certa. Desde
  28/09/2026 a branch de produção é a `main`.
- **`pkill -f` com um texto que aparece no próprio comando mata o
  terminal.** Para parar o PostgREST local: `kill $(pgrep -x postgrest)`.
- **`create or replace view` só aceita colunas novas no fim.** Mudar
  nome, ordem ou tipo exige `drop` antes — o mesmo vale para
  `create or replace function` com outro `returns table`.
- **XML pelo PostgREST:** função que devolve o domínio `"text/xml"` só sai
  como XML se o pedido mandar `Accept: text/xml`; o Google não manda e
  receberia um texto dentro de JSON. Use o domínio `"*/*"` e ponha o
  `Content-Type` com `set_config('response.headers', …)`.
- **Overpass com área grande não volta no celular.** A cidade inteira, ou
  "tênis" no nome de tudo o que é esporte, estourava o tempo dos
  servidores grátis. Consulta pequena (região + raio), etiqueta
  `sport~tennis`, uma nova tentativa automática e 20 segundos de espera
  (`MAPA_ESPERA`). O "o que tem por perto" da ficha continua com 12
  segundos (`POI_ESPERA`).
- **SQL longo colado pelo celular quebra** ("syntax error at or near ')'"
  numa linha que não existe no arquivo: sobrou texto no editor). Blocos
  curtos, linhas curtas, e o SQL Editor limpo antes de colar. Hoje a
  esteira aplica sozinha e isso quase não é mais preciso.
- **Senha nova do banco demora uns minutos para valer no pooler.** A
  primeira execução da esteira depois de trocar a senha deu "password
  authentication failed"; a seguinte passou.
- **Seed em banco novo marcava os exemplos como ficha básica** (a
  migração da coluna só marca `true` o que já existia antes dela). O fim
  do `seed.sql` acerta isso.
- **Página em caminho (`/academia/…`) resolve link relativo errado.**
  Tudo no `index.html` tem de ser absoluto (`/favicon-32.png`,
  `/academia/…`); um `href="?court=…"` viraria `/academia/x?court=…`.
- **Função do banco chamada pelo visitante não pode usar `select *`** em
  `academias`/`avaliacoes` (o `sitemap()` quebrou assim no teste local).
- **Logado não lê `*` desde a área da academia.** `authenticated` tem
  as mesmas colunas do visitante; `select('*')`, `.select()` sem colunas e
  `insert(...).select()` voltam "permission denied" (o admin lê contatos
  por `contatos_privados()`). Coluna nova em `academias`/`avaliacoes` entra
  no `grant select (…)` para `anon` **e** `authenticated`.
- **`isAdmin` é pelo e-mail**, não por ter sessão. O mock dos testes
  devolve a sessão com `guiatennis1@gmail.com`; login que não é do admin
  nem de academia sai sozinho (`init` e o botão Entrar).
- **Login do Supabase quebra com campo de token nulo** em `auth.users`
  ("converting NULL to string"). `criar_acesso_academia` grava `''` em
  `confirmation_token`, `recovery_token`, `email_change_token_new` e
  `email_change`.
- **Postgres local no scratchpad cai** (as permissões do scratchpad são
  refeitas de tempos em tempos). Dados em `/var/lib/postgresql/…`. Papel
  que já existe dá erro em `create role`: criar dentro de um bloco `do`
  que confere antes.

## 10. Histórico

```
(a seguir) Logo de três riscos em todo lugar, menu do trivago, home pessoal, preferências e cadastro passo a passo   ← PR #5, 01/10
1e2f7d2 Tempo até agir: segundos até a primeira busca e até chamar, no painel do admin   ← PR #5, 01/10
d0b7b1f Rodapé no verde do GuiaTennis   ← PR #5, 01/10
f9d34e9 Parceiros: benefícios que vendem mais, como funciona em 4 passos e rodapé sem repetir   ← PR #5, 01/10
b791da7 Cadastro como o do trivago e código no WhatsApp da academia   ← PR #5, 01/10
866edcd Cadastro dos parceiros: outras opções numa linha discreta   ← PR #5, 01/10
857b932 GuiaTennis Parceiros: conta por e-mail, pedidos, equipe, planos, tela cheia e faixa do rodapé   ← PR #5, 30/09
28846e5 GuiaTennis Parceiros: "Administrar" no lugar de "É a minha" no cadastro   ← PR #5, 30/09
c0c1d84 GuiaTennis Parceiros: site das academias com painel, desempenho por plano, planos e ajuda   ← PR #5, 30/09
2c6556c Visual limpo: Inter no texto, Playfair nos títulos e mais espaço   ← PR #5, 30/09
082e6ad Links no padrão dos grandes: ficha, região, filtros, abas e comparação   ← PR #5, 30/09
fbe7e89 Área da academia: login, primeiro acesso, edição da própria ficha e respostas   ← PR #5, 30/09
2bfc6d0 Documento de contexto atualizado depois do PR #3 (#4)
92e5685 SQL automático, ficha básica, WhatsApp, buscador do mapa e sitemap (#3)   ← merge na main, 29/09
d86bc8d Admin publica academia só com o nome
16b2e5c Academia sem foto não mostra nada no lugar da foto
f5b5ec1 Contatos em texto com logo pequeno e busca do mapa mais leve
d86117f Capa do WhatsApp sem a bola do canto
0267ad2 Foto de perfil com a raquete completa e capa com a quadra reta
3701f0b Contato em botões com ícone e academias do mapa procuradas por região
955441f WhatsApp do GuiaTennis no site, e imagens do perfil comercial
b27c20a Ficha básica, academias do mapa aberto, textos legais e sitemap automático
39b6e34 Esteira do banco confere o endereço antes de conectar, sem mostrar a senha
f70a090 Esteira do banco usa a versão nova do checkout
c89c544 SQL entra sozinho nos bancos, e link compartilhado ganha etiqueta
3ac3884 Banco de teste e publicação automática pelo GitHub (#2)                    ← merge na main, 28/09
34a7dd6 SQL do banco de teste com linhas curtas, para colar pelo celular
d4a2ffb Estrutura do banco dá as próprias permissões, para projeto novo do Supabase
30a301b Diagnóstico mostra quantas academias vieram do banco e o motivo da recusa
ddd18f0 Registra a main como branch de produção do Netlify
39ab44d Publicação automática pelo GitHub, gastando o mínimo de crédito
658e22b Anota o risco do Netlify publicar a branch antiga do GitHub
c0bbe76 Site de teste passa a usar o banco guiatennis-teste
556753c Banco de teste igual ao de verdade: estrutura e academias de exemplo
9774d30 Site de teste pronto para usar um banco só dele
6720791 Registra que a ligação GitHub ↔ Supabase está ativa
ff7a761 Anota como a ligação GitHub ↔ Supabase funciona e como conferir
1660c6b Documento de contexto completo para continuar em outro chat               ← início da main
ff03015 Público por academia: origem, região e aparelho de quem abre a ficha
799a269 Dados do público: CEP e ponto aproximado de toda busca, origem e aparelho
da675ca Registra a causa das buscas não gravadas: trava antiga no tipo de cliques
535b46b Modo diagnóstico: ?diagnostico mostra cada passo da busca e a resposta do banco
dbe7243 Cancelamento ganha "Personalizar": a academia escreve o prazo em horas
5dcc6b2 Academia nunca mais é gravada no centro da cidade
dd35e2f Pinos no mesmo ponto ficam empilhados, e academia é localizada pelo nome
69644fc Fachada deixa de sumir quando fala de garagem ou estacionamento
f3f9914 Números da home lado a lado também no celular
03a7d2e Números da home alinhados e sem o total de buscas
4f3729b Coordenada da academia é buscada sozinha, sem depender de botão
e11a5cb Link com busca no endereço refaz a busca, e ela conta
25b4d04 Visitante deixa de ler contatos e envios abertos ficam fechados
ecde3ed Tira "não é lista alfabética nem quem pagou mais" da home
1e0c58d Tira funções que não eram mais usadas
ed6095a Página de busca ganha o botão de menu, com o mesmo cabeçalho da home
98a3e6d Admin fica sabendo por que a busca não entrou no banco
64d54b7 Estacionamento e textos entendidos pelo próprio site, sem IA
68db9d3 IA padroniza os textos da academia (desfeito no commit seguinte)
3234102 Cadastro por modalidade, estacionamento só sem vaga e textos da home
51024d9 SQL pendente fica escrito dentro do documento de contexto
f40d81e Horário por dia, cancelamento por modalidade e acesso num bloco só
7788d7b Tira o "hoje" de quem procura onde jogar
c95fd53 Horário de funcionamento, e estacionamento vira texto da academia
9ea5587 Fachada, estacionamento e o que levar na ficha
246bc80 Números da academia passam a ser o total do site
9318ac4 Total de acessos vai para o bloco das academias
198c3b2 Ignora o zip de publicação
ed632b6 Números públicos saem de uma função, e verificação do Google
8993346 SQL do banco fica só com o que ainda falta rodar
e24d548 Data dos Termos e da Privacidade passa a bater com o texto
dd01743 Documento de contexto para continuar o projeto em outro chat
9a897ec Limpeza para o lançamento: menos explicação, mais site
30c6f94 Guarda o SQL das estatísticas no repositório
18c41da Total de acessos no topo e estatística de buscas para o admin
7c67807 Busca só na aba Todas, escrita "Procure pelo nome"
021482a Comparação vira tabela alinhada, no formato de comparador de produto
528acc1 Comparação sobe para o topo e ganha coluna própria no computador
f9a2403 Sem preço passa a ser "Não incluído · consulte a academia"
01d2980 Legenda dos números fica curta
592b2d7 Números da academia saem do banco e se atualizam sozinhos
c6f0f5f Recomendadas sem subtítulo e médias no bloco das academias
97bf1ac Tira a barra de navegação do rodapé
667ac1b Tira "clubes" dos textos: o guia é de quadras e academias
02cbe92 Menu de três barras e página inicial no padrão do Trivago
8eb38cc Abas de Início, Buscar e Comparar
4053ba2 Ordem única das opções, Estrutura, e como chegar na academia
1f52106 QR code do site inteiro no painel admin
98925ce QR code passa a usar o logo de verdade, centralizado
f159ef5 Preço do card segue a busca, e QR code de cada academia
756a819 Tira as comodidades repetidas nos cartões de preço
4516a3c Preço deixa de ser obrigatório
311f743 Cancelamento: a hora vira o prazo da reposição
fe8eb44 "O que tem por perto" deixa de ficar pendurado no carregando
513d377 Aba de cancelamento, menu de ordenar arrumado
056b135 Bola de tênis na espera, cards maiores
f16ee52 "Explore a região" mostra o que tem em volta da academia
c3512bf Ficha da academia no formato da página de hotel
b972d53 Planos básico, completo e premium no painel admin
d0dcf9b Contato único para aula e locação
6bd8c27 Bola de tênis de verdade, só o menor valor no card
2018b7d Página da academia no formato do hoteis.com
c9ade31 Configuração de publicação do Netlify
```

## 11. Em aberto

- **Testar na prévia o pedido de 01/10/2026** (aba anônima, celular): (1) a
  logo de três riscos no topo, no rodapé, no QR code (admin › ficha › QR) e
  no ícone da aba; o link do site mandado no WhatsApp mostra a imagem nova
  (o WhatsApp guarda a antiga por um tempo); (2) buscar um bairro, abrir uma
  academia e tocar no WhatsApp dela; voltar ao início: "Vistas
  recentemente" começa pela busca, depois "Com base na sua última busca" e
  "Academias que você chamou"; (3) menu › Preferências de busca: estado,
  depois cidade, salvar; tocar em "Pesquisar" sem digitar abre a cidade;
  (4) sem o "+" na busca; (5) admin › editar uma academia: uma parte por
  tela, abas em cima, Voltar/Continuar/Salvar embaixo. Depois do merge,
  trocar a foto do perfil do WhatsApp Business pela
  `divulgacao/whatsapp-perfil.png` nova.

- **Testar a área da academia na prévia do PR (30/09/2026)** — no banco de
  teste: (1) entrar como admin (usuário admin do projeto de teste), abrir a
  ficha "Quadra Exemplo Moema", bloco "Acesso da academia" → "Criar usuário
  e senha provisória" e "Copiar mensagem"; (2) numa aba anônima, abrir
  `…/parceiros/entrar`, entrar com o usuário e a senha, completar o primeiro
  acesso, ver o painel e o Desempenho, editar a ficha e responder a
  avaliação da Carla; (3) conferir que a ficha deixou de ser básica e que a
  resposta aparece para quem não está logado. GuiaTennis Parceiros: abrir
  `…/parceiros` no celular e no computador (apresentação, planos, ajuda,
  cadastro procurando uma academia); como admin, mudar o plano da Quadra
  Exemplo Moema para Completo e Premium e ver o Desempenho mudar.
  Links: abrir uma ficha e ver o endereço `/academia/…`; tocar em
  "Avaliações" (vira `#avaliacoes`); no caminho da ficha, tocar no bairro
  (`/quadras/sao-paulo/moema`); filtrar e ordenar e usar o "voltar" do
  celular. Visual: ver se a letra nova e o espaço agradaram no celular
  (home, busca, ficha, filtros). Depois, "pode subir".
- **Depois do merge dos links:** no Google Search Console, enviar o
  `sitemap.xml` (as fichas agora são `/academia/…` e há páginas de região).
  Links antigos seguem funcionando.
- **Depois do merge:** criar o acesso de cada academia (começar pelas
  fichas básicas) e mandar a mensagem pronta pelo WhatsApp. No painel,
  acompanhar quem completou ("Ativo desde…") e quem ainda está com a senha
  provisória. Quem marcou "relatório do mês" aparece no bloco do acesso: o
  "Copiar resumo pra mandar" do painel continua sendo o relatório, mandado
  pelo Breno.
- **Testar as contas por e-mail na prévia:** em aba anônima,
  `…/parceiros/cadastro` → e-mail novo → dados de contato → "Administrar
  esta academia" (Quadra Exemplo Moema) → como admin, "Pedidos para
  administrar" → "Gerar código" → o código aparece (no teste, o WhatsApp da
  ficha é inventado: copie o código em vez de mandar) → digitar na aba
  anônima.
  Depois, na Conta, adicionar uma pessoa e entrar com ela em outra aba.
- **Preço dos planos Completo e Premium:** o Breno define. Hoje o site diz
  "Fale com a gente" e o botão abre o WhatsApp do guia; quando houver
  valor, trocar em `PC_PLANOS` (e nos Termos, se mudar a regra).
- **Próximos passos do GuiaTennis Parceiros** (pedidos do Breno e
  referência: Google Business Profile, trivago Business Studio e Yelp):
  promoções na ficha e avisos para os alunos (o "Em breve" do Premium),
  posição paga marcada como patrocinada, relatório do mês sozinho por
  e-mail (para quem marcou), aviso de avaliação nova, confirmação do e-mail
  por código (precisa de um serviço de e-mail) e a prévia do link no
  WhatsApp com a foto da academia (seção 3, "Endereços").
- **Conferir o site depois do merge do PR #3** (pedido ao Breno em
  29/09/2026, sem resposta ainda): em aba anônima, guiatennis.com.br com o
  WhatsApp e o logo pequeno no menu e no rodapé; uma ficha com "É o
  responsável…"; guiatennis.com.br/sitemap.xml com a lista de endereços; no
  painel do admin, a busca do mapa por região (ex.: "Moema, São Paulo").
- **Google Search Console (próximo passo sugerido):** o site já está
  verificado (`google7b66589ffc303f37.html`). Falta, em Sitemaps, enviar
  `sitemap.xml` e ver as fichas entrarem em Páginas. É o que TripAdvisor e
  Booking fazem para cada página nova aparecer no Google sozinha.
- **PR #1** (`claude/new-session-qevg66` → `claude/trivago-…`): velho,
  pode ser fechado sem merge.
- **Projeto de teste do Supabase:** criar o admin e desligar o cadastro
  de usuários (seção 4, "Banco de teste", "A conferir"). Para testar a área
  da academia na prévia, o admin do projeto de teste precisa ter o e-mail
  `guiatennis1@gmail.com` (é o que o banco e o site reconhecem).
- **Crescer as academias** (plano de 29/09/2026): escolher uma região,
  completar todas as academias dela com ficha básica (lista do mapa no
  painel + busca manual, um por um), mandar a mensagem "sua academia já
  está no GuiaTennis" e usar QR code, Collab no Instagram e o relatório do
  mês para cada academia trazer os próprios alunos.
- **Academias:** mandar a mensagem da seção 13 às que não preencheram
  horário, preço, cancelamento, como chegar e fotos.
- **Marketing:** links com etiqueta (28/09/2026), que aparecem em "De
  onde vieram" no painel e no card de cada academia:
  `?utm_source=Instagram-bio`, `Instagram-stories`, `Instagram-direct`,
  `WhatsApp` (status, grupos, amigos) e `WhatsApp-academias`. O botão
  Compartilhar da ficha põe `&utm_source=Compartilhado` sozinho. O site
  só lê o `utm_source`.
- **Links para Instagram e WhatsApp** (passados em 28/09/2026):
  bio do Instagram `https://guiatennis.com.br/?utm_source=Instagram-bio`;
  perfil do WhatsApp `https://guiatennis.com.br/?utm_source=WhatsApp-perfil`;
  mensagens para academias `…/?utm_source=WhatsApp-academias`.
- **Backup:** uma vez por mês, Table Editor → Export → CSV de cada tabela
  (o plano grátis do Supabase não guarda backup restaurável).
- Segurança das contas: 2 etapas em Supabase, Netlify, GitHub e Gmail.
  "Leaked password protection" só existe no plano pago; senha forte basta.
  **Não ligar o Captcha do Supabase** — o login do site não tem captcha e
  o admin ficaria trancado.
- Ideias no ar: posição do bloco "Por que estar no GuiaTennis"; tirar o
  contador da comparação do botão do menu.

## 12. WhatsApp Business do GuiaTennis (29/09/2026)

Número (11) 92745-6457. No site, o contato do guia aparece **só com o nome
e o logo pequeno, sem os dados** (`linksContato`): "WhatsApp", "Instagram"
e "E-mail" no menu (Contato, no formato dos outros itens) e no rodapé (no
formato dos outros links) — pedido do Breno, que não gostou dos botões em
pílula. O número e o e-mail por escrito ficam só nos Termos e na
Privacidade. O bloco "Por que estar no GuiaTennis" tem o link pequeno
"Prefere conversar? Chame o GuiaTennis no WhatsApp", em dourado e
sublinhado (o azul padrão ficava ilegível no verde). O link "É o
responsável por esta academia?" abre o WhatsApp do guia com o nome e o
link da academia. Tudo sai de `WHATSAPP_GUIA` e `whatsappGuia(texto)`.
Os dados para o Google levam o `telephone`.

**Sem mensagens automáticas** (saudação, ausência, respostas rápidas): o
Breno não gosta, responde ele mesmo.

Imagens em `divulgacao/` (fora do ar), geradas do `logoDesenho` por
`divulgacao/gerar-imagens.js`: `whatsapp-perfil.png` (1080×1080, o logo
quadrado, que cabe no corte redondo) e `whatsapp-capa.png` (1600×900; texto em
cima e nas laterais, porque a foto redonda cobre o meio de baixo). Desde
01/10/2026 o perfil usa **o mesmo logo do site** (antes era uma raquete
redesenhada, com um risco curvo só — o Breno pediu o logo igual em todo
lugar, com os três riscos). **Trocar a foto do perfil do WhatsApp Business
pela nova.** Na capa, a quadra é
reta, vista de trás da linha de fundo, em perspectiva com as medidas
oficiais (a primeira versão, inclinada, pareceu torta). O
gerador busca a fonte do Google pelo `curl`, que passa pelo proxy daqui.

Textos do perfil (combinados em 29/09/2026 — para o público e para as
academias, sem pedir palavra-chave):
- **Descrição:** "🎾 GuiaTennis — o guia de quadras e academias de tênis. /
  Vai jogar? Ache as academias mais perto, compare preço, estrutura e
  avaliações e fale direto com elas. Sem taxa. / Tem academia? Apareça de
  graça para quem procura aula ou quadra na sua região: o aluno chama
  direto no seu WhatsApp, sem comissão. Página completa, QR code para a
  recepção e relatório de quem viu vocês. / guiatennis.com.br"
- **Recado:** "Quer jogar tênis? Compare academias perto de você. Tem
  academia? Apareça grátis 🎾"
- **Site no perfil:** `https://guiatennis.com.br/?utm_source=WhatsApp-perfil`.

## 13. Mensagem para as academias (WhatsApp)

> Oi, tudo bem? Aqui é o Breno, do **GuiaTennis** (guiatennis.com.br), o
> guia de quadras e academias de tênis onde a [NOME DA ACADEMIA] já
> aparece.
>
> A ficha de vocês ganhou espaço para mais informações — e isso ajuda muito
> quem está procurando onde jogar a escolher vocês e chamar direto no
> WhatsApp. Não tem custo nenhum.
>
> Se puderem me responder só o que fizer sentido:
> 1. Horário de funcionamento (segunda a sexta, sábado e domingo).
> 2. Preço por hora da aula e da locação (se preferirem não divulgar, tudo bem).
> 3. Cancelamento: com quantas horas de antecedência o aluno precisa avisar
>    para ter reposição? E o que acontece se avisar depois?
> 4. Como chegar: como é a fachada, o que fazer ao chegar e onde estacionar.
> 5. Quadras: quantas de saibro ou rápida, cobertas ou descobertas.
> 6. Comodidades: vestiário, Wi-Fi, lanchonete, água, loja, empréstimo de
>    raquete, câmera para gravar pontos, app de assinatura fitness.
> 7. Até 5 fotos do espaço.
>
> Assim que eu atualizar, mando o link da ficha. Também posso mandar um QR
> code da página de vocês para deixar na recepção. Obrigado!
