// Núcleo del contrato de efectos (spec 1). UMD: lo usan la UI (window.FX), el servidor/API (Node) y, más adelante, el build estático.
// Un efecto "spec 1" trae en su carpeta fx.css + fx.html y declara en effect.json -> fx.params sus parámetros editables.
// Cada parámetro se convierte en una variable CSS --fx-<nombre> (o en las variables que defina la opción elegida de un enum).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FX = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var HEX = /^#[0-9a-fA-F]{6}$/, TOKEN = /^palette\.(dark|light|accent)$/;
  var HOLD = 0.8;   // segundos que la vista previa deja el efecto terminado antes de repetir
  var kebab = function (s) { return s.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); }); };
  var num = function (v) { return String(Math.round(v * 1000) / 1000); };


  // Evaluador aritmético mínimo (números, nombres de parámetros, + - * / y paréntesis). No usa eval.
  function evalExpr(src, values) {
    var tokens = String(src).match(/\d*\.?\d+|[A-Za-z_]\w*|[()+\-*/]/g) || [], pos = 0;
    function peek() { return tokens[pos]; }
    function next() { return tokens[pos++]; }
    function primary() {
      var t = next();
      if (t === undefined) return NaN;
      if (t === '(') { var v = sum(); if (next() !== ')') return NaN; return v; }
      if (t === '-') return -primary();
      if (/^\d|^\./.test(t)) return parseFloat(t);
      var n = values[t];
      return typeof n === 'number' ? n : NaN;
    }
    function prod() { var v = primary(); while (peek() === '*' || peek() === '/') { var o = next(), r = primary(); v = o === '*' ? v * r : v / r; } return v; }
    function sum() { var v = prod(); while (peek() === '+' || peek() === '-') { var o = next(), r = prod(); v = o === '+' ? v + r : v - r; } return v; }
    var out = sum();
    return pos === tokens.length ? out : NaN;
  }
  var r3 = function (v) { return Math.round(v * 1000) / 1000; };

  function defaults(fx) {
    var out = {};
    Object.keys(fx.params || {}).forEach(function (k) { out[k] = fx.params[k].default; });
    return out;
  }

  // Valida y completa los valores. Devuelve {values, errors}; los valores inválidos se rechazan (no se corrigen en silencio).
  function resolve(fx, input) {
    var values = defaults(fx), errors = [], params = fx.params || {};
    Object.keys(input || {}).forEach(function (k) {
      var p = params[k], v = input[k];
      if (!p) { errors.push('Parámetro desconocido: ' + k); return; }
      if (p.type === 'number') {
        var n = typeof v === 'number' ? v : parseFloat(v);
        if (!isFinite(n)) errors.push(k + ' debe ser un número');
        else if (n < p.min || n > p.max) errors.push(k + ' debe estar entre ' + p.min + ' y ' + p.max);
        else values[k] = n;
      } else if (p.type === 'color') {
        if (HEX.test(v) || TOKEN.test(v)) values[k] = v;
        else errors.push(k + ' debe ser #RRGGBB o palette.dark|light|accent');
      } else if (p.type === 'enum') {
        if (p.options.some(function (o) { return o.value === v; })) values[k] = v;
        else errors.push(k + ' debe ser uno de: ' + p.options.map(function (o) { return o.value; }).join(', '));
      }
    });
    return {values: values, errors: errors};
  }

  function colorOf(v, palette) {
    var m = TOKEN.exec(v);
    return m ? (palette && palette[m[1]]) || '#888888' : v;
  }

  // Variables CSS resultantes, en el orden en que se declaran los parámetros.
  function vars(fx, values, palette) {
    var out = {}, params = fx.params || {};
    Object.keys(params).forEach(function (k) {
      var p = params[k], v = values[k];
      if (p.type === 'number') out['--fx-' + kebab(k)] = num(v) + (p.unit || '');
      else if (p.type === 'color') out['--fx-' + kebab(k)] = colorOf(v, palette);
      else if (p.type === 'enum') {
        var o = p.options.filter(function (x) { return x.value === v; })[0];
        if (o) Object.keys(o.vars || {}).forEach(function (name) { out[name] = o.vars[name]; });
      }
    });
    return out;
  }
  var inline = function (v) { return Object.keys(v).map(function (k) { return k + ':' + v[k]; }).join(';'); };

  // Quita lo que solo sirve para la vista previa (contenido de ejemplo y marcas data-fx-*).
  var escapeHtml = function (t) { return String(t).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); };
  function exportHtml(html, style, label, keepContent) {
    html = keepContent ? html : html.replace(/\{\{content\}\}/g, '<!-- tu contenido -->');
    return html.replace(/\{\{label\}\}/g, function () { return escapeHtml(label); }).replace(/<!--fx-demo-->[\s\S]*?<!--\/fx-demo-->\s*/g, '').replace(/\s+data-fx-[\w-]+(="[^"]*")?/g, '').replace(/\{\{vars\}\}/g, style).trim();
  }
  function previewHtml(html, style, label) { return html.replace(/\{\{content\}\}/g, '').replace(/\{\{label\}\}/g, function () { return escapeHtml(label); }).replace(/<!--\/?fx-demo-->/g, '').replace(/\{\{vars\}\}/g, style); }

  // Todo lo necesario para usar o previsualizar un efecto con unos valores y una paleta.
  function build(effect, input, palette, opts) {
    var fx = effect.fx, r = resolve(fx, input), v = vars(fx, r.values, palette), style = inline(v);
    var label = ((opts && opts.label) || fx.label || '').slice(0, 80);
    var delay = r.values.delay || 0, dur = r.values.duration || 0;
    var totalV = fx.total ? evalExpr(fx.total, r.values) : delay + dur;
    if (!isFinite(totalV)) totalV = delay + dur;
    return {
      values: r.values, errors: r.errors, vars: v, style: style,
      css: fx.cssText, html: exportHtml(fx.htmlText, style, label, opts && opts.keepContent), previewHtml: previewHtml(fx.htmlText, style, label),
      total: r3(totalV),
      markers: (fx.markers || []).map(function (m) { var at = m.expr ? evalExpr(m.expr, r.values) : delay + m.at * dur; return {label: m.label, at: r3(isFinite(at) ? at : delay)}; }),
    };
  }

  // Comprobaciones de coherencia del contrato (las usa `posts effect check`).
  function lint(fx, cssRaw, html) {
    var p = [], params = fx.params || {};
    var css = (cssRaw || '').replace(/\/\*[\s\S]*?\*\//g, '');   // los comentarios no cuentan como uso
    if (!css.trim()) p.push('fx.css vacío');
    if (!html) p.push('fx.html vacío');
    else {
      if (html.indexOf('{{vars}}') < 0) p.push('fx.html no contiene {{vars}}: los parámetros no llegarían al efecto');
      if (fx.label && html.indexOf('{{label}}') < 0) p.push('fx.label definido pero fx.html no contiene {{label}}');
    }
    Object.keys(params).forEach(function (k) {
      var d = params[k];
      if (['palette', 'dark', 'light', 'accent'].indexOf(k) >= 0) { p.push(k + ': nombre reservado (lo usa la API para la paleta)'); return; }
      if (['number', 'color', 'enum'].indexOf(d.type) < 0) { p.push(k + ': tipo desconocido "' + d.type + '"'); return; }
      if (d.type === 'number') {
        if (!(d.min <= d.default && d.default <= d.max)) p.push(k + ': el valor por defecto está fuera de [min, max]');
        if (!(d.step > 0)) p.push(k + ': falta step');
        if (css && css.indexOf('--fx-' + kebab(k)) < 0) p.push(k + ': el CSS no usa --fx-' + kebab(k));
      } else if (d.type === 'color') {
        if (!HEX.test(d.default) && !TOKEN.test(d.default)) p.push(k + ': color por defecto no válido');
        if (css && css.indexOf('--fx-' + kebab(k)) < 0) p.push(k + ': el CSS no usa --fx-' + kebab(k));
      } else if (d.type === 'enum') {
        if (!d.options || !d.options.length) { p.push(k + ': sin opciones'); return; }
        if (!d.options.some(function (o) { return o.value === d.default; })) p.push(k + ': el defecto no está entre las opciones');
        d.options.forEach(function (o) {
          Object.keys(o.vars || {}).forEach(function (name) { if (css && css.indexOf(name) < 0) p.push(k + '=' + o.value + ': el CSS no usa ' + name); });
        });
      }
    });
    return p;
  }


  // ================= KIT (carrito): varios efectos en una misma pieza =================
  // kit = {name, palette: '<marca>' | {dark,light,accent}, items: [{effect, label, params}]}; params incluye delay (inicio) y duration.
  var KIT_MAX = 40, ELEMENT_KINDS = ['entrance', 'text', 'loop'];
  var KIT_CSS = '/* kit: posiciones de ejemplo de los elementos; sustitúyelas por tu diseño */\n' +
    '.kit-slot{position:absolute;left:0;right:0;display:flex;justify-content:center;transform:translateY(-50%)}\n' +
    '.kit-slot>*{margin:0;padding:40px 90px;border-radius:40px;background:var(--kit-accent);color:var(--kit-on);font:900 110px/1 system-ui,sans-serif;letter-spacing:-.03em}\n';
  var lum = function (h) { var c = [1, 3, 5].map(function (i) { var v = parseInt(h.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };

  function paletteOfKit(kit, brands) {
    var b = typeof kit.palette === 'string' ? (brands || {})[kit.palette] : kit.palette;
    b = b || {};
    var ok = function (v, d) { return HEX.test(v || '') ? v : d; };
    return {dark: ok(b.dark, '#14181c'), light: ok(b.light, '#f4f1ea'), accent: ok(b.accent, '#c46a2b')};
  }
  var kitVars = function (p) { return '--kit-dark:' + p.dark + ';--kit-light:' + p.light + ';--kit-accent:' + p.accent + ';--kit-on:' + (lum(p.accent) > 0.4 ? '#111111' : '#ffffff') + ';--fx-bg-a:' + p.dark + ';--fx-bg-b:' + p.light + ';'; };

  // Compone el kit. effects: {id: efecto con fx.cssText/htmlText}. Devuelve también los errores por elemento.
  function buildKit(effects, kit, brands) {
    var errors = [], palette = paletteOfKit(kit, brands), items = [], cssParts = [], seen = {}, elems = [];
    var list = (kit.items || []).slice(0, KIT_MAX);
    if ((kit.items || []).length > KIT_MAX) errors.push('El kit admite hasta ' + KIT_MAX + ' elementos');
    list.forEach(function (it, i) {
      var e = effects[it.effect];
      if (!e || !e.fx) { errors.push('Elemento ' + (i + 1) + ': el efecto "' + it.effect + '" no existe o no es parametrizable'); return; }
      var wrapper = e.fx.htmlText.indexOf('{{content}}') >= 0;
      var r = build(e, it.params || {}, palette, {label: it.label, keepContent: wrapper});
      r.errors.forEach(function (m) { errors.push('Elemento ' + (i + 1) + ' (' + it.effect + '): ' + m); });
      if (!seen[it.effect]) { seen[it.effect] = 1; cssParts.push(e.fx.cssText.trim()); }
      var isElem = ELEMENT_KINDS.indexOf(e.kind) >= 0;
      items.push({n: i + 1, effect: it.effect, name: e.name, kind: e.kind, label: (it.label || e.fx.label || ''), start: r.values.delay || 0, duration: r.values.duration || 0,
        end: r.total, values: r.values, vars: r.vars, markers: r.markers, html: r.html, element: isElem && !wrapper, wrap: wrapper});
      if (isElem && !wrapper) elems.push(items.length - 1);
    });
    var html = items.filter(function (it) { return !it.wrap; }).map(function (it) {
      if (!it.element) return it.html;
      var k = elems.indexOf(items.indexOf(it)), y = Math.round((15 + (k + 0.5) / elems.length * 70) * 10) / 10;
      return '<div class="kit-slot" style="top:' + y + '%">' + it.html + '</div>';
    }).join('\n');
    items.filter(function (it) { return it.wrap; }).forEach(function (w) { var inner = html; html = w.html.replace(/\{\{content\}\}/g, function () { return inner; }); });   // los envoltorios (p. ej. la sacudida) rodean al resto
    var total = items.reduce(function (m, it) { return Math.max(m, it.end); }, 0);
    var markers = [];
    items.forEach(function (it) { it.markers.forEach(function (m) { markers.push({at: m.at, label: m.label, item: it.n, effect: it.effect}); }); });
    markers.sort(function (a, b) { return a.at - b.at; });
    return {name: kit.name || 'Kit', palette: palette, items: items, css: (cssParts.join('\n\n') + '\n\n' + KIT_CSS).trim() + '\n', html: html, total: Math.round(total * 1000) / 1000, markers: markers, errors: errors, stageVars: kitVars(palette)};
  }

  // Codificación compacta para la URL (base64url de un JSON). Con effects se omiten los valores que son los de por defecto.
  function b64e(str) { var b = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(str))) : Buffer.from(str, 'utf8').toString('base64'); return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64d(s) { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return typeof atob === 'function' ? decodeURIComponent(escape(atob(s))) : Buffer.from(s, 'base64').toString('utf8'); }
  function encodeKit(kit, effects) {
    var o = {v: 1, n: kit.name || '', p: kit.palette, i: (kit.items || []).map(function (it) {
      var params = {}, e = effects && effects[it.effect], d = e && e.fx ? defaults(e.fx) : {};
      Object.keys(it.params || {}).forEach(function (k) { if (!e || it.params[k] !== d[k]) params[k] = it.params[k]; });
      return {e: it.effect, l: it.label || '', p: params};
    })};
    return b64e(JSON.stringify(o));
  }
  function decodeKit(s) {
    try {
      var o = JSON.parse(b64d(s));
      if (!o || o.v !== 1 || !Array.isArray(o.i)) return null;
      return {name: String(o.n || '').slice(0, 80), palette: (o.p && typeof o.p === 'object') ? o.p : String(o.p || ''), items: o.i.slice(0, KIT_MAX).map(function (x) { return {effect: String(x.e || ''), label: String(x.l || '').slice(0, 80), params: (x.p && typeof x.p === 'object') ? x.p : {}}; })};
    } catch (e) { return null; }
  }

  // Página HTML autónoma con todo el kit y un reproductor (pausa, barra de tiempo; ?t=<seg> congela un instante; ?rec=1 oculta los controles).
  function pageHtml(b) {
    var title = escapeHtml(b.name);
    return '<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n<title>' + title + '</title>\n<style>\n' +
      'html,body{margin:0;height:100%;background:#0b0d10;overflow:hidden;font-family:system-ui,sans-serif}\n' +
      '#fit{position:absolute;left:0;top:0;width:1080px;height:1920px;transform-origin:0 0}\n' +
      '#stage{position:absolute;inset:0;overflow:hidden;' + b.stageVars + 'background:radial-gradient(70% 40% at 50% 38%,color-mix(in srgb,var(--kit-accent) 28%,var(--kit-dark)),var(--kit-dark) 70%)}\n' +
      '#bar{position:fixed;left:0;right:0;bottom:0;height:40px;display:flex;align-items:center;gap:10px;padding:0 12px;background:#12161b;color:#cfd3d8;font-size:12px}\n#bar input[type=range]{flex:1}\nbody.rec #bar{display:none}\n' +
      b.css + '</style></head>\n<body>\n<div id="fit"><div id="stage">\n' + b.html + '\n</div></div>\n' +
      '<div id="bar"><button id="pp">❚❚</button><input id="seek" type="range" min="0" max="1000" value="0"><span id="clock"></span></div>\n' +
      '<script>\n(function(){\nvar TOTAL=' + (b.total + 0.8) + ',q=new URLSearchParams(location.search),rec=q.get("rec")==="1",t=0,playing=!rec&&q.get("t")===null,last=null,anims=[];\n' +
      'if(rec)document.body.classList.add("rec");\n' +
      'var fit=document.getElementById("fit"),seek=document.getElementById("seek"),clock=document.getElementById("clock"),pp=document.getElementById("pp");\n' +
      'function size(){var h=innerHeight-(rec?0:40),k=Math.min(innerWidth/1080,h/1920);fit.style.transform="scale("+k+")";fit.style.left=(innerWidth-1080*k)/2+"px";fit.style.top=(h-1920*k)/2+"px"}\n' +
      'addEventListener("resize",size);size();\n' +
      'function apply(){anims.forEach(function(a){a.currentTime=t*1000});seek.value=Math.round(t/TOTAL*1000);clock.textContent=t.toFixed(2)+" / "+TOTAL.toFixed(2)+" s"}\n' +
      'window.seek=function(v){t=Math.max(0,Math.min(TOTAL,v));playing=false;apply();return t};window.REEL_TOTAL=TOTAL;\n' +
      'function tick(ts){if(playing){if(last!==null)t+=(ts-last)/1000;last=ts;if(t>=TOTAL)t=0;apply()}else last=null;requestAnimationFrame(tick)}\n' +
      'pp.onclick=function(){playing=!playing;pp.textContent=playing?"❚❚":"▶"};seek.oninput=function(){playing=false;pp.textContent="▶";t=seek.value/1000*TOTAL;apply()};\n' +
      'anims=document.getAnimations();anims.forEach(function(a){a.pause()});var qt=q.get("t");if(qt!==null)t=parseFloat(qt)||0;pp.textContent=playing?"❚❚":"▶";apply();requestAnimationFrame(tick);\n})();\n</script>\n</body></html>\n';
  }

  return {KIT_MAX: KIT_MAX, buildKit: buildKit, encodeKit: encodeKit, decodeKit: decodeKit, pageHtml: pageHtml, paletteOfKit: paletteOfKit, escapeHtml: escapeHtml, HOLD: HOLD, defaults: defaults, resolve: resolve, vars: vars, inline: inline, build: build, lint: lint, kebab: kebab};
});
