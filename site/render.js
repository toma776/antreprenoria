// Generatorul site-ului nou: pagini HTML construite din creier (data/entitati.json), fără framework.
// Pe site, cifrele de afaceri ale participanților apar doar agregat (mediane, intervale), niciodată per companie.
const fs = require('fs');
const path = require('path');
const brand = require('./brand');
const { megaMenu } = require('./menu');

const DATA = path.join(__dirname, '..', 'data', 'entitati.json');
const { esc, today, fmtDay, median, quantile, milLei, initials } = require('./util');
const { homeBody } = require('./home');

// logo-uri mai bune decât cele din creier (acolo e logo-ul folosit la sponsorizare, uneori foarte mic)
const LOGO = { zitec: 'https://antreprenoria.ro/images/zitec-logo_blue-orange-no-motto.svg' };

// ---------- date din creier ----------
function load() {
  const D = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  D.organizatii.forEach((o) => { if (LOGO[o.id]) o.logo = LOGO[o.id]; });
  const P = Object.fromEntries(D.oameni.map((p) => [p.id, p]));
  const O = Object.fromEntries(D.organizatii.map((o) => [o.id, o]));
  const T = Object.fromEntries(D.teme.map((t) => [t.id, t]));
  return { D, P, O, T };
}

function facts({ D, P }) {
  const part = D.editii.flatMap((e) => e.participanti);
  const ca = part.map((p) => p.cifra_afaceri);
  const speakers = D.oameni.filter((p) => p.aparitii.length);
  const alumni = D.organizatii.filter((o) => o.tipuri.includes('alumni'));
  const sectors = {};
  alumni.forEach((o) => (sectors[o.sector] = (sectors[o.sector] || 0) + 1));
  const constanti = speakers.filter((p) => p.editii.length >= 5).length;
  // ediția în desfășurare și următorul atelier
  const ongoing = D.editii.filter((e) => e.serie === 'București' && e.ateliere.some((a) => a.data && a.data >= today() && a.data.startsWith(String(e.an))))
    .sort((a, b) => b.numar - a.numar)[0];
  const next = ongoing?.ateliere.filter((a) => a.data && a.data >= today() && a.data.startsWith(String(ongoing.an))).sort((a, b) => a.data.localeCompare(b.data))[0];
  const cluj = D.editii.find((e) => e.serie === 'Cluj' && e.deschisa);
  const maxNr = Math.max(...D.editii.filter((e) => e.serie === 'București').map((e) => e.numar));
  return {
    ani: new Date().getFullYear() - D.program.de_cand, maxNr, ateliere: D.editii.reduce((n, e) => n + e.ateliere.length, 0),
    speakers: speakers.length, constanti, alumni: alumni.length, participanti: part.length,
    medianCa: median(ca), q1: quantile(ca, 0.25), q3: quantile(ca, 0.75), medianAng: median(part.map((p) => p.angajati)),
    sectors: Object.entries(sectors).sort((a, b) => b[1] - a[1]), ongoing, next, cluj,
    topTrainers: speakers.slice().sort((a, b) => b.editii.length - a.editii.length || b.aparitii.length - a.aparitii.length).slice(0, 8),
    ciclu: D.organizatii.filter((o) => o.ciclu),
    partners: D.organizatii.filter((o) => o.logo && o.tipuri.some((t) => ['partener', 'sponsor'].includes(t)))
      .sort((a, b) => b.roluri.length - a.roluri.length),
    editiiArhiva: D.editii.slice().sort((a, b) => (a.an - b.an) || (a.sezon === 'primăvară' ? -1 : 1)),
  };
}

// ---------- bucăți comune ----------
const NAV = [['Program', '/program'], ['Ediții', '/editii'], ['Teme', '/teme'], ['Traineri', '/traineri'], ['Alumni', '/alumni'], ['Parteneri', '/parteneri'], ['Despre', '/despre']];
// varianta de brand vine din data/brand.json (activă sau cerută pentru previzualizare cu ?brand=)
function head(title, desc, brandId) {
  const v = brand.pick(brand.load(), brandId);
  return `<!doctype html><html lang="ro" data-brand="${esc(v.id)}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${esc(brand.fontsHref(v))}" rel="stylesheet">
<link rel="stylesheet" href="/assets/brand.css"><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/menu-icon.css">
<script>/* animațiile de la scroll pornesc doar cu JS și fără „reduce motion” */if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('rv')</script><link rel="icon" href="/manage/assets/logo-letter.png">
</head><body>`;
}
// butonul de meniu pe mobil: iconul (trei cercuri) și modul de culoare vin din data/brand.json › icon_meniu
function menuButton() {
  const I = brand.load().icon_meniu || { activ: 'mare-si-doua-mici', culori: 'mono' };
  return `<button class="menu-btn mi-${esc(I.activ)} mc-${esc(I.culori)}" aria-label="Deschide meniul" aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span></button>`;
}
function header(F, ctx) {
  return `<header class="hdr"><div class="wrap hdr-in">
    <a class="logo" href="/" aria-label="Antreprenoria – acasă"><span class="logo-mark">A</span><span class="logo-txt">Antreprenoria<small>by Romanian Business Leaders</small></span></a>
    <nav class="nav" id="nav" aria-label="Meniu principal">
      ${megaMenu(ctx, F)}
      <div class="nav-foot"><a class="btn btn-primary btn-lg" href="/aplica">Aplică</a>${F.ongoing ? `<span class="live"><i></i>Ediția #${F.ongoing.numar} în desfășurare</span>` : ''}</div>
    </nav>
    <div class="hdr-cta">
      ${F.ongoing ? `<span class="live"><i></i>Ediția #${F.ongoing.numar} în desfășurare</span>` : ''}
      <a class="btn btn-primary" href="/aplica">Aplică</a>
      ${menuButton()}
    </div>
  </div><div class="mm-scrim" hidden></div></header>`;
}
function footer() {
  return `<footer class="ftr"><div class="wrap ftr-in">
    <div><a class="logo" href="/"><span class="logo-mark">A</span><span class="logo-txt">Antreprenoria<small>by Romanian Business Leaders</small></span></a>
      <p class="muted">Cresc antreprenorii, crește România! Program al Fundației Romanian Business Leaders, din 2013.</p></div>
    <div><h4>Program</h4>${NAV.slice(0, 4).map(([t, u]) => `<a href="${u}">${t}</a>`).join('')}</div>
    <div><h4>Comunitate</h4>${NAV.slice(4).map(([t, u]) => `<a href="${u}">${t}</a>`).join('')}<a href="/contact">Contact</a></div>
    <div><h4>Contact</h4><p class="muted">Calea Dorobanți 42, et. 3, ap. 5<br>Sector 1, București</p>
      <p><a href="https://www.facebook.com/antreprenoria/" rel="noopener">Facebook</a> · <a href="https://www.linkedin.com/company/antreprenoria" rel="noopener">LinkedIn</a></p></div>
  </div><div class="wrap ftr-legal muted"><span>© ${new Date().getFullYear()} Fundația Romanian Business Leaders</span><span><a href="/confidentialitate">Confidențialitate</a> · <a href="/termeni-si-conditii">Termeni</a> · <a href="/politica-cookies">Cookies</a></span></div></footer>`;
}

// ---------- HOMEPAGE ----------
function renderHome(opt = {}) {
  const ctx = load(), F = facts(ctx);
  return `${head('Antreprenoria – acceleratorul antreprenorilor Romanian Business Leaders', 'Program de accelerare pentru companii în creștere: ateliere cu antreprenori de top, un grup selectat de colegi și comunitatea Romanian Business Leaders. Din 2013.', opt.brand)}
${header(F, ctx)}
<div class="gridlines" aria-hidden="true"></div>
${homeBody(ctx, F)}
${footer()}
<script src="/assets/site.js"></script>
</body></html>`;
}

module.exports = { renderHome };
