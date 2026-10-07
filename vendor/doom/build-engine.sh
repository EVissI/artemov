#!/bin/bash
# Сборка Chocolate Doom (cloudflare/doom-wasm) для пасхалки: звук и музыка (OPL), без сети и отладки.
# Запуск (из корня проекта, нужен Docker; результат - в vendor/doom/out/, оттуда сжать в vendor/doom - см. README.md):
#   docker run --rm -v "$PWD/vendor/doom:/w" emscripten/emsdk:3.1.74 bash /w/build-engine.sh
set -euo pipefail
apt-get -qq update >/dev/null && apt-get -qq install -y autoconf automake pkg-config >/dev/null 2>&1
cd /tmp && rm -rf src && git clone -q https://github.com/cloudflare/doom-wasm.git src && cd src && git checkout -q 65e0d3a
patch -p1 < /w/emscripten.patch # музыка без проверки чипа OPL (в браузере она висит) и boolean одного размера во всех файлах

# флаги: без SAFE_HEAP / проверок стека / source map (сильно тормозят), рантайм-методы по-новому.
# STACK_SIZE 5MB - как в старых Emscripten (с 3.1.27 по умолчанию 64KB - Doom переполняет стек и портит глобальные
# переменные: «Player 4 left the game», мусор в статусбаре); ASYNCIFY_STACK_SIZE - запас под emscripten_sleep.
NEW='-s INVOKE_RUN=0 -s USE_SDL=2 -s USE_SDL_MIXER=2 -s USE_SDL_NET=2 -s ASSERTIONS=0 -s WASM=1 -s ALLOW_MEMORY_GROWTH=0 -s FORCE_FILESYSTEM=1 -s EXPORTED_RUNTIME_METHODS=[FS,callMain] -s EXIT_RUNTIME=1 -s TOTAL_MEMORY=64MB -s ERROR_ON_UNDEFINED_SYMBOLS=0 -s ASYNCIFY -s STACK_SIZE=5MB -s ASYNCIFY_STACK_SIZE=65536 -s ENVIRONMENT=web -O3 '"${EXTRA_EMFLAGS:-}"
sed -i "s|^EMFLAGS=.*|EMFLAGS=\"$NEW\"|" configure.ac
sed -i 's|CFLAGS="-O$OPT_LEVEL -g |CFLAGS="-O3 |' configure.ac
grep -n '^EMFLAGS=\|CFLAGS="-O' configure.ac

emconfigure autoreconf -fi >/dev/null 2>&1
ac_cv_exeext=".html" emconfigure ./configure --host=none-none-none >/dev/null
emmake make -j"$(nproc)" >/tmp/make.log 2>&1 || { tail -40 /tmp/make.log; exit 1; }

ls -la src/websockets-doom*
O=/w/${OUT_DIR:-out}; mkdir -p "$O" && cp src/websockets-doom.js src/websockets-doom.wasm "$O"/
