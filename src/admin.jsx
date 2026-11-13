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
// тот же сдвиг/удаление - в переводе списка, если элементы основы без id (иначе перевод уехал бы на чужую строку)
function withTrList(d, list, fn) {
  const base = getIn(d, list);
  if (!Array.isArray(base) || base.some((x) => x && typeof x === 'object' && x.id != null)) return d;
  const t = getTr(d.en, d, segs(list)); if (!Array.isArray(t)) return d;
  return { ...d, en: setTr(d.en, d, segs(list), fn(t.slice())) };
}
const noDash = (v) => (typeof v === 'string' ? v.replace(/[\u2014\u2013]/g, '-') : v); // правило: только дефис
const uid = (pre) => pre + '-' + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 4);
const isPh = (v) => typeof v === 'string' && /\[[^\]]*\]/.test(v);
const fmtSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' МБ' : Math.max(1, Math.round(b / 1024)) + ' КБ');
const fmtDate = (iso) => { try { return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (_) { return iso; } };
const isVideoUrl = (u) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u || '');

/* ============ схемы: какие поля у секций и элементов ============ */
const TARGETS = [['contact', 'Связь'], ['works', 'Работы'], ['cases', 'Кейсы'], ['services', 'Услуги'], ['about', 'Обо мне'], ['top', 'Наверх']];
const year = () => new Date().getFullYear();
function resourceChoices(content, lang, kind) {
  const translations = lang === 'en' ? content.en?.resources?.[kind] : null;
  return Object.entries(content.resources?.[kind] || {}).map(([id, label]) => [id, translations?.[id]?.trim() || label]);
}
const KINDS = {
  work: {
    title: (d) => 'Работа · ' + (d.title || ''),
    make: (c, extra = {}) => {
      const items = getIn(c, 'works.items') || []; const cats = getIn(c, 'works.categories') || [];
      return { id: uid('w'), title: '[Новая работа]', category: extra.category || (cats[0] && cats[0].id) || 'youtube', format: '16:9', year: year(), previewImage: '', previewVideo: '', videoUrl: '', description: '', order: items.reduce((m, w) => Math.max(m, w.order || 0), 0) + 1, published: false };
    },
    fields: [
      { k: 'published', label: 'Показывать на сайте', t: 'bool', hint: 'Выключено - черновик: виден только здесь' },
      { group: 'Карточка' },
      { k: 'title', label: 'Название' },
      { k: 'category', label: 'Категория', t: 'select', options: (c) => (getIn(c, 'works.categories') || []).map((x) => [x.id, x.label]) },
      { k: 'format', label: 'Формат', t: 'select', options: [['16:9', '16:9 - горизонтальное'], ['9:16', '9:16 - вертикальное']] },
      { k: 'year', label: 'Год', t: 'number' },
      { k: 'description', label: 'Описание', t: 'textarea' },
      { group: 'Медиа' },
      { k: 'previewImage', label: 'Обложка', t: 'media', accept: 'image' },
      { k: 'previewVideo', label: 'Видео-превью: играет у выбранной работы (коротко, без звука)', t: 'media', accept: 'video' },
      { k: 'videoUrl', label: 'Ролик в плеере: ссылка YouTube или файл', t: 'media', accept: 'video', link: true },
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
  resource: {
    title: (d) => 'Ресурс · ' + (d.title || ''),
    make: (c) => ({
      id: uid('res'), title: 'Новый ресурс', type: Object.keys(c.resources?.types || {})[0] || '',
      platforms: [], software: '', source: '', version: '', previewImage: '', description: '', details: '',
      links: [{ id: uid('link'), label: '', url: '' }], published: false,
    }),
    fields: [
      { k: 'published', label: 'Показывать на сайте', t: 'bool', default: true, hint: 'Выключено - карточка остаётся в админке' },
      { k: 'title', label: 'Название' },
      { k: 'previewImage', label: 'Обложка', t: 'media', accept: 'image' },
      { k: 'type', label: 'Тип ресурса', t: 'select', options: (c, lang) => [['', 'Без типа'], ...resourceChoices(c, lang, 'types')] },
      { k: 'platforms', label: 'Платформы', t: 'checks', options: (c, lang) => resourceChoices(c, lang, 'platforms') },
      { k: 'software', label: 'Программа', half: true }, { k: 'version', label: 'Версия', half: true },
      { k: 'source', label: 'Источник' },
      { k: 'description', label: 'Краткое описание', t: 'textarea' },
      { k: 'details', label: 'Подробности', t: 'textarea' },
      { k: 'links', label: 'Ссылки', t: 'list', note: 'Первая заполненная ссылка становится главной кнопкой.',
        make: () => ({ id: uid('link'), label: '', url: '' }),
        of: [{ k: 'label', label: 'Подпись кнопки' }, { k: 'url', label: 'Адрес ссылки', t: 'url' }] },
    ],
  },
  paragraph: { make: () => '[Новый абзац]' },
  metric: { make: () => ({ label: '[Метрика]', before: '0', after: '0' }) },
};
const mediaType = (d) => (d && d.media && d.media.type === 'video' ? 'video' : 'image');
const HOME_SECTIONS = [
  { kind: 'hero', id: 'top', label: 'Первый экран' },
  { kind: 'about', id: 'about', label: 'Обо мне' },
  { kind: 'services', id: 'services', label: 'Услуги' },
  { kind: 'works', id: 'works', label: 'Работы' },
  { kind: 'cases', id: 'cases', label: 'Кейсы' },
  { kind: 'contact', id: 'contact', label: 'Связь' },
  { kind: 'footer', id: 'footer', label: 'Подвал' },
];
const SECTIONS = {
  resources: {
    title: 'Ресурсы',
    fields: [{ k: 'title', label: 'Заголовок' }, { k: 'intro', label: 'Вступление', t: 'textarea' }],
  },
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
  rift: {
    title: 'Переход между мирами',
    fields: [{ k: 'title', label: 'Заголовок по строкам', t: 'strings' }],
  },
  hero: {
    title: 'Первый экран',
    fields: [
      { group: 'Текст' },
      { k: 'role', label: 'Подпись под именем' },
      { k: 'titleLines', label: 'Имя для поиска и показа без логотипа', t: 'strings', max: 3 },
      { group: 'Логотип' },
      { k: 'logo', label: 'Логотип с именем', t: 'media', accept: 'image' },
      { group: 'Фон' },
      { k: 'media.type', label: 'Что на фоне', t: 'select', options: [['image', 'Картинка'], ['video', 'Видео (без звука, по кругу)']] },
      { k: 'media.src', label: 'Файл фона', t: 'media', accept: (d) => (mediaType(d) === 'video' ? 'video' : 'image') },
      { k: 'media.poster', label: 'Кадр до загрузки видео', t: 'media', accept: 'image', when: (d) => mediaType(d) === 'video' },
      { k: 'media.alt', label: 'Описание фоновой картинки', when: (d) => mediaType(d) === 'image' },
      { group: 'Кнопки' },
      { k: 'primaryCta.label', label: 'Главная кнопка', half: true }, { k: 'primaryCta.target', label: 'ведёт в', t: 'select', options: TARGETS, half: true },
      { k: 'secondaryCta.label', label: 'Вторая кнопка', half: true }, { k: 'secondaryCta.target', label: 'ведёт в', t: 'select', options: TARGETS, half: true },
    ],
  },
  about: {
    title: 'Обо мне и цифры',
    fields: [
      { group: 'Текст' }, { k: 'title', label: 'Заголовок' }, { k: 'noteTitle', label: 'Заголовок записки' },
      { k: 'paragraphs', label: 'Абзацы', t: 'strings', area: true },
      { k: 'signature', label: 'Подпись' },
      { group: 'Цифры' }, { k: 'stats', label: 'Счётчики', t: 'list', make: () => ({ id: uid('st'), value: 0, suffix: '', label: '[подпись]', placeholder: true }), of: [
        { k: 'value', label: 'Число', t: 'number', nullable: true, half: true }, { k: 'suffix', label: 'После числа', half: true },
        { k: 'display', label: 'Знак вместо числа (если число пустое)', when: (s) => s.value == null }, { k: 'label', label: 'Подпись' },
        { k: 'placeholder', label: 'Цифра-плейсхолдер (не настоящая)', t: 'bool' }] },
    ],
  },
  services: {
    title: 'Услуги',
    fields: [{ k: 'title', label: 'Заголовок' }, { k: 'intro', label: 'Вступление', t: 'textarea' }],
  },
  works: {
    title: 'Работы и категории',
    fields: [{ k: 'title', label: 'Заголовок' }, { k: 'allLabel', label: 'Вкладка «все»' }, { group: 'Категории' },
      { k: 'categories', label: 'Категории', t: 'list', make: () => ({ id: uid('cat'), label: '[Категория]' }), of: [{ k: 'label', label: 'Название', half: true }, { k: 'id', label: 'Код (латиница)', half: true, slug: true }] }],
  },
  cases: { title: 'Кейсы', fields: [{ k: 'title', label: 'Заголовок' }] },
  contact: {
    title: 'Связь и форма',
    fields: [
      { group: 'Вступление' },
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
  footer: { title: 'Подвал', fields: [{ k: 'copyright', label: 'Копирайт' }, { k: 'toTop', label: 'Ссылка наверх' }, { k: 'privacyLabel', label: 'Ссылка на политику', half: true }, { k: 'consentLabel', label: 'Ссылка на согласие', half: true },
    { group: 'Плашка о cookie' }, { k: 'cookieText', label: 'Текст: {privacy:слово} - ссылка на политику (пусто - текст по умолчанию)', t: 'textarea' }, { k: 'cookieAccept', label: 'Кнопка «Принять»', half: true }, { k: 'cookieDecline', label: 'Кнопка «Отклонить»', half: true }] },
};

/* ============ хранилище черновика с отменой ============ */
function useDraft() {
  const [state, setState] = useState({ draft: null, saved: null, version: null, past: [], future: [] });
  const ref = useRef(state); ref.current = state;
  const editStart = useRef(false);
  const snap = useCallback(() => { editStart.current = true; }, []);
  const update = useCallback((fn, { snapshot = false } = {}) => {
    const start = editStart.current;
    editStart.current = false;
    setState((s) => {
      const draft = fn(s.draft);
      if (draft === s.draft) return s;
      const past = snapshot || start ? [...s.past.slice(-149), s.draft] : s.past;
      return { ...s, draft, past, future: [] };
    });
  }, []);
  const undo = useCallback(() => setState((s) => s.past.length ? {
    ...s, draft: s.past.at(-1), past: s.past.slice(0, -1), future: [...s.future, s.draft],
  } : s), []);
  const redo = useCallback(() => setState((s) => s.future.length ? {
    ...s, draft: s.future.at(-1), past: [...s.past, s.draft], future: s.future.slice(0, -1),
  } : s), []);
  const load = useCallback((content, version) => {
    editStart.current = false;
    setState({ draft: content, saved: content, version, past: [], future: [] });
  }, []);
  const markSaved = useCallback((submitted, content, version) => {
    setState((s) => ({ ...s, draft: s.draft === submitted ? content : s.draft, saved: content, version }));
  }, []);
  return { ...state, ref, snap, update, undo, redo, load, markSaved, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
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
    onKeyDown={(e) => {
      if ((e.ctrlKey || e.metaKey) && ['s', 'ы'].includes(e.key.toLowerCase())) return;
      e.stopPropagation();
      if ((e.key === 'Enter' || e.key === 'Escape') && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.blur(); }
    }}
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
  const lang = ed.lang();
  const onDone = useCallback((url) => ed.set(p, url, { snapshot: true, lang }), [ed, p, lang]);
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
  return <div className={cx('aa-ed-tools', draftWork && 'aa-ed-tools--pinned')} onClick={(e) => e.stopPropagation()}>
    {kind === 'work' && <button type="button" className={cx('aa-ed-tool aa-ed-tool--wide', draftWork && 'is-off')} onClick={stop(() => ed.set(list + '.' + key + '.published', draftWork, { snapshot: true }))} title="Показывать на сайте">{draftWork ? 'Черновик' : 'На сайте'}</button>}
    {KINDS[kind]?.fields && <button type="button" className="aa-ed-tool aa-ed-tool--wide" onClick={stop(() => ed.openItem(list, key, kind))} aria-label={'Править: ' + name}>Править</button>}
    <Fragment><button type="button" className="aa-ed-tool" onClick={stop(() => ed.move(list, key, -1, kind))} title="Раньше" aria-label="Переместить раньше">{axis === 'x' ? '←' : '↑'}</button>
    <button type="button" className="aa-ed-tool" onClick={stop(() => ed.move(list, key, 1, kind))} title="Позже" aria-label="Переместить позже">{axis === 'x' ? '→' : '↓'}</button>
    <button type="button" className="aa-ed-tool" onClick={stop(() => { if (confirm(`Удалить «${name}»?`)) ed.remove(list, key); })} title="Удалить" aria-label="Удалить">✕</button></Fragment>
  </div>;
}

/* ============ поля панели ============ */
function MediaField({ id, value, onChange, accept, link, openLibrary, purpose }) {
  const up = useUploader(onChange, accept, purpose); const [drag, setDrag] = useState(false);
  const vid = accept === 'video' || isVideoUrl(value);
  const yt = AA.youtubeId && AA.youtubeId(value);
  const busy = up.prog != null;
  return <div className={cx('aa-ed-media', drag && 'is-drag')} onDragOver={(e) => { e.preventDefault(); setDrag(!busy); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); if (!busy) up.start(e.dataTransfer.files[0]); }}>
    <div className="aa-ed-media__pv">
      {!value ? <span className="aa-ed-media__empty">{accept === 'video' ? '▶ пусто' : '◼ пусто'}</span>
        : yt ? <img src={`https://i.ytimg.com/vi/${yt}/mqdefault.jpg`} alt="" />
          : vid ? <video src={value} muted playsInline preload="metadata"></video> : <img src={value} alt="" />}
    </div>
    <div className="aa-ed-media__side">
      {!busy && <div className="aa-ed-media__acts">
        <FilePick accept={accept} onFile={up.start} className="aa-ed-btn aa-ed-btn--sm">{value ? 'Заменить' : 'Загрузить'}</FilePick>
        <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={() => openLibrary(accept, onChange)}>Из файлов</button>
        {value && <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={() => onChange('')}>Убрать</button>}
      </div>}
      {busy && <Fragment><span className="aa-ed-note aa-ed-note--tight" role="status">{upText(up)}</span><span className="aa-ed-slot__track"><i className="aa-ed-slot__bar" style={{ transform: `scaleX(${up.prog})` }}></i></span></Fragment>}
      {up.info && <span className="aa-ed-note aa-ed-note--tight">Сжато: {up.info}</span>}
      {up.err && <span className="aa-ed-field__err" role="alert">{up.err}</span>}
      {!busy && <details className="aa-ed-media__url" open={link || undefined}>
        <summary>Адрес файла</summary>
        <input id={id} className="aa-ed-input aa-ed-input--sm" value={value || ''} placeholder={link ? 'https://youtu.be/… или /uploads/…' : '/uploads/… или https://…'} onChange={(e) => onChange(e.target.value.trim())} />
      </details>}
    </div>
  </div>;
}

// что переводится: тексты, абзацы, медиа (например, логотип с латиницей); выборы, числа, галочки, ссылки и коды - общие
const trField = (f) => !f.slug && (!f.t || f.t === 'text' || f.t === 'textarea' || f.t === 'strings' || f.t === 'list' || f.t === 'media');
const rowKey = (item, i) => (item && typeof item === 'object' && item.id != null ? '@' + item.id : String(i));
function Field({ f, bp, d, td, content, ed, depth = 0 }) {
  const en = ed.lang() === 'en';
  if (f.group) return <h4 className="aa-ed-group aa-label">{f.group}</h4>;
  if (f.note && !f.k) return <p className="aa-ed-note">{f.note}</p>;
  if (f.when && !f.when(d || {})) return null;
  const path = bp ? bp + '.' + f.k : f.k;
  const v = getIn(d, f.k);
  const useTr = en && trField(f); // в EN переводимое поле (текст, абзацы, медиа) правит перевод; остальное - общее
  const tv = useTr ? getIn(td, f.k) : undefined; // перевод (может не быть)
  const val = useTr ? tv : v;
  const set = (x) => ed.set(path, x, useTr ? undefined : { base: true });
  const onFocus = () => ed.snap();
  const t = f.t || 'text';
  const id = 'f-' + path.replace(/[^A-Za-z0-9]/g, '_');
  const phRu = useTr && typeof v === 'string' ? v : ''; // в режиме EN подсказка в поле - русский текст
  let ctl;
  if (t === 'text' || t === 'url') ctl = <input id={id} className="aa-ed-input" value={val == null ? '' : val} onFocus={onFocus} onChange={(e) => set(f.slug ? e.target.value.replace(/[^A-Za-z0-9_-]/g, '') : e.target.value)} type={t === 'url' ? 'url' : 'text'} placeholder={phRu || (t === 'url' ? 'https://' : '')} />;
  else if (t === 'textarea') ctl = <textarea id={id} className="aa-ed-input" rows={3} value={val || ''} onFocus={onFocus} onChange={(e) => set(e.target.value)} placeholder={phRu} />;
  else if (t === 'number') ctl = <input id={id} className="aa-ed-input" type="number" value={v == null ? '' : v} onFocus={onFocus} onChange={(e) => ed.set(path, e.target.value === '' ? (f.nullable ? null : 0) : Number(e.target.value), { base: true })} />;
  else if (t === 'info') return <div className="aa-ed-field"><span className="aa-ed-field__l aa-label">{f.label}</span><p className="aa-ed-info">{v == null || v === '' ? '-' : String(v)}</p></div>;
  else if (t === 'bool') return <label className="aa-ed-check"><input type="checkbox" checked={Boolean(v ?? f.default)} onChange={(e) => ed.set(path, e.target.checked, { snapshot: true })} /><span>{f.label}{f.hint && <small>{f.hint}</small>}</span></label>;
  else if (t === 'checks') {
    const checked = Array.isArray(v) ? v : [];
    return <fieldset className="aa-ed-list">
      <legend className="aa-ed-field__l aa-label">{f.label}</legend>
      {f.options(content, ed.lang()).map(([key, label]) => <label key={key} className="aa-ed-check">
        <input type="checkbox" checked={checked.includes(key)} onChange={(e) => ed.set(path,
          e.target.checked ? [...checked, key] : checked.filter((x) => x !== key), { snapshot: true, base: true })} />
        <span>{label}</span>
      </label>)}
    </fieldset>;
  }
  else if (t === 'select') { const opts = typeof f.options === 'function' ? f.options(content, ed.lang()) : f.options; ctl = <select id={id} className="aa-ed-input" value={v == null ? '' : v} onChange={(e) => ed.set(path, e.target.value, { snapshot: true, base: true })}>{opts.map(([val2, lab]) => <option key={val2} value={val2}>{lab}</option>)}{v && !opts.some((o) => o[0] === v) && <option value={v}>{v}</option>}</select>; }
  else if (t === 'media') ctl = <Fragment>
    <MediaField key={en ? 'en' : 'ru'} id={id} value={val} accept={typeof f.accept === 'function' ? f.accept(d) : f.accept} link={f.link} onChange={(x) => ed.set(path, x, { snapshot: true, lang: en ? 'en' : 'ru' })} openLibrary={ed.openLibrary} purpose={purposeOf(path)} />
    {useTr && !hasText(tv) && v && <p className="aa-ed-note aa-ed-note--tight">Пусто - как в русской версии.</p>}
  </Fragment>;
  else if (t === 'strings' || t === 'list') {
    const arr = Array.isArray(v) ? v : [];
    const tarr = Array.isArray(tv) ? tv : [];
    const strings = t === 'strings';
    // состав и порядок списка общие для обоих языков: ed.move/ed.remove двигают и перевод (у списков без id он по номеру)
    const mv = (i, dir) => ed.move(path, rowKey(arr[i], i), dir);
    const rm = (i) => ed.remove(path, rowKey(arr[i], i));
    const add = () => ed.set(path, [...arr, strings ? '' : (f.make ? f.make(content) : {})], { snapshot: true, base: true });
    const trRow = (item, i) => (item && typeof item === 'object' && item.id != null ? tarr.find((x) => x && x.id === item.id) : tarr[i]);
    const shape = !f.fixed;
    return <fieldset className={cx('aa-ed-list', depth && 'aa-ed-list--nested')}>
      <legend className="aa-ed-field__l aa-label">{f.label}</legend>
      {f.note && <p className="aa-ed-note">{f.note}</p>}
      {arr.map((item, i) => <div key={(item && item.id) || i} className={cx('aa-ed-list__row', !strings && 'aa-ed-list__row--obj')}>
        <div className="aa-ed-list__body">
          {strings ? (() => {
            const sv = en ? (tarr[i] || '') : (item || ''); const ph = en ? item || '' : undefined;
            const ch = (e) => ed.set(path + '.' + i, e.target.value);
            const props = { className: 'aa-ed-input', value: sv, placeholder: ph, onFocus, onChange: ch, 'aria-label': f.label + ' ' + (i + 1) };
            return f.area ? <textarea {...props} rows={3} /> : <input {...props} />;
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
    {useTr && (t === 'text' || t === 'textarea') && !hasText(tv) && hasText(v) && <span className="aa-ed-field__ph aa-ed-field__ph--tr">нет перевода</span>}
  </div>;
}

function FormPanel({ spec, ed, content, openGroup, collapsible = false }) {
  const d = spec.p ? getIn(content, spec.p) : content;
  if (d === undefined) return <p className="aa-ed-note">Элемент удалён.</p>;
  const en = ed.lang() === 'en';
  const td = en ? (spec.p ? getTr(content.en, content, segs(spec.p)) : content.en) : undefined;
  const groups = [{ name: '', fields: [] }];
  for (const field of spec.fields) {
    if (collapsible && field.group) groups.push({ name: field.group, fields: [] });
    else groups.at(-1).fields.push(field);
  }
  const grid = (fields) => <div className="aa-ed-grid">{fields.map((f, i) => <div key={i} className={cx('aa-ed-cell', f.half && 'aa-ed-cell--half')}><Field f={f} bp={spec.p} d={d} td={td} content={content} ed={ed} /></div>)}</div>;
  const initialGroup = openGroup || (!groups[0].fields.length && groups[1]?.name);
  return <>
    {en && <p className="aa-ed-note aa-ed-note--en">Пустое поле показывает русский текст. Порядок, категории, числа и переключатели общие для RU и EN.</p>}
    {groups[0].fields.length > 0 && grid(groups[0].fields)}
    {groups.slice(1).map(({ name, fields }) => <details className="aa-ed-form-group" key={name} open={name === initialGroup}>
      <summary>{name}</summary>
      {grid(fields)}
    </details>)}
  </>;
}

const ITEM_SECTIONS = {
  works: { kind: 'work', addLabel: 'Добавить работу' },
  cases: { kind: 'case', addLabel: 'Добавить кейс' },
  services: { kind: 'service', addLabel: 'Добавить услугу' },
  resources: { kind: 'resource', addLabel: 'Добавить ресурс' },
};

function CatalogItems({ section, items = [], ed }) {
  const { kind, addLabel } = ITEM_SECTIONS[section];
  const list = section + '.items';
  const ordered = kind === 'work' ? items.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : items;
  return <section className="aa-ed-item-list" aria-label="Карточки">
    <button type="button" className="aa-ed-btn aa-ed-btn--sm" onClick={() => ed.addItem(list, kind)}>+ {addLabel}</button>
    <ul>
      {ordered.map((item, index) => {
        const key = '@' + item.id;
        const title = item.title || item.client || 'Без названия';
        return <li key={item.id} className="aa-ed-list__row">
          <button type="button" className="aa-ed-btn aa-ed-resource-item" onClick={() => ed.openItem(list, key, kind)}>
            {title}{item.published === false && <small>Черновик</small>}
          </button>
          <div className="aa-ed-list__acts">
            <button type="button" className="aa-ed-tool" onClick={() => ed.move(list, key, -1, kind)} aria-label={'Выше: ' + title} disabled={index === 0}>↑</button>
            <button type="button" className="aa-ed-tool" onClick={() => ed.move(list, key, 1, kind)} aria-label={'Ниже: ' + title} disabled={index === ordered.length - 1}>↓</button>
            <button type="button" className="aa-ed-tool" onClick={() => { if (confirm(`Удалить «${title}»?`)) ed.remove(list, key); }} aria-label={'Удалить: ' + title}>✕</button>
          </div>
        </li>;
      })}
    </ul>
  </section>;
}

const RESOURCE_OPTION_GROUPS = {
  types: { addLabel: 'Добавить тип', placeholder: 'Название типа' },
  platforms: { addLabel: 'Добавить платформу', placeholder: 'Название платформы' },
};

function ResourceFilterEditor({ content, ed, kind, options, renderOption }) {
  const { addLabel, placeholder } = RESOURCE_OPTION_GROUPS[kind];
  const path = 'resources.' + kind;
  const original = getIn(content, path) || {};
  const en = ed.lang() === 'en';
  const [edit, setEdit] = useState(null);
  const input = useRef(null);
  const opener = useRef(null);
  const addButton = useRef(null);
  const activeId = edit?.id;
  useLayoutEffect(() => {
    if (activeId === undefined) return;
    input.current?.focus();
    input.current?.select();
  }, [activeId]);
  const start = (event, id) => {
    opener.current = event.currentTarget;
    const label = id ? (en ? getTr(content.en, content, segs(path + '.' + id)) || '' : original[id]) : '';
    setEdit({ id, label });
  };
  const close = (deleted = false) => {
    setEdit(null);
    const target = deleted ? addButton.current : opener.current;
    requestAnimationFrame(() => target?.focus({ preventScroll: true }));
  };
  const label = edit?.label.trim() || '';
  const canApply = Boolean(label || (en && activeId));
  const apply = () => {
    if (!canApply) return;
    if (activeId) ed.set(path + '.' + activeId, label, { snapshot: true });
    else {
      const id = uid(kind === 'types' ? 'type' : 'platform');
      ed.set(path + '.' + id, label, { base: true, snapshot: true });
    }
    close();
  };
  const used = activeId && (content.resources?.items || []).some((item) => kind === 'types' ? item.type === activeId : item.platforms?.includes(activeId));
  const editor = edit && <div className="aa-ed-filter-edit" onKeyDown={(event) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
  }}>
    <input ref={input} className="aa-ed-input" aria-label={en ? (activeId ? 'Английское название' : 'Название на русском') : placeholder}
      placeholder={en ? (activeId ? original[activeId] : 'Название на русском') : placeholder}
      value={edit.label} onChange={(event) => setEdit({ ...edit, label: event.target.value })}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); apply(); }
      }} />
    <div className="aa-ed-filter-edit__actions">
      <button type="button" className="aa-ed-filter-apply" disabled={!canApply} onClick={apply}>{activeId ? 'Готово' : 'Добавить'}</button>
      <button type="button" onClick={() => close()}>Отмена</button>
      {activeId && <button type="button" disabled={used} aria-label={'Удалить ' + original[activeId]}
        title={used ? 'Сначала убери этот вариант из карточек' : undefined}
        onClick={() => { ed.removeResourceOption(kind, activeId); close(true); }}>Удалить</button>}
    </div>
    {used && <small>Используется в карточках</small>}
  </div>;
  return <div className="aa-ed-resource-filter">
    {Object.entries(options).map(([id, name]) => <div className="aa-ed-resource-filter__row" key={id}>
      <div hidden={activeId === id} className="aa-ed-resource-filter__option">
        {renderOption(id, name)}
        <button type="button" className="aa-ed-filter-rename" aria-label={'Переименовать ' + name} title="Переименовать"
          onClick={(event) => start(event, id)}>✎</button>
      </div>
      {activeId === id && editor}
    </div>)}
    {activeId === null && editor}
    <button ref={addButton} type="button" className="aa-ed-filter-add" hidden={activeId === null} onClick={(event) => start(event, null)}>+ {addLabel}</button>
  </div>;
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
  const [previewPage, setPreviewPage] = useState('home');
  const [panel, setPanel] = useState(null); // { type: 'section'|'item'|'leads'|'library'|'history', ... }
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  const [newLeads, setNewLeads] = useState(0);
  const [status, setStatus] = useState(null); // { text, tone }
  const [saving, setSaving] = useState(false);
  const savePending = useRef(false);
  const scrollTarget = useRef(null);
  const [more, setMore] = useState(false); // меню «⋯» на пульте
  const [lang, setLang] = useState('ru'); const langRef = useRef('ru'); langRef.current = lang; // язык правки: ru - основа, en - перевод в content.en
  const opener = useRef(null); const panelOpen = useRef(false); const panelRef = useRef(null); const panelBodyRef = useRef(null);
  const appRef = useRef(null); const canvasRef = useRef(null); const dockRef = useRef(null); const sectionsRef = useRef(null);
  const moreRef = useRef(null); const moreButton = useRef(null);
  panelOpen.current = !!panel;
  const remember = () => { if (!panelOpen.current) opener.current = document.activeElement; };
  const openPanel = useCallback((next) => {
    remember(); setMore(false); setPanel(next);
  }, []);
  const closePanel = useCallback((restoreFocus = true) => {
    setPanel(null); const o = opener.current; opener.current = null;
    if (restoreFocus) requestAnimationFrame(() => {
      if (!panelOpen.current) (o?.isConnected ? o : sectionsRef.current)?.focus({ preventScroll: true });
    });
  }, []);
  useLayoutEffect(() => {
    if (canvasRef.current) canvasRef.current.inert = narrow && Boolean(panel);
  }, [auth, narrow, panel]);
  useLayoutEffect(() => {
    const target = scrollTarget.current;
    scrollTarget.current = null;
    if (target) {
      const el = document.getElementById(target.id || target);
      if (el && target.id === 'top') window.scrollTo({ top: 0, behavior: 'instant' });
      else el?.scrollIntoView({ block: 'start', behavior: 'instant' });
      if (target.focus) el?.querySelector(target.focus)?.focus({ preventScroll: true });
    }
    if (panelBodyRef.current) panelBodyRef.current.scrollTop = 0;
    if (panelRef.current && !panelRef.current.contains(document.activeElement)) panelRef.current.focus({ preventScroll: true });
  }, [panel, previewPage, editing]);
  useEffect(() => {
    const viewport = window.matchMedia('(max-width: 900px)');
    const onChange = () => setNarrow(viewport.matches);
    viewport.addEventListener('change', onChange);
    return () => viewport.removeEventListener('change', onChange);
  }, []);
  useLayoutEffect(() => {
    if (auth !== 'in' || !dockRef.current) return;
    const dock = dockRef.current;
    const measure = () => appRef.current?.style.setProperty('--editor-dock-height', `${dock.offsetHeight}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(dock);
    return () => observer.disconnect();
  }, [auth]);
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (more) { setMore(false); moreButton.current?.focus(); return; }
      if (panelOpen.current) { e.preventDefault(); closePanel(); }
    };
    const dismissMore = (e) => { if (more && !moreRef.current?.contains(e.target)) setMore(false); };
    window.addEventListener('keydown', onEsc);
    window.addEventListener('pointerdown', dismissMore);
    window.addEventListener('focusin', dismissMore);
    return () => {
      window.removeEventListener('keydown', onEsc);
      window.removeEventListener('pointerdown', dismissMore);
      window.removeEventListener('focusin', dismissMore);
    };
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
  const save = useCallback(async () => {
    const s = D.ref.current;
    if (savePending.current || !s.draft || s.draft === s.saved) return;
    savePending.current = true;
    setSaving(true);
    const publish = (force) => call('PUT', '/content', { content: s.draft, baseVersion: s.version, force });
    try {
      let result;
      try { result = await publish(false); }
      catch (e) {
        if (e.status !== 409) throw e;
        if (!confirm(e.message + '\n\nСохранить поверх?')) return;
        result = await publish(true);
      }
      D.markSaved(s.draft, result.content, result.version);
      flash('Сохранено. Сайт обновлён.');
    } catch (e) {
      if (e.status === 401) setAuth('out');
      flash(e.message, 'err');
    } finally {
      savePending.current = false;
      setSaving(false);
    }
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
      const toEn = (opts.lang || langRef.current) === 'en' && !opts.base && typeof v === 'string';
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
          const c = arr.slice(); [c[i], c[j]] = [c[j], c[i]];
          return setIn(withTrList(d, list, (t) => { while (t.length <= Math.max(i, j)) t.push(null); [t[i], t[j]] = [t[j], t[i]]; return t; }), list, c);
        }, { snapshot: true });
      },
      remove(list, key) {
        D.update((d) => { const arr = getIn(d, list); if (!Array.isArray(arr)) return d; const i = idxOf(arr, key); return i < 0 ? d : setIn(withTrList(d, list, (t) => t.filter((_, k) => k !== i)), list, arr.filter((_, k) => k !== i)); }, { snapshot: true });
        setPanel((pn) => (pn && pn.type === 'item' && pn.p === list + '.' + key ? null : pn));
      },
      removeResourceOption(kind, id) {
        D.update((draft) => {
          const path = 'resources.' + kind;
          const options = getIn(draft, path) || {};
          const inUse = (draft.resources?.items || []).some((item) => kind === 'types' ? item.type === id : item.platforms?.includes(id));
          if (inUse || !Object.hasOwn(options, id)) return draft;
          const next = { ...options };
          const translations = { ...getIn(draft.en, path) };
          delete next[id];
          delete translations[id];
          return setIn(setIn(draft, path, next), 'en.' + path, translations);
        }, { snapshot: true });
      },
      addItem(list, kind, extra) {
        const item = KINDS[kind].make(D.ref.current.draft, extra || {});
        D.update((d) => setIn(d, list, [...(getIn(d, list) || []), item]), { snapshot: true });
        if (item && item.id && KINDS[kind].fields) api.openItem(list, '@' + item.id, kind);
      },
      openItem: (list, key, kind) => {
        const section = list.split('.')[0];
        const back = kind === 'resource' ? { type: 'resources' } : { type: 'section', p: section, kind: section, back: { type: 'sections' } };
        openPanel({ type: 'item', p: list + '.' + key, kind, back });
      },
      openSection: (p, kind, group) => openPanel({ type: 'section', p, kind, group, back: { type: 'sections' } }),
      openLibrary: (accept, pick) => { remember(); setPanel((prev) => ({ type: 'library', accept, pick, back: prev })); },
    };
    // фабрики элементов для aa.jsx
    api.text = ({ p, v, ph }) => <EditText ed={api} p={p} v={v} ph={ph} />;
    api.slot = (props) => <Slot ed={api} {...props} />;
    api.tools = (props) => <Tools ed={api} {...props} />;
    api.add = ({ list, kind, label, tag, extra }) => {
      const T = tag || 'div';
      return <T className={cx('aa-ed-add', 'aa-ed-add--' + kind)}><button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); api.addItem(list, kind, extra); }}><span aria-hidden="true">+</span> {label}</button></T>;
    };
    api.section = ({ p, kind, label, group, className }) => <button type="button" className={cx('aa-ed-section', 'aa-label', className)} aria-label={'Настройки: ' + label} onClick={(e) => { e.stopPropagation(); api.openSection(p, kind, group); }}><span aria-hidden="true">✎</span> {label}</button>;
    return api;
  }, []);

  const selectedItem = panel?.type === 'item' ? panel.p.split('.').at(-1).slice(1) : null;
  const editContext = useMemo(() => ({ ...ed, selectedWork: panel?.kind === 'work' ? selectedItem : null,
    selectedCase: panel?.kind === 'case' ? selectedItem : null }), [ed, panel?.kind, selectedItem]);
  if (auth === 'checking') return <div className="aa-page aa-ed-login" data-theme="other"><p className="aa-label">Настройка частоты…</p></div>;
  if (auth === 'out') return <Login onOk={loadAll} />;
  if (auth === 'error' || !D.draft) return <div className="aa-page aa-ed-login" data-theme="other"><p className="aa-label">Нет сигнала от сервера. <button type="button" className="aa-ed-btn" onClick={loadAll}>Повторить</button></p></div>;

  const content = D.draft;
  const view = lang === 'en' ? AA.localize(content, 'en') : content; // что видно на странице: в EN - перевод поверх русского
  const logout = async () => { if (dirty && !confirm('Есть несохранённые правки. Выйти?')) return; await call('POST', '/logout').catch(() => {}); D.load(null, null); setAuth('out'); };
  const openResources = () => {
    scrollTarget.current = 'top';
    setPreviewPage('resources');
    setEditing(true);
    openPanel({ type: 'resources', back: { type: 'sections' } });
  };
  const goToResourceFilters = () => {
    scrollTarget.current = { id: 'resource-filters', focus: '.aa-ed-filter-rename, .aa-ed-filter-add' };
    closePanel(false);
  };
  const goToSection = ({ kind, id }) => {
    scrollTarget.current = { id, focus: '.aa-ed-section' };
    setPreviewPage('home');
    setEditing(true);
    closePanel(false);
  };
  const openPageSettings = () => openPanel({ type: 'section', p: '', kind: 'page', back: { type: 'sections' } });
  const changeMode = (next) => {
    setEditing(next);
    if (!next) closePanel(false);
  };
  const sections = content.rift?.enabled ? [...HOME_SECTIONS.slice(0, 3), { kind: 'rift', id: 'rift', label: 'Переход' }, ...HOME_SECTIONS.slice(3)] : HOME_SECTIONS;
  let panelTitle = '', panelBody = null, panelContext = '';
  if (panel) {
    if (panel.type === 'sections') {
      panelTitle = 'Разделы сайта';
      panelBody = <nav className="aa-ed-sections" aria-label="Разделы сайта">
        <h3>Главная</h3>
        <ul>{sections.map((section) => <li key={section.kind}>
          <button type="button" className="aa-ed-btn aa-ed-btn--ghost" onClick={() => goToSection(section)}>{section.label}<span aria-hidden="true">↓</span></button>
        </li>)}</ul>
        <h3>Страницы и настройки</h3>
        <button type="button" className="aa-ed-btn aa-ed-btn--ghost" onClick={openResources}>Ресурсы<span aria-hidden="true">→</span></button>
        <button type="button" className="aa-ed-btn aa-ed-btn--ghost" onClick={openPageSettings}>Настройки сайта и меню<span aria-hidden="true">→</span></button>
      </nav>;
    }
    else if (panel.type === 'section') {
      const spec = SECTIONS[panel.kind] || { title: 'Секция', fields: [] };
      panelTitle = spec.title;
      panelContext = sections.some(({ kind }) => kind === panel.kind) ? 'Главная' : '';
      panelBody = <>
        {ITEM_SECTIONS[panel.kind] && <CatalogItems section={panel.kind} items={view[panel.kind]?.items} ed={ed} />}
        <FormPanel spec={{ p: panel.p, fields: spec.fields }} ed={ed} content={content} collapsible openGroup={panel.group} />
      </>;
    }
    else if (panel.type === 'item') {
      const spec = KINDS[panel.kind];
      const d = getIn(view, panel.p) || {};
      panelTitle = spec.title(d);
      panelContext = SECTIONS[panel.p.split('.')[0]]?.title;
      panelBody = <FormPanel spec={{ p: panel.p, fields: spec.fields }} ed={ed} content={content}
        collapsible={panel.kind === 'work'} openGroup={panel.kind === 'work' ? 'Карточка' : undefined} />;
    }
    else if (panel.type === 'resources') {
      panelTitle = SECTIONS.resources.title;
      panelBody = <>
        <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost aa-ed-resource-options-link"
          onClick={goToResourceFilters}>К фильтрам на странице ↓</button>
        <CatalogItems section="resources" items={view.resources?.items} ed={ed} />
        <FormPanel spec={{ p: 'resources', fields: SECTIONS.resources.fields }} ed={ed} content={content} />
      </>;
    }
    else if (panel.type === 'leads') { panelTitle = 'Заявки'; panelBody = <LeadsPanel onCount={setNewLeads} />; }
    else if (panel.type === 'history') { panelTitle = 'История версий'; panelBody = <HistoryPanel onRestore={(c) => { D.update(() => c, { snapshot: true }); flash('Версия в черновике. Сохрани, чтобы опубликовать.'); }} />; }
    else if (panel.type === 'library') { panelTitle = panel.pick ? 'Выбор файла' : 'Загруженные файлы'; panelBody = <LibraryPanel accept={panel.accept} onPick={panel.pick ? (url) => { panel.pick(url); if (panel.back) setPanel(panel.back); else closePanel(); } : null} />; }
  }

  const saveMessage = saving ? 'Сохраняю…' : status?.tone === 'err' ? status.text
    : dirty ? 'Есть правки' : status?.text || 'Всё сохранено';
  const saveState = saving ? 'busy' : status?.tone === 'err' ? 'err' : dirty ? 'dirty' : 'ok';
  const language = <div className="aa-ed-seg aa-ed-seg--lang" role="group" aria-label="Язык правки" title={AA.langOn(content, 'en') ? 'Английская версия включена (/en)' : 'Английская версия выключена на сайте'}>
    <button type="button" aria-pressed={lang === 'ru'} onClick={() => setLang('ru')}>RU</button>
    <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
  </div>;
  return <div ref={appRef} className={cx('aa-ed-app', editing && 'is-editing', panel && 'has-panel')}>
    <div ref={canvasRef} className="aa-ed-canvas">{previewPage === 'resources' ? <AA.ResourcesPage key={lang} content={view} lang={lang} onLanguageChange={setLang} preview
      selectedResource={editing && panel?.kind === 'resource' ? selectedItem : undefined}
      onEditItem={editing ? (id) => ed.openItem('resources.items', '@' + id, 'resource') : undefined}
      renderFilter={editing ? (kind, options, renderOption) => <ResourceFilterEditor content={content} ed={ed} kind={kind} options={options} renderOption={renderOption} /> : undefined}
      onNavigateHome={(id) => {
      scrollTarget.current = id;
      setPreviewPage('home');
      closePanel(false);
    }} />
      : <AA.EditContext.Provider value={editing ? editContext : null}>
          <AA.Landing key={lang} content={view} lang={lang} onLanguageChange={setLang} preview onNavigateResources={() => {
            if (editing) openResources(); else { scrollTarget.current = 'top'; setPreviewPage('resources'); }
          }} onSubmitLead={editing ? () => Promise.reject(new Error('preview')) : () => new Promise((r) => setTimeout(r, 600))} />
        </AA.EditContext.Provider>}</div>

    {panel && <aside id="aa-editor-panel" className="aa-ed-panel" data-theme="other" aria-labelledby="aa-editor-title" ref={panelRef} tabIndex={-1}>
      <header className="aa-ed-panel__h">
        {panel.back ? <button type="button" className="aa-ed-tool" onClick={() => setPanel(panel.back)} aria-label="Назад">←</button> : null}
        <div className="aa-ed-panel__heading">
          {panelContext && <span>{panelContext}</span>}
          <h2 id="aa-editor-title">{panelTitle}</h2>
        </div>
        <button type="button" className="aa-ed-tool" onClick={() => closePanel()} title="Закрыть (Esc)" aria-label="Закрыть панель">✕</button>
      </header>
      <div className="aa-ed-panel__b" ref={panelBodyRef} key={[panel.type, panel.kind, panel.p, panel.group].join(':')}>{panelBody}</div>
    </aside>}

    <div className="aa-ed-dockwrap" ref={dockRef}>
    <nav className="aa-ed-dock" data-theme="other" aria-label="Пульт">
      <button ref={sectionsRef} type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost aa-ed-dock-sections" aria-expanded={panel?.type === 'sections'} aria-controls={panel ? 'aa-editor-panel' : undefined}
        onClick={() => panel?.type === 'sections' ? closePanel() : openPanel({ type: 'sections' })}>Разделы</button>
      <div className="aa-ed-seg aa-ed-dock-mode" role="group" aria-label="Режим">
        <button type="button" aria-pressed={editing} onClick={() => changeMode(true)}>Правка</button>
        <button type="button" aria-pressed={!editing} onClick={() => changeMode(false)}>Как на сайте</button>
      </div>
      <span className="aa-ed-dock-language">{language}</span>
      <span className="aa-ed-dock__grp aa-ed-sec">
        <button type="button" className="aa-ed-tool" onClick={D.undo} disabled={!D.canUndo} title="Отменить (Ctrl+Z)" aria-label="Отменить">↶</button>
        <button type="button" className="aa-ed-tool" onClick={D.redo} disabled={!D.canRedo} title="Вернуть (Ctrl+Shift+Z)" aria-label="Вернуть">↷</button>
      </span>
      <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost aa-ed-dock-leads" onClick={() => openPanel({ type: 'leads' })}>Заявки{newLeads > 0 && <b className="aa-ed-badge">{newLeads}</b>}</button>
      <div className="aa-ed-savebar">
        <span className={cx('aa-ed-status', 'is-' + saveState)} role="status">{saveMessage}</span>
        <AA.Button variant="siren" className="aa-ed-save" onClick={save} disabled={!dirty || saving}>Сохранить</AA.Button>
      </div>
      <span className="aa-ed-more" ref={moreRef}>
        <button ref={moreButton} type="button" className="aa-ed-tool" aria-expanded={more} aria-controls={more ? 'aa-editor-more' : undefined} aria-label="Ещё" onClick={() => setMore(!more)}>⋯</button>
        {more && <span id="aa-editor-more" className="aa-ed-more__menu" onClick={() => { setMore(false); moreButton.current?.focus({ preventScroll: true }); }}>
          <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={D.undo} disabled={!D.canUndo}>↶ Отменить</button>
          <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={D.redo} disabled={!D.canRedo}>↷ Вернуть</button>
          {dirty && <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" disabled={saving} onClick={() => { if (confirm('Сбросить все несохранённые правки?')) D.load(D.saved, D.version); }}>Сбросить правки</button>}
          <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={() => openPanel({ type: 'leads' })}>Заявки{newLeads > 0 ? ' · ' + newLeads : ''}</button>
          <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={() => openPanel({ type: 'section', p: 'legal', kind: 'legal' })}>Документы</button>
          <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={() => openPanel({ type: 'library' })}>Файлы</button>
          <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={() => openPanel({ type: 'history' })}>История</button>
          <a className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" href="/" target="_blank" rel="noopener">Сайт ↗</a>
          <button type="button" className="aa-ed-btn aa-ed-btn--sm aa-ed-btn--ghost" onClick={logout}>Выйти</button>
        </span>}
      </span>
    </nav>
    </div>
  </div>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
