// Pedido do Breno em 08/10/2026: "no parceiros ao ir descendo a primeira tela
// inicial, as informações vão aparecendo, tipo acendendo". Os blocos da página
// inicial começam apagados, acendem quando entram na tela e ficam acesos.
const { abrir, ok } = require('./harness');

const estado = (page, chave) => page.evaluate((k) => {
  const el = document.querySelector(`[data-revela="${k}"]`);
  return el ? { aceso: el.classList.contains('aceso'), opacidade: Number(getComputedStyle(el).opacity) } : null;
}, chave);

(async () => {
  let { browser, page } = await abrir({ q: 'parceiros', w: 412 });
  await page.waitForTimeout(1200);
  let topo = await estado(page, 'hero-1'), plano = await estado(page, 'plano-premium'), fim = await estado(page, 'fim');
  ok(topo && topo.aceso && topo.opacidade === 1, 'o topo acende sozinho ao abrir a página');
  ok(plano && !plano.aceso && plano.opacidade === 0 && fim && !fim.aceso, 'o que está mais embaixo começa apagado');
  await page.evaluate(() => document.querySelector('[data-revela="ben-0"]').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1400);
  const ben = await estado(page, 'ben-0');
  ok(ben.aceso && ben.opacidade === 1, 'ao descer, os cartões de "Por que estar" acendem');
  ok(!(await estado(page, 'fim')).aceso, 'e o fim da página continua apagado até chegar lá');
  // Descendo aos poucos, como uma pessoa faz.
  for (let i = 0; i < 40; i++) {
    const fimDaPagina = await page.evaluate(() => { window.scrollBy(0, 350); return innerHeight + scrollY >= document.body.scrollHeight - 2; });
    await page.waitForTimeout(120);
    if (fimDaPagina) break;
  }
  await page.waitForTimeout(1400);
  ok((await estado(page, 'fim')).aceso && (await estado(page, 'plano-premium')).aceso, 'descendo até o fim, tudo acende');
  const texto = await page.evaluate(() => document.querySelector('#parceiros').innerText);
  ok(texto.includes('Por que estar no GuiaTennis') && texto.includes('Como funciona') && texto.includes('Pronto para aparecer'), 'o texto está todo na página (para o Google e para quem lê a tela)');
  // Redesenhar a tela não apaga o que já acendeu.
  await page.evaluate(() => render());
  await page.waitForTimeout(50);
  const depois = await page.evaluate(() => [...document.querySelectorAll('[data-revela]')].every(el => el.classList.contains('aceso')));
  ok(depois, 'quando a tela é redesenhada, o que já acendeu continua aceso, sem piscar');
  // Só na página inicial.
  await page.evaluate(() => irParceiros('planos', { mesmaAba: true }));
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => !document.querySelector('.pc-revelando') && !document.querySelector('[data-revela]') && Number(getComputedStyle(document.querySelector('.pc-plano')).opacity) === 1), 'nas outras páginas do Parceiros, nada fica apagado');
  await browser.close();

  // Quem pede menos movimento no celular vê tudo de uma vez.
  ({ browser, page } = await abrir({ q: 'parceiros', w: 412 }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => render());
  await page.waitForTimeout(200);
  const tudo = await page.evaluate(() => [...document.querySelectorAll('[data-revela]')].every(el => Number(getComputedStyle(el).opacity) === 1));
  ok(tudo, 'com "reduzir movimento" ligado no celular, tudo aparece de uma vez');
  await browser.close();
})();
