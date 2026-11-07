#!/usr/bin/env bash
# Static export for GitHub Pages.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export GITHUB_PAGES=true
npx next build

echo "Static site ready in out/ (basePath /diari)"
