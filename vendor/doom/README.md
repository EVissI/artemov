# Doom (пасхалка)

Пасхалка по Konami коду: `src/main.js` -> `src/doom.js` (оверлей, управление) -> iframe `src/doom-frame.html` -> движок отсюда.
Движок - Chocolate Doom из [cloudflare/doom-wasm](https://github.com/cloudflare/doom-wasm) (GPL-2.0), собранный нами под
Emscripten: со звуковыми эффектами и музыкой (эмуляция OPL / AdLib), без сети.

## Файлы

| Файл | Что это |
|---|---|
| `engine.js` | JS-обвязка Emscripten (из сборки как есть) |
| `engine.wasm.gz` | движок, sha256 распакованного `c5a89f6c6b316bd93fa8948f71ef6cf489b5b1c420d586c729ce7f4e2b13b7c2` |
| `doom1.wad.gz` | shareware DOOM1.WAD v1.9 (эпизод 1), md5 `f0cefca49926d00903cf57551d901abe`, sha256 распакованного `1d7d43be501e67d927e415e0b8f3e29c3bf33075e859721816f652a526cac771`. id Software разрешает распространять его бесплатно и без изменений |
| `default.cfg` | настройки: клавиши под `doom.js` (WASD, стрелки, Ctrl - огонь, пробел - открыть, Shift - бег, Alt - стрейф, F12 - полный экран, его никто не шлёт), звук и музыка - SB/OPL |
| `build-engine.sh` | сборка движка (Docker, emsdk 3.1.74, коммит cloudflare `65e0d3a`) |
| `emscripten.patch` | наши правки исходников, применяет `build-engine.sh` |

Бинарники в гите только сжатыми (`gzip -9 -n`): несжатый `.wasm` GitHub не принимает - проверка секретов при push
(secret scanning push protection) падает на нём с Internal Server Error. `scripts/build.mjs` распаковывает их в
`site/assets/doom/`, сверяет sha256 (`DOOM_BIN`) - не совпало, сборка падает - и ставит `?v=<хэш>` на все адреса.

## Что поправлено относительно cloudflare/doom-wasm

- Флаги: без `SAFE_HEAP`, проверок стека и source map (тормозят), `EXPORTED_RUNTIME_METHODS` вместо удалённого
  `EXTRA_EXPORTED_RUNTIME_METHODS`, `STACK_SIZE=5MB` (как в старых Emscripten), `ASYNCIFY_STACK_SIZE=64KB`.
- `src/doomtype.h`: `boolean` везде enum. Свежие заголовки Emscripten тянут `stdbool.h`, и в файлах с ними
  `boolean` был 1 байт, в остальных 4 - `player_t` расходился между файлами (мусор в статусбаре, «Player 4 left the game»).
- `opl/opl.c`: без проверки чипа OPL. Она ждёт таймер из аудиоколбэка через `SDL_CondWait` - в однопоточном браузере
  это вечное зависание (а до жеста пользователя звук не идёт вовсе). Программный эмулятор OPL есть всегда.
- Запуск без `-nomusic` - музыка играет.

## Пересобрать движок

Из корня проекта, нужен Docker:

```bash
docker run --rm -v "$PWD/vendor/doom:/w" emscripten/emsdk:3.1.74 bash /w/build-engine.sh
cp vendor/doom/out/websockets-doom.js vendor/doom/engine.js
gzip -9 -n -c vendor/doom/out/websockets-doom.wasm > vendor/doom/engine.wasm.gz
sha256sum vendor/doom/out/websockets-doom.wasm   # -> DOOM_BIN в scripts/build.mjs и таблица выше
```

`vendor/doom/out*/` в `.gitignore`. Отладочная сборка: `-e EXTRA_EMFLAGS="..." -e OUT_DIR=out-dbg`
(`SAFE_HEAP` здесь бесполезен: падает на законных невыровненных чтениях WAD в самом начале).
