#!/usr/bin/env bash
# Сборка сайта и админки: bash scripts/build-site.sh (нужен Node 20+; то же самое - npm run build)
set -e
cd "$(dirname "$0")/.."
[ -d node_modules/esbuild ] || npm install --no-audit --no-fund
node scripts/build.mjs
