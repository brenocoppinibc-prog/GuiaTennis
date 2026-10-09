// Pedidos do Breno em 09/10/2026:
// - "deixe o continuar no lado direito e um aviso do que falta preencher";
// - "ao uma academia mudar do Premium para o completo precisa limitar as
//   ações dela e as informações que serão visualizadas para todos, todas as
//   informações no básico completo podem ser preenchidas mas com aviso de que
//   não estará visível na ficha e com opção de querer ou não alterar e
//   precisar pagar a mais".
const { abrir, ok, irParte } = require('./harness');

const texto = (page, sel) => page.evaluate((sel) => (document.querySelector(sel)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const botoes = (page) => page.evaluate(() => [...document.querySelectorAll('.reg-rodape-dir .cta-btn')].map(b => b.id + (b.classList.contains('cta-primary') ? '*' : '')).join(','));
async function editarFicha(page) {
  await page.click('.editar-academia');
  await page.waitForTimeout(400);
}

(async () => {
  // ---- edição no Básico: Continuar à direita, o que falta e o aviso do plano ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha' });
  await page.waitForTimeout(400);
  await editarFicha(page);
  ok((await botoes(page)) === 'register-submit,reg-continuar*', 'na edição, "Continuar" fica à direita e em destaque; "Salvar alterações" ao lado — ' + await botoes(page));
  ok((await texto(page, '#reg-falta')) === 'Falta preencher: Fotos', 'em cima dos botões, o aviso do que falta preencher — ' + await texto(page, '#reg-falta'));
  await page.click('#reg-falta [data-reg-passo]');
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => document.querySelector('#register-overlay .reg-passo')?.dataset.passo === 'fotos'), 'um toque no que falta leva até a parte');
  ok((await texto(page, '#reg-plano-aviso')).startsWith('No plano Básico, a ficha mostra as 3 primeiras fotos.'), 'nas fotos, o aviso do que o Básico mostra — ' + await texto(page, '#reg-plano-aviso'));
  await irParte(page, 'revisar');
  ok((await botoes(page)) === 'register-submit*' && !(await page.$('#reg-falta')), 'na revisão, só "Salvar alterações", em destaque (a revisão já mostra o que falta)');

  // As partes que o Básico mostra não têm aviso; as outras têm, com a escolha.
  const avisos = {};
  for (const parte of ['dados', 'precos', 'quadras', 'contato', 'fotos', 'horario', 'cancelamento', 'chegada']) {
    await irParte(page, parte);
    avisos[parte] = await texto(page, '#reg-plano-aviso');
  }
  ok(!avisos.dados && !avisos.precos && !avisos.horario, 'nome, preço e horário aparecem em todo plano: sem aviso');
  ok(avisos.quadras.includes('a ficha mostra as 3 primeiras comodidades que você marcar') && avisos.contato.includes('a ficha mostra só o botão do WhatsApp')
    && avisos.cancelamento.includes('o cancelamento e a reposição não aparecem na ficha') && avisos.chegada.includes('como chegar não aparece na ficha'),
    'comodidades, contato, fotos, cancelamento e como chegar avisam o que não aparece no Básico');
  ok(avisos.cancelamento.includes('Pode preencher: fica guardado e aparece na ficha no plano Completo.') && avisos.cancelamento.includes('O Completo é pago') && avisos.cancelamento.includes('nada é cobrado sem você confirmar'),
    'o aviso diz que pode preencher, que fica guardado e que o Completo é pago — ' + avisos.cancelamento);
  ok(avisos.chegada.includes('Quero o Completo') && avisos.chegada.includes('Manter o Básico'), 'e dá a escolha: "Quero o Completo" ou "Manter o Básico"');
  await irParte(page, 'quadras');
  for (const k of ['wifi', 'vestiario', 'loja']) await page.click(`.reg-amenity[data-amenity="${k}"]`);
  ok((await texto(page, '#reg-plano-aviso')).includes('2 das 5 que você marcou ficam de fora') && await page.evaluate(() => document.querySelectorAll('.reg-amenity:disabled').length === 0),
    'marcou mais do que o Básico mostra: o aviso conta o que fica de fora, sem travar — ' + await texto(page, '#reg-plano-aviso'));
  ok(await page.evaluate(() => { const a = document.getElementById('reg-plano-aviso'), l = [...document.querySelectorAll('#register-overlay .field-label')].find(x => x.innerText === 'Comodidades'); return !!a && !!l && (l.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING); }),
    'em Quadras, o aviso fica junto das comodidades');

  // "Quero o Completo": vale para a ficha toda e vai junto ao salvar.
  await irParte(page, 'contato');
  await page.fill('#f-instagram', '@soaula');
  await page.evaluate(() => { window.__form.instagram = '@soaula'; render(); });
  ok((await texto(page, '#reg-plano-aviso')).includes('O Instagram que você informou fica de fora'), 'no contato, o aviso diz que o Instagram fica de fora');
  await page.click('[data-reg-plano-aviso="completo"]');
  await page.waitForTimeout(150);
  ok((await texto(page, '#reg-plano-aviso')).includes('Você pediu o plano Completo') && await page.isVisible('[data-reg-plano-aviso=""]'), '"Quero o Completo" vira o pedido, com "Desfazer o pedido"');
  await irParte(page, 'chegada');
  ok((await texto(page, '#reg-plano-aviso')).includes('Você pediu o plano Completo'), 'a escolha vale nas outras partes também');
  await page.click('#register-submit');
  await page.waitForTimeout(900);
  let fim = await page.evaluate(() => ({ t: document.querySelector('#register-overlay')?.innerText || '', pedido: window.__db.pedidos_de_plano.map(p => p.academia_id + ':' + p.plano).join() }));
  ok(!fim.t.includes('Quase lá') && fim.t.includes('Você escolheu o plano Completo') && fim.pedido === 'a1:completo', 'ao salvar, não pergunta o plano de novo: o pedido do Completo vai para o GuiaTennis — ' + fim.pedido);
  await browser.close();

  // "Manter o Básico": o aviso encolhe, e salvar não pergunta o plano.
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha' }));
  await page.waitForTimeout(400);
  await editarFicha(page);
  await irParte(page, 'contato');
  await page.evaluate(() => { window.__form.instagram = '@soaula'; render(); });
  await page.click('[data-reg-plano-aviso="basico"]');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => document.getElementById('reg-plano-aviso').classList.contains('manteve')) && (await texto(page, '#reg-plano-aviso')).includes('Mudar de ideia') && !(await page.$('#reg-plano-aviso .cta-btn')),
    '"Manter o Básico" encolhe o aviso, com "Mudar de ideia"');
  await page.click('[data-reg-plano-aviso=""]');
  await page.waitForTimeout(150);
  ok(await page.isVisible('[data-reg-plano-aviso="completo"]'), '"Mudar de ideia" traz a escolha de volta');
  await page.click('[data-reg-plano-aviso="basico"]');
  await page.click('#register-submit');
  await page.waitForTimeout(900);
  fim = await page.evaluate(() => ({ t: document.querySelector('#register-overlay')?.innerText || '', pedido: window.__db.pedidos_de_plano.length, insta: window.__db.academias.find(a => a.id === 'a1').instagram }));
  ok(!fim.t.includes('Quase lá') && fim.t.includes('Alterações salvas') && fim.pedido === 0 && fim.insta === '@soaula', 'salvou no Básico, com o Instagram guardado, sem pedido de plano');
  await browser.close();

  // ---- Completo e admin: nada a avisar ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha', premium: ['a1'] }));
  await page.waitForTimeout(400);
  await page.evaluate(async () => { window.__db.academias.find(a => a.id === 'a1').plano = 'completo'; await loadEverything(); await recarregarConta(); render(); });
  await page.waitForTimeout(300);
  await editarFicha(page);
  let algum = false;
  for (const parte of ['quadras', 'contato', 'fotos', 'cancelamento', 'chegada']) { await irParte(page, parte); if (await page.$('#reg-plano-aviso')) algum = true; }
  ok(!algum, 'no Completo, a ficha mostra tudo: nenhum aviso de plano');

  // ---- saiu do Premium: promoções guardadas e pessoas acima do limite ----
  const amanha = new Date(Date.now() + 10 * 864e5).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  await browser.close();
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel', premium: ['a1'], promocoes: [{ id: 'p1', academia_id: 'a1', titulo: 'Primeira aula grátis', detalhes: '', valida_ate: amanha, avisados: 0 }] }));
  await page.waitForTimeout(400);
  await page.evaluate(async () => {
    window.__db.academias.find(a => a.id === 'a1').plano = 'completo';
    for (let k = 1; k <= 6; k++) {
      window.__db.academia_acessos.push({ user_id: 'u-eq' + k, academia_id: 'a1', usuario: 'eq' + k + '@a.com', email: 'eq' + k + '@a.com', nome_responsavel: 'Equipe ' + k, dados_completos_em: '2026-10-01' });
      window.__db.academia_vinculos.push({ user_id: 'u-eq' + k, academia_id: 'a1', papel: 'equipe', created_at: '2026-10-01' });
    }
    // Como quem entra depois de o admin baixar o plano: os números de antes não ficam.
    state.numeros = null;
    await loadEverything(); await recarregarConta(); render();
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => irParceiros('promocoes'));
  await page.waitForTimeout(400);
  ok((await texto(page, '#pc-promo-guardadas')).includes('A promoção de vocês não aparece no plano Completo') && (await texto(page, '#pc-promo-guardadas')).includes('Primeira aula grátis') && !(await page.$('#pc-promo-titulo')),
    'fora do Premium, Promoções mostra a promoção guardada que não aparece e não deixa publicar outra');
  await page.evaluate(() => { state.page = 'home'; state.selected = null; render(); openCourt('a1'); });
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => !document.querySelector('#ir-promocoes') && !document.body.innerText.includes('Primeira aula grátis')), 'e a ficha não mostra a promoção');
  await page.evaluate(() => irParceiros('pessoas', { mesmaAba: true }));
  await page.waitForTimeout(400);
  ok((await texto(page, '#pc-acima-do-plano')).includes('O plano Completo é para até 5 pessoas, e a academia tem 7. Tire 2 pessoas para ficar no limite do plano'), 'Pessoas avisa que passou do limite do plano e quantas tirar — ' + await texto(page, '#pc-acima-do-plano') + ' / ' + await page.evaluate(() => planoAtual() + ':' + JSON.stringify(state.numeros && state.numeros.dados && state.numeros.dados.plano)));
  ok(!(await page.$('#pc-pessoa-adicionar')), 'e não deixa adicionar ninguém');
  await browser.close();

  // ---- admin baixa o plano: confirma vendo o que muda ----
  ({ browser, page } = await abrir({ admin: true, q: 'admin', premium: ['a1'], w: 1280 }));
  await page.waitForTimeout(500);
  await page.click('.adm-nav [data-adm-aba="academias"]');
  await page.waitForTimeout(300);
  await page.click('[data-adm-academia="a1"]');
  await page.waitForTimeout(200);
  let pergunta = '';
  page.once('dialog', d => { pergunta = d.message(); d.dismiss(); });
  await page.click('.adm-acad.aberta .plano-btn[data-plano="completo"]');
  await page.waitForTimeout(400);
  ok(pergunta.includes('do Premium para o Completo') && pergunta.includes('sai o selo dourado') && pergunta.includes('as promoções saem da ficha') && pergunta.includes('Nada é apagado'), 'baixar o plano pergunta antes, dizendo o que muda — ' + pergunta.split('\n')[0]);
  ok(await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').plano === 'premium'), '"Cancelar" não muda o plano');
  page.once('dialog', d => { pergunta = d.message(); d.accept(); });
  await page.click('.adm-acad.aberta .plano-btn[data-plano="basico"]');
  await page.waitForTimeout(600);
  ok(pergunta.includes('a ficha mostra só o WhatsApp') && pergunta.includes('como chegar sai da ficha') && pergunta.includes('até 1 pessoa'), 'para o Básico, a pergunta inclui o que sai da ficha');
  ok(await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').plano === 'basico'), 'confirmou: o plano muda');
  let semPergunta = true;
  page.once('dialog', d => { semPergunta = false; d.accept(); });
  await page.click('.adm-acad.aberta .plano-btn[data-plano="completo"]');
  await page.waitForTimeout(600);
  ok(semPergunta && await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').plano === 'completo'), 'subir o plano não pergunta nada');
  await browser.close();
})();
