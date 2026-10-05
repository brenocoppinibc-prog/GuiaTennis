// Uma conta, várias academias (pedido do Breno em 03/10/2026): o mesmo login
// do GuiaTennis Parceiros administra quantas academias a pessoa responder,
// em qualquer plano — como o "Suas empresas" do Google Business Profile, as
// várias propriedades do Booking e as várias lojas do iFood Parceiros. Cada
// academia nova é confirmada do mesmo jeito, e a academia aberta no painel
// troca pelo seletor.
const { abrir, ok, vigiarAbas, abasAbertas } = require('./harness');

// textContent: o texto como está escrito (o CSS deixa alguns em maiúsculas).
const texto = (page, sel) => page.evaluate((sel) => (document.querySelector(sel)?.textContent || '').replace(/\s+/g, ' '), sel);
const rpcs = (page, nome) => page.evaluate((nome) => window.__rpcs.filter(r => r.nome === nome).map(r => r.args), nome);
const abrirFicha = (page, id) => page.evaluate((id) => {
  const c = state.allCourts.find(x => x.id === id);
  state.selected = decorate(c); state.page = 'court'; render();
}, id);

(async () => {
  // ---- duas academias na conta, no computador: o seletor no topo ----
  let { browser, page } = await abrir({ academia: 'a2', outrasAcademias: ['a1'], q: 'parceiros/painel', w: 1280 });
  ok((await texto(page, '.pc-seletor-btn')).trim() === 'Quadra Locação', 'o topo mostra a academia aberta, num botão de trocar');
  await page.click('#pc-seletor-btn');
  await page.waitForTimeout(150);
  let lista = await page.evaluate(() => ({
    t: document.querySelector('.pc-seletor-t')?.innerText || '',
    itens: [...document.querySelectorAll('.pc-seletor-lista .pc-academia-i')].map(b => b.innerText.replace(/\s+/g, ' ').trim()),
    on: document.querySelector('.pc-seletor-lista .pc-academia-i.on')?.innerText || '',
  }));
  ok(lista.t === 'Suas academias (2)' && lista.itens.length === 3 && lista.itens[2] === 'Adicionar outra academia', 'a lista mostra as duas academias e "Adicionar outra academia" — ' + lista.itens.join(' / '));
  ok(lista.on.includes('Quadra Locação'), 'a academia aberta vem marcada');
  await page.click('body', { position: { x: 10, y: 600 } });
  await page.waitForTimeout(150);
  ok(!(await page.isVisible('.pc-seletor-lista')), 'tocar fora fecha a lista');
  await page.click('#pc-seletor-btn');
  await page.waitForTimeout(150);
  await page.click('.pc-seletor-lista [data-abrir-academia="a1"]');
  await page.waitForTimeout(500);
  let t = await page.evaluate(() => ({
    eyebrow: document.querySelector('#parceiros .pc-pagina .pc-eyebrow')?.textContent || '',
    aviso: document.querySelector('#parceiros .conta-aviso')?.innerText || '',
    topo: document.querySelector('.pc-seletor-btn')?.innerText.trim() || '',
    aba: state.parceirosAba,
    aberta: window.__db.academia_acessos[0].academia_id,
  }));
  ok(t.aberta === 'a1' && t.aba === 'painel' && t.eyebrow === 'Só Aula Tennis' && t.topo === 'Só Aula Tennis', 'trocar abre o painel da outra academia — ' + t.eyebrow);
  ok(t.aviso.includes('Agora você está na Só Aula Tennis'), 'avisa em qual academia a pessoa está');
  ok((await rpcs(page, 'abrir_minha_academia')).some(a => a.p_academia === 'a1'), 'a troca fica gravada no banco (abrir_minha_academia)');

  // "Suas academias" (05/10/2026): todas, com plano, situação e papel.
  await page.click('.pc-nav a[data-pc="academias"]');
  await page.waitForTimeout(300);
  let conta = await texto(page, '#parceiros .pc-main');
  const cartoes = await page.evaluate(() => [...document.querySelectorAll('.pc-acad')].map(c => c.innerText.replace(/\s+/g, ' ')));
  ok(conta.includes('Suas academias') && conta.includes('2 academias') && cartoes.length === 2 && cartoes.some(c => c.includes('Só Aula Tennis') && c.includes('Aberta no painel') && c.includes('Responsável') && c.includes('Básico')), 'Suas academias mostra todas, com o plano, a situação e o papel — ' + cartoes.join(' / ').slice(0, 160));
  ok(await page.evaluate(() => location.pathname === '/parceiros/academias'), 'Suas academias tem o próprio link');
  await page.click('.pc-nav a[data-pc="pessoas"]');
  await page.waitForTimeout(300);
  conta = await texto(page, '#parceiros .pc-main');
  ok(conta.includes('Pessoas com acesso à Só Aula Tennis'), 'as pessoas com acesso são as da academia aberta');

  // Na ficha do site, a outra academia da conta oferece abrir no painel.
  await page.evaluate(() => goHome());
  await page.waitForTimeout(200);
  await abrirFicha(page, 'a2');
  await page.waitForTimeout(200);
  let ficha = await texto(page, '.dono-box');
  ok(ficha.includes('também é sua') && await page.isVisible('.dono-box [data-abrir-academia="a2"]'), 'ficha da outra academia da conta: "Abrir no painel"');
  ok(!(await page.evaluate(() => document.body.innerText)).includes('É o responsável por esta academia?'), 'e não pergunta se a pessoa é a responsável');
  await vigiarAbas(page);
  await page.click('.dono-box [data-abrir-academia="a2"]');
  await page.waitForTimeout(500);
  const abaDoPainel = (await abasAbertas(page))[0] || {};
  t = await page.evaluate(() => ({ aberta: window.__db.academia_acessos[0].academia_id }));
  ok(t.aberta === 'a2' && abaDoPainel.url === 'http://guia.test/parceiros/painel' && abaDoPainel.nome === 'guiatennis-parceiros', '"Abrir no painel" troca a academia e abre o painel na aba do GuiaTennis Parceiros');
  await browser.close();

  // ---- no celular: o menu tem "Suas academias" ----
  ({ browser, page } = await abrir({ academia: 'a2', outrasAcademias: ['a1'], q: 'parceiros/painel' }));
  await page.click('#pc-menu-btn');
  await page.waitForTimeout(150);
  const menu = await page.evaluate(() => ({
    grupos: [...document.querySelectorAll('#pc-menu-overlay .menu-grupo')].map(g => g.textContent),
    itens: [...document.querySelectorAll('#pc-menu-overlay .pc-academia-i')].map(b => b.innerText.replace(/\s+/g, ' ').trim()),
  }));
  ok(menu.grupos[0] === 'Suas academias' && menu.itens.length === 3 && menu.itens.some(i => i.startsWith('Só Aula Tennis')), 'no celular, o menu começa por "Suas academias" — ' + menu.grupos[0] + ': ' + menu.itens.join(' / '));
  await page.click('#pc-menu-overlay [data-outra-academia]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.parceirosAba === 'cadastro' && !state.pcMenu), '"Adicionar outra academia" fecha o menu e abre a busca');
  await browser.close();

  // ---- adicionar outra academia, em qualquer plano (aqui, Básico) ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/academias' }));
  conta = await texto(page, '#parceiros .pc-main');
  ok(conta.includes('1 academia') && conta.includes('Adicionar outra academia'), 'com uma academia só, Suas academias já oferece adicionar outra');
  await page.click('#parceiros .pc-main [data-outra-academia]');
  await page.waitForTimeout(300);
  let cad = await texto(page, '#parceiros .pc-main');
  ok(cad.includes('Adicionar outra academia') && cad.includes('Qual academia você também administra?') && cad.includes('em qualquer plano') && !cad.includes('Cada conta cuida de uma academia'), 'a busca de outra academia, sem mandar falar com o GuiaTennis — ' + cad.slice(0, 90));
  ok(cad.includes('declara que é dono(a) ou está autorizado(a)'), 'pedir declara que a pessoa responde pela academia');
  await page.fill('#pc-busca', 'locação');
  await page.waitForTimeout(250);
  const minha = await page.evaluate(() => ({
    txt: document.querySelector('.pc-escolha-minha')?.innerText || '',
    selecionavel: !!document.querySelector('[data-pc-selecionar="a2"]'),
  }));
  ok(minha.txt.includes('Quadra Locação') && minha.txt.includes('Já é sua') && !minha.selecionavel, 'a academia que já é da conta aparece como "Já é sua", sem dar para pedir de novo');
  await page.fill('#pc-busca', 'aula');
  await page.waitForTimeout(250);
  await page.click('[data-pc-selecionar="a1"]');
  await page.waitForTimeout(150);
  await page.click('#pc-administrar');
  await page.waitForTimeout(400);
  const pedido = await rpcs(page, 'pedir_para_administrar');
  cad = await texto(page, '#parceiros .pc-main');
  ok(pedido.length === 1 && pedido[0].p_academia === 'a1', 'pede para administrar a segunda academia');
  ok(cad.includes('Pedido para administrar outra academia') && cad.includes('Só Aula Tennis') && cad.includes('(11) •••••-0001') && await page.isVisible('#pc-codigo'), 'o pedido mostra o WhatsApp escondido da ficha e o campo do código');
  ok(await page.evaluate(() => window.__db.academia_acessos[0].academia_id === 'a2'), 'enquanto isso, a primeira academia continua aberta');

  // O painel também mostra o pedido, com o código.
  await page.click('.pc-barra-baixo a[data-pc="painel"]');
  await page.waitForTimeout(300);
  ok((await texto(page, '#parceiros .pc-main')).includes('Pedido para administrar outra academia') && await page.isVisible('#pc-codigo'), 'o painel mostra o pedido da outra academia, com o campo do código');

  // O GuiaTennis manda o código ao WhatsApp da ficha; a pessoa digita.
  await page.evaluate(() => { window.__codigos = { 'u-a2': { codigo: '482913', academia: 'a1', tentativas: 0 } }; });
  await page.fill('#pc-codigo', '482913');
  await page.click('#pc-confirmar-codigo');
  await page.waitForTimeout(600);
  t = await page.evaluate(() => ({
    aviso: document.querySelector('#parceiros .conta-aviso')?.innerText || '',
    aberta: window.__db.academia_acessos[0].academia_id,
    vinculos: window.__db.academia_vinculos.filter(v => v.user_id === 'u-a2').map(v => v.academia_id + ':' + v.papel).join(','),
    lista: contaAcademia.academias.map(a => a.nome).join(','),
  }));
  ok(t.aberta === 'a1' && t.vinculos === 'a2:principal,a1:principal' && t.aviso.includes('Agora você administra a Só Aula Tennis'), 'código certo: a segunda academia entra na conta e abre no painel — ' + t.vinculos);
  ok(t.lista === 'Quadra Locação,Só Aula Tennis', 'o seletor passa a ter as duas — ' + t.lista);
  await browser.close();

  // ---- admin: uma conta com academia e pedido de outra ----
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(() => {
    window.__db.academia_acessos.push({ user_id: 'u-rede', academia_id: 'a2', usuario: 'rede@exemplo.com', nome_responsavel: 'Rita Rede', email: 'rede@exemplo.com', whatsapp: '11988880005', papel: 'principal',
      pedido_academia_id: 'a1', pedido_nome: 'Só Aula Tennis', pedido_em: '2026-10-03T12:00:00Z', dados_completos_em: '2026-10-01', senha_trocada_em: '2026-10-01' });
    window.__db.academia_vinculos.push({ user_id: 'u-rede', academia_id: 'a2', papel: 'principal' });
  });
  await page.evaluate(async () => { await carregarAcessos(); await loadEverything(); state.showAdminPanel = true; render(); });
  let painel = await page.evaluate(() => ({
    pedidos: document.querySelectorAll('#admin-overlay .acesso-pedido').length,
    texto: document.querySelector('#admin-overlay .acesso-pedido')?.innerText || '',
  }));
  ok(painel.pedidos === 1 && painel.texto.includes('Só Aula Tennis') && painel.texto.includes('já administra a Quadra Locação'), 'admin vê o pedido de quem já administra outra academia, e qual — ' + painel.texto.split('\n')[1]);
  await page.click('[data-aprovar-pedido="u-rede"]');
  await page.waitForTimeout(400);
  let rede = await page.evaluate(() => window.__db.academia_vinculos.filter(v => v.user_id === 'u-rede').map(v => v.academia_id).join(','));
  ok(rede === 'a2,a1', 'aprovar soma a academia à conta, sem tirar a outra');
  // Acessos do admin: uma academia por cartão, com as pessoas juntas (05/10/2026).
  await page.evaluate(async () => {
    window.__db.academia_acessos.push({ user_id: 'u-eva', academia_id: 'a2', usuario: 'eva@exemplo.com', nome_responsavel: 'Eva Equipe', email: 'eva@exemplo.com', papel: 'equipe', dados_completos_em: '2026-10-01', senha_trocada_em: '2026-10-01' });
    window.__db.academia_vinculos.push({ user_id: 'u-eva', academia_id: 'a2', papel: 'equipe' });
    await carregarAcessos(); render();
  });
  const cartoesAcesso = await page.evaluate(() => [...document.querySelectorAll('#admin-overlay .acesso-item')].map(b => b.innerText.replace(/\s+/g, ' ').trim()));
  ok(cartoesAcesso.length === 2 && cartoesAcesso.some(c => c.startsWith('Quadra Locação') && c.includes('2 pessoas') && c.includes('Rita Rede · responsável') && c.includes('Eva Equipe · equipe')) && cartoesAcesso.some(c => c.startsWith('Só Aula Tennis') && c.includes('1 pessoa')), 'acessos do admin: uma academia por cartão, com as pessoas juntas — ' + cartoesAcesso.join(' / ').slice(0, 180));
  // Remover o acesso na ficha da Quadra Locação tira a conta só dela.
  await page.evaluate(() => { state.showAdminPanel = false; render(); });
  await abrirFicha(page, 'a2');
  await page.waitForTimeout(200);
  let dialogo = '';
  page.once('dialog', d => { dialogo = d.message(); d.accept(); });
  await page.click('#acesso-remover');
  await page.waitForTimeout(400);
  const removido = await page.evaluate(() => ({ r: window.__removido, v: window.__db.academia_vinculos.filter(v => v.user_id === 'u-rede').map(v => v.academia_id).join(','), conta: !!window.__db.academia_acessos.find(x => x.user_id === 'u-rede') }));
  ok(dialogo.includes('continua administrando 1 outra academia'), 'antes de remover, o admin fica sabendo que a conta tem outra academia');
  ok(removido.r && removido.r.academia === 'a2' && removido.v === 'a1' && removido.conta, 'remover na ficha tira a conta só daquela academia — ' + removido.v);
  await browser.close();

  // ---- cada academia tem o próprio plano e paga o próprio valor ----
  ({ browser, page } = await abrir({ academia: 'a2', outrasAcademias: ['a1'], q: 'parceiros/plano', w: 1280 }));
  await page.evaluate(async () => { window.__db.academias.find(x => x.id === 'a1').plano = 'premium'; await recarregarConta(); render(); });
  let plano = await page.evaluate(() => ({
    h1: document.querySelector('#parceiros h1')?.textContent || '',
    eyebrow: document.querySelector('#parceiros .pc-pagina .pc-eyebrow')?.textContent || '',
    texto: document.querySelector('#parceiros .pc-main')?.textContent.replace(/\s+/g, ' ') || '',
    itens: [...document.querySelectorAll('#parceiros .pc-main .pc-academia-i')].map(b => b.innerText.replace(/\s+/g, ' ').trim()),
    wa: decodeURIComponent(document.querySelector('#parceiros .pc-main .footnote a')?.getAttribute('href') || ''),
  }));
  ok(plano.h1 === 'Plano desta academia' && plano.eyebrow === 'Quadra Locação', 'com duas academias, a página de plano diz de qual academia é');
  ok(plano.texto.includes('Cada academia tem o próprio plano e paga o próprio valor') && plano.texto.includes('Mudar o plano de uma não muda o das outras'), 'deixa claro que cada academia paga o próprio plano');
  ok(plano.itens.some(i => i.startsWith('Quadra Locação') && i.includes('Plano Básico')) && plano.itens.some(i => i.startsWith('Só Aula Tennis') && i.includes('Plano Premium')), 'a lista mostra o plano de cada academia — ' + plano.itens.slice(0, 2).join(' / '));
  ok(plano.wa.includes('para a Quadra Locação'), 'o pedido de mudar de plano pelo WhatsApp já diz qual academia');
  await page.click('#parceiros .pc-main [data-abrir-academia="a1"]');
  await page.waitForTimeout(500);
  await page.evaluate(() => irParceiros('plano'));
  await page.waitForTimeout(200);
  plano = await page.evaluate(() => ({
    eyebrow: document.querySelector('#parceiros .pc-pagina .pc-eyebrow')?.textContent || '',
    atual: document.querySelector('.pc-plano.atual, .pc-plano.on, .pc-plano-atual')?.textContent || '',
    plano: planoAtual(),
  }));
  ok(plano.eyebrow === 'Só Aula Tennis' && plano.plano === 'premium', 'trocar de academia mostra o plano dela (Premium), sem mudar o da outra — ' + plano.plano);
  ok(await page.evaluate(() => window.__db.academias.find(x => x.id === 'a2').plano || 'basico') === 'basico', 'a Quadra Locação continua no Básico');
  await browser.close();

  // ---- com um pedido aberto, dá para pedir outra (05/10/2026) ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/academias' }));
  await page.evaluate(async () => {
    const a3 = { ...JSON.parse(JSON.stringify(window.__db.academias.find(x => x.id === 'a1'))), id: 'a3', name: 'Tênis Terceira', phone: '11977770003' };
    window.__db.academias.push(a3);
    await loadEverything(); render();
  });
  await page.click('#parceiros .pc-main [data-outra-academia]');
  await page.waitForTimeout(300);
  await page.fill('#pc-busca', 'aula');
  await page.waitForTimeout(250);
  await page.click('[data-pc-selecionar="a1"]');
  await page.click('#pc-administrar');
  await page.waitForTimeout(400);
  let txt = await texto(page, '#parceiros .pc-main');
  ok(txt.includes('Pedido para administrar outra academia') && await page.isVisible('#parceiros .pc-main [data-outra-academia]'), 'com o pedido aberto, a tela já oferece adicionar outra academia');
  await page.click('#parceiros .pc-main [data-outra-academia]');
  await page.waitForTimeout(300);
  txt = await texto(page, '#parceiros .pc-main');
  ok(txt.includes('Qual academia você também administra?') && txt.includes('Você tem 1 pedido em andamento'), 'a busca abre de novo, lembrando do pedido em andamento');
  await page.fill('#pc-busca', 'terceira');
  await page.waitForTimeout(250);
  await page.click('[data-pc-selecionar="a3"]');
  await page.click('#pc-administrar');
  await page.waitForTimeout(400);
  const dois = await page.evaluate(() => meusPedidos().map(p => p.nome).join(','));
  ok(dois === 'Só Aula Tennis,Tênis Terceira', 'os dois pedidos ficam abertos ao mesmo tempo — ' + dois);
  await page.evaluate(() => irParceiros('academias'));
  await page.waitForTimeout(300);
  const listaDeTudo = await page.evaluate(() => ({ cartoes: document.querySelectorAll('.pc-acad').length, pedidos: [...document.querySelectorAll('.pc-pedido .pc-card-t')].map(x => x.innerText).join(','), h2: [...document.querySelectorAll('.pc-h2')].map(x => x.innerText).join(' | ') }));
  ok(listaDeTudo.cartoes === 1 && listaDeTudo.pedidos === 'Só Aula Tennis,Tênis Terceira' && listaDeTudo.h2.includes('2 pedidos em andamento'), 'Suas academias mostra a academia e os dois pedidos — ' + listaDeTudo.h2);
  // O código de cada pedido confirma só aquele pedido.
  await page.evaluate(() => { window.__codigos = { 'u-a2|a3': { codigo: '135790', academia: 'a3', tentativas: 0 } }; });
  await page.fill('[data-pedido-codigo="a3"]', '135790');
  await page.click('[data-confirmar-codigo="a3"]');
  await page.waitForTimeout(600);
  const depois = await page.evaluate(() => ({ v: window.__db.academia_vinculos.filter(v => v.user_id === 'u-a2').map(v => v.academia_id).join(','), pedidos: meusPedidos().map(p => p.academiaId).join(','), rpc: (window.__rpcs.filter(r => r.nome === 'confirmar_meu_codigo').slice(-1)[0] || {}).args }));
  ok(depois.v === 'a2,a3' && depois.pedidos === 'a1' && depois.rpc.p_academia === 'a3', 'o código da Tênis Terceira confirma só ela; o outro pedido continua — ' + depois.v);
  await page.evaluate(() => irParceiros('academias'));
  await page.waitForTimeout(300);
  await page.click('[data-cancelar-pedido="a1"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => meusPedidos().length === 0 && (window.__rpcs.filter(r => r.nome === 'cancelar_meu_pedido').slice(-1)[0] || {}).args.p_academia === 'a1'), 'cancelar tira só aquele pedido');
  await browser.close();

  // ---- admin: um pedido por linha, mesmo da mesma conta ----
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(async () => {
    window.__db.academia_acessos.push({ user_id: 'u-duas', academia_id: null, usuario: 'duas@exemplo.com', nome_responsavel: 'Dora Duas', email: 'duas@exemplo.com', whatsapp: '11988880009', papel: 'principal', dados_completos_em: '2026-10-01', senha_trocada_em: '2026-10-01' });
    window.__db.pedidos_de_acesso.push({ user_id: 'u-duas', academia_id: 'a1', nome: 'Só Aula Tennis', destino: 'guiatennis', pedido_em: '2026-10-05T10:00:00Z' },
      { user_id: 'u-duas', academia_id: 'a2', nome: 'Quadra Locação', destino: 'guiatennis', pedido_em: '2026-10-05T11:00:00Z' });
    await carregarAcessos(); await loadEverything(); state.showAdminPanel = true; render();
  });
  const linhas = await page.evaluate(() => [...document.querySelectorAll('#admin-overlay .acesso-pedido')].map(x => x.innerText.split('\n')[0]).join(','));
  ok(linhas === 'Só Aula Tennis,Quadra Locação', 'admin vê os dois pedidos da mesma conta, um por linha — ' + linhas);
  await page.click('[data-gerar-codigo="u-duas"][data-academia="a1"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => (window.__rpcs.filter(r => r.nome === 'gerar_codigo_do_pedido').slice(-1)[0] || {}).args.p_academia === 'a1' && (window.__codigos || {})['u-duas|a1']), 'o código é gerado para o pedido daquela academia');
  page.once('dialog', d => d.accept());
  await page.click('[data-recusar-pedido="u-duas"][data-academia="a2"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => window.__db.pedidos_de_acesso.filter(p => p.user_id === 'u-duas').map(p => p.academia_id).join() === 'a1'), 'recusar um pedido deixa o outro da mesma conta');
  await browser.close();

})();
