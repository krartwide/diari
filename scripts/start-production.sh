#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-43123}"
export DATABASE_URL="${DATABASE_URL:-file:./data/diari.db}"

if [[ "$DATABASE_URL" == file:* ]]; then
  db_path="${DATABASE_URL#file:}"
  mkdir -p "$(dirname "$db_path")"
fi

npx prisma migrate deploy
exec npx next start --hostname 0.0.0.0 --port "$PORT"
