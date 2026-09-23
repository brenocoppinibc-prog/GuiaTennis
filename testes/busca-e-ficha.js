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
  await page.evaluate(() => { state.showStatsPanel = true; render(); });
  const aviso = await page.evaluate(() => document.getElementById('stats-overlay')?.textContent.includes('os seus acessos e buscas não entram na conta'));
  ok(aviso, 'painel de estatísticas avisa que o admin não conta');
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
