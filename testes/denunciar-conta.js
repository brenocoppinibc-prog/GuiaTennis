// Regra 224 (pedido do Breno em 09/11/2026): os jogadores também denunciam
// a conta de quem escreveu uma avaliação (nome ofensivo, conta falsa, da
// academia ou de concorrente, outro); o admin mantém ou suspende o nome.
const { abrir, ok } = require('./harness');

const abrirFicha = async (page, id) => { await page.evaluate((id) => openCourt(id), id); await page.waitForTimeout(250); };
const diasAtras = (n) => new Date(Date.now() - n * 86400000).toISOString();
const AVALIACOES = [{ id: 'r9', academia_id: 'a1', user_id: 'u-xinga', stars: 1, comment: 'Ruim', nome_autor: 'Nome Feio', contato_autor: 'x@x.com', created_at: diasAtras(2) }];

(async () => {
  let { browser, page } = await abrir({ jogador: true, avaliacoes: AVALIACOES });
  await abrirFicha(page, 'a1');
  await page.click('[data-denunciar="r9"]');
  await page.waitForTimeout(200);
  let tela = await page.evaluate(() => document.querySelector('#aviso-ficha-close-overlay')?.innerText || '');
  ok(tela.includes('O que está errado: a avaliação ou a conta de quem escreveu?') && /A CONTA DE QUEM ESCREVEU|A conta de quem escreveu/.test(tela) && tela.includes('O nome é ofensivo ou impróprio') && tela.includes('A conta é falsa ou se passa por outra pessoa'),
    'o "Denunciar" mostra os motivos da avaliação e, embaixo, os da conta de quem escreveu');
  await page.click('.aviso-opcao input[value="conta_outro"]');
  await page.waitForTimeout(100);
  ok(!!(await page.$('#aviso-detalhes')), 'escolhendo a conta, aparece o campo para contar o que viu');
  await page.click('#aviso-ficha-enviar');
  await page.waitForTimeout(200);
  ok((await page.evaluate(() => document.querySelector('#aviso-ficha-close-overlay .form-error')?.innerText || '')).includes('Conte o que está errado na conta'), '"Outro problema" pede para contar o que é');
  await page.click('.aviso-opcao input[value="conta_nome"]');
  await page.fill('#aviso-detalhes', 'O nome é um xingamento.');
  await page.click('#aviso-ficha-enviar');
  await page.waitForTimeout(400);
  let r = await page.evaluate(() => ({ d: (window.__db.denuncias_de_conta || [])[0], email: window.__db.emails_a_enviar.some(e => e.tipo === 'conta_denunciada'), feito: document.querySelector('#aviso-ficha-close-overlay')?.innerText || '', aval: (window.__db.denuncias_de_avaliacao || []).length }));
  ok(r.d && r.d.denunciado === 'u-xinga' && r.d.motivo === 'nome' && r.d.detalhes === 'O nome é um xingamento.' && r.email && r.aval === 0,
    'denuncia a conta (não a avaliação), com o que viu, e o admin recebe o e-mail');
  ok(r.feito.includes('O GuiaTennis vai conferir a conta'), 'a confirmação diz que o GuiaTennis vai conferir a conta — ' + r.feito.replace(/\s+/g, ' ').slice(0, 120));
  await browser.close();

  ({ browser, page } = await abrir({ admin: true, avaliacoes: AVALIACOES }));
  await page.evaluate(async () => {
    window.__db.denuncias_de_conta = [{ denunciado: 'u-xinga', denunciou: 'j-1', avaliacao_id: 'r9', nome_visto: 'Nome Feio', motivo: 'nome', detalhes: 'É um xingamento.', criado_em: new Date().toISOString(), resolvido_em: null }];
    await loadEverything(); irAdmin('pendencias');
  });
  await page.waitForTimeout(500);
  const painel = await page.evaluate(() => document.body.innerText);
  ok(painel.includes('Contas denunciadas') && painel.includes('Nome Feio') && painel.includes('nome ofensivo ou impróprio') && painel.includes('É um xingamento.'),
    'o admin vê a conta denunciada, os motivos e o que escreveram');
  page.once('dialog', d => d.accept(d.defaultValue()));
  await page.click('[data-dc-suspender="u-xinga"]');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ d: window.__db.denuncias_de_conta[0], s: window.__suspensosPelaConta || [], bloco: !!document.querySelector('.conta-denunciada-item') }));
  ok(r.d.resolucao === 'suspendeu' && r.s.length === 1 && r.s[0].motivo.includes('Outros jogadores denunciaram a conta') && !r.bloco,
    '"Suspender o nome": pede o motivo (já escrito), suspende e a pendência some');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
