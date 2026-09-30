// Ficha básica (academia com dados públicos, ainda não confirmados por ela),
// link do responsável, lista do mapa aberto no painel e textos legais.
const { abrir, ok } = require('./harness');

// O que o OpenStreetMap devolveria: uma academia nova, um clube (fica de
// fora pela regra do guia), uma já no guia (perto da a1) e uma repetida.
const MAPA = { elements: [
  { type: 'node', id: 1, lat: -23.55, lon: -46.70, tags: { name: 'Academia Nova de Tênis', sport: 'tennis', 'addr:street': 'Rua Nova', 'addr:housenumber': '10', 'addr:suburb': 'Butantã', 'addr:city': 'São Paulo', phone: '+55 11 3333-4444' } },
  { type: 'way', id: 2, center: { lat: -23.58, lon: -46.64 }, tags: { name: 'Clube Tal Tennis', sport: 'tennis' } },
  { type: 'node', id: 3, lat: -23.5601, lon: -46.6801, tags: { name: 'Quadras Perto da A1', sport: 'tennis' } },
  { type: 'node', id: 4, lat: -23.55, lon: -46.70, tags: { name: 'Academia Nova de Tênis', sport: 'tennis' } },
] };

const abrirFicha = (page, id) => page.evaluate((id) => {
  const c = state.allCourts.find(x => x.id === id);
  state.selected = decorate(c); state.page = 'court'; render();
  return {
    basica: document.querySelector('.ficha-basica')?.innerText || '',
    dono: document.querySelector('.ficha-dono a')?.getAttribute('href') || '',
  };
}, id);

(async () => {
  // Visitante: a2 é ficha básica, a1 (sem o campo) conta como confirmada
  let { browser, page } = await abrir();
  let f = await abrirFicha(page, 'a2');
  ok(f.basica.includes('Ficha básica') && f.basica.includes('não confirmadas pela academia'), 'ficha básica avisa que os dados não foram confirmados — ' + f.basica);
  ok(f.dono === '/parceiros/cadastro?academia=a2', 'link do responsável leva ao GuiaTennis Parceiros, já com a academia — ' + f.dono);
  await page.click('.ficha-dono a');
  await page.waitForTimeout(300);
  const acessoPedido = await page.evaluate(() => ({
    t: document.querySelector('.pc-reivindicar')?.innerText || '',
    wa: document.querySelector('.pc-reivindicar a')?.getAttribute('href') || '',
    link: location.pathname + location.search,
  }));
  ok(acessoPedido.t.includes('Pedir o acesso da Quadra Locação') && acessoPedido.wa.startsWith('https://wa.me/5511927456457?text=') && decodeURIComponent(acessoPedido.wa).includes('responsável pela Quadra Locação') && decodeURIComponent(acessoPedido.wa).includes('guiatennis.com.br/academia/quadra-locacao-a2') && acessoPedido.link === '/parceiros/cadastro?academia=a2', 'lá, o pedido de acesso abre o WhatsApp do guia com a conversa começada — ' + decodeURIComponent(acessoPedido.wa).slice(0, 90));
  f = await abrirFicha(page, 'a1');
  ok(!f.basica && f.dono, 'ficha confirmada não mostra o aviso, mas tem o link do responsável');
  await browser.close();

  // Banco ainda sem a coluna: o site lê sem ela e ninguém vira ficha básica
  ({ browser, page } = await abrir({ semConfirmada: true, q: '?diagnostico' }));
  const n = await page.evaluate(() => state.allCourts.length);
  ok(n === 2, 'banco sem a coluna nova: academias aparecem — ' + n);
  f = await abrirFicha(page, 'a2');
  ok(!f.basica, 'banco sem a coluna nova: nenhuma ficha vira básica');
  await browser.close();

  // Admin: a caixa "confirmadas pela academia" grava a coluna
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(() => { state.selected = decorate(state.allCourts.find(x => x.id === 'a2')); state.page = 'court'; render(); });
  await page.click('.editar-academia');
  const marcada = await page.isChecked('#f-confirmada');
  ok(marcada === false, 'edição carrega a ficha básica desmarcada');
  await page.check('#f-confirmada');
  await page.click('#register-submit');
  await page.waitForTimeout(800);
  const up = await page.evaluate(() => window.__ultimoUpdate || {});
  ok(up.confirmada === true, 'marcar "confirmadas pela academia" grava confirmada — ' + up.confirmada);
  await browser.close();

  // Admin: procura por região no mapa aberto, sem clube e sem o que já está no guia
  ({ browser, page } = await abrir({ admin: true, overpass: MAPA }));
  await page.click('#fab-admin');
  await page.waitForTimeout(400);
  let nomes = await page.evaluate(() => [...document.querySelectorAll('.mapa-bloco .pending-name')].map(e => e.innerText.trim()));
  ok(!nomes.length && await page.isVisible('#mapa-regiao'), 'painel abre sem consultar o mapa, com o campo da região');
  await page.fill('#mapa-regiao', 'Pinheiros');
  await page.click('#mapa-form button[type=submit]');
  await page.waitForTimeout(1500);
  nomes = await page.evaluate(() => [...document.querySelectorAll('.mapa-bloco .pending-name')].map(e => e.innerText.trim()));
  ok(nomes.join() === 'Academia Nova de Tênis', 'região mostra só a academia nova — ' + nomes.join(' | '));
  const acoes = await page.evaluate(() => {
    const item = document.querySelector('.mapa-bloco .pending-item');
    return { texto: item.innerText, wa: item.querySelector('a[href^="https://wa.me/"]')?.getAttribute('href') || '' };
  });
  ok(acoes.texto.includes('Rua Nova, 10 - Butantã - São Paulo') && acoes.texto.includes('km'), 'academia do mapa mostra endereço e distância — ' + acoes.texto.split('\n').slice(0, 3).join(' · '));
  ok(acoes.wa.startsWith('https://wa.me/551133334444?text=') && decodeURIComponent(acoes.wa).includes('Quero colocar a Academia Nova de Tênis no guia'), 'botão de WhatsApp da academia com o convite pronto');
  const credito = await page.evaluate(() => document.querySelector('.mapa-bloco')?.innerText.includes('colaboradores do OpenStreetMap'));
  ok(credito, 'lista do mapa dá o crédito ao OpenStreetMap');
  await page.click('[data-mapa-add]');
  await page.waitForTimeout(1200);
  const nova = await page.evaluate(() => window.__db.academias.find(a => a.name === 'Academia Nova de Tênis'));
  ok(nova && nova.status === 'pending' && nova.source === 'osm' && nova.confirmada === false, 'adicionar do mapa cria pendente, do mapa e ficha básica — ' + JSON.stringify(nova && { status: nova.status, source: nova.source, confirmada: nova.confirmada }));
  ok(nova && nova.endereco === 'Rua Nova, 10 - Butantã, São Paulo' && nova.phone === '1133334444', 'endereço e telefone vêm do mapa — ' + (nova && nova.endereco + ' · ' + nova.phone));
  nomes = await page.evaluate(() => [...document.querySelectorAll('.mapa-bloco .pending-name')].map(e => e.innerText.trim()));
  const pendente = await page.evaluate(() => document.getElementById('admin-overlay')?.innerText.includes('Veio do mapa aberto'));
  ok(!nomes.length && pendente, 'depois de adicionar, sai da lista do mapa e aparece nas pendentes');
  await browser.close();

  // Mapa sem resposta e região que não existe: mensagem clara
  ({ browser, page } = await abrir({ admin: true }));
  await page.click('#fab-admin');
  await page.fill('#mapa-regiao', 'Pinheiros');
  await page.click('#mapa-form button[type=submit]');
  await page.waitForTimeout(1500);
  let aviso = await page.evaluate(() => document.querySelector('.mapa-bloco')?.innerText || '');
  ok(aviso.includes('O mapa está lento agora') && !aviso.includes('Não deu certo'), 'mapa sem resposta: pede para tentar de novo em palavras simples');
  await page.route('**/nominatim.openstreetmap.org/search**', r => r.fulfill({ contentType: 'application/json', body: '[]' }));
  await page.fill('#mapa-regiao', 'Lugar Que Não Existe');
  await page.click('#mapa-form button[type=submit]');
  await page.waitForTimeout(1200);
  aviso = await page.evaluate(() => document.querySelector('.mapa-bloco')?.innerText || '');
  ok(aviso.includes('Não achei essa região') && aviso.includes('Moema, São Paulo'), 'região não encontrada: diz como escrever');
  await browser.close();

  // Academia sem foto: nada no lugar da foto, em nenhum cartão nem na ficha
  ({ browser, page } = await abrir());
  const semFoto = await page.evaluate(() => {
    const vazio = () => document.querySelectorAll('.mini-photo, .rcard-photo, .rcard-nophoto, .hero-empty, .ht-viz-foto, .cmp-add-foto, .cmp-vaga-foto, .map-card-photo').length;
    const home = { lugares: vazio(), texto: document.body.innerText.includes('Foto em breve') };
    state.page = 'search'; render();
    const busca = { lugares: vazio(), cartoes: document.querySelectorAll('.rcard').length };
    state.selected = decorate(state.allCourts.find(x => x.id === 'a1')); state.page = 'court'; render();
    const ficha = { lugares: vazio(), texto: document.body.innerText.includes('Foto em breve'), nome: !!document.querySelector('.court-name') };
    return { home, busca, ficha };
  });
  ok(semFoto.home.lugares === 0 && !semFoto.home.texto, 'página inicial: academia sem foto não mostra área de foto');
  ok(semFoto.busca.lugares === 0 && semFoto.busca.cartoes === 2, 'busca: cartões sem área de foto — ' + semFoto.busca.cartoes + ' cartões');
  ok(semFoto.ficha.lugares === 0 && !semFoto.ficha.texto && semFoto.ficha.nome, 'ficha sem foto começa direto no nome, sem "Foto em breve"');
  await browser.close();

  // Admin publica academia só com o nome; quem pede pelo site ainda preenche o essencial
  const FORM_VAZIO = { name: "", cep: "", address: "", numero: "", complemento: "", bairro: "", cidade: "", quadras: {}, amenities: [], modalidades: [], priceAula: "", priceLocacao: "", phone: "", instagram: "", site: "", photos: [], politica: {}, acesso: {}, horario: {} };
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate((f) => { window.__form = JSON.parse(JSON.stringify(f)); state.showRegister = true; state.registerStatus = 'idle'; render(); }, FORM_VAZIO);
  const formAdmin = await page.evaluate(() => ({
    whats: document.getElementById('f-phone').placeholder,
    nota: document.querySelector('#register-submit').parentElement.innerText,
    aceite: !!document.getElementById('f-consent'),
  }));
  ok(!formAdmin.whats.includes('*') && !formAdmin.aceite && formAdmin.nota.includes('Só o nome é obrigatório'), 'formulário do admin: sem asteriscos e sem aceite, só o nome é obrigatório');
  await page.fill('#f-name', 'Academia Só Nome');
  await page.click('#register-submit');
  await page.waitForTimeout(1500);
  const soNome = await page.evaluate(() => window.__db.academias.find(a => a.name === 'Academia Só Nome'));
  ok(soNome && soNome.status === 'published' && soNome.endereco === null, 'admin publica só com o nome — ' + JSON.stringify(soNome && { status: soNome.status, endereco: soNome.endereco }));
  await browser.close();
  ({ browser, page } = await abrir());
  await page.evaluate((f) => { saveVisitor({ nome: 'Visitante', contato: '11999999999' }); window.__form = JSON.parse(JSON.stringify(f)); state.showRegister = true; state.registerStatus = 'idle'; render(); }, FORM_VAZIO);
  await page.fill('#f-name', 'Pedido Só Nome');
  await page.click('#register-submit');
  await page.waitForTimeout(800);
  const pedido = await page.evaluate(() => ({ erro: document.querySelector('.form-error')?.innerText || '', gravou: window.__db.academias.some(a => a.name === 'Pedido Só Nome') }));
  ok(!pedido.gravou && pedido.erro.includes('endereço completo') && pedido.erro.includes('WhatsApp'), 'pedido pelo site ainda cobra o essencial — ' + pedido.erro);
  await browser.close();

  // Termos e Privacidade
  ({ browser, page } = await abrir());
  const termos = await page.evaluate(() => TERMS_HTML + PRIVACY_HTML);
  ok(termos.includes('ficha básica') && termos.includes('OpenStreetMap') && termos.includes('É o responsável por esta academia?'), 'Termos explicam a ficha básica, o OpenStreetMap e o pedido de remoção');
  ok((termos.match(/Última atualização: 30 de setembro de 2026/g) || []).length === 2, 'data dos dois textos legais acompanha a mudança');
  // Contato do guia em botões com ícone, no menu, no rodapé e no bloco para academias
  const contato = await page.evaluate(() => {
    state.showMenu = true; render();
    return {
      wa: [...document.querySelectorAll('a[href^="https://wa.me/5511927456457"]')].map(a => a.innerText.trim()),
      menu: [...document.querySelectorAll('.menu-item')].map(a => a.innerText.trim()).filter(t => ['WhatsApp', 'Instagram', 'E-mail'].includes(t)),
      rodape: [...document.querySelectorAll('.sf-col a.contato-link')].map(a => a.innerText.trim() + (a.querySelector('svg') ? '+logo' : '')),
      texto: document.body.innerText,
    };
  });
  ok(contato.menu.join() === 'WhatsApp,Instagram,E-mail', 'menu tem WhatsApp, Instagram e E-mail — ' + contato.menu.join(' | '));
  ok(contato.rodape.join() === 'WhatsApp+logo,Instagram+logo,E-mail+logo', 'rodapé tem WhatsApp, Instagram e E-mail com o logo pequeno — ' + contato.rodape.join(' | '));
  ok(contato.wa.some(t => t.includes('Chame o GuiaTennis no WhatsApp')), 'bloco para academias tem o link do WhatsApp');
  ok(!contato.texto.includes('92745-6457') && !contato.texto.includes('guiatennis1@gmail.com') && !contato.texto.includes('@guiatennis'), 'número, e-mail e @ não aparecem escritos na página');
  ok(termos.includes('(11) 92745-6457'), 'Termos e Privacidade têm o WhatsApp');
  await browser.close();
})();
