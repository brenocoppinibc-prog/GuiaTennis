// Lembrete de quem não entra há 3 meses e resumo do mês do Parceiros
// (pedido do Breno em 09/10/2026, regras 86 e 87). Os e-mails saem do banco
// (SQL 20261009140000 e 20261009150000, conferidos no banco-emails.py);
// aqui, o que o site faz: anota a visita da conta, mostra o lembrete em
// Minha conta (ligado de saída, fora do cadastro), o link para parar e os
// textos dos planos e da Privacidade.
const { abrir, ok } = require('./harness');

const rpcs = (page, nome) => page.evaluate((nome) => window.__rpcs.filter(r => r.nome === nome).length, nome);
const daAna = (page) => page.evaluate(() => window.__db.jogadores.find(j => j.user_id === 'j-ana'));

(async () => {
  // ---- a conta abre o site: a visita fica anotada, uma vez ----
  let { browser, page } = await abrir({ jogador: true, lembreteDeVolta: true });
  ok((await rpcs(page, 'marcar_visita_da_conta')) === 1 && !!(await daAna(page)).visto_em, 'abrir o site com a conta anota a última visita');
  await page.evaluate(() => irPerfil());
  await page.waitForTimeout(400);
  ok((await rpcs(page, 'marcar_visita_da_conta')) === 1, 'navegar no site não anota de novo');

  // ---- Minha conta: o lembrete aparece ligado e desliga ----
  const caixa = '#perfil-jogador .jog-aviso[data-campo="lembrete_de_volta"]';
  ok(await page.isChecked(caixa), 'em Minha conta, o lembrete aparece ligado — ' + await page.evaluate(() => [...document.querySelectorAll('#perfil-jogador .jog-aviso')].map(e => e.dataset.campo).join(',')));
  await page.uncheck(caixa);
  await page.click('#perfil-jogador #jog-salvar');
  await page.waitForTimeout(400);
  ok((await daAna(page)).lembrete_de_volta === false, 'desligar e salvar grava na conta');
  await browser.close();

  // ---- banco sem a coluna: não aparece nem vai no salvar ----
  ({ browser, page } = await abrir({ jogador: true }));
  ok((await rpcs(page, 'marcar_visita_da_conta')) === 1, 'banco antigo: a chamada falha em silêncio');
  await page.evaluate(() => irPerfil());
  await page.waitForTimeout(400);
  ok(!(await page.$('#perfil-jogador .jog-aviso[data-campo="lembrete_de_volta"]')), 'banco sem a coluna: o lembrete não aparece');
  await page.click('#perfil-jogador #jog-salvar');
  await page.waitForTimeout(400);
  ok(!('lembrete_de_volta' in (await daAna(page))) && await page.evaluate(() => !document.querySelector('.form-error')), 'e salvar a conta continua funcionando');
  await browser.close();

  // ---- cadastro: sem a caixa, com o aviso de que vem ligado ----
  ({ browser, page } = await abrir({}));
  await page.evaluate(() => { abrirContaJogador('entrar'); state.jogadorTela = 'criar'; window.__jog = { email: 'novo@exemplo.com' }; render(); });
  await page.waitForTimeout(200);
  const cadastro = await page.evaluate(() => ({
    caixas: [...document.querySelectorAll('#jogador-overlay .jog-aviso')].map(e => e.dataset.campo),
    texto: document.getElementById('jogador-overlay')?.innerText || '',
  }));
  ok(cadastro.caixas.length === 3 && !cadastro.caixas.includes('lembrete_de_volta'), 'o cadastro mostra só os 3 avisos que começam desligados');
  ok(cadastro.texto.includes('Se você ficar 3 meses sem entrar, mandamos um lembrete com as academias novas da sua cidade. Dá para desligar em Minha conta.'), 'e diz que o lembrete vem ligado e onde desligar');
  await browser.close();

  // ---- o link do e-mail para parar só o lembrete ----
  ({ browser, page } = await abrir({ lembreteDeVolta: true, jogador: true, q: '?parar-avisos=tok-j-ana&aviso=volta' }));
  const folha = await page.evaluate(() => document.getElementById('parar-overlay')?.innerText || '');
  ok(folha.includes('o lembrete de quando você fica 3 meses sem entrar'), 'a folha diz o que vai parar');
  await page.click('#parar-sim');
  await page.waitForTimeout(300);
  const ana = await daAna(page);
  ok(ana.lembrete_de_volta === false && ana.avisos_academias === false && ana.novidades === false, 'parar desliga só o lembrete');
  ok(await page.evaluate(() => jogador.lembrete_de_volta === false), 'a conta aberta no aparelho acompanha');

  // ---- textos: planos, Ajuda e Privacidade ----
  await page.goto('http://guia.test/parceiros/planos');
  await page.waitForTimeout(600);
  const planos = await page.evaluate(() => document.body.innerText);
  ok(planos.includes('Resumo do mês por e-mail: acessos e avaliações') && planos.includes('Relatório completo do mês por e-mail: quem chamou e de onde vieram'),
    'Planos: o resumo do mês em todos e o relatório completo no Premium');
  const html = await page.evaluate(() => document.documentElement.innerHTML);
  ok(html.includes('a data da sua última visita com a conta aberta') && html.includes('Se você ficar 3 meses sem entrar, mandamos também um lembrete'),
    'Privacidade: a última visita e o lembrete do jogador');
  ok(html.includes('e, no começo de cada mês, o resumo dos números da academia no mês anterior') && html.includes('mandar o resumo do mês por e-mail (no plano Premium, o relatório completo)'),
    'Privacidade e Termos: o resumo do mês das academias');
  ok(html.includes('No começo de cada mês, chega por e-mail o resumo do mês anterior'), 'a Ajuda do Parceiros conta do resumo');
  await browser.close();

  console.log('\nvolta-e-resumo.js: fim');
})();
