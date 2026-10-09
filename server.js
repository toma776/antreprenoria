// Server local fără dependențe.
//   /                   -> homepage-ul noului site, generat din creier (site/render.js); ?brand=<id> = previzualizare
//   /assets/brand.css   -> culorile, fonturile și formele, generate din data/brand.json
//   /assets/...         -> CSS/JS ale site-ului (site/assets)
//   /manage[/...]       -> panoul de administrare (manage/index.html): dashboard, entități, branding
//   GET /api/entitati   -> data/entitati.json (generat de npm run sync)
//   GET /api/brand      -> data/brand.json        PUT /api/brand/activ {id} -> schimbă varianta folosită pe site
//   PUT /api/brand/icon {activ?, culori?}         -> iconul de meniu pe mobil și modul lui de culoare
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
    // no-cache: browserul verifică fișierul la fiecare încărcare, ca modificările de CSS/JS să apară imediat
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
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
  ['./site/render', './site/brand', './site/menu', './site/home', './site/util', './site/edition', './site/program', './site/despre'].forEach((m) => delete require.cache[require.resolve(m)]);
  return require(mod);
}

// pe Vercel fișierele sunt doar pentru citire: modificările din panou se fac local și ajung pe site prin git push
const READ_ONLY = !!process.env.VERCEL;

async function handler(req, res) {
  const [rawPath, query = ''] = req.url.split('#')[0].split('?');
  const url = decodeURIComponent(rawPath);
  try {
    if (req.method === 'GET' && JSON_FILES[url]) {
      const f = path.join(DATA, JSON_FILES[url]);
      return fs.existsSync(f) ? sendJson(res, 200, fs.readFileSync(f, 'utf8')) : sendJson(res, 404, { error: 'lipsește ' + JSON_FILES[url] });
    }
    if (READ_ONLY && req.method !== 'GET') return sendJson(res, 403, { error: 'Pe versiunea publicată panoul e doar pentru vizualizare. Modificările se fac local, apoi git push.' });
    if (url === '/api/brand/activ' && req.method === 'PUT') {
      const { id } = await body(req);
      const brand = fresh('./site/brand'), B = brand.load();
      if (!B.variante.some((v) => v.id === id)) return sendJson(res, 400, { error: 'variantă inexistentă' });
      B.activ = id;
      fs.writeFileSync(brand.FILE, JSON.stringify(B, null, 2));
      return sendJson(res, 200, { ok: true, activ: id });
    }
    if (url === '/api/brand/icon' && req.method === 'PUT') {
      const { activ, culori } = await body(req);
      const brand = fresh('./site/brand'), B = brand.load(), I = B.icon_meniu;
      if (activ !== undefined && !I.variante.some((v) => v.id === activ)) return sendJson(res, 400, { error: 'icon inexistent' });
      if (culori !== undefined && !I.moduri_culoare.some((m) => m.id === culori)) return sendJson(res, 400, { error: 'mod de culoare inexistent' });
      if (activ !== undefined) I.activ = activ;
      if (culori !== undefined) I.culori = culori;
      fs.writeFileSync(brand.FILE, JSON.stringify(B, null, 2));
      return sendJson(res, 200, { ok: true, activ: I.activ, culori: I.culori });
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
    const PAGES = { '/': 'renderHome', '/program': 'renderProgram', '/despre': 'renderDespre' };
    // adresa veche de contact duce la secțiunea de contact din /despre
    if (url === '/contact') { res.writeHead(301, { Location: '/despre#contact' }); return res.end(); }
    if (PAGES[url]) {
      const brand = new URLSearchParams(query).get('brand') || undefined;
      res.writeHead(200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-store' });
      return res.end(fresh('./site/render')[PAGES[url]]({ brand }));
    }
    // /editii/22, /editii/cluj-1
    const ed = /^\/editii\/((?:cluj-)?\d+)\/?$/.exec(url);
    if (ed) {
      const html = fresh('./site/render').renderEdition({ key: ed[1], brand: new URLSearchParams(query).get('brand') || undefined });
      if (html) { res.writeHead(200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-store' }); return res.end(html); }
    }
    sendJson(res, 404, { error: 'pagină inexistentă' });
  } catch (e) {
    sendJson(res, 500, { error: e.message });
  }
}

module.exports = handler;

// local: node server.js pornește serverul; pe Vercel (presetul Node), server.js rulează ca funcție și primește toate cererile
if (require.main === module) {
  http.createServer(handler).listen(PORT, () => {
    console.log(`Antreprenoria – site:   http://localhost:${PORT}/`);
    console.log(`Antreprenoria – panou:  http://localhost:${PORT}/manage`);
  });
}
