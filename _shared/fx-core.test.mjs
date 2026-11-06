// Pruebas del contrato de efectos: node --test _shared/fx-core.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const FX = createRequire(import.meta.url)('./catalog-ui/fx-core.js');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'catalog', 'effects');
const load = id => {
  const e = JSON.parse(readFileSync(join(ROOT, id, 'effect.json'), 'utf8'));
  e.fx.cssText = readFileSync(join(ROOT, id, e.fx.css), 'utf8'); e.fx.htmlText = readFileSync(join(ROOT, id, e.fx.html), 'utf8');
  return e;
};
const pal = {dark: '#111111', light: '#eeeeee', accent: '#ff0066'};

test('resolve: valores por defecto, rangos y desconocidos', () => {
  const e = load('slam');
  assert.equal(FX.resolve(e.fx, {}).values.duration, 0.7);
  assert.equal(FX.resolve(e.fx, {duration: '1.5'}).values.duration, 1.5);
  assert.match(FX.resolve(e.fx, {duration: 99}).errors[0], /entre 0.1 y 3/);
  assert.match(FX.resolve(e.fx, {foo: 1}).errors[0], /desconocido/);
  assert.match(FX.resolve(e.fx, {ease: 'x'}).errors[0], /uno de/);
});

test('vars: unidades, enum con vars y colores de paleta', () => {
  const s = load('sweep-panel'), r = FX.build(s, {direction: 'top', delay: 3.2}, pal);
  assert.equal(r.vars['--fx-delay'], '3.2s');
  assert.equal(r.vars['--fx-color'], '#ff0066');          // palette.accent resuelto
  assert.deepEqual([r.vars['--fx-dx'], r.vars['--fx-dy']], ['0', '-1']);
  assert.equal(r.markers[0].at, 3.6);                      // delay + 0.5 * duration
  assert.equal(FX.build(s, {color: '#00ff00'}, pal).vars['--fx-color'], '#00ff00');
});

test('build: el HTML exportado no lleva marcas de demo y sí las variables', () => {
  const r = FX.build(load('sweep-panel'), {}, pal);
  assert.ok(!r.html.includes('data-fx-') && !r.html.includes('fx-demo') && !r.html.includes('Escena'));
  assert.ok(r.html.includes('class="fx-sweep"') && r.html.includes('--fx-duration:0.8s'));
  assert.ok(r.previewHtml.includes('data-fx-scene'));      // la vista previa sí conserva el contenido de ejemplo
});

test('lint: detecta parámetros que el CSS no usa y {{vars}} ausente', () => {
  const e = load('slam');
  assert.deepEqual(FX.lint(e.fx, e.fx.cssText, e.fx.htmlText), []);
  assert.ok(FX.lint(e.fx, e.fx.cssText.replaceAll('--fx-distance', '--x'), e.fx.htmlText).some(m => /distance/.test(m)));
  assert.ok(FX.lint(e.fx, e.fx.cssText, '<h1 class="fx-slam">x</h1>').some(m => /vars/.test(m)));
  assert.ok(FX.lint({params: {palette: {type: 'number', default: 1, min: 0, max: 2, step: 1}}}, 'a', '{{vars}}').some(m => /reservado/.test(m)));
});

test('todos los efectos spec 1 del catálogo cumplen el contrato', () => {
  let n = 0;
  for (const id of readdirSync(ROOT)) {
    const f = join(ROOT, id, 'effect.json');
    if (!existsSync(f)) continue;
    const e = JSON.parse(readFileSync(f, 'utf8'));
    if (e.spec !== 1) continue;
    n++;
    const css = readFileSync(join(ROOT, id, e.fx.css), 'utf8'), html = readFileSync(join(ROOT, id, e.fx.html), 'utf8');
    assert.deepEqual(FX.lint(e.fx, css, html), [], id);
    e.fx.cssText = css; e.fx.htmlText = html;
    assert.deepEqual(FX.build(e, {}, pal).errors, [], id);
  }
  assert.ok(n >= 5);
});

const effects = () => Object.fromEntries(['slam', 'pop', 'sweep-panel', 'scene-push'].map(id => [id, load(id)]));

test('kit: composición, orden, tiempos y marcadores absolutos', () => {
  const kit = {name: 'K', palette: pal, items: [{effect: 'slam', label: 'Hola', params: {delay: 0.3, duration: 0.8}}, {effect: 'pop', params: {delay: 1.2}}, {effect: 'sweep-panel', params: {delay: 3}}]};
  const b = FX.buildKit(effects(), kit, {});
  assert.deepEqual(b.errors, []);
  assert.equal(b.total, 3.8);                                  // sweep: delay 3 + duration 0.8
  assert.equal(b.markers[0].at, 3.4);                          // 3 + 0.5 * 0.8
  assert.equal((b.html.match(/kit-slot/g) || []).length, 2);   // slam y pop van en huecos; el barrido es una capa
  assert.equal((b.css.match(/@keyframes fx-slam/g) || []).length, 1);
});

test('kit: etiquetas escapadas y sin inyección por $& / $\'', () => {
  const kit = {palette: pal, items: [{effect: 'slam', label: '<img src=x onerror=alert(1)> $& $\' $`'}]};
  const b = FX.buildKit(effects(), kit, {});
  assert.ok(!b.html.includes('<img'));
  assert.ok(b.html.includes('&lt;img src=x onerror=alert(1)&gt; $&amp; $&#39; $`'));
  assert.equal((b.html.match(/<h1/g) || []).length, 1);        // un solo elemento: $& no duplicó el HTML
  assert.ok(!FX.pageHtml(b).includes('<img'));
});

test('kit: errores por efecto desconocido, parámetro fuera de rango y exceso de elementos', () => {
  const b = FX.buildKit(effects(), {palette: pal, items: [{effect: 'nope'}, {effect: 'slam', params: {duration: 99}}]}, {});
  assert.equal(b.errors.length, 2);
  const many = {palette: pal, items: Array.from({length: FX.KIT_MAX + 1}, () => ({effect: 'pop'}))};
  assert.ok(FX.buildKit(effects(), many, {}).errors.some(m => /hasta/.test(m)));
});

test('kit: codificación ida y vuelta, omite valores por defecto y rechaza basura', () => {
  const kit = {name: 'Ñandú ✓', palette: 'gmaq', items: [{effect: 'slam', label: 'Título ñ', params: {delay: 2, duration: 0.7}}]};
  const enc = FX.encodeKit(kit, effects()), dec = FX.decodeKit(enc);
  assert.deepEqual(dec.items[0].params, {delay: 2});           // duration 0.7 es el valor por defecto: no se guarda
  assert.equal(dec.name, 'Ñandú ✓'); assert.equal(dec.items[0].label, 'Título ñ');
  assert.ok(/^[A-Za-z0-9_-]+$/.test(enc));
  assert.equal(FX.decodeKit('esto no es un kit'), null);
  assert.equal(FX.decodeKit(Buffer.from('{"v":2}').toString('base64url')), null);
});
