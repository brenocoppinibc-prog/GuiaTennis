# GuiaTennis — contexto do projeto

Documento para abrir um chat novo sem perder nada. Quem chegar aqui deve
conseguir continuar o trabalho lendo só este arquivo e o `index.html`.

**Dono:** Breno (brenocoppini.bc@gmail.com)
**Repositório:** `brenocoppinibc-prog/GuiaTennis`
**Branch de trabalho:** `claude/new-session-qevg66` (continua a `claude/academia-card-hotel-style-mujo9b`)
**No ar:** guiatennis.com.br (Netlify) · teste atual em lucky-liger-1c29a3.netlify.app
**Instagram:** @guiatennis · **E-mail:** guiatennis1@gmail.com

> **Estado:** o site está pronto para publicar. Falta o Breno rodar o SQL
> da seção 5 e subir os arquivos no Netlify.

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
9. **Privacidade:** de uma busca fica guardado **bairro, cidade e, na
   busca por CEP, o CEP digitado** (pedido do Breno em 23/09/2026). Nunca
   o endereço digitado nem a coordenada; GPS e endereço não guardam CEP
   nenhum. Qualquer mudança
   nisso obriga a mexer na Política de Privacidade — e a data de "Última
   atualização" dos dois textos legais tem de acompanhar.
10. **SQL vai sempre em bloco pronto para copiar**, escrito na conversa —
    não só dentro de um arquivo. O Breno roda à mão no SQL Editor.
11. **Campo vazio não desenha bloco.** Academia que não preencheu
    horário, política ou acesso tem a ficha limpa, sem caixa vazia.
12. **Informação da mesma natureza mora no mesmo lugar.** Fachada,
    chegada e estacionamento ficam juntos, no mesmo formato.

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

### Mapa do `index.html` (linhas aproximadas)

| Linha | O quê |
|---|---|
| topo | `<meta>`, canonical, JSON-LD, CSS inteiro dentro de `<style>` |
| 931 | Supabase, `LOGO_SVG`, ícones, `bolaGirando` |
| 1030 | constantes `*_OPTS` (comodidade, piso, cobertura, modalidade, reposição, plano, ordenação) |
| 1093 | `acessoDe` — fachada, chegada, estacionamento |
| 1144 | `horarioDe`, `agruparDias`, `horarioLinhas`, `abertoAgora` |
| 1246 | `politicaDe` — cancelamento, igual ou separado por modalidade |
| 1341 | `mapRow` / `toRow` (banco ↔ objeto) |
| 1561 | `trackClick`, `registrarBusca` |
| 1572 | `state` |
| 1656 | geocodificação (ViaCEP, Nominatim), `haversineKm` |
| 1820 | filtros, ordenação, `getResults` |
| 1913 | `render()` |
| 2066 | SEO, canonical e JSON-LD por academia |
| 2149 | "Me ajude a decidir" (ranking da comparação) |
| 2284 | comparação: seletor, tabela alinhada, vagas |
| 2616 | QR code (folha do admin) |
| 2856 | mapa Leaflet |
| 3025 | cabeçalho, menu, blocos da home |
| 3306 | rodapé do site |
| 3484 | página de busca, filtros, card da academia |
| 3957 | "o que tem por perto" (Overpass) |
| 4242 | QR code: o gerador, escrito do zero |
| 4837 | `htAcesso` (fachada/chegada/estacionamento) e `htHorario` |
| 5031 | `htPolitica` e `blocoPolitica` |
| 5218 | `renderCourtPage` — a ficha inteira |
| 5465 | formulário de cadastro |
| 5631 | estatísticas do admin |
| 5754 | Termos de Uso e Política de Privacidade |
| 5883 | `attachEvents()` |
| 7110 | `init()` |

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
pausada, pausada_ate, nome_solicitante, contato_solicitante`

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
`id, academia_id, tipo, detalhe, cep, created_at`

`tipo`: `acesso_site`, `busca`, `visualizacao`, `whatsapp`, `site`,
`instagram`, `compartilhar`. `detalhe` e `cep` só são usados em `busca`:
`detalhe` guarda "Bairro, Cidade" e `cep` o CEP digitado ("05422-000"),
quando a busca foi por CEP. O painel do admin lista os dois.

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

## 5. ⚠️ Pendente de rodar no Supabase

O Breno **não rodou nada** até o último commit. O bloco está no arquivo
`SQL-ESTATISTICAS.sql` na raiz e, para não depender dele, repetido aqui:

```sql
alter table cliques add column if not exists detalhe text;

alter table cliques add column if not exists cep text;

alter table academias add column if not exists politica jsonb not null default '{}'::jsonb;

alter table academias add column if not exists acesso jsonb not null default '{}'::jsonb;

alter table academias add column if not exists horario jsonb not null default '{}'::jsonb;

drop view if exists public.estatisticas_publicas;

drop function if exists public.estatisticas_publicas();

create function public.estatisticas_publicas()
returns table (
  acessos_total  bigint,
  buscas_total   bigint,
  fichas_total   bigint,
  contatos_total bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*) filter (where tipo = 'acesso_site'),
    count(*) filter (where tipo = 'busca'),
    count(*) filter (where tipo = 'visualizacao'),
    count(*) filter (where tipo in ('whatsapp','site','instagram'))
  from public.cliques;
$$;

revoke all on function public.estatisticas_publicas() from public;

grant execute on function public.estatisticas_publicas() to anon, authenticated;

-- Conferir: devem vir quatro números.
-- select * from public.estatisticas_publicas();
```

Enquanto não rodar:

- o bloco de números na home não aparece;
- as buscas são gravadas sem a região e sem o CEP;
- salvar academia perde `politica`, `acesso` e `horario`, e o admin vê um
  alerta com o SQL;
- o alerta CRITICAL do Supabase continua.

Nada quebra em nenhum desses casos — foi feito para degradar.

## 6. Como testar

Os testes estão em `testes/` e não vão para o ar. Rodam sem internet: o
`harness.js` abre o `index.html` no Chromium com o Supabase trocado pelo
`mock.js`, o Leaflet por um stub e as APIs de CEP/endereço respondendo
fixo.

```
testes/check-js.sh
cd testes && for t in busca-e-ficha cadastro entendimento seguranca; do NODE_PATH=$(npm root -g) node $t.js; done
```

- `check-js.sh` — tira o `<script>` e roda `node --check`. **Rodar sempre
  antes de qualquer outra coisa.**

- `busca-e-ficha.js` — frase da home, busca registrada com região e CEP
  (e sem as colunas novas), admin não conta, política por modalidade na
  ficha, textos fixos.
- `cadastro.js` — cancelamento por modalidade, "Onde estacionar" só sem
  vaga própria, ordem dos campos, edição que não apaga horário nem regra.
- `seguranca.js` — site funciona com o banco fechado (depois do
  `SQL-SEGURANCA.sql`), com o banco antigo e com o de hoje.
- `entendimento.js` — ficha e pergunta frequente com o texto arrumado e o
  estacionamento no modelo, frase trocando de lugar, prévia no cadastro.

O `mock.js` tem as academias `a1` (só aula, estacionamento grátis, regra
separada) e `a2` (só locação, regra única). Chaves: `__admin`,
`__semDetalhe`, `__semCep`. O que o site
grava fica em `window.__db` e `window.__cliques`; o último `update` em
`window.__ultimoUpdate`.

Playwright + Chromium já estão na máquina, mas **em `npm root -g`** — por
isso o `NODE_PATH`.

## 7. Arquivos que vão para o ar

`index.html`, `404.html`, `netlify.toml`, `robots.txt`, `sitemap.xml`,
`favicon-32.png`, `favicon-192.png`, `apple-touch-icon.png`,
`og-image.png`, `google7b66589ffc303f37.html` (verificação do Search
Console).

O `GUIATENNIS-CONTEXTO.md`, o `SQL-ESTATISTICAS.sql`, o
`SQL-SEGURANCA.sql` e a pasta `testes/`
ficam no repositório mas fora do ar —
`netlify.toml` devolve 404 para eles, e eles não entram no zip.

**Como publicar:** o Breno arrasta a pasta no Netlify. Monte o zip com
esses 10 arquivos e mande; **só o `index.html` não basta**, porque ele
aponta para os ícones e a imagem de compartilhamento.

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
- **`create or replace view` só aceita colunas novas no fim.** Mudar
  nome, ordem ou tipo exige `drop` antes — o mesmo vale para
  `create or replace function` com outro `returns table`.

## 10. Histórico

```
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

- Rodar o `SQL-SEGURANCA.sql` no Supabase (o das estatísticas já foi).
- Gerar as coordenadas que faltam (botão no mapa, modo admin).
- Cadastrar o site no Google Search Console e enviar o `sitemap.xml`.
- A branch está bem à frente de
  `claude/trivago-style-court-interface-fvd0v6`. Não há PR aberto.
- Ideias que ficaram no ar: posição do bloco "Por que estar no
  GuiaTennis"; tirar o contador da comparação do botão do menu.
- Ligar "Leaked password protection" no Supabase Auth, se o plano
  permitir.
