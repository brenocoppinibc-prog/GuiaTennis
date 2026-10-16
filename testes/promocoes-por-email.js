// Promoções na ficha e por e-mail (pedido do Breno em 16/10/2026: "quero
// tirar tudo sobre avisos, unifique tudo como promoção, e uma parte para
// promoção na ficha e outro por email"). Por e-mail: Completo e Premium,
// com envios comprados antes (regra 104); na ficha: só o Premium.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);
const dia = (n) => new Date(Date.now() + n * 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

(async () => {
  // ---- O menu: só "Promoções", com as partes Na ficha e Por e-mail ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/avisos' });
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => !PC_MENU_LOGADO.some(x => /aviso/i.test(x.t) || x.aba === 'avisos') && PC_MENU_LOGADO.some(x => x.aba === 'promocoes' && x.t === 'Promoções')), 'o menu do Parceiros tem só "Promoções", sem "Avisos"');
  ok(await page.evaluate(() => state.parceirosAba === 'promocoes-email' && location.pathname.endsWith('/promocoes-email')), 'o link antigo /parceiros/avisos abre Promoções › Por e-mail');
  const abas = await page.evaluate(() => [...document.querySelectorAll('.pc-promo-partes [role="tab"]')].map(a => `${a.innerText.trim()}${a.classList.contains('on') ? '*' : ''}`).join('|'));
  ok(abas === 'Na ficha|Por e-mail*', 'as duas partes no alto, com Por e-mail marcada — ' + abas);
  ok(await page.evaluate(() => document.querySelector('.pc-nav-i.on')?.dataset.pc === 'promocoes'), 'no menu de cima, "Promoções" fica marcada também na parte Por e-mail');
  ok((await texto(page, '#parceiros .pc-main')).includes('Disponível no plano Completo') && !(await page.$('#pc-email-titulo')), 'Básico: Por e-mail trancado, "Disponível no plano Completo"');
  await page.click('.pc-promo-partes [data-pc="promocoes"]');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => state.parceirosAba === 'promocoes') && (await texto(page, '#parceiros .pc-main')).includes('Disponível no plano Premium'), 'Básico: Na ficha trancado, "Disponível no plano Premium"');
  ok(!/aviso/i.test(await texto(page, '#parceiros .pc-main')), 'a página de promoções não fala em "aviso"');
  await browser.close();

  // ---- Completo: Por e-mail em dois passos, sem "Aviso"/"Promoção" para escolher ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes-email', completo: ['a1'] }));
  await page.waitForTimeout(400);
  let corpo = await texto(page, '#parceiros .pc-main');
  const link = await page.getAttribute('#pc-saldo a', 'href');
  ok(corpo.includes('Nenhum envio disponível') && decodeURIComponent(link).includes('comprar envios de promoção por e-mail'), 'Completo sem envios: o saldo diz e "Comprar envios" abre o WhatsApp');
  ok(!(await page.$('[data-aviso-tipo]')) && !/aviso/i.test(corpo), 'Por e-mail: sem a escolha "Aviso"/"Promoção" e sem a palavra "aviso"');
  ok(!(await page.$('#pc-email-previa')) && !(await page.$('#pc-email-enviar')) && await page.$('#pc-email-revisar') && !(await page.$('.pc-progresso-etapas, .trilha')),
    'primeiro passo: só escrever, com "Ver como fica o e-mail", sem barra de etapas');
  ok(!(await page.$('.pc-email-da-ficha')), 'no Completo, sem "Usar uma promoção da ficha"');
  await page.click('#pc-email-revisar');
  await page.waitForTimeout(150);
  ok((await texto(page, '#parceiros .form-error')).includes('Escreva a promoção') && await page.$('#pc-email-titulo'), 'sem a promoção escrita, não passa para a prévia');
  await page.fill('#pc-email-titulo', 'Primeira aula grátis');
  await page.fill('#pc-email-mensagem', 'Para quem nunca fez aula aqui, de segunda a sexta.');
  await page.click('#pc-email-revisar');
  await page.waitForTimeout(150);
  let previa = await texto(page, '#pc-email-previa');
  ok(!(await page.$('#pc-email-titulo')) && (await texto(page, '#pc-email-revisao')).includes('Confira antes de mandar') && previa.includes('Assunto: Promoção da Só Aula Tennis: Primeira aula grátis') && previa.includes('mandou uma promoção') && previa.includes('pediu promoções') && !/aviso/i.test(previa),
    'segundo passo: a prévia do e-mail como promoção — ' + previa.slice(0, 80));
  ok(await page.isDisabled('#pc-email-enviar') && (await texto(page, '#pc-email-enviar')) === 'Mandar a promoção', 'Completo sem envios: "Mandar a promoção" fica desligado');
  ok(await page.evaluate(() => { const b = document.querySelector('.pc-email-bloqueio.form-error'); if (!b || !b.innerText.includes('Sem envios, a promoção não sai')) return false; const [r, g] = getComputedStyle(b).color.match(/\d+/g).map(Number); return r > 140 && g < 90; }),
    'sem envios: o recado em vermelho, como um erro');
  await page.click('#pc-email-editar');
  await page.waitForTimeout(150);
  ok((await page.inputValue('#pc-email-titulo')) === 'Primeira aula grátis', '"Editar a promoção" volta ao texto, com o que foi escrito');
  await page.evaluate(async () => { window.__db.academias.find(a => a.id === 'a1').envios_de_aviso = 2; await carregarPromocoesPorEmail(); });
  await page.waitForTimeout(150);
  await page.click('#pc-email-revisar');
  await page.waitForTimeout(150);
  ok((await texto(page, '#pc-saldo')).includes('2 envios disponíveis') && !(await page.isDisabled('#pc-email-enviar')), 'com 2 envios, o saldo aparece e o botão liga');
  await page.evaluate(() => { window.__promoAviso = { aviso: 'enviado', avisados: 9 }; });
  await page.click('#pc-email-enviar');
  await page.waitForTimeout(400);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Promoção mandada: chega a 9 jogadores') && corpo.includes('1 envio disponível') && corpo.includes('Já mandadas') && corpo.includes('chegou a 9 jogadores') && await page.$('#pc-email-titulo'), 'manda a promoção, gasta 1 envio, mostra em "Já mandadas" e volta a uma nova');
  ok(await page.evaluate(() => (window.__rpcs.find(r => r.nome === 'enviar_aviso_da_academia') || {}).args.p_tipo === 'promocao'), 'vai para o banco como promoção');
  await page.fill('#pc-email-titulo', 'Pacote de aulas');
  await page.fill('#pc-email-mensagem', 'Dez aulas pelo preço de oito.');
  await page.click('#pc-email-revisar');
  await page.waitForTimeout(150);
  ok(await page.isDisabled('#pc-email-enviar') && (await texto(page, '#parceiros .pc-main')).includes('já mandou uma promoção por e-mail nesta semana'), 'no máximo 1 por semana: o botão desliga');
  await page.click('.pc-promo-partes [data-pc="promocoes"]');
  await page.waitForTimeout(200);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Disponível no plano Premium') && corpo.includes('No Completo, a academia já manda promoções por e-mail'), 'Completo: Na ficha trancado, com o atalho para Por e-mail');
  await browser.close();

  // ---- "Chamar no WhatsApp" do e-mail: passa pela ficha, conta o contato e abre o WhatsApp com o assunto ----
  ({ browser, page } = await abrir({ q: 'academia/quadra-locacao-a2' }));
  await page.waitForTimeout(400);
  await page.route('https://wa.me/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>WhatsApp</p>' }));
  await page.evaluate(() => { history.replaceState(null, '', '/academia/quadra-locacao-a2?chamar=whatsapp&assunto=' + encodeURIComponent('a promoção "Primeira aula grátis"') + '&utm_source=Email-promocao-da-academia'); aplicarLink(lerLink()); render(); });
  await page.waitForTimeout(250);
  const antes = await page.evaluate(() => ({ clique: (window.__cliques || []).some(c => c.tipo === 'whatsapp' && c.academia_id === 'a2'), busca: location.search }));
  ok(antes.clique && !antes.busca.includes('chamar=') && antes.busca.includes('utm_source=Email-promocao-da-academia'), 'o link do e-mail conta o contato pelo WhatsApp e sai do endereço — ' + antes.busca);
  await page.waitForTimeout(800);
  const destino = decodeURIComponent(page.url());
  ok(destino.startsWith('https://wa.me/55') && destino.includes('queria saber sobre a promoção "Primeira aula grátis"'), 'e abre o WhatsApp da academia com a mensagem sobre a promoção — ' + destino);
  await browser.close();

  // ---- Premium: Na ficha não manda e-mail; "Mandar por e-mail" leva à outra parte com o texto pronto ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes', premium: ['a1'], envios: { a1: 3 } }));
  await page.waitForTimeout(400);
  ok(!(await page.$('#pc-promo-avisar')) && !(await page.$('.pc-promo-avisar')), 'Na ficha: sem a caixinha de avisar por e-mail');
  ok(!(await page.$('#pc-promo-previa')) && !(await page.$('#pc-promo-salvar')), 'Na ficha: o primeiro passo é só escrever');
  await page.fill('#pc-promo-titulo', 'Aula experimental grátis');
  await page.fill('#pc-promo-detalhes', 'Para quem nunca jogou aqui.');
  await page.fill('#pc-promo-ate', dia(15));
  await page.click('#pc-promo-revisar');
  await page.waitForTimeout(150);
  ok(await page.$('#pc-promo-previa') && !(await page.$('#pc-email-previa')) && (await texto(page, '#pc-promo-previa')).includes('Aula experimental grátis'), 'Na ficha: o segundo passo mostra só a prévia na ficha e na busca');
  await page.click('#pc-promo-salvar');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').envios_de_aviso === 3 && (window.__rpcs.find(r => r.nome === 'salvar_promocao') || {}).args.p_avisar === false), 'publicar na ficha não manda e-mail nem gasta envio');
  ok((await texto(page, '#parceiros .pc-main')).includes('Promoção publicada na ficha e na busca') && await page.$('[data-promo-por-email]'), 'a promoção publicada tem "Mandar por e-mail"');
  await page.click('[data-promo-por-email]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => state.parceirosAba === 'promocoes-email') && (await page.inputValue('#pc-email-titulo')) === 'Aula experimental grátis' && (await page.inputValue('#pc-email-mensagem')).startsWith('Para quem nunca jogou aqui. Válida até '),
    '"Mandar por e-mail" abre Por e-mail com a promoção e a validade');
  ok((await texto(page, '.pc-email-da-ficha')).includes('Aula experimental grátis'), 'no Premium, "Usar uma promoção da ficha" mostra as que estão valendo');
  await page.fill('#pc-email-titulo', '');
  await page.click('.pc-email-da-ficha [data-promo-email]');
  await page.waitForTimeout(150);
  ok((await page.inputValue('#pc-email-titulo')) === 'Aula experimental grátis', 'tocar numa promoção da ficha preenche o e-mail');
  await browser.close();

  // ---- Planos, conta do jogador e painel do admin ----
  ({ browser, page } = await abrir({ q: 'parceiros/planos' }));
  await page.waitForTimeout(300);
  const planos = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.pc-plano')].map(p => [p.querySelector('.pc-plano-n')?.innerText.trim(), [...p.querySelectorAll('li:not(.nao)')].map(l => l.innerText).join(' | ')])));
  ok(planos['Completo'].includes('Promoções por e-mail') && !planos['Completo'].includes('Promoções na ficha') && planos['Premium'].includes('Promoções na ficha') && !/aviso/i.test(planos['Completo'] + planos['Premium']),
    'Planos: promoções por e-mail no Completo e no Premium; na ficha, só no Premium; sem "aviso"');
  ok(await page.evaluate(() => { const f = perguntasParceiros().map(x => x.q).join(' | '); return f.includes('Como funcionam as promoções na ficha?') && f.includes('Como funcionam as promoções por e-mail?') && !/avisos por e-mail/i.test(f); }), 'Ajuda: as duas perguntas de promoções, sem "avisos por e-mail"');
  ok(await page.evaluate(() => AVISOS_JOGADOR.find(x => x.campo === 'promocoes').t === 'Promoções das academias favoritas e perto de você'), 'conta do jogador: "Promoções das academias favoritas e perto de você"');
  await browser.close();
  ({ browser, page } = await abrir({ admin: true, q: 'admin', completo: ['a1'], envios: { a1: 1 }, w: 1280 }));
  await page.waitForTimeout(500);
  await page.click('.adm-nav [data-adm-aba="academias"]');
  await page.waitForTimeout(300);
  await page.click('[data-adm-academia="a1"]');
  await page.waitForTimeout(500);
  ok((await texto(page, '.adm-acad.aberta .adm-envios')).startsWith('Envios por e-mail') && (await texto(page, '.adm-acad.aberta [data-envios-de="a1"]')) === '1', 'o admin vê "Envios por e-mail" da academia');
  await page.click('.adm-acad.aberta [data-envios-somar="a1"][data-q="5"]');
  await page.waitForTimeout(400);
  ok((await texto(page, '.adm-acad.aberta [data-envios-de="a1"]')) === '6' && await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').envios_de_aviso === 6), 'o admin soma 5 envios depois do Pix');
  await browser.close();
})();
