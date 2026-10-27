// Pedido do Breno em 26/10/2026: "quero criar catálogos melhores para aulas
// em grupo, individuais, dupla e locações avulsas, mensal" (regra 162). Em
// 27/10/2026, só modalidade e valor: "duração de aula e locação eu não quero
// colocar"; "eu não quero que o catálogo seja oferecendo aulas em tal horário
// e duração, e sim qual modalidade e valor". A tabela de preços no cadastro,
// os cartões e os filtros da ficha, o "a partir de" da busca, a comparação,
// o Google e o banco ainda sem a coluna.
const { abrir, ok, irParte, salvarFicha } = require('./harness');

const texto = (page, sel) => page.evaluate((sel) => (document.querySelector(sel)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const tabela = (page) => page.evaluate(() => [...document.querySelectorAll('#cat-tabela .cat-tipo')].map(x => x.dataset.catTipo + '=' + [...x.querySelectorAll('.cat-linha')].map(l => (l.classList.contains('on') ? '✓' : '·') + (l.querySelector('.cat-valor')?.value || '')).join('/')).join(' '));

const CATALOGO = [
  // Duração, vezes, alunos e observação que vierem de antes são ignorados, e
  // a mesma modalidade repetida também.
  { tipo: 'locacao', cobranca: 'avulsa', duracao: 90, preco: '130' },
  { tipo: 'grupo', cobranca: 'mensal', vezes: 2, alunos: 6, preco: '300', obs: 'Turma de iniciantes' },
  { tipo: 'grupo', cobranca: 'mensal', preco: '999' },
  { tipo: 'individual', cobranca: 'avulsa', preco: '150' },
  { tipo: 'dupla', cobranca: 'avulsa', preco: '90' },
];

(async () => {
  // ---- a tabela de preços, no cadastro da academia ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha' });
  await page.waitForTimeout(400);
  await page.click('.editar-academia');
  await page.waitForTimeout(400);
  await irParte(page, 'precos');
  let t = await tabela(page);
  ok(t === 'individual=·/· dupla=·/· grupo=·/·', 'só com Aulas marcada: aula individual, em dupla e em grupo, cada uma com Avulsa e Mensal, nada marcado — ' + t);
  ok((await texto(page, '#cat-tabela .cat-tipo[data-cat-tipo="dupla"] .cat-tipo-n')) === 'Aula em dupla valor por pessoa', 'na dupla (e no grupo), o valor é por pessoa');
  await page.click('.reg-modalidade[data-modalidade="locacao"]');
  t = await tabela(page);
  ok(t.endsWith('locacao=·/·'), 'marcando Locação, aparece a locação — ' + t);
  const so = await texto(page, '#cat-tabela');
  ok(!/Duração|vezes por semana|alunos|Observação|horário/i.test(so) && !(await page.$('#cat-tabela input:not(.cat-valor)')), 'só modalidade e valor: sem duração, vezes, alunos, observação ou horário');

  await page.click('[data-cat-marcar="grupo:mensal"]');
  ok(await page.evaluate(() => document.activeElement?.dataset.catValor === 'grupo:mensal'), 'marcar já põe o cursor no valor');
  ok((await texto(page, '.cat-tipo[data-cat-tipo="grupo"] .cat-linha.on .cat-unidade')) === 'por pessoa, por mês', 'o grupo mensal é por pessoa, por mês');
  await page.fill('[data-cat-valor="grupo:mensal"]', '3a00');
  ok((await page.inputValue('[data-cat-valor="grupo:mensal"]')) === '300', 'o valor só aceita números (e o traço da faixa)');
  await page.click('[data-cat-marcar="individual:avulsa"]');
  await page.fill('[data-cat-valor="individual:avulsa"]', '150');
  await page.click('[data-cat-marcar="dupla:avulsa"]');
  await page.fill('[data-cat-valor="dupla:avulsa"]', '90');
  await page.click('[data-cat-marcar="locacao:avulsa"]');
  ok((await texto(page, '.cat-tipo[data-cat-tipo="locacao"] .cat-linha.on .cat-unidade')) === 'por hora', 'a locação avulsa é por hora');
  await page.fill('[data-cat-valor="locacao:avulsa"]', '130');
  await page.click('[data-cat-marcar="individual:mensal"]');
  await page.fill('[data-cat-valor="individual:mensal"]', '520');
  await page.click('[data-cat-marcar="individual:mensal"]');
  t = await tabela(page);
  ok(t === 'individual=✓150/· dupla=✓90/· grupo=·/✓300 locacao=✓130/·', 'marcar e desmarcar; o valor fica em cada opção — ' + t);

  await irParte(page, 'revisar');
  const previa = await texto(page, '.reg-previa [data-previa="precos"]');
  ok(previa.includes('Aula em grupo') && previa.includes('Mostrando 4 de 4 opções'), 'a prévia já mostra o catálogo — ' + previa.slice(0, 120));
  await salvarFicha(page);
  await page.waitForTimeout(500);
  if (await page.$('.reg-plano-basico')) { await page.click('.reg-plano-basico'); await page.waitForTimeout(800); }
  let banco = await page.evaluate(() => { const a = window.__db.academias.find(x => x.id === 'a1'); return { cat: a.catalogo, aula: a.price_aula, loc: a.price_locacao, mods: a.modalidades }; });
  ok(Array.isArray(banco.cat) && JSON.stringify(banco.cat) === JSON.stringify([
    { tipo: 'individual', cobranca: 'avulsa', preco: '150' }, { tipo: 'dupla', cobranca: 'avulsa', preco: '90' },
    { tipo: 'grupo', cobranca: 'mensal', preco: '300' }, { tipo: 'locacao', cobranca: 'avulsa', preco: '130' }]), 'vai para o banco só a modalidade, a cobrança e o valor, na ordem do catálogo — ' + JSON.stringify(banco.cat));
  ok(banco.aula === '90-150' && banco.loc === '130' && banco.mods.includes('locacao'), 'o preço da aula e da locação sai das opções avulsas (ordem por preço, filtro, comparação) — ' + banco.aula + ' / ' + banco.loc);
  await browser.close();

  // ---- a ficha ----
  ({ browser, page } = await abrir({ w: 412 }));
  await page.evaluate(async (cat) => {
    const a = window.__db.academias.find(x => x.id === 'a1');
    Object.assign(a, { catalogo: cat, modalidades: ['aulas_proprias', 'locacao'], price_aula: '90-150', price_locacao: '130', plano: 'completo' });
    await loadEverything();
    openCourt('a1');
  }, CATALOGO);
  await page.waitForTimeout(400);
  const cartoes = () => page.evaluate(() => [...document.querySelectorAll('#ht-quartos .ht-quarto')].map(x => x.querySelector('.ht-quarto-n').innerText));
  let nomes = await cartoes();
  ok(nomes.join(',') === 'Aula individual,Aula em dupla,Aula em grupo,Locação', 'um cartão por opção, na ordem do catálogo, sem repetir — ' + nomes.join(','));
  const chips = await page.evaluate(() => [...document.querySelectorAll('#ht-opcoes-filtro .chip')].map(b => b.innerText.trim()).join(','));
  ok(chips === 'Todas,Individual,Dupla,Grupo,Locação,Avulsas,Mensais' && await page.$('.ht-opcoes-sep'), 'filtros por tipo e por cobrança — ' + chips);
  const grupo = await page.evaluate(() => {
    const c = [...document.querySelectorAll('#ht-quartos .ht-quarto')][2];
    return { t: c.innerText.replace(/\s+/g, ' '), wa: decodeURIComponent(c.querySelector('.ht-quarto-bt').getAttribute('href')), menor: !!document.querySelector('.ht-quarto-tag') };
  });
  ok(grupo.t.includes('Plano mensal') && grupo.t.includes('Turma com o professor') && grupo.t.includes('R$ 300') && grupo.t.includes('por pessoa, por mês') && !/por semana|alunos|iniciantes|hora de aula|999/.test(grupo.t), 'o cartão da turma: só a modalidade e o valor — ' + grupo.t);
  ok(grupo.wa.includes('queria saber sobre o plano mensal de aula em grupo.'), 'o WhatsApp já abre sobre aquela opção — ' + grupo.wa.split('text=')[1]);
  ok(!grupo.menor, 'sem "Menor preço": avulsa e mensal não se comparam');
  const loc = await page.evaluate(() => [...document.querySelectorAll('#ht-quartos .ht-quarto')][3].innerText.replace(/\s+/g, ' '));
  const individual = await page.evaluate(() => [...document.querySelectorAll('#ht-quartos .ht-quarto')][0].innerText.replace(/\s+/g, ' '));
  ok(loc.includes('Locação avulsa') && loc.includes('Aluguel da quadra') && !loc.includes('1h30') && loc.includes('por hora') && loc.includes('Reposição até 12h antes') && individual.includes('Reposição até 24h antes'), 'a locação: avulsa, por hora (a duração de antes não aparece), com a reposição da locação (a aula, com a da aula) — ' + loc);

  await page.click('#ht-opcoes-filtro [data-opcao-cobranca="mensal"]');
  nomes = await cartoes();
  ok(nomes.join(',') === 'Aula em grupo' && (await texto(page, '.ht-opcoes-n')) === 'Mostrando 1 de 4 opções', '"Mensais" mostra só os planos mensais');
  await page.click('#ht-opcoes-filtro [data-opcao-filtro="Aula individual"]');
  ok((await texto(page, '.ht-opcoes-vazio')).startsWith('A academia não tem aula individual mensal no catálogo.'), 'individual e mensal, sem opção: diz que não tem e oferece "Ver todas"');
  await page.click('.ht-opcoes-vazio [data-opcao-filtro]');
  ok((await cartoes()).length === 4, '"Ver todas" volta às quatro opções');
  await page.click('#ht-opcoes-filtro [data-opcao-filtro="Locação"]');
  ok((await cartoes()).join() === 'Locação', 'o filtro do tipo');

  const resumo = await page.evaluate(() => ({
    barra: document.querySelector('.court-cta-unit')?.innerText || '', sobre: document.querySelector('.ht-about')?.innerText || '',
    faq: perguntasAcademia(state.selected).map(x => x.q + ' ' + x.a).join(' | '),
    ld: (JSON.parse(document.getElementById('ld-academia').textContent)['@graph'] || []).find(x => x.hasOfferCatalog),
  }));
  ok(resumo.barra === 'por pessoa, na dupla', 'a barra de baixo: a opção avulsa mais em conta e o que o valor paga, curto — ' + resumo.barra);
  const curtos = await page.evaluate(() => opcoesPreco(state.selected).map(rotuloCurto).join(' | '));
  ok(curtos === 'por aula individual | por pessoa, na dupla | por pessoa/mês, na turma | por hora de quadra', 'o rótulo curto de cada opção — ' + curtos);
  ok(resumo.sobre.includes('No catálogo da academia: aula individual a partir de R$ 150 por aula; aula em dupla a partir de R$ 90 por pessoa, por aula; aula em grupo a partir de R$ 300 por pessoa, por mês; e locação a partir de R$ 130 por hora. Também há planos mensais.'), 'o "Sobre" resume o catálogo — ' + resumo.sobre);
  ok(resumo.faq.includes('Que aulas Só Aula Tennis tem? Aula individual, em dupla e em grupo, avulsas e em planos mensais.') && resumo.faq.includes('Aula em grupo mensal: R$ 300 por pessoa, por mês'), 'as perguntas frequentes com os tipos de aula e os valores');
  const ofertas = resumo.ld && resumo.ld.hasOfferCatalog.itemListElement;
  ok(ofertas && ofertas.length === 4 && ofertas[0].name === 'Aula individual avulsa' && ofertas[0].description === 'Aula avulsa · Você e o professor' && ofertas[0].priceSpecification.price === 150 && ofertas[0].priceSpecification.priceCurrency === 'BRL' && ofertas[0].priceSpecification.unitText === 'por aula', 'o Google lê o catálogo (hasOfferCatalog) — ' + JSON.stringify(ofertas && ofertas[0]));

  // No computador, o cartão da direita: o "a partir de" de cada tipo.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(200);
  const aside = await page.evaluate(() => document.querySelector('.ht-aside .ht-book').textContent.replace(/\s+/g, ' ').trim());
  ok(aside.startsWith('A partir de Aula individual R$ 150/aula Aula em dupla R$ 90/aula Aula em grupo R$ 300/mês Locação R$ 130/h Ver as 4 opções'), 'no computador, o "a partir de" de cada tipo e o atalho para as opções — ' + aside.slice(0, 140));
  await page.click('.ht-book-ver');
  await page.waitForTimeout(500);
  const topo = await page.evaluate(() => document.getElementById('ht-opcoes').getBoundingClientRect().top);
  ok(topo < 300, '"Ver as 4 opções" leva às opções — ' + Math.round(topo));
  await browser.close();

  // ---- busca e comparação ----
  ({ browser, page } = await abrir({ q: 'busca?q=Pinheiros' }));
  await page.waitForTimeout(500);
  await page.evaluate(async (cat) => {
    const a = window.__db.academias.find(x => x.id === 'a1');
    Object.assign(a, { catalogo: cat, modalidades: ['aulas_proprias', 'locacao'], price_aula: '90-150', price_locacao: '130' });
    await loadEverything(); render();
  }, CATALOGO);
  await page.waitForTimeout(400);
  const card = await page.evaluate(() => {
    const c = [...document.querySelectorAll('.rcard')].find(x => x.innerText.includes('Só Aula Tennis'));
    return c ? [...c.querySelectorAll('.offer-um')].map(o => o.innerText.replace(/\s+/g, ' ').trim()).join(' | ') : '';
  });
  ok(card === 'Aula R$ 90/aula | Locação R$ 130/h', 'na busca, uma oferta por modalidade, com o que o valor paga — ' + card);
  await browser.close();

  ({ browser, page } = await abrir({ q: 'comparar?academias=a1,a2', w: 1280 }));
  await page.waitForTimeout(300);
  await page.evaluate(async (cat) => {
    const a = window.__db.academias.find(x => x.id === 'a1');
    Object.assign(a, { catalogo: cat, modalidades: ['aulas_proprias', 'locacao'] });
    await loadEverything(); render();
  }, CATALOGO);
  await page.waitForTimeout(300);
  const cmp = await page.evaluate(() => document.querySelector('#app').innerText);
  ok(cmp.includes('Aula individual') && cmp.includes('Aula em grupo') && /Locação[\s\S]*R\$ 130[\s\S]*por hora[\s\S]*R\$ 100 a 120[\s\S]*por hora/.test(cmp), 'na comparação, uma linha por tipo, com o que o valor paga');
  await browser.close();

  // ---- ficha sem catálogo (como antes) ----
  ({ browser, page } = await abrir({ q: 'academia/quadra-locacao-a2' }));
  await page.waitForTimeout(300);
  const antiga = await page.evaluate(() => ({ cartoes: [...document.querySelectorAll('#ht-quartos .ht-quarto')].map(x => x.innerText.replace(/\s+/g, ' ')), filtros: !!document.getElementById('ht-opcoes-filtro'), barra: document.querySelector('.court-cta-unit')?.innerText }));
  ok(antiga.cartoes.length === 1 && antiga.cartoes[0].includes('Aluguel da quadra por hora') && antiga.cartoes[0].includes('R$ 100 a 120 por hora') && !antiga.filtros && antiga.barra === 'locação, por hora', 'sem catálogo, a ficha segue com a locação por hora — ' + antiga.cartoes[0]);
  await browser.close();

  // ---- o preço de antes vira item na edição ----
  ({ browser, page } = await abrir({ admin: true, q: 'academia/quadra-locacao-a2' }));
  await page.waitForTimeout(400);
  await page.evaluate(() => abrirEdicaoDaFicha(state.allCourts.find(x => x.id === 'a2')));
  await page.waitForTimeout(300);
  await irParte(page, 'precos');
  t = await tabela(page);
  ok(t === 'locacao=✓100-120/·' && (await texto(page, '.cat-linha.on .cat-unidade')) === 'por hora', 'o preço por hora de antes aparece marcado na tabela — ' + t);
  // A aula do preço antigo, sem tipo: aparece "Aula", com a dica de escolher o tipo.
  await page.evaluate(() => { state.regForm = null; abrirEdicaoDaFicha({ ...state.allCourts.find(x => x.id === 'a1'), priceAula: '120', catalogo: [] }); });
  await page.waitForTimeout(300);
  await irParte(page, 'precos');
  t = await tabela(page);
  ok(t === 'individual=·/· dupla=·/· grupo=·/· aula=✓120/·' && (await texto(page, '.cat-tipo-dica')).startsWith('É o preço de antes, sem o tipo da aula'), 'a aula do preço antigo aparece como "Aula", com a dica de escolher o tipo — ' + t);
  await browser.close();

  // ---- banco ainda sem a coluna ----
  ({ browser, page } = await abrir({ academia: 'a1', semCatalogo: true, q: 'parceiros/ficha' }));
  await page.waitForTimeout(400);
  await page.click('.editar-academia');
  await page.waitForTimeout(400);
  await irParte(page, 'precos');
  await page.click('[data-cat-marcar="individual:avulsa"]');
  await page.fill('[data-cat-valor="individual:avulsa"]', '160');
  await irParte(page, 'revisar');
  await salvarFicha(page);
  await page.waitForTimeout(500);
  if (await page.$('.reg-plano-basico')) { await page.click('.reg-plano-basico'); await page.waitForTimeout(800); }
  banco = await page.evaluate(() => { const a = window.__db.academias.find(x => x.id === 'a1'); return { aula: a.price_aula, cat: a.catalogo, ok: document.getElementById('register-overlay')?.innerText.includes('Alterações salvas') }; });
  ok(banco.aula === '160' && banco.cat === undefined && banco.ok, 'banco sem a coluna: salva sem o catálogo, com o preço da aula — ' + JSON.stringify(banco));
  await browser.close();
})();
