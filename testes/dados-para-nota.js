// Dados para a nota fiscal (pedido do Breno em 10/11/2026, regra 231: "mas
// como saber o cnpj da academia" / "sim"). Como os "dados de faturamento" do
// Google Ads e da Meta: a academia informa antes da primeira compra para quem
// sai a nota; o admin vê os dados prontos para copiar no Emissor Nacional e
// marca "Nota emitida".
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);
const PREVIA = 'deploy-preview-5--guiatennis.netlify.app';
const desligada = async (page) => page.route('**/.netlify/functions/pagamento', r => r.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));

(async () => {
  // ---- A validação do CNPJ e do CPF (a mesma do banco) ----
  let { browser, page } = await abrir({});
  const docs = await page.evaluate(() => [documentoValido('11.222.333/0001-81'), documentoValido('11.222.333/0001-82'), documentoValido('12.abc.345/01de-35'),
    documentoValido('529.982.247-25'), documentoValido('111.111.111-11'), documentoBonito('11222333000181'), documentoBonito('52998224725')]);
  ok(docs[0] === '11222333000181' && docs[1] === '' && docs[2] === '12ABC34501DE35' && docs[3] === '52998224725' && docs[4] === '' && docs[5] === '11.222.333/0001-81' && docs[6] === '529.982.247-25',
    'CNPJ (também com letras) e CPF com os dígitos certos; errado ou repetido não vale — ' + JSON.stringify(docs));
  await browser.close();

  // ---- Regra 232: a compra começa pelos dados do comprador; a máscara do CPF ou CNPJ ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes-email', premium: ['a1'], host: PREVIA, pagamentoDeTeste: true, semDadosParaNota: true,
    cnpj: { cnpj: '11222333000181', razao_social: 'SO AULA TENNIS LTDA', situacao: 'ATIVA' } }));
  await desligada(page);
  await page.waitForTimeout(500);
  await page.click('#pc-comprar-creditos');
  await page.waitForTimeout(500);
  const etapaAgora = () => page.evaluate(() => (document.querySelector('.pc-checkout-trilha li.agora') || {}).innerText || '');
  let corpo = await texto(page, '#parceiros .pc-main');
  ok(corpo.includes('Dados do comprador') && await page.$('#nota-doc') && await page.$('#pc-compra-dados') && !(await page.$('#pc-compra-pagar')) && (await etapaAgora()).includes('Dados do comprador'),
    'a compra começa pelos dados do comprador, antes do pagamento');
  ok((await page.inputValue('#nota-email')).includes('@'), 'o e-mail já vem com o da conta — ' + await page.inputValue('#nota-email'));
  await page.click('#pc-compra-dados');
  await page.waitForTimeout(400);
  ok((await texto(page, '#parceiros .pc-main')).includes('Confira o CNPJ ou o CPF da nota fiscal.') && await page.evaluate(() => !(window.__notasSalvas || {}).a1 && !(window.__compras || []).length),
    'sem o CNPJ, não passa ao pagamento e diz o que falta');
  await page.fill('#nota-doc', '');
  await page.type('#nota-doc', '1122233300018');
  await page.click('#nota-email');
  await page.waitForTimeout(150);
  ok((await texto(page, '#nota-receita')).includes('Faltam números: o CPF tem 11 e o CNPJ tem 14.'), 'faltando um número, avisa ao sair do campo');
  await page.click('#nota-doc');
  await page.press('#nota-doc', 'End');
  await page.type('#nota-doc', '1');
  await page.waitForTimeout(600);
  ok((await page.inputValue('#nota-doc')) === '11.222.333/0001-81', 'digitando só os números, o site coloca os pontos, a barra e o traço — ' + await page.inputValue('#nota-doc'));
  ok((await page.inputValue('#nota-nome')) === 'SO AULA TENNIS LTDA' && (await texto(page, '#nota-receita')).includes('Receita Federal'), 'com o CNPJ, a razão social vem da Receita');
  await page.fill('#nota-email', 'financeiro@soaula.com.br');
  await page.click('#pc-compra-dados');
  await page.waitForTimeout(600);
  let salvo = await page.evaluate(() => (window.__notasSalvas || {}).a1);
  corpo = await texto(page, '#parceiros .pc-main');
  ok(salvo && salvo.documento === '11222333000181' && salvo.nome === 'SO AULA TENNIS LTDA' && salvo.email === 'financeiro@soaula.com.br', '"Continuar para o pagamento" grava os dados do comprador — ' + JSON.stringify(salvo));
  ok(corpo.includes('Comprador') && corpo.includes('SO AULA TENNIS LTDA') && corpo.includes('CNPJ 11.222.333/0001-81') && await page.$('#pc-compra-pagar') && (await etapaAgora()).includes('Pagamento'),
    'e passa ao pagamento, com o comprador em cima');
  ok((await texto(page, '#pc-compra-pagar')) === 'Pagar com Pix · R$ 100' && corpo.includes('com o CPF ou CNPJ do comprador'), '"Pagar com Pix · R$ 100", processado com o CPF ou CNPJ do comprador');
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(800);
  const compra = await page.evaluate(() => (window.__compras || [])[0] || {});
  ok(compra.nota_documento === '11222333000181' && compra.nota_email === 'financeiro@soaula.com.br', 'a compra sai com o comprador');
  await browser.close();

  // ---- Com os dados salvos: a compra abre no pagamento; "Alterar" volta aos dados ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes-email', premium: ['a1'], host: PREVIA, pagamentoDeTeste: true }));
  await desligada(page);
  await page.waitForTimeout(500);
  await page.click('#pc-comprar-creditos');
  await page.waitForTimeout(500);
  let nota = await texto(page, '#pc-nota');
  ok(nota.includes('Comprador') && nota.includes('Academia Teste Ltda') && nota.includes('CNPJ 11.222.333/0001-81') && nota.includes('financeiro@academiateste.com.br') && !(await page.$('#nota-doc')) && await page.$('#pc-compra-pagar'),
    'com os dados salvos, a compra abre direto no pagamento, com o comprador em cima — ' + nota.replace(/\s+/g, ' '));
  await page.click('[data-nota-alterar]');
  await page.waitForTimeout(200);
  ok((await page.inputValue('#nota-doc')) === '11.222.333/0001-81' && (await page.inputValue('#nota-nome')) === 'Academia Teste Ltda' && await page.$('#nota-cancelar') && !(await page.$('#pc-compra-pagar')),
    '"Alterar" volta aos dados do comprador, preenchidos, com "Cancelar"');
  await page.click('#nota-cancelar');
  await page.waitForTimeout(200);
  ok(await page.$('#pc-compra-pagar') && !(await page.$('#nota-doc')), '"Cancelar" volta ao pagamento sem mudar nada');
  await page.click('[data-nota-alterar]');
  await page.waitForTimeout(200);
  await page.fill('#nota-doc', '529.982.247-25');
  await page.fill('#nota-nome', 'Ana Professora');
  await page.click('#pc-compra-dados');
  await page.waitForTimeout(500);
  ok((await texto(page, '#pc-nota')).includes('CPF 529.982.247-25'), 'com pontos e traço, o CPF também vale');
  await page.click('#pc-compra-pagar');
  await page.waitForTimeout(800);
  ok(await page.evaluate(() => (window.__notasSalvas || {}).a1?.documento === '52998224725' && window.__compras[0].nota_nome === 'Ana Professora'), 'muda para o CPF e a compra sai com os dados novos');
  ok(await page.evaluate(() => mascaraDoDocumento('529 982 247 25') === '529.982.247-25' && mascaraDoDocumento('12abc34501de35') === '12.ABC.345/01DE-35' && mascaraDoDocumento('112223330001810') === '11.222.333/0001-81'),
    'a máscara aceita espaços, letras do CNPJ novo e não passa de 14');
  await browser.close();

  // ---- Pagamentos: sem o cartão dos dados (regra 233) e com a nota enviada ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/pagamentos', completo: ['a1'], semDadosParaNota: true }));
  await page.evaluate(() => { window.__compras = [{ id: 'k1', academia_id: 'a1', valor: 100, forma: 'pix', situacao: 'paga', created_at: '2026-11-10T12:00:00Z', paga_em: '2026-11-10T12:01:00Z', nota_emitida_em: '2026-11-10T15:00:00Z', nota_email: 'fin@soaula.com.br' }]; });
  await page.evaluate(() => carregarComprasDaAcademia());
  await page.waitForTimeout(600);
  ok(!(await page.$('#pc-pag-nota')) && !(await page.$('#nota-doc')) && !(await texto(page, '#parceiros .pc-main')).includes('Dados para a nota fiscal'),
    'regra 233: Pagamentos não tem mais o cartão "Dados para a nota fiscal" (os dados ficam no começo da compra)');
  ok((await texto(page, '#pc-pag-compras')).includes('nota fiscal enviada para fin@soaula.com.br'), 'a compra mostra que a nota foi enviada');
  await browser.close();

  // ---- Banco sem o SQL: a compra segue como antes ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/promocoes-email', premium: ['a1'], semNotaNoBanco: true }));
  await page.waitForTimeout(500);
  await page.click('#pc-comprar-creditos');
  await page.waitForTimeout(500);
  ok(!(await page.$('#pc-nota')) && !(await page.$('#nota-doc')) && await page.$('#pc-compra-pagar'), 'banco sem o SQL: a compra abre no pagamento, sem os dados do comprador');
  await browser.close();

  // ---- Admin: Compras e notas ----
  ({ browser, page } = await abrir({ admin: true, q: 'admin', w: 1280 }));
  await page.evaluate(() => { const hoje = new Date().toISOString(); window.__compras = [
    { id: 'k1', academia_id: 'a1', valor: 100, forma: 'pix', situacao: 'paga', created_at: hoje, paga_em: hoje, nota_documento: '11222333000181', nota_nome: 'Só Aula Tennis Ltda', nota_email: 'fin@soaula.com.br' },
    { id: 'k2', academia_id: 'a1', valor: 49, forma: 'cartao', situacao: 'paga', tipo: 'plano', plano: 'completo', periodo: 'mensal', de_teste: true, created_at: hoje, paga_em: hoje },
    { id: 'k3', academia_id: 'a2', valor: 50, forma: 'pix', situacao: 'paga', created_at: '2026-09-01T12:00:00Z', paga_em: '2026-09-01T12:00:00Z', nota_documento: '52998224725', nota_nome: 'Ana Professora', nota_email: 'ana@exemplo.com' }]; });
  await page.click('.adm-nav [data-adm-aba="compras"]');
  await page.waitForTimeout(500);
  let adm = (await texto(page, '#painel-admin')).replace(/\s+/g, ' ');
  ok(await page.evaluate(() => location.pathname === '/admin/compras') && adm.includes('Compras e notas') && adm.includes('Notas para emitir') && adm.includes('Emissor Nacional'), 'o menu tem "Compras e notas" (/admin/compras)');
  ok(adm.includes('CNPJ 11.222.333/0001-81') && adm.includes('Só Aula Tennis Ltda') && adm.includes('fin@soaula.com.br') && adm.includes('R$ 100,00') && adm.includes('CPF 529.982.247-25'),
    'as notas para emitir, com o CNPJ ou CPF, a razão social, o e-mail e o valor, também a de mais de 30 dias');
  ok(/Notas para emitir.*Teste.*Compras de créditos e planos/i.test(adm) && (await page.$$('[data-nota-emitida]')).length === 3, 'a compra de teste também aparece, com "Teste" (para testar na prévia)');
  ok((await texto(page, '.adm-nav [data-adm-aba="compras"]')).includes('3'), 'o menu mostra quantas notas faltam');
  await page.evaluate(() => { window.__copiado = ''; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t) => { window.__copiado = t; return Promise.resolve(); } } }); });
  await page.click('[data-copiar="11222333000181"]');
  await page.waitForTimeout(100);
  ok(await page.evaluate(() => window.__copiado) === '11222333000181' && (await texto(page, '[data-copiar="11222333000181"]')) === 'Copiado', 'tocar no CNPJ copia só os números');
  await page.click('[data-nota-emitida="k1"]');
  await page.waitForTimeout(400);
  adm = (await texto(page, '#painel-admin')).replace(/\s+/g, ' ');
  ok(await page.evaluate(() => !!window.__compras.find(x => x.id === 'k1').nota_emitida_em) && adm.includes('nota emitida Desmarcar') && (await page.$$('[data-nota-emitida]')).length === 2, '"Nota emitida" tira da lista e marca a compra');
  await page.click('[data-nota-desmarcar="k1"]');
  await page.waitForTimeout(400);
  ok((await page.$$('[data-nota-emitida]')).length === 3, '"Desmarcar" devolve à lista');
  ok(await page.evaluate(() => ADM_TIPOS_DE_EMAIL.nota_a_emitir === 'Nota fiscal para emitir' && abaDoAviso('nota_a_emitir') === 'compras'), 'o aviso "Nota fiscal para emitir" leva a Compras e notas');
  await browser.close();

  // ---- Privacidade, Termos e ajuda ----
  ({ browser, page } = await abrir({}));
  ok(await page.evaluate(() => PRIVACY_HTML.includes('Para a nota fiscal das compras, guardamos os dados que a academia informa') && PRIVACY_HTML.includes('Do visitante e do jogador, não coletamos CPF')
    && TERMS_HTML.includes('Toda compra, de créditos ou do plano, começa pelos dados do comprador') && PRIVACY_HTML.includes('o CPF ou CNPJ, o nome e o e-mail do comprador vão ao Mercado Pago') && TERMS_HTML.includes('Última atualização: 11 de novembro de 2026') && PRIVACY_HTML.includes('Última atualização: 11 de novembro de 2026')),
    'Privacidade e Termos falam dos dados para a nota, com a data nova');
  await browser.close();
})();
