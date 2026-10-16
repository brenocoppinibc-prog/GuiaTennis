// Pedido do Breno em 14/10/2026: as academias perto da última busca da conta
// e, antes de qualquer busca ou login, perto da cidade aproximada da conexão
// (netlify/functions/onde.mjs). Sem nada disso, a página inicial fica como era.
const { abrir, ok } = require('./harness');

(async () => {
  // ---- sem busca, sem preferência e sem a cidade da conexão: como era ----
  let { browser, page } = await abrir();
  let r = await page.evaluate(() => ({ perto: !!document.getElementById('home-parecidas'), onde: lerOndeAproximado(), reco: document.querySelectorAll('#home-recomendadas .mini').length }));
  ok(!r.perto && !r.onde && r.reco > 0, 'sem a cidade da conexão: nada de "perto de você", e as recomendadas continuam');
  await browser.close();

  // ---- com a cidade aproximada da conexão ----
  ({ browser, page } = await abrir({ onde: { cidade: 'São Paulo', uf: 'SP', lat: -23.56, lng: -46.68 } }));
  await page.waitForTimeout(300);
  r = await page.evaluate(() => {
    const todas = state.allCourts.map(decorate);
    const perto = todas.filter(c => typeof c.lat === 'number' && haversineKm(-23.56, -46.68, c.lat, c.lng) <= PARECIDAS_RAIO_KM).map(c => c.id);
    return {
      titulo: document.querySelector('#home-parecidas h3')?.innerText || '',
      sub: document.querySelector('#home-parecidas .home-sec-sub')?.innerText || '',
      guardado: sessionStorage.getItem('guiatennis_onde_v1') || '',
      local: localStorage.getItem('guiatennis_onde_v1'),
      cidade: document.querySelector('.city-tab.on')?.innerText || '',
      repetidas: [...document.querySelectorAll('#home-recomendadas .mini')].filter(a => [...document.querySelectorAll('#home-parecidas .mini')].some(b => b.dataset.open === a.dataset.open)).length,
      perto: perto.length,
    };
  });
  ok(r.titulo === 'Perto de você, em São Paulo' && r.sub === 'Academias da sua região', 'com a cidade da conexão: "Perto de você, em São Paulo" — ' + r.titulo);
  ok(r.guardado.includes('São Paulo') && r.local === null, 'a cidade fica só na aba (sessionStorage), não no aparelho');
  ok(r.cidade === 'São Paulo', '"Academias por cidade" abre na cidade da conexão');
  ok(r.repetidas === 0, 'as recomendadas não repetem as de "perto de você"');
  await browser.close();

  // ---- a última busca da conta vale em qualquer aparelho ----
  ({ browser, page } = await abrir());
  r = await page.evaluate(() => {
    jogador = { user_id: 'u1', nome: 'Ana', guardados: { ultima_busca: { termo: 'Pinheiros', bairro: 'Pinheiros', cidade: 'São Paulo', lat: -23.56, lng: -46.68, em: Date.now() } } };
    const daConta = lerUltimaBusca();
    localStorage.setItem('guiatennis_ultima_busca_v1', JSON.stringify({ termo: 'Moema', bairro: 'Moema', cidade: 'São Paulo', lat: -23.6, lng: -46.66, em: Date.now() + 1000 }));
    const maisNova = lerUltimaBusca();
    localStorage.removeItem('guiatennis_ultima_busca_v1');
    state.page = 'home'; render();
    const titulo = document.querySelector('#home-parecidas h3')?.innerText || '';
    const pedidos = [];
    const antes = gravarNaConta;
    gravarNaConta = (chave, valor) => { pedidos.push([chave, valor]); return Promise.resolve(true); };
    guardarUltimaBusca({ bairro: 'Vila Madalena', cidade: 'São Paulo', lat: -23.5531, lng: -46.6912 }, 'Vila Madalena');
    gravarNaConta = antes;
    return { daConta: daConta && daConta.bairro, maisNova: maisNova && maisNova.bairro, titulo, pedido: pedidos[0] };
  });
  ok(r.daConta === 'Pinheiros' && r.titulo === 'Com base na sua última busca', 'com a conta aberta, a última busca da conta aparece na página inicial');
  ok(r.maisNova === 'Moema', 'entre a do aparelho e a da conta, vale a mais recente');
  ok(r.pedido && r.pedido[0] === 'ultima_busca' && r.pedido[1].bairro === 'Vila Madalena' && Math.abs(r.pedido[1].lat - -23.553) < 0.002, 'buscar com a conta aberta guarda a última busca na conta (ponto arredondado)');
  await browser.close();
})();
