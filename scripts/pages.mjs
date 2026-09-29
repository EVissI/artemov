// Статичная сборка под GitHub Pages: site/ (после npm run build) -> dist/.
// Pages отдаёт сайт из подпапки репозитория (https://user.github.io/repo/), поэтому всё по относительным адресам:
// - медиа из content/uploads/ копируются в dist/uploads/, адреса /uploads/... в контенте -> uploads/...;
// - документы - отдельные файлы privacy.html и consent.html рядом с index.html (ссылки через AA_CONFIG.legalUrls);
// - бэкенда нет: админки и приёма заявок на Pages нет, форма честно показывает ошибку (AA_CONFIG.staticSite).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = (...p) => path.join(root, ...p);
const SITE = r('site'), DIST = r('dist'), UP = r('content', 'uploads');
if (!fs.existsSync(path.join(SITE, 'index.html'))) { console.error('Нет site/index.html - сначала npm run build'); process.exit(1); }

fs.rmSync(DIST, { recursive: true, force: true });
fs.cpSync(SITE, DIST, { recursive: true });

// контент: абсолютные /uploads/ -> относительные
const content = JSON.parse(fs.readFileSync(r('content', 'content.json'), 'utf8'));
const used = new Set();
const rel = (v) => {
  if (typeof v === 'string') return v.replace(/^\/uploads\/([^?#]+)/, (_, f) => { used.add(f); return 'uploads/' + f; });
  if (Array.isArray(v)) return v.map(rel);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, rel(x)]));
  return v;
};
const out = rel(content);
fs.writeFileSync(path.join(DIST, 'assets', 'content.js'), '/* Сгенерировано scripts/pages.mjs из content/content.json. */\nwindow.AA_CONTENT = ' + JSON.stringify(out, null, 2) + ';\n');
fs.writeFileSync(path.join(DIST, 'data', 'content.json'), JSON.stringify(out, null, 2) + '\n');

// медиа: только то, на что ссылается контент (+ запасной .mp4 рядом с .webm)
const missing = [];
for (const f of used) {
  for (const name of [f, f.replace(/\.webm$/i, '.mp4')]) {
    const src = path.join(UP, name);
    if (fs.existsSync(src)) { fs.mkdirSync(path.dirname(path.join(DIST, 'uploads', name)), { recursive: true }); fs.copyFileSync(src, path.join(DIST, 'uploads', name)); }
    else if (name === f) missing.push(name);
  }
}
if (missing.length) console.warn('Нет в content/uploads/ (на Pages не будет):', missing.join(', '));

// конфиг статичной сборки + страницы документов
const cfg = { staticSite: true, legalUrls: { privacy: 'privacy.html', consent: 'consent.html' }, homeUrl: './' };
let html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
html = html.replace(/window\.AA_CONFIG = window\.AA_CONFIG \|\| \{\};/, 'window.AA_CONFIG = ' + JSON.stringify(cfg) + ';');
fs.writeFileSync(path.join(DIST, 'index.html'), html);
const L = content.legal || {};
for (const [file, title] of [['privacy.html', L.policyTitle], ['consent.html', L.consentTitle]]) {
  let h = html;
  if (title) h = h.replace(/<title>[^<]*<\/title>/, '<title>' + String(title).replace(/[<&]/g, '') + '</title>');
  fs.writeFileSync(path.join(DIST, file), h);
}
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
console.log(`dist/ собран для GitHub Pages · медиа ${used.size}${missing.length ? ' (не хватает ' + missing.length + ')' : ''}`);
