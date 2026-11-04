// Análise de 07/10/2026 (o que serve da análise do GPT): a ficha diz se é
// da academia e quando foi atualizada, a seção de avaliações explica como
// elas funcionam, e os números do site dizem o que contam.
const { abrir, ok, salvarFicha } = require('./harness');

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
  let como = await page.evaluate(() => {
    const d = document.querySelector('#avaliacoes .como-avaliacoes');
    return d ? { link: d.querySelector('button').innerText, pop: !!document.querySelector('.info-pop') } : null;
  });
  ok(como && !como.pop && como.link.includes('Como funcionam as avaliações'), 'avaliações: "Como funcionam as avaliações", fechado');
  // Abre no balão colado no link, igual aos números do Parceiros (20/10/2026).
  await page.click('#avaliacoes .como-avaliacoes button');
  await page.waitForTimeout(250);
  como = await page.evaluate(() => {
    const link = document.querySelector('#avaliacoes .como-avaliacoes button').getBoundingClientRect(), pop = document.querySelector('#avaliacoes .info-pop');
    const b = pop && pop.getBoundingClientRect();
    return { texto: pop ? pop.innerText : '', x: !!document.getElementById('info-pop-fechar'), perto: !!b && b.top - link.bottom >= 0 && b.top - link.bottom < 24, dentro: !!b && b.left >= 0 && b.right <= innerWidth };
  });
  ok(como.texto.includes('uma vez por academia') && como.texto.includes('não apaga avaliações') && como.texto.includes('Não importamos notas') && !/jogou/.test(como.texto) && como.x,
    'o balão explica só o que o GuiaTennis faz, sem prometer que a pessoa jogou, com o ✕ — ' + como.texto.slice(0, 90));
  ok(como.perto && como.dentro, 'o balão das avaliações abre colado no link, sem sair da tela');
  await page.click('#info-pop-fechar');
  await page.waitForTimeout(200);
  ok(!(await page.$('.info-pop')), 'o ✕ fecha o balão das avaliações');

  // ---- home: os números dizem o que contam ----
  await page.evaluate(() => { state.page = 'home'; state.selected = null; render(); });
  const home = await page.evaluate(() => ({
    // Regra 98: os números do site saíram da home (ficam no Parceiros, testados abaixo).
    nums: document.querySelectorAll('.ba-numeros, .ban-item').length,
    nota: perguntasParceiros().find(f => f.id === 'numeros')?.a || '',
    como: !!document.querySelector('#home-ideia .como-numeros, #home-dicas .como-numeros'),
    dif: document.querySelector('.dif-grade, #home-diferenciais, .bloco-diferenciais')?.innerText || document.body.innerText,
  }));
  ok(home.nums === 0, 'home dos jogadores sem os números do site para academias');
  ok(home.nota.includes('Desde o lançamento') && home.nota.includes('WhatsApp, no Instagram ou no site') && home.nota.includes('não entram'), 'home: de onde vêm os números');
  ok(!home.como, 'home sem o "Entenda como funciona" dos números');
  ok(home.dif.includes('Avaliações feitas no GuiaTennis') && !home.dif.includes('Nota só de quem jogou aqui'), '"Por que o GuiaTennis" não promete que quem avaliou jogou');
  const desc = await page.evaluate(() => document.querySelector('meta[name="description"]').content);
  ok(desc.startsWith('Onde jogar tênis perto de você'), 'a descrição para o Google fala em "onde jogar tênis"');
  await browser.close();

  // ---- Parceiros: os mesmos números, com a nota; a pergunta da data ----
  ({ browser, page } = await abrir({ q: 'parceiros' }));
  const pc = await page.evaluate(() => ({
    nums: [...document.querySelectorAll('.pc-faixa-itens > div')].map(x => x.innerText.replace(/\s+/g, ' ')),
    tops: [...document.querySelectorAll('.pc-faixa-itens > div')].map(x => Math.round(x.getBoundingClientRect().top)),
    nota: document.querySelector('.pc-faixa-num')?.innerText || '',
    resumo: document.querySelector('.pc-faixa-num .como-numeros button')?.innerText || '',
  }));
  ok(pc.nums.length === 3 && pc.nums[0] === '+1.200 visitas ao GuiaTennis' && pc.nums[2].startsWith('15% das fichas abertas'), 'Parceiros: os mesmos números — ' + pc.nums.join(' | '));
  ok(!pc.nota.includes('Desde o lançamento') && pc.resumo.includes('Entenda como funciona'), 'Parceiros: o bloco verde só com os números e "Entenda como funciona" (o texto fica oculto)');
  ok(new Set(pc.tops).size === 1, 'Parceiros, no celular: os três números lado a lado, na mesma linha — ' + pc.tops.join(','));
  // 11/10/2026: um texto antes dos números e o convite para cadastrar depois.
  const faixa = await page.evaluate(() => {
    const sec = document.getElementById('pc-numeros'), t = sec.querySelector('.pc-faixa-t'), s = sec.querySelector('.pc-faixa-s'),
      nums = sec.querySelector('.pc-faixa-itens'), btn = sec.querySelector('.pc-faixa-cta [data-pc="cadastro"]');
    const depois = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    const como = sec.querySelector('.como-numeros');
    return { t: t.innerText, s: s.innerText, btn: btn ? btn.innerText : '', ordem: depois(t, nums) && depois(s, nums) && !!btn && depois(nums, btn), comoLogoAbaixo: !!como && depois(nums, como) && depois(como, btn) };
  });
  ok(faixa.t === 'Jogadores já escolhem onde jogar por aqui' && faixa.s.startsWith('Quem entra no GuiaTennis está procurando aula ou quadra') && faixa.ordem,
    'Parceiros: um título e um texto antes dos números, e o convite depois — ' + JSON.stringify(faixa));
  ok(faixa.btn === 'Cadastrar minha academia grátis', 'o convite leva ao cadastro');
  // 19/10/2026: logo abaixo dos números, abrindo uma janelinha na mesma tela.
  ok(faixa.comoLogoAbaixo, '"Entenda como funciona" logo abaixo dos números, antes do convite');
  await page.click('.pc-faixa-num .como-numeros button');
  await page.waitForTimeout(300);
  let aj = await page.evaluate(() => {
    const link = document.querySelector('.pc-faixa-num .como-numeros button').getBoundingClientRect(), pop = document.querySelector('.info-pop');
    const b = pop && pop.getBoundingClientRect();
    return { aba: state.parceirosAba, pop: pop ? pop.innerText : '', x: !!document.getElementById('info-pop-fechar'), perto: !!b && b.top - link.bottom >= 0 && b.top - link.bottom < 24, dentro: !!b && b.left >= 0 && b.right <= innerWidth };
  });
  ok(aj.aba === 'inicio' && aj.pop.includes('Como contamos os números') && aj.pop.includes('Desde o lançamento') && aj.pop.includes('WhatsApp, no Instagram ou no site') && aj.x,
    'tocar em "Entenda como funciona" abre a explicação na própria tela, com o ✕');
  ok(aj.perto && aj.dentro, 'o balão abre colado no link, sem sair da tela');
  await page.click('#info-pop-fechar');
  await page.waitForTimeout(200);
  ok(!(await page.$('.info-pop')), 'o ✕ fecha');
  await page.click('.pc-faixa-num .como-numeros button');
  await page.waitForTimeout(200);
  await page.mouse.click(10, 10);
  await page.waitForTimeout(200);
  ok(!(await page.$('.info-pop')), 'tocar fora também fecha');
  await browser.close();
  ({ browser, page } = await abrir({ q: 'parceiros/ajuda#numeros' }));
  await page.waitForTimeout(400);
  aj = await page.evaluate(() => { const d = document.getElementById('pc-faq-numeros'); const b = d && d.getBoundingClientRect(); return { aberto: !!(d && d.open), visivel: !!b && b.top >= 0 && b.top < innerHeight }; });
  ok(aj.aberto && aj.visivel, 'o link da home (/parceiros/ajuda#numeros) abre a Ajuda com a pergunta aberta');
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
  await salvarFicha(page);
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

  // "Revise e salve a ficha" é um atalho para a prévia (19/10/2026).
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/painel' }));
  await page.evaluate(() => { const c = minhaAcademia(); c.confirmada = false; c.criadaEm = null; render(); });
  await page.waitForTimeout(200);
  const atalho = await page.$('.conta-situacao [data-revisar]');
  ok(atalho && (await page.evaluate(() => document.querySelector('.conta-situacao').innerText)).includes('No ar como ficha básica. Revise e salve a ficha para confirmar as informações.'), 'ficha básica: "Revise e salve a ficha" é um link na frase');
  if (atalho) await atalho.click();
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => state.showRegister && REG_PASSOS[state.regPasso].id === 'revisar' && window.__form.__editingId === 'a1'), 'e abre a ficha direto na prévia, para conferir e salvar');
  await browser.close();
})();
