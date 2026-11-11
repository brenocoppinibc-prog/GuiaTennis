// Reserva online na ficha (pedido do Breno em 10/11/2026, regra 237: "eu
// queria poder implementar sistema de reserva para não perder para
// concorrentes, eu consigo trazer outro sistema e fazer que consigam
// visualizar no site?" ... "começar pelo 1 e 2"): o botão que abre o sistema
// da academia e a agenda dentro do GuiaTennis quando o sistema permite.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' '), sel);
const comReserva = (page, link, plano) => page.evaluate(async ([l, p]) => {
  const a = window.__db.academias.find(x => x.id === 'a1');
  Object.assign(a, { reserva_link: l, plano: p });
  await loadEverything();
  openCourt('a1');
}, [link, plano]);
// O convite "Vai viajar?" aparece depois de algumas telas e cobre a barra de baixo: fecha.
const semConvite = (page) => page.evaluate(() => { const f = document.getElementById('convite-viagem-fechar'); if (f) f.click(); });
const cliques = (page) => page.evaluate(() => window.__cliques.filter(c => c.tipo === 'reserva').length);

(async () => {
  // ---- O link: só https, inteiro ----
  let { browser, page } = await abrir({ w: 412 });
  const links = await page.evaluate(() => [
    linkDeReserva('  playtomic.io/arena-moema '), linkDeReserva('http://reservas.exemplo.com/a'), linkDeReserva('javascript:alert(1)'),
    linkDeReserva('arena'), linkDeReserva('https://a.com/' + 'x'.repeat(400)), linkDeReserva(''),
    (sistemaDaReserva('https://calendly.com/arena/quadra') || {}).nome, (sistemaDaReserva('https://calendar.google.com/calendar/appointments/schedules/abc') || {}).agenda,
    sistemaDaReserva('https://calendar.google.com/calendar/u/0/r'), sistemaDaReserva('https://playtomic.io/arena-moema'), sistemaDaReserva('https://calendly.com.golpe.com/x'),
  ]);
  ok(links[0] === 'https://playtomic.io/arena-moema' && links[1] === 'https://reservas.exemplo.com/a', 'o link ganha o https:// sozinho');
  ok(links[2] === '' && links[3] === '' && links[4] === '' && links[5] === '', 'o que não é link https inteiro (ou é longo demais) não entra');
  ok(links[6] === 'Calendly' && String(links[7]).includes('gv=true') && links[8] === null && links[9] === null && links[10] === null,
    'a agenda dentro do site só para os sistemas da lista (o endereço parecido não passa)');

  // ---- Básico: o botão não aparece (como o Instagram e o site) ----
  await comReserva(page, 'https://playtomic.io/arena-moema', 'basico');
  await page.waitForTimeout(400);
  ok(!(await page.$('[data-reservar]')) && await page.$('.court-cta [data-track="whatsapp"]'), 'no Básico a ficha fica só com o WhatsApp');

  // ---- Completo, sistema fora da lista: o botão abre em outra aba ----
  await comReserva(page, 'https://playtomic.io/arena-moema', 'completo');
  await page.waitForTimeout(400);
  const botoes = await page.$$eval('[data-reservar]', b => b.map(x => ({ t: x.innerText.trim(), href: x.getAttribute('href'), alvo: x.target, rel: x.rel, primario: x.classList.contains('cta-primary') })));
  ok(botoes.length >= 2 && botoes.every(b => b.href === 'https://playtomic.io/arena-moema' && b.alvo === '_blank' && b.rel.includes('noopener') && b.primario),
    '"Reservar online" no Contato e "Reservar" na barra de baixo, com o link da academia — ' + JSON.stringify(botoes.map(b => b.t)));
  const ordem = await page.$$eval('#ht-contato .cta-col > *', b => b.map(x => x.dataset.track || x.id || ''));
  ok(ordem[0] === 'reserva' && ordem[1] === 'whatsapp' && await page.$('#ht-contato [data-track="whatsapp"].cta-secondary') && await page.$('.ht-book [data-reservar] + [data-track="whatsapp"]'),
    'regra 241: "Reservar online" vem antes do WhatsApp, como o principal (Contato e cartão ao lado) — ' + ordem.join());
  ok(await page.$('.court-cta [data-reservar].cta-primary + [data-track="whatsapp"].cta-secondary'), 'na barra de baixo, "Reservar" principal e o WhatsApp ao lado');
  ok((await texto(page, '#ht-contato')).includes('A reserva online é feita no sistema da academia. O GuiaTennis não recebe o pagamento.'), 'a ficha diz que a reserva é no sistema da academia');
  const barra = await page.evaluate(() => { const b = document.querySelector('.court-cta'); return { t: b.innerText.replace(/\s+/g, ' '), larg: b.scrollWidth <= b.clientWidth + 1 }; });
  ok(barra.t.includes('WhatsApp') && barra.t.includes('Reservar') && barra.larg, 'a barra de baixo cabe no celular com os dois botões — ' + barra.t);
  await page.evaluate(() => { document.querySelectorAll('[data-reservar]').forEach(a => a.addEventListener('click', e => e.preventDefault())); });
  await page.click('#ht-contato [data-reservar]');
  await page.waitForTimeout(400);
  ok(await cliques(page) === 1 && !(await page.$('#reserva-janela')), 'o clique conta como "reserva" e não abre janela (o link abre em outra aba)');

  // ---- Sistema da lista: a agenda abre dentro do GuiaTennis ----
  await comReserva(page, 'https://calendly.com/arena-moema/quadra', 'premium');
  await page.waitForTimeout(400);
  ok(!(await page.$('#reserva-janela iframe')), 'a agenda não carrega antes do toque');
  await semConvite(page);
  await page.waitForTimeout(200);
  await page.click('.court-cta [data-reservar]');
  await page.waitForTimeout(500);
  const janela = await page.evaluate(() => { const f = document.querySelector('#reserva-janela iframe'); return f ? { src: f.src, sandbox: f.getAttribute('sandbox'), fora: !document.getElementById('app').contains(f), t: document.getElementById('reserva-janela').innerText.replace(/\s+/g, ' ') } : null; });
  ok(janela && janela.src.startsWith('https://calendly.com/arena-moema/quadra?') && janela.src.includes('embed_type=Inline') && janela.fora, 'a agenda do Calendly abre numa janela, fora do #app — ' + (janela && janela.src));
  ok(janela && !janela.sandbox.includes('allow-top-navigation') && janela.sandbox.includes('allow-forms'), 'a agenda não pode tirar a pessoa do GuiaTennis');
  ok(janela && janela.t.includes('Reservar · Só Aula Tennis') && janela.t.includes('A reserva é feita no Calendly, o sistema da academia') && janela.t.includes('Abrir em outra aba'), 'a janela diz de quem é a reserva e tem a saída "Abrir em outra aba"');
  ok(await cliques(page) === 2 && (await page.evaluate(() => location.search)).includes('reserva=1'), 'o clique conta e a janela entra no histórico');
  await page.evaluate(() => { window.__quadro = document.querySelector('#reserva-janela iframe'); render(); render(); });
  ok(await page.evaluate(() => window.__quadro === document.querySelector('#reserva-janela iframe')), 'o site redesenhar não recarrega a agenda no meio da reserva');
  await page.goBack();
  await page.waitForTimeout(500);
  ok(!(await page.$('#reserva-janela')) && await page.evaluate(() => state.page === 'court' && !location.search.includes('reserva')), 'o "voltar" fecha a janela e continua na ficha');
  await page.click('#ht-contato [data-reservar]');
  await page.waitForTimeout(400);
  await page.click('#reserva-fechar');
  await page.waitForTimeout(500);
  ok(!(await page.$('#reserva-janela')) && await page.evaluate(() => state.page === 'court'), 'o ✕ fecha a janela');
  await browser.close();

  // ---- Regra 242: no mapa e na lista, "Reservar online" se tiver; se não, o WhatsApp ----
  ({ browser, page } = await abrir({ w: 412 }));
  await page.evaluate(async () => {
    const a = window.__db.academias.find(x => x.id === 'a1');
    Object.assign(a, { reserva_link: 'https://calendly.com/arena-moema/quadra', plano: 'completo' });
    await loadEverything();
    state.cep = ''; goSearch(); await doSearch();
  });
  await page.waitForTimeout(700);
  const lista = await page.evaluate(() => [...document.querySelectorAll('[data-open], .offer')].map(x => x.querySelector('.offer-contact')).filter(Boolean)
    .map(a => ({ t: a.innerText.trim(), track: a.dataset.track, court: a.dataset.court, href: a.getAttribute('href') })));
  const daA1 = lista.find(x => x.court === 'a1'), outra = lista.find(x => x.court && x.court !== 'a1');
  ok(daA1 && daA1.track === 'reserva' && daA1.t.startsWith('Reservar online') && daA1.href.startsWith('https://calendly.com/') && outra && outra.track === 'whatsapp' && outra.t.startsWith('Falar no WhatsApp'),
    'na lista: "Reservar online" na academia com o link e "Falar no WhatsApp" nas outras — ' + JSON.stringify([daA1, outra].map(x => x && x.t)));
  await page.evaluate(() => { document.querySelectorAll('[data-reservar]').forEach(a => a.addEventListener('click', e => e.preventDefault())); window.__db.cliques.length = 0; });
  await page.click('.offer-contact[data-court="a1"]');
  await page.waitForTimeout(500);
  ok(await page.$('#reserva-janela iframe') && await page.evaluate(() => state.page === 'search' && window.__cliques.filter(c => c.tipo === 'reserva').length === 1), 'na lista, "Reservar online" abre a agenda sem sair da busca e conta o clique');
  await page.click('#reserva-fechar');
  await page.waitForTimeout(400);
  await page.evaluate(() => verNoMapaDoGuia('a1'));
  await page.waitForTimeout(800);
  const mapa = await page.evaluate(() => [...document.querySelectorAll('#map-carrossel [data-map-card]')].map(c => ({ id: c.dataset.mapCard, t: (c.querySelector('.mcard-wa') || {}).innerText || '', track: (c.querySelector('.mcard-wa') || { dataset: {} }).dataset.track })));
  const noMapaA1 = mapa.find(x => x.id === 'a1'), noMapaOutra = mapa.find(x => x.id !== 'a1' && x.t);
  ok(noMapaA1 && noMapaA1.track === 'reserva' && noMapaA1.t.trim() === 'Reservar online' && noMapaOutra && noMapaOutra.track === 'whatsapp', 'no mapa: "Reservar online" na academia com o link e o WhatsApp nas outras — ' + JSON.stringify(mapa.slice(0, 3)));
  await page.click('[data-map-card="a1"] .mcard-wa');
  await page.waitForTimeout(500);
  ok(await page.$('#reserva-janela iframe'), 'no mapa, "Reservar online" abre a agenda');
  await browser.close();

  // ---- A academia informa o link em Minha ficha › Contato ----
  ({ browser, page } = await abrir({ academia: 'a1', plano: 'completo', q: 'parceiros/ficha' }));
  await page.waitForTimeout(900);
  await page.evaluate(async () => { const a = window.__db.academias.find(x => x.id === 'a1'); a.plano = 'completo'; await loadEverything(); render(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button, a')].find(x => /Editar a ficha/.test(x.innerText)); if (b) b.click(); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const k = REG_PASSOS.findIndex(x => x.id === 'contato'); irParaPasso(k); });
  await page.waitForTimeout(300);
  ok(await page.$('#f-reserva') && (await texto(page, '.reg-reserva-dica')).includes('a agenda abre dentro do GuiaTennis'), 'a parte Contato tem "Link de reserva online", com a explicação');
  await page.fill('#f-reserva', 'arena');
  await page.evaluate(() => { const k = REG_PASSOS.findIndex(x => x.id === 'contato'); irParaPasso(k + 1, true); });
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.regPassoErro.includes('o link de reserva completo')), 'link incompleto: o site pede o link inteiro — ' + await page.evaluate(() => state.regPassoErro));
  await page.evaluate(() => { const k = REG_PASSOS.findIndex(x => x.id === 'contato'); state.regPassoErro = ''; irParaPasso(k); });
  await page.waitForTimeout(200);
  await page.fill('#f-reserva', 'calendly.com/arena-moema/quadra');
  ok(await page.evaluate(() => toRow(window.__form).reserva_link === 'https://calendly.com/arena-moema/quadra'), 'o link vai ao banco com https');
  ok(await page.evaluate(() => { const f = { ...window.__form, instagram: '', site: '' }; return oQueOPlanoEsconde(f, 'basico').some(i => /reserva online/i.test(i.t)); }), 'no Básico, a revisão avisa que a reserva online não aparece');
  await browser.close();

  // ---- Banco antes do SQL: o site lê sem a coluna e não quebra ----
  ({ browser, page } = await abrir({ semReserva: true }));
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => state.allCourts.length > 0 && state.allCourts.every(c => !c.reserva)), 'sem a coluna no banco, as academias aparecem e nenhuma tem reserva');
  await browser.close();

  // ---- Desempenho: o canal "Reserva online" ----
  ({ browser, page } = await abrir({ academia: 'a1', plano: 'premium', q: 'parceiros/desempenho' }));
  await page.waitForTimeout(1200);
  ok((await texto(page, '#app')).includes('Reserva online'), 'o Desempenho mostra o canal "Reserva online"');
  await browser.close();
})();
