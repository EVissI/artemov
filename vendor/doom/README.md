# doom.wasm

Пасхалка по Konami коду (`src/doom.js`, `src/doom-worker.js`): Doom в браузере.

- Файл: `doom.wasm` из релиза v0.1.0 проекта https://github.com/jacobenget/doom.wasm
  (https://github.com/jacobenget/doom.wasm/releases/download/v0.1.0/doom-v0.1.0.wasm),
  sha256 `8edfe49a7583fd975199969302d8e9adcf8e714d0af72bf3e672f991fd810faa`.
- В гите лежит сжатым - `doom.wasm.gz` (`gzip -9 -n`): несжатый `.wasm` GitHub не принимает - проверка секретов
  при push (secret scanning push protection) падает на нём с Internal Server Error. `scripts/build.mjs` распаковывает
  его в `site/assets/doom.wasm` и сверяет sha256 выше - не совпало, сборка падает. Обновить файл: скачать релиз,
  `gzip -9 -n -c doom-vX.wasm > doom.wasm.gz`, поменять `WASM_SHA256` в `build.mjs` и хэш здесь.
- Внутри зашит shareware WAD (`DOOM1.WAD`, первый эпизод) - id Software разрешает распространять его бесплатно и без изменений.
- Движок - Chocolate Doom / doomgeneric, лицензия GPL-2.0. Исходники - по ссылке выше (она же есть в оверлее игры).
- Звука в этой сборке нет.
