// O chat com o GuiaTennis (regra 251, 12/11/2026: "o chat de ajuda também pode
// funcionar como um canal para feedback e reportar erros ... acompanhar com os
// clientes como eles estão trabalhando para corrigir" e "quero poder ter acesso
// as conversas do chat como admin e até poder enviar mensagens"): o erro ou a
// sugestão vai pelo chat, a situação aparece na página Feedback, e o admin lê
// as conversas, responde e muda a situação.
const { abrir, ok } = require('./harness');

const msgs = (page) => page.evaluate(() => [...document.querySelectorAll('#chat-msgs .chat-msg')].map(m => (m.classList.contains('eu') ? 'EU: ' : m.classList.contains('equipe') ? 'GUIA: ' : 'GT: ') + m.querySelector('.chat-bolha').innerText.trim()));
const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const db = (page, t) => page.evaluate((t) => JSON.parse(JSON.stringify(window.__db[t])), t);
async function escrever(page, t) {
  await page.fill('#chat-texto', t);
  await page.click('.chat-enviar');
  await page.waitForTimeout(400);
}
const CONVERSA = { id: 'c-mapa', user_id: 'j-ana', site: 'jogadores', titulo: 'O mapa não abre', atualizada_em: '2026-11-12T10:00:00Z', criada_em: '2026-11-12T10:00:00Z',
  mensagens: [{ de: 'eu', texto: 'O mapa não abre' }, { de: 'gt', texto: 'Tente recarregar a página.' }] };
const RELATO = { id: 'rel-1', user_id: 'j-ana', site: 'jogadores', conversa_id: 'c-mapa', tipo: 'erro', texto: 'O mapa não abre no celular', pagina: '/busca',
  situacao: 'recebido', criado_em: '2026-11-12T10:01:00Z', situacao_em: '2026-11-12T10:01:00Z' };

(async () => {
  // ---- Jogador com conta: informa um erro pelo chat e acompanha no Feedback ----
  let { browser, page } = await abrir({ jogador: true, jogadorConfirmado: true });
  await page.waitForTimeout(800);
  await page.click('.sitefooter [data-abrir-chat]');
  await page.waitForTimeout(300);
  const chips = await page.evaluate(() => [...document.querySelectorAll('.chat-chips .chip')].map(c => c.innerText.trim()));
  ok(chips.includes('Informar um erro') && chips.includes('Dar uma sugestão'), 'o chat oferece "Informar um erro" e "Dar uma sugestão" — ' + chips.join(', '));
  ok((await texto(page, '.chat-nota')) === 'A conversa fica guardada na sua conta, e o GuiaTennis pode responder por aqui.', 'a nota do chat diz que o GuiaTennis pode responder');
  await page.click('[data-chat-tema="relatar-erro"]');
  await page.waitForTimeout(300);
  let m = await msgs(page);
  ok(m[m.length - 1].startsWith('GT: Conte o que aconteceu'), 'o chat pede para contar o erro — ' + m[m.length - 1]);
  await escrever(page, 'ok');
  m = await msgs(page);
  ok(m[m.length - 1] === 'GT: Conte um pouco mais, em uma ou duas frases.' && (await db(page, 'relatos_do_chat')).length === 0, 'texto curto demais: pede mais detalhes');
  await escrever(page, 'O mapa não abre no meu celular');
  await page.waitForTimeout(400);
  m = await msgs(page);
  const rel = await db(page, 'relatos_do_chat');
  ok(m[m.length - 1].startsWith('GT: Recebido! O GuiaTennis vai analisar.') && await page.$('[data-chat-ir="menu:feedback"]'), 'o chat confirma e leva à página Feedback — ' + m[m.length - 1]);
  ok(rel.length === 1 && rel[0].tipo === 'erro' && rel[0].site === 'jogadores' && rel[0].texto === 'O mapa não abre no meu celular' && rel[0].pagina === '/' && rel[0].conversa_id && rel[0].user_id === 'j-ana',
    'o relato fica na conta, ligado à conversa e à página — ' + JSON.stringify(rel[0]));
  ok((await db(page, 'emails_a_enviar')).some(e => e.tipo === 'relato_do_chat'), 'o admin recebe o aviso');
  const conv = (await db(page, 'conversas_de_ajuda')).find(c => c.id === rel[0].conversa_id);
  ok(conv && conv.titulo.startsWith('Erro: O mapa não abre'), 'a conversa ganha o título do erro — ' + (conv && conv.titulo));
  await page.click('[data-chat-ir="menu:feedback"]');
  await page.waitForTimeout(700);
  let bloco = await texto(page, '#meus-relatos');
  ok(await page.evaluate(() => location.pathname === '/feedback') && bloco.includes('Erros e sugestões') && bloco.includes('O mapa não abre no meu celular') && bloco.includes('Erro informado'),
    'a página Feedback mostra o erro mandado — ' + bloco.slice(0, 160));
  const passos = await page.evaluate(() => [...document.querySelectorAll('#meus-relatos .relato-passos li')].map(li => li.innerText + (li.classList.contains('atual') ? '*' : '')));
  ok(passos.join('|') === 'Recebido*|Em correção|Corrigido', 'a situação: Recebido › Em correção › Corrigido — ' + passos.join('|'));
  await page.click('#meus-relatos [data-ver-conversa]');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => state.chat && state.chat.aberto && state.chat.id === window.__db.relatos_do_chat[0].conversa_id), '"Ver a conversa" abre a conversa no chat');
  await browser.close();

  // ---- Sem conta: o chat pede para entrar ----
  ({ browser, page } = await abrir({}));
  await page.waitForTimeout(600);
  await page.click('.sitefooter [data-abrir-chat]');
  await page.waitForTimeout(300);
  await page.click('[data-chat-tema="sugestao"]');
  await page.waitForTimeout(300);
  m = await msgs(page);
  ok(m[m.length - 1].includes('entre na sua conta') && await page.$('[data-chat-ir="entrar"]') && (await db(page, 'relatos_do_chat')).length === 0, 'sem conta, a sugestão pede para entrar — ' + m[m.length - 1]);
  await browser.close();

  // ---- Admin: lê as conversas, muda a situação e responde ----
  ({ browser, page } = await abrir({ admin: true, q: 'admin/chat', w: 1280, conversas: [CONVERSA], relatos: [RELATO] }));
  await page.waitForTimeout(1000);
  let painel = await texto(page, '.adm-main');
  ok(painel.includes('Chat de ajuda') && painel.includes('Erros e sugestões') && painel.includes('O mapa não abre no celular') && painel.includes('Conversas') && painel.includes('O mapa não abre'),
    'a aba Chat de ajuda mostra os relatos e as conversas — ' + painel.slice(0, 200));
  ok((await texto(page, '.adm-nav [data-adm-aba="chat"]')).includes('1'), 'o menu do painel conta o relato em aberto — ' + await texto(page, '.adm-nav [data-adm-aba="chat"]'));
  await page.click('[data-relato-situacao="em_andamento"][data-relato="rel-1"]');
  await page.waitForTimeout(400);
  let r1 = (await db(page, 'relatos_do_chat'))[0];
  ok(r1.situacao === 'em_andamento' && (await db(page, 'emails_a_enviar')).some(e => e.tipo === 'relato_situacao'), 'mudar para "Em correção" salva e manda o e-mail');
  await page.click('.adm-conversa[data-adm-conversa="c-mapa"]');
  await page.waitForTimeout(500);
  painel = await texto(page, '.adm-main');
  ok(painel.includes('Tente recarregar a página.') && painel.includes('Responder no chat'), 'a conversa abre inteira, com o campo para responder');
  await page.fill('#adm-chat-texto', 'Oi, Ana! Já corrigimos o mapa.');
  await page.click('#adm-chat-enviar');
  await page.waitForTimeout(500);
  const resp = await db(page, 'respostas_no_chat');
  ok(resp.length === 1 && resp[0].texto === 'Oi, Ana! Já corrigimos o mapa.' && resp[0].user_id === 'j-ana' && (await db(page, 'emails_a_enviar')).some(e => e.tipo === 'resposta_no_chat'),
    'a resposta fica na conversa e vai por e-mail');
  ok((await texto(page, '.adm-chat-msgs')).includes('Oi, Ana! Já corrigimos o mapa.') && (await texto(page, '.adm-chat-msgs')).includes('ainda não vista'), 'a resposta aparece na conversa, "ainda não vista"');
  await browser.close();

  // ---- A jogadora vê a resposta: aviso no site, a conversa com o nome do Breno ----
  const RESPOSTA = { id: 'resp-1', conversa_id: 'c-mapa', user_id: 'j-ana', texto: 'Oi, Ana! Já corrigimos o mapa.', criada_em: '2026-11-12T11:00:00Z', lida_em: null };
  ({ browser, page } = await abrir({ jogador: true, jogadorConfirmado: true, conversas: [CONVERSA], respostasNoChat: [RESPOSTA], relatos: [{ ...RELATO, situacao: 'concluido' }] }));
  await page.waitForTimeout(1200);
  const dica = await texto(page, '#gt-dica');
  ok(dica.includes('O GuiaTennis respondeu no chat') && dica.includes('O mapa não abre'), 'o site avisa que o GuiaTennis respondeu — ' + dica);
  await page.click('#gt-dica .gt-dica-acao');
  await page.waitForTimeout(800);
  m = await msgs(page);
  ok(m[m.length - 1] === 'GUIA: Oi, Ana! Já corrigimos o mapa.' && (await texto(page, '.chat-msg.equipe .chat-quem')) === 'Breno, do GuiaTennis', 'a resposta aparece no fim da conversa, com o nome do Breno — ' + m.join(' / '));
  ok((await db(page, 'respostas_no_chat'))[0].lida_em, 'abrir a conversa marca a resposta como lida');
  const salva = (await db(page, 'conversas_de_ajuda')).find(c => c.id === 'c-mapa');
  ok(salva.mensagens.some(x => x.de === 'equipe' && x.id === 'resp-1' && x.texto === 'Oi, Ana! Já corrigimos o mapa.'), 'a resposta fica guardada na conversa da conta');
  await escrever(page, 'Obrigada!');
  ok((await db(page, 'conversas_de_ajuda')).find(c => c.id === 'c-mapa').mensagens.filter(x => x.de === 'equipe').length === 1, 'a conversa continua, sem duplicar a resposta');
  await page.goto(page.url().replace(/\/[^/]*$/, '/feedback'));
  await page.waitForTimeout(900);
  const passos2 = await page.evaluate(() => [...document.querySelectorAll('#meus-relatos .relato-passos li')].map(li => li.innerText + (li.classList.contains('atual') ? '*' : '')));
  ok(passos2.join('|') === 'Recebido|Em correção|Corrigido*', 'corrigido: a página Feedback mostra "Corrigido" — ' + passos2.join('|'));
  await browser.close();

  // ---- O link do e-mail (?chat=) abre a conversa ----
  ({ browser, page } = await abrir({ jogador: true, jogadorConfirmado: true, q: '?chat=c-mapa', conversas: [CONVERSA], respostasNoChat: [RESPOSTA] }));
  await page.waitForTimeout(1300);
  ok(await page.evaluate(() => state.chat && state.chat.aberto && state.chat.id === 'c-mapa') && (await msgs(page)).includes('GUIA: Oi, Ana! Já corrigimos o mapa.'), 'o link do e-mail abre a conversa com a resposta');
  await browser.close();

  // ---- No Parceiros: os relatos da academia na aba Feedback ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/feedback', relatos: [{ ...RELATO, id: 'rel-pc', user_id: 'u-a1', site: 'parceiros', conversa_id: null, tipo: 'sugestao', texto: 'Mostrar os horários livres', situacao: 'nao_sera_feito' }] }));
  await page.waitForTimeout(1000);
  bloco = await texto(page, '#meus-relatos');
  ok(bloco.includes('Sugestão') && bloco.includes('Mostrar os horários livres') && bloco.includes('Não vamos fazer agora'), 'no Parceiros › Feedback, a sugestão com a situação — ' + bloco.slice(0, 160));
  await page.click('#meus-relatos [data-relatar]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => state.chat && state.chat.aberto) && (await msgs(page)).pop() === 'GT: O que você quer mandar ao GuiaTennis?', '"Informar um erro ou dar uma sugestão" abre o chat');
  await browser.close();

  // ---- Banco sem o SQL: o Feedback sem a parte, o chat avisa ----
  ({ browser, page } = await abrir({ jogador: true, jogadorConfirmado: true, q: 'feedback', semChatComOGuia: true }));
  await page.waitForTimeout(900);
  ok(!(await page.$('#meus-relatos')), 'banco sem o SQL: a página Feedback fica sem a parte dos relatos');
  await page.click('.sitefooter [data-abrir-chat]');
  await page.waitForTimeout(300);
  await page.click('[data-chat-tema="relatar-erro"]');
  await page.waitForTimeout(200);
  await escrever(page, 'O mapa não abre no meu celular');
  await page.waitForTimeout(400);
  m = await msgs(page);
  ok(m[m.length - 1].includes('Não deu para mandar agora') && await page.$('.chat-acao.whats'), 'banco sem o SQL: o chat diz que não deu e oferece o WhatsApp — ' + m[m.length - 1]);
  await browser.close();
})();
