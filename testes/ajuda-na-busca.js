// Pedido do Breno em 30/10/2026 (regra 181): "se a buscar for feita 5 vezes
// pelo mesmo ip e não abrir nenhuma ficha e nem navegar no site, de um push de
// 'está precisando de ajuda para encontrar as quadras mais perto?' e indique
// para o melhor caminho". Conta na aba, nunca pelo IP; o melhor caminho é a
// localização do celular, com o chat de ajuda como a outra saída.
const { abrir, ok } = require('./harness');

// Como o botão de buscar: a busca e a página de resultados.
const buscar = (page, termo) => page.evaluate(async (termo) => { state.cep = termo; await doSearch(); if (state.page !== 'search') goSearch(); }, termo);
const push = (page) => page.evaluate(() => document.getElementById('push-ajuda-busca')?.innerText.replace(/\s+/g, ' ').trim() || '');

(async () => {
  // ---- cinco buscas seguidas, sem abrir nada ----
  let { browser, page } = await abrir({});
  await page.waitForTimeout(300);
  for (let i = 0; i < 4; i++) await buscar(page, i % 2 ? 'Pinheiros, São Paulo' : 'Moema, São Paulo');
  await page.waitForTimeout(200);
  ok(!(await push(page)), 'quatro buscas seguidas: ainda sem o aviso');
  await buscar(page, 'Vila Mariana, São Paulo');
  await page.waitForTimeout(200);
  const t = await push(page);
  ok(t.startsWith('Está precisando de ajuda para encontrar as quadras mais perto?') && t.includes('Use a localização do celular: a lista começa pela quadra mais perto de você.'),
    'na quinta busca seguida, o aviso pergunta se precisa de ajuda e indica o melhor caminho — ' + t);
  ok((await page.evaluate(() => document.getElementById('push-ajuda-local')?.innerText)) === 'Usar minha localização' && (await page.evaluate(() => document.getElementById('push-ajuda-chat')?.innerText)) === 'Falar com o chat de ajuda',
    'os caminhos: a localização do celular e o chat de ajuda');
  const guardado = await page.evaluate(() => ({ local: Object.keys(localStorage).filter(k => k.includes('ajuda_busca')), sessao: sessionStorage.getItem('guiatennis_ajuda_busca_v1') }));
  ok(!guardado.local.length && /"buscas":5/.test(guardado.sessao || ''), 'a conta fica só nesta aba, sem IP — ' + JSON.stringify(guardado));
  await page.evaluate(() => { navigator.geolocation.getCurrentPosition = (ok) => ok({ coords: { latitude: -23.561, longitude: -46.687 } }); window.__usouLocal = 0; const antes = useMyLocation; window.useMyLocation = () => { window.__usouLocal++; antes(); }; });
  await page.click('#push-ajuda-local');
  await page.waitForTimeout(500);
  ok(!(await push(page)) && await page.evaluate(() => state.sortBy) === 'distance' && await page.evaluate(() => state.searchStatus) === 'done', '"Usar minha localização" busca pela localização, da mais perto para a mais longe, e o aviso some');
  for (let i = 0; i < 6; i++) await buscar(page, 'Moema, São Paulo');
  await page.waitForTimeout(200);
  ok(!(await push(page)), 'usado, o aviso não volta nesta aba');
  await browser.close();

  // ---- abrir uma ficha recomeça a conta ----
  ({ browser, page } = await abrir({}));
  await page.waitForTimeout(300);
  for (let i = 0; i < 3; i++) await buscar(page, 'Moema, São Paulo');
  await page.evaluate(() => openCourt('a1'));
  await page.waitForTimeout(300);
  for (let i = 0; i < 2; i++) await buscar(page, 'Pinheiros, São Paulo');
  await page.waitForTimeout(200);
  ok(!(await push(page)), 'abriu uma ficha no meio: a conta recomeça (3 + 2 não dão aviso)');
  for (let i = 0; i < 3; i++) await buscar(page, 'Pinheiros, São Paulo');
  await page.waitForTimeout(200);
  ok(!!(await push(page)), 'cinco seguidas depois da ficha: aí sim, o aviso');
  await page.click('#push-ajuda-chat');
  await page.waitForTimeout(300);
  ok(!(await push(page)) && await page.evaluate(() => !!(state.chat && state.chat.aberto)), '"Falar com o chat de ajuda" abre o chat');
  await browser.close();

  // ---- fechar no ✕ ----
  ({ browser, page } = await abrir({}));
  await page.waitForTimeout(300);
  for (let i = 0; i < 5; i++) await buscar(page, 'Moema, São Paulo');
  await page.waitForTimeout(200);
  await page.click('#push-ajuda-x');
  await page.waitForTimeout(200);
  for (let i = 0; i < 5; i++) await buscar(page, 'Moema, São Paulo');
  await page.waitForTimeout(200);
  ok(!(await push(page)), 'fechado no ✕, não volta nesta aba');
  await browser.close();

  // ---- o admin não vê ----
  ({ browser, page } = await abrir({ admin: true }));
  await page.waitForTimeout(300);
  for (let i = 0; i < 5; i++) await buscar(page, 'Moema, São Paulo');
  await page.waitForTimeout(200);
  ok(!(await push(page)), 'o admin não recebe o aviso');
  const priv = await page.evaluate(() => PRIVACY_HTML);
  ok(priv.includes('quantas buscas seguidas você fez sem abrir uma academia') && priv.includes('Nada disso usa o seu IP.'), 'a Privacidade diz o que fica na aba, sem IP');
  await browser.close();
})();
