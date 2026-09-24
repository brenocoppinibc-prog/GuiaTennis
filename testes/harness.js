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
  }, opts);
  await page.route('**/*', async route => {
    const u = route.request().url();
    if (u.startsWith('http://guia.test/')) return route.fulfill({ contentType: 'text/html', body: html });
    if (u.includes('supabase-js')) return route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(DIR, 'mock.js'), 'utf8') });
    if (u.includes('leaflet') && u.endsWith('.js')) return route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(DIR, 'leaflet-stub.js'), 'utf8') });
    if (u.includes('viacep')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ cep: "05422-000", logradouro: "Rua A", bairro: "Pinheiros", localidade: "São Paulo", uf: "SP" }) });
    if (u.includes('nominatim') && u.includes('reverse')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ lat: "-23.56", lon: "-46.68", address: { suburb: "Pinheiros", city: "São Paulo" } }) });
    if (u.includes('nominatim')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ lat: "-23.56", lon: "-46.68", display_name: "Pinheiros, São Paulo", address: { suburb: "Pinheiros", city: "São Paulo" } }]) });
    return route.abort();
  });
  await page.goto('http://guia.test/' + (opts.q || ''));
  await page.waitForTimeout(700);
  return { browser, page };
}

const ok = (c, m) => { if (!c) process.exitCode = 1; console.log((c ? 'OK    ' : 'FALHA ') + m); };

module.exports = { abrir, ok };
