// Compra de créditos de promoções (a semana da promoção na ficha e o leilão) pelo próprio site (pedido do Breno em
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
//   POST { acao: "cobrar", compra, noSite: true }  cartão no próprio site
//                                       (regra 301): só devolve o valor e o
//                                       e-mail para o formulário do Mercado
//                                       Pago (Card Payment Brick) na página.
//   POST { acao: "cartao", compra, cartao }  paga com o token que o
//                                       formulário do Mercado Pago gerou (o
//                                       número do cartão nunca passa por aqui).
//   POST { acao: "consultar", compra }  pergunta ao Mercado Pago e confirma
//                                       (para quando o aviso demora).
//   Regra 314, a renovação automática (Assinaturas do Mercado Pago, o
//   "preapproval"), no cartão ou no Pix Automático:
//   POST { acao: "assinar", cobranca, previa: true }  só confere se está ligada
//                                       e devolve o valor e o e-mail do formulário.
//   POST { acao: "assinar", cobranca, cartao }  cartão: cria a assinatura com o
//                                       token do formulário (status authorized).
//   POST { acao: "assinar", cobranca }  Pix Automático: cria a assinatura sem
//                                       cartão e devolve o link do Mercado Pago,
//                                       onde a academia autoriza.
//   POST { acao: "automatica", cobranca }  sincroniza (pausar, voltar, cancelar)
//                                       e busca no Mercado Pago a situação e as
//                                       cobranças (para quando o aviso demora ou
//                                       não chega, como na prévia).
//   POST { acao: "trocar_cartao", cobranca, cartao }  troca o cartão.
//   Regra 316, estornos (como a Shopify e a Stripe: o estorno desfaz a compra):
//   POST { acao: "estornar", compra }   devolve no Mercado Pago o valor que o
//                                       admin pediu (pedir_estorno) e o banco
//                                       tira os créditos ou encurta o plano.
//   POST { acao: "conferir" }           confere as compras pagas (até 180 dias)
//                                       com o Mercado Pago e aplica os estornos
//                                       e as contestações que achar.
//   Os avisos de pagamento (e "consultar") também aplicam o estorno.
//   No painel do Mercado Pago (Suas integrações › a aplicação › Webhooks), o
//   endereço /.netlify/functions/pagamento?mp=1 com os eventos "Pagamentos" e
//   "Planos e assinaturas": a assinatura não aceita o notification_url.
//   POST ?mp=1 (o aviso do Mercado Pago, "payment")  busca o pagamento no
//                                       Mercado Pago e confirma. A
//                                       confirmação vale só pelo que o
//                                       Mercado Pago diz, nunca pelo aviso.
// Variáveis no Netlify (Production e Deploy Previews, "Contains secret
// values"; cada uma com o banco do lugar: o de verdade em Production, o de
// teste nas prévias):
//   MERCADOPAGO_ACCESS_TOKEN   o Access Token do Mercado Pago: em Production o
//                              de "Credenciais de produção", nas prévias o de
//                              "Credenciais de teste" (desde 2026 os dois
//                              começam com APP_USR-; o que vale é a seção).
//                              Aplicação "Checkout Pro", API de Preferences
//                              (trocar para a API de Orders quando o Mercado
//                              Pago marcar a data). Ligadas em 19/11/2026.
//                              "401 Unauthorized use of live credentials" nas
//                              Falhas = o token de produção com dados de teste.
//                              O ambiente de teste do Mercado Pago recusava o
//                              cartão de teste; desde 20/11 as prévias usam o
//                              token e a chave pública de produção (teste com
//                              dinheiro de verdade, devolvido depois).
//   SUPABASE_URL               https://<projeto>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  a chave service_role (só a função usa)
// Sem elas, responde 503: o site de verdade oferece a compra pelo WhatsApp,
// e o de teste usa o pagamento de teste (SQL 20261020120000, regra 118).
// A compra de plano (só no site de teste, por enquanto) passa igual.
// Nada de pacote: só o que o Node do Netlify já tem (fetch).

import { processarFila } from "./nota-fiscal.mjs";

const MP = "https://api.mercadopago.com";
// Regra 331: depois do aviso do Mercado Pago e do estorno, a fila da nota
// fiscal anda na hora (a compra paga emite a nota; o estorno total a cancela),
// sem passar de 6 segundos nem atrapalhar o pagamento. O relógio
// (nota-fiscal-relogio.mjs) pega o que sobrar.
async function andarComANota() {
  try { await Promise.race([processarFila(), new Promise(ok => setTimeout(ok, 6000))]); }
  catch (e) { console.error("nota fiscal:", e && e.message); }
}
const env = (nome) => (globalThis.Netlify?.env?.get(nome) ?? process.env[nome] ?? "").trim();
const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function rpc(nome, args) {
  const url = env("SUPABASE_URL"), chave = env("SUPABASE_SERVICE_ROLE_KEY");
  const r = await fetch(`${url}/rest/v1/rpc/${nome}`, {
    method: "POST",
    // A chave "service_role" antiga é um JWT e vai também no Authorization; a
    // "secret" nova (sb_secret_…) vai só no apikey (o Supabase recusa no Bearer).
    headers: { apikey: chave, ...(chave.startsWith("eyJ") ? { Authorization: `Bearer ${chave}` } : {}), "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`banco ${nome}: ${r.status} ${(await r.text().catch(() => "")).slice(0, 120)}`.trim());
  return r.json();
}

async function mp(caminho, opcoes = {}) {
  const r = await fetch(`${MP}${caminho}`, {
    ...opcoes,
    headers: { Authorization: `Bearer ${env("MERCADOPAGO_ACCESS_TOKEN")}`, "Content-Type": "application/json", ...(opcoes.headers || {}) },
  });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(`Mercado Pago ${caminho.split("?")[0]}: ${r.status} ${corpo.message || ""}`.trim());
    e.status = r.status;
    throw e;
  }
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

// O comprador (regra 232): os dados que a academia informa no começo da
// compra (os mesmos da nota fiscal) vão ao Mercado Pago como os do pagador,
// com o CPF ou o CNPJ, como no checkout da Shopify e do Mercado Livre. O
// CNPJ com letras (julho de 2026) vai sem o número, até o Mercado Pago aceitar.
export function pagadorDe(c, onde = "pix") {
  const doc = String(c.nota_documento || "");
  const email = c.nota_email || c.email || "";
  const nome = String(c.nota_nome || "").slice(0, 100);
  const identificacao = /^\d{11}$/.test(doc) ? { type: "CPF", number: doc } : /^\d{14}$/.test(doc) ? { type: "CNPJ", number: doc } : null;
  const p = {};
  if (email) p.email = email;
  if (nome) p[onde === "pix" ? "first_name" : "name"] = nome;
  if (identificacao) p.identification = identificacao;
  return p;
}

const descricaoDe = (c) => c.tipo === "plano"
  ? `Plano ${c.plano === "premium" ? "Premium" : "Completo"} ${c.periodo === "anual" ? "anual" : "mensal"} GuiaTennis · ${c.academia}`
  : `Créditos de promoções GuiaTennis · ${c.academia}`;

async function cobrar(req, compraId, noSite) {
  const c = await rpc("compra_para_cobrar", { p_compra: compraId });
  if (!c || !c.id) return json(404, { erro: "Compra não encontrada." });
  if (c.situacao !== "aberta") return json(409, { erro: "Essa compra já foi paga ou recusada.", situacao: c.situacao });
  if (noSite && c.forma !== "pix") return json(200, { forma: "cartao", noSite: true, valor: c.valor, email: c.nota_email || c.email || "" });
  const origem = origemDe(req);
  const aviso = `${origem}/.netlify/functions/pagamento?mp=1`;
  const plano = c.tipo === "plano";
  const descricao = descricaoDe(c);
  if (c.forma === "pix") {
    const expira = new Date(Date.now() + 30 * 60 * 1000).toISOString().replace("Z", "-00:00");
    const p = await mp("/v1/payments", {
      method: "POST",
      headers: { "X-Idempotency-Key": `pix-${c.id}` },
      body: JSON.stringify({
        transaction_amount: c.valor, description: descricao, payment_method_id: "pix",
        payer: { email: "parceiros@guiatennis.com.br", ...pagadorDe(c, "pix") },
        external_reference: c.id, notification_url: aviso, date_of_expiration: expira,
      }),
    });
    await rpc("registrar_cobranca", { p_compra: c.id, p_gateway_id: String(p.id) });
    return json(200, { forma: "pix", valor: c.valor, ...dadosDoPix(p) });
  }
  const volta = `${origem}/parceiros/creditos?compra=${c.id}${plano ? "&tipo=plano" : ""}`;
  const pref = await mp("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [{ title: descricao, quantity: 1, unit_price: c.valor, currency_id: "BRL" }],
      external_reference: c.id, notification_url: aviso,
      back_urls: { success: volta, pending: volta, failure: volta }, auto_return: "approved",
      payment_methods: { excluded_payment_types: [{ id: "ticket" }], installments: 1 },
      payer: Object.keys(pagadorDe(c, "preferencia")).length ? pagadorDe(c, "preferencia") : undefined,
    }),
  });
  await rpc("registrar_cobranca", { p_compra: c.id, p_gateway_id: String(pref.id) });
  return json(200, { forma: "cartao", valor: c.valor, link: pref.init_point });
}

// Regra 301: o cartão no próprio site. O formulário do Mercado Pago (Card
// Payment Brick) transforma o cartão num token; aqui o pagamento é criado com
// o valor do banco (nunca o do navegador), à vista. Aprovado ou recusado, o
// banco fica sabendo na hora; em análise, o aviso do Mercado Pago confirma.
async function cartaoNoSite(req, compraId, dados) {
  const c = await rpc("compra_para_cobrar", { p_compra: compraId });
  if (!c || !c.id) return json(404, { erro: "Compra não encontrada." });
  if (c.situacao !== "aberta") return json(409, { erro: "Essa compra já foi paga ou recusada.", situacao: c.situacao });
  if (!dados || !dados.token || !dados.payment_method_id) return json(400, { erro: "Faltam os dados do cartão." });
  const doCartao = dados.payer || {};
  const payer = { ...pagadorDe(c, "pix") };
  if (!payer.email && doCartao.email) payer.email = doCartao.email;
  if (doCartao.identification && doCartao.identification.number) payer.identification = { type: doCartao.identification.type, number: String(doCartao.identification.number) };
  const p = await mp("/v1/payments", {
    method: "POST",
    headers: { "X-Idempotency-Key": `cartao-${c.id}-${String(dados.token).slice(0, 40)}` },
    body: JSON.stringify({
      transaction_amount: c.valor, token: dados.token, installments: 1,
      payment_method_id: dados.payment_method_id, issuer_id: dados.issuer_id || undefined,
      description: descricaoDe(c),
      statement_descriptor: "GUIATENNIS", payer,
      external_reference: c.id, notification_url: `${origemDe(req)}/.netlify/functions/pagamento?mp=1`,
    }),
  });
  await rpc("registrar_cobranca", { p_compra: c.id, p_gateway_id: String(p.id || "") });
  if (p.status === "approved" || p.status === "rejected") {
    const situacao = await confirmar(c.id, p);
    return json(200, { situacao, motivo: p.status === "rejected" ? String(p.status_detail || "") : "" });
  }
  return json(200, { situacao: "aberta", status: String(p.status || "") });
}

// Regra 316: quanto o Mercado Pago já devolveu (estorno total, parcial ou
// contestação no cartão) vai ao banco, que tira os créditos ou encurta o plano.
export function devolvidoNoPagamento(p) {
  const total = Number(p.transaction_amount || 0);
  if (p.status === "refunded" || p.status === "charged_back") return { valor: Number(p.transaction_amount_refunded || 0) || total, origem: p.status === "charged_back" ? "contestacao" : "mercadopago" };
  const parcial = Number(p.transaction_amount_refunded || 0);
  return parcial > 0 ? { valor: parcial, origem: "mercadopago" } : null;
}
async function estornoDoPagamento(p) {
  const d = devolvidoNoPagamento(p);
  if (!d || !p.id) return null;
  return rpc("registrar_estorno", { p_gateway_id: String(p.id), p_total: d.valor, p_origem: d.origem });
}
async function estornar(compraId) {
  const e = await rpc("estorno_para_fazer", { p_compra: compraId });
  if (!e || !e.id) return json(404, { erro: "Compra não encontrada." });
  const falta = Math.round((Number(e.pedido || 0) - Number(e.estornado || 0)) * 100) / 100;
  if (falta <= 0 || e.situacao !== "paga") return json(409, { erro: "Não há estorno pedido para esta compra.", situacao: e.situacao });
  if (!/^\d+$/.test(String(e.gateway_id || ""))) return json(409, { erro: "A compra não tem o pagamento do Mercado Pago." });
  await mp(`/v1/payments/${encodeURIComponent(e.gateway_id)}/refunds`, {
    method: "POST", headers: { "X-Idempotency-Key": `estorno-${e.id}-${e.pedido}` }, body: JSON.stringify({ amount: falta }),
  });
  const situacao = await rpc("registrar_estorno", { p_gateway_id: String(e.gateway_id), p_total: Number(e.pedido), p_origem: "admin" });
  return json(200, { situacao });
}
async function conferirComOMercadoPago() {
  const lista = (await rpc("compras_para_conferir", {})) || [];
  let conferidas = 0, estornos = 0, erros = 0;
  for (const x of lista) {
    try {
      const p = await mp(`/v1/payments/${encodeURIComponent(x.gateway_id)}`);
      conferidas += 1;
      const r = await estornoDoPagamento(p);
      if (r === "estornada" || r === "parcial") estornos += 1;
    } catch { erros += 1; }
  }
  return json(200, { conferidas, estornos, erros });
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
  if (!id) return json(200, { ok: true, ignorado: true });
  if (tipo === "subscription_preapproval") {
    const a = await mp(`/preapproval/${encodeURIComponent(id)}`);
    if (!UUID.test(String(a.external_reference || ""))) return json(200, { ok: true, ignorado: true });
    return json(200, { ok: true, situacao: await rpc("registrar_cobranca_automatica", { p_cobranca: a.external_reference, p_gateway_id: String(a.id || id), p_status: String(a.status || "") }) });
  }
  if (tipo === "subscription_authorized_payment") {
    const f = await mp(`/authorized_payments/${encodeURIComponent(id)}`);
    const a = await mp(`/preapproval/${encodeURIComponent(f.preapproval_id || "")}`);
    if (!UUID.test(String(a.external_reference || ""))) return json(200, { ok: true, ignorado: true });
    return json(200, { ok: true, situacao: await cobrancaDaAssinatura(a.external_reference, f) });
  }
  if (tipo !== "payment") return json(200, { ok: true, ignorado: true });
  const p = await mp(`/v1/payments/${encodeURIComponent(id)}`);
  if (!p.external_reference) return json(200, { ok: true, ignorado: true });
  const situacao = await confirmar(p.external_reference, p);
  const estorno = await estornoDoPagamento(p);
  if (estorno) return json(200, { ok: true, situacao, estorno });
  // A cobrança da renovação automática chega também como "payment".
  if (situacao === "nao_achou" && UUID.test(String(p.external_reference))) {
    return json(200, { ok: true, situacao: await cobrancaDaAssinatura(p.external_reference, { transaction_amount: p.transaction_amount, payment: { id: p.id, status: p.status } }) });
  }
  return json(200, { ok: true, situacao });
}

// ---------- a renovação automática (regra 314) ----------
// Como o Spotify e a Netflix: autoriza uma vez e o Mercado Pago cobra sozinho
// todo mês (ou todo ano). O valor, o período e o dia da primeira cobrança vêm
// do banco, nunca do navegador. Com o plano já pago (ou no mês grátis), a
// primeira cobrança é no fim do prazo de agora.
const UUID = /^[0-9a-f-]{36}$/i;
const comecaDe = (a) => (a.comeca_em && Date.parse(a.comeca_em) > Date.now() + 10 * 60 * 1000 ? new Date(a.comeca_em).toISOString() : null);

// Uma cobrança da assinatura (uma "fatura" do Mercado Pago), uma vez só pelo
// id do pagamento. A que a academia já não queria (cancelou antes de o Mercado
// Pago saber) é devolvida na hora.
async function cobrancaDaAssinatura(cobranca, fatura) {
  const pg = fatura.payment || {};
  if (!pg.id) return "aberta";
  const situacao = await rpc("pagamento_automatico", {
    p_cobranca: cobranca, p_pagamento: String(pg.id), p_valor: Number(fatura.transaction_amount || pg.transaction_amount || 0), p_situacao: String(pg.status || ""),
  });
  if (situacao === "nao_quer") {
    await mp(`/v1/payments/${encodeURIComponent(pg.id)}/refunds`, { method: "POST", headers: { "X-Idempotency-Key": `devolver-${pg.id}` }, body: "{}" });
    return "devolvida";
  }
  return situacao;
}

async function sincronizar(academia) {
  const lista = (await rpc("cobrancas_para_sincronizar", { p_academia: academia })) || [];
  for (const x of lista) {
    try {
      const a = await mp(`/preapproval/${encodeURIComponent(x.gateway_id)}`, { method: "PUT", body: JSON.stringify({ status: x.status }) });
      await rpc("registrar_cobranca_automatica", { p_cobranca: x.id, p_gateway_id: x.gateway_id, p_status: String(a.status || x.status) });
    } catch (e) {
      console.error("sincronizar:", e && e.message);
    }
  }
  return lista.length;
}

async function assinar(req, cobrancaId, corpo) {
  const a = await rpc("cobranca_automatica_para_assinar", { p_cobranca: cobrancaId });
  if (!a || !a.id) return json(404, { erro: "Assinatura não encontrada." });
  if (a.desejada !== "ativa" || a.situacao !== "aguardando" || a.gateway_id) return json(409, { erro: "Essa assinatura já foi ligada ou cancelada.", situacao: a.situacao });
  const comeca = comecaDe(a);
  if (corpo.previa) return json(200, { forma: a.forma, valor: a.valor, email: a.nota_email || a.email || "", comeca_em: comeca });
  const cartao = corpo.cartao || null;
  if (a.forma === "cartao" && (!cartao || !cartao.token)) return json(400, { erro: "Faltam os dados do cartão." });
  const email = (cartao && cartao.payer && cartao.payer.email) || a.nota_email || a.email || "";
  const pedido = {
    reason: descricaoDe({ tipo: "plano", ...a }), external_reference: a.id, payer_email: email,
    back_url: `${origemDe(req)}/parceiros/plano?automatica=${a.id}`,
    auto_recurring: { frequency: a.periodo === "anual" ? 12 : 1, frequency_type: "months", transaction_amount: a.valor, currency_id: "BRL", ...(comeca ? { start_date: comeca } : {}) },
    ...(a.forma === "cartao" ? { card_token_id: cartao.token, status: "authorized" } : { status: "pending" }),
  };
  let p;
  try {
    p = await mp("/preapproval", { method: "POST", headers: { "X-Idempotency-Key": `assinatura-${a.id}-${String((cartao && cartao.token) || "pix").slice(0, 40)}` }, body: JSON.stringify(pedido) });
  } catch (e) {
    // O cartão que não passou na validação do Mercado Pago (400): a tela pede outro.
    if (a.forma === "cartao" && e.status >= 400 && e.status < 500) return json(200, { situacao: "recusada", detalhe: String(e.message || "").slice(0, 200) });
    throw e;
  }
  const situacao = await rpc("registrar_cobranca_automatica", {
    p_cobranca: a.id, p_gateway_id: String(p.id || ""), p_status: String(p.status || ""),
    p_bandeira: (cartao && cartao.payment_method_id) || "", p_final: (cartao && cartao.final) || "",
  });
  if (a.forma === "pix") return json(200, { forma: "pix", link: p.init_point || "" });
  return json(200, { forma: "cartao", situacao, cobraAgora: !comeca, comeca_em: comeca });
}

async function acompanhar(cobrancaId) {
  const a = await rpc("cobranca_automatica_para_assinar", { p_cobranca: cobrancaId });
  if (!a || !a.id) return json(404, { erro: "Assinatura não encontrada." });
  if (!a.gateway_id) return json(200, { situacao: a.situacao, paga: false });
  await sincronizar(a.academia_id);
  const pre = await mp(`/preapproval/${encodeURIComponent(a.gateway_id)}`);
  const situacao = await rpc("registrar_cobranca_automatica", { p_cobranca: a.id, p_gateway_id: a.gateway_id, p_status: String(pre.status || "") });
  const busca = await mp(`/authorized_payments/search?preapproval_id=${encodeURIComponent(a.gateway_id)}`);
  let paga = false;
  for (const f of (busca && busca.results) || []) {
    if ((await cobrancaDaAssinatura(a.id, f)) === "paga") paga = true;
  }
  return json(200, { situacao, paga });
}

async function trocarCartao(cobrancaId, cartao) {
  const a = await rpc("cobranca_automatica_para_assinar", { p_cobranca: cobrancaId });
  if (!a || !a.id || !a.gateway_id || a.forma !== "cartao") return json(404, { erro: "Assinatura não encontrada." });
  if (!cartao || !cartao.token) return json(400, { erro: "Faltam os dados do cartão." });
  try {
    await mp(`/preapproval/${encodeURIComponent(a.gateway_id)}`, { method: "PUT", body: JSON.stringify({ card_token_id: cartao.token }) });
  } catch (e) {
    if (e.status >= 400 && e.status < 500) return json(200, { situacao: "recusada", detalhe: String(e.message || "").slice(0, 200) });
    throw e;
  }
  await rpc("registrar_cobranca_automatica", { p_cobranca: a.id, p_gateway_id: a.gateway_id, p_status: a.situacao === "pausada" ? "paused" : "authorized", p_bandeira: cartao.payment_method_id || "", p_final: cartao.final || "" });
  return json(200, { situacao: "trocado" });
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { erro: "Use POST." });
  if (!env("MERCADOPAGO_ACCESS_TOKEN") || !env("SUPABASE_URL") || !env("SUPABASE_SERVICE_ROLE_KEY")) {
    return json(503, { erro: "desligado" });
  }
  try {
    if (new URL(req.url).searchParams.get("mp") === "1") {
      const resposta = await avisoDoMercadoPago(req);
      await andarComANota();
      return resposta;
    }
    let corpo = {};
    try { corpo = await req.json(); } catch { return json(400, { erro: "Corpo inválido." }); }
    if (corpo.acao === "conferir") return await conferirComOMercadoPago();
    if (["assinar", "automatica", "trocar_cartao"].includes(corpo.acao)) {
      if (!UUID.test(String(corpo.cobranca || ""))) return json(400, { erro: "Falta a assinatura." });
      if (corpo.acao === "assinar") return await assinar(req, corpo.cobranca, corpo);
      if (corpo.acao === "automatica") return await acompanhar(corpo.cobranca);
      return await trocarCartao(corpo.cobranca, corpo.cartao);
    }
    if (!/^[0-9a-f-]{36}$/i.test(String(corpo.compra || ""))) return json(400, { erro: "Falta a compra." });
    if (corpo.acao === "cobrar") return await cobrar(req, corpo.compra, corpo.noSite === true);
    if (corpo.acao === "cartao") return await cartaoNoSite(req, corpo.compra, corpo.cartao);
    if (corpo.acao === "consultar") return await consultar(corpo.compra);
    if (corpo.acao === "estornar") {
      const resposta = await estornar(corpo.compra);
      await andarComANota();
      return resposta;
    }
    return json(400, { erro: "Ação inválida." });
  } catch (e) {
    console.error("pagamento:", e && e.message);
    // O motivo técnico (sem chave nem senha: só o status e a mensagem do banco ou
    // do Mercado Pago) vai junto, para o site de teste e as Falhas do admin.
    return json(502, { erro: "Não consegui falar com o Mercado Pago agora.", detalhe: String((e && e.message) || "").slice(0, 240) });
  }
};
