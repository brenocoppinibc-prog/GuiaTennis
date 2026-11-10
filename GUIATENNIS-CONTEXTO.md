# GuiaTennis — contexto do projeto

Versão enxuta (28/10/2026). Basta ler este arquivo para continuar o
trabalho. O texto antigo completo (regras 1 a 167, resumos de cada chat,
todas as seções) está em `historico/CONTEXTO-completo-ate-28-10-2026.md`;
a descrição completa do PR #5 (seções 1 a 73, passos 1 a 99), em
`historico/PR5-descricao-completa-ate-28-10-2026.md`. **Não ler esses dois
inteiros:** procurar com `grep` só quando precisar de um detalhe
("regra 133", "seção 4" e afins nos comentários do código e do SQL apontam
para o histórico).

**Atualizado em:** 10/11/2026 (regra 232)

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
5. **Descrição do PR (curta):** desde 02/11, só as regras e os passos
   novos (o detalhe de 168 a 195 e os passos 1 a 29 estão em
   `historico/PR5-descricao-28-10-a-02-11-2026.md`; o de 193 a 211 e os passos
   27 a 41, em `historico/PR5-descricao-02-11-a-05-11-2026.md`); uma linha por regra
   nova, o SQL novo e um passo em "Para testar". Salvar com
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
  progresso ("cara de IA"), com a cara do GuiaTennis. Exceção pedida: a
  barra do tempo do aviso rápido (regra 202).
- **Avisos flutuantes (regra 202):** a confirmação rápida (`mostrarPush`:
  troca de academia, comparação, "Conta criada!"…) fica 5 segundos, com a
  barra dourada embaixo; a dica de ajuda ou de venda (`mostrarDica`), o balão
  da conta e o convite das academias chamadas só saem pelo ✕ (ou pelo toque
  no atalho). Nenhum cobre outro (`empilharAvisos`, regra 203).
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
  **dois campos obrigatórios**; excluir num lado exclui nos dois. **Conta
  nova pelo Parceiros (regra 212):** e-mail novo abre o cadastro normal (a
  tela do site dos jogadores) e o código; depois o Parceiros pede só
  tratamento, cargo e WhatsApp e mostra o pedido da academia. O
  `criar_minha_conta` do banco ficou sem uso no site.
- **Pessoas da academia (regra 180):** pode haver **vários responsáveis
  principais** (podem tudo; o principal torna alguém da equipe principal;
  só o GuiaTennis tira um principal, ou ele mesmo deixa de ser, havendo
  outro). A **equipe** faz só as **funções** que o principal liga em Acessos
  (`academia_vinculos.funcoes`, `posso()` no site e no banco; o que não
  está liberado **não aparece**, regra 213): Editar a
  ficha, Responder avaliações, Promoções e leilão, Pagamentos (quem entra
  começa com as três primeiras). Aba **Pagamentos**: saldo, compra e cada
  compra com quem comprou; a cada compra paga, e-mail aos principais.
  **Acesso por convite (regra 187):** sem senha provisória; o admin
  (painel, "Convidar pelo e-mail") ou o principal (Acessos) convida pelo
  e-mail (`convites_de_acesso`); a pessoa cria a conta com esse e-mail e a
  própria senha e, ao confirmar o e-mail, o gatilho `convites_ao_confirmar`
  liga a academia. O convite conta no limite do plano e pode ser cancelado.
  Na lista de Acessos, o que cada pessoa pode fazer (funções, "Remover",
  "Tornar responsável principal", "Cancelar convite") só aparece ao tocar
  nela (regra 188, `pessoaNaLista`).
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
  por semana, **quantos chamaram nos últimos 30 dias**, regra 196), **Premium** (10 pessoas, foto de cada opção do catálogo,
  números da ficha, selo dourado, até 2 "Patrocinado" no topo da busca a
  até 10 km e de novo no lugar delas sem a marcação, primeiro nas
  recomendadas, leilão de promoções por e-mail, a semana da promoção 20%
  menos). Textos das promoções **curtos e resumidos** (`PROMO_*_MAX`,
  `LANCE_MENSAGEM_MAX`): título até 30 letras; detalhes da ficha até 150;
  mensagem do e-mail do leilão até 300, com contador. O plano aparece num lugar só (página Plano); fora dela,
  "Disponível no plano …". Posição paga sempre escrita "Patrocinado"
  (CDC, art. 36). "Melhores avaliadas" seguem só a nota.
- **Quem administra a academia:** academia nova de conta com e-mail
  confirmado entra no ar na hora; academia do Guia sem responsável passa à
  conta na hora (com a declaração); com responsável, o pedido vai a ele;
  "Contestar" vira disputa com código ao WhatsApp antigo da academia (à
  mão pelo admin, em até 1 dia útil, até a Meta liberar o envio
  automático). **O WhatsApp precisa receber o código; senão, não
  finaliza** (regra 186: sem "Sem como receber?" nem documento no site).
- **Veracidade:** o WhatsApp novo da ficha só entra depois do código **e**
  da aprovação do admin; a ficha pública nunca diz "em confirmação" (a
  academia vê "precisa de confirmação"). "Informar um problema" na ficha;
  2 contas dizendo que o WhatsApp não é da academia tiram o botão. A
  academia que avisa que fechou sai do site na hora; "Fechou" guarda como
  cadastro inativo, que pode reabrir.
- **Ficha** (ordem da regra 189): capa (sem os pontinhos), nome no meio,
  destaques, Estrutura, **Sobre** (Premium: o texto da própria academia,
  até 750 letras, sem telefone, link ou preço, `academias.sobre`; Completo: o
  resumo completo do site, até 750; Básico: o resumo curto; regra 204), Opções para jogar, **Explore a região**,
  Contato, Avaliações, Outras academias por perto, Horário, Cancelamento,
  Perguntas, e no fim "Confirmada pela academia", "É o responsável?" e
  "Algo errado nesta ficha?"). Fotos só na capa e nos cartões das opções.
  Os cartões das opções ficam **em grade que desce**, dois por linha no
  celular, como os quartos do hoteis.com (três no computador), na ficha e
  na prévia do cadastro; sem rolar para o lado. No alto de "Opções para
  jogar" (regra 189, `escolhaDaFicha`), um **cartão por modalidade**
  (Aulas para adultos, Aulas para crianças, Locação de quadra; só o que a
  academia tem, com o resumo; tocar de novo volta a todas) e, embaixo, os
  **formatos sublinhados** como as abas da ficha (aulas: individual, dupla,
  grupo; locação: avulsa, mensal). A aula avulsa e a mensal **aparecem nos
  cartões** (cada uma com o seu valor), mas **não se escolhem** (regra 190).
  Nenhuma escolha leva a lista vazia; nada fala de quantidade.
  **Catálogo** só com modalidade e valor. No cadastro, a parte
  **Modalidades** (Aulas e/ou Locação de quadra; pelo menos uma, obrigatória
  também na edição; o admin segue só com o nome) abre as partes de cada uma, que só aparecem se escolhidas
  (`passoVisivel`; os índices continuam os de `REG_PASSOS`): **Aulas** (para
  quem: adultos e/ou crianças, as crianças em faixas de idade de 3 a 17
  anos, uma para cada turma, com "Adicionar faixa de idade" > formatos
  individual, dupla, grupo > um cartão por formato com os valores **avulso
  e mensal, os dois por aula** (a mensal é o valor de cada aula no plano;
  regra 190 desfez o "um valor só" da 189; a aula gravada com `cobranca: ""`
  e valor vale como avulsa) e a foto; em branco não entra no catálogo, 0 ou - = "Sob consulta", regra 206) e **Locação** (avulsa e/ou
  mensal, cada uma com o valor e a foto; **as duas por hora**, a mensal é o
  valor de cada hora no plano). Nada no catálogo é "por mês". Cada valor é um número ou um
  intervalo ("150 a 200", gravado "150-200", `precoDoCatalogo`), com centavos
na vírgula ("150,50", regra 213: `numerosDoValor`, `numeroDoPreco`; espaço
sozinho vira "-", "Sob consulta"), numa linha
  com o nome à esquerda; o exemplo fica **só dentro do campo**, em intervalo
  ("ex.: 150 a 200", `EXEMPLOS_DE_VALOR`), nada escrito embaixo. Foto no Premium. Na ficha, as
  aulas das crianças são "Aula infantil …", com a idade, e têm o filtro
  "Crianças". Corte das fotos como o "Cortar" do Instagram.
- **Lista e mapa da busca:** no cartão da lista, o "a partir de" fica em
  cima da modalidade e do preço (regra 191). No mapa (regra 192), os
  **cartões deitados no rodapé, em carrossel**, como trivago, hoteis.com e
  Booking. O cartão (`cartaoDoMapa`, regra 195, no jeito do hoteis.com):
  à esquerda, **uma foto só** ("Patrocinado" em cima dela); à direita,
  nome, endereço, as comodidades com o ✓ da lista (`selos`), a nota, o "a
  partir de" com os preços, "Ver academia" e, logo embaixo, "Falar no
  WhatsApp" (sem diferencial: "tire isso"). Deslizar
  para o lado acende o pino da seguinte, tocar no pino leva ao cartão dela,
  tocar no mapa fecha. Sem o "Como chegar" no mapa (fica na ficha).
- **Acompanhamento do jogador (regra 193):** a conta com o e-mail
  confirmado que chama uma academia pelo WhatsApp (`registrar_chamada`) recebe
  no dia seguinte, das 10h às 21h, o e-mail "Você marcou na …?" (Marquei
  aula, Marquei locação, Ainda não). O link `/?marquei=<chave>&r=…` abre a
  folha `renderMarquei` sem entrar: o dia e a hora e o **WhatsApp opcional**
  com o aceite (por enquanto, só e-mail; o WhatsApp entra quando a Meta
  liberar). O site guarda junto o texto da ficha (endereço, chegada,
  estacionamento, cancelamento e reposição, `instrucoesDoAcompanhamento`; no
  Básico, sem o que a ficha não mostra). Duas horas antes, o e-mail com tudo
  isso, "Como chegar", o WhatsApp da academia e "Tirar o lembrete"; três
  horas depois, "Como foi?" (não sai para quem já avaliou). Minha conta:
  "Seus horários" (com "Não vou mais"), o WhatsApp opcional e o aviso
  "Depois de chamar uma academia…" (começa ligado). Tudo apagado em 60
  dias. Relógio `guiatennis-acompanhamento` a cada 10 minutos
  (`rodar_acompanhamentos`).
- **"Ver no mapa"** da ficha abre o mapa da busca do GuiaTennis já na
  academia (`verNoMapaDoGuia`); o **"Como chegar"** fica no cartão do mapa
  e na localização da ficha, como link direto, sem tela de opções
  (`linkComoChegar`): no Android, "geo:" (o celular pergunta com qual
  aplicativo abrir); no iPhone, o Mapas; no computador, a rota no Google
  Maps numa aba nova.
- **Busca** "bairro, cidade" fica na cidade digitada. Cinco buscas
  seguidas na mesma aba sem abrir ficha nem ir a outra página: aviso "Está
  precisando de ajuda para encontrar as quadras mais perto?", com "Usar minha
  localização" e o chat de ajuda (conta no `sessionStorage`, nunca IP;
  usado ou fechado, não volta na aba). Telas de código com
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
- **Último SQL:** `20261110130000_comprador_no_pagamento` (89 arquivos na pasta). Antes dele, `20261110120000_dados_para_a_nota`. O `20261105120000` (a mesma coisa com o Completo vendo quantos guardaram) rodou só no banco de teste e saiu da pasta. Os `20261029120000_textos_das_promocoes` (regra 176) e `20261029150000_textos_curtos_das_promocoes` (título 40, regra 177) rodaram só no banco de teste e saíram da pasta.
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
  segundo plano). Último resultado (04/11/2026, regra 206): **2.289
  verificações** nos 77 arquivos do navegador, mais `onde.mjs`, `pagamento.mjs` e
  `cnpj.mjs`, nenhuma falha. O `falhas.txt` sempre aparece na lista (força
  erros de propósito).
- **Banco local** para o `testes/banco-emails.py` (**869 conferências**,
  nenhuma falha, 10/11/2026): Postgres 16 em `/var/lib/postgresql/gt`. Ele cai entre um
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
- A biblioteca do Supabase tem **versão fixa** (`supabase-js@2.118.0`, regra
  217): o "@2" sem versão custava um redirecionamento a cada abertura. Subir de
  versão só de propósito, testando na prévia.
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
- O "Banco de dados" do PR às vezes não roda sozinho depois de um push com
  SQL novo (05/11: o da regra 209 não rodou). Conferir em Actions e, se faltar,
  rodar à mão no banco de teste (`banco.yml`, `destino: teste`, na branch do PR).

## 9. Estado atual e pendências (09/11/2026)

O PR #5 está **verde e sem conflito**, com tudo até a **regra 202** (os
avisos por e-mail do Parceiros um por um, SQL
`20261104120000_avisos_um_por_um`; o aviso rápido de 5 segundos com a barra
do tempo e as dicas e convites que só saem pelo ✕; regra 203, nenhum aviso
cobre outro; regra 204, o "Sobre a academia" por plano: no Premium o texto
da academia, no Completo o resumo completo do site, até 750 letras; regra
205, a parte "Apresentação" antes de Revisar; regra 206, valor em branco
não entra no catálogo e 0 ou - é "Sob consulta"; regra 207, "Sair sem
salvar?" só com mudança de verdade; regra 208, as academias no WhatsApp: a
lista, falar com várias e salvar os contatos; regra 209, esses cliques contam
para a academia e a mensagem de cada opção vem quase pronta; regra 210, o Completo
fica só com acessos e contatos; SQL `20261105130000_lista_e_contato_salvo`;
regra 211, o painel do admin mais espaçoso e com o menu em grupos; regra 212,
a conta nova pelo Parceiros começa pelo cadastro normal e depois mostra o
pedido da academia; regra 213, o que a função não libera não aparece, os
textos novos dos valores de Aulas e Locação e os centavos com vírgula; regra 214,
avaliação e resposta aparecem meio cinza com "Publicando…" enquanto salvam; regra 215, a bola girando mais realista e em
todo carregamento; regra 216, a Apresentação do cadastro mais enxuta; regra 217, o site mais
rápido: a lista de 20 em 20, fotos só perto da tela, biblioteca do banco com
versão fixa; regra 218, o Pixel da Meta com o aviso de cookies, ligado em 06/11; regra 219,
o catálogo das academias para os anúncios da Meta e a correspondência
controlada; regra 220, a tag do Google Ads atrás do mesmo aviso; regra 221, a disputa decidida pelo admin, SQL `20261109120000_disputa_decidida_pelo_admin`; regra 222, o WhatsApp no ar "em confirmação pelo GuiaTennis" e a disputa com dois códigos, SQL `20261109130000_whatsapp_em_confirmacao_e_disputa_com_dois_codigos`; regra 223, contestar o acesso de outra pessoa com um pré-questionário, SQL `20261109140000_contestar_acesso`; regra 224, os jogadores denunciam a conta de quem escreveu a avaliação, SQL `20261109150000_denunciar_conta`; regra 225, o questionário da contestação de acesso em duas partes e a resposta da pessoa contestada, SQL `20261109160000_contestar_acesso_questionario`; regra 226, a tag do Pinterest atrás do mesmo aviso de cookies; regra 227, a meta de verificação do domínio no Pinterest; regra 228, o cartão da avaliação na ficha com o nome em cima e a nota à direita; regra 229, o site mais rápido: a Netlify monta o site com o código num arquivo compactado e guardado pelo navegador; regra 231, os dados para a nota fiscal na compra e em Pagamentos e "Compras e notas" no painel do admin, SQL `20261110120000_dados_para_a_nota`; regra 232, a compra numa tela só, de créditos e do plano, começando pelos dados do comprador, e o CPF ou CNPJ indo ao Mercado Pago, SQL `20261110130000_comprador_no_pagamento`). De 28/10 a 02/11 entraram as regras 168 a 200 (uma linha
de cada na seção 10; o detalhe de 168 a 195 e os passos 1 a 29 em
`historico/PR5-descricao-28-10-a-02-11-2026.md`). As mais recentes: o
catálogo com aula avulsa e mensal (190); a lista com o "a partir de" em
cima e o cartão do mapa no jeito do hoteis.com, uma foto só, comodidades,
"Ver academia" e "Falar no WhatsApp" (191 a 195); o **acompanhamento do
jogador** por e-mail, com o WhatsApp opcional (193, SQL
`20261101120000_acompanhamento`); o Completo vê quantos chamaram (196, SQL
`20261102120000_contatos_no_completo`); e o "Me ajude a decidir" passo a
passo, em telas com o cabeçalho, a mini prévia da academia e a volta da
ficha para a escolha (197 a 200).

**Testes:** a bateria completa de 04/11 (regra 206) deu **2.289
verificações, nenhuma falha**; o `banco-emails.py` deu 869 no banco local
(10/11, regra 231). As regras 207 a 211 rodaram só os testes afetados, todos verdes (a
lista está na descrição do PR); a 212 também (`cadastro-normal-parceiros.js`
novo, `parceiros.js`, `percurso.js`, `voltar.js`, `senha.js`, `rascunho.js`) e a 213 a 220 (lista na descrição do PR). Bateria completa de 09/11 (até a regra 230): 2.369 verificações, as 4 falhas corrigidas.

**Modo de economia (02/11):** o Breno pediu para gastar menos limite:
rodar só os testes afetados, mandar print só se ele pedir, respostas curtas
e a descrição do PR curta (só as regras e os passos novos; seção 2).

**Chat trocado em 09/11/2026 (à noite):** o chat novo volta a acompanhar o
PR #5 (o anterior deixou de acompanhar e cancelou a conferência agendada;
inscrever com `subscribe_pr_activity`). Último commit: `f3e0a1d` (regra 229
corrigida; a 230 é o texto do aviso de cookies). O PR está verde e a prévia
no ar. **A Netlify agora monta o site** (regra 229: `scripts/montar.mjs`,
`publish = "_site"`): continuar editando e testando o `index.html`; para ver o
site montado, `npm install` (uma vez) e `node scripts/montar.mjs`. **O "Banco de
dados" não roda sozinho com os pushes do Claude** (desde 05/11): depois de cada
SQL novo, disparar à mão (`banco.yml`, `destino: teste`, na branch do PR) e
conferir em Actions; em 09/11 rodou para os SQLs de 221 a 225 (o mais novo,
`20261109160000_contestar_acesso_questionario`). A descrição do PR está em dia
até a regra 230 (passos 42 a 60); a bateria completa de 09/11 deu 2.369
verificações, com as 4 falhas corrigidas. Nada em aberto da conversa: os pedidos
de 05/11 a 09/11 (regras 212 a 230) estão todos na prévia.
Marketing combinado (detalhe nas regras 218 a 220, 226, 227 e no item 7a): Pixel
da Meta, tag do Google e tag do Pinterest (`2614435484797`) atrás do aviso de
cookies; catálogos em `/catalogo-meta.csv`, `/catalogo-google.csv` e
`/catalogo.csv?para=…`; a campanha do Google Ads (montada pelo Breno) e a do
Pinterest só rodam depois do "pode subir"; depois do merge, no Pinterest,
"Verificar" o domínio (a meta `p:domain_verify` já está no site) e criar o
catálogo. TikTok: só quando o Breno mandar o número da tag. O número do chip
novo para os códigos do WhatsApp não está anotado (o Breno não informou).
Layouts da ficha em estudo (A Editorial, B Quadra, C Placar) no quadro
https://claude.ai/artifact/GoyAvA7iTqwc2v3JGshpL2.

**Pendências do Breno:**
1. Testar na prévia o que entrou de 26/10 a 01/11 (passos 1
   a 29 da descrição do PR: veracidade, ficha reorganizada, aula avulsa e
   mensal nos cartões (regra 190), "Sobre" da academia, escolha das opções,
   convite por e-mail, Acessos, promoções, funções e Pagamentos, ajuda
   depois de cinco buscas) e dizer "pode subir".
2. Ligar o Mercado Pago na Netlify (variáveis da seção 5) depois de testar
   o pagamento de teste na prévia.
3. Definir os preços dos planos e o preço da semana da promoção na ficha
   (hoje R$ 0, o admin muda em Leilões). Sugerido na conversa de 29/10
   (comparando com o trivago e a Shopify): preço à vista, primeiro mês
   grátis no Completo e no Premium, plano anual com desconto; não cobrar
   por clique por enquanto. A nota sai por academia; o imposto é de quem
   emite (confirmar com o contador o código do serviço e as retenções).
   **Nota fiscal (decidido em 10/11/2026):** o CNPJ está sendo aberto pela
   Contabilizei (SLU, Simples Nacional, CNAE 6319-4/00). O Mercado Pago só
   recebe; a NFS-e sai pelo Emissor Nacional (gov.br/nfse, obrigatório para
   o Simples desde 01/11/2026). **No começo, o Breno emite à mão** (de graça),
   uma nota por compra paga, para o CNPJ da academia, com o valor cheio.
   Se o volume crescer: ligar o site direto na API gratuita do Emissor
   Nacional (só o certificado A1, guardado como segredo na Netlify), ao
   confirmar o pagamento, com a nota na aba Pagamentos e por e-mail (como
   Google Ads, Shopify e Booking). Serviço pago (NFE.io a partir de R$ 190/mês)
   só se ele não quiser manutenção. Perguntas para a Contabilizei: se o plano
   inclui emissor, o código do serviço e se a nota dos créditos sai no
   pagamento ou no uso.
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
7a. **Pixel da Meta ligado (06/11/2026):** `META_PIXEL.id = "2565402353955968"`
   (o Pixel "GuiaTennis" do Gerenciador de Eventos). Os testes não veem o aviso
   de cookies (o `harness.js` grava "recusou"; `abrir({ cookies: true })` mostra).
   Depois do merge: verificar o domínio guiatennis.com.br no Meta Business,
   configurar o "Contact" como conversão e, no Gerenciador de Comércio, criar o
   catálogo com o feed programado https://guiatennis.com.br/catalogo-meta.csv
   (todo dia), ligado ao Pixel. A "Correspondência avançada automática" do
   Pixel fica **desligada** na Meta (o site manda só o e-mail do jogador).
   **Google Ads (08/11):** tag `AW-18561506462` ligada (`GOOGLE_ADS`), com a
   conversão "Chamou uma academia" (`rotuloContato: "uUlSCMKeibUdEJ656JJF"`,
   09/11; categoria Contato, valor R$ 1, contagem "Uma").
   Campanha criada por ele (palavras: aula de tênis, aluguel de quadra…; só
   São Paulo; idioma português), para rodar depois do "pode subir".
   O Gerenciador de Tags (GTM-WSWBDLTM) **não** entra no site (08/11, decisão
   do Breno): contaria tudo duas vezes com a tag direta.
8. Acompanhamento do jogador: o lembrete pelo WhatsApp entra quando a Meta
   liberar o envio automático (mesma espera do CNPJ do item 5); o número e
   o aceite já ficam guardados.

**Próximo número:** regra 233.

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
- 170 (29/10) Parte "Modalidades" antes das Aulas e da Locação, que só
  aparecem se escolhidas (sai o quadrado "não oferece locação"); "Ver no
  mapa" abre o mapa do GuiaTennis na academia, com "Como chegar" no cartão.
  Sem SQL. Teste novo: `ver-no-mapa.js`.
- 171 (29/10) Pelo menos uma modalidade (Aulas ou Locação) é obrigatória,
  também na edição ("Continuar" e salvar não passam); o admin segue só com
  o nome. Teste: `cadastro.js`.
- 172 (29/10) Exemplo em cada valor do catálogo ("ex.: 180") e, embaixo
  de cada cartão, como fica na ficha (o exemplo ou o valor escrito); exemplo
  da idade das crianças. Teste: `catalogo.js`.
- 173 (29/10) "Como chegar" sem a tela de Google Maps e Waze: link direto
  que o celular resolve (Android "geo:" com a escolha do aplicativo;
  iPhone, o Mapas; computador, Google Maps). Teste: `ver-no-mapa.js`.
- 174 (29/10) Perguntas do caminho num tom formal sem exagero: "Para quem
  são as aulas que vocês oferecem?", "Quais formatos de aula vocês
  oferecem?" e "Como vocês alugam a quadra?". Teste: `catalogo.js`.
- 175 (29/10) Valor do catálogo em intervalo: o exemplo só dentro do campo
  ("ex.: 150 a 200"), sem o "Exemplo:"/"Na ficha:" embaixo; espaço, traço
  ou vírgula viram " a " (teclado `decimal`, com a vírgula no iPhone);
  grava "150-200", o menor primeiro; Avulsa e Mensal numa linha cada; o
  chat do Parceiros responde "intervalo de preço". Testes: `catalogo.js`,
  `chat-parceiros.js`.
- 176 (29/10) Limite nos textos das promoções, com contador nos campos da
  ficha (os limites maiores, 500 e 1.000, foram trocados pela regra 177).
- 177 (29/10) "Algo pequeno e resumido": detalhes da ficha de 280 para
  150; mensagem do e-mail do leilão de 500 para 300 (como o texto dos
  anúncios da Meta). Só para o que for salvo depois: a tabela segue com o
  teto antigo. Testes: `promocoes.js`, `promocoes-por-email.js`,
  `banco-emails.py`.
- 178 (29/10) "Títulos também está muito grande": título da promoção (ficha
  e leilão) de 60 para 30 letras, como o do Google Ads. SQL
  `20261029170000_textos_curtos_das_promocoes` (com a 177).
- 179 (29/10) Leilão, etapa do lance: a explicação em um parágrafo por
  regra (teto; se ganhar; se ninguém mais der lance; se não ganhar); sai "Os
  créditos garantem o lance: só saem se você ganhar." (o recado dos créditos
  só aparece quando faltam). Sem SQL. Teste: `promocoes-por-email.js`.
- 180 (29/10) Funções da equipe (Editar a ficha, Responder avaliações,
  Promoções e leilão, Pagamentos) ligadas pelo principal em Acessos; vários
  responsáveis principais ("Tornar responsável principal", "Deixar de ser");
  menu e páginas conforme a função; aba Pagamentos com quem comprou; e-mail
  aos principais a cada compra paga e quando alguém vira principal. Termos e
  Privacidade em 29/10. SQL `20261029190000_funcoes_e_pagamentos`. Testes:
  `funcoes-da-equipe.js` (novo), `banco-emails.py`.
- 181 (30/10) Cinco buscas seguidas na aba sem abrir ficha nem navegar:
  aviso "Está precisando de ajuda para encontrar as quadras mais perto?",
  com "Usar minha localização" (o melhor caminho) e "Falar com o chat de
  ajuda". Conta na aba, sem IP (Privacidade em 30/10). Sem SQL. Teste:
  `ajuda-na-busca.js` (novo).
- 182 (30/10) "Outra faixa de idade" vira "Adicionar faixa de idade"; a
  mensal da aula é por aula (o valor de cada aula no plano): cadastro com
  "por aula" nas duas e exemplos da mensal abaixo da avulsa; ficha, busca,
  comparação, perguntas e Google com "por aula" ("/aula"); rótulo curto e
  "Sobre" com "no plano mensal". Sem SQL. Teste: `catalogo.js`.
- 183 (30/10) "Locação avulsa e mensal valores por hora": a locação mensal
  é o valor de cada hora no plano ("por hora", "/h", rótulo "no plano
  mensal"); botões "Avulsa" e "Mensal"; exemplo da mensal "80 a 120";
  Termos (o que o valor paga) e chat dos jogadores e do Parceiros sem "por
  mês". Sem SQL. Testes: `catalogo.js`, `chat-parceiros.js`.
- 184 (30/10) Cartões do catálogo na ficha (e na prévia) em grade que
  desce, dois por linha no celular, como os quartos do hoteis.com (print
  do Breno; três no computador; botão de 48px), sem rolar para o lado; no cancelamento, título em cima do
  campo do que acontece fora do prazo (`tituloForaDoPrazo`: "O que acontece
  com a aula se a pessoa cancelar com menos de 24h de antecedência? Há
  reposição?"); "Pular" vira "Continuar" assim que a parte ganha algo (a
  observação do horário também conta). Sem SQL. Testes: `cadastro.js`,
  `ficha-hoteis.js`.
- 185 (30/10) "Escolha o que você quer" vira "Opções para jogar"; no lugar
  da caixa "A academia oferece" e dos filtros em botões, duas caixas que
  abrem a lista do aparelho: Modalidade e, embaixo, o formato que segue a
  de cima e só oferece o que existe (sem lista vazia, sem "não tem"). Sem
  SQL. Testes: `catalogo.js`, `ficha-hoteis.js`, `previa-da-ficha.js`.
- 186 (30/10) Sai o "Sem como receber? Fale com o GuiaTennis ›" (troca do
  WhatsApp da ficha) e o "pode pedir um documento" (contestar, tela do
  código, Ajuda e chat): "o WhatsApp precisa receber, senão não finaliza".
  Sem SQL. Testes: `codigo-so-em-disputa.js`, `contestar-passo-a-passo.js`.
- 187 (30/10) Acesso por convite no e-mail, sem senha provisória (como a
  Shopify e o Google Business Profile): o admin convida a academia no
  painel e o principal convida a equipe em Acessos; a pessoa cria a conta
  com o e-mail e a própria senha e, com o e-mail confirmado, a academia já
  está na conta. E-mail "Convite para a … no GuiaTennis Parceiros". Termos
  e Privacidade. SQL `20261030120000_convite_por_email`. Testes:
  `parceiros.js`, `acesso-academia.js` (o banco local não existe neste
  contêiner: o SQL foi conferido pelo Actions).
- 188 (30/10) Acessos: as funções e as ações de cada pessoa ficam
  escondidas até tocar nela (a linha abre e fecha, com a seta), como a
  equipe da Shopify e os usuários do Google Business Profile. Sem SQL.
  Testes: `funcoes-da-equipe.js`, `parceiros.js`.
- 189 (30/10) Ficha reorganizada: sem os pontinhos da capa; "Sobre" logo
  depois da Estrutura, com o texto da academia (cadastro, parte Quadras:
  "O que a academia tem de diferente", até 750 letras como o Google, sem
  telefone, link ou preço); "Explore a região" logo depois das opções;
  escolha das opções em cartões por modalidade + formatos sublinhados (sai
  a cara do hoteis.com); aulas sem avulsa/mensal (só a locação), no
  cadastro, na ficha, nas perguntas, nos Termos e no chat (desfeito pela
  190). SQL `20261030130000_sobre_da_academia`. Testes: `catalogo.js`,
  `ficha-hoteis.js`, `cadastro.js`.
- 190 (01/11) "Aulas avulsas ou mensais devem sim aparecerem na ficha, só
  não selecionar nas opções": a aula volta a ter avulsa e mensal (as duas
  por aula) no cadastro, nos cartões da ficha, no "Sobre", nas perguntas, no
  Google, nos Termos (01/11) e no chat; em "Opções para jogar", as aulas
  seguem só com individual, dupla e grupo ("Individual" mostra a avulsa e a
  mensal), e só a locação escolhe avulsa ou mensal. A aula gravada na 189
  com um valor só vale como avulsa. Sem SQL. Teste: `catalogo.js`.
- 191 (01/11) Lista: "a partir de" em cima da modalidade e do preço (sem
  preço, "Sob consulta" e "fale com a academia" como antes). Mapa: o pino
  abre o cartão completo da lista (fotos, nota, endereço, estrutura,
  preços, "Ver academia", WhatsApp, favoritar, compartilhar) mais o "Como
  chegar", com o ✕ num círculo em cima; rola por dentro se não couber; o
  clique no WhatsApp conta uma vez (`ligarRastreio`). Sem SQL. Teste:
  `ver-no-mapa.js`. (O cartão do mapa foi trocado pela 192.)
- 192 (01/11) "Tire o como chegar da prévia do mapa e deixe a apresentação
  mais de lado, inferior da tela como trivago, hoteis.com, booking": cartões
  deitados no rodapé do mapa, em carrossel (o próximo aparece na borda),
  sincronizados com os pinos; tocar no mapa fecha; sem o "Como chegar" e sem
  o ✕. Sem SQL. Teste: `ver-no-mapa.js`.
- 193 (01/11) Acompanhamento do jogador depois de chamar uma academia
  ("sim pode fazer assim por enquanto e deixar o whatsapp opcional"): e-mail
  "Você marcou?" no dia seguinte, folha do link (`?marquei=`), lembrete 2h
  antes com como chegar, estacionamento, cancelamento e reposição, "Como
  foi?" depois; WhatsApp opcional com o aceite; "Seus horários" e o aviso em
  Minha conta; Termos e Privacidade (01/11); chat ("lembrete"). SQL
  `20261101120000_acompanhamento`. Testes: `acompanhamento.js` (novo),
  `banco-emails.py`.
- 194 (02/11) Cartões do mapa: botão "Ver academia" (44px, como o da lista)
  e, embaixo, de ponta a ponta, "Falar no WhatsApp · quadra coberta", com o
  diferencial curto da academia (câmera, coberta, estacionamento grátis,
  loja, empresta raquete, vestiário…; sem nada, a modalidade). Sem SQL.
  Teste: `ver-no-mapa.js`. (O diferencial saiu na 195.)
- 195 (02/11) Cartão do mapa no jeito do print do hoteis.com: uma foto só
  à esquerda ("deve aparecer uma foto somente"; "Patrocinado" em cima dela,
  como o "Anúncio" dele), comodidades com o ✓ verde logo abaixo do
  endereço, nota, preços, "Ver academia" e, embaixo dele, "Falar no
  WhatsApp", sem o diferencial ("tire isso"). Sem SQL. Teste:
  `ver-no-mapa.js` (a bateria completa não rodou de novo, a pedido de
  economia; a última, de 02/11, deu 2.249).
- 196 (02/11) "Mostrar para o completo quantos entraram em contato é bom
  para tentar vender mais": no Completo, o Desempenho e o cartão pequeno
  mostram os acessos e os contatos (WhatsApp, Instagram e site) dos 30
  dias, como o Google Business Profile; canal, dia a dia, de onde vieram e
  bairros seguem no Premium. No Básico, a vitrine marca "Quantos chamaram
  vocês · Completo" e o resto "· Premium". Linha nova na tabela dos
  planos; Ajuda, chat e Termos (02/11). SQL
  `20261102120000_contatos_no_completo`. Testes: `acessos-em-destaque.js`,
  `parceiros.js`, `banco-emails.py` (755, nenhuma falha). Bateria completa
  não rodou (economia).
- 197 (02/11) "Me ajude a decidir" da comparação passo a passo
  (`state.decidePasso`): 1) "O que mais ajuda na sua escolha?" (prioridades
  e anotações) > "Ver o resultado"; a bola girando (1,2 s); 2) o resultado,
  com "Confirmar a …" e "Prefiro a …" embaixo ("Mudar o que ajuda" volta);
  3) noutra tela, "O que fazer agora": "Falar no WhatsApp" direto, "Ver a
  ficha no site" e "Escolher novamente". Sem SQL. Teste:
  `comparar-e-avisos.js` (bateria completa não rodou, economia).
- 198 (02/11) "Faça as telas com o cabeçalho do GuiaTennis e as atividades
  mais centralizadas": o "Me ajude a decidir" deixa de ser folha e vira
  tela no lugar da comparação, com o cabeçalho, "Voltar à comparação" e o
  passo no meio, numa coluna de 520px (títulos, chips e botões
  centralizados; a bola girando no meio). Sem SQL. Teste:
  `comparar-e-avisos.js`.
- 199 (02/11) Ajuste das telas: passo 1 com a pergunta no alto (só a bola
  girando fica no meio); passo 2 com "Mudar a preferência" em cima do
  resultado; passo 3 com "Sua escolha" no alto, a mini prévia da academia
  (o cartão do mapa sem favoritar, botão e WhatsApp, `cartaoDoMapa(c,
  true)`; tocar abre a ficha) e os contatos embaixo. Sem SQL. Teste:
  `comparar-e-avisos.js`.
- 200 (02/11) "Quando clicar em ver a ficha depois da comparação e clicar
  para sair da ficha, voltar à tela de decisão da escolha": a ficha aberta
  pela ajuda deixa `state.showDecide` ligado, e `voltarDaFicha` (e o voltar
  do celular) volta à comparação, que mostra a tela da escolha; da
  comparação comum, sair da ficha volta à comparação (antes ia à busca);
  `goComparar` (menu) desliga a ajuda. Sem SQL. Teste:
  `comparar-e-avisos.js`.
- 201 (04/11) "Avisos por e-mail no parceiros selecionar um por um" e "Agora
  você está na Play. tire isso de onde aparece do site": no Perfil do
  Parceiros, uma caixa por aviso (Avaliação nova ou editada, Pedidos de
  acesso, Pessoa nova na equipe, Mudança de plano e de responsável principal,
  Compras pagas, Lembrete de conferir a ficha, Resumo do mês), que grava na
  hora, como o Google Business Profile e a Shopify (`AVISOS_DOS_PARCEIROS`);
  o link do e-mail continua parando todos, e depois dele ligar um liga só ele.
  O filtro fica no `por_na_fila` (tipo do e-mail > `aviso_dos_parceiros`);
  e-mail de serviço não depende disso. Banco sem a coluna: a caixa única.
  Trocar de academia não mostra mais "Agora você está na …". Privacidade
  (04/11), chat e a folha "Parar os avisos". SQL
  `20261104120000_avisos_um_por_um` (`avisos_desligados`,
  `mudar_aviso_dos_parceiros`). Testes: `buscas-e-avisos.js`,
  `varias-academias.js`, `banco-emails.py` (770).
- 202 (04/11) "Quero que apareça com um push rápido ficando 5 segundos
  falando que agora está em tal academia, com uma barra embaixo deslizando
  indicando o tempo; todos os pushs de ajuda com o site ou aqueles que tentam
  vender mais, só sair com o clique no x; os de que a academia está em
  comparação, faça o mesmo de troca de academia": trocar de academia mostra
  "Agora você está na …" no `mostrarPush`, que agora dura 5 segundos (também
  com atalho, antes 7) com a barra dourada (`.gt-push-tempo`), como o snackbar
  do Google; a `mostrarDica`, o balão da conta (`ligarPushesDaConta`: um por
  visita, a mensagem muda por dia) e o convite das academias chamadas não
  saem sozinhos; o aviso rápido não tira a dica e desce embaixo dela. Sem SQL.
  Testes: `avisos-rapidos.js` (novo), `varias-academias.js`,
  `comparar-e-avisos.js`.
- 203 (04/11) "Não deixe eles se sobreporem": `empilharAvisos` (depois de
  cada `render()` e quando um aviso entra ou sai do `<body>`) põe os avisos do
  alto um embaixo do outro (o que já estava fica em cima; o aviso rápido, por
  último) e os de baixo um em cima do outro; fechado um, os outros voltam ao
  lugar. O balão da conta espera o da viagem e o da ajuda na busca. Sem SQL.
  Teste: `avisos-rapidos.js`.
- 204 (04/11) "No Premium a academia pode escrever uma biografia sobre a
  academia (…) com limite de caracteres, algo como 750, e o site faça o resumo
  com o mesmo tamanho para o completo": `LIMITES_DO_PLANO.sobre` (Básico
  "curto", Completo "resumo", Premium "academia"); `aplicarPlano` só deixa o
  `sobre` no Premium (fica no `integral`); `htSobre` na ficha e na prévia;
  `resumoCompleto` (até `SOBRE_MAX`, sem IA): o resumo de sempre com todas as
  comodidades, mais aulas e as das crianças com a idade, onde estacionar sem
  vaga própria, horário e cancelamento; o elogio e a nota sempre cabem.
  Premium sem texto: o resumo completo. Cadastro com a etiqueta "Premium" no
  campo; tabela dos planos, "o que o plano esconde" e a troca de plano.
  Como a descrição do Perfil da Empresa no Google (750) e o resumo do Booking.
  Sem SQL. Testes: `cadastro.js`, `parceiros.js` (8,9,10).
- 205 (04/11) "Para o resumo deixe como o último slot antes de revisar com
  algum nome legal sem ser resumo, com subtítulo 'agora nos conte um pouco
  mais sobre vocês', no quadrado com dicas do que escreverem e explicando
  abaixo do quadrado sobre os planos e consequências": parte nova
  `sobre` ("Apresentação" / "Apresentação da academia", subtítulo "Agora nos
  conte um pouco mais sobre vocês."), a última antes de Revisar (sai do fim de
  Quadras); o campo com as dicas dentro (história, estrutura, aulas e
  professores, para quem é, o diferencial) e, embaixo, o que cada plano
  mostra, com o plano da academia marcado. Na prévia, "Sobre a academia" e
  "Horário" viram duas partes, cada uma com o seu lápis. Como o "Descreva o
  seu espaço" do Airbnb. Sem SQL. Testes: `cadastro.js`, `previa-da-ficha.js`,
  `parceiros.js` (10 partes).
- 206 (04/11) "Preenchendo os valores das aulas, se não colocar valor nenhum
  não aparece no catálogo, se colocar 0 ou - aparecer sob consulta e deixe
  isso claro na hora de preencher, se não preencher avisar como um erro e ter
  confirmação de seguir; 'Com quais formatos?'; adultos 'ou' crianças no
  subtítulo de modalidade; o mesmo vale para as locações": `itensDaGrade` só
  leva o valor (ou "Sob consulta", `valorSobConsulta`: 0 ou -, gravado com
  preço vazio; na volta ao formulário, vira "-"); a aula sob consulta sem
  cobrança da regra 169 vira a avulsa; o campo mostra "Sob consulta" na hora
  (`.cat-sob`) e o texto embaixo explica; Continuar com valor em branco
  (`valoresEmBranco`) mostra o erro "Sem valor: …" com "Seguir assim". Aulas:
  "Com quais formatos?"; Modalidades: "para adultos ou crianças". Sem SQL.
  Teste: `catalogo.js`.
- 207 (04/11) "O site só deve avisar quando for sair de uma página que pode
  descartar alterações, quando realmente tiver alteração": a
  `assinaturaDoFormulario` compara sem vazios (`semVazios`: vazio, nulo, 0 e
  desmarcado iguais; espaço nas pontas não conta) e com o catálogo já
  arrumado pela grade (a aula sob consulta sem cobrança não conta como
  mudança); o rascunho guarda a assinatura de quando o formulário abriu
  (`regAssinatura`), então recarregar a página sem mudar nada não pergunta; os
  campos comuns (`camposNaoSalvos`) também ignoram espaço nas pontas. Sem SQL.
  Teste: `cadastro-sair-e-revisao.js`.
- 208 (05/11) "Salvar no WhatsApp as quadras de determinado endereço",
  "enviar mensagens iguais para academias da região e salvar as academias no
  WhatsApp", "encaixando junto com buscas salvas": `acoesDoWhatsapp(origem)`
  na linha do "Salvar busca", na comparação e nas Favoritas (até 5, as com
  WhatsApp): "Mandar para o meu WhatsApp" (`wa.me/?text=` com a lista, o
  link de cada ficha e o da busca; o aviso diz para escolher "Você"), "Falar
  com todas"/"Falar com as N" (folha `renderFalarComVarias`: mensagens
  prontas, uma mensagem só com "Olá, [academia]! Vim pelo GuiaTennis." no
  começo, "Enviar" por academia, ✓ "Enviada" e "N de M enviadas"; conta como
  o WhatsApp da academia) e "Salvar os contatos" (vCard 3.0, `.vcf`, nome "…
  · GuiaTennis", WhatsApp, endereço e link). Sem disparo automático (o
  WhatsApp abre uma conversa por vez). Nada novo guardado. Chat de ajuda
  ("whatsapp-varias"). Como o "Compartilhar lista" do Google Maps e o pedir
  orçamento a vários da GetNinjas. Sem SQL. Teste: `whatsapp-das-academias.js`
  (novo).
- 209 (05/11) "O site precisa poder contabilizar o clique nos contatos e
  tudo mais" e "faça que as mensagens direcionadas por tal produto já estarem
  quase prontas": tipos novos em `cliques`, `lista_whatsapp` (cada academia da
  lista mandada para o próprio WhatsApp) e `contato_salvo` (cada uma do
  .vcf), na trava e na regra "Registrar clique"; os links da lista e do
  contato levam `utm_source=WhatsApp-lista` / `Contato-salvo` (a visita conta
  com essa origem); `numeros_da_academia` devolve `guardaram` {lista,
  contato} no Completo (30 dias, na vitrine: "N pessoas salvaram o contato no
  celular · N mandaram a academia para o próprio WhatsApp") e no Premium (o
  período; linhas em "Contatos por canal"). Mensagens quase prontas:
  `mensagemDaOpcao` no "Chamar no WhatsApp" de cada opção (a opção com o valor,
  a pergunta e "Meu nível:"/"Idade da criança:"/"Melhor dia e horário:" ou, na
  locação, "Dia e horário:"/"Quantas horas:"), e as do "Falar com todas" com
  as linhas para completar. Privacidade (05/11). SQL
  `20261105120000_lista_e_contato_salvo`. Testes: `whatsapp-das-academias.js`,
  `catalogo.js`, `banco-emails.py` (777). (O "guardaram" do Completo saiu na
  210.)
- 210 (05/11) "Não aparecer no completo informações mais complexas, somente
  comuns": o Completo fica com acessos e contatos dos 30 dias; quantos
  salvaram o contato e mandaram para o próprio WhatsApp ficam só no Premium
  (na vitrine do Completo, "Quantos salvaram o contato" entre o que é do
  Premium). A migração virou `20261105130000_lista_e_contato_salvo`
  (substitui a `20261105120000`, que só rodou no teste). Testes:
  `whatsapp-das-academias.js`, `banco-emails.py` (777).
- 211 (05/11) "Deixa o site do admin mais organizado em tudo, estar muito
  bagunçado e muito aglomerado as coisas. Deixe mais espaçoso": camada no fim
  do `<style>` (como a Stripe e a Shopify): página com mais margem, blocos com
  24px por dentro e entre eles, títulos maiores, listas e números sem caixa
  dentro de caixa (só linhas), seções das Estatísticas separadas por linha; o
  menu em grupos (`GRUPOS_DO_ADMIN`: Dia a dia, Cadastros, Números,
  Comunicação, Site); no celular, o topo fica com o menu, o logo e o sino, e
  "Ver o site", "Ver como academia" e "Sair da conta" vão para o fim do menu
  (`data-adm-acao`). Sem SQL. Testes: `painel-admin.js`, `falhas.js`,
  `ficha-basica.js`, `fechada-guardada.js`, `publico.js`.

- 212 (05/11) "Ficou confuso esse primeiro acesso no parceiros direto,
  deixe que ele primeiro faça o cadastro normal e depois já aparece a
  solicitação": no Parceiros, e-mail novo (`continuarComEmail`) abre o
  cadastro normal (`cadastroNormalPeloParceiros`: a folha do jogador direto
  no "criar", com o e-mail); criada a conta (`state.pcContaCriadaAqui`) e
  confirmado o código, a tela "Use a sua conta…" vira "Conta criada!" /
  "Agora, os seus dados de contato na academia", só com tratamento, cargo e
  WhatsApp (`camposDeContato(…, semNome)`; nome e aceite vêm do cadastro
  normal), sem o aviso "Conta criada!" de novo, e segue para o pedido. Saiu o
  passo "criar" do Parceiros (`criarContaDeParceiro`, `?passo=dados`). Trilha
  "Sua conta · Confirmar e-mail · Sua academia · Início". Ajuda e chat. Como
  o Google Business Profile e o Airbnb. Sem SQL. Testes:
  `cadastro-normal-parceiros.js` (novo), `parceiros.js`, `percurso.js`,
  `voltar.js`, `senha.js`, `rascunho.js`.
- 213 (05/11) "Não aparecer opção de fazer pagamento se o acesso não permite
  e outras ações tbm, deixe como algo que não se vê" e os textos dos valores
  ("No catálogo serão apresentados os valores por hora de ambas opções"; em
  branco não aparece; 0, - ou espaço = "Sob consulta"; "deixe a vírgula
  funcionando"; "Com o Premium, cada formato mostra a própria foto"; o mesmo
  nas aulas): na equipe, somem o botão de mudar o plano
  (`botaoDeEscolherPlano`), o "Comprar créditos" e o aviso no lugar
  (`botaoDeComprarCreditos`), "Quem adiciona e remove pessoas…", os cartões
  de Atualizações sem a função, os "Editar/Conferir a ficha" sem `podeEditar`,
  as dicas (`dicaPermitida`) e os atalhos do chat (`acaoPermitida`); a
  `pcSemFuncao` fica só para quem chega pelo link. Valores: a vírgula (ou o
  ponto) é a dos centavos, até 2 casas; "1.500" é mil e quinhentos; o
  intervalo sai com espaço, traço ou "a"; espaço sozinho vira "-";
  `priceMin`/`priceMax` leem os centavos e `numeroDoPreco` compara. Rodapés
  novos de Aulas e Locação, erro "Sem valor" e chat. Como as permissões da
  Shopify e do Google Business Profile. Sem SQL. Testes: `catalogo.js`,
  `funcoes-da-equipe.js`, `plano-e-creditos.js`, `parceiros.js`,
  `chat-parceiros.js` e os de preço e ficha.
- 214 (05/11) "Quando a avaliação ou resposta estiver carregando para ser
  postada, deixar como no insta, meio cinza": a avaliação nova
  (`submitRating`), a editada (`salvarEdicaoDaAvaliacao`) e a resposta da
  academia (`publicarResposta`, `r.respostaEnviando`) aparecem na hora na
  lista com `.gt-enviando` (opacidade 0,5, cinza, sem toque) e "Publicando…"
  no lugar da data; deu erro, somem e volta o de antes (a resposta volta ao
  formulário com o erro). A nota não conta a que está publicando; "Enviar
  avaliação" fica travado. Sem SQL. Teste: `publicando-cinza.js` (novo).
- 215 (05/11) "Exceto nas avaliações, toda parte do site que for carregar e
  demorar um pouco, mostrar a bolinha rodando, tente deixar ela mais
  realista": `bolaGirando` virou uma bola de tênis de verdade (feltro com
  degradê e textura, borda escura, brilho e sombra parados; só as costuras
  giram, `.bola-giro`; ids únicos por bola, `bolaSeq`). Ganharam a bolinha o
  CEP do cadastro, o botão da localização na busca e os "Procurando…" do
  admin (o resto já tinha). Sem SQL. Testes: `comparar-e-avisos.js`,
  `jogador.js`.
- 216 (05/11) "A aba de apresentação está com muita informação": a parte
  `sobre` do cadastro ficou com o campo (dicas mais curtas dentro: a
  história e a estrutura, as aulas e os professores, o diferencial), o
  contador e uma linha só ("Aparece na ficha no Premium; nos outros planos,
  a ficha mostra um resumo do GuiaTennis. Sem telefone, link ou preço."); saiu
  a lista do que cada plano mostra. Como o "Descreva o seu espaço" do Airbnb,
  que tem só o campo. Sem SQL. Teste: `cadastro.js`.
- 217 (05/11) "Deixe o site mais rápido, sinto meio lento às vezes": a lista
  da busca desenha 20 academias (`LISTA_PASSO`, `limiteDaLista`) e as
  próximas 20 entram sozinhas ao chegar perto do fim (`ligarListaQueCresce`,
  IntersectionObserver, com a bolinha); mudou a ordem, os filtros ou a busca,
  volta a 20. Com 150 academias, cada toque caiu de 162 ms e 9.000 elementos
  para 20 ms e 1.400. As fotos dos cartões, da mini prévia e da galeria com
  `loading="lazy"`; `supabase-js@2.118.0` fixo (sem o redirecionamento do
  "@2") e `preconnect` para o Google Fonts, o unpkg e o Supabase. Como o
  Booking, o Airbnb e o Instagram. Sem SQL. Testes: `lista-de-20.js` (novo) e
  15 da busca e da ficha.
- 218 (06/11) Pixel da Meta pronto e desligado ("sim", para ligar quando
  anunciar): `META_PIXEL` vazio = nada muda. Com o `id`, a primeira visita mostra
  o aviso `.gt-cookies` ("Recusar" e "Aceitar" do mesmo tamanho, como pede a
  ANPD); só com "Aceitar" (`COOKIES_KEY` no navegador) o `carregarPixel` traz o
  fbevents.js e conta PageView, Contact (WhatsApp, Instagram e site da
  academia, em `trackClick`) e CompleteRegistration (conta de jogador), sem
  dado pessoal; admin e conta da academia não contam; "Cookies" no rodapé
  reabre a escolha; a Privacidade (seção 6) troca o texto e a data sozinha.
  Como o Booking e o Airbnb. Ligado no mesmo dia ("eu quero ativar os
  cookies"), com o Pixel 2565402353955968: Privacidade em 6 de novembro (os
  Termos seguem em 5). Sem o `<noscript>` do código da Meta (contaria sem o
  aceite). Sem SQL. Testes: `pixel-da-meta.js` (novo), `ficha-basica.js` e
  `regras-de-conteudo.js` (a data).
- 219 (06/11) "Eu gostaria de automatizar isso se vai ampliar essa
  oportunidade de trazer mais pessoas certas" e "eu quero ativar isso
  [correspondência avançada] se for desempenhar melhor": função
  `netlify/functions/catalogo-meta.mjs` em `/catalogo-meta.csv` (o feed do
  catálogo da Meta: academia no ar, não pausada, com foto e preço; id, nome,
  descrição, menor preço, link da ficha com `utm_source=Meta-anuncio`, foto e
  os rótulos cidade, bairro, plano e modalidade; banco de verdade só em
  guiatennis.com.br). O Pixel manda `ViewContent` (ficha aberta) e `Contact`
  com o `content_ids` da academia, para os anúncios dinâmicos. Correspondência
  controlada (`correspondenciaDoPixel`): só o e-mail do jogador logado que
  aceitou, cifrado pelo Pixel; nunca de academia (a automática da Meta fica
  desligada). Termos (a academia autoriza as fichas nos anúncios; quem
  preferir fica de fora) e Privacidade em 6 de novembro; o aviso de cookies
  cita o e-mail cifrado. Como os anúncios dinâmicos do Booking e do
  hoteis.com. As fotos ficam no banco como `data:image` (o recorte do site):
  o feed leva `/catalogo-foto?foto=<id>`, que devolve a imagem (a Meta só
  aceita link). Em todo lugar ("mas só da meta? quero usar em todos os
  lugares"): `/catalogo.csv?para=tiktok|pinterest` (as mesmas colunas, com a
  origem de cada um) e `/catalogo-google.csv` (formato "Personalizado" do
  remarketing dinâmico do Google Ads); os endereços ficam no `config.path` da
  função (com ele, o `/.netlify/functions/catalogo-meta` deixa de valer). O
  remarketing no Google e no TikTok ainda pede a tag de cada um, com o mesmo
  aviso de cookies (pedir o id ao Breno quando criar as contas). Sem SQL. Testes: `catalogo-meta.mjs` (novo, no
  `rodar-todos.sh`), `pixel-da-meta.js`, `ficha-basica.js`,
  `regras-de-conteudo.js`.
- 220 (08/11) A tag do Google Ads (`AW-18561506462`, `GOOGLE_ADS`) atrás do
  mesmo aviso de cookies (`carregarGoogle`): `config` (visita), `view_item` e
  `generate_lead` com o id da academia (o mesmo do `/catalogo-google.csv`,
  `google_business_vertical: "custom"`), `sign_up`; a conversão
  ("conversion" com o `rotuloContato`) só quando o rótulo existir. Sem e-mail
  para o Google. Aviso de cookies "da Meta e do Google"; Privacidade (seção 6)
  e Termos (as fichas nos anúncios do Google e de outras plataformas) em 8 de
  novembro. Em 09/11, a conversão "Chamou uma academia" (rótulo
  `uUlSCMKeibUdEJ656JJF`). Sem SQL. Testes: `pixel-da-meta.js`,
  `ficha-basica.js`, `regras-de-conteudo.js`.

- **221 (09/11) — a disputa decidida pelo admin.** Pedido do Breno: "não deve
  ganhar quem contestou e sim eu analisar o que é certo ou não" (como o Booking
  e o Tripadvisor). O código no WhatsApp da academia virou prova: digitado
  certo, guarda `pedidos_de_acesso.codigo_ok_em`, devolve `analise` e avisa o
  admin por e-mail ("Disputa: código confirmado na …"); a academia não muda
  sozinha. Em Pendências, os botões da disputa são "Dar a academia a quem
  contestou" (`aprovar_pedido_de_acesso`) e "Manter com quem administra"
  (`recusar_pedido_de_acesso`). Quem contestou vê "Em análise". Fora da
  disputa, o código continua liberando na hora. Termos, Privacidade (guarda a
  data do código certo), chat de ajuda e a 3ª tela do "Contestar" ("O
  GuiaTennis analisa e decide") em 9 de novembro (`META_PIXEL.ligadoEm` é a
  data da Privacidade). SQL `20261109120000_disputa_decidida_pelo_admin`.
  Testes: `codigo-so-em-disputa.js`, `codigo-pelo-whatsapp.js`,
  `contestar-passo-a-passo.js`, `parceiros.js`, `varias-academias.js`,
  `ficha-basica.js`, `regras-de-conteudo.js`, `pixel-da-meta.js`,
  `banco-emails.py` (783).
- **222 (09/11) — WhatsApp no ar em confirmação e disputa com dois códigos.**
  (1) O código certo do WhatsApp da ficha já coloca o número no ar
  (`confirmar_whatsapp_da_ficha` devolve `publicado`), com "WhatsApp em
  confirmação pelo GuiaTennis" na linha "Confirmada pela academia" e embaixo do
  Contato (coluna pública gerada `academias.whatsapp_em_confirmacao`); o admin
  "Confirmar o número" tira o aviso; recusar (ou a academia cancelar) volta o
  número de antes. (2) Contestar pede o WhatsApp que a pessoa acha certo
  (`contestar_academia(p_academia, p_numero)`, `pedidos_de_acesso.numero_contestado`)
  e o código vai para ele; quem administra recebe outro código no WhatsApp da
  ficha (no nome do principal mais antigo, `responsavel_da_disputa`), um e-mail
  "Confirme o WhatsApp da …" e o cartão "Academia contestada" no Início do
  Parceiros (`disputas_das_minhas_academias`, `confirmar_codigo_do_responsavel`,
  `pedir_codigo_do_responsavel`; não vê quem contestou). O admin vê os dois
  lados em Pendências (gera/manda os dois códigos: `gerar_codigo_do_responsavel`,
  `mandar_codigo_do_responsavel_admin`) e decide; dando a academia a quem
  contestou, o número confirmado por essa pessoa vai para a ficha. Termos,
  Privacidade, ajuda e chat no mesmo dia. Testes: `disputa-dois-codigos.js`
  (novo), `veracidade.js`, `fechada-guardada.js`, `contestar-passo-a-passo.js`,
  `codigo-so-em-disputa.js`, `codigo-pelo-whatsapp.js` e mais 12 (598
  verificações), `banco-emails.py` (800).
- **223 (09/11) — contestar o acesso de outra pessoa.** Em Acessos, tocar na
  pessoa e em "Contestar o acesso" abre um pré-questionário (conhece a pessoa?
  quem ela é: funcionário(a), professor(a), sócio(a)/dono(a), ex ou não sei;
  o que faz ou fazia — obrigatório se sabe quem é; o motivo: saiu, não
  trabalha, não deveria mexer na ficha, outro; detalhes opcionais). Nada muda,
  a pessoa não é avisada, a linha fica "em verificação pelo GuiaTennis" para
  quem contestou e o admin recebe o e-mail "Acesso contestado: …". Em
  Pendências, "Acessos contestados" mostra os dois lados (nome, cargo, e-mail,
  papel) e as respostas: "Manter o acesso" ou "Tirar o acesso" (só desta
  academia; a conta continua). SQL `20261109140000_contestar_acesso` (tabela
  `contestacoes_de_acesso`, `contestar_acesso`, `minhas_contestacoes_de_acesso`,
  `contestacoes_de_acesso_admin`, `resolver_contestacao_de_acesso`). Termos,
  Privacidade e chat. Testes: `contestar-acesso.js` (novo) e mais 8 (374
  verificações), `banco-emails.py` (815).
- **224 (09/11) — denunciar a conta de quem escreveu a avaliação.** O
  "Denunciar" da avaliação virou "Denunciar" com dois grupos: "A avaliação" (os
  5 motivos de antes) e "A conta de quem escreveu" (nome ofensivo ou impróprio,
  conta falsa ou se passando por outra pessoa, conta da academia ou de
  concorrente, outro — este pede o que viu). Precisa estar logado; nada muda;
  quem foi denunciado não sabe quem denunciou; o admin recebe "Conta denunciada:
  …" e, em Pendências › Contas denunciadas (uma linha por conta), "Manter" ou
  "Suspender o nome" (o motivo já vem escrito; usa o `suspender_nome_admin`).
  SQL `20261109150000_denunciar_conta` (tabela `denuncias_de_conta`,
  `denunciar_conta`, `denuncias_de_conta_admin`, `resolver_denuncia_de_conta`).
  Termos, Privacidade e chat ("Denunciar uma conta ou um nome"). Testes:
  `denunciar-conta.js` (novo), `veracidade.js`, `regras-de-conteudo.js`,
  `avaliacao-editada.js` (a data da Privacidade estava velha desde 06/11),
  `ficha-basica.js`, `nome-suspenso.js`, `perfil-e-avaliar.js`,
  `chat-parceiros.js`, `banco-emails.py` (827).
- **225 (09/11) — o questionário da contestação de acesso ampliado.** Em duas
  partes: "1. Sobre você" (quem é na academia: funcionário(a), professor(a),
  sócio(a)/dono(a); o que faz; há quanto tempo está lá) e "2. Sobre a pessoa"
  (conhece? quem é? o que faz? suspeita de algo: nada, muda a ficha, responde
  avaliações, conta de outra pessoa, outra; por quê). A pessoa contestada agora
  **é avisada** (e-mail "Seu acesso à … está em verificação", sem dizer quem
  contestou) e responde no Início do Parceiros (cartão "Acesso em verificação":
  quem é, o que faz, há quanto tempo, texto opcional); o admin recebe a
  resposta por e-mail e vê os dois lados em Acessos contestados. SQL
  `20261109160000_contestar_acesso_questionario` (`contestar_acesso` com 11
  parâmetros, `verificacoes_do_meu_acesso`, `responder_verificacao_de_acesso`).
  Termos, Privacidade e chat. Testes: `contestar-acesso.js` e mais 6 (282
  verificações), `banco-emails.py` (835).
- **226 (09/11) — tag do Pinterest.** `PINTEREST_TAG.id = "2614435484797"`,
  atrás do mesmo aviso de cookies (agora "da Meta, do Google e do Pinterest"):
  `page` na visita, `pagevisit` na ficha e `lead` no contato, com
  `line_items: [{ product_id }]` = o id do catálogo `/catalogo.csv?para=pinterest`,
  e `signup`. Correspondência: só o e-mail do jogador logado que aceitou,
  cifrado em SHA-256 no aparelho (`crypto.subtle`) antes do `load`; nunca de
  academia. Privacidade (seção 6) com o Pinterest. Sem SQL. Teste:
  `pixel-da-meta.js` (o core.js de verdade fica bloqueado no teste, senão
  esvazia a fila), `ficha-basica.js`, `regras-de-conteudo.js`, `menu-e-home.js`.
  Depois do merge: no Pinterest, criar o catálogo com o feed
  `https://guiatennis.com.br/catalogo.csv?para=pinterest` e reivindicar o site.
- **227 (09/11) — verificação do domínio no Pinterest.** A meta
  `p:domain_verify` (`097120c54c74f05a6f16ba9b88dee4ed`) no `<head>` do
  `index.html`. Só vale no guiatennis.com.br: depois do merge, tocar em
  "Verificar" no Pinterest (Configurações › Contas reivindicadas). Sem SQL.
- **228 (09/11) — o cartão da avaliação na ficha.** Como o Google Maps e o
  Booking: o nome de quem avaliou em cima, a nota (5/5 e a palavra) à
  direita, a data menor embaixo do nome e o texto maior embaixo (sai o "nome,
  data" do pé do cartão). Sem SQL. Testes: `acesso-academia.js`,
  `nome-suspenso.js`, `plano-da-academia.js`, `perfil-e-avaliar.js`,
  `avaliacao-editada.js`, `publicando-cinza.js`, `busca-e-ficha.js`,
  `ficha-hoteis.js`, `veracidade.js`, `denunciar-conta.js` (305 verificações).
- **229 (09/11) — site mais rápido.** (1) **A Netlify agora monta o site**:
  `netlify.toml` com `command = "node scripts/montar.mjs"` e `publish = "_site"`.
  O `scripts/montar.mjs` tira o `<script>` principal do `index.html` para
  `_site/app.<hash>.js`, compactado pelo terser (sem comentários; nomes de
  funções e de tudo no nível de cima mantidos), tira os comentários do CSS e do
  HTML e copia o resto (menos `testes`, `historico`, `scripts`, `node_modules`).
  O `app.*.js` tem `Cache-Control` de um ano (`immutable`). `package.json` com o
  `terser` (a Netlify instala sozinha). **A fonte continua sendo o `index.html`**:
  editar e testar nele, como sempre. `GT_SITE=_site node testes/<teste>.js` roda
  um teste no site montado (os que usam `trocar` ou procuram texto do código no
  `innerHTML` só valem na fonte). (2) O mapa (Leaflet) saiu do carregamento:
  `carregarLeaflet()` na primeira vez que um mapa aparece ("Carregando o
  mapa…") ou em segundo plano uma vez só (`agendarLeaflet`, depois do `load`,
  com o celular livre); só redesenha a tela quando um mapa está esperando
  (`__mapaEsperando`), para não tirar o cursor de quem está digitando. (3) As fontes do Google
  não seguram mais a primeira pintura (`media="print"` + `onload`). Medido com o
  celular simulado (CPU 4× mais lenta): pronto em ~950 ms → ~480 ms; HTML de
  503 KB → 43 KB (compactado), mais o `app.*.js` de 330 KB (compactado), que o
  navegador guarda entre as visitas. Sem SQL.
- **230 (09/11) — o texto do aviso de cookies.** Sem citar a Meta, o Google ou
  o Pinterest (pedido do Breno): "Para uma experiência melhor, usamos cookies
  de marketing: eles ajudam o GuiaTennis a chegar a mais gente que procura onde
  jogar tênis e a saber se os nossos anúncios funcionam (com a conta aberta,
  vai também o seu e-mail cifrado). Sem eles, o site funciona igual." e o link
  da Política de Privacidade, que continua dizendo quais são (o que a LGPD e o
  guia da ANPD pedem: a finalidade no aviso e o detalhe na política). "Recusar"
  e "Aceitar" do mesmo tamanho, como antes. Teste: `pixel-da-meta.js`.
- **Bateria completa (09/11, regras 221 a 230):** 2.369 verificações; as 4
  falhas que deu foram corrigidas e os testes rodaram de novo sem falha (3
  vinham do mapa em segundo plano, agendado a cada redesenho; 1 era o
  `painel-admin.js` desatualizado desde a regra 217, que procurava o endereço
  antigo da biblioteca do banco).
- **231 (10/11) — dados para a nota fiscal.** "Mas como saber o cnpj da
  academia" / "sim". Como os "dados de faturamento" do Google Ads e da Meta:
  antes da primeira compra (créditos ou plano), a parte "3 Nota fiscal" pede
  CNPJ ou CPF, razão social ou nome e o e-mail que recebe a nota (o CNPJ e o
  e-mail já vêm da conta; com um CNPJ de números, a razão social vem da Receita
  pelo `cnpj.mjs`); o "Pagar" grava e abre a compra. Com os dados, só o resumo
  com "Alterar". Em Pagamentos, o cartão "Dados para a nota fiscal" (Salvar,
  Alterar, Cancelar) e, em cada compra, "nota fiscal enviada para …". Aceita o
  CNPJ com letras (julho de 2026). Admin: aba nova **"Compras e notas"**
  (`/admin/compras`, grupo Financeiro, saiu de Leilões): "Notas para emitir"
  com cada dado num botão que copia (CNPJ só os números, razão social, e-mail,
  valor com vírgula), o link do Emissor Nacional e "Nota emitida"
  (Desmarcar, se errar); o número no menu é o de notas que faltam; a compra
  paga sem nota continua na lista depois de 30 dias; a compra de teste (só no
  banco de teste) aparece com "Teste" e o e-mail sai com "Teste:", para testar
  na prévia. A compra paga manda ao admin o e-mail "Nota fiscal para emitir" (com
  os dados), que leva a Compras e notas. SQL `20261110120000_dados_para_a_nota`:
  tabela `dados_para_nota` (só pelas funções), `documento_valido`,
  `dados_para_nota_da_academia`, `salvar_dados_para_nota` (função Pagamentos),
  `criar_compra_de_creditos`/`criar_compra_de_plano` recusam sem os dados e
  copiam na compra (`nota_documento`, `nota_nome`, `nota_email`),
  `nota_emitida_em`, `marcar_nota_emitida` (admin), `minhas_compras`,
  `compras_do_admin` e `avisar_compra_paga` com a nota. Banco sem o SQL: a
  compra segue como antes. Privacidade e Termos em 10 de novembro (a data da
  Privacidade agora é escrita à mão, não vem do `META_PIXEL.ligadoEm`); ajuda
  do Parceiros: "Como recebo a nota fiscal das compras?". Testes:
  `dados-para-nota.js` (novo, 26), `plano-e-creditos.js` (as compras do admin em
  Compras e notas), `painel-admin.js` (15 seções), `parceiros.js` (23 perguntas), as datas em `ficha-basica.js`, `regras-de-conteudo.js`,
  `pixel-da-meta.js` e `avaliacao-editada.js`; `banco-emails.py` com a seção
  nova (872 com a regra 232).
- **232 (10/11) — a compra numa tela só, começando pelos dados do comprador.**
  "Quero que o site entenda digitando o cpf ou cnpj sem ou com traços e
  pontos" / "unificar toda essa parte de pagamento? primeiro perguntando os
  dados do comprador e depois realiza o pagamento com o gateway conectado com
  o cpf ou cnpj". Como o checkout da Shopify e do Mercado Livre: créditos e
  plano usam a mesma tela (`pcCreditos`, aba `creditos`; o cartão do plano na
  página Plano saiu, `pcComprarCreditos` e `blocoDaNotaNaCompra` também), com
  as etapas "Dados do comprador", "Pagamento" e "Confirmação". Sem os dados
  salvos, a primeira tela pede CPF ou CNPJ, razão social ou nome e e-mail
  (`#pc-compra-dados`, "Continuar para o pagamento", `continuarDosDados`); com
  eles, a tela já abre no pagamento, com "1 Comprador" em cima e "Alterar"
  (volta aos dados, com "Cancelar e manter os dados de antes"). Depois, "2 Valor"
  (ou "2 Período", no plano) e "3 Forma de pagamento"; o botão virou "Pagar
  com Pix · R$ …". Máscara do CPF/CNPJ (`mascaraDoDocumento`): enquanto
  digita, coloca pontos, barra e traço (até 11 números, CPF; depois, CNPJ;
  aceita letras do CNPJ novo); ao sair do campo, avisa "Faltam números" ou
  "Confira os números" (`avisoDoDocumento`). `pagamento.mjs` manda ao Mercado
  Pago o pagador (`pagadorDe`): e-mail, nome e `identification` CPF/CNPJ (o
  CNPJ com letras vai sem o número); a volta do cartão é sempre
  `/parceiros/creditos?compra=…` (`&tipo=plano` no plano; a volta antiga pela
  página Plano abre a tela da compra). SQL `20261110130000_comprador_no_pagamento`:
  `compra_para_cobrar` traz `nota_documento`, `nota_nome` e `nota_email`.
  Termos e Privacidade (ainda 10 de novembro): os dados do comprador vão ao
  Mercado Pago; ajuda do Parceiros atualizada. Testes: `dados-para-nota.js`
  (32), `plano-e-creditos.js` (46), `pagamento.mjs` (23), `banco-emails.py`
  (872), e os afetados sem falha.

## 11. WhatsApp e mensagem para as academias

- No site, o contato do GuiaTennis aparece só com o nome e o logo pequeno
  ("Chat de ajuda", Instagram, E-mail); o WhatsApp do Breno fica atrás do
  chat de ajuda. Número e e-mail por escrito, só nos Termos e na
  Privacidade. **Sem mensagens automáticas** no WhatsApp Business.
- Mensagem para as academias (pedir horário, preços, cancelamento, como
  chegar, quadras, comodidades e até 5 fotos, oferecendo o QR code da
  ficha): o texto pronto está no histórico, seção 13.
