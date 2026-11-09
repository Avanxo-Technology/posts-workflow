// Build del sitio público: una carpeta lista para publicar en un hosting estático con funciones.
//   <out>/public/      sitio estático (UI, datos, miniaturas, JSON por defecto de la API, llms.txt)
//   <out>/lib/         código compartido de la función (fx-core, api-core y los datos del catálogo)
//   <out>/functions/   adaptador Cloudflare Pages Functions
//   <out>/netlify/     adaptador Netlify Functions (+ netlify.toml)
// La lógica de la API es la misma que usa `posts catalog` (site/api-core.mjs).
import {copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {catalogData} from '../catalog-server.mjs';
import {createApi, llmsTxt} from './api-core.mjs';
import {fxCardPage, previewBaseCss} from './card-page.mjs';
import {publicBundle} from './public.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const UI = join(HERE, '..', 'catalog-ui');
const FX = createRequire(import.meta.url)('../catalog-ui/fx-core.js');
const MARKER = '.posts-site-build';
export const SITE_NAME = 'Transitions';   // nombre público del sitio (el repo conserva el suyo)
const PLACEHOLDER = 'https://site-placeholder.invalid';   // en minúsculas: new URL() normaliza el host y la sustitución debe coincidir   // origen provisional con el que se generan los JSON estáticos; se sustituye por --base o por rutas relativas

const write = (p, data) => { mkdirSync(dirname(p), {recursive: true}); writeFileSync(p, data); };

export async function buildSite({TOOL, out, base = ''}) {
  out = resolve(out);
  base = base.replace(/\/+$/, '');
  if (existsSync(out)) {
    if (existsSync(join(out, MARKER))) rmSync(out, {recursive: true, force: true});
    else if (readdirSync(out).length) throw new Error(`"${out}" ya existe y no es un build anterior (falta ${MARKER}): elige otra carpeta o bórrala tú.`);
  }
  const data = publicBundle(TOOL, catalogData(TOOL, ''));   // solo efectos autocontenidos y paletas neutras: sin marcas, rutas ni posts (falla si queda algún rastro)
  const bundle = {effects: data.effects, brands: data.palettes, public: true};
  const pub = join(out, 'public');
  const stats = {effects: data.effects.length, demos: 0, apiFiles: 0};

  // ---- UI estática (sin el editor de marcas, que escribe en disco) ----
  let index = readFileSync(join(UI, 'index.html'), 'utf8')
    .replace('<meta name="posts-token" content="__TOKEN__">', '<meta name="posts-mode" content="static">')
    .replace('\n<script src="/brands.js"></script>', '')
    .replace('<a href="#/marcas" data-r="marcas">Marcas</a>', '')
    .replace('<a href="#/posts" data-r="posts">Posts</a>', '')
    .replace('Buscar efecto, etiqueta o post…', 'Buscar transición o etiqueta…')
    .replace('<title>Posts · catálogo y marcas</title>', `<title>${SITE_NAME} · efectos para videos de redes</title>`)
    .replace('<a class="logo" href="#/">Posts</a>', `<a class="logo" href="#/">${SITE_NAME}</a>`);
  write(join(pub, 'index.html'), index);
  for (const f of ['app.js', 'kit.js', 'style.css', 'fx-core.js', 'fx-preview.html']) copyFileSync(join(UI, f), join(pub, f));
  write(join(pub, 'data', 'catalog.json'), JSON.stringify({effects: data.effects, posts: [], brands: data.palettes, public: true}));

  // ---- miniaturas de la galería ----
  const baseCss = previewBaseCss(readFileSync(join(UI, 'fx-preview.html'), 'utf8'));
  for (const e of data.effects) {
    write(join(pub, 'demo', e.id + '.html'), fxCardPage(FX, e, Object.values(data.palettes)[0], baseCss)); stats.demos++;
  }

  // ---- API por defecto como archivos (la función cubre los valores a medida) ----
  const api = createApi({getBundle: () => bundle, FX, cache: 'public, max-age=300'});
  const fixed = async path => {
    const res = await api(new Request(PLACEHOLDER + path));
    return (await res.text()).replaceAll(PLACEHOLDER, base);
  };
  return (async () => {
    write(join(pub, 'api', 'v1', 'effects.json'), await fixed('/api/v1/effects')); stats.apiFiles++;
    for (const e of data.effects) { write(join(pub, 'api', 'v1', 'effects', e.id + '.json'), await fixed('/api/v1/effects/' + e.id)); stats.apiFiles++; }
    write(join(pub, 'llms.txt'), llmsTxt(base, true, SITE_NAME));
    write(join(pub, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n/api/*\n  Access-Control-Allow-Origin: *\n');

    // ---- código de la función ----
    const fxSrc = readFileSync(join(UI, 'fx-core.js'), 'utf8');
    write(join(out, 'lib', 'fx-core.mjs'), `// Generado por \`posts site build\` a partir de fx-core.js\nconst module = {exports: {}};\n(function () {\n${fxSrc}\n})();\nexport default module.exports;\n`);
    copyFileSync(join(HERE, 'api-core.mjs'), join(out, 'lib', 'api-core.mjs'));
    write(join(out, 'lib', 'data.mjs'), `// Generado por \`posts site build\`: efectos y marcas del catálogo\nexport default ${JSON.stringify(bundle)};\n`);
    const adapterBody = (rel) => `import {createApi} from '${rel}/lib/api-core.mjs';\nimport FX from '${rel}/lib/fx-core.mjs';\nimport data from '${rel}/lib/data.mjs';\n\nconst handle = createApi({getBundle: () => data, FX});\n`;
    write(join(out, 'functions', 'api', 'v1', '[[path]].js'), `// Cloudflare Pages Functions: /api/v1/*\n${adapterBody('../../..')}\nexport async function onRequest(context) {\n  return (await handle(context.request)) || new Response('No encontrado', {status: 404});\n}\n`);
    write(join(out, 'functions', 'llms.txt.js'), `// Cloudflare Pages Functions: /llms.txt (con el origen real del sitio)\n${adapterBody('..')}\nexport async function onRequest(context) {\n  return (await handle(context.request)) || new Response('No encontrado', {status: 404});\n}\n`);
    write(join(out, 'netlify', 'functions', 'api.mjs'), `// Netlify Functions (v2): /api/v1/* y /llms.txt\n${adapterBody('../..')}\nexport default async (request) => (await handle(request)) || new Response('No encontrado', {status: 404});\n\nexport const config = {path: ['/api/v1', '/api/v1/*', '/llms.txt']};\n`);
    write(join(out, 'netlify.toml'), '[build]\n  publish = "public"\n  functions = "netlify/functions"\n');
    write(join(out, 'README.md'), deployReadme(stats));
    write(join(out, MARKER), 'Carpeta generada por `posts site build`: se puede borrar y regenerar.\n');
    return {out, ...stats};
  })();
}

function deployReadme(s) {
  return `# ${SITE_NAME}: sitio del catálogo de efectos (generado)

Generado por \`posts site build\`. No lo edites a mano: se regenera desde el repositorio.

- \`public/\`: sitio estático (${s.effects} efectos, ${s.demos} miniaturas, ${s.apiFiles} JSON de la API con valores por defecto).
- \`lib/\`, \`functions/\`, \`netlify/\`: la función que responde a \`/api/v1/*\` y \`/llms.txt\` con valores a medida (\`?duration=0.6&palette=oceano\`, kits).

## Probarlo en local (emula el hosting)
\`\`\`
posts site serve --dir <esta carpeta>
\`\`\`

## Publicarlo
Necesita un hosting estático **con funciones**. Sin la función, el sitio y los JSON por defecto funcionan, pero los parámetros a medida y los kits no.
- **Cloudflare Pages**: desde esta carpeta, \`wrangler pages deploy public\` (detecta \`functions/\`).
- **Netlify**: desde esta carpeta, \`netlify deploy --prod\` (usa \`netlify.toml\`).
Los adaptadores usan solo estándares web (\`Request\`/\`Response\`), así que otros hostings con funciones de ese tipo también sirven. No se han probado en una plataforma real.
`;
}
