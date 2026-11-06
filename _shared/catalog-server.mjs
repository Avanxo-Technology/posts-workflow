// Servidor local de la UI del catálogo (`posts catalog`). Sin dependencias; solo escucha en 127.0.0.1 y solo lee.
// Lee los JSON del catálogo en cada petición: lo que Claude edite aparece al recargar la página.
import {createServer} from 'node:http';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCatalog} from './catalog.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const UI = join(HERE, 'catalog-ui');
const STATIC = {'/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css']};
const readIf = p => (existsSync(p) ? readFileSync(p, 'utf8') : null);

function brandsOf(TOOL) {
  const out = {}, dir = join(TOOL, 'brands');
  for (const f of existsSync(dir) ? readdirSync(dir) : []) {
    if (!f.endsWith('.json')) continue;
    try { const b = JSON.parse(readFileSync(join(dir, f), 'utf8')); out[f.slice(0, -5)] = {id: f.slice(0, -5), name: b.name || f.slice(0, -5), dark: b.dark, light: b.light, accent: b.accent}; } catch { /* marca ilegible: se omite */ }
  }
  return out;
}

const kfList = css => [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]);

export function catalogData(TOOL, POSTS) {
  const c = loadCatalog(TOOL);
  const effects = [...c.effects.values()].map(e => {
    const snipName = e.snippet || null;
    const snippet = snipName ? readIf(join(e.dir, snipName)) : null;
    const hasDemoFile = existsSync(join(e.dir, 'demo.html'));
    const kfs = snippet && snipName.endsWith('.css') ? kfList(snippet) : [];
    const {dir, uses, demo: cfg = {}, ...meta} = e;
    return {
      ...meta, md: readIf(join(e.dir, 'effect.md')) || '', snippetName: snipName, snippet,
      demo: hasDemoFile ? {type: 'file', variants: []} : kfs.length ? {type: 'auto', variants: cfg.variants || kfs, duration: cfg.duration} : null,
      uses,
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
  const posts = c.posts.map(p => ({...p, localPath: POSTS && p.path && existsSync(join(POSTS, p.path)) ? join(POSTS, p.path) : null}))
    .sort((a, b) => a.id.localeCompare(b.id));
  return {effects, posts, brands: brandsOf(TOOL), errors: c.errors};
}

// ---------- demo en vivo ----------
const esc = s => String(s).replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[ch]));
function mix(a, b, k) { // mezcla de dos #rrggbb
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  if (!/^#[0-9a-f]{6}$/i.test(a || '') || !/^#[0-9a-f]{6}$/i.test(b || '')) return a || '#111';
  const x = p(a), y = p(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join('');
}

export function demoHtml(e, brand, variant, ui) {
  const dark = brand?.dark || '#14181c', light = brand?.light || '#f4f1ea', accent = brand?.accent || '#c46a2b';
  const css = e.snippetName?.endsWith('.css') ? (e.snippet || '') : '';
  const kfs = kfList(css), variants = e.demo?.variants?.length ? e.demo.variants : kfs;
  const v = variants.includes(variant) ? variant : variants[0];
  const def = (css.match(new RegExp('@keyframes\\s+' + v + '\\s*\\{[\\s\\S]*?\\}\\s*\\}')) || [''])[0];
  const centered = def.includes('translate(-50%');
  const dur = e.demo?.duration || (e.kind === 'loop' ? 1.2 : e.kind === 'camera' ? 3 : e.kind === 'transition' ? 0.9 : 0.9);
  const infinite = e.kind === 'loop' || e.kind === 'camera';
  const full = e.kind === 'transition' || e.kind === 'overlay';
  const hasClip = /\.clip\b/.test(css);
  const label = esc(e.name.split('(')[0].trim().slice(0, 18).toUpperCase());
  const sample = full ? `<div id="s" class="full">${label}</div>`
    : e.kind === 'camera' ? `<div class="photo"><div id="s" class="pic"></div></div>`
    : hasClip ? `<div class="clip" style="position:absolute;left:160px;top:780px;width:760px"><span id="s" class="card" style="display:block;position:relative;left:0;top:0">${label}</span></div>`
    : `<div id="s" class="card${centered ? ' c' : ''}">${label}</div>`;
  const anim = `${v} ${dur}s ${e.kind === 'camera' ? 'ease-in-out' : 'cubic-bezier(.2,.8,.2,1)'} ${infinite ? 'infinite' + (e.kind === 'camera' ? ' alternate' : '') : 'both'}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:#0b0d10;overflow:hidden;font-family:system-ui,sans-serif}
#fit{position:absolute;left:0;top:0;width:1080px;height:1920px;transform-origin:0 0}
#stage{position:absolute;inset:0;overflow:hidden;background:radial-gradient(70% 40% at 50% 38%,${mix(dark, accent, .28)},${dark} 70%)}
.card{position:absolute;left:160px;top:780px;width:760px;height:360px;border-radius:44px;background:${accent};color:${light};display:flex;align-items:center;justify-content:center;font:900 112px/1 system-ui,sans-serif;letter-spacing:-.03em;--r:-3deg;box-shadow:0 50px 80px rgba(0,0,0,.45)}
.card.c{left:540px;top:960px}
.full{position:absolute;inset:0;background:${accent};color:${light};display:flex;align-items:center;justify-content:center;font:900 150px/1 system-ui,sans-serif;letter-spacing:-.03em;--r:0deg}
.photo{position:absolute;left:90px;top:260px;width:900px;height:1400px;overflow:hidden;border-radius:40px;background:#000}
.pic{position:absolute;inset:0;--r:0deg;background:repeating-linear-gradient(45deg,${mix(dark, light, .1)} 0 60px,${mix(dark, accent, .45)} 60px 120px),linear-gradient(${accent},${dark});background-blend-mode:normal}
.pic:after{content:"";position:absolute;left:30%;top:35%;width:40%;height:30%;border-radius:50%;background:${light};opacity:.85}
${css}
#s{animation:${anim}}
#ui{position:absolute;left:0;right:0;bottom:0;display:${ui ? 'flex' : 'none'};gap:6px;flex-wrap:wrap;padding:8px;background:rgba(0,0,0,.55);font:12px system-ui;z-index:9}
#ui a{color:#cfd3d8;text-decoration:none;padding:3px 9px;border-radius:99px;background:#272c33}
#ui a.on{background:${accent};color:#fff}
</style></head><body><div id="fit"><div id="stage">${sample}</div></div>
<div id="ui">${variants.length > 1 ? variants.map(n => `<a href="?brand=${esc(brand?.id || '')}&v=${esc(n)}&ui=1" class="${n === v ? 'on' : ''}">${esc(n)}</a>`).join('') : ''}</div>
<script>
var fit=document.getElementById('fit'),s=document.getElementById('s');
function sz(){var k=Math.min(innerWidth/1080,innerHeight/1920);fit.style.transform='scale('+k+')';fit.style.left=(innerWidth-1080*k)/2+'px';fit.style.top=(innerHeight-1920*k)/2+'px'}
addEventListener('resize',sz);sz();
${infinite ? '' : `function replay(){s.style.animation='none';void s.offsetWidth;s.style.animation='';}
setInterval(replay,${Math.round((dur + 1.1) * 1000)});`}
</script></body></html>`;
}

export function startCatalogServer({TOOL, POSTS, port = 4747, host = '127.0.0.1'}) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const send = (code, type, body) => { res.writeHead(code, {'content-type': type + '; charset=utf-8', 'cache-control': 'no-store'}); res.end(body); };
    try {
      if (STATIC[url.pathname]) { const [f, t] = STATIC[url.pathname]; return send(200, t, readFileSync(join(UI, f))); }
      if (url.pathname === '/api/catalog') return send(200, 'application/json', JSON.stringify(catalogData(TOOL, POSTS)));
      const dm = /^\/demo\/([\w-]+)$/.exec(url.pathname);
      if (dm) {
        const data = catalogData(TOOL, POSTS), e = data.effects.find(x => x.id === dm[1]);
        if (!e || !e.demo) return send(404, 'text/plain', 'Este efecto no tiene demo en vivo');
        if (e.demo.type === 'file') return send(200, 'text/html', readFileSync(join(TOOL, 'catalog', 'effects', e.id, 'demo.html')));
        const b = url.searchParams.get('brand'), brand = data.brands[b] || data.brands[e.brands?.[0]];
        return send(200, 'text/html', demoHtml(e, brand, url.searchParams.get('v'), url.searchParams.get('ui') === '1'));
      }
      send(404, 'text/plain', 'No encontrado');
    } catch (err) { send(500, 'text/plain', 'Error: ' + err.message); }
  });
  return new Promise((resolve, reject) => {
    let p = port, tries = 0;
    server.on('error', er => { if (er.code === 'EADDRINUSE' && tries++ < 20) server.listen(++p, host); else reject(er); });
    server.on('listening', () => resolve({server, url: `http://${host}:${p}/`}));
    server.listen(p, host);
  });
}
