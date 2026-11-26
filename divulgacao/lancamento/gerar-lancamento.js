// Kit de lançamento do novo GuiaTennis no Instagram (domingo, 29/11/2026).
// Pedido do Breno em 25/11/2026: "eu preciso conversar com o meu público [...]
// apresentar o novo site um pouco, apresentar a nossa ideia [...] pra gente ter a
// conexão com o público e assim garantir mais leads". Como os lançamentos do
// Airbnb e do Nubank: primeiro a história (o porquê), depois o produto e, por
// fim, o convite. Mesmo visual dos posts do GuiaTennis (gerar-imagens.js):
// verde, dourado, creme, o nome em Poppins e o texto em Roboto.
//   NODE_PATH=$(npm root -g) node divulgacao/lancamento/gerar-lancamento.js
// Gera os PNGs nesta pasta (1080×1350 nos carrosséis, 1080×1920 nos Stories).
const { chromium } = require('playwright');
const path = require('path');
const { execFileSync } = require('child_process');
const { rede, NOME_CLARO, nomeSvg, FONTE } = require('../gerar-imagens.js');

const VERDE = '#1F4D3D', DOURADO = '#B8933F', DOURADO_CLARO = '#D8B865', CREME = '#F7F4EC';
const check = (cor) => `<svg width="44" height="44" viewBox="0 0 24 24" style="flex:none;margin-top:4px"><circle cx="12" cy="12" r="11" fill="${cor}"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="${cor === DOURADO ? CREME : VERDE}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ponto = (cor) => `<div style="flex:none;width:20px;height:20px;border-radius:50%;background:${cor};margin:20px 12px 0"></div>`;
const numero = (n, cor, fundo) => `<div style="flex:none;width:64px;height:64px;border-radius:50%;background:${fundo};color:${cor};display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:700">${n}</div>`;

// ---------- Peças da interface do site (os nomes reais dos botões e filtros) ----------
const painel = (miolo, claro) => `<div style="margin-top:54px;padding:40px;border-radius:28px;background:${claro ? '#FFFFFF' : 'rgba(247,244,236,.07)'};border:2px solid ${claro ? 'rgba(31,77,61,.12)' : 'rgba(216,184,101,.28)'}">${miolo}</div>`;
const lupa = (cor) => `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="${cor}" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`;
const mira = (cor) => `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="${cor}" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.4" fill="${cor}"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>`;
const UI = {
  busca: (claro) => painel(`
    <div style="display:flex;align-items:center;gap:22px;padding:28px 30px;border-radius:20px;background:${CREME};border:2px solid rgba(31,77,61,.2)">${lupa(VERDE)}<span style="font-size:40px;font-weight:500;color:${VERDE}">Moema, São Paulo</span><span style="width:3px;height:44px;background:${DOURADO}"></span></div>
    <div style="display:flex;align-items:center;gap:16px;margin-top:28px;font-size:34px;font-weight:700;color:${claro ? VERDE : DOURADO_CLARO}">${mira(claro ? VERDE : DOURADO_CLARO)} Usar minha localização</div>`, claro),
  filtros: (claro) => painel(`<div style="display:flex;flex-wrap:wrap;gap:18px">${[['Aulas', 1], ['Locação', 0], ['Coberta', 1], ['Saibro', 0], ['Rápida', 0], ['Aberto agora', 0], ['Quadras públicas', 0]].map(([n, on]) => `
    <span style="padding:16px 28px;border-radius:999px;font-size:32px;font-weight:600;${on ? `background:${claro ? VERDE : DOURADO_CLARO};color:${claro ? CREME : VERDE}` : `border:2px solid ${claro ? 'rgba(31,77,61,.35)' : 'rgba(247,244,236,.4)'};color:${claro ? VERDE : CREME}`}">${n}</span>`).join('')}</div>
    <div style="margin-top:30px;font-size:30px;font-weight:500;opacity:.8">Ordenar: <b>Mais perto</b> · Mais bem avaliadas · Menor preço</div>`, claro),
  ficha: (claro) => painel(['Opções para jogar, com os preços', 'Estrutura: piso, cobertura e comodidades', 'Avaliações de quem joga', 'Horário e como chegar'].map((x, i) => `
    <div style="display:flex;align-items:center;gap:22px;padding:${i ? '24px' : '0'} 0 24px;${i < 3 ? `border-bottom:2px solid ${claro ? 'rgba(31,77,61,.1)' : 'rgba(247,244,236,.12)'}` : 'padding-bottom:0'}">
      <span style="flex:none;width:18px;height:18px;border-radius:50%;background:${claro ? DOURADO : DOURADO_CLARO}"></span><span style="font-size:36px;font-weight:500">${x}</span></div>`).join(''), claro),
  whatsapp: (claro) => painel(`
    <div style="display:flex;align-items:center;justify-content:center;gap:20px;padding:30px;border-radius:20px;background:#1F7A4D;color:#FFFFFF;font-size:40px;font-weight:700">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.6-5.4A8.4 8.4 0 1 1 21 11.5z"/></svg>Falar no WhatsApp</div>
    <div style="margin-top:26px;text-align:center;font-size:30px;font-weight:500;opacity:.8">A conversa é diretamente com a academia</div>`, claro),
  varias: (claro) => painel(`
    <div style="font-size:38px;font-weight:700">Peça o preço a várias academias de uma vez</div>
    <div style="margin-top:18px;font-size:32px;font-weight:500;opacity:.85">Uma mensagem pronta para cada uma; você envia pelo WhatsApp.</div>`, claro),
};

// Um cartão do carrossel. tom "verde" (fundo da marca) ou "creme" (o creme do site).
function slide({ tom = 'verde', eyebrow = '', titulo = '', texto = '', itens = [], numerados = false, pontos = false, ui = '', rodape = '', quadra = 0, pagina = '', grande = false }) {
  const claro = tom === 'creme';
  const cor = claro ? VERDE : CREME, destaque = claro ? DOURADO : DOURADO_CLARO;
  const lista = itens.length ? `<div style="display:flex;flex-direction:column;gap:34px;margin-top:54px">${itens.map((t, i) => `
      <div style="display:flex;gap:26px;align-items:flex-start;text-align:left">
        ${numerados ? numero(i + 1, claro ? CREME : VERDE, claro ? VERDE : DOURADO_CLARO) : pontos ? ponto(claro ? DOURADO : DOURADO_CLARO) : check(claro ? DOURADO : DOURADO_CLARO)}
        <div style="font-size:40px;line-height:1.32;font-weight:500">${t}</div>
      </div>`).join('')}</div>` : '';
  const miolo = `
  <div style="position:absolute;left:80px;top:78px">${claro ? nomeSvg(44, VERDE, DOURADO) : NOME_CLARO(44)}</div>
  ${pagina ? `<div style="position:absolute;right:80px;top:84px;font-size:28px;font-weight:500;opacity:.7;color:${cor}">${pagina}</div>` : ''}
  <div style="position:absolute;left:80px;right:80px;top:${grande ? 300 : 250}px;color:${cor}">
    ${eyebrow ? `<div style="font-size:30px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${destaque};margin-bottom:34px">${eyebrow}</div>` : ''}
    <h1 style="margin:0;font-size:${grande ? 86 : 66}px;line-height:1.1;font-weight:700;letter-spacing:-.5px">${titulo}</h1>
    ${texto ? `<p style="margin:40px 0 0;font-size:${grande ? 44 : 40}px;line-height:1.38;font-weight:500;color:${grande ? destaque : cor};opacity:${grande ? 1 : .92}">${texto}</p>` : ''}
    ${lista}
    ${ui ? UI[ui](claro) : ''}
  </div>
  ${rodape ? `<div style="position:absolute;left:80px;right:80px;bottom:150px;font-size:36px;font-weight:700;color:${destaque}">${rodape}</div>` : ''}
  <div class="pe" style="left:80px;bottom:70px;font-size:28px;color:${cor}">guiatennis.com.br</div>
  <div class="pe" style="right:80px;bottom:70px;font-size:28px;color:${cor}">@guiatennis</div>`;
  const html = rede(1080, 1350, miolo, quadra);
  return claro ? html.replace(/background:linear-gradient[^;]*;/, `background:${CREME};`) : html;
}
// Um Stories: o texto no meio de cima e o espaço de baixo livre para a figurinha
// (contagem regressiva, enquete, caixa de perguntas ou link).
function stories({ eyebrow = '', titulo = '', texto = '' }) {
  return rede(1080, 1920, `
  <div class="linha" style="top:220px">${NOME_CLARO(70)}</div>
  <div style="position:absolute;left:90px;right:90px;top:460px;text-align:center;color:${CREME}">
    ${eyebrow ? `<div style="font-size:34px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${DOURADO_CLARO};margin-bottom:40px">${eyebrow}</div>` : ''}
    <h1 style="margin:0;font-size:88px;line-height:1.1;font-weight:700;letter-spacing:-.5px">${titulo}</h1>
    ${texto ? `<p style="margin:44px 0 0;font-size:46px;line-height:1.35;font-weight:500;color:${DOURADO_CLARO}">${texto}</p>` : ''}
  </div>
  <div class="linha" style="bottom:150px;font-size:38px;font-weight:500;opacity:.92">@guiatennis</div>`, 700);
}

// ---------- Carrossel 1 (quinta): como usar o site, passo a passo ----------
// O perfil já apresentou a ideia (25/11/2026: "já falamos algumas coisas sobre a ideia,
// mas não muito como usar o site"): agora o passo a passo, com os botões e os filtros
// com os nomes que estão no site.
const passoAPasso = [
  { grande: true, quadra: 560, eyebrow: 'Passo a passo', titulo: 'Como encontrar aula de tênis perto de você em 1 minuto.', texto: 'Salve para usar quando precisar.', rodape: 'Deslize ›' },
  { tom: 'creme', ui: 'busca', eyebrow: 'Passo 1', titulo: 'Diga onde você está.', texto: 'Em guiatennis.com.br, digite o bairro ou o CEP, ou toque em "Usar minha localização".' },
  { ui: 'filtros', eyebrow: 'Passo 2', titulo: 'Filtre do seu jeito.', texto: 'Aula ou locação, piso, quadra coberta, preço e horário.' },
  { tom: 'creme', ui: 'ficha', eyebrow: 'Passo 3', titulo: 'Abra a ficha da academia.', texto: 'Tudo o que você precisa saber antes de chamar:' },
  { ui: 'whatsapp', eyebrow: 'Passo 4', titulo: 'Chame direto no WhatsApp.', texto: 'Sem intermediário e sem taxa: você combina o horário e o valor com a academia.' },
  { tom: 'creme', ui: 'varias', eyebrow: 'Dica', titulo: 'Quer comparar preços?', texto: 'Na lista da busca, peça o preço a várias academias de uma vez.' },
  { grande: true, quadra: 560, eyebrow: 'Teste agora', titulo: 'guiatennis.com.br', texto: 'Mande para quem quer começar a jogar.', rodape: 'O link está na bio' },
];
// ---------- Carrossel 4 (semana que vem): funções que facilitam ----------
const funcoes = [
  { grande: true, quadra: 560, eyebrow: 'Você sabia?', titulo: '5 funções do GuiaTennis que facilitam a sua vida.', texto: 'Salve para não esquecer.', rodape: 'Deslize ›' },
  { tom: 'creme', eyebrow: '1 · Comparar academias', titulo: 'Lado a lado.', texto: 'Escolha algumas academias e veja preço, estrutura e nota uma ao lado da outra.' },
  { eyebrow: '2 · Favoritas', titulo: 'Guarde as que você gostou.', texto: 'Toque no coração da ficha e encontre as academias depois, no menu, em "Favoritas".' },
  { tom: 'creme', eyebrow: '3 · Vou viajar', titulo: 'A raquete vai junto.', texto: 'Informe a cidade e o lugar em que você vai ficar e veja as quadras mais perto de lá.' },
  { eyebrow: '4 · Quadras públicas', titulo: 'Jogar sem pagar.', texto: 'Use o filtro "Quadras públicas" para encontrar as quadras gratuitas em parques e praças.' },
  { tom: 'creme', eyebrow: '5 · Sugerir', titulo: 'Falta alguma quadra?', texto: 'Toque em "Sugerir uma quadra ou academia", no fim da busca ou no menu. A equipe do GuiaTennis confere e coloca no site.' },
  { grande: true, quadra: 560, eyebrow: 'Conte para nós', titulo: 'Qual delas você vai usar primeiro?', texto: 'Responda nos comentários.', rodape: 'guiatennis.com.br · link na bio' },
];
// ---------- Carrossel 2 (domingo): o lançamento ----------
const lancamento = [
  { grande: true, quadra: 560, eyebrow: 'Chegou', titulo: 'O novo GuiaTennis está no ar.', texto: 'Aula e quadra de tênis perto de você: compare e fale direto com a academia.', rodape: 'Deslize ›' },
  { tom: 'creme', eyebrow: 'Busque', titulo: 'Pelo seu bairro.', texto: 'Digite o bairro ou o CEP, ou use a sua localização. As academias mais perto aparecem primeiro, na lista ou no mapa.' },
  { eyebrow: 'Compare', titulo: 'Antes de chamar.', itens: [
    'Preço das aulas e da locação de quadra.',
    'Tipo de piso e se a quadra é coberta.',
    'Estacionamento, vestiário e outras comodidades.',
    'Aulas para adultos e para crianças.'] },
  { tom: 'creme', eyebrow: 'Confie', titulo: 'Avaliações de quem joga.', texto: 'Só contas com e-mail confirmado avaliam, uma vez por academia. A academia pode responder, mas não pode apagar.' },
  { eyebrow: 'Chame', titulo: 'Direto no WhatsApp.', texto: 'Sem intermediário e sem taxa: você combina o horário e o valor direto com a academia.' },
  { tom: 'creme', eyebrow: 'Feito para quem joga', titulo: 'Grátis, sem cadastro e sem taxa.', texto: 'Conhece uma quadra ou academia que ainda não está no GuiaTennis? Sugira pelo site.' },
  { grande: true, quadra: 560, eyebrow: 'Experimente agora', titulo: 'guiatennis.com.br', texto: 'O link está na bio.', rodape: 'Marque quem precisa de uma quadra' },
];
// ---------- Carrossel 3 (segunda): para as academias ----------
const academias = [
  { grande: true, quadra: 560, eyebrow: 'Para academias de tênis', titulo: 'A sua academia no GuiaTennis.', texto: 'Mais alunos chegando pelo WhatsApp, sem taxa por aluno.', rodape: 'Deslize ›' },
  { tom: 'creme', eyebrow: 'Quem chega já sabe o que quer', titulo: 'O jogador chama pronto para marcar.', texto: 'Ele vê preço, estrutura e avaliações antes de chamar. A conversa no WhatsApp já começa pela aula ou pelo horário.' },
  { eyebrow: 'GuiaTennis Parceiros, grátis', titulo: 'Tudo da academia em um só lugar.', itens: [
    'Preços, horários e todas as comodidades na ficha.',
    'Fotos da academia.',
    'Resposta pública a cada avaliação.',
    'QR code da ficha para a recepção.'], rodape: 'Nos planos Completo e Premium: mais fotos, Instagram e site e quantos chamaram' },
  { tom: 'creme', eyebrow: 'Fundadoras: 15 vagas', titulo: 'O selo "Fundadora do GuiaTennis".', texto: 'Os 15 primeiros donos de academia a chegar ao GuiaTennis ganham o selo na ficha, para sempre.' },
  { grande: true, quadra: 560, eyebrow: 'guiatennis.com.br/parceiros', titulo: 'Comece grátis.', texto: 'Cadastre a academia ou assuma a ficha que já está no Guia.', rodape: 'Marque a academia em que você joga' },
];
// ---------- Stories ----------
const historias = {
  'stories-1-quinta-contagem.png': { eyebrow: 'Domingo, 29/11', titulo: 'Algo novo chega para quem joga tênis.', figurinha: 'adicione aqui a figurinha de contagem regressiva' },
  'stories-2-quinta-enquete.png': { eyebrow: 'Responda', titulo: 'Em que bairro você joga?', figurinha: 'adicione aqui a figurinha de enquete ou de pergunta' },
  'stories-3-sexta-perguntas.png': { eyebrow: 'Queremos ouvir você', titulo: 'O que mais dificulta encontrar aula de tênis?', figurinha: 'adicione aqui a caixa de perguntas' },
  'stories-4-domingo-no-ar.png': { eyebrow: 'Está no ar', titulo: 'O novo GuiaTennis chegou.', texto: 'Aula e quadra de tênis perto de você.', figurinha: 'adicione aqui a figurinha de link: guiatennis.com.br' },
  'stories-5-segunda-academias.png': { eyebrow: 'Para academias', titulo: 'Sua academia no GuiaTennis, grátis.', texto: 'Os 15 primeiros donos ganham o selo Fundadora.', figurinha: 'adicione aqui o link: guiatennis.com.br/parceiros' },
};

(async () => {
  const browser = await chromium.launch();
  const lista = [];
  const carrossel = (nome, cartoes) => cartoes.forEach((c, i) => lista.push([`${nome}-${i + 1}.png`, slide({ ...c, pagina: `${i + 1}/${cartoes.length}` }), 1080, 1350]));
  carrossel('carrossel-1-quinta-passo-a-passo', passoAPasso);
  carrossel('carrossel-2-domingo-lancamento', lancamento);
  carrossel('carrossel-3-segunda-academias', academias);
  carrossel('carrossel-4-semana-que-vem-funcoes', funcoes);
  Object.entries(historias).forEach(([nome, s]) => lista.push([nome, stories(s), 1080, 1920]));
  const so = process.argv.slice(2);
  for (const [nome, html, w, h] of lista) {
    if (so.length && !so.some(x => nome.includes(x))) continue;
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, async route => {
      const url = route.request().url();
      const corpo = execFileSync('curl', ['-sS', '-A', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', url]);
      await route.fulfill({ body: corpo, contentType: url.includes('googleapis') ? 'text/css' : 'font/woff2' });
    });
    await page.setContent(html.replace(FONTE, FONTE.replace('wght@500;700', 'wght@400;500;700')), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    if (!(await page.evaluate(() => document.fonts.check("700 40px 'Roboto'")))) console.warn('ATENÇÃO: a fonte Roboto não carregou em', nome);
    await page.screenshot({ path: path.join(__dirname, nome) });
    await page.close();
    console.log('gerada', nome);
  }
  await browser.close();
})();
