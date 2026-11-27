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
  // (Regra 317: o leilão com lance separado saiu; o e-mail vem do alcance de
  // Promover, e o aviso ao sair fica na promoção, abaixo.)
  let browser, page;

  // ---- Promoção na ficha (Premium) ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes', premium: ['a1'] }));
  await page.waitForTimeout(400);
  await page.fill('#pc-promo-titulo', 'Aula experimental');
  await page.waitForTimeout(400);
  ok(await semRascunhoNaTela(page) && await page.evaluate(() => JSON.parse(sessionStorage.getItem('guiatennis_rascunho_v1')).e.pcPromoForm.titulo === 'Aula experimental'), 'na promoção, o rascunho guardado sem "Rascunho salvo" na tela');
  await page.click('[data-promo-semanas="8"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => JSON.parse(sessionStorage.getItem('guiatennis_rascunho_v1')).e.pcPromoForm.semanas === 8) && (await page.inputValue('#pc-promo-titulo')) === 'Aula experimental', 'as semanas escolhidas também vão para o rascunho');
  await page.evaluate(() => document.querySelector('[data-pc="painel"]').click());
  await page.waitForTimeout(200);
  ok((await texto(page, '#aviso-sair')).includes('O que você preencheu na promoção ainda não foi salvo'), 'sair da promoção escrita pergunta');
  await page.click('#aviso-sair-nao');
  await page.waitForTimeout(150);
  ok(!(await temAviso(page)) && (await page.inputValue('#pc-promo-titulo')) === 'Aula experimental', '"Continuar editando" fica, com o que foi escrito');
  await page.evaluate(() => document.querySelector('[data-pc="painel"]').click());
  await page.waitForTimeout(200);
  await page.click('#aviso-sair-sim');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.parceirosAba === 'painel' && !state.pcPromoForm), 'e "Sair e descartar" segue e apaga a promoção escrita');
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
  await page.fill('#jog-nome', 'Maria');
  await page.fill('#jog-sobrenome', 'Souza Lima');
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
