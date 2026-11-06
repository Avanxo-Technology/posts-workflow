// Catálogo de efectos (ver catalog/README.md). Fuente de verdad = JSON en catalog/. El índice inverso (efecto -> posts) se calcula al vuelo.
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

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
  for (const brand of subdirs(join(root, 'posts'))) {
    const dir = join(root, 'posts', brand);
    for (const n of readdirSync(dir).filter(n => n.endsWith('.json'))) {
      try { posts.push({...readJson(join(dir, n)), file: `catalog/posts/${brand}/${n}`}); } catch (e) { errors.push(`posts/${brand}/${n}: JSON inválido (${e.message})`); }
    }
  }
  for (const p of posts) for (const u of p.uses || []) effects.get(u.effect)?.uses.push({post: p.id, t: u.t, note: u.note});
  return {root, effects, posts, errors};
}

export function checkCatalog(TOOL, POSTS) {
  const c = loadCatalog(TOOL), err = [...c.errors], warn = [];
  for (const [id, e] of c.effects) {
    if (e.id !== id) err.push(`effects/${id}: id "${e.id}" no coincide con la carpeta`);
    for (const k of ['name', 'kind', 'medium', 'brands']) if (!e[k]) err.push(`effects/${id}: falta "${k}"`);
    if (!existsSync(join(e.dir, 'effect.md'))) err.push(`effects/${id}: falta effect.md`);
    if (e.snippet && !existsSync(join(e.dir, e.snippet))) err.push(`effects/${id}: snippet "${e.snippet}" no existe`);
    if (e.source?.file && !existsSync(join(TOOL, e.source.file))) err.push(`effects/${id}: source.file "${e.source.file}" no existe`);
    if (!e.uses.length) warn.push(`effects/${id}: ningún post lo usa`);
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

const fmt = t => (Math.round(t * 100) / 100) + 's';

export function cmdEffect(args, {TOOL, POSTS, die, flag}) {
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
    if (e.source) console.log(`código: ${e.source.file} → ${e.source.symbol}`);
    console.log('guía: ' + join(e.dir, 'effect.md') + (e.snippet ? `\nsnippet: ${join(e.dir, e.snippet)}` : ''));
    if (e.params) console.log('parámetros: ' + Object.entries(e.params).map(([k, v]) => `${k} (${v})`).join(' · '));
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

  if (sub === 'check') {
    const r = checkCatalog(TOOL, POSTS);
    r.err.forEach(m => console.log('✗ ' + m)); r.warn.forEach(m => console.log('⚠ ' + m));
    console.log(`${r.effects} efectos, ${r.posts} posts · ${r.err.length} errores, ${r.warn.length} avisos`);
    if (r.err.length) process.exit(1);
    return;
  }
  console.log('Uso: posts effect list [--brand b] [--kind k] [--tag t] | show <id> | at <post> [segundo] | check');
  if (sub) process.exit(1);
}
