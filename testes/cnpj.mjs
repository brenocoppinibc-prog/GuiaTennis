// Confere a consulta do CNPJ na Receita (netlify/functions/cnpj.mjs), com
// a internet trocada por respostas fixas.
//   node testes/cnpj.mjs
import funcao, { cnpjValido, resumoDoCnpj } from '../netlify/functions/cnpj.mjs';
const ok = (c, m) => { if (!c) process.exitCode = 1; console.log((c ? 'OK    ' : 'FALHA ') + m); };

ok(cnpjValido('11.222.333/0001-81') === '11222333000181', 'CNPJ com pontos: os 14 números');
ok(cnpjValido('11222333000182') === '' && cnpjValido('11111111111111') === '' && cnpjValido('123') === '', 'dígito errado, repetido ou curto: inválido');

const receita = {
  cnpj: '11222333000181', razao_social: 'ARENA EXEMPLO ESPORTES LTDA', nome_fantasia: 'ARENA EXEMPLO',
  descricao_situacao_cadastral: 'ATIVA', data_situacao_cadastral: '2015-03-02', data_inicio_atividade: '2015-03-02',
  cnae_fiscal: 9311500, cnae_fiscal_descricao: 'Gestão de instalações de esportes',
  descricao_tipo_de_logradouro: 'RUA', logradouro: 'DOS PINHEIROS', numero: '100', complemento: 'LOJA 2',
  bairro: 'PINHEIROS', municipio: 'SAO PAULO', uf: 'SP', cep: '05422000',
  ddd_telefone_1: '1133334444', ddd_telefone_2: '11977771111', email: 'Contato@Arena.com.br',
};
const r = resumoDoCnpj(receita, 'BrasilAPI');
ok(r.situacao === 'ATIVA' && r.atividade === '9311500 · Gestão de instalações de esportes' && r.endereco === 'RUA DOS PINHEIROS, 100, LOJA 2',
  'resumo: situação, atividade e endereço');
ok(JSON.stringify(r.telefones) === JSON.stringify(['(11) 3333-4444', '(11) 97777-1111']) && r.email === 'contato@arena.com.br', 'telefones e e-mail da Receita');
ok(resumoDoCnpj({}, 'x') === null, 'resposta sem CNPJ: nada');

const fetchOriginal = globalThis.fetch;
let pedidos = [];
async function chamar(numero, respostas) {
  pedidos = [];
  globalThis.fetch = async (url) => {
    pedidos.push(String(url));
    const resp = respostas.shift();
    if (resp instanceof Error) throw resp;
    return new Response(JSON.stringify(resp.corpo || {}), { status: resp.status || 200 });
  };
  try { return await funcao(new Request(`https://guia.test/.netlify/functions/cnpj?numero=${numero}`)); }
  finally { globalThis.fetch = fetchOriginal; }
}
let resp = await chamar('11.222.333/0001-81', [{ corpo: receita }]);
ok(resp.status === 200 && (await resp.json()).fonte === 'BrasilAPI' && pedidos[0].includes('brasilapi.com.br/api/cnpj/v1/11222333000181'), 'pergunta à BrasilAPI');
ok(resp.headers.get('cache-control') === 'public, max-age=86400', 'guarda por um dia (o cadastro da Receita muda por mês)');
resp = await chamar('11222333000181', [{ status: 500 }, { corpo: receita }]);
ok(resp.status === 200 && (await resp.json()).fonte === 'Minha Receita' && pedidos[1].includes('minhareceita.org/11222333000181'), 'BrasilAPI fora do ar: a Minha Receita');
resp = await chamar('11222333000181', [new Error('rede'), new Error('rede')]);
ok(resp.status === 502, 'as duas fora do ar: 502');
resp = await chamar('11222333000181', [{ status: 404 }, { status: 404 }]);
ok(resp.status === 404 && /não tem esse CNPJ/.test((await resp.json()).erro), 'CNPJ que não existe: 404');
resp = await chamar('123', []);
ok(resp.status === 400 && pedidos.length === 0, 'CNPJ inválido nem sai para a internet');
