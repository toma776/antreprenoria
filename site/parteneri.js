// /parteneri: pagina pentru brandurile care vor un program de CSR cu impact („Cresc antreprenorii, crește România”)
// și inventarul brandurilor care au susținut programul. Totul vine din cohorte: partenerii din antetul fiecărei cohorte,
// sponsorii și gazdele din ateliere, cifrele din participanți (doar agregate).
const { esc, fmtDay, today, median, de, tidy, temaUrl } = require('./util');
const { implicareDialog } = require('./implicare');

const plural = (n, one, many) => `${n} ${n === 1 ? one : (n % 100 === 0 || n % 100 >= 20 ? 'de ' : '') + many}`;
const edUrl = (e) => (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`);
const edLabel = (e) => (e.serie === 'Cluj' ? `Cluj #${e.numar}` : `#${e.numar}`);
const cleanTitle = (t) => String(t || '').replace(/^(Atelier de Seară|COCKTAIL NETWORKING)\s*[-:]\s*/i, '').replace(/\.\s*$/, '');
const chrono = (D) => D.editii.slice().sort((a, b) => a.an - b.an || (a.sezon === b.sezon ? (a.serie === 'Cluj') - (b.serie === 'Cluj') : a.sezon === 'primăvară' ? -1 : 1));
const ROL = { 'partener strategic': 'Partener strategic', 'powered by': 'Powered by', 'partener ediție': 'Partener de cohortă' };
const FULL = ['viziune', 'model-de-business', 'marketing', 'vanzari', 'cultura'];
const nr = (n) => Math.round(n).toLocaleString('ro-RO');
const mil = (n, d = 1) => (n / 1e6).toLocaleString('ro-RO', { maximumFractionDigits: d });
const mld = (n) => (n / 1e9).toLocaleString('ro-RO', { maximumFractionDigits: 1 });
const GRUPA = 25; // antreprenori într-o grupă (o cohortă)
const logoOnly = (o) => (o.logo ? `<img src="${esc(o.logo)}" alt="" loading="lazy">` : `<b>${esc(o.nume)}</b>`);
// cohortele, compacte: #16–#18, #20, Cluj #1
const span = (eds) => { const b = eds.filter((e) => e.serie === 'București').map((e) => e.numar).sort((x, y) => x - y), out = []; for (let i = 0; i < b.length; i++) { let j = i; while (b[j + 1] === b[j] + 1) j++; out.push(j - i >= 2 ? `#${b[i]}–#${b[j]}` : b.slice(i, j + 1).map((n) => `#${n}`).join(', ')); i = j; } return [...out, ...eds.filter((e) => e.serie === 'Cluj').map(edLabel)].join(', '); };
// durata unui atelier, din agenda lui (prima oră – ultima oră)
const hours = (a) => { const t = (a.program || []).flatMap((p) => String(p.interval || '').match(/\d{1,2}:\d{2}/g) || []).map((s) => { const [h, m] = s.split(':').map(Number); return h + m / 60; }); return t.length >= 2 ? Math.max(...t) - Math.min(...t) : null; };

function partnersData(ctx) {
  const { D, O, T } = ctx;
  const eds = chrono(D), byId = Object.fromEntries(D.editii.map((e) => [e.id, e]));
  const t0 = today();
  // partenerii cohortelor (antetul fiecărei cohorte) și sponsorii atelierelor
  const map = new Map();
  const get = (id) => { if (!map.has(id)) map.set(id, { o: O[id], roles: [], ws: [], hosts: [] }); return map.get(id); };
  eds.forEach((e) => {
    e.parteneri.filter((x) => x.rol !== 'sponsor atelier' && O[x.organizatie]).forEach((x) => get(x.organizatie).roles.push({ e, rol: x.rol }));
    e.ateliere.forEach((a) => { if (a.sponsor && O[a.sponsor]) get(a.sponsor).ws.push({ e, a }); });
  });
  // gazdele: organizațiile locațiilor în care s-au ținut ateliere
  D.locatii.forEach((l) => { const x = map.get(l.organizatie); if (x) x.hosts.push(l); });
  const all = [...map.values()].filter((x) => x.o && x.o.id !== 'rbl');
  all.forEach((x) => {
    x.hostEds = (x.o.roluri || []).filter((r) => r.rol === 'gazdă' && byId[r.editie]).map((r) => byId[r.editie]);
    x.years = [...new Set([...x.roles.map((r) => r.e.an), ...x.ws.map((w) => w.e.an), ...x.hostEds.map((e) => e.an)])].sort();
    x.eds = [...new Set([...x.roles.map((r) => r.e), ...x.ws.map((w) => w.e), ...x.hostEds])];
    x.kinds = [x.roles.length && 'partener', x.ws.length && 'sponsor', (x.hosts.length || x.hostEds.length) && 'gazda', x.o.ciclu && 'alumni'].filter(Boolean);
    x.score = x.roles.length * 4 + x.ws.length * 2 + x.hostEds.length + x.eds.length;
  });
  all.sort((a, b) => b.score - a.score || a.o.nume.localeCompare(b.o.nume, 'ro'));
  const strategic = all.filter((x) => x.roles.length);
  const sponsors = all.filter((x) => x.ws.length);
  // atelierele care încă își caută sponsor: din cohortele deschise, fără sponsor, cu dată în viitor sau încă fără dată
  const live = eds.filter((e) => !/închis|încheiat/i.test(e.status || ''));
  const open = live.flatMap((e) => e.ateliere.filter((a) => !a.sponsor && a.format !== 'networking' && (a.data ? a.data >= t0 : true)).map((a) => ({ e, a })));
  const prep = live.filter((e) => !e.ateliere.length);
  const team = Object.fromEntries(D.program.contact.echipa.map((m) => [m.id, m]));
  return { all, strategic, sponsors, open, prep, nWs: sponsors.reduce((n, x) => n + x.ws.length, 0), ciclu: all.filter((x) => x.o.ciclu), byId, T, team, eds };
}

// cifrele pentru argumente și pentru calculatorul de impact (agregate, din participanții documentați)
function impactData(ctx, d) {
  const { D } = ctx;
  const part = D.editii.flatMap((e) => e.participanti);
  const ca = part.map((p) => p.cifra_afaceri).filter((x) => x != null), ang = part.map((p) => p.angajati).filter((x) => x != null);
  // sumele și mediile pe companie: o companie venită cu mai mulți oameni sau în mai multe cohorte intră o singură dată, cu ultimele cifre raportate
  const byOrg = new Map();
  D.editii.slice().sort((a, b) => a.an - b.an || (a.sezon === b.sezon ? 0 : a.sezon === 'primăvară' ? -1 : 1)).forEach((e) => e.participanti.forEach((p) => {
    if (!p.organizatie) return; // fără companie în registru (și fără cifre): nu intră în sume
    const k = p.organizatie, o = byOrg.get(k) || {};
    if (p.cifra_afaceri != null) o.ca = p.cifra_afaceri;
    if (p.angajati != null) o.ang = p.angajati;
    byOrg.set(k, o);
  }));
  const caOrg = [...byOrg.values()].map((o) => o.ca).filter((x) => x != null), angOrg = [...byOrg.values()].map((o) => o.ang).filter((x) => x != null);
  const docEds = D.editii.filter((e) => e.participanti.length);
  const nEd = Math.max(...D.editii.filter((e) => e.serie === 'București' && !/pregătire/i.test(e.status || '')).map((e) => e.numar));
  // ore de lucru pe format, din agendele atelierelor
  const avgH = (f) => { const h = D.editii.flatMap((e) => e.ateliere).filter((a) => a.format === f).map(hours).filter((x) => x && x > 0); return h.length ? h.reduce((s, x) => s + x, 0) / h.length : (f === 'full-day' ? 8 : 3); };
  const H = { 'full-day': avgH('full-day'), 'seară': avgH('seară') };
  // cohorta-tip: ultima cohortă din București cu ateliere
  const edTip = d.eds.filter((e) => e.serie === 'București' && e.ateliere.length).pop();
  const wsEd = edTip ? edTip.ateliere.filter((a) => a.format !== 'networking') : [];
  const hEd = wsEd.reduce((s, a) => s + (H[a.format] || 0), 0);
  const cluj = d.eds.filter((e) => e.serie === 'Cluj').pop();
  const wsCluj = cluj ? cluj.ateliere.filter((a) => a.format !== 'networking') : [];
  const hCluj = wsCluj.reduce((s, a) => s + (H[a.format] || 0), 0);
  return {
    nEd, ani: new Date().getFullYear() - D.program.de_cand, de_cand: D.program.de_cand, antreprenori: nEd * GRUPA,
    sumCa: caOrg.reduce((s, x) => s + x, 0), sumAng: angOrg.reduce((s, x) => s + x, 0), nPart: part.length, nOrg: byOrg.size, nDocEds: docEds.length,
    avgCa: caOrg.length ? caOrg.reduce((s, x) => s + x, 0) / caOrg.length : 0, avgAng: angOrg.length ? angOrg.reduce((s, x) => s + x, 0) / angOrg.length : 0,
    medCa: median(ca), medAng: median(ang), H, wsEd: wsEd.length, hEd, wsCluj: wsCluj.length, hCluj, hasCluj: !!cluj,
  };
}

// ce primește brandul, pe formate (configuratorul le afișează pe cel ales)
const FORMATE = [
  { id: 'atelier', titlu: 'Un atelier', rol: 'Sponsor de atelier', text: 'Numele tău legat de o temă și o zi întreagă cu grupa.',
    ben: ['Logo pe pagina cohortei și pe pagina atelierului', 'Brandul tău legat de tema „{tema}”', 'O zi întreagă în sală cu {g} de antreprenori'] },
  { id: 'editie', titlu: 'O cohortă', rol: 'Partener de cohortă', text: 'Toate atelierele unei cohorte: trei luni alături de aceeași grupă.',
    ben: ['Logo pe toate paginile cohortei', 'Prezent la toate cele {ws} ateliere, trei luni', 'Menționat în comunicarea cohortei', 'Invitat la petrecerea de networking RBL'] },
  { id: 'an', titlu: 'Un an', rol: 'Partener strategic', text: 'Cohortele din primăvară și toamnă{cluj}: brandul programului, tot anul.',
    ben: ['Partener strategic: logo pe paginile programului, tot anul', 'Prezent în toate cohortele anului{cluj2}', 'Primul la alegerea atelierelor pe care le susții', 'Menționat în comunicarea RBL'] },
];
const ECHIPA = [
  ['speaker', 'Un speaker din echipa ta', 'Povestește grupei cum a rezolvat compania ta problema zilei', 'Un speaker din echipa ta în agenda atelierului', 'un speaker din echipa noastră în agenda atelierului'],
  ['gazda', 'Atelierul la sediul tău', 'O sală pentru o zi de lucru, pentru în jur de 30 de oameni', 'Atelierul se ține la sediul tău', 'atelierul găzduit la sediul nostru'],
  ['mentori', 'Colegii tăi, mentori', 'Pro-bono, pentru antreprenorii din grupă', 'Colegii tăi devin mentori pro-bono pentru antreprenori', 'colegii mei ca mentori pro-bono'],
];

function parteneriBody(ctx, F) {
  const d = partnersData(ctx), I = impactData(ctx, d);
  const { T, D } = { ...d, D: ctx.D };
  const contact = d.team['larisa-slavenie'] || d.team['raluca-bedereag'], spons = d.team['iulian-rizea'] || contact;
  const years = [...new Set(d.all.flatMap((x) => x.years))].sort();
  const perYear = years.map((y) => [y, d.all.filter((x) => x.years.includes(y)).length]), maxY = Math.max(1, ...perYear.map(([, n]) => n));
  const K = { partener: d.strategic.length, sponsor: d.sponsors.length, gazda: d.all.filter((x) => x.kinds.includes('gazda')).length, alumni: d.ciclu.length };
  const themes = D.teme.filter((t) => t.format === 'full-day' || t.format === 'seară');
  const clujTxt = I.hasCluj ? ', plus cohorta din Cluj' : '';
  const NAV = [['de-ce', 'De ce'], ['construieste', 'Construiește'], ['cost-real', 'Costul real'], ['branduri', 'Brandurile'], ['vreau', 'Vreau și eu']];

  // roata: antreprenorii cresc -> companiile cresc -> crește România -> cresc brandurile
  const FW = [
    ['Cresc antreprenorii', `~${nr(I.antreprenori)}`, `de antreprenori în ${I.nEd} ${de(I.nEd)}cohorte, din ${I.de_cand}`],
    ['Cresc companiile', nr(I.sumAng), `de angajați în companiile din ultimele ${I.nDocEds} ${de(I.nDocEds)}cohorte`],
    ['Crește România', `${mld(I.sumCa)} mld.`, 'lei cifră de afaceri cumulată a acelorași companii'],
    ['Cresc brandurile', String(d.all.length), `${de(d.all.length)}branduri au fost alături de program${d.ciclu.length ? `, ${d.ciclu.length} chiar din alumni` : ''}`],
  ];

  const cfg = {
    g: GRUPA, avgCa: I.avgCa, avgAng: I.avgAng, H: I.H, wsEd: I.wsEd, hEd: I.hEd, wsCluj: I.wsCluj, hCluj: I.hCluj,
    fmt: Object.fromEntries(FORMATE.map((f) => [f.id, { rol: f.rol, ben: f.ben.map((b) => b.replace('{g}', GRUPA).replace('{ws}', I.wsEd).replace('{cluj2}', I.hasCluj ? ': București și Cluj' : '')) }])),
    echipa: Object.fromEntries(ECHIPA.map(([k, , , b]) => [k, b])), echt: Object.fromEntries(ECHIPA.map(([k, t]) => [k, t])), titlu: Object.fromEntries(FORMATE.map((f) => [f.id, f.titlu])), msg: Object.fromEntries(ECHIPA.map(([k, , , , m]) => [k, m])),
  };

  const brandCard = (x) => { const o = x.o, first = x.years[0], last = x.years[x.years.length - 1];
    return `<button type="button" class="sp-br" id="${esc(o.id)}" data-k="${x.kinds.join(' ')}" data-y="${x.years.join(' ')}" data-q="${esc((o.nume + ' ' + (o.tip || '') + ' ' + (o.sector || '')).toLowerCase())}" aria-haspopup="dialog">
      <span class="sp-br-logo">${logoOnly(o)}</span>
      <span class="sp-br-tx"><b>${esc(o.nume)}</b><small>${[x.roles.length ? esc(ROL[x.roles[x.roles.length - 1].rol] || 'Partener') : '', x.ws.length ? plural(x.ws.length, 'atelier', 'ateliere') : '', first ? (first === last ? String(first) : `${first}–${last}`) : ''].filter(Boolean).join(' · ')}</small></span>
      ${x.kinds.includes('alumni') ? '<i class="sp-br-al" title="Din alumni">alumni</i>' : ''}
    </button>`; };

  const brandDetail = (x) => { const o = x.o, th = [...new Set(x.ws.map(({ a }) => a.tema).filter(Boolean))].map((t) => T[t]).filter(Boolean);
    const rows = x.eds.slice().sort((a, b) => a.an - b.an || (a.sezon === 'primăvară' ? -1 : 1)).map((e) => {
      const r = [...x.roles.filter((y) => y.e === e).map((y) => ROL[y.rol] || y.rol), ...(x.hostEds.includes(e) ? ['Gazdă'] : []), ...[x.ws.filter((w) => w.e === e).map(({ a }) => cleanTitle(a.titlu))].filter((t) => t.length).map((t) => `${t.length === 1 ? 'Sponsor atelier' : `Sponsor la ${t.length} ${de(t.length)}ateliere`}: ${t.join(', ')}`)];
      return `<li><a href="${edUrl(e)}">${esc(edLabel(e))}</a><span>${esc(e.an)} ${esc(e.sezon || '')}</span><em>${r.map(esc).join(' · ')}</em></li>`; }).join('');
    return `<template data-br="${esc(o.id)}">
      <div class="sp-dt-top"><span class="sp-dt-logo">${logoOnly(o)}</span><div><h3>${esc(o.nume)}</h3><p>${esc([o.tip, o.sector].filter(Boolean).join(' · '))}</p>
        <div class="sp-dt-tags">${x.kinds.map((k) => `<span class="sp-tag k-${k}">${{ partener: 'Partener de cohortă', sponsor: 'Sponsor de atelier', gazda: 'Gazdă', alumni: 'Din alumni' }[k]}</span>`).join('')}</div></div></div>
      ${o.descriere ? `<p class="sp-dt-desc">${esc(tidy(o.descriere).length > 320 ? tidy(o.descriere).slice(0, 317).replace(/\s+\S*$/, '') + '…' : tidy(o.descriere))}</p>` : ''}
      ${o.ciclu && d.byId[o.ciclu.alumni_din] ? `<p class="sp-dt-cyc">A trecut prin program ca participant în cohorta ${esc(edLabel(d.byId[o.ciclu.alumni_din]))} și s-a întors ca partener.</p>` : ''}
      <h4>Alături de program</h4><ul class="sp-dt-eds">${rows}</ul>
      ${th.length ? `<div class="sp-dt-th">${th.map((t) => (FULL.includes(t.id) ? `<a href="${esc(temaUrl(t))}">${esc(t.nume)}</a>` : `<span>${esc(t.nume)}</span>`)).join('')}</div>` : ''}
      <div class="sp-dt-act">${o.url ? `<a class="btn btn-ghost" href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))} ↗</a>` : ''}<a class="btn btn-primary" href="?implicare=sponsorizare#vreau" data-implica="sponsorizare">Vreau și eu alături de ei</a></div>
    </template>`; };

  // atelierele care își caută sponsor, pe cohorte
  const openBy = new Map();
  d.open.forEach(({ e, a }) => { if (!openBy.has(e)) openBy.set(e, []); openBy.get(e).push(a); });

  return `<main class="sp">
  <section class="sp-hero"><div class="wrap">
    <nav class="crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><b>Parteneri</b></nav>
    <div class="sp-hero-grid">
      <div class="sp-hero-copy">
        <p class="eyebrow">Parteneriate CSR · din ${I.de_cand}</p>
        <h1>Cresc antreprenorii. Crește România. <em>Crește și brandul tău.</em></h1>
        <p class="lead">Antreprenoria e cel mai longeviv program RBL pentru antreprenori: ${I.ani} ${de(I.ani)}ani, ${I.nEd} ${de(I.nEd)}cohorte, ~${nr(I.antreprenori)} de fondatori. Un parteneriat aici nu e un logo pe un banner, ci o zi întreagă cu oamenii care angajează, investesc și plătesc taxe în România.</p>
        <div class="hero-actions"><a class="btn btn-primary btn-lg sp-cta" href="?implicare=sponsorizare#vreau" data-implica="sponsorizare">Vreau și eu <span aria-hidden="true">→</span></a><a class="btn btn-outline-light btn-lg" href="#construieste">Construiește-ți parteneriatul</a></div>
        <dl class="sp-hero-figs">
          <div><dt data-to="${I.ani}">${I.ani}</dt><dd>${de(I.ani)}ani</dd></div>
          <div><dt data-to="${I.nEd}">${I.nEd}</dt><dd>${de(I.nEd)}cohorte</dd></div>
          <div><dt data-to="${I.antreprenori}">${nr(I.antreprenori)}</dt><dd>${de(nr(I.antreprenori))}antreprenori</dd></div>
          <div><dt data-to="${d.nWs}">${d.nWs}</dt><dd>${de(d.nWs)}ateliere sponsorizate</dd></div>
        </dl>
      </div>
      <div class="sp-fw" aria-label="Cum crește totul împreună">
        <svg viewBox="0 0 400 400" aria-hidden="true">
          <defs><linearGradient id="spg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--highlight)"/><stop offset="1" stop-color="var(--accent)"/></linearGradient></defs>
          <circle class="sp-fw-ring" cx="200" cy="200" r="150"/>
          <circle class="sp-fw-prog" cx="200" cy="200" r="150" pathLength="100" stroke="url(#spg)"/>
          <g class="sp-fw-orbit"><circle cx="200" cy="50" r="5"/></g>
        </svg>
        ${FW.map(([t], i) => `<button type="button" class="sp-fw-n n${i}${i === 0 ? ' on' : ''}" data-i="${i}"><i>${i + 1}</i>${esc(t)}</button>`).join('')}
        <div class="sp-fw-c">${FW.map(([t, v, s], i) => `<div class="sp-fw-v${i === 0 ? ' on' : ''}" data-i="${i}"><em>${esc(t)}</em><b>${esc(v)}</b><span>${esc(s)}</span></div>`).join('')}</div>
        <ol class="sr">${FW.map(([t, v, s]) => `<li>${esc(t)}: ${esc(v)} ${esc(s)}</li>`).join('')}</ol>
      </div>
    </div>
  </div>
  <div class="sp-marq" aria-label="Branduri care au susținut programul"><div class="sp-marq-in">${[0, 1].map((k) => `<div class="sp-marq-row"${k ? ' aria-hidden="true"' : ''}>${d.all.map((x) => `<a href="#${esc(x.o.id)}" class="sp-marq-it" title="${esc(x.o.nume)}"${k ? ' tabindex="-1"' : ''}>${x.o.logo ? `<img src="${esc(x.o.logo)}" alt="${esc(x.o.nume)}" loading="lazy">` : `<b>${esc(x.o.nume)}</b>`}</a>`).join('')}</div>`).join('')}</div></div>
  </section>
  <nav class="pg-nav" aria-label="Secțiunile paginii"><div class="wrap">${NAV.map(([k, t], i) => `<a href="#${k}"><i>0${i + 1}</i>${t}</a>`).join('')}</div></nav>

  <section class="sec" id="de-ce"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">De ce Antreprenoria</p><h2>Nu sponsorizezi un eveniment. Investești în cei care țin economia în mișcare.</h2></div>
    <div class="sp-why">
      <article><b>${mil(I.medCa)} <em>mil. lei</em></b><h3>Decidenți, nu curioși</h3><p>Cifra de afaceri a participantului tipic, cu ${plural(Math.round(I.medAng), 'angajat', 'angajați')}. În sală stau fondatori și manageri selectați, care decid.</p></article>
      <article><b>${mld(I.sumCa)} <em>mld. lei</em></b><h3>Economia reală</h3><p>Cifra de afaceri cumulată a celor ${nr(I.nOrg)} de companii din ultimele ${I.nDocEds} ${de(I.nDocEds)}cohorte, cu ${nr(I.sumAng)} de angajați.</p></article>
      <article><b>${GRUPA} <em>× o zi</em></b><h3>Timp, nu impresii</h3><p>O grupă mică, o zi întreagă de lucru aplicat pe o temă. Brandul tău e asociat cu problema pe care o rezolvă.</p></article>
      <article><b>${d.ciclu.length || d.all.length}</b><h3>${d.ciclu.length ? 'Alumni deveniți parteneri' : 'Branduri alături de noi'}</h3><p>${d.ciclu.length ? 'Companii care au trecut prin program ca participanți și s-au întors să-l susțină. Comunitatea crește și dă înapoi.' : 'Companii care au susținut programul cohortă cu cohortă.'}</p></article>
    </div>
  </div></section>

  <section class="sec sec-alt" id="construieste"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Construiește parteneriatul</p><h2>Alege cât de aproape vrei să fii.</h2>
      <p class="lead">Trei formate, aceeași grupă de ${GRUPA} de antreprenori pe cohortă. Vezi pe loc ce primește brandul tău și ce schimbă pentru ei.</p></div>
    <div class="sp-cfg" data-cfg="${esc(JSON.stringify(cfg))}">
      <div class="sp-cfg-in">
        <fieldset class="sp-step"><legend><i>1</i>Formatul</legend>
          <div class="sp-tiers">${FORMATE.map((f, i) => `<label class="sp-tier"><input type="radio" name="sp-fmt" value="${f.id}"${i === 0 ? ' checked' : ''}><span><small>${esc(f.rol)}</small><b>${esc(f.titlu)}</b><em>${esc(f.text.replace('{cluj}', clujTxt))}</em></span></label>`).join('')}</div>
        </fieldset>
        <fieldset class="sp-step" data-only="atelier"><legend><i>2</i>Tema atelierului</legend>
          <div class="sp-chips">${themes.map((t, i) => `<label><input type="radio" name="sp-tema" value="${esc(t.id)}" data-f="${esc(t.format)}" data-n="${esc(t.nume)}"${i === 0 ? ' checked' : ''}><span>${esc(t.nume)}<small>${t.format === 'seară' ? 'seară' : 'o zi'}</small></span></label>`).join('')}</div>
        </fieldset>
        <fieldset class="sp-step"><legend><i class="sp-step-n">3</i>Implică-ți echipa <span>opțional</span></legend>
          <div class="sp-team">${ECHIPA.map(([k, t, s]) => `<label class="sp-sw"><input type="checkbox" name="sp-echipa" value="${k}"><span><b>${esc(t)}</b><small>${esc(s)}</small></span><i aria-hidden="true"></i></label>`).join('')}</div>
        </fieldset>
      </div>
      <aside class="sp-out">
        <div class="sp-out-top"><span>Impactul tău</span><b class="sp-out-rol">Sponsor de atelier</b></div>
        <div class="sp-out-figs" aria-live="polite">
          <div><b data-o="ant">${GRUPA}</b><span>${de(GRUPA)}antreprenori în sală</span></div>
          <div><b data-o="ore">–</b><span>ore de lucru aplicat, cumulat</span></div>
          <div><b data-o="ca">–</b><span>cifra de afaceri a companiilor din sală</span></div>
          <div><b data-o="ang">–</b><span>angajați în aceste companii</span></div>
        </div>
        <p class="sp-out-h">Ce primește brandul tău</p>
        <ul class="sp-out-ben"></ul>
        <a class="btn btn-light btn-lg sp-out-cta" href="?implicare=sponsorizare#vreau">Vreau asta <span aria-hidden="true">→</span></a>
        <p class="sp-out-note">Estimare pe media companiilor din ultimele ${I.nDocEds} ${de(I.nDocEds)}cohorte. Primești propunerea și contractul pe email; ne vedem doar dacă vrei.</p>
      </aside>
    </div>
  </div></section>

  <section class="sec" id="cost-real"><div class="wrap sp-tax">
    <div class="sp-tax-copy">
      <p class="eyebrow">Costul real</p>
      <h2>Banii pentru sponsorizare pot veni din impozitul pe care îl plătești oricum.</h2>
      <p class="lead">Codul fiscal permite companiilor să direcționeze o parte din impozit către sponsorizări. Altfel spus: aceiași bani ajung fie la buget, fie la antreprenorii care cresc economia.</p>
    </div>
    <div class="sp-calc" role="group" aria-label="Calculator: cât poți direcționa">
      <div class="sp-calc-seg" role="tablist"><button type="button" class="on" data-m="profit" role="tab" aria-selected="true">Impozit pe profit</button><button type="button" data-m="micro" role="tab" aria-selected="false">Microîntreprindere</button></div>
      <label class="sp-calc-f" data-m="profit"><span>Cifra de afaceri anuală</span><span class="sp-calc-in"><input type="text" inputmode="numeric" id="sp-ca" value="10.000.000" autocomplete="off"><i>lei</i></span></label>
      <label class="sp-calc-f"><span data-lbl>Impozitul pe profit anual</span><span class="sp-calc-in"><input type="text" inputmode="numeric" id="sp-imp" value="150.000" autocomplete="off"><i>lei</i></span></label>
      <div class="sp-calc-out"><span>Poți direcționa până la</span><b id="sp-tax-v">–</b><small id="sp-tax-why"></small></div>
      <p class="sp-calc-fine">Orientativ, după art. 25 și art. 56 din Codul fiscal: la impozitul pe profit, suma mai mică dintre 0,75% din cifra de afaceri și 20% din impozit; la microîntreprinderi, 20% din impozitul pe venit. Beneficiarul trebuie să fie înscris în Registrul entităților. Verifică cu contabilul tău.</p>
    </div>
  </div></section>

  <section class="sec sec-alt" id="branduri"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Brandurile alături de noi</p><h2>Au crescut România împreună cu antreprenorii.</h2>
      <p class="lead">${plural(d.all.length, 'brand', 'branduri')}, ${plural(d.nWs, 'atelier sponsorizat', 'ateliere sponsorizate')}, ${plural(d.strategic.length, 'partener de cohortă', 'parteneri de cohortă')}. Apasă pe oricare ca să vezi ce a făcut alături de program.</p></div></div>
    <div class="sp-inv-bar">
      <div class="sp-seg" role="group" aria-label="Rol"><button type="button" class="on" data-k="">Toate <i>${d.all.length}</i></button>${[['partener', 'Parteneri de cohortă'], ['sponsor', 'Sponsori de atelier'], ['gazda', 'Gazde'], ['alumni', 'Din alumni']].filter(([k]) => K[k]).map(([k, l]) => `<button type="button" data-k="${k}">${l} <i>${K[k]}</i></button>`).join('')}</div>
      <div class="tr-search sp-inv-q"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input id="sp-q" type="search" placeholder="Caută un brand" autocomplete="off" aria-label="Caută un brand"></div>
    </div>
    ${perYear.length > 1 ? `<div class="sp-years" role="group" aria-label="An"><button type="button" class="on" data-y=""><span>Toți anii</span></button>${perYear.map(([y, n]) => `<button type="button" data-y="${y}" style="--h:${Math.round((n / maxY) * 100)}%"><i></i><b>${n}</b><span>${y}</span></button>`).join('')}</div>` : ''}
    <p class="sp-inv-count" aria-live="polite"></p>
    <div class="sp-inv">${d.all.map(brandCard).join('')}</div>
    <p class="sp-inv-empty" hidden>Niciun brand pentru combinația asta.</p>
    <div hidden>${d.all.map(brandDetail).join('')}</div>
  </div></section>

  <section class="sec sp-final" id="vreau"><div class="wrap">
    <div class="sp-final-grid">
      <div class="sp-final-copy">
        <p class="eyebrow">Vreau și eu</p>
        <h2>Un click acum. Antreprenori mai puternici la anul.</h2>
        <p class="lead">Spune-ne ce ți-ar plăcea. Îți trimitem propunerea și contractul de sponsorizare pe email; ne vedem doar dacă vrei.</p>
        <div class="sp-ways">
          <div id="sponsorizeaza"><b>Sponsorizează</b><span>un atelier, o cohortă sau un an</span><a class="btn btn-light" href="?implicare=sponsorizare#vreau" data-implica="sponsorizare">Vreau și eu</a></div>
          <div id="gazduieste"><b>Găzduiește</b><span>un atelier la sediul tău</span><a class="btn btn-outline-light" href="?implicare=gazduire#vreau" data-implica="gazduire">Propune un spațiu</a></div>
          <div id="mentor"><b>Devino mentor</b><span>sau trainer, pro-bono</span><a class="btn btn-outline-light" href="?implicare=mentorat#vreau" data-implica="mentorat">Scrie-ne</a></div>
        </div>
        ${contact ? `<p class="sp-contact">Parteneriate: <b>${esc(contact.nume)}</b>, <a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a>${spons && spons !== contact ? `<br>Sponsorizări ateliere: <b>${esc(spons.nume)}</b>, <a href="mailto:${esc(spons.email)}">${esc(spons.email)}</a>` : ''}</p>` : ''}
      </div>
      ${openBy.size || d.prep.length ? `<div class="sp-avail">
        <div class="sp-avail-top"><span class="tag-live"><i></i>Disponibile acum</span><b>${plural(d.open.length, 'atelier caută', 'ateliere caută')} sponsor</b></div>
        ${[...openBy].map(([e, ws]) => `<div class="sp-avail-ed"><p><a href="${edUrl(e)}">Cohorta ${esc(edLabel(e))}</a><span>${esc(e.sezon || '')} ${esc(e.an)}</span></p><ul>${ws.map((a) => `<li><span><b>${esc(cleanTitle(a.titlu))}</b><small>${a.data ? fmtDay(a.data) : 'data se anunță'} · ${a.format === 'seară' ? 'atelier de seară' : 'o zi întreagă'}</small></span><a class="sp-res" href="?implicare=sponsorizare#vreau" data-implica="sponsorizare" data-im-fmt="atelier" data-im-tema="${esc(T[a.tema]?.nume || '')}" data-im-msg="${esc(`Vreau să sponsorizez atelierul „${cleanTitle(a.titlu)}” din cohorta ${edLabel(e)}.`)}">Rezervă</a></li>`).join('')}</ul></div>`).join('')}
        ${d.prep.map((e) => `<div class="sp-avail-ed"><p><a href="${edUrl(e)}">Cohorta ${esc(edLabel(e))}</a><span>${esc(e.sezon || '')} ${esc(e.an)} · în pregătire</span></p><ul><li><span><b>Partener de cohortă</b><small>locul e liber · toate atelierele cohortei</small></span><a class="sp-res" href="?implicare=sponsorizare#vreau" data-implica="sponsorizare" data-im-fmt="editie" data-im-msg="${esc(`Vreau să fiu partener al cohortei ${edLabel(e)} (${e.sezon || ''} ${e.an}).`)}">Rezervă</a></li></ul></div>`).join('')}
      </div>` : ''}
    </div>
  </div></section>
  <a class="btn btn-primary sp-fab" href="?implicare=sponsorizare#vreau" data-implica="sponsorizare">Vreau și eu <span aria-hidden="true">→</span></a>
</main>
<dialog class="sp-dlg" id="sp-br-dlg" aria-label="Brand"><button type="button" class="im-x" data-close aria-label="Închide">✕</button><div class="sp-dlg-in"></div></dialog>
${implicareDialog({ formate: FORMATE, echipa: ECHIPA, themes, cluj: clujTxt })}`;
}

module.exports = { parteneriBody, partnersData };
