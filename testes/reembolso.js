// Regra 316 (23/11/2026): "em pagamentos faça uma solicitação para pedirem
// reembolso" e o estorno pelo admin, com a sugestão dos créditos não usados.
const { abrir, ok } = require('./harness');
const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' '), sel);
const COMPRA = '00000000-0000-4000-8000-0000000000e1';

(async () => {
  // ---- A academia pede o reembolso em Pagamentos ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/pagamentos', premium: ['a1'] });
  await page.evaluate((id) => {
    window.__db.academias.find(a => a.id === 'a1').envios_de_aviso = 60;
    window.__compras = [{ id, academia_id: 'a1', valor: 100, forma: 'pix', situacao: 'paga', tipo: 'creditos', paga_em: new Date().toISOString(), created_at: new Date().toISOString() }];
    carregarComprasDaAcademia();
  }, COMPRA);
  await page.waitForTimeout(500);
  ok((await texto(page, '#pc-pag-compras')).includes('Pedir reembolso'), 'Pagamentos: a compra paga tem "Pedir reembolso"');
  await page.click('[data-pedir-reembolso]');
  await page.waitForTimeout(400);
  let caixa = await texto(page, '#pedir-reembolso');
  ok(caixa.includes('Pedir reembolso') && caixa.includes('Reembolso estimado: R$ 57,14') && caixa.includes('créditos ainda não usados (R$ 60 de R$ 105)') && caixa.includes('Motivo do pedido'),
    'a caixa mostra o reembolso estimado (só os créditos não usados) e pede o motivo — ' + caixa.slice(0, 160));
  await page.click('#pedir-reembolso-enviar');
  await page.waitForTimeout(200);
  ok((await texto(page, '#pedir-reembolso-erro')).includes('Conte o motivo'), 'sem o motivo, pede o motivo');
  await page.fill('#pedir-reembolso-motivo', 'Comprei o valor errado.');
  await page.click('#pedir-reembolso-enviar');
  await page.waitForTimeout(600);
  ok(!(await page.$('#pedir-reembolso')) && (await texto(page, '#parceiros .pc-main')).includes('Pedido de reembolso enviado') && (await texto(page, '#pc-pag-compras')).includes('em análise pelo GuiaTennis') && !(await page.$('[data-pedir-reembolso]')),
    'enviado: o aviso e "Reembolso pedido em … · em análise", sem pedir de novo');
  await browser.close();

  // ---- O admin estorna (com a sugestão) e recusa ----
  ({ browser, page } = await abrir({ admin: true, q: 'admin/compras' }));
  let chamadas = [];
  await page.route('**/.netlify/functions/pagamento', async (r) => {
    const c = JSON.parse(r.request().postData() || '{}'); chamadas.push(c);
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(c.acao === 'conferir' ? { conferidas: 3, estornos: 1, erros: 0 } : { situacao: 'parcial' }) });
  });
  await page.evaluate((id) => {
    window.__db.academias.find(a => a.id === 'a1').envios_de_aviso = 60;
    window.__compras = [
      { id, academia_id: 'a1', valor: 100, forma: 'pix', situacao: 'paga', tipo: 'creditos', paga_em: new Date().toISOString(), created_at: new Date().toISOString(),
        reembolso: { id: 'rr-1', situacao: 'aberto', motivo: 'Comprei o valor errado.', created_at: new Date().toISOString(), quem: 'Ana Dona' } },
      { id: '00000000-0000-4000-8000-0000000000e2', academia_id: 'a1', valor: 49, forma: 'cartao', situacao: 'paga', tipo: 'plano', plano: 'premium', periodo: 'mensal', paga_em: new Date().toISOString(), created_at: new Date().toISOString(),
        reembolso: { id: 'rr-2', situacao: 'aberto', motivo: 'Não vou usar.', created_at: new Date().toISOString() } },
    ];
    carregarComprasDoAdmin();
  }, COMPRA);
  await page.waitForTimeout(600);
  const bloco = await texto(page, '#app');
  ok(bloco.includes('Pedidos de reembolso (2)') && bloco.includes('Motivo: Comprei o valor errado.') && bloco.includes('Conferir com o Mercado Pago'), 'admin: os pedidos de reembolso no alto, com o motivo, e "Conferir com o Mercado Pago"');
  await page.click(`[data-estornar="${COMPRA}"]`);
  await page.waitForTimeout(400);
  ok((await texto(page, '#adm-estorno-info')).includes('Sugerido: R$ 57,14') && await page.inputValue('#adm-estorno-valor') === '57,14', 'Estornar: sugere R$ 57,14 (os créditos não usados), com o valor editável');
  await page.click('#adm-estorno-ok');
  await page.waitForTimeout(700);
  ok(await page.evaluate(() => window.__estornoPedido && window.__estornoPedido.valor === 57.14) && chamadas.some(c => c.acao === 'estornar' && c.compra === '00000000-0000-4000-8000-0000000000e1') && !(await page.$('#adm-estorno')),
    'pede o estorno no banco e a função devolve no Mercado Pago');
  page.once('dialog', d => d.accept('O plano mensal não tem devolução depois de 7 dias.'));
  await page.click('[data-recusar-reembolso="rr-2"]');
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => window.__compras[1].reembolso.situacao === 'recusado' && /7 dias/.test(window.__compras[1].reembolso.resposta)), 'Recusar: a resposta vai para a academia');
  await page.click('#adm-conferir-mp');
  await page.waitForTimeout(600);
  ok(chamadas.some(c => c.acao === 'conferir') && (await texto(page, '#app')).includes('Conferidas 3 compras com o Mercado Pago: 1 estorno aplicado'), '"Conferir com o Mercado Pago" mostra o que encontrou');
  await browser.close();

  // ---- A academia vê o reembolso feito e o recusado ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/pagamentos', premium: ['a1'] }));
  await page.evaluate((id) => {
    window.__compras = [
      { id, academia_id: 'a1', valor: 100, forma: 'pix', situacao: 'paga', tipo: 'creditos', paga_em: new Date().toISOString(), created_at: new Date().toISOString(), valor_estornado: 57.14, estornada_em: new Date().toISOString() },
      { id: 'e3', academia_id: 'a1', valor: 49, forma: 'cartao', situacao: 'paga', tipo: 'plano', plano: 'premium', periodo: 'mensal', paga_em: new Date().toISOString(), created_at: new Date().toISOString(),
        reembolso: { situacao: 'recusado', resposta: 'O plano mensal não tem devolução depois de 7 dias.' } },
    ];
    carregarComprasDaAcademia();
  }, COMPRA);
  await page.waitForTimeout(500);
  const lista = await texto(page, '#pc-pag-compras');
  ok(lista.includes('Reembolso de R$ 57,14 em') && lista.includes('Reembolso não aprovado: O plano mensal não tem devolução depois de 7 dias.'), 'Pagamentos mostra o reembolso feito e a resposta do recusado — ' + lista.slice(0, 200));
  await browser.close();
  console.log('\nreembolso.js: fim');
})();
