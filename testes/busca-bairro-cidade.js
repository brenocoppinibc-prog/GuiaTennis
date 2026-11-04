// Pedido do Breno em 27/10/2026: "não funcionou colocando bairro e cidade"
// (print: "Vila Suzana, São Paulo" buscou "A partir de Hortolândia,
// Jundiaí"). O mapa devolvia primeiro uma Vila Suzana de outra cidade do
// estado; agora o lugar fica na cidade digitada, como no Google Maps.
const { abrir, ok } = require('./harness');

const SP = { lat: '-23.6105', lon: '-46.7348', display_name: 'Vila Suzana, Vila Andrade, São Paulo, Região Imediata de São Paulo, São Paulo, Brasil', address: { suburb: 'Vila Suzana', city_district: 'Vila Andrade', city: 'São Paulo', state: 'São Paulo' } };
const JUNDIAI = { lat: '-23.1672', lon: '-46.8942', display_name: 'Vila Suzana, Vila Hortolândia, Jundiaí, São Paulo, Brasil', address: { neighbourhood: 'Vila Suzana', suburb: 'Hortolândia', city: 'Jundiaí', state: 'São Paulo' } };
const CIDADE_SP = { lat: '-23.55', lon: '-46.63', name: 'São Paulo', boundingbox: ['-24.0082', '-23.3566', '-46.8262', '-46.3650'], address: { city: 'São Paulo', state: 'São Paulo' } };

// Responde o mapa: a busca livre, a da cidade (city=) e a do bairro dentro
// dela (viewbox); o reverso diz o bairro e a cidade pelo ponto.
async function mapa(page, livre, pedidos) {
  await page.route('**/*', (route) => {
    const u = decodeURIComponent(route.request().url());
    if (!u.includes('nominatim')) return route.fallback();
    pedidos.push(u);
    if (u.includes('reverse')) {
      const sp = u.includes('lat=-23.6');
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ address: sp ? { suburb: 'Vila Suzana', city: 'São Paulo' } : { suburb: 'Hortolândia', city: 'Jundiaí' } }) });
    }
    if (u.includes('city=')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([CIDADE_SP]) });
    if (u.includes('viewbox=')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([SP]) });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(livre) });
  });
}
const buscar = (page, termo) => page.evaluate(async (termo) => { state.cep = termo; await doSearch(); return { lat: state.origin && state.origin.lat, linha: state.origin ? `A partir de ${state.origin.bairro}, ${state.origin.cidade}` : '', erro: state.errorMsg }; }, termo);

(async () => {
  // O mapa devolve primeiro a de Jundiaí, depois a de São Paulo.
  let { browser, page } = await abrir({});
  let pedidos = [];
  await mapa(page, [JUNDIAI, SP], pedidos);
  let r = await buscar(page, 'Vila Suzana, São Paulo');
  ok(Math.abs(r.lat - -23.6105) < 0.001, '"Vila Suzana, São Paulo" fica em São Paulo, não na Vila Suzana de Jundiaí — ' + r.lat);
  ok(r.linha.includes('A partir de Vila Suzana, São Paulo'), 'e a linha diz "A partir de Vila Suzana, São Paulo" — ' + r.linha);
  r = await buscar(page, 'Vila Suzana, São Paulo, SP');
  ok(Math.abs(r.lat - -23.6105) < 0.001, 'com ", SP" no fim também');
  r = await buscar(page, 'Vila Suzana, São Paulo - SP');
  ok(Math.abs(r.lat - -23.6105) < 0.001, 'e com " - SP"');
  r = await buscar(page, 'Vila Suzana, Jundiaí');
  ok(Math.abs(r.lat - -23.1672) < 0.001, '"Vila Suzana, Jundiaí" fica em Jundiaí');
  await browser.close();

  // O mapa só devolve a de Jundiaí: procura o bairro dentro de São Paulo.
  ({ browser, page } = await abrir({}));
  pedidos = [];
  await mapa(page, [JUNDIAI], pedidos);
  r = await buscar(page, 'Vila Suzana, São Paulo');
  ok(Math.abs(r.lat - -23.6105) < 0.001 && pedidos.some(u => u.includes('city=São Paulo')) && pedidos.some(u => u.includes('bounded=1') && u.includes('viewbox=-46.8262,-23.3566,-46.365,-24.0082') && u.includes('q=Vila Suzana')),
    'sem resultado na cidade, procura o bairro dentro dos limites de São Paulo — ' + r.lat);
  await browser.close();

  // Sem vírgula, como antes: o primeiro resultado do mapa.
  ({ browser, page } = await abrir({}));
  pedidos = [];
  await mapa(page, [JUNDIAI, SP], pedidos);
  r = await buscar(page, 'Vila Suzana');
  ok(Math.abs(r.lat - -23.1672) < 0.001 && !pedidos.some(u => u.includes('city=')), 'sem a cidade, a busca segue como antes (o primeiro do mapa)');
  // Endereço com o bairro no fim (a última parte é bairro, não cidade).
  r = await buscar(page, 'Rua Itapaiúna, Vila Suzana');
  ok(!r.erro && typeof r.lat === 'number', 'com o bairro no fim, acha pelo bairro');
  await browser.close();
})();
