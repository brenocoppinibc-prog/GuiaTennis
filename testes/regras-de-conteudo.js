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
  ok(legal.termos.includes('Nomes. O nome da conta (de jogador ou do GuiaTennis Parceiros) e o nome da academia não podem ter palavrão, ofensa')
    && legal.termos.includes('nada que a lei brasileira proíba') && legal.termos.includes('O GuiaTennis pode alterar um nome assim (na conta, na ficha e nas avaliações já publicadas) ou pedir que a pessoa ou a academia o troque'),
    'Termos, seção 5: nomes sem ofensa, discriminação ou o que a lei proíbe; o GuiaTennis altera ou pede a troca');
  ok(legal.termos.includes('Racismo, homofobia, xenofobia e qualquer discriminação não são tolerados no GuiaTennis')
    && legal.termos.includes('Lei 7.716/1989') && legal.termos.includes('homofobia e a transfobia') && legal.termos.includes('xenofobia')
    && legal.termos.includes('respostas das academias') && legal.termos.includes('entregues às autoridades'),
    'Termos, seção 6: avaliações, comentários e respostas sem ofensa nem discriminação, com a lei brasileira e o que acontece');
  ok(legal.termos.includes('usar nome ou publicar conteúdo ofensivo ou discriminatório') && !/\bpôr\b/.test(legal.termos), 'Termos, seção 9: o uso aceitável cita nomes e conteúdo ofensivo');
  ok(legal.priv.includes('Nomes e conteúdo que desrespeitam as regras') && legal.priv.includes('troca o nome na conta e nas avaliações já publicadas, ou pede a troca')
    && legal.priv.includes('Marco Civil da Internet') && legal.priv.includes('ordem judicial'),
    'Privacidade: o registro do que foi trocado ou removido, e só às autoridades quando a lei exigir');
  ok(await page.evaluate(() => TERMS_HTML.includes('Última atualização: 27 de outubro de 2026') && PRIVACY_HTML.includes('Última atualização: 27 de outubro de 2026')), 'os dois textos com a data de hoje');

  // ---- na ficha: o aceite, o "Como funcionam" e a denúncia ----
  await page.evaluate(() => openCourt('a1'));
  await page.waitForTimeout(400);
  const aceite = await page.evaluate(() => document.querySelector('.rate-box .consent-row')?.innerText.replace(/\s+/g, ' ').trim() || '');
  ok(aceite === 'Minha avaliação é verídica, sem ofensa nem discriminação, e segue os Termos de Uso.', 'o aceite da avaliação diz "sem ofensa nem discriminação" — ' + aceite);
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
    ok(u.texto.includes('Denunciar') && u.texto.includes('não são toleradas') && u.texto.includes('troca o nome ou pede a troca') && u.acoes.includes('Avisar pelo WhatsApp'), `o chat entende "${frase}" — ` + u.texto.slice(0, 80));
    await browser.close();
  }
})();
