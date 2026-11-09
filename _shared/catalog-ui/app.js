// UI del catálogo: JS plano, sin dependencias. Todo el contenido se inserta con textContent (nada de innerHTML).
(function () {
  'use strict';
  var STATIC = ((document.querySelector('meta[name=posts-mode]') || {}).content) === 'static';   // sitio publicado: sin servidor de escritura
  var data = null, filters = {brand: null, kind: null}, routeQuery = new URLSearchParams(), cleanup = null;
  var app = document.getElementById('app'), q = document.getElementById('q');
  var KIND = {entrance: 'Entrada', text: 'Texto', transition: 'Transición', camera: 'Cámara', overlay: 'Overlay', loop: 'Bucle'};

  function h(tag, attrs) {
    var el = document.createElement(tag), i, c;
    for (var k in (attrs || {})) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'style') el.style.cssText = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (i = 2; i < arguments.length; i++) {
      c = arguments[i];
      if (c == null || c === false) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x != null && x !== false) el.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); });
      else el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }
  function toast(msg) {
    var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }
  function copy(text, msg) {
    var done = function () { toast(msg || 'Copiado'); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, function () { fallback(text); done(); });
    else { fallback(text); done(); }
  }
  function fallback(text) {
    var ta = h('textarea', {style: 'position:fixed;opacity:0'}); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* sin portapapeles */ } ta.remove();
  }
  var fmt = function (t) { return (Math.round(t * 100) / 100) + 's'; };
  var effById = function (id) { return data.effects.filter(function (e) { return e.id === id; })[0]; };
  var postById = function (id) { return data.posts.filter(function (p) { return p.id === id; })[0]; };
  var kindColor = function (k) { return 'var(--k-' + (KIND[k] ? k : 'entrance') + ')'; };
  function brandDot(id) {
    var b = data.brands[id];
    return h('span', {class: 'dot', title: b ? b.name : id, style: 'background:' + ((b && b.accent) || 'var(--mut)')});
  }
  var norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  function promptFor(effId, postId, t) {
    return 'Usa el efecto "' + effId + '" (catalog/effects/' + effId + '/effect.md)' + (postId ? ' tal como se hizo en ' + postId + ' en el segundo ' + t : '') + '.';
  }

  // ---- markdown mínimo (títulos, listas, `código`, **negrita**) ----
  function inline(text) {
    var out = [], re = /(`[^`]+`|\*\*[^*]+\*\*)/g, last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      out.push(m[0][0] === '`' ? h('code', {text: m[0].slice(1, -1)}) : h('b', {text: m[0].slice(2, -2)}));
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }
  function md(src) {
    var box = h('div', {class: 'prose'}), list = null, para = [];
    function flush() { if (para.length) { box.appendChild(h('p', null, inline(para.join(' ')))); para = []; } }
    src.split('\n').forEach(function (ln) {
      var m;
      if ((m = /^(#{1,3})\s+(.*)/.exec(ln))) { flush(); list = null; box.appendChild(h(m[1].length === 1 ? 'h1' : 'h2', null, inline(m[2]))); }
      else if ((m = /^\s*(?:[-*]|\d+\.)\s+(.*)/.exec(ln))) {
        flush();
        if (!list) { list = h(/^\s*\d/.test(ln) ? 'ol' : 'ul'); box.appendChild(list); }
        list.appendChild(h('li', null, inline(m[1])));
      } else if (!ln.trim()) { flush(); list = null; }
      else { list = null; para.push(ln.trim()); }
    });
    flush();
    return box;
  }

  // ---- piezas comunes ----
  function chip(label, on, fn, dot) {
    return h('button', {class: 'chip' + (on ? ' on' : ''), onclick: fn}, dot || null, label);
  }
  function usedCount(e) { var s = {}; e.uses.forEach(function (u) { s[u.post] = 1; }); return Object.keys(s).length; }
  function demoSrc(e, brand, ui) {
    if (STATIC) return '/demo/' + e.id + '.html';
    return '/demo/' + e.id + '?brand=' + encodeURIComponent(brand || (e.brands && e.brands[0]) || '') + (ui ? '&ui=1' : '');
  }

  // ---- vista: galería de efectos ----
  function viewEffects() {
    var term = norm(q.value), brands = {}, kinds = {};
    data.effects.forEach(function (e) {
      (e.brands || []).forEach(function (b) { brands[b] = 1; }); kinds[e.kind] = 1;
    });
    var list = data.effects.filter(function (e) {
      if (filters.brand && (e.brands || []).indexOf(filters.brand) < 0) return false;
      if (filters.kind && e.kind !== filters.kind) return false;
      if (!term) return true;
      return norm([e.id, e.name, (e.tags || []).join(' '), e.kind, (e.brands || []).join(' '), e.uses.map(function (u) { return u.post; }).join(' ')].join(' ')).indexOf(term) >= 0;
    });
    var set = function (k, v) { return function () { filters[k] = filters[k] === v ? null : v; render(); }; };
    app.replaceChildren(
      h('h1', {text: 'Efectos'}),
      h('p', {class: 'sub', text: STATIC ? data.effects.length + ' transiciones y efectos para videos de redes. Elige uno, ajusta tiempos y colores sin escribir código, guarda tu configuración o añádelo al kit y pásale el enlace a Claude.'
        : data.effects.length + ' efectos · ' + data.posts.length + ' posts registrados. Haz clic en un efecto para ver cómo está hecho y dónde se usó.'}),
      h('div', {class: 'filters'},
        STATIC ? null : h('div', {class: 'grp'}, h('b', {text: 'Marca'}), Object.keys(brands).sort().map(function (b) { return chip((data.brands[b] || {}).name || b, filters.brand === b, set('brand', b), brandDot(b)); })),
        h('div', {class: 'grp'}, h('b', {text: 'Tipo'}), Object.keys(kinds).sort().map(function (k) { return chip(KIND[k] || k, filters.kind === k, set('kind', k)); }))),
      list.length ? h('div', {class: 'grid'}, list.map(function (e) {
        return h('a', {class: 'card', href: '#/efecto/' + e.id},
          h('div', {class: 'thumb'}, e.demo ? h('iframe', {src: demoSrc(e), loading: 'lazy', tabindex: '-1', sandbox: 'allow-scripts', title: 'Demo de ' + e.name}) : h('div', {class: 'nodemo', text: 'Sin demo en vivo\n(' + (e.snippetName ? 'código JS' : 'ver motor') + ')'})),
          h('div', {class: 'meta'},
            h('div', {class: 'nm', text: e.name}), h('div', {class: 'id mono', text: e.id}),
            h('div', {class: 'row'}, h('span', {class: 'kind k-' + e.kind, text: KIND[e.kind] || e.kind}),
              STATIC ? null : h('span', {class: 'dots'}, (e.brands || []).map(brandDot)), STATIC ? null : h('span', {text: usedCount(e) + ' posts'}))));
      })) : h('div', {class: 'empty', text: 'Ningún efecto coincide con el filtro.'}));
  }


  function usesTable(e) {
    var byPost = {};
    e.uses.forEach(function (u) { (byPost[u.post] = byPost[u.post] || []).push(u); });
    return h('div', null, h('h2', {text: 'Usado en ' + Object.keys(byPost).length + ' posts'}),
      Object.keys(byPost).length ? h('table', null, h('thead', null, h('tr', null, h('th', {text: 'Post'}), h('th', {text: 'Segundos (clic = copiar prompt)'}))),
        h('tbody', null, Object.keys(byPost).sort().map(function (pid) {
          return h('tr', {class: 'postrow'}, h('td', null, h('a', {href: '#/post/' + pid, style: 'color:var(--acc)', text: pid})),
            h('td', null, h('div', {class: 'times'}, byPost[pid].sort(function (a, b) { return a.t - b.t; }).map(function (u) {
              return h('span', {class: 't', title: 'copiar prompt', onclick: function () { copy(promptFor(e.id, pid, u.t), 'Prompt copiado'); }, text: fmt(u.t) + (u.note ? ' · ' + u.note : '')});
            }))));
        }))) : h('div', {class: 'empty', text: 'Ningún post registrado usa este efecto todavía.'}));
  }


  // ---- control de parámetro (lo usan el playground y el kit) ----
  // ctx: {get(k), set(k, v), palette()}. Devuelve {el, sync}.
  function makeControl(k, p, ctx) {
    var def = p.default, body, sync;
    var reset = h('button', {class: 'mini', title: 'Restablecer', text: '↺', onclick: function () { ctx.set(k, def); sync(); }});
    var shown = function () { reset.style.visibility = ctx.get(k) === def ? 'hidden' : 'visible'; };
    if (p.type === 'number') {
      var rng = h('input', {type: 'range', min: p.min, max: p.max, step: p.step, value: ctx.get(k)}), out = h('span', {class: 'val mono'});
      rng.addEventListener('input', function () { ctx.set(k, parseFloat(rng.value)); sync(); });
      sync = function () { var v = ctx.get(k); rng.value = v; out.textContent = (Math.round(v * 1000) / 1000) + (p.unit || ''); shown(); };
      body = h('div', {class: 'rg'}, rng, out);
    } else if (p.type === 'color') {
      var col = h('input', {type: 'color'}), tag = h('span', {class: 'val mono'});
      col.addEventListener('input', function () { ctx.set(k, col.value); sync(); });
      sync = function () { var v = ctx.get(k), tok = /^palette\./.test(v); col.value = tok ? ctx.palette()[v.split('.')[1]] : v; tag.textContent = tok ? 'paleta · ' + v.split('.')[1] : v; shown(); };
      body = h('div', {class: 'rg'}, col, tag);
    } else {
      var sel = h('select', {class: 'in'}, p.options.map(function (o) { return h('option', {value: o.value, text: o.label || o.value}); }));
      sel.addEventListener('change', function () { ctx.set(k, sel.value); sync(); });
      sync = function () { sel.value = ctx.get(k); shown(); };
      body = h('div', {class: 'rg'}, sel);
    }
    sync();
    return {el: h('div', {class: 'ctl'}, h('label', {text: p.label || k}), body, reset), sync: sync};
  }

  // ---- kits (carritos): varios, con nombre, guardados en este navegador. Uno está "activo": es el que recibe «Añadir al kit». ----
  var KITS_KEY = 'posts-kits-v2', KIT_KEY_OLD = 'posts-kit-v1', KITS_MAX = 30, kitListeners = [];
  var uid = function () { return 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  function loadKits() {
    try { var s = JSON.parse(localStorage.getItem(KITS_KEY)); if (s && Array.isArray(s.kits) && s.kits.length) { if (!s.kits.some(function (k) { return k.id === s.active; })) s.active = s.kits[0].id; return s; } } catch (e) { /* ilegible: se parte de cero */ }
    var first = {id: uid(), name: 'Mi kit', palette: '', items: []};
    try { var old = JSON.parse(localStorage.getItem(KIT_KEY_OLD)); if (old && Array.isArray(old.items)) first = {id: first.id, name: old.name || 'Mi kit', palette: old.palette || '', items: old.items}; } catch (e) { /* sin kit anterior */ }   // migra el kit único de la versión anterior
    return {active: first.id, kits: [first]};
  }
  var kitStore = {
    write: function (s) { try { localStorage.setItem(KITS_KEY, JSON.stringify(s)); } catch (e) { /* sin almacenamiento */ } kitListeners.forEach(function (f) { f(kitStore.get()); }); },
    get: function () { var s = loadKits(), k = s.kits.filter(function (x) { return x.id === s.active; })[0]; return {name: k.name, palette: k.palette, items: k.items}; },
    set: function (k) { var s = loadKits(); s.kits.forEach(function (x) { if (x.id === s.active) { x.name = k.name; x.palette = k.palette; x.items = k.items; } }); kitStore.write(s); },
    list: function () { var s = loadKits(); return {active: s.active, kits: s.kits.map(function (x) { return {id: x.id, name: x.name || 'Sin nombre', n: x.items.length}; })}; },
    select: function (id) { var s = loadKits(); if (s.kits.some(function (k) { return k.id === id; })) { s.active = id; kitStore.write(s); } },
    create: function (name, data) {
      var s = loadKits();
      if (s.kits.length >= KITS_MAX) { toast('Hasta ' + KITS_MAX + ' kits: elimina alguno antes'); return null; }
      var k = {id: uid(), name: name || 'Kit nuevo', palette: (data && data.palette) || '', items: (data && data.items) || []};
      s.kits.push(k); s.active = k.id; kitStore.write(s); return k.id;
    },
    duplicate: function () { var c = kitStore.get(); return kitStore.create((c.name || 'Kit') + ' (copia)', JSON.parse(JSON.stringify(c))); },
    remove: function (id) {
      var s = loadKits(); s.kits = s.kits.filter(function (k) { return k.id !== id; });
      if (!s.kits.length) s.kits.push({id: uid(), name: 'Mi kit', palette: '', items: []});
      if (s.active === id || !s.kits.some(function (k) { return k.id === s.active; })) s.active = s.kits[0].id;
      kitStore.write(s);
    },
    add: function (item, palette) {
      var k = kitStore.get();
      if (k.items.length >= FX.KIT_MAX) { toast('El kit admite hasta ' + FX.KIT_MAX + ' elementos'); return k; }
      if (!k.items.length) k.palette = palette;
      k.items.push(item); kitStore.set(k); return k;
    },
    onChange: function (f) { kitListeners.push(f); },
  };
  // Elemento del kit a partir de un efecto: el texto del elemento de texto pasa a ser su «label»; el resto de cambios van en elements.
  function kitItem(e, vals, els) {
    var x = JSON.parse(JSON.stringify(els || {})), label = (x.s && x.s.text) || e.fx.label || '';
    if (x.s) { delete x.s.text; if (!Object.keys(x.s).length) delete x.s; }
    return {effect: e.id, label: label, params: Object.assign({}, vals), elements: x};
  }
  function kitBadge() { var n = kitStore.get().items.length, b = document.getElementById('kitbadge'); if (b) { b.textContent = n ? String(n) : ''; b.style.display = n ? '' : 'none'; } }
  kitStore.onChange(kitBadge);


  // ---- elementos de muestra: texto, colores y tamaño (SÍ van al código) e imagen (solo vista previa, nunca va al código) ----
  function elsFromQuery(p) {
    var els = {};
    p.forEach(function (v, k) {
      var m = /^el_(?:(s[1-9]?|a|b|e[1-8])_)?(text|color|bg|font|size|w|pad|x|y|fx|fy|from|delay|duration|ease)$/.exec(k);
      if (m) { var id = m[1] || 's'; (els[id] = els[id] || {})[m[2]] = /^(size|w|pad|x|y|fx|fy|delay|duration)$/.test(m[2]) ? parseFloat(v) : v; }
    });
    return els;
  }
  function elsToQuery(els, qs) {
    Object.keys(els).forEach(function (id) { Object.keys(els[id]).forEach(function (k) { qs.set('el_' + (id === 's' ? '' : id + '_') + k, els[id][k]); }); });
    return qs;
  }
  function readImage(file, done) {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { toast('Usa una imagen PNG, JPG, WebP o GIF'); return; }
    if (file.size > 8 * 1024 * 1024) { toast('La imagen pesa más de 8 MB'); return; }
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var k = Math.min(1, 1080 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      done(c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85));
    };
    img.onerror = function () { URL.revokeObjectURL(url); toast('No se pudo leer la imagen'); };
    img.src = url;
  }

  // ---- controles reutilizables ----
  function fontSelect(value, onChange) {
    var brands = (PW.data().brands || {}), seenB = {}, bopts = [];
    Object.keys(brands).sort().forEach(function (bid) {
      [brands[bid].headFont, brands[bid].bodyFont].forEach(function (f) {
        if (f && !seenB[bid + '|' + f]) { seenB[bid + '|' + f] = 1; bopts.push(h('option', {value: f, text: f + ' · ' + (STATIC ? 'paleta ' : '') + (brands[bid].name || bid)})); }
      });
    });
    var sel = h('select', {class: 'in'}, h('option', {value: '', text: 'La del efecto'}),
      bopts.length ? h('optgroup', {label: STATIC ? 'Sugeridas con cada paleta' : 'Fuentes de las marcas'}, bopts) : null,
      h('optgroup', {label: 'Google Fonts'}, FX.FONTS.google.map(function (f) { return h('option', {value: f, text: f}); })),
      h('optgroup', {label: 'Del sistema'}, FX.FONTS.system.map(function (f) { return h('option', {value: f, text: f}); })));
    sel.value = value || '';
    sel.addEventListener('change', function () { onChange(sel.value); });
    return sel;
  }
  function colorRow(label, value, onSet) {
    var inp = h('input', {type: 'color', value: /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#888888'}), tag = h('span', {class: 'val mono', text: value || 'auto'});
    inp.addEventListener('input', function () { tag.textContent = inp.value; onSet(inp.value); });
    return h('div', {class: 'ctl'}, h('label', {text: label}), h('div', {class: 'rg'}, inp, tag),
      h('button', {class: 'mini', title: 'Volver al valor del efecto', text: '↺', onclick: function () { tag.textContent = 'auto'; inp.value = '#888888'; onSet(''); }}));
  }
  function sliderRow(label, value, min, max, step, unit, shown, onSet) {
    var rng = h('input', {type: 'range', min: min, max: max, step: step, value: value != null ? value : shown}), out = h('span', {class: 'val mono', text: value != null ? value + unit : 'auto'});
    rng.addEventListener('input', function () { out.textContent = rng.value + unit; onSet(parseFloat(rng.value)); });
    return h('div', {class: 'ctl'}, h('label', {text: label}), h('div', {class: 'rg'}, rng, out),
      h('button', {class: 'mini', title: 'Volver al valor del efecto', text: '↺', onclick: function () { out.textContent = 'auto'; onSet(''); }}));
  }
  // Cuadro 9:16 en miniatura: se hace clic o se arrastra para elegir una posición (X, Y en % de la pantalla)
  function pad2d(x, y, onChange) {
    var pad = h('div', {class: 'pad2d'}), dot = h('i'), read = h('span', {class: 'mono'});
    pad.appendChild(dot);
    var place = function (px, py) { dot.style.left = px + '%'; dot.style.top = py + '%'; read.textContent = px + '%, ' + py + '%'; };
    place(x, y);
    function at(ev) { var r = pad.getBoundingClientRect(), px = Math.round(Math.max(0, Math.min(100, (ev.clientX - r.left) / r.width * 100))), py = Math.round(Math.max(0, Math.min(100, (ev.clientY - r.top) / r.height * 100))); place(px, py); onChange(px, py); }
    pad.addEventListener('pointerdown', function (ev) { pad.setPointerCapture(ev.pointerId); at(ev); pad.onpointermove = at; });
    pad.addEventListener('pointerup', function () { pad.onpointermove = null; });
    return {pad: pad, read: read};
  }
  // Fondo de la vista previa: imagen o color. Solo se ve en la vista previa; nunca va al código, a la URL ni a la API.
  function bgControl(assets, onChange) {
    var file = h('input', {type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', style: 'display:none'}), state = h('span', {class: 'val', text: assets.bg ? 'imagen puesta' : assets.bgColor ? assets.bgColor : 'el de la paleta'});
    file.addEventListener('change', function () { var f = file.files && file.files[0]; if (!f) return; readImage(f, function (d) { assets.bg = d; state.textContent = 'imagen puesta'; onChange(); }); file.value = ''; });
    var col = h('input', {type: 'color', value: assets.bgColor || '#202830'});
    col.addEventListener('input', function () { assets.bgColor = col.value; if (!assets.bg) state.textContent = col.value; onChange(); });
    return h('div', {class: 'panel', style: 'margin-top:10px'}, h('div', {class: 'ctl'}, h('label', {text: 'Fondo (solo vista previa)'}),
      h('div', {class: 'rg'}, h('button', {text: 'Imagen…', onclick: function () { file.click(); }}), col, state, file),
      h('button', {class: 'mini', title: 'Quitar el fondo', text: '✕', onclick: function () { delete assets.bg; delete assets.bgColor; state.textContent = 'el de la paleta'; onChange(); }})));
  }
  var FROM_LABEL = {bottom: 'Abajo', top: 'Arriba', left: 'La izquierda', right: 'La derecha', center: 'El centro (crece)', fade: 'Solo aparece (fundido)', custom: 'Un punto de la pantalla…'};
  var EASE_LABEL = {suave: 'Rebote suave', lineal: 'Lineal', 'in-out': 'Entrada y salida', brusco: 'Brusco'};
  // Efectos con elementos añadidos por el usuario ({{items}}): para cada uno se elige dónde termina, de dónde sale y cuándo entra.
  function itemsPanel(e, o, cfg) {
    var box = h('div', {class: 'panel'}), list = h('div'), isE = function (id) { return /^e[1-8]$/.test(id); };
    box.appendChild(h('p', {class: 'hint', style: 'color:var(--mut);margin:0 0 10px;font-size:12px', text: 'Añade los elementos que quieras. Para cada uno elige dónde termina, de dónde sale y cuándo entra: todo va al código. La imagen es solo para la vista previa.'}));
    var clone = function (x) { return JSON.parse(JSON.stringify(x)); };
    function materialize() { var all = o.get(); if (!Object.keys(all).some(isE)) Object.keys(cfg.defaults).forEach(function (id) { all[id] = clone(cfg.defaults[id]); }); return all; }
    function current() { var all = o.get(), ids = Object.keys(all).filter(isE).sort(); return ids.length ? ids.map(function (id) { return [id, all[id]]; }) : Object.keys(cfg.defaults).sort().map(function (id) { return [id, cfg.defaults[id]]; }); }
    function setItem(id, k, v) { var all = materialize(), c = Object.assign({x: 50, y: 50, from: 'bottom', size: 90}, all[id]); if (v === '' || v == null || (typeof v === 'number' && !isFinite(v))) delete c[k]; else c[k] = v; all[id] = c; o.set(all); }
    function draw() {
      list.replaceChildren();
      var rows = current();
      rows.forEach(function (row, n) {
        var id = row[0], it = Object.assign({x: 50, y: 50, from: 'bottom'}, row[1]), item = h('div', {class: 'item'});
        item.appendChild(h('header', null, h('b', {text: 'Elemento ' + (n + 1)}),
          h('button', {class: 'mini', title: 'Quitar este elemento', text: '✕', disabled: rows.length < 2, onclick: function () { var all = materialize(); delete all[id]; o.set(all); draw(); }})));
        var t = h('input', {type: 'text', maxlength: 80, value: it.text || '', placeholder: 'Texto'});
        t.addEventListener('input', function () { setItem(id, 'text', t.value); });
        item.appendChild(h('label', {class: 'f', style: 'margin:0 0 8px'}, 'Texto', t));
        item.appendChild(h('label', {class: 'f', style: 'margin:0 0 8px'}, 'Fuente', fontSelect(it.font, function (v) { setItem(id, 'font', v); })));
        item.appendChild(colorRow('Color del texto', it.color && !/^palette\./.test(it.color) ? it.color : '', function (v) { setItem(id, 'color', v); }));
        item.appendChild(colorRow('Fondo', it.bg && !/^palette\./.test(it.bg) ? it.bg : '', function (v) { setItem(id, 'bg', v); }));
        item.appendChild(sliderRow('Tamaño del texto', it.size, 20, 400, 5, 'px', 90, function (v) { setItem(id, 'size', v); }));
        var endPad = pad2d(it.x, it.y, function (px, py) { all2(id, {x: px, y: py}); });
        var pads = h('div', {class: 'pads'}, h('div', null, h('span', {text: 'Termina en (centro)'}), endPad.pad, endPad.read));
        var fromSel = h('select', {class: 'in'}, cfg && ['bottom', 'top', 'left', 'right', 'center', 'fade', 'custom'].map(function (k) { return h('option', {value: k, text: FROM_LABEL[k]}); }));
        fromSel.value = it.from || 'bottom';
        fromSel.addEventListener('change', function () { setItem(id, 'from', fromSel.value); draw(); });
        if ((it.from || 'bottom') === 'custom') {
          var sp = pad2d(it.fx != null ? it.fx : it.x, it.fy != null ? it.fy : it.y, function (px, py) { all2(id, {fx: px, fy: py}); });
          pads.appendChild(h('div', null, h('span', {text: 'Sale desde (centro)'}), sp.pad, sp.read));
        }
        item.appendChild(pads);
        item.appendChild(h('label', {class: 'f', style: 'margin:0 0 8px'}, 'Sale desde', fromSel));
        item.appendChild(sliderRow('Entra en el segundo', it.delay, 0, 10, 0.05, 's', 0, function (v) { setItem(id, 'delay', v); }));
        item.appendChild(sliderRow('Duración', it.duration, 0.1, 3, 0.05, 's', 0.7, function (v) { setItem(id, 'duration', v); }));
        var easeSel = h('select', {class: 'in'}, h('option', {value: '', text: 'La del efecto'}), Object.keys(EASE_LABEL).map(function (k) { return h('option', {value: k, text: EASE_LABEL[k]}); }));
        easeSel.value = it.ease || '';
        easeSel.addEventListener('change', function () { setItem(id, 'ease', easeSel.value); });
        item.appendChild(h('label', {class: 'f', style: 'margin:0 0 8px'}, 'Curva', easeSel));
        var file = h('input', {type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', style: 'display:none'}), state = h('span', {class: 'val', text: o.assets[id] ? 'imagen puesta' : 'sin imagen'});
        file.addEventListener('change', function () { var f = file.files && file.files[0]; if (!f) return; readImage(f, function (d) { o.assets[id] = d; state.textContent = 'imagen puesta'; o.onAsset(); }); file.value = ''; });
        item.appendChild(h('div', {class: 'ctl'}, h('label', {text: 'Imagen (solo vista previa)'}), h('div', {class: 'rg'}, h('button', {text: 'Elegir imagen…', onclick: function () { file.click(); }}), state, file),
          h('button', {class: 'mini', title: 'Quitar la imagen', text: '✕', onclick: function () { delete o.assets[id]; state.textContent = 'sin imagen'; o.onAsset(); }})));
        list.appendChild(item);
      });
    }
    function all2(id, props) { var all = materialize(), c = Object.assign({x: 50, y: 50, from: 'bottom', size: 90}, all[id], props); all[id] = c; o.set(all); }
    box.appendChild(list);
    box.appendChild(h('div', {class: 'actions'}, h('button', {class: 'primary', text: '+ Agregar elemento', onclick: function () {
      var all = materialize(), ids = Object.keys(all).filter(isE).sort();
      if (ids.length >= cfg.max) { toast('Hasta ' + cfg.max + ' elementos'); return; }
      var n = 1; while (all['e' + n]) n++;
      all['e' + n] = {text: 'Nuevo elemento', x: 50, y: Math.min(90, 18 + ids.length * 14), from: 'bottom', size: 70, color: 'palette.light'};
      o.set(all); draw();
    }})));
    draw();
    return box;
  }

  // o: {get() -> els, set(els), assets: {id: dataURL}, onAsset(), kit: bool}. En el kit el texto del elemento de texto se edita en su propio campo «Texto».
  function elementsPanel(e, o) {
    var cfg = FX.itemsConfig(e);
    if (cfg) return itemsPanel(e, o, cfg);
    var seen = {}, rows = FX.elementsOf(e).filter(function (el) { if (seen[el.id]) return false; seen[el.id] = 1; return true; });
    if (!rows.length) return null;
    var NAME = {s: 'Elemento de texto', a: 'Escena A', b: 'Escena B', m: 'Foto o video de muestra'};
    var nameOf = function (el) { return el.name || NAME[el.id] || ('Elemento de texto ' + el.id.slice(1)); };
    var box = h('div', {class: 'panel'});
    box.appendChild(h('p', {class: 'hint', style: 'color:var(--mut);margin:0 0 10px;font-size:12px', text: 'El texto, los colores y el tamaño se incluyen en el código. La imagen es solo para la vista previa: no va en el código ni en la API.'}));
    rows.forEach(function (el) {
      var id = el.id;
      var setProp = function (k, v) {
        var all = o.get(), c = Object.assign({}, all[id] || {});
        if (v === '' || v == null || (typeof v === 'number' && !isFinite(v))) delete c[k]; else c[k] = v;
        if (Object.keys(c).length) all[id] = c; else delete all[id];
        o.set(all);
      };
      var cur = function () { return o.get()[id] || {}; };
      var section = h('div', {class: 'elrow'}, h('h3', {text: nameOf(el)}, ' ', h('small', {text: el.kind === 'media' ? '(el marcador va en el código; la imagen, no)' : el.inCode ? '(va en el código)' : '(solo vista previa)'})));
      if (el.hasText && !(o.kit && id === 's')) {
        var t = h('input', {type: 'text', maxlength: 80, value: cur().text || '', placeholder: el.text || 'Texto'});
        t.addEventListener('input', function () { setProp('text', t.value); });
        section.appendChild(h('label', {class: 'f', style: 'margin:0 0 8px'}, 'Texto', t));
      }
      if (el.kind === 'sample' || el.kind === 'scene') {
        section.appendChild(h('label', {class: 'f', style: 'margin:0 0 8px'}, 'Fuente', fontSelect(cur().font, function (v) { setProp('font', v); })));
        [['color', 'Color del texto'], ['bg', 'Fondo']].forEach(function (cp) {
          var k = cp[0], inp = h('input', {type: 'color', value: cur()[k] || '#888888'}), tag = h('span', {class: 'val mono', text: cur()[k] || 'auto'});
          inp.addEventListener('input', function () { tag.textContent = inp.value; setProp(k, inp.value); });
          var auto = h('button', {class: 'mini', title: 'Volver al color del efecto', text: '↺', onclick: function () { tag.textContent = 'auto'; inp.value = '#888888'; setProp(k, ''); }});
          section.appendChild(h('div', {class: 'ctl'}, h('label', {text: cp[1]}), h('div', {class: 'rg'}, inp, tag), auto));
        });
        // tamaños: texto (todos), ancho y relleno del elemento (solo el elemento de texto de muestra)
        var sliders = [['size', 'Tamaño del texto', 20, 400, 5, 'px', el.kind === 'sample' ? 130 : 190]];
        if (el.kind === 'sample') sliders.push(['w', 'Ancho del elemento', 10, 100, 1, '%', 80], ['pad', 'Relleno interior', 0, 300, 5, 'px', 50]);
        sliders.forEach(function (sd) {
          var k = sd[0], rng = h('input', {type: 'range', min: sd[2], max: sd[3], step: sd[4], value: cur()[k] != null ? cur()[k] : sd[6]}), out = h('span', {class: 'val mono', text: cur()[k] != null ? cur()[k] + sd[5] : 'auto'});
          rng.addEventListener('input', function () { out.textContent = rng.value + sd[5]; setProp(k, parseFloat(rng.value)); });
          section.appendChild(h('div', {class: 'ctl'}, h('label', {text: sd[1]}), h('div', {class: 'rg'}, rng, out),
            h('button', {class: 'mini', title: 'Volver al tamaño del efecto', text: '↺', onclick: function () { out.textContent = 'auto'; setProp(k, ''); }})));
        });
      }
      if (el.kind === 'label') { box.appendChild(section); return; }   // sin elemento de muestra que sustituir: solo texto
      var file = h('input', {type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', style: 'display:none'}), state = h('span', {class: 'val', text: o.assets[id] ? 'imagen puesta' : 'sin imagen'});
      file.addEventListener('change', function () {
        var f = file.files && file.files[0]; if (!f) return;
        readImage(f, function (data) { o.assets[id] = data; state.textContent = 'imagen puesta'; o.onAsset(); });
        file.value = '';
      });
      section.appendChild(h('div', {class: 'ctl'}, h('label', {text: 'Imagen (solo vista previa)'}),
        h('div', {class: 'rg'}, h('button', {text: 'Elegir imagen…', onclick: function () { file.click(); }}), state, file),
        h('button', {class: 'mini', title: 'Quitar la imagen', text: '✕', onclick: function () { delete o.assets[id]; state.textContent = 'sin imagen'; o.onAsset(); }})));
      box.appendChild(section);
    });
    return box;
  }

  // ---- configuraciones guardadas (en este navegador): efecto + valores + paleta, como un enlace de la propia página ----
  var SAVE_KEY = 'posts-saved-v1';
  var saved = {
    all: function () { try { var s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (Array.isArray(s)) return s; } catch (e) { /* ilegible: se ignora */ } return []; },
    put: function (list) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(list.slice(-200))); return true; } catch (e) { toast('No se pudo guardar en este navegador'); return false; } },
  };
  var currentQs = function () { var hs = location.hash, i = hs.indexOf('?'); return i >= 0 ? hs.slice(i + 1) : ''; };
  function saveBox(e) {
    var list = h('div', {class: 'saved'}), name = h('input', {class: 'in', type: 'text', maxlength: 60, placeholder: 'Nombre (p. ej. «Barrido rápido en azul»)'});
    function draw() {
      list.replaceChildren();
      saved.all().filter(function (s) { return s.effect === e.id; }).forEach(function (s) {
        list.appendChild(h('div', {class: 'srow'}, h('b', {text: s.name}),
          h('button', {text: 'Aplicar', onclick: function () { routeQuery = new URLSearchParams(s.qs); location.hash = '#/efecto/' + e.id + (s.qs ? '?' + s.qs : ''); render(); }}),
          h('button', {text: 'Al kit', onclick: function () { var p = new URLSearchParams(s.qs), r = FX.resolve(e.fx, Object.fromEntries(Array.from(p).filter(function (kv) { return e.fx.params[kv[0]]; }))), sel = elsFromQuery(p);
            var pal = p.get('palette') === 'custom' ? {dark: p.get('c_dark'), light: p.get('c_light'), accent: p.get('c_accent')} : (p.get('palette') || '');
            toast('Añadido al kit (' + kitStore.add(kitItem(e, Object.assign(FX.defaults(e.fx), r.errors.length ? {} : r.values), sel), pal).items.length + ')'); }}),
          h('button', {class: 'mini', title: 'Borrar', text: '✕', onclick: function () { saved.put(saved.all().filter(function (x) { return x !== undefined && !(x.effect === s.effect && x.name === s.name && x.at === s.at); })); draw(); }})));
      });
      list.style.display = list.children.length ? '' : 'none';
    }
    var save = function () {
      var n = name.value.trim(); if (!n) { toast('Escribe un nombre para la configuración'); name.focus(); return; }
      var all = saved.all().filter(function (x) { return !(x.effect === e.id && x.name === n); });
      all.push({effect: e.id, name: n, qs: currentQs(), at: Date.now()});
      if (saved.put(all)) { name.value = ''; draw(); toast('Configuración guardada'); }
    };
    name.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') save(); });
    draw();
    return h('div', {class: 'panel'}, h('div', {class: 'rg'}, name, h('button', {class: 'primary', text: 'Guardar configuración', onclick: save})), list);
  }
  function viewSaved() {
    var all = saved.all().slice().reverse();
    app.replaceChildren(h('h1', {text: 'Configuraciones guardadas'}),
      h('p', {class: 'sub', text: 'Se guardan solo en este navegador. Ábrelas para seguir editándolas o añádelas al kit.'}),
      all.length ? h('div', {class: 'saved'}, all.map(function (s) {
        var e = effById(s.effect);
        return h('div', {class: 'srow'}, h('b', {text: s.name}), h('span', {class: 'id mono', text: e ? e.name : s.effect}),
          e ? h('a', {href: '#/efecto/' + s.effect + (s.qs ? '?' + s.qs : ''), style: 'color:var(--acc)', text: 'Abrir'}) : null,
          h('button', {class: 'mini', title: 'Borrar', text: '✕', onclick: function () { saved.put(saved.all().filter(function (x) { return !(x.effect === s.effect && x.name === s.name); })); viewSaved(); }}));
      })) : h('div', {class: 'empty', text: 'Aún no has guardado ninguna. Abre un efecto, ajústalo y pulsa «Guardar configuración».'}));
  }

  // ---- vista: efecto con contrato spec 1 (controles + vista previa + código listo) ----
  function viewEffectFx(e) {
    if (cleanup) { cleanup(); cleanup = null; }
    var fx = e.fx, pr = routeQuery, vals = FX.defaults(fx), els = elsFromQuery(pr), assets = {};   // els: texto/colores/tamaño (van al código); assets: imágenes solo de la vista previa
    var brandIds = Object.keys(data.brands).sort(), custom = {dark: '#14181c', light: '#f4f1ea', accent: '#c46a2b'};
    var palId = pr.get('palette') && (data.brands[pr.get('palette')] || pr.get('palette') === 'custom') ? pr.get('palette') : ((e.brands || []).filter(function (b) { return data.brands[b]; })[0] || brandIds[0] || 'custom');
    ['dark', 'light', 'accent'].forEach(function (k) { if (/^#[0-9a-fA-F]{6}$/.test(pr.get('c_' + k) || '')) custom[k] = pr.get('c_' + k); });
    Object.keys(fx.params).forEach(function (k) {
      if (pr.get(k) == null) return;
      var r = FX.resolve(fx, (function (o) { o[k] = pr.get(k); return o; })({}));
      if (!r.errors.length) vals[k] = r.values[k];
    });
    var palette = function () { var b = data.brands[palId]; return palId === 'custom' || !b ? custom : {dark: b.dark, light: b.light, accent: b.accent}; };
    var frame = h('iframe', {src: '/fx-preview.html', sandbox: 'allow-scripts', title: 'Vista previa de ' + e.name}), ready = false;
    var htmlPre = h('pre'), cssPre = h('pre'), urlBox = h('div', {class: 'cmd'}), markersBox = h('div', {class: 'note'});
    var current = null, rows = [];

    function query() {
      var d = FX.defaults(fx), qs = new URLSearchParams();
      Object.keys(fx.params).forEach(function (k) { if (vals[k] !== d[k]) qs.set(k, vals[k]); });
      elsToQuery(els, qs);
      return qs;
    }
    function update() {
      var p = palette(), r = FX.build(e, vals, p, {elements: els, assets: assets});
      current = r;
      if (ready) frame.contentWindow.postMessage({type: 'fx', css: r.css, html: r.previewHtml, total: r.total, markers: r.markers, palette: p, bgImage: assets.bg || null, bgColor: assets.bgColor || null}, '*');
      htmlPre.textContent = r.html; cssPre.textContent = r.css;
      var qs = query(), local = new URLSearchParams(qs.toString());
      if (palId !== 'custom') local.set('palette', palId); else ['dark', 'light', 'accent'].forEach(function (k) { local.set(k, custom[k]); });
      var qsApi = local.toString();
      urlBox.textContent = location.origin + '/api/v1/effects/' + e.id + (qsApi ? '?' + qsApi : '');
      markersBox.replaceChildren();
      markersBox.style.display = r.markers.length ? '' : 'none';
      r.markers.forEach(function (m) { markersBox.appendChild(h('div', null, h('b', {text: fmt(m.at)}), ' — ' + m.label)); });
      var ui = qs.toString(), pal = palId === 'custom' ? 'palette=custom&' + ['dark', 'light', 'accent'].map(function (k) { return 'c_' + k + '=' + encodeURIComponent(custom[k]); }).join('&') : 'palette=' + palId;
      history.replaceState(null, '', '#/efecto/' + e.id + '?' + (ui ? ui + '&' : '') + pal);
      rows.forEach(function (fn) { fn(); });
    }
    function onMsg(ev) { if (ev.source === frame.contentWindow && ev.data && ev.data.type === 'fx-ready') { ready = true; update(); } }
    window.addEventListener('message', onMsg);
    cleanup = function () { window.removeEventListener('message', onMsg); };

    function control(k, p) {
      var c = makeControl(k, p, {get: function (n) { return vals[n]; }, set: function (n, v) { vals[n] = v; update(); }, palette: palette});
      rows.push(c.sync);
      return c.el;
    }

    var palSel = h('select', {class: 'in'}, brandIds.map(function (b) { return h('option', {value: b, text: data.brands[b].name}); }).concat([h('option', {value: 'custom', text: 'Personalizada…'})]));
    palSel.value = palId;
    var customBox = h('div', {class: 'rg', style: 'margin-top:8px'}, ['dark', 'light', 'accent'].map(function (k) {
      var inp = h('input', {type: 'color', value: custom[k], title: {dark: 'Oscuro', light: 'Claro', accent: 'Acento'}[k]});
      inp.addEventListener('input', function () { custom[k] = inp.value; update(); });
      return inp;
    }));
    var showCustom = function () { customBox.style.display = palId === 'custom' ? '' : 'none'; };
    palSel.addEventListener('change', function () { palId = palSel.value; showCustom(); update(); });
    showCustom();

    var allCode = function () { return '/* ' + e.id + ' — CSS (una vez) */\n' + current.css.trim() + '\n\n<!-- ' + e.id + ' — HTML -->\n' + current.html + '\n'; };
    var promptText = function () { return 'Usa el efecto "' + e.name + '" del catálogo. Lee ' + urlBox.textContent + ' (JSON con code.css y code.html ya ajustados) y aplícalo en mi pieza; empieza en el segundo ___.'; };

    app.replaceChildren(
      h('a', {class: 'back', href: '#/', text: '← Todos los efectos'}),
      h('div', {class: 'detail'},
        h('div', {class: 'stagebox'}, frame,
          h('div', {class: 'bar', style: 'margin-top:10px'}, 'Paleta', palSel), customBox, bgControl(assets, function () { update(); }),
          h('p', {style: 'color:var(--mut);font-size:12px;margin:10px 0 0', text: 'La barra inferior de la vista previa permite pausar y mover el instante. Los puntos amarillos indican momentos clave.'})),
        h('div', null,
          h('h1', {text: e.name}),
          h('div', {class: 'idline'}, h('code', {text: e.id}), h('span', {class: 'kind k-' + e.kind, text: KIND[e.kind] || e.kind}),
            h('button', {onclick: function () { copy(e.id, 'id copiado'); }, text: 'Copiar id'}),
            h('button', {class: 'primary', text: '+ Añadir al kit', onclick: function () { var n = kitStore.add(kitItem(e, vals, els), palId === 'custom' ? custom : palId).items.length; toast('Añadido a «' + kitStore.get().name + '» (' + n + ')'); }})),
          md(e.md),
          FX.elementsOf(e).length ? h('h2', {text: 'Elementos de la vista previa'}) : null,
          elementsPanel(e, {get: function () { return els; }, set: function (a) { els = a; update(); }, assets: assets, onAsset: function () { update(); }}),
          h('h2', {text: 'Controles'}),
          saveBox(e),
          h('div', {class: 'panel'}, Object.keys(fx.params).map(function (k) { return control(k, fx.params[k]); }),
            h('div', {class: 'actions'}, h('button', {text: 'Restablecer todo', onclick: function () { routeQuery = new URLSearchParams(palId === 'custom' ? '' : 'palette=' + palId); viewEffectFx(e); }}))),
          markersBox,
          h('h2', {text: 'Código con estos valores'}),
          h('div', {class: 'actions', style: 'margin:0 0 6px'},
            h('button', {class: 'primary', text: 'Copiar todo', onclick: function () { copy(allCode(), 'Código copiado'); }}),
            h('button', {text: 'Copiar HTML', onclick: function () { copy(current.html, 'HTML copiado'); }}),
            h('button', {text: 'Copiar CSS', onclick: function () { copy(current.css, 'CSS copiado'); }})),
          h('div', {class: 'sub', style: 'margin:8px 0 0', text: 'HTML'}), htmlPre, h('div', {class: 'sub', style: 'margin:8px 0 0', text: 'CSS (una sola vez por pieza)'}), cssPre,
          h('h2', {text: 'Para tu agente'}),
          h('p', {class: 'hint', style: 'color:var(--mut);margin:0 0 8px', text: 'Esta URL devuelve el efecto con tus valores en JSON (código listo, parámetros y marcas de tiempo). Pégala en el prompt de Claude.'}),
          urlBox, h('div', {class: 'actions'}, h('button', {text: 'Copiar URL de la API', onclick: function () { copy(urlBox.textContent, 'URL copiada'); }}),
            h('button', {text: 'Copiar prompt para Claude', onclick: function () { copy(promptText(), 'Prompt copiado'); }})),
          STATIC ? null : usesTable(e))));
    update();
  }

  // ---- vista: detalle de un efecto ----
  function viewEffect(id) {
    var e = effById(id);
    if (!e) return notFound('efecto', id);
    if (e.fx) return viewEffectFx(e);
    var byPost = {};
    e.uses.forEach(function (u) { (byPost[u.post] = byPost[u.post] || []).push(u); });
    var brandSel = h('select', {onchange: function () { frame.src = demoSrc(e, brandSel.value, true); }},
      Object.keys(data.brands).sort().map(function (b) { return h('option', {value: b, text: data.brands[b].name}); }));
    brandSel.value = (e.brands && e.brands[0]) || Object.keys(data.brands)[0];
    var frame = e.demo ? h('iframe', {src: demoSrc(e, brandSel.value, true), title: 'Demo de ' + e.name}) : null;
    var kv = [];
    var add = function (k, v) { if (v) kv.push(h('dt', {text: k}), h('dd', null, v)); };
    add('Tipo', h('span', {class: 'kind k-' + e.kind, text: KIND[e.kind] || e.kind}));
    add('Marcas', h('span', {class: 'dots'}, (e.brands || []).map(function (b) { return h('span', {style: 'margin-right:10px'}, brandDot(b), ' ', (data.brands[b] || {}).name || b); })));
    add('Etiquetas', (e.tags || []).join(', '));
    add('Código', e.source ? h('code', {text: (e.source.file || 'pieza ' + e.source.piece) + ' → ' + e.source.symbol}) : null);
    if (e.params && Object.keys(e.params).length) add('Parámetros', h('div', null, Object.keys(e.params).map(function (k) { return h('div', null, h('code', {text: k}), ' ' + e.params[k]); })));
    if (e.audio) add('Audio', e.audio.sfx + ' — ' + e.audio.sync);
    if (e.related && e.related.length) add('Relacionado', e.related.map(function (r) { return h('a', {href: '#/efecto/' + r, style: 'color:var(--acc);margin-right:8px', text: r}); }));

    app.replaceChildren(
      h('a', {class: 'back', href: '#/', text: '← Todos los efectos'}),
      h('div', {class: 'detail'},
        h('div', {class: 'stagebox'},
          frame || h('div', {class: 'nodemo', style: 'position:static;aspect-ratio:9/16;border:1px solid var(--line);border-radius:14px', text: 'Este efecto no tiene demo en vivo (es JS/canvas del motor). Mira el código y los posts donde se usó.'}),
          frame ? h('div', {class: 'bar'}, 'Colores de', brandSel) : null),
        h('div', null,
          h('h1', {text: e.name}),
          h('div', {class: 'idline'}, h('code', {text: e.id}),
            h('button', {onclick: function () { copy(e.id, 'id copiado'); }, text: 'Copiar id'}),
            h('button', {onclick: function () { copy(promptFor(e.id), 'Prompt copiado'); }, text: 'Copiar prompt para Claude'})),
          e.supersededBy ? h('div', {class: 'note'}, 'Este efecto está sustituido por ', h('a', {href: '#/efecto/' + e.supersededBy, style: 'color:var(--acc)', text: e.supersededBy}), ': una versión en CSS puro, configurable y compatible con el kit.') : null,
          md(e.md),
          h('h2', {text: 'Ficha'}), h('dl', {class: 'kv'}, kv),
          e.snippet ? [h('h2', {text: 'Código (' + e.snippetName + ')'}), h('button', {onclick: function () { copy(e.snippet, 'Código copiado'); }, text: 'Copiar código'}), h('pre', {text: e.snippet})] : null,
          h('h2', {text: 'Usado en ' + Object.keys(byPost).length + ' posts'}),
          Object.keys(byPost).length ? h('table', null,
            h('thead', null, h('tr', null, h('th', {text: 'Post'}), h('th', {text: 'Segundos (clic = copiar prompt)'}))),
            h('tbody', null, Object.keys(byPost).sort().map(function (pid) {
              var p = postById(pid);
              return h('tr', {class: 'postrow'},
                h('td', null, h('a', {href: '#/post/' + pid, style: 'color:var(--acc)', text: pid}), p ? h('div', {class: 'id', style: 'color:var(--mut);font-size:12px', text: p.path}) : null),
                h('td', null, h('div', {class: 'times'}, byPost[pid].sort(function (a, b) { return a.t - b.t; }).map(function (u) {
                  return h('span', {class: 't', title: (u.note ? u.note + ' · ' : '') + 'copiar prompt', onclick: function () { copy(promptFor(e.id, pid, u.t), 'Prompt copiado'); }, text: fmt(u.t) + (u.note ? ' · ' + u.note : '')});
                }))));
            }))) : h('div', {class: 'empty', text: 'Ningún post registrado usa este efecto todavía.'})
        )));
  }

  // ---- vista: lista de posts ----
  function viewPosts() {
    var term = norm(q.value);
    var list = data.posts.filter(function (p) {
      if (filters.brand && p.brand !== filters.brand) return false;
      return !term || norm(p.id + ' ' + p.path + ' ' + p.uses.map(function (u) { return u.effect; }).join(' ')).indexOf(term) >= 0;
    });
    var brands = {}; data.posts.forEach(function (p) { brands[p.brand] = 1; });
    app.replaceChildren(
      h('h1', {text: 'Posts'}),
      h('p', {class: 'sub', text: 'Piezas registradas en el catálogo (solo referencias: los videos e imágenes no están en el repo).'}),
      h('div', {class: 'filters'}, h('div', {class: 'grp'}, h('b', {text: 'Marca'}), Object.keys(brands).sort().map(function (b) { return chip((data.brands[b] || {}).name || b, filters.brand === b, function () { filters.brand = filters.brand === b ? null : b; render(); }, brandDot(b)); }))),
      list.length ? h('table', null,
        h('thead', null, h('tr', null, h('th', {text: 'Post'}), h('th', {text: 'Usos'}), h('th', {text: 'Efectos distintos'}))),
        h('tbody', null, list.map(function (p) {
          var kinds = {}; p.uses.forEach(function (u) { kinds[u.effect] = (kinds[u.effect] || 0) + 1; });
          return h('tr', {class: 'postrow', style: 'cursor:pointer', onclick: function () { location.hash = '#/post/' + p.id; }},
            h('td', null, brandDot(p.brand), ' ', h('b', {text: p.id}), h('div', {style: 'color:var(--mut);font-size:12px', text: p.path})),
            h('td', {text: String(p.uses.length)}),
            h('td', null, h('div', {class: 'effchips'}, Object.keys(kinds).sort().map(function (eid) {
              var e = effById(eid); return h('span', {style: 'border-left-color:' + kindColor(e && e.kind), text: eid + ' ×' + kinds[eid]});
            }))));
        }))) : h('div', {class: 'empty', text: 'Ningún post coincide.'}));
  }

  // ---- vista: detalle de un post ----
  function viewPost(id) {
    var p = postById(id);
    if (!p) return notFound('post', id);
    var max = Math.max.apply(null, p.uses.map(function (u) { return u.t; }).concat([1])) * 1.02 + 0.2;
    var only = null, tl = h('div', {class: 'tl'}), tbody = h('tbody');
    var uses = p.uses.slice().sort(function (a, b) { return a.t - b.t; });
    var chipsBox = h('div', {class: 'effchips', style: 'margin:10px 0'});
    function draw() {
      tl.replaceChildren(); tbody.replaceChildren(); chipsBox.replaceChildren();
      var counts = {}; uses.forEach(function (u) { counts[u.effect] = (counts[u.effect] || 0) + 1; });
      Object.keys(counts).sort().forEach(function (eid) {
        var e = effById(eid);
        chipsBox.appendChild(h('button', {class: 'chip' + (only === eid ? ' on' : ''), onclick: function () { only = only === eid ? null : eid; draw(); }, text: eid + ' ×' + counts[eid]}));
      });
      uses.forEach(function (u) {
        var e = effById(u.effect), dim = only && only !== u.effect;
        tl.appendChild(h('i', {class: dim ? 'dim' : '', title: fmt(u.t) + ' · ' + u.effect + (u.note ? ' (' + u.note + ')' : ''), style: 'left:' + (u.t / max * 100) + '%;background:' + kindColor(e && e.kind)}));
        if (dim) return;
        tbody.appendChild(h('tr', {class: 'postrow'},
          h('td', {class: 'mono', text: fmt(u.t)}),
          h('td', null, e ? h('a', {href: '#/efecto/' + e.id, style: 'color:var(--acc)', text: e.name}) : u.effect, ' ', h('span', {class: 'id mono', style: 'color:var(--mut);font-size:12px', text: u.effect})),
          h('td', {text: (u.note || '') + (u.manual ? ' (manual)' : '')}),
          h('td', null, h('button', {onclick: function () { copy(promptFor(u.effect, p.id, u.t), 'Prompt copiado'); }, text: 'Copiar prompt'}))));
      });
    }
    draw();
    var ticks = h('div', {class: 'ticks'}); for (var i = 0; i <= 4; i++) ticks.appendChild(h('span', {text: fmt(max * i / 4)}));
    app.replaceChildren(
      h('a', {class: 'back', href: '#/posts', text: '← Todos los posts'}),
      h('h1', null, brandDot(p.brand), ' ' + p.id),
      h('p', {class: 'sub'}, 'Ruta: ', h('code', {text: p.path}), p.localPath ? [' · en este equipo: ', h('code', {text: p.localPath}), ' ', h('button', {onclick: function () { copy(p.localPath, 'Ruta copiada'); }, text: 'Copiar ruta'})] : ' · la pieza no está en este equipo'),
      h('h2', {text: 'Línea de tiempo'}), tl, ticks, chipsBox,
      h('table', null, h('thead', null, h('tr', null, h('th', {text: 'Segundo'}), h('th', {text: 'Efecto'}), h('th', {text: 'Nota'}), h('th'))), tbody));
  }

  function notFound(what, id) {
    app.replaceChildren(h('a', {class: 'back', href: '#/', text: '← Volver'}), h('div', {class: 'empty', text: 'No existe ' + what + ' "' + id + '" en el catálogo.'}));
  }

  window.PW = {h: h, toast: toast, copy: copy, app: app, search: q, reload: function () { return load(true); }, data: function () { return data; }, makeControl: makeControl, bgControl: bgControl, elementsPanel: elementsPanel, elsFromQuery: elsFromQuery, elsToQuery: elsToQuery, kit: kitStore, KIND: KIND, routeQuery: function () { return routeQuery; }};

  // ---- router ----
  function render() {
    if (!data) return;
    if (cleanup) { cleanup(); cleanup = null; }
    var hash = location.hash.replace(/^#\/?/, ''), qi = hash.indexOf('?');
    routeQuery = new URLSearchParams(qi >= 0 ? hash.slice(qi + 1) : '');
    if (qi >= 0) hash = hash.slice(0, qi);
    var parts = hash.split('/');
    if (STATIC && (parts[0] === 'posts' || parts[0] === 'post')) { location.hash = '#/'; return; }
    var route = parts[0] === 'guardadas' ? 'guardadas' : parts[0] === 'posts' || parts[0] === 'post' ? 'posts' : /^marca/.test(parts[0]) ? 'marcas' : parts[0] === 'kit' ? 'kit' : 'efectos';
    Array.prototype.forEach.call(document.querySelectorAll('#nav a'), function (a) { a.classList.toggle('on', a.dataset.r === route); });
    if (data.errors && data.errors.length) console.warn('Catálogo con avisos:', data.errors);
    if (parts[0] === 'guardadas') viewSaved();
    else if (parts[0] === 'kit') { if (window.KitUI) window.KitUI.render(); }
    else if (/^marca/.test(parts[0])) { if (window.BrandsUI) window.BrandsUI.render(parts); else location.hash = '#/'; }
    else if (parts[0] === 'efecto' && parts[1]) viewEffect(decodeURIComponent(parts[1]));
    else if (parts[0] === 'post' && parts[1]) viewPost(decodeURIComponent(parts[1]));
    else if (parts[0] === 'posts') viewPosts();
    else viewEffects();
    window.scrollTo(0, 0);
  }
  function load(keepScroll) {
    return fetch(STATIC ? '/data/catalog.json' : '/api/catalog').then(function (r) { return r.json(); }).then(function (d) {
      if (d.palettes && !d.brands) d.brands = d.palettes;   // el sitio público trae paletas; la UI las trata igual que las marcas del catálogo local
      data = d; var y = window.scrollY; render(); if (keepScroll) window.scrollTo(0, y);
    }).catch(function (err) { app.replaceChildren(h('div', {class: 'empty', text: 'No se pudo leer el catálogo: ' + err.message})); });
  }
  q.addEventListener('input', function () { var r = location.hash; if (/^#\/(efecto|post)\//.test(r)) location.hash = '#/'; else { var y = window.scrollY; render(); window.scrollTo(0, y); } });
  document.getElementById('reload').addEventListener('click', function () { load(true).then(function () { toast('Catálogo recargado'); }); });
  window.addEventListener('hashchange', render);
  kitBadge();
  load();
})();
