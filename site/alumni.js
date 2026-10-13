// Alumni: /alumni (toți participanții edițiilor încheiate, cu filtre) și /alumni/<id> (doar pentru profilurile completate).
// Un participant devine alumnus când ediția lui se încheie; până atunci apare doar pe pagina ediției.
// Cifrele de business apar numai agregat, niciodată pe om sau pe companie.
const { esc, initials, img, milLei, slug } = require('./util');

const plural = (n, one, many) => `${n} ${n === 1 ? one : (n % 100 === 0 || n % 100 >= 20 ? 'de ' : '') + many}`;
const avatar = (src, nume, w) => (src ? `<img src="${esc(img(src, w))}" alt="" loading="lazy">` : `<span class="ph">${esc(initials(nume || '?'))}</span>`);
const edUrl = (e) => (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`);
const edLabel = (e) => (e.serie === 'Cluj' ? `Cluj #${e.numar}` : `#${e.numar}`);
const chrono = (D) => D.editii.slice().sort((a, b) => a.an - b.an || (a.sezon === b.sezon ? (a.serie === 'Cluj') - (b.serie === 'Cluj') : a.sezon === 'primăvară' ? -1 : 1));
// o ediție e încheiată (participanții devin alumni) doar după „Arhivează” din panou: starea „Ediție închisă”
const ended = (e) => /închis|încheiat/i.test(e.status || '');
const median = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const quantile = (a, q) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) * q)] : null; };

// pagina proprie apare doar când profilul e completat din panou (textul „despre el/ea”)
const hasPage = (p) => !!(p && p.bio && p.bio.trim().length > 20);

// toți alumnii, cu ce afișăm despre fiecare
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
    return { ...a, nume: a.p?.nume || a.nume, imagine: a.p?.imagine || last.imagine, org: o, sector: o?.sector || null, fn: (a.p?.functii || []).filter((f) => f && f !== 'Trainer').slice(-1)[0] || '', page: hasPage(a.p), speaker: !!a.p?.aparitii?.length };
  }).sort((x, y) => eds.indexOf(y.eds[y.eds.length - 1]) - eds.indexOf(x.eds[x.eds.length - 1]) || x.nume.localeCompare(y.nume, 'ro'));
  const parts = eds.flatMap((e) => e.participanti);
  const sectors = {};
  L.forEach((a) => { if (a.sector) sectors[a.sector] = (sectors[a.sector] || 0) + 1; });
  return { L, eds, companies: new Set(L.map((a) => a.org?.id).filter(Boolean)).size, sectors: Object.entries(sectors).sort((a, b) => b[1] - a[1]),
    q1: quantile(parts.map((x) => x.cifra_afaceri), 0.25), q3: quantile(parts.map((x) => x.cifra_afaceri), 0.75), medianAng: median(parts.map((x) => x.angajati)),
    ciclu: D.organizatii.filter((o) => o.ciclu) };
}
const href = (a) => (a.speaker ? `/traineri/${a.id}` : a.page ? `/alumni/${a.id}` : '');

// ---------- /alumni ----------
function alumniBody(ctx, F, sel = {}) {
  const d = alumniData(ctx);
  // filtrele cerute prin adresă: ?sector=tech-si-software, ?editie=bucuresti-18 (sau 18)
  const selS = d.sectors.find(([s]) => slug(s) === sel.sector)?.[0] || '';
  const selE = d.eds.find((e) => e.id === sel.editie || String(e.numar) === String(sel.editie || '').replace(/^#/, ''))?.id || '';
  const shown = (x) => (!selS || x.sector === selS) && (!selE || x.eds.some((e) => e.id === selE));
  const maxS = d.sectors[0]?.[1] || 1;
  const card = (a) => { const h = href(a), tag = h ? 'a' : 'div';
    return `<${tag} class="al-card ${h ? 'link' : ''}" ${h ? `href="${h}"` : ''} ${shown(a) ? '' : 'hidden'} data-ed="${esc(a.eds.map((e) => e.id).join(' '))}" data-sector="${esc(a.sector || '')}">
      <span class="al-ph">${avatar(a.imagine, a.nume, 256)}</span>
      <span class="al-tx"><b>${esc(a.nume)}</b><span>${esc(a.org?.nume || '')}</span><small>${a.eds.map(edLabel).join(', ')}${a.sector ? ` · ${esc(a.sector)}` : ''}</small>${a.speaker ? '<em>a revenit ca speaker</em>' : ''}</span>
    </${tag}>`; };
  return `<main>
  <section class="hero pg-hero"><div class="wrap">
    <nav class="crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><b>Alumni</b></nav>
    <div class="hero-split">
      <div class="hero-copy">
        <p class="eyebrow">Alumni</p>
        <h1>Antreprenorii care au trecut prin program.</h1>
        <p class="lead">${plural(d.L.length, 'antreprenor', 'antreprenori')} și manageri din ${plural(d.eds.length, 'ediție încheiată', 'ediții încheiate')}, de la ${esc(edLabel(d.eds[0]))} încoace. Participanții unei ediții devin alumni când ediția se încheie oficial.</p>
      </div>
      <aside class="pg-glance" id="cifre" aria-label="În cifre">
        <div class="ed-live-top"><span>În cifre</span><span>agregat</span></div>
        <dl>
          <div><dt>${plural(d.companies, 'companie', 'companii')}</dt><dd>din ${plural(d.sectors.length, 'sector', 'sectoare')}</dd></div>
          ${d.q1 ? `<div><dt>${milLei(d.q1)}–${milLei(d.q3)} mil. lei</dt><dd>cifra de afaceri a jumătății „de mijloc” a companiilor</dd></div>` : ''}
          ${d.medianAng ? `<div><dt>${d.medianAng} angajați</dt><dd>la mediană</dd></div>` : ''}
        </dl>
      </aside>
    </div>
  </div></section>

  <section class="sec tr-list-sec" id="lista"><div class="wrap">
    <div class="tr-filters" role="group" aria-label="Filtrează">
      <div class="tr-f sx" data-al-group="ed" data-param="editie"><button class="${selE ? '' : 'on'}" data-al="">Toate edițiile · ${d.L.length}</button>${d.eds.slice().reverse().map((e) => `<button class="${selE === e.id ? 'on' : ''}" data-al="${esc(e.id)}" data-q="${esc(String(e.numar))}">${esc(edLabel(e))} · ${e.participanti.length}</button>`).join('')}</div>
      <div class="tr-f tr-f-teme sx" data-al-group="sector" data-param="sector"><button class="${selS ? '' : 'on'}" data-al="">Toate sectoarele</button>${d.sectors.map(([s, n]) => `<button class="${selS === s ? 'on' : ''}" data-al="${esc(s)}" data-q="${esc(slug(s))}">${esc(s)} · ${n}</button>`).join('')}</div>
    </div>
    <div class="al-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input id="al-q" type="search" data-short="Caută după nume sau companie" placeholder="Caută printre alumni după nume sau companie" autocomplete="off" aria-label="Caută printre alumni după nume sau companie"></div>
    <p class="al-q-note" hidden></p>
    <div class="al-grid">${d.L.map(card).join('')}</div>
    <p class="tr-empty" ${d.L.some(shown) ? 'hidden' : ''}>Nimeni pentru combinația asta.</p>
  </div></section>

  ${d.ciclu.length ? `<section class="sec sec-alt" id="din-alumni-parteneri"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Din alumni, parteneri</p><h2>Vii ca participant. Revii ca partener.</h2>
      <p class="lead">${plural(d.ciclu.length, 'companie care a trecut', 'companii care au trecut')} prin program s-au întors să sponsorizeze ateliere, să le găzduiască sau să trimită speakeri.</p></div>
    <div class="al-cycle" style="--n:${d.ciclu.length}">${d.ciclu.map((o) => `<div class="al-cyc"><span class="logo-cell">${o.logo ? `<img src="${esc(o.logo)}" alt="${esc(o.nume)}" loading="lazy">` : `<b>${esc(o.nume)}</b>`}</span><b>${esc(o.nume)}</b><span>alumni ${esc(edLabel(ctx.D.editii.find((e) => e.id === o.ciclu.alumni_din) || { numar: '' }))} → ${esc(o.ciclu.apoi.map((r) => r.replace(' atelier', '')).join(', '))}</span></div>`).join('')}</div>
  </div></section>` : ''}

  <!-- sectoarele și îndemnul spre ediția următoare, într-o singură bandă -->
  <section class="cta-band al-end" id="sectoare"><div class="wrap cta-band-in al-end-in">
    <div class="al-end-sect">
      <p class="eyebrow">Pe sectoare</p><h3>Din ce domenii vin.</h3>
      <div class="sectors">${d.sectors.map(([s, n]) => `<div class="sector"><span>${esc(s)}</span><i style="--w:${(n / maxS) * 100}%"></i><b>${n}</b></div>`).join('')}</div>
    </div>
    <div class="cta-band-copy">
      <p class="eyebrow">Ediția următoare</p>
      <h2>Locul tău e pe lista asta.</h2>
      <p>În jur de 25 de antreprenori pe ediție, selectați ca discuțiile să fie între oameni cu provocări asemănătoare.</p>
      <div class="hero-actions"><a class="btn btn-light btn-lg" href="/aplica">Aplică</a><a class="btn btn-outline-light btn-lg" href="/program">Cum funcționează</a></div>
    </div>
  </div></section>
</main>`;
}

// ---------- /alumni/<id> ----------
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
    <nav class="crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><a href="/alumni">Alumni</a><span>/</span><b>${esc(a.nume)}</b></nav>
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

  ${o?.descriere ? `<section class="sec" id="companie"><div class="wrap al-co">
    <div class="sec-head"><p class="eyebrow">Compania</p><h2>${esc(o.nume)}</h2></div>
    <div>${o.logo ? `<span class="logo-cell">${`<img src="${esc(o.logo)}" alt="${esc(o.nume)}" loading="lazy">`}</span>` : ''}<p class="lead">${esc(o.descriere)}</p></div>
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
      <div class="hero-actions"><a class="btn btn-light btn-lg" href="/aplica">Aplică</a><a class="btn btn-outline-light btn-lg" href="/alumni">Toți alumnii</a></div>
    </div>
  </div></section>
</main>`;
}

module.exports = { alumniBody, alumnusBody, alumniData, hasPage };
