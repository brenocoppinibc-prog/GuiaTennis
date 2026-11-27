// A fonte do aparelho no site inteiro (regra 259, 13/11/2026: "seria
// interessante usar a fonte do celular no site inteiro"): texto e títulos na
// fonte do sistema (San Francisco, Roboto, Segoe UI), sem a Inter e sem a
// Playfair. O nome do logo (regra 260: "gostei da poppins e fica legal com e
// verde amarelo na escrita") é desenho em Poppins Bold: "Guia" na cor do texto
// em volta e "Tennis" em dourado. Nenhuma fonte baixada do Google.
const { abrir, ok } = require('./harness');

const OURO = 'rgb(184, 147, 63)', VERDE = 'rgb(31, 77, 61)', BRANCO = 'rgb(255, 255, 255)';

(async () => {
  const { browser, page } = await abrir({});
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const cores = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const [guia, tennis] = el.querySelectorAll('svg.logo-nome-svg path');
      const caixa = el.querySelector('svg.logo-nome-svg')?.getBoundingClientRect();
      return { guia: guia && getComputedStyle(guia).fill, tennis: tennis && getComputedStyle(tennis).fill, texto: el.textContent.trim(), largura: caixa ? Math.round(caixa.width) : 0, altura: caixa ? Math.round(caixa.height) : 0 };
    };
    return {
      corpo: getComputedStyle(document.body).fontFamily,
      titulos: [...document.querySelectorAll('.display:not(.logo-nome)')].map(el => getComputedStyle(el).fontFamily),
      fontesDeFora: [...document.querySelectorAll('link[href*="fonts.g"]')].length,
      topo: cores('.home-brand .logo-nome'),
      rodape: cores('.rodape-faixa-marca .logo-nome'),
      nomes: [...document.querySelectorAll('.logo-nome')].map(el => el.textContent.trim()),
    };
  });
  ok(r.corpo.startsWith('-apple-system') && r.corpo.includes('Roboto') && !r.corpo.includes('Inter'), 'o texto usa a fonte do aparelho, sem a Inter — ' + r.corpo);
  ok(r.titulos.length > 0 && r.titulos.every(t => t.startsWith('-apple-system')), 'os títulos também, sem a fonte com serifa — ' + r.titulos.length + ' títulos');
  ok(r.fontesDeFora === 0, 'o site não baixa nenhuma fonte do Google');
  ok(r.topo && r.topo.guia === VERDE && r.topo.tennis === OURO, 'no topo, o nome desenhado com "Guia" verde e "Tennis" dourado — ' + JSON.stringify(r.topo));
  ok(r.topo && r.topo.altura >= 17 && r.topo.altura <= 24 && r.topo.largura > 100 && r.topo.largura < 180, 'o nome do topo no tamanho de antes — ' + r.topo.largura + '×' + r.topo.altura);
  ok(r.rodape && r.rodape.guia === BRANCO && r.rodape.tennis === OURO, 'no rodapé verde, "Guia" branco e "Tennis" dourado — ' + JSON.stringify(r.rodape));
  ok(r.nomes.length > 0 && r.nomes.every(n => n === 'GuiaTennis'), 'o nome continua escrito para o leitor de tela e o Google — ' + r.nomes.join(', '));
  await browser.close();
})();
