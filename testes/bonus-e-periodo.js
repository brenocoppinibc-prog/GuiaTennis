// Regra 315 (22/11/2026): "deixe mais chamativo o 5% de crédito e falar vira …
// é muito informal"; "ao voltar do qr code, voltar para selecionar o valor";
// "'o normal é R$ 89' informal também e está muito básico a seleção entre o
// período". O bônus do Pix em destaque, o voltar do QR e o período em cartões.
const { abrir, ok } = require('./harness');
const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' '), sel);

(async () => {
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/creditos', premium: ['a1'] });
  await page.route('**/.netlify/functions/pagamento', r => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ forma: 'pix', valor: 100, qr: 'iVBORw0KGgo=', copia: '00020101PIX', expira: new Date(Date.now() + 30 * 60 * 1000).toISOString() }) }));
  await page.waitForTimeout(500);
  let corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Bônus de 5% no Pix.') && corpo.includes('Receba R$ 105 em créditos') && corpo.includes('Mais escolhido') && !/vira R\$/.test(corpo),
    'créditos: o bônus do Pix em destaque no alto e "Receba R$ 105 em créditos", sem o "vira" — ' + (corpo.match(/Bônus de 5%[^.]*\./) || [''])[0]);
  const resumo = await texto(page, '.pc-checkout-resumo');
  ok(/Créditos\s+R\$ 100,00\s+Bônus do Pix \(5%\)\s+\+ R\$ 5,00 em créditos\s+Taxas\s+R\$ 0,00\s+Total\s+R\$ 100,00\s+Você recebe\s+R\$ 105,00 em créditos/.test(resumo),
    'o resumo: o bônus antes do total e, depois, quanto a academia recebe — ' + resumo.slice(0, 160));
  ok(await page.$('.pc-checkout-resumo [data-menu="termos"]'), '"Termos de Uso" no resumo é um link para os Termos');
  ok((await texto(page, '.pc-checkout-seguro-nota')).includes('Os dados do cartão vão direto para o Mercado Pago, sem passar pelo GuiaTennis'), 'a frase do cartão, formal e natural');
  await page.click('[data-compra-forma="cartao"]');
  await page.waitForTimeout(150);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Pague com Pix e receba 5% a mais em créditos') && corpo.includes('No Pix, receba R$ 105'), 'no cartão, o convite para o Pix com o bônus');
  await page.click('[data-compra-forma="pix"]');
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(600);
  ok((await texto(page, '#pc-compra-voltar-escolha')).includes('Voltar e trocar o valor') && !(await page.$('#pc-creditos-voltar')), 'no QR code, o voltar é "Voltar e trocar o valor"');
  await page.click('#pc-compra-voltar-escolha');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => !state.pcCompra.passo && state.pcCompra.valor === 100 && state.pcCompra.forma === 'pix' && !state.pcCompra.erro && state.parceirosAba === 'creditos') && await page.$('[data-compra-valor="100"].on'),
    'volta à escolha do valor, com o mesmo valor e a mesma forma, sem aviso de erro');
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(600);
  await page.goBack();
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => state.page === 'parceiros' && state.parceirosAba === 'creditos' && !state.pcCompra.passo && location.pathname === '/parceiros/creditos'), 'o voltar do celular no QR code também volta à escolha do valor');
  await browser.close();

  // O período do plano em dois cartões.
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/plano' }));
  await page.evaluate(() => { window.__db.academias.find(a => a.id === 'a1').plano = 'completo'; window.__assinaturas = { a1: { plano: 'premium', ate: new Date(Date.now() - 864e5).toISOString(), depois: 'completo', testeUsado: true, encerrada: true } }; delete state.assinaturas; render(); });
  await page.waitForTimeout(400);
  await page.click('.pc-planos [data-escolher-plano="premium"]');
  await page.waitForTimeout(400);
  const mensal = await texto(page, '.pc-periodo[data-compra-periodo="mensal"]'), anual = await texto(page, '.pc-periodo[data-compra-periodo="anual"]');
  ok(mensal.includes('R$ 89') && mensal.includes('R$ 49 por mês') && mensal.includes('Preço de lançamento') && await page.$('.pc-periodo[data-compra-periodo="mensal"] .pc-periodo-riscado'),
    'mensal: o preço regular riscado, R$ 49 por mês e "Preço de lançamento" — ' + mensal);
  ok(anual.includes('2 meses grátis') && anual.includes('R$ 588') && anual.includes('R$ 490 por ano') && anual.includes('Equivale a R$ 40,83 por mês') && anual.includes('Economize R$ 98'),
    'anual: o selo "2 meses grátis", R$ 588 riscado, o equivalente por mês e a economia — ' + anual);
  ok(!(await texto(page, '#parceiros .pc-main')).includes('o normal é') && !(await texto(page, '#parceiros .pc-main')).includes('vira R$'), 'sem "o normal é" e sem "vira" na compra');
  await page.click('.pc-periodo[data-compra-periodo="anual"]');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => state.pcCompra.periodo === 'anual') && await page.$('.pc-periodo.on[data-compra-periodo="anual"]'), 'tocar no cartão escolhe o anual');
  // No Parceiros, "Fale com a gente": o WhatsApp primeiro; depois as perguntas e o chat.
  await page.evaluate(() => { state.showContato = true; render(); });
  await page.waitForTimeout(200);
  const ordem = await page.evaluate(() => [...document.querySelectorAll('.contato-opcao')].map(e => e.dataset.contato));
  ok(ordem.join(',') === 'WhatsApp,Perguntas frequentes,Chat de ajuda,Instagram,E-mail', 'Parceiros: "Fale com a gente" com o WhatsApp primeiro, depois as perguntas e o chat — ' + ordem.join(', '));
  await page.click('[data-ir-perguntas]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.parceirosAba === 'ajuda' && !state.showContato), '"Perguntas frequentes" abre a Ajuda do Parceiros');
  ok(await page.$('#parceiros .pc-contato a.cta-primary[href^="https://wa.me/5511927456457"]') && (await texto(page, '#parceiros .pc-contato')).includes('Falar no WhatsApp'), 'na Ajuda, "Fale com o GuiaTennis" com o WhatsApp primeiro');
  await browser.close();
  // Jogadores: as perguntas ("Como funciona") primeiro, depois o chat.
  ({ browser, page } = await abrir({}));
  await page.evaluate(() => { state.showContato = true; render(); });
  await page.waitForTimeout(200);
  const ordemJ = await page.evaluate(() => [...document.querySelectorAll('.contato-opcao')].map(e => e.dataset.contato));
  ok(ordemJ.join(',') === 'Perguntas frequentes,Chat de ajuda,WhatsApp,Instagram,E-mail', 'jogadores: as perguntas primeiro, depois o chat — ' + ordemJ.join(', '));
  await page.click('[data-ir-perguntas]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.page === 'como-funciona'), '"Perguntas frequentes" abre o "Como funciona"');
  await browser.close();
  console.log('\nbonus-e-periodo.js: fim');
})();
