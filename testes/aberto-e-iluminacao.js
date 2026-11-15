// Regra 274 (15/11/2026): "revise detalhe por detalhe, compare com o Trivago e os
// diretórios grandes de quadra de tênis". Do Google Maps e dos localizadores de
// quadra (USTA, ClubSpark, Playtomic): "Aberto agora · até 22h" no cartão, o filtro
// rápido "Aberto agora" e a comodidade "Iluminação para jogar à noite".
const { abrir, ok } = require('./harness');

(async () => {
  const { browser, page } = await abrir();
  // Segunda-feira, 15h (a1: semana das 6h às 22h; a2 sem horário).
  await page.clock.setFixedTime(new Date('2026-11-16T15:00:00'));
  await page.waitForTimeout(600);
  await page.evaluate(() => { const a1 = state.allCourts.find(c => c.id === 'a1'); a1.amenities = [...(a1.amenities || []), 'iluminacao']; render(); });
  await page.waitForTimeout(200);

  let r = await page.evaluate(() => ({
    tipos: [...document.querySelectorAll('.home-tipo strong')].map(s => s.innerText.trim()),
    opcao: AMENITY_OPTS.find(a => a.key === 'iluminacao')?.label,
  }));
  ok(r.opcao === 'Iluminação para jogar à noite', 'a comodidade nova no cadastro e nos filtros — ' + r.opcao);
  ok(r.tipos.includes('Quadras iluminadas'), '"Quadras iluminadas" em "Busque pelo tipo de quadra" — ' + r.tipos.join(', '));

  await page.evaluate(() => { state.cep = 'Pinheiros, São Paulo'; goSearch(); doSearch(); });
  await page.waitForTimeout(1200);
  r = await page.evaluate(() => ({
    hora: [...document.querySelectorAll('.rcard')].map(c => (c.querySelector('.rcard-hora')?.innerText || '').trim()),
    rapidos: [...document.querySelectorAll('.frap')].map(b => b.innerText.trim()),
  }));
  ok(r.hora.includes('Aberto agora · até 22h') && r.hora.includes(''), 'no cartão, "Aberto agora · até 22h"; sem horário, nada — ' + JSON.stringify(r.hora));
  ok(r.rapidos.includes('Iluminada') && r.rapidos[r.rapidos.length - 1] === 'Aberto agora', 'filtros rápidos com "Iluminada" e "Aberto agora" — ' + r.rapidos.join('|'));

  await page.click('.frap:has-text("Aberto agora")');
  await page.waitForTimeout(300);
  r = await page.evaluate(() => ({ nomes: getResults().map(c => c.id).join(), link: location.search, on: document.querySelector('.frap.on')?.innerText.trim() }));
  ok(r.nomes === 'a1' && /aberto=1/.test(r.link) && /Aberto agora/.test(r.on || ''), '"Aberto agora" deixa só quem atende agora e vai no link — ' + r.link);
  await page.click('.frap:has-text("Aberto agora")');
  await page.click('.frap:has-text("Iluminada")');
  await page.waitForTimeout(300);
  r = await page.evaluate(() => ({ nomes: getResults().map(c => c.id).join(), link: location.search }));
  ok(r.nomes === 'a1' && /comodidades=iluminacao/.test(r.link) && !/aberto=1/.test(r.link), '"Iluminada" filtra pela comodidade — ' + r.link);

  // Domingo: a1 fecha.
  await page.clock.setFixedTime(new Date('2026-11-15T15:00:00'));
  await page.click('.frap:has-text("Iluminada")');
  await page.waitForTimeout(300);
  r = await page.evaluate(() => [...document.querySelectorAll('.rcard-hora')].map(e => e.innerText.trim()));
  ok(r.includes('Fechado agora'), 'domingo: "Fechado agora" — ' + r.join('|'));

  // Ficha: a iluminação entre os destaques.
  await page.evaluate(() => openCourt('a1'));
  await page.waitForTimeout(800);
  r = await page.evaluate(() => [...document.querySelectorAll('.ht-destaque-t')].map(p => p.innerText.trim()));
  ok(r.includes('Iluminação para jogar à noite'), 'na ficha, a iluminação nos destaques — ' + r.join(' | '));

  await browser.close();
})();
