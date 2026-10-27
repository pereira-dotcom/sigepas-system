'use strict';
/* ====================================================================
   SERVIDOR SIGEPAS · sin dependencias (solo Node.js 16 o superior).
   - Sirve el sistema (HTML/CSS/JS) en http://localhost:3000
   - Recibe los respaldos de la base de datos y los guarda en la carpeta ./respaldos
     (respaldo automático en el mismo servidor).
   - Opcional: copia cada respaldo a otra carpeta (CLOUD_DIR), por ejemplo la carpeta
     de «Google Drive para escritorio», que lo sube a la nube.
   Uso:   node server.js
   Variables opcionales (todas con valor por defecto):
     PORT=3000  HOST=127.0.0.1  BACKUP_INTERVAL_SEC=120  BACKUP_KEEP=50
     CLOUD_DIR="C:\Users\Usuario\Google Drive\SIGEPAS"   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   ==================================================================== */
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const ROOT = __dirname;
const BACKUP_DIR = path.join(ROOT, 'respaldos');
const INTERVAL = Math.max(10, Number(process.env.BACKUP_INTERVAL_SEC) || 120);
const KEEP = Math.max(5, Number(process.env.BACKUP_KEEP) || 50);
const CLOUD_DIR = process.env.CLOUD_DIR || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.woff':'font/woff','.woff2':'font/woff2','.md':'text/markdown; charset=utf-8'};
const PRIVATE = ['respaldos', 'node_modules', '.vscode', 'server.js', 'package.json'];

fs.mkdirSync(BACKUP_DIR, { recursive: true });
const pad = n => String(n).padStart(2, '0');
const stamp = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
const SAFE = /^respaldo_[\w-]+\.json$/;

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function listBackups() {
  return fs.readdirSync(BACKUP_DIR).filter(f => SAFE.test(f)).map(f => { const s = fs.statSync(path.join(BACKUP_DIR, f)); return { archivo: f, bytes: s.size, fecha: s.mtime.toISOString(), origen: /_auto\.json$/.test(f) ? 'automático' : 'manual' }; }).sort((a, b) => b.fecha.localeCompare(a.fecha));
}
function rotate() {
  const all = listBackups();
  all.slice(KEEP).forEach(b => { try { fs.unlinkSync(path.join(BACKUP_DIR, b.archivo)); } catch {} });
}
function readBody(req, limit = 50 * 1024 * 1024) {
  return new Promise((resolve, reject) => { let n = 0; const chunks = []; req.on('data', c => { n += c.length; if (n > limit) { reject(new Error('Respaldo demasiado grande')); req.destroy(); } else chunks.push(c); }); req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8'))); req.on('error', reject); });
}

async function api(req, res, url) {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  if (url.pathname === '/api/estado') {
    const l = listBackups();
    return send(res, 200, { ok: true, intervaloSeg: INTERVAL, conservar: KEEP, carpeta: 'respaldos', carpetaNube: CLOUD_DIR ? path.basename(CLOUD_DIR) : '', nubeLocal: !!CLOUD_DIR, googleClientId: GOOGLE_CLIENT_ID, total: l.length, ultimo: l[0] || null });
  }
  if (url.pathname === '/api/respaldos' && req.method === 'GET') return send(res, 200, { ok: true, respaldos: listBackups() });
  if (url.pathname === '/api/respaldo' && req.method === 'POST') {
    let parsed;
    try { parsed = JSON.parse(await readBody(req)); } catch { return send(res, 400, { ok: false, error: 'El respaldo no es un JSON válido.' }); }
    const d = parsed && (parsed.datos || parsed);
    if (!d || !Array.isArray(d.carreras) || !Array.isArray(d.estudiantes) || !Array.isArray(d.pasantias)) return send(res, 422, { ok: false, error: 'El archivo no parece un respaldo SIGEPAS válido.' });
    const origen = url.searchParams.get('origen') === 'auto' ? 'auto' : 'manual';
    const name = `respaldo_${stamp(new Date())}_${origen}.json`;
    const body = JSON.stringify(parsed, null, 2);
    fs.writeFileSync(path.join(BACKUP_DIR, name), body);
    let nube = null;
    if (CLOUD_DIR) { try { fs.mkdirSync(CLOUD_DIR, { recursive: true }); fs.writeFileSync(path.join(CLOUD_DIR, name), body); nube = true; } catch (e) { nube = false; console.error('No se pudo copiar a CLOUD_DIR:', e.message); } }
    rotate();
    console.log(`[${new Date().toLocaleTimeString()}] Respaldo ${origen}: ${name}${nube === true ? ' (copiado a la carpeta de la nube)' : ''}`);
    return send(res, 200, { ok: true, archivo: name, origen, nube });
  }
  const m = url.pathname.match(/^\/api\/respaldos\/([^/]+)$/);
  if (m && req.method === 'GET') {
    const f = decodeURIComponent(m[1]);
    if (!SAFE.test(f) || !fs.existsSync(path.join(BACKUP_DIR, f))) return send(res, 404, { ok: false, error: 'No existe ese respaldo.' });
    return send(res, 200, fs.readFileSync(path.join(BACKUP_DIR, f)));
  }
  return send(res, 404, { ok: false, error: 'Ruta no encontrada.' });
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname); if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(ROOT, rel));
  const top = path.relative(ROOT, file).split(path.sep)[0];
  if (!file.startsWith(ROOT + path.sep) || PRIVATE.includes(top)) return send(res, 403, 'Acceso denegado', 'text/plain; charset=utf-8');
  fs.readFile(file, (err, data) => err ? send(res, 404, 'No encontrado', 'text/plain; charset=utf-8') : send(res, 200, data, MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'));
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  (url.pathname.startsWith('/api/') ? api(req, res, url) : Promise.resolve(serveStatic(req, res, url)))
    .catch(e => { console.error(e); send(res, 500, { ok: false, error: 'Error interno del servidor.' }); });
}).listen(PORT, HOST, () => {
  console.log(`SIGEPAS en http://localhost:${PORT}`);
  console.log(`Respaldos automáticos cada ${INTERVAL} s en: ${BACKUP_DIR}`);
  console.log(CLOUD_DIR ? `Copia a la nube (carpeta sincronizada): ${CLOUD_DIR}` : 'Copia a la nube por carpeta: no configurada (CLOUD_DIR).');
  console.log(GOOGLE_CLIENT_ID ? 'Google Drive (API): configurado.' : 'Google Drive (API): sin GOOGLE_CLIENT_ID.');
});
