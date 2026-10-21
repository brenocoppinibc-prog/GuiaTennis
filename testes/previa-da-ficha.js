// Pedido do Breno em 09/10/2026: "quero que no final do cadastro consiga ver
// uma prévia da ficha com as informações preenchidas e com opção de editar ou
// confirmar". Desde 13/10/2026 ("deixe uma prévia de como vai ficar mesmo,
// como se já estivesse e podendo editar, mas de forma limpa"): a ficha no
// desenho da página da academia, com um lápis pequeno em cada parte, "+
// Adicionar…" no que está vazio; embaixo, "Editar" e "Confirmar". Desde
// 21/10/2026, a prévia mostra tudo o que foi preenchido, sem nada do plano
// (o que ele esconde vem depois de confirmar), e o lápis leva à parte com um
// "Confirmar" verde que volta para a revisão.
const { abrir, ok, irParte } = require('./harness');

const texto = (page, sel) => page.evaluate((sel) => (document.querySelector(sel)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const bloco = (page, id) => texto(page, `.reg-previa [data-previa="${id}"]`);
const rodape = (page) => page.evaluate(() => [...document.querySelectorAll('.reg-rodape-dir .cta-btn')].map(b => b.innerText.trim() + (b.classList.contains('cta-primary') ? '*' : '')).join(' | '));

(async () => {
  // ---- edição no Básico ----
  let t;
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha' });
  await page.waitForTimeout(400);
  await page.click('.editar-academia');
  await page.waitForTimeout(400);
  await page.evaluate(() => { Object.assign(window.__form, { instagram: '@soaula', priceAula: '120' }); window.__form.amenities.push('wifi', 'vestiario', 'loja'); });
  await irParte(page, 'revisar');
  ok((await texto(page, '.reg-titulo')) === 'Confira a prévia da ficha' && await page.isVisible('#reg-previa'), 'a última parte abre com a prévia da ficha');
  ok((await texto(page, '.reg-porque')).includes('Toque no lápis para mudar uma parte') && !(await page.$('.reg-previa-topo')), 'sem a caixa de explicação: só o lápis, dito embaixo do título');
  const blocos = await page.evaluate(() => [...document.querySelectorAll('.reg-previa [data-previa]')].map(b => b.dataset.previa).join());
  ok(blocos === 'fotos,dados,horario,precos,quadras,cancelamento,chegada,contato', 'as partes da ficha, na ordem da página da academia — ' + blocos);
  ok((await bloco(page, 'fotos')) === 'Adicionar fotos' && await page.evaluate(() => document.querySelector('.reg-previa-mais[data-previa="fotos"]')?.tagName === 'BUTTON'), 'sem foto: só "+ Adicionar fotos", no lugar da galeria');
  t = await page.evaluate(() => ({ lapis: document.querySelectorAll('.reg-previa .reg-previa-lapis').length, titulos: [...document.querySelectorAll('.reg-previa .sec-title')].map(h => h.innerText).join(' | '), maiusculas: !!document.querySelector('.reg-previa-h'), botoes: [...document.querySelectorAll('.reg-previa button')].filter(b => /Editar/.test(b.innerText)).length }));
  ok(t.lapis === 7 && t.titulos === 'Sobre a academia | Escolha o que você quer | Estrutura | Cancelamento e reposição | Como chegar' && !t.maiusculas && t.botoes === 0,
    'como na ficha: os mesmos títulos e um lápis pequeno por parte, sem rótulo em maiúsculas nem botão "Editar" — ' + JSON.stringify(t));
  ok((await bloco(page, 'dados')).startsWith('Só Aula Tennis') && await page.evaluate(() => !!document.querySelector('.reg-previa [data-previa="dados"] .selo-confirmada:not(.selo-premium)')) && (await bloco(page, 'dados')).includes('Rua A, 1 - Pinheiros, São Paulo'),
    'nome com o selo e o endereço — ' + await bloco(page, 'dados'));
  ok((await bloco(page, 'horario')).includes('Segunda a sexta') && (await bloco(page, 'horario')).includes('6h às 22h'), 'o horário como na ficha');
  ok((await bloco(page, 'precos')).includes('R$ 120') && (await bloco(page, 'precos')).includes('Chamar no WhatsApp'), 'o preço que acabou de digitar e o botão do WhatsApp');
  const estrutura = await bloco(page, 'quadras');
  ok(estrutura.includes('2x Saibro coberta') && estrutura.includes('Vestiário') && estrutura.includes('Loja de materiais') && !estrutura.includes('de fora'), 'a estrutura com todas as comodidades marcadas, sem o corte do plano — ' + estrutura);
  ok((await bloco(page, 'cancelamento')).length > 30 && !(await bloco(page, 'cancelamento')).includes('plano') && (await bloco(page, 'chegada')).includes('Portão preto'), 'cancelamento e como chegar aparecem como foram preenchidos');
  ok((await bloco(page, 'contato')).includes('Chamar no WhatsApp') && (await bloco(page, 'contato')).includes('@soaula'), 'contato: o WhatsApp e o Instagram');
  ok(!/\bplano\b/i.test(await texto(page, '#reg-previa')), 'a prévia não fala de plano (21/10/2026: "tire o que aparecer de planos no cadastro")');
  ok(await page.evaluate(() => [...document.querySelectorAll('.reg-previa-conteudo')].every(x => x.inert) && !document.querySelector('.reg-previa a[href]')), 'a prévia é só para ver: nenhum botão nem link de verdade');
  ok((await rodape(page)) === 'Editar | Confirmar e salvar*' && await page.isVisible('#reg-voltar'), 'embaixo: "Editar" e "Confirmar e salvar", em destaque — ' + await rodape(page));
  ok(!(await page.$('.reg-revisao')), 'sem a lista "Partes da ficha" embaixo da prévia (as abas e os lápis levam às partes)');

  // O lápis de uma parte leva a ela; o "Editar" de baixo, ao começo.
  await page.click('.reg-previa [data-previa="precos"] .reg-previa-lapis');
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => document.querySelector('#register-overlay .reg-passo')?.dataset.passo === 'precos'), '"Editar" no bloco do preço abre a parte do preço');
  // 21/10/2026: "aparecer o botão verde embaixo confirmar e já voltar para a revisão".
  ok((await rodape(page)) === 'Confirmar*' && !(await page.$('#reg-voltar')), 'vindo do lápis, embaixo só o "Confirmar" verde — ' + await rodape(page));
  await page.fill('#f-price-aula', '150');
  await page.click('#reg-confirmar-revisao');
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => regPassoAtual().passo.id === 'revisar') && (await bloco(page, 'precos')).includes('R$ 150'), '"Confirmar" volta para a revisão, que já mostra o que mudou');
  await page.click('.reg-previa [data-previa="horario"] .reg-previa-lapis');
  await page.waitForTimeout(200);
  await page.click('.reg-secoes [data-reg-passo="1"]');
  await page.waitForTimeout(200);
  ok(await page.isVisible('#reg-confirmar-revisao'), 'trocando de aba no meio, o "Confirmar" continua levando de volta');
  await page.click('#reg-confirmar-revisao');
  await page.waitForTimeout(200);
  await page.click('#reg-editar');
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => document.querySelector('#register-overlay .reg-passo')?.dataset.passo === 'dados'), '"Editar" de baixo volta para a primeira parte');
  ok((await rodape(page)) === 'Revisar e salvar | Continuar*' && await page.isVisible('#register-overlay .reg-passo'), 'e segue parte por parte, com "Continuar" (sem o atalho da revisão) — ' + await rodape(page));
  await irParte(page, 'revisar');
  await page.click('#register-submit');
  await page.waitForTimeout(500);
  ok((await texto(page, '#reg-erro .reg-titulo')).endsWith('partes não vão aparecer na ficha'), '"Confirmar e salvar" segue: como o Básico esconde coisas, vem o aviso com os planos — ' + await texto(page, '#reg-erro .reg-titulo'));
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
  ok(!(await texto(page, '#reg-previa')).includes('fica de fora') && !(await texto(page, '#reg-previa')).includes('ficam de fora'), 'no Premium, nada fica de fora');
  ok(await page.evaluate(() => !!document.querySelector('.reg-previa [data-previa="dados"] .selo-premium')), 'o nome com o selo dourado do Premium');
  ok((await bloco(page, 'cancelamento')).length > 10 && !(await bloco(page, 'cancelamento')).includes('preenchido, mas') && (await bloco(page, 'chegada')).includes('Portão preto') && (await bloco(page, 'contato')).includes('@soaula'),
    'cancelamento, como chegar e o Instagram aparecem');
  await browser.close();

  // ---- cadastro novo: pelo site (sem conta) e pelo admin ----
  ({ browser, page } = await abrir({}));
  await page.evaluate(() => { window.__form = null; state.showRegister = true; state.registerStatus = 'idle'; render(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { Object.assign(window.__form, { name: 'Clube Novo', address: 'Rua C', numero: '3', bairro: 'Lapa', cidade: 'São Paulo', phone: '11977770000', modalidades: ['locacao'], quadras: { rapida_descoberta: 2 } }); render(); });
  await irParte(page, 'revisar');
  ok((await bloco(page, 'dados')).startsWith('Clube Novo') && !(await page.evaluate(() => !!document.querySelector('.reg-previa [data-previa="dados"] .selo-confirmada'))), 'pedido pelo site: a prévia mostra a ficha nova, sem selo (ainda não é confirmada pela academia)');
  ok((await rodape(page)) === 'Editar | Confirmar e enviar*', 'e o botão é "Confirmar e enviar" — ' + await rodape(page));
  await browser.close();
  // Sem a lista das partes, quem tenta confirmar sem o obrigatório vê o que falta ali mesmo.
  ({ browser, page } = await abrir({}));
  await page.evaluate(() => { window.__form = null; state.showRegister = true; state.registerStatus = 'idle'; render(); });
  await page.waitForTimeout(300);
  await irParte(page, 'revisar');
  await page.click('#register-submit');
  await page.waitForTimeout(300);
  t = await texto(page, '#reg-falta-caixa');
  ok(t.startsWith('Para concluir, falta preencher: Nome e endereço*') && await page.evaluate(() => document.querySelector('#register-overlay .reg-passo')?.dataset.passo === 'revisar' || !!document.getElementById('reg-falta-caixa')),
    'confirmar sem o obrigatório: o que falta aparece em cima dos botões — ' + t.slice(0, 70));
  await browser.close();
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(() => { window.__form = null; state.showRegister = true; state.registerStatus = 'idle'; render(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__form.name = 'Quadra do Admin'; render(); });
  await irParte(page, 'revisar');
  ok((await bloco(page, 'dados')).startsWith('Quadra do Admin') && (await rodape(page)) === 'Editar | Confirmar e publicar*' && !(await page.$('.reg-plano-aviso')), 'o admin vê a prévia e "Confirmar e publicar" — ' + await rodape(page));
  await browser.close();
})();
