// Pedido do Breno em 28/10/2026 (regra 167): "Avaliações em academias podem
// ser feitas uma vez e podem ser editadas. E aparecer que foi editada. o mesmo
// pode ser feito com as academias". Como o Google Maps (a sua avaliação em
// cima, com "Editar") e o "Editado" do Instagram.
const { abrir, ok } = require('./harness');

const MINHA = { id: 'r1', academia_id: 'a1', stars: 3, comment: 'Quadra boa.', created_at: '2026-10-10T10:00:00Z', status: 'published', user_id: 'j-ana', nome_autor: 'Ana Jogadora', contato_autor: 'ana@exemplo.com' };
const DA_BIA = { id: 'r2', academia_id: 'a1', stars: 4, comment: 'Gostei dos professores.', created_at: '2026-10-20T10:00:00Z', editada_em: '2026-10-21T10:00:00Z', status: 'published', user_id: 'j-bia', nome_autor: 'Bia Souza' };
const caixa = (page) => page.evaluate(() => document.querySelector('.rate-box')?.innerText.replace(/\s+/g, ' ').trim() || '');

(async () => {
  // ---- quem já avaliou vê "Sua avaliação" com "Editar" ----
  let { browser, page } = await abrir({ jogador: true, jogadorConfirmado: true, avaliacoes: [MINHA, DA_BIA] });
  await page.evaluate(() => openCourt('a1'));
  await page.waitForTimeout(400);
  let t = await caixa(page);
  ok(t.includes('Sua avaliação') && t.includes('3/5') && t.includes('Quadra boa.') && t.includes('Editar avaliação') && t.includes('Cada conta avalia uma vez cada academia'),
    'quem já avaliou vê "Sua avaliação" com a nota, o texto e "Editar avaliação" — ' + t);
  ok(!(await page.$('.rate-box #star-picker')) && !(await page.$('#rate-submit')), 'e não o formulário de avaliar de novo');
  let cartoes = await page.evaluate(() => [...document.querySelectorAll('#ht-revs .ht-rev')].map(x => ({ texto: x.innerText.replace(/\s+/g, ' '), denunciar: !!x.querySelector('[data-denunciar]'), editar: !!x.querySelector('[data-editar-avaliacao]') })));
  ok(cartoes[0].texto.includes('Quadra boa.') && cartoes[0].texto.includes('Sua avaliação') && cartoes[0].editar && !cartoes[0].denunciar,
    'na lista, a sua vem primeiro, com "Sua avaliação · Editar" e sem "Denunciar"');
  ok(cartoes[1].texto.includes('Bia Souza') && cartoes[1].texto.includes('· editada') && cartoes[1].denunciar && !cartoes[1].editar, 'a editada de outra pessoa mostra "editada", com "Denunciar"');
  ok(!cartoes[0].texto.includes('editada'), 'a que não foi editada, não');

  // ---- editar ----
  await page.click('#rate-editar');
  await page.waitForTimeout(250);
  t = await page.evaluate(() => ({ titulo: document.querySelector('.rate-box .rate-minha-t')?.innerText, estrelas: document.querySelectorAll('#star-picker span.filled').length, texto: document.getElementById('rate-comment')?.value,
    aceite: document.getElementById('rate-consent')?.checked, salvar: document.getElementById('rate-salvar')?.disabled, pendencia: !!pendenciaDeSalvar() }));
  ok(t.titulo === 'Editar a sua avaliação' && t.estrelas === 3 && t.texto === 'Quadra boa.', '"Editar avaliação" abre as estrelas e o texto já preenchidos');
  ok(t.aceite === false && t.salvar === true, 'o aceite é marcado de novo: sem ele, "Salvar alterações" fica desligado');
  ok(!t.pendencia, 'abrir a edição sem mexer não pede "Descartar?" ao sair');
  await page.click('#star-picker span[data-star="5"]');
  ok(await page.evaluate(() => !!pendenciaDeSalvar()), 'mudou a nota: sair pergunta antes');
  await page.fill('#rate-comment', 'Quadra ótima, voltei e melhorou.');
  await page.click('#rate-consent');
  await page.click('#rate-salvar');
  await page.waitForTimeout(400);
  t = await page.evaluate(() => ({ db: window.__db.avaliacoes.find(r => r.id === 'r1'), caixa: document.querySelector('.rate-box').innerText.replace(/\s+/g, ' '), nota: state.selected.appAvg,
    cartao: document.querySelector('#ht-revs .ht-rev').innerText.replace(/\s+/g, ' ') }));
  ok(t.db.stars === 5 && t.db.comment === 'Quadra ótima, voltei e melhorou.' && !!t.db.editada_em, 'salvar muda a nota e o texto no banco, com a data da edição');
  ok(t.db.created_at === MINHA.created_at, 'a data da avaliação continua a de quando avaliou');
  ok(t.caixa.includes('Avaliação editada.') && t.caixa.includes('5/5') && t.caixa.includes('Quadra ótima') && t.caixa.includes('· editada'), 'a caixa diz "Avaliação editada." e mostra a nova, com "editada" — ' + t.caixa);
  ok(t.cartao.includes('Quadra ótima') && t.cartao.includes('· editada') && t.cartao.includes('5/5'), 'o cartão da lista também, com "editada"');
  ok(Math.abs(t.nota - 4.5) < 0.01, 'a nota da academia acompanha a edição — ' + t.nota);

  // Salvar sem mudar nada não marca outra edição.
  await page.click('#rate-editar');
  await page.click('#rate-consent');
  const antes = await page.evaluate(() => window.__editadas || 0);
  await page.click('#rate-salvar');
  await page.waitForTimeout(300);
  t = await page.evaluate(() => ({ n: window.__editadas || 0, caixa: document.querySelector('.rate-box').innerText }));
  ok(t.n === antes && !t.caixa.includes('Avaliação editada.') && t.caixa.includes('Sua avaliação'), 'salvar sem mudar nada só fecha a edição');

  // Cancelar volta como estava.
  await page.click('#ht-revs [data-editar-avaliacao]');
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => state.editandoAvaliacao === 'a1' && !!document.getElementById('rate-salvar')), 'o "Editar" do cartão da lista também abre a edição');
  await page.click('#star-picker span[data-star="1"]');
  await page.click('#rate-cancelar');
  await page.waitForTimeout(200);
  t = await page.evaluate(() => ({ db: window.__db.avaliacoes.find(r => r.id === 'r1').stars, caixa: document.querySelector('.rate-box').innerText, pendencia: !!pendenciaDeSalvar() }));
  ok(t.db === 5 && t.caixa.includes('5/5') && !t.pendencia, '"Cancelar" volta como estava, sem mudar nada');

  // O texto da edição não se perde se a página recarregar.
  await page.click('#rate-editar');
  await page.fill('#rate-comment', 'Rascunho da edição');
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForTimeout(800);
  t = await page.evaluate(() => ({ editando: state.editandoAvaliacao, texto: document.getElementById('rate-comment')?.value }));
  ok(t.editando === 'a1' && t.texto === 'Rascunho da edição', 'recarregou no meio da edição: volta editando, com o texto — ' + JSON.stringify(t));

  // Com o nome suspenso, não edita.
  const erro = await page.evaluate(async () => { state.nomeSuspenso = { nome: 'Ana Jogadora', prazo: new Date(Date.now() + 864e5).toISOString() }; try { await salvarEdicaoDaAvaliacao('a1', 2, 'x'); return ''; } catch (e) { return e.message; } finally { state.nomeSuspenso = null; } });
  ok(erro === 'O seu nome está suspenso: troque o nome em Minha conta para editar a avaliação.', 'com o nome suspenso, não edita — ' + erro);
  await browser.close();

  // ---- a avaliação nova: "Obrigado por avaliar!" e, logo, "Editar" ----
  ({ browser, page } = await abrir({ jogador: true, jogadorConfirmado: true, avaliacoes: [DA_BIA] }));
  await page.evaluate(() => openCourt('a1'));
  await page.waitForTimeout(300);
  await page.click('#star-picker span[data-star="4"]');
  await page.fill('#rate-comment', 'Primeira vez aqui.');
  await page.click('#rate-consent');
  await page.click('#rate-submit');
  await page.waitForTimeout(500);
  t = await caixa(page);
  ok(t.includes('Obrigado por avaliar!') && t.includes('Sua avaliação') && t.includes('4/5') && t.includes('Editar avaliação'), 'avaliou: "Obrigado por avaliar!" e a avaliação com "Editar" — ' + t);
  await page.click('#rate-editar');
  await page.click('#star-picker span[data-star="2"]');
  await page.click('#rate-consent');
  await page.click('#rate-salvar');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => window.__db.avaliacoes.some(r => r.user_id === 'j-ana' && r.stars === 2 && r.editada_em)), 'e edita na hora');
  ok(await page.evaluate(() => window.__db.avaliacoes.filter(r => r.user_id === 'j-ana').length === 1), 'continua uma avaliação só');
  await browser.close();

  // ---- banco antes do SQL: tudo como antes ----
  ({ browser, page } = await abrir({ jogador: true, jogadorConfirmado: true, semAvaliacaoEditada: true, avaliacoes: [MINHA, { ...DA_BIA, editada_em: undefined }] }));
  await page.evaluate(() => openCourt('a1'));
  await page.waitForTimeout(300);
  t = await page.evaluate(() => ({ n: document.querySelectorAll('#ht-revs .ht-rev').length, form: !!document.getElementById('rate-submit'), editada: document.getElementById('ht-revs').innerText.includes('editada') }));
  ok(t.n === 2 && t.form && !t.editada, 'banco sem o SQL: as avaliações aparecem e a ficha segue com o formulário de antes');
  await browser.close();

  // ---- os textos ----
  ({ browser, page } = await abrir({}));
  t = await page.evaluate(() => ({ termos: TERMS_HTML.replace(/\s+/g, ' '), priv: PRIVACY_HTML.replace(/\s+/g, ' '), como: COMO_FUNCIONAM_AS_AVALIACOES }));
  ok(t.termos.includes('Quem avaliou pode editar a nota e o texto da própria avaliação quando quiser') && t.termos.includes('passa a mostrar "editada"') && t.termos.includes('não avalia nem edita avaliações'),
    'Termos: a conta edita a própria avaliação, que mostra "editada"; com o nome suspenso, não edita');
  ok(t.termos.includes('uma por avaliação') && t.termos.includes('A academia pode editar a resposta quando quiser'), 'Termos: a resposta da academia, uma por avaliação, editável');
  ok(t.priv.includes('guardamos a data da última edição') && t.termos.includes('Última atualização: 28 de outubro de 2026') && t.priv.includes('Última atualização: 28 de outubro de 2026'), 'Privacidade: a data da edição; os dois com a data de hoje');
  ok(t.como.includes('Quem avaliou pode editar a nota e o texto quando quiser') && t.como.includes('editar a resposta'), '"Como funcionam as avaliações" explica a edição');
  await browser.close();

  // ---- o chat de ajuda explica ----
  ({ browser, page } = await abrir({}));
  await page.evaluate(() => { state.showMenu = true; render(); document.querySelector('.menu-drawer [data-menu="contato"]').click(); });
  await page.waitForTimeout(200);
  await page.click('#contato-close-overlay [data-abrir-chat]');
  await page.waitForTimeout(300);
  for (const q of ['como edito minha avaliação?', 'quero mudar a nota que dei', 'posso avaliar de novo?']) {
    await page.fill('#chat-texto', q);
    await page.click('.chat-enviar');
    await page.waitForTimeout(200);
    const r = await page.evaluate(() => [...document.querySelectorAll('#chat-msgs .chat-msg')].pop().innerText.replace(/\s+/g, ' '));
    // Na mesma conversa, o assunto repetido responde "Sobre … está aí em cima".
    ok((r.includes('Editar avaliação') && r.includes('editada')) || r.includes('Sobre "Editar a minha avaliação"'), `o chat entende "${q}" — ` + r.slice(0, 80));
  }
  await browser.close();

  // ---- a resposta da academia: uma por avaliação, editável, "editada" ----
  ({ browser, page } = await abrir({ academia: 'a2', avaliacoes: [{ id: 'r5', academia_id: 'a2', stars: 3, comment: 'Vestiário simples.', nome_autor: 'Carla', created_at: '2026-10-20T12:00:00Z' }] }));
  await page.evaluate(() => openCourt('a2'));
  await page.waitForTimeout(300);
  await page.click('#avaliacoes [data-responder="r5"]');
  await page.fill('#resposta-texto', 'Obrigado, Carla!');
  await page.click('#resposta-publicar');
  await page.waitForTimeout(500);
  const resp = () => page.evaluate(() => document.querySelector('#avaliacoes .rev-resp')?.innerText.replace(/\s+/g, ' ') || '');
  t = await resp();
  ok(t.includes('Resposta da academia') && t.includes('Obrigado, Carla!') && !t.includes('editada'), 'a academia responde; a resposta nova não mostra "editada" — ' + t);
  ok(await page.evaluate(() => [...document.querySelectorAll('#avaliacoes [data-responder="r5"]')].map(b => b.innerText.trim()).join('|')) === 'Editar resposta', 'depois, o botão é "Editar resposta" (uma resposta por avaliação)');
  await page.click('#avaliacoes [data-responder="r5"]');
  await page.click('#resposta-publicar');
  await page.waitForTimeout(500);
  ok(!(await resp()).includes('editada'), 'publicar o mesmo texto não marca "editada"');
  await page.click('#avaliacoes [data-responder="r5"]');
  await page.fill('#resposta-texto', 'Obrigado, Carla! Já trocamos o vestiário.');
  await page.click('#resposta-publicar');
  await page.waitForTimeout(500);
  t = await resp();
  ok(t.includes('Já trocamos o vestiário') && t.includes('· editada'), 'mudar o texto mostra "editada", igual à avaliação — ' + t);
  await browser.close();
})();
