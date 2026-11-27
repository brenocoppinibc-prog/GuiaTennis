// Regra 222 (pedido do Breno em 09/11/2026): na disputa, quem contesta
// informa o WhatsApp que acha certo e confirma com um código; quem administra
// confirma o WhatsApp da ficha com outro código; o admin compara e decide.
// Dando a academia a quem contestou, o número confirmado vai para a ficha.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);

(async () => {
  // ---- quem administra: o cartão "Academia contestada" com o código ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel' });
  await page.evaluate(async () => {
    const agora = new Date().toISOString();
    window.__db.academias.find(x => x.id === 'a1').phone = '11933334444';
    window.__db.academia_acessos.push({ user_id: 'u-dona', academia_id: null, usuario: 'dona@exemplo.com', email: 'dona@exemplo.com', nome_responsavel: 'Dona Certa', papel: 'principal', dados_completos_em: agora });
    window.__db.pedidos_de_acesso.push({ user_id: 'u-dona', academia_id: 'a1', nome: 'Só Aula Tennis', destino: 'disputa', pedido_em: agora, declarou_em: agora, numero_contestado: '11977776666' });
    window.__codigosResp = { a1: { codigo: '112233', tentativas: 0, em: agora } };
    await recarregarConta(); await loadEverything(); irParceiros('painel');
  });
  await page.waitForTimeout(400);
  let cartao = await texto(page, '#parceiros .pc-disputa-responsavel');
  ok(cartao.toLowerCase().includes('academia contestada') && cartao.includes('Confirme o WhatsApp da academia') && cartao.includes('(11) 93333-4444') && cartao.includes('nada muda na academia') && !cartao.includes('Dona') && !cartao.includes('97777'),
    'quem administra vê "Academia contestada" com o WhatsApp da ficha, sem saber quem contestou nem o número dela — ' + cartao.replace(/\s+/g, ' ').slice(150, 420));
  await page.fill('[data-codigo-disputa="a1"]', '999999');
  await page.click('[data-confirmar-disputa="a1"]');
  await page.waitForTimeout(400);
  ok((await texto(page, '#parceiros .pc-disputa-responsavel .form-error')).includes('Código errado'), 'código errado: avisa');
  await page.fill('[data-codigo-disputa="a1"]', '112233');
  await page.click('[data-confirmar-disputa="a1"]');
  await page.waitForTimeout(500);
  cartao = await texto(page, '#parceiros .pc-disputa-responsavel');
  let r = await page.evaluate(() => ({ p: window.__db.pedidos_de_acesso.find(p => p.user_id === 'u-dona'), email: window.__db.emails_a_enviar.some(e => e.assunto === 'Disputa: quem administra confirmou o WhatsApp da Só Aula Tennis') }));
  ok(cartao.includes('WhatsApp confirmado') && cartao.includes('O GuiaTennis está analisando') && !!r.p.responsavel_codigo_ok_em && r.p.responsavel_numero === '11933334444' && r.email,
    'código certo: guarda a prova, avisa o admin e o cartão diz que o GuiaTennis está analisando');
  await browser.close();

  // ---- admin: os dois lados e a decisão ----
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(async () => {
    const agora = new Date().toISOString();
    window.__db.academia_acessos.push(
      { user_id: 'u-tomou', academia_id: 'a1', usuario: 'tomou@exemplo.com', email: 'tomou@exemplo.com', nome_responsavel: 'Tito Tomou', papel: 'principal', dados_completos_em: agora },
      { user_id: 'u-dona', academia_id: null, usuario: 'dona@exemplo.com', email: 'dona@exemplo.com', nome_responsavel: 'Dona Certa', papel: 'principal', dados_completos_em: agora });
    window.__db.academia_vinculos.push({ user_id: 'u-tomou', academia_id: 'a1', papel: 'principal', created_at: agora });
    window.__db.academias.find(x => x.id === 'a1').phone = '11911112222';
    window.__db.pedidos_de_acesso.push({ user_id: 'u-dona', academia_id: 'a1', nome: 'Só Aula Tennis', destino: 'disputa', pedido_em: agora, declarou_em: agora,
      numero_contestado: '11955554444', codigo_ok_em: agora });
    await carregarAcessos(); await loadEverything(); irAdmin('pendencias');
  });
  await page.waitForTimeout(500);
  let painel = await page.evaluate(() => document.body.innerText);
  ok(painel.includes('Quem contestou informou: (11) 95555-4444 · confirmado por código') && painel.includes('WhatsApp da ficha (Tito Tomou): (11) 91111-2222 · ainda sem código'),
    'o admin vê os dois números: o de quem contestou, já confirmado, e o da ficha, ainda sem código');
  await page.click('[data-mandar-codigo-resp="a1"]');
  await page.waitForTimeout(500);
  const link = await page.evaluate(() => [...document.querySelectorAll('a')].map(a => a.getAttribute('href') || '').find(h => h.includes('wa.me/5511911112222')) || '');
  ok(link.includes('112233'), 'sem o WhatsApp do GuiaTennis ligado, o admin gera o código de quem administra e manda do WhatsApp dele, para o número da ficha');
  let pergunta = '';
  page.once('dialog', d => { pergunta = d.message(); d.accept(); });
  await page.click('[data-aprovar-pedido="u-dona"][data-academia="a1"]');
  await page.waitForTimeout(500);
  r = await page.evaluate(() => ({ vinc: window.__db.academia_vinculos.filter(v => v.academia_id === 'a1').map(v => v.user_id + ':' + v.papel).join(','), phone: window.__db.academias.find(x => x.id === 'a1').phone }));
  ok(pergunta.includes('o WhatsApp que ela confirmou vai para a ficha') && r.vinc === 'u-dona:principal' && r.phone === '11955554444',
    'dar a academia a quem contestou: vira a responsável, quem administrava sai e o WhatsApp confirmado por ela vai para a ficha — ' + JSON.stringify(r));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
