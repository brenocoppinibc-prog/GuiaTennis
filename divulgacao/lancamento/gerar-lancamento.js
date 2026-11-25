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

// Um cartão do carrossel. tom "verde" (fundo da marca) ou "creme" (o creme do site).
function slide({ tom = 'verde', eyebrow = '', titulo = '', texto = '', itens = [], numerados = false, pontos = false, rodape = '', quadra = 0, pagina = '', grande = false }) {
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

// ---------- Carrossel 1 (quinta): a nossa ideia ----------
const ideia = [
  { grande: true, quadra: 560, eyebrow: 'Por que o GuiaTennis existe', titulo: 'Encontrar aula de tênis em São Paulo deveria ser simples.', texto: 'Foi por isso que criamos o GuiaTennis.', rodape: 'Deslize ›' },
  { tom: 'creme', pontos: true, eyebrow: 'Você já passou por isso?', titulo: 'Procurar aula ou quadra ainda dá trabalho.', itens: [
    'Você chama várias academias e quase nenhuma informa o preço.',
    'Só descobre se a quadra é coberta, de saibro ou rápida depois de ir até lá.',
    'A academia perto de casa só aparece meses depois, por indicação.'] },
  { eyebrow: 'A nossa ideia', titulo: 'Todas as quadras e academias de tênis em um só lugar.', texto: 'Com o que importa antes de você chamar: preço, estrutura, horários e avaliações de quem joga.' },
  { tom: 'creme', eyebrow: 'Como funciona', titulo: 'Em três passos.', numerados: true, itens: [
    'Busque pelo seu bairro, pelo CEP ou pela sua localização.',
    'Compare preço, estrutura e nota de cada academia.',
    'Fale direto com a academia pelo WhatsApp.'] },
  { eyebrow: 'O nosso compromisso', titulo: 'Feito para quem joga.', itens: [
    'Grátis para quem joga.',
    'Sem cadastro para buscar e comparar.',
    'Sem taxa e sem intermediário: você combina tudo direto com a academia.',
    'Avaliações só de contas com e-mail confirmado.'] },
  { tom: 'creme', eyebrow: 'Para as academias', titulo: 'Um espaço próprio: o GuiaTennis Parceiros.', texto: 'A academia mantém a ficha completa, responde às avaliações e recebe mais alunos. Os 15 primeiros donos a chegar ganham o selo "Fundadora do GuiaTennis", para sempre.' },
  { grande: true, quadra: 560, eyebrow: 'Domingo, 29 de novembro', titulo: 'O novo GuiaTennis chega para todos.', texto: 'Ative as notificações do perfil para acompanhar o lançamento.', rodape: 'Salve e compartilhe com quem joga' },
];
// ---------- Carrossel 2 (domingo): o lançamento ----------
const lancamento = [
  { grande: true, quadra: 560, eyebrow: 'Chegou', titulo: 'O novo GuiaTennis está no ar.', texto: 'Aula e quadra de tênis perto de você, com preço à vista.', rodape: 'Deslize ›' },
  { tom: 'creme', eyebrow: 'Busque', titulo: 'Pelo seu bairro.', texto: 'Digite o bairro ou o CEP, ou use a sua localização. As academias mais perto aparecem primeiro, na lista ou no mapa.' },
  { eyebrow: 'Compare', titulo: 'Antes de chamar.', itens: [
    'Preço das aulas e da locação de quadra.',
    'Tipo de piso, quadra coberta e iluminação.',
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
  { eyebrow: 'GuiaTennis Parceiros', titulo: 'Tudo da academia em um só lugar.', itens: [
    'Ficha completa, com fotos, preços e horários.',
    'Resposta pública a cada avaliação.',
    'Quantos jogadores chamaram a academia.',
    'Equipe com acesso, cada um com a sua função.'] },
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
  carrossel('carrossel-1-quinta-ideia', ideia);
  carrossel('carrossel-2-domingo-lancamento', lancamento);
  carrossel('carrossel-3-segunda-academias', academias);
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
