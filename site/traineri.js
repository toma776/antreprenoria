// Trainerii, antreprenorii invitați și facilitatorii: /traineri (toți, cu filtre) și /traineri/<id> (pagina fiecăruia).
// Totul vine din agenda atelierelor: ce teme a ținut fiecare, în ce ediții, alături de cine.
const { esc, initials, fmtDay, today, img } = require('./util');

const plural = (n, one, many) => `${n} ${n === 1 ? one : (n % 100 === 0 || n % 100 >= 20 ? 'de ' : '') + many}`;
const avatar = (p, w) => (p?.imagine ? `<img src="${esc(img(p.imagine, w))}" alt="" loading="lazy">` : `<span class="ph">${esc(initials(p?.nume || '?'))}</span>`);
const edUrl = (e) => (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`);
const edLabel = (e) => (e.serie === 'Cluj' ? `Cluj #${e.numar}` : `#${e.numar}`);
const cleanTitle = (t) => String(t || '').replace(/^(Atelier de Seară|COCKTAIL NETWORKING)\s*[-:]\s*/i, '').replace(/\.\s*$/, '');
const chrono = (D) => D.editii.slice().sort((a, b) => a.an - b.an || (a.sezon === b.sezon ? (a.serie === 'Cluj') - (b.serie === 'Cluj') : a.sezon === 'primăvară' ? -1 : 1));
const ROL = { trainer: 'Trainer', 'antreprenor invitat': 'Antreprenor invitat', facilitator: 'Facilitator', invitat: 'Invitat' };
const SPEAKER = ['trainer', 'antreprenor invitat', 'facilitator', 'invitat'];
const FULL = ['viziune', 'model-de-business', 'marketing', 'vanzari', 'cultura'];

// rolul principal: cel cu cele mai multe apariții (la egalitate, trainer înaintea invitatului)
function mainRole(p) {
  const n = {};
  p.aparitii.forEach((a) => { n[a.rol] = (n[a.rol] || 0) + 1; });
  return Object.keys(n).sort((a, b) => n[b] - n[a] || SPEAKER.indexOf(a) - SPEAKER.indexOf(b))[0] || p.tipuri.find((t) => SPEAKER.includes(t)) || 'invitat';
}
// compania afișată: cea din ultima apariție
function company(ctx, p) {
  const last = p.aparitii[p.aparitii.length - 1];
  return ctx.O[last?.organizatie]?.nume || (last?.companie && last.companie !== 'Trainer' ? last.companie : '') || ctx.O[p.organizatii[0]]?.nume || '';
}
const role = (p) => (p.functii || []).filter((f) => f && f !== 'Trainer').slice(-1)[0] || '';

// tot ce știm despre un om din program
function personData(ctx, id) {
  const { D, P, O, T } = ctx;
  const p = P[id];
  if (!p || !p.aparitii.length) return null;
  const order = chrono(D), rank = Object.fromEntries(order.map((e, i) => [e.id, i]));
  const byId = Object.fromEntries(D.editii.map((e) => [e.id, e]));
  const t0 = today();
  // fiecare apariție, cu atelierul și ediția ei
  const ws = p.aparitii.map((a) => { const e = byId[a.editie]; const w = e?.ateliere.find((x) => x.nr === a.atelier); return e && w ? { e, w, rol: a.rol } : null; })
    .filter(Boolean).sort((x, y) => rank[x.e.id] - rank[y.e.id] || x.w.nr - y.w.nr);
  const eds = [...new Set(ws.map((x) => x.e))];
  const themes = [...new Set(ws.map((x) => x.w.tema).filter(Boolean))].map((t) => T[t]).filter(Boolean);
  // ceilalți oameni din aceleași ateliere, după câte ateliere au avut în comun
  const co = new Map();
  ws.forEach(({ w }) => w.program.forEach((m) => m.speakeri.forEach((s) => {
    if (s.persoana === id || !P[s.persoana]) return;
    const c = co.get(s.persoana) || { p: P[s.persoana], n: 0, rol: s.rol };
    c.n++; co.set(s.persoana, c);
  })));
  const next = ws.filter(({ e, w }) => w.data && w.data >= t0 && w.data.startsWith(String(e.an))).sort((x, y) => x.w.data.localeCompare(y.w.data))[0];
  return { p, ws, eds, themes, co: [...co.values()].sort((a, b) => b.n - a.n), rol: mainRole(p), org: company(ctx, p), fn: role(p), next };
}
// toți oamenii programului (traineri, invitați, facilitatori), cu ce afișăm în listă
function everyone(ctx) {
  return ctx.D.oameni.filter((p) => p.aparitii.length && p.tipuri.some((t) => SPEAKER.includes(t)))
    .map((p) => ({ p, rol: mainRole(p), org: company(ctx, p), themes: [...new Set(p.aparitii.map((a) => a.tema).filter(Boolean))] }))
    .sort((a, b) => b.p.editii.length - a.p.editii.length || b.p.aparitii.length - a.p.aparitii.length || a.p.nume.localeCompare(b.p.nume, 'ro'));
}
const span = (eds) => { const b = eds.filter((e) => e.serie === 'București'), c = eds.filter((e) => e.serie === 'Cluj'); return [b.length > 2 ? `${edLabel(b[0])}–${edLabel(b[b.length - 1])}` : b.map(edLabel).join(', '), ...c.map(edLabel)].filter(Boolean).join(', '); };

// ---------- /traineri ----------
function traineriBody(ctx, F) {
  const { D, T } = ctx;
  const L = everyone(ctx);
  const n = (r) => L.filter((x) => x.rol === r || (r === 'facilitator' && x.rol === 'invitat')).length;
  const themes = D.teme.filter((t) => L.some((x) => x.themes.includes(t.id)));
  const first = chrono(D).find((e) => e.ateliere.length);
  return `<main>
  <section class="hero pg-hero"><div class="wrap">
    <nav class="crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><b>Traineri</b></nav>
    <div class="hero-split">
      <div class="hero-copy">
        <p class="eyebrow">Traineri și antreprenori invitați</p>
        <h1>Oameni care vorbesc din ce trăiesc.</h1>
        <p class="lead">Dimineața, un trainer lucrează aplicat cu grupa. După-amiaza, antreprenori care au trecut prin aceeași problemă povestesc cum au rezolvat-o. ${plural(L.filter((x) => x.p.editii.length >= 5).length, 'om revine', 'oameni revin')} în cel puțin cinci ediții.</p>
      </div>
      <aside class="pg-glance" aria-label="În cifre">
        <div class="ed-live-top"><span>În cifre</span><span>${first ? `din ${first.an}` : ''}</span></div>
        <dl>
          <div><dt>${plural(n('trainer'), 'trainer', 'traineri')}</dt><dd>pentru partea aplicată a atelierelor full-day</dd></div>
          <div><dt>${plural(n('antreprenor invitat'), 'antreprenor invitat', 'antreprenori invitați')}</dt><dd>care povestesc cum au rezolvat problema zilei</dd></div>
          <div><dt>${plural(n('facilitator'), 'facilitator', 'facilitatori')}</dt><dd>pentru atelierele de seară</dd></div>
        </dl>
      </aside>
    </div>
  </div></section>

  <section class="sec tr-list-sec" id="lista"><div class="wrap">
    <div class="tr-filters" role="group" aria-label="Filtrează">
      <div class="tr-f" data-tr-group="rol"><button class="on" data-tr="">Toți · ${L.length}</button>${[['trainer', 'Traineri'], ['antreprenor invitat', 'Antreprenori invitați'], ['facilitator', 'Facilitatori']].map(([k, l]) => `<button data-tr="${esc(k)}">${l} · ${n(k)}</button>`).join('')}</div>
      <div class="tr-f tr-f-teme sx" data-tr-group="tema"><button class="on" data-tr="">Toate temele</button>${themes.map((t) => `<button data-tr="${esc(t.id)}">${esc(t.nume)}</button>`).join('')}</div>
    </div>
    <div class="tr-grid">${L.map((x) => `<a class="tr-card" href="/traineri/${esc(x.p.id)}" data-rol="${esc(x.rol === 'invitat' ? 'facilitator' : x.rol)}" data-teme="${esc(x.themes.join(' '))}">
      <span class="tr-ph">${avatar(x.p, 384)}</span>
      <span class="tr-tx"><em>${esc(ROL[x.rol] || 'Invitat')}</em><b>${esc(x.p.nume)}</b><span>${esc(x.org)}</span>
        <small>${plural(x.p.editii.length, 'ediție', 'ediții')}${x.themes[0] && T[x.themes[0]] ? ` · ${esc(T[x.themes[0]].nume)}` : ''}</small></span></a>`).join('')}</div>
    <p class="tr-empty" hidden>Nimeni pentru combinația asta.</p>
  </div></section>

  <section class="cta-band"><div class="wrap cta-band-in">
    <div class="cta-band-copy">
      <p class="eyebrow">Curriculum</p>
      <h2>Fiecare temă, cu oamenii ei.</h2>
      <p>Cinci teme full-day, aceleași în fiecare ediție, și ateliere de seară între ele.</p>
      <div class="hero-actions"><a class="btn btn-light btn-lg" href="/aplica">Aplică</a><a class="btn btn-outline-light btn-lg" href="/teme">Vezi temele</a></div>
    </div>
  </div></section>
</main>`;
}

// ---------- /traineri/<id> ----------
function trainerBody(ctx, F, id) {
  const { D, T } = ctx;
  const d = personData(ctx, id);
  const { p } = d;
  const NAV = [['ateliere', 'Atelierele'], ...(d.co.length ? [['alaturi', 'Alături de']] : []), ...(d.themes.length ? [['teme', 'Temele']] : [])];
  const nx = d.next;
  // alți oameni ai temei principale, pentru navigarea de la final
  const main = d.themes.find((t) => FULL.includes(t.id)) || d.themes[0];
  const peers = main ? everyone(ctx).filter((x) => x.p.id !== id && x.themes.includes(main.id)).slice(0, 3) : [];
  // fără text „despre”, o frază din ce știm: rolul, edițiile, temele (compania e deja sub nume)
  const lead = p.bio || `${ROL[d.rol] || 'Invitat'} Antreprenoria în ${plural(d.eds.length, 'ediție', 'ediții')}${d.themes.length ? `, la ${d.themes.length === 1 ? 'tema' : 'temele'} ${d.themes.map((t) => t.nume).join(', ')}` : ''}.`;
  return `<main>
  <section class="hero pg-hero tr-hero"><div class="wrap">
    <nav class="crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><a href="/traineri">Traineri</a><span>/</span><b>${esc(p.nume)}</b></nav>
    <div class="tr-top">
      <div class="tr-portrait">${avatar(p, 640)}</div>
      <div class="hero-copy">
        <p class="eyebrow">${esc(ROL[d.rol] || 'Invitat')}${main ? ` · ${esc(main.nume)}` : ''}</p>
        <h1>${esc(p.nume)}</h1>
        ${d.fn || d.org ? `<p class="tr-org">${esc([d.fn, d.org].filter(Boolean).join(' · '))}</p>` : ''}
        <p class="lead">${esc(lead)}</p>
        <div class="hero-actions">${p.linkedin ? `<a class="btn btn-ghost btn-lg" href="${esc(p.linkedin)}" target="_blank" rel="noopener">LinkedIn ↗</a>` : ''}${nx ? `<a class="btn btn-primary btn-lg" href="${edUrl(nx.e)}#agenda"><i class="dot-live"></i>Următorul atelier: ${fmtDay(nx.w.data)}</a>` : ''}</div>
      </div>
      <aside class="pg-glance" aria-label="Pe scurt">
        <div class="ed-live-top"><span>Pe scurt</span><span>din ${d.eds[0].an}</span></div>
        <dl>
          <div><dt>${plural(d.eds.length, 'ediție', 'ediții')}</dt><dd>${esc(span(d.eds))}</dd></div>
          <div><dt>${plural(d.ws.length, 'atelier', 'ateliere')}</dt><dd>${esc([...new Set(d.ws.map((x) => ROL[x.rol] || x.rol))].join(', ').toLowerCase())}</dd></div>
          ${d.themes.length ? `<div><dt>${plural(d.themes.length, 'temă', 'teme')}</dt><dd>${esc(d.themes.map((t) => t.nume).join(', '))}</dd></div>` : ''}
        </dl>
      </aside>
    </div>
  </div></section>
  ${NAV.length > 1 ? `<nav class="pg-nav" aria-label="Secțiunile paginii"><div class="wrap">${NAV.map(([k, t], i) => `<a href="#${k}"><i>0${i + 1}</i>${t}</a>`).join('')}</div></nav>` : ''}

  <section class="sec" id="ateliere"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Atelierele</p><h2>Ediție cu ediție.</h2></div>
    <div class="tm-time">${d.ws.slice().reverse().map(({ e, w, rol }) => {
      const up = nx && nx.w.id === w.id;
      const others = w.program.flatMap((m) => m.speakeri).filter((s) => s.persoana !== id).map((s) => ctx.P[s.persoana]).filter(Boolean);
      return `<div class="tm-row ${up ? 'up' : ''}">
        <a class="tm-ed" href="${edUrl(e)}"><b>${edLabel(e)}</b><span>${w.data && w.data.startsWith(String(e.an)) ? fmtDay(w.data) : `${esc(e.sezon)} ${e.an}`}</span>${up ? '<em>urmează</em>' : ''}</a>
        <div class="tm-main"><b>${esc(cleanTitle(w.titlu))}</b><span class="tr-rol">${esc(ROL[rol] || rol)}${w.tema && T[w.tema] && FULL.includes(w.tema) ? ` · <a href="/teme/${esc(w.tema)}">${esc(T[w.tema].nume)}</a>` : ''}${w.locatie && w.locatie !== 'TBD' ? ` · ${esc(w.locatie)}` : ''}</span>
          ${others.length ? `<div class="tm-people">${others.map((o) => `<a href="/traineri/${esc(o.id)}" class="tm-p">${avatar(o)}<span>${esc(o.nume)}</span></a>`).join('')}</div>` : ''}</div>
      </div>`; }).join('')}</div>
  </div></section>

  ${d.co.length ? `<section class="sec sec-alt" id="alaturi"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Alături de</p><h2>Au fost în aceleași ateliere.</h2></div>
    <div class="ed-chips">${d.co.slice(0, 12).map((c) => `<a class="ed-chip" href="/traineri/${esc(c.p.id)}">${avatar(c.p)}<span><b>${esc(c.p.nume)}</b><span>${esc(company(ctx, c.p))}</span><small>${plural(c.n, 'atelier comun', 'ateliere comune')}</small></span></a>`).join('')}</div>
  </div></section>` : ''}

  ${d.themes.length ? `<section class="sec" id="teme"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Temele</p><h2>Ce a ținut în program.</h2></div>
    <div class="tr-themes">${d.themes.map((t) => { const n = d.ws.filter((x) => x.w.tema === t.id).length; const inner = `<span>${esc(t.format === 'full-day' ? 'Temă full-day' : t.format === 'seară' ? 'Atelier de seară' : 'Networking')}</span><b>${esc(t.nume)}</b><small>${plural(n, 'atelier ținut', 'ateliere ținute')} din ${plural(t.editii.length, 'ediție', 'ediții')} ale temei</small>`;
      return FULL.includes(t.id) ? `<a class="tr-theme" href="/teme/${esc(t.id)}">${inner}</a>` : `<a class="tr-theme" href="/teme#${esc(t.id)}">${inner}</a>`; }).join('')}</div>
  </div></section>` : ''}

  <section class="cta-band"><div class="wrap cta-band-in">
    <div class="cta-band-copy">
      <p class="eyebrow">Antreprenoria</p>
      <h2>Lucrezi cu oameni ca ${esc(p.nume.split(' ')[0])}.</h2>
      <p>Trei luni de ateliere, un grup selectat de colegi antreprenori și comunitatea RBL.</p>
      <div class="hero-actions"><a class="btn btn-light btn-lg" href="/aplica">Aplică</a><a class="btn btn-outline-light btn-lg" href="/traineri">Toți trainerii</a></div>
    </div>
    ${peers.length ? `<nav class="ed-nav" aria-label="Alți oameni ai temei">${peers.map((x) => `<a href="/traineri/${esc(x.p.id)}"><span>${esc(main.nume)}</span><b class="tm-nav-b">${esc(x.p.nume)}</b><small>${esc(ROL[x.rol] || '')} · ${plural(x.p.editii.length, 'ediție', 'ediții')}</small></a>`).join('')}</nav>` : ''}
  </div></section>
</main>`;
}

module.exports = { traineriBody, trainerBody, personData };
