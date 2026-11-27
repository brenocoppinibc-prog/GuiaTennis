// A renovação automática (regra 314, 22/11/2026): "quero fazer as cobranças
// automáticas em Pix ou cartão tudo". O cartão no formulário do Mercado Pago
// (assinatura), o Pix Automático pela página do Mercado Pago (só no site de
// teste, até conferir a conta), o bloco "Sua assinatura" com o próximo
// pagamento, "Trocar o cartão" e cancelar (a renovação para na hora).
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' '), sel);
const PREVIA = 'deploy-preview-5--guiatennis.netlify.app';
const daqui = (dias) => new Date(Date.now() + dias * 864e5).toISOString();

// O Mercado Pago de mentira: o formulário é um botão que devolve o token.
const mercadoPago = (page) => page.evaluate(() => {
  MP_CHAVE_PUBLICA.real = MP_CHAVE_PUBLICA.teste = 'APP_USR-chave-publica-de-teste';
  window.MercadoPago = function () {
    return { bricks: () => ({ create: async (tipo, lugar, cfg) => {
      window.__brick = { tipo, lugar, cfg };
      const el = document.getElementById(lugar);
      el.innerHTML = '<button type="button" id="brick-pagar">Enviar</button>';
      el.querySelector('#brick-pagar').onclick = () => cfg.callbacks.onSubmit({ token: 'tok-assina', payment_method_id: 'visa', installments: 1, payer: { email: 'dono@academia.com' } }, { lastFourDigits: '4242' }).catch(() => {});
      return { unmount: () => {} };
    } }) };
  };
});

(async () => {
  // ---- No mês grátis: a renovação no cartão começa no fim dele ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/plano' });
  let chamadas = [];
  let resposta = () => ({ status: 200, body: {} });
  await page.route('**/.netlify/functions/pagamento', async (rota) => {
    const corpo = JSON.parse(rota.request().postData() || '{}');
    chamadas.push(corpo);
    const r = resposta(corpo);
    await rota.fulfill({ status: r.status, contentType: 'application/json', body: JSON.stringify(r.body) });
  });
  await mercadoPago(page);
  await page.evaluate((ate) => { window.__db.academias.find(a => a.id === 'a1').plano = 'premium'; window.__assinaturas = { a1: { plano: 'premium', ate, depois: 'completo', teste: true, testeUsado: true } }; delete state.assinaturas; render(); }, daqui(20));
  await page.waitForTimeout(500);
  let bloco = await texto(page, '#pc-assinatura');
  ok(bloco.includes('ligue a renovação automática ou pague o próximo mês') && bloco.includes('Continuar no Premium por R$ 49'), 'sem a renovação, o bloco convida a ligar — ' + bloco.slice(0, 140));
  await page.click('[data-assinatura="pagar"]');
  await page.waitForTimeout(500);
  let corpo = await texto(page, '#parceiros .pc-main');
  ok(await page.evaluate(() => state.pcCompra.forma === 'cartao_auto') && corpo.includes('Cartão de crédito') && corpo.includes('Primeira cobrança em') && corpo.includes('Renovação automática todo mês')
    && corpo.includes('Pix · só este mês') && !corpo.includes('Pix Automático'),
    'a compra do plano: o cartão com a renovação vem marcado, a primeira cobrança no fim do mês grátis e o Pix só deste mês; no site de verdade, sem o Pix Automático — ' + corpo.slice(0, 60));
  ok((await texto(page, '#pc-compra-pagar')) === 'Ligar a renovação automática' && (await texto(page, '.pc-checkout-resumo')).includes('nada é cobrado hoje'), 'o botão "Ligar a renovação automática" e, no resumo, nada cobrado hoje');
  resposta = (c) => c.acao === 'assinar' && c.previa ? { status: 200, body: { forma: 'cartao', valor: 49, email: 'dono@academia.com', comeca_em: daqui(20) } }
    : c.acao === 'assinar' ? { status: 200, body: { forma: 'cartao', situacao: 'ativa', cobraAgora: false, comeca_em: daqui(20) } } : { status: 200, body: {} };
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(500);
  const criada = await page.evaluate(() => (window.__automaticas || [])[0]);
  const folha = await texto(page, '#pc-cartao-folha');
  ok(criada && criada.p_plano === 'premium' && criada.p_periodo === 'mensal' && criada.p_forma === 'cartao' && !('p_valor' in criada) && chamadas.at(-1).acao === 'assinar' && chamadas.at(-1).previa === true,
    'cria a assinatura no banco (sem o valor, que sai do banco) e confere a função antes do formulário');
  ok(folha.includes('Assinar o Premium com cartão') && folha.includes('Nada é cobrado hoje') && folha.includes('Cancele quando quiser') && folha.includes('Os dados do cartão vão direto para o Mercado Pago, sem passar pelo GuiaTennis')
    && await page.evaluate(() => window.__brick.cfg.customization.visual.texts.formSubmit === 'Ligar a renovação automática'),
    'o formulário do cartão diz que nada é cobrado hoje, quando é a primeira cobrança e que dá para cancelar — ' + folha.slice(0, 120));
  await page.evaluate((ate) => { window.__assinaturas.a1.automatica = { id: 'cccccccc-0000-4000-8000-000000000001', forma: 'cartao', situacao: 'ativa', desejada: 'ativa', plano: 'premium', periodo: 'mensal', valor: 49, bandeira: 'visa', final: '4242', comeca_em: ate }; }, daqui(20));
  await page.click('#brick-pagar');
  await page.waitForTimeout(700);
  const assinou = chamadas.find(c => c.acao === 'assinar' && c.cartao);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(assinou && assinou.cartao.token === 'tok-assina' && assinou.cartao.final === '4242' && assinou.cobranca === criada.id && !('valor' in assinou), 'assina com o token e os 4 últimos números (o número do cartão não passa pelo site)');
  ok(corpo.includes('Renovação automática ligada') && corpo.includes('Nada foi cobrado hoje') && corpo.includes('no cartão Visa final 4242'), 'a tela "Renovação automática ligada", com o cartão e o dia — ' + corpo.slice(0, 160));
  await page.click('#pc-creditos-concluir');
  await page.waitForTimeout(500);
  bloco = await texto(page, '#pc-assinatura');
  ok(bloco.includes('a renovação automática cobra R$ 49 no cartão Visa final 4242') && bloco.includes('Trocar o cartão') && !bloco.includes('Continuar no Premium por'),
    'o bloco diz quando e onde vai ser cobrado, com "Trocar o cartão" e sem "Pagar" — ' + bloco.slice(0, 160));
  // Trocar o cartão.
  resposta = (c) => c.acao === 'trocar_cartao' ? { status: 200, body: { situacao: 'trocado' } } : { status: 200, body: {} };
  await page.click('[data-assinatura="trocar-cartao"]');
  await page.waitForTimeout(400);
  ok((await texto(page, '#pc-cartao-folha')).includes('Trocar o cartão da assinatura') && await page.evaluate(() => window.__brick.cfg.customization.visual.texts.formSubmit === 'Salvar o cartão'), '"Trocar o cartão" abre o formulário para salvar o cartão novo');
  await page.click('#brick-pagar');
  await page.waitForTimeout(600);
  ok(chamadas.some(c => c.acao === 'trocar_cartao' && c.cartao.token === 'tok-assina' && c.cobranca === 'cccccccc-0000-4000-8000-000000000001') && (await texto(page, '#parceiros .pc-main')).includes('As próximas cobranças saem no cartão novo'),
    'troca o cartão na assinatura do Mercado Pago e diz que as próximas saem nele');
  // Cancelar: a renovação para na hora; a função sincroniza.
  await page.click('[data-assinatura="cancelar"]');
  await page.waitForTimeout(200);
  ok((await texto(page, '#cancelar-assinatura')).includes('A renovação automática para agora'), 'a caixa de cancelar diz que a renovação para agora');
  await page.evaluate(() => { const s = window.__assinaturas.a1; s.automatica.desejada = 'pausada'; s.automatica.conferir = true; });
  resposta = (c) => c.acao === 'automatica' ? { status: 200, body: { situacao: 'pausada', paga: false } } : { status: 200, body: {} };
  await page.click('#cancelar-assinatura-sim');
  await page.waitForTimeout(900);
  bloco = await texto(page, '#pc-assinatura');
  ok(chamadas.some(c => c.acao === 'automatica' && c.cobranca === 'cccccccc-0000-4000-8000-000000000001') && bloco.includes('A renovação automática está pausada') && bloco.includes('Continuar no Premium'),
    'cancelada: a função pausa a renovação no Mercado Pago, e o bloco diz que ela está pausada — ' + bloco.slice(0, 140));
  await browser.close();

  // ---- Sem o plano: o cartão cobra na hora e a tela espera a primeira cobrança ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/plano' }));
  chamadas = [];
  await page.route('**/.netlify/functions/pagamento', async (rota) => {
    const c = JSON.parse(rota.request().postData() || '{}');
    chamadas.push(c);
    const body = c.acao === 'assinar' && c.previa ? { forma: 'cartao', valor: 49, email: 'dono@academia.com', comeca_em: null }
      : c.acao === 'assinar' ? { forma: 'cartao', situacao: 'ativa', cobraAgora: true } : c.acao === 'automatica' ? { situacao: 'ativa', paga: chamadas.filter(x => x.acao === 'automatica').length >= 1 } : {};
    await rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await mercadoPago(page);
  await page.evaluate(() => { window.__db.academias.find(a => a.id === 'a1').plano = 'completo'; window.__assinaturas = { a1: { plano: 'premium', ate: new Date(Date.now() - 864e5).toISOString(), depois: 'completo', testeUsado: true, encerrada: true } }; delete state.assinaturas; render(); });
  await page.waitForTimeout(400);
  await page.click('.pc-planos [data-escolher-plano="premium"]');
  await page.waitForTimeout(400);
  ok((await texto(page, '#pc-compra-pagar')) === 'Assinar com cartão · R$ 49 por mês' && !(await texto(page, '#parceiros .pc-main')).includes('Primeira cobrança em'), 'sem o plano: "Assinar com cartão · R$ 49 por mês", cobrado hoje');
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(400);
  ok((await texto(page, '#pc-cartao-folha')).includes('R$ 49 hoje e, depois, todo mês, automaticamente'), 'o formulário diz que cobra hoje e depois todo mês');
  await page.evaluate(() => { window.__db.academias.find(a => a.id === 'a1').plano = 'premium'; });
  await page.click('#brick-pagar');
  await page.waitForTimeout(9500);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(chamadas.some(c => c.acao === 'automatica') && corpo.includes('Pagamento confirmado') && corpo.includes('A renovação automática está ligada'), 'a primeira cobrança confirmada: "Pagamento confirmado", com a renovação ligada — ' + corpo.slice(0, 140));
  await browser.close();

  // ---- Site de teste: o Pix Automático pela página do Mercado Pago ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/plano', host: PREVIA }));
  chamadas = [];
  await page.route('**/.netlify/functions/pagamento', async (rota) => {
    const c = JSON.parse(rota.request().postData() || '{}');
    chamadas.push(c);
    await rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(c.acao === 'assinar' ? { forma: 'pix', link: 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=pre-1' } : {}) });
  });
  await page.route('https://www.mercadopago.com.br/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>Mercado Pago</p>' }));
  await page.evaluate(() => { window.__db.academias.find(a => a.id === 'a1').plano = 'completo'; window.__assinaturas = { a1: { plano: 'premium', ate: new Date(Date.now() - 864e5).toISOString(), depois: 'completo', testeUsado: true, encerrada: true } }; delete state.assinaturas; render(); });
  await page.waitForTimeout(400);
  await page.click('.pc-planos [data-escolher-plano="premium"]');
  await page.waitForTimeout(400);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Pix Automático') && corpo.includes('Autorize uma vez no aplicativo do banco'), 'no site de teste, a opção Pix Automático, com o desconto');
  await page.click('[data-compra-forma="pix_auto"]');
  await page.waitForTimeout(150);
  ok((await texto(page, '#pc-compra-pagar')) === 'Autorizar o Pix Automático' && /Desconto do Pix \(5%\)/.test(await texto(page, '.pc-checkout-resumo')), 'Pix Automático: "Autorizar o Pix Automático", com os 5% no resumo');
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(800);
  ok(page.url().startsWith('https://www.mercadopago.com.br/subscriptions/') && chamadas.some(c => c.acao === 'assinar' && !c.previa && !c.cartao), 'vai para a página do Mercado Pago autorizar o Pix Automático');
  await browser.close();

  // ---- Mercado Pago desligado (pagamento de teste): paga só este período ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/plano', host: PREVIA, pagamentoDeTeste: true }));
  await page.route('**/.netlify/functions/pagamento', r => r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ erro: 'desligado' }) }));
  await page.evaluate(() => { window.__db.academias.find(a => a.id === 'a1').plano = 'completo'; window.__assinaturas = { a1: { plano: 'premium', ate: new Date(Date.now() - 864e5).toISOString(), depois: 'completo', testeUsado: true, encerrada: true } }; delete state.assinaturas; render(); });
  await page.waitForTimeout(400);
  await page.click('.pc-planos [data-escolher-plano="premium"]');
  await page.waitForTimeout(300);
  await page.click('[data-compra-forma="cartao_auto"]');
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(800);
  ok(await page.$('#pc-compra .pc-teste-tag') && await page.evaluate(() => state.pcCompra.passo === 'teste' && state.pcCompra.forma === 'cartao'), 'Mercado Pago desligado: a renovação vira a compra deste período, no pagamento de teste');
  await browser.close();
  console.log('\nrenovacao-automatica.js: fim');
})();
