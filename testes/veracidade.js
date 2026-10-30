// Veracidade como os grandes (pedido do Breno em 26/10/2026: "faça o que for
// possível como os grandes fazem em tudo para sempre garantir a veracidade,
// pegue os melhores dados que garantem isso atualizados também"; SQL
// 20261026120000, regra 156): o WhatsApp da ficha só entra confirmado por
// código (e a troca, conferida pelo GuiaTennis); "Informar um problema" na
// ficha; avaliar só com o e-mail confirmado; "Denunciar" na avaliação; o aviso
// da academia que avisou que fechou e da ficha com mais de um ano; e o
// "Conferir" do admin com o Google Maps, o mapa aberto e a Receita Federal.
const { abrir, ok, irParte, salvarFicha } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const diasAtras = (n) => new Date(Date.now() - n * 86400000).toISOString();
const abrirFicha = async (page, id) => { await page.evaluate((id) => openCourt(id), id); await page.waitForTimeout(250); };
const mudarAcademia = (page, id, campos) => page.evaluate(async ({ id, campos }) => {
  Object.assign(window.__db.academias.find(a => a.id === id), campos);
  await loadEverything(); render();
}, { id, campos });

(async () => {
  // ---- o WhatsApp novo espera o código; a troca, a conferência ----
  let { browser, page } = await abrir({ academia: 'a2', q: 'parceiros/ficha', plano: 'premium' });
  await page.evaluate(async () => { window.__db.academias.find(a => a.id === 'a2').plano = 'premium'; await loadEverything(); render(); });
  await page.click('#parceiros .editar-academia');
  await page.waitForTimeout(300);
  await irParte(page, 'contato');
  let dica = await texto(page, '.reg-whatsapp-dica');
  ok(dica.includes('Trocou de número? O novo precisa de confirmação e não fica público até ser confirmado') && !/Google|Booking|Airbnb/.test(dica),
    'embaixo do WhatsApp: a troca passa pelo código e pelo GuiaTennis, sem citar marcas — ' + dica);
  await page.fill('#f-phone', '(11) 96666-2222');
  await salvarFicha(page);
  await page.waitForTimeout(700);
  let r = await page.evaluate(() => ({ db: window.__db.academias.find(a => a.id === 'a2'), tela: (document.getElementById('register-overlay')?.innerText || '').replace(/\s+/g, ' ') }));
  ok(r.db.phone === '11999990002' && r.db.whatsapp_a_confirmar === '(11) 96666-2222' && r.db.whatsapp_antes === '11999990002',
    'salvar com outro número: a ficha continua com o de antes, e o novo espera o código');
  ok(r.tela.includes('menos o WhatsApp novo, que espera o código') && r.tela.includes('Confirme o WhatsApp (11) 96666-2222') && r.tela.includes('e o GuiaTennis conferir') && !!(await page.$('#register-ir-whatsapp')),
    'a tela de pronto diz o que falta e tem "Digitar o código" — ' + r.tela.slice(0, 160));
  ok(await page.evaluate(() => window.__db.emails_a_enviar.some(e => e.tipo === 'whatsapp_para_confirmar')), 'sem o WhatsApp da Meta ligado, o admin fica sabendo para mandar o código');
  await page.click('#register-ir-whatsapp');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({
    url: location.pathname, eyebrow: document.querySelector('#pc-whatsapp .pc-eyebrow')?.textContent || '', h1: document.querySelector('#pc-whatsapp h1')?.innerText || '',
    sub: document.querySelector('#pc-whatsapp .cod-s')?.innerText || '', caixas: document.querySelectorAll('#pc-whatsapp .otp-caixas span').length,
    desenhos: document.querySelectorAll('#pc-whatsapp svg, #pc-whatsapp img').length, rodape: !!document.querySelector('.pc-rodape'), menu: !!document.querySelector('#parceiros .pc-nav'),
    fonte: getComputedStyle(document.querySelector('#pc-whatsapp h1')).fontFamily, cartao: !!document.querySelector('#pc-whatsapp .pc-card #pc-confirmar-whatsapp'),
  }));
  ok(r.url === '/parceiros/whatsapp' && r.eyebrow.includes('WhatsApp da academia') && r.h1 === 'Digite o código' && r.caixas === 6 && r.cartao,
    'a página do código: /parceiros/whatsapp, a etiqueta, "Digite o código" e as 6 caixas no cartão — ' + r.url);
  ok(r.sub.includes('em até 1 dia útil') && r.sub.includes('(11) 96666-2222'), 'diz para onde o código vai e o prazo enquanto o envio é à mão — ' + r.sub);
  ok(r.desenhos === 0 && !r.rodape && !r.menu && r.fonte.includes('Playfair'), 'sem desenho, sem menu nem rodapé, com o título em Playfair (regras 154 e 155)');
  await page.fill('#pc-codigo-whatsapp', '111111');
  await page.click('#pc-confirmar-whatsapp');
  await page.waitForTimeout(300);
  ok((await texto(page, '#pc-whatsapp .form-error')).includes('sem') || (await texto(page, '#pc-whatsapp .form-error')).includes('não foi mandado'), 'sem código mandado: avisa — ' + await texto(page, '#pc-whatsapp .form-error'));
  // O admin gera o código (o mesmo número que o mock sorteia).
  await page.evaluate(() => { window.__codigosDoWhatsapp = { a2: { codigo: '654321', numero: '(11) 96666-2222', criado_em: new Date().toISOString(), tentativas: 0, origem: 'admin' } }; });
  await page.evaluate(async () => { await carregarWhatsappNovo(); render(); });
  await page.fill('#pc-codigo-whatsapp', '111111');
  await page.click('#pc-confirmar-whatsapp');
  await page.waitForTimeout(300);
  ok((await texto(page, '#pc-whatsapp .form-error')) === 'Código errado. Confira os 6 números.', 'código errado: avisa');
  await page.fill('#pc-codigo-whatsapp', '654321');
  await page.click('#pc-confirmar-whatsapp');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ h1: document.querySelector('#pc-whatsapp h1')?.innerText || '', s: (document.querySelector('#pc-whatsapp')?.innerText || '').replace(/\s+/g, ' '), db: window.__db.academias.find(a => a.id === 'a2') }));
  ok(r.h1 === 'Código confirmado' && r.s.includes('GuiaTennis confere se o (11) 96666-2222 é da academia') && r.s.includes('a ficha mostra o número de antes') && r.db.phone === '11999990002' && !!r.db.whatsapp_codigo_ok_em,
    'troca: o código certo leva à conferência do GuiaTennis, e a ficha segue com o número de antes — ' + r.s.replace(/\s+/g, ' ').slice(0, 220));
  await page.click('#pc-whatsapp-sair');
  await page.waitForTimeout(300);
  let cartao = await texto(page, '#parceiros .pc-whatsapp-novo');
  ok(cartao.toLowerCase().includes('whatsapp novo em conferência') && cartao.includes('Cancelar a troca'), 'Atualizações: o cartão da troca em conferência — ' + cartao);
  page.once('dialog', d => d.accept());
  await page.click('[data-desistir-whatsapp="a2"]');
  await page.waitForTimeout(300);
  r = await page.evaluate(() => ({ db: window.__db.academias.find(a => a.id === 'a2'), cartao: !!document.querySelector('#parceiros .pc-whatsapp-novo'), aviso: document.querySelector('#parceiros .conta-aviso')?.innerText || '' }));
  ok(!r.db.whatsapp_a_confirmar && !r.cartao && r.aviso.includes('Troca cancelada'), '"Cancelar a troca": o número novo sai e a ficha fica como estava');
  // Academia sem WhatsApp: o código certo também espera o GuiaTennis (regra 157).
  await mudarAcademia(page, 'a2', { phone: null });
  await page.evaluate(() => { window.__whatsappLigado = true; abrirEdicaoDaFicha(state.allCourts.find(c => c.id === 'a2')); });
  await page.waitForTimeout(300);
  await irParte(page, 'contato');
  dica = await texto(page, '.reg-whatsapp-dica');
  ok(dica.includes('não fica público até ser confirmado: o código de 6 números mandado a ele e a conferência do GuiaTennis'), 'ficha sem WhatsApp: o número aparece depois do código e da conferência — ' + dica);
  await page.fill('#f-phone', '11955554444');
  await salvarFicha(page);
  await page.waitForTimeout(700);
  ok(await page.evaluate(() => (window.__whatsapps || []).some(w => w.tipo === 'whatsapp_da_ficha' && w.para === '5511955554444')), 'com o WhatsApp da Meta ligado, o código sai sozinho para o número novo');
  await page.click('#register-ir-whatsapp');
  await page.waitForTimeout(300);
  ok((await texto(page, '#pc-whatsapp .cod-s')).includes('Mandamos um código de 6 números'), 'ligado: "Mandamos um código"');
  await page.fill('#pc-codigo-whatsapp', '654321');
  await page.click('#pc-confirmar-whatsapp');
  await page.waitForTimeout(500);
  r = await page.evaluate(() => ({ db: window.__db.academias.find(a => a.id === 'a2'), h1: document.querySelector('#pc-whatsapp h1')?.innerText || '', s: document.querySelector('#pc-whatsapp')?.innerText || '',
    email: (window.__db.emails_a_enviar.filter(e => e.tipo === 'whatsapp_para_aprovar').pop() || {}).assunto || '' }));
  ok(!r.db.phone && !!r.db.whatsapp_codigo_ok_em && r.h1 === 'Código confirmado' && r.s.includes('a ficha fica sem o botão do WhatsApp'),
    'sem número antes: o código certo também leva à conferência do GuiaTennis, e a ficha fica sem o botão (regra 157)');
  ok(r.email.startsWith('WhatsApp para aprovar: '), 'o admin recebe o número para aprovar — ' + r.email);
  await browser.close();

  // ---- a ficha pública: sem o botão, sem dizer que há número esperando ----
  // Regra 157: como o Google Business Profile, nada de "em confirmação".
  ({ browser, page } = await abrir({}));
  await mudarAcademia(page, 'a1', { phone: null, whatsapp_a_confirmar: '(11) 95555-1111' });
  await abrirFicha(page, 'a1');
  r = await page.evaluate(() => ({ wa: !!document.querySelector('.courtpage a[data-track="whatsapp"]'), pagina: (document.querySelector('.courtpage')?.innerText || '') }));
  ok(!r.wa && !/confirmad[oa] o WhatsApp|sendo confirmado|em confirmação|em revisão|95555/i.test(r.pagina.replace('Confirmada pela academia', '')),
    'WhatsApp esperando o código: nenhum botão, e a ficha não diz que há um número esperando');
  await mudarAcademia(page, 'a1', { phone: null, whatsapp_a_confirmar: null, whatsapp_em_revisao_desde: diasAtras(1), whatsapp_em_revisao_numero: '11999990001' });
  await abrirFicha(page, 'a1');
  ok(!/em revisão/.test(await texto(page, '.courtpage')), 'WhatsApp em revisão: a ficha também não diz');
  // A ficha com mais de um ano.
  await mudarAcademia(page, 'a1', { phone: '11999990001', whatsapp_em_revisao_desde: null, whatsapp_em_revisao_numero: null, dados_atualizados_em: diasAtras(400) });
  await abrirFicha(page, 'a1');
  ok((await texto(page, '.ficha-confirmada')).includes('Faz mais de um ano: confirme horário e preço'), 'ficha com mais de um ano: pede para confirmar com a academia');
  // A academia que avisou que fechou sai do site (regra 157): nem com o banco
  // antigo, que ainda não a pausa, o jogador a vê.
  await mudarAcademia(page, 'a1', { avisou_que_fechou_em: diasAtras(1) });
  await page.evaluate(() => { state.page = 'search'; state.searchStatus = 'done'; state.selected = null; render(); });
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => !state.allCourts.some(c => c.id === 'a1') && ![...document.querySelectorAll('.rcard')].some(c => c.innerText.includes('Só Aula Tennis'))),
    'a academia que avisou que fechou não aparece para o jogador');
  await browser.close();

  // ---- o admin ainda vê a ficha, com o aviso de que está fora do site ----
  ({ browser, page } = await abrir({ admin: true }));
  await mudarAcademia(page, 'a1', { avisou_que_fechou_em: diasAtras(1), pausada: true });
  await abrirFicha(page, 'a1');
  r = await texto(page, '.ht-head .ficha-fechou');
  ok(r.includes('Fora do site: a academia avisou que fechou as portas') && r.includes('Os jogadores não veem esta ficha'), 'admin: o aviso no alto da ficha diz que ela está fora do site — ' + r);
  await browser.close();

  // ---- "Informar um problema": entra, confirma o e-mail e envia ----
  ({ browser, page } = await abrir({ jogador: true }));
  await abrirFicha(page, 'a1');
  await page.click('#informar-problema');
  await page.waitForTimeout(200);
  r = await page.evaluate(() => ({ t: document.querySelector('#aviso-ficha-close-overlay .sheet-title')?.innerText || '', opcoes: [...document.querySelectorAll('.aviso-opcao')].map(o => o.innerText.trim()), botao: document.getElementById('aviso-ficha-enviar').disabled }));
  ok(r.t === 'Informar um problema' && r.opcoes.length === 5 && r.opcoes[0] === 'O WhatsApp não é desta academia' && r.botao, 'a janela com as 5 opções, como o "Sugerir uma alteração" do Google; sem escolher, não envia');
  await page.click('.aviso-opcao input[value="preco_horario"]');
  await page.fill('#aviso-detalhes', 'A aula custa R$ 150.');
  await page.click('#aviso-ficha-enviar');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ tela: state.jogadorTela, sub: document.querySelector('#jogador-overlay')?.innerText || '' }));
  ok(r.tela === 'codigo' && r.sub.includes('Falta só confirmar o seu e-mail'), 'conta sem o e-mail confirmado: o código primeiro — ' + r.tela);
  await page.fill('#jog-codigo', '123456');
  await page.click('#jog-confirmar');
  await page.waitForTimeout(600);
  r = await page.evaluate(() => ({ p: window.__db.problemas_na_ficha[0], feito: document.querySelector('#aviso-ficha-close-overlay')?.innerText || '' }));
  ok(r.p && r.p.motivo === 'preco_horario' && r.p.detalhes === 'A aula custa R$ 150.' && r.feito.includes('Obrigado por avisar') && r.feito.includes('a academia fica sabendo'),
    'confirmado o e-mail, o aviso sai sozinho e a janela agradece');
  await page.click('#aviso-ficha-ok');
  // Dois jogadores dizem que o WhatsApp não é da academia: o botão sai.
  await page.evaluate(() => { window.__db.problemas_na_ficha.push({ id: 'prob-x', academia_id: 'a1', user_id: 'j-outro', motivo: 'whatsapp', detalhes: null, criado_em: new Date().toISOString(), resolvido_em: null }); });
  await page.click('#informar-problema');
  await page.waitForTimeout(150);
  await page.click('.aviso-opcao input[value="whatsapp"]');
  await page.click('#aviso-ficha-enviar');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ feito: document.querySelector('#aviso-ficha-close-overlay')?.innerText || '', db: window.__db.academias.find(a => a.id === 'a1') }));
  ok(r.feito.includes('o botão do WhatsApp saiu da ficha') && !r.db.phone && r.db.whatsapp_em_revisao_numero === '11999990001', 'o segundo aviso tira o botão do WhatsApp até o GuiaTennis conferir');
  await page.click('#aviso-ficha-ok');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => !document.querySelector('.courtpage a[data-track="whatsapp"]')), 'a ficha fica sem o botão na hora');
  await browser.close();

  // ---- avaliar pede o e-mail confirmado; "Fazer isso depois" não avalia ----
  ({ browser, page } = await abrir({ jogador: true }));
  await abrirFicha(page, 'a2');
  ok((await texto(page, '.rate-box')).includes('Para avaliar, confirme o seu e-mail'), 'conta sem confirmar: a caixa avisa antes');
  await page.click('#star-picker span[data-star="4"]');
  await page.check('#rate-consent');
  await page.click('#rate-submit');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => state.jogadorTela === 'codigo'), 'enviar a avaliação abre o código do e-mail');
  await page.click('#jog-depois');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ n: window.__db.avaliacoes.length, erro: document.querySelector('.rate-box .form-error')?.innerText || '' }));
  ok(r.n === 0 && r.erro.includes('Confirme o seu e-mail para avaliar'), '"Fazer isso depois": não avalia e diz por quê — ' + r.erro);
  await page.click('#rate-submit');
  await page.waitForTimeout(400);
  await page.fill('#jog-codigo', '123456');
  await page.click('#jog-confirmar');
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => window.__db.avaliacoes.length === 1 && !!document.querySelector('.rate-thanks')), 'confirmado o e-mail, a avaliação sai');
  await browser.close();

  // ---- "Denunciar" na avaliação ----
  const AVALIACOES = [{ id: 'r9', academia_id: 'a1', stars: 1, comment: 'Compre na loja X', nome_autor: 'Spam', contato_autor: 's@x.com', created_at: diasAtras(2) }];
  ({ browser, page } = await abrir({ avaliacoes: AVALIACOES }));
  await abrirFicha(page, 'a1');
  await page.click('[data-denunciar="r9"]');
  await page.waitForTimeout(200);
  r = await page.evaluate(() => ({ t: document.querySelector('#aviso-ficha-close-overlay .sheet-title')?.innerText || '', n: document.querySelectorAll('.aviso-opcao').length }));
  ok(r.t === 'Denunciar a avaliação' && r.n === 5, '"Denunciar": a janela com os motivos');
  await page.click('.aviso-opcao input[value="propaganda"]');
  await page.click('#aviso-ficha-enviar');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.jogadorTela === 'email'), 'sem conta, pede para entrar');
  await browser.close();
  ({ browser, page } = await abrir({ jogador: true, avaliacoes: AVALIACOES }));
  await abrirFicha(page, 'a1');
  await page.click('[data-denunciar="r9"]');
  await page.waitForTimeout(150);
  await page.click('.aviso-opcao input[value="propaganda"]');
  await page.click('#aviso-ficha-enviar');
  await page.waitForTimeout(300);
  r = await page.evaluate(() => ({ d: window.__db.denuncias_de_avaliacao[0], feito: document.querySelector('#aviso-ficha-close-overlay')?.innerText || '' }));
  ok(r.d && r.d.motivo === 'propaganda' && r.feito.includes('Denúncia enviada'), 'logado, denuncia (sem precisar do código: como o Google)');
  await browser.close();

  // ---- a academia vê o que foi informado, sem saber quem; salvar resolve ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel', plano: 'premium' }));
  await page.evaluate(async () => {
    window.__db.academias.find(a => a.id === 'a1').plano = 'premium';
    window.__db.problemas_na_ficha.push({ id: 'p1', academia_id: 'a1', user_id: 'j-z', motivo: 'preco_horario', detalhes: 'A aula custa R$ 150.', criado_em: new Date().toISOString(), resolvido_em: null });
    await loadEverything(); irParceiros('painel', { mesmaAba: true });
  });
  await page.waitForTimeout(400);
  cartao = await texto(page, '#parceiros .pc-problemas');
  ok(cartao.toLowerCase().includes('um jogador informou') && cartao.includes('o preço ou o horário está errado') && cartao.includes('A aula custa R$ 150.') && cartao.includes('Confira a ficha e salve') && !cartao.includes('j-z'),
    'Atualizações: o que o jogador informou, sem dizer quem — ' + cartao.slice(0, 120));
  ok(await page.evaluate(() => { const c = state.selected; openCourt('a1'); const tem = !!document.getElementById('informar-problema'); return !tem; }), 'na própria ficha, a academia não vê "Informar um problema" (corrige em Minha ficha)');
  await page.evaluate(() => irParceiros('painel', { mesmaAba: true }));
  await page.waitForTimeout(300);
  await page.click('#parceiros .pc-problemas .editar-academia');
  await page.waitForTimeout(300);
  await salvarFicha(page);
  await page.waitForTimeout(700);
  ok(await page.evaluate(() => window.__db.problemas_na_ficha[0].resolucao === 'academia_salvou'), 'salvar a ficha resolve o aviso');
  await browser.close();

  // ---- o admin: Pendências e o "Conferir" com dados de fora ----
  const RECEITA = { cnpj: '11222333000181', razao_social: 'ARENA EXEMPLO LTDA', nome_fantasia: 'SO AULA TENNIS', situacao: 'ATIVA', situacao_desde: '2015-03-02', abertura: '2015-03-02',
    atividade: '9311500 · Gestão de instalações de esportes', endereco: 'RUA A, 1', bairro: 'PINHEIROS', cidade: 'SAO PAULO', uf: 'SP', cep: '05422000', telefones: ['(11) 99999-0001'], email: 'contato@soaula.com', fonte: 'BrasilAPI' };
  const OVERPASS = { elements: [{ type: 'node', id: 1, lat: -23.5601, lon: -46.6801, tags: { name: 'Só Aula Tennis', phone: '+55 11 99999-0001', sport: 'tennis' } }] };
  ({ browser, page } = await abrir({ admin: true, q: 'admin/pendencias', w: 1280, cnpj: RECEITA, overpass: OVERPASS, avaliacoes: AVALIACOES }));
  await page.evaluate(async () => {
    const agora = new Date().toISOString();
    Object.assign(window.__db.academias.find(a => a.id === 'a2'), { whatsapp_a_confirmar: '(11) 96666-2222', whatsapp_antes: '11999990002', whatsapp_pedido_em: agora, whatsapp_codigo_ok_em: agora });
    Object.assign(window.__db.academias.find(a => a.id === 'a1'), { whatsapp_a_confirmar: '(11) 95555-1111', whatsapp_pedido_em: agora });
    window.__db.problemas_na_ficha.push({ id: 'p2', academia_id: 'a1', user_id: 'j-z', motivo: 'whatsapp', detalhes: 'Atendeu outra empresa.', criado_em: agora, resolvido_em: null },
      { id: 'p3', academia_id: 'a1', user_id: 'j-y', motivo: 'endereco', detalhes: null, criado_em: agora, resolvido_em: null });
    window.__db.denuncias_de_avaliacao.push({ avaliacao_id: 'r9', user_id: 'j-z', motivo: 'propaganda', criado_em: agora, resolvido_em: null });
    await loadEverything(); irAdmin('pendencias');
  });
  await page.waitForTimeout(500);
  const pend = await texto(page, '#painel-admin');
  ok(pend.includes('WhatsApp para confirmar') && pend.includes('Aprovar a troca') && pend.includes('Aprovar sem código') && pend.includes('Problemas informados nas fichas') && pend.includes('Avaliações denunciadas'),
    'Pendências: WhatsApp para confirmar, problemas informados e avaliações denunciadas');
  await page.evaluate(() => irAdmin('inicio'));
  await page.waitForTimeout(300);
  const inicio = await texto(page, '#painel-admin');
  ok(inicio.includes('2 WhatsApps novos esperando você') && inicio.includes('1 ficha com problema informado') && inicio.includes('1 avaliação denunciada'), 'Para fazer agora conta tudo isso');
  await page.evaluate(() => irAdmin('pendencias'));
  await page.waitForTimeout(300);
  await page.click('[data-whats-gerar="a1"]');
  await page.waitForTimeout(300);
  r = await page.evaluate(() => ({ cod: document.querySelector('.adm-codigo')?.innerText || '', link: document.querySelector('.adm-codigo a')?.href || '' }));
  ok(r.cod.includes('654321') && r.link.startsWith('https://wa.me/5511955551111') && decodeURIComponent(r.link).includes('código para confirmar o WhatsApp da Só Aula Tennis'),
    '"Gerar código": o código e o link que abre o WhatsApp do admin com a mensagem para o número novo');
  await page.click('[data-whats-aprovar="a2"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => window.__db.academias.find(a => a.id === 'a2').phone === '(11) 96666-2222'), '"Aprovar a troca": o número novo entra na ficha');
  // Conferir: Google Maps, mapa aberto e Receita.
  await page.click('.whatsapp-item [data-adm-conferir="a1"]');
  await page.waitForTimeout(200);
  r = await page.evaluate(() => ({ maps: document.querySelector('.adm-conferir a[href*="google.com/maps/search"]')?.href || '', t: document.querySelector('.adm-conferir')?.innerText || '' }));
  ok(r.maps.includes(encodeURIComponent('Só Aula Tennis')) && r.t.includes('Mapa aberto') && r.t.includes('Receita Federal'), '"Conferir": Google Maps (link), mapa aberto e Receita, lado a lado com a ficha');
  await page.click('[data-conferir-mapa="a1"]');
  await page.waitForTimeout(500);
  ok((await texto(page, '.adm-conferir-lista')).includes('Só Aula Tennis') && (await texto(page, '.adm-conferir-lista')).includes('✓ o mesmo número da ficha'), 'mapa aberto: o lugar perto, com o telefone, marcando quando é o mesmo da ficha');
  await page.fill('#conferir-cnpj', '11.222.333/0001-81');
  await page.click('[data-conferir-cnpj="a1"]');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => document.querySelector('.adm-receita')?.innerText || '');
  ok(r.includes('SO AULA TENNIS') && r.includes('Situação: ATIVA') && r.includes('✓ o mesmo número da ficha') && r.includes('✓ a mesma cidade') && r.includes('BrasilAPI'),
    'Receita: situação ativa, o telefone e a cidade conferidos com a ficha, e a fonte');
  // Problemas e denúncias.
  await page.click('[data-problema-resolver="p3"][data-resolucao="corrigido"]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__db.problemas_na_ficha.find(p => p.id === 'p3').resolucao === 'corrigido'), 'o admin marca o aviso como corrigido');
  await page.click('[data-whats-manter="a1"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => window.__db.problemas_na_ficha.find(p => p.id === 'p2').resolucao === 'whatsapp_mantido'), '"O WhatsApp é da academia: manter" resolve os avisos do WhatsApp');
  page.once('dialog', d => d.accept());
  await page.click('[data-denuncia-remover="r9"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => !window.__db.avaliacoes.some(x => x.id === 'r9')), '"Remover a avaliação" tira a avaliação denunciada');
  await browser.close();

  // ---- banco sem o SQL novo: nada quebra ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/painel' }));
  await page.evaluate(async () => { window.__semVeracidade = true; await recarregarConta(); await loadEverything(); irParceiros('painel', { mesmaAba: true }); });
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => !document.querySelector('.pc-whatsapp-novo') && !document.querySelector('.pc-problemas') && document.querySelector('#parceiros h1')?.innerText.startsWith('Olá')),
    'sem o SQL: Atualizações abre normal, sem os cartões novos');
  await browser.close();
})();
