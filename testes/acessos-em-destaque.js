// Os acessos em todo plano (regra 68). Pedidos do Breno: 08/10/2026 "deixe
// mais atrativos como acessos", e depois "está muito grande, deixe pequeno e
// algo como conferir mais detalhes na aba desempenho… algo com desempenho,
// insights". Em Atualizações, um cartão pequeno "Desempenho" com os acessos
// de 30 dias e "Ver detalhes"; na aba Desempenho, os acessos e o Premium.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);

(async () => {
  // ---- Básico: o cartão pequeno "Desempenho", logo abaixo do "Olá" ----
  let { browser, page } = await abrir({ academia: 'a2', q: 'parceiros/painel', plano: 'basico' });
  await page.waitForTimeout(400);
  let r = await page.evaluate(() => {
    const c = document.querySelector('#parceiros .pc-desempenho-mini');
    const ficha = [...document.querySelectorAll('#parceiros .pc-card-t')].find(e => e.innerText.startsWith('Ficha'));
    return {
      texto: c?.innerText.replace(/\s+/g, ' ').trim() || '',
      link: c?.getAttribute('href'),
      antesDaFicha: !!(c && ficha && (c.compareDocumentPosition(ficha) & Node.DOCUMENT_POSITION_FOLLOWING)),
      altura: c ? Math.round(c.getBoundingClientRect().height) : 0,
      grande: !!document.querySelector('#parceiros .pc-vitrine'),
    };
  });
  ok(r.texto.startsWith('Desempenho') && r.texto.includes('42 acessos à ficha nos últimos 30 dias') && r.texto.includes('Ver detalhes'), 'Básico: o cartão "Desempenho" com os acessos de 30 dias — ' + r.texto);
  ok(r.link === '/parceiros/desempenho' && r.antesDaFicha && r.altura < 110 && !r.grande, 'pequeno, logo abaixo do "Olá", e leva à aba Desempenho — ' + r.altura + 'px');
  await page.evaluate(async () => { window.__acessos = 1; await carregarNumeros(); });
  ok((await texto(page, '#parceiros .pc-desempenho-mini')).includes('1 acesso à ficha'), 'um acesso: no singular');
  await page.evaluate(async () => { window.__acessos = 0; await carregarNumeros(); });
  ok((await texto(page, '#parceiros .pc-desempenho-mini')).includes('Nenhum acesso à ficha nos últimos 30 dias'), 'nenhum acesso: diz isso');
  await page.evaluate(async () => { window.__semAcessos = true; await carregarNumeros(); });
  r = await texto(page, '#parceiros .pc-desempenho-mini');
  ok(r.includes('Quantas pessoas abriram a ficha de vocês') && !/\d/.test(r), 'banco antes do SQL novo: o cartão sem número (nunca inventado)');
  await page.evaluate(() => { window.__semAcessos = false; window.__acessos = 42; });
  await page.click('#parceiros .pc-desempenho-mini');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ aba: state.parceirosAba, v: document.querySelector('#parceiros .pc-vitrine')?.innerText.replace(/\s+/g, ' ') || '' }));
  ok(r.aba === 'desempenho' && r.v.includes('42 acessos à ficha de vocês') && r.v.includes('Quantos chamaram vocês') && r.v.includes('Ver os números no Premium'), '"Ver detalhes": na aba Desempenho, os acessos e o que o Premium libera — ' + r.v.slice(0, 90));
  await page.evaluate(async () => { window.__acessos = 0; await carregarNumeros(); });
  r = await texto(page, '#parceiros .pc-vitrine');
  ok(r.includes('Nenhum acesso ainda') && r.includes('QR code'), 'Desempenho com nenhum acesso: a dica do QR code');
  await browser.close();

  // ---- Completo: igual ao Básico ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/painel', plano: 'completo' }));
  await page.waitForTimeout(400);
  ok((await texto(page, '#parceiros .pc-desempenho-mini')).includes('42 acessos'), 'Completo: o cartão também');
  await browser.close();

  // ---- Premium: os números de sempre, sem o cartão ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/painel', plano: 'premium' }));
  await page.waitForTimeout(400);
  ok(!(await page.$('#parceiros .pc-desempenho-mini')) && (await texto(page, '#parceiros .pc-main')).includes('Visitas na ficha'), 'Premium: o Desempenho de sempre, sem o cartão pequeno');
  await browser.close();
})();
