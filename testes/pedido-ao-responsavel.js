// Pedido de acesso vai para o responsável (pedido do Breno em 03/10/2026),
// como o "Solicitar acesso" do Google Business Profile: quem pede uma
// academia que já tem responsável principal não entra pelo código; o
// responsável aceita (se o plano couber) ou recusa, ou põe a pessoa direto
// pelo e-mail. O GuiaTennis só aprova em caso excepcional.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((sel) => (document.querySelector(sel)?.textContent || '').replace(/\s+/g, ' '), sel);

(async () => {
  // ---- conta nova pede a Quadra Locação, que já tem responsável ----
  let { browser, page } = await abrir({ q: 'parceiros/cadastro' });
  await page.evaluate(async () => {
    window.__db.academia_acessos.push(
      { user_id: 'u-dono', academia_id: 'a2', usuario: 'dono@quadra.com', nome_responsavel: 'Dono Quadra', email: 'dono@quadra.com', papel: 'principal', dados_completos_em: '2026-09-01', senha_trocada_em: '2026-09-01' },
      { user_id: 'u-ana', academia_id: null, usuario: 'ana@exemplo.com', nome_responsavel: 'Ana Nova', email: 'ana@exemplo.com', cargo: 'Professora', papel: 'principal', dados_completos_em: '2026-10-01', senha_trocada_em: '2026-10-01', termos_aceitos_em: '2026-10-01' });
    window.__db.academia_vinculos.push({ user_id: 'u-dono', academia_id: 'a2', papel: 'principal' });
    window.__senhas['ana@exemplo.com'] = 'senhaforte1';
    await sb.auth.signInWithPassword({ email: 'ana@exemplo.com', password: 'senhaforte1' });
    await recarregarConta(); render();
  });
  await page.fill('#pc-busca', 'locação');
  await page.waitForTimeout(200);
  await page.click('[data-pc-selecionar="a2"]');
  await page.click('#pc-administrar');
  await page.waitForTimeout(400);
  let t = await texto(page, '#parceiros .pc-main');
  ok(t.includes('Pedido enviado ao responsável') && t.includes('já tem um responsável') && t.includes('com o seu nome e o seu e-mail'), 'academia com responsável: o pedido vai para ele, e a pessoa sabe disso');
  ok(!(await page.isVisible('#pc-codigo')) && t.includes('Pessoas com acesso') && t.includes('ana@exemplo.com'), 'sem campo de código; diz que o responsável também pode pôr o e-mail direto');
  ok(await page.evaluate(() => (window.__db.pedidos_de_acesso.find(x => x.user_id === 'u-ana') || {}).destino === 'responsavel'), 'o pedido fica marcado como do responsável');
  await browser.close();

  // ---- o responsável vê o pedido no painel e aceita ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/painel', plano: 'completo' }));
  await page.evaluate(async () => {
    window.__db.academias.find(a => a.id === 'a2').plano = 'completo';
    window.__db.academia_acessos.push({ user_id: 'u-ana', academia_id: null, usuario: 'ana@exemplo.com', nome_responsavel: 'Ana Nova', email: 'ana@exemplo.com', cargo: 'Professora', papel: 'principal', pedido_academia_id: 'a2', pedido_nome: 'Quadra Locação', pedido_em: '2026-10-03T10:00:00Z', pedido_destino: 'responsavel' });
    await carregarPedidosDeAcesso(); render();
  });
  t = await texto(page, '.pc-pedidos-acesso');
  ok(t.includes('Pedido de acesso') && t.includes('Querem administrar a Quadra Locação com vocês') && t.includes('Ana Nova') && t.includes('ana@exemplo.com · Professora'), 'o responsável vê quem pediu, com e-mail e cargo — ' + t.slice(0, 90));
  await page.click('[data-aceitar-pedido="u-ana"]');
  await page.waitForTimeout(500);
  const ana = await page.evaluate(() => ({ v: window.__db.academia_vinculos.filter(v => v.user_id === 'u-ana').map(v => v.academia_id + ':' + v.papel).join(), pedido: window.__db.pedidos_de_acesso.some(p => p.user_id === 'u-ana'), cartao: !!document.querySelector('.pc-pedidos-acesso'), aviso: document.querySelector('.conta-aviso')?.innerText || '' }));
  ok(ana.v === 'a2:equipe' && !ana.pedido && !ana.cartao && ana.aviso.includes('entrou na equipe'), 'aceitar põe a pessoa na equipe e o pedido some — ' + ana.v);
  await browser.close();

  // ---- recusar, e plano cheio ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/pessoas' }));
  await page.evaluate(async () => {
    window.__db.academia_acessos.push({ user_id: 'u-ze', academia_id: null, usuario: 'ze@exemplo.com', nome_responsavel: 'Zé', email: 'ze@exemplo.com', papel: 'principal', pedido_academia_id: 'a2', pedido_nome: 'Quadra Locação', pedido_em: '2026-10-03T10:00:00Z', pedido_destino: 'responsavel' });
    await carregarPedidosDeAcesso(); await carregarPessoas(); render();
  });
  ok(await page.isVisible('.pc-pedidos-acesso') && (await texto(page, '.pc-pedidos-acesso')).includes('Quero o Completo'), 'em Pessoas também; com o Básico cheio, oferece o Completo');
  await page.click('[data-aceitar-pedido="u-ze"]');
  await page.waitForTimeout(400);
  ok((await texto(page, '.pc-pedidos-acesso .form-error')).includes('permite até 1 pessoa.'), 'Básico cheio: aceitar avisa do limite do plano');
  page.once('dialog', d => d.accept());
  await page.click('[data-recusar-acesso="u-ze"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => !window.__db.pedidos_de_acesso.some(p => p.user_id === 'u-ze') && !document.querySelector('.pc-pedidos-acesso')), 'recusar tira o pedido');
  await browser.close();

  // ---- quem é da equipe não vê os pedidos ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/painel' }));
  await page.evaluate(async () => {
    window.__db.academia_acessos[0].papel = 'equipe';
    window.__db.academia_vinculos[0].papel = 'equipe';
    window.__db.academia_acessos.push({ user_id: 'u-ze', academia_id: null, usuario: 'ze@exemplo.com', nome_responsavel: 'Zé', email: 'ze@exemplo.com', pedido_academia_id: 'a2', pedido_destino: 'responsavel' });
    await recarregarConta(); await carregarPedidosDeAcesso(); render();
  });
  ok(!(await page.isVisible('.pc-pedidos-acesso')), 'quem é da equipe não vê nem responde aos pedidos');
  await browser.close();

  // ---- admin: sem código para academia com responsável ----
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(async () => {
    window.__db.academia_acessos.push(
      { user_id: 'u-dono', academia_id: 'a2', usuario: 'dono@quadra.com', nome_responsavel: 'Dono Quadra', email: 'dono@quadra.com', papel: 'principal' },
      { user_id: 'u-ana', academia_id: null, usuario: 'ana@exemplo.com', nome_responsavel: 'Ana Nova', email: 'ana@exemplo.com', whatsapp: '11988883333', papel: 'principal', pedido_academia_id: 'a2', pedido_nome: 'Quadra Locação', pedido_em: '2026-10-03T10:00:00Z', pedido_destino: 'responsavel' });
    window.__db.academia_vinculos.push({ user_id: 'u-dono', academia_id: 'a2', papel: 'principal' });
    await carregarAcessos(); state.showAdminPanel = true; render();
  });
  t = await texto(page, '#admin-overlay .acesso-pedido');
  ok(t.includes('Já tem responsável (Dono Quadra)') && !(await page.isVisible('[data-gerar-codigo="u-ana"]')), 'admin: academia com responsável não tem "Gerar código", e o pedido diz com quem está');
  let dialogo = '';
  page.once('dialog', d => { dialogo = d.message(); d.dismiss(); });
  await page.click('[data-aprovar-pedido="u-ana"]');
  await page.waitForTimeout(300);
  ok(dialogo.includes('já tem responsável') && await page.evaluate(() => !window.__db.academia_vinculos.some(v => v.user_id === 'u-ana')), 'aprovar pede confirmação, e cancelar não aprova');
  const r = await page.evaluate(() => sb.rpc('gerar_codigo_do_pedido', { p_user: 'u-ana' }));
  ok(r.error && r.error.message.includes('já tem responsável'), 'o banco também não gera código para academia com responsável');
  await browser.close();
})();
