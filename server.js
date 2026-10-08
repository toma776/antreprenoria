// Server local fără dependențe.
//   /manage[/...]       -> panoul de administrare (manage/index.html): dashboard, entități
//   GET /api/entitati   -> data/entitati.json (generat de npm run sync)
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
const JSON_FILES = { '/api/entitati': 'entitati.json' };

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

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split(/[?#]/)[0]);
  try {
    if (req.method === 'GET' && JSON_FILES[url]) {
      const f = path.join(DATA, JSON_FILES[url]);
      return fs.existsSync(f) ? sendJson(res, 200, fs.readFileSync(f, 'utf8')) : sendJson(res, 404, { error: 'lipsește ' + JSON_FILES[url] });
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
