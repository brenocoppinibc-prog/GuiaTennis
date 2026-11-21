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
  ok(corpo.includes('Grátis') && corpo.includes('Sem fidelidade: cancele quando quiser, aqui em Plano.'), 'Planos: o Completo grátis por tempo limitado e "Sem fidelidade" (regra 310)');
  ok(!(await page.$('.pc-planos a[href*="wa.me"]')) && await page.$('.pc-planos [data-escolher-plano="completo"]') && await page.$('.pc-planos [data-escolher-plano="premium"]'), 'os planos se escolhem ali, sem o WhatsApp');
  let pergunta = '';
  page.once('dialog', d => { pergunta = d.message(); d.accept(); });
  await page.click('.pc-planos [data-escolher-plano="completo"]');
  await page.waitForTimeout(600);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(pergunta.includes('Passar a Só Aula Tennis para o plano Completo?') && pergunta.includes('Por enquanto é grátis'), 'pergunta antes de mudar — ' + pergunta.split('\n')[0]);
  ok(await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').plano === 'completo' && planoAtual() === 'completo') && corpo.includes('Pronto! A Só Aula Tennis agora está no plano Completo.'),
    'o Completo (grátis por enquanto) muda na hora, com o recado');
  ok(await page.evaluate(() => (window.__rpcs.find(r => r.nome === 'escolher_plano') || {}).args.p_plano === 'completo'), 'vai para o banco (escolher_plano)');
  ok(await page.$('.pc-planos [data-escolher-plano="basico"]') && (await texto(page, '.pc-planos [data-escolher-plano="basico"]')) === 'Voltar ao Básico', 'no Completo, dá para voltar ao Básico');
  page.once('dialog', d => { pergunta = d.message(); d.dismiss(); });
  await page.click('.pc-planos [data-escolher-plano="basico"]');
  await page.waitForTimeout(300);
  ok(pergunta.includes('Na hora:') && await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').plano === 'completo'), 'voltar ao Básico mostra o que muda e, sem confirmar, não muda');
  await browser.close();

  // ---- A equipe vê, mas não muda ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/plano' }));
  await page.evaluate(() => { window.__db.academia_vinculos.forEach(v => { v.papel = 'equipe'; }); contaAcademia.papel = 'equipe'; render(); });
  await page.waitForTimeout(200);
  // Regra 213: na equipe, o botão de mudar o plano não aparece.
  ok(!(await page.$('.pc-planos [data-escolher-plano]')) && !(await page.$('.pc-planos button[disabled]')) && !(await texto(page, '#parceiros')).includes('Só o responsável principal muda o plano'), 'na equipe, o botão de mudar o plano não aparece');
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
  ok(corpo.includes('Comprar créditos') && corpo.includes('R$ 50') && corpo.includes('R$ 200') && corpo.includes('Outro valor') && corpo.includes('Mais escolhido') && (await texto(page, '#pc-compra-pagar')) === 'Pagar com Pix · R$ 100',
    'o valor (R$ 100 marcado), a forma de pagamento e "Pagar com Pix" (regra 232)');
  ok(/Créditos\s+R\$ 100,00\s+Taxas\s+R\$ 0,00\s+Total\s+R\$ 100,00\s+Bônus do Pix \(5%\)\s+\+ R\$ 5,00 em créditos/.test(await texto(page, '.pc-checkout-resumo')) && (await texto(page, '#parceiros .pc-main')).includes('5% a mais em créditos. Aprovação na hora'), 'o resumo do pedido: créditos, taxas, total e o bônus do Pix (regra 304)');
  ok(await page.evaluate(() => [...document.querySelectorAll('.pc-checkout-trilha li')].map(l => l.className).join(',')) === 'feito,agora,', 'com os dados do comprador salvos, a compra abre na etapa do pagamento (regra 232)');
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
  await page.evaluate(() => { window.__compras[0].situacao = 'paga'; window.__db.academias.find(a => a.id === 'a1').envios_de_aviso = 105; });
  await page.waitForTimeout(5000);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Pagamento confirmado') && corpo.includes('R$ 105 entraram nos créditos da Só Aula Tennis') && /Saldo de créditos\s+R\$ 105/.test(corpo), 'pago: a página confere sozinha e mostra o saldo novo, com os 5% do Pix (regra 304)');
  await page.click('#pc-creditos-concluir');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.parceirosAba === 'promocoes-email' && !state.pcCompra) && /Créditos\s+R\$ 105/.test(await texto(page, '#pc-leilao')), '"Voltar ao leilão" volta, com os créditos');
  // Regra 301: o cartão no próprio site, no formulário do Mercado Pago (Card
  // Payment Brick). Aqui um Mercado Pago de mentira: o formulário é um botão
  // que devolve um token, como o de verdade.
  await page.evaluate(() => {
    MP_CHAVE_PUBLICA.real = MP_CHAVE_PUBLICA.teste = 'APP_USR-chave-publica-de-teste';
    window.MercadoPago = function (chave, opcoes) {
      window.__mpChave = chave; window.__mpOpcoes = opcoes;
      return { bricks: () => ({ create: async (tipo, lugar, cfg) => {
        window.__brick = { tipo, lugar, cfg };
        const el = document.getElementById(lugar);
        el.innerHTML = '<button type="button" id="brick-pagar">Pagar no formulário</button>';
        el.querySelector('#brick-pagar').onclick = () => cfg.callbacks.onSubmit({ token: 'tok123', payment_method_id: 'master', issuer_id: '24', installments: 1, transaction_amount: 1, payer: { email: 'dono@academia.com', identification: { type: 'CPF', number: '12345678909' } } });
        return { unmount: () => { window.__brickDesmontado = true; } };
      } }) };
    };
  });
  resposta = (corpo) => corpo.acao === 'cartao' ? { status: 200, body: { situacao: window.__respostaCartao || 'paga' } } : { status: 200, body: { forma: 'cartao', noSite: true, valor: 50, email: 'dono@academia.com' } };
  await page.click('#pc-comprar-creditos');
  await page.waitForTimeout(200);
  await page.click('[data-compra-valor="50"]');
  await page.click('[data-compra-forma="cartao"]');
  await page.waitForTimeout(150);
  corpo = await texto(page, '#parceiros .pc-main');
  ok((await texto(page, '#pc-compra-pagar')) === 'Pagar com cartão · R$ 50' && corpo.includes('Aqui mesmo, no formulário seguro do Mercado Pago'), 'cartão: "Pagar com cartão", aqui mesmo no formulário do Mercado Pago');
  const antes = chamadas.length;
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(500);
  const folha = await page.evaluate(() => ({ aberta: !!document.getElementById('pc-cartao-folha'), fora: !document.querySelector('#app #pc-cartao-folha'), texto: (document.getElementById('pc-cartao-folha') || {}).innerText || '',
    tipo: (window.__brick || {}).tipo, valor: window.__brick && window.__brick.cfg.initialization.amount, email: window.__brick && (window.__brick.cfg.initialization.payer || {}).email,
    parcelas: window.__brick && window.__brick.cfg.customization.paymentMethods.maxInstallments, chave: window.__mpChave }));
  ok(chamadas[antes] && chamadas[antes].acao === 'cobrar' && chamadas[antes].noSite === true, 'pede a cobrança com noSite (sem ir para outra página)');
  ok(folha.aberta && folha.fora && folha.texto.includes('Pague R$ 50 com cartão') && folha.texto.includes('o GuiaTennis não vê nem guarda os dados') && folha.tipo === 'cardPayment' && folha.valor === 50 && folha.email === 'dono@academia.com' && folha.parcelas === 1 && /^APP_USR-/.test(folha.chave),
    'a folha do cartão abre por cima da página (fora do #app), com o formulário do Mercado Pago, o valor do banco, o e-mail e à vista — ' + JSON.stringify({ ...folha, texto: undefined }));
  // Recusado: a folha fecha e a compra volta para a escolha, com o motivo.
  await page.evaluate(() => { window.__respostaCartao = 'recusada'; });
  resposta = (corpo) => corpo.acao === 'cartao' ? { status: 200, body: { situacao: 'recusada', motivo: 'cc_rejected_insufficient_amount' } } : { status: 200, body: { forma: 'cartao', noSite: true, valor: 50, email: 'dono@academia.com' } };
  await page.click('#brick-pagar');
  await page.waitForTimeout(400);
  const cartao = chamadas.find(x => x.acao === 'cartao');
  ok(cartao && cartao.cartao.token === 'tok123' && cartao.cartao.payment_method_id === 'master' && !('valor' in cartao), 'paga com o token do formulário (o número do cartão não passa pelo site e o valor sai do banco)');
  corpo = await texto(page, '#parceiros .pc-main');
  ok(!(await page.evaluate(() => !!document.getElementById('pc-cartao-folha'))) && corpo.includes('Cartão não aprovado: o cartão não tem limite para esse valor. Tente outro cartão ou pague com Pix.') && (await texto(page, '#pc-compra-pagar')) === 'Pagar com cartão · R$ 50',
    'recusado: a folha fecha e a compra volta, com o motivo e o mesmo valor');
  // Aprovado: os créditos entram na hora.
  resposta = (corpo) => corpo.acao === 'cartao' ? { status: 200, body: { situacao: 'paga' } } : { status: 200, body: { forma: 'cartao', noSite: true, valor: 50, email: 'dono@academia.com' } };
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.__compras[window.__compras.length - 1].situacao = 'paga'; window.__db.academias.find(a => a.id === 'a1').envios_de_aviso = 150; });
  await page.click('#brick-pagar');
  await page.waitForTimeout(800);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(!(await page.evaluate(() => !!document.getElementById('pc-cartao-folha'))) && corpo.includes('Pagamento confirmado'), 'aprovado: a folha fecha e o pagamento aparece confirmado — ' + corpo.slice(0, 120));
  await browser.close();

  // Sem a chave pública (o site de verdade, até ela entrar): o cartão vai para a página do Mercado Pago.
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes-email', premium: ['a1'] }));
  await page.route('**/.netlify/functions/pagamento', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ forma: 'cartao', valor: 50, link: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=x' }) }));
  await page.route('https://www.mercadopago.com.br/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>Mercado Pago</p>' }));
  await page.evaluate(() => { MP_CHAVE_PUBLICA.real = MP_CHAVE_PUBLICA.teste = ''; });
  await page.waitForTimeout(400);
  await page.click('#pc-comprar-creditos');
  await page.waitForTimeout(200);
  await page.click('[data-compra-valor="50"]');
  await page.click('[data-compra-forma="cartao"]');
  await page.waitForTimeout(150);
  ok((await texto(page, '#pc-compra-pagar')) === 'Ir para o Mercado Pago · R$ 50' && (await texto(page, '#parceiros .pc-main')).includes('página segura do Mercado Pago'), 'sem a chave pública: "Ir para o Mercado Pago"');
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
  // Regra 310: o Completo está grátis e o Premium já usou o mês grátis: a compra é a do Premium.
  await page.evaluate(() => { window.__assinaturas = { a1: { plano: 'premium', ate: new Date(Date.now() - 864e5).toISOString(), depois: 'completo', testeUsado: true, encerrada: true } }; delete state.assinaturas; render(); });
  await page.waitForTimeout(500);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('R$ 49 por mês') && corpo.includes('ou R$ 490 por ano · 2 meses grátis') && corpo.includes('Site de teste: o pagamento é de teste'), 'site de teste: os planos com preço de teste, mensal e anual');
  await page.click('.pc-planos [data-escolher-plano="premium"]');
  await page.waitForTimeout(500);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(await page.evaluate(() => location.pathname === '/parceiros/creditos') && corpo.includes('Assinar o Premium') && corpo.includes('Comprador') && corpo.includes('Mensal · R$ 49') && corpo.includes('Anual · R$ 490') && (await texto(page, '#pc-compra-pagar')) === 'Pagar com Pix · R$ 46' && /Mensal\s+R\$ 49,00\s+Desconto do Pix \(5%\)\s+− R\$ 3,00\s+Taxas\s+R\$ 0,00\s+Total\s+R\$ 46,00/.test(await texto(page, '.pc-checkout-resumo')),
    'subir de plano abre a mesma tela da compra (regra 232): o comprador, o período e a forma, mensal e Pix de saída, com 5% de desconto no Pix (regra 304)');
  await page.click('[data-compra-periodo="anual"]');
  await page.waitForTimeout(150);
  ok((await texto(page, '#pc-compra-pagar')) === 'Pagar com Pix · R$ 465' && (await texto(page, '#parceiros .pc-main')).includes('2 meses saem de graça') && /Anual\s+R\$ 490,00/.test(await texto(page, '.pc-checkout-resumo')), 'anual: R$ 490, com os 2 meses de graça no período e no resumo');
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(500);
  corpo = await texto(page, '#pc-compra');
  ok(await page.$('#pc-compra .pc-teste-tag') && corpo.includes('Pague R$ 490 com Pix') && corpo.includes('Plano Premium anual · R$ 490') && await page.$('.pc-compra-qr-teste svg') && (await page.inputValue('#pc-compra-codigo')).startsWith('PIX-DE-TESTE-GUIATENNIS-'),
    'sem o Mercado Pago: o Pix de teste, com a etiqueta, o QR e o código que não é Pix');
  ok(await page.evaluate(() => { const r = window.__rpcs.find(x => x.nome === 'criar_compra_de_plano'); return r && r.args.p_plano === 'premium' && r.args.p_periodo === 'anual' && r.args.p_forma === 'pix' && !('p_valor' in r.args); }), 'a compra do plano vai ao banco sem o valor (o preço sai do banco)');
  await page.click('[data-simular="aprovado"]');
  await page.waitForTimeout(800);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Pagamento confirmado') && corpo.includes('A Só Aula Tennis agora está no plano Premium.') && await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').plano === 'premium' && planoAtual() === 'premium' && window.__compras[0].de_teste && new Date(window.__assinaturas.a1.ate) - Date.now() > 360 * 864e5),
    '"Simular Pix pago": o Premium anual entra (um ano de assinatura) e a tela confirma');
  await page.click('#pc-creditos-concluir');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => location.pathname === '/parceiros/plano'), '"Voltar ao plano" volta à página Plano');
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
  ok(corpo.includes('O pagamento foi recusado') && (await texto(page, '#pc-compra-pagar')) === 'Pagar com cartão · R$ 200' && await page.evaluate(() => window.__compras[0].situacao === 'recusada' && !window.__db.academias.find(a => a.id === 'a1').envios_de_aviso),
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
  await page.evaluate(() => { window.__assinaturas = { a1: { testeUsado: true, encerrada: true } }; delete state.assinaturas; render(); });
  await page.waitForTimeout(500);
  await page.click('.pc-planos [data-escolher-plano="premium"]');
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(500);
  corpo = await texto(page, '#pc-compra');
  ok(corpo.includes('Pague R$ 99 com Pix') && !(await page.$('#pc-compra .pc-teste-tag')) && corpo.includes('O plano muda sozinho.') && (await page.inputValue('#pc-compra-codigo')) === '00020101PIXCOPIA', 'com o Mercado Pago ligado, o Pix é o dele');
  await browser.close();

  // ---- Site de verdade: os preços de lançamento, sem o pagamento de teste ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/plano', pagamentoDeTeste: true }));
  await page.waitForTimeout(500);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Por tempo limitado') && corpo.includes('Preço de lançamento · 45% abaixo do normal') && !corpo.includes('Site de teste') && await page.evaluate(() => !pagamentoDeTeste()),
    'no site de verdade (regra 310): os preços de lançamento aparecem, sem o pagamento de teste');
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
  // Datas de ontem (a lista é dos últimos 30 dias; data fixa vencia com o tempo).
  await page.evaluate(() => { const h = (min) => new Date(Date.now() - 864e5 + min * 6e4).toISOString();
    window.__compras = [{ id: 'k1', academia_id: 'a1', valor: 100, forma: 'pix', situacao: 'paga', created_at: h(0), paga_em: h(1) },
    { id: 'k2', academia_id: 'a1', valor: 490, forma: 'cartao', situacao: 'paga', tipo: 'plano', plano: 'completo', periodo: 'anual', de_teste: true, created_at: h(60), paga_em: h(61) }]; });
  await page.click('.adm-nav [data-adm-aba="compras"]');
  await page.waitForTimeout(400);
  const adm = await texto(page, '#painel-admin');
  ok(adm.includes('Compras de créditos e planos (30 dias)') && adm.includes('Só Aula Tennis · R$ 100 · Pix · paga') && adm.includes('Pagas: R$ 100 (fora R$ 490 de teste)') && /plano Completo anual · R\$ 490 · cartão · paga .*Teste/i.test(adm.replace(/\s+/g, ' ')), 'o admin vê as compras, com o plano e as de teste à parte — ' + adm.replace(/\s+/g, ' ').match(/Compras de créditos.{0,90}/)?.[0]);
  await browser.close();
})();
