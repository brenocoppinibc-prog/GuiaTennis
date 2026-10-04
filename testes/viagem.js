// "Vou viajar" (pedido do Breno em 04/10/2026), como as "Próximas viagens"
// do Airbnb e do Booking: a viagem fica separada da cidade de casa; perto da
// data a home mostra o cartão, durante a viagem "Pesquisar" abre a cidade
// dela, e depois da volta tudo volta sozinho.
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
})();
