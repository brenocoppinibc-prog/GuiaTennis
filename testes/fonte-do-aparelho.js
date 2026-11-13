// A fonte do aparelho no site inteiro (regra 259, 13/11/2026: "seria
// interessante usar a fonte do celular no site inteiro"): texto e títulos na
// fonte do sistema (San Francisco, Roboto, Segoe UI), sem a Inter; só o nome
// no logo tem fonte própria, baixada só com as letras de "GuiaTennis".
const { abrir, ok } = require('./harness');

(async () => {
  const { browser, page } = await abrir({});
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const f = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).fontFamily : ''; };
    return {
      corpo: getComputedStyle(document.body).fontFamily,
      logo: f('.home-brand .logo-nome'),
      titulos: [...document.querySelectorAll('.display:not(.logo-nome)')].map(el => getComputedStyle(el).fontFamily),
      links: [...document.querySelectorAll('link[href*="fonts.googleapis.com/css2"]')].map(l => l.getAttribute('href')),
      nomes: [...document.querySelectorAll('.logo-nome')].map(el => el.textContent.trim()),
    };
  });
  ok(r.corpo.startsWith('-apple-system') && r.corpo.includes('Roboto') && !r.corpo.includes('Inter'), 'o texto usa a fonte do aparelho, sem a Inter — ' + r.corpo);
  ok(r.titulos.length > 0 && r.titulos.every(t => t.startsWith('-apple-system')), 'os títulos também, sem a fonte com serifa — ' + r.titulos.length + ' títulos');
  ok(r.logo.includes('Playfair'), 'o nome no logo continua com a fonte própria — ' + r.logo);
  ok(r.nomes.length > 0 && r.nomes.every(n => n === 'GuiaTennis'), 'só o nome "GuiaTennis" usa a fonte do logo');
  ok(r.links.length > 0 && r.links.every(h => !h.includes('Inter') && h.includes('text=GuiaTennis')), 'o Google Fonts baixa só as letras do nome, e a Inter saiu — ' + r.links[0]);

  // O rodapé e o menu levam o nome com a mesma fonte do logo.
  const rod = await page.evaluate(() => { const el = document.querySelector('.rodape-faixa-marca .logo-nome'); return el ? getComputedStyle(el).fontFamily : ''; });
  ok(rod.includes('Playfair'), 'no rodapé, o nome também — ' + rod);
  await browser.close();
})();
