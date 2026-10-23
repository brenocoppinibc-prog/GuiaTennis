// Pedido do Breno em 11/10/2026 (regra 93): "o site não precisa explicar o
// que ele está fazendo em opções pequenas, se há necessidade de explicar,
// levar um redirecionamento, mas isso são para coisas mais complexas e dar
// dicas que facilitam o uso do cliente também é legal".
const { abrir, ok } = require('./harness');

(async () => {
  // ---- site dos jogadores ----
  let { browser, page } = await abrir({});
  await page.evaluate(() => abrirContaJogador('entrar'));
  await page.waitForTimeout(200);
  let t = await page.evaluate(() => document.body.innerText);
  ok(!t.includes('a gente encontra o caminho') && !t.includes('Não mandamos nada sem você pedir'), 'Entrar: sem o parágrafo que explica o que o site faz com o e-mail');
  await page.evaluate(() => { state.jogadorTela = null; render(); toggleFavorite('a1'); });
  await page.waitForTimeout(200);
  t = await page.evaluate(() => document.body.innerText);
  ok(t.includes('Para salvar as suas favoritas, entre com o seu e-mail.') && !t.includes('qualquer aparelho'), 'o coração sem conta só pede para entrar');
  await page.evaluate(() => { state.jogadorTela = null; state.lista = 'favoritas'; render(); });
  await page.waitForTimeout(150);
  t = await page.evaluate(() => document.querySelector('.lista-vazia')?.innerText || '');
  ok(t === 'Entre na sua conta para guardar as suas favoritas.', 'Favoritas sem conta: o convite curto — ' + t);
  await browser.close();

  // Avisos da conta: sem "Dá para mudar quando quiser"; a dica de onde fica o aviso da viagem continua.
  ({ browser, page } = await abrir({ jogador: true }));
  await page.evaluate(() => irPerfil('perfil-avisos'));
  await page.waitForTimeout(300);
  t = await page.evaluate(() => document.body.innerText);
  ok(!t.includes('Dá para mudar quando quiser') && t.includes('O aviso da viagem fica em Vou viajar.'), 'Avisos por e-mail: sem a explicação, com a dica de onde fica o aviso da viagem');
  await browser.close();

  // ---- GuiaTennis Parceiros: o detalhe vai para a Ajuda ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes', premium: ['a1'] }));
  await page.waitForTimeout(300);
  t = await page.evaluate(() => document.querySelector('#parceiros .pc-sec-sub')?.innerText.replace(/\s+/g, ' ') || '');
  ok(t.startsWith('Uma promoção por vez, na ficha e no resultado da busca, de 1 a 12 semanas') && t.includes('Saiba mais') && !t.includes('no máximo um por semana'), 'Promoções: uma linha e "Saiba mais" — ' + t);
  await page.click('#parceiros .pc-sec-sub [data-pc-faq="promocoes"]');
  await page.waitForTimeout(400);
  const aj = await page.evaluate(() => { const d = document.getElementById('pc-faq-promocoes'); return { aba: state.parceirosAba, aberto: !!(d && d.open), texto: d ? d.innerText : '' }; });
  ok(aj.aba === 'ajuda' && aj.aberto && aj.texto.includes('Como funcionam as promoções na ficha?'), '"Saiba mais" abre a pergunta certa da Ajuda, já aberta');
  for (const [aba, id] of [['desempenho', 'desempenho'], ['avaliacoes', 'avaliacoes']]) {
    await page.evaluate((a) => irParceiros(a), aba);
    await page.waitForTimeout(300);
    ok(await page.evaluate((i) => !!document.querySelector(`#parceiros .pc-sec-sub [data-pc-faq="${i}"]`), id), `${aba}: o detalhe virou "Saiba mais"`);
  }
  t = await page.evaluate(() => document.querySelector('#parceiros .pc-sec-sub')?.innerText || '');
  ok(t.includes('Dica: agradeça e responda com educação'), 'Avaliações: a dica continua — ' + t);
  await browser.close();
})();
