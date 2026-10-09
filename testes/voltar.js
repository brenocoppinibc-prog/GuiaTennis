// "Voltar" desfaz só o último passo (pedido do Breno em 02/10/2026): cada
// janela e cada passo tem o próprio link e entra no histórico.
const { abrir, ok } = require('./harness');
const onde = (page) => page.evaluate(() => location.pathname + location.search);
const volta = async (page) => { await page.goBack(); await page.waitForTimeout(250); };
(async () => {
  // O caso do Breno: cadastro do GuiaTennis Parceiros, e-mail errado, voltar.
  let { browser, page } = await abrir({ q: 'parceiros' });
  await page.locator('a[data-pc="cadastro"]:visible').first().click();
  await page.waitForTimeout(300);
  await page.fill('#pc-email', 'errado@exemplo.com');
  await page.click('#pc-email-continuar');
  await page.waitForTimeout(300);
  ok(await onde(page) === '/parceiros/cadastro?passo=dados' && await page.isVisible('#pc-conta-nome'), 'e-mail novo: o cadastro tem link próprio — ' + await onde(page));
  await volta(page);
  const depois = await page.evaluate(() => ({ link: location.pathname + location.search, email: document.getElementById('pc-email')?.value, editavel: !document.getElementById('pc-email')?.readOnly }));
  ok(depois.link === '/parceiros/cadastro' && depois.email === 'errado@exemplo.com' && depois.editavel, 'voltar leva ao passo do e-mail, com o e-mail para corrigir — ' + JSON.stringify(depois));
  await page.fill('#pc-email', 'certo@exemplo.com');
  await page.click('#pc-email-continuar');
  await page.waitForTimeout(300);
  ok(await onde(page) === '/parceiros/cadastro?passo=dados', 'corrigiu e seguiu');
  await volta(page);
  await volta(page);
  ok(await onde(page) === '/parceiros', 'mais um voltar: a página de antes do cadastro, não uma antiga — ' + await onde(page));
  await browser.close();

  // Menu: voltar fecha o menu e fica na mesma tela.
  ({ browser, page } = await abrir({ q: 'busca?q=Pinheiros' }));
  await page.waitForTimeout(400);
  await page.click('#menu-btn');
  await page.waitForTimeout(200);
  ok((await onde(page)).endsWith('&menu=1'), 'menu aberto tem link próprio — ' + await onde(page));
  await volta(page);
  ok(await page.evaluate(() => !state.showMenu && state.page === 'search'), 'voltar fecha o menu e fica na busca');
  // Menu → Entrar → e-mail → cadastro: cada voltar desfaz um passo.
  await page.click('#menu-btn');
  await page.click('[data-menu="entrar-jogador"]');
  await page.waitForTimeout(200);
  await page.fill('#jog-email', 'nova@exemplo.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(300);
  ok((await onde(page)).endsWith('conta=cadastro'), 'cadastro do jogador com link próprio — ' + await onde(page));
  await volta(page);
  ok(await page.evaluate(() => state.jogadorTela === 'email' && document.getElementById('jog-email').value === 'nova@exemplo.com'), 'voltar: o passo do e-mail, com o e-mail digitado');
  await volta(page);
  ok(await page.evaluate(() => state.showMenu && !state.jogadorTela), 'voltar de novo: o menu');
  await volta(page);
  ok(await page.evaluate(() => !state.showMenu && state.page === 'search'), 'e de novo: a busca, sem nada aberto');
  // Fechar no ✕ e voltar: vai para a tela de antes, não reabre a janela.
  await page.evaluate(() => goHome());
  await page.waitForTimeout(200);
  await page.click('#menu-btn');
  await page.click('[data-menu="preferencias"]');
  await page.waitForTimeout(200);
  await page.click('#pref-close');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => !state.showPrefs && !state.showMenu && location.search === ''), 'fechar no ✕ limpa o link');
  await volta(page);
  ok(await page.evaluate(() => state.page === 'search' && !state.showPrefs && !state.showMenu), 'voltar depois de fechar: a tela anterior, sem reabrir a janela');
  await browser.close();

  // Cadastro da academia: voltar desfaz uma parte.
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(() => { window.__form = null; state.showRegister = true; state.registerStatus = 'idle'; render(); });
  await page.waitForTimeout(200);
  await page.fill('#f-name', 'Academia Voltar');
  await page.click('#reg-continuar');
  await page.waitForTimeout(200);
  await page.click('#reg-continuar');
  await page.waitForTimeout(200);
  ok((await onde(page)).endsWith('parte=quadras'), 'cada parte do cadastro tem link — ' + await onde(page));
  await volta(page);
  ok(await page.evaluate(() => REG_PASSOS[state.regPasso].id === 'precos' && state.showRegister), 'voltar: a parte anterior');
  await volta(page);
  ok(await page.evaluate(() => REG_PASSOS[state.regPasso].id === 'dados' && document.getElementById('f-name').value === 'Academia Voltar'), 'e a primeira, com o nome digitado');
  await page.click('#register-close');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => !state.showRegister && location.search === ''), 'fechar o cadastro volta ao link da tela');
  await browser.close();
})();
