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

const TOOL = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FX = createRequire(import.meta.url)('../catalog-ui/fx-core.js');
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
  const d = (await get('/api/v1/effects/sweep-panel?delay=3&direction=top&palette=aga')).j;
  assert.equal(d.values.delay, 3); assert.equal(d.palette.from, 'aga'); assert.equal(d.markers[0].at, 3.4);
  const bad = await get('/api/v1/effects/slam?duration=99&foo=1');
  assert.equal(bad.r.status, 400); assert.ok(bad.j.details.length === 2);
  assert.equal((await get('/api/v1/effects/nope')).r.status, 404);
  const old = (await get('/api/v1/effects/aga-iris')).j;
  assert.equal(old.parametrized, false); assert.equal(old.supersededBy, 'iris-reveal');
});

test('api: kits (JSON y página HTML con CSP), límites y métodos', async () => {
  const E = {}; for (const e of data.effects) if (e.fx) E[e.id] = e;
  const k = FX.encodeKit({name: 'K', palette: 'gmaq', items: [{effect: 'slam', label: 'Hola', params: {delay: 0.3}}, {effect: 'screen-shake', params: {delay: 1}}]}, E);
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
    assert.equal(r.effects, data.effects.length);
    for (const f of ['public/index.html', 'public/app.js', 'public/kit.js', 'public/fx-core.js', 'public/data/catalog.json', 'public/llms.txt', 'public/api/v1/effects.json', 'public/api/v1/effects/slam.json',
      'public/demo/slam.html', 'public/demo/aga-iris.html', 'lib/fx-core.mjs', 'lib/api-core.mjs', 'lib/data.mjs', 'functions/api/v1/[[path]].js', 'functions/llms.txt.js', 'netlify/functions/api.mjs', 'netlify.toml', 'README.md'])
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

test('build: los adaptadores generados (Cloudflare y Netlify) funcionan tal cual se despliegan', async () => {
  const out = mkdtempSync(join(tmpdir(), 'posts-site-'));
  try {
    const dist = join(out, 'dist'); await buildSite({TOOL, out: dist});
    const imp = f => import(pathToFileURL(join(dist, f)).href);
    const cf = await imp('functions/api/v1/[[path]].js'), cfl = await imp('functions/llms.txt.js'), nl = await imp('netlify/functions/api.mjs');
    const req = u => new Request('https://mi-sitio.test' + u);
    const a = await (await cf.onRequest({request: req('/api/v1/effects/slam?duration=0.5&palette=aga')})).json();
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
