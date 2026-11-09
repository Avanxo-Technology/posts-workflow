// Pruebas de la API compartida y del build del sitio: node --test _shared/site/site.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, mkdirSync, writeFileSync, statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {catalogData} from '../catalog-server.mjs';
import {createApi} from './api-core.mjs';
import {buildSite} from './build.mjs';
import {privateBrandNames} from '../brands-dirs.mjs';

const TOOL = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FX = createRequire(import.meta.url)('../catalog-ui/fx-core.js');
const PRIV = privateBrandNames(TOOL);            // marcas reales de este equipo (si las hay): no pueden aparecer en lo público
process.env.POSTS_BRANDS_DIR = '/nonexistent';   // las pruebas usan solo lo que trae el repo
const data = catalogData(TOOL, '');
const api = createApi({getBundle: () => data, FX});
const get = async (path, init) => { const r = await api(new Request('https://site.test' + path, init)); return {r, j: r && r.headers.get('content-type')?.includes('json') ? await r.clone().json() : null}; };

test('api: lista, filtros y ficha con valores por defecto', async () => {
  const {j} = await get('/api/v1/effects?kind=transition');
  assert.ok(j.count >= 10 && j.effects.every(e => e.kind === 'transition'));
  const d = (await get('/api/v1/effects/slam')).j;
  assert.equal(d.parametrized, true); assert.equal(d.values.duration, 0.7); assert.ok(d.code.css.includes('@keyframes fx-slam'));
  assert.equal(d.self, 'https://site.test/api/v1/effects/slam');                   // el origen sale de la petición
});

test('api: parámetros a medida, paleta, errores y efecto antiguo', async () => {
  const d = (await get('/api/v1/effects/sweep-panel?delay=3&direction=top&palette=oceano')).j;
  assert.equal(d.values.delay, 3); assert.equal(d.palette.from, 'oceano'); assert.equal(d.markers[0].at, 3.4);
  const bad = await get('/api/v1/effects/slam?duration=99&foo=1');
  assert.equal(bad.r.status, 400); assert.ok(bad.j.details.length === 2);
  assert.equal((await get('/api/v1/effects/nope')).r.status, 404);
});

test('api: textos y colores de los elementos de muestra, con etiqueta genérica y validación', async () => {
  const d = (await get('/api/v1/effects/slam?el_text=Hola&el_color=%23ffffff&el_bg=%23112233&el_size=120')).j;
  assert.ok(d.code.html.includes('<div class="fx-slam"') && !/<h[1-6]/.test(d.code.html) && d.code.html.includes('>Hola</div>'));
  assert.ok(d.code.html.includes('background:#112233;color:#ffffff;font-size:120px'));
  assert.ok((await get('/api/v1/effects/slam?el_w=70&el_pad=40')).j.code.html.includes('width:70%;padding:40px'));
  assert.deepEqual(d.elements.editable, [{id: 's', kind: 'sample', text: 'Título'}]);
  const sc = (await get('/api/v1/effects/scene-push?el_a_text=Inicio&el_b_bg=%23ff0000')).j;
  assert.ok(sc.code.html.includes('>Inicio</div>') && sc.code.html.includes('background:#ff0000'));
  for (const bad of ['el_color=rojo', 'el_size=9999', 'el_w=500', 'el_pad=-1', 'el_zzz=1', 'el_x_text=a', 'el_text=' + 'x'.repeat(81)]) {
    const r = await get('/api/v1/effects/slam?' + bad);
    assert.equal(r.r.status, 400, bad); assert.equal(r.r.headers.get('cache-control'), 'no-store');   // los errores no se cachean
  }
});

test('api: elementos que añade el usuario (posición, origen y tiempos) y varios textos', async () => {
  const q = '/api/v1/effects/fly-elements?el_e1_text=Hola&el_e1_x=20&el_e1_y=70&el_e1_from=left&el_e1_delay=1&el_e2_text=Dos&el_e2_x=70&el_e2_y=30&el_e2_from=custom&el_e2_fx=95&el_e2_fy=5';
  const d = (await get(q)).j;
  assert.ok(d.code.html.includes('left:20%;top:70%') && d.code.html.includes('--dx:-916px') && d.code.html.includes('--dx:270px;--dy:-480px'));
  assert.equal((d.code.html.match(/fx-fly-pos/g) || []).length, 2);
  assert.equal(d.elements.items.max, 8); assert.ok(d.elements.items.samples.e1 && d.elements.items.howTo.includes('el_e1_x'));
  for (const bad of ['el_e1_x=500', 'el_e9_text=a', 'el_e1_from=zzz', 'el_x=5']) assert.equal((await get('/api/v1/effects/fly-elements?' + bad)).r.status, 400, bad);
  const t = (await get('/api/v1/effects/title-stack?el_s2_text=Linea%202&el_s3_bg=%2300ff00')).j;
  assert.ok(t.code.html.includes('>Linea 2</div>') && t.code.html.includes('background:#00ff00'));
  assert.deepEqual(t.elements.editable.map(x => x.id).sort(), ['s', 's2', 's3']);
});

test('api: propiedades de aspecto de los elementos (opacidad, esquinas, giro, escala, sombra…)', async () => {
  const d = (await get('/api/v1/effects/slam?el_opacity=40&el_radius=12&el_rot=-8&el_scale=120&el_shadow=0&el_ls=3&el_weight=700&el_bw=4&el_bc=%23ff0000&el_bg=%23112233&el_bga=60')).j;
  for (const frag of ['filter:opacity(40%)', 'border-radius:12px', 'rotate:-8deg', 'scale:1.2', 'box-shadow:none', 'letter-spacing:3px', 'font-weight:700', 'border:4px solid #ff0000', 'color-mix(in srgb,#112233 60%,transparent)'])
    assert.ok(d.code.html.includes(frag), frag);
  const it = (await get('/api/v1/effects/fly-elements?el_e1_text=Hola&el_e1_opacity=50&el_e1_rot=10')).j;
  assert.ok(it.code.html.includes('filter:opacity(50%)') && it.code.html.includes('rotate:10deg'));
  for (const bad of ['el_opacity=101', 'el_rot=200', 'el_scale=1', 'el_bc=rojo', 'el_weight=50']) assert.equal((await get('/api/v1/effects/slam?' + bad)).r.status, 400, bad);
});

test('api: fuentes de los elementos y lista de fuentes (marcas y generales)', async () => {
  const d = (await get('/api/v1/effects/slam?el_font=Oswald')).j;
  assert.ok(d.code.html.includes("font-family:'Oswald',sans-serif") && d.code.css.startsWith('@import url('));
  assert.equal((await get('/api/v1/effects/slam?el_font=' + encodeURIComponent("a');}"))).r.status, 400);
  const f = (await get('/api/v1/fonts')).j;
  assert.ok(f.general.google.includes('Poppins') && f.general.system.includes('Georgia') && Array.isArray(f.brands));   // el catálogo local (con marcas) devuelve `brands`
  assert.ok(f.brands.every(b => b.heading || b.body));
});

test('api: kits (JSON y página HTML con CSP), límites y métodos', async () => {
  const E = {}; for (const e of data.effects) if (e.fx) E[e.id] = e;
  const k = FX.encodeKit({name: 'K', palette: 'oceano', items: [{effect: 'slam', label: 'Hola', params: {delay: 0.3}}, {effect: 'screen-shake', params: {delay: 1}}]}, E);
  const j = (await get('/api/v1/kit?k=' + k)).j;
  assert.equal(j.totalSeconds, 1.5); assert.ok(j.code.html.startsWith('<div class="fx-shake"'));
  const h = await get(`/api/v1/kit?k=${k}&format=html`);
  assert.ok(h.r.headers.get('content-security-policy').includes("default-src 'none'"));
  assert.equal((await get('/api/v1/kit?k=' + 'a'.repeat(9000))).r.status, 400);
  assert.equal((await get('/api/v1/kit?k=basura')).r.status, 400);
  assert.equal((await get('/api/v1/kit')).r.status, 400);
  assert.equal((await get('/api/v1/effects', {method: 'POST'})).r.status, 405);
  assert.equal((await get('/api/v1/effects', {method: 'OPTIONS'})).r.status, 204);
  assert.equal(await api(new Request('https://site.test/otra-cosa')), null);        // lo que no es API se deja pasar
  assert.equal((await get('/api/v1/effects')).r.headers.get('access-control-allow-origin'), '*');
});

test('build: estructura, sin rutas locales ni marcadores, UI estática sin editor de marcas', async () => {
  const out = mkdtempSync(join(tmpdir(), 'posts-site-'));
  try {
    const dist = join(out, 'dist');
    const r = await buildSite({TOOL, out: dist, base: ''});
    assert.equal(r.effects, data.effects.filter(e => e.fx && !e.supersededBy).length);
    for (const f of ['public/index.html', 'public/app.js', 'public/kit.js', 'public/fx-core.js', 'public/data/catalog.json', 'public/llms.txt', 'public/api/v1/effects.json', 'public/api/v1/effects/slam.json',
      'public/demo/slam.html', 'public/demo/iris-reveal.html', 'lib/fx-core.mjs', 'lib/api-core.mjs', 'lib/data.mjs', 'functions/api/v1/[[path]].js', 'functions/llms.txt.js', 'netlify/functions/api.mjs', 'netlify.toml', 'README.md'])
      assert.ok(existsSync(join(dist, f)), f);
    assert.ok(!existsSync(join(dist, 'public/brands.js')), 'el editor de marcas no se publica');
    const index = readFileSync(join(dist, 'public/index.html'), 'utf8');
    assert.ok(index.includes('posts-mode') && !index.includes('posts-token') && !index.includes('brands.js') && !index.includes('#/marcas'));
    const walk = d => readdirSync(d).flatMap(f => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
    for (const f of walk(dist)) { const t = readFileSync(f, 'utf8'); assert.ok(!t.includes(TOOL), 'ruta local en ' + f); assert.ok(!t.includes('placeholder.invalid'), 'marcador en ' + f); }
    const slam = JSON.parse(readFileSync(join(dist, 'public/api/v1/effects/slam.json'), 'utf8'));
    assert.equal(slam.self, '/api/v1/effects/slam');                                 // sin --base: rutas relativas
    // la carpeta generada se puede regenerar, pero no pisa una carpeta cualquiera
    await buildSite({TOOL, out: dist, base: 'https://catalogo.example.com'});
    assert.equal(JSON.parse(readFileSync(join(dist, 'public/api/v1/effects/slam.json'), 'utf8')).self, 'https://catalogo.example.com/api/v1/effects/slam');
    const other = join(out, 'otra'); mkdirSync(other); writeFileSync(join(other, 'a.txt'), 'x');
    await assert.rejects(() => buildSite({TOOL, out: other}), /no es un build anterior/);
    assert.ok(existsSync(join(other, 'a.txt')));
  } finally { rmSync(out, {recursive: true, force: true}); }
});

test('build público: sin marcas, rutas, posts ni efectos no autocontenidos', async () => {
  const out = mkdtempSync(join(tmpdir(), 'posts-site-'));
  try {
    const dist = join(out, 'dist'); await buildSite({TOOL, out: dist});
    const walk = d => readdirSync(d).flatMap(f => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
    const rx = new RegExp((PRIV.length ? `\\b(${PRIV.join('|')})\\b|` : '') + 'brands/|engine\\.js|postVideo|video-template|catalog/posts|/home/', 'i');
    for (const f of walk(dist)) { const m = rx.exec(readFileSync(f, 'utf8')); assert.ok(!m, `rastro interno «${m && m[0]}» en ${f}`); }
    const cat = JSON.parse(readFileSync(join(dist, 'public/data/catalog.json'), 'utf8'));
    assert.deepEqual(cat.posts, []); assert.ok(cat.effects.every(e => e.fx && !e.uses.length && !e.brands && !e.source));
    assert.ok(Object.keys(cat.palettes).includes('oceano') && !Object.keys(cat.palettes).some(b => PRIV.includes(b)) && !('brands' in cat), 'lo público habla de paletas, no de marcas');
    const d = JSON.parse(readFileSync(join(dist, 'public/api/v1/effects/slam.json'), 'utf8'));
    assert.ok(!('usedIn' in d) && !('brands' in d));
    const index = readFileSync(join(dist, 'public/index.html'), 'utf8');
    assert.ok(!index.includes('#/posts') && index.includes('#/guardadas') && index.includes('#/kit'));
    const llms = readFileSync(join(dist, 'public/llms.txt'), 'utf8');
    assert.ok(llms.includes('palette=oceano') && !llms.includes('brand='));
  } finally { rmSync(out, {recursive: true, force: true}); }
});

test('build público: la API y los datos hablan de paletas y fuentes sugeridas, no de marcas', async () => {
  const out = mkdtempSync(join(tmpdir(), 'posts-site-'));
  try {
    const dist = join(out, 'dist'); await buildSite({TOOL, out: dist});
    const imp = f => import(pathToFileURL(join(dist, f)).href);
    const cf = await imp('functions/api/v1/[[path]].js');
    const f = await (await cf.onRequest({request: new Request('https://x.test/api/v1/fonts')})).json();
    assert.ok(Array.isArray(f.suggested) && f.suggested.length >= 8 && !('brands' in f));
    assert.ok(f.suggested.every(p => p.palette && (p.heading || p.body)));
    const data = (await imp('lib/data.mjs')).default;
    assert.ok(data.palettes && !('brands' in data));
    const llms = readFileSync(join(dist, 'public/llms.txt'), 'utf8');
    assert.ok(!/\bmarcas?\b|\bbrands?\b/i.test(llms), 'llms.txt público sin marcas');
    const app = readFileSync(join(dist, 'public/data/catalog.json'), 'utf8');
    assert.ok(!/"brands"/.test(app));
  } finally { rmSync(out, {recursive: true, force: true}); }
});

test('build: los adaptadores generados (Cloudflare y Netlify) funcionan tal cual se despliegan', async () => {
  const out = mkdtempSync(join(tmpdir(), 'posts-site-'));
  try {
    const dist = join(out, 'dist'); await buildSite({TOOL, out: dist});
    const imp = f => import(pathToFileURL(join(dist, f)).href);
    const cf = await imp('functions/api/v1/[[path]].js'), cfl = await imp('functions/llms.txt.js'), nl = await imp('netlify/functions/api.mjs');
    const req = u => new Request('https://mi-sitio.test' + u);
    const a = await (await cf.onRequest({request: req('/api/v1/effects/slam?duration=0.5&palette=oceano')})).json();
    assert.equal(a.values.duration, 0.5); assert.equal(a.self, 'https://mi-sitio.test/api/v1/effects/slam');
    assert.ok((await (await cfl.onRequest({request: req('/llms.txt')})).text()).includes('https://mi-sitio.test/api/v1/effects'));
    assert.equal((await cf.onRequest({request: req('/api/v1/zzz')})).status, 404);
    const b = await (await nl.default(req('/api/v1/effects?kind=camera'))).json();
    assert.ok(b.count >= 3);
    assert.deepEqual(nl.config.path, ['/api/v1', '/api/v1/*', '/llms.txt']);
    // el FX generado (ESM) da los mismos resultados que el original
    const {default: FX2} = await imp('lib/fx-core.mjs');
    assert.deepEqual(Object.keys(FX2).sort(), Object.keys(FX).sort());
  } finally { rmSync(out, {recursive: true, force: true}); }
});
