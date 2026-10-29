// Pedido do Breno em 29/10/2026 (regra 170): "o botão ver no mapa deve
// direcionar para o mapa do GuiaTennis onde tem as quadras". O "Ver no mapa"
// da ficha abre o mapa da busca já na academia, com o cartão dela e o "Como
// chegar" (Google Maps e Waze); sem ponto no mapa, abre o "Como chegar".
const { abrir, ok } = require('./harness');

(async () => {
  let { browser, page } = await abrir({ q: 'academia/so-aula-tennis-a1', w: 390 });
  await page.waitForTimeout(500);
  const botoes = await page.evaluate(() => [...document.querySelectorAll('[data-nav="a1"]')].map(b => b.innerText.trim() || b.getAttribute('aria-label')));
  ok(botoes.length >= 2 && botoes.every(t => /^Ver no mapa/.test(t)) && !botoes.some(t => /direções/.test(t)), 'na ficha, os botões dizem "Ver no mapa" — ' + botoes.join(' | '));
  ok((await page.evaluate(() => document.querySelector('#ht-local [data-como-chegar="a1"]')?.innerText.trim())) === 'Como chegar', 'e o "Como chegar" fica ao lado, na localização');
  // Um filtro que esconderia a academia sai.
  await page.evaluate(() => { state.modalidadeFilters = ['locacao']; });
  await page.evaluate(() => document.querySelector('.ht-atalhos [data-nav="a1"]').click());
  await page.waitForTimeout(600);
  const mapa = await page.evaluate(() => ({ page: state.page, view: state.view, sel: state.mapSelected, url: location.pathname + location.search, filtros: state.modalidadeFilters.length, card: document.getElementById('map-card')?.innerText.replace(/\s+/g, ' ').trim(), pino: !!document.getElementById('map') }));
  ok(mapa.page === 'search' && mapa.view === 'map' && mapa.url === '/busca?ver=mapa' && mapa.pino, 'abre o mapa do GuiaTennis, com as quadras — ' + mapa.url);
  ok(mapa.sel === 'a1' && mapa.card.startsWith('Só Aula Tennis') && mapa.card.endsWith('Como chegar'), 'já na academia: o cartão dela embaixo, com "Como chegar" — ' + mapa.card);
  ok(mapa.filtros === 0, 'o filtro que escondia a academia saiu');
  await page.click('#map-card [data-como-chegar="a1"]');
  await page.waitForTimeout(300);
  const nav = await page.evaluate(() => ({ t: document.querySelector('#nav-overlay .sheet-title')?.innerText, links: [...document.querySelectorAll('#nav-overlay a')].map(a => a.innerText.trim()).join(',') }));
  ok(nav.t === 'Como chegar' && nav.links === 'Google Maps,Waze', '"Como chegar" abre o Google Maps e o Waze — ' + nav.links);
  await page.click('#nav-close');
  await page.goBack();
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => state.page === 'court' && location.pathname === '/academia/so-aula-tennis-a1'), 'voltar leva de novo à ficha');
  await browser.close();

  // Sem ponto no mapa: o "Como chegar".
  ({ browser, page } = await abrir({ q: 'academia/so-aula-tennis-a1', w: 390 }));
  await page.waitForTimeout(500);
  await page.evaluate(() => { const c = state.allCourts.find(x => x.id === 'a1'); c.lat = null; c.lng = null; document.querySelector('[data-nav="a1"]').click(); });
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.page === 'court' && !!document.getElementById('nav-overlay')), 'academia sem ponto no mapa: abre o "Como chegar", sem sair da ficha');
  await browser.close();
})();
