// Pedido do Breno em 08/10/2026: "pode subir um pouco mais os números e
// deixe mais atrativos como acessos… deixe no meio da tela". Os acessos dos
// últimos 30 dias em todo plano, logo abaixo do "Olá" (regra 68).
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);

(async () => {
  // ---- Básico: o número grande, logo abaixo do "Olá", antes da ficha ----
  let { browser, page } = await abrir({ academia: 'a2', q: 'parceiros/painel', plano: 'basico' });
  await page.waitForTimeout(400);
  let r = await page.evaluate(() => {
    const v = document.querySelector('#parceiros .pc-vitrine');
    const ficha = [...document.querySelectorAll('#parceiros .pc-card-t')].find(e => e.innerText.startsWith('Ficha'));
    const caixa = v && v.getBoundingClientRect();
    return {
      n: v?.querySelector('.pc-vitrine-n')?.innerText,
      texto: v?.innerText.replace(/\s+/g, ' ') || '',
      antesDaFicha: !!(v && ficha && (v.compareDocumentPosition(ficha) & Node.DOCUMENT_POSITION_FOLLOWING)),
      centro: v ? getComputedStyle(v).textAlign : '',
      noAlto: caixa ? caixa.top < 600 : false,
      trancadoNoFim: !!document.querySelector('#parceiros .pc-trancado'),
    };
  });
  ok(r.n === '42' && r.texto.includes('ÚLTIMOS 30 DIAS') && r.texto.includes('acessos à ficha de vocês no GuiaTennis'), 'Básico: os acessos dos últimos 30 dias em destaque — ' + r.texto.slice(0, 90));
  ok(r.antesDaFicha && r.noAlto && r.centro === 'center', 'logo abaixo do "Olá", antes da ficha, no meio e na primeira tela');
  ok(r.texto.includes('Quantos chamaram vocês') && r.texto.includes('De onde vieram') && r.texto.includes('Ver os números no Premium') && !r.trancadoNoFim, 'o resto trancado no Premium, sem o bloco antigo no fim');
  await page.evaluate(async () => { window.__acessos = 1; await carregarNumeros(); });
  ok((await texto(page, '#parceiros .pc-vitrine')).includes('acesso à ficha de vocês'), 'um acesso: no singular');
  await page.evaluate(async () => { window.__acessos = 0; await carregarNumeros(); });
  r = await texto(page, '#parceiros .pc-vitrine');
  ok(r.includes('Nenhum acesso ainda') && r.includes('QR code') && !(await page.$('#parceiros .pc-vitrine-n')), 'nenhum acesso: diz isso e dá a dica do QR code — ' + r.replace(/\s+/g, ' ').slice(0, 80));
  await page.evaluate(async () => { window.__semAcessos = true; await carregarNumeros(); });
  r = await texto(page, '#parceiros .pc-vitrine');
  ok(r.includes('Os acessos da ficha de vocês') && !/\d/.test(r.replace('30 DIAS', '')), 'banco antes do SQL novo: o bloco sem número (nunca inventado)');
  await browser.close();

  // ---- Completo: igual ao Básico ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/painel', plano: 'completo' }));
  await page.waitForTimeout(400);
  ok((await texto(page, '#parceiros .pc-vitrine-n')) === '42', 'Completo: os acessos também');
  await browser.close();

  // ---- Premium: os números de sempre, sem o bloco ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/painel', plano: 'premium' }));
  await page.waitForTimeout(400);
  ok(!(await page.$('#parceiros .pc-vitrine')) && (await texto(page, '#parceiros .pc-main')).includes('Visitas na ficha'), 'Premium: o Desempenho de sempre, sem o bloco dos acessos');
  await browser.close();
})();
