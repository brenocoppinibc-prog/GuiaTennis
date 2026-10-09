// Código por e-mail no GuiaTennis Parceiros (02/10/2026): "Esqueceu a
// senha?" e confirmar o e-mail da conta.
const { abrir, ok, irSenha } = require('./harness');
(async () => {
  let { browser, page } = await abrir({ q: 'parceiros/entrar' });
  await page.evaluate(() => {
    const agora = new Date().toISOString();
    window.__db.academia_acessos.push({ user_id: 'u-dona', academia_id: 'a2', usuario: 'dona@quadra.com.br', email: 'dona@quadra.com.br', nome_responsavel: 'Dona Quadra', papel: 'principal', termos_aceitos_em: agora, dados_completos_em: agora, senha_trocada_em: agora });
    window.__senhas['dona@quadra.com.br'] = 'antiga1234';
  });
  await irSenha(page, 'dona@quadra.com.br');
  await page.click('#pc-esqueci');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.pcEmailPasso === 'esqueci' && (window.__codigos || {})['dona@quadra.com.br'] === '123456' && location.search.includes('passo=nova-senha')), 'Esqueceu a senha: manda o código para o e-mail, com link próprio');
  await page.fill('#pc-codigo-senha', '111111');
  await page.fill('#pc-senha-nova', 'novasenha77');
  await page.fill('#pc-senha-nova2', 'novasenha77');
  await page.click('#pc-salvar-senha-nova');
  await page.waitForTimeout(300);
  ok((await page.evaluate(() => document.querySelector('#parceiros .form-error')?.innerText || '')).includes('Código errado'), 'código errado: avisa');
  await page.fill('#pc-codigo-senha', '123456');
  await page.click('#pc-salvar-senha-nova');
  await page.waitForTimeout(700);
  const entrou = await page.evaluate(() => ({ aba: state.parceirosAba, senha: window.__senhas['dona@quadra.com.br'], conta: !!contaAcademia, confirmado: contaAcademia && contaAcademia.emailConfirmado }));
  ok(entrou.aba === 'painel' && entrou.senha === 'novasenha77' && entrou.conta && entrou.confirmado, 'senha nova salva, entra no painel e o e-mail fica confirmado — ' + JSON.stringify(entrou));
  ok(!(await page.evaluate(() => !!document.querySelector('.pc-confirmar-email'))), 'e-mail já confirmado: sem o cartão de confirmar');
  await browser.close();

  // Usuário que o GuiaTennis mandou (sem e-mail de verdade): continua pelo WhatsApp.
  ({ browser, page } = await abrir({ q: 'parceiros/entrar' }));
  await irSenha(page, 'quadra.a2');
  ok(await page.evaluate(() => !document.getElementById('pc-esqueci') && [...document.querySelectorAll('#parceiros .footnote a')].some(a => a.href.startsWith('https://wa.me/'))), 'usuário do GuiaTennis: "esqueci" pelo WhatsApp');
  await browser.close();

  // Conta com e-mail ainda não confirmado: o painel pede para confirmar.
  ({ browser, page } = await abrir({ q: 'parceiros/entrar' }));
  await page.evaluate(() => {
    const agora = new Date().toISOString();
    window.__db.academia_acessos.push({ user_id: 'u-dono', academia_id: 'a2', usuario: 'dono@quadra.com.br', email: 'dono@quadra.com.br', nome_responsavel: 'Dono', papel: 'principal', termos_aceitos_em: agora, dados_completos_em: agora, senha_trocada_em: agora });
    window.__senhas['dono@quadra.com.br'] = 'senha12345';
  });
  await irSenha(page, 'dono@quadra.com.br');
  await page.fill('#login-password', 'senha12345');
  await page.click('#login-submit');
  await page.waitForTimeout(700);
  ok(await page.evaluate(() => !!document.querySelector('.pc-confirmar-email')), 'painel mostra "Confirme o seu e-mail"');
  await page.click('#pc-mandar-codigo');
  await page.waitForTimeout(300);
  await page.fill('#pc-codigo-email', '123456');
  await page.click('#pc-confirmar-email');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => contaAcademia.emailConfirmado && !document.querySelector('.pc-confirmar-email') && document.querySelector('.conta-aviso')?.innerText.includes('E-mail confirmado')), 'código certo: e-mail confirmado e o cartão some');
  await browser.close();
})();
