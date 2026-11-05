// Regra 214 (05/11/2026): "quando a avaliação ou resposta estiver carregando
// para ser postada, deixar como no insta, meio cinza". O banco é atrasado de
// propósito para ver o cartão cinza com "Publicando…" e depois o normal.
const { abrir, ok } = require('./harness');
const atrasar = (page) => page.evaluate(() => {
  const orig = sb.from.bind(sb);
  const espera = (fn) => new Promise(res => setTimeout(() => res(fn()), 800));
  sb.from = (t) => {
    const b = orig(t);
    if (t === 'avaliacoes') return Object.assign(Object.create(b), { insert: (v) => ({ select: (c) => ({ single: () => espera(() => orig(t).insert(v).select(c).single()) }) }) });
    if (t === 'respostas') return Object.assign(Object.create(b), { insert: (v) => espera(() => orig(t).insert(v)) });
    return b;
  };
});

(async () => {
  let { browser, page } = await abrir({ jogador: true, jogadorConfirmado: true });
  await page.evaluate(() => openCourt('a1'));
  await page.waitForTimeout(400);
  await atrasar(page);
  await page.click('#star-picker span[data-star="5"]');
  await page.click('#rate-consent');
  await page.click('#rate-submit');
  await page.waitForTimeout(250);
  let t = await page.evaluate(() => ({ cinza: document.querySelector('.ht-rev.gt-enviando')?.innerText || '', opac: getComputedStyle(document.querySelector('.ht-rev.gt-enviando') || document.body).opacity, travado: document.getElementById('rate-submit')?.disabled }));
  ok(t.cinza.includes('Publicando…') && Number(t.opac) < 1 && t.travado !== false, 'enviando: a avaliação já aparece, meio cinza, com "Publicando…" — ' + JSON.stringify(t));
  await page.waitForTimeout(1200);
  t = await page.evaluate(() => ({ cinza: !!document.querySelector('.gt-enviando'), n: window.__db.avaliacoes.length, nota: getAppRating('a1').count }));
  ok(!t.cinza && t.n === 1 && t.nota >= 1, 'publicada: o cinza sai e a avaliação fica — ' + JSON.stringify(t));
  await browser.close();

  ({ browser, page } = await abrir({ academia: 'a1', avaliacoes: [{ id: 'r9', academia_id: 'a1', stars: 4, comment: 'Boa quadra.', nome_autor: 'Gil', created_at: '2026-11-01T10:00:00Z', status: 'published' }], q: 'parceiros/avaliacoes' }));
  await page.waitForTimeout(400);
  await atrasar(page);
  await page.click('#parceiros [data-responder="r9"]');
  await page.fill('#resposta-texto', 'Obrigado, Gil!');
  await page.click('#resposta-publicar');
  await page.waitForTimeout(250);
  t = await page.evaluate(() => ({ cinza: document.querySelector('.rev-resp.gt-enviando')?.innerText || '', form: !!document.getElementById('resposta-texto') }));
  ok(t.cinza.includes('Obrigado, Gil!') && t.cinza.includes('Publicando…') && !t.form, 'a resposta já aparece embaixo da avaliação, meio cinza — ' + JSON.stringify(t));
  await page.waitForTimeout(1500);
  t = await page.evaluate(() => ({ cinza: !!document.querySelector('.gt-enviando'), resp: document.querySelector('#parceiros .rev-resp')?.innerText || '' }));
  ok(!t.cinza && t.resp.includes('Obrigado, Gil!'), 'publicada: a resposta fica normal — ' + t.resp.slice(0, 80));
  await browser.close();
})();
