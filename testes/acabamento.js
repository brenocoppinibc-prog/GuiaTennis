// Regra 270 (14/11/2026): "trabalha ele deixando redondinho". A caixa de busca
// numa linha nos resultados, sem academia repetida na inicial, a nota legível nos
// cartões, os destaques da ficha sem repetir o topo e "menos de 100 m".
const { abrir, ok } = require('./harness');

(async () => {
  const { browser, page } = await abrir({ avaliacoes: [
    { id: 'r1', academia_id: 'a2', stars: 5, comment: 'Ótima.', nome_autor: 'Carla', created_at: '2026-10-20T12:00:00Z' }] });
  await page.waitForTimeout(800);

  // Inicial: com 2 academias, as recomendadas já mostram as duas; a fileira da
  // cidade e "Mais bem avaliadas" não repetem os mesmos cartões.
  let r = await page.evaluate(() => ({
    titulos: [...document.querySelectorAll('.home-sec h3')].map(h => h.innerText.trim()),
    cartoes: [...document.querySelectorAll('.mini-home')].map(a => a.dataset.open),
    bairros: document.querySelectorAll('.home-bairro').length,
    corDaNota: getComputedStyle(document.querySelector('.mini-home .sbadge')).color,
    tiposNaFileira: getComputedStyle(document.querySelector('.home-tipos')).overflowX,
    precoNoTipo: [...document.querySelectorAll('.home-tipo')].some(b => /R\$/.test(b.innerText)),
    caixaInteira: !!document.getElementById('sc-modalidade') && !document.querySelector('.sc-compacto'),
  }));
  ok(new Set(r.cartoes).size === r.cartoes.length, 'nenhuma academia repetida nos cartões da inicial — ' + r.cartoes.join(','));
  ok(!r.titulos.includes('Mais bem avaliadas') && r.titulos.includes('Academias por cidade') && r.bairros === 2, '"Mais bem avaliadas" sai quando só repetiria; a cidade fica com os bairros — ' + r.titulos.join(' | '));
  ok(r.corDaNota === 'rgb(255, 255, 255)', 'a nota do cartão em branco no quadrado verde — ' + r.corDaNota);
  ok(r.tiposNaFileira === 'auto' && !r.precoNoTipo, '"Busque pelo tipo de quadra" numa fileira que desliza, sem o preço');
  ok(r.caixaInteira, 'na inicial, a caixa inteira (onde, o que procura e o botão)');

  // Resultados: a caixa numa linha só, sem repetir o "a partir de".
  await page.evaluate(() => { state.cep = 'Pinheiros, São Paulo'; goSearch(); doSearch(); });
  await page.waitForTimeout(1500);
  r = await page.evaluate(() => ({
    compacta: !!document.querySelector('.search-header .sc-compacto #cep-input') && !!document.querySelector('.sc-compacto #search-btn') && !document.getElementById('sc-modalidade'),
    botao: document.getElementById('search-btn')?.getAttribute('aria-label'),
    linha: document.querySelector('.status-info')?.innerText || '',
    sub: document.querySelector('.toolbar-sub')?.innerText || '',
    distancia: document.querySelector('.rcard-onde')?.innerText || document.getElementById('app').innerText.match(/[^\n]*de você[^\n]*/)?.[0] || '',
  }));
  ok(r.compacta && r.botao === 'Buscar academias', 'nos resultados, a caixa numa linha (onde, alvo e a lupa)');
  ok(r.linha.includes('A partir de Pinheiros, São Paulo') && !r.sub, 'o "a partir de" aparece uma vez só — ' + r.sub);
  ok(/menos de 100 m de você/.test(r.distancia) && !/\b0 m\b/.test(r.distancia), '"menos de 100 m de você" no lugar de "0 m" — ' + r.distancia);
  r = await page.evaluate(() => [distanceText(0.04), distanceText(0.347), distanceText(1.26)]);
  ok(r.join('|') === 'menos de 100 m|350 m|1,3 km', 'distâncias — ' + r.join('|'));

  // Ficha: os destaques não repetem a nota, a distância nem as quadras.
  await page.evaluate(() => openCourt('a1'));
  await page.waitForTimeout(1200);
  r = await page.evaluate(() => [...document.querySelectorAll('.ht-destaque-t')].map(p => p.innerText.trim()));
  ok(!r.some(t => /de você|quadras?$|Excelente|Muito bom|Sem avaliações/.test(t)) && r.includes('Empréstimo de raquete'), 'destaques sem repetir o topo, com as comodidades — ' + r.join(' | '));

  await browser.close();
})();
