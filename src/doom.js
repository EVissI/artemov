/* Пасхалка по Konami коду: Doom поверх страницы (main.js грузит этот файл только после ввода кода).
   Сама игра - Chocolate Doom со звуком и музыкой в iframe (doom/frame.html), здесь оверлей, клавиатура и экранный джойстик.
   Всё управление идёт отсюда: клавиши, мышь и кнопки превращаются в синтетические события клавиш внутри iframe.
   Закрыть - «Выход» или Shift+Esc (Esc - меню Doom). Закрытый оверлей ставит игру на паузу, повторный код - продолжает;
   «Quit Game» в меню Doom закрывает оверлей и выгружает игру. */
(function () {
  if (window.AA_doom) return;
  var FRAME = '/assets/doom/frame.html'; // build.mjs дописывает ?v=<хэш>
  var SRC = 'https://github.com/EVissI/artemov/tree/main/vendor/doom'; // наша сборка (GPL): патч, скрипт, ссылка на cloudflare/doom-wasm
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
    /* iframe мышь не ловит: клик по экрану - огонь, его ловит сама сцена */
    '.aa-doom__screen{display:block;border:0;background:#000;pointer-events:none;box-shadow:0 0 0 1px rgba(255,255,255,.08),0 0 60px rgba(0,0,0,.9)}',
    '.aa-doom__screen.is-wait{visibility:hidden}',
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

  /* клавиши, которые получает Doom: code -> [key, keyCode] (SDL в Emscripten читает все три поля).
     Привязки - vendor/doom/default.cfg: WASD, стрелки, Ctrl - огонь, пробел - открыть, Shift - бег, Alt - стрейф. */
  var KD = { ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40], ArrowLeft: ['ArrowLeft', 37], ArrowRight: ['ArrowRight', 39],
    ControlLeft: ['Control', 17], ShiftLeft: ['Shift', 16], AltLeft: ['Alt', 18], Space: [' ', 32], Tab: ['Tab', 9], Escape: ['Escape', 27],
    Enter: ['Enter', 13], Backspace: ['Backspace', 8], Pause: ['Pause', 19], Minus: ['-', 189], Equal: ['=', 187] };
  for (var c = 65; c <= 90; c++) KD['Key' + String.fromCharCode(c)] = [String.fromCharCode(c + 32), c];
  for (var d = 0; d <= 9; d++) KD['Digit' + d] = [String(d), 48 + d];
  for (var f = 1; f <= 11; f++) KD['F' + f] = ['F' + f, 111 + f]; // F12 - полный экран в конфиге, его не шлём

  var root, frame, load, open = false, ready = false, lastFocus = null;
  var held = {}; // зажатые клавиши Doom (code) -> счётчик источников (клавиатура, мышь, джойстик)

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; }
  function emit(code, down) {
    var w = frame && frame.contentWindow, k = KD[code];
    if (!w || !w.KeyboardEvent || !k) return;
    var ev = new w.KeyboardEvent(down ? 'keydown' : 'keyup', { code: code, key: k[0], bubbles: true, cancelable: true });
    try { Object.defineProperty(ev, 'keyCode', { get: function () { return k[1]; } }); Object.defineProperty(ev, 'which', { get: function () { return k[1]; } }); } catch (_) { /* старые браузеры */ }
    w.dispatchEvent(ev);
  }
  function tap(code) { if (!code || !ready) return; emit(code, true); setTimeout(function () { emit(code, false); }, 60); }
  function send(code, down) {
    if (!code || !ready) return;
    var n = held[code] || 0;
    if (down) { held[code] = n + 1; if (!n) emit(code, true); }
    else if (n) { held[code] = n - 1; if (n === 1) { delete held[code]; emit(code, false); } }
  }
  // короткий тап/клик короче тика Doom (1/35 с) игра не заметит - отпускание держим не раньше чем через 90 мс
  function hold(code) { send(code, true); var t0 = performance.now(); return function () { setTimeout(function () { send(code, false); }, Math.max(0, 90 - (performance.now() - t0))); }; }
  function releaseAll() { for (var k in held) emit(k, false); held = {}; pads.forEach(function (fn) { fn(); }); }
  var pads = []; // сброс экранных контролов
  function ctl() { var w = frame && frame.contentWindow; return w && w.AA_doomCtl; }
  function wake() { var c = ctl(); if (c) c.wake(); } // звук разрешается только после жеста - будим на каждое нажатие

  /* клавиатура: по e.code, раскладка не важна; алиасы (F/Ctrl - огонь, E/пробел - открыть) уходят клавишей из конфига,
     а буквы и цифры - ещё и сами собой, чтобы работали чит-коды (iddqd) и ответы Y/N */
  var ALIAS = { KeyF: 'ControlLeft', ControlRight: 'ControlLeft', KeyE: 'Space', ShiftRight: 'ShiftLeft', AltRight: 'AltLeft', Comma: 'KeyA', Period: 'KeyD',
    NumpadEnter: 'Enter', NumpadSubtract: 'Minus', NumpadAdd: 'Equal' };
  function codeKeys(e) {
    var c = e.code, out = [];
    var m = /^Numpad(\d)$/.exec(c); if (m) c = 'Digit' + m[1];
    if (ALIAS[c]) out.push(ALIAS[c]);
    if (KD[c]) out.push(c);
    return out.length ? out : null;
  }
  function onKey(e) {
    if (!open) return;
    if (e.type === 'keydown') wake();
    if (e.type === 'keydown' && e.key === 'Escape' && (e.shiftKey || !ready)) { e.preventDefault(); close(); return; } // пока грузится - выходит и просто Esc
    var ks = codeKeys(e);
    if (!ks) return;
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    if (e.repeat) return;
    ks.forEach(function (k) { send(k, e.type === 'keydown'); });
  }

  function fit() {
    if (!root) return;
    var st = frame.parentNode, w = st.clientWidth, h = st.clientHeight;
    var cw = Math.min(w, h * 4 / 3), ch = cw * 3 / 4; // Doom рисуется под 4:3
    frame.style.width = Math.floor(cw) + 'px'; frame.style.height = Math.floor(ch) + 'px';
  }

  function stick() {
    var base = el('div', 'aa-doom__stick'), knob = el('div', 'aa-doom__knob'), id = null, on = {};
    var CODE = { UP: 'ArrowUp', DOWN: 'ArrowDown', LEFT: 'ArrowLeft', RIGHT: 'ArrowRight', RUN: 'ShiftLeft' };
    base.appendChild(knob);
    function set(dx, dy) {
      var r = base.clientWidth / 2, len = Math.hypot(dx, dy), m = Math.min(1, len / r), a = Math.atan2(dy, dx);
      var x = Math.cos(a) * m, y = Math.sin(a) * m;
      knob.style.transform = 'translate(' + (x * r * 0.62).toFixed(1) + 'px,' + (y * r * 0.62).toFixed(1) + 'px)';
      var want = { UP: y < -0.35, DOWN: y > 0.35, LEFT: x < -0.35, RIGHT: x > 0.35, RUN: m > 0.92 };
      for (var k in want) if (!!on[k] !== want[k]) { on[k] = want[k]; send(CODE[k], want[k]); }
    }
    function c(e) { var b = base.getBoundingClientRect(); return [e.clientX - b.left - b.width / 2, e.clientY - b.top - b.height / 2]; }
    base.addEventListener('pointerdown', function (e) { if (id !== null) return; wake(); id = e.pointerId; base.setPointerCapture(id); var p = c(e); set(p[0], p[1]); e.preventDefault(); });
    base.addEventListener('pointermove', function (e) { if (e.pointerId !== id) return; var p = c(e); set(p[0], p[1]); });
    var up = function (e) { if (e && e.pointerId !== id) return; id = null; set(0, 0); };
    base.addEventListener('pointerup', up); base.addEventListener('pointercancel', up);
    pads.push(function () { id = null; on = {}; knob.style.transform = ''; });
    return base;
  }
  function key(label, cls, getCode, once) {
    var b = el('button', 'aa-doom__k' + (cls ? ' aa-doom__k--' + cls : ''), label), id = null, rel = null;
    b.type = 'button';
    b.addEventListener('pointerdown', function (e) {
      e.preventDefault(); if (id !== null) return; wake(); id = e.pointerId; b.setPointerCapture(id); b.classList.add('is-down');
      if (once) tap(getCode()); else rel = hold(getCode());
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
    var bar = el('div', 'aa-doom__bar');
    var hint = el('div', 'aa-doom__hint', t('hint')), x = el('button', 'aa-doom__btn', t('close'));
    x.type = 'button'; x.addEventListener('click', close);
    bar.appendChild(hint); bar.appendChild(x);
    var stage = el('div', 'aa-doom__stage');
    frame = el('iframe', 'aa-doom__screen is-wait');
    frame.title = 'Doom'; frame.tabIndex = -1; frame.setAttribute('allow', 'autoplay');
    var mouseFire = null;
    stage.addEventListener('mousedown', function (e) { if (e.button === 0 && ready && !mouseFire && e.target === stage) { e.preventDefault(); wake(); mouseFire = hold('ControlLeft'); } });
    window.addEventListener('mouseup', function (e) { if (e.button === 0 && mouseFire) { mouseFire(); mouseFire = null; } });
    pads.push(function () { mouseFire = null; });
    load = el('div', 'aa-doom__load'); var lt = el('span', '', t('loading') + ' 0%'), li = el('i'), lb = el('b'); li.appendChild(lb);
    load.appendChild(lt); load.appendChild(li); load.lt = lt; load.lb = lb;
    load.style.pointerEvents = 'none';
    stage.appendChild(frame); stage.appendChild(load);
    // справа: служебные кнопки сверху (меню, «Да» для вопросов Doom, ОК), снизу - открыть, оружие (по кругу 1-7) и крупный огонь под большой палец
    var pad = el('div', 'aa-doom__pad'), keys = el('div', 'aa-doom__keys'), row1 = el('div', 'aa-doom__row'), row2 = el('div', 'aa-doom__row'), weap = 1;
    row1.appendChild(key(t('menu'), '', function () { return 'Escape'; }, true));
    row1.appendChild(key(t('yes'), '', function () { return 'KeyY'; }, true));
    row1.appendChild(key(t('ok'), '', function () { return 'Enter'; }, true));
    row2.appendChild(key(t('use'), 'mid', function () { return 'Space'; }));
    row2.appendChild(key(t('weap'), 'mid', function () { weap = weap % 7 + 1; return 'Digit' + weap; }, true));
    row2.appendChild(key(t('fire'), 'big', function () { return 'ControlLeft'; }));
    keys.appendChild(row1); keys.appendChild(row2);
    pad.appendChild(stick()); pad.appendChild(keys);
    var foot = el('div', 'aa-doom__foot'), a = el('a', '', t('src')); a.href = SRC; a.target = '_blank'; a.rel = 'noopener'; foot.appendChild(a);
    root.appendChild(bar); root.appendChild(stage); root.appendChild(pad); root.appendChild(foot);
    root.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.body.appendChild(root);
    window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKey, true);
    window.addEventListener('resize', fit);
    window.addEventListener('blur', function () { if (open && ready) releaseAll(); });
    document.addEventListener('visibilitychange', function () {
      var c = ctl(); if (!open || !c) return;
      if (document.hidden) { releaseAll(); c.pause(); } else c.resume();
    });
  }

  function start() {
    if (!window.WebAssembly || !window.fetch) { load.lt.textContent = t('old'); return; }
    ready = false; frame.classList.add('is-wait'); load.hidden = false;
    load.lt.textContent = t('loading') + ' 0%'; load.lb.style.transform = 'scaleX(0)';
    window.AA_doomFrame = {
      progress: function (p) { load.lt.textContent = t('loading') + ' ' + Math.round(p * 100) + '%'; load.lb.style.transform = 'scaleX(' + p + ')'; },
      ready: function () {
        ready = true; load.hidden = true; frame.classList.remove('is-wait');
        if (!open) { var c = ctl(); if (c) c.pause(); }
      },
      exit: function () { // «Quit Game»: игра выгружена - следующий код загрузит её заново
        ready = false; held = {}; close();
        setTimeout(function () { if (frame) frame.src = 'about:blank'; frame.removeAttribute('data-src'); }, 400);
      },
      fail: function (msg) { load.hidden = false; load.lt.textContent = t('fail'); console.warn('[doom] ' + msg); },
      key: onKey,
    };
    frame.setAttribute('data-src', '1');
    frame.src = FRAME;
  }

  function show() {
    if (open) return;
    if (!root) build();
    lastFocus = document.activeElement;
    open = true; root.hidden = false; document.documentElement.classList.add('aa-doom-open');
    fit();
    void root.offsetWidth; root.classList.add('is-on'); // reflow - чтобы сработал переход opacity
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (!frame.hasAttribute('data-src')) start();
    else if (ready) { var c = ctl(); if (c) c.resume(); }
  }
  function close() {
    if (!open) return;
    open = false;
    if (ready) { releaseAll(); var c = ctl(); if (c) c.pause(); }
    root.classList.remove('is-on'); document.documentElement.classList.remove('aa-doom-open');
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(function () { if (!open) root.hidden = true; }, reduce ? 0 : 350);
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (_) { /* не важно */ }
  }

  window.AA_doom = { open: show, close: close };
})();
