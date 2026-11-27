// Regra 280 (15/11/2026): "por que as academias recomendadas saíram? vamos perder
// isso para o Premium"; "clicando no bairro, fazendo que vá direto para as
// academias que estão com essa localização e não procurar"; "faça que o mapa de
// procurar as coisas por perto funcione melhor".
const { abrir, ok } = require('./harness');

(async () => {
  let { browser, page } = await abrir();
  const pedidos = [];
  page.on('request', r => { if (/nominatim/.test(r.url())) pedidos.push(r.url()); });
  await page.waitForTimeout(700);

  let r = await page.evaluate(() => [...document.querySelectorAll('.home-sec h3')].map(h => h.innerText.trim()));
  ok(r[0] === 'Academias recomendadas', 'o título "Academias recomendadas" na inicial — ' + r[0]);

  // O bairro da inicial abre direto as academias de lá, sem procurar no mapa.
  await page.click('.home-bairro:has-text("Moema")');
  await page.waitForTimeout(600);
  r = await page.evaluate(() => ({ pag: state.page, ids: getResults().map(c => c.id).join(), link: location.pathname, linha: document.querySelector('.status-info')?.innerText || '', titulo: document.querySelector('.regiao-titulo')?.innerText || '', sub: document.querySelector('.toolbar-sub')?.innerText || '' }));
  ok(r.pag === 'search' && r.ids === 'a2' && r.link === '/quadras/sao-paulo/moema', 'o bairro abre só as academias de Moema — ' + r.ids + ' ' + r.link);
  ok(pedidos.length === 0, 'sem procurar o endereço no mapa — ' + pedidos.length);
  ok(r.linha.includes('Todas as academias de Moema, São Paulo') && r.linha.includes('Ver as de São Paulo') && r.sub === 'em Moema', 'a linha diz o bairro e leva à cidade — ' + r.linha);
  ok(r.titulo.includes('Moema, São Paulo'), 'o título da página do bairro — ' + r.titulo);
  r = await page.evaluate(() => { const b = buscaAtualParaSalvar(); return b && { termo: b.termo, link: b.link, bairro: b.bairro }; });
  ok(r && r.termo === 'Moema, São Paulo' && r.link === '/quadras/sao-paulo/moema' && r.bairro === 'Moema', 'a página do bairro também se salva — ' + JSON.stringify(r));
  await browser.close();

  // O link direto do bairro.
  ({ browser, page } = await abrir({ q: 'quadras/sao-paulo/pinheiros' }));
  await page.waitForTimeout(900);
  r = await page.evaluate(() => getResults().map(c => c.id).join());
  ok(r === 'a1', '/quadras/sao-paulo/pinheiros mostra a academia de Pinheiros — ' + r);
  await browser.close();

  // Bairro sem academia: procura como antes (as mais perto).
  ({ browser, page } = await abrir());
  const pedidos2 = [];
  page.on('request', q => { if (/nominatim/.test(q.url())) pedidos2.push(q.url()); });
  await page.waitForTimeout(600);
  await page.evaluate(() => abrirRegiao({ cidade: 'São Paulo', bairro: 'Vila Madalena' }));
  await page.waitForTimeout(1200);
  r = await page.evaluate(() => ({ n: getResults().length, bairroPag: state.bairroDaPagina }));
  ok(pedidos2.length > 0 && r.n === 2 && !r.bairroPag, 'bairro sem academia: procura o lugar e mostra as mais perto — ' + r.n);

  // "O que tem por perto" que não carregou: atalhos para o mapa.
  await page.evaluate(() => openCourt('a1'));
  await page.waitForTimeout(800);
  r = await page.evaluate(() => { state.perto.a1 = { status: 'erro', itens: [] }; atualizarPerto(state.allCourts.find(c => c.id === 'a1'));
    const fora = document.querySelector('#ht-poi-slot .ht-poi-fora'); return { texto: fora?.innerText || '', links: [...(fora?.querySelectorAll('a') || [])].map(a => a.href) }; });
  ok(r.texto.startsWith('Ou veja no mapa:') && r.links.length === 3 && r.links.every(h => h.startsWith('https://www.google.com/maps/search/') && h.includes('@-23.56,-46.68,16z')), 'sem a lista, atalhos para o mapa em volta da academia — ' + r.texto);
  r = await page.evaluate(() => [POI_SERVIDORES.length, consultaPerto(-23.56, -46.68).includes('tourism"~')]);
  ok(r[0] === 4 && r[1], 'quatro servidores e a consulta mais leve (só o turismo que aparece)');
  await browser.close();
})();
