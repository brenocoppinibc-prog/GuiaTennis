// Regra 330 (24/11/2026): "acho esse resumo do completo grande demais e só com
// informações que já tem na ficha, acho legal diminuir um pouco o resumo e
// falar o que diz as avaliações também". O resumo do Completo: curto, com onde
// fica, as quadras, para quem são as aulas e o que dizem as avaliações (a nota,
// o que mais elogiam e um trecho), como o "Os hóspedes adoraram" do Booking.
const { abrir, ok } = require('./harness');

(async () => {
  const { browser, page } = await abrir({ q: '?court=a1', avaliacoes: [
    { id: 'r1', academia_id: 'a1', stars: 5, comment: 'Professores excelentes e muito atenciosos. As quadras são ótimas.', nome_autor: 'Carla', created_at: '2026-11-20T12:00:00Z' },
    { id: 'r2', academia_id: 'a1', stars: 4, comment: 'O professor não chegou no horário, mas a aula foi boa. Atendimento simpático.', nome_autor: 'Rui', created_at: '2026-11-22T12:00:00Z' },
    { id: 'r3', academia_id: 'a1', stars: 5, comment: 'Ótimo professor, aprendi muito. Me liga no 11912345678.', nome_autor: 'Bia', created_at: '2026-11-23T12:00:00Z' },
  ] });
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    const base = state.allCourts.find(x => x.id === 'a1');
    const c = decorate(aplicarPlano({ ...base, plano: 'completo' }));
    const p = decorate(aplicarPlano({ ...base, plano: 'premium', sobre: '' }));
    const sem = decorate(aplicarPlano({ ...state.allCourts.find(x => x.id === 'a2'), plano: 'completo' }));
    const comTudo = decorate(aplicarPlano({ ...base, plano: 'completo', catalogo: [{ tipo: 'aula', cobranca: 'avulsa', duracao: 60, preco: '120' }, { tipo: 'locacao', cobranca: 'avulsa', preco: '100' }] }));
    return { tudo: resumoCompleto(comTudo), texto: resumoCompleto(c), curto: descricaoAcademia(c), premium: resumoCompleto(p), semAvaliacao: resumoCompleto(sem), curtoSem: descricaoAcademia(sem), html: htSobre(c) };
  });
  ok(r.texto.length <= 400 && r.texto.startsWith('Só Aula Tennis fica em Pinheiros, São Paulo.'), 'o resumo do Completo é curto (até 400 letras) e começa por onde fica — ' + r.texto.length + ' letras: ' + r.texto);
  ok(/Os jogadores dão nota 4,7 de 5, em 3 avaliações no GuiaTennis\./.test(r.texto), 'diz a nota e quantas avaliações');
  ok(/Quem avaliou elogia principalmente os professores \(2 avaliações\), o atendimento \(2\)/.test(r.texto) && /elogia/.test(r.texto), 'diz o que mais elogiam, com quantas avaliações (a frase negativa não conta)');
  ok(r.texto.includes('Uma avaliação diz: “Ótimo professor, aprendi muito.”'), 'traz um trecho da avaliação mais recente sobre o mais elogiado');
  ok(!r.texto.includes('não chegou') && !r.texto.includes('11912345678'), 'o trecho nunca é frase negativa nem tem telefone');
  ok(!/Horário:|Entre as comodidades|R\$|sob consulta|cancelamento/i.test(r.texto), 'sem o que a ficha já mostra nas partes dela (preço, comodidades, horário, cancelamento)');
  ok(r.tudo.includes('Tem aulas para adultos, além de locação de quadra.') && !/R\$/.test(r.tudo), 'para quem são as aulas e a locação, sem o preço — ' + r.tudo);
  ok(r.premium === r.texto, 'Premium sem o texto da academia: o mesmo resumo');
  ok(r.semAvaliacao === r.curtoSem, 'sem avaliação: o resumo de sempre');
  ok(!r.html.includes('Ler mais') || r.texto.length > 220, 'o "Ler mais" só com texto longo');
  await browser.close();
})();
