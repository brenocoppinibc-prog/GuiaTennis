// Pedidos do Breno em 15/10/2026: a página Plano fala primeiro do plano de
// hoje e depois do que pode melhorar (as dores por caminho, com a solução,
// e as oportunidades de agora); o cartão da avaliação mostra quem avaliou e
// a nota em cima, depois o texto.
const { abrir, ok } = require('./harness');
const texto = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);

(async () => {
  // ---- Básico ----
  let { browser, page } = await abrir({ academia: 'a1', q: 'parceiros/plano', plano: 'basico' });
  await page.waitForTimeout(500);
  let corpo = await texto(page, '#parceiros .pc-main');
  const pos = (t) => corpo.indexOf(t);
  // 19/10/2026: o título diz o plano, sem o cartão "O plano de hoje" repetindo.
  ok((await texto(page, '#parceiros h1')) === 'Plano Básico' && !/O PLANO DE HOJE|O plano de hoje/.test(corpo) && !corpo.includes('A Só Aula Tennis está no'), 'a página começa pelo plano de hoje, no título, sem repetir');
  ok(corpo.includes('Para aparecer na busca e receber jogadores. Grátis.') && corpo.includes('Responder às avaliações'), 'o resumo do plano embaixo do título, e o que ele entrega no cartão');
  ok(pos('Só Aula Tennis está no Básico') < pos('O que pode melhorar') && pos('O que pode melhorar') < pos('A mudança é simples') && pos('A mudança é simples') < pos('Compare os planos'),
    'a ordem: o plano de hoje, o que pode melhorar, a mudança e, por fim, os planos');
  ok(/NA FICHA|Na ficha/.test(corpo) && /NA BUSCA|Na busca/.test(corpo) && /COM OS JOGADORES|Com os jogadores/.test(corpo)
    && corpo.includes('A dúvida do cancelamento trava a primeira aula') && corpo.includes('Com o Completo, a regra de cancelamento') && corpo.includes('Com o Premium, a academia aparece no topo'),
    'as dores por caminho, cada uma com a solução do plano de cima');
  ok(corpo.includes('O que vocês já preencheram aparece na hora') && (await texto(page, '.pc-conforto [data-escolher-plano="completo"]')) === 'Quero o Completo', 'conforta: a mudança é simples, com "Quero o Completo"');
  ok(corpo.includes('No Básico mesmo, dá para') && corpo.includes('Completar a ficha'), 'e as oportunidades de agora, no plano de hoje');
  await browser.close();

  // ---- Premium: sem dores, com o que aproveitar ----
  ({ browser, page } = await abrir({ academia: 'a1', q: 'parceiros/plano', premium: ['a1'] }));
  await page.waitForTimeout(500);
  corpo = await texto(page, '#parceiros .pc-main');
  ok((await texto(page, '#parceiros h1')).startsWith('Plano Premium') && !corpo.includes('O que pode melhorar') && corpo.includes('Aproveitem o Premium'), 'Premium: o plano de hoje e o que aproveitar, sem dores');
  await browser.close();

  // ---- avaliação: quem avaliou e a nota em cima ----
  ({ browser, page } = await abrir({ academia: 'a2', q: 'parceiros/avaliacoes', avaliacoes: [{ id: 'r1', academia_id: 'a2', stars: 3, comment: 'Quadra boa, vestiário simples.', nome_autor: 'Carla', created_at: '2026-09-20T12:00:00Z' }] }));
  await page.waitForTimeout(500);
  const card = await page.evaluate(() => {
    const a = document.querySelector('#parceiros .ht-rev');
    if (!a) return null;
    const ordem = [...a.querySelectorAll('.rev-name, .ht-rev-badge, .ht-rev-text, .rev-analise, [data-responder]')].map(el => el.className.split(' ')[0] || el.dataset.responder);
    return { ordem: ordem.join(','), topo: a.querySelector('.ht-rev-top')?.innerText.replace(/\s+/g, ' ') || '' };
  });
  ok(card && card.ordem === 'rev-name,ht-rev-badge,rev-analise,ht-rev-text,inline-link' && card.topo.startsWith('C Carla'), 'avaliação: quem avaliou e a nota em cima, depois o texto e "Responder" — ' + JSON.stringify(card));
  await browser.close();
})();
