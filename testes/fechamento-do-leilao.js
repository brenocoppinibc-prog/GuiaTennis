// Regra 284 (16/11/2026): "eu quero alterar as datas que finalizam o leilão". No
// painel do admin, Leilões › "Quando o leilão fecha": o dia da semana e a hora.
const { abrir, ok } = require('./harness');

(async () => {
  const { browser, page } = await abrir({ admin: true, q: 'admin/leiloes' });
  await page.waitForTimeout(1200);
  let r = await page.evaluate(() => ({
    dia: document.getElementById('adm-fecha-dia')?.selectedOptions[0]?.innerText,
    hora: document.getElementById('adm-fecha-hora')?.selectedOptions[0]?.innerText,
    nota: [...document.querySelectorAll('.adm-nota')].map(p => p.innerText).find(t => t.startsWith('Fecha ')) || '',
  }));
  ok(r.dia === 'Domingo' && r.hora === '20h', 'começa em domingo às 20h — ' + r.dia + ' ' + r.hora);
  ok(/o 1º sai terça, .* às 10h e o 2º sexta, .* às 10h\./.test(r.nota), 'os envios contados do fechamento (terça e sexta, às 10h) — ' + r.nota);
  await page.selectOption('#adm-fecha-dia', '3');
  await page.selectOption('#adm-fecha-hora', '18');
  await page.click('#adm-fechamento-salvar');
  await page.waitForTimeout(500);
  r = await page.evaluate(() => ({ mudou: window.__fechamentoMudado, push: document.querySelector('.gt-push')?.innerText || '', dia: document.getElementById('adm-fecha-dia')?.value, hora: document.getElementById('adm-fecha-hora')?.value }));
  ok(JSON.stringify(r.mudou) === '[3,18]' && r.push.includes('quarta às 18h') && r.dia === '3' && r.hora === '18', '"Salvar" muda para quarta às 18h e avisa — ' + r.push);
  r = await page.evaluate(() => enviosDoLeilao('2026-11-22T23:00:00Z'));
  ok(r[0] === '2026-11-24T13:00:00.000Z' && r[1] === '2026-11-27T13:00:00.000Z', 'os envios: 1 dia e 14 horas; 4 dias e 14 horas depois');
  await browser.close();
})();
