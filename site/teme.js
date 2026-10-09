// Curriculum-ul: /teme (matricea, temele principale, atelierele de seară) și /teme/<id> pentru cele 5 teme full-day.
// Totul vine din atelierele edițiilor din creier: cine a predat tema, când, sub ce titlu, cu ce sponsor.
const { esc, initials, fmtDay, today, img } = require('./util');

const plural = (n, one, many) => `${n} ${n === 1 ? one : (n % 100 === 0 || n % 100 >= 20 ? 'de ' : '') + many}`;
const avatar = (p) => (p?.imagine ? `<img src="${esc(img(p.imagine))}" alt="" loading="lazy">` : `<span class="ph">${esc(initials(p?.nume || '?'))}</span>`);
const edUrl = (e) => (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`);
const edLabel = (e) => (e.serie === 'Cluj' ? `Cluj #${e.numar}` : `#${e.numar}`);
const cleanTitle = (t) => String(t || '').replace(/^(Atelier de Seară|COCKTAIL NETWORKING)\s*[-:]\s*/i, '');
const sentence = (s) => { s = String(s || '').trim(); return s.charAt(0).toUpperCase() + s.slice(1); };
const cap = (s) => String(s || '').replace(/(^|[.!?]\s+)(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
const normCase = (d) => { const t = String(d || '').trim(); return t && t === t.toUpperCase() ? t.toLowerCase() : t; };
const firstSentence = (d) => sentence((normCase(d).match(/^[^.!?]+[.!?]/) || [normCase(d)])[0]);
const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// ordinea edițiilor în timp (Cluj după ediția din București din același sezon)
const chrono = (D) => D.editii.slice().sort((a, b) => a.an - b.an || (a.sezon === b.sezon ? (a.serie === 'Cluj') - (b.serie === 'Cluj') : a.sezon === 'primăvară' ? -1 : 1));

// tot ce știe creierul despre o temă
function themeData(ctx, id) {
  const { D, P, O, T } = ctx;
  const t = T[id];
  if (!t) return null;
  const order = chrono(D);
  const ws = order.flatMap((e) => e.ateliere.filter((a) => a.tema === id).map((a) => ({ e, a })));
  const people = new Map();
  ws.forEach(({ e, a }) => a.program.forEach((x) => x.speakeri.forEach((s) => {
    const p = P[s.persoana]; if (!p) return;
    const cur = people.get(p.id) || { p, rol: s.rol, org: O[s.organizatie]?.nume || (s.companie !== 'Trainer' ? s.companie : '') || O[p.organizatii[0]]?.nume || '', eds: [] };
    if (!cur.eds.includes(e)) cur.eds.push(e);
    people.set(p.id, cur);
  })));
  const list = [...people.values()].sort((a, b) => b.eds.length - a.eds.length || (a.rol === 'trainer' ? -1 : 1));
  const sponsors = [...new Set(ws.map(({ a }) => a.sponsor).filter(Boolean))].map((s) => O[s]).filter(Boolean);
  const latest = ws.filter(({ a }) => a.descriere).slice(-1)[0];
  const t0 = today();
  const next = ws.filter(({ e, a }) => a.data && a.data >= t0 && a.data.startsWith(String(e.an))).sort((x, y) => x.a.data.localeCompare(y.a.data))[0];
  const titles = [];
  ws.forEach(({ e, a }) => { const n = cleanTitle(a.titlu); const k = n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); const f = titles.find((x) => x.k === k); f ? f.eds.push(e) : titles.push({ k, n, eds: [e] }); });
  return { t, ws, people: list, trainers: list.filter((x) => x.rol === 'trainer'), invited: list.filter((x) => x.rol !== 'trainer'), sponsors, desc: cap(normCase(latest?.a.descriere || '')), next, titles };
}

const chip = (x, extra = '') => `<a class="ed-chip" href="/traineri/${esc(x.p.id)}">${avatar(x.p)}<span><b>${esc(x.p.nume)}</b><span>${esc(x.org)}</span>${extra}</span></a>`;
const faces = (list, max = 5) => `<span class="faces">${list.slice(0, max).map((x) => avatar(x.p || x)).join('')}</span>`;

// ---------- /teme/<id> ----------
function temaBody(ctx, F, id) {
  const { D, P, O, T } = ctx;
  const d = themeData(ctx, id);
  const fullDay = D.teme.filter((t) => t.format === 'full-day');
  const idx = fullDay.findIndex((t) => t.id === id);
  const others = fullDay.filter((t) => t.id !== id);
  const NAV = [['cine', 'Cine a predat-o'], ['revin', 'Cei care revin'], ['sustin', 'Cine o susține']];
  const nx = d.next;
  const nxPeople = nx ? nx.a.program.flatMap((x) => x.speakeri).map((s) => P[s.persoana]).filter(Boolean) : [];

  return `<main>
  <section class="hero pg-hero tm-hero"><div class="wrap">
    <nav class="crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><a href="/teme">Teme</a><span>/</span><b>${esc(d.t.nume)}</b></nav>
    <div class="hero-split">
      <div class="hero-copy">
        <p class="eyebrow">Temă full-day · ${String(idx + 1).padStart(2, '0')} din ${fullDay.length}</p>
        <h1>${esc(d.t.nume)}</h1>
        <p class="lead">${esc(d.desc)}</p>
        ${d.titles.length > 1 ? `<p class="tm-titles">Titluri de-a lungul edițiilor: ${d.titles.map((x) => `<span>${esc(x.n)} <small>${x.eds.map(edLabel).join(', ')}</small></span>`).join('')}</p>` : ''}
      </div>
      <aside class="pg-glance" aria-label="Tema în cifre">
        <div class="ed-live-top"><span>Tema în cifre</span><span>${d.ws[0] ? `din ${d.ws[0].e.an}` : ''}</span></div>
        <dl>
          <div><dt>${plural(d.t.editii.length, 'ediție', 'ediții')}</dt><dd>${(() => { const b = d.ws.filter(({ e }) => e.serie === 'București').map(({ e }) => e), c = d.ws.filter(({ e }) => e.serie === 'Cluj').map(({ e }) => e);
            return `${b.length === D.editii.filter((e) => e.serie === 'București').length ? 'în toate edițiile din arhivă: ' : ''}${b.length ? `${edLabel(b[0])}–${edLabel(b[b.length - 1])}` : ''}${c.length ? `, plus ${c.map(edLabel).join(', ')}` : ''}`; })()}</dd></div>
          <div><dt>${plural(d.trainers.length, 'trainer', 'traineri')}</dt><dd>${esc(d.trainers.slice(0, 3).map((x) => x.p.nume).join(', '))}${d.trainers.length > 3 ? ' și alții' : ''}</dd></div>
          <div><dt>${plural(d.invited.length, 'invitat', 'invitați')}</dt><dd>antreprenori care au povestit cum au rezolvat problema temei</dd></div>
          ${nx ? `<div class="tm-next"><dt><i class="dot-live"></i>Următorul</dt><dd><b>${fmtDay(nx.a.data)}</b>, ediția ${edLabel(nx.e)}${nx.a.locatie ? ` · ${esc(nx.a.locatie)}` : ''}${nxPeople.length ? `<span class="tm-next-p">${faces(nxPeople, 4)}${esc(nxPeople.map((p) => p.nume).join(', '))}</span>` : ''}</dd></div>` : ''}
        </dl>
      </aside>
    </div>
  </div>
  </section>
  <nav class="pg-nav" aria-label="Secțiunile paginii"><div class="wrap">${NAV.map(([k, t], i) => `<a href="#${k}"><i>0${i + 1}</i>${t}</a>`).join('')}</div></nav>

  <section class="sec" id="cine"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Cine a predat-o</p><h2>Ediție cu ediție.</h2></div>
    <div class="tm-time">${d.ws.slice().reverse().map(({ e, a }) => {
      const tr = a.program.filter((x) => /training/i.test(x.activitate)).flatMap((x) => x.speakeri).map((s) => P[s.persoana]).filter(Boolean);
      const inv = a.program.filter((x) => !/training/i.test(x.activitate)).flatMap((x) => x.speakeri).map((s) => P[s.persoana]).filter(Boolean);
      const sp = a.sponsor && O[a.sponsor];
      const up = nx && nx.a.id === a.id;
      return `<div class="tm-row ${up ? 'up' : ''}">
        <a class="tm-ed" href="${edUrl(e)}"><b>${edLabel(e)}</b><span>${a.data && a.data.startsWith(String(e.an)) ? fmtDay(a.data) : `${esc(e.sezon)} ${e.an}`}</span>${up ? '<em>urmează</em>' : ''}</a>
        <div class="tm-main"><b>${esc(cleanTitle(a.titlu))}</b>
          <div class="tm-people">${tr.map((p) => `<a href="/traineri/${esc(p.id)}" class="tm-p tr">${avatar(p)}<span>${esc(p.nume)}<small>trainer</small></span></a>`).join('')}${inv.map((p) => `<a href="/traineri/${esc(p.id)}" class="tm-p">${avatar(p)}<span>${esc(p.nume)}<small>invitat</small></span></a>`).join('')}</div></div>
        <div class="tm-sp">${sp ? (sp.logo ? `<img src="${esc(sp.logo)}" alt="${esc(sp.nume)}" title="Susținut de ${esc(sp.nume)}" loading="lazy">` : `<span>${esc(sp.nume)}</span>`) : ''}</div>
      </div>`; }).join('')}</div>
  </div></section>

  <section class="sec sec-alt" id="revin"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Cei care revin</p><h2>${plural(d.people.length, 'om', 'oameni')}, de câte ori au revenit.</h2></div>
    <div class="ed-chips">${d.people.map((x) => chip(x, `<small>${x.rol === 'trainer' ? '<i>Trainer</i> ' : ''}${plural(x.eds.length, 'ediție', 'ediții')}: ${x.eds.map(edLabel).join(', ')}</small>`)).join('')}</div>
  </div></section>

  ${d.sponsors.length ? `<section class="sec" id="sustin"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Cine o susține</p><h2>Companiile care au sponsorizat tema.</h2></div><a class="link-arrow" href="/parteneri">Sponsorizează un atelier →</a></div>
    <div class="ed-logos">${d.sponsors.map((o) => `<div class="ed-logo"><div class="logo-cell">${o.logo ? `<img src="${esc(o.logo)}" alt="${esc(o.nume)}" loading="lazy">` : `<b>${esc(o.nume)}</b>`}</div><span>${d.ws.filter(({ a }) => a.sponsor === o.id).map(({ e }) => edLabel(e)).join(', ')}</span></div>`).join('')}</div>
  </div></section>` : ''}

  <section class="cta-band"><div class="wrap cta-band-in">
    <div class="cta-band-copy">
      <p class="eyebrow">Curriculum</p>
      <h2>Una din cele ${fullDay.length} teme ale fiecărei ediții.</h2>
      <p>Fiecare ediție le parcurge pe toate, în trei luni, cu ateliere de seară între ele.</p>
      <div class="hero-actions"><a class="btn btn-light btn-lg" href="/aplica">Aplică</a><a class="btn btn-outline-light btn-lg" href="/teme">Tot curriculum-ul</a></div>
    </div>
    <nav class="ed-nav" aria-label="Celelalte teme">${others.map((t) => { const o = themeData(ctx, t.id);
      return `<a href="/teme/${esc(t.id)}"><span>Temă full-day</span><b class="tm-nav-b">${esc(t.nume)}</b><small>${plural(o.people.length, 'om', 'oameni')} · ${plural(t.editii.length, 'ediție', 'ediții')}</small></a>`; }).join('')}</nav>
  </div></section>
</main>`;
}

// ---------- /teme ----------
function temeBody(ctx, F) {
  const { D, P, T } = ctx;
  const order = chrono(D);
  const fullDay = D.teme.filter((t) => t.format === 'full-day');
  const evening = D.teme.filter((t) => t.format !== 'full-day');
  const data = Object.fromEntries(D.teme.map((t) => [t.id, themeData(ctx, t.id)]));
  const NAV = [['principale', 'Temele full-day'], ['matrice', 'Pe ediții'], ['seara', 'Ateliere de seară']];

  return `<main>
  <section class="hero pg-hero tm-hero"><div class="wrap">
    <nav class="crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><b>Teme</b></nav>
    <div class="hero-split">
      <div class="hero-copy">
        <p class="eyebrow">Curriculum</p>
        <h1>Cinci teme full-day, aceleași de ${fullDay[0].editii.length} ediții încoace.</h1>
        <p class="lead">Viziunea, modelul de business, marketingul, vânzările și cultura organizației: fiecare cu un trainer dimineața și doi antreprenori după-amiaza. Între ele, ateliere de seară care s-au schimbat de la o ediție la alta.</p>
      </div>
      <aside class="pg-glance" aria-label="Curriculum în cifre">
        <div class="ed-live-top"><span>În cifre</span><span>edițiile ${edLabel(order.find((e) => e.serie === 'București'))}–${edLabel(order.filter((e) => e.serie === 'București').slice(-1)[0])}</span></div>
        <dl>
          <div><dt>${D.teme.length} teme</dt><dd>${fullDay.length} full-day, ${evening.filter((t) => t.format === 'seară').length} de seară, plus petrecerea de final</dd></div>
          <div><dt>${D.editii.reduce((n, e) => n + e.ateliere.length, 0)} ateliere</dt><dd>în ${plural(D.editii.length, 'ediție', 'ediții')} din arhivă</dd></div>
          <div><dt>${D.oameni.filter((p) => p.aparitii.length).length} de oameni</dt><dd>traineri, antreprenori invitați și facilitatori</dd></div>
        </dl>
      </aside>
    </div>
  </div>
  </section>
  <nav class="pg-nav" aria-label="Secțiunile paginii"><div class="wrap">${NAV.map(([k, t], i) => `<a href="#${k}"><i>0${i + 1}</i>${t}</a>`).join('')}</div></nav>

  <section class="sec" id="principale"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Temele full-day</p><h2>Coloana vertebrală a fiecărei ediții.</h2></div>
    <div class="tm-cards">${fullDay.map((t, i) => { const d = data[t.id];
      return `<a class="tm-card" href="/teme/${esc(t.id)}"><span class="step-n">0${i + 1}</span><h3>${esc(t.nume)}</h3><p>${esc(firstSentence(d.desc))}</p>
        <span class="tm-card-f">${faces(d.people, 5)}<small>${plural(d.people.length, 'om', 'oameni')} · ${plural(t.editii.length, 'ediție', 'ediții')}</small></span>
        ${d.next ? `<em><i class="dot-live"></i>Următorul: ${fmtDay(d.next.a.data)}</em>` : `<em>Vezi tema ${ARROW}</em>`}</a>`; }).join('')}</div>
  </div></section>

  <section class="sec sec-alt" id="matrice"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Pe ediții</p><h2>Ce teme a avut fiecare ediție.</h2></div>
    <div class="tm-matrix-wrap"><table class="tm-matrix">
      <thead><tr><th scope="col">Temă</th>${order.map((e) => `<th scope="col"><a href="${edUrl(e)}">${edLabel(e)}</a><small>${e.an}</small></th>`).join('')}</tr></thead>
      <tbody>${D.teme.map((t) => `<tr class="${t.format === 'full-day' ? 'fd' : ''}"><th scope="row"><a href="${t.format === 'full-day' ? `/teme/${esc(t.id)}` : `#${esc(t.id)}`}">${esc(t.nume)}</a><small>${esc(t.format)}</small></th>${order.map((e) => { const a = e.ateliere.find((x) => x.tema === t.id);
        return `<td>${a ? `<i class="on" title="${esc(cleanTitle(a.titlu))} · ${edLabel(e)}"></i>` : '<i></i>'}</td>`; }).join('')}</tr>`).join('')}</tbody>
    </table></div>
  </div></section>

  <section class="sec" id="seara"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Ateliere de seară</p><h2>Sesiunile dintre temele mari.</h2></div>
    <div class="tm-evening">${evening.map((t) => { const d = data[t.id];
      return `<div class="tm-ev" id="${esc(t.id)}"><div class="tm-ev-h"><h3>${esc(t.nume)}</h3><span>${plural(t.editii.length, 'ediție', 'ediții')}</span></div>
        ${d.desc ? `<p>${esc(firstSentence(d.desc))}</p>` : ''}
        <div class="tm-ev-eds">${d.ws.map(({ e }) => `<a href="${edUrl(e)}">${edLabel(e)}</a>`).join('')}</div>
        ${d.people.length ? `<div class="tm-ev-p">${d.people.map((x) => `<a href="/traineri/${esc(x.p.id)}" title="${esc(x.p.nume)}">${avatar(x.p)}<span>${esc(x.p.nume)}</span></a>`).join('')}</div>` : ''}
      </div>`; }).join('')}</div>
  </div></section>

  <section class="cta-band"><div class="wrap cta-band-in">
    <div class="cta-band-copy"><p class="eyebrow">Aplică</p><h2>Parcurge toate temele într-un singur trimestru.</h2>
      <p>Intră pe lista pentru ediția #${F.maxNr + 1}${F.cluj ? ` sau aplică la Cluj #${F.cluj.numar}` : ''}.</p>
      <div class="hero-actions"><a class="btn btn-light btn-lg" href="/aplica">Intră pe lista de așteptare</a><a class="btn btn-outline-light btn-lg" href="/program">Cum funcționează</a></div></div>
    <nav class="ed-nav" aria-label="Temele full-day">${fullDay.slice(0, 3).map((t) => `<a href="/teme/${esc(t.id)}"><span>Temă full-day</span><b class="tm-nav-b">${esc(t.nume)}</b><small>${plural(data[t.id].people.length, 'om', 'oameni')}</small></a>`).join('')}</nav>
  </div></section>
</main>`;
}

module.exports = { temeBody, temaBody };
