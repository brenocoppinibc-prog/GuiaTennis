// O plano aparece ao finalizar (pedido do Breno em 03/10/2026): a academia
// preenche o cadastro do jeito dela, sem trava; ao enviar, vê o que o plano
// esconde da ficha, o que falta para vender mais e escolhe o plano — como o
// "Quase lá" do Booking e o upgrade do Google Business Profile. O pedido de
// plano pago fica anotado para o GuiaTennis; no painel, a academia no Básico
// vê o que está escondido; o admin vê quem quer mudar de plano.
const { abrir, ok, irParte } = require('./harness');

const texto = (page, sel) => page.evaluate((sel) => (document.querySelector(sel)?.innerText || '').replace(/\s+/g, ' '), sel);

(async () => {
  // ---- conta de parceiro cadastra academia nova, com 5 comodidades ----
  let { browser, page } = await abrir({ q: 'parceiros/cadastro' });
  await page.evaluate(async () => {
    window.__db.academia_acessos.push({ user_id: 'u-rui', academia_id: null, usuario: 'rui@exemplo.com', nome_responsavel: 'Rui Dono', email: 'rui@exemplo.com', whatsapp: '11988881111', papel: 'principal', dados_completos_em: '2026-10-01', senha_trocada_em: '2026-10-01', termos_aceitos_em: '2026-10-01' });
    window.__senhas['rui@exemplo.com'] = 'senhaforte1';
    await sb.auth.signInWithPassword({ email: 'rui@exemplo.com', password: 'senhaforte1' });
    await recarregarConta(); render();
  });
  await page.click('#pc-nova');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    Object.assign(window.__form, { name: 'Academia do Rui', address: 'Rua Rui', numero: '5', bairro: 'Lapa', cidade: 'São Paulo', phone: '11977771111', modalidades: ['aulas_proprias'], quadras: { saibro_coberta: 1 } });
    render();
  });
  await irParte(page, 'quadras');
  for (const k of ['wifi', 'vestiario', 'loja', 'agua', 'camera']) await page.click(`.reg-amenity[data-amenity="${k}"]`);
  const marcadas = await page.evaluate(() => ({ n: window.__form.amenities.length, travadas: document.querySelectorAll('.reg-amenity:disabled').length, erro: document.querySelector('#register-overlay .form-error')?.innerText || '' }));
  ok(marcadas.n === 5 && marcadas.travadas === 0 && !marcadas.erro, 'marca 5 comodidades sem trava e sem interromper — ' + JSON.stringify(marcadas));
  await irParte(page, 'contato');
  await page.fill('#f-instagram', '@academiadorui');
  ok(await page.evaluate(() => window.__form.instagram === '@academiadorui' || document.getElementById('f-instagram').value === '@academiadorui'), 'Instagram aberto no cadastro');
  await irParte(page, 'revisar');
  await page.click('#register-submit');
  await page.waitForTimeout(300);
  const tela = await texto(page, '#register-overlay');
  ok(tela.includes('Quase lá: escolha o plano') && !(await page.evaluate(() => window.__db.academias.some(a => a.name === 'Academia do Rui'))), 'ao finalizar, a tela do plano vem antes de enviar');
  ok(tela.includes('2 das 5 comodidades') && tela.includes('A ficha mostra só 3') && tela.includes('Instagram'), 'mostra o que o Básico esconde: 2 comodidades e o Instagram');
  ok(tela.includes('Nada se perde'), 'avisa que nada se perde: fica guardado');
  ok(tela.includes('Pôr fotos') && tela.includes('Dizer o preço') && tela.includes('Pôr o horário'), 'mostra o que falta para a ficha receber mais jogadores');
  const ordem = await page.evaluate(() => [...document.querySelectorAll('[data-reg-plano]')].map(b => b.dataset.regPlano + (b.closest('.destaque') ? '*' : '')).join(','));
  ok(ordem === 'premium*,completo,basico', 'Premium primeiro e em destaque, depois Completo, e o Básico por último — ' + ordem);
  ok((await texto(page, '.reg-plano-basico')).includes('Continuar no Básico, grátis (a ficha esconde 2 itens)'), 'continuar no Básico diz quanto fica escondido');
  ok(tela.includes('nada é cobrado sem você confirmar'), 'deixa claro que nada é cobrado sozinho');

  // "Pôr fotos" leva até a parte, e voltar a enviar mostra a tela de novo.
  await page.click('[data-reg-plano-passo]');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.querySelector('#register-overlay .reg-passo')?.dataset.passo === 'fotos'), 'um toque em "Pôr fotos" leva até a parte das fotos');
  await irParte(page, 'revisar');
  await page.click('#register-submit');
  await page.waitForTimeout(300);
  await page.click('[data-reg-plano="premium"]');
  await page.waitForTimeout(900);
  const fim = await page.evaluate(() => ({
    academia: window.__db.academias.find(a => a.name === 'Academia do Rui'),
    pedido: window.__db.pedidos_de_plano.map(p => p.plano + ':' + p.onde + ':' + p.user_id).join(),
    texto: document.querySelector('#register-overlay')?.innerText || '',
    wa: decodeURIComponent(document.querySelector('.reg-plano-ok a')?.getAttribute('href') || ''),
  }));
  ok(fim.academia && fim.academia.amenities.length === 5 && fim.academia.instagram === '@academiadorui' && (fim.academia.plano || 'basico') === 'basico', 'a academia vai inteira (5 comodidades e Instagram), ainda no Básico');
  ok(fim.pedido === 'premium:cadastro:u-rui', 'o pedido do Premium fica anotado — ' + fim.pedido);
  ok(fim.texto.includes('Você escolheu o plano Premium') && fim.wa.includes('plano Premium') && fim.wa.includes('Academia do Rui'), 'a tela final leva ao WhatsApp para combinar o Premium da Academia do Rui');
  await browser.close();

  // ---- admin publica sem a tela do plano ----
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(() => { window.__form = null; state.showRegister = true; state.registerStatus = 'idle'; render(); });
  await page.fill('#f-name', 'Do Admin');
  await page.click('#register-submit');
  await page.waitForTimeout(600);
  ok(!(await texto(page, '#register-overlay')).includes('escolha o plano') && await page.evaluate(() => window.__db.academias.some(a => a.name === 'Do Admin')), 'admin publica direto, sem a tela do plano');

  // ---- admin vê quem quer mudar de plano ----
  await page.evaluate(async () => {
    window.__db.academia_acessos.push({ user_id: 'u-lia', academia_id: 'a2', usuario: 'lia@exemplo.com', nome_responsavel: 'Lia Dona', email: 'lia@exemplo.com', whatsapp: '11988882222', papel: 'principal' });
    window.__db.pedidos_de_plano.push({ academia_id: 'a2', plano: 'premium', user_id: 'u-lia', onde: 'painel', created_at: '2026-10-03T12:00:00Z' });
    state.showRegister = false; await carregarAcessos(); state.showAdminPanel = true; render();
  });
  const adm = await texto(page, '#admin-overlay');
  ok(adm.includes('Querem mudar de plano') && adm.includes('Quadra Locação · quer o Premium') && adm.includes('Hoje no Básico') && adm.includes('no painel') && adm.includes('Lia Dona'), 'admin vê a academia, o plano pedido, onde pediu e quem');
  await page.click('[data-plano-pedido="a2"]');
  await page.waitForTimeout(500);
  const depois = await page.evaluate(() => ({ plano: window.__db.academias.find(a => a.id === 'a2').plano, lista: window.__db.pedidos_de_plano.length, tela: document.querySelector('#admin-overlay')?.innerText || '' }));
  ok(depois.plano === 'premium' && depois.lista === 0 && !depois.tela.includes('Querem mudar de plano'), 'mudar o plano atende o pedido e tira da lista');
  await browser.close();

  // ---- painel da academia no Básico: o que está escondido ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel' }));
  const painel = await texto(page, '.pc-escondida');
  ok(painel.toLowerCase().includes('o que os jogadores não veem') && painel.includes('esconde 2 coisas') && painel.includes('A regra de cancelamento') && painel.includes('Como chegar'), 'painel mostra o que o Básico esconde da ficha publicada — ' + painel.slice(0, 120));
  ok(await page.isVisible('.pc-escondida [data-pedir-plano="premium"]') && await page.isVisible('.pc-escondida [data-pedir-plano="completo"]'), 'com o Premium primeiro e o Completo ao lado');
  await page.evaluate(() => { window.open = () => null; });
  await page.click('.pc-escondida [data-pedir-plano="premium"]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__db.pedidos_de_plano.some(p => p.academia_id === 'a1' && p.plano === 'premium' && p.onde === 'painel')), '"Quero o Premium" no painel fica anotado para o GuiaTennis');
  await browser.close();

  // ---- edição sem nada escondido: salva direto ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/ficha', plano: 'premium' }));
  await page.evaluate(() => { window.__db.academias.find(a => a.id === 'a2').plano = 'premium'; });
  await page.evaluate(async () => { await loadEverything(); render(); });
  await page.click('#parceiros .editar-academia');
  await page.waitForTimeout(300);
  await page.click('#register-submit');
  await page.waitForTimeout(800);
  ok((await texto(page, '#register-overlay')).includes('Já estão na ficha'), 'no Premium, editar salva direto, sem a tela do plano');
  await browser.close();
})();
