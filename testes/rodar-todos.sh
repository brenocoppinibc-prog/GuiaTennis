#!/bin/bash
# Bateria completa: todos os testes do navegador, 4 de cada vez, mais os
# .mjs. Uso: bash testes/rodar-todos.sh [pasta dos resultados]
# No fim: "OK: N  FALHA: M" e os arquivos com falha. O falhas.txt sempre
# aparece na lista: ele força erros de propósito ("ERRO NA PÁGINA").
cd "$(dirname "$0")"
OUT=${1:-/tmp/guiatennis-testes}
rm -rf "$OUT"; mkdir -p "$OUT"
ls *.js | grep -v -e harness.js -e mock.js -e leaflet-stub.js | sed 's/\.js$//' \
  | xargs -P 4 -I{} sh -c 'NODE_PATH=$(npm root -g) timeout 600 node {}.js > '"$OUT"'/{}.txt 2>&1; echo "exit $?" >> '"$OUT"'/{}.txt'
for f in onde pagamento cnpj; do node $f.mjs > "$OUT/$f.mjs.txt" 2>&1; echo "exit $?" >> "$OUT/$f.mjs.txt"; done
echo "OK: $(cat "$OUT"/*.txt | grep -c '^OK')  FALHA: $(cat "$OUT"/*.txt | grep -c '^FALHA')"
grep -l -e '^FALHA' -e 'ERRO NA PÁGINA' -e 'exit [1-9]' "$OUT"/*.txt | xargs -n1 basename
