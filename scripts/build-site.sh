#!/usr/bin/env bash
# Сборка сайта и админки: bash scripts/build-site.sh (Node.js 24 LTS, как в CI)
set -e
cd "$(dirname "$0")/.."
[ -d node_modules/esbuild ] || npm install --no-audit --no-fund
node scripts/build.mjs
