// Homepage-ul: produs de date mai mult decât broșură. Hero cu întrebare interactivă (sugestii fixe -> răspuns din creier),
// cifre în grilă, curriculum pe tab-uri, „Pulsul programului” (flux generat din date), agenda ediției în banda finală.
// Cifrele de afaceri apar doar agregat.
const { esc, initials, milLei, fmtDay, today } = require('./util');

// sugestiile din hero: problema antreprenorului -> tema din curriculum
const NEEDS = [
  ['vanzari', 'Vânzările nu mai cresc'],
  ['viziune', 'Nu am o direcție clară'],
  ['model-business', 'Modelul de business a rămas în urmă'],
  ['marketing', 'Marketingul nu aduce clienții potriviți'],
  ['cultura', 'Echipa nu ține pasul cu creșterea'],
  ['finantare', 'Am nevoie de finanțare'],
];

const DAY = 864e5;
const days = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / DAY);
function relative(date) {
  const d = days(today(), date);
  if (d === 0) return 'azi';
  if (d === 1) return 'mâine';
  if (d === -1) return 'ieri';
  return d > 0 ? `peste ${d} zile` : `acum ${-d} zile`;
}
// descrierile de pe site sunt scrise cu litere mici (le face CSS-ul mari); aici le refacem majusculele de început de frază
const cap = (s) => String(s || '').replace(/(^|[.!?]\s+)(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const avatar = (p, cls = '') => (p.imagine ? `<img class="${cls}" src="${esc(p.imagine)}" alt="${esc(p.nume)}" loading="lazy">` : `<span class="${cls} ph">${esc(initials(p.nume))}</span>`);
const edUrl = (e) => (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`);
const edLabel = (e) => (e.serie === 'Cluj' ? `Cluj #${e.numar}` : `#${e.numar}`);

// tot ce știe creierul despre o temă: descriere, oameni, ediții, următorul atelier
function themeInfo(ctx, F, id) {
  const { D, P } = ctx, t = ctx.T[id];
  if (!t) return null;
  const ws = D.editii.flatMap((e) => e.ateliere.filter((a) => a.tema === id).map((a) => ({ e, a })));
  const counts = {};
  ws.forEach(({ a }) => a.program.forEach((x) => x.speakeri.forEach((s) => (counts[s.persoana] = (counts[s.persoana] || 0) + 1))));
  const people = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([pid, n]) => ({ p: P[pid], n })).filter((x) => x.p);
  const latest = ws.filter(({ a }) => a.descriere).sort((x, y) => (y.a.data || '').localeCompare(x.a.data || ''))[0];
  const next = ws.filter(({ a }) => a.data && a.data >= today()).sort((x, y) => x.a.data.localeCompare(y.a.data))[0];
  const cluj = ws.find(({ e }) => e.serie === 'Cluj' && e.deschisa);
  return { t, ws, people, desc: cap(latest?.a.descriere || ''), next, cluj };
}

function askHtml(ctx, F) {
  const items = NEEDS.map(([id, label]) => ({ id, label, info: themeInfo(ctx, F, id) })).filter((x) => x.info);
  return `<div class="ask" data-tabs>
    <div class="ask-q"><span class="ask-icon" aria-hidden="true"></span><span>Ce vrei să rezolvi acum în compania ta?</span></div>
    <div class="ask-chips" role="tablist" aria-label="Alege o provocare">${items.map((x, i) => `<button role="tab" data-tab="${x.id}" aria-selected="${i === 0}" aria-controls="ask-${x.id}">${esc(x.label)}</button>`).join('')}</div>
    ${items.map((x, i) => {
      const { t, ws, people, desc, next, cluj } = x.info;
      const eds = new Set(ws.map(({ e }) => e.id)).size;
      return `<div class="ask-out" role="tabpanel" id="ask-${x.id}" data-panel="${x.id}" ${i ? 'hidden' : ''}>
        <div class="ask-main">
          <span class="ask-kicker">Tema din program</span>
          <b class="ask-title">${esc(t.nume)}</b>
          <p>${esc(desc)}</p>
          <span class="ask-meta">${plural(eds, 'ediție', 'ediții')} · ${plural(people.length, 'om a', 'oameni au')} susținut tema</span>
        </div>
        <div class="ask-people">${people.slice(0, 4).map(({ p, n }) => `<a href="/traineri/${esc(p.id)}">${avatar(p)}<span><b>${esc(p.nume)}</b><small>${esc(ctx.O[p.organizatii[0]]?.nume || p.functii[0] || '')} · ${n}×</small></span></a>`).join('')}</div>
        <div class="ask-next">
          ${next ? `<span class="ask-kicker"><i class="dot-live"></i>Următorul atelier</span><b>${fmtDay(next.a.data)}</b><span>Ediția ${esc(edLabel(next.e))} · ${esc(next.a.locatie || '')}</span>`
            : cluj ? `<span class="ask-kicker">Următorul atelier</span><b>${esc(edLabel(cluj.e))}</b><span>${esc(cluj.e.perioada)}</span>`
            : `<span class="ask-kicker">Următorul atelier</span><b>Ediția #${F.maxNr + 1}</b><span>listă de așteptare</span>`}
          <div class="ask-actions"><a class="btn btn-primary" href="/aplica">Aplică</a><a class="btn btn-ghost" href="/teme/${esc(t.id)}">Despre temă</a></div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

// „Pulsul programului”: evenimente reale din creier, cu timpul relativ
function pulse(ctx, F) {
  const { D, P, O } = ctx, ong = F.ongoing, out = [];
  if (ong) {
    const dated = ong.ateliere.filter((a) => a.data && a.data.startsWith(String(ong.an)));
    const held = dated.filter((a) => a.data < today()).sort((a, b) => b.data.localeCompare(a.data));
    const up = dated.filter((a) => a.data >= today()).sort((a, b) => a.data.localeCompare(b.data));
    if (up[0]) {
      const ppl = up[0].program.flatMap((x) => x.speakeri).map((s) => P[s.persoana]).filter(Boolean);
      out.push({ date: up[0].data, kind: 'next', title: `Următorul atelier: ${up[0].titlu}`, text: `Ediția #${ong.numar} · ${up[0].locatie || ''}${ppl.length ? ' · cu ' + ppl.map((p) => p.nume).join(', ') : ''}`, people: ppl, href: `${edUrl(ong)}#agenda` });
    }
    if (held[0]) out.push({ date: held[0].data, kind: 'done', title: `S-a ținut atelierul „${held[0].titlu}”`, text: `Ediția #${ong.numar} · ${held.length} din ${ong.ateliere.length} ateliere ținute până acum`, href: edUrl(ong) });
    // sponsorii ediției care au fost participanți
    ong.ateliere.filter((a) => a.sponsor && O[a.sponsor]?.ciclu).slice(0, 2).forEach((a) => {
      const o = O[a.sponsor];
      out.push({ date: a.data, kind: 'cycle', title: `${o.nume} sponsorizează atelierul „${a.titlu}”`, text: `Alumni din ediția #${o.ciclu.alumni_din.split('-')[1]}, revenit ca partener`, href: `/alumni/din-alumni-parteneri` });
    });
    const host = ong.ateliere.map((a) => a.loc).find(Boolean);
    const hostOrg = host && D.locatii.find((l) => l.id === host);
    if (hostOrg) out.push({ date: null, kind: 'host', title: `${O[hostOrg.organizatie]?.nume || hostOrg.nume} găzduiește atelierele ediției #${ong.numar}`, text: `${hostOrg.nume}, ${hostOrg.oras}`, href: '/parteneri' });
  }
  if (F.cluj) {
    const p = F.cluj.preturi.find((x) => !x.ascuns);
    out.push({ date: null, kind: 'open', title: `Înscrieri deschise la Antreprenoria Cluj #${F.cluj.numar}`, text: `${F.cluj.perioada} · ${plural(F.cluj.ateliere.length, 'atelier', 'ateliere')}${p ? ' · ' + p.pret_text : ''}`, href: edUrl(F.cluj) });
  }
  out.push({ date: null, kind: 'wait', title: `Ediția #${F.maxNr + 1} din București se formează`, text: 'Lista de așteptare e deschisă', href: '/aplica' });
  return out;
}
const KIND = { next: ['Urmează', 'live'], done: ['Ținut', 'done'], cycle: ['Comunitate', ''], host: ['Gazdă', ''], open: ['Înscrieri', 'open'], wait: ['Listă', ''] };

function curriculumTabs(ctx, F) {
  const { D } = ctx;
  const full = D.teme.filter((t) => t.format === 'full-day').map((t) => themeInfo(ctx, F, t.id));
  const evening = D.teme.filter((t) => t.format === 'seară');
  return `<div class="cur" data-tabs>
    <div class="cur-tabs" role="tablist" aria-label="Temele programului">
      ${full.map((x, i) => `<button role="tab" data-tab="${x.t.id}" aria-selected="${i === 0}" aria-controls="cur-${x.t.id}"><i>${String(i + 1).padStart(2, '0')}</i>${esc(x.t.nume)}</button>`).join('')}
      <button role="tab" data-tab="seara" aria-selected="false" aria-controls="cur-seara"><i>+</i>Ateliere de seară</button>
    </div>
    ${full.map((x, i) => `<div class="cur-panel" role="tabpanel" id="cur-${x.t.id}" data-panel="${x.t.id}" ${i ? 'hidden' : ''}>
      <div class="cur-main">
        <h3>${esc(x.t.nume)}</h3>
        <p>${esc(x.desc)}</p>
        <dl class="cur-stats"><div><dt>Ediții</dt><dd>${x.t.editii.length}</dd></div><div><dt>Ateliere</dt><dd>${x.t.ateliere}</dd></div><div><dt>Oameni</dt><dd>${x.people.length}</dd></div></dl>
        ${x.next ? `<p class="cur-next"><i class="dot-live"></i>Următorul: <b>${fmtDay(x.next.a.data)}</b>, ediția #${x.next.e.numar}</p>` : ''}
        <a class="link-arrow" href="/teme/${esc(x.t.id)}">Despre temă →</a>
      </div>
      <div class="cur-people">${x.people.slice(0, 6).map(({ p, n }) => `<a href="/traineri/${esc(p.id)}">${avatar(p)}<b>${esc(p.nume)}</b><small>${esc(ctx.O[p.organizatii[0]]?.nume || p.functii[0] || '')} · ${n}×</small></a>`).join('')}</div>
    </div>`).join('')}
    <div class="cur-panel" role="tabpanel" id="cur-seara" data-panel="seara" hidden>
      <div class="cur-main"><h3>Ateliere de seară</h3><p>Sesiuni scurte, după program, pe subiecte practice. S-au schimbat de la o ediție la alta, după ce au cerut participanții.</p></div>
      <div class="cur-evening">${evening.map((t) => `<a href="/teme/${esc(t.id)}"><b>${esc(t.nume)}</b><span>${plural(t.editii.length, 'ediție', 'ediții')}</span></a>`).join('')}</div>
    </div>
  </div>`;
}

function agendaCard(F) {
  const e = F.ongoing;
  if (!e) return '';
  const rows = e.ateliere.filter((a) => a.data && a.data.startsWith(String(e.an))).sort((a, b) => a.data.localeCompare(b.data));
  const nextId = rows.find((a) => a.data >= today())?.id;
  return `<div class="agenda-card" aria-label="Agenda ediției #${e.numar}">
    <div class="agenda-top"><span><i class="dot-live"></i>Ediția #${e.numar} · ${esc(e.perioada)}</span><span>${e.participanti.length} participanți</span></div>
    <ol>${rows.map((a) => {
      const st = a.data < today() ? 'done' : a.id === nextId ? 'next' : '';
      return `<li class="${st}"><time>${fmtDay(a.data).replace(/ \d{4}$/, '')}</time><span>${esc(a.titlu.replace(/^(Atelier de Seară|COCKTAIL NETWORKING)\s*[-:]\s*/i, ''))}</span><em>${st === 'done' ? 'ținut' : st === 'next' ? 'următorul' : a.format}</em></li>`;
    }).join('')}</ol>
  </div>`;
}

// mozaicul din hero: portrete în forme geometrice (aceleași cercuri ca iconul de meniu), care se schimbă pe rând.
// Fără nume sau detalii despre persoane: mozaicul e doar imagine.
// Rezerva de portrete: antreprenorii invitați și trainerii, apoi alumni din edițiile recente, amestecați.
function mosaic(ctx, F) {
  const { D } = ctx;
  const speakers = D.oameni.filter((p) => p.imagine && p.aparitii.length && !p.tipuri.includes('echipă'))
    .sort((a, b) => b.editii.length - a.editii.length || b.aparitii.length - a.aparitii.length).slice(0, 24)
    .map((p) => ({ i: p.imagine, s: 1 }));
  const recent = (id) => Number(String(id).split('-').pop()) || 0;
  const alumni = D.oameni.filter((p) => p.imagine && p.tipuri.includes('participant'))
    .sort((a, b) => Math.max(...b.editii.map(recent)) - Math.max(...a.editii.map(recent))).slice(0, 36)
    .map((p) => ({ i: p.imagine }));
  const pool = [];
  for (let i = 0; i < Math.max(speakers.length, alumni.length); i++) [speakers[i], alumni[i], alumni[i + 24]].forEach((x) => x && !pool.includes(x) && pool.push(x));
  // forma și poziția fiecărei piese (grilă 4×4); cele două portrete mari se ating în centru cu colțurile drepte
  const SLOTS = ['big-a', 'circle', 'stat', 'leaf', 'quarter', 'arch', 'dots', 'big-b', 'circle-sm', 'count'];
  // portretele mari primesc doar traineri și invitați (pozele lor sunt la rezoluție mare; ale alumni au 200px)
  const used = new Set();
  const pick = (big) => { const k = pool.findIndex((p, i) => !used.has(i) && (!big || p.s)); used.add(k); return k; };
  const tile = (shape) => {
    if (shape === 'stat') return `<div class="mz mz-stat"><b>${F.maxNr}</b><span>ediții</span></div>`;
    if (shape === 'count') return `<div class="mz mz-count"><b>${F.participanti}+</b><span>antreprenori</span></div>`;
    if (shape === 'dots') return '<div class="mz mz-dots" aria-hidden="true"><i></i><i></i><i></i></div>';
    const big = shape.startsWith('big'), k = pick(big), p = pool[k];
    return `<figure class="mz mz-${shape}" data-k="${k}"${big ? ' data-big' : ''}><img class="on" src="${esc(p.i)}" alt="" decoding="async"><img alt="" decoding="async" aria-hidden="true"></figure>`;
  };
  return `<div class="mosaic" role="img" aria-label="Portrete ale antreprenorilor invitați, trainerilor și alumni Antreprenoria" data-pool="${esc(JSON.stringify(pool))}">
    ${SLOTS.map(tile).join('')}
  </div>`;
}

function homeBody(ctx, F) {
  const { D, T } = ctx;
  const maxSector = F.sectors[0][1];
  const feed = pulse(ctx, F);
  const ong = F.ongoing;
  const heldYear = D.editii.flatMap((e) => e.ateliere).filter((a) => a.data && a.data < today() && a.data.startsWith(today().slice(0, 4))).length;
  const nextIn = F.next ? days(today(), F.next.data) : null;

  return `<main>
  <section class="hero hero-v2"><div class="wrap">
    <div class="hero-split">
      <div class="hero-copy">
        <p class="eyebrow">Acceleratorul Romanian Business Leaders · din ${D.program.de_cand}</p>
        <h1>Crește-ți compania alături de antreprenorii care au făcut-o deja.</h1>
        <p class="lead">Trei luni de ateliere cu lideri de business români, un grup selectat de colegi antreprenori și acces la comunitatea RBL.</p>
      </div>
      ${mosaic(ctx, F)}
    </div>
    ${askHtml(ctx, F)}
  </div></section>

  <section class="proof"><div class="wrap proof-in">
    <div class="stat"><b><span data-count="${F.ani}">${F.ani}</span></b><span>ani de program</span></div>
    <div class="stat"><b><span data-count="${F.maxNr}">${F.maxNr}</span></b><span>ediții în București, plus Cluj</span></div>
    <div class="stat"><b><span data-count="${F.speakers}">${F.speakers}</span></b><span>traineri și antreprenori invitați din 2023</span></div>
    <div class="stat"><b><span data-count="${F.alumni}">${F.alumni}</span></b><span>companii în ultimele ${D.editii.filter((e) => e.participanti.length).length} ediții</span></div>
    <div class="stat"><b><span data-count="${(F.medianCa / 1e6).toFixed(1)}" data-dec="1">${milLei(F.medianCa)}</span><em> mil. lei</em></b><span>cifra de afaceri mediană a participanților</span></div>
  </div></section>

  <section class="sec" id="cum"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Cum funcționează</p><h2>Un trimestru în care te uiți strategic la compania ta.</h2>
      <p class="lead">La fiecare atelier: dimineața training aplicat, după-amiaza antreprenori care povestesc cum au rezolvat exact problema despre care vorbiți. Seara, networking cu colegii.</p></div>
    <ol class="steps">
      ${D.program.metodologie.map((m, i) => `<li class="step"><span class="step-n">0${i + 1}</span><h3>${esc(m.titlu.charAt(0) + m.titlu.slice(1).toLowerCase())}</h3><p>${esc(m.puncte[0].replace(/;$/, '.').replace(/\bANTREPRENORI\b/g, 'antreprenori'))}</p></li>`).join('')}
    </ol>
  </div></section>

  <section class="sec sec-alt" id="teme"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Curriculum</p><h2>Cinci teme full-day, aceleași de ${T.viziune.editii.length} ediții încoace.</h2></div>
      <a class="link-arrow" href="/teme">Toate temele →</a></div>
    ${curriculumTabs(ctx, F)}
  </div></section>

  <section class="sec" id="puls"><div class="wrap pulse">
    <div class="pulse-copy">
      <p class="eyebrow">Pulsul programului</p>
      <h2>Programul se întâmplă acum.</h2>
      <p class="lead">Ateliere, parteneri, ediții noi. Totul vine direct din agenda programului și se actualizează singur.</p>
      <div class="pulse-stats">
        ${nextIn != null ? `<div class="pulse-stat"><b><span data-count="${nextIn}">${nextIn}</span></b><span>${nextIn === 1 ? 'zi' : 'zile'} până la următorul atelier</span></div>` : ''}
        <div class="pulse-stat"><b><span data-count="${heldYear}">${heldYear}</span></b><span>ateliere ținute în ${today().slice(0, 4)}</span></div>
        ${ong ? `<div class="pulse-stat"><b><span data-count="${ong.participanti.length}">${ong.participanti.length}</span></b><span>antreprenori în ediția #${ong.numar}</span></div>` : ''}
      </div>
    </div>
    <div class="feed" role="list">
      <div class="feed-top"><span><i class="dot-live"></i>Actualizat ${fmtDay(today())}</span><span>${feed.length} evenimente</span></div>
      ${feed.map((f) => `<a class="feed-item" role="listitem" href="${esc(f.href)}">
        <span class="feed-tag ${KIND[f.kind][1]}">${KIND[f.kind][0]}</span>
        <span class="feed-body"><b>${esc(f.title)}</b><span>${esc(f.text)}</span></span>
        <time>${f.date ? relative(f.date) : ''}</time></a>`).join('')}
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
        <div class="fig"><b><span data-count="${F.medianAng}">${F.medianAng}</span></b><span>angajați, la mediană</span></div>
        <div class="fig"><b><span data-count="${F.participanti}">${F.participanti}</span></b><span>antreprenori și manageri în edițiile #16–#${F.maxNr}</span></div>
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
      return `<a class="tl ${live ? 'is-live' : ''} ${open ? 'is-open' : ''}" href="${edUrl(e)}">
        <span class="tl-dot"></span><b>${esc(edLabel(e))}</b><span>${esc(e.perioada.replace(' - ', '–'))}</span>
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

  <section class="cta-band"><div class="wrap cta-band-in">
    <div class="cta-band-copy">
      <p class="eyebrow">Ediția #${F.maxNr + 1}</p>
      <h2>Cresc antreprenorii, crește România.</h2>
      <p>Următoarea ediție din București se formează acum. Lasă-ne datele și te anunțăm primul când se deschid înscrierile.</p>
      <div class="hero-actions"><a class="btn btn-light btn-lg" href="/aplica">Intră pe lista de așteptare</a>${F.cluj ? `<a class="btn btn-outline-light btn-lg" href="${edUrl(F.cluj)}">Aplică la Cluj #${F.cluj.numar}</a>` : ''}</div>
    </div>
    ${agendaCard(F)}
  </div></section>
</main>`;
}

module.exports = { homeBody };
