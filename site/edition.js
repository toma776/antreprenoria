// Pagina unei ediții (/editii/22, /editii/cluj-1): același limbaj vizual ca homepage-ul.
// Hero cu progresul ediției, cifre, agenda pe ateliere (cu programul zilei), oamenii, colegii de ediție, ce include, parteneri.
// Cifrele de afaceri ale participanților apar doar agregat (interval, mediană), niciodată per companie.
const { esc, initials, milLei, fmtDay, today, median, quantile } = require('./util');

const DAY = 864e5;
const days = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / DAY);
const cap = (s) => String(s || '').replace(/(^|[.!?]\s+)(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const pluralDe = (n, one, many) => `${n} ${n === 1 ? one : (n % 100 === 0 || n % 100 >= 20 ? 'de ' : '') + many}`;
const avatar = (p, cls = '') => (p?.imagine ? `<img class="${cls}" src="${esc(p.imagine)}" alt="" loading="lazy">` : `<span class="${cls} ph">${esc(initials(p?.nume || '?'))}</span>`);
const edUrl = (e) => (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`);
const edLabel = (e) => (e.serie === 'Cluj' ? `Cluj #${e.numar}` : `#${e.numar}`);
const MON = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'noi', 'dec'];
const FORMAT = { 'full-day': 'Atelier full-day', 'seară': 'Atelier de seară', networking: 'Networking' };
// titlurile de pe site au prefixe de format („Atelier de Seară: …”); formatul apare separat
const cleanTitle = (t) => t.replace(/^(Atelier de Seară|COCKTAIL NETWORKING)\s*[-:]\s*/i, '');
const ICON_ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// pe site, o dată a unui atelier are uneori anul greșit (ex. #22, atelierul 5: 2025 în loc de 2026);
// pentru stare și ordine folosim ziua și luna din anul ediției (pe pagină anul oricum nu apare)
const fixDate = (e, a) => (a.data && e.an && !a.data.startsWith(String(e.an)) && Math.abs(Number(a.data.slice(0, 4)) - e.an) === 1 ? `${e.an}${a.data.slice(4)}` : a.data);

function findEdition(D, key) {
  const m = /^(cluj-)?(\d+)$/.exec(key || '');
  if (!m) return null;
  return D.editii.find((e) => e.serie === (m[1] ? 'Cluj' : 'București') && e.numar === Number(m[2])) || null;
}

function editionBody(ctx, F, e) {
  const { D, P, O, T } = ctx;
  const t0 = today();
  const ws = e.ateliere.map((a) => ({ ...a, data: fixDate(e, a) })).sort((a, b) => a.nr - b.nr);
  const dated = ws.filter((a) => a.data);
  const held = dated.filter((a) => a.data < t0);
  const next = dated.filter((a) => a.data >= t0).sort((a, b) => a.data.localeCompare(b.data))[0];
  const state = !dated.length ? (e.deschisa ? 'open' : 'past') : held.length === dated.length ? 'past' : held.length ? 'live' : e.deschisa ? 'open' : 'soon';
  const STATE = { live: ['În desfășurare', 'live'], open: ['Înscrieri deschise', 'open'], soon: ['Urmează', 'open'], past: ['Încheiată', 'done'] }[state];

  // oamenii ediției: cine a vorbit / va vorbi, la ce atelier
  const speakers = new Map();
  ws.forEach((a) => a.program.forEach((x) => x.speakeri.forEach((s) => {
    const p = P[s.persoana];
    if (!p) return;
    const org = O[s.organizatie]?.nume || (s.companie && s.companie !== 'Trainer' ? s.companie : '') || O[p.organizatii[0]]?.nume || '';
    const cur = speakers.get(p.id) || { p, rol: s.rol, org, ateliere: [] };
    if (!cur.ateliere.includes(a)) cur.ateliere.push(a);
    speakers.set(p.id, cur);
  })));
  const people = [...speakers.values()].sort((a, b) => (a.rol === 'trainer' ? 0 : 1) - (b.rol === 'trainer' ? 0 : 1) || a.ateliere[0].nr - b.ateliere[0].nr);
  const trainers = people.filter((x) => x.rol === 'trainer').length;

  // participanți: cifre doar agregate
  const part = e.participanti;
  const ca = part.map((p) => p.cifra_afaceri), ang = part.map((p) => p.angajati);
  const companies = new Set(part.map((p) => p.organizatie || p.nume));
  const sectors = {};
  [...companies].forEach((id) => { const s = O[id]?.sector; if (s) sectors[s] = (sectors[s] || 0) + 1; });
  const sectorList = Object.entries(sectors).sort((a, b) => b[1] - a[1]);
  const maxSector = sectorList[0]?.[1] || 1;

  // parteneri: partenerul strategic separat, sponsorii cu atelierul susținut
  const strategic = e.parteneri.filter((x) => x.rol === 'partener strategic').map((x) => O[x.organizatie]).filter(Boolean);
  const sponsorOf = (id) => ws.filter((a) => a.sponsor === id);
  const sponsors = [...new Set(e.parteneri.filter((x) => x.rol !== 'partener strategic').map((x) => x.organizatie))].map((id) => O[id]).filter(Boolean);
  const looking = ws.filter((a) => a.cauta_sponsor);

  // vecinii din arhivă
  const serie = D.editii.filter((x) => x.serie === e.serie).sort((a, b) => a.numar - b.numar);
  const i = serie.indexOf(e), prev = serie[i - 1], nextEd = serie[i + 1];
  const price = e.deschisa && state !== 'live' && state !== 'past' ? e.preturi.find((p) => !p.ascuns) : null;
  const fullDay = ws.filter((a) => a.format === 'full-day').length;

  const cols = (n) => (n <= 7 ? Math.max(n, 4) : [6, 5, 7, 4].find((c) => n % c === 0) || 6);
  const facesOf = (a) => a.program.flatMap((x) => x.speakeri).map((s) => P[s.persoana]).filter(Boolean);
  const faces = (list, max = 4) => `<span class="faces">${list.slice(0, max).map((p) => avatar(p)).join('')}</span>`;

  // ---------- hero ----------
  const nextIn = next ? days(t0, next.data) : null;
  const when = nextIn === 0 ? 'azi' : nextIn === 1 ? 'mâine' : nextIn != null ? `peste ${nextIn} zile` : '';
  const hero = `<section class="hero ed-hero"><div class="wrap">
    <nav class="crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><a href="/editii">Ediții</a><span>/</span><b>${esc(edLabel(e))}</b></nav>
    <div class="hero-split">
      <div class="hero-copy">
        <p class="eyebrow">Ediția ${esc(edLabel(e))} · ${esc(e.serie)} · ${esc(e.sezon)} ${e.an}</p>
        <h1>Antreprenoria ${e.serie === 'Cluj' ? 'Cluj ' : ''}<span class="ed-num">#${e.numar}</span></h1>
        <p class="lead">${esc(e.subtitlu || '')}</p>
        <div class="ed-meta">
          <span class="ed-badge ${STATE[1]}">${STATE[1] === 'live' ? '<i class="dot-live"></i>' : ''}${STATE[0]}</span>
          <span>${esc(e.perioada)}</span>
          ${e.locatii.filter((l) => l !== 'TBD')[0] ? `<span>${esc(e.locatii.filter((l) => l !== 'TBD')[0])}</span>` : ''}
        </div>
        <div class="hero-actions">
          ${state === 'live' || state === 'past'
            ? `<a class="btn btn-primary btn-lg" href="/aplica">Intră pe lista pentru #${F.maxNr + 1}</a><a class="btn btn-ghost btn-lg" href="#agenda">Vezi agenda</a>`
            : `<a class="btn btn-primary btn-lg" href="${esc(e.link_inscriere || '/aplica')}">Aplică la ${esc(edLabel(e))}</a><a class="btn btn-ghost btn-lg" href="#agenda">Vezi agenda</a>`}
        </div>
      </div>
      <aside class="ed-live" aria-label="Progresul ediției">
        <div class="ed-live-top"><span>${STATE[1] === 'live' ? '<i class="dot-live"></i>' : ''}${dated.length ? 'Progresul ediției' : 'Ediția pe scurt'}</span><span>${dated.length ? `${held.length} din ${ws.length} întâlniri` : esc(e.perioada)}</span></div>
        ${dated.length ? '' : '<!--'}<div class="ed-progress" role="img" aria-label="${held.length} din ${ws.length} întâlniri ținute">${ws.map((a) => `<i class="${a.data && a.data < t0 ? 'done' : next && a.id === next.id ? 'next' : ''}" title="${esc(cleanTitle(a.titlu))}"></i>`).join('')}</div>${dated.length ? '' : '-->'}
        ${next ? `<div class="ed-next">
          <span class="ask-kicker">Următoarea întâlnire · ${when}</span>
          <b>${esc(cleanTitle(next.titlu))}</b>
          <span>${fmtDay(next.data)} · ${esc(FORMAT[next.format] || next.format)}${next.locatie ? ' · ' + esc(next.locatie) : ''}</span>
          ${facesOf(next).length ? `<div class="ed-next-people">${faces(facesOf(next))}<small>${esc(facesOf(next).map((p) => p.nume).join(', '))}</small></div>` : ''}
        </div>` : state === 'past' ? `<div class="ed-next"><span class="ask-kicker">Ediția s-a încheiat</span><b>${plural(ws.length, 'întâlnire', 'întâlniri')}, ${plural(part.length, 'participant', 'participanți')}</b><span>Toată agenda rămâne mai jos.</span></div>`
        : `<div class="ed-next">
          <span class="ask-kicker">Înscrieri deschise</span>
          <b>${price ? esc(price.pret_text) : esc(e.perioada)}</b>
          <span>${esc(e.perioada)} · ${plural(ws.length, 'întâlnire', 'întâlniri')}${price?.nota ? ' · ' + esc(price.nota) : ''}</span>
          ${people.length ? `<div class="ed-next-people">${faces(people.map((x) => x.p), 5)}<small>${plural(people.length, 'trainer și invitat', 'traineri și invitați')} confirmați</small></div>` : ''}
        </div>`}
        <a class="ed-live-link" href="#agenda">Agenda completă ${ICON_ARROW}</a>
      </aside>
    </div>
  </div></section>`;

  // ---------- cifre ----------
  const stats = `<section class="proof"><div class="wrap proof-in">
    <div class="stat"><b><span data-count="${ws.length}">${ws.length}</span></b><span>întâlniri, din care ${fullDay} ateliere full-day</span></div>
    <div class="stat"><b><span data-count="${people.length}">${people.length}</span></b><span>traineri și antreprenori invitați</span></div>
    ${part.length ? `<div class="stat"><b><span data-count="${part.length}">${part.length}</span></b><span>participanți din ${plural(companies.size, 'companie', 'companii')}</span></div>`
      : `<div class="stat"><b>~<span data-count="25">25</span></b><span>locuri, pentru antreprenori selectați</span></div>`}
    ${ca.filter(Boolean).length >= 5 ? `<div class="stat"><b><span data-count="${(median(ca) / 1e6).toFixed(1)}" data-dec="1">${milLei(median(ca))}</span><em> mil. lei</em></b><span>cifra de afaceri mediană a companiilor participante</span></div>` : ''}
    ${sectorList.length ? `<div class="stat"><b><span data-count="${sectorList.length}">${sectorList.length}</span></b><span>sectoare de activitate</span></div>` : ''}
    ${!part.length && price ? `<div class="stat"><b><span data-count="${price.pret}">${price.pret}</span><em> lei</em></b><span>+ TVA, taxa de participare${price.nota ? ' · ' + esc(price.nota.toLowerCase().replace(/\.$/, '')) : ''}</span></div>` : ''}
  </div></section>`;

  // ---------- agenda ----------
  const agenda = `<section class="sec" id="agenda"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Agenda</p><h2>${plural(ws.length, 'întâlnire', 'întâlniri')}, de la viziune la petrecerea de final.</h2>
      <p class="lead">Fiecare atelier full-day are aceeași structură: dimineața training, după-amiaza doi antreprenori care povestesc cum au făcut, seara networking.</p></div></div>
    <div class="agenda">${ws.map((a) => {
      const st = a.data && a.data < t0 ? 'done' : next && a.id === next.id ? 'next' : '';
      const ppl = facesOf(a), sp = a.sponsor && O[a.sponsor];
      const [, m, d] = (a.data || '--').split('-');
      return `<details class="ag-item ${st}" ${st === 'next' ? 'open' : ''}>
        <summary>
          <span class="ag-n">${String(a.nr).padStart(2, '0')}</span>
          <span class="ag-date">${a.data ? `<b>${Number(d)}</b><span>${MON[Number(m) - 1]}</span>` : `<b>${a.nr}</b><span>atelier</span>`}</span>
          <span class="ag-main"><b>${esc(cleanTitle(a.titlu))}</b><span>${esc(FORMAT[a.format] || a.format)}${a.locatie && a.locatie !== 'TBD' ? ' · ' + esc(a.locatie) : ''}${sp ? ' · susținut de ' + esc(sp.nume) : ''}</span></span>
          <span class="ag-people">${ppl.length ? faces(ppl, 3) : ''}</span>
          <span class="ag-tag ${st}">${st === 'done' ? 'ținut' : st === 'next' ? (when || 'următorul') : 'programat'}</span>
          <span class="ag-chev" aria-hidden="true"></span>
        </summary>
        <div class="ag-body">
          <div class="ag-desc">
            ${a.descriere ? `<p>${esc(cap(a.descriere))}</p>` : ''}
            ${a.tema && T[a.tema] ? `<a class="link-arrow" href="/teme/${esc(a.tema)}">Despre tema „${esc(T[a.tema].nume)}” →</a>` : ''}
            ${sp ? `<div class="ag-sponsor"><span>Atelier susținut de</span>${sp.logo ? `<img src="${esc(sp.logo)}" alt="${esc(sp.nume)}" loading="lazy">` : `<b>${esc(sp.nume)}</b>`}</div>`
              : a.cauta_sponsor ? `<a class="ag-sponsor ag-sponsor-free" href="/parteneri"><span>Atelierul caută un sponsor</span><b>Susține-l →</b></a>` : ''}
          </div>
          ${a.program.length ? `<ol class="ag-program">${a.program.map((x) => `<li class="${x.speakeri.length ? 'has-people' : ''}">
            <time>${esc(x.interval)}</time>
            <div><b>${esc(x.activitate)}</b>${x.speakeri.map((s) => { const p = P[s.persoana]; return p ? `<a class="ag-speaker" href="/traineri/${esc(p.id)}">${avatar(p)}<span><b>${esc(p.nume)}</b><small>${esc(s.rol === 'trainer' ? 'Trainer' : 'Antreprenor invitat')}${s.companie && s.companie !== 'Trainer' ? ' · ' + esc(O[s.organizatie]?.nume || s.companie) : ''}</small></span></a>` : ''; }).join('')}</div>
          </li>`).join('')}</ol>` : ''}
        </div>
      </details>`;
    }).join('')}</div>
  </div></section>`;

  // ---------- oamenii ediției ----------
  const peopleSec = people.length ? `<section class="sec sec-alt" id="oameni"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Traineri și antreprenori invitați</p><h2>${plural(people.length, 'om', 'oameni')} care vorbesc din ce au trăit.</h2>
      <p class="lead">${plural(trainers, 'trainer', 'traineri')} pentru partea aplicată și ${plural(people.length - trainers, 'antreprenor invitat', 'antreprenori invitați')} care povestesc cum au rezolvat exact problema zilei.</p></div>
      <a class="link-arrow" href="/traineri">Toți trainerii →</a></div>
    ${[['Traineri', people.filter((x) => x.rol === 'trainer')], ['Antreprenori invitați', people.filter((x) => x.rol !== 'trainer')]].filter(([, l]) => l.length).map(([h, list]) => `
    <h3 class="ed-people-h">${h} <span>${list.length}</span></h3>
    <div class="ed-people" style="--n:${cols(list.length)}">${list.map((x) => `<a class="ed-person" href="/traineri/${esc(x.p.id)}">
      ${avatar(x.p)}
      <span class="ed-role ${x.rol === 'trainer' ? 'tr' : ''}">${x.rol === 'trainer' ? 'Trainer' : 'Invitat'}</span>
      <b>${esc(x.p.nume)}</b><span>${esc(x.org)}</span>
      <small>${x.ateliere.map((a) => esc(cleanTitle(a.titlu))).join(' · ')}</small>
    </a>`).join('')}</div>`).join('')}
  </div></section>` : '';

  // ---------- colegii de ediție ----------
  const partSec = part.length ? `<section class="sec sec-dark" id="participanti"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Colegii de ediție</p><h2>${plural(part.length, 'antreprenor', 'antreprenori și manageri')}, ${plural(sectorList.length, 'sector', 'sectoare')}.</h2></div>
    <div class="alumni-grid">
      <div class="figures">
        ${ca.filter(Boolean).length >= 5 ? `<div class="fig"><b>${milLei(quantile(ca, 0.25))}–${milLei(quantile(ca, 0.75))}<em> mil. lei</em></b><span>cifra de afaceri a jumătății „de mijloc” a companiilor</span></div>` : ''}
        ${ang.filter(Boolean).length >= 5 ? `<div class="fig"><b><span data-count="${median(ang)}">${median(ang)}</span></b><span>angajați, la mediană</span></div>` : ''}
        <div class="fig"><b><span data-count="${companies.size}">${companies.size}</span></b><span>companii</span></div>
        <p class="fine">Cifre agregate din datele declarate la înscriere. Nu publicăm date financiare per companie.</p>
      </div>
      <div class="sectors">${sectorList.slice(0, 9).map(([s, n]) => `<div class="sector"><span>${esc(s)}</span><i style="--w:${(n / maxSector) * 100}%"></i><b>${n}</b></div>`).join('')}</div>
    </div>
    <div class="ed-parts">${part.map((p) => { const o = O[p.organizatie]; return `<div class="ed-part">${avatar({ nume: p.nume, imagine: p.imagine })}<span><b>${esc(p.nume)}</b><span>${esc(o?.nume || '')}</span>${o?.sector ? `<small>${esc(o.sector)}</small>` : ''}</span></div>`; }).join('')}</div>
  </div></section>` : '';

  // ---------- ce include ----------
  const benefits = e.beneficii.map((b) => { const m = /^(\d+)\s+(.*)$/.exec(b.trim()); return m ? [m[1], m[2]] : ['1', b]; });
  const includes = e.beneficii.length || e.metodologie.length ? `<section class="sec" id="include"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Ce include ediția</p><h2>Un trimestru întreg, nu o conferință.</h2>
      ${e.valoare_estimata || price ? `<p class="lead">${e.valoare_estimata ? esc(e.valoare_estimata) + '. ' : ''}${price ? `Taxa de participare: <b>${esc(price.pret_text)}</b>${price.nota ? ` (${esc(price.nota.replace(/\.$/, '').toLowerCase())})` : ''}.` : ''}</p>` : ''}</div></div>
    ${benefits.length ? `<div class="benefits">${benefits.map(([n, t]) => `<div class="benefit"><b>${esc(n)}</b><span>${esc(t.replace(/success/i, 'succes'))}</span></div>`).join('')}</div>` : ''}
    ${e.metodologie.length ? `<ol class="steps ed-steps">${e.metodologie.map((m, k) => `<li class="step"><span class="step-n">0${k + 1}</span><h3>${esc(m.titlu.charAt(0) + m.titlu.slice(1).toLowerCase())}</h3>
      <ul>${m.puncte.map((x) => `<li>${esc(x.replace(/;$/, '.').replace(/\bANTREPRENORI\b/g, 'antreprenori').replace(/provocarile/g, 'provocările'))}</li>`).join('')}</ul></li>`).join('')}</ol>` : ''}
  </div></section>` : '';

  // ---------- parteneri ----------
  const partners = strategic.length || sponsors.length ? `<section class="sec sec-alt" id="parteneri"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Partenerii ediției</p><h2>Companiile care fac posibilă ediția ${esc(edLabel(e))}.</h2></div>
      <a class="link-arrow" href="/parteneri">Sponsorizează un atelier →</a></div>
    <div class="ed-partners">
      ${strategic.map((o) => `<div class="ed-strategic"><span class="ask-kicker">Partener strategic</span>${o.logo ? `<img src="${esc(o.logo)}" alt="${esc(o.nume)}" loading="lazy">` : `<b>${esc(o.nume)}</b>`}<p>${esc(o.nume)} susține toată ediția${sponsorOf(o.id).length ? ` și atelierul „${esc(cleanTitle(sponsorOf(o.id)[0].titlu))}”` : ''}.</p></div>`).join('')}
      <div class="ed-sponsors">${sponsors.filter((o) => !strategic.includes(o)).map((o) => `<div class="ed-sponsor"><div class="logo-cell">${o.logo ? `<img src="${esc(o.logo)}" alt="${esc(o.nume)}" loading="lazy">` : `<b>${esc(o.nume)}</b>`}</div>
        <span>${sponsorOf(o.id).map((a) => esc(cleanTitle(a.titlu))).join(' · ') || 'Sponsor'}</span></div>`).join('')}
        ${looking.map((a) => `<a class="ed-sponsor ed-sponsor-free" href="/parteneri"><div class="logo-cell">Locul tău aici</div><span>${esc(cleanTitle(a.titlu))} caută sponsor</span></a>`).join('')}
      </div>
    </div>
  </div></section>` : '';

  // ---------- final ----------
  const cta = `<section class="cta-band"><div class="wrap cta-band-in">
    <div class="cta-band-copy">
      <p class="eyebrow">${state === 'live' || state === 'past' ? `Ediția #${F.maxNr + 1}` : `Ediția ${esc(edLabel(e))}`}</p>
      <h2>${state === 'live' || state === 'past' ? 'Vrei în următoarea grupă?' : 'Locurile sunt limitate.'}</h2>
      <p>${state === 'live' || state === 'past' ? 'Următoarea ediție din București se formează acum. Lasă-ne datele și te anunțăm primul când se deschid înscrierile.' : `În jur de 25 de antreprenori pe ediție, selectați ca discuțiile să fie între oameni cu provocări asemănătoare.`}</p>
      <div class="hero-actions">${state === 'live' || state === 'past' ? `<a class="btn btn-light btn-lg" href="/aplica">Intră pe lista de așteptare</a>` : `<a class="btn btn-light btn-lg" href="${esc(e.link_inscriere || '/aplica')}">Aplică acum</a>`}${F.cluj && F.cluj.id !== e.id ? `<a class="btn btn-outline-light btn-lg" href="${edUrl(F.cluj)}">Aplică la Cluj #${F.cluj.numar}</a>` : ''}</div>
    </div>
    <nav class="ed-nav" aria-label="Alte ediții">
      ${prev ? `<a href="${edUrl(prev)}"><span>← Ediția anterioară</span><b>${esc(edLabel(prev))}</b><small>${esc(prev.perioada)} · ${plural(prev.participanti.length, 'participant', 'participanți')}</small></a>` : ''}
      ${nextEd ? `<a href="${edUrl(nextEd)}"><span>Ediția următoare →</span><b>${esc(edLabel(nextEd))}</b><small>${esc(nextEd.perioada)}</small></a>`
        : e.serie === 'București' ? `<a href="/aplica"><span>Ediția următoare →</span><b>#${e.numar + 1}</b><small>listă de așteptare</small></a>` : ''}
      <a class="ed-nav-all" href="/editii"><span>Arhiva</span><b>Toate edițiile</b><small>${F.maxNr} ediții în București din ${D.program.de_cand}, plus Cluj</small></a>
    </nav>
  </div></section>`;

  if (state === 'past') return pastBody();
  return `<main>${hero}${stats}${agenda}${peopleSec}${partSec}${includes}${partners}${cta}</main>`;

  // ---------- ediție încheiată: aceeași informație, compactată ----------
  // hero cu „ediția în cifre” (fără bandă de cifre separată), agenda ca rânduri închise cu vorbitorii în clar,
  // oamenii, colegii și partenerii într-un singur bloc cu tab-uri; fără textele de vânzare (ce include, metodologie)
  function pastBody() {
    const loc = e.locatii.filter((l) => l !== 'TBD')[0];
    const topSectors = sectorList.slice(0, 4);
    const heroPast = `<section class="hero ed-hero ed-past"><div class="wrap">
      <nav class="crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><a href="/editii">Ediții</a><span>/</span><b>${esc(edLabel(e))}</b></nav>
      <div class="hero-split">
        <div class="hero-copy">
          <p class="eyebrow">Arhivă · ${esc(e.serie)} · ${esc(e.sezon)} ${e.an}</p>
          <h1>Antreprenoria ${e.serie === 'Cluj' ? 'Cluj ' : ''}<span class="ed-num">#${e.numar}</span></h1>
          <p class="lead">${pluralDe(ws.length, 'întâlnire', 'întâlniri')}, ${pluralDe(people.length, 'trainer și invitat', 'traineri și invitați')}, ${pluralDe(part.length, 'antreprenor', 'antreprenori')} din ${pluralDe(companies.size, 'companie', 'companii')}.</p>
          <div class="ed-meta"><span class="ed-badge done">Încheiată</span><span>${esc(e.perioada)}</span>${loc ? `<span>${esc(loc)}</span>` : ''}</div>
          <div class="hero-actions"><a class="btn btn-ghost btn-lg" href="#agenda">Agenda</a><a class="btn btn-ghost btn-lg" href="#oameni">Oamenii ediției</a></div>
        </div>
        <aside class="ed-live ed-sum" aria-label="Ediția în cifre">
          <div class="ed-live-top"><span>Ediția în cifre</span><span>${esc(e.perioada)}</span></div>
          <dl class="ed-figs">
            <div><dt>Întâlniri</dt><dd>${ws.length}</dd><small>${fullDay} full-day</small></div>
            <div><dt>Traineri și invitați</dt><dd>${people.length}</dd><small>${trainers} traineri</small></div>
            <div><dt>Participanți</dt><dd>${part.length}</dd><small>${plural(companies.size, 'companie', 'companii')}</small></div>
            ${ca.filter(Boolean).length >= 5 ? `<div><dt>CA mediană</dt><dd>${milLei(median(ca))}<em> mil. lei</em></dd><small>${median(ang) ? `${median(ang)} angajați, la mediană` : ''}</small></div>` : ''}
          </dl>
          ${topSectors.length ? `<div class="ed-sum-sec"><span>Sectoare</span>${topSectors.map(([s, n]) => `<em>${esc(s)} · ${n}</em>`).join('')}${sectorList.length > 4 ? `<em>+${sectorList.length - 4}</em>` : ''}</div>` : ''}
          <p class="ed-sum-note">Cifre agregate din datele declarate la înscriere.</p>
        </aside>
      </div>
    </div></section>`;

    const agendaPast = `<section class="sec ed-past-sec" id="agenda"><div class="wrap">
      <div class="sec-head row"><div><p class="eyebrow">Agenda</p><h2>Ce s-a discutat.</h2></div><span class="ed-hint">Deschide un atelier pentru descriere și programul zilei.</span></div>
      <div class="agenda ag-compact">${ws.map((a) => {
        const ppl = facesOf(a), sp = a.sponsor && O[a.sponsor];
        const [, m, d] = (a.data || '--').split('-');
        return `<details class="ag-item">
          <summary>
            <span class="ag-date">${a.data ? `<b>${Number(d)}</b><span>${MON[Number(m) - 1]}</span>` : `<b>${a.nr}</b><span>atelier</span>`}</span>
            <span class="ag-main"><b>${esc(cleanTitle(a.titlu))}</b><span>${ppl.length ? esc(ppl.map((p) => p.nume).join(', ')) : esc(FORMAT[a.format] || a.format)}</span></span>
            <span class="ag-people">${ppl.length ? faces(ppl, 3) : ''}</span>
            <span class="ag-tag">${esc({ 'full-day': 'full-day', 'seară': 'seară', networking: 'networking' }[a.format] || a.format)}</span>
            <span class="ag-chev" aria-hidden="true"></span>
          </summary>
          <div class="ag-body">
            <div class="ag-desc">
              ${a.descriere ? `<p>${esc(cap(a.descriere))}</p>` : ''}
              ${a.tema && T[a.tema] ? `<a class="link-arrow" href="/teme/${esc(a.tema)}">Despre tema „${esc(T[a.tema].nume)}” →</a>` : ''}
              ${sp ? `<div class="ag-sponsor"><span>Atelier susținut de</span>${sp.logo ? `<img src="${esc(sp.logo)}" alt="${esc(sp.nume)}" loading="lazy">` : `<b>${esc(sp.nume)}</b>`}</div>` : ''}
            </div>
            ${a.program.length ? `<ol class="ag-program">${a.program.map((x) => `<li class="${x.speakeri.length ? 'has-people' : ''}"><time>${esc(x.interval)}</time>
              <div><b>${esc(x.activitate)}</b>${x.speakeri.map((s) => { const p = P[s.persoana]; return p ? `<a class="ag-speaker" href="/traineri/${esc(p.id)}">${avatar(p)}<span><b>${esc(p.nume)}</b><small>${esc(s.rol === 'trainer' ? 'Trainer' : 'Antreprenor invitat')}${s.companie && s.companie !== 'Trainer' ? ' · ' + esc(O[s.organizatie]?.nume || s.companie) : ''}</small></span></a>` : ''; }).join('')}</div></li>`).join('')}</ol>` : ''}
          </div>
        </details>`;
      }).join('')}</div>
    </div></section>`;

    const allPartners = [...strategic, ...sponsors.filter((o) => !strategic.includes(o))];
    const TABS = [
      ['vorbitori', 'Traineri și invitați', people.length, `<div class="ed-chips">${people.map((x) => `<a class="ed-chip" href="/traineri/${esc(x.p.id)}">${avatar(x.p)}<span><b>${esc(x.p.nume)}</b><span>${esc(x.org)}</span><small>${x.rol === 'trainer' ? '<i>Trainer</i> ' : ''}${x.ateliere.map((a) => esc(cleanTitle(a.titlu))).join(' · ')}</small></span></a>`).join('')}</div>`],
      ['colegi', 'Colegii de ediție', part.length, `${ca.filter(Boolean).length >= 5 ? `<p class="ed-agg">Jumătatea „de mijloc” a companiilor: <b>${milLei(quantile(ca, 0.25))}–${milLei(quantile(ca, 0.75))} mil. lei</b> cifră de afaceri${median(ang) ? `, <b>${median(ang)}</b> angajați la mediană` : ''}. ${sectorList.length ? `Sectoare: ${sectorList.slice(0, 5).map(([s, n]) => `${esc(s)} (${n})`).join(', ')}${sectorList.length > 5 ? ` și încă ${sectorList.length - 5}` : ''}.` : ''}</p>` : ''}
        <div class="ed-chips">${part.map((p) => { const o = O[p.organizatie]; return `<div class="ed-chip">${avatar({ nume: p.nume, imagine: p.imagine })}<span><b>${esc(p.nume)}</b><span>${esc(o?.nume || '')}</span>${o?.sector ? `<small>${esc(o.sector)}</small>` : ''}</span></div>`; }).join('')}</div>`],
      ['parteneri', 'Parteneri', allPartners.length, `<div class="ed-logos">${allPartners.map((o) => `<div class="ed-logo"><div class="logo-cell">${o.logo ? `<img src="${esc(o.logo)}" alt="${esc(o.nume)}" loading="lazy">` : `<b>${esc(o.nume)}</b>`}</div><span>${strategic.includes(o) ? 'Partener strategic' : sponsorOf(o.id).map((a) => esc(cleanTitle(a.titlu))).join(' · ') || 'Partener'}</span></div>`).join('')}</div>`],
    ].filter((t) => t[2]);
    const peoplePast = TABS.length ? `<section class="sec sec-alt ed-past-sec" id="oameni"><div class="wrap">
      <div class="sec-head"><p class="eyebrow">Oamenii ediției</p><h2>Cine a fost în sală.</h2></div>
      <div class="ed-tabs" data-tabs>
        <div class="ed-tablist" role="tablist" aria-label="Oamenii ediției">${TABS.map(([k, l, n], j) => `<button role="tab" data-tab="${k}" aria-selected="${j === 0}" aria-controls="tab-${k}">${l}<em>${n}</em></button>`).join('')}</div>
        ${TABS.map(([k, , , html], j) => `<div class="ed-tabpanel" role="tabpanel" id="tab-${k}" data-panel="${k}" ${j ? 'hidden' : ''}>${html}</div>`).join('')}
      </div>
    </div></section>` : '';

    return `<main>${heroPast}${agendaPast}${peoplePast}${cta}</main>`;
  }
}

module.exports = { editionBody, findEdition, edLabel };
