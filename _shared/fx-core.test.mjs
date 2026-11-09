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

const effects = () => Object.fromEntries(['slam', 'pop', 'sweep-panel', 'scene-push', 'camera-pan', 'shutter-bars', 'fly-elements', 'title-stack'].map(id => [id, load(id)]));

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
  assert.equal((b.html.match(/class="fx-slam"/g) || []).length, 1);   // un solo elemento: $& no duplicó el HTML
  assert.ok(!FX.pageHtml(b).includes('<img'));
});

test('kit: errores por efecto desconocido, parámetro fuera de rango y exceso de elementos', () => {
  const b = FX.buildKit(effects(), {palette: pal, items: [{effect: 'nope'}, {effect: 'slam', params: {duration: 99}}]}, {});
  assert.equal(b.errors.length, 2);
  const many = {palette: pal, items: Array.from({length: FX.KIT_MAX + 1}, () => ({effect: 'pop'}))};
  assert.ok(FX.buildKit(effects(), many, {}).errors.some(m => /hasta/.test(m)));
});

test('kit: codificación ida y vuelta, omite valores por defecto y rechaza basura', () => {
  const kit = {name: 'Ñandú ✓', palette: 'oceano', items: [{effect: 'slam', label: 'Título ñ', params: {delay: 2, duration: 0.7}}]};
  const enc = FX.encodeKit(kit, effects()), dec = FX.decodeKit(enc);
  assert.deepEqual(dec.items[0].params, {delay: 2});           // duration 0.7 es el valor por defecto: no se guarda
  assert.equal(dec.name, 'Ñandú ✓'); assert.equal(dec.items[0].label, 'Título ñ');
  assert.ok(/^[A-Za-z0-9_-]+$/.test(enc));
  assert.equal(FX.decodeKit('esto no es un kit'), null);
  assert.equal(FX.decodeKit(Buffer.from('{"v":2}').toString('base64url')), null);
});

test('nombres únicos: ninguna clase ni @keyframes fx-* se repite entre efectos (si no, un kit los mezclaría)', () => {
  const owner = new Map(), dups = [];
  for (const id of readdirSync(ROOT)) {
    const f = join(ROOT, id, 'effect.json');
    if (!existsSync(f)) continue;
    const e = JSON.parse(readFileSync(f, 'utf8'));
    if (e.spec !== 1) continue;
    const css = readFileSync(join(ROOT, id, e.fx.css), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const names = new Set([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => 'kf:' + m[1]));
    for (const m of css.matchAll(/\.(fx-[\w-]+)/g)) names.add('cls:' + m[1]);
    for (const n of names) { if (owner.has(n) && owner.get(n) !== id) dups.push(`${n} (${owner.get(n)} y ${id})`); else owner.set(n, id); }
  }
  assert.deepEqual(dups, []);
});

test('todos los efectos spec 1 se componen en un kit con sus valores por defecto', () => {
  const all = {};
  for (const id of readdirSync(ROOT)) {
    const f = join(ROOT, id, 'effect.json');
    if (!existsSync(f)) continue;
    const e = JSON.parse(readFileSync(f, 'utf8'));
    if (e.spec !== 1) continue;
    e.fx.cssText = readFileSync(join(ROOT, id, e.fx.css), 'utf8'); e.fx.htmlText = readFileSync(join(ROOT, id, e.fx.html), 'utf8');
    all[id] = e;
  }
  const b = FX.buildKit(all, {palette: pal, items: Object.keys(all).map(effect => ({effect}))}, {});
  assert.deepEqual(b.errors, []);   // (más de 40 efectos se recortan; aquí basta con que ninguno falle)
  assert.ok(Object.keys(all).length >= 39);
});

test('kit: un efecto envoltorio (screen-shake) rodea al resto del contenido y las fórmulas de tiempo se aplican', () => {
  const all = {};
  for (const id of ['slam', 'screen-shake', 'venetian-bars', 'blink']) all[id] = load(id);
  const b = FX.buildKit(all, {palette: pal, items: [{effect: 'slam', label: 'Hola'}, {effect: 'screen-shake', params: {delay: 1}}, {effect: 'blink', params: {delay: 2, count: 3, duration: 0.5}}, {effect: 'venetian-bars', params: {delay: 4}}]}, {});
  assert.deepEqual(b.errors, []);
  assert.ok(b.html.startsWith('<div class="fx-shake"'), 'el envoltorio queda fuera');
  assert.ok(b.html.includes('kit-slot') && b.html.includes('fx-bars'), 'y dentro va el resto');
  assert.ok(b.html.indexOf('fx-shake') < b.html.indexOf('kit-slot'));
  const blink = b.items.find(i => i.effect === 'blink'), bars = b.items.find(i => i.effect === 'venetian-bars');
  assert.equal(blink.end, 3.5);                                // delay 2 + duration .5 * count 3
  assert.equal(bars.end, 4 + 2 * 0.34 + 0.28 + 6 * 0.03);      // fórmula declarada en effect.json
});

test('evalExpr no ejecuta código: solo aritmética con parámetros', () => {
  const e = load('venetian-bars');
  e.fx.total = 'process.exit(1)';
  assert.ok(Number.isFinite(FX.build(e, {}, pal).total));      // expresión inválida: vuelve a delay + duration
  e.fx.total = '(delay + 2) * duration - 1';
  assert.equal(FX.build(e, {delay: 1, duration: 0.5}, pal).total, 0.5);
});

test('elementos: texto, colores y tamaño llegan al código con etiqueta genérica', () => {
  const e = effects().slam;
  const r = FX.build(e, {}, pal, {elements: {s: {text: 'HOLA <b>', color: '#00ff00', bg: '#0000ff', size: 200}}});
  assert.deepEqual(r.errors, []);
  assert.ok(!/<h[1-6]|<section/i.test(r.html), 'el código no se ata a h1/h2/section');
  assert.ok(r.html.includes('<div class="fx-slam"') && r.html.includes('HOLA &lt;b&gt;'));
  assert.ok(r.html.includes('background:#0000ff') && r.html.includes('color:#00ff00') && r.html.includes('font-size:200px'));
  assert.ok(r.html.includes('TU elemento') && !r.html.includes('data-fx'));
  assert.ok(r.previewHtml.includes('<h1 class="fx-slam"'), 'la vista previa conserva su elemento de muestra');
  const sz = FX.build(e, {}, pal, {elements: {s: {w: 60, pad: 0}}});
  assert.deepEqual(sz.errors, []);
  assert.ok(sz.html.includes('width:60%;padding:0px'), 'ancho y relleno del elemento llegan al código');
  assert.equal(FX.build(effects()['scene-push'], {}, pal, {elements: {a: {size: 90}}}).html.includes('font-size:90px'), true);   // el tamaño del texto también en las escenas
  assert.equal(FX.build(e, {}, pal, {elements: {s: {w: 5, pad: 999}}}).errors.length, 2);
});

test('elementos: las imágenes son solo de vista previa y nunca llegan al código', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  for (const id of ['slam', 'scene-push', 'camera-pan', 'shutter-bars']) {
    const e = effects()[id], els = FX.elementsOf(e).map(x => x.id);
    const assets = Object.fromEntries(els.map(k => [k, png]));
    const r = FX.build(e, {}, pal, {assets});
    assert.ok(!r.html.includes('data:image'), id + ': la imagen no debe ir en el código');
    assert.ok(r.previewHtml.includes(png), id + ': la imagen sí va en la vista previa');
  }
  const bad = FX.build(effects().slam, {}, pal, {assets: {s: 'javascript:alert(1)'}});
  assert.ok(!bad.previewHtml.includes('javascript'));          // solo data:image/(png|jpeg|webp|gif);base64
});

test('elementos: las escenas de código usan marcadores y las de muestra no salen del código', () => {
  const push = FX.build(effects()['scene-push'], {}, pal, {elements: {a: {text: 'Inicio', bg: '#222222'}}});
  assert.ok(push.html.includes('<div class="fx-push-out" style="background:#222222">Inicio</div>') && push.html.includes('<!-- tu escena B -->'));
  const bars = FX.build(effects()['shutter-bars'], {}, pal, {elements: {a: {text: 'X'}}});
  assert.ok(!bars.html.includes('<section') && !bars.html.includes('X'), 'la escena de muestra solo existe en la vista previa');
  assert.ok(bars.previewHtml.includes('>X<'));
  assert.ok(FX.build(effects()['camera-pan'], {}, pal).html.includes('<img> o <video>'));
});

test('elementos: validación y viaje por el enlace del kit', () => {
  const bad = FX.build(effects().slam, {}, pal, {elements: {s: {color: 'rojo', size: 9999, text: 'x'.repeat(81)}, z: {text: 'a'}, a: {zzz: '1'}}});
  assert.equal(bad.errors.length, 5);
  const kit = {name: 'K', palette: pal, items: [{effect: 'slam', label: 'Hola', params: {}, elements: {s: {bg: '#112233'}}}]};
  const back = FX.decodeKit(FX.encodeKit(kit, effects()));
  assert.deepEqual(back.items[0].elements, {s: {bg: '#112233'}});
  assert.ok(FX.buildKit(effects(), back, {}).html.includes('background:#112233'));
});

test('elementos en el kit: la imagen está en la vista previa del kit y no en el código ni en el enlace', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  const items = [{effect: 'slam', label: 'Hola', params: {}, elements: {s: {bg: '#112233'}}, assets: {s: png}}, {effect: 'scene-push', params: {}, elements: {a: {text: 'Antes'}}, assets: {a: png}}];
  const b = FX.buildKit(effects(), {palette: pal, items}, {});
  assert.deepEqual(b.errors, []);
  assert.ok(b.previewHtml.includes(png) && !b.html.includes('data:image'));
  assert.ok(!/<h[1-6]|<section/i.test(b.html) && b.html.includes('>Antes<'));
  assert.ok(!FX.encodeKit({palette: pal, items}, effects()).includes('data'), 'las imágenes no viajan en el enlace');
  assert.ok(!FX.pageHtml(b).includes('data:image'));
});

test('fuentes: font-family en el código y @import al principio del CSS (solo Google Fonts)', () => {
  const e = effects().slam;
  const g = FX.build(e, {}, pal, {elements: {s: {font: 'Space Grotesk'}}});
  assert.deepEqual(g.errors, []);
  assert.ok(g.html.includes("font-family:'Space Grotesk',sans-serif"));
  assert.ok(g.css.startsWith("@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap');\n"));
  const sys = FX.build(e, {}, pal, {elements: {s: {font: 'Georgia'}}});
  assert.ok(sys.html.includes("font-family:'Georgia',serif") && !sys.css.includes('@import'));   // las del sistema no cargan nada
  assert.ok(FX.build(e, {}, pal, {elements: {s: {font: 'Bebas Neue'}}}).css.includes('family=Bebas+Neue&display=swap'));   // fuentes de un solo peso, sin eje wght
  assert.equal(FX.build(e, {}, pal, {elements: {s: {font: "x');}body{background:red"}}}).errors.length, 1);   // nada de inyección
  const kit = FX.buildKit(effects(), {palette: pal, items: [{effect: 'slam', elements: {s: {font: 'Oswald'}}}, {effect: 'pop', elements: {s: {font: 'Oswald'}}}, {effect: 'scene-push', elements: {a: {font: 'Lora'}}}]}, {});
  assert.equal((kit.css.match(/@import/g) || []).length, 2, 'cada fuente se importa una sola vez y al principio');
  assert.ok(kit.css.startsWith('@import') && kit.html.includes("font-family:'Lora',serif"));
});

test('elementos añadidos (fly-elements): posición final, origen y tiempos van al código', () => {
  const e = effects()['fly-elements'];
  const d = FX.build(e, {}, pal);
  assert.deepEqual(d.errors, []);
  assert.equal((d.html.match(/class="fx-fly-pos"/g) || []).length, 3, 'sin elementos propios se usan los 3 de muestra');
  assert.equal(d.total, 1.1);                                         // 0.4 s de retraso del último + 0.7 s de duración
  const r = FX.build(e, {}, pal, {elements: {e1: {text: 'Hola <b>', x: 20, y: 70, from: 'left', delay: 1, duration: 0.4}, e2: {text: 'Dos', x: 70, y: 30, from: 'custom', fx: 95, fy: 5}}});
  assert.deepEqual(r.errors, []);
  assert.equal((r.html.match(/class="fx-fly-pos"/g) || []).length, 2, 'los elementos propios sustituyen a los de muestra');
  assert.ok(r.html.includes('left:20%;top:70%') && r.html.includes('Hola &lt;b&gt;') && r.html.includes('--d:1s;--du:0.4s'));
  assert.ok(/--dx:-916px;--dy:0px/.test(r.html), 'de la izquierda: sale fuera de la pantalla');
  assert.ok(r.html.includes('--dx:270px;--dy:-480px'), 'origen personalizado en % de la pantalla');
  assert.equal(r.total, 1.4);
  assert.ok(!/<h[1-6]|<section|data-fx/.test(r.html));
});

test('elementos añadidos: validación estricta (ids, rangos, origen y propiedades solo de e1…e8)', () => {
  const e = effects()['fly-elements'], bad = els => FX.build(e, {}, pal, {elements: els}).errors.length;
  assert.equal(bad({e9: {text: 'x'}}), 1);
  assert.equal(bad({e1: {x: 101}}), 1); assert.equal(bad({e1: {y: -1}}), 1);
  assert.equal(bad({e1: {from: 'diagonal'}}), 1); assert.equal(bad({e1: {ease: 'raro'}}), 1);
  assert.equal(bad({e1: {delay: 31}}), 1); assert.equal(bad({e1: {duration: 0}}), 1);
  assert.equal(bad({s: {x: 10}}), 1, 'x solo existe en los elementos añadidos');
  assert.equal(bad({e1: {font: "x');}"}}), 1);
  assert.equal(FX.itemsConfig(e).max, 8);
  assert.equal(FX.itemsConfig(effects().slam), null);
});

test('elementos añadidos: la imagen es solo de la vista previa', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo=', e = effects()['fly-elements'];
  const r = FX.build(e, {}, pal, {elements: {e1: {text: '', x: 50, y: 50}}, assets: {e1: png}});
  assert.ok(r.previewHtml.includes(png) && !r.html.includes('data:image'));
});

test('varias plantillas con varios textos: cada elemento se edita por separado', () => {
  const e = effects()['title-stack'];
  assert.deepEqual(FX.elementsOf(e).map(x => x.id + ':' + x.name).sort(), ['s2:Subtítulo', 's3:Etiqueta', 's:Título']);
  const r = FX.build(e, {}, pal, {elements: {s: {text: 'Gran título'}, s2: {text: 'Segunda línea', color: '#ff0000', font: 'Oswald'}, s3: {bg: '#00ff00'}}});
  assert.deepEqual(r.errors, []);
  assert.ok(r.html.includes('>Gran título</div>') && r.html.includes('>Segunda línea</div>') && r.html.includes('color:#ff0000;font-family:\'Oswald\''));
  assert.ok(r.html.includes('background:#00ff00') && !/<h[1-6]|<section|data-fx/.test(r.html));
  assert.ok(r.css.startsWith('@import'), 'la fuente de un elemento se importa en el CSS');
});
