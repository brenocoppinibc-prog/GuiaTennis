// Pedido do Breno em 29/10/2026 (regra 170): "o botão ver no mapa deve
// direcionar para o mapa do GuiaTennis onde tem as quadras". O "Ver no mapa"
// da ficha abre o mapa da busca já na academia, com o cartão dela e o "Como
// chegar". Regra 173: "tire as opções de como chegar e faça que o celular
// ofereça as opções a ela pelo navegador": o "Como chegar" é um link direto
// (no Android, "geo:", que faz o celular perguntar com qual aplicativo abrir;
// no iPhone, o Mapas; no computador, a rota no Google Maps). Regra 191
// (01/11/2026): "no mapa uma miniatura completa como está na lista" e "na
// lista, a partir de acima da escrita sobre a modalidade". Regra 192
// (01/11/2026): "tire o como chegar da prévia do mapa e deixe a apresentação
// mais de lado, inferior da tela como trivago, hoteis.com, booking". Regra
// 194 (02/11/2026): "coloque nos cards do mapa o botão ver academia e
// embaixo falar no WhatsApp com algum diferencial dessa academia".
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
  const mapa = await page.evaluate(() => ({ page: state.page, view: state.view, sel: state.mapSelected, url: location.pathname + location.search, filtros: state.modalidadeFilters.length, card: document.querySelector('#map-card [data-map-card="a1"]')?.innerText.replace(/\s+/g, ' ').trim(), pino: !!document.getElementById('map'), link: !!document.querySelector('#map-card [data-como-chegar]') }));
  ok(mapa.page === 'search' && mapa.view === 'map' && mapa.url === '/busca?ver=mapa' && mapa.pino, 'abre o mapa do GuiaTennis, com as quadras — ' + mapa.url);
  ok(mapa.sel === 'a1' && mapa.card.startsWith('Só Aula Tennis') && !mapa.card.includes('Como chegar') && !mapa.link, 'já na academia: o cartão dela embaixo, sem o "Como chegar" (regra 192) — ' + mapa.card);
  ok(mapa.filtros === 0, 'o filtro que escondia a academia saiu');
  ok(!(await page.$('#nav-overlay')), 'sem a tela com Google Maps e Waze');
  await page.goBack();
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => state.page === 'court' && location.pathname === '/academia/so-aula-tennis-a1'), 'voltar leva de novo à ficha');
  await browser.close();

  // Regra 192: os cartões deitados no rodapé do mapa, em carrossel.
  ({ browser, page } = await abrir({ q: 'busca?q=Pinheiros', w: 390 }));
  await page.waitForTimeout(600);
  await page.evaluate(async () => {
    const cv = document.createElement('canvas'); cv.width = 60; cv.height = 40;
    const g = cv.getContext('2d'); g.fillStyle = '#2E6B4F'; g.fillRect(0, 0, 60, 40);
    Object.assign(window.__db.academias.find(x => x.id === 'a1'), { photos: [cv.toDataURL('image/jpeg')], modalidades: ['aulas_proprias', 'locacao'], catalogo: [{ tipo: 'individual', cobranca: 'avulsa', preco: '150' }, { tipo: 'locacao', cobranca: 'avulsa', preco: '130' }] });
    await loadEverything();
    verNoMapaDoGuia('a1');
  });
  await page.waitForTimeout(700);
  const deitado = await page.evaluate(() => {
    const car = document.getElementById('map-carrossel');
    const c = car.querySelector('[data-map-card="a1"]');
    const foto = c.querySelector('.mcard-foto').getBoundingClientRect(), info = c.querySelector('.mcard-info').getBoundingClientRect(), r = c.getBoundingClientRect();
    const mapa = document.querySelector('.mapwrap').getBoundingClientRect();
    return { cartoes: car.querySelectorAll('[data-map-card]').length, comPonto: mapCourts(getResults()).length, on: c.classList.contains('on'),
      deitado: foto.right <= info.left + 1 && r.width > r.height, embaixo: mapa.bottom - r.bottom < 120 && r.top > mapa.top + mapa.height / 2,
      espia: car.scrollWidth > car.clientWidth, texto: c.innerText.replace(/\s+/g, ' ').trim(), comoChegar: !!car.querySelector('[data-como-chegar]'), fechar: !!document.getElementById('map-card-close') };
  });
  ok(deitado.cartoes === deitado.comPonto && deitado.cartoes > 1 && deitado.on && deitado.deitado && deitado.embaixo && deitado.espia, 'no mapa, um cartão deitado por academia, no rodapé, em carrossel (o próximo aparece na borda), com o da escolhida aceso — ' + JSON.stringify({ ...deitado, texto: undefined }));
  ok(deitado.texto === 'Só Aula Tennis — Sem nota ainda Pinheiros, São Paulo · 0 m de você a partir de Locação R$ 130/h Aula R$ 150/aula Ver academia Falar no WhatsApp · quadra coberta' && !deitado.comoChegar && !deitado.fechar, 'o cartão: a foto à esquerda e o nome, a nota, o endereço, o "a partir de" com os preços, "Ver academia" e, embaixo, "Falar no WhatsApp" com um diferencial (regra 194); sem o "Como chegar" — ' + deitado.texto);
  // Regra 194: o botão e o diferencial, numa linha só, de ponta a ponta do cartão.
  const linhaWa = await page.evaluate(() => { const c = document.querySelector('[data-map-card="a1"]'); const w = c.querySelector('.mcard-wa').getBoundingClientRect(), r = c.getBoundingClientRect(), t = c.querySelector('.mcard-wa-t').getBoundingClientRect(), b = c.querySelector('.mcard-btn').getBoundingClientRect(); return { ponta: Math.abs(w.left - r.left) < 2 && Math.abs(w.right - r.right) < 2, umaLinha: t.height < 24, botaoEmCima: b.bottom <= w.top + 1, botao: b.height >= 44 }; });
  ok(linhaWa.ponta && linhaWa.umaLinha && linhaWa.botaoEmCima && linhaWa.botao, '"Ver academia" (44px) em cima e o WhatsApp numa linha só, na largura do cartão — ' + JSON.stringify(linhaWa));
  const difs = await page.evaluate(() => [diferencialCurto({ amenities: ['camera', 'wifi'], cobertura: ['coberta'] }), diferencialCurto({ amenities: ['estacionamento_gratuito'] }), diferencialCurto({ amenities: [], modalidades: ['locacao'] })].join(' | '));
  ok(difs === 'câmera para gravar | estacionamento grátis | locação', 'o diferencial é o melhor que a academia tem, curto; sem nada, a modalidade — ' + difs);
  // Deslizar para o lado passa para a próxima academia e acende o pino dela.
  const outra = await page.evaluate(() => mapCourts(getResults()).find(c => c.id !== 'a1').id);
  await page.evaluate((id) => { const car = document.getElementById('map-carrossel'); const el = car.querySelector(`[data-map-card="${id}"]`); car.scrollLeft = el.offsetLeft - (car.clientWidth - el.offsetWidth) / 2; }, outra);
  await page.waitForTimeout(500);
  ok(await page.evaluate((id) => state.mapSelected === id && document.querySelector(`[data-map-card="${id}"]`).classList.contains('on') && !document.querySelector('[data-map-card="a1"]').classList.contains('on'), outra), 'deslizar para o lado escolhe a academia seguinte (o pino e o cartão dela acendem)');
  // Tocar no pino de outra academia leva o carrossel até o cartão dela.
  await page.evaluate(() => selectOnMap('a1'));
  await page.waitForTimeout(700);
  ok(await page.evaluate(() => { const car = document.getElementById('map-carrossel'); const el = car.querySelector('[data-map-card="a1"]'); return state.mapSelected === 'a1' && Math.abs(Math.max(0, el.offsetLeft - (car.clientWidth - el.offsetWidth) / 2) - car.scrollLeft) < 4; }), 'tocar no pino leva o carrossel até o cartão daquela academia');
  await page.evaluate(() => { window.open = () => {}; window.__db.cliques = []; document.querySelector('[data-map-card="a1"] .mcard-wa')?.addEventListener('click', e => e.preventDefault()); });
  const temWa = await page.$('[data-map-card="a1"] .mcard-wa');
  if (temWa) {
    await page.click('[data-map-card="a1"] .mcard-wa');
    await page.waitForTimeout(300);
  }
  const wa = await page.evaluate(() => ({ cliques: (window.__db.cliques || []).filter(x => x.tipo === 'whatsapp' && x.academia_id === 'a1').length, page: state.page }));
  ok(temWa && wa.cliques === 1 && wa.page === 'search', 'o WhatsApp do cartão do mapa conta uma vez só e não abre a ficha — ' + JSON.stringify(wa));
  await page.click('[data-map-card="a1"] [data-fav="a1"]');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => (isFavorite('a1') || !!document.querySelector('#jogador-overlay.open')) && state.page === 'search' && state.view === 'map'), 'favoritar no cartão do mapa faz o mesmo que na lista (sem conta, pede para entrar), sem sair do mapa');
  await page.evaluate(() => selectOnMap(null));
  await page.waitForTimeout(200);
  ok(!(await page.$('#map-carrossel')), 'tocar no mapa (fora dos pinos) fecha os cartões');
  await page.evaluate(() => selectOnMap('a1'));
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('[data-map-card="a1"] .mcard-nome').click());
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => state.page === 'court' && state.selected && state.selected.id === 'a1'), 'tocar no cartão abre a ficha');
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
