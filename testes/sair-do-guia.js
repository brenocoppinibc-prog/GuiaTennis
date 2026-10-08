// Pedido do Breno em 08/10/2026: "eu quero que a pausa o administrador
// consiga fazer, agora a exclusão preciso pedir uma solicitação". Pausar
// continua na hora; tirar do guia vira um pedido do responsável principal,
// que o admin resolve em Pendências.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);

(async () => {
  // ---- o responsável principal pede ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/academias' });
  await page.waitForTimeout(500);
  let cartao = await texto(page, '.pc-acad');
  ok(cartao.includes('Pausar no site') && cartao.includes('Pedir para tirar do guia'), 'em Suas academias: "Pausar no site" e "Pedir para tirar do guia"');
  await page.click('[data-pedir-saida="a1"]');
  await page.waitForTimeout(200);
  cartao = await texto(page, '.pc-acad');
  ok(cartao.includes('Tirar a academia do guia?') && cartao.includes('com as avaliações') && cartao.includes('Se for só por um tempo, pause no site'), 'o formulário diz o que acontece e lembra da pausa');
  await page.click('#pc-saida-enviar');
  await page.waitForTimeout(200);
  ok((await texto(page, '.pc-saida .form-error')).includes('Escolha o motivo'), 'sem motivo, pede o motivo');
  await page.click('[data-saida-motivo="outro"]');
  await page.click('#pc-saida-enviar');
  await page.waitForTimeout(200);
  ok((await texto(page, '.pc-saida .form-error')).includes('Conte o motivo'), '"Outro motivo" pede o motivo escrito');
  await page.click('[data-saida-motivo="fechou"]');
  await page.fill('#pc-saida-detalhes', 'Fechamos em setembro.');
  await page.click('#pc-saida-enviar');
  await page.waitForTimeout(500);
  let r = await page.evaluate(() => ({
    args: (window.__rpcs.filter(x => x.nome === 'pedir_para_sair_do_guia').slice(-1)[0] || {}).args,
    aviso: document.querySelector('#parceiros .conta-aviso')?.innerText || '',
    cartao: document.querySelector('.pc-acad')?.innerText || '',
    email: window.__db.emails_a_enviar.some(e => e.tipo === 'pedido_para_sair'),
    noGuia: window.__db.academias.some(a => a.id === 'a1'),
  }));
  ok(r.args && r.args.p_academia === 'a1' && r.args.p_motivo === 'fechou' && r.args.p_detalhes === 'Fechamos em setembro.', 'o pedido vai com o motivo e o que a pessoa escreveu');
  ok(r.aviso.includes('Pedido enviado') && r.cartao.includes('Pedido para tirar do guia enviado em') && r.cartao.includes('Cancelar o pedido') && !r.cartao.includes('Pedir para tirar do guia'),
    'o cartão mostra o pedido enviado, com "Cancelar o pedido"');
  ok(r.email && r.noGuia, 'o admin recebe o pedido por e-mail, e a academia continua no guia até ele decidir');
  page.once('dialog', d => d.accept());
  await page.click('[data-cancelar-saida="a1"]');
  await page.waitForTimeout(500);
  r = await page.evaluate(() => ({ aberto: window.__db.pedidos_para_sair.filter(p => !p.resolvido_em).length, cartao: document.querySelector('.pc-acad')?.innerText || '' }));
  ok(r.aberto === 0 && r.cartao.includes('Pedir para tirar do guia'), '"Cancelar o pedido" desfaz, e a academia continua');
  // A equipe não pede.
  await page.evaluate(async () => { window.__db.academia_vinculos.forEach(v => { v.papel = 'equipe'; }); await recarregarConta(); render(); });
  await page.waitForTimeout(300);
  cartao = await texto(page, '.pc-acad');
  ok(!cartao.includes('Pedir para tirar do guia') && cartao.includes('Pausar no site'), 'a equipe pausa, mas não pede para tirar do guia');
  await browser.close();

  // ---- o admin resolve em Pendências ----
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(async () => {
    const agora = new Date().toISOString();
    window.__db.academia_acessos.push({ user_id: 'u-rui', academia_id: 'a2', usuario: 'rui@exemplo.com', email: 'rui@exemplo.com', nome_responsavel: 'Rui Dono', whatsapp: '11988887777', papel: 'principal' });
    window.__db.pedidos_para_sair.push({ id: 's1', academia_id: 'a2', academia_nome: 'Quadra Locação', user_id: 'u-rui', motivo: 'nao_quer', detalhes: 'Vamos focar em outro canal.', pedido_em: agora, resolvido_em: null });
    window.__db.pedidos_para_sair.push({ id: 's2', academia_id: 'a1', academia_nome: 'Só Aula Tennis', user_id: 'u-rui', motivo: 'fechou', detalhes: null, pedido_em: agora, resolvido_em: null });
    await loadEverything();
    irAdmin('pendencias');
  });
  await page.waitForTimeout(500);
  const bloco = await page.evaluate(() => [...document.querySelectorAll('.pedido-saida')].map(x => x.innerText.replace(/\s+/g, ' ')));
  ok(bloco.length === 2 && bloco[0].includes('Quadra Locação') && bloco[0].includes('Não queremos mais aparecer — Vamos focar em outro canal.') && bloco[0].includes('Rui Dono'),
    'Pendências: "Querem sair do guia", com o motivo e quem pediu — ' + bloco[0]);
  ok(await page.evaluate(() => pendenciasDoAdmin() >= 2), 'os pedidos contam nas pendências do admin');
  page.once('dialog', d => d.accept('Que tal pausar por um tempo?'));
  await page.click('[data-saida-manter="s1"]');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ p: window.__db.pedidos_para_sair.find(x => x.id === 's1'), fica: window.__db.academias.some(a => a.id === 'a2'), n: document.querySelectorAll('.pedido-saida').length }));
  ok(r.p.resolucao === 'mantida' && r.p.resposta === 'Que tal pausar por um tempo?' && r.fica && r.n === 1, '"Manter no guia" fecha o pedido com a resposta, e a academia fica');
  page.once('dialog', d => d.accept());
  await page.click('[data-saida-tirar="s2"]');
  await page.waitForTimeout(600);
  r = await page.evaluate(() => ({ p: window.__db.pedidos_para_sair.find(x => x.id === 's2'), noBanco: window.__db.academias.some(a => a.id === 'a1'), noSite: state.allCourts.some(c => c.id === 'a1'), vazio: (document.querySelector('.adm-vazio') ? [...document.querySelectorAll('.adm-vazio')].map(x => x.innerText).join('|') : '') }));
  ok(r.p.resolucao === 'removida' && !r.noBanco && !r.noSite && r.vazio.includes('Nenhuma academia pediu para sair'), '"Tirar do guia" (com confirmação) apaga a ficha e o pedido sai da lista');
  await browser.close();

  // ---- textos ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha' }));
  await page.waitForTimeout(400);
  const rodape = await texto(page, '#parceiros .pc-main .footnote');
  r = await page.evaluate(() => ({ faq: perguntasParceiros().find(f => f.q === 'Posso pausar ou tirar a academia do guia?').a, termos: TERMS_HTML }));
  ok(rodape.includes('Pedir para tirar do guia') && !rodape.includes('WhatsApp'), 'Minha ficha aponta para o pedido, não para o WhatsApp');
  ok(r.faq.includes('Pedir para tirar do guia') && r.faq.includes('responde por e-mail') && !r.faq.includes('peça pelo WhatsApp'), 'a Ajuda explica o pedido');
  ok(r.termos.includes('Tirar a academia do guia é um pedido do responsável principal') && !r.termos.includes('continua sendo pedido ao GuiaTennis'), 'os Termos dizem como é o pedido');
  await browser.close();
})();
