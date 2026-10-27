// Pedido do Breno em 27/10/2026: "eu quero que as fotos, quando for
// selecionadas, possam ajustar o enquadramento" (regra 164). Escolhidas, as
// fotos abrem uma de cada vez num quadro 4:3: arrastar move, o controle
// aproxima, "Pronto" grava o recorte e "Usar como está" deixa a foto inteira.
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
    titulo: document.getElementById('enq-titulo').innerText, conta: document.querySelector('.enq-conta')?.innerText,
    pronto: document.getElementById('enq-pronto').innerText, guia: !!document.querySelector('.enq-guia'), nota: document.querySelector('.enq-nota')?.innerText || '',
    quadro: (() => { const b = document.getElementById('enq-quadro').getBoundingClientRect(); return Math.round(b.width / b.height * 100) / 100; })(),
  }));
  ok(t.titulo === 'Ajuste o enquadramento' && t.conta === 'Foto 1 de 2' && t.pronto === 'Próxima', 'escolhidas duas fotos, abre a primeira para ajustar ("Foto 1 de 2", "Próxima")');
  ok(t.quadro === 1.33, 'o quadro tem o formato 4:3 dos cartões e da galeria — ' + t.quadro);
  ok(t.guia && t.nota.includes('capa'), 'na capa, o quadrado tracejado do celular');

  // Arrastar para a direita mostra o lado esquerdo (vermelho).
  const q = await page.evaluate(() => { const b = document.getElementById('enq-quadro').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width }; });
  await page.mouse.move(q.x, q.y);
  await page.mouse.down();
  await page.mouse.move(q.x + q.w, q.y, { steps: 8 });
  await page.mouse.up();
  const z = await page.evaluate(() => { const r = document.getElementById('enq-zoom'); r.value = '2'; r.dispatchEvent(new Event('input')); return __enq.zoom; });
  ok(z === 2, 'o controle aproxima');
  await page.click('#enq-pronto');
  await page.waitForTimeout(300);
  t = await page.evaluate(() => ({ conta: document.querySelector('.enq-conta')?.innerText, pronto: document.getElementById('enq-pronto')?.innerText, guia: !!document.querySelector('.enq-guia') }));
  ok(t.conta === 'Foto 2 de 2' && t.pronto === 'Pronto' && !t.guia, '"Próxima" grava e abre a segunda, sem o quadrado da capa');
  await page.click('#enq-pular');
  await page.waitForTimeout(300);
  ok(!(await page.$('#enq-overlay')), 'na última, o ajuste fecha');
  const fotos = await page.evaluate(() => window.__form.photos.slice());
  const f1 = await medirFoto(page, fotos[0]);
  const f2 = await medirFoto(page, fotos[1]);
  ok(f1.jpeg && Math.abs(f1.w / f1.h - 4 / 3) < 0.02 && f1.cor === 'vermelho', 'a primeira foi recortada em 4:3, no lado que foi arrastado — ' + JSON.stringify(f1));
  ok(Math.abs(f2.w / f2.h - 3) < 0.02, '"Usar como está" deixa a segunda inteira — ' + JSON.stringify(f2));

  // "Ajustar" numa foto que já está no cadastro.
  const botoes = await page.evaluate(() => [...document.querySelectorAll('[data-photo-ajustar]')].map(b => b.innerText.trim()));
  ok(botoes.length === 2 && botoes.every(b => b === 'Ajustar'), 'cada foto tem "Ajustar"');
  await page.click('[data-photo-ajustar="1"]');
  await page.waitForTimeout(300);
  t = await page.evaluate(() => ({ aberto: !!document.getElementById('enq-overlay'), conta: !!document.querySelector('.enq-conta'), pronto: document.getElementById('enq-pronto').innerText }));
  ok(t.aberto && !t.conta && t.pronto === 'Pronto', '"Ajustar" abre só aquela foto');
  await page.click('#enq-pronto');
  await page.waitForTimeout(300);
  const f2b = await medirFoto(page, await page.evaluate(() => window.__form.photos[1]));
  ok(Math.abs(f2b.w / f2b.h - 4 / 3) < 0.02, 'e o "Pronto" grava o recorte 4:3');
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
  ok(!(await page.$('.enq-guia')), 'a foto da opção também abre para ajustar (sem o quadrado da capa)');
  await page.click('#enq-pronto');
  await page.waitForTimeout(300);
  const foto = await page.evaluate(() => catalogoDoForm(window.__form)[0].foto);
  const fc = await medirFoto(page, foto);
  ok(fc.jpeg && Math.abs(fc.w / fc.h - 4 / 3) < 0.02 && fc.w <= 960 && await page.evaluate((f) => fotoDoCatalogoValida(f), foto), 'a foto da opção fica recortada em 4:3, até 960 de largura — ' + JSON.stringify(fc));
  ok(await page.$('[data-cat-foto-ajustar="individual:avulsa"]'), 'e tem "Ajustar" ao lado do ✕');
  await browser.close();
})();
