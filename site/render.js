// Generatorul site-ului nou: pagini HTML construite din creier (data/entitati.json), fără framework.
// Pe site, cifrele de afaceri ale participanților apar doar agregat (mediane, intervale), niciodată per companie.
const fs = require('fs');
const path = require('path');
const brand = require('./brand');
const { megaMenu } = require('./menu');

const DATA = path.join(__dirname, '..', 'data', 'entitati.json');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const today = () => new Date().toISOString().slice(0, 10);
const MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
const fmtDay = (d) => { const [y, m, z] = d.split('-').map(Number); return `${z} ${MONTHS[m - 1]}`; };
const median = (arr) => { const a = arr.filter((x) => x != null).sort((x, y) => x - y); return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null; };
const quantile = (arr, q) => { const a = arr.filter((x) => x != null).sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) * q)] : null; };
const milLei = (n) => `${(n / 1e6).toLocaleString('ro-RO', { maximumFractionDigits: 1 })}`;
const initials = (n) => n.split(/[\s-]+/).map((x) => x[0]).slice(0, 2).join('');

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
<link rel="stylesheet" href="/assets/brand.css"><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/menu-icon.css"><link rel="icon" href="/manage/assets/logo-letter.png">
</head><body>`;
}
// butonul de meniu pe mobil: iconul (trei cercuri) și modul de culoare vin din data/brand.json › icon_meniu
function menuButton() {
  const I = brand.load().icon_meniu || { activ: 'mare-si-doua-mici', deschis: 'triunghi', culori: 'mono' };
  return `<button class="menu-btn mi-${esc(I.activ)} mo-${esc(I.deschis)} mc-${esc(I.culori)}" aria-label="Deschide meniul" aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span></button>`;
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
const avatar = (p, cls = '') => (p.imagine ? `<img class="${cls}" src="${esc(p.imagine)}" alt="${esc(p.nume)}" loading="lazy">` : `<span class="${cls} ph">${esc(initials(p.nume))}</span>`);

// ---------- HOMEPAGE ----------
function renderHome(opt = {}) {
  const ctx = load(), { D, P, O, T } = ctx, F = facts(ctx);
  const nextSpeakers = F.next ? F.next.program.flatMap((x) => x.speakeri).map((s) => P[s.persoana]).filter(Boolean) : [];
  const fullDay = D.teme.filter((t) => t.format === 'full-day');
  const evening = D.teme.filter((t) => t.format === 'seară' && t.ateliere >= 5);
  const themePeople = (t) => new Set(D.editii.flatMap((e) => e.ateliere.filter((a) => a.tema === t.id).flatMap((a) => a.program.flatMap((x) => x.speakeri.map((s) => s.persoana))))).size;
  const maxSector = F.sectors[0][1];
  const heroFaces = F.topTrainers.slice(0, 6);

  return `${head('Antreprenoria – acceleratorul antreprenorilor Romanian Business Leaders', 'Program de accelerare pentru companii în creștere: ateliere cu antreprenori de top, un grup selectat de colegi și comunitatea Romanian Business Leaders. Din 2013.', opt.brand)}
${header(F, ctx)}
<main>
  <section class="hero"><div class="wrap hero-in">
    <div class="hero-copy">
      <p class="eyebrow">Acceleratorul Romanian Business Leaders · din ${D.program.de_cand}</p>
      <h1>Crește-ți compania alături de antreprenorii care au făcut-o deja.</h1>
      <p class="lead">Trei luni, ateliere full-day și de seară cu lideri de business români, un grup selectat de colegi antreprenori și acces la comunitatea RBL.</p>
      <div class="hero-actions"><a class="btn btn-primary btn-lg" href="#potrivit">Verifică dacă ești potrivit</a><a class="btn btn-ghost btn-lg" href="/program">Cum funcționează</a></div>
      <ul class="hero-meta">
        ${F.ongoing ? `<li><b>Ediția #${F.ongoing.numar}</b> e în desfășurare · ${esc(F.ongoing.perioada)}</li>` : ''}
        ${F.cluj ? `<li><b>Antreprenoria Cluj #${F.cluj.numar}</b> · înscrieri deschise</li>` : ''}
        <li><b>Ediția #${F.maxNr + 1}</b> · intră pe lista de așteptare</li>
      </ul>
    </div>
    <div class="hero-visual" aria-hidden="true">
      <div class="faces">${heroFaces.map((p, i) => `<figure class="face f${i}">${avatar(p)}<figcaption>${esc(p.nume.split(' ')[0])}<small>${p.editii.length} ediții</small></figcaption></figure>`).join('')}</div>
      ${F.next ? `<div class="next-card"><span class="tag-live"><i></i>Următorul atelier</span>
        <b>${esc(F.next.titlu)}</b><span>${fmtDay(F.next.data)} · ${esc(F.next.locatie || '')}</span>
        <div class="next-people">${nextSpeakers.map((p) => avatar(p, 'mini')).join('')}<span>${nextSpeakers.map((p) => esc(p.nume)).join(', ')}</span></div></div>` : ''}
    </div>
  </div></section>

  <section class="proof"><div class="wrap proof-in">
    <div class="stat"><b data-count="${F.ani}">${F.ani}</b><span>ani de program</span></div>
    <div class="stat"><b data-count="${F.maxNr}">${F.maxNr}</b><span>ediții în București, plus Cluj</span></div>
    <div class="stat"><b data-count="${F.speakers}">${F.speakers}</b><span>traineri și antreprenori invitați din 2023</span></div>
    <div class="stat"><b data-count="${F.alumni}">${F.alumni}</b><span>companii în ultimele ${D.editii.filter((e) => e.participanti.length).length} ediții</span></div>
    <div class="stat"><b>${milLei(F.medianCa)}<em> mil. lei</em></b><span>cifra de afaceri mediană a participanților</span></div>
  </div></section>

  <section class="sec" id="cum"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Cum funcționează</p><h2>Un trimestru în care te uiți strategic la compania ta.</h2>
      <p class="lead">La fiecare atelier: dimineața training aplicat, după-amiaza antreprenori care povestesc cum au rezolvat exact problema despre care vorbiți. Seara, networking cu colegii.</p></div>
    <ol class="steps">
      ${D.program.metodologie.map((m, i) => `<li class="step"><span class="step-n">0${i + 1}</span><h3>${esc(m.titlu.charAt(0) + m.titlu.slice(1).toLowerCase())}</h3><p>${esc(m.puncte[0].replace(/;$/, '.').replace(/\bANTREPRENORI\b/g, 'antreprenori'))}</p></li>`).join('')}
    </ol>
  </div></section>

  <section class="sec sec-alt" id="teme"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Curriculum</p><h2>Cinci teme full-day, aceleași de ${D.teme.find((t) => t.id === 'viziune').editii.length} ediții încoace.</h2></div>
      <a class="link-arrow" href="/teme">Toate temele →</a></div>
    <div class="themes">
      ${fullDay.map((t, i) => `<a class="theme" href="/teme/${t.id}"><span class="theme-n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(t.nume)}</h3>
        <p>${themePeople(t)} traineri și antreprenori au susținut tema în ${t.editii.length} ediții.</p><span class="theme-go">→</span></a>`).join('')}
      <div class="theme theme-evening"><span class="theme-n">+</span><h3>Ateliere de seară</h3><p>${evening.map((t) => esc(t.nume)).join(' · ')}</p></div>
    </div>
  </div></section>

  <section class="sec" id="traineri"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Traineri și antreprenori invitați</p><h2>Oameni care vorbesc din ce trăiesc.</h2>
      <p class="lead">${F.constanti} dintre ei revin în cel puțin cinci ediții. Nu sunt invitați o dată, sunt parte din program.</p></div>
      <a class="link-arrow" href="/traineri">Toți cei ${F.speakers} →</a></div>
    <div class="people">
      ${F.topTrainers.map((p) => `<a class="person" href="/traineri/${p.id}">${avatar(p)}<b>${esc(p.nume)}</b><span>${esc(ctx.O[p.organizatii[0]]?.nume || p.functii[0] || '')}</span>
        <span class="person-ed">${p.editii.length} ediții · ${esc([...new Set(p.aparitii.map((a) => T[a.tema]?.nume).filter(Boolean))][0] || '')}</span></a>`).join('')}
    </div>
  </div></section>

  <section class="sec sec-dark" id="alumni"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Cine participă</p><h2>Companii reale, în creștere, din ${F.sectors.length} sectoare.</h2></div>
    <div class="alumni-grid">
      <div class="figures">
        <div class="fig"><b>${milLei(F.q1)}–${milLei(F.q3)}<em> mil. lei</em></b><span>cifra de afaceri a jumătății „de mijloc” a participanților</span></div>
        <div class="fig"><b>${F.medianAng}</b><span>angajați, la mediană</span></div>
        <div class="fig"><b>${F.participanti}</b><span>antreprenori și manageri în edițiile #16–#${F.maxNr}</span></div>
        <p class="fine">Cifre agregate din datele declarate la înscriere, edițiile 2023–2026.</p>
      </div>
      <div class="sectors">${F.sectors.slice(0, 9).map(([s, n]) => `<div class="sector"><span>${esc(s)}</span><i style="--w:${(n / maxSector) * 100}%"></i><b>${n}</b></div>`).join('')}</div>
    </div>
    <div class="cycle">
      <div class="cycle-copy"><p class="eyebrow">Din alumni, parteneri</p><h3>Vii ca participant. Revii ca partener.</h3>
        <p>${F.ciclu.length} companii care au trecut prin program s-au întors să sponsorizeze ateliere, să le găzduiască sau să trimită speakeri.</p></div>
      <div class="cycle-list">${F.ciclu.map((o) => `<div class="cycle-item">${o.logo ? `<img src="${esc(o.logo)}" alt="${esc(o.nume)}" loading="lazy">` : `<b>${esc(o.nume)}</b>`}
        <span>alumni #${esc(o.ciclu.alumni_din.split('-')[1])} → ${esc(o.ciclu.apoi.map((r) => r.replace(' atelier', '')).join(', '))}</span></div>`).join('')}</div>
    </div>
  </div></section>

  <section class="sec" id="editii"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Ediții</p><h2>Două ediții pe an. Toate rămân aici.</h2></div><a class="link-arrow" href="/editii">Arhiva edițiilor →</a></div>
    <div class="timeline">${F.editiiArhiva.map((e) => {
      const live = F.ongoing && e.id === F.ongoing.id, open = e.deschisa && !live;
      return `<a class="tl ${live ? 'is-live' : ''} ${open ? 'is-open' : ''}" href="/editii/${e.serie === 'Cluj' ? 'cluj-' + e.numar : e.numar}">
        <span class="tl-dot"></span><b>${e.serie === 'Cluj' ? `Cluj #${e.numar}` : `#${e.numar}`}</b><span>${esc(e.perioada.replace(' - ', '–'))}</span>
        <small>${live ? 'în desfășurare' : open ? 'înscrieri deschise' : `${e.participanti.length} participanți`}</small></a>`;
    }).join('')}
      <a class="tl is-next" href="/aplica"><span class="tl-dot"></span><b>#${F.maxNr + 1}</b><span>Următoarea ediție</span><small>listă de așteptare</small></a>
    </div>
  </div></section>

  <section class="sec sec-alt" id="potrivit"><div class="wrap fit">
    <div><p class="eyebrow">Pentru cine e</p><h2>Ești potrivit pentru Antreprenoria?</h2>
      <p class="lead">Selectăm în jur de 25 de antreprenori pe ediție, ca discuțiile să fie între oameni cu provocări asemănătoare. Trei întrebări îți spun dacă merită să aplici.</p>
      <ul class="checks"><li>Companie cu cifră de afaceri de peste 1 milion de euro</li><li>Sau peste 500.000 de euro, cu un avantaj competitiv inovativ</li><li>Un fondator sau manager care vrea să scaleze, nu doar să crească</li></ul></div>
    <form class="quiz" id="quiz" novalidate>
      <fieldset><legend>Cifra de afaceri anuală</legend>
        ${[['sub', 'Sub 500.000 €'], ['mid', '500.000 – 1 mil. €'], ['peste', 'Peste 1 mil. €']].map(([v, l]) => `<label><input type="radio" name="ca" value="${v}" required><span>${l}</span></label>`).join('')}</fieldset>
      <fieldset><legend>Rolul tău în companie</legend>
        ${[['fondator', 'Fondator / acționar'], ['manager', 'Manager de top'], ['altul', 'Alt rol']].map(([v, l]) => `<label><input type="radio" name="rol" value="${v}" required><span>${l}</span></label>`).join('')}</fieldset>
      <fieldset><legend>Ce vrei să rezolvi acum?</legend>
        ${[['vanzari', 'Vânzările'], ['echipa', 'Echipa și cultura'], ['strategie', 'Strategia și modelul de business'], ['finantare', 'Finanțarea']].map(([v, l]) => `<label><input type="radio" name="nevoie" value="${v}" required><span>${l}</span></label>`).join('')}</fieldset>
      <button class="btn btn-primary btn-lg" type="submit">Vezi rezultatul</button>
      <div class="quiz-out" id="quiz-out" role="status" aria-live="polite"></div>
    </form>
  </div></section>

  <section class="sec" id="parteneri"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Parteneri</p><h2>Companiile care fac posibil programul.</h2></div><a class="link-arrow" href="/parteneri">Sponsorizează un atelier →</a></div>
    <div class="logos">${F.partners.slice(0, 14).map((o) => `<div class="logo-cell"><img src="${esc(o.logo)}" alt="${esc(o.nume)}" loading="lazy"></div>`).join('')}</div>
  </div></section>

  <section class="cta-final"><div class="wrap cta-in">
    <h2>Cresc antreprenorii, crește România.</h2>
    <p>Ediția #${F.maxNr + 1} se formează acum. Lasă-ne datele și te anunțăm primul când se deschid înscrierile.</p>
    <div class="hero-actions"><a class="btn btn-light btn-lg" href="/aplica">Intră pe lista de așteptare</a>${F.cluj ? `<a class="btn btn-outline-light btn-lg" href="/editii/cluj-${F.cluj.numar}">Aplică la Cluj #${F.cluj.numar}</a>` : ''}</div>
  </div></section>
</main>
${footer()}
<script src="/assets/site.js"></script>
</body></html>`;
}

module.exports = { renderHome };
