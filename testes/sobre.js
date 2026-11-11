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
const PARTES = ['Sobre o GuiaTennis', 'Nossa missão', 'O que fazemos', 'O que não fazemos', 'Quem paga o quê', 'Nossos compromissos', 'Fale com a gente'];

(async () => {
  // ---- Site dos jogadores: o rodapé leva ao /sobre ----
  let { browser, page } = await abrir({});
  await page.waitForTimeout(1200);
  ok((await texto(page, '.sitefooter')).includes('Sobre o GuiaTennis'), 'o rodapé tem "Sobre o GuiaTennis"');
  await page.click('.sitefooter a[data-menu="sobre"]');
  await page.waitForTimeout(500);
  let pag = await texto(page, '.pag-sobre');
  ok(await page.evaluate(() => state.page === 'sobre' && location.pathname === '/sobre'), 'abre o /sobre');
  ok(PARTES.every(p => pag.includes(p)), 'a página tem a missão, o que fazemos e não fazemos, quem paga o quê, os compromissos e o contato — ' + pag.slice(0, 200));
  ok(pag.includes('Patrocinado') && pag.includes('Não reservamos') && await page.$('.pag-sobre a[data-menu="search"]'), '"Patrocinado", o que não fazemos e "Buscar quadra"');
  ok(!/\bapp\b|aplicativo|clube|pôr|põe|ponha/i.test(pag), 'sem "app", "clube" nem "pôr"');
  let s = await seo(page);
  ok(s.titulo === 'Sobre o GuiaTennis' && s.canonica.endsWith('/sobre') && !s.robots.includes('noindex'), 'título, endereço oficial e no Google — ' + JSON.stringify(s));
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sem rolar para o lado no celular');
  await page.click('.pag-sobre [data-menu="privacidade"]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.showPrivacy === true), '"Política de Privacidade" abre a política');
  await browser.close();

  ({ browser, page } = await abrir({ q: 'sobre' }));
  await page.waitForTimeout(800);
  ok(await page.evaluate(() => state.page === 'sobre') && (await texto(page, '.pag-sobre')).includes('Nossa missão'), 'o link direto /sobre abre a página');
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
  pag = await texto(page, '.pc-sobre');
  ok(await page.evaluate(() => location.pathname === '/parceiros/sobre' && !state.pcMenu && state.page === 'parceiros'), 'abre o /parceiros/sobre, no próprio Parceiros');
  ok(PARTES.every(p => pag.includes(p)) && await page.$('.pc-sobre a[data-pc="cadastro"]') && !(await page.$('.pc-sobre [data-menu="search"]')), 'o mesmo texto, terminando em "Cadastrar minha academia"');
  s = await seo(page);
  ok(s.canonica.endsWith('/sobre') && !s.canonica.includes('/parceiros') && s.robots.includes('noindex'), 'o endereço oficial é o /sobre — ' + JSON.stringify(s));
  ok((await texto(page, '.pc-rodape')).includes('Sobre o GuiaTennis'), 'o rodapé do Parceiros tem "Sobre o GuiaTennis"');
  await browser.close();

  // ---- Parceiros com a academia: "Feedback" fora do menu e do alto, no rodapé ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel' }));
  await page.waitForTimeout(1000);
  await page.click('#pc-menu-btn');
  gaveta = await texto(page, '#pc-menu-overlay');
  ok(!gaveta.includes('Feedback') && gaveta.includes('Atualizações') && gaveta.includes('Sobre o GuiaTennis'), 'o menu da academia sem "Feedback" — ' + gaveta);
  const rodape = await page.evaluate(() => [...document.querySelectorAll('.pc-rodape-cols > div')].map(d => ({ h: d.querySelector('h4').innerText, links: [...d.querySelectorAll('a, button')].map(a => a.innerText.trim()) })));
  const g = rodape.find(c => c.h === 'GuiaTennis').links;
  ok(g.includes('Feedback') && g.includes('Sobre o GuiaTennis'), 'no rodapé, a coluna GuiaTennis tem "Sobre o GuiaTennis" e "Feedback" — ' + g.join(', '));
  await page.click('#pc-menu-overlay a[data-pc="sobre"]');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => location.pathname === '/parceiros/sobre') && !(await page.$('.pc-sobre a[data-pc="cadastro"]')), 'logado, a página não oferece cadastrar academia');
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
