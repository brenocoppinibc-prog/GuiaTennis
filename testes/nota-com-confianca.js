// Regra 291 (16/11/2026): "notas que têm mais avaliações são mais bem avaliadas;
// isso também deve contar ao dizer academias recomendadas". A nota com
// confiança (média bayesiana): 4,8 com 30 avaliações vem antes de 5,0 com uma.
const { abrir, ok } = require('./harness');

const avaliacoes = [
  { id: 'r0', academia_id: 'a1', stars: 5, comment: 'Ótima.', nome_autor: 'Ana', created_at: '2026-11-01T12:00:00Z' },
  ...Array.from({ length: 30 }, (_, i) => ({ id: 'q' + i, academia_id: 'a2', stars: i < 24 ? 5 : 4, comment: 'Boa.', nome_autor: 'Jogador ' + i, created_at: '2026-11-02T12:00:00Z' })),
];

(async () => {
  const { browser, page } = await abrir({ avaliacoes });
  await page.waitForTimeout(700);
  let r = await page.evaluate(() => {
    const [a1, a2] = ['a1', 'a2'].map(id => decorate(state.allCourts.find(c => c.id === id)));
    return { a1: [a1.appAvg, a1.appCount, notaComConfianca(a1)], a2: [a2.appAvg, a2.appCount, notaComConfianca(a2)] };
  });
  ok(r.a1[0] === 5 && r.a1[1] === 1 && Math.abs(r.a2[0] - 4.8) < 0.01 && r.a2[1] === 30 && r.a2[2] > r.a1[2],
    'a nota com confiança: 4,8 com 30 avaliações passa à frente de 5,0 com uma — ' + JSON.stringify(r));

  // Busca › "Mais bem avaliadas": a de 30 avaliações primeiro.
  await page.evaluate(() => { state.cep = ''; state.origin = null; goSearch(); state.sortBy = 'rating'; render(); });
  await page.waitForTimeout(400);
  r = await page.evaluate(() => getResults().filter(c => c.appCount).map(c => c.id));
  ok(r[0] === 'a2' && r.indexOf('a1') > 0, '"Mais bem avaliadas" pesa quantas avaliações — ' + r.join(','));

  // Recomendadas: a nota que entra na conta é a com confiança.
  r = await page.evaluate(() => {
    const lista = state.allCourts.map(decorate);
    const rates = lista.map(c => c.appCount ? notaComConfianca(c) : null);
    const [a1, a2] = ['a1', 'a2'].map(id => lista.find(c => c.id === id));
    return { a1: norm(rates, notaComConfianca(a1), false), a2: norm(rates, notaComConfianca(a2), false), hint: SORT_OPTS.find(o => o.key === 'recomendados').hint, fonte: recoScore.toString().includes('notaComConfianca') };
  });
  ok(r.a2 > r.a1 && r.fonte && /quantas avaliações/.test(r.hint), 'nas Recomendadas, a parte da nota é a com confiança: a de 30 avaliações fica à frente — ' + JSON.stringify(r));
  await browser.close();
})();
