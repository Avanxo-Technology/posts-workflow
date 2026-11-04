#!/usr/bin/env node
// CLI de producción de posts (carruseles y videos). Sin dependencias: Node 22+, Chrome, ffmpeg/ffprobe, Python 3.
// Uso:  posts <comando> ...      (ver `posts help`)
// TOOL  = este repositorio (herramientas, plantillas, marcas, docs).
// POSTS = carpeta donde viven las piezas (<marca>/<mes>/...). Se define con: variable POSTS_DIR, o el archivo .posts-dir del repo
//         (lo escribe `posts init <ruta>`).
import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync, statSync, symlinkSync, lstatSync} from 'node:fs';
import {dirname, join, resolve, basename, relative, isAbsolute} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = resolve(HERE, '..');
const cfg = join(TOOL, '.posts-dir');
const POSTS_RAW = process.env.POSTS_DIR || (existsSync(cfg) ? read0(cfg).trim() : '');
const POSTS = POSTS_RAW ? resolve(POSTS_RAW) : '';
// Carpeta que contiene los proyectos (aga-growth-website, gmaq, ...). Los archivos de diseño de brands/*.json son relativos a ella.
const PROJECTS = resolve(process.env.PROJECTS_DIR || (POSTS ? dirname(POSTS) : '.'));
function read0(p) { return readFileSync(p, 'utf8'); }
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ls = d => (existsSync(d) ? readdirSync(d, {withFileTypes: true}) : []);
const dirs = d => ls(d).filter(e => e.isDirectory()).map(e => e.name);
const read = p => readFileSync(p, 'utf8');
const mtime = p => statSync(p).mtimeMs;
const die = m => { console.error('✗ ' + m); process.exit(1); };

function brandOf(name) {
  const p = join(TOOL, 'brands', name + '.json');
  if (!existsSync(p)) die(`Marca desconocida "${name}". Marcas: ${brands().join(', ')}`);
  return {id: name, ...JSON.parse(read(p))};
}
function brands() { return ls(join(TOOL, 'brands')).filter(e => e.name.endsWith('.json')).map(e => e.name.slice(0, -5)); }
function flag(args, name, takesValue = true) {
  const i = args.indexOf(name); if (i < 0) return null;
  const v = takesValue ? args[i + 1] : true; args.splice(i, takesValue ? 2 : 1); return v;
}
const run = (cmd, a, opt = {}) => spawnSync(cmd, a, {encoding: 'utf8', ...opt});
const probe = (f, entries) => {
  const r = run('ffprobe', ['-v', 'error', '-show_entries', entries, '-of', 'json', f]);
  try { return JSON.parse(r.stdout); } catch { return {}; }
};

function designOf(b) {
  const r = p => { if (!p) return null; const abs = isAbsolute(p) ? p : join(PROJECTS, p); return {path: abs, exists: existsSync(abs)}; };
  return {main: r(b.designFile), extra: (b.designExtra || []).map(r)};
}
function piecesOf(name, b) {
  const base = join(POSTS, name), out = [];
  for (const m of dirs(base).filter(d => d !== '_shared')) {
    const scan = d => { for (const n of dirs(d)) if (existsSync(join(d, n, 'index.html'))) out.push(join(d, n)); };
    scan(join(base, m)); scan(join(base, m, 'postVideos')); for (const r of dirs(join(base, m, 'reels'))) scan(join(base, m, 'reels', r));
  }
  return out;
}

// ---- sonido por pieza: piece.json {"sound": true|false} (por defecto true) ----
const soundOf = (dir, override) => override === 'on' ? true : override === 'off' ? false : (() => { try { return JSON.parse(read(join(dir, 'piece.json'))).sound !== false; } catch { return true; } })();
function setSound(dir, on) { let j = {}; try { j = JSON.parse(read(join(dir, 'piece.json'))); } catch {} j.sound = on; writeFileSync(join(dir, 'piece.json'), JSON.stringify(j, null, 2) + '\n'); }
const checkSoundArg = v => { if (v !== null && !['on', 'off'].includes(v)) die('--sound debe ser on u off'); return v; };

// ---- localizar una pieza ----
function resolvePiece(arg) {
  if (!arg) die('Falta la carpeta de la pieza (ej. aga/noviembre/postVideos/postVideo1)');
  // orden: ruta absoluta; relativa a la raíz de posts (POSTS_DIR); y por último relativa a la carpeta actual
  const parts = arg.split('/').filter(Boolean);
  const cands = arg.startsWith('/') ? [arg] : [join(POSTS, arg), ...(parts.length >= 3 ? [join(POSTS, ...parts.slice(0, -1), 'postVideos', parts.at(-1))] : []), resolve(arg)];
  const f = cands.find(c => existsSync(join(c, 'index.html')));
  if (!f) die(`No encuentro index.html en: ${arg}`);
  return f;
}
const isCarousel = dir => /<section class="slide/.test(read(join(dir, 'index.html')));
function ctxOf(dir) { // marca, mes y profundidad a partir de la ruta
  const rel = relative(POSTS, dir).split('/');
  return {brand: rel[0], month: rel[1]};
}

// ---- numeración: considera estructuras antiguas para no repetir números ----
function nextNumber(base, month, kind, legacy) {
  const months = [month, legacy?.[month]].filter(Boolean);
  const rx = kind === 'carousel' ? /^post(\d+)$/ : /^(?:postVideo|reel)(\d+)$/;
  let max = 0;
  for (const m of months) {
    const roots = kind === 'carousel' ? [join(base, m)] : [join(base, m), join(base, m, 'postVideos'), join(base, m, 'reels'), join(base, m, 'reels', month)];
    for (const r of roots) for (const n of dirs(r)) { const k = n.match(rx); if (k) max = Math.max(max, +k[1]); }
  }
  return max + 1;
}

// ---- init: enlaza el repo con la carpeta de posts ----
function cmdInit(args) {
  const target = args[0] ? resolve(args[0]) : (POSTS || die('Uso: posts init <carpeta-de-posts>'));
  if (!existsSync(target)) die(`No existe ${target}`);
  writeFileSync(cfg, target + '\n');
  const links = [['_shared', '_shared'], ['brands', 'brands'], ['docs', 'docs'], ['AGENTS.md', 'AGENTS.md'], ['CLAUDE.md', 'CLAUDE.md'],
    ['WORKFLOW.md', 'WORKFLOW.md'], ['guia-posts.txt', 'guia-posts.txt'], ['posts', 'posts'],
    ...brands().map(b => [join('brands', b, '_shared'), join(b, '_shared')])];
  for (const [from, to] of links) {
    const dest = join(target, to), src = join(TOOL, from);
    if (!existsSync(src)) continue;
    let state = 'enlazado';
    try { lstatSync(dest); state = 'ya existe (no se toca)'; } catch { mkdirSync(dirname(dest), {recursive: true}); symlinkSync(src, dest); }
    console.log(`  ${to.padEnd(28)} ${state}`);
  }
  console.log(`Listo. Raíz de posts: ${target}`);
}


// ---- brand: alta de marcas nuevas (todo lo necesario sale de _shared/base, sin descargas) ----
const hex = v => /^#[0-9a-fA-F]{6}$/.test(v || '');
const mix = (h, t, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - k) + t * k).toString(16).padStart(2, '0')).join('');
function cmdBrand(args) {
  const [sub, ...rest] = args;
  if (sub === 'show') {
    const id = rest[0]; if (!id) die('Uso: posts brand show <marca>');
    const b = brandOf(id), c = b.contact || {}, d = designOf(b);
    const sh = join(TOOL, 'brands', id, '_shared'), sfx = join(sh, 'sfx');
    const nsfx = existsSync(sfx) ? ls(sfx).filter(e => e.name.endsWith('.wav')).length : 0;
    const ps = piecesOf(id, b), cars = ps.filter(isCarousel);
    console.log(`${id}: ${b.name}`);
    console.log(`colores: oscuro ${b.dark} · claro ${b.light} · acento ${b.accent}   fuentes: ${b.headFont} (títulos) + ${b.bodyFont} (texto)`);
    console.log('contacto: ' + (Object.entries(c).map(([k, v]) => `${k} ${v}`).join(' · ') || '(sin datos: completar brands/' + id + '.json)'));
    console.log(`sonido: ${b.sound}` + (existsSync(join(sh, 'fetch_sfx.py')) ? (nsfx ? ` (${nsfx} efectos)` : ` — FALTAN efectos: python3 brands/${id}/_shared/fetch_sfx.py`) : ''));
    console.log('diseño: ' + (d.main ? `${d.main.path} ${d.main.exists ? '' : '(NO existe en este equipo: pedir la ruta al usuario)'}` : '(sin archivo: pedir la ruta al usuario o usar el CSS del sitio)') + (d.extra.length ? ' · extra: ' + d.extra.filter(e => e.exists).map(e => e.path).join(', ') : ''));
    console.log(`datos y reglas de la marca: brands/${id}.md   plantilla de video: ${existsSync(join(sh, 'video-template.html')) ? 'sí' : 'NO'}`);
    console.log(`piezas: ${ps.length} (${cars.length} carruseles, ${ps.length - cars.length} videos)`);
    const caps = ps.map(p => join(p, 'caption.txt')).filter(existsSync).sort((a, z) => mtime(z) - mtime(a)).slice(0, 10);
    if (caps.length) console.log('ideas ya hechas (primera línea de cada caption, recientes primero):');
    for (const f of caps) console.log('  - ' + read(f).split('\n')[0].trim().slice(0, 110));
    return;
  }
  if (sub === 'list' || sub === undefined) {
    for (const id of brands()) { const b = brandOf(id); console.log(`${id.padEnd(14)} ${b.name}  ·  sonido: ${b.sound || 'synth'}  ·  diseño: ${b.designFile || '(sin archivo)'}`); }
    return;
  }
  if (sub !== 'add') die('Uso: posts brand list | posts brand show <marca> | posts brand add <id> --name "Nombre" --dark #hex --light #hex --accent #hex --head "Fuente" [--body "Fuente"] [--short "SIGLA"] [--whatsapp ...] [--web ...] [--design ruta]');
  const a = [...rest], id = a.shift();
  const f = n => flag(a, n);
  const o = {name: f('--name'), short: f('--short'), dark: f('--dark'), light: f('--light'), accent: f('--accent'), head: f('--head'),
    body: f('--body') || 'Inter', wa: f('--whatsapp') || 'WhatsApp', web: f('--web') || 'tusitio.com', design: f('--design'), email: f('--email')};
  if (!id || !/^[a-z0-9-]+$/.test(id)) die('El id de la marca va en minúsculas, sin espacios (ej. mimarca)');
  if (existsSync(join(TOOL, 'brands', id + '.json'))) die(`La marca "${id}" ya existe`);
  for (const [k, v] of [['--dark', o.dark], ['--light', o.light], ['--accent', o.accent]]) if (!hex(v)) die(`${k} debe ser un color #RRGGBB`);
  if (!o.name || !o.head) die('Faltan --name y --head (fuente de Google Fonts para los títulos)');
  o.short = o.short || o.name.toUpperCase();
  const gf = n => 'family=' + n.replace(/ /g, '+') + ':wght@400;700';
  const fonts = 'https://fonts.googleapis.com/css2?' + [...new Set([o.head, o.body])].map(gf).join('&') + '&display=swap';
  const bg2 = mix(o.dark, 255, 0.1), accentDark = mix(o.accent, 0, 0.25);
  const bdir = join(TOOL, 'brands', id, '_shared');
  mkdirSync(bdir, {recursive: true});
  const fill = t => t.replaceAll('__BRAND__', o.short).replaceAll('__FONTS__', fonts).replaceAll('__HEAD__', `'${o.head}'`).replaceAll('__BODY__', `'${o.body}'`)
    .replaceAll('__WA__', o.wa).replaceAll('__WEB__', o.web)
    .replaceAll('__VARS__', `  --bg:${o.dark};--bg2:${bg2};--accent:${o.accent};--accent-dark:${accentDark};--light:${o.light};`);
  writeFileSync(join(bdir, 'video-template.html'), fill(read(join(TOOL, '_shared', 'base', 'video-template.html'))));
  copyFileSync(join(TOOL, '_shared', 'base', 'synth.py'), join(bdir, 'synth.py'));
  copyFileSync(join(TOOL, '_shared', 'base', 'gen_audio.template.py'), join(bdir, 'gen_audio.template.py'));
  writeFileSync(join(TOOL, 'brands', id + '.json'), JSON.stringify({name: o.name, short: o.short, sound: 'synth (sin música)', designFile: o.design || null, designExtra: [], contact: {whatsapp: o.wa, ...(o.email ? {email: o.email} : {}), web: o.web},
    fonts, headFont: o.head, bodyFont: o.body, dark: o.dark, light: o.light, accent: o.accent, legacyMonths: {}}, null, 2) + '\n');
  writeFileSync(join(TOOL, 'brands', id + '.md'), `# Marca: ${id}

${o.name}

DATOS A COMPLETAR (verificar contra el sitio real antes de usarlos)
  Sitio web:   ${o.web}
  Contacto:    ${o.wa}
  Logo:        (ruta de los archivos del logo)
  Tipografía:  ${o.head} (títulos) + ${o.body} (texto)
  Colores:     fondo oscuro ${o.dark}, claro ${o.light}, acento ${o.accent}
  Diseño:      ${o.design || '(sin archivo de diseño: pedir la ruta al usuario o usar el CSS del sitio)'}

RECURSOS
  brands/${id}/_shared/: video-template.html, synth.py (sonido sintetizado, sin descargas ni música), gen_audio.template.py.
  Sonido: SINTETIZADO (docs/audio.md, enfoque C).
`);
  console.log(`✓ Marca "${id}" creada en ${join(TOOL, 'brands')}`);
  if (POSTS) {
    const dest = join(POSTS, id, '_shared');
    try { lstatSync(dest); } catch { mkdirSync(dirname(dest), {recursive: true}); symlinkSync(bdir, dest); console.log(`✓ Enlazada en ${dest}`); }
  } else console.log('Falta definir la carpeta de posts: posts init <ruta> (enlaza los recursos de la marca).');
  console.log(`Completa brands/${id}.md y contact en brands/${id}.json. Para subirla al repo: git add brands/${id}.* brands/${id}/ && git commit && git push (solo si el usuario lo pide).`);
}

// ---- sound: activar/desactivar el sonido de una pieza de video ----
function cmdSound(args) {
  const [p, v] = args; const dir = resolvePiece(p);
  if (isCarousel(dir)) die('Un carrusel no tiene sonido');
  if (!v) { console.log(soundOf(dir) ? 'on' : 'off'); return; }
  if (!['on', 'off'].includes(v)) die('Uso: posts sound <video> [on|off]');
  setSound(dir, v === 'on');
  if (v === 'on') {
    const tpl = join(POSTS, ctxOf(dir).brand, '_shared', 'gen_audio.template.py');
    if (!existsSync(join(dir, 'gen_audio.py')) && existsSync(tpl)) { copyFileSync(tpl, join(dir, 'gen_audio.py')); console.log('Se copió gen_audio.py (plantilla): ajusta sus tiempos a index.html y corre posts audio'); }
  }
  console.log(`Sonido ${v === 'on' ? 'activado' : 'desactivado'}: el video se graba ${v === 'on' ? 'con sfx.wav' : 'sin audio'}`);
}

// ---- analyze: material para que la IA estudie un video de referencia (transiciones, ritmo) ----
function cmdAnalyze(args) {
  const outOpt = flag(args, '--out'), max = parseInt(flag(args, '--max') || '8'), thr = flag(args, '--threshold') || '0.12', from = flag(args, '--from'), to = flag(args, '--to');
  const file = args[0] && resolve(args[0]);
  if (!file || !existsSync(file)) die('Uso: posts analyze <video.mp4> [--from s --to s] [--out DIR] [--max N] [--threshold 0.12]');
  const out = outOpt ? resolve(outOpt) : join(POSTS, '_refs', basename(file).replace(/\.[^.]+$/, ''));
  mkdirSync(out, {recursive: true});
  if (from !== null && to !== null) {   // zoom a un tramo: fotogramas cada 0.2 s (la forma de ver CÓMO es una transición)
    const a = parseFloat(from), b = parseFloat(to), n = Math.max(1, Math.round((b - a) * 5)), cols = Math.min(8, n), rows = Math.ceil(n / cols);
    const f = join(out, `window_${a}-${b}.png`);
    run('ffmpeg', ['-v', 'error', '-y', '-ss', String(a), '-t', String(b - a), '-i', file, '-vf', `fps=5,scale=216:-2,tile=${cols}x${rows}`, '-frames:v', '1', f]);
    console.log(existsSync(f) ? `tramo ${a}-${b} s: ${n} fotogramas (1 cada 0.2 s, de izquierda a derecha, arriba a abajo) -> ${f}` : 'No se pudo generar el tramo');
    return;
  }
  const j = probe(file, 'stream=codec_type,codec_name,width,height,r_frame_rate:format=duration');
  const v = j.streams?.find(x => x.codec_type === 'video'), au = j.streams?.find(x => x.codec_type === 'audio');
  if (!v) die('El archivo no tiene pista de video');
  const dur = parseFloat(j.format.duration), [fn, fd] = v.r_frame_rate.split('/').map(Number), fps = fd ? fn / fd : fn;
  // cortes de escena (cambio brusco entre fotogramas); las transiciones animadas suelen producir 1-3 detecciones seguidas
  const r = run('ffmpeg', ['-v', 'info', '-i', file, '-vf', `select='gt(scene,${thr})',showinfo`, '-an', '-f', 'null', '-'], {maxBuffer: 1 << 26});
  const all = [...(r.stderr || '').matchAll(/pts_time:([\d.]+)/g)].map(m => parseFloat(m[1]));
  const cuts = []; for (const t of all) if (!cuts.length || t - cuts.at(-1) > 0.6) cuts.push(t);
  const pick = cuts.length > max ? Array.from({length: max}, (_, i) => cuts[Math.round(i * (cuts.length - 1) / (max - 1))]) : cuts;
  const files = [];
  pick.forEach((c, i) => {   // 6 fotogramas alrededor del corte (cada 0.2 s): ahí se ve el tipo de transición
    const f = join(out, `cut_${String(i + 1).padStart(2, '0')}.png`), t0 = Math.max(0, c - 0.6);
    run('ffmpeg', ['-v', 'error', '-y', '-ss', String(t0), '-t', '1.3', '-i', file, '-vf', 'fps=5,scale=270:-2,tile=6x1', '-frames:v', '1', f]);
    if (existsSync(f)) files.push([c, f]);
  });
  const ov = join(out, 'overview.png');   // 10 fotogramas repartidos: composición y ritmo general
  run('ffmpeg', ['-v', 'error', '-y', '-i', file, '-vf', `fps=10/${dur.toFixed(2)},scale=216:-2,tile=10x1`, '-frames:v', '1', ov]);
  const lines = [`archivo: ${file}`, `video: ${v.width}x${v.height} · ${fps.toFixed(0)} fps · ${dur.toFixed(1)} s · audio: ${au ? au.codec_name : 'no'}`,
    `cortes bruscos detectados: ${cuts.length} (umbral ${thr}; las transiciones animadas suelen NO detectarse: usar overview.png y --from/--to)` + (cuts.length ? ' en ' + cuts.map(t => t.toFixed(1) + 's').join(', ') : ''),
    cuts.length ? `duración media por escena: ${(dur / (cuts.length + 1)).toFixed(1)} s` : 'sin cortes: video continuo o transiciones suaves (prueba --threshold 0.15)',
    `imágenes (la IA debe MIRARLAS): ${existsSync(ov) ? ov : ''}`, ...files.map(([c, f]) => `  corte en ${c.toFixed(1)} s -> ${f}  (6 fotogramas de ${(Math.max(0, c - 0.6)).toFixed(1)} a ${(c + 0.6).toFixed(1)} s)`),
    'Siguiente: ver el overview, localizar los cambios de escena y pedir el tramo: posts analyze <video> --from <seg> --to <seg>. Guía: docs/reference-video.md'];
  writeFileSync(join(out, 'ref.txt'), lines.join('\n') + '\n');
  console.log(lines.join('\n'));
}

// ---- doctor: comprueba requisitos y dice cómo instalar lo que falte ----
function cmdDoctor(args) {
  const gosite = flag(args, '--gosite', false);
  const osr = existsSync('/etc/os-release') ? read('/etc/os-release') : '';
  const id = (osr.match(/^ID=(.*)$/m) || [, ''])[1].replace(/"/g, ''), like = (osr.match(/^ID_LIKE=(.*)$/m) || [, ''])[1].replace(/"/g, '');
  const kind = process.platform === 'darwin' ? 'mac' : /debian|ubuntu/.test(id + ' ' + like) ? 'apt' : /fedora|rhel|centos/.test(id + ' ' + like) ? 'dnf' : /arch/.test(id + ' ' + like) ? 'pacman' : 'otro';
  const has = c => run('sh', ['-c', `command -v ${c}`]).status === 0;
  const ver = (c, a = ['--version']) => (run(c, a).stdout || '').split('\n')[0].trim();
  const H = {
    node: {mac: 'brew install node@22', apt: 'instalar nvm (https://github.com/nvm-sh/nvm) y luego: nvm install 22', dnf: 'instalar nvm (https://github.com/nvm-sh/nvm) y luego: nvm install 22', pacman: 'sudo pacman -S nodejs npm   (o nvm install 22)', otro: 'instalar Node 22+ (nvm install 22)'},
    chrome: {mac: 'brew install --cask google-chrome', apt: 'curl -fLO https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && sudo apt install -y ./google-chrome-stable_current_amd64.deb   (alternativa: sudo apt install -y chromium y usar CHROME=chromium)', dnf: 'instalar Google Chrome desde https://www.google.com/chrome/ (o chromium y CHROME=chromium)', pacman: 'yay -S google-chrome   (o sudo pacman -S chromium y CHROME=chromium)', otro: 'instalar Google Chrome o Chromium (variable CHROME=/ruta si no se llama google-chrome)'},
    ffmpeg: {mac: 'brew install ffmpeg', apt: 'sudo apt install -y ffmpeg', dnf: 'sudo dnf install -y ffmpeg   (puede requerir RPM Fusion)', pacman: 'sudo pacman -S ffmpeg', otro: 'instalar ffmpeg (incluye ffprobe)'},
    python: {mac: 'brew install python', apt: 'sudo apt install -y python3', dnf: 'sudo dnf install -y python3', pacman: 'sudo pacman -S python', otro: 'instalar Python 3'},
    git: {mac: 'brew install git', apt: 'sudo apt install -y git', dnf: 'sudo dnf install -y git', pacman: 'sudo pacman -S git', otro: 'instalar git'},
  };
  const rows = []; let miss = 0;
  const add = (name, ok, detail, hint) => { rows.push(ok ? `[OK]    ${name}: ${detail}` : `[FALTA] ${name}  ->  ${hint}`); if (!ok) miss++; };
  const nv = parseInt((process.versions.node || '0').split('.')[0]);
  add('Node 22+', nv >= 22, 'v' + process.versions.node, H.node[kind] + (nv && nv < 22 ? `  (hay v${process.versions.node}; se necesita 22 o superior)` : ''));
  const chrome = process.env.CHROME || 'google-chrome';
  add('Chrome/Chromium', has(chrome), ver(chrome) || chrome, H.chrome[kind]);
  add('ffmpeg', has('ffmpeg'), ver('ffmpeg', ['-version']).slice(0, 40), H.ffmpeg[kind]);
  add('ffprobe', has('ffprobe'), 'ok', H.ffmpeg[kind]);
  add('Python 3', has('python3'), ver('python3'), H.python[kind]);
  add('git', has('git'), ver('git'), H.git[kind]);
  if (gosite) {
    add('docker', has('docker') && run('docker', ['info']).status === 0, 'activo', 'instalar y abrir Docker (Docker Desktop o Docker Engine); `docker info` debe responder');
    add('gosite', has('gosite'), ver('gosite', ['--help']).slice(0, 40), 'instalar gosite siguiendo su documentación');
  }
  add('carpeta de posts', !!POSTS && existsSync(POSTS), POSTS, 'ejecutar: posts init <carpeta-de-posts>');
  console.log(`Sistema: ${kind}${id ? ' (' + id + ')' : ''}\n` + rows.join('\n') + `\n${miss ? miss + ' requisito(s) faltan: ejecuta los comandos indicados (si piden sudo, que el usuario los corra con "! comando") y repite posts doctor.' : 'Todo listo.'}`);
  process.exit(miss ? 1 : 0);
}

// ---- comandos ----
function cmdNew(args) {
  const month = flag(args, '--month') || MESES[new Date().getMonth()];
  const title = flag(args, '--title') || 'TÍTULO';
  const sound = checkSoundArg(flag(args, '--sound')) || 'on';
  const [bn, kind] = args;
  if (!bn || !['carousel', 'video'].includes(kind)) die('Uso: posts new <marca> carousel|video [--title "Tema"] [--month mes] [--sound on|off]');
  const b = brandOf(bn), base = join(POSTS, bn), shared = join(base, '_shared');
  if (!MESES.includes(month)) die(`Mes inválido "${month}" (en español y minúsculas)`);
  const n = nextNumber(base, month, kind, b.legacyMonths);
  if (kind === 'carousel') {
    const dir = join(base, month, `post${n}`);
    mkdirSync(join(dir, 'img'), {recursive: true}); mkdirSync(join(dir, 'png'), {recursive: true});
    const t = read(join(TOOL, '_shared', 'carousel-template.html'))
      .replaceAll('__BRAND__', b.short).replaceAll('__TITLE__', title)
      .replaceAll('__FONTS__', b.fonts).replaceAll('__C1__', b.dark).replaceAll('__C2__', b.light).replaceAll('__ACCENT__', b.accent)
      .replaceAll('__HEAD__', b.headFont).replaceAll('__BODY__', b.bodyFont);
    writeFileSync(join(dir, 'index.html'), t);
    console.log(dir);
  } else {
    if (!existsSync(shared)) die(`Falta ${shared}: ejecuta "posts init" para enlazar los recursos de la marca`);
    const dir = join(base, month, 'postVideos', `postVideo${n}`);
    mkdirSync(join(dir, 'img'), {recursive: true});
    const tpl = join(shared, 'video-template.html');
    if (!existsSync(tpl)) die(`Falta ${tpl}`);
    writeFileSync(join(dir, 'index.html'), read(tpl).replaceAll('__TOTAL__', '8').replace('– TÍTULO', '– ' + title));
    setSound(dir, sound === 'on');
    const ga = join(shared, 'gen_audio.template.py');
    if (sound === 'on' && existsSync(ga)) copyFileSync(ga, join(dir, 'gen_audio.py'));
    if (bn === 'aga') { // los logos viven en el img/ de cada video: heredar los del último video de AGA
      const old = [...dirs(base)].flatMap(m => dirs(join(base, m, 'postVideos')).map(v => join(base, m, 'postVideos', v)))
        .filter(v => v !== dir && existsSync(join(v, 'img', 'logo-white.png'))).sort((a, c) => mtime(c) - mtime(a))[0];
      if (old) for (const f of ['logo-white.png', 'logo-dark.png']) if (existsSync(join(old, 'img', f))) copyFileSync(join(old, 'img', f), join(dir, 'img', f));
    }
    console.log(dir);
  }
}

function cmdList(args) {
  const [bn, month] = args;
  const bs = bn ? [bn] : brands();
  for (const name of bs) {
    const b = brandOf(name), base = join(POSTS, name);
    console.log(`\n${b.name} (${name})  recursos: ${existsSync(join(base, '_shared')) ? name + '/_shared' : 'FALTA _shared'}`);
    for (const m of dirs(base).filter(d => d !== '_shared' && (!month || d === month || b.legacyMonths?.[month] === d))) {
      const items = [];
      const scan = (d, prefix = '') => { for (const n of dirs(d)) { const p = join(d, n); if (existsSync(join(p, 'index.html'))) items.push(p); } };
      scan(join(base, m)); scan(join(base, m, 'postVideos')); for (const r of dirs(join(base, m, 'reels'))) scan(join(base, m, 'reels', r));
      for (const p of items.sort()) {
        const car = isCarousel(p);
        const pngs = ls(join(p, 'png')).filter(e => e.name.endsWith('.png')).length;
        const state = car ? `${pngs} PNG` : existsSync(join(p, 'reel.mp4')) ? 'reel.mp4' : 'sin render';
        console.log(`  ${car ? 'carrusel' : 'video   '}  ${relative(POSTS, p).padEnd(52)} ${state.padEnd(10)} ${existsSync(join(p, 'caption.txt')) ? 'caption ✓' : 'sin caption'}`);
      }
    }
  }
}

function cmdPreview(args) {
  const open = flag(args, '--open', false);
  const [p, at] = args; const dir = resolvePiece(p);
  const q = isCarousel(dir) ? (at ? `?s=${at}` : '') : (at ? `?t=${at}` : '');
  const url = pathToFileURL(join(dir, 'index.html')).href + q;
  console.log(url);
  if (open) run('xdg-open', [url]);
}

function cmdAudio(args) {
  const dir = resolvePiece(args[0]);
  if (!soundOf(dir)) { console.log('Sonido desactivado en esta pieza (piece.json). Actívalo con: posts sound <pieza> on'); return; }
  if (!existsSync(join(dir, 'gen_audio.py'))) die('No hay gen_audio.py en esa carpeta');
  const r = run('python3', ['gen_audio.py'], {cwd: dir, stdio: 'inherit'});
  process.exit(r.status ?? 1);
}

function cmdExport(args) {
  const outDir = flag(args, '--out'), frame = flag(args, '--frame'), yes = flag(args, '--yes', false), snd = checkSoundArg(flag(args, '--sound')), workers = flag(args, '--workers');
  const dir = resolvePiece(args[0]);
  if (isCarousel(dir)) {
    const a = [join(HERE, 'export-carousel.mjs'), dir]; if (args[1]) a.push(args[1]); if (outDir) a.push('--out', outDir);
    process.exit(run('node', a, {stdio: 'inherit'}).status ?? 1);
  }
  const a = [join(HERE, 'render.mjs')];
  if (frame === null && !yes) {
    console.error('✗ Esto graba reel.mp4 (tarda varios minutos). Solo se hace cuando el usuario lo indica: repite con --yes.\n  Para revisar sin grabar: posts export <video> --frame <segundo> <salida.png>');
    process.exit(2);
  }
  if (frame === null && !soundOf(dir, snd)) a.push('--no-audio');
  if (frame === null && workers) a.push('--workers', workers);
  if (frame !== null) { const out = args[1]; if (!out) die('Uso: posts export <video> --frame <segundo> <salida.png>'); a.push('--frame', frame, resolve(out)); }
  process.exit(run('node', a, {cwd: dir, stdio: 'inherit'}).status ?? 1);
}

// ---- check ----
function cmdCheck(args) {
  const verbose = flag(args, '-v', false);
  const dir = resolvePiece(args[0]);
  const rows = []; let errs = 0, warns = 0;
  const ok = m => rows.push(['OK', m]);
  const bad = m => { rows.push(['ERROR', m]); errs++; };
  const warn = m => { rows.push(['AVISO', m]); warns++; };
  const html = read(join(dir, 'index.html')), car = isCarousel(dir);
  ok('index.html');
  // assets locales referenciados
  const refs = new Set();
  for (const m of html.matchAll(/(?:src|href)="([^"#?]+)[^"]*"/g)) refs.add(m[1]);
  for (const m of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) refs.add(m[1]);
  const missing = [...refs].filter(r => !/^(https?:|data:|\/\/|#|%23|mailto:)/.test(r) && !r.includes('__') && r !== 'sfx.wav' && !existsSync(resolve(dir, decodeURI(r))));
  missing.length ? bad(`Archivos referenciados que no existen: ${missing.join(', ')}`) : ok(`Rutas relativas (${refs.size} referencias)`);
  if (/TÍTULO|__TOTAL__|Titular|Kicker de la portada/.test(html)) warn('index.html aún tiene textos de la plantilla (TÍTULO / Titular gigante / Kicker…)');
  // caption
  const cap = join(dir, 'caption.txt');
  if (!existsSync(cap)) warn('Falta caption.txt');
  else {
    const c = read(cap), tags = (c.match(/#\p{L}[\p{L}\p{N}_]*/gu) || []).length;
    c.trim() ? ok('caption.txt') : bad('caption.txt está vacío');
    if (c.includes('**')) warn('caption.txt tiene **markdown** (Instagram no muestra negritas)');
    tags < 8 || tags > 13 ? warn(`caption.txt tiene ${tags} hashtags (recomendado 8-13)`) : ok(`Hashtags: ${tags}`);
  }
  if (car) {
    const n = (html.match(/<section class="slide/g) || []).length;
    ok(`Láminas en el HTML: ${n}`);
    const pngs = ls(join(dir, 'png')).filter(e => e.name.endsWith('.png')).map(e => e.name).sort();
    if (!pngs.length) warn('Aún no hay PNG (posts export)');
    else {
      pngs.length !== n ? bad(`Hay ${pngs.length} PNG y ${n} láminas`) : ok(`PNG: ${pngs.length}`);
      const sizes = pngs.map(f => { const b = readFileSync(join(dir, 'png', f)); return b.readUInt32BE(16) + 'x' + b.readUInt32BE(20); });
      sizes.every(s => s === '1080x1350') ? ok('Dimensiones 1080x1350') : bad('PNG con dimensiones distintas a 1080x1350: ' + [...new Set(sizes)].join(', '));
      pngs.some(f => mtime(join(dir, 'png', f)) < mtime(join(dir, 'index.html'))) ? warn('Hay PNG más viejos que index.html (desactualizados)') : ok('PNG al día');
    }
  } else {
    const T = html.match(/var TOTAL\s*=\s*([\d.]+)/) || html.match(/\btotal\s*:\s*([\d.]+)/);
    const total = T ? parseFloat(T[1]) : null;
    total ? ok(`Duración en el HTML: ${total}s`) : bad('No encuentro TOTAL/total en index.html');
    const snd = soundOf(dir), ga = join(dir, 'gen_audio.py'), wav = join(dir, 'sfx.wav');
    if (!snd) ok('Sonido desactivado en esta pieza (video sin audio)');
    else if (existsSync(ga)) {
      const g = read(ga).match(/TOTAL\s*=\s*([\d.]+)/) || read(ga).match(/Mix\(\s*([\d.]+)\s*\)/);
      if (g && total) Math.abs(parseFloat(g[1]) - total) > 0.01 ? bad(`TOTAL distinto: HTML ${total}s vs gen_audio.py ${g[1]}s`) : ok('TOTAL de gen_audio.py = HTML');
    } else warn('No hay gen_audio.py');
    if (!snd) {}
    else if (!existsSync(wav)) warn('Falta sfx.wav (posts audio)');
    else {
      const d = parseFloat(probe(wav, 'format=duration').format?.duration);
      total && Math.abs(d - total) > 0.2 ? bad(`sfx.wav dura ${d.toFixed(2)}s y el HTML ${total}s`) : ok(`sfx.wav: ${d.toFixed(2)}s`);
      if (existsSync(ga) && mtime(wav) < mtime(ga)) warn('sfx.wav es más viejo que gen_audio.py (regenerar con posts audio)');
    }
    const mp4 = join(dir, 'reel.mp4');
    if (!existsSync(mp4)) warn('Aún no hay reel.mp4 (posts export)');
    else {
      const j = probe(mp4, 'stream=codec_type,codec_name,width,height,r_frame_rate:format=duration');
      const v = j.streams?.find(s => s.codec_type === 'video'), a = j.streams?.find(s => s.codec_type === 'audio');
      v && v.width === 1080 && v.height === 1920 ? ok('Resolución 1080x1920') : bad(`Resolución ${v?.width}x${v?.height} (se espera 1080x1920)`);
      v && v.r_frame_rate === '30/1' ? ok('30 fps') : warn(`fps: ${v?.r_frame_rate}`);
      if (snd) a && a.codec_name === 'aac' ? ok('Audio AAC') : warn('reel.mp4 no tiene pista de audio AAC'); else a ? warn('reel.mp4 tiene audio pero la pieza está sin sonido') : ok('Sin pista de audio (como se eligió)');
      const d = parseFloat(j.format?.duration);
      total && Math.abs(d - total) > 0.2 ? bad(`reel.mp4 dura ${d.toFixed(2)}s y el HTML ${total}s`) : ok(`reel.mp4: ${d.toFixed(2)}s`);
      [join(dir, 'index.html'), wav].filter(existsSync).some(f => mtime(f) > mtime(mp4)) ? warn('reel.mp4 es más viejo que index.html/sfx.wav (desactualizado)') : ok('reel.mp4 al día');
    }
  }
  const ctx = ctxOf(dir);
  console.log(`${relative(POSTS, dir)} (${car ? 'carrusel' : 'video'}, ${ctx.brand}): ${errs} error(es), ${warns} aviso(s), ${rows.length - errs - warns} OK`);
  for (const [st, m] of rows) if (verbose || st !== 'OK') console.log(`[${st}] ${m}`);
  console.log('A mano: textos cortados/montados, datos y contacto (docs/export.md)' + (verbose ? '' : '. Detalle completo: posts check <pieza> -v'));
  process.exit(errs ? 1 : 0);
}

const HELP = `posts — CLI de producción (carruseles y videos). Herramientas: ${TOOL} · Piezas: ${POSTS || '(sin definir: posts init <ruta>)'}

  posts doctor [--gosite]                                           comprueba requisitos (Node 22+, Chrome, ffmpeg, Python, git; con --gosite también docker y gosite) y da el comando para instalar lo que falte
  posts init <carpeta-de-posts>                                     una vez: define dónde están las piezas y enlaza recursos
  posts brand add <id> --name "Nombre" --dark #hex --light #hex --accent #hex --head "Fuente" [--body ...]   marca NUEVA (plantillas y sonido listos)
  posts brand list | show <marca>                                    marcas disponibles / datos compactos de una marca (colores, contacto, diseño, ideas ya hechas)
  posts new <marca> carousel|video [--title "Tema"] [--month mes] [--sound on|off]   crea carpeta + plantilla (mes y número automáticos)
  posts list [marca] [mes]                                          lista las piezas y su estado
  posts preview <pieza> [N|segundo] [--open]                        URL de vista previa (lámina N / segundo t); --open la abre
  posts sound <video> [on|off]                                      con/sin efectos de sonido (piece.json); sin argumento muestra el estado
  posts audio <video>                                               corre gen_audio.py -> sfx.wav (omitido si el sonido está en off)
  posts analyze <video.mp4> [--from s --to s] [--out DIR] [--max N]  estudia un video de referencia: resumen y, con --from/--to, fotogramas cada 0.2 s de un tramo (transiciones)
  posts export <pieza> [N] [--out DIR]                              carrusel -> PNG (Chrome, una sesión); N = una sola lámina
  posts export <video> --yes [--sound on|off] [--workers N]         video -> reel.mp4. SOLO cuando el usuario lo indica: sin --yes no graba. N = Chrome en paralelo (auto por defecto)
  posts export <video> --frame <seg> <salida.png>                   un fotograma de revisión (no toca reel.mp4)
  posts check <pieza> [-v]                                          validaciones automáticas (solo avisos/errores; -v muestra todo)

  <pieza> = carpeta (ej. aga/noviembre/postVideos/postVideo1), relativa a la raíz o absoluta.
  Marcas: ${brands().join(', ')}
  Carpeta de proyectos (para los archivos de diseño): ${PROJECTS} (PROJECTS_DIR)`;

const [cmd, ...rest] = process.argv.slice(2);
if (!['init', 'brand', 'help', 'doctor'].includes(cmd) && cmd && !POSTS) die('No hay carpeta de posts definida. Ejecuta: posts init <ruta>  (o define POSTS_DIR)');
({doctor: cmdDoctor, init: cmdInit, sound: cmdSound, analyze: cmdAnalyze, brand: cmdBrand, new: cmdNew, list: cmdList, preview: cmdPreview, audio: cmdAudio, export: cmdExport, check: cmdCheck}[cmd] || (() => { console.log(HELP); process.exit(cmd && cmd !== 'help' ? 1 : 0); }))(rest);
