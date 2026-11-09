// Versión pública del catálogo: solo efectos autocontenidos (spec 1), sin marcas, sin rutas del repo y sin registros de posts.
// Es lo único que llega al sitio publicado: la UI, los JSON de la API y la función lo leen de aquí.
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

const INTERNAL_LINE = /\b(aga|gmaq|gremco|pirotecnia)\b|brands\/|engine\.js|postVideo|reel\d|video-template|_shared|plantilla|antiguo|originales?\b/i;

export function publicPalettes(TOOL) {
  const f = join(TOOL, 'catalog', 'palettes.json');
  const raw = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
  return Object.fromEntries(Object.entries(raw).map(([id, p]) => [id, {id, name: p.name || id, dark: p.dark, light: p.light, accent: p.accent}]));
}

// En "## Notas" se quitan las viñetas que cuentan el origen interno del efecto; el resto (descripción, uso, parámetros) se publica tal cual.
export function scrubMd(md) {
  let inNotes = false;
  return md.split('\n').filter(ln => {
    if (/^##\s/.test(ln)) inNotes = /^##\s+Notas/i.test(ln);
    return !(inNotes && /^\s*[-*]\s/.test(ln) && INTERNAL_LINE.test(ln));
  }).join('\n').replace(/\n## Notas\s*$/i, '\n').trim() + '\n';
}

export function publicEffect(e) {
  return {id: e.id, name: e.name, kind: e.kind, medium: e.medium, tags: e.tags || [], brands: [], uses: [], spec: 1,
    audio: e.audio?.sync ? {sync: e.audio.sync} : null, md: scrubMd(e.md || ''), fx: e.fx, snippet: null, snippetName: null, demo: {type: 'fx', variants: []}};
}

// Devuelve {effects, palettes}. Lanza un error si queda algún rastro de marcas o de rutas del repo.
export function publicBundle(TOOL, data) {
  const effects = data.effects.filter(e => e.fx && !e.supersededBy).map(publicEffect);
  const palettes = publicPalettes(TOOL);
  const names = Object.keys(data.brands || {}).flatMap(id => [id, data.brands[id].name]).filter(s => s && s.length > 2);
  const rx = new RegExp(`\\b(${[...new Set(names)].map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b|brands/|engine\\.js|postVideo|video-template|_shared/|/home/`, 'i');
  const leaks = [];
  for (const e of effects) {
    const m = rx.exec(JSON.stringify({...e, fx: {...e.fx}}));
    if (m) leaks.push(`${e.id}: «${m[0]}»`);
  }
  if (leaks.length) throw new Error('El catálogo público contiene referencias internas (marcas, rutas o posts). Límpialas en effect.md / effect.json:\n  ' + leaks.join('\n  '));
  return {effects, palettes, brands: palettes};
}
