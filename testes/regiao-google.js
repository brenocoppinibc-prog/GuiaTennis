// Regra 321 (23/11/2026): a página de cada região para o Google. Embaixo da
// lista, o texto que só a região tem (quanto custa, as mais bem avaliadas, as
// perguntas frequentes e os outros bairros) e os dados estruturados.
const { abrir, ok } = require('./harness');
const AVALIACOES = [
  { id: 'r1', academia_id: 'a1', stars: 5, comment: 'Ótimo.', nome_autor: 'Ana', contato_autor: '1', created_at: '2026-11-21T12:00:00Z' },
  { id: 'r2', academia_id: 'a1', stars: 4, comment: 'Bom.', nome_autor: 'Beto', contato_autor: '2', created_at: '2026-11-20T12:00:00Z' },
];
const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s) || {}).innerText || '', sel);

(async () => {
  let { browser, page } = await abrir({ q: 'quadras/sao-paulo/pinheiros', avaliacoes: AVALIACOES });
  await page.waitForSelector('.regiao-info', { timeout: 8000 }).catch(() => {});
  const info = (await texto(page, '.regiao-info')).replace(/\s+/g, ' ');
  const nome = await page.evaluate(() => state.allCourts.find(c => c.id === 'a1').name);
  ok(info.includes('Tênis em Pinheiros') && info.includes('Perguntas frequentes') && info.includes('Quanto custa uma aula de tênis em Pinheiros?') && info.includes('Como falar com a academia?'),
    'o bairro tem o texto próprio embaixo da lista — ' + info.slice(0, 200));
  ok(info.includes('Mais bem avaliadas em Pinheiros') && info.includes(nome) && info.includes('4,5 ★ · 2 avaliações'), 'as mais bem avaliadas, com a nota');
  ok(info.includes('Outros bairros de São Paulo') && (await page.$$('.regiao-info [data-regiao-link]')).length >= 1, 'os outros bairros da cidade, com link');
  const precos = await page.evaluate(() => { const p = precosDaRegiao(academiasDaRegiao({ cidade: 'São Paulo', bairro: 'Pinheiros' })); return !!(p.aula || p.hora); });
  ok(!precos || info.includes('Quanto custa jogar tênis em Pinheiros'), 'com preço informado, o bloco "Quanto custa jogar tênis em Pinheiros"');
  const ld = await page.evaluate(() => JSON.parse((document.getElementById('ld-regiao') || {}).textContent || '[]'));
  ok(ld.length === 2 && ld[0]['@type'] === 'BreadcrumbList' && ld[0].itemListElement.length === 3 && ld[1]['@type'] === 'ItemList' && ld[1].itemListElement[0].url.includes('/academia/'),
    'os dados estruturados da região: o caminho e a lista');
  ok((await page.title()) === 'Quadras e academias de tênis em Pinheiros, São Paulo | GuiaTennis', 'o título da região — ' + await page.title());
  await page.click('.regiao-melhores [data-regiao-ficha]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => state.page === 'court' && state.selected && state.selected.id === 'a1' && !document.getElementById('ld-regiao')), 'a mais bem avaliada abre a ficha, e os dados da região saem');
  await browser.close();

  // A cidade: os bairros da cidade.
  ({ browser, page } = await abrir({ q: 'quadras/sao-paulo' }));
  await page.waitForSelector('.regiao-info', { timeout: 8000 }).catch(() => {});
  const cidade = (await texto(page, '.regiao-info')).replace(/\s+/g, ' ');
  ok(cidade.includes('Tênis em São Paulo') && cidade.includes('Bairros de São Paulo') && cidade.includes('Quanto custa uma aula de tênis em São Paulo?'), 'a cidade também: os bairros e as perguntas');
  await browser.close();

  // A busca comum (sem região) não mostra o bloco.
  ({ browser, page } = await abrir({ q: 'busca?q=Moema' }));
  await page.waitForTimeout(1200);
  ok(!(await page.$('.regiao-info')) && !(await page.$('#ld-regiao')), 'a busca comum não mostra o texto da região');
  await browser.close();
})();
