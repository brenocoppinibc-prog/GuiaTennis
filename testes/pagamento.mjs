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
ok(pref.corpo.items[0].unit_price === 100 && pref.corpo.back_urls.success === `https://deploy-preview-5--x.netlify.app/parceiros/promocoes-email?compra=${ID}` && pref.corpo.payment_methods.excluded_payment_types[0].id === "ticket",
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
  && prefPlano.corpo.back_urls.success === `https://deploy-preview-5--x.netlify.app/parceiros/plano?compra=${ID}`, "plano: o texto diz o plano e a volta é a página Plano");

ok(JSON.stringify(dadosDoPix({})) === JSON.stringify({ qr: "", copia: "", expira: null }), "Pix sem os dados não quebra");
r = await pagar(new Request("https://x/.netlify/functions/pagamento", { method: "GET" }));
ok(r.status === 405, "só POST");

console.log(`\n${falhas ? falhas + " falha(s)" : "Tudo certo"}`);
process.exit(falhas ? 1 : 0);
