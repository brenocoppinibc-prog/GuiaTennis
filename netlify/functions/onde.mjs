// Cidade aproximada de quem abre o site (pedido do Breno em 14/10/2026:
// "tem como saber antes de fazer o login… a localização aproximada?"), para
// a página inicial mostrar academias perto antes de qualquer busca.
// A Netlify já sabe pela conexão (context.geo): aqui só repassamos a cidade,
// o estado e um ponto arredondado (cerca de 1 km). Nada é guardado.
// Fora do Brasil, ou sem a informação, devolve vazio e o site segue como era.
// Endereço: /.netlify/functions/onde. Sem pacote nenhum para instalar.

export function ondeDaConexao(geo) {
  const g = geo || {};
  const pais = g.country && g.country.code;
  if (pais !== "BR" || !g.city || typeof g.latitude !== "number" || typeof g.longitude !== "number") return {};
  return {
    cidade: String(g.city),
    uf: String((g.subdivision && g.subdivision.code) || ""),
    lat: Math.round(g.latitude * 100) / 100,
    lng: Math.round(g.longitude * 100) / 100,
  };
}

export default async (req, context) => new Response(JSON.stringify(ondeDaConexao(context && context.geo)), {
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" },
});
