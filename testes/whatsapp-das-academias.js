// As academias no WhatsApp (regra 208, pedido do Breno em 05/11/2026): ao
// lado do "Salvar busca", na comparação e nas Favoritas, "Mandar para o meu
// WhatsApp" (a lista com o link de cada ficha), "Falar com todas" (a mesma
// mensagem, enviada uma por uma) e "Salvar os contatos" (um .vcf).
const { abrir, ok } = require('./harness');
// Regra 264: na busca, os atalhos ficam no menu "WhatsApp" ao lado do "Salvar busca".
const abrirMenuWa = (page) => page.evaluate(() => { const d = document.querySelector('.busca-salvar .wa-mais'); if (d) d.open = true; });

(async () => {
  let { browser, page } = await abrir({ q: '?busca=05422-000' });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    window.__abertos = [];
    window.open = (u) => { window.__abertos.push(u); return null; };
    // Os links do WhatsApp não saem da página no teste.
    document.addEventListener('click', e => { const a = e.target.closest('[data-wa-enviar]'); if (a) { window.__waHref = a.href; e.preventDefault(); } });
    const criar = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (b) => { b.text().then(t => { window.__vcf = t; }); return criar(b); };
  });

  // ---- Na busca, junto do "Salvar busca" ----
  let t = await page.evaluate(() => {
    const linha = document.querySelector('.busca-salvar');
    return { lista: !!linha?.querySelector('[data-wa-lista]'), salvar: !!linha?.querySelector('#salvar-busca'), varias: linha?.querySelector('[data-wa-varias]')?.innerText || '', contatos: !!linha?.querySelector('[data-wa-contatos]') };
  });
  ok(t.lista && t.salvar && t.contatos, 'na busca, os botões do WhatsApp ficam na linha do "Salvar busca"');
  await abrirMenuWa(page);
  await page.click('.busca-salvar [data-wa-lista]');
  await page.waitForTimeout(200);
  t = await page.evaluate(() => ({ url: decodeURIComponent((window.__abertos[0] || '').replace('https://wa.me/?text=', '')), push: document.querySelector('.gt-push')?.innerText || '' }));
  ok(t.url.startsWith('Quadras de tênis') && t.url.includes('(GuiaTennis)') && t.url.includes('1. ') && t.url.includes('/academia/') && t.url.includes('Ver todas, atualizadas:'), 'a lista vai para o WhatsApp com o link de cada ficha e o da busca — ' + t.url.slice(0, 140).replace(/\n/g, ' / '));
  ok(t.push.includes('escolha') && t.push.includes('Você'), 'o aviso diz para escolher "Você" no WhatsApp');
  // Regra 209: cada academia da lista conta, e o link leva a origem.
  t = await page.evaluate(() => ({ n: (window.__cliques || []).filter(c => c.tipo === 'lista_whatsapp').length, url: decodeURIComponent(window.__abertos[0] || '') }));
  ok(t.n >= 2 && t.url.includes('utm_source=WhatsApp-lista'), 'cada academia da lista conta "lista_whatsapp", e o link da ficha leva a origem — ' + t.n);

  // ---- Falar com todas ----
  await abrirMenuWa(page);
  const varias = await page.$('.busca-salvar [data-wa-varias]');
  if (varias) {
    await varias.click();
    await page.waitForTimeout(200);
    t = await page.evaluate(() => ({
      titulo: document.querySelector('#wa-varias-overlay .sheet-title')?.innerText || '',
      linhas: document.querySelectorAll('#wa-varias-overlay .wa-varias-linha').length,
      texto: document.getElementById('wa-varias-texto')?.value || '',
      prontas: [...document.querySelectorAll('[data-wa-pronta]')].map(b => b.innerText),
    }));
    ok(t.titulo.startsWith('Falar com') && t.linhas >= 2 && t.linhas <= 5 && t.texto.includes('iniciante') && t.texto.includes('Melhor dia e horário: ') && t.prontas.length === 4, 'a folha "Falar com…": até 5 academias, a mensagem pronta e as opções — ' + t.titulo);
    await page.click('[data-wa-pronta="2"]');
    ok((await page.inputValue('#wa-varias-texto')).includes('locação'), 'a opção pronta troca a mensagem');
    await page.fill('#wa-varias-texto', 'Tem horário no sábado de manhã?');
    const primeira = await page.$('[data-wa-enviar]');
    const id = await primeira.getAttribute('data-wa-enviar');
    await primeira.click();
    await page.waitForTimeout(450);
    t = await page.evaluate((id) => ({
      href: decodeURIComponent(window.__waHref || ''), nome: state.allCourts.find(c => c.id === id).name,
      conta: document.getElementById('wa-varias-conta')?.innerText || '', ok: document.querySelector(`[data-wa-enviar="${id}"]`)?.innerText || '',
      clique: (window.__cliques || []).some(c => c.academia_id === id && c.tipo === 'whatsapp'),
    }), id);
    ok(t.href.includes(`Olá, ${t.nome}! Vim pelo GuiaTennis. Tem horário no sábado de manhã?`), 'cada academia recebe a mesma mensagem, com o nome dela no começo — ' + t.href.split('text=')[1]);
    ok(t.ok.includes('Enviada') && t.conta.startsWith('1 de'), 'a enviada fica marcada e a conta mostra quantas foram — ' + t.conta);
    ok(t.clique, 'o envio conta como o WhatsApp da academia');
    await page.click('#wa-varias-close');
    ok(!(await page.$('#wa-varias-overlay')), 'o ✕ fecha a folha');
  } else ok(false, 'a busca tem "Falar com…" (há academias com WhatsApp)');

  // ---- Salvar os contatos ----
  await abrirMenuWa(page);
  await page.click('.busca-salvar [data-wa-contatos]');
  await page.waitForTimeout(300);
  t = await page.evaluate(() => window.__vcf || '');
  ok((t.match(/BEGIN:VCARD/g) || []).length >= 1 && /TEL;TYPE=CELL:\+55\d{10,11}/.test(t) && /FN:.+ · GuiaTennis/.test(t) && t.includes('/academia/') && t.includes('END:VCARD'), 'o cartão de contato (.vcf) com o WhatsApp, o nome e o link da ficha de cada academia');
  t = await page.evaluate(() => (window.__cliques || []).filter(c => c.tipo === 'contato_salvo').length);
  ok(t >= 1 && (await page.evaluate(() => (window.__vcf || '').includes('utm_source=Contato-salvo'))), 'cada contato salvo conta "contato_salvo", e o link do contato leva a origem');
  await browser.close();

  // ---- Na comparação e nas Favoritas ----
  ({ browser, page } = await abrir({ jogador: true }));
  await page.waitForTimeout(500);
  t = await page.evaluate(() => {
    const ids = state.allCourts.filter(c => whatsappDe(c.phone)).slice(0, 2).map(c => c.id);
    setCompareList(ids); state.page = 'comparar'; render();
    const cmp = { lista: !!document.querySelector('.cmp-pagina [data-wa-lista]'), varias: !!document.querySelector('.cmp-pagina [data-wa-varias]'), contatos: !!document.querySelector('.cmp-pagina [data-wa-contatos]') };
    ids.forEach(id => { if (!isFavorite(id)) toggleFavorite(id); });
    state.page = 'home'; state.lista = 'favoritas'; render();
    const fav = { lista: !!document.querySelector('#lista-overlay [data-wa-lista]'), varias: !!document.querySelector('#lista-overlay [data-wa-varias]') };
    return { cmp, fav, texto: textoDaListaNoWhatsapp('favoritas') };
  });
  ok(t.cmp.lista && t.cmp.varias && t.cmp.contatos, 'na comparação, os três botões');
  ok(t.fav.lista && t.fav.varias && t.texto.startsWith('Minhas academias de tênis favoritas'), 'nas Favoritas também');
  await browser.close();

  // ---- O Desempenho mostra quantos guardaram (regra 209) ----
  for (const plano of ['completo', 'premium']) {
    ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/desempenho', plano }));
    await page.waitForTimeout(700);
    t = await page.evaluate(() => document.querySelector('#parceiros .pc-main, #parceiros')?.innerText || '');
    // Regra 210: no Completo, só o comum (acessos e contatos); o resto é do Premium.
    ok(plano === 'completo'
      ? !/salvaram o contato no celular|Salvaram o contato|Mandaram para o próprio WhatsApp/.test(t) && t.includes('Quantos salvaram o contato') && t.includes('contatos pelo WhatsApp')
      : t.includes('Salvaram o contato') && t.includes('Mandaram para o próprio WhatsApp'),
      plano === 'completo' ? 'Completo: só acessos e contatos; quantos salvaram o contato aparece como do Premium' : 'Premium: o Desempenho mostra quantos salvaram o contato e mandaram para o próprio WhatsApp');
    await browser.close();
  }

  console.log('\nwhatsapp-das-academias.js: fim');
})();
