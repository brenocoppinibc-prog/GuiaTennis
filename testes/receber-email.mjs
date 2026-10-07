// E-mail com o domínio pelo Resend (07/10/2026): a função do Netlify que
// recebe o webhook "email.received" e encaminha para o Gmail. Roda sem
// internet: o fetch do Resend é fingido.
//   node testes/receber-email.mjs
import crypto from "node:crypto";
import receber, { assinaturaValida, montarEncaminhado } from "../netlify/functions/receber-email.mjs";

let falhas = 0;
const ok = (cond, msg) => { if (!cond) falhas += 1; console.log((cond ? "OK    " : "FALHA ") + msg); };

const SEGREDO = "whsec_" + Buffer.from("segredo-de-teste-123").toString("base64");
process.env.RESEND_WEBHOOK_SECRET = SEGREDO;
process.env.RESEND_RECEBER_KEY = "re_full_teste";
delete process.env.ENCAMINHAR_PARA;

function assinado(corpo, { id = "msg_1", hora = Math.floor(Date.now() / 1000), segredo = SEGREDO, prefixo = "svix" } = {}) {
  const chave = Buffer.from(segredo.replace(/^whsec_/, ""), "base64");
  const sig = crypto.createHmac("sha256", chave).update(`${id}.${hora}.${corpo}`).digest("base64");
  return new Request("https://guiatennis.com.br/.netlify/functions/receber-email", {
    method: "POST", body: corpo,
    headers: { [`${prefixo}-id`]: id, [`${prefixo}-timestamp`]: String(hora), [`${prefixo}-signature`]: `v1,outra v1,${sig}` },
  });
}

// O Resend de mentira.
let pedidos = [];
let emailRecebido;
globalThis.fetch = async (url, op = {}) => {
  pedidos.push({ url: String(url), metodo: op.method || "GET", cabecalhos: op.headers || {}, corpo: op.body ? JSON.parse(op.body) : null });
  const resp = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
  if (String(url).startsWith("https://api.resend.com/emails/receiving/em_1/attachments")) {
    return resp(200, { object: "list", has_more: false, data: [
      { id: "at1", filename: "foto.png", size: 10, content_type: "image/png", content_disposition: "inline", content_id: "img1", download_url: "https://arquivos.resend/at1" },
      { id: "at2", filename: "tabela.pdf", size: 20, content_type: "application/pdf", content_disposition: "attachment", download_url: "https://arquivos.resend/at2" },
    ] });
  }
  if (String(url).startsWith("https://api.resend.com/emails/receiving/em_1")) return resp(200, emailRecebido);
  if (String(url).startsWith("https://arquivos.resend/")) return new Response(Buffer.from("conteudo " + url.slice(-3)));
  if (String(url) === "https://api.resend.com/emails") return resp(200, { id: "enviado_1" });
  return resp(404, { message: "não existe" });
};

const evento = (extra = {}) => JSON.stringify({ type: "email.received", created_at: new Date().toISOString(),
  data: { email_id: "em_1", from: "Ana Souza <ana@academia.com>", to: ["contato@guiatennis.com.br"], subject: "Quero anunciar", attachments: [{ id: "at1" }, { id: "at2" }], ...extra } });

emailRecebido = { object: "email", id: "em_1", from: "Ana Souza <ana@academia.com>", to: ["contato@guiatennis.com.br"], reply_to: null,
  subject: "Quero anunciar", html: '<p>Oi! <img src="cid:img1"></p>', text: "Oi!", attachments: [] };

// Assinatura
const corpo = evento();
ok(assinaturaValida(SEGREDO, assinado(corpo).headers, corpo), "assinatura certa (cabeçalhos svix-…) vale");
ok(assinaturaValida(SEGREDO, assinado(corpo, { prefixo: "webhook" }).headers, corpo), "também com os cabeçalhos webhook-… (Standard Webhooks)");
ok(!assinaturaValida(SEGREDO, assinado(corpo, { segredo: "whsec_" + Buffer.from("outro").toString("base64") }).headers, corpo), "segredo errado: recusa");
ok(!assinaturaValida(SEGREDO, assinado(corpo).headers, corpo + " "), "corpo mexido: recusa");
ok(!assinaturaValida(SEGREDO, assinado(corpo, { hora: Math.floor(Date.now() / 1000) - 3600 }).headers, corpo), "pedido de uma hora atrás: recusa");

// Sem assinatura, nada acontece.
pedidos = [];
let r = await receber(new Request("https://x/", { method: "POST", body: corpo }));
ok(r.status === 401 && pedidos.length === 0, "sem assinatura: 401, nada é buscado nem mandado");
r = await receber(new Request("https://x/", { method: "GET" }));
ok(r.status === 405, "só aceita POST");
r = await receber(assinado(JSON.stringify({ type: "email.sent", data: {} })));
ok(r.status === 200 && pedidos.length === 0, "outros eventos: ignora");

// Encaminha.
pedidos = [];
r = await receber(assinado(corpo));
const envio = pedidos.find((p) => p.url === "https://api.resend.com/emails");
ok(r.status === 200 && envio, "e-mail recebido: encaminha");
ok(pedidos[0].url === "https://api.resend.com/emails/receiving/em_1?html_format=cid" && pedidos[0].cabecalhos.Authorization === "Bearer re_full_teste", "busca o e-mail inteiro com a chave de leitura (imagens como cid)");
ok(envio.corpo.to[0] === "guiatennis1@gmail.com" && envio.corpo.from === "Ana Souza pelo GuiaTennis <encaminhado@guiatennis.com.br>", "vai para o Gmail, com o nome de quem escreveu");
ok(envio.corpo.reply_to[0] === "Ana Souza <ana@academia.com>", "responder vai para quem escreveu");
ok(envio.corpo.subject === "Quero anunciar" && envio.corpo.html.includes("Recebido em contato@guiatennis.com.br · De: Ana Souza &lt;ana@academia.com&gt;") && envio.corpo.html.includes('src="cid:img1"'),
  "mesmo assunto, com a linha de para onde foi e quem mandou");
ok(envio.cabecalhos["Idempotency-Key"] === "encaminhar-em_1", "webhook repetido não manda duas vezes");
const anexos = envio.corpo.attachments || [];
ok(anexos.length === 2 && anexos[0].content_id === "img1" && !anexos[1].content_id && Buffer.from(anexos[1].content, "base64").toString() === "conteudo at2", "anexos e imagens no corpo vão junto");

// Responder-para do original e outro destino.
process.env.ENCAMINHAR_PARA = "breno@exemplo.com";
emailRecebido = { ...emailRecebido, reply_to: ["respostas@academia.com"], html: null, text: "Só texto <b>" };
pedidos = [];
await receber(assinado(evento({ attachments: [] })));
const e2 = pedidos.find((p) => p.url === "https://api.resend.com/emails").corpo;
ok(e2.to[0] === "breno@exemplo.com" && e2.reply_to[0] === "respostas@academia.com" && e2.html.includes("Só texto &lt;b&gt;") && !e2.attachments, "respeita o responder-para do original; e-mail só de texto vira HTML escapado");
ok(!pedidos.some((p) => p.url.includes("/attachments")), "sem anexo, não busca anexos");

// Não encaminha o próprio encaminhado.
emailRecebido = { ...emailRecebido, from: "X pelo GuiaTennis <encaminhado@guiatennis.com.br>" };
pedidos = [];
r = await receber(assinado(evento({ attachments: [] })));
ok(r.status === 200 && !pedidos.some((p) => p.url === "https://api.resend.com/emails"), "não encaminha o que ele mesmo mandou (sem círculo)");

// Erro do Resend: 500, para o Resend tentar de novo.
emailRecebido = undefined;
globalThis.fetch = async () => new Response(JSON.stringify({ message: "chave sem permissão" }), { status: 401 });
r = await receber(assinado(corpo));
ok(r.status === 500, "Resend recusou: responde 500 para tentar de novo");

// Nome estranho no remetente não quebra o "De".
const m = montarEncaminhado({ from: '"Zé, <o> Melhor" <ze@x.com>', to: ["breno@guiatennis.com.br"], subject: "", text: "oi" }, "a@b.com", [], 1);
ok(m.from === "Zé o Melhor pelo GuiaTennis <encaminhado@guiatennis.com.br>" && m.subject === "(sem assunto)" && m.html.includes("1 anexo ficou de fora"), "nome com vírgula e <> fica limpo; sem assunto; anexo grande avisado — " + m.from);

console.log(`\n${falhas ? falhas + " falha(s)" : "Tudo certo"}`);
process.exit(falhas ? 1 : 0);
