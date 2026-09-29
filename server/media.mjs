// Сжатие медиа для быстрой загрузки сайта: фото -> WebP, видео -> WebM (VP9 + Opus) и запасной MP4 (H.264) для старых iPhone.
// Работает через внешний ffmpeg (FFMPEG_PATH или ffmpeg из PATH). Нет ffmpeg - файлы остаются как загружены.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import * as S from './store.mjs';

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || (process.env.FFMPEG_PATH ? path.join(path.dirname(process.env.FFMPEG_PATH), 'ffprobe' + path.extname(process.env.FFMPEG_PATH)) : 'ffprobe');
const IMG_MAX = Number(process.env.IMAGE_MAX_PX || 2560);   // длинная сторона фото
const VID_MAX = Number(process.env.VIDEO_MAX_PX || 1080);   // короткая сторона видео (1080p)
const THREADS = Math.max(1, Math.min(8, os.cpus().length - 1));

export const ffmpegOk = (() => { try { return spawnSync(FFMPEG, ['-hide_banner', '-version'], { stdio: 'ignore', windowsHide: true }).status === 0; } catch { return false; } })();

function run(bin, args, onLine) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { windowsHide: true });
    let err = '';
    p.stderr.on('data', (d) => { err = (err + d).slice(-4000); });
    if (onLine) { let buf = ''; p.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { onLine(buf.slice(0, i).trim()); buf = buf.slice(i + 1); } }); }
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error('ffmpeg: ' + err.split('\n').filter(Boolean).slice(-2).join(' ')))));
  });
}
function probeDuration(file) {
  try {
    const r = spawnSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8', windowsHide: true });
    return Number(r.stdout.trim()) || 0;
  } catch { return 0; }
}
function hasAudio(file) {
  try { return spawnSync(FFPROBE, ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', file], { encoding: 'utf8', windowsHide: true }).stdout.trim() !== ''; } catch { return false; }
}
const rm = (f) => fs.rm(f, { force: true }, () => {});

/* ============ фото -> WebP (синхронно при загрузке, это быстро) ============ */
export async function toWebp(src) {
  const ext = path.extname(src).slice(1).toLowerCase();
  const dest = src.replace(/\.[^.]+$/, '.webp');
  if (ext === 'webp') return src;
  const tmp = dest + '.part.webp';
  // уменьшаем только большие; анимированный GIF остаётся анимированным
  const scale = `scale='if(gt(iw,ih),min(${IMG_MAX},iw),-2)':'if(gt(iw,ih),-2,min(${IMG_MAX},ih))'`;
  const codec = ext === 'gif' ? ['-c:v', 'libwebp_anim', '-loop', '0', '-quality', '80'] : ['-c:v', 'libwebp', '-quality', '82', '-compression_level', '5', '-preset', 'picture', '-frames:v', '1'];
  await run(FFMPEG, ['-hide_banner', '-y', '-i', src, '-vf', scale, ...codec, '-map_metadata', '-1', tmp]);
  fs.renameSync(tmp, dest);
  return dest;
}

/* ============ видео -> WebM + запасной MP4 (в фоне, с прогрессом) ============ */
export async function toWebm(src, { audio = true, onProgress } = {}) {
  const ext = path.extname(src).slice(1).toLowerCase();
  const baseOut = src.replace(/\.[^.]+$/, '');
  const webm = baseOut + '.webm', mp4 = baseOut + '.mp4'; // исходный .mp4 заменяется сжатым запасным
  const dur = probeDuration(src); const withAudio = audio && hasAudio(src);
  // короткая сторона не больше 1080: и для 16:9, и для 9:16
  const scale = `scale='if(gt(iw,ih),-2,min(${VID_MAX},iw))':'if(gt(iw,ih),min(${VID_MAX},ih),-2)'`;
  const progress = (share, offset) => (line) => {
    const m = /^out_time_(?:us|ms)=(\d+)/.exec(line);
    if (m && dur && onProgress) onProgress(Math.min(1, offset + share * (Number(m[1]) / 1e6 / dur)));
  };
  // 1) WebM: VP9 с постоянным качеством - основное для браузеров. На натуральной съёмке при том же размере
  //    заметно чище H.264 (замер: ~1 МБ, SSIM 0.976 против 0.956). -g 240 - ключевой кадр раз в 8 с для перемотки.
  if (ext !== 'webm') {
    const tmp = webm + '.part.webm';
    await run(FFMPEG, ['-hide_banner', '-y', '-i', src, '-vf', scale, '-c:v', 'libvpx-vp9', '-crf', '36', '-b:v', '0', '-g', '240', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1', '-threads', String(THREADS),
      ...(withAudio ? ['-c:a', 'libopus', '-b:a', '96k'] : ['-an']), '-map_metadata', '-1', '-progress', 'pipe:1', '-nostats', tmp], progress(0.75, 0));
    fs.renameSync(tmp, webm);
  }
  // 2) MP4: H.264 для Safari на старых iOS, которые не играют WebM
  const tmp4 = baseOut + '.part.mp4';
  await run(FFMPEG, ['-hide_banner', '-y', '-i', src, '-vf', scale, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    ...(withAudio ? ['-c:a', 'aac', '-b:a', '128k'] : ['-an']), '-map_metadata', '-1', '-progress', 'pipe:1', '-nostats', tmp4], progress(ext !== 'webm' ? 0.25 : 1, ext !== 'webm' ? 0.75 : 0)); // готовый WebM: вся шкала - на запасной MP4
  fs.renameSync(tmp4, mp4);
  onProgress && onProgress(1);
  return { webm, mp4 };
}
/** Запасной MP4 рядом с WebM: x.webm -> x.mp4 */
export function fallbackOf(name) {
  const f = name.replace(/\.webm$/i, '.mp4');
  return f !== name && fs.existsSync(path.join(S.UPLOADS, f)) ? f : null;
}
/** Имена запасных MP4, у которых есть WebM - в библиотеке их не показываем */
export function hiddenFallbacks(names) {
  const set = new Set(names); const hidden = new Set();
  for (const n of names) if (/\.mp4$/i.test(n) && set.has(n.replace(/\.mp4$/i, '.webm'))) hidden.add(n);
  return hidden;
}

/* ============ очередь задач: видео по одному, чтобы не забить процессор ============ */
const jobs = new Map(); let chain = Promise.resolve();
export function getJob(id) { return jobs.get(id) || null; }
function newJob(extra) { const id = crypto.randomBytes(6).toString('hex'); const j = { id, status: 'queued', progress: 0, url: null, error: null, ...extra }; jobs.set(id, j); setTimeout(() => jobs.delete(id), 6 * 3600e3).unref(); return j; }
function enqueue(job, fn) {
  chain = chain.then(async () => { job.status = 'converting'; try { await fn(); job.status = 'done'; } catch (e) { job.status = 'failed'; job.error = e.message; } });
  return job;
}

/* карта старых адресов: сжатый файл заменил оригинал - старый /uploads/... ведёт на новый */
const MAP = path.join(S.DATA, 'media-map.json');
let mapCache = null;
export function mediaMap() { if (!mapCache) { try { mapCache = JSON.parse(fs.readFileSync(MAP, 'utf8')); } catch { mapCache = {}; } } return mapCache; }
function remember(oldName, newName) { const m = mediaMap(); m[oldName] = newName; for (const k of Object.keys(m)) if (m[k] === oldName) m[k] = newName; fs.writeFileSync(MAP, JSON.stringify(m, null, 1)); }
/** Заменяет в объекте контента старые адреса загрузок на новые */
export function rewriteUrls(content) {
  const m = mediaMap(); if (!Object.keys(m).length) return content;
  const s = JSON.stringify(content).replace(/\/uploads\/([A-Za-z0-9._-]+)/g, (all, n) => (m[n] ? '/uploads/' + m[n] : all));
  return JSON.parse(s);
}
/** Живой контент: подменить старые адреса и сохранить (без новой записи в истории, если ничего не поменялось) */
function rewriteLive() {
  const cur = S.getContent(); const next = rewriteUrls(cur);
  if (JSON.stringify(next) !== JSON.stringify(cur)) S.saveContent(next);
}

/* ============ обработка загрузки ============ */
/**
 * Файл уже лежит в uploads. Фото сжимается сразу, видео ставится в очередь.
 * purpose: 'preview' | 'bg' - без звука; иначе звук сохраняется.
 */
export async function processUpload(file, { purpose } = {}) {
  const name = path.basename(file); const ext = path.extname(name).slice(1).toLowerCase();
  if (!ffmpegOk) return { url: '/uploads/' + name, name, converted: false, note: 'ffmpeg не найден - файл сохранён без сжатия' };
  if (!S.isVideoExt(ext)) {
    if (ext === 'webp') return { url: '/uploads/' + name, name, converted: false };
    try {
      const out = await toWebp(file); const outName = path.basename(out);
      const before = fs.statSync(file).size, after = fs.statSync(out).size;
      rm(file); remember(name, outName);
      return { url: '/uploads/' + outName, name: outName, converted: true, before, after };
    } catch (e) { return { url: '/uploads/' + name, name, converted: false, note: 'не удалось сжать: ' + e.message }; }
  }
  const job = newJob({ original: '/uploads/' + name });
  const audio = !(purpose === 'preview' || purpose === 'bg');
  enqueue(job, async () => {
    const before = fs.statSync(file).size;
    const { webm } = await toWebm(file, { audio, onProgress: (p) => { job.progress = p; } });
    const outName = path.basename(webm);
    if (ext !== 'webm') { if (ext !== 'mp4') rm(file); remember(name, outName); }
    job.url = '/uploads/' + outName; job.before = before; job.after = fs.statSync(webm).size;
    rewriteLive();
  });
  return { job: job.id, url: null, name, converted: 'pending' };
}

/* ============ «Сжать всё»: уже загруженные файлы ============ */
let bulk = null;
export function bulkStatus() { return bulk; }
export function convertAll() {
  if (!ffmpegOk) throw new Error('ffmpeg не найден');
  if (bulk && bulk.status === 'converting') return bulk;
  const names = fs.readdirSync(S.UPLOADS);
  const hidden = hiddenFallbacks(names);
  const todo = names.filter((n) => {
    const e = path.extname(n).slice(1).toLowerCase();
    if (!S.MEDIA[e] || hidden.has(n) || /\.part\./.test(n)) return false;
    if (!S.isVideoExt(e)) return e !== 'webp';               // фото: всё, что ещё не WebP
    if (e === 'webm') return !fallbackOf(n);                 // WebM без запасного MP4
    return !names.includes(n.replace(/\.[^.]+$/, '.webm'));  // mp4/mov/m4v без WebM
  });
  bulk = { status: 'converting', total: todo.length, done: 0, current: null, saved: 0, errors: [] };
  const content = JSON.stringify(S.getContent());
  (async () => {
    for (const n of todo) {
      bulk.current = n; const f = path.join(S.UPLOADS, n); const e = path.extname(n).slice(1).toLowerCase();
      try {
        const before = fs.statSync(f).size;
        if (S.isVideoExt(e)) {
          // звук оставляем, если файл где-то стоит как ролик в плеере; превью и фон - без звука
          const asPlayer = content.includes('"videoUrl":"/uploads/' + n + '"');
          const { webm } = await toWebm(f, { audio: asPlayer });
          if (e !== 'webm') { if (e !== 'mp4') rm(f); remember(n, path.basename(webm)); }
          bulk.saved += Math.max(0, before - fs.statSync(webm).size);
        } else {
          const out = await toWebp(f); rm(f); remember(n, path.basename(out));
          bulk.saved += Math.max(0, before - fs.statSync(out).size);
        }
      } catch (err) { bulk.errors.push(n + ': ' + err.message); }
      bulk.done++;
    }
    rewriteLive();
    bulk.status = 'done'; bulk.current = null;
  })();
  return bulk;
}
