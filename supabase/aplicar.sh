#!/usr/bin/env bash
# Aplica no banco o SQL de supabase/migrations que ainda não rodou lá.
# Quem chama é o GitHub (.github/workflows/banco.yml), mas roda igual à mão:
#
#   BANCO_URL='postgresql://…' supabase/aplicar.sh teste
#   BANCO_URL='postgresql://…' supabase/aplicar.sh real
#
# Cada arquivo roda numa transação só, junto com o registro dele no
# histórico (supabase_migrations.schema_migrations, a mesma tabela que o
# Supabase usa): ou entra inteiro e fica anotado, ou não entra nada.
set -euo pipefail
cd "$(dirname "$0")/.."

destino="${1:?diga teste ou real}"
[ "$destino" = teste ] || [ "$destino" = real ] || { echo "destino deve ser teste ou real" >&2; exit 2; }
: "${BANCO_URL:?falta BANCO_URL}"
# Colado pelo celular, o endereço às vezes vem com espaço ou quebra de linha.
BANCO_URL="$(printf '%s' "$BANCO_URL" | tr -d '\r\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

# A estrutura inicial foi copiada do próprio banco de verdade: lá ela só
# entra no histórico, sem rodar.
JA_NO_BANCO_REAL="20260928150000"

sql() { psql "$BANCO_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }

# Confere o endereço antes de conectar, sem mostrar a senha: é o que
# explica um "password authentication failed" sem ninguém ver o segredo.
python3 - "$BANCO_URL" <<'PY' || true
import sys, re, urllib.parse as u
url = sys.argv[1].strip()
esquema, _, resto = url.partition("://")
credencial, _, servidor = resto.rpartition("@")
usuario, _, senha = credencial.partition(":")
m = re.match(r"^([^:/?#]*)(?::(\d+))?", servidor)
host, porta = (m.group(1), m.group(2)) if m else ("", None)
senha_lida = u.unquote(senha)
avisos = []
if esquema not in ("postgresql", "postgres"):
    avisos.append("o endereço deve começar com postgresql://")
if not host.endswith("pooler.supabase.com"):
    avisos.append("use o endereço Session pooler (…pooler.supabase.com)")
if porta != "5432":
    avisos.append("a porta deve ser 5432, a do Session pooler")
if usuario == "postgres":
    avisos.append("o usuário deve ser postgres.<id do projeto>, como no Session pooler")
if not senha:
    avisos.append("falta a senha entre postgres.<id>: e o @")
if "[" in senha or "]" in senha or "YOUR-PASSWORD" in senha:
    avisos.append("sobrou [YOUR-PASSWORD] ou colchete: deixe só a senha")
elif re.search(r"[^A-Za-z0-9%._~-]", senha):
    avisos.append("a senha tem caractere especial ou espaço: troque por uma só com letras e números")
print(f"endereço: usuário {usuario or '?'} · servidor {host or '?'} · porta {porta or '?'} · senha com {len(senha_lida)} caracteres")
for a in avisos:
    print("ATENÇÃO:", a)
PY

if ! sql -c "create schema if not exists supabase_migrations;
        create table if not exists supabase_migrations.schema_migrations
          (version text primary key, statements text[], name text);"; then
  echo "O banco recusou a conexão. Se foi a senha: confira se ela é a do banco"
  echo "(Project Settings → Database), sem colchetes, e espere uns minutos"
  echo "depois de trocar — o Supabase demora um pouco para valer a senha nova."
  exit 1
fi
ja_rodaram="$(sql -At -c "select version from supabase_migrations.schema_migrations")"

for arquivo in supabase/migrations/*.sql; do
  nome="$(basename "$arquivo" .sql)"
  versao="${nome%%_*}"
  if grep -qx "$versao" <<<"$ja_rodaram"; then
    echo "já estava no banco: $nome"
    continue
  fi
  anotar="insert into supabase_migrations.schema_migrations (version, name) values ('$versao', '${nome#*_}');"
  if [ "$destino" = real ] && grep -qw "$versao" <<<"$JA_NO_BANCO_REAL"; then
    sql -c "$anotar"
    echo "anotada sem rodar (veio do banco de verdade): $nome"
    continue
  fi
  sql -1 -f "$arquivo" -c "$anotar"
  echo "aplicada: $nome"
done

# O banco de teste nasce com as academias de exemplo; depois disso, não
# mexe mais nelas (quem testa pode ter cadastrado outras).
if [ "$destino" = teste ] && [ "$(sql -At -c "select count(*) from public.academias")" = 0 ]; then
  sql -1 -f supabase/seed.sql
  echo "academias de exemplo gravadas"
fi
