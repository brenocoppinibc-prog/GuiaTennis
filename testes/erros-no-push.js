// Regra 307 (20/11/2026): "notas de erro sempre devem aparecer como push, no
// pagamento não está assim, faça isso em todo o site". O erro sai no push
// vermelho do alto, fica até o ✕ ou até o erro sair da tela, e o texto no meio
// da página fica só para o leitor de tela. A falha sem lugar na tela vem no
// mesmo push do alto (antes, uma faixa embaixo).
const { abrir, ok } = require('./harness');
const push = (page) => page.evaluate(() => { const e = document.querySelector('.gt-push.gt-erro'); return e ? { t: e.dataset.texto, origem: e.dataset.origem, cor: getComputedStyle(e).backgroundColor, topo: e.getBoundingClientRect().top, barra: !!e.querySelector('.gt-push-tempo'), ajuda: e.querySelector('.falha-ajuda')?.innerText || '' } : null; });

(async () => {
  // ---- o pagamento: o erro da compra vai para o push ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/creditos', premium: ['a1'] });
  await page.waitForTimeout(300);
  await page.evaluate(() => { state.page = 'parceiros'; state.parceirosAba = 'creditos'; compraRecusada({ tipo: 'creditos', valorCobrado: 50 }, 'Cartão não aprovado: o cartão foi recusado. Tente outro cartão ou pague com Pix.'); });
  await page.waitForTimeout(200);
  let p = await push(page);
  ok(p && p.t.startsWith('Cartão não aprovado') && p.cor === 'rgb(194, 51, 13)' && p.topo < 40 && !p.barra, 'pagamento recusado: o push vermelho no alto, sem a barra dos 5 segundos — ' + JSON.stringify(p));
  const inline = await page.evaluate(() => { const e = [...document.querySelectorAll('#app .form-error')].find(x => x.textContent.includes('Cartão não aprovado')); return e ? { escondido: e.classList.contains('erro-no-push') && e.getBoundingClientRect().height <= 1, aria: e.getAttribute('aria-hidden') } : null; });
  ok(inline && inline.escondido && inline.aria === 'true', 'o mesmo texto não fica repetido no meio da tela (fica só para o leitor de tela achar o lugar)');
  await page.waitForTimeout(5600);
  ok(!!(await push(page)), 'o erro não some em 5 segundos');
  await page.evaluate(() => mostrarPush('Na comparação (1)'));
  await page.waitForTimeout(100);
  ok(await page.evaluate(() => !!document.querySelector('.gt-erro') && [...document.querySelectorAll('.gt-push')].length === 2), 'um aviso rápido não apaga o erro: os dois ficam, um embaixo do outro');
  await page.click('.gt-erro .gt-push-x');
  await page.evaluate(() => render());
  await page.waitForTimeout(100);
  ok(!(await push(page)), 'o ✕ fecha, e ele não volta ao redesenhar a tela');
  await page.evaluate(() => { state.pcCompra.erro = ''; render(); state.pcCompra.erro = 'Escolha um valor de R$ 20 a R$ 5.000, em reais inteiros.'; render(); });
  await page.waitForTimeout(100);
  ok((await push(page) || {}).t === 'Escolha um valor de R$ 20 a R$ 5.000, em reais inteiros.', 'erro novo: push novo');
  await page.evaluate(() => { state.pcCompra.erro = ''; render(); });
  await page.waitForTimeout(100);
  ok(!(await push(page)), 'corrigiu: o push sai sozinho');
  // A folha do cartão: o erro também sai no push, por cima da folha.
  await page.evaluate(() => { mostrarErro('Não consegui falar com o Mercado Pago agora. Confira os dados e tente de novo.', 'cartao'); });
  p = await push(page);
  ok(p && p.origem === 'cartao' && await page.evaluate(() => !document.getElementById('pc-cartao-erro')), 'cartão no site: o erro no push, e a folha sem o texto vermelho');
  await page.evaluate(() => fecharCartaoNoSite());
  ok(!(await push(page)), 'fechou a folha do cartão: o erro dela sai junto');
  // Regra 308: cartão recusado sem o motivo, sem repetir "o cartão foi recusado".
  await page.evaluate(async () => { window.chamarPagamento = async () => ({ status: 200, d: { situacao: 'recusada' } }); await pagarComCartaoNoSite({ base: { tipo: 'creditos' }, compra: 'x', valor: 50 }, {}, () => {}); });
  await page.waitForTimeout(150);
  ok((await push(page) || {}).t === 'Cartão recusado pelo banco. Tente outro cartão ou pague com Pix.', 'regra 308: recusado sem motivo — "Cartão recusado pelo banco…"');
  // Regra 308: as partes da compra sem número (os números ficam só nas etapas do alto).
  const partes = await page.evaluate(() => [...document.querySelectorAll('#app .pc-checkout-bloco-t')].map(p => p.innerText.trim()).concat(document.querySelector('.pc-checkout-n') ? ['NUMERO'] : []));
  ok(partes.includes('Comprador') && partes.includes('Valor') && partes.includes('Forma de pagamento') && !partes.includes('NUMERO'), 'regra 308: "Comprador", "Valor" e "Forma de pagamento" sem número — ' + partes.join(' | '));
  await browser.close();

  // ---- o jogador: senha errada, no push; o aviso com botão fica na tela ----
  ({ browser, page } = await abrir({}));
  await page.evaluate(() => { window.__db.jogadores.push({ user_id: 'j-z', nome: 'Zé', email: 'ze@exemplo.com' }); window.__senhas['ze@exemplo.com'] = 'senhadoze1'; abrirContaJogador('entrar'); });
  await page.waitForTimeout(200);
  await page.fill('#jog-email', 'ze@exemplo.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(300);
  await page.fill('#jog-senha', 'errada123');
  await page.click('#jog-entrar');
  await page.waitForTimeout(500);
  p = await push(page);
  ok(p && p.t.includes('E-mail ou senha incorretos.') && p.topo < 40, 'senha errada: push vermelho por cima da janela de entrar — ' + (p && p.t));
  ok(await page.evaluate(() => { const e = document.querySelector('.gt-erro'); const o = document.querySelector('.overlay.open'); return !!e && (!o || Number(getComputedStyle(e).zIndex) > Number(getComputedStyle(o).zIndex)); }), 'o push fica por cima da janela');
  // Falha do site sem aviso na tela: o mesmo push vermelho, no alto.
  await page.evaluate(() => { document.querySelectorAll('.gt-push').forEach(e => e.remove()); falhou('apagar a resposta', { message: 'TypeError: Failed to fetch' }, { tentar: () => {} }); });
  await page.waitForTimeout(700);
  const faixa = await page.evaluate(() => { const e = document.getElementById('falha-faixa'); if (!e) return null; const r = e.getBoundingClientRect(); return { topo: r.top, cor: getComputedStyle(e).backgroundColor, t: e.innerText }; });
  ok(faixa && faixa.topo < 40 && faixa.cor === 'rgb(194, 51, 13)' && faixa.t.includes('Tentar de novo') && faixa.t.includes('Código do problema'), 'falha sem lugar na tela: o push vermelho do alto, com "Tentar de novo" e o código — ' + JSON.stringify(faixa && { topo: faixa.topo, cor: faixa.cor }));
  await browser.close();
})();
