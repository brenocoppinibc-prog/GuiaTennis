// E-mail com o domínio do GuiaTennis pelo Resend (pedido do Breno em
// 07/10/2026: "quero fazer pelo resend… com o domínio @guiatennis.com.br").
//
// Quem escreve para qualquer endereço @guiatennis.com.br (contato@, breno@,
// parceiros@…) cai no Resend (registro MX do domínio). O Resend avisa esta
// função (webhook "email.received"); ela busca o e-mail inteiro e o
// encaminha para o Gmail do GuiaTennis como foi escrito, com o "responder"
// apontando para quem escreveu. No Gmail, o Breno responde como contato@guiatennis.com.br
// ("Enviar e-mail como", pelo SMTP do Resend).
//
// Endereço: https://guiatennis.com.br/.netlify/functions/receber-email
// Variáveis no Netlify (Project configuration › Environment variables,
// marcadas como "Contains secret values" — colocadas pelo Breno em
// 08/10/2026, em Production e Deploy Previews; mudou uma, publicar de novo):
//   RESEND_RECEBER_KEY     chave do Resend com "Full access" (ler o e-mail
//                          recebido precisa dela; a "Sending access" dos
//                          avisos não lê)
//   RESEND_WEBHOOK_SECRET  o "Signing secret" do webhook (whsec_…)
//   ENCAMINHAR_PARA        para onde vai (sem ela, guiatennis1@gmail.com)
// Nada de pacote: só o que o Node do Netlify já tem (fetch e crypto).
import crypto from "node:crypto";

const API = "https://api.resend.com";
const REMETENTE = "encaminhado@guiatennis.com.br";
const DESTINO_PADRAO = "guiatennis1@gmail.com";
// O Resend aceita até 40 MB por e-mail (em base64); passando disso, os
// anexos ficam de fora e o e-mail diz para abrir no painel do Resend.
const LIMITE_ANEXOS = 25 * 1024 * 1024;

const env = (nome) => (globalThis.Netlify?.env?.get(nome) ?? process.env[nome] ?? "").trim();

// Assinatura do webhook (Standard Webhooks, o mesmo do Svix, que o Resend
// usa): HMAC-SHA256 de "id.hora.corpo" com o segredo, em base64. Recusa
// assinatura errada e pedido com mais de 5 minutos (repetido de fora).
export function assinaturaValida(segredo, cabecalhos, corpo, agora = Date.now()) {
  const pega = (n) => cabecalhos.get(`svix-${n}`) || cabecalhos.get(`webhook-${n}`) || "";
  const id = pega("id"), hora = pega("timestamp"), assinaturas = pega("signature");
  if (!segredo || !id || !hora || !assinaturas) return false;
  if (!/^\d+$/.test(hora) || Math.abs(agora / 1000 - Number(hora)) > 300) return false;
  const chave = Buffer.from(segredo.replace(/^whsec_/, ""), "base64");
  const esperada = crypto.createHmac("sha256", chave).update(`${id}.${hora}.${corpo}`).digest("base64");
  return assinaturas.split(" ").some((a) => {
    const [versao, valor] = a.split(",");
    return versao === "v1" && valor && valor.length === esperada.length
      && crypto.timingSafeEqual(Buffer.from(valor), Buffer.from(esperada));
  });
}

const textoHtml = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// "Ana Souza <ana@x.com>" → "Ana Souza"; "ana@x.com" → "ana@x.com".
const nomeDe = (endereco) => {
  const e = String(endereco || "");
  const m = e.match(/^\s*"((?:[^"\\]|\\.)*)"\s*<[^>]*>\s*$/) || e.match(/^\s*([^<"]*?)\s*<[^>]+>\s*$/);
  return (m && m[1].trim()) || e.replace(/[<>]/g, "").trim() || "Alguém";
};
// O nome no "De" não pode ter aspas, vírgula nem <>.
const nomeLimpo = (t) => t.replace(/["<>,;\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);

async function resend(caminho, chave, opcoes = {}) {
  const r = await fetch(API + caminho, {
    ...opcoes,
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json", ...(opcoes.headers || {}) },
  });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Resend ${caminho.split("?")[0]}: ${r.status} ${corpo.message || ""}`.trim());
  return corpo;
}

async function anexosDe(id, chave) {
  const lista = await resend(`/emails/receiving/${id}/attachments`, chave);
  const anexos = [];
  let total = 0, deFora = 0;
  for (const a of lista.data || []) {
    total += a.size || 0;
    if (total > LIMITE_ANEXOS) { deFora += 1; continue; }
    const r = await fetch(a.download_url);
    if (!r.ok) { deFora += 1; continue; }
    anexos.push({
      filename: a.filename || "anexo",
      content: Buffer.from(await r.arrayBuffer()).toString("base64"),
      content_type: a.content_type,
      ...(a.content_disposition === "inline" && a.content_id ? { content_id: a.content_id } : {}),
    });
  }
  return { anexos, deFora };
}

// O e-mail que vai para o Gmail: o original, como foi escrito, sem nada a
// mais no corpo (pedido do Breno em 08/10/2026 — na resposta, o Gmail cita
// a mensagem inteira, e quem escreveu veria o que fosse acrescentado). Quem
// mandou aparece no nome ("Ana pelo GuiaTennis"); para qual endereço do
// GuiaTennis foi fica num cabeçalho (X-GuiaTennis-Recebido-Em). Só o aviso
// de anexo grande demais entra no corpo, quando acontece.
export function montarEncaminhado(email, destino, anexos, deFora) {
  const para = (email.to || []).filter((t) => /@guiatennis\.com\.br\s*>?$/i.test(t)).join(", ") || (email.to || []).join(", ");
  const de = email.from || "";
  const aviso = deFora ? `${deFora} ${deFora === 1 ? "anexo ficou" : "anexos ficaram"} de fora (grande demais): veja no Resend, em Emails › Receiving.` : "";
  const html = (aviso ? `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B6458">${textoHtml(aviso)}</p>` : "")
    + (email.html || `<pre style="font-family:inherit;white-space:pre-wrap">${textoHtml(email.text || "")}</pre>`);
  return {
    from: `${nomeLimpo(nomeDe(de)) || "Alguém"} pelo GuiaTennis <${REMETENTE}>`,
    to: [destino],
    reply_to: email.reply_to && email.reply_to.length ? email.reply_to : [de],
    subject: email.subject || "(sem assunto)",
    html,
    text: (aviso ? `${aviso}\n\n` : "") + (email.text || ""),
    headers: { "X-GuiaTennis-Recebido-Em": para.slice(0, 300) },
    ...(anexos.length ? { attachments: anexos } : {}),
  };
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Só o Resend chama este endereço.", { status: 405 });
  const corpo = await req.text();
  if (!assinaturaValida(env("RESEND_WEBHOOK_SECRET"), req.headers, corpo)) {
    return new Response("Assinatura inválida.", { status: 401 });
  }
  let evento;
  try { evento = JSON.parse(corpo); } catch { return new Response("Corpo inválido.", { status: 400 }); }
  if (evento.type !== "email.received") return new Response("Ignorado.", { status: 200 });

  const chave = env("RESEND_RECEBER_KEY");
  const destino = env("ENCAMINHAR_PARA") || DESTINO_PADRAO;
  const id = evento.data && evento.data.email_id;
  if (!chave || !id) return new Response("Falta a chave ou o e-mail.", { status: 500 });
  try {
    const email = await resend(`/emails/receiving/${encodeURIComponent(id)}?html_format=cid`, chave);
    // Não encaminha o que ele mesmo mandou (nada de e-mail em círculo).
    if (String(email.from || "").toLowerCase().includes(REMETENTE)) return new Response("Ignorado.", { status: 200 });
    const { anexos, deFora } = (evento.data.attachments || []).length ? await anexosDe(encodeURIComponent(id), chave) : { anexos: [], deFora: 0 };
    await resend("/emails", chave, {
      method: "POST",
      // O Resend repete o webhook se demorar: a mesma chave não manda duas vezes.
      headers: { "Idempotency-Key": `encaminhar-${id}` },
      body: JSON.stringify(montarEncaminhado(email, destino, anexos, deFora)),
    });
    return new Response("Encaminhado.", { status: 200 });
  } catch (e) {
    // Erro: o Resend tenta de novo mais tarde.
    console.error("receber-email:", e.message);
    return new Response("Não consegui encaminhar agora.", { status: 500 });
  }
};
