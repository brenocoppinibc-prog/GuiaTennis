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

// A raquete do logo, redesenhada para tamanho grande: no ícone pequeno o
// encordoamento tem só três linhas de cada lado e o pescoço vira duas
// pontinhas; aqui o encordoamento é completo e o pescoço tem os dois braços
// de uma raquete de verdade. Mesmas cores e mesma bola do logo.
function raquete(tamanho) {
  const creme = '#F7F4EC', ouro = '#B8933F';
  const cordas = [];
  for (let y = -400; y <= 80; y += 48) cordas.push(`<line x1="-200" y1="${y}" x2="200" y2="${y}"/>`);
  for (let x = -168; x <= 168; x += 42) cordas.push(`<line x1="${x}" y1="-420" x2="${x}" y2="100"/>`);
  return `<svg width="${tamanho}" height="${tamanho}" viewBox="0 0 1080 1080">
  <defs><clipPath id="cabeca"><ellipse cx="0" cy="-160" rx="190" ry="250"/></clipPath></defs>
  <g transform="translate(600,532) scale(0.8) rotate(-15)">
    <g clip-path="url(#cabeca)" stroke="${ouro}" stroke-width="7" opacity="0.6">${cordas.join('')}</g>
    <path d="M-120 72 L-30 220 M120 72 L30 220" stroke="${creme}" stroke-width="34" stroke-linecap="round" fill="none"/>
    <rect x="-40" y="200" width="80" height="250" rx="36" fill="${creme}"/>
    <ellipse cx="0" cy="455" rx="44" ry="22" fill="${creme}"/>
    <ellipse cx="0" cy="-160" rx="212" ry="272" fill="none" stroke="${creme}" stroke-width="48"/>
    <path d="M-330 -40 Q-260 -10 -220 -90" fill="none" stroke="${ouro}" stroke-width="16" stroke-linecap="round" opacity="0.55"/>
    <circle cx="0" cy="-160" r="132" fill="${ouro}" stroke="${creme}" stroke-width="10"/>
  </g>
</svg>`;
}

const FONTE = `<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet">`;
const FUNDO = 'linear-gradient(135deg, #2A5C4B 0%, #1F4D3D 45%, #153229 100%)';

const perfil = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0}body{width:1080px;height:1080px;background:${FUNDO};display:flex;align-items:center;justify-content:center}</style>
</head><body>${raquete(1080)}</body></html>`;

// Quadra de tênis reta, vista de trás da linha de fundo, em perspectiva:
// medidas oficiais (23,77 × 10,97 m) projetadas numa câmera atrás da quadra.
function quadraEmPerspectiva() {
  const L = 23.77, meiaDupla = 5.485, meiaSimples = 4.115, saque = 6.40, rede = L / 2;
  const d = 8, perto = 960, longe = 455, cx = 800;
  const K = (perto - longe) / (1 / d - 1 / (L + d)), H = perto - K / d, S = 1500 * d / (2 * meiaDupla);
  const P = (X, z) => [cx + X * S / (z + d), H + K / (z + d)].map(v => v.toFixed(1)).join(' ');
  const linha = (X1, z1, X2, z2, w = 5) => `<path d="M${P(X1, z1)} L${P(X2, z2)}" stroke-width="${w}"/>`;
  return `<svg width="1600" height="900" viewBox="0 0 1600 900" style="position:absolute;inset:0">
  <g fill="none" stroke="#D8B865" stroke-opacity="0.18" stroke-linecap="round">
    ${linha(-meiaDupla, 0, -meiaDupla, L)}${linha(meiaDupla, 0, meiaDupla, L)}
    ${linha(-meiaSimples, 0, -meiaSimples, L)}${linha(meiaSimples, 0, meiaSimples, L)}
    ${linha(-meiaDupla, 0, meiaDupla, 0)}${linha(-meiaDupla, L, meiaDupla, L)}
    ${linha(-meiaSimples, rede - saque, meiaSimples, rede - saque)}${linha(-meiaSimples, rede + saque, meiaSimples, rede + saque)}
    ${linha(0, rede - saque, 0, rede + saque)}
    ${linha(0, 0, 0, 0.35)}${linha(0, L, 0, L - 0.35)}
    ${linha(-6.4, rede, 6.4, rede, 9)}
  </g>
</svg>`;
}
const quadra = quadraEmPerspectiva();

const capa = `<!doctype html><html><head><meta charset="utf-8">${FONTE}
<style>
  html,body{margin:0}
  body{width:1600px;height:900px;background:${FUNDO};position:relative;overflow:hidden;font-family:'Playfair Display',serif;color:#F7F4EC}
  .txt{position:absolute;left:0;right:0;top:165px;text-align:center}
  h1{margin:0;font-size:74px;line-height:1.1;font-weight:700;letter-spacing:-.5px}
  p{margin:26px 0 0;font-size:34px;font-weight:500;color:#D8B865}
  .pe{position:absolute;bottom:175px;font-size:32px;font-weight:600;opacity:.92}
  .esq{left:80px}.dir{right:80px}
</style></head><body>
  ${quadra}
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
