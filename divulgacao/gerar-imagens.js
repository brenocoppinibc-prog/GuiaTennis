// Gera as imagens de divulgação a partir do logo do próprio site (LOGO_SVG
// do index.html), para não depender de outro programa:
//   divulgacao/whatsapp-perfil.png  1080×1080 — foto de perfil (o WhatsApp
//                                    corta em círculo; o logo fica no meio)
//   divulgacao/whatsapp-capa.png    1600×900  — capa do perfil comercial
//                                    (16:9; o texto fica longe da parte de
//                                    baixo, onde a foto redonda fica por cima)
// Rodar: NODE_PATH=$(npm root -g) node divulgacao/gerar-imagens.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const logo = html.match(/const LOGO_SVG = `([\s\S]*?)`;/)[1];

// Só a raquete, maior e centralizada, sem o quadrado de cantos redondos e
// sem o pescoço da raquete, que em tamanho grande vira duas pontinhas.
function raquete(tamanho, escala) {
  return logo
    .replace(/class="logo-mark" width="46" height="46"/, `width="${tamanho}" height="${tamanho}"`)
    .replace(/<rect x="0" y="0" width="1080" height="1080" rx="220" fill="url\(#bgGradHeader\)"\/>/, '')
    .replace(/<path d="M-40 190[^"]*" fill="#F7F4EC"\/>/, '')
    .replace('<rect x="-40" y="150" width="80" height="290" rx="36"', '<rect x="-40" y="118" width="80" height="322" rx="36"')
    .replace('<g transform="translate(540,580) rotate(-15)">', `<g transform="translate(598,538) scale(${escala}) rotate(-15)">`);
}

const FONTE = `<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet">`;
const FUNDO = 'linear-gradient(135deg, #2A5C4B 0%, #1F4D3D 45%, #153229 100%)';

const perfil = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0}body{width:1080px;height:1080px;background:${FUNDO};display:flex;align-items:center;justify-content:center}</style>
</head><body>${raquete(1080, 0.86)}</body></html>`;

// Quadra de tênis vista de cima, em dourado bem clarinho, atrás de tudo.
const quadra = `<svg width="1600" height="900" viewBox="0 0 1600 900" style="position:absolute;inset:0">
  <g transform="translate(800 610) rotate(-8)" fill="none" stroke="#D8B865" stroke-opacity="0.16" stroke-width="5">
    <rect x="-620" y="-270" width="1240" height="540"/>
    <line x1="-620" y1="-200" x2="620" y2="-200"/><line x1="-620" y1="200" x2="620" y2="200"/>
    <line x1="-330" y1="-200" x2="-330" y2="200"/><line x1="330" y1="-200" x2="330" y2="200"/>
    <line x1="-330" y1="0" x2="330" y2="0"/>
    <line x1="0" y1="-290" x2="0" y2="290" stroke-width="9"/>
  </g>
</svg>`;

const capa = `<!doctype html><html><head><meta charset="utf-8">${FONTE}
<style>
  html,body{margin:0}
  body{width:1600px;height:900px;background:${FUNDO};position:relative;overflow:hidden;font-family:'Playfair Display',serif;color:#F7F4EC}
  .bola{position:absolute;right:170px;top:150px;width:92px;height:92px;border-radius:50%;background:#B8933F;border:6px solid #F7F4EC;box-sizing:border-box;opacity:.9}
  .txt{position:absolute;left:0;right:0;top:165px;text-align:center}
  h1{margin:0;font-size:74px;line-height:1.1;font-weight:700;letter-spacing:-.5px}
  p{margin:26px 0 0;font-size:34px;font-weight:500;color:#D8B865}
  .pe{position:absolute;bottom:175px;font-size:32px;font-weight:600;opacity:.92}
  .esq{left:80px}.dir{right:80px}
</style></head><body>
  ${quadra}
  <div class="bola"></div>
  <div class="txt">
    <h1>Quadras e academias de tênis<br>perto de você</h1>
    <p>Compare preço e estrutura · fale direto no WhatsApp</p>
  </div>
  <div class="pe esq">guiatennis.com.br</div>
  <div class="pe dir">@guiatennis</div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  for (const [nome, conteudo, w, h] of [['whatsapp-perfil.png', perfil, 1080, 1080], ['whatsapp-capa.png', capa, 1600, 900]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    // A fonte do site vem do Google Fonts pelo curl, que passa por proxy e
    // rede de empresa onde o navegador sozinho às vezes não passa.
    await page.route(/fonts\.(googleapis|gstatic)\.com/, async route => {
      const url = route.request().url();
      const corpo = execFileSync('curl', ['-sS', '-A', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', url]);
      await route.fulfill({ body: corpo, contentType: url.includes('googleapis') ? 'text/css' : 'font/woff2' });
    });
    await page.setContent(conteudo, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const fonte = await page.evaluate(() => document.fonts.check("700 74px 'Playfair Display'"));
    if (nome.includes('capa') && !fonte) console.warn('ATENÇÃO: a fonte Playfair Display não carregou');
    await page.screenshot({ path: path.join(__dirname, nome) });
    await page.close();
    console.log('gerada', nome);
  }
  await browser.close();
})();
