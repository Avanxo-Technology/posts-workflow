// Catálogo de efectos (ver catalog/README.md). Fuente de verdad = JSON en catalog/. El índice inverso (efecto -> posts) se calcula al vuelo.
import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {scanHtml, externalKeyframes} from './catalog-scan.mjs';
import {createRequire} from 'node:module';
import {privateBrandsDir} from './brands-dirs.mjs';
const FX = createRequire(import.meta.url)('./catalog-ui/fx-core.js');

const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
const subdirs = d => existsSync(d) ? readdirSync(d, {withFileTypes: true}).filter(e => e.isDirectory()).map(e => e.name) : [];

export function loadCatalog(TOOL) {
  const root = join(TOOL, 'catalog'), errors = [];
  const effects = new Map(), posts = [];
  for (const id of subdirs(join(root, 'effects'))) {
    const dir = join(root, 'effects', id), f = join(dir, 'effect.json');
    if (!existsSync(f)) { errors.push(`effects/${id}: falta effect.json`); continue; }
    try { effects.set(id, {...readJson(f), dir, uses: []}); } catch (e) { errors.push(`effects/${id}/effect.json: JSON inválido (${e.message})`); }
  }
  const priv = privateBrandsDir(TOOL);   // registros de posts de las marcas reales: viven fuera del repo
  for (const [base, label] of [[join(root, 'posts'), 'catalog/posts'], [priv ? join(priv, 'catalog-posts') : '', 'catalog-posts (privado)']]) {
    if (!base) continue;
    for (const brand of subdirs(base)) {
      const dir = join(base, brand);
      for (const n of readdirSync(dir).filter(n => n.endsWith('.json'))) {
        try { posts.push({...readJson(join(dir, n)), file: `${label}/${brand}/${n}`}); } catch (e) { errors.push(`posts/${brand}/${n}: JSON inválido (${e.message})`); }
      }
    }
  }
  for (const p of posts) for (const u of p.uses || []) effects.get(u.effect)?.uses.push({post: p.id, t: u.t, note: u.note});
  return {root, effects, posts, errors};
}

export function checkCatalog(TOOL, POSTS) {
  const c = loadCatalog(TOOL), err = [...c.errors], warn = [];
  for (const [id, e] of c.effects) {
    if (e.id !== id) err.push(`effects/${id}: id "${e.id}" no coincide con la carpeta`);
    for (const k of ['name', 'kind', 'medium']) if (!e[k]) err.push(`effects/${id}: falta "${k}"`);
    if (!existsSync(join(e.dir, 'effect.md'))) err.push(`effects/${id}: falta effect.md`);
    if (e.snippet && !existsSync(join(e.dir, e.snippet))) err.push(`effects/${id}: snippet "${e.snippet}" no existe`);
    if (e.source?.file && !existsSync(join(TOOL, e.source.file))) err.push(`effects/${id}: source.file "${e.source.file}" no existe`);
    if (e.source?.piece && POSTS && !existsSync(join(POSTS, e.source.piece, 'index.html'))) warn.push(`effects/${id}: la pieza de origen no está en este equipo (${e.source.piece}); el código está en snippet.css`);
    if (e.source && !e.source.file && !e.source.piece) err.push(`effects/${id}: source necesita "file" o "piece"`);
    if (e.spec === 1) {   // contrato de efecto spec 1: fx.css + fx.html + parámetros coherentes
      const rd = f => (existsSync(join(e.dir, f || '')) ? readFileSync(join(e.dir, f), 'utf8') : '');
      if (!e.fx?.params) err.push(`effects/${id}: spec 1 sin fx.params`);
      else for (const m of FX.lint(e.fx, rd(e.fx.css), rd(e.fx.html))) err.push(`effects/${id}: ${m}`);
    }
    if (c.posts.length && !e.uses.length) warn.push(`effects/${id}: ningún post lo usa`);
  }
  const seen = new Set();
  for (const p of c.posts) {
    if (seen.has(p.id)) err.push(`${p.file}: id repetido "${p.id}"`); seen.add(p.id);
    if (p.path && p.id !== p.path.replace(/\//g, '-')) err.push(`${p.file}: id "${p.id}" no coincide con path "${p.path}"`);
    for (const u of p.uses || []) {
      if (!c.effects.has(u.effect)) err.push(`${p.file}: efecto desconocido "${u.effect}"`);
      if (typeof u.t !== 'number') err.push(`${p.file}: uso de "${u.effect}" sin t numérico`);
    }
    if (POSTS && p.path && !existsSync(join(POSTS, p.path, 'index.html'))) warn.push(`${p.file}: la pieza no está en este equipo (${p.path})`);
  }
  return {err, warn, effects: c.effects.size, posts: c.posts.length};
}

// formato canónico de un registro de post: una línea por uso (diffs pequeños en git)
export function formatPost(p) {
  const {uses, file: _f, ...head} = p;
  const lines = Object.entries(head).filter(([, v]) => v !== undefined).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  const one = u => '{' + Object.entries(u).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(', ') + '}';
  return `{\n${lines.join(',\n')},\n  "uses": [\n${uses.map(u => '    ' + one(u)).join(',\n')}\n  ]\n}\n`;
}
const pick0 = (entries, brand) => entries?.find(e => !e.brands || e.brands.includes(brand)) || null;
const fmt = t => (Math.round(t * 100) / 100) + 's';

export function cmdEffect(args, {TOOL, POSTS, die, flag, resolvePiece, allPieces, isCarousel}) {
  const [sub, ...rest] = args, c = loadCatalog(TOOL);
  for (const e of c.errors) console.error('⚠ ' + e);

  if (sub === 'list') {
    const brand = flag(rest, '--brand'), kind = flag(rest, '--kind'), tag = flag(rest, '--tag');
    const list = [...c.effects.values()].filter(e => (!brand || e.brands?.includes(brand)) && (!kind || e.kind === kind) && (!tag || e.tags?.includes(tag)));
    if (!list.length) return console.log('(sin efectos con ese filtro)');
    for (const e of list) console.log(`${e.id.padEnd(14)} ${(e.kind || '').padEnd(11)} ${(e.brands || []).join(',').padEnd(26)} ${e.name} · ${new Set(e.uses.map(u => u.post)).size} posts`);
    return;
  }

  if (sub === 'show') {
    const e = c.effects.get(rest[0]); if (!e) die(`Efecto desconocido "${rest[0] || ''}". Ver: posts effect list`);
    console.log(`${e.id}: ${e.name}  [${e.kind} · ${e.medium} · ${(e.brands || []).join(', ')}]`);
    if (e.tags?.length) console.log('tags: ' + e.tags.join(', '));
    if (e.source) console.log(`código: ${e.source.file || 'pieza ' + e.source.piece} → ${e.source.symbol}`);
    console.log('guía: ' + join(e.dir, 'effect.md') + (e.snippet ? `\nsnippet: ${join(e.dir, e.snippet)}` : ''));
    if (e.spec === 1 && e.fx?.params) console.log('parámetros editables (spec 1): ' + Object.entries(e.fx.params).map(([k, d]) => d.type === 'number' ? `${k} (${d.default}${d.unit || ''}, ${d.min}–${d.max})` : d.type === 'enum' ? `${k} (${d.options.map(o => o.value).join('|')})` : `${k} (color)`).join(' · ') + '\ncódigo listo con tus valores: GET /api/v1/effects/' + e.id + '?<param>=<valor>&palette=<marca>  (posts catalog)');
    else if (e.params && Object.keys(e.params).length) console.log('parámetros: ' + Object.entries(e.params).map(([k, v]) => `${k} (${v})`).join(' · '));
    if (e.audio) console.log(`audio: ${e.audio.sfx} — ${e.audio.sync}`);
    const by = new Map();
    for (const u of e.uses) { if (!by.has(u.post)) by.set(u.post, []); by.get(u.post).push(u); }
    console.log(`usado en ${by.size} posts:`);
    for (const [post, us] of by) console.log(`  ${post}  @ ` + us.map(u => fmt(u.t) + (u.note ? ` (${u.note})` : '')).join(', '));
    return;
  }

  if (sub === 'at') {
    const [q, ts] = rest; if (!q) die('Uso: posts effect at <post> [segundo]');
    const norm = s => s.replace(/\\/g, '/').replace(/\/+$/, '').replace(/\//g, '-');
    const hits = c.posts.filter(p => p.id === norm(q) || p.id.endsWith('-' + norm(q)) || p.id.includes(norm(q)));
    const exact = hits.find(p => p.id === norm(q));
    const post = exact || (hits.length === 1 ? hits[0] : null);
    if (!post) die(hits.length ? `"${q}" es ambiguo: ${hits.map(p => p.id).join(', ')}` : `Post no registrado: "${q}". Ver catalog/posts/`);
    let uses = [...(post.uses || [])].sort((a, b) => a.t - b.t);
    console.log(`${post.id}  (${post.path})`);
    if (ts !== undefined) {
      const t = parseFloat(ts); if (Number.isNaN(t)) die('El segundo debe ser un número');
      if (!uses.length) return console.log('(el post no tiene usos registrados)');
      const best = uses.reduce((a, b) => Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a);
      const d = Math.abs(best.t - t), e = c.effects.get(best.effect);
      console.log(`más cercano a ${fmt(t)}: ${best.effect} @ ${fmt(best.t)}${best.note ? ` (${best.note})` : ''}` + (d > 1 ? `  ⚠ a ${fmt(d)} de distancia: comprueba que es el que buscas` : ''));
      if (e) console.log(`guía: ${join(e.dir, 'effect.md')}`);
      return;
    }
    for (const u of uses) console.log(`  ${fmt(u.t).padStart(7)}  ${u.effect}${u.note ? `  (${u.note})` : ''}`);
    return;
  }


  if (sub === 'scan') {
    const write = flag(rest, '--write', false), all = flag(rest, '--all', false), check = flag(rest, '--check', false);
    if (!all && !rest[0]) die('Uso: posts effect scan <pieza> | --all  [--write] [--check]');
    const map = JSON.parse(readFileSync(join(c.root, 'scan-map.json'), 'utf8'));
    const ovf = privateBrandsDir(TOOL) && join(privateBrandsDir(TOOL), 'scan-map.overlay.json');   // entradas propias de las marcas reales (fuera del repo): van primero
    if (ovf && existsSync(ovf)) { const ov = JSON.parse(readFileSync(ovf, 'utf8')); for (const sec of ['animations', 'elements']) for (const [k, v] of Object.entries(ov[sec] || {})) map[sec][k] = [...v, ...(map[sec][k] || [])]; }
    const dirs = all ? allPieces() : [resolvePiece(rest[0])];
    let changed = 0;
    for (const dir of dirs) {
      const rel = relative(POSTS, dir), brand = rel.split('/')[0], id = rel.replace(/\//g, '-');
      const html = readFileSync(join(dir, 'index.html'), 'utf8');
      if (isCarousel(dir)) { if (!all) console.log(`${rel}: es un carrusel (sin animaciones)`); continue; }
      const res = scanHtml(html, brand, map, externalKeyframes(join(dir, 'index.html'), html));
      const old = c.posts.find(p => p.path === rel), oldUses = old?.uses || [];
      const manual = oldUses.filter(u => u.manual);
      const isM = u => manual.some(m => m.effect === u.effect && m.t === u.t);
      const noteOf = new Map(oldUses.map(u => [u.effect + '@' + u.t, u.note]));
      const auto = res.uses.filter(u => !isM(u)).map(u => ({effect: u.effect, t: u.t, ...((u.note || noteOf.get(u.effect + '@' + u.t)) ? {note: u.note || noteOf.get(u.effect + '@' + u.t)} : {})}));
      const merged = [...auto, ...manual].sort((a, b) => a.t - b.t || (a.effect < b.effect ? -1 : a.effect > b.effect ? 1 : 0));
      const key = u => u.effect + '@' + u.t;
      const before = new Set(oldUses.filter(u => !u.manual).map(key)), after = new Set(auto.map(key));
      const added = auto.filter(u => !before.has(key(u))), gone = oldUses.filter(u => !u.manual && !after.has(key(u)));
      const missing = [...new Set(merged.map(u => u.effect))].filter(e => !c.effects.has(e));
      const diff = added.length || gone.length || (!old && merged.length);
      if (diff) changed++;
      console.log(`${rel}: ${merged.length} usos` + (old ? (diff ? `  (+${added.length} nuevos, -${gone.length} que ya no están)` : '  (sin cambios)') : merged.length ? '  (post nuevo en el catálogo)' : ''));
      if (!all || diff) for (const u of added) console.log(`   + ${u.t}s ${u.effect}${u.note ? ` (${u.note})` : ''}`);
      if (!all || diff) for (const u of gone) console.log(`   - ${u.t}s ${u.effect}`);
      for (const e of missing) console.log(`   ✗ el efecto "${e}" no existe en catalog/effects/ (créalo o corrige scan-map.json)`);
      for (const u of res.unknown) console.log(`   ? animación sin catalogar: ${u.name} (×${u.count}). Añádela a catalog/scan-map.json y crea su efecto en catalog/effects/`);
      for (const u of res.unscoped) {
        const e = pick0(map.animations[u.animation], brand);
        if (e?.effect && manual.some(m => m.effect === e.effect)) continue;
        console.log(`   ? sin tiempo deducible: ${u.animation} en "${u.selector}"` + (e?.effect ? ` → efecto ${e.effect}: añade el uso a mano con "manual": true` : ' (sin efecto asignado)'));
      }
      if (write && merged.length && diff) {
        const dp = (privateBrandsDir(TOOL) && existsSync(join(privateBrandsDir(TOOL), brand + '.json'))) ? join(privateBrandsDir(TOOL), 'catalog-posts', brand) : join(c.root, 'posts', brand); mkdirSync(dp, {recursive: true});   // marcas privadas: el registro se guarda fuera del repo
        const {uses: _u, ...rest0} = old || {};
        writeFileSync(join(dp, id + '.json'), formatPost({id, brand, medium: 'video', path: rel, ...rest0, file: undefined, uses: merged}));
        console.log(`   ✓ escrito catalog/posts/${brand}/${id}.json`);
      }
    }
    if (!write && changed) console.log(`\n${changed} pieza(s) con diferencias. Aplica con --write.`);
    if (!changed) console.log(all ? '\nCatálogo al día.' : '');
    if (check && changed) process.exit(1);
    return;
  }

  if (sub === 'check') {
    const r = checkCatalog(TOOL, POSTS);
    r.err.forEach(m => console.log('✗ ' + m)); r.warn.forEach(m => console.log('⚠ ' + m));
    console.log(`${r.effects} efectos, ${r.posts} posts · ${r.err.length} errores, ${r.warn.length} avisos`);
    if (r.err.length) process.exit(1);
    return;
  }
  console.log('Uso: posts effect list [--brand b] [--kind k] [--tag t] | show <id> | at <post> [segundo] | scan <pieza>|--all [--write] [--check] | check');
  if (sub) process.exit(1);
}
