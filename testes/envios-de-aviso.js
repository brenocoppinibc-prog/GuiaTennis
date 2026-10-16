// Pedido do Breno em 14/10/2026 (regra 104): o Completo e o Premium compram
// envios para mandar avisos por e-mail aos jogadores (o Premium paga menos);
// só o Premium publica promoções.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);
const dia = (n) => new Date(Date.now() + n * 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

(async () => {
  // ---- Básico: Avisos trancado ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/avisos' });
  await page.waitForTimeout(400);
  ok((await texto(page, '#parceiros .pc-main')).includes('Disponível no plano Completo') && !(await page.$('#pc-aviso-titulo')), 'Básico: Avisos por e-mail trancado, "Disponível no plano Completo"');
  ok(await page.evaluate(() => PC_MENU_LOGADO.some(x => x.aba === 'avisos' && x.t === 'Avisos por e-mail')), '"Avisos por e-mail" no menu do Parceiros');
  await browser.close();

  // ---- Completo sem envios: não manda; com envios: manda e gasta 1 ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/avisos', completo: ['a1'] }));
  await page.waitForTimeout(400);
  let corpo = await texto(page, '#parceiros .pc-main');
  const link = await page.evaluate(() => document.querySelector('#pc-saldo a')?.getAttribute('href') || '');
  ok(corpo.includes('Nenhum envio disponível') && decodeURIComponent(link).includes('comprar envios de aviso'), 'Completo sem envios: o saldo diz e "Comprar envios" abre o WhatsApp');
  // Passo a passo (15/10/2026): primeiro escrever, sem a prévia empilhada; depois conferir e mandar.
  ok(!(await page.$('#pc-email-previa')) && !(await page.$('#pc-aviso-enviar')) && await page.$('#pc-aviso-revisar') && !(await page.$('.pc-progresso-etapas, .trilha')),
    'primeiro passo: só escrever, sem a prévia, sem o botão de mandar e sem barra de etapas');
  await page.click('#pc-aviso-revisar');
  await page.waitForTimeout(150);
  ok((await texto(page, '#parceiros .form-error')).includes('Escreva o assunto') && await page.$('#pc-aviso-titulo'), 'sem assunto, não passa para a prévia');
  await page.fill('#pc-aviso-titulo', 'Primeira aula grátis');
  await page.fill('#pc-aviso-mensagem', 'Para quem nunca fez aula aqui, de segunda a sexta.');
  await page.click('#pc-aviso-revisar');
  await page.waitForTimeout(150);
  let previa = await texto(page, '#pc-email-previa');
  ok(!(await page.$('#pc-aviso-titulo')) && (await texto(page, '#pc-aviso-revisao')).includes('Confira antes de mandar') && previa.includes('Assunto: Só Aula Tennis: Primeira aula grátis') && previa.includes('mandou um aviso'),
    'segundo passo: a prévia do e-mail, no lugar do formulário');
  ok(await page.isDisabled('#pc-aviso-enviar'), 'Completo sem envios: o botão de mandar fica desligado');
  // Sem envios, o aviso fica em vermelho, quase um erro (15/10/2026).
  ok(await page.evaluate(() => { const b = document.querySelector('.pc-aviso-bloqueio.form-error'); if (!b || !b.innerText.includes('Sem envios, o aviso não sai')) return false; const [r, g] = getComputedStyle(b).color.match(/\d+/g).map(Number); return r > 140 && g < 90; }),
    'sem envios: o aviso em vermelho, como um erro');
  await page.click('#pc-aviso-editar');
  await page.waitForTimeout(150);
  ok((await page.inputValue('#pc-aviso-titulo')) === 'Primeira aula grátis', '"Editar" volta ao texto, com o que foi escrito');
  await page.click('[data-aviso-tipo="promocao"]');
  await page.waitForTimeout(150);
  await page.click('#pc-aviso-revisar');
  await page.waitForTimeout(150);
  previa = await texto(page, '#pc-email-previa');
  ok(previa.includes('Assunto: Promoção da Só Aula Tennis: Primeira aula grátis') && previa.includes('mandou uma promoção') && (await texto(page, '#pc-aviso-enviar')) === 'Mandar a promoção',
    'tipo "Promoção": a prévia e o botão mudam — ' + previa.split('\n')[1]);
  ok(await page.evaluate(() => promocoesLiberadas(minhaAcademia()) === false), 'o Completo não publica promoções');
  await page.evaluate(async () => { window.__db.academias.find(a => a.id === 'a1').envios_de_aviso = 2; await carregarAvisosDaAcademia(); });
  await page.waitForTimeout(200);
  ok((await texto(page, '#pc-saldo')).includes('2 envios disponíveis') && !(await page.isDisabled('#pc-aviso-enviar')), 'com 2 envios, o saldo aparece e o botão liga');
  await page.evaluate(() => { window.__promoAviso = { aviso: 'enviado', avisados: 9 }; });
  await page.click('#pc-aviso-editar');
  await page.waitForTimeout(150);
  await page.click('[data-aviso-tipo="aviso"]');
  await page.waitForTimeout(150);
  await page.fill('#pc-aviso-titulo', 'Turma nova aos sábados');
  await page.fill('#pc-aviso-mensagem', 'Abrimos uma turma para iniciantes aos sábados, às 9h.');
  await page.click('#pc-aviso-revisar');
  await page.waitForTimeout(150);
  await page.click('#pc-aviso-enviar');
  await page.waitForTimeout(400);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Aviso mandado: chega a 9 jogadores') && corpo.includes('1 envio disponível') && corpo.includes('chegou a 9 jogadores') && await page.$('#pc-aviso-titulo'), 'manda o aviso, gasta 1 envio, mostra na lista e volta a um aviso novo');
  ok(await page.evaluate(() => (window.__rpcs.find(r => r.nome === 'enviar_aviso_da_academia') || {}).args.p_tipo === 'aviso'), 'o tipo vai junto para o banco');
  await page.fill('#pc-aviso-titulo', 'Outro aviso');
  await page.fill('#pc-aviso-mensagem', 'Mais um aviso para os jogadores.');
  await page.click('#pc-aviso-revisar');
  await page.waitForTimeout(150);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(await page.isDisabled('#pc-aviso-enviar') && corpo.includes('já mandou um aviso nesta semana'), 'no máximo 1 aviso por semana: o botão desliga');
  await browser.close();

  // ---- "Chamar no WhatsApp" do e-mail: passa pela ficha, conta o contato e abre o WhatsApp com o assunto ----
  ({ browser, page } = await abrir({ q: 'academia/quadra-locacao-a2' }));
  await page.waitForTimeout(400);
  await page.route('https://wa.me/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>WhatsApp</p>' }));
  await page.evaluate(() => { history.replaceState(null, '', '/academia/quadra-locacao-a2?chamar=whatsapp&assunto=' + encodeURIComponent('o aviso "Turma nova aos sábados"') + '&utm_source=Email-aviso-da-academia'); aplicarLink(lerLink()); render(); });
  await page.waitForTimeout(250);
  const antes = await page.evaluate(() => ({ clique: (window.__cliques || []).some(c => c.tipo === 'whatsapp' && c.academia_id === 'a2'), busca: location.search }));
  ok(antes.clique && !antes.busca.includes('chamar=') && antes.busca.includes('utm_source=Email-aviso-da-academia'), 'o link do e-mail conta o contato pelo WhatsApp e sai do endereço — ' + antes.busca);
  await page.waitForTimeout(800);
  const destino = decodeURIComponent(page.url());
  ok(destino.startsWith('https://wa.me/55') && destino.includes('queria saber sobre o aviso "Turma nova aos sábados"'), 'e abre o WhatsApp da academia com a mensagem sobre o assunto — ' + destino);
  await browser.close();

  // ---- Premium: a caixinha da promoção mostra o saldo; sem envios, pede para comprar ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes', premium: ['a1'], envios: { a1: 3 } }));
  await page.waitForTimeout(400);
  ok((await texto(page, '.pc-promo-avisar')).includes('usa 1 envio · 3 envios disponíveis') && await page.isChecked('#pc-promo-avisar'), 'Premium: "Avisar por e-mail" mostra que usa 1 envio e o saldo');
  ok(!(await page.$('#pc-promo-previa')) && !(await page.$('#pc-promo-salvar')), 'promoção: o primeiro passo é só escrever');
  await page.fill('#pc-promo-titulo', 'Aula experimental');
  await page.uncheck('#pc-promo-avisar');
  await page.click('#pc-promo-revisar');
  await page.waitForTimeout(150);
  ok(await page.$('#pc-promo-previa') && !(await page.$('#pc-email-previa')) && !(await page.$('#pc-promo-titulo')), 'sem avisar por e-mail, o segundo passo só mostra a prévia na ficha');
  await page.click('#pc-promo-editar');
  await page.waitForTimeout(150);
  await page.check('#pc-promo-avisar');
  await page.evaluate(() => { window.__promoAviso = { aviso: 'enviado', avisados: 4 }; });
  await page.fill('#pc-promo-titulo', 'Aula experimental grátis');
  await page.fill('#pc-promo-ate', dia(15));
  await page.click('#pc-promo-revisar');
  await page.waitForTimeout(150);
  let previas = await page.evaluate(() => ({ ficha: document.getElementById('pc-promo-previa')?.innerText || '', email: document.getElementById('pc-email-previa')?.innerText || '' }));
  ok(previas.ficha.includes('Prévia na ficha e na busca') && previas.ficha.includes('Aula experimental grátis') && previas.email.includes('Promoção na Só Aula Tennis') && previas.email.includes('está com uma promoção'),
    'promoção: no segundo passo, a prévia na ficha e a do e-mail');
  await page.click('#pc-promo-salvar');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').envios_de_aviso === 2) && (await texto(page, '#parceiros .pc-main')).includes('4 jogadores'), 'a promoção avisada gasta 1 envio');
  await browser.close();
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes', premium: ['a1'] }));
  await page.waitForTimeout(400);
  ok(!(await page.$('#pc-promo-avisar')) && (await texto(page, '.pc-promo-avisar')).includes('compre envios'), 'Premium sem envios: no lugar da caixinha, "compre envios"');
  await browser.close();

  // ---- Planos e painel do admin ----
  ({ browser, page } = await abrir({ q: 'parceiros/planos' }));
  await page.waitForTimeout(300);
  const planos = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.pc-plano')].map(p => [p.querySelector('.pc-plano-n')?.innerText.trim(), [...p.querySelectorAll('li:not(.nao)')].map(l => l.innerText).join(' | ')])));
  ok(planos['Completo'].includes('Avisos e promoções por e-mail') && !planos['Completo'].includes('Promoções na ficha') && planos['Premium'].includes('Promoções na ficha'), 'Planos: avisos por envio no Completo e no Premium; promoções só no Premium');
  await browser.close();
  ({ browser, page } = await abrir({ admin: true, q: 'admin', completo: ['a1'], envios: { a1: 1 }, w: 1280 }));
  await page.waitForTimeout(500);
  await page.click('.adm-nav [data-adm-aba="academias"]');
  await page.waitForTimeout(300);
  await page.click('[data-adm-academia="a1"]');
  await page.waitForTimeout(500);
  ok((await texto(page, '.adm-acad.aberta [data-envios-de="a1"]')) === '1', 'o admin vê o saldo de envios da academia');
  await page.click('.adm-acad.aberta [data-envios-somar="a1"][data-q="5"]');
  await page.waitForTimeout(400);
  ok((await texto(page, '.adm-acad.aberta [data-envios-de="a1"]')) === '6' && await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').envios_de_aviso === 6), 'o admin soma 5 envios depois do Pix');
  await browser.close();
})();
