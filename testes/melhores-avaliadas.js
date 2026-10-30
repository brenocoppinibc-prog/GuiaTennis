// "Melhores avaliadas" de verdade (pedido do Breno em 21/10/2026): nota 4 ou
// mais, na ordem da nota ponderada pelo número de avaliações, e só as de
// perto quando há 3 ou mais perto da pessoa.
const { abrir, ok } = require('./harness');

(async () => {
  const { browser, page } = await abrir();
  const r = await page.evaluate(() => {
    const a = (id, appAvg, appCount, perto) => ({ id, appAvg, appCount, perto });
    const todas = [
      a('perto-3', 3.0, 1, true), a('longe-48', 4.8, 40, false), a('longe-5-uma', 5.0, 1, false),
      a('perto-45', 4.5, 6, true), a('longe-42', 4.2, 12, false), a('sem-nota', 0, 0, true),
    ];
    const longe = melhoresAvaliadas(todas, null);
    const comPonto = melhoresAvaliadas(todas, c => c.perto);
    const muitasPerto = melhoresAvaliadas([...todas, a('perto-46', 4.6, 9, true), a('perto-44', 4.4, 3, true)], c => c.perto);
    return { longe: longe.map(c => c.id), longePerto: longe.perto, comPonto: comPonto.map(c => c.id), comPontoPerto: comPonto.perto, muitas: muitasPerto.map(c => c.id), muitasPerto: muitasPerto.perto };
  });
  ok(r.longe[0] === 'longe-48' && !r.longe.includes('perto-3') && !r.longe.includes('sem-nota'), 'só nota 4 ou mais, e a 4,8 com 40 avaliações vem antes — ' + r.longe.join(', '));
  ok(r.longe.indexOf('longe-48') < r.longe.indexOf('longe-5-uma'), 'uma 5,0 com 1 avaliação não passa na frente de uma 4,8 com 40');
  ok(!r.comPontoPerto && r.comPonto[0] === 'longe-48', 'com menos de 3 boas perto, a lista é do Guia inteiro — ' + r.comPonto.join(', '));
  ok(r.muitasPerto && r.muitas.join() === 'perto-46,perto-45,perto-44', 'com 3 ou mais boas perto, só as de perto, pela nota — ' + r.muitas.join(', '));
  // Na home, o título diz "perto de você" só quando é a lista de perto.
  const titulo = await page.evaluate(() => [...document.querySelectorAll('.home-sec h3')].map(h => h.textContent).find(t => /Melhores avaliadas/.test(t)) || '');
  ok(!titulo || titulo === 'Melhores avaliadas' || titulo === 'Melhores avaliadas perto de você', 'título da seção — ' + titulo);
  await browser.close();
  console.log('\nmelhores-avaliadas.js: fim');
})();
