// 26/11/2026: "crie uma comodidade chamada acessibilidade, ou acessível, o que ficar melhor". A
// comodidade "Acessibilidade" no cadastro, nos Filtros, na inicial e na ficha.
const { abrir, ok } = require('./harness');

(async () => {
  const { browser, page } = await abrir();
  await page.waitForTimeout(600);
  await page.evaluate(() => { const a2 = state.allCourts.find(c => c.id === 'a2'); a2.amenities = [...(a2.amenities || []), 'acessibilidade']; render(); });
  await page.waitForTimeout(200);

  let r = await page.evaluate(() => ({
    opcao: AMENITY_OPTS.find(a => a.key === 'acessibilidade')?.label,
    filtro: FILTER_AMENITY_OPTS.some(a => a.key === 'acessibilidade'),
    tipos: [...document.querySelectorAll('.home-tipo strong')].map(s => s.innerText.trim()),
  }));
  ok(r.opcao === 'Acessibilidade' && r.filtro, '"Acessibilidade" nas comodidades (cadastro) e nos Filtros');
  ok(r.tipos.includes('Com acessibilidade'), '"Com acessibilidade" em "Busque pelo tipo de quadra" — ' + r.tipos.join(', '));

  await page.click('.home-tipo:has-text("Com acessibilidade")');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ nomes: getResults().map(c => c.id).join(), link: location.search }));
  ok(r.nomes === 'a2' && /comodidades=acessibilidade/.test(r.link), 'o toque abre a busca só com quem tem acessibilidade — ' + r.link);

  await page.evaluate(() => openCourt('a2'));
  await page.waitForTimeout(800);
  r = await page.evaluate(() => ({
    destaques: [...document.querySelectorAll('.ht-destaque-t')].map(p => p.innerText.trim()),
    estrutura: document.getElementById('ht-comodidades')?.innerText || '',
  }));
  ok(r.destaques.includes('Acessibilidade') && r.estrutura.includes('Acessibilidade'), 'na ficha, nos destaques e na Estrutura — ' + r.destaques.join(' | '));

  await browser.close();
})();
