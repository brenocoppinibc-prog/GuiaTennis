// A nota do GuiaTennis (pedido do Breno em 10/11/2026, regra 234: "criar algo
// para avaliarem, darem feedback e mostrar essa nota aos jogadores e
// principalmente aos parceiros para vender mais ... smp ser uma via de mão
// dupla") e o "Sair da conta" em vermelho.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);
const cor = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); return el ? getComputedStyle(el).color : ''; }, sel);
const VERMELHO = 'rgb(168, 70, 44)';
const NOTA = {
  jogador: { media: 4.7, total: 12, comentarios: [{ nome: 'Gabi L.', nota: 5, texto: 'Achei quadra perto de casa', quando: '2026-11-10', resposta: 'Obrigado, Gabi!' }] },
  parceiro: { media: 4.8, total: 5, comentarios: [{ nome: 'Arena Moema', nota: 5, texto: 'Chegaram alunos novos pelo WhatsApp', quando: '2026-11-10', resposta: 'Que bom, Arena Moema!' }] },
};

(async () => {
  // ---- Jogador: o rodapé, Minha conta, o "Sair da conta" vermelho e a avaliação ----
  let { browser, page } = await abrir({ jogador: true, jogadorConfirmado: true, q: 'perfil', notaDoGuia: NOTA });
  await page.waitForTimeout(1200);
  ok(await cor(page, '#jog-sair') === VERMELHO, '"Sair da conta" em vermelho na Minha conta — ' + await cor(page, '#jog-sair'));
  let rodape = (await texto(page, '[data-nota-do-guia="jogador"]')).replace(/\s+/g, ' ');
  ok(rodape.includes('4,7') && rodape.includes('12 avaliações de jogadores') && rodape.includes('Avaliar o GuiaTennis'), 'o rodapé mostra a nota dos jogadores e "Avaliar o GuiaTennis" — ' + rodape);
  let cartao = await texto(page, '#perfil-nota');
  ok(cartao.includes('Sua nota para o GuiaTennis') && cartao.includes('O GuiaTennis responde cada avaliação') && await page.$('#perfil-nota [data-avaliar-guia="jogador"]'), 'Minha conta: "Sua nota para o GuiaTennis", com o que o jogador ganha (a resposta)');
  await page.click('#perfil-nota [data-avaliar-guia="jogador"]');
  await page.waitForTimeout(200);
  ok((await texto(page, '#nota-guia-overlay')).includes('Como o GuiaTennis está te ajudando?') && !(await page.$('#nota-guia-enviar')), 'a folha pede as estrelas primeiro');
  await page.click('[data-nota-guia-estrela="2"]');
  await page.waitForTimeout(150);
  let folha = await texto(page, '#nota-guia-overlay');
  ok(folha.includes('Ruim') && folha.includes('O que faltou?') && folha.includes('Mais academias na minha região') && await page.$('#nota-guia-contato'), 'nota baixa: "O que faltou?" e o pedido de contato');
  await page.click('[data-nota-guia-ponto="mais_academias"]');
  await page.fill('#nota-guia-texto', 'Faltam academias no meu bairro');
  await page.click('[data-nota-guia-estrela="2"]');
  await page.waitForTimeout(100);
  ok((await page.inputValue('#nota-guia-texto')) === 'Faltam academias no meu bairro', 'o texto não some quando muda a estrela');
  await page.check('#nota-guia-contato');
  await page.click('#nota-guia-enviar');
  await page.waitForTimeout(500);
  const args = await page.evaluate(() => (window.__rpcs.filter(r => r.nome === 'avaliar_o_guia').pop() || {}).args || {});
  ok(args.p_publico === 'jogador' && args.p_nota === 2 && args.p_pontos.includes('mais_academias') && args.p_comentario === 'Faltam academias no meu bairro' && args.p_quer_contato === true && args.p_momento === 'minha-conta',
    'vai ao banco com a nota, o que faltou, o comentário e o pedido de contato — ' + JSON.stringify(args));
  ok((await texto(page, '#nota-guia-overlay')).includes('O GuiaTennis vai falar com você pelo e-mail da conta.'), 'o obrigado diz o que acontece depois (mão dupla)');
  await page.click('#nota-guia-ok');
  await page.waitForTimeout(200);
  cartao = await texto(page, '#perfil-nota');
  ok(cartao.includes('★★☆☆☆') && cartao.includes('Faltam academias no meu bairro') && cartao.includes('Mudar a avaliação'), 'a avaliação aparece na Minha conta, com "Mudar a avaliação"');
  await page.evaluate(() => { window.__avaliacoesDoGuia[0].resposta = 'Obrigado! Estamos cadastrando o seu bairro.'; window.__avaliacoesDoGuia[0].feito_texto = '12 academias novas em Moema.'; state.minhaNotaGuia = {}; render(); });
  await page.waitForTimeout(500);
  cartao = await texto(page, '#perfil-nota');
  ok(cartao.includes('Resposta do GuiaTennis: Obrigado! Estamos cadastrando o seu bairro.') && cartao.includes('Você pediu, nós fizemos: 12 academias novas em Moema.'), 'a resposta e o "Você pediu, nós fizemos" aparecem para quem avaliou');
  await browser.close();

  // ---- Poucas avaliações: a nota não aparece (com 1 ou 2, a média engana) ----
  ({ browser, page } = await abrir({ notaDoGuia: { jogador: { media: 5, total: 2, comentarios: [] }, parceiro: { media: 5, total: 1, comentarios: [] } } }));
  await page.waitForTimeout(1200);
  rodape = await texto(page, '[data-nota-do-guia="jogador"]');
  ok(!rodape.includes('5,0') && rodape.includes('O GuiaTennis está te ajudando?'), 'com menos de 3 avaliações, o rodapé só convida a avaliar');
  await browser.close();

  // ---- Parceiros: a página de venda e o Plano mostram a nota das academias ----
  ({ browser, page } = await abrir({ q: 'parceiros', notaDoGuia: NOTA }));
  await page.waitForTimeout(1200);
  let venda = (await texto(page, '#pc-nota-guia-sec')).replace(/\s+/g, ' ');
  ok(venda.includes('O que as academias acham do GuiaTennis') && venda.includes('4,8') && venda.includes('5 avaliações de academias') && venda.includes('Chegaram alunos novos pelo WhatsApp') && venda.includes('Arena Moema') && venda.includes('Resposta do GuiaTennis: Que bom, Arena Moema!'),
    'a página de venda do Parceiros mostra a nota, os comentários com o nome da academia e a resposta — ' + venda.slice(0, 200));
  await browser.close();

  // ---- Painel da academia: o pedido com as estrelas, "Agora não" e o obrigado com o QR code ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel', notaDoGuia: NOTA }));
  await page.waitForTimeout(1000);
  ok((await texto(page, '#pc-nota-guia-pedido')).includes('Como o GuiaTennis está ajudando a Só Aula Tennis?'), 'o painel pede a nota a quem ainda não avaliou');
  await page.click('[data-nota-guia-direto="5"]');
  await page.waitForTimeout(200);
  folha = await texto(page, '#nota-guia-overlay');
  ok(folha.includes('Ótimo') && folha.includes('O que mais ajuda?') && folha.includes('Contatos no WhatsApp') && !(await page.$('#nota-guia-contato')) && folha.includes('com o nome da academia'), 'tocar na 5ª estrela abre a folha com a nota escolhida e "O que mais ajuda?"');
  await page.click('[data-nota-guia-ponto="contatos"]');
  await page.click('#nota-guia-enviar');
  await page.waitForTimeout(500);
  folha = await texto(page, '#nota-guia-overlay');
  ok(folha.includes('Que bom que o GuiaTennis está ajudando a Só Aula Tennis') && folha.includes('QR code da ficha') && await page.$('#nota-guia-qr'), 'nota alta: a dica do QR code para os alunos avaliarem a academia (o que a academia ganha)');
  ok(await page.evaluate(() => { const r = window.__rpcs.filter(x => x.nome === 'avaliar_o_guia').pop(); return r && r.args.p_publico === 'parceiro' && r.args.p_academia === 'a1' && r.args.p_nota === 5; }), 'vai ao banco como parceiro, pela academia');
  await page.click('#nota-guia-ok');
  await page.waitForTimeout(200);
  ok(!(await page.$('#pc-nota-guia-pedido')), 'depois de avaliar, o pedido some do painel');
  await browser.close();
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel' }));
  await page.waitForTimeout(800);
  await page.click('#pc-nota-guia-depois');
  await page.waitForTimeout(200);
  ok(!(await page.$('#pc-nota-guia-pedido')) && await page.evaluate(() => !!localStorage.getItem('gt-nota-guia-adiada')), '"Agora não" guarda o pedido por 60 dias');
  await page.goto(page.url().replace(/\/parceiros\/.*$/, '/parceiros/perfil'));
  await page.waitForTimeout(1000);
  ok(await cor(page, '#conta-sair') === VERMELHO, '"Sair da conta" em vermelho no Perfil do Parceiros — ' + await cor(page, '#conta-sair'));
  ok((await texto(page, '#pc-nota-guia')).includes('Sua nota para o GuiaTennis'), 'o Perfil do Parceiros tem "Sua nota para o GuiaTennis"');
  await browser.close();

  // ---- Admin: responder, "Você pediu, nós fizemos" e tirar do site ----
  ({ browser, page } = await abrir({ admin: true, q: 'admin', w: 1280, notaDoGuia: NOTA, avaliacoesDoGuia: [
    { id: 'g1', user_id: 'x', publico: 'jogador', nota: 2, pontos: ['mais_academias'], comentario: 'Faltam academias', pode_mostrar: true, quer_contato: true, nome_publico: 'Hugo P.', updated_at: '2026-11-10T12:00:00Z', email: 'hugo@exemplo.com' },
    { id: 'g2', user_id: 'y', publico: 'parceiro', nota: 5, pontos: ['contatos'], comentario: 'Ótimo', pode_mostrar: true, nome_publico: 'Arena Moema', academia: 'Arena Moema', updated_at: '2026-11-10T13:00:00Z', resposta: 'Obrigado!', respondida_em: '2026-11-10T14:00:00Z', email: 'arena@exemplo.com' }] }));
  await page.click('.adm-nav [data-adm-aba="nota"]');
  await page.waitForTimeout(500);
  let adm = (await texto(page, '#painel-admin')).replace(/\s+/g, ' ');
  ok(await page.evaluate(() => location.pathname === '/admin/nota') && adm.includes('Nota do GuiaTennis') && adm.includes('Jogadores: ★★★★★ 4,7 · 12 avaliações') && /quer contato/i.test(adm) && adm.includes('Mais academias na minha região') && adm.includes('hugo@exemplo.com'),
    'o admin vê a nota de cada lado e cada avaliação, com o que faltou, o e-mail e o pedido de contato — ' + adm.slice(adm.indexOf('A nota no site'), adm.indexOf('A nota no site') + 220));
  ok((await texto(page, '.adm-nav [data-adm-aba="nota"]')).includes('1'), 'o menu mostra quantas estão sem resposta');
  await page.fill('#nr-g1', 'Obrigado, Hugo! Já estamos cadastrando o seu bairro.');
  await page.fill('#nf-g1', '12 academias novas em Moema.');
  await page.click('[data-nota-guia-salvar="g1"]');
  await page.waitForTimeout(400);
  const resp = await page.evaluate(() => (window.__rpcs.filter(r => r.nome === 'responder_avaliacao_do_guia').pop() || {}).args || {});
  ok(resp.p_id === 'g1' && resp.p_resposta.startsWith('Obrigado, Hugo!') && resp.p_feito === '12 academias novas em Moema.' && (await texto(page, '#painel-admin')).includes('Salvo. Quem avaliou recebe por e-mail.'), '"Responder" manda a resposta e o "Você pediu, nós fizemos"');
  await page.click('[data-nota-guia-ocultar="g2"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => window.__avaliacoesDoGuia.find(x => x.id === 'g2').oculta === true) && (await texto(page, '#painel-admin')).includes('A nota continua contando'), '"Tirar do site" tira só o comentário');
  ok(await cor(page, '.adm-nav [data-adm-acao="adm-sair"]') === VERMELHO, '"Sair da conta" em vermelho no painel do admin');
  ok(await page.evaluate(() => ADM_TIPOS_DE_EMAIL.avaliacao_do_guia === 'Nota do GuiaTennis' && abaDoAviso('avaliacao_do_guia') === 'nota'), 'o aviso "Nota do GuiaTennis" leva à aba');
  await browser.close();

  // ---- Banco sem o SQL e os textos ----
  ({ browser, page } = await abrir({ jogador: true, jogadorConfirmado: true, q: 'perfil', semNotaDoGuia: true }));
  await page.waitForTimeout(1200);
  ok(!(await page.$('#perfil-nota')) && (await texto(page, '[data-nota-do-guia="jogador"]')).includes('Avaliar o GuiaTennis'), 'banco sem o SQL: Minha conta sem o cartão, o resto igual');
  ok(await page.evaluate(() => TERMS_HTML.includes('Nota do GuiaTennis:') && TERMS_HTML.includes('não paga nem dá vantagem') && PRIVACY_HTML.includes('Quem avalia o GuiaTennis')), 'Termos e Privacidade falam da nota do GuiaTennis');
  await browser.close();
})();
