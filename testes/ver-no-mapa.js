// Pedido do Breno em 29/10/2026 (regra 170): "o botão ver no mapa deve
// direcionar para o mapa do GuiaTennis onde tem as quadras". O "Ver no mapa"
// da ficha abre o mapa da busca já na academia, com o cartão dela e o "Como
// chegar". Regra 173: "tire as opções de como chegar e faça que o celular
// ofereça as opções a ela pelo navegador": o "Como chegar" é um link direto
// (no Android, "geo:", que faz o celular perguntar com qual aplicativo abrir;
// no iPhone, o Mapas; no computador, a rota no Google Maps). Regra 191
// (01/11/2026): "no mapa uma miniatura completa como está na lista" e "na
// lista, a partir de acima da escrita sobre a modalidade".
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
  const mapa = await page.evaluate(() => ({ page: state.page, view: state.view, sel: state.mapSelected, url: location.pathname + location.search, filtros: state.modalidadeFilters.length, card: document.querySelector('#map-card .rcard')?.innerText.replace(/\s+/g, ' ').trim(), pino: !!document.getElementById('map'), link: document.querySelector('#map-card a[data-como-chegar="a1"]')?.getAttribute('href') || '' }));
  ok(mapa.page === 'search' && mapa.view === 'map' && mapa.url === '/busca?ver=mapa' && mapa.pino, 'abre o mapa do GuiaTennis, com as quadras — ' + mapa.url);
  ok(mapa.sel === 'a1' && mapa.card.startsWith('Só Aula Tennis') && mapa.card.endsWith('Como chegar') && mapa.link.startsWith('https://www.google.com/maps/dir/'), 'já na academia: o cartão dela embaixo, com o link "Como chegar" — ' + mapa.card);
  ok(mapa.filtros === 0, 'o filtro que escondia a academia saiu');
  ok(!(await page.$('#nav-overlay')), 'sem a tela com Google Maps e Waze');
  await page.goBack();
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => state.page === 'court' && location.pathname === '/academia/so-aula-tennis-a1'), 'voltar leva de novo à ficha');
  await browser.close();

  // Regra 191: o cartão do mapa é o mesmo da lista.
  ({ browser, page } = await abrir({ q: 'busca?q=Pinheiros', w: 390 }));
  await page.waitForTimeout(600);
  await page.evaluate(() => verNoMapaDoGuia('a1'));
  await page.waitForTimeout(600);
  const cheio = await page.evaluate(() => {
    const c = document.querySelector('#map-card .rcard');
    const x = document.getElementById('map-card-close').getBoundingClientRect();
    const lista = renderCard(getResults().find(r => r.id === 'a1'), '');
    const tmp = document.createElement('div'); tmp.innerHTML = lista;
    return { igual: c && c.querySelector('.offer').innerHTML === tmp.querySelector('.offer').innerHTML && c.querySelector('.rcard-info').innerHTML === tmp.querySelector('.rcard-info').innerHTML,
      partes: c && ['.rcard-name', '.rcard-score', '.offer-btn', '.offer-contact', '[data-fav]', '[data-share-card]'].every(s => c.querySelector(s)),
      xFora: x.bottom <= c.getBoundingClientRect().top };
  });
  ok(cheio.igual && cheio.partes && cheio.xFora, 'no mapa, o cartão completo da lista (nota, endereço, estrutura, preço, "Ver academia", WhatsApp, favoritar e compartilhar), com o ✕ em cima, fora dele — ' + JSON.stringify(cheio));
  await page.evaluate(() => { window.open = () => {}; window.__db.cliques = []; document.querySelector('#map-card .offer-contact').addEventListener('click', e => e.preventDefault()); });
  await page.click('#map-card .offer-contact');
  await page.waitForTimeout(300);
  const wa = await page.evaluate(() => ({ cliques: (window.__db.cliques || []).filter(x => x.tipo === 'whatsapp' && x.academia_id === 'a1').length, page: state.page }));
  ok(wa.cliques === 1 && wa.page === 'search', 'o WhatsApp do cartão do mapa conta uma vez só e não abre a ficha — ' + JSON.stringify(wa));
  await page.click('#map-card [data-fav="a1"]');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => (isFavorite('a1') || !!document.querySelector('#jogador-overlay.open')) && state.page === 'search' && state.view === 'map'), 'favoritar no cartão do mapa faz o mesmo que na lista (sem conta, pede para entrar), sem sair do mapa');
  await page.evaluate(() => document.getElementById('map-card-close').click());
  await page.waitForTimeout(200);
  ok(!(await page.$('#map-card .rcard')), 'o ✕ fecha o cartão');
  await browser.close();

  // Regra 191: na lista, o "a partir de" vem em cima da modalidade.
  ({ browser, page } = await abrir({ q: 'busca?q=Pinheiros', w: 390 }));
  await page.waitForTimeout(600);
  await page.evaluate(async () => {
    Object.assign(window.__db.academias.find(x => x.id === 'a1'), { modalidades: ['aulas_proprias', 'locacao'], catalogo: [{ tipo: 'individual', cobranca: 'avulsa', preco: '150' }, { tipo: 'locacao', cobranca: 'avulsa', preco: '130' }] });
    await loadEverything(); state.page = 'search'; state.view = 'list'; render();
  });
  await page.waitForTimeout(300);
  const precos = await page.evaluate(() => { const o = document.querySelector('.rcard[data-open="a1"] .offer-precos'); return o && [...o.children].map(x => x.innerText.replace(/\s+/g, ' ').trim()).join(' | '); });
  ok(precos === 'a partir de | Locação R$ 130/h Aula R$ 150/aula', 'na lista, "a partir de" em cima da modalidade e do preço — ' + precos);
  await page.evaluate(async () => { Object.assign(window.__db.academias.find(x => x.id === 'a1'), { catalogo: [], price_aula: null, price_locacao: null }); await loadEverything(); render(); });
  await page.waitForTimeout(300);
  const sem2 = await page.evaluate(() => [...document.querySelector('.rcard[data-open="a1"] .offer-precos').children].map(x => x.innerText.replace(/\s+/g, ' ').trim()).join(' | '));
  ok(!sem2.includes('a partir de') && sem2.endsWith('fale com a academia'), 'sem preço, nada de "a partir de": "Sob consulta" e "fale com a academia" embaixo — ' + sem2);
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
