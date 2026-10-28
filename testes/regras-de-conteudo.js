// Pedido do Breno em 27/10/2026: "coloque em política de privacidade, em
// termos de uso, que não pode ter ofensas no nome, avaliações não pode ser
// ofensivas ou ser contra as leis do Brasil, algo sobre discriminação... Os
// nomes também não. Coloque que eu posso alterar os nomes ou pedir a troca...
// E comentários que sejam xenofóbicos, homofóbicos, racistas, eu não vou
// tolerar no site." (regra 163)
const { abrir, ok } = require('./harness');

const ultima = (page) => page.evaluate(() => { const l = [...document.querySelectorAll('#chat-msgs .chat-msg')].pop(); return { texto: l.innerText.replace(/\s+/g, ' '), acoes: [...l.querySelectorAll('button, a')].map(b => b.innerText.trim()) }; });

(async () => {
  let { browser, page } = await abrir({ jogador: true, jogadorConfirmado: true, avaliacoes: [{ id: 'r1', academia_id: 'a1', stars: 2, comment: 'Ruim.', created_at: '2026-10-18T10:00:00Z', status: 'published' }] });

  // ---- Termos de Uso e Política de Privacidade ----
  const legal = await page.evaluate(() => ({ termos: TERMS_HTML.replace(/<[^>]+>/g, ''), priv: PRIVACY_HTML.replace(/<[^>]+>/g, '') }));
  // Desde a regra 165 (27/10), o nome da conta fica suspenso por 15 dias
  // (nome-suspenso.js), e o da academia o GuiaTennis altera, com e-mail.
  ok(legal.termos.includes('Nomes. O nome da conta (de jogador ou do GuiaTennis Parceiros) e o nome da academia não podem ter palavrão, ofensa')
    && legal.termos.includes('nada que a lei brasileira proíba') && legal.termos.includes('O nome da conta que desrespeitar essas regras fica suspenso por 15 dias')
    && legal.termos.includes('O nome da academia, o GuiaTennis pode alterar na ficha'),
    'Termos, seção 5: nomes sem ofensa, discriminação ou o que a lei proíbe; o da conta fica suspenso, o da academia o GuiaTennis altera');
  ok(legal.termos.includes('Racismo, homofobia, xenofobia e qualquer discriminação não são tolerados no GuiaTennis')
    && legal.termos.includes('Lei 7.716/1989') && legal.termos.includes('homofobia e a transfobia') && legal.termos.includes('xenofobia')
    && legal.termos.includes('respostas das academias') && legal.termos.includes('entregues às autoridades'),
    'Termos, seção 6: avaliações, comentários e respostas sem ofensa nem discriminação, com a lei brasileira e o que acontece');
  ok(legal.termos.includes('usar nome ou publicar conteúdo ofensivo ou discriminatório') && !/\bpôr\b/.test(legal.termos), 'Termos, seção 9: o uso aceitável cita nomes e conteúdo ofensivo');
  ok(legal.priv.includes('Nomes e conteúdo que desrespeitam as regras') && legal.priv.includes('Quando o nome da conta é suspenso, guardamos')
    && legal.priv.includes('Marco Civil da Internet') && legal.priv.includes('ordem judicial'),
    'Privacidade: o registro do nome suspenso e do que foi removido, e só às autoridades quando a lei exigir');
  ok(await page.evaluate(() => TERMS_HTML.includes('Última atualização: 28 de outubro de 2026') && PRIVACY_HTML.includes('Última atualização: 28 de outubro de 2026')), 'os dois textos com a data da última mudança (28/10: a avaliação editada)');

  // ---- na ficha: o aceite, o "Como funcionam" e a denúncia ----
  await page.evaluate(() => openCourt('a1'));
  await page.waitForTimeout(400);
  const aceite = await page.evaluate(() => document.querySelector('.rate-box .consent-row')?.innerText.replace(/\s+/g, ' ').trim() || '');
  // Seguir os Termos já diz que não tem ofensa nem discriminação (27/10:
  // "se a avaliação segue os termos... não precisa dizer novamente").
  ok(aceite === 'Minha avaliação é verídica e segue os Termos de Uso.', 'o aceite da avaliação só diz que segue os Termos, sem repetir o que eles proíbem — ' + aceite);
  ok(await page.evaluate(() => COMO_FUNCIONAM_AS_AVALIACOES.includes('Ofensa e discriminação, como racismo, homofobia e xenofobia, não são toleradas.')), '"Como funcionam as avaliações" diz que não são toleradas');
  await page.evaluate(() => abrirAvisoFicha('denuncia', 'a1', 'r1'));
  await page.waitForTimeout(200);
  const motivos = await page.evaluate(() => [...document.querySelectorAll('.aviso-opcao')].map(x => x.innerText.trim()));
  ok(motivos.includes('É ofensiva, discriminatória (racismo, homofobia, xenofobia…) ou tem ameaça'), 'denunciar: o motivo de discriminação está à vista — ' + motivos.join(' | '));
  await browser.close();

  // ---- chat de ajuda (uma conversa nova para cada frase) ----
  for (const frase of ['achei uma avaliação racista', 'tem um comentário homofóbico', 'um nome ofensivo numa avaliação', 'avaliação com xenofobia']) {
    ({ browser, page } = await abrir({}));
    await page.evaluate(() => { state.showMenu = true; render(); document.querySelector('.menu-drawer [data-menu="contato"]').click(); });
    await page.waitForTimeout(200);
    await page.click('#contato-close-overlay [data-abrir-chat]');
    await page.waitForTimeout(300);
    await page.fill('#chat-texto', frase);
    await page.click('.chat-enviar');
    await page.waitForTimeout(250);
    const u = await ultima(page);
    ok(u.texto.includes('Denunciar') && u.texto.includes('não são toleradas') && u.texto.includes('o nome fica suspenso, e a conta tem 15 dias para trocar') && u.acoes.includes('Avisar pelo WhatsApp'), `o chat entende "${frase}" — ` + u.texto.slice(0, 80));
    await browser.close();
  }
})();
