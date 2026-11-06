// UI del catálogo: JS plano, sin dependencias. Todo el contenido se inserta con textContent (nada de innerHTML).
(function () {
  'use strict';
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
      h('p', {class: 'sub', text: data.effects.length + ' efectos · ' + data.posts.length + ' posts registrados. Haz clic en un efecto para ver cómo está hecho y dónde se usó.'}),
      h('div', {class: 'filters'},
        h('div', {class: 'grp'}, h('b', {text: 'Marca'}), Object.keys(brands).sort().map(function (b) { return chip((data.brands[b] || {}).name || b, filters.brand === b, set('brand', b), brandDot(b)); })),
        h('div', {class: 'grp'}, h('b', {text: 'Tipo'}), Object.keys(kinds).sort().map(function (k) { return chip(KIND[k] || k, filters.kind === k, set('kind', k)); }))),
      list.length ? h('div', {class: 'grid'}, list.map(function (e) {
        return h('a', {class: 'card', href: '#/efecto/' + e.id},
          h('div', {class: 'thumb'}, e.demo ? h('iframe', {src: demoSrc(e), loading: 'lazy', tabindex: '-1', title: 'Demo de ' + e.name}) : h('div', {class: 'nodemo', text: 'Sin demo en vivo\n(' + (e.snippetName ? 'código JS' : 'ver motor') + ')'})),
          h('div', {class: 'meta'},
            h('div', {class: 'nm', text: e.name}), h('div', {class: 'id mono', text: e.id}),
            h('div', {class: 'row'}, h('span', {class: 'kind k-' + e.kind, text: KIND[e.kind] || e.kind}),
              h('span', {class: 'dots'}, (e.brands || []).map(brandDot)), h('span', {text: usedCount(e) + ' posts'}))));
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

  // ---- vista: efecto con contrato spec 1 (controles + vista previa + código listo) ----
  function viewEffectFx(e) {
    if (cleanup) { cleanup(); cleanup = null; }
    var fx = e.fx, pr = routeQuery, vals = FX.defaults(fx);
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
      return qs;
    }
    function update() {
      var p = palette(), r = FX.build(e, vals, p);
      current = r;
      if (ready) frame.contentWindow.postMessage({type: 'fx', css: r.css, html: r.previewHtml, total: r.total, markers: r.markers, palette: p}, '*');
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
      var def = p.default, reset = h('button', {class: 'mini', title: 'Restablecer', text: '↺', onclick: function () { vals[k] = def; sync(); update(); }}), body, sync;
      if (p.type === 'number') {
        var rng = h('input', {type: 'range', min: p.min, max: p.max, step: p.step, value: vals[k]}), out = h('span', {class: 'val mono'});
        rng.addEventListener('input', function () { vals[k] = parseFloat(rng.value); sync(); update(); });
        sync = function () { rng.value = vals[k]; out.textContent = (Math.round(vals[k] * 1000) / 1000) + (p.unit || ''); reset.style.visibility = vals[k] === def ? 'hidden' : 'visible'; };
        body = h('div', {class: 'rg'}, rng, out);
      } else if (p.type === 'color') {
        var col = h('input', {type: 'color'}), tag = h('span', {class: 'val mono'});
        col.addEventListener('input', function () { vals[k] = col.value; sync(); update(); });
        sync = function () { var v = vals[k], hex = /^palette\./.test(v) ? palette()[v.split('.')[1]] : v; col.value = hex; tag.textContent = /^palette\./.test(v) ? 'paleta · ' + v.split('.')[1] : v; reset.style.visibility = vals[k] === def ? 'hidden' : 'visible'; };
        body = h('div', {class: 'rg'}, col, tag);
        rows.push(sync);
      } else {
        var sel = h('select', {class: 'in'}, p.options.map(function (o) { return h('option', {value: o.value, text: o.label || o.value}); }));
        sel.addEventListener('change', function () { vals[k] = sel.value; sync(); update(); });
        sync = function () { sel.value = vals[k]; reset.style.visibility = vals[k] === def ? 'hidden' : 'visible'; };
        body = h('div', {class: 'rg'}, sel);
      }
      sync();
      return h('div', {class: 'ctl'}, h('label', {text: p.label || k}), body, reset);
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
          h('div', {class: 'bar', style: 'margin-top:10px'}, 'Paleta', palSel), customBox,
          h('p', {style: 'color:var(--mut);font-size:12px;margin:10px 0 0', text: 'La barra inferior de la vista previa permite pausar y mover el instante. Las marcas amarillas indican momentos clave.'})),
        h('div', null,
          h('h1', {text: e.name}),
          h('div', {class: 'idline'}, h('code', {text: e.id}), h('span', {class: 'kind k-' + e.kind, text: KIND[e.kind] || e.kind}),
            h('button', {onclick: function () { copy(e.id, 'id copiado'); }, text: 'Copiar id'})),
          md(e.md),
          h('h2', {text: 'Controles'}),
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
          usesTable(e))));
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

  window.PW = {h: h, toast: toast, copy: copy, app: app, search: q, reload: function () { return load(true); }};

  // ---- router ----
  function render() {
    if (!data) return;
    if (cleanup) { cleanup(); cleanup = null; }
    var hash = location.hash.replace(/^#\/?/, ''), qi = hash.indexOf('?');
    routeQuery = new URLSearchParams(qi >= 0 ? hash.slice(qi + 1) : '');
    if (qi >= 0) hash = hash.slice(0, qi);
    var parts = hash.split('/');
    var route = parts[0] === 'posts' || parts[0] === 'post' ? 'posts' : /^marca/.test(parts[0]) ? 'marcas' : 'efectos';
    Array.prototype.forEach.call(document.querySelectorAll('#nav a'), function (a) { a.classList.toggle('on', a.dataset.r === route); });
    if (data.errors && data.errors.length) console.warn('Catálogo con avisos:', data.errors);
    if (/^marca/.test(parts[0])) { if (window.BrandsUI) window.BrandsUI.render(parts); }
    else if (parts[0] === 'efecto' && parts[1]) viewEffect(decodeURIComponent(parts[1]));
    else if (parts[0] === 'post' && parts[1]) viewPost(decodeURIComponent(parts[1]));
    else if (parts[0] === 'posts') viewPosts();
    else viewEffects();
    window.scrollTo(0, 0);
  }
  function load(keepScroll) {
    return fetch('/api/catalog').then(function (r) { return r.json(); }).then(function (d) {
      data = d; var y = window.scrollY; render(); if (keepScroll) window.scrollTo(0, y);
    }).catch(function (err) { app.replaceChildren(h('div', {class: 'empty', text: 'No se pudo leer el catálogo: ' + err.message})); });
  }
  q.addEventListener('input', function () { var r = location.hash; if (/^#\/(efecto|post)\//.test(r)) location.hash = '#/'; else { var y = window.scrollY; render(); window.scrollTo(0, y); } });
  document.getElementById('reload').addEventListener('click', function () { load(true).then(function () { toast('Catálogo recargado'); }); });
  window.addEventListener('hashchange', render);
  load();
})();
