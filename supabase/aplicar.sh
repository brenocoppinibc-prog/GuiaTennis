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

# A estrutura inicial foi copiada do próprio banco de verdade: lá ela só
# entra no histórico, sem rodar.
JA_NO_BANCO_REAL="20260928150000"

sql() { psql "$BANCO_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }

sql -c "create schema if not exists supabase_migrations;
        create table if not exists supabase_migrations.schema_migrations
          (version text primary key, statements text[], name text);"
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
