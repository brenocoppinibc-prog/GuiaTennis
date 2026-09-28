// O site de teste do Netlify usa o banco de teste; o guiatennis.com.br e
// qualquer outro endereço, sempre o de verdade.
const { abrir, ok } = require('./harness');
const REAL = 'https://eultezheqwmxyakvgyjy.supabase.co';
const TESTE = 'https://teste123.supabase.co';
const comTeste = html => html.replace('const BANCO_DE_TESTE = { url: "", chave: "" };', `const BANCO_DE_TESTE = { url: "${TESTE}", chave: "chave-de-teste" };`);
(async () => {
  const casos = [
    ['site de teste, banco de teste preenchido', { host: 'lucky-liger-1c29a3.netlify.app', trocar: comTeste }, TESTE, true],
    ['versão de deploy do site de teste', { host: '68f1a2b3c4d5e6--lucky-liger-1c29a3.netlify.app', trocar: comTeste }, TESTE, true],
    ['site de teste, banco de teste vazio', { host: 'lucky-liger-1c29a3.netlify.app' }, REAL, false],
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
})();
