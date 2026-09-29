# GuiaTennis — contexto do projeto

Documento para abrir um chat novo sem perder nada. Quem chegar aqui deve
conseguir continuar o trabalho lendo só este arquivo e o `index.html`.

**Dono:** Breno (brenocoppini.bc@gmail.com)
**Repositório:** `brenocoppinibc-prog/GuiaTennis`
**Branches:** `main` = o que está no ar (criada em 28/09/2026 a partir da
`claude/new-session-qevg66`). O trabalho novo entra por pedido de mudança
(PR) de uma branch `claude/…` para a `main`; a última foi a
`claude/github-supabase-connection-n1w3rr`. As outras `claude/…` são
antigas.
**No ar:** guiatennis.com.br (Netlify, publica a `main` sozinho) · teste na
prévia de cada PR, `deploy-preview-N--….netlify.app` (seção 7). Cada um com
o seu banco: o de verdade `eultezheqwmxyakvgyjy` e o de teste
`ohvbengbujdioxdtewsy`, projeto `guiatennis-teste` (seção 4, "Banco de
teste")
**Instagram:** @guiatennis · **WhatsApp Business:** (11) 92745-6457 (`WHATSAPP_GUIA`) · **E-mail:** guiatennis1@gmail.com
**Atualizado em:** 28/09/2026

> **Estado:** site completo e no ar. O que ainda depende do Breno está na
> seção 5 (SQL) e na seção 11 (em aberto).

### Como abrir o chat novo
Anexe este arquivo e diga em qual branch trabalhar. No chat novo, antes de
mexer:
1. `git fetch origin main` e trabalhar a partir dela (se a branch do chat
   novo estiver atrás, avançar com `git merge --ff-only FETCH_HEAD`). Se
   houver PR aberto para a `main`, continuar na branch dele.
2. Rodar `testes/check-js.sh` e os testes da seção 6.

### Como o Breno trabalha (importante)
- Fala português, pelo celular, e manda print. Resposta curta, direta, em
  português, sem jargão.
- **Publica aprovando o PR no GitHub** (desde 28/09/2026 — seção 7). Não
  mandar mais zip, a não ser que ele peça: cada zip arrastado gasta
  crédito do Netlify.
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
3. **Sem preço = "Não incluído" + "consulte com a academia"** (`SEM_PRECO` /
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

## 3. Como é feito

Página única: **`index.html`** (~369 KB) com HTML, CSS e JS num arquivo
só. Sem build, sem npm, sem framework. Abrir o arquivo já é rodar o site.

- **Render:** `render()` reescreve `#app.innerHTML` inteiro e depois
  chama `attachEvents()`. Guarda e devolve `window.scrollY` e o
  `scrollTop` das folhas, então re-renderizar não faz a tela pular.
- **Estado:** um objeto global `state`. `let isAdmin` fica fora dele.
- **Rotas:** `history.pushState` com `?court=ID`, `?busca=…`,
  `?comparar=1`. Páginas: `home`, `search`, `court`, `comparar`.
- **Navegador (`localStorage`):** favoritos (`guiatennis_favorites_v1`),
  comparação (`guiatennis_compare_v1`), vistas recentemente
  (`guiatennis_recentes_v1`), quem está avaliando
  (`guiatennis_visitor_v1`) e o cache do "o que tem por perto"
  (`guiatennis_perto_v1`).

### Mapa do `index.html` (linhas aproximadas, ~391 KB)

| Linha | O quê |
|---|---|
| topo | `<meta>`, canonical, JSON-LD, CSS inteiro dentro de `<style>` |
| 946 | Supabase, `LOGO_SVG`, ícones, `bolaGirando` |
| 1045 | constantes `*_OPTS` (comodidade, piso, cobertura, modalidade, reposição, plano) |
| 1109 | `horasDaReposicao` — prazo 12/24/48 ou personalizado |
| 1123 | `acessoDe`, `arrumarTexto`, `entenderEstacionar`, `acessoFicha`, `estacionarLinhas` |
| 1316 | `horarioDe`, `agruparDias`, `horarioLinhas`, `abertoAgora` |
| 1425 | `politicaDe` — cancelamento, igual ou separado por modalidade |
| 1525 | `mapRow` / `toRow` (banco ↔ objeto) |
| 1621 | `COLUNAS_*_PUBLICAS`, `lerPublico`, `loadEverything` |
| 1761 | `DIAGNOSTICO`/`diag`, `trackClick`, `origemDoAcesso`, `registrarBusca` |
| 1876 | `state` |
| 1960 | geocodificação: `geocodeCep`, `localizarAcademia`, `completarCoordenadas`, `geocodeFormAddress`, `reverseGeocode` |
| 2264 | `getResults`, `render()` |
| 3148 | mapa Leaflet da busca (pinos empilhados) |
| 3403 | `renderCabecalho`, menu, blocos da home, `blocoMediasAcademias` |
| 3861 | página de busca, filtros, card da academia |
| 5202 | `htAcesso`, `htHorario`, `htPolitica`, `perguntasAcademia` |
| 5586 | `renderCourtPage` — a ficha inteira |
| 5820 | formulário de cadastro (`blocoPoliticaForm`, `renderRegisterSheet`) |
| 6048 | estatísticas do admin (`statsAgregado`, `renderStatsPanel`) |
| 6228 | Termos de Uso e Política de Privacidade |
| 6360 | `attachEvents()` |
| 7461 | `doSearch`, `doRegisterSubmit` |
| 7649 | `init()` |

## 4. Banco (Supabase)

`SUPABASE_URL` e `SUPABASE_ANON_KEY` estão no `index.html` (chave
pública, é assim mesmo). Admin entra por e-mail/senha do Supabase Auth;
`isAdmin = !!session`.

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
confirme horário e preço direto com ela." Toda ficha tem, no Contato, o
link "É o responsável por esta academia? Atualize a ficha ou peça a
remoção" (e-mail com assunto pronto, `linkResponsavel`). O admin marca
"Informações confirmadas pela academia" no formulário. As academias que já
estavam no guia viraram `true` na migração. Banco sem a coluna conta como
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

### `cliques`
`id, academia_id, tipo, detalhe, cep, lat, lng, origem, dispositivo, created_at`

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

### Segurança (`SQL-SEGURANCA.sql`)
- Admin é quem tem o e-mail `guiatennis1@gmail.com` no login: as regras
  de editar, apagar e ver pendentes/cliques conferem `auth.jwt() ->> 'email'`.
  O cadastro de novos usuários no Supabase Auth está **desligado**.
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

### GitHub ↔ Supabase
O Breno ligou o repositório pelo painel do Supabase (Project Settings →
Integrations → GitHub) em 28/09/2026. O site **não depende** disso: ele fala
com o banco pela chave do `index.html`. A integração só serve para aplicar
SQL guardado no repositório, e para isso precisa de:
- uma pasta `supabase/` com `config.toml` e `migrations/` (hoje não existe);
- a branch de produção certa — a principal do GitHub ainda é a
  `claude/trivago-style-court-interface-fvd0v6`, que está atrás.

Entre 15:17 e 15:32 de 28/09/2026 a integração passou do projeto de
verdade (`eultezheqwmxyakvgyjy`) para o de teste (`ohvbengbujdioxdtewsy`):
o link do "Supabase Preview" nos commits mostra qual projeto está ligado.

Para saber se o app do Supabase está vendo o repositório, confira os
"check suites" de um commit novo:
`curl -s https://api.github.com/repos/brenocoppinibc-prog/GuiaTennis/commits/<sha>/check-suites`
— aparece `supabase` ao lado de `claude` e `render` quando está ligado.
Confirmado no commit ff7a761: o "Supabase Preview" roda e sai `skipped`
("This git branch is not associated with any Supabase Branch"). Ou seja,
está ligado e só age quando se abre um PR, criando um banco de teste
(Branching). Sem a pasta `supabase/`, esse banco de teste nasce vazio.

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
  Preenchido, o site de teste (e as versões de deploy dele,
  `…--lucky-liger-1c29a3.netlify.app`, e o `localhost`) usa esse banco e
  mostra uma faixa amarela "Banco de teste". Qualquer outro endereço usa
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
  - `seed.sql` — cinco academias inventadas ("Exemplo", telefones que
    não existem): aula e locação, só locação, só aula com horário por dia
    e prazo de 36h, uma pausada e uma pendente; mais avaliações e
    cliques. Para antes de gravar se o banco tiver academia de verdade.
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
  `https://ohvbengbujdioxdtewsy.supabase.co`, chave publishable já no
  `BANCO_DE_TESTE` (28/09/2026). Estrutura e exemplos: o SQL da migração
  + `seed.sql`, colado pelo Breno no SQL Editor do projeto de teste. Login
  de admin no site de teste é o usuário do projeto de teste, não o do
  de verdade.
- **Onde se testa:** na prévia do PR (seção 7), que abre o banco de teste
  por causa do endereço `deploy-preview-N--….netlify.app`. O lucky-liger
  também abriria, mas ficou aposentado para não gastar crédito.
- **A conferir com o Breno:** se o SQL rodou no projeto de teste (a prévia
  abre com as três academias de exemplo), se o admin foi criado e se o
  cadastro de usuários está desligado lá.

### Academias do mapa aberto (pedido do Breno em 29/09/2026)
O guia tinha 8 academias e precisava de mais para atrair público (o "ovo e
a galinha" dos sites de dois lados — Yelp, TripAdvisor e Doctoralia
listaram com dados públicos e depois convidaram o dono a assumir). Regra
combinada: **nome, endereço, telefone comercial e horário, um por um, pode;
copiar do Google em massa, fotos, avaliações, textos e logo, não.**
- No painel do admin (botão da prancheta), no fim, a lista **"Academias no
  mapa que ainda não estão no guia"** aparece sozinha, do OpenStreetMap
  (licença ODbL: uso livre, até comercial, com crédito). Consulta a cidade
  de São Paulo (`MAPA_AREA`) nos mesmos 3 servidores do "o que tem por
  perto", uma vez por dia (guardada no navegador, `guiatennis_mapa_v1`).
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
verdade, com a chave pública no cabeçalho. Ela lista a home e a ficha de
cada academia publicada e em exibição — academia nova entra sozinha, sem
publicar o site. A função devolve o tipo `"*/*"` (domínio sobre `bytea`)
e põe o `Content-Type: application/xml` ela mesma: com o tipo
`"text/xml"`, o PostgREST só devolve XML puro quando o pedido diz
`Accept: text/xml`, e o Google pede `text/html, …, */*` (viria JSON).
Conferido num PostgREST 12.2.3 local. A prévia do Netlify também aponta
para o banco de verdade, então o sitemap só funciona lá depois do merge.

### Automação do banco (pedido do Breno em 28/09/2026)
Os sites grandes guardam o SQL junto com o código e deixam a esteira
aplicar. Aqui:
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
  pública, o que o site lê: as academias com as colunas do `index.html` e
  o sitemap sem pedir formato (tem de vir XML).
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
cd testes && for t in busca-e-ficha cadastro entendimento seguranca publico banco-de-teste; do NODE_PATH=$(npm root -g) node $t.js; done
```

- `check-js.sh` — tira o `<script>` e roda `node --check`. **Rodar sempre
  antes de qualquer outra coisa.**

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
- `ficha-basica.js` — aviso da ficha básica e link do responsável,
  banco sem a coluna nova, caixa do admin, lista do mapa aberto (sem
  clube, sem o que já está no guia, adicionar como pendente) e textos
  legais.
- `banco-de-teste.js` — a prévia do Netlify e o site de teste abrem o
  banco de teste; o guiatennis.com.br, o endereço do Netlify do site de
  verdade, link com `?banco=` e endereço parecido, nunca.

O `mock.js` tem as academias `a1` (só aula, estacionamento grátis, regra
separada) e `a2` (só locação, regra única). Chaves: `__admin`,
`__semDetalhe`, `__semCep`, `__colunasFechadas`, `__semPlano`,
`__semConfirmada` (a `a2` é ficha básica). `abrir({ overpass })` responde o
OpenStreetMap com um JSON fixo. O que o site
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

**Daqui não se alcança o Supabase nem o site** (a rede do ambiente
bloqueia). Diagnóstico de produção depende de print do Breno e das
consultas da seção 5.

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
3. O Breno testa na prévia e, se estiver bom, aprova o PR (merge). O
   Netlify publica a `main` no guiatennis.com.br sozinho.

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

**Emergência (Netlify fora ou sem crédito):** o zip com os 10 arquivos
acima ainda funciona — **só o `index.html` não basta**, porque ele aponta
para os ícones e a imagem de compartilhamento.

As imagens foram geradas a partir do `LOGO_SVG` com Playwright — o
script está no scratchpad (`gera-imagens.js`).

## 8. Referências de design

- **Ficha da academia:** hoteis.com — galeria, abas, cartão de contato
  fixo na direita, "Explore a região", perguntas frequentes.
- **Busca e home:** Trivago — card com oferta, mapa com pino de preço,
  filtros em gaveta, blocos da home.
- **Comparação:** TudoCelular — vagas no topo, tabela alinhada de uma
  linha por característica e ✓ verde em quem ganha cada linha.

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
- **`innerText` respeita `text-transform`**, então `.field-label` sai em
  maiúsculas nos testes. Compare com o texto transformado.
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

## 10. Histórico

```
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

- **Netlify:** branch de produção trocada para `main` pelo Breno em
  28/09/2026. Falta a branch padrão do GitHub virar `main`, conferir a
  prévia do PR #2 (academias de exemplo e faixa amarela) e aprovar. O PR #1
  (`new-session` → `trivago`) ficou velho e pode ser fechado.
- **Google Search Console:** cadastrar o site e enviar o `sitemap.xml`
  (depois do merge do PR #3, conferir que guiatennis.com.br/sitemap.xml
  abre em XML com uma linha por academia).
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
- **Segredos do banco no GitHub:** `BANCO_TESTE_URL` e `BANCO_REAL_URL`
  (seção 4, "Automação do banco"). Até lá, a esteira do banco avisa e não
  aplica nada.
- **Backup:** uma vez por mês, Table Editor → Export → CSV de cada tabela
  (o plano grátis do Supabase não guarda backup restaurável).
- Segurança das contas: 2 etapas em Supabase, Netlify, GitHub e Gmail.
  "Leaked password protection" só existe no plano pago; senha forte basta.
  **Não ligar o Captcha do Supabase** — o login do site não tem captcha e
  o admin ficaria trancado.
- Ideias no ar: posição do bloco "Por que estar no GuiaTennis"; tirar o
  contador da comparação do botão do menu.

## 12. WhatsApp Business do GuiaTennis (29/09/2026)

Número (11) 92745-6457. No site: menu (Contato), rodapé, bloco "Por que
estar no GuiaTennis" ("Prefere conversar? Chame o GuiaTennis no
WhatsApp"), link "É o responsável por esta academia?" da ficha (conversa
começada com o nome e o link da academia), dados para o Google
(`telephone`) e Termos/Privacidade. Tudo sai de `WHATSAPP_GUIA` e
`whatsappGuia(texto)`.

Imagens em `divulgacao/` (fora do ar), geradas do `LOGO_SVG` por
`divulgacao/gerar-imagens.js`: `whatsapp-perfil.png` (1080×1080, raquete
no meio para o corte redondo) e `whatsapp-capa.png` (1600×900; texto em
cima e nas laterais, porque a foto redonda cobre o meio de baixo). O
gerador busca a fonte do Google pelo `curl`, que passa pelo proxy daqui.

Textos do perfil (combinados em 29/09/2026):
- **Descrição:** "Guia de quadras e academias de tênis 🎾 / Para quem
  joga: ache as academias mais perto, compare preço, estrutura e
  avaliações e fale direto com elas — sem taxa e sem intermediário. /
  Para academias: página grátis no guia, com QR code para a recepção e
  relatório de quem viu e chamou vocês. Mande ACADEMIA para aparecer. /
  guiatennis.com.br"
- **Recado:** "Ache e compare quadras e academias de tênis perto de você
  🎾 guiatennis.com.br"
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
