// Comunitatea: /comunitate (toți alumnii cohortelor încheiate: căutare după nevoie, explorare, director) și /comunitate/<id> (doar profilurile completate).
// Un participant intră în comunitate când cohorta lui se încheie; până atunci apare doar pe pagina cohortei.
// Cifrele de business apar numai agregat, niciodată pe om sau pe companie.
const { esc, initials, img, milLei, slug, logoImg, de, tidy, temaUrl, CM_PAGES } = require('./util');

const plural = (n, one, many) => `${n} ${n === 1 ? one : (n % 100 === 0 || n % 100 >= 20 ? 'de ' : '') + many}`;
const avatar = (src, nume, w) => (src ? `<img src="${esc(img(src, w))}" alt="" loading="lazy">` : `<span class="ph">${esc(initials(nume || '?'))}</span>`);
const edUrl = (e) => (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`);
const edLabel = (e) => (e.serie === 'Cluj' ? `Cluj #${e.numar}` : `#${e.numar}`);
const chrono = (D) => D.editii.slice().sort((a, b) => a.an - b.an || (a.sezon === b.sezon ? (a.serie === 'Cluj') - (b.serie === 'Cluj') : a.sezon === 'primăvară' ? -1 : 1));
// o cohortă e încheiată (participanții intră în comunitate) doar după „Arhivează” din panou: starea „Ediție închisă”
const ended = (e) => /închis|încheiat/i.test(e.status || '');
// mediana: la un număr par de valori, media celor două din mijloc (ca în util.js)
const median = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
const quantile = (a, q) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) * q)] : null; };
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// textul „despre el/ea” completat din panou
const hasPage = (p) => !!(p && p.bio && p.bio.trim().length > 20);

// toți membrii comunității, cu ce afișăm despre fiecare
function alumniData(ctx) {
  const { D, P, O } = ctx;
  const eds = chrono(D).filter(ended);
  const by = new Map();
  eds.forEach((e) => e.participanti.forEach((x) => {
    const a = by.get(x.persoana) || { id: x.persoana, p: P[x.persoana], nume: x.nume, eds: [], parts: [] };
    a.eds.push(e); a.parts.push(x);
    by.set(x.persoana, a);
  }));
  const L = [...by.values()].map((a) => {
    const last = a.parts[a.parts.length - 1], o = O[last.organizatie];
    // ce face: descrierea companiei din înscriere, altfel cea din registrul de companii
    const desc = tidy(last.descriere || o?.descriere || '').trim();
    return { ...a, nume: a.p?.nume || a.nume, imagine: a.p?.imagine || last.imagine, org: o, sector: o?.sector || null, oras: o?.oras || null, desc, oferta: (a.p?.oferta || []).filter(Boolean), pentru: (a.p?.pentru_cine || []).filter(Boolean),
      fn: (a.p?.functii || []).filter((f) => f && f !== 'Trainer').slice(-1)[0] || '', page: hasPage(a.p) || desc.length > 40, speaker: !!a.p?.aparitii?.length };
  }).sort((x, y) => eds.indexOf(y.eds[y.eds.length - 1]) - eds.indexOf(x.eds[x.eds.length - 1]) || x.nume.localeCompare(y.nume, 'ro'));
  const parts = eds.flatMap((e) => e.participanti);
  const count = (f) => { const m = {}; L.forEach((a) => { const k = f(a); if (k) m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  // mărimea companiilor, doar ca distribuție (câte companii pe fiecare treaptă), ultima cifră raportată de fiecare
  const caByOrg = new Map();
  parts.forEach((x) => { if (x.cifra_afaceri != null) caByOrg.set(x.organizatie, x.cifra_afaceri); });
  const BANDS = [[0, 1e6, 'sub 1'], [1e6, 5e6, '1–5'], [5e6, 20e6, '5–20'], [20e6, 50e6, '20–50'], [50e6, Infinity, 'peste 50']];
  const bands = BANDS.map(([lo, hi, label]) => ({ label, n: [...caByOrg.values()].filter((v) => v >= lo && v < hi).length }));
  return { L, eds, companies: new Set(L.map((a) => a.org?.id).filter(Boolean)).size, sectors: count((a) => a.sector), cities: count((a) => a.oras), bands,
    q1: quantile(parts.map((x) => x.cifra_afaceri), 0.25), q3: quantile(parts.map((x) => x.cifra_afaceri), 0.75), medianCa: median(parts.map((x) => x.cifra_afaceri)), medianAng: Math.round(median(parts.map((x) => x.angajati))),
    ciclu: D.organizatii.filter((o) => o.ciclu) };
}
const href = (a) => (a.speaker ? `/lideri/${a.id}` : a.page ? `/comunitate/${a.id}` : '');

// „pagina” unei companii pe site: profilul omului ei din comunitate, dacă e unul singur cu pagină;
// altfel lista comunității, căutată după numele companiei
const companyUrl = (L, o) => {
  const m = L.filter((a) => a.org?.id === o.id), hs = m.map(href).filter(Boolean);
  return m.length === 1 && hs.length === 1 ? hs[0] : `/comunitate?q=${encodeURIComponent(o.nume.replace(/\s*\(.*\)$/, ''))}#lista`;
};

// adresele feliilor: /comunitate/industrii/<industrie>, /comunitate/cohorte/<18 | cluj-1>, /comunitate/cauta?q=
const edKey = (e) => (e.serie === 'Cluj' ? `cluj-${e.numar}` : String(e.numar));
const sectorUrl = (s) => (CM_PAGES ? `/comunitate/industrii/${slug(s)}` : `/comunitate?sector=${slug(s)}#lista`);
const edCmUrl = (e) => (CM_PAGES ? `/comunitate/cohorte/${edKey(e)}` : `/comunitate?editie=${e.numar}#lista`);

// un membru, cu tot ce-i trebuie profilului rapid (panoul lateral) și căutării
const cmAttrs = (a) => `data-id="${esc(a.id)}" data-ed="${esc(a.eds.map((e) => e.id).join(' '))}" data-sector="${esc(a.sector || '')}" data-city="${esc(a.oras || '')}" data-of="${esc([...a.oferta, ...a.pentru].join(' · '))}"
      data-eds="${esc(a.eds.map((e) => `${edLabel(e)}, ${e.sezon} ${e.an}`).join(' · '))}" data-fn="${esc(a.fn)}" data-li="${esc(a.p?.linkedin || '')}" data-url="${esc(a.org?.url || '')}" data-href="${esc(href(a))}" data-logo="${esc(a.org?.logo || '')}"`;
const cmCard = (a, hidden = false) => `<article class="cm-card" ${hidden ? 'hidden' : ''} ${cmAttrs(a)}>
      <button class="cm-hit" type="button" aria-haspopup="dialog" aria-label="Profilul lui ${esc(a.nume)}"></button>
      <div class="cm-card-top">
        <span class="cm-av">${avatar(a.imagine, a.nume, 128)}</span>
        <span class="cm-who"><b class="cm-n">${esc(a.nume)}</b><span class="cm-co">${esc(a.org?.nume || '')}</span></span>
      </div>
      ${a.desc ? `<p class="cm-d">${esc(a.desc)}</p>` : '<p class="cm-d cm-d-empty">Profil în curs de completare.</p>'}
      <div class="cm-card-ft">${a.sector ? `<span class="cm-tag">${esc(a.sector)}</span>` : ''}<span class="cm-eds">${a.eds.map(edLabel).join(' · ')}</span></div>
    </article>`;
// același membru, ca rezultat de motor de căutare: sursa, titlul, fragmentul cu cuvintele găsite, etichetele
const cmRow = (a) => `<article class="cm-card cs-row" hidden ${cmAttrs(a)}>
      <button class="cm-hit" type="button" aria-haspopup="dialog" aria-label="Profilul lui ${esc(a.nume)}"></button>
      <div class="cs-src"><span class="cm-av">${avatar(a.imagine, a.nume, 128)}</span><span class="cs-src-t"><span class="cm-co">${esc(a.org?.nume || a.nume)}</span><cite>comunitate${a.sector ? ` › ${esc(a.sector)}` : ''} › ${esc(a.eds.map(edLabel).join(', '))}</cite></span></div>
      <h3 class="cs-t"><b class="cm-n">${esc(a.nume)}</b>${a.fn ? `<span> · ${esc(a.fn)}</span>` : ''}</h3>
      ${a.desc ? `<p class="cm-d">${esc(a.desc)}</p>` : '<p class="cm-d cm-d-empty">Profil în curs de completare.</p>'}
      <p class="cs-meta">${a.sector ? `<span>${esc(a.sector)}</span>` : ''}${a.oras ? `<span>${esc(a.oras)}</span>` : ''}${a.eds.map((e) => `<span>Cohorta ${esc(edLabel(e))}, ${e.an}</span>`).join('')}</p>
    </article>`;
const cmDrawer = (mail) => `<div class="cm-drawer" id="cm-drawer" hidden data-mail="${esc(mail)}">
    <div class="cm-scrim" data-close></div>
    <aside class="cm-panel" role="dialog" aria-modal="true" aria-labelledby="cm-p-name" tabindex="-1">
      <button class="cm-x" type="button" data-close aria-label="Închide">${I.close}</button>
      <div class="cm-p-body"></div>
    </aside>
  </div>`;

// sugestiile de căutare: doar cuvintele care chiar găsesc ceva în comunitate
const IDEAS = ['SEO', 'software', 'marketing', 'construcții', 'logistică', 'consultanță', 'evenimente', 'energie', 'producție', 'recrutare', 'contabilitate', 'design', 'instalații', 'medical', 'turism', 'e-commerce', 'automatizări', 'mobilier', 'ambalaje', 'imobiliare', 'catering', 'educație'];
const ideas = (L) => IDEAS.map((w) => [w, L.filter((a) => new RegExp(`\\b${norm(w).slice(0, Math.max(4, norm(w).length - 2))}`).test(norm(`${a.org?.nume} ${a.sector} ${a.desc}`))).length])
  .filter(([, n]) => n >= 2).slice(0, 7).map(([w]) => w);

// contactul prin care se face o conectare: managerul de proiect (altfel primul din echipă cu email)
const connectMail = (D) => { const t = D.program?.contact?.echipa || []; return (t.find((m) => m.email && /project manager/i.test(m.rol)) || t.find((m) => m.email))?.email || ''; };

const I = {
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  card: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="11" r="2.5"/><path d="M14 10h4M14 14h4M6 16.5c.7-1.6 1.8-2.3 3-2.3s2.3.7 3 2.3"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="m8.7 10.6 6.6-3.2M8.7 13.4l6.6 3.2"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

// o felie a comunității (industrie sau cohortă), ca legătură spre pagina ei
const sliceTile = (url, label, n, members, sub = '') => `<a class="cm-tile" href="${esc(url)}">
      <span class="cm-tile-n">${n}<small>${plural(n, 'membru', 'membri').slice(String(n).length + 1)}</small></span><b>${esc(label)}${sub ? `<small class="cm-tile-sub">${esc(sub)}</small>` : ''}</b>
      <span class="cm-stack">${members.slice(0, 4).map((a) => `<span>${avatar(a.imagine, a.nume, 128)}</span>`).join('')}</span>
      <i class="cm-tile-go">${I.arrow}</i></a>`;
// explorarea de pe /comunitate, cu paginile separate: primele industrii și toate cohortele, fiecare cu pagina ei
const exploreLinks = (d) => `<section class="sec cm-explore" id="exploreaza"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Explorează</p><h2>Comunitatea, pe felii.</h2></div>
      <nav class="cm-tabs cm-tabs-go" aria-label="Explorează după"><a href="/comunitate/industrii">Industrii<i>${I.arrow}</i></a><a href="/comunitate/cohorte">Cohorte<i>${I.arrow}</i></a></nav></div>
    <div class="cm-tiles">${d.sectors.slice(0, 8).map(([s, n]) => sliceTile(sectorUrl(s), s, n, d.L.filter((a) => a.sector === s))).join('')}</div>
    <div class="cx-strip">
      <a class="cx-strip-all" href="/comunitate/industrii">Toate cele ${d.sectors.length} de industrii ${I.arrow}</a>
      <span class="cx-strip-k">Pe cohorte</span>
      <div class="cx-chips">${d.eds.slice().reverse().map((e) => `<a href="${esc(edCmUrl(e))}">${esc(edLabel(e))}<small>${e.an}</small></a>`).join('')}</div>
    </div>
  </div></section>`;

// ---------- /comunitate ----------
function alumniBody(ctx, F, sel = {}) {
  const d = alumniData(ctx), mail = connectMail(ctx.D);
  // filtrele cerute prin adresă: ?sector=tech-si-software, ?editie=bucuresti-18 (sau 18), ?q=seo
  const selS = d.sectors.find(([s]) => slug(s) === sel.sector)?.[0] || '';
  const selE = d.eds.find((e) => e.id === sel.editie || String(e.numar) === String(sel.editie || '').replace(/^#/, ''))?.id || '';
  const shown = (x) => (!selS || x.sector === selS) && (!selE || x.eds.some((e) => e.id === selE));
  const nShown = d.L.filter(shown).length;
  const maxBand = Math.max(...d.bands.map((b) => b.n), 1);
  const card = (a) => cmCard(a, !shown(a));
  const tile = (key, label, n, members, extra = '') => `<button class="cm-tile" type="button" data-pick="${esc(key)}" data-val="${esc(label)}" ${extra}>
      <span class="cm-tile-n">${n}<small>${plural(n, 'membru', 'membri').slice(String(n).length + 1)}</small></span><b>${esc(label)}</b>
      <span class="cm-stack">${members.slice(0, 4).map((a) => `<span>${avatar(a.imagine, a.nume, 128)}</span>`).join('')}</span>
      <i class="cm-tile-go">${I.arrow}</i></button>`;
  const P = CM_PAGES;
  return `<main class="cm">
  <section class="cm-hero"><div class="wrap">
    <nav class="crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><b>Comunitatea</b></nav>
    <div class="cm-hero-grid"><div class="cm-hero-in">
      <p class="eyebrow">Comunitatea Antreprenoria</p>
      <h1>Ai nevoie de ceva? Probabil un coleg din comunitate face exact asta.</h1>
      <p class="lead">${plural(d.L.length, 'antreprenor', 'antreprenori')} care au trecut prin program, fiecare cu un profil despre ce face, ce oferă și pentru cine. Caută după ce ai nevoie, explorează pe industrii și cere o conectare.</p>
      <form class="cm-search" role="search" ${P ? 'action="/comunitate/cauta" data-go' : 'action="/comunitate#lista"'}>
        <span class="cm-search-ic">${I.search}</span>
        <input id="cm-q" name="q" type="search" value="${P ? '' : esc(sel.q || '')}" placeholder="Ce cauți? ex. servicii SEO, software de logistică, recondiționare turbine" data-short="Ce cauți? ex. servicii SEO" autocomplete="off" aria-label="Caută în comunitate după nevoie, companie sau nume">
        <button class="btn btn-primary" type="submit">Caută</button>
      </form>
      <div class="cm-ideas" aria-label="Căutări sugerate"><span>Încearcă:</span>${ideas(d.L).map((w) => (P ? `<a href="/comunitate/cauta?q=${encodeURIComponent(w)}">${esc(w)}</a>` : `<button type="button" data-idea="${esc(w)}">${esc(w)}</button>`)).join('')}</div>
    </div>
    <dl class="cm-kpis" aria-label="Comunitatea în cifre">
      <div><dt>${d.L.length}</dt><dd>${de(d.L.length)}antreprenori</dd></div>
      <div><dt>${d.companies}</dt><dd>${de(d.companies)}companii</dd></div>
      <div><dt>${d.sectors.length}</dt><dd>${de(d.sectors.length)}industrii</dd></div>
      <div><dt>${d.eds.length}</dt><dd>${de(d.eds.length)}cohorte încheiate</dd></div>
    </dl></div>
  </div></section>

  <section class="cm-how" aria-label="Cum funcționează"><div class="wrap"><ol>
    <li><i>${I.search}</i><span><b>Caută după nevoie</b>Un serviciu, un produs, o problemă de rezolvat. Căutarea citește tot ce face fiecare companie.</span></li>
    <li><i>${I.card}</i><span><b>Vezi profilul complet</b>Ce face, ce oferă și pentru cine, plus cohorta în care a fost colegul tău.</span></li>
    <li><i>${I.link}</i><span><b>Cere o conectare</b>Echipa programului face introducerea. Datele de contact rămân private.</span></li>
  </ol></div></section>

  ${P ? exploreLinks(d) : `  <section class="sec cm-explore" id="exploreaza"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Explorează</p><h2>Comunitatea, pe felii.</h2></div>
      <div class="cm-tabs" role="tablist" aria-label="Explorează după">
        <button role="tab" aria-selected="true" data-tab="sector">Industrie</button>
        <button role="tab" aria-selected="false" data-tab="ed">Cohortă</button>
        ${d.cities.length ? '<button role="tab" aria-selected="false" data-tab="city">Oraș</button>' : ''}
      </div></div>
    <div class="cm-tiles" data-panel="sector">${d.sectors.map(([s, n]) => tile('sector', s, n, d.L.filter((a) => a.sector === s))).join('')}</div>
    <div class="cm-tiles" data-panel="ed" hidden>${d.eds.slice().reverse().map((e) => tile('ed', `${edLabel(e)} · ${e.sezon} ${e.an}`, e.participanti.length, d.L.filter((a) => a.eds.includes(e)), `data-id="${esc(e.id)}"`)).join('')}</div>
    ${d.cities.length ? `<div class="cm-tiles" data-panel="city" hidden>${d.cities.map(([c, n]) => tile('city', c, n, d.L.filter((a) => a.oras === c))).join('')}</div>` : ''}
  </div></section>`}

  <section class="sec cm-dir" id="lista"><div class="wrap">
    <div class="cm-bar">
      <div class="cm-bar-q"><span class="cm-search-ic">${I.search}</span><input id="cm-q2" type="search" value="${P ? esc(sel.q || '') : ''}" placeholder="Caută în comunitate" autocomplete="off" aria-label="Caută în comunitate"></div>
      <label class="cm-sel"><span>Industrie</span><select data-f="sector" data-param="sector"><option value="">Toate</option>${d.sectors.map(([s, n]) => `<option value="${esc(s)}" data-q="${esc(slug(s))}" ${selS === s ? 'selected' : ''}>${esc(s)} (${n})</option>`).join('')}</select></label>
      <label class="cm-sel"><span>Cohortă</span><select data-f="ed" data-param="editie"><option value="">Toate</option>${d.eds.slice().reverse().map((e) => `<option value="${esc(e.id)}" data-q="${esc(String(e.numar))}" ${selE === e.id ? 'selected' : ''}>${esc(edLabel(e))} · ${esc(e.sezon)} ${e.an}</option>`).join('')}</select></label>
      ${d.cities.length ? `<label class="cm-sel"><span>Oraș</span><select data-f="city" data-param="oras"><option value="">Toate</option>${d.cities.map(([c, n]) => `<option value="${esc(c)}" data-q="${esc(slug(c))}">${esc(c)} (${n})</option>`).join('')}</select></label>` : ''}
    </div>
    <div class="cm-status"><p class="cm-count" aria-live="polite"><b>${nShown}</b> ${nShown === 1 ? 'membru' : de(nShown) + 'membri'}</p><button class="cm-reset" type="button" ${selS || selE ? '' : 'hidden'}>Șterge filtrele</button></div>
    <p class="cm-note" hidden></p>
    <div class="cm-grid">${d.L.map(card).join('')}</div>
    <div class="cm-empty" ${nShown ? 'hidden' : ''}><b>Nimic încă pentru căutarea asta.</b><span>Spune-ne ce cauți: echipa întreabă în comunitate și revine cu un om potrivit.</span>${mail ? `<a class="btn btn-primary" href="mailto:${esc(mail)}?subject=${encodeURIComponent('Caut în comunitatea Antreprenoria')}">Cere o recomandare</a>` : ''}</div>
  </div></section>

  <section class="sec sec-alt cm-profile" id="cifre"><div class="wrap cm-profile-in">
    <div>
      <p class="eyebrow">Ce găsești în fiecare profil</p>
      <h2>Destul cât să știi pe cine suni.</h2>
      <ul class="cm-feats">
        <li><b>Ce face</b><span>Activitatea companiei, pe scurt și concret.</span></li>
        <li><b>Ce oferă</b><span>Serviciile și produsele, cu cuvintele după care le cauți.</span></li>
        <li><b>Pentru cine</b><span>Clienții potriviți: industrii, mărimi de companie, orașe.</span></li>
        <li><b>Conectarea</b><span>O introducere făcută de echipă, nu un formular anonim.</span></li>
      </ul>
    </div>
    <aside class="cm-size" aria-label="Mărimea companiilor din comunitate">
      <div class="cm-size-top"><b>Mărimea companiilor</b><span>agregat · mil. lei cifră de afaceri</span></div>
      <div class="cm-bars">${d.bands.map((b) => `<div class="cm-band"><span>${esc(b.label)}</span><i style="--w:${(b.n / maxBand) * 100}%"></i><b>${b.n}</b></div>`).join('')}</div>
      <dl>
        ${d.medianCa ? `<div><dt>${milLei(d.medianCa)} mil. lei</dt><dd>cifra de afaceri mediană</dd></div>` : ''}
        ${d.medianAng ? `<div><dt>${d.medianAng}</dt><dd>${de(d.medianAng)}angajați la mediană</dd></div>` : ''}
      </dl>
      <p class="cm-fine">Cifrele sunt doar agregate: nu publicăm cifra de afaceri a niciunei companii.</p>
    </aside>
  </div></section>

  ${d.ciclu.length ? `<section class="sec" id="din-alumni-parteneri"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Din comunitate, parteneri</p><h2>Vii ca participant. Revii ca partener.</h2>
      <p class="lead">${plural(d.ciclu.length, 'companie care a trecut', 'companii care au trecut')} prin program s-au întors să sponsorizeze ateliere, să le găzduiască sau să trimită speakeri.</p></div>
    <div class="al-cycle" style="--n:${d.ciclu.length}">${d.ciclu.map((o) => `<div class="al-cyc"><span class="logo-cell">${logoImg(o)}</span><b>${esc(o.nume)}</b><span>alumni ${esc(edLabel(ctx.D.editii.find((e) => e.id === o.ciclu.alumni_din) || { numar: '' }))} → ${esc(o.ciclu.apoi.map((r) => r.replace(' atelier', '')).join(', '))}</span></div>`).join('')}</div>
  </div></section>` : ''}

  <section class="cta-band"><div class="wrap cta-band-in">
    <div class="cta-band-copy">
      <p class="eyebrow">Intră în comunitate</p>
      <h2>Locul tău e pe lista asta.</h2>
      <p>Ești deja alumnus? Completează-ți profilul ca să te găsească cine are nevoie de tine. Nu ești încă? Comunitatea începe cu o cohortă.</p>
      <div class="hero-actions"><a class="btn btn-light btn-lg" href="/aplica">Aplică la cohorta următoare</a>${mail ? `<a class="btn btn-outline-light btn-lg" href="mailto:${esc(mail)}?subject=${encodeURIComponent('Profilul meu în comunitatea Antreprenoria')}">Completează-ți profilul</a>` : ''}</div>
    </div>
  </div></section>

  ${cmDrawer(mail)}
</main>`;
}

// ---------- /comunitate/<id> ----------
// pagina unui membru: cine e și ce face compania, ce oferă și pentru cine, parcursul în program, colegii, conectarea prin echipă
const MON = ['ian.', 'feb.', 'mar.', 'apr.', 'mai', 'iun.', 'iul.', 'aug.', 'sep.', 'oct.', 'nov.', 'dec.'];
const shortDay = (d) => { const [, m, z] = d.split('-').map(Number); return `${z} ${MON[m - 1]}`; };
const cleanTitle = (t) => String(t || '').replace(/^(Atelier de Seară|COCKTAIL NETWORKING)\s*[-:]\s*/i, '');
const themeUrl = temaUrl;
// rezumatul de sus: primele fraze din descriere, cât să încapă într-un paragraf scurt
const lede = (s, max = 230) => { const f = String(s || '').match(/[^.!?]+[.!?]+(\s|$)/g) || [s || '']; let out = ''; for (const x of f) { if (out && (out + x).length > max) break; out += x; } return out.trim().length > max + 60 ? `${out.slice(0, max).replace(/\s+\S*$/, '')}…` : out.trim(); };
const SVG = {
  out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};

function alumnusBody(ctx, F, id, opt = {}) {
  const { D, T } = ctx;
  const d = alumniData(ctx), a = d.L.find((x) => x.id === id);
  const p = a.p || {}, o = a.org, first = a.nume.split(' ')[0];
  const last = a.eds[a.eds.length - 1], mail = connectMail(D);
  const colleagues = d.L.filter((x) => x.id !== id && x.eds.includes(last));
  const sameSector = a.sector ? d.L.filter((x) => x.id !== id && x.sector === a.sector) : [];
  const sameCo = o ? d.L.filter((x) => x.id !== id && x.org?.id === o.id) : [];
  const partner = o?.ciclu;
  const offer = (p.oferta || []).filter(Boolean), forWhom = (p.pentru_cine || []).filter(Boolean);
  const subj = encodeURIComponent(`Cerere de conectare: ${a.nume}${o ? ` (${o.nume})` : ''}`);
  const body = encodeURIComponent(`Bună,\n\nAș vrea să fiu pus în legătură cu ${a.nume}${o ? ` de la ${o.nume}` : ''}, din comunitatea Antreprenoria.\n\nDe ce: \n\nMulțumesc!`);
  const connect = mail ? `mailto:${mail}?subject=${subj}&body=${body}` : '/despre#contact';
  const link = (x) => href(x) || `/comunitate?membru=${x.id}#lista`;
  const person = (x, sub) => `<li><a href="${esc(link(x))}">${avatar(x.imagine, x.nume, 128)}<span><b>${esc(x.nume)}</b><small>${esc(sub ?? x.org?.nume ?? '')}</small></span></a></li>`;
  // parcursul: atelierele fiecărei cohorte (fără petrecerea de final), în ordine
  const journey = a.eds.slice().reverse().map((e) => ({ e, ws: e.ateliere.filter((w) => T[w.tema] && T[w.tema].format !== 'networking').sort((x, y) => String(x.data).localeCompare(String(y.data))) }));
  const nWs = journey.reduce((n, j) => n + j.ws.length, 0);
  const wsRow = (e, w) => { const t = T[w.tema]; return `<li><a href="${esc(themeUrl(t))}">
      <span class="ld-ws-d"><b>${w.data && w.data.startsWith(String(e.an)) ? shortDay(w.data) : esc(edLabel(e))}</b><small>${t.format === 'full-day' ? 'full-day' : 'atelier de seară'}</small></span>
      <span class="ld-ws-t"><b>${esc(cleanTitle(w.titlu))}</b>${cleanTitle(w.titlu).trim() !== t.nume ? `<small>Tema: ${esc(t.nume)}</small>` : ""}</span></a></li>`; };

  return `<main class="ld mp">
  ${opt.preview ? '<div class="al-preview"><div class="wrap">Previzualizare: pagina apare pe site când profilul are descrierea companiei sau textul „despre el/ea” completat în panou.</div></div>' : ''}
  <section class="ld-hero mp-hero"><div class="wrap">
    <nav class="crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><a href="/comunitate">Comunitatea</a>${a.sector ? `<span>/</span><a href="${esc(sectorUrl(a.sector))}">${esc(a.sector)}</a>` : ''}<span>/</span><b>${esc(a.nume)}</b></nav>
    <div class="ld-head">
      <div class="ld-pic mp-pic">${avatar(a.imagine, a.nume, 384).replace(' loading="lazy"', ' fetchpriority="high"')}<span class="mp-ring" aria-hidden="true"></span></div>
      <div class="ld-id">
        <p class="ld-badges"><span class="ld-badge">Alumni ${esc(a.eds.map(edLabel).join(', '))}</span>${a.sector ? `<span class="ld-badge ld-badge-soft">${esc(a.sector)}</span>` : ''}${partner ? '<span class="ld-badge mp-badge-gold">Revenit ca partener</span>' : ''}${a.speaker ? '<span class="ld-badge mp-badge-gold">Speaker</span>' : ''}</p>
        <h1>${esc(a.nume)}</h1>
        ${a.fn || o ? `<p class="ld-org-line">${a.fn ? `${esc(a.fn)}${o ? ' · ' : ''}` : ''}${o ? (o.url ? `<a class="ld-org" href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.nume)}</a>` : `<span class="ld-org">${esc(o.nume)}</span>`) : ''}</p>` : ''}
        <p class="ld-sum">${esc(p.bio || lede(a.desc) || `A participat la Antreprenoria ${a.eds.map(edLabel).join(', ')}${o ? `, cu ${o.nume}` : ''}.`)}</p>
        <div class="ld-act">
          <a class="btn btn-primary" href="${esc(connect)}">Cere o conectare</a>
          ${p.linkedin ? `<a class="btn btn-ghost" href="${esc(p.linkedin)}" target="_blank" rel="noopener">LinkedIn ${SVG.out}</a>` : ''}
          ${o?.url ? `<a class="btn btn-ghost" href="${esc(o.url)}" target="_blank" rel="noopener">Vezi website ${SVG.out}</a>` : `<button class="btn btn-ghost mp-share" type="button" data-share>${SVG.link}<span>Copiază linkul</span></button>`}
        </div>
      </div>
      <dl class="ld-kpi" aria-label="Pe scurt">
        <div><dt>${esc(edLabel(last))}</dt><dd>${esc(last.sezon)} ${last.an}</dd></div>
        <div><dt>${nWs}</dt><dd>${de(nWs)}ateliere parcurse</dd></div>
        <div><dt>${colleagues.length}</dt><dd>colegi de cohortă</dd></div>
        <div><dt>${sameSector.length}</dt><dd>${a.sector ? 'în aceeași industrie' : 'în comunitate'}</dd></div>
      </dl>
    </div>
  </div></section>

  <div class="wrap ld-grid">
    <div class="ld-main">
      ${o || a.desc ? `<section class="ld-card mp-co" id="companie" aria-labelledby="mp-co-h">
        <div class="ld-card-h ld-card-row"><div><p class="ld-k">Ce face</p><h2 id="mp-co-h">${esc(o?.nume || 'Compania')}</h2></div>${o?.logo ? `<span class="mp-logo"><img src="${esc(o.logo)}" alt="${esc(o.nume)}" loading="lazy"></span>` : ''}</div>
        ${a.desc ? `<p class="mp-desc">${esc(a.desc)}</p>` : ''}
        <div class="mp-facts">
          ${a.sector ? `<a href="${esc(sectorUrl(a.sector))}"><small>Industrie</small><b>${esc(a.sector)}</b></a>` : ''}
          ${o?.tip && o.tip !== 'companie' ? `<span><small>Tip</small><b>${esc(o.tip)}</b></span>` : ''}
          ${a.oras ? `<span><small>Oraș</small><b>${esc(a.oras)}</b></span>` : ''}
          ${o?.url ? `<a href="${esc(o.url)}" target="_blank" rel="noopener"><small>Site</small><b>${esc(o.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</b></a>` : ''}
        </div>
        ${sameCo.length ? `<p class="mp-also">Tot de la ${esc(o.nume)}: ${sameCo.map((x) => `<a href="${esc(link(x))}">${esc(x.nume)}</a>`).join(', ')}</p>` : ''}
      </section>` : ''}

      <section class="ld-card mp-offer" id="oferta" aria-labelledby="mp-of-h">
        <div class="ld-card-h"><p class="ld-k">Pentru cine lucrează</p><h2 id="mp-of-h">Ce oferă și cui</h2></div>
        <div class="mp-offer-grid">
          <div class="mp-col"><h3>Ce oferă</h3>${offer.length ? `<ul class="ld-tags">${offer.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="mp-soon"><i></i><i></i><i></i><span>Serviciile și produsele principale, în cuvintele după care le cauți.</span></p>'}</div>
          <div class="mp-col"><h3>Pentru cine</h3>${forWhom.length ? `<ul class="ld-tags">${forWhom.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="mp-soon"><i></i><i></i><span>Clienții potriviți: industrii, mărimi de companie, orașe.</span></p>'}</div>
        </div>
        ${offer.length && forWhom.length ? '' : `<p class="mp-own">E profilul tău? ${mail ? `<a href="mailto:${esc(mail)}?subject=${encodeURIComponent(`Profilul meu în comunitate: ${a.nume}`)}">Trimite-ne ce oferi și pentru cine →</a>` : ''}</p>`}
      </section>

      <section class="ld-card ld-ws mp-journey" id="parcurs" aria-labelledby="mp-j-h">
        <div class="ld-card-h ld-card-row"><div><p class="ld-k">Parcursul în program</p><h2 id="mp-j-h">Ce a lucrat la Antreprenoria</h2></div><span class="ld-span">${plural(nWs, 'atelier', 'ateliere')} · ${plural(a.eds.length, 'cohortă', 'cohorte')}</span></div>
        ${journey.map(({ e, ws }, i) => `<div class="mp-ed"><a class="mp-ed-h" href="${edUrl(e)}"><b>Antreprenoria ${esc(edLabel(e))}</b><span>${esc(e.sezon)} ${e.an}${e.perioada ? ` · ${esc(e.perioada)}` : ''}</span><i>Pagina cohortei →</i></a>
          <ol class="ld-ws-list">${ws.slice(0, i ? 3 : 5).map((w) => wsRow(e, w)).join('')}</ol>
          ${ws.length > (i ? 3 : 5) ? `<details class="ld-more"><summary><span>Încă ${plural(ws.length - (i ? 3 : 5), 'atelier', 'ateliere')}</span></summary><ol class="ld-ws-list">${ws.slice(i ? 3 : 5).map((w) => wsRow(e, w)).join('')}</ol></details>` : ''}</div>`).join('')}
      </section>

      ${colleagues.length ? `<section class="ld-card mp-peers" id="colegi" aria-labelledby="mp-c-h">
        <div class="ld-card-h ld-card-row"><div><p class="ld-k">Colegii de cohortă</p><h2 id="mp-c-h">${esc(edLabel(last))}, ${esc(last.sezon)} ${last.an}</h2></div><a class="ld-link" href="${esc(edCmUrl(last))}">Toți ${colleagues.length + 1} →</a></div>
        <ul class="mp-faces">${colleagues.slice(0, 12).map((x) => `<li><a href="${esc(link(x))}" title="${esc(x.nume)}${x.org ? ` · ${esc(x.org.nume)}` : ''}">${avatar(x.imagine, x.nume, 128)}<b>${esc(x.nume)}</b><small>${esc(x.org?.nume || '')}</small></a></li>`).join('')}</ul>
      </section>` : ''}
    </div>

    <aside class="ld-side" aria-label="Conectare și membri înrudiți">
      <div class="ld-card mp-connect">
        <p class="ld-k">Conectare</p>
        <b>Vrei să lucrezi cu ${esc(first)}?</b>
        <ol class="mp-steps"><li><span>Ne spui pe scurt ce cauți.</span></li><li><span>Echipa îi scrie lui ${esc(first)} și verifică interesul.</span></li><li><span>Vă facem introducerea, pe email.</span></li></ol>
        <a class="btn btn-light" href="${esc(connect)}">Cere o conectare</a>
        <small>Datele de contact ale membrilor nu sunt publice.</small>
      </div>
      ${partner ? `<div class="ld-card mp-partner"><p class="ld-k">Din comunitate, partener</p><b>${esc(o.nume)} s-a întors ca ${esc(partner.apoi.map((r) => r.replace(' atelier', '')).join(', '))}.</b><a class="ld-link" href="/comunitate#din-alumni-parteneri">Companiile revenite →</a></div>` : ''}
      ${sameSector.length ? `<section class="ld-card ld-co" aria-labelledby="mp-s-h">
        <p class="ld-k" id="mp-s-h">Tot din ${esc(a.sector)}</p>
        <ul>${sameSector.slice(0, 5).map((x) => person(x)).join('')}</ul>
        <a class="ld-link mp-more" href="${esc(sectorUrl(a.sector))}">Toți cei ${sameSector.length + 1} →</a>
      </section>` : ''}
      <form class="ld-card mp-find" action="${CM_PAGES ? '/comunitate/cauta' : '/comunitate'}" role="search">
        <p class="ld-k">Caută în comunitate</p>
        <label class="mp-find-in"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input name="q" type="search" placeholder="Un serviciu, o companie…" aria-label="Caută în comunitate"></label>
        <small>${d.L.length} de antreprenori din ${plural(d.sectors.length, 'industrie', 'industrii')}</small>
      </form>
    </aside>
  </div>
</main>`;
}

// indexul pentru căutarea din meniu (/comunitate.json): doar ce apare deja public pe /comunitate
function communityIndex(ctx) {
  return alumniData(ctx).L.map((a) => ({ id: a.id, n: a.nume, co: a.org?.nume || '', s: a.sector || '', d: a.desc, img: a.imagine ? img(a.imagine, 128) : '', ed: a.eds.map(edLabel).join(' · '), h: href(a), o: [...a.oferta, ...a.pentru].join(' · ') }));
}

module.exports = { companyUrl, I, plural, avatar, edUrl, edLabel, edKey, sectorUrl, edCmUrl, cmCard, cmRow, cmDrawer, sliceTile, alumniBody, alumnusBody, alumniData, hasPage, communityIndex, ideas, connectMail };
