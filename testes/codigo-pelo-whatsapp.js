// Pedido do Breno em 07/10/2026: "quero automatizar o código por whatsapp em
// conflitos de acesso com a academia". Na disputa, o código sai sozinho pela
// API oficial do WhatsApp (SQL 20261007140000), como o código por telefone do
// Google Business Profile; desligado, o admin gera e manda, como antes.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);

async function disputaPronta(page, { confirmado = true } = {}) {
  await page.evaluate(async (confirmado) => {
    window.__whatsappLigado = true;
    const agora = new Date().toISOString();
    window.__db.academia_acessos[0].email_confirmado_em = confirmado ? agora : null;
    window.__db.academia_acessos[0].dados_completos_em = agora;
    // Tênis Terceira: já tem responsável, que assumiu com o WhatsApp 11977770003.
    const a3 = { ...JSON.parse(JSON.stringify(window.__db.academias.find(x => x.id === 'a1'))), id: 'a3', name: 'Tênis Terceira', phone: '11911112222' };
    window.__db.academias.push(a3);
    window.__db.academia_acessos.push({ user_id: 'u-outro', academia_id: 'a3', usuario: 'outro@exemplo.com', email: 'outro@exemplo.com', nome_responsavel: 'Otto Outro', papel: 'principal', dados_completos_em: agora });
    window.__db.academia_vinculos.push({ user_id: 'u-outro', academia_id: 'a3', papel: 'principal', created_at: agora, telefone_da_ficha: '11977770003' });
    window.__db.pedidos_de_acesso.push({ user_id: 'u-a2', academia_id: 'a3', nome: 'Tênis Terceira', destino: 'responsavel', pedido_em: agora, declarou_em: agora });
    await recarregarConta(); await loadEverything(); irParceiros('academias');
  }, confirmado);
  await page.waitForTimeout(400);
}

(async () => {
  // ---- contestar manda o código na hora; quem digita vence ----
  let { browser, page } = await abrir({ academia: 'a2', q: 'parceiros/academias' });
  await disputaPronta(page);
  await page.click('[data-contestar="a3"]');
  await page.waitForTimeout(500);
  let cartao = await texto(page, '#parceiros .pc-pedido');
  let r = await page.evaluate(() => ({ zap: window.__whatsapps || [], campo: !!document.querySelector('[data-pedido-codigo="a3"]'), outro: !!document.querySelector('[data-outro-codigo="a3"]') }));
  ok(r.zap.length === 1 && r.zap[0].para === '5511977770003' && r.zap[0].origem === 'conta',
    'contestar manda o código na hora, para o WhatsApp que a academia tinha antes — ' + JSON.stringify(r.zap.map(z => z.para)));
  ok(cartao.includes('Mandamos um código de 6 números para o WhatsApp da academia') && !cartao.includes('2222') && cartao.includes('pela conta do GuiaTennis no WhatsApp') && cartao.includes('Código mandado. Chega em instantes') && r.campo && r.outro,
    'o cartão diz que o código já foi, com a caixa para digitar e "Mandar outro código" — ' + cartao.replace(/\s+/g, ' ').slice(0, 200));
  await page.click('[data-outro-codigo="a3"]');
  await page.waitForTimeout(500);
  cartao = await texto(page, '#parceiros .pc-pedido');
  ok(cartao.includes('espere uma hora') && (await page.evaluate(() => window.__whatsapps.length)) === 1, 'outro código logo em seguida: pede para esperar uma hora');
  const codigo = await page.evaluate(() => window.__whatsapps[0].codigo);
  await page.fill('[data-pedido-codigo="a3"]', codigo);
  await page.click('[data-confirmar-codigo="a3"]');
  await page.waitForTimeout(700);
  r = await page.evaluate(() => ({
    vinc: window.__db.academia_vinculos.filter(v => v.academia_id === 'a3').map(v => v.user_id + ':' + v.papel).join(','),
    aviso: document.querySelector('#parceiros .conta-aviso')?.innerText || '',
  }));
  ok(r.vinc === 'u-a2:principal' && r.aviso.includes('Agora você administra a Tênis Terceira'), 'quem digita o código do WhatsApp vence a disputa — ' + r.vinc);
  await browser.close();

  // ---- sem o e-mail confirmado: o código espera ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/academias' }));
  await disputaPronta(page, { confirmado: false });
  await page.click('[data-contestar="a3"]');
  await page.waitForTimeout(500);
  cartao = await texto(page, '#parceiros .pc-pedido');
  ok(cartao.includes('Confirme o seu e-mail: confirmado, o código de 6 números vai na hora') && !(await page.$('[data-pedido-codigo="a3"]')) && !(await page.evaluate(() => (window.__whatsapps || []).length)),
    'sem o e-mail confirmado, o código espera a confirmação — ' + cartao.replace(/\s+/g, ' ').slice(0, 160));
  await browser.close();

  // ---- WhatsApp desligado: igual a antes ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/academias' }));
  await disputaPronta(page);
  await page.evaluate(() => { window.__whatsappLigado = false; });
  await page.click('[data-contestar="a3"]');
  await page.waitForTimeout(500);
  cartao = await texto(page, '#parceiros .pc-pedido');
  ok(cartao.includes('O GuiaTennis manda um código de 6 números') && cartao.includes('O GuiaTennis manda o código em breve') && !(await page.$('[data-outro-codigo="a3"]')),
    'WhatsApp desligado: o GuiaTennis manda, como antes — ' + cartao.replace(/\s+/g, ' ').slice(0, 160));
  await browser.close();

  // ---- banco antes do SQL: contestar continua funcionando ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/academias' }));
  await disputaPronta(page);
  await page.evaluate(() => { window.__semCodigoPeloWhatsapp = true; });
  await page.click('[data-contestar="a3"]');
  await page.waitForTimeout(500);
  cartao = await texto(page, '#parceiros .pc-pedido');
  ok(cartao.toLowerCase().includes('em disputa') && !(await page.$('#parceiros .pc-pedido .form-error')), 'banco sem o SQL novo: contestar continua, sem erro');
  await browser.close();

  // ---- admin: manda pelo WhatsApp do GuiaTennis e vê o que aconteceu ----
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(async () => {
    window.__whatsappLigado = true;
    const agora = new Date().toISOString();
    window.__db.academia_acessos.push(
      { user_id: 'u-tomou', academia_id: 'a1', usuario: 'tomou@exemplo.com', email: 'tomou@exemplo.com', nome_responsavel: 'Tito Tomou', papel: 'principal', dados_completos_em: agora },
      { user_id: 'u-dona', academia_id: null, usuario: 'dona@exemplo.com', email: 'dona@exemplo.com', nome_responsavel: 'Dona Certa', whatsapp: '11955554444', papel: 'principal', dados_completos_em: agora });
    window.__db.academia_vinculos.push({ user_id: 'u-tomou', academia_id: 'a1', papel: 'principal', created_at: agora, telefone_da_ficha: '11999990001' });
    window.__db.pedidos_de_acesso.push({ user_id: 'u-dona', academia_id: 'a1', nome: 'Só Aula Tennis', destino: 'disputa', pedido_em: agora, declarou_em: agora });
    await carregarAcessos(); await loadEverything(); irAdmin('pendencias');
  });
  await page.waitForTimeout(400);
  ok((await page.evaluate(() => document.body.innerText)).includes('Mandar código ao WhatsApp da academia'), 'admin: "Mandar código ao WhatsApp da academia"');
  await page.click('[data-mandar-codigo="u-dona"]');
  await page.waitForTimeout(500);
  let painel = await page.evaluate(() => document.body.innerText);
  r = await page.evaluate(() => ({ zap: window.__whatsapps || [], link: [...document.querySelectorAll('a')].some(a => (a.getAttribute('href') || '').includes('wa.me/5511999990001')) }));
  ok(r.zap.length === 1 && r.zap[0].origem === 'admin' && r.zap[0].para === '5511999990001' && !r.link,
    'com o WhatsApp ligado, o código sai sozinho (sem abrir o WhatsApp do Breno), para o número de antes');
  ok(painel.includes('Código mandado sozinho pelo WhatsApp do GuiaTennis') && painel.includes('por você') && painel.includes('Mandar outro código'),
    'o admin vê que o código saiu, e quem mandou');
  await page.evaluate(async () => { window.__whatsapps.push({ ...window.__whatsapps[0], criado_em: new Date().toISOString(), enviado_em: null, erro: '400 Template name does not exist' }); await carregarAcessos(); render(); });
  painel = await page.evaluate(() => document.body.innerText);
  ok(painel.includes('O WhatsApp não saiu (400 Template name does not exist)') && !!(await page.$('[data-gerar-codigo="u-dona"]')),
    'se o WhatsApp não sai, o admin vê o motivo e pode gerar o código para mandar do WhatsApp dele');
  await page.evaluate(async () => { irAdmin('emails'); await carregarSituacaoDosEmails(); });
  await page.waitForTimeout(300);
  painel = await page.evaluate(() => document.body.innerText);
  ok(painel.includes('Código da disputa pelo WhatsApp: ligado'), 'em E-mails, a situação do código pelo WhatsApp');
  await page.evaluate(async () => { window.__whatsappLigado = false; window.__whatsapps = []; await carregarSituacaoDosEmails(); });
  painel = await page.evaluate(() => document.body.innerText);
  ok(painel.includes('desligado — você gera o código e manda do seu WhatsApp') && painel.includes('WHATSAPP_TOKEN'), 'desligado: diz o que falta para ligar');
  await browser.close();

  // ---- textos ----
  ({ browser, page } = await abrir({ q: 'parceiros/ajuda' }));
  const ajuda = await page.evaluate(() => document.querySelector('#parceiros .pc-main')?.textContent || '');
  ok(ajuda.includes('vai na hora para o WhatsApp da academia, pela conta do GuiaTennis no WhatsApp') && ajuda.includes('toque em "Esqueceu a senha?": mandamos um código para o seu e-mail'),
    'Ajuda: o código da disputa vai na hora; "Esqueci a senha" pelo e-mail');
  await page.evaluate(() => { state.showPrivacy = true; render(); });
  const politica = await page.evaluate(() => document.body.innerText);
  ok(politica.includes('WhatsApp Business Platform, da Meta') && politica.includes('até 3 códigos em 3 dias'), 'Política: a Meta entrega o código, e o limite de pedidos');
  await browser.close();
})();
