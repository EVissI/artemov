// Бэкенд сайта Артема Артемова: node server/server.mjs (Node 20+, без зависимостей).
// Публично: сайт из site/, /api/content, /api/leads, /uploads/*.
// Админка: только по секретному пути (data/config.json → adminPath), вход по паролю, сессия в подписанной cookie.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as S from './store.mjs';
import * as M from './media.mjs';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 1024);
const MAX_IMAGE_MB = Number(process.env.MAX_IMAGE_MB || 25);
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const SESSION_DAYS = 14;
const SITE = path.join(S.ROOT, 'site');
const SITE_ADMIN = path.join(S.ROOT, 'site-admin');

const { config, firstRun } = S.loadConfig();
const A = config.adminPath; // секретный префикс админки

/* ============ мелочи ============ */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2', ...Object.fromEntries(Object.entries(S.MEDIA).map(([k, v]) => ['.' + k, v])) };
const baseHeaders = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' };
function send(res, code, body, headers = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
  res.writeHead(code, { ...baseHeaders, 'Content-Length': buf.length, ...(typeof body === 'string' || Buffer.isBuffer(body) ? {} : { 'Content-Type': 'application/json; charset=utf-8' }), ...headers });
  res.end(buf);
}
const json = (res, code, obj, headers = {}) => send(res, code, obj, { 'Cache-Control': 'no-store', ...headers });
const fail = (res, code, error) => json(res, code, { error });
// Заголовкам X-Forwarded-* верим, если включён TRUST_PROXY или запрос пришёл с этой же машины (ngrok, nginx на localhost).
// Иначе за туннелем все посетители выглядят как 127.0.0.1 и делят один лимит попыток входа.
const isLoopback = (a) => a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
const viaProxy = (req) => TRUST_PROXY || isLoopback(req.socket.remoteAddress);
// берём последний адрес цепочки: его дописал ближайший (наш) прокси, первые клиент может подделать
const lastOf = (h) => String(h || '').split(',').map((x) => x.trim()).filter(Boolean).pop() || '';
const clientIp = (req) => (viaProxy(req) && lastOf(req.headers['x-forwarded-for'])) || req.socket.remoteAddress || '?';
const isHttps = (req) => req.socket.encrypted || (viaProxy(req) && lastOf(req.headers['x-forwarded-proto']) === 'https') || process.env.COOKIE_SECURE === '1';
const safeJson = (v) => JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(Object.assign(new Error('Слишком большой запрос'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readJsonBody(req, limit = 3 * 1024 * 1024) {
  const buf = await readBody(req, limit);
  try { return JSON.parse(buf.toString('utf8') || 'null'); } catch { throw Object.assign(new Error('Битый JSON'), { status: 400 }); }
}

/* простое ограничение частоты: ключ → отметки времени */
const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now(); const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now); hits.set(key, arr); return arr.length > max;
}
setInterval(() => { const now = Date.now(); for (const [k, arr] of hits) if (!arr.some((t) => now - t < 3600e3)) hits.delete(k); for (const [k, v] of lockouts) if (v.until < now && now - v.last > LOGIN_WINDOW) lockouts.delete(k); }, 600e3).unref();

/* вход: 5 неудачных попыток за 15 минут с одного IP - блокировка на 15 минут (успешный вход счётчик сбрасывает) */
const LOGIN_MAX_FAILS = 5, LOGIN_WINDOW = 15 * 60e3, LOGIN_LOCK = 15 * 60e3;
const lockouts = new Map(); // ip -> { fails: [времена], until, last }
function loginLockedFor(ip) { const v = lockouts.get(ip); return v && v.until > Date.now() ? v.until - Date.now() : 0; }
function loginFailed(ip) {
  const now = Date.now(); const v = lockouts.get(ip) || { fails: [], until: 0, last: 0 };
  v.fails = v.fails.filter((t) => now - t < LOGIN_WINDOW); v.fails.push(now); v.last = now;
  if (v.fails.length >= LOGIN_MAX_FAILS) { v.until = now + LOGIN_LOCK; v.fails = []; console.warn(`вход: блокировка ${ip} на 15 минут`); }
  lockouts.set(ip, v); return v.until > now;
}

/* ============ статика с Range (видео нужно перематывать) ============ */
function serveFile(req, res, file, { cache = 'public, max-age=300', extraHeaders = {} } = {}) {
  let st; try { st = fs.statSync(file); } catch { return false; }
  if (!st.isFile()) return false;
  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const etag = `"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
  const h = { ...baseHeaders, 'Content-Type': type, 'Cache-Control': cache, ETag: etag, 'Last-Modified': st.mtime.toUTCString(), 'Accept-Ranges': 'bytes', ...extraHeaders };
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, h); res.end(); return true; }
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (range) {
    let start = range[1] === '' ? st.size - Number(range[2]) : Number(range[1]);
    let end = range[1] !== '' && range[2] !== '' ? Number(range[2]) : st.size - 1;
    if (isNaN(start) || start < 0 || start >= st.size || end < start) { res.writeHead(416, { ...h, 'Content-Range': `bytes */${st.size}` }); res.end(); return true; }
    end = Math.min(end, st.size - 1);
    res.writeHead(206, { ...h, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
    if (req.method === 'HEAD') { res.end(); return true; }
    fs.createReadStream(file, { start, end }).pipe(res); return true;
  }
  res.writeHead(200, { ...h, 'Content-Length': st.size });
  if (req.method === 'HEAD') { res.end(); return true; }
  fs.createReadStream(file).pipe(res); return true;
}
function inside(root, rel) {
  let p; try { p = path.resolve(root, '.' + path.posix.normalize('/' + decodeURIComponent(rel))); } catch { return null; }
  return p === root || p.startsWith(root + path.sep) ? p : null;
}

/* ============ публичная страница: контент вшит в HTML (без лишнего запроса и для поисковиков) ============ */
function renderIndex(doc) {
  let html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  const c = S.publicContent(); const L = c.legal || {};
  const site = doc ? { title: doc === 'privacy' ? L.policyTitle : L.consentTitle, description: (doc === 'privacy' ? L.policyTitle : L.consentTitle) + ' - ' + ((c.site || {}).name || '') } : (c.site || {});
  html = html.replace(/<script src="assets\/content\.js"><\/script>/, `<script>window.AA_CONTENT = ${safeJson(c)};</script>`);
  html = html.replace(/window\.AA_CONFIG = window\.AA_CONFIG \|\| \{\};/, `window.AA_CONFIG = { contentEndpoint: '', leadEndpoint: '/api/leads' };`);
  if (site.title) html = html.replace(/<title>[^<]*<\/title>/, `<title>${escHtml(site.title)}</title>`);
  if (site.description) html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escHtml(site.description)}">`);
  return html;
}

/* ============ заявки ============ */
const RE_TG = /^@[A-Za-z0-9_]{4,32}$/;
const RE_TGURL = /^(https?:\/\/)?t\.me\/[A-Za-z0-9_]{4,32}\/?$/i;
const RE_MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function validateLead(v) {
  const e = {};
  const name = String(v.name || '').trim(), contact = String(v.contact || '').trim(), message = String(v.message || '').trim();
  if (name.length < 2 || name.length > 120) e.name = 'name';
  if (!contact || contact.length > 200 || !(RE_TG.test(contact) || RE_TGURL.test(contact) || RE_MAIL.test(contact))) e.contact = 'contact';
  if (message.length < 10 || message.length > 5000) e.message = 'message';
  return { e, name, contact, message };
}

/* ============ сессия ============ */
const sign = (s) => crypto.createHmac('sha256', config.secret).update(s).digest('base64url');
function makeToken() { const body = `${Date.now() + SESSION_DAYS * 864e5}.${crypto.randomBytes(12).toString('base64url')}`; return `${body}.${sign(body)}`; }
function validToken(t) {
  const m = /^(\d+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(t || ''); if (!m) return false;
  const a = Buffer.from(sign(`${m[1]}.${m[2]}`)), b = Buffer.from(m[3]);
  return a.length === b.length && crypto.timingSafeEqual(a, b) && Number(m[1]) > Date.now();
}
const cookieOf = (req, name) => { for (const part of String(req.headers.cookie || '').split(';')) { const [k, ...v] = part.trim().split('='); if (k === name) return v.join('='); } return ''; };
const authed = (req) => validToken(cookieOf(req, 'aa_s'));
const sessionCookie = (req, token, maxAge) => `aa_s=${token}; Path=${A}; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${isHttps(req) ? '; Secure' : ''}`;

/* ============ загрузка медиа: тело запроса = файл, имя в X-File-Name ============ */
function sniff(buf, ext) {
  const hex = buf.subarray(0, 4).toString('hex'); const at = (o, s) => buf.subarray(o, o + s.length).toString('latin1') === s;
  if (ext === 'jpg' || ext === 'jpeg') return hex.startsWith('ffd8ff');
  if (ext === 'png') return hex === '89504e47';
  if (ext === 'gif') return at(0, 'GIF8');
  if (ext === 'webp') return at(0, 'RIFF') && at(8, 'WEBP');
  if (ext === 'webm') return hex === '1a45dfa3';
  if (ext === 'avif' || ext === 'mp4' || ext === 'mov' || ext === 'm4v') return at(4, 'ftyp') || at(4, 'moov') || at(4, 'mdat') || at(4, 'wide') || at(4, 'free');
  return false;
}
function handleUpload(req, res) {
  const orig = decodeURIComponent(String(req.headers['x-file-name'] || 'file'));
  const ext = path.extname(orig).slice(1).toLowerCase();
  if (!S.MEDIA[ext]) return fail(res, 415, 'Формат не поддерживается: jpg, png, webp, avif, gif, mp4, webm, mov');
  const video = S.isVideoExt(ext);
  const limit = (video ? MAX_UPLOAD_MB : MAX_IMAGE_MB) * 1024 * 1024;
  if (Number(req.headers['content-length'] || 0) > limit) return fail(res, 413, `Файл больше ${video ? MAX_UPLOAD_MB : MAX_IMAGE_MB} МБ`);
  const base = path.basename(orig, path.extname(orig)).normalize('NFKD').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).toLowerCase() || 'media';
  const name = `${new Date().toISOString().slice(0, 10)}-${crypto.randomBytes(4).toString('hex')}-${base}.${ext}`;
  const dest = path.join(S.UPLOADS, name); const tmp = dest + '.part';
  const out = fs.createWriteStream(tmp); let size = 0, aborted = false; const head = [];
  const abort = (code, msg) => { if (aborted) return; aborted = true; out.destroy(); fs.rm(tmp, { force: true }, () => {}); if (!res.headersSent) fail(res, code, msg); req.resume(); };
  req.on('data', (c) => { size += c.length; if (head.length < 1) head.push(c.subarray(0, 16)); if (size > limit) abort(413, 'Файл слишком большой'); });
  req.on('aborted', () => abort(400, 'Загрузка прервана'));
  req.pipe(out);
  out.on('error', () => abort(500, 'Не удалось записать файл'));
  out.on('finish', () => {
    if (aborted) return;
    if (!size) return abort(400, 'Пустой файл');
    if (!sniff(Buffer.concat(head).subarray(0, 16), ext)) return abort(415, 'Содержимое файла не похоже на ' + ext);
    fs.renameSync(tmp, dest);
    // фото сжимается в WebP сразу, видео уходит в очередь на WebM (ответ 202 с номером задачи)
    const purpose = String(req.headers['x-media-purpose'] || '');
    M.processUpload(dest, { purpose }).then((r) => json(res, r.job ? 202 : 201, { ...r, size, kind: video ? 'video' : 'image' }))
      .catch((err) => json(res, 201, { url: '/uploads/' + name, name, size, kind: video ? 'video' : 'image', converted: false, note: err.message }));
  });
}

/* ============ маршруты админки ============ */
async function admin(req, res, sub) {
  const method = req.method;
  // страница и её ассеты - всегда (без входа покажет форму пароля)
  if (sub === '') { res.writeHead(301, { Location: A + '/' }); return res.end(); }
  if (sub === '/' && (method === 'GET' || method === 'HEAD')) {
    const html = fs.readFileSync(path.join(SITE_ADMIN, 'index.html'), 'utf8').replace('/*AA_ADMIN*/', `window.AA_ADMIN = ${safeJson({ base: A })};`);
    return send(res, 200, html, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY', 'X-Robots-Tag': 'noindex, nofollow' });
  }
  if (/^\/(admin\.js|admin\.css|react\.js|react-dom\.js)$/.test(sub) && method === 'GET') {
    if (serveFile(req, res, path.join(SITE_ADMIN, sub.slice(1)), { cache: 'no-cache', extraHeaders: { 'X-Robots-Tag': 'noindex' } })) return;
  }
  if (!sub.startsWith('/api/')) return fail(res, 404, 'Не найдено');
  const api = sub.slice(4);

  // всё, что меняет состояние, требует своего заголовка (защита от CSRF: чужой сайт не сможет его поставить без CORS)
  const mutating = method !== 'GET' && method !== 'HEAD';
  if (mutating && req.headers['x-aa-admin'] !== '1') return fail(res, 403, 'Нет заголовка X-AA-Admin');

  if (api === '/login' && method === 'POST') {
    const ip = clientIp(req);
    const wait = loginLockedFor(ip);
    if (wait) return fail(res, 429, `Слишком много неудачных попыток. Вход закрыт ещё на ${Math.ceil(wait / 60e3)} мин.`);
    const body = await readJsonBody(req, 4096);
    if (!S.checkPassword(body && body.password, config.passwordHash)) {
      await new Promise((r) => setTimeout(r, 400));
      return loginFailed(ip) ? fail(res, 429, 'Слишком много неудачных попыток. Вход закрыт на 15 мин.') : fail(res, 401, 'Неверный пароль');
    }
    lockouts.delete(ip);
    return json(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, makeToken(), SESSION_DAYS * 86400) });
  }
  if (api === '/logout' && method === 'POST') return json(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
  if (!authed(req)) return fail(res, 401, 'Нужен вход');

  if (api === '/me' && method === 'GET') return json(res, 200, { ok: true, media: M.ffmpegOk, newLeads: S.getLeads().filter((l) => l.status === 'new').length });

  if (api === '/content' && method === 'GET') { const c = S.getContent(); return json(res, 200, { content: c, version: S.contentVersion(c) }); }
  if (api === '/content' && method === 'PUT') {
    const body = await readJsonBody(req);
    const cur = S.contentVersion();
    if (body && body.baseVersion && body.baseVersion !== cur && !body.force) return fail(res, 409, 'Контент изменился в другой вкладке. Обнови страницу или сохрани поверх.');
    let c; try { c = S.sanitizeContent(body && body.content); } catch (err) { return fail(res, 400, err.message); }
    c.legal = S.withLegalVersions(S.getContent().legal, c.legal || {});
    c = M.rewriteUrls(c); // черновик мог держать адреса файлов, которые уже сжаты и переименованы
    S.saveContent(c);
    return json(res, 200, { ok: true, version: S.contentVersion(c), content: c });
  }
  if (api === '/history' && method === 'GET') return json(res, 200, { items: S.listHistory() });
  let m = /^\/history\/([A-Za-z0-9TZ-]+)$/.exec(api);
  if (m && method === 'GET') { const c = S.readHistory(m[1]); return c ? json(res, 200, { content: c }) : fail(res, 404, 'Нет такой версии'); }

  if (api === '/upload' && method === 'POST') return handleUpload(req, res);
  let mj = /^\/upload\/jobs\/([a-f0-9]+)$/.exec(api);
  if (mj && method === 'GET') { const j = M.getJob(mj[1]); return j ? json(res, 200, j) : fail(res, 404, 'Задача не найдена'); }
  if (api === '/media/convert-all' && method === 'POST') { try { return json(res, 202, M.convertAll()); } catch (err) { return fail(res, 400, err.message); } }
  if (api === '/media/convert-all' && method === 'GET') return json(res, 200, M.bulkStatus() || { status: 'idle' });
  if (api === '/uploads' && method === 'GET') {
    // запасные MP4 рядом с WebM в библиотеке не показываем - они идут в паре
    const used = S.usedUploads(); const all = S.listUploads(); const hidden = M.hiddenFallbacks(all.map((u) => u.name));
    return json(res, 200, { ffmpeg: M.ffmpegOk, items: all.filter((u) => !hidden.has(u.name)).map((u) => ({ ...u, used: used.has(u.name) })) });
  }
  m = /^\/uploads\/([A-Za-z0-9._-]+)$/.exec(api);
  if (m && method === 'DELETE') {
    if (S.usedUploads().has(m[1])) return fail(res, 409, 'Файл используется на странице');
    const f = inside(S.UPLOADS, m[1]); if (!f || !fs.existsSync(f)) return fail(res, 404, 'Нет файла');
    fs.rmSync(f);
    const fb = /\.webm$/i.test(m[1]) && M.fallbackOf(m[1]); if (fb) fs.rmSync(path.join(S.UPLOADS, fb), { force: true }); // и его запасной MP4
    return json(res, 200, { ok: true });
  }

  if (api === '/leads' && method === 'GET') return json(res, 200, { items: S.getLeads() });
  m = /^\/leads\/([A-Za-z0-9_-]+)$/.exec(api);
  if (m && method === 'PATCH') { const l = S.updateLead(m[1], (await readJsonBody(req, 8192)) || {}); return l ? json(res, 200, l) : fail(res, 404, 'Нет заявки'); }
  if (m && method === 'DELETE') return S.deleteLead(m[1]) ? json(res, 200, { ok: true }) : fail(res, 404, 'Нет заявки');

  return fail(res, 404, 'Нет такого метода');
}

/* ============ публичные маршруты ============ */
async function handle(req, res) {
  const url = new URL(req.url, 'http://x'); const p = url.pathname; const method = req.method;

  if (p === A || p.startsWith(A + '/')) return admin(req, res, p.slice(A.length));

  if (p === '/api/content' && method === 'GET') return json(res, 200, S.publicContent(), { 'Cache-Control': 'no-cache' });
  if (p === '/api/leads' && method === 'POST') {
    if (limited('lead:' + clientIp(req), 5, 10 * 60e3)) return fail(res, 429, 'Слишком много заявок подряд');
    const body = (await readJsonBody(req, 32 * 1024)) || {};
    if (body.website) return json(res, 201, { ok: true }); // ловушка для ботов
    // 152-ФЗ: без явного согласия заявку не принимаем (форма проверяет то же самое)
    if (body.consent !== true) return fail(res, 400, 'Нужно согласие на обработку персональных данных');
    const { e, name, contact, message } = validateLead(body);
    if (Object.keys(e).length) return json(res, 422, { error: 'Проверь поля', fields: Object.keys(e) });
    const L = S.getContent().legal || {}; const now = new Date().toISOString();
    // заявка остаётся только на сервере: никаких пересылок в мессенджеры, почту и аналитику
    S.addLead({
      id: Date.now().toString(36) + crypto.randomBytes(3).toString('hex'), name, contact, message, status: 'new', createdAt: now,
      ip: clientIp(req), // указан в политике: только для защиты формы от спама
      consentGiven: true, consentAt: now, consentVersion: L.consentVersion || '1.0', policyVersion: L.policyVersion || '1.0',
    });
    return json(res, 201, { ok: true });
  }
  if (p === '/api/health') return json(res, 200, { ok: true });
  if (p.startsWith('/api/')) return fail(res, 404, 'Не найдено');

  if (method !== 'GET' && method !== 'HEAD') return fail(res, 405, 'Метод не поддерживается');

  if (p === '/' || p === '/index.html') return send(res, 200, renderIndex(), { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  if (p === '/privacy' || p === '/consent') return send(res, 200, renderIndex(p.slice(1)), { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  if (p === '/privacy/' || p === '/consent/') { res.writeHead(301, { Location: p.slice(0, -1) }); return res.end(); }
  if (p === '/data/content.json') return json(res, 200, S.publicContent(), { 'Cache-Control': 'no-cache' });
  if (p === '/assets/content.js') return send(res, 200, `window.AA_CONTENT = ${safeJson(S.publicContent())};\n`, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-cache' });
  if (p.startsWith('/uploads/')) {
    const f = inside(S.UPLOADS, p.slice(9));
    if (f && !f.endsWith('.part') && S.MEDIA[path.extname(f).slice(1).toLowerCase()] && serveFile(req, res, f, { cache: 'public, max-age=31536000, immutable' })) return;
    // файл сжат и переименован (jpg -> webp, mov -> webm): старый адрес ведёт на новый
    const moved = M.mediaMap()[decodeURIComponent(p.slice(9))];
    if (moved) { res.writeHead(301, { Location: '/uploads/' + moved, 'Cache-Control': 'public, max-age=86400' }); return res.end(); }
    return fail(res, 404, 'Не найдено');
  }
  const f = inside(SITE, p.slice(1));
  if (f && serveFile(req, res, f, { cache: 'public, max-age=300' })) return;
  return send(res, 404, 'Не найдено', { 'Content-Type': 'text/plain; charset=utf-8' });
}

if (!fs.existsSync(path.join(SITE, 'index.html')) || !fs.existsSync(path.join(SITE_ADMIN, 'index.html'))) {
  console.error('Нет собранных site/ и site-admin/. Сначала: npm run build'); process.exit(1);
}
S.getContent();

/* срок хранения заявок: при старте и раз в сутки удаляем заявки старше legal.retentionMonths месяцев */
function pruneOldLeads() {
  const months = Number((S.getContent().legal || {}).retentionMonths) || 12;
  const n = S.pruneLeads(months);
  if (n) console.log(`заявки: удалено по сроку хранения (${months} мес.): ${n}`);
}
pruneOldLeads();
setInterval(pruneOldLeads, 24 * 3600e3).unref();

// пароль первого запуска печатаем сразу: даже если порт занят, он уже записан в data/config.json
if (firstRun) console.log(`\nПервый запуск. Пароль админки: ${firstRun.password}\nСохрани его - больше он не покажется. Сменить: npm run admin:password -- <новый>\n`);

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    if (!err.status) console.error(err);
    if (!res.headersSent) fail(res, err.status || 500, err.status ? err.message : 'Ошибка сервера'); else res.end();
  });
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
    console.error(`Порт ${PORT} занят другой программой или запрещён системой. Запусти на другом порту, например:\n  PowerShell:  $env:PORT=3100; npm start\n  bash:        PORT=3100 npm start`);
    process.exit(1);
  }
  throw err;
});
server.listen(PORT, HOST, () => {
  const origin = `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;
  console.log(`Сайт:    ${origin}/`);
  console.log(`Админка: ${origin}${A}/`);
  console.log(M.ffmpegOk ? 'Медиа: ffmpeg найден - фото сжимаются в WebP, видео в WebM' : 'Медиа: ffmpeg не найден - загрузки сохраняются без сжатия (FFMPEG_PATH)');
});
