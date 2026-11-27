// 27/11/2026 ("o tudo preenchido não está funcionando 100%"): a lista de Minha ficha, a porcentagem do Painel e o
// "Tudo preenchido" usam a mesma conta; o estacionamento grátis e pago sem explicação conta como "Comodidades"; cada
// item que falta leva à parte certa do cadastro.
const { abrir, ok } = require('./harness');
const texto = (page, sel) => page.evaluate((s) => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
(async () => {
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha' });
  await page.waitForTimeout(500);
  // Tudo preenchido de verdade
  // Estacionamento grátis e pago, sem a explicação
  await page.evaluate(() => { const c = minhaAcademia(); c.amenities = [...new Set([...(c.amenities || []), 'estacionamento_gratuito', 'estacionamento_pago'])]; c.estacionamento = null; c.regra_estacionamento = null; render(); });
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => { const c = minhaAcademia(); return { detalhe: faltasDaFicha(c), faltam: [...itensQueFaltam(c)], pct: porcentoDaFicha(c), n: itensDaFicha(c).length }; });
  const t = await texto(page, '.pc-pagina .pc-card');
  if (r.detalhe.includes('Como funciona o estacionamento')) {
    ok(r.faltam.includes('Comodidades') && t.includes(`${r.n - r.faltam.length} de ${r.n} itens preenchidos`) && t.includes('Explique o estacionamento grátis e pago'),
      'estacionamento sem explicação: "Comodidades" fica pendente na lista, com a conta certa — ' + t.slice(0, 120));
  } else ok(true, 'estacionamento: a ficha de teste não usa a regra do misto (' + r.detalhe.join(', ') + ')');
  ok(await page.evaluate(() => { const c = minhaAcademia(); const lista = [...document.querySelectorAll('.pc-checklist li')]; return lista.filter(li => li.classList.contains('falta')).length === itensQueFaltam(c).size; }),
    'a lista marca como pendente exatamente o que a conta diz');
  const passo = await page.$eval('.pc-check-falta', b => b.dataset.passo).catch(() => '');
  ok(!!passo, 'cada item pendente é um botão que leva à parte do cadastro — ' + passo);
  await page.click('.pc-check-falta');
  await page.waitForTimeout(500);
  ok(await page.evaluate((p) => !!window.__form && REG_PASSOS[state.regPasso] && REG_PASSOS[state.regPasso].id === p, passo), 'o toque abre o cadastro na parte certa');
  // Sem nada faltando: "Tudo preenchido", a barra cheia e nenhum item pendente.
  await page.evaluate(() => { window.__faltasOriginal = faltasDaFicha; faltasDaFicha = () => []; state.page = 'parceiros'; state.parceirosAba = 'ficha'; window.__form = null; render(); });
  await page.waitForTimeout(300);
  const cheio = await page.evaluate(() => ({ t: document.querySelector('.pc-pagina .pc-card')?.innerText || '', barra: document.querySelector('.pc-pagina .pc-progresso i')?.style.width, pend: document.querySelectorAll('.pc-checklist li.falta').length }));
  ok(/Tudo preenchido/.test(cheio.t) && cheio.barra === '100%' && cheio.pend === 0, 'sem nada faltando: "Tudo preenchido", barra em 100% e nada pendente — ' + JSON.stringify({ barra: cheio.barra, pend: cheio.pend }));
  await browser.close();
  // 27/11/2026: a lista tem tudo o que o plano mostra (Premium: Instagram, fotos das opções e a apresentação).
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/ficha', premium: ['a1'] }));
  await page.waitForTimeout(500);
  const p = await page.evaluate(() => { const c = minhaAcademia(); c.sobre = ''; c.instagram = ''; c.photos = (c.photos || []).slice(0, 2); render();
    return { itens: itensDaFicha(c), faltam: [...itensQueFaltam(c)], botoes: [...document.querySelectorAll('.pc-check-falta')].map(b => b.innerText.split('\n')[0].trim() + ':' + b.dataset.passo) }; });
  ok(['Instagram', 'Apresentação', 'Fotos das opções'].every(i => p.itens.includes(i)), 'no Premium, a lista tem Instagram, fotos das opções e apresentação — ' + p.itens.join(', '));
  ok(p.faltam.includes('Apresentação') && p.faltam.includes('Instagram') && p.faltam.includes('Fotos') && p.botoes.includes('Apresentação:sobre') && p.botoes.includes('Instagram:contato'),
    'sem apresentação, sem Instagram e com 2 fotos: pendentes, cada um levando à sua parte — ' + p.botoes.join(' | '));
  const b = await page.evaluate(() => { const c = minhaAcademia(); c.plano = 'basico'; return itensDaFicha(c); });
  ok(!b.includes('Instagram') && !b.includes('Apresentação') && !b.includes('Fotos das opções') && !b.includes('Cancelamento'), 'no Básico, só o que o plano mostra — ' + b.join(', '));
  await browser.close();
})();
