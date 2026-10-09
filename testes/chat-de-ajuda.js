// Pedido do Breno em 08/10/2026: "ao invés de já direcionar para o whatsapp
// fazer um chat dentro do site que uma 'ia' entende o que a pessoa precisa,
// tenta ajudar ela, mostrando os caminhos e se não for possível, direcionar
// ao meu whatsapp". O chat entende por palavras-chave (sem serviço de IA de
// fora), mostra o caminho e, se não resolver, leva ao WhatsApp com a dúvida.
const { abrir, ok } = require('./harness');

const msgs = (page) => page.evaluate(() => [...document.querySelectorAll('#chat-msgs .chat-msg')].map(m => (m.classList.contains('eu') ? 'EU: ' : 'GT: ') + m.querySelector('.chat-bolha').innerText.trim()));
const ultima = (page) => page.evaluate(() => { const l = [...document.querySelectorAll('#chat-msgs .chat-msg')].pop(); return { texto: l.innerText.replace(/\s+/g, ' '), acoes: [...l.querySelectorAll('.chat-acao')].map(a => a.innerText.trim()), chips: [...l.querySelectorAll('.chat-chips .chip')].map(c => c.innerText.trim()), whats: l.querySelector('a.chat-acao.whats')?.getAttribute('href') || '' }; });
async function escrever(page, texto) {
  await page.fill('#chat-texto', texto);
  await page.click('.chat-enviar');
  await page.waitForTimeout(200);
}

(async () => {
  // ---- site dos jogadores: "Fale com a gente" › Chat de ajuda ----
  let { browser, page } = await abrir({});
  await page.evaluate(() => { state.showMenu = true; render(); document.querySelector('.menu-drawer [data-menu="contato"]').click(); });
  await page.waitForTimeout(200);
  await page.click('#contato-close-overlay [data-abrir-chat]');
  await page.waitForTimeout(300);
  let u = await ultima(page);
  ok(await page.isVisible('#chat-overlay .chat-caixa') && u.texto.includes('chat de ajuda do GuiaTennis') && u.chips.length === 6 && u.chips.includes('Achar quadra perto'),
    'a folha "Fale com a gente" abre o chat, com a saudação e 6 assuntos — ' + u.chips.join(' | '));
  ok(await page.evaluate(() => document.activeElement && document.activeElement.id === 'chat-texto'), 'o campo já vem pronto para escrever');
  await escrever(page, 'esqueci minha senha');
  u = await ultima(page);
  ok(u.texto.includes('Esqueceu a senha?') && u.acoes.includes('Entrar') && u.chips.join() === 'Resolveu,Ainda preciso de ajuda', 'entende "esqueci minha senha", mostra o caminho e pergunta se resolveu');
  await page.click('[data-chat-resp="nao"]');
  await page.waitForTimeout(200);
  u = await ultima(page);
  ok(u.texto.includes('WhatsApp') && decodeURIComponent(u.whats).includes('Minha dúvida: esqueci minha senha') && u.whats.startsWith('https://wa.me/5511927456457'),
    '"Ainda preciso de ajuda" leva ao WhatsApp do Breno, com a dúvida escrita');
  await escrever(page, 'xpto qwerty');
  u = await ultima(page);
  ok(u.texto.includes('Não entendi bem') && u.whats && u.chips.length === 6, 'sem entender: pede para escrever de outro jeito, sugere assuntos e oferece o WhatsApp');
  await escrever(page, 'zzz aaa');
  u = await ultima(page);
  ok(u.texto.includes('Ainda não entendi') && u.whats, 'sem entender de novo: o WhatsApp vem primeiro');
  await escrever(page, 'como reservo uma aula?');
  u = await ultima(page);
  ok(u.texto.includes('não faz reservas') && u.texto.includes('Chamar no WhatsApp'), 'entende "como reservo uma aula?" — ' + u.texto.slice(0, 80));
  await escrever(page, 'o telefone da academia está errado');
  u = await ultima(page);
  ok(u.texto.includes('o que está errado') && u.whats, 'informação errada: leva ao WhatsApp para avisar');
  await page.click('[data-chat-resp="sim"]');
  await page.waitForTimeout(150);
  ok((await ultima(page)).texto.includes('Que bom!'), '"Resolveu" encerra com simpatia');
  await escrever(page, 'onde ficam minhas favoritas');
  await page.click('[data-chat-ir="menu:favoritas"]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => !document.getElementById('chat-overlay') && state.lista === 'favoritas'), 'o botão do caminho fecha o chat e abre as Favoritas');
  // A conversa continua ao abrir de novo; o rodapé também abre o chat.
  await page.evaluate(() => { state.lista = null; render(); });
  await page.click('.sf-col [data-abrir-chat]');
  await page.waitForTimeout(200);
  ok((await msgs(page)).includes('EU: esqueci minha senha'), 'o rodapé abre o chat, e a conversa continua lá');
  await page.click('#chat-fechar');
  await page.waitForTimeout(150);
  ok(!(await page.$('#chat-overlay')), 'o ✕ fecha o chat');
  const priv = await page.evaluate(() => PRIVACY_HTML);
  ok(priv.includes('<strong>Chat de ajuda:</strong>') && priv.includes('não grava o que você escreve'), 'a Política de Privacidade diz que a conversa não é gravada');
  await browser.close();

  // ---- GuiaTennis Parceiros: Ajuda › Abrir o chat de ajuda ----
  ({ browser, page } = await abrir({ q: 'parceiros/ajuda' }));
  await page.waitForTimeout(300);
  const card = await page.evaluate(() => document.querySelector('.pc-contato')?.innerText || '');
  ok(card.includes('chat de ajuda') && !(await page.$('.pc-contato a[href^="https://wa.me"]')), 'em Ajuda, "Fale com o GuiaTennis" abre o chat, sem o WhatsApp direto');
  await page.click('.pc-contato [data-abrir-chat]');
  await page.waitForTimeout(300);
  u = await ultima(page);
  ok(u.texto.includes('GuiaTennis Parceiros') && u.chips.includes('Cadastrar a academia') && u.chips.includes('Tirar a academia do guia'), 'no Parceiros, os assuntos são os das academias — ' + u.chips.join(' | '));
  const casos = [
    ['quero excluir minha academia', 'Pedir para tirar do guia'],
    ['quero pausar durante as férias', 'Pausar no site'],
    ['quanto custa o premium?', 'Completo e do Premium'],
    ['vocês cobram comissão?', 'não cobra comissão'],
    ['como faço promoção de aula grátis', 'até 3 promoções'],
    ['outra pessoa está administrando minha academia', 'Contestar'],
    ['tem uma avaliação falsa', 'Pedir análise'],
    ['quero dar acesso para o professor', 'Em Pessoas'],
  ];
  for (const [q, esperado] of casos) {
    await escrever(page, q);
    u = await ultima(page);
    ok(u.texto.includes(esperado), `entende "${q}"`);
  }
  await page.click('[data-chat-ir="pc:pessoas"]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => !document.getElementById('chat-overlay') && ['pessoas', 'entrar'].includes(state.parceirosAba)), 'o caminho leva à página do Parceiros (sem conta, pede para entrar antes)');
  const rodape = await page.evaluate(() => [...document.querySelectorAll('.pc-rodape-cols [data-abrir-chat]')].map(b => b.innerText.trim()).join() + '|' + document.querySelectorAll('.pc-rodape-cols a[href^="https://wa.me"]').length);
  ok(rodape === 'Chat de ajuda|0', 'o rodapé do Parceiros tem o chat de ajuda no lugar do WhatsApp');
  await browser.close();
})();
