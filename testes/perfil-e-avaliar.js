// Perfil da conta, "Jogou aqui?" e o perfil dos Parceiros (pedido do Breno
// em 05/10/2026): o perfil do jogador é uma página própria (/perfil), como o
// "Meu trivago"; um dia depois de chamar uma academia, um balão pergunta se
// a pessoa jogou lá, com as estrelas; e o GuiaTennis Parceiros ganha o
// Perfil da pessoa, separado das academias.
const { abrir, ok, irSenha } = require('./harness');
const texto = (page, sel) => page.evaluate((sel) => document.querySelector(sel)?.innerText || '', sel);
const HORA = 36e5;

(async () => {
  // ---- perfil do jogador ----
  let { browser, page } = await abrir({ jogador: true });
  await page.evaluate((h) => { gravarLocal(CHAMADAS_KEY, [{ id: 'a1', tipo: 'whatsapp', em: Date.now() - 30 * h }]); toggleFavorite && toggleFavorite('a2'); render(); }, HORA);
  await page.click('#conta-topo');
  await page.waitForTimeout(250);
  let t = await page.evaluate(() => ({
    link: location.pathname, titulo: document.title, robots: document.querySelector('meta[name="robots"]')?.content || '',
    h1: document.querySelector('#perfil-jogador h1')?.innerText || '',
    secoes: [...document.querySelectorAll('#perfil-jogador h2')].map(h => h.innerText),
    avaliar: document.querySelector('#perfil-avaliar')?.innerText.replace(/\s+/g, ' ') || '',
    rodape: !!document.getElementById('jog-sair') && !!document.getElementById('jog-excluir'),
  }));
  ok(t.link === '/perfil' && t.h1 === 'Olá, Ana' && t.robots.includes('noindex'), 'a inicial abre o perfil, com endereço próprio e fora do Google — ' + t.link);
  ok(['Minhas quadras', 'Login e preferências', 'Dados pessoais', 'Avisos por e-mail'].every(x => t.secoes.includes(x)) && t.rodape, 'o perfil tem as quadras, o login, os dados, os avisos, Sair e Excluir — ' + t.secoes.join(' | '));
  ok(t.avaliar.includes('Jogou nessas academias?') && t.avaliar.includes('Só Aula Tennis') && t.avaliar.includes('Você chamou no WhatsApp'), 'o perfil lista as academias chamadas para avaliar');
  await page.click('#perfil-jogador [data-menu="chamadas"]');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => state.lista === 'chamadas'), 'Minhas quadras abre a lista das academias chamadas');
  await page.evaluate(() => { state.lista = null; render(); });
  await page.click('#jog-trocar-senha');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.jogadorTela === 'esqueci' && (window.__codigos || {})['ana@exemplo.com'] === '123456'), '"Trocar a senha" manda o código para o e-mail da conta');
  await page.evaluate(() => { state.jogadorTela = null; render(); });
  await page.click('#perfil-jogador [data-avaliar-academia="a1"]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.page === 'court' && state.selected.id === 'a1' && location.hash === '#avaliacoes'), '"Avaliar" no perfil abre a ficha nas avaliações');
  // O menu "Avisos por e-mail" vai direto para os avisos do perfil.
  await page.evaluate(() => { state.showMenu = true; render(); });
  await page.click('[data-menu="avisos"]');
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => state.page === 'perfil' && !!document.getElementById('perfil-avisos')), 'o menu "Avisos por e-mail" abre o perfil nos avisos');
  await browser.close();

  // Link antigo (?conta=minha) e /perfil sem estar logado.
  ({ browser, page } = await abrir({ jogador: true, q: '?conta=minha' }));
  ok(await page.evaluate(() => state.page === 'perfil' && location.pathname === '/perfil' && !location.search.includes('conta=')), 'o link antigo ?conta=minha abre o perfil');
  await browser.close();
  ({ browser, page } = await abrir({ q: 'perfil' }));
  ok(await page.evaluate(() => state.page === 'home' && state.jogadorTela === 'email' && /perfil/.test(state.jogadorMotivo) && typeof state.depoisDeEntrar === 'function'), '/perfil sem conta: abre o Entrar e volta para o perfil depois');
  await browser.close();

  // ---- "Jogou aqui?" ----
  ({ browser, page } = await abrir());
  await page.evaluate((h) => { gravarLocal(CHAMADAS_KEY, [{ id: 'a1', tipo: 'whatsapp', em: Date.now() - 2 * h }]); ligarPedidoDeAvaliacao(); }, HORA);
  await page.waitForTimeout(6600);
  ok(!(await page.$('#push-avaliar')), 'chamou há pouco (menos de um dia): ainda não pergunta');
  await page.evaluate((h) => { gravarLocal(CHAMADAS_KEY, [{ id: 'a1', tipo: 'whatsapp', em: Date.now() - 30 * h }]); ligarPedidoDeAvaliacao(); }, HORA);
  await page.waitForTimeout(6600);
  t = await page.evaluate(() => ({ txt: document.getElementById('push-avaliar')?.innerText.replace(/\s+/g, ' ') || '', estrelas: document.querySelectorAll('#push-avaliar [data-push-estrela]').length, conta: !!document.getElementById('push-conta') }));
  ok(t.txt.includes('Jogou na Só Aula Tennis?') && t.txt.includes('Você chamou no WhatsApp') && t.estrelas === 5, 'um dia depois de chamar, o balão pergunta se jogou, com as estrelas — ' + t.txt.slice(0, 60));
  ok(!t.conta, 'sem o balão da conta ao mesmo tempo');
  await page.click('#push-avaliar [data-push-estrela="4"]');
  await page.waitForTimeout(300);
  t = await page.evaluate(() => ({ page: state.page, id: state.selected && state.selected.id, estrela: state.pendingStar, hash: location.hash, cheias: document.querySelectorAll('#star-picker .filled').length, balao: !!document.getElementById('push-avaliar') }));
  ok(t.page === 'court' && t.id === 'a1' && t.estrela === 4 && t.cheias === 4 && t.hash === '#avaliacoes' && !t.balao, 'tocar na 4ª estrela abre a ficha nas avaliações, com 4 estrelas marcadas');
  ok(await page.evaluate(() => (lerPedidosDeAvaliacao().a1 || {}).vezes === 1 && academiasParaAvaliar().length === 0), 'perguntou uma vez: só pergunta de novo em uns dias');
  await browser.close();

  // "Não joguei aqui" não pergunta mais; avaliar tira da lista.
  ({ browser, page } = await abrir());
  await page.evaluate((h) => { gravarLocal(CHAMADAS_KEY, [{ id: 'a1', tipo: 'whatsapp', em: Date.now() - 30 * h }, { id: 'a2', tipo: 'site', em: Date.now() - 50 * h }]); ligarPedidoDeAvaliacao(); }, HORA);
  await page.waitForTimeout(6600);
  const primeira = await page.evaluate(() => state.pushAvaliar && state.pushAvaliar.id);
  await page.click('#push-avaliar-nunca');
  await page.waitForTimeout(200);
  ok(primeira && !(await page.$('#push-avaliar')) && await page.evaluate((id) => !!lerPedidosDeAvaliacao()[id].nunca && !academiasParaAvaliar({ todas: true }).some(x => x.id === id), primeira), '"Não joguei aqui" fecha e não pergunta mais dessa academia');
  await page.evaluate(() => { marcarAvaliada('a2'); });
  ok(await page.evaluate(() => academiasParaAvaliar({ todas: true }).length === 0), 'academia avaliada sai da lista');
  await browser.close();

  // Admin e academia logada não recebem o pedido.
  ({ browser, page } = await abrir({ academia: 'a2' }));
  await page.evaluate((h) => { gravarLocal(CHAMADAS_KEY, [{ id: 'a1', tipo: 'whatsapp', em: Date.now() - 30 * h }]); }, HORA);
  ok(await page.evaluate(() => academiasParaAvaliar().length === 0), 'conta de academia não recebe o "Jogou aqui?"');
  // Menu do site dos jogadores com a conta da academia: "Sair da conta".
  await page.evaluate(() => { state.showMenu = true; render(); });
  t = await texto(page, '#menu-overlay .menu-rodape');
  ok(t.includes('Sair da conta') && !t.includes('área da academia'), 'menu: "Sair da conta", não "Sair da área da academia"');
  await browser.close();

  // ---- perfil no GuiaTennis Parceiros ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/painel', w: 1280 }));
  await page.click('.pc-topo .pc-avatar');
  await page.waitForTimeout(250);
  t = await page.evaluate(() => ({
    link: location.pathname, inicial: document.querySelector('.pc-topo .pc-avatar')?.innerText.trim(),
    corpo: document.querySelector('#parceiros .pc-main')?.innerText.replace(/\s+/g, ' ') || '',
  }));
  ok(t.link === '/parceiros/perfil' && t.inicial === 'M', 'o círculo com a inicial, no topo, abre o Perfil — ' + t.link);
  ok(['Dados de contato', 'Login e segurança', 'Suas academias', 'Sair do GuiaTennis Parceiros'].every(x => t.corpo.includes(x)) && !t.corpo.includes('Pessoas com acesso'), 'o Perfil é da pessoa: dados, login e as academias; as pessoas ficam na academia');
  await page.click('#parceiros .pc-main [data-pc="academias"]');
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => location.pathname === '/parceiros/academias'), '"Administrar as academias" leva a Suas academias');
  await browser.close();
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/conta' }));
  ok(await page.evaluate(() => state.parceirosAba === 'perfil' && location.pathname === '/parceiros/perfil'), 'o link antigo /parceiros/conta abre o Perfil');
  await browser.close();

  // ---- conta nova com pedido aberto, sem confirmar o e-mail ----
  ({ browser, page } = await abrir({ q: 'parceiros/entrar' }));
  await page.evaluate(() => {
    const agora = new Date().toISOString();
    window.__db.academia_acessos.push({ user_id: 'u-nova', academia_id: null, usuario: 'mariana@exemplo.com', email: 'mariana@exemplo.com', nome_responsavel: 'Mariana Noronha', papel: 'principal', termos_aceitos_em: agora, dados_completos_em: agora, senha_trocada_em: agora,
      pedido_academia_id: 'a1', pedido_nome: 'Só Aula Tennis', pedido_em: agora, pedido_destino: 'guiatennis' });
    window.__senhas['mariana@exemplo.com'] = 'senha12345';
  });
  await irSenha(page, 'mariana@exemplo.com');
  await page.fill('#login-password', 'senha12345');
  await page.click('#login-submit');
  await page.waitForTimeout(700);
  const telas = [];
  for (const aba of ['painel', 'cadastro', 'academias', 'perfil']) {
    await page.evaluate((a) => irParceiros(a), aba);
    await page.waitForTimeout(200);
    telas.push(aba + ':' + (await page.evaluate(() => !!document.querySelector('.pc-confirmar-email') && !!document.querySelector('.pc-pedido, .perfil-topo'))));
  }
  ok(telas.every(x => x.endsWith('true')), 'conta nova com pedido aberto: "Confirme o seu e-mail" no painel, nos pedidos, em Suas academias e no Perfil — ' + telas.join(' '));
  ok(await page.evaluate(() => document.querySelector('.pc-topo .pc-avatar')?.className.includes('confirmar')), 'o círculo do Perfil ganha o "!" enquanto o e-mail não é confirmado');
  await browser.close();
  ({ browser, page } = await abrir({ jogador: true }));
  ok(await page.evaluate(() => !jogador.email_confirmado_em && document.getElementById('conta-topo').className.includes('confirmar')), 'jogador sem o e-mail confirmado: a inicial também ganha o "!"');
  await browser.close();

  // ---- sem dizer como o GuiaTennis confere ----
  ({ browser, page } = await abrir({ q: 'parceiros/ajuda' }));
  t = await page.evaluate(() => [document.querySelector('#parceiros')?.innerText || '', TERMS_HTML].join(' '));
  ok(!/CNPJ ou contrato|conferir um documento|por documento/.test(t), 'Ajuda e Termos não dizem como o GuiaTennis confere (sem CNPJ nem documento)');
  await browser.close();
})();
