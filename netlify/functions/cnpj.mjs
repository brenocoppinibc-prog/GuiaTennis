// O cadastro da empresa na Receita Federal pelo CNPJ (pedido do Breno em
// 26/10/2026: "pegue os melhores dados que garantem isso atualizados
// também"), para o admin conferir uma academia: situação (ativa ou não),
// nome, atividade, endereço, telefone e e-mail que a própria empresa deu à
// Receita. São dados públicos, do cadastro aberto da Receita, atualizado todo
// mês; como os marketplaces brasileiros (Mercado Livre, iFood) conferem o
// CNPJ antes de aceitar uma loja.
// Primeiro a BrasilAPI; sem resposta, a Minha Receita (o mesmo cadastro,
// outro servidor). Nada é guardado.
// Endereço: /.netlify/functions/cnpj?numero=00000000000000. Sem pacote nenhum.

const FONTES = [
  { nome: "BrasilAPI", url: (n) => `https://brasilapi.com.br/api/cnpj/v1/${n}` },
  { nome: "Minha Receita", url: (n) => `https://minhareceita.org/${n}` },
];
const json = (status, obj, cache = "no-store") => new Response(JSON.stringify(obj), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache },
});

// Os 14 números, com os dígitos verificadores certos.
export function cnpjValido(texto) {
  const n = String(texto || "").replace(/\D/g, "");
  if (n.length !== 14 || /^(\d)\1+$/.test(n)) return "";
  const digito = (base) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const resto = base.split("").reduce((s, d, i) => s + Number(d) * pesos[i], 0) % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = digito(n.slice(0, 12));
  const d2 = digito(n.slice(0, 12) + d1);
  return n.endsWith(`${d1}${d2}`) ? n : "";
}

// "1133334444" → "(11) 3333-4444"; vazio, nada.
function telefone(t) {
  const d = String(t || "").replace(/\D/g, "");
  if (d.length < 10) return "";
  return `(${d.slice(0, 2)}) ${d.length === 11 ? d.slice(2, 7) + "-" + d.slice(7) : d.slice(2, 6) + "-" + d.slice(6)}`;
}

// O que a BrasilAPI e a Minha Receita devolvem (os mesmos nomes de campo),
// só com o que o admin usa.
export function resumoDoCnpj(d, fonte) {
  if (!d || !d.cnpj) return null;
  const endereco = [
    [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(" "),
    d.numero, d.complemento,
  ].map(x => String(x || "").trim()).filter(Boolean).join(", ");
  return {
    cnpj: String(d.cnpj).replace(/\D/g, ""),
    razao_social: d.razao_social || "",
    nome_fantasia: d.nome_fantasia || "",
    situacao: d.descricao_situacao_cadastral || "",
    situacao_desde: d.data_situacao_cadastral || "",
    abertura: d.data_inicio_atividade || "",
    atividade: [d.cnae_fiscal, d.cnae_fiscal_descricao].filter(Boolean).join(" · "),
    endereco, bairro: d.bairro || "", cidade: d.municipio || "", uf: d.uf || "",
    cep: String(d.cep || "").replace(/\D/g, ""),
    telefones: [d.ddd_telefone_1, d.ddd_telefone_2].map(telefone).filter(Boolean),
    email: (d.email || "").toLowerCase(),
    fonte,
  };
}

export default async (req) => {
  const numero = cnpjValido(new URL(req.url).searchParams.get("numero"));
  if (!numero) return json(400, { erro: "CNPJ inválido: confira os 14 números." });
  let naoAchou = false;
  for (const f of FONTES) {
    try {
      const r = await fetch(f.url(numero), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
      if (r.status === 404) { naoAchou = true; continue; }
      if (!r.ok) continue;
      const resumo = resumoDoCnpj(await r.json(), f.nome);
      if (resumo) return json(200, resumo, "public, max-age=86400");
    } catch (e) {
      console.error("cnpj:", f.nome, e && e.message);
    }
  }
  return naoAchou
    ? json(404, { erro: "A Receita não tem esse CNPJ." })
    : json(502, { erro: "Não consegui falar com a Receita agora. Tente de novo em instantes." });
};
