// Plano e créditos pelo site (pedido do Breno em 19/10/2026: "eu quero que
// as academias possam comprar direto no site a quantidade de créditos e
// selecionar o plano tbm"). O plano é grátis por enquanto e muda na hora;
// os créditos são pagos com Pix na tela ou cartão no Mercado Pago (a função
// do Netlify é fingida aqui).
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);
const ID = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');

(async () => {
  // ---- O plano: o responsável escolhe e muda na hora ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/plano' });
  await page.waitForTimeout(400);
  let corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Grátis por enquanto') && corpo.includes('Por enquanto, todos os planos são grátis: o responsável principal muda aqui, na hora.'), 'Planos: "Grátis por enquanto" e o recado de que muda ali mesmo');
  ok(!(await page.$('.pc-planos a[href*="wa.me"]')) && await page.$('.pc-planos [data-escolher-plano="completo"]') && await page.$('.pc-planos [data-escolher-plano="premium"]'), 'os planos se escolhem ali, sem o WhatsApp');
  let pergunta = '';
  page.once('dialog', d => { pergunta = d.message(); d.accept(); });
  await page.click('.pc-planos [data-escolher-plano="premium"]');
  await page.waitForTimeout(600);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(pergunta.includes('Passar a Só Aula Tennis para o plano Premium?') && pergunta.includes('Por enquanto é grátis'), 'pergunta antes de mudar — ' + pergunta.split('\n')[0]);
  ok(await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').plano === 'premium' && planoAtual() === 'premium') && corpo.includes('Pronto! A Só Aula Tennis agora está no plano Premium.'),
    'muda para o Premium na hora, com o recado');
  ok(await page.evaluate(() => (window.__rpcs.find(r => r.nome === 'escolher_plano') || {}).args.p_plano === 'premium'), 'vai para o banco (escolher_plano)');
  ok(await page.$('.pc-planos [data-escolher-plano="basico"]') && (await texto(page, '.pc-planos [data-escolher-plano="basico"]')) === 'Voltar ao Básico', 'no Premium, dá para voltar ao Básico');
  page.once('dialog', d => { pergunta = d.message(); d.dismiss(); });
  await page.click('.pc-planos [data-escolher-plano="basico"]');
  await page.waitForTimeout(300);
  ok(pergunta.includes('Na hora:') && pergunta.includes('sai o selo dourado') && await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').plano === 'premium'), 'voltar ao Básico mostra o que muda e, sem confirmar, não muda');
  await browser.close();

  // ---- A equipe vê, mas não muda ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/plano' }));
  await page.evaluate(() => { window.__db.academia_vinculos.forEach(v => { v.papel = 'equipe'; }); contaAcademia.papel = 'equipe'; render(); });
  await page.waitForTimeout(200);
  ok(await page.isDisabled('.pc-planos .pc-plano.destaque button') && (await texto(page, '.pc-planos')).includes('Só o responsável principal muda o plano.'), 'na equipe, o botão fica apagado e diz quem muda');
  await browser.close();

  // ---- Créditos: Pix na própria tela ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes-email', completo: ['a1'] }));
  const chamadas = [];
  let resposta = (corpo) => ({ status: 200, body: { forma: 'pix', valor: 100, qr: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', copia: '00020101PIXCOPIA', expira: new Date(Date.now() + 1800000).toISOString() } });
  await page.route('**/.netlify/functions/pagamento', async (rota) => {
    const corpo = JSON.parse(rota.request().postData() || '{}');
    chamadas.push(corpo);
    const r = corpo.acao === 'consultar' ? { status: 200, body: { situacao: 'aberta' } } : resposta(corpo);
    await rota.fulfill({ status: r.status, contentType: 'application/json', body: JSON.stringify(r.body) });
  });
  await page.waitForTimeout(400);
  await page.click('#pc-comprar-creditos');
  await page.waitForTimeout(200);
  corpo = await texto(page, '#pc-compra');
  ok(corpo.includes('Comprar créditos') && corpo.includes('R$ 50') && corpo.includes('R$ 200') && corpo.includes('Outro valor') && (await texto(page, '#pc-compra-pagar')) === 'Pagar R$ 100 com Pix', 'comprar: atalhos de valor, R$ 100 marcado e Pix de saída');
  await page.click('[data-compra-valor="outro"]');
  await page.waitForTimeout(150);
  await page.fill('#pc-compra-outro', '15');
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(200);
  ok((await texto(page, '#pc-compra')).includes('de R$ 20 a R$ 5.000') && !chamadas.length, 'outro valor abaixo de R$ 20 não passa');
  await page.click('[data-compra-valor="100"]');
  await page.waitForTimeout(150);
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(500);
  corpo = await texto(page, '#pc-compra');
  ok(chamadas[0] && chamadas[0].acao === 'cobrar' && chamadas[0].compra === ID(1) && !('valor' in chamadas[0]), 'abre a compra no banco e pede a cobrança só com o id (o valor sai do banco)');
  ok(corpo.includes('Pague R$ 100 com Pix') && await page.isVisible('.pc-compra-qr') && (await page.inputValue('#pc-compra-codigo')) === '00020101PIXCOPIA' && corpo.includes('Esperando o pagamento'), 'Pix: o QR code, o copia e cola e "Esperando o pagamento"');
  await page.click('#pc-compra-copiar');
  await page.waitForTimeout(150);
  ok((await texto(page, '#pc-compra-copiar')) === 'Copiado', '"Copiar" copia o código');
  // O Mercado Pago confirmou: os créditos entram e a tela confere sozinha.
  await page.evaluate(() => { window.__compras[0].situacao = 'paga'; window.__db.academias.find(a => a.id === 'a1').envios_de_aviso = 100; });
  await page.waitForTimeout(5000);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Pagamento confirmado') && corpo.includes('R$ 100 entraram nos créditos') && /Créditos\s+R\$ 100/.test(await texto(page, '#pc-leilao')), 'pago: a tela confere sozinha e os créditos aparecem');
  await page.click('#pc-compra-fechar');
  await page.waitForTimeout(150);
  ok(!(await page.$('#pc-compra')), '"✕" fecha a compra');
  // Cartão: vai para a página do Mercado Pago.
  resposta = () => ({ status: 200, body: { forma: 'cartao', valor: 50, link: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=x' } });
  await page.route('https://www.mercadopago.com.br/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>Mercado Pago</p>' }));
  await page.click('#pc-comprar-creditos');
  await page.waitForTimeout(150);
  await page.click('[data-compra-valor="50"]');
  await page.click('[data-compra-forma="cartao"]');
  await page.waitForTimeout(150);
  ok((await texto(page, '#pc-compra-pagar')) === 'Pagar R$ 50 com cartão' && (await texto(page, '#pc-compra')).includes('página do Mercado Pago'), 'cartão: diz que paga na página do Mercado Pago');
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(800);
  ok(page.url().startsWith('https://www.mercadopago.com.br/checkout/'), 'e vai para a página do Mercado Pago');
  await browser.close();

  // ---- A volta do cartão: confere sozinha ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes-email?compra=' + ID(1), completo: ['a1'] }));
  await page.route('**/.netlify/functions/pagamento', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ situacao: 'paga' }) }));
  await page.waitForTimeout(500);
  ok((await texto(page, '#pc-compra')).includes('Conferindo o pagamento') && !(await page.evaluate(() => location.search.includes('compra='))), 'a volta do Mercado Pago confere o pagamento e tira o "compra=" do endereço');
  await page.waitForTimeout(4500);
  ok((await texto(page, '#parceiros .pc-main')).includes('Pagamento confirmado'), 'e mostra o pagamento confirmado');
  await browser.close();

  // ---- Sem o Mercado Pago ligado: o WhatsApp ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes-email', completo: ['a1'] }));
  await page.route('**/.netlify/functions/pagamento', r => r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ erro: 'desligado' }) }));
  await page.waitForTimeout(400);
  await page.click('#pc-comprar-creditos');
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(500);
  corpo = await texto(page, '#pc-compra');
  ok(corpo.includes('A compra pelo site ainda não está ligada') && decodeURIComponent(await page.getAttribute('#pc-compra a', 'href')).includes('comprar créditos para o leilão'), 'sem o Mercado Pago ligado, oferece a compra pelo WhatsApp');
  await browser.close();

  // ---- O admin vê as compras ----
  ({ browser, page } = await abrir({ admin: true, q: 'admin', w: 1280 }));
  await page.evaluate(() => { window.__compras = [{ id: 'k1', academia_id: 'a1', valor: 100, forma: 'pix', situacao: 'paga', created_at: '2026-10-19T12:00:00Z', paga_em: '2026-10-19T12:01:00Z' }]; });
  await page.click('.adm-nav [data-adm-aba="leiloes"]');
  await page.waitForTimeout(400);
  const adm = await texto(page, '#painel-admin');
  ok(adm.includes('Compras de créditos (30 dias)') && adm.includes('Só Aula Tennis · R$ 100 · Pix · paga') && adm.includes('Pagas: R$ 100'), 'o admin vê as compras de créditos — ' + adm.replace(/\s+/g, ' ').match(/Compras de créditos.{0,90}/)?.[0]);
  await browser.close();
})();
