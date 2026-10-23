// Pedido do Breno em 23/10/2026: "abra uma página nova para contestar e
// explique como funciona somente nessa página com passo a passo de ler e
// prosseguir". O cartão do pedido fica só com "Contestar ›"; a página
// /parceiros/contestar explica a disputa numa tela por vez, com "Continuar",
// e só a última contesta.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const titulo = (page) => texto(page, '#pc-contestar h1');
const etapa = (page) => texto(page, '#pc-contestar .pc-progresso-etapas li[aria-current="step"]');

async function pedidoComResponsavel(page, { confirmado = true } = {}) {
  await page.evaluate(async (confirmado) => {
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
  // ---- o cartão só com o link; a página, uma tela por vez ----
  let { browser, page } = await abrir({ academia: 'a2', q: 'parceiros/academias' });
  await pedidoComResponsavel(page);
  const cartao = await texto(page, '#parceiros .pc-pedido');
  const href = await page.evaluate(() => document.querySelector('[data-contestar="a3"]').getAttribute('href'));
  ok(cartao.includes('Contestar ›') && !cartao.includes('Na disputa') && !cartao.includes('código') && href === '/parceiros/contestar?academia=a3',
    'o cartão do pedido tem só "Contestar ›", que é um link para a página, sem explicar a disputa — ' + cartao.slice(-160));
  await page.click('[data-contestar="a3"]');
  await page.waitForTimeout(250);
  let r = await page.evaluate(() => ({ url: location.pathname + location.search, menu: !!document.querySelector('#parceiros .pc-nav'), rodape: !!document.querySelector('.pc-rodape'), fechar: !!document.getElementById('pc-contestar-fechar') }));
  ok(r.url === '/parceiros/contestar?academia=a3' && !r.menu && !r.rodape && r.fechar, 'abre /parceiros/contestar, sem o menu nem o rodapé, com o ✕ — ' + r.url);
  ok(await etapa(page) === 'Quando contestar' && await titulo(page) === 'A academia é sua e outra pessoa administra?'
    && (await texto(page, '#pc-contestar')).includes('Conhece quem administra? É mais rápido pedir')
    && await page.$('#pc-contestar-continuar') && !(await page.$('#pc-contestar-enviar')),
    '1ª tela: quando contestar, a dica de pedir a quem administra e só "Continuar"');
  await continuar(page);
  let corpo = await texto(page, '#pc-contestar');
  ok(await etapa(page) === 'O código' && await titulo(page) === 'O código vai para o WhatsApp da academia' && corpo.includes('código de 6 números') && corpo.includes('em até 1 dia útil.') && corpo.includes('pode não ser o que está na ficha') && !corpo.includes('•••') && !corpo.includes('2222'),
    '2ª tela: o código no WhatsApp da academia, o prazo e por que o número não aparece — ' + corpo.slice(0, 120));
  await continuar(page);
  corpo = await texto(page, '#pc-contestar');
  ok(await etapa(page) === 'O que muda' && await titulo(page) === 'Quem digitar o código passa a ser o responsável' && corpo.includes('cartão do pedido') && corpo.includes('Quem administra hoje sai da academia') && corpo.includes('a ficha continua no ar'),
    '3ª tela: quem digitar vira o responsável, quem administra sai e a ficha segue no ar');
  await page.click('#pc-contestar-voltar');
  await page.waitForTimeout(120);
  ok(await etapa(page) === 'O código', '"Voltar" volta uma tela');
  await continuar(page);
  await continuar(page);
  corpo = await texto(page, '#pc-contestar');
  ok(await etapa(page) === 'Contestar' && await titulo(page) === 'Contestar quem administra a Tênis Terceira?' && corpo.includes('Fale com o GuiaTennis') && corpo.includes('documento')
    && await texto(page, '#pc-contestar-enviar') === 'Contestar quem administra' && await texto(page, '#pc-contestar-desistir') === 'Agora não' && !(await page.$('#pc-contestar-continuar')),
    '4ª tela: sem o código, o GuiaTennis; e só aqui "Contestar quem administra" e "Agora não"');
  ok(!(await contestou(page)), 'ler as telas não contesta nada');

  // ---- "Agora não" e o ✕: volta sem contestar ----
  await page.click('#pc-contestar-desistir');
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => state.parceirosAba === 'academias' && location.pathname === '/parceiros/academias') && !(await contestou(page)), '"Agora não" volta a Suas academias, sem contestar');
  await page.click('[data-contestar="a3"]');
  await page.waitForTimeout(200);
  ok(await etapa(page) === 'Quando contestar', 'abrir de novo começa da primeira tela');
  await page.click('#pc-contestar-fechar');
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => state.parceirosAba === 'academias') && !(await contestou(page)), 'o ✕ também volta, sem contestar');

  // ---- contestar: volta com o cartão "Em disputa" ----
  await page.click('[data-contestar="a3"]');
  await page.waitForTimeout(200);
  for (let k = 0; k < 3; k++) await continuar(page);
  await page.click('#pc-contestar-enviar');
  await page.waitForTimeout(600);
  r = await page.evaluate(() => ({
    aba: state.parceirosAba,
    destino: (window.__db.pedidos_de_acesso.find(p => p.user_id === 'u-a2' && p.academia_id === 'a3') || {}).destino,
    cartao: (document.querySelector('#parceiros .pc-pedido')?.innerText || '').toLowerCase(),
    push: document.querySelector('.push')?.innerText || document.body.innerText,
  }));
  ok(r.aba === 'academias' && r.destino === 'disputa' && r.cartao.includes('em disputa') && r.push.includes('Disputa aberta'),
    'contestar abre a disputa e volta a Suas academias, com o cartão "Em disputa" e o aviso — ' + r.aba);

  // ---- o link aberto direto (ou recarregado) ----
  await page.evaluate(() => { history.pushState({}, '', '/parceiros/contestar?academia=a3'); aplicarLink(lerLink()); render(); });
  await page.waitForTimeout(150);
  ok((await titulo(page)).includes('A disputa da Tênis Terceira já está aberta') && await page.$('#pc-contestar-sair'), 'pedido já em disputa: a página diz que a disputa está aberta');
  await page.click('#pc-contestar-sair');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => state.parceirosAba === 'academias'), 'e volta a Suas academias');
  await page.evaluate(() => { history.pushState({}, '', '/parceiros/contestar?academia=zzz'); aplicarLink(lerLink()); render(); });
  await page.waitForTimeout(150);
  ok(await titulo(page) === 'Não há pedido para contestar', 'link de um pedido que não existe: "Não há pedido para contestar"');
  await browser.close();

  // ---- pelo link, sem o e-mail confirmado ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/academias' }));
  await pedidoComResponsavel(page, { confirmado: false });
  await page.evaluate(() => { history.pushState({}, '', '/parceiros/contestar?academia=a3'); aplicarLink(lerLink()); render(); });
  await page.waitForTimeout(150);
  ok(await etapa(page) === 'Quando contestar', 'o link abre a página na primeira tela');
  await continuar(page);
  ok((await texto(page, '#pc-contestar')).includes('em até 1 dia útil depois que você confirmar o seu e-mail'), 'sem o e-mail confirmado, a 2ª tela diz que o código espera a confirmação');
  await page.click('#pc-contestar-fechar');
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => state.parceirosAba === 'academias'), 'aberta pelo link, o ✕ leva a Suas academias');
  await browser.close();
})();
