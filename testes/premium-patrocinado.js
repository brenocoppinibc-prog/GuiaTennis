// Pedido do Breno em 08/10/2026: "eu quero que academias que são Premium
// tenha um símbolo de verificado diferente e aparece mais bem recomendada e
// algo avisando que é patrocínio e abaixo delas aparecerem as mais próximas
// mesmo". Selo dourado, no máximo 2 "Patrocinado" no topo (até 10 km), e
// abaixo as outras da mais perto para a mais longe, sem repetir.
const { abrir, ok } = require('./harness');

const MOEMA = { lat: -23.601, lng: -46.661, bairro: 'Moema', cidade: 'São Paulo' };

// Academias a mais no banco do teste: a1 (Pinheiros) e a2 (Moema) já existem.
async function comAcademias(page, extras, planos) {
  await page.evaluate(async ({ extras, planos }) => {
    const base = window.__db.academias.find(x => x.id === 'a1');
    extras.forEach(e => window.__db.academias.push({ ...JSON.parse(JSON.stringify(base)), confirmada: true, ...e }));
    Object.entries(planos).forEach(([id, plano]) => { window.__db.academias.find(x => x.id === id).plano = plano; });
    await loadEverything();
  }, { extras, planos });
}

const buscar = (page, origem, extra) => page.evaluate(({ origem, extra }) => {
  state.page = 'search'; state.selected = null; state.view = 'list';
  state.origin = origem; state.sortBy = origem ? 'distance' : 'recomendados';
  state.searchStatus = 'done';
  Object.assign(state, extra || {});
  render();
  return [...document.querySelectorAll('.results > .rcard, .results > .resultados-titulo')].map(el => el.classList.contains('resultados-titulo')
    ? '# ' + el.innerText.trim()
    : (el.querySelector('.rcard-patrocinado') ? '[P] ' : '') + el.querySelector('.rcard-name').innerText.trim()
      + (el.querySelector('.rcard-name .selo-premium') ? ' ★' : el.querySelector('.rcard-name .selo-confirmada') ? ' ✓' : ''));
}, { origem, extra });

(async () => {
  // ---- Premium perto: no topo, "Patrocinado", selo dourado; abaixo, as mais perto ----
  let { browser, page } = await abrir({});
  await comAcademias(page, [
    { id: 'a3', name: 'Tênis Vizinho', bairro: 'Moema', lat: -23.602, lng: -46.662 },
    { id: 'a4', name: 'Premium Longe', bairro: 'Guarulhos', cidade: 'Guarulhos', lat: -23.45, lng: -46.53 },
  ], { a1: 'premium', a4: 'premium' });
  let lista = await buscar(page, MOEMA);
  ok(lista[0] === '[P] Só Aula Tennis ★' && lista[1] === '# Mais perto de você',
    'a Premium perto vai para o topo, marcada "Patrocinado" e com o selo dourado; depois, "Mais perto de você" — ' + lista.join(' | '));
  const organicas = lista.slice(2).map(x => x.replace(/ [★✓]$/, ''));
  ok(organicas.join(',') === 'Tênis Vizinho,Quadra Locação,Premium Longe',
    'abaixo, as outras da mais perto para a mais longe, sem repetir a do topo — ' + organicas.join(' | '));
  ok(lista.includes('Premium Longe ★') && !lista.includes('[P] Premium Longe ★'), 'Premium a mais de 10 km: selo dourado, mas sem o topo patrocinado');
  ok(await page.evaluate(() => !document.querySelector('.results .rcard-tag')), 'com patrocinada, o título da ordem substitui a etiqueta "Mais perto" do primeiro cartão');
  const estilo = await page.evaluate(() => {
    const rot = document.querySelector('.rcard-patrocinado');
    return { titulo: rot.getAttribute('title') || '', visivel: rot.getBoundingClientRect().height > 0, selo: document.querySelector('.rcard.patrocinada .selo-premium')?.getAttribute('aria-label') || '' };
  });
  ok(estilo.visivel && estilo.titulo.includes('patrocínio') && estilo.selo.includes('Academia Premium'), 'o aviso de patrocínio aparece no cartão, e o selo diz "Academia Premium"');

  // ---- no máximo duas patrocinadas ----
  await comAcademias(page, [
    { id: 'a5', name: 'Premium Dois', bairro: 'Moema', lat: -23.603, lng: -46.663 },
    { id: 'a6', name: 'Premium Três', bairro: 'Moema', lat: -23.604, lng: -46.664 },
  ], { a5: 'premium', a6: 'premium' });
  lista = await buscar(page, MOEMA);
  const patro = lista.filter(x => x.startsWith('[P]'));
  ok(patro.length === 2 && lista[0] === '[P] Premium Dois ★' && lista[1] === '[P] Premium Três ★' && lista[2] === '# Mais perto de você',
    'no máximo duas no topo, as Premium mais perto — ' + lista.slice(0, 3).join(' | '));
  ok(lista.includes('Só Aula Tennis ★'), 'a terceira Premium fica na lista normal, no lugar da distância dela');

  // ---- outra ordem: as patrocinadas continuam no topo, o resto na ordem escolhida ----
  lista = await buscar(page, MOEMA, { sortBy: 'price' });
  ok(lista[0].startsWith('[P]') && lista[2] === '# Menor preço', 'na ordem por preço, o título diz "Menor preço" — ' + lista.slice(0, 3).join(' | '));

  // ---- comparação e filtros: só o que a pessoa pediu ----
  await page.evaluate(() => setCompareList(['a2', 'a5']));
  lista = await buscar(page, MOEMA, { compareOnly: true });
  ok(lista.length === 2 && !lista.some(x => x.startsWith('[P]') || x.startsWith('#')), 'só as da comparação: sem patrocínio — ' + lista.join(' | '));
  lista = await buscar(page, MOEMA, { compareOnly: false, modalidadeFilters: ['locacao'] });
  ok(!lista.some(x => x.startsWith('[P]')) && lista.join() === 'Quadra Locação', 'Premium fora do filtro não entra no topo — ' + lista.join(' | '));
  await page.evaluate(() => { state.modalidadeFilters = []; });

  // ---- sem ponto de partida (página da cidade): a Premium da cidade no topo ----
  lista = await buscar(page, null, { cidadeDaPagina: 'São Paulo' });
  ok(lista[0].startsWith('[P]') && lista[1].startsWith('[P]') && lista[2] === '# Recomendadas', 'sem endereço, as Premium da cidade no topo, depois as recomendadas — ' + lista.slice(0, 3).join(' | '));
  await page.evaluate(() => { state.cidadeDaPagina = null; });

  // ---- Premium sem ficha confirmada, ou pausada: nada de selo nem topo ----
  await page.evaluate(async () => {
    ['a5', 'a6'].forEach(id => { window.__db.academias.find(x => x.id === id).plano = 'basico'; });
    window.__db.academias.find(x => x.id === 'a1').confirmada = false;
    await loadEverything();
  });
  lista = await buscar(page, MOEMA);
  ok(!lista.some(x => x.startsWith('[P]') || x.startsWith('#')) && lista.includes('Só Aula Tennis'),
    'Premium com ficha básica: sem selo e sem topo; a lista volta a ser a de sempre — ' + lista.join(' | '));
  ok(await page.evaluate(() => document.querySelector('.results .rcard-tag')?.textContent.trim() === 'Mais perto'), 'sem patrocinada, a etiqueta "Mais perto" volta ao primeiro cartão');
  await page.evaluate(() => {
    const a = state.allCourts.find(x => x.id === 'a1');
    Object.assign(a, { confirmada: true, pausada: true, pausadaAte: null });
  });
  lista = await buscar(page, MOEMA);
  ok(!lista.some(x => x.startsWith('[P]')), 'Premium pausada não vai para o topo');
  await browser.close();

  // ---- ficha e home: o selo dourado; o texto no fim da ficha ----
  ({ browser, page } = await abrir({}));
  await comAcademias(page, [], { a1: 'premium' });
  let r = await page.evaluate(() => {
    state.selected = decorate(state.allCourts.find(x => x.id === 'a1')); state.page = 'court'; render();
    return {
      premium: !!document.querySelector('.court-name .selo-premium'),
      verde: document.querySelectorAll('.court-name .selo-confirmada:not(.selo-premium)').length,
      fim: document.querySelector('#ficha-confirmacao')?.innerText || '',
    };
  });
  ok(r.premium && !r.verde && r.fim.includes('Confirmada pela academia') && r.fim.includes('Academia Premium'),
    'na ficha, o selo dourado no lugar do verde, e o fim diz "Academia Premium" — ' + r.fim);
  r = await page.evaluate(() => {
    state.selected = decorate(state.allCourts.find(x => x.id === 'a2')); render();
    return !!document.querySelector('.court-name .selo-confirmada');
  });
  ok(!r, 'ficha básica continua sem selo');
  r = await page.evaluate(() => [seloDaAcademia({ confirmada: true, plano: 'completo' }), seloDaAcademia({ confirmada: true, plano: 'premium' })]);
  ok(!r[0].includes('selo-premium') && r[0].includes('selo-confirmada') && r[1].includes('selo-premium'), 'Completo e Básico confirmados: o verde; só o Premium tem o dourado');
  await browser.close();

  // ---- textos: pergunta do site, Termos e planos do Parceiros ----
  ({ browser, page } = await abrir({ q: 'parceiros/planos' }));
  r = await page.evaluate(() => ({
    faq: (perguntasDoSite().find(f => f.q === 'A ordem das academias é paga?') || {}).a || '',
    termos: TERMS_HTML,
  }));
  ok(r.faq.includes('"Patrocinado"') && r.faq.includes('no máximo duas') && r.faq.includes('selo dourado') && !r.faq.startsWith('Não.'),
    'a pergunta "A ordem das academias é paga?" explica o patrocínio e o selo');
  ok(r.termos.includes('identificada como patrocinada ("Patrocinado")') && r.termos.includes('a até 10 km') && !r.termos.includes('Hoje, a ordem da busca não depende do plano'),
    'os Termos dizem como funciona o topo patrocinado');
  const premium = await page.evaluate(() => [...document.querySelectorAll('.pc-plano')].pop().innerText);
  ok(premium.includes('Selo Premium dourado ao lado do nome') && premium.includes('No topo da busca da região, marcada como "Patrocinado"'),
    'o Premium do Parceiros mostra o selo e o topo da busca');
  await browser.close();
})();
