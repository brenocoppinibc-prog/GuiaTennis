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
    const falta = regFaltas(f, 'projeto');
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

  // Regra 327: "academia também oferece com essas opções devem aparecer outras
  // páginas igual as aulas e locações"; "é chato o teclado abrir a todo momento
  // que seleciona a categoria"; "se a página estiver toda completa e clicar no
  // enter, passar para a próxima etapa"; o "Corrigir" leva ao campo exato.
  const c2 = await abrir({ academia: 'a1', q: 'parceiros/ficha' });
  const p2 = c2.page;
  await p2.waitForTimeout(400);
  await p2.click('.editar-academia');
  await p2.waitForTimeout(400);
  await p2.evaluate(() => irParaPasso(REG_PASSOS.findIndex(x => x.id === 'modalidades'), false));
  const antes = await p2.evaluate(() => passosVisiveis(window.__form).map(x => x.passo.id).join());
  for (const k of ['eventos', 'ranking', 'projeto_social']) { await p2.click(`[data-reg-extra="${k}"]`); await p2.waitForTimeout(120); }
  r = await p2.evaluate(() => ({
    abas: [...document.querySelectorAll('.reg-secoes button')].map(b => b.innerText.replace('✓ ', '')),
    noModalidades: !!document.querySelector('.reg-passo #f-projeto-social, .reg-passo [data-cat-valor^="extra:"]'),
    foco: document.activeElement && document.activeElement.matches('input, textarea') ? document.activeElement.id || document.activeElement.dataset.catValor : '',
  }));
  ok(!/eventos|ranking|projeto/.test(antes) && ['Eventos', 'Ranking', 'Projeto social'].every(t => r.abas.includes(t)) && r.abas.indexOf('Eventos') === r.abas.indexOf('Aulas') + 1 && r.abas.indexOf('Ranking') === r.abas.indexOf('Eventos') + 1 && r.abas.indexOf('Quadras') === r.abas.indexOf('Projeto social') + 1,
    'marcados, Eventos, Ranking e Projeto social ganham a sua parte depois das Aulas e da Locação — ' + r.abas.join(' · '));
  ok(!r.noModalidades && !r.foco, 'nas Modalidades fica só a escolha, sem campo e sem cursor (o teclado não abre) — ' + JSON.stringify(r));
  await p2.evaluate(() => irParaPasso(REG_PASSOS.findIndex(x => x.id === 'eventos'), false));
  r = await p2.evaluate(() => ({ t: document.querySelector('.reg-titulo').innerText, valor: !!document.querySelector('[data-cat-valor="extra:eventos:avulsa"]'), porque: document.querySelector('.reg-porque').innerText }));
  ok(r.t === 'Locação para eventos' && r.valor, 'a parte Locação para eventos, com o valor — ' + r.porque);
  // Enter com a parte completa: a próxima parte.
  await p2.fill('[data-cat-valor="extra:eventos:avulsa"]', '800');
  await p2.press('[data-cat-valor="extra:eventos:avulsa"]', 'Enter');
  await p2.waitForTimeout(250);
  ok(await p2.evaluate(() => regPassoAtual().passo.id) === 'ranking', 'Enter com a parte completa passa para a próxima (Ranking)');
  // Enter num campo com outro vazio depois: vai para ele, como o "Próximo" do teclado.
  await p2.fill('[data-cat-valor="extra:ranking:avulsa"]', '30');
  await p2.press('[data-cat-valor="extra:ranking:avulsa"]', 'Enter');
  await p2.waitForTimeout(150);
  r = await p2.evaluate(() => ({ passo: regPassoAtual().passo.id, foco: document.activeElement.dataset.catValor, dica: document.querySelector('[data-cat-valor="extra:ranking:avulsa"]').getAttribute('enterkeyhint') }));
  ok(r.passo === 'ranking' && r.foco === 'extra:ranking:mensal' && r.dica === 'next', 'com outro campo vazio, o Enter vai para ele (o teclado mostra "Próximo") — ' + JSON.stringify(r));
  await p2.press('[data-cat-valor="extra:ranking:mensal"]', 'Enter');
  await p2.waitForTimeout(250);
  ok(await p2.evaluate(() => regPassoAtual().passo.id) === 'projeto', 'e o último campo segue para o Projeto social');
  // Sem o texto: "Continuar" não passa e o "Corrigir" leva ao campo.
  await p2.click('#reg-continuar');
  await p2.waitForTimeout(200);
  r = await p2.evaluate(() => ({ push: document.querySelector('.gt-push.gt-escolha')?.innerText || '', passo: regPassoAtual().passo.id }));
  ok(r.passo === 'projeto' && /Falta preencher: como funciona o projeto social\./.test(r.push), 'sem o texto, não passa: "Falta preencher: como funciona o projeto social." — ' + r.push.replace(/\n/g, ' '));
  await p2.evaluate(() => { const b = [...document.querySelectorAll('.gt-push.gt-escolha button')].find(x => x.innerText === 'Corrigir'); b.click(); });
  await p2.waitForTimeout(400);
  ok(await p2.evaluate(() => document.activeElement && document.activeElement.id) === 'f-projeto-social', '"Corrigir" leva ao campo do projeto social, com o cursor nele');
  await p2.fill('#f-projeto-social', 'Aulas gratuitas para crianças de 8 a 14 anos.');
  // A revisão mostra "Também oferece", e o lápis leva à parte dele.
  await p2.evaluate(() => irParaPasso(REG_PASSOS.length - 1, false));
  await p2.waitForTimeout(200);
  r = await p2.evaluate(() => { const s = document.querySelector('.reg-previa #ht-oferece')?.closest('.reg-previa-sec'); return { tem: !!s, lapis: s && REG_PASSOS[Number(s.querySelector('.reg-previa-lapis').dataset.regPasso)].id }; });
  ok(r.tem && r.lapis === 'eventos', 'na revisão, "Também oferece", com o lápis na parte dele — ' + JSON.stringify(r));
  // Desmarcar tira a parte.
  await p2.evaluate(() => irParaPasso(REG_PASSOS.findIndex(x => x.id === 'modalidades'), false));
  await p2.click('[data-reg-extra="ranking"]');
  await p2.waitForTimeout(120);
  ok(!(await p2.evaluate(() => passosVisiveis(window.__form).some(x => x.passo.id === 'ranking'))), 'desmarcado, o Ranking sai das partes');
  // No celular, escolher um formato das aulas não abre o teclado.
  await p2.evaluate(() => { window.matchMedia = (q) => ({ matches: /pointer: coarse/.test(q), addEventListener() {}, removeEventListener() {} }); });
  r = await p2.evaluate(() => telaDeToque());
  ok(r === true, 'telaDeToque() reconhece o celular');
  await c2.browser.close();

  // Regra 327: o código completo confirma sozinho (fora dos testes automáticos).
  const c3 = await abrir({ jogador: true, q: 'perfil' });
  const p3 = c3.page;
  await p3.waitForTimeout(300);
  r = await p3.evaluate(async () => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    const caixa = document.createElement('div');
    caixa.innerHTML = caixasDeCodigo(6, '', '', 'Código') + `<button type="button" ${travaDoCodigo(6, '')}>Confirmar</button>`;
    document.body.appendChild(caixa);
    let cliques = 0;
    caixa.querySelector('button').onclick = () => cliques++;
    const campo = caixa.querySelector('.otp-campo');
    campo.value = '12345'; campo.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 350));
    const comCinco = cliques;
    campo.value = '123456'; campo.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 350));
    const comSeis = cliques;
    campo.value = '1234567'; campo.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 350));
    return { comCinco, comSeis, depois: cliques };
  });
  ok(r.comCinco === 0 && r.comSeis === 1 && r.depois === 1, 'o código completo confirma sozinho, uma vez só — ' + JSON.stringify(r));
  await c3.browser.close();
})();
