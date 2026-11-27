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
//   email-nome.png        426×60     o nome no alto dos e-mails, branco e
//                                    dourado para a faixa verde (142×20)
//   email-logo.png        120×120    o ícone no alto dos e-mails (aparece
//                                    com 40 pixels; os riscos mais fortes,
//                                    { pequeno: true }, para não sumirem)
//   divulgacao/whatsapp-perfil.png  1080×1080 — foto de perfil (o WhatsApp
//                                    corta em círculo; a raquete cabe nele)
//   divulgacao/whatsapp-capa.png    1600×900  — capa do perfil comercial
//                                    (16:9; o texto fica longe da parte de
//                                    baixo, onde a foto redonda fica por cima)
//   divulgacao/email-assinatura.png 566×184   — assinatura de e-mail
//   divulgacao/instagram-stories-fundo.png 1080×1920, instagram-post-fundo.png
//   e instagram-post-apresentacao.png 1080×1350, facebook-capa.png 1640×624,
//   logo-horizontal.png / logo-horizontal-branco.png 969×280 e logo-horizontal.svg,
//   logo-vertical.png / logo-vertical-branco.png 1080×940 e logo-quadrado-com-nome.png
// Rodar: NODE_PATH=$(npm root -g) node divulgacao/gerar-imagens.js
// Só algumas: … gerar-imagens.js email-logo.png (os nomes dos arquivos).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const trecho = html.match(/\/\/ LOGO-INICIO([\s\S]*?)\/\/ LOGO-FIM/)[1];
const logoDesenho = new Function(`${trecho}; return logoDesenho;`)();
const NOME = new Function(`${trecho}; return NOME_DO_LOGO;`)();
// O nome "GuiaTennis" em Poppins (o desenho do site), na altura e nas cores pedidas.
const nomeSvg = (altura, guia, tennis) => {
  const [, , w, h] = NOME.caixa.split(' ').map(Number);
  return `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" height="${altura}" width="${(altura * w / h).toFixed(1)}" viewBox="${NOME.caixa}" style="display:block"><path fill="${guia}" d="${NOME.guia}"/><path fill="${tennis}" d="${NOME.tennis}"/></svg>`;
};
const logo = (lado, opcoes) => `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 1080 1080">${logoDesenho(opcoes)}</svg>`;

// Logo da 404: o mesmo desenho, escrito dentro do arquivo (a 404 não roda o
// JavaScript do site).
const p404 = path.join(RAIZ, '404.html');
const pagina404 = fs.readFileSync(p404, 'utf8');
const novo404 = pagina404.replace(/<!-- LOGO -->[\s\S]*?<!-- \/LOGO -->/,
  `<!-- LOGO -->\n  <div role="img" aria-label="GuiaTennis" style="display:flex;align-items:center;gap:12px;margin-bottom:6px">\n  <svg width="56" height="56" viewBox="0 0 1080 1080" aria-hidden="true">${logoDesenho({ id: 'g' })}</svg>\n  ${nomeSvg(26, '#1F4D3D', '#B8933F')}\n  </div>\n  <!-- /LOGO -->`);
if (novo404 === pagina404 && !pagina404.includes('<!-- LOGO -->')) throw new Error('404.html sem as marcas <!-- LOGO -->');
fs.writeFileSync(p404, novo404);

const sozinho = (lado, opcoes) => `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${logo(lado, opcoes)}</body></html>`;
const compartilhar = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0}body{width:1200px;height:630px;background:#F7F4EC;display:flex;align-items:center;justify-content:center}svg{display:block}</style>
</head><body>${logo(630, { comNome: true })}</body></html>`;

const perfil = sozinho(1080, { quadrado: true });

// O nome no alto dos e-mails (regra 286): "Guia" branco e "Tennis" dourado,
// fundo transparente, para a faixa verde (aparece com 142×20; feito em 3×).
const nomeDoEmail = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${nomeSvg(60, '#FFFFFF', '#B8933F')}</body></html>`;

// Assinatura de e-mail: a raquete e o nome em Poppins, com o endereço embaixo.
const assinatura = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0}body{width:566px;height:184px;background:#FFFFFF;display:flex;align-items:center;gap:28px;padding:0 20px;box-sizing:border-box;font-family:Arial,'Liberation Sans',sans-serif}svg{display:block}p{margin:16px 0 0;font-size:30px;color:#6B6557}</style>
</head><body>${logo(144, {})}<div>${nomeSvg(50, '#1F4D3D', '#B8933F')}<p>guiatennis.com.br</p></div></body></html>`;

// Regra 285: a mesma escrita em todo lugar: o nome em Poppins (desenho) e o
// texto na Roboto, a fonte do site nos celulares Android.
const FONTE = `<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@500;700&display=swap" rel="stylesheet">`;
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
  body{width:1600px;height:900px;background:${FUNDO};position:relative;overflow:hidden;font-family:'Roboto',sans-serif;color:#F7F4EC}
  .txt{position:absolute;left:0;right:0;top:110px;text-align:center}
  .marca{display:flex;justify-content:center;margin-bottom:46px}
  h1{margin:0;font-size:74px;line-height:1.1;font-weight:700;letter-spacing:-.5px}
  p{margin:26px 0 0;font-size:34px;font-weight:500;color:#D8B865}
  .pe{position:absolute;bottom:175px;font-size:32px;font-weight:600;opacity:.92}
  .esq{left:80px}.dir{right:80px}
</style></head><body>
  ${quadra}
  <div class="txt">
    <div class="marca">${nomeSvg(60, '#F7F4EC', '#B8933F')}</div>
    <h1>Quadras e academias de tênis<br>perto de você</h1>
    <p>Compare preço e estrutura · fale direto no WhatsApp</p>
  </div>
  <div class="pe esq">guiatennis.com.br</div>
  <div class="pe dir">@guiatennis</div>
</body></html>`;

// Redes (regra 287, "os novos arquivos de logos e fundos para WhatsApp,
// Instagram e tudo mais"): o mesmo verde da capa, a quadra embaixo, o nome em
// Poppins e o texto em Roboto. Os fundos deixam o meio livre para escrever.
const quadraEm = (altura) => `<div style="position:absolute;left:0;right:0;bottom:0;height:${altura}px">${quadra
  .replace('width="1600" height="900"', 'width="100%" height="100%" preserveAspectRatio="xMidYMax slice"')}</div>`;
const rede = (w, h, miolo, alturaQuadra) => `<!doctype html><html><head><meta charset="utf-8">${FONTE}
<style>
  html,body{margin:0}
  body{width:${w}px;height:${h}px;background:${FUNDO};position:relative;overflow:hidden;font-family:'Roboto',sans-serif;color:#F7F4EC}
  .linha{position:absolute;left:0;right:0;display:flex;justify-content:center;text-align:center}
  h1{margin:0;font-weight:700;letter-spacing:-.5px;line-height:1.12}
  .sub{margin:0;font-weight:500;color:#D8B865}
  .pe{position:absolute;font-weight:500;opacity:.92}
</style></head><body>${quadraEm(alturaQuadra)}${miolo}</body></html>`;
const NOME_CLARO = (altura) => nomeSvg(altura, '#F7F4EC', '#B8933F');
const storiesFundo = rede(1080, 1920, `
  <div class="linha" style="top:300px">${NOME_CLARO(96)}</div>
  <div class="linha" style="bottom:300px;font-size:40px;font-weight:500;opacity:.92">@guiatennis</div>`, 1000);
const postFundo = rede(1080, 1350, `
  <div class="linha" style="top:110px">${NOME_CLARO(68)}</div>
  <div class="pe" style="left:70px;bottom:64px;font-size:30px">guiatennis.com.br</div>
  <div class="pe" style="right:70px;bottom:64px;font-size:30px">@guiatennis</div>`, 640);
const postApresentacao = rede(1080, 1350, `
  <div class="linha" style="top:130px">${NOME_CLARO(68)}</div>
  <div class="linha" style="top:330px;flex-direction:column;align-items:center;gap:34px;padding:0 80px">
    <h1 style="font-size:78px">Quadras e academias de tênis perto de você</h1>
    <p class="sub" style="font-size:38px;line-height:1.35">Compare preço e estrutura<br>e fale direto no WhatsApp</p>
  </div>
  <div class="pe" style="left:70px;bottom:64px;font-size:30px">guiatennis.com.br</div>
  <div class="pe" style="right:70px;bottom:64px;font-size:30px">@guiatennis</div>`, 640);
// Facebook: no celular corta as laterais; tudo no meio.
const facebookCapa = rede(1640, 624, `
  <div class="linha" style="top:110px;flex-direction:column;align-items:center;gap:30px">
    <div style="margin-bottom:14px">${NOME_CLARO(58)}</div>
    <h1 style="font-size:56px">Quadras e academias de tênis perto de você</h1>
    <p class="sub" style="font-size:30px">Compare preço e estrutura · fale direto no WhatsApp</p>
  </div>`, 520);
// Logo deitado (raquete + nome), fundo transparente: "Guia" verde para fundo
// claro e branco para fundo escuro; e o mesmo em SVG, para gráfica e quem faz arte.
const LOGO_W = 969, LOGO_H = 280;
const logoDeitadoSvg = (guia, id) => {
  const [, , w, h] = NOME.caixa.split(' ').map(Number);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LOGO_W}" height="${LOGO_H}" viewBox="0 0 ${LOGO_W} ${LOGO_H}">
<svg x="40" y="40" width="200" height="200" viewBox="0 0 1080 1080">${logoDesenho({ id })}</svg>
<svg x="276" y="${(LOGO_H - 92) / 2}" height="92" width="${(92 * w / h).toFixed(1)}" viewBox="${NOME.caixa}"><path fill="${guia}" d="${NOME.guia}"/><path fill="#B8933F" d="${NOME.tennis}"/></svg>
</svg>`;
};
const logoDeitado = (guia) => `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${logoDeitadoSvg(guia, 'l')}</body></html>`;
fs.writeFileSync(path.join(__dirname, 'logo-horizontal.svg'), logoDeitadoSvg('#1F4D3D', 'svg') + '\n');
// Logo em pé (regra 292, "o logo com a nova escrita embaixo"): a raquete e,
// embaixo, o nome em Poppins; fundo transparente, "Guia" verde (fundo claro)
// ou branco (fundo escuro). E o quadrado verde com o nome dentro.
const logoEmPe = (guia) => `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;background:transparent}body{width:1080px;height:940px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:56px}svg{display:block}</style>
</head><body>${logo(600, {})}${nomeSvg(120, guia, '#B8933F')}</body></html>`;
const quadradoComNome = sozinho(1080, { comNome: true });

// O kit de lançamento (divulgacao/lancamento/gerar-lancamento.js) usa o mesmo visual.
module.exports = { rede, NOME_CLARO, nomeSvg, FONTE, FUNDO, quadraEm, logo };
if (require.main === module) (async () => {
  const browser = await chromium.launch();
  const imagens = [
    [path.join(RAIZ, 'favicon-32.png'), sozinho(32, {}), 32, 32],
    [path.join(RAIZ, 'favicon-192.png'), sozinho(192, {}), 192, 192],
    [path.join(RAIZ, 'apple-touch-icon.png'), sozinho(180, { quadrado: true }), 180, 180],
    [path.join(RAIZ, 'og-image.png'), compartilhar, 1200, 630],
    [path.join(RAIZ, 'email-logo.png'), sozinho(120, { pequeno: true }), 120, 120],
    [path.join(RAIZ, 'email-nome.png'), nomeDoEmail, 426, 60],
    [path.join(__dirname, 'whatsapp-perfil.png'), perfil, 1080, 1080],
    [path.join(__dirname, 'whatsapp-capa.png'), capa, 1600, 900],
    [path.join(__dirname, 'email-assinatura.png'), assinatura, 566, 184],
    [path.join(__dirname, 'instagram-stories-fundo.png'), storiesFundo, 1080, 1920],
    [path.join(__dirname, 'instagram-post-fundo.png'), postFundo, 1080, 1350],
    [path.join(__dirname, 'instagram-post-apresentacao.png'), postApresentacao, 1080, 1350],
    [path.join(__dirname, 'facebook-capa.png'), facebookCapa, 1640, 624],
    [path.join(__dirname, 'logo-horizontal.png'), logoDeitado('#1F4D3D'), LOGO_W, LOGO_H],
    [path.join(__dirname, 'logo-vertical.png'), logoEmPe('#1F4D3D'), 1080, 940],
    [path.join(__dirname, 'logo-vertical-branco.png'), logoEmPe('#FFFFFF'), 1080, 940],
    [path.join(__dirname, 'logo-quadrado-com-nome.png'), quadradoComNome, 1080, 1080],
    [path.join(__dirname, 'logo-horizontal-branco.png'), logoDeitado('#FFFFFF'), LOGO_W, LOGO_H],
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
    const fonte = await page.evaluate(() => document.fonts.check("500 30px 'Roboto'"));
    if (/capa|instagram/.test(nome) && !fonte) console.warn('ATENÇÃO: a fonte Roboto não carregou');
    await page.screenshot({ path: arquivo, omitBackground: nome.startsWith('favicon') || nome.startsWith('logo-') || nome === 'email-logo.png' || nome === 'email-nome.png' });
    await page.close();
    console.log('gerada', nome);
  }
  await browser.close();
})();
