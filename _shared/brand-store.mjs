// Almacén de marcas. Hoy escribe archivos del repo (brands/<id>.json, brands/<id>.md, brands/<id>/design.md, brands/<id>/logos/*).
// La UI y el CLI usan SOLO esta interfaz: si algún día las marcas pasan a una base de datos, se sustituye este módulo sin tocar lo demás.
import {existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, symlinkSync, lstatSync, copyFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {brandRoot, brandIds} from './brands-dirs.mjs';

export class BrandError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export const LIMITS = {design: 512 * 1024, notes: 256 * 1024, logo: 2 * 1024 * 1024};
const ID_RE = /^[a-z0-9][a-z0-9-]{1,28}$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const FONT_RE = /^[A-Za-z0-9][A-Za-z0-9 .&'-]{0,38}$/;
const LOGO_EXT = {png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml'};

// Nunca deben llegar a un repo: claves, tokens y credenciales (regla del proyecto)
const SECRET_PATTERNS = [
  [/(api[_-]?key|secret|token|password|passwd|authorization)\s*[:=]\s*['"]?[A-Za-z0-9_\-.]{12,}/i, 'una clave o token asignado'],
  [/\bsk-[A-Za-z0-9_-]{20,}/, 'una clave tipo sk-…'],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/, 'un token de GitHub'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'una clave de AWS'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'una clave privada'],
  [/COCKPIT_API_TOKEN/, 'COCKPIT_API_TOKEN'],
];
export function assertNoSecrets(text, what) {
  for (const [re, label] of SECRET_PATTERNS) if (re.test(text)) throw new BrandError(`${what} parece contener ${label}. Los tokens y claves nunca se guardan en el repo: quítalo y vuelve a intentar.`, 422);
}

const mixHex = (h, t, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - k) + t * k).toString(16).padStart(2, '0')).join('');
const str = (v, max, what) => {
  if (v == null) return undefined;
  if (typeof v !== 'string' || v.length > max) throw new BrandError(`${what} debe ser texto de hasta ${max} caracteres`);
  return v.trim();
};
const atomicWrite = (p, data) => { mkdirSync(dirname(p), {recursive: true}); const tmp = p + '.tmp-' + process.pid; writeFileSync(tmp, data); renameSync(tmp, p); };

export function fontsUrl(head, body) {
  const gf = n => 'family=' + encodeURIComponent(n).replace(/%20/g, '+') + ':wght@400;700';
  return 'https://fonts.googleapis.com/css2?' + [...new Set([head, body])].map(gf).join('&') + '&display=swap';
}

export function createFileStore({TOOL, POSTS}) {
  const bdir = id => join(brandRoot(TOOL, id), id);
  const jsonPath = id => join(brandRoot(TOOL, id), id + '.json');
  const mdPath = id => join(brandRoot(TOOL, id), id + '.md');
  const checkId = id => { if (!ID_RE.test(id || '')) throw new BrandError('El id de la marca va en minúsculas, números o guiones (2-29 caracteres, ej. mimarca)'); return id; };
  const mustExist = id => { checkId(id); if (!existsSync(jsonPath(id))) throw new BrandError(`La marca "${id}" no existe`, 404); return id; };
  const readJson = id => JSON.parse(readFileSync(jsonPath(id), 'utf8'));

  function renderVideoTemplate(o) {
    const base = readFileSync(join(TOOL, '_shared', 'base', 'video-template.html'), 'utf8');
    return base.replaceAll('__BRAND__', o.short).replaceAll('__FONTS__', fontsUrl(o.head, o.body)).replaceAll('__HEAD__', `'${o.head}'`).replaceAll('__BODY__', `'${o.body}'`)
      .replaceAll('__WA__', o.wa).replaceAll('__WEB__', o.web)
      .replaceAll('__VARS__', `  --bg:${o.dark};--bg2:${mixHex(o.dark, 255, 0.1)};--accent:${o.accent};--accent-dark:${mixHex(o.accent, 0, 0.25)};--light:${o.light};`);
  }

  function logosOf(id) {
    const dir = join(bdir(id), 'logos');
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter(f => LOGO_EXT[f.split('.').pop().toLowerCase()]).sort().map(f => ({file: f, size: statSync(join(dir, f)).size}));
  }

  function summary(id) {
    const j = readJson(id);
    return {id, name: j.name, short: j.short, dark: j.dark, light: j.light, accent: j.accent, headFont: j.headFont, bodyFont: j.bodyFont,
      generated: !!j.generated, hasDesign: existsSync(join(bdir(id), 'design.md')), externalDesign: !!j.designFile, logos: logosOf(id).length};
  }

  return {
    list() {
      return brandIds(TOOL).flatMap(id => { try { return [summary(id)]; } catch { return []; } });
    },

    get(id) {
      mustExist(id);
      const j = readJson(id), dp = join(bdir(id), 'design.md');
      return {
        id, ...j, generated: !!j.generated,
        notes: existsSync(mdPath(id)) ? readFileSync(mdPath(id), 'utf8') : '',
        design: existsSync(dp) ? readFileSync(dp, 'utf8') : null,
        externalDesign: j.designFile || null,
        logos: logosOf(id),
        hasVideoTemplate: existsSync(join(bdir(id), '_shared', 'video-template.html')),
      };
    },

    create(o) {
      checkId(o.id);
      if (existsSync(jsonPath(o.id))) throw new BrandError(`La marca "${o.id}" ya existe`, 409);
      for (const [k, v] of [['oscuro', o.dark], ['claro', o.light], ['acento', o.accent]]) if (!HEX_RE.test(v || '')) throw new BrandError(`El color ${k} debe ser #RRGGBB`);
      const name = str(o.name, 80, 'El nombre'); if (!name) throw new BrandError('Falta el nombre de la marca');
      for (const [k, v] of [['títulos', o.head], ['texto', o.body || 'Inter']]) if (!FONT_RE.test(v || '')) throw new BrandError(`La fuente de ${k} no es válida (nombre de Google Fonts)`);
      const c = {
        short: str(o.short, 30, 'La sigla') || name.toUpperCase(), wa: str(o.wa, 40, 'WhatsApp') || 'WhatsApp', web: str(o.web, 120, 'La web') || 'tusitio.com',
        email: str(o.email, 120, 'El correo'), design: str(o.design, 300, 'La ruta de diseño'),
      };
      assertNoSecrets([name, c.short, c.wa, c.web, c.email || ''].join('\n'), 'Los datos de la marca');
      const x = {...o, ...c, name, body: o.body || 'Inter'};
      const sh = join(bdir(o.id), '_shared');
      mkdirSync(sh, {recursive: true});
      atomicWrite(join(sh, 'video-template.html'), renderVideoTemplate(x));
      copyFileSync(join(TOOL, '_shared', 'base', 'synth.py'), join(sh, 'synth.py'));
      copyFileSync(join(TOOL, '_shared', 'base', 'gen_audio.template.py'), join(sh, 'gen_audio.template.py'));
      atomicWrite(jsonPath(o.id), JSON.stringify({
        name, short: c.short, sound: 'synth (sin música)', designFile: c.design || null, designExtra: [],
        contact: {whatsapp: c.wa, ...(c.email ? {email: c.email} : {}), web: c.web},
        fonts: fontsUrl(o.head, x.body), headFont: o.head, bodyFont: x.body, dark: o.dark, light: o.light, accent: o.accent, legacyMonths: {}, generated: true,
      }, null, 2) + '\n');
      atomicWrite(mdPath(o.id), `# Marca: ${o.id}

${name}

DATOS A COMPLETAR (verificar contra el sitio real antes de usarlos)
  Sitio web:   ${c.web}
  Contacto:    ${c.wa}
  Logo:        (subir los archivos en la UI o indicar su ruta)
  Tipografía:  ${o.head} (títulos) + ${x.body} (texto)
  Colores:     fondo oscuro ${o.dark}, claro ${o.light}, acento ${o.accent}
  Diseño:      ${c.design || '(sin archivo de diseño: subir un design.md o pedir la ruta al usuario)'}

RECURSOS
  brands/${o.id}/_shared/: video-template.html, synth.py (sonido sintetizado, sin descargas ni música), gen_audio.template.py.
  Sonido: SINTETIZADO (docs/audio.md, enfoque C).
`);
      let linked = null;
      if (POSTS) {
        const dest = join(POSTS, o.id, '_shared');
        try { lstatSync(dest); } catch { mkdirSync(dirname(dest), {recursive: true}); symlinkSync(sh, dest); linked = dest; }
      }
      return {id: o.id, sharedDir: sh, linked};
    },

    // Cambia identidad/colores/fuentes/contacto. Con regenerate=true reescribe la plantilla de video (solo marcas generadas).
    update(id, patch) {
      mustExist(id);
      const j = readJson(id), out = {...j};
      if ('name' in patch) { const v = str(patch.name, 80, 'El nombre'); if (!v) throw new BrandError('El nombre no puede quedar vacío'); out.name = v; }
      if ('short' in patch) out.short = str(patch.short, 30, 'La sigla') || out.name.toUpperCase();
      for (const [k, lbl] of [['dark', 'oscuro'], ['light', 'claro'], ['accent', 'de acento']]) if (k in patch) { if (!HEX_RE.test(patch[k] || '')) throw new BrandError(`El color ${lbl} debe ser #RRGGBB`); out[k] = patch[k]; }
      for (const [k, key] of [['headFont', 'títulos'], ['bodyFont', 'texto']]) if (k in patch) { if (!FONT_RE.test(patch[k] || '')) throw new BrandError(`La fuente de ${key} no es válida (nombre de Google Fonts)`); out[k] = patch[k]; }
      if ('headFont' in patch || 'bodyFont' in patch) out.fonts = fontsUrl(out.headFont, out.bodyFont || 'Inter');
      if (patch.contact) {
        const c = {...(j.contact || {})};
        for (const k of ['whatsapp', 'phone', 'email', 'web']) if (k in patch.contact) { const v = str(patch.contact[k], 120, 'El contacto'); if (v) c[k] = v; else delete c[k]; }
        out.contact = c;
      }
      assertNoSecrets(JSON.stringify([out.name, out.short, out.contact]), 'Los datos de la marca');
      let regenerated = false;
      if (patch.regenerate) {
        if (!j.generated) throw new BrandError('Esta marca tiene plantilla de video hecha a mano: no se regenera automáticamente para no pisar tus cambios', 409);
        atomicWrite(join(bdir(id), '_shared', 'video-template.html'), renderVideoTemplate({
          short: out.short, head: out.headFont, body: out.bodyFont || 'Inter', dark: out.dark, light: out.light, accent: out.accent,
          wa: out.contact?.whatsapp || 'WhatsApp', web: out.contact?.web || 'tusitio.com',
        }));
        regenerated = true;
      }
      atomicWrite(jsonPath(id), JSON.stringify(out, null, 2) + '\n');
      return {regenerated};
    },

    saveNotes(id, text) {
      mustExist(id);
      if (typeof text !== 'string' || Buffer.byteLength(text) > LIMITS.notes) throw new BrandError('Las notas deben ser texto de hasta 256 KB');
      assertNoSecrets(text, 'Las notas');
      atomicWrite(mdPath(id), text.endsWith('\n') ? text : text + '\n');
    },

    saveDesign(id, text) {
      mustExist(id);
      if (typeof text !== 'string' || !text.trim()) throw new BrandError('El design.md está vacío');
      if (Buffer.byteLength(text) > LIMITS.design) throw new BrandError('El design.md es demasiado grande (máximo 512 KB)');
      if (text.includes('\u0000')) throw new BrandError('El archivo no parece texto');
      assertNoSecrets(text, 'El design.md');
      atomicWrite(join(bdir(id), 'design.md'), text.endsWith('\n') ? text : text + '\n');
    },

    deleteDesign(id) { mustExist(id); rmSync(join(bdir(id), 'design.md'), {force: true}); },

    addLogo(id, name, buf, ext) {
      mustExist(id);
      ext = String(ext || '').toLowerCase();
      if (!LOGO_EXT[ext]) throw new BrandError('El logo debe ser PNG, JPG, WEBP o SVG');
      if (!/^[a-z0-9][a-z0-9_-]{0,39}$/.test(name || '')) throw new BrandError('El nombre del logo va en minúsculas, números, guiones (ej. blanco, oscuro, simbolo)');
      if (!buf.length || buf.length > LIMITS.logo) throw new BrandError('El logo debe pesar entre 1 byte y 2 MB');
      const head = buf.subarray(0, 12);
      const ok = ext === 'png' ? head.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
        : ext === 'jpg' || ext === 'jpeg' ? head.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
        : ext === 'webp' ? head.subarray(0, 4).toString() === 'RIFF' && head.subarray(8, 12).toString() === 'WEBP'
        : /<svg[\s>]/i.test(buf.toString('utf8', 0, Math.min(buf.length, 4096)));
      if (!ok) throw new BrandError('El contenido no coincide con el tipo de archivo indicado');
      if (ext === 'svg' && /<script|\son[a-z]+\s*=|javascript:|<foreignObject/i.test(buf.toString('utf8'))) throw new BrandError('El SVG contiene scripts o contenido activo: expórtalo como SVG simple', 422);
      const file = `${name}.${ext === 'jpeg' ? 'jpg' : ext}`;
      for (const f of logosOf(id)) if (f.file.split('.')[0] === name && f.file !== file) rmSync(join(bdir(id), 'logos', f.file), {force: true}); // mismo nombre, otro formato: se reemplaza
      atomicWrite(join(bdir(id), 'logos', file), buf);
      return file;
    },

    deleteLogo(id, file) {
      mustExist(id);
      if (!/^[a-z0-9][a-z0-9_-]{0,39}\.(png|jpg|webp|svg)$/.test(file || '')) throw new BrandError('Nombre de logo no válido');
      rmSync(join(bdir(id), 'logos', file), {force: true});
    },

    logoFile(id, file) {
      mustExist(id);
      if (!/^[a-z0-9][a-z0-9_-]{0,39}\.(png|jpg|webp|svg)$/.test(file || '')) return null;
      const p = join(bdir(id), 'logos', file);
      return existsSync(p) ? {path: p, type: LOGO_EXT[file.split('.').pop()]} : null;
    },
  };
}
