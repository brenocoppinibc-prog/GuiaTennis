// Regra 277 (15/11/2026): "eu quero colocar comodidade de pet friendly". A
// comodidade "Aceita pets" no cadastro, nos Filtros, na inicial e na ficha.
const { abrir, ok } = require('./harness');

(async () => {
  const { browser, page } = await abrir();
  await page.waitForTimeout(600);
  await page.evaluate(() => { const a2 = state.allCourts.find(c => c.id === 'a2'); a2.amenities = [...(a2.amenities || []), 'pet']; render(); });
  await page.waitForTimeout(200);

  let r = await page.evaluate(() => ({
    opcao: AMENITY_OPTS.find(a => a.key === 'pet')?.label,
    filtro: FILTER_AMENITY_OPTS.some(a => a.key === 'pet'),
    tipos: [...document.querySelectorAll('.home-tipo strong')].map(s => s.innerText.trim()),
  }));
  ok(r.opcao === 'Aceita pets' && r.filtro, '"Aceita pets" nas comodidades (cadastro) e nos Filtros');
  ok(r.tipos.includes('Aceita pets'), '"Aceita pets" em "Busque pelo tipo de quadra" — ' + r.tipos.join(', '));

  await page.click('.home-tipo:has-text("Aceita pets")');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ nomes: getResults().map(c => c.id).join(), link: location.search }));
  ok(r.nomes === 'a2' && /comodidades=pet/.test(r.link), 'o toque abre a busca só com quem aceita pets — ' + r.link);

  await page.evaluate(() => openCourt('a2'));
  await page.waitForTimeout(800);
  r = await page.evaluate(() => ({
    destaques: [...document.querySelectorAll('.ht-destaque-t')].map(p => p.innerText.trim()),
    estrutura: document.getElementById('ht-comodidades')?.innerText || '',
  }));
  ok(r.destaques.includes('Aceita pets') && r.estrutura.includes('Aceita pets'), 'na ficha, nos destaques e na Estrutura — ' + r.destaques.join(' | '));

  await browser.close();
})();
