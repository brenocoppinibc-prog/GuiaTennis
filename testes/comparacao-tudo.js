// Pedidos de 21/10/2026 sobre a comparação: atalho no aviso, "Limpar" em
// vermelho com o lixo, "Localização", comparar tudo da ficha, o ícone da
// comparação em todo lugar e a ajuda para decidir entendendo reposição,
// academia menor, estacionamento e o resto da ficha.
const { abrir, ok } = require('./harness');

(async () => {
  let { browser, page } = await abrir();
  await page.setViewportSize({ width: 390, height: 844 });

  // ---- aviso com o atalho para a comparação ----
  await page.evaluate(async () => {
    window.__db.academias.forEach(a => { a.plano = 'completo'; });
    await loadEverything();
    state.selected = decorate(state.allCourts.find(x => x.id === 'a1')); state.page = 'court'; render();
  });
  await page.waitForTimeout(200);
  await page.click('.courtbar [data-compare]');
  await page.waitForTimeout(150);
  let push = await page.evaluate(() => ({ t: document.querySelector('.gt-push')?.innerText.replace(/\s+/g, ' ') || '', acao: document.querySelector('.gt-push .gt-push-acao')?.textContent || '', ic: !!document.querySelector('.gt-push .gt-push-ic svg rect') }));
  ok(push.t.includes('Na comparação (1)') && push.acao === 'Ver comparação ›' && push.ic, 'o aviso traz o atalho "Ver comparação ›" e o ícone da comparação — ' + push.t);
  await page.click('.gt-push .gt-push-acao');
  await page.waitForTimeout(250);
  let t = await page.evaluate(() => ({
    pagina: state.page,
    titulo: document.querySelector('.cmp-titulo')?.textContent.trim(),
    tituloIc: !!document.querySelector('.cmp-titulo svg rect'),
    sub: document.querySelector('.cmp-sub-topo')?.textContent || '',
    limpar: (() => { const b = document.getElementById('compare-clear-2'); return b ? { danger: b.classList.contains('cta-danger'), lixo: !!b.querySelector('svg'), txt: b.textContent.trim() } : null; })(),
    escolherIc: !!document.querySelector('.cmp-vaga[data-cmp-abrir] .cmp-vaga-mais svg rect'),
  }));
  ok(t.pagina === 'comparar' && t.titulo === 'Comparar academias' && t.tituloIc, 'o atalho abre a comparação; o título com o ícone');
  ok(t.sub.endsWith('e tudo o que está na ficha.') && t.sub.includes('estacionamento') && t.sub.includes('cancelamento'), 'o subtítulo termina dizendo que compara tudo — ' + t.sub);
  ok(t.limpar && t.limpar.danger && t.limpar.lixo && t.limpar.txt === 'Limpar comparação', '"Limpar comparação" em vermelho, com o lixo, já com uma academia');
  ok(t.escolherIc, '"Escolher" com o ícone da comparação');

  // ---- a tabela com tudo da ficha ----
  await page.evaluate(() => { toggleCompare('a2'); render(); });
  await page.waitForTimeout(200);
  t = await page.evaluate(() => ({
    secoes: [...document.querySelectorAll('.ct-secao')].map(x => x.textContent.trim()),
    rotulos: [...document.querySelectorAll('.ct-rot')].map(x => x.textContent.trim()).filter(Boolean),
    menu: (() => { state.showMenu = true; render(); const b = document.querySelector('#menu-overlay [data-menu="comparar"] svg rect'); state.showMenu = false; render(); return !!b; })(),
  }));
  ok(t.secoes.includes('Localização') && !t.secoes.includes('Onde fica'), '"Onde fica" virou "Localização" — ' + t.secoes.join(' | '));
  ok(['Estacionamento', 'Funciona', 'Reposição', 'Contato', 'Ficha', 'Como chegar'].every(r => t.rotulos.map(x => x.replace(/\u00ad/g, '')).includes(r)), 'compara também estacionamento, horário, reposição, contato, ficha e como chegar (linha sem informação nenhuma some) — ' + t.rotulos.join(', '));
  ok(t.menu, 'no menu, "Comparar academias" com o ícone da comparação');
  await page.evaluate(() => { state.cmpPicker = 'todas'; render(); });
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => [...document.querySelectorAll('.cmp-add-btn')].every(b => b.querySelector('svg rect'))), 'no seletor, o botão de cada academia é o ícone da comparação');
  await page.evaluate(() => { state.cmpPicker = null; render(); });

  // ---- a ajuda para decidir entende o resto da ficha ----
  const an = await page.evaluate(() => {
    const base = { cidade: 'São Paulo', amenities: [], cobertura: [], pisos: [], acesso: {}, horario: {} };
    const a = { ...base, id: 'x1', name: 'Grande', quadras: { saibro_coberta: 8 }, amenities: ['estacionamento_gratuito', 'estacionamento_pago'], acesso: { estacionamentoRegra: { tipo: 'alunos' } },
      politica: { modo: 'igual', reposicao: '48', foraDoPrazo: '' }, horario: { modo: 'igual', semana: { de: '06:00', ate: '23:00' }, sabado: { de: '08:00', ate: '18:00' } } };
    const b = { ...base, id: 'x2', name: 'Pequena', quadras: { saibro_coberta: 2 }, amenities: ['estacionamento_gratuito'],
      politica: { modo: 'igual', reposicao: '12', foraDoPrazo: '' }, horario: { modo: 'igual', semana: { de: '08:00', ate: '20:00' } } };
    const r = analisarAnotacoes('Quero estacionamento grátis, pouco tempo de aviso na reposição e privacidade. Abre sábado?', [a, b]);
    return r.achados.map(x => ({ l: x.label, at: x.atendem.map(c => c.name), d: (x.detalhes || []).map(d => d.nome + ': ' + d.txt), r: x.resumo }));
  });
  const achou = (l) => an.find(x => x.l === l) || {};
  ok(achou('reposição com menos aviso').at?.join() === 'Pequena', 'a reposição desempata pelo menor aviso');
  ok(achou('estacionamento grátis').at?.join() === 'Pequena' && achou('estacionamento grátis').d?.[0] === 'Grande: Grátis para alunos; para quem só aluga a quadra, é pago.' && !achou('estacionamento').l,
    'estacionamento grátis: só a de grátis para todos, e diz como é em cada uma — ' + JSON.stringify(achou('estacionamento grátis')));
  ok(achou('reposição com menos aviso').r === 'O menor aviso é na Pequena: 12h antes.' && achou('reposição com menos aviso').d?.includes('Grande: Avisando 48h antes'),
    'tempo de aviso da reposição: o de cada uma e o menor — ' + JSON.stringify(achou('reposição com menos aviso')));
  ok(achou('academia menor e mais reservada').at?.join() === 'Pequena' && achou('academia menor e mais reservada').d?.includes('Pequena: 2 quadras'), '"privacidade" vira a academia menor, com as quadras de cada uma');
  ok(achou('aberta no fim de semana').at?.join() === 'Grande', '"sábado" cruza com o horário');
  await browser.close();
  console.log('\ncomparacao-tudo.js: fim');
})();
