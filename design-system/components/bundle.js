/* @ds-bundle: {"format":4,"namespace":"AA","components":[{"name":"Landing"},{"name":"Monogram"},{"name":"Button"},{"name":"Rec"},{"name":"Chip"},{"name":"Barcode"},{"name":"Atmosphere"},{"name":"Header"},{"name":"Hero"},{"name":"Counter"},{"name":"Tracklist"},{"name":"WorldRift"},{"name":"PosterCard"},{"name":"VideoModal"},{"name":"CaseTag"},{"name":"Transmitter"},{"name":"Footer"}]} */
(function(){
const React = window.React;
const { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, Fragment } = React;
const h = React.createElement;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const bump = (p, c, w) => clamp(1 - Math.abs(p - c) / w);
function hashStr(str) {
  let x = 2166136261;
  for (let i = 0; i < str.length; i++) {
    x ^= str.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return x >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const pad = (n, l = 2) => String(n).padStart(l, "0");
function videoSources(url) {
  if (!url) return null;
  if (/^(?:\/|\.\/)?uploads\/[^?#]+\.webm$/i.test(url)) return [/* @__PURE__ */ h("source", { key: "w", src: url, type: "video/webm" }), /* @__PURE__ */ h("source", { key: "m", src: url.replace(/\.webm$/i, ".mp4"), type: "video/mp4" })];
  return [/* @__PURE__ */ h("source", { key: "s", src: url })];
}
const cx = (...a) => a.filter(Boolean).join(" ");
function useReducedMotion() {
  const q = "(prefers-reduced-motion: reduce)";
  const [r, setR] = useState(() => typeof matchMedia !== "undefined" && matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q);
    const f = () => setR(m.matches);
    m.addEventListener && m.addEventListener("change", f);
    return () => m.removeEventListener && m.removeEventListener("change", f);
  }, []);
  return r;
}
function useLite() {
  const [lite] = useState(() => {
    if (typeof matchMedia === "undefined") return false;
    return matchMedia("(pointer: coarse)").matches || matchMedia("(max-width: 720px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
  });
  return lite;
}
function useInView(ref, { once = true, rootMargin = "0px", threshold = 0.2 } = {}) {
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setV(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setV(true);
        if (once) io.disconnect();
      } else if (!once) setV(false);
    }, { rootMargin, threshold });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return v;
}
function getScroller(el) {
  const c = el && el.closest && el.closest(".aa-page--contained");
  return c || window;
}
function viewportH(sc) {
  return sc === window ? window.innerHeight : sc.clientHeight;
}
function scrollToId(id, reduced) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  setTimeout(() => el.focus({ preventScroll: true }), reduced ? 0 : 600);
}
const EditContext = React.createContext(null);
const useEd = () => React.useContext(EditContext);
function E({ p, v, ph }) {
  const ed = useEd();
  return ed ? ed.text({ p, v, ph }) : v == null ? null : v;
}
const edEl = (ed, k, props) => ed ? ed[k](props) : null;
function Monogram({ variant = "mark", text = "AA", className, label, ...rest }) {
  const deco = variant !== "mark";
  return /* @__PURE__ */ h("span", { ...rest, className: cx("aa-mono", "aa-mono--" + variant, className), "aria-hidden": deco || void 0, "aria-label": !deco ? label || "Артем Артемов" : void 0, role: !deco ? "img" : void 0 }, text);
}
function Button({ variant = "siren", href, children, arrow, className, ...rest }) {
  const cls = cx("aa-btn", "aa-btn--" + variant, className);
  const inner = /* @__PURE__ */ h(Fragment, null, children, arrow && /* @__PURE__ */ h("span", { className: "aa-btn__arrow", "aria-hidden": "true" }, arrow));
  return href ? /* @__PURE__ */ h("a", { href, className: cls, ...rest }, inner) : /* @__PURE__ */ h("button", { type: "button", className: cls, ...rest }, inner);
}
function Rec({ label = "REC", className }) {
  return /* @__PURE__ */ h("span", { className: cx("aa-rec aa-label", className) }, /* @__PURE__ */ h("span", { className: "aa-rec__dot", "aria-hidden": "true" }), label);
}
function Chip({ active, count, children, ...rest }) {
  return /* @__PURE__ */ h("button", { type: "button", className: "aa-chip", "aria-pressed": active ? "true" : "false", ...rest }, children, count != null && /* @__PURE__ */ h("span", { className: "aa-chip__n" }, pad(count)));
}
function Barcode({ seed = "AA", className, bars = 34 }) {
  const r = rng(hashStr(String(seed)));
  const rects = [];
  let x = 0;
  for (let i = 0; i < bars; i++) {
    const w = r() < 0.3 ? 3 : r() < 0.6 ? 2 : 1;
    if (i % 2 === 0) rects.push(/* @__PURE__ */ h("rect", { key: i, x, y: "0", width: w, height: i % 9 === 0 ? 30 : 26 }));
    x += w + (r() < 0.5 ? 1 : 2);
  }
  return /* @__PURE__ */ h("svg", { className, viewBox: `0 0 ${x} 30`, preserveAspectRatio: "none", "aria-hidden": "true", fill: "currentColor" }, rects);
}
function Atmosphere({ fixed = true, grain = true, scanlines = true, vignette = true }) {
  return /* @__PURE__ */ h("div", { className: cx("aa-atmos", fixed && "aa-atmos--fixed"), "aria-hidden": "true" }, grain && /* @__PURE__ */ h("div", { className: "aa-atmos__grain" }), scanlines && /* @__PURE__ */ h("div", { className: "aa-atmos__scan" }), vignette && /* @__PURE__ */ h("div", { className: "aa-atmos__vignette" }));
}
function Header({ nav = [], monogram = "AA", recLabel = "REC", theme = "other", active, onNavigate, fixed = true, solid = false }) {
  const [open, setOpen] = useState(false);
  const go = (e, id) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(id);
    }
    setOpen(false);
  };
  return /* @__PURE__ */ h("header", { className: cx("aa-header", !fixed && "aa-header--static", open && "aa-header--open", solid && "aa-header--solid"), "data-theme": theme }, /* @__PURE__ */ h("a", { className: "aa-header__logo", href: "#top", onClick: (e) => go(e, "top") }, /* @__PURE__ */ h(Monogram, { variant: "mark", text: monogram, label: "Артем Артемов - на главную" })), /* @__PURE__ */ h("nav", { "aria-label": "Разделы" }, /* @__PURE__ */ h("ul", { className: "aa-header__nav aa-label", id: "aa-nav" }, nav.map((n) => /* @__PURE__ */ h("li", { key: n.id }, /* @__PURE__ */ h("a", { href: "#" + n.id, "aria-current": active === n.id ? "true" : void 0, onClick: (e) => go(e, n.id) }, n.label))))), /* @__PURE__ */ h("div", { style: { display: "flex", gap: 12, alignItems: "center" } }, /* @__PURE__ */ h(Rec, { label: recLabel }), /* @__PURE__ */ h("button", { type: "button", className: "aa-header__menu aa-label", "aria-expanded": open, "aria-controls": "aa-nav", onClick: () => setOpen(!open) }, open ? "Закрыть" : "Меню")));
}
function Hero({ hero = {}, onNavigate, id = "top" }) {
  const ed = useEd();
  const media = hero.media || {};
  const go = (t) => (e) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(t);
    }
  };
  let scene = null;
  if (media.type === "video" && media.src) scene = /* @__PURE__ */ h("video", { key: media.src, poster: media.poster || void 0, autoPlay: true, muted: true, loop: true, playsInline: true, preload: "metadata", "aria-hidden": "true" }, videoSources(media.src));
  else if (media.src) scene = /* @__PURE__ */ h("img", { src: media.src, alt: media.alt || "", decoding: "async", fetchpriority: "high" });
  const lines = hero.titleLines || ["Артем", "Артемов"];
  return /* @__PURE__ */ h("section", { className: "aa-hero", id, "data-theme": "other", "data-header": "other", "aria-label": "Вступление" }, /* @__PURE__ */ h("div", { className: "aa-hero__scene" }, scene), edEl(ed, "section", { p: "hero", kind: "hero", label: "Hero и фон" }), /* @__PURE__ */ h("div", { className: "aa-hero__content" }, hero.logo ? /* @__PURE__ */ h("h1", { className: "aa-hero__logo" }, /* @__PURE__ */ h("img", { src: hero.logo, alt: "", decoding: "async", fetchpriority: "high" }), /* @__PURE__ */ h("span", { className: "aa-sr" }, lines.join(" ")), edEl(ed, "slot", { p: "hero.logo", v: hero.logo, accept: "image", label: "Надпись-логотип (PNG/WebP без фона)" })) : /* @__PURE__ */ h("h1", { className: "aa-hero__title" }, edEl(ed, "slot", { p: "hero.logo", v: hero.logo, accept: "image", label: "Надпись-логотип", compact: true }), /* @__PURE__ */ h("span", { className: "aa-hero__ink" }, lines.map((l, i) => /* @__PURE__ */ h("span", { key: i, className: "aa-hero__line" }, ed || !l ? /* @__PURE__ */ h(E, { p: "hero.titleLines." + i, v: l }) : /* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("span", { className: "aa-hero__cap" }, l[0]), l.slice(1)))))), /* @__PURE__ */ h("div", { className: "aa-hero__cta" }, hero.primaryCta && /* @__PURE__ */ h(Button, { variant: "siren", href: "#" + hero.primaryCta.target, onClick: go(hero.primaryCta.target) }, /* @__PURE__ */ h(E, { p: "hero.primaryCta.label", v: hero.primaryCta.label })), hero.secondaryCta && /* @__PURE__ */ h(Button, { variant: "outline", href: "#" + hero.secondaryCta.target, onClick: go(hero.secondaryCta.target) }, /* @__PURE__ */ h(E, { p: "hero.secondaryCta.label", v: hero.secondaryCta.label })))));
}
function Counter({ value, display, suffix = "", label, duration = 1400 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { threshold: 0.4 });
  const reduced = useReducedMotion();
  const final = value == null ? display || "∞" : String(value);
  const digits = final.length;
  const [shown, setShown] = useState(() => value == null ? "·" : "0".repeat(digits));
  const numRef = useRef(null);
  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setShown(final);
      return;
    }
    let raf, st = performance.now();
    const glyphs = "0123456789";
    const put = (txt) => {
      const n = numRef.current;
      if (n && n.textContent !== txt) n.textContent = txt;
    };
    const step = (now) => {
      const t = clamp((now - st) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      if (t >= 1) {
        put(final);
        setShown(final);
        return;
      }
      if (value == null) put(["8", "0", "∞", "#"][Math.floor(now / 70) % 4]);
      else {
        const cur = String(Math.round(value * e)).padStart(digits, "0");
        const settled = Math.floor(e * digits);
        put(cur.split("").map((c, i) => i < settled ? c : glyphs[Math.floor(Math.random() * 10)]).join(""));
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, value]);
  return /* @__PURE__ */ h("div", { className: "aa-counter", ref }, /* @__PURE__ */ h("div", { className: "aa-counter__v" }, /* @__PURE__ */ h("span", { "aria-hidden": "true", ref: numRef }, shown), /* @__PURE__ */ h("small", { "aria-hidden": "true" }, suffix), /* @__PURE__ */ h("span", { className: "aa-sr" }, final, suffix ? " " + suffix : "")), /* @__PURE__ */ h("div", { className: "aa-counter__l aa-label" }, label));
}
function About({ about = {}, id = "about" }) {
  const ed = useEd();
  return /* @__PURE__ */ h("section", { className: "aa-section aa-about", id, "data-theme": "fog", "data-header": "other", "aria-labelledby": id + "-h" }, /* @__PURE__ */ h(Cracks, { bottom: true, items: [{ seed: 7, at: [7, 0], steps: [[0, -3]] }, { seed: 17, at: [1, 0], steps: [[0, -1], [1, 0]] }] }), /* @__PURE__ */ h(Knock, { bottom: true }), /* @__PURE__ */ h("div", { className: "aa-light", "aria-hidden": "true" }), /* @__PURE__ */ h("div", { className: "aa-fog", "aria-hidden": "true" }, /* @__PURE__ */ h("i", null), /* @__PURE__ */ h("i", null)), edEl(ed, "section", { p: "about", kind: "about", label: "Обо мне и цифры" }), /* @__PURE__ */ h("div", { className: "aa-wrap", style: { position: "relative" } }, /* @__PURE__ */ h("div", { className: "aa-section__head" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h2", { className: "aa-h2", id: id + "-h" }, /* @__PURE__ */ h(E, { p: "about.title", v: about.title })))), /* @__PURE__ */ h("div", { className: "aa-about__grid" }, /* @__PURE__ */ h("article", { className: "aa-note" }, /* @__PURE__ */ h("span", { className: "aa-note__pin", "aria-hidden": "true" }), /* @__PURE__ */ h("h3", { className: "aa-note__title" }, /* @__PURE__ */ h(E, { p: "about.noteTitle", v: about.noteTitle })), (about.paragraphs || []).map((p, i) => /* @__PURE__ */ h("p", { key: i, className: "aa-ed-host" }, edEl(ed, "tools", { list: "about.paragraphs", index: i, kind: "paragraph" }), /* @__PURE__ */ h(E, { p: "about.paragraphs." + i, v: p, ph: "Абзац" }))), edEl(ed, "add", { list: "about.paragraphs", kind: "paragraph", label: "Абзац" }), /* @__PURE__ */ h("div", { className: "aa-note__sign" }, /* @__PURE__ */ h("span", { className: "aa-label" }, /* @__PURE__ */ h(E, { p: "about.signature", v: about.signature })))), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "aa-counters" }, (about.stats || []).map((s) => /* @__PURE__ */ h(Counter, { key: s.id, value: s.value, display: s.display, suffix: s.suffix, label: /* @__PURE__ */ h(E, { p: "about.stats.@" + s.id + ".label", v: s.label }) })))))));
}
const KNOCK_HITS = 3, TEX_TILES = 1120, TEX_GRIME = 736;
const KNOCK_HOLD = ".aa-section__head h2, .aa-section__head p, .aa-section__kicker";
const KNOCK_SKIP = "a, button, input, textarea, label, p, h1, h2, h3, li, .aa-note, .aa-counters, .aa-tracklist, .aa-section__kicker, [contenteditable]";
function crackFrom(px, py, n, rnd = Math.random) {
  let d = "";
  for (let k = 0; k < n; k++) {
    let a = rnd() * Math.PI * 2, x = px, y = py;
    d += `M${x.toFixed(1)} ${y.toFixed(1)}`;
    for (let i = 0; i < 12 && x > 0 && x < 112 && y > 0 && y < 112; i++) {
      a += (rnd() - 0.5) * 0.9;
      const l = 9 + rnd() * 12;
      x += Math.cos(a) * l;
      y += Math.sin(a) * l;
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
      if (rnd() < 0.18) {
        const b = a + (rnd() < 0.5 ? 1 : -1) * (0.6 + rnd() * 0.5), bl = 8 + rnd() * 12;
        d += ` M${x.toFixed(1)} ${y.toFixed(1)} l${(Math.cos(b) * bl).toFixed(1)} ${(Math.sin(b) * bl).toFixed(1)} M${x.toFixed(1)} ${y.toFixed(1)}`;
      }
    }
  }
  return d;
}
const PRE_CRACK = 0.09, PRE_CHIP = 0.035, PRE_GONE = 0.025;
const KNOCK_COVER = ".aa-note, .aa-counters, .aa-tracklist, .aa-services .aa-section__head p";
function Knock({ bottom = false }) {
  const ed = useEd();
  const reduced = useReducedMotion();
  const ref = useRef(null);
  useEffect(() => {
    const layer = ref.current, sec = layer && layer.parentElement;
    if (!layer || !sec || ed) return;
    let cells = /* @__PURE__ */ new Map();
    const svgNS = "http://www.w3.org/2000/svg";
    const addCrack = (tile, px, py, n, rnd) => {
      const d = crackFrom(px, py, n, rnd), g = document.createElementNS(svgNS, "g");
      g.innerHTML = `<path d="${d}" class="aa-cracks__lit" transform="translate(.8 1)"/><path d="${d}" class="aa-cracks__line"/>`;
      tile.querySelector("svg").appendChild(g);
    };
    const makeTile = (col, top, H) => {
      const tile = document.createElement("i");
      tile.className = "aa-knock__t";
      tile.style.left = col * TILE + "px";
      tile.style.top = top + "px";
      tile.style.backgroundPosition = `${-col * TILE}px ${(bottom ? H % TEX_GRIME : 0) - top}px, ${-col * TILE}px ${(bottom ? H % TEX_TILES : 0) - top}px`;
      tile.innerHTML = '<svg viewBox="0 0 112 112" aria-hidden="true"></svg>';
      layer.appendChild(tile);
      return tile;
    };
    const makeHole = (col, top) => {
      const hole = document.createElement("i");
      hole.className = "aa-knock__h";
      hole.style.left = col * TILE + "px";
      hole.style.top = top + "px";
      hole.style.backgroundPosition = `${-col * TILE}px ${-top}px`;
      layer.insertBefore(hole, layer.firstChild);
      return hole;
    };
    const inEdge = (top, H) => {
      const next = sec.nextElementSibling;
      return !bottom && next && next.classList.contains("aa-otherworld--seam") && top + TILE > H + (TILE - H % TILE) % TILE - 2 * TILE;
    };
    const hits = (sel, col, top, b) => {
      const cx0 = b.left + col * TILE, cy0 = b.top + top;
      return [...sec.querySelectorAll(sel)].some((n) => {
        const q = n.getBoundingClientRect();
        return q.right > cx0 + 4 && q.left < cx0 + TILE - 4 && q.bottom > cy0 + 4 && q.top < cy0 + TILE - 4;
      });
    };
    const seed = () => {
      layer.textContent = "";
      cells = /* @__PURE__ */ new Map();
      const b = sec.getBoundingClientRect(), W = sec.clientWidth, H = sec.clientHeight;
      const cols = Math.ceil(W / TILE), rows = Math.ceil(H / TILE);
      for (let k = 0; k < rows; k++) for (let col = 0; col < cols; col++) {
        const top = bottom ? H - (k + 1) * TILE : k * TILE;
        if (top + TILE <= 0 || inEdge(top, H)) continue;
        const r = rng((col * 73856093 ^ k * 19349663 ^ (bottom ? 83492791 : 2971215073)) >>> 0), roll = r();
        if (roll >= PRE_CRACK + PRE_CHIP + PRE_GONE) continue;
        if (hits(KNOCK_COVER, col, top, b)) continue;
        const hold = hits(KNOCK_HOLD, col, top, b), key = col + ":" + top;
        if (roll < PRE_CRACK || hold) {
          const tile = makeTile(col, top, H), n = r() < 0.4 ? 2 : 1;
          for (let i = 0; i < n; i++) addCrack(tile, 20 + r() * 72, 20 + r() * 72, 3, r);
          cells.set(key, { tile, hits: n, hold });
        } else if (roll < PRE_CRACK + PRE_CHIP) {
          makeHole(col, top);
          const tile = makeTile(col, top, H);
          tile.style.clipPath = brokenClip(r);
          if (r() < 0.6) addCrack(tile, 20 + r() * 72, 10 + r() * 40, 2, r);
          cells.set(key, { tile, hits: KNOCK_HITS - 1, holed: true });
        } else {
          makeHole(col, top);
          cells.set(key, { gone: true });
        }
      }
    };
    seed();
    let lastW = sec.clientWidth, lastH = sec.clientHeight, pend = 0;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
      if (sec.clientWidth === lastW && sec.clientHeight === lastH) return;
      lastW = sec.clientWidth;
      lastH = sec.clientHeight;
      cancelAnimationFrame(pend);
      pend = requestAnimationFrame(seed);
    }) : null;
    ro && ro.observe(sec);
    let downX = 0, downY = 0;
    const bare = (e) => !(e.target.closest && e.target.closest(KNOCK_SKIP));
    const onDown = (e) => {
      downX = e.clientX;
      downY = e.clientY;
      if (e.detail > 1 && bare(e)) e.preventDefault();
    };
    const onClick = (e) => {
      if (e.button !== 0 || !bare(e)) return;
      if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) return;
      const b = sec.getBoundingClientRect(), W = sec.clientWidth, H = sec.clientHeight;
      const lx = e.clientX - b.left, ly = e.clientY - b.top;
      if (lx < 0 || ly < 0 || lx > W || ly > H) return;
      const col = Math.floor(lx / TILE);
      const top = bottom ? H - (Math.floor((H - ly) / TILE) + 1) * TILE : Math.floor(ly / TILE) * TILE;
      if (inEdge(top, H)) return;
      const key = col + ":" + top;
      let c = cells.get(key);
      if (c && c.gone) return;
      if (!c) {
        c = { tile: makeTile(col, top, H), hits: 0 };
        cells.set(key, c);
      }
      const px = lx - col * TILE, py = ly - top;
      c.hits++;
      if (c.hits >= KNOCK_HITS && c.hold === void 0) c.hold = hits(KNOCK_HOLD, col, top, b);
      if (c.hold) {
        if (c.hits <= KNOCK_HITS) addCrack(c.tile, px, py, 3);
        if (!reduced) {
          c.tile.classList.remove("is-hit");
          void c.tile.offsetWidth;
          c.tile.classList.add("is-hit");
        }
        return;
      }
      if (c.hits < KNOCK_HITS) {
        addCrack(c.tile, px, py, c.hits === 1 ? 3 : 4);
        if (!reduced) {
          c.tile.classList.remove("is-hit");
          void c.tile.offsetWidth;
          c.tile.classList.add("is-hit");
        }
        return;
      }
      c.gone = true;
      if (!c.holed) makeHole(col, top);
      const t = c.tile;
      t.classList.remove("is-hit");
      if (reduced) {
        t.classList.add("is-fade");
        setTimeout(() => t.remove(), 400);
        return;
      }
      t.style.setProperty("--dx", ((Math.random() - 0.5) * 80).toFixed(0) + "px");
      t.style.setProperty("--rot", ((Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 22)).toFixed(0) + "deg");
      t.classList.add("is-fall");
      for (let k = 0; k < 4; k++) {
        const f = document.createElement("i");
        f.className = "aa-knock__f";
        f.style.left = (col * TILE + px - 8 + (Math.random() - 0.5) * 30).toFixed(0) + "px";
        f.style.top = (top + py - 8 + (Math.random() - 0.5) * 30).toFixed(0) + "px";
        f.style.setProperty("--dx", ((Math.random() - 0.5) * 160).toFixed(0) + "px");
        f.style.setProperty("--rot", ((Math.random() - 0.5) * 540).toFixed(0) + "deg");
        f.style.setProperty("--s", (0.5 + Math.random() * 0.8).toFixed(2));
        layer.appendChild(f);
        setTimeout(() => f.remove(), 1100);
      }
      setTimeout(() => t.remove(), 1100);
    };
    sec.addEventListener("mousedown", onDown);
    sec.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(pend);
      ro && ro.disconnect();
      sec.removeEventListener("mousedown", onDown);
      sec.removeEventListener("click", onClick);
      layer.textContent = "";
    };
  }, [ed, reduced, bottom]);
  return ed ? null : /* @__PURE__ */ h("div", { ref, className: "aa-knock", "aria-hidden": "true" });
}
function Tracklist({ items = [], p = "services.items" }) {
  const ed = useEd();
  return /* @__PURE__ */ h("ol", { className: "aa-tracklist" }, items.map((it, i) => {
    const ip = p + ".@" + it.id;
    return /* @__PURE__ */ h("li", { key: it.id || i, className: "aa-track", tabIndex: ed ? void 0 : 0 }, /* @__PURE__ */ h("span", { className: "aa-track__n", "aria-hidden": "true" }, pad(i + 1)), /* @__PURE__ */ h("h3", { className: "aa-track__t" }, /* @__PURE__ */ h(E, { p: ip + ".title", v: it.title, ph: "Название услуги" })), /* @__PURE__ */ h("p", { className: "aa-track__d" }, /* @__PURE__ */ h(E, { p: ip + ".text", v: it.text, ph: "Описание" })), (it.timecode || ed) && /* @__PURE__ */ h("span", { className: "aa-track__tc", "aria-hidden": "true" }, /* @__PURE__ */ h(E, { p: ip + ".timecode", v: it.timecode, ph: "00:00" })), edEl(ed, "tools", { list: p, id: it.id, kind: "service" }));
  }), edEl(ed, "add", { list: p, kind: "service", label: "Услуга", tag: "li" }));
}
const TILE = 112;
function crackPath(seed, [c0, r0], steps) {
  const r = rng(seed);
  let x = c0 * TILE, y = r0 * TILE;
  const pts = [[x, y]], twigs = [];
  for (const [dx, dy] of steps) {
    const len = Math.abs(dx || dy) * TILE, n = Math.max(3, Math.round(len / 14)), sx = Math.sign(dx), sy = Math.sign(dy);
    for (let i = 1; i <= n; i++) {
      const t = i / n, j = i === n ? 0 : (r() - 0.5) * 4.5;
      const px = x + sx * len * t + (dy ? j : 0), py = y + sy * len * t + (dx ? j : 0);
      pts.push([px, py]);
      if (i > 1 && i < n - 1 && r() < 0.09) {
        const a = Math.atan2(sy, sx) + (r() < 0.5 ? 1 : -1) * (0.45 + r() * 0.4), l = 16 + r() * 22;
        twigs.push(`M${px.toFixed(1)} ${py.toFixed(1)} L${(px + Math.cos(a) * l * 0.55).toFixed(1)} ${(py + Math.sin(a) * l * 0.55 + (r() - 0.5) * 3).toFixed(1)} L${(px + Math.cos(a) * l).toFixed(1)} ${(py + Math.sin(a) * l).toFixed(1)}`);
      }
    }
    x += sx * len;
    y += sy * len;
  }
  const [ax, ay] = pts[0];
  const chip = `M${ax - 7} ${ay} L${ax} ${ay - 6} L${ax + 5} ${ay + 1} L${ax} ${ay + 5} Z`;
  return { d: "M" + pts.map(([px, py]) => px.toFixed(1) + " " + py.toFixed(1)).join(" L") + " " + twigs.join(" "), chip };
}
function Cracks({ items = [], bottom = false }) {
  return /* @__PURE__ */ h("svg", { className: "aa-cracks", "aria-hidden": "true" }, /* @__PURE__ */ h("svg", { y: bottom ? "100%" : 0, overflow: "visible" }, items.map((it, i) => {
    const { d, chip } = crackPath(it.seed, it.at, it.steps);
    return /* @__PURE__ */ h("g", { key: i }, /* @__PURE__ */ h("path", { d, className: "aa-cracks__lit", transform: "translate(1 1.2)" }), /* @__PURE__ */ h("path", { d, className: "aa-cracks__line" }), /* @__PURE__ */ h("path", { d: chip, className: "aa-cracks__chip" }));
  })));
}
function Services({ services = {}, id = "services" }) {
  const ed = useEd();
  return /* @__PURE__ */ h("section", { className: "aa-section aa-services", id, "data-theme": "fog", "data-header": "other", "aria-labelledby": id + "-h" }, edEl(ed, "section", { p: "services", kind: "services", label: "Услуги" }), /* @__PURE__ */ h(Cracks, { items: [{ seed: 3, at: [8, 0], steps: [[0, 1], [1, 0], [0, 1]] }] }), /* @__PURE__ */ h(Knock, null), /* @__PURE__ */ h("div", { className: "aa-light", "aria-hidden": "true" }), /* @__PURE__ */ h("div", { className: "aa-fog", "aria-hidden": "true" }, /* @__PURE__ */ h("i", null), /* @__PURE__ */ h("i", null)), /* @__PURE__ */ h("div", { className: "aa-wrap", style: { position: "relative" } }, /* @__PURE__ */ h("div", { className: "aa-section__head" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h2", { className: "aa-h2", id: id + "-h" }, /* @__PURE__ */ h(E, { p: "services.title", v: services.title }))), (services.intro || ed) && /* @__PURE__ */ h("p", { className: "aa-services__intro" }, /* @__PURE__ */ h(E, { p: "services.intro", v: services.intro, ph: "Вступление" }))), /* @__PURE__ */ h(Tracklist, { items: services.items })));
}
function WorldRift({ rift = {}, progress, strips: stripCount, id = "rift" }) {
  const ed = useEd();
  const ref = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const reduced = useReducedMotion();
  const lite = useLite();
  const controlled = typeof progress === "number";
  const isStatic = controlled || reduced;
  const N = stripCount || (lite ? 6 : 8);
  const sda = useMemo(() => !isStatic && typeof CSS !== "undefined" && !!CSS.supports && CSS.supports("animation-timeline: view()"), [isStatic]);
  const model = useMemo(() => {
    const r = rng(20260926);
    const order = Array.from({ length: N }, (_, i) => i).sort(() => r() - 0.5);
    const strips = Array.from({ length: N }, (_, i) => {
      const K = 16, pts = [];
      for (let k = 0; k <= K; k++) pts.push(`${(r() * 14).toFixed(1)}% ${(k / K * 100).toFixed(1)}%`);
      for (let k = K; k >= 0; k--) pts.push(`${(100 - r() * 14).toFixed(1)}% ${(k / K * 100).toFixed(1)}%`);
      return { i, x0: i / N, w: 1 / N, peel: 0.3 + order.indexOf(i) * (0.34 / N), dir: r() < 0.5 ? -1 : 1, clip: `polygon(${pts.join(",")})` };
    });
    const slashes = Array.from({ length: lite ? 4 : 7 }, () => ({ x: 6 + r() * 88, y: 4 + r() * 40, h: 18 + r() * 38, w: 5 + r() * 8, d: r() * 0.12 }));
    return { strips, slashes };
  }, [N, lite]);
  const el = useRef({});
  const stripEls = useRef([]);
  const shadeEls = useRef([]);
  const innerEls = useRef([]);
  const slashEls = useRef([]);
  const noiseLevel = useRef(0);
  const last = useRef(-1);
  const persp = useRef(1100);
  const set = (k) => (node) => {
    el.current[k] = node;
  };
  const op = (node, v) => {
    if (node) node.style.opacity = v.toFixed(3);
  };
  const apply = useCallback((p) => {
    if (Math.abs(p - last.current) < 15e-4) return;
    last.current = p;
    const E2 = el.current;
    if (E2.tc) {
      const f = Math.floor(p * 240);
      const txt = `00:00:${pad(Math.floor(f / 24))}:${pad(f % 24)}`;
      if (E2.tc.textContent !== txt) E2.tc.textContent = txt;
    }
    const siren = reduced ? 0 : bump(p, 0.56, 0.07) * 0.6;
    noiseLevel.current = reduced ? 0 : bump(p, 0.56, 0.14) * 0.22;
    if (sda) return;
    op(E2.shade, 0.62 * (1 - p));
    op(E2.base, 1 - smooth(clamp((p - 0.04) / 0.3)));
    op(E2.haze, clamp(1 - p * 1.4));
    op(E2.dusk, p);
    op(E2.siren, siren);
    op(E2.line, siren);
    op(E2.noise, noiseLevel.current);
    op(E2.ta, clamp(1 - p * 1.6));
    op(E2.tb, clamp(p * 2.2 - 0.6));
    op(E2.tg, siren);
    if (E2.tg) E2.tg.style.transform = siren > 0.05 ? `translate3d(${Math.round((Math.random() - 0.5) * 14)}px,0,0)` : "none";
    op(E2.mtop, clamp(1 - p * 2));
    op(E2.mbot, clamp(0.25 + p));
    model.strips.forEach((s, idx) => {
      const node = stripEls.current[idx];
      if (!node) return;
      const peel = smooth(clamp((p - s.peel) / 0.3));
      node.style.transform = `perspective(${persp.current}px) translate3d(${(s.dir * peel * 5).toFixed(2)}vw, ${(peel * 108).toFixed(2)}%, 0) rotateX(${(-peel * 58).toFixed(2)}deg) rotate(${(s.dir * peel * 8).toFixed(2)}deg)`;
      node.style.opacity = String(1 - smooth(clamp((peel - 0.55) / 0.45)));
      op(shadeEls.current[idx], Math.max(peel * 0.9, clamp(p * 1.4) * 0.75));
    });
    model.slashes.forEach((s, idx) => {
      const node = slashEls.current[idx];
      if (!node) return;
      node.style.transform = `scaleY(${smooth(clamp((p - 0.02 - s.d) / 0.22)).toFixed(3)})`;
      node.style.opacity = String(1 - smooth(clamp((p - 0.36) / 0.14)));
    });
  }, [model, reduced, sda]);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const layout = () => {
      const W = stage.clientWidth;
      const sh = stripEls.current[0] && stripEls.current[0].offsetHeight || stage.clientHeight;
      const np = Math.round(Math.max(1100, sh * 1.8));
      if (np !== persp.current) {
        persp.current = np;
        last.current = -1;
      }
      stage.style.setProperty("--rift-p", np + "px");
      model.strips.forEach((s, idx) => {
        const node = stripEls.current[idx];
        const inner = innerEls.current[idx];
        if (!node || !inner) return;
        const left = s.x0 * W - 2, width = s.w * W + 4;
        node.style.left = left + "px";
        node.style.width = width + "px";
        node.style.clipPath = s.clip;
        inner.style.left = -left + "px";
        inner.style.width = W + "px";
      });
    };
    layout();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(layout) : null;
    ro && ro.observe(stage);
    return () => ro && ro.disconnect();
  }, [model]);
  useEffect(() => {
    last.current = -1;
    if (controlled) {
      apply(clamp(progress));
      return;
    }
    if (reduced) {
      apply(1);
      return;
    }
    const sec = ref.current;
    const sc = getScroller(sec);
    let raf = 0, near = false;
    const read = () => {
      raf = 0;
      const b = sec.getBoundingClientRect();
      const vh = viewportH(sc);
      apply(clamp((vh * 0.85 - b.top) / Math.max(1, b.height * 0.95)));
    };
    const on = () => {
      if (near && !raf) raf = requestAnimationFrame(read);
    };
    const io = new IntersectionObserver(([e]) => {
      near = e.isIntersecting;
      if (near) on();
    }, { rootMargin: "30% 0px 30% 0px" });
    io.observe(sec);
    sc.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    near = true;
    read();
    return () => {
      io.disconnect();
      sc.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, [controlled, progress, reduced, apply]);
  useEffect(() => {
    if (reduced) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const w = c.width = lite ? 96 : 160, hh = c.height = lite ? 54 : 90;
    const frames = Array.from({ length: 6 }, () => {
      const img = ctx.createImageData(w, hh);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 255 | 0;
        d[i] = v;
        d[i + 1] = v * 0.82;
        d[i + 2] = v * 0.76;
        d[i + 3] = 255;
      }
      return img;
    });
    let raf = 0, alive = true, visible = false, frame = 0;
    const draw = () => {
      raf = 0;
      if (!alive || !visible) return;
      if (noiseLevel.current > 0.01 && (frame++ & 1) === 0) ctx.putImageData(frames[(frame >> 1) % frames.length], 0, 0);
      raf = requestAnimationFrame(draw);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(draw);
    });
    io.observe(c);
    return () => {
      alive = false;
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [reduced, lite]);
  const t = rift.title || ["Дальше -", "работы"];
  const lines = t.map((l, i) => /* @__PURE__ */ h("span", { key: i }, l));
  return /* @__PURE__ */ h("section", { ref, id, className: cx("aa-rift", isStatic && "aa-rift--static", sda && "aa-rift--sda"), "data-theme": "other", "data-header": "other", "aria-label": t.join(" ") }, edEl(ed, "section", { p: "rift", kind: "rift", label: "Переход между мирами" }), /* @__PURE__ */ h("div", { className: "aa-rift__stage", ref: stageRef }, /* @__PURE__ */ h("div", { className: "aa-rift__metal", "aria-hidden": "true" }, /* @__PURE__ */ h("div", { className: "aa-grate" }), /* @__PURE__ */ h("div", { className: "aa-metal" }), /* @__PURE__ */ h("div", { className: "aa-slots" })), /* @__PURE__ */ h("div", { className: "aa-rift__fx aa-rift__shade", ref: set("shade"), "aria-hidden": "true" }), /* @__PURE__ */ h("div", { className: "aa-rift__fx aa-rift__base aa-wallpaper", ref: set("base"), "aria-hidden": "true", style: { opacity: 1 } }), /* @__PURE__ */ h("div", { className: "aa-rift__strips", "aria-hidden": "true" }, model.strips.map((s, idx) => /* @__PURE__ */ h("div", { key: idx, className: "aa-rift__strip", ref: (n) => stripEls.current[idx] = n, style: { "--a": s.peel.toFixed(4), "--dir": s.dir } }, /* @__PURE__ */ h("div", { className: "aa-wallpaper", ref: (n) => innerEls.current[idx] = n, style: { position: "absolute", top: 0, bottom: 0 } }), /* @__PURE__ */ h("b", { ref: (n) => shadeEls.current[idx] = n })))), model.slashes.map((s, idx) => /* @__PURE__ */ h("span", { key: idx, className: "aa-rift__slash", ref: (n) => slashEls.current[idx] = n, "aria-hidden": "true", style: { left: s.x + "%", top: s.y + "%", height: s.h + "%", width: s.w + "px", "--d": s.d.toFixed(4) } })), /* @__PURE__ */ h("div", { className: "aa-rift__fx aa-rift__haze", ref: set("haze"), "aria-hidden": "true", style: { opacity: 1 } }), /* @__PURE__ */ h("div", { className: "aa-rift__fx aa-rift__dusk", ref: set("dusk"), "aria-hidden": "true" }), /* @__PURE__ */ h("div", { className: "aa-rift__fx aa-rift__siren", ref: set("siren"), "aria-hidden": "true" }), /* @__PURE__ */ h("div", { className: "aa-rift__line", ref: set("line"), "aria-hidden": "true" }), !reduced && /* @__PURE__ */ h("canvas", { className: "aa-rift__noise", ref: (n) => {
    canvasRef.current = n;
    el.current.noise = n;
  }, "aria-hidden": "true" }), /* @__PURE__ */ h("div", { className: "aa-rift__meta aa-rift__meta--top aa-label", ref: set("mtop"), "aria-hidden": "true" }, (rift.topMeta || []).map((m, i) => /* @__PURE__ */ h("span", { key: i }, m))), /* @__PURE__ */ h("div", { className: "aa-rift__text" }, /* @__PURE__ */ h("h2", { className: "aa-display aa-rift__title" }, /* @__PURE__ */ h("span", { className: "a", ref: set("ta") }, lines), /* @__PURE__ */ h("span", { className: "b", ref: set("tb"), "aria-hidden": "true" }, lines), /* @__PURE__ */ h("span", { className: "g", ref: set("tg"), "aria-hidden": "true" }, lines))), /* @__PURE__ */ h("div", { className: "aa-rift__meta aa-label", ref: set("mbot"), "aria-hidden": "true" }, /* @__PURE__ */ h("span", null, (rift.bottomMeta || [])[0]), /* @__PURE__ */ h("span", { ref: set("tc") }, "00:00:00:00"), /* @__PURE__ */ h("span", null, (rift.bottomMeta || [])[1]))));
}
function PosterCard({ work, index = 0, categoryLabel, onOpen, p }) {
  const ed = useEd();
  p = p || "works.items.@" + work.id;
  const vRef = useRef(null);
  const [vidOn, setVidOn] = useState(false);
  const reduced = useReducedMotion();
  const intent = useRef(0);
  const vertical = work.format === "9:16";
  const play = () => {
    setVidOn(true);
    requestAnimationFrame(() => {
      const v = vRef.current;
      v && v.play && v.play().catch(() => {
      });
    });
  };
  const enter = () => {
    if (!work.previewVideo || reduced) return;
    clearTimeout(intent.current);
    intent.current = setTimeout(play, 220);
  };
  const leave = () => {
    clearTimeout(intent.current);
    const v = vRef.current;
    v && v.pause && v.pause();
  };
  useEffect(() => () => clearTimeout(intent.current), []);
  return /* @__PURE__ */ h("article", { className: cx("aa-poster", ed && work.published === false && "aa-ed-draft"), onMouseEnter: enter, onMouseLeave: leave, onFocus: ed ? void 0 : enter, onBlur: ed ? void 0 : leave }, edEl(ed, "tools", { list: "works.items", id: work.id, kind: "work", axis: "x" }), /* @__PURE__ */ h("div", { className: "aa-poster__top aa-micro", "aria-hidden": "true" }, /* @__PURE__ */ h("span", null, "№ ", pad(index + 1)), /* @__PURE__ */ h(Monogram, { variant: "mark" }), /* @__PURE__ */ h("span", null, work.year)), /* @__PURE__ */ h("div", { className: cx("aa-poster__frame", vertical && "aa-poster__frame--v"), style: { aspectRatio: vertical ? "9 / 16" : "16 / 9" } }, work.previewImage || vidOn ? /* @__PURE__ */ h("div", { className: "aa-poster__media" }, work.previewImage && /* @__PURE__ */ h("img", { src: work.previewImage, alt: `Кадр из работы «${work.title}»`, loading: "lazy", decoding: "async" }), vidOn && /* @__PURE__ */ h("video", { key: work.previewVideo, ref: vRef, muted: true, loop: true, playsInline: true, preload: "none", "aria-hidden": "true", style: { position: "absolute", inset: 0 } }, videoSources(work.previewVideo))) : /* @__PURE__ */ h("div", { className: "aa-poster__ph", role: "img", "aria-label": `Слот под превью ${work.format}` }, /* @__PURE__ */ h(Monogram, { variant: "watermark" }), /* @__PURE__ */ h("span", { className: "aa-micro" }, "Слот · превью ", work.format)), /* @__PURE__ */ h("div", { className: "aa-poster__vhs", "aria-hidden": "true" }), /* @__PURE__ */ h(Rec, { className: "aa-poster__rec", label: "PLAY" }), edEl(ed, "slot", { p: p + ".previewImage", v: work.previewImage, accept: "image", label: "Превью " + work.format })), edEl(ed, "slot", { p: p + ".previewVideo", v: work.previewVideo, accept: "video", label: "Видео-превью на наведение", compact: true }), edEl(ed, "slot", { p: p + ".videoUrl", v: work.videoUrl, accept: "video", label: "Ролик в плеере", compact: true, link: true }), /* @__PURE__ */ h("h3", { className: "aa-h3 aa-poster__title" }, /* @__PURE__ */ h(E, { p: p + ".title", v: work.title, ph: "Название" })), /* @__PURE__ */ h("div", { className: "aa-poster__row" }, /* @__PURE__ */ h("span", { className: "aa-micro" }, categoryLabel || work.category, " · ", work.format), /* @__PURE__ */ h(Barcode, { seed: work.id, className: "aa-poster__code" })), /* @__PURE__ */ h("div", { className: "aa-poster__plate aa-label", "aria-hidden": "true" }, /* @__PURE__ */ h("span", null, categoryLabel || work.category), /* @__PURE__ */ h("span", null, "▶ Смотреть")), !ed && /* @__PURE__ */ h("button", { type: "button", className: "aa-poster__hit", onClick: () => onOpen && onOpen(work), "aria-label": `Смотреть: ${work.title}, ${categoryLabel || work.category}, ${work.year}` }));
}
function youtubeId(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
function VideoModal({ work, onClose, categoryLabel }) {
  const closeRef = useRef(null);
  const prev = useRef(null);
  useEffect(() => {
    prev.current = document.activeElement;
    closeRef.current && closeRef.current.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose && onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev.current && prev.current.focus && prev.current.focus();
    };
  }, []);
  if (!work) return null;
  const yt = youtubeId(work.videoUrl);
  const vertical = work.format === "9:16";
  const trap = (e) => {
    if (e.key !== "Tab") return;
    const f = e.currentTarget.querySelectorAll('button, [href], iframe, video, [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) {
      e.preventDefault();
      z.focus();
    } else if (!e.shiftKey && document.activeElement === z) {
      e.preventDefault();
      a.focus();
    }
  };
  return /* @__PURE__ */ h("div", { className: "aa-modal", "data-theme": "other", role: "dialog", "aria-modal": "true", "aria-labelledby": "aa-modal-t", onMouseDown: (e) => {
    if (e.target === e.currentTarget) onClose && onClose();
  }, onKeyDown: trap }, /* @__PURE__ */ h("div", { className: cx("aa-modal__box", vertical && "aa-modal__box--v") }, /* @__PURE__ */ h("div", { className: "aa-modal__head" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { className: "aa-micro aa-muted" }, categoryLabel || work.category, " · ", work.year, " · ", work.format), /* @__PURE__ */ h("h2", { className: "aa-h3", id: "aa-modal-t", style: { marginTop: 6 } }, work.title)), /* @__PURE__ */ h("button", { type: "button", ref: closeRef, className: "aa-modal__close aa-label", onClick: onClose }, "Закрыть ✕")), /* @__PURE__ */ h("div", { className: "aa-modal__player", style: { aspectRatio: vertical ? "9 / 16" : "16 / 9" } }, yt ? /* @__PURE__ */ h("iframe", { src: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`, title: work.title, allow: "autoplay; encrypted-media; picture-in-picture; fullscreen", allowFullScreen: true, loading: "lazy" }) : work.videoUrl ? /* @__PURE__ */ h("video", { key: work.videoUrl, controls: true, autoPlay: true, playsInline: true, poster: work.previewImage || void 0 }, videoSources(work.videoUrl)) : /* @__PURE__ */ h("div", { className: "aa-modal__nosignal" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h(Monogram, { variant: "mark" }), /* @__PURE__ */ h("p", { className: "aa-label", style: { marginTop: 12 } }, "Сигнал отсутствует"), /* @__PURE__ */ h("p", { className: "aa-micro aa-muted", style: { marginTop: 8 } }, "Слот под видео: videoUrl (YouTube или файл)")))), yt && /* @__PURE__ */ h("p", { className: "aa-label", style: { marginTop: 12 } }, /* @__PURE__ */ h("a", { href: `https://www.youtube.com/watch?v=${yt}`, target: "_blank", rel: "noopener" }, "Открыть на YouTube ↗")), work.description && /* @__PURE__ */ h("p", { className: "aa-modal__desc" }, work.description)));
}
const INV_COLS = 4, INV_MIN = 12;
function Works({ works = {}, id = "works" }) {
  const ed = useEd();
  const reduced = useReducedMotion();
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);
  const [sel, setSel] = useState(null);
  const secRef = useRef(null);
  const [host, setHost] = useState(null);
  const gridRef = useRef(null);
  useEffect(() => {
    setHost(secRef.current && secRef.current.closest(".aa-page") || null);
  }, []);
  const items = useMemo(() => (works.items || []).filter((w) => ed || w.published !== false).sort((a, b) => {
    var _a, _b;
    return ((_a = a.order) != null ? _a : 0) - ((_b = b.order) != null ? _b : 0);
  }), [works.items, ed]);
  const cats = works.categories || [];
  const catLabel = (cid) => (cats.find((c) => c.id === cid) || {}).label || cid;
  const shown = filter === "all" ? items : items.filter((w) => w.category === filter);
  const count = (cid) => items.filter((w) => w.category === cid).length;
  const cur = shown.find((w) => w.id === sel) || shown[0] || null;
  const slots = Math.max(INV_MIN, Math.ceil((shown.length + (ed ? 1 : 0)) / INV_COLS) * INV_COLS);
  const hoverT = useRef(0);
  useEffect(() => () => clearTimeout(hoverT.current), []);
  const pick = (w) => {
    clearTimeout(hoverT.current);
    setSel(w.id);
  };
  const hoverPick = (w) => {
    clearTimeout(hoverT.current);
    hoverT.current = setTimeout(() => setSel(w.id), 90);
  };
  const onKey = (e) => {
    if (!cur) return;
    const i = shown.indexOf(cur);
    let j = i;
    if (e.key === "ArrowRight") j = i + 1;
    else if (e.key === "ArrowLeft") j = i - 1;
    else if (e.key === "ArrowDown") j = i + INV_COLS;
    else if (e.key === "ArrowUp") j = i - INV_COLS;
    else if (e.key === "Enter" || e.key === " ") {
      if (!ed) {
        e.preventDefault();
        setOpen(cur);
      }
      return;
    } else return;
    e.preventDefault();
    j = Math.max(0, Math.min(shown.length - 1, j));
    setSel(shown[j].id);
    const btn = gridRef.current && gridRef.current.querySelector(`[data-id="${shown[j].id}"]`);
    btn && btn.focus();
  };
  const tab = (key, label, n) => /* @__PURE__ */ h(
    "button",
    {
      key,
      type: "button",
      role: "tab",
      "aria-selected": filter === key,
      className: cx("aa-inv__tab", filter === key && "is-on"),
      onClick: () => {
        setFilter(key);
        setSel(null);
      }
    },
    label,
    /* @__PURE__ */ h("span", { className: "aa-inv__tabn" }, pad(n))
  );
  return /* @__PURE__ */ h("section", { ref: secRef, className: "aa-section aa-works", id, "data-theme": "other", "data-header": "other", "aria-labelledby": id + "-h" }, edEl(ed, "section", { p: "works", kind: "works", label: "Работы и категории" }), /* @__PURE__ */ h("div", { className: "aa-wrap" }, /* @__PURE__ */ h("div", { className: "aa-section__head aa-inv__head" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h2", { className: "aa-h2", id: id + "-h" }, /* @__PURE__ */ h(E, { p: "works.title", v: works.title })))), /* @__PURE__ */ h("div", { className: "aa-inv__tabs", role: "tablist", "aria-label": "Категории работ" }, tab("all", works.allLabel || "Все", items.length), cats.filter((c) => count(c.id) > 0).map((c) => tab(c.id, c.label, count(c.id)))), /* @__PURE__ */ h("div", { className: "aa-sr", "aria-live": "polite" }, "Показано работ: ", shown.length), /* @__PURE__ */ h("div", { className: "aa-inv__body" }, /* @__PURE__ */ h("div", { className: "aa-inv__grid", ref: gridRef, role: "listbox", "aria-label": "Работы", "aria-activedescendant": cur ? "inv-" + cur.id : void 0, onKeyDown: onKey }, Array.from({ length: slots }, (_, k) => {
    const w = shown[k];
    if (!w) return k === shown.length && ed ? /* @__PURE__ */ h("div", { key: "add", className: "aa-inv__slot aa-inv__slot--add" }, edEl(ed, "add", { list: "works.items", kind: "work", label: "+", extra: { category: filter === "all" ? void 0 : filter } })) : /* @__PURE__ */ h("div", { key: "e" + k, className: "aa-inv__slot aa-inv__slot--empty", "aria-hidden": "true" });
    const on = cur && cur.id === w.id;
    return /* @__PURE__ */ h(
      "button",
      {
        key: w.id,
        id: "inv-" + w.id,
        "data-id": w.id,
        type: "button",
        role: "option",
        "aria-selected": on,
        tabIndex: on ? 0 : -1,
        className: cx("aa-inv__slot", on && "is-on", ed && w.published === false && "aa-ed-draft"),
        onMouseEnter: () => hoverPick(w),
        onFocus: () => pick(w),
        onClick: () => {
          if (on && !ed) setOpen(w);
          else pick(w);
        },
        "aria-label": `${w.title}, ${catLabel(w.category)}, ${w.year}`
      },
      w.previewImage ? /* @__PURE__ */ h("img", { src: w.previewImage, alt: "", loading: "lazy", decoding: "async" }) : /* @__PURE__ */ h("span", { className: "aa-inv__ph", "aria-hidden": "true" }, /* @__PURE__ */ h(Monogram, { variant: "mark" })),
      /* @__PURE__ */ h("span", { className: "aa-inv__badge", "aria-hidden": "true" }, items.indexOf(w) + 1),
      w.format === "9:16" && /* @__PURE__ */ h("span", { className: "aa-inv__fmt", "aria-hidden": "true" }, "9:16")
    );
  })), cur ? /* @__PURE__ */ h(InvDetail, { key: cur.id, work: cur, index: items.indexOf(cur), categoryLabel: catLabel(cur.category), reduced, onOpen: setOpen }) : /* @__PURE__ */ h("div", { className: "aa-inv__detail aa-inv__detail--empty" }, /* @__PURE__ */ h("p", { className: "aa-label" }, ed ? "Добавьте работу" : "В этой категории пока пусто")))), open && (() => {
    const m = /* @__PURE__ */ h(VideoModal, { work: open, categoryLabel: catLabel(open.category), onClose: () => setOpen(null) });
    return host && window.ReactDOM && window.ReactDOM.createPortal ? window.ReactDOM.createPortal(m, host) : m;
  })());
}
function InvDetail({ work, index, categoryLabel, reduced, onOpen }) {
  const ed = useEd();
  const p = "works.items.@" + work.id;
  const vertical = work.format === "9:16";
  const [vid, setVid] = useState(false);
  useEffect(() => {
    if (!work.previewVideo || reduced || ed) return;
    const t = setTimeout(() => setVid(true), 220);
    return () => clearTimeout(t);
  }, [work.previewVideo, reduced, ed]);
  return /* @__PURE__ */ h("div", { className: "aa-inv__detail" }, edEl(ed, "tools", { list: "works.items", id: work.id, kind: "work", axis: "x" }), /* @__PURE__ */ h("div", { className: cx("aa-inv__view", vertical && "aa-inv__view--v") }, /* @__PURE__ */ h("div", { className: "aa-inv__frame", style: { aspectRatio: vertical ? "9 / 16" : "16 / 9" } }, work.previewImage && /* @__PURE__ */ h("img", { src: work.previewImage, alt: `Кадр из работы «${work.title}»`, decoding: "async" }), vid && /* @__PURE__ */ h("video", { key: work.previewVideo, muted: true, loop: true, playsInline: true, autoPlay: true, preload: "none", "aria-hidden": "true" }, videoSources(work.previewVideo)), !work.previewImage && !vid && /* @__PURE__ */ h("span", { className: "aa-inv__ph", "aria-hidden": "true" }, /* @__PURE__ */ h(Monogram, { variant: "watermark" })), edEl(ed, "slot", { p: p + ".previewImage", v: work.previewImage, accept: "image", label: "Превью " + work.format }))), edEl(ed, "slot", { p: p + ".previewVideo", v: work.previewVideo, accept: "video", label: "Видео-превью (у выбранной)", compact: true }), edEl(ed, "slot", { p: p + ".videoUrl", v: work.videoUrl, accept: "video", label: "Ролик в плеере", compact: true, link: true }), /* @__PURE__ */ h("p", { className: "aa-inv__meta aa-micro" }, "№ ", pad(index + 1), " · ", categoryLabel, " · ", work.format, " · ", work.year), /* @__PURE__ */ h("h3", { className: "aa-inv__title" }, /* @__PURE__ */ h(E, { p: p + ".title", v: work.title, ph: "Название" })), (work.description || ed) && /* @__PURE__ */ h("p", { className: "aa-inv__desc" }, /* @__PURE__ */ h(E, { p: p + ".description", v: work.description, ph: "Описание" })), !ed && /* @__PURE__ */ h("button", { type: "button", className: "aa-inv__play", onClick: () => onOpen && onOpen(work) }, /* @__PURE__ */ h("span", { "aria-hidden": "true" }, "▶"), " Смотреть"));
}
function CaseTag({ item, index = 0, p }) {
  const ed = useEd();
  p = p || "cases.items.@" + item.id;
  return /* @__PURE__ */ h("article", { className: "aa-tag" }, edEl(ed, "tools", { list: "cases.items", id: item.id, kind: "case" }), /* @__PURE__ */ h("span", { className: "aa-tag__hole", "aria-hidden": "true" }), /* @__PURE__ */ h("span", { className: "aa-tag__pin", "aria-hidden": "true" }), /* @__PURE__ */ h("div", { className: "aa-tag__head aa-micro" }, /* @__PURE__ */ h("span", null, "Протокол № ", pad(index + 1, 3)), /* @__PURE__ */ h("span", null, item.year || "")), /* @__PURE__ */ h("h3", { className: "aa-h3 aa-tag__client" }, /* @__PURE__ */ h(E, { p: p + ".client", v: item.client, ph: "Клиент" })), /* @__PURE__ */ h("dl", { className: "aa-tag__rows" }, /* @__PURE__ */ h("dt", null, "Задача"), /* @__PURE__ */ h("dd", null, /* @__PURE__ */ h(E, { p: p + ".task", v: item.task, ph: "Задача" })), /* @__PURE__ */ h("dt", null, "Сделано"), /* @__PURE__ */ h("dd", null, /* @__PURE__ */ h(E, { p: p + ".done", v: item.done, ph: "Что сделано" }))), (item.metrics && item.metrics.length > 0 || ed) && /* @__PURE__ */ h("div", { className: "aa-tag__result" }, /* @__PURE__ */ h("div", { className: "aa-tag__result-h aa-micro" }, "Результат · было → стало"), (item.metrics || []).map((m, i) => {
    const mp = p + ".metrics." + i;
    return /* @__PURE__ */ h("div", { className: "aa-tag__metric aa-ed-host", key: i }, /* @__PURE__ */ h("span", { className: "aa-micro" }, /* @__PURE__ */ h(E, { p: mp + ".label", v: m.label, ph: "Метрика" })), /* @__PURE__ */ h("s", { "aria-label": "было " + m.before }, /* @__PURE__ */ h(E, { p: mp + ".before", v: m.before, ph: "0" })), /* @__PURE__ */ h("span", { "aria-hidden": "true" }, "→"), /* @__PURE__ */ h("b", { "aria-label": "стало " + m.after }, /* @__PURE__ */ h(E, { p: mp + ".after", v: m.after, ph: "0" })), edEl(ed, "tools", { list: p + ".metrics", index: i, kind: "metric" }));
  }), edEl(ed, "add", { list: p + ".metrics", kind: "metric", label: "Метрика" })), /* @__PURE__ */ h("div", { className: "aa-tag__foot" }, item.link ? /* @__PURE__ */ h("a", { href: item.link, target: "_blank", rel: "noopener" }, "Смотреть →") : /* @__PURE__ */ h("span", { className: "aa-micro" }, "[ ссылка: cases.items[].link ]"), /* @__PURE__ */ h(Monogram, { variant: "seal" })));
}
const JR_FLIP = 760;
const paperPos = (i, side) => {
  const r = rng((i + 1) * 7919 + (side === "L" ? 13 : 101) >>> 0);
  return `${-Math.round(r() * 1536)}px ${-Math.round(r() * 1536)}px`;
};
function CasePage({ item, index, side }) {
  const ed = useEd();
  const p = "cases.items.@" + item.id;
  const metrics = item.metrics || [];
  const pp = paperPos(index, side);
  if (side === "L") return /* @__PURE__ */ h("div", { className: "aa-jr__page aa-jr__page--l", style: { "--pp": pp } }, edEl(ed, "tools", { list: "cases.items", id: item.id, kind: "case" }), /* @__PURE__ */ h("div", { className: "aa-jr__meta" }, "Протокол № ", pad(index + 1, 3), item.year ? " · " + item.year : ""), /* @__PURE__ */ h("h3", { className: "aa-jr__client" }, /* @__PURE__ */ h(E, { p: p + ".client", v: item.client, ph: "Клиент" })), /* @__PURE__ */ h("div", { className: "aa-jr__label" }, "Задача"), /* @__PURE__ */ h("p", { className: "aa-jr__text" }, /* @__PURE__ */ h(E, { p: p + ".task", v: item.task, ph: "Задача" })), /* @__PURE__ */ h("span", { className: "aa-jr__num", "aria-hidden": "true" }, index * 2 + 1));
  return /* @__PURE__ */ h("div", { className: "aa-jr__page aa-jr__page--r", style: { "--pp": pp } }, /* @__PURE__ */ h("div", { className: "aa-jr__label" }, "Сделано"), /* @__PURE__ */ h("p", { className: "aa-jr__text" }, /* @__PURE__ */ h(E, { p: p + ".done", v: item.done, ph: "Что сделано" })), (metrics.length > 0 || ed) && /* @__PURE__ */ h("div", { className: "aa-jr__res" }, /* @__PURE__ */ h("div", { className: "aa-jr__label" }, "Результат"), metrics.map((m, i) => {
    const mp = p + ".metrics." + i;
    return /* @__PURE__ */ h("div", { className: "aa-jr__metric aa-ed-host", key: i }, /* @__PURE__ */ h("span", { className: "aa-jr__mlabel" }, /* @__PURE__ */ h(E, { p: mp + ".label", v: m.label, ph: "Метрика" })), /* @__PURE__ */ h("s", { className: "aa-jr__before", "aria-label": "было " + m.before }, /* @__PURE__ */ h(E, { p: mp + ".before", v: m.before, ph: "0" })), /* @__PURE__ */ h("span", { className: "aa-jr__after", "aria-label": "стало " + m.after }, /* @__PURE__ */ h(E, { p: mp + ".after", v: m.after, ph: "0" }), /* @__PURE__ */ h("svg", { viewBox: "0 0 100 50", preserveAspectRatio: "none", "aria-hidden": "true" }, /* @__PURE__ */ h("path", { d: "M8 28 C 6 8, 70 2, 92 18 C 104 30, 70 48, 34 46 C 10 44, 2 34, 14 20" }))), edEl(ed, "tools", { list: p + ".metrics", index: i, kind: "metric" }));
  }), edEl(ed, "add", { list: p + ".metrics", kind: "metric", label: "Метрика" })), item.link ? /* @__PURE__ */ h("a", { className: "aa-jr__link", href: item.link, target: "_blank", rel: "noopener" }, "смотреть работу →") : null, /* @__PURE__ */ h("span", { className: "aa-jr__num", "aria-hidden": "true" }, index * 2 + 2));
}
function Cases({ cases = {}, id = "cases" }) {
  const ed = useEd();
  const reduced = useReducedMotion();
  const items = cases.items || [];
  const pages = useMemo(() => items.flatMap((it, i) => [{ it, i, side: "L" }, { it, i, side: "R" }]), [items]);
  const bookRef = useRef(null);
  const [single, setSingle] = useState(false);
  useEffect(() => {
    const el = bookRef.current;
    if (!el) return;
    const fit = () => setSingle(el.parentElement.clientWidth < 640);
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro && ro.observe(el.parentElement);
    return () => ro && ro.disconnect();
  }, []);
  const step = single ? 1 : 2;
  const [at, setAt] = useState(0);
  const [flip, setFlip] = useState(null);
  const flipT = useRef(0);
  useEffect(() => () => clearTimeout(flipT.current), []);
  const cur = Math.max(0, Math.min(single ? at : at - at % 2, pages.length - 1));
  const go = (dir) => {
    if (flip) return;
    const to = cur + dir * step;
    if (to < 0 || to >= pages.length) return;
    if (reduced) {
      setAt(to);
      return;
    }
    setFlip({ dir, to });
    clearTimeout(flipT.current);
    flipT.current = setTimeout(() => {
      setAt(to);
      setFlip(null);
    }, JR_FLIP);
  };
  const blank = (side, n) => /* @__PURE__ */ h("div", { className: `aa-jr__page aa-jr__page--${side === "L" ? "l" : "r"} aa-jr__page--blank`, style: { "--pp": paperPos(50 + n, side) } });
  const pg = (k, side) => pages[k] ? /* @__PURE__ */ h(CasePage, { key: pages[k].it.id + pages[k].side, item: pages[k].it, index: pages[k].i, side: pages[k].side }) : blank(side || (k % 2 ? "R" : "L"), k);
  const stack = (top, under, side, n) => /* @__PURE__ */ h("div", { className: "aa-jr__cell aa-jr__cell--" + side.toLowerCase() }, !ed && /* @__PURE__ */ h("div", { className: "aa-jr__under aa-jr__under--2", "aria-hidden": "true" }, blank(side, n + 7)), !ed && /* @__PURE__ */ h("div", { className: "aa-jr__under aa-jr__under--1", "aria-hidden": "true" }, under), top);
  const down = useRef(null);
  const onDown = (e) => {
    down.current = e.clientX;
  };
  const onUp = (e) => {
    if (down.current == null) return;
    const dx = e.clientX - down.current;
    down.current = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  };
  const onKey = (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    }
  };
  const caseNo = pages[cur] ? pages[cur].i + 1 : 0;
  let base, leaf = null;
  if (!single) {
    const dL = flip && flip.dir < 0 ? flip.to : cur, dR = flip && flip.dir > 0 ? flip.to : cur;
    base = /* @__PURE__ */ h(Fragment, null, stack(pg(dL, "L"), pg(dL - 2, "L"), "L", dL), stack(pg(dR + 1, "R"), pg(dR + 3, "R"), "R", dR));
    if (flip) leaf = flip.dir > 0 ? /* @__PURE__ */ h("div", { className: "aa-jr__leaf aa-jr__leaf--next" }, /* @__PURE__ */ h("div", { className: "aa-jr__face" }, pg(cur + 1)), /* @__PURE__ */ h("div", { className: "aa-jr__face aa-jr__face--back" }, pg(flip.to))) : /* @__PURE__ */ h("div", { className: "aa-jr__leaf aa-jr__leaf--prev" }, /* @__PURE__ */ h("div", { className: "aa-jr__face" }, pg(cur)), /* @__PURE__ */ h("div", { className: "aa-jr__face aa-jr__face--back" }, pg(flip.to + 1)));
  } else {
    const d = flip && flip.dir > 0 ? flip.to : cur;
    base = stack(pg(d), pg(d + 1), pages[d] && pages[d].side === "L" ? "L" : "R", d);
    if (flip) leaf = /* @__PURE__ */ h("div", { className: cx("aa-jr__leaf aa-jr__leaf--single", flip.dir < 0 && "is-back") }, /* @__PURE__ */ h("div", { className: "aa-jr__face" }, flip.dir > 0 ? pg(cur) : pg(flip.to)));
  }
  return /* @__PURE__ */ h("section", { className: "aa-section aa-cases", id, "data-theme": "other", "data-header": "other", "aria-labelledby": id + "-h" }, edEl(ed, "section", { p: "cases", kind: "cases", label: "Кейсы" }), /* @__PURE__ */ h("div", { className: "aa-wrap", style: { position: "relative" } }, /* @__PURE__ */ h("div", { className: "aa-section__head" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h2", { className: "aa-h2", id: id + "-h" }, /* @__PURE__ */ h(E, { p: "cases.title", v: cases.title })))), /* @__PURE__ */ h("div", { className: cx("aa-jr", single && "aa-jr--single") }, /* @__PURE__ */ h("div", { className: "aa-jr__glow", "aria-hidden": "true" }), /* @__PURE__ */ h("div", { className: "aa-jr__stage" }, /* @__PURE__ */ h(
    "div",
    {
      ref: bookRef,
      className: "aa-jr__book",
      tabIndex: 0,
      role: "group",
      "aria-roledescription": "журнал",
      "aria-label": `Кейсы: запись ${caseNo} из ${items.length}`,
      onKeyDown: onKey,
      onPointerDown: ed ? void 0 : onDown,
      onPointerUp: ed ? void 0 : onUp
    },
    base,
    leaf,
    !ed && !flip && /* @__PURE__ */ h(Fragment, null, cur > 0 && /* @__PURE__ */ h("button", { type: "button", className: "aa-jr__hit aa-jr__hit--prev", onClick: () => go(-1), "aria-label": "Предыдущая страница" }), cur + step < pages.length && /* @__PURE__ */ h("button", { type: "button", className: "aa-jr__hit aa-jr__hit--next", onClick: () => go(1), "aria-label": "Следующая страница" }))
  )), /* @__PURE__ */ h("div", { className: "aa-jr__nav" }, /* @__PURE__ */ h("span", { className: "aa-jr__count", "aria-live": "polite" }, "запись ", caseNo, " из ", items.length)), edEl(ed, "add", { list: "cases.items", kind: "case", label: "Кейс" }))));
}
const RE_TG = /^@[A-Za-z0-9_]{4,32}$/;
const RE_TGURL = /^(https?:\/\/)?t\.me\/[A-Za-z0-9_]{4,32}\/?$/i;
const RE_MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function validateLead(v) {
  const e = {};
  if (!v.name || v.name.trim().length < 2) e.name = "Назови себя - хотя бы две буквы";
  const c = (v.contact || "").trim();
  if (!c) e.contact = "Оставь @username или email";
  else if (!(RE_TG.test(c) || RE_TGURL.test(c) || RE_MAIL.test(c))) e.contact = "Нужен @username в Telegram или email";
  if (!v.message || v.message.trim().length < 10) e.message = "Опиши задачу хотя бы парой предложений";
  return e;
}
function StaticBurst() {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    c.width = 120;
    c.height = 60;
    const img = ctx.createImageData(120, 60);
    let raf;
    const st = performance.now();
    const draw = (now) => {
      const t = (now - st) / 1400;
      if (t > 1) {
        ctx.clearRect(0, 0, 120, 60);
        return;
      }
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 255;
        d[i] = v;
        d[i + 1] = v * 0.8;
        d[i + 2] = v * 0.74;
        d[i + 3] = 255 * (1 - t);
      }
      ctx.putImageData(img, 0, 0);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);
  return /* @__PURE__ */ h("canvas", { ref, "aria-hidden": "true" });
}
const LEGAL_URL = { consent: "/consent", privacy: "/privacy" };
const cfgUrl = (k) => typeof window !== "undefined" && window.AA_CONFIG && window.AA_CONFIG.legalUrls && window.AA_CONFIG.legalUrls[k] || LEGAL_URL[k];
const homeUrl = () => typeof window !== "undefined" && window.AA_CONFIG && window.AA_CONFIG.homeUrl || "/";
function consentLabel(text) {
  const t = text || "Согласен на обработку персональных данных согласно {consent:согласию} и ознакомлен с {privacy:политикой}";
  return t.split(/(\{(?:consent|privacy):[^}]+\})/).map((part, i) => {
    const m = /^\{(consent|privacy):([^}]+)\}$/.exec(part);
    return m ? /* @__PURE__ */ h("a", { key: i, href: cfgUrl(m[1]), target: "_blank", rel: "noopener" }, m[2]) : part;
  });
}
function Transmitter({ contact = {}, onSubmit, initialState = "idle" }) {
  const ed = useEd();
  const f = contact.fields || {};
  const [vals, setVals] = useState({ name: "", contact: "", message: "" });
  const [errs, setErrs] = useState({});
  const [touched, setTouched] = useState({});
  const [state, setState] = useState(initialState);
  const [consent, setConsent] = useState(false);
  const refs = { name: useRef(null), contact: useRef(null), message: useRef(null), consent: useRef(null) };
  const consentErr = contact.consentError || "Нужно согласие на обработку данных";
  const check = (v, c) => {
    const e = validateLead(v);
    if (!c) e.consent = consentErr;
    return e;
  };
  const set = (k) => (e) => {
    const nv = { ...vals, [k]: e.target.value };
    setVals(nv);
    if (touched[k]) setErrs(check(nv, consent));
  };
  const blur = (k) => () => {
    setTouched({ ...touched, [k]: true });
    setErrs(check(vals, consent));
  };
  const toggleConsent = (e) => {
    const c = e.target.checked;
    setConsent(c);
    if (touched.consent) setErrs(check(vals, c));
  };
  const submit = async (e) => {
    e.preventDefault();
    if (ed) return;
    const er = check(vals, consent);
    setErrs(er);
    setTouched({ name: true, contact: true, message: true, consent: true });
    const first = ["name", "contact", "message", "consent"].find((k) => er[k]);
    if (first) {
      refs[first].current && refs[first].current.focus();
      return;
    }
    setState("sending");
    try {
      await (onSubmit ? onSubmit({ ...vals, consent: true }) : new Promise((r) => setTimeout(r, 1200)));
      setState("success");
      setVals({ name: "", contact: "", message: "" });
      setConsent(false);
      setTouched({});
    } catch (_) {
      setState("error");
    }
  };
  const field = (k, multi) => {
    const invalid = touched[k] && errs[k];
    const common = { id: "aa-f-" + k, name: k, value: vals[k], onChange: set(k), onBlur: blur(k), placeholder: (f[k] || {}).placeholder, ref: refs[k], "aria-invalid": invalid ? "true" : "false", "aria-describedby": invalid ? "aa-f-" + k + "-e" : void 0, disabled: state === "sending" };
    return /* @__PURE__ */ h("div", { className: "aa-field", "data-invalid": invalid ? "true" : "false" }, /* @__PURE__ */ h("label", { className: "aa-field__l aa-label", htmlFor: "aa-f-" + k }, /* @__PURE__ */ h("span", null, /* @__PURE__ */ h(E, { p: "contact.fields." + k + ".label", v: (f[k] || {}).label })), /* @__PURE__ */ h("span", { "aria-hidden": "true" }, k === "name" ? "CH-1" : k === "contact" ? "CH-2" : "CH-3")), multi ? /* @__PURE__ */ h("textarea", { ...common, rows: 4 }) : /* @__PURE__ */ h("input", { ...common, type: "text", autoComplete: k === "name" ? "name" : "off", inputMode: k === "contact" ? "email" : void 0 }), invalid && /* @__PURE__ */ h("div", { className: "aa-field__err", id: "aa-f-" + k + "-e" }, errs[k]));
  };
  const freqStr = contact.frequency || "Частота 104.7 · Канал AA";
  const fm = /(\d{2,3}(?:[.,]\d)?)/.exec(freqStr);
  const fq = fm ? Math.min(108, Math.max(88, parseFloat(fm[1].replace(",", ".")))) : 104.7;
  const tuned = ["name", "contact", "message"].filter((k) => vals[k].trim()).length + (consent ? 1 : 0);
  const target = (fq - 88) / 20 * 100, needle = state === "success" ? target : 8 + (target - 8) * tuned / 4;
  return /* @__PURE__ */ h("div", { className: cx("aa-tx", state === "sending" && "aa-tx--sending"), "data-theme": "other", "data-tuned": tuned === 4 ? "true" : "false" }, /* @__PURE__ */ h("span", { className: "aa-tx__antenna", "aria-hidden": "true" }, /* @__PURE__ */ h("i", null), /* @__PURE__ */ h("i", null), /* @__PURE__ */ h("i", null)), /* @__PURE__ */ h("div", { className: "aa-tx__display aa-label" }, /* @__PURE__ */ h("span", { className: "aa-tx__freq" }, /* @__PURE__ */ h(E, { p: "contact.frequency", v: contact.frequency || (ed ? "" : "Частота 104.7 · Канал AA"), ph: "Частота" })), /* @__PURE__ */ h("span", { style: { display: "inline-flex", gap: 12, alignItems: "center" } }, /* @__PURE__ */ h("span", { className: "aa-tx__bars", "aria-hidden": "true" }, /* @__PURE__ */ h("i", null), /* @__PURE__ */ h("i", null), /* @__PURE__ */ h("i", null), /* @__PURE__ */ h("i", null), /* @__PURE__ */ h("i", null)), /* @__PURE__ */ h(Rec, { label: state === "sending" ? "TX" : "ON AIR" }))), /* @__PURE__ */ h("div", { className: "aa-tx__dial", "aria-hidden": "true" }, /* @__PURE__ */ h("div", { className: "aa-tx__scale" }, [88, 92, 96, 100, 104, 108].map((n) => /* @__PURE__ */ h("span", { key: n, style: { left: (n - 88) / 20 * 100 + "%" } }, n))), /* @__PURE__ */ h("span", { className: "aa-tx__needle", style: { transform: `translateX(${needle.toFixed(2)}%)` } }, /* @__PURE__ */ h("i", null))), /* @__PURE__ */ h("div", { "aria-live": "polite", className: "aa-sr" }, state === "sending" ? "Отправка…" : state === "success" ? contact.successTitle || "Сигнал принят" : state === "error" ? contact.errorText || "Ошибка отправки" : ""), state === "success" ? /* @__PURE__ */ h("div", { className: "aa-tx__ok" }, /* @__PURE__ */ h(StaticBurst, null), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("p", { className: "aa-display aa-tx__ok-t" }, contact.successTitle || "Сигнал принят"), /* @__PURE__ */ h("p", null, contact.successText), /* @__PURE__ */ h(Button, { variant: "outline", onClick: () => setState("idle") }, contact.successAgain || "Передать ещё"))) : /* @__PURE__ */ h("form", { className: "aa-tx__body", noValidate: true, onSubmit: submit }, /* @__PURE__ */ h("h2", { className: "aa-display aa-tx__title", id: "contact-h" }, /* @__PURE__ */ h(E, { p: "contact.title", v: contact.title })), /* @__PURE__ */ h("p", { className: "aa-tx__lead" }, /* @__PURE__ */ h(E, { p: "contact.lead", v: contact.lead })), state === "error" && /* @__PURE__ */ h("div", { className: "aa-tx__alert", role: "alert" }, contact.errorText), field("name"), field("contact"), field("message", true), (() => {
    const invalid = touched.consent && errs.consent;
    return /* @__PURE__ */ h("div", { className: "aa-field aa-consent", "data-invalid": invalid ? "true" : "false" }, /* @__PURE__ */ h("label", { className: "aa-consent__l aa-label", htmlFor: "aa-f-consent" }, /* @__PURE__ */ h("input", { id: "aa-f-consent", ref: refs.consent, className: "aa-consent__box", type: "checkbox", name: "consent", checked: consent, onChange: toggleConsent, disabled: state === "sending", "aria-invalid": invalid ? "true" : "false", "aria-describedby": invalid ? "aa-f-consent-e" : void 0 }), /* @__PURE__ */ h("span", { className: "aa-consent__t" }, consentLabel(contact.consentText)), /* @__PURE__ */ h("span", { className: "aa-consent__ch", "aria-hidden": "true" }, "CH-4")), invalid && /* @__PURE__ */ h("div", { className: "aa-field__err", id: "aa-f-consent-e" }, errs.consent));
  })(), /* @__PURE__ */ h("div", { className: "aa-tx__foot" }, /* @__PURE__ */ h(Button, { variant: "siren", type: "submit", disabled: state === "sending", arrow: state === "sending" ? null : "→" }, state === "sending" ? contact.sendingLabel || "Передача…" : contact.submitLabel || "Отправить"), state === "sending" && /* @__PURE__ */ h("span", { className: "aa-tx__progress", "aria-hidden": "true" }, /* @__PURE__ */ h("i", null)), /* @__PURE__ */ h("span", { className: "aa-tx__grille", "aria-hidden": "true" }))));
}
function Contact({ contact = {}, onSubmit, id = "contact" }) {
  const ed = useEd();
  return /* @__PURE__ */ h("section", { className: "aa-section aa-contact", id, "data-theme": "other", "data-header": "other", "aria-labelledby": "contact-h" }, edEl(ed, "section", { p: "contact", kind: "contact", label: "Связь и форма" }), /* @__PURE__ */ h("div", { className: "aa-wrap" }, /* @__PURE__ */ h("div", { className: "aa-contact__grid" }, /* @__PURE__ */ h(Transmitter, { contact, onSubmit }), /* @__PURE__ */ h("aside", { className: "aa-contact__aside", "aria-label": "Каналы связи" }, /* @__PURE__ */ h("p", { className: "aa-label", style: { marginBottom: 12 } }, /* @__PURE__ */ h(E, { p: "contact.channelsTitle", v: contact.channelsTitle || (ed ? "" : "Прямые частоты"), ph: "Прямые частоты" })), /* @__PURE__ */ h("ul", { className: "aa-channels" }, (contact.channels || []).map((c, i) => /* @__PURE__ */ h("li", { key: c.id }, c.url ? /* @__PURE__ */ h("a", { href: c.url, target: "_blank", rel: "noopener" }, /* @__PURE__ */ h("span", { className: "aa-channels__n aa-micro" }, pad(i + 1)), /* @__PURE__ */ h("span", null, /* @__PURE__ */ h("span", { className: "aa-micro aa-muted", style: { display: "block" } }, /* @__PURE__ */ h(E, { p: "contact.channels.@" + c.id + ".label", v: c.label })), /* @__PURE__ */ h("span", { className: "aa-channels__v" }, /* @__PURE__ */ h(E, { p: "contact.channels.@" + c.id + ".value", v: c.value }))), /* @__PURE__ */ h("span", { "aria-hidden": "true" }, "↗")) : /* @__PURE__ */ h("a", { "aria-disabled": "true", role: "link" }, /* @__PURE__ */ h("span", { className: "aa-channels__n aa-micro" }, pad(i + 1)), /* @__PURE__ */ h("span", null, /* @__PURE__ */ h("span", { className: "aa-micro aa-muted", style: { display: "block" } }, /* @__PURE__ */ h(E, { p: "contact.channels.@" + c.id + ".label", v: c.label })), /* @__PURE__ */ h("span", { className: "aa-channels__v" }, /* @__PURE__ */ h(E, { p: "contact.channels.@" + c.id + ".value", v: c.value }))), /* @__PURE__ */ h("span", null))))), (contact.asideNote || ed) && /* @__PURE__ */ h("span", { className: "aa-micro" }, /* @__PURE__ */ h(E, { p: "contact.asideNote", v: contact.asideNote, ph: "Подпись" }))))));
}
const EDGE_ROWS = [[0.86, 0.15], [0.62, 0.3], [0.38, 0.4], [0.16, 0.5], [0.05, 0.6]], EDGE_ABOVE = 2, EDGE_COLS = 24;
const EDGE_SKIP = "a, button, input, textarea, label, p, h1, h2, h3, li, .aa-poster, .aa-tag, .aa-tx, .aa-contact__aside, .aa-works__intro, .aa-walls__h, .aa-note, .aa-counters, .aa-tracklist, .aa-section__kicker, [contenteditable]";
function crackD(r) {
  const side = (k) => [[r() * 112, 0], [112, r() * 112], [r() * 112, 112], [0, r() * 112]][k];
  const a = Math.floor(r() * 4), b = (a + 1 + Math.floor(r() * 3)) % 4;
  const [x0, y0] = side(a), [x1, y1] = side(b);
  let d = `M${x0.toFixed(1)} ${y0.toFixed(1)}`;
  const n = 4 + Math.floor(r() * 3);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    d += ` L${(x0 + (x1 - x0) * t + (r() - 0.5) * 18).toFixed(1)} ${(y0 + (y1 - y0) * t + (r() - 0.5) * 18).toFixed(1)}`;
  }
  d += ` L${x1.toFixed(1)} ${y1.toFixed(1)}`;
  if (r() < 0.5) {
    const bx = x0 + (x1 - x0) * 0.5, by = y0 + (y1 - y0) * 0.5;
    d += ` M${bx.toFixed(1)} ${by.toFixed(1)} l${((r() - 0.5) * 40).toFixed(1)} ${((r() - 0.5) * 40).toFixed(1)}`;
  }
  return d;
}
function brokenClip(r) {
  if (r() < 0.5) {
    const ys = [0, 1, 2, 3, 4].map(() => 30 + r() * 60);
    return `polygon(0 0, 100% 0, 100% ${ys[0]}%, 78% ${ys[1]}%, 52% ${ys[2]}%, 27% ${ys[3]}%, 0 ${ys[4]}%)`;
  }
  const cx2 = 30 + r() * 40, cy = 30 + r() * 40;
  return r() < 0.5 ? `polygon(0 0, 100% 0, 100% ${cy}%, ${cx2}% 100%, 0 100%)` : `polygon(0 0, 100% 0, 100% 100%, ${cx2}% 100%, 0 ${cy}%)`;
}
function CrackSvg({ d }) {
  return /* @__PURE__ */ h("svg", { viewBox: "0 0 112 112", "aria-hidden": "true" }, /* @__PURE__ */ h("path", { d, className: "aa-cracks__lit", transform: "translate(.8 1)" }), /* @__PURE__ */ h("path", { d, className: "aa-cracks__line" }));
}
const EDGE = (() => {
  const r = rng(31), out = [];
  EDGE_ROWS.forEach(([keep, brk], i) => {
    const above = i < EDGE_ABOVE;
    for (let c = 0; c < EDGE_COLS; c++) {
      const left = c * TILE, top = i * TILE, present = r() < keep, broken = present && r() < brk, cracked = present && r() < 0.45;
      if (above && (!present || broken)) out.push(/* @__PURE__ */ h("i", { key: "h" + i + "-" + c, className: "aa-edge__h", style: { left, top, backgroundPosition: `${-left}px calc(-1 * var(--band-y, 0px) - ${top}px)` } }));
      if (present) out.push(/* @__PURE__ */ h("i", { key: i + "-" + c, className: "aa-edge__t", "data-patch": above && !broken ? "1" : void 0, style: { left, top, clipPath: broken ? brokenClip(r) : void 0, backgroundPosition: `${-left}px calc(-1 * var(--band-y, 0px) - ${top}px), ${-left}px calc(-1 * var(--band-y, 0px) - ${top}px)` } }, cracked && /* @__PURE__ */ h(CrackSvg, { d: crackD(r) })));
    }
  });
  return out;
})();
const DUST = (() => {
  const r = rng(9);
  return Array.from({ length: 18 }, (_, i) => /* @__PURE__ */ h("i", { key: i, style: { left: (8 + r() * 84).toFixed(1) + "%", top: (8 + r() * 84).toFixed(1) + "%", animationDuration: (7 + r() * 9).toFixed(1) + "s", animationDelay: (-r() * 14).toFixed(1) + "s", "--dx": ((r() - 0.5) * 90).toFixed(0) + "px", "--s": (0.6 + r() * 1.1).toFixed(2) } }));
})();
function Otherworld({ children, seam = false }) {
  const ref = useRef(null), viewRef = useRef(null), lightRef = useRef(null), dustRef = useRef(null);
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  useEffect(() => {
    const el = ref.current, V = viewRef.current, L = lightRef.current, D = dustRef.current;
    if (!el || !V || !L) return;
    const coarse = matchMedia("(pointer: coarse)").matches;
    const rK = reduced ? coarse ? 0.8 : 0.55 : coarse ? 0.62 : 0.42;
    let W = 1, H = 1, S = 1;
    const size = () => {
      W = V.clientWidth;
      H = V.clientHeight;
      const half = Math.hypot(W, H) * 1.05;
      S = half / 100;
      L.style.setProperty("--f", (rK * Math.max(W, H) / half * 100).toFixed(2) + "%");
    };
    const put = (x, y) => {
      L.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${S.toFixed(3)})`;
      if (D) D.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    };
    size();
    if (reduced) {
      put(W * 0.62, H * 0.42);
      const r = () => {
        size();
        put(W * 0.62, H * 0.42);
      };
      window.addEventListener("resize", r);
      return () => window.removeEventListener("resize", r);
    }
    let raf = 0, visible = false;
    const t0 = performance.now();
    const tick = (now) => {
      raf = 0;
      if (!visible) return;
      const t = (now - t0) / 1e3;
      const x = 0.5 + 0.24 * Math.sin(t * 0.23) + 0.08 * Math.sin(t * 0.61 + 2.1);
      const y = 0.5 + 0.18 * Math.sin(t * 0.31 + 1.3) + 0.1 * Math.sin(t * 0.53 + 0.4);
      put(W * x, H * y);
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!raf && visible) raf = requestAnimationFrame(tick);
    };
    const onResize = () => {
      size();
      start();
    };
    const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible) start();
    }) : null;
    if (io) io.observe(el);
    else {
      visible = true;
      start();
    }
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      io && io.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [reduced]);
  useEffect(() => {
    const el = ref.current;
    if (!el || !seam) return;
    const prev = el.previousElementSibling;
    const fit = () => {
      if (prev) el.style.setProperty("--tile-y", (TILE - prev.offsetHeight % TILE) % TILE + "px");
      if (prev) el.style.setProperty("--band-y", prev.offsetHeight + (TILE - prev.offsetHeight % TILE) % TILE - EDGE_ABOVE * TILE + "px");
      const cases = el.querySelector(".aa-cases");
      if (!cases) return;
      el.style.setProperty("--cases-at", cases.offsetTop + "px");
    };
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    if (ro) {
      ro.observe(el);
      prev && ro.observe(prev);
    }
    return () => ro && ro.disconnect();
  }, [seam]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const w = el.querySelector(".aa-works"), c = el.querySelector(".aa-cases"), j = el.querySelector(".aa-jr"), k = el.querySelector(".aa-contact");
      const last = k || c;
      if (last) el.style.setProperty("--bg-end", last.offsetTop + last.offsetHeight + "px");
      if (k) el.style.setProperty("--contact-y", Math.round(k.offsetTop + k.offsetHeight * 0.5) + "px");
      if (w) el.style.setProperty("--works-y", Math.round(w.offsetTop + w.offsetHeight * 0.55) + "px");
      if (c && j) el.style.setProperty("--cases-y", Math.round(c.offsetTop + j.offsetTop + j.offsetHeight * 0.45) + "px");
    };
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro && ro.observe(el);
    return () => ro && ro.disconnect();
  }, []);
  const ed = useEd();
  useEffect(() => {
    const el = ref.current, root = el && el.parentElement;
    if (!el || !root || !seam || ed) return;
    const band = el.querySelector(".aa-edge"), holes = band && band.querySelector(".aa-edge__holes"), fx = band && band.querySelector(".aa-edge__fx");
    if (!band || !holes || !fx) return;
    let downX = 0, downY = 0;
    const bare = (e) => !(e.target.closest && e.target.closest(EDGE_SKIP));
    const onDown = (e) => {
      downX = e.clientX;
      downY = e.clientY;
      if (e.detail > 1 && bare(e)) e.preventDefault();
    };
    const onClick = (e) => {
      if (e.button !== 0 || !bare(e) || Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) return;
      const list = band.querySelectorAll(".aa-edge__t:not(.is-fall)");
      let hit = null, hb = null;
      for (let i = list.length - 1; i >= 0; i--) {
        const rb = list[i].getBoundingClientRect();
        if (e.clientX >= rb.left && e.clientX < rb.right && e.clientY >= rb.top && e.clientY < rb.bottom) {
          hit = list[i];
          hb = rb;
          break;
        }
      }
      if (!hit) return;
      const left = parseFloat(hit.style.left), top = parseFloat(hit.style.top);
      if (hit.dataset.patch) {
        const h2 = document.createElement("i");
        h2.className = "aa-edge__h";
        h2.style.left = left + "px";
        h2.style.top = top + "px";
        h2.style.backgroundPosition = `${-left}px calc(-1 * var(--band-y, 0px) - ${top}px)`;
        holes.appendChild(h2);
      }
      if (reducedRef.current) {
        hit.classList.add("is-fall", "is-gone");
        return;
      }
      hit.style.setProperty("--dx", ((Math.random() - 0.5) * 80).toFixed(0) + "px");
      hit.style.setProperty("--rot", ((Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 22)).toFixed(0) + "deg");
      hit.classList.add("is-fall");
      setTimeout(() => hit.classList.add("is-gone"), 1e3);
      const px = e.clientX - hb.left, py = e.clientY - hb.top;
      for (let k = 0; k < 4; k++) {
        const f = document.createElement("i");
        f.className = "aa-knock__f";
        f.style.left = (left + px - 8 + (Math.random() - 0.5) * 30).toFixed(0) + "px";
        f.style.top = (top + py - 8 + (Math.random() - 0.5) * 30).toFixed(0) + "px";
        f.style.setProperty("--dx", ((Math.random() - 0.5) * 160).toFixed(0) + "px");
        f.style.setProperty("--rot", ((Math.random() - 0.5) * 540).toFixed(0) + "deg");
        f.style.setProperty("--s", (0.5 + Math.random() * 0.8).toFixed(2));
        fx.appendChild(f);
        setTimeout(() => f.remove(), 1100);
      }
    };
    root.addEventListener("mousedown", onDown);
    root.addEventListener("click", onClick);
    return () => {
      root.removeEventListener("mousedown", onDown);
      root.removeEventListener("click", onClick);
      holes.textContent = "";
      fx.textContent = "";
    };
  }, [seam, ed]);
  return /* @__PURE__ */ h("div", { ref, className: cx("aa-otherworld", seam && "aa-otherworld--seam") }, /* @__PURE__ */ h("div", { className: "aa-otherworld__wall", "aria-hidden": "true" }, seam && /* @__PURE__ */ h("div", { className: "aa-edge" }, /* @__PURE__ */ h("div", { className: "aa-edge__holes" }), EDGE, /* @__PURE__ */ h("div", { className: "aa-edge__fx" }))), /* @__PURE__ */ h("div", { className: "aa-otherworld__dark", "aria-hidden": "true" }, /* @__PURE__ */ h("div", { className: "aa-otherworld__view", ref: viewRef }, /* @__PURE__ */ h("div", { className: "aa-otherworld__light", ref: lightRef }), /* @__PURE__ */ h("div", { className: "aa-otherworld__dust", ref: dustRef }, DUST))), /* @__PURE__ */ h("div", { className: "aa-inv-bg", "aria-hidden": "true" }, /* @__PURE__ */ h("i", null), /* @__PURE__ */ h("i", null)), children);
}
const DEV_CREDIT = { label: "Разработка сайта - vissegor.ru", url: "https://vissegor.ru/" };
function Footer({ footer = {}, monogram = "AA", onNavigate }) {
  const ed = useEd();
  return /* @__PURE__ */ h("footer", { className: "aa-footer", "data-theme": "other", "data-header": "other" }, edEl(ed, "section", { p: "footer", kind: "footer", label: "Футер" }), /* @__PURE__ */ h("div", { className: "aa-wrap aa-footer__row" }, /* @__PURE__ */ h(Monogram, { variant: "mark", text: monogram }), /* @__PURE__ */ h("div", { className: "aa-label" }, /* @__PURE__ */ h(E, { p: "footer.copyright", v: footer.copyright })), /* @__PURE__ */ h("a", { className: "aa-label", href: "#top", onClick: (e) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate("top");
    }
  } }, "↑ ", /* @__PURE__ */ h(E, { p: "footer.toTop", v: footer.toTop || (ed ? "" : "Наверх"), ph: "Наверх" }))), /* @__PURE__ */ h("nav", { className: "aa-wrap aa-footer__legal aa-micro", "aria-label": "Документы" }, /* @__PURE__ */ h("a", { href: cfgUrl("privacy"), target: ed ? "_blank" : void 0 }, /* @__PURE__ */ h(E, { p: "footer.privacyLabel", v: footer.privacyLabel || (ed ? "" : "Политика обработки данных"), ph: "Политика обработки данных" })), /* @__PURE__ */ h("a", { href: cfgUrl("consent"), target: ed ? "_blank" : void 0 }, /* @__PURE__ */ h(E, { p: "footer.consentLabel", v: footer.consentLabel || (ed ? "" : "Согласие на обработку данных"), ph: "Согласие на обработку данных" })), /* @__PURE__ */ h("a", { className: "aa-footer__credit", href: DEV_CREDIT.url, target: "_blank", rel: "noopener" }, DEV_CREDIT.label, " ↗")));
}
const ruDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso || "";
};
function legalText(text, legal = {}, site = "") {
  const vals = { ...legal, effectiveDate: ruDate(legal.effectiveDate), site: site || (typeof location !== "undefined" ? location.host : "") };
  return String(text || "").split(/(\{\w+\})/).map((part, i) => {
    const m = /^\{(\w+)\}$/.exec(part);
    if (!m) return part;
    if (m[1] === "policyLink") return /* @__PURE__ */ h("a", { key: i, href: cfgUrl("privacy") }, "«", legal.policyTitle || "Политика обработки персональных данных", "»");
    if (m[1] === "consentLink") return /* @__PURE__ */ h("a", { key: i, href: cfgUrl("consent") }, "«", legal.consentTitle || "Согласие на обработку персональных данных", "»");
    return vals[m[1]] != null ? String(vals[m[1]]) : part;
  });
}
function LegalPage({ content, kind = "privacy" }) {
  const c = content || {};
  const L = c.legal || {};
  const mono = c.site && c.site.monogram || "AA";
  const isPolicy = kind !== "consent";
  const title = isPolicy ? L.policyTitle || "Политика обработки персональных данных" : L.consentTitle || "Согласие на обработку персональных данных";
  const version = isPolicy ? L.policyVersion : L.consentVersion;
  return /* @__PURE__ */ h("div", { className: "aa-page aa-legal", "data-theme": "other", id: "top" }, /* @__PURE__ */ h("header", { className: "aa-legal__bar" }, /* @__PURE__ */ h("a", { className: "aa-legal__home", href: homeUrl() }, /* @__PURE__ */ h(Monogram, { variant: "mark", text: mono, label: "На главную" }), /* @__PURE__ */ h("span", { className: "aa-label" }, "← На сайт")), /* @__PURE__ */ h("span", { className: "aa-micro aa-legal__doc" }, isPolicy ? "Документ 01" : "Документ 02")), /* @__PURE__ */ h("main", { className: "aa-legal__main", id: "main" }, /* @__PURE__ */ h("p", { className: "aa-legal__meta aa-micro" }, "Версия ", version || "1.0", " · действует с ", ruDate(L.effectiveDate)), /* @__PURE__ */ h("h1", { className: "aa-legal__title" }, title), isPolicy ? (L.policy || []).map((sec, i) => /* @__PURE__ */ h("section", { key: i, className: "aa-legal__sec" }, /* @__PURE__ */ h("h2", { className: "aa-legal__h aa-label" }, /* @__PURE__ */ h("span", { "aria-hidden": "true" }, pad(i + 1)), sec.title), (sec.paragraphs || []).map((p, k) => /* @__PURE__ */ h("p", { key: k }, legalText(p, L, c.site && c.site.domain))))) : /* @__PURE__ */ h("section", { className: "aa-legal__sec" }, (L.consent || []).map((p, k) => /* @__PURE__ */ h("p", { key: k }, legalText(p, L, c.site && c.site.domain)))), /* @__PURE__ */ h("p", { className: "aa-legal__see aa-micro" }, isPolicy ? /* @__PURE__ */ h("a", { href: cfgUrl("consent") }, L.consentTitle || "Согласие на обработку персональных данных", " →") : /* @__PURE__ */ h("a", { href: cfgUrl("privacy") }, L.policyTitle || "Политика обработки персональных данных", " →"))), /* @__PURE__ */ h(Footer, { footer: c.footer, monogram: mono }));
}
function Landing({ content, contained = false, onSubmitLead, atmosphere = true }) {
  const c = content || {};
  const reduced = useReducedMotion();
  const lite = useLite();
  const rootRef = useRef(null);
  const [hdr, setHdr] = useState("other");
  const [active, setActive] = useState(null);
  const [solid, setSolid] = useState(false);
  const mono = c.site && c.site.monogram || "AA";
  const nav = useCallback((id) => {
    if (id === "top") {
      const sc = getScroller(rootRef.current);
      sc.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      return;
    }
    scrollToId(id, reduced);
  }, [reduced]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const sc = getScroller(root);
    const ioRoot = sc === window ? null : sc;
    if (typeof IntersectionObserver === "undefined") return;
    const topHits = /* @__PURE__ */ new Set();
    const pickHdr = () => {
      let best = null, bt = -Infinity;
      for (const el of topHits) {
        const t2 = el.getBoundingClientRect().top;
        if (t2 <= 32 && t2 > bt) {
          bt = t2;
          best = el;
        }
      }
      setHdr(best ? best.getAttribute("data-header") : "other");
    };
    const ioHdr = new IntersectionObserver((es) => {
      es.forEach((e) => e.isIntersecting ? topHits.add(e.target) : topHits.delete(e.target));
      pickHdr();
    }, { root: ioRoot, rootMargin: "0px 0px -95% 0px" });
    root.querySelectorAll("[data-header]").forEach((el) => ioHdr.observe(el));
    const ids = (c.nav || []).map((n) => n.id);
    const midHits = /* @__PURE__ */ new Set();
    const ioNav = new IntersectionObserver((es) => {
      es.forEach((e) => e.isIntersecting ? midHits.add(e.target.id) : midHits.delete(e.target.id));
      setActive(ids.find((id) => midHits.has(id)) || null);
    }, { root: ioRoot, rootMargin: "-40% 0px -59% 0px" });
    ids.forEach((id) => {
      const el = document.getElementById(id);
      el && ioNav.observe(el);
    });
    let t = 0;
    const scrolled = () => (sc === window ? window.scrollY : sc.scrollTop) > 8;
    const onScroll = () => {
      setSolid(scrolled());
      if (!t) root.setAttribute("data-scrolling", "");
      clearTimeout(t);
      t = setTimeout(() => {
        t = 0;
        root.removeAttribute("data-scrolling");
      }, 140);
    };
    setSolid(scrolled());
    sc.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      ioHdr.disconnect();
      ioNav.disconnect();
      sc.removeEventListener("scroll", onScroll);
      clearTimeout(t);
      root.removeAttribute("data-scrolling");
    };
  }, [c.nav]);
  return /* @__PURE__ */ h("div", { ref: rootRef, className: cx("aa-page", contained && "aa-page--contained", lite && "aa-lite"), "data-theme": "other" }, /* @__PURE__ */ h("a", { className: "aa-sr", href: "#main" }, "К содержимому"), /* @__PURE__ */ h(Header, { nav: c.nav, monogram: mono, theme: hdr, active, onNavigate: nav, solid }), /* @__PURE__ */ h("main", { id: "main" }, /* @__PURE__ */ h(Hero, { hero: c.hero, onNavigate: nav }), /* @__PURE__ */ h(About, { about: c.about }), /* @__PURE__ */ h(Services, { services: c.services }), c.rift && c.rift.enabled === true && /* @__PURE__ */ h(WorldRift, { rift: c.rift }), /* @__PURE__ */ h(Otherworld, { seam: !(c.rift && c.rift.enabled === true) }, /* @__PURE__ */ h(Works, { works: c.works }), /* @__PURE__ */ h(Cases, { cases: c.cases }), /* @__PURE__ */ h(Contact, { contact: c.contact, onSubmit: onSubmitLead || api.submitLead }))), /* @__PURE__ */ h(Footer, { footer: c.footer, monogram: mono, onNavigate: nav }), atmosphere && /* @__PURE__ */ h(Atmosphere, { fixed: true, scanlines: false }));
}
const api = {
  /** Контент страницы. Сейчас - локальный объект, позже GET {endpoint}. */
  async loadContent({ endpoint, fallback } = {}) {
    if (endpoint) {
      try {
        const r = await fetch(endpoint, { headers: { Accept: "application/json" } });
        if (r.ok) return await r.json();
      } catch (_) {
      }
    }
    return fallback || window.AA_CONTENT || null;
  },
  /** Заявка из формы. Без endpoint - имитация: 1.2 с задержки; имя со словом «ошибка» - отказ (для проверки состояния). */
  async submitLead(payload, { endpoint } = {}) {
    const ep = endpoint || window.AA_CONFIG && window.AA_CONFIG.leadEndpoint;
    if (!ep && window.AA_CONFIG && window.AA_CONFIG.staticSite) throw new Error("no lead endpoint");
    if (ep) {
      const r = await fetch(ep, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json().catch(() => ({}));
    }
    await new Promise((r) => setTimeout(r, 1200));
    if (/ошибка|error/i.test(payload && payload.name || "")) throw new Error("mock error");
    return { ok: true };
  }
};

window.AA = Object.assign(window.AA || {}, { videoSources, scrollToId, E, Monogram, Button, Rec, Chip, Barcode, Atmosphere, Header, Hero, Counter, About, Tracklist, Services, WorldRift, PosterCard, youtubeId, VideoModal, Works, CaseTag, Cases, validateLead, Transmitter, Contact, Otherworld, Footer, legalText, LegalPage, Landing, EditContext, api });
})();
