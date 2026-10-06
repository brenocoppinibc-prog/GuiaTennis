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
**Atualizado em:** 06/10/2026

> **Estado (06/10/2026):** o Breno pediu "quando eu fizer o login, mude o
> site para eu ter o controle de tudo… separado… mas não aparecer para
> outras pessoas a minha área". Entrou a regra 58: o **painel do admin**
> em **`/admin`** (visão geral, pendências, academias, acessos, contas de
> jogador, avaliações, estatísticas, percurso, e-mails e ferramentas), com
> SQL `20261006120000_painel_do_admin`. Os três botões redondos do admin
> saíram do site dos jogadores (agora é a faixa "Abrir o painel"). Depois,
> o Breno não gostou da barra de atalhos embaixo do Parceiros no celular:
> saiu, e tudo fica no menu.
> Antes, no mesmo dia, a regra 57 (admin no GuiaTennis Parceiros). Testes:
> **881 verificações, nenhuma falha** nos 28 arquivos do navegador e 116 no
> `banco-emails.py` (Postgres local). Por último, as regras 59 (a declaração
> de quem pede uma academia vira caixinha, com a hora guardada no banco) e
> 60 (academia nova de conta com e-mail confirmado vai ao ar sozinha).
>
> **Estado (05/10/2026, noite):** o Breno respondeu ao que estava aberto:
> **não quer endereço próprio para o Parceiros** (fica em
> guiatennis.com.br/parceiros, `PARCEIROS_NO_ENDERECO_PROPRIO` continua
> `false`), **o código de 6 números já está ligado** no Supabase e **quer
> salvar as buscas**. Entraram as regras 51 a 55: **avisos por e-mail pelo
> Resend** (avaliação nova, pedido de acesso, pedido aceito, viagem e
> academias novas — SQL `20261005160000_avisos_por_email`), **buscas
> salvas** na conta (SQL `20261005150000_buscas_salvas`), **a conta do
> Parceiros funciona como conta normal no site dos jogadores** (só não
> avalia a academia que administra — SQL `20261005170000_parceiro_tambem_joga`,
> muda a regra 18), **a página da cidade lista todas as academias da cidade**
> sem procurar endereço, e os textos "Por que o GuiaTennis" e "Por que estar
> no GuiaTennis". Também a correção da esteira do banco, vermelha desde o
> SQL da pausa (SQL `20261005180000_visitante_le_a_pausa`). Falta o Breno cadastrar o segredo `RESEND_API_KEY` no GitHub
> (seção 11, primeiro item). Testes: **825 verificações, nenhuma falha** nos 27 arquivos
> do navegador e 95 no `banco-emails.py` (Postgres local).
>
> **Estado (05/10/2026, fim do dia):** depois do pacote abaixo, entraram as
> regras 46 a 50: **percurso de cada visita** com relatório no admin (SQL
> `20261005140000`), acessos do admin agrupados por academia, **a academia
> pausa a própria ficha** (SQL `20261005130000`), "Pedir análise" na
> avaliação e o site dos jogadores sem a faixa "Área da academia".
> Testes do pacote final: **752 verificações, nenhuma falha** (`check-js.sh`
> + os 25 arquivos de `testes/`) e o `banco-acesso.py` com 167 certas e as
> 11 falhas antigas.
>
> **Estado (05/10/2026):** PR #5 ainda **sem merge**. Entraram as regras
> 40 a 45: "represento a academia" só quando a academia aparece; **perfil
> da conta** do jogador (`/perfil`) e dos Parceiros (`/parceiros/perfil`);
> **"Jogou aqui? Avalie"** um dia depois de chamar uma academia; **Suas
> academias** (`/parceiros/academias`) e **vários pedidos ao mesmo tempo**
> (SQL `20261005120000_varios_pedidos`); o site dos Parceiros **em outra
> aba**, pronto para o endereço próprio `parceiros.guiatennis.com.br`; sem
> dizer como o GuiaTennis confere (nada de CNPJ/documento no site); menu
> "Sair da conta". Testes: seção 6. Falta o Breno: e-mail no Supabase,
> endereço dos Parceiros no registro.br e no Netlify (seção 11) e testar na
> prévia.
>
> **Estado (03/10/2026):** PR #5 ainda **sem merge**. Entrou a regra 29:
> **uma conta do GuiaTennis Parceiros administra várias academias**, em
> qualquer plano (SQL `20261003120000_varias_academias`, teste
> `testes/varias-academias.js`), com o plano e o valor de cada academia
separados, e a regra 30 (o plano aparece só ao finalizar o cadastro,
SQL `20261003130000_pedidos_de_plano`). **634 verificações** passando
> (`check-js.sh` + os 22 arquivos de `testes/`) e 163 no
> `banco-acesso.py` (as 11 que falham lá são antigas: o teste ainda espera
> números no Básico/Completo e avaliação sem conta, regras 22 e 23).
> Continua faltando o Breno ligar o serviço de e-mail no Supabase (seção
> 11) e testar na prévia; depois, "pode subir".
>
> **Estado (02/10/2026, fim do chat):** PR #5 ainda **sem merge**, com
> tudo das regras 19 a 28 (logo, menu do trivago, home pessoal,
> preferências, cadastro passo a passo, planos, conta do jogador, um lugar
> só para o e-mail, voltar passo a passo, trilha de tênis, código por
> e-mail). **504 verificações** passando (`check-js.sh` + os 16 arquivos de
> `testes/`). **Falta o Breno ligar o serviço de e-mail no Supabase**
> (seção 11, primeiro item) e testar na prévia; depois, "pode subir".
>
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
- **Sem a palavra "pôr"** (nem "põe", "ponha"): o Breno acha informal
  (05/10/2026). No site, nos textos internos e no documento, usar
  "adicionar", "incluir", "informar", "colocar" ou "cadastrar", conforme o
  sentido.
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
   identificador do aparelho. Pedido do Breno em 28/09/2026. **Percurso da
   visita** (05/10/2026, regra 46): os passos de cada visita, ligados por um
   número sorteado que vale só para aquela visita — não identifica a
   pessoa, o aparelho nem a conta. Qualquer
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
17. **O plano fica num lugar só** (mudou em 06/10/2026, regra 61; antes
    toda tela vendia o próximo plano e o Breno achou que "está forçando
    demais"): a página **Plano** do Parceiros é onde se vê o plano, o que
    ele esconde da ficha e se pede outro. Nas outras telas, só o que está
    trancado diz "Disponível no plano …" com "Ver planos", e o atalho
    "Plano" em Atualizações.
18. **Quem administra a academia não avalia ela** (mudou em 05/10/2026,
    regra 53; antes nenhuma conta do Parceiros avaliava). A conta do
    GuiaTennis Parceiros avalia as outras academias como qualquer jogador;
    a academia que ela administra (e o e-mail/WhatsApp de quem a
    administra, ou o WhatsApp dela) não. Quem garante é o banco (gatilho
    `avaliacao_de_parceiro`).
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
    endereço, quadras e tipos, modalidade, preço, horário, WhatsApp,
    avaliações e QR code. **Básico** (grátis): até 3 comodidades, até 3
    fotos, só o WhatsApp, sem cancelamento e sem "como chegar" (fachada,
    entrada, onde estacionar), 1 pessoa, sem números.
    **Completo**: todas as comodidades, 5 fotos, Instagram e site,
    cancelamento, como chegar, 5 pessoas, sem números. **Premium**: o mesmo, 10 pessoas, todos os números
    (Desempenho) e o relatório do mês. O site corta a ficha pelo plano em
    `aplicarPlano` (dentro do `mapRow`; o que passou fica em `c.integral` e
    o formulário de edição usa ele); `LIMITES_DO_PLANO` também trava o
    formulário. O banco confere pessoas (`limite_de_pessoas`) e números
    (`numeros_da_academia` devolve `{trancado: true}` fora do Premium;
    SQL `20261002120000`).
23. **Conta do jogador** (pedido de 02/10/2026): buscar, comparar e chamar
    continuam sem conta; **avaliar exige conta** (uma avaliação por conta
    em cada academia; o banco preenche o nome e o e-mail da conta, gatilho
    `avaliacao_do_jogador`). A conta (`jogadores`, SQL `20261002130000`)
    guarda nome, e-mail, cidade e três avisos por e-mail — academias novas
    e favoritas, promoções das academias, novidades do GuiaTennis —, todos
    começando desligados (LGPD). No site: `jogador`, `renderJogadorSheet`
    (Entrar, Criar conta, Minha conta com Sair e Excluir), menu com "Entrar
    ou criar conta"/"Minha conta" e "Avisos por e-mail", e
    `jogadorEntaoFaz` (avaliar sem conta abre o Entrar e a avaliação sai
    depois). O envio dos avisos existe desde 05/10/2026 (regra 51). Esqueceu a
    senha: WhatsApp do GuiaTennis, como nos Parceiros.
24. **Um lugar só para o e-mail** (pedido de 02/10/2026), no site e no
    GuiaTennis Parceiros: a pessoa digita o e-mail, toca em Continuar e o
    banco (`conta_do_email`, SQL `20261002140000`) diz se já tem conta —
    vai para a senha — ou não — completa o cadastro. No Parceiros,
    `/parceiros/entrar` e `/parceiros/cadastro` são a mesma tela ("Entre ou
    cadastre a sua academia"); o usuário sem @ que o GuiaTennis mandou vai
    direto para a senha; e-mail de jogador é recusado ali. Nos testes:
    `irSenha(page, usuario)` do `harness.js`.
25. **"Voltar" desfaz só o último passo** (pedido de 02/10/2026): cada
    janela e cada passo tem o próprio link e entra no histórico (`?menu=1`,
    `?lista=`, `?preferencias=1`, `?conta=email|senha|cadastro|minha`,
    `?parte=<parte do cadastro>`, `?termos=1`, `?privacidade=1`,
    `/parceiros/cadastro?passo=senha|dados`). `camadasDoEstado` escreve,
    `aplicarCamadas` lê; `sincronizarLink` empilha ao abrir/avançar, volta
    (`history.back`/`go`) ao fechar ou ao "Voltar" do próprio site, e uma
    tela aberta de dentro de uma janela toma o lugar dela no histórico. O
    que foi digitado fica na memória. Janela ou passo novo: inclua em
    `camadasDoEstado`/`aplicarCamadas` (e em `CAMADAS_DO_LINK`). Teste:
    `testes/voltar.js`.
26. **Sem "Área do GuiaTennis" visível** (pedido de 02/10/2026): o admin
    entra pelo mesmo "Entrar ou criar conta" com o e-mail dele
    (`conta_do_email` devolve "admin" → senha → o site recarrega em modo
    admin). "Sair do modo admin" continua no menu.
27. **Trilha de tênis nas etapas** (pedido de 02/10/2026): `trilhaTenis`
    desenha uma faixa de quadra com a linha do saque, uma marca branca por
    etapa e a bolinha andando até a etapa de agora (rastro dourado). Usada
    no cadastro do GuiaTennis Parceiros e no Entrar do jogador ("E-mail ·
    Senha/Seus dados · Pronto", como a do trivago, com o e-mail em cima e a
    seta para trocar). E-mail digitado errado ("gmial.com"): o site pergunta
    "Você quis dizer …@gmail.com?" antes de seguir (`sugestaoDeEmail`).
    Confirmar que o e-mail existe de verdade exige mandar um código por
    e-mail — precisa de um serviço de e-mail ligado ao Supabase (em aberto).
28. **E-mail confirmado por código** (pedido de 02/10/2026): depois de
    criar a conta (jogador) o site manda um código de 6 números pelo login
    do Supabase (`signInWithOtp`) e confere (`verifyOtp`); certo, o banco
    anota (`confirmar_meu_email`, SQL `20261002150000`, só aceita token de
    login por código). "Esqueceu a senha?" (jogador e Parceiros) usa o
    mesmo código + senha nova. Parceiros sem e-mail confirmado veem o
    cartão "Confirme o seu e-mail" no painel. Login `usuário@acesso…` não
    recebe e-mail: esqueci pelo WhatsApp. Sem o serviço de e-mail, o site
    avisa e deixa confirmar depois. Teste: `testes/codigo.js`.
29. **Uma conta, várias academias** (pedido de 03/10/2026), como o "Suas
    empresas" do Google Business Profile, as várias propriedades do
    Booking e as várias lojas do iFood Parceiros: o mesmo login administra
    quantas academias a pessoa responder, **em qualquer plano** (até no
    Básico). Cada academia é pedida e confirmada separadamente, do mesmo
    jeito (código no WhatsApp da ficha, documento ou academia nova
    publicada), e tem o próprio plano, as próprias pessoas e os próprios
    números; o papel (principal ou equipe) é de cada academia. **Cada
    academia paga o próprio plano** (pedido de 03/10/2026): a academia que
    entra na conta começa no Básico (o banco só aceita academia nova no
    Básico) e o Breno muda o plano de cada uma; a lista "Suas academias"
    mostra o plano de cada uma, a página Plano diz de qual academia é e
    lista as outras, e Ajuda e Termos dizem que um plano não vale para as
    outras academias. Banco:
    tabela `academia_vinculos` (quem administra qual, com o papel);
    `academia_acessos.academia_id` virou **a academia aberta no painel**,
    trocada por `abrir_minha_academia`; a lista vem de
    `academias_da_minha_conta`. Tela: seletor no topo (computador), grupo
    "Suas academias" no menu (celular) e na Conta, "Adicionar outra
    academia" (a mesma busca do cadastro, com "Já é sua" nas da conta), o
    pedido com o código aparece no painel, e a ficha no site de outra
    academia da conta tem "Abrir no painel". Incluir na equipe quem já
    administra outra academia soma esta à conta dela (não troca a aberta).
    Tirar alguém de uma academia só apaga o login se ele ficar sem
    nenhuma; academia apagada idem. No admin, "Remover acesso" na ficha
    tira a conta só daquela academia, e o pedido mostra "já administra…".
30. **O plano aparece ao finalizar, não no meio** (pedido de 03/10/2026):
    o formulário da ficha não trava nada pelo plano (comodidades sem
    limite, até 5 fotos — `FOTOS_MAXIMO` —, Instagram, site, cancelamento
    e como chegar abertos, sem aviso no meio). Ao tocar em "Enviar"/"Salvar"
    (quem não é admin, plano abaixo do Premium; na edição, só se o plano
    esconder alguma coisa), vem a tela "Quase lá: escolha o plano"
    (`regPlanoHtml`): o que o plano esconde do que foi preenchido
    (`oQueOPlanoEsconde`), o que falta para vender mais com atalho para a
    parte (`oQueMelhorar`), Premium primeiro e em destaque, Completo, e
    "Continuar no Básico, grátis (a ficha esconde N itens)" por último.
    Tudo é salvo inteiro; a ficha mostra o que o plano libera. Plano pago
    escolhido vira pedido (`pedir_plano`, tabela `pedidos_de_plano`, SQL
    `20261003130000`) e a tela final leva ao WhatsApp para combinar; nada é
    cobrado sozinho. No painel, a academia abaixo do Premium vê "O que os
    alunos não veem" (`pcFichaEscondida`), e todo "Quero o…" do painel
    também anota o pedido. No admin, "Querem mudar de plano" lista os
    pedidos com WhatsApp e "Mudar para o …"; mudar o plano atende o pedido
    e tira da lista. Teste: `testes/plano-ao-finalizar.js`.
31. **Cidade do estado escolhido** (pedido de 03/10/2026): nas
    Preferências de busca, a cidade vem da lista oficial de municípios do
    IBGE (`servicodados.ibge.gov.br`, guardada no aparelho,
    `CIDADES_DO_UF`). Trocar o estado tira a cidade de outro estado; as
    cidades do guia sugeridas são só as do estado; salvar uma cidade que
    não é do estado avisa ("São Paulo não fica em Ceará"); vale o nome
    oficial. Sem resposta do IBGE, a cidade fica livre e nada é sugerido.
32. **Pedido de acesso vai para o responsável** (pedido de 03/10/2026),
    como o "Solicitar acesso" do Google Business Profile: quem pede uma
    academia que já tem responsável principal não recebe código no
    WhatsApp da ficha; o pedido (`pedido_destino = 'responsavel'`) aparece
    no painel e na Conta do responsável ("Pedidos de acesso", com nome,
    e-mail e cargo), que aceita (entra na equipe, se o plano couber;
    plano cheio oferece o de cima) ou recusa. O responsável também pode incluir
    a pessoa direto pelo e-mail (Pessoas com acesso). Quem pediu vê
    "Pedido enviado ao responsável". No admin, o pedido diz "Já tem
    responsável (…)", sem "Gerar código"; "Aprovar" pede confirmação (só
    depois de conferir documento). SQL `20261003140000_pedido_ao_responsavel`
    (`pedidos_para_minha_academia`, `responder_pedido_de_acesso`). Teste:
    `testes/pedido-ao-responsavel.js`. Desde 05/10/2026 o responsável recebe o
    pedido também por e-mail (regra 51).
33. **Convite para a conta, como o trivago** (pedido de 04/10/2026): no
    topo, ao lado do menu, o ícone da pessoa com brilho dourado para quem
    não entrou (`botaoConta`); jogador logado vê a inicial do nome;
    academia e admin não veem. Na home, para quem já usou o site (viu
    academia, buscou ou chamou), o cartão "Jogou numa dessas academias?
    · Criar conta" (`conviteParaConta`); fechar esconde por 14 dias
    (`CONVITE_CONTA_KEY`, no aparelho). O convite só promete o que a
    conta faz hoje (avaliar); quando os avisos por e-mail estiverem
    saindo, dá para citá-los. Teste: `testes/convite-conta.js`.
34. **Senha como os grandes** (pedido de 04/10/2026): olhinho em todo
    campo de senha (`ligarCamposDeSenha`, roda em cada render), "Repita a
    senha" em toda senha nova, barrinha fraca/boa/forte embaixo da senha
    nova (`forcaDaSenha`) e recusa de senha óbvia — as mais usadas, a
    sequência, a que repete o e-mail ou "guiatennis" (`erroDaSenha`,
    `SENHAS_COMUNS`). Sem regra de símbolo obrigatório. O código do e-mail
    aceita 6 a 10 números (o tamanho é do painel do Supabase: Authentication
    → Sign In / Providers → Email → "Email OTP Length"; o Breno quer 6).
    Teste: `testes/senha.js`.
    **Senha recusada (pedido de 05/10/2026):** no cadastro do jogador, no
    dos Parceiros, no primeiro acesso, em "Trocar senha" e na senha nova
    pelo código, a senha digitada continua no campo e só "Repita a senha"
    é apagada (`focarDepoisDaSenha`: o cursor vai para a repetição quando as
    duas não batem, e para a senha quando é ela que precisa mudar).
    "Esqueci a senha" (`senhaNovaPeloCodigo`, correção de 04/10/2026): o
    código só vale uma vez; se ele deu certo e o Supabase recusou a senha,
    "tentar de novo" usa a sessão que o código abriu (antes conferia o
    código gasto e nunca dava certo). A recusa diz o motivo (regra de
    senha do painel, senha vazada, muitas tentativas); a mesma senha de
    antes só entra, com "Essa já era a sua senha".
35. **Usuário vira login por e-mail** (pedido de 04/10/2026): quem recebeu
    usuário do GuiaTennis (`…@acesso.guiatennis.com.br`, que não recebe
    e-mail) passa a entrar pelo e-mail que informou no primeiro acesso
    (gatilho `login_segue_o_email`, SQL `20261004120000_login_pelo_email`,
    que também troca quem já tinha feito o primeiro acesso). O usuário
    continua entrando: o site pergunta o login a `login_do_usuario`. Assim o
    "Esqueci a senha" manda o código para todo mundo. Não troca se o e-mail
    já for de outra conta.
36. **Respiro nos formulários** (pedido de 04/10/2026): o título de cada
    campo (`.field-label`, quase sempre `<label>`) é bloco — antes ficava
    em linha e ignorava a margem, colando no campo de cima. Bloco "Respiro"
    no fim do `<style>`: espaço entre título e campo de cima, entre
    caixinhas de marcar, avisos e links ("Trocar o e-mail"). Mudança de
    espaço só ali, para não espalhar.
37. **Vou viajar** (pedido de 04/10/2026), como as "Próximas viagens" do
    Airbnb e do Booking: menu › Minhas quadras › "Vou viajar" guarda
    estado, cidade (lista do IBGE), onde vai ficar (hotel ou endereço,
    opcional) e datas opcionais (`VIAGENS_KEY`, só no aparelho, até 5).
    Com o hotel achado no mapa, "Ver quadras" ordena a partir dele, como a
    "distância da hospedagem" do Booking (`verQuadrasDaViagem`; o endereço
    não vai para o link); sem o ponto, abre pela cidade e avisa. A home mostra o cartão da viagem de 15 dias antes até
    a volta ("Sua próxima viagem" / "Você está em viagem", com quantas
    academias há lá ou "veja as mais perto"); sem data, fica até apagar.
    Durante a viagem, "Pesquisar" sem digitar abre a cidade dela
    (`cidadePadraoDaBusca`); depois da volta, a viagem some sozinha. Buscar
    uma cidade que não é a de casa pergunta "Vai viajar para…?"
    (`perguntaViagem`). Convite "Vai viajar? A gente também te ajuda"
    (`conviteViagem`, pedido de 04/10/2026): **não no cadastro**, só para
    quem já está navegando — 3 fichas/buscas na visita ou 2 minutos no site
    —, na ficha e na home (sem empilhar com o convite da conta); some com a
    viagem guardada e, fechado, volta só em 30 dias. Política de
    Privacidade atualizada. Teste: `testes/viagem.js`.
38. **Aviso de viagem por e-mail** (pedido de 04/10/2026; **mudou em
    05/10/2026**: saiu de "Avisos por e-mail" do perfil e foi para a aba
    "Vou viajar", junto da viagem — `guardarAvisoDaViagem`). Na aba, a
    caixa "Quero receber um aviso por e-mail perto da data da viagem"
    (desmarcada; sem conta, guardar pede o Entrar e guarda depois); editar
    a viagem da conta traz a caixa marcada; desmarcar ou apagar a viagem
    desliga o aviso. Uma viagem com aviso por vez (a última marcada); a da
    conta aparece também em outro aparelho (`trazerViagemDaConta`). Antes,
    em Minha conta, a caixa abria estado, cidade (IBGE), ida e volta. Fica na
    conta (`jogadores.avisos_viagem`, `viagem_uf/cidade/ida/volta`, SQL
    `20261004130000_aviso_de_viagem` e `20261004140000_viagem_sem_data`) e
    também vira a viagem do aparelho (sem perder o hotel guardado nela). O e-mail sai 7 dias antes da ida (ou
    logo, sem data ou com menos de 7 dias), pelo Resend (regra 51). Marcar não redesenha a tela, para a senha digitada
    não se perder.
39. **Pacote de 05/10/2026** (fotos do Breno no iPad). Teste:
    `testes/comparar-e-avisos.js`.
    - Conta no topo pisca em amarelo, com um "!" (`contaPisca`). Para quem
      não entrou, um balão sai do ícone (`PUSHES_CONTA`): depois de 10 s,
      fica 9 s, volta a cada 40 s, no máximo 3 por visita; o ✕ para por 3
      dias. Promete só o que a conta faz hoje (avisos por e-mail, avaliar,
      a mesma conta em todo aparelho). Desde 05/10/2026 o terceiro balão
      fala das buscas salvas (regra 52).
    - "Grátis para quem joga" é o primeiro card de "Por que o GuiaTennis",
      com a mesma cor dos outros.
    - Seletor da comparação: bandeja com "Comparar N" quando há 2 a 5.
    - Tabela da comparação: cada academia em cima da própria coluna, o
      "+ Escolher" no canto, sem rolar de lado; com 3 a 5 academias, a
      letra diminui no celular.
    - "Ainda em dúvida?": um botão na página; depois de 15 s na
      comparação, um aviso com os destaques (menor preço, melhor nota,
      mais perto) e "Me ajude a decidir", que abre a mesma ajuda numa
      folha.
    - Minhas quadras (todas as abas) e o seletor vão da mais perto para a
      mais longe (`pontoDeReferencia`, nesta ordem: busca aberta, viagem
      com hotel, última busca, cidade das preferências).
    - Parceiros:
      - "Começar agora · é de graça!" no meio, pulsando.
      - O card dos números diz "Só no Premium" e que os números já são
        contados e aparecem ao passar para o Premium.
      - Planos: "Até 1 e-mail / 5 e-mails / 10 e-mails com acesso".
    - **O site fala "jogadores", não "alunos"**: atende quem faz aula e
      quem loca quadra.
40. **"Represento a academia" só quando a academia já é conhecida**
    (pedido de 05/10/2026, print do cadastro: "não faz sentido aparecer
    represento a academia sendo que nem sabe a academia ainda"). Nos dados
    de contato do cadastro do GuiaTennis Parceiros, o aceite é só "Li e
    concordo com os Termos de Uso e a Política de Privacidade do
    GuiaTennis" e o campo é "Seu cargo" (antes "Cargo na academia"). A
    declaração vem na hora em que a academia aparece, como o "autorizado a
    gerenciar esta empresa" do Google Business Profile e o "certifico" do
    fim do cadastro do Booking: embaixo do "Administrar esta academia"
    ("Ao pedir, você declara que é dono(a) ou está autorizado(a)…", na
    primeira academia e em "Adicionar outra academia") e na revisão da
    academia nova mandada pela conta ("Ao enviar, você declara…"). O
    primeiro acesso de quem recebeu usuário continua com "Represento esta
    academia", porque ali a academia já está no título. Teste:
    `testes/parceiros.js`.
41. **Perfil da conta do jogador** (pedido de 05/10/2026, referência: o
    "Meu trivago" e a "Conta" do Airbnb e do Booking): "Minha conta" virou
    uma página própria, **`/perfil`** (`renderPerfilJogador`, `irPerfil`),
    fora do Google. Topo com a inicial num círculo, "Olá, Nome" e o e-mail;
    cartões: "Jogou nessas academias?" (as chamadas ainda sem avaliação,
    com "Avaliar"), Minhas quadras (favoritas, vistas, chamadas, "Vou
    viajar"), Login e preferências (e-mail da conta, "Trocar a senha" pelo
    código no e-mail, preferências de busca), Dados pessoais e Avisos por
    e-mail (os mesmos campos `jog-*` da antiga folha) e, embaixo, Sair e
    Excluir. A inicial no topo e o menu "Minha conta" abrem o perfil; o
    menu "Avisos por e-mail" abre nos avisos; `/perfil` sem conta abre o
    Entrar e volta para o perfil; o link antigo `?conta=minha` vira
    `/perfil`; sair do perfil volta para a home. Teste:
    `testes/perfil-e-avaliar.js`.
42. **"Jogou aqui? Avalie essa academia"** (pedido de 05/10/2026, como o
    "Você esteve em…?" do Google Maps e o "Como foi?" do iFood): **um dia
    depois** de a pessoa chamar uma academia (WhatsApp, Instagram ou site —
    a lista "Academias que você chamou", no aparelho), um balão embaixo
    pergunta "Jogou na …?", com 5 estrelas; tocar numa estrela abre a ficha
    nas avaliações com a nota marcada (sem conta, o envio pede o Entrar).
    Uma academia por visita, 6 s depois de abrir o site, sem cobrir janela
    aberta nem o balão da conta; ignorado ou "Agora não", volta em 3 dias,
    no máximo 3 vezes; "Não joguei aqui" não pergunta mais; avaliada (ou
    "Você já avaliou"), sai. Só até 60 dias depois do contato. Admin e
    academia não recebem. Tudo no aparelho (`AVALIADAS_KEY`,
    `PEDIR_AVALIACAO_KEY`, `academiasParaAvaliar`, `ligarPedidoDeAvaliacao`);
    Política de Privacidade atualizada (5 de outubro).
43. **Parceiros: Perfil, Suas academias e Pessoas** (pedido de 05/10/2026):
    a antiga página "Conta" virou três. **Perfil** (`/parceiros/perfil`,
    `pcPerfil`; o círculo com a inicial no topo e o último atalho da barra
    de baixo): dados de contato, login e senha, quantas academias e pedidos
    a conta tem, Sair. **Suas academias** (`/parceiros/academias`,
    `pcAcademias`; "Academias" no menu), como o "Suas empresas" do Google
    Business Profile: um cartão por academia (plano, situação, papel,
    "Abrir o painel", "Ver no site"), os pedidos em andamento e "Adicionar
    outra academia" sempre. **Pessoas** (`/parceiros/pessoas`,
    `pcPessoasDaAcademia`): quem tem acesso à academia aberta, os pedidos
    de acesso (responsável) e o plano de cima. `/parceiros/conta` abre o
    Perfil (links antigos). **"Confirme o seu e-mail"** (correção de
    05/10/2026: a conta nova que já tinha pedido uma academia não via mais o
    aviso) aparece no painel com ou sem academia, na tela dos pedidos, em
    Suas academias e no Perfil, e o círculo da conta ganha o "!" amarelo
    enquanto o e-mail não é confirmado — nos Parceiros e na inicial do
    jogador (`.conta-topo.confirmar`).
44. **Vários pedidos ao mesmo tempo** (pedido de 05/10/2026): com um pedido
    aberto, a conta pede outra academia (no cartão do pedido: "Adicionar
    outra academia ›"). Cada pedido tem o próprio código, o próprio
    "Cancelar" e o próprio destino (GuiaTennis ou responsável). Banco:
    tabela `pedidos_de_acesso` (uma linha por conta e academia, até 10
    abertos), `codigos_de_verificacao` com chave (conta, academia),
    `meus_pedidos_de_acesso`, `pedidos_de_acesso_admin` (o admin vê um
    pedido por linha) e as funções do pedido com `p_academia` (opcional,
    para o site antigo); SQL `20261005120000_varios_pedidos`. As colunas
    `pedido_*` de `academia_acessos` ficam vazias. No site: `meusPedidos()`,
    `pcPedidos()`, `pcPedidoEnviado(p, i)`, `rpcDoPedido`. **O site não diz
    como o GuiaTennis confere** (pedido de 05/10/2026: "é difícil ter acesso
    ao CNPJ"): nada de "documento (CNPJ ou contrato social)" nas telas, na
    Ajuda nem nos Termos — só "Fale com o GuiaTennis" / "o GuiaTennis
    confirma com você". Teste: `testes/varias-academias.js` e, no banco,
    `banco-acesso.py`.
45. **Parceiros em outra aba, com endereço próprio** (pedido de 05/10/2026,
    print do trivago e do trivago Business Studio abertos em abas
    separadas): do site dos jogadores, toda entrada no GuiaTennis Parceiros
    abre a aba dele (`window.open` com o nome `guiatennis-parceiros`, que
    volta para a mesma aba; bloqueado, abre na mesma); de lá, "Ir para o
    GuiaTennis" e "Ver no site" vão para a aba `guiatennis`. O código já
    entende **`parceiros.guiatennis.com.br`** com links curtos (`/painel`,
    `/cadastro`, `/academias`: `caminhoDosParceiros`, `urlDosParceiros`);
    **o Breno não quer outro endereço** (05/10/2026): o Parceiros fica em
    guiatennis.com.br/parceiros e `PARCEIROS_NO_ENDERECO_PROPRIO` continua
    `false` (o código fica pronto, sem uso). No mesmo endereço, o login é um
    só para os dois sites (regra 53). Menu do site dos
    jogadores com a conta de academia: **"Sair da conta"** (não "Sair da
    área da academia").
46. **Percurso das visitas** (pedido de 05/10/2026: "o caminho exato, de
    onde veio, por qual meio, o que fez, por quanto tempo"), como o "funil"
    e a "exploração de caminho" do Google Analytics e a linha do tempo do
    Microsoft Clarity (sem gravar a tela). Cada passo vai para a tabela
    `passos_das_visitas` (SQL `20261005140000_percurso_das_visitas`): a
    visita (número sorteado em `sessionStorage`, que some ao fechar a aba ou
    depois de 30 min parada — `visitaAtual`), o site (jogadores ou
    parceiros), o tipo (tela, busca, ficha, contato, ação, saída), o
    caminho do link sem o "?", o detalhe, a academia, a origem
    (`origemDoAcesso`), o meio (`meioDoAcesso`: utm_medium, a parte depois
    do traço da etiqueta — "Instagram-bio" → "bio" —, navegador do app,
    busca do Google, digitou o endereço…), o aparelho e os segundos desde a
    chegada. Quem grava: `registrarPasso`; a tela e a janela por cima
    (menu, cadastro da academia parte a parte, Entrar/Criar conta) saem
    sozinhas do fim do `render` (`anotarTelaNoPercurso`); busca (só a
    região e quantos filtros), contato, compartilhar, favoritar, comparar,
    avaliar, criar conta/entrar, pedir academia, código, plano escolhido,
    pausar; a saída vai com `keepalive` ao esconder a página. O admin não
    grava; a conta de academia só grava no GuiaTennis Parceiros. Banco sem
    a tabela: para de mandar (`semPercurso`). **Relatório**: "Percurso das
    visitas", no painel do admin (antes, botão do mapa no canto) — Jogadores ou Parceiros, Hoje/7/30 dias: funil
    (visitas → buscaram → abriram ficha → chamaram; no Parceiros: abriram o
    cadastro → criaram a conta → pediram academia), de onde vieram (com
    quantos chegaram ao fim), caminhos mais comuns ("Início → Busca → Ficha
    → Contato") e cada visita passo a passo, com "ficou X" em cada passo.
    Política de Privacidade atualizada (regra 9). Teste: `testes/percurso.js`.
47. **Acessos do admin agrupados por academia** (pedido de 05/10/2026: "muito
    empilhado"): em "Acessos das academias", um cartão por academia com as
    pessoas dela juntas (responsável primeiro, equipe depois).
48. **A academia pausa a própria ficha** (pedido de 05/10/2026), como o
    "temporariamente fechado" do Google Business Profile: em Suas
    academias, "Pausar no site" (7, 15, 30 dias ou "Até eu voltar") e
    "Voltar a aparecer no site", cada academia separada; qualquer pessoa
    que administra a academia pode. Pausa feita pelo GuiaTennis só o
    GuiaTennis desfaz ("Pausada pelo GuiaTennis. Fale com a gente").
    Banco: `academias.pausada_pela_academia`, `pausar_minha_academia` e o
    gatilho `proteger_ficha_da_academia` que só deixa a pausa passar quando
    vem dessa função (e não marca a ficha como confirmada); SQL
    `20261005130000_academia_pausa`. Ajuda, Minha ficha e Termos dizem
    isso. Teste: `testes/perfil-e-avaliar.js`.
49. **"Pedir análise" fica na avaliação** (pedido de 05/10/2026), como o
    "Denunciar avaliação" do Google: no topo do cartão da avaliação (só
    para a academia dona), não mais junto da resposta da academia.
50. **Sem a faixa "Área da academia" no site dos jogadores** (pedido de
    05/10/2026: "não acho legal aparecer isso para qualquer acesso"): com o
    Parceiros em aba própria, a conta de academia logada vê o site dos
    jogadores limpo; o painel fica no menu ("Painel da minha academia").
51. **Avisos por e-mail pelo Resend** (pedido de 05/10/2026: "preciso
    mandar os e-mails ainda"), como o Google Business Profile (avaliação
    nova, pedido de acesso), o Airbnb e o Booking ("Sua viagem para…") e o
    Zillow/Idealista (alerta da busca salva). Tudo dentro do banco, sem
    servidor novo (SQL `20261005160000_avisos_por_email`): cada aviso entra
    na fila `emails_a_enviar` (a `chave` não deixa repetir) e o relógio do
    banco (**pg_cron**, `guiatennis-enviar-emails`, a cada minuto) chama
    `enviar_emails()`, que manda pela API do Resend com o **pg_net** — dois
    por vez (limite do Resend), até 5 tentativas em 3 dias, 429 não conta,
    chave de idempotência. A chave do Resend fica no **cofre (Vault)** do
    Supabase: o GitHub copia do segredo `RESEND_API_KEY` (passo "Ligar os
    avisos por e-mail" do `banco.yml`, `configurar_emails`), que também diz
    o endereço dos links (no banco de teste, a prévia do PR, e o assunto
    ganha "[Teste]"). Os avisos:
    - **avaliação nova** → todas as pessoas da academia (gatilho
      `aviso_de_avaliacao_nova`), com a nota, o comentário, "Responder a
      avaliação" e, com 1 ou 2 estrelas, o lembrete do "Pedir análise";
    - **pedido de acesso** → o responsável principal ("Ver o pedido" em
      Pessoas) ou, quando o pedido é para o GuiaTennis conferir, o admin
      (com o WhatsApp de quem pediu; academia nova: "Academia nova para
      aprovar"); um por dia para o mesmo pedido;
    - **pedido aceito** → quem pediu ("Pronto: você já administra…"),
      menos quando a própria pessoa digitou o código;
    - **viagem** → 7 dias antes da ida (sem data ou com menos de 7 dias:
      ao salvar), uma vez por viagem, com até 6 academias da cidade e "Ver
      no mapa"; sem academia na cidade, espera; viagem acabada, não;
    - **academias novas** → uma vez por dia, às 10h de Brasília
      (`guiatennis-avisos-do-dia`), só quando há novidade: as que entraram
      na cidade da conta (aviso "Academias novas na minha cidade") e perto
      de cada busca salva com aviso (distância da busca ou 10 km; a página
      da cidade vale a cidade inteira; mesmo piso, cobertura e modalidade).
      `academias.publicada_em` diz quando a academia entrou.
    Só recebe quem **confirmou o e-mail** pelo código. Todo aviso tem o
    link **"Não quero mais receber"** (`?parar-avisos=<número da conta>&aviso=`),
    que abre uma folha que pergunta antes de parar (`renderPararAvisos`,
    `parar_avisos`), sem entrar na conta, e o cabeçalho List-Unsubscribe.
    A academia desliga também no Perfil do Parceiros ("Avisos por e-mail",
    `mudar_avisos_dos_parceiros`; começam ligados, como no Google). Links
    com `utm_source=Email-…` (aparecem em "De onde vieram"). No admin,
    Estatísticas mostra se os avisos estão saindo (`situacao_dos_emails`:
    chave, pg_net, relógio, enviados em 7 dias, fila, último erro). Sem a
    chave, sem o pg_net ou sem o pg_cron, tudo fica na fila e nada quebra.
    O aviso da conta virou "Academias novas na minha cidade" (saiu "e
    mudanças nas minhas favoritas": as favoritas ficam só no aparelho e o
    banco não as conhece). Teste: `testes/banco-emails.py` (Postgres local)
    e `testes/buscas-e-avisos.js`.
52. **Buscas salvas** (pedido de 05/10/2026: "sim salvar busca"), como o
    "Salvar busca" do Booking e o "Save search" do Zillow e do Idealista:
    na busca, embaixo da barra, **"Salvar busca"** (sem conta, abre o
    Entrar e salva depois); salva, vira "Busca salva" e aparece o aviso
    "Busca salva na sua conta · Avisar por e-mail quando entrar academia
    nova aqui" (o aviso começa desligado — LGPD). Fica na conta
    (`buscas_salvas`, SQL `20261005150000`): o que foi digitado, bairro e
    cidade, o ponto arredondado (~100 m, o banco arredonda de novo), os
    filtros e o link (`/busca?…` ou a página da cidade, `/quadras/…`; o
    banco recusa outro link); até 20 por conta, sem repetir. No perfil, o
    cartão **"Buscas salvas"** (tocar refaz a busca, "Avisar por e-mail de
    academias novas", "Apagar") e, no menu, "Minhas quadras › Buscas
    salvas". Banco sem a tabela: o botão e o item somem
    (`semBuscasSalvas`). Política de Privacidade atualizada.
53. **A conta do Parceiros é uma conta normal no site dos jogadores**
    (pedido de 05/10/2026: "deixar como um e-mail normal, só as avaliações
    que não podem ser feitas se administrar uma academia"), como o Google
    (a conta do Business Profile avalia outros lugares) e o Booking (o dono
    de hotel também viaja). No site dos jogadores, a conta logada do
    Parceiros tem perfil (`/perfil`), buscas salvas, avisos, viagem,
    "Jogou aqui?" e avalia as outras academias; a parte de jogador nasce
    sozinha, com o nome e o e-mail do Parceiros (`ativar_conta_de_jogador`,
    chamada em `carregarConta`; SQL `20261005170000_parceiro_tambem_joga`).
    Entrar pelo "Entrar" dos jogadores com o e-mail do Parceiros segue como
    jogador (faz o que ia fazer, sem recarregar). Menu: "Minha conta",
    "Painel da minha academia" e, no Suporte, **"GuiaTennis Parceiros ·
    seu painel"** de volta (o Breno, logado com um e-mail do Parceiros,
    não achava o Parceiros no menu). Sem "Excluir minha conta" no perfil
    dessa conta ("fale com o GuiaTennis"). As estatísticas continuam sem
    contar a conta de academia.
54. **Página da cidade = todas as academias da cidade** (pedido de
    05/10/2026: "quando clicar em ver as academias de São Paulo, não
    pesquisar um endereço"), como as páginas de destino do Booking e do
    TripAdvisor: `/quadras/<cidade>` (e "Ver as academias de…", "Quadras em…",
    "Buscar quadra" com a cidade das preferências, viagem sem hotel) não
    procura o endereço no mapa — lista só as academias daquela cidade
    (`state.cidadeDaPagina`, filtro em `applyFilters`), na ordem
    recomendada, com "Todas as academias de São Paulo. Para ver as mais
    perto, digite o bairro, o endereço ou o CEP." Digitar um endereço volta
    à busca normal. A página do bairro (`/quadras/sao-paulo/moema`)
    continua mostrando as mais perto do bairro.
55. **Textos "Por que…"** (pedido de 05/10/2026): em "Por que o
    GuiaTennis", a taxa aparece uma vez só ("Grátis para quem joga"), o
    segundo cartão diz que é **"uma facilidade tremenda"** achar a quadra
    mais perto com tudo o que precisa saber (preço, horário, piso, fotos,
    como chegar), entram "Compare lado a lado" e "Avisos que trabalham por
    você". "Por que estar no GuiaTennis" (home e Parceiros) atualizado com
    o que a academia ganha hoje: buscas salvas e viagens trazendo
    jogadores por e-mail, ficha que pausa, avaliação nova no e-mail (com o
    QR code), equipe e várias academias numa conta, números no Premium.
56. **"Tem viagem marcada? O GuiaTennis pode te ajudar"** (pedido de
    05/10/2026), como o "Planejando uma viagem?" do Booking e do Airbnb: um
    balão embaixo, uns 5 segundos depois de entrar na conta (e ao abrir o
    site já logado, se o "Jogou aqui?" não tiver o que perguntar — um balão
    por visita), com "Guardar a viagem" (abre a aba "Vou viajar", com o
    aviso por e-mail) e "Agora não". Só para quem não tem viagem guardada;
    uma vez a cada 30 dias (`PUSH_VIAGEM_KEY`, no aparelho); nunca junto do
    "Jogou aqui?" nem no cadastro. Teste: `testes/viagem.js`.
57. **Admin no GuiaTennis Parceiros** (pedido de 06/10/2026: "não estou com
    acesso no Parceiros sendo admin"), como o acesso de suporte do Google
    Business Profile e o "ver como a propriedade" do Booking: com o admin
    logado, página privada do Parceiros (e o "Entrar") abre
    **`/parceiros/ver`** ("Ver como academia", fora do Google): busca por
    nome, bairro ou cidade e a lista de todas as academias. Escolhida, o
    admin vê o Parceiros como ela vê (painel, desempenho, avaliações,
    ficha, pessoas, plano, Suas academias, perfil), com a faixa amarela
    "Modo admin… Trocar de academia · Sair do modo admin". Como funciona
    (`montarVisaoAdmin`, `rpcNaVisaoAdmin`): uma conta de academia de
    mentira só naquela aba, e as funções "da minha academia" viram as do
    admin — números com `p_academia`, pessoas de `acessos_das_academias`,
    pedidos de `pedidos_de_acesso_admin`, aceitar/recusar vira
    `aprovar/recusar_pedido_de_acesso`, tirar alguém vira
    `remover_acesso_academia`, pausar muda a ficha como admin; editar a
    ficha é a edição do admin. O que é da academia fica só para ver
    ("No modo admin, isso é só para ver…"): responder avaliação, pedir
    plano, incluir pessoa, dados de contato, avisos, trocar a senha (seria
    a do admin). A academia escolhida fica na aba (`sessionStorage`):
    recarregar continua nela; no site dos jogadores o admin volta a ser só
    o admin; "Sair" no Parceiros sai do modo, não do login. No menu do site
    dos jogadores, "GuiaTennis Parceiros · ver como academia"; no topo do
    Parceiros, "Ver como academia". Teste: `testes/admin-parceiros.js`.
58. **Painel do admin em `/admin`** (pedido de 06/10/2026: "quando eu
    fizer o login, mude o site para eu ter o controle de tudo, acessos e
    tudo mais, algo diferenciado, organizado, separado e bem completo…
    mas não aparecer para outras pessoas a minha área"), como o admin da
    Shopify, o painel do Stripe e a extranet do Booking: um site à parte,
    com barra verde-escura em cima ("GuiaTennis · ADMIN", "Ver o site",
    "Ver como academia", "Sair") e as seções do lado (no celular, no botão
    de menu). **Entrar com o e-mail do admin leva ao painel** — pelo
    "Entrar" do site (recarrega já em `/admin`), pelo Entrar do Parceiros e
    pela senha nova do código. Seções, cada uma no seu link
    (`/admin/<seção>`): **Visão geral** ("Para fazer agora": academias
    para aprovar, pedidos para administrar, pedidos de plano, academias
    fora do mapa, e-mails parados ou que não saíram; os últimos 30 dias —
    acessos, buscas, fichas abertas e contatos, com a variação contra os
    30 dias antes e a linha das 12 semanas; academias no ar, pausadas, em
    análise, fichas básicas, com acesso, por plano; contas, e-mails
    confirmados, buscas salvas, contas no Parceiros, avaliações e nota
    média; situação dos e-mails), **Pendências** (aprovar/rejeitar, pedidos
    para administrar com o código, pedidos de plano), **Academias**
    (busca, filtros — no ar, em análise, pausadas, fichas básicas, sem
    acesso, planos pagos, fora do mapa — e, em cada uma, abrir a ficha,
    editar, ver como academia, QR code, plano, pausar 7/15/30 dias ou
    voltar para a busca), **Acessos ao Parceiros**, **Contas de jogador**
    (nome, e-mail, cidade, criada em, avisos ligados; os números de
    `numeros_das_contas_admin`), **Avaliações** (todas, a mais nova
    primeiro, com o contato de quem avaliou, a resposta da academia,
    filtros e excluir), **Estatísticas** e **Percurso das visitas** (o que
    eram as janelas dos botões redondos), **E-mails** (situação e os
    últimos 100 da fila, com "Tentar de novo" no que não saiu —
    `emails_recentes_admin`, `reenviar_email_admin`) e **Ferramentas** (QR
    do site, coordenadas que faltam, academias do mapa aberto, qual banco).
    **Ninguém mais vê**: para visitante, jogador ou academia, `/admin` abre
    a página inicial, com o link "/" e sem nenhum sinal do painel; o
    painel fica fora do Google (`noindex, nofollow`, também no cabeçalho
    do Netlify) e o `robots.txt` de propósito não cita o `/admin`. Os
    dados continuam protegidos no banco (`eh_admin()` em cada função e
    tabela) — esconder a tela é só a parte visível. No site dos jogadores,
    o admin vê a faixa "Modo admin — Abrir o painel (n)" e, no menu,
    "Painel do admin"; os três botões redondos (cliques, percurso,
    prancheta) saíram. Ficha aberta pelo painel volta ao painel. As
    janelas antigas (`renderAdminPanel`, `renderStatsPanel`,
    `renderPercursosPanel`) continuam no código, por cima do mesmo
    conteúdo (`conteudoDasPendentes`, `conteudoDasEstatisticas`,
    `conteudoDosPercursos`, `blocoPedidosParaAdministrar`,
    `blocoAcessosDasAcademias`), e os testes antigos as usam. Teste:
    `testes/painel-admin.js`.
59. **Declaração de quem pede uma academia é caixinha** (pedido de
    06/10/2026, "coloque com aquele quadradinho, igual 'eu li e
    concordo'"): no Parceiros, "Administrar esta academia" e o envio de
    academia nova só vão com a caixinha marcada — "Declaro que estou
    autorizado(a) pela academia a administrar a ficha dela [cadastrá-la]
    no GuiaTennis e que respondo pelas informações que publicar" (sem "é
    dono(a)", pedido do Breno). Sem marcar: "Marque a declaração para
    pedir". O banco guarda quando foi marcada (`pedidos_de_acesso.declarou_em`,
    SQL `20261006130000_declaracao_ao_pedir`; `pedir_para_administrar(p_academia,
    p_declaro)`), como prova. **A confirmação da academia continua** (código
    no WhatsApp da ficha, o responsável aceitar, ou o GuiaTennis publicar a
    academia nova): o Breno perguntou se a declaração tira a
    responsabilidade dele — tira em parte (quem mente responde por isso,
    e a caixinha com a hora guardada é a prova), mas não toda; sem
    confirmar, qualquer pessoa tomaria a ficha de uma academia e trocaria
    o WhatsApp. Saiu também o texto "e você pode pedir uma enquanto outra
    ainda está em análise…" e "Cada academia tem o próprio plano e paga o
    próprio valor…" da tela "Adicionar outra academia".
61. **Parceiros mais leve** (pedidos de 06/10/2026, com fotos de tela): a
    página inicial da academia se chama **Atualizações** (o link continua
    `/parceiros/painel`); o menu vai do mais importante ao menos —
    Atualizações, Minha ficha, Avaliações, Desempenho, Suas academias,
    Pessoas, Plano, Perfil, Ajuda; sem "Voltar ao painel" em lugar nenhum;
    embaixo do cartão do pedido, nenhum texto a mais ("Responde por mais
    uma?", "Ver todas as suas academias"); "No ar, com as informações
    confirmadas por vocês" só aparece por 3 dias depois de a ficha ir ao ar
    ou ser atualizada (o que pede ação — pausada, em análise, ficha
    básica — aparece sempre); os números trancados ("Disponível no plano
    Premium") ficam no fim de Atualizações; e sem as caixas "Aprimore o
    plano"/"Em breve no Premium"/"O que os jogadores não veem" fora da
    página Plano (regra 17). No site dos jogadores, o menu diz "Minha
    academia".
60. **Academia nova da conta vai ao ar sozinha** (escolha do Breno em
    06/10/2026, entre manter, isto e liberar tudo): academia NOVA
    cadastrada por conta do Parceiros com o **e-mail confirmado** (e a
    declaração marcada) entra no ar na hora, confirmada e no Básico, e a
    conta já administra como responsável. Até 3 academias novas por conta
    em 24 horas; da 4ª em diante, ou sem e-mail confirmado, vira pedido
    como antes. O admin recebe o e-mail "Academia nova no ar" e a vê em
    **Pendências › "Foram ao ar sozinhas: revise"** (abrir a ficha, ver
    como academia, "Marcar como revisada"); "Para fazer agora" e o número
    da seção contam elas. Academia que **já está** no guia continua com a
    confirmação (código ou responsável). SQL
    `20261006140000_academia_nova_no_ar`: `academias.revisar_desde`,
    `academia_vinculos.declarou_em` (a hora da declaração passa do pedido
    para o vínculo), `pedido_da_academia_nova()`, `aviso_de_academia_no_ar`,
    `academias_para_revisar_admin()`, `marcar_academia_revisada(id)`; o
    `proteger_ficha_da_academia` deixa passar só essa publicação
    (`guiatennis.academia_nova_no_ar`). Termos (seção 4) atualizados.
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
| Perfil do jogador (regra 41) | `/perfil` | `noindex, nofollow` |

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
  `/comparar`, `/perfil`, `/parceiros` e `/parceiros/*` entregam o `index.html`
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
computador). No celular, tudo pelo menu: a barra de atalhos embaixo
(Painel, Desempenho, Avaliações, Ficha, Perfil) saiu em 06/10/2026 — o
Breno não gostou dela. Não existe mais botão solto de "cadastre sua academia": tudo
o que é da academia leva para cá.

| Página | Endereço | Google |
|---|---|---|
| Apresentação: benefícios, como funciona, números do site, planos, perguntas | `/parceiros` (logado vai para o painel) | indexa |
| Planos (tabela do que cada plano libera) | `/parceiros/planos` | indexa |
| Ajuda (10 perguntas + WhatsApp e e-mail) | `/parceiros/ajuda` | indexa |
| Cadastro: 1) e-mail → 2) conta (nome, WhatsApp, senha, aceite) → 3) academia: "Administrar" uma do guia ou "Cadastrar academia nova" | `/parceiros/cadastro` (`?academia=<id8>` já pede aquela) | indexa; com `?academia`, não |
| Entrar (usuário e senha) | `/parceiros/entrar` | não |
| Painel, Desempenho, Avaliações, Minha ficha, Pessoas, Plano, Suas academias, Perfil (regra 43) | `/parceiros/painel`, `/parceiros/pessoas`, `/parceiros/academias`, `/parceiros/perfil` etc. (`/parceiros/conta` abre o Perfil) — sem login, cai no Entrar e volta para a página pedida | não |

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
   Sra., prefiro não informar), nome e sobrenome, "Seu cargo",
   telefone com "Brasil (+55)", senha, "quero receber dicas, novidades e o
   relatório do mês" (desmarcado) e "Li e concordo com os Termos…" (sem
   "represento a academia": regra 40) → "Salvar e continuar"
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
   contada). Sem WhatsApp na ficha, ou se o número não é deles: a pessoa
   fala com o GuiaTennis no WhatsApp, o Breno confirma do jeito dele e
   aprova à mão (Aprovar/Recusar continuam). O site não diz como ele
   confere (regra 44). Academia nova: publicar já libera a conta
   (gatilho `liberar_pedidos_da_academia`). Quem é liberado vira
   **responsável principal** se a academia ainda não tem um; senão, equipe.
- **Não confere se o e-mail é mesmo da pessoa** (o site não manda e-mail):
  quem garante é o código no WhatsApp da academia ou o documento.
- **Pessoas com acesso (página Pessoas, regra 43):** o responsável principal adiciona pelo
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
- `arrumarTexto` — tira emoji e caixa alta, troca "!!!" por ponto, escreve
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
academia em…" e "ainda com a senha provisória". O painel do admin lista
"Acessos das academias" em "Acessos ao Parceiros" (regra 58). O admin pode apagar resposta (moderação).

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
- No painel do admin, em **Ferramentas** (antes, botão da prancheta), **"Academias no mapa
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
e define o `Content-Type: application/xml` ela mesma: com o tipo
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
- **Coluna nova que o site lê precisa da leitura liberada** no SQL:
  `grant select (coluna) on public.academias to anon, authenticated` (o
  visitante e quem está logado só leem as colunas da lista). Em 05/10/2026
  a `pausada_pela_academia` entrou sem isso e a esteira do banco ficou
  vermelha ("permission denied for table academias" no `conferir.sh`);
  corrigido no SQL `20261005180000_visitante_le_a_pausa`.
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

### Avisos por e-mail e buscas salvas (05/10/2026)
- `buscas_salvas` (SQL `20261005150000`): `id, user_id (jogadores), termo,
  bairro, cidade, lat, lng, filtros jsonb, link, avisar, avisar_desde,
  avisada_ate, created_at`. A conta lê, salva, apaga e só muda `avisar`
  (gatilho `arrumar_busca_salva`: link do site, ponto arredondado, até 20).
- `emails_a_enviar` (SQL `20261005160000`): a fila — `chave` (única),
  `tipo`, `para`, `assunto`, `html`, `texto`, `descadastro`, `tentativas`,
  `pedido_id` (do pg_net), `enviado_em`, `resend_id`, `erro`. Ninguém de
  fora lê. `emails_configuracao`: `site`, `remetente` (`GuiaTennis
  <nao-responda@guiatennis.com.br>`), `prefixo`, `admin`.
- Colunas novas: `jogadores.token_avisos` e `academias_avisadas_ate`;
  `academia_acessos.token_avisos` e `avisos_por_email`;
  `academias.publicada_em` (gatilho `marcar_publicada_em`).
- Funções: `enviar_emails()` (a cada minuto), `preparar_avisos_do_dia()`
  (10h), `preparar_aviso_de_viagem`, `preparar_avisos_de_academias_novas`,
  `configurar_emails(chave, site)` (só o dono do banco, para o GitHub),
  `parar_avisos(token, aviso)` (visitante), `mudar_avisos_dos_parceiros`,
  `situacao_dos_emails()` (admin), `ativar_conta_de_jogador()` (SQL
  `20261005170000`). Gatilhos: `aviso_de_avaliacao_nova`,
  `aviso_de_pedido_de_acesso`, `aviso_de_pedido_aceito`,
  `aviso_de_viagem_mudou`. Os gatilhos nunca atrapalham o que os chamou
  (erro vira aviso no registro do banco).
- Extensões: **pg_net** e **pg_cron** (o SQL tenta ligar; sem elas, avisa e
  a fila espera). Para conferir no Supabase: Database › Extensions (as duas
  ligadas) e Integrations › Cron (os dois trabalhos `guiatennis-…`).
- Plano grátis do Resend: **100 e-mails por dia, 3.000 por mês** (o código
  de confirmação conta junto). Passando disso, os avisos ficam na fila e
  saem no dia seguinte; com mais jogadores, o plano pago do Resend.

### Painel do admin (06/10/2026)
- SQL `20261006120000_painel_do_admin`, três funções só do admin
  (`eh_admin()`; quem não é admin recebe "Só o admin." ou lista vazia, o
  visitante nem chama): `emails_recentes_admin(p_limite)` (os últimos
  e-mails da fila, sem o corpo: tipo, para, assunto, criado, enviado,
  tentativas, erro), `reenviar_email_admin(p_id)` (o que não saiu volta
  para a fila, zerado) e `numeros_das_contas_admin()` (jogadores,
  confirmados, novos em 7 dias, cada aviso ligado, buscas salvas e com
  aviso, contas no Parceiros, academias com responsável, pedidos abertos).
  A lista das contas de jogador o painel lê direto de `jogadores` (o admin
  já podia ler, pela regra da tabela). Tipos de e-mail na fila:
  `avaliacao`, `pedido_responsavel`, `pedido_guiatennis`, `pedido_aceito`,
  `viagem`, `academias_novas`.

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
código no WhatsApp da academia), `20261001130000_tempo_ate_agir` e, de
03/10, `20261003120000_varias_academias` (uma conta, várias academias:
`academia_vinculos`, `academias_da_minha_conta`, `abrir_minha_academia`,
`remover_acesso_academia` com a academia) e `20261003130000_pedidos_de_plano`
(pedido de plano pago: `pedir_plano`, `pedidos_de_plano_admin`; mudar o
plano atende) e `20261003140000_pedido_ao_responsavel` (pedido de academia
com responsável vai para ele), os de 04/10 (`20261004120000` a
`20261004140000`) e, de 05/10, `20261005120000_varios_pedidos` (vários
pedidos por conta: `pedidos_de_acesso`, `meus_pedidos_de_acesso`,
`pedidos_de_acesso_admin`, código por conta e academia),
`20261005130000_academia_pausa` e `20261005140000_percurso_das_visitas`. Entra no
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
cd testes && for t in busca-e-ficha cadastro entendimento seguranca publico banco-de-teste ficha-basica acesso-academia links parceiros tempo menu-e-home planos jogador voltar codigo varias-academias plano-ao-finalizar pedido-ao-responsavel convite-conta senha viagem comparar-e-avisos perfil-e-avaliar percurso buscas-e-avisos admin-parceiros painel-admin; do NODE_PATH=$(npm root -g) node $t.js; done
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
- `varias-academias.js` — uma conta, várias academias (03/10/2026):
  seletor no topo com a aberta marcada, trocar abre o painel da outra,
  menu do celular com "Suas academias", Conta com a lista e as pessoas da
  academia aberta, "Adicionar outra academia" no Básico (busca com "Já é
  sua", pedido, código, as duas no seletor), ficha da outra academia com
  "Abrir no painel", admin com o pedido de quem já tem academia e
  "Remover acesso" só daquela academia.
- `plano-ao-finalizar.js` — cadastro sem trava (5 comodidades,
  Instagram), tela do plano ao finalizar (o que esconde, o que melhorar,
  Premium primeiro, Básico por último), atalho para a parte, academia
  salva inteira, pedido do Premium anotado e WhatsApp, admin sem a tela,
  "Querem mudar de plano" no admin, "O que os alunos não veem" no painel
  e edição no Premium sem a tela.
- `pedido-ao-responsavel.js` — pedido de academia com responsável vai
  para ele (sem código), responsável aceita/recusa no painel e na Conta,
  plano cheio avisa e oferece o de cima, equipe não vê os pedidos, admin
  sem "Gerar código" e "Aprovar" com confirmação.
- `perfil-e-avaliar.js` — perfil do jogador em `/perfil` (seções, listas,
  trocar a senha, "Avaliar", menu dos avisos, `?conta=minha`, sem conta),
  "Jogou aqui?" (antes de um dia não pergunta; depois, balão com estrelas
  que abre a ficha com a nota; "Não joguei aqui"; avaliada sai; academia
  não recebe), menu "Sair da conta", Perfil dos Parceiros (inicial no topo,
  `/parceiros/conta` → Perfil), "Confirme o seu e-mail" em todas as telas
  da conta nova com pedido (e o "!" no círculo) e Ajuda/Termos sem CNPJ.
  Abas: `vigiarAbas(page)`/`abasAbertas(page)` (do `harness.js`) trocam o
  `window.open` por um que anota — o Parceiros abre na aba dele.
- `percurso.js` — passos da visita (chegada com origem/meio/aparelho, busca
  só com a região, ficha, contato, favoritar, comparar, janelas, etapas do
  cadastro dos Parceiros), quem não grava (admin; academia no site dos
  jogadores), banco sem a tabela, e o relatório do admin (funil, origens,
  caminhos, visita passo a passo com "ficou X", Parceiros) e a Política.
- `buscas-e-avisos.js` — Salvar busca (sem conta pede o Entrar; salva com
  o ponto arredondado; aviso por e-mail; não repete; menu e perfil;
  refazer; apagar; banco sem a tabela), página da cidade (todas as da
  cidade, sem procurar o endereço, salvar a cidade), conta do Parceiros no
  site dos jogadores (parte de jogador sozinha, inicial no topo, menu com o
  Parceiros, não avalia a própria, avalia as outras, entrar pelo site dos
  jogadores), "Não quero mais receber" (pergunta, tira o número do link,
  link inventado), avisos no Perfil do Parceiros, situação dos e-mails no
  admin e os textos "Por que…" e da Política.
- `banco-emails.py` — **não roda com os outros**: precisa de um Postgres
  local com a pasta `supabase/` aplicada (não precisa do GoTrue); finge o
  cofre, o pg_net e o relógio. Confere cada aviso (quem recebe, quem não,
  texto escapado, sem repetir), as buscas salvas (regras, limite, link), o
  envio (dois por vez, chave e idempotência, 200, 429, 5 tentativas), o
  "parar avisos", a situação do admin e a conta do Parceiros que também
  joga. `BANCO_URL=postgresql://postgres@127.0.0.1:5433/postgres python3
  testes/banco-emails.py` — 95 certas em 05/10/2026, também num banco novo.
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

**Banco e login locais (para `banco-acesso.py`):** (05/10/2026: o
`go mod download -json` escreve uma linha antes do JSON — pule-a para ler
o `Dir`; o papel `supabase_auth_admin` precisa de `alter role … set
search_path = auth` e os papéis do site de `grant usage on schema auth`,
como no Supabase; com isso: 167 certas e as 11 falhas antigas.) (03/10/2026: com o
`github.com/supabase/auth@master`, rodar `go get
github.com/joho/godotenv@v1.4.0` antes do `go build`; o `gotrue serve`
precisa de `GOTRUE_JWT_AUD=authenticated` e
`GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated`, senão nenhum login feito
pelo SQL entra; e o `seed.sql` só entra com `set session_replication_role
= replica`, por causa do gatilho que exige conta para avaliar.) Postgres como na seção
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
  com menu próprio; a barra de atalhos do celular saiu em 06/10/2026), Google Business Profile
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
  incluir a coluna em `COLUNAS_ACADEMIA_PUBLICAS`; senão o site fica vazio
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
  receberia um texto dentro de JSON. Use o domínio `"*/*"` e defina o
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
(a seguir) Avisos por e-mail pelo Resend, buscas salvas, conta do Parceiros como conta normal, página da cidade e textos "Por que"   ← PR #5, 05/10
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

- **Ligar os avisos por e-mail (05/10/2026, regra 51)** — o Breno (a chave
  nunca pelo chat): (1) no Resend, API Keys → Create API Key, permissão
  "Sending access", domínio guiatennis.com.br; copiar a chave (`re_…`);
  (2) no GitHub, Settings → Secrets and variables → Actions → New
  repository secret, nome `RESEND_API_KEY`, colar a chave; (3) Actions →
  Banco de dados → Run workflow, uma vez com "teste" (ou esperar o próximo
  push do PR); o "real" vai sozinho no merge; (4) no Supabase (nos dois
  projetos), Database → Extensions: conferir **pg_net** e **pg_cron**
  ligados (o SQL tenta ligar sozinho). No painel do admin, **E-mails** (e
  a Visão geral) diz se está tudo certo.
- **Testar na prévia o painel do admin (06/10/2026, regra 58)**: (1) sair e
  entrar de novo com guiatennis1@gmail.com: o site muda para o painel
  (`/admin`); (2) passar pelas seções (no celular, pelo botão de menu); (3)
  em Academias, abrir uma, mudar o plano e voltar; (4) numa aba anônima,
  abrir `/admin`: tem que aparecer só a página inicial. Ideias para depois,
  se o Breno quiser: mandar as "Novidades do GuiaTennis" por ali e baixar
  as listas em planilha.
- **Testar na prévia o pacote de 05/10/2026 (noite)**: (1) buscar um bairro,
  "Salvar busca" (sem conta, entra e salva), "Avisar por e-mail…", ver em
  menu › Buscas salvas; (2) na home, "Ver as academias de São Paulo":
  todas as da cidade, sem "A partir de…"; (3) entrar no site dos jogadores
  com um e-mail do Parceiros: "Minha conta", o Parceiros no menu, avaliar
  outra academia (a própria não); (4) com a chave no GitHub e o e-mail
  confirmado, avaliar uma academia que tem conta e ver o e-mail chegar
  ("[Teste]" no assunto); (5) no rodapé do e-mail, "Não quero mais
  receber".
- **Jogador que vira Parceiros com o mesmo e-mail** (o contrário da regra
  53): hoje o cadastro do Parceiros ainda pede outro e-mail para quem já
  tem conta de jogador. Dá para deixar a mesma conta virar Parceiros, se o
  Breno quiser.
- **Testar na prévia o pacote de 05/10/2026**: (1) jogador logado: tocar na
  inicial → `/perfil`; (2) chamar uma academia no WhatsApp e, no dia
  seguinte, abrir o site: o balão "Jogou na …?" com as estrelas; (3)
  Parceiros: o círculo com a inicial (Perfil), "Academias" (Suas
  academias), "Pessoas"; com um pedido aberto, "Adicionar outra academia" e
  pedir mais uma; (4) no admin, os dois pedidos da mesma conta, um por
  linha; (5) do site dos jogadores, "GuiaTennis Parceiros" abre em outra
  aba.
- **Serviço de e-mail no Supabase (02/10/2026)** — **feito pelo Breno em
  05/10/2026** ("já fiz o código de 6 dígitos"): Resend com o domínio
  verificado, ligado ao Supabase, código de 6 números. Os passos abaixo
  ficam como registro. Sem isso o
  código de confirmação e o "Esqueci a senha" não chegam (o site avisa e
  segue). Passos para o Breno (credenciais nunca pelo chat): (1) criar
  conta grátis no Resend (resend.com) ou no Brevo, confirmar o domínio
  guiatennis.com.br (registros DNS que eles mostram) e gerar a senha SMTP;
  (2) no Supabase, nos dois projetos (teste e de verdade): Authentication →
  Emails → SMTP Settings → ligar "Custom SMTP" com host, porta, usuário e a
  senha do serviço, remetente `nao-responda@guiatennis.com.br`, nome
  "GuiaTennis"; (3) Authentication → Email Templates → "Magic Link": trocar
  o texto para mostrar o código `{{ .Token }}` (modelo pronto, só colar:
  `divulgacao/email-codigo.html`, assunto "Seu código do GuiaTennis";
  o caminho mais curto é a integração do Resend com o Supabase, que
  preenche o SMTP sozinha) ("Seu código do GuiaTennis:
  {{ .Token }}"); (4) Authentication → Rate Limits: subir o limite de
  e-mails por hora. Os avisos por e-mail saem pelo banco desde 05/10/2026
  (regra 51); "Promoções das academias" e "Novidades do GuiaTennis" ainda
  não têm e-mail (só ficam guardados).

- **Testar na prévia "uma conta, várias academias" (03/10/2026)** — no
  banco de teste: (1) com uma conta que já administra uma academia, abrir
  Conta › "Adicionar outra academia", escolher outra e tocar em
  "Administrar esta academia"; (2) como admin, em "Pedidos para
  administrar", conferir o "já administra…" e gerar o código; (3) digitar
  o código no painel da conta; (4) trocar de academia pelo nome no topo
  (computador) ou pelo menu (celular) e ver o painel, o Desempenho e as
  pessoas mudarem.

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
  e-mail (Premium; a fila de e-mails já existe, regra 51) e a prévia do
  link no WhatsApp com a foto da academia (seção 3, "Endereços").
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
  Compartilhar da ficha acrescenta `&utm_source=Compartilhado` sozinho. O site
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
