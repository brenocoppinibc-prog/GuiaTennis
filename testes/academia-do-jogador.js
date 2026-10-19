// Conta com o e-mail confirmado publica a academia nova direto (pedido do
// Breno em 19/10/2026: "acessos que já tem o email confirmado, é autorizado
// publicar academia direto no site, sem minha autorização mas aparecer para
// mim só para checar mesmo"). O banco publica (SQL 20261020140000); aqui,
// a tela diz que a academia já está no ar.
const { abrir, ok } = require('./harness');

const FORM = { name: "Arena do Jogador", cep: "05422-000", address: "Rua dos Pinheiros", numero: "500", complemento: "", bairro: "Pinheiros", cidade: "São Paulo",
  quadras: { saibro_coberta: 2 }, amenities: [], modalidades: ["locacao"], priceAula: "", priceLocacao: "120", phone: "11999998888", instagram: "", site: "",
  photos: [], politica: {}, acesso: {}, horario: {}, consent: true, __lat: -23.56, __lng: -46.68 };

async function mandar(confirmado) {
  const { browser, page } = await abrir({ jogador: true });
  await page.waitForTimeout(400);
  await page.evaluate(async ({ f, confirmado }) => {
    jogador.email_confirmado_em = confirmado ? new Date().toISOString() : null;
    saveVisitor({ nome: 'Ana Jogadora', contato: '11999990000' });
    window.__form = JSON.parse(JSON.stringify(f));
    state.showRegister = true; state.registerStatus = 'idle'; render();
    await doRegisterSubmit();
  }, { f: FORM, confirmado });
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => ({ tela: document.querySelector('.form-success')?.innerText || '', status: state.registerStatus, erro: state.registerError || '' }));
  await browser.close();
  return r;
}

(async () => {
  let r = await mandar(true);
  ok(r.tela.includes('Pronto: a academia já está no GuiaTennis!') && r.tela.includes('como ficha básica') && r.tela.includes('assumir a ficha pelo GuiaTennis Parceiros'),
    'conta de jogador com o e-mail confirmado: a academia já está no ar, como ficha básica — ' + (r.tela || r.erro).replace(/\s+/g, ' ').slice(0, 120));
  r = await mandar(false);
  ok(r.tela.includes('Cadastro enviado para análise!') && r.tela.includes('Com o e-mail da conta confirmado, a próxima academia entra no ar na hora.'),
    'sem o e-mail confirmado: vai para análise, e a tela diz como publicar na hora — ' + (r.tela || r.erro).replace(/\s+/g, ' ').slice(0, 120));
  const { browser, page } = await abrir();
  const termos = await page.evaluate(() => TERMS_HTML);
  ok(termos.includes('com o e-mail confirmado publica na hora') && termos.includes('A ficha publicada é pública e continua no guia') && !termos.includes('ou a remoção da página'), 'os Termos dizem quem publica na hora e que a ficha fica');
  await browser.close();
})();
