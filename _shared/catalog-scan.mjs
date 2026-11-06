// Escáner de efectos: lee el index.html de una pieza de video y deduce qué efectos del catálogo usa y en qué segundo.
// Se apoya en catalog/scan-map.json (animación/clase -> efecto). Solo lee; escribir es decisión de `posts effect scan --write`.
import {readFileSync} from 'node:fs';

const cmpStr = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const r2 = x => Math.round(x * 100) / 100;
function num(x) {
  const m = /^(-?[\d.]+)(m?s)$/.exec(x);
  return m ? parseFloat(m[1]) / (m[2] === 'ms' ? 1000 : 1) : null;
}
const kfNames = s => new Set([...s.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]));

// primera entrada del mapa que aplica a la marca (las que traen "brands" solo valen para esas marcas)
function pick(entries, brand) {
  return entries?.find(e => !e.brands || e.brands.includes(brand)) || null;
}

export function scanHtml(html, brand, map, extraKf = new Set()) {
  const uses = [], unknown = new Map(), unscoped = [];
  const kf = new Set([...kfNames(html), ...extraKf]);
  const known = n => kf.has(n) || n in map.animations;
  const add = (effect, t, note) => uses.push({effect, t: r2(t), note: note || null});
  const byName = (nm, t, where) => {
    if (map.ignore?.includes(nm)) return;
    const e = pick(map.animations[nm], brand);
    if (!e) { unknown.set(nm, [...(unknown.get(nm) || []), where]); return; }
    if (e.effect) add(e.effect, t, e.note);
  };
  const byEl = (cls, t) => { const e = pick(map.elements[cls], brand); if (e?.effect) add(e.effect, t, e.note); };

  // golpes de pantalla y transiciones del motor (HITS / hits / VIDEO.trans)
  const hm = /(?:HITS\s*=|hits\s*:)\s*\[([^\]]*)\]/.exec(html);
  if (hm && map.hits) for (const x of hm[1].match(/[\d.]+/g) || []) add(map.hits, parseFloat(x));
  for (const line of html.split('\n')) {
    const tm = /\{t0:\s*([\d.]+),\s*dur:\s*[\d.]+,\s*type:'(\w+)'\}/.exec(line);
    if (tm && map.transitions?.[tm[2]]) add(map.transitions[tm[2]], parseFloat(tm[1]), /\/\*\s*(swap\s*[\d.]+)\s*\*\//.exec(line)?.[1]);
  }

  const bs = html.indexOf('<body');
  const body = bs >= 0 ? html.slice(bs) : html;
  const css = html.slice(0, Math.max(bs, 0)) + (body.match(/<style[\s\S]*?<\/style>/g) || []).join('');
  const scene = {};
  for (const m of body.matchAll(/<(?:section|div)[^>]*class="[^"]*\b(s\d+)\b[^"]*"[^>]*style="[^"]*--s:([\d.]+)s/g)) scene[m[1]] ??= parseFloat(m[2]);
  for (const m of body.matchAll(/<(?:section|div)[^>]*style="[^"]*--s:([\d.]+)s[^"]*"[^>]*class="[^"]*\b(s\d+)\b/g)) scene[m[2]] ??= parseFloat(m[1]);

  for (const ln of body.split('\n')) {
    for (const tag of ln.matchAll(/<[a-zA-Z][^>]*>/g)) {
      const T = tag[0], sm = /style="([^"]*)"/.exec(T);
      if (!sm) continue;
      const st = sm[1], d = {};
      for (const m of st.matchAll(/--([\w]+):\s*([^;]+)/g)) d[m[1]] = m[2];
      const cls = (/class="([^"]*)"/.exec(T)?.[1] || '').split(/\s+/).filter(Boolean);
      if (!('s' in d) && ('kb' in d || 'cin' in d)) {  // el --s está en la escena padre (misma línea)
        const prev = [...ln.slice(0, tag.index).matchAll(/--s:([\d.]+)s/g)];
        if (prev.length) d.s = prev.at(-1)[1] + 's';
      }
      const s0 = 's' in d ? num(d.s) : null;
      if ('n' in d && s0 !== null && known(d.n)) byName(d.n, s0, 'k');
      if (s0 !== null) {
        if (d.in && known(d.in)) byName(d.in, s0, 'in');
        if (d.out && known(d.out) && 'd' in d) byName(d.out, r2(s0 + num(d.d) - 0.5), 'out');
        if (d.kb && known(d.kb)) byName(d.kb, s0, 'kb');
        if (d.cin && known(d.cin)) byName(d.cin, r2(s0 + num(d.cd ?? '0s')), 'cell');
        for (const sp of ['flash', 'wipe', 'lt', 'sw', 'ring']) if (cls.includes(sp)) byEl(sp, s0);
      }
      for (const c of cls) if (map.classes?.[c]) add(map.classes[c], 'fx-delay' in d ? num(d['fx-delay']) ?? 0 : 0);   // efectos spec 1: class="fx-<efecto>" + --fx-delay
      if (cls.includes('bar') && cls.some(c => c === 'v' || c === 'h')) { const m1 = /--s1:([\d.]+)s/.exec(st); if (m1) byEl('bar', parseFloat(m1[1])); }
      if (cls.includes('prog') && 'tot' in d) byEl('prog', 0);
      for (const am of st.matchAll(/animation:\s*([\w-]+)\s+([\d.]+m?s)(?:\s+[^;,]*?\s([\d.]+s))?[^;]*/g)) {
        if (kf.has(am[1]) && !am[0].slice(0, 20).includes('var(')) byName(am[1], am[3] ? parseFloat(am[3]) : 0, 'inline');
      }
    }
  }

  // animaciones declaradas en el CSS: solo se pueden fechar si cuelgan de una escena (.sN)
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*animation:[^{}]*)\}/g)) {
    const sel = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();   // sin comentarios
    if (!sel || sel.startsWith('@') || sel.includes('keyframes')) continue;
    if (Object.keys(map.elements).some(c => new RegExp('^\\.' + c + '(?![\\w-])|^\\.tr \\.' + c + '(?![\\w-])').test(sel) || sel.startsWith('.' + c))) continue;   // ya lo cubre el efecto de ese elemento (.wipe, .flash, .bar, .lt*…)
    for (const am of m[2].matchAll(/animation:\s*([^;]+)/g)) {
      for (const part of am[1].split(',')) {
        const toks = part.trim().split(/\s+/);
        const nm = toks[0];
        if (!nm || !kf.has(nm) || nm === 'sc' || map.ignore?.includes(nm)) continue;
        const times = toks.slice(1).map(num).filter(x => x !== null);
        const delay = times.length > 1 ? times[1] : 0;
        const sc = /\.(s\d+)\b/.exec(sel);
        if (sc && sc[1] in scene && !part.includes('var(--cs')) byName(nm, scene[sc[1]] + delay, 'css');   // var(--cs): retraso propio de cada elemento, no se puede fechar (var(--s) es el inicio de la escena)
        else if (!part.includes('var(--cs') && (sel.includes('.k') || part.includes('var('))) continue;
        else unscoped.push({animation: nm, selector: sel.slice(0, 60), mapped: !!pick(map.animations[nm], brand)?.effect});
      }
    }
  }

  // limpieza: duplicados exactos; persianas/aros que arrancan casi a la vez cuentan como un solo uso
  const uniq = [...new Map(uses.map(u => [JSON.stringify([u.effect, u.t, u.note]), u])).values()]
    .sort((a, b) => cmpStr(a.effect, b.effect) || a.t - b.t || cmpStr(a.note || '', b.note || ''));
  const out = [];
  for (const u of uniq) {
    const p = out.at(-1);
    if (['venetian-bars', 'ring-burst'].includes(u.effect) && p && p.effect === u.effect && u.t - p.t < 0.5) continue;
    out.push(u);
  }
  out.sort((a, b) => a.t - b.t || cmpStr(a.effect, b.effect) || cmpStr(a.note || '', b.note || ''));
  return {uses: out, unknown: [...unknown].map(([name, where]) => ({name, count: where.length})), unscoped};
}

// keyframes que viven en hojas de estilo externas (p. ej. aga.css) y que el index.html enlaza con <link rel="stylesheet">
export function externalKeyframes(htmlPath, html, read = p => readFileSync(p, 'utf8')) {
  const set = new Set();
  for (const m of html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)) {
    if (/^https?:/.test(m[1])) continue;
    try { for (const n of kfNames(read(new URL(m[1], 'file://' + htmlPath).pathname))) set.add(n); } catch { /* hoja ausente: se ignora */ }
  }
  return set;
}
