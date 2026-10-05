// Conta do jogador (pedido do Breno em 02/10/2026): avaliar exige conta, e a
// conta escolhe os avisos por e-mail (academias, promoções, novidades).
const { abrir, ok } = require('./harness');
(async () => {
  let { browser, page } = await abrir();
  // Menu: "Entrar ou criar conta" no topo e "Avisos por e-mail".
  let menu = await page.evaluate(() => { state.showMenu = true; render(); return [...document.querySelectorAll('#menu-overlay .menu-item')].map(i => i.innerText.replace(/\s+/g, ' ').trim()); });
  ok(menu[0] === 'Entrar ou criar conta' && menu.includes('Avisos por e-mail Entrar'), 'menu: entrar no topo e os avisos — ' + menu.slice(0, 2).join(' | '));
  await page.click('[data-menu="entrar-jogador"]');
  await page.waitForTimeout(150);
  // Um lugar só para o e-mail: o site vê que não tem conta e abre o cadastro.
  ok(await page.evaluate(() => state.jogadorTela === 'email' && !document.getElementById('jog-senha') && !document.getElementById('jog-nome')), 'começa só pelo e-mail');
  await page.fill('#jog-email', 'Bia@Exemplo.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.jogadorTela === 'criar' && document.getElementById('jog-email').readOnly && document.getElementById('jog-email').value === 'bia@exemplo.com'), 'e-mail sem conta: completa o cadastro, com o e-mail já preenchido');
  const avisos = await page.evaluate(() => [...document.querySelectorAll('.jog-aviso')].map(c => c.checked));
  ok(avisos.length === 3 && avisos.every(x => !x), 'três avisos, todos começam desligados (sem "Vou viajar" no cadastro)');
  await page.fill('#jog-nome', 'Bia Tenista');
  await page.fill('#jog-senha', 'curta');
  await page.fill('#jog-senha2', 'curta');
  await page.check('#jog-aceite');
  await page.click('#jog-criar');
  await page.waitForTimeout(200);
  ok((await page.evaluate(() => document.querySelector('#jogador-overlay .form-error')?.innerText || '')).includes('pelo menos 8 caracteres'), 'senha curta: avisa');
  await page.fill('#jog-senha', 'senhaboa12');
  await page.fill('#jog-senha2', 'senhaboa12');
  await page.check('.jog-aviso[data-campo="promocoes"]');
  await page.click('#jog-criar');
  await page.waitForTimeout(600);
  const criada = await page.evaluate(() => ({ j: jogador, rpc: (window.__rpcs.find(r => r.nome === 'criar_conta_jogador') || {}).args }));
  ok(criada.j && criada.j.nome === 'Bia Tenista' && criada.j.email === 'bia@exemplo.com' && criada.j.promocoes === true && criada.j.novidades === false, 'cria a conta, entra na hora e guarda os avisos escolhidos');
  ok(criada.rpc && criada.rpc.p_cidade === null && criada.rpc.p_aceite === true, 'manda o aceite e a cidade vazia como nula');
  // Confirma o e-mail pelo código de 6 números.
  const cod = await page.evaluate(() => ({ tela: state.jogadorTela, mandou: (window.__codigos || {})['bia@exemplo.com'], link: location.search, bola: document.querySelector('#jogador-overlay .trilha-bola')?.style.left }));
  ok(cod.tela === 'codigo' && cod.mandou === '123456' && cod.link.includes('conta=codigo') && cod.bola === '100%', 'depois de criar, manda o código e pede para confirmar o e-mail (última etapa da trilha)');
  await page.fill('#jog-codigo', '999999');
  await page.click('#jog-confirmar');
  await page.waitForTimeout(300);
  ok((await page.evaluate(() => document.querySelector('#jogador-overlay .form-error')?.innerText || '')).includes('Código errado'), 'código errado: avisa');
  await page.fill('#jog-codigo', '123456');
  await page.click('#jog-confirmar');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => !state.jogadorTela && !!jogador.email_confirmado_em), 'código certo: e-mail confirmado e a janela fecha');
  menu = await page.evaluate(() => { state.showMenu = true; render(); return [...document.querySelectorAll('#menu-overlay .menu-item')].map(i => i.innerText.replace(/\s+/g, ' ').trim()); });
  ok(menu[0] === 'Minha conta Bia' && menu.includes('Avisos por e-mail Ligados') && menu.includes('Sair da conta'), 'logado: Minha conta, avisos ligados e sair — ' + menu[0]);
  // Minha conta: muda os avisos.
  await page.click('[data-menu="minha-conta"]');
  await page.waitForTimeout(150);
  await page.uncheck('.jog-aviso[data-campo="promocoes"]');
  await page.check('.jog-aviso[data-campo="avisos_academias"]');
  await page.fill('#jog-cidade', 'São Paulo');
  await page.click('#jog-salvar');
  await page.waitForTimeout(300);
  const salvo = await page.evaluate(() => ({ up: window.__ultimoUpdate, db: window.__db.jogadores.find(j => j.email === 'bia@exemplo.com'), aviso: document.querySelector('#perfil-jogador .conta-aviso')?.innerText || '' }));
  ok(salvo.db.promocoes === false && salvo.db.avisos_academias === true && salvo.db.cidade === 'São Paulo' && salvo.up.avisos_mudados_em && salvo.aviso.includes('Salvo'), 'Minha conta salva os avisos, a cidade e quando mudou');
  // Avalia uma academia, uma vez só.
  await page.evaluate(() => { state.jogadorTela = null; openCourt('a1'); });
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => !document.querySelector('.rate-login') && document.getElementById('rate-submit').innerText === 'Enviar avaliação'), 'logado: sem o convite para entrar');
  await page.click('#star-picker span[data-star="4"]');
  await page.check('#rate-consent');
  await page.click('#rate-submit');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => window.__db.avaliacoes.length === 1 && window.__db.avaliacoes[0].nome_autor === 'Bia Tenista'), 'avaliação com o nome da conta');
  const segunda = await page.evaluate(async () => { try { await submitRating('a1', 3, ''); return 'foi'; } catch (e) { return e.message; } });
  ok(segunda === 'Você já avaliou essa academia.', 'uma avaliação por conta em cada academia — ' + segunda);
  // Excluir a conta.
  // (o botão recarrega a página; aqui confere o que o banco faz)
  await page.evaluate(() => abrirContaJogador('conta'));
  ok(await page.evaluate(() => !!document.getElementById('jog-excluir') && !!document.getElementById('jog-sair')), 'Minha conta tem Sair e Excluir minha conta');
  await page.evaluate(() => sb.rpc('excluir_minha_conta_jogador'));
  ok(await page.evaluate(() => !window.__db.jogadores.some(j => j.email === 'bia@exemplo.com') && window.__db.avaliacoes[0].user_id === null), 'excluir a conta apaga os dados e solta as avaliações');
  await browser.close();

  // Entrar com a conta que já existe; senha errada avisa.
  ({ browser, page } = await abrir());
  await page.evaluate(() => { window.__db.jogadores.push({ user_id: 'j-z', nome: 'Zé', email: 'ze@exemplo.com' }); window.__senhas['ze@exemplo.com'] = 'senhadoze1'; abrirContaJogador('entrar'); });
  await page.fill('#jog-email', 'ze@exemplo.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.jogadorTela === 'entrar' && !!document.getElementById('jog-senha') && !document.getElementById('jog-nome')), 'e-mail com conta: vai direto para a senha');
  await page.fill('#jog-senha', 'errada123');
  await page.click('#jog-entrar');
  await page.waitForTimeout(300);
  ok((await page.evaluate(() => document.querySelector('#jogador-overlay .form-error')?.innerText || '')).includes('incorretos'), 'senha errada: "E-mail ou senha incorretos"');
  await page.fill('#jog-senha', 'senhadoze1');
  await page.click('#jog-entrar');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => jogador && jogador.nome === 'Zé' && !state.jogadorTela), 'entra com e-mail e senha');
  await browser.close();

  // Já logado ao abrir o site: continua logado (não é admin nem academia).
  ({ browser, page } = await abrir({ jogador: true }));
  ok(await page.evaluate(() => jogador && jogador.nome === 'Ana Jogadora' && !window.__saiu), 'jogador logado continua logado ao abrir o site');
  await browser.close();

  // O admin entra pelo mesmo "Entrar", sem a "Área do GuiaTennis".
  ({ browser, page } = await abrir());
  ok(await page.evaluate(() => { state.showMenu = true; render(); const t = document.body.innerText; state.showMenu = false; render(); return !t.includes('Área do GuiaTennis'); }), 'sem "Área do GuiaTennis" no menu e no rodapé');
  await page.evaluate(() => abrirContaJogador('entrar'));
  await page.fill('#jog-email', 'guiatennis1@gmail.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.jogadorTela === 'entrar' && !!document.getElementById('jog-senha')), 'e-mail do admin vai para a senha, no mesmo Entrar');
  await browser.close();

  // E-mail digitado errado: o site sugere o certo; trilha com a bolinha.
  ({ browser, page } = await abrir());
  await page.evaluate(() => abrirContaJogador('entrar'));
  ok(await page.evaluate(() => [...document.querySelectorAll('#jogador-overlay .trilha li')].map(l => l.innerText).join('|') === 'E-mail|Senha ou cadastro|Confirmar' && !!document.querySelector('#jogador-overlay .trilha-bola')), 'trilha de tênis: E-mail, Senha ou cadastro, Confirmar');
  await page.fill('#jog-email', 'bia@gmial.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(200);
  ok((await page.evaluate(() => document.querySelector('.email-sugestao')?.innerText || '')).includes('bia@gmail.com') && await page.evaluate(() => state.jogadorTela === 'email'), '"gmial.com": pergunta se quis dizer gmail.com, antes de seguir');
  await page.click('[data-email-sugestao="usar"]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.jogadorTela === 'criar' && window.__jog.email === 'bia@gmail.com' && document.querySelector('.jog-email-volta').innerText.includes('bia@gmail.com')), 'usou a sugestão e seguiu, com o e-mail em cima como no trivago');
  ok(await page.evaluate(() => document.querySelector('#jogador-overlay .trilha-bola').style.left === '50%'), 'a bolinha andou para a segunda etapa');
  ok(await page.evaluate(() => sugestaoDeEmail('ana@hotmial.com') === 'ana@hotmail.com' && sugestaoDeEmail('ana@gmail') === 'ana@gmail.com' && sugestaoDeEmail('ana@minhaacademia.com.br') === null), 'sugere hotmail e gmail, e não mexe em domínio próprio');
  await browser.close();

  // Esqueci a senha: código no e-mail e senha nova.
  ({ browser, page } = await abrir());
  await page.evaluate(() => { window.__db.jogadores.push({ user_id: 'j-z', nome: 'Zé', email: 'ze@exemplo.com' }); window.__senhas['ze@exemplo.com'] = 'antiga1234'; abrirContaJogador('entrar'); });
  await page.fill('#jog-email', 'ze@exemplo.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(300);
  await page.click('#jog-esqueci');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => state.jogadorTela === 'esqueci' && (window.__codigos || {})['ze@exemplo.com'] === '123456' && location.search.includes('conta=nova-senha')), 'Esqueceu a senha: manda o código para o e-mail');
  await page.fill('#jog-codigo', '123456');
  await page.fill('#jog-senha-nova', 'novasenha99');
  await page.fill('#jog-senha-nova2', 'novasenha99');
  // O Supabase recusa a senha (regra do painel): diz o motivo, e o código
  // (que só vale uma vez) não precisa ser digitado de novo.
  await page.evaluate(() => { window.__erroSenha = { message: 'Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789, !@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~.', code: 'weak_password', status: 422, reasons: ['characters'] }; });
  await page.click('#jog-salvar-senha');
  await page.waitForTimeout(500);
  ok((await page.evaluate(() => document.querySelector('#jogador-overlay .form-error')?.innerText || '')).includes('maiúscula, número e símbolo'), 'senha recusada pelo Supabase: diz o motivo');
  await page.fill('#jog-senha-nova', 'NovaSenha#99');
  await page.fill('#jog-senha-nova2', 'NovaSenha#99');
  await page.click('#jog-salvar-senha');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => jogador && jogador.nome === 'Zé' && window.__senhas['ze@exemplo.com'] === 'NovaSenha#99' && !state.jogadorTela), 'tentar de novo funciona sem outro código: senha salva e já entra');
  await browser.close();

  // Serviço de e-mail desligado: avisa e deixa confirmar depois.
  ({ browser, page } = await abrir());
  await page.evaluate(() => { window.__semEmail = true; abrirContaJogador('entrar'); });
  await page.fill('#jog-email', 'semmail@exemplo.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(300);
  await page.fill('#jog-nome', 'Sem Mail');
  await page.fill('#jog-senha', 'senhaboa12');
  await page.fill('#jog-senha2', 'senhaboa12');
  await page.check('#jog-aceite');
  await page.click('#jog-criar');
  await page.waitForTimeout(600);
  ok((await page.evaluate(() => document.querySelector('#jogador-overlay')?.innerText || '')).includes('Não consegui mandar o código agora'), 'sem o serviço de e-mail: avisa e não trava');
  await page.click('#jog-depois');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => jogador && !jogador.email_confirmado_em && !state.jogadorTela), 'segue logado, com o e-mail para confirmar depois');
  await page.evaluate(() => abrirContaJogador('conta'));
  ok((await page.evaluate(() => document.querySelector('#perfil-jogador')?.innerText || '')).includes('E-mail ainda não confirmado'), 'Minha conta lembra de confirmar o e-mail');
  await browser.close();
})();
