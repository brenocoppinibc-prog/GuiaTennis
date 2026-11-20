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
    igual: !!document.querySelector('.search-header .searchcard #cep-input') && !!document.querySelector('.search-header #sc-modalidade') && document.getElementById('search-btn')?.innerText.trim() === 'Buscar academias',
    botao: document.getElementById('search-btn')?.getAttribute('aria-label'),
    linha: document.querySelector('.status-info')?.innerText || '',
    sub: document.querySelector('.toolbar-sub')?.innerText || '',
    distancia: document.querySelector('.rcard-dist')?.innerText || '',
    linhas: [...(document.querySelector('.rcard')?.querySelectorAll('.rcard-onde, .rcard-dist, .rcard-quadras') || [])].map(e => e.innerText.trim()),
  }));
  ok(r.igual, 'regra 281: nos resultados, a mesma caixa da inicial (onde, o que procura e "Buscar academias")');
  ok(!r.linha.includes('A partir de Pinheiros, São Paulo') && !r.sub, 'regra 289: o "a partir de" não repete o lugar que já está no campo — ' + r.linha + r.sub);
  ok(r.distancia === 'Bem perto de você', 'regra 308: abaixo de 50 m, "Bem perto de você" em vez de "0 m" — ' + r.distancia);
  ok(r.linhas.join('|') === 'Pinheiros, São Paulo|Bem perto de você|2 quadras de saibro', 'regra 283: onde, distância e quadras em linhas separadas — ' + r.linhas.join('|'));
  r = await page.evaluate(() => [distanceText(0.04), distanceText(0.05), distanceText(0.347), distanceText(1.26)]);
  ok(r.join('|') === 'bem perto|50 m|347 m|1,3 km', 'distâncias exatas — ' + r.join('|'));

  // Regra 289: em cima, o total de um lado e "Ordenar" e "Filtros" do outro;
  // embaixo, "Salvar busca" de um lado e "Compartilhar" do outro; sem filtros rápidos.
  r = await page.evaluate(() => {
    const ladoDireito = [...document.querySelectorAll('.toolbar .toolbar-right .tbtn')].map(b => b.innerText.replace(/\s+/g, ' ').trim());
    const embaixo = [...document.querySelectorAll('.busca-salvar > .tbtn, .busca-salvar summary.tbtn')].map(b => b.innerText.replace(/\s+/g, ' ').trim());
    const ordem = [...document.querySelectorAll('.sort-option, .sort-menu button')].map(b => b.innerText.trim());
    return { total: document.querySelector('.toolbar .toolbar-count')?.innerText || '', ladoDireito, embaixo, rapidos: document.querySelectorAll('.frap').length };
  });
  ok(/^\d+ academias?$/.test(r.total) && r.ladoDireito.join('|') === 'Ordenar|Filtros' && r.rapidos === 0
    && r.embaixo.length === 2 && r.embaixo[0] === 'Salvar busca' && /^Compartilhar/.test(r.embaixo[1]),
    'regra 289: total com Ordenar e Filtros; embaixo, Salvar busca e Compartilhar; sem filtros rápidos — ' + JSON.stringify(r));
  await page.click('#sort-toggle');
  await page.waitForTimeout(200);
  r = await page.evaluate(() => document.querySelector('.sort-menu')?.innerText || '');
  ok(/Mais perto/.test(r) && /Recomendadas/.test(r), '"Ordenar" abre as ordens (Mais perto, Recomendadas…)');
  await page.click('#sort-backdrop');
  await page.waitForTimeout(200);

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
