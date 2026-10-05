// Buscas salvas, avisos por e-mail, conta do Parceiros no site dos jogadores
// e a página da cidade (pedidos do Breno em 05/10/2026).
const { abrir, ok } = require('./harness');
const texto = (page, sel) => page.evaluate((sel) => (document.querySelector(sel)?.innerText || '').replace(/\s+/g, ' '), sel);

async function buscar(page, termo) {
  await page.fill('#cep-input', termo);
  await page.click('#search-btn');
  await page.waitForTimeout(700);
}

(async () => {
  // ---- Salvar busca sem conta: pede para entrar e salva depois ----
  let { browser, page } = await abrir();
  await buscar(page, 'Pinheiros');
  let t = await texto(page, '.busca-salvar');
  ok(t.includes('Salvar busca') && t.includes('academias novas'), 'na busca, o botão "Salvar busca" com a dica — ' + t.slice(0, 60));
  await page.click('#salvar-busca');
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => state.jogadorTela === 'email' && /salvar a busca/.test(state.jogadorMotivo) && typeof state.depoisDeEntrar === 'function'),
    'sem conta, abre o Entrar dizendo que é para salvar a busca');
  await browser.close();

  // ---- Jogador salva, liga o aviso, vê no perfil e refaz ----
  ({ browser, page } = await abrir({ jogador: true }));
  await buscar(page, 'Pinheiros');
  await page.click('#salvar-busca');
  await page.waitForTimeout(300);
  let b = await page.evaluate(() => window.__db.buscas_salvas[0] || null);
  ok(b && b.user_id === 'j-ana' && b.link.startsWith('/busca?q=Pinheiros') && b.lat === -23.56 && b.avisar === false,
    'salva na conta: o link da busca, o ponto arredondado e o aviso desligado — ' + (b && b.link));
  t = await texto(page, '#busca-salva-aviso');
  ok(t.includes('Busca salva na sua conta') && t.includes('Avisar por e-mail'), 'depois de salvar, o aviso oferece o e-mail de academias novas');
  ok((await texto(page, '#salvar-busca')).includes('Busca salva'), 'o botão vira "Busca salva"');
  await page.click('#busca-salva-avisar');
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => window.__db.buscas_salvas[0].avisar === true), '"Avisar por e-mail" liga o aviso da busca');
  ok((await texto(page, '#busca-salva-aviso')).includes('depois de confirmar o e-mail'), 'e lembra que o e-mail precisa estar confirmado');
  // Salvar de novo a mesma busca não duplica.
  await page.evaluate(() => { state.buscaSalvaAviso = null; render(); });
  await page.click('#salvar-busca');
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => window.__db.buscas_salvas.length === 1), 'a mesma busca não é salva duas vezes');
  // Menu e perfil.
  await page.evaluate(() => { state.showMenu = true; render(); });
  t = await texto(page, '.menu-drawer [data-menu="buscas"]');
  ok(t.includes('Buscas salvas') && t.includes('1'), 'o menu mostra "Buscas salvas" com a contagem — ' + t);
  await page.click('.menu-drawer [data-menu="buscas"]');
  await page.waitForTimeout(300);
  t = await texto(page, '#perfil-buscas');
  ok(await page.evaluate(() => state.page === 'perfil') && t.includes('Pinheiros') && t.includes('Avisar por e-mail de academias novas'), 'o perfil lista a busca com o aviso — ' + t.slice(0, 80));
  ok(await page.evaluate(() => document.querySelector('[data-avisar-busca]').checked), 'com o aviso marcado');
  await page.click('[data-avisar-busca]');
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => window.__db.buscas_salvas[0].avisar === false), 'desmarcar no perfil desliga o aviso');
  ok((await texto(page, '#perfil-avisos + p')).includes('Cada busca salva tem o próprio aviso'), 'os avisos da conta explicam o aviso de cada busca');
  ok(await page.evaluate(() => AVISOS_JOGADOR[0].t === 'Academias novas na minha cidade'), 'o aviso da conta promete só o que sai: academias novas na cidade');
  await page.click('[data-abrir-busca]');
  await page.waitForTimeout(700);
  ok(await page.evaluate(() => state.page === 'search' && state.cep === 'Pinheiros' && location.pathname === '/busca' && state.searchStatus === 'done'),
    'tocar na busca salva refaz a busca');
  await page.evaluate(() => irPerfil('perfil-buscas'));
  await page.waitForTimeout(200);
  page.once('dialog', d => d.accept());
  await page.click('[data-apagar-busca]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__db.buscas_salvas.length === 0 && buscasSalvas.length === 0), 'apagar tira a busca da conta');
  await browser.close();

  // Banco sem a tabela: sem o botão e sem o item do menu.
  ({ browser, page } = await abrir({ jogador: true }));
  await page.evaluate(() => { window.__semBuscasSalvas = true; });
  await page.evaluate(async () => { await carregarBuscasSalvas(); });
  await buscar(page, 'Pinheiros');
  ok(!(await page.$('#salvar-busca')), 'banco sem a tabela: o botão some');
  await browser.close();

  // ---- Página da cidade: todas as academias, sem procurar endereço ----
  ({ browser, page } = await abrir());
  const pedidos = [];
  page.on('request', r => { if (r.url().includes('nominatim')) pedidos.push(r.url()); });
  await page.evaluate(() => {
    state.allCourts.push({ ...state.allCourts[0], id: 'a9', name: 'Campinas Tênis', cidade: 'Campinas', bairro: 'Cambuí', lat: -22.9, lng: -47.06 });
    render();
  });
  await page.click('.cidade-link');
  await page.waitForTimeout(700);
  t = await page.evaluate(() => ({
    cidade: state.cidadeDaPagina, origem: state.origin, link: location.pathname,
    nomes: getResults().map(c => c.name), status: document.querySelector('.status-info')?.innerText || '',
    sub: document.querySelector('.toolbar-sub')?.innerText || '',
  }));
  ok(t.cidade === 'São Paulo' && t.origem === null && t.link === '/quadras/sao-paulo', '"Ver as academias de São Paulo" abre a página da cidade — ' + t.link);
  ok(pedidos.length === 0, 'sem procurar o endereço "São Paulo" no mapa');
  ok(t.nomes.length === 2 && !t.nomes.includes('Campinas Tênis'), 'só as academias de São Paulo: ' + t.nomes.join(', '));
  ok(t.status.includes('Todas as academias de São Paulo') && t.sub.includes('em São Paulo'), 'a tela diz que são todas da cidade');
  // Na home, a última busca (a da cidade) volta para a página da cidade.
  await page.evaluate(() => goHome());
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.querySelector('.mini-busca')?.getAttribute('href')) === '/quadras/sao-paulo', 'a última busca da cidade aponta para a página da cidade');
  await page.click('.mini-busca');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => state.cidadeDaPagina === 'São Paulo' && state.origin === null) && pedidos.length === 0, 'e refazer abre a cidade inteira de novo, sem procurar endereço');
  // A busca de um endereço depois sai da página da cidade.
  await buscar(page, 'Pinheiros');
  ok(await page.evaluate(() => state.cidadeDaPagina === null && !!state.origin && getResults().length === 3), 'buscar um endereço volta a mostrar as mais perto, de todas as cidades');
  await browser.close();

  // A página da cidade também se salva.
  ({ browser, page } = await abrir({ jogador: true, q: 'quadras/sao-paulo' }));
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => state.cidadeDaPagina === 'São Paulo'), 'o link /quadras/sao-paulo abre a cidade inteira');
  await page.click('#salvar-busca');
  await page.waitForTimeout(300);
  b = await page.evaluate(() => window.__db.buscas_salvas[0] || null);
  ok(b && b.link === '/quadras/sao-paulo' && b.termo === 'São Paulo' && b.lat === null, 'salva a página da cidade, sem ponto — ' + (b && b.link));
  await browser.close();

  // ---- Conta do GuiaTennis Parceiros no site dos jogadores ----
  ({ browser, page } = await abrir({ academia: 'a1' }));
  t = await page.evaluate(() => ({ jog: jogador && jogador.email, nome: jogador && jogador.nome, db: window.__db.jogadores.length, topo: document.getElementById('conta-topo')?.innerText || '' }));
  ok(t.jog === 'maria@teste.com' && t.nome === 'Maria Teste' && t.db === 1, 'a conta do Parceiros ganha a parte de jogador sozinha, com o nome e o e-mail dela');
  ok(t.topo === 'M', 'no topo, a inicial do nome, como a de qualquer jogador');
  await page.evaluate(() => { state.showMenu = true; render(); });
  t = await page.evaluate(() => [...document.querySelectorAll('.menu-drawer .menu-item')].map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  ok(t.some(x => x.startsWith('Minha conta')) && t.some(x => x.startsWith('Painel da minha academia')), 'menu: "Minha conta" e "Painel da minha academia"');
  ok(t.some(x => x.startsWith('GuiaTennis Parceiros') && x.includes('seu painel')), 'menu: o GuiaTennis Parceiros continua no Suporte — ' + t.find(x => x.startsWith('GuiaTennis Parceiros')));
  ok(t.some(x => x.startsWith('Avisos por e-mail')) && t.some(x => x.startsWith('Buscas salvas')), 'menu: avisos e buscas salvas, como qualquer jogador');
  await page.evaluate(() => { state.showMenu = false; openCourt('a1'); });
  await page.waitForTimeout(200);
  t = await texto(page, '.rate-box');
  ok(t.includes('Vocês não podem avaliar a própria academia'), 'na própria academia, não avalia — ' + t.slice(0, 60));
  await page.evaluate(() => openCourt('a2'));
  await page.waitForTimeout(200);
  ok(!!(await page.$('#star-picker')) && !(await texto(page, '.rate-box')).includes('Parceiros não avaliam'), 'nas outras academias, avalia normalmente');
  await page.evaluate(async () => { await submitRating('a2', 5, 'Muito boa'); });
  ok(await page.evaluate(() => window.__db.avaliacoes.some(r => r.academia_id === 'a2' && r.nome_autor === 'Maria Teste')), 'a avaliação entra com o nome da conta');
  let erro = await page.evaluate(async () => { try { await submitRating('a1', 5, ''); return ''; } catch (e) { return e.message; } });
  ok(/administra essa academia/.test(erro), 'o banco também barra a própria academia — ' + erro);
  await page.evaluate(() => irPerfil());
  await page.waitForTimeout(200);
  t = await texto(page, '#perfil-jogador');
  ok(t.includes('Olá, Maria') && !(await page.$('#jog-excluir')) && t.includes('Para excluir a conta, fale com o GuiaTennis'), 'o perfil funciona, sem "Excluir" (a conta também é do Parceiros)');
  await browser.close();

  // Entrar pelo site dos jogadores com o e-mail do Parceiros: segue como jogador.
  ({ browser, page } = await abrir());
  await page.evaluate(() => {
    window.__db.academia_acessos.push({ user_id: 'u-b', academia_id: 'a2', usuario: 'beto@clube.com', nome_responsavel: 'Beto Dono', email: 'beto@clube.com', whatsapp: '11911112222', termos_aceitos_em: new Date().toISOString(), dados_completos_em: new Date().toISOString(), senha_trocada_em: new Date().toISOString() });
    window.__db.academia_vinculos.push({ user_id: 'u-b', academia_id: 'a2', papel: 'principal' });
    window.__senhas['beto@clube.com'] = 'senhadobeto';
    jogadorEntaoFaz(() => { window.__fezDepois = true; });
  });
  await page.waitForTimeout(150);
  await page.fill('#jog-email', 'beto@clube.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(300);
  await page.fill('#jog-senha', 'senhadobeto');
  await page.click('#jog-entrar');
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => !!contaAcademia && !!jogador && window.__fezDepois === true && !window.__saiu),
    'quem entra com o e-mail do Parceiros no site dos jogadores segue como jogador (e faz o que ia fazer)');
  await browser.close();

  // ---- "Não quero mais receber" pelo link do e-mail ----
  ({ browser, page } = await abrir({ jogador: true, q: '?parar-avisos=tok-j-ana&aviso=viagem&utm_source=Email-viagem' }));
  await page.evaluate(() => { window.__db.jogadores[0].avisos_viagem = true; });
  t = await texto(page, '#parar-overlay');
  ok(t.includes('Parar os avisos por e-mail?') && t.includes('os avisos de viagem'), 'o link abre a pergunta, sem parar sozinho');
  ok(await page.evaluate(() => !location.search.includes('parar-avisos') && location.search.includes('utm_source=Email-viagem')), 'o número da conta sai do link (a etiqueta fica)');
  await page.click('#parar-sim');
  await page.waitForTimeout(250);
  t = await texto(page, '#parar-overlay');
  ok(t.includes('Pronto') && await page.evaluate(() => window.__db.jogadores[0].avisos_viagem === false), '"Parar de receber" desliga o aviso de viagem');
  await page.click('#parar-ok');
  await page.waitForTimeout(150);
  ok(!(await page.$('#parar-overlay')), 'e a folha fecha');
  await browser.close();
  ({ browser, page } = await abrir({ q: '?parar-avisos=inventado&aviso=novas' }));
  await page.click('#parar-sim');
  await page.waitForTimeout(250);
  ok((await texto(page, '#parar-overlay')).includes('Esse link não vale mais'), 'link inventado: diz que não vale');
  await browser.close();

  // ---- Avisos da conta do Parceiros (Perfil) ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/perfil' }));
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.getElementById('pc-avisos-email')?.checked === true), 'Perfil do Parceiros: avaliação nova e pedidos por e-mail, ligados');
  await page.click('#pc-avisos-email');
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => window.__rpcs.some(r => r.nome === 'mudar_avisos_dos_parceiros' && r.args.p_ligado === false) && window.__db.academia_acessos[0].avisos_por_email === false), 'desmarcar desliga os avisos');
  await browser.close();

  // ---- Admin: os e-mails estão saindo? ----
  ({ browser, page } = await abrir({ admin: true }));
  await page.click('#fab-stats');
  await page.waitForTimeout(300);
  ok((await texto(page, '.emails-situacao')).includes('3 enviados em 7 dias'), 'Estatísticas: quantos avisos saíram');
  await page.evaluate(async () => { window.__situacaoEmails = { chave: false, envio: true, relogio: true, na_fila: 4, enviados_7_dias: 0, falharam: 0, ultimo_erro: null }; await carregarSituacaoDosEmails(); });
  t = await texto(page, '.emails-situacao');
  ok(t.includes('parados') && t.includes('RESEND_API_KEY') && t.includes('4 esperando'), 'sem a chave, diz o que falta — ' + t);
  await browser.close();

  // ---- Textos ----
  ({ browser, page } = await abrir());
  t = await texto(page, '#home-porque');
  ok(t.includes('facilidade tremenda') && t.includes('mais perto') && (t.match(/taxa/g) || []).length === 1, '"Por que o GuiaTennis": a facilidade de achar a quadra mais perto, e a taxa uma vez só');
  t = await texto(page, '#home-academias');
  ok(t.includes('Grátis para começar') && t.includes('Avaliação nova chega no seu e-mail') && !t.includes('a gente confere e publica'), '"Por que estar no GuiaTennis" (home) atualizado');
  await page.evaluate(() => { state.page = 'parceiros'; state.parceirosAba = 'inicio'; render(); });
  t = await texto(page, '#pc-beneficios');
  ok(t.includes('Avaliação nova no seu e-mail') && t.includes('Sua equipe e suas academias numa conta') && t.includes('vai viajar para a sua cidade'), '"Por que estar no GuiaTennis" (Parceiros) atualizado');
  await page.evaluate(() => { state.page = 'home'; state.showPrivacy = true; render(); });
  t = await page.evaluate(() => document.body.innerText);
  ok(t.includes('buscas que você salvar') && t.includes('Resend'), 'Política de Privacidade: buscas salvas e o serviço de e-mail');
  await browser.close();
})();
