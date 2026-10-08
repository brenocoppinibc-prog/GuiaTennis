// No celular, só as vistas recentemente; o resto na conta (pedido do Breno
// em 08/10/2026: "eu quero que somente as vistas recentes fiquem salvas no
// celular, de resto tudo pela conta"). Como no Airbnb: a lista de favoritos
// é da conta e aparece em qualquer aparelho; sem conta, o coração pede para
// entrar.
const { abrir, ok } = require('./harness');

const chavesDoCelular = (page) => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('guiatennis_')).sort());
const anaNoBanco = (page, guardados) => page.evaluate((g) => {
  window.__senhas['ana@exemplo.com'] = 'senhadaana';
  window.__db.jogadores.push({ user_id: 'j-ana', nome: 'Ana Jogadora', email: 'ana@exemplo.com', token_avisos: 't', ...(g ? { guardados: g } : {}) });
}, guardados);
async function entrar(page) {
  await page.evaluate(() => abrirContaJogador('entrar'));
  await page.fill('#jog-email', 'ana@exemplo.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(300);
  await page.fill('#jog-senha', 'senhadaana');
  await page.click('#jog-entrar');
  await page.waitForTimeout(1200);
}

(async () => {
  // ---- sem conta: no celular, só as vistas e a última busca ----
  let { browser, page } = await abrir();
  await page.evaluate(async () => { state.cep = 'Pinheiros'; await doSearch(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { openCourt('a1'); trackClick('a1', 'whatsapp'); toggleCompare('a1'); toggleCompare('a2'); goHome(); });
  await page.waitForTimeout(300);
  let k = await chavesDoCelular(page);
  ok(k.includes('guiatennis_recentes_v1') && k.includes('guiatennis_ultima_busca_v1'), 'as vistas recentemente e a última busca ficam no celular');
  ok(!k.some(x => /favorites|chamadas|viagens|preferencias|avaliadas|pedir_avaliacao|compare/.test(x)), 'favoritas, chamadas, viagens, preferências, avaliações e comparação não ficam no celular — ' + k.join(' '));
  ok(await page.evaluate(() => lerChamadas().length === 0 && !document.getElementById('home-chamadas')), 'sem conta, a academia chamada não fica guardada');
  await page.evaluate(() => { state.lista = 'favoritas'; render(); });
  let t = await page.evaluate(() => ({ txt: document.querySelector('#lista-overlay .lista-vazia')?.innerText || '', botao: document.querySelector('#lista-overlay .lista-entrar')?.innerText || '' }));
  ok(t.txt.length > 0 && t.botao === 'Entrar ou criar conta', 'Minhas quadras sem conta: as favoritas convidam a entrar');
  await page.click('#lista-overlay .lista-entrar');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => state.jogadorTela === 'email' && !state.lista), '"Entrar ou criar conta" fecha a lista e abre o Entrar');
  await page.evaluate(() => { state.jogadorTela = null; render(); });
  // O coração sem conta: entra e já favorita.
  await anaNoBanco(page);
  await page.evaluate(() => toggleFavorite('a2'));
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => state.jogadorTela === 'email' && /favoritas/.test(state.jogadorMotivo) && !isFavorite('a2')), 'sem conta, o coração pede para entrar');
  await page.fill('#jog-email', 'ana@exemplo.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(300);
  await page.fill('#jog-senha', 'senhadaana');
  await page.click('#jog-entrar');
  await page.waitForTimeout(1200);
  t = await page.evaluate(() => ({ fav: isFavorite('a2'), conta: window.__db.jogadores.find(j => j.user_id === 'j-ana').guardados || {} }));
  ok(t.fav && (t.conta.favoritas || []).join() === 'a2', 'entrando, a academia já fica favoritada, na conta');
  ok(!(await chavesDoCelular(page)).some(x => /favorites/.test(x)), 'e nada de favoritas no celular');
  // Sair: a tela não mostra mais as favoritas da conta.
  await page.evaluate(async () => { await sairDaContaJogador(); });
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => !jogador && loadFavorites().length === 0 && !isFavorite('a2')), 'saiu da conta: as favoritas saem da tela (continuam na conta)');
  await browser.close();

  // ---- o que estava no celular (antes de 08/10/2026) vai para a conta ----
  ({ browser, page } = await abrir());
  await anaNoBanco(page, { favoritas: ['a1'], preferencias: { uf: 'SP', cidade: 'São Paulo' } });
  await page.evaluate(() => {
    localStorage.setItem('guiatennis_favorites_v1', JSON.stringify(['a2', 'a1']));
    localStorage.setItem('guiatennis_chamadas_v1', JSON.stringify([{ id: 'a2', tipo: 'site', em: Date.now() }]));
    localStorage.setItem('guiatennis_preferencias_v1', JSON.stringify({ uf: 'CE', cidade: 'Fortaleza' }));
    localStorage.setItem('guiatennis_viagens_v1', JSON.stringify([{ id: 7, uf: 'RJ', cidade: 'Niterói', ida: '', volta: '' }]));
    localStorage.setItem('guiatennis_avaliadas_v1', JSON.stringify(['a1']));
  });
  await entrar(page);
  t = await page.evaluate(() => ({ g: window.__db.jogadores.find(j => j.user_id === 'j-ana').guardados, fav: loadFavorites() }));
  ok(t.g.favoritas.join() === 'a1,a2' && t.fav.join() === 'a1,a2', 'favoritas do celular juntam com as da conta, sem repetir — ' + t.g.favoritas.join());
  ok(t.g.chamadas.length === 1 && t.g.viagens[0].cidade === 'Niterói' && t.g.avaliadas.join() === 'a1', 'chamadas, viagens e avaliações do celular vão para a conta');
  ok(t.g.preferencias.cidade === 'São Paulo', 'a conta já tinha preferências: valem as da conta');
  k = await chavesDoCelular(page);
  ok(!k.some(x => /favorites|chamadas|viagens|preferencias|avaliadas/.test(x)), 'depois de levar, saem do celular — ' + k.join(' '));
  await browser.close();

  // ---- banco não aceitou: fica no celular para tentar na próxima vez ----
  ({ browser, page } = await abrir());
  await anaNoBanco(page);
  await page.evaluate(() => { window.__semGuardados = true; localStorage.setItem('guiatennis_favorites_v1', JSON.stringify(['a2'])); });
  await entrar(page);
  ok(await page.evaluate(() => !!jogador && localStorage.getItem('guiatennis_favorites_v1') === '["a2"]'), 'se o banco não aceitar, as antigas continuam no celular até dar certo');
  await browser.close();

  // ---- outro aparelho: o que está na conta aparece ----
  ({ browser, page } = await abrir());
  await anaNoBanco(page, { favoritas: ['a2'], chamadas: [{ id: 'a1', tipo: 'whatsapp', em: Date.now() - 36e5 }] });
  await entrar(page);
  await page.evaluate(() => { state.lista = 'favoritas'; render(); });
  t = await page.evaluate(() => ({ fav: [...document.querySelectorAll('#lista-overlay .lista-linha strong')].map(e => e.textContent).join(), chamadas: lerChamadas().map(x => x.id).join() }));
  ok(t.fav === 'Quadra Locação' && t.chamadas === 'a1', 'em outro aparelho, as favoritas e as chamadas da conta aparecem — ' + t.fav);
  await browser.close();
})();
