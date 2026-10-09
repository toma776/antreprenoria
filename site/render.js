// Generatorul site-ului nou: pagini HTML construite din creier (data/entitati.json), fără framework.
// Pe site, cifrele de afaceri ale participanților apar doar agregat (mediane, intervale), niciodată per companie.
const fs = require('fs');
const path = require('path');
const brand = require('./brand');
const { megaMenu } = require('./menu');

const DATA = path.join(__dirname, '..', 'data', 'entitati.json');
const { esc, today, fmtDay, median, quantile, milLei, initials } = require('./util');
const { homeBody } = require('./home');
const { editionBody, findEdition, edLabel } = require('./edition');
const { programBody } = require('./program');
const { despreBody } = require('./despre');
const { temeBody, temaBody } = require('./teme');

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
// footer: închis la culoare (diferit de banda finală), cu starea programului din creier, contactele echipei
// și numele programului desenat mare la bază
const ICON = {
  linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.06c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.77 2.65 4.77 6.1V21h-4v-5.1c0-1.22-.02-2.79-1.7-2.79-1.7 0-1.96 1.33-1.96 2.7V21h-4z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.87.25-1.46 1.5-1.46h1.55V4.47A20 20 0 0 0 14.3 4.3c-2.2 0-3.7 1.34-3.7 3.8v2.4H8.1v3h2.5V21z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
function footer(F, ctx) {
  const { D } = ctx;
  const edUrl = (e) => (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`);
  const team = Object.fromEntries(D.program.contact.echipa.map((p) => [p.id, p]));
  const ong = F.ongoing, nx = F.next;
  const contact = (p, label) => p ? `<div class="ftr-person"><span>${label}</span><b>${esc(p.nume)}</b><a href="mailto:${esc(p.email)}">${esc(p.email)}</a>${p.telefon ? `<a href="tel:${esc(p.telefon.replace(/\D/g, ''))}">${esc(p.telefon)}</a>` : ''}</div>` : '';
  const recent = D.editii.filter((e) => e.serie === 'București').sort((a, b) => b.numar - a.numar).slice(0, 4);
  return `<footer class="ftr">
  <div class="wrap">
    <div class="ftr-top">
      <div class="ftr-brand">
        <a class="logo" href="/"><span class="logo-mark">A</span><span class="logo-txt">Antreprenoria<small>by Romanian Business Leaders</small></span></a>
        <p class="ftr-claim">Cresc antreprenorii,<br>crește România.</p>
        <p class="ftr-sub">Program al Fundației Romanian Business Leaders, din ${D.program.de_cand}. ${F.maxNr} ediții în București, plus Cluj.</p>
        <div class="ftr-social">
          <a href="https://www.linkedin.com/company/antreprenoria" rel="noopener" aria-label="LinkedIn">${ICON.linkedin}</a>
          <a href="https://www.facebook.com/antreprenoria/" rel="noopener" aria-label="Facebook">${ICON.facebook}</a>
        </div>
      </div>
      ${ong ? `<a class="ftr-status" href="${edUrl(ong)}">
        <span class="ftr-status-top"><i class="dot-live"></i>Acum: ediția #${ong.numar}</span>
        ${nx ? `<b>Următorul atelier: ${esc(nx.titlu)}</b><span>${fmtDay(nx.data)}${nx.locatie ? ' · ' + esc(nx.locatie) : ''}</span>` : `<b>${esc(ong.perioada)}</b>`}
        <em>Vezi agenda ${ICON.arrow}</em>
      </a>` : ''}
    </div>
    <div class="ftr-cols">
      <nav aria-label="Program"><h4>Program</h4>${NAV.slice(0, 4).map(([t, u]) => `<a href="${u}">${t}</a>`).join('')}<a href="/aplica">Aplică</a></nav>
      <nav aria-label="Comunitate"><h4>Comunitate</h4>${NAV.slice(4).map(([t, u]) => `<a href="${u}">${t}</a>`).join('')}<a href="/despre#contact">Contact</a></nav>
      <nav aria-label="Ediții recente"><h4>Ediții recente</h4>${recent.map((e) => `<a href="${edUrl(e)}">#${e.numar} <small>${esc(e.sezon)} ${e.an}</small></a>`).join('')}${F.cluj ? `<a href="${edUrl(F.cluj)}">Cluj #${F.cluj.numar} <small>înscrieri deschise</small></a>` : ''}</nav>
      <div class="ftr-contact"><h4>Contact</h4>
        ${contact(team['raluca-bedereag'], 'Pentru participanți')}
        ${contact(team['larisa-slavenie'], 'Parteneriate')}
        <p class="ftr-addr">Calea Dorobanți 42, et. 3, ap. 5<br>Sector 1, București</p>
      </div>
    </div>
  </div>
  <div class="ftr-word" aria-hidden="true"><svg viewBox="0 0 1000 124" preserveAspectRatio="xMidYMax meet"><defs><linearGradient id="ftr-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".2"/><stop offset="1" stop-color="currentColor" stop-opacity=".03"/></linearGradient></defs><text x="2" y="124" textLength="996" lengthAdjust="spacingAndGlyphs" fill="url(#ftr-fade)">Antreprenoria</text></svg></div>
  <div class="wrap ftr-legal"><span>© ${new Date().getFullYear()} Fundația Romanian Business Leaders</span><span><a href="/confidentialitate">Confidențialitate</a><a href="/termeni-si-conditii">Termeni</a><a href="/politica-cookies">Cookies</a></span></div>
</footer>`;
}

// ---------- HOMEPAGE ----------
function renderHome(opt = {}) {
  const ctx = load(), F = facts(ctx);
  return `${head('Antreprenoria – acceleratorul antreprenorilor Romanian Business Leaders', 'Program de accelerare pentru companii în creștere: ateliere cu antreprenori de top, un grup selectat de colegi și comunitatea Romanian Business Leaders. Din 2013.', opt.brand)}
${header(F, ctx)}
<div class="gridlines" aria-hidden="true"></div>
${homeBody(ctx, F)}
${footer(F, ctx)}
<script src="/assets/site.js"></script>
</body></html>`;
}

// ---------- PAGINA UNEI EDIȚII ----------
// întoarce null dacă ediția nu există (serverul răspunde 404)
function renderEdition(opt = {}) {
  const ctx = load(), F = facts(ctx), e = findEdition(ctx.D, opt.key);
  if (!e) return null;
  const name = `Antreprenoria ${e.serie === 'Cluj' ? 'Cluj ' : ''}#${e.numar}`;
  return `${head(`${name} · ${e.perioada} – Antreprenoria`, `${name}, ${e.perioada}: agenda atelierelor, traineri și antreprenori invitați, colegii de ediție și partenerii.`, opt.brand)}
${header(F, ctx)}
<div class="gridlines" aria-hidden="true"></div>
${editionBody(ctx, F, e)}
${footer(F, ctx)}
<script src="/assets/site.js"></script>
</body></html>`;
}

// ---------- PROGRAM ----------
function renderProgram(opt = {}) {
  const ctx = load(), F = facts(ctx);
  return `${head('Programul Antreprenoria – cum funcționează, pentru cine e, investiția', 'Cum arată o zi de atelier, formatul unei ediții, metodologia, cui se adresează programul și cât costă. Acceleratorul Romanian Business Leaders, din 2013.', opt.brand)}
${header(F, ctx)}
<div class="gridlines" aria-hidden="true"></div>
${programBody(ctx, F)}
${footer(F, ctx)}
<script src="/assets/site.js"></script>
</body></html>`;
}

// ---------- DESPRE ----------
function renderDespre(opt = {}) {
  const ctx = load(), F = facts(ctx);
  return `${head('Despre Antreprenoria – programul, istoricul, Romanian Business Leaders, echipa', 'Antreprenoria este programul de accelerare al Fundației Romanian Business Leaders, din 2013: istoricul edițiilor, organizatorul, echipa și contactul.', opt.brand)}
${header(F, ctx)}
<div class="gridlines" aria-hidden="true"></div>
${despreBody(ctx, F)}
${footer(F, ctx)}
<script src="/assets/site.js"></script>
</body></html>`;
}

// ---------- TEME ----------
// /teme: curriculum-ul; /teme/<id>: doar temele full-day au pagină (cele de seară sunt secțiuni pe /teme)
function renderTeme(opt = {}) {
  const ctx = load(), F = facts(ctx);
  return `${head('Curriculum-ul Antreprenoria – temele atelierelor', 'Cele cinci teme full-day ale programului (viziune, model de business, marketing, vânzări, cultură organizațională) și atelierele de seară, ediție cu ediție.', opt.brand)}
${header(F, ctx)}
<div class="gridlines" aria-hidden="true"></div>
${temeBody(ctx, F)}
${footer(F, ctx)}
<script src="/assets/site.js"></script>
</body></html>`;
}
// întoarce { html } pentru o temă full-day, { redirect } pentru una de seară, null dacă tema nu există
function renderTema(opt = {}) {
  const ctx = load(), F = facts(ctx), t = ctx.T[opt.id];
  if (!t) return null;
  if (t.format !== 'full-day') return { redirect: `/teme#${t.id}` };
  return { html: `${head(`${t.nume} – temă Antreprenoria`, `Atelierul full-day „${t.nume}”: cine l-a predat la fiecare ediție, antreprenorii invitați, sponsorii și următoarea dată.`, opt.brand)}
${header(F, ctx)}
<div class="gridlines" aria-hidden="true"></div>
${temaBody(ctx, F, t.id)}
${footer(F, ctx)}
<script src="/assets/site.js"></script>
</body></html>` };
}

module.exports = { renderHome, renderEdition, renderProgram, renderDespre, renderTeme, renderTema };
