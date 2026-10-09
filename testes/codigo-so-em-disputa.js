// Pedido do Breno em 07/10/2026: "eu quero manter o código em casos de
// disputa, para novas não". Academia do guia sem responsável passa a ser da
// conta na hora; o código no WhatsApp da academia só na disputa; o selo de
// confirmada ao lado do nome; "No ar" por 1 dia.
const { abrir, ok, irSenha } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);
const diasAtras = (n) => new Date(Date.now() - n * 86400000).toISOString();

async function pedirPelaTela(page, busca, id) {
  await page.evaluate(() => irParceiros('academias'));
  await page.waitForTimeout(300);
  await page.click('#parceiros .pc-main [data-outra-academia]');
  await page.waitForTimeout(300);
  await page.fill('#pc-busca', busca);
  await page.waitForTimeout(250);
  await page.click(`[data-pc-selecionar="${id}"]`);
  await page.check('#pc-declaro');
  await page.click('#pc-administrar');
  await page.waitForTimeout(700);
}

(async () => {
  // ---- e-mail confirmado: a academia do guia sem responsável é da conta na hora ----
  let { browser, page } = await abrir({ academia: 'a2', q: 'parceiros/academias', criadaEm: diasAtras(40) });
  await page.evaluate(async () => {
    window.__db.academia_acessos[0].email_confirmado_em = new Date().toISOString();
    // Tênis Terceira: já tem responsável (outra conta).
    const a3 = { ...JSON.parse(JSON.stringify(window.__db.academias.find(x => x.id === 'a1'))), id: 'a3', name: 'Tênis Terceira', phone: '11977770003' };
    window.__db.academias.push(a3);
    window.__db.academia_acessos.push({ user_id: 'u-outro', academia_id: 'a3', usuario: 'outro@exemplo.com', email: 'outro@exemplo.com', nome_responsavel: 'Otto Outro', papel: 'principal', dados_completos_em: new Date().toISOString() });
    window.__db.academia_vinculos.push({ user_id: 'u-outro', academia_id: 'a3', papel: 'principal', created_at: new Date().toISOString(), telefone_da_ficha: '11977770003' });
    await recarregarConta(); await loadEverything(); render();
  });
  await pedirPelaTela(page, 'aula', 'a1');
  let r = await page.evaluate(() => ({
    rpc: (window.__rpcs.filter(x => x.nome === 'pedir_para_administrar').slice(-1)[0] || {}).args,
    aba: state.parceirosAba,
    aviso: document.querySelector('#parceiros .conta-aviso')?.innerText || '',
    vinc: window.__db.academia_vinculos.find(v => v.user_id === 'u-a2' && v.academia_id === 'a1'),
    pedidos: meusPedidos().length,
    revisar: !!window.__db.academias.find(x => x.id === 'a1').revisar_desde,
    email: window.__db.emails_a_enviar.some(e => e.tipo === 'academia_assumida' && e.assunto === 'Academia assumida: Só Aula Tennis'),
    codigo: !!document.getElementById('pc-codigo'),
  }));
  ok(r.rpc && r.rpc.p_declaro === true && r.aba === 'painel' && r.aviso.includes('Agora você administra a Só Aula Tennis') && !r.codigo,
    'academia do guia sem responsável: com o e-mail confirmado e a declaração, a conta passa a administrar na hora, sem código — ' + r.aviso);
  ok(r.vinc && r.vinc.papel === 'principal' && r.vinc.telefone_da_ficha === '11999990001' && r.pedidos === 0, 'vira o responsável, e o banco guarda o WhatsApp que a ficha tinha');
  ok(r.revisar && r.email, 'vai para o admin revisar, com o e-mail "Academia assumida"');

  // ---- academia com responsável: o pedido vai para ele; dá para contestar ----
  await pedirPelaTela(page, 'terceira', 'a3');
  let cartao = await texto(page, '#parceiros .pc-pedido');
  ok(cartao.toLowerCase().includes('pedido enviado ao responsável') && cartao.includes('Tênis Terceira') && await page.isVisible('[data-contestar="a3"]') && cartao.includes('quem digitar passa a ser o responsável'),
    'com responsável: o pedido vai para ele, com "Contestar" e o aviso do código na disputa — ' + cartao.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('[data-contestar="a3"]');
  await page.waitForTimeout(500);
  cartao = await texto(page, '#parceiros .pc-pedido');
  r = await page.evaluate(() => ({
    rpc: (window.__rpcs.filter(x => x.nome === 'contestar_academia').slice(-1)[0] || {}).args,
    destino: (window.__db.pedidos_de_acesso.find(p => p.user_id === 'u-a2' && p.academia_id === 'a3') || {}).destino,
    email: window.__db.emails_a_enviar.some(e => e.tipo === 'disputa' && e.assunto === 'Disputa: Tênis Terceira'),
    campo: !!document.querySelector('[data-pedido-codigo="a3"]'),
  }));
  ok(r.rpc && r.rpc.p_academia === 'a3' && r.destino === 'disputa' && r.email, 'contestar vira disputa e avisa o admin por e-mail');
  // O número não aparece: na disputa, o código vai para o WhatsApp de antes, que pode não ser o da ficha.
  ok(cartao.toLowerCase().includes('em disputa') && cartao.includes('WhatsApp da academia') && !cartao.includes('•••') && r.campo && cartao.includes('documento'),
    'o cartão da disputa pede o código mandado ao WhatsApp da academia e diz que, sem ele, pode ser documento — ' + cartao.replace(/\s+/g, ' ').slice(0, 160));
  await page.evaluate(async () => { window.__codigos = { 'u-a2|a3': { codigo: '246810', academia: 'a3', tentativas: 0, em: new Date().toISOString() } }; await recarregarConta(); render(); });
  await page.fill('[data-pedido-codigo="a3"]', '246810');
  await page.click('[data-confirmar-codigo="a3"]');
  await page.waitForTimeout(700);
  r = await page.evaluate(() => ({
    vinc: window.__db.academia_vinculos.filter(v => v.academia_id === 'a3').map(v => v.user_id + ':' + v.papel).join(','),
    aviso: document.querySelector('#parceiros .conta-aviso')?.innerText || '',
  }));
  ok(r.vinc === 'u-a2:principal' && r.aviso.includes('Agora você administra a Tênis Terceira'), 'quem digita o código vence a disputa: vira o responsável e quem administrava sai — ' + r.vinc);
  await browser.close();

  // ---- banco antes do SQL: contestar avisa para falar com o GuiaTennis ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/academias' }));
  await page.evaluate(async () => {
    window.__semDisputa = true;
    const a3 = { ...JSON.parse(JSON.stringify(window.__db.academias.find(x => x.id === 'a1'))), id: 'a3', name: 'Tênis Terceira', phone: '11977770003' };
    window.__db.academias.push(a3);
    window.__db.academia_acessos.push({ user_id: 'u-outro', academia_id: 'a3', usuario: 'outro@exemplo.com', email: 'outro@exemplo.com', nome_responsavel: 'Otto Outro', papel: 'principal' });
    window.__db.academia_vinculos.push({ user_id: 'u-outro', academia_id: 'a3', papel: 'principal', created_at: new Date().toISOString() });
    await loadEverything(); render();
  });
  await pedirPelaTela(page, 'terceira', 'a3');
  await page.click('[data-contestar="a3"]');
  await page.waitForTimeout(400);
  ok((await texto(page, '#parceiros .pc-pedido .form-error')).includes('Fale com o GuiaTennis no WhatsApp'), 'banco sem o SQL novo: contestar manda falar com o GuiaTennis');
  await browser.close();

  // ---- sem o e-mail confirmado: espera; confirmou, a academia é dela ----
  ({ browser, page } = await abrir({ q: 'parceiros/entrar' }));
  await page.evaluate(() => {
    const agora = new Date().toISOString();
    window.__db.academia_acessos.push({ user_id: 'u-lia', academia_id: null, usuario: 'lia@quadra.com.br', email: 'lia@quadra.com.br', nome_responsavel: 'Lia Espera', papel: 'principal', termos_aceitos_em: agora, dados_completos_em: agora, senha_trocada_em: agora });
    window.__db.pedidos_de_acesso.push({ user_id: 'u-lia', academia_id: 'a1', nome: 'Só Aula Tennis', destino: 'guiatennis', pedido_em: agora, declarou_em: agora });
    window.__senhas['lia@quadra.com.br'] = 'senha12345';
  });
  await irSenha(page, 'lia@quadra.com.br');
  await page.fill('#login-password', 'senha12345');
  await page.click('#login-submit');
  await page.waitForTimeout(800);
  cartao = await texto(page, '#parceiros .pc-pedido');
  ok(cartao.includes('Confirme o seu e-mail') && cartao.includes('passa a ser sua na hora') && !(await page.$('#pc-codigo')), 'sem o e-mail confirmado: o pedido espera, sem código — ' + cartao.split('\n').slice(0, 3).join(' / '));
  await page.click('#pc-mandar-codigo');
  await page.waitForTimeout(300);
  await page.fill('#pc-codigo-email', '123456');
  await page.click('#pc-confirmar-email');
  await page.waitForTimeout(800);
  r = await page.evaluate(() => ({ aviso: document.querySelector('.conta-aviso')?.innerText || '', acad: (window.__db.academia_vinculos.find(v => v.user_id === 'u-lia') || {}).academia_id }));
  ok(r.acad === 'a1' && r.aviso.includes('Agora você administra a Só Aula Tennis'), 'confirmou o e-mail: a academia passa a ser dela, sozinha — ' + r.aviso);
  await browser.close();

  // ---- admin: a disputa e o WhatsApp de antes ----
  ({ browser, page } = await abrir({ admin: true, criadaEm: diasAtras(60) }));
  await page.evaluate(async () => {
    const agora = new Date().toISOString();
    window.__db.academia_acessos.push(
      { user_id: 'u-tomou', academia_id: 'a1', usuario: 'tomou@exemplo.com', email: 'tomou@exemplo.com', nome_responsavel: 'Tito Tomou', papel: 'principal', dados_completos_em: agora },
      { user_id: 'u-dona', academia_id: null, usuario: 'dona@exemplo.com', email: 'dona@exemplo.com', nome_responsavel: 'Dona Certa', whatsapp: '11955554444', papel: 'principal', dados_completos_em: agora });
    window.__db.academia_vinculos.push({ user_id: 'u-tomou', academia_id: 'a1', papel: 'principal', created_at: agora, telefone_da_ficha: '11999990001' });
    window.__db.academias.find(x => x.id === 'a1').phone = '11911112222';
    window.__db.academias.find(x => x.id === 'a1').revisar_desde = agora;
    window.__db.pedidos_de_acesso.push({ user_id: 'u-dona', academia_id: 'a1', nome: 'Só Aula Tennis', destino: 'disputa', pedido_em: agora, declarou_em: agora });
    await carregarAcessos(); await loadEverything(); irAdmin('pendencias');
  });
  await page.waitForTimeout(400);
  let painel = await page.evaluate(() => document.body.innerText);
  ok(painel.includes('Só Aula Tennis · em disputa') && painel.includes('Em disputa com Tito Tomou') && painel.includes('O código vai para o WhatsApp que a academia tinha antes de Tito Tomou assumir, (11) 99999-0001') && painel.includes('o da ficha agora é (11) 91111-2222'),
    'admin vê a disputa e o WhatsApp que a academia tinha antes de quem administra assumir');
  ok(painel.includes('Foram ao ar ou foram assumidas sozinhas: revise') && painel.includes('Só Aula Tennis · assumida') && painel.includes('Assumiu: '), 'em Pendências, a academia assumida aparece como "assumida"');
  // WhatsApp do GuiaTennis desligado: "Mandar código" gera, e o Breno manda do WhatsApp dele.
  await page.click('[data-mandar-codigo="u-dona"]');
  await page.waitForTimeout(500);
  const wa = await page.evaluate(() => [...document.querySelectorAll('a')].map(a => a.getAttribute('href')).find(h => h && h.includes('wa.me/5511999990001')) || '');
  ok(wa.includes('wa.me/5511999990001'), 'o código vai para o WhatsApp de antes, não para o número novo da ficha');
  let pergunta = '';
  page.once('dialog', d => { pergunta = d.message(); d.accept(); });
  await page.click('[data-aprovar-pedido="u-dona"][data-academia="a1"]');
  await page.waitForTimeout(500);
  const vinc = await page.evaluate(() => window.__db.academia_vinculos.filter(v => v.academia_id === 'a1').map(v => v.user_id + ':' + v.papel).join(','));
  ok(pergunta.includes('Decidir a disputa') && vinc === 'u-dona:principal', 'aprovar a disputa (decidida por documento) pergunta antes; quem pediu vira o responsável e quem administrava sai — ' + vinc);
  await browser.close();

  // ---- o selo de confirmada no nome; o texto no fim da ficha ----
  ({ browser, page } = await abrir({ atualizadaEm: diasAtras(4) }));
  await page.evaluate(() => { state.selected = decorate(state.allCourts.find(x => x.id === 'a1')); state.page = 'court'; render(); });
  r = await page.evaluate(() => ({
    selo: !!document.querySelector('.court-name .selo-confirmada'),
    rotulo: document.querySelector('.court-name .selo-confirmada')?.getAttribute('aria-label') || '',
    topo: !!document.querySelector('.ht-head .ficha-confirmada, .ht-head .ficha-basica'),
    fim: document.querySelector('#ht-contato #ficha-confirmacao')?.innerText || '',
  }));
  ok(r.selo && r.rotulo.includes('Confirmada pela academia') && !r.topo, 'ficha confirmada: o selo ao lado do nome, sem o texto no topo');
  ok(r.fim.includes('Confirmada pela academia') && r.fim.includes('atualizada há 4 dias'), 'o texto fica no fim da ficha, em Contato — ' + r.fim);
  await page.click('#ir-confirmacao');
  await page.waitForTimeout(700);
  const visivel = await page.evaluate(() => { const b = document.getElementById('ficha-confirmacao').getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; });
  ok(visivel, 'tocar no selo leva ao texto, no fim da ficha');
  await page.evaluate(() => { state.selected = decorate(state.allCourts.find(x => x.id === 'a2')); render(); });
  r = await page.evaluate(() => ({ selo: !!document.querySelector('.court-name .selo-confirmada'), fim: document.querySelector('#ficha-confirmacao')?.innerText || '' }));
  ok(!r.selo && r.fim.includes('Ficha básica'), 'ficha básica: sem selo, e o aviso no fim da ficha');
  await page.evaluate(() => { state.page = 'search'; state.selected = null; state.results = state.allCourts.map(decorate); state.searchStatus = 'done'; render(); });
  await page.waitForTimeout(300);
  const cartoes = await page.evaluate(() => [...document.querySelectorAll('.rcard')].map(c => c.querySelector('.rcard-name').innerText.trim() + (c.querySelector('.rcard-name .selo-confirmada') ? ' ✓' : '')));
  ok(cartoes.includes('Só Aula Tennis ✓') && cartoes.includes('Quadra Locação'), 'no resultado da busca, o selo também aparece ao lado do nome — ' + cartoes.join(' | '));
  await browser.close();

  // ---- "No ar, com as informações confirmadas" por 1 dia ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel', criadaEm: diasAtras(2) }));
  ok(!(await page.$('#parceiros .conta-situacao.ok')), 'dois dias depois de ir ao ar, o "No ar" não aparece mais (era 3 dias)');
  await browser.close();
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel', criadaEm: new Date(Date.now() - 12 * 3600000).toISOString() }));
  ok((await texto(page, '#parceiros .conta-situacao.ok')).includes('No ar'), 'no primeiro dia, o "No ar" aparece');
  await browser.close();

  // ---- textos ----
  ({ browser, page } = await abrir({ q: 'parceiros' }));
  const como = await page.evaluate(() => [...document.querySelectorAll('.pc-etapas-como li')][2]?.innerText || '');
  ok(como.includes('Declare que responde pela academia') && como.includes('se houver disputa'), 'Como funciona: declarar, e o código só na disputa');
  await page.evaluate(() => { state.showTerms = true; render(); });
  const termos = await page.evaluate(() => document.body.innerText);
  ok(termos.includes('Em caso de disputa') && !termos.includes('terceira academia nova da conta em 24 horas'), 'Termos: o código só na disputa, sem o limite de 3 em 24 horas');
  await browser.close();
})();
