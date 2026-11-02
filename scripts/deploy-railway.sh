#!/usr/bin/env bash
# Deploy Diari to Railway (always-on). Requires: npx railway login (Google/email, not GitHub).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! npx --yes @railway/cli@latest whoami >/dev/null 2>&1; then
  echo "Railway에 먼저 로그인하세요: npx railway login  (Google 또는 이메일)"
  exit 1
fi

AUTH_SECRET_VALUE="${AUTH_SECRET:-$(openssl rand -base64 32)}"
AUTH_SITE_PASSWORD_VALUE="${AUTH_SITE_PASSWORD:-dREL7zCR4H5cN6aG7RTm}"

if [[ ! -f railway.toml ]]; then
  echo "railway.toml 이 필요합니다."
  exit 1
fi

# Link or create project
if ! npx --yes @railway/cli@latest status >/dev/null 2>&1; then
  npx --yes @railway/cli@latest init --name diari || true
fi

npx --yes @railway/cli@latest up --detach

# Volume for SQLite
npx --yes @railway/cli@latest volume list 2>/dev/null | grep -q /data \
  || npx --yes @railway/cli@latest volume add --mount /data || true

DOMAIN="$(npx --yes @railway/cli@latest domain 2>/dev/null | rg -o 'https://[^ ]+' | head -1 || true)"
if [[ -z "${DOMAIN}" ]]; then
  DOMAIN="$(npx --yes @railway/cli@latest domain 2>&1 | rg -o '[a-z0-9.-]+\.up\.railway\.app' | head -1 || true)"
  if [[ -n "${DOMAIN}" && "${DOMAIN}" != https://* ]]; then
    DOMAIN="https://${DOMAIN}"
  fi
fi

npx --yes @railway/cli@latest variables set \
  DATABASE_URL="file:/data/diari.db" \
  AUTH_SECRET="${AUTH_SECRET_VALUE}" \
  AUTH_SITE_PASSWORD="${AUTH_SITE_PASSWORD_VALUE}" \
  ADMIN_EMAILS="kekekim75@gmail.com" \
  AUTH_TRUST_HOST="true" \
  NODE_ENV="production"

if [[ -n "${DOMAIN}" ]]; then
  npx --yes @railway/cli@latest variables set \
    AUTH_URL="${DOMAIN}" \
    NEXTAUTH_URL="${DOMAIN}"
  echo "Live: ${DOMAIN}"
else
  echo "도메인을 대시보드에서 Generate Domain 한 뒤 AUTH_URL / NEXTAUTH_URL을 맞추세요."
fi

npx --yes @railway/cli@latest up --detach
echo "배포 요청을 보냈습니다. railway logs 로 확인하세요."
