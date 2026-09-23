# GuiaTennis — contexto do projeto

Documento para abrir um chat novo sem perder nada. Quem chegar aqui deve
conseguir continuar o trabalho lendo só este arquivo e o `index.html`.

**Dono:** Breno (brenocoppini.bc@gmail.com)
**Repositório:** `brenocoppinibc-prog/GuiaTennis`
**Branch de trabalho:** `claude/academia-card-hotel-style-mujo9b`
**No ar:** guiatennis.com.br (Netlify, publicando a raiz do repositório)
**Instagram:** @guiatennis · **E-mail:** guiatennis1@gmail.com

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
   para baixo", "atualiza sozinho", "a gente confere antes de publicar"
   fora do bloco que é para academias.
3. **Sem preço = "Não incluído" + "consulte a academia".** Nunca explicar
   o motivo de faltar o valor.
4. **Número público sempre arredondado para baixo**, com `+` na frente
   (`numeroRedondo`). O site nunca promete mais do que aconteceu.
5. **Filtro e lista de opções na mesma ordem no site inteiro.** Use
   `naOrdem()` / `rotulosNaOrdem()` com a constante `*_OPTS`, nunca a
   ordem que veio do banco.
6. **Nenhuma dependência nova.** Um arquivo, sem build, sem framework. O
   QR code foi escrito do zero justamente para não depender de serviço de
   terceiro. As únicas coisas de fora são Supabase, Leaflet/OSM, Overpass
   e as fontes do Google.
7. **Coluna nova no banco degrada com elegância:** se o `insert`/`update`
   falhar por a coluna não existir, salva sem ela e avisa o admin com o
   SQL exato (`faltaColunaNova` / `avisarSqlColunas`).
8. **Commits, comentários e nomes de função em português.**
9. **Privacidade:** de uma busca fica guardado só **bairro e cidade**.
   Nunca o CEP, o endereço digitado ou a coordenada. Qualquer mudança
   nisso obriga a mexer na Política de Privacidade.
10. **SQL vai sempre em bloco pronto para copiar**, escrito na conversa —
    não só dentro de um arquivo. O Breno roda à mão no SQL Editor do
    Supabase.

## 3. Como é feito

Página única: **`index.html`** (~356 KB) com HTML, CSS e JS num arquivo
só. Sem build, sem npm, sem framework. Abrir o arquivo já é rodar o site.

- **Render:** `render()` reescreve `#app.innerHTML` inteiro e depois
  chama `attachEvents()`. Guarda e devolve `window.scrollY` e o
  `scrollTop` das folhas, então re-renderizar não faz a tela pular.
- **Estado:** um objeto global `state` (busca, filtros, página aberta,
  folhas abertas, comparação…). `let isAdmin` fica fora dele.
- **Rotas:** `history.pushState` com `?court=ID`, `?busca=…`,
  `?comparar=1`. Páginas: `home`, `search`, `court`, `comparar`.
- **Navegador (`localStorage`):** favoritos (`guiatennis_favorites_v1`),
  comparação (`guiatennis_compare_v1`), vistas recentemente
  (`guiatennis_recentes_v1`), quem está avaliando
  (`guiatennis_visitor_v1`) e o cache do "o que tem por perto"
  (`guiatennis_perto_v1`).
- **Deploy:** Netlify pega a raiz do repo. `netlify.toml` só cuida do
  cache (HTML sem cache, PNG por uma semana).

### Mapa do `index.html`

| Onde | O quê |
|---|---|
| topo | `<meta>`, JSON-LD, CSS inteiro dentro de `<style>` |
| ~900 | Supabase, `LOGO_SVG`, ícones, `bolaGirando` |
| ~1000 | constantes `*_OPTS` (piso, cobertura, comodidade, modalidade, reposição, plano, ordenação) |
| ~1170 | `mapRow` / `toRow` (banco ↔ objeto), `loadEverything` |
| ~1300 | favoritos, comparação, `trackClick`, `registrarBusca` |
| ~1390 | `state` |
| ~1460 | geocodificação (ViaCEP, Nominatim), `haversineKm` |
| ~1640 | filtros, ordenação, `getResults` |
| ~1733 | `render()` |
| ~1840 | SEO e JSON-LD por academia |
| ~1940 | "Me ajude a decidir" (ranking da comparação) |
| ~2060 | comparação: seletor, tabela alinhada, vagas |
| ~2425 | QR code (folha do admin) |
| ~2540 | busca, mapa Leaflet |
| ~2830 | cabeçalho, menu, blocos da home |
| ~3300 | página de busca, filtros, card da academia |
| ~3740 | "o que tem por perto" (Overpass) |
| ~4060 | QR code: o gerador, escrito do zero |
| ~4430 | ficha da academia (formato hoteis.com) |
| ~5200 | formulário de cadastro |
| ~5350 | estatísticas do admin |
| ~5440 | Termos de Uso e Política de Privacidade |
| ~5615 | `attachEvents()` |
| ~6490 | busca, GPS, compartilhar, envio do cadastro |
| ~6784 | `init()` |

## 4. Banco (Supabase)

`SUPABASE_URL` e `SUPABASE_ANON_KEY` estão no `index.html` (chave
pública, é assim mesmo). Admin entra por e-mail/senha do Supabase Auth;
`isAdmin = !!session`.

### `academias`
`id, name, address, numero, complemento, bairro, cidade, endereco,
lat, lng, phone, instagram, site, price_range, price_aula,
price_locacao, amenities[], modalidades[], pisos[], cobertura[],
quadras(jsonb), photos[], source, status ('published'|'pending'),
pago, plano, politica(jsonb), acesso(jsonb), pausada, pausada_ate,
nome_solicitante, contato_solicitante`

- `politica`: `{ reposicao: "12"|"24"|"48"|"nao", foraDoPrazo: "texto" }`
- `acesso`: `{ referencia: "texto", entrada: "texto" }`

### `avaliacoes`
`id, academia_id, stars, comment, nome_autor, contato_autor, created_at`

### `cliques`
`id, academia_id, tipo, detalhe, created_at`

`tipo`: `acesso_site`, `busca`, `visualizacao`, `whatsapp`, `site`,
`instagram`, `compartilhar`. `detalhe` só é usado em `busca`, e guarda
"Bairro, Cidade".

**RLS:** a tabela é fechada para leitura — só o admin lê. Quem responde
ao visitante é a visão `estatisticas_publicas`, que devolve cinco
números somados e nada por academia.

### `estatisticas_publicas` (visão)
`acessos`, `fichas_abertas`, `contatos` (últimos 30 dias) +
`acessos_total`, `buscas_total` (desde sempre).

### ⚠️ Pendente de rodar no Supabase
O arquivo **`SQL-ESTATISTICAS.sql`** na raiz do repositório tem tudo
pronto para colar no SQL Editor: a coluna `detalhe`, a visão nova, o
`grant`, e as colunas `politica` e `acesso`. Enquanto não rodar:

- a linha de total no topo da home não aparece;
- as buscas são gravadas sem a região;
- salvar academia perde `politica`/`acesso` e o admin vê um alerta com o
  SQL.

Nada quebra em nenhum desses casos — foi feito para degradar.

## 5. Como testar

Não há teste no repositório: o harness vive no **scratchpad da sessão**
(`/tmp/claude-.../scratchpad`). Se o chat for novo, recrie assim:

- `mock.js` — finge o Supabase: 4 academias (a1–a4), avaliações, a visão
  `estatisticas_publicas` e a tabela `cliques` (guarda o que o site
  manda gravar em `window.__cliques`).
- `build-test.sh` — copia o `index.html` para `test/index.html` trocando
  o CDN do Supabase pelo mock e o Leaflet pelo local.
- `check-js.sh` — extrai o `<script>` e roda `node --check`. **Rodar
  sempre antes de qualquer outra coisa.**
- Playwright + Chromium já estão na máquina:
  `NODE_PATH=$(npm root -g) node <teste>.js`.
- Servidor local: `npx http-server -p 8899 -s test/` (o `file://` não
  serve para os testes que usam `history`).

Testes que valem manter: `interacao.js` (abas da ficha, lightbox, ir e
voltar), `poi-test.js` (Overpass não repete pedido), `shot3.js`
(screenshot + título), `cmp-test*.js` (comparação), `stats-test*.js`
(números).

## 6. Referências de design

- **Ficha da academia:** hoteis.com — galeria, abas, cartão de contato
  fixo na direita, "Explore a região", "Bom saber", perguntas frequentes.
- **Busca e home:** Trivago — card com oferta, mapa com pino de preço,
  filtros em gaveta, blocos da home.
- **Comparação:** TudoCelular — vagas no topo, tabela alinhada de uma
  linha por característica e ✓ verde em quem ganha cada linha.

## 7. O que foi feito (do mais recente para o mais antigo)

```
30c6f94 Guarda o SQL das estatísticas no repositório
18c41da Total de acessos no topo e estatística de buscas para o admin
7c67807 Busca só na aba Todas, escrita "Procure pelo nome"
021482a Comparação vira tabela alinhada, no formato de comparador de produto
528acc1 Comparação sobe para o topo e ganha coluna própria no computador
f9a2403 Sem preço passa a ser "Não incluído · consulte a academia"
01d2980 Legenda dos números fica curta: só "Nos últimos 30 dias"
592b2d7 Números da academia saem do banco e se atualizam sozinhos
c6f0f5f Recomendadas sem subtítulo e médias no bloco das academias
97bf1ac Tira a barra de navegação do rodapé; navegação fica só no menu
667ac1b Tira "clubes" dos textos: o guia é de quadras e academias
02cbe92 Menu de três barras e página inicial no padrão do Trivago
8eb38cc Abas de Início, Buscar e Comparar, com busca dentro da comparação
4053ba2 Ordem única das opções, Estrutura, e como chegar na academia
1f52106 QR code do site inteiro no painel admin
98925ce QR code passa a usar o logo de verdade, centralizado
f159ef5 Preço do card segue a busca, e QR code de cada academia no admin
756a819 Tira as comodidades repetidas nos cartões de preço
4516a3c Preço deixa de ser obrigatório e vira "Sob consulta"
311f743 Cancelamento: a hora vira o prazo da reposição, e mais fácil de ler
fe8eb44 "O que tem por perto" deixa de ficar pendurado no carregando
513d377 Aba de cancelamento, menu de ordenar arrumado e bola em toda a espera
056b135 Bola de tênis na espera, cards maiores e menos repetição na ficha
f16ee52 "Explore a região" mostra o que tem em volta da academia
c3512bf Ficha da academia no formato da página de hotel
b972d53 Planos básico, completo e premium no painel admin
d0dcf9b Contato único para aula e locação, e animação explicando a busca
6bd8c27 Bola de tênis de verdade, só o menor valor no card e duas seções novas
2018b7d Página da academia no formato do hoteis.com, com o preço desembaralhado
c9ade31 Configuração de publicação do Netlify
```

## 8. Armadilhas já pisadas (não repetir)

- **`position: sticky` em item de grid** só gruda dentro da própria área
  do grid. Em coluna única, vira nada. A barra de vagas da comparação
  ficou fora do `.cmp-layout` por causa disso.
- **Re-render mata o scroll.** Quando só um pedaço muda (o "o que tem por
  perto"), atualize o slot (`#ht-poi-slot`) em vez de chamar `render()`.
- **Overpass é lento.** São 3 espelhos em paralelo com `Promise.any` e 12
  segundos de orçamento total, consulta por `bbox`. Sequencial dava dois
  minutos.
- **Android força modo escuro** e destroi a paleta. Resolvido com
  `<meta name="color-scheme" content="light">` e `color-scheme: light`.
- **`lat`/`lng` vêm como texto do banco** às vezes. `numeroOuNulo()`
  normaliza — sem isso o mapa e a distância falham em silêncio.
- **QR code:** os bits de formato são linha/coluna trocados nas duas
  cópias, e o polinômio gerador de Reed-Solomon é montado em ordem
  decrescente. Errar isso gera um código que parece certo e não lê.
- **Botão de menu:** `.menu-btn > span:not(.menu-conta)` — sem o `:not`,
  o contador da comparação vira uma barrinha verde.

## 9. Em aberto

- Rodar o `SQL-ESTATISTICAS.sql` no Supabase.
- A branch está bem à frente de
  `claude/trivago-style-court-interface-fvd0v6`. Não há PR aberto.
- Ideias que ficaram no ar: mexer na posição do bloco "Por que estar no
  GuiaTennis"; tirar o contador da comparação do botão do menu.
