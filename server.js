// Server local fără dependențe.
//   /manage[/...]       -> panoul de administrare (manage/index.html): dashboard, entități
//   GET /api/entitati   -> data/entitati.json (generat de npm run sync)
//   GET /api/presa/status            -> data/presa-status.json
//   PUT /api/presa/status {id, status, nota} -> validarea unei apariții sau a unui citat (propus | validat | respins)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3200;
const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
};
const JSON_FILES = { '/api/entitati': 'entitati.json', '/api/presa/status': 'presa-status.json' };
const STATUS = ['propus', 'validat', 'respins'];

const readJson = (f, def) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch { return def; } };
const writeJson = (f, v) => fs.writeFileSync(path.join(DATA, f), JSON.stringify(v, null, 2));
const now = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19); };
function body(req) {
  return new Promise((ok, err) => {
    let b = '';
    req.on('data', (c) => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { err(e); } });
  });
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-store' });
  res.end(typeof obj === 'string' ? obj : JSON.stringify(obj));
}
function sendFile(res, file) {
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 – ' + path.relative(ROOT, file || ''));
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
}
// Previne ieșirea din directorul permis (../).
function safe(base, rel) {
  const p = path.normalize(path.join(base, rel));
  return p.startsWith(base) ? p : null;
}

http.createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split(/[?#]/)[0]);
  try {
    if (req.method === 'GET' && JSON_FILES[url]) {
      const f = path.join(DATA, JSON_FILES[url]);
      if (fs.existsSync(f)) return sendJson(res, 200, fs.readFileSync(f, 'utf8'));
      return url.endsWith('/status') ? sendJson(res, 200, {}) : sendJson(res, 404, { error: 'lipsește ' + JSON_FILES[url] });
    }
    if (url === '/api/presa/status' && req.method === 'PUT') {
      const { id, status, nota } = await body(req);
      if (!id || !STATUS.includes(status)) return sendJson(res, 400, { error: 'id + status (propus | validat | respins)' });
      const st = readJson('presa-status.json', {});
      if (status === 'propus' && !nota) delete st[id];
      else st[id] = { status, nota: nota || '', verificat_la: now() };
      writeJson('presa-status.json', st);
      return sendJson(res, 200, { ok: true });
    }
    if (url.startsWith('/api/')) return sendJson(res, 404, { error: 'rută necunoscută' });
    if (url.startsWith('/manage/assets/')) return sendFile(res, safe(path.join(ROOT, 'manage', 'assets'), url.slice('/manage/assets/'.length)) || '');
    if (url === '/' || url === '/manage' || url.startsWith('/manage/')) return sendFile(res, path.join(ROOT, 'manage', 'index.html'));
    sendJson(res, 404, { error: 'pagină inexistentă' });
  } catch (e) {
    sendJson(res, 500, { error: e.message });
  }
}).listen(PORT, () => {
  console.log(`Antreprenoria – panou:  http://localhost:${PORT}/manage`);
});
