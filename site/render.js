// Generatorul site-ului nou: pagini HTML construite din creier (data/entitati.json), fără framework.
// Pe site, cifrele de afaceri ale participanților apar doar agregat (mediane, intervale), niciodată per companie.
const fs = require('fs');
const path = require('path');
const brand = require('./brand');
const { megaMenu } = require('./menu');

// local, cu modificările încă nepublicate din panou (entitati-local.json); pe Vercel, doar ce e publicat
const DATA_PUB = path.join(__dirname, '..', 'data', 'entitati.json'), DATA_LOCAL = path.join(__dirname, '..', 'data', 'entitati-local.json');
const dataFile = () => (!process.env.VERCEL && fs.existsSync(DATA_LOCAL) ? DATA_LOCAL : DATA_PUB);
const { esc, today, fmtDay, median, quantile, milLei, initials, de, cohorta } = require('./util');
const { tx } = require('./texte');
const { homeBody } = require('./home');
const { editionBody, findEdition, edLabel } = require('./edition');
const { programBody } = require('./program');
const { despreBody } = require('./despre');
const { temeBody, temaBody } = require('./teme');
const { traineriBody, trainerBody, personData } = require('./traineri');
const { alumniBody, alumnusBody, alumniData, hasPage, communityIndex } = require('./alumni');
const { parteneriBody } = require('./parteneri');
const { editiiBody } = require('./editii');
const { aplicaBody, options: aplicaOptions } = require('./aplica');


// ---------- date din creier ----------
// ce e marcat „ascuns” în panou rămâne în date, dar nu apare pe site (nici în listele altor entități)
function hideHidden(D, keepEditii) {
  const off = (x) => !x?.ascuns;
  const P = new Set(D.oameni.filter((p) => p.ascuns).map((p) => p.id)), O = new Set(D.organizatii.filter((o) => o.ascuns).map((o) => o.id));
  D.oameni = D.oameni.filter(off); D.organizatii = D.organizatii.filter(off); D.locatii = D.locatii.filter(off); D.teme = D.teme.filter(off);
  if (!keepEditii) D.editii = D.editii.filter(off);
  D.editii.forEach((e) => {
    e.ateliere = e.ateliere.filter(off);
    e.ateliere.forEach((a) => { a.program.forEach((m) => { m.speakeri = m.speakeri.filter((s) => !P.has(s.persoana)); }); if (O.has(a.sponsor)) a.sponsor = null; });
    e.participanti = e.participanti.filter((x) => !P.has(x.persoana));
    e.parteneri = e.parteneri.filter((x) => !O.has(x.organizatie));
  });
  D.program.contact.echipa = D.program.contact.echipa.filter(off);
  return D;
}
function load(brandId, preview) {
  const D = hideHidden(JSON.parse(fs.readFileSync(dataFile(), 'utf8')), preview);
  // metodologia vine de pe site-ul vechi, cu „ediție”: pe site spunem „cohortă”
  const coh = (m) => ({ ...m, titlu: cohorta(m.titlu), puncte: (m.puncte || []).map(cohorta) });
  D.program.metodologie = (D.program.metodologie || []).map(coh);
  D.editii.forEach((e) => { e.metodologie = (e.metodologie || []).map(coh); });
  const P = Object.fromEntries(D.oameni.map((p) => [p.id, p]));
  const O = Object.fromEntries(D.organizatii.map((o) => [o.id, o]));
  const T = Object.fromEntries(D.teme.map((t) => [t.id, t]));
  return { D, P, O, T, brandId };
}

function facts({ D, P }) {
  const part = D.editii.flatMap((e) => e.participanti);
  const ca = part.map((p) => p.cifra_afaceri);
  const speakers = D.oameni.filter((p) => p.aparitii.length);
  const alumni = D.organizatii.filter((o) => o.tipuri.includes('alumni'));
  const sectors = {};
  alumni.forEach((o) => (sectors[o.sector] = (sectors[o.sector] || 0) + 1));
  const constanti = speakers.filter((p) => p.editii.length >= 5).length;
  // cohorta în desfășurare și următorul atelier
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
const NAV = [['Program', '/program'], ['Cohorte', '/editii'], ['Teme', '/teme'], ['Lideri', '/lideri'], ['Comunitate', '/comunitate'], ['Parteneri', '/parteneri'], ['Despre', '/despre']];
// varianta de brand vine din data/brand.json (activă sau cerută pentru previzualizare cu ?brand=)
function head(title, desc, brandId) {
  const v = brand.pick(brand.load(), brandId);
  return `<!doctype html><html lang="ro" data-brand="${esc(v.id)}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${esc(brand.fontsHref(v))}" rel="stylesheet">
<link rel="stylesheet" href="/assets/brand.css"><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/menu-icon.css">
<script>/* animațiile de la scroll pornesc doar cu JS și fără „reduce motion” */if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('rv')</script>${favicons(v)}
</head><body>`;
}
// logo-ul: varianta potrivită fundalului din fiecare loc (data/brand.json › variante › logo › pe_site);
// header-ul A și footerul sunt gri închis, deci logo cu text alb; header-ul deschis al lui B folosește logo-ul cu text gri
const LOGO_DIR = '/assets/identitate/';
const LOGO_DEFAULT = { header: 'orizontal', footer: 'orizontal-alb', favicon: LOGO_DIR + 'favicon-32.png', apple_touch: LOGO_DIR + 'favicon-180.png' };
function logoUse(brandId) {
  const v = brand.pick(brand.load(), brandId);
  return { ...LOGO_DEFAULT, ...(v.logo?.pe_site || {}) };
}
function logo(where, brandId) {
  const id = logoUse(brandId)[where];
  // fișierul variantei alese (versiunea ușoară pentru web, dacă există); un logo înlocuit din panou apare direct
  const x = brand.pick(brand.load(), brandId).logo?.variante?.find((y) => y.id === id);
  const src = x?.web || x?.fisier || `${LOGO_DIR}antreprenoria-logo-${id}-web.png`;
  return `<a class="logo logo-${where}" href="/" aria-label="Antreprenoria – acasă"><img src="${esc(src)}" alt="Antreprenoria"></a>`;
}
function favicons(v) {
  const u = { ...LOGO_DEFAULT, ...(v.logo?.pe_site || {}) };
  return `<link rel="icon" type="image/png" sizes="32x32" href="${esc(u.favicon)}"><link rel="apple-touch-icon" href="${esc(u.apple_touch)}">`;
}
// butonul de meniu pe mobil: iconul (trei cercuri) și modul de culoare vin din data/brand.json › icon_meniu
function menuButton() {
  const I = brand.load().icon_meniu || { activ: 'mare-si-doua-mici', culori: 'mono' };
  return `<button class="menu-btn mi-${esc(I.activ)} mc-${esc(I.culori)}" aria-label="Deschide meniul" aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span></button>`;
}
function header(F, ctx) {
  const brandId = ctx.brandId;
  return `<header class="hdr"><div class="wrap hdr-in">
    ${logo('header', brandId)}
    <nav class="nav" id="nav" aria-label="Meniu principal">
      ${megaMenu(ctx, F)}
      <div class="nav-foot"><a class="btn btn-primary btn-lg" href="/aplica">Aplică</a>${F.ongoing ? `<a class="live" href="/editii/${F.ongoing.numar}" title="Pagina cohortei"><i></i>Cohorta #${F.ongoing.numar} în desfășurare</a>` : ''}</div>
    </nav>
    <div class="hdr-cta">
      ${F.ongoing ? `<a class="live" href="/editii/${F.ongoing.numar}" title="Pagina cohortei"><i></i>Cohorta #${F.ongoing.numar} în desfășurare</a>` : ''}
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
function footer(F, ctx, opt = {}) {
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
        ${logo('footer', ctx.brandId)}
        <p class="ftr-claim">${esc(tx(D, 'footer.mesaj')).replace(/\n/g, '<br>')}</p>
        <p class="ftr-sub">Program al Fundației Romanian Business Leaders, din ${D.program.de_cand}. ${F.maxNr} ${de(F.maxNr)}cohorte în București, plus Cluj.</p>
        <div class="ftr-social">
          <a href="https://www.linkedin.com/company/antreprenoria" rel="noopener" aria-label="LinkedIn">${ICON.linkedin}</a>
          <a href="https://www.facebook.com/antreprenoria/" rel="noopener" aria-label="Facebook">${ICON.facebook}</a>
        </div>
      </div>
      ${ong ? `<a class="ftr-status" href="${edUrl(ong)}">
        <span class="ftr-status-top"><i class="dot-live"></i>Acum: cohorta #${ong.numar}</span>
        ${nx ? `<b>Următorul atelier: ${esc(nx.titlu)}</b><span>${fmtDay(nx.data)}${nx.locatie ? ' · ' + esc(nx.locatie) : ''}</span>` : `<b>${esc(ong.perioada)}</b>`}
        <em>Vezi agenda ${ICON.arrow}</em>
      </a>` : ''}
    </div>
    <div class="ftr-cols">
      <nav aria-label="Program"><h4>Program</h4>${NAV.slice(0, 4).map(([t, u]) => `<a href="${u}">${t}</a>`).join('')}<a href="/aplica">Aplică</a></nav>
      <nav aria-label="Comunitate"><h4>Comunitate</h4>${NAV.slice(4).map(([t, u]) => `<a href="${u}">${t}</a>`).join('')}<a href="/despre#contact">Contact</a></nav>
      <nav aria-label="Cohorte recente"><h4>Cohorte recente</h4>${recent.map((e) => `<a href="${edUrl(e)}">#${e.numar} <small>${esc(e.sezon)} ${e.an}</small></a>`).join('')}${F.cluj ? `<a href="${edUrl(F.cluj)}">Cluj #${F.cluj.numar} <small>înscrieri deschise</small></a>` : ''}</nav>
      <div class="ftr-contact"><h4>Contact</h4>
        ${team['raluca-bedereag'] ? `<div class="ftr-quick">${team['raluca-bedereag'].telefon ? `<a class="btn btn-light" href="tel:${esc(team['raluca-bedereag'].telefon.replace(/\D/g, ''))}">Sună</a>` : ''}<a class="btn btn-outline-light" href="mailto:${esc(team['raluca-bedereag'].email)}">Scrie-ne</a><small>${esc(team['raluca-bedereag'].nume)}, pentru participanți</small></div>` : ''}
        ${contact(team['raluca-bedereag'], 'Pentru participanți')}
        ${contact(team['larisa-slavenie'], 'Parteneriate')}
        <p class="ftr-addr">Calea Dorobanți 42, et. 3, ap. 5<br>Sector 1, București</p>
      </div>
    </div>
  </div>
  <div class="ftr-word" aria-hidden="true"><svg viewBox="0 0 1000 124" preserveAspectRatio="xMidYMax meet"><defs><linearGradient id="ftr-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".2"/><stop offset="1" stop-color="currentColor" stop-opacity=".03"/></linearGradient></defs><text x="2" y="124" textLength="996" lengthAdjust="spacingAndGlyphs" fill="url(#ftr-fade)">Antreprenoria</text></svg></div>
  <div class="wrap ftr-legal"><span>© ${new Date().getFullYear()} Fundația Romanian Business Leaders</span><span><a href="/confidentialitate">Confidențialitate</a><a href="/termeni-si-conditii">Termeni</a><a href="/politica-cookies">Cookies</a></span></div>
</footer>
${opt.mcta === false ? '' : `<!-- doar pe mobil: acțiunea principală, la îndemâna degetului mare; apare după primul ecran (site.js) -->
<div class="mcta" aria-hidden="true">
  ${ong ? `<a class="mcta-ed" href="${edUrl(ong)}" tabindex="-1"><i class="dot-live"></i><span>Cohorta #${ong.numar}<small>${nx ? (nx.data === today() ? 'atelier azi' : `următorul: ${fmtDay(nx.data)}`) : 'în desfășurare'}</small></span></a>` : ''}
  <a class="btn btn-primary mcta-go" href="/aplica" tabindex="-1">Aplică</a>
</div>`}`;
}

// ---------- HOMEPAGE ----------
function renderHome(opt = {}) {
  const ctx = load(opt.brand), F = facts(ctx);
  return `${head('Antreprenoria – acceleratorul antreprenorilor Romanian Business Leaders', 'Program de accelerare pentru companii în creștere: ateliere cu antreprenori de top, un grup selectat de colegi și comunitatea Romanian Business Leaders. Din 2013.', opt.brand)}
${header(F, ctx)}
<div class="gridlines" aria-hidden="true"></div>
${homeBody(ctx, F)}
${footer(F, ctx)}
<script src="/assets/site.js"></script>
</body></html>`;
}

// ---------- PAGINA UNEI EDIȚII ----------
// întoarce null dacă cohorta nu există (serverul răspunde 404)
function renderEdition(opt = {}) {
  // previzualizare din panou (doar local): arată și cohorta încă ascunsă
  const ctx = load(opt.brand, opt.preview), F = facts(ctx), e = findEdition(ctx.D, opt.key);
  if (!e) return null;
  const name = `Antreprenoria ${e.serie === 'Cluj' ? 'Cluj ' : ''}#${e.numar}`;
  return `${head(`${name} · ${e.perioada} – Antreprenoria`, `${name}, ${e.perioada}: agenda atelierelor, traineri și antreprenori invitați, colegii de cohortă și partenerii.`, opt.brand)}
${header(F, ctx)}
<div class="gridlines" aria-hidden="true"></div>
${editionBody(ctx, F, e)}
${footer(F, ctx)}
<script src="/assets/site.js"></script>
</body></html>`;
}

// ---------- PROGRAM ----------
function renderProgram(opt = {}) {
  const ctx = load(opt.brand), F = facts(ctx);
  return `${head('Programul Antreprenoria – cum funcționează, pentru cine e, investiția', 'Cum arată o zi de atelier, formatul unei cohorte, metodologia, cui se adresează programul și cât costă. Acceleratorul Romanian Business Leaders, din 2013.', opt.brand)}
${header(F, ctx)}
<div class="gridlines" aria-hidden="true"></div>
${programBody(ctx, F)}
${footer(F, ctx)}
<script src="/assets/site.js"></script>
</body></html>`;
}

// ---------- 404 ----------
// adresa nu există: aceeași pagină cu meniu și footer, cu drumurile principale la îndemână
function render404(opt = {}) {
  const ctx = load(opt.brand), F = facts(ctx);
  const LINKS = [['/editii', 'Cohortele', 'în desfășurare, înscrieri și arhivă'], ['/lideri', 'Liderii', 'fondatori, CEO și traineri'], ['/comunitate', 'Comunitatea', 'antreprenorii care au trecut prin program'], ['/parteneri', 'Parteneri', 'parteneriate CSR'], ['/despre', 'Despre', 'organizatorul, echipa și contactul']];
  return `${head('Pagina nu există – Antreprenoria', 'Pagina căutată nu există sau s-a mutat.', opt.brand).replace('</head>', '<meta name="robots" content="noindex"></head>')}
${header(F, ctx)}
<div class="gridlines" aria-hidden="true"></div>
<main>
  <section class="hero pg-hero nf-hero"><div class="wrap">
    <p class="eyebrow">Eroare 404</p>
    <h1>Pagina asta nu există.</h1>
    <p class="lead">Poate s-a mutat sau adresa are o greșeală. Începe de aici:</p>
    <div class="hero-actions"><a class="btn btn-primary btn-lg" href="/">Acasă</a><a class="btn btn-ghost btn-lg" href="/aplica">Aplică</a></div>
    <nav class="nf-links" aria-label="Paginile principale">${LINKS.map(([h, t, s]) => `<a href="${h}"><b>${t} →</b><span>${s}</span></a>`).join('')}</nav>
  </div></section>
</main>
${footer(F, ctx)}
<script src="/assets/site.js"></script>
</body></html>`;
}

// ---------- DESPRE ----------
function renderDespre(opt = {}) {
  const ctx = load(opt.brand), F = facts(ctx);
  return `${head('Despre Antreprenoria – programul, istoricul, Romanian Business Leaders, echipa', 'Antreprenoria este programul de accelerare al Fundației Romanian Business Leaders, din 2013: istoricul cohortelor, organizatorul, echipa și contactul.', opt.brand)}
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
  const ctx = load(opt.brand), F = facts(ctx);
  return `${head('Curriculum-ul Antreprenoria – temele atelierelor', 'Cele cinci teme full-day ale programului (viziune, model de business, marketing, vânzări, cultură organizațională) și atelierele de seară, cohortă cu cohortă.', opt.brand)}
${header(F, ctx)}
<div class="gridlines" aria-hidden="true"></div>
${temeBody(ctx, F)}
${footer(F, ctx)}
<script src="/assets/site.js"></script>
</body></html>`;
}
// întoarce { html } pentru o temă full-day, { redirect } pentru una de seară, null dacă tema nu există
// ---------- TRAINERI ȘI INVITAȚI ----------
function renderTraineri(opt = {}) {
  const ctx = load(opt.brand), F = facts(ctx);
  return `${head('Lideri: fondatori, CEO și traineri – Antreprenoria', 'Fondatorii și CEO-ii invitați, trainerii și facilitatorii atelierelor Antreprenoria: companiile lor, temele, cohortele și atelierele ținute.', opt.brand)}
${header(F, ctx)}
<div class="gridlines" aria-hidden="true"></div>
${traineriBody(ctx, F)}
${footer(F, ctx)}
<script src="/assets/site.js"></script>
</body></html>`;
}
// întoarce null dacă omul nu există sau nu a ținut niciun atelier (serverul răspunde 404)
function renderTrainer(opt = {}) {
  const ctx = load(opt.brand), F = facts(ctx), d = personData(ctx, opt.id);
  if (!d) return null;
  const desc = `${d.p.nume}${d.org ? ', ' + d.org : ''}: ariile de expertiză, atelierele ținute la Antreprenoria și întrebări pe care i le poți pune.`;
  return `${head(`${d.p.nume} – Antreprenoria`, desc, opt.brand)}
${header(F, ctx)}
<div class="gridlines" aria-hidden="true"></div>
${trainerBody(ctx, F, opt.id)}
${footer(F, ctx)}
<script src="/assets/site.js"></script>
</body></html>`;
}

// ---------- LISTA EDIȚIILOR ----------
function renderEditii(opt = {}) {
  const ctx = load(opt.brand), F = facts(ctx);
  return `${head('Cohortele Antreprenoria – în desfășurare, înscrieri și arhivă', 'Toate cohortele programului Antreprenoria: cohorta în desfășurare, înscrierile deschise și arhiva cohortelor încheiate, cu participanții și atelierele lor.', opt.brand)}
${header(F, ctx)}
<div class="gridlines" aria-hidden="true"></div>
${editiiBody(ctx, F)}
${footer(F, ctx)}
<script src="/assets/site.js"></script>
</body></html>`;
}

// ---------- PARTENERI ----------
function renderParteneri(opt = {}) {
  const ctx = load(opt.brand), F = facts(ctx);
  return `${head('Parteneriate CSR – Antreprenoria: cresc antreprenorii, crește România', 'Un program de CSR cu impact măsurabil: sponsorizează un atelier, o cohortă sau un an din Antreprenoria. Vezi brandurile care au susținut programul din 2013 și construiește-ți parteneriatul.', opt.brand)}
${header(F, ctx)}
<div class="gridlines" aria-hidden="true"></div>
${parteneriBody(ctx, F)}
${footer(F, ctx)}
<script src="/assets/site.js"></script>
</body></html>`;
}

// ---------- ALUMNI ----------
function renderAlumni(opt = {}) {
  const ctx = load(opt.brand), F = facts(ctx);
  return `${head('Comunitatea Antreprenoria – antreprenorii care au trecut prin program', 'Comunitatea Antreprenoria: alumnii tuturor cohortelor, fiecare cu ce face și ce oferă. Caută după ce ai nevoie, explorează pe industrii și cere o conectare.', opt.brand)}
${header(F, ctx)}
<div class="gridlines" aria-hidden="true"></div>
${alumniBody(ctx, F, { sector: opt.sector, editie: opt.editie, q: opt.q })}
${footer(F, ctx)}
<script src="/assets/site.js"></script>
</body></html>`;
}
// pagina unui alumnus: doar cu profilul completat; opt.preview (doar local) o arată pentru oricine
function renderAlumnus(opt = {}) {
  const ctx = load(opt.brand), F = facts(ctx), a = alumniData(ctx).L.find((x) => x.id === opt.id);
  if (!a || (!a.page && !opt.preview)) return null;
  return `${head(`${a.nume} – comunitatea Antreprenoria`, `${a.nume}${a.org ? ', ' + a.org.nume : ''} · alumni Antreprenoria ${a.eds.map((e) => '#' + e.numar).join(', ')}. ${(a.desc || '').slice(0, 150)}`, opt.brand)}
${a.page ? '' : '<meta name="robots" content="noindex">'}
${header(F, ctx)}
<div class="gridlines" aria-hidden="true"></div>
${alumnusBody(ctx, F, opt.id, { preview: !a.page })}
${footer(F, ctx)}
<script src="/assets/site.js"></script>
</body></html>`;
}

function renderTema(opt = {}) {
  const ctx = load(opt.brand), F = facts(ctx), t = ctx.T[opt.id];
  if (!t) return null;
  if (t.format !== 'full-day') return { redirect: `/teme#${t.id}` };
  return { html: `${head(`${t.nume} – temă Antreprenoria`, `Atelierul full-day „${t.nume}”: cine l-a predat la fiecare cohortă, antreprenorii invitați, sponsorii și următoarea dată.`, opt.brand)}
${header(F, ctx)}
<div class="gridlines" aria-hidden="true"></div>
${temaBody(ctx, F, t.id)}
${footer(F, ctx)}
<script src="/assets/site.js"></script>
</body></html>` };
}

// ---------- APLICĂ ----------
function renderAplica(opt = {}) {
  const ctx = load(opt.brand), F = facts(ctx);
  return `${head('Aplică la Antreprenoria', 'Aplică la Atelierele Antreprenoria: programul pentru antreprenorii cu afaceri de peste 500.000 € care vor să scaleze. Aplicările sunt analizate de comitetul de selecție.', opt.brand)}
${header(F, ctx)}
<div class="gridlines" aria-hidden="true"></div>
${aplicaBody(ctx, F, opt)}
${footer(F, ctx, { mcta: false })}
<script src="/assets/site.js"></script>
<script src="/assets/aplica.js"></script>
</body></html>`;
}

// cohortele la care se poate aplica acum (pentru validarea de pe server)
const applyOptions = () => { const ctx = load(); return aplicaOptions(ctx, facts(ctx)); };

// indexul comunității pentru căutarea din meniu
const renderCommunityIndex = (opt = {}) => JSON.stringify(communityIndex(load(opt.brand)));

module.exports = { render404, renderCommunityIndex, renderHome, renderEdition, renderProgram, renderDespre, renderTeme, renderTema, renderTraineri, renderTrainer, renderAlumni, renderAlumnus, renderParteneri, renderEditii, renderAplica, applyOptions };
