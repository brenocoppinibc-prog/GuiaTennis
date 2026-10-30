// "Crie sua conta para guardar as academias que você chamou" (pedido do
// Breno em 23/10/2026), como o "Entre para salvar" do Airbnb e do Booking:
// sem conta, nada fica trancado; depois da segunda academia chamada, o aviso
// desce no alto com "Criar conta". As chamadas ficam só na aba e vão para a
// conta ao criar.
const { abrir, ok } = require('./harness');
const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);

(async () => {
  // ---- Sem conta: a primeira chamada não convida; a segunda, sim ----
  let { browser, page } = await abrir();
  await page.waitForTimeout(400);
  await page.evaluate(() => trackClick('a1', 'whatsapp'));
  await page.waitForTimeout(1800);
  ok(!(await page.$('#convite-chamadas')) && await page.evaluate(() => chamadasDaAba().length === 1), 'a primeira academia chamada fica na aba, sem convite');
  await page.evaluate(() => trackClick('a2', 'instagram'));
  await page.waitForTimeout(1800);
  let dica = (await texto(page, '#convite-chamadas')).replace(/\s+/g, ' ');
  ok(dica.startsWith('Crie sua conta para guardar as academias que você chamou') && dica.includes('Você chamou 2 academias') && dica.includes('Criar conta ›')
    && await page.evaluate(() => { const st = getComputedStyle(document.getElementById('convite-chamadas')); return st.backgroundColor === 'rgb(255, 255, 255)' && st.borderLeftColor === 'rgb(242, 183, 5)'; }),
    'a segunda chamada: o convite aparece no alto, com a cara dos outros avisos da conta (balão branco, borda amarela) — ' + dica);
  ok(await page.evaluate(() => JSON.parse(sessionStorage.getItem('guiatennis_chamadas_aba_v1')).map(x => x.id).join() === 'a2,a1' && !localStorage.getItem('guiatennis_chamadas_v1')),
    'as chamadas ficam só na aba (sessionStorage), não no aparelho');
  await page.evaluate(() => { document.getElementById('convite-chamadas')?.remove(); trackClick('a3', 'site'); });
  await page.waitForTimeout(1800);
  ok(!(await page.$('#convite-chamadas')), 'uma vez por aba: a terceira chamada não convida de novo');
  await browser.close();

  // ---- "Criar conta": a conta nasce com as academias chamadas ----
  ({ browser, page } = await abrir());
  await page.waitForTimeout(400);
  await page.evaluate(() => { trackClick('a1', 'whatsapp'); trackClick('a2', 'whatsapp'); });
  await page.waitForTimeout(1800);
  await page.click('#convite-chamadas .push-conta-cta');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => state.jogadorTela === 'email' && state.jogadorMotivo.includes('guardar as academias que você chamou')), '"Criar conta" abre o cadastro, dizendo o motivo');
  await page.fill('#jog-email', 'lia@exemplo.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(300);
  await page.fill('#jog-nome', 'Lia');
  await page.fill('#jog-sobrenome', 'Tenista');
  await page.fill('#jog-senha', 'senhaboa12');
  await page.fill('#jog-senha2', 'senhaboa12');
  await page.check('#jog-aceite');
  await page.click('#jog-criar');
  await page.waitForTimeout(900);
  const conta = await page.evaluate(() => ({ chamadas: lerChamadas().map(x => x.id).join(), aba: sessionStorage.getItem('guiatennis_chamadas_aba_v1') }));
  ok(conta.chamadas === 'a2,a1' && !conta.aba, 'criada a conta, as academias chamadas vão para "Academias que você chamou" e saem da aba — ' + JSON.stringify(conta));
  await browser.close();

  // ---- O ✕ guarda por 14 dias ----
  ({ browser, page } = await abrir());
  await page.waitForTimeout(400);
  await page.evaluate(() => { trackClick('a1', 'whatsapp'); trackClick('a2', 'whatsapp'); });
  await page.waitForTimeout(1800);
  await page.click('#convite-chamadas .push-conta-x');
  ok(await page.evaluate(() => !document.getElementById('convite-chamadas') && Number(localStorage.getItem('guiatennis_convite_chamadas_v1')) > 0), 'o ✕ fecha e guarda a data');
  await page.evaluate(() => { sessionStorage.clear(); window.__conviteChamadas = false; trackClick('a1', 'whatsapp'); trackClick('a3', 'whatsapp'); });
  await page.waitForTimeout(1800);
  ok(!(await page.$('#convite-chamadas')), 'fechado, não volta por 14 dias, nem noutra aba');
  await browser.close();

  // ---- Fora do site (WhatsApp aberto), o convite espera a volta ----
  ({ browser, page } = await abrir());
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__visivel ? 'visible' : 'hidden' });
    window.__visivel = false;
    trackClick('a1', 'whatsapp'); trackClick('a2', 'whatsapp');
  });
  await page.waitForTimeout(1800);
  ok(!(await page.$('#convite-chamadas')), 'com a pessoa no WhatsApp, o convite não aparece');
  await page.evaluate(() => { window.__visivel = true; document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(900);
  ok(!!(await page.$('#convite-chamadas')), 'ao voltar ao site, o convite desce');
  await browser.close();

  // ---- Com conta: nada de convite, a chamada vai para a conta ----
  ({ browser, page } = await abrir({ jogador: true }));
  await page.waitForTimeout(400);
  await page.evaluate(() => { trackClick('a1', 'whatsapp'); trackClick('a2', 'whatsapp'); });
  await page.waitForTimeout(1800);
  ok(!(await page.$('#convite-chamadas')) && await page.evaluate(() => lerChamadas().length === 2 && !sessionStorage.getItem('guiatennis_chamadas_aba_v1')), 'com conta, sem convite: as chamadas vão direto para a conta');
  await browser.close();

  // ---- Privacidade ----
  ({ browser, page } = await abrir());
  ok(await page.evaluate(() => PRIVACY_HTML.includes('Sem conta, as academias que você chama ficam só na aba aberta do navegador')), 'a Política de Privacidade explica a aba');
  await browser.close();
})();
