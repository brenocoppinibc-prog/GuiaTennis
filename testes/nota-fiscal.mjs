// Nota fiscal automática (regra 331): a função da Netlify que monta, assina e
// manda a NFS-e de São Paulo. Roda sem internet: o certificado A1 é criado
// aqui (openssl, CNPJ do GuiaTennis), a Prefeitura e o Supabase são fingidos.
//   node testes/nota-fiscal.mjs
// O XML é conferido contra os schemas oficiais do leiaute 1 (testes/nfse-sp-v01,
// baixados do portal da Prefeitura) com o xmllint, e a assinatura XML com a
// canonicalização C14N do lxml (Python), independente da nossa.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createVerify, createHash, X509Certificate } from "node:crypto";
import nota, {
  textoDaAssinaturaDoRPS, textoDaAssinaturaDoCancelamento, lerCertificado, pedidoEnvioRPS, pedidoTesteLote,
  pedidoCancelamento, envelope, lerRetorno, emitir, cancelar, processarFila, usarTransporte, valorXml, textoXml,
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

// ---- As assinaturas adicionais: o exemplo do próprio manual (item 4.3.2) ----
const exemplo = textoDaAssinaturaDoRPS({ ccm: "31000000", serie: "OL03", numero: 1, data: "2007-01-03", tributacao: "T", status: "N", issRetido: false, valor: 20500, deducoes: 5000, codigo: "2658", tomador: "13167474254" });
ok(exemplo === "31000000OL03 00000000000120070103TNN00000000205000000000000050000002658100013167474254", "a cadeia da assinatura do RPS é igual à do exemplo do manual (86 posições) — " + exemplo.length);
ok(textoDaAssinaturaDoRPS({ ccm: "05930642", serie: "GT", numero: 7, data: "2026-11-25", tributacao: "T", status: "N", issRetido: false, valor: 49.9, deducoes: 0, codigo: "02917", tomador: "" }).endsWith("02917300000000000000") ,
  "sem tomador: indicador 3 e 14 zeros; código com 5 posições");
ok(textoDaAssinaturaDoCancelamento("05930642", 17945) === "05930642000000017945", "a cadeia do cancelamento: inscrição (8) e número da nota (12)");
ok(valorXml(100) === "100" && valorXml(49.9) === "49.90" && valorXml("105.5") === "105.50", "valores no formato da Prefeitura (100, 49.90)");
ok(textoXml("Ana & Cia <SP> 🎾") === "Ana &amp; Cia &lt;SP&gt;" && textoXml("a".repeat(80) + "&", 75).length === 75, "texto limpo: escapa & < >, tira emoji e corta antes de escapar");

// ---- O certificado ----
const cert = lerCertificado(pfx, "segredo123");
ok(cert.cnpj === "70120796000100" && cert.titular === "BRENO COPPINI MARINHO LTDA" && /BEGIN RSA PRIVATE KEY/.test(cert.chavePem) && new Date(cert.validoAte) > new Date(), "o A1: CNPJ, titular, chave e validade — " + cert.titular);
let erro = "";
try { lerCertificado(pfx, "errada"); } catch (e) { erro = e.message; }
ok(erro === "A senha do certificado não confere.", "senha errada: diz que a senha não confere — " + erro);
try { lerCertificado(Buffer.from("não é certificado").toString("base64"), "x"); } catch (e) { erro = e.message; }
ok(/não é um certificado A1/.test(erro), "arquivo que não é certificado: avisa — " + erro);
if (pfxAntigo) ok(lerCertificado(pfxAntigo, "segredo123").cnpj === "70120796000100", "o .pfx no formato antigo (3DES/RC2, o de muitos A1) também abre");

// ---- O XML contra os schemas oficiais e a assinatura XML ----
const dados = {
  ccm: "05930642", serie: "GT", numero_rps: 12, codigo_servico: "02917", aliquota: 0.0201, ambiente: "producao",
  descricao: "Prestação de serviços de disponibilização de espaço publicitário, veiculação de anúncios e assinatura de planos na plataforma GuiaTennis.",
  valor: 105.5, data: "2026-11-25", tipo: "plano", plano: "premium", periodo: "mensal", academia: "Só Aula Tennis & Cia",
  tomador: { documento: "12.345.678/0001-95", nome: "SO AULA TENNIS LTDA", email: "financeiro@soaula.com.br" },
};
const valida = (nome, xml, schema) => {
  const f = join(tmp, nome + ".xml");
  writeFileSync(f, xml);
  try { execFileSync("xmllint", ["--noout", "--schema", join(aqui, "nfse-sp-v01", schema), f], { stdio: ["ignore", "pipe", "pipe"] }); return ""; }
  catch (e) { return String(e.stderr || e.message).slice(0, 300); }
};
const confereAssinatura = (nome, xml) => {
  const f = join(tmp, nome + "-ass.xml");
  writeFileSync(f, xml);
  // O lxml canonicaliza (C14N 1.0) o documento sem a assinatura e o SignedInfo.
  // O SignedInfo vira a raiz de um documento próprio antes (o C14N de um
  // pedaço do documento no lxml/libxml2 põe xmlns="" a mais nos filhos).
  const py = `import sys, base64, hashlib
from lxml import etree
d = etree.parse(sys.argv[1]); ns = {"ds": "http://www.w3.org/2000/09/xmldsig#"}
sig = d.find(".//ds:Signature", ns); si = sig.find("ds:SignedInfo", ns)
print(base64.b64encode(etree.tostring(etree.fromstring(etree.tostring(si)), method="c14n")).decode())
print(sig.find(".//ds:DigestValue", ns).text); print(sig.find("ds:SignatureValue", ns).text)
sig.getparent().remove(sig)
print(base64.b64encode(hashlib.sha1(etree.tostring(d, method="c14n")).digest()).decode())`;
  const [siB64, digest, valor, digestCalculado] = execFileSync("python3", ["-I", "-c", py, f]).toString().trim().split("\n");
  const v = createVerify("RSA-SHA1"); v.update(Buffer.from(siB64, "base64"));
  return { digestConfere: digest === digestCalculado, assinaturaConfere: v.verify(new X509Certificate(cert.certPem).publicKey, Buffer.from(valor, "base64")) };
};
const envio = pedidoEnvioRPS(dados, cert);
ok(valida("envio", envio, "PedidoEnvioRPS_v01.xsd") === "", "PedidoEnvioRPS passa no schema oficial do leiaute 1 " + valida("envio", envio, "PedidoEnvioRPS_v01.xsd"));
let a = confereAssinatura("envio", envio);
ok(a.digestConfere && a.assinaturaConfere, "a assinatura XML confere com outra implementação (C14N do lxml): resumo e RSA-SHA1 — " + JSON.stringify(a));
ok(/<CNPJ>12345678000195<\/CNPJ>/.test(envio) && /<ValorServicos>105.50<\/ValorServicos>/.test(envio) && /<CodigoServico>2917<\/CodigoServico>/.test(envio)
  && /<AliquotaServicos>0.0201<\/AliquotaServicos>/.test(envio) && /Plano Premium mensal da academia Só Aula Tennis &amp; Cia no GuiaTennis\./.test(envio),
  "o RPS: CNPJ do tomador sem pontuação, valor pago, código 02917, ISS de 2,01% e a descrição com o plano");
const rps = /<Assinatura>([^<]+)<\/Assinatura>/.exec(envio)[1];
const vr = createVerify("RSA-SHA1"); vr.update(Buffer.from(textoDaAssinaturaDoRPS({ ccm: "05930642", serie: "GT", numero: 12, data: "2026-11-25", tributacao: "T", status: "N", issRetido: false, valor: 105.5, deducoes: 0, codigo: "02917", tomador: "12345678000195" }), "ascii"));
ok(vr.verify(new X509Certificate(cert.certPem).publicKey, Buffer.from(rps, "base64")), "a assinatura do RPS (RSA-SHA1 da cadeia de 86 posições) confere com o certificado");
const teste = pedidoTesteLote(dados, cert);
ok(valida("teste", teste, "PedidoEnvioLoteRPS_v01.xsd") === "" && confereAssinatura("teste", teste).assinaturaConfere, "o pedido de teste (TesteEnvioLoteRPS) passa no schema e a assinatura confere " + valida("teste", teste, "PedidoEnvioLoteRPS_v01.xsd"));
const canc = pedidoCancelamento("05930642", 17945, cert);
ok(valida("canc", canc, "PedidoCancelamentoNFe_v01.xsd") === "" && confereAssinatura("canc", canc).assinaturaConfere, "o pedido de cancelamento passa no schema e a assinatura confere " + valida("canc", canc, "PedidoCancelamentoNFe_v01.xsd"));
const semTomador = pedidoEnvioRPS({ ...dados, tomador: { documento: "", nome: "", email: "" } }, cert);
ok(valida("sem", semTomador, "PedidoEnvioRPS_v01.xsd") === "" && !/CPFCNPJTomador|RazaoSocialTomador/.test(semTomador), "sem CPF/CNPJ do tomador: o RPS vai sem os campos do tomador e passa no schema");

// ---- O envelope e o retorno (o WSDL e o exemplo do manual) ----
const env = envelope("EnvioRPS", envio);
ok(/<EnvioRPSRequest xmlns="http:\/\/www.prefeitura.sp.gov.br\/nfe"><VersaoSchema>1<\/VersaoSchema><MensagemXML>&lt;PedidoEnvioRPS/.test(env), "o envelope SOAP do WSDL: EnvioRPSRequest, VersaoSchema 1 e a mensagem escapada");
const retornoOk = `<soap:Envelope><soap:Body><EnvioRPSResponse xmlns="http://www.prefeitura.sp.gov.br/nfe"><RetornoXML>&lt;?xml version="1.0" encoding="utf-8"?&gt;&lt;RetornoEnvioRPS xmlns="http://www.prefeitura.sp.gov.br/nfe"&gt;&lt;Cabecalho Versao="1" xmlns=""&gt;&lt;Sucesso&gt;true&lt;/Sucesso&gt;&lt;/Cabecalho&gt;&lt;ChaveNFeRPS xmlns=""&gt;&lt;ChaveNFe&gt;&lt;InscricaoPrestador&gt;5930642&lt;/InscricaoPrestador&gt;&lt;NumeroNFe&gt;17943&lt;/NumeroNFe&gt;&lt;CodigoVerificacao&gt;PH5GL6XU&lt;/CodigoVerificacao&gt;&lt;/ChaveNFe&gt;&lt;/ChaveNFeRPS&gt;&lt;/RetornoEnvioRPS&gt;</RetornoXML></EnvioRPSResponse></soap:Body></soap:Envelope>`;
let r = lerRetorno(retornoOk);
ok(r.sucesso && r.numero === 17943 && r.codigo === "PH5GL6XU", "o retorno de sucesso: o número e o código de verificação da nota");
const retornoErro = retornoOk.replace("&lt;Sucesso&gt;true", "&lt;Sucesso&gt;false").replace(/&lt;ChaveNFeRPS[\s\S]*&lt;\/ChaveNFeRPS&gt;/, "&lt;Erro&gt;&lt;Codigo&gt;1057&lt;/Codigo&gt;&lt;Descricao&gt;Código de serviço inválido&lt;/Descricao&gt;&lt;/Erro&gt;");
r = lerRetorno(retornoErro);
ok(!r.sucesso && r.erros[0].codigo === "1057" && r.erros[0].descricao === "Código de serviço inválido", "o retorno com erro: o código e a descrição");
ok(!lerRetorno("<soap:Fault><faultstring>Servidor fora</faultstring></soap:Fault>").sucesso, "falha do SOAP vira erro");

// ---- A fila, com o banco e a Prefeitura fingidos ----
process.env.SUPABASE_URL = "https://banco.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-chave";
const guardado = JSON.stringify({ chavePem: cert.chavePem, certPem: cert.certPem, certB64: cert.certB64 });
let chamadas = [], registros = [], banco = {}, prefeitura = [], respostaDaPrefeitura = retornoOk, emailDoToken = "guiatennis1@gmail.com";
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
usarTransporte(async (metodo, corpo, c) => { prefeitura.push({ metodo, corpo, temChave: !!c.chavePem }); return respostaDaPrefeitura; });
const ID = "11111111-2222-4333-8444-555555555555";
banco = { nota_para_emitir: dados, certificado_da_nota: guardado };
let x = await emitir(ID);
ok(x.situacao === "emitida" && prefeitura[0].metodo === "EnvioRPS" && prefeitura[0].temChave && registros[0].p_situacao === "emitida" && registros[0].p_numero_nfe === 17943 && registros[0].p_codigo === "PH5GL6XU",
  "produção: EnvioRPS com o certificado; a nota fica emitida com o número e o código");
prefeitura = []; registros = [];
banco.nota_para_emitir = { ...dados, ambiente: "teste" };
respostaDaPrefeitura = retornoOk.replace(/EnvioRPSResponse/g, "TesteEnvioLoteRPSResponse");
x = await emitir(ID);
ok(x.situacao === "testada" && prefeitura[0].metodo === "TesteEnvioLoteRPS" && registros[0].p_numero_nfe === null && /teste/.test(registros[0].p_mensagem), "ambiente de teste: só o TesteEnvioLoteRPS, nada é emitido (nota \"testada\")");
prefeitura = []; registros = [];
banco.nota_para_emitir = dados;
respostaDaPrefeitura = retornoErro;
x = await emitir(ID);
ok(x.situacao === "erro" && /Erro 1057: Código de serviço inválido/.test(registros[0].p_mensagem), "a Prefeitura recusa: a nota fica com erro e a mensagem dela — " + registros[0].p_mensagem);
registros = [];
usarTransporte(async () => { throw new Error("tempo esgotado"); });
x = await emitir(ID);
ok(x.situacao === "erro" && /Não consegui falar com a Prefeitura: tempo esgotado/.test(registros[0].p_mensagem), "a Prefeitura fora do ar: erro, para tentar de novo");
registros = [];
banco.certificado_da_nota = null;
x = await emitir(ID);
ok(x.situacao === "erro" && /Falta o certificado A1/.test(registros[0].p_mensagem), "sem certificado: erro dizendo onde enviar");
banco.certificado_da_nota = guardado;
banco.nota_para_emitir = null;
x = await emitir(ID);
ok(x.situacao === "nada", "compra que não está na fila: nada acontece");
// Cancelamento (estorno).
usarTransporte(async (metodo, corpo) => { prefeitura.push({ metodo, corpo }); return `<CancelamentoNFeResponse><RetornoXML>&lt;Cabecalho&gt;&lt;Sucesso&gt;true&lt;/Sucesso&gt;&lt;/Cabecalho&gt;</RetornoXML></CancelamentoNFeResponse>`; });
prefeitura = []; registros = [];
banco.nota_para_cancelar = { compra: ID, ccm: "05930642", numero_nfe: 17943 };
x = await cancelar(ID);
ok(x.situacao === "cancelada" && prefeitura[0].metodo === "CancelamentoNFe" && /<NumeroNFe>17943<\/NumeroNFe>/.test(prefeitura[0].corpo.replace(/&lt;/g, "<").replace(/&gt;/g, ">")) && registros[0].p_situacao === "cancelada",
  "estorno: CancelamentoNFe da nota 17943 e a nota fica cancelada");
// A fila inteira.
chamadas = []; prefeitura = [];
banco.notas_para_processar = [{ compra_id: ID, acao: "cancelar" }];
await processarFila();
ok(chamadas[0].nome === "notas_para_processar" && prefeitura.length === 1, "processarFila percorre a fila do banco");

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
banco.nota_configuracao_do_servico = { ccm: "05930642", serie: "GT", proximo_rps: 1, codigo_servico: "02917", aliquota: 0.0201, descricao: dados.descricao };
banco.registrar_teste_da_nota = null;
prefeitura = [];
usarTransporte(async (metodo, corpo) => { prefeitura.push({ metodo, corpo }); return retornoOk.replace(/EnvioRPSResponse/g, "TesteEnvioLoteRPSResponse"); });
resp = await pedir({ acao: "testar" });
const t = await resp.json();
ok(t.ok && prefeitura[0].metodo === "TesteEnvioLoteRPS" && /Tudo certo/.test(t.resultado), "\"Testar com a Prefeitura\": TesteEnvioLoteRPS de exemplo, sem emitir — " + t.resultado);

console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
