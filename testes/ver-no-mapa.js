// Pedido do Breno em 29/10/2026 (regra 170): "o botão ver no mapa deve
// direcionar para o mapa do GuiaTennis onde tem as quadras". O "Ver no mapa"
// da ficha abre o mapa da busca já na academia, com o cartão dela e o "Como
// chegar". Regra 173: "tire as opções de como chegar e faça que o celular
// ofereça as opções a ela pelo navegador": o "Como chegar" é um link direto
// (no Android, "geo:", que faz o celular perguntar com qual aplicativo abrir;
// no iPhone, o Mapas; no computador, a rota no Google Maps).
const { abrir, ok } = require('./harness');

(async () => {
  let { browser, page } = await abrir({ q: 'academia/so-aula-tennis-a1', w: 390 });
  await page.waitForTimeout(500);
  const botoes = await page.evaluate(() => [...document.querySelectorAll('[data-nav="a1"]')].map(b => b.innerText.trim() || b.getAttribute('aria-label')));
  ok(botoes.length >= 2 && botoes.every(t => /^Ver no mapa/.test(t)) && !botoes.some(t => /direções/.test(t)), 'na ficha, os botões dizem "Ver no mapa" — ' + botoes.join(' | '));
  const link = await page.evaluate(() => { const a = document.querySelector('#ht-local [data-como-chegar="a1"]'); return a && { tag: a.tagName, t: a.innerText.trim(), href: a.getAttribute('href'), alvo: a.getAttribute('target') }; });
  ok(link && link.tag === 'A' && link.t === 'Como chegar' && link.href.startsWith('https://www.google.com/maps/dir/?api=1&destination=') && link.alvo === '_blank', 'o "Como chegar" é um link direto (no computador, a rota no Google Maps, numa aba nova), sem a tela de opções — ' + JSON.stringify(link));
  const celular = await page.evaluate(() => {
    const c = state.allCourts.find(x => x.id === 'a1');
    const original = navigator.userAgent;
    const como = (ua) => { Object.defineProperty(navigator, 'userAgent', { get: () => ua, configurable: true }); return linkComoChegar(c); };
    const res = { android: como('Mozilla/5.0 (Linux; Android 14; Pixel 8)'), iphone: como('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'), sem: (() => { Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (Linux; Android 14)', configurable: true }); return linkComoChegar({ ...c, lat: null, lng: null }); })() };
    const r = res;
    Object.defineProperty(navigator, 'userAgent', { get: () => original, configurable: true });
    return r;
  });
  ok(/^geo:-?\d+(\.\d+)?,-?\d+(\.\d+)?\?q=-?\d+(\.\d+)?,-?\d+(\.\d+)?\(S%C3%B3%20Aula%20Tennis\)$/.test(celular.android), 'no Android, o link "geo:" faz o celular oferecer os aplicativos de mapa — ' + celular.android);
  ok(celular.iphone.startsWith('https://maps.apple.com/?daddr='), 'no iPhone, abre o Mapas do aparelho — ' + celular.iphone);
  ok(celular.sem.startsWith('geo:0,0?q=') && celular.sem.length > 12, 'sem ponto no mapa, o celular procura pelo endereço — ' + celular.sem);
  // Um filtro que esconderia a academia sai.
  await page.evaluate(() => { state.modalidadeFilters = ['locacao']; });
  await page.evaluate(() => document.querySelector('.ht-atalhos [data-nav="a1"]').click());
  await page.waitForTimeout(600);
  const mapa = await page.evaluate(() => ({ page: state.page, view: state.view, sel: state.mapSelected, url: location.pathname + location.search, filtros: state.modalidadeFilters.length, card: document.getElementById('map-card')?.innerText.replace(/\s+/g, ' ').trim(), pino: !!document.getElementById('map'), link: document.querySelector('#map-card a[data-como-chegar="a1"]')?.getAttribute('href') || '' }));
  ok(mapa.page === 'search' && mapa.view === 'map' && mapa.url === '/busca?ver=mapa' && mapa.pino, 'abre o mapa do GuiaTennis, com as quadras — ' + mapa.url);
  ok(mapa.sel === 'a1' && mapa.card.startsWith('Só Aula Tennis') && mapa.card.endsWith('Como chegar') && mapa.link.startsWith('https://www.google.com/maps/dir/'), 'já na academia: o cartão dela embaixo, com o link "Como chegar" — ' + mapa.card);
  ok(mapa.filtros === 0, 'o filtro que escondia a academia saiu');
  ok(!(await page.$('#nav-overlay')), 'sem a tela com Google Maps e Waze');
  await page.goBack();
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => state.page === 'court' && location.pathname === '/academia/so-aula-tennis-a1'), 'voltar leva de novo à ficha');
  await browser.close();

  // Sem ponto no mapa: o "Ver no mapa" abre direto o "Como chegar".
  ({ browser, page } = await abrir({ q: 'academia/so-aula-tennis-a1', w: 390 }));
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.open = (u) => { window.__aberto = u; }; const c = state.allCourts.find(x => x.id === 'a1'); c.lat = null; c.lng = null; document.querySelector('[data-nav="a1"]').click(); });
  await page.waitForTimeout(300);
  const sem = await page.evaluate(() => ({ page: state.page, aberto: window.__aberto || '', tela: !!document.getElementById('nav-overlay') }));
  ok(sem.page === 'court' && sem.aberto.startsWith('https://www.google.com/maps/dir/?api=1&destination=') && !sem.tela, 'academia sem ponto no mapa: abre o "Como chegar" pelo endereço, sem sair da ficha — ' + sem.aberto);
  await browser.close();
})();
