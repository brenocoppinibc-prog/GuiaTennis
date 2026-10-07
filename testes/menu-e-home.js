// Pedido do Breno em 01/10/2026: menu no jeito do trivago, home com a última
// busca, academias parecidas e as que a pessoa já chamou, preferências de
// busca (estado e depois cidade), sem o "+" da busca e o logo igual em todo
// lugar (três riscos saindo da raquete).
const { abrir, ok } = require('./harness');
const fs = require('fs'), path = require('path');

(async () => {
  let { browser, page } = await abrir();

  // ---- logo: um desenho só, com os três riscos ----
  const logos = await page.evaluate(() => {
    state.showMenu = true; render();
    const marcas = [...document.querySelectorAll('svg.logo-mark')];
    const riscos = marcas.map(m => m.querySelector('path[d^="M-242 8"]') ? 1 : 0);
    const ids = marcas.map(m => m.querySelector('linearGradient').id);
    const qr = qrSvg('https://guiatennis.com.br', 300);
    state.showMenu = false; render();
    return { n: marcas.length, riscos, idsUnicos: new Set(ids).size === ids.length, qr: qr.includes('M-242 8L-192 -29M-252 59L-192 16M-257 113L-192 64'), velho: qr.includes('M-330 -40') };
  });
  ok(logos.n >= 2 && logos.riscos.every(Boolean), 'cabeçalho e rodapé com o logo de três riscos — ' + logos.riscos.join(''));
  ok(logos.idsUnicos, 'cada logo na tela com o próprio degradê (ids diferentes)');
  ok(logos.qr && !logos.velho, 'o QR code usa o mesmo logo, com os três riscos');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const p404 = fs.readFileSync(path.join(__dirname, '..', '404.html'), 'utf8');
  ok(!html.includes('M-330 -40') && !p404.includes('M-330 -40'), 'o risco curvo do logo antigo não aparece em lugar nenhum');
  ok(p404.includes('M-242 8L-192 -29M-252 59L-192 16M-257 113L-192 64'), 'a página 404 tem o mesmo logo');

  // ---- sem o "+" na busca ----
  await page.evaluate(() => { state.page = 'search'; state.view = 'list'; render(); });
  ok(await page.evaluate(() => !document.getElementById('fab-add')), 'busca sem o "+" no canto');
  await page.evaluate(() => goHome());

  // ---- menu limpo, como o do Parceiros, com a conta do trivago (regra 68) ----
  const menu = await page.evaluate(() => {
    state.showMenu = true; render();
    const d = document.querySelector('#menu-overlay .menu-drawer');
    const grupos = [...d.querySelectorAll('.menu-grupo')].map(g => g.textContent.trim());
    const itens = [...d.querySelectorAll('.menu-item')].map(i => i.innerText.replace(/\s+/g, ' ').trim());
    const ordem = [...d.querySelectorAll('.menu-item, .menu-contato-i, .menu-links button')].map(i => i.innerText.replace(/\s+/g, ' ').trim());
    return { titulo: d.querySelector('.menu-titulo')?.innerText, marca: d.querySelector('.menu-topo .menu-marca')?.innerText, conta: d.querySelector('.menu-conta-topo')?.innerText.replace(/\s+/g, ' ').trim(), grupos, itens, ordem };
  });
  ok(!menu.titulo && menu.marca === 'GuiaTennis' && (menu.conta || '').startsWith('Entrar ou criar conta'), 'menu com a marca em cima e a conta logo abaixo, sem o título "Menu" — ' + menu.conta);
  ok(menu.grupos.join() === 'GuiaTennis,Minhas quadras,Preferências,Ajuda,Fale com a gente', 'grupos na ordem, com o contato por último — ' + menu.grupos.join(' | '));
  const pos = t => menu.ordem.findIndex(i => i.startsWith(t));
  ok(pos('Favoritas') > 0 && pos('Vistas recentemente') > 0 && pos('Academias que você chamou') > 0, 'favoritas, vistas e chamadas no menu');
  ok(pos('WhatsApp') > pos('GuiaTennis Parceiros') && pos('Privacidade') > pos('WhatsApp') && pos('Termos de Uso') > 0, 'contatos do GuiaTennis lá embaixo, e Termos e Privacidade como links pequenos');
  ok(menu.itens.some(i => i === 'Preferências de busca') && !menu.itens.some(i => /Escolher|Entrar$|Adicionar/.test(i)), 'na direita, só valor que diz algo (sem "Escolher", "Entrar", "Adicionar")');
  ok(!menu.itens.some(i => i.startsWith('Buscas salvas') || i.startsWith('Avisos por e-mail')), 'sem conta: sem "Buscas salvas" e "Avisos por e-mail" (a conta em cima leva a eles)');

  // ---- preferências: estado, depois cidade ----
  await page.click('[data-menu="preferencias"]');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.getElementById('pref-cidade').disabled), 'a cidade só abre depois do estado');
  await page.selectOption('#pref-uf', 'SP');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => !document.getElementById('pref-cidade').disabled && document.activeElement.id === 'pref-cidade'), 'escolheu o estado: o cursor vai para a cidade');
  await page.fill('#pref-cidade', 'são paulo');
  await page.selectOption('#pref-modalidade', 'locacao');
  await page.click('#pref-salvar');
  await page.waitForTimeout(300);
  const pref = await page.evaluate(() => ({ p: lerPreferencias(), mod: state.modalidadeFilters.join(), aberta: state.showPrefs }));
  ok(pref.p.uf === 'SP' && pref.p.cidade === 'São Paulo' && pref.p.modalidade === 'locacao' && !pref.aberta, 'salva estado, cidade (com o nome do guia) e o que procura — ' + JSON.stringify(pref.p));
  ok(pref.mod === 'locacao', 'o que a pessoa costuma procurar já vem escolhido na busca');
  const valor = await page.evaluate(() => { state.showMenu = true; render(); const v = [...document.querySelectorAll('.menu-item')].find(i => i.innerText.includes('Preferências de busca')).querySelector('.menu-valor').innerText; state.showMenu = false; render(); return v; });
  ok(valor === 'São Paulo, SP', 'menu mostra a cidade escolhida na direita — ' + valor);
  // "Pesquisar" sem digitar busca a cidade das preferências
  await page.evaluate(() => { state.cep = ''; render(); });
  await page.click('#search-btn');
  await page.waitForTimeout(700);
  const busca = await page.evaluate(() => ({ pagina: state.page, termo: state.termoBuscado, link: location.pathname }));
  ok(busca.pagina === 'search' && busca.termo === 'São Paulo' && busca.link === '/quadras/sao-paulo', 'Pesquisar sem digitar abre a cidade das preferências — ' + busca.link);
  await browser.close();

  // ---- a cidade é do estado escolhido (lista do IBGE, 03/10/2026) ----
  ({ browser, page } = await abrir());
  await page.evaluate(() => { localStorage.setItem(PREFERENCIAS_KEY, JSON.stringify({ uf: 'CE', cidade: 'São Paulo' })); abrirPreferencias(); });
  await page.waitForTimeout(400);
  let uf = await page.evaluate(() => ({ cidade: document.getElementById('pref-cidade').value, erro: document.querySelector('#pref-overlay .status-error')?.innerText || '', chips: [...document.querySelectorAll('[data-pref-cidade]')].map(b => b.innerText) }));
  ok(uf.cidade === '' && uf.erro.includes('São Paulo não fica em Ceará') && !uf.chips.length, 'Ceará com São Paulo (salvo antes): a cidade sai, o site diz por quê e não sugere São Paulo — ' + uf.erro);
  ok(await page.evaluate(() => [...document.querySelectorAll('#pref-cidades option')].map(o => o.value).join() === 'Fortaleza,Sobral'), 'no Ceará, a lista só tem cidades do Ceará');
  await page.fill('#pref-cidade', 'São Paulo');
  await page.click('#pref-salvar');
  await page.waitForTimeout(300);
  uf = await page.evaluate(() => ({ erro: document.querySelector('#pref-overlay .status-error')?.innerText || '', aberta: state.showPrefs }));
  ok(uf.erro.includes('não fica em Ceará') && uf.aberta, 'digitar São Paulo no Ceará não salva — ' + uf.erro);
  await page.fill('#pref-cidade', 'fortaleza');
  await page.click('#pref-salvar');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => lerPreferencias().cidade === 'Fortaleza' && lerPreferencias().uf === 'CE'), 'cidade do estado salva com o nome oficial (Fortaleza)');
  await page.evaluate(() => abrirPreferencias());
  await page.waitForTimeout(300);
  await page.selectOption('#pref-uf', 'SP');
  await page.waitForTimeout(300);
  uf = await page.evaluate(() => ({ cidade: document.getElementById('pref-cidade').value, chips: [...document.querySelectorAll('[data-pref-cidade]')].map(b => b.innerText).join() }));
  ok(uf.cidade === '' && uf.chips === 'São Paulo', 'trocar para São Paulo tira Fortaleza e sugere as cidades do guia em SP — ' + JSON.stringify(uf));
  await browser.close();

  // ---- home: última busca, parecidas e chamadas ----
  ({ browser, page } = await abrir());
  ok(await page.evaluate(() => !document.getElementById('home-vistas') && !document.getElementById('home-chamadas')), 'sem histórico, a home não mostra os blocos pessoais');
  await page.fill('#cep-input', 'Pinheiros');
  await page.evaluate(() => { state.pisoFilters = ['saibro']; });
  await page.click('#search-btn');
  await page.waitForTimeout(700);
  const ultima = await page.evaluate(() => lerUltimaBusca());
  ok(ultima && ultima.termo === 'Pinheiros' && ultima.bairro === 'Pinheiros' && ultima.pisos.join() === 'saibro' && ultima.lat === -23.56, 'a busca fica guardada no aparelho, com o ponto arredondado e os filtros');
  await page.evaluate(() => { openCourt('a1'); trackClick('a1', 'whatsapp'); openCourt('a2'); goHome(); });
  await page.waitForTimeout(300);
  const home = await page.evaluate(() => ({
    ordem: [...document.querySelectorAll('.home-sec')].map(s => s.id || s.querySelector('h3')?.innerText).slice(0, 4),
    primeiro: document.querySelector('#home-vistas .home-strip > *')?.innerText.replace(/\s+/g, ' ').trim(),
    linkBusca: document.querySelector('#home-vistas [data-refazer-busca]')?.getAttribute('href'),
    chamadas: [...document.querySelectorAll('#home-chamadas .mini')].map(m => m.querySelector('.mini-extra')?.innerText),
    parecidas: document.querySelector('#home-parecidas h3')?.innerText,
    sub: document.querySelector('#home-parecidas .home-sec-sub')?.innerText,
    badgeNumero: [...document.querySelectorAll('#home-vistas .mini-badge')].length,
  }));
  ok(home.ordem.join() === 'home-vistas,home-parecidas,home-chamadas,Recomendadas', 'home: vistas, parecidas com a busca e chamadas antes das recomendadas — ' + home.ordem.join(' | '));
  ok(home.primeiro.startsWith('Pinheiros, São Paulo') && home.primeiro.includes('Aulas e locação') && home.primeiro.includes('Saibro'), 'primeiro cartão das vistas é a última busca, como no trivago — ' + home.primeiro);
  ok(home.linkBusca === '/busca?q=Pinheiros&piso=saibro', 'o cartão da busca é um link de verdade — ' + home.linkBusca);
  ok(home.badgeNumero === 0, 'vistas sem selo com número');
  ok(home.parecidas === 'Com base na sua última busca' && home.sub === 'Academias perto de Pinheiros, São Paulo', 'bloco das parecidas com a última busca');
  ok(home.chamadas.length === 1 && /^Você chamou no WhatsApp · hoje$/.test(home.chamadas[0]), 'academia chamada aparece com o jeito e quando — ' + home.chamadas.join());
  // Um toque no cartão refaz a busca com os filtros
  await page.evaluate(() => { clearAllFilters(); state.cep = ''; render(); });
  await page.click('#home-vistas [data-refazer-busca]');
  await page.waitForTimeout(700);
  const refez = await page.evaluate(() => ({ pagina: state.page, termo: state.termoBuscado, piso: state.pisoFilters.join() }));
  ok(refez.pagina === 'search' && refez.termo === 'Pinheiros' && refez.piso === 'saibro', 'tocar na última busca refaz a busca com os mesmos filtros');

  // ---- Minhas quadras: abas e apagar ----
  await page.evaluate(() => { state.showMenu = true; render(); });
  await page.click('[data-menu="chamadas"]');
  await page.waitForTimeout(200);
  const lista = await page.evaluate(() => ({
    abas: [...document.querySelectorAll('.lista-aba')].map(a => a.innerText).join(),
    on: document.querySelector('.lista-aba.on')?.innerText,
    linhas: document.querySelectorAll('#lista-overlay .lista-linha').length,
  }));
  ok(lista.abas === 'Favoritas,Vistas,Chamadas' && lista.on === 'Chamadas' && lista.linhas === 1, 'Minhas quadras abre na aba escolhida');
  await page.click('#lista-limpar');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => lerChamadas().length === 0 && !!document.querySelector('.lista-vazia')), 'dá para apagar a lista de academias chamadas');
  await page.click('[data-lista="vistas"]');
  await page.click('#lista-limpar');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => !lerUltimaBusca() && loadRecents().length === 0), 'apagar o histórico tira as vistas e a última busca');
  const priv = await page.evaluate(() => PRIVACY_HTML);
  ok(priv.includes('as academias que você chamou, as preferências de busca') && priv.includes('as viagens que você guardar') && priv.includes('Não vão para o nosso banco de dados'), 'Política de Privacidade diz que isso fica só no aparelho');

  // A academia chamada fica no aparelho mesmo sem gravar no banco (admin)
  await browser.close();
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(() => { const antes = window.__db.cliques.length; trackClick('a2', 'instagram'); window.__antes = antes; });
  await page.waitForTimeout(200);
  const adm = await page.evaluate(() => ({ local: lerChamadas().map(x => x.id + ':' + x.tipo).join(), banco: window.__db.cliques.length - window.__antes }));
  ok(adm.local === 'a2:instagram' && adm.banco === 0, 'admin: a chamada fica na lista do aparelho, e o banco não recebe nada');
  await browser.close();
})();
