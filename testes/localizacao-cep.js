// Regra 279 (15/11/2026): "Quando clicar no botão de localização exata, aparecer
// o CEP que está sendo procurado. E as duas bolas girando ao mesmo tempo não fica
// tão legal."
const { abrir, ok } = require('./harness');

(async () => {
  const { browser, page } = await abrir();
  await page.route(/nominatim.*reverse/, route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ lat: '-23.561', lon: '-46.687', address: { suburb: 'Pinheiros', city: 'São Paulo', postcode: '05422-030' } }) }));
  await page.waitForTimeout(600);
  await page.evaluate(() => { navigator.geolocation.getCurrentPosition = (ok) => ok({ coords: { latitude: -23.561, longitude: -46.687 } }); });

  // Buscando: uma bolinha só, a do botão de buscar.
  let r = await page.evaluate(() => { state.searchStatus = 'loading'; render();
    const n = document.querySelectorAll('.searchcard .bola').length, alvo = document.getElementById('locate-btn');
    state.searchStatus = 'idle'; render(); return { n, alvoGira: !!alvo.querySelector('.bola'), alvoDesligado: alvo.disabled }; });
  ok(r.n === 1 && !r.alvoGira && r.alvoDesligado, 'buscando: uma bolinha só (no botão), o alvo parado e desligado — ' + JSON.stringify(r));

  await page.click('#locate-btn');
  await page.waitForTimeout(800);
  r = await page.evaluate(() => ({ campo: document.getElementById('cep-input')?.value, link: location.search, origem: state.origin && state.origin.bairro, pagina: state.page }));
  ok(r.pagina === 'search' && r.campo === '05422-030' && r.origem === 'Pinheiros', 'o campo mostra o CEP do lugar — ' + r.campo);
  ok(!/q=/.test(r.link) && !/05422/.test(r.link), 'o CEP não vai para o link (privacidade) — ' + r.link);

  // Sem CEP na resposta: o bairro e a cidade.
  await page.unroute(/nominatim.*reverse/);
  await page.evaluate(() => useMyLocation());
  await page.waitForTimeout(800);
  r = await page.evaluate(() => ({ campo: document.getElementById('cep-input')?.value, link: location.search }));
  ok(r.campo === 'Pinheiros, São Paulo' && !/q=/.test(r.link), 'sem CEP: "Pinheiros, São Paulo", também fora do link — ' + r.campo);

  // Digitou outra coisa: aí sim vai para o link.
  await page.fill('#cep-input', 'Moema');
  await page.click('#search-btn');
  await page.waitForTimeout(800);
  ok(/q=Moema/.test(await page.evaluate(() => location.search)), 'o que a pessoa digita vai para o link, como antes');

  await browser.close();
})();
