// Pedido do Breno em 26/10/2026: "quero criar catálogos melhores para aulas
// em grupo, individuais, dupla e locações avulsas, mensal" (regra 162). Em
// 27/10/2026, só modalidade e valor: "duração de aula e locação eu não quero
// colocar"; "eu não quero que o catálogo seja oferecendo aulas em tal horário
// e duração, e sim qual modalidade e valor". Em 28/10/2026 (regra 168): "aulas
// de adulto, podendo selecionar individual, dupla, grupo mensal ou avulsa;
// aulas de crianças selecionando a idade individual, dupla, grupo sendo avulsa
// ou mensal; tente deixar isso um pouco mais fácil de ser preenchido, sem
// precisar fazer um por um". A grade de preços no cadastro, os cartões e os
// filtros da ficha, o "a partir de" da busca, a comparação, o Google e o
// banco ainda sem a coluna.
const { abrir, ok, irParte, salvarFicha } = require('./harness');

const texto = (page, sel) => page.evaluate((sel) => (document.querySelector(sel)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
// A grade de um bloco: "Individual=150/520 Grupo=·/300" (· = em branco).
const grade = (page, bloco) => page.evaluate((bloco) => {
  const g = document.querySelector(`[data-cat-grade="${bloco}"]`);
  if (!g) return '';
  const linhas = {};
  g.querySelectorAll('[data-cat-valor], [data-cat-oferece]').forEach(x => {
    const chave = (x.dataset.catValor || x.dataset.catOferece).split(':');
    const linha = chave.slice(0, -1).join(':');
    const v = x.dataset.catValor !== undefined ? (x.value || '·') : (x.getAttribute('aria-pressed') === 'true' ? '✓' : '·');
    (linhas[linha] = linhas[linha] || []).push(v);
  });
  return Object.keys(linhas).map(l => l.split(':').pop() + '=' + linhas[l].join('/')).join(' ');
}, bloco);
const chipsDe = (page, bloco) => page.evaluate((bloco) => [...document.querySelectorAll(`[data-cat-bloco="${bloco}"] [data-cat-formato]`)].map(b => (b.getAttribute('aria-pressed') === 'true' ? '✓' : '') + b.innerText.trim()).join(','), bloco);

const CATALOGO = [
  // Duração, vezes, alunos e observação que vierem de antes são ignorados, e
  // a mesma modalidade repetida também.
  { tipo: 'locacao', cobranca: 'avulsa', duracao: 90, preco: '130' },
  { tipo: 'grupo', cobranca: 'mensal', vezes: 2, alunos: 6, preco: '300', obs: 'Turma de iniciantes' },
  { tipo: 'grupo', cobranca: 'mensal', preco: '999' },
  { tipo: 'individual', cobranca: 'avulsa', preco: '150' },
  { tipo: 'dupla', cobranca: 'avulsa', preco: '90' },
  // As aulas das crianças, com a idade (regra 168).
  { tipo: 'grupo', cobranca: 'mensal', preco: '220', publico: 'crianca', idadeDe: 6, idadeAte: 12 },
  { tipo: 'individual', cobranca: 'avulsa', preco: '110', publico: 'crianca', idadeDe: 6, idadeAte: 12 },
];

(async () => {
  // ---- a grade de preços, no cadastro da academia ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha' });
  await page.waitForTimeout(400);
  await page.click('.editar-academia');
  await page.waitForTimeout(400);
  await irParte(page, 'precos');
  let blocos = await page.evaluate(() => [...document.querySelectorAll('#cat-tabela .cat-bloco')].map(b => b.dataset.catBloco + ':' + b.querySelector('.cat-bloco-n').innerText).join(' | '));
  ok(blocos === 'adulto:Aulas para adultos | crianca:Aulas para crianças', 'só com Aulas marcada: um bloco para as aulas de adultos e um para as das crianças — ' + blocos);
  ok((await chipsDe(page, 'adulto')) === 'Individual,Dupla,Grupo' && (await chipsDe(page, 'crianca')) === 'Individual,Dupla,Grupo', 'cada bloco começa com os formatos para escolher, nenhum marcado');
  ok(!(await page.$('[data-cat-grade]')) && !(await page.$('[data-cat-idade]')) && !(await page.$('[data-cat-copiar]')), 'sem formato escolhido, sem grade, sem idade e sem "Copiar"');

  // Escolher os formatos abre as linhas da grade, com a avulsa e a mensal lado a lado.
  await page.click('[data-cat-formato="adulto:individual"]');
  ok(await page.evaluate(() => document.activeElement?.dataset.catValor === 'adulto:individual:avulsa'), 'o formato escolhido já põe o cursor no valor avulso');
  await page.click('[data-cat-formato="adulto:grupo"]');
  ok((await grade(page, 'adulto')) === 'individual=·/· grupo=·/·', 'uma linha por formato escolhido, na ordem — ' + await grade(page, 'adulto'));
  const cabecalho = await page.evaluate(() => [...document.querySelectorAll('[data-cat-grade="adulto"] .cat-col')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' | '));
  ok(cabecalho === 'Avulsa por aula | Mensal por mês', 'as colunas: avulsa por aula e mensal por mês — ' + cabecalho);
  const rotulos = await page.evaluate(() => [...document.querySelectorAll('[data-cat-grade="adulto"] .cat-lin')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' | '));
  ok(rotulos === 'Individual | Grupo por pessoa', 'no grupo (e na dupla), o valor é por pessoa — ' + rotulos);
  const so = await texto(page, '#cat-tabela');
  ok(!/Duração|vezes por semana|alunos|Observação|horário/i.test(so), 'só modalidade e valor: sem duração, vezes, alunos, observação ou horário');
  await page.fill('[data-cat-valor="adulto:individual:avulsa"]', '150');
  await page.fill('[data-cat-valor="adulto:individual:mensal"]', '520');
  await page.fill('[data-cat-valor="adulto:grupo:mensal"]', '3a00');
  ok((await page.inputValue('[data-cat-valor="adulto:grupo:mensal"]')) === '300', 'o valor só aceita números (e o traço da faixa)');
  ok((await grade(page, 'adulto')) === 'individual=150/520 grupo=·/300', 'os valores ficam na grade — ' + await grade(page, 'adulto'));

  // As aulas das crianças: "Copiar das aulas para adultos" e a idade.
  ok((await texto(page, '[data-cat-copiar]')) === 'Copiar das aulas para adultos', 'com as aulas de adultos escolhidas, as das crianças oferecem "Copiar das aulas para adultos"');
  await page.click('[data-cat-copiar]');
  await page.waitForTimeout(150);
  ok((await chipsDe(page, 'crianca')) === '✓Individual,Dupla,✓Grupo' && (await grade(page, 'crianca')) === 'individual=150/520 grupo=·/300', '"Copiar" traz os mesmos formatos e valores, para ajustar — ' + await grade(page, 'crianca'));
  ok(!(await page.$('[data-cat-copiar]')), 'depois de copiar, o "Copiar" sai');
  const idade = await page.evaluate(() => {
    const el = document.querySelector('.cat-idade');
    const sel = [...el.querySelectorAll('select')];
    return { t: [...el.childNodes].map(n => n.tagName === 'SELECT' ? '[ ]' : n.textContent).join('').replace(/\s+/g, ' ').trim(), de: [...sel[0].options].map(o => o.value).join(',') };
  });
  ok(idade.t === 'Idade de [ ] a [ ] anos' && idade.de === ',' + Array.from({ length: 15 }, (_, i) => i + 3).join(','), 'a idade: "de … a … anos", de 3 a 17 — ' + JSON.stringify(idade));
  await page.selectOption('[data-cat-idade="de"]', '12');
  await page.selectOption('[data-cat-idade="ate"]', '6');
  await page.waitForTimeout(150);
  ok((await page.inputValue('[data-cat-idade="de"]')) === '6' && (await page.inputValue('[data-cat-idade="ate"]')) === '12', '"de 12 a 6" vira "de 6 a 12"');
  await page.fill('[data-cat-valor="crianca:individual:avulsa"]', '110');
  await page.fill('[data-cat-valor="crianca:individual:mensal"]', '');
  await page.fill('[data-cat-valor="crianca:grupo:mensal"]', '220');
  // Tirar um formato e trazer de novo não perde o valor escrito.
  await page.click('[data-cat-formato="adulto:grupo"]');
  ok((await grade(page, 'adulto')) === 'individual=150/520', 'tirar o formato tira a linha');
  await page.click('[data-cat-formato="adulto:grupo"]');
  ok((await grade(page, 'adulto')) === 'individual=150/520 grupo=·/300', 'e trazer de novo volta com o valor — ' + await grade(page, 'adulto'));

  // A locação, embaixo, do mesmo jeito.
  await page.click('.reg-modalidade[data-modalidade="locacao"]');
  ok((await grade(page, 'locacao')) === 'locacao=·/·' && (await page.evaluate(() => [...document.querySelectorAll('[data-cat-grade="locacao"] .cat-col')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' | '))) === 'Avulsa por hora | Mensal por mês', 'marcando Locação, aparece o bloco da locação: avulsa por hora e mensal por mês');
  await page.fill('[data-cat-valor="locacao:avulsa"]', '130');

  await irParte(page, 'revisar');
  const previa = await texto(page, '.reg-previa [data-previa="precos"]');
  ok(previa.includes('Aula infantil em grupo') && previa.includes('Mostrando 6 de 6 opções'), 'a prévia já mostra o catálogo — ' + previa.slice(0, 140));
  await salvarFicha(page);
  await page.waitForTimeout(500);
  if (await page.$('.reg-plano-basico')) { await page.click('.reg-plano-basico'); await page.waitForTimeout(800); }
  let banco = await page.evaluate(() => { const a = window.__db.academias.find(x => x.id === 'a1'); return { cat: a.catalogo, aula: a.price_aula, loc: a.price_locacao, mods: a.modalidades }; });
  ok(Array.isArray(banco.cat) && JSON.stringify(banco.cat) === JSON.stringify([
    { tipo: 'individual', cobranca: 'avulsa', preco: '150' }, { tipo: 'individual', cobranca: 'mensal', preco: '520' },
    { tipo: 'grupo', cobranca: 'mensal', preco: '300' },
    { tipo: 'individual', cobranca: 'avulsa', preco: '110', publico: 'crianca', idadeDe: 6, idadeAte: 12 },
    { tipo: 'grupo', cobranca: 'mensal', preco: '220', publico: 'crianca', idadeDe: 6, idadeAte: 12 },
    { tipo: 'locacao', cobranca: 'avulsa', preco: '130' }]), 'vai para o banco o que tem valor, com a idade nas aulas das crianças, na ordem do catálogo; o que ficou em branco não vai — ' + JSON.stringify(banco.cat));
  ok(banco.aula === '150' && banco.loc === '130' && banco.mods.includes('locacao'), 'o preço da aula sai das avulsas de adultos (a infantil não entra), e o da locação, das avulsas dela — ' + banco.aula + ' / ' + banco.loc);
  await browser.close();

  // ---- "Não divulgar os valores": a grade vira "Oferece" ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha' }));
  await page.waitForTimeout(400);
  await page.evaluate(async (cat) => { window.__db.academias.find(x => x.id === 'a1').catalogo = cat; await loadEverything(); render(); }, CATALOGO);
  await page.click('.editar-academia');
  await page.waitForTimeout(400);
  await irParte(page, 'precos');
  ok((await chipsDe(page, 'adulto')) === '✓Individual,✓Dupla,✓Grupo' && (await grade(page, 'adulto')) === 'individual=150/· dupla=90/· grupo=·/300' && (await grade(page, 'crianca')) === 'individual=110/· grupo=·/220', 'a ficha salva volta para a grade, nos blocos certos — ' + await grade(page, 'adulto') + ' | ' + await grade(page, 'crianca'));
  ok((await page.inputValue('[data-cat-idade="de"]')) === '6' && (await page.inputValue('[data-cat-idade="ate"]')) === '12', 'com a idade das crianças');
  await page.click('[data-cat-consulta="crianca"]');
  ok((await grade(page, 'crianca')) === 'individual=✓/· grupo=·/✓' && (await texto(page, '[data-cat-oferece="crianca:grupo:mensal"]')) === 'Oferece', '"Não divulgar os valores" troca os valores por "Oferece", já marcado no que tinha valor — ' + await grade(page, 'crianca'));
  await page.click('[data-cat-oferece="crianca:grupo:avulsa"]');
  ok((await grade(page, 'crianca')) === 'individual=✓/· grupo=✓/✓', 'e marca o que mais oferece');
  await irParte(page, 'revisar');
  await salvarFicha(page);
  await page.waitForTimeout(500);
  if (await page.$('.reg-plano-basico')) { await page.click('.reg-plano-basico'); await page.waitForTimeout(800); }
  banco = await page.evaluate(() => window.__db.academias.find(x => x.id === 'a1').catalogo.filter(i => i.publico === 'crianca').map(i => `${i.tipo}:${i.cobranca}=${i.preco || 'consulta'}`).join(' '));
  ok(banco === 'individual:avulsa=consulta grupo:avulsa=consulta grupo:mensal=consulta', 'sem os valores, vai o que oferece, sob consulta — ' + banco);
  await page.evaluate(() => { state.page = 'court'; state.selected = decorate(state.allCourts.find(x => x.id === 'a1')); render(); });
  await page.waitForTimeout(300);
  const consulta = await page.evaluate(() => [...document.querySelectorAll('#ht-quartos .ht-quarto')].find(x => x.innerText.includes('Aula infantil individual'))?.innerText.replace(/\s+/g, ' ') || '');
  ok(consulta.includes('Sob consulta'), 'na ficha, a aula das crianças sem valor diz "Sob consulta" — ' + consulta);
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
  ok(nomes.join(',') === 'Aula individual,Aula em dupla,Aula em grupo,Aula infantil individual,Aula infantil em grupo,Locação', 'um cartão por opção, na ordem do catálogo (as das crianças depois das de adultos), sem repetir — ' + nomes.join(','));
  const chips = await page.evaluate(() => [...document.querySelectorAll('#ht-opcoes-filtro .chip')].map(b => b.innerText.trim()).join(','));
  ok(chips === 'Todas,Individual,Dupla,Grupo,Crianças,Locação,Avulsas,Mensais' && await page.$('.ht-opcoes-sep'), 'filtros por tipo (as aulas das crianças juntas, em "Crianças") e por cobrança — ' + chips);
  const grupo = await page.evaluate(() => {
    const c = [...document.querySelectorAll('#ht-quartos .ht-quarto')][2];
    return { t: c.innerText.replace(/\s+/g, ' '), wa: decodeURIComponent(c.querySelector('.ht-quarto-bt').getAttribute('href')), menor: !!document.querySelector('.ht-quarto-tag') };
  });
  ok(grupo.t.includes('Plano mensal') && grupo.t.includes('Turma com o professor') && grupo.t.includes('R$ 300') && grupo.t.includes('por pessoa, por mês') && !/por semana|alunos|iniciantes|hora de aula|999/.test(grupo.t), 'o cartão da turma: só a modalidade e o valor — ' + grupo.t);
  ok(grupo.wa.includes('queria saber sobre o plano mensal de aula em grupo.'), 'o WhatsApp já abre sobre aquela opção — ' + grupo.wa.split('text=')[1]);
  ok(!grupo.menor, 'sem "Menor preço": avulsa e mensal não se comparam');
  const infantil = await page.evaluate(() => {
    const c = [...document.querySelectorAll('#ht-quartos .ht-quarto')][4];
    return { t: c.innerText.replace(/\s+/g, ' '), wa: decodeURIComponent(c.querySelector('.ht-quarto-bt').getAttribute('href')) };
  });
  ok(infantil.t.includes('Aula infantil em grupo') && infantil.t.includes('Plano mensal') && infantil.t.includes('Turma de crianças com o professor') && infantil.t.includes('De 6 a 12 anos') && infantil.t.includes('R$ 220') && infantil.t.includes('por pessoa, por mês'), 'o cartão da aula das crianças: o formato, a idade e o valor — ' + infantil.t);
  ok(infantil.wa.includes('queria saber sobre o plano mensal de aula infantil em grupo.'), 'o WhatsApp da aula das crianças — ' + infantil.wa.split('text=')[1]);
  const loc = await page.evaluate(() => [...document.querySelectorAll('#ht-quartos .ht-quarto')][5].innerText.replace(/\s+/g, ' '));
  const individual = await page.evaluate(() => [...document.querySelectorAll('#ht-quartos .ht-quarto')][0].innerText.replace(/\s+/g, ' '));
  ok(loc.includes('Locação avulsa') && loc.includes('Aluguel da quadra') && !loc.includes('1h30') && loc.includes('por hora') && loc.includes('Reposição até 12h antes') && individual.includes('Reposição até 24h antes'), 'a locação: avulsa, por hora (a duração de antes não aparece), com a reposição da locação (a aula, com a da aula) — ' + loc);

  await page.click('#ht-opcoes-filtro [data-opcao-filtro="Crianças"]');
  ok((await cartoes()).join(',') === 'Aula infantil individual,Aula infantil em grupo', '"Crianças" mostra só as aulas das crianças');
  await page.click('#ht-opcoes-filtro [data-opcao-cobranca="mensal"]');
  nomes = await cartoes();
  ok(nomes.join(',') === 'Aula infantil em grupo' && (await texto(page, '.ht-opcoes-n')) === 'Mostrando 1 de 6 opções', '"Crianças" e "Mensais" juntos');
  await page.click('#ht-opcoes-filtro [data-opcao-filtro="Individual"]');
  ok((await texto(page, '.ht-opcoes-vazio')).startsWith('A academia não tem aula individual mensal no catálogo.'), 'individual e mensal, sem opção: diz que não tem e oferece "Ver todas"');
  await page.click('.ht-opcoes-vazio [data-opcao-filtro]');
  ok((await cartoes()).length === 6, '"Ver todas" volta às seis opções');
  await page.click('#ht-opcoes-filtro [data-opcao-filtro="Locação"]');
  ok((await cartoes()).join() === 'Locação', 'o filtro do tipo');

  const resumo = await page.evaluate(() => ({
    barra: document.querySelector('.court-cta-unit')?.innerText || '', sobre: document.querySelector('.ht-about')?.innerText || '',
    oferece: document.querySelector('.ht-caixa-v')?.innerText || '',
    faq: perguntasAcademia(state.selected).map(x => x.q + ' ' + x.a).join(' | '),
    ld: (JSON.parse(document.getElementById('ld-academia').textContent)['@graph'] || []).find(x => x.hasOfferCatalog),
  }));
  ok(resumo.barra === 'por pessoa, na dupla', 'a barra de baixo: a opção avulsa mais em conta dos adultos e o que o valor paga, curto — ' + resumo.barra);
  ok(resumo.oferece.startsWith('Aula e locação · Aula infantil'), '"A academia oferece" diz que tem aula infantil — ' + resumo.oferece);
  const curtos = await page.evaluate(() => opcoesPreco(state.selected).map(rotuloCurto).join(' | '));
  ok(curtos === 'por aula individual | por pessoa, na dupla | por pessoa/mês, na turma | por aula individual infantil | por pessoa/mês, na turma infantil | por hora de quadra', 'o rótulo curto de cada opção — ' + curtos);
  ok(resumo.sobre.includes('No catálogo da academia: aula individual a partir de R$ 150 por aula; aula em dupla a partir de R$ 90 por pessoa, por aula; aula em grupo a partir de R$ 300 por pessoa, por mês; aula infantil a partir de R$ 110 por aula; e locação a partir de R$ 130 por hora. Também há planos mensais.'), 'o "Sobre" resume o catálogo, com as aulas das crianças juntas — ' + resumo.sobre);
  ok(resumo.faq.includes('Que aulas Só Aula Tennis tem? Aula individual, em dupla e em grupo, avulsas e em planos mensais.') && resumo.faq.includes('Aula em grupo mensal: R$ 300 por pessoa, por mês'), 'as perguntas frequentes com os tipos de aula e os valores');
  ok(resumo.faq.includes('Só Aula Tennis tem aula de tênis para crianças? Sim: aula infantil individual e em grupo, avulsas e em planos mensais, para crianças de 6 a 12 anos.') && resumo.faq.includes('Aula infantil em grupo mensal: R$ 220 por pessoa, por mês'), 'e a pergunta das aulas para crianças, com a idade — ' + resumo.faq.split(' | ').find(x => x.includes('crianças')));
  const ofertas = resumo.ld && resumo.ld.hasOfferCatalog.itemListElement;
  ok(ofertas && ofertas.length === 6 && ofertas[0].name === 'Aula individual avulsa' && ofertas[0].description === 'Aula avulsa · Você e o professor' && ofertas[0].priceSpecification.price === 150 && ofertas[0].priceSpecification.priceCurrency === 'BRL' && ofertas[0].priceSpecification.unitText === 'por aula', 'o Google lê o catálogo (hasOfferCatalog) — ' + JSON.stringify(ofertas && ofertas[0]));
  ok(ofertas && ofertas[4].name === 'Aula infantil em grupo mensal' && ofertas[4].description === 'Plano mensal · Turma de crianças com o professor · De 6 a 12 anos', 'e a aula das crianças, com a idade — ' + JSON.stringify(ofertas && ofertas[4]));

  // No computador, o cartão da direita: o "a partir de" de cada tipo.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(200);
  const aside = await page.evaluate(() => document.querySelector('.ht-aside .ht-book').textContent.replace(/\s+/g, ' ').trim());
  ok(aside.startsWith('A partir de Aula individual R$ 150/aula Aula em dupla R$ 90/aula Aula em grupo R$ 300/mês Aula infantil R$ 110/aula Locação R$ 130/h Ver as 6 opções'), 'no computador, o "a partir de" de cada tipo (as aulas das crianças numa linha) e o atalho para as opções — ' + aside.slice(0, 160));
  await page.click('.ht-book-ver');
  await page.waitForTimeout(500);
  const topo = await page.evaluate(() => document.getElementById('ht-opcoes').getBoundingClientRect().top);
  ok(topo < 300, '"Ver as 6 opções" leva às opções — ' + Math.round(topo));
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
  ok(card === 'Aula R$ 90/aula | Aula infantil R$ 110/aula | Locação R$ 130/h', 'na busca, uma oferta por modalidade e a aula infantil à parte, com o que o valor paga — ' + card);
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
  ok(cmp.includes('Aula individual') && cmp.includes('Aula em grupo') && /Aula infantil[\s\S]*R\$ 110/.test(cmp) && /Locação[\s\S]*R\$ 130[\s\S]*por hora[\s\S]*R\$ 100 a 120[\s\S]*por hora/.test(cmp), 'na comparação, uma linha por tipo (e uma para a aula infantil), com o que o valor paga');
  await browser.close();

  // ---- ficha sem catálogo (como antes) ----
  ({ browser, page } = await abrir({ q: 'academia/quadra-locacao-a2' }));
  await page.waitForTimeout(300);
  const antiga = await page.evaluate(() => ({ cartoes: [...document.querySelectorAll('#ht-quartos .ht-quarto')].map(x => x.innerText.replace(/\s+/g, ' ')), filtros: !!document.getElementById('ht-opcoes-filtro'), barra: document.querySelector('.court-cta-unit')?.innerText }));
  ok(antiga.cartoes.length === 1 && antiga.cartoes[0].includes('Aluguel da quadra por hora') && antiga.cartoes[0].includes('R$ 100 a 120 por hora') && !antiga.filtros && antiga.barra === 'locação, por hora', 'sem catálogo, a ficha segue com a locação por hora — ' + antiga.cartoes[0]);
  await browser.close();

  // ---- o preço de antes entra na grade ----
  ({ browser, page } = await abrir({ admin: true, q: 'academia/quadra-locacao-a2' }));
  await page.waitForTimeout(400);
  await page.evaluate(() => abrirEdicaoDaFicha(state.allCourts.find(x => x.id === 'a2')));
  await page.waitForTimeout(300);
  await irParte(page, 'precos');
  ok((await grade(page, 'locacao')) === 'locacao=100-120/·', 'o preço por hora de antes aparece na locação avulsa — ' + await grade(page, 'locacao'));
  // A aula do preço antigo, sem formato: a linha "Aula", com a dica de escrever no formato certo.
  await page.evaluate(() => { state.regForm = null; abrirEdicaoDaFicha({ ...state.allCourts.find(x => x.id === 'a1'), priceAula: '120', catalogo: [] }); });
  await page.waitForTimeout(300);
  await irParte(page, 'precos');
  ok((await grade(page, 'adulto')) === 'aula=120/·' && (await texto(page, '.cat-tipo-dica')).startsWith('"Aula" é o preço de antes, sem o formato'), 'a aula do preço antigo aparece como "Aula", com a dica de escrever no formato certo — ' + await grade(page, 'adulto'));
  await page.click('[data-cat-formato="adulto:individual"]');
  await page.fill('[data-cat-valor="adulto:individual:avulsa"]', '120');
  await page.fill('[data-cat-valor="adulto:aula:avulsa"]', '');
  ok(await page.evaluate(() => JSON.stringify(window.__form.catalogo)) === JSON.stringify([{ tipo: 'individual', cobranca: 'avulsa', preco: '120' }]), 'com o valor no formato certo e o de "Aula" apagado, o catálogo fica só com o formato');
  await browser.close();

  // ---- banco ainda sem a coluna ----
  ({ browser, page } = await abrir({ academia: 'a1', semCatalogo: true, q: 'parceiros/ficha' }));
  await page.waitForTimeout(400);
  await page.click('.editar-academia');
  await page.waitForTimeout(400);
  await irParte(page, 'precos');
  await page.click('[data-cat-formato="adulto:individual"]');
  await page.fill('[data-cat-valor="adulto:individual:avulsa"]', '160');
  await irParte(page, 'revisar');
  await salvarFicha(page);
  await page.waitForTimeout(500);
  if (await page.$('.reg-plano-basico')) { await page.click('.reg-plano-basico'); await page.waitForTimeout(800); }
  banco = await page.evaluate(() => { const a = window.__db.academias.find(x => x.id === 'a1'); return { aula: a.price_aula, cat: a.catalogo, ok: document.getElementById('register-overlay')?.innerText.includes('Alterações salvas') }; });
  ok(banco.aula === '160' && banco.cat === undefined && banco.ok, 'banco sem a coluna: salva sem o catálogo, com o preço da aula — ' + JSON.stringify(banco));
  await browser.close();

  // ---- a foto de cada aula, no Premium (27/10/2026: "podendo adicionar
  // imagens para cada aulas no Premium"; uma por aula desde 28/10/2026) ----
  const PNG = { name: 'aula.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64') };
  ({ browser, page } = await abrir({ academia: 'a1', premium: ['a1'], q: 'parceiros/ficha' }));
  await page.waitForTimeout(400);
  await page.click('.editar-academia');
  await page.waitForTimeout(400);
  await irParte(page, 'precos');
  ok(!(await page.$('[data-cat-foto]')), 'sem formato escolhido, sem campo de foto');
  await page.click('[data-cat-formato="adulto:grupo"]');
  await page.fill('[data-cat-valor="adulto:grupo:avulsa"]', '80');
  await page.fill('[data-cat-valor="adulto:grupo:mensal"]', '300');
  ok((await texto(page, '[data-cat-bloco="adulto"] .cat-fotos')) === 'Foto de cada aula Grupo', 'no Premium, cada formato escolhido tem a própria foto, sem etiqueta — ' + await texto(page, '[data-cat-bloco="adulto"] .cat-fotos'));
  await page.setInputFiles('[data-cat-foto="adulto:grupo"]', PNG);
  await page.waitForFunction(() => !!document.querySelector('[data-cat-bloco="adulto"] .cat-foto img'));
  ok((await page.inputValue('[data-cat-valor="adulto:grupo:mensal"]')) === '300', 'a foto entra sem perder o valor escrito');
  await irParte(page, 'revisar');
  await salvarFicha(page);
  await page.waitForTimeout(700);
  banco = await page.evaluate(() => window.__db.academias.find(x => x.id === 'a1').catalogo || []);
  ok(banco.length === 2 && banco[0].tipo === 'grupo' && /^data:image\/jpeg;base64,/.test(banco[0].foto || '') && banco[0].preco === '80' && banco[1].preco === '300' && !banco[1].foto, 'a foto (diminuída) vai para o banco uma vez só, no primeiro item da aula — ' + JSON.stringify(banco.map(i => ({ ...i, foto: !!i.foto }))));
  const fotoDaAula = banco[0].foto;
  await page.evaluate(() => { state.page = 'court'; state.selected = decorate(state.allCourts.find(x => x.id === 'a1')); render(); });
  await page.waitForTimeout(300);
  let srcs = await page.evaluate(() => [...document.querySelectorAll('#ht-quartos .ht-quarto-foto img')].map(x => x.getAttribute('src') || ''));
  ok(srcs.length === 2 && srcs.every(s => s === fotoDaAula), 'na ficha da academia Premium, a avulsa e a mensal da aula mostram a foto dela');
  await browser.close();

  // Fora do Premium: a ficha não mostra a foto da aula, e o cadastro avisa.
  ({ browser, page } = await abrir({ academia: 'a1', completo: ['a1'], q: 'parceiros/ficha' }));
  await page.evaluate(async (foto) => {
    const a = window.__db.academias.find(x => x.id === 'a1');
    a.catalogo = [{ tipo: 'grupo', cobranca: 'mensal', preco: '300', foto }];
    a.photos = [foto.replace('base64,', 'base64,AA')];
    await loadEverything();
    state.page = 'court'; state.selected = decorate(state.allCourts.find(x => x.id === 'a1')); render();
  }, fotoDaAula);
  await page.waitForTimeout(300);
  const src = await page.evaluate(() => document.querySelector('#ht-quartos .ht-quarto-foto img')?.getAttribute('src') || '');
  ok(src && src !== fotoDaAula, 'no Completo, o cartão usa a foto da academia, não a da aula');
  await page.evaluate(() => abrirEdicaoDaFicha(state.allCourts.find(x => x.id === 'a1')));
  await page.waitForTimeout(300);
  await irParte(page, 'precos');
  const fora = await texto(page, '[data-cat-bloco="adulto"] .cat-fotos');
  ok(fora.includes('Premium') && fora.includes('Aparece no Premium') && await page.$('[data-cat-bloco="adulto"] .cat-foto img'), 'a foto guardada continua no cadastro, com "Aparece no Premium" — ' + fora);
  await irParte(page, 'revisar');
  await salvarFicha(page);
  await page.waitForTimeout(600);
  const esconde = await texto(page, '#register-overlay');
  ok(esconde.includes('A foto do catálogo') && esconde.includes('No Premium, cada opção de aula e locação mostra a própria foto na ficha.'), 'ao salvar fora do Premium, o que o plano esconde inclui a foto do catálogo');
  await browser.close();
})();
