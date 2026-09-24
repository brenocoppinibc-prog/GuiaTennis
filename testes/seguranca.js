// O visitante lê só as colunas públicas, e o site funciona antes e depois
// do SQL-SEGURANCA.sql.
const { abrir, ok } = require('./harness');
(async () => {
  for (const [nome, opts] of [['banco fechado (depois do SQL)', { colunasFechadas: true }], ['banco antigo sem coluna nova', { semPlano: true }], ['banco como hoje', {}]]) {
    const { browser, page } = await abrir(opts);
    const n = await page.evaluate(() => state.allCourts.length);
    ok(n === 2, nome + ': academias aparecem — ' + n);
    await page.evaluate(async () => { await submitRating('a1', 5, 'Ótima'); });
    const r = await page.evaluate(() => window.__db.avaliacoes.length);
    ok(r === 1, nome + ': avaliação é enviada');
    await browser.close();
  }
  const { browser, page } = await abrir({ admin: true, colunasFechadas: true });
  ok(await page.evaluate(() => state.allCourts.length === 2), 'admin com o banco fechado: lê tudo');
  await browser.close();
})();
