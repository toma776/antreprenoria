// Utilitare comune pentru scripturile de extracție.
const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AntreprenoriaLocal/1.0';
const ORIGIN = 'https://antreprenoria.ro';
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const SOURCE = path.join(ROOT, 'source', 'site');

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

const ENTITIES = {
  '&nbsp;': ' ', '&#160;': ' ', '&amp;': '&', '&quot;': '"', '&#039;': "'", '&#39;': "'", '&#8211;': '–',
  '&#8212;': '—', '&#8217;': '’', '&#8216;': '‘', '&#8220;': '“', '&#8221;': '”', '&lt;': '<', '&gt;': '>',
};
const decodeEntities = (s) => s.replace(/&[#a-z0-9]+;/gi, (m) => ENTITIES[m] ?? m).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));

// HTML -> text pe o singură linie, curățat.
function text(html) {
  return decodeEntities(
    String(html || '')
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<style[\s\S]*?<\/style>/g, '')
      .replace(/<br\s*\/?>/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();
}

// slug fără diacritice: „Silviu Hotăran” -> silviu-hotaran
const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&/g, ' si ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// „182,000,000” / „134.225.574” -> 182000000
const num = (s) => { const d = String(s || '').replace(/[^\d]/g, ''); return d ? Number(d) : null; };

const readJson = (f, def) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch { return def; } };
const writeJson = (f, v) => { fs.mkdirSync(path.dirname(path.join(DATA, f)), { recursive: true }); fs.writeFileSync(path.join(DATA, f), JSON.stringify(v, null, 2)); };
const today = () => new Date().toISOString().slice(0, 10);

module.exports = { UA, ORIGIN, ROOT, DATA, SOURCE, get, text, decodeEntities, slug, num, readJson, writeJson, today };
