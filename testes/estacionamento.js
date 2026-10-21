// Estacionamento grátis e pago (pedido do Breno em 21/10/2026: "não faz muito
// sentido uma academia marcar estacionamento grátis e pago… entender quando a
// academia faz isso"). Uma resposta só, com a regra quando é grátis e pago.
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
      soPago: arrumarEstacionamento({ amenities: ['estacionamento_pago'], acesso: { estacionamentoRegra: { tipo: 'alunos' } } }),
    };
  });
  ok(lido.sem.amenities.join() === 'estacionamento_gratuito,vestiario' && lido.sem.acesso.estacionamentoRegra.tipo === 'misto',
    'os dois marcados viram um só; sem texto que explique, fica "misto" — ' + JSON.stringify(lido.sem));
  ok(lido.alunos.acesso.estacionamentoRegra.tipo === 'alunos', 'entende "grátis para alunos"');
  ok(lido.tempo.acesso.estacionamentoRegra.tipo === 'tempo' && lido.tempo.acesso.estacionamentoRegra.horas === 2, 'entende "as primeiras 2 horas são grátis"');
  ok(lido.lotar.acesso.estacionamentoRegra.tipo === 'lotar', 'entende "quando lota, pago ao lado"');
  ok(!lido.soPago.acesso.estacionamentoRegra, 'só pago: sem regra');

  // ---- o que o jogador lê ----
  const ler = await page.evaluate(() => {
    const c = (tipo, horas) => ({ id: 'zz', name: 'Academia Teste', cidade: 'São Paulo', quadras: {}, amenities: ['estacionamento_gratuito', 'wifi'], acesso: { estacionamentoRegra: { tipo, horas } } });
    const comodidades = (x) => { const d = document.createElement('div'); d.innerHTML = htComodidades(x); return [...d.querySelectorAll('.ht-amen-i span')].map(s => s.textContent); };
    return {
      alunos: [estacionamentoRotulo(c('alunos')), estacionamentoDetalhe(c('alunos'))],
      tempo: [estacionamentoRotulo(c('tempo', 2)), estacionamentoDetalhe(c('tempo', 2))],
      lotar: estacionamentoDetalhe(c('lotar')),
      misto: estacionamentoDetalhe(c('misto')),
      lista: comodidades(c('alunos')),
      faq: perguntasAcademia(c('alunos')).find(p => /estacionamento/.test(p.q))?.a || '',
      sobre: descricaoAcademia(c('tempo', 2)),
      selo: selos(c('alunos')).map(x => x.label),
      falta: faltasDaFicha({ ...c('misto'), plano: 'basico' }),
    };
  });
  ok(ler.alunos[0] === 'Estacionamento grátis para alunos' && ler.alunos[1] === 'Grátis para alunos; para quem só aluga a quadra, é pago.', 'grátis para alunos — ' + ler.alunos.join(' | '));
  ok(ler.tempo[0] === 'Estacionamento grátis nas primeiras 2h' && ler.tempo[1] === 'Grátis nas primeiras 2h; depois, é pago.', 'grátis por um tempo — ' + ler.tempo.join(' | '));
  ok(ler.lotar === 'Grátis enquanto houver vaga; depois, é pago.' && ler.misto.includes('Pergunte na academia como funciona'), 'até lotar, e o "misto" manda perguntar');
  ok(ler.lista.filter(t => /Estacionamento/.test(t)).length === 1 && ler.lista[0] === 'Estacionamento grátis para alunos', 'na ficha, um item só de estacionamento — ' + ler.lista.join(' | '));
  ok(ler.faq === 'Sim, no local. Grátis para alunos; para quem só aluga a quadra, é pago.', 'pergunta frequente com a regra — ' + ler.faq);
  ok(ler.sobre.includes('estacionamento grátis nas primeiras 2h'), 'o "Sobre" usa a regra');
  ok(!ler.selo.includes('Estacionamento grátis'), 'grátis só para alunos não vira o selo "Estacionamento grátis" no cartão');
  ok(ler.falta.includes('Como funciona o estacionamento'), 'no Parceiros, o "misto" entra no que falta na ficha');

  // ---- no plano Básico (sem "como chegar"), a regra acompanha a comodidade ----
  const basico = await page.evaluate(() => aplicarPlano({ plano: 'basico', amenities: ['estacionamento_gratuito'], photos: [], acesso: { fachada: 'Portão verde', estacionamentoRegra: { tipo: 'alunos' } }, politica: {} }));
  ok(basico.acesso.estacionamentoRegra?.tipo === 'alunos' && !basico.acesso.fachada, 'Básico: a regra fica, a fachada não');

  // ---- cadastro: um chip "Estacionamento" e a pergunta ----
  await page.evaluate(() => document.querySelector('.editar-academia[data-court="a1"]').click());
  await page.waitForTimeout(300);
  await irParte(page, 'quadras');
  const tela = () => page.evaluate(() => ({
    chips: [...document.querySelectorAll('#register-overlay .reg-amenity')].filter(b => /Estacionamento/.test(b.textContent)).map(b => b.textContent.replace(/^\s*P\s*/, '').trim() + (b.classList.contains('active') ? '*' : '')),
    modo: [...document.querySelectorAll('.reg-estac-modo.active')].map(b => b.textContent.trim()).join(),
    regra: [...document.querySelectorAll('.reg-estac-regra.active')].map(b => b.textContent.trim()).join(),
    regras: document.querySelectorAll('.reg-estac-regra').length,
    falta: document.querySelector('.reg-estac-falta')?.textContent.trim() || '',
    am: window.__form.amenities.filter(ehEstacionamento).join(),
    r: JSON.stringify((window.__form.acesso || {}).estacionamentoRegra || null),
  }));
  let t = await tela();
  ok(t.chips.length === 1 && t.chips[0] === 'Estacionamento*' && t.modo === 'Grátis' && !t.regras, 'um chip "Estacionamento" e, embaixo, Grátis / Pago / Grátis e pago — ' + JSON.stringify(t));
  await page.click('.reg-estac-modo[data-v="misto"]');
  await page.waitForTimeout(150);
  t = await tela();
  ok(t.modo === 'Grátis e pago' && t.regras === 3 && t.falta.includes('Escolha como funciona'), '"Grátis e pago" pergunta como funciona');
  await page.click('.reg-estac-regra[data-v="tempo"]');
  await page.waitForTimeout(150);
  await page.fill('#f-estac-horas', '3');
  t = await tela();
  ok(t.regra.startsWith('Grátis por um tempo') && t.am === 'estacionamento_gratuito' && t.r === '{"tipo":"tempo","horas":3}', 'por um tempo, com as horas — ' + t.r);
  await page.click('.reg-estac-modo[data-v="pago"]');
  await page.waitForTimeout(150);
  t = await tela();
  ok(t.am === 'estacionamento_pago' && t.r === 'null' && t.chips[0] === 'Estacionamento*', 'trocar para "Pago": uma vaga só, sem regra');
  await page.click('.reg-estac-modo[data-v="misto"]');
  await page.waitForTimeout(150);
  await page.click('.reg-estac-regra[data-v="alunos"]');
  await page.waitForTimeout(150);
  await salvarFicha(page);
  await page.waitForTimeout(600);
  const salvo = await page.evaluate(() => ({ am: window.__ultimoUpdate.amenities.filter(ehEstacionamento).join(), r: (window.__ultimoUpdate.acesso || {}).estacionamentoRegra }));
  ok(salvo.am === 'estacionamento_gratuito' && salvo.r && salvo.r.tipo === 'alunos', 'grava uma vaga só e a regra — ' + JSON.stringify(salvo));
  // Desmarcar o chip tira a vaga e a regra.
  await page.evaluate(() => document.querySelector('.editar-academia[data-court="a1"]').click());
  await page.waitForTimeout(300);
  await irParte(page, 'quadras');
  await page.evaluate(() => [...document.querySelectorAll('#register-overlay .reg-amenity')].find(b => /Estacionamento/.test(b.textContent)).click());
  await page.waitForTimeout(150);
  t = await tela();
  ok(t.am === '' && t.r === 'null' && !(await page.$('#reg-estac')), 'desmarcar "Estacionamento" tira a vaga e a regra');
  await browser.close();
  console.log('\nestacionamento.js: fim');
})();
