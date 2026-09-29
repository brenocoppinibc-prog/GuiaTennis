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
  ok(f.dono.startsWith('https://wa.me/5511927456457?text=') && decodeURIComponent(f.dono).includes('responsável pela Quadra Locação') && decodeURIComponent(f.dono).includes('?court=a2'), 'link do responsável abre o WhatsApp do guia com a conversa começada — ' + decodeURIComponent(f.dono).slice(0, 90));
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

  // Termos e Privacidade
  ({ browser, page } = await abrir());
  const termos = await page.evaluate(() => TERMS_HTML + PRIVACY_HTML);
  ok(termos.includes('ficha básica') && termos.includes('OpenStreetMap') && termos.includes('É o responsável por esta academia?'), 'Termos explicam a ficha básica, o OpenStreetMap e o pedido de remoção');
  ok((termos.match(/Última atualização: 29 de setembro de 2026/g) || []).length === 2, 'data dos dois textos legais acompanha a mudança');
  // Contato do guia em botões com ícone, no menu, no rodapé e no bloco para academias
  const contato = await page.evaluate(() => {
    state.showMenu = true; render();
    return {
      wa: [...document.querySelectorAll('a[href^="https://wa.me/5511927456457"]')].map(a => a.innerText.trim()),
      botoes: [...document.querySelectorAll('.contatos .contato-btn')].map(a => a.innerText.trim()),
      texto: document.body.innerText,
    };
  });
  ok(contato.botoes.join() === 'WhatsApp,Instagram,E-mail,WhatsApp,Instagram,E-mail', 'menu e rodapé têm os botões WhatsApp, Instagram e E-mail — ' + contato.botoes.join(' | '));
  ok(contato.wa.some(t => t.includes('Chame no WhatsApp')), 'bloco para academias tem o botão do WhatsApp');
  ok(!contato.texto.includes('92745-6457') && !contato.texto.includes('guiatennis1@gmail.com') && !contato.texto.includes('@guiatennis'), 'número, e-mail e @ não aparecem escritos na página');
  ok(termos.includes('(11) 92745-6457'), 'Termos e Privacidade têm o WhatsApp');
  await browser.close();
})();
