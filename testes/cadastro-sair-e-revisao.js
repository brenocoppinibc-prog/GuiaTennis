// Pedidos do Breno em 21/10/2026, com prints do cadastro no celular:
// - "se clicar no X para sair do cadastro, aparecer algum push para confirmar
//   se é isso mesmo que quer fazer e avisar do que pode acontecer (apagar os
//   dados)";
// - "deixe um pouco mais separado isso do restante" (a escolha "Mesma regra
//   para tudo / Aula e locação diferentes" no cancelamento);
// - no começo do cadastro, só "Com o seu e-mail confirmado, a academia entra
//   no ar quando você finalizar." (sem "Os seus dados de contato já vão
//   junto…": "na verdade eu quero que isso saia e o outro volta").
const { abrir, ok, irParte, salvarFicha } = require('./harness');

const texto = (page, sel) => page.evaluate((sel) => (document.querySelector(sel)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const aberto = (page) => page.evaluate(() => !!document.getElementById('register-overlay'));

(async () => {
  // ---- conta de parceiro, e-mail confirmado: academia nova ----
  let { browser, page } = await abrir({ q: 'parceiros/cadastro' });
  await page.evaluate(async () => {
    window.__db.academia_acessos.push({ user_id: 'u-rui', academia_id: null, usuario: 'rui@exemplo.com', nome_responsavel: 'Rui Dono', email: 'rui@exemplo.com', whatsapp: '11988881111', papel: 'principal', dados_completos_em: '2026-10-01', senha_trocada_em: '2026-10-01', termos_aceitos_em: '2026-10-01', email_confirmado_em: '2026-10-01' });
    window.__senhas['rui@exemplo.com'] = 'senhaforte1';
    await sb.auth.signInWithPassword({ email: 'rui@exemplo.com', password: 'senhaforte1' });
    await recarregarConta(); render();
  });
  await page.click('#pc-nova');
  await page.waitForTimeout(300);
  const contexto = await texto(page, '.reg-contexto');
  ok(contexto === 'Com o seu e-mail confirmado, a academia entra no ar quando você finalizar.', 'o começo diz só que a academia entra no ar ao finalizar, sem "Os seus dados de contato já vão junto" — ' + contexto);

  // Nada preenchido: o X fecha direto.
  await page.click('#register-close');
  await page.waitForTimeout(200);
  ok(!(await aberto(page)) && !(await page.$('#reg-sair-fundo')), 'sem nada preenchido, o X fecha sem perguntar');

  // Preencheu: o X pergunta, dizendo que apaga.
  await page.click('#pc-nova');
  await page.waitForTimeout(300);
  await page.fill('#f-name', 'Arena do Rui');
  await page.click('#register-close');
  await page.waitForTimeout(200);
  ok(await page.isVisible('#reg-sair-fundo .reg-sair') && (await texto(page, '#reg-sair-t')) === 'Sair do cadastro?'
    && (await texto(page, '#reg-sair-s')).includes('O que você preencheu da Arena do Rui vai ser apagado e não volta'), 'com algo preenchido, o X pergunta e avisa que apaga — ' + await texto(page, '.reg-sair'));
  ok((await texto(page, '#reg-sair-sim')) === 'Sair e apagar' && (await texto(page, '#reg-sair-nao')) === 'Continuar o cadastro' && await page.evaluate(() => document.activeElement?.id === 'reg-sair-nao'),
    '"Sair e apagar" e "Continuar o cadastro", com o foco no que não apaga');
  await page.click('#reg-sair-nao');
  await page.waitForTimeout(150);
  ok(await aberto(page) && !(await page.$('#reg-sair-fundo')) && await page.evaluate(() => window.__form.name === 'Arena do Rui'), '"Continuar o cadastro" fecha a pergunta e mantém o que foi preenchido');
  await page.evaluate(() => document.getElementById('register-overlay').click());
  await page.waitForTimeout(150);
  ok(await page.isVisible('#reg-sair-fundo'), 'tocar fora da folha também pergunta');
  await page.evaluate(() => document.getElementById('reg-sair-fundo').click());
  await page.waitForTimeout(150);
  ok(await aberto(page) && !(await page.$('#reg-sair-fundo')), 'tocar fora da pergunta é continuar');
  await page.click('#register-close');
  await page.waitForTimeout(150);
  await page.click('#reg-sair-sim');
  await page.waitForTimeout(200);
  ok(!(await aberto(page)) && await page.evaluate(() => window.__form === null), '"Sair e apagar" fecha e apaga o formulário');
  await page.evaluate(() => { aplicarCamadas(new URLSearchParams('parte=dados')); render(); });
  await page.waitForTimeout(200);
  ok(!(await aberto(page)), 'voltar no navegador para o link da parte não traz de volta o que foi apagado');
  await page.click('#pc-nova');
  await page.waitForTimeout(300);
  ok((await page.inputValue('#f-name')) === '', 'abrindo de novo, começa do zero');

  // Cancelamento: a escolha de aula e locação vem antes, separada das horas.
  await page.evaluate(() => { window.__form.modalidades = ['aulas_proprias', 'locacao']; render(); });
  await irParte(page, 'cancelamento');
  const sep = await page.evaluate(() => {
    const modos = document.querySelector('.pol-modos'), nota = document.querySelector('.reg-trava .footnote'), horas = document.querySelector('.reg-trava [data-reposicao], .reg-trava .pol-reposicao, .reg-trava .chip:not(.pol-modo)');
    const a = modos.getBoundingClientRect(), b = nota.getBoundingClientRect(), estilo = getComputedStyle(modos);
    return { antes: !!(modos.compareDocumentPosition(nota) & Node.DOCUMENT_POSITION_FOLLOWING), espaco: Math.round(b.top - a.bottom), linha: estilo.borderBottomStyle, horasDepois: !!horas && !!(nota.compareDocumentPosition(horas) & Node.DOCUMENT_POSITION_FOLLOWING) };
  });
  ok(sep.antes && sep.espaco >= 18 && sep.linha === 'solid' && sep.horasDepois, '"Mesma regra / Aula e locação" vem primeiro, com espaço e uma linha antes da explicação e das horas — ' + JSON.stringify(sep));
  await browser.close();

  // ---- edição: só pergunta se mudou alguma coisa ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha' }));
  await page.waitForTimeout(400);
  await page.click('.editar-academia');
  await page.waitForTimeout(400);
  for (const parte of ['quadras', 'fotos', 'horario', 'cancelamento', 'chegada', 'revisar']) await irParte(page, parte);
  await page.click('#register-close');
  await page.waitForTimeout(200);
  ok(!(await aberto(page)) && !(await page.$('#reg-sair-fundo')), 'passou por todas as partes sem mudar nada: o X fecha sem perguntar');
  await page.click('.editar-academia');
  await page.waitForTimeout(400);
  await irParte(page, 'contato');
  await page.fill('#f-phone', '11900001111');
  await page.click('#register-close');
  await page.waitForTimeout(200);
  ok((await texto(page, '#reg-sair-t')) === 'Sair sem salvar?' && (await texto(page, '#reg-sair-s')).includes('A ficha continua como estava') && (await texto(page, '#reg-sair-sim')) === 'Sair e descartar as mudanças' && (await texto(page, '#reg-sair-nao')) === 'Continuar editando',
    'mudou: "Sair sem salvar?", dizendo que a ficha continua como estava — ' + await texto(page, '.reg-sair'));
  const antes = await page.evaluate(() => window.__db.academias.find(a => a.id === 'a1').phone);
  await page.click('#reg-sair-sim');
  await page.waitForTimeout(200);
  ok(!(await aberto(page)) && await page.evaluate((antes) => window.__db.academias.find(a => a.id === 'a1').phone === antes, antes), 'descartou: nada foi salvo');

  // Na tela do plano, o X também pergunta; a tela de pronto fecha direto.
  await page.click('.editar-academia');
  await page.waitForTimeout(400);
  await irParte(page, 'contato');
  await page.fill('#f-instagram', '@soaula');
  await salvarFicha(page);
  await page.waitForTimeout(300);
  ok(await page.isVisible('#reg-erro'), 'confirmou a revisão: a tela do que o plano esconde');
  await page.click('#register-close');
  await page.waitForTimeout(150);
  ok(await page.isVisible('#reg-sair-fundo'), 'ali o X também pergunta');
  await page.click('#reg-sair-nao');
  await page.waitForTimeout(150);
  await page.click('.reg-plano-basico');
  await page.waitForTimeout(900);
  await page.click('#register-close');
  await page.waitForTimeout(200);
  ok(!(await aberto(page)) && !(await page.$('#reg-sair-fundo')), 'depois de salvar, o X fecha sem perguntar');
  await browser.close();
  console.log('cadastro-sair-e-revisao.js: fim');
})();
