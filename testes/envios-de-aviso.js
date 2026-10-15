// Pedido do Breno em 14/10/2026 (regra 104): o Completo e o Premium compram
// envios para mandar avisos por e-mail aos jogadores (o Premium paga menos);
// só o Premium publica promoções.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);
const dia = (n) => new Date(Date.now() + n * 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

(async () => {
  // ---- Básico: Avisos trancado ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/avisos' });
  await page.waitForTimeout(400);
  ok((await texto(page, '#parceiros .pc-main')).includes('Disponível no plano Completo') && !(await page.$('#pc-aviso-titulo')), 'Básico: Avisos por e-mail trancado, "Disponível no plano Completo"');
  ok(await page.evaluate(() => PC_MENU_LOGADO.some(x => x.aba === 'avisos' && x.t === 'Avisos por e-mail')), '"Avisos por e-mail" no menu do Parceiros');
  await browser.close();

  // ---- Completo sem envios: não manda; com envios: manda e gasta 1 ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/avisos', completo: ['a1'] }));
  await page.waitForTimeout(400);
  let corpo = await texto(page, '#parceiros .pc-main');
  const link = await page.evaluate(() => document.querySelector('#pc-saldo a')?.getAttribute('href') || '');
  ok(corpo.includes('Nenhum envio disponível') && await page.isDisabled('#pc-aviso-enviar') && decodeURIComponent(link).includes('comprar envios de aviso'),
    'Completo sem envios: o botão fica desligado e "Comprar envios" abre o WhatsApp');
  ok(await page.evaluate(() => promocoesLiberadas(minhaAcademia()) === false), 'o Completo não publica promoções');
  await page.evaluate(async () => { window.__db.academias.find(a => a.id === 'a1').envios_de_aviso = 2; await carregarAvisosDaAcademia(); });
  await page.waitForTimeout(200);
  ok((await texto(page, '#pc-saldo')).includes('2 envios disponíveis') && !(await page.isDisabled('#pc-aviso-enviar')), 'com 2 envios, o saldo aparece e o botão liga');
  await page.evaluate(() => { window.__promoAviso = { aviso: 'enviado', avisados: 9 }; });
  await page.fill('#pc-aviso-titulo', 'Turma nova aos sábados');
  await page.fill('#pc-aviso-mensagem', 'Abrimos uma turma para iniciantes aos sábados, às 9h.');
  await page.click('#pc-aviso-enviar');
  await page.waitForTimeout(400);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Aviso mandado: chega a 9 jogadores') && corpo.includes('1 envio disponível') && corpo.includes('chegou a 9 jogadores'), 'manda o aviso, gasta 1 envio e mostra na lista');
  ok(await page.isDisabled('#pc-aviso-enviar') && corpo.includes('já mandou um aviso nesta semana'), 'no máximo 1 aviso por semana: o botão desliga');
  await browser.close();

  // ---- Premium: a caixinha da promoção mostra o saldo; sem envios, pede para comprar ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes', premium: ['a1'], envios: { a1: 3 } }));
  await page.waitForTimeout(400);
  ok((await texto(page, '.pc-promo-avisar')).includes('usa 1 envio · 3 envios disponíveis') && await page.isChecked('#pc-promo-avisar'), 'Premium: "Avisar por e-mail" mostra que usa 1 envio e o saldo');
  await page.evaluate(() => { window.__promoAviso = { aviso: 'enviado', avisados: 4 }; });
  await page.fill('#pc-promo-titulo', 'Aula experimental grátis');
  await page.fill('#pc-promo-ate', dia(15));
  await page.click('#pc-promo-salvar');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').envios_de_aviso === 2) && (await texto(page, '#parceiros .pc-main')).includes('4 jogadores'), 'a promoção avisada gasta 1 envio');
  await browser.close();
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes', premium: ['a1'] }));
  await page.waitForTimeout(400);
  ok(!(await page.$('#pc-promo-avisar')) && (await texto(page, '.pc-promo-avisar')).includes('compre envios'), 'Premium sem envios: no lugar da caixinha, "compre envios"');
  await browser.close();

  // ---- Planos e painel do admin ----
  ({ browser, page } = await abrir({ q: 'parceiros/planos' }));
  await page.waitForTimeout(300);
  const planos = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.pc-plano')].map(p => [p.querySelector('.pc-plano-n')?.innerText.trim(), [...p.querySelectorAll('li:not(.nao)')].map(l => l.innerText).join(' | ')])));
  ok(planos['Completo'].includes('Avisos e promoções por e-mail') && !planos['Completo'].includes('Promoções na ficha') && planos['Premium'].includes('Promoções na ficha'), 'Planos: avisos por envio no Completo e no Premium; promoções só no Premium');
  await browser.close();
  ({ browser, page } = await abrir({ admin: true, q: 'admin', completo: ['a1'], envios: { a1: 1 }, w: 1280 }));
  await page.waitForTimeout(500);
  await page.click('.adm-nav [data-adm-aba="academias"]');
  await page.waitForTimeout(300);
  await page.click('[data-adm-academia="a1"]');
  await page.waitForTimeout(500);
  ok((await texto(page, '.adm-acad.aberta [data-envios-de="a1"]')) === '1', 'o admin vê o saldo de envios da academia');
  await page.click('.adm-acad.aberta [data-envios-somar="a1"][data-q="5"]');
  await page.waitForTimeout(400);
  ok((await texto(page, '.adm-acad.aberta [data-envios-de="a1"]')) === '6' && await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').envios_de_aviso === 6), 'o admin soma 5 envios depois do Pix');
  await browser.close();
})();
