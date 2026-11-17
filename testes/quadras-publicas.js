// Regra 296 (17/11/2026): "quero ter a opção de adicionar quadras públicas,
// como pode ficar a administração delas?" … "sim, quero um botão também de
// sugerir quadras públicas ou até mesmo academia, no início do menu".
const { abrir, ok } = require('./harness');

(async () => {
  let { browser, page } = await abrir({ jogador: true });
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const a2 = state.allCourts.find(c => c.id === 'a2');
    a2.tipo = 'publica'; a2.comoUsar = 'Chegue e jogue; nos fins de semana, agende no parque.'; a2.catalogo = []; a2.modalidades = [];
    render();
  });

  // Ficha da quadra pública: o selo, "Como usar", "Como chegar"; sem preços, contato, cancelamento nem "é o responsável".
  await page.evaluate(() => openCourt('a2'));
  await page.waitForTimeout(400);
  let r = await page.evaluate(() => ({
    selo: document.querySelector('.ht-publica')?.innerText.trim(),
    usar: document.querySelector('#ht-visao')?.innerText.replace(/\s+/g, ' ').trim(),
    opcoes: !!document.getElementById('ht-opcoes'), politica: !!document.getElementById('ht-politica'), dono: !!document.querySelector('.ficha-dono'),
    chegar: document.querySelector('#ht-contato .sec-title')?.innerText.trim(), wa: !!document.querySelector('#ht-contato [data-track="whatsapp"]'),
    abas: [...document.querySelectorAll('#ht-tabs button')].map(b => b.innerText.trim()),
    perto: document.querySelector('#ht-perto .sec-title')?.innerText.trim() || '',
    titulo: document.title,
  }));
  ok(r.selo === 'Quadra pública · grátis' && /^Como usar a quadra Chegue e jogue/.test(r.usar) && !r.opcoes && !r.politica && !r.dono && r.chegar === 'Como chegar' && !r.wa,
    'a ficha da pública: selo, "Como usar" e "Como chegar", sem preços, WhatsApp, cancelamento ou "é o responsável" — ' + JSON.stringify(r));
  ok(r.abas.join('|') === 'Como usar|Como chegar|Estrutura|Localização|Avaliações' || r.abas[0] === 'Como usar', 'as abas da pública — ' + r.abas.join('|'));
  ok(/quadra de tênis pública e grátis/.test(r.titulo), 'no Google: "quadra de tênis pública e grátis" — ' + r.titulo);

  // Busca: "Grátis · quadra pública" e "Como chegar"; nas Recomendadas, depois das academias; o filtro "Tipo de lugar".
  await page.evaluate(() => { state.cep = ''; state.origin = null; goSearch(); state.sortBy = 'recomendados'; render(); });
  await page.waitForTimeout(400);
  r = await page.evaluate(() => {
    const cartao = [...document.querySelectorAll('.rcard')].find(c => c.querySelector('[data-como-chegar]'));
    return { txt: cartao?.querySelector('.offer')?.innerText.replace(/\s+/g, ' ').trim(), ordem: getResults().map(c => c.id) };
  });
  ok(/Grátis quadra pública/.test(r.txt || '') && /Como chegar/.test(r.txt || ''), 'no cartão, "Grátis · quadra pública" e "Como chegar" — ' + r.txt);
  ok(r.ordem[r.ordem.length - 1] === 'a2', 'nas Recomendadas, a pública vem depois das academias — ' + r.ordem.join());
  r = await page.evaluate(() => { state.tipoLugar = 'publica'; return getResults().map(c => c.id); });
  ok(r.join() === 'a2', 'o filtro "Quadras públicas"');
  await page.evaluate(() => { state.tipoLugar = ''; render(); });
  r = await page.evaluate(() => recomendadasGuia(state.allCourts.map(decorate), null, new Set()).map(c => c.id));
  ok(!r.includes('a2'), 'a pública não entra nas "Academias recomendadas" da inicial');

  // Cadastro do admin: só as partes da pública; vai para o banco com o tipo e o "como usar".
  r = await page.evaluate(() => {
    const f = { tipo: 'publica', comoUsar: 'Chegue e jogue.', name: 'Praça', modalidades: [], amenities: [] };
    return { partes: passosVisiveis(f).map(x => x.passo.id).join(','), linha: (({ tipo, como_usar }) => ({ tipo, como_usar }))(toRow(f)), academia: toRow({ ...f, tipo: 'academia' }).como_usar };
  });
  ok(r.partes === 'dados,quadras,fotos,horario,chegada,revisar' && r.linha.tipo === 'publica' && r.linha.como_usar === 'Chegue e jogue.' && r.academia === null,
    'o cadastro da pública: só lugar, quadras, fotos, horário e como chegar — ' + r.partes);

  // Sugerir uma quadra ou academia: no início do menu, com a conta, vai como sugestão.
  r = await page.evaluate(() => { state.showMenu = true; render(); return [...document.querySelectorAll('#menu-overlay .menu-item')].map(b => b.innerText.trim()).slice(0, 6); });
  ok(r.includes('Sugerir uma quadra ou academia') && r.indexOf('Sugerir uma quadra ou academia') <= 4, 'no início do menu, "Sugerir uma quadra ou academia" — ' + r.join(' | '));
  await page.click('[data-menu="sugerir-lugar"]');
  await page.waitForTimeout(300);
  await page.click('#sugerir-enviar');
  await page.waitForTimeout(200);
  r = await page.evaluate(() => document.querySelector('#sugerir-close-overlay .form-error')?.innerText || '');
  ok(/Falta o nome e onde fica/.test(r), 'sem nome e lugar, avisa — ' + r);
  await page.fill('#sugerir-nome', 'Parque da Aclimação');
  await page.fill('#sugerir-onde', 'Aclimação, São Paulo');
  await page.fill('#sugerir-obs', 'Duas quadras de saibro.');
  await page.click('#sugerir-enviar');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ rpc: (window.__rpcs.find(x => x.nome === 'enviar_relato_do_chat') || {}).args, titulo: document.querySelector('#sugerir-close-overlay .sheet-title')?.innerText }));
  ok(r.rpc && r.rpc.p_tipo === 'sugestao' && r.rpc.p_texto === 'Quadra pública sugerida: Parque da Aclimação · Aclimação, São Paulo · Duas quadras de saibro.' && r.titulo === 'Sugestão enviada',
    'manda como sugestão do chat (o admin vê com o nome e o e-mail) — ' + JSON.stringify(r));
  await browser.close();

  // Sem conta: pede para entrar, com o motivo.
  ({ browser, page } = await abrir());
  await page.waitForTimeout(500);
  await page.evaluate(() => acaoDoMenu('sugerir-lugar'));
  await page.waitForTimeout(300);
  r = await page.evaluate(() => ({ tela: state.jogadorTela, motivo: state.jogadorMotivo || '' }));
  ok(r.tela === 'email' && /sugerir uma quadra ou academia/.test(r.motivo), 'sem conta, abre o Entrar com o motivo — ' + JSON.stringify(r));
  await browser.close();
})();
