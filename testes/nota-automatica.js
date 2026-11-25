// Regra 331 (25/11/2026: "não, já quero fazer agora"): a nota fiscal
// automática pela Prefeitura de São Paulo. No admin (Compras e notas), o
// cartão "Nota fiscal automática": o certificado A1, Testar com a Prefeitura,
// Processar a fila, Configurar (ligada, Teste ou Produção, código, alíquota,
// série, descrição) e a situação da nota em cada compra. Em Pagamentos, a
// academia tem "Ver a nota fiscal". Banco sem o SQL novo: tudo segue à mão.
const { abrir, ok } = require('./harness');
const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const PAGA = '00000000-0000-4000-8000-0000000000a1';
const COM_ERRO = '00000000-0000-4000-8000-0000000000a2';
const EMITIDA = '00000000-0000-4000-8000-0000000000a3';

(async () => {
  const pedidos = [];
  let { browser, page } = await abrir({
    admin: true, q: 'admin/compras',
    notaFiscal: (corpo, cab) => {
      pedidos.push({ corpo, auth: cab.authorization || '' });
      if (corpo.acao === 'testar') return { ok: true, resultado: 'Tudo certo: a Prefeitura aceitou a nota de teste.' };
      if (corpo.acao === 'emitir') return { compra: corpo.compra, situacao: 'emitida', numero: 99 };
      if (corpo.acao === 'processar') return { feitos: [{ situacao: 'emitida' }, { situacao: 'erro' }] };
      if (corpo.acao === 'certificado') return corpo.senha === 'certa' ? { ok: true, titular: 'BRENO COPPINI MARINHO LTDA', valido_ate: '2027-11-20T00:00:00Z' } : { __status: 400, erro: 'A senha do certificado não confere.' };
      return { __status: 400, erro: 'Ação inválida.' };
    },
  });
  await page.evaluate(([a, b, c]) => {
    const agora = new Date().toISOString();
    const compra = (id, valor) => ({ id, academia_id: 'a1', valor, forma: 'pix', situacao: 'paga', tipo: 'creditos', paga_em: agora, created_at: agora, nota_documento: '12345678000195', nota_nome: 'SO AULA LTDA', nota_email: 'fin@soaula.com.br' });
    window.__compras = [compra(a, 100), compra(b, 50), { ...compra(c, 49), tipo: 'plano', plano: 'premium', periodo: 'mensal', nota_emitida_em: agora }];
    window.__notaCfg = { certificado_titular: 'BRENO COPPINI MARINHO LTDA', certificado_valido_ate: '2027-11-20T00:00:00Z', certificado_cnpj: '70120796000100' };
    window.__notas = {
      [b]: { compra_id: b, situacao: 'erro', mensagem: 'Erro 1057: Código de serviço inválido', tentativas: 3, atualizada_em: agora },
      [c]: { compra_id: c, situacao: 'emitida', numero_nfe: 17943, codigo_verificacao: 'PH5GL6XU', atualizada_em: agora },
    };
    state.admCompras = undefined; carregarComprasDoAdmin();
  }, [PAGA, COM_ERRO, EMITIDA]);
  await page.waitForTimeout(500);
  let cartao = await texto(page, '#adm-nota-auto');
  ok(cartao.includes('Nota fiscal automática') && cartao.includes('Certificado A1: BRENO COPPINI MARINHO LTDA · válido até') && cartao.includes('Emissão: desligada. Emita as notas à mão (abaixo).')
    && cartao.includes('Código 02917 · ISS 2,01% · série GT') && cartao.includes('com erro: 1'),
    'o cartão: o certificado, a emissão, o código, o ISS e a fila — ' + cartao.slice(0, 220));
  ok(['Trocar o certificado A1', 'Testar com a Prefeitura', 'Processar a fila', 'Configurar'].every(t => cartao.includes(t)), 'com os quatro botões');
  const lista = await texto(page, '#adm-nota-auto + .adm-bloco');
  ok(lista.includes('portal da NFS-e da Prefeitura de São Paulo') && lista.includes('nota com erro: Erro 1057: Código de serviço inválido') && lista.includes('Emitir de novo') && lista.includes('Emitir a nota') && lista.includes('Nota emitida à mão'),
    'Notas para emitir: a situação de cada nota, "Emitir de novo" no erro, "Emitir a nota" na que não tem e o "Nota emitida à mão" — ' + lista.slice(0, 260));
  const link = await page.evaluate(() => [...document.querySelectorAll('a')].find(a => /notaprint\.aspx/.test(a.href))?.href || '');
  ok(link === 'https://nfe.prefeitura.sp.gov.br/contribuinte/notaprint.aspx?ccm=05930642&nf=17943&cod=PH5GL6XU', 'a nota emitida: "nota n.º 17943 Ver", com o link da Prefeitura — ' + link);

  // Testar com a Prefeitura.
  await page.click('#adm-nota-testar');
  await page.waitForTimeout(500);
  ok(pedidos.at(-1).corpo.acao === 'testar' && pedidos.at(-1).auth === 'Bearer token-do-admin' && (await page.evaluate(() => document.body.innerText)).includes('Tudo certo: a Prefeitura aceitou a nota de teste.'),
    '"Testar com a Prefeitura" chama a função com a sessão do admin e mostra o resultado');
  // Emitir de novo a nota com erro.
  await page.click(`[data-nota-emitir="${COM_ERRO}"]`);
  await page.waitForTimeout(600);
  ok(pedidos.at(-1).corpo.acao === 'emitir' && pedidos.at(-1).corpo.compra === COM_ERRO && (await page.evaluate(() => document.body.innerText)).includes('Nota n.º 99 emitida.'),
    '"Emitir de novo": volta para a fila e a função emite — Nota n.º 99 emitida.');
  // Processar a fila.
  await page.click('#adm-nota-processar');
  await page.waitForTimeout(500);
  ok((await page.evaluate(() => document.body.innerText)).includes('Fila processada: 2 notas, 1 emitida, 1 com erro.'), 'Processar a fila: o resumo do que saiu');

  // Configurar: ligar em produção pede confirmação.
  await page.click('#adm-nota-configurar');
  await page.waitForTimeout(200);
  ok(await page.isVisible('#adm-nota-codigo') && (await page.inputValue('#adm-nota-aliquota')) === '2,01', 'Configurar: os campos, com a alíquota em %');
  await page.click('[data-nota-ligada="1"]');
  await page.click('[data-nota-ambiente="producao"]');
  let confirmou = '';
  page.once('dialog', d => { confirmou = d.message(); d.accept(); });
  await page.fill('#adm-nota-aliquota', '3,5');
  await page.click('#adm-nota-salvar');
  await page.waitForTimeout(400);
  const cfg = await page.evaluate(() => window.__notaCfg);
  ok(/emite uma nota fiscal de verdade/.test(confirmou) && cfg.ligada && cfg.ambiente === 'producao' && cfg.aliquota === 0.035, 'ligar em Produção pede confirmação e salva (ISS de 3,5%) — ' + JSON.stringify({ ligada: cfg.ligada, ambiente: cfg.ambiente, aliquota: cfg.aliquota }));
  cartao = await texto(page, '#adm-nota-auto');
  ok(cartao.includes('Emissão: ligada. Cada compra paga emite a nota na Prefeitura.'), 'o cartão mostra a emissão ligada');
  await page.click('#adm-nota-configurar');
  await page.fill('#adm-nota-codigo', '12');
  await page.click('#adm-nota-salvar');
  await page.waitForTimeout(300);
  ok((await texto(page, '#adm-nota-auto .form-error')).includes('O código do serviço tem 4 ou 5 números'), 'código errado: o erro no campo, sem salvar');
  await page.click('#adm-nota-cancelar');

  // O certificado: senha errada e certa.
  await page.click('#adm-nota-certificado');
  await page.setInputFiles('#adm-certificado-arquivo', { name: 'a1.pfx', mimeType: 'application/x-pkcs12', buffer: Buffer.from('pfx de mentira') });
  await page.fill('#adm-certificado-senha', 'errada');
  await page.click('#adm-certificado-ok');
  await page.waitForTimeout(400);
  ok((await texto(page, '#adm-certificado-erro')) === 'A senha do certificado não confere.', 'certificado com a senha errada: o erro na janela');
  await page.fill('#adm-certificado-senha', 'certa');
  await page.click('#adm-certificado-ok');
  await page.waitForTimeout(400);
  const envio = pedidos.filter(p => p.corpo.acao === 'certificado').at(-1).corpo;
  ok(!(await page.$('#adm-certificado')) && envio.pfx === Buffer.from('pfx de mentira').toString('base64') && (await page.evaluate(() => document.body.innerText)).includes('Certificado guardado: BRENO COPPINI MARINHO LTDA, válido até'),
    'certificado certo: o arquivo vai em base64 e aparece "Certificado guardado"');
  await browser.close();

  // ---- Banco sem o SQL novo: nada do cartão, as notas seguem à mão ----
  ({ browser, page } = await abrir({ admin: true, q: 'admin/compras' }));
  await page.evaluate((a) => {
    window.__semNotaAutomatica = true;
    window.__compras = [{ id: a, academia_id: 'a1', valor: 100, forma: 'pix', situacao: 'paga', tipo: 'creditos', paga_em: new Date().toISOString(), created_at: new Date().toISOString(), nota_documento: '12345678000195' }];
    state.admCompras = undefined; carregarComprasDoAdmin();
  }, PAGA);
  await page.waitForTimeout(500);
  ok(!(await page.$('#adm-nota-auto')) && !(await page.$('[data-nota-emitir]')) && (await page.$('[data-nota-emitida]')), 'banco antigo: sem o cartão; a nota segue à mão');
  await browser.close();

  // ---- Em Pagamentos, a academia vê "Ver a nota fiscal" ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/pagamentos', premium: ['a1'] }));
  await page.evaluate((c) => {
    const agora = new Date().toISOString();
    window.__compras = [{ id: c, academia_id: 'a1', valor: 49, forma: 'cartao', situacao: 'paga', tipo: 'plano', plano: 'premium', periodo: 'mensal', paga_em: agora, created_at: agora, nota_emitida_em: agora, nota_email: 'fin@soaula.com.br' }];
    window.__notas = { [c]: { compra_id: c, situacao: 'emitida', numero_nfe: 17943, codigo_verificacao: 'PH5GL6XU' } };
    carregarComprasDaAcademia();
  }, EMITIDA);
  await page.waitForTimeout(500);
  const compras = await texto(page, '#pc-pag-compras');
  const verNota = await page.evaluate(() => [...document.querySelectorAll('#pc-pag-compras a')].find(a => a.innerText === 'Ver a nota fiscal')?.href || '');
  ok(verNota.includes('notaprint.aspx?ccm=05930642&nf=17943&cod=PH5GL6XU') && !compras.includes('nota fiscal enviada'), 'Pagamentos: "Ver a nota fiscal" com o link da Prefeitura — ' + compras.slice(0, 160));
  await browser.close();
})();
