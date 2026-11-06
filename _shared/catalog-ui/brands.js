// Vista de marcas: lista, alta, edición (ficha, design.md, notas, logos) y vista previa en vivo.
(function () {
  'use strict';
  var PW = window.PW, h = PW.h, toast = PW.toast, copy = PW.copy, app = PW.app;
  var TOKEN = (document.querySelector('meta[name=posts-token]') || {}).content || '';

  function api(method, url, body, headers) {
    var opt = {method: method, headers: Object.assign({'x-posts-token': TOKEN}, headers || {})};
    if (body !== undefined) {
      if (body instanceof Blob || body instanceof ArrayBuffer) opt.body = body;
      else { opt.body = JSON.stringify(body); opt.headers['content-type'] = 'application/json'; }
    }
    return fetch(url, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || 'Error ' + r.status);
        return j;
      });
    });
  }
  function fail(e) { toast(e.message || String(e)); }
  var HEX = /^#[0-9a-fA-F]{6}$/;
  var slug = function (s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 28); };
  var fontsUrl = function (head, body) {
    var gf = function (n) { return 'family=' + encodeURIComponent(n).replace(/%20/g, '+') + ':wght@400;700'; };
    var names = head === body ? [head] : [head, body];
    return 'https://fonts.googleapis.com/css2?' + names.map(gf).join('&') + '&display=swap';
  };

  // ---- campos ----
  function textField(label, value, onInput, opts) {
    opts = opts || {};
    var inp = h('input', {type: opts.type || 'text', value: value || '', placeholder: opts.placeholder || '', maxlength: opts.max || 120, autocomplete: 'off'});
    inp.addEventListener('input', function () { onInput(inp.value); });
    return h('label', {class: 'f' + (opts.full ? ' full' : '')}, label, inp);
  }
  function colorField(label, value, onInput) {
    var c = h('input', {type: 'color', value: HEX.test(value) ? value : '#000000'}), t = h('input', {type: 'text', value: value, maxlength: 7, autocomplete: 'off'});
    c.addEventListener('input', function () { t.value = c.value; onInput(c.value); });
    t.addEventListener('input', function () { if (HEX.test(t.value)) { c.value = t.value; onInput(t.value); } });
    return h('label', {class: 'f'}, label, h('div', {class: 'colorf'}, c, t));
  }

  // ---- vista previa en vivo ----
  function previewBox(state) {
    var frame = h('iframe', {src: '/preview.html', title: 'Vista previa de la marca'}), ready = false, timer = null;
    function push() {
      if (!ready) return;
      clearTimeout(timer);
      timer = setTimeout(function () {
        var s = {name: state.name, short: state.short, dark: state.dark, light: state.light, accent: state.accent, headFont: state.headFont, bodyFont: state.bodyFont,
          fontsUrl: state.headFont && state.bodyFont ? fontsUrl(state.headFont, state.bodyFont) : '', logo: state.logo || '', web: state.web, whatsapp: state.whatsapp};
        frame.contentWindow.postMessage({type: 'brand', state: s}, location.origin);
      }, 120);
    }
    function onMsg(e) { if (e.origin === location.origin && e.data && e.data.type === 'preview-ready' && e.source === frame.contentWindow) { ready = true; push(); } }
    window.addEventListener('message', onMsg);
    var box = h('div', {class: 'previewbox'}, h('h2', {text: 'Vista previa', style: 'margin-top:0'}), frame,
      h('p', {class: 'hint', style: 'color:var(--mut);font-size:12px;margin:8px 0 0', text: 'Ejemplo de pieza con tu paleta (izquierda, fondo oscuro; derecha, fondo claro). Si una fuente no carga, su nombre no existe en Google Fonts.'}));
    return {el: box, push: push, dispose: function () { window.removeEventListener('message', onMsg); }};
  }
  var disposeCurrent = null;
  function mount(nodes) { if (disposeCurrent) { disposeCurrent(); disposeCurrent = null; } app.replaceChildren.apply(app, nodes); }

  // ---- lista ----
  function viewList() {
    api('GET', '/api/brands').then(function (list) {
      mount([
        h('div', {style: 'display:flex;justify-content:space-between;align-items:flex-start;gap:12px'},
          h('div', null, h('h1', {text: 'Marcas'}), h('p', {class: 'sub', text: list.length + ' marcas. Configura su identidad, su design.md y sus logos; lo que guardes queda en el repo (brands/).'})),
          h('a', {href: '#/marca-nueva'}, h('button', {class: 'primary', text: '+ Nueva marca'}))),
        h('div', {class: 'bgrid'}, list.map(function (b) {
          return h('a', {class: 'bcard', href: '#/marca/' + b.id},
            h('div', {class: 'sw'}, [b.dark, b.light, b.accent].map(function (c) { return h('i', {style: 'background:' + c}); })),
            h('div', {class: 'meta'}, h('div', {class: 'nm', style: 'font-weight:700', text: b.name}), h('div', {class: 'id mono', style: 'color:var(--mut);font-size:12px', text: b.id}),
              h('div', {style: 'color:var(--mut);font-size:12px;margin-top:4px', text: b.headFont + ' + ' + b.bodyFont}),
              h('div', {class: 'badges'},
                h('span', {class: 'badge' + (b.hasDesign ? ' ok' : ''), text: b.hasDesign ? 'design.md ✓' : b.externalDesign ? 'diseño externo' : 'sin design.md'}),
                h('span', {class: 'badge' + (b.logos ? ' ok' : ''), text: b.logos + ' logos'}),
                h('span', {class: 'badge', text: b.generated ? 'plantilla generada' : 'plantilla propia'}))));
        }))]);
    }).catch(fail);
  }

  // ---- nueva marca ----
  function viewNew() {
    var st = {id: '', name: '', short: '', dark: '#1A1A2E', light: '#F5F5F5', accent: '#E94560', headFont: 'Montserrat', bodyFont: 'Inter', web: '', whatsapp: '', email: ''};
    var idTouched = false, idInp, pv = previewBox(st);
    idInp = h('input', {type: 'text', maxlength: 29, placeholder: 'mimarca', autocomplete: 'off'});
    idInp.addEventListener('input', function () { idTouched = true; st.id = idInp.value; });
    var nameF = textField('Nombre de la marca', '', function (v) { st.name = v; if (!idTouched) { st.id = slug(v); idInp.value = st.id; } pv.push(); }, {max: 80});
    var save = h('button', {class: 'primary', text: 'Crear marca', onclick: function () {
      save.disabled = true;
      api('POST', '/api/brands', {id: st.id, name: st.name, short: st.short, dark: st.dark, light: st.light, accent: st.accent, head: st.headFont, body: st.bodyFont, web: st.web, wa: st.whatsapp, email: st.email})
        .then(function () { toast('Marca creada'); location.hash = '#/marca/' + st.id; }).catch(function (e) { save.disabled = false; fail(e); });
    }});
    mount([h('a', {class: 'back', href: '#/marcas', text: '← Marcas'}), h('h1', {text: 'Nueva marca'}),
      h('p', {class: 'sub', text: 'Se crea la plantilla de video con tus colores y fuentes, y el sonido sintetizado. Luego completas el design.md y los logos.'}),
      h('div', {class: 'detail', style: 'grid-template-columns:1fr 470px'},
        h('div', null, h('div', {class: 'panel'}, h('div', {class: 'form'},
          nameF, h('label', {class: 'f'}, 'Id (minúsculas y guiones)', idInp),
          textField('Sigla (opcional)', '', function (v) { st.short = v; pv.push(); }, {max: 30}),
          textField('Web', '', function (v) { st.web = v; pv.push(); }),
          colorField('Color oscuro', st.dark, function (v) { st.dark = v; pv.push(); }),
          colorField('Color claro', st.light, function (v) { st.light = v; pv.push(); }),
          colorField('Color de acento', st.accent, function (v) { st.accent = v; pv.push(); }),
          textField('Fuente de títulos (Google Fonts)', st.headFont, function (v) { st.headFont = v; pv.push(); }, {max: 38}),
          textField('Fuente de texto (Google Fonts)', st.bodyFont, function (v) { st.bodyFont = v; pv.push(); }, {max: 38}),
          textField('WhatsApp', '', function (v) { st.whatsapp = v; pv.push(); }, {max: 40}),
          textField('Correo (opcional)', '', function (v) { st.email = v; }, {type: 'email'})),
          h('div', {class: 'actions'}, save))),
        pv.el)]);
    disposeCurrent = pv.dispose;
  }

  // ---- editor ----
  function viewBrand(id) {
    api('GET', '/api/brands/' + id).then(function (b) {
      var c = b.contact || {};
      var st = {name: b.name, short: b.short || '', dark: b.dark, light: b.light, accent: b.accent, headFont: b.headFont, bodyFont: b.bodyFont || 'Inter',
        web: c.web || '', whatsapp: c.whatsapp || '', phone: c.phone || '', email: c.email || '', logo: b.logos.length ? '/api/brands/' + id + '/logos/' + b.logos[0].file + '?t=' + Date.now() : ''};
      var pv = previewBox(st), regen = h('input', {type: 'checkbox'});
      regen.checked = b.generated;
      var reload = function () { viewBrand(id); };

      // Ficha
      var fichaSave = h('button', {class: 'primary', text: 'Guardar ficha', onclick: function () {
        api('PUT', '/api/brands/' + id, {name: st.name, short: st.short, dark: st.dark, light: st.light, accent: st.accent, headFont: st.headFont, bodyFont: st.bodyFont,
          contact: {whatsapp: st.whatsapp, phone: st.phone, email: st.email, web: st.web}, regenerate: b.generated && regen.checked})
          .then(function (r) { toast(r.regenerated ? 'Ficha guardada y plantilla de video regenerada' : 'Ficha guardada'); }).catch(fail);
      }});
      var ficha = h('div', {class: 'panel'}, h('h2', {text: 'Identidad y contacto'}), h('p', {class: 'hint', text: 'Colores, fuentes y datos de contacto. Se guardan en brands/' + id + '.json.'}),
        h('div', {class: 'form'},
          textField('Nombre', st.name, function (v) { st.name = v; pv.push(); }, {max: 80}), textField('Sigla', st.short, function (v) { st.short = v; pv.push(); }, {max: 30}),
          colorField('Color oscuro', st.dark, function (v) { st.dark = v; pv.push(); }), colorField('Color claro', st.light, function (v) { st.light = v; pv.push(); }),
          colorField('Color de acento', st.accent, function (v) { st.accent = v; pv.push(); }), h('div'),
          textField('Fuente de títulos', st.headFont, function (v) { st.headFont = v; pv.push(); }, {max: 38}), textField('Fuente de texto', st.bodyFont, function (v) { st.bodyFont = v; pv.push(); }, {max: 38}),
          textField('WhatsApp', st.whatsapp, function (v) { st.whatsapp = v; pv.push(); }, {max: 40}), textField('Teléfono', st.phone, function (v) { st.phone = v; }, {max: 40}),
          textField('Correo', st.email, function (v) { st.email = v; }, {type: 'email'}), textField('Web', st.web, function (v) { st.web = v; pv.push(); })),
        b.generated
          ? h('label', {class: 'note', style: 'display:flex;gap:8px;align-items:flex-start'}, regen, h('span', null, 'Regenerar la plantilla de video con estos cambios (reescribe ', h('code', {text: 'brands/' + id + '/_shared/video-template.html'}), '). Las piezas ya creadas no cambian: son copias.'))
          : h('div', {class: 'note warn', text: 'Esta marca tiene plantilla de video hecha a mano. Los cambios de color y fuente afectan a la ficha y a la vista previa, pero no se aplican solos a la plantilla ni a las piezas existentes.'}),
        h('div', {class: 'actions'}, fichaSave));

      // design.md
      var ta = h('textarea', {placeholder: '# Sistema de diseño de la marca\n\nColores, tipografía, tono, reglas de composición…', spellcheck: 'false'});
      ta.value = b.design || '';
      var fileIn = h('input', {type: 'file', accept: '.md,.markdown,.txt,text/markdown,text/plain'});
      fileIn.addEventListener('change', function () {
        var f = fileIn.files[0]; if (!f) return;
        if (f.size > 512 * 1024) { toast('El archivo supera 512 KB'); return; }
        var rd = new FileReader(); rd.onload = function () { ta.value = String(rd.result); toast('Archivo cargado: revisa y pulsa Guardar'); }; rd.readAsText(f);
      });
      var design = h('div', {class: 'panel'}, h('h2', {text: 'design.md'}),
        h('p', {class: 'hint', text: 'Guía de diseño de la marca. Se guarda en el repo (brands/' + id + '/design.md) y Claude la usa al crear piezas. No incluyas claves ni tokens.'}),
        b.externalDesign ? h('div', {class: 'note', text: 'Hay una ruta de diseño externa configurada: ' + b.externalDesign + (b.design ? '. Mientras exista el design.md de aquí, se usa este.' : '. Si guardas uno aquí, pasa a usarse este.')}) : null,
        h('div', {class: 'actions', style: 'margin:0 0 10px'}, h('span', {style: 'color:var(--mut);font-size:13px', text: 'Subir archivo:'}), fileIn), ta,
        h('div', {class: 'actions'},
          h('button', {class: 'primary', text: 'Guardar design.md', onclick: function () { api('PUT', '/api/brands/' + id + '/design', {text: ta.value}).then(function () { toast('design.md guardado'); }).catch(fail); }}),
          b.design ? h('button', {class: 'danger', text: 'Quitar design.md', onclick: function () { if (confirm('¿Quitar brands/' + id + '/design.md del repo local?')) api('DELETE', '/api/brands/' + id + '/design').then(function () { toast('design.md quitado'); reload(); }).catch(fail); }}) : null));

      // notas
      var nta = h('textarea', {spellcheck: 'false', style: 'min-height:260px'}); nta.value = b.notes || '';
      var notes = h('div', {class: 'panel'}, h('h2', {text: 'Notas de la marca'}),
        h('p', {class: 'hint', text: 'brands/' + id + '.md: contacto, caption de cierre, contenido típico, marcas aliadas, reglas. Es lo primero que lee Claude de la marca.'}), nta,
        h('div', {class: 'actions'}, h('button', {class: 'primary', text: 'Guardar notas', onclick: function () { api('PUT', '/api/brands/' + id + '/notes', {text: nta.value}).then(function () { toast('Notas guardadas'); }).catch(fail); }})));

      // logos
      var nameIn = h('input', {type: 'text', list: 'logo-names', value: b.logos.length ? '' : 'blanco', placeholder: 'blanco, oscuro, simbolo…', maxlength: 40, autocomplete: 'off', style: 'width:200px'});
      var lfile = h('input', {type: 'file', accept: '.png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml'});
      var logoDiv = h('div', {class: 'panel'}, h('h2', {text: 'Logos'}),
        h('p', {class: 'hint', text: 'PNG, JPG, WEBP o SVG simple, hasta 2 MB. Se guardan en brands/' + id + '/logos/ (en el repo): sube solo logos que tengas derecho a compartir.'}),
        h('datalist', {id: 'logo-names'}, ['blanco', 'oscuro', 'simbolo', 'color', 'horizontal'].map(function (n) { return h('option', {value: n}); })),
        h('div', {class: 'actions', style: 'margin:0'}, nameIn, lfile, h('button', {class: 'primary', text: 'Subir logo', onclick: function () {
          var f = lfile.files[0]; if (!f) { toast('Elige un archivo'); return; }
          var ext = (f.name.split('.').pop() || '').toLowerCase();
          api('POST', '/api/brands/' + id + '/logos', f, {'x-logo-name': nameIn.value.trim().toLowerCase(), 'x-logo-ext': ext, 'content-type': 'application/octet-stream'})
            .then(function (r) { toast('Logo subido: ' + r.file); reload(); }).catch(fail);
        }})),
        b.logos.length ? h('div', {class: 'logos'}, b.logos.map(function (l) {
          var src = '/api/brands/' + id + '/logos/' + l.file + '?t=' + Date.now();
          return h('div', {class: 'logo-item'},
            h('div', {class: 'bgs'}, h('div', {style: 'background:' + st.dark}, h('img', {src: src, alt: l.file})), h('div', {style: 'background:' + st.light}, h('img', {src: src, alt: l.file}))),
            h('div', {class: 'cap'}, h('span', {class: 'mono', text: l.file}), h('button', {class: 'danger', text: 'Quitar', onclick: function () { if (confirm('¿Quitar ' + l.file + '?')) api('DELETE', '/api/brands/' + id + '/logos/' + l.file).then(reload).catch(fail); }})));
        })) : h('div', {class: 'sub', style: 'margin:12px 0 0', text: 'Aún no hay logos.'}));

      var cmd = 'git add brands/' + id + '.* brands/' + id + '/ && git commit -m "marca ' + id + '" && git push';
      var share = h('div', {class: 'panel'}, h('h2', {text: 'Compartir con el equipo'}),
        h('p', {class: 'hint', text: 'Los cambios se guardan en tu copia del repo. Para que los vea el resto, hay que hacer commit y push (la UI no publica nada por su cuenta).'}),
        h('div', {class: 'cmd', text: cmd}), h('div', {class: 'actions'}, h('button', {text: 'Copiar comando', onclick: function () { copy(cmd, 'Comando copiado'); }})));

      mount([h('a', {class: 'back', href: '#/marcas', text: '← Marcas'}),
        h('h1', {text: b.name}), h('p', {class: 'sub'}, h('code', {text: id}), b.generated ? ' · plantilla de video generada' : ' · plantilla de video propia'),
        h('div', {class: 'detail', style: 'grid-template-columns:1fr 470px'}, h('div', null, ficha, design, notes, logoDiv, share), pv.el)]);
      disposeCurrent = pv.dispose;
    }).catch(function (e) { mount([h('a', {class: 'back', href: '#/marcas', text: '← Marcas'}), h('div', {class: 'empty', text: e.message})]); });
  }

  window.BrandsUI = {
    render: function (parts) {
      if (parts[0] === 'marca-nueva') return viewNew();
      if (parts[0] === 'marca' && parts[1]) return viewBrand(decodeURIComponent(parts[1]));
      viewList();
    },
  };
})();
