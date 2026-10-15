// Despre (varianta unită cu Program; previzualizare: /previzualizare/despre).
// Drumul unui antreprenor care se decide: promisiunea și cifrele, ce primește, cum arată o zi și o cohortă,
// dacă e potrivit, cât costă, dovada (istoricul), cine e în spate, aplicarea. Fiecare informație apare o singură dată.
// Profilul participanților apare doar agregat.
const fs = require('fs'), path = require('path');
const { esc, initials, milLei, img, de } = require('./util');
const { tx } = require('./texte');

const plural = (n, one, many) => `${n} ${n === 1 ? one : (n % 100 === 0 || n % 100 >= 20 ? 'de ' : '') + many}`;
const avatar = (p, w = 128) => (p?.imagine ? `<img src="${esc(img(p.imagine, w))}" alt="" loading="lazy">` : `<span class="ph">${esc(initials(p?.nume || '?'))}</span>`);
const edUrl = (e) => (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`);
const cleanTitle = (t) => String(t || '').replace(/^(Atelier de Seară|COCKTAIL NETWORKING)\s*[-:]\s*/i, '');
const sentence = (s) => { s = String(s || '').trim(); return s.charAt(0).toUpperCase() + s.slice(1); };
const mins = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const firstSentence = (d) => { let t = String(d || '').trim(); if (t && t === t.toUpperCase()) t = t.toLowerCase(); t = (t.match(/^[^.!?]+[.!?]/) || [t])[0]; return sentence(t); };
const lower = (s) => s.charAt(0) + s.slice(1).toLowerCase();
const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ROLE = { trainer: 'Trainer', 'antreprenor invitat': 'Antreprenor invitat' };

function despre2Body(ctx, F) {
  const { D, P, O, T } = ctx;
  const prog = D.program;
  const ong = F.ongoing || D.editii.filter((e) => e.serie === 'București').sort((a, b) => b.numar - a.numar)[0];
  const ws = ong.ateliere.slice().sort((a, b) => a.nr - b.nr);
  const byFormat = (f) => ws.filter((a) => a.format === f);
  const fullDay = byFormat('full-day'), evening = byFormat('seară'), networking = byFormat('networking');
  const mastermind = evening.filter((a) => a.tema === 'mastermind'), eveningOther = evening.filter((a) => a.tema !== 'mastermind');
  const cifra = (k) => (prog.cifre.find((c) => c.ce.includes(k)) || {}).valoare || '';

  // o zi de atelier: primul full-day al cohortei curente cu programul complet
  const day = fullDay.find((a) => a.program.length >= 5) || fullDay[0];
  const blocks = (day?.program || []).map((x) => { const [a, b] = x.interval.split('-').map((s) => s.trim()); return { ...x, from: a, to: b, len: mins(b) - mins(a) }; }).filter((x) => x.len > 0);
  const total = blocks.reduce((n, x) => n + x.len, 0) || 1;
  const kind = (x) => (/training/i.test(x.activitate) ? 'train' : /vorbitor|prezentare|speaker/i.test(x.activitate) ? 'talk' : /networking/i.test(x.activitate) ? 'net' : 'break');
  const KIND_LABEL = { train: 'Training aplicat', talk: 'Antreprenor invitat', net: 'Networking', break: 'Pauză' };

  // pentru cine e: criteriile din textul de audiență
  const criterii = [['Peste 1 milion €', 'cifră de afaceri anuală'], ['Peste 500.000 €', 'cu un avantaj competitiv inovativ'], ['Sub 500.000 €', 'dacă e fondată de antreprenori seniori, cu o investiție semnificativă']];
  const maxSector = F.sectors[0]?.[1] || 1;
  const byName = new Map(D.organizatii.map((o) => [o.nume.toLowerCase(), o]));
  // companiile care au crescut cu programul: doar participanți confirmați în cohortele încheiate (nu și în cea în desfășurare);
  // cele menționate pe site-ul vechi și confirmate în date, plus cele cu logo; întâi cele cu logo
  const closed = D.editii.filter((e) => /închis|încheiat/i.test(e.status || ''));
  const inClosed = (o) => !!o && closed.some((e) => e.participanti.some((p) => p.organizatie === o.id));
  const LOGO_FILES = Object.fromEntries((() => { try { return fs.readdirSync(path.join(__dirname, 'assets', 'logos')); } catch { return []; } })().map((f) => [f.replace(/\.[a-z]+$/, ''), f]));
  const caMax = (o) => Math.max(0, ...closed.flatMap((e) => e.participanti.filter((p) => p.organizatie === o.id).map((p) => p.cifra_afaceri || 0)));
  const logoOf = (o) => o.logo || (LOGO_FILES[o.id] ? `/assets/logos/${LOGO_FILES[o.id]}` : null);
  const alumni = D.organizatii.filter((o) => logoOf(o) && inClosed(o)).map((o) => ({ ...o, logo: logoOf(o) }))
    // ordinea: după mărimea companiei (cifra de afaceri declarată decide doar ordinea, nu se afișează)
    .sort((a, b) => caMax(b) - caMax(a));

  // investiția
  const priced = D.editii.filter((e) => e.deschisa).map((e) => ({ e, p: e.preturi.find((x) => !x.ascuns) })).filter((x) => x.p);
  const benefits = (ong.beneficii.length ? ong.beneficii : D.editii.find((e) => e.beneficii.length)?.beneficii || []).map((b) => { const m = /^(\d+)\s+(.*)$/.exec(b.trim()); return m ? [m[1], m[2].replace(/success/i, 'succes')] : ['1', b]; });
  const valoare = ong.valoare_estimata || D.editii.find((e) => e.valoare_estimata)?.valoare_estimata;

  // dovada: arhiva din București și cifrele ei
  const arhiva = D.editii.filter((e) => e.serie === 'București' && (e.ateliere.length || e.participanti.length)).sort((a, b) => a.numar - b.numar);
  const first = arhiva[0];
  const speakers = D.oameni.filter((p) => p.aparitii.length).length;
  // casetele din linia cohortelor: aceeași structură pentru toate (orașul, doar la Cluj; numărul; sezonul; starea)
  const lastB = D.editii.filter((e) => e.serie === 'București').sort((x, y) => y.numar - x.numar)[0];
  const nextSez = lastB ? (lastB.sezon === 'toamnă' ? `primăvară ${lastB.an + 1}` : `toamnă ${lastB.an}`) : 'în curând';
  const histBox = (href, oras, nr, sezon, stare, cls) => `<a class="hist-ed ${cls}" href="${esc(href)}"><em>${esc(oras)}</em><b>${esc(nr)}</b><span>${esc(sezon)}</span><small>${esc(stare)}</small></a>`;
  const rblLogo = (prog.logouri || []).find((l) => l.id === 'rbl-logo-oficial');
  const team = Object.fromEntries(prog.contact.echipa.map((p) => [p.id, p]));
  const raluca = team['raluca-bedereag'];
  const roleShort = (r) => r.split(' · ')[0].replace(/\s*\(.*\)$/, '');

  const NAV = [['de-ce', 'Ce primești'], ['cum', 'Cum funcționează'], ['pentru-cine', 'Ești potrivit?'], ['investitie', 'Investiția'], ['istoric', 'Din 2013'], ['echipa', 'Cine e în spate']];

  return `<main class="x">
  <!-- promisiunea și cifrele cheie -->
  <section class="x-hero dx-hero">
    <div class="x-aurora" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="x-grid" aria-hidden="true"></div>
    <div class="wrap x-hero-in">
      <div class="x-copy">
        <nav class="crumbs dx-crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><b>Despre</b></nav>
        <p class="x-eyebrow"><span class="x-chip">Acceleratorul Romanian Business Leaders</span><span>din ${prog.de_cand}</span></p>
        <h1>${esc(tx(D, 'program.titlu'))}</h1>
        <p class="x-lead">${esc(sentence(prog.descriere || '').replace(/\s*–\s*/g, ': ').split('. ')[0].split(': ')[0].replace(/\.?$/, '.'))}</p>
        <div class="x-actions"><a class="x-btn x-btn-glow" href="/aplica">Aplică pentru un loc ${ARROW}</a><a class="x-btn x-btn-glass" href="#pentru-cine">Ești potrivit?</a></div>
      </div>
      <aside class="x-glass dx-glance" aria-label="Pe scurt">
        <span class="x-k">O cohortă, pe scurt</span>
        <dl>
          <div><dt>3 luni</dt><dd>${esc(ong.perioada.replace(/\s*-\s*/, '–'))}</dd></div>
          <div><dt>${ws.length}</dt><dd>întâlniri: ${fullDay.length} full-day, ${evening.length} de seară, plus petrecerea de final</dd></div>
          <div><dt>~25</dt><dd>de antreprenori selectați, între egali</dd></div>
          <div><dt>${speakers}</dt><dd>${de(speakers)}lideri care predau din ce au construit</dd></div>
        </dl>
        <div class="dx-proof"><b>${esc(cifra('IMM'))}</b><span>companii au trecut prin programele RBL din ${prog.de_cand}</span></div>
      </aside>
    </div>
  </section>
  <nav class="pg-nav" aria-label="Secțiunile paginii"><div class="wrap">${NAV.map(([id, t], i) => `<a href="#${id}"><i>0${i + 1}</i>${t}</a>`).join('')}</div></nav>

  <!-- 01 ce primești: metodologia, o singură dată -->
  <section class="sec" id="de-ce"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Ce primești</p><h2>Nu doar cursuri: cinci lucruri care îți schimbă compania.</h2></div>
    <ol class="dx-get">${prog.metodologie.map((m, k) => `<li><span class="step-n">0${k + 1}</span><h3>${esc(lower(m.titlu))}</h3><p>${esc(String(m.puncte[0] || '').replace(/;$/, '.').replace(/\bANTREPRENORI\b/g, 'antreprenori').replace(/provocarile/g, 'provocările'))}</p></li>`).join('')}</ol>
  </div></section>

  <!-- 02 cum funcționează: o zi reală și formatul cohortei -->
  ${day ? `<section class="sec sec-alt" id="cum"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Cum funcționează</p><h2>${esc(tx(D, 'program.zi.titlu'))}</h2>
      <p class="lead">${esc(tx(D, 'program.zi.text'))}</p></div></div>
    <div class="day">
      <div class="day-bar" aria-hidden="true">${blocks.map((x) => `<i class="${kind(x)}" style="flex:${x.len}"></i>`).join('')}</div>
      <ol class="day-list" style="grid-template-columns:${blocks.map((x) => (kind(x) === 'break' ? 'minmax(84px, .6fr)' : 'minmax(150px, 1.4fr)')).join(' ')}">${blocks.map((x) => { const ppl = x.speakeri.map((s) => ({ p: P[s.persoana], s })).filter((y) => y.p);
        return `<li class="${kind(x)}" style="--w:${Math.max(x.len / total, 0.06)}"><time>${esc(x.from)}</time><b>${esc(kind(x) === 'break' ? x.activitate : KIND_LABEL[kind(x)])}</b>
          ${ppl.map(({ p, s }) => `<a class="day-person" href="/lideri/${esc(p.id)}">${avatar(p)}<span><b>${esc(p.nume)}</b><small>${esc(O[s.organizatie]?.nume || (s.companie !== 'Trainer' ? s.companie : '') || ROLE[s.rol] || '')}</small></span></a>`).join('')}</li>`; }).join('')}</ol>
      <p class="day-note">Exemplu real: atelierul „${esc(cleanTitle(day.titlu))}”, cohorta #${ong.numar}.</p>
    </div>
    <div class="fmt dx-fmt">
      <div class="fmt-card big"><b>${fullDay.length}</b><h3>Ateliere full-day</h3><ul>${fullDay.map((a) => `<li>${esc(T[a.tema]?.nume || cleanTitle(a.titlu))}</li>`).join('')}</ul></div>
      ${eveningOther.length ? `<div class="fmt-card"><b>${eveningOther.length}</b><h3>Ateliere de seară</h3><ul>${eveningOther.map((a) => `<li>${esc(cleanTitle(a.titlu))}</li>`).join('')}</ul></div>` : ''}
      ${mastermind.length ? `<div class="fmt-card"><b>${mastermind.length}</b><h3>Mastermind</h3><p>${esc(firstSentence(mastermind[0].descriere))}</p></div>` : ''}
      ${networking.length ? `<div class="fmt-card"><b>${networking.length}</b><h3>Petrecerea de final</h3><p>${esc(cleanTitle(networking[0].titlu))}, cu comunitatea RBL.</p></div>` : ''}
    </div>
    <div class="fmt-line" aria-label="Calendarul cohortei #${ong.numar}">${ws.filter((a) => a.data).map((a) => `<span class="${a.format === 'full-day' ? 'fd' : a.format === 'networking' ? 'nw' : 'ev'}" title="${esc(cleanTitle(a.titlu))}"><i></i><small>${Number(a.data.slice(8))}.${a.data.slice(5, 7)}</small></span>`).join('')}</div>
    <p class="day-note">Calendarul cohortei #${ong.numar}: <i class="k fd"></i>full-day <i class="k ev"></i>seară <i class="k nw"></i>networking · <a href="${edUrl(ong)}#agenda">Toată agenda →</a></p>
  </div></section>` : ''}

  <!-- 03 ești potrivit: criteriile, cine a mai participat, companiile care au crescut -->
  <section class="sec sec-dark dx-night" id="pentru-cine"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Ești potrivit?</p><h2>Pentru fondatori și manageri de companii care vor să scaleze.</h2></div>
    <div class="who">
      <div>
        <h3 class="who-h">Cifra de afaceri a companiei</h3>
        <div class="crit">${criterii.map(([a, b]) => `<div><b>${a}</b><span>${b}</span></div>`).join('')}</div>
        <a class="btn btn-light btn-lg dx-who-cta" href="/aplica">Verifică dacă te încadrezi</a>
      </div>
      <div>
        <h3 class="who-h">Cine a participat până acum</h3>
        <div class="figures who-figs">
          <div class="fig"><b>${milLei(F.q1)}–${milLei(F.q3)}<em> mil. lei</em></b><span>cifra de afaceri a jumătății „de mijloc” a companiilor</span></div>
          <div class="fig"><b>${F.medianAng}</b><span>${de(F.medianAng)}angajați, la mediană</span></div>
        </div>
        <div class="sectors">${F.sectors.slice(0, 6).map(([s, n]) => `<div class="sector"><span>${esc(s)}</span><i style="--w:${(n / maxSector) * 100}%"></i><b>${n}</b></div>`).join('')}</div>
      </div>
    </div>
    ${alumni.length ? `<div class="dx-alumni"><h3 class="who-h">Companii care au crescut și cu ajutorul programului</h3>
      <div class="ab-logos dx-logos">${alumni.map((o) => ({ ...o, nume: o.nume.replace(/\s*\(.*\)$/, '') })).map((o) => (o.logo ? `<span title="${esc(o.nume)}"><img src="${esc(o.logo)}" alt="${esc(o.nume)}" loading="lazy"></span>` : `<span><b>${esc(o.nume)}</b></span>`)).join('')}</div></div>` : ''}
  </div></section>

  <!-- 04 investiția -->
  <section class="sec" id="investitie"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Investiția</p><h2>Ce plătești și ce primești.</h2>
      ${valoare ? `<p class="lead">Valoarea estimată a unei cohorte e de <b>${esc(valoare.replace(/^valoare estimată:\s*/i, ''))}</b>: atelierele, accesul la traineri și antreprenori, sprijinul partenerilor și comunitatea.</p>` : ''}</div></div>
    <div class="price-row">
      ${priced.map(({ e, p }) => { const live = F.ongoing && e.id === F.ongoing.id;
        return `<a class="price ${live ? 'ref' : ''}" href="${edUrl(e)}"><span class="ask-kicker">${e.serie === 'Cluj' ? `Cluj #${e.numar}` : `Cohorta #${e.numar}`} · ${live ? 'în desfășurare' : 'înscrieri deschise'}</span><b>${esc(p.pret_text.replace(/(\d)(\d{3})\b/, '$1.$2'))}</b>
        <span>${live ? 'taxa la cohorta în curs, ca reper; înscrierile s-au încheiat' : esc(p.nota ? p.nota.replace(/\.$/, '') : p.eticheta || '')}</span><em>Vezi cohorta →</em></a>`; }).join('')}
      <a class="price next" href="/aplica"><span class="ask-kicker">Cohorta #${F.maxNr + 1} · București</span><b>Listă de așteptare</b><span>Te anunțăm primul când se deschid înscrierile și cât costă.</span><em>Intră pe listă →</em></a>
    </div>
    ${benefits.length ? `<h3 class="who-h" style="margin-top:36px">Ce include o cohortă</h3><div class="benefits">${benefits.map(([n, t]) => `<div class="benefit"><b>${esc(n)}</b><span>${esc(t)}</span></div>`).join('')}</div>` : ''}
  </div></section>

  <!-- 05 dovada: din 2013 până azi -->
  <section class="sec sec-alt" id="istoric"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Din ${prog.de_cand}</p><h2>${F.maxNr} ${de(F.maxNr)}cohorte. Același angajament.</h2>
      <p class="lead">Două cohorte pe an în București${F.cluj ? `, iar din ${F.cluj.an} și la Cluj` : ''}.</p></div>
      <a class="link-arrow" href="/editii">Toate cohortele →</a></div>
    <div class="ab-stats">
      <div><b>${F.participanti}</b><span>${de(F.participanti)}antreprenori și manageri în cohortele #${first.numar}–#${F.maxNr}</span></div>
      <div><b>${speakers}</b><span>${de(speakers)}lideri care au predat</span></div>
      <div><b>${F.ateliere}</b><span>${de(F.ateliere)}ateliere în arhivă</span></div>
      <div><b>${F.ciclu.length}</b><span>${de(F.ciclu.length)}companii revenite ca parteneri</span></div>
    </div>
    <div class="hist dx-hist">
      <div class="hist-start"><b>${prog.de_cand}</b><span>Prima cohortă</span><small>cohortele #1–#${first.numar - 1}</small></div>
      ${arhiva.map((e) => histBox(edUrl(e), '', `#${e.numar}`, `${e.sezon} ${e.an}`, F.ongoing && e.id === F.ongoing.id ? 'în desfășurare' : plural(e.participanti.length, 'participant', 'participanți'), F.ongoing && e.id === F.ongoing.id ? 'is-live' : '')).join('')}
      ${F.cluj ? histBox(edUrl(F.cluj), 'Cluj', `#${F.cluj.numar}`, `${F.cluj.sezon} ${F.cluj.an}`, 'înscrieri deschise', 'cluj') : ''}
      ${histBox('/aplica', '', `#${F.maxNr + 1}`, nextSez, 'listă de așteptare', 'next')}
    </div>
  </div></section>

  <!-- 06 cine e în spate: organizatorul și echipa, împreună -->
  <section class="sec sec-dark dx-night" id="echipa"><div class="wrap ab-rbl">
    <div>
      <p class="eyebrow">Cine e în spate</p>
      <h2>${esc(prog.organizator.nume)}</h2>
      <p>${esc(prog.organizator.descriere.split(/(?<=\.)\s+/).slice(0, 2).join(' '))}</p>
      <dl class="dx-rbl-figs">${prog.cifre.filter((c) => /RBL|pro-bono/.test(c.ce)).map((c) => `<div><dt>${esc(c.valoare)}</dt><dd>${esc(c.ce)}</dd></div>`).join('')}</dl>
      <a class="btn btn-outline-light" href="${esc(prog.organizator.url)}" target="_blank" rel="noopener">rbls.ro ↗</a>
    </div>
    <div class="ab-rbl-side">
      ${rblLogo ? `<div class="ab-rbl-logo"><img src="${esc(rblLogo.fisier)}" alt="Romanian Business Leaders"></div>` : ''}
      <div class="dx-team">${prog.contact.echipa.map((m) => `<div class="dx-member" id="${esc(m.id)}">${avatar(P[m.id], 160)}<span><b>${esc(m.nume)}</b><small>${esc(roleShort(m.rol))}</small></span></div>`).join('')}</div>
    </div>
  </div></section>

  <!-- 07 aplicarea -->
  <section class="cta-band" id="contact"><div class="wrap cta-band-in">
    <div class="cta-band-copy">
      <p class="eyebrow">Aplică</p>
      <h2>Crești mai repede alături de oameni care au trecut prin asta.</h2>
      <p>Intră pe lista pentru cohorta #${F.maxNr + 1} din București${F.cluj ? ` sau aplică la Cluj #${F.cluj.numar}` : ''}.</p>
      <div class="hero-actions"><a class="btn btn-light btn-lg" href="/aplica">Aplică pentru un loc</a>${F.cluj ? `<a class="btn btn-outline-light btn-lg" href="${edUrl(F.cluj)}">Cluj #${F.cluj.numar}</a>` : ''}</div>
    </div>
    ${raluca ? `<div class="ask-card"><span class="ask-kicker">Ai întrebări înainte să aplici?</span><b>${esc(raluca.nume)}</b><span>${esc(roleShort(raluca.rol))}</span>
      <a href="mailto:${esc(raluca.email)}">${esc(raluca.email)}</a>${raluca.telefon ? `<a href="tel:${esc(raluca.telefon.replace(/\D/g, ''))}">${esc(raluca.telefon)}</a>` : ''}</div>` : ''}
  </div></section>
</main>`;
}

module.exports = { despre2Body };
