// Pedido do Breno em 26/10/2026, com prints da página de hotel do hoteis.com
// no celular: "deixe as fichas das academias exatamente com esse layout, com
// ordem, tamanho das fotos e atalhos. adaptando com as nossas fontes, cores e
// conteúdo, sem tirar nenhum da ficha, mas deixar todas informações".
const { abrir, ok } = require('./harness');

const foto = (cor) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="${cor}"/></svg>`);
const FOTOS = ['#2e7d5b', '#1F4D3D', '#7a5c2e', '#3a6ea5', '#5b3a7a'].map(foto);
const LONGO = 'Professores excelentes e quadras muito bem cuidadas. Recomendo para quem está começando, o atendimento na recepção é rápido e o vestiário é limpo. Voltarei com certeza.';

async function fichaCheia(page, extra) {
  await page.evaluate(async ({ fotos, extra }) => {
    const a = window.__db.academias.find(x => x.id === 'a1');
    Object.assign(a, { photos: fotos, price_aula: '150-200', price_locacao: '90-120', modalidades: ['aulas_proprias', 'locacao'], instagram: '@soaula', site: 'https://soaula.com.br',
      amenities: ['raquete', 'estacionamento_gratuito', 'vestiario', 'lanchonete', 'wifi', 'agua', 'loja'], quadras: { saibro_coberta: 2, rapida_descoberta: 3 },
      pisos: ['saibro', 'rapida'], cobertura: ['coberta', 'descoberta'], plano: 'premium', confirmada: true }, extra || {});
    await loadEverything();
    openCourt('a1');
  }, { fotos: FOTOS, extra });
  await page.waitForTimeout(400);
}

(async () => {
  const avaliacoes = [
    { id: 'r1', academia_id: 'a1', stars: 5, comment: LONGO, created_at: '2026-10-18T10:00:00Z', status: 'published' },
    { id: 'r2', academia_id: 'a1', stars: 4, comment: 'Ótimo atendimento.', created_at: '2026-10-10T10:00:00Z', status: 'published' },
    { id: 'r3', academia_id: 'a1', stars: 5, comment: 'Lugar incrível.', created_at: '2026-09-10T10:00:00Z', status: 'published' },
  ];
  let { browser, page } = await abrir({ w: 412, avaliacoes, promocoes: [{ id: 'p1', academia_id: 'a1', titulo: 'Primeira aula grátis', detalhes: 'Para quem nunca jogou aqui.', valida_ate: '2099-12-31' }] });
  await fichaCheia(page);

  // ---- capa: quadrada, de ponta a ponta, com os botões brancos por cima ----
  let r = await page.evaluate(() => {
    const capa = document.querySelector('.ht-capa');
    const f = document.getElementById('ht-capa-fotos').getBoundingClientRect();
    const barra = document.getElementById('courtbar').getBoundingClientRect();
    return {
      visivel: !!capa && getComputedStyle(capa).display !== 'none', galeria: getComputedStyle(document.querySelector('.ht-gal')).display,
      w: f.width, h: f.height, left: f.left, fotos: document.querySelectorAll('.ht-capa-foto').length,
      pontos: document.querySelectorAll('#ht-capa-pontos span').length, total: document.getElementById('ht-capa-total').innerText.trim(),
      voltar: !!document.querySelector('.ht-capa [data-voltar-ficha]'), comparar: !!document.querySelector('.ht-capa [data-compare="a1"]'),
      compartilhar: !!document.querySelector('.ht-capa [data-share-court="a1"]'), favoritar: !!document.querySelector('.ht-capa [data-fav="a1"]'),
      barraFora: barra.bottom <= 1,
    };
  });
  ok(r.visivel && r.galeria === 'none' && r.left === 0 && Math.round(r.w) === 412 && Math.abs(r.h - r.w) < 2, 'no celular, a capa quadrada de ponta a ponta no lugar do mosaico — ' + Math.round(r.w) + 'x' + Math.round(r.h));
  ok(r.fotos === 5 && r.pontos === 5 && r.total === '5', 'todas as fotos passam na capa, com os pontinhos e o número de fotos');
  ok(r.voltar && r.comparar && r.compartilhar && r.favoritar, 'voltar, comparar, compartilhar e favoritar em cima da foto');
  ok(r.barraFora, 'com a capa na tela, a barra de cima fica escondida');

  await page.evaluate(() => { const f = document.getElementById('ht-capa-fotos'); f.scrollLeft = f.clientWidth * 2; });
  await page.waitForTimeout(200);
  r = await page.evaluate(() => ({ on: [...document.querySelectorAll('#ht-capa-pontos span')].findIndex(s => s.classList.contains('on')), abre: document.getElementById('ht-capa-total').dataset.lightboxOpen }));
  ok(r.on === 2 && r.abre === '2', 'passar a foto acende o pontinho dela, e o número de fotos abre nela');

  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(350);
  r = await page.evaluate(() => { const b = document.getElementById('courtbar'); const cs = getComputedStyle(b); return { visivel: b.classList.contains('visivel'), topo: Math.round(b.getBoundingClientRect().top), texto: b.innerText.trim(), fundo: cs.backgroundColor, desfoque: cs.backdropFilter || cs.webkitBackdropFilter || '' }; });
  ok(r.visivel && r.topo === 0, 'depois da capa, a barra com voltar e os atalhos desce');
  // Pedido de 26/10/2026: sem o nome na barra, nem descendo, e quase transparente.
  ok(!r.texto.includes('Só Aula Tennis') && !(await page.$('.courtbar-name')), 'a barra de cima não tem o nome da academia — "' + r.texto + '"');
  ok(/rgba\(247, 244, 236, 0\.8\)/.test(r.fundo) && r.desfoque.includes('blur'), 'a barra quase transparente, no creme da ficha, com o desfoque — ' + r.fundo + ' ' + r.desfoque);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);

  // ---- topo no meio, com os atalhos sublinhados e os ✓ verdes ----
  r = await page.evaluate(() => {
    const head = document.querySelector('.ht-head');
    return {
      meio: getComputedStyle(head).textAlign, estrelas: !!head.querySelector('.ht-estrelas [data-info-pop="estrelas"]'),
      mapa: head.querySelector('[data-nav="a1"]')?.innerText.trim(), nota: document.getElementById('ir-avaliacoes').innerText.replace(/\s+/g, ' ').trim(),
      checks: [...head.querySelectorAll('.ht-check')].map(x => x.innerText.trim()), endereco: head.querySelector('.court-addr').innerText,
      abas: getComputedStyle(document.getElementById('ht-tabs')).display,
    };
  });
  ok(r.meio === 'center' && r.estrelas && r.mapa === 'Ver no mapa' && r.nota === '4,7 3 avaliações', 'nome no meio, estrelas com ⓘ, "Ver no mapa" e a nota com "3 avaliações" — ' + r.nota);
  ok(r.checks.join('|') === 'Aula e locação|5 quadras|Saibro e Rápida|Coberta e Descoberta' && r.endereco.includes('Rua A, 1 - Pinheiros'), 'embaixo do nome, os ✓ verdes com o que a academia tem — ' + r.checks.join(', '));
  ok(r.abas === 'none', 'no celular, sem a barra de abas (como no hoteis.com)');
  await page.click('[data-info-pop="estrelas"]');
  await page.waitForTimeout(100);
  ok((await page.evaluate(() => document.querySelector('.ht-estrelas .info-pop')?.innerText || '')).includes('Como funcionam as avaliações'), 'o ⓘ das estrelas explica como funcionam as avaliações');
  await page.evaluate(() => { state.infoPop = null; render(); });

  // ---- a ordem do hoteis.com, sem tirar nada ----
  r = await page.evaluate(() => [...document.querySelectorAll('.ht-sections > .ht-sec')].map(s => s.id || s.className.replace('ht-sec ', '')).join(','));
  // O contato logo depois das opções (26/10/2026: "os contatos pode deixar
  // mais acima"); o "é o responsável?" e o "Algo errado" seguem no fim.
  ok(r === 'ht-sec-destaques,ht-comodidades,ht-local,ht-visao,ht-opcoes,ht-contato,avaliacoes,ht-perto,ht-horario,ht-politica,ht-duvidas,ht-sec-fim',
    'destaques, estrutura, região, "Sobre" com fotos, opções, contato, avaliações, academias por perto, horário, cancelamento, dúvidas e o fim — ' + r);
  const fim = await page.evaluate(() => ({ fim: document.querySelector('.ht-sec-fim')?.innerText || '', contato: document.getElementById('ht-contato').innerText }));
  // O "Confirmada pela academia" volta para o fim (27/10/2026: "deixe isso no
  // final, era só os contatos mais para cima").
  ok(fim.fim.includes('Confirmada pela academia') && fim.fim.includes('É o responsável por esta academia?') && fim.fim.includes('Algo errado nesta ficha?')
    && fim.contato.includes('Chamar no WhatsApp') && !fim.contato.includes('Confirmada pela academia') && !/Premium/.test(fim.fim),
    'o contato só com os botões; no fim, "Confirmada pela academia" (sem o nome do plano), "é o responsável?" e "Algo errado"');
  ok(await page.evaluate(() => document.querySelector('.ht-sec-fim')?.firstElementChild?.id === 'ficha-confirmacao'), 'a confirmação abre o fim da ficha, como antes');
  r = await page.evaluate(() => document.querySelector('.courtpage').innerText);
  const tudo = ['Estacionamento grátis', 'Vestiário', 'Loja de materiais', 'Wi-Fi', 'Lanchonete', 'Água grátis', 'Empréstimo de raquete', '2x Saibro coberta', '3x Rápida descoberta',
    'Portão preto', 'Avise na portaria', 'Ver todas as academias em Pinheiros', 'Quem avaliou elogia', 'Primeira aula grátis', 'Segunda a sexta', 'Domingo',
    'Desmarcou até 24h antes', 'Cobra metade.', 'Quanto custa jogar em Só Aula Tennis?', 'Ver site', '@soaula', 'Compartilhar', 'Confirmada pela academia',
    'Gerencie a ficha no GuiaTennis Parceiros', 'Informar um problema', 'Como funcionam as avaliações', 'Já jogou aqui? Avalie essa quadra', 'Outras academias por perto', 'Quadra Locação'];
  const faltam = tudo.filter(t => !r.includes(t));
  ok(!faltam.length, 'nada saiu da ficha — ' + (faltam.join(', ') || 'tudo lá'));

  r = await page.evaluate(() => ({
    destaques: document.querySelectorAll('.ht-destaque .ht-destaque-ic').length,
    colunas: getComputedStyle(document.querySelector('#ht-comodidades .ht-amen')).gridTemplateColumns.split(' ').length,
    mapa: !!document.querySelector('.ht-map-caixa .ht-map-abrir[data-nav="a1"]'),
    fotosNoMeio: document.querySelectorAll('#ht-visao img, #ht-visao [data-lightbox-open], #ht-local img, #avaliacoes img').length, sobre: !!document.querySelector('#ht-visao .ht-about'),
  }));
  ok(r.destaques === 4 && r.colunas === 2 && r.mapa, 'destaques com o ícone no círculo, estrutura em duas colunas e o mapa com o botão de abrir');
  // Sem foto no meio da ficha (27/10/2026: "igual na ficha dos hotéis.com,
  // não tem foto no meio da ficha, só tem foto em cima e sobre os quartos").
  ok(r.fotosNoMeio === 0 && r.sobre, '"Sobre a academia" só com o texto: foto só na capa e nos cartões das opções');

  // ---- opções: os cartões dos quartos, lado a lado ----
  r = await page.evaluate(() => {
    const c = [...document.querySelectorAll('#ht-quartos .ht-quarto')];
    const b = c.map(x => x.getBoundingClientRect());
    return {
      n: c.length, ladoALado: b.length === 2 && Math.abs(b[0].top - b[1].top) < 1 && b[1].left > b[0].right,
      nomes: c.map(x => x.querySelector('.ht-quarto-n').innerText).join(','), tag: c.map(x => x.querySelector('.ht-quarto-tag')?.innerText || '').join(','),
      verde: c.map(x => x.querySelector('.ht-quarto-verde')?.innerText || '').join(','),
      wa: c.map(x => decodeURIComponent(x.querySelector('a[data-track="whatsapp"]').getAttribute('href'))),
      contagem: document.querySelector('.ht-opcoes-n')?.innerText, caixas: [...document.querySelectorAll('.ht-caixa')].map(x => x.innerText.replace(/\s+/g, ' ').trim()),
    };
  });
  ok(r.n === 2 && r.ladoALado && r.nomes === 'Locação,Aula' && r.contagem === 'Mostrando 2 de 2 opções', 'locação e aula em dois cartões lado a lado, com o "Mostrando 2 de 2 opções"');
  ok(r.tag === 'Menor preço,' && r.verde === 'Reposição até 12h antes,Reposição até 24h antes', 'o mais em conta com "Menor preço" e a reposição de cada um em verde — ' + r.verde);
  ok(r.wa[0].includes('queria saber sobre alugar a quadra') && r.wa[1].includes('queria saber sobre as aulas'), 'o WhatsApp de cada cartão já fala daquela opção');
  // Sem a caixa de horário (27/10/2026: "não precisa selecionar um horário certo").
  ok(r.caixas.length === 1 && r.caixas[0] === 'A academia oferece Aula e locação · 5 quadras' && !(await page.$('#ir-horario')), 'só a caixa do que a academia oferece, sem a de horário — ' + r.caixas.join(' | '));
  ok(await page.evaluate(() => [...document.querySelectorAll('#ht-quartos .ht-quarto')].every(x => x.querySelector('.ht-quarto-foto img'))), 'os cartões das opções continuam com foto');
  await page.click('[data-opcao-filtro="Aula"]');
  await page.waitForTimeout(100);
  r = await page.evaluate(() => ({ n: document.querySelectorAll('#ht-quartos .ht-quarto').length, nome: document.querySelector('#ht-quartos .ht-quarto-n').innerText, contagem: document.querySelector('.ht-opcoes-n').innerText }));
  ok(r.n === 1 && r.nome === 'Aula' && r.contagem === 'Mostrando 1 de 2 opções', 'o filtro "Aula" deixa só a aula');
  await page.click('[data-opcao-filtro=""]');
  await page.waitForTimeout(100);
  ok(await page.evaluate(() => document.querySelectorAll('#ht-quartos .ht-quarto').length === 2), '"Todas" volta as duas');

  // ---- avaliações: a nota no alto e os cartões que passam ----
  r = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#ht-revs .ht-rev')].map(x => x.getBoundingClientRect());
    return { topo: document.querySelector('#avaliacoes .ht-sec-topo').innerText.replace(/\s+/g, ' ').trim(), n: cards.length, ladoALado: cards[1].left > cards[0].right - 1 && Math.abs(cards[0].top - cards[1].top) < 1,
      mais: document.querySelectorAll('#ht-revs [data-rev-mais]').length, link: document.getElementById('reviews-more').innerText.trim() };
  });
  ok(r.topo === 'Avaliações Excelente 4,7' && r.n === 3 && r.ladoALado, '"Avaliações" com "Excelente 4,7" e os cartões lado a lado — ' + r.topo);
  ok(r.mais === 1 && r.link === 'Ver todas as 3 avaliações', 'só a avaliação longa tem "Mostrar mais"; embaixo, "Ver todas as 3 avaliações"');
  await page.click('[data-rev-mais]');
  ok(await page.evaluate(() => document.querySelector('[data-rev-mais]').closest('.ht-rev').classList.contains('aberta') && document.querySelector('[data-rev-mais]').innerText === 'Mostrar menos'), '"Mostrar mais" abre o texto inteiro');
  await page.evaluate(() => { document.getElementById('ht-revs').scrollLeft = 360; });
  await page.waitForTimeout(300);
  r = await page.evaluate(() => { const antes = document.getElementById('ht-revs').scrollLeft; render(); return { antes, depois: document.getElementById('ht-revs').scrollLeft }; });
  ok(r.antes > 0 && r.depois === r.antes, 'a rolagem de lado não volta ao começo quando a tela redesenha — ' + JSON.stringify(r));
  await page.click('#reviews-more');
  await page.waitForTimeout(100);
  r = await page.evaluate(() => { const c = [...document.querySelectorAll('#ht-revs .ht-rev')].map(x => x.getBoundingClientRect()); return { lista: document.getElementById('ht-revs').classList.contains('ht-revs-lista'), empilhadas: c[1].top > c[0].bottom - 1, link: document.getElementById('reviews-more').innerText.trim() }; });
  ok(r.lista && r.empilhadas && r.link === 'Mostrar menos', '"Ver todas" põe as avaliações uma embaixo da outra');

  // ---- barra de baixo: o valor e o botão com o anel dourado ----
  r = await page.evaluate(() => { const b = document.querySelector('.court-cta'); const a = b.querySelector('a[data-track="whatsapp"]'); return { texto: a.innerText.trim(), anel: getComputedStyle(a).boxShadow, compartilhar: !!b.querySelector('#share-btn-2, [data-share-court]'), valor: b.querySelector('.court-cta-val').innerText }; });
  ok(r.texto === 'Chamar no WhatsApp' && /184, 147, 63/.test(r.anel) && !r.compartilhar && r.valor === 'R$ 90 a 120', 'barra de baixo com o valor e o WhatsApp de anel dourado; compartilhar fica no alto');

  // ---- voltar pelo botão da capa ----
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('.ht-capa [data-voltar-ficha]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.page !== 'court'), 'o ← da capa volta');

  // ---- no computador, o mosaico e as abas continuam ----
  await page.setViewportSize({ width: 1280, height: 900 });
  await fichaCheia(page);
  r = await page.evaluate(() => ({ capa: getComputedStyle(document.querySelector('.ht-capa')).display, galeria: getComputedStyle(document.querySelector('.ht-gal')).display, abas: [...document.querySelectorAll('#ht-tabs button')].map(b => b.innerText).join(',') }));
  ok(r.capa === 'none' && r.galeria === 'grid' && r.abas === 'Estrutura,Localização,Visão geral,Preços,Avaliações,Horário,Cancelamento,Dúvidas', 'no computador, o mosaico e as abas na ordem da ficha — ' + r.abas);
  await browser.close();

  // ---- sem foto: sem capa, e a barra de cima à vista ----
  ({ browser, page } = await abrir({ w: 412 }));
  await page.evaluate(() => { openCourt('a2'); });
  await page.waitForTimeout(300);
  r = await page.evaluate(() => ({ capa: !!document.querySelector('.ht-capa'), comCapa: document.querySelector('.courtpage').classList.contains('com-capa'), topo: Math.round(document.getElementById('courtbar').getBoundingClientRect().top), mosaico: !!document.querySelector('.ht-mosaico'), cartao: document.querySelectorAll('#ht-quartos .ht-quarto').length, foto: !!document.querySelector('.ht-quarto-foto') }));
  ok(!r.capa && !r.comCapa && r.topo === 0 && !r.mosaico, 'sem foto: sem capa e sem mosaico, a ficha começa na barra e no nome');
  ok(r.cartao === 1 && !r.foto, 'o cartão da opção sem foto não deixa espaço vazio');
  await browser.close();
})();
