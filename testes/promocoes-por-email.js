// Promoções na ficha e por e-mail (pedido do Breno em 16/10/2026: "quero
// tirar tudo sobre avisos, unifique tudo como promoção, e uma parte para
// promoção na ficha e outro por email"). Desde 22/10/2026 (regra 147), o
// leilão por e-mail é só do Premium, e a promoção na ficha, do Completo e do
// Premium, paga por semana com os mesmos créditos.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);
const dia = (n) => new Date(Date.now() + n * 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

(async () => {
  // ---- O menu: só "Promoções", com as partes Na ficha e Por e-mail ----
  let corpo;
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/avisos' });
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => !PC_MENU_LOGADO.some(x => /aviso/i.test(x.t) || x.aba === 'avisos') && PC_MENU_LOGADO.some(x => x.aba === 'promocoes' && x.t === 'Promoções')), 'o menu do Parceiros tem só "Promoções", sem "Avisos"');
  ok(await page.evaluate(() => state.parceirosAba === 'promocoes-email' && location.pathname.endsWith('/promocoes-email')), 'o link antigo /parceiros/avisos abre Promoções › Por e-mail');
  const abas = await page.evaluate(() => [...document.querySelectorAll('.pc-promo-partes [role="tab"]')].map(a => `${a.innerText.trim()}${a.classList.contains('on') ? '*' : ''}`).join('|'));
  ok(abas === 'Na ficha|Leilão*', 'as duas partes no alto, com Leilão marcada (22/10/2026: "renomeie a aba como leilão") — ' + abas);
  ok(await page.evaluate(() => document.querySelector('.pc-nav-i.on')?.dataset.pc === 'promocoes'), 'no menu de cima, "Promoções" fica marcada também na parte Leilão');
  ok((await texto(page, '#parceiros .pc-main')).includes('Disponível no plano Premium') && !(await page.$('#pc-email-titulo')), 'Básico: Leilão trancado, "Disponível no plano Premium"');
  await page.click('.pc-promo-partes [data-pc="promocoes"]');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => state.parceirosAba === 'promocoes') && (await texto(page, '#parceiros .pc-main')).includes('Disponível no plano Completo'), 'Básico: Na ficha trancado, "Disponível no plano Completo"');
  ok(!/aviso/i.test(await texto(page, '#parceiros .pc-main')), 'a página de promoções não fala em "aviso"');
  await browser.close();

  // ---- Completo: a promoção na ficha, mas o leilão é só do Premium (pedido
  // do Breno em 22/10/2026: "completo não pode ter acesso ao leilão somente
  // Premium") ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes-email', completo: ['a1'] }));
  await page.waitForTimeout(400);
  corpo = await texto(page, '#parceiros .pc-main');
  // 23/10/2026: "O completo não pode ver nenhum detalhe sobre o leilão. Só quando ele clicar no leilão aparecer disponível no premium. Igual com os desempenhos."
  const trancado = (await texto(page, '#pc-leilao-trancado')).replace(/\s+/g, ' ').trim();
  ok(trancado.toLowerCase() === 'leilão de promoções disponível no plano premium ver o plano premium' && await page.$('#pc-leilao-trancado.pc-vitrine') && !(await page.$('#pc-leilao-passo')),
    'Completo: Leilão trancado como o Desempenho, só "Disponível no plano Premium", sem detalhe — ' + trancado);
  ok((await page.evaluate(() => sb.rpc('dar_lance', { p_academia: 'a1', p_titulo: 'Aula grátis', p_mensagem: 'Para quem nunca jogou aqui.', p_valor: 10 }))).error?.message === 'O leilão de promoções é do plano Premium.', 'e o banco recusa o lance do Completo');
  await page.click('.pc-promo-partes [data-pc="promocoes"]');
  await page.waitForTimeout(300);
  ok(await page.$('#pc-promo-titulo') && !/Disponível no plano/.test(await texto(page, '#parceiros .pc-main')), 'Completo: Na ficha, o formulário da promoção');
  ok(!/leil|lance/i.test(await texto(page, '#parceiros .pc-main .pc-promo-form')), 'e a promoção na ficha não fala do leilão');
  await page.evaluate(() => irParceiros('ajuda'));
  await page.waitForTimeout(300);
  const ajuda = await page.evaluate(() => ({ ids: perguntasParceiros().map(x => x.id).join(','), promo: perguntasParceiros().find(x => x.id === 'promocoes').a }));
  ok(!ajuda.ids.includes('promocoes-email') && !/leil/i.test(ajuda.promo), 'na Ajuda, logado no Completo, sem a pergunta do leilão');
  await page.evaluate(() => irParceiros('plano'));
  await page.waitForTimeout(400);
  const plano = await texto(page, '#parceiros .pc-main');
  ok(!/leilão da semana|e-mail do GuiaTennis do bairro|duas por semana|lance/i.test(plano), 'na página Plano, o leilão aparece só pelo nome, sem detalhes');
  await browser.close();

  // ---- Premium: o leilão do e-mail do bairro (regra 116), passo a passo (regra 143) ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes-email', premium: ['a1'] }));
  await page.evaluate(async () => { window.__alcance = 143; await carregarPromocoesPorEmail(); });
  await page.waitForTimeout(300);
  const passo = () => page.evaluate(() => document.querySelector('#pc-leilao-passo')?.dataset.passo);
  const seguir = async () => { await page.click('#pc-leilao-continuar'); await page.waitForTimeout(150); };
  const dados = await texto(page, '#pc-leilao');
  ok(dados.includes('Leilão · e-mail patrocinado') && dados.includes('Sem lance') && dados.includes('Pinheiros, São Paulo') && /Encerra\s+dom\. \d\d\/\d\d · 20:00/.test(dados) && /Alcance estimado\s+140\+ jogadores/.test(dados) && /Lance mínimo\s+R\$ 10/.test(dados) && /Créditos\s+R\$ 0/.test(dados) && await page.$('#pc-leilao #pc-comprar-creditos'),
    'no alto, o cabeçalho da campanha: status, bairro, encerramento, alcance, lance mínimo e créditos — ' + dados.replace(/\s+/g, ' ').slice(0, 160));
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('#parceiros .pc-main')).backgroundColor === 'rgb(242, 243, 245)' && getComputedStyle(document.querySelector('.pc-ads h1')).fontFamily.startsWith('Inter')),
    'o leilão é um painel de anúncios: fundo neutro e título sem a fonte de revista (22/10/2026)');
  ok(await passo() === '0' && (await texto(page, '#pc-leilao-passo .pc-ads-etapa')) === 'Etapa 1 de 5 · Como funciona' && (await texto(page, '#pc-leilao-passo .pc-card-t')) === 'Como funciona o leilão de promoções' && await page.evaluate(() => document.querySelectorAll('.pc-leilao-como li').length === 4) && !(await page.$('.trilha')),
    'primeira etapa: como funciona, em 4 pontos, sem a barra das etapas (22/10/2026: "tire a barra")');
  corpo = await texto(page, '#pc-leilao-passo');
  ok(corpo.includes('Você só paga se ganhar') && corpo.includes('A nota decide, não só o valor') && !/aviso/i.test(corpo), 'explica a nota e que só paga se ganhar, sem "aviso"');
  ok(!(await page.$('#pc-leilao-voltar')), 'na primeira etapa, sem "Voltar"');
  await seguir();
  corpo = await texto(page, '#pc-leilao-passo');
  ok(await passo() === '1' && /^Etapa 2 de 5 · Estimativa\s+Estimativa da semana/.test(corpo) && /Alcance estimado\s+140\+ jogadores\s+em Pinheiros/.test(corpo) && /Custo por jogador\s+a partir de R\$ 0,07/.test(corpo) && /1º envio\s+ter\. \d\d\/\d\d · 10:00/.test(corpo) && /2º envio\s+sex\. \d\d\/\d\d · 10:00/.test(corpo) && corpo.includes('chega a cerca de 140 jogadores que procuram tênis em Pinheiros'),
    'segunda etapa: a estimativa (alcance, custo por jogador e os dois envios) — ' + corpo.replace(/\s+/g, ' ').slice(0, 160));
  ok(!(await page.$('#pc-leilao')), 'o cabeçalho da campanha fica só na primeira e na última etapa (22/10/2026)');
  ok(corpo.includes('Índice de qualidade da academia') && await page.$('.pc-leilao-check') && await page.$('#pc-leilao-agora-nao') && (await texto(page, '#pc-leilao-participar')) === 'Participar', 'mostra o índice de qualidade e pergunta se quer participar');
  await page.click('#pc-leilao-agora-nao');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.parceirosAba === 'painel') && (await texto(page, '.gt-push')).includes('O leilão abre de novo toda semana'), '"Agora não" volta ao painel, com um recado');
  await page.evaluate(() => irParceiros('promocoes-email'));
  await page.waitForTimeout(300);
  ok(await passo() === '0', 'voltando ao Leilão, começa de novo pelo "Como funciona"');
  await seguir();
  await page.click('#pc-leilao-participar');
  await page.waitForTimeout(150);
  ok(await passo() === '2' && (await texto(page, '#pc-leilao-passo .pc-card-t')) === 'Texto do anúncio' && await page.$('#pc-email-previa') && !(await page.$('#pc-email-valor')), 'terceira etapa: o texto do anúncio, com a prévia do e-mail, ainda sem o lance');
  ok(!(await page.$('.pc-email-da-ficha')), 'sem promoção valendo na ficha, sem "Usar a promoção da ficha"');
  await seguir();
  ok((await texto(page, '#pc-leilao-passo .form-error')).includes('Escreva a promoção') && await passo() === '2', 'sem a promoção escrita, não passa');
  await page.fill('#pc-email-titulo', 'Primeira aula grátis');
  await page.fill('#pc-email-mensagem', 'Para quem nunca fez aula aqui, de segunda a sexta.');
  await page.waitForTimeout(100);
  ok((await texto(page, '[data-cont="titulo"]')) === '20/30' && (await texto(page, '[data-cont="mensagem"]')) === '50/300' && await page.evaluate(() => document.getElementById('pc-email-mensagem').maxLength) === 300, 'os contadores de caracteres acompanham o que se digita; o título vai até 30 letras e a mensagem até 300 (regras 177 e 178)');
  let previa = await texto(page, '#pc-email-previa');
  ok(previa.startsWith('Prévia do e-mail\n') && previa.includes('Assunto: Promoção em Pinheiros: Primeira aula grátis') && previa.includes('Novidade em Pinheiros') && /Patrocinado · Só Aula Tennis/i.test(previa) && previa.includes('Promoção patrocinada'),
    'a prévia do e-mail do GuiaTennis do bairro muda enquanto se digita, com "Patrocinado" — ' + previa.slice(0, 90));
  await seguir();
  corpo = await texto(page, '#pc-leilao-passo');
  ok(await passo() === '3' && /^Etapa 4 de 5 · Lance\s+Lance máximo/.test(corpo) && corpo.includes('Lance máximo (R$)') && corpo.includes('É o teto, não o preço. Você nunca paga mais que o lance máximo.') && corpo.includes('Se ninguém mais der lance, paga o mínimo, R$ 10.') && corpo.includes('Se não ganhar, nada é cobrado.'),
    'quarta etapa: o lance máximo explicado como teto, não preço (22/10/2026: "especifique melhor isso")');
  // Um parágrafo para cada regra, sem o recado dos créditos (regra 179).
  const paragrafos = await page.evaluate(() => [...document.querySelectorAll('.pc-lance-explica p:not(.pc-lance-exemplo)')].map(p => p.innerText.trim()));
  ok(paragrafos.join(' | ') === 'É o teto, não o preço. Você nunca paga mais que o lance máximo. | Se ganhar, paga só o suficiente para ficar à frente da academia seguinte, mais R$ 1. | Se ninguém mais der lance, paga o mínimo, R$ 10. | Se não ganhar, nada é cobrado.', 'o lance explicado em parágrafos — ' + paragrafos.join(' | '));
  ok(!corpo.includes('Os créditos garantem o lance') && !(await page.isVisible('#pc-lance-saldo')), 'sem "Os créditos garantem o lance"');
  await page.fill('#pc-email-valor', '85');
  await page.waitForTimeout(100);
  ok((await texto(page, '#pc-lance-exemplo')) === 'Exemplo: você oferece até R$ 85 e a academia seguinte oferece R$ 51. Se as duas fichas tiverem a mesma qualidade, você ganha e paga R$ 52, não os R$ 85.', 'o exemplo acompanha o valor digitado — ' + await texto(page, '#pc-lance-exemplo'));
  ok((await texto(page, '#pc-lance-saldo')).includes('precisa ter R$ 85 em créditos') && await page.$('#pc-leilao-passo [data-comprar-creditos]'), 'sem créditos, avisa e oferece "Comprar ›" ali mesmo');
  await page.fill('#pc-email-valor', '5');
  await seguir();
  ok((await texto(page, '#pc-leilao-passo .form-error')).includes('pelo menos R$ 10') && await passo() === '3', 'lance abaixo do mínimo não passa');
  await page.fill('#pc-email-valor', '25');
  await seguir();
  ok((await texto(page, '#pc-leilao-passo .form-error')).includes('Sem créditos, o lance não entra') && await passo() === '3', 'sem créditos, não passa para a revisão');
  await page.click('#pc-leilao-voltar');
  await page.waitForTimeout(150);
  ok(await passo() === '2' && (await page.inputValue('#pc-email-titulo')) === 'Primeira aula grátis', '"Voltar" volta uma etapa e guarda o texto');
  await seguir();
  ok((await page.inputValue('#pc-email-valor')) === '25', 'e o valor também');
  await page.evaluate(async () => { window.__db.academias.find(a => a.id === 'a1').envios_de_aviso = 100; await carregarPromocoesPorEmail(); });
  await page.waitForTimeout(150);
  await seguir();
  corpo = await texto(page, '#pc-leilao-passo');
  ok(await passo() === '4' && /^Etapa 5 de 5 · Revisão\s+Revisão do anúncio/.test(corpo) && /Lance máximo\s+R\$ 25/.test(corpo) && corpo.includes('Nada é cobrado agora') && await page.$('#pc-email-previa') && /Créditos\s+R\$ 100\s+Comprar créditos/.test(await texto(page, '#pc-leilao')),
    'quinta etapa: a revisão com a prévia, o lance máximo e "Nada é cobrado agora"');
  ok(!(await page.isDisabled('#pc-email-enviar')) && (await texto(page, '#pc-email-enviar')) === 'Entrar com lance de até R$ 25', 'o botão diz o que acontece: "Entrar com lance de até R$ 25"');
  await page.click('#pc-email-enviar');
  await page.waitForTimeout(400);
  corpo = await texto(page, '#parceiros .pc-main');
  const rpc = await page.evaluate(() => (window.__rpcs.filter(r => r.nome === 'dar_lance').slice(-1)[0] || {}).args);
  ok(rpc && rpc.p_valor === 25 && rpc.p_titulo === 'Primeira aula grátis' && corpo.includes('Pronto: a Só Aula Tennis está no leilão, com lance de até R$ 25.') && !(await page.$('#pc-email-titulo')),
    'entra no leilão: vai para o banco e a tela confirma');
  const linha = await page.evaluate(() => [...document.querySelectorAll('.pc-leilao-linha > li')].map(l => `${l.querySelector('strong').innerText}${l.className ? ':' + l.className : ''}`).join('|'));
  ok(linha === 'Lance registrado:feito|Leilão aberto:agora|Resultado|E-mail aos jogadores' && /Andamento do leilão\s+Lance ativo em Pinheiros/.test(await texto(page, '#pc-lance')) && /Lance máximo\s+R\$ 25/.test(await texto(page, '#pc-lance')) && !(await page.$('#pc-leilao')),
    'a página de andamento: lance registrado, leilão aberto, resultado e e-mail — ' + linha);
  ok(await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').envios_de_aviso === 100), 'entrar não cobra nada (só cobra se ganhar)');
  await page.click('#pc-lance-alterar');
  await page.waitForTimeout(150);
  ok(await passo() === '2' && (await page.inputValue('#pc-email-titulo')) === 'Primeira aula grátis' && await page.$('#pc-email-desistir'), '"Alterar o lance" volta à promoção, com o lance de antes e "Manter o lance de antes"');
  await seguir();
  ok((await page.inputValue('#pc-email-valor')) === '25', 'com o valor de antes');
  await page.fill('#pc-email-valor', '30');
  await seguir();
  ok((await texto(page, '#pc-email-enviar')) === 'Salvar o lance de até R$ 30', 'alterar também passa pela revisão');
  await page.click('#pc-email-enviar');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => window.__db.lances.length === 1 && window.__db.lances[0].valor === 30) && await page.$('#pc-lance'), 'um lance por semana: alterar muda o mesmo e volta ao andamento');
  page.once('dialog', d => d.accept());
  await page.click('#pc-lance-cancelar');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => window.__db.lances.length === 0) && (await texto(page, '#parceiros .pc-main')).includes('Você saiu do leilão desta semana.') && await passo() === '1', '"Sair do leilão" pergunta, tira o lance e volta ao "Vale a pena?"');
  // Os leilões de antes, com o resultado de cada um.
  await page.evaluate(async () => {
    const base = { academia_id: 'a1', regiao_nome: 'Pinheiros, São Paulo', titulo: 'Aula grátis', mensagem: 'Texto', avisados: 0 };
    window.__db.lances.push({ ...base, id: 'h1', situacao: 'enviado', posicao: 1, preco: 18, valor: 25, avisados: 37, fecha_em: '2026-10-11T23:00:00Z' },
      { ...base, id: 'h2', situacao: 'perdeu', valor: 12, fecha_em: '2026-10-04T23:00:00Z' });
    await carregarPromocoesPorEmail();
  });
  await page.waitForTimeout(200);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Leilões anteriores') && corpo.includes('1º lugar · chegou a 37 jogadores · pagou R$ 18') && corpo.includes('Não ganhou (lance de R$ 12) · nada foi cobrado') && await page.evaluate(() => document.querySelectorAll('.pc-ads-lista li').length === 2), 'os leilões anteriores, numa lista: o resultado e quanto pagou');
  await browser.close();

  // ---- Academia sem bairro: o leilão pede o bairro ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes-email', premium: ['a1'] }));
  await page.evaluate(async () => { window.__db.academias.find(a => a.id === 'a1').bairro = ''; await carregarPromocoesPorEmail(); });
  await page.waitForTimeout(200);
  ok((await texto(page, '#parceiros .pc-main')).includes('Falta o bairro na ficha') && !(await page.$('#pc-leilao-passo')), 'sem bairro na ficha, pede o bairro antes do leilão');
  await browser.close();

  // ---- "Chamar no WhatsApp" do e-mail: passa pela ficha, conta o contato e abre o WhatsApp com o assunto ----
  ({ browser, page } = await abrir({ q: 'academia/quadra-locacao-a2' }));
  await page.waitForTimeout(400);
  await page.route('https://wa.me/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>WhatsApp</p>' }));
  await page.evaluate(() => { history.replaceState(null, '', '/academia/quadra-locacao-a2?chamar=whatsapp&assunto=' + encodeURIComponent('a promoção "Primeira aula grátis"') + '&utm_source=Email-leilao'); aplicarLink(lerLink()); render(); });
  await page.waitForTimeout(250);
  const antes = await page.evaluate(() => ({ clique: (window.__cliques || []).some(c => c.tipo === 'whatsapp' && c.academia_id === 'a2'), busca: location.search }));
  ok(antes.clique && !antes.busca.includes('chamar=') && antes.busca.includes('utm_source=Email-leilao'), 'o link do e-mail conta o contato pelo WhatsApp e sai do endereço — ' + antes.busca);
  await page.waitForTimeout(800);
  const destino = decodeURIComponent(page.url());
  ok(destino.startsWith('https://wa.me/55') && destino.includes('queria saber sobre a promoção "Primeira aula grátis"'), 'e abre o WhatsApp da academia com a mensagem sobre a promoção — ' + destino);
  await browser.close();

  // ---- Premium: Na ficha não manda e-mail; "Mandar por e-mail" leva ao Leilão com o texto pronto ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes', premium: ['a1'], envios: { a1: 3 } }));
  await page.waitForTimeout(400);
  ok(!(await page.$('#pc-promo-avisar')) && !(await page.$('.pc-promo-avisar')), 'Na ficha: sem a caixinha de avisar por e-mail');
  ok(!(await page.$('#pc-promo-previa')) && !(await page.$('#pc-promo-salvar')), 'Na ficha: o primeiro passo é só escrever');
  await page.fill('#pc-promo-titulo', 'Aula experimental grátis');
  await page.fill('#pc-promo-detalhes', 'Para quem nunca jogou aqui.');
  await page.click('[data-promo-semanas="2"]');
  await page.waitForTimeout(150);
  await page.click('#pc-promo-revisar');
  await page.waitForTimeout(150);
  ok(await page.$('#pc-promo-previa') && !(await page.$('#pc-email-previa')) && (await texto(page, '#pc-promo-previa')).includes('Aula experimental grátis'), 'Na ficha: o segundo passo mostra só a prévia na ficha e na busca');
  await page.click('#pc-promo-salvar');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').envios_de_aviso === 3 && !('p_avisar' in (window.__rpcs.find(r => r.nome === 'salvar_promocao') || {}).args)), 'publicar na ficha não manda e-mail nem gasta créditos (preço ainda em R$ 0)');
  ok((await texto(page, '#parceiros .pc-main')).includes('Promoção publicada na ficha e na busca') && await page.$('[data-promo-por-email]'), 'a promoção publicada tem "Mandar por e-mail"');
  await page.click('[data-promo-por-email]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => state.parceirosAba === 'promocoes-email') && await passo() === '2' && (await page.inputValue('#pc-email-titulo')) === 'Aula experimental grátis' && (await page.inputValue('#pc-email-mensagem')).startsWith('Para quem nunca jogou aqui. Válida até '),
    '"Mandar por e-mail" abre o Leilão já na etapa da promoção, com o texto e a validade');
  ok((await texto(page, '.pc-email-da-ficha')).includes('Aula experimental grátis'), 'no Premium, "Usar a promoção da ficha" mostra a que está valendo');
  await page.fill('#pc-email-titulo', '');
  await page.click('.pc-email-da-ficha [data-promo-email]');
  await page.waitForTimeout(150);
  ok((await page.inputValue('#pc-email-titulo')) === 'Aula experimental grátis', 'tocar numa promoção da ficha preenche o e-mail');
  await browser.close();

  // ---- O nome da academia no alto escolhe a academia, e a troca fica na mesma página (16/10/2026) ----
  ({ browser, page } = await abrir({ academia: 'a2', outrasAcademias: ['a1'], q: 'parceiros/promocoes', w: 390 }));
  await page.waitForTimeout(400);
  ok(!(await page.isVisible('#pc-seletor-btn')) && await page.isVisible('#pc-seletor-titulo'), 'no celular, o nome da academia no alto é o seletor');
  await page.click('#pc-seletor-titulo');
  await page.waitForTimeout(150);
  const itens = await page.evaluate(() => [...document.querySelectorAll('.pc-seletor-titulo .pc-academia-i')].map(b => b.innerText.replace(/\s+/g, ' ').trim()));
  ok(itens.length === 3 && itens.some(i => i.startsWith('Só Aula Tennis')) && itens[2] === 'Adicionar outra academia', 'tocar no nome abre as academias da conta — ' + itens.join(' | '));
  await page.click('.pc-seletor-titulo [data-abrir-academia="a1"]');
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => state.parceirosAba === 'promocoes' && document.querySelector('#pc-seletor-titulo span')?.textContent === 'Só Aula Tennis' && !document.querySelector('.pc-seletor-lista')), 'escolhida a outra academia, continua em Promoções, já com ela');
  await browser.close();

  // ---- Planos, conta do jogador e painel do admin ----
  ({ browser, page } = await abrir({ q: 'parceiros/planos' }));
  await page.waitForTimeout(300);
  const planos = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.pc-plano')].map(p => [p.querySelector('.pc-plano-n')?.innerText.trim(), [...p.querySelectorAll('li:not(.nao)')].map(l => l.innerText).join(' | ')])));
  ok(planos['Completo'].includes('Promoções na ficha e na busca, pagas por semana') && !/leil/i.test(planos['Completo']) && planos['Premium'].includes('Leilão de promoções por e-mail')
    && planos['Premium'].includes('Promoções na ficha e na busca, com a semana mais barata') && !/aviso/i.test(planos['Completo'] + planos['Premium']),
    'Planos: na ficha no Completo e no Premium (mais barata no Premium); o leilão do e-mail, só no Premium; sem "aviso"');
  ok(await page.evaluate(() => { const f = perguntasParceiros().map(x => x.q).join(' | '); return f.includes('Como funcionam as promoções na ficha?') && f.includes('Como funciona o leilão das promoções por e-mail?') && !/avisos por e-mail/i.test(f); }), 'Ajuda: as duas perguntas de promoções, sem "avisos por e-mail"');
  ok(await page.evaluate(() => AVISOS_JOGADOR.find(x => x.campo === 'promocoes').t === 'Promoções das academias favoritas e perto de você'), 'conta do jogador: "Promoções das academias favoritas e perto de você"');
  await browser.close();
  ({ browser, page } = await abrir({ admin: true, q: 'admin', completo: ['a1'], envios: { a1: 1 }, w: 1280 }));
  await page.waitForTimeout(500);
  await page.click('.adm-nav [data-adm-aba="academias"]');
  await page.waitForTimeout(300);
  await page.click('[data-adm-academia="a1"]');
  await page.waitForTimeout(500);
  ok((await texto(page, '.adm-acad.aberta .adm-envios')).startsWith('Créditos de promoções: R$') && (await texto(page, '.adm-acad.aberta [data-envios-de="a1"]')) === '1', 'o admin vê os créditos de promoções da academia');
  await page.click('.adm-acad.aberta [data-envios-somar="a1"][data-q="50"]');
  await page.waitForTimeout(400);
  ok((await texto(page, '.adm-acad.aberta [data-envios-de="a1"]')) === '51' && await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').envios_de_aviso === 51), 'o admin soma R$ 50 depois do Pix');
  // A aba Leilões: os lances da semana por bairro, os e-mails marcados e o lance mínimo.
  await page.evaluate(() => { window.__db.lances.push(
    { id: 'l1', academia_id: 'a1', regiao_nome: 'Pinheiros, São Paulo', titulo: 'Aula grátis', mensagem: 'Para iniciantes.', valor: 30, situacao: 'aberto', qualidade: 0.9 },
    { id: 'l2', academia_id: 'a2', regiao_nome: 'Moema, São Paulo', titulo: 'Locação', mensagem: 'Desconto.', valor: 20, situacao: 'ganhou', posicao: 1, preco: 12, envio_em: '2026-10-20T13:00:00Z' }); });
  await page.click('.adm-nav [data-adm-aba="leiloes"]');
  await page.waitForTimeout(400);
  let adm = await texto(page, '#painel-admin');
  ok(adm.includes('Leilão desta semana') && adm.includes('Pinheiros, São Paulo · 1 lance') && adm.includes('Só Aula Tennis · R$ 30 · qualidade 0,90') && adm.includes('1º lugar · sai terça') && adm.includes('paga R$ 12'), 'Leilões: os lances por bairro e os e-mails marcados — ' + adm.replace(/\s+/g, ' ').slice(0, 120));
  page.once('dialog', d => d.accept());
  await page.click('[data-leilao-nao-enviar="l2"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => window.__db.lances.find(l => l.id === 'l2').situacao === 'cancelado' && window.__db.academias.find(a => a.id === 'a2').envios_de_aviso === 12), '"Não enviar" cancela e devolve os créditos');
  await page.fill('#adm-lance-minimo', '15');
  await page.click('#adm-lance-minimo-salvar');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__db.leilaoConfig.lance_minimo === 15), 'o admin muda o lance mínimo');
  ok((await texto(page, '#painel-admin')).includes('Em R$ 0, a promoção na ficha fica sem custo.'), 'o preço da semana da promoção na ficha começa em R$ 0, sem custo');
  await page.fill('#adm-preco-promocao', '12');
  await page.click('#adm-preco-promocao-salvar');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__db.leilaoConfig.preco_promocao_semana === 12) && (await texto(page, '#painel-admin')).includes('O Completo paga R$ 12 por semana; o Premium, 20% menos (R$ 9).'), 'o admin muda o preço da semana: o Completo paga cheio, o Premium 20% menos');
  await browser.close();
})();
