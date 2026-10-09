// GuiaTennis Parceiros (/parceiros): o site das academias, separado do site de
// quem joga, como o trivago Business Studio, o Booking para Parceiros e o
// iFood Parceiros. Página inicial com benefícios, como funciona, planos e
// perguntas; cadastro que primeiro procura a academia; "Entrar"; e, logado,
// o desempenho conforme o plano — sem o plano mexer na ordem da busca.
const { abrir, ok, irParte, irSenha, vigiarAbas, abasAbertas } = require('./harness');

const tela = (page) => page.evaluate(() => ({
  aba: state.parceirosAba,
  pagina: state.page,
  link: location.pathname + location.search + location.hash,
  h1: document.querySelector('#parceiros h1')?.innerText || '',
  robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') || '',
  canonica: document.getElementById('link-canonical').getAttribute('href'),
  titulo: document.title,
}));
const texto = (page, sel) => page.evaluate((sel) => document.querySelector(sel)?.innerText || '', sel);
const pedidos = (page) => page.evaluate(() => window.__rpcs.filter(r => r.nome === 'numeros_da_academia').map(r => r.args.p_dias));

(async () => {
  // ---- página inicial, no computador ----
  let { browser, page } = await abrir({ q: 'parceiros', w: 1280 });
  let t = await tela(page);
  ok(t.pagina === 'parceiros' && t.aba === 'inicio' && t.h1 === 'Mais jogadores para a sua academia de tênis', 'página inicial dos parceiros — ' + t.h1);
  ok(!t.robots && t.canonica === 'http://guia.test/parceiros' && t.titulo.includes('GuiaTennis Parceiros'), 'página inicial entra no Google, com título próprio — ' + t.titulo);
  let corpo = await texto(page, '#parceiros');
  ok(corpo.includes('Por que estar no GuiaTennis') && corpo.includes('Como funciona') && corpo.includes('Perguntas frequentes'), 'benefícios, como funciona e perguntas na mesma página');
  ok(corpo.includes('sem comissão') && corpo.includes('Grátis no plano Básico'), 'deixa claro: grátis no Básico e sem comissão');
  ok(!/Google|TripAdvisor/.test(corpo.replaceAll('(Instagram, Google…)', '')) && corpo.includes('Responda às avaliações') && !corpo.includes('Responda as avaliações'), 'benefícios sem citar outras marcas, com a crase certa');
  const como = await page.evaluate(() => [...document.querySelectorAll('.pc-etapas-como li')].map(l => l.querySelector('.pc-card-t').innerText + ' (' + l.querySelector('.pc-etapa-tempo').innerText.trim() + ')'));
  ok(como.join(' | ') === 'Crie a sua conta (2 minutos) | Encontre a sua academia (Na hora) | Declare que responde pela academia (Na hora) | Complete a ficha e receba jogadores (Todo dia)' && await page.isVisible('.pc-como-fim [data-pc="cadastro"]'), 'como funciona em 4 passos, com o tempo de cada um e o botão para começar — ' + como.length);
  const marcasNoRodape = await page.evaluate(() => document.querySelectorAll('.pc-rodape .logo-mark').length);
  ok(marcasNoRodape === 1 && (await texto(page, '.pc-rodape')).split('O GuiaTennis para academias e quadras de tênis').length === 2, 'rodapé com a marca e a frase uma vez só, na faixa escura');
  const planos = await page.evaluate(() => [...document.querySelectorAll('.pc-plano')].map(p => p.querySelector('.pc-plano-n').innerText + ':' + (p.querySelector('.pc-plano-tag')?.innerText || '')));
  ok(planos.join() === 'Básico:,Completo:Recomendado,Premium:', 'três planos, o do meio recomendado — ' + planos.join());
  ok(!corpo.includes('mesma em todos os planos') && !corpo.includes('compra posição'), 'não promete que nunca haverá posição paga');
  const topo = await page.evaluate(() => ({
    nav: [...document.querySelectorAll('.pc-nav a')].map(a => a.innerText).join(' | '),
    entrar: document.querySelector('.pc-topo .pc-entrar')?.getAttribute('href'),
    cadastrar: document.querySelector('.pc-topo .pc-cta')?.getAttribute('href'),
    site: !!document.querySelector('#site-header, .home-head'),
  }));
  ok(topo.nav === 'Benefícios | Como funciona | Planos | Ajuda' && topo.entrar === '/parceiros/entrar' && topo.cadastrar === '/parceiros/cadastro', 'cabeçalho próprio, com menu, Entrar e Cadastrar — ' + topo.nav);
  ok(!topo.site, 'sem o cabeçalho do site dos jogadores');
  const largura = await page.evaluate(() => ({ topo: document.querySelector('.pc-topo').getBoundingClientRect().width, tela: innerWidth, lateral: document.documentElement.scrollWidth > innerWidth }));
  ok(largura.topo === largura.tela && !largura.lateral, 'cabeçalho de ponta a ponta, sem rolar para o lado — ' + largura.topo + ' de ' + largura.tela);
  await page.click('.pc-nav a[data-pc="planos"]');
  await page.waitForTimeout(200);
  t = await tela(page);
  ok(t.aba === 'planos' && t.link === '/parceiros/planos' && t.h1 === 'Planos' && !t.robots, 'Planos tem endereço próprio e entra no Google — ' + t.link);
  const tabela = await page.evaluate(() => [...document.querySelectorAll('.pc-plano')].map(p => p.querySelectorAll('.pc-plano-lista li:not(.nao)').length).join());
  ok(tabela === '7,10,18', 'cada plano mostra o que libera, um acima do outro — ' + tabela);
  const pessoasPorPlano = await page.evaluate(() => [...document.querySelectorAll('.pc-plano')].map(p => p.querySelector('.pc-plano-lista li').innerText.match(/\d+/)[0]).join());
  ok(pessoasPorPlano === '1,5,10', 'cada plano diz quantas pessoas têm acesso — ' + pessoasPorPlano);
  ok(!/em breve/i.test(await texto(page, '.pc-plano:last-child')) && (await texto(page, '.pc-plano:last-child')).includes('Promoções na ficha e na busca'), 'Premium mostra as promoções, que já funcionam (sem "Em breve")');
  await page.click('.pc-nav a[data-pc="ajuda"]');
  await page.waitForTimeout(200);
  corpo = await texto(page, '#parceiros .pc-main');
  const faq = await page.evaluate(() => document.querySelectorAll('#parceiros .pc-faq details').length);
  ok(faq === 17 && corpo.includes('E se outra pessoa estiver administrando a minha academia?') && corpo.includes('O que quer dizer "atualizada há…" na ficha?') && corpo.includes('Com duas academias, pago um plano só?') && corpo.includes('Tenho mais de uma academia. Preciso de outra conta?') && corpo.includes('Posso dar acesso a mais pessoas da academia?') && corpo.includes('A academia pode avaliar outras academias?') && corpo.includes('Esqueci a senha') && !corpo.includes('Pagar um plano'), 'Ajuda com as perguntas das academias — ' + faq);
  const contato = await page.evaluate(() => [...document.querySelectorAll('.pc-contato a')].map(a => a.getAttribute('href').slice(0, 20)).join() + '|' + !!document.querySelector('.pc-contato [data-abrir-chat]'));
  ok(!contato.includes('https://wa.me/') && contato.includes('mailto:') && contato.endsWith('|true'), 'Ajuda tem o chat de ajuda (que leva ao WhatsApp se precisar) e o e-mail do GuiaTennis');
  await page.goBack();
  await page.waitForTimeout(200);
  t = await tela(page);
  ok(t.aba === 'planos', '"voltar" do navegador volta uma página dentro do site dos parceiros');
  await vigiarAbas(page);
  await page.click('.pc-rodape a[data-pc-sair-do-portal]');
  await page.waitForTimeout(300);
  const abaDosJogadores = (await abasAbertas(page))[0] || {};
  ok(abaDosJogadores.url === 'http://guia.test/' && abaDosJogadores.nome === 'guiatennis', 'rodapé leva de volta ao site dos jogadores, na aba dele');
  await page.goto(abaDosJogadores.url);
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => document.getElementById('app').className === 'container' && window.name === 'guiatennis'), 'o site dos jogadores tem a largura dele e o nome da aba dele');
  await browser.close();

  // ---- celular: menu de três barras ----
  ({ browser, page } = await abrir({ q: 'parceiros' }));
  ok(!(await page.isVisible('.pc-nav')), 'no celular, o menu de cima vira o botão de três barras');
  await page.click('#pc-menu-btn');
  const gaveta = await texto(page, '#pc-menu-overlay');
  ok(gaveta.includes('Benefícios') && gaveta.includes('Planos') && gaveta.includes('Ajuda') && gaveta.includes('Cadastrar academia') && gaveta.includes('Entrar') && gaveta.includes('Ir para o GuiaTennis (jogadores)'), 'menu do celular com tudo o que a academia precisa');
  await page.click('#pc-menu-overlay [data-pc-ancora="pc-como"]');
  await page.waitForTimeout(700);
  const rolou = await page.evaluate(() => ({ menu: !!document.getElementById('pc-menu-overlay'), topo: document.getElementById('pc-como').getBoundingClientRect().top }));
  ok(!rolou.menu && rolou.topo < 200, '"Como funciona" fecha o menu e rola até a seção — ' + Math.round(rolou.topo));
  await browser.close();

  // ---- cadastro: começa pelo e-mail, como o Booking e o Google ----
  ({ browser, page } = await abrir({ q: 'parceiros/cadastro' }));
  t = await tela(page);
  ok(t.h1 === 'Entre ou cadastre a sua academia' && !t.robots, 'um lugar só para entrar ou cadastrar, começando pelo e-mail');
  const barra = () => page.evaluate(() => ({
    etapas: [...document.querySelectorAll('.pc-progresso-etapas li')].map(l => l.innerText.trim() + (l.classList.contains('agora') ? '*' : l.classList.contains('feito') ? '✓' : '')).join(' | '),
    feito: document.querySelector('.pc-trilho i')?.style.width,
  }));
  let etapas = await barra();
  ok(etapas.etapas === 'Dados de contato* | Sua academia | Início' && etapas.feito === '0%' && await page.isVisible('.trilha-bola') && await page.isVisible('#pc-email') && !(await page.isVisible('#pc-busca')), 'trilha de tênis em cima, com a bolinha na primeira etapa — ' + etapas.etapas);
  ok((await texto(page, '.pc-main .pc-card .footnote')).includes('Pode escrever o usuário aqui'), 'quem recebeu usuário do GuiaTennis usa o mesmo campo');
  await page.fill('#pc-email', 'joana@semponto');
  await page.click('#pc-email-continuar');
  await page.waitForTimeout(200);
  ok((await texto(page, '#parceiros .form-error')).includes('e-mail válido'), 'e-mail errado: avisa');
  // E-mail de quem já tem conta (o e-mail que a academia deu no primeiro acesso).
  await page.evaluate(() => {
    window.__db.academia_acessos.push({ user_id: 'u-a2', academia_id: 'a2', usuario: 'quadra.a2', nome_responsavel: 'Maria Teste', email: 'maria@quadralocacao.com.br', whatsapp: '11900000001', termos_aceitos_em: '2026-09-01', dados_completos_em: '2026-09-01', senha_trocada_em: '2026-09-01' });
    window.__senhas['quadra.a2@acesso.guiatennis.com.br'] = 'senha12345';
  });
  await page.fill('#pc-email', ' Maria@QuadraLocacao.com.br ');
  await page.click('#pc-email-continuar');
  await page.waitForTimeout(300);
  ok((await texto(page, '#parceiros .pc-aviso-conta')).includes('Você já tem conta no GuiaTennis Parceiros') && await page.isVisible('#login-password'), 'e-mail que já tem conta: o site acha e abre a senha ali mesmo');
  // Pedido do Breno em 09/10/2026 ("está muito grudado isso aqui"): o e-mail
  // fica num cartão com "Trocar", e o aviso num quadro à parte.
  ok((await texto(page, '#pc-email-escolhido')) === 'maria@quadralocacao.com.br' && (await texto(page, '#pc-trocar-email')) === 'Trocar' && !(await page.$('#pc-email')), 'o e-mail aparece num cartão com "Trocar", sem o campo travado');
  await page.click('#pc-trocar-email');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.activeElement.id === 'pc-email' && document.getElementById('pc-email').value.trim() === 'maria@quadralocacao.com.br'), '"Trocar" volta ao campo do e-mail, pronto para corrigir');
  await page.click('#pc-email-continuar');
  await page.waitForTimeout(300);
  await page.fill('#login-password', 'senha12345');
  await page.click('#login-submit');
  await page.waitForTimeout(700);
  t = await tela(page);
  ok(t.aba === 'painel' && t.h1 === 'Olá, Maria', 'quem recebeu usuário do GuiaTennis entra também pelo e-mail que deu — ' + t.link);
  await browser.close();

  // Conta nova, sem academia ainda.
  ({ browser, page } = await abrir({ q: 'parceiros/cadastro' }));
  await page.evaluate(() => { window.__db.academias[0].site = 'https://www.soaulatennis.com.br/'; state.allCourts[0].site = 'https://www.soaulatennis.com.br/'; });
  await page.fill('#pc-email', 'Contato@SoAulaTennis.com.br');
  await page.press('#pc-email', 'Enter');
  await page.waitForTimeout(300);
  ok((await texto(page, '#parceiros h1')) === 'Informe os seus dados de contato' && await page.isVisible('#pc-conta-tratamento') && await page.isVisible('#pc-conta-sobrenome') && await page.isVisible('#pc-conta-cargo') && (await texto(page, '.campo-ddi')) === 'Brasil (+55)', 'e-mail novo: dados de contato completos, como no trivago (tratamento, nome, sobrenome, cargo, telefone com o país)');
  ok(await page.evaluate(() => document.activeElement.id === 'pc-conta-tratamento'), 'o cursor já vai para o primeiro campo');
  const dadosDeContato = await page.evaluate(() => ({ cargo: document.querySelector('label[for="pc-conta-cargo"]')?.innerText || '', aceite: document.getElementById('pc-conta-aceite')?.closest('label')?.innerText || '' }));
  ok(dadosDeContato.cargo.startsWith('Seu cargo') && dadosDeContato.aceite.startsWith('Li e concordo com os Termos de Uso') && !/academia/i.test(dadosDeContato.cargo + dadosDeContato.aceite), 'dados de contato não falam da academia, que ainda não foi escolhida — ' + dadosDeContato.cargo + ' / ' + dadosDeContato.aceite);
  await page.click('#pc-criar-conta');
  await page.waitForTimeout(200);
  ok((await texto(page, '#parceiros .form-error')).includes('tratamento'), 'sem tratamento: pede');
  await page.selectOption('#pc-conta-tratamento', 'Sra.');
  await page.fill('#pc-conta-nome', 'Joana');
  await page.click('#pc-criar-conta');
  await page.waitForTimeout(200);
  ok((await texto(page, '#parceiros .form-error')).includes('sobrenome'), 'sem sobrenome: pede');
  await page.fill('#pc-conta-sobrenome', 'Dona');
  await page.click('#pc-criar-conta');
  await page.waitForTimeout(200);
  ok((await texto(page, '#parceiros .form-error')).includes('cargo'), 'sem cargo: pede');
  await page.selectOption('#pc-conta-cargo', 'Dono(a) ou sócio(a)');
  await page.fill('#pc-conta-whatsapp', '(11) 98888-0001');
  await page.fill('#pc-conta-senha', 'curta');
  await page.fill('#pc-conta-senha2', 'curta');
  await page.click('#pc-criar-conta');
  await page.waitForTimeout(200);
  ok((await texto(page, '#parceiros .form-error')).includes('8 caracteres'), 'senha curta: avisa');
  await page.fill('#pc-conta-senha', 'senhaforte1');
  await page.fill('#pc-conta-senha2', 'senhaforte1');
  await page.click('#pc-criar-conta');
  await page.waitForTimeout(200);
  ok((await texto(page, '#parceiros .form-error')).includes('aceitar os Termos'), 'sem o aceite: avisa');
  ok(!(await page.$('#pc-conta-novidades')) && !(await texto(page, '#parceiros')).includes('Quero receber por e-mail'), 'sem a caixa de receber e-mail (o relatório do mês é do Premium)');
  await page.check('#pc-conta-aceite');
  await page.click('#pc-criar-conta');
  await page.waitForTimeout(800);
  const criada = await page.evaluate(() => ({
    rpc: (window.__rpcs.find(r => r.nome === 'criar_minha_conta') || {}).args,
    conta: contaAcademia && { academia: contaAcademia.academiaId, nome: contaAcademia.nome, tratamento: contaAcademia.tratamento, cargo: contaAcademia.cargo, novidades: contaAcademia.recebeRelatorio },
    login: window.__ultimoLogin,
  }));
  ok(criada.rpc && criada.rpc.p_email === 'contato@soaulatennis.com.br' && criada.rpc.p_nome === 'Joana Dona' && criada.rpc.p_tratamento === 'Sra.' && criada.rpc.p_cargo === 'Dono(a) ou sócio(a)' && criada.rpc.p_recebe_novidades === false && criada.rpc.p_aceite === true, 'grava tratamento, nome e sobrenome, cargo, telefone e o aceite — ' + JSON.stringify(criada.conta));
  ok(criada.conta && criada.conta.academia === null && criada.login === 'contato@soaulatennis.com.br', 'cria a conta e já entra com o e-mail');
  etapas = await barra();
  corpo = await texto(page, '#parceiros .pc-main');
  ok(etapas.etapas === '✓ Dados de contato✓ | Sua academia* | Início' && etapas.feito === '50%' && await page.evaluate(() => document.querySelector('.trilha-bola').style.left) === '50%', 'a bolinha anda: segunda etapa, sua academia — ' + etapas.etapas);
  ok(corpo.includes('Declaro que estou autorizado(a) pela academia'), 'a declaração de que representa a academia vem na hora de escolher a academia');
  ok(corpo.includes('Prazer em conhecer você, Joana!') && corpo.includes('Antes de começar, vamos ver se a sua academia já está no GuiaTennis.') && corpo.includes('Dica: escreva também o bairro'), 'tela "Prazer em conhecer você", como a do trivago');
  let escolhas = await page.evaluate(() => [...document.querySelectorAll('.pc-escolha')].map(b => b.innerText.replace(/\s+/g, ' ').trim() + (b.classList.contains('on') ? '*' : '')));
  ok(escolhas.length === 1 && escolhas[0].includes('Só Aula Tennis') && escolhas[0].includes('achamos pelo seu e-mail') && escolhas[0].endsWith('*') && !(await page.isDisabled('#pc-administrar')), 'o site acha a academia pelo e-mail (domínio do site dela) e já deixa marcada — ' + escolhas.join(' / '));
  await page.fill('#pc-busca', 'quadra moema');
  await page.waitForTimeout(100);
  escolhas = await page.evaluate(() => [...document.querySelectorAll('#pc-resultados .pc-escolha strong')].map(x => x.innerText));
  ok(escolhas.join() === 'Só Aula Tennis,Quadra Locação' && await page.evaluate(() => document.activeElement.id === 'pc-busca'), 'procura pelo nome e o bairro enquanto digita, sem perder o cursor — ' + escolhas.join());
  await page.fill('#pc-busca', 'locacao');
  escolhas = await page.evaluate(() => [...document.querySelectorAll('#pc-resultados .pc-escolha strong')].map(x => x.innerText));
  ok(escolhas.includes('Quadra Locação'), 'acha sem acento também');
  await page.fill('#pc-busca', 'zzzz');
  escolhas = await page.evaluate(() => [...document.querySelectorAll('#pc-resultados .pc-escolha strong')].map(x => x.innerText));
  ok(escolhas.join() === 'Só Aula Tennis', 'sem resultado, continua a que o site achou pelo e-mail');
  await page.fill('#pc-busca', 'quadra');
  await page.click('.pc-escolha[data-pc-selecionar="a2"]');
  await page.waitForTimeout(200);
  t = await tela(page);
  escolhas = await page.evaluate(() => [...document.querySelectorAll('.pc-escolha.on strong')].map(x => x.innerText));
  ok(escolhas.join() === 'Quadra Locação' && t.link === '/parceiros/cadastro?academia=a2' && t.robots.includes('noindex'), 'tocar escolhe a academia; o link guarda ela e fica fora do Google — ' + t.link);
  const linhaNova = await texto(page, '.pc-main .pc-linha');
  ok(linhaNova.includes('A sua academia ainda não está no GuiaTennis?') && linhaNova.includes('Cadastrar academia nova'), 'academia nova numa linha discreta');
  await page.click('.pc-escolha[data-pc-selecionar="a1"]');
  // A declaração é uma caixinha obrigatória, como o "Li e concordo" (06/10/2026).
  const decl = await texto(page, '.pc-declaro');
  ok(decl.includes('Declaro que estou autorizado(a) pela academia') && decl.includes('respondo pelas informações') && !decl.includes('dono'), 'caixinha da declaração, sem "é dono(a)" — ' + decl);
  await page.click('#pc-administrar');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => !window.__rpcs.some(r => r.nome === 'pedir_para_administrar') && document.querySelector('.pc-declaro.falta') && document.body.innerText.includes('Marque a declaração para pedir')), 'sem marcar, o pedido não vai e a caixinha pede a marcação');
  await page.check('#pc-declaro');
  await page.click('#pc-administrar');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => (window.__rpcs.find(r => r.nome === 'pedir_para_administrar') || {}).args.p_declaro === true && !!window.__db.pedidos_de_acesso.slice(-1)[0].declarou_em), 'marcada, o pedido vai com a declaração e o banco guarda a hora');
  const pedido = await page.evaluate(() => ({
    rpc: (window.__rpcs.find(r => r.nome === 'pedir_para_administrar') || {}).args,
    card: document.querySelector('.pc-pedido')?.innerText || '',
    wa: decodeURIComponent([...document.querySelectorAll('.pc-pedido a')].map(a => a.getAttribute('href')).find(h => h.includes('wa.me')) || ''),
    codigo: !!document.getElementById('pc-codigo'),
  }));
  etapas = await barra();
  ok(pedido.rpc && pedido.rpc.p_academia === 'a1' && /pedido enviado/i.test(pedido.card) && pedido.card.includes('Só Aula Tennis') && etapas.feito === '100%', '"Administrar esta academia" manda o pedido — ' + pedido.card.split('\n')[0]);
  // O código só em disputa (07/10/2026): sem o e-mail confirmado, o pedido
  // espera a confirmação; confirmado, a ficha passa a ser da conta.
  ok(!pedido.codigo && pedido.card.includes('Confirme o seu e-mail') && pedido.card.includes('passa a ser sua na hora'), 'sem o e-mail confirmado, o pedido espera a confirmação do e-mail, sem código');
  ok(pedido.card.includes('Quer agilizar?') && !/documento|CNPJ|contrato/.test(pedido.card) && pedido.wa.includes('pedi para administrar a Só Aula Tennis'), 'dá para falar com o GuiaTennis, sem pedir documento');
  await page.click('.pc-topo [data-pc="inicio"]');
  await page.waitForTimeout(300);
  t = await tela(page);
  const semAcademia = await page.evaluate(() => ({
    corpo: document.querySelector('#parceiros .pc-main').innerText,
    barra: !!document.querySelector('.pc-barra-baixo'),
    menu: (() => { state.pcMenu = true; render(); const m = [...document.querySelectorAll('#pc-menu-overlay .menu-item[data-pc]')].map(a => a.innerText.trim()).join(' | '); state.pcMenu = false; render(); return m; })(),
  }));
  ok(t.aba === 'painel' && semAcademia.corpo.includes('Olá, Joana') && semAcademia.corpo.includes('Só Aula Tennis'), 'painel da conta sem academia mostra o pedido');
  ok(!semAcademia.barra && semAcademia.menu === 'Atualizações | Suas academias | Plano | Perfil | Ajuda', 'sem academia: menu curto e sem a barra de baixo — ' + semAcademia.menu);
  await page.click('#pc-cancelar-pedido');
  await page.waitForTimeout(400);
  ok((await texto(page, '#parceiros .pc-main')).includes('Falta escolher a sua academia'), 'cancelar o pedido volta para escolher a academia');
  // Academia nova, sem digitar os dados da pessoa de novo.
  await page.click('.pc-main [data-pc="cadastro"]');
  await page.waitForTimeout(300);
  await page.click('#pc-nova');
  await page.waitForTimeout(300);
  const form = await page.evaluate(() => ({
    titulo: document.querySelector('#register-overlay .reg-cabeca')?.innerText || '',
    sub: document.querySelector('#register-overlay .subtitle')?.innerText || '',
    aceite: !!document.getElementById('f-consent'),
    visitante: !!document.getElementById('visitor-overlay'),
    atalhos: [...document.querySelectorAll('.reg-secoes button')].map(b => b.innerText).join(' | '),
    alto: Math.round(document.querySelector('#register-overlay .sheet').getBoundingClientRect().height),
    tela: innerHeight,
  }));
  ok(form.titulo === 'Cadastrar academia nova' && form.sub.includes('não precisa digitar de novo') && !form.aceite, 'formulário da academia nova não pede de novo os dados nem o aceite');
  ok(form.alto === form.tela, 'formulário em tela cheia — ' + form.alto + ' de ' + form.tela);
  ok(form.atalhos === 'Nome e endereço | Modalidade e preço | Quadras | Contato | Fotos | Horário | Cancelamento | Como chegar | Revisar', 'uma aba para cada parte, na ordem do que mais importa — ' + form.atalhos);
  // Pedido do Breno em 01/10/2026: uma parte por tela, com Voltar e Continuar.
  const telaUm = await page.evaluate(() => ({
    partes: document.querySelectorAll('#register-overlay .reg-passo').length,
    progresso: document.querySelector('.reg-progresso-t')?.innerText || '',
    enviar: !!document.getElementById('register-submit'),
    continuar: !!document.getElementById('reg-continuar'),
    voltar: !!document.getElementById('reg-voltar'),
  }));
  ok(telaUm.partes === 1 && telaUm.progresso === 'Parte 1 de 9 · Nome e endereço' && telaUm.continuar && !telaUm.voltar && !telaUm.enviar, 'cadastro abre na primeira parte, com Continuar e sem o envio — ' + telaUm.progresso);
  await page.click('[data-reg-passo="6"]');
  await page.waitForTimeout(300);
  const aba = await page.evaluate(() => ({ passo: document.querySelector('#register-overlay .reg-passo')?.dataset.passo, rolou: document.querySelector('#register-overlay .sheet').scrollTop, titulo: document.querySelector('.reg-titulo')?.innerText }));
  ok(aba.passo === 'cancelamento' && aba.rolou === 0 && aba.titulo === 'Cancelamento e reposição', 'a aba leva direto à parte, do começo da tela — ' + aba.titulo);
  await page.click('#reg-voltar');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.querySelector('#register-overlay .reg-passo').dataset.passo === 'horario'), 'Voltar volta uma parte');
  await page.evaluate(() => {
    Object.assign(window.__form, { name: 'Academia Nova da Joana', address: 'Rua Nova', numero: '10', bairro: 'Butantã', cidade: 'São Paulo', phone: '11977770000', modalidades: ['locacao'], quadras: { saibro_coberta: 2 } });
    render();
  });
  await irParte(page, 'revisar');
  ok((await texto(page, '#register-overlay')).includes('Declaro que estou autorizado(a) pela academia a cadastrá-la'), 'academia nova: a declaração vem numa caixinha junto do envio');
  await page.click('#register-submit');
  await page.waitForTimeout(300);
  ok((await texto(page, '#register-overlay')).includes('a declaração de que você está autorizado(a) pela academia') && await page.evaluate(() => !window.__db.academias.some(a => a.name === 'Academia Nova da Joana')), 'sem marcar a declaração, a academia nova não vai');
  await page.check('#f-declaro');
  await page.click('#register-submit');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => !!document.querySelector('[data-reg-plano="premium"]') && !window.__db.academias.some(a => a.name === 'Academia Nova da Joana')), 'ao finalizar, a escolha do plano vem antes de enviar');
  await page.click('[data-reg-plano="premium"]');
  await page.waitForTimeout(900);
  const enviada = await page.evaluate(() => ({
    visitante: !!document.getElementById('visitor-overlay'),
    academia: window.__db.academias.find(a => a.name === 'Academia Nova da Joana'),
    pedido: meusPedidos().map(p => p.nome).join(),
    texto: document.querySelector('#register-overlay')?.innerText || '',
  }));
  ok(!enviada.visitante && enviada.academia && enviada.academia.status === 'pending' && enviada.academia.nome_solicitante === 'Joana Dona' && enviada.academia.contato_solicitante === '11988880001', 'academia nova vai para análise com os dados da conta, sem perguntar de novo');
  ok(enviada.pedido === 'Academia Nova da Joana' && enviada.texto.includes('você já administra a ficha'), 'a academia nova vira o pedido da conta');
  const pedidoPlano = await page.evaluate(() => window.__db.pedidos_de_plano.map(p => p.plano + ':' + p.onde).join());
  ok(pedidoPlano === 'premium:cadastro' && enviada.texto.includes('Você escolheu o plano Premium'), 'o Premium escolhido fica anotado para o GuiaTennis — ' + pedidoPlano);
  await browser.close();

  // Admin aprova o pedido; publicar a academia nova libera junto.
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(() => {
    window.__db.academia_acessos.push(
      { user_id: 'u-joana', academia_id: null, usuario: 'joana@exemplo.com', nome_responsavel: 'Joana Dona', email: 'joana@exemplo.com', whatsapp: '11988880001', papel: 'principal', pedido_academia_id: 'a1', pedido_nome: 'Só Aula Tennis', pedido_em: '2026-09-30T12:00:00Z', dados_completos_em: '2026-09-30', senha_trocada_em: '2026-09-30' },
      { user_id: 'u-pedro', academia_id: null, usuario: 'pedro@exemplo.com', nome_responsavel: 'Pedro', email: 'pedro@exemplo.com', whatsapp: '11988880002', papel: 'principal', pedido_academia_id: 'n9', pedido_nome: 'Academia do Pedro', pedido_em: '2026-09-30T12:00:00Z', dados_completos_em: '2026-09-30', senha_trocada_em: '2026-09-30' });
    window.__db.academias.push({ id: 'n9', name: 'Academia do Pedro', status: 'pending', created_at: '2026-09-30T12:00:00Z', amenities: [], modalidades: [], quadras: {}, photos: [] });
  });
  await page.evaluate(async () => { await carregarAcessos(); await loadEverything(); state.showAdminPanel = true; render(); });
  let painelAdmin = await texto(page, '#admin-overlay');
  ok(painelAdmin.includes('Pedidos para administrar') && painelAdmin.includes('Só Aula Tennis') && painelAdmin.includes('Joana Dona') && painelAdmin.includes('Academia do Pedro · academia nova, em análise'), 'admin vê os pedidos para administrar, com a academia nova marcada');
  const waPedido = await page.evaluate(() => document.querySelector('.acesso-pedido a')?.getAttribute('href') || '');
  ok(waPedido.startsWith('https://wa.me/5511988880001?text='), 'admin fala com a pessoa pelo WhatsApp antes de aprovar — ' + waPedido.slice(0, 34));
  await page.click('.acesso-pedido [data-mandar-codigo="u-joana"]');
  await page.waitForTimeout(400);
  const gerado = await page.evaluate(() => ({ codigo: (window.__codigos || {})['u-joana']?.codigo, wa: decodeURIComponent(document.querySelector('.acesso-pedido a.chip.active')?.getAttribute('href') || ''), texto: document.querySelector('.acesso-pedido')?.innerText || '' }));
  ok(gerado.codigo && gerado.wa.startsWith('https://wa.me/5511999990001?text=') && gerado.wa.includes('código ' + gerado.codigo) && gerado.wa.includes('Se ninguém da academia pediu, é só ignorar'), 'admin gera o código e manda ao WhatsApp que está na ficha da academia, com aviso se não foi ninguém de lá');
  ok(gerado.texto.includes('Código ' + gerado.codigo), 'o código aparece para o admin mandar');
  await page.click('[data-aprovar-pedido="u-joana"]');
  await page.waitForTimeout(400);
  let joana = await page.evaluate(() => window.__db.academia_acessos.find(x => x.user_id === 'u-joana'));
  ok(joana.academia_id === 'a1' && joana.papel === 'principal' && !joana.pedido_academia_id, 'aprovar liga a conta à academia, como responsável principal');
  await page.evaluate(async () => { await sb.from('academias').update({ status: 'published' }).eq('id', 'n9'); });
  const pedro = await page.evaluate(() => window.__db.academia_acessos.find(x => x.user_id === 'u-pedro'));
  ok(pedro.academia_id === 'n9' && pedro.papel === 'principal', 'publicar a academia nova libera a conta de quem mandou');
  await browser.close();

  // Veio da ficha ("Gerencie a ficha…"), sem conta: a academia já vem marcada.
  ({ browser, page } = await abrir({ q: 'parceiros/cadastro?academia=a2' }));
  ok((await texto(page, '.pc-reivindicar')).includes('Administrar a ficha da Quadra Locação') && (await texto(page, '.pc-reivindicar')).includes('Comece pelo seu e-mail'), 'link da ficha: começa pelo e-mail, já com a academia');
  await page.fill('#pc-email', 'dono@gmail.com');
  await page.click('#pc-email-continuar');
  await page.waitForTimeout(300);
  await page.selectOption('#pc-conta-tratamento', 'Sr.');
  await page.fill('#pc-conta-nome', 'Dono');
  await page.fill('#pc-conta-sobrenome', 'Moema');
  await page.selectOption('#pc-conta-cargo', 'Gerente');
  await page.fill('#pc-conta-whatsapp', '11988880009');
  await page.fill('#pc-conta-senha', 'senhaforte1');
  await page.fill('#pc-conta-senha2', 'senhaforte1');
  await page.check('#pc-conta-aceite');
  await page.click('#pc-criar-conta');
  await page.waitForTimeout(900);
  let direto = await page.evaluate(() => ({ marcada: [...document.querySelectorAll('.pc-escolha.on strong')].map(x => x.innerText).join(), achamos: document.querySelector('#pc-resultados')?.innerText.includes('achamos pelo seu e-mail'), pronto: !document.getElementById('pc-administrar').disabled }));
  ok(direto.marcada === 'Quadra Locação' && !direto.achamos && direto.pronto, 'conta criada pelo link da ficha já deixa aquela academia marcada (gmail não sugere nada)');
  await page.check('#pc-declaro');
  await page.click('#pc-administrar');
  await page.waitForTimeout(500);
  direto = await page.evaluate(() => ({ pedido: contaAcademia && meusPedidos().map(p => p.nome).join(), link: location.pathname + location.search }));
  ok(direto.pedido === 'Quadra Locação' && direto.link === '/parceiros/cadastro', 'um toque em "Administrar esta academia" e o pedido sai');
  // Sem o e-mail confirmado, o admin pode conferir pelo código, que chega no
  // WhatsApp da academia (desde 07/10/2026, o código só é preciso na disputa).
  await page.evaluate(async () => { window.__codigos = { [contaAcademia.userId]: { codigo: '482915', academia: 'a2', tentativas: 0, em: new Date().toISOString() } }; await recarregarConta(); render(); });
  await page.fill('#pc-codigo', '111111');
  await page.click('#pc-confirmar-codigo');
  await page.waitForTimeout(300);
  ok((await texto(page, '.pc-pedido .form-error')).includes('Código errado'), 'código errado: avisa em palavras simples');
  await page.fill('#pc-codigo', '482 915');
  await page.press('#pc-codigo', 'Enter');
  await page.waitForTimeout(800);
  t = await tela(page);
  const liberado = await page.evaluate(() => ({ academia: contaAcademia.academiaId, papel: contaAcademia.papel, aviso: document.querySelector('.conta-aviso')?.innerText || '' }));
  ok(liberado.academia === 'a2' && t.aba === 'painel' && liberado.aviso.includes('Agora você administra a Quadra Locação'), 'código certo: a conta passa a administrar a academia, sem esperar o Breno — ' + liberado.aviso);
  await browser.close();

  // ---- entradas a partir do site dos jogadores ----
  ({ browser, page } = await abrir({}));
  const entradas = await page.evaluate(() => ({
    rodape: document.querySelector('.sitefooter a[data-pc="inicio"]')?.getAttribute('href'),
    bloco: document.querySelector('.ba-btn')?.getAttribute('href'),
  }));
  ok(entradas.rodape === '/parceiros' && entradas.bloco === '/parceiros', 'rodapé e bloco da home levam ao GuiaTennis Parceiros');
  await vigiarAbas(page);
  await page.click('.ba-btn');
  await page.waitForTimeout(300);
  let abas = await abasAbertas(page);
  ok(abas.length === 1 && abas[0].url === 'http://guia.test/parceiros' && abas[0].nome === 'guiatennis-parceiros' && await page.evaluate(() => state.page === 'home'), 'bloco da home abre o GuiaTennis Parceiros na aba dele, como o trivago Business Studio');
  await page.evaluate(() => { state.showMenu = true; render(); });
  await page.click('.menu-drawer [data-menu="parceiros"]');
  await page.waitForTimeout(300);
  abas = await abasAbertas(page);
  ok(abas.length === 2 && abas[1].nome === 'guiatennis-parceiros' && abas[1].url === 'http://guia.test/parceiros', 'menu do site abre o GuiaTennis Parceiros (a mesma aba dele)');
  await page.evaluate(() => { state.page = 'search'; state.view = 'list'; render(); });
  // Pedido do Breno em 01/10/2026: sem o "+" no canto da busca.
  ok(await page.evaluate(() => !document.querySelector('#fab-add') && ![...document.querySelectorAll('.fab')].some(b => b.textContent.trim() === '+')), 'a busca não tem mais o botão "+" no canto');
  await browser.close();

  // ---- caixa de preço da busca: só preço e botão ----
  ({ browser, page } = await abrir({ q: 'busca?q=Pinheiros' }));
  await page.waitForTimeout(600);
  const caixa = await page.evaluate(() => [...document.querySelectorAll('.rcard')].map(c => ({
    oferta: c.querySelector('.offer')?.innerText || '',
    selos: c.querySelector('.rcard-info .rcard-selos')?.innerText || '',
  })));
  ok(caixa.length && caixa.every(c => !c.oferta.includes('✓') && !/Coberta|Wi-?Fi|Estacionamento|Vestiário/i.test(c.oferta)), 'caixa de preço sem as comodidades no meio');
  ok(caixa.some(c => c.selos), 'comodidades ficam junto das outras informações da academia — ' + caixa.map(c => c.selos.replace(/\n/g, ' ')).join(' / '));
  ok(caixa.every(c => /a partir de|Sob consulta/i.test(c.oferta)), 'a legenda do preço fica embaixo dos valores');
  ok(caixa.filter(c => /R\$/.test(c.oferta)).every(c => /R\$ \d+\/h/.test(c.oferta.replace(/\s+/g, ' '))), 'o "/h" fica do lado do valor, como o "/noite" do Airbnb');
  await browser.close();

  // ---- página de quem está logado, sem login ----
  ({ browser, page } = await abrir({ q: 'parceiros/desempenho' }));
  t = await tela(page);
  ok(t.aba === 'entrar' && t.link === '/parceiros/entrar' && t.robots.includes('noindex'), 'Desempenho sem login pede para entrar — ' + t.link);
  await page.evaluate(() => {
    window.__db.academia_acessos.push({ user_id: 'u-a2', academia_id: 'a2', usuario: 'quadra.a2', nome_responsavel: 'Maria Teste', cargo: 'Gerente', email: 'm@t.com', whatsapp: '11900000001', termos_aceitos_em: '2026-09-01', dados_completos_em: '2026-09-01', senha_trocada_em: '2026-09-01' });
    window.__senhas['quadra.a2@acesso.guiatennis.com.br'] = 'senha12345';
  });
  await irSenha(page, 'quadra.a2');
  await page.fill('#login-password', 'senha12345');
  await page.click('#login-submit');
  await page.waitForTimeout(600);
  t = await tela(page);
  ok(t.aba === 'desempenho' && t.link === '/parceiros/desempenho', 'depois de entrar, volta para a página que tinha pedido — ' + t.link);
  await browser.close();

  // ---- Desempenho: números só no Premium (pedido de 02/10/2026) ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/desempenho', plano: 'basico' }));
  t = await tela(page);
  corpo = await texto(page, '#parceiros .pc-main');
  // Desde 08/10/2026 (regra 68): os acessos de 30 dias, o resto no Premium.
  ok(t.h1 === 'Desempenho' && corpo.includes('42') && corpo.includes('acessos à ficha de vocês') && corpo.includes('Quantos chamaram vocês') && !corpo.includes('Visitas na ficha') && !corpo.includes('Contatos'), 'Básico: só os acessos de 30 dias, o resto trancado no Premium — ' + corpo.replace(/\s+/g, ' ').slice(0, 120));
  ok(await page.evaluate(() => document.querySelectorAll('.pc-graf, .pc-periodos').length) === 0, 'Básico: sem gráfico e sem períodos');
  const verPlanos = await page.evaluate(() => { const b = document.querySelector('.pc-vitrine .pc-vitrine-btn'); const t = document.querySelector('.pc-vitrine .pc-vitrine-trancados'); return b && t ? { texto: b.innerText, separado: b.getBoundingClientRect().top - t.getBoundingClientRect().bottom, link: b.getAttribute('href') } : null; });
  ok(verPlanos && verPlanos.texto === 'Ver os números no Premium' && verPlanos.separado >= 8 && verPlanos.link === '/parceiros/plano', '"Ver os números no Premium" num botão separado, embaixo, que leva aos planos — ' + JSON.stringify(verPlanos));
  ok(!corpo.includes('posição na busca') && !/aprimore o plano/i.test(corpo) && !corpo.includes('Quero o Completo'), 'Desempenho sem a caixa do plano (o plano fica num lugar só) e sem falar de posição na busca');
  await page.click('.pc-vitrine-btn');
  await page.waitForTimeout(200);
  t = await tela(page);
  ok(t.aba === 'plano' && t.h1 === 'Seu plano', '"Ver os números no Premium" leva aos planos');
  const meu = await page.evaluate(() => [...document.querySelectorAll('.pc-plano')].map(p => (p.querySelector('.pc-plano-tag')?.innerText || '-')).join());
  ok(meu === 'Seu plano,Recomendado,-', 'Plano marca o plano atual e recomenda o próximo — ' + meu);
  const quero = await page.evaluate(() => decodeURIComponent(document.querySelector('.pc-plano.destaque a')?.getAttribute('href') || ''));
  ok(quero.includes('plano Completo') && quero.includes('Quadra Locação') && await texto(page, '.pc-plano.destaque a') === 'Aprimorar para o Completo', '"Aprimorar para o Completo" abre o WhatsApp do guia com a academia — ' + quero.slice(0, 80));
  await browser.close();

  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/desempenho', plano: 'completo' }));
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('acessos à ficha de vocês') && corpo.includes('Ver os números no Premium') && !corpo.includes('Visitas na ficha') && await page.evaluate(() => document.querySelectorAll('.pc-graf').length) === 0 && !corpo.includes('Quero o Premium'), 'Completo: também só os acessos, com "Ver os números no Premium"');
  await browser.close();

  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/desempenho', plano: 'premium' }));
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Visitas na ficha') && corpo.includes('42') && corpo.includes('21%') && corpo.includes('Taxa de contato'), 'Premium: visitas, contatos e taxa de contato');
  const graficos = await page.evaluate(() => [...document.querySelectorAll('.pc-graf')].map(g => g.querySelector('strong').innerText + ':' + g.querySelectorAll('.pc-barra').length));
  ok(graficos.join() === 'Visitas por dia:30,Contatos por dia:30', 'Premium: um gráfico para visitas e outro para contatos, nunca dois eixos — ' + graficos.join());
  ok(corpo.includes('+40% contra o período anterior') && corpo.includes('igual ao período anterior'), 'Premium: comparação com o período anterior');
  ok(corpo.includes('Contatos por canal') && corpo.includes('De onde vieram') && corpo.includes('Aparelho') && corpo.includes('Celular'), 'Premium: canais, origem e aparelho');
  ok(corpo.includes('Bairros de quem procurou') && corpo.includes('Pinheiros, São Paulo') && corpo.includes('Comparação com São Paulo') && corpo.includes('Média das academias'), 'Premium: bairros e média das academias da cidade');
  ok(!corpo.includes('Disponível no plano'), 'Premium: nada trancado');
  ok(await page.evaluate(() => !!document.querySelector('.pc-tabela table')), 'os números também em tabela');
  await page.hover('.pc-graf .pc-barra:last-child');
  const leitura = await texto(page, '.pc-graf .pc-graf-leitura');
  ok(leitura.startsWith('30/09:') && leitura.includes('visitas'), 'passar o dedo na coluna mostra o dia e o valor — ' + leitura);
  await page.click('.pc-periodos [data-pc-dias="90"]');
  await page.waitForTimeout(300);
  let chips = await page.evaluate(() => [...document.querySelectorAll('.pc-periodos .chip')].map(c => c.innerText.trim() + (c.classList.contains('pc-chip-trancado') ? '🔒' : '') + (c.classList.contains('active') ? '*' : '')));
  ok(chips.join() === '7 dias,30 dias,90 dias*,Desde o começo' && JSON.stringify(await pedidos(page)) === '[30,90]', 'Premium: todos os períodos — ' + chips.join());
  await page.click('.pc-periodos [data-pc-dias="0"]');
  await page.waitForTimeout(300);
  const tudo = await page.evaluate(() => ({ graf: document.querySelector('.pc-graf strong')?.innerText, barras: document.querySelectorAll('.pc-graf')[0].querySelectorAll('.pc-barra').length }));
  ok(tudo.graf === 'Visitas por semana' && tudo.barras === 18 && JSON.stringify(await pedidos(page)) === '[30,90,0]', 'Premium: desde o começo, somado por semana — ' + JSON.stringify(tudo));
  await browser.close();

  // ---- painel logado, no computador ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/painel', w: 1280 }));
  t = await tela(page);
  const painel = await page.evaluate(() => ({
    nav: [...document.querySelectorAll('.pc-nav a')].map(a => a.innerText).join(' | '),
    quem: document.querySelector('.pc-seletor-btn')?.innerText.trim() || '',
    barra: !!document.querySelector('.pc-barra-baixo') && getComputedStyle(document.querySelector('.pc-barra-baixo')).display !== 'none',
    rodape: [...document.querySelectorAll('.pc-rodape a[data-pc]')].map(a => a.innerText).join(' | '),
  }));
  ok(t.h1 === 'Olá, Maria' && t.robots.includes('noindex'), 'painel cumprimenta o responsável e fica fora do Google');
  ok(painel.nav === 'Atualizações | Minha ficha | Avaliações | Promoções | Desempenho | Academias | Pessoas | Plano | Ajuda' && painel.quem === 'Quadra Locação', 'logado, o menu vira o da academia, com o nome dela — ' + painel.nav);
  ok(!painel.barra, 'no computador, sem a barra de baixo');
  ok(!painel.rodape.includes('Cadastrar') && !painel.rodape.includes('Entrar') && painel.rodape.includes('Desempenho'), 'rodapé de quem está logado não oferece Cadastrar nem Entrar — ' + painel.rodape);
  await page.click('.pc-nav a[data-pc="desempenho"]');
  await page.waitForTimeout(300);
  t = await tela(page);
  ok(t.link === '/parceiros/desempenho' && JSON.stringify(await pedidos(page)) === '[30,30]', 'menu leva ao Desempenho e atualiza os números');
  await page.goto('http://guia.test/parceiros/cadastro');
  await page.waitForTimeout(700);
  t = await tela(page);
  ok(t.aba === 'cadastro', 'logada, ainda pode abrir as páginas públicas');
  await browser.close();

  // ---- banco sem a função dos números ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/desempenho', plano: 'premium', trocar: h => h.replace("sb.rpc('numeros_da_academia'", "sb.rpc('funcao_que_nao_existe'") }));
  await page.evaluate(async () => { window.__db.academias.find(a => a.id === 'a2').plano = 'premium'; await loadEverything(); render(); });
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Não consegui carregar os números agora') && await page.isVisible('.pc-main [data-pc-dias]'), 'sem os números: aviso simples e botão de tentar de novo');
  await browser.close();
  // ---- pessoas com acesso: Básico 1, Completo 5, Premium 10 ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/pessoas' }));
  await page.waitForTimeout(300);
  let conta = await texto(page, '#parceiros .pc-main');
  ok(conta.includes('Responsável principal') && conta.includes('Pessoas com acesso') && conta.includes('1 de 1 no plano Básico') && conta.includes('Maria Teste (você)'), 'Pessoas mostra quem tem acesso e quantas pessoas o plano permite');
  ok(!(await page.isVisible('#pc-pessoa-email')) && conta.includes('No Completo, até 5') && conta.includes('Ver planos'), 'Básico já cheio com 1 pessoa: some o formulário e aparece "Ver planos"');
  ok(!/aprimore o plano/i.test(conta) && !conta.includes('Quero o Completo'), 'Pessoas sem a caixa do plano embaixo');
  await browser.close();
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/pessoas', plano: 'completo' }));
  await page.evaluate(async () => { window.__db.academias.find(a => a.id === 'a2').plano = 'completo'; await loadEverything(); await carregarPessoas(); render(); });
  await page.waitForTimeout(300);
  conta = await texto(page, '#parceiros .pc-main');
  ok(conta.includes('1 de 5 no plano Completo'), 'Completo: até 5 pessoas');
  await page.fill('#pc-pessoa-nome', 'Carlos Recepção');
  await page.fill('#pc-pessoa-email', 'Carlos@QuadraLocacao.com.br');
  await page.click('#pc-pessoa-adicionar');
  await page.waitForTimeout(500);
  const add = await page.evaluate(() => ({
    rpc: (window.__rpcs.find(r => r.nome === 'adicionar_pessoa') || {}).args,
    caixa: document.querySelector('.pc-pessoa-nova')?.innerText || '',
    wa: decodeURIComponent(document.querySelector('.pc-pessoa-nova a')?.getAttribute('href') || ''),
    lista: [...document.querySelectorAll('.pc-pessoas li')].map(l => l.innerText.replace(/\s+/g, ' ')).join(' / '),
  }));
  ok(add.rpc && add.rpc.p_email === 'carlos@quadralocacao.com.br' && /^[a-z2-9]{4}-[a-z2-9]{4}$/.test(add.rpc.p_senha), 'adiciona a pessoa pelo e-mail, com senha provisória fácil de digitar');
  ok(add.caixa.includes(add.rpc.p_senha) && add.wa.startsWith('https://wa.me/?text=') && add.wa.includes('Senha provisória: ' + add.rpc.p_senha) && add.wa.includes('parceiros/entrar') && add.wa.includes('carlos@quadralocacao.com.br'), 'mensagem pronta para mandar à pessoa pelo WhatsApp');
  ok(add.lista.includes('Carlos Recepção') && add.lista.includes('Equipe · ainda não entrou'), 'a pessoa nova aparece na lista, como equipe — ' + add.lista);
  conta = await texto(page, '#parceiros .pc-main');
  ok(conta.includes('2 de 5 no plano Completo') && await page.isVisible('#pc-pessoa-email'), 'Completo com 2 pessoas: ainda dá para adicionar');
  page.once('dialog', d => d.accept());
  await page.click('[data-pc-remover]');
  await page.waitForTimeout(500);
  conta = await texto(page, '#parceiros .pc-main');
  ok(conta.includes('1 de 5 no plano Completo') && !conta.includes('Carlos Recepção'), 'o responsável principal remove a pessoa');
  // Uma conta, várias academias (03/10/2026): quem já administra outra
  // academia entra nesta também, sem perder a dela.
  await page.evaluate(() => {
    window.__db.academia_acessos.push({ user_id: 'u-outra', academia_id: 'a1', usuario: 'outra@exemplo.com', email: 'outra@exemplo.com', nome_responsavel: 'Outra Pessoa', papel: 'principal' });
    window.__db.academia_vinculos.push({ user_id: 'u-outra', academia_id: 'a1', papel: 'principal' });
    window.__pessoa = { nome: '', email: 'outra@exemplo.com' }; render();
  });
  await page.click('#pc-pessoa-adicionar');
  await page.waitForTimeout(400);
  const outra = await page.evaluate(() => ({
    caixa: document.querySelector('.pc-pessoa-nova')?.innerText || '',
    lista: [...document.querySelectorAll('.pc-pessoas li')].map(l => l.innerText.replace(/\s+/g, ' ')).join(' / '),
    aberta: window.__db.academia_acessos.find(x => x.user_id === 'u-outra').academia_id,
    vinculos: window.__db.academia_vinculos.filter(v => v.user_id === 'u-outra').map(v => v.academia_id + ':' + v.papel).join(','),
  }));
  ok(outra.caixa.includes('administra também esta academia') && outra.lista.includes('Outra Pessoa') && outra.aberta === 'a1' && outra.vinculos === 'a1:principal,a2:equipe',
    'e-mail de quem já administra outra academia: entra na equipe desta e continua com a dela — ' + outra.vinculos);
  await page.evaluate(() => { window.__pessoa = { nome: '', email: 'outra@exemplo.com' }; render(); });
  await page.click('#pc-pessoa-adicionar');
  await page.waitForTimeout(400);
  ok((await texto(page, '#parceiros .form-error')).includes('já tem acesso a esta academia'), 'a mesma pessoa de novo: avisa em palavras simples');
  await browser.close();

  // Quem é da equipe vê a lista, mas não mexe.
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/pessoas' }));
  await page.evaluate(async () => {
    window.__db.academia_acessos[0].papel = 'equipe';
    window.__db.academia_vinculos[0].papel = 'equipe';
    window.__db.academia_acessos.push({ user_id: 'u-dono', academia_id: 'a2', usuario: 'dono@quadra.com', nome_responsavel: 'Dono', email: 'dono@quadra.com', papel: 'principal', dados_completos_em: '2026-09-01' });
    window.__db.academia_vinculos.push({ user_id: 'u-dono', academia_id: 'a2', papel: 'principal' });
    await recarregarConta(); await carregarPessoas();
  });
  conta = await texto(page, '#parceiros .pc-main');
  ok(conta.includes('Você, na equipe') && conta.includes('Quem adiciona e remove pessoas é o responsável principal') && !(await page.isVisible('#pc-pessoa-email')) && !(await page.isVisible('[data-pc-remover]')), 'quem é da equipe vê a lista, sem adicionar nem remover');
  await browser.close();

  // Painel: QR da ficha e aprimorar; Premium mostra o que vem aí.
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/painel', plano: 'completo' }));
  let painelTexto = await texto(page, "#parceiros .pc-main");
  ok(painelTexto.includes('QR code da sua ficha no GuiaTennis') && !painelTexto.includes('Aprimorar para o') && /Plano\s*Completo/.test(painelTexto), 'Atualizações: QR code da ficha e o atalho "Plano", sem empurrar o plano de cima');
  ok(!painelTexto.includes('Quero o Premium') && !/aprimore o plano/i.test(painelTexto) && painelTexto.includes('Ver detalhes'), 'Atualizações do Completo: o cartão Desempenho com os acessos, sem a caixa "Aprimore o plano"');
  // Desde 08/10/2026 (regra 68): o cartão Desempenho fica em cima.
  ok(await page.evaluate(() => { const v = document.querySelector('#parceiros .pc-desempenho-mini'), a = document.querySelector('#parceiros .pc-atalhos'); return !!(v && a && (v.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING)); }), 'o cartão Desempenho fica em cima, antes dos atalhos');
  await browser.close();
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/painel', plano: 'premium' }));
  painelTexto = await texto(page, "#parceiros .pc-main");
  ok(!/em breve no premium/i.test(painelTexto) && !(await page.$('.pc-oferta')), 'no Premium, Atualizações sem a caixa de novidades (o plano fica num lugar só)');
  await page.evaluate(() => irParceiros('plano', { mesmaAba: true }));
  await page.waitForTimeout(300);
  ok((await texto(page, '#parceiros .pc-main')).includes('Promoções na ficha e na busca'), 'a página Plano mostra as promoções do Premium');
  await browser.close();

  // ---- faixa escura no fim, como a do trivago ----
  ({ browser, page } = await abrir({ w: 1280 }));
  let faixa = await page.evaluate(() => ({ t: document.querySelector('.sitefooter + .rodape-faixa')?.innerText || '', cor: getComputedStyle(document.querySelector('.rodape-faixa')).backgroundColor }));
  ok(faixa.t.includes('GuiaTennis') && faixa.t.includes('Todos os direitos reservados') && faixa.t.includes('OpenStreetMap') && faixa.cor === 'rgb(31, 77, 61)', 'site dos jogadores termina com a faixa na cor do GuiaTennis, como a do trivago');
  await browser.close();
  ({ browser, page } = await abrir({ q: 'parceiros' }));
  faixa = await page.evaluate(() => ({ t: document.querySelector('.pc-rodape .rodape-faixa')?.innerText || '', largura: document.querySelector('.pc-rodape .rodape-faixa').getBoundingClientRect().width, tela: innerWidth, lateral: document.documentElement.scrollWidth > innerWidth }));
  ok(faixa.t.includes('Parceiros') && faixa.t.includes('Todos os direitos reservados') && faixa.largura === faixa.tela && !faixa.lateral, 'GuiaTennis Parceiros também, de ponta a ponta');
  await browser.close();

  // ---- avaliação: sem conta, o site pede para entrar (02/10/2026) ----
  ({ browser, page } = await abrir({}));
  await page.evaluate(() => { saveVisitor({ nome: 'Dono Disfarçado', contato: '(11) 99999-0001' }); openCourt('a2'); });
  await page.waitForTimeout(300);
  await page.click('#star-picker span[data-star="5"]');
  await page.check('#rate-consent');
  await page.click('#rate-submit');
  await page.waitForTimeout(500);
  const recusada = await page.evaluate(() => ({ tela: state.jogadorTela, n: window.__db.avaliacoes.length, obrigado: !!document.querySelector('.rate-thanks') }));
  ok(recusada.tela === 'email' && recusada.n === 0 && !recusada.obrigado, 'visitante sem conta não avalia: o site pede o e-mail');
  // Cria a conta ali mesmo e a avaliação sai sozinha, com o nome da conta.
  await page.fill('#jog-email', 'rafa@exemplo.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(300);
  await page.fill('#jog-nome', 'Rafa Jogador');
  await page.fill('#jog-senha', 'senhaboa12');
  await page.fill('#jog-senha2', 'senhaboa12');
  await page.check('#jog-aceite');
  await page.click('#jog-criar');
  await page.waitForTimeout(600);
  await page.fill('#jog-codigo', '123456');
  await page.click('#jog-confirmar');
  await page.waitForTimeout(800);
  const avaliada = await page.evaluate(() => ({ n: window.__db.avaliacoes.length, nome: (window.__db.avaliacoes[0] || {}).nome_autor, obrigado: !!document.querySelector('.rate-thanks'), aberta: !!document.getElementById('jogador-overlay') }));
  ok(avaliada.n === 1 && avaliada.nome === 'Rafa Jogador' && avaliada.obrigado && !avaliada.aberta, 'criou a conta: a avaliação sai sozinha, com o nome da conta — ' + JSON.stringify(avaliada));
  await browser.close();
  // "No ar, com as informações confirmadas por vocês" só logo depois de
  // publicar ou atualizar (06/10/2026); "Voltar ao painel" não aparece mais.
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel' }));
  ok((await texto(page, '#parceiros .pc-main')).includes('No ar, com as informações confirmadas por vocês'), 'academia publicada há pouco: aparece o "No ar, com as informações confirmadas"');
  await page.evaluate(async () => { window.__db.academias.find(a => a.id === 'a1').created_at = '2026-01-01T10:00:00Z'; await loadEverything(); render(); });
  ok(!(await texto(page, '#parceiros .pc-main')).includes('No ar, com as informações confirmadas'), 'depois de uns dias sem mudança, o aviso some');
  await page.evaluate(() => { state.fichaSalvaEm = new Date().toISOString(); render(); });
  ok((await texto(page, '#parceiros .pc-main')).includes('No ar, com as informações confirmadas por vocês'), 'atualizou a ficha: o aviso volta');
  ok(!(await page.evaluate(() => document.body.innerText.includes('Voltar ao painel'))), 'sem "Voltar ao painel"');
  ok(await page.evaluate(() => document.querySelector('#parceiros h1')?.innerText.startsWith('Olá') && document.title.startsWith('Atualizações')), 'a página inicial da academia se chama Atualizações — ' + await page.evaluate(() => document.title));
  await browser.close();
  // Conta de jogador vira conta do Parceiros com o mesmo e-mail (06/10/2026).
  ({ browser, page } = await abrir({ jogador: true, q: 'parceiros/cadastro' }));
  t = await page.evaluate(() => ({ h1: document.querySelector('#parceiros h1')?.innerText || '', corpo: document.querySelector('#parceiros .pc-main')?.innerText || '', nome: document.getElementById('pc-conta-nome')?.value, sobrenome: document.getElementById('pc-conta-sobrenome')?.value, senha: !!document.getElementById('pc-conta-senha') }));
  ok(t.h1 === 'Use a sua conta do GuiaTennis no Parceiros' && t.corpo.includes('ana@exemplo.com') && t.nome === 'Ana' && t.sobrenome === 'Jogadora' && !t.senha, 'jogador logado no Parceiros: completa os dados, com o nome da conta e sem senha nova — ' + t.h1);
  await page.selectOption('#pc-conta-tratamento', 'Sra.');
  await page.selectOption('#pc-conta-cargo', 'Dono(a) ou sócio(a)');
  await page.fill('#pc-conta-whatsapp', '(11) 97777-1234');
  await page.click('#pc-ativar-conta');
  await page.waitForTimeout(200);
  ok((await texto(page, '#parceiros .form-error')).includes('Termos'), 'sem o aceite: pede');
  await page.check('#pc-conta-aceite');
  await page.click('#pc-ativar-conta');
  await page.waitForTimeout(600);
  t = await page.evaluate(() => ({ conta: !!contaAcademia && contaAcademia.email === 'ana@exemplo.com', jog: !!jogador, h1: document.querySelector('#parceiros h1')?.innerText || '', db: window.__db.academia_acessos.find(x => x.user_id === 'j-ana') }));
  ok(t.conta && t.jog && t.db && t.db.whatsapp === '11977771234' && /vamos ver se a sua academia/i.test(t.h1), 'a mesma conta passa a valer no Parceiros e segue para a academia — ' + t.h1);
  await browser.close();

  ({ browser, page } = await abrir({ q: 'parceiros/entrar' }));
  await page.evaluate(() => { window.__db.jogadores.push({ user_id: 'j-rui', nome: 'Rui Jogador', email: 'rui@exemplo.com', email_confirmado_em: new Date().toISOString() }); window.__senhas['rui@exemplo.com'] = 'senhadorui1'; });
  await irSenha(page, 'rui@exemplo.com');
  ok((await texto(page, '#parceiros .pc-aviso-conta')).includes('Entre com a mesma senha e ela passa a valer também no GuiaTennis Parceiros'), 'e-mail de jogador no Entrar do Parceiros: pede a mesma senha, sem mandar usar outro e-mail');
  await page.fill('#login-password', 'senhadorui1');
  await page.click('#login-submit');
  await page.waitForTimeout(600);
  t = await page.evaluate(() => ({ h1: document.querySelector('#parceiros h1')?.innerText || '', saiu: !!window.__saiu, jog: !!jogador }));
  ok(t.h1 === 'Use a sua conta do GuiaTennis no Parceiros' && !t.saiu && t.jog, 'entrou com a senha de jogador: continua logado e completa os dados — ' + t.h1);
  await browser.close();
})();
