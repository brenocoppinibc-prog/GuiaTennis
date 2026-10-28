// Pedido do Breno em 27/10/2026 (regra 165): "será enviado email quando isso
// do nome for solicitado ou já alterado? e quando eu ver algo que não condiz
// com os termos, suspenda o nome por 15 dias e se não, a conta será excluída,
// e avaliação aparece tipo no Instagram quando a conta é excluída mas ainda
// permanece a avaliação". Como a suspensão do Instagram ("restam N dias") e o
// "Usuário do Instagram".
const { abrir, ok } = require('./harness');

const agora = Date.now();
const suspensao = (extra) => ({ id: 'ns-1', email: 'ana@exemplo.com', nome: 'Ana Jogadora', motivo: 'Palavrão no nome', suspenso_em: new Date(agora).toISOString(),
  prazo: new Date(agora + 15 * 864e5).toISOString(), lembrete_em: null, resolvido_em: null, resolucao: null, nome_novo: null, conferido_em: null, user_id: 'j-ana', ...extra });

(async () => {
  // ---- a avaliação de conta excluída: "Usuário do GuiaTennis" ----
  let { browser, page } = await abrir({ avaliacoes: [
    { id: 'r1', academia_id: 'a1', stars: 4, comment: 'Quadras boas.', created_at: '2026-10-18T10:00:00Z', status: 'published', nome_autor: null, autor_oculto: true },
    { id: 'r2', academia_id: 'a1', stars: 5, comment: 'Ótima.', created_at: '2026-10-17T10:00:00Z', status: 'published', nome_autor: 'Bia Souza' }] });
  await page.evaluate(() => openCourt('a1'));
  await page.waitForTimeout(400);
  const nomes = await page.evaluate(() => [...document.querySelectorAll('#ht-avaliacoes .rev-name, .ht-rev-ficha .rev-name')].map(x => x.innerText.trim()));
  ok(nomes.includes('Usuário do GuiaTennis') && nomes.includes('Bia Souza'), 'a avaliação de conta excluída aparece como "Usuário do GuiaTennis", a outra com o nome — ' + nomes.join(' | '));
  const cartao = await page.evaluate(() => { const c = state.allCourts.find(x => x.id === 'a1'); const d = document.createElement('div'); d.innerHTML = cartaoAvaliacao(state.reviewsCache.a1.find(r => r.id === 'r1'), c, 'lista'); return { nome: d.querySelector('.rev-name').innerText, svg: !!d.querySelector('.rev-avatar-oculto svg'), letras: d.querySelector('.rev-avatar').innerText.trim() }; });
  ok(cartao.nome === 'Usuário do GuiaTennis' && cartao.svg && !cartao.letras, 'no cartão com avatar, o avatar cinza sem iniciais, como o do Instagram');
  await browser.close();

  // ---- o jogador com o nome suspenso ----
  ({ browser, page } = await abrir({ jogador: true, jogadorConfirmado: true, nomesSuspensos: [suspensao()],
    avaliacoes: [{ id: 'r9', academia_id: 'a2', stars: 5, comment: 'Gostei.', created_at: '2026-10-18T10:00:00Z', status: 'published', user_id: 'j-ana', nome_autor: null, autor_oculto: true, contato_autor: 'ana@exemplo.com' }] }));
  await page.waitForTimeout(500);
  let t = await page.evaluate(() => ({ aberto: !!document.getElementById('nome-suspenso-overlay'), texto: document.querySelector('.nome-suspenso-janela')?.innerText.replace(/\s+/g, ' ') || '' }));
  ok(t.aberto && t.texto.includes('RESTAM 15 DIAS') && t.texto.includes('O seu nome foi suspenso') && t.texto.includes('Ana Jogadora') && t.texto.includes('Motivo: Palavrão no nome.'),
    'ao abrir o site, a tela da suspensão: "Restam 15 dias", o nome e o motivo — ' + t.texto.slice(0, 120));
  ok(t.texto.includes('“Usuário do GuiaTennis”, e a conta não avalia') && t.texto.includes('Troque o nome em Minha conta até') && t.texto.includes('a conta será excluída'),
    'diz o que acontece enquanto isso, onde trocar, até quando e que a conta será excluída');
  ok(await page.evaluate(() => [...document.querySelectorAll('.nome-suspenso-janela button')].map(b => b.innerText).join('|')) === 'Trocar o nome|Agora não', 'com "Trocar o nome" e "Agora não"');
  await page.click('#nome-suspenso-depois');
  await page.waitForTimeout(200);
  ok(!(await page.$('#nome-suspenso-overlay')), '"Agora não" fecha');
  await page.reload();
  await page.waitForTimeout(600);
  ok(!(await page.$('#nome-suspenso-overlay')), 'e não volta na mesma aba');
  const erroAoAvaliar = await page.evaluate(async () => { try { await submitRating('a1', 5, 'Boa'); return ''; } catch (e) { return e.message; } });
  ok(erroAoAvaliar === 'O seu nome está suspenso: troque o nome em Minha conta para avaliar.', 'com o nome suspenso, não avalia — ' + erroAoAvaliar);
  await page.evaluate(() => { sessionStorage.clear(); });
  await page.reload();
  await page.waitForTimeout(600);
  await page.click('#nome-suspenso-trocar');
  await page.waitForTimeout(400);
  t = await page.evaluate(() => ({ pagina: state.page, foco: document.activeElement && document.activeElement.id, caixa: document.querySelector('#perfil-dados .nome-suspenso-caixa')?.innerText.replace(/\s+/g, ' ') || '' }));
  ok(t.pagina === 'perfil' && t.foco === 'jog-nome', '"Trocar o nome" abre Minha conta, no campo do nome');
  ok(t.caixa.includes('Nome suspenso') && t.caixa.includes('Ana Jogadora') && t.caixa.includes('faltam 15 dias') && t.caixa.includes('a conta será excluída'), 'em cima do nome, o aviso com o prazo — ' + t.caixa);
  await page.fill('#jog-nome', 'Ana');
  await page.fill('#jog-sobrenome', 'Souza');
  await page.click('#jog-salvar');
  await page.waitForTimeout(600);
  t = await page.evaluate(() => ({ suspenso: !!state.nomeSuspenso, aviso: document.querySelector('.conta-aviso')?.innerText.trim() || '', caixa: !!document.querySelector('.nome-suspenso-caixa'),
    av: window.__db.avaliacoes.find(r => r.id === 'r9'), emails: window.__db.emails_a_enviar.map(e => e.tipo) }));
  ok(!t.suspenso && !t.caixa && t.aviso === 'Salvo. O seu nome voltou a aparecer no site.', 'trocou o nome: a suspensão acaba na hora — ' + t.aviso);
  ok(t.av.nome_autor === 'Ana Souza' && !t.av.autor_oculto, 'e a avaliação volta com o nome novo');
  ok(t.emails.includes('nome_trocado') && t.emails.includes('nome_para_conferir'), 'a pessoa recebe a confirmação e o admin, o nome novo para conferir');
  await browser.close();

  // ---- o Parceiros com o nome suspenso ----
  // A conta u-a1 do mock se chama "Maria Teste".
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel', nomesSuspensos: [suspensao({ user_id: 'u-a1', email: 'quadra.a1@guiatennis.com.br', nome: 'Maria Teste' })] }));
  await page.waitForTimeout(600);
  t = await page.evaluate(() => ({ aberto: !!document.getElementById('nome-suspenso-overlay'), texto: document.querySelector('.nome-suspenso-janela')?.innerText.replace(/\s+/g, ' ') || '' }));
  ok(t.aberto && /Troque o nome (no Perfil do GuiaTennis Parceiros|em Minha conta e no Perfil do GuiaTennis Parceiros) até/.test(t.texto), 'no Parceiros, a mesma tela, com o Perfil do Parceiros — ' + t.texto.slice(0, 160));
  await page.click('#nome-suspenso-trocar');
  await page.waitForTimeout(400);
  t = await page.evaluate(() => ({ aba: state.parceirosAba, modo: state.contaModo, caixa: !!document.querySelector('.nome-suspenso-caixa'), campo: !!document.getElementById('conta-nome') }));
  ok(t.aba === 'perfil' && t.modo === 'dados' && t.caixa && t.campo, '"Trocar o nome" abre Perfil › Editar dados, com o aviso em cima do nome — ' + JSON.stringify(t));
  await browser.close();

  // ---- o admin suspende, cancela e confere ----
  ({ browser, page } = await abrir({ admin: true, avaliacoes: [
    { id: 'r5', academia_id: 'a1', stars: 1, comment: 'Ruim.', created_at: '2026-10-18T10:00:00Z', status: 'published', user_id: 'j-zeca', nome_autor: 'Zeca Feio', contato_autor: 'zeca@exemplo.com' }] }));
  await page.evaluate(() => { window.__db.jogadores.push({ user_id: 'j-zeca', nome: 'Zeca Feio', email: 'zeca@exemplo.com', cidade: 'São Paulo', created_at: new Date().toISOString(), email_confirmado_em: new Date().toISOString() }); });
  await page.evaluate(() => irAdmin('avaliacoes'));
  await page.waitForTimeout(600);
  const botao = await page.$('[data-adm-suspender-aval="r5"]');
  ok(!!botao, 'nas Avaliações do painel, "Suspender o nome"');
  await botao.click();
  await page.waitForTimeout(200);
  t = await page.evaluate(() => ({ titulo: document.querySelector('#adm-suspender-overlay .sheet-title')?.innerText, nota: document.querySelector('#adm-suspender-overlay .adm-nota')?.innerText || '' }));
  ok(t.titulo === 'Suspender o nome' && t.nota.includes('15 dias') && t.nota.includes('Usuário do GuiaTennis') && t.nota.includes('excluída sozinha'), 'a janela explica o que acontece');
  await page.click('#adm-suspender-confirmar');
  await page.waitForTimeout(200);
  ok((await page.evaluate(() => document.querySelector('#adm-suspender-overlay .form-error')?.innerText || '')).includes('Escreva o motivo'), 'sem motivo, não suspende');
  await page.fill('#adm-suspender-motivo', 'Palavrão no nome');
  await page.click('#adm-suspender-confirmar');
  await page.waitForTimeout(700);
  t = await page.evaluate(() => ({ aviso: state.admAviso, av: window.__db.avaliacoes.find(r => r.id === 'r5'), n: window.__db.nomes_suspensos.length, email: window.__db.emails_a_enviar.some(e => e.tipo === 'nome_suspenso' && e.para === 'zeca@exemplo.com') }));
  ok(t.n === 1 && t.av.autor_oculto && !t.av.nome_autor && t.email && t.aviso.includes('suspenso') && t.aviso.includes('para trocar'), 'suspende: o nome sai da avaliação, a pessoa recebe o e-mail — ' + t.aviso);
  await page.evaluate(() => irAdmin('pendencias'));
  await page.waitForTimeout(500);
  t = await page.evaluate(() => document.getElementById('adm-nomes-suspensos')?.innerText.replace(/\s+/g, ' ') || '');
  ok(t.includes('Nomes suspensos') && t.includes('Zeca Feio') && t.includes('faltam 15 dias') && t.includes('Motivo: Palavrão no nome') && t.includes('Cancelar a suspensão'), 'em Pendências, o nome suspenso, o prazo e o motivo — ' + t.slice(0, 150));
  page.once('dialog', d => d.accept());
  await page.click('[data-nome-cancelar]');
  await page.waitForTimeout(600);
  t = await page.evaluate(() => ({ av: window.__db.avaliacoes.find(r => r.id === 'r5'), n: window.__db.nomes_suspensos[0].resolucao, email: window.__db.emails_a_enviar.some(e => e.tipo === 'nome_suspensao_cancelada') }));
  ok(t.n === 'cancelada' && t.av.nome_autor === 'Zeca Feio' && !t.av.autor_oculto && t.email, '"Cancelar a suspensão" devolve o nome e avisa a pessoa');
  // O nome trocado espera o admin conferir ("Para fazer agora").
  await page.evaluate(() => { window.__db.nomes_suspensos.push({ id: 'ns-9', user_id: 'j-zeca', email: 'zeca@exemplo.com', nome: 'Zeca Feio', motivo: 'Ofensa', suspenso_em: new Date().toISOString(), prazo: new Date(Date.now() + 5 * 864e5).toISOString(), resolvido_em: new Date().toISOString(), resolucao: 'trocou', nome_novo: 'Zeca Bom', conferido_em: null }); });
  await page.evaluate(async () => { await carregarNomesSuspensos(); render(); });
  await page.waitForTimeout(300);
  t = await page.evaluate(() => ({ tarefa: admParaFazer().map(x => x.t).find(x => /nome suspenso/.test(x)) || '', bloco: document.getElementById('adm-nomes-suspensos')?.innerText.replace(/\s+/g, ' ') || '' }));
  ok(t.tarefa === 'nome suspenso foi trocado: confira o nome novo', 'em "Para fazer agora", o nome trocado para conferir — ' + t.tarefa);
  ok(t.bloco.includes('Trocou: Zeca Feio → Zeca Bom') && t.bloco.includes('Está certo') && t.bloco.includes('Suspender de novo'), 'com "Está certo" e "Suspender de novo"');
  await page.click('[data-nome-conferido="ns-9"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => !!window.__db.nomes_suspensos.find(x => x.id === 'ns-9').conferido_em && !admParaFazer().some(x => /nome suspenso/.test(x.t))), '"Está certo" tira de Pendências');
  // Nas contas de jogador, ao lado de "Excluir conta".
  await page.evaluate(() => irAdmin('jogadores'));
  await page.waitForTimeout(600);
  const doJogador = await page.evaluate(() => [...document.querySelectorAll('[data-adm-suspender]')].map(b => b.dataset.nome));
  ok(doJogador.includes('Zeca Feio'), 'nas Contas de jogador, "Suspender o nome" ao lado de "Excluir conta" — ' + doJogador.join(', '));
  await browser.close();

  // ---- os textos ----
  ({ browser, page } = await abrir({}));
  const legal = await page.evaluate(() => ({ termos: TERMS_HTML.replace(/<[^>]+>/g, ''), priv: PRIVACY_HTML.replace(/<[^>]+>/g, '') }));
  ok(legal.termos.includes('O nome da conta que desrespeitar essas regras fica suspenso por 15 dias') && legal.termos.includes('um lembrete 3 dias antes do fim')
    && legal.termos.includes('não trocou em 15 dias, a conta é excluída') && legal.termos.includes('quem administra a academia recebe um e-mail com o nome de antes e o novo'),
    'Termos, seção 5: a suspensão de 15 dias, os e-mails, a exclusão e o nome da academia');
  ok(legal.termos.includes('as avaliações continuam publicadas, sem o nome e sem a ligação com a conta: aparecem como "Usuário do GuiaTennis"'), 'Termos: a conta excluída deixa a avaliação como "Usuário do GuiaTennis"');
  ok(legal.priv.includes('Quando o nome da conta é suspenso, guardamos o nome suspenso, o motivo, a data, o prazo de 15 dias') && legal.priv.includes('aparecem como "Usuário do GuiaTennis"')
    && legal.priv.includes('Quando o GuiaTennis altera o nome de uma academia, quem a administra recebe um e-mail'), 'Privacidade: o registro da suspensão, os e-mails e o "Usuário do GuiaTennis"');
  await browser.close();
})();
