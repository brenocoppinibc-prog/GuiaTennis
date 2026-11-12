// Sobre o GuiaTennis (regra 248, 11/11/2026: "do parceiros, tire o slot
// feedback do menu junto com a academia e tire o pq do GuiaTennis no menu do
// parceiros acho legal criar uma página falando sobre a gente ou o nome que os
// sites grandes dão"): /sobre e /parceiros/sobre, com o mesmo texto; no menu do
// Parceiros, sem "Benefícios" e sem "Feedback".
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' '), sel);
const seo = (page) => page.evaluate(() => ({
  titulo: document.title,
  canonica: document.querySelector('link[rel="canonical"]')?.href || '',
  robots: document.querySelector('meta[name="robots"]')?.content || '',
}));
const PARTES = ['Um guia de quadras de tênis feito por um professor', 'Nossa história', 'O site', 'Equipe', 'Contato', 'Breno Coppini', 'Perdizes'];

(async () => {
  // ---- Site dos jogadores: o rodapé leva ao /sobre ----
  let { browser, page } = await abrir({});
  await page.waitForTimeout(1200);
  ok((await texto(page, '.sitefooter')).includes('Sobre nós'), 'o rodapé tem "Sobre nós" (regra 253)');
  await page.click('.sitefooter a[data-menu="sobre"]');
  await page.waitForTimeout(500);
  let pag = await texto(page, '.pag-sobre');
  ok(await page.evaluate(() => state.page === 'sobre' && location.pathname === '/sobre'), 'abre o /sobre');
  ok(PARTES.every(p => pag.includes(p)), 'a página tem a missão, o que fazemos e não fazemos, quem paga o quê, os compromissos e o contato — ' + pag.slice(0, 200));
  ok(await page.$('.pag-sobre a[data-menu="search"]') && await page.evaluate(() => document.querySelector('.sb-nav-i.on')?.innerText === 'Nossa história'), 'abre na aba "Nossa história", com "Buscar quadra"');
  // Regra 256: as abas, cada uma com o seu endereço, como a página da empresa do trivago.
  await page.click('[data-sobre-aba="site"]');
  await page.waitForTimeout(900);
  ok(await page.evaluate(() => { const r = document.getElementById('sobre-site').getBoundingClientRect(), t = document.querySelector('.sb-topo').getBoundingClientRect(); return Math.abs(r.top - t.bottom) < 40; }), 'tocar em "O site" leva à parte, logo embaixo do menu');
  let aba = await texto(page, '.pag-sobre');
  ok(await page.evaluate(() => location.pathname === '/sobre/site') && aba.includes('Perto de você') && aba.includes('Grátis para quem joga') && aba.includes('Patrocinado') && aba.includes('não reserva') && aba.includes('Compromissos'),
    'aba "O site": o que faz, grátis para quem joga e compromissos, em /sobre/site');
  ok(await page.evaluate(() => document.title === 'O site · Sobre o GuiaTennis'), 'o título da aba — ' + await page.title());
  await page.click('.pag-sobre [data-menu="privacidade"]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.showPrivacy === true), '"Política de Privacidade" abre a política');
  await page.evaluate(() => { state.showPrivacy = false; render(); });
  await page.click('[data-sobre-aba="equipe"]');
  await page.waitForTimeout(300);
  aba = await texto(page, '.pag-sobre');
  ok(await page.evaluate(() => location.pathname === '/sobre/equipe') && aba.includes('Fundador e criador do GuiaTennis') && aba.includes('Carla Di Pierro') && aba.includes('Morumbi'), 'aba "Equipe": o Breno, com o cargo e a formação, em /sobre/equipe');
  await page.click('[data-sobre-aba="contato"]');
  await page.waitForTimeout(300);
  aba = await texto(page, '.pag-sobre');
  ok(await page.evaluate(() => location.pathname === '/sobre/contato') && ['Chat de ajuda', 'WhatsApp', 'Instagram', 'E-mail', 'Respostas na hora', 'GuiaTennis Parceiros'].every(t => aba.includes(t)), 'aba "Contato": os quatro canais, para que serve cada um, e o Parceiros');
  // Regra 257: rolar acende a parte no menu e troca o endereço.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const e = document.getElementById('sobre-equipe'); window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 60); });
  await page.waitForTimeout(700);
  ok(await page.evaluate(() => document.querySelector('.sb-nav-i.on')?.innerText === 'Equipe' && location.pathname === '/sobre/equipe'), 'rolar até a Equipe acende "Equipe" no menu e troca o endereço');
  ok(await page.evaluate(() => { const t = document.querySelector('.sb-topo').getBoundingClientRect(); return t.top === 0 && getComputedStyle(document.querySelector('.sb-topo')).position === 'sticky'; }), 'o menu do Sobre fica fixo no alto');
  ok(await page.evaluate(() => !document.querySelector('#site-header, .home-head')), 'o Sobre tem o menu dele, no lugar do cabeçalho do site');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  ok(!/\bapp\b|aplicativo|clube|pôr|põe|ponha/i.test(pag), 'sem "app", "clube" nem "pôr"');
  // Regra 255 ("está com cara de ia"): só texto, sem cartões, ícones, grade nem números.
  ok(await page.evaluate(() => !document.querySelector('.pag-sobre .sb-sec svg, .pag-sobre .sb-hero svg, .pag-sobre img, .pag-sobre .sobre-cartao')), 'a página é só texto: sem cartões, ícones, grade nem números');
  let s = await seo(page);
  ok(s.titulo === 'Sobre o GuiaTennis' && s.canonica.endsWith('/sobre') && !s.robots.includes('noindex'), 'título, endereço oficial e no Google — ' + JSON.stringify(s));
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sem rolar para o lado no celular');
  await browser.close();

  ({ browser, page } = await abrir({ q: 'sobre/equipe' }));
  await page.waitForTimeout(800);
  ok(await page.evaluate(() => state.page === 'sobre' && state.sobreAba === 'equipe' && document.querySelector('.sb-nav-i.on')?.innerText === 'Equipe'), 'o link direto /sobre/equipe abre a aba Equipe');
  await browser.close();

  // ---- Regra 250: a caixa antes do rodapé, o Sobre junto do Feedback e os textos corrigidos ----
  ({ browser, page } = await abrir({}));
  await page.waitForTimeout(1200);
  const caixa = await page.evaluate(() => {
    const c = document.querySelector('.caixa-feedback'), f = document.querySelector('.sitefooter');
    return { txt: c ? c.innerText.replace(/\s+/g, ' ') : '', antes: !!(c && f && (c.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING)), botao: !!c?.querySelector('a[data-ir-feedback]') };
  });
  ok(caixa.txt.includes('Esta página ajudou você?') && caixa.txt.includes('Faça o seu feedback') && caixa.antes && caixa.botao, 'a caixa "Esta página ajudou você?" antes do rodapé, com "Faça o seu feedback" — ' + caixa.txt);
  const colunaGuia = await page.evaluate(() => [...document.querySelectorAll('.sitefooter .sf-col')].map(d => ({ h: d.querySelector('h4')?.innerText, l: [...d.querySelectorAll('a, button')].map(a => a.innerText.trim()) })).find(c => c.h === 'GuiaTennis'));
  const colunaSuporte = await page.evaluate(() => [...document.querySelectorAll('.sitefooter .sf-col')].map(d => ({ h: d.querySelector('h4')?.innerText, l: [...d.querySelectorAll('a, button')].map(a => a.innerText.trim()) })).find(c => c.h === 'Suporte'));
  const ordem = await page.evaluate(() => [...document.querySelectorAll('.sitefooter .sf-col h4')].map(h => h.innerText).filter(t => t !== 'Quadras por cidade').join('|'));
  ok(ordem === 'GuiaTennis|Suporte|Termos e políticas', 'regra 254: no rodapé, GuiaTennis, Suporte e Termos e políticas por último — ' + ordem);
  ok(colunaGuia && colunaGuia.l.join('|') === 'Sobre nós|Instagram|WhatsApp|E-mail' && colunaSuporte.l.includes('Chat de ajuda') && colunaSuporte.l.includes('Feedback') && !(await texto(page, '.sitefooter')).includes('Fale com a gente'),
    'regra 253: no rodapé, Suporte com o Chat de ajuda e o Feedback, e a coluna GuiaTennis com Sobre nós, Instagram, WhatsApp e E-mail — ' + JSON.stringify([colunaSuporte, colunaGuia]));
  const home = await texto(page, '#app');
  ok(home.includes('Saibro ou rápida, coberta ou descoberta, aula ou locação:') && !home.includes('estacionamento, vestiário') && home.includes('quais dias e horários prefere') && !home.includes('o dia e o horário que prefere'), 'as dicas com o texto novo');
  ok(await page.evaluate(() => document.getElementById('app').textContent.includes('também ficam perto do endereço buscado')), '"Como funciona a ordem" diz que as patrocinadas também ficam perto do endereço');
  await page.evaluate(() => { state.showMenu = true; render(); });
  await page.waitForTimeout(200);
  ok((await texto(page, '.menu-links')).includes('Sobre o GuiaTennis Feedback'), 'no menu, "Sobre o GuiaTennis" junto do "Feedback"');
  await page.evaluate(() => { state.showMenu = false; render(); });
  await page.click('.caixa-feedback a[data-ir-feedback]');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => location.pathname === '/feedback') && !(await page.$('.caixa-feedback')), '"Faça o seu feedback" abre o /feedback, que não repete a caixa');
  await browser.close();
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel' }));
  await page.waitForTimeout(1000);
  ok((await texto(page, '.caixa-feedback')).includes('Esta página ajudou você?') && await page.$('.caixa-feedback a[data-pc="feedback"]'), 'no Parceiros, a mesma caixa antes do rodapé');
  await page.click('.caixa-feedback a[data-pc="feedback"]');
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => location.pathname === '/parceiros/feedback') && !(await page.$('.caixa-feedback')), 'no Parceiros, leva ao Feedback, que não repete a caixa');
  await browser.close();

  ({ browser, page } = await abrir({ q: 'sobre' }));
  await page.waitForTimeout(800);
  ok(await page.evaluate(() => state.page === 'sobre') && (await texto(page, '.pag-sobre')).includes('Breno Coppini'), 'o link direto /sobre abre a página');
  await browser.close();

  // ---- Parceiros sem conta: o menu sem "Benefícios", com "Sobre o GuiaTennis" ----
  ({ browser, page } = await abrir({ q: 'parceiros' }));
  await page.waitForTimeout(800);
  await page.click('#pc-menu-btn');
  let gaveta = await texto(page, '#pc-menu-overlay');
  ok(!gaveta.includes('Benefícios') && gaveta.includes('Sobre o GuiaTennis'), 'o menu do Parceiros sem "Benefícios" e com "Sobre o GuiaTennis" — ' + gaveta);
  ok(await page.$('#pc-beneficios'), '"Por que estar no GuiaTennis" continua na página inicial');
  await page.click('#pc-menu-overlay a[data-pc="sobre"]');
  await page.waitForTimeout(500);
  pag = await texto(page, '.pag-sobre');
  ok(await page.evaluate(() => location.pathname === '/parceiros/sobre' && !state.pcMenu && state.page === 'parceiros'), 'abre o /parceiros/sobre, no próprio Parceiros');
  ok(PARTES.every(p => pag.includes(p)) && await page.$('.pag-sobre a[data-pc="cadastro"]') && !(await page.$('.pag-sobre [data-menu="search"]')), 'o mesmo texto, terminando em "Cadastrar minha academia"');
  s = await seo(page);
  ok(s.canonica.endsWith('/sobre') && !s.canonica.includes('/parceiros') && s.robots.includes('noindex'), 'o endereço oficial é o /sobre — ' + JSON.stringify(s));
  ok((await texto(page, '.pc-rodape')).includes('Sobre nós'), 'o rodapé do Parceiros tem "Sobre nós"');
  await page.click('.pag-sobre [data-sobre-aba="equipe"]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => location.pathname === '/parceiros/sobre') && (await texto(page, '.pag-sobre')).includes('Fundador e criador do GuiaTennis'), 'no Parceiros, as abas mudam na tela, sem sair do /parceiros/sobre');
  await browser.close();

  // ---- Parceiros com a academia: "Feedback" fora do menu e do alto, no rodapé ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel' }));
  await page.waitForTimeout(1000);
  await page.click('#pc-menu-btn');
  gaveta = await texto(page, '#pc-menu-overlay');
  ok(!gaveta.includes('Feedback') && gaveta.includes('Atualizações') && gaveta.includes('Sobre o GuiaTennis'), 'o menu da academia sem "Feedback" — ' + gaveta);
  const rodape = await page.evaluate(() => [...document.querySelectorAll('.pc-rodape-cols > div')].map(d => ({ h: d.querySelector('h4').innerText, links: [...d.querySelectorAll('a, button')].map(a => a.innerText.trim()) })));
  const g = rodape.find(c => c.h === 'GuiaTennis').links, sup = rodape.find(c => c.h === 'Suporte').links;
  ok(g.join('|') === 'Sobre nós|Instagram|WhatsApp|E-mail|Site para jogadores' && sup.join('|') === 'Perguntas frequentes|Chat de ajuda|Feedback' && rodape.some(c => c.h === 'Termos e políticas'),
    'regra 253: no Parceiros, Suporte com o Chat de ajuda e o Feedback, GuiaTennis com Sobre nós e os contatos — ' + JSON.stringify(rodape.slice(1)));
  await page.click('#pc-menu-overlay a[data-pc="sobre"]');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => location.pathname === '/parceiros/sobre') && !(await page.$('.pag-sobre a[data-pc="cadastro"]')), 'logado, a página não oferece cadastrar academia');
  await browser.close();

  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel', w: 1280 }));
  await page.waitForTimeout(1000);
  const nav = await texto(page, '.pc-nav');
  ok(!nav.includes('Feedback') && nav.includes('Pagamentos'), 'no computador, o menu de cima sem "Feedback" — ' + nav);
  await page.goto(page.url().replace(/\/parceiros\/.*$/, '/parceiros/feedback'));
  await page.waitForTimeout(1000);
  ok(await page.evaluate(() => location.pathname === '/parceiros/feedback') && (await texto(page, '#app')).includes('Feedback da'), 'a página Feedback continua abrindo pelo rodapé e pelo link');
  await browser.close();
})();
