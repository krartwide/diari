#!/usr/bin/env bash
# Static export for GitHub Pages (no API routes).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BACKUP="$(mktemp -d)"
restore() {
  if [[ -d "$BACKUP/api" ]]; then
    rm -rf src/app/api
    mv "$BACKUP/api" src/app/api
  fi
  if [[ -f "$BACKUP/middleware.ts" ]]; then
    mv "$BACKUP/middleware.ts" src/middleware.ts
  fi
  rm -rf "$BACKUP"
}
trap restore EXIT

if [[ -d src/app/api ]]; then
  mv src/app/api "$BACKUP/api"
fi
if [[ -f src/middleware.ts ]]; then
  mv src/middleware.ts "$BACKUP/middleware.ts"
fi

# Login / server-auth pages are unused on Pages; keep them but force client-only data path.
export GITHUB_PAGES=true
npx prisma generate
npx next build

echo "Static site ready in out/ (basePath /diari)"
