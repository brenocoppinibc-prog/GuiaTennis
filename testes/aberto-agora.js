// Regra 274 (15/11/2026): "Aberto agora · até 22h" no cartão da busca e o filtro
// rápido "Aberto agora", como o Google Maps e os diretórios de quadra. Regra 276:
// a comodidade "Iluminação para jogar à noite" saiu ("isso é um fato").
const { abrir, ok } = require('./harness');

(async () => {
  const { browser, page } = await abrir();
  // Segunda-feira, 15h (a1: semana das 6h às 22h; a2 sem horário).
  await page.clock.setFixedTime(new Date('2026-11-16T15:00:00'));
  await page.waitForTimeout(600);

  let r = await page.evaluate(() => ({
    tipos: [...document.querySelectorAll('.home-tipo strong')].map(s => s.innerText.trim()),
    iluminacao: AMENITY_OPTS.some(a => /ilumina/i.test(a.key + a.label)),
  }));
  ok(!r.iluminacao && !r.tipos.some(t => /ilumina/i.test(t)), 'regra 276: sem a iluminação nas comodidades nem na inicial — ' + r.tipos.join(', '));

  await page.evaluate(() => { state.cep = 'Pinheiros, São Paulo'; goSearch(); doSearch(); });
  await page.waitForTimeout(1200);
  r = await page.evaluate(() => ({
    hora: [...document.querySelectorAll('.rcard')].map(c => (c.querySelector('.rcard-hora')?.innerText || '').trim()),
    rapidos: [...document.querySelectorAll('.frap')].map(b => b.innerText.trim()),
  }));
  ok(r.hora.includes('Aberto agora · até 22h') && r.hora.includes(''), 'no cartão, "Aberto agora · até 22h"; sem horário, nada — ' + JSON.stringify(r.hora));
  ok(!r.rapidos.includes('Iluminada') && r.rapidos[r.rapidos.length - 1] === 'Aberto agora', 'filtros rápidos com "Aberto agora", sem "Iluminada" — ' + r.rapidos.join('|'));

  await page.click('.frap:has-text("Aberto agora")');
  await page.waitForTimeout(300);
  r = await page.evaluate(() => ({ nomes: getResults().map(c => c.id).join(), link: location.search, on: document.querySelector('.frap.on')?.innerText.trim() }));
  ok(r.nomes === 'a1' && /aberto=1/.test(r.link) && /Aberto agora/.test(r.on || ''), '"Aberto agora" deixa só quem atende agora e vai no link — ' + r.link);
  await page.click('.frap:has-text("Aberto agora")');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => getResults().length === 2 && !/aberto=1/.test(location.search)), 'outro toque desliga');

  // Domingo: a1 fecha.
  await page.clock.setFixedTime(new Date('2026-11-15T15:00:00'));
  await page.evaluate(() => render());
  await page.waitForTimeout(300);
  r = await page.evaluate(() => [...document.querySelectorAll('.rcard-hora')].map(e => e.innerText.trim()));
  ok(r.includes('Fechado agora'), 'domingo: "Fechado agora" — ' + r.join('|'));

  await browser.close();
})();
