// Vista del kit (carrito): varios efectos en una misma pieza, con línea de tiempo editable y paquete exportable.
(function () {
  'use strict';
  var PW = window.PW, h = PW.h, toast = PW.toast, copy = PW.copy, app = PW.app, store = PW.kit, KIND = PW.KIND;
  var KCOLOR = {entrance: 'var(--k-entrance)', text: 'var(--k-text)', transition: 'var(--k-transition)', camera: 'var(--k-camera)', overlay: 'var(--k-overlay)', loop: 'var(--k-loop)'};
  var disposer = null;

  var effectsMap = function () { var m = {}; PW.data().effects.forEach(function (e) { if (e.fx) m[e.id] = e; }); return m; };
  var snap = function (v, step) { return Math.round(v / step) * step; };
  var round2 = function (v) { return Math.round(v * 100) / 100; };
  var fmt = function (t) { return round2(t) + 's'; };
  var kitUrl = function (kit) { return location.origin + '/#/kit?k=' + FX.encodeKit(kit, effectsMap()); };
  var apiUrl = function (kit, extra) { return location.origin + '/api/v1/kit?k=' + FX.encodeKit(kit, effectsMap()) + (extra || ''); };

  // Barra de kits: elegir el activo, crear, duplicar y eliminar
  function kitBar() {
    var L = store.list(), cur = L.kits.filter(function (k) { return k.id === L.active; })[0];
    var sel = h('select', {class: 'in'}, L.kits.map(function (k) { return h('option', {value: k.id, text: k.name + ' (' + k.n + ')'}); }));
    sel.value = L.active;
    var again = function () { sessionStorage.setItem('posts-kit-sel', '0'); render(); };
    sel.addEventListener('change', function () { store.select(sel.value); again(); });
    return h('div', {class: 'bar', style: 'margin:0 0 14px;flex-wrap:wrap;gap:8px'}, 'Mis kits', sel,
      h('button', {text: '+ Nuevo kit', onclick: function () { if (store.create('Kit ' + (L.kits.length + 1))) again(); }}),
      h('button', {text: 'Duplicar', onclick: function () { if (store.duplicate()) again(); }}),
      h('button', {class: 'danger', text: 'Eliminar kit', onclick: function () { if (confirm('¿Eliminar el kit «' + cur.name + '»? No se puede deshacer.')) { store.remove(L.active); again(); } }}));
  }

  function render() {
    if (disposer) { disposer(); disposer = null; }
    var data = PW.data(), shared = PW.routeQuery().get('k');
    var incoming = shared ? FX.decodeKit(shared) : null;
    if (incoming) {
      var cur = store.get();
      if (!cur.items.length || FX.encodeKit(cur, effectsMap()) === shared) { store.set(incoming); history.replaceState(null, '', '#/kit'); incoming = null; }
    }
    var kit = store.get();
    if (incoming) {
      app.replaceChildren(h('h1', {text: 'Kit compartido'}),
        h('div', {class: 'note'}, 'Este enlace trae un kit' + (incoming.name ? ' («' + incoming.name + '»)' : '') + ' con ' + incoming.items.length + ' elementos. Tu kit activo («' + kit.name + '») ya tiene ' + kit.items.length + '.'),
        h('div', {class: 'actions'}, h('button', {class: 'primary', text: 'Guardar como kit nuevo', onclick: function () { store.create(incoming.name || 'Kit compartido', incoming); location.hash = '#/kit'; }}),
          h('button', {text: 'Reemplazar mi kit activo', onclick: function () { store.set(incoming); location.hash = '#/kit'; }}),
          h('button', {text: 'Cancelar', onclick: function () { location.hash = '#/kit'; }})));
      return;
    }
    if (!kit.items.length) {
      app.replaceChildren(h('h1', {text: 'Kit'}), kitBar(),
        h('p', {class: 'sub', text: 'Reúne varios efectos para usarlos en una misma pieza: ordénalos en la línea de tiempo, ajusta cada uno y copia el paquete (o pásale el enlace a Claude).'}),
        h('div', {class: 'empty'}, 'Este kit está vacío. Abre un efecto y pulsa «+ Añadir al kit».', h('div', {style: 'margin-top:14px'}, h('a', {href: '#/'}, h('button', {class: 'primary', text: 'Ver efectos'})))));
      return;
    }

    var effects = effectsMap(), brands = data.brands, brandIds = Object.keys(brands).sort();
    var sel = Math.min(Math.max(0, +(sessionStorage.getItem('posts-kit-sel') || 0)), kit.items.length - 1);
    var built = null, ready = false, playhead = 0, pending = null;
    var frame = h('iframe', {src: '/fx-preview.html', sandbox: 'allow-scripts', title: 'Vista previa del kit'});
    var ctlBox = h('div'), tlBox = h('div'), sumBox = h('div'), errBox = h('div'), linkBox = h('div', {class: 'cmd'}), totalEl = h('span', {class: 'mono'});

    function save() { store.set(kit); }
    var kitBg = {};   // fondo de la vista previa del kit (imagen o color): solo en memoria
    var assets = new Map();   // imágenes de la vista previa por elemento del kit: solo en memoria, nunca van al código, al enlace ni al navegador
    function rebuild() { built = FX.buildKit(effects, {name: kit.name, palette: kit.palette, items: kit.items.map(function (it) { var c = Object.assign({}, it); c.assets = assets.get(it) || null; return c; })}, brands); return built; }
    function push(keepTime) {
      if (!ready || !built) return;
      frame.contentWindow.postMessage(Object.assign({type: 'fx', css: built.css, html: built.previewHtml || built.html, total: Math.max(built.total, 0.1), markers: built.markers, palette: built.palette, keepTime: !!keepTime}, PW.bgMsg(kitBg)), '*');
    }
    function changed(keepTime, skipTimeline) {
      rebuild(); save(); schedulePush(keepTime);
      errBox.replaceChildren();
      built.errors.forEach(function (m) { errBox.appendChild(h('div', {class: 'note warn', text: m})); });
      totalEl.textContent = fmt(built.total);
      linkBox.textContent = apiUrl(kit);
      if (!skipTimeline) drawTimeline(); else layoutBlocks();
      drawSummary();
    }
    function schedulePush(keepTime) {
      if (pending) { pending.keep = pending.keep && keepTime; return; }
      pending = {keep: !!keepTime};
      requestAnimationFrame(function () { var p = pending; pending = null; push(p.keep); });
    }
    function onMsg(ev) {
      if (ev.source !== frame.contentWindow || !ev.data) return;
      if (ev.data.type === 'fx-ready') { ready = true; push(false); }
      else if (ev.data.type === 'fx-time') { playhead = ev.data.t; movePlayhead(); }
    }
    window.addEventListener('message', onMsg);
    disposer = function () { window.removeEventListener('message', onMsg); window.removeEventListener('resize', onResize); };

    // ---- línea de tiempo ----
    var LABEL_W = 168, ROW_H = 38, RULER_H = 24, trackW = 600, viewEnd = 6, blocks = [], playEl = null;
    function schema(i) { var e = effects[kit.items[i].effect]; return e ? e.fx.params : {}; }
    function valOf(i, k) { var it = kit.items[i], p = schema(i)[k]; return it.params && k in it.params ? it.params[k] : p.default; }
    function setVal(i, k, v) { var it = kit.items[i]; it.params = it.params || {}; it.params[k] = v; }
    function scale() { return trackW / viewEnd; }

    function drawTimeline() {
      viewEnd = Math.max(6, Math.ceil((built ? built.total : 0) + 1));
      var W = tlBox.clientWidth || tlBox.parentElement.clientWidth || 700;
      trackW = Math.max(240, W - LABEL_W - 2);
      var sc = scale(), ruler = h('div', {class: 'kt-ruler', style: 'left:' + LABEL_W + 'px;width:' + trackW + 'px'});
      var step = viewEnd > 14 ? 2 : 1;
      for (var s = 0; s <= viewEnd; s += step) ruler.appendChild(h('span', {style: 'left:' + s * sc + 'px', text: s + 's'}));
      ruler.addEventListener('pointerdown', function (e) { seekFromEvent(e, ruler); ruler.setPointerCapture(e.pointerId); ruler.onpointermove = function (ev) { seekFromEvent(ev, ruler); }; ruler.onpointerup = function () { ruler.onpointermove = null; }; });
      blocks = [];
      var rows = kit.items.map(function (it, i) {
        var e = effects[it.effect], bi = built && built.items.filter(function (x) { return x.n === i + 1; })[0];
        var blk = h('div', {class: 'kt-block' + (i === sel ? ' on' : ''), style: 'background:' + (e ? KCOLOR[e.kind] || 'var(--acc)' : '#a33'), title: it.effect});
        var handle = h('i', {class: 'kt-h', title: 'Arrastra para cambiar la duración'});
        blk.appendChild(h('span', {class: 'kt-t', text: it.effect}));
        blk.appendChild(handle);
        var mk = h('div', {class: 'kt-mk'}); blk.appendChild(mk);
        blk.addEventListener('pointerdown', function (ev) {
          if (ev.target === handle) return;
          select(i);
          dragBlock(ev, i, blk, 'move');
        });
        handle.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); select(i); dragBlock(ev, i, blk, 'resize'); });
        blocks.push({el: blk, mk: mk, i: i});
        return h('div', {class: 'kt-row' + (i === sel ? ' on' : ''), style: 'height:' + ROW_H + 'px'},
          h('div', {class: 'kt-lab', style: 'width:' + LABEL_W + 'px', onclick: function () { select(i); }},
            h('b', {text: (i + 1) + ' · ' + (e ? e.name.split('(')[0].trim() : it.effect)}), h('span', {text: it.label || ''})),
          h('div', {class: 'kt-track', style: 'width:' + trackW + 'px'}, blk));
      });
      playEl = h('div', {class: 'kt-play', style: 'left:' + LABEL_W + 'px'});
      tlBox.replaceChildren(h('div', {class: 'kt', style: 'height:' + (RULER_H + kit.items.length * ROW_H) + 'px'}, ruler, rows, playEl));
      layoutBlocks();
    }
    function layoutBlocks() {
      var sc = scale();
      blocks.forEach(function (b) {
        var it = built && built.items.filter(function (x) { return x.n === b.i + 1; })[0]; if (!it) return;
        b.el.style.left = it.start * sc + 'px'; b.el.style.width = Math.max(10, it.duration * sc) + 'px';
        b.mk.replaceChildren();
        it.markers.forEach(function (m) { b.mk.appendChild(h('u', {title: m.label, style: 'left:' + (m.at - it.start) * sc + 'px'})); });
      });
      movePlayhead();
    }
    function movePlayhead() { if (playEl) playEl.style.left = LABEL_W + playhead * scale() + 'px'; }
    function seekFromEvent(ev, el) {
      var r = el.getBoundingClientRect(), t = Math.max(0, Math.min(viewEnd, (ev.clientX - r.left) / scale()));
      if (ready) frame.contentWindow.postMessage({type: 'seek', t: t}, '*');
    }
    function dragBlock(ev, i, blk, mode) {
      ev.preventDefault();
      var p = schema(i), x0 = ev.clientX, d0 = valOf(i, 'delay'), u0 = valOf(i, 'duration'), sc = scale();
      blk.setPointerCapture(ev.pointerId);
      blk.onpointermove = function (e2) {
        var dx = (e2.clientX - x0) / sc;
        if (mode === 'move' && p.delay) setVal(i, 'delay', round2(Math.max(p.delay.min, Math.min(p.delay.max, snap(d0 + dx, 0.05)))));
        if (mode === 'resize' && p.duration) setVal(i, 'duration', round2(Math.max(p.duration.min, Math.min(p.duration.max, snap(u0 + dx, 0.05)))));
        rebuild(); layoutBlocks(); schedulePush(true); syncControls(); drawSummary();
      };
      blk.onpointerup = function () { blk.onpointermove = null; blk.onpointerup = null; changed(true, true); };
    }

    // ---- panel del elemento seleccionado ----
    var syncs = [];
    function syncControls() { syncs.forEach(function (f) { f(); }); }
    function select(i) {
      sel = i; sessionStorage.setItem('posts-kit-sel', String(i));
      Array.prototype.forEach.call(tlBox.querySelectorAll('.kt-block'), function (b, k) { b.classList.toggle('on', k === i); });
      Array.prototype.forEach.call(tlBox.querySelectorAll('.kt-row'), function (b, k) { b.classList.toggle('on', k === i); });
      drawControls();
    }
    function assetsOf(it) { var a = assets.get(it); if (!a) { a = {}; assets.set(it, a); } return a; }
    function drawControls() {
      syncs = [];
      var it = kit.items[sel], e = it && effects[it.effect];
      if (!it) { ctlBox.replaceChildren(); return; }
      if (!e) { ctlBox.replaceChildren(h('div', {class: 'note warn', text: 'El efecto "' + it.effect + '" ya no está en el catálogo.'}), h('button', {class: 'danger', text: 'Quitar', onclick: function () { removeAt(sel); }})); return; }
      var label = h('input', {type: 'text', value: it.label || '', maxlength: 80, placeholder: 'Texto del elemento'});
      label.addEventListener('input', function () { it.label = label.value; changed(true, false); });
      var ctx = {get: function (k) { return valOf(sel, k); }, set: function (k, v) { setVal(sel, k, v); changed(true, true); }, palette: function () { return built.palette; }};
      var palette = FX.paletteOfKit(kit, brands);
      ctlBox.replaceChildren(
        h('div', {class: 'panel'}, h('h2', {text: (sel + 1) + ' · ' + e.name}),
          e.fx.label !== undefined ? h('label', {class: 'f', style: 'margin:0 0 10px'}, 'Texto', label) : null,
          Object.keys(e.fx.params).map(function (k) { var c = PW.makeControl(k, e.fx.params[k], ctx); syncs.push(c.sync); return c.el; }),
          h('div', {class: 'actions'},
            h('button', {text: '↑ Subir', title: 'Se apila antes (queda debajo)', disabled: sel === 0, onclick: function () { move(-1); }}),
            h('button', {text: '↓ Bajar', title: 'Se apila después (queda encima)', disabled: sel === kit.items.length - 1, onclick: function () { move(1); }}),
            h('button', {text: 'Duplicar', onclick: function () { kit.items.splice(sel + 1, 0, JSON.parse(JSON.stringify(it))); sel++; full(); }}),
            h('button', {class: 'danger', text: 'Quitar', onclick: function () { removeAt(sel); }}))),
        h('h2', {text: 'Elementos de la vista previa'}),
        PW.elementsPanel(e, {kit: true, get: function () { return it.elements || (it.elements = {}); }, set: function (all) { it.elements = all; changed(true, true); },
          assets: assetsOf(it), onAsset: function () { changed(true, true); }}) || null);
      void palette;
    }
    function move(d) { var j = sel + d; if (j < 0 || j >= kit.items.length) return; var t = kit.items[sel]; kit.items[sel] = kit.items[j]; kit.items[j] = t; sel = j; full(); }
    function removeAt(i) { kit.items.splice(i, 1); if (!kit.items.length) { save(); render(); return; } sel = Math.min(sel, kit.items.length - 1); full(); }
    function full() { sessionStorage.setItem('posts-kit-sel', String(sel)); changed(false, false); drawControls(); }

    // ---- resumen y exportación ----
    function drawSummary() {
      if (!built) return;
      sumBox.replaceChildren(h('table', null, h('thead', null, h('tr', null, h('th', {text: '#'}), h('th', {text: 'Efecto'}), h('th', {text: 'Texto'}), h('th', {text: 'Empieza'}), h('th', {text: 'Termina'}))),
        h('tbody', null, built.items.map(function (it) { return h('tr', {class: 'postrow'}, h('td', {text: String(it.n)}), h('td', null, h('a', {href: '#/efecto/' + it.effect, style: 'color:var(--acc)', text: it.effect})), h('td', {text: it.element ? it.label : '—'}), h('td', {class: 'mono', text: fmt(it.start)}), h('td', {class: 'mono', text: fmt(it.end)})); }))),
        built.markers.length ? h('div', {class: 'note', style: 'margin-top:10px'}, built.markers.map(function (m) { return h('div', null, h('b', {text: fmt(m.at)}), ' — ' + m.label + ' (' + m.effect + ')'); })) : null);
    }
    function download() {
      var blob = new Blob([FX.pageHtml(built)], {type: 'text/html'}), a = h('a', {href: URL.createObjectURL(blob), download: (kit.name || 'kit').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.html'});
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }
    var allCode = function () { return '/* ' + built.name + ' — CSS (una vez) */\n' + built.css + '\n<!-- ' + built.name + ' — HTML (orden de apilado: el último queda encima) -->\n' + built.html + '\n'; };
    var promptText = function () { return 'Aplica este kit de efectos en mi pieza. Lee ' + apiUrl(kit) + ' (JSON con code.css, code.html y el inicio de cada efecto en items[].start; también explica cómo integrarlo). Cada efecto debe empezar en los segundos indicados; sustituye los textos de ejemplo por los de mi pieza.'; };

    // ---- cabecera: nombre y paleta ----
    var nameIn = h('input', {type: 'text', value: kit.name || '', maxlength: 80, placeholder: 'Nombre del kit'});
    nameIn.addEventListener('input', function () { kit.name = nameIn.value; rebuild(); save(); });
    var palVal = typeof kit.palette === 'string' && brands[kit.palette] ? kit.palette : (typeof kit.palette === 'object' && kit.palette ? 'custom' : (brandIds[0] || 'custom'));
    var custom = typeof kit.palette === 'object' && kit.palette ? kit.palette : {dark: '#14181c', light: '#f4f1ea', accent: '#c46a2b'};
    var palSel = h('select', {class: 'in'}, brandIds.map(function (b) { return h('option', {value: b, text: brands[b].name}); }).concat([h('option', {value: 'custom', text: 'Personalizada…'})]));
    palSel.value = palVal;
    var customBox = h('div', {class: 'rg', style: 'margin-top:8px;display:' + (palVal === 'custom' ? '' : 'none')}, ['dark', 'light', 'accent'].map(function (k) {
      var inp = h('input', {type: 'color', value: custom[k], title: {dark: 'Oscuro', light: 'Claro', accent: 'Acento'}[k]});
      inp.addEventListener('input', function () { custom[k] = inp.value; kit.palette = {dark: custom.dark, light: custom.light, accent: custom.accent}; changed(true, true); syncControls(); });
      return inp;
    }));
    palSel.addEventListener('change', function () {
      customBox.style.display = palSel.value === 'custom' ? '' : 'none';
      kit.palette = palSel.value === 'custom' ? {dark: custom.dark, light: custom.light, accent: custom.accent} : palSel.value;
      changed(true, true); syncControls();
    });
    if (!kit.palette || (typeof kit.palette === 'string' && !brands[kit.palette])) kit.palette = palVal === 'custom' ? {dark: custom.dark, light: custom.light, accent: custom.accent} : palVal;

    function onResize() { drawTimeline(); }
    window.addEventListener('resize', onResize);

    app.replaceChildren(
      h('h1', {text: 'Kit'}), kitBar(),
      h('p', {class: 'sub'}, 'Arrastra los bloques para cambiar cuándo empieza cada efecto y estira el borde derecho para cambiar su duración. Todo se guarda en este navegador. Duración total: ', totalEl),
      h('div', {class: 'detail', style: 'grid-template-columns:340px 1fr'},
        h('div', {class: 'stagebox'}, frame,
          h('label', {class: 'f', style: 'margin-top:10px'}, 'Nombre del kit', nameIn),
          h('div', {class: 'bar', style: 'margin-top:10px'}, 'Paleta', palSel), customBox, PW.bgControl(kitBg, function () { schedulePush(true); })),
        h('div', null,
          errBox,
          h('div', {class: 'panel', style: 'padding:12px 12px 14px'}, h('h2', {text: 'Línea de tiempo'}), tlBox),
          ctlBox,
          h('h2', {text: 'Resumen'}), sumBox,
          h('h2', {text: 'Paquete'}),
          h('div', {class: 'actions', style: 'margin:0 0 8px'},
            h('button', {class: 'primary', text: 'Copiar código (CSS + HTML)', onclick: function () { copy(allCode(), 'Código copiado'); }}),
            h('button', {text: 'Descargar kit.html', onclick: download}),
            h('button', {text: 'Copiar JSON', onclick: function () { copy(JSON.stringify({name: built.name, palette: built.palette, totalSeconds: built.total, items: built.items.map(function (i) { return {effect: i.effect, label: i.label, elements: i.elements, start: i.start, duration: i.duration, values: i.values}; })}, null, 2), 'JSON copiado'); }})),
          h('h2', {text: 'Para tu agente'}),
          h('p', {style: 'color:var(--mut);margin:0 0 8px;font-size:13px', text: 'Esta URL devuelve el kit compuesto en JSON (código listo, tiempos y marcadores). Pégala en el prompt de Claude.'}), linkBox,
          h('div', {class: 'actions'},
            h('button', {text: 'Copiar prompt para Claude', onclick: function () { copy(promptText(), 'Prompt copiado'); }}),
            h('button', {text: 'Copiar URL de la API', onclick: function () { copy(apiUrl(kit), 'URL copiada'); }}),
            h('button', {text: 'Copiar enlace del kit', onclick: function () { copy(kitUrl(kit), 'Enlace copiado'); }})),
          h('div', {class: 'actions', style: 'margin-top:22px'}, h('button', {class: 'danger', text: 'Vaciar kit', onclick: function () { if (confirm('¿Quitar todos los elementos del kit?')) { store.set({name: kit.name, palette: kit.palette, items: []}); render(); } }})))));

    changed(false, false);
    drawControls();
    requestAnimationFrame(drawTimeline);
  }

  window.KitUI = {render: render};
})();
