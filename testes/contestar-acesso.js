// Regra 223 (pedido do Breno em 09/11/2026): quem tem acesso à academia
// contesta o acesso de outra pessoa com um pré-questionário (se conhece, quem
// é, o que faz, por quê); nada muda e o GuiaTennis verifica em Pendências.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);

(async () => {
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/pessoas' });
  await page.evaluate(async () => {
    const agora = new Date().toISOString();
    window.__db.academia_acessos.push({ user_id: 'u-eq', academia_id: 'a1', usuario: 'edu@exemplo.com', email: 'edu@exemplo.com', nome_responsavel: 'Edu Equipe', cargo: 'Recepção', papel: 'equipe', dados_completos_em: agora });
    window.__db.academia_vinculos.push({ user_id: 'u-eq', academia_id: 'a1', papel: 'equipe', funcoes: [], created_at: agora });
    await carregarPessoas(); irParceiros('pessoas');
  });
  await page.waitForTimeout(400);
  await page.click('[data-pc-pessoa="u-eq"]');
  await page.waitForTimeout(150);
  ok(!!(await page.$('[data-pc-contestar-acesso="u-eq"]')) && !(await page.$('[data-pc-contestar-acesso="u-a1"]')), 'cada pessoa (menos você) tem "Contestar o acesso"');
  await page.click('[data-pc-contestar-acesso="u-eq"]');
  await page.waitForTimeout(150);
  let form = await texto(page, '#pc-ca-form');
  ok(form.includes('Contestar o acesso de Edu Equipe') && /1\. SOBRE VOCÊ|1\. Sobre você/.test(form) && form.includes('Quem você é na academia?') && form.includes('O que você faz na academia?') && form.includes('Há quanto tempo você está na academia?')
    && form.includes('Você conhece essa pessoa?') && form.includes('Quem ela é na academia?') && form.includes('Você suspeita de algo?') && form.includes('Por que o acesso dela deve ser verificado?') && form.includes('sem dizer quem contestou'),
    'regra 225: primeiro sobre quem contesta (quem é, o que faz, há quanto tempo), depois sobre a outra pessoa (conhece, quem é, suspeita, por quê)');
  await page.click('#pc-ca-enviar');
  await page.waitForTimeout(150);
  ok((await texto(page, '#pc-ca-form .form-error')).includes('Conte quem você é na academia'), 'sem as respostas, não envia: começa pedindo quem você é');
  await page.click('[data-ca-eu="socio"]');
  await page.fill('#pc-ca-meu-faz', 'Sou o dono');
  await page.click('[data-ca-desde="mais_2a"]');
  await page.click('[data-ca-conhece="sim"]');
  await page.click('[data-ca-quem="ex"]');
  await page.waitForTimeout(100);
  ok(!!(await page.$('#pc-ca-faz')) && (await texto(page, '#pc-ca-form')).includes('O que ela faz (ou fazia) na academia?'), 'sabendo quem é, pergunta o que faz na academia');
  await page.click('[data-ca-suspeita="ficha"]');
  await page.click('[data-ca-motivo="saiu"]');
  await page.fill('#pc-ca-faz', 'Recepção, saiu em outubro');
  await page.fill('#pc-ca-detalhes', 'Ainda mexe na ficha.');
  await page.click('#pc-ca-enviar');
  await page.waitForTimeout(400);
  let r = await page.evaluate(() => ({ c: (window.__db.contestacoes_de_acesso || [])[0], email: window.__db.emails_a_enviar.some(e => e.tipo === 'acesso_contestado'),
    lista: document.querySelector('#pc-pessoas')?.innerText || '', aviso: document.querySelector('#parceiros .conta-aviso')?.innerText || '',
    vinc: window.__db.academia_vinculos.some(v => v.user_id === 'u-eq' && v.academia_id === 'a1') }));
  ok(r.c && r.c.contestado === 'u-eq' && r.c.conhece === true && r.c.quem_e === 'ex' && r.c.o_que_faz === 'Recepção, saiu em outubro' && r.c.motivo === 'saiu' && r.c.detalhes === 'Ainda mexe na ficha.' && r.c.contestou_quem_e === 'socio' && r.c.contestou_o_que_faz === 'Sou o dono' && r.c.contestou_desde === 'mais_2a' && r.c.suspeita === 'ficha' && r.email,
    'envia as respostas ao GuiaTennis, que recebe o e-mail');
  ok(r.vinc && r.lista.includes('em verificação pelo GuiaTennis') && r.aviso.includes('Contestação enviada'), 'nada muda: a pessoa continua, marcada "em verificação pelo GuiaTennis" — ' + r.aviso);
  await browser.close();

  // ---- a pessoa contestada responde sobre si, sem saber quem contestou ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel' }));
  await page.evaluate(async () => {
    window.__db.contestacoes_de_acesso = [{ id: 'ca-0', academia_id: 'a1', contestado: 'u-a1', contestou: 'u-dono', conhece: true, quem_e: 'ex', motivo: 'saiu', criado_em: new Date().toISOString(), resolvido_em: null }];
    await recarregarConta(); irParceiros('painel');
  });
  await page.waitForTimeout(400);
  let cartao = await page.evaluate(() => document.querySelector('#pc-ra-form')?.innerText || '');
  ok(cartao.includes('Conte quem você é na') && cartao.includes('nada muda no seu acesso') && !cartao.includes('u-dono') && !cartao.toLowerCase().includes('contestou'),
    'a pessoa contestada vê "Acesso em verificação" e as perguntas sobre si, sem saber quem contestou');
  await page.click('[data-ra-quem="professor"]');
  await page.fill('#pc-ra-faz', 'Dou aulas às terças');
  await page.click('[data-ra-desde="6m_2a"]');
  await page.fill('#pc-ra-texto', 'Continuo na academia.');
  await page.click('#pc-ra-enviar');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ c: window.__db.contestacoes_de_acesso[0], cartao: document.querySelector('.pc-verificacao-acesso')?.innerText || '' }));
  ok(r.c.resposta_quem_e === 'professor' && r.c.resposta_o_que_faz === 'Dou aulas às terças' && r.c.resposta_desde === '6m_2a' && r.c.resposta_texto === 'Continuo na academia.' && r.cartao.includes('Respostas enviadas'),
    'as respostas vão para o GuiaTennis, e o cartão diz que foram enviadas');
  await browser.close();

  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(async () => {
    const agora = new Date().toISOString();
    window.__db.academia_acessos.push(
      { user_id: 'u-dono', academia_id: 'a1', usuario: 'dono@exemplo.com', email: 'dono@exemplo.com', nome_responsavel: 'Dono Certo', cargo: 'Sócio', papel: 'principal', dados_completos_em: agora },
      { user_id: 'u-eq', academia_id: 'a1', usuario: 'edu@exemplo.com', email: 'edu@exemplo.com', nome_responsavel: 'Edu Equipe', cargo: 'Recepção', papel: 'equipe', dados_completos_em: agora });
    window.__db.academia_vinculos.push({ user_id: 'u-dono', academia_id: 'a1', papel: 'principal', created_at: agora }, { user_id: 'u-eq', academia_id: 'a1', papel: 'equipe', created_at: agora });
    window.__db.contestacoes_de_acesso = [{ id: 'ca-0', academia_id: 'a1', contestado: 'u-eq', contestou: 'u-dono', conhece: true, quem_e: 'ex', o_que_faz: 'Recepção', motivo: 'saiu', detalhes: 'Ainda mexe na ficha.', criado_em: agora, resolvido_em: null,
      contestou_quem_e: 'socio', contestou_o_que_faz: 'Dono', contestou_desde: 'mais_2a', suspeita: 'ficha', resposta_quem_e: 'funcionario', resposta_o_que_faz: 'Recepção', resposta_desde: '6m_2a', respondido_em: agora }];
    await carregarAcessos(); await loadEverything(); irAdmin('pendencias');
  });
  await page.waitForTimeout(500);
  const painel = await page.evaluate(() => document.body.innerText);
  ok(painel.includes('Acessos contestados') && painel.includes('Contestado: Edu Equipe, Recepção') && painel.includes('Quem contestou: Dono Certo, Sócio') && painel.includes('Quem é: Ex-funcionário(a) ou ex-sócio(a)') && painel.includes('Motivo: Saiu da academia') && painel.includes('Quem contestou diz que é: Sócio(a) ou dono(a) · Dono · Mais de 2 anos') && painel.includes('Suspeita: Muda a ficha sem autorização') && painel.includes('Resposta de Edu Equipe: Funcionário(a) · Recepção · De 6 meses a 2 anos'),
    'o admin vê os dois lados e as respostas, para verificar');
  page.once('dialog', d => d.accept());
  await page.click('[data-ca-tirar="ca-0"]');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ vinc: window.__db.academia_vinculos.some(v => v.user_id === 'u-eq' && v.academia_id === 'a1'), c: window.__db.contestacoes_de_acesso[0], bloco: !!document.querySelector('.acesso-contestado-item') }));
  ok(!r.vinc && r.c.resolucao === 'tirou' && !r.bloco, '"Tirar o acesso": a pessoa sai da academia e a pendência some');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
