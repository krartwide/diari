#!/usr/bin/env bash
set -euo pipefail

export DATABASE_URL="${DATABASE_URL:-file:/data/diari.db}"
export PORT="${PORT:-8080}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export AUTH_TRUST_HOST="${AUTH_TRUST_HOST:-true}"

if [[ "$DATABASE_URL" == file:* ]]; then
  db_path="${DATABASE_URL#file:}"
  mkdir -p "$(dirname "$db_path")"
fi

npx prisma migrate deploy
exec npx next start --hostname "$HOSTNAME" --port "$PORT"
