// "Vou viajar" (pedido do Breno em 04/10/2026), como as "Próximas viagens"
// do Airbnb e do Booking: a viagem fica separada da cidade de casa; perto da
// data a home mostra o cartão, durante a viagem "Pesquisar" abre a cidade
// dela, e depois da volta tudo volta sozinho. Com o hotel, as quadras vêm da
// mais perto dele; o convite aparece para quem já está navegando.
const { abrir, ok } = require('./harness');

const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

(async () => {
  let { browser, page } = await abrir();
  await page.evaluate(() => { localStorage.setItem(PREFERENCIAS_KEY, JSON.stringify({ uf: 'CE', cidade: 'Fortaleza' })); state.showMenu = true; render(); });
  const item = await page.evaluate(() => [...document.querySelectorAll('.menu-item')].map(i => i.innerText.replace(/\s+/g, ' ').trim()).find(t => t.startsWith('Vou viajar')) || '');
  ok(item === 'Vou viajar Adicionar', 'menu › Minhas quadras tem "Vou viajar" — ' + item);
  await page.click('[data-menu="viagem"]');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => state.showViagem && document.getElementById('viagem-cidade').disabled), 'a folha abre, com a cidade esperando o estado');
  await page.selectOption('#viagem-uf', 'SP');
  await page.waitForTimeout(300);
  await page.fill('#viagem-cidade', 'Rio de Janeiro');
  await page.click('#viagem-salvar');
  await page.waitForTimeout(300);
  ok((await page.evaluate(() => document.querySelector('#viagem-overlay .status-error')?.innerText || '')).includes('não fica em São Paulo'), 'cidade de outro estado: avisa (lista do IBGE)');
  await page.fill('#viagem-cidade', 'são paulo');
  await page.fill('#viagem-ida', dia(5));
  await page.fill('#viagem-volta', dia(2));
  await page.click('#viagem-salvar');
  await page.waitForTimeout(200);
  ok((await page.evaluate(() => document.querySelector('#viagem-overlay .status-error')?.innerText || '')).includes('volta precisa ser depois'), 'volta antes da ida: avisa');
  await page.fill('#viagem-volta', dia(8));
  await page.click('#viagem-salvar');
  await page.waitForTimeout(300);
  let t = await page.evaluate(() => ({ salvo: lerViagens()[0], cartao: document.getElementById('viagem-cartao')?.innerText.replace(/\s+/g, ' ') || '', aviso: document.querySelector('.home-hero .conta-aviso')?.innerText || '' }));
  ok(t.salvo && t.salvo.cidade === 'São Paulo' && t.salvo.uf === 'SP', 'guarda a viagem com o nome oficial da cidade');
  ok(/sua próxima viagem/i.test(t.cartao) && t.cartao.includes('São Paulo, SP') && t.cartao.includes('2 academias para jogar lá') && t.aviso.includes('guardada'), 'a home mostra o cartão da próxima viagem, com as academias de lá — ' + t.cartao.slice(0, 80));
  await page.evaluate(() => render());
  ok(await page.evaluate(() => !document.querySelector('.home-hero .conta-aviso')), 'o aviso "guardada" aparece só uma vez');
  // Antes da viagem, "Pesquisar" ainda abre a cidade de casa.
  ok(await page.evaluate(() => cidadePadraoDaBusca()) === 'Fortaleza', 'antes da ida, Pesquisar continua abrindo a cidade de casa');
  // Durante a viagem, abre a cidade da viagem.
  await page.evaluate((d) => { const l = lerViagens(); l[0].ida = d[0]; l[0].volta = d[1]; gravarViagens(l); render(); }, [dia(-1), dia(2)]);
  t = await page.evaluate(() => ({ padrao: cidadePadraoDaBusca(), cartao: document.getElementById('viagem-cartao')?.innerText || '' }));
  ok(t.padrao === 'São Paulo' && /você está em viagem/i.test(t.cartao), 'durante a viagem: "Você está em viagem" e Pesquisar abre a cidade dela');
  await page.click('#viagem-cartao [data-viagem-ver]');
  await page.waitForTimeout(800);
  ok(await page.evaluate(() => state.page === 'search' && /são paulo/i.test(state.termoBuscado || state.cep || '')), '"Ver quadras" abre a busca na cidade da viagem');
  // Depois da volta, some sozinha.
  await page.evaluate((d) => { const l = JSON.parse(localStorage.getItem(VIAGENS_KEY)); l[0].ida = d[0]; l[0].volta = d[1]; localStorage.setItem(VIAGENS_KEY, JSON.stringify(l)); goHome(); }, [dia(-6), dia(-2)]);
  await page.waitForTimeout(200);
  t = await page.evaluate(() => ({ lista: lerViagens().length, cartao: !!document.getElementById('viagem-cartao'), padrao: cidadePadraoDaBusca() }));
  ok(t.lista === 0 && !t.cartao && t.padrao === 'Fortaleza', 'depois da volta, a viagem some e tudo volta para a cidade de casa');
  // Viagem longe (40 dias): fica guardada, mas a home não mostra ainda.
  await page.evaluate((d) => { gravarViagens([{ id: 1, uf: 'SP', cidade: 'São Paulo', ida: d[0], volta: d[1] }]); render(); }, [dia(40), dia(45)]);
  ok(await page.evaluate(() => !document.getElementById('viagem-cartao') && lerViagens().length === 1), 'viagem daqui a 40 dias: guardada, sem cartão ainda');
  // Sem data: o cartão fica até apagar; cidade sem academia sugere as mais perto.
  await page.evaluate(() => { gravarViagens([{ id: 2, uf: 'RJ', cidade: 'Niterói', ida: '', volta: '' }]); render(); });
  t = await page.evaluate(() => document.getElementById('viagem-cartao')?.innerText.replace(/\s+/g, ' ') || '');
  ok(t.includes('Niterói, RJ') && t.includes('Ainda não temos academias em Niterói') && t.includes('mais perto'), 'sem data: o cartão fica; cidade sem academia sugere as mais perto');
  await page.evaluate(() => abrirViagem());
  await page.waitForTimeout(200);
  await page.click('[data-viagem-apagar="2"]');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => lerViagens().length === 0), 'apagar tira a viagem');
  await browser.close();

  // Busca de outra cidade: pergunta se vai viajar.
  ({ browser, page } = await abrir());
  await page.evaluate(() => {
    localStorage.setItem(PREFERENCIAS_KEY, JSON.stringify({ uf: 'CE', cidade: 'Fortaleza' }));
    state.origin = { lat: -23.56, lng: -46.68, bairro: 'Pinheiros', cidade: 'São Paulo', uf: 'SP' };
    state.searchStatus = 'done'; state.page = 'search'; render();
  });
  t = await page.evaluate(() => document.getElementById('viagem-pergunta')?.innerText.replace(/\s+/g, ' ') || '');
  ok(t.includes('Vai viajar para São Paulo?') && t.includes('Guardar viagem'), 'buscou outra cidade: pergunta se vai viajar — ' + t.slice(0, 60));
  await page.click('#viagem-pergunta-sim');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => state.showViagem && window.__viagem.cidade === 'São Paulo' && window.__viagem.uf === 'SP'), '"Guardar viagem" abre a folha já com a cidade');
  await page.evaluate(() => { state.showViagem = false; render(); });
  await page.click('#viagem-pergunta-nao');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => !document.getElementById('viagem-pergunta')), 'o X tira a pergunta');
  await page.evaluate(() => { localStorage.setItem(PREFERENCIAS_KEY, JSON.stringify({ uf: 'SP', cidade: 'São Paulo' })); state.viagemPerguntaFechada = []; render(); });
  ok(await page.evaluate(() => !document.getElementById('viagem-pergunta')), 'buscar a própria cidade não pergunta nada');
  await browser.close();

  // Onde vai ficar (04/10/2026): "Ver quadras" mede a partir do hotel.
  ({ browser, page } = await abrir());
  await page.evaluate(() => abrirViagem());
  await page.waitForTimeout(150);
  await page.selectOption('#viagem-uf', 'SP');
  await page.waitForTimeout(300);
  await page.fill('#viagem-cidade', 'São Paulo');
  ok(await page.isVisible('#viagem-ficar') && (await page.getAttribute('#viagem-ficar', 'placeholder')).includes('hotel'), 'a folha pergunta onde a pessoa vai ficar (hotel ou endereço), opcional');
  await page.fill('#viagem-ficar', 'Hotel Pinheiros');
  await page.click('#viagem-salvar');
  await page.waitForTimeout(500);
  t = await page.evaluate(() => ({ v: lerViagens()[0], cartao: document.getElementById('viagem-cartao')?.innerText.replace(/\s+/g, ' ') || '' }));
  ok(t.v && t.v.ficar === 'Hotel Pinheiros' && Number.isFinite(t.v.lat) && Number.isFinite(t.v.lng), 'guarda o hotel com o ponto no mapa');
  ok(t.cartao.includes('Hotel Pinheiros') && t.cartao.includes('mais perto do seu hotel'), 'o cartão mostra o hotel — ' + t.cartao.slice(0, 90));
  await page.click('#viagem-cartao [data-viagem-ver]');
  await page.waitForTimeout(400);
  t = await page.evaluate(() => ({ page: state.page, o: state.origin, sort: state.sortBy, termo: state.termoBuscado, url: location.href, linha: document.querySelector('.status-info')?.innerText || '' }));
  ok(t.page === 'search' && t.o.bairro === 'Hotel Pinheiros' && t.sort === 'distance' && t.linha.includes('A partir de Hotel Pinheiros'), '"Ver quadras" ordena a partir do hotel — ' + t.linha);
  ok(!t.termo && !/hotel/i.test(decodeURIComponent(t.url)), 'o hotel não vai para o link');
  await page.evaluate(() => goHome());
  await page.waitForTimeout(150);
  await page.click('[data-viagem-editar]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.getElementById('viagem-ficar').value === 'Hotel Pinheiros' && document.getElementById('viagem-cidade').value === 'São Paulo'), '"Editar" abre a viagem já preenchida');
  // O mapa não acha o lugar: guarda assim mesmo, pela cidade.
  await page.route('**nominatim.openstreetmap.org/search**', r => r.fulfill({ contentType: 'application/json', body: '[]' }));
  await page.fill('#viagem-ficar', 'Pousada que não existe');
  await page.click('#viagem-salvar');
  await page.waitForTimeout(500);
  t = await page.evaluate(() => ({ l: lerViagens(), aviso: document.querySelector('.home-hero .conta-aviso')?.innerText || '', editar: document.querySelector('[data-viagem-editar]')?.innerText }));
  ok(t.l.length === 1 && t.l[0].ficar === 'Pousada que não existe' && t.l[0].lat === undefined && t.aviso.includes('Não achei'), 'editar troca a mesma viagem; lugar fora do mapa: guarda e avisa — ' + t.aviso);
  await page.click('#viagem-cartao [data-viagem-ver]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => state.page === 'search' && /são paulo/i.test(state.cep || '')), 'sem o ponto do hotel, "Ver quadras" abre pela cidade');
  await page.evaluate(() => { gravarViagens([{ id: 9, uf: 'SP', cidade: 'São Paulo', ida: '', volta: '' }]); goHome(); });
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => document.querySelector('[data-viagem-editar]')?.innerText) === 'Pôr o hotel', 'viagem sem hotel: o cartão convida a pôr o hotel');
  await browser.close();

  // Convite "Vai viajar?" só para quem já está navegando (04/10/2026).
  ({ browser, page } = await abrir());
  ok(await page.evaluate(() => !document.getElementById('convite-viagem')), 'quem acabou de chegar não vê o convite de viagem');
  await page.evaluate(() => { openCourt('a1'); });
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => !document.getElementById('convite-viagem')), 'uma ficha só: ainda não');
  await page.evaluate(() => { openCourt('a2'); openCourt('a1'); });
  await page.waitForTimeout(150);
  t = await page.evaluate(() => document.getElementById('convite-viagem')?.innerText.replace(/\s+/g, ' ') || '');
  ok(t.includes('Vai viajar? A gente também te ajuda') && t.includes('hotel'), 'depois de navegar um pouco, a ficha mostra o convite — ' + t.slice(0, 60));
  await page.click('#convite-viagem-sim');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => state.showViagem && !document.getElementById('convite-viagem')), '"Contar a viagem" abre a folha da viagem');
  await page.evaluate(() => { state.showViagem = false; render(); });
  ok(await page.evaluate(() => !document.getElementById('convite-viagem')), 'depois de aberto, não insiste');
  await browser.close();
  ({ browser, page } = await abrir());
  await page.evaluate(() => { state.tempoNoSite = true; openCourt('a1'); });
  await page.waitForTimeout(150);
  ok(await page.isVisible('#convite-viagem'), 'uns minutos no site também contam');
  await page.click('#convite-viagem-fechar');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => !document.getElementById('convite-viagem') && lerLocal(VIAGEM_CONVITE_KEY, 0) > 0), 'o X fecha e lembra (30 dias)');
  await page.evaluate(() => { localStorage.removeItem(VIAGEM_CONVITE_KEY); gravarViagens([{ id: 3, uf: 'SP', cidade: 'São Paulo', ida: '', volta: '' }]); render(); });
  ok(await page.evaluate(() => !document.getElementById('convite-viagem')), 'quem já guardou uma viagem não vê o convite');
  await page.evaluate(() => { gravarViagens([]); state.navegou = 0; state.tempoNoSite = false; goHome(); localStorage.setItem(CONVITE_CONTA_KEY, JSON.stringify(Date.now())); state.tempoNoSite = true; render(); });
  ok(await page.evaluate(() => !!document.getElementById('convite-viagem') && !document.querySelector('.convite-conta:not(.convite-viagem)')), 'na home também, sem empilhar com o convite da conta');
  await browser.close();

  // O cadastro não tem "Vou viajar"; o aviso por e-mail fica em Minha conta.
  ({ browser, page } = await abrir());
  await page.evaluate(() => abrirContaJogador('entrar'));
  await page.fill('#jog-email', 'viaja@exemplo.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.jogadorTela === 'criar' && !document.getElementById('jog-aviso-viagem') && !document.getElementById('jog-viagem')), 'o cadastro não pergunta de viagem');
  await page.fill('#jog-nome', 'Vai Viajar');
  await page.fill('#jog-senha', 'quadra de saibro');
  await page.fill('#jog-senha2', 'quadra de saibro');
  await page.check('#jog-aceite');
  await page.click('#jog-criar');
  await page.waitForTimeout(800);
  await page.evaluate(() => { gravarViagens([{ id: 5, uf: 'SP', cidade: 'São Paulo', ficar: 'Hotel Pinheiros', lat: -23.56, lng: -46.68, ida: '', volta: '' }]); abrirContaJogador('conta'); });
  await page.waitForTimeout(300);
  ok(await page.isHidden('#jog-viagem'), 'Minha conta tem o aviso "Vou viajar", fechado');
  await page.check('#jog-aviso-viagem');
  ok(await page.evaluate(() => document.getElementById('jog-viagem-cidade').value === 'São Paulo'), 'marcar já traz a viagem guardada no aparelho');
  await page.fill('#jog-viagem-ida', dia(20));
  await page.click('#jog-salvar');
  await page.waitForTimeout(500);
  t = await page.evaluate(() => ({ j: window.__db.jogadores.find(x => x.email === 'viaja@exemplo.com'), local: lerViagens() }));
  ok(t.j && t.j.avisos_viagem === true && t.j.viagem_cidade === 'São Paulo' && t.j.viagem_uf === 'SP' && !!t.j.viagem_ida, 'a viagem do aviso vai para a conta');
  ok(t.local.length === 1 && t.local[0].ficar === 'Hotel Pinheiros' && !!t.local[0].ida, 'e a viagem do aparelho ganha a data sem perder o hotel');
  await page.uncheck('#jog-aviso-viagem');
  await page.click('#jog-salvar');
  await page.waitForTimeout(500);
  t = await page.evaluate(() => window.__db.jogadores.find(x => x.email === 'viaja@exemplo.com'));
  ok(t.avisos_viagem === false && t.viagem_cidade === null, 'desligar o aviso apaga a viagem da conta');
  await browser.close();
})();
