// Хранилище: всё лежит файлами в DATA_DIR (по умолчанию ./data).
//   config.json   - секретный путь админки, хэш пароля, ключ подписи сессий
//   content.json  - контент страницы (тот же объект, что content/content.json)
//   history/      - предыдущие версии контента (последние HISTORY_KEEP)
//   leads.json    - заявки из формы связи
//   uploads/      - загруженные превью, видео и кадры стены
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = path.resolve(ROOT, process.env.DATA_DIR || 'data');
export const UPLOADS = path.join(DATA, 'uploads');
const HISTORY = path.join(DATA, 'history');
const HISTORY_KEEP = 40;

const file = (n) => path.join(DATA, n);
function readJson(p, fallback) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; } }
/* атомарная запись: во временный файл и rename */
function writeJson(p, v) {
  const tmp = p + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(v, null, 2) + '\n');
  fs.renameSync(tmp, p);
}
export function ensureDirs() {
  for (const d of [DATA, UPLOADS, HISTORY]) fs.mkdirSync(d, { recursive: true });
  // медиа по умолчанию (видео и логотип hero из content/uploads/) - на новый сервер, где data/ ещё пустая; существующие файлы не трогаются
  const seed = path.join(ROOT, 'content', 'uploads');
  if (fs.existsSync(seed)) for (const n of fs.readdirSync(seed)) {
    const to = path.join(UPLOADS, n);
    if (!fs.existsSync(to) && fs.statSync(path.join(seed, n)).isFile()) fs.copyFileSync(path.join(seed, n), to);
  }
}

/* ============ конфиг и пароль ============ */
const randomSlug = () => 'kabinet-' + crypto.randomBytes(9).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
export function checkPassword(pw, stored) {
  if (!stored || typeof pw !== 'string') return false;
  const [, salt, hash] = stored.split('$');
  const a = Buffer.from(hash, 'hex'); const b = crypto.scryptSync(pw, salt, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export function normalizeAdminPath(p) {
  p = '/' + String(p || '').trim().replace(/^\/+|\/+$/g, '');
  if (!/^\/[A-Za-z0-9._~-]{8,64}$/.test(p)) throw new Error('Путь админки: 8-64 символа из латиницы, цифр, «-», «_», «.», «~»');
  if (/^\/(api|assets|uploads|data)$/i.test(p)) throw new Error('Этот путь занят сайтом');
  return p;
}

// пароль первого запуска: в лог не пишется, лежит в этом файле (только для владельца) до первой смены пароля
export const PASSWORD_FILE = () => file('admin-password.txt');

/** Загружает конфиг; при первом запуске создаёт путь, пароль (в PASSWORD_FILE) и ключ. Возвращает { config, firstRun: { passwordFile } | null } */
export function loadConfig() {
  ensureDirs();
  const p = file('config.json');
  let cfg = readJson(p, null); let firstRun = null;
  if (!cfg) {
    const password = crypto.randomBytes(12).toString('base64url');
    cfg = { adminPath: '/' + randomSlug(), passwordHash: hashPassword(password), secret: crypto.randomBytes(32).toString('hex'), createdAt: new Date().toISOString() };
    writeJson(p, cfg);
    fs.writeFileSync(PASSWORD_FILE(), password + '\n', { mode: 0o600 });
    firstRun = { passwordFile: PASSWORD_FILE() };
  }
  // переменные окружения сильнее файла
  if (process.env.ADMIN_PATH) cfg.adminPath = normalizeAdminPath(process.env.ADMIN_PATH);
  if (process.env.ADMIN_PASSWORD) { cfg.passwordHash = hashPassword(process.env.ADMIN_PASSWORD); firstRun = null; }
  if (process.env.SESSION_SECRET) cfg.secret = process.env.SESSION_SECRET;
  return { config: cfg, firstRun };
}
export function saveConfig(patch) {
  ensureDirs();
  const p = file('config.json');
  const cfg = { ...readJson(p, {}), ...patch };
  writeJson(p, cfg); return cfg;
}

/* ============ контент ============ */
let contentCache = null;
/* новые разделы из content/content.json (например legal) добираются в живой контент, существующие правки не трогаются */
function fillMissing(c, def) {
  let changed = false;
  for (const [k, v] of Object.entries(def || {})) {
    if (c[k] === undefined) { c[k] = v; changed = true; }
    else if (v && typeof v === 'object' && !Array.isArray(v) && c[k] && typeof c[k] === 'object' && !Array.isArray(c[k])) changed = fillMissing(c[k], v) || changed;
  }
  return changed;
}
export function getContent() {
  if (contentCache) return contentCache;
  const p = file('content.json');
  const def = readJson(path.join(ROOT, 'content', 'content.json'), {});
  let c = readJson(p, null);
  if (!c) { c = def; writeJson(p, c); }
  else if (fillMissing(c, def)) writeJson(p, c);
  contentCache = c; return c;
}

/* версии документов: меняется текст (или реквизиты, которые в него подставляются) - версия +0.1 и новая дата вступления в силу.
   Вручную из админки версии не правятся: берутся с сервера. */
const bump = (v) => { const m = /^(\d+)\.(\d+)$/.exec(String(v || '1.0')); return m ? `${m[1]}.${Number(m[2]) + 1}` : '1.1'; };
export function withLegalVersions(prev = {}, next = {}) {
  const req = (L) => JSON.stringify([L.operatorName, L.operatorStatus, L.operatorAddress, L.operatorEmail, L.retentionMonths]);
  const out = { ...next };
  const months = Math.round(Number(out.retentionMonths)); out.retentionMonths = months >= 1 && months <= 120 ? months : 12;
  const reqChanged = req(prev) !== req(out);
  const policyChanged = reqChanged || JSON.stringify([prev.policy, prev.policyTitle]) !== JSON.stringify([out.policy, out.policyTitle]);
  const consentChanged = reqChanged || JSON.stringify([prev.consent, prev.consentTitle]) !== JSON.stringify([out.consent, out.consentTitle]);
  out.policyVersion = policyChanged ? bump(prev.policyVersion) : (prev.policyVersion || '1.0');
  out.consentVersion = consentChanged ? bump(prev.consentVersion) : (prev.consentVersion || '1.0');
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' }); // ГГГГ-ММ-ДД по Москве
  out.effectiveDate = policyChanged || consentChanged ? today : (prev.effectiveDate || today);
  return out;
}
export function contentVersion(c = getContent()) {
  return crypto.createHash('sha1').update(JSON.stringify(c)).digest('hex').slice(0, 16);
}

const URLISH = /(url|link|src|image|video|poster|href)$/i;
/** Проверка и чистка контента из админки. Бросает Error с понятным текстом. */
export function sanitizeContent(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) throw new Error('Контент должен быть объектом');
  for (const k of ['site', 'hero', 'about', 'services', 'works', 'cases', 'contact', 'footer']) if (!c[k] || typeof c[k] !== 'object') throw new Error(`Нет раздела «${k}»`);
  if (!Array.isArray(c.works.items)) throw new Error('works.items должен быть списком');
  if (!Array.isArray(c.cases.items)) throw new Error('cases.items должен быть списком');
  const size = Buffer.byteLength(JSON.stringify(c));
  if (size > 2 * 1024 * 1024) throw new Error('Контент больше 2 МБ');
  const walk = (v, key) => {
    if (typeof v === 'string') {
      let s = v.replace(/[\u2014\u2013]/g, '-'); // правило проекта: только дефис
      if (URLISH.test(key || '') && /^\s*(javascript|vbscript|data):/i.test(s)) s = '';
      return s;
    }
    if (Array.isArray(v)) return v.map((x) => walk(x, key));
    if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) if (k !== '__proto__' && k !== 'constructor') o[k] = walk(x, k); return o; }
    return v;
  };
  return walk(c, '');
}
export function saveContent(c) {
  const prev = getContent();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  writeJson(path.join(HISTORY, `content-${stamp}.json`), prev);
  const old = fs.readdirSync(HISTORY).filter((n) => n.endsWith('.json')).sort();
  for (const n of old.slice(0, Math.max(0, old.length - HISTORY_KEEP))) fs.rmSync(path.join(HISTORY, n), { force: true });
  c._meta = { ...(c._meta || {}), updatedAt: new Date().toISOString() };
  writeJson(file('content.json'), c);
  contentCache = c; return c;
}
export function listHistory() {
  return fs.readdirSync(HISTORY).filter((n) => /^content-.*\.json$/.test(n)).sort().reverse()
    .map((n) => ({ id: n.replace(/\.json$/, ''), size: fs.statSync(path.join(HISTORY, n)).size }));
}
export function readHistory(id) {
  if (!/^content-[0-9TZ-]+$/.test(id)) return null;
  return readJson(path.join(HISTORY, id + '.json'), null);
}
/* ============ языки (та же логика, что localize в src/aa.jsx) ============
   Русский - основа, английский - перевод поверх (content.en той же формы); пустое поле - русский текст. */
const hasText = (v) => !(v == null || (typeof v === 'string' && v.trim() === ''));
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
export function localize(c, lang) { if (!c || lang !== 'en') return c; const { en, ...base } = c; return { ...overlay(base, en || {}), en }; }
export const langOn = (c, lang) => lang === 'ru' || !!(c && c.i18n && c.i18n[lang] && c.i18n[lang].enabled);

/** Публичная версия: без черновиков работ и служебных полей */
export function publicContent(c = getContent()) {
  const out = { ...c, works: { ...c.works, items: (c.works.items || []).filter((w) => w.published !== false) } };
  return out;
}

/* ============ заявки ============ */
export function getLeads() { return readJson(file('leads.json'), []); }
export function addLead(lead) {
  const all = getLeads(); all.unshift(lead);
  writeJson(file('leads.json'), all.slice(0, 5000)); return lead;
}
export function updateLead(id, patch) {
  const all = getLeads(); const l = all.find((x) => x.id === id); if (!l) return null;
  if (patch.status && ['new', 'read', 'done', 'spam'].includes(patch.status)) l.status = patch.status;
  if (typeof patch.note === 'string') l.note = patch.note.slice(0, 2000);
  writeJson(file('leads.json'), all); return l;
}
/** Удаляет заявки старше months месяцев (по дате заявки). Возвращает, сколько удалено. */
export function pruneLeads(months) {
  const cut = new Date(); cut.setMonth(cut.getMonth() - months);
  const all = getLeads(); const keep = all.filter((l) => new Date(l.createdAt) >= cut);
  if (keep.length !== all.length) writeJson(file('leads.json'), keep);
  return all.length - keep.length;
}
export function deleteLead(id) {
  const all = getLeads(); const next = all.filter((x) => x.id !== id);
  if (next.length === all.length) return false;
  writeJson(file('leads.json'), next); return true;
}

/* ============ загрузки ============ */
export const MEDIA = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/mp4',
};
export const isVideoExt = (ext) => /^(mp4|webm|mov|m4v)$/.test(ext);
export function listUploads() {
  return fs.readdirSync(UPLOADS).filter((n) => MEDIA[path.extname(n).slice(1).toLowerCase()])
    .map((n) => { const st = fs.statSync(path.join(UPLOADS, n)); return { name: n, url: '/uploads/' + n, size: st.size, mtime: st.mtimeMs, kind: isVideoExt(path.extname(n).slice(1).toLowerCase()) ? 'video' : 'image' }; })
    .sort((a, b) => b.mtime - a.mtime);
}
/** Какие загрузки упомянуты в контенте (чтобы не удалить используемое) */
export function usedUploads(c = getContent()) {
  const s = JSON.stringify(c); const used = new Set();
  for (const m of s.matchAll(/\/uploads\/([A-Za-z0-9._-]+)/g)) used.add(m[1]);
  return used;
}
