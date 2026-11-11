// O feedback ao GuiaTennis (regra 234: "criar algo para avaliarem, darem
// feedback ... smp ser uma via de mão dupla"; regra 238, 11/11/2026: "renomeie
// a página de avaliação para feedback, a página de obrigado deixar mais
// centralizada e mudar avaliação para editar avaliação, deixe a primeira página
// mais simples algo com uma cara mais técnica e a nota não mostrar por agr em
// nenhum lugar e só quem vê sou eu e entrando na página de feedback ver a que
// fez e a minha resposta") e o "Sair da conta" em vermelho.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' '), sel);
const cor = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); return el ? getComputedStyle(el).color : ''; }, sel);
const VERMELHO = 'rgb(168, 70, 44)';
const NOTA = {
  jogador: { media: 4.7, total: 12, comentarios: [{ nome: 'Gabi L.', nota: 5, texto: 'Achei quadra perto de casa', quando: '2026-11-10', resposta: 'Obrigado, Gabi!' }] },
  parceiro: { media: 4.8, total: 5, comentarios: [{ nome: 'Arena Moema', nota: 5, texto: 'Chegaram alunos novos pelo WhatsApp', quando: '2026-11-10', resposta: 'Que bom, Arena Moema!' }] },
};
const naoChamouANota = (page) => page.evaluate(() => !window.__rpcs.some(r => r.nome === 'nota_do_guia'));

(async () => {
  // ---- Visitante: a nota não aparece em lugar nenhum; o rodapé leva ao Feedback ----
  let { browser, page } = await abrir({ notaDoGuia: NOTA });
  await page.waitForTimeout(1500);
  let rodape = await texto(page, '.sitefooter');
  ok(rodape.includes('Feedback') && rodape.includes('Enviar feedback') && !rodape.includes('4,7') && !rodape.includes('avaliações de jogadores'), 'o rodapé tem "Feedback", sem a nota');
  ok(await naoChamouANota(page), 'o site nem busca a nota (só o admin)');
  await page.click('.sitefooter a[data-ir-feedback]');
  await page.waitForTimeout(500);
  let pag = await texto(page, '.pag-feedback');
  ok(await page.evaluate(() => state.page === 'feedback' && location.pathname === '/feedback') && pag.includes('Feedback') && await page.$('.pag-feedback [data-avaliar-guia="jogador"]'), '/feedback abre com "Enviar feedback"');
  ok(!/4,7|como funcionam|sem filtro|média/i.test(pag) && await page.evaluate(() => document.title === 'Feedback | GuiaTennis'), 'a página não mostra nota nem explica como funciona — ' + pag);
  await page.evaluate(() => { state.showMenu = true; render(); });
  await page.waitForTimeout(200);
  ok((await texto(page, '[data-menu="feedback"]')) === 'Feedback', 'o menu tem "Feedback"');
  await browser.close();
  ({ browser, page } = await abrir({ q: 'avaliacoes' }));
  await page.waitForTimeout(700);
  ok(await page.evaluate(() => state.page === 'feedback' && location.pathname === '/feedback'), 'o link antigo /avaliacoes abre o Feedback');
  await browser.close();

  // ---- Parceiros: a página de venda e o Plano sem a nota ----
  ({ browser, page } = await abrir({ q: 'parceiros', notaDoGuia: NOTA }));
  await page.waitForTimeout(1200);
  ok(!(await page.$('#pc-nota-guia-sec')) && !(await texto(page, '#app')).includes('O que as academias acham do GuiaTennis'), 'a página de venda do Parceiros não mostra a nota');
  await browser.close();

  // ---- Jogador: Minha conta, a folha (escala de 1 a 5), o obrigado e a página Feedback ----
  ({ browser, page } = await abrir({ jogador: true, jogadorConfirmado: true, q: 'perfil', notaDoGuia: NOTA }));
  await page.waitForTimeout(1200);
  ok(await cor(page, '#jog-sair') === VERMELHO, '"Sair da conta" em vermelho na Minha conta — ' + await cor(page, '#jog-sair'));
  let cartao = await texto(page, '#perfil-nota');
  ok(cartao.includes('Seu feedback para o GuiaTennis') && await page.$('#perfil-nota [data-avaliar-guia="jogador"]') && cartao.includes('Enviar feedback'), 'Minha conta: "Seu feedback para o GuiaTennis" com "Enviar feedback"');
  await page.click('#perfil-nota [data-avaliar-guia="jogador"]');
  await page.waitForTimeout(200);
  let folha = await texto(page, '#nota-guia-overlay');
  ok(folha.includes('Enviar feedback') && folha.includes('NOTA') && await page.$$eval('#nota-guia-overlay .nota-guia-estrela', b => b.length) === 5 && !(await page.$('#nota-guia-enviar')),
    'a primeira tela: título curto e as 5 estrelas (regra 239) — ' + folha);
  ok(!/média|aparece no site|mostra a outr/i.test(folha), 'sem texto sobre a nota no site');
  await page.click('[data-nota-guia-estrela="2"]');
  await page.waitForTimeout(150);
  folha = await texto(page, '#nota-guia-overlay');
  ok(await page.$$eval('#nota-guia-overlay .nota-guia-estrela.on', b => b.length) === 2 && folha.includes('2 de 5 · Ruim') && /O QUE FALTOU/i.test(folha) && folha.includes('Mais academias na minha região') && await page.$('#nota-guia-contato') && !(await page.$('#nota-guia-mostrar')),
    'nota baixa: "O que faltou", o pedido de contato e nenhuma pergunta sobre mostrar no site');
  await page.click('[data-nota-guia-ponto="mais_academias"]');
  await page.fill('#nota-guia-texto', 'Faltam academias no meu bairro');
  await page.click('[data-nota-guia-estrela="2"]');
  await page.waitForTimeout(100);
  ok((await page.inputValue('#nota-guia-texto')) === 'Faltam academias no meu bairro', 'o texto não some quando muda a nota');
  await page.check('#nota-guia-contato');
  await page.click('#nota-guia-enviar');
  await page.waitForTimeout(500);
  const args = await page.evaluate(() => (window.__rpcs.filter(r => r.nome === 'avaliar_o_guia').pop() || {}).args || {});
  ok(args.p_publico === 'jogador' && args.p_nota === 2 && args.p_pontos.includes('mais_academias') && args.p_comentario === 'Faltam academias no meu bairro' && args.p_quer_contato === true && args.p_pode_mostrar === false && args.p_momento === 'minha-conta',
    'vai ao banco com a nota, o que faltou, o comentário, o pedido de contato e sem mostrar no site — ' + JSON.stringify(args));
  const fim = await page.evaluate(() => { const c = document.querySelector('.nota-guia-fim'); const b = c.getBoundingClientRect(); const ic = c.querySelector('.nota-guia-fim-ic').getBoundingClientRect(); const ok2 = document.getElementById('nota-guia-ok').getBoundingClientRect();
    return { alinhado: getComputedStyle(c).textAlign, icone: Math.abs((ic.left + ic.right) / 2 - (b.left + b.right) / 2) < 3, botao: Math.abs((ok2.left + ok2.right) / 2 - (b.left + b.right) / 2) < 3, t: c.innerText.replace(/\s+/g, ' ') }; });
  ok(fim.alinhado === 'center' && fim.icone && fim.botao && fim.t.includes('Obrigado!') && fim.t.includes('O GuiaTennis vai falar com você pelo e-mail da conta.'), 'o obrigado centralizado, com o que acontece depois — ' + fim.t);
  await page.click('#nota-guia-ok');
  await page.waitForTimeout(200);
  cartao = await texto(page, '#perfil-nota');
  ok(cartao.includes('★★☆☆☆') && cartao.includes('Faltam academias no meu bairro') && cartao.includes('Editar avaliação') && cartao.includes('Ainda sem resposta'), 'a avaliação aparece na Minha conta, com "Editar avaliação"');
  await page.click('#perfil-nota [data-avaliar-guia="jogador"]');
  await page.waitForTimeout(200);
  folha = await texto(page, '#nota-guia-overlay');
  ok(folha.includes('Editar avaliação') && folha.includes('2 de 5 · Ruim') && (await texto(page, '#nota-guia-enviar')) === 'Salvar', 'editar: a folha abre com "Editar avaliação", a nota marcada e "Salvar"');
  await page.click('#nota-guia-fechar');
  await page.evaluate(() => { window.__avaliacoesDoGuia[0].resposta = 'Obrigado! Estamos cadastrando o seu bairro.'; window.__avaliacoesDoGuia[0].feito_texto = '12 academias novas em Moema.'; state.minhaNotaGuia = {}; goFeedback(); });
  await page.waitForTimeout(600);
  pag = await texto(page, '.pag-feedback');
  ok(pag.includes('Seu feedback para o GuiaTennis') && pag.includes('Faltam academias no meu bairro') && pag.includes('Resposta do GuiaTennis: Obrigado! Estamos cadastrando o seu bairro.') && pag.includes('Você pediu, nós fizemos: 12 academias novas em Moema.') && pag.includes('Editar avaliação'),
    'a página Feedback mostra o feedback da pessoa e a resposta — ' + pag);
  ok(!pag.includes('Gabi') && !pag.includes('4,7') && await naoChamouANota(page), 'e nada dos outros nem a nota de todos');
  await browser.close();

  // ---- Painel da academia: o pedido com a escala, "Agora não" e o obrigado com o QR code ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel', notaDoGuia: NOTA }));
  await page.waitForTimeout(1000);
  ok((await texto(page, '#pc-nota-guia-pedido')).includes('Como o GuiaTennis está ajudando a Só Aula Tennis?') && await page.$$eval('#pc-nota-guia-pedido .nota-guia-estrela', b => b.length) === 5, 'o painel pede a nota, com as estrelas');
  await page.click('[data-nota-guia-direto="5"]');
  await page.waitForTimeout(200);
  folha = await texto(page, '#nota-guia-overlay');
  ok(folha.includes('5 de 5 · Ótimo') && /O QUE MAIS AJUDA/i.test(folha) && folha.includes('Contatos no WhatsApp') && folha.includes('Só Aula Tennis · GuiaTennis Parceiros') && !(await page.$('#nota-guia-contato')), 'tocar na 5ª estrela abre a folha com a nota escolhida');
  await page.click('[data-nota-guia-ponto="contatos"]');
  await page.click('#nota-guia-enviar');
  await page.waitForTimeout(500);
  folha = await texto(page, '#nota-guia-overlay');
  ok(folha.includes('Que bom que o GuiaTennis está ajudando a Só Aula Tennis') && await page.$('#nota-guia-qr'), 'nota alta: a dica do QR code');
  ok(await page.evaluate(() => { const r = window.__rpcs.filter(x => x.nome === 'avaliar_o_guia').pop(); return r && r.args.p_publico === 'parceiro' && r.args.p_academia === 'a1' && r.args.p_nota === 5; }), 'vai ao banco como parceiro, pela academia');
  await page.click('#nota-guia-ok');
  await page.waitForTimeout(200);
  ok(!(await page.$('#pc-nota-guia-pedido')), 'depois de enviar, o pedido some do painel');
  await page.evaluate(() => goFeedback());
  await page.waitForTimeout(500);
  pag = await texto(page, '.pag-feedback');
  ok(pag.includes('Feedback da Só Aula Tennis') && pag.includes('★★★★★'), 'a conta da academia vê o feedback da academia na página — ' + pag);
  await browser.close();
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel' }));
  await page.waitForTimeout(800);
  await page.click('#pc-nota-guia-depois');
  await page.waitForTimeout(200);
  ok(!(await page.$('#pc-nota-guia-pedido')) && await page.evaluate(() => !!localStorage.getItem('gt-nota-guia-adiada')), '"Agora não" guarda o pedido por 60 dias');
  await page.goto(page.url().replace(/\/parceiros\/.*$/, '/parceiros/perfil'));
  await page.waitForTimeout(1000);
  ok(await cor(page, '#conta-sair') === VERMELHO, '"Sair da conta" em vermelho no Perfil do Parceiros — ' + await cor(page, '#conta-sair'));
  ok((await texto(page, '#pc-nota-guia')).includes('Seu feedback para o GuiaTennis'), 'o Perfil do Parceiros tem "Seu feedback para o GuiaTennis"');
  await page.evaluate(() => { state.parceirosAba = 'plano'; render(); });
  await page.waitForTimeout(500);
  ok(!(await page.$('.nota-guia-curta')) && !(await texto(page, '#app')).includes('Nota das academias'), 'o Plano não mostra a nota');
  await browser.close();

  // ---- Admin: só ele vê a nota; responde e conta o que foi feito ----
  ({ browser, page } = await abrir({ admin: true, q: 'admin', w: 1280, notaDoGuia: NOTA, avaliacoesDoGuia: [
    { id: 'g1', user_id: 'x', publico: 'jogador', nota: 2, pontos: ['mais_academias'], comentario: 'Faltam academias', pode_mostrar: true, quer_contato: true, nome_publico: 'Hugo P.', updated_at: '2026-11-10T12:00:00Z', email: 'hugo@exemplo.com' },
    { id: 'g2', user_id: 'y', publico: 'parceiro', nota: 5, pontos: ['contatos'], comentario: 'Ótimo', pode_mostrar: true, nome_publico: 'Arena Moema', academia: 'Arena Moema', updated_at: '2026-11-10T13:00:00Z', resposta: 'Obrigado!', respondida_em: '2026-11-10T14:00:00Z', email: 'arena@exemplo.com' }] }));
  await page.click('.adm-nav [data-adm-aba="nota"]');
  await page.waitForTimeout(500);
  let adm = await texto(page, '#painel-admin');
  ok(await page.evaluate(() => location.pathname === '/admin/nota') && (await texto(page, '.adm-nav [data-adm-aba="nota"]')).includes('Feedback') && adm.includes('A nota (só você vê)') && adm.includes('Jogadores: ★★★★★ 4,7 · 12 avaliações') && /quer contato/i.test(adm) && adm.includes('hugo@exemplo.com'),
    'o admin vê a aba "Feedback", a nota de cada lado e cada feedback — ' + adm.slice(adm.indexOf('A nota'), adm.indexOf('A nota') + 160));
  ok(!(await page.$('[data-nota-guia-ocultar]')) && adm.includes('Por enquanto, a nota e os comentários não aparecem no site: só você vê.'), 'sem "Tirar do site": nada aparece no site');
  await page.fill('#nr-g1', 'Obrigado, Hugo! Já estamos cadastrando o seu bairro.');
  await page.fill('#nf-g1', '12 academias novas em Moema.');
  await page.click('[data-nota-guia-salvar="g1"]');
  await page.waitForTimeout(400);
  const resp = await page.evaluate(() => (window.__rpcs.filter(r => r.nome === 'responder_avaliacao_do_guia').pop() || {}).args || {});
  ok(resp.p_id === 'g1' && resp.p_resposta.startsWith('Obrigado, Hugo!') && resp.p_feito === '12 academias novas em Moema.' && (await texto(page, '#painel-admin')).includes('Salvo. Quem avaliou recebe por e-mail.'), '"Responder" manda a resposta e o "Você pediu, nós fizemos"');
  ok(await cor(page, '.adm-nav [data-adm-acao="adm-sair"]') === VERMELHO, '"Sair da conta" em vermelho no painel do admin');
  ok(await page.evaluate(() => ADM_TIPOS_DE_EMAIL.avaliacao_do_guia === 'Feedback' && abaDoAviso('avaliacao_do_guia') === 'nota'), 'o aviso "Feedback" leva à aba');
  await page.evaluate(() => goFeedback());
  await page.waitForTimeout(400);
  ok(await page.$('[data-feedback-admin]') && !(await page.$('.pag-feedback [data-avaliar-guia]')), 'na página Feedback, o admin vai ao painel (não envia feedback)');
  await browser.close();

  // ---- Banco sem o SQL e os textos ----
  ({ browser, page } = await abrir({ jogador: true, jogadorConfirmado: true, q: 'perfil', semNotaDoGuia: true }));
  await page.waitForTimeout(1200);
  ok(!(await page.$('#perfil-nota')) && (await texto(page, '.sitefooter')).includes('Enviar feedback'), 'banco sem o SQL: Minha conta sem o cartão, o resto igual');
  ok(await page.evaluate(() => TERMS_HTML.includes('Feedback ao GuiaTennis:') && TERMS_HTML.includes('não aparecem no site') && TERMS_HTML.includes('não paga nem dá vantagem') && PRIVACY_HTML.includes('Quem manda feedback ao GuiaTennis') && PRIVACY_HTML.includes('página Feedback')),
    'Termos e Privacidade: o feedback, a nota só para o GuiaTennis e a página Feedback');
  await browser.close();
})();
