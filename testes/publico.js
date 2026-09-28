// Dados do público: CEP em toda busca, ponto aproximado, origem e aparelho
// do acesso, e o painel do admin com tudo isso.
const { abrir, ok } = require('./harness');
(async () => {
  // Acesso vindo do Instagram, pelo celular
  let { browser, page } = await abrir({ q: '?utm_source=Instagram', w: 400 });
  let cl = await page.evaluate(() => window.__cliques.find(c => c.tipo === 'acesso_site'));
  ok(cl.origem === 'Instagram' && cl.dispositivo === 'Computador', 'acesso grava origem e aparelho — ' + JSON.stringify(cl));
  await browser.close();

  // Busca por endereço: CEP da região achada e ponto arredondado (~100 m)
  ({ browser, page } = await abrir());
  await page.route('**/nominatim**', r => {
    const u = r.request().url();
    if (u.includes('reverse')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ address: { suburb: 'Moema', city: 'São Paulo', postcode: '04077-000' } }) });
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify([{ lat: '-23.601234', lon: '-46.665678' }]) });
  });
  await page.fill('#cep-input', 'Rua B, Moema'); await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
  cl = await page.evaluate(() => window.__cliques.find(c => c.tipo === 'busca'));
  ok(cl.cep === '04077-000', 'busca por endereço grava o CEP da região — ' + cl.cep);
  ok(cl.lat === -23.601 && cl.lng === -46.666, 'ponto arredondado para ~100 m — ' + cl.lat + ', ' + cl.lng);
  ok(cl.dispositivo === 'Computador', 'busca grava o aparelho');
  await browser.close();

  // Banco sem as colunas novas: ainda grava, com o que der
  ({ browser, page } = await abrir({ semCep: true }));
  await page.fill('#cep-input', '05422-000'); await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
  cl = await page.evaluate(() => window.__cliques.filter(c => c.tipo === 'busca').map(c => c.detalhe));
  ok(cl.join() === 'Pinheiros, São Paulo', 'sem as colunas novas, a busca ainda é gravada — ' + cl);
  await browser.close();

  // Painel do admin
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(() => {
    const agora = new Date().toISOString();
    state.clicksRaw = [
      { tipo: 'acesso_site', origem: 'Instagram', dispositivo: 'Celular', created_at: agora },
      { tipo: 'acesso_site', origem: 'Instagram', dispositivo: 'Celular', created_at: agora },
      { tipo: 'acesso_site', origem: 'Google', dispositivo: 'Computador', created_at: agora },
      { tipo: 'acesso_site', created_at: agora },
      { tipo: 'busca', detalhe: 'Moema, São Paulo', cep: '04077-000', lat: '-23.601', lng: '-46.666', created_at: agora },
    ];
    state.showStatsPanel = true; render();
  });
  const painel = await page.evaluate(() => document.getElementById('stats-overlay').innerText.replace(/\s+/g, ' '));
  ok(painel.includes('DE ONDE VIERAM OS ACESSOS') && /Instagram 2 50%/.test(painel) && /Google 1 25%/.test(painel), 'painel: de onde vieram, com porcentagem');
  ok(/Celular 2 50%/.test(painel) && /Computador 1 25%/.test(painel), 'painel: aparelho');
  ok(painel.includes('MAPA DAS BUSCAS (1)') && !!(await page.$('#stats-mapa')), 'painel: mapa das buscas');
  ok(painel.includes('04077-000'), 'painel: CEPs buscados');
  await browser.close();

  // Política de Privacidade conta o que é guardado
  ({ browser, page } = await abrir());
  const pol = await page.evaluate(() => PRIVACY_HTML);
  ok(pol.includes('arredondado para cerca de 100 metros') && pol.includes('28 de setembro de 2026'), 'Política de Privacidade atualizada');
  await browser.close();
})();
