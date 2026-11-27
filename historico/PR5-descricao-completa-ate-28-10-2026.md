## O que muda

### 1. GuiaTennis Parceiros (`/parceiros`): o site das academias

Um site separado para quem responde pela academia, no modelo do **trivago Business Studio**, do **Booking para Parceiros**, do **iFood Parceiros** e do **Google Business Profile**. Tem cabeçalho, menu e largura próprios e termina com a faixa escura do trivago. No celular, tudo fica no menu do topo.

| Página | Endereço | Google |
|---|---|---|
| Apresentação: benefícios, como funciona, números do site, planos, perguntas | `/parceiros` | indexa |
| Planos (o que cada plano libera) | `/parceiros/planos` | indexa |
| Ajuda (21 perguntas + chat de ajuda e e-mail) | `/parceiros/ajuda` | indexa |
| Cadastro: dados de contato → sua academia → início | `/parceiros/cadastro` | indexa (com `?academia=`, não) |
| Entrar (e-mail ou usuário) | `/parceiros/entrar` | não |
| Atualizações, Minha ficha, Avaliações, Promoções, Desempenho, Suas academias, Pessoas, Plano, Perfil, o código do WhatsApp | `/parceiros/painel` etc. | não |

**Cadastro como o do trivago**
- Em cima fica a barra do processo, com as etapas **DADOS DE CONTATO**, **SUA ACADEMIA** e **INÍCIO**.
- **E-mail primeiro.** Se o e-mail já tem conta (do Parceiros ou de jogador), o site pede a senha. Quem recebeu usuário do GuiaTennis também entra pelo e-mail que deu no primeiro acesso.
- **Dados de contato:** tratamento, nome e sobrenome, cargo, telefone com "Brasil (+55)", senha, aceite das novidades e dos Termos, e "Salvar e continuar".
- **Sua academia:** a busca é pelo nome e pelo bairro, e a pessoa marca uma academia na lista. "Administrar esta academia" só vai com a caixinha "Declaro que estou autorizado(a) pela academia… e que respondo pelas informações que publicar" marcada (o banco guarda quando).

**Quem administra a academia** (como o Google e o Booking: código só em disputa, documento só se o código não der)
- **Academia nova** de conta com o **e-mail confirmado**: entra no ar na hora, confirmada e no Básico, e a conta já administra. Não há limite por dia.
- **Academia que já está no guia, sem responsável**: com o e-mail confirmado e a declaração, a conta passa a administrar **na hora, sem código**. O admin recebe "Academia assumida" e revisa em Pendências.
- **Sem o e-mail confirmado:** o pedido espera. Ao confirmar o e-mail, ele vai em frente sozinho.
- **Academia com responsável:** o pedido vai para ele aceitar. Se a pessoa **contestar**, vira **disputa**. O admin manda um código de 6 números ao WhatsApp que a academia tinha antes. Quem digita o código vira o responsável, e quem administrava sai. Sem como usar o código, o GuiaTennis pede documento e decide. O código fica cifrado, vale 72 horas e aceita 5 tentativas.

**Pessoas, planos e avaliações**
- O responsável principal inclui mais pessoas pelo e-mail. O limite depende do plano: Básico 1, Completo 5, Premium 10.
- O Desempenho muda conforme o plano. O que o plano não libera aparece trancado, com "Ver planos". **O plano fica num lugar só**, a página Plano (com o que o plano esconde da ficha).
- Quem administra uma academia não avalia essa academia. As outras avalia normalmente.

### 2. Área da academia
- **Admin:** o bloco "Acesso da academia" na ficha cria o usuário e a senha provisória, com "Mandar pelo WhatsApp".
- **Academia:** no primeiro acesso, completa os dados e cria uma senha nova. Tem Atualizações com números e pode responder às avaliações.

### 3. Links no padrão dos grandes
Ficha em `/academia/<nome>-<id>`, regiões em `/quadras/…`, busca com filtros no link, comparação e "voltar" do celular. Os links antigos continuam abrindo.

### 4. Visual mais limpo
Inter no texto, Playfair nos títulos, mais espaço. "Por que o GuiaTennis" em seis cartões iguais, alinhados.

### 5. Pedido de 01/10: logo, menu, home, preferências e cadastro passo a passo
- **Logo igual em todo lugar** (`logoDesenho`), menu no jeito do trivago, home com "Vistas recentemente" e "Academias que você chamou", preferências de busca, cadastro da academia em 9 telas.

### 6. Pedido de 03/10: uma conta, várias academias, cada uma com o seu plano
O mesmo login administra quantas academias a pessoa responder, em qualquer plano, como o "Suas empresas" do Google Business Profile.

### 7. Pedido de 03/10: o plano aparece ao finalizar, não no meio do cadastro
A tela "Quase lá: escolha o plano" mostra o que o plano esconde. Tudo é salvo inteiro, e o pedido de plano fica anotado para combinar pelo WhatsApp. *(Com o que o plano esconde, desde 21/10 é um aviso como uma página de erro: seção 45.)*

### 8. Pedido de 03/10: o pedido de acesso vai para o responsável da academia
Como o "Solicitar acesso" do Google Business Profile.

### 9. Ajustes de 03/10
Municípios do IBGE nas preferências, texto do e-mail, cartão da busca sem preço.

### 10. Pedidos de 04/10 e 05/10
- **Conta do jogador:** código de 6 números por e-mail, "Esqueci a senha", perfil em `/perfil`, "Jogou aqui? Avalie".
- **Vou viajar:** a viagem separada da cidade de casa, aviso por e-mail perto da data e o balão "Tem viagem marcada?".
- **Avisos por e-mail pelo Resend**, saindo do próprio banco (pg_net, pg_cron, chave no cofre do Supabase, copiada do segredo `RESEND_API_KEY` do GitHub).
- **Buscas salvas** na conta, como o "Salvar busca" do Booking.
- **Conta do Parceiros no site dos jogadores** funciona como conta normal.
- **Página da cidade** lista todas as academias da cidade.

### 11. Pedidos de 06/10
- **Admin no GuiaTennis Parceiros** (`/parceiros/ver`): o admin vê o Parceiros como qualquer academia.
- **Painel do admin em `/admin`**: entrar com o e-mail do admin leva a um site à parte, como o admin da Shopify. Seções: Visão geral, Pendências, Academias, Acessos ao Parceiros, Contas de jogador, Contas excluídas, Avaliações, Estatísticas, Percurso das visitas, E-mails, Falhas do site e Ferramentas. Ninguém mais vê: `/admin` abre a página inicial para os outros, e fica fora do Google.
- **O admin exclui a conta** de quem descumprir os Termos, com o motivo guardado e a opção de apagar as avaliações; o e-mail fica bloqueado até o admin liberar.
- **Conta de jogador vale no Parceiros** com o mesmo e-mail e a mesma senha.
- **Parceiros mais leve:** a página inicial se chama "Atualizações", o menu vai do mais importante ao menos, sem "Voltar ao painel", sem a barra de atalhos embaixo no celular, números trancados no fim.

### 12. Pedido de 07/10: o que serviu da análise do GPT
- **"Confirmada pela academia · atualizada há 4 dias"**, como o "Atualizado pela empresa" do Google Maps. Só o banco escreve a data. Ela muda quando a informação muda ou quando a academia salva a ficha. Com a ficha parada há mais de 3 meses, Atualizações lembra a academia de conferir e salvar.
- **"Como funcionam as avaliações"** na ficha, como no Airbnb e no Google. O cartão "Nota só de quem jogou aqui" passou a se chamar "Avaliações feitas no GuiaTennis". *(Em 20/10, abre num balão: seção 36.)*
- **Números do site ditos como são contados** (home e Parceiros): "visitas" em vez de "pessoas", a base das porcentagens e de onde vêm os números.
- A descrição para o Google começa com **"Onde jogar tênis perto de você"**.

### 13. Pedidos de 07/10: código só em disputa e selo de confirmada
- O código no WhatsApp da academia só na disputa (seção 1), sem o limite de 3 academias novas em 24 horas.
- "No ar, com as informações confirmadas" aparece por **1 dia** (era 3).
- **Selo verde ao lado do nome** da academia confirmada (ficha, busca e home), como o "Claimed" do Yelp. O texto "Confirmada pela academia · atualizada…" e o aviso de ficha básica foram para o **fim da ficha**. Tocar no selo leva até eles.

### 14. Pedidos de 07/10 e 08/10: WhatsApp, e-mail com o domínio, menu e conta
- Código da disputa pelo WhatsApp oficial (esperando o CNPJ para ligar), logo nos e-mails e e-mail @guiatennis.com.br pelo Resend, menu dos jogadores limpo com os acessos de 30 dias em todo plano, sem as faixas no alto, e só as vistas recentes no celular (o resto na conta).
- O modelo do e-mail do código vai sozinho para o Supabase pelo segredo `SUPABASE_ACCESS_TOKEN` (no ar desde 09/10: "Modelo do e-mail do código trocado no Supabase teste").

### 15. Pedidos de 08/10: Premium, promoções e ajustes
- **Premium:** selo **dourado** em estrela ao lado do nome (no lugar do verde) e **até 2 "Patrocinado" no topo da busca**, a até 10 km de onde a pessoa buscou; abaixo, "Mais perto de você" e as outras, sem repetir. Sem patrocínio em "só favoritas" e "só as da comparação".
- **Promoções do Premium** (Parceiros › Promoções): até 3 valendo, por até 90 dias; aparecem na ficha (atalho no topo e bloco com os preços) e no cartão da busca. A promoção nova avisa por e-mail quem favoritou a academia e ligou "Promoções das academias favoritas", no máximo uma vez por semana por academia. O admin remove pela ficha. Termos e Privacidade atualizados. *(Mudou de 14/10 a 18/10: seção 30.)*
- **Números do site** em colunas iguais; a explicação fica oculta, e "Entenda como funciona" leva à pergunta da Ajuda já aberta.
- **Cartão da busca:** no celular, a foto em cima e o texto embaixo; no computador, a foto acompanha a altura do texto. Academia sem foto: só o nome.
- **Sem preço = "Sob consulta"** também no texto da ficha e na pergunta "Quanto custa?".
- **O site não cita outros sites** como comparação.

### 16. Pedidos de 08/10: tirar do guia vira pedido, e o chat de ajuda
- **Pausar** continua com a academia, na hora. **Tirar do guia** vira um pedido do responsável principal em Suas academias (com o motivo); o admin recebe e-mail e resolve em Pendências › "Querem sair do guia" ("Tirar do guia" apaga a ficha; "Manter no guia" responde), e quem pediu recebe a resposta por e-mail. *(Mudou em 19/10: seção 32.)*
- **Chat de ajuda** no lugar do WhatsApp direto ("Fale com a gente", rodapés e Ajuda do Parceiros): entende a dúvida por palavras-chave, no próprio site, sem serviço de IA de fora; responde com o caminho (botão para a página certa) e, se não resolver, leva ao WhatsApp do Breno com a dúvida já escrita.

### 17. Pedidos de 09/10: o Parceiros acende ao descer, o chat na conta, a tela da senha, a ficha, o plano, as contas excluídas e a prévia da ficha
- **A página inicial do Parceiros "acende" ao descer:** cada bloco aparece e ganha cor quando entra na tela; com "reduzir movimento", tudo de uma vez.
- **O chat do Parceiros fica guardado na conta:** com a conta aberta, cada conversa vai para a conta. "Conversas (N)" lista as anteriores (a mais recente em cima, com o dia e a hora); um toque abre e continua, a lixeira apaga (com confirmação), e "Nova conversa" começa outra. Sem conta, fica só na tela, e ao entrar a conversa passa para a conta. Ficam as 50 mais recentes; excluir a conta apaga todas. Privacidade atualizada.
- **Tela da senha sem nada grudado:** depois do e-mail, ele fica num cartão com "Trocar", e o aviso da conta achada vai num quadro à parte ("Você já tem conta no GuiaTennis" / "É a sua conta de jogador…").
- **Ficha: "Continuar" à direita, em destaque**, com "Salvar alterações" ao lado.
- **O plano limita e avisa:** no Básico, tudo pode ser preenchido; a parte que o plano não mostra (comodidades além de 3, Instagram e site, fotos além de 3, cancelamento, como chegar) avisa ali mesmo, conta o que fica de fora e dá a escolha **"Quero o Completo"** (pago, combinado pelo WhatsApp; o pedido vai ao salvar) ou **"Manter o Básico"**. Fora do Premium, Promoções mostra as que estão guardadas e não aparecem; Pessoas avisa quando a academia passou do limite do plano. O admin, ao baixar o plano, confirma vendo o que muda. *(O aviso em cada parte saiu em 21/10: seção 45.)*
- **Contas excluídas num lugar só** no painel do admin (`/admin/excluidas`): os e-mails das contas excluídas, de jogador e do Parceiros, com o motivo e "Liberar o e-mail". Contas de jogador e Acessos ao Parceiros só apontam para lá.
- **Prévia da ficha no fim do cadastro e da edição:** a última parte mostra a ficha montada com o que foi preenchido (cortada pelo plano, dizendo o que fica de fora), com "Editar" em cada bloco e, embaixo, "Editar" e "Confirmar e salvar" / "Confirmar e enviar" / "Confirmar e publicar". *(Desde 21/10, sem o corte do plano: seção 45.)*

### 18. Pedido de 09/10: lembrete por e-mail da ficha parada há 3 meses
Como o "Confirme as informações da sua empresa" do Google Business Profile e o "Is your business information up to date?" do Yelp.
- Junto com os avisos do dia (10h de Brasília), a academia **no ar** cuja ficha não muda há **3 meses** recebe **"Confira a ficha da <academia> no GuiaTennis"**: desde quando não muda, há quantos meses, e que salvar (mesmo sem mudar nada) volta a ficha para "atualizada hoje". Repete a cada 3 meses enquanto ela continuar parada; salvar zera a conta. Pausada não recebe.
- Vai para quem administra a academia com o e-mail confirmado e os avisos ligados (Perfil › Avisos por e-mail, que passa a citar o lembrete), com o link "Não quero mais receber".
- O botão **"Conferir a ficha"** (`/parceiros/ficha?abrir=…`) abre a academia do e-mail mesmo numa conta com várias, também depois de entrar.
- Ajuda, folha "Não quero mais receber", chat de ajuda e Política de Privacidade citam o lembrete; textos legais em 9 de outubro de 2026.

### 19. Pedidos de 09/10: lembrete do jogador que não entra há 3 meses e resumo do mês do Parceiros
- **Jogador sem entrar há 3 meses** (como o "Sentimos sua falta" do Booking e do Airbnb): com os avisos do dia, a conta com o e-mail confirmado que não entra há 3 meses recebe um lembrete com **as academias novas da cidade dela desde a última visita** ("N academias novas em São Paulo desde a sua última visita" e "Ver academias em São Paulo"); sem cidade ou sem academia nova, "Faz tempo que você não passa no GuiaTennis" e "Buscar academias". **Uma vez por ausência**, até 200 por dia. Por escolha do Breno, **vem ligado para todos** (os outros avisos do jogador continuam começando desligados): desliga em Minha conta › Avisos por e-mail ou pelo link do e-mail. O site anota a última visita com a conta aberta (no máximo uma vez a cada 12 horas). Quem administra academia não recebe.
- **Resumo do mês para quem administra a academia** (como o relatório do mês do Google Business Profile), **em todo plano**, nos primeiros dias do mês: acessos à ficha no mês anterior (com o mês de antes ao lado), avaliações novas com a média e quantas esperam resposta. No **Premium**, também quem chamou (WhatsApp, Instagram, site), quantos compartilharam e de onde vieram. Antes, o relatório do mês por e-mail era só do Premium.
- Planos ("Resumo do mês por e-mail" em todos; "Relatório completo do mês" no Premium), Perfil, folha "Não quero mais receber", chat, Ajuda, Termos e Privacidade acompanham.

### 20. Pedidos de 10/10 e 11/10: o cadastro no celular, o Criar conta e os números do Parceiros
- **Fotos maiores**, como o "Fotos do anúncio" do Airbnb: a primeira ocupa a largura, marcada "Capa"; as outras em duas colunas, com "Usar como capa" e o ✕ maior. No Básico, as que ficam de fora dizem "Fora da ficha no Básico" em cima da própria foto. *(Saiu em 21/10, e as fotos passaram a mudar de ordem arrastando: seção 45.)*
- **Aviso do plano numa linha** ("No Básico, a ficha mostra 3 fotos · Saiba mais"), em todas as partes onde aparece; um toque abre a explicação e "Quero o Completo"/"Manter o Básico", e escolher fecha de novo. *(Saiu em 21/10: seção 45.)*
- **"Falta preencher" só ao concluir sem o obrigatório**: "Para concluir, falta preencher: Nome e endereço*, …", só com as partes obrigatórias e "* Obrigatório: sem isso, a ficha não pode ser enviada."; e "* Obrigatório" embaixo do título das partes com campo obrigatório. Sem conta, o aviso vem antes de pedir nome e WhatsApp.
- **Ponto no mapa pelo número da rua:** a busca fica com o resultado do **mesmo número da porta**, antes do centro do CEP; e em Nome e endereço, **"Ver no mapa"** mostra o alfinete para **arrastar** (ou tocar) até a entrada, como o "O alfinete está no lugar certo?" do Airbnb e do Google Business Profile. Na edição, começa no ponto de hoje. O ponto conferido é o que vai para o banco.
- **Escolher as comodidades do Básico:** com mais de 3 marcadas, "Quais aparecem na ficha no plano Básico" — toque para escolher até 3 (como as "Principais competências" do LinkedIn). *(Desde 21/10, na tela depois de confirmar: seção 45.)*
- **Criar conta (11/10):** o lembrete de 3 meses fica implícito, numa linha pequena embaixo do botão ("A conta recebe lembretes ocasionais, que você desliga em Minha conta."); e sem o aceite o aviso diz **"Aceite os Termos de Uso e a Política de Privacidade."** (jogador e Parceiros), saindo na hora em que a caixa é marcada.
- **Números do Parceiros com texto e convite (11/10):** a faixa verde ganha "O GuiaTennis hoje", o título **"Jogadores já escolhem onde jogar por aqui"** e o texto do caminho de quem chega antes dos números, e depois "Cada ficha aberta é um jogador conhecendo uma academia. Coloque a sua na lista." com o botão **"Cadastrar minha academia grátis"**, como as faixas de números do Booking para Parceiros e do Airbnb para anfitriões.

### 21. Pedido de 11/10: falhas do site num lugar só e ajuda ao cliente quando algo não funciona
Como o Sentry (cada falha num lugar só, com o aparelho e o caminho até ela) e o "ID da solicitação" do Stripe (a pessoa vê um código curto e, mandando ele, o suporte acha a falha exata).
- **O que conta como falha:** a internet que caiu, o banco com erro de verdade (5xx, função que falta, tempo esgotado), um serviço de fora que falhou (CEP, endereços, mapa) e erro do próprio código do site. **Erro de regra não é falha:** senha errada, campo que falta, plano cheio, código errado e endereço que não existe continuam só com a mensagem de sempre.
- **O que a pessoa vê:** o que fazer ("Sem conexão com a internet. Confira o Wi-Fi ou os dados do celular e tente de novo."; antes, a internet que caía no Entrar dizia "E-mail ou senha incorretos") e, embaixo do aviso, **"Se continuar, fale com a gente · código K7Q2MX"**. Onde não havia aviso na tela (era um alert), uma faixa embaixo com "Tentar de novo", "Preciso de ajuda" e o código. "Fale com a gente" abre o **chat de ajuda** com o problema, o que costuma resolver e o WhatsApp do Breno com o código já escrito. No chat, o assunto novo "Algo não funcionou" ("deu erro", "não funciona"…).
- **Painel do admin › Falhas do site** (`/admin/falhas`): procurar pelo código que o cliente mandou; as falhas iguais juntas, com quantas vezes, quantas visitas, aparelhos, navegadores, "Nova" ou "Voltou"; cada ocorrência com o código, quem (visitante, jogador, conta do Parceiros, admin), a tela e a academia; **o caminho da visita até a falha** (o percurso) e o que a pessoa fez depois; **"Marcar como resolvida"**. Aparece também em "Para fazer agora".
- **E-mail ao admin** quando aparece uma falha nova ou uma resolvida volta, no máximo um a cada 3 horas (não manda as do próprio admin nem as de conexão, que quase sempre são a internet de quem usa).
- **Sem dados de quem usa:** nada de conta, e-mail, IP ou identificador do aparelho; a mensagem técnica perde e-mails, telefones e chaves antes de ir; fica 90 dias. Sem internet, o registro espera na aba e vai quando a conexão volta. Política de Privacidade atualizada (11 de outubro de 2026).
- **A internet que cai vira uma falha só (13/10, depois do teste no modo avião):** cada parte da página que não carregava virava um cartão ("Banco: tabela cliques", "…respostas", "…promocoes"…). Agora, como o Sentry junta os "Failed to fetch" num problema só, vai **um registro por queda**: "Carregar partes da página · O aparelho estava sem internet.", com "Ficou sem: os números da home, as avaliações, as promoções…" na ocorrência. A falha de conexão que a pessoa viu também diz o que houve em texto simples (o técnico fica no detalhe). No painel, o cartão de conexão diz "Quase sempre é a internet de quem usava; só preocupa se aparecer em muitas visitas." e vem depois das falhas do site.

### 22. Pedido de 11/10: "Sair da conta" em todo lugar
Sair do site é fechar a aba: todo botão que desconecta a conta diz **"Sair da conta"** — o menu do site (também para o admin, que via "Sair do modo admin"), o menu e o Perfil do Parceiros (antes "Sair" e "Sair do GuiaTennis Parceiros"), o primeiro acesso, o "Não é você? Sair da conta e usar outro e-mail" e o topo do painel do admin (antes "Sair", agora numa linha só no celular). No "Ver como academia" do admin, que sai só do modo e não da conta, continua "Sair do modo admin".

### 23. Pedido de 11/10: opção pequena não se explica; o complexo leva à Ajuda; dica que facilita fica
Como o Airbnb e o Booking ("Entre para salvar", sem dizer onde fica guardado) e a Ajuda do Google e da Shopify (o detalhe mora na central de ajuda; a tela só tem o "Saiba mais").
- **Saíram** as frases que narravam o sistema embaixo de botões, campos e caixinhas: o parágrafo do e-mail no Entrar, "ficam na sua conta e aparecem em qualquer aparelho" (coração, viagem e preferências sem conta, Favoritas vazias), "Dá para mudar quando quiser", "Fique tranquilo…", "A senha provisória deixa de valer…", o porquê técnico do QR code, "São contagens: ninguém é identificado", "A mesma conta cuida de quantas academias…", "O que você não mexeu continua como estava", "Vira uma pergunta frequente na ficha" e parecidas.
- **Assunto complexo vira "Saiba mais"**, que abre a pergunta certa da Ajuda do Parceiros já aberta: Promoções, Desempenho e Avaliações.
- **Ficaram as dicas** ("escreva também o bairro", "olhe também o spam", "Recebeu um usuário do GuiaTennis? Escreva o usuário aqui", "Dica: agradeça e responda com educação…", "Imprima e deixe na recepção…") e o que precisa ser dito para decidir (o valor do plano, o que se perde ao tirar do guia, Patrocinado, o aceite dos Termos).

### 24. Pedido de 13/10: avisos da academia para todos que administram, plano novo e pessoa nova
Como o Google Business Profile (todo dono e gerente recebe "Novo usuário no perfil", com "não reconhece? remova") e a Shopify e o Booking para Parceiros (o resumo do plano novo para quem administra a conta).
- **Plano novo por e-mail**, no visual dos outros avisos: "A Academia X agora está no plano Premium" (ou "O plano da Academia X mudou para o Básico"), com o plano de antes e o novo, a lista do que a academia passa a ter ou deixa de ter, "Nada é apagado…" ao descer, o aviso de quem passa do limite de pessoas e o botão "Ver o plano". Se o admin troca de plano e volta antes de o e-mail sair, sai um e-mail só, contando do plano de antes (ou nenhum, se voltou ao mesmo). A pergunta ao baixar o plano avisa que quem administra recebe o e-mail.
- **Pessoa nova na academia:** quem já administrava recebe "Edu agora administra a Academia X com você", com o nome, o cargo e o e-mail da pessoa ("Edu Souza (Recepção · edu@…)") e "Não conhece essa pessoa?" (o responsável tira o acesso em Pessoas). Vale para todo jeito de entrar; não recebem a própria pessoa nem quem a incluiu.
- **Todos recebem os avisos da academia:** o pedido de acesso (antes só o responsável principal) vai também para a equipe, dizendo que quem decide é o responsável; a resposta do pedido para tirar do guia (antes só quem pediu) também. Avaliação nova, lembrete da ficha e resumo do mês já iam para todos.
- **Painel do admin › Academias › Quem administra:** cada pessoa com o papel, o cargo, o e-mail e o WhatsApp prontos para tocar (o WhatsApp já abre com "Oi, Ana! Aqui é o Breno, do GuiaTennis, sobre a Academia X.") e o último acesso.
- Perfil do Parceiros ("Avisos por e-mail"), Ajuda ("Como mudo de plano?") e Política de Privacidade citam os avisos novos; textos legais em 13 de outubro de 2026.

### 25. Pedidos de 13/10 (fim da tarde): telas fechadas, rascunho na aba, "Acessos" e ajustes
Como o Airbnb e o Booking no celular, o Gmail (rascunho) e o "Pessoas e acesso" do Google Business Profile.
- **Janela aberta = tela fechada nela:** no celular, toda janela (cadastro da ficha, Preferências, Vou viajar, listas, QR, chat…) ocupa a tela toda, sem o site atrás, e a página de trás não rola (antes, rolando, o navegador escondia as barras e o site aparecia embaixo). O cadastro e o Entrar do Parceiros ficam sem menu e sem rodapé: só a marca e o ✕.
- **Entrar ou criar conta dos jogadores numa tela própria, igual à do Parceiros:** a marca e o ✕, a trilha, o título e o formulário num cartão; o e-mail num cartão com "Trocar" e, no passo da senha, o quadro "Você já tem conta no GuiaTennis · Digite a sua senha para entrar."
- **Recarregar não apaga o que estava sendo preenchido:** o cadastro da ficha (com as fotos), a conta do jogador, o cadastro e o perfil do Parceiros, a viagem, as preferências, a avaliação e a resposta ficam guardados só na aba, sem senha nem código, e voltam na mesma tela e no mesmo passo. Fechou a aba ou saiu da conta, somem. Política de Privacidade atualizada.
- **"Pessoas" virou "Acessos"** no Parceiros (menu, título, Ajuda, chat e o endereço `/parceiros/acessos`; o antigo continua abrindo) e nos e-mails ("Acesso novo na academia", "Tire o acesso dela em Acessos", "Ver os acessos").
- O balão "Tem viagem marcada?" (e o "Jogou aqui?") vai para o alto na busca, sem o "Ver no mapa" em cima; "conversa começada" virou "conversa iniciada".

### 26. Pedidos de 13/10 (noite) e 14/10: a prévia da ficha como vai ficar, e só se salva nela
Como a prévia do anúncio do Airbnb e o lápis de cada parte do perfil no Google Business Profile.
- A prévia do "Revisar" é a ficha com os mesmos títulos da página da academia, sem caixas nem rótulos em maiúsculas, e um **lápis pequeno no canto de cada parte** (leva à parte).
- Parte vazia vira "+ Adicionar fotos" (e afins); o que o plano esconde vira uma linha discreta ("Cancelamento e reposição: preenchido, mas fica de fora no plano Básico."). *(Saiu em 21/10: a prévia mostra tudo; seção 45.)*
- Saiu a lista "Partes da ficha" embaixo da prévia; quem tenta confirmar sem o obrigatório vê o que falta em cima dos botões.
- **Só se salva na revisão (14/10):** na edição e no admin, o botão das partes do meio virou "Revisar e salvar" / "Revisar e publicar" (antes "Salvar alterações" / "Publicar quadra", que salvavam dali) e leva à prévia; só o "Confirmar…" de lá salva.

### 27. Pedidos de 14/10: a home dos jogadores, o Premium nas recomendadas e a cidade da conexão
- **A home não fala com a academia** (como o trivago e o iFood: o site de quem usa não tem bloco para o parceiro, só a entrada no menu e no rodapé). Saiu "Por que estar no GuiaTennis"; entraram **"Dicas para achar a quadra certa"** (seis dicas) e o bloco verde **"Todo o tênis da sua região num lugar só"**, com "Encontrar uma quadra" e "Indicar para quem joga" (folha de compartilhar ou WhatsApp com a mensagem pronta). No menu, Suporte › "Dicas de uso".
- **As academias primeiro** (como o Booking e o Airbnb): "Academias recomendadas", "Academias por cidade" e "Melhores avaliadas"; depois, do simples ao detalhe, "Por que o GuiaTennis", "Como funciona a busca", as dicas, a ideia do site e as perguntas.
- **Premium nas "Academias recomendadas"**, com **"Patrocinado"** em cima do nome; a pergunta "A ordem das academias é paga?" virou "Como funciona a ordem das academias?". Termos atualizados.
- **Perto da última busca da conta** (a última busca vai também para a conta) e, sem busca nem preferência, **perto da cidade aproximada da conexão** (`netlify/functions/onde.mjs`, pela Netlify, sem pedir o GPS, só na aba), como o "perto de você" do Booking e do Airbnb. Privacidade atualizada.

### 28. Pedidos de 14/10 e 15/10: o chat de ajuda como conversa, que "pensa" e fica na conta
Sem IA, por regras, como os assistentes do Booking, do Airbnb, do Intercom e da Shopify.
- **Vocabulário da busca** (buscar, procurar, encontrar, localização, perto de mim…) e os assuntos **numa linha que desliza**; o WhatsApp só no segundo "Não entendi".
- **Conversa:** sem "Resolveu?" depois de cada resposta; "não deu" segue no mesmo assunto (primeiro o outro caminho, depois o WhatsApp); "valeu" e "obrigado" respondem com simpatia; mudar de assunto sem tocar em nada é entendido.
- **O "pensamento":** corrige a digitação pelo contexto ("quadras de saindo" → "Entendi: quadras de saibro."), acha o detalhe e o lugar ("saibro em Moema"), diz quantas academias há e abre a busca já filtrada; outra pergunta no mesmo assunto não é tratada como falha.
- **Chat na conta também para jogadores**, com as abas "Conversa" e "Suas conversas (N)", o título do assunto e "Em aberto"/"Resolvida" (como o Intercom e o Zendesk). Privacidade atualizada.
- **O chat do Parceiros leva a qualquer página** ("onde fica…", "minha ficha"), explica cada parte da ficha com o que o plano libera e responde pelo plano e pela academia aberta; assuntos novos "Por onde começo", "A academia não aparece" e "O que tem no Parceiros".

### 29. Pedidos de 15/10: home, cadastro do Parceiros, página Plano e avaliações
- **Home:** Premium → Completo (da ficha mais completa) → o resto pela nota, cada grupo começando pelas até 50 km; com a conta, **"Para a sua viagem a <cidade>"** ou "Vai voltar a <cidade>?", como o "Sua próxima viagem" do Booking.
- **Cadastro do Parceiros:** tocar de novo na academia marcada **desmarca**; **confirmar o e-mail vem antes de escolher a academia** (Dados de contato › Confirmar e-mail › Sua academia › Início), com o código saindo sozinho, o cartão piscando e os avisos que descem no alto ("Conta criada! Mandamos um código para…").
- **Página Plano que vende** (como a da Shopify e a do Booking): "O que pode melhorar" com as dores por caminho (na ficha, na busca, com os jogadores, na equipe, nos números), "A mudança é simples", "Para fazer agora" e "Compare os planos".
- **Cartão da avaliação** organizado (site todo): quem avaliou e a nota em cima, "Pedir análise" embaixo da nota, o texto e "Responder" separado por uma linha, como o Booking e o Google.

### 30. Pedidos de 14/10 a 18/10: promoções na ficha, por e-mail e o leilão do bairro
- **Tudo é promoção** (sem "avisos"): Parceiros › Promoções numa página só, com as abas **Na ficha** (Premium) e **Por e-mail** (Completo e Premium; hoje **Leilão**, seção 49). O link antigo `/parceiros/avisos` abre essa aba.
- **Uma promoção por vez** na ficha (eram 3); "Alterar" no lugar de "Mudar"; **dois passos sem barra de etapas** (escrever › "Ver a prévia ›" › publicar), como o "Revisar e enviar" do Mailchimp.
- **"Chamar no WhatsApp"** no e-mail da promoção, passando pela ficha: conta o contato e abre o WhatsApp da academia com "Olá! Vim pelo GuiaTennis e queria saber sobre a promoção…", como os links rastreados do Booking.
- **Leilão das promoções no e-mail do GuiaTennis do bairro** (como o trivago, o Google Ads e o Groupon): um lance por academia por semana, pago com créditos comprados antes; domingo 20h ganham as duas maiores notas (lance × qualidade da ficha e da promoção), cada uma paga o necessário para passar a seguinte + R$ 1 (Premium 20% menos), quem não ganha não paga; os e-mails saem terça e sexta às 10h, marcados **"Patrocinado"**, para quem pediu promoções e favoritou, salvou uma busca ou buscou no bairro. Painel do admin › **Leilões** (lances da semana, "Não enviar", lance mínimo).
- O nome da academia no alto de cada página do Parceiros é o **seletor** (como o do Google Business Profile); trocar de academia fica na mesma página. "Já enviadas" no lugar de "Já mandadas".
- Planos, Ajuda, chat, Termos e Privacidade atualizados.
- *(Mudou em 22/10: a promoção na ficha também no Completo, paga por semana, e o leilão só do Premium, sem o desconto; seção 53.)*

### 31. Pedidos de 19/10: plano e créditos pelo site, e o pagamento de teste
- **Plano escolhido no próprio site** (Parceiros › Plano, só o responsável principal; **grátis por enquanto**) e **créditos comprados no site** (R$ 50, R$ 100, R$ 200 ou outro valor; **Pix** com QR e copia e cola na tela, **cartão** no Checkout Pro do Mercado Pago), pela função `netlify/functions/pagamento.mjs`. O valor sai sempre do banco, e os créditos entram uma vez só, quando o Mercado Pago aprova. Sem o Mercado Pago ligado, a compra oferece o WhatsApp.
- **Pagamento de teste** (como o modo de teste do Stripe), **só na prévia**: Completo R$ 49/mês ou R$ 490/ano e Premium R$ 99/mês ou R$ 990/ano (provisórios); Pix com "Simular Pix pago" e "Simular Pix vencido"; cartão de teste já preenchido, com **APRO aprova** e **OTHE recusa**, como no Mercado Pago. O site de verdade não muda.
- Admin › Leilões: "Compras de créditos e planos (30 dias)", com a etiqueta "Teste".
- Termos: plano grátis por enquanto, aviso antes de cobrar, créditos não devolvidos depois de usados.

### 32. Pedidos de 19/10: menu, planos enxutos, a conta que sai e a academia que fecha
- No menu do celular, o **nome da academia é o seletor**; saiu "Plano de cada academia".
- **Link na frase** ("Não achou a sua? Fale com a gente.", "Revise e salve a ficha", que abre a prévia); página Plano com o título "Plano Premium"; cartões dos planos só com o que cada um soma ("Tudo do Básico, mais:"), deslizando de lado no celular, como os do Spotify e da Netflix.
- **A conta sai, a academia fica** (como o Google Business Profile e o Yelp): Parceiros › Perfil › "Excluir minha conta". Com outro acesso, o mais antigo vira o responsável e o plano passa a ser dele (com e-mail); sem outro, a academia volta ao Básico e fica sem responsável. Saíram "Pedir para tirar do guia" e "Excluir academia".
- **A ficha só sai do Guia quando a academia fecha as portas** (como o "Fechado permanentemente" do Google): Suas academias › "A academia fechou as portas?"; o admin confere em Pendências › "Academias que fecharam" ("Continua aberta" / "Fechou: tirar do Guia") ou tira direto pela ficha.
- **Academia nova direto no ar só pela conta do Parceiros** com o e-mail confirmado (a extensão à conta de jogador foi desfeita).
- **"Guia" com G maiúsculo** no site, nos e-mails e nos textos legais.
- "Entenda como funciona" abaixo dos números, num balão colado no link; rodapé do Perfil alinhado; na página inicial do Parceiros, o benefício do Completo para os jogadores e o convite antes das perguntas.
- Ajuda, chat, Termos e Privacidade atualizados.

### 33. Pedido de 20/10: pelo menos um sobrenome nos cadastros
Como o nome e sobrenome obrigatórios do Booking e do Airbnb.
- Criar conta, Minha conta/Perfil e "Faça seu cadastro" (nome e WhatsApp sem conta) não passam só com o primeiro nome; "da", "de" e "dos" sozinhos não contam. Sem aviso antes; só quando falta aparece **"Preencha o sobrenome."** (também no campo Sobrenome do Parceiros). Com o campo vazio, "Falta o nome e o sobrenome."
- Quem já tem conta só com o nome continua entrando; ao salvar Minha conta, o site pede o sobrenome.
- Termos de Uso e Política de Privacidade dizem "nome e sobrenome" (20 de outubro de 2026).

### 34. Pedido de 20/10: o que a senha precisa ter, embaixo da senha nova
Como a lista do Airbnb e da Microsoft, para a senha passar de primeira.
- Embaixo de toda senha nova (criar conta, Parceiros, primeiro acesso, trocar a senha e senha nova pelo código), desde antes de digitar: **"Pelo menos 8 caracteres"**, **"Nada fácil de adivinhar, como 12345678 ou o seu e-mail"** e **"A mesma senha nos dois campos"**. Cada um tem um círculo cinza que vira **check verde** quando feito e fica **vermelho** quando errado (senha óbvia com 8 ou mais; repetição diferente).
- Embaixo, a dica: "Dica: junte palavras e números, como "saibro coberto 2026"." A barrinha fraca/boa/forte continua em cima.
- São as mesmas regras de quando o site confere a senha: com tudo verde, a senha passa. Saiu o texto de exemplo "Pelo menos 8 caracteres" de dentro do campo, que repetia a lista.

### 35. Pedido de 20/10: o "Sobre" da ficha com as outras comodidades e o que as avaliações elogiam
Como o "Mostrar as 25 comodidades" do Airbnb, o "Os hóspedes adoraram" do Booking e o "Pessoas mencionam" do Google Maps.
- Com mais de 4 comodidades: **"Entre as comodidades estão estacionamento grátis, vestiário, loja de materiais, wi-fi e outras 2."** ("e mais uma" com 5).
- **"Quem avaliou elogia os professores, as quadras e o atendimento."**: sem IA, por palavras-chave nas avaliações de 4 e 5 estrelas, frase por frase; a frase com "não", "falta", "ruim"… não conta; os mais citados primeiro, até 3. Temas: professores, aulas, quadras, atendimento, limpeza, ambiente, localização, estacionamento, vestiário, iluminação, preço e facilidade para marcar.
- Termos de Uso (seção 6, 21 de outubro de 2026): o texto da ficha pode citar o que é elogiado nas avaliações, sem copiar a avaliação nem o nome de quem avaliou.

### 36. Pedido de 20/10: "Como funcionam as avaliações" no balão
Igual ao "Entenda como funciona" dos números do Parceiros: abre num balão colado no link, com o ✕ (tocar fora ou Esc também fecham), em vez de abrir o texto embaixo.

### 37. Pedido de 20/10: cancelamento e reposição enxutos, na aula e na locação
Como o "Cancelamento grátis até…" do Booking e do Airbnb. Saíram a faixa "24h é a antecedência mínima…" e os dois cartões grandes que repetiam o número. Cada um (aula e locação) vira **um cartão com duas linhas**: "✓ Desmarcou até 24h antes · Tem reposição da aula." e "⚠ Com menos de 24h · <o que a academia escreveu>". Sem reposição: "Sem reposição de aula desmarcada".

### 38. Pedido de 20/10: a ficha sem o caminho no alto e o topo com os três ícones
Como o topo da página da acomodação do Airbnb e do Booking no celular.
- Saiu o "Início › Quadras em São Paulo › Pinheiros › Academia" do alto. O caminho fica só nos dados para o Google, e o link da região foi para o fim de "Explore a região": **"Ver todas as academias em Pinheiros ›"**, como o "Ver todos os hotéis em…" do Booking.
- **Topo:** a seta de voltar, o nome e **três ícones do mesmo tamanho, todos dentro da tela**: comparar (ícone novo, verde cheio quando está na comparação), compartilhar e favoritar. Antes, o "+ Comparar" ocupava o espaço e o coração saía da tela. No computador, "Voltar" e "Comparar" com texto.
- Tocar no comparar avisa no alto, numa linha só, "Na comparação (1) · Ver ›" (tocar no aviso abre a comparação; seção 41), ou "Tirada da comparação · Ver ›".

### 39. Pedidos de 21/10: estacionamento grátis e pago, com "como funciona" obrigatório
Como a pergunta de estacionamento do Booking para Parceiros: marcar "grátis" e "pago" ao mesmo tempo não dizia nada para o jogador.
- **No cadastro**, os dois chips de sempre, "Estacionamento grátis" e "Estacionamento pago". Com os dois marcados, **embaixo de todas as comodidades** vem **"Estacionamento grátis e pago: como funciona?*"**: "Grátis para alunos, pago para os outros", "Grátis por um tempo, depois pago" (com "Grátis nas primeiras __ horas") ou "Grátis até lotar; depois, pago". Desmarcar um dos dois tira a pergunta.
- **É obrigatório:** sem dizer como funciona (ou, em "por um tempo", sem as horas), "Continuar" não passa ("Preencha: como funciona o estacionamento grátis e pago.") e salvar não salva ("Conte como funciona o estacionamento grátis e pago.", de volta à parte Quadras), também na edição e antes da tela do plano; o aviso fica vermelho. O admin segue publicando só com o nome (decidido pelo Breno).
- **Quem já tinha os dois marcados** tem a regra entendida do que a academia escreveu ("alunos", "mensalistas", "primeiras 2 horas", "quando lota"). Sem como entender, a ficha diz "Tem vaga grátis e vaga paga. Pergunte na academia como funciona.", o Parceiros mostra "Como funciona o estacionamento" no que falta na ficha, e editar a ficha pede a resposta.
- **Na ficha**, um item só ("Estacionamento grátis para alunos", "…nas primeiras 2h", "…até lotar"), com a frase completa em "Como chegar", na pergunta frequente, no "Sobre" e na comparação. Grátis só para alunos não vira o selo "Estacionamento grátis" do cartão da busca.
- A regra acompanha a comodidade também no Básico. Sem mudança no banco: a regra fica em `acesso`.

### 40. Pedido de 21/10: as "Melhores avaliadas" de verdade
Como o TripAdvisor e o Booking. Antes, a mais perto vinha antes da melhor nota (uma 3,0 aparecia na frente de uma 4,8) e as que já estavam nas recomendadas ficavam de fora.
- Só **nota 4 ou mais**, na ordem da **nota ponderada pelo número de avaliações** (uma 5,0 com 1 avaliação não passa na frente de uma 4,8 com 40); pode repetir uma recomendada.
- Com 3 ou mais boas a até 50 km de quem procura, só as de perto, com o título **"Melhores avaliadas perto de você"**; senão, as do Guia inteiro.
- Termos e a pergunta "Como funciona a ordem das academias?": as "Melhores avaliadas" seguem só a nota dos jogadores, sem relação com o plano.

### 41. Pedidos de 21/10: comparação com o aviso que leva até ela, "Limpar" em vermelho, "Localização" e o ícone
- O aviso é **uma linha só, e todo ele é o atalho**: "Na comparação (1) · Ver ›" (com 2 ou mais, "Comparar ›"), como o "Salvo em Favoritos · Ver" do Airbnb.
- **"Limpar comparação"** em vermelho, com o lixo, já com uma academia escolhida.
- A seção "Onde fica" virou **"Localização"**.
- O subtítulo, mais curto, termina com tudo: "Veja lado a lado o que muda entre elas: nota, preço, estrutura e tudo o que está na ficha."
- **O ícone da comparação** (os dois quadrinhos do topo da ficha) nos lugares sobre comparar: título da página, o botão de cada academia no seletor (verde cheio quando já está), "Comparar N", o aviso, o menu ("Comparar academias") e o filtro "Comparação". O "+ Escolher" ficou como era, só com o +. O chat de ajuda explica o ícone.

### 42. Pedido de 21/10: a comparação mostra tudo da ficha
Além de nota, avaliações, preço, bairro, distância, quadras, piso, cobertura, comodidades, modalidade e reposição, a tabela compara **promoção** (quando alguma tem), **como chegar**, **estacionamento** ("Grátis", "Pago", "Grátis para alunos; pago para os outros"…), **horário**, a **reposição da aula e da locação** separadas (o menor aviso ganha o ✓), **contato** (WhatsApp, Instagram, site), a **ficha** (confirmada e quando foi atualizada, ou ficha básica) e os **elogios** das avaliações. Linha sem informação em nenhuma academia some.

### 43. Pedido de 21/10: "Me ajude a decidir" entende a ficha inteira
Sem IA, por palavras-chave, e agora mostrando o que cada academia diz, embaixo de cada ponto.
- **Estacionamento grátis** (só a de grátis para todos; a de "grátis para alunos" aparece com a regra) e estacionamento em geral.
- **Tempo de aviso da reposição**: com prazos diferentes, ganha o menor aviso, e a ajuda diz "O menor aviso é na X: 12h antes."
- **Privacidade, tranquila, reservada, menos movimento → academia menor** (menos quadras), e academia maior.
- **Horário**: fim de semana, à noite (até 22h), cedo (até 7h) e o horário em geral; **aula**, **locação**, empréstimo de raquete, promoção, ficha confirmada, como chegar, fotos, contato e elogios — além das comodidades, cobertura, piso, preço, distância, avaliações e estrutura de antes.
- O texto de exemplo e o "Não identifiquei…" citam o que dá para perguntar.

### 44. Pedido de 21/10: o GuiaTennis é site, não app
"Não somos um app ainda, somente site ou GuiaTennis." Nenhum texto chama o site de "app":
- **"N avaliações no GuiaTennis"** no alto da ficha, no quadrinho da nota, na caixa do preço e no selo de nota da busca; **"Essa academia ainda não tem avaliação no GuiaTennis."**
- O filtro **"Avaliação no GuiaTennis"**, a ordem "Maior nota das avaliações feitas no GuiaTennis" e o cadastro enviado ("aparece para todo mundo no GuiaTennis").
- Política de Privacidade: "visíveis para todos os usuários do site" (21 de outubro de 2026).
- "App" fica só para o que é app de verdade (app de assinatura fitness).

### 45. Pedidos de 21/10: o cadastro sem plano no meio, o plano depois de confirmar, o X que pergunta e as fotos arrastando
Com prints do cadastro no celular:
- **Nada de plano no cadastro** ("tire o que aparecer de planos no cadastro"): saíram o aviso "No Básico, …/Você escolheu o plano …" de cada parte, o "Fora da ficha no Básico" em cima das fotos, a escolha das comodidades nas Quadras e as linhas "fica de fora no plano" da prévia. A **prévia mostra tudo o que foi preenchido**.
- **O plano vem depois de confirmar, como uma página de erro**, igual ao "Este recurso não está no seu plano" da Shopify e do Canva: ícone do olho riscado, **"N partes não vão aparecer na ficha"**, "No plano Básico, os jogadores não veem o que você preencheu aqui embaixo. Nada se perde…", a lista (com "Escolher quais vão primeiro" nas fotos e a escolha das comodidades que aparecem), **"Para mostrar tudo, mude de plano"** com Premium e Completo e "Continuar no Básico sem essas partes". Sem nada escondido, segue "Quase lá: escolha o plano".
- **Lápis da revisão → "Confirmar" verde**: vindo da revisão (lápis, "+ Adicionar" ou aba), a parte mostra só o "Confirmar", que confere o obrigatório e volta para a revisão, como o "Salvar" de cada parte do Airbnb. O "Editar" de baixo segue parte por parte.
- **O X pergunta antes de apagar**, como o "Descartar publicação?" do Instagram, só quando há o que perder: "Sair do cadastro? O que você preencheu da <academia> vai ser apagado e não volta…" com **"Sair e apagar"** (vermelho) e "Continuar o cadastro"; na edição, "Sair sem salvar?… A ficha continua como estava" com "Sair e descartar as mudanças" e "Continuar editando". Vale para o X, o toque fora da folha e a tela do plano; a tela de pronto fecha direto.
- **Fotos em qualquer ordem, arrastando**, como o Airbnb e o Instagram: "Segure e arraste uma foto para mudar a ordem. A primeira é a capa." No celular, segura um instante (deslizar direto rola a tela); no computador, basta arrastar. "Usar como capa" continua.
- **Cancelamento**: "Mesma regra para tudo / Aula e locação diferentes" vem primeiro, com espaço e uma linha antes da explicação e das horas.
- No começo do cadastro do Parceiros, saiu "Os seus dados de contato já vão junto: não precisa digitar de novo." e ficou só "Com o seu e-mail confirmado, a academia entra no ar quando você finalizar."

### 46. Pedido de 22/10: o código da disputa com prazo, enquanto o envio é à mão
O WhatsApp automático espera o CNPJ; até lá, o Breno manda o código pelo painel (`/admin` › Pendências › "Mandar código ao WhatsApp da academia", que abre o WhatsApp dele com a mensagem pronta). Para não prometer o que não acontece, como o "o código chega em até 5 dias" da carta do Google Business Profile:
- O cartão "Em disputa", sem código ainda: **"O GuiaTennis manda um código de 6 números para o WhatsApp da academia em até 1 dia útil."** Com o automático ligado, o código sai ao contestar e o cartão já diz "Mandamos um código…", sem nada para trocar.
- Saíram os "vai na hora" (cartão do pedido ao responsável, espera do e-mail confirmado e a Ajuda "E se outra pessoa estiver administrando a minha academia?").
- "Mandar outro código", sem o automático: "Para mandar outro código, fale com o GuiaTennis no WhatsApp."
- Pedir uma academia que já tem responsável continua indo para ele aceitar; só "Contestar" vira disputa.

### 47. Pedido de 22/10: "Esqueci a senha" passo a passo
Como o Google, a Microsoft e o Instagram, no Parceiros e na conta do jogador (também "Trocar a senha" de Minha conta):
- **Primeiro o código:** "Mandamos um código para <e-mail>. Chega em até um minuto; olhe também o spam.", o campo do código, **"Continuar"** (Enter também) e "Mandar outro código". O código errado fica ali, com "Código errado ou vencido…".
- **Depois a senha:** "Código confirmado. Agora crie a senha nova.", a senha nova com a lista do que ela precisa ter, a repetição e "Salvar a senha nova", sem pedir o código de novo. Se o código venceu no meio, salvar volta para o passo do código.

### 48. Pedido de 22/10: dicas no alto do Parceiros para vender mais
Como as sugestões do perfil no Google Business Profile ("Adicione fotos…") e o próximo passo do Shopify: o aviso verde que desce no alto, em duas linhas (o que fazer e por que vale a pena), com o atalho e o ✕. **No máximo uma por dia e por academia**, logo depois de abrir uma página da conta, sem cobrir outro aviso, o formulário, o menu nem o chat. Na ordem:
- **Falta algo na ficha:** a parte que falta, com o porquê, ex.: "Adicione fotos da academia · Ficha com foto recebe muito mais contato. · Adicionar fotos ›" (WhatsApp, endereço, fotos, preço, horário, quadras, comodidades, estacionamento grátis e pago, cancelamento e como chegar). O atalho abre a ficha na parte, com o "Confirmar" que leva à revisão.
- **Ficha completa, fora do Premium:** o plano de cima: "A ficha esconde 2 coisas que vocês preencheram · Com o Completo, elas aparecem na hora… Grátis por enquanto." ou, sem nada escondido, uma dor que o plano de cima resolve (uma por dia), com "Ver o Completo/Premium ›".
- **Premium:** sem promoção, "Publique uma promoção" (Promoções › Na ficha); com promoção e sem lance na semana, "Entre no leilão de promoções" e "Ver o leilão ›" (seção 49).
- **Conta com mais de uma semana e a ficha ainda incompleta:** um dia a parte que falta, no outro o plano de cima (no Premium, a promoção). Conta nova fica só na ficha até completar.
- A hora da última dica fica no aparelho, para não repetir no mesmo dia; Política de Privacidade atualizada (22 de outubro de 2026).

### 49. Pedido de 22/10: o leilão de promoções passo a passo, com a página de andamento
Como o fluxo de campanha do trivago Business Studio e do Google Ads (uma etapa por tela, sem barra de etapas) e o "Acompanhar pedido" dos grandes:
- A aba **Por e-mail virou "Leilão"** (menu, chat, Ajuda, dicas e Planos: "Leilão de promoções"). No alto, o resumo: o bairro, quando fecha e os créditos, com "Comprar ›".
- **Cinco etapas**, uma por tela: (1) **Como funciona**, em 4 pontos (um leilão por bairro e por semana, às cegas; a nota é lance × qualidade; duas promoções por semana, terça e sexta às 10h; só paga se ganhar); (2) **Vale a pena?**: quem recebe, lance mínimo, custo por jogador, os dois e-mails, os leilões de antes e o que soma na nota da ficha, com "Agora não" ou "Quero participar ›"; (3) **Promoção**, com a prévia do e-mail (no Premium, dá para usar a da ficha); (4) **Lance**; (5) **Revisar**, com "Nada é cobrado agora" e "Entrar com lance de até R$ X".
- **O lance máximo explicado:** "É o teto, não o preço. Você nunca paga mais que o lance máximo. Se ganhar, paga só o suficiente para ficar à frente da academia seguinte, mais R$ 1; se ninguém mais der lance, paga o mínimo. Se não ganhar, nada é cobrado.", com um exemplo que muda com o valor digitado ("você oferece até R$ 85 e a academia seguinte oferece R$ 51… você ganha e paga R$ 52, não os R$ 85") e os créditos com "Comprar ›" ali mesmo. A mesma frase, mais clara, nos Termos de Uso (22 de outubro de 2026), na Ajuda e no chat.
- **Andamento do leilão**, depois de entrar: Lance registrado ✓ › Leilão aberto (até domingo, 20h) › Resultado › E-mail aos jogadores, com o lance máximo, "Alterar o lance" e "Sair do leilão".
- Também: a tela de pronto da academia nova no ar diz o plano escolhido ("no plano Premium"), sem falar do Básico nem de preço; e a revisão do cadastro diz "Toque no lápis para editar uma seção.".
- *(As etapas ganharam nomes formais e o visual de painel no mesmo dia: seção 50.)*

### 50. Pedido de 22/10: o leilão com cara de painel de anúncios
Como o "Turbinar publicação" do Instagram (objetivo, público, orçamento e revisão, com o alcance estimado) e a área de campanhas do trivago Business Studio: a parte paga fica num painel neutro, mais seco e técnico, separado do resto do Parceiros.
- **Só na aba Leilão** (com o leilão aberto): fundo cinza, o título "Promoções" sem a fonte de revista, cartões retos sem sombra, rótulos pequenos em cinza e números alinhados.
- **Cabeçalho da campanha:** "Leilão · e-mail patrocinado", o status ("Sem lance" ou "Lance ativo", com o ponto verde), o bairro e 4 números: Encerra ("dom. 25/10 · 20:00"), Alcance estimado ("140+ jogadores"), Lance mínimo e Créditos ("Comprar créditos").
- **Etapas com nomes formais**, com "Etapa N de 5" em cima do título (só texto, sem barra): Como funciona › **Estimativa da semana** (alcance, custo por jogador, 1º e 2º envio, "Índice de qualidade da academia", "Agora não" ou "Participar") › **Texto do anúncio** (com os contadores 20/60 e 50/500) › **Lance máximo** (o campo com "R$" na frente; a explicação do teto fica igual) › **Revisão do anúncio**.
- **Andamento:** "Lance ativo em Pinheiros", os números (lance máximo, encerra, 1º e 2º envio), a linha do tempo, o anúncio e os botões "Alterar o lance" e "Sair do leilão" (em vermelho).
- **Leilões anteriores** numa lista: a data, a promoção e o resultado (em verde quando ganhou).
- A prévia do e-mail continua como o jogador vê.

### 51. Pedido de 22/10: salvamento quase imediato e aviso antes de sair, no site todo
Como o "Alterações não salvas" do admin da Shopify e o "Descartar publicação?" do Instagram:
- **Rascunho na hora:** o que se digita vai para o rascunho da aba em 0,25 s e volta se a página recarregar. Além do que já era guardado (cadastro da academia, contas, viagem, preferências, avaliação e resposta), agora também o **leilão** (com a etapa), a **promoção na ficha**, o "a academia fechou", o **"Faça seu cadastro"** (antes, o aviso de erro apagava o nome digitado), as anotações do "Me ajude a decidir" e as estrelas da avaliação.
- O rascunho é guardado **sem nada na tela** (sem o "Rascunho salvo", seção 56).
- **"Sair sem salvar?"**, com "Sair e descartar" (vermelho) e "Continuar editando", quando há algo preenchido e não salvo e a pessoa toca num link, menu, aba ou ficha, toca no ✕ (ou fora) da janela, ou volta pelo navegador ou pelo gesto do celular (a tela fica onde estava). Fechar a aba ou sair do site mostra o aviso do próprio navegador. Sem nada preenchido, nada pergunta.
- Vale para a avaliação, a resposta às avaliações, criar conta e Minha conta, "Faça seu cadastro", viagem, preferências, o cadastro da academia, o cadastro e o Perfil do Parceiros, a pessoa nova em Acessos, a promoção, o leilão, "a academia fechou" e o motivo de exclusão no admin. Busca, filtros, comparação e o Entrar ficam de fora.

### 52. Pedido de 22/10: o cabeçalho do leilão só no começo e no fim, e a compra de créditos numa página de pagamento
- O cabeçalho da campanha (bairro, encerramento, alcance, lance mínimo e créditos) aparece só em "Como funciona" e em "Revisão". Nas etapas do meio e no andamento, não; os créditos seguem na etapa do lance, com "Comprar".
- **Comprar créditos virou uma página própria** (`/parceiros/creditos`), como o "Adicionar fundos" da Meta, o "Fazer um pagamento" do Google Ads e o checkout do Stripe: sem o menu nem o rodapé do Parceiros, fundo branco e, no alto, só a marca, **"Pagamento seguro"** com o cadeado e o ✕.
- Na página: "‹ Voltar ao leilão", as etapas (Valor e forma › Pagamento › Confirmação), o valor em quatro opções (R$ 50, **R$ 100 "Mais escolhido"**, R$ 200, Outro valor), a forma de pagamento (Pix, "aprovação na hora", ou cartão, "na página segura do Mercado Pago") e **"Continuar para o pagamento · R$ 100"** (no cartão, "Ir para o Mercado Pago · R$ 50"). Ao lado (embaixo, no celular), o **resumo do pedido**: créditos, taxas R$ 0,00, total, o saldo atual e que os créditos só são usados quando a academia ganha.
- O Pix fica na própria página, com o passo a passo, o QR code e o copia e cola; o cartão vai para o Mercado Pago e volta para a página da compra. No fim, **"Pagamento confirmado"**, o saldo novo e "Voltar ao leilão", que volta para a etapa em que estava, com o anúncio. A compra do plano continua na página Plano.

### 53. Pedido de 22/10: a promoção na ficha paga por semana, no Completo e no Premium, e o leilão só do Premium
- **Na ficha** (Promoções › Na ficha): agora no **Completo e no Premium**; o Básico vê "Disponível no plano Completo". Como o Destaque da OLX e o "Turbinar" do Instagram, a academia escolhe **por quanto tempo** (1, 2, **4**, 8 ou 12 semanas), vê "Vale até <dia>" e o **preço antes de publicar**: por semana, o total, os créditos (com "Comprar") e o que falta. O preço sai dos **mesmos créditos do leilão** ("Créditos de promoções").
- **O Completo paga o preço cheio; o Premium, 20% menos**, com a etiqueta "20% menos no Premium". No Completo, embaixo: "No Premium, a semana sai por R$ X (20% menos). Ver os planos ›".
- **O preço ainda não foi definido**: começa em R$ 0 ("Por enquanto, a promoção na ficha não tem custo.") e o admin muda em Leilões › **"Promoção na ficha · preço da semana"**, que mostra quanto paga cada plano.
- A prévia mostra a duração e o custo, e o botão diz o valor (**"Publicar promoção · R$ 20"**); sem créditos, trava com "Comprar créditos ›", e a página de pagamento volta "à promoção", com o que foi escrito. Alterar: o texto é de graça e dá para **somar semanas** (até 12 semanas à frente). **Encerrar devolve as semanas que ainda não começaram** ("R$ 10 voltaram para os créditos"), como o orçamento não gasto da Meta.
- **Leilão só do Premium**: o Completo e o Básico veem "Disponível no plano Premium", e o banco também recusa o lance (e tira do leilão quem saiu do Premium antes de fechar). O desconto do Premium saiu do leilão (só o Premium entra) e foi para a semana da promoção na ficha. "Mandar por e-mail" na promoção da ficha, só no Premium.
- Do Premium para o Completo, a promoção na ficha continua (sai só o leilão); no Básico, fica guardada e não aparece, sem devolução (está nos Termos).
- **Fora do Premium, nenhum detalhe do leilão** (23/10): tocar em "Leilão" mostra só o cartão do Desempenho, "Leilão de promoções · Disponível no plano Premium · Ver o plano Premium". Nos Planos, só o nome ("Leilão de promoções por e-mail"); a dor do Premium no Plano e nas dicas virou "A promoção toda semana pesa no caixa" (a semana mais barata); logado fora do Premium, a Ajuda não tem a pergunta do leilão.
- Planos (Completo: "Promoções na ficha e na busca, pagas por semana"; Premium: "…com a semana mais barata" e o leilão), Ajuda, chat, dicas (no Completo, um dia o Premium, no outro "Publique uma promoção"), o que muda ao baixar o plano e os **Termos** acompanham.

### 54. Pedido de 23/10: excluir a conta nos dois lados, com o aviso do que acontece
É o mesmo login no site dos jogadores e no GuiaTennis Parceiros, como a Conta do Google: **excluir num lugar exclui nos dois**.
- **"Excluir minha conta" nos dois lados**: em Minha conta (site dos jogadores) e no Perfil do Parceiros. Antes, quem administrava academias não tinha o botão no site dos jogadores ("use o Parceiros").
- **O mesmo aviso nos dois**, como a exclusão da Conta do Google e a Central de Contas da Meta: "Excluir a sua conta do GuiaTennis?", "É a mesma conta no site dos jogadores e no GuiaTennis Parceiros: excluir aqui exclui nos dois.", **O que sai** (perfil, favoritas, buscas salvas, viagens, avisos e conversas do chat; com o Parceiros, o acesso e o nome de cada academia), **O que acontece com a academia** (a ficha continua no Guia; onde é o responsável principal, a pessoa mais antiga da equipe assume, com o plano; sem ninguém, a academia volta ao Básico; na equipe, só sai), **O que fica** (as avaliações, com o nome), a caixa **"Entendi que a exclusão não pode ser desfeita."** e "Excluir a conta" em vermelho (só com a caixa marcada) ou "Cancelar".
- No banco, excluir pelo site dos jogadores com acesso ao Parceiros exclui o login inteiro, como pelo Parceiros (antes, só a parte de jogador saía).
- Termos de Uso, Política de Privacidade (23 de outubro de 2026) e o chat ("excluir a conta") acompanham.

### 55. Pedido de 23/10: "Crie sua conta para guardar as academias que você chamou"
Buscar, ver a ficha e chamar continuam **sem login** (como o trivago, o Booking, o Airbnb e o Google Maps). No lugar de trancar, o convite do "Entre para salvar" do Airbnb e do Booking:
- Sem conta, as academias chamadas (WhatsApp, Instagram, site) ficam **só na aba aberta**. Depois da **segunda**, aparece no alto, com a cara dos outros avisos da conta do site dos jogadores (o balão branco com a borda amarela), **"Crie sua conta para guardar as academias que você chamou"** · "Você chamou 2 academias. Com a conta grátis, elas ficam em "Academias que você chamou", em qualquer aparelho." · **"Criar conta ›"**, que abre o cadastro com o motivo.
- Se a pessoa está no WhatsApp, o aviso espera ela voltar ao site. Uma vez por aba; o ✕ guarda por 14 dias.
- Ao criar a conta (ou entrar), as academias chamadas na aba vão para "Academias que você chamou". Com conta, nada muda.
- Política de Privacidade: sem conta, as academias chamadas ficam só na aba, para irem para a conta.

### 56. Pedido de 23/10: nenhum "Rascunho salvo" na tela
- O **"Rascunho salvo" saiu do site todo**: do lado da parte do cadastro da academia e da etapa do leilão, e do fim da promoção, da viagem, da avaliação, de Minha conta, do Perfil do Parceiros e dos outros formulários.
- O salvamento continua igual, **calado**: o que se digita vai para o rascunho da aba em 0,25 s e volta se a página recarregar, como o Airbnb (o anúncio que está sendo criado) e o Booking (a reserva começada), que guardam sem avisar.
- O "Sair sem salvar?" continua como estava. Termos e Privacidade não mudam (não falam do aviso).

### 57. Pedido de 23/10: a patrocinada também no lugar dela, sem "Patrocinado"
Como o anúncio do Google (o site pago aparece em cima e de novo no resultado normal) e o "Patrocinado" da Amazon e do Mercado Livre:
- No topo continuam as até 2 academias Premium com **"Patrocinado"** e a borda dourada.
- Embaixo do título da ordem ("Mais perto de você"…), **todas** as academias na ordem escolhida, **as do topo também**, no lugar delas, com o selo dourado e **sem o "Patrocinado"**.
- A contagem ("N quadras encontradas"), o "Ver N" dos filtros e o mapa não contam a repetida. Se a busca só tem as patrocinadas (uma academia só, por exemplo), a lista é a de sempre, sem repetir.
- Termos de Uso (seção 4), a pergunta "Como funciona a ordem das academias?" e o chat dizem que as do topo aparecem de novo no lugar delas, sem a marcação. Privacidade não muda.

### 58. Pedido de 23/10: contestar numa página própria, passo a passo
Como o "Solicitar propriedade" do Perfil da Empresa no Google e a recuperação de conta da Meta, uma ideia por tela, com "Continuar":
- **Cartão do pedido** ("Pedido enviado ao responsável"): fica só "A academia é sua e você não conhece quem administra, ou ele saiu da academia? **Contestar ›**". A explicação da disputa saiu do cartão.
- **Página `/parceiros/contestar`**: sem o menu e o rodapé, só a marca e o ✕, "‹ Voltar" e a trilha de tênis com as quatro etapas: **Quando contestar** (a academia é sua e outra pessoa administra; se conhece quem administra, é mais rápido pedir a ela) › **O código** (6 números no WhatsApp da academia, pela conta do GuiaTennis, em até 1 dia útil; o WhatsApp de antes de a pessoa de hoje assumir, por isso o número não aparece) › **O que muda** (quem digitar o código vira o responsável, quem administra sai, a ficha segue no ar) › **Contestar** (sem como receber o código, o documento e "Fale com o GuiaTennis"), com "Contestar quem administra" e "Agora não".
- Ler as telas não contesta nada: só o botão da última. Contestado, volta para onde estava, com "Disputa aberta" e o cartão "Em disputa". Pelo link, a página começa da primeira tela; com a disputa já aberta, diz isso.
- Ajuda e chat dizem que "uma página explica a disputa passo a passo". Termos e Privacidade não mudam.
- (Mudou na seção 59: a explicação virou a apresentação do Nubank, e contestar abre a tela do código.)

### 59. Pedido de 23/10: contestar como a apresentação do Nubank e as telas de código como a do WhatsApp
- **Apresentação, como a do Nubank para a conta nova:** a explicação da disputa ocupa a tela toda no verde da marca, com as **quatro barrinhas** no alto (como as histórias), um **desenho grande** em cada tela, o título, pouco texto e um só botão branco **"Continuar"**. **Sem "Pular"** (nem ✕ ou "Agora não"): só a seta, que volta uma tela ou, na primeira, sai. Na última, "Contestar e receber o código".
- **Contestado, abre o lugar do código** na mesma página, como a verificação do WhatsApp: o desenho do celular com o balão, **"Digite o código"**, para onde ele foi, as **6 caixas** já com o cursor, "Confirmar", "Não chegou? Mandar outro código", a ajuda sem código (documento e "Fale com o GuiaTennis") e "Digitar depois". O cartão "Em disputa" ficou com a situação e **"Digitar o código"**, que leva direto a essa tela.
- **Todas as telas de código ficaram iguais a essa:** o e-mail do Parceiros, o "Esqueci a senha" do Parceiros e dos jogadores e o "Confirme o seu e-mail" dos jogadores. Têm o desenho (envelope com o balão), o título no meio, **uma caixa para cada número** (8 no e-mail), colar com espaço ou traço funciona, e **"Mandar outro código em 0:59"** (o minuto que o Supabase exige), mais "Olhe também o spam e a aba Promoções".
- Termos e Privacidade não mudam.
- (Os desenhos e as animações saíram na seção 60.)

### 60. Pedido de 23/10: sem "cara de IA" nessas telas
"Essas telas estão com muita cara de ia por aparecer algo muito animado": ficaram como as telas de texto do Nubank e a verificação do WhatsApp, só com tipografia e a cor da marca.
- **Saíram:** o desenho de cada tela da apresentação (anéis, ícone grande, selo amarelo, bolinha), a lista com ✓ amarelos, a etapa em maiúsculas amarelas, a barrinha enchendo, o texto entrando de lado e, nas telas de código, o desenho do celular e do envelope, o fundo verde nas caixas, a sombra, o ✓ do aviso e o ícone da ajuda.
- **Ficou:** o verde da marca com as barrinhas paradas, "1 de 4 · Quando contestar" discreto, o título grande, parágrafos curtos, a dica num quadro liso e o botão branco. No código, o título, o texto e as caixas, com a borda verde na de agora.
- Daqui em diante, telas novas sem ilustração decorativa e sem animação de entrada ou de progresso.
- **As caixas de número ficam** ("deixe os slots de número, ficou legal"): uma caixa por número em toda tela de código.
- (O verde em tela cheia e o título no meio mudaram na seção 61.)

### 61. Pedido de 24/10: essas telas com a cara do GuiaTennis, na fonte e na cor
Como o "Entrar" e o cadastro do Parceiros:
- **Contestar:** sai o verde em tela cheia. Fica o **creme do site** com a **marca no alto** (o logo e "Parceiros", sem ✕ nem menu, para não ter como pular), a seta de voltar e as quatro barrinhas em verde. A etapa ("1 DE 4 · QUANDO CONTESTAR") fica no **dourado** das etiquetas e o título em **Playfair**. O texto vai num **cartão branco**, com a dica no bege e o **botão verde logo abaixo do texto**: acabou o vão vazio entre o texto e o botão.
- **Tela do código da disputa:** "CONTESTAR · TÊNIS TERCEIRA" em dourado, "Digite o código" em Playfair, o texto à esquerda e um cartão branco com o aviso, as caixas, "Confirmar" e "Mandar outro código".
- **Códigos do e-mail:** nos jogadores, a página de sempre (o título em Playfair, o texto e o cartão com as caixas). No Parceiros, o título do cartão em Playfair e tudo à esquerda. Os números das caixas ficam em verde.
- Termos e Privacidade não mudam.

### 62. Pedido de 26/10: veracidade como os grandes, com os melhores dados de fora
"Faça o que for possível como os grandes fazem em tudo para sempre garantir a veracidade, pegue os melhores dados que garantem isso atualizados também." Resolve o "WhatsApp falso" e a ficha da academia que avisou que fechou.
- **O WhatsApp da ficha só entra confirmado por código**, como o Google Business Profile (código no telefone da empresa e nova verificação quando ela muda dados importantes), o Booking e o Airbnb (telefone confirmado antes de ir ao ar). O número que uma conta do Parceiros escreve fica guardado fora do site, e a ficha continua com o de antes (academia nova fica sem o botão, com "O WhatsApp da academia está sendo confirmado."). O código de 6 números vai ao número novo: sozinho pelo WhatsApp oficial do GuiaTennis, quando estiver ligado; até lá, o admin recebe o aviso e manda do WhatsApp dele em até 1 dia útil ("Gerar código" já abre o WhatsApp com a mensagem pronta). A academia digita em **/parceiros/whatsapp** (a mesma tela de código das seções 59 a 61, sem desenho), aberta pelo cartão "Confirme o WhatsApp da academia" em Atualizações e Minha ficha e pela tela de pronto do cadastro.
- **Na troca de número**, o código mostra que a pessoa tem o número novo, não que ele é da academia: por isso o GuiaTennis ainda confere ("Aprovar a troca" ou "Recusar", em Pendências), como o Google revisa a troca de telefone de um perfil verificado. Até lá, a ficha mostra o número de antes; "Cancelar a troca" no cartão. O código vale 72 horas e 5 tentativas.
- **"Informar um problema" na ficha**, como o "Sugerir uma alteração" do Google Maps: WhatsApp que não é da academia, academia fechada, endereço ou mapa, preço ou horário, outro. Pede a conta com o e-mail confirmado (sem confirmar, o código primeiro e o aviso sai sozinho depois). O admin vê em Pendências, com quem informou. A academia fica sabendo, sem saber quem informou (e-mail e cartão em Atualizações), e **salvar a ficha** resolve os avisos de dados. **Duas contas** dizendo que o WhatsApp não é da academia tiram o botão da ficha na hora, até o admin decidir ("manter" ou "tirar da ficha").
- **Avaliar só com o e-mail confirmado**, como o Tripadvisor e o Yelp: enviar a avaliação abre o código e ela sai depois; "Fazer isso depois" não avalia.
- **"Denunciar" em cada avaliação**, como o Google, o Booking e o Airbnb (falsa, ofensiva, propaganda, escrita pela academia ou por concorrente, dados pessoais). Em Pendências, "Manter" ou "Remover a avaliação". A academia continua com o "Pedir análise" nas dela.
- **A academia que avisou que fechou** aparece assim na ficha ("A academia avisou que fechou as portas. O GuiaTennis está confirmando.") e na busca, enquanto o admin confere, como o "Fechado permanentemente" do Google.
- **Ficha com mais de um ano sem atualizar:** "Faz mais de um ano: confirme horário e preço direto com a academia."
- **"Conferir" no admin, com os melhores dados de fora:** o **Google Maps** (pelo link: a API é paga e não deixa guardar), o **mapa aberto** (OpenStreetMap, atualizado todo dia: lugares com telefone perto da academia, marcando o mesmo número da ficha) e a **Receita Federal** pelo CNPJ (o cadastro oficial, atualizado todo mês: situação, atividade, endereço, telefone e e-mail da empresa, marcando o que bate com a ficha), pela função nova `netlify/functions/cnpj.mjs` (BrasilAPI, com a Minha Receita de reserva). Só no admin: as telas da academia continuam sem falar de CNPJ.
- **Não entrou:** confirmar o WhatsApp das fichas que já estão no Guia (valem os números de hoje; a regra vale para o que mudar), carta e vídeo (dependem de trabalho à mão), "Chamou pelo GuiaTennis" nas avaliações (o chamado fica no navegador e poderia ser forjado) e a API paga do Google.
- Termos (seções 2, 4, 5, 6 e 9) e Privacidade em 26 de outubro de 2026; Ajuda do Parceiros com duas perguntas novas; o chat dos dois sites.

### 63. Pedido de 26/10: a ficha só mostra o que está certo
"Não acho legal aparecer publicamente whatsapp em confirmação, algum grande faz isso? Mas ainda sim se colocar um número falso, verificado, não pode dar erro? Quando uma academia avisar que ele fechou, pausar no site, os jogadores não querem ver academia fechada. Eu quero ter um controle para se manter os dados atualizados, algo há 3 meses e aparecer no meu perfil."
- **Nada de "em confirmação" na ficha.** Nenhum grande mostra isso: o Google Business Profile só publica o telefone aprovado e não anuncia o que está em análise; o Booking e o Airbnb, idem. A ficha sem WhatsApp diz só "O telefone não foi incluído."; na troca, a ficha mostra o número de antes; o WhatsApp em revisão (2 contas) sai sem aviso. O banco nem deixa o visitante saber que há um número esperando (sai a coluna `whatsapp_situacao`).
- **Número falso com o código certo:** o código prova que a pessoa tem o número, não que ele é da academia (quem cadastra uma academia com o próprio celular passaria). Agora **todo número novo** espera você depois do código, não só a troca, como o Google revisa o perfil novo antes de mostrar o telefone: o admin recebe "WhatsApp para aprovar", confere em "Conferir" (Google Maps, mapa aberto e Receita) e toca em "Aprovar o número" ou "Recusar". Até lá, a ficha fica sem o botão (ou com o número de antes). Se ainda passar um número errado, os jogadores avisam pelo "Informar um problema", e 2 contas tiram o botão na hora.
- **A academia que avisou que fechou sai do site na hora**, como o Booking fecha o anúncio para reservas: o jogador não vê mais a ficha (nem na busca, nem pelo link) enquanto o admin confere. "Continua aberta", ou o aviso cancelado, traz a ficha de volta como estava (até com a pausa que ela tinha antes); "Fechou: tirar do Guia" apaga, como antes. Enquanto isso, a academia não pausa nem volta sozinha. No Parceiros, a situação fica "Fora do site"; no admin, "A ficha saiu do site quando a academia avisou".
- **O controle das fichas paradas, no seu painel:** Pendências › **Fichas paradas há 3 meses** (também em "Para fazer agora" e no filtro "Paradas há 3 meses" de Academias), como o Google, que pede ao dono para confirmar o perfil e confere ele mesmo as fichas sem dono. A lista traz as fichas no ar que não mudam há mais de 3 meses, a mais parada primeiro, com desde quando ("parada desde junho de 2026 (4 meses)"), se é ficha básica ou confirmada, quantas vezes foi aberta em 30 dias e o lembrete: o e-mail automático "Está tudo certo na ficha?" (a academia já recebia aos 3 meses e a cada 3 meses), "Sem responsável: ninguém para lembrar" ou "Ninguém da academia recebe os e-mails". Ações: Abrir a ficha, Editar, Conferir, **Lembrar agora** (o mesmo e-mail, na hora, um por dia) e **Conferi: está certo** (sai da lista por 3 meses, sem mudar a data que o jogador vê, que é a da academia).
- Termos (seções 2 e 4) e Privacidade em 26 de outubro de 2026; Ajuda do Parceiros ("Por que o WhatsApp novo não aparece na ficha?" e "Posso pausar ou tirar a academia do Guia?") e o chat; os e-mails novos com nome na lista de e-mails do admin.

### 64. Pedido de 26/10: a academia vê que o WhatsApp precisa de confirmação, a academia que fechou fica guardada e todas as pendências no painel
"Mas para academias aparecer que o whatsapp precisa de confirmação e que ele não ficará público até ser confirmado." "Não quero que academias sejam excluídas por completo do site, manter no sistema para possível reinauguração ou ter o controle de quantas academia já tivemos no site, e se um email que já possuío uma academia, retornar, aparecer uma pergunta se ele deseja administrar aquela academia novamente ou um novo email pesquisar o nome daquela academia e aparecer algo como fechado permanente/ cadastro inativo." "Eu preciso que todas notificações de pendências chegue ao meu perfil, sobre tudo que devo fazer."
- **O WhatsApp, para a academia:** o jogador continua sem saber de nada (seção 63), mas a academia vê, com todas as letras, **"Precisa de confirmação… não fica público até ser confirmado"**: embaixo do campo do WhatsApp, na prévia (embaixo do botão), na tela de pronto, no cartão de Atualizações e na própria ficha, que só ela vê ("Só vocês veem isto: …").
- **A academia que fechou não é mais apagada** (como o "Fechado permanentemente" do Google e a propriedade desativada do Booking): "Fechou: tirar do Guia" guarda o cadastro como **fechado (cadastro inativo)**, fora do site, com as avaliações, a data e o e-mail de quem administrava; os acessos saem e o plano volta ao Básico. No painel, Academias › filtro **Fechadas** (com quem administrava e "Reabrir (voltar ao Guia)") e, na Visão geral, **"Fechadas (cadastro inativo)"** e **"Já passaram pelo Guia"**. (Muda o "apaga" da seção 63.)
- **O mesmo e-mail volta:** no Parceiros aparece "Fechada permanentemente · cadastro inativo · A … reabriu?"; com a declaração, **"Reabrir e administrar"** põe a ficha de volta na hora e a conta administra de novo, como o "Marcar como aberta" do Google; o admin recebe "Academia reaberta" e revisa em "Foram ao ar" ("· reaberta").
- **Outro e-mail:** na busca do cadastro, a academia aparece como **"Fechada permanentemente · cadastro inativo"**; tocar nela troca o botão por "A academia reabriu? Pedir para reabrir". O admin recebe "Pedido para reabrir" e responde em Pendências: **"Reabriu: voltar ao Guia"** (a conta passa a administrar) ou "Recusar" (com resposta por e-mail). Ninguém passa a administrar uma academia fechada sem reabrir.
- **Todas as pendências no seu painel:** o número de Pendências no menu passou a contar tudo (deixava de fora o WhatsApp, os problemas informados e as denúncias); a seção nova **Avisos**, com o **sino** e o número no alto do painel (como o sino do Google Business Profile e as notificações da Shopify), traz "Para fazer agora" e **todos os e-mails que o GuiaTennis mandou para você nos últimos 30 dias**, cada um levando aonde se resolve. O **"Pedir análise"** da academia, que ia pelo WhatsApp, virou uma janela no site e chega em Pendências › "Avaliações denunciadas ou com análise pedida", com o motivo e o texto.
- Termos (seções 2 e 4) e Privacidade em 26 de outubro de 2026; Ajuda do Parceiros com a pergunta nova "A academia reabriu. Como ela volta ao Guia?"; o chat.

### 65. Pedido de 26/10: a ficha no jeito do hoteis.com
"Deixe as fichas das academias exatamente com esse layout, com ordem, tamanho das fotos e atalhos. Adaptando com as nossas fontes, cores e conteúdo, sem tirar nenhum da ficha, mas deixar todas informações." (com 7 prints da página do Grand Hyatt no hoteis.com, no celular)
- **A ordem do hoteis.com:** capa; nome no meio; destaques; Estrutura (as "Comodidades"); Explore a região; Sobre a academia (o bloco "Na praia"); Escolha o que você quer (as "Opções de quarto"); Avaliações; Outras academias por perto (as "Propriedades semelhantes"); Horário; Cancelamento e reposição (as "Taxas e políticas"); Perguntas frequentes; Contato, com "Algo errado nesta ficha? [Informar um problema]" no meio, como o "Como podemos melhorar nosso site? [Compartilhar opinião]". **Nada saiu da ficha.**
- **Capa no celular:** a foto quadrada, de ponta a ponta, e todas as fotos passam com o dedo; por cima, o ← num botão branco à esquerda e comparar, compartilhar e favoritar num botão branco à direita; embaixo, os pontinhos e o número de fotos. A barra de cima (voltar, nome e atalhos) só desce depois que a capa sai da tela. No computador continua o mosaico de fotos e as abas (na ordem nova); no celular, sem abas, como no hoteis.com.
- **Topo no meio:** as estrelas com o ⓘ ("Como funcionam as avaliações"), o nome com o selo, o endereço, **"Ver no mapa ›"**, a nota verde com **"3 avaliações ›"** e os ✓ verdes em duas colunas (aula e locação, quadras, piso e cobertura), como o "Totalmente reembolsável".
- **Destaques** com o ícone num círculo creme; **Estrutura** em duas colunas, tudo à vista; **Explore a região** com o mapa largo e o botão de abrir, o que tem por perto, como chegar e os atalhos "Ver no mapa e direções ›" e "Ver todas as academias em … ›"; **Sobre a academia** com uma foto grande e duas empilhadas, o texto e "Ver as N fotos ›".
- **Escolha o que você quer:** as caixas **"Horário"** (aberto agora e o horário de hoje; leva ao horário da semana) e **"A academia oferece"**, no lugar de "Datas" e "Viajantes"; a promoção no cartão do "Este é o preço normal"; os filtros **Todas / Aula / Locação** com "Mostrando 2 de 2 opções"; e as opções nos **cartões dos quartos**, dois lado a lado: foto em cima, "Menor preço" no mais em conta, **"Reposição até 24h antes" em verde**, o valor à direita e um **"Chamar no WhatsApp" em cada cartão**, que já abre a conversa sobre aquela opção.
- **Avaliações:** "Avaliações" com "Excelente 4,7" à direita, as barras das estrelas, os **cartões creme que passam com o dedo** (nota em cima, texto com "Mostrar mais", quem e quando embaixo) e **"Ver todas as N avaliações ›"**, que põe uma embaixo da outra.
- **Outras academias por perto:** cartões com a foto em cima, dois por vez, com a seta.
- **Barra de baixo:** o valor à esquerda e o "Chamar no WhatsApp" com o **anel dourado**, como o "Selecionar quarto"; o compartilhar fica no alto.
- A prévia no fim do cadastro segue a ordem nova. Termos e Privacidade não mudam (nada muda no que é guardado ou mostrado).

### 66. Pedido de 26/10: a barra de cima da ficha sem o nome e quase transparente; o "Vou viajar" com mais ar
"Tire a nome da barra do topo da ficha, até quando for descendo, e deixe ela com pouca diferença de cor na ficha, para ficar quase transparente mas visível." "Deixar um espaçamento melhor nessas frases em vou viajar."
- **Barra de cima da ficha:** só o voltar e os ícones de comparar, compartilhar e favoritar, sem o nome, também quando ela desce depois da capa. O fundo é o creme da ficha, quase transparente, com o que passa embaixo desfocado e uma linha fina, como a barra do Safari e a do Airbnb.
- **Vou viajar:** as frases embaixo dos campos com letra um pouco maior e linhas mais soltas, a das datas afastada dos campos, a caixinha do aviso por e-mail mais longe da frase de cima e a explicação dela alinhada ao texto da caixinha; mais espaço antes de "Guardar a viagem". Os textos não mudaram.
- Termos e Privacidade não mudam.

### 67. Pedido de 26/10: telas de código com uma caixa por número e "Confirmar" só com todas preenchidas
"Deixe as páginas de código com a quantidade de slots do código e só conseguir confirmar quando tudo for preenchido."
- **Uma caixa por número do código:** o código do e-mail tinha 8 caixas, mas o código que o Supabase manda tem 6 números (ligado em 05/10). Voltou a 6, e o fluxo do banco grava esse mesmo número no Supabase junto com o modelo do e-mail, para as caixas e o código nunca ficarem diferentes. A disputa e o WhatsApp da ficha seguem com 6.
- **"Confirmar" (ou "Continuar") só com todas as caixas preenchidas**, como o "Avançar" do WhatsApp: até a última caixa o botão fica apagado e o Enter não confirma; apagar um número trava de novo. Vale para as 7 telas de código: disputa (no cartão e na página de contestar), WhatsApp da ficha, confirmar o e-mail e "Esqueci a senha", no Parceiros e no site dos jogadores.
- Termos e Privacidade não mudam.

### 68. Pedido de 26/10: o contato mais acima, a ficha sem o nome do plano e o catálogo de aulas e locação
"Os contatos pode deixar mais acima tire a escrita de qual plano academia é, independente do plano." "Quero criar catálogos melhores para aulas em grupo, individuais, dupla e locações avulsas, mensal." Depois, em 27/10: "duração de aula e locação eu não quero colocar"; "eu não quero que o catálogo seja oferecendo aulas em tal horário e duração, e sim qual modalidade e valor"; "podendo adicionar imagens para cada aulas no Premium."
- **Contato logo depois de "Escolha o que você quer":** WhatsApp, site, Instagram, compartilhar e "Confirmada pela academia". "É o responsável por esta academia?" e "Algo errado nesta ficha?" ficam no fim da ficha. *(Desde a seção 72, o "Confirmada pela academia" voltou para o fim.)*
- **Sem o nome do plano:** a ficha não diz mais "Academia Premium"; o selo dourado diz só "Confirmada pela academia", na ficha, na busca e na home. O "Patrocinado" continua, porque é o aviso de anúncio.
- **Catálogo de preços: só modalidade e valor**, como a lista de preços do clube no Playtomic e as opções de preço do Mindbody. Em Modalidade e preço, uma tabela: aula individual, em dupla, em grupo e locação, cada uma com Avulsa e Mensal; a academia marca o que oferece e escreve o valor (um número ou uma faixa). Sem horário, duração, vezes por semana ou alunos. Na dupla e no grupo, o valor é por pessoa. O preço por hora de antes já aparece marcado.
- **Na ficha:** um cartão por opção, com a modalidade (aula avulsa ou plano mensal; você e o professor, duas pessoas, turma, aluguel da quadra), a reposição, o valor com o que ele paga (por aula, por hora, por pessoa, por mês) e o WhatsApp que já abre sobre aquela opção. Filtros: Todas, Individual, Dupla, Grupo, Locação e, quando há as duas, Avulsas e Mensais.
- **No resto do site:** a barra de baixo, a busca ("R$ 90/aula", "R$ 130/h", "/mês"), o mapa, o cartão da direita no computador ("A partir de", com "Ver as N opções"), a comparação (uma linha por tipo), o "Sobre", as perguntas frequentes ("Que aulas … tem?") e o Google (o catálogo como ofertas) usam o catálogo. A ordem e o filtro por preço usam o menor valor avulso.
- **Foto de cada opção, no Premium:** cada opção marcada na tabela tem "Foto desta opção" (com ✕ para tirar). Na ficha, o cartão da opção mostra a foto dela só no Premium; nos outros planos, a foto fica guardada e o cartão usa uma foto da academia. Fora do Premium, a tabela marca "Premium" e o fim do cadastro e a página Plano mostram a foto do catálogo no que o plano esconde; a tabela de planos ganhou "Uma foto para cada aula e locação do catálogo".
- **Banco:** a coluna `catalogo` em `academias` (SQL abaixo). Sem ela, o site lê e salva sem o catálogo, com o preço avulso da aula e da locação.
- Termos (27/10): o item 2 diz que os valores do catálogo são os que a academia informou e que matrícula, plano mensal, reposição e pagamento são combinados direto com ela; a regra das fotos diz que a foto de cada opção (Premium) mostra a aula ou a quadra, com autorização de quem aparece, sem promoção nem tabela de preço; o Premium inclui a foto de cada opção. Privacidade não muda.

### 69. Pedido de 27/10: nomes e conteúdo sem ofensa nem discriminação
"Coloque em política de privacidade, em termos de uso, que não pode ter ofensas no nome, avaliações não pode ser ofensivas ou ser contra as leis do Brasil, algo sobre discriminação… Os nomes também não. Coloque que eu posso alterar os nomes ou pedir a troca… E comentários que sejam xenofóbicos, homofóbicos, racistas, eu não vou tolerar no site." Como as políticas de conteúdo do Google Maps, as diretrizes do Booking e do Tripadvisor e a política de não discriminação do Airbnb.
- **Termos, seção 5 ("Nomes"):** o nome da conta (jogador ou Parceiros) e o da academia não podem ter palavrão, ofensa, apelido que humilhe, discriminação ou ódio, nada que a lei brasileira proíba, nem se passar por outra pessoa ou empresa. **O GuiaTennis pode alterar o nome** (na conta, na ficha e nas avaliações já publicadas) **ou pedir a troca**; até lá, o nome pode ficar oculto, e a conta que não trocar pode ser suspensa ou excluída.
- **Termos, seção 6:** em avaliações, comentários, respostas das academias, promoções e nomes, nada de ofensa, xingamento, ameaça ou humilhação; nada de discriminação ou ódio por raça, cor, etnia, origem, nacionalidade ou região (xenofobia), religião, sexo, orientação sexual ou identidade de gênero (homofobia e transfobia), deficiência, idade ou condição social; e nada que a lei proíba (Lei 7.716/1989, que o STF estendeu à homofobia e à transfobia; injúria racial; calúnia, difamação e injúria). **"Racismo, homofobia, xenofobia e qualquer discriminação não são tolerados no GuiaTennis"**: o conteúdo sai, a conta pode ser suspensa ou excluída sem aviso, e os dados vão às autoridades quando a lei ou uma ordem judicial exigir. A seção 9 (uso aceitável) também cita nomes e conteúdo ofensivo.
- **Política de Privacidade:** quando um nome é alterado ou um conteúdo é removido por isso, o GuiaTennis troca o nome na conta e nas avaliações (ou pede a troca) e pode guardar o registro do que foi trocado ou removido, de qual conta veio, a data e o motivo; esse registro só vai às autoridades por lei ou ordem judicial (Marco Civil da Internet).
- **No site:** o aceite da avaliação diz "Minha avaliação é verídica, sem ofensa nem discriminação, e segue os Termos de Uso."; "Como funcionam as avaliações" diz que ofensa e discriminação não são toleradas; o motivo da denúncia virou "É ofensiva, discriminatória (racismo, homofobia, xenofobia…) ou tem ameaça"; o chat de ajuda entende racismo, homofobia, xenofobia, preconceito e "nome ofensivo" e leva a denunciar (ou ao WhatsApp, para um nome).
- Termos e Privacidade em 27 de outubro de 2026. Sem mudança no banco.

### 70. Pedido de 27/10: ajustar o enquadramento das fotos, foto só em cima e nas opções, e nada de horário para escolher
"Eu quero que as fotos, quando for selecionadas, possam ajustar o enquadramento. E, igual na ficha dos hotéis.com, não tem foto no meio da ficha, só tem foto em cima e sobre os quartos… que no caso do site seria nas aulas, locação e os tipos das aulas. Eu não quero colocar que a aula pode ser de 6 pessoas ou não… E não a duração das aulas também… Não precisa selecionar um horário certo."
- **Ajustar o enquadramento**, como o "Cortar" do Instagram e das fotos do anúncio do Airbnb: escolhidas, as fotos abrem uma de cada vez ("Foto 1 de 2") num quadro no formato dos cartões e da galeria (4:3). Arrastar move; o controle −/+, os dois dedos ou a rodinha do mouse aproximam. "Pronto" (ou "Próxima") grava a foto recortada; "Usar como está" deixa a foto inteira. Na capa, um quadrado tracejado mostra o que a capa do celular mostra. Depois, cada foto tem "Ajustar"; a foto de cada opção do catálogo (Premium) também.
- **Foto só em cima e nas opções:** saiu o mosaico de fotos do "Sobre a academia" (e o "Ver as N fotos" de lá); ficam a capa e as fotos dos cartões das aulas e da locação. "Outras academias por perto" continua com a foto de cada academia, como as "Propriedades semelhantes" do hoteis.com.
- **Nada de horário para escolher:** saiu a caixa "Horário" de cima das opções, que parecia um campo de escolher horário; fica "A academia oferece", e o horário da academia continua na seção Horário. O catálogo segue só com modalidade e valor (sem número de alunos, duração ou vezes por semana).
- Termos e Privacidade não mudam. Sem mudança no banco.
- *(O corte mudou para o jeito do Instagram na seção 71.)*

### 71. Pedido de 27/10: o corte no jeito do Instagram, o aceite sem repetir os Termos, o nome suspenso por 15 dias e o "Usuário do GuiaTennis"
"Não, quero que seja estilo do Instagram o enquadramento." "Se a avaliação segue os termos quer dizer que não pode ter conteúdo oposto do que os termos não permite, então [não] precisa dizer novamente isso." "Será enviado email quando isso do nome for solicitado ou já alterado? E quando eu ver algo que não condiz com os termos, suspenda o nome por 15 dias e se não, a conta será excluída, e avaliação aparece tipo no Instagram quando a conta é excluída mas ainda permanece a avaliação."
- **O corte como o "Cortar" do Instagram:** tela toda no celular (no computador, a janela no meio), com ✕, "Cortar" e "Concluir" no alto; a foto na largura, no quadro 4:3; arrastar move, dois dedos ou a rodinha aproximam, e a grade de 3 × 3 aparece enquanto a foto se mexe. No canto, os botões redondos do Instagram: expandir (a foto inteira, sem cortar) e, no computador, a lupa com o zoom. Com várias fotos, as miniaturas numeradas embaixo trocam de foto, cada uma com o seu ajuste, e "Concluir" grava todas. O ✕ sai sem cortar e, se algo foi mexido, pergunta "Descartar as edições?".
- **Aceite da avaliação:** volta a "Minha avaliação é verídica e segue os Termos de Uso.", como o "Ao postar, você concorda com as políticas" do Google: seguir os Termos já inclui não ofender nem discriminar.
- **Nome suspenso por 15 dias**, como a suspensão do Instagram ("restam N dias") e o pedido de troca de nome do Facebook: no painel, "Suspender o nome" (em Contas de jogador, Acessos ao Parceiros, Avaliações e Avaliações denunciadas), com o motivo. Na hora, o nome sai das avaliações e a conta não avalia; a pessoa recebe o e-mail com o nome, o motivo, o prazo e "Trocar o nome", e um lembrete 3 dias antes do fim. Ao abrir o site, ela vê a tela "Restam 15 dias · O seu nome foi suspenso", com "Trocar o nome" e "Agora não"; em Minha conta e no Perfil do Parceiros, o aviso fica em cima do nome. Trocou (num dos dois lugares basta), a suspensão acaba na hora, chega a confirmação, e você confere o nome novo em Pendências › "Nomes suspensos" ("Está certo" ou "Suspender de novo"). "Cancelar a suspensão" também avisa a pessoa. Sem a troca em 15 dias, a conta é excluída sozinha, como na exclusão pelo admin (o e-mail vai para Contas excluídas), e a pessoa recebe "A sua conta do GuiaTennis foi excluída".
- **"Usuário do GuiaTennis":** a avaliação de conta excluída fica no site sem o nome e sem o e-mail, com o avatar cinza, como o "Usuário do Instagram"; o mesmo enquanto o nome está suspenso. Trocar o nome da conta troca o nome nas avaliações.
- **Nome da academia ("já alterado"):** quando você troca o nome de uma academia no ar, quem a administra recebe "O GuiaTennis alterou o nome da …", com o nome de antes e o novo, como o "o Google atualizou o seu perfil".
- **Banco:** SQL `20261027120000_nome_suspenso` (abaixo). Termos (seções 2, 5 e 9) e Privacidade em 27 de outubro de 2026; o chat entende "meu nome foi suspenso".

### 72. Pedidos de 27/10: a busca por bairro e cidade, a confirmação no fim e o sobrenome separado
"Não funcionou colocando bairro e cidade" (o print: "Vila Suzana, São Paulo" mostrava "A partir de Hortolândia, Jundiaí"). "Deixe isso no final, era só os contatos mais para cima" (o "Confirmada pela academia · atualizada há 5 dias"). "Deixe a separação do sobrenome igual no parceiros e obrigatório."
- **Busca "bairro, cidade"**, como o Google Maps e o Booking: o último pedaço é a cidade ("São Paulo, SP" e "São Paulo - SP" também valem). Dos resultados do mapa, só valem os dessa cidade (o estado não conta, porque "São Paulo" é também o estado), com o bairro digitado primeiro; sem nenhum, a busca procura o bairro dentro dos limites da cidade. O mapa devolvia primeiro uma Vila Suzana de Jundiaí, e a busca ficava com ela. Sem vírgula, tudo segue como antes.
- **"Confirmada pela academia" de volta ao fim da ficha**, antes do "É o responsável por esta academia?"; o Contato, logo depois das opções, fica só com os botões (WhatsApp, site, Instagram, compartilhar).
- **Nome e sobrenome em dois campos**, os dois obrigatórios (com *), lado a lado, como no Parceiros: em criar conta, em Minha conta e no "Faça seu cadastro". Sem o sobrenome no campo dele, "Preencha o sobrenome." ("da" ou "de" sozinhos não contam).
- Termos e Privacidade não mudam. Sem mudança no banco.

### 73. Pedido de 28/10: a avaliação feita uma vez e editável, com "editada", e a resposta da academia do mesmo jeito
"Avaliações em academias podem ser feitas uma vez e podem ser editadas. E aparecer que foi editada. O mesmo pode ser feito com as academias."
- **Uma vez, editável**, como o Google Maps: cada conta continua avaliando uma vez cada academia. Quem já avaliou vê, no lugar do formulário, a caixa "Sua avaliação" (a nota, o texto, a data e "Editar avaliação"); o próprio cartão vem primeiro na lista, com "Sua avaliação · Editar" e sem "Denunciar". Editando, as estrelas e o texto voltam preenchidos, o aceite ("Minha avaliação é verídica e segue os Termos de Uso.") é marcado de novo, e "Salvar alterações" ou "Cancelar". Salvar sem mudar nada não conta como edição. O que está sendo editado não se perde se a página recarregar.
- **"editada"**, como o "Editado" do Instagram: a avaliação editada mostra "· editada" depois da data, que continua a de quando foi feita (na ficha, no painel do Parceiros e no seu painel). A resposta da academia, uma por avaliação, segue a mesma regra: "Editar resposta", e "editada" só quando o texto muda.
- **Quem não edita:** com o nome suspenso, a conta não avalia nem edita; quem passou a administrar a academia não edita a avaliação dela; a academia não mexe na avaliação.
- **E-mail à academia:** "<academia>: uma avaliação foi editada (N de 5)", com a nota nova, a de antes (se mudou) e o texto; se a academia já respondeu, lembra que a resposta continua embaixo. No máximo um por avaliação por dia.
- **Banco:** SQL `20261028120000_avaliacao_editada` (abaixo). Termos (a conta do jogador e as respostas da academia) e Privacidade (avaliações) em 28 de outubro de 2026; "Como funcionam as avaliações" e o chat ("Editar a minha avaliação").

## SQL

Os arquivos entram sozinhos no banco de teste com este PR e no de verdade com o merge. Podem rodar de novo sem estragar nada.

- `20260930120000_acesso_academias.sql`
- `20260930130000_links_amigaveis.sql`
- `20260930140000_numeros_da_academia.sql`
- `20260930150000_parceiros_no_sitemap.sql`
- `20260930160000_contas_parceiros.sql`
- `20261001120000_cadastro_e_verificacao.sql`
- `20261001130000_tempo_ate_agir.sql`
- `20261002120000_o_que_cada_plano_libera.sql`
- `20261002130000_conta_do_jogador.sql`
- `20261002140000_conta_pelo_email.sql`
- `20261002150000_confirmar_email.sql`
- `20261003120000_varias_academias.sql`
- `20261003130000_pedidos_de_plano.sql`
- `20261003140000_pedido_ao_responsavel.sql`
- `20261004120000_login_pelo_email.sql`
- `20261004130000_aviso_de_viagem.sql`
- `20261004140000_viagem_sem_data.sql`
- `20261005120000_varios_pedidos.sql`
- `20261005130000_academia_pausa.sql`
- `20261005140000_percurso_das_visitas.sql`
- `20261005150000_buscas_salvas.sql`
- `20261005160000_avisos_por_email.sql`
- `20261005170000_parceiro_tambem_joga.sql`
- `20261005180000_visitante_le_a_pausa.sql`
- `20261006120000_painel_do_admin.sql`
- `20261006130000_declaracao_ao_pedir.sql`
- `20261006140000_academia_nova_no_ar.sql`
- `20261006150000_excluir_conta.sql`
- `20261006160000_jogador_vira_parceiro.sql`
- `20261007120000_ficha_atualizada_em.sql`
- `20261007130000_codigo_so_em_disputa.sql`
- `20261007140000_codigo_pelo_whatsapp.sql`
- `20261007150000_logo_nos_emails.sql`
- `20261007160000_acessos_em_todo_plano.sql`
- `20261008120000_icone_do_email.sql`
- `20261008130000_guardados_na_conta.sql`
- `20261008140000_promocoes.sql`
- `20261008150000_pedido_para_sair_do_guia.sql`
- `20261009120000_conversas_do_chat.sql`
- `20261009130000_lembrete_de_conferir_a_ficha.sql`
- `20261009140000_lembrete_de_volta.sql`
- `20261009150000_resumo_do_mes.sql`
- `20261011120000_falhas_do_site.sql`
- `20261013120000_avisos_para_toda_a_equipe.sql`
- `20261013130000_cargo_no_aviso_de_pessoa_nova.sql`
- `20261013140000_acessos_nos_emails.sql`
- `20261014120000_premium_nas_recomendadas.sql`
- `20261014130000_ultima_busca_na_conta.sql`
- `20261014140000_adicional_de_promocoes.sql` (desfeito pelo seguinte)
- `20261015120000_envios_de_aviso.sql`
- `20261015130000_chat_e_recomendadas.sql`
- `20261015140000_avisos_com_tipo.sql`
- `20261015150000_whatsapp_nos_avisos.sql`
- `20261016120000_promocoes_na_ficha_e_por_email.sql`
- `20261016130000_uma_promocao_por_vez.sql`
- `20261019120000_leilao_das_notificacoes.sql`
- `20261019130000_plano_e_creditos_pelo_site.sql`
- `20261020120000_pagamento_de_teste.sql`
- `20261020130000_conta_sai_academia_fica.sql`
- `20261020140000_academia_do_jogador_no_ar.sql` (desfeito pelo seguinte)
- `20261020150000_academia_nova_so_pelo_parceiros.sql`
- `20261020160000_guia_com_g_maiusculo.sql`
- `20261020170000_academia_que_fechou.sql`
- `20261022120000_promocao_paga_e_leilao_premium.sql` (o preço da semana em `leilao_config`, `semanas` e `pago` nas promoções, `salvar_promocao` com as semanas e a cobrança nos créditos, `apagar_promocao` que devolve, o leilão só do Premium e `mudar_preco_da_promocao` para o admin)
- `20261023120000_excluir_conta_nos_dois_lados.sql` (a exclusão de jogador com acesso ao Parceiros exclui o login inteiro)
- `20261026120000_veracidade.sql` (o WhatsApp da ficha por código e a troca conferida, `codigos_do_whatsapp`; os problemas informados, `problemas_na_ficha`, e as denúncias, `denuncias_de_avaliacao`; avaliar com o e-mail confirmado; `avisou_que_fechou_em` e `whatsapp_situacao` na ficha)
- `20261026180000_so_o_que_esta_certo.sql` (sai a `whatsapp_situacao`; o primeiro número também espera o admin depois do código; a academia que avisou que fechou fica pausada, com a pausa de antes em `pedidos_para_sair.pausa_antes`, e volta como estava se continuar aberta; `fichas_paradas_admin`, `lembrar_ficha_admin` e `ficha_conferida_admin`, com `lembretes_de_ficha.conferida_em`)
- `20261026200000_academia_fechada_fica_guardada.sql` (o status `fechada`, com `fechada_em`, `reaberta_em` e os e-mails de quem administrava; "Fechou" guarda em vez de apagar; `pedidos_de_reabertura` e as funções de reabrir, da conta e do admin; `avisos_do_admin`; `pedir_analise_da_avaliacao`, com `da_academia` e `detalhes` nas denúncias)
- `20261026220000_catalogo.sql` (a coluna `catalogo` em `academias`: as opções de aula e locação, avulsas ou mensais, que o visitante lê)
- `20261027120000_nome_suspenso.sql` (`autor_oculto` nas avaliações e o gatilho que tira o nome e o e-mail quando a conta sai; `nomes_suspensos`, as funções de suspender, cancelar e conferir, `meu_nome_suspenso`, o nome que segue o da conta, a conta suspensa que não avalia, o relógio de hora em hora com o lembrete e a exclusão no fim do prazo, e o e-mail do nome da academia trocado pelo admin)
- `20261028120000_avaliacao_editada.sql` (`editada_em` nas avaliações e nas respostas; `minhas_avaliacoes` e `editar_minha_avaliacao`, com as regras de quem avalia; o e-mail à academia quando uma avaliação é editada; a resposta marcada como editada só quando o texto muda, e as que o site já mostrava como editadas continuam assim)

## Para o Breno ligar

- **Mercado Pago** (seção 31): no Netlify (Project configuration › Environment variables, "Contains secret values"), em **Deploy Previews** `MERCADOPAGO_ACCESS_TOKEN` (credencial de teste, TEST-…), `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` do banco de teste; em **Production**, a credencial de produção e o endereço e a chave do banco de verdade. Depois, publicar de novo. Sem elas, a prévia usa o pagamento de teste e o site de verdade oferece o WhatsApp.

## Testes

- `testes/check-js.sh` ok. Bateria completa de 21/10, depois das seções 33 a 43: **1.593 verificações** nos 57 arquivos do navegador (novos: `ficha-topo-e-sobre.js`, `estacionamento.js`, `melhores-avaliadas.js` e `comparacao-tudo.js`), mais `onde.mjs` e `pagamento.mjs`, nenhuma falha. Depois do aviso numa linha, do "Escolher" como era e do "no GuiaTennis" (seção 44), os arquivos afetados rodaram de novo sem falha: `comparacao-tudo.js`, `ficha-topo-e-sobre.js`, `comparar-e-avisos.js`, `parceiros.js`, `falhas.js`, `ficha-basica.js`, `busca-e-ficha.js`, `cadastro.js`, `confianca-na-ficha.js`, `publico.js`, `entendimento.js`, `buscas-e-avisos.js`, `menu-e-home.js`, `premium-patrocinado.js`, `perfil-e-avaliar.js` e `links.js`.
- Bateria completa de novo depois das seções 45 e 46 (22/10): **1.612 verificações** nos 58 arquivos do navegador, mais `onde.mjs` e `pagamento.mjs`, nenhuma falha. Novo: `cadastro-sair-e-revisao.js` (o X que pergunta, a escolha de aula e locação separada e a frase do começo do cadastro); atualizados para a seção 45: `plano-na-ficha.js`, `plano-ao-finalizar.js`, `previa-da-ficha.js`, `fotos-ponto-e-aviso.js` (arrastar com mouse e com toque), `acesso-academia.js`, `rascunho.js` e `voltar.js`; para a seção 46, `codigo-pelo-whatsapp.js` e `parceiros.js` (que ainda conferia a frase "Os seus dados de contato já vão junto").
- Seção 47: `codigo.js`, `jogador.js` e `senha.js` atualizados para os dois passos; com `acesso-academia.js`, `perfil-e-avaliar.js`, `rascunho.js` e `voltar.js`, rodaram de novo sem falha.
- Seção 48: `dicas-do-parceiros.js` (novo: a parte que falta e o atalho, uma por dia, o plano de cima, a promoção e o e-mail no Premium, e a espera atrás de outro aviso).
- Bateria completa depois da seção 48 (22/10): **1.632 verificações** nos 59 arquivos do navegador, mais `onde.mjs` e `pagamento.mjs`, nenhuma falha.
- Seção 49: `promocoes-por-email.js` reescrito para as cinco etapas, o lance máximo, o andamento, "Alterar o lance" e "Sair do leilão"; `plano-ao-finalizar.js` (a tela de pronto com o plano certo), `previa-da-ficha.js`, `dicas-do-parceiros.js`, `promocoes.js` e `ficha-basica.js` (a data dos Termos) atualizados.
- Bateria completa depois da seção 49 (22/10): **1.645 verificações** nos 59 arquivos do navegador, mais `onde.mjs` e `pagamento.mjs`, nenhuma falha. Depois de tirar a barra das etapas do leilão, `promocoes-por-email.js` rodou de novo sem falha; com as dicas de plano também para a conta antiga de ficha incompleta, `dicas-do-parceiros.js` (com a checagem nova) e `parceiros.js` também.
- Seção 50: `promocoes-por-email.js` atualizado para o painel (o cabeçalho da campanha, o fundo neutro e o título em Inter, "Etapa N de 5", a estimativa, os contadores, o andamento e a lista dos anteriores).
- Bateria completa depois da seção 50 (22/10): **1.648 verificações** nos 59 arquivos do navegador, mais `onde.mjs` e `pagamento.mjs`, nenhuma falha.
- Seção 51: `aviso-ao-sair.js` (novo: "Rascunho salvo", trocar de aba, voltar pelo navegador e recarregar no leilão; a promoção; a viagem pelo ✕; a avaliação pelo voltar; o perfil, que depois de salvar sai sem perguntar; a edição da ficha pelo voltar; o "Faça seu cadastro" que não perde o nome).
- Seção 52: `plano-e-creditos.js` com a compra de créditos reescrita para a página (sem o menu, o resumo, o "Outro valor" que muda o total, o Pix, o pagamento confirmado, a volta à etapa do lance, a volta do cartão e o WhatsApp sem o Mercado Pago); `promocoes-por-email.js` (o cabeçalho só na primeira e na última etapa) e `pagamento.mjs` (a volta do cartão para `/parceiros/creditos`).
- Bateria completa depois das seções 51 e 52 (22/10): **1.686 verificações** nos 60 arquivos do navegador (novo: `aviso-ao-sair.js`; `voltar.js` passou a conferir que voltar uma parte do cadastro não pergunta), mais `onde.mjs` e `pagamento.mjs`, nenhuma falha.
- Seção 53: `promocoes.js` reescrito (as semanas, a validade, sem custo em R$ 0, o Completo com o preço cheio, o que falta, "Comprar créditos" e a volta à promoção, o valor no botão, somar semanas, encerrar que devolve e o Premium 20% menos); `promocoes-por-email.js` (o leilão no Premium, o Completo trancado e o preço da semana no admin), `plano-e-creditos.js`, `aviso-ao-sair.js` (as semanas no rascunho), `dicas-do-parceiros.js` (a promoção no Completo, um dia cada) e `chat-parceiros.js` atualizados.
- Bateria completa depois da seção 53 (23/10): **1.710 verificações** nos 60 arquivos do navegador, mais `onde.mjs` e `pagamento.mjs`, nenhuma falha (também atualizados: `parceiros.js`, o Premium com a semana mais barata e o leilão; `plano-na-ficha.js`, no Completo a promoção continua e no Básico fica guardada; `sem-explicacao.js`, a linha nova das promoções).
- Depois de tirar os detalhes do leilão fora do Premium (23/10): `promocoes-por-email.js` (o cartão trancado como o do Desempenho, a Ajuda sem o leilão e a página Plano só com o nome) e, sem falha, `promocoes.js`, `parceiros.js`, `dicas-do-parceiros.js`, `chat-parceiros.js`, `plano-e-creditos.js`, `sem-explicacao.js`, `confianca-na-ficha.js`, `plano-da-academia.js`, `sair-do-guia.js`, `plano-na-ficha.js` e `aviso-ao-sair.js`.
- Seção 54: `buscas-e-avisos.js` (a conta do Parceiros no site dos jogadores com "Excluir minha conta", o aviso com a academia, "Cancelar" e a exclusão que passa pelo Parceiros), `sair-do-guia.js` (o mesmo aviso no Parceiros), `jogador.js` (o aviso só de jogador, sem academias) e `ficha-basica.js` (a data dos Termos); com `perfil-e-avaliar.js`, sem falha.
- Seção 55: `convite-chamadas.js` (novo: a primeira chamada sem convite, a segunda com o convite, só na aba, uma vez por aba, "Criar conta" com o motivo e a conta que nasce com as chamadas, o ✕ por 14 dias, a espera da volta do WhatsApp, com conta sem convite, e a Privacidade).
- Bateria completa depois das seções 54 e 55 (23/10): **1.730 verificações** nos 61 arquivos do navegador (novo: `convite-chamadas.js`), mais `onde.mjs` e `pagamento.mjs`, nenhuma falha. Depois do convite na cor dos avisos da conta dos jogadores, `convite-chamadas.js` rodou de novo sem falha.
- Seção 56: `aviso-ao-sair.js` (nenhum "Rascunho salvo" no leilão, na promoção, na viagem, na avaliação, no perfil e no cadastro, com o rascunho guardado) e `promocoes-por-email.js` (as etapas sem ele).
- Bateria completa depois da seção 56 (23/10): **1.730 verificações** nos 61 arquivos do navegador, mais `onde.mjs` e `pagamento.mjs`, nenhuma falha.
- Seção 57: `premium-patrocinado.js` (a do topo de novo no lugar dela, sem "Patrocinado" nem a borda; as duas do topo na ordem da distância; a contagem e o mapa sem a repetida; os pontinhos das fotos de cada cartão; só a Premium na busca, sem repetir).
- Bateria completa depois da seção 57 (23/10): **1.735 verificações** nos 61 arquivos do navegador, mais `onde.mjs` e `pagamento.mjs`, nenhuma falha.
- Seção 58: `contestar-passo-a-passo.js` (novo: o cartão só com o link, a página sem menu, as quatro telas com "Continuar" e "Voltar", ler sem contestar, "Agora não" e o ✕, contestar e voltar com o cartão "Em disputa", o link aberto direto, a disputa já aberta, sem pedido e sem o e-mail confirmado); `codigo-so-em-disputa.js` e `codigo-pelo-whatsapp.js` contestam pela página (`contestar` no `harness.js`).
- Bateria completa depois da seção 58 (23/10): **1.753 verificações** nos 62 arquivos do navegador, mais `onde.mjs` e `pagamento.mjs`, nenhuma falha.
- Seção 59: `contestar-passo-a-passo.js` reescrito (a tela cheia na cor da marca, as barrinhas, nada de "Pular", a seta, a tela do código com o cursor nas caixas, os números colados, "Digitar depois", o cartão "Em disputa" com "Digitar o código", o código certo e o painel; nos jogadores, as 8 caixas e a contagem de um minuto); `codigo-so-em-disputa.js` e `codigo-pelo-whatsapp.js` leem a tela do código.
- Bateria completa depois da seção 59 (23/10): **1.761 verificações** nos 62 arquivos do navegador, mais `onde.mjs` e `pagamento.mjs`, nenhuma falha.
- Seção 60: `contestar-passo-a-passo.js` confere que a apresentação não tem desenho nem animação e que as telas de código não têm desenho.
- Bateria completa depois da seção 60 (23/10): **1.761 verificações** nos 62 arquivos do navegador, mais `onde.mjs` e `pagamento.mjs`, nenhuma falha.
- Seção 61: `contestar-passo-a-passo.js` confere o creme, a marca sem ✕ nem menu, a etapa em dourado, o título em Playfair e o "Continuar" dentro do cartão.
- Bateria completa depois da seção 61 (24/10): **1.762 verificações** nos 62 arquivos do navegador, mais `onde.mjs` e `pagamento.mjs`, nenhuma falha.
- Seção 62: `veracidade.js` (novo: o WhatsApp novo esperando o código, a página do código sem desenho, a troca em conferência e "Cancelar a troca", o número que entra na hora, o envio sozinho com o WhatsApp ligado; a ficha sem o botão diz por quê; o aviso de que fechou e a ficha com mais de um ano; "Informar um problema" com o código do e-mail no meio e os dois avisos que tiram o botão; avaliar com o e-mail confirmado; "Denunciar"; o cartão em Atualizações e salvar resolve; o admin com Pendências, "Gerar código", "Aprovar a troca", "Conferir" com Google Maps, mapa aberto e Receita, problemas e denúncias; banco sem o SQL) e `cnpj.mjs` (novo: o CNPJ, a BrasilAPI, a Minha Receita de reserva, fora do ar, inexistente e inválido). Atualizados: `seguranca.js` e `buscas-e-avisos.js` (confirmam o e-mail antes de avaliar), `ficha-basica.js` (a data dos Termos) e `parceiros.js` (as duas perguntas novas da Ajuda).
- Bateria completa depois da seção 62 (26/10): **1.844 verificações** nos 63 arquivos do navegador, mais `onde.mjs`, `pagamento.mjs` e `cnpj.mjs`, nenhuma falha (antes da seção 62, a mesma contagem dava 1.786).
- Seção 63: `so-o-que-esta-certo.js` (novo: avisar que fechou pausa a ficha e guarda a pausa de antes, "Fora do site" sem "Pausar no site", o banco recusa voltar, Minha ficha, cancelar devolve; no admin, "Continua aberta" devolve a pausa de antes; as fichas paradas na ordem, a ficha básica sem responsável, "Lembrar agora" e um por dia, "Conferi: está certo" sem mudar a data, "Conferir", o filtro em Academias e Para fazer agora; banco sem o SQL); `veracidade.js` (o primeiro número também espera o admin, a ficha não diz que há número esperando nem que está em revisão, o jogador não vê a academia que avisou que fechou e o admin vê "Fora do site"); `sair-do-guia.js` (os textos novos do aviso).
- Bateria completa depois da seção 63 (26/10): **1.864 verificações** nos 64 arquivos do navegador, mais `onde.mjs`, `pagamento.mjs` e `cnpj.mjs`, nenhuma falha.
- `testes/banco-emails.py` depois da seção 63: **562 conferências** num Postgres local, nenhuma falha (a seção 36 atualizada: o visitante não sabe que há número esperando, e o primeiro número também espera o admin; a seção 37: o aviso de que fechou tira a ficha do site e guarda a pausa de antes, a academia não volta sozinha, "Continua aberta" e cancelar devolvem a pausa de antes, "Fechou" apaga; as fichas paradas para o admin, a ordem, quem recebe, "Lembrar agora", um por dia, sem ninguém para receber, "Conferi: está certo" sem mudar a data e a academia que salva sai da lista). Todas as migrações também entram num banco novo, do zero.
- Seção 64: `fechada-guardada.js` (novo: o WhatsApp para a academia na dica, na prévia, na tela de pronto, no cartão e na própria ficha, e o jogador sem ver; o mesmo e-mail reabre com a declaração; outro e-mail acha "Fechada permanentemente · cadastro inativo" e pede; o número de Pendências e o sino, "Fechou" que guarda, o filtro Fechadas, a Visão geral, Avisos e "Reabriu: voltar ao Guia"; "Pedir análise" pelo site e no painel; banco sem o SQL). Atualizados: `veracidade.js` (a dica nova), `parceiros.js` (21 perguntas na Ajuda), `painel-admin.js` (14 seções no menu) e `acesso-academia.js` (o "Pedir análise" pelo site).
- Bateria completa depois da seção 64 (26/10): **1.892 verificações** nos 65 arquivos do navegador, mais `onde.mjs`, `pagamento.mjs` e `cnpj.mjs`, nenhuma falha.
- `testes/banco-emails.py` depois da seção 64: **596 conferências** num Postgres local, nenhuma falha (a seção 38: "Fechou" guarda o cadastro, no Básico, com o e-mail de quem administrava e as avaliações, fora do site; o mesmo e-mail reabre na hora e volta a administrar, para o admin revisar; outro e-mail pede e o admin aprova; o admin reabre direto; "Administrar esta academia" não pega a fechada; os avisos do admin; o "Pedir análise" da academia). Todas as 71 migrações também entram num banco novo, do zero.
- Seção 65: `ficha-hoteis.js` (novo: a capa quadrada no celular com todas as fotos, os pontinhos, o número de fotos e os botões brancos, a barra de cima que só desce depois da capa; o topo no meio com os atalhos e os ✓; a ordem das seções e nada faltando; os destaques, a estrutura em duas colunas, o mapa com o botão de abrir e o mosaico do "Sobre"; as caixas, os cartões das opções lado a lado com "Menor preço", a reposição e o WhatsApp de cada um, e os filtros; as avaliações em cartões, o "Mostrar mais", a rolagem de lado que fica e "Ver todas"; a barra de baixo; o ← da capa; o computador com o mosaico e as abas; a ficha sem foto). Atualizados: `links.js` (as abas só no computador) e `previa-da-ficha.js` (a ordem nova).
- Bateria completa depois da seção 65 (26/10): **1.924 verificações** nos 66 arquivos do navegador, mais `onde.mjs`, `pagamento.mjs` e `cnpj.mjs`, nenhuma falha.
- Seção 66: `ficha-hoteis.js` (a barra sem o nome e quase transparente, com o desfoque) e `viagem.js` (as frases com espaço e o aviso alinhado ao texto da caixinha).
- Bateria completa depois da seção 66 (26/10): **1.927 verificações** nos 66 arquivos do navegador, mais `onde.mjs`, `pagamento.mjs` e `cnpj.mjs`, nenhuma falha.
- Seção 67: `senha.js` (6 caixas no código do e-mail, "Confirmar" travado com 5 números, nem o Enter confirma, libera com 6) e `contestar-passo-a-passo.js` (as 6 caixas no e-mail dos jogadores; o "Confirmar" da disputa trava, libera com 6 e trava de novo ao apagar).
- Bateria completa depois da seção 67 (26/10): **1.933 verificações** nos 66 arquivos do navegador, mais `onde.mjs`, `pagamento.mjs` e `cnpj.mjs`, nenhuma falha.
- Seção 68: `catalogo.js` (novo: a tabela de preços no cadastro — modalidades conforme o que a academia marcou, Avulsa e Mensal, só modalidade e valor, o cursor no valor ao marcar, valor só com números, desmarcar tira, o preço antigo marcado e a "Aula" sem tipo com a dica —, o que vai para o banco (só tipo, cobrança e valor, sem repetir) e o preço avulso da aula e da locação; a foto de cada opção no Premium — enviada, diminuída, salva e mostrada no cartão — e, no Completo, a foto guardada com "Aparece no Premium", o cartão com a foto da academia e o aviso do que o plano esconde; na ficha, os cartões, os filtros por tipo e por cobrança, o WhatsApp de cada opção, a barra de baixo, o "Sobre", as perguntas e o Google; no computador, "A partir de" e "Ver as 4 opções"; a busca, a comparação, a ficha sem catálogo, o preço antigo na edição e o banco sem a coluna); `ficha-hoteis.js` (o contato depois das opções e o fim), `premium-patrocinado.js` (o selo e a linha sem o plano), `previa-da-ficha.js` (o preço pelo catálogo), `parceiros.js` (o Premium com 9 itens na tabela de planos) e `ficha-basica.js` (a data dos Termos).
- Bateria completa depois da seção 68 (27/10): **1.978 verificações** nos 67 arquivos do navegador, mais `onde.mjs`, `pagamento.mjs` e `cnpj.mjs`, nenhuma falha.
- Seção 69: `regras-de-conteudo.js` (novo: os Termos com os nomes e a troca, a seção 6 com a lei e o "não são tolerados", a seção 9, a Privacidade com o registro e o Marco Civil, as datas, o aceite da avaliação, "Como funcionam as avaliações", o motivo da denúncia e o chat entendendo racismo, homofobia, xenofobia e nome ofensivo) e `ficha-basica.js` (a data da Privacidade).
- Bateria completa depois da seção 69 (27/10): **1.990 verificações** nos 68 arquivos do navegador, mais `onde.mjs`, `pagamento.mjs` e `cnpj.mjs`, nenhuma falha.
- Seção 70: `enquadramento.js` (novo: duas fotos escolhidas abrem uma de cada vez, o quadro 4:3, o quadrado da capa, arrastar e aproximar, "Próxima", o recorte 4:3 do lado arrastado, "Usar como está" com a foto inteira, "Ajustar" numa foto já no cadastro e a foto de uma opção do catálogo) e `ficha-hoteis.js` (nenhuma foto no "Sobre", sem a caixa de horário, os cartões das opções com foto).
- Bateria completa depois da seção 70 (27/10): **2.004 verificações** nos 69 arquivos do navegador, mais `onde.mjs`, `pagamento.mjs` e `cnpj.mjs`, nenhuma falha.
- Seção 71: `nome-suspenso.js` (novo: "Usuário do GuiaTennis" na ficha e o avatar cinza; a tela da suspensão com o prazo, o motivo, "Trocar o nome" e "Agora não", que não volta na mesma aba; a conta suspensa não avalia; Minha conta com o aviso, trocar o nome acaba a suspensão e devolve o nome à avaliação; o Parceiros com o Perfil; no painel, suspender pela avaliação, sem motivo não suspende, Pendências, cancelar, o nome trocado em "Para fazer agora", "Está certo" e o botão nas Contas de jogador; os Termos e a Privacidade), `enquadramento.js` reescrito (✕, "Cortar" e "Concluir", a largura, as miniaturas numeradas, a grade ao arrastar, a lupa, a troca de foto que guarda o ajuste, a foto inteira que não é cortada, "Descartar as edições?", "Ajustar" e a foto do catálogo) e `regras-de-conteudo.js` (o aceite curto, os textos novos e o chat).
- Seção 72: `busca-bairro-cidade.js` (novo: "Vila Suzana, São Paulo" fica em São Paulo e não na de Jundiaí, com ", SP" e " - SP", "Vila Suzana, Jundiaí" em Jundiaí, a busca do bairro dentro dos limites da cidade quando o mapa não devolve nenhum dela, e sem vírgula como antes), `ficha-hoteis.js` e `codigo-so-em-disputa.js` (o Contato só com os botões e a confirmação no fim), `jogador.js` (os dois campos, o sobrenome obrigatório no campo dele e o "Faça seu cadastro") e os testes que preenchem o nome (`aviso-ao-sair.js`, `convite-chamadas.js`, `nome-suspenso.js`, `parceiros.js`, `rascunho.js`, `senha.js`, `viagem.js` e `volta-e-resumo.js`).
- Bateria completa depois das seções 71 e 72 (28/10): **2.054 verificações** nos 71 arquivos do navegador, mais `onde.mjs`, `pagamento.mjs` e `cnpj.mjs`, nenhuma falha.
- Seção 73: `ficha-basica.js` e `regras-de-conteudo.js` (a data de 28/10 nos dois textos legais) e `avaliacao-editada.js` (novo: "Sua avaliação" com a nota, o texto e "Editar avaliação" no lugar do formulário; o próprio cartão primeiro, com "Editar" e sem "Denunciar"; "editada" no cartão de quem editou; a edição com as estrelas e o texto preenchidos, o aceite de novo, sair sem mexer que não pergunta e com a nota mudada que pergunta; salvar muda o banco com a data da edição e mantém a data da avaliação; "Avaliação editada."; a nota da academia acompanha; salvar sem mudar nada e "Cancelar"; o rascunho que volta ao recarregar; o nome suspenso que não edita; a avaliação nova com "Obrigado por avaliar!" e "Editar"; o banco antes do SQL; os Termos, a Privacidade e "Como funcionam as avaliações"; o chat; e a resposta da academia, uma por avaliação, que mostra "editada" só quando o texto muda).
- Bateria completa depois da seção 73 (28/10): **2.088 verificações** nos 72 arquivos do navegador, mais `onde.mjs`, `pagamento.mjs` e `cnpj.mjs`, nenhuma falha.
- `testes/banco-emails.py` depois da seção 73: **679 conferências** num Postgres local, nenhuma falha (a seção 40: as avaliações da conta, o visitante lê `editada_em`, outra conta e o visitante não editam, mudar a linha direto não passa, salvar sem mudar nada não marca nem manda e-mail, as estrelas e o tamanho do texto, editar muda a nota e o texto e marca "editada" sem mudar a data, a conta e o nome, o e-mail a quem administra com o texto escapado, um por dia, trocar o nome da conta não marca; a resposta: uma por avaliação, o mesmo texto não marca, mudar marca, a academia não apaga a marca, o e-mail lembra que a resposta continua; o nome suspenso e quem passou a administrar não editam; as respostas antigas editadas continuam editadas). A migração roda de novo sem erro.
- `testes/banco-emails.py` depois da seção 71: **647 conferências** num Postgres local, nenhuma falha (a seção 39: suspender só o admin e com motivo, pela avaliação, o nome que sai na hora também para o visitante, o e-mail com o motivo, o prazo e o link, a conta que vê a suspensão, não suspende duas vezes, não avalia, o mesmo nome com outras maiúsculas continua suspenso, trocar acaba a suspensão e devolve o nome, a confirmação, o admin confere, o nome que segue o da conta, cancelar, o nome do Parceiros, a troca num lado que vale nos dois, o lembrete a 3 dias uma vez só, a exclusão no fim do prazo com a avaliação sem nome e sem e-mail, os avisos, Contas excluídas e o e-mail bloqueado; quem exclui a própria conta e a conta apagada no Supabase também deixam a avaliação oculta; as avaliações antigas de contas excluídas; o e-mail do nome da academia trocado pelo admin, só para quem confirmou o e-mail; as seções 14 e 26 dizem agora "Usuário do GuiaTennis"). A migração roda de novo sem erro.
- `testes/banco-emails.py`: **537 conferências** num Postgres local, nenhuma falha (com a seção 36: o WhatsApp novo fora da ficha até o código, o visitante só lê a situação, o código errado e o certo, a troca que espera o admin, aprovar, recusar, cancelar, tirar, o admin direto, o envio sozinho para o número de teste, "Mandar outro código"; informar um problema e quem pode, a academia vê sem saber quem, salvar resolve, dois avisos tiram o botão sem mudar a data, manter e tirar; avaliar sem o e-mail confirmado é recusado; denunciar, manter e remover; o aviso de que fechou na ficha). Antes: **467 conferências** (com a seção 53: promoção por semanas, a cobrança nos créditos, somar semanas, encerrar que devolve, o Premium 20% menos, o preço do admin e o leilão só do Premium, sem desconto; com a seção 54: excluir pelo site dos jogadores exclui também o Parceiros, e a academia e o plano ficam). As seções 33 a 52 não mexem no banco.
- `testes/banco-acesso.py`: as 11 falhas antigas continuam (o teste ainda espera números no Básico e no Completo e avaliação sem conta).

## Para testar na prévia (banco de teste)

1. Sair e entrar com o e-mail do admin: o site vai para o painel (`/admin`). Numa aba anônima, `/admin` mostra só a página inicial.
2. Com uma conta do Parceiros de e-mail confirmado, pedir uma academia do guia que não tem responsável: ela passa a ser da conta na hora, e aparece no painel do admin em Pendências como "assumida".
3. Com outra conta, pedir a mesma academia: o pedido vai para o responsável. Tocar em "Contestar": vira disputa e aparece no painel do admin, com o WhatsApp para mandar o código.
4. Cadastrar uma academia nova com o e-mail confirmado: vai ao ar na hora.
5. Abrir uma ficha confirmada: o selo verde ao lado do nome. Tocar no selo leva ao fim da ficha, com "Confirmada pela academia · atualizada…".
6. Com uma conta de jogador, abrir o Parceiros: "Use a sua conta do GuiaTennis no Parceiros".
7. Com o segredo `RESEND_API_KEY` no GitHub, avaliar uma academia que tem conta e ver o e-mail chegar.
8. No painel, colocar uma academia confirmada no Premium e buscar um bairro perto dela: "Patrocinado" no topo, selo dourado, "Mais perto de você" embaixo.
9. Com essa academia, Parceiros › Promoções › publicar: o atalho e o bloco na ficha, a linha no cartão da busca.
10. No Parceiros, Suas academias › "A academia fechou as portas?"; no painel, Pendências › "Academias que fecharam".
11. Abrir o chat de ajuda pela Ajuda do Parceiros e por "Fale com a gente"; escrever dúvidas do jeito que as pessoas escrevem.
12. Com a conta no Parceiros, falar no chat, tocar em "Nova conversa" e em "Conversas" (abrir e apagar); entrar em outro aparelho e ver as mesmas conversas.
13. Em Entrar do Parceiros, digitar um e-mail que já tem conta: o cartão do e-mail com "Trocar" e o aviso à parte.
14. Em Minha ficha (no Básico), editar: "Continuar" à direita; no fim, a prévia da ficha com "Editar" e "Confirmar e salvar".
15. No painel, baixar uma academia do Premium (ler a pergunta) e, em Contas excluídas, excluir uma conta de teste e liberar o e-mail.
16. "Esqueci a senha" com uma conta de teste: o e-mail do código chega com a logo e o assunto "Seu código do GuiaTennis".
17. Lembrete da ficha: no SQL Editor do `guiatennis-teste`, `set session_replication_role = replica; update academias set dados_atualizados_em = now() - interval '100 days' where name = '<academia de teste com conta>'; set session_replication_role = origin; select preparar_lembretes_de_ficha();` — o e-mail "Confira a ficha" chega em até 1 minuto, e "Conferir a ficha" abre a ficha certa no Parceiros.
18. Lembrete de volta e resumo do mês: em Minha conta, o "Lembrete se eu ficar 3 meses sem entrar" ligado. No SQL Editor: `update jogadores set visto_em = null, created_at = now() - interval '120 days' where email = '<conta de teste>'; update auth.users set last_sign_in_at = now() - interval '120 days' where email = '<conta de teste>'; select preparar_lembretes_de_volta();` e `select preparar_resumos_do_mes('2026-11-02');` (o resumo de outubro para as academias com conta).
19. Cadastro no celular: as fotos grandes, com a capa e "Usar como capa"; concluir sem o obrigatório para ver o "Falta preencher" com a legenda do *; em Nome e endereço, "Ver no mapa", arrastar o alfinete até a entrada, salvar e conferir o ponto na ficha; com mais de 3 comodidades no Básico, escolher as 3 que aparecem (na tela depois de confirmar).
20. Criar conta de jogador: a linha pequena dos lembretes embaixo do botão; tocar em "Criar conta" sem marcar o aceite ("Aceite os Termos de Uso e a Política de Privacidade.") e marcar a caixa: o aviso some na hora.
21. `/parceiros`: a faixa verde dos números com o título e o texto antes, e "Cadastrar minha academia grátis" depois.
22. Falhas: no celular, com o site aberto, desligar o Wi-Fi e os dados e tocar em "Entrar ou criar conta › Continuar": o aviso "Sem conexão…" e, embaixo, "Se continuar, fale com a gente · código"; "fale com a gente" abre o chat com o problema e o código.
23. Ligar a internet de novo, entrar como admin e abrir o painel › **Falhas do site**: a falha aparece (as de conexão não mandam e-mail); procurar pelo código; "Ver o caminho da visita até a falha"; "Marcar como resolvida". O que não carregou enquanto estava sem internet vira um cartão só, "Carregar partes da página · O aparelho estava sem internet.", depois das falhas do site.
24. No chat de ajuda, escrever "deu erro": a resposta com o que costuma resolver, "Recarregar a página" e o WhatsApp.
25. "Sair da conta": no menu do site (com conta de jogador, do Parceiros e como admin), no menu e no Perfil do Parceiros e no topo do painel do admin — nenhum "Sair" sozinho.
26. Menos explicação: Entrar/Criar conta sem o parágrafo embaixo do e-mail; o coração e a viagem sem conta pedem só para entrar; no Parceiros, os "Saiba mais" de Promoções, Desempenho e Avaliações abrem a pergunta certa da Ajuda.
27. Painel › Academias: abrir uma academia com conta, ver em "Quem administra" o e-mail e o WhatsApp de cada pessoa e tocar neles.
28. Na mesma academia (com o e-mail confirmado), subir o plano e, depois de 1 minuto, baixar: os dois e-mails "Plano novo" chegam ("[Teste]" no assunto), com o que muda.
29. Com outra conta, pedir acesso à mesma academia: o responsável recebe "Ver o pedido" e a equipe também fica sabendo; aceito o pedido, quem já estava na equipe recebe "… agora administra a … com você".
30. No celular: "Entrar ou criar conta" é uma tela igual à do Parceiros (e-mail no cartão com "Trocar" e o quadro "Você já tem conta"); Preferências e o cadastro da ficha ocupam a tela toda, sem o site atrás, e a página de trás não rola. `/parceiros/cadastro`: só a marca e o ✕.
31. No meio do cadastro da ficha (com uma foto), puxar a tela para baixo para recarregar: volta na mesma parte, com tudo. O mesmo no criar conta e nos dados de contato do Parceiros.
32. Parceiros › Acessos (menu e título); os e-mails "Acesso novo na academia".
33. Logado, na busca: o balão "Tem viagem marcada?" no alto, sem o "Ver no mapa" em cima.
34. Editar uma academia até "Revisar": a ficha aparece como na página da academia, com um lápis em cada parte (tocar leva à parte), "+ Adicionar…" no que está vazio.
35. Em Minha ficha, numa parte do meio, tocar em "Revisar e salvar": abre a prévia, sem salvar; só "Confirmar e salvar" salva.
36. Home dos jogadores: as academias primeiro (recomendadas, com "Patrocinado" na Premium; por cidade; melhores avaliadas), depois as dicas e o bloco verde; "Indicar para quem joga" abre o compartilhar.
37. Numa aba anônima, sem buscar: "Perto de você, em <cidade da conexão>" no alto da home.
38. Chat de ajuda: "quadras de saindo em Moema" responde "Entendi: quadras de saibro." com o botão da busca filtrada; "não deu" segue no assunto; com a conta, "Suas conversas" e "Marcar resolvida".
39. Chat do Parceiros: "onde fica minha ficha", "como coloco fotos" e "por onde começo".
40. Cadastro do Parceiros com e-mail novo: o código sai sozinho e "Confirme o seu e-mail" vem antes da busca da academia; tocar de novo na academia marcada desmarca.
41. Parceiros › Plano (no Básico): o título do plano, "O que pode melhorar" e os cartões que deslizam no celular; no menu do celular, o nome da academia abre o seletor.
42. Promoções › Na ficha (Premium): publicar uma e ver que a segunda não entra; "Mandar por e-mail" abre o Leilão na etapa da promoção, com o texto pronto.
43. Promoções › Leilão: o resumo do leilão do bairro; entrar passo a passo, alterar e sair (passo 73); no painel do admin › Leilões, o lance da semana.
44. Pagamento de teste: Plano › "Mudar para o Completo" › Mensal › Pix › "Simular Pix pago": o plano muda e chega o e-mail; Promoções › Na ficha › "Comprar" (créditos) › R$ 100 › cartão com APRO (aprova) e com OTHE (recusa).
45. Parceiros › Perfil › "Excluir minha conta" numa academia com outro acesso: o outro vira o responsável e recebe o e-mail; sem outro acesso, a academia volta ao Básico.
46. Painel › Pendências › "Academias que fecharam": "Continua aberta" e "Fechou: tirar do Guia"; na ficha, no modo admin, "A academia fechou: tirar do Guia".
47. `/parceiros`: "Entenda como funciona" abre o balão colado no link (✕, tocar fora ou Esc fecham); "Pronto para aparecer para quem procura?" acima das perguntas.
48. Criar conta escrevendo só o primeiro nome: "Preencha o sobrenome."; o mesmo em Minha conta, em "Faça seu cadastro" e no Sobrenome do Parceiros. Com "Nome Sobrenome", passa.
49. Criar conta (e o cadastro do Parceiros): antes de digitar, a lista do que a senha precisa ter, com a dica; digitar "12345678" deixa "Nada fácil de adivinhar" vermelho; uma senha boa com a repetição igual deixa os três verdes, e "Criar conta" passa.
50. Numa ficha com mais de 4 comodidades: o "Sobre" diz "… e outras N."; avaliar a academia com 5 estrelas escrevendo "professores ótimos" e ver "Quem avaliou elogia os professores" no "Sobre".
51. Na ficha, "Como funcionam as avaliações": abre o balão colado no link; o ✕, tocar fora e Esc fecham.
52. Numa ficha com cancelamento (Completo ou Premium), separado para aula e locação: um cartão para cada, com "Desmarcou até …h antes" e "Com menos de …h".
53. No celular, abrir uma ficha: sem o "Início › …" no alto; no topo, a seta, o nome e os ícones de comparar, compartilhar e favoritar, todos à vista; tocar no comparar: o ícone fica verde e aparece, numa linha só, "Na comparação (1) · Ver ›"; tocar de novo tira.
54. No fim de "Explore a região", "Ver todas as academias em <bairro> ›" abre a página do bairro.
55. Abrir a ficha de uma academia que tinha marcado estacionamento grátis e pago: um item só; sem texto que explique, "Tem vaga grátis e vaga paga. Pergunte na academia como funciona."; no Parceiros dela, "Como funciona o estacionamento" no que falta.
56. Editar a ficha › Estrutura: os dois chips de estacionamento; marcar os dois: embaixo de todas as comodidades, "Estacionamento grátis e pago: como funciona?"; escolher "Grátis por um tempo, depois pago" › 2 horas e salvar: a ficha mostra "Estacionamento grátis nas primeiras 2h" e "Grátis nas primeiras 2h; depois, é pago." em Como chegar e nas perguntas. Desmarcar o pago: a pergunta some.
57. Na mesma edição, "Grátis para alunos, pago para os outros": o cartão da busca não mostra o selo "Estacionamento grátis".
58. Home: "Melhores avaliadas" só com nota 4 ou mais, a de mais avaliações antes de uma 5,0 com uma só; perto de você (com 3 ou mais boas perto), o título vira "Melhores avaliadas perto de você".
59. Na ficha, tocar no ícone de comparar: o aviso "Na comparação (1) · Ver ›" numa linha só; tocar nele abre a comparação.
60. Comparação com uma academia: o título com o ícone, "+ Escolher" só com o +, o subtítulo curto terminando em "e tudo o que está na ficha." e "Limpar comparação" em vermelho, com o lixo.
61. Comparação com duas: as seções "Localização" (não mais "Onde fica"), "Horário" e "Contato e ficha", e as linhas Estacionamento, Como chegar, Reposição (aula e locação), Contato, Ficha e Elogios.
62. No menu, "Comparar academias" com o ícone; no seletor da comparação, o botão de cada academia é o ícone (verde cheio quando já está); nos filtros, "Comparação" com o ícone.
63. "Ainda em dúvida?" › escrever "quero estacionamento grátis, pouco tempo de aviso na reposição e privacidade": a ajuda mostra, para cada academia, o estacionamento, o aviso da reposição ("O menor aviso é na …") e as quadras (a menor como "academia menor e mais reservada").
64. Com a conta do Parceiros, editar a ficha, marcar os dois estacionamentos e tocar em "Continuar" sem escolher como funciona: não passa, com o aviso em vermelho; ir à revisão e "Confirmar e salvar": não salva e volta à parte Quadras com "Conte como funciona o estacionamento grátis e pago."; em "por um tempo", sem as horas, também não passa.
65. Abrir uma ficha com avaliação: "N avaliações no GuiaTennis" no alto, no quadrinho da nota e na caixa do preço; numa sem avaliação, "Essa academia ainda não tem avaliação no GuiaTennis."; nos filtros, "Avaliação no GuiaTennis". Nenhum "app" falando do site.
66. Com a conta do Parceiros, editar a ficha (no Básico): nenhuma parte fala de plano; em Fotos, com 2 ou mais, segurar e arrastar uma foto para outro lugar muda a ordem; em Cancelamento (aula e locação), a escolha "Mesma regra / Aula e locação diferentes" vem primeiro, separada por uma linha.
67. Na revisão, tocar no lápis de uma parte: embaixo, só o "Confirmar" verde; mudar algo e confirmar volta para a revisão, que já mostra a mudança.
68. Na edição no Básico, preencher o Instagram e "Confirmar e salvar": vem a tela "N partes não vão aparecer na ficha", com a lista, a escolha das comodidades e os planos; "Continuar no Básico sem essas partes" salva.
69. Tocar no X depois de mudar algo: "Sair sem salvar?" com "Sair e descartar as mudanças" (nada salvo) e "Continuar editando"; sem mudar nada, o X fecha direto. No "Cadastrar academia nova", depois de preencher o nome: "Sair do cadastro?", e "Sair e apagar" começa do zero na próxima vez.
70. Com outra conta do Parceiros (e-mail confirmado), pedir uma academia que já tem responsável e tocar em "Contestar": o cartão "Em disputa" diz "em até 1 dia útil"; no painel do admin, Pendências › "Mandar código ao WhatsApp da academia" abre o seu WhatsApp com a mensagem; digitar o código no cartão passa a academia para a conta.
71. Entrar no Parceiros › "Esqueceu a senha?": primeiro só o código e "Continuar" (um código errado avisa e fica ali); certo, "Código confirmado. Agora crie a senha nova." com os campos da senha. O mesmo em "Entrar ou criar conta" dos jogadores.
72. Com a conta do Parceiros de uma academia sem fotos, entrar: em poucos segundos desce "Adicione fotos da academia…" e "Adicionar fotos ›" abre a ficha nas fotos; voltar no mesmo dia não mostra outra. No dia seguinte (ou noutro aparelho), com a ficha completa no Básico, a dica é o Completo; no Completo, um dia o Premium e no outro publicar uma promoção; no Premium, publicar uma promoção ou entrar no leilão. Numa conta com mais de uma semana e a ficha incompleta, um dia vem a parte que falta e no outro o plano.
73. Numa academia no Premium, Promoções › Leilão: "Como funciona" › "Continuar" › "Estimativa da semana" (alcance, custo por jogador, envios) › "Participar" › "Texto do anúncio" (a prévia muda) › "Lance máximo" (o exemplo muda com o valor; sem créditos, "Comprar") › "Revisão do anúncio" › "Entrar com lance de até R$ X": abre o andamento do leilão. "Alterar o lance" volta com o de antes; "Sair do leilão" pergunta e volta à estimativa.
74. Cadastrar uma academia nova pelo Parceiros (e-mail confirmado) e escolher o Premium na tela do plano: a tela de pronto diz "no plano Premium", sem falar do Básico.
75. Promoções › Leilão: a página fica cinza e técnica, com o cabeçalho da campanha (status, encerra, alcance estimado, lance mínimo, créditos); "Etapa 2 de 5 · Estimativa" com os números; em "Texto do anúncio", os contadores mudam ao digitar; depois de entrar, "Lance ativo" no cabeçalho. Voltar para "Na ficha": o visual de sempre.
76. Em qualquer formulário (por exemplo, Promoções › Leilão › "Texto do anúncio", Vou viajar ou a avaliação na ficha), digitar algo (nada aparece na tela; o rascunho é guardado calado); tocar em outra aba, no ✕ ou voltar pelo celular: "Sair sem salvar?"; "Continuar editando" fica com tudo; recarregar a página no meio: volta com o que foi digitado.
77. Promoções › Leilão: o cabeçalho com os números só em "Como funciona" e em "Revisão". "Comprar créditos" abre a página de pagamento, sem o menu, com "Pagamento seguro"; escolher "Outro valor" e digitar 150: o resumo mostra R$ 150,00; Pix › "Continuar para o pagamento": o QR code; no site de teste, "Simular Pix pago": "Pagamento confirmado" com o saldo novo e "Voltar ao leilão".
78. Numa academia no Completo, Promoções › Na ficha: as semanas em chips (4 marcada), "Vale até…" e "Por enquanto, a promoção na ficha não tem custo."; publicar: "Promoção publicada na ficha e na busca até…", sem "Mandar por e-mail". Promoções › Leilão: só o cartão "Leilão de promoções · Disponível no plano Premium", sem explicação; na Ajuda (logado), sem a pergunta do leilão.
79. No admin, Leilões › "Promoção na ficha · preço da semana": pôr R$ 10 e salvar ("O Completo paga R$ 10 por semana; o Premium, 20% menos (R$ 8)"). De volta à academia no Completo: "Por semana R$ 10", o total das semanas e os créditos; sem créditos, "Faltam R$ X" e, na prévia, "Comprar créditos ›" (a página de pagamento volta "à promoção"); com créditos, "Publicar promoção · R$ 20" desconta e a lista mostra "2 semanas · R$ 20 dos créditos"; "Encerrar" devolve a semana que não começou. No Premium, "R$ 8 · 20% menos no Premium". Depois, voltar o preço a R$ 0.
80. Com uma conta do Parceiros, abrir o site dos jogadores › Minha conta: "Excluir minha conta" no fim; tocar: o aviso diz que é a mesma conta nos dois lados, o nome da academia, o que acontece com ela e que as avaliações ficam; "Excluir a conta" só com "Entendi" marcado. O mesmo aviso no Perfil do Parceiros. Com uma conta só de jogador, o aviso não fala de academias.
81. Numa aba anônima, abrir duas fichas e tocar no WhatsApp de cada uma: ao voltar ao site, aparece no alto "Crie sua conta para guardar as academias que você chamou"; "Criar conta ›" abre o cadastro; criada a conta, Menu › "Academias que você chamou" já mostra as duas. Tocar no ✕ em outra aba anônima: não volta.
82. No Parceiros, abrir a edição da ficha e mudar o nome; em Promoções › Leilão, escrever o anúncio; no site dos jogadores, escrever uma avaliação e preencher Vou viajar: em nenhum deles aparece "Rascunho salvo". Recarregar a página no meio: o que foi digitado continua lá.
83. Com uma academia Premium confirmada, buscar o bairro dela: no topo, ela com "Patrocinado"; embaixo de "Mais perto de você", ela de novo no lugar da distância dela, com o selo dourado e sem "Patrocinado". A contagem no alto não conta duas vezes.
84. Com uma conta do Parceiros, pedir uma academia que já tem responsável: no cartão, só "Contestar ›". Tocar: abre uma página sem o menu, com as quatro telas (Quando contestar, O código, O que muda, Contestar); "Continuar" passa, "Voltar" volta, "Agora não" e o ✕ saem sem contestar. Na última, "Contestar quem administra" volta a Suas academias com o cartão "Em disputa". (Desde o passo 85, como está lá.)
85. Pedir uma academia que já tem responsável e tocar em "Contestar ›": a tela fica toda verde, com as barrinhas no alto e só "Continuar" (sem "Pular"). Na última, "Contestar e receber o código" abre "Digite o código" com as 6 caixas. "Digitar depois" volta, e o cartão "Em disputa" tem "Digitar o código". Depois, em "Esqueceu a senha?" (Parceiros e jogadores) e no "Confirme o seu e-mail": uma caixa por número e "Mandar outro código em 0:59".
86. Nessas mesmas telas (contestar e código): nenhum desenho, nada se mexendo ao trocar de tela ou nas barrinhas; só o texto, o verde e as caixas.
87. Em "Contestar ›": o fundo creme, o logo do GuiaTennis no alto (sem ✕), a etapa em dourado, o título na letra dos títulos do site e o texto num cartão branco com "Continuar" logo abaixo. Em "Digite o código" (disputa, e-mail e "Esqueci a senha"): o mesmo jeito do "Entrar", com as caixas no cartão.
88. Veracidade: (a) no Parceiros, Minha ficha › Editar, trocar o WhatsApp e salvar: a tela de pronto pede o código e, em Atualizações, aparece "Confirme o WhatsApp da academia"; a ficha no site continua com o número de antes. No admin, Pendências › "WhatsApp para confirmar" › "Gerar código" (abre o WhatsApp com a mensagem); digitar o código em "Digitar o código": como é troca, aparece "Código confirmado", e "Aprovar a troca", no admin, põe o número novo na ficha. (b) Numa ficha, no fim, "Informar um problema" com uma conta de jogador: sem o e-mail confirmado, pede o código antes; o admin vê em Pendências e a academia em Atualizações; salvar a ficha tira o aviso. (c) Avaliar com uma conta sem o e-mail confirmado: pede o código. (d) "Denunciar" numa avaliação: aparece em Pendências. (e) No admin, "Conferir" numa academia: Google Maps, "Procurar no mapa aberto" e um CNPJ em "Consultar" (a Receita responde na prévia).
89. A ficha só mostra o que está certo: (a) numa academia sem WhatsApp, escrever um número no Parceiros (Minha ficha › Editar): a ficha no site não diz nada de "em confirmação"; no admin, "Gerar código" e digitar o código no Parceiros: aparece "Código confirmado" e a ficha continua sem o botão até você tocar em "Aprovar o número" em Pendências. (b) Em Suas academias, "A academia fechou as portas?" › "Avisar que fechou": a situação vira "Fora do site" e, numa janela sem entrar, a academia some da busca e o link dela não abre; no admin, "Continua aberta" a traz de volta. (c) No admin, Pendências › "Fichas paradas há 3 meses": a lista, "Lembrar agora" (o e-mail chega para a academia) e "Conferi: está certo" (sai da lista); em Academias, o filtro "Paradas há 3 meses".
90. Para a academia: (a) no Parceiros, Minha ficha › Editar › Contato, escrever um WhatsApp novo: embaixo do campo, "Precisa de confirmação… não fica público até ser confirmado"; na revisão, o mesmo aviso embaixo do botão; depois de salvar, a tela de pronto e o cartão de Atualizações dizem o mesmo; abrindo a própria ficha no site, "Só vocês veem isto…". (b) No admin, fechar uma academia de teste ("Fechou: tirar do Guia"): ela some do site e aparece em Academias › Fechadas e na Visão geral. (c) Entrar no Parceiros com o e-mail de quem a administrava: "A … reabriu?" › marcar a declaração › "Reabrir e administrar": ela volta. (d) Com outra conta, em Cadastrar, buscar o nome: "Fechada permanentemente · cadastro inativo" › "Pedir para reabrir"; no admin, Pendências › "Pedidos para reabrir" › "Reabriu: voltar ao Guia". (e) No admin, o sino no alto e a seção Avisos: "Para fazer agora" e os e-mails que chegaram. (f) Numa avaliação da academia, "Pedir análise": abre a janela e chega em Pendências.
91. A ficha no jeito do hoteis.com, no celular: abrir uma academia com fotos. (a) A capa quadrada passa com o dedo, os pontinhos acompanham e o número de fotos abre a foto da vez; ← volta; comparar, compartilhar e favoritar ficam no botão branco da direita; rolando, a barra de cima desce depois da capa. (b) Nome no meio, "Ver no mapa ›" e "N avaliações ›" funcionam. (c) A ordem: destaques, Estrutura, Explore a região (o botão de abrir no mapa), Sobre a academia (uma foto grande e duas empilhadas), Escolha o que você quer (a caixa "Horário" leva ao horário; os filtros Aula/Locação; o WhatsApp de cada cartão abre a conversa sobre aquela opção), Avaliações (os cartões passam; "Mostrar mais"; "Ver todas"), Outras academias por perto, Horário, Cancelamento, Perguntas, Contato. (d) A barra de baixo com o anel dourado. (e) No computador, o mosaico e as abas.
92. No celular: (a) numa ficha, a barra de cima sem o nome, quase transparente no creme (dá para ver a ficha passando embaixo, desfocada), também quando desce depois da capa; (b) Menu › "Vou viajar": as frases embaixo das datas e do aviso por e-mail com mais espaço, e a explicação do aviso alinhada ao texto da caixinha.
93. Telas de código: (a) em "Entrar ou criar conta" › "Esqueceu a senha?", a tela mostra 6 caixas e "Mandamos um código de 6 números"; o e-mail que chega tem 6 números; "Continuar" fica apagado até a sexta caixa e o Enter não confirma antes. (b) O mesmo no Parceiros (confirmar o e-mail e "Esqueceu a senha?"), na disputa ("Contestar ›" › código) e no WhatsApp da ficha. (c) No registro do fluxo Banco desta prévia, "Modelo do e-mail do código trocado no Supabase teste (…; código de 6 números)".
94. Catálogo e contato: (a) no Parceiros, Minha ficha › Editar › Modalidade e preço, marcar Aulas e Locação; na tabela, marcar Aula em grupo › Mensal com R$ 300, Aula individual › Avulsa com R$ 150 e Locação › Avulsa com R$ 120 (sem campo de horário, duração, vezes ou alunos); salvar. (b) Na ficha, um cartão por opção com os filtros (Todas, Individual, Grupo, Locação, Avulsas, Mensais); "Mensais" deixa só as turmas; o WhatsApp de cada cartão abre a conversa sobre aquela opção. (c) A barra de baixo mostra "R$ 120 · por hora de quadra"; na busca, "Aula R$ 150/aula" e "Locação R$ 120/h". (d) Logo depois das opções vem Contato, com "Confirmada pela academia" e sem o nome do plano (também numa academia Premium); "É o responsável?" e "Algo errado nesta ficha?" ficam no fim. (e) Numa academia que só tinha o preço por hora, a edição mostra o valor como opção do catálogo ("Locação · Avulsa · R$ … por hora"). (f) Numa academia Premium, em cada opção marcada, "Foto desta opção": a foto aparece no cartão daquela opção na ficha. Numa academia Básico ou Completo, a mesma foto fica guardada com "Aparece no Premium", não aparece na ficha, e ao salvar o aviso do plano lista "A foto do catálogo".
95. Regras de conteúdo: (a) Termos de Uso › seções 5 ("Nomes"), 6 e 9, e Política de Privacidade › "Nomes e conteúdo que desrespeitam as regras", as duas com 27 de outubro de 2026. (b) Numa ficha, a caixinha da avaliação: "Minha avaliação é verídica, sem ofensa nem discriminação, e segue os Termos de Uso."; "Como funcionam as avaliações" com a frase de que não são toleradas. (c) "Denunciar" numa avaliação: o motivo "É ofensiva, discriminatória (racismo, homofobia, xenofobia…) ou tem ameaça". (d) No chat de ajuda, escrever "achei uma avaliação racista" ou "tem um nome ofensivo": a resposta leva a denunciar e oferece o WhatsApp.
96. Fotos: (a) no Parceiros, Minha ficha › Editar › Fotos, escolher duas fotos: abre o ajuste do enquadramento (desde o passo 97, o "Cortar" do Instagram); a primeira fica recortada como foi ajustada. (b) Em cada foto, "Ajustar" reabre só aquela. (c) Numa academia Premium, a "Foto desta opção" do catálogo também abre para ajustar. (d) Na ficha, nenhuma foto no "Sobre a academia" e nenhuma caixa "Horário" em "Escolha o que você quer"; as fotos ficam na capa e nos cartões das opções.
97. Corte e nome suspenso: (a) no Parceiros, Minha ficha › Editar › Fotos, escolher três fotos: abre "Cortar", com as miniaturas 1, 2 e 3; arrastar mostra a grade; o botão de expandir mostra a foto inteira; "Concluir" grava; o ✕ depois de mexer pergunta "Descartar as edições?". (b) Na ficha, a caixinha da avaliação diz "Minha avaliação é verídica e segue os Termos de Uso.". (c) No painel, Contas de jogador › "Suspender o nome" numa conta de teste que avaliou, com um motivo: a avaliação vira "Usuário do GuiaTennis" e chega o e-mail "O seu nome no GuiaTennis foi suspenso". (d) Entrando com essa conta: a tela "Restam 15 dias"; "Trocar o nome" abre Minha conta com o aviso; trocar e salvar: "O seu nome voltou a aparecer no site.", e a avaliação volta com o nome novo; no painel, Pendências › "Nomes suspensos" › "Está certo". (e) Excluir uma conta de teste que avaliou: a avaliação fica como "Usuário do GuiaTennis", com o avatar cinza. (f) No painel, trocar o nome de uma academia de teste que tem conta: chega "O GuiaTennis alterou o nome da …".
98. (a) Na página inicial, buscar "Vila Suzana, São Paulo": a linha diz "A partir de Vila Suzana, São Paulo" (e não Jundiaí); o mesmo com outros bairros de São Paulo e com ", SP" no fim. (b) Numa ficha confirmada, o Contato logo depois das opções só com os botões, e "Confirmada pela academia · atualizada há…" no fim, antes do "É o responsável por esta academia?". (c) Em "Entrar ou criar conta", com um e-mail novo: "Nome*" e "Sobrenome*" lado a lado; só o nome não passa ("Preencha o sobrenome."). O mesmo em Minha conta.
99. Avaliação editada: (a) com uma conta de teste, avaliar uma academia: a caixa mostra "Obrigado por avaliar!" e "Sua avaliação" com "Editar avaliação". (b) Tocar em "Editar avaliação", mudar as estrelas e o texto, marcar o aceite e "Salvar alterações": "Avaliação editada.", e o cartão da lista (o primeiro) mostra "· editada", com a data de quando avaliou. (c) Quem administra a academia recebe "…: uma avaliação foi editada". (d) No Parceiros, Avaliações: responder, depois "Editar resposta" com outro texto: a resposta mostra "editada".

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01RAN2MXkerf7Ww1aUesZXEd
https://claude.ai/code/session_01YMcKxZ1djrtbDXKinGWQwQ
https://claude.ai/code/session_01TnpsDNdRFm3eqnBZ588j8F
https://claude.ai/code/session_01Cd4tGgBFGAAAjXZTvrHZ7m
https://claude.ai/code/session_01S3K2LZP2YwmWp5LNxSvqJx
https://claude.ai/code/session_01FKYREGdS55UsvhVZ73MnYL
https://claude.ai/code/session_014zxwtc9DS4mJvj6A81vHQP
https://claude.ai/code/session_01XTzAswoYATkEJZY7MSpgjr
https://claude.ai/code/session_01E1UKfZeiheSjCG2YWUSgwp
https://claude.ai/code/session_01QgyyuiNZu4xqfgNqFEsszY
https://claude.ai/code/session_017YRnhmA4qpZQduBPavvQht
https://claude.ai/code/session_01Ue6jvvDQwHrZRUksFG23Ra
https://claude.ai/code/session_01VWHWfLYDrY6EKVEFsJrvcn

