// Pedido do Breno em 22/10/2026: "faça em todo o site aquele salvamento quase
// que imediato, para não sair e perder tudo, ou se for voltar em ações que
// preencheu algo sem salvar, ter o aviso". O que se digita vai para o
// rascunho da aba na hora, sem nada na tela (pedido de 23/10/2026: "não quero
// que apareça rascunho salvo em nenhum lugar"); com algo preenchido e não
// salvo, trocar de página, voltar pelo navegador ou fechar a janela pergunta
// antes ("Sair sem salvar?").
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const temAviso = (page) => page.evaluate(() => !!document.getElementById('aviso-sair'));
const semRascunhoNaTela = (page) => page.evaluate(() => !/rascunho salvo/i.test(document.body.innerText) && !document.querySelector('.rascunho-salvo'));

(async () => {
  // ---- Leilão: o rascunho calado, trocar de aba, voltar e recarregar ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel', premium: ['a1'] });
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.__alcance = 143; window.__db.academias.find(a => a.id === 'a1').envios_de_aviso = 100; irParceiros('promocoes-email'); });
  await page.waitForTimeout(300);
  await page.evaluate(async () => { await carregarPromocoesPorEmail(); });
  await page.waitForTimeout(200);
  await page.click('#pc-leilao-continuar');
  await page.waitForTimeout(150);
  await page.click('#pc-leilao-participar');
  await page.waitForTimeout(150);
  ok(await semRascunhoNaTela(page), 'sem nada digitado, nada de "Rascunho salvo"');
  await page.click('.pc-promo-partes [data-pc="promocoes"]');
  await page.waitForTimeout(200);
  ok(!(await temAviso(page)) && await page.evaluate(() => state.parceirosAba === 'promocoes'), 'sem nada preenchido, trocar de aba não pergunta');
  await page.click('.pc-promo-partes [data-pc="promocoes-email"]');
  await page.waitForTimeout(300);
  await page.evaluate(() => { state.pcLeilaoPasso = 2; render(); });
  await page.fill('#pc-email-titulo', 'Primeira aula grátis');
  await page.waitForTimeout(400);
  ok(await texto(page, '#pc-leilao-passo .pc-ads-etapa') === 'Etapa 3 de 5 · Anúncio' && await semRascunhoNaTela(page), 'digitou: a etapa sem "Rascunho salvo" ao lado (regra 150) — ' + await texto(page, '#pc-leilao-passo .pc-ads-etapa'));
  ok(await page.evaluate(() => JSON.parse(sessionStorage.getItem('guiatennis_rascunho_v1')).e.pcEmailForm.titulo === 'Primeira aula grátis'), 'o rascunho da aba já tem o anúncio');
  await page.click('.pc-promo-partes [data-pc="promocoes"]');
  await page.waitForTimeout(200);
  ok(await texto(page, '#aviso-sair') === 'Sair sem salvar? O que você preencheu no anúncio do leilão ainda não foi salvo e vai ser descartado. Sair e descartar Continuar editando'
    && await page.evaluate(() => state.parceirosAba === 'promocoes-email'), 'trocar de aba com o anúncio escrito: "Sair sem salvar?" e fica no leilão — ' + await texto(page, '#aviso-sair'));
  await page.click('#aviso-sair-nao');
  await page.waitForTimeout(150);
  ok(!(await temAviso(page)) && (await page.inputValue('#pc-email-titulo')) === 'Primeira aula grátis', '"Continuar editando" fica, com o que foi escrito');
  await page.click('#pc-leilao-continuar');
  await page.waitForTimeout(150);
  ok(!(await temAviso(page)) && await page.$('#pc-leilao-passo'), '"Continuar", dentro do próprio leilão, não pergunta');
  await page.goBack();
  await page.waitForTimeout(400);
  ok(await temAviso(page) && await page.evaluate(() => state.parceirosAba === 'promocoes-email' && location.pathname.endsWith('/promocoes-email')), 'voltar pelo navegador também pergunta, e a tela fica');
  await page.click('#aviso-sair-sim');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => state.parceirosAba === 'promocoes' && !state.pcEmailForm), '"Sair e descartar" volta e apaga o anúncio');
  await browser.close();

  // Recarregar a página no meio: o anúncio e a etapa voltam.
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes-email', premium: ['a1'] }));
  await page.evaluate(async () => { window.__alcance = 143; await carregarPromocoesPorEmail(); });
  await page.waitForTimeout(200);
  await page.click('#pc-leilao-continuar');
  await page.waitForTimeout(150);
  await page.click('#pc-leilao-participar');
  await page.waitForTimeout(150);
  await page.fill('#pc-email-titulo', 'Aula grátis');
  await page.fill('#pc-email-mensagem', 'Para quem nunca jogou aqui.');
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForTimeout(1200);
  await page.evaluate(async () => { await carregarPromocoesPorEmail(); });
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.querySelector('#pc-leilao-passo')?.dataset.passo === '2') && (await page.inputValue('#pc-email-titulo')) === 'Aula grátis' && (await page.inputValue('#pc-email-mensagem')) === 'Para quem nunca jogou aqui.',
    'recarregou: volta na mesma etapa, com o anúncio');
  await browser.close();

  // ---- Promoção na ficha (Premium) ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes', premium: ['a1'] }));
  await page.waitForTimeout(400);
  await page.fill('#pc-promo-titulo', 'Aula experimental');
  await page.waitForTimeout(400);
  ok(await semRascunhoNaTela(page) && await page.evaluate(() => JSON.parse(sessionStorage.getItem('guiatennis_rascunho_v1')).e.pcPromoForm.titulo === 'Aula experimental'), 'na promoção, o rascunho guardado sem "Rascunho salvo" na tela');
  await page.click('[data-promo-semanas="8"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => JSON.parse(sessionStorage.getItem('guiatennis_rascunho_v1')).e.pcPromoForm.semanas === 8) && (await page.inputValue('#pc-promo-titulo')) === 'Aula experimental', 'as semanas escolhidas também vão para o rascunho');
  await page.click('.pc-promo-partes [data-pc="promocoes-email"]');
  await page.waitForTimeout(200);
  ok((await texto(page, '#aviso-sair')).includes('O que você preencheu na promoção ainda não foi salvo'), 'sair da promoção escrita pergunta');
  await page.click('#aviso-sair-sim');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.parceirosAba === 'promocoes-email' && !state.pcPromoForm), 'e "Sair e descartar" segue para o leilão');
  await browser.close();

  // ---- Site dos jogadores: a viagem (✕) e a avaliação (voltar) ----
  ({ browser, page } = await abrir({ jogador: true }));
  await page.waitForTimeout(400);
  await page.evaluate(() => { state.showMenu = true; render(); });
  await page.click('[data-menu="viagem"]');
  await page.waitForTimeout(200);
  await page.selectOption('#viagem-uf', 'SP');
  await page.waitForTimeout(300);
  await page.fill('#viagem-cidade', 'Campinas');
  await page.waitForTimeout(400);
  ok(await semRascunhoNaTela(page), 'na viagem, sem "Rascunho salvo"');
  await page.click('#viagem-close');
  await page.waitForTimeout(200);
  ok((await texto(page, '#aviso-sair')).includes('O que você preencheu na viagem') && await page.evaluate(() => state.showViagem), 'o ✕ da viagem preenchida pergunta antes de fechar');
  await page.click('#aviso-sair-sim');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => !state.showViagem && !window.__viagem), '"Sair e descartar" fecha e apaga o rascunho da viagem');
  await page.evaluate(() => openCourt('a2'));
  await page.waitForTimeout(500);
  await page.click('#star-picker [data-star="4"]');
  await page.fill('#rate-comment', 'Muito bom');
  await page.waitForTimeout(400);
  ok(await semRascunhoNaTela(page), 'na avaliação, sem "Rascunho salvo"');
  await page.goBack();
  await page.waitForTimeout(400);
  ok(await temAviso(page) && await page.evaluate(() => state.page === 'court'), 'voltar com a avaliação escrita pergunta e fica na ficha');
  await page.click('#aviso-sair-nao');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => state.pendingStar === 4 && window.__rateComment === 'Muito bom'), 'e as estrelas e o texto continuam');
  await page.fill('#rate-comment', '');
  await page.evaluate(() => { state.pendingStar = 0; render(); });
  await page.waitForTimeout(200);
  await page.goBack();
  await page.waitForTimeout(400);
  ok(!(await temAviso(page)) && await page.evaluate(() => state.page !== 'court'), 'com tudo apagado, volta direto');
  ok(await page.evaluate(() => !pendenciaDeSalvar()), 'fechar a aba sem nada por salvar: nenhum aviso do navegador');
  await browser.close();

  // ---- Perfil do jogador: depois de salvar, sai sem perguntar ----
  ({ browser, page } = await abrir({ jogador: true }));
  await page.waitForTimeout(400);
  await page.evaluate(() => irPerfil());
  await page.waitForTimeout(400);
  await page.fill('#jog-nome', 'Maria Souza Lima');
  await page.waitForTimeout(400);
  ok(await semRascunhoNaTela(page), 'no perfil, sem "Rascunho salvo" nos dados pessoais');
  await page.click('[data-menu="favoritas"]');
  await page.waitForTimeout(200);
  ok((await texto(page, '#aviso-sair')).includes('O que você preencheu nos seus dados'), 'trocar o nome e ir para as favoritas pergunta');
  await page.click('#aviso-sair-nao');
  await page.click('#jog-salvar');
  await page.waitForTimeout(500);
  ok(await semRascunhoNaTela(page) && await page.evaluate(() => !pendenciaDeSalvar()), 'salvou: não há o que perder');
  await page.click('[data-menu="favoritas"]');
  await page.waitForTimeout(300);
  ok(!(await temAviso(page)), 'e as favoritas abrem sem perguntar');
  await browser.close();

  // ---- Cadastro da academia: voltar pelo navegador ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel' }));
  await page.waitForTimeout(400);
  await page.evaluate(() => abrirEdicaoDaFicha(minhaAcademia()));
  await page.waitForTimeout(400);
  await page.fill('#f-name', 'Outro nome');
  await page.waitForTimeout(400);
  ok(!(await texto(page, '.reg-progresso-t')).includes('Rascunho') && await semRascunhoNaTela(page), 'no cadastro, a parte sem "Rascunho salvo" ao lado — ' + await texto(page, '.reg-progresso-t'));
  ok(await page.evaluate(() => (pendenciaDeSalvar() || {}).tipo === 'cadastro'), 'fechar a aba agora tem o que perder (o navegador pergunta)');
  await page.goBack();
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => state.showRegister) && (await texto(page, '#aviso-sair')).startsWith('Sair sem salvar? As mudanças na Outro nome ainda não foram salvas'), 'voltar pelo navegador no meio da edição pergunta, com o texto do ✕');
  await page.click('#aviso-sair-sim');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => !state.showRegister && !window.__form), '"Sair e descartar" fecha a edição');
  await browser.close();

  // ---- "Faça seu cadastro" (nome e WhatsApp): não perde o que digitou ----
  ({ browser, page } = await abrir({}));
  await page.waitForTimeout(400);
  await page.evaluate(() => { state.showVisitorSetup = true; render(); });
  await page.waitForTimeout(150);
  await page.fill('#visitor-nome', 'Ana');
  await page.click('#visitor-submit');
  await page.waitForTimeout(200);
  ok((await page.inputValue('#visitor-nome')) === 'Ana' && (await texto(page, '#visitor-overlay .form-error')).includes('Preencha'), 'o aviso de erro não apaga o nome digitado');
  await browser.close();
})();
