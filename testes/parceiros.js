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
  ok(corpo.includes('A posição na busca é a mesma em todos os planos'), 'avisa que plano não compra posição');
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
  ok(tabela === '5,8,11', 'cada plano mostra o que libera, um acima do outro — ' + tabela);
  await page.click('.pc-nav a[data-pc="ajuda"]');
  await page.waitForTimeout(200);
  corpo = await texto(page, '#parceiros .pc-main');
  const faq = await page.evaluate(() => document.querySelectorAll('#parceiros .pc-faq details').length);
  ok(faq === 10 && corpo.includes('Pagar um plano deixa a minha academia na frente?') && corpo.includes('Esqueci a senha'), 'Ajuda com as perguntas das academias — ' + faq);
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

  // ---- cadastro: primeiro procura, depois cadastra ----
  ({ browser, page } = await abrir({ q: 'parceiros/cadastro' }));
  t = await tela(page);
  ok(t.h1 === 'Cadastre a sua academia' && !t.robots, 'Cadastro tem página própria');
  await page.fill('#pc-busca', 'quadra');
  await page.waitForTimeout(100);
  let achadas = await page.evaluate(() => [...document.querySelectorAll('.pc-achada .pc-card-t')].map(x => x.innerText));
  ok(achadas.join() === 'Quadra Locação' && await page.evaluate(() => document.activeElement.id === 'pc-busca'), 'procura a academia enquanto digita, sem perder o cursor — ' + achadas.join());
  await page.fill('#pc-busca', 'locacao');
  achadas = await page.evaluate(() => [...document.querySelectorAll('.pc-achada .pc-card-t')].map(x => x.innerText));
  ok(achadas.join() === 'Quadra Locação', 'acha sem acento também');
  await page.fill('#pc-busca', 'zzzz');
  ok((await texto(page, '#pc-resultados')).includes('Não achei nenhuma academia'), 'não achou: diz em palavras simples');
  await page.fill('#pc-busca', 'quadra');
  await page.click('[data-pc-minha]');
  await page.waitForTimeout(200);
  t = await tela(page);
  const pedido = await page.evaluate(() => ({ t: document.querySelector('.pc-reivindicar')?.innerText || '', wa: decodeURIComponent(document.querySelector('.pc-reivindicar a')?.getAttribute('href') || '') }));
  ok(pedido.t.includes('Pedir o acesso da Quadra Locação') && pedido.wa.includes('Sou responsável pela Quadra Locação') && t.link === '/parceiros/cadastro?academia=a2' && t.robots.includes('noindex'), '"É a minha": pede o acesso pelo WhatsApp, o link guarda a academia e fica fora do Google — ' + t.link);
  await page.click('.pc-reivindicar [data-pc-minha=""]');
  await page.waitForTimeout(200);
  t = await tela(page);
  ok(t.link === '/parceiros/cadastro' && await page.isVisible('#pc-busca'), '"Não é essa" volta para a busca');
  await page.click('#pc-nova');
  await page.waitForTimeout(300);
  ok((await texto(page, '#register-overlay .sheet-title')).length > 0 && await page.evaluate(() => state.page === 'parceiros'), '"Cadastrar academia nova" abre o formulário por cima do site dos parceiros');
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
  ok(!corpo.includes('Bairros de quem procurou') && !/\d+%\s+contra/.test(corpo), 'Básico: sem bairros e sem comparação com o período anterior');
  ok(JSON.stringify(await pedidos(page)) === '[30]', 'pede os números ao banco uma vez só');
  await page.click('.pc-chip-trancado');
  await page.waitForTimeout(200);
  t = await tela(page);
  ok(t.aba === 'plano' && t.h1 === 'Seu plano', 'período trancado leva aos planos');
  const meu = await page.evaluate(() => [...document.querySelectorAll('.pc-plano')].map(p => (p.querySelector('.pc-plano-tag')?.innerText || '-')).join());
  ok(meu === 'Seu plano,-,-', 'Plano marca o plano atual — ' + meu);
  const quero = await page.evaluate(() => decodeURIComponent(document.querySelector('.pc-plano.destaque a')?.getAttribute('href') || ''));
  ok(quero.includes('plano Completo') && quero.includes('Quadra Locação'), '"Quero o Completo" abre o WhatsApp do guia com a academia — ' + quero.slice(0, 80));
  await browser.close();

  // ---- Desempenho no plano Completo ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/desempenho', plano: 'completo' }));
  corpo = await texto(page, '#parceiros .pc-main');
  const graficos = await page.evaluate(() => [...document.querySelectorAll('.pc-graf')].map(g => g.querySelector('strong').innerText + ':' + g.querySelectorAll('.pc-barra').length));
  ok(graficos.join() === 'Visitas por dia:30,Contatos por dia:30', 'Completo: um gráfico para visitas e outro para contatos, nunca dois eixos — ' + graficos.join());
  ok(corpo.includes('+40% contra o período anterior') && corpo.includes('igual ao período anterior'), 'Completo: comparação com o período anterior');
  ok(corpo.includes('Contatos por canal') && corpo.includes('WhatsApp') && corpo.includes('De onde vieram') && corpo.includes('Instagram') && corpo.includes('Aparelho') && corpo.includes('Celular'), 'Completo: canais, origem e aparelho');
  ok(corpo.includes('Disponível no plano Premium') && !corpo.includes('Bairros de quem procurou'), 'Completo: bairros trancados, com o convite do Premium');
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
})();
