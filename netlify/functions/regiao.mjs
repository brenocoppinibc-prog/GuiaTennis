// A página de cada região já pronta para o Google (regra 321, 23/11/2026:
// "faça essa página do Google"). Antes, /quadras/<cidade>/<bairro> devolvia o
// index.html vazio e o site montava a tela no navegador: o Google só via o
// conteúdo depois de rodar o JavaScript, e o WhatsApp, o Facebook e o Bing
// mostravam o título padrão. Como o trivago, o Booking e o TripAdvisor, esta
// função entrega o mesmo index.html com o título, a descrição, o link
// canônico, as prévias (og:), os dados estruturados (o caminho e a lista) e,
// dentro do #app, a página da região escrita (título, resumo, preços e as
// academias com link). O site, ao carregar, desenha a tela por cima, com o
// texto completo (infoDaRegiao no index.html). Só dados públicos da ficha.
// Endereços: /quadras e /quadras/* (config.path, no lugar do redirecionamento
// do netlify.toml). Sem pacote nenhum.
import { BANCOS, caminhoDaFicha } from "./catalogo-meta.mjs";

const COLUNAS = "id,name,bairro,cidade,catalogo,price_aula,price_locacao,cobertura,tipo,modalidades,pausada,pausada_ate,avisou_que_fechou_em,status";
const EXTRAS = new Set(["eventos", "ranking"]);

function semAcento(t) {
  return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
}
export function slugTexto(t) {
  return semAcento(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function esc(t) {
  return String(t === undefined || t === null ? "" : t).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}
function numero(v) {
  const m = String(v || "").match(/\d+(?:,\d{1,2}(?!\d))?/);
  return m ? Number(m[0].replace(",", ".")) : 0;
}
function reais(v) {
  return "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
}
function plural(n, um, varios) { return n === 1 ? um : varios; }

// /quadras/sao-paulo/pinheiros → { cidade: "sao-paulo", bairro: "pinheiros" }
export function regiaoDoCaminho(caminho) {
  const partes = String(caminho || "").split("?")[0].split("/").filter(Boolean).map(p => decodeURIComponent(p));
  if (partes[0] !== "quadras" || !partes[1]) return null;
  return { cidade: slugTexto(partes[1]), bairro: partes[2] ? slugTexto(partes[2]) : "" };
}
export function noAr(c, agora = Date.now()) {
  if (!c || c.status !== "published" || c.avisou_que_fechou_em) return false;
  return !(c.pausada && (!c.pausada_ate || new Date(c.pausada_ate).getTime() > agora));
}
// O menor valor da aula avulsa e da hora de locação de cada academia, como o
// "a partir de" do site (o catálogo ou os preços antigos).
export function precosDaAcademia(c) {
  const itens = (Array.isArray(c.catalogo) ? c.catalogo : []).filter(i => i && !EXTRAS.has(i.tipo));
  const aula = itens.filter(i => i.tipo !== "locacao" && i.cobranca !== "mensal").map(i => numero(i.preco)).filter(n => n > 0);
  const hora = itens.filter(i => i.tipo === "locacao").map(i => numero(i.preco)).filter(n => n > 0);
  if (!itens.some(i => i.tipo !== "locacao") && numero(c.price_aula)) aula.push(numero(c.price_aula));
  if (!itens.some(i => i.tipo === "locacao") && numero(c.price_locacao)) hora.push(numero(c.price_locacao));
  return { aula: aula.length ? Math.min(...aula) : 0, hora: hora.length ? Math.min(...hora) : 0 };
}
function faixa(v) {
  if (!v.length) return null;
  const o = v.slice().sort((x, y) => x - y);
  return { min: o[0], tipico: o[Math.floor((o.length - 1) / 2)], n: o.length };
}
export function dadosDaRegiao(academias, avaliacoes, slugs, agora = Date.now()) {
  const todas = (academias || []).filter(c => noAr(c, agora) && slugTexto(c.cidade) === slugs.cidade);
  const lista = todas.filter(c => !slugs.bairro || slugTexto(c.bairro) === slugs.bairro);
  const notas = {};
  (avaliacoes || []).forEach(a => { if (a && a.academia_id) (notas[a.academia_id] = notas[a.academia_id] || []).push(Number(a.stars) || 0); });
  const itens = lista.map(c => {
    const n = notas[c.id] || [];
    return { c, precos: precosDaAcademia(c), nota: n.length ? n.reduce((s, x) => s + x, 0) / n.length : 0, avaliacoes: n.length };
  }).sort((a, b) => b.nota - a.nota || b.avaliacoes - a.avaliacoes || String(a.c.name).localeCompare(String(b.c.name), "pt-BR"));
  const cidade = (todas[0] || {}).cidade || "";
  const bairro = slugs.bairro ? (lista[0] || {}).bairro || "" : "";
  return {
    cidade, bairro, lugar: [bairro, cidade].filter(Boolean).join(", "), itens,
    aula: faixa(itens.map(x => x.precos.aula).filter(v => v > 0)),
    hora: faixa(itens.map(x => x.precos.hora).filter(v => v > 0)),
    cobertas: lista.filter(c => (Array.isArray(c.cobertura) ? c.cobertura : []).includes("coberta")).length,
  };
}
// O título e a descrição, iguais aos do site (seoDaPagina no index.html).
export function seoDaRegiao(d) {
  const n = d.itens.length;
  return {
    titulo: `Quadras e academias de tênis em ${d.lugar} | GuiaTennis`,
    descricao: `${n} ${plural(n, "academia", "academias")} de tênis em ${d.lugar} e mais perto: compare preço por hora, estrutura e avaliações, e fale direto com a academia.`,
  };
}
export function conteudoDaRegiao(d) {
  const nome = d.bairro || d.cidade;
  const linhaPreco = (t, f, un) => f ? `<li>${t}: a partir de ${reais(f.min)}${un}${f.n > 1 ? ` (valor típico: ${reais(f.tipico)}${un})` : ""}</li>` : "";
  return `
<section class="regiao-ssr">
  <h1 class="regiao-titulo display">Quadras e academias de tênis em ${esc(d.lugar)}</h1>
  <p>${d.itens.length} ${plural(d.itens.length, "academia", "academias")} de tênis em ${esc(nome)} no GuiaTennis${d.cobertas ? `, ${d.cobertas} com quadra coberta` : ""}. Compare preço, estrutura e avaliações e fale direto com a academia pelo WhatsApp, sem taxa.</p>
  ${d.aula || d.hora ? `<h2>Quanto custa jogar tênis em ${esc(nome)}</h2><ul>${linhaPreco("Aula avulsa", d.aula, "")}${linhaPreco("Locação da quadra", d.hora, " por hora")}</ul>` : ""}
  <h2>Academias de tênis em ${esc(nome)}</h2>
  <ul>${d.itens.slice(0, 60).map(x => `<li><a href="${esc(caminhoDaFicha(x.c))}">${esc(x.c.name)}</a>${x.c.bairro && !d.bairro ? ` · ${esc(x.c.bairro)}` : ""}${x.precos.aula ? ` · aula a partir de ${reais(x.precos.aula)}` : x.precos.hora ? ` · quadra a partir de ${reais(x.precos.hora)} por hora` : ""}${x.avaliacoes ? ` · nota ${x.nota.toFixed(1).replace(".", ",")} (${x.avaliacoes})` : ""}</li>`).join("")}</ul>
</section>`;
}
// Os dados estruturados (o caminho e a lista), os mesmos de ldDaRegiao no site.
export function ldDaRegiao(d, site) {
  const caminho = [{ nome: "GuiaTennis", url: site + "/" }, { nome: `Quadras em ${d.cidade}`, url: `${site}/quadras/${slugTexto(d.cidade)}` }];
  if (d.bairro) caminho.push({ nome: d.bairro, url: `${site}/quadras/${slugTexto(d.cidade)}/${slugTexto(d.bairro)}` });
  return [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: caminho.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.nome, item: x.url })) },
    { "@context": "https://schema.org", "@type": "ItemList", name: `Quadras e academias de tênis em ${d.lugar}`, numberOfItems: d.itens.length,
      itemListElement: d.itens.slice(0, 30).map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.c.name, url: site + caminhoDaFicha(x.c) })) },
  ];
}
function trocar(html, re, novo) { return re.test(html) ? html.replace(re, novo) : html; }
// O index.html com a região: título, descrição, canônico, prévias, dados e conteúdo.
export function paginaDaRegiao(base, d, site) {
  const endereco = `${site}/quadras/${slugTexto(d.cidade)}${d.bairro ? "/" + slugTexto(d.bairro) : ""}`;
  const { titulo, descricao } = seoDaRegiao(d);
  let html = base;
  html = trocar(html, /<title>[^<]*<\/title>/, `<title>${esc(titulo)}</title>`);
  html = trocar(html, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(descricao)}">`);
  html = trocar(html, /<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${esc(endereco)}"`);
  html = trocar(html, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(titulo)}">`);
  html = trocar(html, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(descricao)}">`);
  html = trocar(html, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${esc(endereco)}">`);
  html = trocar(html, /<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${esc(titulo)}">`);
  html = trocar(html, /<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${esc(descricao)}">`);
  const ld = JSON.stringify(ldDaRegiao(d, site)).replace(/</g, "\\u003c");
  html = html.replace("</head>", `<script type="application/ld+json" id="ld-regiao">${ld}</script>\n</head>`);
  return html.replace('<div class="container" id="app"></div>', `<div class="container" id="app">${conteudoDaRegiao(d)}</div>`);
}
// Região sem academia: a página do site, fora do Google.
export function paginaSemAcademia(base) {
  return base.replace("</head>", `<meta name="robots" content="noindex, follow">\n</head>`);
}

export default async (req) => {
  const url = new URL(req.url);
  const real = url.hostname === "guiatennis.com.br" || url.hostname === "www.guiatennis.com.br";
  const b = real ? BANCOS.real : BANCOS.teste;
  const site = real ? "https://guiatennis.com.br" : url.origin;
  let base = "";
  try {
    const r = await fetch(new URL("/index.html", url));
    if (r.ok) base = await r.text();
  } catch {}
  if (!base) return Response.redirect(new URL("/", url), 302);
  const cabecalhos = {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "public, max-age=0, must-revalidate",
    "netlify-cdn-cache-control": "public, durable, max-age=3600, stale-while-revalidate=86400",
  };
  const slugs = regiaoDoCaminho(url.pathname);
  if (!slugs) return new Response(base, { headers: cabecalhos });
  try {
    const h = { apikey: b.chave, Authorization: `Bearer ${b.chave}` };
    const [ra, rv] = await Promise.all([
      fetch(`${b.url}/rest/v1/academias?select=${COLUNAS}&status=eq.published`, { headers: h }),
      fetch(`${b.url}/rest/v1/avaliacoes?select=academia_id,stars`, { headers: h }),
    ]);
    if (!ra.ok) throw new Error("academias");
    const d = dadosDaRegiao(await ra.json(), rv.ok ? await rv.json() : [], slugs);
    if (!d.itens.length) return new Response(paginaSemAcademia(base), { headers: cabecalhos });
    return new Response(paginaDaRegiao(base, d, site), { headers: cabecalhos });
  } catch {
    // Sem o banco: a página do site, sem guardar no cache da Netlify.
    return new Response(base, { headers: { ...cabecalhos, "netlify-cdn-cache-control": "no-store" } });
  }
};

export const config = { path: ["/quadras", "/quadras/*"] };
