// Compra de créditos pelo site (19/10/2026): a função do Netlify que cria a
// cobrança no Mercado Pago e confirma o pagamento. Roda sem internet: o
// Mercado Pago e o Supabase são fingidos.
//   node testes/pagamento.mjs
import pagar, { dadosDoPix } from "../netlify/functions/pagamento.mjs";

let falhas = 0;
const ok = (cond, msg) => { if (!cond) falhas += 1; console.log((cond ? "OK    " : "FALHA ") + msg); };
const ID = "11111111-2222-4333-8444-555555555555";
const pedir = (corpo, busca = "") => pagar(new Request("https://deploy-preview-5--x.netlify.app/.netlify/functions/pagamento" + busca, {
  method: "POST", body: typeof corpo === "string" ? corpo : JSON.stringify(corpo), headers: { "Content-Type": "application/json" } }));

// Desligada: sem as variáveis, 503 (o site oferece o WhatsApp).
delete process.env.MERCADOPAGO_ACCESS_TOKEN;
let r = await pedir({ acao: "cobrar", compra: ID });
ok(r.status === 503 && (await r.json()).erro === "desligado", "sem as variáveis, responde \"desligado\" (503)");

process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-123";
process.env.SUPABASE_URL = "https://banco.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-chave";

// O banco e o Mercado Pago de mentira.
let pedidos = [];
let compra = { id: ID, valor: 100, forma: "pix", situacao: "aberta", academia: "Só Aula Tennis", email: "ana@exemplo.com" };
let pagamentos = {};
let confirmadas = [];
globalThis.fetch = async (url, op = {}) => {
  url = String(url);
  const corpo = op.body ? JSON.parse(op.body) : null;
  pedidos.push({ url, metodo: op.method || "GET", cabecalhos: op.headers || {}, corpo });
  const resp = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
  if (url === "https://banco.supabase.co/rest/v1/rpc/compra_para_cobrar") return resp(200, corpo.p_compra === ID ? compra : null);
  if (url === "https://banco.supabase.co/rest/v1/rpc/registrar_cobranca") return resp(200, true);
  if (url === "https://banco.supabase.co/rest/v1/rpc/confirmar_compra") {
    confirmadas.push(corpo);
    const paga = corpo.p_situacao === "approved" && corpo.p_valor_pago >= compra.valor;
    if (paga) compra = { ...compra, situacao: "paga" };
    return resp(200, paga ? "paga" : corpo.p_situacao === "rejected" ? "recusada" : "aberta");
  }
  if (url === "https://api.mercadopago.com/v1/payments" && op.method === "POST") {
    const p = { id: 987, status: "pending", transaction_amount: corpo.transaction_amount, external_reference: corpo.external_reference, date_of_expiration: corpo.date_of_expiration,
      point_of_interaction: { transaction_data: { qr_code: "00020101PIXCOPIAECOLA", qr_code_base64: "iVBORw0KGgo=" } } };
    pagamentos[p.id] = p;
    return resp(201, p);
  }
  if (url === "https://api.mercadopago.com/checkout/preferences") return resp(201, { id: "pref-1", init_point: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-1" });
  if (url.startsWith("https://api.mercadopago.com/v1/payments/search")) return resp(200, { results: Object.values(pagamentos).filter(p => url.includes(p.external_reference)) });
  const m = url.match(/^https:\/\/api\.mercadopago\.com\/v1\/payments\/(\w+)$/);
  if (m) return pagamentos[m[1]] ? resp(200, pagamentos[m[1]]) : resp(404, { message: "not found" });
  return resp(404, { message: "não existe" });
};

r = await pedir("não é json");
ok(r.status === 400, "corpo que não é JSON: 400");
r = await pedir({ acao: "cobrar", compra: "1; drop table" });
ok(r.status === 400, "compra que não é um id: 400");

// Pix: o valor vem do banco; o QR code e o copia e cola voltam para a tela.
r = await pedir({ acao: "cobrar", compra: ID, valor: 1 });
let d = await r.json();
const criado = pedidos.find(p => p.url === "https://api.mercadopago.com/v1/payments");
ok(r.status === 200 && d.forma === "pix" && d.qr === "iVBORw0KGgo=" && d.copia === "00020101PIXCOPIAECOLA" && d.valor === 100, "Pix: devolve o QR code e o copia e cola");
ok(criado.corpo.transaction_amount === 100 && criado.corpo.payment_method_id === "pix" && criado.corpo.external_reference === ID && criado.corpo.payer.email === "ana@exemplo.com",
  "o valor da cobrança vem do banco (R$ 100), não do navegador (que mandou 1)");
ok(criado.corpo.notification_url === "https://deploy-preview-5--x.netlify.app/.netlify/functions/pagamento?mp=1" && criado.cabecalhos.Authorization === "Bearer TEST-123" && criado.cabecalhos["X-Idempotency-Key"] === "pix-" + ID,
  "o aviso volta para o mesmo site, com a credencial e a chave de idempotência");
ok(new Date(criado.corpo.date_of_expiration) - Date.now() > 25 * 60000, "o Pix vale 30 minutos");
ok(pedidos.some(p => p.url.endsWith("/rpc/registrar_cobranca") && p.corpo.p_gateway_id === "987" && p.cabecalhos.apikey === "service-chave"), "anota a cobrança no banco, com a chave service_role");

// O aviso do Mercado Pago: confirma pelo que o Mercado Pago diz.
pagamentos[987].status = "approved";
r = await pagar(new Request("https://deploy-preview-5--x.netlify.app/.netlify/functions/pagamento?mp=1", { method: "POST", body: JSON.stringify({ type: "payment", data: { id: "987" } }) }));
d = await r.json();
ok(r.status === 200 && d.situacao === "paga" && confirmadas.at(-1).p_valor_pago === 100 && confirmadas.at(-1).p_situacao === "approved", "o aviso confirma o pagamento aprovado");
const antes = confirmadas.length;
r = await pagar(new Request("https://x/.netlify/functions/pagamento?mp=1", { method: "POST", body: JSON.stringify({ type: "merchant_order", data: { id: "1" } }) }));
ok(r.status === 200 && confirmadas.length === antes, "aviso que não é de pagamento é ignorado");
r = await pagar(new Request("https://x/.netlify/functions/pagamento?mp=1", { method: "POST", body: JSON.stringify({ type: "payment", data: { id: "inventado" } }) }));
ok(r.status === 502 && confirmadas.length === antes, "aviso de um pagamento que o Mercado Pago não conhece não confirma nada");

// Consultar: a compra já paga só diz "paga".
r = await pedir({ acao: "consultar", compra: ID });
ok((await r.json()).situacao === "paga", "consultar: a compra paga diz \"paga\"");
r = await pedir({ acao: "cobrar", compra: ID });
ok(r.status === 409, "cobrar de novo uma compra paga: 409");

// Cartão: o link do Mercado Pago, voltando para a página da compra.
compra = { ...compra, situacao: "aberta", forma: "cartao" };
pagamentos = {};
r = await pedir({ acao: "cobrar", compra: ID });
d = await r.json();
const pref = pedidos.find(p => p.url === "https://api.mercadopago.com/checkout/preferences");
ok(r.status === 200 && d.forma === "cartao" && d.link.startsWith("https://www.mercadopago.com.br/checkout/"), "cartão: devolve o link do Mercado Pago");
ok(pref.corpo.items[0].unit_price === 100 && pref.corpo.back_urls.success === `https://deploy-preview-5--x.netlify.app/parceiros/creditos?compra=${ID}` && pref.corpo.payment_methods.excluded_payment_types[0].id === "ticket",
  "a página do cartão volta para a compra e não oferece boleto");
r = await pedir({ acao: "consultar", compra: ID });
ok((await r.json()).situacao === "aberta", "consultar antes de pagar: \"aberta\"");
pagamentos[555] = { id: 555, status: "approved", transaction_amount: 100, external_reference: ID };
r = await pedir({ acao: "consultar", compra: ID });
ok((await r.json()).situacao === "paga", "consultar depois do cartão aprovado: confirma e diz \"paga\"");

// Compra de plano (regra 118): o texto diz o plano e a volta é a página Plano.
compra = { ...compra, situacao: "aberta", forma: "cartao", tipo: "plano", plano: "premium", periodo: "anual", valor: 990 };
pedidos.length = 0;
r = await pedir({ acao: "cobrar", compra: ID });
const prefPlano = pedidos.find(p => p.url === "https://api.mercadopago.com/checkout/preferences");
ok(r.status === 200 && prefPlano.corpo.items[0].title === "Plano Premium anual GuiaTennis · Só Aula Tennis" && prefPlano.corpo.items[0].unit_price === 990
  && prefPlano.corpo.back_urls.success === `https://deploy-preview-5--x.netlify.app/parceiros/creditos?compra=${ID}&tipo=plano`, "plano: o texto diz o plano e a volta é a tela da compra (regra 232)");

// O comprador (regra 232): o CPF ou CNPJ, o nome e o e-mail da nota vão como os do pagador.
compra = { ...compra, situacao: "aberta", forma: "pix", tipo: "creditos", valor: 100, nota_documento: "11222333000181", nota_nome: "Só Aula Tennis Ltda", nota_email: "fin@soaula.com.br" };
pedidos.length = 0;
r = await pedir({ acao: "cobrar", compra: ID });
const pixComprador = pedidos.find(p => p.url === "https://api.mercadopago.com/v1/payments");
ok(r.status === 200 && pixComprador.corpo.payer.email === "fin@soaula.com.br" && pixComprador.corpo.payer.first_name === "Só Aula Tennis Ltda"
  && pixComprador.corpo.payer.identification.type === "CNPJ" && pixComprador.corpo.payer.identification.number === "11222333000181", "Pix: o pagador é o comprador, com o CNPJ");
compra = { ...compra, forma: "cartao", nota_documento: "52998224725", nota_nome: "Ana Professora", nota_email: "ana@prof.com" };
pedidos.length = 0;
r = await pedir({ acao: "cobrar", compra: ID });
const prefComprador = pedidos.find(p => p.url === "https://api.mercadopago.com/checkout/preferences");
ok(r.status === 200 && prefComprador.corpo.payer.name === "Ana Professora" && prefComprador.corpo.payer.email === "ana@prof.com" && prefComprador.corpo.payer.identification.type === "CPF",
  "cartão: a página do Mercado Pago já abre com o CPF e o nome do comprador");
compra = { ...compra, forma: "pix", nota_documento: "12ABC34501DE35" };
pedidos.length = 0;
r = await pedir({ acao: "cobrar", compra: ID });
ok(r.status === 200 && !pedidos.find(p => p.url === "https://api.mercadopago.com/v1/payments").corpo.payer.identification, "CNPJ com letras: vai sem o número, até o Mercado Pago aceitar");

ok(JSON.stringify(dadosDoPix({})) === JSON.stringify({ qr: "", copia: "", expira: null }), "Pix sem os dados não quebra");
r = await pagar(new Request("https://x/.netlify/functions/pagamento", { method: "GET" }));
ok(r.status === 405, "só POST");

// ---- A renovação automática (regra 314): as Assinaturas do Mercado Pago ----
const AUTO = "aaaaaaaa-2222-4333-8444-555555555555";
let auto = { id: AUTO, academia_id: "bbbbbbbb-2222-4333-8444-555555555555", academia: "Só Aula Tennis", plano: "premium", periodo: "mensal", forma: "cartao", valor: 49,
  situacao: "aguardando", desejada: "ativa", gateway_id: null, comeca_em: new Date(Date.now() + 20 * 864e5).toISOString(), nota_email: "fin@soaula.com.br", email: "ana@exemplo.com" };
let registros = [], automaticos = [], sincronizar = [], devolvidos = [], preStatus = "authorized", faturas = [];
const fetchAntes = globalThis.fetch;
globalThis.fetch = async (url, op = {}) => {
  url = String(url);
  const corpo = op.body ? JSON.parse(op.body) : null;
  const resp = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
  if (url.endsWith("/rpc/cobranca_automatica_para_assinar")) { pedidos.push({ url, corpo }); return resp(200, corpo.p_cobranca === AUTO ? auto : null); }
  if (url.endsWith("/rpc/registrar_cobranca_automatica")) {
    registros.push(corpo);
    auto = { ...auto, gateway_id: corpo.p_gateway_id || auto.gateway_id, situacao: { authorized: "ativa", paused: "pausada", cancelled: "cancelada" }[corpo.p_status] || "aguardando" };
    return resp(200, auto.situacao);
  }
  if (url.endsWith("/rpc/cobrancas_para_sincronizar")) return resp(200, sincronizar);
  if (url.endsWith("/rpc/pagamento_automatico")) {
    automaticos.push(corpo);
    return resp(200, auto.desejada !== "ativa" ? "nao_quer" : corpo.p_situacao === "approved" ? "paga" : corpo.p_situacao === "rejected" ? "recusada" : "aberta");
  }
  if (url === "https://api.mercadopago.com/preapproval" && op.method === "POST") {
    pedidos.push({ url, metodo: "POST", cabecalhos: op.headers || {}, corpo });
    if (corpo.card_token_id === "tok-ruim") return resp(400, { message: "CC_VAL_433 Credit card validation has failed" });
    return resp(201, { id: "pre-1", status: corpo.status, init_point: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=pre-1" });
  }
  let m = url.match(/^https:\/\/api\.mercadopago\.com\/preapproval\/([\w-]+)$/);
  if (m) { pedidos.push({ url, metodo: op.method || "GET", corpo }); return resp(200, { id: m[1], status: corpo && corpo.status ? corpo.status : preStatus, external_reference: AUTO }); }
  if (url.startsWith("https://api.mercadopago.com/authorized_payments/search")) return resp(200, { results: faturas });
  m = url.match(/^https:\/\/api\.mercadopago\.com\/authorized_payments\/(\w+)$/);
  if (m) return resp(200, { id: m[1], preapproval_id: "pre-1", transaction_amount: 49, payment: { id: 777, status: "approved" } });
  m = url.match(/^https:\/\/api\.mercadopago\.com\/v1\/payments\/(\w+)\/refunds$/);
  if (m) { devolvidos.push(m[1]); return resp(201, { id: 1 }); }
  return fetchAntes(url, op);
};
r = await pedir({ acao: "assinar", cobranca: "x" });
ok(r.status === 400, "assinatura que não é um id: 400");
r = await pedir({ acao: "assinar", cobranca: AUTO, previa: true });
d = await r.json();
ok(r.status === 200 && d.forma === "cartao" && d.valor === 49 && d.email === "fin@soaula.com.br" && d.comeca_em && !pedidos.some(p => p.url === "https://api.mercadopago.com/preapproval"),
  "prévia: devolve o valor do banco, o e-mail e o dia da primeira cobrança, sem falar com o Mercado Pago");
r = await pedir({ acao: "assinar", cobranca: AUTO, cartao: { token: "tok-1", payment_method_id: "visa", final: "4242", payer: { email: "dono@academia.com" } }, valor: 1 });
d = await r.json();
let pre = pedidos.filter(p => p.url === "https://api.mercadopago.com/preapproval").at(-1);
ok(r.status === 200 && d.situacao === "ativa" && d.cobraAgora === false && pre.corpo.card_token_id === "tok-1" && pre.corpo.status === "authorized" && pre.corpo.external_reference === AUTO
  && pre.corpo.auto_recurring.transaction_amount === 49 && pre.corpo.auto_recurring.frequency === 1 && pre.corpo.auto_recurring.frequency_type === "months" && pre.corpo.auto_recurring.currency_id === "BRL"
  && pre.corpo.auto_recurring.start_date === new Date(auto.comeca_em).toISOString() && pre.corpo.payer_email === "dono@academia.com" && pre.corpo.reason === "Plano Premium mensal GuiaTennis · Só Aula Tennis"
  && pre.corpo.back_url === `https://deploy-preview-5--x.netlify.app/parceiros/plano?automatica=${AUTO}`,
  "cartão: a assinatura no Mercado Pago com o token, o valor do banco (não o do navegador), todo mês e a primeira cobrança no fim do prazo");
ok(registros.at(-1).p_bandeira === "visa" && registros.at(-1).p_final === "4242" && registros.at(-1).p_gateway_id === "pre-1", "guarda a bandeira e os 4 últimos números");
r = await pedir({ acao: "assinar", cobranca: AUTO, cartao: { token: "tok-2" } });
ok(r.status === 409, "assinar de novo a que já está ligada: 409");
auto = { ...auto, situacao: "aguardando", gateway_id: null, comeca_em: null, periodo: "anual", valor: 490 };
r = await pedir({ acao: "assinar", cobranca: AUTO, cartao: { token: "tok-ruim" } });
d = await r.json();
ok(r.status === 200 && d.situacao === "recusada", "cartão que não passa na validação do Mercado Pago: \"recusada\" (a tela pede outro)");
r = await pedir({ acao: "assinar", cobranca: AUTO, cartao: { token: "tok-3" } });
d = await r.json();
pre = pedidos.filter(p => p.url === "https://api.mercadopago.com/preapproval").at(-1);
ok(d.cobraAgora === true && !pre.corpo.auto_recurring.start_date && pre.corpo.auto_recurring.frequency === 12 && pre.corpo.auto_recurring.transaction_amount === 490, "sem plano pago: cobra na hora; no anual, a cada 12 meses");
auto = { ...auto, situacao: "aguardando", gateway_id: null, forma: "pix", valor: 46, periodo: "mensal" };
r = await pedir({ acao: "assinar", cobranca: AUTO });
d = await r.json();
pre = pedidos.filter(p => p.url === "https://api.mercadopago.com/preapproval").at(-1);
ok(r.status === 200 && d.forma === "pix" && d.link.startsWith("https://www.mercadopago.com.br/subscriptions/") && pre.corpo.status === "pending" && !pre.corpo.card_token_id && pre.corpo.auto_recurring.transaction_amount === 46,
  "Pix Automático: a assinatura sem cartão (pending) e o link do Mercado Pago para autorizar");
// Acompanhar: sincroniza, lê a situação e as cobranças (uma vez cada).
auto = { ...auto, situacao: "ativa", gateway_id: "pre-1", forma: "cartao", valor: 49 };
faturas = [{ id: 5001, preapproval_id: "pre-1", transaction_amount: 49, payment: { id: 777, status: "approved" } }, { id: 5002, transaction_amount: 49, status: "scheduled" }];
r = await pedir({ acao: "automatica", cobranca: AUTO });
d = await r.json();
ok(r.status === 200 && d.paga === true && automaticos.length === 1 && automaticos[0].p_pagamento === "777" && automaticos[0].p_valor === 49 && automaticos[0].p_situacao === "approved",
  "acompanhar: a cobrança aprovada vai ao banco pelo id do pagamento; a agendada, ainda não");
sincronizar = [{ id: AUTO, gateway_id: "pre-1", status: "paused" }];
await pedir({ acao: "automatica", cobranca: AUTO });
ok(pedidos.some(p => p.url === "https://api.mercadopago.com/preapproval/pre-1" && p.metodo === "PUT" && p.corpo.status === "paused") && registros.some(x => x.p_status === "paused"),
  "cancelada no site: pausa a assinatura no Mercado Pago na hora");
sincronizar = [];
// A cobrança que a academia já não queria é devolvida.
auto = { ...auto, desejada: "pausada" };
await pedir({ acao: "automatica", cobranca: AUTO });
ok(devolvidos.includes("777"), "cobrança que chegou depois de cancelar é devolvida na hora");
auto = { ...auto, desejada: "ativa" };
// Os avisos do Mercado Pago.
const antesAuto = automaticos.length;
r = await pedir({ type: "subscription_authorized_payment", data: { id: "5001" } }, "?mp=1");
ok(r.status === 200 && automaticos.length === antesAuto + 1 && automaticos.at(-1).p_cobranca === AUTO, "aviso da cobrança da assinatura: confirma pelo que o Mercado Pago diz");
preStatus = "cancelled";
r = await pedir({ type: "subscription_preapproval", data: { id: "pre-1" } }, "?mp=1");
ok(r.status === 200 && registros.at(-1).p_status === "cancelled" && registros.at(-1).p_cobranca === AUTO, "aviso da assinatura (cancelada no Mercado Pago): o banco fica sabendo");
r = await pedir({ acao: "trocar_cartao", cobranca: AUTO, cartao: { token: "tok-novo", payment_method_id: "master", final: "1111" } });
d = await r.json();
ok(d.situacao === "trocado" && pedidos.some(p => p.url === "https://api.mercadopago.com/preapproval/pre-1" && p.metodo === "PUT" && p.corpo.card_token_id === "tok-novo") && registros.at(-1).p_final === "1111",
  "trocar o cartão: o token novo na assinatura do Mercado Pago");

// ---- Estornos (regra 316) ----
const { devolvidoNoPagamento } = await import("../netlify/functions/pagamento.mjs");
ok(devolvidoNoPagamento({ status: "approved", transaction_amount: 100 }) === null
  && JSON.stringify(devolvidoNoPagamento({ status: "refunded", transaction_amount: 100, transaction_amount_refunded: 100 })) === JSON.stringify({ valor: 100, origem: "mercadopago" })
  && JSON.stringify(devolvidoNoPagamento({ status: "approved", transaction_amount: 100, transaction_amount_refunded: 40 })) === JSON.stringify({ valor: 40, origem: "mercadopago" })
  && devolvidoNoPagamento({ status: "charged_back", transaction_amount: 100 }).origem === "contestacao",
  "lê o estorno total, o parcial e a contestação no cartão");
const EST = "eeeeeeee-2222-4333-8444-555555555555";
let estorno = { id: EST, gateway_id: "555", pedido: 57.14, estornado: 0, situacao: "paga" }, registrados = [], devolucoes = [], conferir = [{ id: EST, gateway_id: "555" }, { id: "x", gateway_id: "556" }];
const fetchAntes2 = globalThis.fetch;
globalThis.fetch = async (url, op = {}) => {
  url = String(url);
  const corpo = op.body ? JSON.parse(op.body) : null;
  const resp = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
  if (url.endsWith("/rpc/estorno_para_fazer")) return resp(200, corpo.p_compra === EST ? estorno : null);
  if (url.endsWith("/rpc/registrar_estorno")) { registrados.push(corpo); return resp(200, "parcial"); }
  if (url.endsWith("/rpc/compras_para_conferir")) return resp(200, conferir);
  if (url.endsWith("/rpc/confirmar_compra")) return resp(200, "paga");
  let m = url.match(/^https:\/\/api\.mercadopago\.com\/v1\/payments\/(\d+)\/refunds$/);
  if (m) { devolucoes.push({ id: m[1], corpo, chave: (op.headers || {})["X-Idempotency-Key"] }); return resp(201, { id: 1 }); }
  m = url.match(/^https:\/\/api\.mercadopago\.com\/v1\/payments\/(\d+)$/);
  if (m) return m[1] === "555" ? resp(200, { id: 555, status: "approved", transaction_amount: 100, transaction_amount_refunded: 20, external_reference: EST }) : resp(200, { id: 556, status: "approved", transaction_amount: 49 });
  return fetchAntes2(url, op);
};
r = await pedir({ acao: "estornar", compra: EST });
d = await r.json();
ok(r.status === 200 && devolucoes[0].id === "555" && devolucoes[0].corpo.amount === 57.14 && devolucoes[0].chave.startsWith("estorno-") && registrados[0].p_total === 57.14 && registrados[0].p_origem === "admin",
  "estornar: devolve no Mercado Pago só o valor que o admin pediu e avisa o banco");
estorno = { ...estorno, estornado: 57.14 };
r = await pedir({ acao: "estornar", compra: EST });
ok(r.status === 409 && devolucoes.length === 1, "estornar de novo sem pedido novo: 409, sem devolver duas vezes");
registrados = [];
r = await pedir({ acao: "conferir" });
d = await r.json();
ok(r.status === 200 && d.conferidas === 2 && d.estornos === 1 && registrados.length === 1 && registrados[0].p_gateway_id === "555" && registrados[0].p_total === 20,
  "conferir: aplica o estorno feito no Mercado Pago (R$ 20 de 100) e ignora o que não mudou");
registrados = [];
r = await pedir({ type: "payment", data: { id: "555" } }, "?mp=1");
ok(r.status === 200 && registrados.length === 1 && registrados[0].p_origem === "mercadopago", "o aviso de pagamento estornado também aplica o estorno");

console.log(`\n${falhas ? falhas + " falha(s)" : "Tudo certo"}`);
process.exit(falhas ? 1 : 0);
