// Server local fără dependențe.
//   /                   -> homepage-ul noului site, generat din creier (site/render.js); ?brand=<id> = previzualizare
//   /assets/brand.css   -> culorile, fonturile și formele, generate din data/brand.json
//   /assets/...         -> CSS/JS ale site-ului (site/assets)
//   /manage[/...]       -> panoul de administrare (manage/index.html): dashboard, entități, branding
//   GET /api/entitati   -> data/entitati.json (generat de npm run sync)
//   GET /api/brand      -> data/brand.json        PUT /api/brand/activ {id} -> schimbă varianta folosită pe site
//   PUT /api/brand/icon {activ?, culori?}         -> iconul de meniu pe mobil și modul lui de culoare
//   POST /api/aplica    -> formularul /aplica, salvat în Supabase     GET /api/aplicari -> lista pentru panou (doar local)
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

// .env.local (doar local, exclus din git): APLICARI_CHEIE = cheia cu care panoul citește aplicările
try {
  fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n').forEach((l) => { const m = /^\s*([A-Z_]+)\s*=\s*(.*)\s*$/.exec(l); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; });
} catch (e) {}
// Supabase (proiectul „antreprenoria”, UE): adresa și cheia publică sunt publice prin natura lor; tabelul permite doar adăugare
const SUPABASE = { url: 'https://gqhjaagqwizauzxhnbwi.supabase.co', key: 'sb_publishable_p5kxwfJFm4zC94TQ0dFTmg_UKV2WMOO' };

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
  ['./site/render', './site/brand', './site/menu', './site/home', './site/util', './site/edition', './site/program', './site/despre', './site/teme', './site/aplica'].forEach((m) => delete require.cache[require.resolve(m)]);
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
    // formularul de aplicare: validare pe server (aceleași reguli ca în pagină), apoi salvare
    if (url === '/api/aplica' && req.method === 'POST') {
      const input = await body(req).catch(() => null);
      if (!input) return sendJson(res, 400, { error: 'Cerere invalidă.' });
      if (input.website) return sendJson(res, 200, { ok: true }); // câmpul-capcană pentru roboți
      const ap = fresh('./site/aplica'), render = fresh('./site/render');
      const ids = render.applyOptions().map((o) => o.id);
      const v = ap.validate(input, ids);
      if (!v.ok) return sendJson(res, 422, { error: 'Verifică câmpurile marcate.', errors: v.errors });
      const d = v.data;
      const rec = { editie: d.editie, nume: d.nume, email: d.email, telefon: d.telefon, companie: d.companie, cui: d.cui, cifra_afaceri: d.cifra_afaceri,
        sursa: d.sursa || null, sursa_alta: d.sursa === 'Altceva' ? d.sursa_alta || null : null, acord: true, sursa_pagina: String(req.headers.referer || '').slice(0, 300) || null };
      // aplicările merg în Supabase (tabelul aplicari; cheia publică poate doar adăuga, nu și citi)
      const r = await fetch(`${SUPABASE.url}/rest/v1/aplicari`, { method: 'POST', headers: { apikey: SUPABASE.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(rec) }).catch(() => null);
      if (!r || !r.ok) { console.error('aplicare nesalvată', r && r.status, r && await r.text()); return sendJson(res, 503, { error: 'nedisponibil' }); }
      return sendJson(res, 200, { ok: true });
    }
    // lista aplicărilor pentru panou: doar local, cu cheia din .env.local (pe Vercel panoul e public, deci nu le arată)
    if (url === '/api/aplicari' && req.method === 'GET') {
      if (READ_ONLY) return sendJson(res, 403, { error: 'Aplicările se văd doar în panoul local.' });
      if (!process.env.APLICARI_CHEIE) return sendJson(res, 503, { error: 'Lipsește APLICARI_CHEIE în .env.local.' });
      const r = await fetch(`${SUPABASE.url}/rest/v1/rpc/aplicari_lista`, { method: 'POST', headers: { apikey: SUPABASE.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ cheie: process.env.APLICARI_CHEIE }) }).catch(() => null);
      if (!r || !r.ok) return sendJson(res, 502, { error: 'Nu am putut citi aplicările din Supabase.' });
      return sendJson(res, 200, await r.text());
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
    const PAGES = { '/': 'renderHome', '/program': 'renderProgram', '/despre': 'renderDespre', '/teme': 'renderTeme' };
    // adresa veche de contact duce la secțiunea de contact din /despre
    if (url === '/contact') { res.writeHead(301, { Location: '/despre#contact' }); return res.end(); }
    if (PAGES[url]) {
      const brand = new URLSearchParams(query).get('brand') || undefined;
      res.writeHead(200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-store' });
      return res.end(fresh('./site/render')[PAGES[url]]({ brand }));
    }
    // /aplica (opțional ?editie=cluj-1)
    if (url === '/aplica' || url === '/aplica/') {
      const q = new URLSearchParams(query);
      res.writeHead(200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-store' });
      return res.end(fresh('./site/render').renderAplica({ brand: q.get('brand') || undefined, editie: q.get('editie') || undefined }));
    }
    // /editii/22, /editii/cluj-1
    const ed = /^\/editii\/((?:cluj-)?\d+)\/?$/.exec(url);
    if (ed) {
      const html = fresh('./site/render').renderEdition({ key: ed[1], brand: new URLSearchParams(query).get('brand') || undefined });
      if (html) { res.writeHead(200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-store' }); return res.end(html); }
    }
    // /teme/vanzari: pagină pentru temele full-day; cele de seară duc la secțiunea lor din /teme
    const tm = /^\/teme\/([a-z0-9-]+)\/?$/.exec(url);
    if (tm) {
      const r = fresh('./site/render').renderTema({ id: tm[1], brand: new URLSearchParams(query).get('brand') || undefined });
      if (r?.redirect) { res.writeHead(301, { Location: r.redirect }); return res.end(); }
      if (r?.html) { res.writeHead(200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-store' }); return res.end(r.html); }
    }
    sendJson(res, 404, { error: 'pagină inexistentă' });
  } catch (e) {
    // dacă răspunsul a apucat să înceapă, nu mai putem trimite antetele unei erori: doar îl închidem
    if (res.headersSent) { console.error(e); return res.end(); }
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
