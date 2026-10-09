// Admin no GuiaTennis Parceiros (pedido do Breno em 06/10/2026: "não estou
// com acesso no Parceiros sendo admin"): como o acesso de suporte do Google
// Business Profile, o admin escolhe uma academia e vê o Parceiros como ela
// vê; pedidos, pessoas e pausa ele muda como admin, o resto é só para ver.
const { abrir, ok } = require('./harness');
const texto = (page, sel) => page.evaluate((sel) => (document.querySelector(sel)?.innerText || '').replace(/\s+/g, ' '), sel);
const agora = new Date().toISOString();

(async () => {
  // Quem não é admin: "ver" é a apresentação.
  let { browser, page } = await abrir({ q: 'parceiros/ver' });
  ok(await page.evaluate(() => state.parceirosAba === 'inicio' && !document.querySelector('[data-ver-academia]')), 'quem não é admin não vê a escolha de academia');
  await browser.close();

  // Admin no site dos jogadores: o menu leva ao "ver como academia".
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(() => { state.showMenu = true; render(); });
  ok((await texto(page, '.menu-drawer [data-menu="parceiros-admin"]')).includes('ver como academia'), 'menu do admin: GuiaTennis Parceiros · ver como academia');
  await browser.close();

  // Página privada sem academia escolhida: a escolha, e não o "Entrar".
  ({ browser, page } = await abrir({ admin: true, q: 'parceiros/painel' }));
  await page.evaluate((agora) => {
    window.__db.academia_acessos.push({ user_id: 'u-dono', academia_id: 'a1', usuario: 'dono@aula.com', nome_responsavel: 'Dono Aula', email: 'dono@aula.com', cargo: 'Dono(a)', termos_aceitos_em: agora, dados_completos_em: agora, senha_trocada_em: agora });
    window.__db.academia_vinculos.push({ user_id: 'u-dono', academia_id: 'a1', papel: 'principal' });
    window.__db.academia_acessos.push({ user_id: 'u-pede', academia_id: null, usuario: 'pede@aula.com', nome_responsavel: 'Pedro Pede', email: 'pede@aula.com', cargo: 'Professor(a)', termos_aceitos_em: agora, dados_completos_em: agora, senha_trocada_em: agora });
    window.__db.pedidos_de_acesso.push({ user_id: 'u-pede', academia_id: 'a1', nome: 'Só Aula Tennis', destino: 'responsavel', pedido_em: agora });
  }, agora);
  let t = await page.evaluate(() => ({ aba: state.parceirosAba, link: location.pathname, h1: document.querySelector('#parceiros h1')?.innerText, n: document.querySelectorAll('[data-ver-academia]').length, robots: document.querySelector('meta[name="robots"]')?.content || '' }));
  ok(t.aba === 'ver' && t.link === '/parceiros/ver' && t.h1 === 'Ver como academia' && t.n === 2 && t.robots.includes('noindex'), 'admin abre o Parceiros na escolha da academia (fora do Google) — ' + JSON.stringify(t));
  await page.fill('#pc-admin-busca', 'moema');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => [...document.querySelectorAll('[data-ver-academia]')].map(e => e.dataset.verAcademia).join() === 'a2'), 'a busca acha pelo bairro');
  await page.fill('#pc-admin-busca', '');
  await page.waitForTimeout(150);
  await page.click('[data-ver-academia="a1"]');
  await page.waitForTimeout(500);
  t = await page.evaluate(() => ({ aba: state.parceirosAba, faixa: document.querySelector('.pc-admin-faixa')?.innerText.replace(/\s+/g, ' ') || '', numeros: window.__rpcs.some(r => r.nome === 'numeros_da_academia' && r.args.p_academia === 'a1'), admin: isAdmin }));
  ok(t.aba === 'painel' && t.faixa.includes('Modo admin') && t.faixa.includes('Só Aula Tennis') && t.admin, 'escolhida, abre o painel dela com a faixa do modo admin');
  ok(t.numeros, 'os números vêm da academia escolhida');

  // Pessoas: quem administra e os pedidos, e o admin responde.
  await page.evaluate(() => irParceiros('pessoas', { mesmaAba: true }));
  await page.waitForTimeout(500);
  t = await texto(page, '#parceiros main');
  ok(t.includes('Dono Aula') && t.includes('Pedro Pede'), 'Pessoas mostra quem administra e quem pediu acesso');
  await page.click('[data-aceitar-pedido="u-pede"]');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => window.__rpcs.some(r => r.nome === 'aprovar_pedido_de_acesso' && r.args.p_user === 'u-pede' && r.args.p_academia === 'a1')), 'aceitar o pedido vira a aprovação do admin para aquela academia');

  // O que é da academia fica só para ver.
  t = await page.evaluate(async () => {
    const a = await sb.rpc('adicionar_pessoa', { p_email: 'x@y.com', p_nome: 'X', p_senha: 'senha boa 123' });
    const b = await sb.rpc('pedir_plano', { p_academia: 'a1', p_plano: 'premium', p_onde: 'painel' });
    return { a: a.error && a.error.message, b: b.error && b.error.message, chamou: window.__rpcs.some(r => r.nome === 'adicionar_pessoa' || r.nome === 'pedir_plano') };
  });
  ok(/só para ver/.test(t.a) && /só para ver/.test(t.b) && !t.chamou, 'incluir pessoa e pedir plano: só para ver, nada vai ao banco');
  await page.evaluate(() => { window.__senha = { atual: 'x', nova: 'quadra nova 2026', nova2: 'quadra nova 2026' }; return trocarSenhaConta(); });
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => /só para ver/.test(state.contaErro) && !window.__senhaNova), 'a senha do admin não se troca por ali');

  // Recarregar continua na mesma academia.
  await page.reload();
  await page.waitForTimeout(800);
  ok(await page.evaluate(() => state.parceirosAba === 'pessoas' && emVisaoAdmin() && contaAcademia.academiaId === 'a1'), 'recarregar continua vendo a mesma academia');

  // Voltar ao site dos jogadores: o admin volta a ser só o admin.
  await page.evaluate(() => goHome());
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => isAdmin && !contaAcademia), 'no site dos jogadores, o admin volta a ser só o admin');
  await page.evaluate(() => irParceiros('painel', { mesmaAba: true }));
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => emVisaoAdmin() && state.parceirosAba === 'painel'), 'abrir o Parceiros de novo volta para a academia que estava vendo');

  // Sair do modo admin: volta à escolha, sem sair do login.
  await page.click('#pc-admin-sair');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.parceirosAba === 'ver' && !contaAcademia && isAdmin && !window.__saiu), '"Sair do modo admin" volta à escolha, sem deslogar');
  await browser.close();
})();
