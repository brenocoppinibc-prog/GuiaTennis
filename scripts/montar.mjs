// Monta o site para publicar (regra 229, "deixe o site mais rápido"), como
// fazem o Google, o Booking e o Airbnb: o código sai do HTML para um arquivo
// próprio, compactado (sem os comentários e com nomes curtos) e com um nome
// que muda a cada versão (app.<hash>.js). O celular guarda esse arquivo e, na
// próxima visita, nem baixa nem recompila; o HTML fica pequeno e aparece
// antes. O CSS sai sem os comentários. A fonte continua sendo o index.html:
// os testes e as mudanças seguem nele; só a Netlify roda isto.
//   node scripts/montar.mjs   → pasta _site (a que a Netlify publica)
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { minify } from "terser";

const RAIZ = new URL("..", import.meta.url).pathname;
const SAIDA = join(RAIZ, "_site");
const FORA = new Set([".git", ".github", "node_modules", "_site", "scripts", "testes", "historico", "package.json", "package-lock.json"]);

rmSync(SAIDA, { recursive: true, force: true });
mkdirSync(SAIDA);
for (const nome of readdirSync(RAIZ)) {
  if (!FORA.has(nome) && nome !== "index.html") cpSync(join(RAIZ, nome), join(SAIDA, nome), { recursive: true });
}

let html = readFileSync(join(RAIZ, "index.html"), "utf8");

// O <script> principal (o maior sem src nem type) vira app.<hash>.js, no mesmo
// lugar da página: roda na mesma ordem de antes.
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const principal = scripts.reduce((a, b) => (b[1].length > a[1].length ? b : a));
const { code } = await minify(principal[1], {
  ecma: 2020, module: false, toplevel: false,
  compress: { passes: 1, keep_fargs: true },
  mangle: { keep_fnames: true },
  keep_fnames: true, keep_classnames: true,
  format: { comments: false },
});
if (!code || code.length < 100000) throw new Error("O código compactado ficou pequeno demais: algo deu errado.");
const hash = createHash("sha256").update(code).digest("hex").slice(0, 12);
writeFileSync(join(SAIDA, `app.${hash}.js`), code);
html = html.slice(0, principal.index) + `<script src="/app.${hash}.js"></script>` + html.slice(principal.index + principal[0].length);

// CSS sem comentários e sem espaços sobrando (sem mexer nos seletores).
html = html.replace(/<style>([\s\S]*?)<\/style>/g, (_, css) => "<style>" + css
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ")
  .replace(/\s*([{};])\s*/g, "$1")
  .trim() + "</style>");

// Comentários do HTML (fora dos scripts, que já saíram).
html = html.replace(/<!--(?!\[if)[\s\S]*?-->/g, "");

writeFileSync(join(SAIDA, "index.html"), html);
console.log(`Site montado: index.html ${Math.round(html.length / 1024)} KB, app.${hash}.js ${Math.round(code.length / 1024)} KB.`);
