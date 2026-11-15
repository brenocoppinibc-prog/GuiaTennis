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
  ok(/0 m de você/.test(r.distancia), 'regra 271: a distância exata ("0 m de você") — ' + r.distancia);
  r = await page.evaluate(() => [distanceText(0.04), distanceText(0.347), distanceText(1.26)]);
  ok(r.join('|') === '40 m|347 m|1,3 km', 'distâncias exatas — ' + r.join('|'));

  // Regra 271: filtros rápidos acima da lista; o ligado não se repete embaixo.
  r = await page.evaluate(() => [...document.querySelectorAll('.filtros-rapidos .frap')].map(b => b.innerText.trim()));
  ok(r.join('|') === 'Aulas|Locação|Saibro|Rápida|Coberta', 'filtros rápidos — ' + r.join('|'));
  await page.click('.frap:has-text("Locação")');
  await page.waitForTimeout(300);
  r = await page.evaluate(() => ({ nomes: getResults().map(c => c.name), on: document.querySelector('.frap.on')?.innerText.trim(), link: location.search, ativo: document.querySelector('.active-chips')?.innerText || '' }));
  ok(r.nomes.join() === 'Quadra Locação' && r.on === 'Locação' && /modalidade=locacao/.test(r.link) && !/Locação/.test(r.ativo), 'um toque filtra, fica verde, vai no link e não se repete nos ativos — ' + r.link);
  await page.click('.frap:has-text("Locação")');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => getResults().length === 2 && !document.querySelector('.frap.on')), 'outro toque desliga');

  // "Comparação" nos Filtros sem o símbolo.
  await page.evaluate(() => { state.showFilters = true; render(); });
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => { const b = document.querySelector('.f-compareonly'); return !!b && !b.querySelector('svg') && b.innerText.includes('Comparação'); }), '"Comparação" nos Filtros sem o símbolo');
  await page.evaluate(() => { state.showFilters = false; render(); });

  // Ficha: os destaques não repetem a nota, a distância nem as quadras.
  await page.evaluate(() => openCourt('a1'));
  await page.waitForTimeout(1200);
  r = await page.evaluate(() => [...document.querySelectorAll('.ht-destaque-t')].map(p => p.innerText.trim()));
  ok(!r.some(t => /de você|quadras?$|Excelente|Muito bom|Sem avaliações/.test(t)) && r.includes('Empréstimo de raquete'), 'destaques sem repetir o topo, com as comodidades — ' + r.join(' | '));

  // Regra 271: a opção única ocupa a linha inteira.
  await page.evaluate(() => openCourt('a2'));
  await page.waitForTimeout(1000);
  r = await page.evaluate(() => { const g = document.getElementById('ht-quartos'), c = g.querySelector('.ht-quarto'); return { n: g.children.length, larga: Math.abs(c.getBoundingClientRect().width - g.getBoundingClientRect().width) < 2 }; });
  ok(r.n === 1 && r.larga, 'com uma opção só, o cartão ocupa a linha inteira');

  await browser.close();
})();
