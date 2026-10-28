// Abre o index.html no Chromium com o Supabase trocado por testes/mock.js,
// o Leaflet por um stub e as APIs de CEP/endereço respondendo fixo. Nada
// sai para a internet.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const DIR = __dirname;
const html = fs.readFileSync(path.join(DIR, '..', 'index.html'), 'utf8');

async function abrir(opts = {}) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: opts.w || 420, height: 900 } });
  page.on('pageerror', e => console.log('ERRO NA PÁGINA', e.message));
  await page.addInitScript((o) => {
    if (o.admin) window.__admin = true;
    if (o.semDetalhe) window.__semDetalhe = true;
    if (o.semCep) window.__semCep = true;
    if (o.semTempo) window.__semTempo = true;
    if (o.colunasFechadas) window.__colunasFechadas = true;
    if (o.semPlano) window.__semPlano = true;
    if (o.semConfirmada) window.__semConfirmada = true;
    // O banco sem o SQL 20261026220000 (o catálogo, regra 162).
    if (o.semCatalogo) window.__semCatalogo = true;
    if (o.atualizadaEm) window.__a1AtualizadaEm = o.atualizadaEm;
    if (o.criadaEm) window.__a1CriadaEm = o.criadaEm;
    if (o.semDataDaFicha) window.__semDataDaFicha = true;
    if (o.academia) window.__academia = o.academia;
    if (o.outrasAcademias) window.__outrasAcademias = o.outrasAcademias;
    if (o.jogador) window.__jogador = true;
    if (o.jogadorConfirmado) window.__jogadorConfirmado = true;
    if (o.lembreteDeVolta) window.__lembreteDeVolta = true;
    if (o.acessoNovo) window.__acessoNovo = true;
    if (o.semAcesso) window.__semAcesso = true;
    if (o.plano) window.__plano = o.plano;
    if (o.avaliacoes) window.__avaliacoesIniciais = o.avaliacoes;
    // Nomes suspensos já no banco (regra 165) e o banco sem o SQL 20261027120000.
    if (o.nomesSuspensos) window.__nomesSuspensosIniciais = o.nomesSuspensos;
    if (o.semNomeSuspenso) window.__semNomeSuspenso = true;
    if (o.semAvaliacaoEditada) window.__semAvaliacaoEditada = true;
    if (o.respostas) window.__respostasIniciais = o.respostas;
    if (o.promocoes) window.__promocoesIniciais = o.promocoes;
    if (o.semPromocoes) window.__semPromocoes = true;
    if (o.premium) window.__premium = o.premium;
    if (o.completo) window.__completo = o.completo;
    if (o.envios) window.__envios = o.envios;
    if (o.precoPromocao) window.__precoPromocao = o.precoPromocao;
    if (o.conversas) window.__conversasIniciais = o.conversas;
    if (o.semConversas) window.__semConversas = true;
    if (o.falhas) window.__falhasIniciais = o.falhas;
    if (o.semFalhas) window.__semFalhas = true;
    if (o.pagamentoDeTeste) window.__pagamentoDeTeste = true;
    // O banco sem o SQL 20261026180000 (regra 157).
    if (o.semForaDoAr) window.__semForaDoAr = true;
    // O banco sem o SQL 20261026200000 (regra 158).
    if (o.semFechadaGuardada) window.__semFechadaGuardada = true;
    // Os avisos da conta (balão no topo) só aparecem com opts.pushes, para não
    // cobrir os botões nos outros testes.
    if (!o.pushes) { try { localStorage.setItem('guiatennis_push_conta_v1', String(Date.now())); } catch (e) {} }
    // A dica do Parceiros (22/10/2026) só aparece com opts.dicas, pelo mesmo motivo.
    if (!o.dicas) { try { localStorage.setItem('guiatennis_dica_parceiros_v1', JSON.stringify({ '*': Date.now() + 864e5 })); } catch (e) {} }
  }, opts);
  // opts.host abre o site num endereço de verdade (o de teste do Netlify, por
  // exemplo) e opts.trocar mexe no index.html antes de servir.
  const base = opts.host ? 'https://' + opts.host + '/' : 'http://guia.test/';
  const pagina = opts.trocar ? opts.trocar(html) : html;
  await page.route('**/*', async route => {
    const u = route.request().url();
    // opts.onde: a cidade aproximada da conexão (netlify/functions/onde.mjs);
    // sem ela, a função responde vazio, como fora do Brasil.
    if (u.includes('/.netlify/functions/onde')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify(opts.onde || {}) });
    // opts.cnpj: o que a consulta da Receita responde (netlify/functions/cnpj.mjs).
    if (u.includes('/.netlify/functions/cnpj')) return route.fulfill({ status: opts.cnpj ? 200 : 502, contentType: 'application/json', body: JSON.stringify(opts.cnpj || { erro: 'Não consegui falar com a Receita agora. Tente de novo em instantes.' }) });
    if (u.startsWith(base)) return route.fulfill({ contentType: 'text/html', body: pagina });
    if (u.includes('supabase-js')) return route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(DIR, 'mock.js'), 'utf8') });
    if (u.includes('leaflet') && u.endsWith('.js')) return route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(DIR, 'leaflet-stub.js'), 'utf8') });
    // opts.overpass: resposta fixa do OpenStreetMap (lista do mapa no painel)
    if (opts.overpass && u.includes('overpass')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify(opts.overpass) });
    // opts.fontes: pasta com as fontes do Google baixadas (fontes.css, os
    // .woff2 e mapa.txt "url arquivo"), para foto de tela com a letra de
    // verdade. Os testes não precisam delas.
    if (opts.fontes && u.includes('fonts.googleapis.com')) return route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(opts.fontes, 'fontes.css'), 'utf8') });
    if (opts.fontes && u.includes('fonts.gstatic.com')) {
      const linha = fs.readFileSync(path.join(opts.fontes, 'mapa.txt'), 'utf8').split('\n').find(l => l.startsWith(u + ' '));
      if (linha) return route.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(path.join(opts.fontes, linha.split(' ')[1])) });
    }
    // Municípios do IBGE: poucos de cada estado, para as preferências.
    if (u.includes('servicodados.ibge.gov.br')) {
      const uf = (u.match(/estados\/([A-Z]{2})\//) || [])[1];
      const lista = { SP: ['Campinas', 'Santos', 'São Paulo'], CE: ['Fortaleza', 'Sobral'], RJ: ['Niterói', 'Rio de Janeiro'] }[uf] || [];
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(lista.map((nome, i) => ({ id: i + 1, nome }))) });
    }
    if (u.includes('viacep')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ cep: "05422-000", logradouro: "Rua A", bairro: "Pinheiros", localidade: "São Paulo", uf: "SP" }) });
    if (u.includes('nominatim') && u.includes('reverse')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ lat: "-23.56", lon: "-46.68", address: { suburb: "Pinheiros", city: "São Paulo" } }) });
    if (u.includes('nominatim')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ lat: "-23.56", lon: "-46.68", display_name: "Pinheiros, São Paulo", address: { suburb: "Pinheiros", city: "São Paulo" } }]) });
    return route.abort();
  });
  await page.goto(base + (opts.q || ''));
  await page.waitForTimeout(700);
  return { browser, page };
}

const ok = (c, m) => { if (!c) process.exitCode = 1; console.log((c ? 'OK    ' : 'FALHA ') + m); };

// Cadastro passo a passo (01/10/2026): vai direto para uma parte do
// formulário da ficha ("dados", "precos", "quadras", "contato", "fotos",
// "horario", "cancelamento", "chegada", "revisar").
async function irParte(page, id) {
  await page.evaluate((id) => { state.regPasso = REG_PASSOS.findIndex(x => x.id === id); render(); }, id);
  await page.waitForTimeout(120);
}

// Salvar a ficha (14/10/2026): fora da revisão, o botão de salvar leva à
// prévia; só lá salva. Toca no botão e, se caiu na revisão, toca de novo.
async function salvarFicha(page) {
  for (let k = 0; k < 2; k++) {
    const naRevisao = await page.evaluate(() => !!state.regPlanoTela || regPassoAtual().passo.id === 'revisar');
    await page.evaluate(() => document.getElementById('register-submit').click());
    if (naRevisao) return;
    await page.waitForTimeout(200);
  }
}

// GuiaTennis Parceiros (02/10/2026): Entrar e Cadastro começam pelo e-mail
// (ou usuário). Digita e toca em Continuar; se tiver conta, abre a senha.
async function irSenha(page, usuario) {
  await page.evaluate(() => { state.pcEmailPasso = 'email'; state.loginError = ''; state.pcContaErro = ''; render(); });
  await page.fill('#pc-email', usuario);
  await page.click('#pc-email-continuar');
  await page.waitForTimeout(300);
}

// O site dos jogadores e o GuiaTennis Parceiros abrem um ao outro em outra
// aba (05/10/2026). vigiarAbas troca o window.open por um que só anota;
// abasAbertas devolve o que foi aberto ({ url, nome }).
async function vigiarAbas(page) {
  await page.evaluate(() => { window.__abas = []; window.open = (url, nome) => { window.__abas.push({ url, nome }); return {}; }; });
}
async function abasAbertas(page) {
  return page.evaluate(() => window.__abas || []);
}

// Contestar (23/10/2026): o "Contestar ›" do cartão abre a página da disputa,
// lida passo a passo; contestar segue os "Continuar" até o fim e confirma.
async function contestar(page, academia) {
  await page.click(`[data-contestar="${academia}"]`);
  await page.waitForTimeout(200);
  for (let k = 0; k < 6 && await page.$('#pc-contestar-continuar'); k++) {
    await page.click('#pc-contestar-continuar');
    await page.waitForTimeout(80);
  }
  await page.click('#pc-contestar-enviar');
}

module.exports = { abrir, ok, irParte, irSenha, salvarFicha, vigiarAbas, abasAbertas, contestar };
