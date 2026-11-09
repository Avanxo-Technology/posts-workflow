// Comprobación visual de los efectos: renderiza cada uno en Chrome, toma fotogramas en varios instantes y mide cuánto cambia la imagen.
// Un efecto cuyo movimiento no se ve (p. ej. un degradado liso que se desplaza) sale como "SIN MOVIMIENTO VISIBLE".
//   node _shared/site/qa-effects.mjs [id ...] [--out carpeta]     (--out guarda los fotogramas como PNG para revisarlos)
// Requiere Google Chrome (o CHROME=/ruta/al/binario) y Node 22+.
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inflateSync} from 'node:zlib';
import {catalogData} from '../catalog-server.mjs';
import {fxCardPage, previewBaseCss} from './card-page.mjs';
import {publicPalettes} from './public.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), TOOL = resolve(HERE, '..', '..');
const FX = createRequire(import.meta.url)('../catalog-ui/fx-core.js');
const args = process.argv.slice(2);
const oi = args.indexOf('--out'); const OUT = oi >= 0 ? resolve(args.splice(oi, 2)[1]) : null;
if (OUT) mkdirSync(OUT, {recursive: true});
const only = new Set(args);

// ---- PNG -> RGBA (solo lo que devuelve Chrome: 8 bits, sin entrelazado) ----
function decodePng(buf) {
  let p = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; } else if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  const bpp = ct === 6 ? 4 : 3, raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = out.subarray(y * stride, (y + 1) * stride), prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? row[i - bpp] : 0, b = prev ? prev[i] : 0, c = prev && i >= bpp ? prev[i - bpp] : 0;
      let v = src[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      row[i] = v & 255;
    }
  }
  return {w, h, bpp, px: out};
}
// fracción de píxeles que cambian de forma apreciable entre dos fotogramas
function changed(a, b) {
  let n = 0; const total = a.w * a.h;
  for (let i = 0; i < total; i++) { const o = i * a.bpp; if (Math.abs(a.px[o] - b.px[o]) + Math.abs(a.px[o + 1] - b.px[o + 1]) + Math.abs(a.px[o + 2] - b.px[o + 2]) > 12) n++; }
  return n / total;
}
// fracción de píxeles distintos al color de fondo dominante (esquina superior izquierda): ¿hay algo dibujado?
function ink(a) {
  const bg = [a.px[0], a.px[1], a.px[2]]; let n = 0; const total = a.w * a.h;
  for (let i = 0; i < total; i++) { const o = i * a.bpp; if (Math.abs(a.px[o] - bg[0]) + Math.abs(a.px[o + 1] - bg[1]) + Math.abs(a.px[o + 2] - bg[2]) > 30) n++; }
  return n / total;
}

// ---- Chrome por CDP ----
const CHROME = process.env.CHROME || 'google-chrome';
const profile = mkdtempSync(join(tmpdir(), 'fxqa-')), port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=540,960', '--hide-scrollbars', '--no-first-run', '--disable-gpu', 'about:blank'], {stdio: 'ignore'});
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function connect() {
  for (let i = 0; i < 60; i++) {
    try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const t = l.find(x => x.type === 'page'); if (t) return t.webSocketDebuggerUrl; } catch { /* aún arrancando */ }
    await sleep(250);
  }
  throw new Error('No se pudo conectar con Chrome (¿está instalado? usa CHROME=/ruta)');
}
const ws = new WebSocket(await connect());
await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
let id = 0; const waiting = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && waiting.has(d.id)) { const w = waiting.get(d.id); waiting.delete(d.id); d.error ? w.fail(new Error(d.error.message)) : w.ok(d.result); } };
const cdp = (method, params = {}) => new Promise((ok, fail) => { const i = ++id; waiting.set(i, {ok, fail}); ws.send(JSON.stringify({id: i, method, params})); });
await cdp('Page.enable');
await cdp('Emulation.setDeviceMetricsOverride', {width: 540, height: 960, deviceScaleFactor: 1, mobile: false});

const data = catalogData(TOOL, '');
const pal = Object.values(publicPalettes(TOOL))[0];
const baseCss = previewBaseCss(readFileSync(join(TOOL, '_shared', 'catalog-ui', 'fx-preview.html'), 'utf8'));
const results = [];
for (const e of data.effects.filter(x => x.fx && !x.supersededBy && (!only.size || only.has(x.id)))) {
  const r = FX.build(e, {}, pal), total = Math.max(r.total, 0.5);
  let html = fxCardPage(FX, e, pal, baseCss);
  html = html.replace(/requestAnimationFrame\(tick\);\s*<\/script>/, 'window.setT=function(x){anims.forEach(function(a){a.currentTime=x*1000})};</script>');
  await cdp('Page.navigate', {url: 'data:text/html;base64,' + Buffer.from(html).toString('base64')});
  await sleep(350);
  const span = Math.min(total, 4);   // los bucles largos (p. ej. 60 s) se muestrean en sus primeros segundos: así no se confunden con una vuelta completa
  const times = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map(k => Math.round(span * k * 100) / 100), frames = [];
  for (const t of times) {
    await cdp('Runtime.evaluate', {expression: `window.setT && setT(${t})`});
    await sleep(60);
    const shot = await cdp('Page.captureScreenshot', {format: 'png'});
    const buf = Buffer.from(shot.data, 'base64');
    if (OUT) writeFileSync(join(OUT, `${e.id}-${String(t).replace('.', '_')}.png`), buf);
    frames.push(decodePng(buf));
  }
  const steps = frames.slice(1).map((f, i) => changed(frames[i], f)), big = changed(frames[0], frames[frames.length - 1]);
  const move = Math.max(...steps, big), inked = Math.max(...frames.map(ink));
  const flag = move < 0.001 ? 'SIN MOVIMIENTO VISIBLE' : inked < 0.005 ? 'NO SE VE NADA' : 'ok';
  results.push({id: e.id, kind: e.kind, total: r.total, move, inked, flag});
  console.log(`${flag === 'ok' ? '✓' : '✗'} ${e.id.padEnd(18)} ${String(e.kind).padEnd(11)} ${r.total.toFixed(2).padStart(5)}s  cambio ${(move * 100).toFixed(1).padStart(5)}%  contenido ${(inked * 100).toFixed(1).padStart(5)}%  ${flag === 'ok' ? '' : flag}`);
}
ws.close(); chrome.kill(); await sleep(500);
try { rmSync(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 200}); } catch { /* Chrome aún libera archivos: es una carpeta temporal */ }
const bad = results.filter(r => r.flag !== 'ok');
console.log(`\n${results.length - bad.length}/${results.length} efectos con movimiento visible` + (bad.length ? `; revisar: ${bad.map(b => b.id).join(', ')}` : ''));
process.exit(bad.length ? 1 : 0);
