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
// banco ainda sem a coluna. Em 30/10/2026 (regra 182): "Outra faixa de idade
// coloque adicionar faixa de idade e o valor mensal também será por aula";
// e (regra 183) "locação avulsa e mensal valores por hora".
const { abrir, ok, irParte, salvarFicha } = require('./harness');

const texto = (page, sel) => page.evaluate((sel) => (document.querySelector(sel)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
// Os cartões de um bloco: "individual=150/520 grupo=·/300" (· = em branco).
const grade = (page, bloco) => page.evaluate((bloco) => {
  const b = document.querySelector(`[data-cat-bloco="${bloco}"]`) || document.getElementById(bloco);
  if (!b) return '';
  return [...b.querySelectorAll('[data-cat-opcao]')].map(c => c.dataset.catOpcao.split(':').pop() + '=' + [...c.querySelectorAll('[data-cat-valor]')].map(x => x.value || '·').join('/')).join(' ');
}, bloco);
const chipsDe = (page, sel) => page.evaluate((sel) => [...document.querySelectorAll(sel)].map(b => (b.getAttribute('aria-pressed') === 'true' ? '✓' : '') + b.innerText.trim()).join(','), sel);

const CATALOGO = [
  // Duração, vezes, alunos e observação que vierem de antes são ignorados, e
  // a mesma modalidade repetida também.
  { tipo: 'locacao', cobranca: 'avulsa', duracao: 90, preco: '130' },
  { tipo: 'grupo', cobranca: 'mensal', vezes: 2, alunos: 6, preco: '300', obs: 'Turma de iniciantes' },
  { tipo: 'grupo', cobranca: 'mensal', preco: '999' },
  { tipo: 'individual', cobranca: 'avulsa', preco: '150' },
  { tipo: 'dupla', cobranca: 'avulsa', preco: '90' },
  // As aulas das crianças, com a idade (regra 168), em duas faixas (regra 169).
  { tipo: 'grupo', cobranca: 'mensal', preco: '250', publico: 'crianca', idadeDe: 13, idadeAte: 17 },
  { tipo: 'grupo', cobranca: 'mensal', preco: '220', publico: 'crianca', idadeDe: 6, idadeAte: 12 },
  { tipo: 'individual', cobranca: 'avulsa', preco: '110', publico: 'crianca', idadeDe: 6, idadeAte: 12 },
];

(async () => {
  // ---- o caminho das aulas, no cadastro da academia ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha' });
  await page.waitForTimeout(400);
  await page.click('.editar-academia');
  await page.waitForTimeout(400);
  await irParte(page, 'precos');
  ok((await texto(page, '.reg-titulo')) === 'Aulas' && (await chipsDe(page, '[data-cat-publico]')) === 'Adultos,Crianças' && !(await page.$('[data-cat-bloco]')), 'a parte Aulas começa por "para quem", nada marcado — ' + await chipsDe(page, '[data-cat-publico]'));
  ok((await texto(page, '.reg-passo .field-label')) === 'Para quem são as aulas que vocês oferecem?', 'a pergunta do começo, num tom formal sem exagero (regra 174)');
  await page.click('[data-cat-publico="adulto"]');
  ok((await texto(page, '[data-cat-bloco="adulto"] .cat-passo')) === 'Quais formatos de aula vocês oferecem?', 'e a dos formatos');
  ok((await chipsDe(page, '[data-cat-bloco="adulto"] [data-cat-formato]')) === 'Individual,Dupla,Grupo' && !(await page.$('[data-cat-opcao]')), 'depois, quais aulas: os formatos, nenhum marcado, e nenhum cartão ainda');
  await page.click('[data-cat-formato="adulto:individual"]');
  ok(await page.evaluate(() => document.activeElement?.dataset.catValor === 'adulto:individual:avulsa'), 'o formato escolhido abre o cartão, com o cursor no valor avulso');
  await page.click('[data-cat-formato="adulto:grupo"]');
  ok((await grade(page, 'adulto')) === 'individual=·/· grupo=·/·', 'um cartão por formato escolhido, na ordem — ' + await grade(page, 'adulto'));
  const cartaoGrupo = await texto(page, '[data-cat-opcao="adulto:grupo"]');
  ok(cartaoGrupo.startsWith('Aula em grupo valor por pessoa Avulsa por aula R$ Mensal por aula R$') && cartaoGrupo.includes('Foto desta aula'), 'cada cartão: o nome, a avulsa e a mensal (as duas por aula, regra 182) e a foto daquela aula — ' + cartaoGrupo);
  const so = await texto(page, '#cat-tabela');
  ok(!/Duração|vezes por semana|alunos|Observação|horário/i.test(so), 'só modalidade e valor: sem duração, vezes, alunos, observação ou horário');
  await page.fill('[data-cat-valor="adulto:individual:avulsa"]', '150');
  await page.fill('[data-cat-valor="adulto:individual:mensal"]', '520');
  // Um valor ou um intervalo (regra 175): o que separa os dois números vira
  // " a " na hora, e apagar tira o " a " de volta.
  const gm = '[data-cat-valor="adulto:grupo:mensal"]';
  await page.fill(gm, 'R$ 300');
  ok((await page.inputValue(gm)) === '300', 'o valor só fica com os números — ' + await page.inputValue(gm));
  await page.fill(gm, '250-350');
  const traco = await page.inputValue(gm);
  await page.fill(gm, '250,350');
  ok(traco === '250 a 350' && (await page.inputValue(gm)) === '250 a 350', 'dois números, com traço ou vírgula, viram o intervalo "250 a 350"');
  await page.fill(gm, '');
  await page.type(gm, '250 ');
  const aberto = await page.inputValue(gm);
  await page.keyboard.type('350');
  const fechado = await page.inputValue(gm);
  for (let i = 0; i < 3; i++) await page.keyboard.press('Backspace');
  const apagado = await page.inputValue(gm);
  await page.keyboard.press('Backspace');
  ok(aberto === '250 a ' && fechado === '250 a 350' && apagado === '250 a ' && (await page.inputValue(gm)) === '250', 'digitando: o espaço abre o " a ", e apagar volta ao valor só — ' + JSON.stringify([aberto, fechado, apagado, await page.inputValue(gm)]));
  ok((await page.getAttribute(gm, 'inputmode')) === 'decimal', 'o teclado de números com a vírgula, para o intervalo também no iPhone');
  await page.fill(gm, '300');
  // O exemplo fica só dentro do campo, em intervalo (regra 175; era a regra 172).
  ok((await page.getAttribute('[data-cat-valor="adulto:grupo:avulsa"]', 'placeholder')) === 'ex.: 60 a 80' && (await page.getAttribute('[data-cat-valor="adulto:individual:mensal"]', 'placeholder')) === 'ex.: 130 a 170', 'cada valor vazio mostra o exemplo em intervalo ("ex.: 60 a 80"); o da mensal, por aula, abaixo da avulsa');
  ok(!(await page.$('[data-cat-exemplo]')) && !/Exemplo:|Na ficha:/.test(await texto(page, '[data-cat-bloco="adulto"]')), 'nada escrito embaixo dos valores');

  // As crianças: uma faixa de idade para cada turma.
  await page.click('[data-cat-publico="crianca"]');
  ok(await page.$('[data-cat-bloco="f1"]') && (await texto(page, '[data-cat-bloco="f1"] .cat-bloco-n')) === 'Aulas para crianças' && !(await page.$('[data-cat-faixa-tirar]')), '"Crianças" abre a primeira faixa de idade, sem o ✕ (é a única)');
  const idade = await page.evaluate(() => {
    const el = document.querySelector('[data-cat-bloco="f1"] .cat-idade');
    const sel = [...el.querySelectorAll('select')];
    return { t: [...el.childNodes].map(n => n.tagName === 'SELECT' ? '[ ]' : n.textContent).join('').replace(/\s+/g, ' ').trim(), de: [...sel[0].options].map(o => o.value).join(',') };
  });
  ok(idade.t === 'Idade de [ ] a [ ] anos' && idade.de === ',' + Array.from({ length: 15 }, (_, i) => i + 3).join(','), 'a idade: "de … a … anos", de 3 a 17 — ' + JSON.stringify(idade));
  ok((await texto(page, '[data-cat-copiar="f1"]')) === 'Copiar das aulas para adultos', 'a faixa sem formato oferece "Copiar das aulas para adultos"');
  await page.click('[data-cat-copiar="f1"]');
  ok((await chipsDe(page, '[data-cat-bloco="f1"] [data-cat-formato]')) === '✓Individual,Dupla,✓Grupo' && (await grade(page, 'f1')) === 'individual=150/520 grupo=·/300' && !(await page.$('[data-cat-copiar]')), '"Copiar" traz os mesmos formatos e valores, para ajustar — ' + await grade(page, 'f1'));
  ok((await texto(page, '[data-cat-opcao="f1:grupo"] .cat-opcao-n')) === 'Aula infantil em grupo valor por pessoa', 'o cartão das crianças diz "Aula infantil"');
  ok((await texto(page, '[data-cat-bloco="f1"] .cat-idade + .cat-exemplo')) === 'Exemplo: de 6 a 12 anos', 'sem idade escolhida, o exemplo da idade');
  await page.selectOption('[data-cat-idade="f1:de"]', '12');
  await page.selectOption('[data-cat-idade="f1:ate"]', '6');
  await page.waitForTimeout(150);
  ok((await page.inputValue('[data-cat-idade="f1:de"]')) === '6' && (await page.inputValue('[data-cat-idade="f1:ate"]')) === '12', '"de 12 a 6" vira "de 6 a 12"');
  await page.fill('[data-cat-valor="f1:individual:avulsa"]', '110');
  await page.fill('[data-cat-valor="f1:individual:mensal"]', '');
  await page.fill('[data-cat-valor="f1:grupo:mensal"]', '220');
  ok((await texto(page, '[data-cat-faixa-mais]')) === 'Adicionar faixa de idade', 'o botão da outra turma diz "Adicionar faixa de idade"');
  await page.click('[data-cat-faixa-mais]');
  ok(await page.$('[data-cat-bloco="f2"]') && await page.evaluate(() => document.activeElement?.dataset.catIdade === 'f2:de') && (await page.$$('[data-cat-faixa-tirar]')).length === 2, '"Adicionar faixa de idade" abre a segunda faixa, com o cursor na idade, e cada faixa ganha o ✕');
  await page.selectOption('[data-cat-idade="f2:de"]', '13');
  await page.selectOption('[data-cat-idade="f2:ate"]', '17');
  await page.click('[data-cat-formato="f2:grupo"]');
  await page.fill('[data-cat-valor="f2:grupo:mensal"]', '250');
  // Tirar um formato e trazer de novo não perde o valor escrito.
  await page.click('[data-cat-formato="adulto:grupo"]');
  ok((await grade(page, 'adulto')) === 'individual=150/520', 'tirar o formato tira o cartão');
  await page.click('[data-cat-formato="adulto:grupo"]');
  ok((await grade(page, 'adulto')) === 'individual=150/520 grupo=·/300', 'e trazer de novo volta com o valor — ' + await grade(page, 'adulto'));

  // A locação, numa parte só dela, que aparece só para quem escolheu a locação (regra 170).
  ok(!(await page.$('.reg-secoes [data-reg-passo="3"]')), 'a academia que só dá aula não tem a parte Locação');
  await irParte(page, 'modalidades');
  await page.click('[data-reg-mod="locacao"]');
  await irParte(page, 'locacao');
  ok((await texto(page, '.reg-passo .field-label')) === 'Como vocês alugam a quadra?', 'na locação, a pergunta no mesmo tom');
  ok((await texto(page, '.reg-titulo')) === 'Locação de quadra' && (await chipsDe(page, '[data-cat-cobranca]')) === 'Avulsa,Mensal' && !(await page.$('#cat-tabela-locacao [data-cat-opcao]')), 'marcando Locação nas Modalidades, a parte Locação aparece, com a escolha: avulsa ou mensal');
  await page.click('[data-cat-cobranca="avulsa"]');
  ok(await page.evaluate(() => document.activeElement?.dataset.catValor === 'locacao:avulsa') && (await texto(page, '[data-cat-opcao="locacao:avulsa"]')).startsWith('Locação avulsa Valor por hora R$') && (await texto(page, '[data-cat-opcao="locacao:avulsa"]')).includes('Foto da quadra'), 'a avulsa abre o cartão: o valor por hora e a foto');
  ok((await page.getAttribute('[data-cat-valor="locacao:avulsa"]', 'placeholder')) === 'ex.: 100 a 150' && !(await page.$('[data-cat-exemplo]')), 'na locação, o exemplo do valor por hora, só dentro do campo');
  await page.fill('[data-cat-valor="locacao:avulsa"]', '130');
  ok(await page.evaluate(() => window.__form.modalidades.join()) === 'aulas_proprias,locacao', 'a modalidade acompanha: aula e locação');

  await irParte(page, 'revisar');
  const previa = await texto(page, '.reg-previa [data-previa="precos"]');
  ok(previa.includes('Aula infantil em grupo') && previa.includes('Mostrando 7 de 7 opções'), 'a prévia já mostra o catálogo — ' + previa.slice(0, 140));
  await salvarFicha(page);
  await page.waitForTimeout(500);
  if (await page.$('.reg-plano-basico')) { await page.click('.reg-plano-basico'); await page.waitForTimeout(800); }
  let banco = await page.evaluate(() => { const a = window.__db.academias.find(x => x.id === 'a1'); return { cat: a.catalogo, aula: a.price_aula, loc: a.price_locacao, mods: a.modalidades }; });
  ok(Array.isArray(banco.cat) && JSON.stringify(banco.cat) === JSON.stringify([
    { tipo: 'individual', cobranca: 'avulsa', preco: '150' }, { tipo: 'individual', cobranca: 'mensal', preco: '520' },
    { tipo: 'grupo', cobranca: 'mensal', preco: '300' },
    { tipo: 'individual', cobranca: 'avulsa', preco: '110', publico: 'crianca', idadeDe: 6, idadeAte: 12 },
    { tipo: 'grupo', cobranca: 'mensal', preco: '220', publico: 'crianca', idadeDe: 6, idadeAte: 12 },
    { tipo: 'grupo', cobranca: 'mensal', preco: '250', publico: 'crianca', idadeDe: 13, idadeAte: 17 },
    { tipo: 'locacao', cobranca: 'avulsa', preco: '130' }]), 'vai para o banco o que tem valor, com a idade de cada faixa, na ordem do catálogo; o que ficou em branco não vai — ' + JSON.stringify(banco.cat));
  ok(banco.aula === '150' && banco.loc === '130' && banco.mods.join() === 'aulas_proprias,locacao', 'o preço da aula sai das avulsas de adultos (a infantil não entra), e o da locação, das avulsas dela — ' + banco.aula + ' / ' + banco.loc);
  ok(await page.evaluate(() => !!document.querySelector('#register-overlay.reg-pronto-fundo .reg-pronto') && !document.getElementById('register-close-2')), 'salvou: o cartão de "Alterações salvas", com um X só');
  await browser.close();

  // ---- sem valor: "Sob consulta" ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha' }));
  await page.waitForTimeout(400);
  await page.evaluate(async (cat) => { window.__db.academias.find(x => x.id === 'a1').catalogo = cat; await loadEverything(); render(); }, CATALOGO);
  await page.click('.editar-academia');
  await page.waitForTimeout(400);
  await irParte(page, 'precos');
  ok((await chipsDe(page, '[data-cat-publico]')) === '✓Adultos,✓Crianças' && (await grade(page, 'adulto')) === 'individual=150/· dupla=90/· grupo=·/300' && (await grade(page, 'f1')) === 'individual=110/· grupo=·/220' && (await grade(page, 'f2')) === 'grupo=·/250', 'a ficha salva volta para o caminho: adultos e as duas faixas, da mais nova para a mais velha — ' + await grade(page, 'f1') + ' | ' + await grade(page, 'f2'));
  ok((await page.inputValue('[data-cat-idade="f1:de"]')) === '6' && (await page.inputValue('[data-cat-idade="f2:ate"]')) === '17', 'com a idade de cada faixa');
  await page.click('[data-cat-faixa-tirar="f2"]');
  ok(!(await page.$('[data-cat-bloco="f2"]')), 'o ✕ tira a faixa');
  await page.fill('[data-cat-valor="f1:individual:avulsa"]', '');
  await page.fill('[data-cat-valor="adulto:dupla:avulsa"]', '');
  await irParte(page, 'modalidades');
  await page.click('[data-reg-mod="locacao"]');
  await irParte(page, 'locacao');
  await page.click('[data-cat-cobranca="mensal"]');
  ok((await texto(page, '[data-cat-opcao="locacao:mensal"]')).startsWith('Locação mensal Valor por hora R$') && (await page.getAttribute('[data-cat-valor="locacao:mensal"]', 'placeholder')) === 'ex.: 80 a 120', 'a locação mensal também por hora, com o exemplo abaixo do da avulsa (regra 183)');
  await irParte(page, 'revisar');
  await salvarFicha(page);
  await page.waitForTimeout(500);
  if (await page.$('.reg-plano-basico')) { await page.click('.reg-plano-basico'); await page.waitForTimeout(800); }
  banco = await page.evaluate(() => window.__db.academias.find(x => x.id === 'a1').catalogo.map(i => `${i.publico ? 'crianca:' : ''}${i.tipo}:${i.cobranca || 'sem cobrança'}=${i.preco || 'consulta'}`).join(' '));
  ok(banco === 'individual:avulsa=150 dupla:sem cobrança=consulta grupo:mensal=300 crianca:individual:sem cobrança=consulta crianca:grupo:mensal=220 locacao:avulsa=130 locacao:mensal=consulta', 'sem valor nenhum, a aula vai sob consulta, sem a cobrança; a locação mensal sem valor, sob consulta — ' + banco);
  await page.evaluate(() => { state.page = 'court'; state.selected = decorate(state.allCourts.find(x => x.id === 'a1')); render(); });
  await page.waitForTimeout(300);
  const consulta = await page.evaluate(() => [...document.querySelectorAll('#ht-quartos .ht-quarto')].map(x => x.innerText.replace(/\s+/g, ' ')));
  const dupla = consulta.find(x => x.startsWith('Aula em dupla')) || '', locMensal = consulta.find(x => x.includes('Plano mensal') && x.includes('Aluguel da quadra')) || '';
  ok(dupla.includes('Sob consulta') && !dupla.includes('Aula avulsa') && !dupla.includes('Plano mensal'), 'na ficha, a aula sem valor diz "Sob consulta", sem inventar a cobrança — ' + dupla);
  ok(locMensal.includes('Sob consulta'), 'e a locação mensal sem valor também — ' + locMensal);
  const waDupla = await page.evaluate(() => decodeURIComponent([...document.querySelectorAll('#ht-quartos .ht-quarto')].find(x => x.innerText.startsWith('Aula em dupla')).querySelector('.ht-quarto-bt').getAttribute('href')));
  ok(waDupla.includes('queria saber sobre a aula em dupla.'), 'o WhatsApp pergunta da aula, sem a cobrança — ' + waDupla.split('text=')[1]);
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
  ok(nomes.join(',') === 'Aula individual,Aula em dupla,Aula em grupo,Aula infantil individual,Aula infantil em grupo,Aula infantil em grupo,Locação', 'um cartão por opção, na ordem do catálogo (as das crianças depois das de adultos, da faixa mais nova para a mais velha), sem repetir — ' + nomes.join(','));
  const chips = await page.evaluate(() => [...document.querySelectorAll('#ht-opcoes-filtro .chip')].map(b => b.innerText.trim()).join(','));
  ok(chips === 'Todas,Individual,Dupla,Grupo,Crianças,Locação,Avulsas,Mensais' && await page.$('.ht-opcoes-sep'), 'filtros por tipo (as aulas das crianças juntas, em "Crianças") e por cobrança — ' + chips);
  const grupo = await page.evaluate(() => {
    const c = [...document.querySelectorAll('#ht-quartos .ht-quarto')][2];
    return { t: c.innerText.replace(/\s+/g, ' '), wa: decodeURIComponent(c.querySelector('.ht-quarto-bt').getAttribute('href')), menor: !!document.querySelector('.ht-quarto-tag') };
  });
  ok(grupo.t.includes('Plano mensal') && grupo.t.includes('Turma com o professor') && grupo.t.includes('R$ 300') && grupo.t.includes('por pessoa, por aula') && !grupo.t.includes('por mês') && !/por semana|alunos|iniciantes|hora de aula|999/.test(grupo.t), 'o cartão da turma: só a modalidade e o valor — ' + grupo.t);
  ok(grupo.wa.includes('queria saber sobre o plano mensal de aula em grupo.'), 'o WhatsApp já abre sobre aquela opção — ' + grupo.wa.split('text=')[1]);
  ok(!grupo.menor, 'sem "Menor preço": avulsa e mensal não se comparam');
  const infantil = await page.evaluate(() => {
    const c = [...document.querySelectorAll('#ht-quartos .ht-quarto')][4];
    return { t: c.innerText.replace(/\s+/g, ' '), wa: decodeURIComponent(c.querySelector('.ht-quarto-bt').getAttribute('href')) };
  });
  ok(infantil.t.includes('Aula infantil em grupo') && infantil.t.includes('Plano mensal') && infantil.t.includes('Turma de crianças com o professor') && infantil.t.includes('De 6 a 12 anos') && infantil.t.includes('R$ 220') && infantil.t.includes('por pessoa, por aula'), 'o cartão da aula das crianças: o formato, a idade e o valor — ' + infantil.t);
  ok(infantil.wa.includes('queria saber sobre o plano mensal de aula infantil em grupo.'), 'o WhatsApp da aula das crianças — ' + infantil.wa.split('text=')[1]);
  const loc = await page.evaluate(() => [...document.querySelectorAll('#ht-quartos .ht-quarto')][6].innerText.replace(/\s+/g, ' '));
  const maiores = await page.evaluate(() => [...document.querySelectorAll('#ht-quartos .ht-quarto')][5].innerText.replace(/\s+/g, ' '));
  ok(maiores.includes('De 13 a 17 anos') && maiores.includes('R$ 250'), 'a outra faixa de idade no seu cartão — ' + maiores);
  const individual = await page.evaluate(() => [...document.querySelectorAll('#ht-quartos .ht-quarto')][0].innerText.replace(/\s+/g, ' '));
  ok(loc.includes('Locação avulsa') && loc.includes('Aluguel da quadra') && !loc.includes('1h30') && loc.includes('por hora') && loc.includes('Reposição até 12h antes') && individual.includes('Reposição até 24h antes'), 'a locação: avulsa, por hora (a duração de antes não aparece), com a reposição da locação (a aula, com a da aula) — ' + loc);

  await page.click('#ht-opcoes-filtro [data-opcao-filtro="Crianças"]');
  ok((await cartoes()).join(',') === 'Aula infantil individual,Aula infantil em grupo,Aula infantil em grupo', '"Crianças" mostra só as aulas das crianças, das duas faixas');
  await page.click('#ht-opcoes-filtro [data-opcao-cobranca="mensal"]');
  nomes = await cartoes();
  ok(nomes.join(',') === 'Aula infantil em grupo,Aula infantil em grupo' && (await texto(page, '.ht-opcoes-n')) === 'Mostrando 2 de 7 opções', '"Crianças" e "Mensais" juntos');
  await page.click('#ht-opcoes-filtro [data-opcao-filtro="Individual"]');
  ok((await texto(page, '.ht-opcoes-vazio')).startsWith('A academia não tem aula individual mensal no catálogo.'), 'individual e mensal, sem opção: diz que não tem e oferece "Ver todas"');
  await page.click('.ht-opcoes-vazio [data-opcao-filtro]');
  ok((await cartoes()).length === 7, '"Ver todas" volta às sete opções');
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
  ok(curtos === 'por aula individual | por pessoa, na dupla | por pessoa, na turma, no plano mensal | por aula individual infantil | por pessoa, na turma infantil, no plano mensal | por pessoa, na turma infantil, no plano mensal | por hora de quadra', 'o rótulo curto de cada opção — ' + curtos);
  ok(resumo.sobre.includes('No catálogo da academia: aula individual a partir de R$ 150 por aula; aula em dupla a partir de R$ 90 por pessoa, por aula; aula em grupo a partir de R$ 300 por pessoa, por aula, no plano mensal; aula infantil a partir de R$ 110 por aula; e locação a partir de R$ 130 por hora. Também há planos mensais.'), 'o "Sobre" resume o catálogo, com as aulas das crianças juntas — ' + resumo.sobre);
  ok(resumo.faq.includes('Que aulas Só Aula Tennis tem? Aula individual, em dupla e em grupo, avulsas e em planos mensais.') && resumo.faq.includes('Aula em grupo mensal: R$ 300 por pessoa, por aula'), 'as perguntas frequentes com os tipos de aula e os valores');
  ok(resumo.faq.includes('Só Aula Tennis tem aula de tênis para crianças? Sim: aula infantil individual e em grupo, avulsas e em planos mensais, para crianças de 6 a 12 anos e de 13 a 17 anos.') && resumo.faq.includes('Aula infantil em grupo mensal: R$ 220 por pessoa, por aula'), 'e a pergunta das aulas para crianças, com a idade — ' + resumo.faq.split(' | ').find(x => x.includes('crianças')));
  const ofertas = resumo.ld && resumo.ld.hasOfferCatalog.itemListElement;
  ok(ofertas && ofertas.length === 7 && ofertas[0].name === 'Aula individual avulsa' && ofertas[0].description === 'Aula avulsa · Você e o professor' && ofertas[0].priceSpecification.price === 150 && ofertas[0].priceSpecification.priceCurrency === 'BRL' && ofertas[0].priceSpecification.unitText === 'por aula', 'o Google lê o catálogo (hasOfferCatalog) — ' + JSON.stringify(ofertas && ofertas[0]));
  ok(ofertas && ofertas[4].name === 'Aula infantil em grupo mensal' && ofertas[4].description === 'Plano mensal · Turma de crianças com o professor · De 6 a 12 anos', 'e a aula das crianças, com a idade — ' + JSON.stringify(ofertas && ofertas[4]));

  // No computador, o cartão da direita: o "a partir de" de cada tipo.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(200);
  const aside = await page.evaluate(() => document.querySelector('.ht-aside .ht-book').textContent.replace(/\s+/g, ' ').trim());
  ok(aside.startsWith('A partir de Aula individual R$ 150/aula Aula em dupla R$ 90/aula Aula em grupo R$ 300/aula Aula infantil R$ 110/aula Locação R$ 130/h Ver as 7 opções'), 'no computador, o "a partir de" de cada tipo (as aulas das crianças numa linha) e o atalho para as opções — ' + aside.slice(0, 160));
  await page.click('.ht-book-ver');
  await page.waitForTimeout(500);
  const topo = await page.evaluate(() => document.getElementById('ht-opcoes').getBoundingClientRect().top);
  ok(topo < 300, '"Ver as 7 opções" leva às opções — ' + Math.round(topo));
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
  await irParte(page, 'locacao');
  ok((await chipsDe(page, '[data-cat-cobranca]')) === '✓Avulsa,Mensal' && (await grade(page, 'cat-tabela-locacao')) === 'avulsa=100 a 120', 'o preço por hora de antes aparece na locação avulsa, como intervalo — ' + await grade(page, 'cat-tabela-locacao'));
  // A aula do preço antigo, sem formato: a linha "Aula", com a dica de escrever no formato certo.
  await page.evaluate(() => { state.regForm = null; abrirEdicaoDaFicha({ ...state.allCourts.find(x => x.id === 'a1'), priceAula: '120', catalogo: [] }); });
  await page.waitForTimeout(300);
  await irParte(page, 'precos');
  ok((await grade(page, 'adulto')) === 'aula=120/·' && (await texto(page, '.cat-tipo-dica')).startsWith('É o preço de antes, sem o formato'), 'a aula do preço antigo aparece como "Aula", com a dica de escrever no formato certo — ' + await grade(page, 'adulto'));
  await page.click('[data-cat-formato="adulto:individual"]');
  await page.fill('[data-cat-valor="adulto:individual:avulsa"]', '120');
  await page.fill('[data-cat-valor="adulto:aula:avulsa"]', '');
  ok(await page.evaluate(() => JSON.stringify(window.__form.catalogo)) === JSON.stringify([{ tipo: 'individual', cobranca: 'avulsa', preco: '120' }]), 'com o valor no formato certo e o de "Aula" apagado, o catálogo fica só com o formato');
  // O intervalo vai para o banco com o menor primeiro (regra 175).
  await page.fill('[data-cat-valor="adulto:individual:avulsa"]', '180 a 120');
  ok(await page.evaluate(() => JSON.stringify(window.__form.catalogo)) === JSON.stringify([{ tipo: 'individual', cobranca: 'avulsa', preco: '120-180' }]) && await page.evaluate(() => precoTexto(window.__form.catalogo[0].preco)) === 'R$ 120 a 180', 'o intervalo "180 a 120" vai como "120-180" e aparece "R$ 120 a 180" — ' + await page.evaluate(() => JSON.stringify(window.__form.catalogo)));
  await page.fill('[data-cat-valor="adulto:individual:avulsa"]', '150 a 150');
  ok(await page.evaluate(() => window.__form.catalogo[0].preco) === '150', 'os dois números iguais ficam um valor só');
  await browser.close();

  // ---- banco ainda sem a coluna ----
  ({ browser, page } = await abrir({ academia: 'a1', semCatalogo: true, q: 'parceiros/ficha' }));
  await page.waitForTimeout(400);
  await page.click('.editar-academia');
  await page.waitForTimeout(400);
  await irParte(page, 'precos');
  await page.click('[data-cat-publico="adulto"]');
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
  await page.click('[data-cat-publico="adulto"]');
  ok(!(await page.$('[data-cat-foto]')), 'sem formato escolhido, sem campo de foto');
  await page.click('[data-cat-formato="adulto:grupo"]');
  await page.fill('[data-cat-valor="adulto:grupo:avulsa"]', '80');
  await page.fill('[data-cat-valor="adulto:grupo:mensal"]', '300');
  ok((await texto(page, '[data-cat-opcao="adulto:grupo"] .cat-foto-bt')) === 'Foto desta aula', 'no Premium, o cartão de cada aula tem a própria foto, sem etiqueta — ' + await texto(page, '[data-cat-opcao="adulto:grupo"] .cat-foto-bt'));
  await page.setInputFiles('[data-cat-foto="adulto:grupo"]', PNG);
  await page.waitForFunction(() => !!document.querySelector('[data-cat-opcao="adulto:grupo"] .cat-foto img'));
  ok((await page.inputValue('[data-cat-valor="adulto:grupo:mensal"]')) === '300', 'a foto entra sem perder o valor escrito');
  await page.click('#enq-concluir');
  await page.waitForTimeout(400);
  // A locação: a avulsa e a mensal, cada uma com a própria foto.
  await irParte(page, 'modalidades');
  await page.click('[data-reg-mod="locacao"]');
  await irParte(page, 'locacao');
  await page.click('[data-cat-cobranca="avulsa"]');
  await page.click('[data-cat-cobranca="mensal"]');
  await page.fill('[data-cat-valor="locacao:avulsa"]', '130');
  await page.fill('[data-cat-valor="locacao:mensal"]', '900');
  await page.setInputFiles('[data-cat-foto="locacao:avulsa"]', PNG);
  await page.waitForSelector('#enq-concluir');
  await page.click('#enq-concluir');
  await page.waitForTimeout(400);
  const PNG2 = { name: 'quadra.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mNk+M9QzwAEjDAGNzYAAEuEBADyJgzLAAAAAElFTkSuQmCC', 'base64') };
  await page.setInputFiles('[data-cat-foto="locacao:mensal"]', PNG2);
  await page.waitForSelector('#enq-concluir');
  await page.click('#enq-concluir');
  await page.waitForTimeout(400);
  ok((await page.$$('#cat-tabela-locacao .cat-foto img')).length === 2, 'na locação, a avulsa e a mensal com a foto de cada uma');
  await irParte(page, 'revisar');
  await salvarFicha(page);
  await page.waitForTimeout(700);
  banco = await page.evaluate(() => window.__db.academias.find(x => x.id === 'a1').catalogo || []);
  ok(banco.length === 4 && banco[0].tipo === 'grupo' && /^data:image\/jpeg;base64,/.test(banco[0].foto || '') && banco[0].preco === '80' && banco[1].preco === '300' && !banco[1].foto, 'a foto da aula (diminuída) vai para o banco uma vez só, no primeiro item dela — ' + JSON.stringify(banco.map(i => ({ ...i, foto: !!i.foto }))));
  ok(banco[2].tipo === 'locacao' && banco[3].tipo === 'locacao' && banco[2].foto && banco[3].foto && banco[2].foto !== banco[3].foto, 'e a locação avulsa e a mensal, cada uma com a sua');
  const fotoDaAula = banco[0].foto;
  await page.evaluate(() => { state.page = 'court'; state.selected = decorate(state.allCourts.find(x => x.id === 'a1')); render(); });
  await page.waitForTimeout(300);
  let srcs = await page.evaluate(() => [...document.querySelectorAll('#ht-quartos .ht-quarto-foto img')].map(x => x.getAttribute('src') || ''));
  ok(srcs.length === 4 && srcs[0] === fotoDaAula && srcs[1] === fotoDaAula && srcs[2] !== srcs[3], 'na ficha da academia Premium, a avulsa e a mensal da aula mostram a foto dela; a locação, uma foto para cada');
  const unidades = await page.evaluate(() => [...document.querySelectorAll('#ht-quartos .ht-quarto-unit')].map(x => x.innerText.trim()).join(' | '));
  ok(unidades === 'por pessoa, por aula | por pessoa, por aula | por hora | por hora', 'a mensal paga o mesmo que a avulsa: a aula por aula (regra 182), a locação por hora (regra 183) — ' + unidades);
  const curtosLoc = await page.evaluate(() => opcoesPreco(state.selected).filter(o => o.grupo === 'locacao').map(o => rotuloCurto(o) + ' ' + o.curto).join(' | '));
  ok(curtosLoc === 'por hora de quadra /h | por hora de quadra, no plano mensal /h', 'a locação mensal: por hora, no plano mensal — ' + curtosLoc);
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
  const fora = await texto(page, '[data-cat-opcao="adulto:grupo"] .cat-foto');
  ok(fora.includes('Aparece no Premium') && await page.$('[data-cat-opcao="adulto:grupo"] .cat-foto img'), 'a foto guardada continua no cadastro, com "Aparece no Premium" — ' + fora);
  await irParte(page, 'revisar');
  await salvarFicha(page);
  await page.waitForTimeout(600);
  const esconde = await texto(page, '#register-overlay');
  ok(esconde.includes('A foto do catálogo') && esconde.includes('No Premium, cada opção de aula e locação mostra a própria foto na ficha.'), 'ao salvar fora do Premium, o que o plano esconde inclui a foto do catálogo');
  await browser.close();
})();
