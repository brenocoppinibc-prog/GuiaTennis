// Pedido do Breno em 22/10/2026: "novos acessos no parceiros, indique com
// aqueles push preencher todas as informações e a vantagem de ter tal
// informação na ficha; quando já há o acesso, indique para ter um plano
// melhor; se já está no Premium, indique publicar promoções ou enviar
// notificações para vender mais". Uma dica por dia e por academia, no alto,
// com o porquê e o atalho.
const { abrir, ok } = require('./harness');

const foto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const texto = (page, sel) => page.evaluate((sel) => (document.querySelector(sel)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
// Deixa a ficha da a1 completa (com o que o Básico pede) e pede a dica de novo.
async function fichaCompleta(page, foto) {
  await page.evaluate(async (foto) => {
    const a = window.__db.academias.find(x => x.id === 'a1');
    Object.assign(a, { price_aula: '120', photos: [foto] });
    await loadEverything(); await recarregarConta(); render();
  }, foto);
}
async function pedirDica(page) {
  await page.evaluate(() => { document.querySelectorAll('.gt-push').forEach(e => e.remove()); localStorage.removeItem('guiatennis_dica_parceiros_v1'); state.pcDicas = {}; irParceiros('painel'); });
  await page.waitForTimeout(2400);
}

(async () => {
  // ---- acesso novo, ficha incompleta: a parte que falta, com o porquê ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel', dicas: true });
  await page.waitForTimeout(2200);
  const faltas = await page.evaluate(() => faltasDaFicha(minhaAcademia()));
  let dica = await texto(page, '#gt-dica');
  ok(faltas.includes('Fotos') && dica.startsWith('Adicione fotos da academia') && dica.includes('Ficha com foto recebe muito mais contato.') && dica.includes('Adicionar fotos ›'),
    'ficha sem fotos: a dica desce no alto, com o porquê e o atalho — ' + dica + ' / falta: ' + faltas.join(', '));
  await page.click('.gt-dica-acao');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.showRegister && regPassoAtual().passo.id === 'fotos' && !document.getElementById('gt-dica')) && await page.isVisible('#reg-confirmar-revisao'),
    'o atalho abre a ficha na parte das fotos, com o "Confirmar" que leva à revisão');
  await page.evaluate(() => { state.showRegister = false; render(); irParceiros('avaliacoes'); });
  await page.waitForTimeout(2400);
  ok(!(await page.$('#gt-dica')), 'na mesma visita, outra página não mostra outra dica');
  await page.reload();
  await page.waitForTimeout(2600);
  ok(!(await page.$('#gt-dica')), 'voltando no mesmo dia, nenhuma dica (no máximo uma por dia)');
  // Sem o preço: a dica seguinte é a do preço.
  await page.evaluate(async (foto) => { window.__db.academias.find(x => x.id === 'a1').photos = [foto]; await loadEverything(); await recarregarConta(); }, foto);
  await pedirDica(page);
  dica = await texto(page, '#gt-dica');
  ok(dica.startsWith('Diga o preço da aula ou da locação') && dica.includes('É o que o jogador compara primeiro.'), 'com as fotos, a próxima é o preço — ' + dica);
  // Conta de mais de uma semana com a ficha incompleta: um dia a parte que
  // falta, no outro o plano de cima (22/10/2026: "sim").
  const alterna = await page.evaluate(async () => {
    const tipos = () => [10, 11, 12, 13].map(d => dicaDoParceiros(minhaAcademia(), 'basico', d).tipo).join(',');
    const nova = tipos();
    window.__db.academia_acessos.find(x => x.academia_id === 'a1').created_at = new Date(Date.now() - 30 * 86400000).toISOString();
    await recarregarConta();
    return { nova, antiga: tipos(), premium: dicaDoParceiros(minhaAcademia(), 'premium', 11).tipo };
  });
  ok(alterna.nova === 'ficha,ficha,ficha,ficha' && alterna.antiga === 'ficha,plano,ficha,plano' && alterna.premium === 'promocao',
    'acesso novo: só a ficha; com mais de uma semana, um dia a ficha e no outro o plano (no Premium, a promoção) — ' + JSON.stringify(alterna));

  // ---- ficha completa no Básico: o plano de cima ----
  await fichaCompleta(page, foto);
  await pedirDica(page);
  dica = await texto(page, '#gt-dica');
  ok(await page.evaluate(() => !faltasDaFicha(minhaAcademia()).length) && /^A ficha esconde \d+ coisas? que vocês preencheram/.test(dica) && dica.includes('Com o Completo') && dica.includes('Ver o Completo ›'),
    'ficha completa no Básico, com o que o plano esconde: a dica é o Completo — ' + dica);
  await page.click('.gt-dica-acao');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.parceirosAba === 'plano'), '"Ver o Completo" abre a página Plano');
  ok(await page.evaluate(() => {
    const d1 = dicaDoParceiros({ ...minhaAcademia(), integral: null, politica: {}, acesso: {}, instagram: '', site: '' }, 'basico', 0);
    const d2 = dicaDoParceiros({ ...minhaAcademia(), integral: null, politica: {}, acesso: {}, instagram: '', site: '' }, 'basico', 1);
    return d1.tipo === 'plano' && d2.tipo === 'plano' && d1.t !== d2.t && d1.s.startsWith('Com o Completo, ');
  }), 'sem nada escondido, a dica é uma dor que o Completo resolve, uma por dia');
  await browser.close();

  // ---- Completo: o Premium e, desde 22/10/2026, a promoção na ficha (um dia cada) ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel', completo: ['a1'] }));
  await fichaCompleta(page, foto);
  await pedirDica(page);
  dica = await texto(page, '#gt-dica');
  ok((dica.includes('Com o Premium, ') && dica.includes('Ver o Premium ›')) || dica.startsWith('Publique uma promoção'), 'no Completo, a dica é o Premium ou a promoção na ficha — ' + dica);
  const completo = await page.evaluate(() => [10, 11].map(d => { const x = dicaDoParceiros(minhaAcademia(), 'completo', d); return x.tipo + ':' + x.t; }));
  ok(completo[0].startsWith('plano:') && completo[1] === 'promocao:Publique uma promoção', 'um dia o Premium, no outro publicar uma promoção — ' + completo.join(' / '));
  await browser.close();

  // ---- Premium sem promoção: publicar uma ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel', premium: ['a1'] }));
  await fichaCompleta(page, foto);
  await pedirDica(page);
  dica = await texto(page, '#gt-dica');
  ok(dica.startsWith('Publique uma promoção') && dica.includes('Ela aparece na ficha e no resultado da busca') && dica.includes('Publicar uma promoção ›'), 'Premium sem promoção: publicar uma — ' + dica);
  await page.click('.gt-dica-acao');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.parceirosAba === 'promocoes'), 'o atalho abre Promoções › Na ficha');
  await browser.close();

  // ---- Premium com promoção: mandar por e-mail ----
  const amanha = new Date(Date.now() + 10 * 864e5).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel', premium: ['a1'], promocoes: [{ id: 'p1', academia_id: 'a1', titulo: 'Primeira aula grátis', detalhes: '', valida_ate: amanha, avisados: 0 }] }));
  await fichaCompleta(page, foto);
  await page.evaluate(async () => { await carregarPromocoes(); });
  await pedirDica(page);
  dica = await texto(page, '#gt-dica');
  ok(dica.startsWith('Entre no leilão de promoções') && dica.includes('duas promoções do bairro') && dica.includes('Ver o leilão ›'), 'Premium com promoção: entrar no leilão de promoções — ' + dica);
  await page.click('.gt-dica-acao');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.parceirosAba === 'promocoes-email'), 'o atalho abre Promoções › Leilão');

  // ---- não cobre o formulário nem outro aviso ----
  await page.evaluate(() => { localStorage.removeItem('guiatennis_dica_parceiros_v1'); state.pcDicas = {}; mostrarPush('Senha nova salva.'); irParceiros('painel'); });
  await page.waitForTimeout(2400);
  ok(!(await page.$('#gt-dica')) && (await texto(page, '.gt-push')).includes('Senha nova salva.'), 'com outro aviso no alto, a dica espera');
  await page.waitForTimeout(6500);
  ok(!!(await page.$('#gt-dica')), 'e aparece depois que o aviso sai');
  await browser.close();
  console.log('dicas-do-parceiros.js: fim');
})();
