# GuiaTennis — contexto do projeto

Versão enxuta (28/10/2026). Basta ler este arquivo para continuar o
trabalho. O texto antigo completo (regras 1 a 167, resumos de cada chat,
todas as seções) está em `historico/CONTEXTO-completo-ate-28-10-2026.md`;
a descrição completa do PR #5 (seções 1 a 73, passos 1 a 99), em
`historico/PR5-descricao-completa-ate-28-10-2026.md`. **Não ler esses dois
inteiros:** procurar com `grep` só quando precisar de um detalhe
("regra 133", "seção 4" e afins nos comentários do código e do SQL apontam
para o histórico).

**Atualizado em:** 17/11/2026 (regra 296)

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
  que foi feito e o que depende dele. **Sempre economizar o limite de uso**
  (pedido fixo de 11/11/2026): ler só o trecho necessário, rodar só os testes
  afetados, sem print nem ferramenta extra sem pedido, resposta curta.
- **O site sempre precisa vender, para todos, da melhor maneira** (pedido fixo de
  15/11/2026): para o jogador (achar e chamar a academia) e para a academia (o
  Parceiros e os planos), sem empurrar e sem enfeite; toda decisão de design pesa
  isso.
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
   novos (a descrição de 05/11 a 16/11, com as regras 212 a 289 e os passos 42 a
   109, está em `historico/PR5-descricao-05-11-a-16-11-2026.md`; o detalhe de 168 a 195 e os passos 1 a 29 estão em
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
- **Último SQL:** `20261116120000_fechamento_do_leilao` (96 arquivos na pasta; regra 284: o dia e a hora do fechamento do leilão em `leilao_config`, `proximo_fechamento()` pela config e `mudar_fechamento_do_leilao`, só o admin). Antes, `20261113130000_nome_do_logo_nos_emails` ( regra 260: o nome no alto dos e-mails em Arial negrito, "Guia" verde e "Tennis" dourado). Antes, `20261113120000_portugues_dos_emails` (regra 258: as 18 funções de e-mail com o texto revisado). Antes dele, `20261112120000_chat_com_o_guia_e_relatos`; antes, `20261111120000_feedback_so_o_admin_ve` ( `nota_do_guia` só para o admin, sai a `pagina_das_avaliacoes_do_guia` e o `sitemap()` volta sem `/avaliacoes`). Antes dele, `20261110160000_reserva_online` (coluna `reserva_link`, clique `reserva` e as funções dos números refeitas com ele). O `20261110150000_pagina_das_avaliacoes_do_guia` (regra 235) rodou só no banco de teste e saiu da pasta. O `20261105120000` (a mesma coisa com o Completo vendo quantos guardaram) rodou só no banco de teste e saiu da pasta. Os `20261029120000_textos_das_promocoes` (regra 176) e `20261029150000_textos_curtos_das_promocoes` (título 40, regra 177) rodaram só no banco de teste e saíram da pasta.
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
  segundo plano). Último resultado (15/11/2026, regra 274): **2.610 verificações**,
  nenhuma falha; antes, 14/11/2026, regra 270: 2.585 + 50; antes, 13/11/2026, regra 263: **2.570
  verificações** nos 90 arquivos do navegador, mais `onde.mjs`, `pagamento.mjs`,
  `cnpj.mjs` e `catalogo-meta.mjs`, nenhuma falha (as 3 da primeira rodada eram
  testes com o texto antigo, corrigidos). O `falhas.txt` sempre aparece na lista
  (força erros de propósito).
- **Banco local** para o `testes/banco-emails.py` (**963 conferências**, 16/11/2026,
  regra 284; antes, 953,
  nenhuma falha, 13/11/2026, regra 258; o teste roda de novo SQLs antigos, e o
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

## 9. Estado atual e pendências (10/11/2026)

**Chat trocado em 17/11/2026 (regra 296):** o chat novo volta a acompanhar o PR #5 (este
deixou de acompanhar; inscrever com `subscribe_pr_activity`). Último commit de código:
`989007b` (regra 296). A prévia está no ar com tudo até a 296, o "Banco de dados" disparado
à mão rodou com sucesso no banco de teste para o SQL mais novo
(`20261117140000_quadras_publicas`) e a descrição do PR está em dia (passos 110 a 115; os
42 a 109 no histórico). **Do chat de 16 e 17/11:** regras 285 a 296 (seção 10): sitemap com
/como-funciona, vermelho `#C2330D`, nome em Poppins nas imagens, na 404 e na faixa verde dos
e-mails, "Pet friendly", logos e fundos das redes (`divulgacao/`), boas-vindas ao jogador,
busca com "Ordenar" e "Filtros" e "Salvar busca"/"Compartilhar" embaixo, contatos reais
(WhatsApp, Instagram e site), "Outro valor" e "Pagamento seguro", aviso com "Corrigir",
troca de academia sem piscar, nota com confiança (mais avaliações pesam), números sem o "1
em cada", "Também oferece" (eventos e ranking no catálogo, projeto social à parte, até 100
letras e sem venda) e **quadras públicas** com "Sugerir uma quadra ou academia" no menu.
**Testes:** bateria completa de 16/11 até a 290: 2.655, nenhuma falha; das 291 a 296, os
afetados, sem falha; **a bateria completa da 296 estava rodando na troca: rodar de novo no
começo do próximo chat.** **Pendências e ofertas sem resposta:** (1) a faixa verde "Para
academias" na inicial (recomendação: não entrar); (2) fazer o cartão de visita, os dois
flyers e a plaquinha de balcão "Avalie no GuiaTennis" com QR (oferecido); (3) quando o CNPJ
sair (o Breno espera nesta semana), colocar razão social e CNPJ no rodapé, nos Termos e na
Privacidade, e trocar as chaves do Mercado Pago; (4) "Você marcou?" saindo 10 minutos depois
só no banco de teste, para ele testar (oferecido); (5) ainda não feitos das quadras públicas:
a pergunta no chat de ajuda e a página de região "Quadras públicas de tênis em <bairro>".

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

**Chat trocado em 16/11/2026 (regra 284):** o chat novo volta a acompanhar o PR #5
(este deixou de acompanhar; inscrever com `subscribe_pr_activity`). Último commit de
código: `5d78b16` (regra 284). O PR está verde, sem conflito, a prévia no ar com tudo
até a regra 284 e a descrição do PR em dia (passos 91 a 105). O "Banco de dados" desta
branch é **disparado à mão** (`banco.yml`, `destino: teste`, pela ferramenta
`actions_run_trigger`): rodou com sucesso em 16/11 para o SQL mais novo,
`20261116120000_fechamento_do_leilao`. **Do chat de 14 a 16/11:** regras 268 a 284
(seção 10): inicial com mais conteúdo, a caixa de busca do Trivago (igual na inicial e
nos resultados), menu sem os links do fim, filtros rápidos, o WhatsApp da busca
("Chamar", "Compartilhar", "Peça o preço a várias academias"), o e-mail primeiro no
Entrar (trilha só no cadastro, e de volta no "Cadastrar minha academia"), "Aberto
agora"/"Fecha em breve"/"Fechado agora", "Aceita pets" (a iluminação entrou e saiu),
painel do Parceiros, Minha conta e admin revistos, o CEP da localização no campo,
"Academias recomendadas" de volta, o bairro direto, o "O que tem por perto" mais
confiável, o "Sobre" antes das opções, voltar da ficha na mesma altura e o admin
escolhendo quando o leilão fecha. **Regra fixa nova (seção 1):** o site sempre precisa
vender, para todos, da melhor maneira. **Testes:** a bateria completa rodou em 15/11
(até a regra 274: 2.610, nenhuma falha); das regras 275 a 284 só os testes afetados,
sem falha. **Rodar a bateria completa no começo do próximo chat.** `banco-emails.py`:
963 no banco local (16/11; o banco local foi montado neste contêiner e não fica).
**Bateria completa de 16/11 (até a regra 285): 2.640 certas, a única falha (`ficha-hoteis`, edição durante a bateria) passou ao rodar de novo.** **Respostas de 16/11 (regra 285):** `/como-funciona` no sitemap (sim), a cor de erro
`#E63D10` (sim), o nome em Poppins na imagem de compartilhar, na 404, na assinatura e na
capa (sim, "mesma escrita em todos os lugares") e "Pet friendly". **Sem resposta:** a
faixa verde "Para academias" na inicial (o Breno não entendeu; explicado em 16/11, com a
recomendação de não entrar). **Regra 286:** "deixe as cores que forem melhor": o vermelho de
erro ficou `#C2330D` (o tom do `#E63D10`, mais escuro para ler em letra pequena) e os e-mails
ganharam a faixa verde com o nome em Poppins, como o rodapé. Ideias ainda não
pedidas: no Sobre, foto do Breno, linha do tempo, valores e contato para imprensa.

**14/11/2026, regras 268 a 270:** a página inicial com mais conteúdo (cartões com
foto, "Busque pelo tipo de quadra", bairros da cidade); a caixa de busca de volta ao
desenho do Trivago (o de antes da regra 263); no menu, o logo do tamanho certo e
sem os links do fim (ficam no rodapé); a revisão de acabamento (regra 270: busca
compacta nos resultados, sem academia repetida na inicial, ficha sem repetir o
topo); regra 271 (15/11): a distância exata de volta, filtros rápidos na busca, a
opção única da ficha na linha inteira e "Comparação" sem o símbolo nos Filtros;
regra 272: o WhatsApp da busca no lugar certo (botão "Chamar" no cartão,
"Compartilhar" na barra e "Peça o preço a várias academias" dentro da lista); regra
273: a trilha com a bolinha só no cadastro (e-mail novo), a comparação com "Chamar as
N" e "Compartilhar", os números do Parceiros sem encavalar; regra 274: "Aberto agora"
no cartão e nos filtros rápidos (a comodidade "Iluminação" saiu na 276: "isso é um
fato"); regra 275: o painel do Parceiros e a Minha conta revistos; regra 277: a
comodidade "Aceita pets"; regra 278: o painel do admin revisto; regra 279: o CEP no
campo depois da localização e uma bolinha girando só; regra 280: "Academias
recomendadas" de volta no título, a página do bairro direta e o "O que tem por perto"
mais confiável; regra 281 (16/11): a mesma caixa de busca na inicial e nos resultados;
regra 282: mandar a lista e salvar os contatos pedem conta; regra 283: cores do horário,
linhas separadas no cartão e na ficha, foto do catálogo menor e o "Sobre" antes das
opções; regra 284: voltar da ficha na mesma posição, a trilha de volta no "Cadastrar
minha academia" e o admin escolhe quando o leilão fecha (SQL
`20261116120000_fechamento_do_leilao`, aplicado no banco local e no de teste: o "Banco
de dados" disparado à mão nesta branch rodou com sucesso em 16/11). Sem SQL. Bateria completa de 15/11
(até a 274): 2.610 verificações, nenhuma falha.

**Chat trocado em 14/11/2026 (regra 267):** o chat novo volta a acompanhar o
PR #5 (este deixou de acompanhar; inscrever com `subscribe_pr_activity`). Último
commit de código: `dc32186` (regra 267). O PR está verde, sem conflito, a prévia
no ar com tudo até a regra 267 e a descrição do PR em dia (passos 85 a 90). O
"Banco de dados" rodou no banco de teste para o SQL mais novo,
`20261113130000_nome_do_logo_nos_emails` (13/11, sucesso). **Do chat de 13/11:**
regras 258 a 267: português dos e-mails, fonte do aparelho, logo em Poppins
(verde e dourado, desenhado), Sobre com cabeçalho padrão e menu de 3 listras, o
**sistema de design** no site inteiro, a ficha na ordem da decisão, a **análise de
conteúdo** aplicada (glossário, preço por extenso, erros sem "eu", página
`/como-funciona`, Google) e o cartão e o topo da ficha como no protótipo.
Quadros (artefatos): sistema de design https://claude.ai/artifact/DSCBuJTiPGCegW6p1MMHYp
(o Breno mudou nele a cor de erro para `#E63D10`; o site segue `#A8462C`, 4,2:1
com branco, sem resposta), protótipo com as abas Análise e Conteúdo
https://claude.ai/artifact/74eWwbWjLoaZsKqtRg6CfA, fontes do logo
https://claude.ai/artifact/KMAgoNrMzi778JhqQmnTu6, paletas (recusadas)
https://claude.ai/artifact/Qpno9SkKR893cGBT87UhUZ. **Perguntas ao Breno sem
resposta:** (1) a faixa verde "Para academias" do protótipo na página inicial
(contra a regra de 14/10; não entrou); (2) incluir `/como-funciona` no sitemap
(sai do banco: SQL que refaz o `sitemap()`); (3) a cor de erro nova; (4) passar a
imagem de compartilhar, os ícones e a 404 para o logo em Poppins. Ideias do
analista ainda não pedidas: no Sobre, foto do Breno, linha do tempo, valores e
contato para imprensa e parcerias. Testes: bateria completa de 13/11 (até a regra
266) 2.546 verificações, a única falha corrigida; da 267, os afetados sem falha;
`banco-emails.py` 953. O banco local e o LanguageTool não ficam no contêiner.

**Chat trocado em 13/11/2026:** o chat novo volta a acompanhar o PR #5 (o
anterior deixou de acompanhar; inscrever com `subscribe_pr_activity`). Último
commit de código: `1fdcee5` (regra 257). O PR está verde, sem conflito, a prévia
no ar e a descrição do PR em dia até a regra 257 (passos 72 a 79). **A Netlify
monta o site** (regra 229): continuar editando e testando o `index.html`. **O
"Banco de dados" não roda sozinho com os pushes do Claude:** depois de cada SQL
novo, disparar à mão (`banco.yml`, `destino: teste`, na branch do PR) e conferir
em Actions; rodou para todos os SQLs até o mais novo,
`20261112120000_chat_com_o_guia_e_relatos` (12/11, sucesso). Nada em aberto da
conversa: os pedidos de 11 e 12/11 (regras 248 a 257) estão todos na prévia.
Nos chats de 11 e 12/11: a página **Sobre o GuiaTennis** (248, 249, 255 a 257;
hoje com o cabeçalho padrão do site e o menu de 3 listras na lateral (regra 262),
o topo verde-escuro e as partes Nossa história, O site, Equipe e Contato numa
página só, que o menu acompanha; a
carta do Breno: de São Paulo, professor desde 2022, 3ª classe, os cursos, sem
foto por enquanto); a caixa "Esta página ajudou você?" (250); o **chat com o
GuiaTennis** (251: erros e sugestões com a situação na página Feedback; o admin
lê as conversas e responde no chat); a **revisão do português** (252); os
rodapés GuiaTennis, Suporte, Termos (253 e 254). O site do trivago não abre
deste ambiente (fora da rede permitida). **Respostas de 13/11:** os e-mails
foram revisados (regra 258, SQL `20261113120000_portugues_dos_emails`, disparar o
"Banco de dados" à mão); a aba **Equipe** fica só com o Breno ("por enquanto só
eu trabalho no site"); **reservas:** as academias usam vários sistemas, e a
reserva continua **só pelo link** que a academia cola (nada de integração ou
parceria com sistemas de reserva por enquanto; "futuramente quero ter
parceria": não puxar o assunto antes de ele pedir). **Cores e fontes (13/11):**
o Breno quer manter o verde-escuro e o dourado (quadro das paletas recusado:
https://claude.ai/artifact/Qpno9SkKR893cGBT87UhUZ); o site inteiro passou para a
fonte do aparelho (regra 259); o nome do logo é a **Poppins** (escolhida no quadro
https://claude.ai/artifact/KMAgoNrMzi778JhqQmnTu6), desenhada em SVG, com "Guia"
verde e "Tennis" dourado (regra 260); o Google Fonts saiu do site (a Privacidade
não o citava). **Sistema de design (13/11):** https://claude.ai/artifact/DSCBuJTiPGCegW6p1MMHYp
(cores, letras, espaços, cantos, sombras, logo e 5 peças, tirado do `index.html`).
Diagnóstico: 126 cores (12 verdes-escuros parecidos), 34 tamanhos de letra, 14
cantos e 58 sombras; a proposta tem 13 cores (verde, verde-claro, verde-escuro
`#163A2E`, ouro, ouro-claro, ouro-texto `#7A5E1E`, creme, creme-2, branco, borda,
texto, texto-suave `#6F6857`, erro), 9 estilos de letra, espaços de 4 em 4, 4
cantos e 3 sombras; o selo dourado com texto escuro. **Protótipo do site (13/11):** https://claude.ai/artifact/74eWwbWjLoaZsKqtRg6CfA
(Início, Busca, Mapa, Ficha clicáveis e a aba Análise, com academias de exemplo):
busca com "Aula | Locação de quadra" lado a lado e "Usar minha localização";
"Perto de você" em lista no lugar do carrossel; cartão inteiro abre a ficha, só o
atalho do WhatsApp; nota no quadrado verde e "Nova" sem nota; botão flutuante
Lista/Mapa com preço nos pinos; ficha na ordem fatos › preços › horário ›
estrutura › como chegar › cancelamento › avaliações, com barra fixa (preço,
Reservar, WhatsApp). Referências: Doctoralia, Airbnb, Booking, Google Maps, iFood
(Playtomic evitado). Aprovado "em tudo, no geral" (regra 263, já no site).
**Análise de conteúdo (13/11):** aba "Conteúdo" do mesmo protótipo. Propostas,
esperando o "sim": glossário (academia = o que se lista; quadra só para contar;
locação no rótulo e alugar no verbo; "Chamar no WhatsApp"; avaliação/nota; "Sem
avaliações ainda"); preço sempre "R$ 100 por hora"/"R$ 90 por aula"; tirar o
travessão (—) das frases (203 no código); página inicial com 3 blocos depois das
academias (Dicas e perfis para "Como funciona a busca"); cartão sem "locação"
repetido; ficha ("Sem avaliações ainda", "Sobre" automático curto, erro sem "eu",
cancelamento "A academia ainda não informou…", "Avalie esta academia", "1
quadra"); Parceiros ("1 em cada 14", passo 3 curto com a disputa no FAQ, sem
"vende por você", sem exclamação, planos sem o parágrafo); Google (título e
descrição da ficha com preço e nota). **Aplicada inteira na regra 265.**
**Próximo passo oferecido:**
passar o site para essas regras na prévia (juntar os verdes, a escala de letras,
os cantos e as sombras), esperando o "sim" do Breno. Ainda em Arial maiúscula: a imagem de compartilhar, os ícones e a
404 (`divulgacao/gerar-imagens.js`, `logoDesenho({ comNome })`); oferecido trocar
para a Poppins, sem resposta. Testes:
**bateria completa de 12/11 (até a regra 252): 2.546 verificações**, sem falha;
depois, só os afetados de 253 a 257, todos verdes; `banco-emails.py` 930
conferências. Banco local (Postgres 16 em `/var/lib/postgresql/gt`) foi montado
do zero em 12/11; contêiner novo pode não ter: ver seção 6. O LanguageTool
(regra 252) foi baixado pelo Maven numa pasta temporária: não fica no contêiner.
Decisões de 10/11 (detalhe nas regras 231 a 234): a nota fiscal sai à mão pelo
Emissor Nacional enquanto o volume for pequeno (item 3 abaixo); a compra é uma
tela só (dados do comprador › pagamento › confirmação), e o CPF ou CNPJ vai ao
Mercado Pago como o do pagador; a Nota do GuiaTennis só aparece no site a partir
de 3 avaliações. Sugestão dada ao Breno: pedir a 3 academias parceiras que
avaliem o GuiaTennis pelo Painel. A bateria completa não rodou depois da 230
(só os testes afetados de 231 a 234, todos verdes).
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

**Próximo número:** regra 268.

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
- **233 (10/11) — sai o cartão "Dados para a nota fiscal" de Pagamentos** ("tire
  isso", com o print). Os dados do comprador ficam só no começo da compra
  (regra 232), com "Alterar"; saíram `cartaoDaNota`, `salvarNotaDaAba` e o
  `#nota-salvar`. Pagamentos continua mostrando "nota fiscal enviada para …" em
  cada compra. Ajuda e Privacidade ajustadas ("muda no começo de cada compra").
  Sem SQL. Teste: `dados-para-nota.js` (29).
- **234 (10/11) — "Sair da conta" em vermelho e a nota do GuiaTennis.** "Deixe
  todos os sair da conta escrito em vermelho" e "criar algo para avaliarem,
  darem feedback e mostrar essa nota aos jogadores e principalmente aos
  parceiros para vender mais ... smp ser uma via de mão dupla". (1) Todo "Sair
  da conta" (menus, Minha conta, Perfil do Parceiros, painel do admin) com a
  classe `sair-vermelho` (`--red`). (2) **Nota do GuiaTennis**, como a nota de
  app na App Store/Google Play e o Trustpilot: 1 a 5 estrelas, "O que mais
  ajuda?"/"O que faltou?" em botões (`PONTOS_DO_GUIA`, como o iFood e o Uber),
  comentário opcional, "Pode mostrar" (jogador: "Gabi L."; parceiro: o nome
  da academia) e, com nota até 3, "Quero que o GuiaTennis fale comigo". Uma
  por conta e lado, que a pessoa muda quando quiser. Onde se avalia: Minha
  conta e Perfil do Parceiros ("Sua nota para o GuiaTennis", com a resposta e
  o "Você pediu, nós fizemos"), o pedido no Painel com as estrelas ali mesmo e
  "Agora não" (60 dias, `gt-nota-guia-adiada`), o link depois de avaliar uma
  academia e o rodapé. Onde aparece (a partir de 3 avaliações,
  `NOTA_DO_GUIA_MINIMO`): rodapé do site (jogadores), página de venda do
  Parceiros ("O que as academias acham do GuiaTennis", até 3 comentários com
  a resposta) e a página Plano (linha curta). Carrega sem segurar a página
  (`agendarNotaDoGuia`, troca só os pedaços `[data-nota-do-guia]`). Mão dupla:
  o obrigado diz o que acontece depois; nota alta do parceiro ganha a dica do
  QR code da ficha. Admin: aba **"Nota do GuiaTennis"** (`/admin/nota`): a média
  de cada lado, filtros (Sem resposta, Notas de 1 a 3), "Responder" (e-mail
  `resposta_do_guia`), "Você pediu, nós fizemos" (e-mail `feito_do_guia`) e
  "Tirar do site" (só o comentário; a nota continua contando); cada avaliação
  nova avisa o admin (`avaliacao_do_guia`). SQL `20261110140000_nota_do_guiatennis`.
  Termos e Privacidade (10 de novembro): nota sem filtro, sem pagamento nem
  vantagem por avaliação. Ajuda do Parceiros: "Como avalio o GuiaTennis?".
  Testes: `nota-do-guia.js` (novo), `banco-emails.py` (891), `painel-admin.js`
  (16 seções), `parceiros.js` (24 perguntas).
- **235 (10/11) — as avaliações do GuiaTennis abertas sem login** ("quero que
  aparece sem login sobre as avaliações"; escolhida a página pública, como a
  página de uma empresa no Trustpilot e as "Notas e avaliações" das lojas de
  apps). `/avaliacoes` (`renderPaginaDaNota`, `state.pagNota`): a nota de
  jogadores e de academias (a partir de 3), quantas de cada estrela (tocar na
  barra filtra), "% respondidas", "Avaliar o GuiaTennis" (pede conta), o
  "Você pediu, nós fizemos" sem dizer quem pediu, os comentários liberados de
  20 em 20 com a resposta, filtros por lado e estrela no link
  (`?de=jogadores|academias&estrelas=N`) e "Como funcionam estas avaliações".
  O "Ver mais" troca só o miolo. Links: "Ver as avaliações" no rodapé e "Ver
  todas as avaliações" na página de venda do Parceiros (abre em Academias).
  No Google: título próprio, canônico e no `sitemap()`; rota no
  `netlify.toml`. Privacidade (mesma data): onde o comentário aparece. Ajuda
  do Parceiros: o link da página. SQL `20261110150000_pagina_das_avaliacoes_do_guia`
  (`pagina_das_avaliacoes_do_guia`, pública, sem e-mail, conta, academia nem
  o que a pessoa marcou). Testes: `pagina-das-avaliacoes.js` (novo, 24, também
  no site montado), `banco-emails.py` (898), `nota-do-guia.js`, `parceiros.js`,
  `ficha-basica.js`, `regras-de-conteudo.js`, `voltar.js`, `chat-de-ajuda.js`.
- **236 (10/11) — as avaliações do GuiaTennis com e sem login** ("com e sem
  login"). A mesma página para todos; com conta, em cima, "Sua nota para o
  GuiaTennis" (`acoesDaPaginaDaNota`, como o "Sua avaliação" da App Store e do
  Google Maps), com a resposta e "Mudar a avaliação"; a conta da academia vê
  também "Sua nota como <academia>"; o admin vê "Responder no painel do admin"
  (`irAdmin("nota")`), sem "Avaliar". Depois de avaliar na página, o resumo e a
  lista vêm de novo. Caminhos: "Avaliações" no menu (`data-menu="avaliacoes"`,
  todos), "Ver as avaliações do GuiaTennis" na Minha conta e no Perfil do
  Parceiros (`cartaoMinhaNotaDoGuia`, com `momento`) e "Ver as avaliações" na
  linha da nota em Plano. Sem SQL. Testes: `pagina-das-avaliacoes.js` (37),
  `nota-do-guia.js`, `parceiros.js`, `jogador.js`, `perfil-e-avaliar.js`,
  `plano-e-creditos.js`, `painel-admin.js`, `voltar.js`, `chat-de-ajuda.js`.
- **237 (10/11) — reserva online na ficha** ("eu queria poder implementar
  sistema de reserva para não perder para concorrentes, eu consigo trazer outro
  sistema e fazer que consigam visualizar no site?"; das três opções, "começar
  pelo 1 e 2"). (1) A academia cola em Minha ficha › Contato o **link do sistema
  de reservas** que já usa (`f-reserva`, `linkDeReserva`: só https, até 300;
  coluna `reserva_link`), e a ficha ganha **"Reservar online"** (`botaoReservar`:
  primeiro botão do Contato e do cartão ao lado, e "Reservar" na barra de baixo,
  com o WhatsApp como segundo botão), como o trivago e o "Reservar" do Perfil da
  Empresa no Google. (2) Se o sistema está em `SISTEMAS_COM_AGENDA` (Calendly,
  Cal.com, Google Agenda, Acuity, Setmore, SimplyBook.me: os que oferecem a
  agenda para incorporar; a rede daqui não deixou conferir os cabeçalhos,
  **testar na prévia com um link de verdade**), a agenda abre numa **janela
  dentro do site** (`janelaDaReserva`, `#reserva-janela`, **fora do `#app`**
  para o `render()` não recarregar a agenda; `sandbox` sem sair do site; só
  carrega no toque; camada `?reserva=1`, o "voltar" fecha; "Abrir em outra
  aba" sempre); nos outros sistemas, o link abre em outra aba. **Só Completo e
  Premium** (`LIMITES_DO_PLANO.contatos` com `"reserva"`, como Instagram e
  site; a revisão do cadastro avisa no Básico). O GuiaTennis não faz a reserva
  nem recebe o pagamento (dito na ficha, na janela, nos Termos e na
  Privacidade, mesma data). Clique `reserva` (`TIPOS_DE_CONTATO`): conta como
  contato, canal "Reserva online" no Desempenho, no admin e no resumo do mês
  do Premium, e entra em "Academias que você chamou". Chat: `reservar`
  (jogador) e `reserva-pc` (Parceiros); ajuda do Parceiros "Como mostro a
  reserva online na ficha?"; linha nova na tabela dos planos. SQL
  `20261110160000_reserva_online` (coluna, trava e regra dos cliques,
  `numeros_completos_da_academia`, `numeros_da_academia`,
  `estatisticas_publicas` e `preparar_resumos_do_mes` refeitas a partir do que
  estava no banco). Testes: `reserva-online.js` (novo, 23), `banco-emails.py`
  (908) e os afetados (lista na descrição do PR).
- **238 (11/11) — Feedback no lugar das avaliações do GuiaTennis** ("renomeie a
  página de avaliação para feedback, a página de obrigado deixar mais
  centralizada e mudar avaliação para editar avaliação, deixe a primeira página
  mais simples algo com uma cara mais técnica e a nota não mostrar por agr em
  nenhum lugar e só quem vê sou eu e entrando na página de feedback ver a que
  fez e a minha resposta, não precisa falar como elas funcionam nessa página").
  Desfaz a parte pública das regras 234 a 236. (1) **`/feedback`**
  (`renderPaginaDeFeedback`, `corpoDoFeedback`; o `/avaliacoes` abre ela; menu e
  rodapé "Feedback"; `noindex`): sem login, "Enviar feedback" (pede para
  entrar); com conta, o próprio feedback (`cartaoMinhaNotaDoGuia`, "Seu feedback
  para o GuiaTennis"; na academia, "Feedback da <academia>") com a resposta, o
  "Você pediu, nós fizemos" e **"Editar avaliação"**; o admin, "Ver os feedbacks
  no painel do admin". Sem lista dos outros, sem nota, sem explicação. (2) **A
  nota não aparece em lugar nenhum** (rodapé, página de venda do Parceiros,
  Plano): `carregarNotaDoGuia` só para o admin, e o banco só a devolve ao admin.
  Sem "Pode mostrar o meu comentário" (vai `false`); sem "Tirar do site" no
  admin. Admin: a aba virou **"Feedback"**, com "A nota (só você vê)". (3) **A
  primeira tela da folha** (`renderNotaGuiaSheet`): "Enviar feedback" (ou
  "Editar avaliação"), de quem é, rótulos em maiúsculas, a **escala de 1 a 5 com
  números** (`escalaDaNota`, também no pedido do Painel), "O que mais ajuda"/"O
  que faltou", "Comentário (opcional)", "Enviar" (ou "Salvar"). (4) **O obrigado
  centralizado** (`.nota-guia-fim`, com o ✓). Termos ("Feedback ao
  GuiaTennis"), Privacidade e ajuda do Parceiros ("Como mando feedback ao
  GuiaTennis?"), mesma data. SQL `20261111120000_feedback_so_o_admin_ve`.
  Testes: `nota-do-guia.js` (reescrito, 37), `banco-emails.py` (908; a seção da
  regra 235 virou a da 238); `pagina-das-avaliacoes.js` saiu.
- **239 (11/11) — a nota do feedback com estrelas** ("mas pode deixar como
  estrela nessa página"): `escalaDaNota` volta às 5 estrelas (na folha e no
  pedido do Painel), alinhadas à esquerda embaixo de "Nota", com "4 de 5 · Bom"
  ao lado; o cartão do próprio feedback mostra as estrelas. O resto da regra 238
  fica. Sem SQL. Teste: `nota-do-guia.js` (37). Na mesma conversa, o Breno
  perguntou se o site pode buscar o catálogo (valores por hora e promoções) no
  sistema de reservas da academia: resposta dada, só por integração oficial
  (API com autorização da academia), não lendo a página.
- **240 (11/11) — sem API de reservas por enquanto; o WhatsApp continua o
  principal** ("não quero fazer uma api por enquanto, deixe com o botão reservar
  em prioridade depois do whatsapp na visualização"). Na ficha (Contato, cartão
  ao lado e barra de baixo) e na prévia do cadastro: "Chamar no WhatsApp"
  primeiro e principal (verde cheio), "Reservar online" logo depois, em
  segundo; sem WhatsApp, a reserva vira a principal. **Não puxar o assunto da
  API/catálogo do sistema de reservas** até o Breno pedir. Sem SQL. Testes:
  `reserva-online.js` (24), `ficha-hoteis.js`, `previa-da-ficha.js`.
- **241 (11/11) — "Reservar online" antes do WhatsApp** ("antes do whatsapp no
  caso, aparecer reservar se tiver"): a 240 foi entendida ao contrário. Volta a
  ordem da 237 e a barra de baixo também: com o link, "Reservar online"
  primeiro e principal (verde cheio) no Contato, no cartão ao lado, na prévia
  do cadastro e na barra de baixo ("Reservar" e depois "WhatsApp"); o WhatsApp
  logo depois, em segundo. Sem o link, o WhatsApp é o principal, como antes.
  Sem API por enquanto (240). Sem SQL. Testes: `reserva-online.js` (24),
  `ficha-hoteis.js`, `previa-da-ficha.js`.
- **242 (11/11) — "Reservar online" também no mapa e na lista** ("na
  visualização do mapa e lista aparecer reservar se tiver, se não whatsapp"): o
  cartão do mapa (`cartaoDoMapa`, `.mcard-wa`) e o da lista (`renderCard`,
  `.offer-contact`) mostram "Reservar online" (com o link, `data-reservar`: a
  agenda abre na janela sem sair da busca) quando a academia tem o link;
  senão, "Falar no WhatsApp", como antes. O clique conta como `reserva`.
  `ligarReserva(holder)` liga os cartões do mapa. Sem SQL. Testes:
  `reserva-online.js` (28), `ver-no-mapa.js`, `busca-e-ficha.js`,
  `lista-de-20.js`, `convite-chamadas.js`, `comparar-e-avisos.js`.
- **243 (11/11) — a aba Feedback no Parceiros** ("faça a aba de feedback no
  parceiros"): `/parceiros/feedback` (`pcFeedback`; "Feedback" no menu, depois
  de Pagamentos; `PC_PRIVADAS`; sem função de equipe, todo acesso vê), com o
  feedback da academia (`cartaoMinhaNotaDoGuia("parceiro", …, "pagina-feedback")`,
  título "Feedback da <academia>" com `pc-card-t`): a nota da própria academia,
  o comentário, a resposta, o "Você pediu, nós fizemos" e "Enviar feedback" ou
  "Editar avaliação". O cartão saiu do Perfil. Admin vendo como academia: o
  aviso de que os feedbacks ficam no painel. Chat (`CHAT_PAGINAS_PC`) e ajuda
  ("Como mando feedback ao GuiaTennis?") apontam para a aba. Sem SQL. Testes:
  `nota-do-guia.js` (40), `parceiros.js` e `funcoes-da-equipe.js` (menu com
  Feedback), `chat-parceiros.js`, `acesso-academia.js`, `dicas-do-parceiros.js`,
  `varias-academias.js`, `voltar.js`, `links.js`, `sem-explicacao.js`.
- **244 (11/11) — a autorização para usar o feedback na divulgação** (o Breno
  perguntou se a Privacidade dizia que o feedback podia ser usado para divulgar
  o site; não dizia, e pela LGPD precisa do consentimento da pessoa; "sim, pode
  fazer"). Na folha do feedback, depois do comentário, a caixa **opcional e
  desmarcada** `#nota-guia-mostrar` ("Autorizo o GuiaTennis a usar o meu
  comentário na divulgação do site e das redes sociais, com o meu primeiro nome e
  a inicial do sobrenome (opcional)"; na academia, com o nome dela), gravada em
  `pode_mostrar` (coluna que já existia; na edição vem como estava). O cartão do
  próprio feedback diz "Você autorizou… Para tirar a autorização, toque em
  Editar avaliação". No admin (aba Feedback), cada comentário mostra **"Pode
  divulgar"** (com o nome que vai junto) ou "Não autorizou a divulgação", e a
  nota no fim diz para usar só os marcados. Termos e Privacidade (**11 de
  novembro de 2026**): o comentário só vai para a divulgação (site, redes,
  anúncios) com essa autorização (base legal: consentimento), retirável em
  "Editar avaliação"; a nota média, sem nomes, pode aparecer no site no futuro.
  Ajuda do Parceiros também. Sem SQL. Testes: `nota-do-guia.js` (44) e os que
  conferem a data (`avaliacao-editada.js`, `ficha-basica.js`,
  `regras-de-conteudo.js`, `pixel-da-meta.js`, `dados-para-nota.js`),
  `parceiros.js`, `painel-admin.js`. Depois, o Breno pediu "faça isso para as
  academias tbm" e, perguntado, respondeu "os jogadores e parceiros marcarem
  como opcional a autorização da divulgação do feedback": já era assim (a caixa
  aparece também no feedback da academia, com o nome dela); nada mudou.
- **245 (11/11) — o Feedback no rodapé do Parceiros, na coluna GuiaTennis** ("no
  rodapé deixe o feedback na seção do site"): `pcRodape` tira "Feedback" da
  coluna "Sua academia" e o coloca na coluna "GuiaTennis", depois de "Site para
  jogadores" (só com a conta da academia). Sem SQL. Testes: `nota-do-guia.js`
  (45), `parceiros.js`, `funcoes-da-equipe.js`.
- **246 (11/11) — o feedback de cada lado no seu site** ("feedback de jogadores
  ou parceiros aparecer em cada site separados"): `/feedback` (site dos
  jogadores, `corpoDoFeedback`) mostra só o feedback do jogador; a conta da
  academia vê ali só o link "O feedback da academia fica no GuiaTennis Parceiros
  › Feedback" (abre na aba do Parceiros, como os outros links para lá). O
  Parceiros › Feedback já mostrava só o da academia. Termos e Privacidade dizem
  onde cada um vê (mesma data, 11/11). Sem SQL. Testes: `nota-do-guia.js` (47),
  `parceiros.js`, `ficha-basica.js`, `regras-de-conteudo.js`.
- **247 (11/11) — o WhatsApp de volta no "Fale com a gente"** ("no fale com a
  gente pode voltar o whatsapp e deixe o chat com a mesma do layout"):
  `CONTATOS_GUIA` = Chat de ajuda, **WhatsApp** (`whatsappGuia()`, sem mensagem
  pronta), Instagram e E-mail, no rodapé e na folha do menu ("Fale direto com o
  GuiaTennis"; o texto da folha não diz mais que o chat leva ao WhatsApp do
  Breno). No rodapé, o "Chat de ajuda" (um botão) ganhou o mesmo jeito dos
  links: ícone, espaço, altura e cor iguais. Sem SQL. Testes: `ficha-basica.js`
  (40), `chat-de-ajuda.js`, `menu-e-home.js`.
- **248 (11/11) — Sobre o GuiaTennis e o menu do Parceiros mais curto** ("do
  parceiros, tire o slot feedback do menu junto com a academia e tire o pq do
  GuiaTennis no menu do parceiros acho legal criar uma página falando sobre a
  gente ou o nome que os sites grandes dão"): página **Sobre o GuiaTennis**
  (como o "Sobre o Google", o "Sobre a Booking.com" e o "Sobre nós" do Nubank),
  `corpoSobre(parceiros)`: missão, o que fazemos (para quem joga e para as
  academias), o que não fazemos, quem paga o quê ("Patrocinado", "Melhores
  avaliadas" só pela nota), compromissos (avaliações, informação conferida,
  privacidade, com os links da Política e dos Termos), os números
  (`numerosDoSite`, só acima do mínimo), o contato e, no fim, "Buscar quadra"
  (jogadores) ou "Cadastrar minha academia" (Parceiros sem conta). Em `/sobre`
  (`goSobre`, `renderPaginaSobre`, no Google e no `sitemap.xml`; link no rodapé,
  coluna Suporte) e em `/parceiros/sobre` (`pcSobre`, no fim do menu e no rodapé,
  coluna GuiaTennis; `noindex`, endereço oficial `/sobre`). No Parceiros, o
  "Benefícios" (a parte "Por que estar no GuiaTennis") saiu do menu e do alto
  (continua na página inicial e no rodapé) e o "Feedback" saiu do menu e do alto
  (`foraDoMenu`; fica no rodapé e no cartão do Painel). Chat do Parceiros leva à
  página ("quem somos", "sobre nós"). Sem história da fundação (falta o texto do
  Breno). Sem SQL. Testes: `sobre.js` (20, novo), `parceiros.js` (158),
  `nota-do-guia.js` (47), `chat-parceiros.js`, `menu-e-home.js`, `links.js`,
  `funcoes-da-equipe.js`, `ficha-basica.js`.
- **249 (12/11) — a história do Breno no Sobre o GuiaTennis** ("uma parte minha
  e outra do GuiaTennis, em primeira pessoa para mim e terceira pessoa para o
  GuiaTennis"): `corpoSobre` agora tem "O que é o GuiaTennis" (o que oferece),
  **"Por que criei o GuiaTennis"** (primeira pessoa, assinada "Breno Coppini,
  Criador do GuiaTennis", com a borda dourada à esquerda: professor desde 2022,
  quase sempre no Morumbi, torneios na 3ª classe; cursos com Gui Teixeira (alto
  rendimento), Juan Martín del Potro (do juvenil ao profissional) e Carla Di Pierro
  (saúde mental na psicologia do esporte), pedido de 12/11; em setembro de 2026 um aluno
  perguntou por quadras em Perdizes; faltava um lugar só; quer mudar a forma de
  achar quadras e chegar ao mundo todo "não para sermos reconhecidos"), "Para
  quem é" (quem começa, quem joga, quem viaja, as academias), "A missão do
  GuiaTennis", "O que o GuiaTennis não faz" (com o porquê dele: "serviço gratuito
  a quem joga, mais rápido e acessível"), "Quem paga o quê", "Compromissos do
  GuiaTennis" (tudo do GuiaTennis em terceira pessoa). Saiu "O que fazemos". Sem
  SQL. Testes: `sobre.js` (20).
- **250 (12/11) — a caixa "Esta página ajudou você?" e textos corrigidos**: antes
  do rodapé, em todas as páginas dos dois sites (`caixaDeFeedback`, como o GOV.UK,
  o Google e a Apple), "Esta página ajudou você? Se algo precisa melhorar, conte
  para a gente." e "Faça o seu feedback" (leva ao Feedback de cada site; some na
  própria página Feedback). Rodapé dos jogadores: a coluna "Feedback" virou
  **"GuiaTennis"**, com "Sobre o GuiaTennis" e "Feedback" (o Sobre saiu de
  Suporte), como no Parceiros; no menu, "Sobre o GuiaTennis" junto do "Feedback".
  "Como funciona a ordem" e o chat: as "Patrocinado" também ficam perto do
  endereço buscado (a até 10 km) e atendem aos filtros. Dicas: "Saibro ou rápida,
  coberta ou descoberta, aula ou locação" (sem estacionamento e vestiário) e "diga
  se procura aula ou locação, qual é o seu nível e quais dias e horários prefere.
  Assim, a academia responde mais rápido." Correção: "Vai direto para o ar". Sem
  SQL. Testes: `sobre.js` (28), `nota-do-guia.js`, `premium-patrocinado.js`,
  `buscas-e-avisos.js`, `menu-e-home.js`, `parceiros.js`, `links.js`,
  `chat-de-ajuda.js`.
- **251 (12/11) — o chat com o GuiaTennis: erros, sugestões e respostas do admin**
  (opção A: "acompanhar com os clientes como eles estão trabalhando para
  corrigir"; e "quero poder ter acesso as conversas do chat como admin e até
  poder enviar mensagens"). No chat, os assuntos **"Informar um erro"** e **"Dar
  uma sugestão"** (`relato` em `CHAT_TEMAS`; "Algo não funcionou" também oferece
  "Informar o erro"): o chat pede o texto (`pedirRelato`, `receberRelato`), manda
  com a página (só o endereço) e a conversa (`enviar_relato_do_chat`, até 10 por
  dia) e confirma; sem conta, pede para entrar. A página **Feedback** (jogadores) e
  o **Parceiros › Feedback** ganham **"Erros e sugestões"** (`blocoDosRelatos`):
  cada relato com a situação em passos (erro: Recebido › Em correção › Corrigido;
  sugestão: Recebida › Em andamento › No ar; ou "Não vamos fazer agora"), "Ver a
  conversa" e "Informar um erro ou dar uma sugestão". Admin: aba **Chat de ajuda**
  (`admChatHtml`): os relatos (em aberto primeiro, a situação em botões; cada
  mudança manda e-mail) e as conversas guardadas; tocar abre a conversa inteira e
  **"Responder no chat"** (`responder_no_chat`): a resposta fica na conversa com
  "Breno, do GuiaTennis" e borda dourada (`de: "equipe"`; o banco só aceita a
  resposta que existe em `respostas_no_chat`, com o texto dele), vai por e-mail
  com o link `?chat=<id>` (abre a conversa; sem conta, pede para entrar), e o site
  avisa "O GuiaTennis respondeu no chat" (dica que só sai pelo ✕); com o chat
  aberto, a resposta chega sozinha a cada 20 s; abrir marca como lida. A nota do
  chat com conta: "A conversa fica guardada na sua conta, e o GuiaTennis pode
  responder por aqui." Termos e Privacidade (**12 de novembro de 2026**): o
  GuiaTennis lê as conversas guardadas para responder e melhorar o site; o relato
  guarda a página, a situação e as datas, com e-mail a cada mudança. FAQ do
  Parceiros "Encontrei um erro ou tenho uma sugestão. Como aviso?". SQL
  `20261112120000_chat_com_o_guia_e_relatos` (tabelas `relatos_do_chat` e
  `respostas_no_chat`, `guardar_conversa_de_ajuda` aceita `equipe`, funções do
  admin, e o **/sobre no sitemap**, que sai do banco: o `sitemap.xml` do
  repositório é só reserva). Testes: `chat-com-o-guia.js` (29, novo),
  `banco-emails.py` (930, seção nova), `chat-de-ajuda.js`, `chat-na-conta.js`,
  `painel-admin.js` (17 seções), `parceiros.js` (26 perguntas) e os que conferem a
  data.
- **252 (12/11) — revisão do português em todo o site** ("seu nível e o dia e o
  horário que prefere isso segue a gramática do português? ... corrija em todos
  os lugares mas tbm deixe de forma natural e formal juntas"; "pode gastar meu
  limite fazendo a revisão"): os 3.125 textos visíveis passaram pelo LanguageTool
  (pt-BR, baixado pelo Maven e rodado no contêiner) e por leitura inteira, com
  Termos e Privacidade. Corrigido: "pôr/põe/ponha/pôs" (7 lugares, inclusive o
  passo "Incluiu na comparação" do percurso), "pra" (6), crase ("responder à"),
  "avalia ela" → "avaliá-la", "te" com "você", regência ("de que você gostou",
  "em que você joga", "pelas quais você responde"), "favoritou", "Peça que…",
  vírgula depois de "por exemplo", frases soltas dos Termos ("Trocou, o nome
  volta…", "Digitado o código" depois de vírgula), "Melhores avaliadas" → **"Mais
  bem avaliadas"**, "Ex.:", "…" e "como no Google" (o site não se compara).
  Termos e Privacidade também ficaram em dia com o que o site faz (o WhatsApp "em
  confirmação" e as avaliações de conta excluída como "Usuário do GuiaTennis").
  Os e-mails (no SQL) não entraram. Testes: a bateria completa.
- **253 (12/11) — os rodapés com Suporte e GuiaTennis** ("o feedback e chat de
  ajuda pode se enquadrar no suporte e criar uma seção com GuiaTennis e aparecer
  o sobre nós, Instagram, whatsapp e email"), como o rodapé do Nubank. Jogadores:
  **Suporte** = Como funciona a busca, Chat de ajuda, Feedback, GuiaTennis
  Parceiros (e o painel da academia); **GuiaTennis** = Sobre nós, Instagram,
  WhatsApp e E-mail, com o logo pequeno (`linksDoGuia`); a coluna "Fale com a
  gente" saiu (a folha do menu continua). Parceiros: **Suporte** = Perguntas
  frequentes, Chat de ajuda, Feedback (com a conta); **GuiaTennis** = Sobre nós,
  Instagram, WhatsApp, E-mail e Site para jogadores; **Termos e políticas** numa
  coluna própria. A página continua "Sobre o GuiaTennis"; no rodapé, "Sobre nós".
  Sem SQL. Testes: `sobre.js` (28), `nota-do-guia.js`, `ficha-basica.js`,
  `chat-de-ajuda.js`, `parceiros.js`, `funcoes-da-equipe.js`, `menu-e-home.js`,
  `chat-na-conta.js`, `chat-com-o-guia.js`, `links.js`.
- **254 (12/11) — a ordem dos rodapés** ("deixando termos e política por último,
  no meio suporte, e a segunda guia tênis"): jogadores = Quadras por cidade,
  **GuiaTennis**, **Suporte**, **Termos e políticas**; Parceiros = Sua academia,
  GuiaTennis, Suporte, Termos e políticas. Sem SQL. Testes: `sobre.js`,
  `nota-do-guia.js`, `ficha-basica.js`, `parceiros.js`, `chat-de-ajuda.js`.
- **255 (12/11) — a página Sobre sem "cara de IA"** ("a página de sobre o
  GuiaTennis está com cara de ia"): `corpoSobre` virou uma página só de texto,
  como uma carta (o "Sobre" do Airbnb e do Nubank): o olho "Sobre o GuiaTennis",
  o título em Playfair **"Um guia de quadras de tênis feito por um professor"**, a
  frase de abertura (nasceu em setembro de 2026, em São Paulo, de uma pergunta de
  aluno sobre Perdizes), a carta do Breno em primeira pessoa (com os cursos) e a
  assinatura "Breno Coppini, Professor de tênis e criador do GuiaTennis"; depois,
  em terceira pessoa e separadas por uma linha fina: "O que o GuiaTennis faz"
  (com para quem é, em texto corrido), "Grátis para quem joga" (o que não faz e
  quem paga), "Compromissos" (lista simples) e "Fale com a gente" (links em
  texto). Saíram os cartões, os ícones, a grade "Para quem é", a missão em
  fórmula e os números. Sem SQL. Testes: `sobre.js` (30, confere que a página não
  tem cartão, ícone, grade nem número).
- **256 (12/11) — o Sobre em abas** ("vá atrás da página de sobre nós do trivago e
  faça parecido com abas entre equipe, sobre o site algo do tipo"): embaixo do
  título e da frase de abertura, as abas sublinhadas **Nossa história** (a carta
  do Breno, curta, com a assinatura), **O site** (o que faz, grátis para quem
  joga, compromissos, Termos e Privacidade), **Equipe** (Breno Coppini, "Fundador
  e criador do GuiaTennis", com a formação e os cursos; "É quem responde o chat de
  ajuda e conversa com as academias") e **Contato** (Chat de ajuda, WhatsApp,
  Instagram e E-mail, cada um com para que serve, `PARA_QUE_SERVE_O_CONTATO`, e o
  link do Parceiros). Nos jogadores, cada aba tem o endereço (`/sobre`,
  `/sobre/site`, `/sobre/equipe`, `/sobre/contato`, `SOBRE_ABAS`,
  `caminhoDoSobre`; o "voltar" volta à aba; redirect `/sobre/*` no
  `netlify.toml`); no Parceiros, a aba muda só na tela. Continua só texto. Sem
  SQL. Testes: `sobre.js` (37), `links.js`, `voltar.js`, `menu-e-home.js`.
- **257 (12/11) — o Sobre como um site à parte** ("eles fazem algo como mudando de
  página com outro menu e uma cara parecida, com o menu sendo diferente permitindo
  essa navegação, com cores diferentes e sendo um pouco mais atrativo para vender
  e não brincar, se deslizar para baixo a página inteira pode ir navegando os
  tópicos do menu"): `corpoSobre` tem o **menu próprio, fixo no alto** (`sb-topo`,
  verde-escuro `#163A2D`: "GuiaTennis | SOBRE", "Buscar quadra" em dourado e as
  partes Nossa história, O site, Equipe, Contato), no lugar do cabeçalho do site;
  o **topo verde-escuro** com o título grande e os botões "Buscar quadra" e
  "Tenho uma academia" (no Parceiros, "Cadastrar minha academia" e "Ver os
  planos"); as **partes numa página só**, com fundos alternados (creme, branco,
  creme e o Contato no verde-escuro), a frase em destaque à esquerda no
  computador, três colunas em "O site" (Perto de você, Lado a lado, Direto com a
  academia, com o traço dourado em cima, sem ícone), a faixa "Grátis para quem
  joga" e a faixa verde dos números (só com os números acima do mínimo). Tocar no
  menu rola até a parte; **rolar acende a parte no menu** (`IntersectionObserver`,
  `marcarParteDoSobre`) e troca o endereço sem encher o histórico (`/sobre`,
  `/sobre/site`, `/sobre/equipe`, `/sobre/contato`; o link direto rola até a
  parte). Largura toda, como o Parceiros (`pc-cheio`). O `/parceiros/sobre` usa o
  mesmo, com o rodapé do Parceiros. Sem animação de entrada. Sem SQL. Testes:
  `sobre.js` (40), `links.js`, `voltar.js`, `menu-e-home.js`, `parceiros.js`,
  `nota-do-guia.js`.
- **258 (13/11) — o português dos e-mails** ("sim", à oferta de revisar os
  e-mails como na regra 252): as 65 funções que montam e-mails foram lidas, e 18
  mudaram, no SQL `20261113120000_portugues_dos_emails` (cada uma é a versão mais
  nova, só com o texto trocado). Corrigido: "pôs o WhatsApp" → "informou o
  WhatsApp"; "Responder a avaliação" → **"Responder à avaliação"**; "esse
  acompanhamento" → "este acompanhamento"; frases soltas ("Recusado, volta…" → "Se
  for recusado, volta…"; "Trocou, ele volta…" → "Depois da troca, ele volta…";
  "confirmado, o código dele sai…" → "assim que confirmar, o código sai…"); "nem
  nada que a lei brasileira proíba"; "Se não a conhece, recuse"; "de quem jogou na
  academia?"; "fechou de fato"; "o site pergunta"; "volta a ser enviado"; "no
  começo de cada mês"; "Acha que foi um engano? Fale com o GuiaTennis pelo chat";
  "ignore este e-mail"; "poderia melhorar"; "conversou pelo chat de ajuda"; "entre
  em contato". O link do aviso de responsável principal vai a `/parceiros/acessos`.
  Equipe só com o Breno e reserva só pelo link (respostas da seção 9). Testes:
  `banco-emails.py` (seção "Português dos e-mails", 953 conferências).
- **259 (13/11) — a fonte do aparelho no site inteiro** ("eu gosto das cores
  atuais do verde escuro um amarelo meio dourado, me de mais estilos de fontes
  para a logo mas seria interessante usar a fonte do celular no site inteiro"):
  `--fonte-texto` e `--fonte-titulo` com `-apple-system, BlinkMacSystemFont,
  'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` (sai a Inter e a
  Playfair dos títulos; `.display` com `letter-spacing: -0.01em`), como o
  Booking e o GitHub. O nome no logo (topo, menu, Parceiros, Sobre, admin,
  rodapé e a prévia do e-mail) ganhou a classe `logo-nome` com `--fonte-logo`
  (Playfair até a escolha), e o Google Fonts baixa só as letras de "GuiaTennis"
  (`text=GuiaTennis`). O "P" do estacionamento e o `404.html` também na fonte do
  aparelho (o 404 não baixa fonte nenhuma). Cores mantidas. Sem SQL. Testes:
  `fonte-do-aparelho.js` (novo, 6), `contestar-passo-a-passo.js`,
  `veracidade.js`, `sobre.js`, `menu-e-home.js`, `parceiros.js`.
- **260 (13/11) — o nome do logo em Poppins, verde e dourado** ("gostei da poppins
  e fica legal com e verde amarelo na escrita"): "GuiaTennis" em Poppins Bold
  virou desenho (`NOME_DO_LOGO`, `nomeDoLogo()`, depois do `LOGO-FIM`; caminhos
  tirados da fonte com fontTools e HarfBuzz, com o acerto entre o "T" e o "e"),
  com "Guia" em `currentColor` (verde no topo, no menu e no Parceiros; branco no
  rodapé, no Sobre e no admin) e "Tennis" em `--gold` (`.logo-nome-tennis`); altura
  `0.81em`, o texto "GuiaTennis" escondido (`.so-leitor`) para leitor de tela e
  Google. Saíram o Google Fonts e o `--fonte-logo`: **o site não baixa fonte
  nenhuma**. Nos e-mails, o nome no alto em Arial negrito, "Guia" verde e "Tennis"
  dourado (antes Georgia toda verde), e a prévia do e-mail no Parceiros igual. SQL
  `20261113130000_nome_do_logo_nos_emails`. Testes: `fonte-do-aparelho.js` (7),
  `promocoes-por-email.js` (o título do leilão na fonte do aparelho), `menu-e-home.js`,
  `parceiros.js`, `sobre.js`, `links.js`, `contestar-passo-a-passo.js`,
  `veracidade.js`; `banco-emails.py` (953).
- **261 (13/11) — "Como funciona" do Parceiros sem acender** ("no parceiros deixe
  o como funciona sem brilhar ao descer"): a parte `#pc-como` da página inicial do
  Parceiros saiu do efeito de acender ao descer (sem `revela()`: o título, os
  quatro passos e o "Começar agora" aparecem parados, sem o brilho dourado nos
  números). O resto da página continua acendendo. Sem SQL. Testes:
  `parceiros-acender.js` (10), `comparar-e-avisos.js`, `parceiros.js`.
- **262 (13/11) — o cabeçalho do Sobre no padrão e o menu de 3 listras** ("tire a
  escrita de GuiaTennis parceiros no início e o GuiaTennis naquele quadro do
  jogadores, centralize melhor o título, corrija o cabeçalho do sobre nós, não está
  como o padrão e deixe o menu com as 3 listras na lateral com opção para buscar
  quadras e pro parceiros junto com as divisórias do sobre nós"). **Sobre:** o
  `.sb-topo` agora é o cabeçalho padrão (fundo claro, o logo do tamanho do
  Parceiros com o selo "Sobre"; antes o `.sb-marca svg` encolhia também o nome do
  logo para 30 px) e, à direita, o **menu de 3 listras** (`#sobre-menu-btn`), que
  abre na lateral (`#sobre-gaveta`): "Sobre o GuiaTennis" com Nossa história, O
  site, Equipe e Contato (`.sb-nav-i`, a parte da tela acesa com o traço dourado),
  uma divisória, **Buscar quadras** e **GuiaTennis Parceiros** (no
  `/parceiros/sobre`, "Buscar quadras" abre o site dos jogadores). Fecha no ✕, no
  fundo, no Esc e ao escolher. Saíram a barra de abas e o botão dourado do alto.
  **Parceiros:** sem o "GuiaTennis Parceiros" acima do título da página inicial e
  sem o "O GuiaTennis hoje" no quadro dos jogadores, com o título do quadro
  centralizado e em linhas equilibradas (`text-wrap: balance`). Sem SQL. Testes:
  `sobre.js` (43), `parceiros-acender.js` (11), `parceiros.js`, `menu-e-home.js`,
  `links.js`, `voltar.js`, `confianca-na-ficha.js`, `nota-do-guia.js`,
  `comparar-e-avisos.js`, `fonte-do-aparelho.js`.
- **263 (13/11) — o sistema de design no site inteiro** ("faça o melhor trabalho
  sendo esse responsável de design… nada aglomerado, limpo"; depois do protótipo,
  "EM TUDO, NO GERAL"). **Em todo o `<style>`:** tokens novos `--green-dark`
  (`#163A2E`, um só verde de fundo escuro), `--gold-text` (`#7A5E1E`, dourado de
  texto com 4,5:1), `--shadow-lg` e `--shadow-drawer`; 24 cores soltas viraram
  tokens (os 12 verdes parecidos, os dourados de texto, os cinzas); **letras só em
  12, 13, 14, 15, 16, 18, 22, 28 e 36** (216 trocas; nada abaixo de 12; acima de
  36 só números grandes); **cantos só em 8, 12, 16 e pílula** (149 trocas); 19
  sombras de elevação viraram `--shadow`/`--shadow-lg`/`--shadow-drawer`; os selos
  dourados (`.card-badge`, `.rcard-tag`, `.pc-beneficio-tag`, `.mini-badge`) com
  texto escuro. **Página inicial:** "Aula e quadra de tênis perto de você", a frase
  antes da busca, "Aula e locação | Aulas | Locação" lado a lado
  (`data-sc-modalidade`, no lugar do `<select id="sc-modalidade">`), "Buscar
  academias" (era "Pesquisar"; chat de ajuda e o desenho da busca também), "Grátis
  para quem joga. Sem cadastro e sem taxa." e as recomendadas em lista (`#home-
  recomendadas`, foto pequena à esquerda). **Cartão da busca:** sem a fileira de
  estrelas (a nota está no quadrado) e sem o compartilhar (fica na ficha); a nota
  no quadrado verde com o canto de baixo reto, como o Booking. **No alto:**
  "Entrar" escrito, sem o ícone piscando (desfaz o pedido de 05/10, aprovado no
  protótipo). O botão Lista/Mapa flutuante e a barra de baixo da ficha já existiam.
  A ficha na ordem da decisão e as ações da lista enxutas entraram na regra 264. **Bateria completa de 13/11 (regra 263): 2.570 verificações, nenhuma
  falha** (3 testes com o texto, a cor e o tamanho antigos, corrigidos). O Breno mudou no sistema de design a cor de erro para `#E63D10`
  (4,2:1 com branco); o site segue com `#A8462C` até ele confirmar. Sem SQL.
- **264 (13/11) — a ficha na ordem da decisão e a busca menos cheia** ("na verdade
  eu gostei sim, mas acho que dá pra alterar mais coisa fazendo um bom trabalho";
  antes, "Não gostei muito… deixe a procura de aulas como estava", desfeito na
  hora: a busca da página inicial fica como na regra 263). **Ficha:** destaques ›
  **Opções para jogar (preços)** › Contato (logo depois das opções, como pedido em
  26/10) › **Horário** › Estrutura › Sobre › Explore a região › Cancelamento ›
  **Avaliações** › Dúvidas › Academias por perto › fim; as abas na mesma ordem
  (Preços, Horário, Estrutura, Visão geral, Localização, Cancelamento, Avaliações,
  Dúvidas). Desfaz a ordem da regra 189 (estrutura e "Sobre" primeiro, região logo
  depois das opções), como no protótipo aprovado. **Busca:** "Mandar para o meu
  WhatsApp", "Falar com todas" e "Salvar os contatos" ficam num botão
  **"WhatsApp ▾"** (`details.wa-mais`, menu à direita) ao lado do "Salvar busca";
  na comparação e nas Favoritas continuam soltos; sai a frase "Guarde o lugar e
  os filtros…" ao lado do "Salvar busca". Sem SQL. Testes: `ficha-hoteis.js`,
  `whatsapp-das-academias.js` (abre o menu antes), `cadastro.js`, `catalogo.js`,
  `promocoes.js`, `reserva-online.js`, `busca-e-ficha.js`, `previa-da-ficha.js`.
- **265 (13/11) — a análise de conteúdo aplicada** ("de aplicar tudo na prévia do
  conteúdo… tudo faz sentido"). **Glossário:** a busca conta academias ("2
  academias", "Nenhuma academia com esses filtros"); ordem "Recomendadas", "Mais
  bem avaliadas", "Mais avaliadas"; "Chamar no WhatsApp" no lugar de "Falar" e
  "Perguntar"; "alugar" no lugar de "locar"/"loque"; "Sem avaliações ainda" no
  lugar de "Sem nota ainda" e "Seja o primeiro a avaliar"; sem o traço "—" no
  lugar da nota (o `sbadge` só aparece com nota). **Preço:** " por hora" e " por
  aula" (`curto`), "a partir de R$ X por hora", "Até R$ X por hora". **Ficha:**
  "N quadras" (sem "Quadras — N no total"); "A academia ainda não informou a regra
  de cancelamento. Pergunte antes de marcar."; "Jogou aqui? Avalie esta
  academia"; "Ainda não há avaliações desta academia no GuiaTennis."; o "Sobre"
  automático diz "Locação de R$ 100 a 120 por hora." no lugar de "A academia
  cobra, por hora de quadra…". **Erros:** o site não fala como "eu": os 154 "Não
  consegui…" viraram "Não foi possível…" ("Não foi possível concluir agora" quando
  não havia verbo); "Os lugares por perto não carregaram." **Página inicial:**
  "Por que o GuiaTennis" com 3 itens (a academia mais perto, direto com a
  academia, avaliações feitas no GuiaTennis); saem "Grátis para quem joga"
  (repetido), "Compare lado a lado" e "Avisos que trabalham por você"; **as Dicas e
  os perfis ("Todo o tênis da sua região") foram para a página nova
  `/como-funciona`** (`goComoFunciona`, `renderPaginaComoFunciona`, com o vídeo
  da busca; redirect no `netlify.toml`), aberta pelo rodapé ("Como funciona") e
  pelo "Dicas de uso" do menu. **Parceiros:** "1 em cada 14"; "Uma ficha completa,
  que você atualiza pelo celular"; "Começar agora · grátis"; o passo 3 "Confirme
  que responde pela academia" sem a disputa; os planos com "Comece grátis e mude
  de plano quando quiser." **Google:** o título da ficha "Nome: aula e locação de
  quadra de tênis em Bairro, Cidade | GuiaTennis" e a descrição "Locação a partir
  de R$ 100 por hora · nota 4,8 (126 avaliações) · Moema, São Paulo. Compare e
  chame a academia no WhatsApp." **Travessão:** fora das frases nas telas dos
  jogadores e do Parceiros (fica nos títulos de aba e como "vazio" nas tabelas).
  O `/como-funciona` ainda não está no sitemap (sai do banco: precisa de SQL).
  Sem SQL.
- **266 (13/11) — o cartão da busca e o topo da ficha como no protótipo** ("mas só
  os textos? e o resto de tudo?"). **Cartão da busca:** sai a caixa de oferta (o
  "a partir de" em cima, os preços lado a lado e o botão "Ver academia"); embaixo
  do cartão, separado por uma linha fina, **cada preço numa linha** ("Locação a
  partir de R$ 100 por hora", até 3) e **um atalho só**: "Reservar" quando a
  academia tem reserva online (regra 242), senão "WhatsApp" (`.offer.offer-linha`,
  mantém `.offer-precos`, `.offer-um` e `.offer-contact`); o cartão inteiro abre a
  ficha. **Cartão do mapa:** só o preço mais em conta, para continuar deitado
  (regra 195). **Topo da ficha:** à esquerda, sem a fileira de estrelas (a nota
  fica no quadrado ao lado das avaliações), e os `.ht-check` viram quadros lado a
  lado (modalidade, quadras, piso, cobertura), sem o ✓. O `unidadeCurta` também
  passou para " por hora"/" por aula". Sem SQL. Bateria completa de 13/11 depois
  das regras 265 e 266: 20 testes com o texto e o desenho antigos atualizados
  (`buscas-e-avisos`, `codigo-so-em-disputa`, `comparar-e-avisos`, `ficha-hoteis`,
  `jogador`, `links`, `parceiros`, `premium-patrocinado`, `reserva-online`,
  `sobre`, `ver-no-mapa`, `catalogo`).
- **267 (13/11) — o resto do protótipo** ("eu não quero corrigir só os textos… o
  conteúdo, a estrutura, tudo que você disse naquele conteúdo do artefato").
  **Busca da inicial:** "Usar minha localização" escrito embaixo do campo
  (`#locate-txt`, aciona o `#locate-btn`). **Recomendadas:** com o lugar da pessoa,
  o título vira "Perto de você", e cada academia é uma linha com o nome, a nota
  (quadrado verde) ou "Sem avaliações ainda", o bairro, a distância e "a partir de
  R$ X por hora" (`renderLinhaDaHome`, mantém `.mini` e `data-open`). **Cartão da
  busca com cinco informações:** nome (e o coração), nota ("4,8 Excelente · 12
  avaliações", sem o ícone de balão), onde ("Pinheiros, São Paulo · 1,2 km de você
  · 2 quadras de saibro", `.rcard-onde`, sem ícone), um destaque (a promoção, se
  houver; senão os selos ou o diferencial numa linha só, sem ✓) e o preço com um
  atalho. **Parceiros:** o botão do menu com as 3 listras (`.pc-menu-btn.menu-btn`).
  Fica de fora do protótipo a faixa verde "Para academias" na página inicial (a
  regra de 14/10 diz que a página dos jogadores não fala com a academia);
  perguntado ao Breno. Testes: `ficha-hoteis.js` (sem o ⓘ das estrelas no topo),
  `buscas-e-avisos.js` ("Perto de você" ou "Academias recomendadas"),
  `promocoes.js`, `perto-de-voce.js`, `menu-e-home.js`, `parceiros.js`,
  `busca-e-ficha.js`, `premium-patrocinado.js`, sem falha. Bateria completa de
  13/11 (até a regra 266): 2.546 verificações, uma falha (o ⓘ das estrelas),
  corrigida.
- **268 (14/11) — a caixa de busca e mais conteúdo na inicial** ("não gostei muito
  da barra de pesquisa. Ficou com muito pouco conteúdo na página inicial dos
  jogadores"). **Caixa de busca** (`renderSearchCard`, como a do Booking, com as abas
  do Airbnb): "Aula e locação | Aulas | Locação" em **abas sublinhadas** no alto
  (`.sc-tab`, `data-sc-modalidade`; sai a caixa cinza do `.sc-seg`); a linha do campo
  é um `<label>` (tocar em qualquer ponto abre o teclado), exemplo "CEP, bairro ou
  endereço"; **"Usar minha localização" numa linha só** (`#locate-btn`; saem o alvo
  dentro do campo e o `#locate-txt`); o botão fecha a caixa. O vídeo e o chat de
  ajuda dizem "toque em “Usar minha localização”" no lugar do "alvo". **Inicial:** as
  academias de "Perto de você"/"Academias recomendadas", "Academias por cidade" e
  "Mais bem avaliadas" em **cartões com foto** (`renderCartaoDaHome`, classe
  `mini-home`: foto, nome, nota com "Excelente · N avaliações", bairro · distância,
  "a partir de R$ X por hora"; sem foto, começa no nome); sai o `renderLinhaDaHome`.
  Nova seção **"Busque pelo tipo de quadra"** (`blocoTiposDaHome`, `TIPOS_DA_HOME`:
  saibro, rápida, coberta, estacionamento, vestiário, empréstimo de raquete; só o
  que existe, com quantas academias e o preço; o toque abre a busca com o filtro,
  `abrirTipoDaHome`), depois das recomendadas. Em "Academias por cidade", **"Bairros
  de …"** com quantas academias (`bairrosDaCidade`, até 8, link
  `/quadras/<cidade>/<bairro>`). Sem SQL. Teste novo `inicial-com-conteudo.js` (14);
  `ajuda-na-busca`, `busca-e-ficha`, `buscas-e-avisos`, `melhores-avaliadas`,
  `menu-e-home`, `perto-de-voce`, `publico` e `tempo` sem falha.
- **269 (14/11) — a busca do Trivago de volta e o menu** ("deixe parecido com o do
  Trivago, estava legal antes. E no menu, o logo do GuiaTennis está muito pequeno.
  Eu acho que pode tirar também o que aparece lá embaixo"). **Caixa de busca**
  (`renderSearchCard`) como era antes da regra 263: a linha "Onde você quer jogar"
  com o alvo à direita (`#locate-btn.sc-locate`) e a linha "O que você procura" com
  a lista que abre (`#sc-modalidade`, "Aula e locação | Aulas | Locação", com a seta
  ▼; a linha toda é um `<label>`), e "Buscar academias". Saem as abas da regra 268 e
  o "Usar minha localização" escrito da 267; o vídeo e o chat de ajuda voltam a
  dizer "toque no alvo". **Menu:** o logo com 44 px e o nome com 24 px; o nome
  estava espremido pelo `.menu-marca svg { width: 30px }` antigo, que pegava também o
  desenho do nome (`.menu-marca .logo-nome-svg` corrige). Saem do fim do menu "Por que
  o GuiaTennis", "Sobre", "Feedback", "Termos de Uso" e "Privacidade" (`.menu-links`):
  ficam no rodapé de todas as páginas, como no Booking, no Airbnb e no Trivago, e o
  menu fica só com o que a pessoa faz. Testes: `inicial-com-conteudo.js` (15),
  `menu-e-home`, `nota-do-guia` e `sobre` (o "Feedback" e o "Sobre" agora conferidos
  no rodapé), mais `ajuda-na-busca`, `busca-e-ficha`, `buscas-e-avisos`, os `chat-*`,
  `links`, `pensamento-e-home`, `perto-de-voce`, `publico` e `tempo`, sem falha.
- **270 (14/11) — revisão de acabamento** ("trabalha ele deixando redondinho,
  conforme o que já foi dito, tudo que sabe sobre o site"). **Resultados:** a caixa de
  busca numa linha só (`renderSearchCard(true)`, `.sc-compacto`: o onde, o alvo e o
  botão quadrado com a lupa `.sc-buscar`, ainda `#search-btn`), como a barra do alto
  dos resultados do Trivago e do Booking; "Aulas"/"Locação" ficam nos Filtros; a
  inicial segue com a caixa inteira. O "a partir de Pinheiros" embaixo de "2
  academias" saiu (a linha de cima já diz "A partir de Pinheiros, São Paulo"); a
  `.toolbar-sub` fica só para a página da cidade e para a busca sem lugar.
  **Inicial:** a mesma academia não aparece em três seções (`jaNaTela`, `soRepete`:
  a fileira de "Academias por cidade" e "Mais bem avaliadas" saem quando só
  repetiriam as de cima; os bairros e o link da cidade ficam); a nota dos cartões em
  branco no quadrado verde (estava cinza); "Busque pelo tipo de quadra" numa fileira
  que desliza, quadros do mesmo tamanho, sem o preço; exemplo do campo "CEP, bairro ou
  endereço" (o antigo cortava no celular). **Ficha:** os destaques do topo
  (`htDestaques`) não repetem a nota, a distância e as quadras (já estão no topo):
  ficam o preço e as comodidades, com "Empréstimo de raquete". **Distância:** abaixo de
  100 m, "menos de 100 m" (desfeito na 271: a distância exata). Sem SQL.
  Teste novo `acabamento.js` (10). **Bateria completa de 14/11 (até a regra 270):
  2.585 verificações**, uma falha: o `falhas.js` ainda esperava "Não consegui
  conferir o e-mail" (texto da regra 265), corrigido.
- **271 (15/11) — distância exata, filtros rápidos e a opção única** ("acho legal
  mostrar a distância exata"; "sim para as duas sugestões"; "o site SEMPRE precisa
  vender para todos mas da melhor maneira"; "tirar o símbolo de comparação dos
  filtros"). `distanceText` volta à distância exata (desfaz o "menos de 100 m" da
  270). **Filtros rápidos** acima da lista da busca (`filtrosRapidos`,
  `FILTROS_RAPIDOS`, `.frap`: Aulas, Locação, Saibro, Rápida, Coberta; só o que
  alguma academia tem; um toque liga, fica verde com ✓ e vai no link; o ligado não se
  repete nos filtros ativos, `noRapido`), como os "filtros populares" do Booking.
  **Ficha:** com uma opção só, o cartão de "Opções para jogar" ocupa a linha inteira
  (foto 16:9 e o botão largo). **Filtros:** "Comparação" sem o ícone. Testes:
  `acabamento.js` (15), `ver-no-mapa` ("0 m de você" de volta), `avisos-rapidos`,
  `busca-e-ficha`, `buscas-e-avisos`, `catalogo`, `ficha-hoteis`, `links`,
  `parceiros` e `premium-patrocinado`, sem falha.
- **272 (15/11) — o WhatsApp da busca no lugar certo** ("o local que aparece o
  WhatsApp não está fazendo muito sentido, muito básico"). **Cartão da busca:** o
  atalho vira botão verde de verdade (`.offer-linha .offer-contact`, 44 px, ícone
  branco), "Chamar" com o ícone do WhatsApp (ou "Reservar"), como o "Ver oferta" do
  Trivago. **Barra do "Salvar busca":** o "WhatsApp ▾" da regra 264 vira
  **"Compartilhar ▾"** (ícone de compartilhar), com "Mandar a lista para o meu
  WhatsApp" e "Salvar os contatos no celular" (menu de 300 px, texto quebra). **"Falar
  com as N"** sai da barra e vira o convite **"Peça o preço a várias academias de uma
  vez"** depois do terceiro cartão (ou do último), `convitePedirPrecos`/`comConvite`,
  com "Chamar as N no WhatsApp" (abre a mesma folha `abrirFalarComVarias`); só com 2
  ou mais academias com WhatsApp, fora do mapa e do admin. Na comparação e nas
  Favoritas, os três botões continuam como eram. Chat de ajuda ("whatsapp-varias")
  com o texto novo. Testes: `whatsapp-das-academias` (o convite e o "Compartilhar"),
  `buscas-e-avisos` e `reserva-online` (textos novos), mais `acabamento`, `catalogo`,
  `codigo-so-em-disputa`, `ficha-basica`, `lista-de-20`, `parceiros`,
  `premium-patrocinado`, `promocoes`, `veracidade`, `ver-no-mapa`, `chat-de-ajuda` e
  `pensamento-e-home`, sem falha.
- **273 (15/11) — o e-mail primeiro e a revisão do resto** ("se ele não tem conta,
  aparecerá a barra para criar todo o cadastro… se já tem conta… falar para ele
  entrar na senha. E aí pronto"; "retrabalhe no site inteiro como um baita
  designer"). **Entrar (jogadores):** a tela do e-mail vem sozinha, sem a trilha; e-mail
  novo abre o cadastro com a trilha "E-mail | Seus dados | Confirmar" (a bolinha na
  segunda etapa, depois na terceira no código); quem já tem conta vê "Entre na sua
  conta" e a senha, sem trilha (como o Booking e o Airbnb). **Parceiros:** o mesmo, a
  trilha "Sua conta…" sai da tela do e-mail e da senha (`pcEtapas(0)` saiu dali).
  **Comparação e Favoritas:** o mesmo desenho da busca: "Chamar as N no WhatsApp" em
  destaque (`.wa-chamar-todas`) e "Compartilhar ▾" (a lista e os contatos); na
  comparação, sem lugar buscado, a linha "Distância" sai (repetia "Busque um
  endereço"). **Ficha:** "Informar um problema" com o canto de 12 px (`.ht-bt-contorno`
  sem a pílula). **Parceiros, números:** lado a lado como pedido em 24/09, com "1 em
  cada" pequeno em cima do número (`.pc-faixa-pre`; o "1 em cada 14" encostava no
  "15%"). Testes: `jogador`, `parceiros`, `cadastro-normal-parceiros` (sem a trilha no
  e-mail), mais `rascunho`, `percurso`, `senha`, `confianca-na-ficha`,
  `comparacao-tudo`, `comparar-e-avisos`, `whatsapp-das-academias`, `veracidade` e
  outros 13 da comparação, Favoritas e ficha, sem falha.
- **274 (15/11) — o que os diretórios de quadra mostram** ("revise detalhe por
  detalhe, compare com o Trivago e os diretórios grandes de quadra de tênis"). Do
  Google Maps e dos localizadores de quadra (USTA, ClubSpark/LTA, Playtomic):
  **"Aberto agora · até 22h"** (ou "Fechado agora") no cartão da busca
  (`linhaDoHorario`, `horaCurta`, `.rcard-hora`; sem horário informado, nada); o filtro
  rápido **"Aberto agora"** (`state.abertoAgora`, `aberto=1` no link, conta nos filtros,
  sai no "Limpar"); a comodidade nova **"Iluminação para jogar à noite"**
  (`iluminacao` em `AMENITY_OPTS`, ícone `lampada`; entra sozinha no cadastro, nos
  Filtros e na comparação; sem SQL, `amenities` não tem trava), o filtro rápido
  "Iluminada", "Quadras iluminadas" em "Busque pelo tipo de quadra" e a iluminação
  logo depois do preço nos destaques da ficha. Teste novo `aberto-e-iluminacao.js`
  (8, com o relógio fixo); `acabamento.js` com o "Aberto agora" nos rápidos.
- **275 (15/11) — o painel do Parceiros e a Minha conta** ("agora revise o painel do
  Parceiros e a Minha conta"). **Painel:** no cartão "Desempenho", "Ver detalhes" sobe
  para a linha do título e os números ganham a largura toda (o "7 contatos" quebrava
  em 3 linhas; segue pequeno, embaixo das avaliações, como decidido); o alto do
  Parceiros no celular passava 1 px da tela (rolava para o lado): menos espaço entre
  o logo, a conta e o menu abaixo de 420 px. **Minha conta:** "Seu feedback para o
  GuiaTennis" desce para depois dos dados (era o primeiro cartão; como a "Ajuda e
  feedback" no fim da conta do Booking e do Airbnb); a caixa "Esta página ajudou
  você?" não se repete ali; "Vou viajar" e "Preferências de busca" sem o "Adicionar" e
  o "Escolher" à direita (a regra do menu: só valor que diz algo). Testes:
  `acessos-em-destaque`, `acesso-academia`, `nota-do-guia`, `sobre`, `jogador`,
  `perfil-e-avaliar`, `viagem`, `parceiros`, `menu-e-home` e outros 8, sem falha.
- **276 (15/11) — sem a iluminação** ("tire iluminação para jogar à noite, isso é
  um fato"): sai a comodidade `iluminacao` da regra 274 (de `AMENITY_OPTS`, do filtro
  rápido "Iluminada", de "Quadras iluminadas" na inicial, dos destaques da ficha e o
  ícone `lampada`). Fica o "Aberto agora". Teste `aberto-e-iluminacao.js` virou
  `aberto-agora.js` (6), sem falha.
- **277 (15/11) — "Aceita pets"** ("eu quero colocar comodidade de pet friendly"):
  comodidade nova `pet`, "Aceita pets" (como o "Aceita animais de estimação" do
  Booking e do Airbnb), com o ícone `pata`; entra sozinha no cadastro do Parceiros,
  nos Filtros, na comparação e na Estrutura da ficha (via `AMENITY_OPTS`), e também
  em "Busque pelo tipo de quadra" e nos destaques da ficha. Sem SQL (`amenities` sem
  trava). Teste novo `comodidade-pet.js` (4); `cadastro`, `catalogo`, `parceiros`,
  `ficha-*`, `comparacao-tudo`, `estacionamento` e outros, sem falha.
- **278 (15/11) — o painel do admin** ("revise o painel de admin"). **Academias:**
  os filtros sem nenhuma academia não aparecem (eram 10 botões em 5 linhas, quase
  todos com 0; "Todas" e o escolhido ficam sempre); o campo diz "Nome, bairro ou
  cidade" (o antigo cortava). **Estatísticas:** os números como os da Visão geral, sem
  a caixa bege dentro do cartão e sem maiúsculas no rótulo (`.stat-card`, `.stat-lbl`;
  vale também para "Tempo até agir"). **Visão geral:** o aviso do código da disputa
  sem o travessão ("desligado. Você gera o código…"). O menu em grupos e a Visão
  geral ficam como estavam. Testes: os 44 que abrem o admin, sem falha
  (`codigo-pelo-whatsapp` com o texto novo).
- **279 (15/11) — o CEP da localização e uma bolinha só** ("quando clicar no botão
  de localização exata, aparecer o CEP que está sendo procurado. E as duas bolas
  girando ao mesmo tempo não fica tão legal"). `useMyLocation`: o campo mostra o CEP do
  Nominatim ("05422-030"; sem CEP, "Bairro, Cidade"); `state.cepDoGps` guarda o que
  veio do GPS e o `syncUrl` não leva esse texto para o link (a busca pelo GPS continua
  fora do link; o que a pessoa digita vai, como antes). Buscando, só o botão de
  buscar gira; o alvo fica parado e desligado (nas duas caixas, a inteira e a
  compacta). Teste novo `localizacao-cep.js` (5); `ajuda-na-busca`, `buscas-e-avisos`,
  `busca-bairro-cidade`, `links` e outros, sem falha.
- **280 (15/11) — recomendadas, bairro direto e o "por perto"** ("por que as
  academias recomendadas saíram? vamos perder isso para o Premium"; "clicando no
  bairro… que vá direto para as academias que estão com essa localização e não
  procurar"; "o mapa de procurar as coisas por perto… muitas vezes não funciona").
  **Inicial:** o título é sempre "Academias recomendadas" (com o lugar, "Academias
  recomendadas perto de você"; a regra 267 trocava por "Perto de você" e sumia a
  palavra que o Premium promete). **Bairro:** `doSearch` com `regiaoLink` de bairro
  mostra na hora as academias daquele bairro (`state.bairroDaPagina`, comparação por
  `slugTexto`, filtro no `applyFilters`), como a página da cidade, sem Nominatim;
  ordem "Recomendadas" (Premium primeiro); linha "Todas as academias de Moema, São
  Paulo. Ver as de São Paulo"; salva como busca (`buscaAtualParaSalvar` com o link
  `/quadras/<cidade>/<bairro>`). Bairro sem academia: procura como antes. Vale para os
  bairros da inicial, "Ver todas as academias em …" da ficha e os links
  `/quadras/…/…`. **"O que tem por perto":** um quarto espelho do Overpass
  (`maps.mail.ru`), a consulta mais leve (o `tourism` só com os tipos que a lista
  mostra), uma segunda tentativa sozinha com 20 s antes do erro e, no erro, "Ou veja no
  mapa: Restaurantes · Padarias e cafeterias · Pontos turísticos e parques" (Google
  Maps em volta da academia). **Mapa:** `camadaDoMapa` troca sozinho para os quadros da
  CARTO (mesmos dados do OpenStreetMap) depois de 3 quadros com erro, nos quatro mapas
  do site. Teste novo `bairro-direto.js` (10); `links` (a região sem procurar) e outros
  24, sem falha.
- **281 (16/11) — a mesma caixa de busca** ("a barra de busca não deve ser
  diferente do início para a busca"): os resultados voltam a usar a caixa inteira da
  inicial (onde com o alvo, "O que você procura" e "Buscar academias"); sai a compacta
  da regra 270 (`renderSearchCard(true)`, `.sc-compacto`, `.sc-buscar`). Testes:
  `acabamento` (a mesma caixa), `localizacao-cep`, `buscas-e-avisos`, `busca-e-ficha`,
  `links`, `whatsapp-das-academias` e `bairro-direto`, sem falha.
- **282 (16/11) — a lista e os contatos pedem conta** ("fale que para mandar a lista
  precisa de conta e salvar também"): "Mandar a lista para o meu WhatsApp" e "Salvar
  os contatos" (busca, comparação e Favoritas) passam por `jogadorEntaoFaz`: sem conta,
  abre o Entrar com o motivo ("Para mandar a lista para o seu WhatsApp, entre com o seu
  e-mail…", "Para salvar os contatos das academias, entre…") e, depois de entrar, faz
  o que foi pedido. O menu "Compartilhar" e a linha da comparação/Favoritas avisam,
  sem conta: "Para mandar a lista e salvar os contatos, entre com a sua conta (é
  grátis)." (`.wa-acoes-nota`). "Salvar busca" já pedia conta. "Chamar as N no
  WhatsApp" continua sem conta. Chat de ajuda ("whatsapp-varias") diz que os dois pedem
  conta. Testes: `whatsapp-das-academias` (20, com os casos sem conta),
  `chat-de-ajuda`, `comparar-e-avisos`, `comparacao-tudo`, `guardados-na-conta` e
  `buscas-e-avisos`, sem falha.
- **283 (16/11) — cores, linhas e o "Sobre" primeiro** ("deixe as comodidades… na
  lista com o nosso verde… crie o fecha em breve… amarelo, aberta agora… verde e
  fechada com o vermelho"; "em linha separada a quantidade de quadra do bairro, cidade e
  distância; na ficha também a distância em linha diferente do bairro"; "a foto do
  catálogo com uma visualização menor"; "o sobre a academia acima do catálogo").
  **Cartão da busca:** as comodidades (`.rcard-selos`) no verde, em negrito; uma linha
  para "Bairro, Cidade" (`.rcard-onde`), outra para "N m de você" (`.rcard-dist`) e outra
  para "N quadras de …" (`.rcard-quadras`); o horário com a bolinha da cor
  (`linhaDoHorario`): "Aberto agora · até 22h" verde, **"Fecha em breve · às 22h"**
  (até 60 min antes, `minutosAteFechar`) amarelo (bolinha `--gold`, texto
  `--gold-text`), "Fechado agora" vermelho (`--red`). **Ficha:** a distância numa
  linha própria embaixo do endereço (`.court-dist`); **"Sobre a academia" antes de
  "Opções para jogar"** (e "Visão geral" primeiro na barra de seções), como a
  descrição antes dos quartos no Booking, no Airbnb e no hoteis.com; texto com mais
  de 220 letras em 4 linhas com "Ler mais"/"Ler menos" (`data-ler-mais`); desfaz a
  posição do "Sobre" da regra 264. **Catálogo:** foto 16:9 (era 4:3) e a opção única
  21:9, com `overflow: hidden` (a foto passava da proporção). Testes: `aberto-agora`
  (10: fecha em breve, cores, ficha), `acabamento` (as três linhas), `ficha-hoteis`
  (a ordem nova), `catalogo`, `ficha-basica` e outros, sem falha.
- **284 (16/11) — voltar no lugar, a trilha no cadastro e o fechamento do leilão**
  ("ao sair da ficha, voltar na mesma posição que clicou ao entrar"; "tirou a barra de
  progresso? não é legal?"; "eu quero alterar as datas que finalizam o leilão").
  **Voltar:** `syncUrl` guarda a rolagem da tela antes de ir para outra (`ROLAGENS`,
  por endereço); o "voltar" do navegador e a seta da ficha (`voltarDaFicha`) descem até
  lá de novo (`voltarARolagem`), como o Booking e o Airbnb. **Trilha:** no "Cadastrar
  minha academia" do Parceiros, a trilha "Sua conta | Confirmar e-mail | Sua academia |
  Início" volta já no e-mail (desfaz essa parte da 273; no "Entrar" e na senha
  continua sem). **Leilão:** SQL `20261116120000_fechamento_do_leilao`:
  `leilao_config.dia_fechamento` (0 domingo a 6 sábado, começa 0) e `hora_fechamento`
  (0 a 23, começa 20); `proximo_fechamento()` usa a config (security definer); RPC
  `mudar_fechamento_do_leilao(p_dia, p_hora)`, só o admin, move os lances abertos da
  semana para o fechamento novo. Admin › Leilões › **"Quando o leilão fecha"** (dia e
  hora, "Salvar"); os envios continuam contados do fechamento (1º: +1 dia e 14 h; 2º:
  +4 dias e 14 h) e os textos mostram as datas de verdade (`enviosDoLeilao`; admin e
  Parceiros), sem "domingo às 20h"/"terça e sexta" fixos (perguntas e chat de ajuda).
  Testes: `volta-da-ficha.js` (3), `fechamento-do-leilao.js` (4), `parceiros` e
  `cadastro-normal-parceiros` (a trilha no cadastro), `promocoes-por-email`,
  `plano-e-creditos` e outros do leilão; `banco-emails.py` 963 (10 novas), sem falha.
- **285 (16/11) — as respostas pendentes** ("Página 'Como funciona' no mapa do site:
  sim"; "Cor de erro nova: sim"; "Logo em Poppins: mesma escrita em todos os lugares";
  "deixe Pet friendly"): SQL `20261116130000_como_funciona_no_sitemap` (o `sitemap()` com
  `/como-funciona` depois de `/sobre`); `--red` `#E63D10` (era `#A8462C`; 4,2:1 com
  branco), e os vermelhos soltos do chat e da senha passam a `var(--red)`; o nome em
  Poppins (`NOME_DO_LOGO`) entrou no trecho `LOGO-INICIO`/`LOGO-FIM` e a imagem de
  compartilhar (`nomeNoLogo`), a 404 (raquete e nome), `divulgacao/email-assinatura.png`
  e `divulgacao/whatsapp-capa.png` (texto em Roboto, sem a Playfair) saem com ele; os
  ícones não têm escrita e não mudaram; "Aceita pets" virou **"Pet friendly"** (o filtro
  segue `comodidades=pet`). Testes: `comodidade-pet.js`, `nota-do-guia.js` e
  `aberto-agora.js` (a cor nova), `banco-emails.py` (seção nova, não rodada: o banco
  local não está no contêiner; o "Banco de dados" disparado à mão rodou com sucesso no
  banco de teste em 16/11). **Bateria completa de 16/11 (até a 285): 2.640 verificações
  certas e 1 falha em `ficha-hoteis` (o `index.html` foi editado durante a bateria); rodado
  de novo, 35 certas, sem falha.**
- **286 (16/11) — o vermelho legível e a faixa verde nos e-mails** ("deixe as cores que
  forem melhor para visualização, carregamento do site, do e-mail. Pode deixar como se
  fosse um amarelo e fundo verde, igual ... no rodapé"): `--red` `#C2330D` (o tom do
  `#E63D10` do sistema de design, mais escuro: 5,6:1 no branco e 5,1:1 no creme, para
  letra pequena; o `#E63D10` dá 4,2:1). E-mails: o alto vira uma **faixa verde**
  (`#1F4D3D`, cantos de 12px) com a raquete (`email-logo.png`, 34px) e o nome em Poppins
  numa imagem (`email-nome.png`, 426×60 mostrado em 142×20, 7 KB, "Guia" branco e
  "Tennis" dourado, `alt="GuiaTennis"` branco se a imagem não carregar): legível no modo
  claro e no escuro. SQL `20261116140000_faixa_verde_nos_emails` (`email_montado`); o
  e-mail do código (`divulgacao/email-codigo.html`, que o "Banco de dados" manda ao
  Supabase, agora trocando o endereço das duas imagens) e a prévia do e-mail no Parceiros
  (`.email-previa-marca`) iguais. `email-nome.png` sai do `gerar-imagens.js` e entrou na
  lista do `netlify.toml`. Testes: `nota-do-guia` (47), `aberto-agora` (9),
  `promocoes-por-email` (72), sem falha; `banco-emails.py` (seção 19 e seção nova; o SQL
  conferido num Postgres de passagem e no banco de teste).
- **287 (16/11) — logos e fundos para as redes** ("mande os novos arquivos de logos e
  fundos para WhatsApp, Instagram, tudo mais"): no `divulgacao/gerar-imagens.js`, com o
  verde da capa, a quadra embaixo, o nome em Poppins e o texto em Roboto:
  `instagram-stories-fundo.png` (1080×1920, o meio livre e nada nas faixas de 250px que o
  Instagram cobre), `instagram-post-fundo.png` e `instagram-post-apresentacao.png`
  (1080×1350, o tamanho que mais aparece no feed), `facebook-capa.png` (1640×624, tudo no
  meio, porque o celular corta as laterais), `logo-horizontal.png` ("Guia" verde, para
  fundo claro), `logo-horizontal-branco.png` (para fundo escuro), os dois transparentes,
  e `logo-horizontal.svg` (para gráfica). A foto de perfil de todas as redes é o
  `whatsapp-perfil.png`. Mandados ao Breno com um .zip de tudo. Não mexe no site (a
  `divulgacao/` não gera publicação na Netlify). Sem SQL e sem teste.
- **288 (16/11) — boas-vindas ao jogador** ("faça uma mensagem na tela de boas-vindas
  ao GuiaTennis, no jogadores… Seja bem-vindo. O nome da pessoa… Fale, busque, compare,
  decida e bons jogos!"): conta nova criada no site dos jogadores (não no Parceiros), depois
  do código do e-mail ou do "Confirmar depois", a tela `jogadorTela = "boas-vindas"`
  (`state.boasVindasJogador`, marcada no `criarContaJogador`; o `depoisDeEntrarJogador`
  mostra a tela antes de seguir): a raquete, **"Boas-vindas ao GuiaTennis, Nome!"** (o
  primeiro nome; "Boas-vindas" serve para todos, como o Nubank, o Airbnb e o Parceiros),
  "Agora ficou fácil encontrar as quadras mais perto de você, com tudo o que você precisa
  saber.", "Busque, compare, fale com as academias e decida." (na ordem em que o site é
  usado) e **"Bons jogos!"**; "Continuar" (e o ✕) segue com o que a pessoa estava fazendo
  (ex.: a avaliação sai depois do "Continuar"). Sem link próprio (`CONTA_NO_LINK`). Sem
  SQL. Testes: `jogador.js` (49), `parceiros.js` (159, a avaliação depois das
  boas-vindas), `senha`, `cadastro-normal-parceiros`, `convite-chamadas`, `viagem`,
  `volta-e-resumo`, `painel-admin`, `whatsapp-das-academias` e `guardados-na-conta`, sem
  falha.
- **289 (16/11) — a imagem do e-mail, a busca mais limpa e o "Você marcou?"** ("a imagem
  do e-mail não carregou, acredito que ficou muito pesada. Os filtros abaixo da pesquisa
  estão muito aglomerados… como chegar a pergunta de confirmação se vai jogar nessa
  academia? não chegou nada após clicar em um WhatsApp"). **Imagem:** não era o peso
  (7 KB): o "Banco de dados" disparado à mão não sabia o número do PR e mandava ao
  Supabase de teste o e-mail do código com as imagens do site de verdade, onde o
  `email-nome.png` só chega com o merge. Agora o passo "PR da branch" (`banco.yml`,
  `pull-requests: read`) acha o PR aberto da branch e as imagens vêm da prévia (no e-mail
  do código e no `configurar_emails`; conferido: "PR da branch: 5"). **Busca** (depois:
  "deixar só de um lado ordenar e filtrar… abaixo, de um lado salvar busca e do outro
  compartilhar"): como o Booking, a barra presa ao rolar com "N academias" de um lado e
  **"Ordenar"** (ícone novo `ordenar`; abre Recomendadas, Mais perto…; o rótulo de leitor
  de tela diz a ordem escolhida) e **"Filtros"** do outro; embaixo, **"Salvar busca"** de
  um lado e **"Compartilhar ▾"** do outro, em texto verde, sem caixa. Os **filtros
  rápidos da regra 271 saíram** (Saibro, Rápida e Coberta estão nos Filtros); **"Aberto
  agora"** foi para os Filtros, em "Horário" (`.f-aberto`, e o filtro ativo com ×,
  `data-clear="aberto"`). O "A partir de …" só aparece quando diz algo a mais que o campo.
  **"Você marcou?":** sai no dia seguinte ao clique, das 10h às 21h, só para conta de
  jogador com o e-mail confirmado, sem ser o admin (o admin não grava nada) e com o aviso
  "Depois de chamar uma academia…" ligado (explicado ao Breno). Sem SQL. Testes:
  `acabamento.js` (17, a barra nova), `whatsapp-das-academias`, `buscas-e-avisos`,
  `aberto-agora`, `localizacao-cep`, `busca-e-ficha`, `bairro-direto` e `links`, sem
  falha; `aberto-agora.js` (10, "Aberto agora" nos Filtros). Bateria completa de 16/11 (até a 289): **2.644 verificações, nenhuma falha**.
- **290 (16/11) — contatos reais, pagamento e cadastro** ("o site deve sempre aceitar
  WhatsApps reais, Instagrams e sites também, que funcionem"; "Sobre o GuiaTennis, tire
  do topo do Sobre"; "R$ 02: não estava funcionando digitar o número no pagamento";
  "Pagamento seguro: um link que explica o nosso pagamento"; "tire 'até 750 letras'";
  "quando faltar algo obrigatório no cadastro, um push com a opção de corrigir; nas aulas
  sem valor, alterar ou seguir"; "ao mudar de academia com o menu aberto, o site pisca";
  os textos dos valores, das fotos e do cancelamento). **Contatos:**
  `digitosDoWhatsapp`/`whatsappValido` (10 ou 11 dígitos, com ou sem +55, 0, link wa.me;
  o DDD 55 do RS não some mais do link), `usuarioDoInstagram`/`linkDoInstagram` (@, nome
  ou link do perfil) e `linkDoSite` (com ou sem https://); os links da ficha, do admin e do
  Google usam esses; o cadastro guarda arrumado e aponta o que está errado (`regFaltas`,
  passo contato, e no envio). **Sobre:** sem o "Sobre o GuiaTennis" acima do título.
  **"Outro valor":** campo de texto com teclado de números (o `type=number` voltava o
  cursor ao começo a cada tecla e saía "02"), só dígitos e sem zero na frente. **"Pagamento
  seguro"** virou botão que abre "Como funciona o pagamento" (Mercado Pago, Pix na página,
  cartão na página do Mercado Pago, o GuiaTennis não vê o cartão, CPF/CNPJ para a nota,
  créditos e plano na aprovação, WhatsApp para dúvidas; "Entendi"). **Planos:** "\"Sobre a
  academia\" escrito por vocês", sem "até 750 letras". **Cadastro:** `mostrarEscolha`, o
  aviso do alto com botões: faltou algo, "Corrigir" (vai ao campo, `irAoQueFalta`); sem
  valor, "Alterar" (vai ao primeiro valor vazio) ou "Seguir" (o "Seguir assim" embaixo
  continua). Os valores (`notasDosValores`, igual em Aulas e Locação, em parágrafos):
  "Valores exibidos por aula/hora, sendo avulsa ou mensal."; o "Sob consulta" num
  parágrafo próprio; "Para valores com centavos, use a vírgula. Ex.: 150,50."; e as fotos
  seguindo os Termos e a Política, "se alguma foto não seguir, o GuiaTennis entra em
  contato" (saiu a parte das autorizações e das promoções; no chat de ajuda saiu o "(na
  mensal, o valor de cada … no plano)"). **Cancelamento:** os exemplos "a aula conta como
  dada e não tem reposição" e "o valor da hora não é devolvido" (antes "é cobrada e pode
  ser reposta", que se contradizia). **Trocar de academia:** o menu fecha na hora e a
  página fica parada e mais clara (`body.pc-trocando`) enquanto a conta recarrega;
  `segurarRender` não deixa a página se desenhar no meio, sem a conta. Sem SQL. Testes:
  `contatos-e-cadastro.js` (novo, 11), `catalogo` (100), `chat-parceiros`, `cadastro`,
  `plano-e-creditos`, `sobre`, `parceiros`, `links` e `ficha-hoteis`, sem falha; **bateria
  completa de 16/11 (até a 290): 2.655 verificações, nenhuma falha**.
- **291 (16/11) — a nota com confiança** ("notas que têm mais avaliações são mais bem
  avaliadas; isso também deve contar ao dizer academias recomendadas"): `notaComConfianca`
  (média bayesiana, como o IMDb, a Amazon e o Google: cada academia ganha
  `AVALIACOES_DE_PESO` = 5 avaliações com a `NOTA_DO_MEIO` = 3,5; 4,8 com 30 dá 4,61 e
  passa 5,0 com uma, 3,75). Vale nas **Recomendadas** da busca (`recoScore`), nas
  **"Academias recomendadas"** da inicial e da viagem (`recomendadasGuia`,
  `blocoViagemDaConta`), na ordem **"Mais bem avaliadas"** da busca (no empate, quem tem
  mais avaliações) e nas "Mais bem avaliadas" da inicial (antes, peso 3 com a média de
  todas, que deixava 5,0 com uma na frente de 4,8 com 30). Textos: o "Ordenar" ("A nota e
  quantas avaliações: 4,8 com 30 vem antes de 5,0 com uma") e a pergunta "Como funciona a
  ordem das academias?". Sem SQL. Testes: `nota-com-confianca.js` (novo, 3),
  `melhores-avaliadas`, `buscas-e-avisos`, `acabamento`, `inicial-com-conteudo`, `viagem`,
  `premium-patrocinado`, `perto-de-voce`, `busca-e-ficha`, `comparacao-tudo` e
  `chat-de-ajuda`, sem falha.
- **292 (16/11) — o logo em pé** ("me manda o logo com a nova escrita embaixo"): no
  `gerar-imagens.js`, `divulgacao/logo-vertical.png` (raquete e, embaixo, o nome em
  Poppins, "Guia" verde, fundo transparente), `logo-vertical-branco.png` ("Guia" branco,
  para fundo escuro) e `logo-quadrado-com-nome.png` (o quadrado verde com o nome dentro,
  1080×1080). Mandados ao Breno. Fora do site; sem teste.
- **293 (16/11) — os números sem o "1 em cada"** (print: "1 em cada" em cima e o "4"
  embaixo, "assim não está muito legal, desorganizado"): em `numerosDoSite` (faixa de
  números do Parceiros e o Sobre), a parte de quem abre uma ficha virou porcentagem, no
  mesmo formato das outras, como as faixas de números do Booking e do Airbnb para
  parceiros: "+5.000 / visitas ao GuiaTennis", "25% / das visitas abrem a ficha de uma
  academia" ("Quase todas / as visitas…" com 95% ou mais) e "15% / das fichas abertas
  viram contato com a academia". Saíram `umEmCada` e o `.pc-faixa-pre` (regra 273). Sem
  SQL. Testes: `contatos-e-cadastro.js` (12), `parceiros`, `parceiros-acender`, `sobre`,
  `confianca-na-ficha` e `painel-admin`, sem falha.
- **294 (17/11) — "Também oferece": eventos, ranking e projeto social** ("tem academias
  que oferecem locação para eventos, rankings, aulas com projeto social, como incluir isso
  no site"; depois de ver a recomendação: "continue assim, mas tire a opção torneios, deixe
  só ranking"). **Locação para eventos** e **Ranking** entram no **catálogo**
  (`CATALOGO_TIPOS` com `grupo: "extra"`, sem SQL: eventos com valor "por evento"; ranking
  com "Inscrição" e "Mensalidade", "por mês"), com a foto no Premium, como os "Produtos" do
  Google e as atividades com preço do Playtomic; ficam **fora das "Opções para jogar", do
  "a partir de" e do anúncio da Meta** (`opcoesPreco` e `catalogo-meta.mjs` ignoram os
  extras). Marcado sem valor, "Sob consulta". O **Projeto social** não é produto: coluna
  própria `academias.projeto_social` (texto até 100 letras desde a 295, todos os planos; SQL
  `20261117120000_projeto_social`), obrigatório escrever como funciona quando marcado e sem
  telefone, link ou preço. **Cadastro:** no passo Modalidades, "A academia também oferece
  (opcional)" com os três (`editorDoQueMaisOferece`). **Ficha:** "Também oferece" logo
  depois das "Opções para jogar" (`htOferece`), cada um com o valor e "Perguntar no
  WhatsApp" com a mensagem pronta (`MENSAGEM_DO_EXTRA`), e nos destaques do topo.
  **Busca:** nos Filtros, o grupo "Também oferece" (`OFERECE_OPTS`, pela lista das
  comodidades: `comodidades=ranking`). Chat de ajuda (Modalidades) atualizado. Testes:
  `oferece.js` (novo, 7), `catalogo-meta.mjs` (15), `cadastro`, `catalogo`, `ficha-hoteis`,
  `busca-e-ficha`, `parceiros`, `chat-parceiros`, `comodidade-pet`, `acabamento`,
  `aberto-agora`, `links`, `painel-admin`, `dicas-do-parceiros` e `confianca-na-ficha`,
  sem falha; `banco-emails.py` com a seção nova (o SQL roda no banco de teste pelo "Banco
  de dados").
- **295 (17/11) — o projeto social sem venda** ("dê um limite para a escrita do projeto,
  algo até 100, e não permitir qualquer intenção para que ocorra venda"): o texto vai até
  **100 letras** (`PROJETO_SOCIAL_MAX`, com o contador embaixo do campo) e não aceita
  preço (R$), link, @, telefone nem palavra de venda (`VENDA_NO_PROJETO`, palavra inteira:
  promoção, desconto, oferta, imperdível, pacote, matrícula, mensalidade, preço, valor,
  pagamento, parcela, compra, venda, barato, plano; "Valorizamos" passa).
  `problemaNoProjetoSocial` explica o que tirar (com o aviso "Corrigir"). A mesma trava no
  banco: SQL `20261117130000_projeto_social_sem_venda` (corta o que já estava em 100 e
  apaga o texto com venda; o SQL da 294 também ficou com 100). Testes: `oferece.js` (8),
  `cadastro`, sem falha; o SQL conferido num Postgres de passagem (aceita "Valorizamos o
  esporte" e "Bolsas para jovens", barra "Aulas com desconto" e telefone) e
  `banco-emails.py` com as conferências novas.
- **296 (17/11) — quadras públicas e "Sugerir uma quadra ou academia"** ("quero ter a
  opção de adicionar quadras públicas, como pode ficar a administração delas?"; "sim, quero
  um botão também de sugerir quadras públicas ou até mesmo academia, no início do menu, para
  eu entrar em contato"). Como os parques do Google Maps e o "Find a court" da federação
  americana: **ficha do GuiaTennis, sem dono no Parceiros**. SQL
  `20261117140000_quadras_publicas` (`academias.tipo` 'academia'/'publica' e `como_usar`,
  até 200 letras). **Admin:** "Adicionar quadra pública" ao lado de "Adicionar academia"
  (e o "É uma: Academia | Quadra pública" no começo do cadastro dele); a pública só tem
  lugar (com "Como usar a quadra"), quadras, fotos, horário e como chegar
  (`passoVisivel`). **Ficha** (`ehPublica`): selo "Quadra pública · grátis", "Como usar a
  quadra", "Como chegar" no lugar do contato, a barra de baixo "Grátis · quadra pública ·
  Como chegar"; sem preços, "Também oferece", WhatsApp, cancelamento, dúvidas e "É o
  responsável?"; embaixo, "Quer aula ou quadra reservada? Academias perto daqui" (só
  academias); Google: "quadra de tênis pública e grátis". **Busca:** no cartão, "Grátis ·
  quadra pública" e "Como chegar"; nas Recomendadas, depois das academias; Filtros › "Tipo
  de lugar" (Academias, Quadras públicas; link `lugar=publicas`); fora das "Academias
  recomendadas", das "Mais bem avaliadas" da inicial, do "por perto" das academias, da
  reivindicação no Parceiros e do anúncio (sem preço). **Sugerir:** no menu, logo depois de
  "Buscar quadra", "Sugerir uma quadra ou academia": com a conta (sem conta, o Entrar com o
  motivo), quadra pública ou academia, nome, onde fica e algo mais; vai como sugestão do
  chat de ajuda (`enviar_relato_do_chat`, "Quadra pública sugerida: …"), que o admin vê em
  Chat de ajuda com o nome e o e-mail, responde ali, e a pessoa acompanha em Feedback.
  Testes: `quadras-publicas.js` (novo, 12), sem falha; bateria completa rodando no envio.

## 11. WhatsApp e mensagem para as academias

- No site, o contato do GuiaTennis aparece só com o nome e o logo pequeno
  ("Chat de ajuda", Instagram, E-mail); o WhatsApp do Breno fica atrás do
  chat de ajuda. Número e e-mail por escrito, só nos Termos e na
  Privacidade. **Sem mensagens automáticas** no WhatsApp Business.
- Mensagem para as academias (pedir horário, preços, cancelamento, como
  chegar, quadras, comodidades e até 5 fotos, oferecendo o QR code da
  ficha): o texto pronto está no histórico, seção 13.
