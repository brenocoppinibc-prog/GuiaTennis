// Estacionamento grátis e pago (pedidos do Breno em 21/10/2026: "não faz
// muito sentido uma academia marcar estacionamento grátis e pago… entender
// quando a academia faz isso" e "deixe a comodidade igual estava… quando
// selecionar as duas aparecer a aba para explicar").
const { abrir, ok, irParte, salvarFicha } = require('./harness');

(async () => {
  let { browser, page } = await abrir({ admin: true, q: '?court=a1' });

  // ---- o que já estava no banco com os dois marcados ----
  const lido = await page.evaluate(() => {
    const r = (acesso, horario) => arrumarEstacionamento({ amenities: ['estacionamento_gratuito', 'vestiario', 'estacionamento_pago'], acesso, horario });
    return {
      sem: r({}),
      alunos: r({ estacionar: 'Grátis para alunos; avulso paga R$ 10.' }),
      tempo: r({ fachada: 'Portão verde. Estacionamento: as primeiras 2 horas são grátis.' }),
      lotar: r({ entrada: 'Quando lota, use o estacionamento pago ao lado.' }),
      escolhida: r({ estacionamentoRegra: { tipo: 'lotar' }, estacionar: 'grátis para alunos' }),
      deMadrugada: arrumarEstacionamento({ amenities: ['estacionamento_gratuito', 'wifi'], acesso: { estacionamentoRegra: { tipo: 'alunos' } } }),
      soPago: arrumarEstacionamento({ amenities: ['estacionamento_pago'], acesso: { estacionamentoRegra: { tipo: 'alunos' } } }),
    };
  });
  ok(lido.sem.amenities.join() === 'estacionamento_gratuito,vestiario,estacionamento_pago' && lido.sem.acesso.estacionamentoRegra.tipo === 'misto',
    'os dois continuam marcados; sem texto que explique, fica "misto" — ' + JSON.stringify(lido.sem));
  ok(lido.alunos.acesso.estacionamentoRegra.tipo === 'alunos', 'entende "grátis para alunos"');
  ok(lido.tempo.acesso.estacionamentoRegra.tipo === 'tempo' && lido.tempo.acesso.estacionamentoRegra.horas === 2, 'entende "as primeiras 2 horas são grátis"');
  ok(lido.lotar.acesso.estacionamentoRegra.tipo === 'lotar', 'entende "quando lota, pago ao lado"');
  ok(lido.escolhida.acesso.estacionamentoRegra.tipo === 'lotar', 'a regra que a academia escolheu vale mais que o texto');
  ok(lido.deMadrugada.amenities.join() === 'estacionamento_gratuito,estacionamento_pago,wifi', 'grátis com regra (do chip único de antes) volta a ter os dois');
  ok(!lido.soPago.acesso.estacionamentoRegra, 'só pago: sem regra');

  // ---- o que o jogador lê ----
  const ler = await page.evaluate(() => {
    const c = (tipo, horas) => ({ id: 'zz', name: 'Academia Teste', cidade: 'São Paulo', quadras: {}, amenities: ['estacionamento_gratuito', 'estacionamento_pago', 'wifi'], acesso: tipo ? { estacionamentoRegra: { tipo, horas } } : {} });
    const comodidades = (x) => { const d = document.createElement('div'); d.innerHTML = htComodidades(x); return [...d.querySelectorAll('.ht-amen-i span')].map(s => s.textContent); };
    return {
      alunos: [estacionamentoRotulo(c('alunos')), estacionamentoDetalhe(c('alunos'))],
      tempo: [estacionamentoRotulo(c('tempo', 2)), estacionamentoDetalhe(c('tempo', 2))],
      lotar: estacionamentoDetalhe(c('lotar')),
      misto: [estacionamentoRotulo(c()), estacionamentoDetalhe(c())],
      lista: comodidades(c('alunos')),
      faq: perguntasAcademia(c('alunos')).find(p => /estacionamento/.test(p.q))?.a || '',
      sobre: descricaoAcademia(c('tempo', 2)),
      selo: selos(c('alunos')).map(x => x.label),
      falta: faltasDaFicha({ ...c(), plano: 'basico' }),
      basico: estacionamentoRotulo({ amenities: ['estacionamento_gratuito'], acesso: { estacionamentoRegra: { tipo: 'alunos' } } }),
    };
  });
  ok(ler.alunos[0] === 'Estacionamento grátis para alunos' && ler.alunos[1] === 'Grátis para alunos; para quem só aluga a quadra, é pago.', 'grátis para alunos — ' + ler.alunos.join(' | '));
  ok(ler.tempo[0] === 'Estacionamento grátis nas primeiras 2h' && ler.tempo[1] === 'Grátis nas primeiras 2h; depois, é pago.', 'grátis por um tempo — ' + ler.tempo.join(' | '));
  ok(ler.lotar === 'Grátis enquanto houver vaga; depois, é pago.' && ler.misto[0] === 'Estacionamento grátis e pago' && ler.misto[1].includes('Pergunte na academia como funciona'), 'até lotar, e o "misto" manda perguntar');
  ok(ler.lista.filter(t => /Estacionamento/.test(t)).length === 1 && ler.lista[0] === 'Estacionamento grátis para alunos', 'na ficha, um item só de estacionamento — ' + ler.lista.join(' | '));
  ok(ler.faq === 'Sim, no local. Grátis para alunos; para quem só aluga a quadra, é pago.', 'pergunta frequente com a regra — ' + ler.faq);
  ok(ler.sobre.includes('estacionamento grátis nas primeiras 2h'), 'o "Sobre" usa a regra');
  ok(!ler.selo.includes('Estacionamento grátis'), 'grátis só para alunos não vira o selo "Estacionamento grátis" no cartão');
  ok(ler.falta.includes('Como funciona o estacionamento'), 'no Parceiros, o "misto" entra no que falta na ficha');
  ok(ler.basico === 'Estacionamento grátis para alunos', 'no Básico, se o plano mostra só o "grátis" do par, a regra continua');

  // ---- no plano Básico (sem "como chegar"), a regra acompanha a comodidade ----
  const basico = await page.evaluate(() => aplicarPlano({ plano: 'basico', amenities: ['estacionamento_gratuito', 'estacionamento_pago'], photos: [], acesso: { fachada: 'Portão verde', estacionamentoRegra: { tipo: 'alunos' } }, politica: {} }));
  ok(basico.acesso.estacionamentoRegra?.tipo === 'alunos' && !basico.acesso.fachada, 'Básico: a regra fica, a fachada não');

  // ---- cadastro: os dois chips de antes; com os dois, a pergunta embaixo ----
  await page.evaluate(() => document.querySelector('.editar-academia[data-court="a1"]').click());
  await page.waitForTimeout(300);
  await irParte(page, 'quadras');
  const chip = (k) => page.evaluate((k) => document.querySelector(`.reg-amenity[data-amenity="${k}"]`).click(), k);
  const tela = () => page.evaluate(() => {
    const caixa = document.getElementById('reg-estac');
    const chips = [...document.querySelectorAll('#register-overlay .reg-amenity')];
    return {
      chips: chips.filter(b => /Estacionamento/.test(b.textContent)).map(b => b.textContent.replace(/^\s*P\s*/, '').trim() + (b.classList.contains('active') ? '*' : '')),
      caixa: !!caixa,
      depoisDeTodas: !!caixa && chips.every(b => b.compareDocumentPosition(caixa) & Node.DOCUMENT_POSITION_FOLLOWING),
      regras: document.querySelectorAll('.reg-estac-regra').length,
      regra: [...document.querySelectorAll('.reg-estac-regra.active')].map(b => b.textContent.trim()).join(),
      falta: document.querySelector('.reg-estac-falta')?.textContent.trim() || '',
      am: window.__form.amenities.filter(ehEstacionamento).join(),
      r: JSON.stringify((window.__form.acesso || {}).estacionamentoRegra || null),
    };
  });
  let t = await tela();
  ok(t.chips.join('|') === 'Estacionamento grátis*|Estacionamento pago' && !t.caixa, 'os dois chips de antes; só "grátis" marcado, sem pergunta — ' + t.chips.join('|'));
  await chip('estacionamento_pago');
  await page.waitForTimeout(150);
  t = await tela();
  ok(t.caixa && t.depoisDeTodas && t.regras === 3 && t.falta.includes('Escolha como funciona'), 'com os dois marcados, "como funciona?" embaixo de todas as comodidades');
  await page.click('.reg-estac-regra[data-v="tempo"]');
  await page.waitForTimeout(150);
  await page.fill('#f-estac-horas', '3');
  t = await tela();
  ok(t.regra.startsWith('Grátis por um tempo') && t.r === '{"tipo":"tempo","horas":3}' && !t.falta, 'por um tempo, com as horas — ' + t.r);
  await chip('estacionamento_pago');
  await page.waitForTimeout(150);
  t = await tela();
  ok(!t.caixa && t.am === 'estacionamento_gratuito' && t.r === 'null', 'desmarcar o pago tira a pergunta e a regra');
  await chip('estacionamento_pago');
  await page.waitForTimeout(150);
  await page.click('.reg-estac-regra[data-v="alunos"]');
  await page.waitForTimeout(150);
  await salvarFicha(page);
  await page.waitForTimeout(600);
  const salvo = await page.evaluate(() => ({ am: window.__ultimoUpdate.amenities.filter(ehEstacionamento).join(), r: (window.__ultimoUpdate.acesso || {}).estacionamentoRegra }));
  ok(salvo.am === 'estacionamento_gratuito,estacionamento_pago' && salvo.r && salvo.r.tipo === 'alunos', 'grava os dois e a regra — ' + JSON.stringify(salvo));
  await browser.close();
  console.log('\nestacionamento.js: fim');
})();
