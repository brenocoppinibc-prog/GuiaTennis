// Pedido do Breno em 23/10/2026: "abra uma página nova para contestar e
// explique como funciona somente nessa página com passo a passo de ler e
// prosseguir"; depois, "faça tipo o nubank que explica para conta nova como
// funciona o cartão e não de opção de pular e depois com abertura para
// colocar o código". O cartão do pedido fica só com "Contestar ›"; a página
// /parceiros/contestar é a apresentação do Nubank (tela cheia, as barrinhas,
// só "Continuar", sem "Pular") e, contestado, vira a tela do código, como a
// do WhatsApp. No mesmo dia, "essas telas estão com muita cara de ia por
// aparecer algo muito animado": sem desenho e sem animação. Em 24/10/2026,
// "deixe todas essas telas com uma cara um pouco mais do GuiaTennis, com fonte
// e cor": o creme do site, a marca, a etapa em dourado, o título em Playfair e
// o texto num cartão com o botão verde logo abaixo.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const titulo = (page) => texto(page, '#pc-contestar h1');
// textContent: na tela, a etapa vem em maiúsculas pelo CSS.
const etapa = (page) => page.evaluate(() => (document.querySelector('#pc-contestar .pc-onb-etapa')?.textContent || '').trim());

async function pedidoComResponsavel(page, { confirmado = true } = {}) {
  await page.evaluate(async (confirmado) => {
    window.__whatsappLigado = true;
    const agora = new Date().toISOString();
    window.__db.academia_acessos[0].email_confirmado_em = confirmado ? agora : null;
    window.__db.academia_acessos[0].dados_completos_em = agora;
    const a3 = { ...JSON.parse(JSON.stringify(window.__db.academias.find(x => x.id === 'a1'))), id: 'a3', name: 'Tênis Terceira', phone: '11911112222' };
    window.__db.academias.push(a3);
    window.__db.academia_acessos.push({ user_id: 'u-outro', academia_id: 'a3', usuario: 'outro@exemplo.com', email: 'outro@exemplo.com', nome_responsavel: 'Otto Outro', papel: 'principal', dados_completos_em: agora });
    window.__db.academia_vinculos.push({ user_id: 'u-outro', academia_id: 'a3', papel: 'principal', created_at: agora, telefone_da_ficha: '11977770003' });
    window.__db.pedidos_de_acesso.push({ user_id: 'u-a2', academia_id: 'a3', nome: 'Tênis Terceira', destino: 'responsavel', pedido_em: agora, declarou_em: agora });
    await recarregarConta(); await loadEverything(); irParceiros('academias');
  }, confirmado);
  await page.waitForTimeout(400);
}
const continuar = async (page) => { await page.click('#pc-contestar-continuar'); await page.waitForTimeout(120); };
const contestou = (page) => page.evaluate(() => window.__rpcs.some(x => x.nome === 'contestar_academia'));

(async () => {
  // ---- o cartão só com o link; a apresentação, uma tela por vez ----
  let { browser, page } = await abrir({ academia: 'a2', q: 'parceiros/academias' });
  await pedidoComResponsavel(page);
  const cartao = await texto(page, '#parceiros .pc-pedido');
  const href = await page.evaluate(() => document.querySelector('[data-contestar="a3"]').getAttribute('href'));
  ok(cartao.includes('Contestar ›') && !cartao.includes('Na disputa') && !cartao.includes('código') && href === '/parceiros/contestar?academia=a3',
    'o cartão do pedido tem só "Contestar ›", que é um link para a página, sem explicar a disputa — ' + cartao.slice(-160));
  await page.click('[data-contestar="a3"]');
  await page.waitForTimeout(250);
  let r = await page.evaluate(() => ({
    url: location.pathname + location.search, marca: !!document.querySelector('#parceiros .pc-topo .pc-marca, #parceiros .pc-topo [class*="marca"]'), rodape: !!document.querySelector('.pc-rodape'),
    sair: !!document.querySelector('#pc-contestar-fechar, #parceiros .pc-topo .pc-fechar, #parceiros .pc-nav'), fundo: getComputedStyle(document.getElementById('parceiros')).backgroundColor,
    etiqueta: getComputedStyle(document.querySelector('.pc-onb-etapa')).color, titulo: getComputedStyle(document.querySelector('#pc-contestar h1')).fontFamily,
    botao: (document.getElementById('pc-contestar-continuar')?.closest('.pc-card') || {}).className || '',
    barras: [...document.querySelectorAll('.pc-onb-barras i')].map(i => i.className || '-').join(','),
  }));
  ok(r.url === '/parceiros/contestar?academia=a3' && r.marca && !r.sair && !r.rodape && r.fundo === 'rgb(247, 244, 236)',
    'abre /parceiros/contestar com o creme do site e só a marca no alto: sem menu, sem ✕ e sem rodapé — ' + JSON.stringify({ fundo: r.fundo, marca: r.marca, sair: r.sair }));
  ok(r.etiqueta === 'rgb(142, 109, 37)' && r.titulo.includes('Playfair') && r.botao.includes('pc-card'),
    'a cara do GuiaTennis: a etapa em dourado, o título em Playfair e o texto num cartão com o "Continuar" logo abaixo — ' + JSON.stringify({ etiqueta: r.etiqueta, titulo: r.titulo }));
  ok(r.barras === 'agora,-,-,-' && await etapa(page) === '1 de 4 · Quando contestar' && await titulo(page) === 'A academia é sua, mas outra pessoa administra?',
    '1ª tela: as quatro barrinhas no alto, a primeira acendendo, e o título — ' + r.barras);
  r = await page.evaluate(() => ({ corpo: document.getElementById('pc-contestar').innerText, pular: /pular/i.test(document.getElementById('pc-contestar').innerText), desenho: !!document.querySelector('#pc-contestar svg:not(.pc-onb-voltar svg)'),
    animado: [...document.querySelectorAll('#pc-contestar, #pc-contestar *')].some(el => { const a = getComputedStyle(el); const p = getComputedStyle(el, '::after'); return a.animationName !== 'none' || p.animationName !== 'none'; }) }));
  ok(r.corpo.includes('Conhece essa pessoa? Peça para ela aceitar o seu pedido') && !r.pular && !r.desenho && !r.animado && await page.$('#pc-contestar-continuar') && !(await page.$('#pc-contestar-enviar')),
    'a dica de pedir a quem administra, só "Continuar", nada de "Pular" e nenhum desenho ou animação — ' + JSON.stringify({ desenho: r.desenho, animado: r.animado }));
  await continuar(page);
  let corpo = await texto(page, '#pc-contestar');
  ok(await etapa(page) === '2 de 4 · O código' && await titulo(page) === 'O código vai para o WhatsApp da academia' && corpo.includes('São 6 números') && corpo.includes('em até 1 dia útil.') && corpo.includes('pode não ser o que está na ficha') && !corpo.includes('•••') && !corpo.includes('2222')
    && await page.evaluate(() => [...document.querySelectorAll('.pc-onb-barras i')].map(i => i.className || '-').join(',')) === 'feito,agora,-,-',
    '2ª tela: o código no WhatsApp da academia, o prazo, por que o número não aparece e a segunda barrinha — ' + corpo.slice(0, 120));
  await continuar(page);
  corpo = await texto(page, '#pc-contestar');
  ok(await etapa(page) === '3 de 4 · O que muda' && await titulo(page) === 'Quem digitar o código passa a ser o responsável' && corpo.includes('Você passa a administrar a Tênis Terceira') && corpo.includes('Quem administra hoje sai da academia') && corpo.includes('a ficha continua no ar'),
    '3ª tela: quem digitar vira o responsável, quem administra sai e a ficha segue no ar');
  await page.click('#pc-contestar-voltar');
  await page.waitForTimeout(120);
  ok(await etapa(page) === '2 de 4 · O código', 'a seta volta uma tela');
  await continuar(page);
  await continuar(page);
  corpo = await texto(page, '#pc-contestar');
  ok(await etapa(page) === '4 de 4 · Contestar' && await titulo(page) === 'Tudo certo para contestar?' && corpo.includes('Fale com o GuiaTennis') && corpo.includes('documento')
    && await texto(page, '#pc-contestar-enviar') === 'Contestar e receber o código' && !(await page.$('#pc-contestar-continuar')),
    '4ª tela: sem o código, o GuiaTennis; e só aqui "Contestar e receber o código"');
  ok(!(await contestou(page)), 'ler as telas não contesta nada');

  // ---- a seta na primeira tela sai, sem contestar ----
  for (let k = 0; k < 3; k++) { await page.click('#pc-contestar-voltar'); await page.waitForTimeout(100); }
  ok(await etapa(page) === '1 de 4 · Quando contestar', 'voltando, chega à primeira tela');
  await page.click('#pc-contestar-voltar');
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => state.parceirosAba === 'academias' && location.pathname === '/parceiros/academias') && !(await contestou(page)), 'na primeira tela, a seta volta a Suas academias, sem contestar');
  await page.click('[data-contestar="a3"]');
  await page.waitForTimeout(200);
  ok(await etapa(page) === '1 de 4 · Quando contestar', 'abrir de novo começa da primeira tela, sem pular nada');

  // ---- contestar: a página vira a tela do código, como a do WhatsApp ----
  for (let k = 0; k < 3; k++) await continuar(page);
  await page.click('#pc-contestar-enviar');
  await page.waitForTimeout(600);
  r = await page.evaluate(() => ({
    aba: state.parceirosAba, modo: document.getElementById('pc-contestar')?.dataset.modo,
    destino: (window.__db.pedidos_de_acesso.find(p => p.user_id === 'u-a2' && p.academia_id === 'a3') || {}).destino,
    topo: !!document.getElementById('pc-contestar-fechar'), caixas: document.querySelectorAll('#pc-contestar .otp-caixas span').length,
    foco: document.activeElement && document.activeElement.id, desenho: !!document.querySelector('#pc-contestar .cod-cabeca svg'),
  }));
  corpo = await texto(page, '#pc-contestar');
  ok(r.aba === 'contestar' && r.modo === 'codigo' && r.destino === 'disputa' && r.topo && !r.desenho && r.caixas === 6 && r.foco === 'pc-codigo',
    'contestado, a página vira a tela do código: o título sem desenho, as 6 caixas já com o cursor e o ✕ no alto — ' + JSON.stringify(r));
  ok(await titulo(page) === 'Digite o código' && corpo.includes('Mandamos um código de 6 números para o WhatsApp da Tênis Terceira') && corpo.includes('Mandar outro código') && corpo.includes('Digitar depois') && corpo.includes('documento'),
    'a tela diz para onde o código foi, com "Mandar outro código", a ajuda sem código e "Digitar depois"');
  await page.fill('#pc-codigo', '48 29');
  await page.waitForTimeout(100);
  r = await page.evaluate(() => ({ valor: document.getElementById('pc-codigo').value, caixas: [...document.querySelectorAll('#pc-contestar .otp-caixas span')].map(x => x.textContent || '_').join('') }));
  ok(r.valor === '4829' && r.caixas === '4829__', 'cada número numa caixa; o espaço colado some — ' + JSON.stringify(r));
  // "Confirmar" só com as 6 caixas preenchidas (26/10/2026).
  ok(await page.evaluate(() => document.getElementById('pc-confirmar-codigo').disabled), 'com 4 números, "Confirmar" fica travado');
  await page.fill('#pc-codigo', '482917');
  ok(await page.evaluate(() => !document.getElementById('pc-confirmar-codigo').disabled), 'com os 6, "Confirmar" libera');
  await page.fill('#pc-codigo', '48 29');
  ok(await page.evaluate(() => document.getElementById('pc-confirmar-codigo').disabled), 'apagando um número, trava de novo');
  await page.click('#pc-contestar-depois');
  await page.waitForTimeout(250);
  const disputa = await texto(page, '#parceiros .pc-pedido');
  ok(await page.evaluate(() => state.parceirosAba === 'academias') && disputa.toLowerCase().includes('em disputa') && disputa.includes('Digitar o código'),
    '"Digitar depois" volta a Suas academias, e o cartão "Em disputa" leva de volta ao código — ' + disputa);
  await page.click('[data-contestar="a3"]');
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => document.getElementById('pc-contestar')?.dataset.modo === 'codigo'), '"Digitar o código" abre a tela do código, sem a apresentação de novo');
  const codigo = await page.evaluate(() => window.__whatsapps[0].codigo);
  await page.fill('#pc-codigo', codigo);
  await page.click('#pc-confirmar-codigo');
  await page.waitForTimeout(700);
  r = await page.evaluate(() => ({ aba: state.parceirosAba, vinc: window.__db.academia_vinculos.filter(v => v.academia_id === 'a3').map(v => v.user_id + ':' + v.papel).join(',') }));
  ok(r.aba === 'painel' && r.vinc === 'u-a2:principal', 'o código certo: passa a administrar e vai para o painel — ' + JSON.stringify(r));

  // ---- o link aberto direto ----
  await page.evaluate(() => { history.pushState({}, '', '/parceiros/contestar?academia=zzz'); aplicarLink(lerLink()); render(); });
  await page.waitForTimeout(150);
  ok(await titulo(page) === 'Não há pedido para contestar', 'link de um pedido que não existe: "Não há pedido para contestar"');
  await browser.close();

  // ---- pelo link, sem o e-mail confirmado ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/academias' }));
  await pedidoComResponsavel(page, { confirmado: false });
  await page.evaluate(() => { history.pushState({}, '', '/parceiros/contestar?academia=a3'); aplicarLink(lerLink()); render(); });
  await page.waitForTimeout(150);
  ok(await etapa(page) === '1 de 4 · Quando contestar', 'o link abre a apresentação na primeira tela');
  await continuar(page);
  ok((await texto(page, '#pc-contestar')).includes('em até 1 dia útil depois que você confirmar o seu e-mail'), 'sem o e-mail confirmado, a 2ª tela diz que o código espera a confirmação');
  await continuar(page);
  await continuar(page);
  await page.click('#pc-contestar-enviar');
  await page.waitForTimeout(600);
  r = await page.evaluate(() => ({ modo: document.getElementById('pc-contestar')?.dataset.modo, caixas: !!document.querySelector('#pc-contestar [data-pedido-codigo]') }));
  ok(r.modo === 'codigo' && !r.caixas && (await texto(page, '#pc-contestar')).includes('Confirme o seu e-mail: confirmado, o GuiaTennis manda o código'),
    'contestado sem o e-mail confirmado: a tela pede para confirmar o e-mail antes do código, sem as caixas — ' + JSON.stringify(r));
  await browser.close();

  // ---- o código do e-mail no site dos jogadores ----
  ({ browser, page } = await abrir());
  await page.evaluate(() => { window.__db.jogadores.push({ user_id: 'j-z', nome: 'Zé', email: 'ze@exemplo.com' }); window.__senhas['ze@exemplo.com'] = 'antiga1234'; abrirContaJogador('entrar'); });
  await page.fill('#jog-email', 'ze@exemplo.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(300);
  await page.click('#jog-esqueci');
  await page.waitForTimeout(300);
  r = await page.evaluate(() => ({
    h1: document.querySelector('#jogador-overlay h1')?.innerText || '', desenho: !!document.querySelector('#jogador-overlay .cod-cabeca svg'),
    caixas: document.querySelectorAll('#jogador-overlay .otp-caixas span').length, sub: document.querySelector('#jogador-overlay .pc-sec-sub')?.innerText || '',
    reenvio: document.getElementById('jog-reenviar')?.innerText || '',
  }));
  ok(r.h1 === 'Digite o código' && !r.desenho && r.caixas === 6 && r.sub === 'Mandamos um código de 6 números para ze@exemplo.com.' && r.reenvio.startsWith('Mandar outro código em'),
    'jogadores: a tela do código sem desenho, com as 6 caixas (o tamanho do código) e a contagem — ' + JSON.stringify(r));
  await page.fill('#jog-codigo', '1234 56');
  await page.waitForTimeout(100);
  ok(await page.evaluate(() => document.getElementById('jog-codigo').value === '123456' && window.__codigo.codigo === '123456'), 'o código colado com espaço vira só números, também no rascunho');
  r = await page.evaluate(() => ({ reenvio: document.getElementById('jog-reenviar')?.innerText || '', parado: document.getElementById('jog-reenviar')?.disabled }));
  ok(/^Mandar outro código em (1:00|0:5\d)$/.test(r.reenvio) && r.parado, '"Mandar outro código" espera um minuto, com a contagem, como o WhatsApp — ' + JSON.stringify(r));
  await page.evaluate(() => { state.codigoMandadoEm = Date.now() - 61000; });
  await page.waitForTimeout(1200);
  r = await page.evaluate(() => ({ reenvio: document.getElementById('jog-reenviar')?.innerText || '', parado: document.getElementById('jog-reenviar')?.disabled }));
  ok(r.reenvio === 'Mandar outro código' && !r.parado, 'passado o minuto, "Mandar outro código" volta a funcionar');
  await browser.close();
})();
