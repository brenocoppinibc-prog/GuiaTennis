// O site entende e arruma o que a academia escreveu, sem IA: estacionamento
// no modelo único, fachada e chegada arrumadas, frase no lugar certo.
const { abrir, ok } = require('./harness');
(async () => {
  let { browser, page } = await abrir({ q: '?court=a2' });
  await page.evaluate(async () => {
    window.__db.academias[1].acesso = {
      fachada: 'PORTÃO PRETO SEM PLACA!!! Tem vaga na rua da frente',
      entrada: 'avise na portaria que vai jogar tenis 😀',
      estacionar: 'zona azul ate 19:00, depois libera. tem estacionamento na esquina 15 reais. Manobrista na porta',
    };
    window.__db.academias[1].horario = { modo: 'igual', semana: { de: '06:00', ate: '22:00', fechado: false }, sabado: { de: '', ate: '', fechado: true }, domingo: { de: '', ate: '', fechado: true }, nota: 'fecha nos feriados' };
    await loadEverything(); state.selected = state.allCourts.find(c => c.id === 'a2'); render();
  });
  const itens = await page.evaluate(() => [...document.querySelectorAll('.ht-know-i')].map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  const txt = await page.evaluate(() => document.getElementById('app').textContent.replace(/\s+/g, ' '));
  ok(itens[0] === 'Como é a fachada Portão preto sem placa.', 'fachada arrumada, sem a frase de estacionamento — ' + itens[0]);
  ok(itens[1] === 'Na chegada Avise na portaria que vai jogar tênis.', 'chegada arrumada — ' + itens[1]);
  ok(itens[2].includes('Na rua Zona azul Zona azul até 19h. Depois libera. Tem vaga na rua da frente.'), 'rua: zona azul vence, e a frase da fachada veio para cá — ' + itens[2]);
  ok(itens[2].includes('Pago perto Tem estacionamento na esquina R$ 15.'), 'pago perto com valor no formato R$');
  ok(itens[2].includes('Manobrista Manobrista na porta.'), 'manobrista na sua linha');
  ok(txt.includes('Não tem estacionamento próprio. Na rua: Zona azul.'), 'pergunta frequente no mesmo modelo');
  ok(txt.includes('Fecha nos feriados.'), 'observação do horário arrumada');
  await browser.close();

  // Fachada nunca some (caso da Morumbi: vaga própria e fachada com "garagem"/"estacionamento")
  ({ browser, page } = await abrir({ q: '?court=a1' }));
  for (const [txt, esperado] of [
    ['Portão preto ao lado da garagem do prédio', 'Portão preto ao lado da garagem do prédio.'],
    ['Estacionamento na frente do portão preto', 'Estacionamento na frente do portão preto.'],
  ]) {
    const r = await page.evaluate(t => acessoFicha({ amenities: ['estacionamento_gratuito'], acesso: { fachada: t } }).fachada, txt);
    ok(r === esperado, 'com vaga própria, a fachada fica inteira — ' + r);
  }
  const unica = await page.evaluate(() => acessoFicha({ amenities: [], acesso: { fachada: 'Estacionamento na frente do portão preto' } }).fachada);
  ok(unica === 'Estacionamento na frente do portão preto.', 'sem vaga, frase única não esvazia a fachada');
  await browser.close();

  // Prévia no cadastro
  ({ browser, page } = await abrir({ admin: true, q: '?court=a2' }));
  await page.evaluate(() => document.querySelector('.editar-academia[data-court="a2"]').click());
  await page.waitForTimeout(300);
  await page.fill('#f-acesso-estacionar', 'DA PRA PARAR NA RUA TRANQUILO');
  await page.evaluate(() => document.getElementById('f-acesso-estacionar').dispatchEvent(new Event('change')));
  await page.waitForTimeout(200);
  const previa = await page.evaluate(() => document.querySelector('.est-previa')?.innerText.replace(/\s+/g, ' ').trim());
  ok(previa === 'Estacionamento na ficha Na rua Livre Da para parar na rua tranquilo.', 'prévia mostra como foi entendido — ' + previa);
  await page.evaluate(() => document.getElementById('register-submit').click());
  await page.waitForTimeout(500);
  const up = await page.evaluate(() => window.__ultimoUpdate.acesso);
  ok(up.estacionar === 'DA PRA PARAR NA RUA TRANQUILO', 'o banco guarda o texto como a academia escreveu');
  await browser.close();
})();
