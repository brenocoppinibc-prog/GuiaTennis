// Conta no topo e convite para criar a conta, como o trivago (pedido do
// Breno em 04/10/2026): ícone da pessoa com brilho para quem não entrou,
// inicial para quem entrou, e o cartão "Criar conta" na home para quem já
// usou o site, que some por 14 dias ao fechar.
const { abrir, ok } = require('./harness');

(async () => {
  // Primeira visita: ícone com brilho, sem o cartão (ainda não usou o site).
  let { browser, page } = await abrir();
  let t = await page.evaluate(() => ({ botao: document.getElementById('conta-topo')?.className || '', convite: !!document.querySelector('.convite-conta') }));
  ok(t.botao.includes('destaque') && !t.convite, 'primeira visita: ícone da conta com brilho, sem cartão — ' + t.botao);
  await page.click('#conta-topo');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => state.jogadorTela === 'email' && !!document.getElementById('jog-email')), 'o ícone abre o Entrar ou criar conta');
  await browser.close();

  // Já usou o site: o cartão aparece; fechar some por 14 dias.
  ({ browser, page } = await abrir());
  await page.evaluate(() => { pushRecent('a1'); render(); });
  t = await page.evaluate(() => document.querySelector('.convite-conta')?.textContent.replace(/\s+/g, ' ') || '');
  ok(t.includes('Jogou numa dessas academias?') && t.includes('Criar conta') && !/desconto/i.test(t), 'quem já viu academia vê o convite, sem prometer o que a conta não faz');
  await page.click('#convite-fechar');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => !document.querySelector('.convite-conta') && !!localStorage.getItem(CONVITE_CONTA_KEY)), 'fechar esconde o convite e lembra');
  await page.evaluate(() => render());
  ok(await page.evaluate(() => !document.querySelector('.convite-conta')), 'fechado, não volta na mesma semana');
  await page.evaluate(() => { localStorage.setItem(CONVITE_CONTA_KEY, JSON.stringify(Date.now() - 15 * 864e5)); render(); });
  ok(await page.evaluate(() => !!document.querySelector('.convite-conta')), 'depois de 14 dias, o convite volta');
  await page.click('#convite-criar');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => state.jogadorTela === 'email' && !document.querySelector('.convite-conta')), '"Criar conta" abre o cadastro e tira o convite');
  await browser.close();

  // Logado como jogador: a inicial no lugar do ícone, sem convite.
  ({ browser, page } = await abrir({ jogador: true }));
  await page.evaluate(() => { pushRecent('a1'); render(); });
  t = await page.evaluate(() => ({ botao: document.getElementById('conta-topo')?.className || '', txt: document.getElementById('conta-topo')?.textContent.trim(), convite: !!document.querySelector('.convite-conta') }));
  ok(t.botao.includes('logado') && t.txt === 'A' && !t.convite, 'jogador logado: a inicial do nome e nenhum convite');
  await page.click('#conta-topo');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => state.page === 'perfil' && location.pathname === '/perfil' && !!document.getElementById('perfil-jogador')), 'a inicial abre o perfil (Minha conta), com endereço próprio');
  await browser.close();

  // Academia logada (05/10/2026): no site dos jogadores é uma conta normal,
  // com a inicial no topo, e sem o convite para criar conta.
  ({ browser, page } = await abrir({ academia: 'a2' }));
  ok(await page.evaluate(() => document.getElementById('conta-topo')?.innerText === 'M' && !document.querySelector('.conta-topo.destaque')), 'academia logada vê a inicial, como qualquer jogador (sem o convite)');
  await browser.close();
})();
