#!/usr/bin/env node
// CLI de producción de posts (carruseles y videos). Sin dependencias: Node 22+, Chrome, ffmpeg/ffprobe, Python 3.
// Uso:  posts <comando> ...      (ver `posts help`)
// TOOL  = este repositorio (herramientas, plantillas, marcas, docs).
// POSTS = carpeta donde viven las piezas (<marca>/<mes>/...). Se define con: variable POSTS_DIR, o el archivo .posts-dir del repo
//         (lo escribe `posts init <ruta>`).
import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync, statSync, symlinkSync, lstatSync} from 'node:fs';
import {dirname, join, resolve, basename, relative} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = resolve(HERE, '..');
const cfg = join(TOOL, '.posts-dir');
const POSTS_RAW = process.env.POSTS_DIR || (existsSync(cfg) ? read0(cfg).trim() : '');
const POSTS = POSTS_RAW ? resolve(POSTS_RAW) : '';
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
  if (sub === 'list' || sub === undefined) {
    for (const id of brands()) { const b = brandOf(id); console.log(`${id.padEnd(14)} ${b.name}  ·  sonido: ${b.sound || 'synth'}  ·  diseño: ${b.designFile || '(sin archivo)'}`); }
    return;
  }
  if (sub !== 'add') die('Uso: posts brand list | posts brand add <id> --name "Nombre" --dark #hex --light #hex --accent #hex --head "Fuente" [--body "Fuente"] [--short "SIGLA"] [--whatsapp ...] [--web ...] [--design ruta]');
  const a = [...rest], id = a.shift();
  const f = n => flag(a, n);
  const o = {name: f('--name'), short: f('--short'), dark: f('--dark'), light: f('--light'), accent: f('--accent'), head: f('--head'),
    body: f('--body') || 'Inter', wa: f('--whatsapp') || 'WhatsApp', web: f('--web') || 'tusitio.com', design: f('--design')};
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
  writeFileSync(join(TOOL, 'brands', id + '.json'), JSON.stringify({name: o.name, short: o.short, sound: 'synth (sin música)', designFile: o.design || null, designExtra: [],
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
  console.log(`Siguiente: completar brands/${id}.md · posts new ${id} carousel|video --title "Tema"`);
}

// ---- comandos ----
function cmdNew(args) {
  const month = flag(args, '--month') || MESES[new Date().getMonth()];
  const title = flag(args, '--title') || 'TÍTULO';
  const [bn, kind] = args;
  if (!bn || !['carousel', 'video'].includes(kind)) die('Uso: posts new <marca> carousel|video [--title "Tema"] [--month mes]');
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
    console.log(`Siguiente: editar index.html (1080x1350 por lámina) · posts preview ${relative(POSTS, dir)} 1 · posts export ${relative(POSTS, dir)} · posts check ${relative(POSTS, dir)}`);
  } else {
    if (!existsSync(shared)) die(`Falta ${shared}: ejecuta "posts init" para enlazar los recursos de la marca`);
    const dir = join(base, month, 'postVideos', `postVideo${n}`);
    mkdirSync(join(dir, 'img'), {recursive: true});
    const tpl = join(shared, 'video-template.html');
    if (!existsSync(tpl)) die(`Falta ${tpl}`);
    writeFileSync(join(dir, 'index.html'), read(tpl).replaceAll('__TOTAL__', '8').replace('– TÍTULO', '– ' + title));
    const ga = join(shared, 'gen_audio.template.py');
    if (existsSync(ga)) copyFileSync(ga, join(dir, 'gen_audio.py'));
    if (bn === 'aga') { // los logos viven en el img/ de cada video: heredar los del último video de AGA
      const old = [...dirs(base)].flatMap(m => dirs(join(base, m, 'postVideos')).map(v => join(base, m, 'postVideos', v)))
        .filter(v => v !== dir && existsSync(join(v, 'img', 'logo-white.png'))).sort((a, c) => mtime(c) - mtime(a))[0];
      if (old) for (const f of ['logo-white.png', 'logo-dark.png']) if (existsSync(join(old, 'img', f))) copyFileSync(join(old, 'img', f), join(dir, 'img', f));
    }
    console.log(dir);
    const rel = relative(POSTS, dir);
    console.log(`Siguiente: editar index.html y gen_audio.py (mismos tiempos; TOTAL en los dos) · posts audio ${rel} · posts export ${rel} --frame 1.5 f.png (revisar) · posts check ${rel}`);
    console.log('Grabar el MP4 solo cuando se apruebe: posts export ' + rel);
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
  if (!existsSync(join(dir, 'gen_audio.py'))) die('No hay gen_audio.py en esa carpeta');
  const r = run('python3', ['gen_audio.py'], {cwd: dir, stdio: 'inherit'});
  process.exit(r.status ?? 1);
}

function cmdExport(args) {
  const outDir = flag(args, '--out'), frame = flag(args, '--frame');
  const dir = resolvePiece(args[0]);
  if (isCarousel(dir)) {
    const a = [join(HERE, 'export-carousel.mjs'), dir]; if (args[1]) a.push(args[1]); if (outDir) a.push('--out', outDir);
    process.exit(run('node', a, {stdio: 'inherit'}).status ?? 1);
  }
  const a = [join(HERE, 'render.mjs')];
  if (frame !== null) { const out = args[1]; if (!out) die('Uso: posts export <video> --frame <segundo> <salida.png>'); a.push('--frame', frame, resolve(out)); }
  process.exit(run('node', a, {cwd: dir, stdio: 'inherit'}).status ?? 1);
}

// ---- check ----
function cmdCheck(args) {
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
  const missing = [...refs].filter(r => !/^(https?:|data:|\/\/|#|%23|mailto:)/.test(r) && !r.includes('__') && !existsSync(resolve(dir, decodeURI(r))));
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
    const ga = join(dir, 'gen_audio.py');
    if (existsSync(ga)) {
      const g = read(ga).match(/TOTAL\s*=\s*([\d.]+)/) || read(ga).match(/Mix\(\s*([\d.]+)\s*\)/);
      if (g && total) Math.abs(parseFloat(g[1]) - total) > 0.01 ? bad(`TOTAL distinto: HTML ${total}s vs gen_audio.py ${g[1]}s`) : ok('TOTAL de gen_audio.py = HTML');
    } else warn('No hay gen_audio.py');
    const wav = join(dir, 'sfx.wav');
    if (!existsSync(wav)) warn('Falta sfx.wav (posts audio)');
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
      a && a.codec_name === 'aac' ? ok('Audio AAC') : warn('reel.mp4 no tiene pista de audio AAC');
      const d = parseFloat(j.format?.duration);
      total && Math.abs(d - total) > 0.2 ? bad(`reel.mp4 dura ${d.toFixed(2)}s y el HTML ${total}s`) : ok(`reel.mp4: ${d.toFixed(2)}s`);
      [join(dir, 'index.html'), wav].filter(existsSync).some(f => mtime(f) > mtime(mp4)) ? warn('reel.mp4 es más viejo que index.html/sfx.wav (desactualizado)') : ok('reel.mp4 al día');
    }
  }
  const ctx = ctxOf(dir);
  console.log(`PIEZA: ${relative(POSTS, dir)}  (${car ? 'carrusel' : 'video'}, marca ${ctx.brand})\n`);
  for (const [s, m] of rows) console.log(`[${s}]`.padEnd(8) + m);
  console.log('\n[REVISAR A MANO] textos cortados o montados · contacto y datos contra el sitio real · fotos nítidas y sin repetir');
  console.log(car ? '  -> posts preview <pieza> N   /   abrir los PNG' : '  -> posts export <pieza> --frame <seg> f.png en varios segundos (entradas, transiciones, cierre)');
  console.log(`\nResultado: ${errs} error(es), ${warns} aviso(s)`);
  process.exit(errs ? 1 : 0);
}

const HELP = `posts — CLI de producción (carruseles y videos). Herramientas: ${TOOL} · Piezas: ${POSTS || '(sin definir: posts init <ruta>)'}

  posts init <carpeta-de-posts>                                     una vez: define dónde están las piezas y enlaza recursos
  posts brand add <id> --name "Nombre" --dark #hex --light #hex --accent #hex --head "Fuente" [--body ...]   marca NUEVA (plantillas y sonido listos)
  posts brand list                                                  marcas disponibles
  posts new <marca> carousel|video [--title "Tema"] [--month mes]   crea carpeta + plantilla (mes y número automáticos)
  posts list [marca] [mes]                                          lista las piezas y su estado
  posts preview <pieza> [N|segundo] [--open]                        URL de vista previa (lámina N / segundo t); --open la abre
  posts audio <video>                                               corre gen_audio.py -> sfx.wav
  posts export <pieza> [N] [--out DIR]                              carrusel -> PNG (Chrome, una sesión); N = una sola lámina
  posts export <video>                                              video -> reel.mp4 (SOLO cuando se apruebe)
  posts export <video> --frame <seg> <salida.png>                   un fotograma de revisión (no toca reel.mp4)
  posts check <pieza>                                               validaciones automáticas (+ lista de lo que falta revisar a mano)

  <pieza> = carpeta (ej. aga/noviembre/postVideos/postVideo1), relativa a la raíz o absoluta.
  Marcas: ${brands().join(', ')}`;

const [cmd, ...rest] = process.argv.slice(2);
if (!['init', 'brand', 'help'].includes(cmd) && cmd && !POSTS) die('No hay carpeta de posts definida. Ejecuta: posts init <ruta>  (o define POSTS_DIR)');
({init: cmdInit, brand: cmdBrand, new: cmdNew, list: cmdList, preview: cmdPreview, audio: cmdAudio, export: cmdExport, check: cmdCheck}[cmd] || (() => { console.log(HELP); process.exit(cmd && cmd !== 'help' ? 1 : 0); }))(rest);
