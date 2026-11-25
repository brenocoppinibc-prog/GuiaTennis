// Nota fiscal automática (regra 331, 25/11/2026: "não, já quero fazer agora").
// A cada compra paga, a NFS-e de São Paulo (NFS-e Paulistana) sai sozinha
// pelo web service da Prefeitura, assinada com o e-CNPJ A1 do GuiaTennis,
// como na Shopify e na Hotmart. Segue o "Manual de Utilização do Web Service"
// da Prefeitura (versão 3.4.1, novembro de 2026) e os schemas do leiaute 1:
// empresa do Simples Nacional ainda usa o leiaute 1 (erro 641 do manual: "Deverá
// ser utilizado o leiaute 1"); o leiaute 2 (IBS e CBS) fica para quando a
// Prefeitura mudar a data (erro 632).
//
//   POST { acao: "certificado", pfx, senha }  o admin envia o A1 (.pfx em
//                                             base64 e a senha): confere o
//                                             CNPJ e a validade e guarda a
//                                             chave e o certificado no cofre.
//   POST { acao: "testar", compra? }           o "Testar com a Prefeitura":
//                                             TesteEnvioLoteRPS confere tudo e
//                                             não emite nada.
//   POST { acao: "emitir", compra }            "Emitir a nota" / "Emitir de
//                                             novo" de uma compra paga.
//   POST { acao: "processar" }                 a fila inteira (emitir e
//                                             cancelar).
// Todas só para o admin (o token da sessão dele, conferido no Supabase). O
// pagamento (pagamento.mjs) e o relógio (nota-fiscal-relogio.mjs) chamam
// processarFila() direto.
//
// Ambiente "teste" (o começo, nos dois bancos): a Prefeitura só confere
// (TesteEnvioLoteRPS) e a nota fica "testada". "producao": EnvioRPS emite de
// verdade, com o RPS reservado no banco (mandar de novo nunca vira outra nota).
//
// Variáveis: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (as mesmas do pagamento).
// O certificado não fica em variável da Netlify (o limite das funções é 4 KB):
// fica cifrado no cofre do banco.

import forge from "node-forge";
import { createHash, sign as assinarRSA } from "node:crypto";
import { request as pedidoHttps } from "node:https";

export const CNPJ_DO_GUIA = "70120796000100";
export const ADMIN = "guiatennis1@gmail.com";
export const WEB_SERVICE = "https://nfews.prefeitura.sp.gov.br/lotenfe.asmx";
const NS = "http://www.prefeitura.sp.gov.br/nfe";
const DS = "http://www.w3.org/2000/09/xmldsig#";
const C14N = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
const SOAP_ACAO = {
  EnvioRPS: "envioRPS",
  TesteEnvioLoteRPS: "testeenvio",
  CancelamentoNFe: "cancelamentoNFe",
};

const env = (nome) => (globalThis.Netlify?.env?.get(nome) ?? process.env[nome] ?? "").trim();
const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function rpc(nome, args = {}) {
  const url = env("SUPABASE_URL"), chave = env("SUPABASE_SERVICE_ROLE_KEY");
  const r = await fetch(`${url}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { apikey: chave, ...(chave.startsWith("eyJ") ? { Authorization: `Bearer ${chave}` } : {}), "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`banco ${nome}: ${r.status} ${(await r.text().catch(() => "")).slice(0, 160)}`.trim());
  const texto = await r.text();
  return texto ? JSON.parse(texto) : null;
}

// ---------- XML no formato canônico (C14N) ----------
// O XML é montado já na forma canônica (sem declaração, sem espaço entre as
// tags, sem tag vazia, atributos na ordem): o resumo (digest) da assinatura é
// calculado sobre o mesmo texto que vai para a Prefeitura.
// O texto limpo (só o que o leiaute aceita: sem emoji nem controle), cortado no
// tamanho máximo antes de escapar (o corte nunca parte um "&amp;").
export function textoXml(v, max = 2000) {
  return String(v ?? "")
    .replace(/[^ -~ -ÿ]/g, " ")
    .replace(/\s+/g, " ").trim().slice(0, max).trim()
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const el = (nome, conteudo) => (conteudo === "" || conteudo == null ? "" : `<${nome}>${conteudo}</${nome}>`);
const so = (v) => String(v ?? "").replace(/\D/g, "");

// Valor no formato do tpValor: "100", "100.5" ou "100.50" (nada de zero à esquerda).
export function valorXml(v) {
  const n = Math.round(Number(v) * 100) / 100;
  if (!Number.isFinite(n) || n < 0) throw new Error("valor inválido");
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}
const centavos = (v, tam) => String(Math.round(Number(v) * 100)).padStart(tam, "0");

// ---------- As duas "assinaturas adicionais" do manual ----------
// RPS, leiaute 1 (item 4.3.2, 86 posições): inscrição municipal (8), série (5,
// espaços à direita), número do RPS (12), data AAAAMMDD, tributação (1),
// situação (1), ISS retido S/N, valor dos serviços em centavos (15), deduções
// (15), código do serviço (5), indicador do tomador (1: CPF, 2: CNPJ, 3: sem) e
// CPF/CNPJ do tomador (14). Sem intermediário, nada depois.
export function textoDaAssinaturaDoRPS(r) {
  const doc = so(r.tomador);
  const ind = doc.length === 11 ? "1" : doc.length === 14 ? "2" : "3";
  const s = so(r.ccm).padStart(8, "0").slice(-8)
    + String(r.serie).padEnd(5, " ").slice(0, 5)
    + String(r.numero).padStart(12, "0")
    + String(r.data).replace(/-/g, "")
    + r.tributacao + r.status + (r.issRetido ? "S" : "N")
    + centavos(r.valor, 15) + centavos(r.deducoes || 0, 15)
    + so(r.codigo).padStart(5, "0")
    + ind + (ind === "3" ? "".padStart(14, "0") : doc.padStart(14, "0"));
  if (s.length !== 86) throw new Error(`assinatura do RPS com ${s.length} posições`);
  return s;
}
// Cancelamento (item 4.3.10, 20 posições): inscrição municipal (8) e número da NF-e (12).
export function textoDaAssinaturaDoCancelamento(ccm, numeroNFe) {
  return so(ccm).padStart(8, "0").slice(-8) + String(numeroNFe).padStart(12, "0");
}
export const assinarTexto = (texto, chavePem) => assinarRSA("sha1", Buffer.from(texto, "ascii"), chavePem).toString("base64");

// ---------- O certificado A1 ----------
// O .pfx do e-CNPJ: a chave e o certificado do titular (o que tem a chave
// pública igual à da chave privada), o CNPJ (no nome do titular, depois dos
// dois-pontos, como no ICP-Brasil, ou na extensão 2.16.76.1.3.3) e a validade.
export function lerCertificado(pfxBase64, senha) {
  let p12;
  try {
    const der = forge.util.decode64(String(pfxBase64 || "").replace(/^data:[^,]*,/, ""));
    p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(der), String(senha ?? ""));
  } catch (e) {
    const msg = String((e && e.message) || "");
    throw new Error(/mac|password|invalid|decrypt/i.test(msg) ? "A senha do certificado não confere." : "Esse arquivo não é um certificado A1 (.pfx ou .p12).");
  }
  const bags = (tipo) => p12.getBags({ bagType: tipo })[tipo] || [];
  const chaves = [...bags(forge.pki.oids.pkcs8ShroudedKeyBag), ...bags(forge.pki.oids.keyBag)].map(b => b.key).filter(Boolean);
  const certs = bags(forge.pki.oids.certBag).map(b => b.cert).filter(Boolean);
  if (!chaves.length || !certs.length) throw new Error("O arquivo não tem a chave e o certificado juntos (exporte o A1 com a chave privada).");
  const chave = chaves[0];
  const cert = certs.find(c => c.publicKey && c.publicKey.n && chave.n && c.publicKey.n.equals(chave.n)) || certs[0];
  const nome = (cert.subject.getField("CN") || {}).value || "";
  let cnpj = (String(nome).match(/:(\d{14})\s*$/) || [])[1] || "";
  if (!cnpj) {
    const asn = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
    cnpj = (asn.match(/\x06\x05\x60\x4c\x01\x03\x03[\s\S]{2,8}?(\d{14})/) || [])[1] || "";
  }
  const derB64 = forge.util.encode64(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes());
  return {
    chavePem: forge.pki.privateKeyToPem(chave),
    certPem: forge.pki.certificateToPem(cert),
    certB64: derB64,
    cnpj,
    titular: String(nome).replace(/:\d{14}\s*$/, "").trim(),
    validoDe: cert.validity.notBefore.toISOString(),
    validoAte: cert.validity.notAfter.toISOString(),
  };
}

// ---------- Assinatura XML (XMLDSig enveloped, RSA-SHA1, C14N) ----------
// Item 3.2.3 do manual. A raiz declara só o namespace padrão (sem xsi e xsd):
// assim a forma canônica do SignedInfo é exatamente o texto abaixo.
export function assinarXml(raiz, corpo, chavePem, certB64) {
  const semAssinatura = `<${raiz} xmlns="${NS}">${corpo}</${raiz}>`;
  const digest = createHash("sha1").update(semAssinatura, "utf8").digest("base64");
  const signedInfo = `<CanonicalizationMethod Algorithm="${C14N}"></CanonicalizationMethod>`
    + `<SignatureMethod Algorithm="${DS}rsa-sha1"></SignatureMethod>`
    + `<Reference URI=""><Transforms><Transform Algorithm="${DS}enveloped-signature"></Transform>`
    + `<Transform Algorithm="${C14N}"></Transform></Transforms>`
    + `<DigestMethod Algorithm="${DS}sha1"></DigestMethod><DigestValue>${digest}</DigestValue></Reference>`;
  const valor = assinarRSA("sha1", Buffer.from(`<SignedInfo xmlns="${DS}">${signedInfo}</SignedInfo>`, "utf8"), chavePem).toString("base64");
  return `<${raiz} xmlns="${NS}">${corpo}<Signature xmlns="${DS}"><SignedInfo>${signedInfo}</SignedInfo>`
    + `<SignatureValue>${valor}</SignatureValue><KeyInfo><X509Data><X509Certificate>${certB64}</X509Certificate></X509Data></KeyInfo></Signature></${raiz}>`;
}

// ---------- O RPS (leiaute 1) ----------
const NOMES_DOS_PLANOS = { basico: "Básico", completo: "Completo", premium: "Premium" };
export function discriminacao(d) {
  const quem = d.academia ? ` da academia ${d.academia}` : "";
  const detalhe = d.tipo === "plano"
    ? `Plano ${NOMES_DOS_PLANOS[d.plano] || d.plano || ""} ${d.periodo === "anual" ? "anual" : "mensal"}${quem} no GuiaTennis.`
    : `Créditos para anúncios e promoções${quem} no GuiaTennis.`;
  return `${d.descricao} ${detalhe}`.replace(/\s+/g, " ").trim().slice(0, 2000);
}
export function rpsXml(d, chavePem) {
  const doc = so(d.tomador && d.tomador.documento);
  const r = {
    ccm: d.ccm, serie: d.serie, numero: d.numero_rps, data: d.data, tributacao: "T", status: "N", issRetido: false,
    valor: d.valor, deducoes: 0, codigo: d.codigo_servico, tomador: doc,
  };
  const tomador = doc.length === 11 ? `<CPFCNPJTomador><CPF>${doc}</CPF></CPFCNPJTomador>`
    : doc.length === 14 ? `<CPFCNPJTomador><CNPJ>${doc}</CNPJ></CPFCNPJTomador>` : "";
  return `<RPS xmlns="">`
    + el("Assinatura", assinarTexto(textoDaAssinaturaDoRPS(r), chavePem))
    + `<ChaveRPS>${el("InscricaoPrestador", String(Number(so(d.ccm))))}${el("SerieRPS", textoXml(d.serie, 5))}${el("NumeroRPS", String(d.numero_rps))}</ChaveRPS>`
    + el("TipoRPS", "RPS") + el("DataEmissao", d.data) + el("StatusRPS", "N") + el("TributacaoRPS", "T")
    + el("ValorServicos", valorXml(d.valor)) + el("ValorDeducoes", "0")
    + el("CodigoServico", String(Number(so(d.codigo_servico))))
    + el("AliquotaServicos", String(Number(d.aliquota)))
    + el("ISSRetido", "false")
    + tomador
    + el("RazaoSocialTomador", tomador ? textoXml(d.tomador.nome, 75) : "")
    + el("EmailTomador", tomador && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.tomador.email || "")) && String(d.tomador.email).length <= 75 ? textoXml(d.tomador.email, 75) : "")
    + el("Discriminacao", textoXml(discriminacao(d)))
    + el("RetencaoPisCofins", "0")
    + `</RPS>`;
}
const cabecalho = (extra = "") => `<Cabecalho xmlns="" Versao="1"><CPFCNPJRemetente><CNPJ>${CNPJ_DO_GUIA}</CNPJ></CPFCNPJRemetente>${extra}</Cabecalho>`;
export function pedidoEnvioRPS(d, cert) {
  return assinarXml("PedidoEnvioRPS", cabecalho() + rpsXml(d, cert.chavePem), cert.chavePem, cert.certB64);
}
export function pedidoTesteLote(d, cert) {
  const extra = `<transacao>true</transacao><dtInicio>${d.data}</dtInicio><dtFim>${d.data}</dtFim><QtdRPS>1</QtdRPS>`
    + `<ValorTotalServicos>${valorXml(d.valor)}</ValorTotalServicos><ValorTotalDeducoes>0</ValorTotalDeducoes>`;
  return assinarXml("PedidoEnvioLoteRPS", cabecalho(extra) + rpsXml(d, cert.chavePem), cert.chavePem, cert.certB64);
}
export function pedidoCancelamento(ccm, numeroNFe, cert) {
  const detalhe = `<Detalhe xmlns=""><ChaveNFe><InscricaoPrestador>${Number(so(ccm))}</InscricaoPrestador><NumeroNFe>${numeroNFe}</NumeroNFe></ChaveNFe>`
    + `<AssinaturaCancelamento>${assinarTexto(textoDaAssinaturaDoCancelamento(ccm, numeroNFe), cert.chavePem)}</AssinaturaCancelamento></Detalhe>`;
  return assinarXml("PedidoCancelamentoNFe", cabecalho("<transacao>true</transacao>") + detalhe, cert.chavePem, cert.certB64);
}

// ---------- SOAP (o WSDL da Prefeitura: SOAP 1.1, "<Método>Request") ----------
export function envelope(metodo, xml) {
  const mensagem = xml.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">`
    + `<soap:Body><${metodo}Request xmlns="${NS}"><VersaoSchema>1</VersaoSchema><MensagemXML>${mensagem}</MensagemXML></${metodo}Request></soap:Body></soap:Envelope>`;
}
const desescapar = (t) => String(t || "")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&apos;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&amp;/g, "&");
const tag = (xml, nome) => { const m = String(xml).match(new RegExp(`<${nome}[^>]*>([\\s\\S]*?)</${nome}>`)); return m ? m[1].trim() : ""; };
// O retorno: Sucesso, os erros e alertas (código e descrição) e a chave da NF-e.
export function lerRetorno(soap) {
  const falha = tag(soap, "faultstring");
  if (falha) return { sucesso: false, erros: [{ codigo: "SOAP", descricao: desescapar(falha) }], alertas: [] };
  const xml = desescapar(tag(soap, "RetornoXML")) || String(soap);
  const lista = (nome) => [...xml.matchAll(new RegExp(`<${nome}[^>]*>([\\s\\S]*?)</${nome}>`, "g"))]
    .map(m => ({ codigo: tag(m[1], "Codigo"), descricao: tag(m[1], "Descricao") }));
  return {
    sucesso: /^true$/i.test(tag(xml, "Sucesso")),
    erros: lista("Erro"),
    alertas: lista("Alerta"),
    numero: tag(xml, "NumeroNFe") ? Number(tag(xml, "NumeroNFe")) : null,
    codigo: tag(xml, "CodigoVerificacao") || null,
  };
}
export const resumoDoRetorno = (r) => [...r.erros.map(e => `Erro ${e.codigo}: ${e.descricao}`), ...r.alertas.map(a => `Alerta ${a.codigo}: ${a.descricao}`)].join(" · ");

// A chamada com o certificado (TLS com autenticação mútua). Os testes trocam
// o transporte por um falso.
let transporte = (metodo, corpo, cert) => new Promise((ok, falhou) => {
  const u = new URL(WEB_SERVICE);
  const req = pedidoHttps({
    hostname: u.hostname, path: u.pathname, method: "POST", key: cert.chavePem, cert: cert.certPem, minVersion: "TLSv1.2", timeout: 25000,
    headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: `"${NS}/ws/${SOAP_ACAO[metodo]}"`, "Content-Length": Buffer.byteLength(corpo) },
  }, (res) => {
    let dados = "";
    res.setEncoding("utf8");
    res.on("data", (p) => { dados += p; });
    res.on("end", () => (res.statusCode >= 500 && !/faultstring/.test(dados) ? falhou(new Error(`Prefeitura: HTTP ${res.statusCode}`)) : ok(dados)));
  });
  req.on("timeout", () => req.destroy(new Error("A Prefeitura não respondeu a tempo.")));
  req.on("error", falhou);
  req.end(corpo);
});
export const usarTransporte = (fn) => { transporte = fn; };
export async function chamarPrefeitura(metodo, xml, cert) {
  return lerRetorno(await transporte(metodo, envelope(metodo, xml), cert));
}

// ---------- A fila ----------
async function certificadoGuardado() {
  const s = await rpc("certificado_da_nota");
  if (!s) return null;
  const c = typeof s === "string" ? JSON.parse(s) : s;
  return c && c.chavePem && c.certPem ? c : null;
}
export async function emitir(compra) {
  const d = await rpc("nota_para_emitir", { p_compra: compra });
  if (!d) return { compra, situacao: "nada" };
  const cert = await certificadoGuardado();
  if (!cert) {
    await rpc("registrar_nota", { p_compra: compra, p_situacao: "erro", p_numero_nfe: null, p_codigo: null, p_mensagem: "Falta o certificado A1: envie em Admin › Compras e notas." });
    return { compra, situacao: "erro" };
  }
  try {
    const teste = d.ambiente !== "producao";
    const r = teste ? await chamarPrefeitura("TesteEnvioLoteRPS", pedidoTesteLote(d, cert), cert)
      : await chamarPrefeitura("EnvioRPS", pedidoEnvioRPS(d, cert), cert);
    const situacao = !r.sucesso ? "erro" : teste ? "testada" : (r.numero ? "emitida" : "erro");
    const mensagem = resumoDoRetorno(r) || (teste ? "Conferida pela Prefeitura (teste): sem erros. Nada foi emitido." : r.numero ? "" : "A Prefeitura não devolveu o número da nota.");
    await rpc("registrar_nota", { p_compra: compra, p_situacao: situacao, p_numero_nfe: teste ? null : r.numero, p_codigo: teste ? null : r.codigo, p_mensagem: mensagem });
    return { compra, situacao, mensagem, numero: teste ? null : r.numero };
  } catch (e) {
    const mensagem = `Não consegui falar com a Prefeitura: ${String((e && e.message) || e).slice(0, 200)}`;
    await rpc("registrar_nota", { p_compra: compra, p_situacao: "erro", p_numero_nfe: null, p_codigo: null, p_mensagem: mensagem });
    return { compra, situacao: "erro", mensagem };
  }
}
export async function cancelar(compra) {
  const d = await rpc("nota_para_cancelar", { p_compra: compra });
  if (!d) return { compra, situacao: "nada" };
  const cert = await certificadoGuardado();
  if (!cert) return { compra, situacao: "erro", mensagem: "Falta o certificado A1." };
  try {
    const r = await chamarPrefeitura("CancelamentoNFe", pedidoCancelamento(d.ccm, d.numero_nfe, cert), cert);
    if (r.sucesso) {
      await rpc("registrar_nota", { p_compra: compra, p_situacao: "cancelada", p_numero_nfe: null, p_codigo: null, p_mensagem: "Cancelada na Prefeitura por causa do estorno." });
      return { compra, situacao: "cancelada" };
    }
    return { compra, situacao: "cancelar", mensagem: resumoDoRetorno(r) };
  } catch (e) {
    return { compra, situacao: "cancelar", mensagem: String((e && e.message) || e).slice(0, 200) };
  }
}
export async function processarFila() {
  if (!env("SUPABASE_URL") || !env("SUPABASE_SERVICE_ROLE_KEY")) return [];
  const lista = (await rpc("notas_para_processar")) || [];
  const feitos = [];
  for (const x of lista) feitos.push(x.acao === "cancelar" ? await cancelar(x.compra_id) : await emitir(x.compra_id));
  return feitos;
}

// O "Testar com a Prefeitura" do admin: uma compra (a escolhida ou um exemplo
// de R$ 1) pelo TesteEnvioLoteRPS, sem emitir nada.
async function testar() {
  const cert = await certificadoGuardado();
  if (!cert) return json(409, { erro: "Envie o certificado A1 primeiro." });
  const cfg = (await rpc("nota_configuracao_do_servico")) || {};
  const d = {
    ccm: cfg.ccm, serie: cfg.serie, numero_rps: cfg.proximo_rps || 1, codigo_servico: cfg.codigo_servico, aliquota: cfg.aliquota,
    descricao: cfg.descricao, valor: 1, data: new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10), tipo: "creditos",
    academia: "", tomador: { documento: "", nome: "", email: "" },
  };
  try {
    const r = await chamarPrefeitura("TesteEnvioLoteRPS", pedidoTesteLote(d, cert), cert);
    const resultado = r.sucesso ? `Tudo certo: a Prefeitura aceitou a nota de teste.${r.alertas.length ? " " + resumoDoRetorno(r) : ""}` : resumoDoRetorno(r) || "A Prefeitura recusou, sem dizer o motivo.";
    await rpc("registrar_teste_da_nota", { p_resultado: resultado });
    return json(200, { ok: r.sucesso, resultado, erros: r.erros, alertas: r.alertas });
  } catch (e) {
    const resultado = `Não consegui falar com a Prefeitura: ${String((e && e.message) || e).slice(0, 200)}`;
    await rpc("registrar_teste_da_nota", { p_resultado: resultado });
    return json(200, { ok: false, resultado });
  }
}

// Só o admin: o token da sessão dele, conferido no Supabase.
async function eAdmin(req) {
  const token = String(req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const chave = env("SUPABASE_SERVICE_ROLE_KEY");
  const r = await fetch(`${env("SUPABASE_URL")}/auth/v1/user`, { headers: { apikey: chave, Authorization: `Bearer ${token}` } });
  if (!r.ok) return false;
  const u = await r.json().catch(() => ({}));
  return String(u.email || "").toLowerCase() === ADMIN;
}

const UUID = /^[0-9a-f-]{36}$/i;
export default async (req) => {
  if (req.method !== "POST") return json(405, { erro: "Use POST." });
  if (!env("SUPABASE_URL") || !env("SUPABASE_SERVICE_ROLE_KEY")) return json(503, { erro: "desligado" });
  let corpo = {};
  try { corpo = await req.json(); } catch { return json(400, { erro: "Corpo inválido." }); }
  try {
    if (!(await eAdmin(req))) return json(403, { erro: "Só o GuiaTennis." });
    if (corpo.acao === "certificado") {
      if (String(corpo.pfx || "").length > 60000) return json(400, { erro: "Arquivo grande demais para um certificado A1." });
      let c;
      try { c = lerCertificado(corpo.pfx, corpo.senha); } catch (e) { return json(400, { erro: e.message }); }
      if (c.cnpj !== CNPJ_DO_GUIA) return json(400, { erro: `Esse certificado é do CNPJ ${c.cnpj || "(não encontrado)"}, não do GuiaTennis (70.120.796/0001-00).` });
      if (new Date(c.validoAte) < new Date()) return json(400, { erro: "Esse certificado já venceu." });
      await rpc("guardar_certificado_da_nota", {
        p_segredo: JSON.stringify({ chavePem: c.chavePem, certPem: c.certPem, certB64: c.certB64 }),
        p_cnpj: c.cnpj, p_titular: c.titular, p_valido_ate: c.validoAte,
      });
      return json(200, { ok: true, cnpj: c.cnpj, titular: c.titular, valido_ate: c.validoAte });
    }
    if (corpo.acao === "testar") return await testar();
    if (corpo.acao === "emitir") {
      if (!UUID.test(String(corpo.compra || ""))) return json(400, { erro: "Falta a compra." });
      return json(200, await emitir(corpo.compra));
    }
    if (corpo.acao === "processar") return json(200, { feitos: await processarFila() });
    return json(400, { erro: "Ação inválida." });
  } catch (e) {
    console.error("nota-fiscal:", e && e.message);
    return json(502, { erro: "Não consegui processar a nota agora.", detalhe: String((e && e.message) || "").slice(0, 240) });
  }
};
