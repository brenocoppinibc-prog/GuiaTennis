// Pedidos de 20/10/2026, com prints da ficha: o "Sobre" diz que há mais
// comodidades e o que os jogadores elogiam; o cancelamento enxuto; sem o
// caminho no alto; o topo com voltar, o nome e os três ícones à vista.
const { abrir, ok } = require('./harness');

const abrirFicha = (page, id) => page.evaluate((id) => {
  state.selected = decorate(state.allCourts.find(x => x.id === id)); state.page = 'court'; render();
}, id);

(async () => {
  let { browser, page } = await abrir();

  // ---- "Sobre": as comodidades além das 4 primeiras ----
  const sobre = await page.evaluate(() => {
    const base = { id: 'zz', name: 'Academia Teste', bairro: 'Moema', cidade: 'São Paulo', quadras: {} };
    return {
      muitas: descricaoAcademia({ ...base, amenities: ['estacionamento_gratuito', 'estacionamento_pago', 'vestiario', 'loja', 'wifi', 'lanchonete'] }),
      poucas: descricaoAcademia({ ...base, amenities: ['vestiario', 'wifi'] }),
    };
  });
  ok(sobre.muitas.includes('Entre as comodidades estão estacionamento grátis, estacionamento pago, vestiário, loja de materiais e outras 2.'),
    'mais de 4 comodidades: diz quantas faltam — ' + sobre.muitas.match(/Entre as comodidades[^.]*\./)?.[0]);
  ok(sobre.poucas.includes('Entre as comodidades estão vestiário e wi-fi.'), 'até 4: todas, sem "outras" — ' + sobre.poucas.match(/Entre as comodidades[^.]*\./)?.[0]);

  // ---- "Sobre": o que os jogadores elogiam nas avaliações ----
  const elogio = await page.evaluate(() => {
    state.reviewsCache.zz = [
      { stars: 5, comment: 'Professores excelentes e quadras muito bem cuidadas.' },
      { stars: 4, comment: 'Ótimo professor! O estacionamento não ajuda, mas o atendimento é nota 10.' },
      { stars: 2, comment: 'Iluminação ótima, mas o resto deixou a desejar.' },
      { stars: 5, comment: '' },
    ];
    const r = { lista: elogiosDasAvaliacoes('zz'), texto: descricaoAcademia({ id: 'zz', name: 'Academia Teste', cidade: 'São Paulo', quadras: {}, amenities: [] }) };
    state.reviewsCache.vazia = [{ stars: 5, comment: 'Tudo certo.' }];
    r.nada = elogiosDasAvaliacoes('vazia');
    return r;
  });
  ok(elogio.lista[0] === 'os professores' && elogio.lista.includes('o atendimento') && elogio.lista.includes('as quadras') && elogio.lista.length === 3,
    'os mais citados primeiro, até 3 — ' + elogio.lista.join(', '));
  ok(!elogio.lista.includes('o estacionamento') && !elogio.lista.includes('a iluminação'), 'frase com "não" e avaliação de 2 estrelas não viram elogio');
  ok(elogio.texto.includes('Quem avaliou elogia os professores, '), 'a frase entra no "Sobre" — ' + elogio.texto.match(/Quem avaliou[^.]*\./)?.[0]);
  ok(elogio.nada.length === 0, 'sem tema conhecido, sem a frase');

  // ---- cancelamento: duas linhas por caso, sem repetir o número ----
  // O Básico não mostra o cancelamento: confere no Completo.
  await page.evaluate(async () => { window.__db.academias.find(a => a.id === 'a1').plano = 'completo'; await loadEverything(); });
  await abrirFicha(page, 'a1');
  await page.waitForTimeout(200);
  const pol = await page.evaluate(() => {
    const sec = [...document.querySelectorAll('.ht-sec')].find(s => /Cancelamento e reposição/.test(s.querySelector('h3')?.innerText || ''));
    return sec ? { cartoes: sec.querySelectorAll('.pol-card').length, linhas: [...sec.querySelectorAll('.pol-linha')].map(l => l.innerText.replace(/\s+/g, ' ').trim()), velho: !!sec.querySelector('.pol-faixa, .pol-lado') } : null;
  });
  ok(pol && !pol.velho && pol.linhas[0] === 'Desmarcou até 24h antes Tem reposição da aula.' && pol.linhas[1] === 'Com menos de 24h Perde a aula.',
    'aula: "Desmarcou até 24h antes" e "Com menos de 24h", num cartão — ' + (pol && pol.linhas.slice(0, 2).join(' | ')));

  // ---- topo: sem o caminho, e os três ícones à vista no celular ----
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  const topo = await page.evaluate(() => {
    const bar = document.querySelector('.courtbar');
    const bot = [...bar.querySelectorAll('button')].map(b => { const r = b.getBoundingClientRect(); return { l: b.getAttribute('aria-label'), w: Math.round(r.width), dentro: r.left >= 0 && r.right <= innerWidth }; });
    return { caminho: !!document.querySelector('.ht-crumbs'), bot, voltarTexto: getComputedStyle(bar.querySelector('#court-back .courtbar-t')).display };
  });
  ok(!topo.caminho, 'sem o caminho "Início › Quadras em… ›" no alto');
  ok(topo.bot.map(b => b.l).join('|') === 'Voltar|Comparar|Compartilhar|Favoritar' && topo.bot.every(b => b.dentro && b.w === 40) && topo.voltarTexto === 'none',
    'no celular: voltar e os ícones de comparar, compartilhar e favoritar, do mesmo tamanho e dentro da tela — ' + JSON.stringify(topo.bot));
  await page.click('.courtbar [data-compare]');
  await page.waitForTimeout(150);
  let cmp = await page.evaluate(() => ({ lista: state.compareList.slice(), on: document.querySelector('.courtbar [data-compare]').classList.contains('on'), push: document.querySelector('.gt-push')?.innerText || '' }));
  ok(cmp.lista.includes('a1') && cmp.on && cmp.push.includes('Na comparação (1)'), 'tocar no comparar põe na comparação, acende o ícone e avisa — ' + cmp.push.replace(/\s+/g, ' '));
  await page.click('.courtbar [data-compare]');
  await page.waitForTimeout(150);
  cmp = await page.evaluate(() => ({ lista: state.compareList.slice(), push: document.querySelector('.gt-push')?.innerText || '' }));
  ok(!cmp.lista.includes('a1') && cmp.push.includes('Tirada da comparação'), 'tocar de novo tira');
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.waitForTimeout(150);
  const pc = await page.evaluate(() => [...document.querySelectorAll('.courtbar .courtbar-t')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.innerText));
  ok(pc.join('|') === 'Voltar|Comparar', 'no computador, "Voltar" e "Comparar" com texto — ' + pc.join('|'));
  await browser.close();
  console.log('\nficha-topo-e-sobre.js: fim');
})();
