// Links no padrão dos sites grandes: ficha em /academia/<nome>-<id>, região
// em /quadras/<cidade>/<bairro>, busca com filtros, ordem e mapa no link,
// seção da ficha em #avaliacoes, comparação em /comparar?academias=…, o
// "voltar" do celular, os links antigos e o que o Google lê.
const { abrir, ok } = require('./harness');

const tela = (page) => page.evaluate(() => ({
  page: state.page,
  ficha: state.selected && state.selected.id,
  link: location.pathname + location.search + location.hash,
  canonica: document.getElementById('link-canonical').getAttribute('href'),
  titulo: document.title,
  robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') || '',
}));

(async () => {
  // ---- ficha com endereço de nome ----
  let { browser, page } = await abrir({ q: 'academia/quadra-locacao-a2' });
  let t = await tela(page);
  ok(t.page === 'court' && t.ficha === 'a2', 'link /academia/<nome>-<id> abre a ficha certa — ' + t.link);
  ok(t.canonica === 'http://guia.test/academia/quadra-locacao-a2', 'endereço oficial da ficha para o Google — ' + t.canonica);
  ok(t.titulo.startsWith('Quadra Locação — Moema, São Paulo') && !t.robots, 'título da ficha, e o Google pode indexar');
  const ld = await page.evaluate(() => JSON.parse(document.getElementById('ld-academia').textContent));
  const trilha = (ld['@graph'] || []).find(x => x['@type'] === 'BreadcrumbList');
  ok(trilha && trilha.itemListElement.map(i => i.name).join(' › ') === 'Início › Quadras em São Paulo › Moema › Quadra Locação'
    && trilha.itemListElement[2].item === 'http://guia.test/quadras/sao-paulo/moema', 'dados para o Google com o caminho até a academia');
  const migalhas = await page.evaluate(() => [...document.querySelectorAll('.ht-crumbs a')].map(a => a.getAttribute('href')));
  ok(migalhas.join(' ') === '/ /quadras/sao-paulo /quadras/sao-paulo/moema', 'caminho da ficha são links de verdade — ' + migalhas.join(' '));

  // Aba da ficha no link.
  await page.click('#ht-tabs button[data-goto="avaliacoes"]');
  await page.waitForTimeout(300);
  t = await tela(page);
  ok(t.link === '/academia/quadra-locacao-a2#avaliacoes', 'aba da ficha vai para o link — ' + t.link);
  await browser.close();

  // Abrir já na seção.
  ({ browser, page } = await abrir({ q: 'academia/quadra-locacao-a2#avaliacoes' }));
  const rolou = await page.evaluate(() => {
    const topo = document.getElementById('avaliacoes').getBoundingClientRect().top;
    return { y: window.scrollY, topo };
  });
  ok(rolou.y > 200 && rolou.topo < 300, 'link com #avaliacoes abre a ficha já nas avaliações — rolou ' + Math.round(rolou.y));
  await browser.close();

  // Nome mudou depois do link: abre a mesma academia e corrige o endereço.
  ({ browser, page } = await abrir({ q: 'academia/nome-antigo-a2?utm_source=Instagram-bio' }));
  t = await tela(page);
  ok(t.ficha === 'a2' && t.link === '/academia/quadra-locacao-a2?utm_source=Instagram-bio', 'nome antigo no link: abre e corrige, mantendo a etiqueta — ' + t.link);
  await browser.close();

  // Link antigo (?court=) continua valendo e vira o novo.
  ({ browser, page } = await abrir({ q: '?court=a1&utm_source=WhatsApp' }));
  t = await tela(page);
  ok(t.ficha === 'a1' && t.link === '/academia/so-aula-tennis-a1?utm_source=WhatsApp', 'link antigo ?court= abre e vira o endereço novo — ' + t.link);
  const origem = await page.evaluate(() => window.__cliques.map(c => c.tipo + ':' + c.origem).join());
  ok(origem.includes('visualizacao:WhatsApp'), 'a etiqueta do link antigo conta na origem');
  await browser.close();

  // Academia que saiu do guia.
  ({ browser, page } = await abrir({ q: 'academia/fechou-zz99' }));
  t = await tela(page);
  const aviso = await page.evaluate(() => document.querySelector('.aviso-link')?.innerText || '');
  ok(t.page === 'home' && aviso.includes('não está mais no GuiaTennis') && t.robots.includes('noindex'), 'academia que saiu: home com aviso e fora do Google');
  await browser.close();

  // ---- região ----
  ({ browser, page } = await abrir({ q: 'quadras/sao-paulo/moema' }));
  await page.waitForTimeout(600);
  t = await tela(page);
  const regiao = await page.evaluate(() => ({ termo: state.cep, h1: document.querySelector('.regiao-titulo')?.innerText || '', origem: !!state.origin, busca: window.__cliques.filter(c => c.tipo === 'busca').length }));
  ok(t.page === 'search' && regiao.termo === 'Moema, São Paulo' && regiao.origem, 'página da região busca pelo bairro, com os acentos certos — ' + regiao.termo);
  ok(regiao.h1 === 'Quadras e academias de tênis em Moema, São Paulo' && t.titulo.startsWith('Quadras e academias de tênis em Moema, São Paulo'), 'título da região para o Google');
  ok(t.canonica === 'http://guia.test/quadras/sao-paulo/moema' && !t.robots && t.link === '/quadras/sao-paulo/moema', 'região tem endereço próprio e entra no Google — ' + t.link);
  ok(regiao.busca === 1, 'abrir a região conta como uma busca');
  const rodape = await page.evaluate(() => [...document.querySelectorAll('.sitefooter a[data-regiao-link]')].map(a => a.getAttribute('href')));
  ok(rodape.includes('/quadras/sao-paulo'), 'rodapé tem as cidades com link, como os destinos do TripAdvisor');
  await browser.close();

  // Clicar no caminho da ficha leva à região com o endereço dela.
  ({ browser, page } = await abrir({ q: 'academia/quadra-locacao-a2' }));
  await page.click('.ht-crumbs a[href="/quadras/sao-paulo/moema"]');
  await page.waitForTimeout(700);
  t = await tela(page);
  ok(t.page === 'search' && t.link === '/quadras/sao-paulo/moema', 'caminho da ficha abre a região — ' + t.link);
  await page.goBack();
  await page.waitForTimeout(400);
  t = await tela(page);
  ok(t.page === 'court' && t.ficha === 'a2', '"voltar" do celular volta para a ficha');
  await browser.close();

  // ---- busca com filtros, ordem e mapa no link ----
  ({ browser, page } = await abrir({ q: 'busca?q=Pinheiros&piso=rapida&comodidades=wifi,estacionamento&ordem=preco&ver=mapa' }));
  await page.waitForTimeout(600);
  let filtros = await page.evaluate(() => ({ piso: state.pisoFilters.join(), amen: state.amenityFilters.join(), ordem: state.sortBy, ver: state.view, termo: state.cep, link: location.pathname + location.search }));
  ok(filtros.piso === 'rapida' && filtros.ordem === 'price' && filtros.ver === 'map' && filtros.termo === 'Pinheiros', 'link com filtros, ordem e mapa abre igual — ' + JSON.stringify(filtros));
  ok(filtros.amen === 'estacionamento,wifi' && filtros.link === '/busca?q=Pinheiros&piso=rapida&comodidades=estacionamento,wifi&ordem=preco&ver=mapa', 'filtros sempre na ordem das listas — ' + filtros.link);
  t = await tela(page);
  ok(t.robots === 'noindex, follow' && t.canonica === 'http://guia.test/busca', 'busca livre fica fora do Google, como nos sites grandes');
  await browser.close();

  // Mudar filtro e ordem vai para o link; "voltar" desfaz um passo.
  ({ browser, page } = await abrir({ q: 'busca?q=Pinheiros' }));
  await page.waitForTimeout(600);
  let link0 = await page.evaluate(() => location.pathname + location.search);
  await page.evaluate(() => { state.showFilters = true; render(); });
  await page.click('.piso-chip[data-piso="saibro"]');
  await page.click('.cobertura-chip[data-cobertura="coberta"]');
  let durante = await page.evaluate(() => location.search);
  await page.click('#drawer-close');
  let link1 = await page.evaluate(() => location.pathname + location.search);
  ok(link0 === '/busca?q=Pinheiros' && !durante.includes('piso') && link1 === '/busca?q=Pinheiros&piso=saibro&cobertura=coberta', 'filtros entram no link ao fechar a gaveta, num passo só — ' + link1);
  await page.evaluate(() => { state.sortBy = 'rating'; render(); });
  let link2 = await page.evaluate(() => location.search);
  ok(link2.endsWith('&ordem=nota'), 'ordem vai para o link — ' + link2);
  await page.goBack();
  await page.waitForTimeout(300);
  filtros = await page.evaluate(() => ({ ordem: state.sortBy, piso: state.pisoFilters.join() }));
  ok(filtros.ordem === 'distance' && filtros.piso === 'saibro', '"voltar" desfaz a ordem e mantém o filtro — ' + JSON.stringify(filtros));
  await page.goBack();
  await page.waitForTimeout(300);
  filtros = await page.evaluate(() => ({ piso: state.pisoFilters.join(), cob: state.coberturaFilters.join(), buscas: window.__cliques.filter(c => c.tipo === 'busca').length }));
  ok(!filtros.piso && !filtros.cob, '"voltar" de novo tira os filtros');
  ok(filtros.buscas === 1, 'voltar e avançar não contam busca de novo — ' + filtros.buscas);
  await browser.close();

  // Link antigo ?busca= vira /busca?q=
  ({ browser, page } = await abrir({ q: '?busca=05422-000' }));
  await page.waitForTimeout(600);
  t = await tela(page);
  ok(t.link === '/busca?q=05422-000', 'link antigo ?busca= vira /busca?q= — ' + t.link);
  await browser.close();

  // ---- comparação ----
  ({ browser, page } = await abrir({ q: 'comparar?academias=a1,a2' }));
  t = await tela(page);
  const cmp = await page.evaluate(() => state.compareList.join());
  ok(t.page === 'comparar' && cmp === 'a1,a2' && t.link === '/comparar?academias=a1,a2', 'link da comparação abre as mesmas academias — ' + t.link);
  ok(t.robots.includes('noindex'), 'comparação fica fora do Google');
  await browser.close();

  // ---- home e links espalhados pelo site ----
  ({ browser, page } = await abrir({}));
  const hrefs = await page.evaluate(() => ({
    mini: document.querySelector('a.mini')?.getAttribute('href') || '',
    cidade: document.querySelector('.cidade-link')?.getAttribute('href') || '',
    ficha: linkDaFicha(state.allCourts.find(c => c.id === 'a2')),
  }));
  ok(/^\/academia\/[a-z0-9-]+-a[12]$/.test(hrefs.mini), 'cartões da home apontam para o endereço novo — ' + hrefs.mini);
  ok(hrefs.cidade === '/quadras/sao-paulo', 'bloco das cidades tem link para a página da cidade');
  ok(hrefs.ficha === 'https://guiatennis.com.br/academia/quadra-locacao-a2', 'QR code, WhatsApp e convites usam o endereço novo');
  await page.click('a.mini');
  await page.waitForTimeout(300);
  t = await tela(page);
  ok(t.page === 'court' && t.link.startsWith('/academia/'), 'tocar no cartão abre a ficha com o endereço novo');
  await page.goBack();
  await page.waitForTimeout(300);
  t = await tela(page);
  ok(t.page === 'home' && t.link === '/', '"voltar" volta para a home');
  await browser.close();
})();
