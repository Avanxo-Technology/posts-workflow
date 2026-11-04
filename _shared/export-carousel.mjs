// Exporta las láminas de un carrusel (1080x1350) a PNG con UNA sola sesión de Chrome.
// Uso (desde cualquier carpeta):
//   node posts/_shared/export-carousel.mjs <carpeta-del-post>             -> <post>/png/slide-01.png, slide-02.png, ...
//   node posts/_shared/export-carousel.mjs <carpeta-del-post> 2           -> solo la lámina 2
//   node posts/_shared/export-carousel.mjs <carpeta-del-post> --out DIR   -> escribe en DIR en vez de <post>/png (vista previa sin pisar los definitivos)
// Requiere Google Chrome (o CHROME=/ruta) y Node 22+. Las láminas se detectan solas (<section class="slide">).
// Contrato con index.html: index.html?s=N muestra solo la lámina N a 1080x1350 (ver guía, sección de carruseles).
import {spawn} from 'node:child_process';
import {mkdtempSync, writeFileSync, mkdirSync, existsSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const argv = process.argv.slice(2);
const oi = argv.indexOf('--out');
const outOpt = oi >= 0 ? argv.splice(oi, 2)[1] : null;
const [postArg, onlyArg] = argv;
if (!postArg) { console.error('Uso: node export-carousel.mjs <carpeta-del-post> [N] [--out DIR]'); process.exit(1); }
const post = resolve(postArg), html = join(post, 'index.html');
if (!existsSync(html)) { console.error('No existe ' + html); process.exit(1); }
const total = (readFileSync(html, 'utf8').match(/<section class="slide/g) || []).length;
if (!total) { console.error('index.html no tiene <section class="slide">'); process.exit(1); }
const slides = onlyArg ? [parseInt(onlyArg)] : Array.from({length: total}, (_, i) => i + 1);
if (slides.some(n => !(n >= 1 && n <= total))) { console.error(`Lámina fuera de rango (hay ${total})`); process.exit(1); }
const out = outOpt ? resolve(outOpt) : join(post, 'png');
mkdirSync(out, {recursive: true});

const PORT = 9900 + Math.floor(Math.random() * 90);
const chrome = spawn(process.env.CHROME || 'google-chrome', ['--headless=new', `--remote-debugging-port=${PORT}`, '--hide-scrollbars',
  '--window-size=1080,1350', '--force-device-scale-factor=1', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'car-'))}`, 'about:blank'], {stdio: 'ignore'});
const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50 && !targets; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch { await sleep(200); } }
if (!targets) { console.error('No se pudo conectar con Chrome'); chrome.kill(); process.exit(1); }
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const cdp = (method, params = {}) => new Promise(res => { pend.set(++id, res); ws.send(JSON.stringify({id, method, params})); });
await cdp('Page.enable');
await cdp('Emulation.setDeviceMetricsOverride', {width: 1080, height: 1350, deviceScaleFactor: 1, mobile: false});

// espera fuentes + imágenes cargadas (img y fondos url()) antes de capturar
const READY = `(async()=>{await document.fonts.ready;
  const imgs=[...document.images];await Promise.all(imgs.map(i=>i.complete?0:new Promise(r=>{i.onload=i.onerror=r})));
  const bg=[...document.querySelectorAll('*')].map(e=>getComputedStyle(e).backgroundImage).filter(v=>v&&v.includes('url('));
  await Promise.all(bg.map(v=>{const m=v.match(/url\\("?([^")]+)"?\\)/);if(!m)return;return new Promise(r=>{const i=new Image();i.onload=i.onerror=r;i.src=m[1]})}));
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true})()`;
let bad = 0;
for (const n of slides) {
  await cdp('Page.navigate', {url: 'file://' + html + '?s=' + n});
  let ok = false;
  for (let i = 0; i < 100 && !ok; i++) {
    const r = await cdp('Runtime.evaluate', {expression: 'document.readyState', returnByValue: true});
    if (r.result.result.value === 'complete') ok = true; else await sleep(100);
  }
  const rd = await cdp('Runtime.evaluate', {expression: READY, awaitPromise: true, returnByValue: true});
  if (!rd.result.result.value) { console.error(`lámina ${n}: no quedó lista`); bad++; continue; }
  const r = await cdp('Page.captureScreenshot', {format: 'png', clip: {x: 0, y: 0, width: 1080, height: 1350, scale: 1}});
  const file = join(out, `slide-${String(n).padStart(2, '0')}.png`);
  writeFileSync(file, Buffer.from(r.result.data, 'base64'));
  console.log('ok lámina', n, '->', file);
}
ws.close(); chrome.kill(); process.exit(bad ? 1 : 0);
