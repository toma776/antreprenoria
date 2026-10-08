// Server local fără dependențe.
//   /                   -> homepage-ul noului site, generat din creier (site/render.js); ?brand=<id> = previzualizare
//   /assets/brand.css   -> culorile, fonturile și formele, generate din data/brand.json
//   /assets/...         -> CSS/JS ale site-ului (site/assets)
//   /manage[/...]       -> panoul de administrare (manage/index.html): dashboard, entități, branding
//   GET /api/entitati   -> data/entitati.json (generat de npm run sync)
//   GET /api/brand      -> data/brand.json        PUT /api/brand/activ {id} -> schimbă varianta folosită pe site
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
const JSON_FILES = { '/api/entitati': 'entitati.json', '/api/brand': 'brand.json' };

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
function body(req) {
  return new Promise((ok, err) => {
    let b = '';
    req.on('data', (c) => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { err(e); } });
  });
}
// Previne ieșirea din directorul permis (../).
function safe(base, rel) {
  const p = path.normalize(path.join(base, rel));
  return p.startsWith(base) ? p : null;
}
// modulele site-ului se reîncarcă la fiecare cerere, ca schimbările din data/ și site/ să apară fără repornire
function fresh(mod) {
  ['./site/render', './site/brand'].forEach((m) => delete require.cache[require.resolve(m)]);
  return require(mod);
}

http.createServer(async (req, res) => {
  const [rawPath, query = ''] = req.url.split('#')[0].split('?');
  const url = decodeURIComponent(rawPath);
  try {
    if (req.method === 'GET' && JSON_FILES[url]) {
      const f = path.join(DATA, JSON_FILES[url]);
      return fs.existsSync(f) ? sendJson(res, 200, fs.readFileSync(f, 'utf8')) : sendJson(res, 404, { error: 'lipsește ' + JSON_FILES[url] });
    }
    if (url === '/api/brand/activ' && req.method === 'PUT') {
      const { id } = await body(req);
      const brand = fresh('./site/brand'), B = brand.load();
      if (!B.variante.some((v) => v.id === id)) return sendJson(res, 400, { error: 'variantă inexistentă' });
      B.activ = id;
      fs.writeFileSync(brand.FILE, JSON.stringify(B, null, 2));
      return sendJson(res, 200, { ok: true, activ: id });
    }
    if (url.startsWith('/api/')) return sendJson(res, 404, { error: 'rută necunoscută' });
    if (url.startsWith('/manage/assets/')) return sendFile(res, safe(path.join(ROOT, 'manage', 'assets'), url.slice('/manage/assets/'.length)) || '');
    if (url === '/manage' || url.startsWith('/manage/')) return sendFile(res, path.join(ROOT, 'manage', 'index.html'));
    if (url === '/assets/brand.css') {
      res.writeHead(200, { 'Content-Type': TYPES['.css'], 'Cache-Control': 'no-store' });
      return res.end(fresh('./site/brand').css());
    }
    if (url.startsWith('/assets/')) return sendFile(res, safe(path.join(ROOT, 'site', 'assets'), url.slice('/assets/'.length)) || '');
    // paginile site-ului se generează la fiecare cerere din data/entitati.json și data/brand.json
    const PAGES = { '/': 'renderHome' };
    if (PAGES[url]) {
      const brand = new URLSearchParams(query).get('brand') || undefined;
      res.writeHead(200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-store' });
      return res.end(fresh('./site/render')[PAGES[url]]({ brand }));
    }
    sendJson(res, 404, { error: 'pagină inexistentă' });
  } catch (e) {
    sendJson(res, 500, { error: e.message });
  }
}).listen(PORT, () => {
  console.log(`Antreprenoria – site:   http://localhost:${PORT}/`);
  console.log(`Antreprenoria – panou:  http://localhost:${PORT}/manage`);
});
