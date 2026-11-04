// Regra 193, pedido do Breno em 01/11/2026: "quero criar um sistema de
// acompanhamento ao jogador que vai para academia depois de ter entrado em
// contato, dar as instruções novamente de como chegar e reposições por
// whatsapp ou email. confirmando se ele fez um agendamento, se aula ou
// locação e avisando 2h antes de como fazer"; "sim pode fazer assim por
// enquanto e deixar o whatsapp opcional". Os e-mails saem do banco (testes
// em banco-emails.py); aqui, o site: a chamada, a folha do link do e-mail,
// Minha conta, os textos legais e o chat.
const { abrir, ok } = require('./harness');

const texto = (page, sel) => page.evaluate((sel) => (document.querySelector(sel)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const AMANHA = () => new Date(Date.now() + 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const chamar = (page) => page.evaluate(() => { window.open = () => {}; const a = document.querySelector('[data-track="whatsapp"][data-court="a1"]'); a.addEventListener('click', e => e.preventDefault()); a.click(); });

(async () => {
  // ---- a chamada pelo WhatsApp abre o acompanhamento ----
  let { browser, page } = await abrir({ q: 'academia/so-aula-tennis-a1', jogador: true, jogadorConfirmado: true, acompanhamento: true });
  await page.waitForTimeout(500);
  await chamar(page);
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__db.acompanhamentos.length === 1 && window.__db.acompanhamentos[0].academia_id === 'a1' && window.__db.acompanhamentos[0].user_id === 'j-ana'),
    'a conta com o e-mail confirmado chama a academia pelo WhatsApp: o acompanhamento começa');
  await chamar(page);
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__db.acompanhamentos.length === 1), 'chamar de novo não abre outro');
  await browser.close();

  for (const [quem, opts] of [['a conta sem o e-mail confirmado', { jogador: true }], ['o visitante', {}], ['o admin', { admin: true }]]) {
    ({ browser, page } = await abrir({ q: 'academia/so-aula-tennis-a1', acompanhamento: true, ...opts }));
    await page.waitForTimeout(500);
    await chamar(page);
    await page.waitForTimeout(300);
    ok(await page.evaluate(() => window.__db.acompanhamentos.length === 0), quem + ' não entra no acompanhamento');
    await browser.close();
  }
  // Banco sem o SQL: chamar segue normal, sem erro na tela.
  ({ browser, page } = await abrir({ q: 'academia/so-aula-tennis-a1', jogador: true, jogadorConfirmado: true }));
  await page.waitForTimeout(500);
  await chamar(page);
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => (window.__db.cliques || []).some(x => x.tipo === 'whatsapp') && !document.querySelector('.form-error')), 'banco sem o SQL: a chamada segue normal');
  await browser.close();

  // ---- o link do e-mail: "Marquei aula" ----
  const inicial = [{ id: 'acomp-1', chave: 'chave-1', user_id: 'j-ana', academia_id: 'a1', criado_em: new Date(Date.now() - 86400000).toISOString(), status: 'aguardando', tipo: null, quando: null, instrucoes: {} }];
  ({ browser, page } = await abrir({ q: '?marquei=chave-1&r=aula', acompanhamento: inicial, completo: ['a1'] }));
  await page.waitForTimeout(700);
  let folha = await page.evaluate(() => ({ titulo: document.querySelector('#marquei-overlay .sheet-title')?.innerText, escolhas: [...document.querySelectorAll('[data-marquei-escolha]')].map(b => (b.classList.contains('active') ? '✓' : '') + b.innerText.trim()), dia: !!document.getElementById('marquei-dia'), hora: !!document.getElementById('marquei-hora'), whats: !!document.getElementById('marquei-whatsapp'), url: location.search }));
  ok(folha.titulo === 'Você marcou na Só Aula Tennis?' && folha.escolhas.join() === '✓Marquei aula' && folha.dia && folha.hora && folha.whats && folha.url === '',
    'o link "Marquei aula" do e-mail abre a folha sem entrar: a academia, "Marquei aula" já escolhido (a academia só dá aula), o dia, a hora e o WhatsApp opcional; o endereço fica limpo — ' + JSON.stringify(folha));
  await page.click('[data-marquei-responder="aula"]');
  await page.waitForTimeout(200);
  ok((await texto(page, '#marquei-overlay .form-error')) === 'Escolha o dia e a hora.', 'sem o dia e a hora, não confirma');
  await page.fill('#marquei-dia', AMANHA());
  await page.fill('#marquei-hora', '18:30');
  await page.fill('#marquei-whatsapp', '(11) 98888-7777');
  await page.click('[data-marquei-responder="aula"]');
  await page.waitForTimeout(300);
  ok((await texto(page, '#marquei-overlay .form-error')).includes('aceita receber'), 'WhatsApp sem o aceite não passa');
  await page.check('#marquei-aceite');
  await page.click('[data-marquei-responder="aula"]');
  await page.waitForTimeout(300);
  const pronto = await texto(page, '#marquei-overlay .sheet-content');
  ok(pronto.includes('Pronto') && pronto.includes('Aula na Só Aula Tennis') && pronto.includes('às 18h30') && pronto.includes('Duas horas antes, você recebe por e-mail como chegar e a regra de cancelamento e reposição') && pronto.includes('Ver a ficha da academia'),
    'confirmado: "Pronto", o dia e a hora e o que chega duas horas antes — ' + pronto);
  const resp = await page.evaluate(() => window.__respostaDoAcompanhamento);
  ok(resp.p_dia && resp.p_hora === '18:30' && resp.p_resposta === 'aula' && resp.p_aceite_whatsapp === true, 'vai para o banco: aula, o dia, a hora e o WhatsApp com o aceite');
  const inst = resp.p_instrucoes || {};
  ok(inst.endereco === 'Rua A, 1, Pinheiros, São Paulo' && inst.chegada === 'Portão preto. Avise na portaria.' && inst.estacionamento === 'Grátis, no local.' && /24 horas/.test(inst.cancelamento || '') && /Perde a aula/.test(inst.cancelamento || ''),
    'junto, o texto que a ficha mostra (Completo): endereço, chegada, estacionamento e o cancelamento e a reposição da aula — ' + JSON.stringify(inst));
  // No Básico, a ficha não mostra a chegada nem o cancelamento: o e-mail também não.
  const basico = await page.evaluate(() => { const c = decorate({ ...state.allCourts.find(x => x.id === 'a1'), plano: 'basico', politica: {}, acesso: {} }); return instrucoesDoAcompanhamento(c, 'aula'); });
  ok(basico.endereco && !basico.chegada && !basico.cancelamento, 'sem a chegada e o cancelamento na ficha, o e-mail vai sem eles — ' + JSON.stringify(basico));
  ok(await page.evaluate(() => { const x = window.__db.acompanhamentos[0]; return x.status === 'marcou' && x.tipo === 'aula'; }), 'o acompanhamento fica "marcou"');
  await browser.close();

  // ---- "Ainda não", "Tirar o lembrete" e link que não vale ----
  ({ browser, page } = await abrir({ q: '?marquei=chave-1&r=nao', acompanhamento: inicial }));
  await page.waitForTimeout(700);
  ok((await texto(page, '#marquei-overlay .sheet-title')) === 'Tudo bem' && await page.evaluate(() => window.__db.acompanhamentos[0].status === 'nao_marcou'), '"Ainda não" do e-mail anota na hora, num toque');
  await browser.close();
  const marcado = [{ ...inicial[0], status: 'marcou', tipo: 'aula', quando: new Date(Date.now() + 3 * 86400000).toISOString() }];
  ({ browser, page } = await abrir({ q: '?marquei=chave-1&r=cancelar', acompanhamento: marcado }));
  await page.waitForTimeout(700);
  ok((await texto(page, '#marquei-overlay .sheet-title')) === 'Tirar o lembrete?' && await page.evaluate(() => window.__db.acompanhamentos[0].status === 'marcou'), '"Tirar o lembrete" pergunta antes (o link sozinho não tira)');
  await page.click('[data-marquei-responder="cancelar"]');
  await page.waitForTimeout(300);
  ok((await texto(page, '#marquei-overlay .sheet-title')) === 'Lembrete tirado' && await page.evaluate(() => window.__db.acompanhamentos[0].status === 'cancelado'), 'e tira');
  await browser.close();
  ({ browser, page } = await abrir({ q: '?marquei=nao-existe', acompanhamento: inicial }));
  await page.waitForTimeout(700);
  ok((await texto(page, '#marquei-overlay .sheet-title')) === 'Este link não vale mais', 'link que não existe: "Este link não vale mais"');
  await browser.close();

  // ---- Minha conta: os horários, o WhatsApp opcional e o aviso ----
  ({ browser, page } = await abrir({ q: 'perfil', jogador: true, jogadorConfirmado: true, acompanhamento: marcado }));
  await page.waitForTimeout(700);
  const horarios = await texto(page, '#perfil-horarios');
  ok(horarios.startsWith('Seus horários') && horarios.includes('Só Aula Tennis') && horarios.includes('Aula ·') && horarios.includes('Não vou mais'), 'em Minha conta, "Seus horários" com a academia, aula, o dia e "Não vou mais" — ' + horarios);
  await page.click('[data-tirar-horario="chave-1"]');
  await page.waitForTimeout(300);
  ok(!(await page.$('#perfil-horarios')) && await page.evaluate(() => window.__db.acompanhamentos[0].status === 'cancelado'), '"Não vou mais" tira o lembrete');
  const aviso = await page.evaluate(() => { const c = document.querySelector('.jog-aviso[data-campo="acompanhamento"]'); return c && { ligado: c.checked, t: c.parentElement.innerText.trim() }; });
  ok(aviso && aviso.ligado && aviso.t.startsWith('Depois de chamar uma academia'), 'o acompanhamento aparece nos avisos por e-mail, ligado — ' + JSON.stringify(aviso));
  ok(await page.isVisible('#jog-whatsapp') && (await page.getAttribute('#jog-whatsapp', 'value')) === '' && (await texto(page, 'label[for="jog-whatsapp"]')) === 'WhatsApp (opcional)', 'Dados pessoais: "WhatsApp (opcional)", vazio');
  await page.fill('#jog-whatsapp', '(11) 98888-7777');
  await page.click('#jog-salvar');
  await page.waitForTimeout(300);
  ok((await texto(page, '#perfil-dados .form-error')).includes('aceita receber'), 'sem o aceite, o WhatsApp não é salvo');
  await page.check('#jog-whatsapp-aceite');
  await page.uncheck('.jog-aviso[data-campo="acompanhamento"]');
  await page.click('#jog-salvar');
  await page.waitForTimeout(400);
  const salvo = await page.evaluate(() => { const j = window.__db.jogadores.find(x => x.user_id === 'j-ana'); return { w: j.whatsapp, aceite: !!j.whatsapp_aceite_em, acomp: j.acompanhamento }; });
  ok(salvo.w === '11988887777' && salvo.aceite && salvo.acomp === false, 'com o aceite, salva o WhatsApp; e o acompanhamento desliga — ' + JSON.stringify(salvo));
  await page.evaluate(() => { state.page = 'perfil'; window.__jog = null; render(); });
  await page.waitForTimeout(200);
  ok((await page.getAttribute('#jog-whatsapp', 'value')) === '(11) 98888-7777', 'o WhatsApp volta escrito do jeito de ler');
  await browser.close();

  // Desligado: chamar não abre acompanhamento.
  ({ browser, page } = await abrir({ q: 'academia/so-aula-tennis-a1', jogador: true, jogadorConfirmado: true, acompanhamento: true }));
  await page.waitForTimeout(500);
  await page.evaluate(() => { jogador.acompanhamento = false; window.__db.jogadores[0].acompanhamento = false; });
  await chamar(page);
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__db.acompanhamentos.length === 0), 'com o acompanhamento desligado, chamar não abre');
  await browser.close();

  // ---- "Não quero mais esse acompanhamento" do e-mail ----
  ({ browser, page } = await abrir({ q: '?parar-avisos=tok-j-ana&aviso=acompanhamento', jogador: true, jogadorConfirmado: true, acompanhamento: true }));
  await page.waitForTimeout(600);
  ok((await texto(page, '#parar-overlay')).includes('o acompanhamento depois de chamar uma academia'), 'o link do e-mail diz o que para');
  await page.click('#parar-sim');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__db.jogadores[0].acompanhamento === false && jogador.acompanhamento === false), 'e desliga o acompanhamento');
  await browser.close();

  // ---- Termos, Privacidade e o chat ----
  ({ browser, page } = await abrir({}));
  await page.waitForTimeout(400);
  const legal = await page.evaluate(() => ({ t: TERMS_HTML, p: PRIVACY_HTML }));
  ok(legal.t.includes('o horário é o que o usuário informou, sem confirmação da academia') && legal.p.includes('<strong>Acompanhamento depois de chamar uma academia:</strong>') && legal.p.includes('Tudo é apagado 60 dias depois da chamada') && legal.p.includes('<strong>WhatsApp (opcional):</strong>'),
    'os Termos e a Privacidade explicam o acompanhamento, o prazo de 60 dias e o WhatsApp opcional');
  await page.evaluate(() => { state.showMenu = true; render(); document.querySelector('.menu-drawer [data-menu="contato"]').click(); });
  await page.waitForTimeout(200);
  await page.click('#contato-close-overlay [data-abrir-chat]');
  await page.waitForTimeout(300);
  await page.fill('#chat-texto', 'quero um lembrete do horario que marquei');
  await page.click('.chat-enviar');
  await page.waitForTimeout(300);
  const resposta = await page.evaluate(() => [...document.querySelectorAll('#chat-msgs .chat-msg')].pop().innerText.replace(/\s+/g, ' '));
  ok(resposta.includes('duas horas antes, mandamos como chegar') && resposta.includes('O WhatsApp é opcional'), 'o chat de ajuda explica o lembrete — ' + resposta.slice(0, 120));
  await browser.close();
})();
