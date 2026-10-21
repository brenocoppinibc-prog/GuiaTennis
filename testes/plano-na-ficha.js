// Pedidos do Breno em 09/10/2026:
// - "deixe o continuar no lado direito e um aviso do que falta preencher";
// - "ao uma academia mudar do Premium para o completo precisa limitar as
//   ações dela e as informações que serão visualizadas para todos, todas as
//   informações no básico completo podem ser preenchidas mas com aviso de que
//   não estará visível na ficha e com opção de querer ou não alterar e
//   precisar pagar a mais".
//   (o aviso em cada parte saiu em 21/10/2026: "tire o que aparecer de planos
//   no cadastro"; o que o plano esconde vem depois de confirmar a revisão,
//   como uma página de erro, com os planos).
const { abrir, ok, irParte, salvarFicha } = require('./harness');

const texto = (page, sel) => page.evaluate((sel) => (document.querySelector(sel)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const botoes = (page) => page.evaluate(() => [...document.querySelectorAll('.reg-rodape-dir .cta-btn')].map(b => b.id + (b.classList.contains('cta-primary') ? '*' : '')).join(','));
async function editarFicha(page) {
  await page.click('.editar-academia');
  await page.waitForTimeout(400);
}

(async () => {
  // ---- edição no Básico: Continuar à direita, o que falta e nada do plano nas partes ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha' });
  await page.waitForTimeout(400);
  await editarFicha(page);
  ok((await botoes(page)) === 'register-submit,reg-continuar*', 'na edição, "Continuar" fica à direita e em destaque; "Revisar e salvar" ao lado — ' + await botoes(page));
  ok(!(await page.$('#reg-falta')), 'sem tentar concluir, nada de "Falta preencher" (10/10/2026)');
  await irParte(page, 'revisar');
  ok((await botoes(page)) === 'reg-editar,register-submit*' && !(await page.$('#reg-falta')), 'na revisão, "Editar" e "Confirmar e salvar", em destaque (a revisão já mostra o que falta) — ' + await botoes(page));

  const comPlano = [];
  for (const parte of ['dados', 'precos', 'quadras', 'contato', 'fotos', 'horario', 'cancelamento', 'chegada', 'revisar']) {
    await irParte(page, parte);
    if (/\bplano\b/i.test(await texto(page, '#register-overlay .reg-passo')) || await page.$('#reg-plano-aviso')) comPlano.push(parte);
  }
  ok(!comPlano.length, 'nenhuma parte do cadastro fala de plano (21/10/2026) — ' + comPlano.join());
  await irParte(page, 'quadras');
  for (const k of ['wifi', 'vestiario', 'loja']) await page.click(`.reg-amenity[data-amenity="${k}"]`);
  ok(await page.evaluate(() => document.querySelectorAll('.reg-amenity:disabled').length === 0 && window.__form.amenities.length === 5) && !(await page.$('#reg-destaques')),
    'marca mais do que o Básico mostra sem travar, e sem a escolha das que aparecem no meio do cadastro');
  await irParte(page, 'contato');
  await page.fill('#f-instagram', '@soaula');

  // Confirmou a revisão: o que o Básico esconde, como uma página de erro, com os planos.
  await salvarFicha(page);
  await page.waitForTimeout(300);
  const erro = await texto(page, '#reg-erro');
  const lista = await texto(page, '.reg-plano-perde');
  ok(erro.startsWith('4 partes não vão aparecer na ficha') && erro.includes('No plano Básico, os jogadores não veem o que você preencheu') && erro.includes('Nada se perde'),
    'depois de confirmar: "4 partes não vão aparecer na ficha", como uma página de erro — ' + erro);
  ok(lista.includes('2 das 5 comodidades') && lista.includes('Instagram') && lista.includes('A regra de cancelamento e reposição') && lista.includes('Como chegar'),
    'a lista: comodidades, Instagram, cancelamento e como chegar — ' + lista);
  ok(await page.isVisible('.reg-plano-perde #reg-destaques') && (await texto(page, '#reg-destaques')).includes('Quais aparecem na ficha no plano Básico'),
    'a escolha das 3 comodidades que aparecem fica ali, junto do que o Básico esconde');
  ok(await page.isVisible('[data-reg-plano="completo"]') && (await texto(page, '#register-overlay')).includes('Para mostrar tudo, mude de plano'), 'e logo embaixo, os planos para mostrar tudo');
  await page.click('[data-reg-plano="completo"]');
  await page.waitForTimeout(900);
  let fim = await page.evaluate(() => ({ t: document.querySelector('#register-overlay')?.innerText || '', plano: window.__db.academias.find(a => a.id === 'a1').plano, pedido: window.__db.pedidos_de_plano.map(p => p.academia_id + ':' + p.plano).join() }));
  ok(fim.t.includes('A academia agora está no plano Completo') && fim.plano === 'completo' && !fim.pedido, '"Quero o Completo" salva e o responsável passa para o Completo na hora (19/10/2026) — ' + fim.plano);
  await browser.close();

  // "Continuar no Básico sem essas partes": salva com o Instagram guardado.
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha' }));
  await page.waitForTimeout(400);
  await editarFicha(page);
  await irParte(page, 'contato');
  await page.fill('#f-instagram', '@soaula');
  await salvarFicha(page);
  await page.waitForTimeout(300);
  await page.click('.reg-plano-basico');
  await page.waitForTimeout(900);
  fim = await page.evaluate(() => ({ t: document.querySelector('#register-overlay')?.innerText || '', pedido: window.__db.pedidos_de_plano.length, insta: window.__db.academias.find(a => a.id === 'a1').instagram }));
  ok(fim.t.includes('Alterações salvas') && fim.pedido === 0 && fim.insta === '@soaula', 'salvou no Básico, com o Instagram guardado, sem pedido de plano');
  await browser.close();

  // ---- Completo: nada a avisar ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha', premium: ['a1'] }));
  await page.waitForTimeout(400);
  await page.evaluate(async () => { window.__db.academias.find(a => a.id === 'a1').plano = 'completo'; await loadEverything(); await recarregarConta(); render(); });
  await page.waitForTimeout(300);
  await editarFicha(page);
  await irParte(page, 'contato');
  await page.fill('#f-instagram', '@soaula');
  await salvarFicha(page);
  await page.waitForTimeout(900);
  ok(!(await page.$('#reg-erro')) && (await texto(page, '#register-overlay')).includes('Alterações salvas'), 'no Completo, a ficha mostra tudo: salva direto, sem a tela do plano');

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
