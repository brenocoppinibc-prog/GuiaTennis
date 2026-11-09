// Regra 218 (06/11/2026): o Pixel da Meta pronto e desligado. Desligado, nada
// muda; ligado, o aviso de cookies com "Aceitar" e "Recusar", e o Pixel só
// carrega depois do "Aceitar".
const { abrir, ok } = require('./harness');

(async () => {
  let { browser, page } = await abrir({ w: 390, cookies: true });
  // Ligado em 06/11/2026 com o Pixel do GuiaTennis.
  let t = await page.evaluate(() => ({ id: META_PIXEL.id, priv: PRIVACY_HTML.includes('Cookies de anúncio da Meta, do Google e do Pinterest (só com a sua permissão)') && PRIVACY_HTML.includes('Última atualização: 9 de novembro de 2026') }));
  ok(t.id === '2565402353955968' && t.priv, 'o Pixel do GuiaTennis ligado, com a Privacidade nova e a data de 08/11');
  await page.evaluate(() => { META_PIXEL.id = ''; GOOGLE_ADS.id = ''; PINTEREST_TAG.id = ''; render(); });
  t = await page.evaluate(() => ({ aviso: !!document.querySelector('.gt-cookies'), fbq: !!window.fbq, rodape: !!document.getElementById('footer-cookies') }));
  ok(!t.aviso && !t.fbq && !t.rodape, 'sem o número do Pixel: sem aviso, sem Pixel e sem "Cookies" no rodapé — ' + JSON.stringify(t));

  await page.evaluate(() => { META_PIXEL.id = '123'; GOOGLE_ADS.id = 'AW-1'; PINTEREST_TAG.id = '2614435484797'; render(); });
  t = await page.evaluate(() => ({ aviso: document.querySelector('.gt-cookies')?.innerText || '', bts: [...document.querySelectorAll('[data-cookies]')].map(b => b.innerText + ':' + Math.round(b.getBoundingClientRect().width)), fbq: !!window.fbq }));
  const [rec, ace] = t.bts.map(x => x.split(':'));
  ok(t.aviso.includes('Com a sua permissão') && rec[0] === 'Recusar' && ace[0] === 'Aceitar' && rec[1] === ace[1] && !t.fbq, 'ligado: o aviso com "Recusar" e "Aceitar" do mesmo tamanho, e o Pixel ainda não carrega — ' + t.bts.join(' / '));
  await page.click('[data-cookies="recusou"]');
  await page.waitForTimeout(150);
  t = await page.evaluate(() => ({ aviso: !!document.querySelector('.gt-cookies'), fbq: !!window.fbq, escolha: escolhaDeCookies() }));
  ok(!t.aviso && !t.fbq && t.escolha === 'recusou', '"Recusar": o aviso some e nada vai para a Meta');

  await page.evaluate(() => { localStorage.removeItem(COOKIES_KEY); render(); });
  // O core.js de verdade troca o pintrk e esvazia a fila: no teste, fica de fora.
  await page.route('https://s.pinimg.com/**', r => r.abort());
  await page.click('[data-cookies="aceitou"]');
  await page.waitForTimeout(150);
  await page.evaluate(() => { trackClick('a1', 'visualizacao'); trackClick('a1', 'whatsapp'); });
  t = await page.evaluate(() => ({ fbq: !!window.fbq, script: !!document.querySelector('script[src*="connect.facebook.net"]'), fila: (window.fbq && window.fbq.queue || []).map(a => a[0] + ':' + a[1]) }));
  ok(t.fbq && t.script && t.fila.includes('init:123') && t.fila.includes('track:PageView') && t.fila.includes('track:Contact') && t.fila.includes('track:ViewContent'), '"Aceitar": o Pixel carrega e conta a visita, a ficha vista e o contato com a academia — ' + t.fila.join(', '));
  const ids = await page.evaluate(() => window.fbq.queue.filter(a => a[1] === 'Contact' || a[1] === 'ViewContent').map(a => (a[2].content_ids || []).join()).join('|'));
  ok(ids === 'a1|a1', 'a ficha vista e o contato levam o id da academia, o mesmo do catálogo (regra 219) — ' + ids);
  // A tag do Google Ads (08/11), atrás do mesmo aviso.
  const g = await page.evaluate(() => ({ script: !!document.querySelector('script[src*="googletagmanager.com/gtag/js?id=AW-1"]'), ev: (window.dataLayer || []).map(a => a[0] + ':' + a[1]).join(', '), item: JSON.stringify(((window.dataLayer || []).find(a => a[1] === 'generate_lead') || [])[2]) }));
  ok(g.script && g.ev.includes('config:AW-1') && g.ev.includes('event:view_item') && g.ev.includes('event:generate_lead') && g.item.includes('"id":"a1"'), 'a tag do Google carrega junto e conta a ficha vista e o contato, com o id da academia — ' + g.ev);
  // A tag do Pinterest (regra 226), atrás do mesmo aviso.
  const p = await page.evaluate(() => ({ script: !!document.querySelector('script[src="https://s.pinimg.com/ct/core.js"]'), fila: (window.pintrk && window.pintrk.queue || []).map(a => a[0] + ':' + (typeof a[1] === 'string' ? a[1] : '')),
    lead: JSON.stringify(((window.pintrk && window.pintrk.queue || []).find(a => a[1] === 'lead') || [])[2] || {}) }));
  ok(p.script && p.fila.includes('load:2614435484797') && p.fila.includes('page:') && p.fila.includes('track:pagevisit') && p.fila.includes('track:lead') && p.lead.includes('"product_id":"a1"'),
    'a tag do Pinterest carrega junto e conta a visita, a ficha vista e o contato, com o id da academia — ' + p.fila.join(', '));
  const conv = await page.evaluate(() => JSON.stringify(((window.dataLayer || []).find(a => a[1] === 'conversion') || [])[2] || {}));
  ok(conv === '{"send_to":"AW-1/uUlSCMKeibUdEJ656JJF"}', 'o contato também conta como a conversão "Chamou uma academia" — ' + conv);
  await browser.close();

  // A correspondência controlada: o e-mail só do jogador logado, nunca da academia.
  ({ browser, page } = await abrir({ jogador: true, cookies: true }));
  await page.click('[data-cookies="aceitou"]');
  await page.waitForTimeout(150);
  t = await page.evaluate(() => JSON.stringify((window.fbq.queue.find(a => a[0] === 'init') || [])[2] || {}));
  ok(t === '{"em":"ana@exemplo.com"}', 'jogador logado que aceitou: o e-mail vai na correspondência (o Pixel cifra) — ' + t);
  await browser.close();
  ({ browser, page } = await abrir({ academia: 'a1', cookies: true }));
  ok(await page.evaluate(() => JSON.stringify(correspondenciaDoPixel()) === '{}' && !window.fbq), 'conta de academia: nem e-mail, nem Pixel');
  await browser.close();

  ({ browser, page } = await abrir({ admin: true, cookies: true }));
  await page.evaluate(() => { META_PIXEL.id = '123'; render(); });
  ok(!(await page.$('.gt-cookies')) && !(await page.evaluate(() => !!window.fbq)), 'o admin não vê o aviso nem carrega o Pixel');
  await browser.close();
})();
