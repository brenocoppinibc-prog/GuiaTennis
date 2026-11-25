# GuiaTennis — contexto do projeto

Versão enxuta (23/11/2026). Basta ler este arquivo para continuar o
trabalho. O texto completo até 23/11/2026 (com o detalhe das regras 156 a 331) está em
`historico/CONTEXTO-completo-ate-23-11-2026.md`; o anterior (regras 1 a 167, resumos de cada chat,
todas as seções), em `historico/CONTEXTO-completo-ate-28-10-2026.md`;
a descrição completa do PR #5 (seções 1 a 73, passos 1 a 99), em
`historico/PR5-descricao-completa-ate-28-10-2026.md`. **Não ler os históricos
inteiros:** procurar com `grep` só quando precisar de um detalhe
("regra 133", "seção 4" e afins nos comentários do código e do SQL apontam
para o histórico).

**Atualizado em:** 25/11/2026 (regra 331, troca de chat)

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
| CNPJ | 70.120.796/0001-00 (`CNPJ_DO_GUIA`), BRENO COPPINI MARINHO LTDA (`RAZAO_SOCIAL_DO_GUIA`), Rua José de Jesus, 66, 44B, São Paulo, SP, CEP 05630-090 (`ENDERECO_DO_GUIA`); Simples Nacional, CNAE 6319-4/00, serviço 17.25. Razão social e endereço só no rodapé do Parceiros e nos Termos |
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
  que foi feito e o que depende dele. **Sempre economizar o limite de uso**
  (pedido fixo de 11/11/2026): ler só o trecho necessário, rodar só os testes
  afetados, sem print nem ferramenta extra sem pedido, resposta curta.
- **O site sempre precisa vender, para todos, da melhor maneira** (pedido fixo de
  15/11/2026): para o jogador (achar e chamar a academia) e para a academia (o
  Parceiros e os planos), sem empurrar e sem enfeite; toda decisão de design pesa
  isso.
- **Sempre o melhor marketing e o melhor design de sites** (pedido fixo de 22/11/2026, regra 315):
  em toda tela, gatilhos de venda bem usados (ancoragem com o preço riscado, economia em reais,
  bônus em destaque, prova social como "Mais escolhido", risco zero) e o acabamento dos melhores
  sites (Spotify, Apple, Stripe, Booking, Mercado Livre), com texto formal: nada de "vira R$ …",
  "o normal é…" ou "sai por"; usar "Receba…", "Preço regular", "Economize…".
- **O site sempre leva à tela exata** (pedido fixo de 23/11/2026, regra 327, "muito importante"):
  todo botão, push, link e e-mail leva à tela **e ao campo** em que a pessoa está mexendo, estava ou
  vai mexer ("Corrigir" no campo do erro, o lápis na parte certa, voltar para onde estava).
- **O site sempre facilita e acelera** (pedido fixo de 23/11/2026; não dizer isso no site): completo
  de opções e direto, no celular e no computador. A cada pedido, procurar onde a pessoa trava
  (teclado que abre à toa, Enter que não avança, passo a mais) e resolver junto.
- **Gramática, marketing e design em todo texto novo** (regra 327): também nos slots novos do
  catálogo, nos pushes, nos erros e nos e-mails; passar no verificador (`testes/gramatica/`) antes do
  push.
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
- **Sem a palavra "pôr"** (nem "põe", "ponha", "pôs"): usar adicionar, incluir,
  informar, colocar ou cadastrar.
- **Português formal e natural (regra 252):** "para" (nunca "pra"), "você" sem
  "te", "avaliá-la" (não "avalia ela"), regência certa ("de que você gostou",
  "em que você joga", "responder à verificação"), "Mais bem avaliadas", "Ex.:"
  e "…". Texto novo pode passar pelo LanguageTool local (regra 252).
- Prints de tela só quando o pedido é de visual, e com a fonte de verdade
  (seção 6).
- Mensagem de erro simples, dizendo o que fazer; o técnico vai para o
  `?diagnostico`.

## 2. Como entregar cada pedido (checklist)

1. Código no `index.html` (e SQL novo em `supabase/migrations/`, seção 5).
2. Texto novo (tela, push, erro, slot do catálogo, e-mail): verificador de gramática e as regras de
   marketing e design; botão ou aviso novo leva à tela e ao campo exatos (seção 1).
3. Teste: criar ou ajustar `testes/<tema>.js`; rodar os afetados; no fim,
   a bateria completa (`bash testes/rodar-todos.sh`, seção 6). SQL novo:
   seção nova no `testes/banco-emails.py`.
4. Termos/Privacidade quando o pedido toca no que eles dizem, com a data
   de "Última atualização" nos dois (`ficha-basica.js` e
   `regras-de-conteudo.js` conferem a data). Chat de ajuda (`CHAT_TEMAS`,
   `CHAT_DETALHES*`) e "Como funcionam as avaliações" quando for o caso.
5. **Este arquivo:** trocar o parágrafo da seção 9 (não acumular),
   acrescentar uma linha na seção 10 e os números de teste.
6. **Descrição do PR (curta):** desde 02/11, só as regras e os passos
   novos (a descrição de 05/11 a 16/11, com as regras 212 a 289 e os passos 42 a
   109, está em `historico/PR5-descricao-05-11-a-16-11-2026.md`; o detalhe de 168 a 195 e os passos 1 a 29 estão em
   `historico/PR5-descricao-28-10-a-02-11-2026.md`; o de 193 a 211 e os passos
   27 a 41, em `historico/PR5-descricao-02-11-a-05-11-2026.md`); uma linha por regra
   nova, o SQL novo e um passo em "Para testar". Salvar com
   `update_pull_request` e conferir (ler o PR e comparar o `body` com o
   arquivo local com `jq -r .body` + `diff`).
7. Commit em português, com as linhas finais de autoria pedidas pela
   sessão; push; conferir o "Banco de dados" (Actions) e a prévia do
   Netlify. Sem identificador de modelo em commit, PR ou código.
8. Resposta curta ao Breno: o que mudou e o link da prévia.

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
- **O lugar é "academia"** (18/11/2026: "pode deixar escrito academias no site, mas quando
  for em relação à estrutura da quadra nós chamamos de academia"): "quadra" é a quadra em
  si (piso, coberta, aluguel da quadra) e a quadra pública; não repetir "academias e
  quadras" para o mesmo lugar sem precisar. **"Quadra" fica onde a pessoa procura** ("muita
  gente também procura como quadra"): "Buscar quadra" no menu e no chat, os títulos e textos
  para o Google ("quadras e academias de tênis"), "Aula e quadra de tênis perto de você"
  (regra 298).
- O site **não narra o que faz**; opção pequena não se explica; o
  complexo vai para a Ajuda ("Saiba mais"); dica que facilita fica.
- Sem preço = **"Sob consulta"** + "fale com a academia" (`SEM_PRECO`).
- Botão que desconecta diz **"Sair da conta"**.
- Visual limpo e espaçado: **a fonte do aparelho** no texto e nos títulos
  (`--fonte-texto` e `--fonte-titulo`: San Francisco, Roboto, Segoe UI; regra
  259); o nome "GuiaTennis" no logo é **desenho em Poppins Bold** (`nomeDoLogo()`,
  classe `logo-nome`, regra 260): "Guia" na cor do texto em volta (verde no claro,
  branco no verde) e "Tennis" dourado; nos e-mails, a faixa verde com o nome em imagem (regra
  286); creme, verde e
  dourado (o Breno quer manter essas cores, 13/11); nada abaixo de
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
- O logo é um desenho só (`logoDesenho`, com o nome em Poppins `NOME_DO_LOGO`,
  os dois entre `LOGO-INICIO` e `LOGO-FIM`); as imagens saem dele por
  `divulgacao/gerar-imagens.js` (ícones, imagem de compartilhar, 404, assinatura de
  e-mail, capa do WhatsApp e, na regra 287, os fundos do Instagram, a capa do Facebook e o
  logo deitado em PNG e SVG). Nos e-mails, uma faixa verde no alto com a raquete
  e o nome em imagem (`email-nome.png`, "Guia" branco e "Tennis" dourado, regra 286).
- No celular, janela aberta ocupa a tela toda. O que se digita vai calado
  para o rascunho da aba (sem "Rascunho salvo") e sair com algo não salvo
  pergunta "Sair sem salvar?" (`data-aviso-sair`, `data-rascunho-de`).

Técnica
- **Um arquivo, sem build, sem framework, sem dependência nova e sem IA**
  (o site entende textos por palavras-chave). De fora só Supabase,
  Leaflet/OpenStreetMap, Nominatim, Overpass e ViaCEP/awesomeapi (as
  fontes do Google saíram na regra 260: nenhuma fonte é baixada).
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
  cobrar): **Básico** (todas as comodidades desde a regra 329, 3 fotos, só WhatsApp, 1 pessoa, o resumo curto no Sobre),
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
  resumo do site com o que dizem as avaliações, até 400, regra 330; Básico: o resumo curto; regra 204), Opções para jogar, **Explore a região**,
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
  prévia), `nota-fiscal.mjs` e `nota-fiscal-relogio.mjs` (a NFS-e de São Paulo,
  regra 331; usa o `node-forge` só para abrir o .pfx: a única dependência de
  função), `cnpj.mjs` (Receita, para o "Conferir" do admin),
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
- **Último SQL:** `20261125120000_nota_fiscal_automatica` (regra 331: `nota_configuracao`, `notas_fiscais`, o certificado no cofre e a fila; `avisar_compra_paga` e `minhas_compras` refeitos). Antes, `20261116120000_fechamento_do_leilao` (96 arquivos na pasta; regra 284: o dia e a hora do fechamento do leilão em `leilao_config`, `proximo_fechamento()` pela config e `mudar_fechamento_do_leilao`, só o admin). Antes, `20261113130000_nome_do_logo_nos_emails` ( regra 260: o nome no alto dos e-mails em Arial negrito, "Guia" verde e "Tennis" dourado). Antes, `20261113120000_portugues_dos_emails` (regra 258: as 18 funções de e-mail com o texto revisado). Antes dele, `20261112120000_chat_com_o_guia_e_relatos`; antes, `20261111120000_feedback_so_o_admin_ve` ( `nota_do_guia` só para o admin, sai a `pagina_das_avaliacoes_do_guia` e o `sitemap()` volta sem `/avaliacoes`). Antes dele, `20261110160000_reserva_online` (coluna `reserva_link`, clique `reserva` e as funções dos números refeitas com ele). O `20261110150000_pagina_das_avaliacoes_do_guia` (regra 235) rodou só no banco de teste e saiu da pasta. O `20261105120000` (a mesma coisa com o Completo vendo quantos guardaram) rodou só no banco de teste e saiu da pasta. Os `20261029120000_textos_das_promocoes` (regra 176) e `20261029150000_textos_curtos_das_promocoes` (título 40, regra 177) rodaram só no banco de teste e saíram da pasta.
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
- **Bateria completa:** `bash testes/rodar-todos.sh` (~15 minutos; em segundo plano). Último
  resultado (23/11/2026, regra 327): **2.794 verificações** (as 3 falhas, de testes com a ordem antiga, ajustadas), nos arquivos do navegador
  mais `onde.mjs`, `pagamento.mjs`, `cnpj.mjs`, `catalogo-meta.mjs` e `regiao.mjs`. O `falhas.txt`
  sempre aparece na lista (força erros de propósito).
- **Gramática:** `testes/gramatica/` (LanguageTool pt-BR pelo Maven; o passo a passo no `LEIA.md`).
- **Banco local** para o `testes/banco-emails.py` (**1.108 conferências**, 25/11/2026, regra 331,
  nenhuma falha; o teste roda de novo SQLs antigos, e o
  `20261105130000` recoloca a trava dos cliques de antes: SQL que mexe em
  `cliques_tipo_valido` ou em `numeros_da_academia` é rodado de novo no começo
  da seção dele): Postgres 16 em `/var/lib/postgresql/gt`. Ele cai entre um
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
  `netlify.toml` (sem `force`, então arquivo que existe continua no ar: o "Divulgue seu desempenho"
  usa `/divulgacao/instagram-post-fundo.png` e `instagram-stories-fundo.png`; não colocar `force` na
  regra da `divulgacao`). **Arquivo ou pasta nova na raiz vai para o ar sozinho**:
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

## 9. Estado atual e pendências (25/11/2026, troca de chat)

**PR #5** (`ccr-0a610d86-k6plx0` → `main`) com tudo até a **regra 331**: verde, prévia no ar, descrição
em dia (passos até o 167) e o SQL `20261125120000_nota_fiscal_automatica` já rodou no banco de teste
(25/11). Este chat deixou de acompanhar o PR: **o chat novo se inscreve com `subscribe_pr_activity`**.
O "Banco de dados" desta branch é disparado à mão (`banco.yml`, `destino: teste`,
`actions_run_trigger`); ele também leva o e-mail do código ao Supabase. **Conferir na prévia:** o
assunto do e-mail do código deve chegar como "123456 é o seu código do GuiaTennis"; se chegar escrito
"{{ .Token }}", voltar o assunto para "Seu código do GuiaTennis" no `banco.yml`. Textos de e-mail
corrigidos no próprio arquivo de SQL antigo (regras 323, 324, 326, 328 e 329: `20261013140000`,
`20261121130000`, `20261123120000`, `20261007130000`, `20261015130000`) valem no banco de verdade com o
merge. **Ambiente do Claude:** este chat criou o ambiente "GuiaTennis" (rede liberada para
prefeitura.sp.gov.br, notadomilhao.sf.prefeitura.sp.gov.br, nfe.prefeitura.sp.gov.br e
nfews.prefeitura.sp.gov.br; o web service da Prefeitura responde 403 sem o certificado). O manual do web
service (3.4.1) e os schemas estão em notadomilhao.sf.prefeitura.sp.gov.br/manuais (os do leiaute 1
copiados em `testes/nfse-sp-v01/`).

**Nota fiscal automática (regra 331):** pronta e testada sem a Prefeitura de verdade. O primeiro
contato real é o **"Testar com a Prefeitura"** depois de o Breno enviar o A1 na prévia (Admin › Compras e
notas). Se der erro de TLS (cadeia ICP-Brasil do servidor da Prefeitura) ou da Prefeitura, corrigir no
`nota-fiscal.mjs` com a mensagem que aparecer.

**Meta (25/11):** domínio verificado pelo registro TXT no registro.br (e a metatag no site); portfólio
"GuiaTennis" com o Breno entrando pelo Instagram @guiatennis (o perfil "Coppini Marinho" do Facebook não
tinha acesso; aba anônima resolveu); **falta a Meta aprovar a verificação da empresa**. Conta do WhatsApp
"GuiaTenni" com o número novo; o Breno diz que "tudo na Meta está alinhado": **conferir se os segredos
`WHATSAPP_TOKEN`, `WHATSAPP_NUMERO_ID` e `WHATSAPP_NUMERO_DE_TESTE` estão no GitHub** (rodar o "Banco de
dados": o registro diz "Sem os segredos…" se faltarem) e mandar o primeiro código de teste.

**Testes:** bateria completa de 23/11 (regra 327): **2.794 verificações** (as 3 falhas de testes com a
ordem antiga, ajustadas); depois, só os afetados de 328 a 331, sem falha; `banco-emails.py`: **1.108**,
sem falha (25/11); `nota-fiscal.mjs`: 34; `nota-automatica.js`: 15. **Rodar a bateria completa no começo
do próximo chat** (contêiner novo: montar o banco local, seção 6).

**Mercado Pago:** conta do CNPJ com chave Pix; aplicação "Checkout Pro" (API de Preferences; trocar
para a "API de Orders" quando o Mercado Pago marcar a data); na Netlify, `MERCADOPAGO_ACCESS_TOKEN`,
`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` por contexto. **A prévia usa as credenciais de
PRODUÇÃO:** compra na prévia é dinheiro de verdade (devolver pelo "Estornar" do admin). Webhooks
salvos em 22/11 (Pagamentos e Planos e assinaturas).

**Na conversa de 23/11 (sem mudar o site):** como lançar (soft launch numa região, encher a oferta
com as 15 Fundadoras, preço e foto nas fichas e as primeiras avaliações; anúncio pago só depois,
medindo os contatos por semana em Admin › Metas); o leilão continua dentro do alcance (preço do dia
pela concorrência do bairro e o e-mail do Premium em segundo preço, como o Google e o Instagram); o
alcance não usado volta para os créditos e os créditos não usados viram dinheiro pelo "Pedir
reembolso"; o domínio deve passar do CPF para o CNPJ no registro.br antes de divulgar (o Breno
concorda); o aporte de capital no Mercado Pago foi barrado pela trava antifraude ("pode desconhecer a
transação"): Pix comum pelo app do banco, conta do CNPJ confirmada, valor menor primeiro ou o
suporte do Mercado Pago.

**Pendências e ofertas sem resposta:**
1. **"Pode subir" do PR #5** (o Breno confere os passos 135 a 167 na prévia; antes, o A1 e o "Testar com a Prefeitura").
2. **Pix Automático:** o Breno confere se a página da assinatura do Mercado Pago oferece o Pix
   Automático; se sim, `PIX_AUTOMATICO.real = true`; se não, suporte do Mercado Pago ou Asaas.
3. **WhatsApp automático do código:** modelo de Autenticação criado no Gerenciador do WhatsApp. Em
   24/11, o portfólio tem 3 contas do WhatsApp: **"GuiaTenni" (1411995697158663), a que tem o número
   "Guia Tennis" conectado: é a que vale**; "GuiaTennis" (2855937403038324, conferir se está vazia) e a
   "Test WhatsApp Business Account" (do app de desenvolvedor). Falta: a forma de pagamento na
   "GuiaTenni" e o modelo aprovado nela (o Breno já criou um modelo). **O número conectado é um número
   novo, comprado só para isso, sem WhatsApp antes** (sem coexistência): ele só manda os códigos; o
   (11) 92745-6457 (WhatsApp Business no celular do Breno) continua o contato do GuiaTennis no site
   (`WHATSAPP_GUIA`), nos Termos e no chat. A coexistência daria para usar o 92745 na API, mas o chip
   novo é mais simples e não limita o aplicativo (decidido em 24/11).
   Faltam os segredos **do GitHub** `WHATSAPP_TOKEN` (token permanente de um usuário do sistema),
   `WHATSAPP_NUMERO_ID` (o ID do número novo) e `WHATSAPP_NUMERO_DE_TESTE` (5511927456457, que recebe
   os códigos do banco de teste), nunca pelo chat; depois, rodar o "Banco de dados".
4. **Catálogo do WhatsApp Business** (preços definidos; fotos quadradas com o logo oferecidas).
5. Carrosséis do Instagram e a plaquinha "Avalie no GuiaTennis" com QR (oferecidos).
6. **Nota fiscal automática: feita na regra 331 (25/11), no PR #5.** NFS-e Paulistana pelo web service
   da Prefeitura (leiaute 1: o Simples Nacional ainda usa o 1), CCM 05930642, código 02917, ISS 2,01%.
   Falta o Breno: **enviar o A1** em Admin › Compras e notas › Nota fiscal automática (na prévia vai
   para o banco de teste; depois do merge, de novo no site de verdade), **"Testar com a Prefeitura"**
   e, depois do merge, **Configurar › Ligada › Produção**. Todo dia 1, o lembrete do CSV para a
   Contabilizei (até o dia 5) e da alíquota. Se a Prefeitura recusar o TLS do servidor dela (cadeia
   ICP-Brasil), incluir a AC raiz no `nota-fiscal.mjs`. "Baixar planilha do mês" (oferecido).
7. **Domínio na Meta (24/11):** a metatag `facebook-domain-verification` está no `<head>` do `index.html`
   (vale no guiatennis.com.br depois do merge; ou, sem esperar, o registro TXT no DNS); depois, "Verificar
   domínio" em Gerenciador de Negócios › Domínios.
   **Empresa:** Mercado Pago no CNPJ regularizado (o Breno confirmou em 24/11) e, segundo ele, "tudo
   funcionando". Faltam: verificação da empresa na Meta (libera o código automático no WhatsApp e os
   anúncios), verificação de anunciante no Google Ads (ao anunciar), e-CNPJ A1 (só para a nota
   automática), CCM e nota na Contabilizei e marca no INPI. Confirmar se o domínio já está no CNPJ no
   registro.br (a mensagem de 24/11 não deixou claro).
8. Quadras públicas: a pergunta no chat de ajuda e a página "Quadras públicas de tênis em <bairro>".
9. Promover: ajustar com os números reais (mínimo de R$ 30 por mil, 3 vezes por dia, qualidade 0,80).
10. Metas do admin: os valores iniciais são palpites; o Breno ajusta em "Editar as metas".
11. Sem print na revisão visual: "Me ajude a decidir", "Como funciona" e o mapa (só o texto foi visto).
12. **Depois do merge:** Search Console ("Inspeção de URL" numa página de bairro e "Solicitar
    indexação"); Pinterest ("Verificar" e o catálogo `/catalogo.csv?para=pinterest`).

## 10. Regras recentes (uma linha cada)

O detalhe de cada regra (pedido do Breno, o que mudou, funções, SQL e testes) está em
`historico/CONTEXTO-completo-ate-23-11-2026.md`, seção 10 (procurar com `grep -n "^- \*\*318 "`);
as regras 1 a 167, em `historico/CONTEXTO-completo-ate-28-10-2026.md`. As regras 168 a 289 estão no
mesmo histórico de 23/11 e nas descrições antigas do PR (`historico/PR5-descricao-*`).

- 290 (16/11) — contatos reais, pagamento e cadastro.
- 291 (16/11) — a nota com confiança.
- 292 (16/11) — o logo em pé.
- 293 (16/11) — os números sem o "1 em cada".
- 294 (17/11) — "Também oferece": eventos, ranking e projeto social.
- 295 (17/11) — o projeto social sem venda.
- 296 (17/11) — quadras públicas e "Sugerir uma quadra ou academia".
- 297 (17/11) — "Você marcou?" mais cedo e sem repetir.
- 298 (18/11) — o lugar é "academia"; "quadra" onde a pessoa procura.
- 299 (19/11) — o CNPJ no site, pequeno e só onde a lei pede.
- 300 (19/11) — razão social e endereço no Parceiros.
- 301 (19/11) — o cartão dentro do site.
- 302 (20/11) — prazo na compra, sem esperar para sempre.
- 303 (20/11) — o motivo do erro do pagamento.
- 304 (20/11) — vantagem do Pix e o teste com dinheiro de verdade.
- 305 (20/11) — a vantagem do Pix mais à vista.
- 306 (20/11) — o rodapé com os dados da empresa, arrumado.
- 307 (20/11) — o site mais rápido de novo e todo erro no push.
- 308 (20/11) — a revisão de design.
- 309 (21/11) — o QR code do Pix no meio.
- 310 (21/11) — a assinatura do Premium e os gatilhos de venda.
- 311 (21/11) — a assinatura com o melhor design e o melhor marketing.
- 312 (21/11) — opinião no chat de ajuda é sugestão.
- 313 (21/11) — menos informação na compra e nos cartões.
- 314 (22/11) — a renovação automática no cartão e no Pix Automático.
- 315 (22/11) — o melhor marketing e design na compra, contatos e português.
- 316 (23/11) — estornos e pedidos de reembolso.
- 317 (23/11) — Promover: tudo num pagamento só.
- 318 (23/11) — a regra de marketing e design nas últimas mudanças.
- 319 (23/11) — Fundadoras com 15 vagas, metas da semana e "Divulgue a academia".
- 320 (23/11) — Fundadoras pela chegada do dono e "Divulgue seu desempenho" numa janela só.
- 321 (23/11) — a página de cada região para o Google.
- 322 (23/11) — gramática e marketing em todo o site.
- 323 (23/11) — revisão visual de todas as telas.
- 324 (23/11) — os nomes da situação do pagamento.
- 325 (23/11) — Pagamentos sem lista gigante.
- 326 (23/11) — as regras nas mudanças 324 e 325.
- 327 (23/11) — "Também oferece" em partes próprias, sem teclado à toa, Enter avança, "Corrigir" no campo exato, o código confirma sozinho e vai no assunto do e-mail; a regra da tela exata.
- 328 (23/11) — a revisão na mesma ordem da ficha e a etiqueta do plano (Completo/Premium) no que o plano não mostra.
- 329 (24/11) — todas as comodidades no Básico (Termos de 24/11).
- 330 (24/11) — o resumo do Completo curto e com o que dizem as avaliações.
- 331 (25/11) — a nota fiscal automática pela Prefeitura de São Paulo (certificado A1 no admin, teste e produção).

## 11. WhatsApp e mensagem para as academias

- No site, o contato do GuiaTennis aparece só com o nome e o logo pequeno
  ("Chat de ajuda", Instagram, E-mail); o WhatsApp do Breno fica atrás do
  chat de ajuda. Número e e-mail por escrito, só nos Termos e na
  Privacidade. **Sem mensagens automáticas** no WhatsApp Business.
- Mensagem para as academias (pedir horário, preços, cancelamento, como
  chegar, quadras, comodidades e até 5 fotos, oferecendo o QR code da
  ficha): o texto pronto está no histórico, seção 13.
