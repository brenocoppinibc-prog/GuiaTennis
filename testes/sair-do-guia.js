// A conta sai, a academia fica (pedido do Breno em 19/10/2026: "no parceiros
// se cancelar a conta não exclui a academia e sim volta como básica, tirar
// opções de excluir academia do site" e "se tem mais algum acesso, o
// responsável exclui vai para o outro acesso e será cobrado dela"). A ficha
// só sai do Guia quando a academia fecha as portas ("se fechar as portas, é
// excluída"): o responsável principal avisa e o admin confere.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);

(async () => {
  // ---- Suas academias: pausar e avisar que fechou ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/academias' });
  await page.waitForTimeout(500);
  let corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Pausar no site') && corpo.includes('A academia fechou as portas?') && !corpo.includes('Pedir para tirar do Guia'), 'Suas academias: pausar e "A academia fechou as portas?", sem tirar do Guia por outro motivo');
  await page.click('[data-pedir-saida="a1"]');
  await page.waitForTimeout(150);
  corpo = await texto(page, '.pc-saida');
  ok(corpo.includes('a ficha sai do site na hora') && corpo.includes('Depois de conferir, o GuiaTennis tira a ficha do Guia') && await page.$('#pc-saida-detalhes'), 'o aviso explica que a ficha sai do site na hora e do Guia depois de conferir (regra 157), e pede quando fechou (opcional)');
  await page.fill('#pc-saida-detalhes', 'Fechamos em setembro.');
  await page.click('#pc-saida-enviar');
  await page.waitForTimeout(500);
  let r = await page.evaluate(() => ({ rpc: (window.__rpcs.filter(x => x.nome === 'pedir_para_sair_do_guia').pop() || {}).args, cartao: document.querySelector('.pc-saida-aberta')?.innerText || '' }));
  ok(r.rpc && r.rpc.p_motivo === 'fechou' && r.rpc.p_detalhes === 'Fechamos em setembro.' && r.cartao.includes('Aviso de que a academia fechou enviado'), 'avisa que fechou e o cartão mostra o aviso em andamento');
  page.once('dialog', d => d.accept());
  await page.click('[data-cancelar-saida="a1"]');
  await page.waitForTimeout(500);
  ok(!(await page.$('.pc-saida-aberta')) && (await texto(page, '#parceiros .pc-main')).includes('Aviso cancelado: a ficha volta ao site como estava.'), '"Cancelar o aviso" volta ao normal');
  await page.evaluate(() => { window.__db.academia_vinculos.forEach(v => { v.papel = 'equipe'; }); contaAcademia.papel = 'equipe'; minhasAcademias().forEach(a => { a.papel = 'equipe'; }); render(); });
  await page.waitForTimeout(150);
  ok(!(await page.$('[data-pedir-saida]')), 'a equipe não avisa que fechou (só o responsável principal)');
  await browser.close();

  // ---- Perfil: excluir a conta; com outro acesso, ele vira o responsável ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/perfil', premium: ['a1'] }));
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    window.__db.academia_acessos.push({ user_id: 'u-tati', academia_id: 'a1', usuario: 'tati@exemplo.com', email: 'tati@exemplo.com', nome_responsavel: 'Tati Equipe', papel: 'equipe' });
    window.__db.academia_vinculos.push({ user_id: 'u-tati', academia_id: 'a1', papel: 'equipe' });
  });
  ok((await texto(page, '#pc-excluir-conta')) === 'Excluir minha conta', 'o Perfil tem "Excluir minha conta"');
  // Desde 23/10/2026, o aviso é o mesmo nos dois lados (a conta é uma só).
  await page.click('#pc-excluir-conta');
  await page.waitForTimeout(200);
  const pergunta = (await texto(page, '#excluir-conta')).replace(/\s+/g, ' ');
  ok(pergunta.includes('excluir aqui exclui nos dois') && pergunta.includes('A ficha continua no Guia, pública.') && pergunta.includes('a pessoa mais antiga da equipe passa a ser a responsável, e o plano passa a ser dela') && pergunta.includes('volta ao plano Básico')
    && pergunta.includes('O seu perfil, as favoritas, as buscas salvas') && pergunta.includes('Entendi que a exclusão não pode ser desfeita.'),
    'pergunta antes, dizendo que a conta de jogador sai junto, que a academia fica e quem assume — ' + pergunta.slice(0, 90));
  await page.click('#excluir-conta-nao');
  await page.waitForTimeout(150);
  ok(!(await page.evaluate(() => window.__rpcs.some(r => r.nome === 'excluir_minha_conta_parceiros'))), 'sem confirmar, nada muda');
  const confirmar = async () => { await page.click('#pc-excluir-conta'); await page.waitForTimeout(150); await page.check('#excluir-conta-ok'); await page.click('#excluir-conta-sim'); };
  // A página recarrega depois de excluir: o resultado fica guardado antes.
  await page.evaluate(() => { const o = sb.rpc.bind(sb); sb.rpc = async (n, a) => { const r = await o(n, a); if (n === 'excluir_minha_conta_parceiros') localStorage.setItem('__exc', JSON.stringify({ rpc: true, plano: (window.__db.academias.find(x => x.id === 'a1') || {}).plano, tati: (window.__db.academia_vinculos.find(v => v.user_id === 'u-tati') || {}).papel, fica: window.__db.academias.some(x => x.id === 'a1') })); return r; }; const so = sb.auth.signOut.bind(sb.auth); sb.auth.signOut = async () => { localStorage.setItem('__saiu', '1'); return so(); }; });
  await confirmar();
  await page.waitForTimeout(900);
  r = await page.evaluate(() => JSON.parse(localStorage.getItem('__exc') || '{}'));
  ok(r.rpc && r.fica && r.plano === 'premium' && r.tati === 'principal' && new URL(page.url()).pathname.startsWith('/parceiros') && (await page.evaluate(() => localStorage.getItem('__saiu'))) === '1', 'excluída: sai da conta; a academia fica, a outra pessoa vira a responsável e o plano continua — ' + page.url() + ' ' + JSON.stringify(r));
  await browser.close();

  // ---- sem outro acesso, a academia volta ao Básico ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/perfil', premium: ['a1'] }));
  await page.waitForTimeout(400);
  // A página recarrega depois de excluir: o resultado fica guardado antes.
  await page.evaluate(() => { const o = sb.rpc.bind(sb); sb.rpc = async (n, a) => { const r = await o(n, a); if (n === 'excluir_minha_conta_parceiros') localStorage.setItem('__exc', JSON.stringify({ rpc: true, plano: (window.__db.academias.find(x => x.id === 'a1') || {}).plano, tati: (window.__db.academia_vinculos.find(v => v.user_id === 'u-tati') || {}).papel, fica: window.__db.academias.some(x => x.id === 'a1') })); return r; }; const so = sb.auth.signOut.bind(sb.auth); sb.auth.signOut = async () => { localStorage.setItem('__saiu', '1'); return so(); }; });
  await page.click('#pc-excluir-conta'); await page.waitForTimeout(150); await page.check('#excluir-conta-ok'); await page.click('#excluir-conta-sim');
  await page.waitForTimeout(900);
  r = await page.evaluate(() => JSON.parse(localStorage.getItem('__exc') || '{}'));
  ok(r.fica && r.plano === 'basico', 'sem outro acesso, a academia fica no guia, no Básico');
  await browser.close();

  // ---- o admin confere: "Continua aberta" ou "Fechou: tirar do Guia" ----
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(async () => {
    const agora = new Date().toISOString();
    window.__db.academia_acessos.push({ user_id: 'u-rui', academia_id: 'a2', usuario: 'rui@exemplo.com', email: 'rui@exemplo.com', nome_responsavel: 'Rui Dono', whatsapp: '11988887777', papel: 'principal' });
    window.__db.pedidos_para_sair.push({ id: 's1', academia_id: 'a2', academia_nome: 'Quadra Locação', user_id: 'u-rui', motivo: 'fechou', detalhes: 'Fechamos em setembro.', pedido_em: agora, resolvido_em: null });
    window.__db.pedidos_para_sair.push({ id: 's2', academia_id: 'a1', academia_nome: 'Só Aula Tennis', user_id: 'u-rui', motivo: 'fechou', detalhes: null, pedido_em: agora, resolvido_em: null });
    await loadEverything();
    irAdmin('pendencias');
  });
  await page.waitForTimeout(500);
  const bloco = await page.evaluate(() => [...document.querySelectorAll('.pedido-saida')].map(x => x.innerText.replace(/\s+/g, ' ')));
  ok(bloco.length === 2 && bloco[0].includes('Quadra Locação') && bloco[0].includes('Detalhes: Fechamos em setembro.') && bloco[0].includes('Rui Dono') && (await texto(page, 'body')).includes('Academias que fecharam'),
    'Pendências: "Academias que fecharam", com os detalhes e quem avisou — ' + bloco[0]);
  ok(await page.evaluate(() => pendenciasDoAdmin() >= 2), 'os avisos contam nas pendências do admin');
  page.once('dialog', d => d.accept('Ainda aparece aberta no Google.'));
  await page.click('[data-saida-manter="s1"]');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ p: window.__db.pedidos_para_sair.find(x => x.id === 's1'), fica: window.__db.academias.some(a => a.id === 'a2'), n: document.querySelectorAll('.pedido-saida').length }));
  ok(r.p.resolucao === 'mantida' && r.p.resposta === 'Ainda aparece aberta no Google.' && r.fica && r.n === 1, '"Continua aberta" fecha o aviso com a resposta, e a ficha fica');
  page.once('dialog', d => d.accept());
  await page.click('[data-saida-tirar="s2"]');
  await page.waitForTimeout(600);
  r = await page.evaluate(() => ({ p: window.__db.pedidos_para_sair.find(x => x.id === 's2'), noSite: state.allCourts.some(c => c.id === 'a1') }));
  ok(r.p.resolucao === 'removida' && !r.noSite, '"Fechou: tirar do Guia" (com confirmação) tira a ficha');
  // Na ficha, o admin tira direto a academia que fechou.
  await page.evaluate(() => openCourt('a2'));
  await page.waitForTimeout(400);
  ok(await page.$('#fechou-court-btn') && !(await page.$('#delete-court-btn')) && !(await texto(page, 'body')).includes('Excluir academia'), 'a ficha do admin tem "A academia fechou: tirar do Guia", sem "Excluir academia"');
  page.once('dialog', d => d.accept('Google: fechado permanentemente'));
  await page.click('#fechou-court-btn');
  await page.waitForTimeout(600);
  r = await page.evaluate(() => ({ rpc: (window.__rpcs.find(x => x.nome === 'tirar_academia_que_fechou') || {}).args, noSite: state.allCourts.some(c => c.id === 'a2') }));
  ok(r.rpc && r.rpc.p_academia === 'a2' && r.rpc.p_detalhes === 'Google: fechado permanentemente' && !r.noSite, 'e a ficha sai, com o que o admin conferiu registrado');
  await browser.close();

  // ---- textos ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha' }));
  await page.waitForTimeout(400);
  const rodape = await texto(page, '#parceiros .pc-main .footnote');
  r = await page.evaluate(() => ({ faq: perguntasParceiros().find(f => f.q === 'Posso pausar ou tirar a academia do Guia?').a, termos: TERMS_HTML }));
  ok(rodape.includes('A ficha continua no Guia enquanto a academia estiver aberta') && rodape.includes('se ela fechar as portas, avise'), 'Minha ficha diz que a ficha fica enquanto a academia está aberta');
  ok(r.faq.includes('Tirar do Guia, só se a academia fechar as portas') && r.faq.includes('ou houver informações públicas sobre ela') && r.faq.includes('exclui a própria conta em Perfil'), 'a Ajuda explica quando a ficha sai e o que acontece ao excluir a conta');
  ok(r.termos.includes('a academia que fecha as portas sai do Guia') && r.termos.includes('assume o plano, inclusive o pagamento') && !r.termos.includes('Pedir para tirar do guia'), 'os Termos dizem que só a academia que fechou sai, e quem assume o plano');
  await browser.close();
})();
