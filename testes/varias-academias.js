// Uma conta, várias academias (pedido do Breno em 03/10/2026): o mesmo login
// do GuiaTennis Parceiros administra quantas academias a pessoa responder,
// em qualquer plano — como o "Suas empresas" do Google Business Profile, as
// várias propriedades do Booking e as várias lojas do iFood Parceiros. Cada
// academia nova é confirmada do mesmo jeito, e a academia aberta no painel
// troca pelo seletor.
const { abrir, ok } = require('./harness');

// textContent: o texto como está escrito (o CSS põe alguns em maiúsculas).
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

  // Conta: "Suas academias", com as duas.
  await page.click('.pc-nav a[data-pc="conta"]');
  await page.waitForTimeout(300);
  let conta = await texto(page, '#parceiros .pc-main');
  ok(conta.includes('Suas academias (2)') && conta.includes('paga o próprio valor') && conta.includes('Responsável principal da Só Aula Tennis'), 'Conta mostra as academias da conta e de qual é o papel');
  ok(conta.includes('Pessoas com acesso à Só Aula Tennis'), 'as pessoas com acesso são as da academia aberta');

  // Na ficha do site, a outra academia da conta oferece abrir no painel.
  await page.evaluate(() => goHome());
  await page.waitForTimeout(200);
  await abrirFicha(page, 'a2');
  await page.waitForTimeout(200);
  let ficha = await texto(page, '.dono-box');
  ok(ficha.includes('também é sua') && await page.isVisible('.dono-box [data-abrir-academia="a2"]'), 'ficha da outra academia da conta: "Abrir no painel"');
  ok(!(await page.evaluate(() => document.body.innerText)).includes('É o responsável por esta academia?'), 'e não pergunta se a pessoa é a responsável');
  await page.click('.dono-box [data-abrir-academia="a2"]');
  await page.waitForTimeout(500);
  t = await page.evaluate(() => ({ pagina: state.page, aba: state.parceirosAba, aberta: window.__db.academia_acessos[0].academia_id }));
  ok(t.pagina === 'parceiros' && t.aba === 'painel' && t.aberta === 'a2', '"Abrir no painel" troca a academia e vai ao painel');
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
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/conta' }));
  conta = await texto(page, '#parceiros .pc-main');
  ok(conta.includes('Sua academia') && conta.includes('Adicionar outra academia'), 'com uma academia só, a Conta já oferece adicionar outra');
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

})();
