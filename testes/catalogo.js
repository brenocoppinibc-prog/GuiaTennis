// Pedido do Breno em 26/10/2026: "quero criar catálogos melhores para aulas
// em grupo, individuais, dupla e locações avulsas, mensal" (regra 162). O
// editor no cadastro, os cartões e os filtros da ficha, o "a partir de" da
// busca, a comparação, o Google e o banco ainda sem a coluna.
const { abrir, ok, irParte, salvarFicha } = require('./harness');

const texto = (page, sel) => page.evaluate((sel) => (document.querySelector(sel)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const linhas = (page) => page.evaluate(() => [...document.querySelectorAll('#cat-lista .cat-item')].map(x => x.innerText.replace(/\s+/g, ' ').trim()));

const CATALOGO = [
  // A duração que vier de antes é ignorada (27/10/2026: "duração de aula e
  // locação eu não quero colocar").
  { tipo: 'locacao', cobranca: 'avulsa', duracao: 90, preco: '130' },
  { tipo: 'grupo', cobranca: 'mensal', vezes: 3, alunos: 6, preco: '400', obs: 'Turma de iniciantes' },
  { tipo: 'grupo', cobranca: 'mensal', vezes: 2, alunos: 6, preco: '300', obs: 'Turma de iniciantes' },
  { tipo: 'individual', cobranca: 'avulsa', preco: '150' },
  { tipo: 'dupla', cobranca: 'avulsa', preco: '90' },
];

(async () => {
  // ---- o editor, no cadastro da academia ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha' });
  await page.waitForTimeout(400);
  await page.click('.editar-academia');
  await page.waitForTimeout(400);
  await irParte(page, 'precos');
  let add = await page.evaluate(() => [...document.querySelectorAll('[data-cat-novo]')].map(b => b.innerText.trim()).join(' | '));
  ok(add === 'Aula individual | Aula em dupla | Aula em grupo' && !(await page.$('#cat-lista .cat-item')), 'só com Aulas marcada: adicionar aula individual, em dupla e em grupo — ' + add);
  await page.click('.reg-modalidade[data-modalidade="locacao"]');
  add = await page.evaluate(() => [...document.querySelectorAll('[data-cat-novo]')].map(b => b.innerText.trim()).join(' | '));
  ok(add.endsWith('| Locação'), 'marcando Locação, aparece o botão da locação');

  // Turma mensal: começa no mensal, 1x por semana. Sem duração.
  await page.click('[data-cat-novo="grupo"]');
  let form = await page.evaluate(() => ({
    t: document.querySelector('.cat-form-t')?.innerText, ativos: [...document.querySelectorAll('#cat-form .chip.active')].map(b => b.innerText.trim()).join(','),
    unidade: document.querySelector('#cat-form .cat-unidade')?.innerText, alunos: !!document.getElementById('cat-alunos'), cancelar: document.querySelector('[data-cat-cancelar]')?.innerText,
  }));
  ok(form.t === 'Nova opção' && form.ativos === 'Aula em grupo,Mensal,1x' && form.alunos && form.cancelar === 'Remover', 'aula em grupo nova: mensal, 1x por semana, com o campo de alunos — ' + form.ativos);
  ok(!(await page.$('[data-cat-duracao]')) && !/Duração/.test(await texto(page, '#cat-form')), 'sem a duração da aula');
  ok(form.unidade === 'por pessoa, por mês', 'o valor do grupo é por pessoa, por mês — ' + form.unidade);
  await page.click('[data-cat-vezes="2"]');
  await page.fill('#cat-alunos', '6');
  await page.fill('#cat-preco', '3a00');
  await page.fill('#cat-obs', 'Turma de iniciantes');
  ok((await page.inputValue('#cat-preco')) === '300', 'o valor só aceita números (e o traço da faixa)');
  await page.click('[data-cat-pronto]');
  let ls = await linhas(page);
  ok(ls.length === 1 && ls[0].startsWith('Aula em grupo Mensal 2x por semana · até 6 alunos Turma de iniciantes R$ 300 por pessoa, por mês'), 'a opção na lista, com o resumo e o valor — ' + ls[0]);

  // Duplicar para fazer a de 3x por semana.
  await page.click('[data-cat-duplicar="0"]');
  await page.click('[data-cat-vezes="3"]');
  await page.fill('#cat-preco', '400');
  await page.click('[data-cat-pronto]');
  await page.click('[data-cat-novo="individual"]');
  form = await page.evaluate(() => [...document.querySelectorAll('#cat-form .chip.active')].map(b => b.innerText.trim()).join(','));
  ok(form === 'Aula individual,Avulsa (por aula)' && !(await page.$('#cat-alunos')), 'aula individual nova: avulsa, sem o campo de alunos — ' + form);
  await page.fill('#cat-preco', '150');
  await page.click('[data-cat-pronto]');
  await page.click('[data-cat-novo="dupla"]');
  ok((await texto(page, '#cat-form .cat-unidade')) === 'por pessoa, por aula' && (await texto(page, '#cat-form')).includes('Na dupla e no grupo, o valor é por pessoa.'), 'na dupla, o valor é por pessoa, por aula');
  await page.fill('#cat-preco', '90');
  await page.click('[data-cat-pronto]');
  await page.click('[data-cat-novo="locacao"]');
  ok((await texto(page, '#cat-form .cat-unidade')) === 'por hora' && !/Duração/.test(await texto(page, '#cat-form')), 'locação avulsa: o valor é por hora, sem a duração');
  await page.fill('#cat-preco', '130');
  await page.click('[data-cat-pronto]');
  ls = await linhas(page);
  ok(ls.length === 5, 'cinco opções no catálogo');

  // Desfazer volta ao que era; "Remover" na nova tira a opção.
  await page.click('[data-cat-editar="4"]');
  ok((await texto(page, '.cat-form-t')) === 'Editar a opção' && (await texto(page, '[data-cat-cancelar]')) === 'Desfazer', 'editar abre a opção com "Desfazer"');
  await page.fill('#cat-preco', '999');
  await page.click('[data-cat-cancelar]');
  ls = await linhas(page);
  ok(ls[4].includes('R$ 130') && !ls.join().includes('999'), '"Desfazer" volta ao valor de antes');
  await page.click('[data-cat-novo="individual"]');
  await page.click('[data-cat-cancelar]');
  ok((await linhas(page)).length === 5 && !(await page.$('#cat-form')), '"Remover" na opção nova tira a opção');
  await page.click('[data-cat-novo="individual"]');
  await page.fill('#cat-preco', '1');
  await page.click('[data-cat-pronto]');
  await page.click('[data-cat-remover="5"]');
  ok((await linhas(page)).length === 5, '"Remover" da lista tira a opção');

  // Sem tocar em "Pronto", nada se perde.
  await page.click('[data-cat-editar="0"]');
  await page.fill('#cat-obs', 'Turma de iniciantes, sábado');
  await irParte(page, 'revisar');
  const previa = await texto(page, '.reg-previa [data-previa="precos"]');
  ok(previa.includes('Aula em grupo') && previa.includes('Turma de iniciantes, sábado') && previa.includes('Mostrando 5 de 5 opções'), 'a prévia já mostra o catálogo, com o que foi escrito sem "Pronto" — ' + previa.slice(0, 120));
  await salvarFicha(page);
  await page.waitForTimeout(500);
  if (await page.$('.reg-plano-basico')) { await page.click('.reg-plano-basico'); await page.waitForTimeout(800); }
  let banco = await page.evaluate(() => { const a = window.__db.academias.find(x => x.id === 'a1'); return { cat: a.catalogo, aula: a.price_aula, loc: a.price_locacao, mods: a.modalidades }; });
  ok(Array.isArray(banco.cat) && banco.cat.map(i => i.tipo + ':' + i.cobranca + ':' + (i.vezes || '')).join() === 'individual:avulsa:,dupla:avulsa:,grupo:mensal:2,grupo:mensal:3,locacao:avulsa:', 'o catálogo vai para o banco, na ordem do catálogo — ' + JSON.stringify(banco.cat && banco.cat.map(i => i.tipo)));
  ok(banco.cat[2].alunos === 6 && banco.cat[2].obs === 'Turma de iniciantes, sábado' && banco.cat.every(i => !('duracao' in i)), 'com alunos e observação, sem duração');
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
  ok(nomes.join(',') === 'Aula individual,Aula em dupla,Aula em grupo,Aula em grupo,Locação', 'um cartão por opção, na ordem do catálogo — ' + nomes.join(','));
  const chips = await page.evaluate(() => [...document.querySelectorAll('#ht-opcoes-filtro .chip')].map(b => b.innerText.trim()).join(','));
  ok(chips === 'Todas,Individual,Dupla,Grupo,Locação,Avulsas,Mensais' && await page.$('.ht-opcoes-sep'), 'filtros por tipo e por cobrança — ' + chips);
  const grupo = await page.evaluate(() => {
    const c = [...document.querySelectorAll('#ht-quartos .ht-quarto')][2];
    return { t: c.innerText.replace(/\s+/g, ' '), wa: decodeURIComponent(c.querySelector('.ht-quarto-bt').getAttribute('href')), menor: !!document.querySelector('.ht-quarto-tag') };
  });
  ok(grupo.t.includes('Mensal, 2x por semana') && !/hora de aula|min/.test(grupo.t) && grupo.t.includes('Até 6 alunos') && grupo.t.includes('Turma de iniciantes') && grupo.t.includes('R$ 300') && grupo.t.includes('por pessoa, por mês'), 'o cartão da turma: cobrança, alunos, observação e valor, sem duração — ' + grupo.t);
  ok(grupo.wa.includes('queria saber sobre a aula em grupo mensal, 2x por semana (Turma de iniciantes).'), 'o WhatsApp já abre sobre aquela opção — ' + grupo.wa.split('text=')[1]);
  ok(!grupo.menor, 'sem "Menor preço": avulsa e mensal não se comparam');
  const loc = await page.evaluate(() => [...document.querySelectorAll('#ht-quartos .ht-quarto')][4].innerText.replace(/\s+/g, ' '));
  const individual = await page.evaluate(() => [...document.querySelectorAll('#ht-quartos .ht-quarto')][0].innerText.replace(/\s+/g, ' '));
  ok(loc.includes('Avulsa, quando quiser') && !loc.includes('1h30') && loc.includes('por hora') && loc.includes('Reposição até 12h antes') && individual.includes('Reposição até 24h antes'), 'a locação: avulsa, por hora (a duração de antes não aparece), com a reposição da locação (a aula, com a da aula) — ' + loc);

  await page.click('#ht-opcoes-filtro [data-opcao-cobranca="mensal"]');
  nomes = await cartoes();
  ok(nomes.join(',') === 'Aula em grupo,Aula em grupo' && (await texto(page, '.ht-opcoes-n')) === 'Mostrando 2 de 5 opções', '"Mensais" mostra só os planos mensais');
  await page.click('#ht-opcoes-filtro [data-opcao-filtro="Aula individual"]');
  ok((await texto(page, '.ht-opcoes-vazio')).startsWith('A academia não tem aula individual mensal no catálogo.'), 'individual e mensal, sem opção: diz que não tem e oferece "Ver todas"');
  await page.click('.ht-opcoes-vazio [data-opcao-filtro]');
  ok((await cartoes()).length === 5, '"Ver todas" volta às cinco opções');
  await page.click('#ht-opcoes-filtro [data-opcao-filtro="Locação"]');
  ok((await cartoes()).join() === 'Locação', 'o filtro do tipo');

  const resumo = await page.evaluate(() => ({
    barra: document.querySelector('.court-cta-unit')?.innerText || '', sobre: document.querySelector('.ht-about')?.innerText || '',
    faq: perguntasAcademia(state.selected).map(x => x.q + ' ' + x.a).join(' | '),
    ld: (JSON.parse(document.getElementById('ld-academia').textContent)['@graph'] || []).find(x => x.hasOfferCatalog),
  }));
  ok(resumo.barra === 'por pessoa, na dupla', 'a barra de baixo: a opção avulsa mais em conta e o que o valor paga, curto — ' + resumo.barra);
  const curtos = await page.evaluate(() => opcoesPreco(state.selected).map(rotuloCurto).join(' | '));
  ok(curtos === 'por aula individual | por pessoa, na dupla | por pessoa/mês, na turma | por pessoa/mês, na turma | por hora de quadra', 'o rótulo curto de cada opção — ' + curtos);
  ok(resumo.sobre.includes('No catálogo da academia: aula individual a partir de R$ 150 por aula; aula em dupla a partir de R$ 90 por pessoa, por aula; aula em grupo a partir de R$ 300 por pessoa, por mês; e locação a partir de R$ 130 por hora. Também há planos mensais.'), 'o "Sobre" resume o catálogo — ' + resumo.sobre);
  ok(resumo.faq.includes('Que aulas Só Aula Tennis tem? Aula individual, em dupla e em grupo, avulsas e em planos mensais.') && resumo.faq.includes('Aula em grupo mensal (2x por semana): R$ 300 por pessoa, por mês'), 'as perguntas frequentes com os tipos de aula e os valores');
  const ofertas = resumo.ld && resumo.ld.hasOfferCatalog.itemListElement;
  ok(ofertas && ofertas.length === 5 && ofertas[0].name === 'Aula individual avulsa' && ofertas[0].priceSpecification.price === 150 && ofertas[0].priceSpecification.priceCurrency === 'BRL' && ofertas[0].priceSpecification.unitText === 'por aula', 'o Google lê o catálogo (hasOfferCatalog) — ' + JSON.stringify(ofertas && ofertas[0]));

  // No computador, o cartão da direita: o "a partir de" de cada tipo.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(200);
  const aside = await page.evaluate(() => document.querySelector('.ht-aside .ht-book').textContent.replace(/\s+/g, ' ').trim());
  ok(aside.startsWith('A partir de Aula individual R$ 150/aula Aula em dupla R$ 90/aula Aula em grupo R$ 300/mês Locação R$ 130/h Ver as 5 opções'), 'no computador, o "a partir de" de cada tipo e o atalho para as opções — ' + aside.slice(0, 140));
  await page.click('.ht-book-ver');
  await page.waitForTimeout(500);
  const topo = await page.evaluate(() => document.getElementById('ht-opcoes').getBoundingClientRect().top);
  ok(topo < 300, '"Ver as 5 opções" leva às opções — ' + Math.round(topo));
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
  ls = await linhas(page);
  ok(ls.length === 1 && ls[0].startsWith('Locação Avulsa R$ 100 a 120 por hora'), 'o preço por hora de antes aparece como opção do catálogo — ' + ls[0]);
  await browser.close();

  // ---- banco ainda sem a coluna ----
  ({ browser, page } = await abrir({ academia: 'a1', semCatalogo: true, q: 'parceiros/ficha' }));
  await page.waitForTimeout(400);
  await page.click('.editar-academia');
  await page.waitForTimeout(400);
  await irParte(page, 'precos');
  await page.click('[data-cat-novo="individual"]');
  await page.fill('#cat-preco', '160');
  await page.click('[data-cat-pronto]');
  await irParte(page, 'revisar');
  await salvarFicha(page);
  await page.waitForTimeout(500);
  if (await page.$('.reg-plano-basico')) { await page.click('.reg-plano-basico'); await page.waitForTimeout(800); }
  banco = await page.evaluate(() => { const a = window.__db.academias.find(x => x.id === 'a1'); return { aula: a.price_aula, cat: a.catalogo, ok: document.getElementById('register-overlay')?.innerText.includes('Alterações salvas') }; });
  ok(banco.aula === '160' && banco.cat === undefined && banco.ok, 'banco sem a coluna: salva sem o catálogo, com o preço da aula — ' + JSON.stringify(banco));
  await browser.close();
})();
