# Junta os textos do site (index.html) e das funções do banco local num arquivo,
# uma frase por linha, para o Checa.java. Uso: python3 extrai.py <saída>
import re, sys, subprocess, html, os
s = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'index.html'), encoding='utf8').read()
s = re.sub(r'<style>.*?</style>', ' ', s, flags=re.S)
s = re.sub(r'/\*.*?\*/', ' ', s, flags=re.S)
s = re.sub(r'(?m)^\s*//.*$', ' ', s)
s = re.sub(r'<!--.*?-->', ' ', s, flags=re.S)
def limpa(t):
    # tira ${...} (com chaves aninhadas)
    out, i, prof = [], 0, 0
    while i < len(t):
        if t.startswith('${', i):
            prof = 1; i += 2
            while i < len(t) and prof:
                if t[i] == '{': prof += 1
                elif t[i] == '}': prof -= 1
                i += 1
            out.append(' … ')
            continue
        out.append(t[i]); i += 1
    t = ''.join(out)
    t = re.sub(r'<[^>]+>', '\n', t)
    return html.unescape(t.replace('\\"', '"').replace("\\'", "'").replace('\\n', '\n'))
pedacos = []
for m in re.finditer(r'`((?:\\.|[^`\\])*)`|"((?:\\.|[^"\\\n])*)"|\'((?:\\.|[^\'\\\n])*)\'', s):
    t = m.group(1) if m.group(1) is not None else (m.group(2) if m.group(2) is not None else m.group(3))
    for linha in limpa(t).split('\n'):
        linha = re.sub(r'\s+', ' ', linha).strip(' …')
        if len(linha.split()) < 4 or not re.search(r'[a-záéíóúãõç]{3}', linha): continue
        if re.search(r'=>|[{};]|\b(const|function|return|querySelector|var\(|px\b|rgba|data-)\b', linha): continue
        if re.match(r'^[a-z0-9_.-]+$', linha): continue
        pedacos.append(linha)
# Funções do banco (e-mails e mensagens), como estão no banco local.
try:
    src = subprocess.run(['psql', 'postgresql://postgres@127.0.0.1:5433/postgres', '-At', '-c', "select string_agg(prosrc, E'\\n') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'"], capture_output=True, text=True).stdout
    for m in re.finditer(r"'((?:''|[^'])*)'", src):
        for linha in limpa(m.group(1).replace("''", "'")).split('\n'):
            linha = re.sub(r'\s+', ' ', linha).strip(' …')
            if len(linha.split()) >= 4 and re.search(r'[a-záéíóúãõç]{3}', linha) and not re.search(r'[{};=]|\bselect\b|\bfrom\b|%[sI]', linha):
                pedacos.append(linha)
except Exception as e:
    print('sem banco', e, file=sys.stderr)
vistos, final = set(), []
for p in pedacos:
    if p not in vistos: vistos.add(p); final.append(p)
open(sys.argv[1], 'w', encoding='utf8').write('\n'.join(final))
print(len(final))
