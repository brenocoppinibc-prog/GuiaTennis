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
    if (o.atualizadaEm) window.__a1AtualizadaEm = o.atualizadaEm;
    if (o.criadaEm) window.__a1CriadaEm = o.criadaEm;
    if (o.semDataDaFicha) window.__semDataDaFicha = true;
    if (o.academia) window.__academia = o.academia;
    if (o.outrasAcademias) window.__outrasAcademias = o.outrasAcademias;
    if (o.jogador) window.__jogador = true;
    if (o.acessoNovo) window.__acessoNovo = true;
    if (o.semAcesso) window.__semAcesso = true;
    if (o.plano) window.__plano = o.plano;
    if (o.avaliacoes) window.__avaliacoesIniciais = o.avaliacoes;
    if (o.respostas) window.__respostasIniciais = o.respostas;
    // Os avisos da conta (balão no topo) só aparecem com opts.pushes, para não
    // cobrir os botões nos outros testes.
    if (!o.pushes) { try { localStorage.setItem('guiatennis_push_conta_v1', String(Date.now())); } catch (e) {} }
  }, opts);
  // opts.host abre o site num endereço de verdade (o de teste do Netlify, por
  // exemplo) e opts.trocar mexe no index.html antes de servir.
  const base = opts.host ? 'https://' + opts.host + '/' : 'http://guia.test/';
  const pagina = opts.trocar ? opts.trocar(html) : html;
  await page.route('**/*', async route => {
    const u = route.request().url();
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

module.exports = { abrir, ok, irParte, irSenha, vigiarAbas, abasAbertas };
