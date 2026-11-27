// Confere a página de cada região pronta para o Google (regra 321,
// netlify/functions/regiao.mjs).
//   node testes/regiao.mjs
import funcao, { regiaoDoCaminho, precosDaAcademia, dadosDaRegiao, paginaDaRegiao, config } from '../netlify/functions/regiao.mjs';
const ok = (c, m) => { if (!c) process.exitCode = 1; console.log((c ? 'OK    ' : 'FALHA ') + m); };

const BASE = `<!doctype html><html><head>
<title>GuiaTennis — quadras e academias de tênis perto de você</title>
<link rel="canonical" href="https://guiatennis.com.br/" id="link-canonical">
<meta name="description" content="Onde jogar tênis perto de você.">
<meta property="og:title" content="GuiaTennis">
<meta property="og:description" content="Ache e compare quadras.">
<meta name="twitter:title" content="GuiaTennis">
<meta name="twitter:description" content="Ache e compare quadras.">
<meta property="og:url" content="https://guiatennis.com.br">
</head><body><div class="container" id="app"></div></body></html>`;
const A = (id, x) => ({ id, status: 'published', cidade: 'São Paulo', bairro: 'Pinheiros', ...x });
const ACADEMIAS = [
  A('11111111-aaaa-bbbb-cccc-000000000001', { name: 'Arena <Pinheiros>', catalogo: [{ tipo: 'individual', cobranca: 'avulsa', preco: '150' }, { tipo: 'grupo', cobranca: 'mensal', preco: '300' }, { tipo: 'locacao', cobranca: 'avulsa', preco: '90' }], cobertura: ['coberta'] }),
  A('11111111-aaaa-bbbb-cccc-000000000002', { name: 'Tênis Butantã Clube', price_aula: 'R$ 120', price_locacao: '' }),
  A('11111111-aaaa-bbbb-cccc-000000000003', { name: 'Pausada', price_aula: '80', pausada: true, pausada_ate: null }),
  A('11111111-aaaa-bbbb-cccc-000000000004', { name: 'Moema Tênis', bairro: 'Moema', price_aula: '200' }),
  A('11111111-aaaa-bbbb-cccc-000000000005', { name: 'Rascunho', status: 'pending' }),
];
const AVALIACOES = [{ academia_id: ACADEMIAS[1].id, stars: 5 }, { academia_id: ACADEMIAS[1].id, stars: 4 }, { academia_id: ACADEMIAS[0].id, stars: 4 }];

ok(JSON.stringify(regiaoDoCaminho('/quadras/sao-paulo/pinheiros')) === '{"cidade":"sao-paulo","bairro":"pinheiros"}' && JSON.stringify(regiaoDoCaminho('/quadras/S%C3%A3o%20Paulo')) === '{"cidade":"sao-paulo","bairro":""}' && regiaoDoCaminho('/quadras') === null,
  'o caminho vira a cidade e o bairro');
const p = precosDaAcademia(ACADEMIAS[0]);
ok(p.aula === 150 && p.hora === 90 && precosDaAcademia(ACADEMIAS[1]).aula === 120, 'aula avulsa e hora de locação: do catálogo (sem a mensal) ou do preço antigo');
const d = dadosDaRegiao(ACADEMIAS, AVALIACOES, { cidade: 'sao-paulo', bairro: 'pinheiros' });
ok(d.itens.length === 2 && d.lugar === 'Pinheiros, São Paulo' && d.aula.min === 120 && d.aula.tipico === 120 && d.hora.min === 90 && d.cobertas === 1 && d.itens[0].c.name === 'Tênis Butantã Clube',
  'só as academias no ar do bairro, a mais bem avaliada primeiro, com o "a partir de" e o valor típico');
const html = paginaDaRegiao(BASE, d, 'https://guiatennis.com.br');
ok(html.includes('<title>Quadras e academias de tênis em Pinheiros, São Paulo | GuiaTennis</title>')
  && html.includes('<meta name="description" content="2 academias de tênis em Pinheiros, São Paulo e mais perto: compare preço por hora')
  && html.includes('<link rel="canonical" href="https://guiatennis.com.br/quadras/sao-paulo/pinheiros"')
  && html.includes('<meta property="og:url" content="https://guiatennis.com.br/quadras/sao-paulo/pinheiros">')
  && html.includes('<meta property="og:title" content="Quadras e academias de tênis em Pinheiros'), 'título, descrição, canônico e prévias da região');
const ld = JSON.parse(html.match(/<script type="application\/ld\+json" id="ld-regiao">(.*?)<\/script>/)[1]);
ok(ld[0]['@type'] === 'BreadcrumbList' && ld[0].itemListElement.length === 3 && ld[1]['@type'] === 'ItemList' && ld[1].numberOfItems === 2 && ld[1].itemListElement[0].url.startsWith('https://guiatennis.com.br/academia/'),
  'os dados estruturados: o caminho e a lista');
ok(html.includes('<h1 class="regiao-titulo display">Quadras e academias de tênis em Pinheiros, São Paulo</h1>') && html.includes('Aula avulsa: a partir de R$ 120 (valor típico: R$ 120)')
  && html.includes('Locação da quadra: a partir de R$ 90 por hora') && html.includes('Arena &lt;Pinheiros&gt;') && html.includes('1 com quadra coberta') && !html.includes('Moema Tênis') && !html.includes('Pausada'),
  'a página escrita dentro do #app, com o nome protegido');

// A função, com o banco e o index.html fingidos.
const antes = globalThis.fetch;
const pedidos = [];
globalThis.fetch = async (u) => {
  const url = String(u); pedidos.push(url);
  if (url.endsWith('/index.html')) return new Response(BASE, { status: 200 });
  if (url.includes('/rest/v1/academias')) return new Response(JSON.stringify(ACADEMIAS), { status: 200 });
  if (url.includes('/rest/v1/avaliacoes')) return new Response(JSON.stringify(AVALIACOES), { status: 200 });
  return new Response('', { status: 404 });
};
let r = await funcao(new Request('https://guiatennis.com.br/quadras/sao-paulo/pinheiros'));
let txt = await r.text();
ok(r.status === 200 && r.headers.get('content-type').startsWith('text/html') && r.headers.get('netlify-cdn-cache-control').includes('max-age=3600') && txt.includes('Quadras e academias de tênis em Pinheiros')
  && pedidos.some(x => x.startsWith('https://eultezheqwmxyakvgyjy.supabase.co/rest/v1/academias')), 'no site de verdade: o banco de verdade e a página pronta, guardada 1 hora na Netlify');
pedidos.length = 0;
r = await funcao(new Request('https://deploy-preview-5--stately-salamander-652f72.netlify.app/quadras/sao-paulo'));
txt = await r.text();
ok(txt.includes('<title>Quadras e academias de tênis em São Paulo | GuiaTennis</title>') && txt.includes('Moema Tênis') && pedidos.some(x => x.startsWith('https://ohvbengbujdioxdtewsy.supabase.co/'))
  && txt.includes('href="https://deploy-preview-5--stately-salamander-652f72.netlify.app/quadras/sao-paulo"'), 'na prévia: o banco de teste e a página da cidade, com todos os bairros');
r = await funcao(new Request('https://guiatennis.com.br/quadras/sao-paulo/bairro-que-nao-existe'));
txt = await r.text();
ok(txt.includes('<meta name="robots" content="noindex, follow">') && !txt.includes('ld-regiao'), 'região sem academia: a página do site, fora do Google');
globalThis.fetch = async (u) => String(u).endsWith('/index.html') ? new Response(BASE, { status: 200 }) : new Response('erro', { status: 500 });
r = await funcao(new Request('https://guiatennis.com.br/quadras/sao-paulo/pinheiros'));
txt = await r.text();
ok(r.status === 200 && txt === BASE && r.headers.get('netlify-cdn-cache-control') === 'no-store', 'sem o banco: a página do site, sem guardar no cache');
globalThis.fetch = antes;
ok(config.path.join() === '/quadras,/quadras/*', 'os endereços da função: /quadras e /quadras/*');
