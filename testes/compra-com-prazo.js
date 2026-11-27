// Regra 302 (20/11/2026): "dê um limite para a compra ser realizada e não ficar
// sempre esperando o cartão". O cartão confere por 3 minutos e o Pix até o
// código vencer; depois, a tela diz o que aconteceu, com "Conferir de novo" e
// "Pagar de outro jeito" (ou "Gerar outro Pix").
const { abrir, ok } = require('./harness');
const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s) || {}).innerText || '', sel);

(async () => {
  const { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/creditos', premium: ['a1'] });
  await page.route('**/.netlify/functions/pagamento', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ situacao: 'aberta' }) }));
  await page.waitForTimeout(400);
  // Cartão em análise há mais de 3 minutos.
  await page.evaluate(() => {
    state.page = 'parceiros'; state.parceirosAba = 'creditos';
    state.pcCompra = { tipo: 'creditos', forma: 'cartao', passo: 'volta', compra: '00000000-0000-4000-8000-0000000000c1', valorCobrado: 50, inicio: Date.now() - 4 * 60 * 1000 };
    render(); esperarPagamento();
  });
  await page.waitForTimeout(300);
  let t = await texto(page, '#pc-compra');
  ok(t.includes('O pagamento ainda não foi confirmado') && t.includes('Nada é cobrado sem a aprovação') && t.includes('Conferir de novo') && t.includes('Pagar de outro jeito') && !t.includes('Conferindo'),
    'cartão: depois de 3 minutos, para de esperar e diz o que aconteceu — ' + t.slice(0, 80));
  await page.click('[data-compra-conferir]');
  await page.waitForTimeout(200);
  ok((await texto(page, '#pc-compra')).includes('Conferindo o pagamento'), '"Conferir de novo" volta a conferir');
  await page.evaluate(() => { state.pcCompra.inicio = Date.now() - 4 * 60 * 1000; esperarPagamento(); });
  await page.waitForTimeout(200);
  await page.click('[data-compra-recomecar]');
  await page.waitForTimeout(200);
  t = await texto(page, '#parceiros .pc-main');
  ok(await page.evaluate(() => !state.pcCompra.passo && !state.pcCompra.erro && state.pcCompra.valor === 50 && state.pcCompra.forma === 'cartao') && !(await page.$('.form-error')),
    '"Pagar de outro jeito" volta para a escolha, com o mesmo valor e sem aviso de erro');
  // Pix vencido.
  await page.evaluate(() => {
    const inicio = Date.now() - 32 * 60 * 1000;
    state.pcCompra = { tipo: 'creditos', forma: 'pix', passo: 'pix', compra: '00000000-0000-4000-8000-0000000000c2', valorCobrado: 100, inicio, pix: { qr: '', copia: 'x', expira: new Date(inicio + 30 * 60 * 1000).toISOString() } };
    render(); esperarPagamento();
  });
  await page.waitForTimeout(300);
  t = await texto(page, '#pc-compra');
  ok(t.includes('O código Pix venceu') && t.includes('Gerar outro Pix') && t.includes('Já paguei: conferir') && !t.includes('Esperando o pagamento'), 'Pix: depois de vencer, para de esperar e oferece outro código — ' + t.slice(0, 60));
  await page.click('[data-compra-recomecar]');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => !state.pcCompra.passo && state.pcCompra.valor === 100 && state.pcCompra.forma === 'pix'), '"Gerar outro Pix" volta para a escolha com o mesmo valor');
  // Pix ainda valendo: continua esperando.
  await page.evaluate(() => {
    state.pcCompra = { tipo: 'creditos', forma: 'pix', passo: 'pix', compra: '00000000-0000-4000-8000-0000000000c3', valorCobrado: 100, inicio: Date.now() - 60 * 1000, pix: { qr: '', copia: 'x', expira: new Date(Date.now() + 29 * 60 * 1000).toISOString() } };
    render(); esperarPagamento();
  });
  await page.waitForTimeout(300);
  ok((await texto(page, '#pc-compra')).includes('Esperando o pagamento'), 'Pix dentro do prazo: continua esperando');
  // Regra 309: o QR code do Pix no meio da caixa (no celular e no computador).
  for (const w of [390, 1280]) {
    await page.setViewportSize({ width: w, height: 900 });
    const meio = await page.evaluate(() => {
      state.pcCompra.pix.qr = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='; render();
      const q = document.querySelector('.pc-compra-qr').getBoundingClientRect(), c = document.getElementById('pc-compra').getBoundingClientRect();
      return Math.abs((q.left + q.width / 2) - (c.left + c.width / 2));
    });
    ok(meio < 2, `regra 309: o QR do Pix centralizado (${w} px) — desvio ${meio.toFixed(1)} px`);
  }
  await browser.close();
  console.log('\ncompra-com-prazo.js: fim');
})();
