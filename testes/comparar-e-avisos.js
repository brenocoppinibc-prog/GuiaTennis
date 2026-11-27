// Pedidos do Breno em 05/10/2026: a conta pisca em amarelo e chama para
// entrar; "grátis para quem joga"; "Comparar" no seletor; cada academia em
// cima da coluna dela; "Ainda em dúvida?" como aviso; Minhas quadras da mais
// perto; parceiros: botão "é de graça!", Premium explicado, e-mails com
// acesso e "jogadores" no lugar de "alunos".
const { abrir, ok } = require('./harness');

(async () => {
  // ---- conta piscando e avisos ----
  let { browser, page } = await abrir({ pushes: true });
  let t = await page.evaluate(() => {
    const b = document.getElementById('conta-topo');
    return { cls: b.className, anim: getComputedStyle(b).animationName, selo: getComputedStyle(b, '::after').content };
  });
  ok(t.cls.includes('entrar') && t.anim === 'none', 'o alto mostra "Entrar" escrito, sem piscar (regra 263) — ' + t.cls + ' ' + t.anim);
  ok(!(await page.isVisible('#push-conta')), 'quem acabou de chegar ainda não vê o balão');
  await page.waitForTimeout(10600);
  // A mensagem do balão muda a cada dia (regra 202: um por visita, fica até o ✕).
  const doDia = await page.evaluate(() => PUSHES_CONTA[Math.floor(Date.now() / 864e5) % PUSHES_CONTA.length]);
  t = await page.evaluate(() => document.getElementById('push-conta')?.innerText.replace(/\s+/g, ' ') || '');
  ok(t.includes(doDia.t) && t.includes('Entrar ou criar conta'), 'uns segundos depois, o balão chama para entrar — ' + t.slice(0, 70));
  await page.click('#push-conta');
  await page.waitForTimeout(200);
  ok(await page.evaluate((m) => state.jogadorTela === 'email' && state.jogadorMotivo === m && !document.getElementById('push-conta'), doDia.motivo), 'tocar no balão abre o Entrar, explicando o porquê');
  await page.evaluate(() => { state.jogadorTela = null; state.pushConta = 1; render(); });
  await page.click('#push-conta-x');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => !document.getElementById('push-conta') && lerLocal(PUSH_CONTA_KEY, 0) > 0), 'o ✕ fecha e para os balões por uns dias');
  await page.evaluate(() => { jogador = { user_id: 'j1', nome: 'Bia', email: 'bia@x.com' }; state.pushConta = 0; render(); });
  ok(await page.evaluate(() => !document.getElementById('push-conta') && !document.getElementById('conta-topo').className.includes('destaque')), 'logado: nem pisca nem balão');
  await browser.close();

  // ---- grátis para quem joga ----
  ({ browser, page } = await abrir());
  t = await page.evaluate(() => document.querySelector('#home-porque .dif-item')?.innerText.replace(/\s+/g, ' ') || '');
  ok(t.includes('A academia mais perto') && !t.includes('locar'), '"Por que o GuiaTennis" começa pela academia mais perto; o "grátis" fica embaixo da busca (regra 265) — ' + t.slice(0, 60));
  ok(await page.evaluate(() => { const [a, b] = document.querySelectorAll('#home-porque .dif-item'); return getComputedStyle(a).backgroundColor === getComputedStyle(b).backgroundColor; }), 'o card do grátis tem a mesma cor dos outros');

  // ---- seletor com "Comparar", e a tabela alinhada ----
  await page.evaluate(() => {
    const base = state.allCourts[0];
    ['x3', 'x4', 'x5'].forEach((id, i) => state.allCourts.push({ ...base, id, name: 'Academia Extra ' + (i + 3), lat: base.lat + 0.01 * (i + 1), lng: base.lng }));
    setCompareList([]); state.page = 'comparar'; render();
  });
  await page.click('[data-cmp-abrir]');
  await page.waitForTimeout(150);
  ok(!(await page.isVisible('#cmp-pick-comparar')), 'nenhuma escolhida: sem bandeja');
  await page.click('.cmp-add-btn >> nth=0');
  await page.waitForTimeout(150);
  t = await page.evaluate(() => ({ txt: document.getElementById('cmp-pick-comparar')?.innerText, off: document.getElementById('cmp-pick-comparar')?.disabled }));
  ok(t.txt === 'Escolha mais uma' && t.off, 'uma escolhida: a bandeja pede mais uma');
  await page.click('.cmp-add-btn >> nth=1');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => document.getElementById('cmp-pick-comparar')?.innerText.trim()) === 'Comparar 2', 'duas escolhidas: aparece "Comparar 2"');
  await page.click('#cmp-pick-comparar');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => !state.cmpPicker && document.querySelectorAll('.ct-topo').length === 3), '"Comparar" fecha o seletor e mostra a tabela');
  await page.evaluate(() => { setCompareList(state.allCourts.slice(0, 5).map(c => c.id)); render(); });
  t = await page.evaluate(() => {
    const topos = [...document.querySelectorAll('.ct-topo')].slice(1).map(e => Math.round(e.getBoundingClientRect().left));
    const linha = [...document.querySelectorAll('.ct-cel')].slice(0, 5).map(e => Math.round(e.getBoundingClientRect().left));
    return { topos, linha, larg: document.documentElement.scrollWidth, tela: window.innerWidth, canto: !!document.querySelector('.ct-canto [data-cmp-abrir]') };
  });
  ok(t.topos.length === 5 && t.topos.every((x, i) => Math.abs(x - t.linha[i]) <= 1), 'cada academia fica em cima da coluna dela — ' + t.topos.join(',') + ' / ' + t.linha.join(','));
  ok(t.larg <= t.tela, 'com 5 academias, cabe na tela do celular sem rolar de lado — ' + t.larg + ' de ' + t.tela);
  ok(!t.canto, 'com 5, não tem mais o "+ Escolher"');
  ok(await page.evaluate(() => !document.querySelector('.cmp-vagas-barra') && document.querySelectorAll('.cmp-vagas-n').length === 1), 'as academias aparecem uma vez só, em cima das colunas');

  // ---- "Ainda em dúvida?" ----
  ok(await page.evaluate(() => !document.querySelector('.cmp-pagina .decide-box') && !!document.querySelector('.cmp-pagina [data-decide-abrir]')), 'a ajuda sai do meio da página e vira um botão');
  await page.evaluate(() => { localStorage.setItem(ULTIMA_BUSCA_KEY, JSON.stringify({ lat: -23.561, lng: -46.681, bairro: 'Pinheiros', cidade: 'São Paulo' })); state.decidePush = true; render(); });
  t = await page.evaluate(() => document.getElementById('decide-push')?.innerText.replace(/\s+/g, ' ') || '');
  ok(t.includes('Ainda em dúvida?') && t.includes('Mais perto') && t.includes('Me ajude a decidir'), 'o aviso mostra quem ganha (preço, nota, distância) e chama para decidir — ' + t.slice(0, 90));
  await page.click('#decide-push [data-decide-abrir]');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => state.showDecide && !!document.querySelector('#decide-overlay #decide-go') && !document.getElementById('decide-push')), 'abre a mesma ajuda numa folha');
  await page.click('#decide-overlay [data-prio="distance"], #decide-overlay .decide-prio >> nth=0');
  // Regra 197: passo a passo — pergunta, a bola girando, o resultado com
  // "Confirmar" embaixo e, em outra tela, o que fazer.
  // Regra 198: cada passo é uma tela com o cabeçalho do GuiaTennis e o passo no meio.
  const tela = await page.evaluate(() => { const m = document.querySelector('main.decide-tela'); const r = m.getBoundingClientRect(); return { cab: !!document.querySelector('.home-head'), comparacao: !!document.querySelector('.cmp-pagina'), meio: Math.abs((r.left + r.right) / 2 - innerWidth / 2) < 2, titulo: getComputedStyle(document.querySelector('.decide-meio .decide-title')).textAlign }; });
  ok(await page.evaluate(() => document.querySelector('.decide-meio .decide-title').getBoundingClientRect().top < innerHeight * 0.35), 'passo 1: a pergunta no alto da tela');
  ok(tela.cab && !tela.comparacao && tela.meio && tela.titulo === 'center', 'a ajuda é uma tela com o cabeçalho do GuiaTennis, no lugar da comparação, com o passo no meio — ' + JSON.stringify(tela));
  ok((await page.innerText('#decide-overlay .decide-title')) === 'O que mais ajuda na sua escolha?' && (await page.innerText('#decide-go')) === 'Ver o resultado', 'passo 1: pergunta o que ajuda');
  await page.click('#decide-go');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => !!document.querySelector('#decide-overlay .decide-carregando .bola-girando, #decide-overlay .decide-carregando svg, #decide-overlay .decide-carregando span') && !document.querySelector('#decide-overlay .decide-result')), 'depois, a bola girando, sem o resultado ainda');
  await page.waitForTimeout(1300);
  const res = await page.evaluate(() => ({ r: !!document.querySelector('#decide-overlay .decide-result'), conf: document.querySelector('#decide-overlay .confirmar-box')?.innerText.replace(/\s+/g, ' ') || '' }));
  ok(res.r && /Confirmar a |Com qual vai ficar\?/.test(res.conf), 'passo 2: o resultado e, embaixo, confirmar a escolha — ' + res.conf.slice(0, 80));
  // Regra 199: "Mudar a preferência" no alto do passo 2.
  ok(await page.evaluate(() => { const b = document.getElementById('decide-mudar'); return b && b.innerText.trim() === 'Mudar a preferência' && b.getBoundingClientRect().bottom < document.querySelector('.decide-result').getBoundingClientRect().top + 1; }), 'passo 2: "Mudar a preferência" em cima do resultado');
  await page.click('#decide-overlay [data-decidir] >> nth=0');
  await page.waitForTimeout(150);
  const feita = await page.evaluate(() => ({ t: document.querySelector('#decide-overlay .decide-feita')?.innerText.replace(/\s+/g, ' ') || '', wa: !!document.querySelector('#decide-overlay .decide-feita [data-track-wa]'), ficha: !!document.querySelector('#decide-overlay [data-decide-ficha]'), resultado: !!document.querySelector('#decide-overlay .decide-result') }));
  ok(feita.t.includes('O que fazer agora') && feita.wa && feita.ficha && feita.t.includes('Escolher novamente') && !feita.resultado, 'passo 3, noutra tela: o WhatsApp direto, ver a ficha ou escolher de novo — ' + feita.t.slice(0, 120));
  // Regra 199: o título no alto, a mini prévia da academia e os contatos embaixo dela.
  const p3 = await page.evaluate(() => { const t = document.querySelector('.decide-feita .decide-title').getBoundingClientRect(), pv = document.querySelector('.decide-feita .mcard-previa'), wa = document.querySelector('.decide-feita [data-track-wa]').getBoundingClientRect(); return { titulo: document.querySelector('.decide-feita .decide-title').innerText, alto: t.top < innerHeight * 0.35, previa: !!pv && !!pv.querySelector('.mcard-nome') && !pv.querySelector('.mcard-btn, .mcard-wa, .mcard-fav'), ordem: t.bottom <= pv.getBoundingClientRect().top + 1 && pv.getBoundingClientRect().bottom <= wa.top + 1 }; });
  ok(p3.titulo === 'Sua escolha' && p3.alto && p3.previa && p3.ordem, 'passo 3: "Sua escolha" no alto, a mini prévia da academia e, embaixo, os contatos — ' + JSON.stringify(p3));
  // Regra 200: ver a ficha e sair dela volta à tela da escolha (pelo botão do site e pelo voltar do celular).
  await page.click('#decide-overlay [data-decide-ficha] >> nth=0');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.page === 'court'), '"Ver a ficha no site" abre a ficha');
  await page.evaluate(() => document.getElementById('court-back')?.click() || document.querySelector('[data-voltar-ficha]')?.click());
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.page === 'comparar' && !!document.querySelector('.decide-feita .mcard-previa')), 'sair da ficha volta à tela da escolha');
  await page.click('#decide-overlay [data-decide-ficha] >> nth=0');
  await page.waitForTimeout(300);
  await page.goBack();
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => state.page === 'comparar' && !!document.querySelector('.decide-feita')), 'o voltar do celular também volta à tela da escolha');
  await page.click('#decidida-voltar');
  await page.waitForTimeout(100);
  ok(await page.evaluate(() => !!document.querySelector('#decide-overlay #decide-go') && state.decidida === null), '"Escolher novamente" volta ao começo');
  await page.click('#decide-close');
  await page.evaluate(() => render());
  ok(await page.evaluate(() => !document.getElementById('decide-push')), 'depois de usado, o aviso não volta');
  await browser.close();

  ({ browser, page } = await abrir());
  await page.evaluate(() => { setCompareList(state.allCourts.slice(0, 2).map(c => c.id)); state.page = 'comparar'; render(); });
  ok(!(await page.isVisible('#decide-push')), 'logo ao abrir a comparação, sem aviso');
  await page.waitForTimeout(15600);
  ok(await page.isVisible('#decide-push'), 'depois de 15 segundos na comparação, o aviso aparece');
  await browser.close();

  // ---- Minhas quadras: a mais perto primeiro (favoritas na conta) ----
  ({ browser, page } = await abrir({ jogador: true }));
  t = await page.evaluate(() => {
    gravarLocal(PUSH_VIAGEM_KEY, Date.now());
    gravarNaConta('favoritas', ['a1', 'a2']);
    state.favorites = loadFavorites();
    state.origin = { lat: -23.601, lng: -46.661, bairro: 'Moema', cidade: 'São Paulo' };
    state.lista = 'favoritas'; render();
    return { nomes: [...document.querySelectorAll('#lista-overlay .lista-linha strong')].map(e => e.textContent), ordem: document.querySelector('.lista-ordem')?.innerText || '' };
  });
  ok(t.nomes[0] === 'Quadra Locação' && t.ordem.includes('mais perto'), 'Favoritas: a mais perto primeiro, com a distância — ' + t.nomes.join(' | '));
  t = await page.evaluate(() => {
    state.origin = null;
    localStorage.setItem(ULTIMA_BUSCA_KEY, JSON.stringify({ lat: -23.561, lng: -46.681, bairro: 'Pinheiros', cidade: 'São Paulo' }));
    render();
    return [...document.querySelectorAll('#lista-overlay .lista-linha:not(.lista-busca) strong')].map(e => e.textContent);
  });
  ok(t[0] === 'Só Aula Tennis', 'sem busca aberta, vale a última busca — ' + t.join(' | '));
  await browser.close();

  // ---- parceiros ----
  ({ browser, page } = await abrir({ q: 'parceiros' }));
  t = await page.evaluate(() => ({
    botao: document.querySelector('.pc-como-fim .cta-btn')?.innerText.replace(/\s+/g, ' ').trim(),
    centro: getComputedStyle(document.querySelector('.pc-como-fim')).textAlign,
    anim: getComputedStyle(document.querySelector('.pc-como-fim .cta-btn')).animationName,
    premium: [...document.querySelectorAll('.pc-beneficio')].find(b => b.innerText.includes('quantos jogadores'))?.innerText.replace(/\s+/g, ' ') || '',
    planos: [...document.querySelectorAll('.pc-plano-lista li:first-child')].map(li => li.innerText.trim()),
    alunos: /alun/i.test(document.body.innerText),
  }));
  ok(t.botao === 'Começar agora grátis' && t.centro === 'center' && t.anim === 'gratisPulsa', '"Começar agora — é de graça!" no meio e pulsando — ' + t.botao);
  ok(/só no premium/i.test(t.premium) && t.premium.includes('ficam escondidos') && t.premium.includes('aparecem em Desempenho'), 'o card dos números explica que eles aparecem no Premium');
  ok(t.planos.join(' | ') === '1 e-mail com acesso à academia | Até 5 e-mails com acesso à academia | Até 10 e-mails com acesso à academia', 'planos: "1 e-mail" e "5 e-mails" com acesso — ' + t.planos.join(' | '));
  ok(!t.alunos, 'a página dos parceiros fala de jogadores, não só de alunos');
  await browser.close();
})();
