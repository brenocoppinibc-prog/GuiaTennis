#!/usr/bin/env bash
# Depois do SQL, confere pelo mesmo caminho que o site usa — a API do
# Supabase, com a chave pública — que o visitante continua lendo as
# academias com as colunas do index.html e que o sitemap sai em XML.
# Quem chama é o GitHub (.github/workflows/banco.yml):
#
#   API_TESTE=… CHAVE_TESTE=… supabase/conferir.sh teste
#   API_REAL=…  CHAVE_REAL=…  supabase/conferir.sh real
set -euo pipefail
cd "$(dirname "$0")/.."

destino="${1:?diga teste ou real}"
if [ "$destino" = real ]; then api="${API_REAL:?}"; chave="${CHAVE_REAL:?}"; else api="${API_TESTE:?}"; chave="${CHAVE_TESTE:?}"; fi
tmp="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"

# As colunas que o site pede ao banco, lidas do próprio index.html.
colunas="$(grep -o 'const COLUNAS_ACADEMIA_PUBLICAS = "[^"]*"' index.html | sed 's/.*= "//; s/"$//; s/ //g')"

# Logo depois do SQL o Supabase pode levar uns segundos para enxergar a
# mudança: tenta até cinco vezes.
tentar() { for _ in 1 2 3 4 5; do "$@" && return 0; sleep 3; done; return 1; }

ler_academias() {
  codigo="$(curl -sS -o "$tmp/academias.json" -w '%{http_code}' \
    "$api/rest/v1/academias?select=$colunas&status=eq.published&limit=1000" -H "apikey: $chave")"
  [ "$codigo" = 200 ]
}
if tentar ler_academias; then
  echo "visitante lê as academias: $(python3 -c "import json,sys; print(len(json.load(open(sys.argv[1]))))" "$tmp/academias.json") publicadas"
else
  echo "::error::O visitante não consegue ler as academias com as colunas do site (resposta $codigo): $(head -c 300 "$tmp/academias.json")"
  exit 1
fi

# Área da academia: o visitante lê as respostas, e nunca os logins.
ler_respostas() {
  codigo="$(curl -sS -o "$tmp/respostas.json" -w '%{http_code}' \
    "$api/rest/v1/respostas?select=avaliacao_id,texto,created_at&limit=1" -H "apikey: $chave")"
  [ "$codigo" = 200 ]
}
if tentar ler_respostas; then
  echo "visitante lê as respostas das academias"
else
  echo "::error::O visitante não consegue ler as respostas das academias (resposta $codigo): $(head -c 300 "$tmp/respostas.json")"
  exit 1
fi
codigo="$(curl -sS -o "$tmp/acessos.json" -w '%{http_code}' \
  "$api/rest/v1/academia_acessos?select=usuario&limit=1" -H "apikey: $chave")"
if [ "$codigo" = 200 ]; then
  echo "::error::O visitante conseguiu ler a tabela de acessos das academias: $(head -c 300 "$tmp/acessos.json")"
  exit 1
fi
echo "visitante não lê os acessos das academias (resposta $codigo)"

ler_sitemap() {
  # Sem pedir formato, como o Google: tem de vir XML mesmo assim.
  curl -sS -o "$tmp/sitemap.xml" "$api/rest/v1/rpc/sitemap" -H "apikey: $chave" \
    && grep -q "<urlset" "$tmp/sitemap.xml"
}
if tentar ler_sitemap; then
  echo "sitemap: $(grep -o '<loc>' "$tmp/sitemap.xml" | wc -l | tr -d ' ') endereços ($(grep -o '/academia/' "$tmp/sitemap.xml" | wc -l | tr -d ' ') fichas, $(grep -o '/quadras/' "$tmp/sitemap.xml" | wc -l | tr -d ' ') regiões)"
  if grep -q '?court=' "$tmp/sitemap.xml"; then
    echo "::error::O sitemap ainda usa o endereço antigo das fichas (?court=)."
    exit 1
  fi
else
  echo "::error::O sitemap não saiu em XML: $(head -c 300 "$tmp/sitemap.xml")"
  exit 1
fi
