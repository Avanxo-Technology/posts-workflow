// Emulador local del hosting: sirve <dir>/public como archivos estáticos y delega /api/v1/* y /llms.txt en la función generada (<dir>/lib).
// Como los hostings reales, un archivo estático existente tiene prioridad sobre la función.
import {createServer} from 'node:http';
import {existsSync, readFileSync, statSync} from 'node:fs';
import {extname, join, normalize, resolve, sep} from 'node:path';
import {pathToFileURL} from 'node:url';

const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.png': 'image/png'};

export async function serveSite({dir, port = 4748, host = '127.0.0.1'}) {
  dir = resolve(dir);
  const pub = join(dir, 'public');
  if (!existsSync(join(pub, 'index.html')) || !existsSync(join(dir, 'lib', 'api-core.mjs'))) throw new Error(`"${dir}" no parece un build (ejecuta antes: posts site build)`);
  const imp = f => import(pathToFileURL(join(dir, 'lib', f)).href);
  const [{createApi}, {default: FX}, {default: data}] = await Promise.all([imp('api-core.mjs'), imp('fx-core.mjs'), imp('data.mjs')]);
  const api = createApi({getBundle: () => data, FX});

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      let path = decodeURIComponent(url.pathname);
      if (path.endsWith('/')) path += 'index.html';
      const file = normalize(join(pub, path));
      if (path === '/_headers' || path === '/_redirects') { res.writeHead(404); return res.end('No encontrado'); }   // configuración del hosting, no se sirve
      if (file.startsWith(pub + sep) && existsSync(file) && statSync(file).isFile()) {
        res.writeHead(200, {'content-type': (TYPES[extname(file)] || 'application/octet-stream') + '; charset=utf-8', 'x-content-type-options': 'nosniff'});
        return res.end(readFileSync(file));
      }
      const r = await api(new Request(url.href, {method: req.method}));
      if (r) { const h = {}; r.headers.forEach((v, k) => { h[k] = v; }); res.writeHead(r.status, h); return res.end(Buffer.from(await r.arrayBuffer())); }
      res.writeHead(404, {'content-type': 'text/plain; charset=utf-8'}); res.end('No encontrado');
    } catch (e) { res.writeHead(500, {'content-type': 'text/plain; charset=utf-8'}); res.end('Error: ' + e.message); }
  });
  return new Promise((ok, fail) => {
    let p = port, tries = 0;
    server.on('error', er => { if (er.code === 'EADDRINUSE' && tries++ < 20) server.listen(++p, host); else fail(er); });
    server.on('listening', () => ok({server, url: `http://${host}:${p}/`}));
    server.listen(p, host);
  });
}
