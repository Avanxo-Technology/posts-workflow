// Versión pública del catálogo: solo efectos autocontenidos (spec 1), sin marcas, sin rutas del repo y sin registros de posts.
// Es lo único que llega al sitio publicado: la UI, los JSON de la API y la función lo leen de aquí.
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {privateBrandNames} from '../brands-dirs.mjs';

const INTERNAL_LINE = /brands\/|engine\.js|postVideo|reel\d|video-template|_shared|plantilla|antiguo|originales?\b/i;

// Las paletas públicas son las marcas GENÉRICAS del repo (brands/*.json). Las marcas reales del equipo viven fuera del repo y nunca llegan aquí.
export function publicPalettes(TOOL) {
  const dir = join(TOOL, 'brands'), out = {};
  for (const f of existsSync(dir) ? readdirSync(dir).sort() : []) {
    if (!f.endsWith('.json')) continue;
    const id = f.slice(0, -5), p = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    out[id] = {id, name: p.name || id, dark: p.dark, light: p.light, accent: p.accent};
  }
  return out;
}

// En "## Notas" se quitan las viñetas que cuentan el origen interno del efecto; el resto (descripción, uso, parámetros) se publica tal cual.
export function scrubMd(md) {
  let inNotes = false;
  return md.split('\n').filter(ln => {
    if (/^##\s/.test(ln)) inNotes = /^##\s+Notas/i.test(ln);
    return !(inNotes && /^\s*[-*]\s/.test(ln) && (INTERNAL_LINE.test(ln) || /^\s*-\s+Los parámetros están en `effect\.json`/.test(ln)));
  }).join('\n')
    // el visitante no ve archivos del repo: lo que copia es el code.css / code.html de la ficha o de la API
    .replace(/`fx\.css`/g, '`code.css`').replace(/`fx\.html`/g, '`code.html`')
    .replace(/Los parámetros y sus rangos están en `effect\.json` → `fx\.params`\. /g, '')
    .replace(/Pon el sonido en `gen_audio\.py` en ese mismo segundo/g, 'Sincroniza el sonido en ese mismo segundo')
    .replace(/\n## Notas\s*$/i, '\n').trim() + '\n';
}

export function publicEffect(e) {
  return {id: e.id, name: e.name, kind: e.kind, medium: e.medium, tags: e.tags || [], brands: [], uses: [], spec: 1,
    audio: e.audio?.sync ? {sync: e.audio.sync} : null, md: scrubMd(e.md || ''), fx: e.fx, snippet: null, snippetName: null, demo: {type: 'fx', variants: []}};
}

// Devuelve {effects, palettes}. Lanza un error si queda algún rastro de marcas o de rutas del repo.
export function publicBundle(TOOL, data) {
  const effects = data.effects.filter(e => e.fx && !e.supersededBy).map(publicEffect);
  const palettes = publicPalettes(TOOL);
  const names = [...new Set(privateBrandNames(TOOL))];   // marcas que no son del repo: no pueden aparecer en nada público
  const rx = new RegExp(`${names.length ? `\\b(${names.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b|` : ''}brands/|engine\\.js|postVideo|video-template|_shared/|/home/|effect\\.json|fx\\.params|gen_audio|catalog/|posts (effect|site|catalog)|fx\\.(css|html)\\b`, 'i');
  const leaks = [];
  for (const e of effects) {
    const m = rx.exec(JSON.stringify({id: e.id, name: e.name, tags: e.tags, audio: e.audio, md: e.md, css: e.fx.cssText, html: e.fx.htmlText}));   // lo que ve el visitante (no los nombres de archivo internos de fx)
    if (m) leaks.push(`${e.id}: «${m[0]}»`);
  }
  if (leaks.length) throw new Error('El catálogo público contiene referencias internas (marcas, rutas o posts). Límpialas en effect.md / effect.json:\n  ' + leaks.join('\n  '));
  return {effects, palettes, brands: palettes};
}
