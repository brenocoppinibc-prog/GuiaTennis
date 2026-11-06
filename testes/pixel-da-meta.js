// Regra 218 (06/11/2026): o Pixel da Meta pronto e desligado. Desligado, nada
// muda; ligado, o aviso de cookies com "Aceitar" e "Recusar", e o Pixel só
// carrega depois do "Aceitar".
const { abrir, ok } = require('./harness');

(async () => {
  let { browser, page } = await abrir({ w: 390, cookies: true });
  // Ligado em 06/11/2026 com o Pixel do GuiaTennis.
  let t = await page.evaluate(() => ({ id: META_PIXEL.id, priv: PRIVACY_HTML.includes('Cookies da Meta (só com a sua permissão)') && PRIVACY_HTML.includes('Última atualização: 6 de novembro de 2026') }));
  ok(t.id === '2565402353955968' && t.priv, 'o Pixel do GuiaTennis ligado, com a Privacidade nova e a data de 06/11');
  await page.evaluate(() => { META_PIXEL.id = ''; render(); });
  t = await page.evaluate(() => ({ aviso: !!document.querySelector('.gt-cookies'), fbq: !!window.fbq, rodape: !!document.getElementById('footer-cookies') }));
  ok(!t.aviso && !t.fbq && !t.rodape, 'sem o número do Pixel: sem aviso, sem Pixel e sem "Cookies" no rodapé — ' + JSON.stringify(t));

  await page.evaluate(() => { META_PIXEL.id = '123'; render(); });
  t = await page.evaluate(() => ({ aviso: document.querySelector('.gt-cookies')?.innerText || '', bts: [...document.querySelectorAll('[data-cookies]')].map(b => b.innerText + ':' + Math.round(b.getBoundingClientRect().width)), fbq: !!window.fbq }));
  const [rec, ace] = t.bts.map(x => x.split(':'));
  ok(t.aviso.includes('Com a sua permissão') && rec[0] === 'Recusar' && ace[0] === 'Aceitar' && rec[1] === ace[1] && !t.fbq, 'ligado: o aviso com "Recusar" e "Aceitar" do mesmo tamanho, e o Pixel ainda não carrega — ' + t.bts.join(' / '));
  await page.click('[data-cookies="recusou"]');
  await page.waitForTimeout(150);
  t = await page.evaluate(() => ({ aviso: !!document.querySelector('.gt-cookies'), fbq: !!window.fbq, escolha: escolhaDeCookies() }));
  ok(!t.aviso && !t.fbq && t.escolha === 'recusou', '"Recusar": o aviso some e nada vai para a Meta');

  await page.evaluate(() => { localStorage.removeItem(COOKIES_KEY); render(); });
  await page.click('[data-cookies="aceitou"]');
  await page.waitForTimeout(150);
  await page.evaluate(() => trackClick('a1', 'whatsapp'));
  t = await page.evaluate(() => ({ fbq: !!window.fbq, script: !!document.querySelector('script[src*="connect.facebook.net"]'), fila: (window.fbq && window.fbq.queue || []).map(a => a[0] + ':' + a[1]) }));
  ok(t.fbq && t.script && t.fila.includes('init:123') && t.fila.includes('track:PageView') && t.fila.includes('track:Contact'), '"Aceitar": o Pixel carrega e conta a visita e o contato com a academia — ' + t.fila.join(', '));
  await browser.close();

  ({ browser, page } = await abrir({ admin: true, cookies: true }));
  await page.evaluate(() => { META_PIXEL.id = '123'; render(); });
  ok(!(await page.$('.gt-cookies')) && !(await page.evaluate(() => !!window.fbq)), 'o admin não vê o aviso nem carrega o Pixel');
  await browser.close();
})();
