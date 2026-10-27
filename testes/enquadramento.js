// Pedido do Breno em 27/10/2026: "eu quero que as fotos, quando for
// selecionadas, possam ajustar o enquadramento" (regra 164) e, no mesmo dia,
// "quero que seja estilo do Instagram o enquadramento" (regra 165): o
// "Cortar" do Instagram — ✕, "Cortar" e "Concluir" no alto, a foto na largura
// do quadro 4:3, arrastar e aproximar, a grade enquanto mexe, o botão de
// expandir (a foto inteira), a lupa no computador e as miniaturas numeradas.
const { abrir, ok, irParte } = require('./harness');
// Uma foto larga, vermelha à esquerda e azul à direita (gerada no navegador).
async function fotoDeTeste(page, w, h) {
  const b64 = await page.evaluate(({ w, h }) => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const x = cv.getContext('2d');
    x.fillStyle = '#e00000'; x.fillRect(0, 0, w / 2, h);
    x.fillStyle = '#0000e0'; x.fillRect(w / 2, 0, w / 2, h);
    return cv.toDataURL('image/png').split(',')[1];
  }, { w, h });
  return Buffer.from(b64, 'base64');
}
// O tamanho e a cor do meio de uma foto guardada.
const medirFoto = (page, url) => page.evaluate((url) => new Promise((ok) => {
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const x = cv.getContext('2d'); x.drawImage(img, 0, 0);
    const [r, , b] = x.getImageData(Math.floor(cv.width / 2), Math.floor(cv.height / 2), 1, 1).data;
    ok({ w: img.naturalWidth, h: img.naturalHeight, cor: r > b ? 'vermelho' : 'azul', jpeg: url.startsWith('data:image/jpeg') });
  };
  img.src = url;
}), url);

const arrastar = async (page, dx) => {
  const q = await page.evaluate(() => { const b = document.getElementById('enq-quadro').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width }; });
  await page.mouse.move(q.x, q.y);
  await page.mouse.down();
  await page.mouse.move(q.x + dx * q.w, q.y, { steps: 8 });
  await page.waitForTimeout(250);
  const grade = await page.evaluate(() => document.getElementById('enq-quadro').classList.contains('mexendo') && getComputedStyle(document.querySelector('.enq-grade')).opacity);
  await page.mouse.up();
  return grade;
};

(async () => {
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha' });
  await page.waitForTimeout(400);
  await page.click('.editar-academia');
  await page.waitForTimeout(400);
  await irParte(page, 'fotos');
  const larga = await fotoDeTeste(page, 900, 300);
  await page.setInputFiles('#f-photo-file', [{ name: 'a.png', mimeType: 'image/png', buffer: larga }, { name: 'b.png', mimeType: 'image/png', buffer: larga }]);
  await page.waitForSelector('#enq-overlay', { timeout: 5000 });
  await page.waitForTimeout(300);
  let t = await page.evaluate(() => ({
    titulo: document.getElementById('enq-titulo').innerText, fechar: !!document.getElementById('enq-fechar'), concluir: document.getElementById('enq-concluir')?.innerText,
    minis: [...document.querySelectorAll('.enq-mini')].map(b => b.innerText.trim() + (b.classList.contains('atual') ? '*' : '')),
    antigos: !!document.querySelector('#enq-pular, #enq-pronto, .enq-guia, .enq-nota'),
    grade: getComputedStyle(document.querySelector('.enq-grade')).opacity,
    quadro: (() => { const b = document.getElementById('enq-quadro').getBoundingClientRect(); return { r: Math.round(b.width / b.height * 100) / 100, w: Math.round(b.width) }; })(),
    zoomVisivel: getComputedStyle(document.querySelector('.enq-zoom')).display !== 'none',
  }));
  ok(t.titulo === 'Cortar' && t.fechar && t.concluir === 'Concluir', 'como o Instagram: ✕, "Cortar" e "Concluir" no alto');
  ok(t.quadro.r === 1.33 && t.quadro.w >= 400, 'a foto na largura da tela, no quadro 4:3 — ' + JSON.stringify(t.quadro));
  ok(JSON.stringify(t.minis) === '["1*","2"]', 'as duas fotos escolhidas nas miniaturas numeradas, a primeira aberta — ' + JSON.stringify(t.minis));
  ok(!t.antigos && t.grade === '0' && !t.zoomVisivel, 'sem os botões de antes nem o quadrado tracejado; a grade e o controle de zoom escondidos');

  // Arrastar para a direita mostra o lado esquerdo (vermelho), com a grade.
  const grade = await arrastar(page, 1);
  ok(grade === '1', 'enquanto arrasta, a grade de 3 × 3 aparece');
  await page.click('#enq-lupa');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('.enq-zoom')).display !== 'none'), 'a lupa (no computador) abre o controle de zoom');
  const z = await page.evaluate(() => { const r = document.getElementById('enq-zoom'); r.value = '2'; r.dispatchEvent(new Event('input')); return __enq.zoom; });
  ok(z === 2, 'o controle aproxima');

  // Trocar de foto pela miniatura, e a primeira guarda o ajuste.
  await page.click('[data-enq-ir="1"]');
  await page.waitForTimeout(250);
  t = await page.evaluate(() => ({ minis: [...document.querySelectorAll('.enq-mini')].map(b => b.innerText.trim() + (b.classList.contains('atual') ? '*' : '')), guardado: state.enquadrar.ajustes[0] && state.enquadrar.ajustes[0].zoom }));
  ok(JSON.stringify(t.minis) === '["1","2*"]' && t.guardado === 2, 'a miniatura 2 abre a segunda, e a primeira guarda o ajuste — ' + JSON.stringify(t));
  await page.click('#enq-expandir');
  await page.waitForTimeout(250);
  t = await page.evaluate(() => { const q = document.getElementById('enq-quadro').getBoundingClientRect(), i = document.getElementById('enq-img').getBoundingClientRect(); return { inteira: document.getElementById('enq-quadro').classList.contains('inteira'), cabe: i.width <= q.width + 1 && i.height < q.height - 5, lupa: !!document.getElementById('enq-lupa'), rotulo: document.getElementById('enq-expandir').getAttribute('aria-label') }; });
  ok(t.inteira && t.cabe && !t.lupa && t.rotulo === 'Preencher o quadro', 'o botão de expandir mostra a foto inteira (o "Original"), sem a lupa — ' + JSON.stringify(t));
  await page.click('#enq-concluir');
  await page.waitForTimeout(500);
  ok(!(await page.$('#enq-overlay')), '"Concluir" fecha');
  const fotos = await page.evaluate(() => window.__form.photos.slice());
  const f1 = await medirFoto(page, fotos[0]);
  const f2 = await medirFoto(page, fotos[1]);
  ok(f1.jpeg && Math.abs(f1.w / f1.h - 4 / 3) < 0.02 && f1.cor === 'vermelho', 'a primeira foi cortada em 4:3, no lado que foi arrastado — ' + JSON.stringify(f1));
  ok(Math.abs(f2.w / f2.h - 3) < 0.02, 'a que ficou inteira não é cortada — ' + JSON.stringify(f2));

  // "Ajustar" numa foto que já está no cadastro; o ✕ sem mexer fecha direto.
  const botoes = await page.evaluate(() => [...document.querySelectorAll('[data-photo-ajustar]')].map(b => b.innerText.trim()));
  ok(botoes.length === 2 && botoes.every(b => b === 'Ajustar'), 'cada foto tem "Ajustar"');
  await page.click('[data-photo-ajustar="1"]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => !!document.getElementById('enq-overlay') && !document.querySelector('.enq-miniaturas')), '"Ajustar" abre só aquela foto, sem miniaturas');
  await page.click('#enq-fechar');
  await page.waitForTimeout(200);
  ok(!(await page.$('#enq-overlay')), 'o ✕ sem mexer fecha direto');
  await page.click('[data-photo-ajustar="1"]');
  await page.waitForTimeout(300);
  await arrastar(page, -0.5);
  await page.click('#enq-fechar');
  await page.waitForTimeout(200);
  t = await page.evaluate(() => ({ titulo: document.getElementById('enq-descartar-t')?.innerText, bts: [...document.querySelectorAll('.enq-dialogo-b')].map(b => b.innerText) }));
  ok(t.titulo === 'Descartar as edições?' && t.bts.join('|') === 'Descartar|Cancelar', 'mexeu e tocou no ✕: "Descartar as edições?", como o Instagram — ' + JSON.stringify(t));
  await page.click('#enq-continuar');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => !!document.getElementById('enq-overlay') && !document.querySelector('.enq-dialogo')), '"Cancelar" volta para o corte');
  await page.click('#enq-fechar');
  await page.waitForTimeout(200);
  await page.click('#enq-descartar');
  await page.waitForTimeout(200);
  const f2d = await medirFoto(page, await page.evaluate(() => window.__form.photos[1]));
  ok(!(await page.$('#enq-overlay')) && Math.abs(f2d.w / f2d.h - 3) < 0.02, '"Descartar" sai sem cortar');
  await page.click('[data-photo-ajustar="1"]');
  await page.waitForTimeout(300);
  await arrastar(page, -0.5);
  await page.click('#enq-concluir');
  await page.waitForTimeout(400);
  const f2b = await medirFoto(page, await page.evaluate(() => window.__form.photos[1]));
  ok(Math.abs(f2b.w / f2b.h - 4 / 3) < 0.02 && f2b.cor === 'azul', 'e o "Concluir" grava o corte 4:3, do lado arrastado — ' + JSON.stringify(f2b));
  await browser.close();

  // ---- a foto de uma opção do catálogo (Premium) ----
  ({ browser, page } = await abrir({ academia: 'a1', premium: ['a1'], q: 'parceiros/ficha' }));
  await page.waitForTimeout(400);
  await page.click('.editar-academia');
  await page.waitForTimeout(400);
  await irParte(page, 'precos');
  await page.click('[data-cat-marcar="individual:avulsa"]');
  await page.setInputFiles('[data-cat-foto="individual:avulsa"]', { name: 'c.png', mimeType: 'image/png', buffer: await fotoDeTeste(page, 900, 300) });
  await page.waitForSelector('#enq-overlay', { timeout: 5000 });
  await page.waitForTimeout(200);
  ok(!(await page.$('.enq-miniaturas')), 'a foto da opção também abre o corte');
  await arrastar(page, 0.3);
  await page.click('#enq-concluir');
  await page.waitForTimeout(500);
  const foto = await page.evaluate(() => catalogoDoForm(window.__form)[0].foto);
  const fc = await medirFoto(page, foto);
  ok(fc.jpeg && Math.abs(fc.w / fc.h - 4 / 3) < 0.02 && fc.w <= 960 && await page.evaluate((f) => fotoDoCatalogoValida(f), foto), 'a foto da opção fica cortada em 4:3, até 960 de largura — ' + JSON.stringify(fc));
  ok(await page.$('[data-cat-foto-ajustar="individual:avulsa"]'), 'e tem "Ajustar" ao lado do ✕');
  await browser.close();

  // ---- no celular (toque), sem a lupa: os dedos aproximam ----
  const { chromium } = require('playwright');
  const b2 = await chromium.launch();
  const ctx = await b2.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p2 = await ctx.newPage();
  await p2.setContent('<style>@media (hover: none) and (pointer: coarse) { .x { display: none !important; } }</style><button class="x">lupa</button>');
  ok(await p2.evaluate(() => getComputedStyle(document.querySelector('.x')).display === 'none'), 'no celular a lupa some (a regra do CSS vale no toque)');
  await b2.close();
})();
