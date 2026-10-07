/* Пасхалка: Doom (doom.wasm, shareware WAD внутри) в отдельном потоке.
   Почему воркер: «оплывание» экрана Doom считает целиком за один tickGame() - в основном потоке страница
   висела бы секунду-две. Кадр рисуется в OffscreenCanvas, если он есть, иначе буфер уходит в страницу.
   Сообщения: in - { init, wasm, canvas? } | { key, down } | { pause } | { resume }; out - { progress } | { size } | { frame } | { ready } | { error } */
var X = null, mem = null, ctx = null, img = null, W = 0, H = 0, timer = 0;
var clock = 0, since = 0, paused = true; // время игры стоит, пока оверлей закрыт

function now() { return paused ? clock : clock + (performance.now() - since); }
function text(p, n) { return new TextDecoder().decode(new Uint8Array(mem.buffer, p, n).slice()); }

function draw(ptr) {
  var src = new Uint32Array(mem.buffer, ptr, W * H);
  var out = img ? new Uint32Array(img.data.buffer) : new Uint32Array(W * H);
  // Doom отдаёт пиксели BGRA (ARGB в little-endian), холсту нужен RGBA
  for (var i = 0; i < src.length; i++) { var p = src[i]; out[i] = 0xff000000 | ((p & 0xff) << 16) | (p & 0xff00) | ((p >>> 16) & 0xff); }
  if (ctx) ctx.putImageData(img, 0, 0);
  else postMessage({ frame: out.buffer, w: W, h: H }, [out.buffer]);
}

function loop() {
  clearInterval(timer);
  timer = setInterval(function () { try { X.tickGame(); } catch (e) { clearInterval(timer); postMessage({ error: String(e && e.message || e) }); } }, 1000 / 35);
}

async function load(url, canvas) {
  var res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  var total = Number(res.headers.get('Content-Length')) || 0, got = 0, parts = [];
  var rd = res.body.getReader();
  for (;;) {
    var r = await rd.read(); if (r.done) break;
    parts.push(r.value); got += r.value.length;
    if (total) postMessage({ progress: Math.min(1, got / total) });
  }
  var bin = new Uint8Array(got), o = 0; parts.forEach(function (p) { bin.set(p, o); o += p.length; });
  var noop = function () {};
  var mod = await WebAssembly.instantiate(bin, {
    loading: {
      onGameInit: function (w, h) {
        W = w; H = h;
        if (canvas) { canvas.width = w; canvas.height = h; ctx = canvas.getContext('2d', { alpha: false }); img = ctx.createImageData(w, h); }
        postMessage({ size: [w, h] });
      },
      wadSizes: noop, readWads: noop, // ничего не даём - грузится зашитый shareware WAD
    },
    ui: { drawFrame: draw },
    runtimeControl: { timeInMilliseconds: function () { return BigInt(Math.trunc(now())); } },
    console: { onInfoMessage: noop, onErrorMessage: function (p, n) { console.warn('[doom] ' + text(p, n)); } },
    gameSaving: { sizeOfSaveGame: function () { return 0; }, readSaveGame: function () { return 0; }, writeSaveGame: function () { return 0; } },
  });
  X = mod.instance.exports; mem = X.memory;
  var keys = {};
  ['LEFTARROW', 'RIGHTARROW', 'UPARROW', 'DOWNARROW', 'STRAFE_L', 'STRAFE_R', 'FIRE', 'USE', 'SHIFT', 'TAB', 'ESCAPE', 'ENTER', 'BACKSPACE', 'ALT']
    .forEach(function (k) { keys[k] = X['KEY_' + k].value; });
  paused = false; since = performance.now();
  X.initGame();
  loop();
  postMessage({ ready: keys });
}

onmessage = function (e) {
  var m = e.data;
  if (m.init) load(m.wasm, m.canvas).catch(function (err) { postMessage({ error: String(err && err.message || err) }); });
  else if (!X) return;
  else if ('key' in m) { if (m.down) X.reportKeyDown(m.key); else X.reportKeyUp(m.key); }
  else if (m.pause && !paused) { clock = now(); paused = true; clearInterval(timer); }
  else if (m.resume && paused) { since = performance.now(); paused = false; loop(); }
};
