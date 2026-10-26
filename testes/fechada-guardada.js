// A academia que fechou fica guardada e todas as pendências chegam ao painel
// (pedido do Breno em 26/10/2026: "para academias aparecer que o whatsapp
// precisa de confirmação e que ele não ficará público até ser confirmado";
// "não quero que academias sejam excluídas por completo do site, manter no
// sistema para possível reinauguração ou ter o controle de quantas academia
// já tivemos no site, e se um email que já possuío uma academia, retornar,
// aparecer uma pergunta se ele deseja administrar aquela academia novamente
// ou um novo email pesquisar o nome daquela academia e aparecer algo como
// fechado permanente/ cadastro inativo"; "eu preciso que todas notificações
// de pendências chegue ao meu perfil, sobre tudo que devo fazer"; SQL
// 20261026200000, regra 158).
const { abrir, ok, irParte, salvarFicha } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const LOGIN_A1 = 'quadra.a1@acesso.guiatennis.com.br';
// Fecha a a1 como o banco faz (guardar_academia_fechada).
const fecharA1 = (page, emails) => page.evaluate(async (emails) => {
  const ac = window.__db.academias.find(a => a.id === 'a1');
  Object.assign(ac, { status: 'fechada', fechada_em: new Date(Date.now() - 20 * 86400000).toISOString(), fechada_emails: emails, plano: 'basico' });
  window.__db.academia_vinculos = window.__db.academia_vinculos.filter(v => v.academia_id !== 'a1');
  window.__db.academia_acessos.forEach(x => { if (x.academia_id === 'a1') x.academia_id = null; x.email_confirmado_em = new Date().toISOString(); });
  await recarregarConta(); await loadEverything(); render();
}, emails);

(async () => {
  // ---- o WhatsApp: a academia vê que precisa de confirmação ----
  let { browser, page } = await abrir({ academia: 'a2', q: 'parceiros/ficha', plano: 'premium' });
  await page.evaluate(async () => { window.__db.academias.find(a => a.id === 'a2').plano = 'premium'; await loadEverything(); render(); });
  await page.click('#parceiros .editar-academia');
  await page.waitForTimeout(300);
  await irParte(page, 'contato');
  let dica = await texto(page, '.reg-whatsapp-dica');
  ok(dica.includes('precisa de confirmação') && dica.includes('não fica público até ser confirmado'), 'embaixo do WhatsApp: precisa de confirmação e não fica público até ser confirmado — ' + dica);
  await page.fill('#f-phone', '(11) 96666-2222');
  await irParte(page, 'revisar');
  let nota = await texto(page, '#reg-previa [data-previa="contato"] .reg-previa-nota');
  ok(nota.includes('Precisa de confirmação: o WhatsApp (11) 96666-2222 não fica público até ser confirmado'), 'a prévia diz embaixo do botão que o número não fica público ainda — ' + nota);
  await salvarFicha(page);
  await page.waitForTimeout(700);
  ok((await texto(page, '#register-overlay')).includes('Ele não fica público até ser confirmado'), 'a tela de pronto diz que o número não fica público até ser confirmado');
  await page.evaluate(() => { state.showRegister = false; irParceiros('painel'); });
  await page.waitForTimeout(400);
  ok((await texto(page, '#parceiros .pc-whatsapp-novo')).includes('Ele não fica público até ser confirmado'), 'Atualizações: o cartão do WhatsApp diz o mesmo');
  await page.evaluate(() => { state.page = 'search'; render(); openCourt('a2'); });
  await page.waitForTimeout(400);
  nota = await texto(page, '#ht-contato .ficha-whatsapp-novo');
  ok(nota.startsWith('Só vocês veem isto') && nota.includes('(11) 96666-2222') && nota.includes('não fica público até ser confirmado'), 'na própria ficha, só a academia vê o aviso do número esperando — ' + nota);
  await browser.close();
  ({ browser, page } = await abrir({}));
  await page.evaluate(async () => { Object.assign(window.__db.academias.find(a => a.id === 'a2'), { whatsapp_a_confirmar: '(11) 96666-2222' }); await loadEverything(); openCourt('a2'); });
  await page.waitForTimeout(400);
  ok(!(await page.$('#ht-contato .ficha-whatsapp-novo')), 'o jogador não vê esse aviso');
  await browser.close();

  // ---- a academia que fechou: o mesmo e-mail reabre ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel' }));
  await page.waitForTimeout(300);
  await fecharA1(page, [LOGIN_A1]);
  await page.evaluate(() => irParceiros('painel'));
  await page.waitForTimeout(400);
  let r = await texto(page, '#parceiros .pc-reabrir');
  ok(r.toLowerCase().includes('fechada permanentemente · cadastro inativo') && r.includes('A Só Aula Tennis reabriu?') && r.includes('O cadastro ficou guardado'),
    'quem administrava, com o mesmo e-mail, vê a pergunta "reabriu?" — ' + r.slice(0, 120));
  await page.click('[data-reabrir-minha="a1"]');
  await page.waitForTimeout(200);
  ok((await texto(page, '#parceiros .pc-reabrir .form-error')).includes('Marque a declaração'), 'sem a declaração, não reabre');
  await page.check('[data-reabrir-declaro="a1"]');
  await page.click('[data-reabrir-minha="a1"]');
  await page.waitForTimeout(800);
  r = await page.evaluate(() => ({ ac: window.__db.academias.find(a => a.id === 'a1'), v: window.__db.academia_vinculos.find(v => v.academia_id === 'a1'), aba: state.parceirosAba,
    aviso: document.querySelector('#parceiros .conta-aviso')?.innerText || '', email: window.__db.emails_a_enviar.find(e => e.tipo === 'academia_reaberta') }));
  ok(r.ac.status === 'published' && !!r.ac.revisar_desde && r.v && r.v.papel === 'principal' && r.aba === 'painel' && r.aviso.includes('voltou ao GuiaTennis'),
    '"Reabrir e administrar": a academia volta ao site e a conta administra de novo — ' + r.aviso);
  ok(!!r.email, 'o admin recebe "Academia reaberta"');
  await browser.close();

  // ---- outro e-mail acha "Fechada permanentemente · cadastro inativo" ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/cadastro' }));
  await page.waitForTimeout(300);
  await fecharA1(page, ['antigo@exemplo.com']);
  await page.evaluate(() => { irParceiros('cadastro'); });
  await page.waitForTimeout(300);
  await page.fill('#pc-busca', 'só aula');
  await page.waitForTimeout(300);
  r = await texto(page, '.pc-escolha-fechada');
  ok(r.includes('Só Aula Tennis') && r.includes('Fechada permanentemente · cadastro inativo') && !r.includes('você administrava'), 'na busca, a academia fechada aparece como "Fechada permanentemente · cadastro inativo" — ' + r);
  await page.click('.pc-escolha-fechada');
  await page.waitForTimeout(200);
  r = await page.evaluate(() => ({ botao: document.getElementById('pc-administrar')?.innerText || '', nota: document.querySelector('.pc-fechada-nota')?.innerText || '' }));
  ok(r.botao === 'A academia reabriu? Pedir para reabrir' && r.nota.includes('o GuiaTennis confere'), 'o botão vira "Pedir para reabrir", com o que acontece — ' + r.botao);
  await page.check('#pc-declaro');
  await page.click('#pc-administrar');
  await page.waitForTimeout(600);
  r = await page.evaluate(() => ({ p: (window.__db.pedidos_de_reabertura || [])[0], ac: window.__db.academias.find(a => a.id === 'a1'), email: window.__db.emails_a_enviar.find(e => e.tipo === 'pedido_de_reabertura') }));
  ok(r.p && !r.p.resolvido_em && r.ac.status === 'fechada' && !!r.email, 'pede ao GuiaTennis: a academia continua fechada até o admin decidir, e o admin recebe');
  await page.evaluate(() => { irParceiros('cadastro'); });
  await page.waitForTimeout(300);
  await page.fill('#pc-busca', 'só aula');
  await page.waitForTimeout(300);
  ok((await texto(page, '.pc-escolha-fechada')).includes('pedido para reabrir enviado'), 'a busca mostra que o pedido já foi enviado');
  await browser.close();

  // ---- o admin: fechar guarda, reabrir, as fechadas e todos os avisos ----
  ({ browser, page } = await abrir({ admin: true, q: 'admin/pendencias' }));
  await page.evaluate(async () => {
    const ac = window.__db.academias.find(a => a.id === 'a1');
    window.__db.academia_acessos.push({ user_id: 'u-rita', academia_id: 'a1', usuario: 'rita@exemplo.com', email: 'rita@exemplo.com', nome_responsavel: 'Rita', email_confirmado_em: new Date().toISOString(), avisos_por_email: true });
    window.__db.academia_vinculos.push({ user_id: 'u-rita', academia_id: 'a1', papel: 'principal' });
    ac.avisou_que_fechou_em = new Date().toISOString(); ac.pausada = true;
    window.__db.pedidos_para_sair.push({ id: 'saida-1', academia_id: 'a1', academia_nome: ac.name, user_id: 'u-rita', motivo: 'fechou', detalhes: null, pedido_em: new Date().toISOString(), resolvido_em: null, pausa_antes: { pausada: false } });
    // Uma denúncia e um WhatsApp esperando: o número do menu conta tudo.
    window.__db.academias.find(a => a.id === 'a2').whatsapp_a_confirmar = '(11) 95555-1111';
    await carregarAcessos(); await loadEverything(); render();
  });
  await page.waitForTimeout(300);
  r = await page.evaluate(() => ({ nav: document.querySelector('[data-adm-aba="pendencias"] .adm-nav-n')?.innerText || '0', total: pendenciasDoAdmin(),
    sino: document.querySelector('#adm-sino .adm-sino-n')?.innerText || '', tarefas: tarefasDoAdmin() }));
  ok(Number(r.nav) === r.total && r.total >= 2, 'o número de Pendências no menu conta tudo (antes ficavam de fora o WhatsApp, os problemas e as denúncias) — ' + r.nav);
  ok(r.sino && Number(r.sino) === r.tarefas, 'o sino no alto mostra quantas coisas esperam você — ' + r.sino);
  page.once('dialog', d => { r = d.message(); d.accept(); });
  await page.click('[data-saida-tirar="saida-1"]');
  await page.waitForTimeout(600);
  ok(r.includes('fica guardado como fechado (cadastro inativo)') && !r.includes('não pode ser desfeito'), '"Fechou: tirar do Guia" avisa que o cadastro fica guardado — ' + r.slice(0, 90));
  r = await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1'));
  ok(r && r.status === 'fechada' && (r.fechada_emails || []).includes('rita@exemplo.com') && r.plano === 'basico', 'a academia não é apagada: fica fechada, com o e-mail de quem administrava');
  await page.evaluate(() => { state.admFiltro = 'fechadas'; irAdmin('academias'); });
  await page.waitForTimeout(400);
  r = await texto(page, '.adm-fechada');
  ok(r.includes('Só Aula Tennis') && r.includes('Fechada') && r.includes('administrava: rita@exemplo.com') && r.includes('Reabrir (voltar ao Guia)'),
    'Academias › Fechadas: a academia guardada, com quem administrava e "Reabrir" — ' + r.slice(0, 140));
  await page.evaluate(() => irAdmin('inicio'));
  await page.waitForTimeout(300);
  r = await texto(page, '.adm-lista-num');
  ok(r.includes('Fechadas (cadastro inativo) 1') && r.includes('Já passaram pelo Guia 2'), 'a Visão geral conta as fechadas e quantas já passaram pelo Guia — ' + r.slice(0, 200));
  // Um pedido para reabrir de outra conta.
  await page.evaluate(async () => {
    window.__db.academia_acessos.push({ user_id: 'u-novo', academia_id: null, usuario: 'novo@exemplo.com', email: 'novo@exemplo.com', nome_responsavel: 'Novo Dono', email_confirmado_em: new Date().toISOString() });
    window.__db.pedidos_de_reabertura = window.__db.pedidos_de_reabertura || [];
    window.__db.pedidos_de_reabertura.push({ id: 'reab-1', academia_id: 'a1', user_id: 'u-novo', detalhes: 'Reabrimos com outra gestão.', criado_em: new Date().toISOString(), resolvido_em: null });
    window.__db.emails_a_enviar.push({ id: 'e-reab', tipo: 'pedido_de_reabertura', para: 'guiatennis1@gmail.com', assunto: 'Pedido para reabrir: Só Aula Tennis', criado_em: new Date().toISOString(), enviado_em: null, tentativas: 0, erro: null });
    await carregarAcessos(); render();
  });
  await page.evaluate(() => irAdmin('avisos'));
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ tarefas: [...document.querySelectorAll('.adm-tarefa')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' | '), avisos: [...document.querySelectorAll('.adm-aviso')].map(x => x.innerText.replace(/\s+/g, ' ')) }));
  ok(r.tarefas.includes('pedido para reabrir uma academia fechada'), 'Avisos: "Para fazer agora" com o pedido para reabrir — ' + r.tarefas.slice(0, 160));
  ok(r.avisos.some(x => x.includes('PEDIDO PARA REABRIR') || x.includes('Pedido para reabrir: Só Aula Tennis')), 'Avisos: os e-mails que chegaram, um por um — ' + (r.avisos[0] || '').slice(0, 100));
  await page.click('.adm-aviso');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.adminAba === 'pendencias' && !!document.querySelector('.pedido-reabrir')), 'tocar no aviso leva a Pendências, onde se resolve');
  page.once('dialog', d => d.accept());
  await page.click('[data-reabrir-aprovar="reab-1"]');
  await page.waitForTimeout(600);
  r = await page.evaluate(() => ({ ac: window.__db.academias.find(a => a.id === 'a1'), v: window.__db.academia_vinculos.find(v => v.academia_id === 'a1' && v.user_id === 'u-novo') }));
  ok(r.ac.status === 'published' && r.v && r.v.papel === 'principal', '"Reabriu: voltar ao Guia": a ficha volta e a conta nova administra');
  await browser.close();

  // ---- "Pedir análise" pelo site, no painel do admin ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/avaliacoes', avaliacoes: [{ id: 'rv1', academia_id: 'a1', stars: 1, comment: 'Péssimo', nome_autor: 'Zé', created_at: new Date().toISOString() }] }));
  await page.waitForTimeout(400);
  await page.click('[data-pedir-analise]');
  await page.waitForTimeout(200);
  ok((await texto(page, '#aviso-ficha-close-overlay .sheet-title')) === 'Pedir análise da avaliação', '"Pedir análise" abre a janela no site (antes, o WhatsApp)');
  await page.click('.aviso-opcao input[value="conflito"]');
  await page.fill('#aviso-detalhes', 'Quem escreveu é de outra academia.');
  await page.click('#aviso-ficha-enviar');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ d: window.__db.denuncias_de_avaliacao[0], e: window.__db.emails_a_enviar.find(x => x.tipo === 'analise_pedida'), feito: document.querySelector('.aviso-feito')?.innerText || '' }));
  ok(r.d && r.d.da_academia && r.d.motivo === 'conflito' && r.d.detalhes === 'Quem escreveu é de outra academia.' && !!r.e && r.feito.includes('O GuiaTennis vai conferir'),
    'o pedido vai para o painel do admin, com o motivo e o texto, e o admin recebe o aviso — ' + JSON.stringify(r).slice(0, 300));
  await browser.close();
  ({ browser, page } = await abrir({ admin: true, q: 'admin/pendencias' }));
  await page.evaluate(async () => {
    window.__db.avaliacoes.push({ id: 'rv1', academia_id: 'a1', stars: 1, comment: 'Péssimo', nome_autor: 'Zé', created_at: new Date().toISOString() });
    window.__db.denuncias_de_avaliacao.push({ avaliacao_id: 'rv1', user_id: 'u-a1', motivo: 'conflito', da_academia: true, detalhes: 'Quem escreveu é de outra academia.', criado_em: new Date().toISOString(), resolvido_em: null });
    await carregarAcessos(); render();
  });
  await page.waitForTimeout(300);
  ok((await texto(page, '.denuncia-item')).includes('A academia pediu análise: “Quem escreveu é de outra academia.”'), 'Pendências: "A academia pediu análise", com o texto');
  await browser.close();

  // ---- banco sem o SQL 20261026200000 ----
  ({ browser, page } = await abrir({ admin: true, q: 'admin/avisos', semFechadaGuardada: true }));
  await page.waitForTimeout(300);
  ok((await texto(page, '.adm-main')).includes('Os avisos entram com o SQL 20261026200000'), 'sem o SQL: a página Avisos explica, e o resto abre normal');
  await browser.close();
})();
