// Regras 319 e 320 (23/11/2026): o selo de Fundadora para os 15 primeiros
// donos, as metas da semana no painel do admin e o "Divulgue seu desempenho"
// (uma janela só: o desempenho no período escolhido, uma avaliação ou a
// promoção, em post ou em Stories e Status, para qualquer app).
const { abrir, ok } = require('./harness');
const AVALIACOES = [
  { id: 'r2', academia_id: 'a1', stars: 5, comment: 'Ótimos professores e quadras muito bem cuidadas.', nome_autor: 'Ana Souza', contato_autor: '11955550002', created_at: '2026-11-21T12:00:00Z' },
  { id: 'r3', academia_id: 'a1', stars: 3, comment: 'Bom, mas o vestiário é simples.', nome_autor: 'Beto', contato_autor: '11955550003', created_at: '2026-11-20T12:00:00Z' },
];
const amanha = new Date(Date.now() + 10 * 864e5).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const PROMOCOES = [{ id: 'p1', academia_id: 'a1', titulo: 'Primeira aula grátis', detalhes: 'Para quem nunca jogou.', valida_ate: amanha, avisados: 0 }];
const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s) || {}).innerText || '', sel);
// A página de teste não é https: a área de transferência é fingida.
const copiaFalsa = (page) => page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true,
  value: { writeText: (t) => { window.__copiado = t; return Promise.resolve(); }, readText: () => Promise.resolve(window.__copiado || '') } }));
const legenda = async (page) => { await page.click('#pc-divulgar-legenda'); await page.waitForTimeout(200); return page.evaluate(() => window.__copiado || ''); };
const imagem = (page) => page.waitForFunction(() => {
  const i = document.querySelector('#pc-divulgar-previa img');
  return i && i.naturalWidth ? [i.naturalWidth, i.naturalHeight] : null;
}, null, { timeout: 8000 }).then(h => h.jsonValue()).catch(() => [0, 0]);
const escolher = async (page, sel) => { await page.click(sel); await page.waitForTimeout(250); return imagem(page); };

(async () => {
  // ---- Fundadoras: as vagas na página das academias ----
  let { browser, page } = await abrir({ q: 'parceiros' });
  await page.evaluate(() => { state.fundadoras = new Set(['a2']); render(); });
  await page.waitForTimeout(300);
  const vagas = await texto(page, '.pc-hero-vagas');
  ok(vagas.includes('Os 15 primeiros donos de academia') && vagas.includes('Restam 14 vagas') && vagas.includes('Garantir a vaga'), 'Parceiros: as 15 vagas de Fundadora, quantas restam e "Garantir a vaga" — ' + vagas);
  await page.evaluate(() => { state.fundadoras = new Set(Array.from({ length: 15 }, (_, i) => 'x' + i)); render(); });
  ok(!(await page.$('.pc-hero-vagas')), 'sem vaga, a linha some');
  await browser.close();

  // ---- Divulgue seu desempenho (Completo) ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel', completo: ['a1'], avaliacoes: AVALIACOES, promocoes: PROMOCOES }));
  await copiaFalsa(page);
  await page.waitForSelector('#pc-divulgar-abrir', { timeout: 8000 }).catch(() => {});
  const cartao = await texto(page, '.pc-divulgar');
  ok(cartao.includes('Divulgue seu desempenho') && !cartao.includes('+120') && cartao.includes('WhatsApp, o Instagram e o Facebook'), 'o painel mostra "Divulgue seu desempenho", sem repetir os acessos do Desempenho — ' + cartao.replace(/\s+/g, ' '));
  await page.click('#pc-divulgar-abrir');
  let tam = await imagem(page);
  const abas = await page.$$eval('[data-div-aba]', b => b.map(x => x.innerText).join());
  ok(tam[0] === 1080 && tam[1] === 1350 && (await texto(page, '#pc-divulgar-t')) === 'Divulgue seu desempenho' && abas === 'Desempenho,Avaliação,Promoção',
    'uma janela só: desempenho, avaliação e promoção; o post tem 1080 × 1350 — ' + abas);
  let leg = await legenda(page);
  ok(leg.startsWith('🎾 Nos últimos 30 dias, a ficha da') && leg.includes('teve mais de 120 acessos') && leg.includes('mais de 20 jogadores entraram em contato')
    && leg.includes('Nota 4,0 em 2 avaliações') && leg.includes('guiatennis.com.br/academia/') && !leg.includes('Instagram'), '30 dias por padrão, com a legenda para qualquer app — ' + leg.split('\n')[0]);
  await escolher(page, '[data-div-dias="90"]');
  leg = await legenda(page);
  ok(leg.startsWith('🎾 Nos últimos 3 meses') && leg.includes('mais de 400 acessos'), 'a academia escolhe o período: 3 meses — ' + leg.split('\n')[0]);
  await escolher(page, '[data-div-dias="0"]');
  leg = await legenda(page);
  ok(leg.startsWith('🎾 Desde março de 2026') && leg.includes('mais de 600 acessos'), 'desde o início — ' + leg.split('\n')[0]);
  tam = await escolher(page, '[data-div-formato="stories"]');
  ok(tam[1] === 1920 && (await texto(page, '.pc-divulgar-opcoes')).includes('Stories e Status'), 'Stories e Status: 1080 × 1920');
  await page.evaluate(() => { navigator.canShare = undefined; });
  const baixou = await Promise.all([page.waitForEvent('download', { timeout: 5000 }).catch(() => null), page.click('#pc-divulgar-enviar')]);
  ok(baixou[0] && /^guiatennis-.*-desempenho\.png$/.test(baixou[0].suggestedFilename()), 'sem o compartilhar do celular, baixa a imagem — ' + (baixou[0] && baixou[0].suggestedFilename()));
  tam = await escolher(page, '[data-div-aba="promocao"]');
  leg = await legenda(page);
  ok(tam[1] === 1920 && leg.includes('Primeira aula grátis') && leg.includes('Veja a ficha e fale com a academia: guiatennis.com.br/academia/') && !leg.includes('link na bio'), 'a promoção, com o link da ficha — ' + leg.split('\n')[0]);
  await page.click('#pc-divulgar-fechar');
  ok(!(await page.$('#pc-divulgar')), 'Fechar fecha a janela');

  // ---- Compartilhar uma avaliação e a promoção pelos atalhos ----
  await page.evaluate(() => irParceiros('avaliacoes'));
  await page.waitForTimeout(300);
  const botoes = await page.$$eval('[data-compartilhar-avaliacao]', b => b.map(x => x.dataset.compartilharAvaliacao + ':' + x.innerText.trim()));
  ok(botoes.join() === 'r2:Compartilhar', 'só a avaliação de 4 ou 5 estrelas com comentário tem "Compartilhar" — ' + botoes.join());
  if (botoes.length) {
    await page.click('[data-compartilhar-avaliacao="r2"]');
    tam = await imagem(page);
    const lav = await legenda(page);
    ok(tam[1] === 1350 && (await page.$('[data-div-aba="avaliacao"].active')) && lav.startsWith('⭐⭐⭐⭐⭐ “Ótimos professores') && lav.includes('— Ana Souza, no GuiaTennis'),
      'a avaliação abre a mesma janela, já escolhida — ' + lav.split('\n')[0]);
    await page.click('#pc-divulgar-fechar');
  }
  await page.evaluate(() => irParceiros('promocoes'));
  await page.waitForTimeout(400);
  if (await page.$('[data-promo-divulgar]')) {
    await page.click('[data-promo-divulgar]');
    await imagem(page);
    ok(await page.$('[data-div-aba="promocao"].active'), 'em Promoções, "Compartilhar" abre a janela na promoção');
    await page.click('#pc-divulgar-fechar');
  } else ok(false, 'a promoção valendo tem "Compartilhar"');
  await browser.close();

  // ---- Básico: sem os contatos ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel', avaliacoes: AVALIACOES }));
  await copiaFalsa(page);
  await page.waitForSelector('#pc-divulgar-abrir', { timeout: 8000 }).catch(() => {});
  ok(!(await texto(page, '.pc-divulgar')).includes('+120'), 'no Básico, o cartão também não repete os acessos');
  await page.click('#pc-divulgar-abrir').catch(() => {});
  await imagem(page);
  const lb = await legenda(page).catch(() => '');
  ok(lb.includes('mais de 120 acessos') && !lb.includes('contato'), 'no Básico, a imagem não mostra os contatos — ' + lb.split('\n')[0]);
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
