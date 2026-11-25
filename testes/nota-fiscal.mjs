// Nota fiscal automática (regras 331 e 333): a função da Netlify que monta,
// assina e manda a NFS-e pela NFS-e Nacional (Sefin Nacional). Roda sem
// internet: o certificado A1 é criado aqui (openssl, CNPJ do GuiaTennis), a
// Sefin e o Supabase são fingidos.
//   node testes/nota-fiscal.mjs
// A DPS e o pedido de cancelamento são conferidos contra os esquemas oficiais
// do leiaute 1.01 (testes/nfse-nacional-v1.01, baixados do portal da NFS-e) com o
// xmllint, e a assinatura XML com a canonicalização C14N do lxml (Python),
// independente da nossa. A DPS do Teste, no leiaute da reforma tributária
// (finNFSe), é conferida contra os esquemas da produção restrita
// (testes/nfse-nacional-rtc, "esquemas_prod_restrita_20261020"). Na cópia dos esquemas 1.01, o padrão da série
// ("^0{0,4}\d{1,5}$") foi trocado por "0{0,4}\d{1,5}": no XSD, ^ e $ são letras
// (o validador .NET da Sefin os lê como âncoras; o xmllint, não).
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { createVerify, X509Certificate } from "node:crypto";
import nota, {
  lerCertificado, dpsXml, idDaDps, pedidoDeCancelamento, lerResposta, compactar, descompactar, emitir, cancelar,
  processarFila, usarTransporte, valorXml, textoXml, percentualDoSimples, agoraEmBrasilia, SEFIN,
} from "../netlify/functions/nota-fiscal.mjs";

let falhas = 0;
const ok = (cond, msg) => { if (!cond) falhas += 1; console.log((cond ? "OK    " : "FALHA ") + msg); };
const aqui = dirname(fileURLToPath(import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "nota-"));

// O certificado A1 de mentira: o titular no padrão do ICP-Brasil ("NOME:CNPJ").
const sh = (args) => execFileSync("openssl", args, { cwd: tmp, stdio: ["ignore", "pipe", "pipe"] });
sh(["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", "k.pem", "-out", "c.pem", "-days", "30", "-subj", "/C=BR/O=ICP-Brasil/CN=BRENO COPPINI MARINHO LTDA:70120796000100"]);
sh(["pkcs12", "-export", "-inkey", "k.pem", "-in", "c.pem", "-out", "a1.pfx", "-passout", "pass:segredo123"]);
const pfx = readFileSync(join(tmp, "a1.pfx")).toString("base64");
sh(["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", "k2.pem", "-out", "c2.pem", "-days", "30", "-subj", "/CN=OUTRA EMPRESA:11222333000181"]);
sh(["pkcs12", "-export", "-inkey", "k2.pem", "-in", "c2.pem", "-out", "outro.pfx", "-passout", "pass:x"]);
const outroPfx = readFileSync(join(tmp, "outro.pfx")).toString("base64");
let pfxAntigo = "";
try { sh(["pkcs12", "-export", "-legacy", "-inkey", "k.pem", "-in", "c.pem", "-out", "antigo.pfx", "-passout", "pass:segredo123"]); pfxAntigo = readFileSync(join(tmp, "antigo.pfx")).toString("base64"); } catch { /* openssl sem -legacy */ }

// ---- Os pedaços ----
ok(valorXml(100) === "100" && valorXml(49.9) === "49.90" && valorXml("105.5") === "105.50", "valores no formato da DPS (100, 49.90)");
ok(textoXml("Ana & Cia <SP> 🎾") === "Ana &amp; Cia &lt;SP&gt;" && textoXml("a".repeat(80) + "&", 75).length === 75, "texto limpo: escapa & < >, tira emoji e corta antes de escapar");
ok(idDaDps("1", 12) === "DPS" + "3550308" + "2" + "70120796000100" + "00001" + "000000000000012" && idDaDps("1", 12).length === 45,
  "o Id da DPS (45): DPS + São Paulo (3550308) + 2 (CNPJ) + CNPJ + série (5) + número (15)");
ok(percentualDoSimples(0.0201) === "6", "o total aproximado dos tributos do Simples: 6% (o ISS de 2,01% é 33,5% dele)");
ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/.test(agoraEmBrasilia()), "a data e a hora no fuso de Brasília (-03:00) — " + agoraEmBrasilia());
ok(SEFIN.teste === "https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional" && SEFIN.producao === "https://sefin.nfse.gov.br/SefinNacional", "os endereços da produção restrita e da produção");

// ---- O certificado ----
const cert = lerCertificado(pfx, "segredo123");
ok(cert.cnpj === "70120796000100" && cert.titular === "BRENO COPPINI MARINHO LTDA" && /BEGIN RSA PRIVATE KEY/.test(cert.chavePem) && new Date(cert.validoAte) > new Date(), "o A1: CNPJ, titular, chave e validade — " + cert.titular);
let erro = "";
try { lerCertificado(pfx, "errada"); } catch (e) { erro = e.message; }
ok(erro === "A senha do certificado não confere.", "senha errada: diz que a senha não confere — " + erro);
try { lerCertificado(Buffer.from("não é certificado").toString("base64"), "x"); } catch (e) { erro = e.message; }
ok(/não é um certificado A1/.test(erro), "arquivo que não é certificado: avisa — " + erro);
if (pfxAntigo) ok(lerCertificado(pfxAntigo, "segredo123").cnpj === "70120796000100", "o .pfx no formato antigo (3DES/RC2, o de muitos A1) também abre");

// ---- A DPS contra o esquema oficial e a assinatura XML ----
const dados = {
  ccm: "05930642", serie: "1", numero_rps: 12, codigo_servico: "172501", aliquota: 0.0201, ambiente: "producao",
  descricao: "Prestação de serviços de disponibilização de espaço publicitário, veiculação de anúncios e assinatura de planos na plataforma GuiaTennis.",
  valor: 105.5, data: "2026-11-25", tipo: "plano", plano: "premium", periodo: "mensal", academia: "Só Aula Tennis & Cia",
  tomador: { documento: "12.345.678/0001-95", nome: "SO AULA TENNIS LTDA", email: "financeiro@soaula.com.br" },
};
const valida = (nome, xml, schema, pasta = "nfse-nacional-v1.01") => {
  const f = join(tmp, nome + ".xml");
  writeFileSync(f, xml);
  try { execFileSync("xmllint", ["--noout", "--schema", join(aqui, pasta, schema), f], { stdio: ["ignore", "pipe", "pipe"] }); return ""; }
  catch (e) { return String(e.stderr || e.message).slice(0, 400); }
};
// O lxml acha o elemento do Id, canonicaliza (C14N 1.0) o pedaço e o
// SignedInfo; o resumo e a assinatura RSA são conferidos com o certificado.
// Cada pedaço vira a raiz de um documento próprio antes (com o namespace
// herdado declarado nele): o C14N de um pedaço no lxml/libxml2 põe xmlns="" a
// mais nos netos.
const confereAssinatura = (nome, xml) => {
  const f = join(tmp, nome + "-ass.xml");
  writeFileSync(f, xml);
  const py = `import sys, base64, hashlib
from lxml import etree
d = etree.parse(sys.argv[1]); ns = {"ds": "http://www.w3.org/2000/09/xmldsig#"}
sig = d.find(".//ds:Signature", ns); si = sig.find("ds:SignedInfo", ns)
ref = si.find("ds:Reference", ns).get("URI")[1:]
alg = "sha256" if "sha256" in si.find("ds:SignatureMethod", ns).get("Algorithm") else "sha1"
alvo = etree.fromstring(etree.tostring(d.xpath("//*[@Id=$i]", i=ref)[0]))
print(alg)
print(base64.b64encode(etree.tostring(etree.fromstring(etree.tostring(si)), method="c14n")).decode())
print(sig.find(".//ds:DigestValue", ns).text); print(sig.find("ds:SignatureValue", ns).text)
print(base64.b64encode(hashlib.new(alg, etree.tostring(alvo, method="c14n")).digest()).decode())`;
  const [alg, siB64, digest, valor, digestCalculado] = execFileSync("python3", ["-I", "-c", py, f]).toString().trim().split("\n");
  const v = createVerify(alg === "sha256" ? "RSA-SHA256" : "RSA-SHA1"); v.update(Buffer.from(siB64, "base64"));
  return { alg, digestConfere: digest === digestCalculado, assinaturaConfere: v.verify(new X509Certificate(cert.certPem).publicKey, Buffer.from(valor, "base64")) };
};
const { id, xml: dps } = dpsXml(dados, cert, { dhEmi: "2026-11-25T14:00:00-03:00" });
ok(valida("dps", dps, "DPS_v1.01.xsd") === "", "a DPS passa no esquema oficial do leiaute 1.01 " + valida("dps", dps, "DPS_v1.01.xsd"));
let a = confereAssinatura("dps", dps);
ok(a.alg === "sha1" && a.digestConfere && a.assinaturaConfere, "a assinatura XML na infDPS confere com outra implementação (C14N do lxml): resumo e RSA-SHA1 — " + JSON.stringify(a));
ok(!/<\w+:/.test(dps.replace(/<\?xml[^>]*>/, "")), "sem prefixo de namespace (E1228)");
ok(dps.includes(`<infDPS Id="${id}">`) && /<tpAmb>1<\/tpAmb>/.test(dps) && /<serie>1<\/serie><nDPS>12<\/nDPS><dCompet>2026-11-25<\/dCompet><tpEmit>1<\/tpEmit><cLocEmi>3550308<\/cLocEmi>/.test(dps),
  "a DPS: produção (tpAmb 1), série 1, número 12, competência no dia da compra, emitida pelo prestador em São Paulo");
ok(/<prest><CNPJ>70120796000100<\/CNPJ><IM>05930642<\/IM><regTrib><opSimpNac>3<\/opSimpNac><regApTribSN>1<\/regApTribSN><regEspTrib>0<\/regEspTrib><\/regTrib><\/prest>/.test(dps) && !/<prest>[^]*<xNome>[^]*<\/prest>/.test(dps),
  "o prestador: CNPJ, a inscrição municipal, Simples Nacional ME/EPP apurando pelo SN; sem nome nem endereço (E0121, E0128)");
ok(/<toma><CNPJ>12345678000195<\/CNPJ><xNome>SO AULA TENNIS LTDA<\/xNome><email>financeiro@soaula.com.br<\/email><\/toma>/.test(dps), "o tomador: CNPJ sem pontuação, razão social e e-mail");
ok(/<cTribNac>172501<\/cTribNac><xDescServ>[^<]*Plano Premium mensal da academia Só Aula Tennis &amp; Cia no GuiaTennis\.<\/xDescServ>/.test(dps), "o serviço: 172501 (item 17.25) e a descrição com o plano");
ok(/<\/xDescServ><cNBS>114063300<\/cNBS><\/cServ>/.test(dps), "o código NBS 114063300 (o da Contabilizei), depois da descrição no leiaute 1.01");
ok(/<vServ>105.50<\/vServ>/.test(dps) && /<tribMun><tribISSQN>1<\/tribISSQN><tpRetISSQN>1<\/tpRetISSQN><\/tribMun>/.test(dps) && !/<pAliq>/.test(dps) && /<pTotTribSN>6<\/pTotTribSN>/.test(dps) && !/IBSCBS/.test(dps),
  "os valores: o valor pago, ISS tributável sem retenção e sem alíquota (E0625), 6% de tributos do Simples, sem IBS/CBS (só em 2027)");
const teste = dpsXml({ ...dados, ambiente: "teste" }, cert, { numero: "1764090000", comIM: false, alg: "sha256" }).xml;
a = confereAssinatura("teste", teste);
ok(valida("teste", teste, "DPS_v1.01.xsd", "nfse-nacional-rtc") === "" && /<tpEmit>1<\/tpEmit><finNFSe>0<\/finNFSe><cLocEmi>/.test(teste) && /<cTribNac>172501<\/cTribNac><cNBS>114063300<\/cNBS><xDescServ>/.test(teste) && !/finNFSe/.test(dps) && /<tpAmb>2<\/tpAmb>/.test(teste) && !/<IM>/.test(teste) && a.alg === "sha256" && a.digestConfere && a.assinaturaConfere,
  "teste: produção restrita (tpAmb 2) no leiaute da reforma (finNFSe 0, esquemas da produção restrita de 20/10/2026), sem a inscrição municipal e com RSA-SHA256");
const semTomador = dpsXml({ ...dados, tomador: { documento: "", nome: "", email: "" } }, cert).xml;
ok(valida("sem", semTomador, "DPS_v1.01.xsd") === "" && !/<toma>/.test(semTomador), "sem CPF/CNPJ do tomador: a DPS vai sem o tomador e passa no esquema");
erro = "";
try { dpsXml({ ...dados, serie: "60000" }, cert); } catch (e) { erro = e.message; }
ok(/1 a 49999/.test(erro), "série fora da faixa do aplicativo próprio: recusa antes de mandar");

// ---- O cancelamento (evento 101101) ----
const CHAVE = "35503082270120796000100000000000000012260000000012";
const canc = pedidoDeCancelamento(CHAVE, "producao", cert, { dhEvento: "2026-11-26T10:00:00-03:00" });
ok(valida("canc", canc, "pedRegEvento_v1.01.xsd") === "" && confereAssinatura("canc", canc).assinaturaConfere, "o pedido de cancelamento passa no esquema oficial e a assinatura confere " + valida("canc", canc, "pedRegEvento_v1.01.xsd"));
ok(canc.includes(`<infPedReg Id="PRE${CHAVE}101101">`) && /<e101101><xDesc>Cancelamento de NFS-e<\/xDesc><cMotivo>9<\/cMotivo>/.test(canc), "o evento 101101: Id PRE + chave + tipo, \"Cancelamento de NFS-e\" com o motivo");

// ---- A mensagem e a resposta ----
ok(descompactar(compactar("<DPS>ç</DPS>")) === "<DPS>ç</DPS>", "o XML vai compactado (GZip) em base64 e volta igual");
const nfse = `<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse"><infNFSe><nNFSe>17</nNFSe></infNFSe></NFSe>`;
const sucesso = { status: 201, corpo: JSON.stringify({ tipoAmbiente: 1, chaveAcesso: CHAVE, nfseXmlGZipB64: gzipSync(nfse).toString("base64"), alertas: [] }) };
let r = lerResposta(sucesso);
ok(r.sucesso && r.chave === CHAVE && r.numero === 17, "a resposta de sucesso: a chave de acesso e o número da nota (do XML da NFS-e)");
const recusa = (codigo, descricao) => ({ status: 400, corpo: JSON.stringify({ erros: [{ Codigo: codigo, Descricao: descricao, Complemento: null }] }) });
r = lerResposta(recusa("E0310", "Código de tributação nacional inexistente."));
ok(!r.sucesso && r.erros[0].codigo === "E0310" && /inexistente/.test(r.erros[0].descricao), "a recusa: o código e a descrição (as chaves em maiúscula ou minúscula)");
ok(!lerResposta({ status: 403, corpo: "<html><title>403 - Forbidden</title></html>" }).sucesso, "resposta fora do formato (ex.: 403 do servidor) vira erro");

// ---- A fila, com o banco e a Sefin fingidos ----
process.env.SUPABASE_URL = "https://banco.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-chave";
const guardado = JSON.stringify({ chavePem: cert.chavePem, certPem: cert.certPem, certB64: cert.certB64 });
let chamadas = [], registros = [], banco = {}, sefin = [], respostas = [], emailDoToken = "guiatennis1@gmail.com";
globalThis.fetch = async (url, op = {}) => {
  url = String(url);
  if (url.endsWith("/auth/v1/user")) return new Response(JSON.stringify({ email: emailDoToken }), { status: op.headers.Authorization === "Bearer token-ok" ? 200 : 401 });
  const nome = url.split("/rpc/")[1];
  const corpo = op.body ? JSON.parse(op.body) : {};
  chamadas.push({ nome, corpo });
  if (nome === "registrar_nota") registros.push(corpo);
  const v = typeof banco[nome] === "function" ? banco[nome](corpo) : banco[nome];
  return new Response(v === undefined ? "" : JSON.stringify(v), { status: 200 });
};
const xmlMandado = (i) => { const j = JSON.parse(sefin[i].corpo); return descompactar(j.dpsXmlGZipB64 || j.pedidoRegistroEventoXmlGZipB64); };
usarTransporte(async (url, corpo, c) => { sefin.push({ url, corpo, temChave: !!c.chavePem }); return respostas.length > 1 ? respostas.shift() : respostas[0]; });
const ID = "11111111-2222-4333-8444-555555555555";
banco = { nota_para_emitir: dados, certificado_da_nota: guardado };
respostas = [sucesso];
let x = await emitir(ID);
ok(x.situacao === "emitida" && sefin[0].url === "https://sefin.nfse.gov.br/SefinNacional/nfse" && sefin[0].temChave && /<nDPS>12<\/nDPS>/.test(xmlMandado(0))
  && registros[0].p_situacao === "emitida" && registros[0].p_numero_nfe === 17 && registros[0].p_codigo === CHAVE,
  "produção: POST /nfse na Sefin Nacional com o certificado; a nota fica emitida com o número e a chave de acesso");
sefin = []; registros = [];
banco.nota_para_emitir = { ...dados, ambiente: "teste" };
x = await emitir(ID);
ok(x.situacao === "testada" && sefin[0].url.startsWith(SEFIN.teste) && /<tpAmb>2<\/tpAmb>/.test(xmlMandado(0)) && !/<nDPS>12<\/nDPS>/.test(xmlMandado(0))
  && registros[0].p_numero_nfe === null && registros[0].p_codigo === null && /produção restrita/.test(registros[0].p_mensagem),
  "teste: produção restrita, com um número de DPS que não gasta a numeração; a nota fica \"testada\", sem valor fiscal");
sefin = []; registros = [];
banco.nota_para_emitir = dados;
respostas = [recusa("E0120", "A IM não deve ser informada."), sucesso];
x = await emitir(ID);
ok(x.situacao === "emitida" && sefin.length === 2 && /<IM>/.test(xmlMandado(0)) && !/<IM>/.test(xmlMandado(1)), "a Sefin diz que a inscrição municipal não vai (E0120): manda de novo sem ela");
sefin = []; registros = [];
respostas = [recusa("E1235", "Falha no esquema XML do DF-e. The element 'infDPS' has invalid child element 'cLocEmi'. List of possible elements expected: 'cMotivoEmisTI, finNFSe'."), sucesso];
x = await emitir(ID);
ok(x.situacao === "emitida" && sefin.length === 2 && !/finNFSe/.test(xmlMandado(0)) && /<finNFSe>0<\/finNFSe>/.test(xmlMandado(1)), "a produção passou para o leiaute da reforma (E1235 pedindo o finNFSe): manda de novo com o campo");
sefin = []; registros = [];
respostas = [recusa("E0714", "A assinatura da DPS deve ser válida."), sucesso];
x = await emitir(ID);
ok(x.situacao === "emitida" && sefin.length === 2 && /rsa-sha1"/.test(xmlMandado(0)) && /rsa-sha256"/.test(xmlMandado(1)), "assinatura recusada (E0714): manda de novo com RSA-SHA256");
sefin = []; registros = [];
respostas = [recusa("E0310", "Código de tributação nacional inexistente.")];
x = await emitir(ID);
ok(x.situacao === "erro" && sefin.length === 1 && /Erro E0310: Código de tributação nacional inexistente\./.test(registros[0].p_mensagem), "a Sefin recusa: a nota fica com erro e a mensagem dela — " + registros[0].p_mensagem);
registros = [];
usarTransporte(async () => { throw new Error("tempo esgotado"); });
x = await emitir(ID);
ok(x.situacao === "erro" && /Não consegui falar com a Sefin Nacional: tempo esgotado/.test(registros[0].p_mensagem), "a Sefin fora do ar: erro, para tentar de novo");
registros = [];
banco.certificado_da_nota = null;
x = await emitir(ID);
ok(x.situacao === "erro" && /Falta o certificado A1/.test(registros[0].p_mensagem), "sem certificado: erro dizendo onde enviar");
banco.certificado_da_nota = guardado;
banco.nota_para_emitir = null;
x = await emitir(ID);
ok(x.situacao === "nada", "compra que não está na fila: nada acontece");
// Cancelamento (estorno).
usarTransporte(async (url, corpo) => { sefin.push({ url, corpo }); return { status: 201, corpo: JSON.stringify({ eventoXmlGZipB64: compactar("<evento/>") }) }; });
sefin = []; registros = [];
banco.nota_para_cancelar = { compra: ID, chave: CHAVE, numero_nfe: 17, ambiente: "producao" };
x = await cancelar(ID);
ok(x.situacao === "cancelada" && sefin[0].url === `${SEFIN.producao}/nfse/${CHAVE}/eventos` && /<chNFSe>35503082/.test(xmlMandado(0)) && registros[0].p_situacao === "cancelada",
  "estorno: o evento de cancelamento na chave da nota e a nota fica cancelada");
// A fila inteira.
chamadas = []; sefin = [];
banco.notas_para_processar = [{ compra_id: ID, acao: "cancelar" }];
await processarFila();
ok(chamadas[0].nome === "notas_para_processar" && sefin.length === 1, "processarFila percorre a fila do banco");

// ---- A rota (só o admin) ----
const pedir = (corpo, token = "token-ok") => nota(new Request("https://guiatennis.com.br/.netlify/functions/nota-fiscal", { method: "POST", body: JSON.stringify(corpo), headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }));
let resp = await pedir({ acao: "processar" }, "token-ruim");
ok(resp.status === 403, "sem a sessão do admin: 403");
emailDoToken = "ana@exemplo.com";
resp = await pedir({ acao: "processar" });
ok(resp.status === 403, "outra conta: 403");
emailDoToken = "guiatennis1@gmail.com";
chamadas = [];
resp = await pedir({ acao: "certificado", pfx: outroPfx, senha: "x" });
ok(resp.status === 400 && /CNPJ 11222333000181, não do GuiaTennis/.test((await resp.json()).erro) && !chamadas.some(c => c.nome === "guardar_certificado_da_nota"), "certificado de outro CNPJ: recusa e não guarda");
resp = await pedir({ acao: "certificado", pfx, senha: "errada" });
ok(resp.status === 400 && (await resp.json()).erro === "A senha do certificado não confere.", "senha errada: 400 com a mensagem");
banco.guardar_certificado_da_nota = null;
resp = await pedir({ acao: "certificado", pfx, senha: "segredo123" });
const g = chamadas.find(c => c.nome === "guardar_certificado_da_nota");
ok(resp.status === 200 && g && g.corpo.p_cnpj === "70120796000100" && JSON.parse(g.corpo.p_segredo).chavePem && !JSON.stringify(g.corpo).includes("segredo123"),
  "certificado certo: guarda a chave e o certificado no cofre (a senha não vai para o banco)");
banco.nota_configuracao_do_servico = { ccm: "05930642", serie: "1", proximo_rps: 1, codigo_servico: "172501", aliquota: 0.0201, descricao: dados.descricao };
banco.registrar_teste_da_nota = null;
sefin = [];
usarTransporte(async (url, corpo) => { sefin.push({ url, corpo }); return sucesso; });
resp = await pedir({ acao: "testar" });
const t = await resp.json();
ok(t.ok && sefin[0].url === `${SEFIN.teste}/nfse` && /<tpAmb>2<\/tpAmb>/.test(xmlMandado(0)) && /<vServ>1<\/vServ>/.test(xmlMandado(0)) && /Tudo certo: a NFS-e Nacional aceitou/.test(t.resultado),
  "\"Testar a emissão\": uma nota de R$ 1 na produção restrita — " + t.resultado);

console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
