// A página pública das avaliações do GuiaTennis (pedido do Breno em
// 10/11/2026, regra 235: "quero que aparece sem login sobre as avaliações"),
// como a página de uma empresa no Trustpilot e as "Notas e avaliações" das
// lojas de apps.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' '), sel);
const comentarios = [];
for (let i = 0; i < 23; i++) comentarios.push({ id: 'c' + i, publico: 'jogador', nome: 'Jogador ' + i + '.', nota: i % 2 ? 5 : 4, texto: 'Achei quadra perto ' + i, quando: '2026-11-10T12:00:00Z' });
comentarios.unshift({ id: 'p1', publico: 'parceiro', nome: 'Arena Moema', nota: 5, texto: 'Chegaram alunos novos pelo WhatsApp', quando: '2026-11-10T13:00:00Z', resposta: 'Que bom, Arena Moema!' });
comentarios.push({ id: 'j9', publico: 'jogador', nome: 'Hugo M.', nota: 2, texto: 'Faltam academias no meu bairro', quando: '2026-11-09T12:00:00Z', resposta: 'Estamos cadastrando o seu bairro.', feito: '12 academias novas em Moema.' });
const PAGINA = {
  resumo: {
    jogador: { media: 4.4, total: 30, respondidas: 15, estrelas: { 1: 0, 2: 1, 3: 2, 4: 12, 5: 15 } },
    parceiro: { media: 5, total: 2, respondidas: 2, estrelas: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 2 } },
  },
  feitos: [{ texto: '12 academias novas em Moema.', quando: '2026-11-10T10:00:00Z' }],
  comentarios,
};
const NOTA = { jogador: { media: 4.4, total: 30, comentarios: [] }, parceiro: { media: 5, total: 2, comentarios: [] } };

(async () => {
  // ---- Visitante, sem entrar: /avaliacoes abre direto ----
  let { browser, page } = await abrir({ q: 'avaliacoes', paginaDaNota: PAGINA, notaDoGuia: NOTA });
  await page.waitForTimeout(900);
  let corpo = await texto(page, '.pag-nota');
  ok(corpo.includes('Avaliações do GuiaTennis') && await page.evaluate(() => state.page === 'avaliacoes' && !jogador), 'o visitante abre /avaliacoes sem entrar');
  ok(corpo.includes('4,4') && corpo.includes('30 avaliações de jogadores') && corpo.includes('50% respondidas'), 'a nota dos jogadores, o total e quantas o GuiaTennis respondeu — ' + corpo.slice(0, 200));
  ok(corpo.includes('Academias') && corpo.includes('2 avaliações. A nota aparece a partir de 3.') && !corpo.includes('5,0'), 'com menos de 3, a nota das academias não aparece');
  ok(await page.$$eval('.pag-nota-lado:first-child .bar-row', b => b.length) === 5, 'as 5 barras de estrelas dos jogadores');
  ok(corpo.includes('Você pediu, nós fizemos') && corpo.includes('12 academias novas em Moema.'), 'o "Você pediu, nós fizemos" sem dizer quem pediu');
  ok(await page.$$eval('.pag-nota-rev', c => c.length) === 20 && corpo.includes('25 comentários') && await page.$('#pag-nota-mais'), 'os comentários de 20 em 20, com o total');
  ok((await texto(page, '.pag-nota-rev')).includes('Arena Moema') && (await texto(page, '.pag-nota-rev')).includes('Academia') && (await texto(page, '.pag-nota-rev')).includes('Resposta do GuiaTennis: Que bom, Arena Moema!'),
    'o cartão: o nome, quem é (academia), a nota e a resposta do GuiaTennis');
  ok(corpo.includes('Como funcionam estas avaliações') && corpo.includes('sem filtro') && corpo.includes('não paga nem dá vantagem'), 'explica como funcionam (transparência)');
  ok(await page.evaluate(() => document.title.startsWith('Avaliações do GuiaTennis') && document.getElementById('link-canonical').getAttribute('href').endsWith('/avaliacoes') && !document.querySelector('meta[name="robots"]')),
    'título próprio, canônico /avaliacoes e aberta para o Google');
  await page.evaluate(() => document.getElementById('pag-nota-mais').scrollIntoView({ block: 'center' }));
  const antes = await page.evaluate(() => window.scrollY);
  await page.click('#pag-nota-mais');
  await page.waitForTimeout(400);
  ok(await page.$$eval('.pag-nota-rev', c => c.length) === 25 && !(await page.$('#pag-nota-mais')), '"Ver mais comentários" traz o resto');
  ok(Math.abs((await page.evaluate(() => window.scrollY)) - antes) < 400, 'o "Ver mais" não joga a tela para o topo');
  ok((await texto(page, '.pag-nota-lista')).includes('Você pediu, nós fizemos: 12 academias novas em Moema.'), 'o "feito" aparece junto do comentário de quem pediu');

  // Filtros: Academias, a estrela e a barra.
  await page.click('[data-pag-nota-lado="parceiro"]');
  await page.waitForTimeout(400);
  ok(await page.$$eval('.pag-nota-rev', c => c.length) === 1 && (await page.evaluate(() => location.pathname + location.search)) === '/avaliacoes?de=academias', 'filtro "Academias", com o link acompanhando');
  await page.click('[data-pag-nota-estrela="2"]');
  await page.waitForTimeout(400);
  ok((await texto(page, '.pag-nota')).includes('Nenhum comentário com esse filtro.'), 'filtro sem resultado avisa');
  await page.click('[data-pag-nota-barra="jogador|2"]');
  await page.waitForTimeout(500);
  ok(await page.$$eval('.pag-nota-rev', c => c.length) === 1 && (await texto(page, '.pag-nota-rev')).includes('Hugo M.')
     && (await page.evaluate(() => location.search)) === '?de=jogadores&estrelas=2', 'tocar na barra de 2 estrelas dos jogadores filtra — ' + await page.evaluate(() => location.search));
  const pedido = await page.evaluate(() => window.__pedidosDaPaginaDaNota.pop());
  ok(pedido.p_publico === 'jogador' && pedido.p_nota === 2 && pedido.p_limite === 20, 'vai ao banco com o lado e a estrela');

  await page.evaluate(() => { state.showMenu = true; render(); });
  await page.waitForTimeout(200);
  ok(await page.$('[data-menu="avaliacoes"]'), 'o menu tem "Avaliações" (sem login)');
  await page.evaluate(() => { state.showMenu = false; render(); });
  await page.waitForTimeout(200);
  // Avaliar continua pedindo conta.
  await page.click('.pag-nota-acoes [data-avaliar-guia="jogador"]');
  await page.waitForTimeout(300);
  ok(!(await page.$('#nota-guia-overlay')) && await page.evaluate(() => !!document.querySelector('#jog-overlay, .jog-overlay, [id^="jog-"]')), 'para avaliar, pede para entrar');
  await browser.close();

  // ---- O link aberto com o filtro e o "voltar" ----
  ({ browser, page } = await abrir({ q: 'avaliacoes?de=academias&estrelas=5', paginaDaNota: PAGINA, notaDoGuia: NOTA }));
  await page.waitForTimeout(900);
  ok(await page.$$eval('.pag-nota-rev', c => c.length) === 1 && await page.$('[data-pag-nota-lado="parceiro"].active') && await page.$('[data-pag-nota-estrela="5"].active'), 'o link com ?de=academias&estrelas=5 abre já filtrado');
  await browser.close();

  // ---- Do rodapé e da página de venda do Parceiros ----
  ({ browser, page } = await abrir({ paginaDaNota: PAGINA, notaDoGuia: { ...NOTA, parceiro: { media: 4.8, total: 5, comentarios: [{ nome: 'Arena Moema', nota: 5, texto: 'Chegaram alunos', quando: '2026-11-10' }] } } }));
  await page.waitForTimeout(1500);
  ok(await page.$('.sitefooter a[data-ir-avaliacoes][href="/avaliacoes"]'), 'o rodapé tem "Ver as avaliações"');
  await page.click('.sitefooter a[data-ir-avaliacoes]');
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => state.page === 'avaliacoes' && location.pathname === '/avaliacoes') && !(await page.$('.sitefooter a[data-ir-avaliacoes]')), 'abre a página (e o rodapé dela não repete o link)');
  await page.goBack();
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => state.page === 'home' && location.pathname === '/'), 'o "voltar" volta para onde estava');
  await page.evaluate(() => { state.page = 'parceiros'; state.parceirosAba = 'inicio'; render(); });
  await page.waitForTimeout(600);
  ok(await page.$('#pc-nota-guia-sec a[href="/avaliacoes?de=academias"]'), 'a página de venda do Parceiros leva às avaliações das academias');
  await page.click('#pc-nota-guia-sec a[data-ir-avaliacoes]');
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => state.page === 'avaliacoes' && state.pagNota.lado === 'parceiro'), 'abre já no filtro "Academias"');
  await browser.close();

  // ---- Com login (pedido seguinte: "com e sem login") ----
  // Jogador: a página é a mesma, com "Sua nota para o GuiaTennis" em cima, e o menu leva até ela.
  ({ browser, page } = await abrir({ jogador: true, jogadorConfirmado: true, paginaDaNota: PAGINA, notaDoGuia: NOTA }));
  await page.waitForTimeout(1200);
  await page.evaluate(() => { state.showMenu = true; render(); });
  await page.waitForTimeout(200);
  ok(await page.$('[data-menu="avaliacoes"]'), 'o menu tem "Avaliações" (com login)');
  await page.click('[data-menu="avaliacoes"]');
  await page.waitForTimeout(800);
  corpo = await texto(page, '.pag-nota');
  ok(await page.evaluate(() => state.page === 'avaliacoes' && location.pathname === '/avaliacoes') && corpo.includes('4,4') && await page.$$eval('.pag-nota-rev', c => c.length) === 20,
    'logado, a página mostra o mesmo que sem login');
  ok(corpo.includes('Sua nota para o GuiaTennis') && await page.$('.pag-nota-minha [data-avaliar-guia="jogador"]') && !(await page.$('.pag-nota-minha a[data-ir-avaliacoes]')),
    'logado: "Sua nota para o GuiaTennis" em cima, sem o link para a própria página');
  await page.click('.pag-nota-minha [data-avaliar-guia="jogador"]');
  await page.waitForTimeout(300);
  ok((await texto(page, '#nota-guia-overlay')).includes('Como o GuiaTennis está te ajudando?'), 'logado, "Avaliar o GuiaTennis" abre as estrelas direto, sem pedir para entrar');
  await page.click('[data-nota-guia-estrela="5"]');
  await page.fill('#nota-guia-texto', 'Muito bom para achar quadra');
  const antesDe = await page.evaluate(() => window.__pedidosDaPaginaDaNota.length);
  await page.click('#nota-guia-enviar');
  await page.waitForTimeout(500);
  await page.click('#nota-guia-ok');
  await page.waitForTimeout(500);
  corpo = await texto(page, '.pag-nota');
  ok(corpo.includes('Muito bom para achar quadra') && corpo.includes('Mudar a avaliação') && await page.evaluate((n) => window.__pedidosDaPaginaDaNota.length > n, antesDe),
    'depois de avaliar: a própria avaliação aparece e a página busca a nota de novo');
  await page.evaluate(() => { state.page = 'perfil'; window.__jog = formDoJogador(); render(); });
  await page.waitForTimeout(500);
  ok(await page.$('#perfil-nota a[data-ir-avaliacoes][href="/avaliacoes"]'), 'Minha conta: "Ver as avaliações do GuiaTennis"');
  await browser.close();

  // Academia: a nota como academia e os links do Painel e do Plano.
  ({ browser, page } = await abrir({ academia: 'a1', q: 'avaliacoes', paginaDaNota: PAGINA, notaDoGuia: { ...NOTA, parceiro: { media: 4.8, total: 5, comentarios: [] } } }));
  await page.waitForTimeout(1200);
  corpo = await texto(page, '.pag-nota');
  ok(await page.evaluate(() => state.page === 'avaliacoes') && corpo.includes('Sua nota como') && await page.$('.pag-nota-minha [data-avaliar-guia="parceiro"]'), 'a conta da academia vê a página e a própria nota como academia — ' + corpo.slice(0, 120));
  await page.evaluate(() => { state.page = 'parceiros'; state.parceirosAba = 'perfil'; render(); });
  await page.waitForTimeout(700);
  ok(await page.$('#pc-nota-guia a[data-ir-avaliacoes="academias"]'), 'Perfil do Parceiros: "Ver as avaliações do GuiaTennis"');
  await page.evaluate(() => { state.parceirosAba = 'plano'; render(); });
  await page.waitForTimeout(700);
  const plano = await page.$('.nota-guia-curta a[data-ir-avaliacoes="academias"]');
  ok(plano, 'Plano: a nota das academias com "Ver as avaliações"');
  if (plano) { await plano.click(); await page.waitForTimeout(600); }
  ok(await page.evaluate(() => state.page === 'avaliacoes' && state.pagNota.lado === 'parceiro'), 'do Plano, abre em Academias');
  await browser.close();

  // Admin: vê tudo e vai responder no painel (o admin não avalia).
  ({ browser, page } = await abrir({ admin: true, q: 'avaliacoes', paginaDaNota: PAGINA, notaDoGuia: NOTA }));
  await page.waitForTimeout(1200);
  ok(await page.$$eval('.pag-nota-rev', c => c.length) === 20 && !(await page.$('.pag-nota [data-avaliar-guia]')) && await page.$('[data-pag-nota-admin]'), 'admin: a página, sem "Avaliar", com "Responder no painel do admin"');
  await page.click('[data-pag-nota-admin]');
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => state.page === 'admin' && state.adminAba === 'nota'), '"Responder no painel" abre a Nota do GuiaTennis no admin');
  await browser.close();

  // ---- Banco sem o SQL novo: avisa sem quebrar ----
  ({ browser, page } = await abrir({ q: 'avaliacoes', semNotaDoGuia: true }));
  await page.waitForTimeout(900);
  ok((await texto(page, '.pag-nota')).includes('Não consegui abrir as avaliações agora') && await page.$('[data-pag-nota-tentar]'), 'sem o banco, uma mensagem simples com "Tentar de novo"');
  await browser.close();
})();
