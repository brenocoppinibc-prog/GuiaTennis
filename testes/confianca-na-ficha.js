// Análise de 07/10/2026 (o que serve da análise do GPT): a ficha diz se é
// da academia e quando foi atualizada, a seção de avaliações explica como
// elas funcionam, e os números do site dizem o que contam.
const { abrir, ok } = require('./harness');

const diasAtras = (n) => new Date(Date.now() - n * 86400000).toISOString();
const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);
const abrirFicha = (page, id) => page.evaluate((id) => {
  state.selected = decorate(state.allCourts.find(x => x.id === id)); state.page = 'court'; render();
}, id);

(async () => {
  // ---- "Confirmada pela academia · atualizada há 4 dias" ----
  let { browser, page } = await abrir({ atualizadaEm: diasAtras(4) });
  await abrirFicha(page, 'a1');
  let linha = await texto(page, '.ficha-confirmada');
  ok(linha.includes('Confirmada pela academia') && linha.includes('atualizada há 4 dias'), 'ficha confirmada diz quando foi atualizada — ' + linha);
  await abrirFicha(page, 'a2');
  ok(!(await page.$('.ficha-confirmada')) && (await texto(page, '.ficha-basica')).includes('Ficha básica'), 'ficha básica continua com o aviso, sem a linha de confirmada');
  const datas = await page.evaluate(() => {
    const d = (n) => new Date(Date.now() - n * 86400000).toISOString();
    return [quandoFoiAtualizada(d(0)), quandoFoiAtualizada(d(1)), quandoFoiAtualizada(d(20)), quandoFoiAtualizada('2026-01-15T12:00:00Z'), quandoFoiAtualizada(null)];
  });
  ok(datas[0] === 'atualizada hoje' && datas[1] === 'atualizada ontem' && datas[2] === 'atualizada há 2 semanas' && datas[3] === 'atualizada em janeiro de 2026' && datas[4] === '', 'hoje, ontem, semanas e, depois de 2 meses, o mês — ' + datas.join(' | '));

  // ---- como funcionam as avaliações ----
  await abrirFicha(page, 'a1');
  const como = await page.evaluate(() => {
    const d = document.querySelector('#avaliacoes .como-avaliacoes');
    return d ? { aberto: d.open, resumo: d.querySelector('summary').innerText, texto: d.querySelector('p').textContent } : null;
  });
  ok(como && !como.aberto && como.resumo.includes('Como funcionam as avaliações'), 'avaliações: "Como funcionam as avaliações", fechado');
  ok(como && como.texto.includes('uma vez por academia') && como.texto.includes('não apaga avaliações') && como.texto.includes('Não importamos notas') && !/jogou/.test(como.texto),
    'explica só o que o GuiaTennis faz, sem prometer que a pessoa jogou — ' + (como && como.texto.slice(0, 90)));

  // ---- home: os números dizem o que contam ----
  await page.evaluate(() => { state.page = 'home'; state.selected = null; render(); });
  const home = await page.evaluate(() => ({
    nums: [...document.querySelectorAll('.ba-numeros .ban-item')].map(x => x.innerText.replace(/\s+/g, ' ')),
    nota: document.querySelector('.ban-nota')?.innerText || '',
    dif: document.querySelector('.dif-grade, #home-diferenciais, .bloco-diferenciais')?.innerText || document.body.innerText,
  }));
  ok(home.nums[0] === '+1.200 visitas ao GuiaTennis', 'home: visitas, não "pessoas" — ' + home.nums[0]);
  ok(home.nums[1] === '1 em 14 visitas abre a ficha de uma academia', 'home: a base do "1 em 14" — ' + home.nums[1]);
  ok(home.nums[2] === '15% das fichas abertas viram contato com a academia', 'home: a base da porcentagem — ' + home.nums[2]);
  ok(home.nota.includes('Desde o lançamento') && home.nota.includes('WhatsApp, no Instagram ou no site') && home.nota.includes('não entram'), 'home: de onde vêm os números');
  ok(home.dif.includes('Avaliações feitas no GuiaTennis') && !home.dif.includes('Nota só de quem jogou aqui'), '"Por que o GuiaTennis" não promete que quem avaliou jogou');
  const desc = await page.evaluate(() => document.querySelector('meta[name="description"]').content);
  ok(desc.startsWith('Onde jogar tênis perto de você'), 'a descrição para o Google fala em "onde jogar tênis"');
  await browser.close();

  // ---- Parceiros: os mesmos números, com a nota; a pergunta da data ----
  ({ browser, page } = await abrir({ q: 'parceiros' }));
  const pc = await page.evaluate(() => ({
    nums: [...document.querySelectorAll('.pc-faixa-num > div')].map(x => x.innerText.replace(/\s+/g, ' ')),
    nota: document.querySelector('.pc-faixa-nota')?.innerText || '',
  }));
  ok(pc.nums.length === 3 && pc.nums[0] === '+1.200 visitas ao GuiaTennis' && pc.nums[2].startsWith('15% das fichas abertas'), 'Parceiros: os mesmos números — ' + pc.nums.join(' | '));
  ok(pc.nota.includes('Desde o lançamento'), 'Parceiros: com a nota de onde vêm');
  await page.evaluate(() => irParceiros('ajuda', { mesmaAba: true }));
  await page.waitForTimeout(300);
  const ajuda = await page.evaluate(() => document.body.innerText);
  ok(ajuda.includes('O que quer dizer "atualizada há…" na ficha?'), 'Ajuda do Parceiros explica a data da ficha');
  ok(!ajuda.includes('o GuiaTennis confere antes de publicar, e você já administra'), 'a Ajuda não diz mais que academia nova espera a conferência');
  await browser.close();

  // ---- banco antes do SQL: a ficha aparece, sem a data ----
  ({ browser, page } = await abrir({ semDataDaFicha: true, atualizadaEm: diasAtras(4) }));
  const n = await page.evaluate(() => state.allCourts.length);
  await abrirFicha(page, 'a1');
  linha = await texto(page, '.ficha-confirmada');
  ok(n === 2 && linha.includes('Confirmada pela academia') && !linha.includes('atualizada'), 'banco sem a coluna nova: academias aparecem, confirmada sem a data — ' + linha);
  await browser.close();

  // ---- a academia salva a ficha: a data vira hoje (só o banco escreve) ----
  // No Premium, salvar vai direto (no Básico, antes vem a tela do plano).
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha', plano: 'premium', atualizadaEm: diasAtras(200), criadaEm: diasAtras(300) }));
  await page.evaluate(async () => { window.__db.academias.find(a => a.id === 'a1').plano = 'premium'; await loadEverything(); render(); });
  await page.evaluate(() => irParceiros('painel', { mesmaAba: true }));
  await page.waitForTimeout(300);
  const lembrete = await texto(page, '#parceiros .conta-situacao');
  ok(lembrete.includes('o jogador vê que ela foi atualizada em') && lembrete.includes('salve a ficha'), 'Atualizações lembra de conferir a ficha parada há meses — ' + lembrete.slice(0, 90));
  await page.evaluate(() => irParceiros('ficha', { mesmaAba: true }));
  await page.waitForTimeout(300);
  await page.click('#parceiros .editar-academia');
  await page.waitForTimeout(300);
  await page.click('#register-submit');
  await page.waitForTimeout(800);
  const depois = await page.evaluate(() => {
    const c = state.allCourts.find(x => x.id === 'a1');
    return { quando: quandoFoiAtualizada(c.dadosAtualizadosEm), banco: window.__db.academias.find(x => x.id === 'a1').dados_atualizados_em };
  });
  ok(depois.quando === 'atualizada hoje', 'salvar a ficha, mesmo sem mudar nada, deixa "atualizada hoje" — ' + depois.quando);
  await page.evaluate(async () => {
    await sb.from('academias').update({ dados_atualizados_em: '2020-01-01T00:00:00Z' }).eq('id', 'a1');
  });
  const forcada = await page.evaluate(() => window.__db.academias.find(x => x.id === 'a1').dados_atualizados_em);
  ok(!forcada.startsWith('2020'), 'a academia não escreve a data à mão — ' + forcada);
  await browser.close();
})();
