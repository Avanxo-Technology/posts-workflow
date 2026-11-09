import {join, resolve} from 'node:path';
import {buildSite} from './build.mjs';
import {serveSite, lanAddresses} from './serve.mjs';

// posts site build [--out dist] [--base https://mi-sitio.com]   |   posts site serve [--dir dist] [--port 4748] [--lan]
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
    const dir = resolve(flag(rest, '--dir') || join(TOOL, 'dist')), port = flag(rest, '--port'), lan = flag(rest, '--lan', false);
    let r;
    try { r = await serveSite({dir, port: port ? parseInt(port, 10) : 4748, host: lan ? '0.0.0.0' : '127.0.0.1'}); } catch (e) { die(e.message); }
    const p = new URL(r.url).port;
    console.log(`Sitio (emulando el hosting) en http://127.0.0.1:${p}/` + (lan ? '\nEn tu red local: ' + lanAddresses().map(a => `http://${a}:${p}/`).join('  ') + '\n(solo lectura; cualquier equipo de tu red puede abrirlo)' : '') + '  ·  Ctrl+C para cerrar');
    return;
  }
  console.log('Uso: posts site build [--out dist] [--base https://mi-sitio.com]  |  posts site serve [--dir dist] [--port 4748] [--lan]');
  if (sub) process.exit(1);
}
