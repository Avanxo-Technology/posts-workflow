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
  function exportHtml(html, style) {
    return html.replace(/<!--fx-demo-->[\s\S]*?<!--\/fx-demo-->\s*/g, '').replace(/\s+data-fx-[\w-]+(="[^"]*")?/g, '').replace(/\{\{vars\}\}/g, style).trim();
  }
  function previewHtml(html, style) { return html.replace(/<!--\/?fx-demo-->/g, '').replace(/\{\{vars\}\}/g, style); }

  // Todo lo necesario para usar o previsualizar un efecto con unos valores y una paleta.
  function build(effect, input, palette) {
    var fx = effect.fx, r = resolve(fx, input), v = vars(fx, r.values, palette), style = inline(v);
    var delay = r.values.delay || 0, dur = r.values.duration || 0;
    return {
      values: r.values, errors: r.errors, vars: v, style: style,
      css: fx.cssText, html: exportHtml(fx.htmlText, style), previewHtml: previewHtml(fx.htmlText, style),
      total: Math.round((delay + dur) * 1000) / 1000,
      markers: (fx.markers || []).map(function (m) { return {label: m.label, at: Math.round((delay + m.at * dur) * 1000) / 1000}; }),
    };
  }

  // Comprobaciones de coherencia del contrato (las usa `posts effect check`).
  function lint(fx, css, html) {
    var p = [], params = fx.params || {};
    if (!css) p.push('fx.css vacío');
    if (!html) p.push('fx.html vacío');
    else if (html.indexOf('{{vars}}') < 0) p.push('fx.html no contiene {{vars}}: los parámetros no llegarían al efecto');
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

  return {HOLD: HOLD, defaults: defaults, resolve: resolve, vars: vars, inline: inline, build: build, lint: lint, kebab: kebab};
});
