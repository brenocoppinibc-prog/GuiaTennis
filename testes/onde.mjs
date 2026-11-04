// Confere a função da cidade aproximada (netlify/functions/onde.mjs).
//   node testes/onde.mjs
import funcao, { ondeDaConexao } from '../netlify/functions/onde.mjs';
const ok = (c, m) => { if (!c) process.exitCode = 1; console.log((c ? 'OK    ' : 'FALHA ') + m); };
const sp = { city: 'São Paulo', country: { code: 'BR', name: 'Brazil' }, subdivision: { code: 'SP', name: 'São Paulo' }, latitude: -23.5475, longitude: -46.63611 };
ok(JSON.stringify(ondeDaConexao(sp)) === JSON.stringify({ cidade: 'São Paulo', uf: 'SP', lat: -23.55, lng: -46.64 }), 'no Brasil: cidade, estado e o ponto arredondado');
ok(JSON.stringify(ondeDaConexao({ ...sp, country: { code: 'PT' } })) === '{}', 'fora do Brasil: vazio');
ok(JSON.stringify(ondeDaConexao({ country: { code: 'BR' } })) === '{}' && JSON.stringify(ondeDaConexao(undefined)) === '{}', 'sem a informação: vazio');
const r = await funcao(new Request('https://guia.test/.netlify/functions/onde'), { geo: sp });
ok(r.headers.get('cache-control') === 'private, no-store' && (await r.json()).cidade === 'São Paulo', 'responde em JSON, sem cache');
