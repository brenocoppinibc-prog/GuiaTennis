// Pedido do Breno em 09/10/2026: "quero que no final do cadastro consiga ver
// uma prévia da ficha com as informações preenchidas e com opção de editar ou
// confirmar". Na última parte, a ficha montada com o que foi preenchido
// (cortada pelo plano), um "Editar" em cada bloco e, embaixo, "Editar" e
// "Confirmar".
const { abrir, ok, irParte } = require('./harness');

const texto = (page, sel) => page.evaluate((sel) => (document.querySelector(sel)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const bloco = (page, id) => texto(page, `.reg-previa-bloco[data-previa="${id}"] .reg-previa-conteudo`);
const rodape = (page) => page.evaluate(() => [...document.querySelectorAll('.reg-rodape-dir .cta-btn')].map(b => b.innerText.trim() + (b.classList.contains('cta-primary') ? '*' : '')).join(' | '));

(async () => {
  // ---- edição no Básico ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha' });
  await page.waitForTimeout(400);
  await page.click('.editar-academia');
  await page.waitForTimeout(400);
  await page.evaluate(() => { Object.assign(window.__form, { instagram: '@soaula', priceAula: '120' }); window.__form.amenities.push('wifi', 'vestiario', 'loja'); });
  await irParte(page, 'revisar');
  ok((await texto(page, '.reg-titulo')) === 'Confira a prévia da ficha' && await page.isVisible('#reg-previa'), 'a última parte abre com a prévia da ficha');
  ok((await texto(page, '.reg-previa-topo')).includes('Como os jogadores vão ver, no plano Básico'), 'a prévia diz que é como os jogadores veem, no plano da academia');
  const blocos = await page.evaluate(() => [...document.querySelectorAll('.reg-previa-bloco')].map(b => b.dataset.previa).join());
  ok(blocos === 'fotos,dados,horario,precos,quadras,cancelamento,chegada,contato', 'os blocos da ficha, na ordem da página da academia — ' + blocos);
  ok((await bloco(page, 'fotos')) === 'Sem foto: a ficha começa direto no nome.', 'sem foto: avisa que a ficha começa no nome');
  ok((await bloco(page, 'dados')).startsWith('Só Aula Tennis') && await page.evaluate(() => !!document.querySelector('.reg-previa-bloco[data-previa="dados"] .selo-confirmada:not(.selo-premium)')) && (await bloco(page, 'dados')).includes('Rua A, 1 - Pinheiros, São Paulo'),
    'nome com o selo e o endereço — ' + await bloco(page, 'dados'));
  ok((await bloco(page, 'horario')).includes('Segunda a sexta') && (await bloco(page, 'horario')).includes('6h às 22h'), 'o horário como na ficha');
  ok((await bloco(page, 'precos')).includes('R$ 120') && (await bloco(page, 'precos')).includes('Chamar no WhatsApp'), 'o preço que acabou de digitar e o botão do WhatsApp');
  const estrutura = await bloco(page, 'quadras');
  ok(estrutura.includes('2x Saibro coberta') && estrutura.includes('2 comodidades não aparecem no plano Básico') && !estrutura.includes('Vestiário'), 'a estrutura cortada pelo plano, dizendo quantas comodidades ficam de fora — ' + estrutura);
  ok((await bloco(page, 'cancelamento')) === 'Preenchido, mas não aparece no plano Básico.' && (await bloco(page, 'chegada')) === 'Preenchido, mas não aparece no plano Básico.', 'cancelamento e como chegar: preenchidos, mas fora do Básico');
  ok((await bloco(page, 'contato')).includes('Chamar no WhatsApp') && (await bloco(page, 'contato')).includes('O Instagram não aparece no plano Básico') && !(await bloco(page, 'contato')).includes('@soaula'), 'contato: o WhatsApp, e o Instagram fora do Básico');
  ok(await page.evaluate(() => [...document.querySelectorAll('.reg-previa-conteudo')].every(x => x.inert) && !document.querySelector('.reg-previa a[href]')), 'a prévia é só para ver: nenhum botão nem link de verdade');
  ok((await rodape(page)) === 'Editar | Confirmar e salvar*' && await page.isVisible('#reg-voltar'), 'embaixo: "Editar" e "Confirmar e salvar", em destaque — ' + await rodape(page));
  ok(await page.isVisible('.reg-revisao') && (await page.evaluate(() => document.querySelectorAll('.reg-revisao .reg-rev-linha').length)) === 8, 'a lista das partes continua embaixo da prévia');

  // "Editar" de um bloco leva à parte; o "Editar" de baixo, ao começo.
  await page.click('.reg-previa-bloco[data-previa="precos"] .reg-previa-editar');
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => document.querySelector('#register-overlay .reg-passo')?.dataset.passo === 'precos'), '"Editar" no bloco do preço abre a parte do preço');
  await page.evaluate(() => { window.__form.priceAula = '150'; });
  await irParte(page, 'revisar');
  ok((await bloco(page, 'precos')).includes('R$ 150'), 'voltando à revisão, a prévia já mostra o que mudou');
  await page.click('#reg-editar');
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => document.querySelector('#register-overlay .reg-passo')?.dataset.passo === 'dados'), '"Editar" de baixo volta para a primeira parte');
  await irParte(page, 'revisar');
  await page.click('#register-submit');
  await page.waitForTimeout(500);
  ok((await texto(page, '#register-overlay')).includes('Quase lá: escolha o plano'), '"Confirmar e salvar" segue: como o Básico esconde coisas, vem a escolha do plano');
  await page.click('.reg-plano-basico');
  await page.waitForTimeout(900);
  ok(await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').price_aula === '150' && document.getElementById('register-overlay').innerText.includes('Alterações salvas')), 'e salva a ficha');
  await browser.close();

  // ---- Premium: tudo aparece, com o selo dourado ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha', premium: ['a1'] }));
  await page.waitForTimeout(400);
  await page.click('.editar-academia');
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.__form.instagram = '@soaula'; });
  await irParte(page, 'revisar');
  ok((await texto(page, '.reg-previa-topo')).startsWith('Prévia da ficha Como os jogadores vão ver.') && !(await texto(page, '#reg-previa')).includes('não aparece'), 'no Premium, nada fica de fora');
  ok(await page.evaluate(() => !!document.querySelector('.reg-previa-bloco[data-previa="dados"] .selo-premium')), 'o nome com o selo dourado do Premium');
  ok((await bloco(page, 'cancelamento')).length > 10 && !(await bloco(page, 'cancelamento')).includes('Preenchido, mas') && (await bloco(page, 'chegada')).includes('Portão preto') && (await bloco(page, 'contato')).includes('@soaula'),
    'cancelamento, como chegar e o Instagram aparecem');
  await browser.close();

  // ---- cadastro novo: pelo site (sem conta) e pelo admin ----
  ({ browser, page } = await abrir({}));
  await page.evaluate(() => { window.__form = null; state.showRegister = true; state.registerStatus = 'idle'; render(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { Object.assign(window.__form, { name: 'Clube Novo', address: 'Rua C', numero: '3', bairro: 'Lapa', cidade: 'São Paulo', phone: '11977770000', modalidades: ['locacao'], quadras: { rapida_descoberta: 2 } }); render(); });
  await irParte(page, 'revisar');
  ok((await bloco(page, 'dados')).startsWith('Clube Novo') && !(await page.evaluate(() => !!document.querySelector('.reg-previa-bloco[data-previa="dados"] .selo-confirmada'))), 'pedido pelo site: a prévia mostra a ficha nova, sem selo (ainda não é confirmada pela academia)');
  ok((await rodape(page)) === 'Editar | Confirmar e enviar*', 'e o botão é "Confirmar e enviar" — ' + await rodape(page));
  await browser.close();
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(() => { window.__form = null; state.showRegister = true; state.registerStatus = 'idle'; render(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__form.name = 'Quadra do Admin'; render(); });
  await irParte(page, 'revisar');
  ok((await bloco(page, 'dados')).startsWith('Quadra do Admin') && (await rodape(page)) === 'Editar | Confirmar e publicar*' && !(await page.$('.reg-plano-aviso')), 'o admin vê a prévia e "Confirmar e publicar" — ' + await rodape(page));
  await browser.close();
})();
