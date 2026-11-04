// Avisos rápidos e balões (regra 202, pedido do Breno em 04/11/2026: "quero
// que apareça com um push rápido ficando 5 segundos falando que agora está em
// tal academia, com uma barra embaixo deslizando indicando o tempo, todos os
// pushs de ajuda com o site ou aqueles que tentam vender mais, só sair com o
// clique no x os de que a academia esta em comparação faça o mesmo de troca
// de academia").
const { abrir, ok } = require('./harness');

// Os tempos que uma função agenda (sem rodar nada a mais).
const tempos = (page, codigo) => page.evaluate((codigo) => {
  const t = [], antes = window.setTimeout;
  window.setTimeout = (f, ms, ...r) => { t.push(ms || 0); return antes(f, ms, ...r); };
  try { (0, eval)(codigo); } finally { window.setTimeout = antes; }
  return t;
}, codigo);

(async () => {
  let { browser, page } = await abrir();
  await page.waitForTimeout(300);

  // ---- Aviso rápido: 5 segundos com a barra do tempo ----
  let t = await tempos(page, 'mostrarPush("Na comparação (1)", "ok", { t: "Ver ›", ic: "comparar", fn: () => {} })');
  let r = await page.evaluate(() => {
    const el = document.querySelector('.gt-push'), b = el && el.querySelector('.gt-push-tempo');
    const st = b && getComputedStyle(b), box = el.getBoundingClientRect(), bb = b && b.getBoundingClientRect();
    return { barra: !!b, dura: st && st.animationDuration, nome: st && st.animationName, embaixo: b && Math.abs(bb.bottom - box.bottom) < 1.5, largura: b && bb.width > box.width * 0.5 };
  });
  ok(t.includes(5000) && !t.includes(7000) && r.barra && r.dura === '5s' && r.nome === 'gt-push-tempo' && r.embaixo, 'aviso com atalho: 5 segundos, com a barra do tempo embaixo — ' + JSON.stringify(r));
  await page.waitForTimeout(1500);
  r = await page.evaluate(() => { const el = document.querySelector('.gt-push'), b = el.querySelector('.gt-push-tempo'); return b.getBoundingClientRect().width / el.getBoundingClientRect().width; });
  ok(r > 0.5 && r < 0.85, 'a barra vai diminuindo com o tempo — ' + r.toFixed(2));
  await page.waitForTimeout(4200);
  ok(!(await page.$('.gt-push')), 'depois de 5 segundos, o aviso sai sozinho');

  // ---- Dica de ajuda ou de venda: só pelo ✕ ----
  t = await tempos(page, 'mostrarDica({ ic: "sparkle", t: "Mostre todas as fotos", s: "Com o Completo, as fotos aparecem.", bt: "Ver o Completo", fn: () => {} })');
  ok(!t.some(ms => ms >= 1000) && !(await page.$('#gt-dica .gt-push-tempo')), 'a dica não marca tempo para sair nem tem a barra');
  await page.evaluate(() => mostrarPush('Senha nova salva.'));
  await page.waitForTimeout(450);
  r = await page.evaluate(() => {
    const d = document.getElementById('gt-dica'), p = document.querySelector('.gt-push:not(.gt-dica)');
    return { dica: !!d, push: !!p, embaixo: d && p && p.getBoundingClientRect().top >= d.getBoundingClientRect().bottom };
  });
  ok(r.dica && r.push && r.embaixo, 'um aviso rápido não tira a dica: desce embaixo dela — ' + JSON.stringify(r));
  await page.waitForTimeout(5200);
  ok(!!(await page.$('#gt-dica')) && !(await page.$('.gt-push:not(.gt-dica)')), 'o aviso sai e a dica continua');

  // ---- Nenhum aviso cobre outro (regra 203) ----
  const cruzam = () => page.evaluate(() => {
    const r = [...document.querySelectorAll('.gt-push, .push-conta')].filter(e => e.getClientRects().length).map(e => { const b = e.getBoundingClientRect(); return { t: e.offsetTop, b: e.offsetTop + e.offsetHeight, id: e.id || e.className }; });
    return { n: r.length, cruza: r.some((a, i) => r.some((b, j) => i < j && a.t < b.b && b.t < a.b)) };
  });
  await page.evaluate(() => { state.pushConta = 0; render(); mostrarPush('Agora você está na Academia de Tênis com um nome bem comprido para quebrar a linha.'); });
  await page.waitForTimeout(450);
  r = await cruzam();
  ok(r.n === 3 && !r.cruza, 'a dica, o balão da conta e o aviso rápido, um embaixo do outro — ' + JSON.stringify(r));
  await page.evaluate(() => { state.pushAjudaBusca = true; state.page = 'search'; render(); });
  await page.waitForTimeout(100);
  r = await cruzam();
  ok(r.n === 4 && !r.cruza, 'com o balão de ajuda da busca também, nada se cobre — ' + JSON.stringify(r));
  await page.evaluate(() => { state.pushConta = null; state.pushAjudaBusca = false; state.page = 'home'; render(); document.querySelectorAll('.gt-push:not(.gt-dica)').forEach(e => e.remove()); });
  await page.waitForTimeout(100);
  ok(await page.evaluate(() => document.querySelector('#gt-dica').style.top === ''), 'fechados os outros, a dica volta ao lugar dela');
  await page.click('#gt-dica .gt-push-x');
  ok(!(await page.$('#gt-dica')), 'o ✕ fecha a dica');

  // ---- Convite das academias chamadas: só pelo ✕ ----
  t = await tempos(page, 'window.chamadasDaAba = () => [1, 2]; mostrarConviteDasChamadas()');
  ok(!!(await page.$('#convite-chamadas')) && !t.some(ms => ms >= 1000), 'o convite para criar a conta não sai sozinho');
  await page.click('#convite-chamadas .push-conta-x');
  ok(!(await page.$('#convite-chamadas')), 'o ✕ fecha o convite');

  // ---- Balão da conta: fica até o ✕ ----
  r = await page.evaluate(() => {
    const t = [], antes = window.setTimeout;
    localStorage.removeItem(PUSH_CONTA_KEY); state.pushConta = null;
    window.setTimeout = (f, ms) => { t.push({ f, ms }); return 0; };
    ligarPushesDaConta();
    const primeiro = t.shift();
    primeiro.f();
    window.setTimeout = antes;
    return { aberto: state.pushConta != null && !!document.getElementById('push-conta'), depois: t.map(x => x.ms).filter(ms => ms >= 1000) };
  });
  ok(r.aberto && !r.depois.length, 'o balão da conta aparece e não marca tempo para sair — ' + JSON.stringify(r.depois));
  await page.click('#push-conta-x');
  ok(await page.evaluate(() => !document.getElementById('push-conta') && lerLocal(PUSH_CONTA_KEY, 0) > 0), 'o ✕ fecha o balão');
  await browser.close();

  // ---- Comparação, na ficha: o mesmo aviso de 5 segundos ----
  ({ browser, page } = await abrir({ q: '?court=a1' }));
  await page.waitForTimeout(400);
  const botao = await page.$('.courtbar [data-compare]');
  if (botao) {
    await botao.click();
    await page.waitForTimeout(200);
    r = await page.evaluate(() => ({ t: document.querySelector('.gt-push')?.innerText || '', barra: getComputedStyle(document.querySelector('.gt-push .gt-push-tempo')).animationDuration }));
    ok(r.t.includes('Na comparação') && r.barra === '5s', 'pôr na comparação: o aviso de 5 segundos com a barra — ' + r.t);
  } else ok(false, 'a ficha tem o botão de comparar no alto');
  await browser.close();

  console.log('\navisos-rapidos.js: fim');
})();
