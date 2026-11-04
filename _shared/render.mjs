// Render universal de reels/videos verticales (1080x1920, 30 fps) a partir de index.html.
// Uso (SIEMPRE desde la carpeta del video; normalmente lo llama `posts export`):
//   cd <carpeta-del-video>
//   node "$POSTS_DIR/_shared/render.mjs"                     -> reel.mp4 (con sfx.wav)
//   node "$POSTS_DIR/_shared/render.mjs" --no-audio          -> reel.mp4 sin pista de audio (no necesita sfx.wav)
//   node "$POSTS_DIR/_shared/render.mjs" --workers 4         -> reparte el render entre 4 Chrome (por defecto se calcula solo)
//   node "$POSTS_DIR/_shared/render.mjs" --frame 1.8 a.png   -> un solo fotograma en el segundo 1.8 (para revisar, no toca reel.mp4)
// Requiere Google Chrome (o CHROME=/ruta/al/binario), ffmpeg y Node 22+ (WebSocket nativo). Habla con Chrome por CDP.
// Contrato con index.html: define window.seek(t) (puede devolver una Promise) y window.REEL_TOTAL (segundos);
// si el video usa <video>, define window.MEDIA_READY=false hasta tener los clips cargados y luego true.
//
// Varios trabajadores: cada uno es un Chrome independiente que renderiza los fotogramas w, w+N, w+2N...; un único ffmpeg los
// recibe EN ORDEN. Como cada fotograma es función pura del tiempo, el resultado es idéntico al de un solo Chrome.
import {spawn} from 'node:child_process';
import {mkdtempSync, writeFileSync, existsSync, readFileSync} from 'node:fs';
import {tmpdir, cpus, freemem} from 'node:os';
import {join, resolve} from 'node:path';

const dir = process.cwd();
if (!existsSync(join(dir, 'index.html'))) { console.error('No hay index.html aquí. Ejecuta el comando desde la carpeta del video.'); process.exit(1); }
const FPS = 30;
const args = process.argv.slice(2);
const noAudio = args.includes('--no-audio'); if (noAudio) args.splice(args.indexOf('--no-audio'), 1);
let workersOpt = null;
const wi = args.indexOf('--workers');
if (wi >= 0) { workersOpt = parseInt(args[wi + 1]); args.splice(wi, 2); if (!(workersOpt >= 1)) { console.error('--workers debe ser un número entero >= 1'); process.exit(1); } }
const frameMode = args[0] === '--frame';
if (frameMode && (args[1] === undefined || args[2] === undefined)) { console.error('Uso: node render.mjs --frame <segundo> <salida.png>'); process.exit(1); }
if (!frameMode && !noAudio && !existsSync(join(dir, 'sfx.wav'))) { console.error('Falta sfx.wav: corre primero python3 gen_audio.py (o usa --no-audio para un video sin sonido)'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const procs = [];
const killAll = () => { for (const p of procs) { try { p.kill(); } catch {} } };
process.on('exit', killAll);
const fail = m => { console.error('✗ ' + m); killAll(); process.exit(1); };

// ---- cuántos Chrome usar ----
function memAvailableMB() {
  try { const m = readFileSync('/proc/meminfo', 'utf8').match(/MemAvailable:\s+(\d+) kB/); if (m) return Math.floor(+m[1] / 1024); } catch {}
  return Math.floor(freemem() / 1048576);
}
function pickWorkers() {
  if (workersOpt) return {n: Math.min(workersOpt, 8), why: 'indicado con --workers'};
  if (/<video[\s>]/.test(readFileSync(join(dir, 'index.html'), 'utf8'))) return {n: 1, why: 'el video usa clips <video>: buscar muchos clips a la vez falla; fuerza --workers N si quieres probar'};
  const byCpu = Math.max(1, Math.floor(cpus().length / 2)), byMem = Math.max(1, Math.floor(memAvailableMB() / 1000));   // ~1 GB por Chrome (estimación prudente)
  const n = Math.max(1, Math.min(4, byCpu, byMem));
  return {n, why: `automático: ${cpus().length} CPU, ${memAvailableMB()} MB de RAM libre`};
}

// ---- una sesión = un Chrome con la página cargada ----
const base = 9400 + Math.floor(Math.random() * 400);
async function openSession(i) {
  const port = base + i;
  const proc = spawn(process.env.CHROME || 'google-chrome', ['--headless=new', `--remote-debugging-port=${port}`, '--hide-scrollbars',
    '--window-size=1080,1920', '--force-device-scale-factor=1', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'reel-'))}`, 'about:blank'], {stdio: 'ignore'});
  procs.push(proc);
  let targets;
  for (let k = 0; k < 50 && !targets; k++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await sleep(200); } }
  if (!targets) throw new Error('No se pudo conectar con Chrome (¿está instalado? CHROME=/ruta)');
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => (ws.onopen = r));
  let id = 0; const pend = new Map();
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const cdp = (method, params = {}) => new Promise(res => { pend.set(++id, res); ws.send(JSON.stringify({id, method, params})); });
  await cdp('Emulation.setDeviceMetricsOverride', {width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false});
  await cdp('Page.navigate', {url: 'file://' + resolve(dir, 'index.html') + '?rec=1'});
  let ready = false;
  for (let k = 0; k < 150 && !ready; k++) {
    const r = await cdp('Runtime.evaluate', {expression: 'typeof window.seek==="function"&&document.fonts.status==="loaded"&&window.MEDIA_READY!==false'});
    if (r.result.result.value) ready = true; else await sleep(200);
  }
  if (!ready) throw new Error('La página no quedó lista (¿falta window.seek, una fuente o un clip?)');
  await sleep(500);
  const shot = async t => {
    await cdp('Runtime.evaluate', {expression: `seek(${t})`, awaitPromise: true});
    const r = await cdp('Page.captureScreenshot', {format: 'png'});
    return Buffer.from(r.result.data, 'base64');
  };
  const total = (await cdp('Runtime.evaluate', {expression: 'REEL_TOTAL'})).result.result.value;
  return {shot, total};
}

try {
  if (frameMode) {
    const s = await openSession(0);
    writeFileSync(args[2], await s.shot(parseFloat(args[1])));
  } else {
    const {n: N, why} = pickWorkers();
    const t0 = Date.now();
    console.log(`Trabajadores (Chrome): ${N} (${why})`);
    const sessions = await Promise.all(Array.from({length: N}, (_, i) => openSession(i)));
    const total = sessions[0].total, n = Math.round(total * FPS);
    const ffArgs = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      ...(noAudio ? [] : ['-i', join(dir, 'sfx.wav')]), '-t', String(total), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'slow',
      ...(noAudio ? ['-an'] : ['-c:a', 'aac', '-b:a', '192k']), '-movflags', '+faststart', join(dir, 'reel.mp4')];
    const ff = spawn('ffmpeg', ffArgs, {stdio: ['pipe', 'inherit', 'inherit']});
    procs.push(ff);
    const closed = new Promise(r => ff.on('close', r));
    // fotogramas listos fuera de orden -> se escriben en orden; ningún trabajador se adelanta más de LOOK fotogramas (limita la memoria)
    const pending = new Map(); let next = 0, writing = false;
    const LOOK = Math.max(8, N * 4);
    const flush = async () => {
      if (writing) return; writing = true;
      while (pending.has(next)) {
        const b = pending.get(next); pending.delete(next); next++;
        if (!ff.stdin.write(b)) await new Promise(r => ff.stdin.once('drain', r));
        if (next % 60 === 0) console.log(`${next}/${n}`);
      }
      writing = false;
    };
    await Promise.all(sessions.map(async (s, w) => {
      for (let f = w; f < n; f += N) {
        while (f - next > LOOK) await sleep(10);
        pending.set(f, await s.shot(f / FPS));
        flush();
      }
    }));
    while (next < n) { await flush(); await sleep(10); }
    ff.stdin.end();
    await closed;
    console.log(`reel.mp4 listo (${N} trabajador${N > 1 ? 'es' : ''}, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
} catch (e) { fail(e.message || String(e)); }
killAll(); process.exit(0);
