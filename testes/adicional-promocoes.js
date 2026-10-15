// Pedido do Breno em 14/10/2026 (regra 104): o Completo pode pagar o
// adicional de Promoções, e a academia escolhe quando avisar por e-mail os
// jogadores que favoritaram ou estão perto.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);
const dia = (n) => new Date(Date.now() + n * 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

(async () => {
  // ---- Completo sem o adicional: trancado, com o "Quero o adicional" ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes', adicional: ['a1'] });
  await page.waitForTimeout(400);
  await page.evaluate(async () => { window.__db.academias.find(a => a.id === 'a1').adicional_promocoes = false; await loadEverything(); render(); });
  await page.waitForTimeout(200);
  let corpo = await texto(page, '#parceiros .pc-main');
  const link = await page.evaluate(() => document.querySelector('#pc-promo-adicional a')?.getAttribute('href') || '');
  ok(!(await page.$('#pc-promo-titulo')) && corpo.includes('adicional de Promoções') && decodeURIComponent(link).includes('Quero o adicional de Promoções'),
    'Completo sem o adicional: trancado, com "Quero o adicional" pelo WhatsApp');
  await browser.close();

  // ---- Completo com o adicional: publica, escolhe não avisar e avisa depois ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes', adicional: ['a1'] }));
  await page.waitForTimeout(400);
  ok(await page.isVisible('#pc-promo-titulo') && await page.isChecked('#pc-promo-avisar'), 'Completo com o adicional: o formulário, com "Avisar por e-mail" marcado');
  await page.fill('#pc-promo-titulo', 'Aula experimental grátis');
  await page.fill('#pc-promo-ate', dia(15));
  await page.uncheck('#pc-promo-avisar');
  await page.click('#pc-promo-salvar');
  await page.waitForTimeout(400);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(await page.evaluate(() => window.__ultimoAvisar === false) && corpo.includes('Quando quiser, toque em "Avisar os jogadores por e-mail"'), 'sem marcar o aviso, publica sem e-mail e diz como avisar depois');
  ok(await page.isVisible('[data-promo-avisar]'), 'a promoção sem aviso ganha "Avisar os jogadores por e-mail"');
  await page.evaluate(() => { window.__promoAviso = { aviso: 'enviado', avisados: 7 }; });
  await page.click('[data-promo-avisar]');
  await page.waitForTimeout(400);
  ok((await texto(page, '#parceiros .pc-main')).includes('O aviso por e-mail vai para 7 jogadores') && !(await page.$('[data-promo-avisar]')), 'avisar depois: o e-mail sai e o botão some');
  ok(await page.evaluate(async () => { await carregarPromocoes(); const c = state.allCourts.find(x => x.id === 'a1'); return promocoesLiberadas(c) && promocoesDe(c).length === 1; }), 'no site, a promoção do Completo com o adicional aparece');
  await browser.close();

  // ---- Planos: o adicional aparece no Completo ----
  ({ browser, page } = await abrir({ q: 'parceiros/planos' }));
  await page.waitForTimeout(300);
  const completo = await page.evaluate(() => [...document.querySelectorAll('.pc-plano')].find(p => p.querySelector('.pc-plano-n')?.innerText.startsWith('Completo'))?.innerText || '');
  ok(completo.includes('com o adicional de Promoções'), 'Planos: o Completo mostra as promoções com o adicional');
  await browser.close();

  // ---- Painel do admin: liga e desliga o adicional no Completo ----
  ({ browser, page } = await abrir({ admin: true, q: 'admin', adicional: ['a1'], w: 1280 }));
  await page.waitForTimeout(500);
  await page.click('.adm-nav [data-adm-aba="academias"]');
  await page.waitForTimeout(300);
  await page.click('[data-adm-academia="a1"]');
  await page.waitForTimeout(200);
  let pergunta = '';
  page.once('dialog', d => { pergunta = d.message(); d.accept(); });
  await page.click('.adm-acad.aberta .adicional-btn.active');
  await page.waitForTimeout(500);
  ok(pergunta.includes('As promoções saem da ficha') && await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').adicional_promocoes === false), 'o admin tira o adicional, depois de confirmar');
  await page.click('.adm-acad.aberta .adicional-btn');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').adicional_promocoes === true) && await page.isVisible('.adm-acad.aberta .adicional-btn.active'),
    'e liga de novo, sem pergunta');
  await browser.close();
})();
