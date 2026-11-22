// Regra 290 (16/11/2026): WhatsApp, Instagram e site reais viram links que
// abrem; "Outro valor" sem o zero na frente; "Pagamento seguro" explica o
// pagamento; o Sobre sem "Sobre o GuiaTennis" no alto; as explicações dos
// valores em parágrafos; o aviso com "Corrigir" e, sem valor, "Alterar" ou
// "Seguir"; e a troca de academia sem piscar.
const { abrir, ok } = require('./harness');

(async () => {
  let { browser, page } = await abrir();
  await page.waitForTimeout(500);

  // ---- Os contatos de verdade ----
  let r = await page.evaluate(() => ({
    wa: ['(11) 91234-5678', '+55 11 91234-5678', '5511912345678', '011 91234-5678', '(55) 99123-4567', '+55 55 99123-4567', '(11) 3456-7890', 'https://wa.me/5511912345678']
      .map(t => [digitosDoWhatsapp(t), whatsappValido(t)]),
    waRuim: ['1234-5678', '(00) 91234-5678', '11 12345'].map(whatsappValido),
    link: waLink({ phone: '(55) 99123-4567' }).split('?')[0],
    ig: ['@academia.top', 'academia_top', 'https://www.instagram.com/academia.top/?igsh=abc', 'instagram.com/academia.top', ' @Academia '].map(usuarioDoInstagram),
    igRuim: ['academia top', '@', 'https://instagram.com/', 'a..b'].map(usuarioDoInstagram),
    site: ['academia.com.br', 'www.academia.com.br/aulas', 'http://academia.com.br', 'https://academia.com'].map(linkDoSite),
    siteRuim: ['academia', 'javascript:alert(1)', 'https://academia', 'mailto:a@b.com'].map(linkDoSite),
  }));
  ok(r.wa.map(x => x.join(':')).join('|') === '11912345678:true|11912345678:true|11912345678:true|11912345678:true|55991234567:true|55991234567:true|1134567890:true|11912345678:true'
    && r.waRuim.every(v => v === false), 'WhatsApp com ou sem +55, 0, espaço, link wa.me e fixo; o DDD 55 fica — ' + JSON.stringify(r.wa));
  ok(r.link === 'https://wa.me/5555991234567', 'o link do WhatsApp do DDD 55 não perde o DDD — ' + r.link);
  ok(r.ig.join('|') === 'academia.top|academia_top|academia.top|academia.top|Academia' && r.igRuim.every(v => v === ''), 'Instagram por @, nome ou link do perfil — ' + r.ig.join('|'));
  ok(r.site.join('|') === 'https://academia.com.br/|https://www.academia.com.br/aulas|http://academia.com.br/|https://academia.com/' && r.siteRuim.every(v => v === ''),
    'site com ou sem https:// vira link; sem domínio, não — ' + r.site.join('|'));
  // Na ficha, os links já arrumados, mesmo com o que estava guardado antes.
  await page.evaluate(() => { const c = state.allCourts.find(x => x.id === 'a1'); c.site = 'www.academia.com.br'; c.instagram = 'https://www.instagram.com/academia.top/'; openCourt('a1'); });
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ site: document.querySelector('[data-track="site"]')?.getAttribute('href'), ig: document.querySelector('[data-track="instagram"]')?.getAttribute('href') }));
  ok(r.site === 'https://www.academia.com.br/' && r.ig === 'https://www.instagram.com/academia.top/', 'na ficha, o site e o Instagram abrem — ' + JSON.stringify(r));
  // No cadastro, o que não abre é apontado.
  r = await page.evaluate(() => regFaltas({ phone: '1234', instagram: 'academia top', site: 'academia', reserva: '' }, 'contato'));
  ok(r.length === 3 && /WhatsApp com DDD/.test(r[0]) && /Instagram certo/.test(r[1]) && /site certo/.test(r[2]), 'no cadastro, WhatsApp, Instagram e site errados pedem correção — ' + r.join(' | '));

  // ---- O Sobre sem "Sobre o GuiaTennis" no alto ----
  await page.evaluate(() => goSobre());
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => !document.querySelector('.sb-hero .sb-olho') && !!document.querySelector('.sb-hero h1')), 'o Sobre começa pelo título, sem "Sobre o GuiaTennis" em cima');

  // ---- O aviso com "Corrigir" e, sem valor, "Alterar" ou "Seguir" ----
  r = await page.evaluate(() => {
    let feito = '';
    mostrarEscolha('Falta preencher: WhatsApp.', [{ t: 'Corrigir', fn: () => { feito = 'corrigir'; } }]);
    const el = document.querySelector('.gt-escolha');
    const bts = [...el.querySelectorAll('[data-escolha]')].map(b => b.innerText);
    el.querySelector('[data-escolha="0"]').click();
    const saiu = !document.querySelector('.gt-escolha');
    mostrarEscolha('Sem valor: aula individual avulsa.', [{ t: 'Alterar', fn: () => {} }, { t: 'Seguir', fn: () => { feito += '+seguir'; } }]);
    const dois = [...document.querySelectorAll('.gt-escolha [data-escolha]')].map(b => b.innerText);
    document.querySelector('.gt-escolha [data-escolha="1"]').click();
    return { bts, saiu, dois, feito };
  });
  ok(r.bts.join() === 'Corrigir' && r.saiu && r.dois.join() === 'Alterar,Seguir' && r.feito === 'corrigir+seguir', 'o aviso com "Corrigir"; sem valor, "Alterar" ou "Seguir" — ' + JSON.stringify(r));
  // Regra 293: os números do Parceiros e do Sobre no mesmo formato (o número e a frase).
  r = await page.evaluate(() => { state.estatisticas = { ...(state.estatisticas || {}), acessos_total: 5230, fichas_total: 1310, contatos_total: 200 }; return numerosDoSite().map(n => n.valor + ' ' + n.rotulo); });
  ok(r.join(' | ') === '+5.000 visitas ao GuiaTennis | +1.300 fichas de academias abertas | +200 contatos com as academias', 'regra 308: porcentagem baixa vira o número de vezes — ' + r.join(' | '));
  r = await page.evaluate(() => { state.estatisticas = { ...state.estatisticas, acessos_total: 5230, fichas_total: 2100, contatos_total: 700 }; return numerosDoSite().map(n => n.valor + ' ' + n.rotulo); });
  ok(r.join(' | ') === '+5.000 visitas ao GuiaTennis | 40% das visitas abrem a ficha de uma academia | 35% das fichas abertas resultam em contato com a academia', 'regra 308: porcentagem alta (30% ou mais) aparece — ' + r.join(' | '));
  await browser.close();

  // ---- Pagamento: "Outro valor" e "Pagamento seguro" ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/creditos', premium: ['a1'] }));
  await page.waitForTimeout(500);
  await page.click('[data-compra-valor="outro"]');
  await page.waitForTimeout(150);
  await page.focus('#pc-compra-outro');
  await page.keyboard.type('02');
  await page.keyboard.type('5');
  await page.waitForTimeout(150);
  r = await page.evaluate(() => document.getElementById('pc-compra-outro').value);
  ok(r === '25', 'digitando, o valor sai em ordem e sem o zero na frente — ' + r);
  await page.click('#pc-pagamento-seguro');
  await page.waitForTimeout(150);
  r = await page.evaluate(() => document.querySelector('.pc-seguro-explica')?.innerText || '');
  ok(/Mercado Pago/.test(r) && /sem passar pelo GuiaTennis/.test(r) && /Pix/.test(r), '"Pagamento seguro" abre a explicação do pagamento');
  await page.click('#pc-seguro-ok');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => !document.querySelector('.pc-seguro-explica')), '"Entendi" fecha');
  await browser.close();
})();
