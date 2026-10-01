const { abrir, ok, irParte } = require('./harness');
(async () => {
  let { browser, page } = await abrir({ admin: true, q: '?court=a1' });
  await page.evaluate(() => document.querySelector('.editar-academia[data-court="a1"]').click());
  await page.waitForTimeout(300);
  // Cada parte numa tela: a de cancelamento, a de horário e a de como chegar.
  const parte = async (id, ler) => { await irParte(page, id); return page.evaluate(ler); };
  const ordem = await page.evaluate(() => REG_PASSOS.map(x => x.id).join());
  console.log(ordem);
  const f = {
    ...(await parte('cancelamento', () => ({
      polModo: document.querySelectorAll('#register-overlay .pol-modo').length,
      rep: [...document.querySelectorAll('#register-overlay .reg-reposicao.active')].map(e => e.dataset.reposicao + '@' + e.dataset.alvo),
      fora: [...document.querySelectorAll('#register-overlay [id^="f-politica-fora-"]')].map(e => e.id + '=' + e.value),
    }))),
    horas: await parte('horario', () => [...document.querySelectorAll('#register-overlay .hr-time')].map(e => e.value).join(',')),
    estacionar: await parte('chegada', () => !!document.getElementById('f-acesso-estacionar')),
  };
  ok(f.polModo === 0, 'só aula: sem a escolha "Aula e locação diferentes"');
  ok(f.rep.join() === '24@aula' && f.fora.length === 1 && f.fora[0].includes('Perde a aula'), 'só aula: um bloco, com a regra da aula carregada — ' + f.rep + ' ' + f.fora);
  ok(f.horas.startsWith('06:00,22:00'), 'edição carrega o horário — ' + f.horas);
  ok(!f.estacionar, 'com estacionamento grátis: sem "Onde estacionar"');
  ok(ordem === 'dados,precos,quadras,contato,fotos,horario,cancelamento,chegada,revisar', 'partes na ordem: primeiro o que o jogador e o GuiaTennis precisam, fachada/chegada depois do cancelamento');

  // Tira o estacionamento: aparece o campo com o texto antigo
  await irParte(page, 'quadras');
  await page.evaluate(() => document.querySelector('.reg-amenity[data-amenity="estacionamento_gratuito"]').click());
  await page.waitForTimeout(200);
  const est = await parte('chegada', () => document.getElementById('f-acesso-estacionar')?.value);
  ok(est === 'Rua de trás', 'sem estacionamento: aparece "Onde estacionar" — ' + est);

  // Marca locação também: aparece a escolha, com as duas regras antigas
  await irParte(page, 'precos');
  await page.evaluate(() => document.querySelector('.reg-modalidade[data-modalidade="locacao"]').click());
  await page.waitForTimeout(200);
  await irParte(page, 'cancelamento');
  const f2 = await page.evaluate(() => ({ polModo: document.querySelectorAll('.pol-modo').length, rep: [...document.querySelectorAll('.reg-reposicao.active')].map(e => e.dataset.reposicao + '@' + e.dataset.alvo).join() }));
  ok(f2.polModo === 2 && f2.rep === '24@aula,12@locacao', 'aula + locação: volta a escolha, regras preservadas — ' + f2.rep);
  // Desmarca aula: fica só a de locação
  await irParte(page, 'precos');
  await page.evaluate(() => document.querySelector('.reg-modalidade[data-modalidade="aulas_proprias"]').click());
  await page.waitForTimeout(200);
  await irParte(page, 'cancelamento');
  const f3 = await page.evaluate(() => ({ polModo: document.querySelectorAll('.pol-modo').length, rep: [...document.querySelectorAll('.reg-reposicao.active')].map(e => e.dataset.reposicao + '@' + e.dataset.alvo).join() }));
  ok(f3.polModo === 0 && f3.rep === '12@locacao', 'só locação: um bloco, regra de locação — ' + f3.rep);
  // Volta para só aula e salva
  await irParte(page, 'precos');
  await page.evaluate(() => document.querySelector('.reg-modalidade[data-modalidade="aulas_proprias"]').click());
  await page.evaluate(() => document.querySelector('.reg-modalidade[data-modalidade="locacao"]').click());
  await irParte(page, 'quadras');
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
  await irParte(page, 'cancelamento');
  const r = await page.evaluate(() => [...document.querySelectorAll('.reg-reposicao.active')].map(e => e.dataset.reposicao).join());
  ok(r === '48', 'regra única aparece na edição — ' + r);
  await page.evaluate(() => document.getElementById('register-submit').click());
  await page.waitForTimeout(600);
  const up2 = await page.evaluate(() => window.__ultimoUpdate);
  ok(up2.politica.reposicao === '48', 'regra única continua depois de salvar');
  // Prazo personalizado de reposição
  await page.evaluate(async () => { await loadEverything(); state.showRegister = false; render(); document.querySelector('.editar-academia[data-court="a2"]').click(); });
  await page.waitForTimeout(300);
  await irParte(page, 'cancelamento');
  await page.evaluate(() => document.querySelector('.reg-reposicao-outro').click());
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => !!document.querySelector('[id^="f-politica-horas-"]') && document.activeElement.id.startsWith('f-politica-horas-')), 'Personalizar abre o campo de horas, já com o cursor');
  await page.fill('[id^="f-politica-horas-"]', '36');
  await page.evaluate(() => document.getElementById('register-submit').click());
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => window.__ultimoUpdate.politica.reposicao === '36' && !('__personalizar' in window.__ultimoUpdate.politica)), 'salva 36 horas, sem sujeira do formulário');
  await page.evaluate(async () => { await loadEverything(); state.showRegister = false; state.selected = state.allCourts.find(c => c.id === 'a2'); render(); });
  const fichaPol = await page.evaluate(() => document.getElementById('app').textContent.replace(/\s+/g, ' '));
  ok(fichaPol.includes('36h é a antecedência mínima'), 'ficha mostra 36h');
  await page.evaluate(() => document.querySelector('.editar-academia[data-court="a2"]').click());
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.regPasso === 0), 'editar de novo abre na primeira parte');
  await irParte(page, 'cancelamento');
  const reaberto = await page.evaluate(() => ({ ativo: document.querySelector('.reg-reposicao-outro').classList.contains('active'), v: document.querySelector('[id^="f-politica-horas-"]')?.value }));
  ok(reaberto.ativo && reaberto.v === '36', 'editar de novo: Personalizar marcado com 36');
  await page.evaluate(() => document.querySelector('.reg-reposicao[data-reposicao="24"]').click());
  await page.waitForTimeout(150);
  const volta = await page.evaluate(() => ({ campo: !!document.querySelector('[id^="f-politica-horas-"]'), rep: window.__form.politica.reposicao }));
  ok(!volta.campo && volta.rep === '24', 'escolher 24h fecha o campo e vale 24');

  // Cadastro novo com as duas modalidades mostra a escolha
  await page.evaluate(() => { window.__form = null; state.showRegister = true; state.registerStatus = 'idle'; render(); });
  await irParte(page, 'precos');
  await page.evaluate(() => { document.querySelector('.reg-modalidade[data-modalidade="aulas_proprias"]').click(); });
  await irParte(page, 'cancelamento');
  let n = await page.evaluate(() => document.querySelectorAll('.pol-modo').length);
  ok(n === 0, 'cadastro novo, só aula: sem escolha');
  await irParte(page, 'precos');
  await page.evaluate(() => { document.querySelector('.reg-modalidade[data-modalidade="locacao"]').click(); });
  await irParte(page, 'cancelamento');
  n = await page.evaluate(() => document.querySelectorAll('.pol-modo').length);
  ok(n === 2, 'cadastro novo, aula e locação: com escolha');
  await browser.close();
})();
