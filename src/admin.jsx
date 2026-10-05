/* AA · Пульт - админка. Это тот же Landing, обёрнутый в EditContext:
   тексты правятся прямо на странице, места под медиа подсвечены, остальное - в боковой панели. */
const React = window.React;
const { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, Fragment } = React;
const h = React.createElement;
const AA = window.AA;
const BASE = (window.AA_ADMIN && window.AA_ADMIN.base) || '';
const cx = (...a) => a.filter(Boolean).join(' ');

/* ============ сеть ============ */
async function call(method, url, body) {
  const r = await fetch(BASE + '/api' + url, { method, credentials: 'same-origin', headers: { 'X-AA-Admin': '1', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || 'HTTP ' + r.status), { status: r.status });
  return data;
}
/* Загрузка: файл уходит на сервер, фото возвращается уже в WebP, для видео сервер отвечает номером задачи -
   ждём, пока он сожмёт его в WebM (прогресс в фазе 'convert'). purpose: 'preview' | 'bg' - видео без звука. */
function uploadFile(file, onProgress, { purpose } = {}) {
  const sent = new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', BASE + '/api/upload');
    x.setRequestHeader('X-AA-Admin', '1');
    x.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
    if (purpose) x.setRequestHeader('X-Media-Purpose', purpose);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress && onProgress(e.loaded / e.total, 'upload');
    x.onload = () => { let d = {}; try { d = JSON.parse(x.responseText); } catch (_) {} x.status < 300 ? resolve(d) : reject(new Error(d.error || 'Ошибка загрузки ' + x.status)); };
    x.onerror = () => reject(new Error('Сеть недоступна'));
    x.send(file);
  });
  return sent.then(async (r) => {
    if (!r.job) return r;
    onProgress && onProgress(0, 'convert');
    for (;;) {
      await new Promise((ok) => setTimeout(ok, 1000));
      const j = await call('GET', '/upload/jobs/' + r.job);
      onProgress && onProgress(j.progress || 0, 'convert');
      if (j.status === 'done') return { ...r, url: j.url, converted: true, before: j.before, after: j.after };
      if (j.status === 'failed') return { ...r, url: j.original, converted: false, note: 'не удалось сжать: ' + j.error };
    }
  });
}
/* куда идёт медиа - по пути в контенте: превью на наведение и фон hero без звука */
const purposeOf = (p) => (/\.previewVideo$/.test(p || '') ? 'preview' : p === 'hero.media.src' ? 'bg' : '');
const upText = (up) => `${up.phase === 'convert' ? 'Сжатие' : 'Загрузка'} ${Math.round((up.prog || 0) * 100)}%`;

/* ============ пути в контенте: "works.items.@w-01.title", "about.paragraphs.0" ============ */
const segs = (p) => (Array.isArray(p) ? p : String(p).split('.').filter(Boolean));
const idxOf = (arr, s) => (s[0] === '@' ? arr.findIndex((x) => x && x.id === s.slice(1)) : Number(s));
function getIn(o, p) { let cur = o; for (const s of segs(p)) { if (cur == null) return undefined; cur = Array.isArray(cur) ? cur[idxOf(cur, s)] : cur[s]; } return cur; }
function setIn(o, p, v) {
  const ss = segs(p); if (!ss.length) return typeof v === 'function' ? v(o) : v;
  const [s, ...rest] = ss;
  if (o == null) o = /^\d+$/.test(s) ? [] : {};
  if (Array.isArray(o)) {
    const i = idxOf(o, s); if (!(i >= 0)) return o;
    const c = o.slice(); for (let j = c.length; j < i; j++) c[j] = rest.length ? {} : '';
    c[i] = setIn(o[i], rest, v); return c;
  }
  return { ...o, [s]: setIn(o[s], rest, v) };
}
/* Английский слой content.en: те же пути, что у основы. Элемент списка с id адресуется по id ("@w-01"),
   даже если путь пришёл с номером, - так перевод не съезжает при перестановке. Нет элемента - создаётся { id }. */
function trSeg(b, s) { if (/^\d+$/.test(s) && Array.isArray(b)) { const it = b[Number(s)]; if (it && typeof it === 'object' && it.id != null) return '@' + it.id; } return s; }
function setTr(t, b, ss, v) {
  if (!ss.length) return v;
  const s = trSeg(b, ss[0]); const rest = ss.slice(1);
  if (s[0] === '@') {
    const id = s.slice(1); const arr = Array.isArray(t) ? t.slice() : [];
    const bi = Array.isArray(b) ? b.find((x) => x && x.id === id) : undefined;
    let i = arr.findIndex((x) => x && x.id === id); if (i < 0) { arr.push({ id }); i = arr.length - 1; }
    arr[i] = { ...setTr(arr[i], bi, rest, v), id }; return arr;
  }
  if (/^\d+$/.test(s) && (Array.isArray(b) || Array.isArray(t))) {
    const i = Number(s); const arr = Array.isArray(t) ? t.slice() : [];
    while (arr.length < i) arr.push(rest.length ? {} : '');
    arr[i] = setTr(arr[i], Array.isArray(b) ? b[i] : undefined, rest, v); return arr;
  }
  const o = t && typeof t === 'object' && !Array.isArray(t) ? { ...t } : {};
  o[s] = setTr(o[s], b && b[s], rest, v); return o;
}
function getTr(t, b, ss) {
  for (const s0 of ss) {
    if (t == null) return undefined;
    const s = trSeg(b, s0);
    if (s[0] === '@') { const id = s.slice(1); t = Array.isArray(t) ? t.find((x) => x && x.id === id) : undefined; b = Array.isArray(b) ? b.find((x) => x && x.id === id) : undefined; }
    else { t = Array.isArray(t) ? t[Number(s)] : t[s]; b = b == null ? undefined : Array.isArray(b) ? b[Number(s)] : b[s]; }
  }
  return t;
}
const hasText = (v) => typeof v === 'string' && v.trim() !== '';
const noDash = (v) => (typeof v === 'string' ? v.replace(/[\u2014\u2013]/g, '-') : v); // правило: только дефис
const uid = (pre) => pre + '-' + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 4);
const isPh = (v) => typeof v === 'string' && /\[[^\]]*\]/.test(v);
const fmtSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' МБ' : Math.max(1, Math.round(b / 1024)) + ' КБ');
const fmtDate = (iso) => { try { return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (_) { return iso; } };
const isVideoUrl = (u) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u || '');

/* ============ схемы: какие поля у секций и элементов ============ */
const TARGETS = [['contact', 'Связь'], ['works', 'Работы'], ['cases', 'Кейсы'], ['services', 'Услуги'], ['about', 'Обо мне'], ['top', 'Наверх']];
const year = () => new Date().getFullYear();
const KINDS = {
  work: {
    title: (d) => 'Работа · ' + (d.title || ''),
    make: (c, extra = {}) => {
      const items = getIn(c, 'works.items') || []; const cats = getIn(c, 'works.categories') || [];
      return { id: uid('w'), title: '[Новая работа]', category: extra.category || (cats[0] && cats[0].id) || 'youtube', format: '16:9', year: year(), previewImage: '', previewVideo: '', videoUrl: '', description: '', order: items.reduce((m, w) => Math.max(m, w.order || 0), 0) + 1, published: false };
    },
    fields: [
      { k: 'published', label: 'Показывать на сайте', t: 'bool', hint: 'Выключено - черновик: виден только здесь' },
      { k: 'title', label: 'Название' },
      { k: 'category', label: 'Категория', t: 'select', options: (c) => (getIn(c, 'works.categories') || []).map((x) => [x.id, x.label]) },
      { k: 'format', label: 'Формат', t: 'select', options: [['16:9', '16:9 - горизонтальное'], ['9:16', '9:16 - вертикальное']] },
      { k: 'year', label: 'Год', t: 'number' },
      { k: 'previewImage', label: 'Превью-картинка', t: 'media', accept: 'image' },
      { k: 'previewVideo', label: 'Видео-превью: играет у выбранной работы (коротко, без звука)', t: 'media', accept: 'video' },
      { k: 'videoUrl', label: 'Ролик в плеере: ссылка YouTube или файл', t: 'media', accept: 'video', link: true },
      { k: 'description', label: 'Описание', t: 'textarea' },
    ],
  },
  case: {
    title: (d) => 'Кейс · ' + (d.client || ''),
    make: () => ({ id: uid('c'), client: '[Клиент]', task: '[Задача]', done: '[Что сделано]', metrics: [], link: '', year: year() }),
    fields: [
      { k: 'client', label: 'Клиент / канал' },
      { k: 'year', label: 'Год', t: 'number' },
      { k: 'task', label: 'Задача', t: 'textarea' },
      { k: 'done', label: 'Сделано', t: 'textarea' },
      { k: 'link', label: 'Ссылка «Смотреть»', t: 'url' },
      { k: 'metrics', label: 'Результат: было → стало', t: 'list', make: () => ({ label: '[Метрика]', before: '0', after: '0' }), of: [{ k: 'label', label: 'Метрика' }, { k: 'before', label: 'Было', half: true }, { k: 'after', label: 'Стало', half: true }] },
    ],
  },
  service: {
    title: (d) => 'Услуга · ' + (d.title || ''),
    make: () => ({ id: uid('s'), title: '[Новая услуга]', text: '[Описание]', timecode: '00:00' }),
    fields: [{ k: 'title', label: 'Название' }, { k: 'text', label: 'Описание', t: 'textarea' }, { k: 'timecode', label: 'Таймкод справа' }],
  },
  paragraph: { make: () => '[Новый абзац]' },
  metric: { make: () => ({ label: '[Метрика]', before: '0', after: '0' }) },
};
const mediaType = (d) => (d && d.media && d.media.type === 'video' ? 'video' : 'image');
const SECTIONS = {
  page: {
    title: 'Страница и меню',
    fields: [
      { k: 'site.name', label: 'Имя' },
      { k: 'site.title', label: 'Заголовок вкладки и поисковиков' },
      { k: 'site.description', label: 'Описание для поисковиков', t: 'textarea' },
      { k: 'i18n.en.enabled', label: 'Английская версия сайта (/en)', t: 'bool', hint: 'Пока выключено, /en ведёт на русскую версию и в шапке нет переключателя RU / EN. Перевод правится в режиме EN на пульте: пустое поле - на сайте русский текст' },
      { k: 'nav', label: 'Пункты меню', t: 'list', fixed: true, of: [{ k: 'label', label: 'Название' }] },
    ],
  },
  hero: {
    title: 'Hero и фон',
    fields: [
      { k: 'titleLines', label: 'Имя текстом, по строкам (для поиска; на экране - если нет картинки-логотипа)', t: 'strings', max: 3 },
      { k: 'primaryCta.label', label: 'Главная кнопка', half: true }, { k: 'primaryCta.target', label: 'ведёт в', t: 'select', options: TARGETS, half: true },
      { k: 'secondaryCta.label', label: 'Вторая кнопка', half: true }, { k: 'secondaryCta.target', label: 'ведёт в', t: 'select', options: TARGETS, half: true },
      { group: 'Фон' },
      { k: 'media.type', label: 'Что на фоне', t: 'select', options: [['image', 'Картинка'], ['video', 'Видео (без звука, по кругу)']] },
      { k: 'media.src', label: 'Файл фона', t: 'media', accept: (d) => (mediaType(d) === 'video' ? 'video' : 'image') },
      { k: 'media.poster', label: 'Кадр до загрузки видео', t: 'media', accept: 'image', when: (d) => mediaType(d) === 'video' },
      { k: 'media.alt', label: 'Описание картинки (для незрячих)', when: (d) => mediaType(d) === 'image' },
    ],
  },
  about: {
    title: 'Обо мне и цифры',
    fields: [
      { k: 'title', label: 'Заголовок' }, { k: 'noteTitle', label: 'Заголовок записки' },
      { k: 'paragraphs', label: 'Абзацы', t: 'strings', area: true },
      { k: 'signature', label: 'Подпись' },
      { k: 'stats', label: 'Счётчики', t: 'list', make: () => ({ id: uid('st'), value: 0, suffix: '', label: '[подпись]', placeholder: true }), of: [
        { k: 'value', label: 'Число', t: 'number', nullable: true, half: true }, { k: 'suffix', label: 'После числа', half: true },
        { k: 'display', label: 'Знак вместо числа (если число пустое)', when: (s) => s.value == null }, { k: 'label', label: 'Подпись' },
        { k: 'placeholder', label: 'Цифра-плейсхолдер (не настоящая)', t: 'bool' }] },
    ],
  },
  services: {
    title: 'Услуги',
    fields: [{ k: 'title', label: 'Заголовок' }, { k: 'intro', label: 'Вступление', t: 'textarea' },
      { k: 'items', label: 'Услуги', t: 'list', make: KINDS.service.make, of: KINDS.service.fields }],
  },
  works: {
    title: 'Работы и категории',
    fields: [{ k: 'title', label: 'Заголовок' }, { k: 'allLabel', label: 'Вкладка «все»' },
      { k: 'categories', label: 'Категории', t: 'list', make: () => ({ id: uid('cat'), label: '[Категория]' }), of: [{ k: 'label', label: 'Название', half: true }, { k: 'id', label: 'Код (латиница)', half: true, slug: true }] }],
  },
  cases: { title: 'Кейсы', fields: [{ k: 'title', label: 'Заголовок' }, { k: 'items', label: 'Кейсы', t: 'list', make: KINDS.case.make, of: KINDS.case.fields.filter((f) => f.k !== 'metrics'), note: 'Метрики правь прямо в журнале' }] },
  contact: {
    title: 'Связь и форма',
    fields: [
      { k: 'title', label: 'Заголовок формы' }, { k: 'lead', label: 'Текст над формой', t: 'textarea' }, { k: 'frequency', label: 'Строка на дисплее' },
      { group: 'Поля формы' },
      { k: 'fields.name.label', label: 'Имя: метка', half: true }, { k: 'fields.name.placeholder', label: 'подсказка', half: true },
      { k: 'fields.contact.label', label: 'Контакт: метка', half: true }, { k: 'fields.contact.placeholder', label: 'подсказка', half: true },
      { k: 'fields.message.label', label: 'Сообщение: метка', half: true }, { k: 'fields.message.placeholder', label: 'подсказка', half: true },
      { k: 'submitLabel', label: 'Кнопка', half: true }, { k: 'sendingLabel', label: 'Во время отправки', half: true },
      { group: 'Ответы формы' },
      { k: 'successTitle', label: 'Успех: заголовок' }, { k: 'successText', label: 'Успех: текст', t: 'textarea' }, { k: 'successAgain', label: 'Кнопка «ещё»' }, { k: 'errorText', label: 'Текст ошибки', t: 'textarea' },
      { group: 'Каналы связи' },
      { k: 'channelsTitle', label: 'Заголовок колонки' },
      { k: 'channels', label: 'Каналы', t: 'list', make: () => ({ id: uid('ch'), label: '[Канал]', value: '[значение]', url: '' }), of: [{ k: 'label', label: 'Название', half: true }, { k: 'value', label: 'Что показать', half: true }, { k: 'url', label: 'Ссылка (пусто - без ссылки)', t: 'url' }] },
      { k: 'asideNote', label: 'Подпись под каналами' },
      { group: 'Согласие у формы (152-ФЗ)' },
      { k: 'consentText', label: 'Подпись у галочки: {consent:слово} - ссылка на согласие, {privacy:слово} - на политику', t: 'textarea' },
      { k: 'consentError', label: 'Ошибка без галочки' },
    ],
  },
  legal: {
    title: 'Документы: политика и согласие',
    fields: [
      { note: 'Реквизиты подставляются в тексты вместо {operatorName}, {operatorStatus}, {operatorAddress}, {operatorEmail}, {retentionMonths}, {policyVersion}, {consentVersion}, {effectiveDate}, {site}. {policyLink} и {consentLink} - ссылки на документы. Версии и дата меняются сами при сохранении, если изменился текст или реквизиты.' },
      { group: 'Оператор' },
      { k: 'operatorName', label: 'ФИО полностью' }, { k: 'operatorStatus', label: 'Статус и ИНН' },
      { k: 'operatorAddress', label: 'Адрес для обращений' }, { k: 'operatorEmail', label: 'Email для запросов по персональным данным' },
      { k: 'retentionMonths', label: 'Срок хранения заявок, месяцев (1-120)', t: 'number' },
      { k: 'policyVersion', label: 'Версия политики', t: 'info', half: true }, { k: 'consentVersion', label: 'Версия согласия', t: 'info', half: true },
      { k: 'effectiveDate', label: 'Действует с', t: 'info' },
      { group: 'Политика обработки персональных данных (/privacy)' },
      { k: 'policyTitle', label: 'Заголовок' },
      { k: 'policy', label: 'Разделы', t: 'list', make: () => ({ title: '[Раздел]', paragraphs: [''] }), of: [{ k: 'title', label: 'Заголовок раздела' }, { k: 'paragraphs', label: 'Абзацы', t: 'strings', area: true }] },
      { group: 'Согласие на обработку персональных данных (/consent)' },
      { k: 'consentTitle', label: 'Заголовок' },
      { k: 'consent', label: 'Абзацы согласия', t: 'strings', area: true },
    ],
  },
  footer: { title: 'Футер', fields: [{ k: 'copyright', label: 'Копирайт' }, { k: 'toTop', label: 'Ссылка наверх' }, { k: 'privacyLabel', label: 'Ссылка на политику', half: true }, { k: 'consentLabel', label: 'Ссылка на согласие', half: true },
    { group: 'Плашка о cookie' }, { k: 'cookieText', label: 'Текст: {privacy:слово} - ссылка на политику (пусто - текст по умолчанию)', t: 'textarea' }, { k: 'cookieAccept', label: 'Кнопка «Принять»', half: true }, { k: 'cookieDecline', label: 'Кнопка «Отклонить»', half: true }] },
};

/* ============ хранилище черновика с отменой ============ */
function useDraft() {
  const [state, setState] = useState({ draft: null, saved: null, version: null });
  const ref = useRef(state); ref.current = state;
  const past = useRef([]); const future = useRef([]); const [, bump] = useState(0);
  const snap = useCallback(() => { const d = ref.current.draft; if (!d) return; if (past.current[past.current.length - 1] !== d) past.current.push(d); if (past.current.length > 150) past.current.shift(); future.current = []; bump((x) => x + 1); }, []);
  const update = useCallback((fn, { snapshot = false } = {}) => { if (snapshot) snap(); setState((s) => ({ ...s, draft: fn(s.draft) })); }, [snap]);
  const undo = useCallback(() => { const prev = past.current.pop(); if (!prev) return; future.current.push(ref.current.draft); setState((s) => ({ ...s, draft: prev })); bump((x) => x + 1); }, []);
  const redo = useCallback(() => { const next = future.current.pop(); if (!next) return; past.current.push(ref.current.draft); setState((s) => ({ ...s, draft: next })); bump((x) => x + 1); }, []);
  const load = useCallback((content, version) => { past.current = []; future.current = []; setState({ draft: content, saved: content, version }); }, []);
  return { ...state, ref, snap, update, undo, redo, load, canUndo: past.current.length > 0, canRedo: future.current.length > 0 };
}

/* ============ редактируемый текст на странице ============ */
function EditText({ ed, p, v, ph }) {
  const ref = useRef(null); const val = v == null ? '' : String(v);
  useLayoutEffect(() => { const el = ref.current; if (el && document.activeElement !== el && el.textContent !== val) el.textContent = val; }, [val]);
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
  const untr = ed.untranslated(p);
  return <span ref={ref} className={cx('aa-ed-text', isPh(val) && 'aa-ed-text--ph', untr && 'aa-ed-text--untr')} contentEditable="plaintext-only" suppressContentEditableWarning spellCheck
    role="textbox" aria-label={ph || 'Текст'} data-ph={ph || 'Пусто'} title={untr ? 'Нет перевода: на английской версии сейчас русский текст' : isPh(val) ? 'Плейсхолдер - замени на настоящий текст' : undefined}
    onClick={stop} onMouseDown={(e) => e.stopPropagation()}
    onFocus={() => ed.snap()}
    onInput={(e) => ed.set(p, e.currentTarget.textContent.replace(/\n+/g, ' '))}
    onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.currentTarget.blur(); } }}
    onKeyUp={(e) => e.stopPropagation()}
    onPaste={(e) => { e.preventDefault(); const t = e.clipboardData.getData('text/plain').replace(/\s+/g, ' '); document.execCommand('insertText', false, noDash(t)); }}
    onBlur={(e) => { const clean = noDash(e.currentTarget.textContent); if (clean !== e.currentTarget.textContent) e.currentTarget.textContent = clean; }} />;
}

/* ============ загрузка медиа ============ */
function useUploader(onDone, accept, purpose) {
  const [prog, setProg] = useState(null); const [phase, setPhase] = useState('upload'); const [err, setErr] = useState(''); const [info, setInfo] = useState('');
  const start = useCallback(async (file) => {
    if (!file) return;
    const kind = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : '';
    if (accept && accept !== 'any' && kind && kind !== accept) { setErr(accept === 'video' ? 'Сюда нужно видео' : 'Сюда нужна картинка'); return; }
    setErr(''); setInfo(''); setProg(0); setPhase('upload');
    try {
      const r = await uploadFile(file, (p, ph) => { setProg(p); setPhase(ph); }, { purpose });
      onDone(r.url);
      // сколько сэкономили: «4.1 МБ → 380 КБ»
      if (r.converted && r.before && r.after && r.after < r.before * 0.97) { setInfo(`${fmtSize(r.before)} → ${fmtSize(r.after)}`); setTimeout(() => setInfo(''), 6000); }
      else if (r.note) setErr(r.note);
    } catch (e) { setErr(e.message); } finally { setProg(null); }
  }, [onDone, accept, purpose]);
  return { prog, phase, err, info, start, setErr };
}
function FilePick({ accept, onFile, children, className }) {
  const inp = useRef(null);
  return <Fragment>
    <button type="button" className={className} onClick={(e) => { e.preventDefault(); e.stopPropagation(); inp.current && inp.current.click(); }}>{children}</button>
    <input ref={inp} type="file" hidden accept={accept === 'video' ? 'video/mp4,video/webm,video/quicktime' : accept === 'image' ? 'image/jpeg,image/png,image/webp,image/avif,image/gif' : 'image/*,video/*'} onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; onFile(f); }} />
  </Fragment>;
}

/* Слот медиа прямо на странице: пустой - ярко подсвечен, заполненный - рамка и метка */
function Slot({ ed, p, v, accept = 'image', label, compact, link }) {
  const onDone = useCallback((url) => ed.set(p, url, { snapshot: true }), [p]);
  const up = useUploader(onDone, accept, purposeOf(p)); const [drag, setDrag] = useState(false);
  const filled = !!v;
  const drop = (e) => { e.preventDefault(); e.stopPropagation(); setDrag(false); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) up.start(f); };
  const dragOn = (e) => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) { e.preventDefault(); e.stopPropagation(); setDrag(true); } };
  const clear = (e) => { e.preventDefault(); e.stopPropagation(); ed.set(p, '', { snapshot: true }); };
  const askLink = (e) => { e.preventDefault(); e.stopPropagation(); const u = prompt('Ссылка (YouTube или прямая на файл):', v || ''); if (u != null) ed.set(p, u.trim(), { snapshot: true }); };
  const busy = up.prog != null;
  const icon = accept === 'video' ? '▶' : '◼';
  const pick = <FilePick accept={accept} onFile={up.start} className="aa-ed-slot__btn">{filled ? 'Заменить' : compact ? '+ Файл' : 'Выбрать файл'}</FilePick>;
  if (compact) {
    return <div className={cx('aa-ed-slot aa-ed-slot--compact', filled && 'is-filled', drag && 'is-drag')}
      onDragOver={dragOn} onDragEnter={dragOn} onDragLeave={() => setDrag(false)} onDrop={drop} onClick={(e) => e.stopPropagation()} title={label}>
      <span className="aa-ed-slot__ic" aria-hidden="true">{icon}</span>
      <span className="aa-ed-slot__lbl">{busy ? upText(up) : up.err ? up.err : up.info ? up.info : filled ? label + ' ✓' : label}</span>
      {!busy && <span className="aa-ed-slot__acts">{pick}{link && <button type="button" className="aa-ed-slot__btn" onClick={askLink}>Ссылка</button>}{filled && <button type="button" className="aa-ed-slot__btn" onClick={clear} aria-label="Убрать">✕</button>}</span>}
      {busy && <i className="aa-ed-slot__bar" style={{ transform: `scaleX(${up.prog})` }}></i>}
    </div>;
  }
  return <div className={cx('aa-ed-slot', filled && 'is-filled', drag && 'is-drag', busy && 'is-busy')} tabIndex={0} aria-label={label + (filled ? ': есть файл' : ': пусто')}
    onDragOver={dragOn} onDragEnter={dragOn} onDragLeave={() => setDrag(false)} onDrop={drop} onClick={(e) => e.stopPropagation()}>
    {!filled && <span className="aa-ed-slot__glow" aria-hidden="true"></span>}
    <span className="aa-ed-slot__tag">{icon} {filled ? 'Медиа' : 'Сюда медиа'}</span>
    <div className="aa-ed-slot__body">
      {busy ? <Fragment><span className="aa-ed-slot__lbl">{upText(up)}</span><span className="aa-ed-slot__track"><i className="aa-ed-slot__bar" style={{ transform: `scaleX(${up.prog})` }}></i></span></Fragment>
        : <Fragment>
          <span className="aa-ed-slot__lbl">{label}</span>
          {!filled && <span className="aa-ed-slot__hint">Перетащи файл сюда или</span>}
          <span className="aa-ed-slot__acts">{pick}{link && <button type="button" className="aa-ed-slot__btn" onClick={askLink}>Ссылка</button>}{filled && <button type="button" className="aa-ed-slot__btn" onClick={clear}>Убрать</button>}</span>
          {up.err && <span className="aa-ed-slot__err" role="alert">{up.err}</span>}
        </Fragment>}
    </div>
  </div>;
}

/* Панель инструментов элемента списка */
function Tools({ ed, list, id, index, kind, axis }) {
  const key = id != null ? '@' + id : String(index);
  const item = getIn(ed.draft(), list + '.' + key);
  if (item === undefined) return null;
  const draftWork = kind === 'work' && item.published === false;
  const stop = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); fn(); };
  const name = typeof item === 'string' ? item.slice(0, 40) : (item.title || item.client || item.label || 'элемент');
  const en = ed.lang() === 'en';
  if (en && !(KINDS[kind] && KINDS[kind].fields)) return null;
  return <div className={cx('aa-ed-tools', draftWork && 'aa-ed-tools--pinned')} onClick={(e) => e.stopPropagation()}>
    {kind === 'work' && !en && <button type="button" className={cx('aa-ed-tool aa-ed-tool--wide', draftWork && 'is-off')} onClick={stop(() => ed.set(list + '.' + key + '.published', draftWork, { snapshot: true }))} title="Показывать на сайте">{draftWork ? 'Черновик' : 'На сайте'}</button>}
    {KINDS[kind] && KINDS[kind].fields && <button type="button" className="aa-ed-tool" onClick={stop(() => ed.openItem(list, key, kind))} title="Все поля" aria-label="Все поля">⚙</button>}
    {!en && <Fragment><button type="button" className="aa-ed-tool" onClick={stop(() => ed.move(list, key, -1, kind))} title="Раньше" aria-label="Переместить раньше">{axis === 'x' ? '←' : '↑'}</button>
    <button type="button" className="aa-ed-tool" onClick={stop(() => ed.move(list, key, 1, kind))} title="Позже" aria-label="Переместить позже">{axis === 'x' ? '→' : '↓'}</button>
    <button type="button" className="aa-ed-tool" onClick={stop(() => { if (confirm(`Удалить «${name}»?`)) ed.remove(list, key); })} title="Удалить" aria-label="Удалить">✕</button></Fragment>}
  </div>;
}

/* ============ поля панели ============ */
function MediaField({ value, onChange, accept, link, onFocus, openLibrary, purpose }) {
  const up = useUploader(onChange, accept, purpose); const [drag, setDrag] = useState(false);
  const vid = accept === 'video' || isVideoUrl(value);
  const yt = AA.youtubeId && AA.youtubeId(value);
  return <div className={cx('aa-ed-media', drag && 'is-drag')} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) up.start(f); }}>
    <div className="aa-ed-media__pv">
      {!value ? <span className="aa-ed-media__empty">{accept === 'video' ? '▶ пусто' : '◼ пусто'}</span>
        : yt ? <img src={`https://i.ytimg.com/vi/${yt}/mqdefault.jpg`} alt="" />
          : vid ? <video src={value} muted playsInline preload="metadata"></video> : <img src={value} alt="" />}
    </div>
    <div className="aa-ed-media__side">
      <div className="aa-ed-media__acts">
        <FilePick accept={accept} onFile={up.start} className="aa-ed-btn aa-ed-btn--sm">{value ? 'Заменить' : 'Загрузить'}</FilePick>
        <button type="button" className="aa-ed-btn aa-ed-btn--sm" onClick={() => openLibrary(accept, onChange)}>Из загруженных</button>
        {value && <button type="button" className="aa-ed-btn aa-ed-btn--sm" onClick={() => onChange('')}>Убрать</button>}
      </div>
      {up.prog != null && <Fragment><span className="aa-ed-note aa-ed-note--tight">{upText(up)}</span><span className="aa-ed-slot__track"><i className="aa-ed-slot__bar" style={{ transform: `scaleX(${up.prog})` }}></i></span></Fragment>}
      {up.info && <span className="aa-ed-note aa-ed-note--tight">Сжато: {up.info}</span>}
      {up.err && <span className="aa-ed-field__err">{up.err}</span>}
      <input className="aa-ed-input aa-ed-input--sm" value={value || ''} placeholder={link ? 'https://youtu.be/… или /uploads/…' : '/uploads/… или https://…'} onFocus={onFocus} onChange={(e) => onChange(e.target.value.trim())} />
    </div>
  </div>;
}

// что переводится: тексты, абзацы, медиа (например, логотип с латиницей); выборы, числа, галочки, ссылки и коды - общие
const trField = (f) => !f.slug && (!f.t || f.t === 'text' || f.t === 'textarea' || f.t === 'strings' || f.t === 'list' || f.t === 'media');
const rowKey = (item, i) => (item && typeof item === 'object' && item.id != null ? '@' + item.id : String(i));
function Field({ f, bp, d, td, content, ed, depth = 0 }) {
  const en = ed.lang() === 'en';
  if (f.group) return <h4 className="aa-ed-group aa-label">{f.group}</h4>;
  if (f.note && !f.k) return en ? null : <p className="aa-ed-note">{f.note}</p>;
  if (f.when && !f.when(d || {})) return null;
  if (en && !trField(f)) return null;
  const path = bp ? bp + '.' + f.k : f.k;
  const v = getIn(d, f.k);
  const tv = en ? getIn(td, f.k) : undefined; // перевод (может не быть)
  const val = en ? tv : v;
  const set = (x) => ed.set(path, x);
  const onFocus = () => ed.snap();
  const t = f.t || 'text';
  const id = 'f-' + path.replace(/[^A-Za-z0-9]/g, '_');
  const phRu = en && typeof v === 'string' ? v : ''; // в режиме EN подсказка в поле - русский текст
  let ctl;
  if (t === 'text' || t === 'url') ctl = <input id={id} className="aa-ed-input" value={val == null ? '' : val} onFocus={onFocus} onChange={(e) => set(f.slug ? e.target.value.replace(/[^A-Za-z0-9_-]/g, '') : e.target.value)} type={t === 'url' ? 'url' : 'text'} placeholder={phRu || (t === 'url' ? 'https://' : '')} />;
  else if (t === 'textarea') ctl = <textarea id={id} className="aa-ed-input" rows={3} value={val || ''} onFocus={onFocus} onChange={(e) => set(e.target.value)} placeholder={phRu} />;
  else if (t === 'number') ctl = <input id={id} className="aa-ed-input" type="number" value={v == null ? '' : v} onFocus={onFocus} onChange={(e) => ed.set(path, e.target.value === '' ? (f.nullable ? null : 0) : Number(e.target.value), { base: true })} />;
  else if (t === 'info') return <div className="aa-ed-field"><span className="aa-ed-field__l aa-label">{f.label}</span><p className="aa-ed-info">{v == null || v === '' ? '-' : String(v)}</p></div>;
  else if (t === 'bool') return <label className="aa-ed-check"><input type="checkbox" checked={!!v} onChange={(e) => ed.set(path, e.target.checked, { snapshot: true })} /><span>{f.label}{f.hint && <small>{f.hint}</small>}</span></label>;
  else if (t === 'select') { const opts = typeof f.options === 'function' ? f.options(content) : f.options; ctl = <select id={id} className="aa-ed-input" value={v == null ? '' : v} onChange={(e) => ed.set(path, e.target.value, { snapshot: true, base: true })}>{opts.map(([val2, lab]) => <option key={val2} value={val2}>{lab}</option>)}{v && !opts.some((o) => o[0] === v) && <option value={v}>{v}</option>}</select>; }
  else if (t === 'media') ctl = <Fragment>
    <MediaField value={val} accept={typeof f.accept === 'function' ? f.accept(d) : f.accept} link={f.link} onFocus={onFocus} onChange={(x) => ed.set(path, x, { snapshot: true })} openLibrary={ed.openLibrary} purpose={purposeOf(path)} />
    {en && !hasText(tv) && v && <p className="aa-ed-note aa-ed-note--tight">Пусто - как в русской версии.</p>}
  </Fragment>;
  else if (t === 'strings' || t === 'list') {
    const arr = Array.isArray(v) ? v : [];
    const tarr = Array.isArray(tv) ? tv : [];
    const strings = t === 'strings';
    const mv = (i, dir) => { const j = i + dir; if (j < 0 || j >= arr.length) return; const c = arr.slice(); [c[i], c[j]] = [c[j], c[i]]; ed.set(path, c, { snapshot: true }); };
    const rm = (i) => ed.set(path, arr.filter((_, k) => k !== i), { snapshot: true });
    const add = () => ed.set(path, [...arr, strings ? '' : (f.make ? f.make(content) : {})], { snapshot: true });
    const trRow = (item, i) => (item && typeof item === 'object' && item.id != null ? tarr.find((x) => x && x.id === item.id) : tarr[i]);
    const shape = !en && !f.fixed; // в EN список не перестраивается: состав и порядок - общие, правятся в русской версии
    return <fieldset className={cx('aa-ed-list', depth && 'aa-ed-list--nested')}>
      <legend className="aa-ed-field__l aa-label">{f.label}</legend>
      {f.note && !en && <p className="aa-ed-note">{f.note}</p>}
      {arr.map((item, i) => <div key={(item && item.id) || i} className={cx('aa-ed-list__row', !strings && 'aa-ed-list__row--obj')}>
        <div className="aa-ed-list__body">
          {strings ? (() => {
            const sv = en ? (tarr[i] || '') : (item || ''); const ph = en ? item || '' : undefined;
            const ch = (e) => ed.set(path + '.' + i, e.target.value);
            return f.area ? <textarea className="aa-ed-input" rows={3} value={sv} placeholder={ph} onFocus={onFocus} onChange={ch} /> : <input className="aa-ed-input" value={sv} placeholder={ph} onFocus={onFocus} onChange={ch} aria-label={f.label + ' ' + (i + 1)} />;
          })()
            : <div className="aa-ed-grid">{f.of.map((sf, k) => <div key={k} className={cx('aa-ed-cell', sf.half && 'aa-ed-cell--half')}><Field f={sf} bp={path + '.' + rowKey(item, i)} d={item} td={en ? trRow(item, i) : undefined} content={content} ed={ed} depth={depth + 1} /></div>)}</div>}
        </div>
        {shape && <div className="aa-ed-list__acts">
          <button type="button" className="aa-ed-tool" onClick={() => mv(i, -1)} aria-label="Выше" disabled={i === 0}>↑</button>
          <button type="button" className="aa-ed-tool" onClick={() => mv(i, 1)} aria-label="Ниже" disabled={i === arr.length - 1}>↓</button>
          <button type="button" className="aa-ed-tool" onClick={() => rm(i)} aria-label="Удалить">✕</button>
        </div>}
      </div>)}
      {shape && !(f.max && arr.length >= f.max) && <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={add}>+ Добавить</button>}
    </fieldset>;
  }
  return <div className="aa-ed-field">
    <label className="aa-ed-field__l aa-label" htmlFor={id}>{f.label}</label>
    {ctl}
    {isPh(val) && <span className="aa-ed-field__ph">плейсхолдер</span>}
    {en && (t === 'text' || t === 'textarea') && !hasText(tv) && hasText(v) && <span className="aa-ed-field__ph aa-ed-field__ph--tr">нет перевода</span>}
  </div>;
}

function FormPanel({ spec, ed, content }) {
  const d = spec.p ? getIn(content, spec.p) : content;
  if (d === undefined) return <p className="aa-ed-note">Элемент удалён.</p>;
  const en = ed.lang() === 'en';
  const td = en ? (spec.p ? getTr(content.en, content, segs(spec.p)) : content.en) : undefined;
  return <Fragment>
    {en && <p className="aa-ed-note aa-ed-note--en">Английская версия. Здесь только тексты и медиа: пустое поле - на сайте будет русский текст (он виден серым внутри поля). Состав списков, порядок, ссылки и настройки - общие, правятся в режиме RU.</p>}
    <div className="aa-ed-grid">{spec.fields.map((f, i) => <div key={i} className={cx('aa-ed-cell', f.half && 'aa-ed-cell--half', f.group && 'aa-ed-cell--full')}><Field f={f} bp={spec.p} d={d} td={td} content={content} ed={ed} /></div>)}</div>
  </Fragment>;
}

/* ============ заявки ============ */
function contactHref(c) {
  c = String(c || '').trim();
  if (/^@/.test(c)) return 'https://t.me/' + c.slice(1);
  if (/t\.me\//i.test(c)) return /^https?:/.test(c) ? c : 'https://' + c;
  if (c.includes('@')) return 'mailto:' + c;
  return null;
}
const STATUS = { new: 'Новая', read: 'Прочитана', done: 'В работе / закрыта', spam: 'Спам' };
/* контакт для поиска: без @, t.me/, регистра и пробелов */
const normContact = (c) => String(c || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^t\.me\//, '').replace(/^@/, '').replace(/\/$/, '');
const consentLine = (l) => l.consentGiven
  ? `Согласие дано ${fmtDate(l.consentAt)} · согласие v${l.consentVersion || '?'} · политика v${l.policyVersion || '?'}`
  : 'Согласие не зафиксировано (заявка до формы с согласием)';
function leadAsText(l) {
  return [`Заявка от ${fmtDate(l.createdAt)} (UTC ${l.createdAt})`, `Имя: ${l.name}`, `Контакт: ${l.contact}`, `Сообщение: ${l.message}`,
    l.ip ? `IP-адрес: ${l.ip}` : null, consentLine(l) + (l.consentAt ? ` (UTC ${l.consentAt})` : '')].filter(Boolean).join('\n');
}
function LeadCard({ l, patch, del }) {
  const [ask, setAsk] = useState(false); const [busy, setBusy] = useState(false);
  const href = contactHref(l.contact);
  return <article className={cx('aa-ed-lead', l.status === 'new' && 'is-new')}>
    <header className="aa-ed-lead__h aa-micro"><span>{l.status === 'new' && <span className="aa-rec__dot" aria-hidden="true"></span>}{fmtDate(l.createdAt)}</span><span>{STATUS[l.status] || l.status}</span></header>
    <h4 className="aa-ed-lead__n">{l.name}</h4>
    <p className="aa-ed-lead__c">{href ? <a href={href} target="_blank" rel="noopener">{l.contact} ↗</a> : l.contact}</p>
    <p className="aa-ed-lead__m">{l.message}</p>
    <p className={cx('aa-ed-lead__consent aa-micro', !l.consentGiven && 'is-missing')}>{consentLine(l)}</p>
    {ask ? <div className="aa-ed-confirm" role="alertdialog" aria-label="Подтверждение удаления">
      <p>Удалить заявку от «{l.name}» навсегда? Восстановить её будет нельзя.</p>
      <div className="aa-ed-lead__acts">
        <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--danger" disabled={busy} autoFocus onClick={async () => { setBusy(true); await del(l); }}>Да, удалить навсегда</button>
        <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={() => setAsk(false)}>Отмена</button>
      </div>
    </div> : <div className="aa-ed-lead__acts">
      {l.status === 'new' && <button type="button" className="aa-ed-btn aa-ed-btn--sm" onClick={() => patch(l, 'read')}>Прочитано</button>}
      {l.status !== 'done' && <button type="button" className="aa-ed-btn aa-ed-btn--sm" onClick={() => patch(l, 'done')}>Закрыть</button>}
      {l.status !== 'spam' ? <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={() => patch(l, 'spam')}>Спам</button>
        : <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={() => patch(l, 'read')}>Не спам</button>}
      {(l.status === 'done' || l.status === 'spam') && <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={() => patch(l, 'new')}>Вернуть</button>}
      <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={() => setAsk(true)}>Удалить навсегда</button>
    </div>}
  </article>;
}
function LeadsPanel({ onCount }) {
  const [items, setItems] = useState(null); const [tab, setTab] = useState('active'); const [err, setErr] = useState('');
  const [q, setQ] = useState(''); const [found, setFound] = useState(null); const [copied, setCopied] = useState(false);
  const load = useCallback(() => call('GET', '/leads').then((r) => { setItems(r.items); onCount(r.items.filter((l) => l.status === 'new').length); }).catch((e) => setErr(e.message)), [onCount]);
  useEffect(() => { load(); }, [load]);
  const patch = async (l, status) => { await call('PATCH', '/leads/' + l.id, { status }); load(); };
  const del = async (l) => { await call('DELETE', '/leads/' + l.id); setFound((f) => (f ? f.filter((x) => x.id !== l.id) : f)); load(); };
  if (err) return <p className="aa-ed-field__err">{err}</p>;
  if (!items) return <p className="aa-ed-note">Загрузка…</p>;
  const search = (e) => { e.preventDefault(); const k = normContact(q); setCopied(false); setFound(k ? items.filter((l) => normContact(l.contact) === k) : null); };
  const exportText = found && found.length ? `Данные по контакту ${q.trim()} на ${fmtDate(new Date().toISOString())}\nЗаявок: ${found.length}\n\n` + found.map(leadAsText).join('\n\n') : '';
  const shown = items.filter((l) => (tab === 'active' ? l.status === 'new' || l.status === 'read' : tab === 'done' ? l.status === 'done' : tab === 'spam' ? l.status === 'spam' : true));
  const n = (f) => items.filter(f).length;
  return <div>
    <form className="aa-ed-export" onSubmit={search}>
      <label className="aa-ed-field__l aa-label" htmlFor="aa-ed-q">Выгрузить данные по контакту</label>
      <div className="aa-ed-export__row">
        <input id="aa-ed-q" className="aa-ed-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="@username или email" />
        <button type="submit" className="aa-ed-btn aa-ed-btn--sm">Найти</button>
      </div>
      <p className="aa-ed-note">Для запроса «какие мои данные вы храните»: находит все заявки с этим Telegram или email.</p>
    </form>
    {found && <div className="aa-ed-found">
      <p className="aa-label">Найдено: {found.length}</p>
      {found.length > 0 && <Fragment>
        <textarea className="aa-ed-input aa-ed-found__text" readOnly rows={8} value={exportText} aria-label="Данные для ответа" />
        <div className="aa-ed-lead__acts">
          <button type="button" className="aa-ed-btn aa-ed-btn--sm" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(exportText).then(() => setCopied(true)); }}>{copied ? 'Скопировано' : 'Скопировать текст'}</button>
          <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={() => setFound(null)}>Скрыть</button>
        </div>
        {found.map((l) => <LeadCard key={l.id} l={l} patch={patch} del={del} />)}
      </Fragment>}
    </div>}
    <div className="aa-ed-tabs" role="tablist">
      {[['active', 'Входящие', n((l) => l.status === 'new' || l.status === 'read')], ['done', 'Закрытые', n((l) => l.status === 'done')], ['spam', 'Спам', n((l) => l.status === 'spam')], ['all', 'Все', items.length]].map(([k, lab, c]) =>
        <button key={k} type="button" role="tab" aria-selected={tab === k} className="aa-chip" aria-pressed={tab === k} onClick={() => setTab(k)}>{lab}<span className="aa-chip__n">{c}</span></button>)}
    </div>
    {!shown.length && <p className="aa-ed-note">Пусто. Эфир молчит.</p>}
    {shown.map((l) => <LeadCard key={l.id} l={l} patch={patch} del={del} />)}
  </div>;
}

/* ============ загруженные файлы ============ */
function LibraryPanel({ accept, onPick }) {
  const [items, setItems] = useState(null); const [err, setErr] = useState('');
  const load = useCallback(() => call('GET', '/uploads').then((r) => setItems(r.items)).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const up = useUploader(useCallback(() => load(), [load]), accept || 'any');
  const [ff, setFf] = useState(null); const [bulk, setBulk] = useState(null);
  useEffect(() => { call('GET', '/uploads').then((r) => setFf(r.ffmpeg)).catch(() => {}); call('GET', '/media/convert-all').then((b) => b.status !== 'idle' && setBulk(b)).catch(() => {}); }, []);
  useEffect(() => {
    if (!bulk || bulk.status !== 'converting') return;
    const t = setInterval(() => call('GET', '/media/convert-all').then((b) => { setBulk(b); if (b.status === 'done') load(); }).catch(() => {}), 1500);
    return () => clearInterval(t);
  }, [bulk && bulk.status, load]);
  const convertAll = async () => { try { setBulk(await call('POST', '/media/convert-all')); } catch (e) { alert(e.message); } };
  const del = async (u) => { if (!confirm('Удалить файл ' + u.name + '?')) return; try { await call('DELETE', '/uploads/' + u.name); load(); } catch (e) { alert(e.message); } };
  const shown = (items || []).filter((u) => !accept || accept === 'any' || u.kind === accept);
  return <div>
    {onPick && <p className="aa-ed-note">Выбери файл - он встанет в поле.</p>}
    {!onPick && ff === false && <p className="aa-ed-note">ffmpeg не найден на сервере: файлы сохраняются без сжатия.</p>}
    {!onPick && ff && <div className="aa-ed-bulk">
      <p className="aa-ed-note">Новые фото сжимаются в WebP, видео - в WebM (+ запасной MP4 для старых iPhone) автоматически. Уже загруженные можно сжать разом.</p>
      {bulk && bulk.status === 'converting' ? <Fragment><span className="aa-ed-note aa-ed-note--tight">Сжатие {bulk.done} из {bulk.total}{bulk.current ? ': ' + bulk.current : ''}</span><span className="aa-ed-slot__track"><i className="aa-ed-slot__bar" style={{ transform: `scaleX(${bulk.total ? bulk.done / bulk.total : 1})` }}></i></span></Fragment>
        : <button type="button" className="aa-ed-btn aa-ed-btn--sm" onClick={convertAll}>Сжать все загруженные</button>}
      {bulk && bulk.status === 'done' && <p className="aa-ed-note">Готово: {bulk.total} файл(ов), сэкономлено {fmtSize(bulk.saved)}.{bulk.errors.length ? ' Не удалось: ' + bulk.errors.join('; ') : ''}</p>}
    </div>}
    <div className="aa-ed-lib__top"><FilePick accept={accept || 'any'} onFile={up.start} className="aa-ed-btn aa-ed-btn--sm">+ Загрузить</FilePick>{up.prog != null && <span className="aa-micro">{Math.round(up.prog * 100)}%</span>}{up.err && <span className="aa-ed-field__err">{up.err}</span>}</div>
    {err && <p className="aa-ed-field__err">{err}</p>}
    {items && !shown.length && <p className="aa-ed-note">Загруженных файлов пока нет.</p>}
    <div className="aa-ed-lib">
      {shown.map((u) => <figure key={u.name} className="aa-ed-lib__it">
        <button type="button" className="aa-ed-lib__pv" onClick={() => onPick ? onPick(u.url) : window.open(u.url, '_blank')} title={onPick ? 'Выбрать' : 'Открыть'}>
          {u.kind === 'video' ? <video src={u.url} muted preload="metadata"></video> : <img src={u.url} alt="" loading="lazy" />}
        </button>
        <figcaption className="aa-micro"><span title={u.name}>{u.kind === 'video' ? '▶ ' : ''}{fmtSize(u.size)}{u.used ? ' · на странице' : ''}</span>{!u.used && !onPick && <button type="button" className="aa-ed-tool" onClick={() => del(u)} aria-label="Удалить файл">✕</button>}</figcaption>
      </figure>)}
    </div>
  </div>;
}

/* ============ история версий ============ */
function HistoryPanel({ onRestore }) {
  const [items, setItems] = useState(null);
  useEffect(() => { call('GET', '/history').then((r) => setItems(r.items)).catch(() => setItems([])); }, []);
  const when = (id) => { const m = /^content-(\d{4})-(\d\d)-(\d\d)T(\d\d)-(\d\d)-(\d\d)/.exec(id); return m ? fmtDate(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`) : id; };
  if (!items) return <p className="aa-ed-note">Загрузка…</p>;
  return <div>
    <p className="aa-ed-note">Каждое сохранение откладывает прошлую версию. Загрузка кладёт её в черновик: посмотри и сохрани, если всё верно.</p>
    {!items.length && <p className="aa-ed-note">Версий пока нет.</p>}
    <ul className="aa-ed-hist">{items.map((it) => <li key={it.id}><span>{when(it.id)}</span><button type="button" className="aa-ed-btn aa-ed-btn--sm" onClick={async () => { const r = await call('GET', '/history/' + it.id); onRestore(r.content); }}>В черновик</button></li>)}</ul>
  </div>;
}

/* ============ вход ============ */
function Login({ onOk }) {
  const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { await call('POST', '/login', { password: pw }); onOk(); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  return <div className="aa-page aa-ed-login" data-theme="other">
    <form className="aa-ed-login__box" onSubmit={submit}>
      <AA.Monogram variant="mark" />
      <p className="aa-label aa-ed-login__k"><AA.Rec label="Закрытый канал" /></p>
      <h1 className="aa-display aa-ed-login__t">Пульт</h1>
      <div className="aa-field" data-invalid={err ? 'true' : 'false'}>
        <label className="aa-field__l aa-label" htmlFor="aa-pw"><span>Код доступа</span><span aria-hidden="true">CH-0</span></label>
        <input id="aa-pw" type="password" autoComplete="current-password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={err ? 'true' : 'false'} aria-describedby={err ? 'aa-pw-e' : undefined} />
        {err && <div className="aa-field__err" id="aa-pw-e">{err}</div>}
      </div>
      <AA.Button variant="siren" type="submit" disabled={busy || !pw} arrow="→">{busy ? 'Связь…' : 'Войти'}</AA.Button>
    </form>
  </div>;
}

/* ============ приложение ============ */
function App() {
  const [auth, setAuth] = useState('checking');
  const D = useDraft();
  const [editing, setEditing] = useState(true);
  const [panel, setPanel] = useState(null); // { type: 'section'|'item'|'leads'|'library'|'history', ... }
  const [newLeads, setNewLeads] = useState(0);
  const [status, setStatus] = useState(null); // { text, tone }
  const [saving, setSaving] = useState(false);
  const [more, setMore] = useState(false); // меню «⋯» на пульте
  const [lang, setLang] = useState('ru'); const langRef = useRef('ru'); langRef.current = lang; // язык правки: ru - основа, en - перевод в content.en
  const opener = useRef(null); const panelOpen = useRef(false); const panelRef = useRef(null);
  panelOpen.current = !!panel;
  const remember = () => { if (!panelOpen.current) opener.current = document.activeElement; };
  const openPanel = useCallback((next) => { remember(); setMore(false); setPanel(next); }, []);
  const closePanel = useCallback(() => {
    setPanel(null); const o = opener.current; opener.current = null;
    if (o && o.focus && document.contains(o)) o.focus({ preventScroll: true });
  }, []);
  // при открытии панели фокус уходит в неё
  const hasPanel = !!panel;
  useEffect(() => { if (hasPanel && panelRef.current && !panelRef.current.contains(document.activeElement)) panelRef.current.focus({ preventScroll: true }); }, [hasPanel]);
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (more) { setMore(false); return; }
      if (panelOpen.current) { e.preventDefault(); closePanel(); }
    };
    window.addEventListener('keydown', onEsc); return () => window.removeEventListener('keydown', onEsc);
  }, [more, closePanel]);
  const flash = useCallback((text, tone = 'ok') => { setStatus({ text, tone }); clearTimeout(flash.t); flash.t = setTimeout(() => setStatus(null), 4000); }, []);

  const loadAll = useCallback(async () => {
    try {
      const [c, me] = await Promise.all([call('GET', '/content'), call('GET', '/me')]);
      D.load(c.content, c.version); setNewLeads(me.newLeads); setAuth('in');
    } catch (e) { setAuth(e.status === 401 ? 'out' : 'error'); if (e.status !== 401) flash(e.message, 'err'); }
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { if (auth !== 'in') return; const t = setInterval(() => call('GET', '/me').then((r) => setNewLeads(r.newLeads)).catch((e) => e.status === 401 && setAuth('out')), 60000); return () => clearInterval(t); }, [auth]);

  const dirty = D.draft !== D.saved;
  const save = useCallback(async (force) => {
    const s = D.ref.current; if (!s.draft || s.draft === s.saved) return;
    setSaving(true);
    try {
      const r = await call('PUT', '/content', { content: s.draft, baseVersion: s.version, force: !!force });
      D.load(r.content, r.version); flash('Сохранено. Сайт обновлён.');
    } catch (e) {
      if (e.status === 409 && confirm(e.message + '\n\nСохранить поверх?')) { setSaving(false); return save(true); }
      if (e.status === 401) setAuth('out');
      flash(e.message, 'err');
    } finally { setSaving(false); }
  }, []);

  // горячие клавиши: Ctrl+S, Ctrl+Z / Ctrl+Shift+Z (вне полей ввода)
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey; if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === 's' || k === 'ы') { e.preventDefault(); save(); return; }
      const t = e.target; const inField = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (inField) return;
      if ((k === 'z' || k === 'я') && !e.shiftKey) { e.preventDefault(); D.undo(); }
      else if (((k === 'z' || k === 'я') && e.shiftKey) || k === 'y' || k === 'н') { e.preventDefault(); D.redo(); }
    };
    const onUnload = (e) => { const s = D.ref.current; if (s.draft !== s.saved) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('keydown', onKey); window.addEventListener('beforeunload', onUnload);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('beforeunload', onUnload); };
  }, [save]);

  // объект ed, который видят компоненты лендинга
  const ed = useMemo(() => {
    // в режиме EN строки (тексты и адреса медиа) уходят в перевод content.en; выборы, числа, галочки и опция base - в основу
    const set = (p, v, opts = {}) => {
      const toEn = langRef.current === 'en' && !opts.base && typeof v === 'string';
      D.update((d) => (toEn ? { ...d, en: setTr(d.en, d, segs(p), noDash(v)) } : setIn(d, p, noDash(v))), opts);
    };
    const api = {
      draft: () => D.ref.current.draft,
      lang: () => langRef.current,
      untranslated: (p) => { if (langRef.current !== 'en') return false; const d = D.ref.current.draft; return hasText(getIn(d, p)) && !hasText(getTr(d.en, d, segs(p))); },
      snap: D.snap,
      set,
      move(list, key, dir, kind) {
        D.update((d) => {
          const arr = getIn(d, list); if (!Array.isArray(arr)) return d;
          if (kind === 'work') { // у работ порядок - поле order
            const sorted = arr.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            const i = idxOf(sorted, key), j = i + dir; if (i < 0 || j < 0 || j >= sorted.length) return d;
            [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
            const ord = new Map(sorted.map((w, k) => [w.id, k + 1]));
            return setIn(d, list, arr.map((w) => ({ ...w, order: ord.get(w.id) })));
          }
          const i = idxOf(arr, key), j = i + dir; if (i < 0 || j < 0 || j >= arr.length) return d;
          const c = arr.slice(); [c[i], c[j]] = [c[j], c[i]]; return setIn(d, list, c);
        }, { snapshot: true });
      },
      remove(list, key) {
        D.update((d) => { const arr = getIn(d, list); if (!Array.isArray(arr)) return d; const i = idxOf(arr, key); return i < 0 ? d : setIn(d, list, arr.filter((_, k) => k !== i)); }, { snapshot: true });
        setPanel((pn) => (pn && pn.type === 'item' && pn.p === list + '.' + key ? null : pn));
      },
      addItem(list, kind, extra) {
        const item = KINDS[kind].make(D.ref.current.draft, extra || {});
        D.update((d) => setIn(d, list, [...(getIn(d, list) || []), item]), { snapshot: true });
        if (item && item.id && KINDS[kind].fields) openPanel({ type: 'item', p: list + '.@' + item.id, kind });
      },
      openItem: (list, key, kind) => openPanel({ type: 'item', p: list + '.' + key, kind }),
      openSection: (p, kind) => openPanel({ type: 'section', p, kind }),
      openLibrary: (accept, pick) => { remember(); setPanel((prev) => ({ type: 'library', accept, pick, back: prev })); },
    };
    // фабрики элементов для aa.jsx
    api.text = ({ p, v, ph }) => <EditText ed={api} p={p} v={v} ph={ph} />;
    api.slot = (props) => <Slot ed={api} {...props} />;
    api.tools = (props) => <Tools ed={api} {...props} />;
    api.add = ({ list, kind, label, tag, extra }) => {
      if (langRef.current === 'en') return null; // новые элементы - в русской версии
      const T = tag || 'div';
      return <T className={cx('aa-ed-add', 'aa-ed-add--' + kind)}><button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); api.addItem(list, kind, extra); }}><span aria-hidden="true">+</span> {label}</button></T>;
    };
    api.section = ({ p, kind, label }) => <button type="button" className="aa-ed-section aa-label" onClick={(e) => { e.preventDefault(); e.stopPropagation(); api.openSection(p, kind); }}>✎ {label}</button>;
    return api;
  }, []);

  if (auth === 'checking') return <div className="aa-page aa-ed-login" data-theme="other"><p className="aa-label">Настройка частоты…</p></div>;
  if (auth === 'out') return <Login onOk={loadAll} />;
  if (auth === 'error' || !D.draft) return <div className="aa-page aa-ed-login" data-theme="other"><p className="aa-label">Нет сигнала от сервера. <button type="button" className="aa-ed-btn" onClick={loadAll}>Повторить</button></p></div>;

  const content = D.draft;
  const view = lang === 'en' ? AA.localize(content, 'en') : content; // что видно на странице: в EN - перевод поверх русского
  const logout = async () => { if (dirty && !confirm('Есть несохранённые правки. Выйти?')) return; await call('POST', '/logout').catch(() => {}); D.load(null, null); setAuth('out'); };
  let panelTitle = '', panelBody = null;
  if (panel) {
    if (panel.type === 'section') { const S = SECTIONS[panel.kind] || { title: 'Секция', fields: [] }; panelTitle = S.title + (lang === 'en' ? ' · EN' : ''); panelBody = <FormPanel spec={{ p: panel.p, fields: S.fields }} ed={ed} content={content} />; }
    else if (panel.type === 'item') { const K = KINDS[panel.kind]; const d = getIn(content, panel.p) || {}; panelTitle = K.title ? K.title(d) : 'Элемент'; panelBody = <FormPanel spec={{ p: panel.p, fields: K.fields }} ed={ed} content={content} />; }
    else if (panel.type === 'leads') { panelTitle = 'Заявки'; panelBody = <LeadsPanel onCount={setNewLeads} />; }
    else if (panel.type === 'history') { panelTitle = 'История версий'; panelBody = <HistoryPanel onRestore={(c) => { D.update(() => c, { snapshot: true }); flash('Версия в черновике. Сохрани, чтобы опубликовать.'); }} />; }
    else if (panel.type === 'library') { panelTitle = panel.pick ? 'Выбор файла' : 'Загруженные файлы'; panelBody = <LibraryPanel accept={panel.accept} onPick={panel.pick ? (url) => { panel.pick(url); if (panel.back) setPanel(panel.back); else closePanel(); } : null} />; }
  }

  return <div className={cx('aa-ed-app', editing && 'is-editing', panel && 'has-panel')}>
    {editing ? <AA.EditContext.Provider value={ed}><AA.Landing key={lang} content={view} lang={lang} onSubmitLead={() => Promise.reject(new Error('preview'))} /></AA.EditContext.Provider>
      : <AA.Landing key={lang} content={view} lang={lang} onSubmitLead={() => new Promise((r) => setTimeout(r, 600))} />}

    {panel && <aside className="aa-ed-panel" data-theme="other" aria-label={panelTitle} ref={panelRef} tabIndex={-1}>
      <header className="aa-ed-panel__h">
        {panel.back ? <button type="button" className="aa-ed-tool" onClick={() => setPanel(panel.back)} aria-label="Назад">←</button> : null}
        <h2 className="aa-label">{panelTitle}</h2>
        <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={closePanel} title="Esc">Закрыть ✕</button>
      </header>
      <div className="aa-ed-panel__b">{panelBody}</div>
    </aside>}

    <div className="aa-ed-dockwrap">
    <nav className="aa-ed-dock" data-theme="other" aria-label="Пульт">
      <span className="aa-ed-sec2"><AA.Monogram variant="mark" /></span>
      <div className="aa-ed-seg" role="group" aria-label="Режим">
        <button type="button" aria-pressed={editing} onClick={() => setEditing(true)}>Правка</button>
        <button type="button" aria-pressed={!editing} onClick={() => setEditing(false)}>Как на сайте</button>
      </div>
      <div className="aa-ed-seg aa-ed-seg--lang" role="group" aria-label="Язык правки" title={AA.langOn(content, 'en') ? 'Английская версия включена (/en)' : 'Английская версия выключена: включить - «Страница»'}>
        <button type="button" aria-pressed={lang === 'ru'} onClick={() => setLang('ru')}>RU</button>
        <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN{!AA.langOn(content, 'en') && <span className="aa-ed-off" aria-label="выключена"> ○</span>}</button>
      </div>
      <span className="aa-ed-dock__grp aa-ed-sec">
        <button type="button" className="aa-ed-tool" onClick={D.undo} disabled={!D.canUndo} title="Отменить (Ctrl+Z)" aria-label="Отменить">↶</button>
        <button type="button" className="aa-ed-tool" onClick={D.redo} disabled={!D.canRedo} title="Вернуть (Ctrl+Shift+Z)" aria-label="Вернуть">↷</button>
      </span>
      <span className="aa-ed-dock__grp">
        <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={() => openPanel({ type: 'section', p: '', kind: 'page' })}>Страница</button>
        <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={() => openPanel({ type: 'leads' })}>Заявки{newLeads > 0 && <b className="aa-ed-badge">{newLeads}</b>}</button>
        <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost aa-ed-sec" onClick={() => openPanel({ type: 'section', p: 'legal', kind: 'legal' })}>Документы</button>
        <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost aa-ed-sec" onClick={() => openPanel({ type: 'library' })}>Файлы</button>
        <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost aa-ed-sec" onClick={() => openPanel({ type: 'history' })}>История</button>
      </span>
      <span className={cx('aa-ed-status aa-micro', status && 'is-' + status.tone)} role="status" aria-live="polite" title={status ? status.text : undefined}>{status ? status.text : dirty ? 'Есть несохранённые правки' : 'Всё сохранено'}</span>
      <span className="aa-ed-dock__grp">
        {dirty && <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={() => { if (confirm('Сбросить все несохранённые правки?')) D.load(D.saved, D.version); }}>Сбросить</button>}
        <AA.Button variant="siren" className="aa-ed-save" onClick={() => save()} disabled={!dirty || saving}>{saving ? 'Сохраняю…' : 'Сохранить'}</AA.Button>
        <a className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost aa-ed-sec2" href="/" target="_blank" rel="noopener">Сайт ↗</a>
        <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost aa-ed-sec2" onClick={logout}>Выйти</button>
      </span>
      <span className="aa-ed-more">
        <button type="button" className="aa-ed-tool" aria-haspopup="menu" aria-expanded={more} aria-label="Ещё" onClick={() => setMore(!more)}>⋯</button>
        {more && <span className="aa-ed-more__menu" role="menu" onClick={() => setMore(false)}>
          <button type="button" role="menuitem" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={D.undo} disabled={!D.canUndo}>↶ Отменить</button>
          <button type="button" role="menuitem" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={D.redo} disabled={!D.canRedo}>↷ Вернуть</button>
          <button type="button" role="menuitem" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={() => openPanel({ type: 'section', p: 'legal', kind: 'legal' })}>Документы</button>
          <button type="button" role="menuitem" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={() => openPanel({ type: 'library' })}>Файлы</button>
          <button type="button" role="menuitem" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={() => openPanel({ type: 'history' })}>История</button>
          <a role="menuitem" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" href="/" target="_blank" rel="noopener">Сайт ↗</a>
          <button type="button" role="menuitem" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={logout}>Выйти</button>
        </span>}
      </span>
    </nav>
    </div>
  </div>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
