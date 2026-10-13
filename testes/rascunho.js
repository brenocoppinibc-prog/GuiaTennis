// Pedidos do Breno em 13/10/2026:
// - "eu estava preenchendo um cadastro, a página recarregou e apagou tudo,
//   tire essa falha em todas abas": o que está sendo preenchido fica
//   guardado só na aba (sessionStorage), sem senha nem código, e volta ao
//   recarregar, na mesma tela;
// - "não quero que a tela de cadastro seja assim superficial, nem do email
//   para o cadastro e outras opções também, quero que fique nessa parte
//   fechada": no celular, as janelas ocupam a tela toda e a página de trás
//   não rola; o cadastro e o entrar do Parceiros ficam sem menu e sem rodapé.
const { abrir, ok, irParte } = require('./harness');

const FOTO = 'data:image/jpeg;base64,' + 'A'.repeat(4000);

(async () => {
  // ---- cadastro da ficha: recarregar no meio volta na mesma parte, com tudo ----
  let { browser, page } = await abrir({});
  await page.evaluate(() => {
    window.__form = { name: "", cep: "", address: "", numero: "", complemento: "", bairro: "", cidade: "", quadras: {}, amenities: [], modalidades: [], priceAula: "", priceLocacao: "", phone: "", instagram: "", site: "", photos: [], politica: {}, acesso: {}, horario: {} };
    state.showRegister = true; state.registerStatus = "idle"; render();
  });
  await page.waitForTimeout(200);
  await page.fill('#f-name', 'Academia Rascunho');
  await page.fill('#f-numero', '955');
  await page.evaluate((foto) => { window.__form.photos.push(foto); window.__form.amenities.push('vestiario'); }, FOTO);
  await irParte(page, 'precos');
  await page.waitForTimeout(400);
  const antes = await page.evaluate(() => location.search);
  await page.reload();
  await page.waitForTimeout(900);
  let t = await page.evaluate(() => ({
    aberto: !!document.getElementById('register-overlay'), link: location.search,
    parte: (REG_PASSOS[state.regPasso] || {}).id, f: window.__form && { name: window.__form.name, numero: window.__form.numero, fotos: window.__form.photos.length, foto: (window.__form.photos[0] || '').length, amen: window.__form.amenities },
  }));
  ok(antes.includes('parte=precos') && t.aberto && t.parte === 'precos' && t.link.includes('parte=precos'),
    'recarregou no meio do cadastro: a janela volta aberta, na mesma parte — ' + JSON.stringify({ antes, link: t.link, parte: t.parte }));
  ok(t.f && t.f.name === 'Academia Rascunho' && t.f.numero === '955' && t.f.fotos === 1 && t.f.foto === FOTO.length && t.f.amen.includes('vestiario'),
    'com o que foi digitado, as fotos e as escolhas — ' + JSON.stringify(t.f));
  await irParte(page, 'dados');
  ok(await page.evaluate(() => document.getElementById('f-name').value === 'Academia Rascunho'), 'voltando à primeira parte, o nome está no campo');
  // No celular, a janela ocupa a tela toda e a página de trás não rola.
  t = await page.evaluate(() => {
    const o = document.getElementById('register-overlay').getBoundingClientRect(), sheet = document.querySelector('#register-overlay .sheet').getBoundingClientRect();
    return { trava: document.documentElement.classList.contains('com-janela'), overflow: getComputedStyle(document.documentElement).overflow, sheet: [sheet.top, sheet.height], tela: innerHeight };
  });
  ok(t.trava && t.overflow === 'hidden' && t.sheet[0] === 0 && t.sheet[1] === t.tela, 'com a janela aberta, ela ocupa a tela toda e a página de trás não rola — ' + JSON.stringify(t));
  // Fechou a aba: some (o sessionStorage é da aba); sair da conta também apaga.
  await page.click('#register-close');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => !document.documentElement.classList.contains('com-janela')), 'fechou a janela: a página volta a rolar');
  await browser.close();

  // ---- senha e código nunca vão para o rascunho ----
  ({ browser, page } = await abrir({}));
  await page.evaluate(() => { window.__jog = { email: 'ana@exemplo.com', nome: 'Ana', senha: 'segredo123', senha2: 'segredo123' }; window.__pcConta = { nome: 'Rui', senha: 'outrasenha1' }; window.__codigo = { codigo: '123456', senha: 'x' }; render(); });
  await page.waitForTimeout(300);
  const guardado = await page.evaluate(() => sessionStorage.getItem('guiatennis_rascunho_v1') || '');
  ok(guardado.includes('ana@exemplo.com') && guardado.includes('"Rui"') && !guardado.includes('segredo123') && !guardado.includes('outrasenha1') && !guardado.includes('123456'),
    'o rascunho guarda o que foi digitado, sem senha nem código');
  await browser.close();

  // ---- criar conta do jogador: recarregar no "Seus dados" volta lá, com o nome ----
  ({ browser, page } = await abrir({ w: 390 }));
  await page.evaluate(() => abrirContaJogador('entrar'));
  await page.waitForTimeout(200);
  t = await page.evaluate(() => {
    const s = document.querySelector('#jogador-overlay .sheet').getBoundingClientRect();
    return { top: s.top, h: s.height, tela: innerHeight, fundo: getComputedStyle(document.getElementById('jogador-overlay')).backgroundColor };
  });
  ok(t.top === 0 && t.h === t.tela && /^rgb\(/.test(t.fundo), '"Entre ou crie a sua conta" ocupa a tela toda, sem o site atrás — ' + JSON.stringify(t));
  // Uma tela própria, como a do Parceiros: a marca e o ✕, a trilha, o título e o formulário num cartão.
  t = await page.evaluate(() => ({ marca: !!document.querySelector('#jogador-overlay .pc-topo .pc-marca'), fechar: !!document.querySelector('#jogador-overlay #jogador-close.pc-fechar'), h1: document.querySelector('#jogador-overlay h1')?.innerText, cartao: !!document.querySelector('#jogador-overlay .pc-card #jog-email') }));
  ok(t.marca && t.fechar && t.h1 === 'Entre ou crie a sua conta' && t.cartao, 'o Entrar é uma tela como a do Parceiros: marca e ✕, título e o e-mail num cartão — ' + JSON.stringify(t));
  // Conta que já existe: o e-mail num cartão com "Trocar" e o quadro "Você já tem conta".
  await page.evaluate(() => { window.__db.jogadores.push({ user_id: 'j-ze', nome: 'Zé', email: 'ze@exemplo.com' }); window.__senhas['ze@exemplo.com'] = 'senhadoze1'; });
  await page.fill('#jog-email', 'ze@exemplo.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(400);
  t = await page.evaluate(() => ({ email: document.getElementById('jog-email-escolhido')?.innerText, trocar: document.getElementById('jog-trocar-email')?.innerText, aviso: document.querySelector('#jogador-overlay .pc-aviso-conta')?.innerText.replace(/\s+/g, ' ') }));
  ok(t.email === 'ze@exemplo.com' && t.trocar === 'Trocar' && t.aviso === 'Você já tem conta no GuiaTennis Digite a sua senha para entrar.',
    'no passo da senha, o e-mail num cartão com "Trocar" e o quadro da conta achada, como no Parceiros — ' + JSON.stringify(t));
  await page.click('#jog-trocar-email');
  await page.waitForTimeout(250);
  await page.fill('#jog-email', 'nova@exemplo.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(400);
  await page.fill('#jog-nome', 'Nova Jogadora');
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForTimeout(900);
  t = await page.evaluate(() => ({ tela: state.jogadorTela, nome: document.getElementById('jog-nome')?.value, link: location.search }));
  ok(t.tela === 'criar' && t.nome === 'Nova Jogadora', 'recarregou no criar conta: volta no mesmo passo, com o nome — ' + JSON.stringify(t));
  await browser.close();

  // ---- Parceiros: cadastro sem menu e sem rodapé, e o rascunho dos dados de contato ----
  ({ browser, page } = await abrir({ w: 390, q: 'parceiros/cadastro' }));
  t = await page.evaluate(() => ({ focado: !!document.querySelector('.pc-focado'), menu: !!document.getElementById('pc-menu-btn'), rodape: !!document.querySelector('.pc-rodape'), fechar: document.querySelector('.pc-fechar')?.getAttribute('href') }));
  ok(t.focado && !t.menu && !t.rodape && t.fechar === '/parceiros', 'cadastro do Parceiros: só a marca e o ✕, sem menu e sem rodapé — ' + JSON.stringify(t));
  await page.fill('#pc-email', 'dono@academianova.com.br');
  await page.click('#pc-email-continuar');
  await page.waitForTimeout(400);
  const noDados = await page.evaluate(() => state.pcEmailPasso);
  await page.evaluate(() => { const c = document.querySelector('[data-campo="cargo"]'); if (c) { c.value = 'Gerente'; c.dispatchEvent(new Event('input', { bubbles: true })); c.dispatchEvent(new Event('change', { bubbles: true })); } const n = document.querySelector('[data-campo="nome"]'); if (n) { n.value = 'Rui'; n.dispatchEvent(new Event('input', { bubbles: true })); } });
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForTimeout(900);
  t = await page.evaluate(() => ({ passo: state.pcEmailPasso, email: state.pcEmail, nome: document.querySelector('[data-campo="nome"]')?.value, cargo: document.querySelector('[data-campo="cargo"]')?.value }));
  ok(noDados === 'criar' && t.passo === 'criar' && t.email === 'dono@academianova.com.br' && t.nome === 'Rui' && t.cargo === 'Gerente',
    'recarregou nos dados de contato do Parceiros: volta lá, com o e-mail, o nome e o cargo — ' + JSON.stringify(t));
  await page.click('.pc-fechar');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.parceirosAba === 'inicio' && !!document.querySelector('.pc-rodape') && !!document.getElementById('pc-menu-btn')), 'o ✕ volta para o início do Parceiros, com menu e rodapé');
  await browser.close();

  // ---- outras janelas (preferências) também em tela cheia; no computador, continuam no meio ----
  ({ browser, page } = await abrir({ w: 390 }));
  await page.evaluate(() => { state.showPrefs = true; window.__pref = { uf: '', cidade: '', modalidade: '' }; render(); });
  await page.waitForTimeout(200);
  t = await page.evaluate(() => { const s = document.querySelector('#pref-overlay .sheet').getBoundingClientRect(); return { top: s.top, h: s.height, tela: innerHeight }; });
  ok(t.top === 0 && t.h === t.tela, 'Preferências de busca também ocupa a tela toda no celular');
  await browser.close();
  ({ browser, page } = await abrir({ w: 1200 }));
  await page.evaluate(() => abrirContaJogador('entrar'));
  await page.waitForTimeout(200);
  t = await page.evaluate(() => {
    const s = document.querySelector('#jogador-overlay .sheet').getBoundingClientRect(), col = document.querySelector('#jogador-overlay .pc-pagina').getBoundingClientRect();
    return { w: s.width, tela: innerWidth, col: col.width, trava: document.documentElement.classList.contains('com-janela') };
  });
  ok(t.w === t.tela && t.col <= 540 && t.trava, 'no computador, o Entrar também é uma tela própria, com o formulário numa coluna no meio — ' + JSON.stringify(t));
  await page.evaluate(() => { state.jogadorTela = null; state.showPrefs = true; window.__pref = { uf: '', cidade: '', modalidade: '' }; render(); });
  await page.waitForTimeout(200);
  t = await page.evaluate(() => ({ w: document.querySelector('#pref-overlay .sheet').getBoundingClientRect().width, trava: document.documentElement.classList.contains('com-janela') }));
  ok(t.w <= 480 && t.trava, 'as outras janelas, no computador, continuam no meio, com a página de trás parada — ' + JSON.stringify(t));
  await browser.close();
})();
