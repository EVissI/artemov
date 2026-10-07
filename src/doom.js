/* Пасхалка по Konami коду: Doom поверх страницы (main.js грузит этот файл только после ввода кода).
   Сама игра - в воркере (doom-worker.js), здесь оверлей, клавиатура и экранный джойстик для телефона.
   Закрыть - «Выход» или Shift+Esc (Esc - меню Doom). Закрытый оверлей ставит игру на паузу, повторный код - продолжает. */
(function () {
  if (window.AA_doom) return;
  var WORKER = '/assets/doom-worker.js', WASM = '/assets/doom.wasm'; // build.mjs дописывает ?v=<хэш>
  var SRC = 'https://github.com/jacobenget/doom.wasm';
  var T = {
    ru: { close: 'Выход', loading: 'Загрузка', fail: 'Не запустилось', old: 'Браузер не тянет Doom', fire: 'Огонь', use: 'Открыть', weap: 'Оружие', menu: 'Меню', ok: 'ОК', yes: 'Да', run: 'Бег',
      hint: 'WASD или стрелки - ходить · F, Ctrl или клик - огонь · E или пробел - открыть · Shift - бег · 1-7 - оружие · Esc - меню · Shift+Esc - выйти', src: 'Исходники движка (GPL-2.0)' },
    en: { close: 'Exit', loading: 'Loading', fail: 'Failed to start', old: 'This browser can\'t run Doom', fire: 'Fire', use: 'Use', weap: 'Weapon', menu: 'Menu', ok: 'OK', yes: 'Yes', run: 'Run',
      hint: 'WASD or arrows - move · F, Ctrl or click - fire · E or space - use · Shift - run · 1-7 - weapons · Esc - menu · Shift+Esc - exit', src: 'Engine source (GPL-2.0)' },
  };
  var t = function (k) { var l = document.documentElement.lang === 'en' ? 'en' : 'ru'; return T[l][k]; };

  var CSS = [
    '.aa-doom{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;background:#050404;color:#b3b3b3;font-family:"Times New Roman",Tinos,Times,serif;opacity:0;transition:opacity .35s;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}',
    '.aa-doom.is-on{opacity:1}',
    '.aa-doom[hidden],.aa-doom__load[hidden]{display:none}',
    '.aa-doom__bar{display:flex;align-items:center;gap:16px;padding:10px 16px;flex:none}',
    '.aa-doom__hint{flex:1;font-size:12px;letter-spacing:.04em;color:#7a7470;line-height:1.35}',
    '.aa-doom__btn{font:inherit;text-transform:uppercase;letter-spacing:.14em;font-size:14px;color:#b3b3b3;background:none;border:0;padding:8px 4px;cursor:pointer}',
    '.aa-doom__btn:hover,.aa-doom__btn:focus-visible{color:#fff;outline:none}',
    '.aa-doom__stage{position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center}',
    '.aa-doom__screen{display:block;background:#000;image-rendering:pixelated;box-shadow:0 0 0 1px rgba(255,255,255,.08),0 0 60px rgba(0,0,0,.9)}',
    '.aa-doom__load{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-transform:uppercase;letter-spacing:.32em;font-size:13px}',
    '.aa-doom__load i{display:block;width:180px;height:2px;background:rgba(255,255,255,.1)}',
    '.aa-doom__load b{display:block;height:100%;width:100%;background:#b3261e;transform-origin:0 50%;transform:scaleX(0);transition:transform .2s}',
    '.aa-doom__foot{flex:none;padding:6px 16px 10px;font-size:11px;letter-spacing:.04em}',
    '.aa-doom__foot a{color:#7a7470}',
    '.aa-doom__pad{display:none}',
    /* телефон: джойстик слева, кнопки справа; в портрете - под экраном, в альбомной - поверх краёв экрана */
    '.aa-doom--touch .aa-doom__hint,.aa-doom--touch .aa-doom__foot{display:none}',
    '.aa-doom--touch .aa-doom__pad{display:flex;flex:none;justify-content:space-between;align-items:flex-end;gap:12px;padding:12px 16px calc(16px + env(safe-area-inset-bottom));touch-action:none}',
    '@media (orientation:landscape){.aa-doom--touch .aa-doom__pad{position:absolute;left:0;right:0;bottom:0;padding:0 calc(12px + env(safe-area-inset-right)) 12px calc(12px + env(safe-area-inset-left));pointer-events:none}.aa-doom--touch .aa-doom__pad>*{pointer-events:auto}.aa-doom--touch .aa-doom__pad{z-index:3}.aa-doom--touch .aa-doom__k,.aa-doom--touch .aa-doom__stick{background:rgba(8,7,6,.62)}.aa-doom--touch .aa-doom__k.is-down{background:rgba(60,56,52,.8)}.aa-doom--touch .aa-doom__bar{position:absolute;top:0;right:0;z-index:2;padding:6px 12px}}',
    '.aa-doom__stick{position:relative;flex:none;width:112px;height:112px;border-radius:50%;background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);touch-action:none}',
    '.aa-doom__knob{position:absolute;left:50%;top:50%;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;background:rgba(255,255,255,.16);box-shadow:inset 0 0 0 1px rgba(255,255,255,.3)}',
    '.aa-doom__keys{flex:none;display:flex;flex-direction:column;gap:10px;align-items:flex-end}',
    '.aa-doom__row{display:flex;gap:8px;align-items:flex-end}',
    '.aa-doom__k{font:inherit;text-transform:uppercase;letter-spacing:.1em;font-size:11px;color:#b3b3b3;background:rgba(255,255,255,.05);border:0;box-shadow:inset 0 0 0 1px rgba(255,255,255,.16);border-radius:10px;min-width:52px;height:38px;padding:0 6px;touch-action:none}',
    '.aa-doom__k--big{width:78px;height:78px;border-radius:50%;font-size:13px;color:#fff;box-shadow:inset 0 0 0 1px rgba(179,38,30,.75)}',
    '.aa-doom__k--mid{width:68px;height:64px;font-size:10px}',
    '.aa-doom__k.is-down{background:rgba(255,255,255,.18);color:#fff}',
    'html.aa-doom-open,html.aa-doom-open body{overflow:hidden}',
    '@media (prefers-reduced-motion:reduce){.aa-doom,.aa-doom__load b{transition:none}}',
  ].join('\n');

  var root, canvas, ctx2d, load, bar, worker, K = null, size = [640, 400], open = false, lastFocus = null;
  var held = {}; // зажатые клавиши Doom -> счётчик источников (клавиатура, мышь, джойстик)

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; }
  function send(k, down) {
    if (k == null || !worker) return;
    var n = held[k] || 0;
    if (down) { held[k] = n + 1; if (!n) worker.postMessage({ key: k, down: true }); }
    else if (n) { held[k] = n - 1; if (n === 1) { delete held[k]; worker.postMessage({ key: k, down: false }); } }
  }
  // короткий тап/клик короче тика Doom (1/35 с) игра не заметит - отпускание держим не раньше чем через 90 мс
  function hold(k) { send(k, true); var t0 = performance.now(); return function () { setTimeout(function () { send(k, false); }, Math.max(0, 90 - (performance.now() - t0))); }; }
  function tap(k) { if (k == null || !worker) return; worker.postMessage({ key: k, down: true }); setTimeout(function () { worker.postMessage({ key: k, down: false }); }, 60); }
  function releaseAll() { for (var k in held) worker.postMessage({ key: +k, down: false }); held = {}; pads.forEach(function (f) { f(); }); }
  var pads = []; // сброс экранных контролов

  /* клавиатура: по e.code, раскладка не важна; буквы WASD/E/F уходят ещё и буквой - чтобы работали чит-коды (iddqd) */
  function codeKeys(e) {
    if (!K) return null;
    var c = e.code, out = [];
    var ACT = { ArrowUp: 'UPARROW', ArrowDown: 'DOWNARROW', ArrowLeft: 'LEFTARROW', ArrowRight: 'RIGHTARROW', KeyW: 'UPARROW', KeyS: 'DOWNARROW', KeyA: 'STRAFE_L', KeyD: 'STRAFE_R',
      Comma: 'STRAFE_L', Period: 'STRAFE_R', ControlLeft: 'FIRE', ControlRight: 'FIRE', KeyF: 'FIRE', Space: 'USE', KeyE: 'USE', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT',
      AltLeft: 'ALT', AltRight: 'ALT', Tab: 'TAB', Escape: 'ESCAPE', Enter: 'ENTER', NumpadEnter: 'ENTER', Backspace: 'BACKSPACE' };
    if (ACT[c]) out.push(K[ACT[c]]);
    var m = /^Key([A-Z])$/.exec(c) || /^(?:Digit|Numpad)(\d)$/.exec(c);
    if (m) out.push(m[1].toLowerCase().charCodeAt(0));
    if (c === 'Minus' || c === 'NumpadSubtract') out.push(45);
    if (c === 'Equal' || c === 'NumpadAdd') out.push(61);
    return out.length ? out : null;
  }
  function onKey(e) {
    if (!open) return;
    if (e.type === 'keydown' && e.key === 'Escape' && (e.shiftKey || !K)) { e.preventDefault(); close(); return; } // пока грузится - выходит и просто Esc
    var ks = codeKeys(e);
    if (!ks) return;
    e.preventDefault(); e.stopPropagation();
    if (e.repeat) return;
    ks.forEach(function (k) { send(k, e.type === 'keydown'); });
  }

  function fit() {
    if (!root) return;
    var st = canvas.parentNode, w = st.clientWidth, h = st.clientHeight;
    var cw = Math.min(w, h * 4 / 3), ch = cw * 3 / 4; // Doom рисовался под 4:3 - буфер растягиваем так же
    canvas.style.width = Math.floor(cw) + 'px'; canvas.style.height = Math.floor(ch) + 'px';
  }

  function stick() {
    var base = el('div', 'aa-doom__stick'), knob = el('div', 'aa-doom__knob'), id = null, on = {};
    base.appendChild(knob);
    function set(dx, dy) {
      var r = base.clientWidth / 2, len = Math.hypot(dx, dy), m = Math.min(1, len / r), a = Math.atan2(dy, dx);
      var x = Math.cos(a) * m, y = Math.sin(a) * m;
      knob.style.transform = 'translate(' + (x * r * 0.62).toFixed(1) + 'px,' + (y * r * 0.62).toFixed(1) + 'px)';
      var want = { UPARROW: y < -0.35, DOWNARROW: y > 0.35, LEFTARROW: x < -0.35, RIGHTARROW: x > 0.35, SHIFT: m > 0.92 };
      for (var k in want) if (!!on[k] !== want[k]) { on[k] = want[k]; send(K && K[k], want[k]); }
    }
    function c(e) { var b = base.getBoundingClientRect(); return [e.clientX - b.left - b.width / 2, e.clientY - b.top - b.height / 2]; }
    base.addEventListener('pointerdown', function (e) { if (id !== null) return; id = e.pointerId; base.setPointerCapture(id); var p = c(e); set(p[0], p[1]); e.preventDefault(); });
    base.addEventListener('pointermove', function (e) { if (e.pointerId !== id) return; var p = c(e); set(p[0], p[1]); });
    var up = function (e) { if (e && e.pointerId !== id) return; id = null; set(0, 0); };
    base.addEventListener('pointerup', up); base.addEventListener('pointercancel', up);
    pads.push(function () { id = null; on = {}; knob.style.transform = ''; });
    return base;
  }
  function key(label, cls, getKey, once) {
    var b = el('button', 'aa-doom__k' + (cls ? ' aa-doom__k--' + cls : ''), label), id = null, rel = null;
    b.type = 'button';
    b.addEventListener('pointerdown', function (e) {
      e.preventDefault(); if (id !== null) return; id = e.pointerId; b.setPointerCapture(id); b.classList.add('is-down');
      if (once) tap(getKey()); else rel = hold(getKey());
    });
    var up = function (e) { if (e.pointerId !== id) return; id = null; b.classList.remove('is-down'); if (rel) { rel(); rel = null; } };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    pads.push(function () { id = null; rel = null; b.classList.remove('is-down'); });
    return b;
  }

  function build() {
    var s = el('style'); s.textContent = CSS; document.head.appendChild(s);
    root = el('div', 'aa-doom'); root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Doom');
    if (matchMedia('(pointer: coarse)').matches) root.classList.add('aa-doom--touch');
    bar = el('div', 'aa-doom__bar');
    var hint = el('div', 'aa-doom__hint', t('hint')), x = el('button', 'aa-doom__btn', t('close'));
    x.type = 'button'; x.addEventListener('click', close);
    bar.appendChild(hint); bar.appendChild(x);
    var stage = el('div', 'aa-doom__stage');
    canvas = el('canvas', 'aa-doom__screen'); canvas.width = size[0]; canvas.height = size[1];
    var mouseFire = null;
    canvas.addEventListener('mousedown', function (e) { if (e.button === 0 && K && !mouseFire) { e.preventDefault(); mouseFire = hold(K.FIRE); } });
    window.addEventListener('mouseup', function (e) { if (e.button === 0 && mouseFire) { mouseFire(); mouseFire = null; } });
    pads.push(function () { mouseFire = null; });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    load = el('div', 'aa-doom__load'); var lt = el('span', '', t('loading') + ' 0%'), li = el('i'), lb = el('b'); li.appendChild(lb);
    load.appendChild(lt); load.appendChild(li); load.lt = lt; load.lb = lb;
    stage.appendChild(canvas); stage.appendChild(load);
    // справа: служебные кнопки сверху (меню, «Да» для вопросов Doom, ОК), снизу - открыть, оружие (по кругу 1-7) и крупный огонь под большой палец
    var pad = el('div', 'aa-doom__pad'), keys = el('div', 'aa-doom__keys'), row1 = el('div', 'aa-doom__row'), row2 = el('div', 'aa-doom__row'), weap = 1;
    row1.appendChild(key(t('menu'), '', function () { return K && K.ESCAPE; }, true));
    row1.appendChild(key(t('yes'), '', function () { return 121; }, true));
    row1.appendChild(key(t('ok'), '', function () { return K && K.ENTER; }, true));
    row2.appendChild(key(t('use'), 'mid', function () { return K && K.USE; }));
    row2.appendChild(key(t('weap'), 'mid', function () { weap = weap % 7 + 1; return 48 + weap; }, true));
    row2.appendChild(key(t('fire'), 'big', function () { return K && K.FIRE; }));
    keys.appendChild(row1); keys.appendChild(row2);
    pad.appendChild(stick()); pad.appendChild(keys);
    var foot = el('div', 'aa-doom__foot'), a = el('a', '', t('src')); a.href = SRC; a.target = '_blank'; a.rel = 'noopener'; foot.appendChild(a);
    root.appendChild(bar); root.appendChild(stage); root.appendChild(pad); root.appendChild(foot);
    root.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.body.appendChild(root);
    window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKey, true);
    window.addEventListener('resize', fit);
    window.addEventListener('blur', function () { if (open && worker) releaseAll(); });
    document.addEventListener('visibilitychange', function () { if (open && worker) worker.postMessage(document.hidden ? { pause: 1 } : { resume: 1 }); });
  }

  function start() {
    if (!window.Worker || !window.WebAssembly) { load.lt.textContent = t('old'); return; }
    worker = new Worker(WORKER);
    var off = canvas.transferControlToOffscreen ? canvas.transferControlToOffscreen() : null;
    if (!off) ctx2d = canvas.getContext('2d', { alpha: false });
    worker.onmessage = function (e) {
      var m = e.data;
      if (m.progress != null) { var p = Math.round(m.progress * 100); load.lt.textContent = t('loading') + ' ' + p + '%'; load.lb.style.transform = 'scaleX(' + m.progress + ')'; }
      if (m.size) { size = m.size; if (!off) { canvas.width = size[0]; canvas.height = size[1]; } fit(); }
      if (m.ready) { K = m.ready; load.hidden = true; if (!open) worker.postMessage({ pause: 1 }); }
      if (m.frame && ctx2d) ctx2d.putImageData(new ImageData(new Uint8ClampedArray(m.frame), m.w, m.h), 0, 0);
      if (m.error) { load.hidden = false; load.lt.textContent = t('fail'); console.warn('[doom] ' + m.error); }
    };
    worker.postMessage({ init: 1, wasm: new URL(WASM, location.href).href, canvas: off }, off ? [off] : []);
  }

  function show() {
    if (open) return;
    if (!root) build();
    lastFocus = document.activeElement;
    open = true; root.hidden = false; document.documentElement.classList.add('aa-doom-open');
    fit();
    void root.offsetWidth; root.classList.add('is-on'); // reflow - чтобы сработал переход opacity
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (!worker) start(); else worker.postMessage({ resume: 1 });
  }
  function close() {
    if (!open) return;
    open = false; if (worker) { releaseAll(); worker.postMessage({ pause: 1 }); }
    root.classList.remove('is-on'); document.documentElement.classList.remove('aa-doom-open');
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(function () { if (!open) root.hidden = true; }, reduce ? 0 : 350);
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (_) { /* не важно */ }
  }

  window.AA_doom = { open: show, close: close };
})();
