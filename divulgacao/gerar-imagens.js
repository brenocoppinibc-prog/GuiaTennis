// Gera todas as imagens com o logo a partir do próprio site (logoDesenho, no
// index.html, entre LOGO-INICIO e LOGO-FIM), para o logo ser igual em todo
// lugar (pedido do Breno em 01/10/2026) e não depender de outro programa:
//   favicon-32.png, favicon-192.png  ícone da aba (cantos arredondados)
//   apple-touch-icon.png  180×180    ícone do iPhone (quadrado: o iPhone
//                                    arredonda sozinho; canto transparente
//                                    ficaria preto)
//   og-image.png          1200×630   imagem do link compartilhado (logo com o
//                                    nome no meio, fundo creme)
//   404.html                         o logo da página "não existe", entre
//                                    <!-- LOGO --> e <!-- /LOGO -->
//   email-logo.png        120×120    o ícone no alto dos e-mails (aparece
//                                    com 40 pixels; os riscos mais fortes,
//                                    { pequeno: true }, para não sumirem)
//   divulgacao/whatsapp-perfil.png  1080×1080 — foto de perfil (o WhatsApp
//                                    corta em círculo; a raquete cabe nele)
//   divulgacao/whatsapp-capa.png    1600×900  — capa do perfil comercial
//                                    (16:9; o texto fica longe da parte de
//                                    baixo, onde a foto redonda fica por cima)
// Rodar: NODE_PATH=$(npm root -g) node divulgacao/gerar-imagens.js
// Só algumas: … gerar-imagens.js email-logo.png (os nomes dos arquivos).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const trecho = html.match(/\/\/ LOGO-INICIO([\s\S]*?)\/\/ LOGO-FIM/)[1];
const logoDesenho = new Function(`${trecho}; return logoDesenho;`)();
const logo = (lado, opcoes) => `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 1080 1080">${logoDesenho(opcoes)}</svg>`;

// Logo da 404: o mesmo desenho, escrito dentro do arquivo (a 404 não roda o
// JavaScript do site).
const p404 = path.join(RAIZ, '404.html');
const pagina404 = fs.readFileSync(p404, 'utf8');
const novo404 = pagina404.replace(/<!-- LOGO -->[\s\S]*?<!-- \/LOGO -->/,
  `<!-- LOGO -->\n  <svg width="72" height="72" viewBox="0 0 1080 1080" aria-hidden="true">${logoDesenho({ id: 'g' })}</svg>\n  <!-- /LOGO -->`);
if (novo404 === pagina404 && !pagina404.includes('<!-- LOGO -->')) throw new Error('404.html sem as marcas <!-- LOGO -->');
fs.writeFileSync(p404, novo404);

const sozinho = (lado, opcoes) => `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${logo(lado, opcoes)}</body></html>`;
const compartilhar = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0}body{width:1200px;height:630px;background:#F7F4EC;display:flex;align-items:center;justify-content:center}svg{display:block}</style>
</head><body>${logo(630, { comNome: true })}</body></html>`;

const perfil = sozinho(1080, { quadrado: true });

const FONTE = `<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet">`;
const FUNDO = 'linear-gradient(135deg, #2A5C4B 0%, #1F4D3D 45%, #153229 100%)';


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
  const imagens = [
    [path.join(RAIZ, 'favicon-32.png'), sozinho(32, {}), 32, 32],
    [path.join(RAIZ, 'favicon-192.png'), sozinho(192, {}), 192, 192],
    [path.join(RAIZ, 'apple-touch-icon.png'), sozinho(180, { quadrado: true }), 180, 180],
    [path.join(RAIZ, 'og-image.png'), compartilhar, 1200, 630],
    [path.join(RAIZ, 'email-logo.png'), sozinho(120, { pequeno: true }), 120, 120],
    [path.join(__dirname, 'whatsapp-perfil.png'), perfil, 1080, 1080],
    [path.join(__dirname, 'whatsapp-capa.png'), capa, 1600, 900],
  ];
  const so = process.argv.slice(2);
  for (const [arquivo, conteudo, w, h] of imagens) {
    const nome = path.basename(arquivo);
    if (so.length && !so.includes(nome)) continue;
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
    await page.screenshot({ path: arquivo, omitBackground: nome.startsWith('favicon') || nome === 'email-logo.png' });
    await page.close();
    console.log('gerada', nome);
  }
  await browser.close();
})();
