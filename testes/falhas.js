// Pedido do Breno em 11/10/2026: "eu preciso saber em algum lugar se alguma
// ação do site apresentou falha ou não e direcionar melhor os clientes
// quando algo não funcionar". O que falha vai para o banco (falhas_do_site)
// e aparece no painel do admin, em Falhas; a pessoa vê o que fazer, um
// código curto e "fale com a gente", que abre o chat com o problema escrito.
const { abrir, ok } = require('./harness');

const falhas = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__db.falhas_do_site)));
const REDE = { message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' };
const BANCO = { message: 'Could not find the function public.conta_do_email(p_email) in the schema cache', code: 'PGRST202' };

(async () => {
  // ---- a internet cai ao conferir o e-mail: aviso certo, linha de ajuda e registro ----
  let { browser, page } = await abrir({});
  await page.evaluate((e) => { window.__rpcComFalha = { conta_do_email: e }; abrirContaJogador('entrar'); }, REDE);
  await page.waitForTimeout(200);
  await page.fill('#jog-email', 'ana@exemplo.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(600);
  // O aviso e, logo embaixo dele, a linha de ajuda.
  const avisoComAjuda = () => page.evaluate(() => { const e = document.querySelector('.form-error'); const a = e && e.nextElementSibling && e.nextElementSibling.classList.contains('falha-ajuda') ? e.nextElementSibling : null; return ((e ? e.innerText : '') + (a ? ' ' + a.innerText : '')).replace(/\s+/g, ' '); });
  let aviso = await avisoComAjuda();
  ok(aviso.includes('A conexão falhou. Confira a internet e tente de novo em instantes.'), 'sem conexão, o aviso diz para conferir a internet — ' + aviso);
  const codigo = (aviso.match(/código ([A-HJ-NP-Z2-9]{6})/) || [])[1];
  ok(!!codigo && aviso.includes('Se continuar, fale com a gente'), 'embaixo do aviso: "Se continuar, fale com a gente · código" — ' + codigo);
  let lista = await falhas(page);
  ok(lista.length === 1 && lista[0].codigo === codigo && lista[0].acao === 'Conferir o e-mail' && lista[0].tipo === 'rede' && lista[0].aviso_na_tela === true,
    'a falha vai para o banco com o mesmo código, a ação e o tipo — ' + JSON.stringify(lista[0] && { acao: lista[0].acao, tipo: lista[0].tipo }));
  ok(lista[0].site === 'jogadores' && lista[0].quem === 'visitante' && /^[a-z0-9]{8,32}$/.test(lista[0].visita || '') && lista[0].dispositivo && lista[0].navegador && lista[0].tela === '/',
    'com o site, quem, a visita do percurso, o aparelho, o navegador e a tela');
  ok(!(await page.isVisible('#falha-faixa')), 'com o aviso na tela, sem a faixa embaixo (nada repetido)');
  await page.click('.falha-ajuda [data-falha-ajuda]');
  await page.waitForTimeout(300);
  const chat = await page.evaluate(() => { const l = [...document.querySelectorAll('#chat-msgs .chat-msg')].pop(); return { texto: l.innerText.replace(/\s+/g, ' '), acoes: [...l.querySelectorAll('.chat-acao')].map(a => a.innerText.trim()), whats: decodeURIComponent(l.querySelector('a.chat-acao.whats')?.getAttribute('href') || '') }; });
  ok(chat.texto.includes(`não deu para conferir o e-mail (código ${codigo})`) && chat.texto.includes('Wi-Fi') && chat.acoes.includes('Recarregar a página') && chat.acoes.includes('Falar com o Breno no WhatsApp'),
    '"fale com a gente" abre o chat com o problema, o que costuma resolver e o WhatsApp — ' + chat.texto.slice(0, 90));
  ok(chat.whats.includes(`Tive um problema: não deu para conferir o e-mail (código ${codigo})`), 'o WhatsApp do Breno já vai com o problema e o código');
  await browser.close();

  // ---- erro de regra não é falha ----
  ({ browser, page } = await abrir({}));
  await page.evaluate(() => { window.__rpcComFalha = { conta_do_email: { message: 'E-mail inválido.', code: '22023' } }; abrirContaJogador('entrar'); });
  await page.waitForTimeout(200);
  await page.fill('#jog-email', 'ana@exemplo.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(600);
  aviso = await avisoComAjuda();
  ok(aviso.includes('Não consegui conferir o e-mail agora') && !aviso.includes('código') && (await falhas(page)).length === 0,
    'erro de regra do banco: o aviso de sempre, sem código e sem registro');
  // Senha errada continua "E-mail ou senha incorretos."; a internet que cai, não.
  await page.evaluate(() => { window.__rpcComFalha = null; window.__db.jogadores.push({ user_id: 'j-z', nome: 'Zé', email: 'ze@exemplo.com' }); window.__senhas['ze@exemplo.com'] = 'senhadoze1'; abrirContaJogador('entrar'); });
  await page.waitForTimeout(200);
  await page.fill('#jog-email', 'ze@exemplo.com');
  await page.click('#jog-continuar');
  await page.waitForTimeout(300);
  await page.fill('#jog-senha', 'errada123');
  await page.click('#jog-entrar');
  await page.waitForTimeout(500);
  aviso = await avisoComAjuda();
  ok(aviso.includes('E-mail ou senha incorretos.') && !aviso.includes('código') && (await falhas(page)).length === 0, 'senha errada não é falha do site');
  await page.evaluate(() => { const original = sb.auth.signInWithPassword; sb.auth.signInWithPassword = () => Promise.resolve({ data: { session: null }, error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 } }); window.__voltarLogin = original; });
  await page.fill('#jog-senha', 'senhadoze1');
  await page.click('#jog-entrar');
  await page.waitForTimeout(600);
  aviso = await avisoComAjuda();
  lista = await falhas(page);
  ok(aviso.includes('A conexão falhou') && !aviso.includes('incorretos') && lista.length === 1 && lista[0].acao === 'Entrar na conta',
    'a internet que cai ao entrar não diz "senha incorreta": diz para conferir a conexão — ' + aviso);
  await browser.close();

  // ---- sem lugar na tela para avisar: a faixa embaixo, com "Tentar de novo" ----
  ({ browser, page } = await abrir({}));
  await page.evaluate(() => { window.__tentou = 0; falhou('cancelar o pedido', { message: 'canceling statement due to statement timeout', code: '57014' }, { texto: 'Não consegui cancelar agora. Tente de novo em instantes.', tentar: () => { window.__tentou++; } }); });
  await page.waitForTimeout(600);
  const faixa = await page.evaluate(() => document.getElementById('falha-faixa')?.innerText.replace(/\s+/g, ' ') || '');
  ok(faixa.includes('Não consegui cancelar agora. Tente de novo em instantes.') && /Código do problema: [A-HJ-NP-Z2-9]{6}/.test(faixa) && faixa.includes('Tentar de novo') && faixa.includes('Preciso de ajuda'),
    'a faixa diz o que aconteceu, o código, "Tentar de novo" e "Preciso de ajuda" — ' + faixa);
  ok((await falhas(page))[0].tipo === 'banco', 'o tipo vem do erro (banco)');
  await page.click('#falha-faixa [data-falha-tentar]');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => window.__tentou === 1 && !document.getElementById('falha-faixa')), '"Tentar de novo" faz de novo e a faixa sai');
  await page.evaluate(() => falhou('apagar a resposta', { message: 'boom', code: 'XX000' }));
  await page.waitForTimeout(600);
  await page.click('#falha-faixa [data-falha-faixa-ajuda]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => !!document.querySelector('#chat-overlay') && !document.getElementById('falha-faixa') && [...document.querySelectorAll('#chat-msgs .chat-msg')].pop().innerText.includes('não deu para apagar a resposta')),
    '"Preciso de ajuda" abre o chat com o problema');
  await page.evaluate(() => { fecharChat(); falhou('testar o ✕', { message: 'x', code: 'XX000' }); });
  await page.waitForTimeout(600);
  await page.click('#falha-faixa .falha-faixa-fechar');
  ok(!(await page.isVisible('#falha-faixa')), 'o ✕ fecha a faixa');
  // A mesma falha repetida em poucos segundos não vai de novo.
  const antes = (await falhas(page)).length;
  await page.evaluate(() => { falhou('repetir', { message: 'igual', code: 'XX000' }, { silenciosa: true }); falhou('repetir', { message: 'igual', code: 'XX000' }, { silenciosa: true }); });
  ok((await falhas(page)).length === antes + 1, 'a mesma falha duas vezes seguidas vai uma vez só');
  // Dados de quem usa saem da mensagem antes de ir.
  await page.evaluate(() => falhou('testar os dados', { message: 'duplicate key (email)=(maria@exemplo.com) whatsapp (11) 98765-4321 token eyJhbGciOiJIUzI1NiIsInR5cCI6', code: 'XX000' }, { silenciosa: true }));
  await page.waitForTimeout(100);
  const sujo = (await falhas(page))[0].mensagem;
  ok(!sujo.includes('maria@') && !sujo.includes('98765') && !sujo.includes('eyJ') && sujo.includes('[e-mail]'), 'e-mail, telefone e chave saem da mensagem — ' + sujo);
  await browser.close();

  // ---- erro do código do site ----
  ({ browser, page } = await abrir({}));
  await page.evaluate(() => { setTimeout(() => { window.naoExiste.nada(); }, 0); });
  await page.waitForTimeout(700);
  lista = await falhas(page);
  ok(lista.length === 1 && lista[0].acao === 'Código do site' && lista[0].tipo === 'codigo' && /naoExiste|undefined/.test(lista[0].mensagem) && lista[0].aviso_na_tela === false && !(await page.isVisible('#falha-faixa')),
    'erro do código sem toque da pessoa: vai para o banco, sem faixa — ' + (lista[0] && lista[0].mensagem));
  await page.evaluate(() => { document.body.click(); setTimeout(() => { window.outroQueNaoExiste.outraCoisa(); }, 0); });
  await page.waitForTimeout(700);
  const faixaCodigo = await page.evaluate(() => document.getElementById('falha-faixa')?.innerText || '');
  ok(faixaCodigo.includes('Algo não funcionou como deveria') && (await falhas(page))[0].aviso_na_tela === true, 'logo depois de um toque, a pessoa vê a faixa com o que fazer');
  await browser.close();

  // ---- a rede de serviços de fora: sozinhas, sem aviso, depois de alguns segundos ----
  ({ browser, page } = await abrir({}));
  await page.route('**/servico-503.test/**', r => r.fulfill({ status: 503, body: '' }));
  await page.evaluate(() => { fetch('https://servico-503.test/x?cep=05422000').catch(() => {}); fetch('https://caiu.test/y').catch(() => {}); });
  await page.waitForTimeout(400);
  ok((await falhas(page)).length === 0, 'a falha de rede espera alguns segundos (a tela pode adotar)');
  await page.waitForTimeout(6500);
  lista = await falhas(page);
  const servico = lista.find(f => f.acao === 'Servico-503.test'), caiu = lista.find(f => f.acao === 'Caiu.test');
  ok(servico && servico.tipo === 'servico' && /erro 503/.test(servico.mensagem) && !(servico.detalhe || '').includes('05422000') && caiu && caiu.tipo === 'rede' && !caiu.aviso_na_tela,
    'serviço com erro 503 e serviço que não respondeu vão sozinhos, sem o que veio no link — ' + lista.map(f => f.acao + ':' + f.tipo).join(', '));
  // A tela adota a falha da rede: um registro só, com o motivo de verdade.
  await page.evaluate(() => fetch('https://caiu-de-novo.test/z').catch(() => {}));
  await page.waitForTimeout(200);
  await page.evaluate(() => falhou('buscar o endereço', new Error('Não consegui localizar esse endereço no mapa.'), { texto: 'Não consegui localizar esse endereço no mapa.', soSeTecnica: true }));
  await page.waitForTimeout(6500);
  lista = await falhas(page);
  const adotada = lista.filter(f => /caiu-de-novo|Buscar o endereço/i.test(f.acao + f.detalhe));
  ok(adotada.length === 1 && adotada[0].acao === 'Buscar o endereço' && adotada[0].tipo === 'rede' && /caiu-de-novo/.test(adotada[0].detalhe),
    'a tela que mostrou o aviso adota a falha da rede (um registro só, com o serviço que caiu)');
  await page.evaluate(() => falhou('buscar o endereço', new Error('Não consegui localizar esse endereço. Confira o CEP, bairro e cidade.'), { soSeTecnica: true }));
  await page.waitForTimeout(200);
  ok((await falhas(page)).length === lista.length, 'endereço que não existe não é falha do site');
  await browser.close();

  // ---- sem internet: o aviso diz isso e o registro espera a conexão voltar ----
  ({ browser, page } = await abrir({}));
  await page.context().setOffline(true);
  const textoOff = await page.evaluate(() => falhou('salvar a busca', { message: 'TypeError: Failed to fetch' }, { texto: 'Não consegui salvar a busca agora.' }));
  ok(textoOff.startsWith('Sem conexão com a internet') && (await falhas(page)).length === 0, 'sem internet: "Confira o Wi-Fi ou os dados do celular", e o registro espera');
  await page.context().setOffline(false);
  await page.waitForTimeout(300);
  lista = await falhas(page);
  ok(lista.length === 1 && lista[0].acao === 'Salvar a busca', 'a conexão voltou: o registro vai sozinho');
  await browser.close();

  // ---- o chat entende "deu erro" ----
  ({ browser, page } = await abrir({}));
  await page.evaluate(() => abrirChat());
  await page.waitForTimeout(200);
  const chips = await page.evaluate(() => [...document.querySelectorAll('.chat-chips .chip')].map(c => c.innerText.trim()));
  ok(chips.includes('Algo não funcionou'), '"Algo não funcionou" entre os assuntos do chat');
  await page.fill('#chat-texto', 'o site deu erro');
  await page.click('.chat-enviar');
  await page.waitForTimeout(200);
  let resposta = await page.evaluate(() => [...document.querySelectorAll('#chat-msgs .chat-msg')].pop().innerText);
  ok(resposta.includes('recarregue a página') && resposta.includes('código do problema'), 'sem falha recente, diz o que costuma resolver e pede o código, se houver');
  await page.evaluate(() => { fecharChat(); falhou('salvar o perfil', { message: 'boom', code: 'XX000' }, { silenciosa: false }); });
  await page.waitForTimeout(600);
  const cod = (await falhas(page))[0].codigo;
  await page.evaluate(() => { document.getElementById('falha-faixa')?.remove(); abrirChat(); });
  await page.waitForTimeout(200);
  await page.fill('#chat-texto', 'não funciona');
  await page.click('.chat-enviar');
  await page.waitForTimeout(200);
  resposta = await page.evaluate(() => [...document.querySelectorAll('#chat-msgs .chat-msg')].pop().innerText);
  ok(resposta.includes(`não deu para salvar o perfil (código ${cod})`), 'logo depois de uma falha, o chat já sabe qual foi e o código');
  await browser.close();

  // ---- o banco sem o SQL novo: nada quebra ----
  ({ browser, page } = await abrir({ semFalhas: true }));
  await page.evaluate(() => falhou('testar sem a tabela', { message: 'x', code: 'XX000' }));
  await page.waitForTimeout(600);
  ok(await page.isVisible('#falha-faixa'), 'banco sem a tabela: a pessoa ainda vê a ajuda');
  await browser.close();

  // ---- painel do admin: Falhas ----
  const agora = Date.now();
  const iso = (min) => new Date(agora - min * 60000).toISOString();
  const base = { site: 'jogadores', acao: 'Enviar a avaliação', tipo: 'banco', mensagem: 'PGRST202 · Could not find the function', tela: '/academia/so-aula-tennis-a1', quem: 'visitante', dispositivo: 'Celular', navegador: 'Safari 17', sistema: 'iOS 17', aviso_na_tela: true, resolvida_em: null, academia_id: 'a1' };
  const iniciais = [
    { ...base, id: 'f1', codigo: 'K7Q2MX', grupo: 'g1', visita: 'visitaum1', created_at: iso(5) },
    { ...base, id: 'f2', codigo: 'ABC234', grupo: 'g1', visita: 'visitadois', created_at: iso(30), dispositivo: 'Computador', navegador: 'Chrome 129', sistema: 'Windows' },
    { ...base, id: 'f3', codigo: 'DEF567', grupo: 'g1', visita: 'visitadois', created_at: iso(60) },
    { ...base, id: 'f4', codigo: 'GHJ234', grupo: 'g2', acao: 'Salvar a ficha', tipo: 'rede', mensagem: 'Failed to fetch', site: 'parceiros', quem: 'academia', visita: 'visitatres', created_at: iso(3 * 24 * 60) },
    { ...base, id: 'f5', codigo: 'LMN234', grupo: 'g3', acao: 'Excluir a avaliação', quem: 'admin', site: 'admin', visita: null, created_at: iso(10) },
  ];
  ({ browser, page } = await abrir({ admin: true, q: 'admin', falhas: iniciais, w: 1100 }));
  await page.waitForTimeout(400);
  const tarefa = await page.evaluate(() => [...document.querySelectorAll('.adm-tarefa')].map(t => t.innerText.replace(/\s+/g, ' ')).find(t => /falha/.test(t)) || '');
  ok(tarefa.includes('1 falha no site nas últimas 24 horas'), 'Para fazer agora: as falhas das últimas 24 horas (sem as do próprio admin) — ' + tarefa);
  const naBarra = await page.evaluate(() => document.querySelector('.adm-nav-i[data-adm-aba="falhas"]')?.innerText.replace(/\s+/g, ' ') || '');
  ok(/Falhas do site\s*1/.test(naBarra), 'Falhas do site na barra do painel, com o número — ' + naBarra);
  await page.click('.adm-nav-i[data-adm-aba="falhas"]');
  await page.waitForTimeout(400);
  const tela = await page.evaluate(() => ({ url: location.pathname, h1: document.querySelector('.adm-h1')?.innerText, cartoes: [...document.querySelectorAll('.adm-falha')].map(a => a.innerText.replace(/\s+/g, ' ')), resumo: [...document.querySelectorAll('.adm-nota')].map(n => n.innerText).find(t => /tipos/.test(t)) || '' }));
  ok(tela.url === '/admin/falhas' && tela.h1 === 'Falhas do site', 'a seção abre em /admin/falhas');
  ok(tela.cartoes.length === 3 && tela.cartoes[0].includes('Enviar a avaliação') && tela.cartoes[0].includes('3 vezes') && tela.cartoes[0].includes('2 visitas') && tela.cartoes[0].includes('Nova'),
    'as iguais juntas, com quantas vezes, quantas visitas e "Nova" — ' + tela.cartoes[0]);
  ok(tela.cartoes[0].includes('Celular 2 · Computador 1') && tela.cartoes[0].includes('Safari 17 (2)') && tela.cartoes[0].includes('Site dos jogadores'), 'com os aparelhos, os navegadores e o site');
  ok(tela.resumo.includes('5 falhas em 3 tipos') && tela.resumo.includes('4 visitas afetadas'), 'o resumo do período — ' + tela.resumo);
  // As ocorrências e o caminho da visita até a falha.
  await page.evaluate(() => window.__db.passos_das_visitas.push(
    { visita: 'visitaum1', site: 'jogadores', ordem: 1, tipo: 'chegada', tela: '/', detalhe: 'Página inicial', segundos: 0, created_at: new Date(Date.now() - 8 * 60000).toISOString() },
    { visita: 'visitaum1', site: 'jogadores', ordem: 2, tipo: 'ficha', tela: '/academia/so-aula-tennis-a1', detalhe: 'Só Aula Tennis', segundos: 60, created_at: new Date(Date.now() - 7 * 60000).toISOString() },
    { visita: 'visitaum1', site: 'jogadores', ordem: 3, tipo: 'contato', tela: '/academia/so-aula-tennis-a1', detalhe: 'WhatsApp · Só Aula Tennis', segundos: 400, created_at: new Date(Date.now() - 60000).toISOString() }));
  await page.click('[data-falha-grupo="g1"]');
  await page.waitForTimeout(200);
  const ocs = await page.evaluate(() => [...document.querySelectorAll('.adm-falha-oc')].map(o => o.innerText.replace(/\s+/g, ' ')));
  ok(ocs.length === 3 && ocs[0].includes('K7Q2MX') && ocs[0].includes('visitante') && ocs[0].includes('Celular, Safari 17, iOS 17') && ocs[0].includes('Só Aula Tennis') && ocs[0].includes('A pessoa viu o aviso'),
    'cada ocorrência com o código, quem, o aparelho, a academia e se a pessoa viu o aviso — ' + ocs[0]);
  await page.click('[data-falha-visita="f1"]');
  await page.waitForTimeout(300);
  const caminho = await page.evaluate(() => document.querySelector('.adm-falha-caminho')?.innerText.replace(/\s+/g, ' ') + ' | ' + ([...document.querySelectorAll('.adm-falha-oc .adm-nota')].map(n => n.innerText).join(' ')));
  ok(caminho.includes('Chegou: Página inicial') && caminho.includes('Abriu a ficha: Só Aula Tennis') && caminho.includes('Falha: Enviar a avaliação') && caminho.includes('a pessoa ainda chamou uma academia'),
    'o caminho da visita até a falha, e o que ela fez depois — ' + caminho);
  // Procurar pelo código.
  await page.fill('#adm-falha-codigo', 'gh-j234');
  await page.click('#adm-falha-busca button[type=submit]');
  await page.waitForTimeout(300);
  const achada = await page.evaluate(() => document.querySelector('.adm-falha-achada')?.innerText.replace(/\s+/g, ' ') || '');
  ok(achada.includes('Salvar a ficha') && achada.includes('GHJ234') && achada.includes('conta do Parceiros'), 'acha pelo código, com letra minúscula e traço — ' + achada.slice(0, 80));
  // Marcar como resolvida.
  await page.click('[data-falha-resolver="g1"]');
  await page.waitForTimeout(400);
  const depois = await page.evaluate(() => ({ cartoes: [...document.querySelectorAll('.adm-falha')].map(a => a.innerText), aviso: document.querySelector('.conta-aviso')?.innerText || '', rpc: window.__rpcs.some(r => r.nome === 'resolver_falhas_admin' && r.args.p_grupo === 'g1') }));
  ok(depois.rpc && !depois.cartoes.some(t => t.includes('Enviar a avaliação')) && depois.aviso.includes('Voltou'), '"Marcar como resolvida" tira a falha das abertas e explica o "Voltou"');
  await page.click('[data-falhas-filtro="resolvidas"]');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => [...document.querySelectorAll('.adm-falha')].some(a => a.innerText.includes('Enviar a avaliação') && a.innerText.includes('Resolvida'))), 'em Resolvidas, ela aparece marcada');
  // O admin, quando algo falha, vê "Anotada em Falhas" (não "fale com a gente").
  await page.evaluate(() => { state.admFalhasFiltro = 'abertas'; state.admAviso = ''; state.admJogadores = null; window.__rpcComFalha = { reenviar_email_admin: { message: 'upstream', code: 'XX000', status: 502 } }; reenviarEmail('x'); });
  await page.waitForTimeout(700);
  const faixaAdmin = await page.evaluate(() => document.getElementById('falha-faixa')?.innerText.replace(/\s+/g, ' ') || '');
  ok(faixaAdmin.includes('Ver em Falhas') && !faixaAdmin.includes('Preciso de ajuda'), 'no painel, a faixa do admin leva a Falhas — ' + faixaAdmin);
  ok((await falhas(page))[0].quem === 'admin', 'a falha do admin fica marcada como dele');
  await browser.close();

  // ---- banco sem o SQL: o painel avisa, sem quebrar ----
  ({ browser, page } = await abrir({ admin: true, q: 'admin/falhas', semFalhas: true }));
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.querySelector('.adm-main').innerText.includes('O banco ainda não tem as falhas (SQL 20261011120000)')), 'banco sem o SQL novo: o painel diz que entra com o PR');
  // Política de Privacidade.
  const pol = await page.evaluate(() => PRIVACY_HTML);
  ok(pol.includes('Falhas do site') && pol.includes('90 dias') && pol.includes('Não guardamos a sua conta, o seu e-mail, o que você digitou, IP nem identificador do aparelho'), 'a Política de Privacidade explica as falhas');
  await browser.close();
})();
