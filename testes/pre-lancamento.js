// Pré-lançamento (26/11/2026): até domingo, 29/11, 18h, o site no ar mostra só "O novo GuiaTennis chega
// domingo…"; o código de acesso (no link ou digitado) libera o site inteiro; o admin logado entra direto.
const { abrir, ok } = require('./harness');
const NO_AR = { preLancamento: true, host: 'guiatennis.com.br', trocar: h => h.replace('Date.parse("2026-11-29T18:00:00-03:00")', '(Date.now() + 36e5)') };
const texto = page => page.evaluate(() => document.body.innerText);
(async () => {
  // 1. Visitante no site de verdade: só a página do lançamento.
  let { browser, page } = await abrir(NO_AR);
  let t = await texto(page);
  ok(await page.$eval('.pre-sobre', e => e.textContent) === 'Lançamento · domingo, 29/11, às 18h', 'visitante vê a data do lançamento');
  ok(await page.evaluate(() => !state.loaded), 'o site não carrega para o visitante');
  ok(await page.$eval('.pre-botao', a => a.href) === 'https://instagram.com/guiatennis', 'botão leva ao Instagram');
  ok(t.includes('Achar aula de tênis vai ficar muito mais fácil.'), 'o título que vende');
  ok(await page.$$eval('.pre-contagem strong', l => l.length) === 3 && /^Faltam? \d+ (dia|hora|minuto).* para o lançamento$/.test(await page.$eval('.pre-contagem', e => e.getAttribute('aria-label'))), 'a contagem até domingo (dias, horas e minutos)');
  ok(t.includes('O novo GuiaTennis, por dentro') && await page.$$eval('.pre-tela img', l => l.length) === 5, 'O que muda: os 5 prints do site novo');
  ok(await page.$$eval('.pre-passos li', l => l.length) === 3, 'Como entrar, em 3 passos');
  ok(await page.$$eval('.pre-perguntas details', l => l.length) === 3 && t.includes('Grátis para quem joga · Sem cadastro · Sem taxa'), 'as 3 perguntas frequentes e o risco zero no alto');
  ok(t.includes('Restam 15 vagas de Fundadora'), 'as vagas de Fundadora, de verdade');
  ok(await page.evaluate(() => !preNumeros || preNumeros.academias < 5 ? !document.querySelector('.pre-numeros') : !!document.querySelector('.pre-numeros')), 'os números só com 5 academias ou mais');
  ok(t.includes('Nos vemos domingo, às 18h.'), 'o fecho com o Instagram');
  ok(await page.$$eval('.pre-novidades li', l => l.length) === 4 && t.includes('E tem mais. O resto, só no domingo.'), 'as 4 novidades a mais e o "E tem mais"');
  ok(await page.$eval('.pre-botao-sec', a => a.getAttribute('href')) === '/lancamento.ics', 'Lembrar no calendário');
  ok(t.includes('GuiaTennis Parceiros: um site só para a sua academia.') && t.includes('Selo “Fundadora do GuiaTennis” na ficha, para sempre'), 'a parte das academias com as Fundadoras');
  ok(t.includes('Ainda sem convite? Peça o seu pelo WhatsApp.'), 'academia sem código pede o convite');
  ok(decodeURIComponent(await page.$eval('.pre-convite a', a => a.href)).includes('wa.me/5511927456457?text=Olá! Sou responsável pela academia [nome da academia] e gostaria de receber o código de acesso'), 'o pedido do código já escrito no WhatsApp');
  ok(await page.evaluate(() => [faltaParaOLancamento(2 * 864e5 + 5 * 36e5), faltaParaOLancamento(864e5 + 36e5), faltaParaOLancamento(3 * 36e5 + 6e5), faltaParaOLancamento(36e5), faltaParaOLancamento(30e3)].join('|'))
    === 'Faltam 2 dias e 5 horas|Falta 1 dia e 1 hora|Faltam 3 horas e 10 minutos|Falta 1 hora|Falta 1 minuto', 'a contagem por extenso');
  await page.setViewportSize({ width: 390, height: 900 });
  if (process.env.GT_FOTO) await page.screenshot({ path: process.env.GT_FOTO, fullPage: true });
  await page.setViewportSize({ width: 420, height: 900 });
  ok(await page.evaluate(() => document.activeElement.id !== 'pre-codigo'), 'o teclado não abre sozinho');
  // 2. Vazio e errado: o aviso e o cursor no campo.
  await page.click('.pre-codigo button');
  ok((await texto(page)).includes('Informe o código de acesso.'), 'vazio: "Informe o código de acesso."');
  await page.fill('#pre-codigo', 'TESTE');
  await page.press('#pre-codigo', 'Enter');
  t = await texto(page);
  ok(t.includes('Código inválido. Confira o convite e tente de novo.'), 'código errado: o aviso');
  ok(await page.evaluate(() => document.activeElement.id === 'pre-codigo'), 'código errado: o cursor no campo');
  // 3. O código certo (minúsculo e com espaço) abre o site; o navegador lembra.
  await page.fill('#pre-codigo', ' fundadora ');
  await page.press('#pre-codigo', 'Enter');
  await page.waitForTimeout(900);
  ok(await page.evaluate(() => state.loaded && state.page === 'home'), 'código certo: o site inteiro');
  await page.reload(); await page.waitForTimeout(900);
  ok(await page.evaluate(() => state.loaded), 'de novo no mesmo navegador: entra direto');
  await browser.close();
  // 4. O link das academias: /parceiros?acesso=FUNDADORA abre o Parceiros e o código sai do endereço.
  ({ browser, page } = await abrir({ ...NO_AR, q: 'parceiros?acesso=FUNDADORA' }));
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => state.loaded && state.page === 'parceiros'), 'link com o código: abre o Parceiros');
  ok(!page.url().includes('acesso='), 'o código sai do endereço');
  await browser.close();
  // 5. Link com código errado: a página do lançamento com o aviso.
  ({ browser, page } = await abrir({ ...NO_AR, q: '?acesso=ERRADO' }));
  ok((await texto(page)).includes('Código inválido.'), 'link com código errado: o aviso');
  await browser.close();
  // 6. O admin já logado entra direto.
  ({ browser, page } = await abrir({ ...NO_AR, admin: true }));
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => state.loaded), 'admin logado: o site inteiro');
  await browser.close();
  // 7. Depois das 18h de domingo: o site para todos, sem código.
  ({ browser, page } = await abrir({ preLancamento: true, host: 'guiatennis.com.br', trocar: h => h.replace('Date.parse("2026-11-29T18:00:00-03:00")', '(Date.now() - 1000)') }));
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => state.loaded && !document.querySelector('.pre')), 'depois do lançamento: o site para todos');
  await browser.close();
  // 8. Nos testes locais (fora do ar), nada muda.
  ({ browser, page } = await abrir());
  ok(await page.evaluate(() => state.loaded), 'fora do ar (testes): o site normal');
  await browser.close();
})();
