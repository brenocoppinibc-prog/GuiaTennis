// Regra 212 (05/11/2026): "ficou confuso esse primeiro acesso no parceiros
// direto, deixe que ele primeiro faça o cadastro normal e depois já aparece a
// solicitação". Como o Google Business Profile e o Airbnb: a conta de sempre
// do GuiaTennis e o código do e-mail; depois, só o que é da academia e o
// pedido.
const { abrir, ok } = require('./harness');
const texto = (page, sel) => page.evaluate((sel) => document.querySelector(sel)?.innerText || '', sel);
const etapas = (page) => page.evaluate(() => [...document.querySelectorAll('.pc-progresso-etapas li')].map(l => l.innerText.trim() + (l.classList.contains('agora') ? '*' : l.classList.contains('feito') ? '✓' : '')).join(' | '));

(async () => {
  // Veio da ficha ("É o responsável?"): a academia fica guardada até o pedido.
  let { browser, page } = await abrir({ q: 'parceiros/cadastro?academia=a2' });
  ok((await etapas(page)).startsWith('Sua conta*'), 'a primeira etapa é a conta — ' + await etapas(page));
  await page.fill('#pc-email', 'rita@gmail.com');
  await page.click('#pc-email-continuar');
  await page.waitForTimeout(300);
  let t = await page.evaluate(() => ({ tela: state.jogadorTela, pagina: state.page, cidade: !!document.getElementById('jog-cidade'), aceite: !!document.getElementById('jog-aceite') }));
  ok(t.tela === 'criar' && t.pagina === 'parceiros' && t.cidade && t.aceite, 'e-mail novo: o mesmo cadastro do site dos jogadores, sem sair do Parceiros — ' + JSON.stringify(t));
  await page.fill('#jog-nome', 'Rita');
  await page.fill('#jog-sobrenome', 'Moema');
  await page.fill('#jog-senha', 'saibro coberto 2026');
  await page.fill('#jog-senha2', 'saibro coberto 2026');
  await page.check('#jog-aceite');
  await page.click('#jog-criar');
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.__codigos['rita@gmail.com'] = '246810'; });
  await page.fill('#jog-codigo', '246810');
  await page.click('#jog-confirmar');
  await page.waitForTimeout(800);
  t = await page.evaluate(() => ({ overlay: !!document.getElementById('jogador-overlay'), prazer: document.querySelector('#parceiros .pc-prazer')?.innerText || '', h1: document.querySelector('#parceiros h1')?.innerText || '', nome: !!document.getElementById('pc-conta-nome'), aceite: !!document.getElementById('pc-conta-aceite'), confirmado: !!(jogador && jogador.email_confirmado_em) }));
  ok(!t.overlay && t.confirmado && t.prazer === 'Conta criada!' && t.h1 === 'Agora, os seus dados de contato na academia' && !t.nome && !t.aceite, 'código confirmado: o Parceiros já pede o que é da academia, sem repetir nome e aceite — ' + JSON.stringify(t));
  ok((await etapas(page)) === '✓ Sua conta✓ | ✓ Confirmar e-mail✓ | Sua academia* | Início', 'a trilha já marca a conta e o e-mail — ' + await etapas(page));
  await page.selectOption('#pc-conta-tratamento', 'Sra.');
  await page.selectOption('#pc-conta-cargo', 'Gerente');
  await page.fill('#pc-conta-whatsapp', '11977776666');
  await page.click('#pc-ativar-conta');
  await page.waitForTimeout(900);
  t = await page.evaluate(() => ({
    conta: !!contaAcademia && contaAcademia.emailConfirmado,
    corpo: document.querySelector('#parceiros .pc-main')?.innerText || '',
    marcada: [...document.querySelectorAll('.pc-escolha.on strong')].map(x => x.innerText).join(),
    push: document.querySelector('.gt-push')?.innerText || '',
    rpc: (window.__rpcs.find(r => r.nome === 'ativar_conta_do_parceiros') || {}).args,
  }));
  ok(t.conta && t.corpo.includes('Prazer em conhecer você, Rita!') && t.corpo.includes('Declaro que estou autorizado(a) pela academia') && t.marcada === 'Quadra Locação', 'em seguida, a solicitação: a academia da ficha já marcada e a declaração — ' + t.marcada);
  ok(!t.push.includes('Conta criada'), 'sem o "Conta criada!" de novo no aviso — ' + t.push);
  ok(t.rpc && t.rpc.p_nome === 'Rita Moema' && t.rpc.p_aceite === true, 'o nome e o aceite vêm do cadastro normal — ' + JSON.stringify(t.rpc));
  await page.check('#pc-declaro');
  await page.click('#pc-administrar');
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => meusPedidos().length === 1 || temAcademia()), 'um toque e o pedido sai');
  await browser.close();

  // Jogador que já tinha conta: continua com o nome e o aceite na tela.
  ({ browser, page } = await abrir({ jogador: true, q: 'parceiros/cadastro' }));
  t = await page.evaluate(() => ({ h1: document.querySelector('#parceiros h1')?.innerText || '', nome: !!document.getElementById('pc-conta-nome'), aceite: !!document.getElementById('pc-conta-aceite') }));
  ok(t.h1 === 'Use a sua conta do GuiaTennis no Parceiros' && t.nome && t.aceite, 'conta antiga de jogador: a tela de sempre, com o nome e o aceite — ' + JSON.stringify(t));
  await browser.close();
})();
