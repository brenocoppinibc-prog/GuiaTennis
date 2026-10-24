// Pedidos do Breno em 15/10/2026: (1) "eu fiz outra pergunta e o chat supôs
// que não tinha dado certo sem nem ter dado errado… como se fosse um
// 'pensamento'"; (2) "as academias no completo também podem aparecer nas
// recomendadas quanto mais preenchidas… o mais próximo da localização
// possível… se já fez uma viagem e marcou alguma viagem aparecer uma seção
// sobre isso também, só quando já tiver a conta".
const { abrir, ok } = require('./harness');

const ultima = (page) => page.evaluate(() => { const l = [...document.querySelectorAll('#chat-msgs .chat-msg')].pop(); return { texto: l.innerText.replace(/\s+/g, ' '), acoes: [...l.querySelectorAll('.chat-acao')].map(a => a.innerText.trim()), ir: [...l.querySelectorAll('[data-chat-ir]')].map(a => a.dataset.chatIr), chips: [...l.querySelectorAll('.chat-chips .chip')].map(c => c.innerText.trim()) }; });
async function escrever(page, texto) {
  await page.fill('#chat-texto', texto);
  await page.click('.chat-enviar');
  await page.waitForTimeout(200);
}
async function abrirOChat(page) {
  await page.evaluate(() => { state.showMenu = true; render(); document.querySelector('.menu-drawer [data-menu="contato"]').click(); });
  await page.waitForTimeout(200);
  await page.click('#contato-close-overlay [data-abrir-chat]');
  await page.waitForTimeout(250);
}

(async () => {
  // ---- (1) a conversa do print ----
  let { browser, page } = await abrir({});
  await abrirOChat(page);
  await escrever(page, 'como encontro quadras');
  let u = await ultima(page);
  ok(u.texto.includes('Pesquisar'), 'a busca: o caminho primeiro');
  await escrever(page, 'Mas é pela localização que não está indo');
  u = await ultima(page);
  ok(u.texto.includes('permita a localização'), '"não está indo" é entendido como "não deu certo": a dica da localização');
  await escrever(page, 'E como encontre quadras de saindo');
  u = await ultima(page);
  ok(!u.texto.includes('ainda não deu certo') && u.texto.startsWith('Entendi: quadras de saibro.') && u.texto.includes('Piso › Saibro') && u.acoes.join() === 'Ver quadras de saibro',
    'outra pergunta não vira "não deu certo"; "saindo" depois de "quadras de" é saibro — ' + u.texto);
  ok(/Há 1 academia com quadra de saibro/.test(u.texto), 'diz quantas academias há com o detalhe — ' + u.texto);
  await escrever(page, 'quadra coberta em Moema');
  u = await ultima(page);
  ok(u.texto.startsWith('Entendi: quadras cobertas em Moema.') && u.acoes.join() === 'Ver quadras cobertas em Moema' && u.ir[0] === 'busca:cobertura=coberta&q=Moema',
    'o detalhe e o lugar juntos: o botão já leva os dois — ' + u.texto + ' ' + u.ir);
  await escrever(page, 'não deu');
  u = await ultima(page);
  ok(u.texto.includes('aumente a distância') && !u.texto.includes('Breno'), '"não deu" depois do filtro: o que costuma acontecer, antes do Breno');
  await escrever(page, 'como pesquiso pelo mapa?');
  u = await ultima(page);
  ok(!u.texto.includes('ainda não deu certo') && u.texto.startsWith('O que você quer achar?') && u.chips.includes('Quadras de saibro'),
    'pergunta nova no mesmo assunto: pergunta o que a pessoa quer achar — ' + u.texto);
  await page.click('[data-chat-det="rapida"]');
  await page.waitForTimeout(200);
  u = await ultima(page);
  ok(u.texto.includes('Piso › Rápida') && u.acoes.join() === 'Ver quadras rápidas em Moema', 'tocar no detalhe responde o detalhe, no lugar que a conversa já tinha — ' + u.acoes);
  await escrever(page, 'como reservo uma aula?');
  u = await ultima(page);
  ok(u.texto.includes('não faz reservas'), '"aula" em "reservo uma aula" continua sendo Reservar');
  ok(await page.evaluate(() => ['tem quadra de sabro', 'quadras de saibo'].every(f => pensarNoChat(f).det?.id === 'saibro') && !pensarNoChat('estou saindo de casa').det),
    'erro de digitação vira saibro só pelo contexto ("estou saindo" não)');
  await escrever(page, 'quadras de saibro');
  await page.click('.chat-acao[data-chat-ir^="busca:"]');
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => !document.getElementById('chat-overlay') && state.page === 'search' && state.pisoFilters.join() === 'saibro' && /piso=saibro/.test(location.search)),
    'o botão abre a busca já com o filtro de saibro');
  await browser.close();

  // ---- (2) recomendadas: Premium, depois Completo pela ficha; perto primeiro ----
  ({ browser, page } = await abrir({}));
  await page.waitForTimeout(300);
  const ordem = await page.evaluate(() => {
    const base = state.allCourts.map(decorate);
    const mk = (id, extra) => ({ ...base[0], id, name: id, appCount: 0, appAvg: 0, confirmada: true, ...extra });
    const todas = [
      mk('basica-perto', { plano: 'basico', lat: -23.56, lng: -46.68, cidade: 'São Paulo' }),
      mk('completo-pouca', { plano: 'completo', lat: -23.56, lng: -46.68, amenities: [], cidade: 'São Paulo' }),
      mk('completo-cheia', { plano: 'completo', lat: -23.57, lng: -46.69, amenities: ['raquete', 'wifi', 'agua', 'loja'], horario: { seg: '7-22' }, cidade: 'São Paulo' }),
      mk('completo-longe', { plano: 'completo', lat: -22.90, lng: -43.20, amenities: ['raquete', 'wifi', 'agua', 'loja', 'camera'], horario: { seg: '7-22' }, cidade: 'Rio de Janeiro' }),
      mk('premium-perto', { plano: 'premium', lat: -23.58, lng: -46.66, cidade: 'São Paulo' }),
    ];
    return recomendadasGuia(todas, { lat: -23.56, lng: -46.68 }, new Set()).map(c => c.id).join();
  });
  ok(ordem === 'premium-perto,completo-cheia,completo-pouca,basica-perto', 'recomendadas: Premium, Completo da ficha mais cheia, e as de perto antes das longe — ' + ordem);
  await browser.close();

  // ---- (2) a viagem na home, só com a conta ----
  const hoje = new Date();
  const dia = (n) => { const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  ({ browser, page } = await abrir({ jogador: true }));
  await page.waitForTimeout(400);
  const secao = () => page.evaluate(() => { const s = document.getElementById('home-viagem'); return s ? s.innerText.replace(/\s+/g, ' ') : ''; });
  ok(!(await secao()), 'sem viagem guardada, sem a seção');
  await page.evaluate(([ida, volta]) => { jogador.guardados = { ...(jogador.guardados || {}), viagens: [{ id: 1, uf: 'SP', cidade: 'São Paulo', ida, volta, ficar: 'Hotel Moema', lat: -23.60, lng: -46.66 }] }; render(); }, [dia(30), dia(35)]);
  let s = await secao();
  ok(s.startsWith('Para a sua viagem a São Paulo') && s.includes('da mais perto do seu hotel') && s.indexOf('Quadra Locação') < s.indexOf('Só Aula Tennis') && s.includes('Ver as quadras da viagem'),
    'viagem marcada: as academias de lá, da mais perto do hotel — ' + s.slice(0, 140));
  await page.evaluate(([ida, volta]) => { jogador.guardados = { ...jogador.guardados, viagens: [{ id: 2, uf: 'SP', cidade: 'São Paulo', ida, volta }] }; render(); }, [dia(-20), dia(-15)]);
  s = await secao();
  ok(s.startsWith('Vai voltar a São Paulo?') && s.includes('Da sua viagem de') && s.includes('Ver as academias de São Paulo'), 'viagem que já passou: "Vai voltar a…?" — ' + s.slice(0, 120));
  await page.evaluate(() => { gravarViagens([{ id: 3, uf: 'RJ', cidade: 'Rio de Janeiro', ida: '', volta: '' }]); });
  ok(await page.evaluate(() => jogador.guardados.viagens.length === 2 && viagensFeitas()[0].id === 2), 'guardar outra viagem não apaga a que já passou');
  await page.evaluate(() => { const g = jogador.guardados; jogador = null; render(); window.__g = g; });
  ok(!(await secao()), 'sem a conta, sem a seção da viagem');
  await browser.close();
})();
