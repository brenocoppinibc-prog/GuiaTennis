// Regra 268 (14/11/2026): "Ficou com muito pouco conteúdo na página inicial dos
// jogadores." As academias em cartões com nota, bairro e preço, "Busque pelo tipo
// de quadra" e os bairros da cidade. Regra 269: "deixe parecido com o do Trivago,
// estava legal antes" (a caixa de busca de antes da regra 263) e, no menu, o logo
// maior e sem os links do fim.
const { abrir, ok } = require('./harness');

(async () => {
  const { browser, page } = await abrir();
  await page.waitForTimeout(800);

  let r = await page.evaluate(() => ({
    linhas: [...document.querySelectorAll('.searchcard .sc-label')].map(l => l.innerText.trim()),
    escolhido: document.querySelector('#sc-modalidade')?.selectedOptions[0]?.innerText.trim(),
    opcoes: [...document.querySelectorAll('#sc-modalidade option')].map(o => o.innerText.trim()),
    alvo: !!document.querySelector('.sc-row #locate-btn.sc-locate') && !document.getElementById('locate-txt') && !document.querySelector('.sc-tab'),
    botao: document.getElementById('search-btn')?.innerText.trim(),
    cartoes: document.querySelectorAll('#home-recomendadas .mini-home').length,
    preco: [...document.querySelectorAll('#home-recomendadas .mini-preco')].map(p => p.innerText.trim()),
    onde: [...document.querySelectorAll('#home-recomendadas .mini-onde')].map(p => p.innerText.trim()),
    tipos: [...document.querySelectorAll('#home-tipos .home-tipo strong')].map(s => s.innerText.trim()),
    bairros: [...document.querySelectorAll('.home-bairro')].map(a => ({ nome: a.querySelector('strong').innerText.trim(), href: a.getAttribute('href') })),
    titulos: [...document.querySelectorAll('.home-sec h3')].map(h => h.innerText.trim()),
  }));
  ok(r.linhas.join('|') === 'Onde você quer jogar|O que você procura', 'regra 269: a caixa do Trivago, uma linha para onde e outra para o que se procura — ' + r.linhas.join('|'));
  ok(r.escolhido === 'Aula e locação' && r.opcoes.join('|') === 'Aula e locação|Aulas|Locação', 'o que se procura numa lista que abre — ' + r.opcoes.join('|'));
  ok(r.alvo, 'o alvo da localização dentro da linha do onde, sem as abas nem o texto solto');
  ok(r.botao === 'Buscar academias', 'botão "Buscar academias"');
  ok(r.cartoes >= 2, 'recomendadas em cartões — ' + r.cartoes);
  ok(r.preco.some(p => /^a partir de R\$ \d+ por hora$/.test(p)) && r.preco.includes('Sob consulta'), 'cartão com o preço ou "Sob consulta" — ' + r.preco.join(' / '));
  ok(r.onde.includes('Pinheiros') && r.onde.includes('Moema'), 'cartão com o bairro — ' + r.onde.join(' / '));
  ok(r.tipos.length >= 2 && r.tipos.includes('Quadras de saibro') && r.tipos.includes('Quadras rápidas'), '"Busque pelo tipo de quadra" só com o que existe — ' + r.tipos.join(', '));
  ok(r.titulos.indexOf('Busque pelo tipo de quadra') > r.titulos.findIndex(t => /recomendadas|Perto de você/.test(t)), 'os tipos vêm depois das recomendadas');
  ok(r.bairros.length === 2 && r.bairros.some(b => b.nome === 'Moema' && b.href === '/quadras/sao-paulo/moema'), 'bairros da cidade com o link da região — ' + JSON.stringify(r.bairros));

  // A lista escolhe a modalidade da busca.
  await page.selectOption('#sc-modalidade', 'aulas_proprias');
  r = await page.evaluate(() => state.modalidadeFilters.join(','));
  ok(r === 'aulas_proprias', 'escolher "Aulas" na lista vale para a busca — ' + r);

  // O menu: o logo do tamanho do alto e sem os links do fim (regra 269).
  await page.evaluate(() => { state.showMenu = true; render(); });
  await page.waitForTimeout(200);
  r = await page.evaluate(() => {
    const nome = document.querySelector('.menu-marca .logo-nome-svg').getBoundingClientRect();
    const marca = document.querySelector('.menu-marca .logo-mark').getBoundingClientRect();
    return { nomeL: Math.round(nome.width), nomeA: Math.round(nome.height), marca: Math.round(marca.width), links: !!document.querySelector('.menu-links') };
  });
  ok(r.nomeL >= 120 && r.nomeA >= 16 && r.marca >= 40, 'no menu, o nome e o desenho do logo em tamanho bom — ' + JSON.stringify(r));
  ok(!r.links, 'sem "Por que", "Sobre", "Feedback", "Termos" e "Privacidade" no fim do menu');
  await page.evaluate(() => { state.showMenu = false; render(); });

  // O tipo leva à busca já com o filtro (e tira os outros).
  await page.click('.home-tipo:has-text("Quadras rápidas")');
  await page.waitForTimeout(300);
  r = await page.evaluate(() => ({ pagina: state.page, piso: state.pisoFilters.join(','), modalidade: state.modalidadeFilters.length, link: location.pathname + location.search }));
  ok(r.pagina === 'search' && r.piso === 'rapida' && r.modalidade === 0, 'o tipo abre a busca com o filtro — ' + r.link);
  ok(/piso=rapida/.test(r.link), 'o filtro vai no link — ' + r.link);

  await browser.close();
})();
