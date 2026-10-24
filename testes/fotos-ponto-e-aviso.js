// Pedidos do Breno em 10/10/2026, com prints do cadastro no celular:
// 1) "quero que as fotos apareçam maiores";
// 2) "deixe esse aviso menor e se clicar explica mais em todas as abas";
// 3) "esse aviso deve aparecer quando for concluído sem as informações
//    obrigatórias, deixe uma descrição do que é o *";
// 4) "a localização no mapa não está exata conforme o número da rua";
// 5) "em comodidades que vão aparecer se não tiver o completo, dê a opção
//    para escolher quais serão apresentadas".
// Em 21/10/2026: "faça que é possível ordenar as fotos arrastando" e "tire o
// que aparecer de planos no cadastro" (o aviso do plano e a escolha das
// comodidades foram para a tela depois de confirmar a revisão).
const { abrir, ok, irParte, salvarFicha } = require('./harness');

const texto = (page, sel) => page.evaluate((sel) => (document.querySelector(sel)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const foto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

(async () => {
  // ---- edição no Básico (celular) ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha' });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const a = window.__db.academias.find(x => x.id === 'a1'); a.lat = -23.56; a.lng = -46.68; });
  await page.evaluate(async () => { await loadEverything(); render(); });
  await page.click('.editar-academia');
  await page.waitForTimeout(400);

  // 3) Sem tentar concluir, nada de "Falta preencher"; a legenda do * fica na parte.
  ok(!(await page.$('#reg-falta')), 'sem tentar concluir, o aviso do que falta não aparece');
  ok((await texto(page, '#register-overlay .reg-legenda')) === '* Obrigatório', 'Nome e endereço diz o que é o * — ' + await texto(page, '#register-overlay .reg-legenda'));

  // 4) O ponto no mapa: a ficha já tem um; arrastar grava o novo.
  ok(await page.$('#reg-ponto-mapa') && (await texto(page, '#reg-ponto-s')).startsWith('É o ponto que aparece hoje na ficha'), 'na edição, o mapa mostra o ponto de hoje, para arrastar');
  await page.evaluate(() => moverPontoDaFicha(-23.5612, -46.6815));
  ok((await texto(page, '#reg-ponto-s')) === '✓ Ponto ajustado por você.', 'arrastou: "Ponto ajustado por você"');

  // 1) Fotos grandes: a capa ocupa a largura; nada do plano em cima delas.
  await page.evaluate((foto) => { window.__form.photos = [1, 2, 3, 4, 5].map(() => foto); }, foto);
  await irParte(page, 'fotos');
  const fotos = await page.evaluate(() => {
    const capa = document.querySelector('.reg-foto.capa'), outra = document.querySelectorAll('.reg-foto')[1], caixa = document.querySelector('#register-overlay .reg-passo');
    return { n: document.querySelectorAll('.reg-foto').length, fora: [...document.querySelectorAll('.reg-foto.fora')].map(f => f.innerText.replace(/\s+/g, ' ').trim()),
      capa: capa.getBoundingClientRect().width, outra: outra.getBoundingClientRect().width, largura: caixa.getBoundingClientRect().width, tag: capa.innerText };
  });
  ok(fotos.n === 5 && fotos.capa >= fotos.largura - 2 && fotos.outra >= fotos.largura / 2 - 12 && fotos.outra > 150,
    'a capa ocupa a largura e as outras ficam em duas colunas, bem maiores — ' + JSON.stringify(fotos));
  ok(fotos.tag.includes('Capa') && fotos.fora.length === 0 && !/plano|Básico/.test(await texto(page, '#register-overlay .reg-passo')), 'a primeira é a capa; nada do plano em cima das fotos (21/10/2026)');
  ok((await texto(page, '.reg-fotos-dica')) === 'Segure e arraste uma foto para mudar a ordem. A primeira é a capa.', 'diz que dá para arrastar');
  await page.evaluate(() => { window.__form.photos = window.__form.photos.map((p, i) => p + '#' + (i + 1)); render(); });
  await page.click('[data-photo-capa="3"]');
  const ordem = () => page.evaluate(() => window.__form.photos.map(p => p.split('#')[1]).join(''));
  ok((await ordem()) === '41235', '"Usar como capa" põe a foto em primeiro — ' + await ordem());

  // Arrastar com o mouse: a 5ª vai para o lugar da 2ª.
  const centro = (i) => page.evaluate((i) => { const r = document.querySelectorAll('.reg-foto')[i].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 3 }; }, i);
  let de = await centro(4), para = await centro(1);
  await page.mouse.move(de.x, de.y);
  await page.mouse.down();
  await page.mouse.move(de.x + 20, de.y - 10, { steps: 3 });
  await page.mouse.move(para.x, para.y, { steps: 8 });
  ok(await page.evaluate(() => !!document.querySelector('.reg-foto-fantasma') && document.querySelectorAll('.reg-foto.alvo').length === 1 && !!document.querySelector('.reg-foto.arrastando')),
    'arrastando: a foto segue o mouse e a de baixo fica marcada');
  await page.mouse.up();
  await page.waitForTimeout(150);
  ok((await ordem()) === '45123' && !(await page.$('.reg-foto-fantasma')), 'soltou: a 5ª entra no lugar da 2ª — ' + await ordem());

  // No toque: segurar um instante e arrastar; deslizar direto é rolar a tela.
  const toque = (tipo, x, y) => page.evaluate(([tipo, x, y]) => {
    const alvo = document.elementFromPoint(x, y) || document.body;
    alvo.dispatchEvent(new PointerEvent(tipo, { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true }));
  }, [tipo, x, y]);
  de = await centro(2); para = await centro(0);
  await toque('pointerdown', de.x, de.y);
  await toque('pointermove', de.x, de.y + 30);
  await toque('pointermove', para.x, para.y);
  await toque('pointerup', para.x, para.y);
  await page.waitForTimeout(100);
  ok((await ordem()) === '45123', 'deslizar o dedo sem segurar não muda a ordem (é a tela rolando)');
  de = await centro(2);
  await toque('pointerdown', de.x, de.y);
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => !!document.querySelector('.reg-foto-fantasma')), 'segurou: a foto solta da grade para arrastar');
  await toque('pointermove', para.x, para.y + 20);
  await toque('pointermove', para.x, para.y);
  await toque('pointerup', para.x, para.y);
  await page.waitForTimeout(150);
  ok((await ordem()) === '14523', 'soltou em cima da capa: a foto vira a capa — ' + await ordem());

  // 2) Nenhuma parte tem o aviso do plano (21/10/2026).
  let algum = [];
  for (const parte of ['quadras', 'contato', 'cancelamento', 'chegada']) { await irParte(page, parte); if (await page.$('#reg-plano-aviso')) algum.push(parte); }
  ok(!algum.length, 'nenhuma parte tem o aviso do plano — ' + algum.join());

  // 5) Comodidades: escolher as 3 que aparecem no Básico, na tela depois de confirmar.
  await irParte(page, 'quadras');
  for (const k of ['wifi', 'vestiario', 'loja']) await page.click(`.reg-amenity[data-amenity="${k}"]`);
  ok(!(await page.$('#reg-destaques')), 'nas Quadras, a escolha não aparece mais, mesmo com 5 marcadas');
  await irParte(page, 'revisar');
  await salvarFicha(page);
  await page.waitForTimeout(300);
  ok(await page.isVisible('#reg-erro') && await page.isVisible('#reg-destaques'), 'depois de confirmar, a escolha vem junto do que o Básico esconde');
  let escolhidas = await page.evaluate(() => [...document.querySelectorAll('.reg-destaque.active')].map(b => b.dataset.destaque).join());
  ok(escolhidas === 'raquete,estacionamento_gratuito,wifi' && (await texto(page, '.reg-destaques-n')) === '3 de 3 escolhidas.', 'com 5 marcadas, aparecem as 3 primeiras, para trocar — ' + escolhidas);
  await page.click('.reg-destaque[data-destaque="loja"]');
  ok((await texto(page, '#reg-destaques')).includes('Já são 3. Toque numa escolhida para tirar e depois escolha outra.'), 'com 3 escolhidas, pede para tirar uma antes');
  await page.click('.reg-destaque[data-destaque="raquete"]');
  ok((await texto(page, '.reg-destaques-n')).startsWith('2 de 3 escolhidas · com menos de 3'), 'tirou uma: 2 de 3, e diz o que acontece');
  await page.click('.reg-destaque[data-destaque="loja"]');
  escolhidas = await page.evaluate(() => window.__form.amenities.slice(0, 3).join());
  ok(escolhidas === 'estacionamento_gratuito,wifi,loja', 'as escolhidas vão para o começo da lista (a ficha mostra as primeiras) — ' + escolhidas);
  ok((await texto(page, '.reg-plano-perde li')).includes('Ficam de fora: Empréstimo de raquete, Vestiário'), 'e a lista diz quais ficam de fora — ' + await texto(page, '.reg-plano-perde li'));
  await page.click('#reg-plano-voltar');
  await page.waitForTimeout(150);
  await page.click('.reg-previa [data-previa="quadras"] .reg-previa-lapis');
  await page.waitForTimeout(150);
  await page.click('.reg-amenity[data-amenity="wifi"]');
  ok(await page.evaluate(() => !window.__form.__destaques.includes('wifi') && window.__form.amenities.length === 4), 'desmarcar a comodidade tira das escolhidas');
  await page.click('.reg-amenity[data-amenity="wifi"]');
  ok(await page.evaluate(() => window.__form.__destaques.includes('wifi')), 'marcar de novo, com vaga, entra nas escolhidas');

  // Salvar: o ponto arrastado e as comodidades escolhidas vão para o banco.
  await page.click('#reg-confirmar-revisao');
  await page.waitForTimeout(150);
  await salvarFicha(page);
  await page.waitForTimeout(300);
  await page.click('.reg-plano-basico');
  await page.waitForTimeout(900);
  const salvo = await page.evaluate(() => { const a = window.__db.academias.find(x => x.id === 'a1'); return { lat: a.lat, lng: a.lng, am: a.amenities.slice(0, 3).join(), ficha: (state.allCourts.find(x => x.id === 'a1') || {}).amenities.slice().sort().join() }; });
  ok(salvo.lat === -23.5612 && salvo.lng === -46.6815, 'salvou o ponto arrastado — ' + salvo.lat + ',' + salvo.lng);
  ok(salvo.am === 'estacionamento_gratuito,loja,wifi' && salvo.ficha === 'estacionamento_gratuito,loja,wifi', 'a ficha do Básico mostra as 3 escolhidas — ' + JSON.stringify(salvo));
  await browser.close();

  // ---- pedido pelo site: "Falta preencher" só ao concluir sem o obrigatório ----
  ({ browser, page } = await abrir({}));
  await page.evaluate(() => { window.__form = null; state.showRegister = true; state.registerStatus = 'idle'; render(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => { window.__form.name = 'Arena Teste'; window.__form.phone = '11999990000'; });
  await irParte(page, 'revisar');
  ok(!(await page.$('#reg-falta')), 'antes de concluir, sem o aviso');
  await page.evaluate(() => { window.__form.consent = true; });
  await salvarFicha(page);
  await page.waitForTimeout(300);
  const aviso = await texto(page, '#reg-falta-caixa');
  ok(aviso.startsWith('Para concluir, falta preencher: Nome e endereço*, Modalidade e preço* e Quadras*') && aviso.includes('* Obrigatório: sem isso, a ficha não pode ser enviada.'),
    'tentou concluir sem o obrigatório: o aviso lista só o obrigatório, com a legenda do * — ' + aviso);
  ok(!aviso.includes('Fotos') && !aviso.includes('Horário'), 'as partes opcionais não entram no aviso');
  await page.click('#reg-falta [data-reg-passo="1"]');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => document.querySelector('#register-overlay .reg-passo').dataset.passo === 'precos'), 'um toque leva até a parte');
  await page.evaluate(() => { window.__form.modalidades = ['locacao']; window.__form.quadras = { saibro_coberta: 1 }; Object.assign(window.__form, { address: 'Rua A', numero: '10', bairro: 'Pinheiros', cidade: 'São Paulo' }); render(); });
  ok(!(await page.$('#reg-falta')), 'preencheu o obrigatório: o aviso some');

  // 4) Pedido novo: "Ver no mapa" acha o ponto pelo endereço; o arrastado vai junto.
  await irParte(page, 'dados');
  ok((await texto(page, '#reg-ponto')).includes('Ver no mapa') && !(await page.$('#reg-ponto-mapa')), 'sem ponto ainda: "Ver no mapa"');
  await page.click('#reg-ponto-buscar');
  await page.waitForTimeout(500);
  ok(!!(await page.$('#reg-ponto-mapa')) && (await texto(page, '#reg-ponto-s')).length > 10, 'achou pelo endereço e mostra o mapa para conferir — ' + await texto(page, '#reg-ponto-s'));
  await page.evaluate(() => moverPontoDaFicha(-23.5701, -46.6902));
  await page.fill('#f-numero', '12');
  ok(await page.evaluate(() => window.__form.__lat === -23.5701), 'mudar o endereço não desfaz o ponto arrastado');
  await irParte(page, 'revisar');
  await page.evaluate(() => { saveVisitor({ nome: 'Rita Teste', contato: '11988887777' }); window.__form.__planoEscolhido = 'basico'; });
  await salvarFicha(page);
  await page.waitForTimeout(900);
  const nova = await page.evaluate(() => window.__db.academias.find(a => a.name === 'Arena Teste'));
  ok(nova && nova.lat === -23.5701 && nova.lng === -46.6902, 'o pedido vai com o ponto conferido — ' + (nova ? nova.lat + ',' + nova.lng : 'sem academia'));

  // 4) O ponto pelo número da porta: entre os resultados, vale o do mesmo número.
  const geo = await page.evaluate(async () => {
    const antes = window.fetch;
    window.fetch = async (u) => ({ ok: true, json: async () => String(u).includes('nominatim') ? [
      { lat: '-23.500', lon: '-46.600', address: { road: 'Rua A' } },
      { lat: '-23.511', lon: '-46.611', address: { road: 'Rua A', house_number: '120' } },
    ] : [] });
    try {
      const comNumero = await geocodeAddress('Rua A, 120, São Paulo, Brasil');
      const semNumero = await geocodeAddress('Rua A, 999, São Paulo, Brasil');
      const doForm = await geocodeFormAddress({ address: 'Rua A', numero: '120', cidade: 'São Paulo', cep: '05422000' });
      return { comNumero, semNumero, doForm };
    } finally { window.fetch = antes; }
  });
  ok(geo.comNumero.lat === -23.511 && geo.comNumero.exato, 'o resultado com o mesmo número vence o meio da rua');
  ok(geo.semNumero.lat === -23.5 && !geo.semNumero.exato, 'sem o número no mapa, fica o primeiro, marcado como não exato');
  ok(geo.doForm.lat === -23.511 && geo.doForm.exato, 'no formulário, a porta vem antes do centro do CEP');
  await browser.close();

  console.log('\nfotos-ponto-e-aviso.js: fim');
})();
