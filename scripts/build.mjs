// Сборка: node scripts/build.mjs (или npm run build)
// src/aa.jsx → aa-bundle.js (window.AA), src/admin.jsx → admin.js, design-system/tokens.json → tokens.css.
// Публичная статика → site/, админка → site-admin/ (отдаётся сервером только по секретному пути).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { transformSync } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = (...p) => path.join(root, ...p);
const read = (p) => fs.readFileSync(r(p), 'utf8');
const write = (p, s) => { fs.mkdirSync(path.dirname(r(p)), { recursive: true }); fs.writeFileSync(r(p), s); };
const copy = (a, b) => { fs.mkdirSync(path.dirname(r(b)), { recursive: true }); fs.copyFileSync(r(a), r(b)); };

/* JSX → IIFE, экспорты уходят в window[ns] */
function bundle(file, ns, header = '') {
  let js = transformSync(read(file), { loader: 'jsx', jsx: 'transform', jsxFactory: 'h', jsxFragment: 'Fragment', target: 'es2019', charset: 'utf8' }).code;
  const names = [];
  js = js.replace(/export\s+(async\s+)?function\s+(\w+)/g, (_m, a, n) => { names.push(n); return (a || '') + 'function ' + n; });
  js = js.replace(/export\s+const\s+(\w+)/g, (_m, n) => { names.push(n); return 'const ' + n; });
  if (/^\s*export\b/m.test(js)) throw new Error(file + ': leftover export');
  const out = header + `(function(){\n${js}\nwindow.${ns} = Object.assign(window.${ns} || {}, { ${names.join(', ')} });\n})();\n`;
  if (/<\/script|<!--/i.test(out)) throw new Error(file + ': forbidden sequence');
  return out;
}

/* tokens.json → CSS-переменные двух миров */
function tokensCss() {
  const T = JSON.parse(read('design-system/tokens.json'));
  const themes = T.color.themes.map((t) => t.id);
  const val = (v) => { const m = /^\{([^}]+)\}$/.exec(v); return m ? `var(--${m[1]})` : v; };
  const base = [], over = Object.fromEntries(themes.slice(1).map((t) => [t, []]));
  for (const tk of T.color.tokens) {
    const v = tk.value;
    if (typeof v === 'string') base.push(`  --${tk.name}: ${val(v)};`);
    else {
      base.push(`  --${tk.name}: ${val(v[themes[0]])};`);
      for (const t of themes.slice(1)) if (t in v) over[t].push(`  --${tk.name}: ${val(v[t])};`);
    }
  }
  let css = [`:root, [data-theme="${themes[0]}"] {`, ...base, '}'];
  for (const t of themes.slice(1)) css.push(`[data-theme="${t}"] {`, ...over[t], '}');
  const rootVars = ['spacing', 'radius', 'shadow', 'duration'].flatMap((f) => ((T[f] || {}).tokens || []).map((tk) => `  --${tk.name}: ${tk.value};`));
  rootVars.push(...Object.entries(T.type.families).map(([k, v]) => `  --font-${k}: ${v};`));
  return [...css, ':root {', ...rootVars, '}'].join('\n') + '\n';
}

const comps = ['Landing', 'Monogram', 'Button', 'Rec', 'Chip', 'Barcode', 'Atmosphere', 'Header', 'Hero', 'Counter', 'Tracklist', 'WorldRift', 'PosterCard', 'VideoModal', 'CaseTag', 'Transmitter', 'Footer'];
const aa = bundle('src/aa.jsx', 'AA', `/* @ds-bundle: ${JSON.stringify({ format: 4, namespace: 'AA', components: comps.map((n) => ({ name: n })) })} */\n`);
const admin = bundle('src/admin.jsx', 'AAAdmin');
const tokens = tokensCss();
const content = JSON.parse(read('content/content.json'));

fs.rmSync(r('site'), { recursive: true, force: true });
fs.rmSync(r('site-admin'), { recursive: true, force: true });

// публичный сайт
copy('src/index.html', 'site/index.html');
const ver = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
// грязные текстуры мира «Туман» (генерирует scripts/textures.py); в aa.css их адреса получают ?v=<хэш файла>,
// иначе после перегенерации браузер держит старую картинку
let css = read('src/aa.css');
for (const f of fs.readdirSync(r('src/tex'))) {
  copy('src/tex/' + f, 'site/assets/tex/' + f);
  css = css.split(`tex/${f}"`).join(`tex/${f}?v=${ver(fs.readFileSync(r('src/tex/' + f)))}"`);
}
write('site/assets/aa.css', css);
// пасхалка Doom (src/doom.js -> iframe src/doom-frame.html -> Chocolate Doom из vendor/doom): грузится из main.js только после
// Konami кода; адреса получают ?v=<хэш>. Бинарники в гите сжаты: голый .wasm GitHub не принимает (проверка секретов при push
// падает на нём с 500). Хэши - vendor/doom/README.md; не совпало - сборка падает.
const DOOM_BIN = {
  'engine.wasm': ['vendor/doom/engine.wasm.gz', 'c5a89f6c6b316bd93fa8948f71ef6cf489b5b1c420d586c729ce7f4e2b13b7c2'], // своя сборка - vendor/doom/build-engine.sh
  'doom1.wad': ['vendor/doom/doom1.wad.gz', '1d7d43be501e67d927e415e0b8f3e29c3bf33075e859721816f652a526cac771'], // shareware v1.9 (md5 f0cefca4...)
};
const doomVer = {}; let doomTotal = 0;
for (const [name, [src, sha]] of Object.entries(DOOM_BIN)) {
  const buf = zlib.gunzipSync(fs.readFileSync(r(src)));
  if (crypto.createHash('sha256').update(buf).digest('hex') !== sha) throw new Error(`doom: sha256 ${name} не совпадает`);
  fs.mkdirSync(r('site/assets/doom'), { recursive: true }); fs.writeFileSync(r('site/assets/doom', name), buf);
  doomVer[name] = ver(buf); doomTotal += buf.length;
}
for (const name of ['engine.js', 'default.cfg']) { const buf = fs.readFileSync(r('vendor/doom', name)); fs.writeFileSync(r('site/assets/doom', name), buf); doomVer[name] = ver(buf); }
let doomFrame = read('src/doom-frame.html').replace('var TOTAL = 0;', `var TOTAL = ${doomTotal};`);
for (const name of Object.keys(doomVer)) doomFrame = doomFrame.replace(`'/assets/doom/${name}'`, `'/assets/doom/${name}?v=${doomVer[name]}'`);
if (Object.keys(doomVer).some((n) => !doomFrame.includes(`/assets/doom/${n}?v=`)) || !doomFrame.includes(`TOTAL = ${doomTotal}`)) throw new Error('doom: адреса в doom-frame.html не найдены');
write('site/assets/doom/frame.html', doomFrame);
const doomJs = read('src/doom.js').replace("'/assets/doom/frame.html'", `'/assets/doom/frame.html?v=${ver(doomFrame)}'`);
write('site/assets/doom.js', doomJs);
const mainJs = read('src/main.js').replace("'/assets/doom.js'", `'/assets/doom.js?v=${ver(doomJs)}'`);
if (mainJs === read('src/main.js') || !doomJs.includes('frame.html?v=')) throw new Error('doom: адреса для ?v= не найдены');
write('site/assets/main.js', mainJs);
write('site/assets/tokens.css', tokens);
write('site/assets/aa-bundle.js', aa);
write('site/data/content.json', JSON.stringify(content, null, 2) + '\n');
write('site/assets/content.js', '/* Сгенерировано из content/content.json - правьте JSON. */\nwindow.AA_CONTENT = ' + JSON.stringify(content, null, 2) + ';\n');

// метки версий: ?v=<хэш> на ассетах, чтобы после сборки браузер не держал старые файлы
function stamp(htmlPath, files) {
  let html = read(htmlPath);
  for (const [ref, body] of Object.entries(files)) html = html.split(`${ref}"`).join(`${ref}?v=${ver(body)}"`);
  write(htmlPath, html);
}
stamp('site/index.html', { 'assets/tokens.css': tokens, 'assets/aa.css': css, 'assets/aa-bundle.js': aa, 'assets/main.js': mainJs });

// админка
copy('src/admin.html', 'site-admin/index.html');
copy('src/admin.css', 'site-admin/admin.css');
copy('vendor/react.js', 'site-admin/react.js'); // админка не зависит от CDN
copy('vendor/react-dom.js', 'site-admin/react-dom.js');
write('site-admin/admin.js', admin);
stamp('site-admin/index.html', { '/assets/tokens.css': tokens, '/assets/aa.css': css, '/assets/aa-bundle.js': aa, 'admin.css': read('src/admin.css'), 'admin.js': admin });

// дизайн-система
write('design-system/components/bundle.js', aa);
copy('src/aa.css', 'design-system/components/bundle.css');
copy('content/content.json', 'design-system/content/content.json');

console.log(`site/ и site-admin/ собраны · aa-bundle ${(aa.length / 1024).toFixed(1)} KB · admin ${(admin.length / 1024).toFixed(1)} KB`);
