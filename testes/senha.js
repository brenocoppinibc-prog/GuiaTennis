// Senha (pedido do Breno em 04/10/2026): olhinho para mostrar o que foi
// digitado, "repita a senha" em toda senha nova, força enquanto digita e
// recusa das senhas óbvias — como Google e Microsoft. E o código do e-mail
// aceita 6 a 8 números (o tamanho vem do painel do Supabase).
const { abrir, ok } = require('./harness');

(async () => {
  let { browser, page } = await abrir();
  await page.evaluate(() => abrirContaJogador('entrar'));
  await page.fill('#jog-email', 'liana@exemplo.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(300);
  ok(await page.isVisible('#jog-senha2') && await page.isVisible('.senha-caixa #jog-senha + .senha-olho'), 'criar conta: senha, "repita a senha" e o olhinho');
  await page.fill('#jog-senha', 'saibro coberto 2026');
  await page.click('.senha-caixa #jog-senha + .senha-olho');
  let t = await page.evaluate(() => ({ tipo: document.getElementById('jog-senha').type, rotulo: document.querySelector('#jog-senha + .senha-olho').getAttribute('aria-label'), outra: document.getElementById('jog-senha2').type }));
  ok(t.tipo === 'text' && t.rotulo === 'Esconder a senha' && t.outra === 'password', 'o olhinho mostra só aquela senha — ' + JSON.stringify(t));
  await page.click('.senha-caixa #jog-senha + .senha-olho');
  ok(await page.evaluate(() => document.getElementById('jog-senha').type === 'password'), 'outro toque esconde de novo');

  const forca = async (senha) => { await page.fill('#jog-senha', senha); return page.evaluate(() => document.querySelector('.senha-forca')?.innerText.trim() || ''); };
  ok((await forca('12345678')).includes('fraca: fácil de adivinhar'), '12345678: fraca, fácil de adivinhar');
  ok((await forca('curta')).includes('pelo menos 8'), 'curta: fraca, pede 8 caracteres');
  ok((await forca('quadra2026')).includes('boa'), 'quadra2026: boa');
  ok((await forca('Saibro coberto em Moema 2026')).includes('forte'), 'frase longa com número: forte');
  ok(!(await page.evaluate(() => document.querySelectorAll('.senha-forca').length > 1)), 'a força aparece só embaixo da senha, não da confirmação');

  await page.fill('#jog-nome', 'Lia Tenista');
  await page.check('#jog-aceite');
  await page.fill('#jog-senha', '12345678'); await page.fill('#jog-senha2', '12345678');
  await page.click('#jog-criar'); await page.waitForTimeout(200);
  ok((await page.evaluate(() => document.querySelector('#jogador-overlay .form-error')?.innerText || '')).includes('fácil de adivinhar'), 'senha óbvia não passa');
  await page.fill('#jog-senha', 'liana2026x'); await page.fill('#jog-senha2', 'liana2026x');
  await page.click('#jog-criar'); await page.waitForTimeout(200);
  ok((await page.evaluate(() => document.querySelector('#jogador-overlay .form-error')?.innerText || '')).includes('fácil de adivinhar'), 'senha com o próprio e-mail não passa');
  await page.fill('#jog-senha', 'quadra de saibro'); await page.fill('#jog-senha2', 'quadra de sabro');
  await page.click('#jog-criar'); await page.waitForTimeout(200);
  ok((await page.evaluate(() => document.querySelector('#jogador-overlay .form-error')?.innerText || '')).includes('não estão iguais'), 'senhas diferentes: avisa');
  await page.fill('#jog-senha2', 'quadra de saibro');
  await page.click('#jog-criar'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => jogador && jogador.nome === 'Lia Tenista'), 'senhas iguais e boas: a conta é criada');

  // Código de 8 números (como o que o Supabase mandou) é aceito.
  await page.evaluate(() => { window.__codigos['liana@exemplo.com'] = '03618040'; });
  await page.fill('#jog-codigo', '0361 8040');
  await page.click('#jog-confirmar');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => !document.querySelector('#jogador-overlay .form-error') && window.__rpcs.some(r => r.nome === 'confirmar_meu_email')), 'código de 8 números (até com espaço) confirma o e-mail');
  await browser.close();

  // Login (senha de entrar): olhinho, sem confirmação nem força.
  ({ browser, page } = await abrir({ q: 'parceiros/entrar' }));
  await page.evaluate(() => { window.__senhas['dona@quadra.com.br'] = 'x'; window.__db.academia_acessos.push({ user_id: 'u-d', usuario: 'dona@quadra.com.br', email: 'dona@quadra.com.br' }); });
  await page.fill('#pc-email', 'dona@quadra.com.br');
  await page.click('#pc-email-continuar');
  await page.waitForTimeout(300);
  t = await page.evaluate(() => ({ olho: !!document.querySelector('#login-password + .senha-olho'), forca: !!document.querySelector('.senha-forca'), dois: !!document.getElementById('login-password2') }));
  ok(t.olho && !t.forca && !t.dois, 'na senha de entrar: só o olhinho');
  await browser.close();

  // Quem recebeu usuário do GuiaTennis: depois do primeiro acesso, entra
  // pelo e-mail, e o "Esqueci a senha" manda o código (04/10/2026).
  ({ browser, page } = await abrir({ academia: 'a2', acessoNovo: true }));
  await page.evaluate(async () => {
    await sb.rpc('completar_meu_acesso', { p_nome: 'Maria Teste', p_cargo: 'Gerente', p_email: 'maria@quadra.com.br', p_whatsapp: '11900000001', p_cnpj: '', p_recebe_relatorio: false, p_aceite: true });
    await sb.auth.signOut();
    contaAcademia = null;
    irParceiros('entrar');
  });
  await page.waitForTimeout(300);
  await page.fill('#pc-email', 'quadra.a2');
  await page.click('#pc-email-continuar');
  await page.waitForTimeout(300);
  t = await page.evaluate(() => ({ login: state.pcLogin, esqueci: !!document.getElementById('pc-esqueci') }));
  ok(t.login === 'maria@quadra.com.br' && t.esqueci, 'o usuário leva ao e-mail de contato, com "Esqueceu a senha?" por e-mail — ' + t.login);
  await page.fill('#login-password', 'provisoria1');
  await page.click('#login-submit');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => !!contaAcademia), 'o usuário continua entrando com a senha');
  await page.evaluate(async () => { await sb.auth.signOut(); contaAcademia = null; irParceiros('entrar'); });
  await page.waitForTimeout(300);
  await page.fill('#pc-email', 'quadra.a2');
  await page.click('#pc-email-continuar');
  await page.waitForTimeout(300);
  await page.click('#pc-esqueci');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => (window.__codigos || {})['maria@quadra.com.br'] === '123456' && state.pcEmailPasso === 'esqueci'), 'Esqueci a senha manda o código para o e-mail de contato');
  await page.fill('#pc-codigo-senha', '123456');
  await page.fill('#pc-senha-nova', 'quadra nova 2026');
  await page.fill('#pc-senha-nova2', 'quadra nova 2026');
  await page.click('#pc-salvar-senha-nova');
  await page.waitForTimeout(700);
  ok(await page.evaluate(() => !!contaAcademia && window.__senhas['maria@quadra.com.br'] === 'quadra nova 2026'), 'senha nova salva e já entra');
  await browser.close();
})();
