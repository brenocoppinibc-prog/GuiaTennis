#!/bin/sh
# Tira o <script> principal do index.html e confere a sintaxe com o Node.
# Rodar sempre antes dos outros testes.
cd "$(dirname "$0")/.." || exit 1
tmp="${TMPDIR:-/tmp}/guiatennis-check.js"
python3 -c "import re;s=open('index.html',encoding='utf-8').read();open('$tmp','w',encoding='utf-8').write(max(re.findall(r'<script>(.*?)</script>',s,re.S),key=len))" \
  && node --check "$tmp" && echo "Sintaxe do index.html ok."
