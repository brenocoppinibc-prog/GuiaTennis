// GuiaTennis Parceiros (/parceiros): o site das academias, separado do site de
// quem joga, como o trivago Business Studio, o Booking para Parceiros e o
// iFood Parceiros. Página inicial com benefícios, como funciona, planos e
// perguntas; cadastro que primeiro procura a academia; "Entrar"; e, logado,
// o desempenho conforme o plano — sem o plano mexer na ordem da busca.
const { abrir, ok } = require('./harness');

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
  ok(t.pagina === 'parceiros' && t.aba === 'inicio' && t.h1 === 'Mais alunos para a sua academia de tênis', 'página inicial dos parceiros — ' + t.h1);
  ok(!t.robots && t.canonica === 'http://guia.test/parceiros' && t.titulo.includes('GuiaTennis Parceiros'), 'página inicial entra no Google, com título próprio — ' + t.titulo);
  let corpo = await texto(page, '#parceiros');
  ok(corpo.includes('Por que estar no GuiaTennis') && corpo.includes('Como funciona') && corpo.includes('Perguntas frequentes'), 'benefícios, como funciona e perguntas na mesma página');
  ok(corpo.includes('sem comissão') && corpo.includes('Grátis no plano Básico'), 'deixa claro: grátis no Básico e sem comissão');
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
  ok(tabela === '6,9,13', 'cada plano mostra o que libera, um acima do outro — ' + tabela);
  const pessoasPorPlano = await page.evaluate(() => [...document.querySelectorAll('.pc-plano')].map(p => p.querySelector('.pc-plano-lista li').innerText.match(/\d+/)[0]).join());
  ok(pessoasPorPlano === '2,5,10', 'cada plano diz quantas pessoas têm acesso — ' + pessoasPorPlano);
  ok(/em breve/i.test(await texto(page, '.pc-plano:last-child')) && (await texto(page, '.pc-plano:last-child')).includes('Promoções na ficha e avisos para os seus alunos'), 'Premium mostra o que vem aí, marcado "Em breve"');
  await page.click('.pc-nav a[data-pc="ajuda"]');
  await page.waitForTimeout(200);
  corpo = await texto(page, '#parceiros .pc-main');
  const faq = await page.evaluate(() => document.querySelectorAll('#parceiros .pc-faq details').length);
  ok(faq === 11 && corpo.includes('Posso dar acesso a mais pessoas da academia?') && corpo.includes('A academia pode avaliar outras academias?') && corpo.includes('Esqueci a senha') && !corpo.includes('Pagar um plano'), 'Ajuda com as perguntas das academias — ' + faq);
  const contato = await page.evaluate(() => [...document.querySelectorAll('.pc-contato a')].map(a => a.getAttribute('href').slice(0, 20)).join());
  ok(contato.includes('https://wa.me/551192') && contato.includes('mailto:'), 'Ajuda tem WhatsApp e e-mail do GuiaTennis');
  await page.goBack();
  await page.waitForTimeout(200);
  t = await tela(page);
  ok(t.aba === 'planos', '"voltar" do navegador volta uma página dentro do site dos parceiros');
  await page.click('.pc-rodape a[data-pc-sair-do-portal]');
  await page.waitForTimeout(300);
  t = await tela(page);
  ok(t.pagina === 'home' && t.link === '/', 'rodapé leva de volta ao site dos jogadores');
  ok(await page.evaluate(() => document.getElementById('app').className === 'container'), 'o site dos jogadores volta à largura dele');
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
  ok(t.h1 === 'Cadastre a sua academia' && !t.robots, 'Cadastro tem página própria');
  let etapas = await page.evaluate(() => [...document.querySelectorAll('.pc-etapas li')].map(l => l.innerText.replace(/\s+/g, ' ').trim() + (l.classList.contains('agora') ? '*' : '')).join(' | '));
  ok(etapas === '1 E-mail* | 2 Conta | 3 Academia' && await page.isVisible('#pc-email') && !(await page.isVisible('#pc-busca')), 'primeiro passo é o e-mail — ' + etapas);
  await page.fill('#pc-email', 'nao-e-email');
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
  ok((await texto(page, '#parceiros .pc-main')).includes('Esse e-mail já tem conta') && await page.isVisible('#pc-entrar-com-email'), 'e-mail que já tem conta: o site acha e manda entrar');
  await page.click('#pc-entrar-com-email');
  await page.waitForTimeout(300);
  t = await tela(page);
  ok(t.aba === 'entrar' && await page.inputValue('#login-email') === 'maria@quadralocacao.com.br', 'Entrar já vem com o e-mail');
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
  etapas = await page.evaluate(() => [...document.querySelectorAll('.pc-etapas li')].map(l => (l.classList.contains('feito') ? 'ok' : '') + (l.classList.contains('agora') ? '*' : '')).join(','));
  ok(etapas === 'ok,*,' && await page.isVisible('#pc-conta-nome') && await page.evaluate(() => document.activeElement.id === 'pc-conta-nome'), 'e-mail novo: segundo passo, criar a conta — ' + etapas);
  await page.click('#pc-criar-conta');
  await page.waitForTimeout(200);
  ok((await texto(page, '#parceiros .form-error')).includes('seu nome'), 'sem nome: pede o nome');
  await page.fill('#pc-conta-nome', 'Joana Dona');
  await page.fill('#pc-conta-whatsapp', '(11) 98888-0001');
  await page.fill('#pc-conta-senha', 'curta');
  await page.click('#pc-criar-conta');
  await page.waitForTimeout(200);
  ok((await texto(page, '#parceiros .form-error')).includes('8 caracteres'), 'senha curta: avisa');
  await page.fill('#pc-conta-senha', 'senhaforte1');
  await page.click('#pc-criar-conta');
  await page.waitForTimeout(200);
  ok((await texto(page, '#parceiros .form-error')).includes('aceitar os Termos'), 'sem o aceite: avisa');
  await page.check('#pc-conta-aceite');
  await page.click('#pc-criar-conta');
  await page.waitForTimeout(800);
  const criada = await page.evaluate(() => ({
    rpc: (window.__rpcs.find(r => r.nome === 'criar_minha_conta') || {}).args,
    conta: contaAcademia && { academia: contaAcademia.academiaId, nome: contaAcademia.nome },
    login: window.__ultimoLogin,
  }));
  ok(criada.rpc && criada.rpc.p_email === 'contato@soaulatennis.com.br' && criada.rpc.p_aceite === true && criada.conta && criada.conta.academia === null && criada.login === 'contato@soaulatennis.com.br', 'cria a conta e já entra com o e-mail — ' + JSON.stringify(criada.conta));
  corpo = await texto(page, '#parceiros .pc-main');
  ok(/achamos pelo seu e-mail/i.test(corpo) && corpo.includes('Só Aula Tennis'), 'o site acha a academia pelo e-mail (domínio do site dela)');
  ok(corpo.includes('Não é essa? Procure a sua academia') && await page.isVisible('#pc-busca'), 'e dá para procurar outra');
  await page.fill('#pc-busca', 'quadra');
  await page.waitForTimeout(100);
  let achadas = await page.evaluate(() => [...document.querySelectorAll('#pc-resultados .pc-card-t')].map(x => x.innerText));
  ok(achadas.join() === 'Quadra Locação' && await page.evaluate(() => document.activeElement.id === 'pc-busca'), 'procura a academia enquanto digita, sem perder o cursor — ' + achadas.join());
  ok(await texto(page, '#pc-resultados [data-pc-minha]') === 'Administrar', 'botão da academia achada diz "Administrar"');
  await page.fill('#pc-busca', 'locacao');
  achadas = await page.evaluate(() => [...document.querySelectorAll('#pc-resultados .pc-card-t')].map(x => x.innerText));
  ok(achadas.join() === 'Quadra Locação', 'acha sem acento também');
  await page.fill('#pc-busca', 'zzzz');
  ok((await texto(page, '#pc-resultados')).includes('Não achei nenhuma academia'), 'não achou: diz em palavras simples');
  await page.fill('#pc-busca', 'quadra');
  await page.click('#pc-resultados [data-pc-minha]');
  await page.waitForTimeout(200);
  t = await tela(page);
  ok((await texto(page, '.pc-reivindicar')).includes('Administrar a ficha da Quadra Locação') && t.link === '/parceiros/cadastro?academia=a2' && t.robots.includes('noindex'), '"Administrar": confirma a academia, o link guarda ela e fica fora do Google — ' + t.link);
  await page.click('.pc-reivindicar [data-pc-minha=""]');
  await page.waitForTimeout(200);
  t = await tela(page);
  ok(t.link === '/parceiros/cadastro' && await page.isVisible('#pc-busca'), '"Não é essa" volta para a busca');
  await page.click('.pc-sugerida [data-pc-minha]');
  await page.waitForTimeout(200);
  await page.click('[data-pc-pedir]');
  await page.waitForTimeout(500);
  const pedido = await page.evaluate(() => ({
    rpc: (window.__rpcs.find(r => r.nome === 'pedir_para_administrar') || {}).args,
    card: document.querySelector('.pc-pedido')?.innerText || '',
    wa: decodeURIComponent(document.querySelector('.pc-pedido a')?.getAttribute('href') || ''),
    etapas: [...document.querySelectorAll('.pc-etapas li.feito')].length,
  }));
  ok(pedido.rpc && pedido.rpc.p_academia === 'a1' && /pedido enviado/i.test(pedido.card) && pedido.card.includes('Só Aula Tennis') && pedido.etapas === 3, 'pedido enviado para o GuiaTennis conferir — ' + pedido.card.split('\n')[0]);
  ok(pedido.wa.includes('pedi para administrar a Só Aula Tennis'), 'dá para agilizar pelo WhatsApp do guia');
  await page.click('.pc-topo [data-pc="inicio"]');
  await page.waitForTimeout(300);
  t = await tela(page);
  const semAcademia = await page.evaluate(() => ({
    corpo: document.querySelector('#parceiros .pc-main').innerText,
    barra: !!document.querySelector('.pc-barra-baixo'),
    menu: (() => { state.pcMenu = true; render(); const m = [...document.querySelectorAll('#pc-menu-overlay .menu-item[data-pc]')].map(a => a.innerText.trim()).join(' | '); state.pcMenu = false; render(); return m; })(),
  }));
  ok(t.aba === 'painel' && semAcademia.corpo.includes('Olá, Joana') && semAcademia.corpo.includes('Só Aula Tennis'), 'painel da conta sem academia mostra o pedido');
  ok(!semAcademia.barra && semAcademia.menu === 'Painel | Plano | Conta | Ajuda', 'sem academia: menu curto e sem a barra de baixo — ' + semAcademia.menu);
  await page.click('#pc-cancelar-pedido');
  await page.waitForTimeout(400);
  ok((await texto(page, '#parceiros .pc-main')).includes('Falta escolher a sua academia'), 'cancelar o pedido volta para escolher a academia');
  // Academia nova, sem digitar os dados da pessoa de novo.
  await page.click('.pc-main [data-pc="cadastro"]');
  await page.waitForTimeout(300);
  await page.click('#pc-nova');
  await page.waitForTimeout(300);
  const form = await page.evaluate(() => ({
    titulo: document.querySelector('#register-overlay .sheet-title')?.innerText || '',
    sub: document.querySelector('#register-overlay .subtitle')?.innerText || '',
    aceite: !!document.getElementById('f-consent'),
    visitante: !!document.getElementById('visitor-overlay'),
    atalhos: [...document.querySelectorAll('.reg-secoes button')].map(b => b.innerText).join(' | '),
    alto: Math.round(document.querySelector('#register-overlay .sheet').getBoundingClientRect().height),
    tela: innerHeight,
  }));
  ok(form.titulo === 'Cadastrar academia nova' && form.sub.includes('não precisa digitar de novo') && !form.aceite, 'formulário da academia nova não pede de novo os dados nem o aceite');
  ok(form.alto === form.tela, 'formulário em tela cheia — ' + form.alto + ' de ' + form.tela);
  ok(form.atalhos === 'Nome e endereço | Horário | Fotos | Quadras | Modalidade e preço | Cancelamento | Como chegar | Contato', 'atalhos para cada parte da ficha — ' + form.atalhos);
  await page.click('.reg-secoes button[data-reg-sec="reg-sec-cancelamento"]');
  await page.waitForTimeout(800);
  const topoParte = await page.evaluate(() => document.getElementById('reg-sec-cancelamento').getBoundingClientRect().top);
  ok(topoParte >= 40 && topoParte < 200, 'atalho leva direto à parte da ficha, sem ficar embaixo dos atalhos — ' + Math.round(topoParte));
  await page.evaluate(() => {
    Object.assign(window.__form, { name: 'Academia Nova da Joana', address: 'Rua Nova', numero: '10', bairro: 'Butantã', cidade: 'São Paulo', phone: '11977770000', modalidades: ['locacao'], quadras: { saibro_coberta: 2 } });
    render();
  });
  await page.click('#register-submit');
  await page.waitForTimeout(900);
  const enviada = await page.evaluate(() => ({
    visitante: !!document.getElementById('visitor-overlay'),
    academia: window.__db.academias.find(a => a.name === 'Academia Nova da Joana'),
    pedido: contaAcademia.pedidoNome,
    texto: document.querySelector('#register-overlay')?.innerText || '',
  }));
  ok(!enviada.visitante && enviada.academia && enviada.academia.status === 'pending' && enviada.academia.nome_solicitante === 'Joana Dona' && enviada.academia.contato_solicitante === '11988880001', 'academia nova vai para análise com os dados da conta, sem perguntar de novo');
  ok(enviada.pedido === 'Academia Nova da Joana' && enviada.texto.includes('você já administra a ficha'), 'a academia nova vira o pedido da conta');
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
  await page.click('[data-aprovar-pedido="u-joana"]');
  await page.waitForTimeout(400);
  let joana = await page.evaluate(() => window.__db.academia_acessos.find(x => x.user_id === 'u-joana'));
  ok(joana.academia_id === 'a1' && joana.papel === 'principal' && !joana.pedido_academia_id, 'aprovar liga a conta à academia, como responsável principal');
  await page.evaluate(async () => { await sb.from('academias').update({ status: 'published' }).eq('id', 'n9'); });
  const pedro = await page.evaluate(() => window.__db.academia_acessos.find(x => x.user_id === 'u-pedro'));
  ok(pedro.academia_id === 'n9' && pedro.papel === 'principal', 'publicar a academia nova libera a conta de quem mandou');
  await browser.close();

  // Veio da ficha ("Gerencie a ficha…"), sem conta: o pedido sai junto com a conta.
  ({ browser, page } = await abrir({ q: 'parceiros/cadastro?academia=a2' }));
  ok((await texto(page, '.pc-reivindicar')).includes('Administrar a ficha da Quadra Locação') && (await texto(page, '.pc-reivindicar')).includes('Comece pelo seu e-mail'), 'link da ficha: começa pelo e-mail, já com a academia');
  await page.fill('#pc-email', 'dono@gmail.com');
  await page.click('#pc-email-continuar');
  await page.waitForTimeout(300);
  await page.fill('#pc-conta-nome', 'Dono Moema');
  await page.fill('#pc-conta-whatsapp', '11988880009');
  await page.fill('#pc-conta-senha', 'senhaforte1');
  await page.check('#pc-conta-aceite');
  await page.click('#pc-criar-conta');
  await page.waitForTimeout(900);
  const direto = await page.evaluate(() => ({ pedido: contaAcademia && contaAcademia.pedidoNome, sugestao: !!document.querySelector('.pc-sugerida'), link: location.pathname + location.search }));
  ok(direto.pedido === 'Quadra Locação' && !direto.sugestao && direto.link === '/parceiros/cadastro', 'conta criada pelo link da ficha já pede aquela academia (gmail não sugere nada)');
  await browser.close();

  // ---- entradas a partir do site dos jogadores ----
  ({ browser, page } = await abrir({}));
  const entradas = await page.evaluate(() => ({
    rodape: document.querySelector('.sitefooter a[data-pc="inicio"]')?.getAttribute('href'),
    bloco: document.querySelector('.ba-btn')?.getAttribute('href'),
  }));
  ok(entradas.rodape === '/parceiros' && entradas.bloco === '/parceiros', 'rodapé e bloco da home levam ao GuiaTennis Parceiros');
  await page.click('.ba-btn');
  await page.waitForTimeout(300);
  t = await tela(page);
  ok(t.aba === 'inicio' && t.link === '/parceiros', 'bloco da home abre a página inicial dos parceiros');
  await page.goBack();
  await page.waitForTimeout(300);
  await page.evaluate(() => { state.showMenu = true; render(); });
  await page.click('.menu-drawer [data-menu="parceiros"]');
  await page.waitForTimeout(300);
  t = await tela(page);
  ok(t.aba === 'inicio', 'menu do site abre o GuiaTennis Parceiros');
  await page.evaluate(() => { state.page = 'search'; state.view = 'list'; render(); });
  await page.click('#fab-add');
  await page.waitForTimeout(300);
  t = await tela(page);
  ok(t.aba === 'cadastro' && t.link === '/parceiros/cadastro', 'o "+" da busca leva ao cadastro dos parceiros, que procura antes de cadastrar');
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
  ok(caixa.every(c => /a partir de, por hora|Consulte/i.test(c.oferta)), 'a legenda do preço fica embaixo dos valores');
  await browser.close();

  // ---- página de quem está logado, sem login ----
  ({ browser, page } = await abrir({ q: 'parceiros/desempenho' }));
  t = await tela(page);
  ok(t.aba === 'entrar' && t.link === '/parceiros/entrar' && t.robots.includes('noindex'), 'Desempenho sem login pede para entrar — ' + t.link);
  await page.evaluate(() => {
    window.__db.academia_acessos.push({ user_id: 'u-a2', academia_id: 'a2', usuario: 'quadra.a2', nome_responsavel: 'Maria Teste', cargo: 'Gerente', email: 'm@t.com', whatsapp: '11900000001', termos_aceitos_em: '2026-09-01', dados_completos_em: '2026-09-01', senha_trocada_em: '2026-09-01' });
    window.__senhas['quadra.a2@acesso.guiatennis.com.br'] = 'senha12345';
  });
  await page.fill('#login-email', 'quadra.a2');
  await page.fill('#login-password', 'senha12345');
  await page.click('#login-submit');
  await page.waitForTimeout(600);
  t = await tela(page);
  ok(t.aba === 'desempenho' && t.link === '/parceiros/desempenho', 'depois de entrar, volta para a página que tinha pedido — ' + t.link);
  await browser.close();

  // ---- Desempenho no plano Básico ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/desempenho', plano: 'basico' }));
  t = await tela(page);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(t.h1 === 'Desempenho' && corpo.includes('Visitas na ficha') && corpo.includes('42') && corpo.includes('Contatos') && corpo.includes('9'), 'Básico: visitas e contatos dos últimos 30 dias');
  ok(corpo.includes('21%') && corpo.includes('Taxa de contato'), 'taxa de contato calculada — 9 de 42');
  let chips = await page.evaluate(() => [...document.querySelectorAll('.pc-periodos .chip')].map(c => c.innerText.trim() + (c.classList.contains('pc-chip-trancado') ? '🔒' : '') + (c.classList.contains('active') ? '*' : '')));
  ok(chips.join() === '7 dias🔒,30 dias*,90 dias🔒,Desde o começo🔒', 'Básico: só 30 dias; o resto aparece trancado — ' + chips.join());
  ok(await page.evaluate(() => document.querySelectorAll('.pc-graf').length) === 0 && corpo.includes('Disponível no plano Completo'), 'Básico: sem gráfico, com o convite do plano Completo');
  const verPlanos = await page.evaluate(() => { const b = document.querySelector('.pc-trancado .pc-ver-planos'); const t = document.querySelector('.pc-trancado .pc-trancado-plano'); return b && t ? { texto: b.innerText, separado: b.getBoundingClientRect().top - t.getBoundingClientRect().bottom } : null; });
  ok(verPlanos && verPlanos.texto === 'Ver planos' && verPlanos.separado >= 8, '"Ver planos" num botão separado, embaixo — ' + JSON.stringify(verPlanos));
  ok(!corpo.includes('posição na busca') && /aprimore o plano/i.test(corpo) && corpo.includes('Quero o Completo'), 'Desempenho oferece o próximo plano e não fala de posição na busca');
  ok(!corpo.includes('Bairros de quem procurou') && !/\d+%\s+contra/.test(corpo), 'Básico: sem bairros e sem comparação com o período anterior');
  ok(JSON.stringify(await pedidos(page)) === '[30]', 'pede os números ao banco uma vez só');
  await page.click('.pc-chip-trancado');
  await page.waitForTimeout(200);
  t = await tela(page);
  ok(t.aba === 'plano' && t.h1 === 'Seu plano', 'período trancado leva aos planos');
  const meu = await page.evaluate(() => [...document.querySelectorAll('.pc-plano')].map(p => (p.querySelector('.pc-plano-tag')?.innerText || '-')).join());
  ok(meu === 'Seu plano,Recomendado,-', 'Plano marca o plano atual e recomenda o próximo — ' + meu);
  const quero = await page.evaluate(() => decodeURIComponent(document.querySelector('.pc-plano.destaque a')?.getAttribute('href') || ''));
  ok(quero.includes('plano Completo') && quero.includes('Quadra Locação') && await texto(page, '.pc-plano.destaque a') === 'Aprimorar para o Completo', '"Aprimorar para o Completo" abre o WhatsApp do guia com a academia — ' + quero.slice(0, 80));
  await browser.close();

  // ---- Desempenho no plano Completo ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/desempenho', plano: 'completo' }));
  corpo = await texto(page, '#parceiros .pc-main');
  const graficos = await page.evaluate(() => [...document.querySelectorAll('.pc-graf')].map(g => g.querySelector('strong').innerText + ':' + g.querySelectorAll('.pc-barra').length));
  ok(graficos.join() === 'Visitas por dia:30,Contatos por dia:30', 'Completo: um gráfico para visitas e outro para contatos, nunca dois eixos — ' + graficos.join());
  ok(corpo.includes('+40% contra o período anterior') && corpo.includes('igual ao período anterior'), 'Completo: comparação com o período anterior');
  ok(corpo.includes('Contatos por canal') && corpo.includes('WhatsApp') && corpo.includes('De onde vieram') && corpo.includes('Instagram') && corpo.includes('Aparelho') && corpo.includes('Celular'), 'Completo: canais, origem e aparelho');
  const titulosCompleto = await page.evaluate(() => [...document.querySelectorAll('.pc-card-t')].map(t => t.innerText));
  ok(corpo.includes('Disponível no plano Premium') && !titulosCompleto.includes('Bairros de quem procurou'), 'Completo: bairros trancados, com o convite do Premium');
  ok(await page.evaluate(() => !!document.querySelector('.pc-tabela table')), 'os números também em tabela');
  await page.hover('.pc-graf .pc-barra:last-child');
  const leitura = await texto(page, '.pc-graf .pc-graf-leitura');
  ok(leitura.startsWith('30/09:') && leitura.includes('visitas'), 'passar o dedo na coluna mostra o dia e o valor — ' + leitura);
  await page.click('.pc-periodos [data-pc-dias="90"]');
  await page.waitForTimeout(300);
  chips = await page.evaluate(() => [...document.querySelectorAll('.pc-periodos .chip')].map(c => c.innerText.trim() + (c.classList.contains('pc-chip-trancado') ? '🔒' : '') + (c.classList.contains('active') ? '*' : '')));
  ok(chips.join() === '7 dias,30 dias,90 dias*,Desde o começo🔒' && JSON.stringify(await pedidos(page)) === '[30,90]', 'Completo: troca para 90 dias; "desde o começo" é do Premium — ' + chips.join());
  await browser.close();

  // ---- Desempenho no plano Premium ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/desempenho', plano: 'premium' }));
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Bairros de quem procurou') && corpo.includes('Pinheiros, São Paulo') && corpo.includes('Comparação com São Paulo') && corpo.includes('Média das academias'), 'Premium: bairros e média das academias da cidade');
  ok(!corpo.includes('Disponível no plano'), 'Premium: nada trancado');
  await page.click('.pc-periodos [data-pc-dias="0"]');
  await page.waitForTimeout(300);
  const tudo = await page.evaluate(() => ({ graf: document.querySelector('.pc-graf strong')?.innerText, barras: document.querySelectorAll('.pc-graf')[0].querySelectorAll('.pc-barra').length }));
  ok(tudo.graf === 'Visitas por semana' && tudo.barras === 18 && JSON.stringify(await pedidos(page)) === '[30,0]', 'Premium: desde o começo, somado por semana — ' + JSON.stringify(tudo));
  await browser.close();

  // ---- painel logado, no computador ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/painel', w: 1280 }));
  t = await tela(page);
  const painel = await page.evaluate(() => ({
    nav: [...document.querySelectorAll('.pc-nav a')].map(a => a.innerText).join(' | '),
    quem: document.querySelector('.pc-quem')?.innerText || '',
    barra: !!document.querySelector('.pc-barra-baixo') && getComputedStyle(document.querySelector('.pc-barra-baixo')).display !== 'none',
    rodape: [...document.querySelectorAll('.pc-rodape a[data-pc]')].map(a => a.innerText).join(' | '),
  }));
  ok(t.h1 === 'Olá, Maria' && t.robots.includes('noindex'), 'painel cumprimenta o responsável e fica fora do Google');
  ok(painel.nav === 'Painel | Desempenho | Avaliações | Minha ficha | Plano | Conta | Ajuda' && painel.quem === 'Quadra Locação', 'logado, o menu vira o da academia, com o nome dela — ' + painel.nav);
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
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/desempenho', trocar: h => h.replace("sb.rpc('numeros_da_academia'", "sb.rpc('funcao_que_nao_existe'") }));
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Não consegui carregar os números agora') && await page.isVisible('.pc-main [data-pc-dias]'), 'sem os números: aviso simples e botão de tentar de novo');
  await browser.close();
  // ---- pessoas com acesso (responsável principal) e aprimorar o plano ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/conta' }));
  await page.waitForTimeout(300);
  let conta = await texto(page, '#parceiros .pc-main');
  ok(conta.includes('Responsável principal') && conta.includes('Pessoas com acesso') && conta.includes('1 de 2 no plano Básico') && conta.includes('Maria Teste (você)'), 'Conta mostra quem tem acesso e quantas pessoas o plano permite');
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
  ok(conta.includes('2 de 2 no plano Básico') && !(await page.isVisible('#pc-pessoa-email')) && conta.includes('No Completo, até 5') && conta.includes('Aprimorar para o Completo'), 'plano cheio: some o formulário e aparece o convite para aprimorar');
  ok(/aprimore o plano/i.test(conta) && conta.includes('Quero o Completo') && conta.includes('Até 5 pessoas com acesso à academia'), 'Conta oferece o próximo plano embaixo');
  page.once('dialog', d => d.accept());
  await page.click('[data-pc-remover]');
  await page.waitForTimeout(500);
  conta = await texto(page, '#parceiros .pc-main');
  ok(conta.includes('1 de 2 no plano Básico') && !conta.includes('Carlos Recepção'), 'o responsável principal remove a pessoa');
  await page.evaluate(() => { window.__db.academia_acessos.push({ user_id: 'u-outra', academia_id: 'a1', usuario: 'outra@exemplo.com', email: 'outra@exemplo.com' }); window.__pessoa = { nome: '', email: 'outra@exemplo.com' }; render(); });
  await page.click('#pc-pessoa-adicionar');
  await page.waitForTimeout(400);
  ok((await texto(page, '#parceiros .form-error')).includes('já tem acesso a uma academia'), 'e-mail de outra academia: avisa em palavras simples');
  await browser.close();

  // Quem é da equipe vê a lista, mas não mexe.
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/conta' }));
  await page.evaluate(async () => {
    window.__db.academia_acessos[0].papel = 'equipe';
    window.__db.academia_acessos.push({ user_id: 'u-dono', academia_id: 'a2', usuario: 'dono@quadra.com', nome_responsavel: 'Dono', email: 'dono@quadra.com', papel: 'principal', dados_completos_em: '2026-09-01' });
    await recarregarConta(); await carregarPessoas();
  });
  conta = await texto(page, '#parceiros .pc-main');
  ok(conta.includes('Você, na equipe') && conta.includes('Quem adiciona e remove pessoas é o responsável principal') && !(await page.isVisible('#pc-pessoa-email')) && !(await page.isVisible('[data-pc-remover]')), 'quem é da equipe vê a lista, sem adicionar nem remover');
  await browser.close();

  // Painel: QR da ficha e aprimorar; Premium mostra o que vem aí.
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/painel', plano: 'completo' }));
  let painelTexto = await texto(page, "#parceiros .pc-main");
  ok(painelTexto.includes('QR code da sua ficha no GuiaTennis') && painelTexto.includes('Aprimorar para o Premium') && painelTexto.includes('Plano atual: Completo'), 'painel: QR code da ficha e o atalho para aprimorar o plano');
  ok(painelTexto.includes('Quero o Premium') && painelTexto.includes('Bairros de quem procurou antes de abrir a ficha'), 'painel oferece o Premium com o que ele acrescenta');
  await browser.close();
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/painel', plano: 'premium' }));
  painelTexto = await texto(page, "#parceiros .pc-main");
  const novidade = await page.evaluate(() => decodeURIComponent(document.querySelector('.pc-oferta a')?.getAttribute('href') || ''));
  ok(/em breve no premium/i.test(painelTexto) && painelTexto.includes('Promoções na ficha e avisos para os seus alunos') && painelTexto.includes('Novidades do Premium') && novidade.includes('quero saber primeiro das novidades'), 'no Premium, o painel mostra o que vem aí e chama para saber primeiro');
  await browser.close();

  // ---- faixa escura no fim, como a do trivago ----
  ({ browser, page } = await abrir({ w: 1280 }));
  let faixa = await page.evaluate(() => ({ t: document.querySelector('.sitefooter + .rodape-faixa')?.innerText || '', cor: getComputedStyle(document.querySelector('.rodape-faixa')).backgroundColor }));
  ok(faixa.t.includes('GuiaTennis') && faixa.t.includes('Todos os direitos reservados') && faixa.t.includes('OpenStreetMap') && faixa.cor === 'rgb(29, 31, 28)', 'site dos jogadores termina com a faixa escura, como o trivago');
  await browser.close();
  ({ browser, page } = await abrir({ q: 'parceiros' }));
  faixa = await page.evaluate(() => ({ t: document.querySelector('.pc-rodape .rodape-faixa')?.innerText || '', largura: document.querySelector('.pc-rodape .rodape-faixa').getBoundingClientRect().width, tela: innerWidth, lateral: document.documentElement.scrollWidth > innerWidth }));
  ok(faixa.t.includes('Parceiros') && faixa.t.includes('Todos os direitos reservados') && faixa.largura === faixa.tela && !faixa.lateral, 'GuiaTennis Parceiros também, de ponta a ponta');
  await browser.close();

  // ---- avaliação: contato de academia não avalia ----
  ({ browser, page } = await abrir({}));
  await page.evaluate(() => { saveVisitor({ nome: 'Dono Disfarçado', contato: '(11) 99999-0001' }); openCourt('a2'); });
  await page.waitForTimeout(300);
  await page.click('#star-picker span[data-star="5"]');
  await page.check('#rate-consent');
  await page.click('#rate-submit');
  await page.waitForTimeout(500);
  const recusada = await page.evaluate(() => ({ erro: document.querySelector('.rate-box .form-error')?.innerText || '', n: window.__db.avaliacoes.length, obrigado: !!document.querySelector('.rate-thanks') }));
  ok(recusada.erro.includes('academias não avaliam academias') && recusada.n === 0 && !recusada.obrigado, 'visitante com o WhatsApp de uma academia não avalia, e a tela explica');
  await page.evaluate(() => { saveVisitor({ nome: 'Jogador', contato: '(11) 97777-1234' }); });
  await page.click('#rate-submit');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => window.__db.avaliacoes.length === 1 && !!document.querySelector('.rate-thanks')), 'jogador comum continua avaliando');
  await browser.close();
})();
