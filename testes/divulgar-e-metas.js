// Regra 319 (23/11/2026): o selo de Fundadora com 15 vagas, as metas da semana
// no painel do admin e o "Divulgue a academia" (os números e as avaliações em
// imagem para o Instagram, como o Spotify Wrapped).
const { abrir, ok } = require('./harness');
const AVALIACOES = [
  { id: 'r2', academia_id: 'a1', stars: 5, comment: 'Ótimos professores e quadras muito bem cuidadas.', nome_autor: 'Ana Souza', contato_autor: '11955550002', created_at: '2026-11-21T12:00:00Z' },
  { id: 'r3', academia_id: 'a1', stars: 3, comment: 'Bom, mas o vestiário é simples.', nome_autor: 'Beto', contato_autor: '11955550003', created_at: '2026-11-20T12:00:00Z' },
];
const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s) || {}).innerText || '', sel);
// A página de teste não é https: a área de transferência é fingida.
const copiaFalsa = (page) => page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true,
  value: { writeText: (t) => { window.__copiado = t; return Promise.resolve(); }, readText: () => Promise.resolve(window.__copiado || '') } }));
const legenda = (page) => page.evaluate(() => window.__copiado || '');
const imagem = (page) => page.waitForFunction(() => {
  const i = document.querySelector('#pc-divulgar-previa img');
  return i && i.naturalWidth ? [i.naturalWidth, i.naturalHeight] : null;
}, null, { timeout: 8000 }).then(h => h.jsonValue()).catch(() => [0, 0]);

(async () => {
  // ---- Fundadoras: as vagas na página das academias ----
  let { browser, page } = await abrir({ q: 'parceiros' });
  await page.evaluate(() => { state.fundadoras = new Set(['a2']); render(); });
  await page.waitForTimeout(300);
  const vagas = await texto(page, '.pc-hero-vagas');
  ok(vagas.includes('As 15 primeiras academias') && vagas.includes('Restam 14 vagas'), 'Parceiros: as 15 vagas de Fundadora e quantas restam — ' + vagas);
  await page.evaluate(() => { state.fundadoras = new Set(Array.from({ length: 15 }, (_, i) => 'x' + i)); render(); });
  ok(!(await page.$('.pc-hero-vagas')), 'sem vaga, a linha some');
  await browser.close();

  // ---- Divulgue a academia (Completo) ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel', completo: ['a1'], avaliacoes: AVALIACOES }));
  await copiaFalsa(page);
  await page.waitForSelector('#pc-divulgar-abrir', { timeout: 8000 }).catch(() => {});
  const cartao = await texto(page, '.pc-divulgar');
  ok(cartao.includes('Divulgue a') && cartao.includes('feed ou nos Stories'), 'o painel mostra "Divulgue a academia" — ' + cartao);
  await page.click('#pc-divulgar-abrir');
  let tam = await imagem(page);
  ok(tam[0] === 1080 && tam[1] === 1350 && (await texto(page, '#pc-divulgar-t')).startsWith('Divulgue a'), 'a imagem do feed: 1080 × 1350 — ' + tam);
  await page.click('[data-formato="stories"]');
  await page.waitForTimeout(300);
  tam = await imagem(page);
  ok(tam[1] === 1920, 'Stories: 1080 × 1920 — ' + tam);
  await page.evaluate(() => { navigator.canShare = undefined; });
  await page.click('#pc-divulgar-enviar');
  await page.waitForTimeout(400);
  const leg = await legenda(page);
  ok(leg.includes('foi aberta mais de 120 vezes') && leg.includes('mais de 20 jogadores chamaram a academia') && leg.includes('Nota 4,0 em 2 avaliações')
    && leg.includes('#guiatennis') && leg.includes('guiatennis.com.br/academia/'), 'a legenda vai junto, com os números arredondados para baixo — ' + leg.split('\n')[0]);
  await page.click('#pc-divulgar-fechar');
  ok(!(await page.$('#pc-divulgar')), 'Fechar fecha a janela');

  // ---- Compartilhar uma avaliação ----
  await page.evaluate(() => irParceiros('avaliacoes'));
  await page.waitForTimeout(300);
  const botoes = await page.$$eval('[data-compartilhar-avaliacao]', b => b.map(x => x.dataset.compartilharAvaliacao));
  ok(botoes.join() === 'r2', 'só a avaliação de 4 ou 5 estrelas tem "Compartilhar no Instagram" — ' + botoes.join());
  if (botoes.length) {
    await page.click('[data-compartilhar-avaliacao="r2"]');
    tam = await imagem(page);
    await page.click('#pc-divulgar-legenda');
    await page.waitForTimeout(300);
    const lav = await legenda(page);
    ok(tam[1] === 1350 && (await texto(page, '#pc-divulgar-t')) === 'Compartilhar a avaliação' && lav.startsWith('⭐⭐⭐⭐⭐ “Ótimos professores') && lav.includes('— Ana Souza, no GuiaTennis'),
      'a imagem e a legenda da avaliação — ' + lav.split('\n')[0]);
  }
  await browser.close();

  // ---- Básico: sem os contatos ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel', avaliacoes: AVALIACOES }));
  await copiaFalsa(page);
  await page.waitForSelector('#pc-divulgar-abrir', { timeout: 8000 }).catch(() => {});
  await page.click('#pc-divulgar-abrir').catch(() => {});
  await imagem(page);
  await page.click('#pc-divulgar-legenda').catch(() => {});
  await page.waitForTimeout(300);
  const lb = await legenda(page).catch(() => '');
  ok(lb.includes('mais de 120 vezes') && !lb.includes('chamaram'), 'no Básico, a imagem não mostra os contatos — ' + lb.split('\n')[0]);
  await browser.close();

  // ---- Metas da semana (admin) ----
  ({ browser, page } = await abrir({ admin: true, q: 'admin/metas' }));
  await page.waitForSelector('.adm-metas', { timeout: 8000 }).catch(() => {});
  const corpo = (await texto(page, '#painel-admin')).replace(/\s+/g, ' ');
  ok(corpo.includes('Metas da semana') && corpo.includes('Contatos com as academias') && corpo.includes('Meta batida') && corpo.includes('Fichas com preço') && corpo.includes('60%'),
    'as metas: contatos com a meta batida e as fichas com preço em % — ' + corpo.slice(0, 300));
  ok((await page.$$('.adm-metas-tab tbody tr')).length === 8 && (await texto(page, '.adm-nav')).includes('Metas'), 'as últimas 8 semanas e "Metas" no menu, em Números');
  ok(await page.$('[data-copiar^="GuiaTennis · semana de"]'), 'Copiar o resumo da semana');
  await page.click('#adm-metas-editar');
  await page.fill('[data-meta="contatos"]', '80');
  await page.click('#adm-metas-salvar');
  await page.waitForTimeout(400);
  const principal = (await texto(page, '.adm-meta.principal')).replace(/\s+/g, ' ');
  ok(principal.includes('75% da meta') && principal.includes('80'), 'editar a meta: 60 de 80 é 75% da meta — ' + principal);
  await page.click('#adm-metas-editar');
  await page.fill('[data-meta="visitas"]', '-3');
  await page.click('#adm-metas-salvar');
  ok((await texto(page, '.adm-metas .form-error')).includes('igual ou maior que zero'), 'meta negativa é recusada');
  await browser.close();
})();
