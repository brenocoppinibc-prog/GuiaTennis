// Percurso das visitas (pedido do Breno em 05/10/2026): cada passo da visita
// vai para passos_das_visitas — de onde veio, por qual meio, o aparelho, as
// telas, a busca (só a região), a ficha, o contato e o tempo desde a
// chegada —, sem identificar ninguém; o admin vê o funil, as origens, os
// caminhos mais comuns e o passo a passo de cada visita.
const { abrir, ok } = require('./harness');
const passos = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__db.passos_das_visitas)));

(async () => {
  // ---- visitante no site dos jogadores ----
  let { browser, page } = await abrir({ q: '?utm_source=Instagram-bio' });
  await page.evaluate(async () => { state.cep = 'Rua das Flores 123, Pinheiros'; await doSearch(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => openCourt('a1'));
  await page.waitForTimeout(200);
  await page.evaluate(() => trackClick('a1', 'whatsapp'));
  await page.waitForTimeout(200);
  let p = await passos(page);
  const tipos = p.map(x => x.tipo).join(',');
  ok(p.length >= 4 && p[0].tipo === 'tela' && p[0].detalhe === 'Página inicial' && p[0].tela === '/', 'a chegada é o primeiro passo — ' + tipos);
  ok(p.every(x => x.origem === 'Instagram-bio' && x.meio === 'bio' && x.dispositivo && x.site === 'jogadores'), 'de onde veio (Instagram-bio), por qual meio (bio) e o aparelho em cada passo');
  const busca = p.find(x => x.tipo === 'busca') || {};
  ok(/Pinheiros/.test(busca.detalhe || '') && !/Flores|123/.test(JSON.stringify(p)), 'a busca guarda a região, nunca o endereço digitado — ' + busca.detalhe);
  const ficha = p.find(x => x.tipo === 'ficha') || {};
  ok(ficha.academia_id === 'a1' && ficha.detalhe === 'Só Aula Tennis' && /^\/academia\//.test(ficha.tela), 'a ficha aberta vira um passo, com a academia');
  const contato = p.find(x => x.tipo === 'contato') || {};
  ok(contato.detalhe === 'WhatsApp · Só Aula Tennis' && contato.academia_id === 'a1', 'o contato vira um passo — ' + contato.detalhe);
  ok(new Set(p.map(x => x.visita)).size === 1 && /^[a-z0-9]{16}$/.test(p[0].visita) && p.every((x, i) => !i || (x.ordem > p[i - 1].ordem && x.segundos >= p[i - 1].segundos)), 'uma visita só (número sorteado), com a ordem e o tempo desde a chegada');
  ok(!p.some(x => 'lat' in x || 'ip' in x || 'cep' in x) && !p.some(x => /\?/.test(x.tela)), 'sem ponto, CEP, IP nem a parte do link depois do "?"');
  // Favoritar e comparar também são passos.
  await page.evaluate(() => { toggleFavorite('a2'); toggleCompare('a2'); });
  p = await passos(page);
  ok(p.some(x => x.detalhe === 'Favoritou · Quadra Locação') && p.some(x => x.detalhe === 'Pôs na comparação · Quadra Locação'), 'favoritar e comparar entram no caminho');
  await page.evaluate(() => { state.showMenu = true; render(); });
  p = await passos(page);
  ok(p[p.length - 1].detalhe === 'Abriu o menu', 'janelas por cima (menu, cadastro, Entrar) também');
  await browser.close();

  // ---- GuiaTennis Parceiros: as etapas do cadastro ----
  ({ browser, page } = await abrir({ q: 'parceiros/cadastro' }));
  await page.fill('#pc-email', 'nova@academia.com.br');
  await page.click('#pc-email-continuar');
  await page.waitForTimeout(400);
  p = await passos(page);
  ok(p.map(x => x.detalhe).join(' | ') === 'Parceiros · Cadastro: o e-mail | Parceiros · Cadastro: dados de contato' && p.every(x => x.site === 'parceiros'), 'no Parceiros, cada etapa do cadastro é um passo — ' + p.map(x => x.detalhe).join(' | '));
  await browser.close();

  // ---- quem não entra ----
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(() => openCourt('a1'));
  ok((await passos(page)).length === 0, 'admin conectado não grava nada');
  await browser.close();
  ({ browser, page } = await abrir({ academia: 'a2' }));
  await page.evaluate(() => openCourt('a1'));
  ok((await passos(page)).length === 0, 'conta de academia no site dos jogadores não grava');
  await page.evaluate(() => irParceiros('painel', { mesmaAba: true }));
  p = await passos(page);
  ok(p.length === 1 && p[0].site === 'parceiros' && p[0].detalhe === 'Parceiros · Atualizações', 'no GuiaTennis Parceiros, a conta da academia grava o percurso');
  await browser.close();
  ({ browser, page } = await abrir({ trocar: h => h }));
  await page.evaluate(() => { window.__semPercurso = true; });
  await page.evaluate(() => openCourt('a1'));
  await page.evaluate(() => openCourt('a2'));
  ok(await page.evaluate(() => semPercurso === true && state.page === 'court'), 'banco sem a tabela: para de mandar e o site segue normal');
  await browser.close();

  // ---- o relatório do admin ----
  ({ browser, page } = await abrir({ admin: true }));
  await page.evaluate(() => {
    const agora = Date.now();
    const em = (s) => new Date(agora - 3600e3 + s * 1000).toISOString();
    const p = (visita, ordem, tipo, detalhe, segundos, extra = {}) => ({ id: visita + ordem, visita, site: 'jogadores', ordem, tipo, tela: '/', detalhe, academia_id: null, origem: 'Instagram-bio', meio: 'bio', dispositivo: 'Celular', segundos, created_at: em(segundos), ...extra });
    window.__db.passos_das_visitas.push(
      p('visita1aaaaaaaaa', 1, 'tela', 'Página inicial', 0),
      p('visita1aaaaaaaaa', 2, 'busca', 'Pinheiros, São Paulo', 12),
      p('visita1aaaaaaaaa', 3, 'ficha', 'Só Aula Tennis', 52, { academia_id: 'a1' }),
      p('visita1aaaaaaaaa', 4, 'contato', 'WhatsApp · Só Aula Tennis', 122, { academia_id: 'a1' }),
      p('visita1aaaaaaaaa', 5, 'saida', 'Saiu ou trocou de aba', 125),
      p('visita2bbbbbbbbb', 1, 'tela', 'Página inicial', 0, { origem: 'Google', meio: 'busca do Google', dispositivo: 'Computador' }),
      p('visita2bbbbbbbbb', 2, 'busca', 'Moema, São Paulo', 20, { origem: 'Google', meio: 'busca do Google', dispositivo: 'Computador' }),
      p('visita3ccccccccc', 1, 'tela', 'Parceiros · Apresentação', 0, { site: 'parceiros', origem: 'WhatsApp-academias', meio: 'academias' }),
      p('visita3ccccccccc', 2, 'tela', 'Parceiros · Cadastro: o e-mail', 30, { site: 'parceiros', origem: 'WhatsApp-academias', meio: 'academias' }),
      p('visita3ccccccccc', 3, 'acao', 'Criou a conta no GuiaTennis Parceiros', 95, { site: 'parceiros', origem: 'WhatsApp-academias', meio: 'academias' }),
    );
  });
  await page.evaluate(() => abrirPercursos());
  await page.waitForTimeout(300);
  let r = await page.evaluate(() => ({
    funil: [...document.querySelectorAll('.perc-funil-i')].map(x => x.innerText.replace(/\s+/g, ' ').trim()),
    origens: [...document.querySelectorAll('#percursos-overlay .stat-regiao')].map(x => x.innerText.replace(/\s+/g, ' ').trim()),
    visitas: document.querySelectorAll('.perc-visita').length,
  }));
  ok(r.funil[0] === 'Visitas 2' && r.funil[1].startsWith('Buscaram 2') && r.funil[2].startsWith('Abriram uma ficha 1 50%') && r.funil[3].startsWith('Chamaram uma academia 1 50%'), 'funil dos jogadores: visitas, buscaram, abriram ficha, chamaram — ' + r.funil.join(' / '));
  ok(r.origens.some(o => o.startsWith('Instagram-bio · bio 1') && o.includes('1 chamou')) && r.origens.some(o => o.startsWith('Google · busca do Google 1')), 'de onde vieram, por qual meio e quantos chegaram a chamar');
  ok(r.origens.some(o => o.startsWith('Início → Busca → Ficha → Contato 1')), 'os caminhos mais comuns — ' + r.origens.filter(o => o.includes('→')).join(' / '));
  await page.click('[data-percurso="visita1aaaaaaaaa"]');
  await page.waitForTimeout(150);
  const linha = await page.evaluate(() => [...document.querySelectorAll('.perc-visita.aberta .perc-linha li')].map(li => li.innerText.replace(/\s+/g, ' ').trim()));
  ok(linha[0] === '0:00 Chegou: Página inicial · ficou 12 s' && linha[2] === '0:52 Abriu a ficha: Só Aula Tennis · ficou 1 min 10 s' && linha[3].startsWith('2:02 Chamou no WhatsApp · Só Aula Tennis') && linha[4] === '2:05 Saiu (fechou ou trocou de aba)', 'cada visita, passo a passo, com o tempo em cada passo — ' + linha.join(' | '));
  await page.click('[data-perc-site="parceiros"]');
  await page.waitForTimeout(150);
  r = await page.evaluate(() => [...document.querySelectorAll('.perc-funil-i')].map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  ok(r[0] === 'Visitas 1' && r[1].startsWith('Abriram o cadastro 1') && r[2].startsWith('Criaram a conta 1'), 'funil do GuiaTennis Parceiros: cadastro e conta — ' + r.join(' / '));
  ok(await page.evaluate(() => PRIVACY_HTML.includes('Percurso da visita') && PRIVACY_HTML.includes('número sorteado')), 'a Política de Privacidade explica o percurso');
  await browser.close();
})();
