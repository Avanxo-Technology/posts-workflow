// Render universal de reels/videos verticales (1080x1920, 30 fps) a partir de index.html.
// Uso (SIEMPRE desde la carpeta del video):
//   cd <carpeta-del-video>
//   node "$POSTS_DIR/_shared/render.mjs"             -> reel.mp4 (con sfx.wav)
//   node "$POSTS_DIR/_shared/render.mjs" --no-audio   -> reel.mp4 sin pista de audio (no necesita sfx.wav)
//   node "$POSTS_DIR/_shared/render.mjs" --frame 1.8 a.png -> un solo fotograma en el segundo 1.8 (para revisar, no toca reel.mp4)
// Requiere Google Chrome (o CHROME=/ruta/al/binario), ffmpeg y Node 22+ (WebSocket nativo). Habla con Chrome por CDP.
// Contrato con index.html: define window.seek(t) (puede devolver una Promise) y window.REEL_TOTAL (segundos);
// si el video usa <video>, define window.MEDIA_READY=false hasta tener los clips cargados y luego true.
import {spawn} from 'node:child_process';
import {mkdtempSync, writeFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const dir = process.cwd();
if (!existsSync(join(dir, 'index.html'))) { console.error('No hay index.html aquí. Ejecuta el comando desde la carpeta del video.'); process.exit(1); }
const FPS = 30, PORT = 9400 + Math.floor(Math.random() * 500);
const args = process.argv.slice(2);
const noAudio = args.includes('--no-audio'); if (noAudio) args.splice(args.indexOf('--no-audio'), 1);
const frameMode = args[0] === '--frame';
if (frameMode && (args[1] === undefined || args[2] === undefined)) { console.error('Uso: node render.mjs --frame <segundo> <salida.png>'); process.exit(1); }
if (!frameMode && !noAudio && !existsSync(join(dir, 'sfx.wav'))) { console.error('Falta sfx.wav: corre primero python3 gen_audio.py (o usa --no-audio para un video sin sonido)'); process.exit(1); }

const chrome = spawn(process.env.CHROME || 'google-chrome', ['--headless=new', `--remote-debugging-port=${PORT}`, '--hide-scrollbars',
  '--window-size=1080,1920', '--force-device-scale-factor=1', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'reel-'))}`, 'about:blank'],
  {stdio: 'ignore'});
const sleep = ms => new Promise(r => setTimeout(r, ms));

let targets;
for (let i = 0; i < 50 && !targets; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch { await sleep(200); }
}
if (!targets) { console.error('No se pudo conectar con Chrome'); chrome.kill(); process.exit(1); }
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const cdp = (method, params = {}) => new Promise(res => { pend.set(++id, res); ws.send(JSON.stringify({id, method, params})); });

await cdp('Emulation.setDeviceMetricsOverride', {width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false});
await cdp('Page.navigate', {url: 'file://' + resolve(dir, 'index.html') + '?rec=1'});
let ready = false;
for (let i = 0; i < 150 && !ready; i++) {
  const r = await cdp('Runtime.evaluate', {expression: 'typeof window.seek==="function"&&document.fonts.status==="loaded"&&window.MEDIA_READY!==false'});
  if (r.result.result.value) ready = true; else await sleep(200);
}
if (!ready) { console.error('La página no quedó lista (¿falta window.seek, una fuente o un clip?)'); chrome.kill(); process.exit(1); }
await sleep(500);

const shot = async t => {
  await cdp('Runtime.evaluate', {expression: `seek(${t})`, awaitPromise: true});
  const r = await cdp('Page.captureScreenshot', {format: 'png'});
  return Buffer.from(r.result.data, 'base64');
};

if (frameMode) {
  writeFileSync(args[2], await shot(parseFloat(args[1])));
} else {
  const total = (await cdp('Runtime.evaluate', {expression: 'REEL_TOTAL'})).result.result.value;
  const n = Math.round(total * FPS);
  const ffArgs = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    ...(noAudio ? [] : ['-i', join(dir, 'sfx.wav')]), '-t', String(total), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'slow',
    ...(noAudio ? ['-an'] : ['-c:a', 'aac', '-b:a', '192k']), '-movflags', '+faststart', join(dir, 'reel.mp4')];
  const ff = spawn('ffmpeg', ffArgs, {stdio: ['pipe', 'inherit', 'inherit']});
  for (let f = 0; f < n; f++) {
    if (!ff.stdin.write(await shot(f / FPS))) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 60 === 0) console.log(`${f}/${n}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('reel.mp4 listo');
}
ws.close(); chrome.kill(); process.exit(0);
