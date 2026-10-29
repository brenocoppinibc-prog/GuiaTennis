// Pedido do Breno em 29/10/2026 (regra 180): "quero que implemente a aba
// pagamentos e email, quero que o principal consiga definir alguém como
// principal também e funções que outros acessos pode fazer". As funções de
// cada pessoa da equipe em Acessos, mais de um responsável principal, o menu
// e as páginas conforme a função e a aba Pagamentos com quem comprou.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((sel) => (document.querySelector(sel)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const chips = (page, uid) => page.evaluate((uid) => [...document.querySelectorAll(`[data-pc-funcao="${uid}"]`)].map(b => (b.getAttribute('aria-pressed') === 'true' ? '✓' : '') + b.innerText.trim()).join(','), uid);
const menu = (page) => page.evaluate(() => [...document.querySelectorAll('.pc-menu a, #pc-menu a, .menu-item[data-pc]')].map(a => a.dataset.pc).filter((v, i, t) => v && t.indexOf(v) === i).join(','));

(async () => {
  // ---- o responsável principal escolhe as funções e torna alguém principal ----
  let { browser, page } = await abrir({ academia: 'a1', completo: ['a1'], q: 'parceiros/acessos' });
  await page.waitForTimeout(300);
  await page.evaluate(async () => {
    window.__db.academia_acessos.push({ user_id: 'u-eq', academia_id: 'a1', usuario: 'carlos@quadra.com', nome_responsavel: 'Carlos Recepção', email: 'carlos@quadra.com', papel: 'equipe', dados_completos_em: '2026-10-01' });
    window.__db.academia_vinculos.push({ user_id: 'u-eq', academia_id: 'a1', papel: 'equipe' });
    await carregarPessoas();
  });
  await page.waitForTimeout(200);
  ok((await chips(page, 'u-eq')) === '✓Editar a ficha,✓Responder avaliações,✓Promoções e leilão,Pagamentos', 'quem entra na equipe começa com a ficha, as avaliações e as promoções; Pagamentos, o principal libera — ' + await chips(page, 'u-eq'));
  ok((await texto(page, '.pc-sec-sub')).includes('escolhe o que cada pessoa pode fazer'), 'o principal vê que escolhe o que cada pessoa faz');
  await page.click('[data-pc-funcao="u-eq"][data-funcao="pagamentos"]');
  await page.waitForTimeout(300);
  await page.click('[data-pc-funcao="u-eq"][data-funcao="ficha"]');
  await page.waitForTimeout(300);
  let r = await page.evaluate(() => ({ funcoes: window.__db.academia_vinculos.find(v => v.user_id === 'u-eq').funcoes.join(','), foco: document.activeElement?.dataset.funcao, rpc: window.__rpcs.filter(x => x.nome === 'mudar_funcoes_da_pessoa').length }));
  ok(r.funcoes === 'avaliacoes,promocoes,pagamentos' && (await chips(page, 'u-eq')) === 'Editar a ficha,✓Responder avaliações,✓Promoções e leilão,✓Pagamentos' && r.rpc === 2 && r.foco === 'ficha',
    'cada toque liga ou desliga a função e salva na hora, sem botão, com o cursor no mesmo lugar — ' + JSON.stringify(r));
  ok(!(await page.$('#pc-deixar-principal')), 'sozinho como principal, não aparece "Deixar de ser responsável principal"');
  page.once('dialog', d => { r.dialogo = d.message(); d.accept(); });
  await page.click('[data-pc-principal="u-eq"]');
  await page.waitForTimeout(400);
  const lista = await texto(page, '.pc-pessoas');
  ok(r.dialogo.startsWith('Tornar Carlos Recepção responsável principal da') && r.dialogo.includes('só o GuiaTennis tira esse papel'), 'tornar principal pede confirmação e diz o que muda — ' + r.dialogo.slice(0, 80));
  ok(await page.evaluate(() => window.__db.academia_vinculos.find(v => v.user_id === 'u-eq').papel) === 'principal' && /Carlos Recepção carlos@quadra\.com · Responsável principal/.test(lista) && !(await page.$('[data-pc-funcao="u-eq"]')),
    'o principal torna alguém da equipe responsável principal (sem funções para escolher, pode tudo) — ' + lista.slice(0, 160));
  ok((await texto(page, '.conta-aviso')).includes('Carlos Recepção agora é responsável principal'), 'e o aviso diz que deu certo');
  ok(await page.$('#pc-deixar-principal') && !(await page.$('[data-pc-remover="u-eq"]')), 'com outro principal, aparece "Deixar de ser responsável principal"; o outro principal não tem "Remover"');
  page.once('dialog', d => d.accept());
  await page.click('#pc-deixar-principal');
  await page.waitForTimeout(500);
  r = await page.evaluate(() => ({ papel: window.__db.academia_vinculos.find(v => v.user_id === 'u-a1').papel, funcoes: (window.__db.academia_vinculos.find(v => v.user_id === 'u-a1').funcoes || []).join(','), principal: souPrincipal() }));
  ok(r.papel === 'equipe' && r.funcoes === 'ficha,avaliacoes,promocoes,pagamentos' && !r.principal && (await texto(page, '.pc-sec-sub')).startsWith('Você, na equipe'),
    'quem era principal volta para a equipe, com todas as funções — ' + JSON.stringify(r));
  ok((await texto(page, '.pc-pessoas')).includes('Pode: Editar a ficha, Responder avaliações, Promoções e leilão, Pagamentos') && !(await page.$('[data-pc-funcao]')), 'na equipe, vê o que pode fazer, sem mudar');
  await browser.close();

  // ---- a equipe só com Responder avaliações ----
  ({ browser, page } = await abrir({ academia: 'a1', completo: ['a1'], equipe: ['avaliacoes'], q: 'parceiros/painel' }));
  await page.waitForTimeout(400);
  let m = await page.evaluate(() => PC_MENU_LOGADO.filter(i => !i.funcao || posso(i.funcao)).map(i => i.aba).join(','));
  ok(m === 'painel,avaliacoes,desempenho,academias,pessoas,plano,perfil,ajuda', 'o menu mostra só o que a pessoa pode fazer — ' + m);
  ok(await page.evaluate(() => [...document.querySelectorAll('[data-pc]')].every(a => !['ficha', 'promocoes', 'pagamentos'].includes(a.dataset.pc) || !a.closest('nav, .menu, .pc-menu, .pc-rodape-cols'))), 'nem no menu nem no rodapé aparecem Minha ficha, Promoções e Pagamentos');
  await page.evaluate(() => irParceiros('ficha'));
  await page.waitForTimeout(200);
  let sem = await texto(page, '#parceiros .pc-main');
  ok(sem.startsWith('Minha ficha "Editar a ficha" não está liberado na sua conta. Quem libera é o responsável principal da academia, em Acessos.') && await page.$('.pc-sem-funcao [data-pc="pessoas"]'),
    'a página que não foi liberada diz qual função falta e onde se libera — ' + sem.slice(0, 140));
  await page.evaluate(() => irParceiros('creditos'));
  await page.waitForTimeout(200);
  ok((await texto(page, '#parceiros .pc-main')).includes('"Pagamentos" não está liberado'), 'a compra de créditos também pede Pagamentos');
  await page.evaluate(() => irParceiros('acessos'));
  await page.waitForTimeout(300);
  ok((await texto(page, '.pc-pessoas')).includes('Pode: Responder avaliações') && !(await page.$('[data-pc-funcao]')) && !(await page.$('[data-pc-principal]')), 'em Acessos, a equipe vê só o que pode, sem mexer');
  await page.evaluate(async () => {
    window.__db.avaliacoes.push({ id: 'rev-eq', academia_id: 'a1', stars: 5, comment: 'Ótima', nome_autor: 'Gil', created_at: new Date().toISOString() });
    await loadEverything(); irParceiros('avaliacoes');
  });
  await page.waitForTimeout(300);
  ok(await page.$('[data-responder="rev-eq"]'), 'com Responder avaliações, a equipe responde');
  await browser.close();

  // ---- a equipe sem Responder avaliações não vê os botões na ficha ----
  ({ browser, page } = await abrir({ academia: 'a1', completo: ['a1'], equipe: ['ficha'], q: 'academia/so-aula-tennis-a1' }));
  await page.evaluate(async () => {
    window.__db.avaliacoes.push({ id: 'rev-eq2', academia_id: 'a1', stars: 4, comment: 'Boa', nome_autor: 'Lia', created_at: new Date().toISOString() });
    await loadEverything(); openCourt('a1');
  });
  await page.waitForTimeout(400);
  ok(!(await page.$('[data-responder="rev-eq2"]')) && !(await page.$('[data-pedir-analise="rev-eq2"]')) && await page.$('.editar-academia'), 'sem Responder avaliações, a ficha não mostra "Responder" nem "Pedir análise"; com Editar a ficha, mostra "Editar a ficha"');
  await browser.close();

  // ---- Pagamentos: o saldo, a compra e quem comprou ----
  ({ browser, page } = await abrir({ academia: 'a1', completo: ['a1'], envios: { a1: 50 }, equipe: ['pagamentos'], q: 'parceiros/painel' }));
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.__compras = [
      { id: 'c1', academia_id: 'a1', valor: 100, forma: 'pix', situacao: 'paga', created_at: '2026-10-29T12:00:00Z', paga_em: '2026-10-29T12:01:00Z', user_id: 'u-dono' },
      { id: 'c2', academia_id: 'a1', valor: 990, forma: 'cartao', situacao: 'aberta', created_at: '2026-10-29T13:00:00Z', tipo: 'plano', plano: 'premium', periodo: 'anual', user_id: 'u-a1' },
    ];
    irParceiros('pagamentos');
  });
  await page.waitForTimeout(400);
  const pag = await texto(page, '#parceiros .pc-main');
  ok(pag.startsWith('Pagamentos Créditos de promoções R$ 50') && await page.$('.pc-pag-comprar[data-comprar-creditos]'), 'Pagamentos mostra o saldo de créditos e "Comprar créditos" — ' + pag.slice(0, 90));
  const compras = await page.evaluate(() => [...document.querySelectorAll('.pc-compras li')].map(l => l.innerText.replace(/\s+/g, ' ').trim()));
  ok(compras.join(' | ') === 'Plano Premium anual · R$ 990 Esperando o pagamento · por Maria Teste · cartão | Créditos de promoções · R$ 100 Paga em 29 de outubro · por Dono da Quadra · Pix',
    'cada compra com o que foi, o valor, a situação e quem comprou — ' + compras.join(' | '));
  await page.click('.pc-pag-comprar');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.parceirosAba) === 'creditos' && (await texto(page, '#pc-creditos-voltar')) === 'Voltar aos pagamentos', '"Comprar créditos" abre a compra, com a volta para Pagamentos');
  await browser.close();

  // ---- sem Pagamentos, o "Comprar" some e a página diz com quem falar ----
  ({ browser, page } = await abrir({ academia: 'a1', premium: ['a1'], envios: { a1: 0 }, equipe: ['promocoes'], q: 'parceiros/promocoes-email' }));
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => botaoDeComprarCreditos()) === 'Quem cuida dos pagamentos da academia compra os créditos.', 'sem Pagamentos, no lugar de "Comprar créditos", com quem falar');
  await browser.close();

  // ---- Termos, Privacidade e Ajuda ----
  ({ browser, page } = await abrir({ q: 'parceiros' }));
  r = await page.evaluate(() => ({
    termos: TERMS_HTML.includes('escolher o que cada uma pode fazer (editar a ficha, responder avaliações, promoções e leilão, pagamentos) e tornar outra pessoa responsável principal também') && TERMS_HTML.includes('recebem um e-mail a cada compra feita para ela, com quem comprou e o valor'),
    privacidade: PRIVACY_HTML.includes('quem cuida dos pagamentos vê quem comprou') && PRIVACY_HTML.includes('responsável principal novo'),
    ajuda: perguntasParceiros().map(x => x.q + ' ' + x.a).join(' | '),
  }));
  ok(r.termos && r.privacidade, 'os Termos e a Privacidade dizem o que muda (as funções, o principal novo e o e-mail da compra)');
  ok(r.ajuda.includes('Embaixo de cada pessoa, ele escolhe o que ela pode fazer') && r.ajuda.includes('Quem vê os pagamentos da academia?'), 'a Ajuda do Parceiros explica as funções e os pagamentos');
  await browser.close();

  // ---- banco sem as funções: tudo como antes ----
  ({ browser, page } = await abrir({ academia: 'a1', completo: ['a1'], semFuncoes: true, q: 'parceiros/acessos' }));
  await page.waitForTimeout(300);
  await page.evaluate(async () => {
    window.__db.academia_acessos.push({ user_id: 'u-eq', academia_id: 'a1', usuario: 'carlos@quadra.com', nome_responsavel: 'Carlos Recepção', email: 'carlos@quadra.com', papel: 'equipe' });
    window.__db.academia_vinculos.push({ user_id: 'u-eq', academia_id: 'a1', papel: 'equipe' });
    await carregarPessoas();
  });
  await page.waitForTimeout(200);
  ok(!(await page.$('[data-pc-funcao]')) && !(await page.$('[data-pc-principal]')) && await page.$('[data-pc-remover="u-eq"]'), 'banco sem as funções: Acessos fica como antes (adicionar e remover)');
  m = await page.evaluate(() => PC_MENU_LOGADO.filter(i => !i.funcao || posso(i.funcao)).map(i => i.aba).join(','));
  ok(m.includes('ficha') && m.includes('promocoes') && m.includes('pagamentos'), 'e o menu mostra tudo');
  await browser.close();
})();
