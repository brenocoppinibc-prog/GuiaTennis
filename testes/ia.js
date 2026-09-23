// Padronização com IA: o botão do cadastro, o lote do painel e a ficha.
const { abrir, ok } = require('./harness');
(async () => {
  // Cadastro: a2 não tem estacionamento próprio
  let { browser, page } = await abrir({ admin: true, q: '?court=a2' });
  await page.evaluate(() => document.querySelector('.editar-academia[data-court="a2"]').click());
  await page.waitForTimeout(300);
  await page.fill('#f-acesso-fachada', 'PORTÃO PRETO!!! do lado do hotel');
  await page.fill('#f-acesso-estacionar', 'zona azul ate 19h, depois libera. tem estacionamento na esquina 15 reais');
  await page.evaluate(() => document.getElementById('ia-padronizar').click());
  await page.waitForTimeout(400);
  const pedido = await page.evaluate(() => window.__iaPedidos[0]);
  ok(pedido.nome === 'padronizar-academia', 'chama a função padronizar-academia');
  ok(pedido.body.fachada.startsWith('PORTÃO') && pedido.body.estacionar.includes('zona azul'), 'manda os textos da academia');
  ok(pedido.body.contexto.estacionamento_no_local === 'nao' && pedido.body.contexto.modalidades.join() === 'locacao', 'manda o contexto (sem vaga, só locação)');
  ok(pedido.body.fora_do_prazo.geral === '' && pedido.body.fora_do_prazo.aula === '', 'regra de cancelamento vazia vai vazia');
  const form = await page.evaluate(() => ({
    fachada: document.getElementById('f-acesso-fachada').value,
    entrada: document.getElementById('f-acesso-entrada').value,
    nota: document.getElementById('f-horario-nota').value,
    previa: document.querySelector('.ia-previa')?.textContent.replace(/\s+/g, ' ').trim(),
    aviso: document.querySelector('.ia-caixa .footnote').textContent,
  }));
  ok(form.fachada === 'Portão preto, ao lado do hotel.', 'fachada reescrita no formulário');
  ok(form.entrada === 'Avise na portaria que vai jogar tênis.', 'chegada reescrita no formulário');
  ok(form.nota === 'Fecha nos feriados.', 'observação do horário reescrita');
  ok(/Na rua Zona azul Até as 19h/.test(form.previa) && /Pago perto Na esquina, R\$ 15 a hora/.test(form.previa), 'prévia do estacionamento no modelo — ' + form.previa);
  ok(form.aviso.startsWith('Pronto. Confira'), 'pede para conferir antes de salvar');
  await page.evaluate(() => document.getElementById('register-submit').click());
  await page.waitForTimeout(600);
  const up = await page.evaluate(() => window.__ultimoUpdate);
  ok(up.acesso.estacionamento && up.acesso.estacionamento.rua === 'zona_azul', 'salva o estacionamento no modelo');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(up.acesso.padronizadoEm), 'marca a data da padronização');
  ok(up.politica.foraDoPrazo === 'A aula é cobrada.', 'regra de cancelamento reescrita e salva');
  await page.evaluate(() => { state.showRegister = false; render(); });
  await page.waitForTimeout(200);
  const ficha = await page.evaluate(() => document.getElementById('app').textContent.replace(/\s+/g, ' '));
  ok(ficha.includes('Na rua Zona azul Até as 19h. Depois fica livre.'), 'ficha mostra o estacionamento no modelo');
  ok(ficha.includes('Não tem estacionamento próprio. Na rua: Zona azul. Até as 19h. Depois fica livre. Pago perto: Na esquina, R$ 15 a hora.'), 'pergunta frequente usa o mesmo modelo');
  ok(!ficha.includes('Onde estacionar em'), 'estacionamento numa pergunta só');

  // Mexer no texto de onde parar desfaz o modelo até padronizar de novo
  await page.evaluate(() => document.querySelector('.editar-academia[data-court="a2"]').click());
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => !!document.querySelector('.ia-previa')), 'edição carrega o modelo salvo');
  await page.fill('#f-acesso-estacionar', 'mudou tudo');
  ok(await page.evaluate(() => !window.__form.acesso.estacionamento), 'texto novo apaga o modelo antigo');
  await browser.close();

  // Sem a função no Supabase: avisa e não mexe em nada
  ({ browser, page } = await abrir({ admin: true, semFuncao: true, q: '?court=a1' }));
  await page.evaluate(() => document.querySelector('.editar-academia[data-court="a1"]').click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('ia-padronizar').click());
  await page.waitForTimeout(300);
  const erro = await page.evaluate(() => ({ e: document.querySelector('.ia-caixa .form-error')?.textContent || '', f: document.getElementById('f-acesso-fachada').value }));
  ok(erro.e.includes('ainda não está ligada') && erro.f === 'Portão preto', 'sem a função: avisa e mantém o texto — ' + erro.e.trim());
  await browser.close();

  // Visitante cadastrando: sem botão de IA
  ({ browser, page } = await abrir());
  await page.evaluate(() => { state.showRegister = true; render(); });
  ok(await page.evaluate(() => !document.getElementById('ia-padronizar')), 'visitante não vê o botão da IA');
  await browser.close();

  // Lote no painel do admin
  ({ browser, page } = await abrir({ admin: true }));
  page.on('dialog', d => d.accept());
  await page.evaluate(() => { state.showAdminPanel = true; render(); });
  await page.evaluate(() => document.getElementById('ia-lote-btn').click());
  await page.waitForTimeout(1200);
  const db = await page.evaluate(() => window.__db.academias.map(a => ({ id: a.id, acesso: a.acesso, pol: a.politica })));
  const a1 = db.find(a => a.id === 'a1'), a2 = db.find(a => a.id === 'a2');
  ok(a1.acesso.padronizadoEm && a1.acesso.fachada === 'Portão preto, ao lado do hotel.', 'lote padroniza quem tem texto (a1)');
  ok(!a1.acesso.estacionamento, 'lote: com vaga própria, não grava modelo de estacionamento');
  ok(a1.pol.aula.foraDoPrazo === 'Perde a aula.' && a1.pol.locacao.foraDoPrazo === 'Cobra metade.', 'lote: regras separadas continuam separadas');
  ok(!a2.acesso.padronizadoEm, 'lote pula academia sem texto nenhum (a2)');
  const pedidos = await page.evaluate(() => window.__iaPedidos.length);
  ok(pedidos === 1, 'lote chama a IA só para quem precisa — ' + pedidos);
  await browser.close();
})();
