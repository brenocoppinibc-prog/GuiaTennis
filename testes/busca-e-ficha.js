const { abrir, ok } = require('./harness');
(async () => {
  // Home e busca de visitante
  let { browser, page } = await abrir();
  const ordem = await page.evaluate(() => {
    const hero = document.querySelector('.home-hero');
    const kids = [...hero.children].map(e => e.className || e.tagName);
    return { kids, sub: hero.querySelector('.home-hero-sub')?.textContent };
  });
  ok(ordem.kids.indexOf('searchcard') < ordem.kids.indexOf('home-hero-sub'), 'frase vem depois da barra de busca: ' + ordem.kids.join(' > '));
  ok(ordem.sub === 'Compare preço, estrutura e comodidades de academias de tênis — e fale direto com elas.', 'texto da frase');
  await page.screenshot({ path: require('path').join(require('os').tmpdir(), 'guiatennis-home.png') });
  await page.fill('#cep-input', '05422-000');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  let cl = await page.evaluate(() => window.__cliques.map(c => c.tipo + ':' + (c.detalhe || '')));
  ok(cl.includes('busca:Pinheiros, São Paulo'), 'visitante: busca registrada com a região — ' + cl.join(' | '));
  const cepGravado = await page.evaluate(() => window.__cliques.filter(c => c.tipo === 'busca').map(c => c.cep));
  ok(cepGravado[0] === '05422-000', 'busca por CEP guarda o CEP digitado — ' + cepGravado);
  const filtro = await page.evaluate(() => document.body.innerHTML.includes('Empréstimo de raquete') && !document.body.innerHTML.includes('Empresta raquete'));
  ok(filtro, 'rótulo "Empréstimo de raquete"');
  await browser.close();

  // Sem a coluna detalhe: ainda registra
  ({ browser, page } = await abrir({ semDetalhe: true }));
  await page.fill('#cep-input', '05422-000'); await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
  cl = await page.evaluate(() => window.__cliques.map(c => c.tipo));
  ok(cl.includes('busca'), 'sem coluna detalhe: busca registrada sem região');
  await browser.close();

  // Sem a coluna cep: ainda registra, com a região
  ({ browser, page } = await abrir({ semCep: true }));
  await page.fill('#cep-input', '05422-000'); await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
  cl = await page.evaluate(() => window.__cliques.filter(c => c.tipo === 'busca').map(c => c.detalhe + '|' + (c.cep || '')));
  ok(cl.join() === 'Pinheiros, São Paulo|', 'sem coluna cep: busca registrada só com a região — ' + cl);
  await browser.close();

  // Busca por endereço não tem CEP para guardar
  ({ browser, page } = await abrir());
  await page.fill('#cep-input', 'Rua A, Pinheiros'); await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
  cl = await page.evaluate(() => window.__cliques.filter(c => c.tipo === 'busca').map(c => c.cep || 'sem'));
  ok(cl.join() === 'sem', 'busca por endereço: sem CEP — ' + cl);
  await browser.close();

  // Admin: não registra, e o painel avisa
  ({ browser, page } = await abrir({ admin: true }));
  await page.fill('#cep-input', '05422-000'); await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
  cl = await page.evaluate(() => window.__cliques.map(c => c.tipo));
  ok(!cl.includes('busca') && !cl.includes('acesso_site'), 'admin conectado: nada registrado — ' + cl.join(','));
  const avisoBusca = await page.evaluate(() => document.querySelector('.admin-aviso')?.textContent || '');
  ok(avisoBusca.includes('Essa busca não foi gravada'), 'admin buscou: aviso na hora de que não foi gravada');
  await page.evaluate(() => { state.showStatsPanel = true; render(); });
  const aviso = await page.evaluate(() => document.getElementById('stats-overlay')?.textContent.includes('os seus acessos e buscas não entram na conta'));
  ok(aviso, 'painel de estatísticas avisa que o admin não conta');
  await browser.close();

  // Admin com o banco sem a coluna cep: aviso com o SQL
  ({ browser, page } = await abrir({ admin: true, semCep: true }));
  const avisoSql = await page.evaluate(() => document.querySelector('.admin-aviso')?.textContent || '');
  ok(avisoSql.includes('coluna cep') && avisoSql.includes('add column if not exists cep text'), 'admin vê que falta a coluna cep, com o SQL');
  await browser.close();
  ({ browser, page } = await abrir({ admin: true }));
  ok(await page.evaluate(() => !document.querySelector('.admin-aviso')), 'banco completo: sem aviso');
  await browser.close();

  // Link com a busca no endereço (recarregar, link salvo, aba reaberta): busca e conta
  ({ browser, page } = await abrir({ q: '?busca=05422-000' }));
  await page.waitForTimeout(1200);
  cl = await page.evaluate(() => window.__cliques.filter(c => c.tipo === 'busca').map(c => c.detalhe + '|' + c.cep));
  ok(cl.join() === 'Pinheiros, São Paulo|05422-000', 'abrir link ?busca=CEP faz a busca e grava — ' + cl);
  ok(await page.evaluate(() => state.origin && state.origin.bairro === 'Pinheiros' && location.search.includes('05422')), 'link mantém o CEP e ordena por distância');
  await browser.close();

  // Busca que não acha o lugar também conta
  ({ browser, page } = await abrir());
  await page.route('**/nominatim**', r => r.fulfill({ contentType: 'application/json', body: '[]' }));
  await page.fill('#cep-input', 'lugar que não existe'); await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
  cl = await page.evaluate(() => window.__cliques.filter(c => c.tipo === 'busca').map(c => c.detalhe));
  ok(cl.join() === 'região não identificada', 'busca sem resultado também é gravada — ' + cl);
  await browser.close();

  // Academia sem coordenada: aviso e botão no painel do admin
  ({ browser, page } = await abrir({ admin: true }));
  page.on('dialog', d => d.accept());
  await page.evaluate(async () => { window.__db.academias[1].lat = null; window.__db.academias[1].lng = null; await loadEverything(); state.showAdminPanel = true; render(); });
  const avisoMapa = await page.evaluate(() => document.getElementById('admin-overlay').textContent);
  ok(avisoMapa.includes('Fora do mapa por falta de coordenada: Quadra Locação'), 'painel mostra quem está fora do mapa');
  await page.evaluate(() => document.querySelector('#admin-overlay .geocode-todas-btn').click());
  await page.waitForTimeout(2500);
  const coord = await page.evaluate(() => [window.__db.academias[1].lat, window.__db.academias[1].lng]);
  ok(coord[0] === -23.56 && coord[1] === -46.68, 'botão gera a coordenada que faltava — ' + coord);
  await browser.close();

  // Admin abre o site: academia antiga sem coordenada (só endereço completo com CEP) vai para o mapa sozinha
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(async () => {
    Object.assign(window.__db.academias[0], { lat: null, lng: null, address: '', bairro: '', cidade: '', endereco: 'Rua A, 1 - Morumbi, São Paulo - 05422-000' });
    window.__completandoCoordenadas = false; await loadEverything(); completarCoordenadas();
  });
  await page.waitForTimeout(2500);
  const auto = await page.evaluate(() => [window.__db.academias[0].lat, !!document.querySelector('.admin-aviso')]);
  ok(auto[0] === -23.56 && !auto[1], 'admin abre o site: coordenada que faltava é gravada sozinha — ' + auto);
  await browser.close();

  // Localização pelo nome: usa o ponto da quadra se estiver perto do endereço; homônimo longe é ignorado
  for (const [nome, lat, esperado] of [['perto', '-23.5610', -23.561], ['longe', '-22.9000', -23.56]]) {
    ({ browser, page } = await abrir({ admin: true }));
    await page.route('**/nominatim**', r => {
      const u = decodeURIComponent(r.request().url());
      if (u.includes('Quadra Locação')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify([{ lat, lon: '-46.6810' }]) });
      return r.fallback();
    });
    const g = await page.evaluate(async () => (await localizarAcademia({ name: 'Quadra Locação', address: 'Rua B', numero: '2', bairro: 'Moema', cidade: 'São Paulo' })).lat);
    ok(g === esperado, 'localização pelo nome, ' + nome + ' do endereço — ' + g);
    await browser.close();
  }

  // Marco zero nunca: só bairro/cidade não é gravado
  const nominatim = (regra) => async r => {
    const u = decodeURIComponent(r.request().url()).replace(/\+/g, ' ');
    const q = (u.match(/[?&]q=([^&]*)/) || [])[1] || '';
    const resp = regra(q);
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify(resp ? [{ lat: resp[0], lon: resp[1] }] : []) });
  };
  const academia = { name: 'Morumbi Tennis', address: 'Rua João Scaciotti', numero: '129', bairro: 'Vila Progredior', cidade: 'São Paulo' };
  const casos = [
    ['rua achada sem o bairro', q => q.includes('Scaciotti') && !q.includes('Progredior') ? ['-23.5870', '-46.7160'] : (q.startsWith('São Paulo') ? ['-23.5505', '-46.6333'] : null), -23.587],
    ['rua não achada, nome achado', q => q.includes('Morumbi Tennis') ? ['-23.5855', '-46.7150'] : (q.startsWith('São Paulo') ? ['-23.5505', '-46.6333'] : null), -23.5855],
    ['só a cidade', q => q.startsWith('São Paulo') ? ['-23.5505', '-46.6333'] : null, 'erro'],
  ];
  for (const [nome, regra, esperado] of casos) {
    ({ browser, page } = await abrir({ admin: true }));
    await page.route('**/nominatim**', nominatim(regra));
    const g = await page.evaluate(async (a) => { try { return (await localizarAcademia(a)).lat; } catch (e) { return 'erro'; } }, academia);
    ok(g === esperado, 'localizar: ' + nome + ' — ' + g);
    await browser.close();
  }

  // Não achou: aviso com o nome
  ({ browser, page } = await abrir({ admin: true }));
  await page.route('**/nominatim**', r => r.fulfill({ contentType: 'application/json', body: '[]' }));
  await page.route('**/viacep**', r => r.fulfill({ contentType: 'application/json', body: '{"erro":true}' }));
  await page.evaluate(async () => {
    Object.assign(window.__db.academias[0], { lat: null, lng: null });
    window.__completandoCoordenadas = false; await loadEverything(); completarCoordenadas();
  });
  await page.waitForTimeout(2500);
  const naoAchou = await page.evaluate(() => document.querySelector('.admin-aviso')?.textContent || '');
  ok(naoAchou.includes('Não achei no mapa') && naoAchou.includes('Só Aula Tennis'), 'não achou: admin vê o nome e o que fazer');
  await browser.close();

  // Página de busca com o mesmo cabeçalho da home, menu incluído
  ({ browser, page } = await abrir({ q: '?busca=quadras' }));
  ok(await page.evaluate(() => state.page === 'search' && !!document.getElementById('menu-btn')), 'página de busca tem o botão de menu');
  await page.click('#menu-btn'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !!document.getElementById('menu-overlay')), 'menu abre na busca');
  await browser.close();

  // Fichas
  ({ browser, page } = await abrir({ q: '?court=a1' }));
  let txt = await page.evaluate(() => document.getElementById('app').textContent);
  ok(!txt.includes('Cobra metade'), 'só aula: regra de locação não aparece');
  ok(txt.includes('Perde a aula'), 'só aula: regra da aula aparece');
  ok(txt.includes('professor da academia. Para alugar a quadra avulsa'), 'FAQ "professor da academia"');
  ok(txt.includes('consulte com a academia'), '"consulte com a academia"');
  ok(txt.includes('Estacionamento grátis.') && !txt.includes('Rua de trás'), 'com vaga própria: ficha mostra "No local" e não o texto de onde parar');
  await browser.close();
  ({ browser, page } = await abrir({ q: '?court=a2' }));
  txt = await page.evaluate(() => document.getElementById('app').textContent);
  ok(txt.includes('reposição da reserva') || txt.includes('reposição de reserva'), 'só locação: fala em reserva, não aula');
  ok(!/reposição da aula/.test(txt), 'só locação: não fala em aula na política');
  await browser.close();
})();
