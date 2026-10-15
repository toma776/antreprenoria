// Paginile separate ale comunității: căutarea (/comunitate/cauta), industriile (/comunitate/industrii, /comunitate/industrii/<industrie>)
// și cohortele (/comunitate/cohorte, /comunitate/cohorte/<18 | cluj-1>). Toate folosesc aceleași carduri și același profil rapid ca /comunitate.
const { esc, slug, de } = require('./util');
const { I, plural, avatar, edUrl, edLabel, edKey, sectorUrl, edCmUrl, cmCard, cmRow, cmDrawer, alumniData, connectMail, ideas } = require('./alumni');

const crumbs = (items) => `<nav class="crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><a href="/comunitate">Comunitatea</a>${items.map(([l, u]) => `<span>/</span>${u ? `<a href="${esc(u)}">${esc(l)}</a>` : `<b>${esc(l)}</b>`}`).join('')}</nav>`;
// comutatorul dintre cele două feluri de felii
const sw = (cur) => `<nav class="cx-switch" aria-label="Explorează după"><a href="/comunitate/industrii" ${cur === 'sector' ? 'aria-current="page"' : ''}>Industrii</a><a href="/comunitate/cohorte" ${cur === 'ed' ? 'aria-current="page"' : ''}>Cohorte</a><a href="/comunitate/cauta">${I.search}<span>Caută</span></a></nav>`;
const stack = (L, n = 5) => `<span class="cm-stack">${L.slice(0, n).map((a) => `<span>${avatar(a.imagine, a.nume, 128)}</span>`).join('')}</span>`;
const companies = (L) => new Set(L.map((a) => a.org?.id).filter(Boolean)).size;
const kpis = (rows) => `<dl class="cx-kpis">${rows.map(([n, l]) => `<div><dt>${n}</dt><dd>${l}</dd></div>`).join('')}</dl>`;
const emptyBox = (mail) => `<div class="cm-empty" hidden><b>Nimic încă pentru căutarea asta.</b><span>Spune-ne ce cauți: echipa întreabă în comunitate și revine cu un om potrivit.</span>${mail ? `<a class="btn btn-primary" href="mailto:${esc(mail)}?subject=${encodeURIComponent('Caut în comunitatea Antreprenoria')}">Cere o recomandare</a>` : ''}</div>`;
// directorul unei felii: căutare în felie, un filtru pe cealaltă dimensiune, cardurile
const directory = (L, filter, label, mail) => `<section class="sec cm-dir" id="lista"><div class="wrap">
    <div class="cm-bar">
      <div class="cm-bar-q"><span class="cm-search-ic">${I.search}</span><input id="cm-q2" type="search" placeholder="Caută în ${esc(label)}" autocomplete="off" aria-label="Caută în ${esc(label)}"></div>
      ${filter}
    </div>
    <div class="cm-status"><p class="cm-count" aria-live="polite"><b>${L.length}</b> ${L.length === 1 ? 'membru' : de(L.length) + 'membri'}</p><button class="cm-reset" type="button" hidden>Șterge filtrele</button></div>
    <p class="cm-note" hidden></p>
    <div class="cm-grid">${L.map((a) => cmCard(a)).join('')}</div>
    ${emptyBox(mail)}
  </div></section>`;

// ---------- /comunitate/cauta ----------
// un motor de căutare: pe pagina goală, căutarea la mijloc; cu o întrebare, rezultatele în listă, cu fațete în dreapta
function searchBody(ctx, F, q = '') {
  const d = alumniData(ctx), mail = connectMail(ctx.D), id = ideas(d.L);
  return `<main class="cm cs${q ? '' : ' is-empty'}">
  <section class="cs-top"><div class="wrap">
    ${crumbs([['Căutare']])}
    <div class="cs-brand">
      <p class="cs-kicker">${I.search}Motorul comunității</p>
      <h1>Caută printre ${d.L.length} de antreprenori.</h1>
      <p>Un serviciu, un produs, o problemă de rezolvat. Căutarea citește ce face fiecare companie din comunitate.</p>
    </div>
    <form class="cm-search cs-search" role="search" action="/comunitate/cauta">
      <span class="cm-search-ic">${I.search}</span>
      <input id="cm-q" name="q" type="search" value="${esc(q)}" placeholder="Ce cauți? ex. servicii SEO, software de logistică" data-short="Ce cauți?" autocomplete="off" aria-label="Caută în comunitate după nevoie, companie sau nume" ${q ? '' : 'autofocus'}>
      <kbd class="cs-kbd" aria-hidden="true">/</kbd>
      <button class="btn btn-primary" type="submit">Caută</button>
    </form>
    <div class="cs-pop" aria-label="Căutări frecvente"><span>Căutări frecvente</span>${id.map((w) => `<button type="button" data-idea="${esc(w)}">${esc(w)}</button>`).join('')}</div>
    <dl class="cs-stats">
      <div><dt>${d.L.length}</dt><dd>${de(d.L.length)}antreprenori</dd></div>
      <div><dt>${d.companies}</dt><dd>${de(d.companies)}companii</dd></div>
      <div><dt>${d.sectors.length}</dt><dd>${de(d.sectors.length)}industrii</dd></div>
      <div><dt>${d.eds.length}</dt><dd>${de(d.eds.length)}cohorte</dd></div>
    </dl>
    <nav class="cs-tabs" aria-label="Rezultate"><a aria-current="page" href="/comunitate/cauta">Membri</a><a href="/comunitate/industrii">Industrii</a><a href="/comunitate/cohorte">Cohorte</a></nav>
  </div></section>

  <section class="cs-body" id="lista"><div class="wrap cs-grid">
    <div class="cs-main">
      <div class="cm-status"><p class="cm-count" aria-live="polite"></p><button class="cm-reset" type="button" hidden>Șterge filtrele</button></div>
      <p class="cm-note" hidden></p>
      <div class="cm-grid cs-list" data-mode="search">${d.L.map(cmRow).join('')}</div>
      ${emptyBox(mail)}
      <div class="cs-related"><h2>Alte căutări</h2><div>${id.map((w) => `<button type="button" data-idea="${esc(w)}">${I.search}${esc(w)}</button>`).join('')}</div></div>
    </div>
    <aside class="cs-side" aria-label="Filtre și ajutor">
      <div class="cs-card">
        <h2>Industrie</h2>
        <label class="cm-sel" hidden><span>Industrie</span><select data-f="sector" data-param="sector"><option value="">Toate</option>${d.sectors.map(([s]) => `<option value="${esc(s)}" data-q="${esc(slug(s))}">${esc(s)}</option>`).join('')}</select></label>
        <div class="cs-facets" data-for="sector"></div>
        <h2>Cohortă</h2>
        <label class="cm-sel cs-sel"><span>Cohortă</span><select data-f="ed" data-param="editie"><option value="">Toate</option>${d.eds.slice().reverse().map((e) => `<option value="${esc(e.id)}" data-q="${esc(edKey(e))}">${esc(edLabel(e))} · ${esc(e.sezon)} ${e.an}</option>`).join('')}</select></label>
      </div>
      <div class="cs-card cs-help">
        <h2>Nu găsești ce cauți?</h2>
        <p>Spune-ne de ce ai nevoie. Echipa întreabă în comunitate și revine cu un om potrivit.</p>
        ${mail ? `<a class="btn btn-primary" href="mailto:${esc(mail)}?subject=${encodeURIComponent('Caut în comunitatea Antreprenoria')}">Cere o recomandare</a>` : ''}
      </div>
      <div class="cs-card cs-browse">
        <h2>Răsfoiește</h2>
        <a href="/comunitate/industrii"><b>Pe industrii</b><span>${d.sectors.length} de industrii</span>${I.arrow}</a>
        <a href="/comunitate/cohorte"><b>Pe cohorte</b><span>${d.eds.length} de cohorte încheiate</span>${I.arrow}</a>
      </div>
    </aside>
  </div></section>
  ${cmDrawer(mail)}
</main>`;
}

// ---------- /comunitate/industrii ----------
function industriiBody(ctx) {
  const d = alumniData(ctx), max = d.sectors[0]?.[1] || 1;
  return `<main class="cm cx">
  <section class="cx-hero"><div class="wrap">
    ${crumbs([['Industrii']])}
    <div class="cx-hero-in">
      <div><p class="eyebrow">Comunitatea, pe felii</p><h1>${d.sectors.length} de industrii. Un coleg în fiecare.</h1>
        <p class="lead">Antreprenorii din comunitate, grupați după industria companiei. Intră într-o industrie ca să vezi cine lucrează acolo și cere o conectare.</p></div>
      ${sw('sector')}
    </div>
  </div></section>
  <section class="sec cx-sec"><div class="wrap">
    <ol class="cx-list">${d.sectors.map(([s, n], i) => {
      const L = d.L.filter((a) => a.sector === s), cos = [...new Set(L.map((a) => a.org?.nume).filter(Boolean))];
      return `<li><a href="${esc(sectorUrl(s))}">
        <span class="cx-i">${String(i + 1).padStart(2, '0')}</span>
        <span class="cx-name"><b>${esc(s)}</b><small>${esc(cos.slice(0, 3).join(', '))}${cos.length > 3 ? ` și încă ${cos.length - 3}` : ''}</small></span>
        <span class="cx-bar" aria-hidden="true"><i style="--w:${(n / max) * 100}%"></i></span>
        <span class="cx-n"><b>${n}</b>${n === 1 ? 'membru' : de(n) + 'membri'}</span>
        ${stack(L, 4)}
        <i class="cx-go">${I.arrow}</i></a></li>`;
    }).join('')}</ol>
  </div></section>
</main>`;
}

// ---------- /comunitate/industrii/<industrie> ----------
function industrieBody(ctx, F, key) {
  const d = alumniData(ctx), hit = d.sectors.find(([s]) => slug(s) === key);
  if (!hit) return null;
  const [s] = hit, L = d.L.filter((a) => a.sector === s), mail = connectMail(ctx.D);
  const eds = d.eds.filter((e) => L.some((a) => a.eds.includes(e))).reverse();
  const share = Math.round((L.length / d.L.length) * 100);
  const filter = `<label class="cm-sel"><span>Cohortă</span><select data-f="ed" data-param="editie"><option value="">Toate</option>${eds.map((e) => `<option value="${esc(e.id)}" data-q="${esc(edKey(e))}">${esc(edLabel(e))} · ${esc(e.sezon)} ${e.an} (${L.filter((a) => a.eds.includes(e)).length})</option>`).join('')}</select></label>`;
  const others = d.sectors.filter(([x]) => x !== s);
  return { title: s, html: `<main class="cm cx">
  <section class="cx-hero"><div class="wrap">
    ${crumbs([['Industrii', '/comunitate/industrii'], [s]])}
    <div class="cx-hero-in">
      <div><p class="eyebrow">Industrie</p><h1>${esc(s)}</h1>
        <p class="lead">${plural(L.length, 'antreprenor', 'antreprenori')} din ${plural(companies(L), 'companie', 'companii')}, din ${plural(eds.length, 'cohortă', 'cohorte')} Antreprenoria. Deschide un profil ca să vezi ce face fiecare și cere o conectare.</p>
        ${stack(L, 7)}</div>
      ${kpis([[L.length, L.length === 1 ? 'membru' : de(L.length) + 'membri'], [companies(L), de(companies(L)) + 'companii'], [eds.length, de(eds.length) + 'cohorte'], [`${share}%`, 'din comunitate']])}
    </div>
  </div></section>
  ${directory(L, filter, s, mail)}
  <section class="sec cx-more"><div class="wrap">
    <div class="cx-more-h"><h2>Alte industrii</h2><a href="/comunitate/industrii">Toate ${I.arrow}</a></div>
    <div class="cx-chips">${others.map(([x, n]) => `<a href="${esc(sectorUrl(x))}">${esc(x)}<small>${n}</small></a>`).join('')}</div>
  </div></section>
  ${cmDrawer(mail)}
</main>` };
}

// ---------- /comunitate/cohorte ----------
function cohorteBody(ctx) {
  const d = alumniData(ctx), eds = d.eds.slice().reverse();
  const years = [...new Set(eds.map((e) => e.an))];
  const tile = (e) => {
    const L = d.L.filter((a) => a.eds.includes(e));
    const top = Object.entries(L.reduce((m, a) => { if (a.sector) m[a.sector] = (m[a.sector] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([x]) => x);
    return `<a class="cx-ed" href="${esc(edCmUrl(e))}">
      <span class="cx-ed-top"><b>${esc(edLabel(e))}</b><span>${esc(e.serie === 'Cluj' ? 'Cluj' : 'București')} · ${esc(e.sezon)}</span></span>
      <span class="cx-ed-n"><b>${L.length}</b> ${L.length === 1 ? 'membru' : de(L.length) + 'membri'}</span>
      ${top.length ? `<span class="cx-ed-s">${esc(top.join(' · '))}</span>` : ''}
      <span class="cx-ed-ft">${stack(L, 5)}<i class="cx-go">${I.arrow}</i></span></a>`;
  };
  return `<main class="cm cx">
  <section class="cx-hero"><div class="wrap">
    ${crumbs([['Cohorte']])}
    <div class="cx-hero-in">
      <div><p class="eyebrow">Comunitatea, pe felii</p><h1>${d.eds.length} de cohorte. Fiecare, o promoție de colegi.</h1>
        <p class="lead">Antreprenorii care au trecut împreună prin program, cohortă cu cohortă. Intră într-o cohortă ca să vezi cine a fost acolo și ce face acum.</p></div>
      ${sw('ed')}
    </div>
  </div></section>
  <section class="sec cx-sec"><div class="wrap">
    ${years.map((y) => `<div class="cx-year"><h2>${y}</h2><div class="cx-eds">${eds.filter((e) => e.an === y).map(tile).join('')}</div></div>`).join('')}
  </div></section>
</main>`;
}

// ---------- /comunitate/cohorte/<18 | cluj-1> ----------
function cohortaBody(ctx, F, key) {
  const d = alumniData(ctx), i = d.eds.findIndex((e) => edKey(e) === key);
  if (i < 0) return null;
  const e = d.eds[i], L = d.L.filter((a) => a.eds.includes(e)), mail = connectMail(ctx.D);
  const prev = d.eds[i - 1], next = d.eds[i + 1];
  const secs = Object.entries(L.reduce((m, a) => { if (a.sector) m[a.sector] = (m[a.sector] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
  const filter = `<label class="cm-sel"><span>Industrie</span><select data-f="sector" data-param="sector"><option value="">Toate</option>${secs.map(([x, n]) => `<option value="${esc(x)}" data-q="${esc(slug(x))}">${esc(x)} (${n})</option>`).join('')}</select></label>`;
  const nav = (x, dir) => (x ? `<a class="cx-pn" href="${esc(edCmUrl(x))}" rel="${dir}"><small>${dir === 'prev' ? '← Cohorta anterioară' : 'Cohorta următoare →'}</small><b>${esc(edLabel(x))} · ${esc(x.sezon)} ${x.an}</b></a>` : '<span></span>');
  return { title: `Cohorta ${edLabel(e)}`, html: `<main class="cm cx">
  <section class="cx-hero"><div class="wrap">
    ${crumbs([['Cohorte', '/comunitate/cohorte'], [edLabel(e)]])}
    <div class="cx-hero-in">
      <div><p class="eyebrow">Cohorta ${esc(e.serie === 'Cluj' ? 'Cluj' : 'București')} · ${esc(e.sezon)} ${e.an}</p><h1>Antreprenoria ${esc(edLabel(e))}</h1>
        <p class="lead">${plural(L.length, 'antreprenor', 'antreprenori')} care au trecut împreună prin program${e.perioada ? `, ${esc(e.perioada)}` : ''}. Acum fac parte din comunitate.</p>
        <div class="cx-act"><a class="btn btn-ghost" href="${esc(edUrl(e))}">Programul cohortei ${I.arrow}</a></div></div>
      ${kpis([[L.length, L.length === 1 ? 'membru' : de(L.length) + 'membri'], [companies(L), de(companies(L)) + 'companii'], [secs.length, de(secs.length) + 'industrii'], [e.an, e.sezon]])}
    </div>
    ${secs.length ? `<div class="cx-chips cx-chips-hero">${secs.map(([x, n]) => `<a href="${esc(sectorUrl(x))}">${esc(x)}<small>${n}</small></a>`).join('')}</div>` : ''}
  </div></section>
  ${directory(L, filter, `cohorta ${edLabel(e)}`, mail)}
  <section class="sec cx-more"><div class="wrap cx-pns">${nav(prev, 'prev')}${nav(next, 'next')}</div></section>
  ${cmDrawer(mail)}
</main>` };
}

module.exports = { searchBody, industriiBody, industrieBody, cohorteBody, cohortaBody };
