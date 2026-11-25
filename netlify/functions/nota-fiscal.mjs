// Nota fiscal automática (regra 331, 25/11/2026: "não, já quero fazer agora";
// regra 333: pela NFS-e Nacional). A cada compra paga, a NFS-e sai sozinha,
// assinada com o e-CNPJ A1 do GuiaTennis, como na Shopify e na Hotmart.
//
// Regra 333 (25/11/2026): o primeiro "Testar com a Prefeitura" conectou, mas a
// Prefeitura de São Paulo respondeu "Erro 1647: Consta na base de dados que o
// contribuinte está cadastrado no CNC - Cadastro Nacional de Contribuintes.
// Assim, deve emitir nota no ambiente nacional para fatos geradores a partir de
// 17/11/2026". Empresa aberta em novembro de 2026: a nota sai pelo Sistema
// Nacional NFS-e (Sefin Nacional, da Receita), não mais pelo web service da
// Prefeitura. Segue o manual da API do contribuinte (v1.2) e os esquemas e as
// regras do leiaute 1.01 (Anexo I, 09/02/2026; Anexo II, eventos):
//   - a DPS (Declaração de Prestação de Serviço) em XML assinado (XMLDSig na
//     infDPS, sem prefixo de namespace), compactada (GZip) em base64 dentro de
//     um JSON, por POST /nfse com o certificado na conexão (TLS mútuo);
//   - a resposta devolve a chave de acesso (50 números) e a NFS-e em XML;
//   - o cancelamento (estorno) é o evento 101101, por POST /nfse/{chave}/eventos.
// Simples Nacional ME/EPP apurando pelo SN, sem retenção: sem alíquota na DPS
// (o sistema usa a do município, regra E0625) e o total aproximado dos
// tributos em pTotTribSN; IBS e CBS só a partir de 2027 para o Simples.
//
//   POST { acao: "certificado", pfx, senha }  o admin envia o A1 (.pfx em
//                                             base64 e a senha): confere o
//                                             CNPJ e a validade e guarda a
//                                             chave e o certificado no cofre.
//   POST { acao: "testar" }                    o "Testar a emissão": uma nota de
//                                             R$ 1 na produção restrita (o
//                                             ambiente de testes oficial, sem
//                                             valor fiscal).
//   POST { acao: "emitir", compra }            "Emitir a nota" / "Emitir de
//                                             novo" de uma compra paga.
//   POST { acao: "processar" }                 a fila inteira (emitir e
//                                             cancelar).
// Todas só para o admin (o token da sessão dele, conferido no Supabase). O
// pagamento (pagamento.mjs) e o relógio (nota-fiscal-relogio.mjs) chamam
// processarFila() direto.
//
// Ambiente "teste" (o começo, nos dois bancos): a nota vai para a produção
// restrita e fica "testada" (sem valor fiscal). "producao": emite de verdade,
// com o número da DPS reservado no banco (mandar de novo nunca vira outra nota:
// a Sefin recusa a DPS repetida).
//
// Variáveis: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (as mesmas do pagamento).
// O certificado não fica em variável da Netlify (o limite das funções é 4 KB):
// fica cifrado no cofre do banco.

import forge from "node-forge";
import { createHash, sign as assinarRSA } from "node:crypto";
import { request as pedidoHttps } from "node:https";
import { gzipSync, gunzipSync } from "node:zlib";

export const CNPJ_DO_GUIA = "70120796000100";
export const ADMIN = "guiatennis1@gmail.com";
export const SEFIN = {
  producao: "https://sefin.nfse.gov.br/SefinNacional",
  teste: "https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional",
};
export const MUNICIPIO_SP = "3550308"; // código IBGE de São Paulo (cLocEmi e local da prestação)
const VERSAO = "1.01";
const VER_APLIC = "GuiaTennis-333";
const NS = "http://www.sped.fazenda.gov.br/nfse";
const DS = "http://www.w3.org/2000/09/xmldsig#";
const C14N = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";

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

// ---------- Assinatura XML (XMLDSig enveloped, C14N, sem prefixo) ----------
// A referência é o elemento com o Id (infDPS ou infPedReg). Na forma canônica
// de um pedaço do documento, o namespace herdado da raiz aparece no próprio
// elemento: o resumo é calculado sobre <infDPS xmlns="…" Id="…">…</infDPS>,
// exatamente o que a Sefin recalcula. RSA-SHA1 como na NF-e; se a Sefin recusar
// a assinatura (E0714), a emissão tenta de novo com RSA-SHA256.
const ALGORITMOS = {
  sha1: { assinatura: `${DS}rsa-sha1`, resumo: `${DS}sha1` },
  sha256: { assinatura: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256", resumo: "http://www.w3.org/2001/04/xmlenc#sha256" },
};
export function assinarXml(raiz, atributosDaRaiz, inf, id, corpo, chavePem, certB64, alg = "sha1") {
  const a = ALGORITMOS[alg] || ALGORITMOS.sha1;
  const digest = createHash(alg).update(`<${inf} xmlns="${NS}" Id="${id}">${corpo}</${inf}>`, "utf8").digest("base64");
  const signedInfo = `<CanonicalizationMethod Algorithm="${C14N}"></CanonicalizationMethod>`
    + `<SignatureMethod Algorithm="${a.assinatura}"></SignatureMethod>`
    + `<Reference URI="#${id}"><Transforms><Transform Algorithm="${DS}enveloped-signature"></Transform>`
    + `<Transform Algorithm="${C14N}"></Transform></Transforms>`
    + `<DigestMethod Algorithm="${a.resumo}"></DigestMethod><DigestValue>${digest}</DigestValue></Reference>`;
  const valor = assinarRSA(alg, Buffer.from(`<SignedInfo xmlns="${DS}">${signedInfo}</SignedInfo>`, "utf8"), chavePem).toString("base64");
  return `<?xml version="1.0" encoding="UTF-8"?><${raiz} xmlns="${NS}" ${atributosDaRaiz}><${inf} Id="${id}">${corpo}</${inf}>`
    + `<Signature xmlns="${DS}"><SignedInfo>${signedInfo}</SignedInfo><SignatureValue>${valor}</SignatureValue>`
    + `<KeyInfo><X509Data><X509Certificate>${certB64}</X509Certificate></X509Data></KeyInfo></Signature></${raiz}>`;
}

// ---------- A DPS (leiaute 1.01) ----------
const NOMES_DOS_PLANOS = { basico: "Básico", completo: "Completo", premium: "Premium" };
export function discriminacao(d) {
  const quem = d.academia ? ` da academia ${d.academia}` : "";
  const detalhe = d.tipo === "plano"
    ? `Plano ${NOMES_DOS_PLANOS[d.plano] || d.plano || ""} ${d.periodo === "anual" ? "anual" : "mensal"}${quem} no GuiaTennis.`
    : `Créditos para anúncios e promoções${quem} no GuiaTennis.`;
  return `${d.descricao} ${detalhe}`.replace(/\s+/g, " ").trim().slice(0, 1000);
}
// Data e hora de Brasília no formato da DPS (AAAA-MM-DDThh:mm:ss-03:00). Um
// minuto para trás: a DPS não pode chegar "do futuro" (E0008).
export function agoraEmBrasilia(ms = Date.now()) {
  return new Date(ms - 60e3 - 3 * 3600e3).toISOString().slice(0, 19) + "-03:00";
}
// Id da DPS (45): "DPS" + município (7) + tipo de inscrição (2 = CNPJ) + CNPJ
// (14) + série (5) + número (15).
export function idDaDps(serie, numero) {
  return "DPS" + MUNICIPIO_SP + "2" + CNPJ_DO_GUIA + String(Number(so(serie)) || 1).padStart(5, "0") + String(numero).padStart(15, "0");
}
// O total aproximado dos tributos do Simples (Lei 12.741): a alíquota do ISS é
// 33,5% da do Simples na primeira faixa do Anexo III (2,01% de 6%).
export const percentualDoSimples = (aliquotaIss) => valorXml(Math.min(99, Number(aliquotaIss || 0.0201) * 100 / 0.335));
// O leiaute da reforma tributária (RTC, Nota Técnica 009): o campo finNFSe
// ("0 - NFS-e regular") logo depois do tpEmit. A produção restrita já usa esse
// leiaute (25/11/2026: "E1235 … has invalid child element 'cLocEmi' … expected:
// 'cMotivoEmisTI, finNFSe'"); a produção passa a usar quando a Receita publicar
// o cronograma. Por isso o finNFSe vai no Teste e não na Produção, e a emissão
// troca sozinha se a Sefin reclamar do campo (mandarDps).
export const LEIAUTE_RTC = { teste: true, producao: false };
export function dpsXml(d, cert, { comIM = true, alg = "sha1", numero, dhEmi = agoraEmBrasilia(), rtc = LEIAUTE_RTC[d.ambiente === "producao" ? "producao" : "teste"] } = {}) {
  const nDps = String(numero ?? d.numero_rps);
  if (!/^[1-9][0-9]{0,14}$/.test(nDps)) throw new Error("número da DPS inválido");
  const serie = String(Number(so(d.serie)) || 1);
  if (Number(serie) > 49999) throw new Error("A série da DPS vai de 1 a 49999 (emissão por aplicativo próprio).");
  const id = idDaDps(serie, nDps);
  const doc = so(d.tomador && d.tomador.documento);
  const email = String((d.tomador && d.tomador.email) || "").trim();
  const nomeDoTomador = textoXml((d.tomador && d.tomador.nome) || d.academia || "", 300);
  const toma = (doc.length === 11 || doc.length === 14) && nomeDoTomador
    ? `<toma>${doc.length === 14 ? `<CNPJ>${doc}</CNPJ>` : `<CPF>${doc}</CPF>`}<xNome>${nomeDoTomador}</xNome>`
      + (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 80 ? `<email>${textoXml(email, 80)}</email>` : "") + `</toma>`
    : "";
  const im = comIM && so(d.ccm) ? `<IM>${so(d.ccm)}</IM>` : "";
  const corpo = el("tpAmb", d.ambiente === "producao" ? "1" : "2") + el("dhEmi", dhEmi) + el("verAplic", VER_APLIC)
    + el("serie", serie) + el("nDPS", nDps) + el("dCompet", d.data) + el("tpEmit", "1") + (rtc ? el("finNFSe", "0") : "") + el("cLocEmi", MUNICIPIO_SP)
    + `<prest><CNPJ>${CNPJ_DO_GUIA}</CNPJ>${im}<regTrib><opSimpNac>3</opSimpNac><regApTribSN>1</regApTribSN><regEspTrib>0</regEspTrib></regTrib></prest>`
    + toma
    + `<serv><locPrest><cLocPrestacao>${MUNICIPIO_SP}</cLocPrestacao></locPrest>`
    + `<cServ><cTribNac>${so(d.codigo_servico).padStart(6, "0").slice(-6)}</cTribNac><xDescServ>${textoXml(discriminacao(d), 1000)}</xDescServ></cServ></serv>`
    + `<valores><vServPrest><vServ>${valorXml(d.valor)}</vServ></vServPrest>`
    + `<trib><tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>1</tpRetISSQN></tribMun>`
    + `<totTrib><pTotTribSN>${percentualDoSimples(d.aliquota)}</pTotTribSN></totTrib></trib></valores>`;
  return { id, xml: assinarXml("DPS", `versao="${VERSAO}"`, "infDPS", id, corpo, cert.chavePem, cert.certB64, alg) };
}

// ---------- O cancelamento (evento 101101) ----------
export function pedidoDeCancelamento(chave, ambiente, cert, { alg = "sha1", dhEvento = agoraEmBrasilia() } = {}) {
  if (!/^[0-9]{50}$/.test(String(chave))) throw new Error("chave de acesso inválida");
  const id = `PRE${chave}101101`;
  const corpo = el("tpAmb", ambiente === "producao" ? "1" : "2") + el("verAplic", VER_APLIC) + el("dhEvento", dhEvento)
    + `<CNPJAutor>${CNPJ_DO_GUIA}</CNPJAutor><chNFSe>${chave}</chNFSe>`
    + `<e101101><xDesc>Cancelamento de NFS-e</xDesc><cMotivo>9</cMotivo><xMotivo>Compra estornada: o valor foi devolvido ao cliente.</xMotivo></e101101>`;
  return assinarXml("pedRegEvento", `versao="${VERSAO}"`, "infPedReg", id, corpo, cert.chavePem, cert.certB64, alg);
}

// ---------- A mensagem (JSON com o XML compactado) e a resposta ----------
export const compactar = (xml) => gzipSync(Buffer.from(xml, "utf8")).toString("base64");
export const descompactar = (b64) => gunzipSync(Buffer.from(String(b64 || ""), "base64")).toString("utf8");
const campo = (o, nome) => {
  if (!o || typeof o !== "object") return undefined;
  const k = Object.keys(o).find(x => x.toLowerCase() === nome.toLowerCase());
  return k ? o[k] : undefined;
};
const tag = (xml, nome) => { const m = String(xml).match(new RegExp(`<${nome}[^>]*>([\\s\\S]*?)</${nome}>`)); return m ? m[1].trim() : ""; };
const mensagens = (v) => (Array.isArray(v) ? v : v ? [v] : []).map(e => ({
  codigo: String(campo(e, "codigo") ?? campo(e, "cod") ?? "").trim(),
  descricao: [campo(e, "descricao") ?? campo(e, "mensagem") ?? "", campo(e, "complemento") ?? ""].map(t => String(t || "").trim()).filter(Boolean).join(" "),
})).filter(e => e.codigo || e.descricao);
// A resposta da Sefin: 201 com a chave de acesso e a NFS-e (ou o evento); 4xx
// com a lista de erros (código e descrição).
export function lerResposta({ status, corpo }) {
  let j = corpo;
  if (typeof j === "string") { try { j = JSON.parse(j); } catch { j = { erros: [{ codigo: `HTTP ${status}`, descricao: String(corpo).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) }] }; } }
  const erros = mensagens(campo(j, "erros") ?? campo(j, "erro"));
  const alertas = mensagens(campo(j, "alertas"));
  const chave = String(campo(j, "chaveAcesso") || "");
  let numero = null;
  const nfse = campo(j, "nfseXmlGZipB64");
  if (nfse) { try { numero = Number(tag(descompactar(nfse), "nNFSe")) || null; } catch { /* sem o número, fica a chave */ } }
  const sucesso = status >= 200 && status < 300 && !erros.length;
  if (!sucesso && !erros.length) erros.push({ codigo: `HTTP ${status}`, descricao: "A Sefin Nacional recusou sem dizer o motivo." });
  return { sucesso, erros, alertas, chave: /^[0-9]{50}$/.test(chave) ? chave : null, numero, evento: !!campo(j, "eventoXmlGZipB64") };
}
export const resumoDoRetorno = (r) => [...r.erros.map(e => `Erro ${e.codigo}: ${e.descricao}`), ...r.alertas.map(a => `Alerta ${a.codigo}: ${a.descricao}`)].join(" · ");

// A chamada com o certificado (TLS com autenticação mútua). Os testes trocam
// o transporte por um falso.
let transporte = (url, corpo, cert, metodo = "POST") => new Promise((ok, falhou) => {
  const u = new URL(url);
  const req = pedidoHttps({
    hostname: u.hostname, path: u.pathname, method: metodo, key: cert.chavePem, cert: cert.certPem, minVersion: "TLSv1.2", timeout: 25000,
    headers: metodo === "GET" ? { Accept: "application/json" } : { "Content-Type": "application/json", Accept: "application/json", "Content-Length": Buffer.byteLength(corpo) },
  }, (res) => {
    let dados = "";
    res.setEncoding("utf8");
    res.on("data", (p) => { dados += p; });
    res.on("end", () => (res.statusCode >= 500 && !/erro/i.test(dados) ? falhou(new Error(`Sefin Nacional: HTTP ${res.statusCode}`)) : ok({ status: res.statusCode, corpo: dados })));
  });
  req.on("timeout", () => req.destroy(new Error("A Sefin Nacional não respondeu a tempo.")));
  req.on("error", falhou);
  req.end(metodo === "GET" ? undefined : corpo);
});
export const usarTransporte = (fn) => { transporte = fn; };
const temErro = (r, codigo) => r.erros.some(e => e.codigo.toUpperCase() === codigo);
// Manda a DPS. A inscrição municipal vai quando o CNC tem o cadastro
// complementar de São Paulo; se a Sefin disser que não tem (E0120), ou o
// contrário (E0116), manda de novo do outro jeito. Assinatura recusada (E0714):
// de novo com RSA-SHA256. Esquema recusado por causa do finNFSe (E1235): de
// novo no outro leiaute (com ou sem o campo).
export async function mandarDps(d, cert, opcoes = {}) {
  const ambiente = d.ambiente === "producao" ? "producao" : "teste";
  const url = `${SEFIN[ambiente]}/nfse`;
  let comIM = true, alg = "sha1", rtc = LEIAUTE_RTC[ambiente], trocouLeiaute = false, r;
  for (let tentativa = 0; tentativa < 4; tentativa += 1) {
    const { xml } = dpsXml(d, cert, { ...opcoes, comIM, alg, rtc });
    r = lerResposta(await transporte(url, JSON.stringify({ dpsXmlGZipB64: compactar(xml) }), cert));
    if (r.sucesso) break;
    if (!trocouLeiaute && r.erros.some(e => /finNFSe/.test(e.descricao))) { rtc = !rtc; trocouLeiaute = true; continue; }
    if (comIM && temErro(r, "E0120")) { comIM = false; continue; }
    if (!comIM && temErro(r, "E0116")) { comIM = true; continue; }
    if (alg === "sha1" && temErro(r, "E0714")) { alg = "sha256"; continue; }
    break;
  }
  return r;
}
export async function mandarCancelamento(chave, ambiente, cert) {
  const url = `${SEFIN[ambiente === "producao" ? "producao" : "teste"]}/nfse/${chave}/eventos`;
  let r = lerResposta(await transporte(url, JSON.stringify({ pedidoRegistroEventoXmlGZipB64: compactar(pedidoDeCancelamento(chave, ambiente, cert)) }), cert));
  if (!r.sucesso && temErro(r, "E0714")) {
    r = lerResposta(await transporte(url, JSON.stringify({ pedidoRegistroEventoXmlGZipB64: compactar(pedidoDeCancelamento(chave, ambiente, cert, { alg: "sha256" })) }), cert));
  }
  return r;
}
// No teste, um número de DPS que nunca se repete (os segundos desde 1970): a
// produção restrita recusa a DPS repetida e o teste não gasta a numeração.
const numeroDeTeste = () => String(Math.floor(Date.now() / 1000));

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
    const r = await mandarDps(d, cert, teste ? { numero: numeroDeTeste() } : {});
    const situacao = !r.sucesso ? "erro" : teste ? "testada" : (r.chave ? "emitida" : "erro");
    const mensagem = !r.sucesso ? resumoDoRetorno(r)
      : teste ? `Emitida na produção restrita (teste, sem valor fiscal)${r.numero ? `: nota n.º ${r.numero}` : ""}.${r.alertas.length ? " " + resumoDoRetorno(r) : ""}`
      : r.chave ? resumoDoRetorno(r) : "A Sefin Nacional não devolveu a chave de acesso da nota.";
    await rpc("registrar_nota", { p_compra: compra, p_situacao: situacao, p_numero_nfe: teste ? null : r.numero, p_codigo: teste ? null : r.chave, p_mensagem: mensagem });
    return { compra, situacao, mensagem, numero: teste ? null : r.numero };
  } catch (e) {
    const mensagem = `Não consegui falar com a Sefin Nacional: ${String((e && e.message) || e).slice(0, 200)}`;
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
    const r = await mandarCancelamento(d.chave, d.ambiente, cert);
    if (r.sucesso) {
      await rpc("registrar_nota", { p_compra: compra, p_situacao: "cancelada", p_numero_nfe: null, p_codigo: null, p_mensagem: "Cancelada na NFS-e Nacional devido ao estorno." });
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

// O "Testar a emissão" do admin: uma nota de R$ 1 na produção restrita (o
// ambiente de testes oficial; não tem valor fiscal nem gasta a numeração).
// Os parâmetros de São Paulo na Sefin (só leitura, nada é emitido): o convênio e
// o serviço. Regra 333 (25/11/2026, o 2º teste): a produção restrita respondeu
// "E0312: O código de tributação nacional informado não está administrado pelo
// município"; a consulta mostra, nos dois ambientes, se São Paulo tem o serviço.
export async function parametrosDeSaoPaulo(ambiente, codigo, cert) {
  const base = `${SEFIN[ambiente]}/parametros_municipais/${MUNICIPIO_SP}`;
  const um = async (caminho) => {
    try {
      const r = await transporte(`${base}/${caminho}`, "", cert, "GET");
      const texto = String(r.corpo || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
      return `HTTP ${r.status}${texto ? " " + texto : ""}`;
    } catch (e) { return `sem resposta (${String((e && e.message) || e).slice(0, 80)})`; }
  };
  const nome = ambiente === "producao" ? "Produção" : "Produção restrita";
  const [convenio, servico] = await Promise.all([um("convenio"), um(codigo)]);
  return `${nome}: convênio ${convenio}; serviço ${codigo}: ${servico}`;
}
async function testar() {
  const cert = await certificadoGuardado();
  if (!cert) return json(409, { erro: "Envie o certificado A1 primeiro." });
  const cfg = (await rpc("nota_configuracao_do_servico")) || {};
  const d = {
    ambiente: "teste", ccm: cfg.ccm, serie: cfg.serie, codigo_servico: cfg.codigo_servico, aliquota: cfg.aliquota,
    descricao: cfg.descricao, valor: 1, data: agoraEmBrasilia().slice(0, 10), tipo: "creditos",
    academia: "", tomador: { documento: "", nome: "", email: "" },
  };
  try {
    const r = await mandarDps(d, cert, { numero: numeroDeTeste() });
    const resultado = r.sucesso
      ? `Tudo certo: a NFS-e Nacional aceitou a nota de teste${r.numero ? ` (n.º ${r.numero})` : ""} na produção restrita, sem valor fiscal.${r.alertas.length ? " " + resumoDoRetorno(r) : ""}`
      : resumoDoRetorno(r) || "A Sefin Nacional recusou, sem dizer o motivo.";
    // Serviço que o município não administra (E0312 e afins): o que a Sefin tem de
    // São Paulo nos dois ambientes, para saber se é só a produção restrita.
    const codigo = so(cfg.codigo_servico).padStart(6, "0").slice(-6);
    const diagnostico = !r.sucesso && r.erros.some(e => /^E03(1[0-9]|0[0-9])$/.test(e.codigo))
      ? " · " + (await Promise.all([parametrosDeSaoPaulo("teste", codigo, cert), parametrosDeSaoPaulo("producao", codigo, cert)])).join(" · ")
      : "";
    await rpc("registrar_teste_da_nota", { p_resultado: (resultado + diagnostico).slice(0, 1900) });
    return json(200, { ok: r.sucesso, resultado: resultado + diagnostico, erros: r.erros, alertas: r.alertas });
  } catch (e) {
    const resultado = `Não consegui falar com a Sefin Nacional: ${String((e && e.message) || e).slice(0, 200)}`;
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
