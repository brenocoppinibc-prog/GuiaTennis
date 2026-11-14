// Regra 268 (14/11/2026): "Não gostei muito da barra de pesquisa. Ficou com muito
// pouco conteúdo na página inicial dos jogadores." A caixa de busca como a do
// Booking (abas sublinhadas em cima, o campo, "Usar minha localização" numa linha
// só e o botão), as academias em cartões com nota, bairro e preço, "Busque pelo
// tipo de quadra" e os bairros da cidade.
const { abrir, ok } = require('./harness');

(async () => {
  const { browser, page } = await abrir();
  await page.waitForTimeout(800);

  let r = await page.evaluate(() => ({
    abas: [...document.querySelectorAll('.searchcard .sc-tab')].map(b => b.innerText.trim()),
    abaLigada: document.querySelector('.sc-tab.on')?.innerText.trim(),
    localizar: document.querySelectorAll('#locate-btn').length,
    localizarTexto: document.getElementById('locate-btn')?.innerText.trim(),
    alvoRepetido: !!document.getElementById('locate-txt') || !!document.querySelector('.sc-locate'),
    exemplo: document.getElementById('cep-input')?.placeholder,
    campoNoRotulo: document.querySelector('label.sc-row')?.htmlFor === 'cep-input',
    cartoes: document.querySelectorAll('#home-recomendadas .mini-home').length,
    preco: [...document.querySelectorAll('#home-recomendadas .mini-preco')].map(p => p.innerText.trim()),
    onde: [...document.querySelectorAll('#home-recomendadas .mini-onde')].map(p => p.innerText.trim()),
    tipos: [...document.querySelectorAll('#home-tipos .home-tipo strong')].map(s => s.innerText.trim()),
    bairros: [...document.querySelectorAll('.home-bairro')].map(a => ({ nome: a.querySelector('strong').innerText.trim(), href: a.getAttribute('href') })),
    titulos: [...document.querySelectorAll('.home-sec h3')].map(h => h.innerText.trim()),
  }));
  ok(r.abas.join('|') === 'Aula e locação|Aulas|Locação', 'abas sublinhadas no alto da caixa — ' + r.abas.join('|'));
  ok(r.abaLigada === 'Aula e locação', 'começa em "Aula e locação"');
  ok(r.localizar === 1 && r.localizarTexto === 'Usar minha localização' && !r.alvoRepetido, '"Usar minha localização" numa linha só, sem o alvo repetido no campo');
  ok(r.exemplo === 'CEP, bairro ou endereço', 'exemplo curto no campo (não corta no celular) — ' + r.exemplo);
  ok(r.campoNoRotulo, 'tocar em qualquer ponto da linha abre o campo');
  ok(r.cartoes >= 2, 'recomendadas em cartões — ' + r.cartoes);
  ok(r.preco.some(p => /^a partir de R\$ \d+ por hora$/.test(p)) && r.preco.includes('Sob consulta'), 'cartão com o preço ou "Sob consulta" — ' + r.preco.join(' / '));
  ok(r.onde.includes('Pinheiros') && r.onde.includes('Moema'), 'cartão com o bairro — ' + r.onde.join(' / '));
  ok(r.tipos.length >= 2 && r.tipos.includes('Quadras de saibro') && r.tipos.includes('Quadras rápidas'), '"Busque pelo tipo de quadra" só com o que existe — ' + r.tipos.join(', '));
  ok(r.titulos.indexOf('Busque pelo tipo de quadra') > r.titulos.findIndex(t => /recomendadas|Perto de você/.test(t)), 'os tipos vêm depois das recomendadas');
  ok(r.bairros.length === 2 && r.bairros.some(b => b.nome === 'Moema' && b.href === '/quadras/sao-paulo/moema'), 'bairros da cidade com o link da região — ' + JSON.stringify(r.bairros));

  // A aba escolhe a modalidade da busca.
  await page.click('.sc-tab[data-sc-modalidade="aulas_proprias"]');
  r = await page.evaluate(() => ({ ligada: document.querySelector('.sc-tab.on')?.innerText.trim(), filtro: state.modalidadeFilters.join(',') }));
  ok(r.ligada === 'Aulas' && r.filtro === 'aulas_proprias', 'a aba "Aulas" escolhe a modalidade — ' + r.filtro);

  // O tipo leva à busca já com o filtro (e tira os outros).
  await page.click('.home-tipo:has-text("Quadras rápidas")');
  await page.waitForTimeout(300);
  r = await page.evaluate(() => ({ pagina: state.page, piso: state.pisoFilters.join(','), modalidade: state.modalidadeFilters.length, link: location.pathname + location.search }));
  ok(r.pagina === 'search' && r.piso === 'rapida' && r.modalidade === 0, 'o tipo abre a busca com o filtro — ' + r.link);
  ok(/piso=rapida/.test(r.link), 'o filtro vai no link — ' + r.link);

  await browser.close();
})();
