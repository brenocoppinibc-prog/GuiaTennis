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

  // ---- Créditos: uma página própria, com o caminho até o pagamento (22/10/2026) ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes-email', premium: ['a1'] }));
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
  await page.waitForTimeout(300);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(await page.evaluate(() => state.parceirosAba === 'creditos' && location.pathname === '/parceiros/creditos' && !document.querySelector('.pc-nav-i') && !document.querySelector('.pc-rodape')) && (await texto(page, '.pc-checkout-seguro')) === 'Pagamento seguro',
    '"Comprar créditos" abre uma página própria, sem o menu do Parceiros, com "Pagamento seguro" no alto');
  ok(corpo.includes('Comprar créditos') && corpo.includes('R$ 50') && corpo.includes('R$ 200') && corpo.includes('Outro valor') && corpo.includes('Mais escolhido') && (await texto(page, '#pc-compra-pagar')) === 'Continuar para o pagamento · R$ 100',
    'o valor (R$ 100 marcado), a forma de pagamento e "Continuar para o pagamento"');
  ok(/Créditos\s+R\$ 100,00\s+Taxas\s+R\$ 0,00\s+Total\s+R\$ 100,00/.test(await texto(page, '.pc-checkout-resumo')), 'o resumo do pedido: créditos, taxas e total');
  ok(await page.evaluate(() => [...document.querySelectorAll('.pc-checkout-trilha li')].map(l => l.className).join(',')) === 'agora,,', 'as etapas da compra, na primeira');
  await page.click('[data-compra-valor="outro"]');
  await page.waitForTimeout(150);
  await page.fill('#pc-compra-outro', '15');
  await page.waitForTimeout(150);
  ok(/Total\s+R\$ 15,00/.test(await texto(page, '.pc-checkout-resumo')) && (await page.evaluate(() => document.activeElement && document.activeElement.id)) === 'pc-compra-outro', 'o resumo acompanha o outro valor, sem tirar o cursor do campo');
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(200);
  ok((await texto(page, '#parceiros .pc-main')).includes('de R$ 20 a R$ 5.000') && !chamadas.length, 'outro valor abaixo de R$ 20 não passa');
  await page.click('[data-compra-valor="100"]');
  await page.waitForTimeout(150);
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(500);
  corpo = await texto(page, '#pc-compra');
  ok(chamadas[0] && chamadas[0].acao === 'cobrar' && chamadas[0].compra === ID(1) && !('valor' in chamadas[0]), 'abre a compra no banco e pede a cobrança só com o id (o valor sai do banco)');
  ok(corpo.includes('Pague R$ 100 com Pix') && corpo.includes('Abra o app do seu banco') && await page.isVisible('.pc-compra-qr') && (await page.inputValue('#pc-compra-codigo')) === '00020101PIXCOPIA' && corpo.includes('Esperando o pagamento'), 'Pix: o passo a passo, o QR code, o copia e cola e "Esperando o pagamento"');
  ok(await page.evaluate(() => [...document.querySelectorAll('.pc-checkout-trilha li')].map(l => l.className).join(',')) === 'feito,agora,', 'na etapa do pagamento');
  await page.click('#pc-compra-copiar');
  await page.waitForTimeout(150);
  ok((await texto(page, '#pc-compra-copiar')) === 'Copiado', '"Copiar" copia o código');
  // O Mercado Pago confirmou: os créditos entram e a página confere sozinha.
  await page.evaluate(() => { window.__compras[0].situacao = 'paga'; window.__db.academias.find(a => a.id === 'a1').envios_de_aviso = 100; });
  await page.waitForTimeout(5000);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Pagamento confirmado') && corpo.includes('R$ 100 entraram nos créditos da Só Aula Tennis') && /Saldo de créditos\s+R\$ 100/.test(corpo), 'pago: a página confere sozinha e mostra o saldo novo');
  await page.click('#pc-creditos-concluir');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.parceirosAba === 'promocoes-email' && !state.pcCompra) && /Créditos\s+R\$ 100/.test(await texto(page, '#pc-leilao')), '"Voltar ao leilão" volta, com os créditos');
  // Cartão: vai para a página do Mercado Pago.
  resposta = () => ({ status: 200, body: { forma: 'cartao', valor: 50, link: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=x' } });
  await page.route('https://www.mercadopago.com.br/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>Mercado Pago</p>' }));
  await page.click('#pc-comprar-creditos');
  await page.waitForTimeout(200);
  await page.click('[data-compra-valor="50"]');
  await page.click('[data-compra-forma="cartao"]');
  await page.waitForTimeout(150);
  ok((await texto(page, '#pc-compra-pagar')) === 'Ir para o Mercado Pago · R$ 50' && (await texto(page, '#parceiros .pc-main')).includes('página segura do Mercado Pago'), 'cartão: "Ir para o Mercado Pago"');
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(800);
  ok(page.url().startsWith('https://www.mercadopago.com.br/checkout/'), 'e vai para a página do Mercado Pago');
  await browser.close();

  // ---- Do lance para a compra e de volta: o leilão continua onde estava ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes-email', premium: ['a1'] }));
  await page.evaluate(async () => { window.__alcance = 143; await carregarPromocoesPorEmail(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { state.pcLeilaoPasso = 3; state.pcEmailForm = { titulo: 'Aula grátis', mensagem: 'Para quem nunca jogou aqui.', valor: '30' }; render(); });
  await page.waitForTimeout(150);
  await page.click('#pc-leilao-passo [data-comprar-creditos]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.parceirosAba === 'creditos') && (await texto(page, '#pc-creditos-voltar')) === 'Voltar ao leilão', '"Comprar" na etapa do lance abre a compra, com "Voltar ao leilão"');
  await page.click('#pc-creditos-fechar');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.parceirosAba === 'promocoes-email' && document.querySelector('#pc-leilao-passo')?.dataset.passo === '3') && (await page.inputValue('#pc-email-valor')) === '30', 'o ✕ volta para a etapa do lance, com o anúncio e o valor');
  await browser.close();

  // ---- A volta do cartão: confere sozinha ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/creditos?compra=' + ID(1), completo: ['a1'] }));
  await page.route('**/.netlify/functions/pagamento', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ situacao: 'paga' }) }));
  await page.waitForTimeout(500);
  ok((await texto(page, '#pc-compra')).includes('Conferindo o pagamento') && !(await page.evaluate(() => location.search.includes('compra='))), 'a volta do Mercado Pago (na página da compra) confere o pagamento e tira o "compra=" do endereço');
  await page.waitForTimeout(4500);
  ok((await texto(page, '#parceiros .pc-main')).includes('Pagamento confirmado'), 'e mostra o pagamento confirmado');
  await browser.close();

  // ---- Sem o Mercado Pago ligado: o WhatsApp ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes-email', premium: ['a1'] }));
  await page.route('**/.netlify/functions/pagamento', r => r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ erro: 'desligado' }) }));
  await page.waitForTimeout(400);
  await page.click('#pc-comprar-creditos');
  await page.waitForTimeout(200);
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(500);
  corpo = await texto(page, '#pc-compra');
  ok(corpo.includes('A compra pelo site ainda não está ligada') && decodeURIComponent(await page.getAttribute('#pc-compra a', 'href')).includes('comprar créditos de promoções'), 'sem o Mercado Pago ligado, oferece a compra pelo WhatsApp');
  await browser.close();

  // ---- Pagamento de teste (regra 118): o plano pago no gateway fingido ----
  const PREVIA = 'deploy-preview-5--guiatennis.netlify.app';
  const desligada = async (page, status = 503) => page.route('**/.netlify/functions/pagamento', r => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ erro: 'desligado' }) }));
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/plano', host: PREVIA, pagamentoDeTeste: true }));
  await desligada(page);
  await page.waitForTimeout(500);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('R$ 49 por mês') && corpo.includes('ou R$ 990 por ano · 2 meses grátis · preço de teste') && corpo.includes('Site de teste: os preços são de teste e o pagamento também'), 'site de teste: os planos com preço de teste, mensal e anual');
  await page.click('.pc-planos [data-escolher-plano="completo"]');
  await page.waitForTimeout(200);
  corpo = await texto(page, '#pc-compra');
  ok(corpo.includes('Assinar o Completo') && corpo.includes('Mensal · R$ 49') && corpo.includes('Anual · R$ 490') && (await texto(page, '#pc-compra-pagar')) === 'Pagar R$ 49 com Pix', 'subir de plano abre a compra: período e forma, mensal e Pix de saída');
  await page.click('[data-compra-periodo="anual"]');
  await page.waitForTimeout(150);
  ok((await texto(page, '#pc-compra-pagar')) === 'Pagar R$ 490 com Pix' && (await texto(page, '#pc-compra')).includes('2 meses saem de graça'), 'anual: R$ 490, com os 2 meses de graça');
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(500);
  corpo = await texto(page, '#pc-compra');
  ok(await page.$('#pc-compra .pc-teste-tag') && corpo.includes('Pague R$ 490 com Pix') && corpo.includes('Plano Completo anual · R$ 490') && await page.$('.pc-compra-qr-teste svg') && (await page.inputValue('#pc-compra-codigo')).startsWith('PIX-DE-TESTE-GUIATENNIS-'),
    'sem o Mercado Pago: o Pix de teste, com a etiqueta, o QR e o código que não é Pix');
  ok(await page.evaluate(() => { const r = window.__rpcs.find(x => x.nome === 'criar_compra_de_plano'); return r && r.args.p_plano === 'completo' && r.args.p_periodo === 'anual' && r.args.p_forma === 'pix' && !('p_valor' in r.args); }), 'a compra do plano vai ao banco sem o valor (o preço sai do banco)');
  await page.click('[data-simular="aprovado"]');
  await page.waitForTimeout(800);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Pagamento confirmado') && corpo.includes('A Só Aula Tennis agora está no plano Completo.') && await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').plano === 'completo' && planoAtual() === 'completo' && window.__compras[0].de_teste),
    '"Simular Pix pago": o plano muda e a tela confirma');
  // Descer de plano segue sem pagamento.
  page.once('dialog', d => d.accept());
  await page.click('.pc-planos [data-escolher-plano="basico"]');
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').plano === 'basico'), 'voltar ao Básico continua sem pagamento');
  await browser.close();

  // ---- Pagamento de teste: créditos no cartão (OTHE recusa, APRO aprova) e o Pix vencido ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes-email', premium: ['a1'], host: PREVIA, pagamentoDeTeste: true }));
  await desligada(page, 404);
  await page.waitForTimeout(500);
  await page.click('#pc-comprar-creditos');
  await page.waitForTimeout(200);
  await page.click('[data-compra-valor="200"]');
  await page.click('[data-compra-forma="cartao"]');
  await page.waitForTimeout(150);
  ok((await texto(page, '#parceiros .pc-main')).includes('No site de teste, sem o Mercado Pago ligado, o pagamento é de teste e nada é cobrado.'), 'a compra avisa do pagamento de teste');
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(500);
  ok((await page.inputValue('#pc-cartao-numero')) === '5031 4332 1540 6351' && (await page.inputValue('#pc-cartao-nome')) === 'APRO' && (await texto(page, '#pc-compra')).includes('APRO aprova e OTHE recusa'), 'cartão de teste já preenchido, com APRO e OTHE explicados');
  await page.fill('#pc-cartao-validade', '13/30');
  await page.click('[data-simular="cartao"]');
  await page.waitForTimeout(200);
  ok((await texto(page, '#pc-compra')).includes('Escreva a validade como MM/AA.'), 'validade errada não passa');
  await page.fill('#pc-cartao-validade', '11/30');
  await page.fill('#pc-cartao-nome', 'othe');
  await page.click('[data-simular="cartao"]');
  await page.waitForTimeout(500);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('O pagamento foi recusado') && (await texto(page, '#pc-compra-pagar')) === 'Ir para o Mercado Pago · R$ 200' && await page.evaluate(() => window.__compras[0].situacao === 'recusada' && !window.__db.academias.find(a => a.id === 'a1').envios_de_aviso),
    'OTHE recusa: volta à compra com R$ 200 e cartão, sem créditos');
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(500);
  await page.click('[data-simular="cartao"]');
  await page.waitForTimeout(800);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Pagamento confirmado') && corpo.includes('R$ 200 entraram nos créditos') && /Saldo de créditos\s+R\$ 200/.test(corpo), 'APRO aprova: os R$ 200 entram nos créditos');
  await page.click('#pc-creditos-concluir');
  await page.waitForTimeout(300);
  await page.click('#pc-comprar-creditos');
  await page.waitForTimeout(200);
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(500);
  await page.click('[data-simular="recusado"]');
  await page.waitForTimeout(500);
  ok((await texto(page, '#parceiros .pc-main')).includes('O Pix venceu sem pagamento.') && (await texto(page, '.pc-checkout-resumo')).includes('Saldo atual: R$ 200'), '"Simular Pix vencido": recusa sem mexer nos créditos');
  await browser.close();

  // ---- Mercado Pago ligado na prévia: vai para ele, mesmo com o teste ligado ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/plano', host: PREVIA, pagamentoDeTeste: true }));
  await page.route('**/.netlify/functions/pagamento', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(JSON.parse(r.request().postData()).acao === 'consultar' ? { situacao: 'aberta' } : { forma: 'pix', valor: 99, qr: '', copia: '00020101PIXCOPIA' }) }));
  await page.waitForTimeout(500);
  await page.click('.pc-planos [data-escolher-plano="premium"]');
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(500);
  corpo = await texto(page, '#pc-compra');
  ok(corpo.includes('Pague R$ 99 com Pix') && !(await page.$('#pc-compra .pc-teste-tag')) && corpo.includes('O plano muda sozinho.') && (await page.inputValue('#pc-compra-codigo')) === '00020101PIXCOPIA', 'com o Mercado Pago ligado, o Pix é o dele');
  await browser.close();

  // ---- Site de verdade: nada de preço nem de pagamento de teste ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/plano', pagamentoDeTeste: true }));
  await page.waitForTimeout(500);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Grátis por enquanto') && !corpo.includes('R$ 49') && !(await page.evaluate(() => window.__rpcs.some(r => r.nome === 'pagamento_de_teste'))), 'no site de verdade, os planos seguem grátis e nem perguntam do teste');
  await browser.close();

  // ---- Prévia com o interruptor desligado: o WhatsApp, como antes ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes-email', premium: ['a1'], host: PREVIA }));
  await desligada(page);
  await page.waitForTimeout(400);
  ok((await texto(page, '#parceiros .pc-main')) && !(await texto(page, '#parceiros .pc-main')).includes('preço de teste'), 'interruptor desligado: sem preço de teste');
  await page.click('#pc-comprar-creditos');
  await page.waitForTimeout(200);
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(500);
  ok((await texto(page, '#pc-compra')).includes('A compra pelo site ainda não está ligada'), 'interruptor desligado: a compra oferece o WhatsApp');
  await browser.close();

  // ---- O admin vê as compras ----
  ({ browser, page } = await abrir({ admin: true, q: 'admin', w: 1280 }));
  await page.evaluate(() => { window.__compras = [{ id: 'k1', academia_id: 'a1', valor: 100, forma: 'pix', situacao: 'paga', created_at: '2026-10-19T12:00:00Z', paga_em: '2026-10-19T12:01:00Z' },
    { id: 'k2', academia_id: 'a1', valor: 490, forma: 'cartao', situacao: 'paga', tipo: 'plano', plano: 'completo', periodo: 'anual', de_teste: true, created_at: '2026-10-19T13:00:00Z', paga_em: '2026-10-19T13:01:00Z' }]; });
  await page.click('.adm-nav [data-adm-aba="leiloes"]');
  await page.waitForTimeout(400);
  const adm = await texto(page, '#painel-admin');
  ok(adm.includes('Compras de créditos e planos (30 dias)') && adm.includes('Só Aula Tennis · R$ 100 · Pix · paga') && adm.includes('Pagas: R$ 100 (fora R$ 490 de teste)') && /plano Completo anual · R\$ 490 · cartão · paga .*Teste/i.test(adm.replace(/\s+/g, ' ')), 'o admin vê as compras, com o plano e as de teste à parte — ' + adm.replace(/\s+/g, ' ').match(/Compras de créditos.{0,90}/)?.[0]);
  await browser.close();
})();
