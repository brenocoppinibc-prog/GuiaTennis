// Dados do público: CEP em toda busca, ponto aproximado, origem e aparelho
// do acesso, e o painel do admin com tudo isso.
const { abrir, ok } = require('./harness');
(async () => {
  // Acesso vindo do Instagram, pelo celular
  let { browser, page } = await abrir({ q: '?utm_source=Instagram', w: 400 });
  let cl = await page.evaluate(() => window.__cliques.find(c => c.tipo === 'acesso_site'));
  ok(cl.origem === 'Instagram' && cl.dispositivo === 'Computador', 'acesso grava origem e aparelho — ' + JSON.stringify(cl));
  await browser.close();

  // Compartilhar: o link leva a etiqueta, e quem recebe conta como
  // "Compartilhado" no acesso e na ficha aberta
  ({ browser, page } = await abrir());
  const link = await page.evaluate(async () => {
    let enviado = null;
    navigator.share = (d) => { enviado = d; return Promise.resolve(); };
    shareCourt('a1');
    return enviado && enviado.url;
  });
  ok(/\?court=a1&utm_source=Compartilhado$/.test(link || ''), 'link compartilhado leva a etiqueta — ' + link);
  await browser.close();
  ({ browser, page } = await abrir({ q: '?court=a1&utm_source=Compartilhado' }));
  cl = await page.evaluate(() => window.__cliques.map(c => c.tipo + ':' + c.origem));
  ok(cl.includes('acesso_site:Compartilhado') && cl.includes('visualizacao:Compartilhado'), 'quem abre o link compartilhado conta como Compartilhado — ' + cl.join(' | '));
  ok(await page.evaluate(() => state.page === 'court' && state.selected && state.selected.id === 'a1'), 'o link compartilhado abre a ficha da academia');
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

  // Por academia: ficha aberta depois de uma busca leva origem, aparelho e região
  ({ browser, page } = await abrir({ q: '?utm_source=bio-instagram' }));
  await page.fill('#cep-input', '05422-000'); await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
  await page.evaluate(() => openCourt('a1'));
  await page.waitForTimeout(300);
  let vis = await page.evaluate(() => window.__cliques.find(c => c.tipo === 'visualizacao'));
  ok(vis && vis.origem === 'bio-instagram' && vis.detalhe === 'Pinheiros, São Paulo' && vis.cep === '05422-000' && vis.dispositivo, 'ficha aberta leva origem, região e aparelho — ' + JSON.stringify(vis));
  await page.evaluate(() => trackClick('a1', 'whatsapp'));
  const wa = await page.evaluate(() => window.__cliques.find(c => c.tipo === 'whatsapp'));
  ok(wa.origem === 'bio-instagram' && wa.detalhe === 'Pinheiros, São Paulo', 'contato no WhatsApp também');
  await browser.close();

  // Admin não conta nem clique de academia
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(() => trackClick('a1', 'whatsapp'));
  ok(await page.evaluate(() => window.__cliques.length === 0), 'admin: clique na academia não conta');
  // Card da academia e resumo para mandar
  await page.evaluate(() => {
    const agora = new Date().toISOString();
    state.clicksRaw = [
      { academia_id: 'a1', tipo: 'visualizacao', origem: 'Instagram', dispositivo: 'Celular', detalhe: 'Moema, São Paulo', created_at: agora },
      { academia_id: 'a1', tipo: 'visualizacao', origem: 'Instagram', dispositivo: 'Celular', detalhe: 'Moema, São Paulo', created_at: agora },
      { academia_id: 'a1', tipo: 'visualizacao', origem: 'Google', dispositivo: 'Computador', detalhe: 'Pinheiros, São Paulo', created_at: agora },
      { academia_id: 'a1', tipo: 'whatsapp', origem: 'Instagram', created_at: agora },
    ];
    state.showStatsPanel = true; render();
  });
  const card = await page.evaluate(() => document.getElementById('stats-overlay').innerText.replace(/\s+/g, ' '));
  ok(card.includes('Vieram de: Instagram 67% · Google 33%') && card.includes('Regiões: Moema, São Paulo 67% · Pinheiros, São Paulo 33%') && card.includes('Aparelho: Celular 67% · Computador 33%'), 'card da academia mostra o público');
  const resumo = await page.evaluate(() => { const { porAcademia } = statsAgregado('30'); const d = Object.assign({ whatsapp:0, site:0, instagram:0, compartilhar:0, visualizacao:0 }, porAcademia.a1); return resumoTexto(state.allCourts.find(c => c.id === 'a1'), d); });
  ok(resumo.includes('De onde vieram: Instagram 67%') && resumo.includes('Regiões de quem abriu a ficha: Moema'), 'resumo para mandar à academia inclui o público');
  await browser.close();

  // Política de Privacidade conta o que é guardado
  ({ browser, page } = await abrir());
  const pol = await page.evaluate(() => PRIVACY_HTML);
  ok(pol.includes('arredondado para cerca de 100 metros') && pol.includes('29 de setembro de 2026') && pol.includes('fontes públicas'), 'Política de Privacidade atualizada');
  await browser.close();
})();
