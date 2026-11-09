// Dónde viven las marcas. El repo trae solo marcas genéricas (brands/). Las marcas reales de cada equipo van en una carpeta PRIVADA fuera del repo:
//   POSTS_BRANDS_DIR=/ruta   o   un archivo .posts-brands (ignorado por git) con la ruta. Ahí caben <id>.json, <id>.md, <id>/ y catalog-posts/<marca>/*.json.
// Si el mismo id está en las dos carpetas, gana la privada.
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join, resolve} from 'node:path';

export function privateBrandsDir(TOOL) {
  const f = join(TOOL, '.posts-brands');
  const raw = process.env.POSTS_BRANDS_DIR || (existsSync(f) ? readFileSync(f, 'utf8').trim() : '');
  const dir = raw ? resolve(raw) : '';
  return dir && existsSync(dir) ? dir : '';
}
export const brandRoots = TOOL => [privateBrandsDir(TOOL), join(TOOL, 'brands')].filter(Boolean);
// Carpeta donde está <id>.json (o la del repo, para marcas nuevas)
export const brandRoot = (TOOL, id) => brandRoots(TOOL).find(d => existsSync(join(d, id + '.json'))) || join(TOOL, 'brands');
export function brandIds(TOOL) {
  const ids = new Set();
  for (const d of brandRoots(TOOL)) if (existsSync(d)) for (const f of readdirSync(d)) if (f.endsWith('.json')) ids.add(f.slice(0, -5));
  return [...ids].sort();
}
// Ids y nombres de las marcas que NO son del repo (para comprobar que no se filtran a lo público)
export function privateBrandNames(TOOL) {
  const d = privateBrandsDir(TOOL), out = [];
  if (!d) return out;
  for (const id of brandIds(TOOL)) {
    if (existsSync(join(TOOL, 'brands', id + '.json'))) continue;
    out.push(id);
    try { const j = JSON.parse(readFileSync(join(d, id + '.json'), 'utf8')); for (const k of [j.name, j.short]) if (k) out.push(k); } catch { /* ilegible */ }
  }
  return out.filter(s => s.length > 1);
}
