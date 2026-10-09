// Lembrete de conferir a ficha (pedido do Breno em 09/10/2026: "academias
// devem receber mensagem de atualização do cadastro depois de 3 meses sem
// alterações"). O e-mail sai do banco (SQL 20261009130000, conferido no
// banco-emails.py); aqui, o botão "Conferir a ficha" do e-mail
// (/parceiros/ficha?abrir=<academia>) abre a academia certa quando a conta
// tem várias, e os textos que falam dos avisos.
const { abrir, ok } = require('./harness');

const rpcs = (page, nome) => page.evaluate((nome) => window.__rpcs.filter(r => r.nome === nome).map(r => r.args), nome);
const estado = (page) => page.evaluate(() => ({
  aberta: (minhaAcademia() || {}).id, aba: state.parceirosAba, link: location.pathname + location.search, pcAbrir: state.pcAbrir,
}));

(async () => {
  // ---- a conta tem duas academias; o e-mail é da que não está aberta ----
  let { browser, page } = await abrir({ academia: 'a2', outrasAcademias: ['a1'], q: 'parceiros/ficha?abrir=a1&utm_source=Email-ficha', w: 1280 });
  let e = await estado(page);
  ok(e.aberta === 'a1' && e.aba === 'ficha', 'o link do e-mail abre a ficha da academia do e-mail — ' + JSON.stringify(e));
  ok((await rpcs(page, 'abrir_minha_academia')).some(a => a.p_academia === 'a1'), 'a troca fica gravada no banco (abrir_minha_academia)');
  await browser.close();

  // ---- a academia do e-mail já é a aberta: nada a trocar ----
  ({ browser, page } = await abrir({ academia: 'a2', outrasAcademias: ['a1'], q: 'parceiros/ficha?abrir=a2', w: 1280 }));
  e = await estado(page);
  ok(e.aberta === 'a2' && e.aba === 'ficha' && (await rpcs(page, 'abrir_minha_academia')).length === 0, 'academia já aberta: abre a ficha sem trocar');
  await browser.close();

  // ---- academia que não é da conta: fica na que estava ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/ficha?abrir=a1', w: 1280 }));
  e = await estado(page);
  ok(e.aberta === 'a2' && (await rpcs(page, 'abrir_minha_academia')).length === 0, 'academia de outra conta: não troca nada');
  await browser.close();

  // ---- sem estar logado: entra primeiro e guarda a academia para depois ----
  ({ browser, page } = await abrir({ q: 'parceiros/ficha?abrir=a1', w: 1280 }));
  e = await estado(page);
  ok(e.aba === 'entrar' && e.pcAbrir === 'a1', 'sem login, vai para Entrar e guarda a academia do e-mail — ' + JSON.stringify(e));
  ok(await page.evaluate(() => state.parceirosDepois === 'ficha'), 'depois de entrar, vai para a ficha');

  // ---- textos: Ajuda, folha "Não quero mais receber" e Privacidade ----
  await page.goto('http://guia.test/parceiros/ajuda');
  await page.waitForTimeout(600);
  const ajuda = await page.evaluate(() => document.body.textContent.replace(/\s+/g, ' '));
  ok(ajuda.includes('Quando a ficha passa 3 meses sem mudar, o GuiaTennis manda um e-mail para vocês conferirem.'), 'a Ajuda diz que o e-mail chega depois de 3 meses sem mudar');
  const textos = await page.evaluate(() => ({
    parar: document.documentElement.innerHTML.includes('os avisos de avaliação nova, de pedidos de acesso, o lembrete de conferir a ficha e o resumo do mês do GuiaTennis Parceiros'),
    privacidade: document.documentElement.innerHTML.includes('pedido aceito, quando a ficha passa 3 meses sem mudar, o lembrete de conferir a ficha'),
  }));
  ok(textos.parar, 'a folha "Não quero mais receber" cita o lembrete');
  ok(textos.privacidade, 'a Política de Privacidade cita o lembrete');
  await browser.close();

  console.log('\nlembrete-da-ficha.js: fim');
})();
