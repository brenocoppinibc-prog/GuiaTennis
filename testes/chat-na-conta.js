// Pedido do Breno em 09/10/2026: "faça que o chat de parceiros fique salvo
// na conta também e tenha histórico e que pode iniciar novo chat". Com a
// conta aberta no GuiaTennis Parceiros, cada conversa fica na conta
// (conversas_de_ajuda); "Conversas" lista as anteriores, "Nova conversa"
// começa outra, e a lixeira apaga. Sem conta, fica só na tela.
const { abrir, ok, irSenha } = require('./harness');

const msgs = (page) => page.evaluate(() => [...document.querySelectorAll('#chat-msgs .chat-msg')].map(m => (m.classList.contains('eu') ? 'EU: ' : 'GT: ') + m.querySelector('.chat-bolha').innerText.trim()));
const nota = (page) => page.evaluate(() => document.querySelector('.chat-nota')?.innerText.trim() || '');
const barra = (page) => page.evaluate(() => [...document.querySelectorAll('.chat-barra .chat-barra-bt')].map(b => b.innerText.trim()));
const lista = (page) => page.evaluate(() => [...document.querySelectorAll('.chat-conversa')].map(li => li.innerText.replace(/\s+/g, ' ').trim()));
const guardadas = (page) => page.evaluate(() => window.__db.conversas_de_ajuda.map(c => ({ user: c.user_id, site: c.site, titulo: c.titulo, n: c.mensagens.length })));
async function escrever(page, texto) {
  await page.fill('#chat-texto', texto);
  await page.click('.chat-enviar');
  await page.waitForTimeout(250);
}
async function abrirChat(page) {
  await page.click('.pc-rodape-cols [data-abrir-chat]');
  await page.waitForTimeout(300);
}

(async () => {
  // ---- academia logada: guarda, histórico, nova conversa e apagar ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel' });
  await page.waitForTimeout(300);
  await abrirChat(page);
  ok((await nota(page)) === 'A conversa fica guardada na sua conta.' && (await barra(page)).join() === 'Conversas', 'com a conta aberta: o chat avisa que guarda na conta e mostra "Conversas" — ' + (await barra(page)).join());
  await escrever(page, 'esqueci minha senha');
  let g = await guardadas(page);
  ok(g.length === 1 && g[0].user === 'u-a1' && g[0].site === 'parceiros' && g[0].titulo === 'esqueci minha senha' && g[0].n === 3, 'a primeira dúvida cria a conversa na conta, com ela de título — ' + JSON.stringify(g));
  ok((await barra(page)).join() === 'Conversas (1),Nova conversa', 'aparecem "Conversas (1)" e "Nova conversa" — ' + (await barra(page)).join());
  await page.click('[data-chat-resp="nao"]');
  await page.waitForTimeout(250);
  g = await guardadas(page);
  ok(g.length === 1 && g[0].n === 5, 'cada mensagem nova atualiza a mesma conversa — ' + JSON.stringify(g));

  await page.click('#chat-nova');
  await page.waitForTimeout(200);
  let m = await msgs(page);
  ok(m.length === 1 && m[0].includes('chat de ajuda do GuiaTennis Parceiros') && (await barra(page)).join() === 'Conversas (1)', '"Nova conversa" começa do zero, com a saudação');
  await escrever(page, 'oi');
  await escrever(page, 'como faço promoção de aula grátis');
  g = await guardadas(page);
  ok(g.length === 2 && g[1].titulo === 'como faço promoção de aula grátis', 'a segunda conversa vai para a conta, e o "oi" não vira título — ' + JSON.stringify(g.map(x => x.titulo)));

  await page.click('#chat-ver-conversas');
  await page.waitForTimeout(250);
  let l = await lista(page);
  ok(await page.isVisible('#chat-nova-lista') && l.length === 2 && l[0].startsWith('como faço promoção de aula grátis Aberta agora · Hoje') && l[1].startsWith('esqueci minha senha Hoje'),
    '"Conversas" lista as duas, a mais recente em cima, com o dia e a hora — ' + l.join(' | '));
  ok(!(await page.$('#chat-form')) && (await page.evaluate(() => document.querySelector('.chat-titulo').innerText)) === 'Suas conversas', 'a lista toma o lugar da conversa');
  await page.click('[data-chat-abrir] >> nth=1');
  await page.waitForTimeout(250);
  m = await msgs(page);
  ok(m.includes('EU: esqueci minha senha') && m.includes('EU: Ainda preciso de ajuda') && await page.isVisible('#chat-texto'), 'um toque abre a conversa antiga, inteira');
  await escrever(page, 'quero pausar durante as férias');
  g = await guardadas(page);
  ok(g.length === 2 && g.find(x => x.titulo === 'esqueci minha senha').n === 7, 'continuar a conversa antiga guarda nela mesma');
  await page.click('#chat-ver-conversas');
  await page.waitForTimeout(200);
  l = await lista(page);
  ok(l[0].startsWith('esqueci minha senha Aberta agora'), 'a conversa que mexeu sobe para o topo — ' + l[0]);

  // Apagar: confirma ali mesmo; "Cancelar" desiste.
  await page.click('.chat-conversa:nth-child(2) [data-chat-apagar]');
  await page.waitForTimeout(150);
  ok((await page.evaluate(() => document.querySelector('.chat-conversa.apagando')?.innerText || '')).includes('Apagar "como faço promoção de aula grátis"?'), 'a lixeira pergunta antes de apagar');
  await page.click('[data-chat-apagar-nao]');
  await page.waitForTimeout(150);
  ok((await lista(page)).length === 2 && (await guardadas(page)).length === 2, '"Cancelar" não apaga');
  await page.click('.chat-conversa:nth-child(2) [data-chat-apagar]');
  await page.waitForTimeout(150);
  await page.click('[data-chat-apagar-sim]');
  await page.waitForTimeout(250);
  ok((await lista(page)).length === 1 && (await guardadas(page)).map(x => x.titulo).join() === 'esqueci minha senha', '"Apagar" tira a conversa da conta e da lista');
  await page.click('#chat-voltar');
  await page.waitForTimeout(150);
  ok((await msgs(page)).includes('EU: quero pausar durante as férias'), 'a seta volta para a conversa aberta');

  // Recarregou a página (nesta aba): continua a conversa que estava aberta.
  await page.click('#chat-fechar');
  await page.evaluate(() => { state.chat = null; state.conversasDoChat = null; render(); });
  await abrirChat(page);
  await page.waitForTimeout(200);
  ok((await msgs(page)).includes('EU: quero pausar durante as férias'), 'ao voltar, a conversa aberta na aba continua');
  // Saiu da conta: a conversa não fica para quem usar o site depois.
  await page.click('#chat-fechar');
  await page.evaluate(() => { contaAcademia = null; jogador = null; render(); });
  await abrirChat(page);
  m = await msgs(page);
  ok(m.length === 1 && !(await page.$('#chat-ver-conversas')), 'sem a conta, o chat começa do zero e não mostra as conversas dela');
  await browser.close();

  // ---- outro aparelho: as conversas vêm da conta; o que volta do banco é conferido ----
  const conversas = [
    { id: 'c-velha', user_id: 'u-a1', site: 'parceiros', titulo: 'Como mudo de plano?', atualizada_em: '2026-09-20T15:00:00Z',
      mensagens: [{ de: 'gt', texto: 'Oi!' }, { de: 'eu', texto: 'Como mudo de plano?' },
        { de: 'gt', texto: 'Fale com o GuiaTennis.', acoes: [{ t: 'Ver os planos', ir: 'pc:planos' }, { t: 'Estranho', ir: 'javascript:alert(1)' }], chips: [{ t: 'Resolveu', resp: 'sim' }, { t: 'Inventado', tema: 'nao-existe' }] }] },
    { id: 'c-outra', user_id: 'u-outra', site: 'parceiros', titulo: 'De outra conta', atualizada_em: '2026-10-01T15:00:00Z', mensagens: [{ de: 'eu', texto: 'De outra conta' }] },
  ];
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel', conversas }));
  await page.waitForTimeout(300);
  await abrirChat(page);
  ok((await barra(page)).join() === 'Conversas (1)', 'em outro aparelho, "Conversas (1)": só as da própria conta');
  await page.click('#chat-ver-conversas');
  await page.waitForTimeout(200);
  l = await lista(page);
  ok(l.length === 1 && /^Como mudo de plano\? 20 de set\.?$/.test(l[0]), 'a data de outro dia aparece por extenso — ' + l[0]);
  await page.click('[data-chat-abrir="c-velha"]');
  await page.waitForTimeout(200);
  const acoes = await page.evaluate(() => ({ ir: [...document.querySelectorAll('[data-chat-ir]')].map(b => b.dataset.chatIr), chips: [...document.querySelectorAll('.chat-chips .chip')].map(c => c.innerText.trim()) }));
  ok(acoes.ir.join() === 'pc:planos' && acoes.chips.join() === 'Resolveu', 'caminho e assunto que o chat não conhece não voltam do banco — ' + JSON.stringify(acoes));
  await page.click('[data-chat-resp="sim"]');
  await page.waitForTimeout(250);
  g = await guardadas(page);
  ok(g.length === 2 && g.find(x => x.titulo === 'Como mudo de plano?').n === 5, 'responder na conversa antiga guarda nela');
  await browser.close();

  // ---- sem conta no Parceiros: fica só na tela; entrou, vai para a conta ----
  ({ browser, page } = await abrir({ q: 'parceiros/ajuda' }));
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.__db.academia_acessos.push({ user_id: 'u-a2', academia_id: 'a2', usuario: 'quadra.a2', nome_responsavel: 'Maria Teste', email: 'maria@quadralocacao.com.br', whatsapp: '11900000001', termos_aceitos_em: '2026-09-01', dados_completos_em: '2026-09-01', senha_trocada_em: '2026-09-01' });
    window.__db.academia_vinculos.push({ user_id: 'u-a2', academia_id: 'a2', papel: 'principal', created_at: '2026-09-01' });
    window.__senhas['quadra.a2@acesso.guiatennis.com.br'] = 'senha12345';
  });
  await page.click('.pc-contato [data-abrir-chat]');
  await page.waitForTimeout(250);
  ok((await nota(page)).startsWith('A conversa fica só na sua tela. Entre na sua conta para guardar as conversas.') && !(await page.$('.chat-barra')), 'sem conta: avisa que fica só na tela e convida a entrar');
  await escrever(page, 'esqueci minha senha');
  ok((await guardadas(page)).length === 0 && (await barra(page)).join() === 'Nova conversa', 'sem conta, nada vai para o banco, mas dá para começar outra conversa');
  await page.click('.chat-nota-link');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => !document.getElementById('chat-overlay') && state.parceirosAba === 'entrar'), '"Entre na sua conta" leva ao Entrar do Parceiros');
  await irSenha(page, 'maria@quadralocacao.com.br');
  await page.fill('#login-password', 'senha12345');
  await page.click('#login-submit');
  await page.waitForTimeout(800);
  await abrirChat(page);
  await page.waitForTimeout(200);
  g = await guardadas(page);
  ok((await msgs(page)).includes('EU: esqueci minha senha') && g.length === 1 && g[0].user === 'u-a2' && g[0].titulo === 'esqueci minha senha', 'entrou na conta: a conversa continua e passa a ser guardada nela — ' + JSON.stringify(g));
  await browser.close();

  // ---- banco sem a tabela: o chat funciona e diz que não guardou ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel', semConversas: true }));
  await page.waitForTimeout(300);
  await abrirChat(page);
  await escrever(page, 'esqueci minha senha');
  ok((await msgs(page)).some(x => x.includes('Esqueceu a senha?')) && (await nota(page)) === 'Não deu para guardar esta conversa na conta agora.', 'sem a tabela: responde normalmente e avisa que não guardou');
  await page.click('#chat-ver-conversas');
  await page.waitForTimeout(250);
  ok((await page.evaluate(() => document.querySelector('.chat-lista-vazia')?.innerText || '')).includes('Não deu para abrir as conversas agora'), 'e a lista avisa que não abriu');
  await browser.close();

  // ---- site dos jogadores e admin: o chat não guarda ----
  ({ browser, page } = await abrir({ jogador: true }));
  await page.evaluate(() => { state.showMenu = true; render(); document.querySelector('.menu-drawer [data-menu="contato"]').click(); });
  await page.waitForTimeout(200);
  await page.click('#contato-close-overlay [data-abrir-chat]');
  await page.waitForTimeout(250);
  await escrever(page, 'esqueci minha senha');
  ok((await nota(page)) === 'A conversa fica só na sua tela.' && !(await page.$('#chat-ver-conversas')) && (await guardadas(page)).length === 0, 'no site dos jogadores, mesmo com conta, a conversa fica só na tela');
  await browser.close();
  ({ browser, page } = await abrir({ admin: true, q: 'parceiros/ajuda' }));
  await page.waitForTimeout(300);
  await page.click('.pc-contato [data-abrir-chat]');
  await page.waitForTimeout(250);
  await escrever(page, 'esqueci minha senha');
  ok((await nota(page)) === 'A conversa fica só na sua tela.' && (await guardadas(page)).length === 0, 'o admin não guarda conversa');
  const priv = await page.evaluate(() => PRIVACY_HTML);
  ok(priv.includes('cada conversa fica guardada na conta') && priv.includes('Ficam as 50 conversas mais recentes') && priv.includes('excluir a conta apaga todas'), 'a Política de Privacidade explica o que fica guardado');
  await browser.close();
})();
