// Utilitare comune pentru generatorul site-ului.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const today = () => new Date().toISOString().slice(0, 10);
const MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
const fmtDay = (d) => { const [, m, z] = d.split('-').map(Number); return `${z} ${MONTHS[m - 1]}`; };
const median = (arr) => { const a = arr.filter((x) => x != null).sort((x, y) => x - y); return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null; };
const quantile = (arr, q) => { const a = arr.filter((x) => x != null).sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) * q)] : null; };
const milLei = (n) => `${(n / 1e6).toLocaleString('ro-RO', { maximumFractionDigits: 1 })}`;
const initials = (n) => n.split(/[\s-]+/).map((x) => x[0]).slice(0, 2).join('');
// pentru adrese și filtre în URL: „Tech & software” -> tech-si-software
const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'si').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// logo-ul unei companii; dacă are site, e link spre el (în tab nou)
const logoImg = (o) => {
  const inner = o.logo ? `<img src="${esc(o.logo)}" alt="${esc(o.nume)}" loading="lazy">` : `<b>${esc(o.nume)}</b>`;
  return o.url ? `<a class="logo-link" href="${esc(o.url)}" target="_blank" rel="noopener" title="${esc(o.nume)} · site ↗">${inner}</a>` : inner;
};

// imaginile de pe site-ul vechi (antreprenoria.ro/images/...) sunt copiate în proiect, la /assets/vechi/... (aceeași cale);
// site-ul nu mai depinde de site-ul vechi. O imagine fără copie locală rămâne cu adresa veche.
const OLD_IMG = 'https://antreprenoria.ro/images/';
const VECHI_DIR = require('path').join(__dirname, 'assets', 'vechi');
const localImg = (u) => {
  if (!u || !u.startsWith(OLD_IMG)) return u;
  const rest = u.slice(OLD_IMG.length);
  try { if (require('fs').existsSync(require('path').join(VECHI_DIR, decodeURIComponent(rest)))) return `/assets/vechi/${rest}`; } catch { /* adresă invalidă: rămâne cea veche */ }
  return u;
};
// pozele au până la 800px; pe Vercel le cerem redimensionate (și în WebP) prin optimizarea de imagini
// (vercel.json › images); local rămân cum sunt. Lățimile trebuie să fie printre cele din vercel.json › images.sizes.
const IMG_SIZES = [128, 256, 384, 640];
const img = (u, w = 384) => {
  u = localImg(u);
  if (!u || !process.env.VERCEL || !(u.startsWith('/assets/vechi/') || u.startsWith(OLD_IMG))) return u;
  const size = IMG_SIZES.find((s) => s >= w) || IMG_SIZES[IMG_SIZES.length - 1];
  return `/_vercel/image?url=${encodeURIComponent(u)}&w=${size}&q=75`;
};

// „de” cerut de gramatică între număr și substantiv: 20 de cohorte, 101 cohorte, 120 de cohorte (n poate fi și „1.234”)
const de = (n) => { const v = typeof n === 'number' ? Math.round(n) : Number(String(n).replace(/[^\d]/g, '')); return Number.isFinite(v) && (v % 100 === 0 ? v > 0 : v % 100 >= 20) ? 'de ' : ''; };
// textele preluate (descrieri): fără spațiu înaintea semnelor de punctuație
const tidy = (s) => String(s ?? '').replace(/\s+([,.;:!?])/g, '$1');
// textele preluate care spun „ediție”: pe site spunem „cohortă” (aceleași forme, același gen)
const COH = { edițiilor: 'cohortelor', edițiile: 'cohortele', ediției: 'cohortei', ediția: 'cohorta', ediții: 'cohorte', ediție: 'cohortă', Edițiile: 'Cohortele', Ediția: 'Cohorta', Ediții: 'Cohorte', Ediție: 'Cohortă' };
const cohorta = (s) => String(s ?? '').replace(/(?<!\p{L})(Edițiile|edițiilor|edițiile|ediției|Ediția|ediția|Ediții|ediții|Ediție|ediție)(?!\p{L})/gu, (m) => COH[m]);
// pagina Teme (/teme, /teme/<id>): ascunsă; codul rămâne. Cu true revine în meniu, în footer și în linkuri.
const TEME = false;
// unde duce o temă: pagina ei (dacă Teme e vizibilă), altfel liderii care o predau
const temaUrl = (t) => (!t ? '/lideri' : TEME ? (t.format === 'full-day' ? `/teme/${t.id}` : `/teme#${t.id}`) : `/lideri?tema=${t.id}#lista`);
// săgețile: caracterele „→” și „←” din textul paginilor devin săgeata desenată a butoanelor (aceeași peste tot);
// în <script>, <style>, <title>, <textarea> și în atribute rămân cum sunt
const ARR_SVG = (d) => `<svg class="arr${d ? ' arr-l' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
function arrows(html) {
  let skip = null;
  return html.split(/(<[^>]+>)/).map((part) => {
    if (part[0] === '<') {
      const m = /^<(\/?)(script|style|title|textarea)\b/i.exec(part);
      if (m) skip = m[1] ? null : m[2].toLowerCase();
      return part;
    }
    if (skip || !/[→←]/.test(part)) return part;
    return part.replace(/\s?→/g, (x) => (x.length > 1 ? ' ' : '') + ARR_SVG()).replace(/←\s?/g, (x) => ARR_SVG(true) + (x.length > 1 ? ' ' : ''));
  }).join('');
}
// ultimul pas pentru fiecare pagină HTML: săgețile și imaginile rămase cu adresa site-ului vechi (logo-uri puse direct în src) -> copiile locale
const finishHtml = (html) => arrows(html).replace(/https:\/\/antreprenoria\.ro\/images\/[^"'\s)<>]+/g, (u) => localImg(u));
// paginile separate ale comunității (căutarea, industriile, cohortele): publicate, și local, și pe Vercel
const CM_PAGES = true;
module.exports = { finishHtml, localImg, arrows, CM_PAGES, TEME, temaUrl, cohorta, de, tidy, esc, today, MONTHS, fmtDay, median, quantile, milLei, initials, slug, img, logoImg };
