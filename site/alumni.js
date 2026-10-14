// Comunitatea: /comunitate (toți alumnii edițiilor încheiate: căutare după nevoie, explorare, director) și /comunitate/<id> (doar profilurile completate).
// Un participant intră în comunitate când ediția lui se încheie; până atunci apare doar pe pagina ediției.
// Cifrele de business apar numai agregat, niciodată pe om sau pe companie.
const { esc, initials, img, milLei, slug, logoImg } = require('./util');

const plural = (n, one, many) => `${n} ${n === 1 ? one : (n % 100 === 0 || n % 100 >= 20 ? 'de ' : '') + many}`;
const avatar = (src, nume, w) => (src ? `<img src="${esc(img(src, w))}" alt="" loading="lazy">` : `<span class="ph">${esc(initials(nume || '?'))}</span>`);
const edUrl = (e) => (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`);
const edLabel = (e) => (e.serie === 'Cluj' ? `Cluj #${e.numar}` : `#${e.numar}`);
const chrono = (D) => D.editii.slice().sort((a, b) => a.an - b.an || (a.sezon === b.sezon ? (a.serie === 'Cluj') - (b.serie === 'Cluj') : a.sezon === 'primăvară' ? -1 : 1));
// o ediție e încheiată (participanții intră în comunitate) doar după „Arhivează” din panou: starea „Ediție închisă”
const ended = (e) => /închis|încheiat/i.test(e.status || '');
const median = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const quantile = (a, q) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) * q)] : null; };
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// pagina proprie apare doar când profilul e completat din panou (textul „despre el/ea”)
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
    const desc = (last.descriere || o?.descriere || '').trim();
    return { ...a, nume: a.p?.nume || a.nume, imagine: a.p?.imagine || last.imagine, org: o, sector: o?.sector || null, oras: o?.oras || null, desc,
      fn: (a.p?.functii || []).filter((f) => f && f !== 'Trainer').slice(-1)[0] || '', page: hasPage(a.p), speaker: !!a.p?.aparitii?.length };
  }).sort((x, y) => eds.indexOf(y.eds[y.eds.length - 1]) - eds.indexOf(x.eds[x.eds.length - 1]) || x.nume.localeCompare(y.nume, 'ro'));
  const parts = eds.flatMap((e) => e.participanti);
  const count = (f) => { const m = {}; L.forEach((a) => { const k = f(a); if (k) m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  // mărimea companiilor, doar ca distribuție (câte companii pe fiecare treaptă), ultima cifră raportată de fiecare
  const caByOrg = new Map();
  parts.forEach((x) => { if (x.cifra_afaceri != null) caByOrg.set(x.organizatie, x.cifra_afaceri); });
  const BANDS = [[0, 1e6, 'sub 1'], [1e6, 5e6, '1–5'], [5e6, 20e6, '5–20'], [20e6, 50e6, '20–50'], [50e6, Infinity, 'peste 50']];
  const bands = BANDS.map(([lo, hi, label]) => ({ label, n: [...caByOrg.values()].filter((v) => v >= lo && v < hi).length }));
  return { L, eds, companies: new Set(L.map((a) => a.org?.id).filter(Boolean)).size, sectors: count((a) => a.sector), cities: count((a) => a.oras), bands,
    q1: quantile(parts.map((x) => x.cifra_afaceri), 0.25), q3: quantile(parts.map((x) => x.cifra_afaceri), 0.75), medianCa: median(parts.map((x) => x.cifra_afaceri)), medianAng: median(parts.map((x) => x.angajati)),
    ciclu: D.organizatii.filter((o) => o.ciclu) };
}
const href = (a) => (a.speaker ? `/lideri/${a.id}` : a.page ? `/comunitate/${a.id}` : '');

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

// ---------- /comunitate ----------
function alumniBody(ctx, F, sel = {}) {
  const d = alumniData(ctx), mail = connectMail(ctx.D);
  // filtrele cerute prin adresă: ?sector=tech-si-software, ?editie=bucuresti-18 (sau 18), ?q=seo
  const selS = d.sectors.find(([s]) => slug(s) === sel.sector)?.[0] || '';
  const selE = d.eds.find((e) => e.id === sel.editie || String(e.numar) === String(sel.editie || '').replace(/^#/, ''))?.id || '';
  const shown = (x) => (!selS || x.sector === selS) && (!selE || x.eds.some((e) => e.id === selE));
  const nShown = d.L.filter(shown).length;
  const maxBand = Math.max(...d.bands.map((b) => b.n), 1);
  const card = (a) => {
    const h = href(a);
    return `<article class="cm-card" ${shown(a) ? '' : 'hidden'} data-id="${esc(a.id)}" data-ed="${esc(a.eds.map((e) => e.id).join(' '))}" data-sector="${esc(a.sector || '')}" data-city="${esc(a.oras || '')}"
      data-eds="${esc(a.eds.map((e) => `${edLabel(e)}, ${e.sezon} ${e.an}`).join(' · '))}" data-fn="${esc(a.fn)}" data-li="${esc(a.p?.linkedin || '')}" data-url="${esc(a.org?.url || '')}" data-href="${esc(h)}" data-logo="${esc(a.org?.logo || '')}">
      <button class="cm-hit" type="button" aria-haspopup="dialog" aria-label="Profilul lui ${esc(a.nume)}"></button>
      <div class="cm-card-top">
        <span class="cm-av">${avatar(a.imagine, a.nume, 128)}</span>
        <span class="cm-who"><b class="cm-n">${esc(a.nume)}</b><span class="cm-co">${esc(a.org?.nume || '')}</span></span>
      </div>
      ${a.desc ? `<p class="cm-d">${esc(a.desc)}</p>` : '<p class="cm-d cm-d-empty">Profil în curs de completare.</p>'}
      <div class="cm-card-ft">${a.sector ? `<span class="cm-tag">${esc(a.sector)}</span>` : ''}<span class="cm-eds">${a.eds.map(edLabel).join(' · ')}</span></div>
    </article>`;
  };
  const tile = (key, label, n, members, extra = '') => `<button class="cm-tile" type="button" data-pick="${esc(key)}" data-val="${esc(label)}" ${extra}>
      <span class="cm-tile-n">${n}</span><b>${esc(label)}</b>
      <span class="cm-stack">${members.slice(0, 4).map((a) => `<span>${avatar(a.imagine, a.nume, 128)}</span>`).join('')}</span>
      <i class="cm-tile-go">${I.arrow}</i></button>`;
  return `<main class="cm">
  <section class="cm-hero"><div class="wrap">
    <nav class="crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><b>Comunitatea</b></nav>
    <div class="cm-hero-grid"><div class="cm-hero-in">
      <p class="eyebrow">Comunitatea Antreprenoria</p>
      <h1>Ai nevoie de ceva? Probabil un coleg din comunitate face exact asta.</h1>
      <p class="lead">${plural(d.L.length, 'antreprenor', 'antreprenori')} care au trecut prin program, fiecare cu un profil despre ce face, ce oferă și pentru cine. Caută după ce ai nevoie, explorează pe industrii și cere o conectare.</p>
      <form class="cm-search" role="search" action="/comunitate#lista">
        <span class="cm-search-ic">${I.search}</span>
        <input id="cm-q" name="q" type="search" value="${esc(sel.q || '')}" placeholder="Ce cauți? ex. servicii SEO, software de logistică, recondiționare turbine" data-short="Ce cauți? ex. servicii SEO" autocomplete="off" aria-label="Caută în comunitate după nevoie, companie sau nume">
        <button class="btn btn-primary" type="submit">Caută</button>
      </form>
      <div class="cm-ideas" aria-label="Căutări sugerate"><span>Încearcă:</span>${ideas(d.L).map((w) => `<button type="button" data-idea="${esc(w)}">${esc(w)}</button>`).join('')}</div>
    </div>
    <dl class="cm-kpis" aria-label="Comunitatea în cifre">
      <div><dt>${d.L.length}</dt><dd>antreprenori</dd></div>
      <div><dt>${d.companies}</dt><dd>companii</dd></div>
      <div><dt>${d.sectors.length}</dt><dd>industrii</dd></div>
      <div><dt>${d.eds.length}</dt><dd>ediții încheiate</dd></div>
    </dl></div>
  </div></section>

  <section class="cm-how" aria-label="Cum funcționează"><div class="wrap"><ol>
    <li><i>${I.search}</i><span><b>Caută după nevoie</b>Un serviciu, un produs, o problemă de rezolvat. Căutarea citește tot ce face fiecare companie.</span></li>
    <li><i>${I.card}</i><span><b>Vezi profilul complet</b>Ce face, ce oferă și pentru cine, plus ediția în care a fost colegul tău.</span></li>
    <li><i>${I.link}</i><span><b>Cere o conectare</b>Echipa programului face introducerea. Datele de contact rămân private.</span></li>
  </ol></div></section>

  <section class="sec cm-explore" id="exploreaza"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Explorează</p><h2>Comunitatea, pe felii.</h2></div>
      <div class="cm-tabs" role="tablist" aria-label="Explorează după">
        <button role="tab" aria-selected="true" data-tab="sector">Industrie</button>
        <button role="tab" aria-selected="false" data-tab="ed">Ediție</button>
        ${d.cities.length ? '<button role="tab" aria-selected="false" data-tab="city">Oraș</button>' : ''}
      </div></div>
    <div class="cm-tiles" data-panel="sector">${d.sectors.map(([s, n]) => tile('sector', s, n, d.L.filter((a) => a.sector === s))).join('')}</div>
    <div class="cm-tiles" data-panel="ed" hidden>${d.eds.slice().reverse().map((e) => tile('ed', `${edLabel(e)} · ${e.sezon} ${e.an}`, e.participanti.length, d.L.filter((a) => a.eds.includes(e)), `data-id="${esc(e.id)}"`)).join('')}</div>
    ${d.cities.length ? `<div class="cm-tiles" data-panel="city" hidden>${d.cities.map(([c, n]) => tile('city', c, n, d.L.filter((a) => a.oras === c))).join('')}</div>` : ''}
  </div></section>

  <section class="sec cm-dir" id="lista"><div class="wrap">
    <div class="cm-bar">
      <div class="cm-bar-q"><span class="cm-search-ic">${I.search}</span><input id="cm-q2" type="search" placeholder="Caută în comunitate" autocomplete="off" aria-label="Caută în comunitate"></div>
      <label class="cm-sel"><span>Industrie</span><select data-f="sector" data-param="sector"><option value="">Toate</option>${d.sectors.map(([s, n]) => `<option value="${esc(s)}" data-q="${esc(slug(s))}" ${selS === s ? 'selected' : ''}>${esc(s)} (${n})</option>`).join('')}</select></label>
      <label class="cm-sel"><span>Ediție</span><select data-f="ed" data-param="editie"><option value="">Toate</option>${d.eds.slice().reverse().map((e) => `<option value="${esc(e.id)}" data-q="${esc(String(e.numar))}" ${selE === e.id ? 'selected' : ''}>${esc(edLabel(e))} · ${esc(e.sezon)} ${e.an}</option>`).join('')}</select></label>
      ${d.cities.length ? `<label class="cm-sel"><span>Oraș</span><select data-f="city" data-param="oras"><option value="">Toate</option>${d.cities.map(([c, n]) => `<option value="${esc(c)}" data-q="${esc(slug(c))}">${esc(c)} (${n})</option>`).join('')}</select></label>` : ''}
    </div>
    <div class="cm-status"><p class="cm-count" aria-live="polite"><b>${nShown}</b> ${nShown === 1 ? 'membru' : 'membri'}</p><button class="cm-reset" type="button" ${selS || selE ? '' : 'hidden'}>Șterge filtrele</button></div>
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
        ${d.medianAng ? `<div><dt>${d.medianAng}</dt><dd>angajați la mediană</dd></div>` : ''}
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
      <p>Ești deja alumnus? Completează-ți profilul ca să te găsească cine are nevoie de tine. Nu ești încă? Comunitatea începe cu o ediție.</p>
      <div class="hero-actions"><a class="btn btn-light btn-lg" href="/aplica">Aplică la ediția următoare</a>${mail ? `<a class="btn btn-outline-light btn-lg" href="mailto:${esc(mail)}?subject=${encodeURIComponent('Profilul meu în comunitatea Antreprenoria')}">Completează-ți profilul</a>` : ''}</div>
    </div>
  </div></section>

  <div class="cm-drawer" id="cm-drawer" hidden data-mail="${esc(mail)}">
    <div class="cm-scrim" data-close></div>
    <aside class="cm-panel" role="dialog" aria-modal="true" aria-labelledby="cm-p-name" tabindex="-1">
      <button class="cm-x" type="button" data-close aria-label="Închide">${I.close}</button>
      <div class="cm-p-body"></div>
    </aside>
  </div>
</main>`;
}

// ---------- /comunitate/<id> ----------
function alumnusBody(ctx, F, id, opt = {}) {
  const d = alumniData(ctx), a = d.L.find((x) => x.id === id);
  const p = a.p || {};
  const o = a.org;
  // colegii din aceeași ediție (doar nume și fotografie)
  const last = a.eds[a.eds.length - 1];
  const colleagues = d.L.filter((x) => x.id !== id && x.eds.includes(last)).slice(0, 12);
  return `<main>
  ${opt.preview ? '<div class="al-preview"><div class="wrap">Previzualizare: pagina apare pe site când profilul e completat în panou (textul „despre el/ea”).</div></div>' : ''}
  <section class="hero pg-hero tr-hero"><div class="wrap">
    <nav class="crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><a href="/comunitate">Comunitatea</a><span>/</span><b>${esc(a.nume)}</b></nav>
    <div class="tr-top">
      <div class="tr-portrait">${avatar(a.imagine, a.nume, 640)}</div>
      <div class="hero-copy">
        <p class="eyebrow">Alumni ${a.eds.map(edLabel).join(', ')}${a.sector ? ` · ${esc(a.sector)}` : ''}</p>
        <h1>${esc(a.nume)}</h1>
        ${a.fn || o ? `<p class="tr-org">${esc([a.fn, o?.nume].filter(Boolean).join(' · '))}</p>` : ''}
        <p class="lead">${esc(p.bio || `A participat la Antreprenoria ${a.eds.map(edLabel).join(', ')}${o ? `, cu ${o.nume}` : ''}.`)}</p>
        <div class="hero-actions">${p.linkedin ? `<a class="btn btn-ghost btn-lg" href="${esc(p.linkedin)}" target="_blank" rel="noopener">LinkedIn ↗</a>` : ''}${o?.url ? `<a class="btn btn-ghost btn-lg" href="${esc(o.url)}" target="_blank" rel="noopener">Site-ul companiei ↗</a>` : ''}</div>
      </div>
      <aside class="pg-glance" aria-label="Pe scurt">
        <div class="ed-live-top"><span>Pe scurt</span><span>${esc(String(a.eds[0].an))}</span></div>
        <dl>
          <div><dt>${plural(a.eds.length, 'ediție', 'ediții')}</dt><dd>${a.eds.map((e) => `<a href="${edUrl(e)}">${esc(edLabel(e))}</a>, ${esc(e.sezon)} ${e.an}`).join('<br>')}</dd></div>
          ${o ? `<div><dt>${esc(o.nume)}</dt><dd>${esc(o.sector || o.tip || '')}</dd></div>` : ''}
        </dl>
      </aside>
    </div>
  </div></section>

  ${a.desc ? `<section class="sec" id="companie"><div class="wrap al-co">
    <div class="sec-head"><p class="eyebrow">Compania</p><h2>${esc(o?.nume || '')}</h2></div>
    <div>${o?.logo ? `<span class="logo-cell">${`${logoImg(o)}`}</span>` : ''}<p class="lead">${esc(a.desc)}</p></div>
  </div></section>` : ''}

  ${colleagues.length ? `<section class="sec sec-alt" id="colegi"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Colegi de ediție</p><h2>${esc(edLabel(last))}, ${esc(last.sezon)} ${last.an}.</h2></div><a class="link-arrow" href="${edUrl(last)}">Pagina ediției →</a></div>
    <div class="ed-chips">${colleagues.map((c) => { const h = href(c); const inner = `${avatar(c.imagine, c.nume)}<span><b>${esc(c.nume)}</b><span>${esc(c.org?.nume || '')}</span></span>`; return h ? `<a class="ed-chip" href="${h}">${inner}</a>` : `<div class="ed-chip">${inner}</div>`; }).join('')}</div>
  </div></section>` : ''}

  <section class="cta-band"><div class="wrap cta-band-in">
    <div class="cta-band-copy">
      <p class="eyebrow">Antreprenoria</p>
      <h2>Următorul pe listă poți fi tu.</h2>
      <p>Trei luni de ateliere, un grup selectat de colegi antreprenori și comunitatea RBL.</p>
      <div class="hero-actions"><a class="btn btn-light btn-lg" href="/aplica">Aplică</a><a class="btn btn-outline-light btn-lg" href="/comunitate">Toată comunitatea</a></div>
    </div>
  </div></section>
</main>`;
}

// indexul pentru căutarea din meniu (/comunitate.json): doar ce apare deja public pe /comunitate
function communityIndex(ctx) {
  return alumniData(ctx).L.map((a) => ({ id: a.id, n: a.nume, co: a.org?.nume || '', s: a.sector || '', d: a.desc, img: a.imagine ? img(a.imagine, 128) : '', ed: a.eds.map(edLabel).join(' · ') }));
}

module.exports = { alumniBody, alumnusBody, alumniData, hasPage, communityIndex, ideas, connectMail };
