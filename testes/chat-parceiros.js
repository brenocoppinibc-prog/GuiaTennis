// Pedido do Breno em 15/10/2026: "crie um chat para o parceiros também,
// seguindo dúvidas e orientando qualquer direção que possa ter no
// parceiros". O chat do Parceiros leva a qualquer página, entende as
// partes da ficha e responde pelo plano e pela situação da academia.
const { abrir, ok } = require('./harness');

const ultima = (page) => page.evaluate(() => { const l = [...document.querySelectorAll('#chat-msgs .chat-msg')].pop(); return { texto: l.innerText.replace(/\s+/g, ' '), acoes: [...l.querySelectorAll('.chat-acao')].map(a => a.innerText.trim()), ir: [...l.querySelectorAll('[data-chat-ir]')].map(a => a.dataset.chatIr), chips: [...l.querySelectorAll('.chat-chips .chip')].map(c => c.innerText.trim()) }; });
async function escrever(page, texto) {
  await page.fill('#chat-texto', texto);
  await page.click('.chat-enviar');
  await page.waitForTimeout(200);
}
async function abrirOChat(page) {
  await page.click('.pc-rodape-cols [data-abrir-chat]');
  await page.waitForTimeout(300);
}

(async () => {
  // ---- com a conta, no Básico ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel', plano: 'basico' });
  await page.waitForTimeout(300);
  await abrirOChat(page);
  let u = await ultima(page);
  ok(u.chips[0] === 'Por onde começo', 'o primeiro assunto sugerido é "Por onde começo" — ' + u.chips.join(' | '));
  await escrever(page, 'onde fica o desempenho?');
  u = await ultima(page);
  ok(u.texto.startsWith('Fica no menu do Parceiros, em "Desempenho"') && u.ir.join() === 'pc:desempenho', '"onde fica…" leva à página, com o caminho no menu — ' + u.texto);
  await escrever(page, 'minha ficha');
  u = await ultima(page);
  ok(u.texto.includes('"Minha ficha"') && u.ir.join() === 'pc:ficha', 'só o nome da página também leva até ela');
  await escrever(page, 'como coloco mais fotos');
  u = await ultima(page);
  ok(u.texto.includes('parte Fotos') && u.texto.includes('No Básico, a ficha mostra até 3 fotos; no Completo e no Premium, 5.'), 'a parte da ficha, com o que o plano libera — ' + u.texto);
  // O valor do catálogo em intervalo (regra 175).
  await escrever(page, 'posso colocar um intervalo de preço na aula?');
  u = await ultima(page);
  ok(u.texto.includes('Cada valor pode ser um número ou um intervalo (ex.: 150 a 200'), 'o intervalo de preço, na resposta do preço — ' + u.texto.slice(0, 120));
  await escrever(page, 'e o horário?');
  u = await ultima(page);
  ok(u.texto.includes('parte Horário') && !u.texto.includes('ainda não deu certo'), 'segue a conversa na ficha: "e o horário?"');
  await escrever(page, 'como edito a ficha');
  u = await ultima(page);
  ok(u.texto.includes('qual parte?') && u.chips.includes('Fotos') && u.chips.includes('Como chegar'), 'o mesmo assunto de novo: pergunta qual parte — ' + u.chips.join(' | '));
  await page.click('[data-chat-det="pc-chegar"]');
  await page.waitForTimeout(200);
  u = await ultima(page);
  ok(u.texto.includes('Aparece no Completo e no Premium; a Só Aula Tennis está no Básico'), 'tocar na parte responde pelo plano da academia — ' + u.texto);
  await escrever(page, 'quero fazer uma promoção');
  u = await ultima(page);
  ok(u.texto.startsWith('As promoções na ficha são do Completo e do Premium, e o leilão por e-mail, do Premium; a Só Aula Tennis está no Básico') && u.ir.join() === 'pc:plano', 'promoção no Básico: diz os planos de cada parte e leva ao plano');
  await escrever(page, 'quanto custa o premium');
  u = await ultima(page);
  ok(u.texto.startsWith('A Só Aula Tennis está no Básico. O Básico é grátis'), 'planos: começa pelo plano de agora — ' + u.texto.slice(0, 60));
  await escrever(page, 'por onde começo?');
  u = await ultima(page);
  ok(/^Na Só Aula Tennis, falta preencher: .*Fotos/.test(u.texto) && u.acoes.join() === 'Completar a ficha', '"por onde começo": o que falta na ficha — ' + u.texto);
  await escrever(page, 'minha academia não aparece');
  u = await ultima(page);
  ok(u.texto.startsWith('A Só Aula Tennis está no ar.') && u.texto.includes('pesquise o bairro'), '"não aparece": a situação da academia — ' + u.texto.slice(0, 80));
  await escrever(page, 'o que dá para fazer aqui?');
  u = await ultima(page);
  ok(u.chips.includes('Desempenho') && u.chips.includes('Acessos') && u.chips.includes('Perfil'), 'o mapa do Parceiros: as páginas para escolher — ' + u.chips.join(' | '));
  await page.click('[data-chat-pg="avaliacoes"]');
  await page.waitForTimeout(200);
  u = await ultima(page);
  ok(u.texto.includes('"Avaliações"') && u.ir.join() === 'pc:avaliacoes', 'tocar na página leva até ela');
  await escrever(page, 'onde troco a senha');
  u = await ultima(page);
  ok(u.texto.includes('"Perfil"') && u.texto.includes('a senha'), '"onde troco a senha" leva ao Perfil');
  await escrever(page, 'esqueci minha senha');
  u = await ultima(page);
  ok(u.texto.includes('Esqueceu a senha?'), '"esqueci minha senha" continua no assunto da senha');
  await escrever(page, 'onde vejo os números?');
  await page.click('.chat-acao[data-chat-ir="pc:desempenho"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => !document.getElementById('chat-overlay') && state.parceirosAba === 'desempenho'), 'o botão abre a página do Parceiros');
  await browser.close();

  // ---- Premium ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel', plano: 'premium' }));
  await page.waitForTimeout(300);
  await abrirOChat(page);
  await escrever(page, 'quero fazer uma promoção');
  u = await ultima(page);
  ok(u.texto.startsWith('A Só Aula Tennis está no Premium: em Promoções › Na ficha') && u.ir.join() === 'pc:promocoes,pc:promocoes-email', 'no Premium, o caminho das duas partes da promoção — ' + u.texto.slice(0, 60));
  await escrever(page, 'quantas pessoas posso colocar');
  u = await ultima(page);
  ok(u.texto.includes('No Premium, a Só Aula Tennis tem até 10 pessoas.'), 'acessos: o limite do plano da academia — ' + u.texto);
  // A aula mensal também é por aula (regra 182).
  await escrever(page, 'o valor mensal da aula é por mês?');
  u = await ultima(page);
  ok(u.texto.includes('os valores avulso e mensal, os dois por aula (na mensal, o valor de cada aula no plano)') && u.texto.includes('"Adicionar faixa de idade"'), 'o valor mensal da aula: por aula — ' + u.texto.slice(0, 120));
  await browser.close();

  // ---- sem conta ----
  ({ browser, page } = await abrir({ q: 'parceiros/ajuda' }));
  await page.waitForTimeout(300);
  await page.click('.pc-contato [data-abrir-chat]');
  await page.waitForTimeout(250);
  await escrever(page, 'onde vejo o desempenho da academia');
  u = await ultima(page);
  ok(u.texto.includes('"Desempenho"') && u.texto.includes('É na conta do Parceiros: toque abaixo, entre'), 'sem conta, a página da conta pede para entrar antes — ' + u.texto);
  await escrever(page, 'por onde começo');
  u = await ultima(page);
  ok(u.texto.startsWith('Comece pelo cadastro') && u.ir.join() === 'pc:cadastro', 'sem conta, "por onde começo" leva ao cadastro');
  await escrever(page, 'onde fica o plano');
  u = await ultima(page);
  ok(u.texto.includes('"Planos"') && u.ir.join() === 'pc:planos', 'sem conta, "plano" leva à página Planos');
  await browser.close();
})();
