// Pedido do Breno em 08/10/2026: "quero colocar em ação que academias com
// Premium divulgue promoções" (desde 22/10/2026, também o Completo, paga por
// semana com os créditos). A academia cria, muda e encerra em
// Parceiros › Promoções; a promoção aparece na ficha (atalho no topo e o
// bloco com os preços) e no cartão da busca, até vencer.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);
const temAviso = (page) => page.evaluate(() => !!document.getElementById('aviso-sair'));
const dia = (n) => new Date(Date.now() + n * 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const PROMO = { id: 'p1', academia_id: 'a1', titulo: 'Primeira aula grátis', detalhes: 'Para quem nunca fez aula aqui.', valida_ate: dia(10), avisados: 2 };

(async () => {
  // ---- Parceiros, no Básico: trancado ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes' });
  await page.waitForTimeout(400);
  let corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Promoções') && corpo.includes('Disponível no plano Completo') && !(await page.$('#pc-promo-titulo')), 'no Básico: a página mostra o que é e "Disponível no plano Completo" (22/10/2026: o Completo também publica)');
  const menu = await page.evaluate(() => PC_MENU_LOGADO.map(x => x.t).join(','));
  ok(menu.includes('Avaliações,Promoções,Desempenho'), 'Promoções no menu do Parceiros, depois de Avaliações (sem "Avisos por e-mail", 16/10/2026)');
  await browser.close();

  // ---- Premium, preço ainda em R$ 0: publicar, mudar, encerrar ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes', premium: ['a1'], envios: { a1: 3 } }));
  await page.waitForTimeout(400);
  const semanas = () => page.evaluate(() => [...document.querySelectorAll('[data-promo-semanas]')].map(x => x.innerText.trim() + (x.classList.contains('active') ? '*' : '')).join(','));
  ok(await page.isVisible('#pc-promo-titulo') && await semanas() === '1 semana,2 semanas,4 semanas*,8 semanas,12 semanas', 'Premium: o formulário com as semanas, 4 de saída — ' + await semanas());
  corpo = await texto(page, '.pc-promo-form');
  ok(corpo.includes(`Vale até ${await page.evaluate((d) => diaPorExtenso(d), dia(27))}`) && corpo.includes('Por enquanto, a promoção na ficha não tem custo.'), 'diz até quando vale e que, por enquanto, não tem custo');
  await page.click('#pc-promo-revisar');
  await page.waitForTimeout(200);
  ok((await texto(page, '#parceiros .form-error')).includes('Escreva a promoção') && await page.$('#pc-promo-titulo'), 'sem o título, pede para escrever e não passa para a prévia');
  await page.fill('#pc-promo-titulo', 'Primeira aula grátis');
  // Textos curtos, com o contador (regras 176 e 177): título até 40, detalhes até 150.
  const longo = 'Para quem nunca fez aula aqui. '.repeat(20);
  await page.fill('#pc-promo-detalhes', longo);
  const limites = await page.evaluate(() => ({ t: document.getElementById('pc-promo-titulo').maxLength, d: document.getElementById('pc-promo-detalhes').maxLength, n: document.getElementById('pc-promo-detalhes').value.length }));
  ok(limites.t === 40 && limites.d === 150 && limites.n === 150 && (await texto(page, '[data-cont-promo="titulo"]')) === '20/40' && (await texto(page, '[data-cont-promo="detalhes"]')) === '150/150', 'o título vai até 40 letras e os detalhes até 150, com o contador de cada um — ' + JSON.stringify(limites));
  await page.fill('#pc-promo-detalhes', 'Para quem nunca fez aula aqui.');
  ok((await texto(page, '[data-cont-promo="detalhes"]')) === '30/150', 'o contador acompanha o que se digita');
  await page.click('[data-promo-semanas="2"]');
  await page.waitForTimeout(150);
  ok((await page.inputValue('#pc-promo-titulo')) === 'Primeira aula grátis' && await semanas() === '1 semana,2 semanas*,4 semanas,8 semanas,12 semanas'
    && (await texto(page, '.pc-promo-form')).includes(`Vale até ${await page.evaluate((d) => diaPorExtenso(d), dia(13))}`), 'escolher 2 semanas muda a validade e não apaga o que foi escrito');
  await page.click('#pc-promo-revisar');
  await page.waitForTimeout(150);
  corpo = await texto(page, '#pc-promo-revisao');
  ok(corpo.includes('2 semanas · até') && corpo.includes('Sem custo') && (await texto(page, '#pc-promo-salvar')) === 'Publicar promoção', 'a prévia mostra a duração e o custo — ' + corpo.replace(/\s+/g, ' ').slice(0, 200));
  await page.click('#pc-promo-salvar');
  await page.waitForTimeout(500);
  let r = await page.evaluate(() => ({
    args: (window.__rpcs.filter(x => x.nome === 'salvar_promocao').slice(-1)[0] || {}).args,
    aviso: document.querySelector('#parceiros .conta-aviso')?.innerText || '',
    lista: [...document.querySelectorAll('.pc-promo')].map(x => x.innerText.replace(/\s+/g, ' ')),
    site: promocoesDe(state.allCourts.find(c => c.id === 'a1')).map(x => x.titulo),
    db: window.__db.promocoes[0],
  }));
  ok(r.args && r.args.p_academia === 'a1' && r.args.p_id === null && r.args.p_titulo === 'Primeira aula grátis' && r.args.p_semanas === 2 && !('p_valida_ate' in r.args) && r.db.valida_ate === dia(13),
    'publica com a academia, o título, os detalhes e as semanas (a validade sai do banco)');
  ok(r.aviso.includes('Promoção publicada na ficha e na busca até') && !r.aviso.includes('créditos') && r.aviso.includes('Mandar por e-mail'), 'publicar na ficha não manda e-mail; sem custo, nada sai dos créditos — ' + r.aviso);
  ok(r.lista.length === 1 && /valendo/i.test(r.lista[0]) && /Válida até \d+ de [a-zç]+ · 2 semanas/.test(r.lista[0]) && r.lista[0].includes('Mandar por e-mail'), 'a promoção aparece na lista, valendo, com as semanas e "Mandar por e-mail" — ' + r.lista[0]);
  ok(r.site.join() === 'Primeira aula grátis', 'e já aparece no site');
  await page.click('[data-promo-mudar]');
  await page.waitForTimeout(200);
  ok((await page.inputValue('#pc-promo-titulo')) === 'Primeira aula grátis' && (await texto(page, '.pc-promo-form .pc-card-t')) === 'Alterar a promoção'
    && (await semanas()).startsWith('Não somar*,1 semana') && (await texto(page, '.pc-promo-form')).includes('Mudar o texto não custa nada.'), '"Alterar" abre o formulário com a promoção, sem somar semanas — ' + await semanas());
  await page.fill('#pc-promo-titulo', 'Primeira aula grátis às segundas');
  await page.click('#pc-promo-revisar');
  await page.waitForTimeout(150);
  ok((await texto(page, '#pc-promo-salvar')).includes('Salvar a alteração') && (await texto(page, '#pc-promo-previa')).includes('Primeira aula grátis às segundas'), 'mudar também passa pela prévia');
  await page.click('#pc-promo-salvar');
  await page.waitForTimeout(500);
  r = await page.evaluate(() => ({ aviso: document.querySelector('#parceiros .conta-aviso')?.innerText || '', args: (window.__rpcs.filter(x => x.nome === 'salvar_promocao').slice(-1)[0] || {}).args, p: window.__db.promocoes[0] }));
  ok(r.aviso.includes('Promoção atualizada') && r.args.p_id === 'promo-1' && r.args.p_semanas === 0 && r.p.titulo === 'Primeira aula grátis às segundas' && r.p.valida_ate === dia(13), 'mudar salva na mesma promoção, com a mesma validade');
  // Uma promoção por vez (16/10/2026; eram 3): com uma valendo, o formulário dá lugar ao recado.
  corpo = await texto(page, '#parceiros .pc-main');
  ok(!(await page.$('#pc-promo-titulo')) && corpo.split('Uma promoção por vez').length === 2 && corpo.includes('Alterar') && corpo.includes('Encerrar'), 'com uma valendo, sem formulário e sem repetir "uma promoção por vez" (só no alto)');
  ok((await page.evaluate(() => sb.rpc('salvar_promocao', { p_academia: 'a1', p_id: null, p_titulo: 'Aula dupla', p_detalhes: '', p_semanas: 1 }))).error?.message.includes('uma promoção valendo'), 'e o banco recusa a segunda');
  page.once('dialog', d => d.accept());
  await page.click('[data-promo-encerrar]');
  await page.waitForTimeout(500);
  r = await page.evaluate(() => ({ n: window.__db.promocoes.length, aviso: document.querySelector('#parceiros .conta-aviso')?.innerText || '', form: !!document.getElementById('pc-promo-titulo') }));
  ok(r.n === 0 && r.aviso.trim() === 'Promoção encerrada.' && r.form, '"Encerrar" pergunta, tira a promoção e o formulário volta');
  // Se ficou mais de uma valendo de antes, o site mostra só a mais nova.
  ok(await page.evaluate(() => { state.promocoes = { a1: [{ id: 'v', titulo: 'Velha', valida_ate: hojeEmBrasilia(20), created_at: '2026-10-01T10:00:00Z' }, { id: 'n', titulo: 'Nova', valida_ate: hojeEmBrasilia(5), created_at: '2026-10-10T10:00:00Z' }] }; const l = promocoesDe(state.allCourts.find(c => c.id === 'a1')); return l.length === 1 && l[0].titulo === 'Nova'; }),
    'de antes com duas valendo: o site mostra só a mais nova');
  await browser.close();

  // ---- Completo, com preço (pedido do Breno em 22/10/2026: "completo tbm
  // pode ter promoção mas não tem desconto nessa parte pagar mais doq o
  // Premium"): R$ 10 por semana, dos créditos ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes', completo: ['a1'], envios: { a1: 25 }, precoPromocao: 10 }));
  await page.waitForTimeout(500);
  corpo = (await texto(page, '#pc-promo-preco')).replace(/\s+/g, ' ');
  ok(corpo.includes('Por semana R$ 10') && corpo.includes('4 semanas R$ 40') && corpo.includes('Créditos disponíveis R$ 25') && corpo.includes('Faltam R$ 15 em créditos')
    && corpo.includes('No Premium, a semana sai por R$ 8 (20% menos)') && !corpo.includes('menos no Premium'), 'Completo: preço cheio por semana, o total, os créditos, o que falta e o preço do Premium — ' + corpo);
  ok((await texto(page, '.pc-sec-sub')).includes('paga com os créditos (R$ 10 por semana)'), 'no alto, o preço da semana');
  await page.fill('#pc-promo-titulo', 'Aula experimental');
  await page.click('#pc-promo-revisar');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => document.getElementById('pc-promo-salvar').disabled) && (await texto(page, '#pc-promo-revisao .pc-email-bloqueio')).includes('Compre créditos ou escolha menos semanas'),
    'sem créditos para as 4 semanas, a prévia trava o botão e oferece comprar créditos');
  // Comprar créditos: a página de pagamento volta para a promoção, com o que foi escrito.
  await page.click('#pc-promo-revisao [data-comprar-creditos]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => state.parceirosAba === 'creditos') && !(await temAviso(page)) && (await texto(page, '#pc-creditos-voltar')).includes('Voltar à promoção')
    && (await texto(page, '.pc-checkout-resumo')).includes('Créditos de promoções') && (await texto(page, '.pc-checkout-sub')).includes('na ficha'),
    '"Comprar créditos" abre o pagamento, sem perguntar, com "Voltar à promoção"');
  await page.click('#pc-creditos-voltar');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => state.parceirosAba === 'promocoes' && state.pcPromoForm && state.pcPromoForm.titulo === 'Aula experimental'), 'e volta à promoção com o que foi escrito');
  if (await page.$('#pc-promo-editar')) { await page.click('#pc-promo-editar'); await page.waitForTimeout(150); }
  await page.click('[data-promo-semanas="2"]');
  await page.waitForTimeout(150);
  corpo = (await texto(page, '#pc-promo-preco')).replace(/\s+/g, ' ');
  ok(corpo.includes('2 semanas R$ 20') && !corpo.includes('Faltam'), '2 semanas cabem nos créditos — ' + corpo);
  await page.click('#pc-promo-revisar');
  await page.waitForTimeout(150);
  ok((await texto(page, '#pc-promo-salvar')) === 'Publicar promoção · R$ 20' && (await texto(page, '#pc-promo-revisao')).includes('R$ 20 dos créditos'), 'o botão diz o valor: "Publicar promoção · R$ 20"');
  await page.click('#pc-promo-salvar');
  await page.waitForTimeout(500);
  r = await page.evaluate(() => ({ aviso: document.querySelector('#parceiros .conta-aviso')?.innerText || '', saldo: window.__db.academias.find(a => a.id === 'a1').envios_de_aviso, lista: [...document.querySelectorAll('.pc-promo')].map(x => x.innerText.replace(/\s+/g, ' ')) }));
  ok(r.saldo === 5 && r.aviso.includes('R$ 20 saíram dos créditos') && !r.aviso.includes('Mandar por e-mail'), 'publicou: R$ 20 saem dos créditos — ' + r.aviso);
  ok(r.lista[0].includes('2 semanas · R$ 20 dos créditos') && !r.lista[0].includes('Mandar por e-mail'), 'na lista, as semanas e o valor; no Completo, sem "Mandar por e-mail" (o leilão é do Premium) — ' + r.lista[0]);
  await page.click('[data-promo-mudar]');
  await page.waitForTimeout(200);
  ok(await semanas() === 'Não somar*,1 semana,2 semanas,4 semanas,8 semanas', 'alterar: dá para somar até 12 semanas à frente — ' + await semanas());
  await page.click('[data-promo-semanas="1"]');
  await page.waitForTimeout(150);
  ok((await texto(page, '#pc-promo-preco')).includes('Faltam R$ 5 em créditos') && (await texto(page, '.pc-promo-form')).includes(`Vale até ${await page.evaluate((d) => diaPorExtenso(d), dia(20))}`), 'somar 1 semana: a nova validade e o que falta');
  await page.click('[data-promo-semanas="0"]');
  await page.click('#pc-promo-cancelar');
  await page.waitForTimeout(200);
  let pergunta = '';
  page.once('dialog', d => { pergunta = d.message(); d.accept(); });
  await page.click('[data-promo-encerrar]');
  await page.waitForTimeout(500);
  r = await page.evaluate(() => ({ aviso: document.querySelector('#parceiros .conta-aviso')?.innerText || '', saldo: window.__db.academias.find(a => a.id === 'a1').envios_de_aviso }));
  ok(pergunta.includes('As semanas que ainda não começaram voltam para os créditos (R$ 10)') && r.saldo === 15 && r.aviso.includes('R$ 10 voltaram para os créditos'), 'encerrar devolve a semana que ainda não começou — ' + pergunta);
  await browser.close();

  // Premium com preço: 20% menos.
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes', premium: ['a1'], envios: { a1: 100 }, precoPromocao: 10 }));
  await page.waitForTimeout(500);
  corpo = (await texto(page, '#pc-promo-preco')).replace(/\s+/g, ' ');
  ok(corpo.includes('Por semana R$ 8 20% menos no Premium') && corpo.includes('4 semanas R$ 32') && !corpo.includes('Ver os planos'), 'Premium: R$ 8 por semana, com o desconto à vista — ' + corpo);
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
  ok(r.faq.includes('uma promoção por vez') && r.faq.includes('de 1 a 12') && r.faq.includes('preço por semana') && r.faq.includes('Completo e Premium') && r.faq.includes('Mandar por e-mail'), 'a Ajuda explica como funcionam as promoções, pagas por semana');
  ok(r.termos.includes('uma promoção por vez') && r.termos.includes('responde pelo que anuncia') && r.termos.includes('remover a promoção enganosa'), 'os Termos dizem quem responde pela promoção');
  ok(r.termos.includes('Nos planos Completo e Premium, a academia também pode divulgar uma promoção por vez') && r.termos.includes('paga por semana com os créditos') && r.termos.includes('devolve aos créditos as semanas que ainda não começaram')
    && r.termos.includes('No plano Premium, a academia pode dar lances') && !r.termos.includes('20% menos no Premium'), 'os Termos: promoção na ficha paga por semana (Completo e Premium) e leilão só do Premium');
  ok(r.privacidade.includes('os favoritos, a cidade da conta ou das preferências, as buscas salvas e a última busca também servem para isso') && r.privacidade.includes('a academia não recebe o seu nome nem o seu e-mail'), 'a Privacidade explica o uso dos favoritos no aviso');
  ok(r.aviso === 'Promoções das academias favoritas e perto de você' && r.link.includes('perto de você') && !/aviso/i.test(r.link), 'a conta e o link do e-mail falam das promoções das favoritas e das academias perto (regras 104 e 113)');
  await browser.close();
})();
