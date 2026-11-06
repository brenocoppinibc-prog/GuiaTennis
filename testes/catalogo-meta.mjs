// Confere o catálogo das academias para os anúncios da Meta (regra 219,
// netlify/functions/catalogo-meta.mjs).
//   node testes/catalogo-meta.mjs
import funcao, { csvDoCatalogo, caminhoDaFicha, menorPreco, linkDaFoto } from '../netlify/functions/catalogo-meta.mjs';
const ok = (c, m) => { if (!c) process.exitCode = 1; console.log((c ? 'OK    ' : 'FALHA ') + m); };

const boa = { id: '7f3c2a10-aaaa-bbbb-cccc-1234abcd5678', name: 'Só Aula Tênis, "Moema"', bairro: 'Moema', cidade: 'São Paulo', status: 'published', plano: 'premium',
  photos: ['https://x.supabase.co/a.jpg'], catalogo: [{ tipo: 'individual', cobranca: 'avulsa', preco: '150-200' }, { tipo: 'locacao', cobranca: 'avulsa', preco: '120,50' }] };
const semFoto = { ...boa, id: 'b2', photos: [] };
const semPreco = { ...boa, id: 'b3', catalogo: [{ tipo: 'grupo', preco: '' }] };
const pausada = { ...boa, id: 'b4', pausada: true, pausada_ate: null };
const voltou = { ...boa, id: 'b5', pausada: true, pausada_ate: '2020-01-01T00:00:00Z' };
const fechou = { ...boa, id: 'b6', avisou_que_fechou_em: '2026-11-01T00:00:00Z' };

ok(caminhoDaFicha(boa) === '/academia/so-aula-tenis-moema-abcd5678', 'o link é o mesmo da ficha do site — ' + caminhoDaFicha(boa));
ok(menorPreco(boa) === 120.5 && menorPreco({ price_aula: 'R$ 90' }) === 90, 'o preço é o menor da academia, com centavos');
const csv = csvDoCatalogo([boa, semFoto, semPreco, pausada, voltou, fechou], 'https://guiatennis.com.br');
const linhas = csv.trim().split('\n');
ok(linhas[0] === 'id,title,description,availability,condition,price,link,image_link,brand,custom_label_0,custom_label_1,custom_label_2,custom_label_3', 'as colunas que a Meta pede');
ok(linhas.length === 3 && linhas[1].startsWith(boa.id) && linhas[2].startsWith('b5'), 'só entra academia no ar, com foto e preço, não pausada e sem aviso de que fechou — ' + (linhas.length - 1) + ' academias');
ok(linhas[1].includes('"Só Aula Tênis, ""Moema"""') && linhas[1].includes('120.50 BRL') && linhas[1].includes('Aulas e locação de quadra de tênis em Moema, São Paulo')
  && linhas[1].includes('?utm_source=Meta-anuncio&utm_medium=catalogo') && linhas[1].endsWith(',São Paulo,Moema,premium,aulas e locacao'), 'nome com aspas e vírgula, preço em reais, descrição, link com a origem e os rótulos (cidade, bairro, plano, modalidade)');

const antes = globalThis.fetch;
let pedido = '';
globalThis.fetch = async (url) => { pedido = url; return new Response(JSON.stringify([boa]), { status: 200 }); };
let r = await funcao(new Request('https://guiatennis.com.br/catalogo-meta.csv'));
let txt = await r.text();
ok(r.headers.get('content-type').startsWith('text/csv') && pedido.startsWith('https://eultezheqwmxyakvgyjy.supabase.co/') && txt.includes('https://guiatennis.com.br/academia/'), 'no site de verdade: lê o banco de verdade e responde a lista');
r = await funcao(new Request('https://deploy-preview-5--stately-salamander-652f72.netlify.app/catalogo-meta.csv'));
txt = await r.text();
ok(pedido.startsWith('https://ohvbengbujdioxdtewsy.supabase.co/') && txt.includes('https://deploy-preview-5--stately-salamander-652f72.netlify.app/academia/'), 'na prévia: o banco de teste e os links da prévia');
// A foto guardada no banco como data:image sai por um link da própria função.
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const comData = { ...boa, photos: ['data:image/png;base64,' + PNG] };
ok(linkDaFoto(comData, 'https://guiatennis.com.br') === 'https://guiatennis.com.br/.netlify/functions/catalogo-meta?foto=' + boa.id && !csvDoCatalogo([comData], 'https://guiatennis.com.br').includes('data:image'), 'foto guardada no banco: o catálogo leva um link de imagem, sem o arquivo dentro');
globalThis.fetch = async (url) => { pedido = url; return new Response(JSON.stringify([{ photos: comData.photos }]), { status: 200 }); };
r = await funcao(new Request('https://guiatennis.com.br/.netlify/functions/catalogo-meta?foto=' + boa.id));
const bytes = new Uint8Array(await r.arrayBuffer());
ok(r.status === 200 && r.headers.get('content-type') === 'image/png' && bytes[1] === 0x50 && pedido.includes('id=eq.' + boa.id) && pedido.includes('status=eq.published'), 'o link da foto devolve a imagem da academia no ar');
r = await funcao(new Request('https://guiatennis.com.br/.netlify/functions/catalogo-meta?foto=x%27%3Bdrop'));
ok(r.status === 404, 'id estranho na foto: 404, sem consultar o banco');
globalThis.fetch = async () => new Response('x', { status: 500 });
r = await funcao(new Request('https://guiatennis.com.br/catalogo-meta.csv'));
ok(r.status === 503, 'banco fora do ar: responde 503, e a Meta tenta de novo no dia seguinte');
globalThis.fetch = antes;
