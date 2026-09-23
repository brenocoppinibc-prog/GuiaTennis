const { abrir, ok } = require('./harness');
(async () => {
  let { browser, page } = await abrir({ admin: true, q: '?court=a1' });
  await page.evaluate(() => document.querySelector('.editar-academia[data-court="a1"]').click());
  await page.waitForTimeout(300);
  const f = await page.evaluate(() => {
    const ov = document.getElementById('register-overlay');
    const labels = [...ov.querySelectorAll('.field-label')].map(e => e.textContent.trim());
    return {
      labels,
      polModo: ov.querySelectorAll('.pol-modo').length,
      rep: [...ov.querySelectorAll('.reg-reposicao.active')].map(e => e.dataset.reposicao + '@' + e.dataset.alvo),
      fora: [...ov.querySelectorAll('[id^="f-politica-fora-"]')].map(e => e.id + '=' + e.value),
      horas: [...ov.querySelectorAll('.hr-time')].map(e => e.value).join(','),
      estacionar: !!document.getElementById('f-acesso-estacionar'),
    };
  });
  console.log(f.labels.join(' | '));
  ok(f.polModo === 0, 'só aula: sem a escolha "Aula e locação diferentes"');
  ok(f.rep.join() === '24@aula' && f.fora.length === 1 && f.fora[0].includes('Perde a aula'), 'só aula: um bloco, com a regra da aula carregada — ' + f.rep + ' ' + f.fora);
  ok(f.horas.startsWith('06:00,22:00'), 'edição carrega o horário — ' + f.horas);
  ok(!f.estacionar, 'com estacionamento grátis: sem "Onde estacionar"');
  ok(f.labels.indexOf('Como é a fachada') > f.labels.indexOf('Cancelamento e reposição'), 'fachada/chegada/estacionar abaixo do cancelamento');

  // Tira o estacionamento: aparece o campo com o texto antigo
  await page.evaluate(() => document.querySelector('.reg-amenity[data-amenity="estacionamento_gratuito"]').click());
  await page.waitForTimeout(200);
  const est = await page.evaluate(() => document.getElementById('f-acesso-estacionar')?.value);
  ok(est === 'Rua de trás', 'sem estacionamento: aparece "Onde estacionar" — ' + est);

  // Marca locação também: aparece a escolha, com as duas regras antigas
  await page.evaluate(() => document.querySelector('.reg-modalidade[data-modalidade="locacao"]').click());
  await page.waitForTimeout(200);
  const f2 = await page.evaluate(() => ({ polModo: document.querySelectorAll('.pol-modo').length, rep: [...document.querySelectorAll('.reg-reposicao.active')].map(e => e.dataset.reposicao + '@' + e.dataset.alvo).join() }));
  ok(f2.polModo === 2 && f2.rep === '24@aula,12@locacao', 'aula + locação: volta a escolha, regras preservadas — ' + f2.rep);
  // Desmarca aula: fica só a de locação
  await page.evaluate(() => document.querySelector('.reg-modalidade[data-modalidade="aulas_proprias"]').click());
  await page.waitForTimeout(200);
  const f3 = await page.evaluate(() => ({ polModo: document.querySelectorAll('.pol-modo').length, rep: [...document.querySelectorAll('.reg-reposicao.active')].map(e => e.dataset.reposicao + '@' + e.dataset.alvo).join() }));
  ok(f3.polModo === 0 && f3.rep === '12@locacao', 'só locação: um bloco, regra de locação — ' + f3.rep);
  // Volta para só aula e salva
  await page.evaluate(() => document.querySelector('.reg-modalidade[data-modalidade="aulas_proprias"]').click());
  await page.evaluate(() => document.querySelector('.reg-modalidade[data-modalidade="locacao"]').click());
  await page.evaluate(() => document.querySelector('.reg-amenity[data-amenity="estacionamento_gratuito"]').click());
  await page.evaluate(() => document.getElementById('register-submit').click());
  await page.waitForTimeout(600);
  const up = await page.evaluate(() => window.__ultimoUpdate);
  ok(JSON.stringify(up.politica) === JSON.stringify({ modo: 'igual', reposicao: '24', foraDoPrazo: 'Perde a aula.' }), 'salva só a regra da aula — ' + JSON.stringify(up.politica));
  ok(up.horario && up.horario.semana && up.horario.semana.de === '06:00', 'salvar não apaga o horário');
  ok(!('estacionar' in up.acesso) && up.acesso.fachada === 'Portão preto', 'com estacionamento próprio, o texto de onde parar sai — ' + JSON.stringify(up.acesso));
  await browser.close();

  // Regra "igual" sobrevive à edição (a2)
  ({ browser, page } = await abrir({ admin: true, q: '?court=a2' }));
  await page.evaluate(() => document.querySelector('.editar-academia[data-court="a2"]').click());
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => [...document.querySelectorAll('.reg-reposicao.active')].map(e => e.dataset.reposicao).join());
  ok(r === '48', 'regra única aparece na edição — ' + r);
  await page.evaluate(() => document.getElementById('register-submit').click());
  await page.waitForTimeout(600);
  const up2 = await page.evaluate(() => window.__ultimoUpdate);
  ok(up2.politica.reposicao === '48', 'regra única continua depois de salvar');
  // Cadastro novo com as duas modalidades mostra a escolha
  await page.evaluate(() => { window.__form = null; state.showRegister = true; state.registerStatus = 'idle'; render(); });
  await page.evaluate(() => { document.querySelector('.reg-modalidade[data-modalidade="aulas_proprias"]').click(); });
  let n = await page.evaluate(() => document.querySelectorAll('.pol-modo').length);
  ok(n === 0, 'cadastro novo, só aula: sem escolha');
  await page.evaluate(() => { document.querySelector('.reg-modalidade[data-modalidade="locacao"]').click(); });
  n = await page.evaluate(() => document.querySelectorAll('.pol-modo').length);
  ok(n === 2, 'cadastro novo, aula e locação: com escolha');
  await browser.close();
})();
