// Área da academia, no GuiaTennis Parceiros (/parceiros): login com usuário e
// senha provisória, primeiro acesso, edição só da própria ficha, respostas às
// avaliações, o que a academia não vê nem faz, e o bloco do admin que cria o
// acesso.
const { abrir, ok, vigiarAbas, abasAbertas, irParte, irSenha } = require('./harness');
// No celular, o Parceiros abre cada página pelo menu (06/10/2026: sem a
// barra de atalhos embaixo).
async function menuPc(page, aba) {
  await page.click('#pc-menu-btn');
  await page.click(`#pc-menu-overlay .menu-item[data-pc="${aba}"]`);
}

const AVALIACOES = [
  { id: 'r1', academia_id: 'a2', stars: 3, comment: 'Quadra boa, vestiário simples.', nome_autor: 'Carla', contato_autor: '11955550001', created_at: '2026-09-20T12:00:00Z' },
  { id: 'r2', academia_id: 'a1', stars: 5, comment: 'Ótimos professores.', nome_autor: 'Ana', contato_autor: '11955550002', created_at: '2026-09-21T12:00:00Z' },
];

const abrirFicha = (page, id) => page.evaluate((id) => {
  const c = state.allCourts.find(x => x.id === id);
  state.selected = decorate(c); state.page = 'court'; render();
}, id);
const texto = (page, sel) => page.evaluate((sel) => document.querySelector(sel)?.innerText || '', sel);

(async () => {
  // ---- visitante ----
  // O link que vai no WhatsApp da academia abre o "Entrar" do GuiaTennis Parceiros.
  let { browser, page } = await abrir({ q: 'parceiros/entrar?utm_source=WhatsApp-academias', avaliacoes: AVALIACOES });
  let login = await page.evaluate(() => ({
    titulo: document.querySelector('#parceiros h1')?.innerText || '',
    campo: document.querySelector('label[for="pc-email"]')?.innerText || '',
    dica: document.querySelector('#parceiros .pc-card .footnote')?.innerText || '',
    url: location.pathname + location.search,
    robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') || '',
  }));
  ok(login.titulo === 'Entre ou cadastre a sua academia' && login.campo === 'E-mail' && login.dica.includes('Pode escrever o usuário aqui'), 'link do WhatsApp abre o lugar único do e-mail, que aceita o usuário do GuiaTennis — ' + login.titulo);
  ok(login.url === '/parceiros/entrar?utm_source=WhatsApp-academias' && login.robots.includes('noindex'), 'endereço próprio, com a etiqueta, e fora do Google — ' + login.url);
  await irSenha(page, 'quadra.a2');
  const ajuda = await page.evaluate(() => [...document.querySelectorAll('#parceiros .footnote a')].map(a => a.getAttribute('href')).find(h => h.startsWith('https://wa.me/')) || '');
  ok(ajuda.startsWith('https://wa.me/5511927456457') && await page.isVisible('#login-password'), 'usuário vai direto para a senha, com o WhatsApp do guia para quem esqueceu');
  await page.fill('#login-password', 'errada');
  await page.click('#login-submit');
  await page.waitForTimeout(300);
  ok((await texto(page, '#parceiros .form-error')).includes('Usuário ou senha incorretos'), 'senha errada: mensagem simples');
  await page.fill('#login-password', '');
  await page.click('#login-submit');
  await page.waitForTimeout(200);
  ok((await texto(page, '#parceiros .form-error')).includes('Preencha o usuário e a senha'), 'sem senha: pede usuário e senha, não e-mail');
  await abrirFicha(page, 'a2');
  const dono = await page.evaluate(() => ({ t: document.querySelector('.ficha-dono')?.innerText || '', href: document.querySelector('.ficha-dono a')?.getAttribute('href') || '' }));
  ok(dono.t.includes('Gerencie a ficha no GuiaTennis Parceiros') && dono.href === '/parceiros/cadastro?academia=a2', 'ficha convida o responsável para o GuiaTennis Parceiros — ' + dono.href);
  const menu = await page.evaluate(() => { state.showMenu = true; render(); return document.querySelector('.menu-drawer').innerText; });
  ok(menu.includes('GuiaTennis Parceiros') && !menu.includes('Área do GuiaTennis') && !menu.includes('Cadastrar academia') && menu.includes('Entrar ou criar conta'), 'menu do site tem o GuiaTennis Parceiros e um Entrar só, sem a "Área do GuiaTennis"');
  await page.evaluate(() => { state.showMenu = false; render(); });
  const respostaVisitante = await page.evaluate(() => document.querySelectorAll('.rev-resp-links, [data-responder]').length);
  ok(respostaVisitante === 0, 'visitante não vê botão de responder');
  await browser.close();

  // Link antigo ?entrar (mensagens já mandadas) cai no mesmo lugar.
  ({ browser, page } = await abrir({ q: '?entrar&utm_source=WhatsApp-academias' }));
  login = await page.evaluate(() => ({ titulo: document.querySelector('#parceiros h1')?.innerText || '', url: location.pathname + location.search }));
  ok(login.titulo === 'Entre ou cadastre a sua academia' && login.url === '/parceiros/entrar?utm_source=WhatsApp-academias', 'link antigo ?entrar vira /parceiros/entrar, mantendo a etiqueta — ' + login.url);
  await browser.close();

  // ---- primeiro acesso: login com usuário, dados do responsável e senha nova ----
  ({ browser, page } = await abrir({ q: 'parceiros/entrar', avaliacoes: AVALIACOES }));
  await page.evaluate(() => {
    // O Breno criou o acesso: usuário quadra.a2, senha provisória.
    window.__db.academia_acessos.push({ user_id: 'u-a2', academia_id: 'a2', usuario: 'quadra.a2' });
    window.__senhas['quadra.a2@acesso.guiatennis.com.br'] = 'kpxw-4827';
  });
  await irSenha(page, ' Quadra.A2 ');
  await page.fill('#login-password', 'kpxw-4827');
  await page.click('#login-submit');
  await page.waitForTimeout(600);
  // Até entrar, era visitante: o acesso contou. Daqui em diante, nada conta.
  const cliquesAntes = await page.evaluate(() => window.__cliques.length);
  let email = await page.evaluate(() => window.__ultimoLogin);
  ok(email === 'quadra.a2@acesso.guiatennis.com.br', 'usuário vira o e-mail do login, sem espaço nem maiúscula — ' + email);
  let folha = await texto(page, '#parceiros .pc-main');
  ok(/primeiro acesso/i.test(folha) && folha.includes('Bem-vindos!') && folha.includes('Quadra Locação') && await page.isVisible('#conta-senha'), 'primeiro acesso abre sozinho, com a academia e a senha nova');
  ok(folha.includes('Represento esta academia'), 'primeiro acesso pede o aceite dos Termos');
  ok(await page.evaluate(() => location.pathname === '/parceiros/painel'), 'antes de completar, fica no painel — ' + await page.evaluate(() => location.pathname));
  await page.click('#conta-salvar-dados');
  await page.waitForTimeout(200);
  ok((await texto(page, '#parceiros .form-error')).includes('tratamento'), 'sem os dados, pede o primeiro que falta (tratamento)');
  ok(await page.isVisible('#conta-sobrenome') && await page.isVisible('#conta-cargo') && (await texto(page, '#parceiros .campo-ddi')) === 'Brasil (+55)', 'primeiro acesso com os mesmos dados de contato do cadastro (nome e sobrenome, cargo, telefone com o país)');
  await page.selectOption('#conta-tratamento', 'Sra.');
  await page.fill('#conta-nome', 'Maria');
  await page.click('#conta-salvar-dados');
  await page.waitForTimeout(200);
  ok((await texto(page, '#parceiros .form-error')).includes('sobrenome'), 'sem sobrenome, pede o sobrenome');
  await page.fill('#conta-sobrenome', 'Exemplo');
  await page.selectOption('#conta-cargo', 'Gerente');
  await page.fill('#conta-email', 'Maria@Exemplo.com');
  await page.fill('#conta-whatsapp', '(11) 90000-0001');
  await page.fill('#conta-senha', 'senhanova1');
  await page.fill('#conta-senha2', 'senhanova2');
  await page.click('#conta-salvar-dados');
  await page.waitForTimeout(200);
  ok((await texto(page, '#parceiros .form-error')).includes('não estão iguais'), 'senhas diferentes: avisa');
  await page.fill('#conta-senha2', 'senhanova1');
  await page.click('#conta-salvar-dados');
  await page.waitForTimeout(200);
  ok((await texto(page, '#parceiros .form-error')).includes('aceitar os Termos'), 'sem o aceite: avisa');
  await page.check('#parceiros .conta-check[data-campo="aceite"]');
  await page.click('#conta-salvar-dados');
  await page.waitForTimeout(900);
  const salvo = await page.evaluate(() => ({
    senha: window.__senhaNova, atual: window.__senhaAtualEnviada,
    rpcs: window.__rpcs.map(r => r.nome),
    completar: (window.__rpcs.find(r => r.nome === 'completar_meu_acesso') || {}).args,
    acesso: window.__db.academia_acessos.find(a => a.user_id === 'u-a2'),
  }));
  ok(salvo.senha === 'senhanova1' && salvo.atual === 'kpxw-4827', 'troca a senha provisória pelo login do Supabase');
  ok(salvo.rpcs.includes('marcar_senha_trocada'), 'anota que a senha foi trocada');
  ok(salvo.completar && salvo.completar.p_whatsapp === '11900000001' && salvo.completar.p_cargo === 'Gerente' && salvo.completar.p_nome === 'Maria Exemplo' && salvo.completar.p_tratamento === 'Sra.' && salvo.completar.p_aceite === true, 'grava o responsável com o WhatsApp só em números — ' + JSON.stringify(salvo.completar));
  folha = await texto(page, '#parceiros .pc-main');
  ok(folha.includes('Olá, Maria') && folha.includes('Tudo certo!'), 'depois do primeiro acesso, abre o painel com o nome do responsável');
  ok(folha.includes('Falta:') && folha.includes('Horário') && folha.includes('Fotos'), 'painel mostra o que falta na ficha');
  ok(folha.includes('ficha básica'), 'painel avisa que a ficha ainda é básica');
  ok(folha.includes('Os números da academia') && folha.includes('Disponível no plano Premium') && !folha.includes('Visitas na ficha'), 'painel do Básico: números só no Premium');
  ok(folha.includes('1 avaliação sem resposta'), 'painel conta as avaliações sem resposta');
  ok(!(await page.$('.pc-barra-baixo')) && await page.isVisible('#pc-menu-btn'), 'no celular, sem barra de atalhos embaixo: tudo pelo menu');

  // Perfil: responsável e usuário.
  await menuPc(page, 'perfil');
  await page.waitForTimeout(200);
  folha = await texto(page, '#parceiros .pc-main');
  ok(folha.includes('Maria Exemplo') && folha.includes('Gerente') && folha.includes('Usuário: quadra.a2') && await page.evaluate(() => location.pathname) === '/parceiros/perfil', 'Perfil mostra o responsável e o usuário');

  // Responder avaliação.
  await menuPc(page, 'avaliacoes');
  await page.waitForTimeout(200);
  const semApagar = await page.evaluate(() => document.querySelectorAll('#parceiros .delete-review-btn').length);
  ok(semApagar === 0, 'academia não tem botão de apagar avaliação');
  const analise = await page.evaluate(() => ({ href: document.querySelector('#parceiros .ht-rev-top .rev-analise')?.getAttribute('href') || '', naResposta: !!document.querySelector('#parceiros .rev-resp-links a[href*="wa.me"]') }));
  ok(decodeURIComponent(analise.href).includes('peço a análise de uma avaliação') && decodeURIComponent(analise.href).includes('Carla') && !analise.naResposta, '"Pedir análise" fica na própria avaliação (não na resposta) e abre o WhatsApp do guia com ela');
  await page.click('#parceiros [data-responder="r1"]');
  await page.fill('#resposta-texto', 'Obrigado, Carla! Estamos reformando o vestiário.');
  await page.click('#resposta-publicar');
  await page.waitForTimeout(700);
  const resp = await page.evaluate(() => window.__db.respostas.map(r => ({ id: r.avaliacao_id, t: r.texto })));
  ok(resp.length === 1 && resp[0].id === 'r1' && resp[0].t.startsWith('Obrigado, Carla'), 'resposta gravada na avaliação certa');
  folha = await texto(page, '#parceiros .pc-main');
  const semResp = await page.evaluate(() => [...document.querySelectorAll('#parceiros .pc-num')].find(n => n.innerText.includes('Sem resposta'))?.querySelector('.pc-num-v')?.innerText);
  ok(folha.includes('Resposta da academia') && semResp === '0', 'Avaliações mostra a resposta publicada e zera as sem resposta');

  // Editar a ficha: só o que é dela, e confirma a ficha.
  await menuPc(page, 'ficha');
  await page.waitForTimeout(200);
  folha = await texto(page, '#parceiros .pc-main');
  ok(folha.includes('Minha ficha') && folha.includes('itens preenchidos'), 'Minha ficha mostra quanto da ficha está preenchido');
  await page.click('#parceiros .editar-academia');
  await page.waitForTimeout(300);
  const form = await page.evaluate(() => ({
    titulo: document.querySelector('#register-overlay .reg-cabeca')?.innerText || '',
    confirmada: !!document.getElementById('f-confirmada'),
    pagina: state.page,
  }));
  await irParte(page, 'revisar');
  form.confirmada = form.confirmada || await page.evaluate(() => !!document.getElementById('f-confirmada'));
  ok(form.titulo === 'Editar Quadra Locação' && !form.confirmada && form.pagina === 'parceiros', 'edita a própria ficha, sem a caixa do admin — ' + form.titulo);
  await irParte(page, 'contato');
  // Nada trava no meio (03/10/2026): Instagram e site abertos no Básico; o
  // que o plano esconde aparece ao salvar.
  ok(await page.evaluate(() => !document.getElementById('f-instagram').disabled && !document.getElementById('f-site').disabled && !document.querySelector('.reg-plano-nota')), 'Básico: Instagram e site abertos, sem aviso no meio');
  await page.fill('#f-phone', '11911112222');
  await page.click('#register-submit');
  await page.waitForTimeout(300);
  const tela = await texto(page, '#register-overlay');
  ok(tela.includes('Quase lá: escolha o plano') && tela.includes('A regra de cancelamento e reposição'), 'ao salvar, mostra o que o Básico esconde (o cancelamento que a academia já tinha)');
  await page.click('[data-reg-plano="basico"]');
  await page.waitForTimeout(900);
  const up = await page.evaluate(() => window.__ultimoUpdate || {});
  ok(up.phone === '11911112222' && !('status' in up) && !('plano' in up) && !('pausada' in up) && !('confirmada' in up), 'salva sem mandar status, plano, pausa nem confirmada — ' + Object.keys(up).join(','));
  ok((await texto(page, '#register-overlay')).includes('Já estão na ficha'), 'avisa que as mudanças já estão na ficha');
  await page.click('#register-close-2');
  await page.waitForTimeout(200);
  folha = await texto(page, '#parceiros .pc-main');
  ok(folha.includes('confirmadas por vocês'), 'depois de salvar, Minha ficha mostra a ficha confirmada');

  // A própria ficha: sem avaliar a si mesma, com a resposta embaixo da avaliação.
  await abrirFicha(page, 'a2');
  const ficha = await page.evaluate(() => ({
    rate: document.querySelector('.rate-box')?.innerText || '',
    estrelas: document.querySelectorAll('#star-picker').length,
    dono: document.querySelector('.dono-box')?.innerText || '',
    basica: !!document.querySelector('.ficha-basica'),
    resposta: document.querySelector('.ht-revs .rev-resp')?.innerText || '',
    responsavel: !!document.querySelector('.ficha-dono'),
    banner: document.querySelector('.conta-banner')?.innerText || '',
  }));
  ok(ficha.rate.includes('não podem avaliar a própria academia') && ficha.estrelas === 0, 'academia não avalia a si mesma');
  ok(ficha.dono.includes('Esta é a ficha de vocês'), 'ficha da academia tem o atalho para editar');
  ok(!ficha.basica, 'depois de salvar pela academia, some o aviso de ficha básica');
  ok(ficha.resposta.includes('Resposta da academia') && ficha.resposta.includes('reformando o vestiário'), 'resposta aparece na ficha');
  ok(!ficha.responsavel, 'na ficha dela, a academia não vê "É o responsável?"');
  ok(!ficha.banner, 'no site dos jogadores, sem a faixa "Área da academia" no topo (05/10/2026)');
  await vigiarAbas(page);
  await page.click('.dono-box [data-abrir-conta]');
  await page.waitForTimeout(300);
  let abas = await abasAbertas(page);
  ok(abas.length === 1 && abas[0].url === 'http://guia.test/parceiros/painel' && abas[0].nome === 'guiatennis-parceiros' && await page.evaluate(() => state.page === 'court'), 'atalho da ficha abre o painel do GuiaTennis Parceiros, na aba dele — ' + (abas[0] || {}).url);
  await abrirFicha(page, 'a1');
  const outra = await page.evaluate(() => ({
    responder: document.querySelectorAll('[data-responder]').length,
    editar: document.querySelectorAll('.editar-academia').length,
    dono: !!document.querySelector('.dono-box'),
    estrelas: document.querySelectorAll('#star-picker').length,
  }));
  ok(outra.responder === 0 && outra.editar === 0 && !outra.dono, 'na ficha de outra academia não há editar nem responder');
  const outraTexto = await texto(page, '.rate-box');
  // Desde 05/10/2026 a conta do Parceiros avalia as outras academias como
  // qualquer jogador (só a que administra, não).
  ok(outra.estrelas === 1 && !outraTexto.includes('não avaliam'), 'academia logada avalia as outras academias, como qualquer jogador');
  const cliques = await page.evaluate(() => window.__cliques.length);
  ok(cliques === cliquesAntes, 'academia logada não entra nas estatísticas — ' + (cliques - cliquesAntes) + ' cliques depois de entrar');
  await browser.close();

  // ---- academia já logada, voltando depois ----
  ({ browser, page } = await abrir({ academia: 'a2', avaliacoes: AVALIACOES, respostas: [{ avaliacao_id: 'r1', texto: 'Obrigado!', created_at: '2026-09-22T12:00:00Z', updated_at: '2026-09-22T12:00:00Z' }] }));
  let inicio = await page.evaluate(() => ({
    banner: document.querySelector('.conta-banner')?.innerText || '',
    pagina: state.page,
    cliques: window.__cliques.length,
  }));
  ok(!inicio.banner && inicio.pagina === 'home', 'volta logada: o site dos jogadores fica limpo, sem faixa nem nada por cima');
  ok(inicio.cliques === 0, 'acesso da academia logada não conta');
  await vigiarAbas(page);
  await page.evaluate(() => { state.showMenu = true; render(); });
  const doMenu = await page.evaluate(() => [...document.querySelectorAll('#menu-overlay .menu-item')].slice(0, 2).map(e => e.innerText));
  ok(doMenu[0].includes('Minha conta') && doMenu[1].includes('Minha academia'), 'o menu começa por "Minha conta" e "Minha academia" — ' + doMenu.join(' | ').replace(/\s+/g, ' '));
  await page.click('#menu-overlay [data-menu="conta"]');
  await page.waitForTimeout(300);
  const abaDaFaixa = (await abasAbertas(page))[0] || {};
  ok(abaDaFaixa.url === 'http://guia.test/parceiros/painel' && abaDaFaixa.nome === 'guiatennis-parceiros', 'o menu abre o painel do GuiaTennis Parceiros, na aba dele');
  await page.goto(abaDaFaixa.url);
  await page.waitForTimeout(700);
  ok(await page.evaluate(() => location.pathname === '/parceiros/painel' && !!document.querySelector('#parceiros .pc-trancado')), 'lá, o painel (Básico: números trancados)');
  await menuPc(page, 'avaliacoes');
  await page.waitForTimeout(200);
  page.once('dialog', d => d.accept());
  await page.click('#parceiros [data-apagar-resposta="r1"]');
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => window.__db.respostas.length === 0), 'academia apaga a própria resposta');
  await menuPc(page, 'perfil');
  await page.waitForTimeout(200);
  await page.click('#conta-trocar-senha');
  await page.fill('#senha-atual', 'errada');
  await page.fill('#senha-nova', 'outrasenha9');
  await page.fill('#senha-nova2', 'outrasenha9');
  await page.click('#conta-salvar-senha');
  await page.waitForTimeout(400);
  ok((await texto(page, '#parceiros .form-error')).includes('senha atual não confere'), 'trocar senha confere a senha atual');
  await page.fill('#senha-atual', 'provisoria1');
  await page.click('#conta-salvar-senha');
  await page.waitForTimeout(600);
  ok((await texto(page, '#parceiros .pc-main')).includes('Senha trocada') && await page.evaluate(() => window.__senhaNova === 'outrasenha9'), 'senha trocada pela Conta');
  await browser.close();

  // Logada, /parceiros abre direto o painel.
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros' }));
  ok(await page.evaluate(() => state.parceirosAba === 'painel' && location.pathname === '/parceiros/painel'), 'logada, /parceiros abre o painel');
  await browser.close();

  // ---- login sem acesso (removido) fica de fora ----
  ({ browser, page } = await abrir({ q: 'parceiros/entrar' }));
  await page.evaluate(() => { window.__senhas['antiga@acesso.guiatennis.com.br'] = 'provisoria1'; });
  await irSenha(page, 'antiga');
  await page.fill('#login-password', 'provisoria1');
  await page.click('#login-submit');
  await page.waitForTimeout(500);
  const fora = await page.evaluate(() => ({ erro: document.querySelector('#parceiros .form-error')?.innerText || '', saiu: !!window.__saiu, conta: !!contaAcademia, admin: isAdmin }));
  ok(fora.erro.includes('não está ativo') && fora.saiu && !fora.conta && !fora.admin, 'login sem academia não entra e não vira admin');
  await browser.close();

  // ---- admin cria o acesso ----
  ({ browser, page } = await abrir({ admin: true, colunasFechadas: true, avaliacoes: AVALIACOES }));
  await abrirFicha(page, 'a2');
  let caixa = await texto(page, '.acesso-admin');
  const sugestao = await page.evaluate(() => document.getElementById('acesso-usuario')?.value);
  ok(caixa.includes('Acesso da academia') && sugestao === 'quadra.locacao', 'ficha do admin sugere o usuário pelo nome — ' + sugestao);
  await page.click('#acesso-criar');
  await page.waitForTimeout(600);
  const criado = await page.evaluate(() => ({
    rpc: (window.__rpcs.find(r => r.nome === 'criar_acesso_academia') || {}).args,
    caixa: document.querySelector('.acesso-admin')?.innerText || '',
    wa: document.querySelector('.acesso-novo a')?.getAttribute('href') || '',
  }));
  ok(criado.rpc && criado.rpc.p_academia === 'a2' && criado.rpc.p_usuario === 'quadra.locacao' && /^[a-z2-9]{4}-[a-z2-9]{4}$/.test(criado.rpc.p_senha), 'cria o usuário com senha provisória fácil de digitar — ' + (criado.rpc && criado.rpc.p_senha));
  const msg = decodeURIComponent(criado.wa);
  ok(criado.wa.startsWith('https://wa.me/5511999990002?text=') && msg.includes('Usuário: quadra.locacao') && msg.includes('Senha provisória: ' + criado.rpc.p_senha) && msg.includes('guiatennis.com.br/parceiros/entrar?utm_source=WhatsApp-academias') && msg.includes('guiatennis.com.br/academia/quadra-locacao-a2'), 'mensagem pronta para o WhatsApp da academia, com o link, usuário e senha');
  ok(criado.caixa.includes('Esperando o primeiro acesso') && criado.caixa.includes('ainda não entrou'), 'caixa mostra que a academia ainda não entrou');
  const contato = await page.evaluate(() => document.querySelector('.ht-revs .rev-date')?.innerText || '');
  ok(contato.includes('11955550001'), 'admin continua vendo o WhatsApp de quem avaliou (pela função do banco) — ' + contato);
  await page.evaluate(() => { state.showAdminPanel = true; render(); });
  const painel = await texto(page, '#admin-overlay');
  ok(painel.includes('Acessos das academias') && painel.includes('quadra.locacao'), 'painel do admin lista os acessos');
  await browser.close();

  // ---- admin vê e apaga resposta (moderação) ----
  ({ browser, page } = await abrir({ admin: true, avaliacoes: AVALIACOES, respostas: [{ avaliacao_id: 'r1', texto: 'Resposta grosseira', created_at: '2026-09-22T12:00:00Z' }] }));
  await abrirFicha(page, 'a2');
  page.once('dialog', d => d.accept());
  await page.click('.rev-resp [data-apagar-resposta="r1"]');
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => window.__db.respostas.length === 0), 'admin apaga resposta que desrespeita as regras');
  await browser.close();

  // ---- banco sem o SQL do acesso das academias ----
  ({ browser, page } = await abrir({ semAcesso: true, avaliacoes: AVALIACOES }));
  await abrirFicha(page, 'a2');
  const semSql = await page.evaluate(() => ({ n: state.allCourts.length, revs: document.querySelectorAll('.ht-rev').length }));
  ok(semSql.n === 2 && semSql.revs === 1, 'banco sem o SQL novo: site e avaliações seguem normais');
  await browser.close();
  ({ browser, page } = await abrir({ admin: true, semAcesso: true, avaliacoes: AVALIACOES }));
  await abrirFicha(page, 'a2');
  caixa = await texto(page, '.acesso-admin');
  const contatoAntigo = await page.evaluate(() => document.querySelector('.ht-revs .rev-date')?.innerText || '');
  ok(caixa.includes('ainda não tem o acesso das academias'), 'admin é avisado que falta o SQL');
  ok(contatoAntigo.includes('11955550001'), 'banco antigo: admin lê o contato direto, como antes');
  await browser.close();

  // ---- textos legais ----
  ({ browser, page } = await abrir({}));
  const legal = await page.evaluate(() => TERMS_HTML + PRIVACY_HTML);
  ok(legal.includes('4. GuiaTennis Parceiros') && legal.includes('não avalia essa academia') && legal.includes('identificado como patrocinado') && legal.includes('pessoas da mesma academia veem') && legal.includes('não pode apagar avaliações') && legal.includes('Responsável pela academia'), 'Termos e Privacidade explicam a área da academia');
  await browser.close();
})();
