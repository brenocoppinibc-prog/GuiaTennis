// Área da academia: login com usuário e senha provisória, primeiro acesso,
// edição só da própria ficha, respostas às avaliações, o que a academia não
// vê nem faz, e o bloco do admin que cria o acesso.
const { abrir, ok } = require('./harness');

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
  let { browser, page } = await abrir({ q: '?entrar&utm_source=WhatsApp-academias', avaliacoes: AVALIACOES });
  let login = await page.evaluate(() => ({
    titulo: document.querySelector('#login-overlay .sheet-title')?.innerText || '',
    campo: document.getElementById('login-email')?.getAttribute('placeholder') || '',
    ajuda: document.querySelector('#login-overlay .footnote a')?.getAttribute('href') || '',
    url: location.search,
  }));
  ok(login.titulo === 'Área da academia' && login.campo === 'Usuário', 'link ?entrar abre o login da academia, pedindo usuário — ' + login.titulo);
  ok(login.ajuda.startsWith('https://wa.me/5511927456457'), 'login da academia tem o WhatsApp do guia para quem esqueceu a senha');
  ok(!login.url.includes('entrar') && login.url.includes('utm_source=WhatsApp-academias'), 'o "entrar" sai do endereço e a etiqueta fica — ' + login.url);
  await page.fill('#login-email', 'quadra.a2');
  await page.fill('#login-password', 'errada');
  await page.click('#login-submit');
  await page.waitForTimeout(300);
  ok((await texto(page, '#login-overlay .form-error')).includes('Usuário ou senha incorretos'), 'senha errada: mensagem simples');
  await page.click('#login-close');
  await abrirFicha(page, 'a2');
  const dono = await texto(page, '.ficha-dono');
  ok(dono.includes('Já tem acesso?') && dono.includes('Entre na área da academia'), 'ficha convida o responsável a entrar — ' + dono);
  const menu = await page.evaluate(() => { state.showMenu = true; render(); return document.querySelector('.menu-drawer').innerText; });
  ok(menu.includes('Entrar na área da academia') && menu.includes('Área do GuiaTennis'), 'menu tem a entrada da academia e a do GuiaTennis');
  const respostaVisitante = await page.evaluate(() => document.querySelectorAll('.rev-resp-links, [data-responder]').length);
  ok(respostaVisitante === 0, 'visitante não vê botão de responder');
  await browser.close();

  // ---- primeiro acesso: login com usuário, dados do responsável e senha nova ----
  ({ browser, page } = await abrir({ q: '?entrar', avaliacoes: AVALIACOES }));
  await page.evaluate(() => {
    // O Breno criou o acesso: usuário quadra.a2, senha provisória.
    window.__db.academia_acessos.push({ user_id: 'u-a2', academia_id: 'a2', usuario: 'quadra.a2' });
    window.__senhas['quadra.a2@acesso.guiatennis.com.br'] = 'kpxw-4827';
  });
  await page.fill('#login-email', ' Quadra.A2 ');
  await page.fill('#login-password', 'kpxw-4827');
  await page.click('#login-submit');
  await page.waitForTimeout(600);
  // Até entrar, era visitante: o acesso contou. Daqui em diante, nada conta.
  const cliquesAntes = await page.evaluate(() => window.__cliques.length);
  let email = await page.evaluate(() => window.__ultimoLogin);
  ok(email === 'quadra.a2@acesso.guiatennis.com.br', 'usuário vira o e-mail do login, sem espaço nem maiúscula — ' + email);
  let folha = await texto(page, '#conta-overlay');
  ok(folha.includes('Bem-vindos!') && folha.includes('Quadra Locação') && await page.isVisible('#conta-senha'), 'primeiro acesso abre sozinho, com a academia e a senha nova');
  ok(folha.includes('Represento esta academia'), 'primeiro acesso pede o aceite dos Termos');
  await page.click('#conta-salvar-dados');
  await page.waitForTimeout(200);
  ok((await texto(page, '#conta-overlay .form-error')).includes('nome do responsável'), 'sem nome, pede o nome');
  await page.fill('#conta-nome', 'Maria Exemplo');
  await page.click('[data-cargo="Gerente"]');
  await page.fill('#conta-email', 'Maria@Exemplo.com');
  await page.fill('#conta-whatsapp', '(11) 90000-0001');
  await page.fill('#conta-senha', 'senhanova1');
  await page.fill('#conta-senha2', 'senhanova2');
  await page.click('#conta-salvar-dados');
  await page.waitForTimeout(200);
  ok((await texto(page, '#conta-overlay .form-error')).includes('não estão iguais'), 'senhas diferentes: avisa');
  await page.fill('#conta-senha2', 'senhanova1');
  await page.click('#conta-salvar-dados');
  await page.waitForTimeout(200);
  ok((await texto(page, '#conta-overlay .form-error')).includes('aceitar os Termos'), 'sem o aceite: avisa');
  await page.check('#conta-overlay .conta-check[data-campo="aceite"]');
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
  ok(salvo.completar && salvo.completar.p_whatsapp === '11900000001' && salvo.completar.p_cargo === 'Gerente' && salvo.completar.p_aceite === true, 'grava o responsável com o WhatsApp só em números — ' + JSON.stringify(salvo.completar));
  folha = await texto(page, '#conta-overlay');
  ok(folha.includes('Tudo certo!') && folha.includes('Ainda falta na ficha') && folha.includes('Horário') && folha.includes('Fotos'), 'depois do primeiro acesso, o painel mostra o que falta na ficha');
  ok(folha.includes('Maria Exemplo') && folha.includes('Gerente') && folha.includes('Usuário: quadra.a2'), 'painel mostra o responsável e o usuário');
  ok(folha.includes('ficha básica'), 'painel avisa que a ficha ainda é básica');

  // Responder avaliação pelo painel.
  ok(folha.includes('1 avaliação · 1 sem resposta'), 'painel conta as avaliações sem resposta — ' + folha.match(/\d+ avalia[^.]*/)?.[0]);
  const semApagar = await page.evaluate(() => document.querySelectorAll('#conta-overlay .delete-review-btn').length);
  ok(semApagar === 0, 'academia não tem botão de apagar avaliação');
  const analise = await page.evaluate(() => document.querySelector('#conta-overlay .rev-resp-links a')?.getAttribute('href') || '');
  ok(decodeURIComponent(analise).includes('peço a análise de uma avaliação') && decodeURIComponent(analise).includes('Carla'), 'pedir análise abre o WhatsApp do guia com a avaliação');
  await page.click('#conta-overlay [data-responder="r1"]');
  await page.fill('#resposta-texto', 'Obrigado, Carla! Estamos reformando o vestiário.');
  await page.click('#resposta-publicar');
  await page.waitForTimeout(700);
  const resp = await page.evaluate(() => window.__db.respostas.map(r => ({ id: r.avaliacao_id, t: r.texto })));
  ok(resp.length === 1 && resp[0].id === 'r1' && resp[0].t.startsWith('Obrigado, Carla'), 'resposta gravada na avaliação certa');
  folha = await texto(page, '#conta-overlay');
  ok(folha.includes('Resposta da academia') && folha.includes('todas respondidas'), 'painel mostra a resposta publicada');

  // Editar a ficha: só o que é dela, e confirma a ficha.
  await page.click('#conta-overlay .editar-academia');
  await page.waitForTimeout(300);
  const form = await page.evaluate(() => ({
    titulo: document.querySelector('#register-overlay .sheet-title')?.innerText || '',
    confirmada: !!document.getElementById('f-confirmada'),
    conta: !!document.getElementById('conta-overlay'),
  }));
  ok(form.titulo === 'Editar Quadra Locação' && !form.confirmada && !form.conta, 'edita a própria ficha, sem a caixa do admin — ' + form.titulo);
  await page.fill('#f-instagram', '@quadralocacao');
  await page.click('#register-submit');
  await page.waitForTimeout(900);
  const up = await page.evaluate(() => window.__ultimoUpdate || {});
  ok(up.instagram === '@quadralocacao' && !('status' in up) && !('plano' in up) && !('pausada' in up) && !('confirmada' in up), 'salva sem mandar status, plano, pausa nem confirmada — ' + Object.keys(up).join(','));
  ok((await texto(page, '#register-overlay')).includes('Já estão na ficha'), 'avisa que as mudanças já estão na ficha');
  await page.click('#register-close-2');

  // A própria ficha: sem avaliar a si mesma, com a resposta embaixo da avaliação.
  await abrirFicha(page, 'a2');
  const ficha = await page.evaluate(() => ({
    rate: document.querySelector('.rate-box')?.innerText || '',
    estrelas: document.querySelectorAll('#star-picker').length,
    dono: document.querySelector('.dono-box')?.innerText || '',
    basica: !!document.querySelector('.ficha-basica'),
    resposta: document.querySelector('.ht-revs .rev-resp')?.innerText || '',
    responsavel: !!document.querySelector('.ficha-dono'),
  }));
  ok(ficha.rate.includes('não podem avaliar a própria academia') && ficha.estrelas === 0, 'academia não avalia a si mesma');
  ok(ficha.dono.includes('Esta é a ficha de vocês'), 'ficha da academia tem o atalho para editar');
  ok(!ficha.basica, 'depois de salvar pela academia, some o aviso de ficha básica');
  ok(ficha.resposta.includes('Resposta da academia') && ficha.resposta.includes('reformando o vestiário'), 'resposta aparece na ficha');
  ok(!ficha.responsavel, 'na ficha dela, a academia não vê "É o responsável?"');
  await abrirFicha(page, 'a1');
  const outra = await page.evaluate(() => ({
    responder: document.querySelectorAll('[data-responder]').length,
    editar: document.querySelectorAll('.editar-academia').length,
    dono: !!document.querySelector('.dono-box'),
    estrelas: document.querySelectorAll('#star-picker').length,
  }));
  ok(outra.responder === 0 && outra.editar === 0 && !outra.dono, 'na ficha de outra academia não há editar nem responder');
  ok(outra.estrelas === 1, 'avaliar outra academia continua como para qualquer visitante');
  const cliques = await page.evaluate(() => window.__cliques.length);
  ok(cliques === cliquesAntes, 'academia logada não entra nas estatísticas — ' + (cliques - cliquesAntes) + ' cliques depois de entrar');
  await browser.close();

  // ---- academia já logada, voltando depois ----
  ({ browser, page } = await abrir({ academia: 'a2', avaliacoes: AVALIACOES, respostas: [{ avaliacao_id: 'r1', texto: 'Obrigado!', created_at: '2026-09-22T12:00:00Z', updated_at: '2026-09-22T12:00:00Z' }] }));
  let inicio = await page.evaluate(() => ({
    banner: document.querySelector('.conta-banner')?.innerText || '',
    conta: !!document.getElementById('conta-overlay'),
    cliques: window.__cliques.length,
  }));
  ok(inicio.banner.includes('Área da academia') && inicio.banner.includes('Quadra Locação') && !inicio.conta, 'volta logada: faixa da área da academia, sem abrir nada por cima');
  ok(inicio.cliques === 0, 'acesso da academia logada não conta');
  await page.click('.conta-banner [data-abrir-conta]');
  page.once('dialog', d => d.accept());
  await page.click('#conta-overlay [data-apagar-resposta="r1"]');
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => window.__db.respostas.length === 0), 'academia apaga a própria resposta');
  await page.click('#conta-trocar-senha');
  await page.fill('#senha-atual', 'errada');
  await page.fill('#senha-nova', 'outrasenha9');
  await page.fill('#senha-nova2', 'outrasenha9');
  await page.click('#conta-salvar-senha');
  await page.waitForTimeout(400);
  ok((await texto(page, '#conta-overlay .form-error')).includes('senha atual não confere'), 'trocar senha confere a senha atual');
  await page.fill('#senha-atual', 'provisoria1');
  await page.click('#conta-salvar-senha');
  await page.waitForTimeout(600);
  ok((await texto(page, '#conta-overlay')).includes('Senha trocada') && await page.evaluate(() => window.__senhaNova === 'outrasenha9'), 'senha trocada pelo painel');
  await browser.close();

  // ---- login sem acesso (removido) fica de fora ----
  ({ browser, page } = await abrir({}));
  await page.evaluate(() => { window.__senhas['antiga@acesso.guiatennis.com.br'] = 'provisoria1'; state.showLogin = true; state.loginModo = 'academia'; render(); });
  await page.fill('#login-email', 'antiga');
  await page.fill('#login-password', 'provisoria1');
  await page.click('#login-submit');
  await page.waitForTimeout(500);
  const fora = await page.evaluate(() => ({ erro: document.querySelector('#login-overlay .form-error')?.innerText || '', saiu: !!window.__saiu, conta: !!contaAcademia, admin: isAdmin }));
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
  ok(criado.wa.startsWith('https://wa.me/5511999990002?text=') && msg.includes('Usuário: quadra.locacao') && msg.includes('Senha provisória: ' + criado.rpc.p_senha) && msg.includes('?entrar&utm_source=WhatsApp-academias') && msg.includes('?court=a2'), 'mensagem pronta para o WhatsApp da academia, com o link, usuário e senha');
  ok(criado.caixa.includes('Esperando o primeiro acesso') && criado.caixa.includes('ainda não entrou'), 'caixa mostra que a academia ainda não entrou');
  const contato = await page.evaluate(() => document.querySelector('.ht-revs .rev-date')?.innerText || '');
  ok(contato.includes('11955550001'), 'admin continua vendo o WhatsApp de quem avaliou (pela função do banco) — ' + contato);
  await page.evaluate(() => { state.showAdminPanel = true; render(); });
  const painel = await texto(page, '#admin-overlay');
  ok(painel.includes('Acessos das academias') && painel.includes('Usuário quadra.locacao'), 'painel do admin lista os acessos');
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
  ok(legal.includes('4. Área da academia') && legal.includes('não pode apagar avaliações') && legal.includes('Responsável pela academia'), 'Termos e Privacidade explicam a área da academia');
  await browser.close();
})();
