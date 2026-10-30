// A ficha só mostra o que está certo (pedido do Breno em 26/10/2026: "não
// acho legal aparecer publicamente whatsapp em confirmação, algum grande faz
// isso? mas ainda sim se colocar um número falso, verificado, não pode dar
// erro? quando uma academia avisar que ele fechou, pausar no site, os
// jogadores não querem ver academia fechada; eu quero ter um controle para se
// manter os dados atualizados, algo há 3 meses e aparecer no meu perfil"; SQL
// 20261026180000, regra 157). O "em confirmação" e o primeiro número que
// espera o GuiaTennis estão em veracidade.js; aqui, a academia que avisou que
// fechou sai do site, o controle das fichas paradas no admin e o banco antigo.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const diasAtras = (n) => new Date(Date.now() - n * 86400000).toISOString();

(async () => {
  // ---- a academia avisa que fechou: sai do site na hora ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/academias' });
  await page.waitForTimeout(400);
  await page.click('[data-pedir-saida="a1"]');
  await page.waitForTimeout(150);
  await page.click('#pc-saida-enviar');
  await page.waitForTimeout(700);
  let r = await page.evaluate(() => ({ ac: window.__db.academias.find(a => a.id === 'a1'), p: window.__db.pedidos_para_sair[0], aviso: document.querySelector('#parceiros .conta-aviso')?.innerText || '',
    cartao: (document.querySelector('#parceiros .pc-acad')?.innerText || '').replace(/\s+/g, ' ') }));
  ok(r.ac.pausada && !r.ac.pausada_pela_academia && !r.ac.pausada_ate && r.p.pausa_antes && r.p.pausa_antes.pausada === false,
    'o aviso pausa a ficha pelo GuiaTennis e guarda a pausa de antes');
  ok(r.aviso.includes('a ficha saiu do site') && r.cartao.includes('Fora do site') && r.cartao.includes('A ficha saiu do site na hora'),
    'Suas academias: "Fora do site" e o aviso dizem que a ficha saiu na hora — ' + r.cartao.slice(0, 160));
  ok(!r.cartao.includes('Pausar no site') && !r.cartao.includes('Voltar a aparecer') && !r.cartao.includes('Fale com a gente'),
    'sem "Pausar no site" nem "Voltar a aparecer" enquanto o GuiaTennis confere');
  r = await page.evaluate(async () => (await sb.rpc('pausar_minha_academia', { p_academia: 'a1', p_pausar: false })).error?.message || '');
  ok(r.includes('avisaram que a academia fechou'), 'nem pelo banco a academia volta sozinha — ' + r);
  await page.evaluate(() => irParceiros('ficha'));
  await page.waitForTimeout(400);
  ok((await texto(page, '#parceiros .conta-situacao')).includes('Fora do site: vocês avisaram que a academia fechou'), 'Minha ficha diz que a ficha está fora do site');
  await page.evaluate(() => irParceiros('academias'));
  await page.waitForTimeout(300);
  page.once('dialog', d => d.accept());
  await page.click('[data-cancelar-saida="a1"]');
  await page.waitForTimeout(700);
  r = await page.evaluate(() => ({ ac: window.__db.academias.find(a => a.id === 'a1'), cartao: (document.querySelector('#parceiros .pc-acad')?.innerText || '').replace(/\s+/g, ' ') }));
  ok(!r.ac.pausada && !r.ac.avisou_que_fechou_em && r.cartao.includes('No ar') && r.cartao.includes('Pausar no site'), 'cancelou o aviso: a ficha volta ao site como estava');
  await browser.close();

  // ---- o admin: "Continua aberta" devolve a pausa de antes ----
  ({ browser, page } = await abrir({ admin: true, q: 'admin/pendencias' }));
  await page.evaluate(async () => {
    const ac = window.__db.academias.find(a => a.id === 'a1');
    Object.assign(ac, { pausada: true, pausada_ate: null, pausada_pela_academia: false, avisou_que_fechou_em: new Date().toISOString() });
    window.__db.pedidos_para_sair.push({ id: 'saida-1', academia_id: 'a1', academia_nome: ac.name, user_id: 'u-a1', motivo: 'fechou', detalhes: null, pedido_em: new Date().toISOString(), resolvido_em: null,
      pausa_antes: { pausada: true, ate: new Date(Date.now() + 5 * 86400000).toISOString(), pela_academia: true } });
    await carregarAcessos(); await loadEverything(); render();
  });
  await page.waitForTimeout(300);
  ok((await texto(page, '.pedido-saida')).length > 0 && (await page.evaluate(() => document.body.innerText)).includes('A ficha saiu do site quando a academia avisou'),
    'Pendências: a academia que avisou que fechou, já fora do site');
  ok((await page.evaluate(() => admParaFazer().map(x => x.t).join(' | '))).includes('academia avisou que fechou (já fora do site)'), 'Para fazer agora diz que ela já está fora do site');
  page.once('dialog', d => d.accept(''));
  await page.click('[data-saida-manter="saida-1"]');
  await page.waitForTimeout(500);
  r = await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1'));
  ok(r.pausada && r.pausada_pela_academia && new Date(r.pausada_ate) > new Date() && !r.avisou_que_fechou_em, '"Continua aberta": volta a pausa de antes (a da academia, com a data)');
  await browser.close();

  // ---- o controle das fichas paradas há 3 meses ----
  ({ browser, page } = await abrir({ admin: true, q: 'admin/pendencias' }));
  await page.evaluate(async () => {
    const a1 = window.__db.academias.find(a => a.id === 'a1'), a2 = window.__db.academias.find(a => a.id === 'a2');
    a1.dados_atualizados_em = new Date(Date.now() - 120 * 86400000).toISOString();
    a2.dados_atualizados_em = new Date(Date.now() - 150 * 86400000).toISOString();
    window.__db.academia_acessos.push({ user_id: 'u-paulo', academia_id: 'a1', email: 'paulo@exemplo.com', nome_responsavel: 'Paulo', email_confirmado_em: new Date().toISOString(), avisos_por_email: true });
    window.__db.academia_vinculos.push({ user_id: 'u-paulo', academia_id: 'a1', papel: 'principal' });
    await carregarAcessos(); await loadEverything(); render();
  });
  await page.waitForTimeout(300);
  r = await page.evaluate(() => ({ itens: [...document.querySelectorAll('.ficha-parada-item')].map(x => x.innerText.replace(/\s+/g, ' ')), titulo: document.querySelector('#adm-fichas-paradas .adm-h2')?.innerText || '',
    fazer: admParaFazer().map(x => x.t).join(' | ') }));
  ok(r.titulo.startsWith('Fichas paradas há 3 meses') && r.itens.length === 2 && r.itens[0].startsWith('Quadra Locação') && r.itens[1].startsWith('Só Aula Tennis'),
    'Pendências: as fichas paradas há 3 meses, a mais parada primeiro — ' + r.itens.map(x => x.slice(0, 30)).join(' / '));
  ok(/parada desde \S+ de \d{4} \(4 meses\)/.test(r.itens[0]) && r.itens[0].includes('ficha básica') && r.itens[0].includes('Sem responsável: ninguém para lembrar') && !r.itens[0].includes('Lembrar agora'),
    'a ficha básica sem responsável: desde quando, e que é o GuiaTennis quem confere — ' + r.itens[0].slice(0, 200));
  ok(r.itens[1].includes('confirmada pela academia') && r.itens[1].includes('O lembrete por e-mail sai no próximo envio do dia') && r.itens[1].includes('Lembrar agora') && r.itens[1].includes('Conferi: está certo'),
    'a ficha com responsável: o lembrete automático e "Lembrar agora" — ' + r.itens[1].slice(0, 200));
  ok(r.fazer.includes('2 fichas paradas há mais de 3 meses') || r.fazer.includes('fichas paradas há mais de 3 meses: confira'), 'Para fazer agora conta as fichas paradas — ' + r.fazer);
  await page.click('[data-adm-lembrar-ficha="a1"]');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ email: window.__db.emails_a_enviar.find(e => e.tipo === 'ficha_parada'), item: document.querySelector('[data-ficha-parada="a1"]')?.innerText.replace(/\s+/g, ' ') || '' }));
  ok(r.email && r.email.para === 'paulo@exemplo.com' && r.email.assunto === 'Confira a ficha da Só Aula Tennis no GuiaTennis' && r.item.includes('Lembrete por e-mail em'),
    '"Lembrar agora": o e-mail "Está tudo certo na ficha?" sai, e a lista mostra quando');
  let alerta = '';
  page.once('dialog', d => { alerta = d.message(); d.accept(); });
  await page.click('[data-adm-lembrar-ficha="a1"]');
  await page.waitForTimeout(400);
  ok(alerta.includes('já recebeu o lembrete hoje'), 'um lembrete por dia — ' + alerta);
  page.once('dialog', d => d.accept());
  await page.click('[data-adm-ficha-conferida="a2"]');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ itens: document.querySelectorAll('.ficha-parada-item').length, data: window.__db.academias.find(a => a.id === 'a2').dados_atualizados_em }));
  ok(r.itens === 1 && new Date(r.data).getTime() < Date.now() - 140 * 86400000, '"Conferi: está certo": sai da lista, sem mudar a data que o jogador vê');
  await page.click('[data-adm-conferir="a1"]');
  await page.waitForTimeout(300);
  ok(!!(await page.$('[data-ficha-parada="a1"] .adm-conferir')), '"Conferir" abre o Google Maps, o mapa aberto e a Receita ao lado da ficha');
  await page.evaluate(() => { state.admFiltro = 'paradas'; irAdmin('academias'); });
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ filtro: document.querySelector('[data-adm-filtro="paradas"]')?.innerText.replace(/\s+/g, ' ') || '', lista: [...document.querySelectorAll('.adm-acad-nome strong')].map(x => x.innerText) }));
  ok(r.filtro.startsWith('Paradas há 3 meses') && r.lista.join(',') === 'Só Aula Tennis', 'Academias: o filtro "Paradas há 3 meses" — ' + r.filtro + ' ' + r.lista.join(','));
  await browser.close();

  // ---- banco sem o SQL 20261026180000 ----
  ({ browser, page } = await abrir({ admin: true, q: 'admin/pendencias', semForaDoAr: true }));
  await page.waitForTimeout(300);
  ok((await texto(page, '#adm-fichas-paradas')).includes('entra com o SQL 20261026180000'), 'sem o SQL: o bloco das fichas paradas avisa, e o resto abre normal');
  await browser.close();
})();
