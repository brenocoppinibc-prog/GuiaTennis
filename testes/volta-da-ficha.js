// Regra 284 (16/11/2026): "ao sair da ficha, voltar na mesma posição que clicou
// ao entrar, não voltar até o topo do site".
const { abrir, ok } = require('./harness');

(async () => {
  const { browser, page } = await abrir({ w: 390 });
  await page.waitForTimeout(800);
  // Página inicial: desce até "Academias por cidade" e abre uma academia de lá.
  await page.evaluate(() => { document.querySelector('.home-strip').scrollIntoView(); window.scrollBy(0, 300); });
  await page.waitForTimeout(200);
  const antes = await page.evaluate(() => Math.round(window.scrollY));
  await page.evaluate(() => openCourt('a1'));
  await page.waitForTimeout(500);
  let r = await page.evaluate(() => ({ pag: state.page, y: Math.round(window.scrollY) }));
  ok(r.pag === 'court' && r.y === 0, 'a ficha abre no alto');
  await page.goBack();
  await page.waitForTimeout(600);
  r = await page.evaluate(() => ({ pag: state.page, y: Math.round(window.scrollY) }));
  ok(r.pag === 'home' && Math.abs(r.y - antes) < 5 && antes > 200, 'voltar pelo navegador desce de novo até onde estava — ' + antes + ' → ' + r.y);

  // Na busca, pela seta da ficha.
  await page.evaluate(() => { state.cep = 'Pinheiros, São Paulo'; goSearch(); doSearch(); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(200);
  const naBusca = await page.evaluate(() => Math.round(window.scrollY));
  await page.evaluate(() => openCourt('a2'));
  await page.waitForTimeout(500);
  await page.evaluate(() => voltarDaFicha());
  await page.waitForTimeout(500);
  r = await page.evaluate(() => ({ pag: state.page, y: Math.round(window.scrollY) }));
  ok(r.pag === 'search' && Math.abs(r.y - naBusca) < 5 && naBusca > 300, 'a seta da ficha volta à busca na mesma altura — ' + naBusca + ' → ' + r.y);
  await browser.close();
})();
