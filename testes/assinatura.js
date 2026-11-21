// A assinatura do Premium (regra 310, 21/11/2026): "pode aparecer completo de
// 49 de graça, Premium 89 por 49, faça tudo"; "deixaria o Premium com 1° mês
// grátis e se cancelar a assinatura, ter opção de básico ou completo". Mais os
// gatilhos aprovados: as vistas do mês no Básico, a barra da ficha e o selo de
// fundadora.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' '), sel);

(async () => {
  // ---- Os cartões: o riscado e o preço de lançamento ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/plano' });
  await page.waitForTimeout(500);
  const cartao = (k) => texto(page, `.pc-planos [data-plano-cartao="${k}"]`);
  let completo = await cartao('completo'), premium = await cartao('premium');
  ok(completo.includes('R$ 49 Grátis') && completo.includes('Por tempo limitado') && completo.includes('avisamos 30 dias antes de cobrar')
    && await page.evaluate(() => !!document.querySelector('[data-plano-cartao="completo"] s.pc-plano-riscado')),
    'Completo: R$ 49 riscado e "Grátis", com o aviso de 30 dias — ' + completo.slice(0, 120));
  ok(premium.includes('1º mês grátis') && premium.includes('R$ 89 R$ 49 por mês') && premium.includes('Preço de lançamento · 45% abaixo do normal')
    && premium.includes('R$ 46 por mês no Pix') && premium.includes('ou R$ 490 por ano · 2 meses grátis'),
    'Premium: 1º mês grátis, R$ 89 riscado por R$ 49 (preço de lançamento), Pix e anual — ' + premium.slice(0, 160));
  ok((await texto(page, '.pc-planos [data-escolher-plano="premium"]')) === 'Experimentar 1 mês grátis', 'o botão do Premium: "Experimentar 1 mês grátis"');
  ok((await texto(page, '#parceiros .pc-main')).includes('Sem fidelidade: cancele quando quiser, aqui em Plano.'), 'embaixo: sem fidelidade, cancele quando quiser');

  // Regra 311: a oferta no alto, o destaque no Premium.
  const oferta = await texto(page, '#pc-mes-gratis');
  ok(oferta.includes('1 mês grátis · sem cartão') && oferta.includes('Experimente o Premium na Só Aula Tennis') && oferta.includes('Nada é cobrado sozinho') && oferta.includes('Sem fidelidade')
    && await page.evaluate(() => document.querySelector('.pc-plano.destaque')?.dataset.planoCartao === 'premium'),
    'no alto, a oferta do mês grátis (o que ganha, o preço depois, sem fidelidade), e o destaque no Premium — ' + oferta.slice(0, 80));
  // ---- O mês grátis ----
  let pergunta = '';
  page.once('dialog', d => { pergunta = d.message(); d.accept(); });
  await page.click('.pc-planos [data-escolher-plano="premium"]');
  await page.waitForTimeout(700);
  ok(pergunta.includes('Começar o mês grátis do Premium') && pergunta.includes('Sem cartão e sem cobrança') && pergunta.includes('passa sozinha para o Completo'),
    'pergunta antes, sem cartão e sem cobrança — ' + pergunta.split('\n')[0]);
  ok(await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').plano === 'premium' && (window.__rpcs.find(r => r.nome === 'comecar_mes_gratis') || {}).args.p_academia === 'a1'),
    'vai para o banco (comecar_mes_gratis) e a academia fica no Premium');
  let bloco = await texto(page, '#pc-assinatura');
  ok(bloco.includes('Mês grátis do Premium até') && bloco.includes('Continuar no Premium por R$ 49') && bloco.includes('Cancelar assinatura') && bloco.includes('nada é cobrado'),
    'o bloco "Sua assinatura": mês grátis até a data, continuar por R$ 49 e cancelar — ' + bloco.slice(0, 140));
  ok((await texto(page, '#parceiros .pc-main')).includes('Pronto! A Só Aula Tennis está no Premium, grátis até'), 'o recado com a data do fim');
  ok(bloco.includes('Faltam 30 dias') && !(await page.$('#pc-mes-gratis')), 'o bloco conta os dias que faltam, e a oferta some');
  ok(!(await page.$('.pc-planos [data-escolher-plano="premium"]')) && !(await page.$('[data-plano-cartao="premium"] .pc-plano-gratis')), 'no Premium, o mês grátis some dos cartões');

  // ---- Cancelar: escolhe Completo ou Básico e vê o que sai ----
  await page.click('[data-assinatura="cancelar"]');
  await page.waitForTimeout(200);
  let caixa = await texto(page, '#cancelar-assinatura');
  ok(caixa.includes('Cancelar a assinatura do Premium?') && caixa.includes('continua até') && caixa.includes('Completo') && caixa.includes('Básico')
    && caixa.includes('o selo dourado') && caixa.includes('Continuar no Premium'),
    'a caixa: o prazo, Completo ou Básico, o que sai e "Continuar no Premium" — ' + caixa.slice(0, 120));
  ok(caixa.toLowerCase().indexOf('deixa de ter') < caixa.toLowerCase().indexOf('e passa para') && caixa.includes('No anual, 2 meses saem de graça'), 'primeiro o que sai, depois a escolha, e o anual como alternativa (regra 311)');
  await page.check('#cancelar-assinatura input[value="basico"]');
  ok((await texto(page, '#cancelar-assinatura-sai')).includes('até 1 pessoa'), 'escolheu o Básico: a lista mostra o que muda nele');
  await page.click('#cancelar-assinatura-sim');
  await page.waitForTimeout(700);
  bloco = await texto(page, '#pc-assinatura');
  ok(await page.evaluate(() => window.__assinaturas.a1.cancelada && window.__assinaturas.a1.depois === 'basico' && window.__db.academias.find(a => a.id === 'a1').plano === 'premium'),
    'cancelada: o Premium continua até o fim, depois vai para o Básico');
  ok(bloco.includes('Assinatura cancelada: o Premium vai até') && bloco.includes('passa para o Básico') && bloco.includes('Continuar no Premium'),
    'o bloco diz até quando e para onde vai, com "Continuar no Premium" — ' + bloco.slice(0, 120));
  await page.click('[data-assinatura="continuar"]');
  await page.waitForTimeout(700);
  ok(await page.evaluate(() => !window.__assinaturas.a1.cancelada) && (await texto(page, '#pc-assinatura')).includes('Continuar no Premium por R$ 49'), '"Continuar no Premium" desfaz o cancelamento');

  // ---- Pagar: a compra do Premium, mesmo estando no mês grátis ----
  await page.click('[data-assinatura="pagar"]');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => state.parceirosAba === 'creditos' && state.pcCompra.tipo === 'plano' && state.pcCompra.plano === 'premium'), '"Continuar no Premium" abre a compra do Premium');
  await browser.close();

  // ---- O mês grátis já usado: "Assinar o Premium" vai para a compra ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/plano' }));
  await page.evaluate(() => { window.__assinaturas = { a1: { plano: 'premium', ate: new Date(Date.now() - 864e5).toISOString(), depois: 'completo', testeUsado: true, encerrada: true } }; delete state.assinaturas; render(); });
  await page.waitForTimeout(400);
  ok((await texto(page, '.pc-planos [data-escolher-plano="premium"]')) === 'Assinar o Premium' && !(await page.$('#pc-assinatura')), 'mês grátis usado: "Assinar o Premium", sem o bloco da assinatura');
  await page.click('.pc-planos [data-escolher-plano="premium"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => state.pcCompra && state.pcCompra.plano === 'premium'), '"Assinar o Premium" abre a compra');
  // Completo: grátis, muda na hora.
  await page.evaluate(() => { irParceiros('plano'); });
  await page.waitForTimeout(300);
  page.once('dialog', d => d.accept());
  await page.click('.pc-planos [data-escolher-plano="completo"]');
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').plano === 'completo'), 'o Completo, grátis por enquanto, muda na hora');
  await browser.close();

  // ---- O Básico: as vistas do mês; o selo de fundadora ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel' }));
  await page.evaluate(() => { window.__fundadoras = ['a1']; window.__db.academias.find(a => a.id === 'a1').plano = 'basico'; });
  await page.evaluate(async () => { await loadEverything(); state.numeros = null; render(); });
  await page.waitForTimeout(700);
  const painel = await texto(page, '#parceiros .pc-main');
  ok(painel.includes('7 vezes que a sua ficha foi aberta em') && painel.includes('Quantos chamaram no WhatsApp? De quais bairros vieram? O Premium mostra.') && await page.$('.pc-vistas .cta-primary[data-escolher-plano="premium"]'),
    'Básico: o número grande das vistas do mês, a curiosidade e o convite do Premium em destaque (regra 311) — ' + (painel.match(/7 vezes[^.]*/) || [''])[0]);
  ok(painel.includes('Fundadora') && painel.includes('é uma das 30 primeiras academias do GuiaTennis'), 'o painel diz que a academia é fundadora, com o selo');
  ok(/Sua ficha está \d+% completa|Ficha completa/.test(painel), 'a barra da ficha em porcentagem ("Sua ficha está 78% completa")');
  await page.evaluate(() => openCourt('a1'));
  await page.waitForTimeout(400);
  ok((await texto(page, '.ficha-confirmada')).includes('Fundadora do GuiaTennis'), 'a ficha mostra "Fundadora do GuiaTennis" na linha da confirmação');
  await browser.close();

  // ---- Banco sem o SQL: nada quebra, o Premium segue pela compra ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/plano' }));
  await page.evaluate(() => { window.__semAssinatura = true; delete state.assinaturas; render(); });
  await page.waitForTimeout(400);
  ok((await texto(page, '.pc-planos [data-escolher-plano="premium"]')) === 'Assinar o Premium' && !(await page.$('#pc-assinatura')), 'banco sem a assinatura: sem mês grátis e sem o bloco, e nada quebra');
  await browser.close();
  console.log('\nassinatura.js: fim');
})();
