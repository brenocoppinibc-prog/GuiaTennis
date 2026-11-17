// Regra 294 (17/11/2026): "tem academias que oferecem locação para eventos,
// rankings, aulas com projeto social"; "continue assim, mas tire a opção
// torneios, deixe só ranking". Locação para eventos e Ranking no catálogo (com
// valor, foto e WhatsApp, fora das "Opções para jogar"); o Projeto social à
// parte, com o texto da academia. "Também oferece" na ficha e nos Filtros.
const { abrir, ok } = require('./harness');

(async () => {
  const { browser, page } = await abrir();
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const a2 = state.allCourts.find(c => c.id === 'a2');
    a2.catalogo = [...(a2.catalogo || []), { tipo: 'eventos', cobranca: 'avulsa', preco: '800' }, { tipo: 'ranking', cobranca: 'mensal', preco: '50' }];
    a2.projetoSocial = 'Aulas gratuitas para crianças de 8 a 14 anos.';
    render();
  });

  // Na ficha: "Também oferece" depois das opções, com o valor e o WhatsApp.
  await page.evaluate(() => openCourt('a2'));
  await page.waitForTimeout(400);
  let r = await page.evaluate(() => ({
    itens: [...document.querySelectorAll('#ht-oferece .ht-oferece-i')].map(e => e.innerText.replace(/\s+/g, ' ').trim()),
    wa: [...document.querySelectorAll('#ht-oferece .ht-oferece-wa')].map(a => decodeURIComponent(a.getAttribute('href'))),
    depois: document.getElementById('ht-opcoes')?.nextElementSibling?.id,
    opcoes: opcoesPreco(state.allCourts.find(c => c.id === 'a2')).map(o => o.tipo),
    destaques: [...document.querySelectorAll('.ht-destaque-t')].map(e => e.innerText.trim()),
  }));
  ok(r.depois === 'ht-oferece' && r.itens.length === 3 && /^Locação para eventos .*R\$ 800 por evento/.test(r.itens[0]) && /^Ranking .*R\$ 50 por mês/.test(r.itens[1]) && /^Projeto social Aulas gratuitas/.test(r.itens[2]),
    'na ficha, "Também oferece" com eventos, ranking (valor e unidade) e o projeto social — ' + r.itens.join(' | '));
  ok(r.wa.length === 3 && /evento/.test(r.wa[0]) && /ranking/.test(r.wa[1]) && /projeto social/.test(r.wa[2]), 'cada um com o WhatsApp já com a pergunta');
  ok(!r.opcoes.includes('eventos') && !r.opcoes.includes('ranking'), 'eventos e ranking ficam fora das "Opções para jogar" e do "a partir de"');

  // Nos Filtros: "Também oferece"; o toque deixa só quem oferece.
  await page.evaluate(() => { state.cep = ''; goSearch(); state.showFilters = true; render(); });
  await page.waitForTimeout(300);
  r = await page.evaluate(() => [...document.querySelectorAll('.fgroup-title')].map(t => t.innerText.trim()));
  ok(r.includes('Também oferece'), 'nos Filtros, o grupo "Também oferece"');
  await page.click('.amenity-chip[data-amenity="ranking"]');
  await page.waitForTimeout(300);
  r = await page.evaluate(() => { state.showFilters = false; render(); return { ids: getResults().map(c => c.id), ativo: document.querySelector('.active-chips')?.innerText || '' }; });
  ok(r.ids.join() === 'a2' && r.ativo.includes('Ranking'), 'filtra e aparece nos filtros ativos com o nome — ' + JSON.stringify(r));

  // No cadastro: a grade monta os itens; marcado sem valor, "Sob consulta"; o projeto social vai para a coluna dele.
  r = await page.evaluate(() => {
    const f = { amenities: [], modalidades: ['locacao'], catalogo: [], projetoSocialOn: true, projetoSocial: '' };
    const g = gradeDoCatalogo(f);
    g.extras = ['eventos', 'ranking'];
    g.valores['extra:ranking:avulsa'] = '30';
    catalogoDaGrade(f);
    const itens = f.catalogo.map(i => `${i.tipo}:${i.cobranca}:${i.preco || '-'}`);
    const falta = regFaltas(f, 'modalidades');
    f.projetoSocial = 'Aulas grátis às terças.';
    const linha = toRow(f);
    return { itens, falta, banco: linha.catalogo.map(i => i.tipo), projeto: linha.projeto_social, sem: toRow({ ...f, projetoSocialOn: false }).projeto_social };
  });
  ok(r.itens.join() === 'eventos:avulsa:-,ranking:avulsa:30' && r.banco.join() === 'eventos,ranking', 'eventos e ranking entram no catálogo, sem valor como "Sob consulta" — ' + r.itens.join());
  ok(r.falta.includes('como funciona o projeto social') && r.projeto === 'Aulas grátis às terças.' && r.sem === null, 'o projeto social pede o texto e vai para a coluna própria');
  // Regra 295: até 100 letras e sem venda.
  r = await page.evaluate(() => ['Aulas gratuitas para crianças de 8 a 14 anos.', 'Valorizamos o esporte na comunidade.', 'Matrícula com desconto!', 'Aulas por R$ 10', 'Chame no 11 91234-5678', 'Veja em www.academia.com.br', 'a'.repeat(101)].map(t => problemaNoProjetoSocial(t)));
  ok(r[0] === '' && r[1] === '' && /venda \("Matrícula"\)/.test(r[2]) && r[3] === 'o preço' && r[4] === 'o telefone' && r[5] === 'o link ou o @' && /100 letras/.test(r[6]) ,
    'o projeto social: até 100 letras, sem preço, telefone, link ou palavra de venda — ' + r.join(' | '));
  await browser.close();
})();
