// Regra 217 (05/11/2026): "deixe o site mais rápido". A lista da busca de 20 em 20,
// as próximas entram sozinhas ao rolar, e as fotos dos cartões só perto da tela.
const { abrir, ok } = require('./harness');
(async () => {
  const { browser, page } = await abrir({ w: 390, h: 800 });
  await page.evaluate(() => { const base = state.allCourts[0]; for (let i = 0; i < 50; i++) state.allCourts.push({ ...base, id: 'x' + i, name: 'Academia ' + i }); state.page = 'search'; render(); });
  await page.waitForTimeout(300);
  let n = await page.evaluate(() => document.querySelectorAll('.results .rcard, .results article').length);
  const mais = await page.$('#lista-mais .bola');
  ok(n === 20 && !!mais, 'a lista começa com 20 academias e a bolinha no fim (regra 217) — ' + n);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  const n2 = await page.evaluate(() => ({ n: document.querySelectorAll('.results .rcard, .results article').length, mais: !!document.getElementById('lista-mais'), lazy: [...document.querySelectorAll('.rcard-strip img')].every(i => i.loading === 'lazy') }));
  ok(n2.n === 52 && !n2.mais && n2.lazy, 'rolando, as outras entram sozinhas; as fotos carregam só perto da tela — ' + JSON.stringify(n2));
  await browser.close();
})();
