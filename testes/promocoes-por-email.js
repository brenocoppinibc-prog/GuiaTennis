// Regra 317 (23/11/2026): Promover, tudo num pagamento só ("não podemos deixar
// tudo isso incluído para a academia não ter que pagar duas vezes em coisas
// diferentes"). As semanas e o alcance na mesma compra; a faixa patrocinada
// no início e na busca; o e-mail das promoções vem do alcance (sem lance); e
// o admin acompanha e divulga no Instagram. (Antes, este arquivo testava o
// leilão com lance separado, que saiu.)
const { abrir, ok } = require('./harness');
const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);

(async () => {
  // ---- Promover: as semanas e o alcance num pagamento só ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes', premium: ['a1'], envios: { a1: 200 }, precoPromocao: 10 });
  await page.waitForTimeout(400);
  let corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Alcance (opcional)') && corpo.includes('Sem alcance') && corpo.includes('num pagamento só') && corpo.includes('e-mail da semana do bairro') && !(await page.$('.pc-promo-partes')),
    'uma tela só: a promoção, as semanas e o alcance (opcional), sem a aba do leilão');
  await page.fill('#pc-promo-titulo', 'Primeira aula grátis');
  await page.click('[data-promo-semanas="2"]');
  await page.click('[data-promo-alcance="50"]');
  await page.waitForTimeout(400);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(/entre 1\.333 e 2\.000 aparições/.test(corpo) && corpo.includes('Sugerido para aparecer em cerca de 1 a cada 4 buscas') && corpo.includes('O preço muda todo dia'),
    'o alcance mostra a estimativa de aparições, o sugerido e que o preço muda todo dia — ' + (corpo.match(/Em Pinheiros[^.]*\./) || [''])[0]);
  ok(/2 semanas na ficha\s+R\$ 16\s+Alcance\s+R\$ 50\s+Total\s+R\$ 66/.test(await texto(page, '#pc-promo-preco')), 'o total soma as semanas (com os 15% do Premium) e o alcance — ' + await texto(page, '#pc-promo-preco'));
  await page.click('#pc-promo-revisar');
  await page.waitForTimeout(300);
  ok((await texto(page, '#pc-promo-revisao')).includes('Alcance R$ 50 · faixa patrocinada e e-mail do bairro') && (await texto(page, '#pc-promo-revisao')).includes('num pagamento só'), 'a revisão mostra o alcance e o pagamento único');
  await page.click('#pc-promo-salvar');
  await page.waitForTimeout(600);
  const args = await page.evaluate(() => (window.__rpcs.filter(x => x.nome === 'promover').slice(-1)[0] || {}).args);
  ok(args && args.p_alcance === 50 && args.p_semanas === 2 && (await texto(page, '#parceiros .conta-aviso')).includes('com R$ 50 de alcance na faixa patrocinada e no e-mail do bairro'),
    'publica pelo promover, com o alcance, e diz onde aparece');
  await page.evaluate(() => { const x = Object.values(window.__alcances)[0]; Object.assign(x, { gasto: 12.5, exibicoes: 410, toques: 23, avisados: 85 }); carregarPromocoesDaAcademia(); });
  await page.waitForTimeout(400);
  ok((await texto(page, '.pc-promo')).includes('Alcance: R$ 12,50 de R$ 50 usados · 410 aparições na faixa · 23 toques · e-mail para 85 jogadores') && !(await texto(page, '.pc-promo')).includes('Mandar por e-mail'),
    'a promoção mostra os números: alcance usado, aparições, toques e o e-mail');
  // O e-mail das promoções: só leitura, sem lance.
  await page.evaluate(() => irParceiros('promocoes-email'));
  await page.waitForTimeout(300);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('E-mail das promoções do bairro') && corpo.includes('sem lance separado') && !(await page.$('#pc-leilao-participar')) && !(await page.$('#pc-email-valor')), 'o e-mail das promoções vem do alcance: a página explica, sem lance');
  await browser.close();

  // ---- A faixa patrocinada na busca e no início ----
  ({ browser, page } = await abrir({ q: 'busca?q=Pinheiros' }));
  await page.evaluate(() => { window.__faixa = { promocao: 'pr-1', academia_id: 'a1', academia: 'Só Aula Tennis', titulo: 'Primeira aula grátis', detalhes: '' }; state.faixas = {}; render(); });
  await page.waitForTimeout(600);
  const faixa = await texto(page, '.faixa-patro');
  ok(/patrocinado/i.test(faixa) && faixa.includes('Só Aula Tennis') && faixa.includes('Primeira aula grátis') && await page.evaluate(() => document.querySelectorAll('.faixa-patro').length) === 1,
    'na busca, uma faixa pequena com "Patrocinado", o nome da academia e a promoção — ' + faixa);
  const pedidas = await page.evaluate(() => window.__faixaPedida);
  await page.evaluate(() => render());
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__faixaPedida) === pedidas, 'a mesma página não conta a aparição de novo a cada atualização');
  await page.click('.faixa-patro');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => window.__toques === 1 && state.page === 'court' && (state.selected === 'a1' || (state.selected && state.selected.id === 'a1'))), 'tocar na faixa conta o toque e abre a ficha');
  await browser.close();
  ({ browser, page } = await abrir({ admin: true, q: 'busca?q=Pinheiros' }));
  await page.evaluate(() => { window.__faixa = { promocao: 'pr-1', academia_id: 'a1', academia: 'Só Aula Tennis', titulo: 'Primeira aula grátis' }; state.faixas = {}; render(); });
  await page.waitForTimeout(500);
  ok(!(await page.$('.faixa-patro')) && !(await page.evaluate(() => window.__faixaPedida)), 'o admin não vê a faixa nem gasta o alcance das academias');
  await browser.close();

  // ---- O admin acompanha e divulga no Instagram ----
  ({ browser, page } = await abrir({ admin: true, q: 'admin/leiloes' }));
  await page.evaluate(() => {
    window.__promocoesDoAdmin = [{ id: 'pr-1', academia_id: 'a1', academia: 'Só Aula Tennis', bairro: 'Pinheiros', cidade: 'São Paulo', plano: 'premium', instagram: 'https://instagram.com/soaulatennis',
      titulo: 'Primeira aula grátis', detalhes: 'Para quem nunca fez aula aqui.', valida_ate: hojeEmBrasilia(10), semanas: 2, pago: 16, alcance: 50, gasto: 12.5, exibicoes: 410, toques: 23, emails: 85 }];
    carregarLeiloesDoAdmin();
  });
  await page.waitForTimeout(600);
  const bloco = await texto(page, '#adm-promocoes-no-ar');
  ok(bloco.includes('Promoções no ar (1)') && bloco.includes('Investimento: R$ 66 (alcance R$ 50, R$ 12,50 usados) · 410 aparições na faixa · 23 toques · e-mail para 85 jogadores') && bloco.includes('Copiar a legenda') && bloco.includes('Baixar a imagem'),
    'o admin vê as promoções no ar, o investimento e os números, com a legenda e a imagem — ' + bloco.slice(0, 200));
  const legenda = await page.evaluate(() => legendaDaPromocao(window.__promocoesDoAdmin[0]));
  ok(legenda.startsWith('🎾 Primeira aula grátis na Só Aula Tennis, em Pinheiros.') && legenda.includes('@soaulatennis') && legenda.includes('#pinheiros') && legenda.includes('#guiatennis'), 'a legenda pronta para o Instagram, com o @ da academia e as hashtags');
  const baixou = await Promise.all([page.waitForEvent('download', { timeout: 5000 }).catch(() => null), page.click('[data-imagem-promo="pr-1"]')]);
  ok(baixou[0] && baixou[0].suggestedFilename() === 'promocao-so-aula-tennis.png', '"Baixar a imagem" gera a imagem do feed (1080 × 1350)');
  await browser.close();
  console.log('\npromocoes-por-email.js: fim');
})();
