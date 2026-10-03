// Tempo até agir: em cada visita, a primeira busca e o primeiro contato com
// uma academia levam os segundos desde a chegada ao site (e, no contato,
// quanto tempo a pessoa olhou a ficha). O painel do admin mostra a mediana
// e em que faixa de tempo as pessoas agiram.
const { abrir, ok } = require('./harness');

const eventos = (page, tipo) => page.evaluate((tipo) => window.__cliques.filter(c => c.tipo === tipo), tipo);

(async () => {
  // ---- visitante ----
  let { browser, page } = await abrir({});
  await page.waitForTimeout(1500);
  await page.fill('#cep-input', 'Pinheiros');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  let buscas = await eventos(page, 'busca');
  ok(buscas.length === 1 && buscas[0].segundos >= 2 && buscas[0].segundos <= 6, 'primeira busca leva os segundos desde a chegada — ' + buscas[0].segundos + ' s');
  ok(buscas[0].detalhe && buscas[0].dispositivo, 'e continua levando a região e o aparelho');
  await page.evaluate(() => { state.cep = 'Moema'; doSearch(); });
  await page.waitForTimeout(800);
  buscas = await eventos(page, 'busca');
  ok(buscas.length === 2 && buscas[1].segundos === undefined, 'a segunda busca da visita não leva tempo (só a primeira conta)');
  await page.evaluate(() => openCourt('a1'));
  await page.waitForTimeout(1300);
  await page.evaluate(() => trackClick('a1', 'whatsapp'));
  await page.waitForTimeout(300);
  let contatos = await eventos(page, 'whatsapp');
  ok(contatos.length === 1 && contatos[0].segundos >= 3 && contatos[0].segundos_ficha >= 1 && contatos[0].segundos_ficha < contatos[0].segundos, 'primeiro contato leva o tempo desde a chegada e o tempo olhando a ficha — ' + contatos[0].segundos + ' s / ficha ' + contatos[0].segundos_ficha + ' s');
  await page.evaluate(() => trackClick('a1', 'instagram'));
  await page.waitForTimeout(300);
  const ig = await eventos(page, 'instagram');
  ok(ig.length === 1 && ig[0].segundos === undefined && ig[0].segundos_ficha === undefined, 'o segundo contato da visita não leva tempo');
  const marcas = await page.evaluate(() => ({ acesso: window.__cliques.filter(c => c.tipo === 'acesso_site').map(c => c.segundos), ficha: window.__cliques.filter(c => c.tipo === 'visualizacao' && (c.segundos !== undefined || c.segundos_ficha !== undefined)).length }));
  ok(marcas.acesso.join() === '0' && marcas.ficha === 0, 'a chegada leva 0 (visita medida) e a ficha aberta não leva tempo');
  await browser.close();

  // Contato direto pelo cartão da busca, sem abrir a ficha: só o tempo desde a chegada.
  ({ browser, page } = await abrir({}));
  await page.waitForTimeout(1100);
  await page.evaluate(() => trackClick('a2', 'site'));
  await page.waitForTimeout(300);
  contatos = await eventos(page, 'site');
  ok(contatos[0].segundos >= 1 && contatos[0].segundos_ficha === undefined, 'contato sem abrir a ficha: só o tempo desde a chegada');
  await browser.close();

  // Banco ainda sem as colunas: a busca é gravada sem o tempo, com o resto.
  ({ browser, page } = await abrir({ semTempo: true }));
  await page.fill('#cep-input', 'Pinheiros');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  buscas = await eventos(page, 'busca');
  ok(buscas.length === 1 && buscas[0].segundos === undefined && buscas[0].detalhe && buscas[0].dispositivo, 'banco sem as colunas novas: grava a busca sem o tempo, com região e aparelho');
  await browser.close();

  // Admin não conta.
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(() => trackClick(null, 'busca', 'Teste'));
  ok((await eventos(page, 'busca')).length === 0, 'admin conectado não entra no tempo');
  await browser.close();

  // ---- painel do admin ----
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(async () => {
    const agora = Date.now();
    const quando = (min) => new Date(agora - min * 60000).toISOString();
    const c = window.__db.cliques;
    for (let i = 0; i < 10; i++) c.push({ id: 'v' + i, tipo: 'acesso_site', segundos: 0, created_at: quando(60 - i) });
    for (let i = 0; i < 5; i++) c.push({ id: 'velha' + i, tipo: 'acesso_site', created_at: quando(70 - i) });
    [5, 12, 20, 40, 300, 900].forEach((s, i) => c.push({ id: 'b' + i, tipo: 'busca', segundos: s, created_at: quando(50 - i) }));
    c.push({ id: 'b9', tipo: 'busca', created_at: quando(30) });
    [70, 130].forEach((s, i) => c.push({ id: 'w' + i, academia_id: 'a1', tipo: 'whatsapp', segundos: s, segundos_ficha: 30 + i * 20, created_at: quando(40 - i) }));
    await loadEverything();
    state.showStatsPanel = true;
    render();
  });
  const painel = await page.evaluate(() => document.getElementById('stats-overlay').innerText);
  ok(painel.includes('Tempo até agir') && /até a primeira busca/i.test(painel) && painel.includes('30 s'), 'mediana até a primeira busca (5, 12, 20, 40, 300, 900 s → 30 s)');
  ok(painel.includes('6 visitas · 60% buscaram'), 'quantas visitas buscaram, só entre as visitas medidas (as antigas não contam)');
  ok(/até chamar uma academia/i.test(painel) && painel.includes('1 min 40 s') && painel.includes('2 visitas · 20% chamaram'), 'mediana até chamar uma academia (70 e 130 s → 1 min 40 s)');
  ok(/olhando a ficha antes de chamar/i.test(painel) && painel.includes('40 s'), 'tempo olhando a ficha antes de chamar');
  const faixas = await page.evaluate(() => [...document.querySelectorAll('.tempo-faixas')][0].innerText.replace(/\s+/g, ' '));
  ok(faixas.includes('Até 10 s 1 17%') && faixas.includes('3 a 10 min 1 17%') && faixas.includes('Mais de 10 min 1 17%'), 'faixas de tempo com a quantidade e a porcentagem — ' + faixas);
  await browser.close();

  // Sem dados ainda: o painel explica.
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(() => { state.showStatsPanel = true; render(); });
  ok((await page.evaluate(() => document.getElementById('stats-overlay').innerText)).includes('Ainda sem dados nesse período'), 'sem dados: o painel explica o que vai aparecer');
  await browser.close();

  // Política de Privacidade.
  ({ browser, page } = await abrir({}));
  ok(await page.evaluate(() => PRIVACY_HTML.includes('Tempo até agir')), 'Política de Privacidade explica o tempo até agir');
  await browser.close();
})();
