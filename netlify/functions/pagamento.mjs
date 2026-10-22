// Compra de créditos do leilão pelo próprio site (pedido do Breno em
// 19/10/2026: "eu quero que as academias possam comprar direto no site a
// quantidade de créditos"). O gateway é o Mercado Pago: Pix com o QR code
// na própria tela (como o "checkout transparente") e cartão na página do
// Mercado Pago (Checkout Pro, sem pacote nenhum no site). Gateway próprio
// precisaria de licença do Banco Central e certificação PCI.
//
// Endereço: /.netlify/functions/pagamento
//   POST { acao: "cobrar", compra }     cria a cobrança da compra aberta
//                                       (o valor vem do banco, nunca do
//                                       navegador): Pix devolve o QR code e
//                                       o copia e cola; cartão, o link.
//   POST { acao: "consultar", compra }  pergunta ao Mercado Pago e confirma
//                                       (para quando o aviso demora).
//   POST ?mp=1 (o aviso do Mercado Pago, "payment")  busca o pagamento no
//                                       Mercado Pago e confirma. A
//                                       confirmação vale só pelo que o
//                                       Mercado Pago diz, nunca pelo aviso.
// Variáveis no Netlify (Production e Deploy Previews, "Contains secret
// values"; cada uma com o banco do lugar: o de verdade em Production, o de
// teste nas prévias):
//   MERCADOPAGO_ACCESS_TOKEN   a credencial de produção (APP_USR-…) ou de
//                              teste (TEST-…) do Mercado Pago
//   SUPABASE_URL               https://<projeto>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  a chave service_role (só a função usa)
// Sem elas, responde 503: o site de verdade oferece a compra pelo WhatsApp,
// e o de teste usa o pagamento de teste (SQL 20261020120000, regra 118).
// A compra de plano (só no site de teste, por enquanto) passa igual.
// Nada de pacote: só o que o Node do Netlify já tem (fetch).

const MP = "https://api.mercadopago.com";
const env = (nome) => (globalThis.Netlify?.env?.get(nome) ?? process.env[nome] ?? "").trim();
const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function rpc(nome, args) {
  const url = env("SUPABASE_URL"), chave = env("SUPABASE_SERVICE_ROLE_KEY");
  const r = await fetch(`${url}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { apikey: chave, Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`banco ${nome}: ${r.status}`);
  return r.json();
}

async function mp(caminho, opcoes = {}) {
  const r = await fetch(`${MP}${caminho}`, {
    ...opcoes,
    headers: { Authorization: `Bearer ${env("MERCADOPAGO_ACCESS_TOKEN")}`, "Content-Type": "application/json", ...(opcoes.headers || {}) },
  });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Mercado Pago ${caminho}: ${r.status} ${corpo.message || ""}`.trim());
  return corpo;
}

// O endereço do site de onde veio o pedido (o mesmo da prévia ou do site).
function origemDe(req) {
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

export function dadosDoPix(pagamento) {
  const t = (pagamento.point_of_interaction || {}).transaction_data || {};
  return { qr: t.qr_code_base64 || "", copia: t.qr_code || "", expira: pagamento.date_of_expiration || null };
}

async function confirmar(compra, pagamento) {
  return rpc("confirmar_compra", {
    p_compra: compra, p_gateway_id: String(pagamento.id || ""),
    p_valor_pago: Number(pagamento.transaction_amount || 0), p_situacao: String(pagamento.status || ""),
  });
}

async function cobrar(req, compraId) {
  const c = await rpc("compra_para_cobrar", { p_compra: compraId });
  if (!c || !c.id) return json(404, { erro: "Compra não encontrada." });
  if (c.situacao !== "aberta") return json(409, { erro: "Essa compra já foi paga ou recusada.", situacao: c.situacao });
  const origem = origemDe(req);
  const aviso = `${origem}/.netlify/functions/pagamento?mp=1`;
  const plano = c.tipo === "plano";
  const descricao = plano
    ? `Plano ${c.plano === "premium" ? "Premium" : "Completo"} ${c.periodo === "anual" ? "anual" : "mensal"} GuiaTennis · ${c.academia}`
    : `Créditos do leilão GuiaTennis · ${c.academia}`;
  if (c.forma === "pix") {
    const expira = new Date(Date.now() + 30 * 60 * 1000).toISOString().replace("Z", "-00:00");
    const p = await mp("/v1/payments", {
      method: "POST",
      headers: { "X-Idempotency-Key": `pix-${c.id}` },
      body: JSON.stringify({
        transaction_amount: c.valor, description: descricao, payment_method_id: "pix",
        payer: { email: c.email || "parceiros@guiatennis.com.br" },
        external_reference: c.id, notification_url: aviso, date_of_expiration: expira,
      }),
    });
    await rpc("registrar_cobranca", { p_compra: c.id, p_gateway_id: String(p.id) });
    return json(200, { forma: "pix", valor: c.valor, ...dadosDoPix(p) });
  }
  const volta = `${origem}/parceiros/${plano ? "plano" : "creditos"}?compra=${c.id}`;
  const pref = await mp("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [{ title: descricao, quantity: 1, unit_price: c.valor, currency_id: "BRL" }],
      external_reference: c.id, notification_url: aviso,
      back_urls: { success: volta, pending: volta, failure: volta }, auto_return: "approved",
      payment_methods: { excluded_payment_types: [{ id: "ticket" }], installments: 1 },
      payer: c.email ? { email: c.email } : undefined,
    }),
  });
  await rpc("registrar_cobranca", { p_compra: c.id, p_gateway_id: String(pref.id) });
  return json(200, { forma: "cartao", valor: c.valor, link: pref.init_point });
}

async function consultar(compraId) {
  const c = await rpc("compra_para_cobrar", { p_compra: compraId });
  if (!c || !c.id) return json(404, { erro: "Compra não encontrada." });
  if (c.situacao !== "aberta") return json(200, { situacao: c.situacao });
  const busca = await mp(`/v1/payments/search?external_reference=${encodeURIComponent(c.id)}&sort=date_created&criteria=desc`);
  const lista = (busca && busca.results) || [];
  const aprovado = lista.find(p => p.status === "approved") || lista[0];
  if (!aprovado) return json(200, { situacao: "aberta" });
  return json(200, { situacao: await confirmar(c.id, aprovado) });
}

async function avisoDoMercadoPago(req) {
  const u = new URL(req.url);
  let corpo = {};
  try { corpo = await req.json(); } catch { /* aviso antigo: só a query */ }
  const tipo = corpo.type || u.searchParams.get("type") || u.searchParams.get("topic");
  const id = (corpo.data && corpo.data.id) || u.searchParams.get("data.id") || u.searchParams.get("id");
  if (tipo !== "payment" || !id) return json(200, { ok: true, ignorado: true });
  const p = await mp(`/v1/payments/${encodeURIComponent(id)}`);
  if (!p.external_reference) return json(200, { ok: true, ignorado: true });
  return json(200, { ok: true, situacao: await confirmar(p.external_reference, p) });
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { erro: "Use POST." });
  if (!env("MERCADOPAGO_ACCESS_TOKEN") || !env("SUPABASE_URL") || !env("SUPABASE_SERVICE_ROLE_KEY")) {
    return json(503, { erro: "desligado" });
  }
  try {
    if (new URL(req.url).searchParams.get("mp") === "1") return await avisoDoMercadoPago(req);
    let corpo = {};
    try { corpo = await req.json(); } catch { return json(400, { erro: "Corpo inválido." }); }
    if (!/^[0-9a-f-]{36}$/i.test(String(corpo.compra || ""))) return json(400, { erro: "Falta a compra." });
    if (corpo.acao === "cobrar") return await cobrar(req, corpo.compra);
    if (corpo.acao === "consultar") return await consultar(corpo.compra);
    return json(400, { erro: "Ação inválida." });
  } catch (e) {
    console.error("pagamento:", e && e.message);
    return json(502, { erro: "Não consegui falar com o Mercado Pago agora." });
  }
};
