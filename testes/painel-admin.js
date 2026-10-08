// Painel do admin (pedido do Breno em 06/10/2026: "quando eu fizer o login,
// mude o site para eu ter o controle de tudo, acessos e tudo mais, algo
// diferenciado, organizado, separado e bem completo, mas não aparecer para
// outras pessoas a minha área"). Como o admin da Shopify e a extranet do
// Booking: um site à parte em /admin, com seções do lado.
const { abrir, ok, irSenha } = require('./harness');
const texto = (page, sel) => page.evaluate((sel) => (document.querySelector(sel)?.innerText || '').replace(/\s+/g, ' '), sel);
const agora = new Date().toISOString();
const AVALIACOES = [
  { id: 'r1', academia_id: 'a1', stars: 5, comment: 'Ótimas quadras', nome_autor: 'Ana Jogadora', contato_autor: 'ana@exemplo.com', created_at: agora },
  { id: 'r2', academia_id: 'a2', stars: 2, comment: 'Quadra molhada', nome_autor: 'Rui', contato_autor: 'rui@exemplo.com', created_at: '2026-09-01T10:00:00Z' },
];
// Uma academia nova esperando, um jogador e um e-mail que não saiu.
async function preparar(page) {
  await page.evaluate((agora) => {
    window.__db.academias.push({ id: 'p1', name: 'Academia Nova Teste', address: 'Rua C', numero: '3', bairro: 'Lapa', cidade: 'São Paulo', status: 'pending', created_at: agora, photos: [], quadras: {}, pisos: [], cobertura: [], lat: -23.52, lng: -46.70 });
    window.__db.jogadores.push({ user_id: 'j-bia', nome: 'Bia Souza', email: 'bia@exemplo.com', cidade: 'Campinas', avisos_academias: true, avisos_viagem: false, promocoes: false, novidades: true, created_at: agora, email_confirmado_em: agora });
    window.__db.emails_a_enviar.push({ id: 'e1', tipo: 'avaliacao', para: 'dono@aula.com', assunto: 'Só Aula Tennis recebeu uma avaliação nova (5 de 5)', criado_em: agora, enviado_em: null, tentativas: 3, erro: '422 invalid from' });
    window.__db.cliques.push({ tipo: 'acesso_site', created_at: agora }, { tipo: 'busca', created_at: agora, detalhe: 'Pinheiros, São Paulo' }, { tipo: 'visualizacao', academia_id: 'a1', created_at: agora }, { tipo: 'whatsapp', academia_id: 'a1', created_at: agora });
  }, agora);
  await page.evaluate(async () => { await loadEverything(); render(); });
}
const tela = (page) => page.evaluate(() => ({
  page: state.page, aba: state.adminAba, link: location.pathname, painel: !!document.getElementById('painel-admin'),
  h1: document.querySelector('.adm-h1')?.innerText || '', titulo: document.title, robots: document.querySelector('meta[name="robots"]')?.content || '',
}));

(async () => {
  // ---- Ninguém além do admin vê o painel ----
  for (const [quem, opts] of [['visitante', {}], ['jogador', { jogador: true }], ['academia', { academia: 'a1' }]]) {
    const { browser, page } = await abrir({ ...opts, q: 'admin/academias' });
    const t = await tela(page);
    const corpo = await page.evaluate(() => { state.showMenu = true; render(); const x = document.body.innerText; state.showMenu = false; render(); return x; });
    ok(t.page === 'home' && t.link === '/' && !t.painel && !corpo.includes('Painel do admin') && !corpo.includes('Modo admin'), `${quem} em /admin: a página inicial, sem sinal do painel — ${t.link}`);
    await browser.close();
  }

  // ---- O admin abre o painel ----
  let { browser, page } = await abrir({ admin: true, q: 'admin', avaliacoes: AVALIACOES, w: 1280 });
  await preparar(page);
  let t = await tela(page);
  ok(t.painel && t.h1 === 'Visão geral' && t.link === '/admin', 'admin em /admin: o painel, na visão geral');
  ok(t.robots.includes('noindex') && t.robots.includes('nofollow') && t.titulo.includes('Painel do admin'), 'fora do Google, com título próprio — ' + t.titulo);
  ok(await page.evaluate(() => !document.querySelector('.admin-banner') && !document.getElementById('menu-btn') && !document.querySelector('.fab')), 'separado do site: sem a faixa, o menu e os botões do site dos jogadores');
  ok(await page.evaluate(() => document.querySelectorAll('.adm-nav [data-adm-aba]').length === 10), 'dez seções na barra do lado');
  let inicio = await texto(page, '#painel-admin');
  ok(inicio.includes('Para fazer agora') && inicio.includes('1 academia nova esperando aprovação'), 'Para fazer agora: a academia nova esperando');
  ok(await page.evaluate(() => document.querySelectorAll('.adm-kpi').length === 4 && document.querySelectorAll('.adm-kpi svg.adm-linha').length === 4), 'últimos 30 dias: acessos, buscas, fichas e contatos, com a linha das 12 semanas');
  ok(await page.evaluate(() => window.__rpcs.some(r => r.nome === 'numeros_das_contas_admin') && window.__rpcs.some(r => r.nome === 'situacao_dos_emails')), 'a visão geral busca os números das contas e a situação dos e-mails');
  ok(inicio.includes('Contas de jogador') && inicio.includes('Avaliações (nota média)'), 'contas e avaliações em números');
  ok(await page.evaluate(() => document.querySelector('.adm-nav [data-adm-aba="pendencias"] .adm-nav-n')?.innerText === '1'), 'Pendências com o número do que espera');

  // Para fazer agora leva à seção.
  await page.click('.adm-tarefa');
  await page.waitForTimeout(200);
  t = await tela(page);
  ok(t.aba === 'pendencias' && t.link === '/admin/pendencias' && t.h1 === 'Pendências', 'a tarefa leva às Pendências — ' + t.link);
  await page.click('[data-approve="p1"]');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => window.__db.academias.find(a => a.id === 'p1').status === 'published'), 'aprovar publica a academia nova');

  // ---- Academias ----
  await page.click('.adm-nav [data-adm-aba="academias"]');
  await page.waitForTimeout(200);
  t = await tela(page);
  ok(t.link === '/admin/academias' && t.h1 === 'Academias', 'Academias no link próprio');
  ok(await page.evaluate(() => document.querySelectorAll('[data-adm-academia]').length === 3), 'todas as academias na lista');
  await page.fill('#adm-busca', 'moema');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => [...document.querySelectorAll('[data-adm-academia]')].map(e => e.dataset.admAcademia).join() === 'a2' && document.activeElement.id === 'adm-busca'), 'a busca acha pelo bairro, sem perder o campo');
  await page.fill('#adm-busca', '');
  await page.click('[data-adm-filtro="basicas"]');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => [...document.querySelectorAll('[data-adm-academia]')].map(e => e.dataset.admAcademia).join() === 'a2'), 'filtro Fichas básicas');
  await page.click('[data-adm-filtro="todas"]');
  await page.click('[data-adm-academia="a1"]');
  await page.waitForTimeout(150);
  let linha = await texto(page, '.adm-acad.aberta');
  ok(linha.includes('Abrir a ficha') && linha.includes('Ver como academia') && linha.includes('Pausar 7 dias') && linha.includes('Premium'), 'a academia aberta mostra as ações');
  await page.click('.adm-acad.aberta .plano-btn[data-plano="premium"]');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').plano === 'premium'), 'muda o plano dali');
  await page.click('.adm-acad.aberta .pause-preset-btn[data-days="7"]');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').pausada === true && !!document.querySelector('[data-adm-voltar="a1"]')), 'pausa 7 dias, e aparece o "voltar para a busca"');
  await page.click('[data-adm-voltar="a1"]');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').pausada === false), 'volta para a busca na hora');

  // Abrir a ficha e voltar ao painel.
  await page.click('.adm-acad.aberta [data-open="a1"]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.page === 'court' && state.selected.id === 'a1'), 'abre a ficha da academia, com o que o admin muda nela');
  await page.click('#court-back');
  await page.waitForTimeout(300);
  t = await tela(page);
  ok(t.painel && t.aba === 'academias', 'voltar da ficha volta ao painel, na mesma seção');

  // Ver como academia (GuiaTennis Parceiros) e o "voltar" do navegador.
  ok(await page.evaluate(() => document.querySelector('.adm-acad.aberta [data-adm-academia]')?.dataset.admAcademia === 'a1'), 'e a academia continua aberta, como estava');
  await page.click('.adm-acad.aberta [data-adm-ver-como="a1"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => state.page === 'parceiros' && emVisaoAdmin() && contaAcademia.academiaId === 'a1'), 'Ver como academia abre o Parceiros da academia');
  await page.goBack();
  await page.waitForTimeout(400);
  t = await tela(page);
  ok(t.painel && t.aba === 'academias' && t.link === '/admin/academias', 'o "voltar" do navegador volta ao painel — ' + t.link);

  // ---- Contas de jogador ----
  await page.click('.adm-nav [data-adm-aba="jogadores"]');
  await page.waitForTimeout(400);
  let jog = await texto(page, '#painel-admin');
  ok(jog.includes('Bia Souza') && jog.includes('bia@exemplo.com') && jog.includes('Campinas') && jog.includes('cidade, novidades'), 'as contas de jogador, com a cidade e os avisos ligados');
  await page.fill('#adm-busca-jogador', 'zzz');
  await page.waitForTimeout(150);
  ok((await texto(page, '#painel-admin')).includes('Ninguém com essa busca'), 'busca nas contas');

  // ---- Avaliações ----
  await page.click('.adm-nav [data-adm-aba="avaliacoes"]');
  await page.waitForTimeout(200);
  let aval = await page.evaluate(() => [...document.querySelectorAll('.adm-aval')].map(x => x.innerText.replace(/\s+/g, ' ')));
  ok(aval.length === 2 && aval[0].includes('Só Aula Tennis') && aval[0].includes('Ótimas quadras') && aval[0].includes('ana@exemplo.com'), 'todas as avaliações, a mais nova primeiro, com o contato de quem avaliou');
  await page.click('[data-adm-filtro-aval="baixas"]');
  await page.waitForTimeout(150);
  aval = await page.evaluate(() => [...document.querySelectorAll('.adm-aval')].map(x => x.innerText));
  ok(aval.length === 1 && aval[0].includes('Quadra molhada'), 'filtro Nota 1 ou 2');
  page.once('dialog', d => d.accept());
  await page.click('.adm-aval .delete-review-btn');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => !window.__db.avaliacoes.some(r => r.id === 'r2')), 'exclui a avaliação dali');

  // ---- Estatísticas e percurso ----
  await page.click('.adm-nav [data-adm-aba="estatisticas"]');
  await page.waitForTimeout(200);
  let est = await texto(page, '#painel-admin');
  ok(est.toLowerCase().includes('acessos ao site') && est.includes('Pinheiros, São Paulo'), 'estatísticas dentro do painel');
  await page.click('[data-stats-per="7"]');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => state.statsPeriodo === '7' && state.page === 'admin' && !document.getElementById('stats-overlay')), 'muda o período sem sair do painel');
  await page.click('.adm-nav [data-adm-aba="percursos"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => state.adminAba === 'percursos' && !!document.querySelector('#painel-admin [data-perc-site]')), 'percurso das visitas dentro do painel');

  // ---- E-mails ----
  await page.click('.adm-nav [data-adm-aba="emails"]');
  await page.waitForTimeout(400);
  let em = await texto(page, '#painel-admin');
  ok(em.includes('Só Aula Tennis recebeu uma avaliação nova') && em.includes('Não saiu (3 tentativas)') && em.includes('422 invalid from') && em.includes('Avaliação nova'), 'os últimos e-mails, com o que não saiu e o porquê');
  await page.click('[data-adm-reenviar="e1"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => window.__rpcs.some(r => r.nome === 'reenviar_email_admin' && r.args.p_id === 'e1') && window.__db.emails_a_enviar[0].erro === null), '"Tentar de novo" coloca o e-mail na fila outra vez');

  // ---- Ferramentas ----
  await page.click('.adm-nav [data-adm-aba="ferramentas"]');
  await page.waitForTimeout(200);
  ok((await texto(page, '#painel-admin')).includes('Todas as academias estão no mapa'), 'Ferramentas: coordenadas do mapa');
  await page.click('#qr-site-btn');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => state.qrCourt === 'site' && state.page === 'admin'), 'QR code do site, por cima do painel');
  await page.evaluate(() => { state.qrCourt = null; render(); });

  // Recarregar continua na mesma seção.
  await page.evaluate(() => irAdmin('emails'));
  await page.reload();
  await page.waitForTimeout(800);
  t = await tela(page);
  ok(t.painel && t.aba === 'emails' && t.link === '/admin/emails', 'recarregar continua no painel, na mesma seção');

  // Ver o site: o site dos jogadores, com a faixa do admin que volta ao painel.
  await page.click('#adm-ver-site');
  await page.waitForTimeout(300);
  t = await tela(page);
  // Sem a faixa "Modo admin" (pedido de 08/10/2026): o painel fica no menu.
  ok(t.page === 'home' && !t.painel && !(await page.$('.admin-banner')) && !(await page.evaluate(() => document.body.innerText.includes('Modo admin'))) && !(await page.evaluate(() => !!document.querySelector('.fab'))), '"Ver o site": a home, sem faixa do modo admin e sem os botões redondos de antes');
  ok(await page.evaluate(() => { state.showMenu = true; render(); const x = document.querySelector('.menu-drawer [data-menu="painel-admin"]')?.innerText || ''; state.showMenu = false; render(); return x.includes('Painel do admin'); }), 'menu do site: "Painel do admin" para o admin');
  await page.click('#menu-btn');
  await page.click('.menu-drawer [data-menu="painel-admin"]');
  await page.waitForTimeout(300);
  t = await tela(page);
  ok(t.painel && t.aba === 'inicio', 'o menu volta ao painel');

  // Sair: sai da conta e recarrega na página inicial.
  await page.evaluate(() => { const sair = sb.auth.signOut; sb.auth.signOut = () => { localStorage.setItem('teste_saiu', '1'); return sair(); }; });
  await page.click('#adm-sair');
  await page.waitForTimeout(1000);
  ok(await page.evaluate(() => localStorage.getItem('teste_saiu') === '1' && location.pathname === '/'), '"Sair" sai da conta e volta à página inicial');
  await browser.close();

  // ---- No celular: as seções ficam no botão de menu ----
  ({ browser, page } = await abrir({ admin: true, q: 'admin' }));
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('.adm-nav')).display === 'none'), 'celular: as seções ficam guardadas');
  await page.click('#adm-menu-btn');
  await page.click('.adm-nav [data-adm-aba="acessos"]');
  await page.waitForTimeout(200);
  t = await tela(page);
  ok(t.aba === 'acessos' && t.h1 === 'Acessos ao Parceiros' && !(await page.evaluate(() => state.admMenu)), 'celular: o menu abre a seção e fecha');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'celular: nada passa da largura da tela');
  await browser.close();

  // ---- Banco sem o SQL do painel: avisa, sem quebrar ----
  ({ browser, page } = await abrir({ admin: true, q: 'admin/emails', trocar: h => h.replace('<script src="https://unpkg.com/@supabase/supabase-js@2"></script>', '<script>window.__semPainelAdmin = true;</script><script src="https://unpkg.com/@supabase/supabase-js@2"></script>') }));
  await page.waitForTimeout(300);
  ok((await texto(page, '#painel-admin')).includes('O banco ainda não tem a lista dos e-mails'), 'banco sem o SQL novo: a lista dos e-mails explica que entra com o PR');
  await browser.close();

  // ---- Entrar com o e-mail do admin leva ao painel ----
  ({ browser, page } = await abrir({ q: 'parceiros/entrar' }));
  await irSenha(page, 'guiatennis1@gmail.com');
  await page.fill('#login-password', 'qualquer');
  await page.click('#login-submit');
  await page.waitForTimeout(800);
  t = await tela(page);
  ok(t.painel && t.aba === 'inicio' && t.link === '/admin', 'entrar pelo GuiaTennis Parceiros com o e-mail do admin: o painel — ' + t.link);
  await browser.close();

  ({ browser, page } = await abrir());
  const idas = [];
  page.on('framenavigated', f => { if (f === page.mainFrame()) idas.push(new URL(f.url()).pathname); });
  await page.evaluate(() => abrirContaJogador('entrar'));
  await page.fill('#jog-email', 'guiatennis1@gmail.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(300);
  await page.fill('#jog-senha', 'qualquer');
  await page.click('#jog-entrar');
  await page.waitForTimeout(1200);
  ok(idas.includes('/admin'), 'entrar pelo "Entrar" do site com o e-mail do admin: recarrega já no /admin — ' + idas.join(' → '));
  await browser.close();

  // ---- Excluir a conta de quem descumprir os Termos (06/10/2026) ----
  ({ browser, page } = await abrir({ admin: true, q: 'admin/jogadores', avaliacoes: [{ id: 'rz', academia_id: 'a1', stars: 1, comment: 'Ofensa', nome_autor: 'Bia Souza', user_id: 'j-bia', created_at: agora }], w: 1280 }));
  await preparar(page);
  await page.evaluate(() => irAdmin('jogadores'));
  await page.waitForTimeout(400);
  await page.click('[data-adm-excluir="j-bia"]');
  await page.waitForTimeout(150);
  ok(await page.isVisible('#adm-excluir-overlay') && (await texto(page, '#adm-excluir-overlay')).includes('bia@exemplo.com'), '"Excluir conta" abre a janela com a conta');
  await page.click('#adm-excluir-confirmar');
  await page.waitForTimeout(150);
  ok((await texto(page, '#adm-excluir-overlay')).includes('Escreva o motivo') && await page.evaluate(() => window.__db.jogadores.some(j => j.user_id === 'j-bia')), 'sem o motivo, não exclui');
  await page.fill('#adm-excluir-motivo', 'Avaliações ofensivas');
  await page.check('#adm-excluir-avaliacoes');
  await page.click('#adm-excluir-confirmar');
  await page.waitForTimeout(700);
  let ex = await page.evaluate(() => ({ jog: window.__db.jogadores.some(j => j.user_id === 'j-bia'), aval: window.__db.avaliacoes.some(r => r.id === 'rz'), lista: window.__db.contas_excluidas.map(c => c.email + '|' + c.motivo).join(), janela: !!document.getElementById('adm-excluir-overlay'), tela: document.getElementById('painel-admin').innerText }));
  ok(!ex.jog && !ex.aval && ex.lista === 'bia@exemplo.com|Avaliações ofensivas' && !ex.janela, 'exclui a conta e as avaliações, e guarda o motivo — ' + ex.lista);
  ok(ex.tela.includes('Conta de Bia Souza excluída') && ex.tela.includes('Contas excluídas') && ex.tela.includes('Avaliações ofensivas'), 'o painel avisa e lista as contas excluídas');
  page.once('dialog', d => d.accept());
  await page.click('[data-adm-liberar="bia@exemplo.com"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => !window.__db.contas_excluidas.length && !document.getElementById('painel-admin').innerText.includes('Contas excluídas')), '"Liberar o e-mail" tira o bloqueio');
  // Conta do GuiaTennis Parceiros, em Acessos ao Parceiros
  await page.evaluate(async (agora) => {
    window.__db.academia_acessos.push({ user_id: 'u-mal', academia_id: 'a2', usuario: 'mal@aula.com', nome_responsavel: 'Mal Feitor', email: 'mal@aula.com', dados_completos_em: agora });
    window.__db.academia_vinculos.push({ user_id: 'u-mal', academia_id: 'a2', papel: 'principal' });
    await carregarAcessos(); irAdmin('acessos');
  }, agora);
  await page.waitForTimeout(300);
  ok((await texto(page, '#painel-admin')).includes('Contas do GuiaTennis Parceiros') && await page.isVisible('[data-adm-excluir="u-mal"]'), 'Acessos ao Parceiros lista as contas, cada uma com "Excluir conta"');
  await page.click('[data-adm-excluir="u-mal"]');
  await page.fill('#adm-excluir-motivo', 'Pediu academia que não representa');
  await page.click('#adm-excluir-confirmar');
  await page.waitForTimeout(700);
  ok(await page.evaluate(() => !window.__db.academia_acessos.some(x => x.user_id === 'u-mal') && window.__db.academias.some(a => a.id === 'a2') && window.__db.contas_excluidas.some(c => c.email === 'mal@aula.com' && c.tipo === 'GuiaTennis Parceiros')), 'a conta do Parceiros sai e a academia continua no guia');
  await browser.close();
  ({ browser, page } = await abrir());
  t = await page.evaluate(async () => {
    window.__db.contas_excluidas.push({ email: 'banido@exemplo.com', motivo: 'Teste', excluida_em: new Date().toISOString() });
    const j = await sb.rpc('criar_conta_jogador', { p_email: 'banido@exemplo.com', p_senha: 'senha boa 123', p_nome: 'Banido', p_aceite: true });
    const p = await sb.rpc('criar_minha_conta', { p_email: 'banido@exemplo.com', p_senha: 'senha boa 123', p_nome: 'Banido', p_whatsapp: '11999998888', p_aceite: true });
    return [j.error && j.error.message, p.error && p.error.message];
  });
  ok(t.every(m => /não pode criar conta/.test(m || '')), 'e-mail de conta excluída não cria conta de jogador nem do Parceiros');
  await browser.close();
})();
