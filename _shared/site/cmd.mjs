import {join, resolve} from 'node:path';
import {buildSite} from './build.mjs';
import {serveSite} from './serve.mjs';

// posts site build [--out dist] [--base https://mi-sitio.com]   |   posts site serve [--dir dist] [--port 4748]
export async function cmdSite(args, {TOOL, die, flag}) {
  const [sub, ...rest] = args;
  if (sub === 'build') {
    const out = flag(rest, '--out') || join(TOOL, 'dist'), base = flag(rest, '--base') || '';
    if (base && !/^https?:\/\/[^\s/]+$/.test(base.replace(/\/+$/, ''))) die('--base debe ser un origen como https://mi-sitio.com');
    let r;
    try { r = await buildSite({TOOL, out, base}); } catch (e) { die(e.message); }
    console.log(`✓ Sitio generado en ${r.out}\n  ${r.effects} efectos · ${r.demos} miniaturas · ${r.apiFiles} JSON de la API\n  Probarlo: posts site serve --dir ${r.out}\n  Publicarlo: ver ${join(r.out, 'README.md')}`);
    return;
  }
  if (sub === 'serve') {
    const dir = resolve(flag(rest, '--dir') || join(TOOL, 'dist')), port = flag(rest, '--port');
    let r;
    try { r = await serveSite({dir, port: port ? parseInt(port, 10) : 4748}); } catch (e) { die(e.message); }
    console.log(`Sitio (emulando el hosting) en ${r.url}  ·  Ctrl+C para cerrar`);
    return;
  }
  console.log('Uso: posts site build [--out dist] [--base https://mi-sitio.com]  |  posts site serve [--dir dist] [--port 4748]');
  if (sub) process.exit(1);
}
