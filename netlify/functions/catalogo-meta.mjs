// Catálogo das academias para os anúncios da Meta (regra 219, 06/11/2026:
// "eu gostaria de automatizar isso se vai ampliar essa oportunidade de trazer
// mais pessoas certas"). Como os anúncios dinâmicos do Booking e do
// hoteis.com: o Gerenciador de Comércio da Meta lê esta lista todo dia, e o
// Instagram mostra a cada pessoa a academia que ela viu, ou as parecidas e
// perto dela. Só entra academia no ar, não pausada, com foto e com preço
// (a Meta exige os dois). Só dados públicos da ficha, os mesmos do site.
// Endereço: /catalogo-meta.csv (netlify.toml). Sem pacote nenhum.

const BANCOS = {
  real: { url: "https://eultezheqwmxyakvgyjy.supabase.co", chave: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bHRlemhlcXdteHlha3ZneWp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMDk5OTcsImV4cCI6MjEwMzg4NTk5N30.JORQlxn0UjezbntZAiQGyA7Mo26zEpnHriPh9IceuuY" },
  teste: { url: "https://ohvbengbujdioxdtewsy.supabase.co", chave: "sb_publishable_NEF5wHWslCi3Uu9GfbHruQ_Ut3r_BBT" },
};
const COLUNAS = "id,name,bairro,cidade,photos,catalogo,price_aula,price_locacao,plano,pausada,pausada_ate,avisou_que_fechou_em,modalidades,status";

function semAcento(t) {
  return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function slugTexto(t) {
  return semAcento(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
// O mesmo link da ficha do site (caminhoDaFicha no index.html).
export function caminhoDaFicha(c) {
  const nome = slugTexto(c.name).slice(0, 60).replace(/-+$/, "");
  const curto = String(c.id || "").replace(/-/g, "").slice(-8);
  return "/academia/" + [nome, curto].filter(Boolean).join("-");
}
function numero(v) {
  const m = String(v || "").match(/\d+(?:,\d{1,2}(?!\d))?/);
  return m ? Number(m[0].replace(",", ".")) : 0;
}
// O menor valor da academia: o do catálogo ou o preço antigo.
export function menorPreco(c) {
  const itens = Array.isArray(c.catalogo) ? c.catalogo : [];
  const valores = [...itens.map(i => numero(i && i.preco)), numero(c.price_aula), numero(c.price_locacao)].filter(n => n > 0);
  return valores.length ? Math.min(...valores) : 0;
}
function modalidadesDe(c) {
  const itens = Array.isArray(c.catalogo) ? c.catalogo : [];
  const aula = itens.some(i => i && i.tipo !== "locacao") || numero(c.price_aula) > 0;
  const locacao = itens.some(i => i && i.tipo === "locacao") || numero(c.price_locacao) > 0;
  return aula && locacao ? "aulas e locacao" : aula ? "aulas" : locacao ? "locacao" : "";
}
function celula(v) {
  const t = String(v === undefined || v === null ? "" : v).replace(/[\r\n]+/g, " ");
  return /[",]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}
// A foto guardada no banco como "data:image/…" (o site recorta e grava
// assim) não serve para a Meta, que pede um link de imagem: ela sai por esta
// mesma função, em ?foto=<id da academia> (06/11/2026).
export function linkDaFoto(c, site) {
  const foto = String((c.photos || [])[0] || "");
  if (foto.startsWith("data:")) return `${site}/.netlify/functions/catalogo-meta?foto=${encodeURIComponent(c.id)}`;
  return foto.startsWith("/") ? site + foto : foto;
}
export function imagemDoDataUrl(foto) {
  const m = String(foto || "").match(/^data:(image\/[a-z+.-]+);base64,(.+)$/i);
  return m ? { tipo: m[1], bytes: Buffer.from(m[2], "base64") } : null;
}
export function entraNoCatalogo(c, agora = Date.now()) {
  if (!c || c.status !== "published" || c.avisou_que_fechou_em) return false;
  if (c.pausada && (!c.pausada_ate || new Date(c.pausada_ate).getTime() > agora)) return false;
  return !!(Array.isArray(c.photos) && c.photos[0]) && menorPreco(c) > 0;
}
export function csvDoCatalogo(academias, site, agora = Date.now()) {
  const cab = ["id", "title", "description", "availability", "condition", "price", "link", "image_link", "brand", "custom_label_0", "custom_label_1", "custom_label_2", "custom_label_3"];
  const linhas = (academias || []).filter(c => entraNoCatalogo(c, agora)).map(c => {
    const lugar = [c.bairro, c.cidade].filter(Boolean).join(", ");
    const mod = modalidadesDe(c);
    const oQue = mod === "aulas e locacao" ? "Aulas e locação de quadra de tênis" : mod === "locacao" ? "Locação de quadra de tênis" : "Aulas de tênis";
    const foto = String(c.photos[0]);
    return [
      c.id,
      String(c.name || "").slice(0, 150),
      `${oQue}${lugar ? " em " + lugar : ""}. Compare e fale direto com a academia pelo WhatsApp no GuiaTennis.`,
      "in stock", "new",
      `${menorPreco(c).toFixed(2)} BRL`,
      `${site}${caminhoDaFicha(c)}?utm_source=Meta-anuncio&utm_medium=catalogo`,
      linkDaFoto(c, site),
      "GuiaTennis",
      c.cidade || "", c.bairro || "", c.plano || "basico", mod,
    ].map(celula).join(",");
  });
  return [cab.join(","), ...linhas].join("\n") + "\n";
}

export default async (req) => {
  const host = new URL(req.url).hostname;
  const real = host === "guiatennis.com.br" || host === "www.guiatennis.com.br";
  const b = real ? BANCOS.real : BANCOS.teste;
  const site = real ? "https://guiatennis.com.br" : `https://${host}`;
  const idDaFoto = new URL(req.url).searchParams.get("foto");
  if (idDaFoto) {
    if (!/^[0-9a-f-]{8,40}$/i.test(idDaFoto)) return new Response("Foto não encontrada.", { status: 404 });
    try {
      const r = await fetch(`${b.url}/rest/v1/academias?select=photos&status=eq.published&id=eq.${idDaFoto}`, { headers: { apikey: b.chave, Authorization: `Bearer ${b.chave}` } });
      const linha = r.ok ? (await r.json())[0] : null;
      const foto = linha && Array.isArray(linha.photos) ? linha.photos[0] : "";
      const img = imagemDoDataUrl(foto);
      if (img) return new Response(img.bytes, { headers: { "content-type": img.tipo, "cache-control": "public, max-age=86400" } });
      if (/^https?:\/\//.test(foto || "")) return Response.redirect(foto, 302);
    } catch {}
    return new Response("Foto não encontrada.", { status: 404 });
  }
  let academias = [];
  try {
    const r = await fetch(`${b.url}/rest/v1/academias?select=${COLUNAS}&status=eq.published`, { headers: { apikey: b.chave, Authorization: `Bearer ${b.chave}` } });
    if (r.ok) academias = await r.json();
    else return new Response("Catálogo indisponível agora.", { status: 503 });
  } catch { return new Response("Catálogo indisponível agora.", { status: 503 }); }
  return new Response(csvDoCatalogo(academias, site), {
    headers: { "content-type": "text/csv; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
};
