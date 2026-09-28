// As prévias do Netlify e o antigo site de teste usam o banco de teste; o
// guiatennis.com.br e qualquer outro endereço, sempre o de verdade.
const { abrir, ok } = require('./harness');
const REAL = 'https://eultezheqwmxyakvgyjy.supabase.co';
const TESTE = 'https://teste123.supabase.co';
const LINHA = /const BANCO_DE_TESTE = \{[^\n]*\};/;
const comTeste = html => html.replace(LINHA, `const BANCO_DE_TESTE = { url: "${TESTE}", chave: "chave-de-teste" };`);
const semTeste = html => html.replace(LINHA, 'const BANCO_DE_TESTE = { url: "", chave: "" };');
(async () => {
  const casos = [
    ['site de teste, banco de teste preenchido', { host: 'lucky-liger-1c29a3.netlify.app', trocar: comTeste }, TESTE, true],
    ['versão de deploy do site de teste', { host: '68f1a2b3c4d5e6--lucky-liger-1c29a3.netlify.app', trocar: comTeste }, TESTE, true],
    ['site de teste, banco de teste vazio', { host: 'lucky-liger-1c29a3.netlify.app', trocar: semTeste }, REAL, false],
    ['prévia de teste do Netlify', { host: 'deploy-preview-2--guiatennis.netlify.app' }, 'https://ohvbengbujdioxdtewsy.supabase.co', true],
    ['publicação do site de verdade no endereço do Netlify', { host: 'guiatennis.netlify.app' }, REAL, false],
    ['versão antiga do site de verdade no Netlify', { host: '68f1a2b3c4d5e6--guiatennis.netlify.app' }, REAL, false],
    ['prévia com nome parecido não engana', { host: 'deploy-preview-2--guiatennis.netlify.app.golpe.com' }, REAL, false],
    ['site de teste com o banco de teste de hoje', { host: 'lucky-liger-1c29a3.netlify.app' }, 'https://ohvbengbujdioxdtewsy.supabase.co', true],
    ['guiatennis.com.br com o banco de teste de hoje', { host: 'guiatennis.com.br' }, REAL, false],
    ['guiatennis.com.br, banco de teste preenchido', { host: 'guiatennis.com.br', trocar: comTeste }, REAL, false],
    ['link com ?banco= não troca o banco', { host: 'guiatennis.com.br', trocar: comTeste, q: '?banco=' + encodeURIComponent(TESTE) }, REAL, false],
    ['endereço parecido não engana', { host: 'lucky-liger-1c29a3.netlify.app.golpe.com', trocar: comTeste }, REAL, false],
  ];
  for (const [nome, opts, esperado, faixa] of casos) {
    const { browser, page } = await abrir(opts);
    const r = await page.evaluate(() => ({ url: window.__banco && window.__banco.url, faixa: !!document.querySelector('.faixa-banco-teste'), n: state.allCourts.length }));
    ok(r.url === esperado, `${nome}: abre ${r.url}`);
    ok(r.faixa === faixa, `${nome}: faixa amarela ${faixa ? 'aparece' : 'não aparece'}`);
    ok(r.n === 2, `${nome}: academias carregam`);
    await browser.close();
  }

  // ?diagnostico mostra quantas academias vieram do banco e, se ele
  // recusou, o motivo — é assim que se descobre de longe o que falta.
  let { browser, page } = await abrir({ q: '?diagnostico' });
  let t = await page.evaluate(() => document.getElementById('diag-caixa')?.textContent || '');
  ok(t.includes('banco: de verdade') && t.includes('academias lidas: 2'), 'diagnóstico mostra o banco e as academias lidas');
  await browser.close();
  ({ browser, page } = await abrir({ q: '?diagnostico', semPlano: true }));
  t = await page.evaluate(() => document.getElementById('diag-caixa')?.textContent || '');
  ok(t.includes('o banco recusou a leitura de academias: column academias.plano does not exist'), 'diagnóstico mostra o motivo da recusa');
  await browser.close();
})();
