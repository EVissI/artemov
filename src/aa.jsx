/* AA - Два мира · компоненты лендинга (React 18, классический JSX → h) */
const React = window.React;
const { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, Fragment } = React;
const h = React.createElement;

/* ============ утилиты ============ */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const bump = (p, c, w) => clamp(1 - Math.abs(p - c) / w);
function hashStr(str) { let x = 2166136261; for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pad = (n, l = 2) => String(n).padStart(l, '0');
/* Видео: загруженный WebM идёт вместе с запасным MP4 (тот же адрес с .mp4) - для Safari на старых iOS.
   Браузер берёт первый источник, который умеет играть. */
export function videoSources(url) {
  if (!url) return null;
  if (/^(?:\/|\.\/)?uploads\/[^?#]+\.webm$/i.test(url)) return [<source key="w" src={url} type="video/webm" />, <source key="m" src={url.replace(/\.webm$/i, '.mp4')} type="video/mp4" />];
  return [<source key="s" src={url} />];
}
const cx = (...a) => a.filter(Boolean).join(' ');

function useReducedMotion() {
  const q = '(prefers-reduced-motion: reduce)';
  const [r, setR] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => { const m = matchMedia(q); const f = () => setR(m.matches); m.addEventListener && m.addEventListener('change', f); return () => m.removeEventListener && m.removeEventListener('change', f); }, []);
  return r;
}
function useLite() {
  const [lite] = useState(() => {
    if (typeof matchMedia === 'undefined') return false;
    return matchMedia('(pointer: coarse)').matches || matchMedia('(max-width: 720px)').matches || (navigator.hardwareConcurrency || 8) <= 4;
  });
  return lite;
}
function useInView(ref, { once = true, rootMargin = '0px', threshold = 0.2 } = {}) {
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setV(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); if (once) io.disconnect(); } else if (!once) setV(false); }, { rootMargin, threshold });
    io.observe(el); return () => io.disconnect();
  }, []);
  return v;
}
/* корень прокрутки: .aa-page--contained (превью) или окно */
function getScroller(el) { const c = el && el.closest && el.closest('.aa-page--contained'); return c || window; }
function viewportH(sc) { return sc === window ? window.innerHeight : sc.clientHeight; }
export function scrollToId(id, reduced) {
  const el = document.getElementById(id); if (!el) return;
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  setTimeout(() => el.focus({ preventScroll: true }), reduced ? 0 : 600);
}

/* ============ режим правки (админка) ============
   Админка оборачивает Landing в EditContext.Provider со своим объектом ed:
   ed.text / ed.slot / ed.tools / ed.add / ed.section возвращают элементы редактора.
   Без провайдера (публичный сайт) всё ниже - просто текст и null. */
export const EditContext = React.createContext(null);
const useEd = () => React.useContext(EditContext);
/* Редактируемый текст: p - путь в контенте ("hero.subtitle", "works.items.@w-01.title", "about.paragraphs.0") */
export function E({ p, v, ph }) { const ed = useEd(); return ed ? ed.text({ p, v, ph }) : (v == null ? null : v); }
const edEl = (ed, k, props) => (ed ? ed[k](props) : null);

/* ============ языки ============
   Русский - основа. Английский - перевод поверх: content.en той же формы, что и сам контент (только тексты и медиа,
   которые отличаются). Пустое или отсутствующее поле в content.en - на сайте русский текст. Списки с id сливаются по id,
   без id - по номеру. Включается галочкой content.i18n.en.enabled (админка, «Страница»). Адреса: / и /en,
   документы /privacy и /en/privacy. Тексты интерфейса, которых нет в контенте, - UI. */
export const LANGS = ['ru', 'en'];
export const LangContext = React.createContext('ru');
const useLang = () => React.useContext(LangContext);
const UI = {
  ru: {
    skip: 'К содержимому', home: 'Артем Артемов - на главную', sections: 'Разделы', menu: 'Меню', close: 'Закрыть', lang: 'Язык сайта',
    intro: 'Вступление', watch: 'Смотреть', worksCats: 'Категории работ', worksShown: 'Показано работ: ', worksList: 'Работы', all: 'Все',
    catEmpty: 'В этой категории пока пусто', still: 'Кадр из работы', closeX: 'Закрыть ✕', noSignal: 'Сигнал отсутствует', openYt: 'Открыть на YouTube ↗',
    protocol: 'Протокол №', task: 'Задача', done: 'Сделано', result: 'Результат', before: 'было', after: 'стало', watchWork: 'смотреть работу →',
    journal: 'журнал', casesAt: 'Кейсы: запись {n} из {m}', record: 'запись {n} из {m}', prevPage: 'Предыдущая страница', nextPage: 'Следующая страница',
    errName: 'Назови себя - хотя бы две буквы', errContactEmpty: 'Оставь @username или email', errContact: 'Нужен @username в Telegram или email',
    errMessage: 'Опиши задачу хотя бы парой предложений', errConsent: 'Нужно согласие на обработку данных',
    consentText: 'Согласен на обработку персональных данных согласно {consent:согласию} и ознакомлен с {privacy:политикой}',
    freq: 'Частота 104.7 · Канал AA', sending: 'Отправка…', successTitle: 'Сигнал принят', errorText: 'Ошибка отправки', again: 'Передать ещё',
    submit: 'Отправить', sendingBtn: 'Передача…', channels: 'Каналы связи', channelsTitle: 'Прямые частоты',
    toTop: 'Наверх', docs: 'Документы', privacyLabel: 'Политика обработки данных', consentLabel: 'Согласие на обработку данных',
    policyTitle: 'Политика обработки персональных данных', consentTitle: 'Согласие на обработку персональных данных',
    toSite: '← На сайт', homeShort: 'На главную', doc: 'Документ', version: 'Версия', since: 'действует с', dev: 'Разработка сайта - vissegor.ru',
    cookieText: 'Сайт может сохранить одну техническую cookie - чтобы запомнить выбранный язык. Аналитики, рекламы и слежки нет. Подробнее - в {privacy:политике}.', cookieAccept: 'Принять', cookieDecline: 'Отклонить', cookieLabel: 'Cookie', cookieSettings: 'Cookie',
  },
  en: {
    skip: 'Skip to content', home: 'Artem Artemov - home', sections: 'Sections', menu: 'Menu', close: 'Close', lang: 'Site language',
    intro: 'Intro', watch: 'Watch', worksCats: 'Work categories', worksShown: 'Works shown: ', worksList: 'Works', all: 'All',
    catEmpty: 'Nothing in this category yet', still: 'Still from', closeX: 'Close ✕', noSignal: 'No signal', openYt: 'Open on YouTube ↗',
    protocol: 'Record No.', task: 'Task', done: 'Done', result: 'Result', before: 'before', after: 'after', watchWork: 'watch the work →',
    journal: 'journal', casesAt: 'Cases: record {n} of {m}', record: 'record {n} of {m}', prevPage: 'Previous page', nextPage: 'Next page',
    errName: 'Your name - at least two letters', errContactEmpty: 'Leave a @username or an email', errContact: 'Need a Telegram @username or an email',
    errMessage: 'Describe the task in a couple of sentences', errConsent: 'Consent to data processing is required',
    consentText: 'I consent to the processing of personal data under the {consent:consent form} and have read the {privacy:policy}',
    freq: 'Frequency 104.7 · Channel AA', sending: 'Sending…', successTitle: 'Signal received', errorText: 'Sending failed', again: 'Send another',
    submit: 'Send', sendingBtn: 'Transmitting…', channels: 'Contact channels', channelsTitle: 'Direct frequencies',
    toTop: 'Back to top', docs: 'Documents', privacyLabel: 'Privacy policy', consentLabel: 'Consent to data processing',
    policyTitle: 'Personal data processing policy', consentTitle: 'Consent to personal data processing',
    toSite: '← Back to site', homeShort: 'Home', doc: 'Document', version: 'Version', since: 'effective from', dev: 'Website by vissegor.ru',
    cookieText: 'This site can store one technical cookie - to remember the language you chose. No analytics, ads or tracking. More in the {privacy:policy}.', cookieAccept: 'Accept', cookieDecline: 'Decline', cookieLabel: 'Cookies', cookieSettings: 'Cookies',
  },
};
const tr = (lang, k, vars) => { let t = (UI[lang] && UI[lang][k]) || UI.ru[k] || k; if (vars) for (const [a, b] of Object.entries(vars)) t = t.replace('{' + a + '}', b); return t; };
const useT = () => { const l = useLang(); return (k, vars) => tr(l, k, vars); };
const hasText = (v) => !(v == null || (typeof v === 'string' && v.trim() === ''));
// перевод поверх основы: строки - если не пустые, объекты - по ключам, списки - по id или по номеру
function overlay(base, t) {
  if (t == null) return base;
  if (Array.isArray(base)) {
    if (!Array.isArray(t)) return base;
    const byId = base.some((x) => x && typeof x === 'object' && x.id != null);
    return base.map((b, i) => overlay(b, byId ? t.find((x) => x && b && x.id === b.id) : t[i]));
  }
  if (base && typeof base === 'object') {
    if (typeof t !== 'object' || Array.isArray(t)) return base;
    const o = { ...base };
    for (const k of Object.keys(t)) if (k !== 'id') o[k] = k in base ? overlay(base[k], t[k]) : (hasText(t[k]) ? t[k] : base[k]);
    return o;
  }
  return typeof t === 'string' && (base == null || typeof base === 'string') ? (hasText(t) ? t : base) : base;
}
/** Контент на нужном языке: для en - перевод content.en поверх русского. */
export function localize(content, lang) {
  if (!content || lang !== 'en') return content;
  const { en, ...base } = content;
  return { ...overlay(base, en || {}), en };
}
/** Включён ли язык на сайте (русский - всегда). */
export const langOn = (content, lang) => lang === 'ru' || !!(content && content.i18n && content.i18n[lang] && content.i18n[lang].enabled);
const DEF_URLS = { home: { ru: '/', en: '/en' }, privacy: { ru: '/privacy', en: '/en/privacy' }, consent: { ru: '/consent', en: '/en/consent' } };
/** Выбор языка в переключателе: cookie aa_lang на год (техническая, только для этого; см. плашку CookieNotice). */
const COOKIE_KEY = 'aa-cookie';
const cookieChoice = () => { try { return localStorage.getItem(COOKIE_KEY) || ''; } catch (_) { return ''; } };
const setLangCookie = (l, maxAge) => { try { document.cookie = 'aa_lang=' + l + '; Path=/; Max-Age=' + maxAge + '; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : ''); } catch (_) { /* нет cookie - и не надо */ } };
// переключатель: с согласием - запоминаем язык в cookie; без него - только ?lang=ru, чтобы сервер не увёл обратно на /en
const goLang = (e, l, cur) => {
  e.preventDefault(); if (l === cur) return;
  const accepted = cookieChoice() === 'accepted';
  if (accepted) setLangCookie(l, 31536000);
  fogSwitch(l, siteUrl('home', l) + (l === 'ru' && !accepted ? '?lang=ru' : ''));
};
/* Смена языка в тумане - БЕЗ перезагрузки страницы: при перезагрузке браузер замораживает старую страницу
   и туман на новой стартует заново - был пролаг. Теперь: туман сгущается (~0.9 с, разметка и стили - как у прелоадера,
   .aa-pre--fog в index.html), под ним main.js подменяет язык (window.AA_setLang: перевод content.en поверх,
   history.pushState на /en или /, заголовок, lang), страница «успокаивается», туман рассеивается (~1.6 с).
   Слой тумана создаётся заранее, едва курсор подошёл к переключателю (prewarmFog) - первая отрисовка его текстур
   не совпадает с анимацией. Нет AA_setLang (например, админка) - обычный переход по ссылке.
   Только opacity/transform; reduced-motion - язык меняется сразу. */
let fogEl = null;
function prewarmFog() {
  if (fogEl && document.body.contains(fogEl)) return fogEl;
  fogEl = document.createElement('div');
  fogEl.className = 'aa-pre aa-pre--fog is-enter is-warm'; fogEl.setAttribute('aria-hidden', 'true');
  fogEl.innerHTML = '<div class="aa-pre__fog"></div><div class="aa-pre__fog"></div><div class="aa-pre__fog"></div>';
  document.body.appendChild(fogEl);
  return fogEl;
}
function whenCalm(fn) { // браузер освободился и прошло два кадра
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 120));
  idle(() => requestAnimationFrame(() => requestAnimationFrame(fn)), { timeout: 500 });
}
function fogSwitch(l, url) {
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!window.AA_setLang) { location.href = url; return; }
  if (reduce) { window.AA_setLang(l, url); return; }
  const el = prewarmFog();
  el.getBoundingClientRect(); el.classList.remove('is-warm'); el.classList.add('is-on');
  setTimeout(() => {
    window.AA_setLang(l, url); // синхронно, под плотным туманом
    whenCalm(() => {
      el.classList.add('is-out');
      setTimeout(() => { el.remove(); if (fogEl === el) fogEl = null; }, 1700);
    });
  }, 950);
}
/** Адреса главной и документов по языку. */
export function siteUrl(kind, lang = 'ru') { return DEF_URLS[kind][lang] || DEF_URLS[kind].ru; }

/* ============ базовые элементы ============ */
export function Monogram({ variant = 'mark', text = 'AA', className, label, ...rest }) {
  const deco = variant !== 'mark';
  return <span {...rest} className={cx('aa-mono', 'aa-mono--' + variant, className)} aria-hidden={deco || undefined} aria-label={!deco ? (label || 'Артем Артемов') : undefined} role={!deco ? 'img' : undefined}>{text}</span>;
}

export function Button({ variant = 'siren', href, children, arrow, className, ...rest }) {
  const cls = cx('aa-btn', 'aa-btn--' + variant, className);
  const inner = <Fragment>{children}{arrow && <span className="aa-btn__arrow" aria-hidden="true">{arrow}</span>}</Fragment>;
  return href ? <a href={href} className={cls} {...rest}>{inner}</a> : <button type="button" className={cls} {...rest}>{inner}</button>;
}

export function Rec({ label = 'REC', className }) {
  return <span className={cx('aa-rec aa-label', className)}><span className="aa-rec__dot" aria-hidden="true"></span>{label}</span>;
}

export function Chip({ active, count, children, ...rest }) {
  return <button type="button" className="aa-chip" aria-pressed={active ? 'true' : 'false'} {...rest}>{children}{count != null && <span className="aa-chip__n">{pad(count)}</span>}</button>;
}

export function Barcode({ seed = 'AA', className, bars = 34 }) {
  const r = rng(hashStr(String(seed)));
  const rects = []; let x = 0;
  for (let i = 0; i < bars; i++) { const w = r() < 0.3 ? 3 : r() < 0.6 ? 2 : 1; if (i % 2 === 0) rects.push(<rect key={i} x={x} y="0" width={w} height={i % 9 === 0 ? 30 : 26} />); x += w + (r() < 0.5 ? 1 : 2); }
  return <svg className={className} viewBox={`0 0 ${x} 30`} preserveAspectRatio="none" aria-hidden="true" fill="currentColor">{rects}</svg>;
}

/* ============ атмосфера ============ */
export function Atmosphere({ fixed = true, grain = true, scanlines = true, vignette = true }) {
  return <div className={cx('aa-atmos', fixed && 'aa-atmos--fixed')} aria-hidden="true">
    {grain && <div className="aa-atmos__grain"></div>}
    {scanlines && <div className="aa-atmos__scan"></div>}
    {vignette && <div className="aa-atmos__vignette"></div>}
  </div>;
}

/* ============ хедер ============ */
export function Header({ nav = [], monogram = 'AA', recLabel = 'REC', theme = 'other', active, onNavigate, fixed = true, solid = false, langs = [] }) {
  const [open, setOpen] = useState(false); const lang = useLang(); const t = useT();
  const go = (e, id) => { if (onNavigate) { e.preventDefault(); onNavigate(id); } setOpen(false); };
  return <header className={cx('aa-header', !fixed && 'aa-header--static', open && 'aa-header--open', solid && 'aa-header--solid')} data-theme={theme}>
    <a className="aa-header__logo" href="#top" onClick={(e) => go(e, 'top')}><Monogram variant="mark" text={monogram} label={t('home')} /></a>
    <nav aria-label={t('sections')}>
      <ul className="aa-header__nav aa-label" id="aa-nav">
        {nav.map((n) => <li key={n.id}><a href={'#' + n.id} aria-current={active === n.id ? 'true' : undefined} onClick={(e) => go(e, n.id)}>{n.label}</a></li>)}
      </ul>
    </nav>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {langs.length > 1 && <nav className="aa-langs" aria-label={t('lang')}>{langs.map((l) => <a key={l} href={siteUrl('home', l)} hrefLang={l} lang={l} aria-current={l === lang ? 'true' : undefined} onClick={(e) => goLang(e, l, lang)} onPointerEnter={l === lang ? undefined : prewarmFog} onFocus={l === lang ? undefined : prewarmFog}>{l.toUpperCase()}</a>)}</nav>}
      <Rec label={recLabel} />
      <button type="button" className="aa-header__menu aa-label" aria-expanded={open} aria-controls="aa-nav" onClick={() => setOpen(!open)}>{open ? t('close') : t('menu')}</button>
    </div>
  </header>;
}

/* ============ HERO: фото на весь экран, текст - в тёмной части слева ============
   Фон - hero.media (картинка или видео без звука). Фото прижато вправо (object-position), слева и снизу
   его гасит статичный градиент, чтобы текст лежал на тёмном. Стена следователя и фонарик удалены (бэкап -
   backup/design-2026-09-28-hero/). */
export function Hero({ hero = {}, onNavigate, id = 'top' }) {
  const ed = useEd();
  const media = hero.media || {};
  const go = (t) => (e) => { if (onNavigate) { e.preventDefault(); onNavigate(t); } };
  let scene = null;
  if (media.type === 'video' && media.src) scene = <video key={media.src} poster={media.poster || undefined} autoPlay muted loop playsInline preload="metadata" aria-hidden="true">{videoSources(media.src)}</video>;
  else if (media.src) scene = <img src={media.src} alt={media.alt || ''} decoding="async" fetchpriority="high" />;
  const lines = hero.titleLines || ['Артем', 'Артемов']; const t = useT();
  return <section className="aa-hero" id={id} data-theme="other" data-header="other" aria-label={t('intro')}>
    <div className="aa-hero__scene">{scene}</div>
    {edEl(ed, 'section', { p: 'hero', kind: 'hero', label: 'Hero и фон' })}
    <div className="aa-hero__content">
      {/* имя как логотип на обложке SH: первая буква строки крупнее, трещины-паутина (маска + нити, src/tex/hero-crack-*.webp), статичное свечение */}
      {hero.logo ? <h1 className="aa-hero__logo">
        {/* надпись-логотип картинкой (рисованная, в стиле обложки SH); настоящий текст - для поиска и экранных дикторов */}
        <img src={hero.logo} alt="" decoding="async" fetchpriority="high" />
        <span className="aa-sr">{lines.join(' ')}</span>
        {edEl(ed, 'slot', { p: 'hero.logo', v: hero.logo, accept: 'image', label: 'Надпись-логотип (PNG/WebP без фона)' })}
      </h1> : <h1 className="aa-hero__title">{edEl(ed, 'slot', { p: 'hero.logo', v: hero.logo, accept: 'image', label: 'Надпись-логотип', compact: true })}<span className="aa-hero__ink">{lines.map((l, i) => <span key={i} className="aa-hero__line">
        {ed || !l ? <E p={'hero.titleLines.' + i} v={l} /> : <><span className="aa-hero__cap">{l[0]}</span>{l.slice(1)}</>}
      </span>)}</span></h1>}
      <div className="aa-hero__cta">
        {hero.primaryCta && <Button variant="siren" href={'#' + hero.primaryCta.target} onClick={go(hero.primaryCta.target)}><E p="hero.primaryCta.label" v={hero.primaryCta.label} /></Button>}
        {hero.secondaryCta && <Button variant="outline" href={'#' + hero.secondaryCta.target} onClick={go(hero.secondaryCta.target)}><E p="hero.secondaryCta.label" v={hero.secondaryCta.label} /></Button>}
      </div>
    </div>
  </section>;
}

/* ============ счётчик ============ */
export function Counter({ value, display, suffix = '', label, duration = 1400 }) {
  const ref = useRef(null); const inView = useInView(ref, { threshold: 0.4 }); const reduced = useReducedMotion();
  const final = value == null ? (display || '∞') : String(value);
  const digits = final.length;
  const [shown, setShown] = useState(() => value == null ? '·' : '0'.repeat(digits));
  const numRef = useRef(null);
  useEffect(() => {
    if (!inView) return;
    if (reduced) { setShown(final); return; }
    let raf, st = performance.now();
    const glyphs = '0123456789';
    // промежуточные кадры - прямо в текстовый узел, React трогаем только в конце
    const put = (txt) => { const n = numRef.current; if (n && n.textContent !== txt) n.textContent = txt; };
    const step = (now) => {
      const t = clamp((now - st) / duration); const e = 1 - Math.pow(1 - t, 3);
      if (t >= 1) { put(final); setShown(final); return; }
      if (value == null) put(['8', '0', '∞', '#'][Math.floor(now / 70) % 4]);
      else {
        const cur = String(Math.round(value * e)).padStart(digits, '0');
        const settled = Math.floor(e * digits);
        put(cur.split('').map((c, i) => i < settled ? c : glyphs[Math.floor(Math.random() * 10)]).join(''));
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, value]);
  return <div className="aa-counter" ref={ref}>
    <div className="aa-counter__v"><span aria-hidden="true" ref={numRef}>{shown}</span><small aria-hidden="true">{suffix}</small><span className="aa-sr">{final}{suffix ? ' ' + suffix : ''}</span></div>
    <div className="aa-counter__l aa-label">{label}</div>
  </div>;
}

/* ============ ОБО МНЕ ============ */
export function About({ about = {}, id = 'about' }) {
  const ed = useEd();
  // фон Мира 1 общий с «Услугами»: сетка кафеля (привязана к низу секции, чтобы швы продолжались в «Услугах») + трещина по швам
  return <section className="aa-section aa-about" id={id} data-theme="fog" data-header="other" aria-labelledby={id + '-h'}>
    <Cracks bottom items={[{ seed: 7, at: [7, 0], steps: [[0, -3]] }, { seed: 17, at: [1, 0], steps: [[0, -1], [1, 0]] }]} />
    <Knock bottom />
    <div className="aa-light" aria-hidden="true"></div>
    <div className="aa-fog" aria-hidden="true"><i></i><i></i></div>
    {edEl(ed, 'section', { p: 'about', kind: 'about', label: 'Обо мне и цифры' })}
    <div className="aa-wrap" style={{ position: 'relative' }}>
      <div className="aa-section__head">
        <div><h2 className="aa-h2" id={id + '-h'}><E p="about.title" v={about.title} /></h2></div>
      </div>
      <div className="aa-about__grid">
        <article className="aa-note">
          <span className="aa-note__pin" aria-hidden="true"></span>
          <h3 className="aa-note__title"><E p="about.noteTitle" v={about.noteTitle} /></h3>
          {(about.paragraphs || []).map((p, i) => <p key={i} className="aa-ed-host">{edEl(ed, 'tools', { list: 'about.paragraphs', index: i, kind: 'paragraph' })}<E p={'about.paragraphs.' + i} v={p} ph="Абзац" /></p>)}
          {edEl(ed, 'add', { list: 'about.paragraphs', kind: 'paragraph', label: 'Абзац' })}
          <div className="aa-note__sign"><span className="aa-label"><E p="about.signature" v={about.signature} /></span></div>
        </article>
        <div>
          <div className="aa-counters">
            {(about.stats || []).map((s) => <Counter key={s.id} value={s.value} display={s.display} suffix={s.suffix} label={<E p={'about.stats.@' + s.id + '.label'} v={s.label} />} />)}
          </div>
        </div>
      </div>
    </div>
  </section>;
}

/* ============ ПАСХАЛКА: кафель трескается от кликов ============
   Клик по голой стене «Обо мне» / «Услуг» попадает в клетку сетки 112px (у «Обо мне» сетка от низа, у «Услуг» - от верха).
   1-й удар - трещины от точки удара и дрожь, 2-й - ещё трещины, 3-й - плитка отваливается с обломками,
   на месте остаётся дыра с грязной штукатуркой (--fog-back). Работает только по клику: ни scroll, ни покадрового JS.
   Элементы создаются напрямую в DOM (без setState), падающие удаляются после анимации; ограничения нет - стену можно
   выбить целиком (это пара сотен статичных дыр по 112px, на скорость не влияет). Клики по тексту, записке, приборам, трек-листу, ссылкам и кнопкам не ловятся.
   В админке выключено. Состояние не сохраняется: после перезагрузки стена целая. */
// размеры слоёв текстуры стены по высоте (src/tex/grime.webp 832x736 поверх tiles.webp 1120x1120) - для привязки к низу «Обо мне»
const KNOCK_HITS = 3, TEX_TILES = 1120, TEX_GRIME = 736;
// плитки под этими элементами не выпадают (только трещины): тёмный текст на стали не читается
const KNOCK_HOLD = '.aa-section__head h2, .aa-section__head p, .aa-section__kicker';
const KNOCK_SKIP = 'a, button, input, textarea, label, p, h1, h2, h3, li, .aa-note, .aa-counters, .aa-tracklist, .aa-section__kicker, [contenteditable]';
function crackFrom(px, py, n, rnd = Math.random) {
  // n лучей от точки удара ломаной до края плитки (+ редкие отростки)
  let d = '';
  for (let k = 0; k < n; k++) {
    let a = rnd() * Math.PI * 2, x = px, y = py; d += `M${x.toFixed(1)} ${y.toFixed(1)}`;
    for (let i = 0; i < 12 && x > 0 && x < 112 && y > 0 && y < 112; i++) {
      a += (rnd() - 0.5) * 0.9; const l = 9 + rnd() * 12; x += Math.cos(a) * l; y += Math.sin(a) * l;
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
      if (rnd() < 0.18) { const b = a + (rnd() < 0.5 ? 1 : -1) * (0.6 + rnd() * 0.5), bl = 8 + rnd() * 12; d += ` M${x.toFixed(1)} ${y.toFixed(1)} l${(Math.cos(b) * bl).toFixed(1)} ${(Math.sin(b) * bl).toFixed(1)} M${x.toFixed(1)} ${y.toFixed(1)}`; }
    }
  }
  return d;
}
// заранее побитая стена: доли треснувших / отколотых / выпавших плиток на голой части стены
const PRE_CRACK = 0.09, PRE_CHIP = 0.035, PRE_GONE = 0.025;
// под этими объектами заранее ничего не создаём (их всё равно не видно)
const KNOCK_COVER = '.aa-note, .aa-counters, .aa-tracklist, .aa-services .aa-section__head p';
function Knock({ bottom = false }) {
  const ed = useEd(); const reduced = useReducedMotion(); const ref = useRef(null);
  useEffect(() => {
    const layer = ref.current, sec = layer && layer.parentElement; if (!layer || !sec || ed) return;
    let cells = new Map();
    const svgNS = 'http://www.w3.org/2000/svg';
    const addCrack = (tile, px, py, n, rnd) => {
      const d = crackFrom(px, py, n, rnd), g = document.createElementNS(svgNS, 'g');
      g.innerHTML = `<path d="${d}" class="aa-cracks__lit" transform="translate(.8 1)"/><path d="${d}" class="aa-cracks__line"/>`;
      tile.querySelector('svg').appendChild(g);
    };
    // плитка-двойник: тот же кусок обоих слоёв текстуры, что у стены под ним (у «Обо мне» текстура привязана к низу)
    const makeTile = (col, top, H) => {
      const tile = document.createElement('i'); tile.className = 'aa-knock__t';
      tile.style.left = col * TILE + 'px'; tile.style.top = top + 'px';
      tile.style.backgroundPosition = `${-col * TILE}px ${(bottom ? H % TEX_GRIME : 0) - top}px, ${-col * TILE}px ${(bottom ? H % TEX_TILES : 0) - top}px`;
      tile.innerHTML = '<svg viewBox="0 0 112 112" aria-hidden="true"></svg>';
      layer.appendChild(tile); return tile;
    };
    // дыра: сплошная грязная штукатурка за кафелем, рисунок привязан к секции - соседние дыры сливаются
    const makeHole = (col, top) => {
      const hole = document.createElement('i'); hole.className = 'aa-knock__h';
      hole.style.left = col * TILE + 'px'; hole.style.top = top + 'px';
      hole.style.backgroundPosition = `${-col * TILE}px ${-top}px`;
      layer.insertBefore(hole, layer.firstChild); return hole;
    };
    // у «Услуг» нижние ряды над трубой уже битые (слой рваного края Otherworld лежит поверх) - их не трогаем
    const inEdge = (top, H) => { const next = sec.nextElementSibling; return !bottom && next && next.classList.contains('aa-otherworld--seam') && top + TILE > H + ((TILE - (H % TILE)) % TILE) - 2 * TILE; };
    const hits = (sel, col, top, b) => { const cx0 = b.left + col * TILE, cy0 = b.top + top; return [...sec.querySelectorAll(sel)].some((n) => { const q = n.getBoundingClientRect(); return q.right > cx0 + 4 && q.left < cx0 + TILE - 4 && q.bottom > cy0 + 4 && q.top < cy0 + TILE - 4; }); };

    // ---- заранее побитые плитки: детерминированно по клетке (один и тот же вид при каждой загрузке) ----
    const seed = () => {
      layer.textContent = ''; cells = new Map();
      const b = sec.getBoundingClientRect(), W = sec.clientWidth, H = sec.clientHeight;
      const cols = Math.ceil(W / TILE), rows = Math.ceil(H / TILE);
      for (let k = 0; k < rows; k++) for (let col = 0; col < cols; col++) {
        const top = bottom ? H - (k + 1) * TILE : k * TILE; if (top + TILE <= 0 || inEdge(top, H)) continue;
        const r = rng(((col * 73856093) ^ (k * 19349663) ^ (bottom ? 83492791 : 2971215073)) >>> 0), roll = r();
        if (roll >= PRE_CRACK + PRE_CHIP + PRE_GONE) continue;
        if (hits(KNOCK_COVER, col, top, b)) continue;
        const hold = hits(KNOCK_HOLD, col, top, b), key = col + ':' + top;
        if (roll < PRE_CRACK || hold) {                       // треснутая: 1-2 сетки трещин, добить - 1-2 клика
          const tile = makeTile(col, top, H), n = r() < 0.4 ? 2 : 1;
          for (let i = 0; i < n; i++) addCrack(tile, 20 + r() * 72, 20 + r() * 72, 3, r);
          cells.set(key, { tile, hits: n, hold });
        } else if (roll < PRE_CRACK + PRE_CHIP) {             // отколота: за обломком штукатурка, отвалится с одного клика
          makeHole(col, top);
          const tile = makeTile(col, top, H); tile.style.clipPath = brokenClip(r);
          if (r() < 0.6) addCrack(tile, 20 + r() * 72, 10 + r() * 40, 2, r);
          cells.set(key, { tile, hits: KNOCK_HITS - 1, holed: true });
        } else {                                              // выпала
          makeHole(col, top); cells.set(key, { gone: true });
        }
      }
    };
    seed();
    // размеры поменялись (шрифты догрузились, окно) - сетка у «Обо мне» считается от низа, пересеваем
    let lastW = sec.clientWidth, lastH = sec.clientHeight, pend = 0;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
      if (sec.clientWidth === lastW && sec.clientHeight === lastH) return;
      lastW = sec.clientWidth; lastH = sec.clientHeight; cancelAnimationFrame(pend); pend = requestAnimationFrame(seed);
    }) : null;
    ro && ro.observe(sec);

    // быстрые клики: двойной/тройной клик по голой стене не выделяет текст; удар не засчитывается только при протаскивании мыши
    let downX = 0, downY = 0;
    const bare = (e) => !(e.target.closest && e.target.closest(KNOCK_SKIP));
    const onDown = (e) => { downX = e.clientX; downY = e.clientY; if (e.detail > 1 && bare(e)) e.preventDefault(); };
    const onClick = (e) => {
      if (e.button !== 0 || !bare(e)) return;
      if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) return;
      const b = sec.getBoundingClientRect(), W = sec.clientWidth, H = sec.clientHeight;
      const lx = e.clientX - b.left, ly = e.clientY - b.top; if (lx < 0 || ly < 0 || lx > W || ly > H) return;
      const col = Math.floor(lx / TILE);
      const top = bottom ? H - (Math.floor((H - ly) / TILE) + 1) * TILE : Math.floor(ly / TILE) * TILE;
      if (inEdge(top, H)) return;
      const key = col + ':' + top; let c = cells.get(key);
      if (c && c.gone) return;
      if (!c) { c = { tile: makeTile(col, top, H), hits: 0 }; cells.set(key, c); }
      const px = lx - col * TILE, py = ly - top; c.hits++;
      // под заголовком и подписями секции (тёмная краска) плитка только трескается: на штукатурке текст бы пропал
      if (c.hits >= KNOCK_HITS && c.hold === undefined) c.hold = hits(KNOCK_HOLD, col, top, b);
      if (c.hold) { if (c.hits <= KNOCK_HITS) addCrack(c.tile, px, py, 3); if (!reduced) { c.tile.classList.remove('is-hit'); void c.tile.offsetWidth; c.tile.classList.add('is-hit'); } return; }
      if (c.hits < KNOCK_HITS) {
        addCrack(c.tile, px, py, c.hits === 1 ? 3 : 4);
        if (!reduced) { c.tile.classList.remove('is-hit'); void c.tile.offsetWidth; c.tile.classList.add('is-hit'); }
        return;
      }
      // последний удар: дыра со штукатуркой, плитка и обломки падают
      c.gone = true;
      if (!c.holed) makeHole(col, top);
      const t = c.tile; t.classList.remove('is-hit');
      if (reduced) { t.classList.add('is-fade'); setTimeout(() => t.remove(), 400); return; }
      t.style.setProperty('--dx', ((Math.random() - 0.5) * 80).toFixed(0) + 'px');
      t.style.setProperty('--rot', ((Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 22)).toFixed(0) + 'deg');
      t.classList.add('is-fall');
      for (let k = 0; k < 4; k++) {
        const f = document.createElement('i'); f.className = 'aa-knock__f';
        f.style.left = (col * TILE + px - 8 + (Math.random() - 0.5) * 30).toFixed(0) + 'px'; f.style.top = (top + py - 8 + (Math.random() - 0.5) * 30).toFixed(0) + 'px';
        f.style.setProperty('--dx', ((Math.random() - 0.5) * 160).toFixed(0) + 'px'); f.style.setProperty('--rot', ((Math.random() - 0.5) * 540).toFixed(0) + 'deg');
        f.style.setProperty('--s', (0.5 + Math.random() * 0.8).toFixed(2));
        layer.appendChild(f); setTimeout(() => f.remove(), 1100);
      }
      setTimeout(() => t.remove(), 1100);
    };
    sec.addEventListener('mousedown', onDown); sec.addEventListener('click', onClick);
    return () => { cancelAnimationFrame(pend); ro && ro.disconnect(); sec.removeEventListener('mousedown', onDown); sec.removeEventListener('click', onClick); layer.textContent = ''; };
  }, [ed, reduced, bottom]);
  return ed ? null : <div ref={ref} className="aa-knock" aria-hidden="true"></div>;
}

/* ============ УСЛУГИ ============ */
export function Tracklist({ items = [], p = 'services.items' }) {
  const ed = useEd();
  return <ol className="aa-tracklist">
    {items.map((it, i) => { const ip = p + '.@' + it.id; return <li key={it.id || i} className="aa-track" tabIndex={ed ? undefined : 0}>
      <span className="aa-track__n" aria-hidden="true">{pad(i + 1)}</span>
      <h3 className="aa-track__t"><E p={ip + '.title'} v={it.title} ph="Название услуги" /></h3>
      <p className="aa-track__d"><E p={ip + '.text'} v={it.text} ph="Описание" /></p>
      {(it.timecode || ed) && <span className="aa-track__tc" aria-hidden="true"><E p={ip + '.timecode'} v={it.timecode} ph="00:00" /></span>}
      {edEl(ed, 'tools', { list: p, id: it.id, kind: 'service' })}
    </li>; })}
    {edEl(ed, 'add', { list: p, kind: 'service', label: 'Услуга', tag: 'li' })}
  </ol>;
}
// трещины идут по швам кафеля: at - узел сетки [колонка, ряд], steps - отрезки в плитках ([dx, 0] или [0, dy]).
// bottom - сетка привязана к низу секции (ряды считаются вверх от низа, dy < 0 - вверх). Размер плитки = --aa-tile в aa.css.
const TILE = 112;
function crackPath(seed, [c0, r0], steps) {
  const r = rng(seed); let x = c0 * TILE, y = r0 * TILE; const pts = [[x, y]], twigs = [];
  for (const [dx, dy] of steps) {
    const len = Math.abs(dx || dy) * TILE, n = Math.max(3, Math.round(len / 14)), sx = Math.sign(dx), sy = Math.sign(dy);
    for (let i = 1; i <= n; i++) {
      const t = i / n, j = i === n ? 0 : (r() - 0.5) * 4.5; // дрожит вдоль шва, в узлах сетки - точно в шве
      const px = x + sx * len * t + (dy ? j : 0), py = y + sy * len * t + (dx ? j : 0);
      pts.push([px, py]);
      // редкий отросток уходит с шва наискосок в плитку (перпендикулярные выглядят как стежки)
      if (i > 1 && i < n - 1 && r() < 0.09) { const a = Math.atan2(sy, sx) + (r() < 0.5 ? 1 : -1) * (0.45 + r() * 0.4), l = 16 + r() * 22;
        twigs.push(`M${px.toFixed(1)} ${py.toFixed(1)} L${(px + Math.cos(a) * l * 0.55).toFixed(1)} ${(py + Math.sin(a) * l * 0.55 + (r() - 0.5) * 3).toFixed(1)} L${(px + Math.cos(a) * l).toFixed(1)} ${(py + Math.sin(a) * l).toFixed(1)}`); }
    }
    x += sx * len; y += sy * len;
  }
  const [ax, ay] = pts[0];
  const chip = `M${ax - 7} ${ay} L${ax} ${ay - 6} L${ax + 5} ${ay + 1} L${ax} ${ay + 5} Z`; // скол угла плитки в начале трещины
  return { d: 'M' + pts.map(([px, py]) => px.toFixed(1) + ' ' + py.toFixed(1)).join(' L') + ' ' + twigs.join(' '), chip };
}
function Cracks({ items = [], bottom = false }) {
  return <svg className="aa-cracks" aria-hidden="true">
    <svg y={bottom ? '100%' : 0} overflow="visible">
      {items.map((it, i) => { const { d, chip } = crackPath(it.seed, it.at, it.steps); return <g key={i}>
        <path d={d} className="aa-cracks__lit" transform="translate(1 1.2)" />
        <path d={d} className="aa-cracks__line" />
        <path d={chip} className="aa-cracks__chip" />
      </g>; })}
    </svg>
  </svg>;
}
export function Services({ services = {}, id = 'services' }) {
  const ed = useEd();
  // фон Мира 1 общий с «Обо мне»: сетка кафеля (привязана к верху секции) + трещина по швам
  return <section className="aa-section aa-services" id={id} data-theme="fog" data-header="other" aria-labelledby={id + '-h'}>
    {edEl(ed, 'section', { p: 'services', kind: 'services', label: 'Услуги' })}
    <Cracks items={[{ seed: 3, at: [8, 0], steps: [[0, 1], [1, 0], [0, 1]] }]} />
    <Knock />
    <div className="aa-light" aria-hidden="true"></div>
    <div className="aa-fog" aria-hidden="true"><i></i><i></i></div>
    <div className="aa-wrap" style={{ position: 'relative' }}>
      <div className="aa-section__head">
        <div><h2 className="aa-h2" id={id + '-h'}><E p="services.title" v={services.title} /></h2></div>
        {(services.intro || ed) && <p className="aa-services__intro"><E p="services.intro" v={services.intro} ph="Вступление" /></p>}
      </div>
      <Tracklist items={services.items} />
    </div>
  </section>;
}

/* ============ ПЕРЕХОД МЕЖДУ МИРАМИ ============ */
export function WorldRift({ rift = {}, progress, strips: stripCount, id = 'rift' }) {
  const ed = useEd();
  const ref = useRef(null); const stageRef = useRef(null); const canvasRef = useRef(null);
  const reduced = useReducedMotion(); const lite = useLite();
  const controlled = typeof progress === 'number';
  const isStatic = controlled || reduced;
  const N = stripCount || (lite ? 6 : 8);
  // Scroll-driven animations: полосы, вспышка и затемнения едут в потоке композитора синхронно со скроллом,
  // главный поток их не двигает. Где не поддерживается (Firefox) - прежний путь через JS.
  const sda = useMemo(() => !isStatic && typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('animation-timeline: view()'), [isStatic]);
  const model = useMemo(() => {
    const r = rng(20260926);
    const order = Array.from({ length: N }, (_, i) => i).sort(() => r() - 0.5);
    const strips = Array.from({ length: N }, (_, i) => {
      // рваные края считаются один раз: на скролле clip-path не меняется
      const K = 16, pts = [];
      for (let k = 0; k <= K; k++) pts.push(`${(r() * 14).toFixed(1)}% ${(k / K * 100).toFixed(1)}%`);
      for (let k = K; k >= 0; k--) pts.push(`${(100 - r() * 14).toFixed(1)}% ${(k / K * 100).toFixed(1)}%`);
      return { i, x0: i / N, w: 1 / N, peel: 0.3 + order.indexOf(i) * (0.34 / N), dir: r() < 0.5 ? -1 : 1, clip: `polygon(${pts.join(',')})` };
    });
    const slashes = Array.from({ length: lite ? 4 : 7 }, () => ({ x: 6 + r() * 88, y: 4 + r() * 40, h: 18 + r() * 38, w: 5 + r() * 8, d: r() * 0.12 }));
    return { strips, slashes };
  }, [N, lite]);
  const el = useRef({}); const stripEls = useRef([]); const shadeEls = useRef([]); const innerEls = useRef([]); const slashEls = useRef([]);
  const noiseLevel = useRef(0); const last = useRef(-1);
  // перспектива от высоты полос: с фиксированными 1100px на высоких экранах край полосы доходил до «камеры»,
  // полоса выворачивалась наизнанку и мигала чёрным. С запасом 1.8×высоты отгиб на 58° до камеры не достаёт.
  const persp = useRef(1100);
  const set = (k) => (node) => { el.current[k] = node; };
  const op = (node, v) => { if (node) node.style.opacity = v.toFixed(3); };

  const apply = useCallback((p) => {
    if (Math.abs(p - last.current) < 0.0015) return; last.current = p;
    const E = el.current;
    if (E.tc) { const f = Math.floor(p * 240); const txt = `00:00:${pad(Math.floor(f / 24))}:${pad(f % 24)}`; if (E.tc.textContent !== txt) E.tc.textContent = txt; }
    const siren = reduced ? 0 : bump(p, 0.56, 0.07) * 0.6;
    noiseLevel.current = reduced ? 0 : bump(p, 0.56, 0.14) * 0.22;
    if (sda) return; // остальное двигает CSS
    op(E.shade, 0.62 * (1 - p));
    op(E.base, 1 - smooth(clamp((p - 0.04) / 0.3)));
    op(E.haze, clamp(1 - p * 1.4));
    op(E.dusk, p);
    op(E.siren, siren); op(E.line, siren); op(E.noise, noiseLevel.current);
    op(E.ta, clamp(1 - p * 1.6)); op(E.tb, clamp(p * 2.2 - 0.6)); op(E.tg, siren);
    if (E.tg) E.tg.style.transform = siren > 0.05 ? `translate3d(${Math.round((Math.random() - 0.5) * 14)}px,0,0)` : 'none';
    op(E.mtop, clamp(1 - p * 2)); op(E.mbot, clamp(0.25 + p));
    model.strips.forEach((s, idx) => {
      const node = stripEls.current[idx]; if (!node) return;
      const peel = smooth(clamp((p - s.peel) / 0.3));
      node.style.transform = `perspective(${persp.current}px) translate3d(${(s.dir * peel * 5).toFixed(2)}vw, ${(peel * 108).toFixed(2)}%, 0) rotateX(${(-peel * 58).toFixed(2)}deg) rotate(${(s.dir * peel * 8).toFixed(2)}deg)`;
      node.style.opacity = String(1 - smooth(clamp((peel - 0.55) / 0.45)));
      op(shadeEls.current[idx], Math.max(peel * 0.9, clamp(p * 1.4) * 0.75));
    });
    model.slashes.forEach((s, idx) => {
      const node = slashEls.current[idx]; if (!node) return;
      node.style.transform = `scaleY(${smooth(clamp((p - 0.02 - s.d) / 0.22)).toFixed(3)})`;
      node.style.opacity = String(1 - smooth(clamp((p - 0.36) / 0.14)));
    });
  }, [model, reduced, sda]);

  useLayoutEffect(() => {
    const stage = stageRef.current; if (!stage) return;
    const layout = () => {
      const W = stage.clientWidth;
      const sh = (stripEls.current[0] && stripEls.current[0].offsetHeight) || stage.clientHeight;
      const np = Math.round(Math.max(1100, sh * 1.8));
      if (np !== persp.current) { persp.current = np; last.current = -1; }
      stage.style.setProperty('--rift-p', np + 'px');
      model.strips.forEach((s, idx) => {
        const node = stripEls.current[idx]; const inner = innerEls.current[idx]; if (!node || !inner) return;
        const left = s.x0 * W - 2, width = s.w * W + 4;
        node.style.left = left + 'px'; node.style.width = width + 'px'; node.style.clipPath = s.clip;
        inner.style.left = (-left) + 'px'; inner.style.width = W + 'px';
      });
    };
    layout();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(layout) : null; ro && ro.observe(stage);
    return () => ro && ro.disconnect();
  }, [model]);

  // прогресс: только пока секция рядом с экраном
  useEffect(() => {
    last.current = -1;
    if (controlled) { apply(clamp(progress)); return; }
    if (reduced) { apply(1); return; }
    const sec = ref.current; const sc = getScroller(sec); let raf = 0, near = false;
    const read = () => { raf = 0; const b = sec.getBoundingClientRect(); const vh = viewportH(sc); apply(clamp((vh * 0.85 - b.top) / Math.max(1, b.height * 0.95))); };
    const on = () => { if (near && !raf) raf = requestAnimationFrame(read); };
    const io = new IntersectionObserver(([e]) => { near = e.isIntersecting; if (near) on(); }, { rootMargin: '30% 0px 30% 0px' });
    io.observe(sec);
    sc.addEventListener('scroll', on, { passive: true }); window.addEventListener('resize', on); near = true; read();
    return () => { io.disconnect(); sc.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, [controlled, progress, reduced, apply]);

  // помехи: маленький canvas, цикл живёт только пока уровень > 0 и секция на экране
  useEffect(() => {
    if (reduced) return;
    const c = canvasRef.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return;
    const w = c.width = lite ? 96 : 160, hh = c.height = lite ? 54 : 90;
    // 6 кадров помех считаются один раз, на скролле только перебираются
    const frames = Array.from({ length: 6 }, () => { const img = ctx.createImageData(w, hh); const d = img.data; for (let i = 0; i < d.length; i += 4) { const v = (Math.random() * 255) | 0; d[i] = v; d[i + 1] = v * 0.82; d[i + 2] = v * 0.76; d[i + 3] = 255; } return img; });
    let raf = 0, alive = true, visible = false, frame = 0;
    const draw = () => {
      raf = 0; if (!alive || !visible) return;
      if (noiseLevel.current > 0.01 && (frame++ & 1) === 0) ctx.putImageData(frames[(frame >> 1) % frames.length], 0, 0);
      raf = requestAnimationFrame(draw);
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(draw); });
    io.observe(c);
    return () => { alive = false; io.disconnect(); cancelAnimationFrame(raf); };
  }, [reduced, lite]);

  const t = rift.title || ['Дальше -', 'работы'];
  const lines = t.map((l, i) => <span key={i}>{l}</span>);
  return <section ref={ref} id={id} className={cx('aa-rift', isStatic && 'aa-rift--static', sda && 'aa-rift--sda')} data-theme="other" data-header="other" aria-label={t.join(' ')}>
    {edEl(ed, 'section', { p: 'rift', kind: 'rift', label: 'Переход между мирами' })}
    <div className="aa-rift__stage" ref={stageRef}>
      <div className="aa-rift__metal" aria-hidden="true"><div className="aa-grate"></div><div className="aa-metal"></div><div className="aa-slots"></div></div>
      <div className="aa-rift__fx aa-rift__shade" ref={set('shade')} aria-hidden="true"></div>
      <div className="aa-rift__fx aa-rift__base aa-wallpaper" ref={set('base')} aria-hidden="true" style={{ opacity: 1 }}></div>
      <div className="aa-rift__strips" aria-hidden="true">
        {model.strips.map((s, idx) => <div key={idx} className="aa-rift__strip" ref={(n) => (stripEls.current[idx] = n)} style={{ '--a': s.peel.toFixed(4), '--dir': s.dir }}>
          <div className="aa-wallpaper" ref={(n) => (innerEls.current[idx] = n)} style={{ position: 'absolute', top: 0, bottom: 0 }}></div>
          <b ref={(n) => (shadeEls.current[idx] = n)}></b>
        </div>)}
      </div>
      {model.slashes.map((s, idx) => <span key={idx} className="aa-rift__slash" ref={(n) => (slashEls.current[idx] = n)} aria-hidden="true" style={{ left: s.x + '%', top: s.y + '%', height: s.h + '%', width: s.w + 'px', '--d': s.d.toFixed(4) }}></span>)}
      <div className="aa-rift__fx aa-rift__haze" ref={set('haze')} aria-hidden="true" style={{ opacity: 1 }}></div>
      <div className="aa-rift__fx aa-rift__dusk" ref={set('dusk')} aria-hidden="true"></div>
      <div className="aa-rift__fx aa-rift__siren" ref={set('siren')} aria-hidden="true"></div>
      <div className="aa-rift__line" ref={set('line')} aria-hidden="true"></div>
      {!reduced && <canvas className="aa-rift__noise" ref={(n) => { canvasRef.current = n; el.current.noise = n; }} aria-hidden="true"></canvas>}
      <div className="aa-rift__meta aa-rift__meta--top aa-label" ref={set('mtop')} aria-hidden="true">{(rift.topMeta || []).map((m, i) => <span key={i}>{m}</span>)}</div>
      <div className="aa-rift__text">
        <h2 className="aa-display aa-rift__title">
          <span className="a" ref={set('ta')}>{lines}</span>
          <span className="b" ref={set('tb')} aria-hidden="true">{lines}</span>
          <span className="g" ref={set('tg')} aria-hidden="true">{lines}</span>
        </h2>
      </div>
      <div className="aa-rift__meta aa-label" ref={set('mbot')} aria-hidden="true"><span>{(rift.bottomMeta || [])[0]}</span><span ref={set('tc')}>00:00:00:00</span><span>{(rift.bottomMeta || [])[1]}</span></div>
    </div>
  </section>;
}

/* ============ РАБОТЫ ============ */
export function PosterCard({ work, index = 0, categoryLabel, onOpen, p }) {
  const ed = useEd(); p = p || 'works.items.@' + work.id;
  const vRef = useRef(null); const [vidOn, setVidOn] = useState(false); const reduced = useReducedMotion(); const intent = useRef(0);
  const vertical = work.format === '9:16';
  const play = () => { setVidOn(true); requestAnimationFrame(() => { const v = vRef.current; v && v.play && v.play().catch(() => {}); }); };
  const enter = () => { if (!work.previewVideo || reduced) return; clearTimeout(intent.current); intent.current = setTimeout(play, 220); };
  const leave = () => { clearTimeout(intent.current); const v = vRef.current; v && v.pause && v.pause(); };
  useEffect(() => () => clearTimeout(intent.current), []);
  return <article className={cx('aa-poster', ed && work.published === false && 'aa-ed-draft')} onMouseEnter={enter} onMouseLeave={leave} onFocus={ed ? undefined : enter} onBlur={ed ? undefined : leave}>
    {edEl(ed, 'tools', { list: 'works.items', id: work.id, kind: 'work', axis: 'x' })}
    <div className="aa-poster__top aa-micro" aria-hidden="true"><span>№ {pad(index + 1)}</span><Monogram variant="mark" /><span>{work.year}</span></div>
    <div className={cx('aa-poster__frame', vertical && 'aa-poster__frame--v')} style={{ aspectRatio: vertical ? '9 / 16' : '16 / 9' }}>
      {work.previewImage || vidOn ? <div className="aa-poster__media">
        {work.previewImage && <img src={work.previewImage} alt={`Кадр из работы «${work.title}»`} loading="lazy" decoding="async" />}
        {vidOn && <video key={work.previewVideo} ref={vRef} muted loop playsInline preload="none" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>{videoSources(work.previewVideo)}</video>}
      </div> : <div className="aa-poster__ph" role="img" aria-label={`Слот под превью ${work.format}`}>
        <Monogram variant="watermark" />
        <span className="aa-micro">Слот · превью {work.format}</span>
      </div>}
      <div className="aa-poster__vhs" aria-hidden="true"></div>
      <Rec className="aa-poster__rec" label="PLAY" />
      {edEl(ed, 'slot', { p: p + '.previewImage', v: work.previewImage, accept: 'image', label: 'Превью ' + work.format })}
    </div>
    {edEl(ed, 'slot', { p: p + '.previewVideo', v: work.previewVideo, accept: 'video', label: 'Видео-превью на наведение', compact: true })}
    {edEl(ed, 'slot', { p: p + '.videoUrl', v: work.videoUrl, accept: 'video', label: 'Ролик в плеере', compact: true, link: true })}
    <h3 className="aa-h3 aa-poster__title"><E p={p + '.title'} v={work.title} ph="Название" /></h3>
    <div className="aa-poster__row">
      <span className="aa-micro">{categoryLabel || work.category} · {work.format}</span>
      <Barcode seed={work.id} className="aa-poster__code" />
    </div>
    <div className="aa-poster__plate aa-label" aria-hidden="true"><span>{categoryLabel || work.category}</span><span>▶ Смотреть</span></div>
    {!ed && <button type="button" className="aa-poster__hit" onClick={() => onOpen && onOpen(work)} aria-label={`Смотреть: ${work.title}, ${categoryLabel || work.category}, ${work.year}`}></button>}
  </article>;
}

export function youtubeId(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function VideoModal({ work, onClose, categoryLabel }) {
  const T = useT(); const closeRef = useRef(null); const prev = useRef(null);
  useEffect(() => {
    prev.current = document.activeElement; closeRef.current && closeRef.current.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev.current && prev.current.focus && prev.current.focus(); };
  }, []);
  if (!work) return null;
  const yt = youtubeId(work.videoUrl); const vertical = work.format === '9:16';
  const trap = (e) => { if (e.key !== 'Tab') return; const f = e.currentTarget.querySelectorAll('button, [href], iframe, video, [tabindex]:not([tabindex="-1"])'); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } };
  return <div className="aa-modal" data-theme="other" role="dialog" aria-modal="true" aria-labelledby="aa-modal-t" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }} onKeyDown={trap}>
    <div className={cx('aa-modal__box', vertical && 'aa-modal__box--v')}>
      <div className="aa-modal__head">
        <div><span className="aa-micro aa-muted">{categoryLabel || work.category} · {work.year} · {work.format}</span><h2 className="aa-h3" id="aa-modal-t" style={{ marginTop: 6 }}>{work.title}</h2></div>
        <button type="button" ref={closeRef} className="aa-modal__close aa-label" onClick={onClose}>{T('closeX')}</button>
      </div>
      <div className="aa-modal__player" style={{ aspectRatio: vertical ? '9 / 16' : '16 / 9' }}>
        {yt ? <iframe src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`} title={work.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy"></iframe>
          : work.videoUrl ? <video key={work.videoUrl} controls autoPlay playsInline poster={work.previewImage || undefined}>{videoSources(work.videoUrl)}</video>
            : <div className="aa-modal__nosignal"><div><Monogram variant="mark" /><p className="aa-label" style={{ marginTop: 12 }}>{T('noSignal')}</p><p className="aa-micro aa-muted" style={{ marginTop: 8 }}>Слот под видео: videoUrl (YouTube или файл)</p></div></div>}
      </div>
      {yt && <p className="aa-label" style={{ marginTop: 12 }}><a href={`https://www.youtube.com/watch?v=${yt}`} target="_blank" rel="noopener">{T('openYt')}</a></p>}
      {work.description && <p className="aa-modal__desc">{work.description}</p>}
    </div>
  </div>;
}

/* ============ РАБОТЫ: инвентарь в духе Silent Hill ============
   Вкладки-категории (активная - красная с рваным мазком), слева сетка ячеек инвентаря (работы + пустые слоты),
   справа «осмотр» выбранной: крупное превью (видео-превью само включается у выбранной через 220 мс),
   название, категория/формат/год, описание, кнопка «Смотреть» -> прежний плеер VideoModal.
   Наведение или тап выбирает ячейку (во время прокрутки main не ловит мышь - перерисовок на скролле нет),
   стрелки двигают выбор по сетке, Enter/клик по выбранной открывает плеер. В админке на осмотре - слоты медиа. */
const INV_COLS = 4, INV_MIN = 12;
export function Works({ works = {}, id = 'works' }) {
  const ed = useEd(); const reduced = useReducedMotion(); const T = useT();
  const [filter, setFilter] = useState('all'); const [open, setOpen] = useState(null); const [sel, setSel] = useState(null);
  const secRef = useRef(null); const [host, setHost] = useState(null); const gridRef = useRef(null);
  useEffect(() => { setHost((secRef.current && secRef.current.closest('.aa-page')) || null); }, []);
  // в админке видны и черновики (published: false), они помечены
  const items = useMemo(() => (works.items || []).filter((w) => ed || w.published !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [works.items, ed]);
  const cats = works.categories || [];
  const catLabel = (cid) => (cats.find((c) => c.id === cid) || {}).label || cid;
  const shown = filter === 'all' ? items : items.filter((w) => w.category === filter);
  const count = (cid) => items.filter((w) => w.category === cid).length;
  const cur = shown.find((w) => w.id === sel) || shown[0] || null;
  const slots = Math.max(INV_MIN, Math.ceil((shown.length + (ed ? 1 : 0)) / INV_COLS) * INV_COLS);
  const hoverT = useRef(0);
  useEffect(() => () => clearTimeout(hoverT.current), []);
  const pick = (w) => { clearTimeout(hoverT.current); setSel(w.id); };
  const hoverPick = (w) => { clearTimeout(hoverT.current); hoverT.current = setTimeout(() => setSel(w.id), 90); };
  const onKey = (e) => {
    if (!cur) return; const i = shown.indexOf(cur); let j = i;
    if (e.key === 'ArrowRight') j = i + 1; else if (e.key === 'ArrowLeft') j = i - 1;
    else if (e.key === 'ArrowDown') j = i + INV_COLS; else if (e.key === 'ArrowUp') j = i - INV_COLS;
    else if (e.key === 'Enter' || e.key === ' ') { if (!ed) { e.preventDefault(); setOpen(cur); } return; } else return;
    e.preventDefault(); j = Math.max(0, Math.min(shown.length - 1, j)); setSel(shown[j].id);
    const btn = gridRef.current && gridRef.current.querySelector(`[data-id="${shown[j].id}"]`); btn && btn.focus();
  };
  const tab = (key, label, n) => <button key={key} type="button" role="tab" aria-selected={filter === key} className={cx('aa-inv__tab', filter === key && 'is-on')}
    onClick={() => { setFilter(key); setSel(null); }}>{label}<span className="aa-inv__tabn">{pad(n)}</span></button>;
  return <section ref={secRef} className="aa-section aa-works" id={id} data-theme="other" data-header="other" aria-labelledby={id + '-h'}>
    {edEl(ed, 'section', { p: 'works', kind: 'works', label: 'Работы и категории' })}
    <div className="aa-wrap">
      <div className="aa-section__head aa-inv__head">
        <div><h2 className="aa-h2" id={id + '-h'}><E p="works.title" v={works.title} /></h2></div>
      </div>
      <div className="aa-inv__tabs" role="tablist" aria-label={T('worksCats')}>
        {tab('all', works.allLabel || T('all'), items.length)}
        {cats.filter((c) => count(c.id) > 0).map((c) => tab(c.id, c.label, count(c.id)))}
      </div>
      <div className="aa-sr" aria-live="polite">{T('worksShown')}{shown.length}</div>
      <div className="aa-inv__body">
        <div className="aa-inv__grid" ref={gridRef} role="listbox" aria-label={T('worksList')} aria-activedescendant={cur ? 'inv-' + cur.id : undefined} onKeyDown={onKey}>
          {Array.from({ length: slots }, (_, k) => {
            const w = shown[k];
            if (!w) return k === shown.length && ed ? <div key="add" className="aa-inv__slot aa-inv__slot--add">{edEl(ed, 'add', { list: 'works.items', kind: 'work', label: '+', extra: { category: filter === 'all' ? undefined : filter } })}</div>
              : <div key={'e' + k} className="aa-inv__slot aa-inv__slot--empty" aria-hidden="true"></div>;
            const on = cur && cur.id === w.id;
            return <button key={w.id} id={'inv-' + w.id} data-id={w.id} type="button" role="option" aria-selected={on} tabIndex={on ? 0 : -1}
              className={cx('aa-inv__slot', on && 'is-on', ed && w.published === false && 'aa-ed-draft')}
              onMouseEnter={() => hoverPick(w)} onFocus={() => pick(w)} onClick={() => { if (on && !ed) setOpen(w); else pick(w); }}
              aria-label={`${w.title}, ${catLabel(w.category)}, ${w.year}`}>
              {w.previewImage ? <img src={w.previewImage} alt="" loading="lazy" decoding="async" /> : <span className="aa-inv__ph" aria-hidden="true"><Monogram variant="mark" /></span>}
              <span className="aa-inv__badge" aria-hidden="true">{items.indexOf(w) + 1}</span>
              {w.format === '9:16' && <span className="aa-inv__fmt" aria-hidden="true">9:16</span>}
            </button>;
          })}
        </div>
        {cur ? <InvDetail key={cur.id} work={cur} index={items.indexOf(cur)} categoryLabel={catLabel(cur.category)} reduced={reduced} onOpen={setOpen} />
          : <div className="aa-inv__detail aa-inv__detail--empty"><p className="aa-label">{ed ? 'Добавьте работу' : T('catEmpty')}</p></div>}
      </div>
    </div>
    {open && (() => { const m = <VideoModal work={open} categoryLabel={catLabel(open.category)} onClose={() => setOpen(null)} />; return host && window.ReactDOM && window.ReactDOM.createPortal ? window.ReactDOM.createPortal(m, host) : m; })()}
  </section>;
}

// «осмотр» выбранной работы: крупное превью, подписи, кнопка в плеер; в админке - слоты медиа и редактируемый текст
function InvDetail({ work, index, categoryLabel, reduced, onOpen }) {
  const ed = useEd(); const T = useT(); const p = 'works.items.@' + work.id; const vertical = work.format === '9:16';
  const [vid, setVid] = useState(false);
  useEffect(() => { if (!work.previewVideo || reduced || ed) return; const t = setTimeout(() => setVid(true), 220); return () => clearTimeout(t); }, [work.previewVideo, reduced, ed]);
  return <div className="aa-inv__detail">
    {edEl(ed, 'tools', { list: 'works.items', id: work.id, kind: 'work', axis: 'x' })}
    <div className={cx('aa-inv__view', vertical && 'aa-inv__view--v')}>
      <div className="aa-inv__frame" style={{ aspectRatio: vertical ? '9 / 16' : '16 / 9' }}>
        {work.previewImage && <img src={work.previewImage} alt={`${T('still')} «${work.title}»`} decoding="async" />}
        {vid && <video key={work.previewVideo} muted loop playsInline autoPlay preload="none" aria-hidden="true">{videoSources(work.previewVideo)}</video>}
        {!work.previewImage && !vid && <span className="aa-inv__ph" aria-hidden="true"><Monogram variant="watermark" /></span>}
        {edEl(ed, 'slot', { p: p + '.previewImage', v: work.previewImage, accept: 'image', label: 'Превью ' + work.format })}
      </div>
    </div>
    {edEl(ed, 'slot', { p: p + '.previewVideo', v: work.previewVideo, accept: 'video', label: 'Видео-превью (у выбранной)', compact: true })}
    {edEl(ed, 'slot', { p: p + '.videoUrl', v: work.videoUrl, accept: 'video', label: 'Ролик в плеере', compact: true, link: true })}
    <p className="aa-inv__meta aa-micro">№ {pad(index + 1)} · {categoryLabel} · {work.format} · {work.year}</p>
    <h3 className="aa-inv__title"><E p={p + '.title'} v={work.title} ph="Название" /></h3>
    {(work.description || ed) && <p className="aa-inv__desc"><E p={p + '.description'} v={work.description} ph="Описание" /></p>}
    {!ed && <button type="button" className="aa-inv__play" onClick={() => onOpen && onOpen(work)}><span aria-hidden="true">▶</span> {T('watch')}</button>}
  </div>;
}

/* ============ КЕЙСЫ ============ */
export function CaseTag({ item, index = 0, p }) {
  const ed = useEd(); p = p || 'cases.items.@' + item.id;
  return <article className="aa-tag">
    {edEl(ed, 'tools', { list: 'cases.items', id: item.id, kind: 'case' })}
    <span className="aa-tag__hole" aria-hidden="true"></span>
    <span className="aa-tag__pin" aria-hidden="true"></span>
    <div className="aa-tag__head aa-micro"><span>Протокол № {pad(index + 1, 3)}</span><span>{item.year || ''}</span></div>
    <h3 className="aa-h3 aa-tag__client"><E p={p + '.client'} v={item.client} ph="Клиент" /></h3>
    <dl className="aa-tag__rows">
      <dt>Задача</dt><dd><E p={p + '.task'} v={item.task} ph="Задача" /></dd>
      <dt>Сделано</dt><dd><E p={p + '.done'} v={item.done} ph="Что сделано" /></dd>
    </dl>
    {((item.metrics && item.metrics.length > 0) || ed) && <div className="aa-tag__result">
      <div className="aa-tag__result-h aa-micro">Результат · было → стало</div>
      {(item.metrics || []).map((m, i) => { const mp = p + '.metrics.' + i; return <div className="aa-tag__metric aa-ed-host" key={i}>
        <span className="aa-micro"><E p={mp + '.label'} v={m.label} ph="Метрика" /></span><s aria-label={'было ' + m.before}><E p={mp + '.before'} v={m.before} ph="0" /></s><span aria-hidden="true">→</span><b aria-label={'стало ' + m.after}><E p={mp + '.after'} v={m.after} ph="0" /></b>
        {edEl(ed, 'tools', { list: p + '.metrics', index: i, kind: 'metric' })}
      </div>; })}
      {edEl(ed, 'add', { list: p + '.metrics', kind: 'metric', label: 'Метрика' })}
    </div>}
    <div className="aa-tag__foot">
      {item.link ? <a href={item.link} target="_blank" rel="noopener">Смотреть →</a> : <span className="aa-micro">[ ссылка: cases.items[].link ]</span>}
      <Monogram variant="seal" />
    </div>
  </article>;
}
/* ============ КЕЙСЫ: журнал ============
   Раскрытый журнал на старой бумаге: на развороте один кейс (слева протокол, клиент, задача; справа «Сделано»
   и результат - «было» зачёркнуто красной ручкой, «стало» вписано от руки и обведено). Журнал слегка «дышит».
   Рук нет (рисованные и фото-вариант владелец отклонил).
   Перелистывание - 3D-переворот листа вокруг корешка (только transform, perspective в 5 раз больше листа):
   кнопки, клик по левой/правой странице, стрелки, свайп. На узком журнале - по одной странице.
   reduced-motion - без переворота и «дыхания». В админке страницы редактируются, кнопки листают. */
const JR_FLIP = 760;
// кусок большого листа бумаги для страницы: детерминированно по номеру кейса и стороне (пятна у всех страниц разные)
const paperPos = (i, side) => { const r = rng(((i + 1) * 7919 + (side === 'L' ? 13 : 101)) >>> 0); return `${-Math.round(r() * 1536)}px ${-Math.round(r() * 1536)}px`; };
function CasePage({ item, index, side }) {
  const ed = useEd(); const T = useT(); const p = 'cases.items.@' + item.id; const metrics = item.metrics || [];
  const pp = paperPos(index, side);
  if (side === 'L') return <div className="aa-jr__page aa-jr__page--l" style={{ '--pp': pp }}>
    {edEl(ed, 'tools', { list: 'cases.items', id: item.id, kind: 'case' })}
    <div className="aa-jr__meta">{T('protocol')} {pad(index + 1, 3)}{item.year ? ' · ' + item.year : ''}</div>
    <h3 className="aa-jr__client"><E p={p + '.client'} v={item.client} ph="Клиент" /></h3>
    <div className="aa-jr__label">{T('task')}</div>
    <p className="aa-jr__text"><E p={p + '.task'} v={item.task} ph="Задача" /></p>
    <span className="aa-jr__num" aria-hidden="true">{index * 2 + 1}</span>
  </div>;
  return <div className="aa-jr__page aa-jr__page--r" style={{ '--pp': pp }}>
    <div className="aa-jr__label">{T('done')}</div>
    <p className="aa-jr__text"><E p={p + '.done'} v={item.done} ph="Что сделано" /></p>
    {(metrics.length > 0 || ed) && <div className="aa-jr__res">
      <div className="aa-jr__label">{T('result')}</div>
      {metrics.map((m, i) => { const mp = p + '.metrics.' + i; return <div className="aa-jr__metric aa-ed-host" key={i}>
        <span className="aa-jr__mlabel"><E p={mp + '.label'} v={m.label} ph="Метрика" /></span>
        <s className="aa-jr__before" aria-label={T('before') + ' ' + m.before}><E p={mp + '.before'} v={m.before} ph="0" /></s>
        <span className="aa-jr__after" aria-label={T('after') + ' ' + m.after}><E p={mp + '.after'} v={m.after} ph="0" />
          <svg viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true"><path d="M8 28 C 6 8, 70 2, 92 18 C 104 30, 70 48, 34 46 C 10 44, 2 34, 14 20" /></svg></span>
        {edEl(ed, 'tools', { list: p + '.metrics', index: i, kind: 'metric' })}
      </div>; })}
      {edEl(ed, 'add', { list: p + '.metrics', kind: 'metric', label: 'Метрика' })}
    </div>}
    {item.link ? <a className="aa-jr__link" href={item.link} target="_blank" rel="noopener">{T('watchWork')}</a> : null}
    <span className="aa-jr__num" aria-hidden="true">{index * 2 + 2}</span>
  </div>;
}
export function Cases({ cases = {}, id = 'cases' }) {
  const ed = useEd(); const reduced = useReducedMotion(); const T = useT();
  const items = cases.items || [];
  const pages = useMemo(() => items.flatMap((it, i) => [{ it, i, side: 'L' }, { it, i, side: 'R' }]), [items]);
  const bookRef = useRef(null); const [single, setSingle] = useState(false);
  useEffect(() => {
    const el = bookRef.current; if (!el) return;
    const fit = () => setSingle(el.parentElement.clientWidth < 640); fit();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null; ro && ro.observe(el.parentElement);
    return () => ro && ro.disconnect();
  }, []);
  const step = single ? 1 : 2;
  const [at, setAt] = useState(0); const [flip, setFlip] = useState(null); const flipT = useRef(0);
  useEffect(() => () => clearTimeout(flipT.current), []);
  const cur = Math.max(0, Math.min(single ? at : at - (at % 2), pages.length - 1));
  const go = (dir) => {
    if (flip) return; const to = cur + dir * step; if (to < 0 || to >= pages.length) return;
    if (reduced) { setAt(to); return; }
    setFlip({ dir, to }); clearTimeout(flipT.current); flipT.current = setTimeout(() => { setAt(to); setFlip(null); }, JR_FLIP);
  };
  // чистый лист (нет записи): своя бумага по «номеру» n
  const blank = (side, n) => <div className={`aa-jr__page aa-jr__page--${side === 'L' ? 'l' : 'r'} aa-jr__page--blank`} style={{ '--pp': paperPos(50 + n, side) }}></div>;
  const pg = (k, side) => pages[k] ? <CasePage key={pages[k].it.id + pages[k].side} item={pages[k].it} index={pages[k].i} side={pages[k].side} /> : blank(side || (k % 2 ? 'R' : 'L'), k);
  // стопка: под страницей лежит соседняя (слева - предыдущая запись, справа - следующая) и ещё глубже чистый лист.
  // Они чуть сдвинуты и темнее, их рваные края выглядывают; при перевороте лист поднимается ровно с того, что уже было подложкой.
  const stack = (top, under, side, n) => <div className={'aa-jr__cell aa-jr__cell--' + side.toLowerCase()}>
    {!ed && <div className="aa-jr__under aa-jr__under--2" aria-hidden="true">{blank(side, n + 7)}</div>}
    {!ed && <div className="aa-jr__under aa-jr__under--1" aria-hidden="true">{under}</div>}
    {top}
  </div>;
  const down = useRef(null);
  const onDown = (e) => { down.current = e.clientX; };
  const onUp = (e) => { if (down.current == null) return; const dx = e.clientX - down.current; down.current = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); };
  const onKey = (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } };
  const caseNo = pages[cur] ? pages[cur].i + 1 : 0;
  let base, leaf = null;
  if (!single) {
    const dL = flip && flip.dir < 0 ? flip.to : cur, dR = flip && flip.dir > 0 ? flip.to : cur;
    base = <>{stack(pg(dL, 'L'), pg(dL - 2, 'L'), 'L', dL)}{stack(pg(dR + 1, 'R'), pg(dR + 3, 'R'), 'R', dR)}</>;
    if (flip) leaf = flip.dir > 0
      ? <div className="aa-jr__leaf aa-jr__leaf--next"><div className="aa-jr__face">{pg(cur + 1)}</div><div className="aa-jr__face aa-jr__face--back">{pg(flip.to)}</div></div>
      : <div className="aa-jr__leaf aa-jr__leaf--prev"><div className="aa-jr__face">{pg(cur)}</div><div className="aa-jr__face aa-jr__face--back">{pg(flip.to + 1)}</div></div>;
  } else {
    const d = flip && flip.dir > 0 ? flip.to : cur;
    base = stack(pg(d), pg(d + 1), pages[d] && pages[d].side === 'L' ? 'L' : 'R', d);
    if (flip) leaf = <div className={cx('aa-jr__leaf aa-jr__leaf--single', flip.dir < 0 && 'is-back')}><div className="aa-jr__face">{flip.dir > 0 ? pg(cur) : pg(flip.to)}</div></div>;
  }
  return <section className="aa-section aa-cases" id={id} data-theme="other" data-header="other" aria-labelledby={id + '-h'}>
    {edEl(ed, 'section', { p: 'cases', kind: 'cases', label: 'Кейсы' })}
    <div className="aa-wrap" style={{ position: 'relative' }}>
      <div className="aa-section__head">
        <div><h2 className="aa-h2" id={id + '-h'}><E p="cases.title" v={cases.title} /></h2></div>
      </div>
      <div className={cx('aa-jr', single && 'aa-jr--single')}>
        <div className="aa-jr__glow" aria-hidden="true"></div>
        <div className="aa-jr__stage">
          <div ref={bookRef} className="aa-jr__book" tabIndex={0} role="group" aria-roledescription={T('journal')} aria-label={T('casesAt', { n: caseNo, m: items.length })}
            onKeyDown={onKey} onPointerDown={ed ? undefined : onDown} onPointerUp={ed ? undefined : onUp}>
            {base}{leaf}
            {!ed && !flip && <>
              {cur > 0 && <button type="button" className="aa-jr__hit aa-jr__hit--prev" onClick={() => go(-1)} aria-label={T('prevPage')}></button>}
              {cur + step < pages.length && <button type="button" className="aa-jr__hit aa-jr__hit--next" onClick={() => go(1)} aria-label={T('nextPage')}></button>}
            </>}
          </div>
        </div>
        <div className="aa-jr__nav">
          {/* кнопок «назад/далее» нет (владелец убрал): листают кликом по странице, стрелками и свайпом */}
          <span className="aa-jr__count" aria-live="polite">{T('record', { n: caseNo, m: items.length })}</span>
        </div>
        {edEl(ed, 'add', { list: 'cases.items', kind: 'case', label: 'Кейс' })}
      </div>
    </div>
  </section>;
}

/* ============ СВЯЗЬ ============ */
const RE_TG = /^@[A-Za-z0-9_]{4,32}$/;
const RE_TGURL = /^(https?:\/\/)?t\.me\/[A-Za-z0-9_]{4,32}\/?$/i;
const RE_MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function validateLead(v, lang = 'ru') {
  const e = {};
  if (!v.name || v.name.trim().length < 2) e.name = tr(lang, 'errName');
  const c = (v.contact || '').trim();
  if (!c) e.contact = tr(lang, 'errContactEmpty');
  else if (!(RE_TG.test(c) || RE_TGURL.test(c) || RE_MAIL.test(c))) e.contact = tr(lang, 'errContact');
  if (!v.message || v.message.trim().length < 10) e.message = tr(lang, 'errMessage');
  return e;
}
function StaticBurst() {
  const ref = useRef(null); const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return; const c = ref.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return;
    c.width = 120; c.height = 60; const img = ctx.createImageData(120, 60); let raf; const st = performance.now();
    const draw = (now) => { const t = (now - st) / 1400; if (t > 1) { ctx.clearRect(0, 0, 120, 60); return; } const d = img.data; for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255; d[i] = v; d[i + 1] = v * .8; d[i + 2] = v * .74; d[i + 3] = 255 * (1 - t); } ctx.putImageData(img, 0, 0); raf = requestAnimationFrame(draw); };
    raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf);
  }, [reduced]);
  return <canvas ref={ref} aria-hidden="true"></canvas>;
}
function consentLabel(text, lang = 'ru') {
  const t = text || tr(lang, 'consentText');
  return t.split(/(\{(?:consent|privacy):[^}]+\})/).map((part, i) => {
    const m = /^\{(consent|privacy):([^}]+)\}$/.exec(part);
    return m ? <a key={i} href={siteUrl(m[1], lang)} target="_blank" rel="noopener">{m[2]}</a> : part;
  });
}
export function Transmitter({ contact = {}, onSubmit, initialState = 'idle' }) {
  const ed = useEd(); const lang = useLang(); const T = useT();
  const f = contact.fields || {};
  const [vals, setVals] = useState({ name: '', contact: '', message: '' });
  const [errs, setErrs] = useState({}); const [touched, setTouched] = useState({});
  const [state, setState] = useState(initialState);
  const [consent, setConsent] = useState(false); // никогда не отмечено заранее
  const refs = { name: useRef(null), contact: useRef(null), message: useRef(null), consent: useRef(null) };
  const consentErr = contact.consentError || T('errConsent');
  const check = (v, c) => { const e = validateLead(v, lang); if (!c) e.consent = consentErr; return e; };
  const set = (k) => (e) => { const nv = { ...vals, [k]: e.target.value }; setVals(nv); if (touched[k]) setErrs(check(nv, consent)); };
  const blur = (k) => () => { setTouched({ ...touched, [k]: true }); setErrs(check(vals, consent)); };
  const toggleConsent = (e) => { const c = e.target.checked; setConsent(c); if (touched.consent) setErrs(check(vals, c)); };
  const submit = async (e) => {
    e.preventDefault();
    if (ed) return; // в админке форма - только макет, заявки не шлёт
    const er = check(vals, consent); setErrs(er); setTouched({ name: true, contact: true, message: true, consent: true });
    const first = ['name', 'contact', 'message', 'consent'].find((k) => er[k]);
    if (first) { refs[first].current && refs[first].current.focus(); return; }
    setState('sending');
    try { await (onSubmit ? onSubmit({ ...vals, consent: true }) : new Promise((r) => setTimeout(r, 1200))); setState('success'); setVals({ name: '', contact: '', message: '' }); setConsent(false); setTouched({}); }
    catch (_) { setState('error'); }
  };
  const field = (k, multi) => {
    const invalid = touched[k] && errs[k];
    const common = { id: 'aa-f-' + k, name: k, value: vals[k], onChange: set(k), onBlur: blur(k), placeholder: (f[k] || {}).placeholder, ref: refs[k], 'aria-invalid': invalid ? 'true' : 'false', 'aria-describedby': invalid ? 'aa-f-' + k + '-e' : undefined, disabled: state === 'sending' };
    return <div className="aa-field" data-invalid={invalid ? 'true' : 'false'}>
      <label className="aa-field__l aa-label" htmlFor={'aa-f-' + k}><span><E p={'contact.fields.' + k + '.label'} v={(f[k] || {}).label} /></span><span aria-hidden="true">{k === 'name' ? 'CH-1' : k === 'contact' ? 'CH-2' : 'CH-3'}</span></label>
      {multi ? <textarea {...common} rows={4}></textarea> : <input {...common} type="text" autoComplete={k === 'name' ? 'name' : 'off'} inputMode={k === 'contact' ? 'email' : undefined} />}
      {invalid && <div className="aa-field__err" id={'aa-f-' + k + '-e'}>{errs[k]}</div>}
    </div>;
  };
  // стрелка шкалы «настраивается» на частоту станции по мере заполнения формы (0..4 шага: три поля и согласие)
  const freqStr = contact.frequency || T('freq');
  const fm = /(\d{2,3}(?:[.,]\d)?)/.exec(freqStr); const fq = fm ? Math.min(108, Math.max(88, parseFloat(fm[1].replace(',', '.')))) : 104.7;
  const tuned = ['name', 'contact', 'message'].filter((k) => vals[k].trim()).length + (consent ? 1 : 0);
  const target = (fq - 88) / 20 * 100, needle = state === 'success' ? target : 8 + (target - 8) * tuned / 4;
  return <div className={cx('aa-tx', state === 'sending' && 'aa-tx--sending')} data-theme="other" data-tuned={tuned === 4 ? 'true' : 'false'}>
    <span className="aa-tx__antenna" aria-hidden="true"><i></i><i></i><i></i></span>
    <div className="aa-tx__display aa-label">
      <span className="aa-tx__freq"><E p="contact.frequency" v={contact.frequency || (ed ? '' : T('freq'))} ph="Частота" /></span>
      <span style={{ display: 'inline-flex', gap: 12, alignItems: 'center' }}><span className="aa-tx__bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><Rec label={state === 'sending' ? 'TX' : 'ON AIR'} /></span>
    </div>
    <div className="aa-tx__dial" aria-hidden="true">
      <div className="aa-tx__scale">{[88, 92, 96, 100, 104, 108].map((n) => <span key={n} style={{ left: (n - 88) / 20 * 100 + '%' }}>{n}</span>)}</div>
      <span className="aa-tx__needle" style={{ transform: `translateX(${needle.toFixed(2)}%)` }}><i></i></span>
    </div>
    <div aria-live="polite" className="aa-sr">{state === 'sending' ? T('sending') : state === 'success' ? (contact.successTitle || T('successTitle')) : state === 'error' ? (contact.errorText || T('errorText')) : ''}</div>
    {state === 'success' ? <div className="aa-tx__ok">
      <StaticBurst />
      <div>
        <p className="aa-display aa-tx__ok-t">{contact.successTitle || T('successTitle')}</p>
        <p>{contact.successText}</p>
        <Button variant="outline" onClick={() => setState('idle')}>{contact.successAgain || T('again')}</Button>
      </div>
    </div> : <form className="aa-tx__body" noValidate onSubmit={submit}>
      <h2 className="aa-display aa-tx__title" id="contact-h"><E p="contact.title" v={contact.title} /></h2>
      <p className="aa-tx__lead"><E p="contact.lead" v={contact.lead} /></p>
      {state === 'error' && <div className="aa-tx__alert" role="alert">{contact.errorText}</div>}
      {field('name')}{field('contact')}{field('message', true)}
      {(() => {
        const invalid = touched.consent && errs.consent;
        return <div className="aa-field aa-consent" data-invalid={invalid ? 'true' : 'false'}>
          <label className="aa-consent__l aa-label" htmlFor="aa-f-consent">
            <input id="aa-f-consent" ref={refs.consent} className="aa-consent__box" type="checkbox" name="consent" checked={consent} onChange={toggleConsent} disabled={state === 'sending'} aria-invalid={invalid ? 'true' : 'false'} aria-describedby={invalid ? 'aa-f-consent-e' : undefined} />
            <span className="aa-consent__t">{consentLabel(contact.consentText, lang)}</span>
            <span className="aa-consent__ch" aria-hidden="true">CH-4</span>
          </label>
          {invalid && <div className="aa-field__err" id="aa-f-consent-e">{errs.consent}</div>}
        </div>;
      })()}
      <div className="aa-tx__foot">
        <Button variant="siren" type="submit" disabled={state === 'sending'} arrow={state === 'sending' ? null : '→'}>{state === 'sending' ? (contact.sendingLabel || T('sendingBtn')) : (contact.submitLabel || T('submit'))}</Button>
        {state === 'sending' && <span className="aa-tx__progress" aria-hidden="true"><i></i></span>}
        <span className="aa-tx__grille" aria-hidden="true"></span>
      </div>
    </form>}
  </div>;
}
export function Contact({ contact = {}, onSubmit, id = 'contact' }) {
  const ed = useEd(); const T = useT();
  return <section className="aa-section aa-contact" id={id} data-theme="other" data-header="other" aria-labelledby="contact-h">
    {edEl(ed, 'section', { p: 'contact', kind: 'contact', label: 'Связь и форма' })}
    <div className="aa-wrap">
      <div className="aa-contact__grid">
        <Transmitter contact={contact} onSubmit={onSubmit} />
        <aside className="aa-contact__aside" aria-label={T('channels')}>
          <p className="aa-label" style={{ marginBottom: 12 }}><E p="contact.channelsTitle" v={contact.channelsTitle || (ed ? '' : T('channelsTitle'))} ph="Прямые частоты" /></p>
          <ul className="aa-channels">
            {(contact.channels || []).map((c, i) => <li key={c.id}>{c.url ? <a href={c.url} target="_blank" rel="noopener"><span className="aa-channels__n aa-micro">{pad(i + 1)}</span><span><span className="aa-micro aa-muted" style={{ display: 'block' }}><E p={'contact.channels.@' + c.id + '.label'} v={c.label} /></span><span className="aa-channels__v"><E p={'contact.channels.@' + c.id + '.value'} v={c.value} /></span></span><span aria-hidden="true">↗</span></a>
              : <a aria-disabled="true" role="link"><span className="aa-channels__n aa-micro">{pad(i + 1)}</span><span><span className="aa-micro aa-muted" style={{ display: 'block' }}><E p={'contact.channels.@' + c.id + '.label'} v={c.label} /></span><span className="aa-channels__v"><E p={'contact.channels.@' + c.id + '.value'} v={c.value} /></span></span><span></span></a>}</li>)}
          </ul>
          {(contact.asideNote || ed) && <span className="aa-micro"><E p="contact.asideNote" v={contact.asideNote} ph="Подпись" /></span>}
        </aside>
      </div>
    </div>
  </section>;
}


/* ============ РВАНЫЙ КРАЙ КАФЕЛЯ прямо над забором ============
   Нижние два ряда стены «Услуг» над трубой уже битые: где плитка выпала - видна клёпаная сталь (заплатка
   с тем же рисунком, что у стали Otherworld), где отколота - обломок поверх стали; на целых - трещины.
   Под трубой за сеткой - ещё три ряда редких обломков, дальше чистая сталь. Ряды - по сетке «Услуг»:
   полоса начинается на 2 плитки выше первого шва под трубой (--tile-y). Всё статично, от rng. */
const EDGE_ROWS = [[0.86, 0.15], [0.62, 0.3], [0.38, 0.4], [0.16, 0.5], [0.05, 0.6]], EDGE_ABOVE = 2, EDGE_COLS = 24;
// клик по этим элементам плитку не бьёт: текст, объекты, ссылки, кнопки, поля
const EDGE_SKIP = 'a, button, input, textarea, label, p, h1, h2, h3, li, .aa-poster, .aa-tag, .aa-tx, .aa-contact__aside, .aa-works__intro, .aa-walls__h, .aa-note, .aa-counters, .aa-tracklist, .aa-section__kicker, [contenteditable]';
function crackD(r) {
  // трещина от одного края плитки к другому, ломаной
  const side = (k) => [[r() * 112, 0], [112, r() * 112], [r() * 112, 112], [0, r() * 112]][k];
  const a = Math.floor(r() * 4), b = (a + 1 + Math.floor(r() * 3)) % 4;
  const [x0, y0] = side(a), [x1, y1] = side(b); let d = `M${x0.toFixed(1)} ${y0.toFixed(1)}`;
  const n = 4 + Math.floor(r() * 3);
  for (let i = 1; i < n; i++) { const t = i / n; d += ` L${(x0 + (x1 - x0) * t + (r() - 0.5) * 18).toFixed(1)} ${(y0 + (y1 - y0) * t + (r() - 0.5) * 18).toFixed(1)}`; }
  d += ` L${x1.toFixed(1)} ${y1.toFixed(1)}`;
  if (r() < 0.5) { const bx = x0 + (x1 - x0) * 0.5, by = y0 + (y1 - y0) * 0.5; d += ` M${bx.toFixed(1)} ${by.toFixed(1)} l${((r() - 0.5) * 40).toFixed(1)} ${((r() - 0.5) * 40).toFixed(1)}`; }
  return d;
}
function brokenClip(r) {
  // отколотая плитка: верх цел, низ (или угол) обломан неровно
  if (r() < 0.5) { const ys = [0, 1, 2, 3, 4].map(() => 30 + r() * 60); return `polygon(0 0, 100% 0, 100% ${ys[0]}%, 78% ${ys[1]}%, 52% ${ys[2]}%, 27% ${ys[3]}%, 0 ${ys[4]}%)`; }
  const cx = 30 + r() * 40, cy = 30 + r() * 40;
  return r() < 0.5 ? `polygon(0 0, 100% 0, 100% ${cy}%, ${cx}% 100%, 0 100%)` : `polygon(0 0, 100% 0, 100% 100%, ${cx}% 100%, 0 ${cy}%)`;
}
function CrackSvg({ d }) {
  return <svg viewBox="0 0 112 112" aria-hidden="true"><path d={d} className="aa-cracks__lit" transform="translate(.8 1)" /><path d={d} className="aa-cracks__line" /></svg>;
}
const EDGE = (() => {
  const r = rng(31), out = [];
  EDGE_ROWS.forEach(([keep, brk], i) => {
    const above = i < EDGE_ABOVE; // ряд на стене «Услуг» (над трубой): под ним нужна заплатка стали
    for (let c = 0; c < EDGE_COLS; c++) {
      const left = c * TILE, top = i * TILE, present = r() < keep, broken = present && r() < brk, cracked = present && r() < 0.45;
      // заплатка штукатурки: рисунок в координатах «Услуг» (--band-y), совпадает с выбитыми дырами
      if (above && (!present || broken)) out.push(<i key={'h' + i + '-' + c} className="aa-edge__h" style={{ left, top, backgroundPosition: `${-left}px calc(-1 * var(--band-y, 0px) - ${top}px)` }}></i>);
      if (present) out.push(<i key={i + '-' + c} className="aa-edge__t" data-patch={above && !broken ? '1' : undefined} style={{ left, top, clipPath: broken ? brokenClip(r) : undefined, backgroundPosition: `${-left}px calc(-1 * var(--band-y, 0px) - ${top}px), ${-left}px calc(-1 * var(--band-y, 0px) - ${top}px)` }}>{cracked && <CrackSvg d={crackD(r)} />}</i>);
    }
  });
  return out;
})();

/* ============ ПОТУСТОРОННИЙ МИР: фонарик над «Работами», «Кейсами» и «Связью» ============
   Одно тёмное пространство на три секции. Под темнотой - клёпаные стальные панели (забора больше нет),
   их видно только в луче фонарика, который сам бродит по экрану (к мыши не привязан).
   Темнота - sticky-слой высотой в экран: луч живёт в координатах окна и не требует слушать scroll.
   Всё движение - только transform. */
// пылинки в луче: позиции и ритм фиксированы (rng), сами летят CSS-анимацией transform/opacity
const DUST = (() => { const r = rng(9); return Array.from({ length: 18 }, (_, i) => <i key={i} style={{ left: (8 + r() * 84).toFixed(1) + '%', top: (8 + r() * 84).toFixed(1) + '%', animationDuration: (7 + r() * 9).toFixed(1) + 's', animationDelay: (-r() * 14).toFixed(1) + 's', '--dx': ((r() - 0.5) * 90).toFixed(0) + 'px', '--s': (0.6 + r() * 1.1).toFixed(2) }}></i>); })();
export function Otherworld({ children, seam = false }) {
  const ref = useRef(null), viewRef = useRef(null), lightRef = useRef(null), dustRef = useRef(null); const reduced = useReducedMotion();
  const reducedRef = useRef(reduced); reducedRef.current = reduced;
  useEffect(() => {
    const el = ref.current, V = viewRef.current, L = lightRef.current, D = dustRef.current; if (!el || !V || !L) return;
    const coarse = matchMedia('(pointer: coarse)').matches;
    const rK = reduced ? (coarse ? 0.8 : 0.55) : (coarse ? 0.62 : 0.42);
    let W = 1, H = 1, S = 1;
    const size = () => { W = V.clientWidth; H = V.clientHeight; const half = Math.hypot(W, H) * 1.05; S = half / 100; L.style.setProperty('--f', (rK * Math.max(W, H) / half * 100).toFixed(2) + '%'); };
    const put = (x, y) => {
      L.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${S.toFixed(3)})`;
      if (D) D.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    };
    size();
    if (reduced) { put(W * 0.62, H * 0.42); const r = () => { size(); put(W * 0.62, H * 0.42); }; window.addEventListener('resize', r); return () => window.removeEventListener('resize', r); }
    // луч сам бродит по экрану, к мыши не привязан: плавная кривая из нескольких синусов (не повторяется на глаз),
    // держится в середине окна (x 18-82%, y 22-78%), чтобы всегда был на виду
    let raf = 0, visible = false; const t0 = performance.now();
    const tick = (now) => {
      raf = 0; if (!visible) return;
      const t = (now - t0) / 1000;
      const x = 0.5 + 0.24 * Math.sin(t * 0.23) + 0.08 * Math.sin(t * 0.61 + 2.1);
      const y = 0.5 + 0.18 * Math.sin(t * 0.31 + 1.3) + 0.1 * Math.sin(t * 0.53 + 0.4);
      put(W * x, H * y);
      raf = requestAnimationFrame(tick);
    };
    const start = () => { if (!raf && visible) raf = requestAnimationFrame(tick); };
    const onResize = () => { size(); start(); };
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); }) : null;
    if (io) io.observe(el); else { visible = true; start(); }
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); io && io.disconnect(); window.removeEventListener('resize', onResize); };
  }, [reduced]);
  // стык с «Услугами»: кафель продолжается за забором ровно по сетке секции (--tile-y), а темнота
  // нарастает градиентом до начала «Кейсов» (--cases-at). Меряется только при изменении размеров.
  useEffect(() => {
    const el = ref.current; if (!el || !seam) return;
    const prev = el.previousElementSibling;
    const fit = () => {
      if (prev) el.style.setProperty('--tile-y', ((TILE - (prev.offsetHeight % TILE)) % TILE) + 'px');
      // верх полосы рваного края от верха «Услуг»: по нему плитки и штукатурка края совпадают с текстурами секции
      if (prev) el.style.setProperty('--band-y', (prev.offsetHeight + (TILE - (prev.offsetHeight % TILE)) % TILE - EDGE_ABOVE * TILE) + 'px');
      const cases = el.querySelector('.aa-cases'); if (!cases) return;
      el.style.setProperty('--cases-at', cases.offsetTop + 'px');
    };
    fit();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    if (ro) { ro.observe(el); prev && ro.observe(prev); }
    return () => ro && ro.disconnect();
  }, [seam]);
  // общий тёмный задник «Работ» и «Кейсов» (как Inventory в ките SH2): одна полоса от верха «Работ» до низа «Кейсов»,
  // два пятна света - за «осмотром» и за журналом. Меряется только при изменении размеров.
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const fit = () => {
      const w = el.querySelector('.aa-works'), c = el.querySelector('.aa-cases'), j = el.querySelector('.aa-jr'), k = el.querySelector('.aa-contact');
      // задник тянется и под «Связь» (радио в том же тёмном пространстве), третье пятно света - за приёмником
      const last = k || c;
      if (last) el.style.setProperty('--bg-end', (last.offsetTop + last.offsetHeight) + 'px');
      if (k) el.style.setProperty('--contact-y', Math.round(k.offsetTop + k.offsetHeight * 0.5) + 'px');
      if (w) el.style.setProperty('--works-y', Math.round(w.offsetTop + w.offsetHeight * 0.55) + 'px');
      if (c && j) el.style.setProperty('--cases-y', Math.round(c.offsetTop + j.offsetTop + j.offsetHeight * 0.45) + 'px');
    };
    fit();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null; ro && ro.observe(el);
    return () => ro && ro.disconnect();
  }, []);
  // пасхалка на рваном крае: слой стены не ловит мышь и лежит под содержимым «Работ», поэтому клик ловится
  // на общем контейнере и плитка ищется по координатам (десятки плиток, только в момент клика).
  // Выбитые плитки не удаляются из DOM (ими владеет React) - только прячутся; сталь и обломки - в своих пустых слоях.
  const ed = useEd();
  useEffect(() => {
    const el = ref.current, root = el && el.parentElement; if (!el || !root || !seam || ed) return;
    const band = el.querySelector('.aa-edge'), holes = band && band.querySelector('.aa-edge__holes'), fx = band && band.querySelector('.aa-edge__fx');
    if (!band || !holes || !fx) return;
    let downX = 0, downY = 0;
    const bare = (e) => !(e.target.closest && e.target.closest(EDGE_SKIP));
    const onDown = (e) => { downX = e.clientX; downY = e.clientY; if (e.detail > 1 && bare(e)) e.preventDefault(); };
    const onClick = (e) => {
      if (e.button !== 0 || !bare(e) || Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) return;
      const list = band.querySelectorAll('.aa-edge__t:not(.is-fall)'); let hit = null, hb = null;
      for (let i = list.length - 1; i >= 0; i--) { const rb = list[i].getBoundingClientRect(); if (e.clientX >= rb.left && e.clientX < rb.right && e.clientY >= rb.top && e.clientY < rb.bottom) { hit = list[i]; hb = rb; break; } }
      if (!hit) return;
      const left = parseFloat(hit.style.left), top = parseFloat(hit.style.top);
      if (hit.dataset.patch) {
        const h = document.createElement('i'); h.className = 'aa-edge__h';
        h.style.left = left + 'px'; h.style.top = top + 'px';
        h.style.backgroundPosition = `${-left}px calc(-1 * var(--band-y, 0px) - ${top}px)`;
        holes.appendChild(h);
      }
      if (reducedRef.current) { hit.classList.add('is-fall', 'is-gone'); return; }
      hit.style.setProperty('--dx', ((Math.random() - 0.5) * 80).toFixed(0) + 'px');
      hit.style.setProperty('--rot', ((Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 22)).toFixed(0) + 'deg');
      hit.classList.add('is-fall'); setTimeout(() => hit.classList.add('is-gone'), 1000);
      const px = e.clientX - hb.left, py = e.clientY - hb.top;
      for (let k = 0; k < 4; k++) {
        const f = document.createElement('i'); f.className = 'aa-knock__f';
        f.style.left = (left + px - 8 + (Math.random() - 0.5) * 30).toFixed(0) + 'px'; f.style.top = (top + py - 8 + (Math.random() - 0.5) * 30).toFixed(0) + 'px';
        f.style.setProperty('--dx', ((Math.random() - 0.5) * 160).toFixed(0) + 'px'); f.style.setProperty('--rot', ((Math.random() - 0.5) * 540).toFixed(0) + 'deg');
        f.style.setProperty('--s', (0.5 + Math.random() * 0.8).toFixed(2));
        fx.appendChild(f); setTimeout(() => f.remove(), 1100);
      }
    };
    root.addEventListener('mousedown', onDown); root.addEventListener('click', onClick);
    return () => { root.removeEventListener('mousedown', onDown); root.removeEventListener('click', onClick); holes.textContent = ''; fx.textContent = ''; };
  }, [seam, ed]);
  return <div ref={ref} className={cx('aa-otherworld', seam && 'aa-otherworld--seam')}>
    <div className="aa-otherworld__wall" aria-hidden="true">
      {seam && <div className="aa-edge"><div className="aa-edge__holes"></div>{EDGE}<div className="aa-edge__fx"></div></div>}
    </div>
    <div className="aa-otherworld__dark" aria-hidden="true"><div className="aa-otherworld__view" ref={viewRef}><div className="aa-otherworld__light" ref={lightRef}></div><div className="aa-otherworld__dust" ref={dustRef}>{DUST}</div></div></div>
    <div className="aa-inv-bg" aria-hidden="true"><i></i><i></i></div>
    {children}
  </div>;
}

/* ============ ФУТЕР ============ */
/* подпись разработчика (согласовано с владельцем сайта) - намеренно вне контента, чтобы её нельзя было поменять из админки */
const DEV_CREDIT = { url: 'https://vissegor.ru/' }; // подпись - UI.dev на языке страницы
export function Footer({ footer = {}, monogram = 'AA', onNavigate }) {
  const ed = useEd(); const lang = useLang(); const T = useT();
  return <footer className="aa-footer" data-theme="other" data-header="other">
    {edEl(ed, 'section', { p: 'footer', kind: 'footer', label: 'Футер' })}
    <div className="aa-wrap aa-footer__row">
      <Monogram variant="mark" text={monogram} />
      <div className="aa-label"><E p="footer.copyright" v={footer.copyright} /></div>
      <a className="aa-label" href="#top" onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate('top'); } }}>↑ <E p="footer.toTop" v={footer.toTop || (ed ? '' : T('toTop'))} ph="Наверх" /></a>
    </div>
    <nav className="aa-wrap aa-footer__legal aa-micro" aria-label={T('docs')}>
      <a href={siteUrl('privacy', lang)} target={ed ? '_blank' : undefined}><E p="footer.privacyLabel" v={footer.privacyLabel || (ed ? '' : T('privacyLabel'))} ph="Политика обработки данных" /></a>
      <a href={siteUrl('consent', lang)} target={ed ? '_blank' : undefined}><E p="footer.consentLabel" v={footer.consentLabel || (ed ? '' : T('consentLabel'))} ph="Согласие на обработку данных" /></a>
      {/* подпись разработчика: задана в коде, в админке не редактируется */}
      {!ed && <a href="#cookies" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('aa-cookie-open')); }}>{T('cookieSettings')}</a>}
      <a className="aa-footer__credit" href={DEV_CREDIT.url} target="_blank" rel="noopener">{T('dev')} ↗</a>
    </nav>
  </footer>;
}

/* ============ ПЛАШКА О COOKIE ============
   Единственная cookie сайта - aa_lang (запоминает выбранный язык), аналитики и рекламы нет. Пока посетитель не нажал
   «Принять», cookie не ставится. «Принять» и «Отклонить» равноценны (одного вида). Решение - в localStorage aa-cookie
   (accepted | declined): без него выбор нельзя было бы соблюдать. «Отклонить» удаляет aa_lang, если она была.
   Плашка появляется после прелоадера; передумать - ссылка «Cookie» в футере (событие aa-cookie-open).
   Тексты - footer.cookieText / cookieAccept / cookieDecline ({privacy:слово} - ссылка на политику). Только opacity/transform. */
export function CookieNotice({ footer = {} }) {
  const ed = useEd(); const lang = useLang(); const T = useT();
  const [show, setShow] = useState(false); const [out, setOut] = useState(false);
  useEffect(() => {
    if (ed) return;
    const open = () => { setOut(false); setShow(true); };
    window.addEventListener('aa-cookie-open', open);
    let t = 0;
    if (!cookieChoice()) {
      // ждём, пока уйдёт прелоадер, и ещё секунду - чтобы не лезть поверх первого кадра
      const wait = () => { if (document.documentElement.classList.contains('aa-preloading')) { t = setTimeout(wait, 300); return; } t = setTimeout(open, 1200); };
      wait();
    }
    return () => { clearTimeout(t); window.removeEventListener('aa-cookie-open', open); };
  }, [ed]);
  if (ed || !show) return null;
  const decide = (v) => {
    try { localStorage.setItem(COOKIE_KEY, v); } catch (_) {}
    if (v === 'declined') setLangCookie('', 0); // отказ - убираем, если раньше ставили
    else setLangCookie(lang, 31536000); // принял - запоминаем язык, на котором он сейчас
    setOut(true); setTimeout(() => setShow(false), 400);
  };
  const text = footer.cookieText || T('cookieText');
  return <div className={cx('aa-cookie', out && 'is-out')} role="dialog" aria-modal="false" aria-label={T('cookieLabel')} data-theme="other">
    <p className="aa-cookie__t">{text.split(/(\{privacy:[^}]+\})/).map((part, i) => { const m = /^\{privacy:([^}]+)\}$/.exec(part); return m ? <a key={i} href={siteUrl('privacy', lang)}>{m[1]}</a> : part; })}</p>
    <div className="aa-cookie__acts">
      <button type="button" className="aa-cookie__btn" onClick={() => decide('accepted')}>{footer.cookieAccept || T('cookieAccept')}</button>
      <button type="button" className="aa-cookie__btn" onClick={() => decide('declined')}>{footer.cookieDecline || T('cookieDecline')}</button>
    </div>
  </div>;
}

/* ============ ДОКУМЕНТЫ: /privacy и /consent ============ */
const ruDate = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : (iso || ''); };
/** Подставляет реквизиты в текст документа: {operatorName}, {operatorEmail}, {retentionMonths}, {policyLink}, {consentLink}… */
export function legalText(text, legal = {}, site = '', lang = 'ru') {
  const vals = { ...legal, effectiveDate: ruDate(legal.effectiveDate), site: site || (typeof location !== 'undefined' ? location.host : '') };
  return String(text || '').split(/(\{\w+\})/).map((part, i) => {
    const m = /^\{(\w+)\}$/.exec(part); if (!m) return part;
    if (m[1] === 'policyLink') return <a key={i} href={siteUrl('privacy', lang)}>«{legal.policyTitle || tr(lang, 'policyTitle')}»</a>;
    if (m[1] === 'consentLink') return <a key={i} href={siteUrl('consent', lang)}>«{legal.consentTitle || tr(lang, 'consentTitle')}»</a>;
    return vals[m[1]] != null ? String(vals[m[1]]) : part;
  });
}
export function LegalPage({ content, kind = 'privacy', lang = 'ru' }) {
  const T = (k, v) => tr(lang, k, v); const c = content || {}; const L = c.legal || {}; const mono = (c.site && c.site.monogram) || 'AA';
  const isPolicy = kind !== 'consent';
  const title = isPolicy ? (L.policyTitle || T('policyTitle')) : (L.consentTitle || T('consentTitle'));
  const version = isPolicy ? L.policyVersion : L.consentVersion;
  return <LangContext.Provider value={lang}><div className="aa-page aa-legal" data-theme="other" id="top">
    <header className="aa-legal__bar">
      <a className="aa-legal__home" href={siteUrl('home', lang)}><Monogram variant="mark" text={mono} label={T('homeShort')} /><span className="aa-label">{T('toSite')}</span></a>
      <span className="aa-micro aa-legal__doc">{T('doc')} {isPolicy ? '01' : '02'}</span>
    </header>
    <main className="aa-legal__main" id="main">
      <p className="aa-legal__meta aa-micro">{T('version')} {version || '1.0'} · {T('since')} {ruDate(L.effectiveDate)}</p>
      <h1 className="aa-legal__title">{title}</h1>
      {isPolicy ? (L.policy || []).map((sec, i) => <section key={i} className="aa-legal__sec">
        <h2 className="aa-legal__h aa-label"><span aria-hidden="true">{pad(i + 1)}</span>{sec.title}</h2>
        {(sec.paragraphs || []).map((p, k) => <p key={k}>{legalText(p, L, c.site && c.site.domain, lang)}</p>)}
      </section>)
        : <section className="aa-legal__sec">{(L.consent || []).map((p, k) => <p key={k}>{legalText(p, L, c.site && c.site.domain, lang)}</p>)}</section>}
      <p className="aa-legal__see aa-micro">{isPolicy ? <a href={siteUrl('consent', lang)}>{L.consentTitle || T('consentTitle')} →</a> : <a href={siteUrl('privacy', lang)}>{L.policyTitle || T('policyTitle')} →</a>}</p>
    </main>
    <Footer footer={c.footer} monogram={mono} />
    <CookieNotice footer={c.footer} />
  </div></LangContext.Provider>;
}

/* ============ ЛЕНДИНГ ============ */
export function Landing({ content, contained = false, onSubmitLead, atmosphere = true, lang = 'ru' }) {
  const c = content || {}; const reduced = useReducedMotion(); const lite = useLite();
  const rootRef = useRef(null);
  const [hdr, setHdr] = useState('other'); const [active, setActive] = useState(null); const [solid, setSolid] = useState(false);
  const mono = (c.site && c.site.monogram) || 'AA';
  const nav = useCallback((id) => {
    if (id === 'top') { const sc = getScroller(rootRef.current); sc.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); return; }
    scrollToId(id, reduced);
  }, [reduced]);
  useEffect(() => {
    const root = rootRef.current; if (!root) return; const sc = getScroller(root);
    const ioRoot = sc === window ? null : sc;
    if (typeof IntersectionObserver === 'undefined') return;
    // тонкая полоса под хедером: какая секция в ней - та и задаёт тему
    const topHits = new Set();
    const pickHdr = () => { let best = null, bt = -Infinity; for (const el of topHits) { const t = el.getBoundingClientRect().top; if (t <= 32 && t > bt) { bt = t; best = el; } } setHdr(best ? best.getAttribute('data-header') : 'other'); };
    const ioHdr = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? topHits.add(e.target) : topHits.delete(e.target))); pickHdr(); }, { root: ioRoot, rootMargin: '0px 0px -95% 0px' });
    root.querySelectorAll('[data-header]').forEach((el) => ioHdr.observe(el));
    // линия на 40% высоты экрана: секция на ней - активный пункт меню
    const ids = (c.nav || []).map((n) => n.id); const midHits = new Set();
    const ioNav = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? midHits.add(e.target.id) : midHits.delete(e.target.id))); setActive(ids.find((id) => midHits.has(id)) || null); }, { root: ioRoot, rootMargin: '-40% 0px -59% 0px' });
    ids.forEach((id) => { const el = document.getElementById(id); el && ioNav.observe(el); });
    // на время прокрутки выключаем наведение
    let t = 0;
    // хедер плотный, как только страница сдвинулась: setState меняет значение только на пороге
    const scrolled = () => (sc === window ? window.scrollY : sc.scrollTop) > 8;
    const onScroll = () => { setSolid(scrolled()); if (!t) root.setAttribute('data-scrolling', ''); clearTimeout(t); t = setTimeout(() => { t = 0; root.removeAttribute('data-scrolling'); }, 140); };
    setSolid(scrolled());
    sc.addEventListener('scroll', onScroll, { passive: true });
    return () => { ioHdr.disconnect(); ioNav.disconnect(); sc.removeEventListener('scroll', onScroll); clearTimeout(t); root.removeAttribute('data-scrolling'); };
  }, [c.nav]);
  const langs = LANGS.filter((l) => langOn(c, l));
  return <LangContext.Provider value={lang}><div ref={rootRef} className={cx('aa-page', contained && 'aa-page--contained', lite && 'aa-lite')} data-theme="other" lang={lang}>
    <a className="aa-sr" href="#main">{tr(lang, 'skip')}</a>
    <Header nav={c.nav} monogram={mono} theme={hdr} active={active} onNavigate={nav} solid={solid} langs={langs} />
    <main id="main">
      <Hero hero={c.hero} onNavigate={nav} />
      <About about={c.about} />
      <Services services={c.services} />
      {/* переход между мирами пока выключен: показывается только при rift.enabled === true (галочка в админке, «Страница») */}
      {c.rift && c.rift.enabled === true && <WorldRift rift={c.rift} />}
      <Otherworld seam={!(c.rift && c.rift.enabled === true)}>
        <Works works={c.works} />
        <Cases cases={c.cases} />
        <Contact contact={c.contact} onSubmit={onSubmitLead || api.submitLead} />
      </Otherworld>
    </main>
    <Footer footer={c.footer} monogram={mono} onNavigate={nav} />
    {atmosphere && <Atmosphere fixed scanlines={false} />}
    <CookieNotice footer={c.footer} />
  </div></LangContext.Provider>;
}

/* ============ слой данных (под будущий бэкенд) ============ */
export const api = {
  /** Контент страницы. Сейчас - локальный объект, позже GET {endpoint}. */
  async loadContent({ endpoint, fallback } = {}) {
    if (endpoint) {
      try { const r = await fetch(endpoint, { headers: { Accept: 'application/json' } }); if (r.ok) return await r.json(); } catch (_) { /* упадём на fallback */ }
    }
    return fallback || window.AA_CONTENT || null;
  },
  /** Заявка из формы. Без endpoint - имитация: 1.2 с задержки; имя со словом «ошибка» - отказ (для проверки состояния). */
  async submitLead(payload, { endpoint } = {}) {
    const ep = endpoint || (window.AA_CONFIG && window.AA_CONFIG.leadEndpoint);
    if (ep) {
      const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error('HTTP ' + r.status); return r.json().catch(() => ({}));
    }
    await new Promise((r) => setTimeout(r, 1200));
    if (/ошибка|error/i.test(payload && payload.name || '')) throw new Error('mock error');
    return { ok: true };
  },
};
