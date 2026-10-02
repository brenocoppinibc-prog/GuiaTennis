// O que cada plano libera (pedido do Breno em 02/10/2026): Básico com até 3
// comodidades, até 3 fotos e só o WhatsApp; Completo e Premium com tudo.
const { abrir, ok, irParte } = require('./harness');
(async () => {
  const { browser, page } = await abrir({ admin: true });
  const r = await page.evaluate(() => {
    const base = { id: 'x', name: 'X', photos: ['1', '2', '3', '4', '5'], amenities: ['wifi', 'vestiario', 'loja', 'agua', 'camera'], instagram: '@x', site: 'https://x.com.br' };
    const b = aplicarPlano({ ...base, plano: 'basico' });
    const c = aplicarPlano({ ...base, plano: 'completo' });
    return {
      basico: [b.photos.length, b.amenities.length, b.instagram, b.site].join('|'),
      completo: [c.photos.length, c.amenities.length, c.instagram, c.site].join('|'),
      guardado: [b.integral.photos.length, b.integral.amenities.length, b.integral.instagram].join('|'),
      pessoas: PC_PLANOS.map(p => p.pessoas).join(),
      numeros: ['basico', 'completo', 'premium'].map(k => limitesDoPlano(k).numeros).join(),
    };
  });
  ok(r.basico === '3|3||', 'Básico: até 3 fotos, até 3 comodidades e só o WhatsApp — ' + r.basico);
  ok(r.completo === '5|5|@x|https://x.com.br', 'Completo: tudo — ' + r.completo);
  ok(r.guardado === '5|5|@x', 'o que passou do plano continua guardado e volta se aprimorar');
  ok(r.pessoas === '1,5,10', 'pessoas por plano: 1, 5 e 10');
  ok(r.numeros === 'false,false,true', 'números só no Premium');

  // Formulário: no Básico, a 4ª comodidade não entra.
  await page.evaluate(() => { window.__form = null; state.showRegister = true; state.registerStatus = 'idle'; render(); });
  await irParte(page, 'quadras');
  for (const k of ['wifi', 'vestiario', 'loja']) await page.click(`.reg-amenity[data-amenity="${k}"]`);
  const form = await page.evaluate(() => ({ marcadas: window.__form.amenities.length, travadas: document.querySelectorAll('.reg-amenity:disabled').length, nota: document.querySelector('.reg-plano-nota')?.innerText || '' }));
  ok(form.marcadas === 3 && form.travadas === 7 && form.nota.includes('até 3 comodidades'), 'Básico: depois de 3 comodidades, as outras travam — ' + JSON.stringify(form));
  const chegada = await page.evaluate(() => {
    const a = { fachada: 'Portão preto', entrada: 'Avise na portaria', estacionar: 'Na rua' };
    return [aplicarPlano({ id: 'y', plano: 'basico', acesso: a }), aplicarPlano({ id: 'y', plano: 'completo', acesso: a })].map(x => Object.keys(x.acesso).length + ':' + Object.keys(x.integral.acesso).length).join();
  });
  ok(chegada === '0:3,3:3', 'Básico: sem como chegar na ficha (fica guardado); Completo: com — ' + chegada);
  await irParte(page, 'fotos');
  ok((await page.evaluate(() => document.querySelector('.reg-plano-nota')?.innerText || '')).includes('até 3 fotos'), 'Básico: aviso de até 3 fotos');
  await browser.close();
})();
