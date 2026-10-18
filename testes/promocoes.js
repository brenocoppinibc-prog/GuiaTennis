// Pedido do Breno em 08/10/2026: "quero colocar em ação que academias com
// Premium divulgue promoções". A academia Premium cria, muda e encerra em
// Parceiros › Promoções; a promoção aparece na ficha (atalho no topo e o
// bloco com os preços) e no cartão da busca, até vencer.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);
const dia = (n) => new Date(Date.now() + n * 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const PROMO = { id: 'p1', academia_id: 'a1', titulo: 'Primeira aula grátis', detalhes: 'Para quem nunca fez aula aqui.', valida_ate: dia(10), avisados: 2 };

// Passo a passo (15/10/2026): "Ver a prévia" e, nela, publicar.
async function publicar(page) {
  await page.click('#pc-promo-revisar');
  await page.waitForTimeout(150);
  if (await page.$('#pc-promo-salvar')) await page.click('#pc-promo-salvar');
}
(async () => {
  // ---- Parceiros, fora do Premium: trancado ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes' });
  await page.waitForTimeout(400);
  let corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Promoções') && corpo.includes('Disponível no plano Premium') && !(await page.$('#pc-promo-titulo')), 'fora do Premium: a página mostra o que é e "Disponível no plano Premium"');
  const menu = await page.evaluate(() => PC_MENU_LOGADO.map(x => x.t).join(','));
  ok(menu.includes('Avaliações,Promoções,Desempenho'), 'Promoções no menu do Parceiros, depois de Avaliações (sem "Avisos por e-mail", 16/10/2026)');
  await browser.close();

  // ---- Premium: publicar, mudar, encerrar ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes', premium: ['a1'], envios: { a1: 3 } }));
  await page.waitForTimeout(400);
  ok(await page.isVisible('#pc-promo-titulo') && (await page.inputValue('#pc-promo-ate')) === dia(30), 'Premium: o formulário, valendo 30 dias de saída');
  await page.click('#pc-promo-revisar');
  await page.waitForTimeout(200);
  ok((await texto(page, '#parceiros .form-error')).includes('Escreva a promoção') && await page.$('#pc-promo-titulo'), 'sem o título, pede para escrever e não passa para a prévia');
  await page.evaluate(() => { window.__promoAviso = { aviso: 'enviado', avisados: 2 }; });
  await page.fill('#pc-promo-titulo', 'Primeira aula grátis');
  await page.fill('#pc-promo-detalhes', 'Para quem nunca fez aula aqui.');
  await publicar(page);
  await page.waitForTimeout(500);
  let r = await page.evaluate(() => ({
    args: (window.__rpcs.filter(x => x.nome === 'salvar_promocao').slice(-1)[0] || {}).args,
    aviso: document.querySelector('#parceiros .conta-aviso')?.innerText || '',
    lista: [...document.querySelectorAll('.pc-promo')].map(x => x.innerText.replace(/\s+/g, ' ')),
    site: promocoesDe(state.allCourts.find(c => c.id === 'a1')).map(x => x.titulo),
  }));
  ok(r.args && r.args.p_academia === 'a1' && r.args.p_id === null && r.args.p_titulo === 'Primeira aula grátis' && r.args.p_valida_ate,
    'publica com a academia, o título, os detalhes e a validade');
  ok(r.aviso.includes('Promoção publicada na ficha e na busca') && r.args.p_avisar === false, 'publicar na ficha não manda e-mail (o e-mail é a parte Por e-mail) — ' + r.aviso);
  ok(r.lista.length === 1 && /valendo/i.test(r.lista[0]) && /Válida até \d+ de [a-zç]+/.test(r.lista[0]) && r.lista[0].includes('Mandar por e-mail'), 'a promoção aparece na lista, valendo, com "Mandar por e-mail" — ' + r.lista[0]);
  ok(r.site.join() === 'Primeira aula grátis', 'e já aparece no site');
  await page.click('[data-promo-mudar]');
  await page.waitForTimeout(200);
  ok((await page.inputValue('#pc-promo-titulo')) === 'Primeira aula grátis' && (await texto(page, '.pc-promo-form .pc-card-t')) === 'Alterar a promoção', '"Alterar" abre o formulário com a promoção');
  await page.fill('#pc-promo-titulo', 'Primeira aula grátis às segundas');
  await page.click('#pc-promo-revisar');
  await page.waitForTimeout(150);
  ok((await texto(page, '#pc-promo-salvar')).includes('Salvar a alteração') && (await texto(page, '#pc-promo-previa')).includes('Primeira aula grátis às segundas'), 'mudar também passa pela prévia');
  await page.click('#pc-promo-salvar');
  await page.waitForTimeout(500);
  r = await page.evaluate(() => ({ aviso: document.querySelector('#parceiros .conta-aviso')?.innerText || '', args: (window.__rpcs.filter(x => x.nome === 'salvar_promocao').slice(-1)[0] || {}).args, t: window.__db.promocoes[0].titulo }));
  ok(r.aviso.includes('Promoção atualizada') && r.args.p_id === 'promo-1' && r.t === 'Primeira aula grátis às segundas', 'mudar salva na mesma promoção');
  // Uma promoção por vez (16/10/2026; eram 3): com uma valendo, o formulário dá lugar ao recado.
  corpo = await texto(page, '#parceiros .pc-main');
  ok(!(await page.$('#pc-promo-titulo')) && corpo.split('Uma promoção por vez').length === 2 && corpo.includes('Alterar') && corpo.includes('Encerrar'), 'com uma valendo, sem formulário e sem repetir "uma promoção por vez" (só no alto)');
  ok((await page.evaluate(() => sb.rpc('salvar_promocao', { p_academia: 'a1', p_id: null, p_titulo: 'Aula dupla', p_detalhes: '', p_valida_ate: hojeEmBrasilia(10), p_avisar: false }))).error?.message.includes('uma promoção valendo'), 'e o banco recusa a segunda');
  page.once('dialog', d => d.accept());
  await page.click('[data-promo-encerrar]');
  await page.waitForTimeout(500);
  r = await page.evaluate(() => ({ n: window.__db.promocoes.length, aviso: document.querySelector('#parceiros .conta-aviso')?.innerText || '', form: !!document.getElementById('pc-promo-titulo') }));
  ok(r.n === 0 && r.aviso.includes('Promoção encerrada') && r.form, '"Encerrar" pergunta, tira a promoção e o formulário volta');
  // Se ficou mais de uma valendo de antes, o site mostra só a mais nova.
  ok(await page.evaluate(() => { state.promocoes = { a1: [{ id: 'v', titulo: 'Velha', valida_ate: hojeEmBrasilia(20), created_at: '2026-10-01T10:00:00Z' }, { id: 'n', titulo: 'Nova', valida_ate: hojeEmBrasilia(5), created_at: '2026-10-10T10:00:00Z' }] }; const l = promocoesDe(state.allCourts.find(c => c.id === 'a1')); return l.length === 1 && l[0].titulo === 'Nova'; }),
    'de antes com duas valendo: o site mostra só a mais nova');
  await browser.close();

  // ---- o jogador vê: atalho no topo, bloco com os preços e o cartão da busca ----
  ({ browser, page } = await abrir({ premium: ['a1'], promocoes: [PROMO, { ...PROMO, id: 'p-velha', titulo: 'Vencida', valida_ate: dia(-1) }, { ...PROMO, id: 'p-a2', academia_id: 'a2', titulo: 'Do Básico' }] }));
  await page.evaluate(() => { state.selected = decorate(state.allCourts.find(x => x.id === 'a1')); state.page = 'court'; render(); });
  await page.waitForTimeout(200);
  r = await page.evaluate(() => ({
    atalho: document.querySelector('.ht-head #ir-promocoes')?.innerText.replace(/\s+/g, ' ') || '',
    bloco: document.querySelector('#ht-opcoes #ht-promocoes')?.innerText.replace(/\s+/g, ' ') || '',
    remover: !!document.querySelector('[data-apagar-promo]'),
  }));
  ok(r.atalho.includes('Promoção') && r.atalho.includes('Primeira aula grátis'), 'na ficha, o atalho da promoção no topo — ' + r.atalho);
  ok(r.bloco.includes('Primeira aula grátis') && r.bloco.includes('Para quem nunca fez aula aqui.') && /Válida até \d+ de [a-zç]+ ·/.test(r.bloco) && r.bloco.includes('WhatsApp') && !r.bloco.includes('Vencida'),
    'o bloco fica com os preços, com os detalhes e a validade; a vencida não aparece — ' + r.bloco);
  ok(!r.remover, 'o jogador não vê "Remover promoção"');
  await page.click('#ir-promocoes');
  await page.waitForTimeout(700);
  ok(await page.evaluate(() => { const b = document.getElementById('ht-promocoes').getBoundingClientRect(); return b.top >= 0 && b.top < innerHeight; }), 'tocar no atalho leva ao bloco da promoção');
  await page.evaluate(() => { state.page = 'search'; state.selected = null; state.view = 'list'; state.searchStatus = 'done'; render(); });
  await page.waitForTimeout(200);
  const cartoes = await page.evaluate(() => [...document.querySelectorAll('.rcard')].map(c => c.querySelector('.rcard-name').innerText.trim() + ' | ' + (c.querySelector('.rcard-promo')?.innerText.trim() || '-')));
  ok(cartoes.includes('Só Aula Tennis | Promoção: Primeira aula grátis') && cartoes.some(x => x.startsWith('Quadra Locação | -')),
    'no cartão da busca, a promoção da Premium; a do Básico não aparece — ' + cartoes.join(' / '));
  await browser.close();

  // ---- admin remove; banco sem a tabela; textos ----
  ({ browser, page } = await abrir({ admin: true, premium: ['a1'], promocoes: [PROMO] }));
  await page.evaluate(() => { state.selected = decorate(state.allCourts.find(x => x.id === 'a1')); state.page = 'court'; render(); });
  page.once('dialog', d => d.accept());
  await page.click('[data-apagar-promo="p1"]');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => !window.__db.promocoes.length && !document.getElementById('ht-promocoes')), 'o admin remove a promoção pela ficha');
  await browser.close();

  ({ browser, page } = await abrir({ premium: ['a1'], semPromocoes: true }));
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  await page.evaluate(() => { state.selected = decorate(state.allCourts.find(x => x.id === 'a1')); state.page = 'court'; render(); });
  ok(!erros.length && !(await page.$('#ht-promocoes')) && (await page.$('.court-name')), 'banco sem a tabela: a ficha abre normal, sem promoção');
  await browser.close();

  ({ browser, page } = await abrir({ q: 'parceiros/planos' }));
  r = await page.evaluate(() => ({
    premium: [...document.querySelectorAll('.pc-plano')].pop().innerText,
    faq: perguntasParceiros().filter(f => /^Como funcionam as promoções/.test(f.q)).map(f => f.a).join(' '),
    termos: TERMS_HTML, privacidade: PRIVACY_HTML,
    aviso: AVISOS_JOGADOR.find(x => x.campo === 'promocoes').t,
    link: AVISOS_DO_LINK.promocoes || '',
  }));
  ok(r.premium.includes('Promoções na ficha e na busca') && !/em breve/i.test(r.premium), 'o Premium mostra as promoções, sem "Em breve"');
  ok(r.faq.includes('uma promoção por vez') && r.faq.includes('90 dias') && r.faq.includes('Mandar por e-mail'), 'a Ajuda explica como funcionam as promoções');
  ok(r.termos.includes('uma promoção por vez') && r.termos.includes('responde pelo que anuncia') && r.termos.includes('remover a promoção enganosa'), 'os Termos dizem quem responde pela promoção');
  ok(r.privacidade.includes('os favoritos, a cidade da conta ou das preferências, as buscas salvas e a última busca também servem para isso') && r.privacidade.includes('a academia não recebe o seu nome nem o seu e-mail'), 'a Privacidade explica o uso dos favoritos no aviso');
  ok(r.aviso === 'Promoções das academias favoritas e perto de você' && r.link.includes('perto de você') && !/aviso/i.test(r.link), 'a conta e o link do e-mail falam das promoções das favoritas e das academias perto (regras 104 e 113)');
  await browser.close();
})();
