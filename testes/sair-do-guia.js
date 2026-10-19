// A conta sai, a academia fica (pedido do Breno em 19/10/2026: "no parceiros
// se cancelar a conta não exclui a academia e sim volta como básica, tirar
// opções de excluir academia do site" e "se tem mais algum acesso, o
// responsável exclui vai para o outro acesso e será cobrado dela"). Antes
// (08/10/2026), tirar do guia era um pedido do responsável principal.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);

(async () => {
  // ---- Suas academias: pausar, sem tirar do guia ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/academias' });
  await page.waitForTimeout(500);
  let corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Pausar no site') && !corpo.includes('Pedir para tirar do guia') && !(await page.$('[data-pedir-saida]')), 'Suas academias: pausar continua, sem "Pedir para tirar do guia"');
  ok(!(await page.evaluate(() => window.__rpcs.some(r => /para_sair/.test(r.nome)))), 'nem pergunta ao banco pelos pedidos para sair');
  await browser.close();

  // ---- Perfil: excluir a conta; com outro acesso, ele vira o responsável ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/perfil', premium: ['a1'] }));
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    window.__db.academia_acessos.push({ user_id: 'u-tati', academia_id: 'a1', usuario: 'tati@exemplo.com', email: 'tati@exemplo.com', nome_responsavel: 'Tati Equipe', papel: 'equipe' });
    window.__db.academia_vinculos.push({ user_id: 'u-tati', academia_id: 'a1', papel: 'equipe' });
  });
  ok((await texto(page, '#pc-excluir-conta')) === 'Excluir minha conta', 'o Perfil tem "Excluir minha conta"');
  let pergunta = '';
  page.once('dialog', d => { pergunta = d.message(); d.dismiss(); });
  await page.click('#pc-excluir-conta');
  await page.waitForTimeout(200);
  ok(pergunta.includes('As academias continuam no guia, com a ficha pública.') && pergunta.includes('a pessoa mais antiga da equipe passa a ser a responsável, e o plano passa a ser dela') && pergunta.includes('volta ao plano Básico') && pergunta.includes('não pode ser desfeito'),
    'pergunta antes, dizendo que a academia fica e quem assume — ' + pergunta.split('\n')[0]);
  ok(!(await page.evaluate(() => window.__rpcs.some(r => r.nome === 'excluir_minha_conta_parceiros'))), 'sem confirmar, nada muda');
  // A página recarrega depois de excluir: o resultado fica guardado antes.
  await page.evaluate(() => { const o = sb.rpc.bind(sb); sb.rpc = async (n, a) => { const r = await o(n, a); if (n === 'excluir_minha_conta_parceiros') localStorage.setItem('__exc', JSON.stringify({ rpc: true, plano: (window.__db.academias.find(x => x.id === 'a1') || {}).plano, tati: (window.__db.academia_vinculos.find(v => v.user_id === 'u-tati') || {}).papel, fica: window.__db.academias.some(x => x.id === 'a1') })); return r; }; const so = sb.auth.signOut.bind(sb.auth); sb.auth.signOut = async () => { localStorage.setItem('__saiu', '1'); return so(); }; });
  page.once('dialog', d => d.accept());
  await page.click('#pc-excluir-conta');
  await page.waitForTimeout(900);
  let r = await page.evaluate(() => JSON.parse(localStorage.getItem('__exc') || '{}'));
  ok(r.rpc && r.fica && r.plano === 'premium' && r.tati === 'principal' && new URL(page.url()).pathname.startsWith('/parceiros') && (await page.evaluate(() => localStorage.getItem('__saiu'))) === '1', 'excluída: sai da conta; a academia fica, a outra pessoa vira a responsável e o plano continua — ' + page.url() + ' ' + JSON.stringify(r));
  await browser.close();

  // ---- sem outro acesso, a academia volta ao Básico ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/perfil', premium: ['a1'] }));
  await page.waitForTimeout(400);
  // A página recarrega depois de excluir: o resultado fica guardado antes.
  await page.evaluate(() => { const o = sb.rpc.bind(sb); sb.rpc = async (n, a) => { const r = await o(n, a); if (n === 'excluir_minha_conta_parceiros') localStorage.setItem('__exc', JSON.stringify({ rpc: true, plano: (window.__db.academias.find(x => x.id === 'a1') || {}).plano, tati: (window.__db.academia_vinculos.find(v => v.user_id === 'u-tati') || {}).papel, fica: window.__db.academias.some(x => x.id === 'a1') })); return r; }; const so = sb.auth.signOut.bind(sb.auth); sb.auth.signOut = async () => { localStorage.setItem('__saiu', '1'); return so(); }; });
  page.once('dialog', d => d.accept());
  await page.click('#pc-excluir-conta');
  await page.waitForTimeout(900);
  r = await page.evaluate(() => JSON.parse(localStorage.getItem('__exc') || '{}'));
  ok(r.fica && r.plano === 'basico', 'sem outro acesso, a academia fica no guia, no Básico');
  await browser.close();

  // ---- o admin não apaga a academia publicada ----
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(async () => { await loadEverything(); irAdmin('pendencias'); });
  await page.waitForTimeout(500);
  corpo = await texto(page, 'body');
  ok(!corpo.includes('Querem sair do guia') && !(await page.$('.pedido-saida')), 'Pendências sem "Querem sair do guia"');
  await page.evaluate(() => openCourt('a1'));
  await page.waitForTimeout(400);
  ok(await page.$('#qr-btn') && !(await page.$('#delete-court-btn')) && !(await texto(page, 'body')).includes('Excluir academia'), 'a ficha do admin não tem mais "Excluir academia"');
  await browser.close();

  // ---- textos ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha' }));
  await page.waitForTimeout(400);
  const rodape = await texto(page, '#parceiros .pc-main .footnote');
  r = await page.evaluate(() => ({ faq: perguntasParceiros().find(f => f.q === 'Posso pausar ou tirar a academia do guia?').a, termos: TERMS_HTML }));
  ok(!rodape.includes('Pedir para tirar do guia') && rodape.includes('A ficha continua no guia'), 'Minha ficha não aponta mais para o pedido');
  ok(r.faq.includes('Tirar do guia, não') && r.faq.includes('exclui a própria conta em Perfil') && r.faq.includes('o plano passa a ser dela'), 'a Ajuda explica que a ficha fica e o que acontece ao excluir a conta');
  ok(r.termos.includes('A ficha da academia é pública e continua no guia') && r.termos.includes('assume o plano, inclusive o pagamento') && !r.termos.includes('Pedir para tirar do guia'), 'os Termos dizem que a ficha fica e quem assume o plano');
  await browser.close();
})();
