// Liderii (trainerii, antreprenorii invitați și facilitatorii): /lideri (toți, cu filtre) și /lideri/<id> (fișa fiecăruia).
// Totul vine din agenda atelierelor: ce teme a ținut fiecare, în ce cohorte, alături de cine.
const { esc, initials, fmtDay, today, img, de, TEME, temaUrl } = require('./util');

const plural = (n, one, many) => `${n} ${n === 1 ? one : (n % 100 === 0 || n % 100 >= 20 ? 'de ' : '') + many}`;
const avatar = (p, w) => (p?.imagine ? `<img src="${esc(img(p.imagine, w))}" alt="" loading="lazy">` : `<span class="ph">${esc(initials(p?.nume || '?'))}</span>`);
const edUrl = (e) => (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`);
const edLabel = (e) => (e.serie === 'Cluj' ? `Cluj #${e.numar}` : `#${e.numar}`);
const cleanTitle = (t) => String(t || '').replace(/^(Atelier de Seară|COCKTAIL NETWORKING)\s*[-:]\s*/i, '').replace(/\.\s*$/, '');
const chrono = (D) => D.editii.slice().sort((a, b) => a.an - b.an || (a.sezon === b.sezon ? (a.serie === 'Cluj') - (b.serie === 'Cluj') : a.sezon === 'primăvară' ? -1 : 1));
const ROL = { trainer: 'Trainer', 'antreprenor invitat': 'Antreprenor invitat', facilitator: 'Facilitator', invitat: 'Invitat' };
const SPEAKER = ['trainer', 'antreprenor invitat', 'facilitator', 'invitat'];
const FULL = ['viziune', 'model-business', 'marketing', 'vanzari', 'cultura'];
const themeUrl = temaUrl;

// pentru fiecare temă: când merită să vorbești cu omul (pentru antreprenor) și întrebări de pornire.
// „poveste” = pentru cei care au construit o companie (o = numele companiei, poate lipsi); „metoda” = pentru traineri.
const GHID = {
  viziune: { cand: 'nu mai e clar încotro merge firma sau echipa nu trage în aceeași direcție',
    poveste: [(o) => `Cum ați formulat direcția ${o ? `pentru ${o}` : 'companiei'} la început și cât s-a schimbat de atunci?`, () => 'Cum ții echipa aliniată pe direcție când compania crește repede?', () => 'Ce decizie de leadership ai lua altfel dacă ai lua-o azi?'],
    metoda: ['Cum scriu o viziune pe care echipa chiar o folosește în decizii?', 'Cum îmi dau seama că sunt eu blocajul creșterii firmei?', 'Ce obiceiuri de leadership schimbă cel mai repede o echipă?'] },
  'model-business': { cand: 'crește cifra de afaceri, dar nu și profitul, sau te gândești la o linie nouă de business',
    poveste: [(o) => `Cum ați ajuns la modelul de business ${o ? `de azi al ${o}` : 'de azi'} și ce ați încercat înainte?`, () => 'De unde vine, de fapt, marja: ce clienți și ce produse merită păstrate?', () => 'Cum testezi un model nou fără să pui în pericol ce merge deja?'],
    metoda: ['Ce întrebări ar trebui să-mi pun despre modelul meu de business în fiecare an?', 'Cum văd rapid ce produse sau clienți îmi mănâncă marja?', 'Cum schimbă tehnologia și AI-ul modelul unei firme ca a mea?'] },
  marketing: { cand: 'clienții nu te găsesc sau nu înțeleg de ce să te aleagă pe tine',
    poveste: [(o) => `Ce canal de marketing a contat cel mai mult ${o ? `pentru ${o}` : 'în creștere'} și de ce?`, () => 'Cum ați ales poziționarea într-o piață aglomerată?', () => 'Cum măsurați dacă marketingul aduce clienți, nu doar vizibilitate?'],
    metoda: ['Cu ce buget minim pot testa un canal nou de marketing?', 'Cum îmi definesc clientul ideal ca să nu vorbesc cu toată lumea?', 'Ce indicatori de marketing ar trebui să urmăresc lunar?'] },
  vanzari: { cand: 'vânzările depind încă de tine ca fondator',
    poveste: [(o) => `Cum arată motorul de vânzări ${o ? `al ${o}` : ''}: cine vinde, cui și în cât timp se închide o vânzare?`, () => 'Când ați angajat primul om de vânzări și ce ați învățat din asta?', () => 'Cum ai trecut de la vânzările făcute de fondator la o echipă de vânzări?'],
    metoda: ['Ce indicatori de vânzări merită urmăriți săptămânal?', 'Cum construiesc un proces de vânzare pe care îl poate repeta oricine din echipă?', 'Cum recrutez și cum plătesc un om bun de vânzări?'] },
  cultura: { cand: 'recrutezi greu, pleacă oamenii buni sau nu reușești să delegi',
    poveste: [(o) => `Cum recrutați oameni care se potrivesc culturii ${o ? `de la ${o}` : 'firmei'}?`, () => 'Ce faci când un om bun nu se mai potrivește cu direcția companiei?', () => 'Cum ai învățat să delegi fără să pierzi controlul asupra calității?'],
    metoda: ['Cum pun în cuvinte cultura firmei astfel încât să ajute la angajări?', 'Ce ritualuri de echipă merită introduse într-o firmă de 10–50 de oameni?', 'Cum dau feedback greu fără să pierd omul?'] },
  finantare: { cand: 'te gândești la un credit, la fonduri europene sau la investitori',
    poveste: [() => 'Când are sens să atragi investitori și când e mai bine să crești din profit?', () => 'Ce ți-ar fi plăcut să știi înainte de prima rundă de finanțare?', () => 'Cum ai negociat condițiile cu finanțatorii?'],
    metoda: ['Ce verifică un finanțator la o companie de mărimea mea?', 'Cum compar un credit, un grant și un investitor pentru același proiect?', 'Ce documente să am pregătite înainte să cer finanțare?'] },
  fiscalitate: { cand: 'vrei să înțelegi ce taxe plătești și cum le gestionezi corect pe măsură ce crești',
    poveste: [() => 'Ce greșeli fiscale fac cel mai des companiile în creștere?', () => 'Cum ai organizat partea financiară când firma a crescut?'],
    metoda: ['Ce greșeli fiscale fac cel mai des companiile în creștere?', 'Cum structurez corect remunerarea mea ca fondator?', 'Ce ar trebui să verific lunar cu contabilul meu?'] },
  mastermind: { cand: 'ai o decizie grea de luat și vrei părerea altor antreprenori',
    poveste: [() => 'Cum folosești un grup de egali ca să iei decizii mai bune?', () => 'Ce problemă ai rezolvat datorită altor antreprenori?'],
    metoda: ['Cum îmi formulez problema ca să primesc sfaturi utile de la un grup?', 'Cât de des merită să-mi testez deciziile cu alți antreprenori?'] },
  board: { cand: 'iei deciziile mari singur și ai nevoie de oameni care să te contrazică',
    poveste: [(o) => `Cum ați construit board-ul de advisori ${o ? `la ${o}` : ''} și ce rol are în deciziile mari?`, () => 'Când e momentul potrivit pentru un board și cum alegi oamenii?', () => 'Cum îi răsplătești pe advisori și cum le ceri să fie sinceri?'],
    metoda: ['Când e momentul potrivit pentru un board de advisori?', 'Cum aleg advisorii și ce le cer concret?', 'Cum pregătesc o întâlnire de board care chiar ajută?'] },
  ai: { cand: 'vrei să afli unde aduce AI-ul un câștig real în firma ta',
    poveste: [(o) => `Unde ați folosit AI ${o ? `la ${o}` : ''} cu un rezultat măsurabil?`, () => 'Ce procese ai automatiza primele într-o firmă ca a mea?'],
    metoda: ['Cu ce proces din firmă să încep când vreau să folosesc AI?', 'Cum îmi pregătesc echipa să lucreze cu instrumente AI?', 'Ce riscuri am când pun datele firmei în instrumente AI?'] },
};

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
  // fiecare apariție, cu atelierul și cohorta ei
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
    // rol = cel principal (pe card); roluri = toate rolurile avute vreodată (pentru filtre și numărători, ca în meniu)
    .map((p) => ({ p, rol: mainRole(p), roluri: [...new Set(p.aparitii.map((a) => (a.rol === 'invitat' ? 'facilitator' : a.rol)))], org: company(ctx, p), themes: [...new Set(p.aparitii.map((a) => a.tema).filter(Boolean))] }))
    .sort((a, b) => b.p.editii.length - a.p.editii.length || b.p.aparitii.length - a.p.aparitii.length || a.p.nume.localeCompare(b.p.nume, 'ro'));
}
const span = (eds) => { const b = eds.filter((e) => e.serie === 'București'), c = eds.filter((e) => e.serie === 'Cluj'); return [b.length > 2 ? `${edLabel(b[0])}–${edLabel(b[b.length - 1])}` : b.map(edLabel).join(', '), ...c.map(edLabel)].filter(Boolean).join(', '); };

// ---------- /lideri ----------
function traineriBody(ctx, F) {
  const { D, T } = ctx;
  const L = everyone(ctx);
  const n = (r) => L.filter((x) => x.roluri.includes(r)).length;
  const themes = D.teme.filter((t) => L.some((x) => x.themes.includes(t.id)));
  return `<main>
  <section class="hero pg-hero tr-lhero"><div class="wrap">
    <nav class="crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><b>Lideri</b></nav>
    <div class="hero-split">
      <div class="hero-copy">
        <p class="eyebrow">Lideri · fondatori, CEO și traineri</p>
        <h1>Oameni care vorbesc din ce trăiesc.</h1>
        <p class="lead">Dimineața, un trainer lucrează aplicat cu grupa. După-amiaza, antreprenori care au trecut prin aceeași problemă povestesc cum au rezolvat-o. ${plural(L.filter((x) => x.p.editii.length >= 5).length, 'om revine', 'oameni revin')} în cel puțin cinci cohorte.</p>
      </div>
      <dl class="tr-stats" aria-label="În cifre">
        <div><dt>${n('antreprenor invitat')}</dt><dd>fondatori și CEO invitați, cu povestea lor</dd></div>
        <div><dt>${n('trainer')}</dt><dd>${de(n('trainer'))}traineri, pentru partea aplicată a atelierelor</dd></div>
        <div><dt>${n('facilitator')}</dt><dd>facilitatori pentru atelierele de seară</dd></div>
      </dl>
    </div>
  </div></section>

  <section class="sec tr-list-sec" id="lista"><div class="wrap">
    <div class="tr-bar" role="search">
      <div class="tr-seg" data-tr-group="rol" role="group" aria-label="Rol"><button class="on" data-tr="" aria-pressed="true">Toți <i>${L.length}</i></button>${[['antreprenor invitat', 'Antreprenori invitați'], ['trainer', 'Traineri'], ['facilitator', 'Facilitatori']].map(([k, l]) => `<button data-tr="${esc(k)}" aria-pressed="false">${l} <i>${n(k)}</i></button>`).join('')}</div>
      <label class="tr-sel"><span class="sr">Temă</span><select id="tr-tema"><option value="">Toate temele</option>${themes.map((t) => `<option value="${esc(t.id)}">${esc(t.nume)}</option>`).join('')}</select></label>
      <div class="tr-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input id="tr-q" type="search" placeholder="Caută după nume sau companie" autocomplete="off" aria-label="Caută printre traineri și invitați după nume sau companie"></div>
    </div>
    <div class="tr-meta"><p class="tr-count" aria-live="polite"></p><p class="al-q-note tr-q-note" hidden></p></div>
    <div class="tr-grid">${L.map((x) => `<a class="tr-card" href="/lideri/${esc(x.p.id)}" data-rol="${esc(x.roluri.join('|'))}" data-teme="${esc(x.themes.join(' '))}">
      <span class="tr-ph">${avatar(x.p, 384)}</span>${x.p.editii.length > 1 ? `<i class="tr-n">${plural(x.p.editii.length, 'cohortă', 'cohorte')}</i>` : ''}
      <span class="tr-tx"><em>${x.rol === 'antreprenor invitat' ? 'Antreprenor<span class="tr-long"> invitat</span>' : esc(ROL[x.rol] || 'Invitat')}</em><b>${esc(x.p.nume)}</b><span>${esc(x.org)}</span></span></a>`).join('')}</div>
    <p class="tr-empty" hidden>Nimeni pentru combinația asta.</p>
  </div></section>

  <section class="cta-band"><div class="wrap cta-band-in">
    <div class="cta-band-copy">
      <p class="eyebrow">Curriculum</p>
      <h2>Fiecare temă, cu oamenii ei.</h2>
      <p>Cinci teme full-day, aceleași în fiecare cohortă, și ateliere de seară între ele.</p>
      <div class="hero-actions"><a class="btn btn-light btn-lg" href="/aplica">Aplică</a>${TEME ? '<a class="btn btn-outline-light btn-lg" href="/teme">Vezi temele</a>' : '<a class="btn btn-outline-light btn-lg" href="/editii">Vezi cohortele</a>'}</div>
    </div>
  </div></section>
</main>`;
}

// ---------- /lideri/<id> ----------
// o fișă compactă, gândită pentru antreprenorul care vede omul în agendă: cine e, din ce companie,
// la ce să-l asculte (ariile, după atelierele ținute) și ce să-l întrebe ca să-i folosească în firma lui.
const shortDay = (d) => { const [y, m, z] = d.split('-').map(Number); return `${z} ${['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'noi', 'dec'][m - 1]} ${y}`; };
const tidy = (s) => s.replace(/\s{2,}/g, ' ').replace(/\s+([:?,.])/g, '$1');
const list = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} și ${a[a.length - 1]}`);
const ICON = {
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

function trainerBody(ctx, F, id) {
  const { D, T, O } = ctx;
  const d = personData(ctx, id);
  const { p } = d;
  const first = p.nume.split(' ')[0];
  const nx = d.next;
  const lastOrg = O[p.aparitii[p.aparitii.length - 1]?.organizatie] || O[p.organizatii[p.organizatii.length - 1]] || null;
  const orgName = d.org;
  const story = d.rol !== 'trainer';
  const yr0 = d.eds[0].an;

  // ariile de expertiză: temele, după câte ateliere a ținut din fiecare (fără networking)
  const areas = d.themes.filter((t) => t.format !== 'networking').map((t) => ({ t, n: d.ws.filter((x) => x.w.tema === t.id).length, roles: [...new Set(d.ws.filter((x) => x.w.tema === t.id).map((x) => x.rol))] }))
    .sort((a, b) => b.n - a.n || FULL.indexOf(b.t.id) - FULL.indexOf(a.t.id));
  const max = Math.max(1, ...areas.map((a) => a.n));
  const extra = (p.expertiza || []).filter(Boolean);

  // întrebările: cele scrise în panou, apoi cele de pornire pentru fiecare arie (câte una-două pe temă, cât să fie variat)
  const qs = [];
  (p.intrebari || []).filter(Boolean).forEach((q) => qs.push({ q, tema: '', top: true }));
  areas.forEach(({ t, roles }, i) => {
    const g = GHID[t.id]; if (!g) return;
    const asStory = story || !roles.includes('trainer');
    const L = asStory ? g.poveste.map((f) => f(orgName)) : g.metoda;
    L.slice(0, i < 2 ? 3 : 2).forEach((q, j) => qs.push({ q: tidy(q), tema: t.id, top: j === 0 || (i === 0 && j === 1) }));
  });
  const qThemes = areas.filter((a) => qs.some((q) => q.tema === a.t.id));

  // rezumatul de sus: bio-ul din panou sau o frază din ce știm
  const top = areas.slice(0, 2).map((a) => a.t.nume);
  const sum = p.bio || `${d.fn && orgName ? `${d.fn} la ${orgName}. ` : ''}${ROL[d.rol] || 'Invitat'} la Antreprenoria din ${yr0}: ${plural(d.ws.length, 'atelier', 'ateliere')} în ${plural(d.eds.length, 'cohortă', 'cohorte')}${top.length ? `, mai ales despre ${list(top.map((x) => x.toLowerCase()))}` : ''}.`;

  // compania: ce știm despre ea și cine mai e de acolo în program
  const orgPeople = lastOrg ? (lastOrg.oameni || []).filter((x) => x !== id && ctx.P[x]).map((x) => ctx.P[x]) : [];
  const orgAlumni = lastOrg && (lastOrg.participari || []).length;
  const orgCard = orgName ? `<section class="ld-card ld-org" id="companie" aria-labelledby="ld-org-h">
      <p class="ld-k">Compania</p>
      <div class="ld-org-id">${lastOrg?.logo ? `<span class="ld-logo"><img src="${esc(lastOrg.logo)}" alt="" loading="lazy"></span>` : `<span class="ld-logo ld-logo-ph">${esc(initials(orgName))}</span>`}
        <div><h2 id="ld-org-h">${esc(orgName)}</h2>${lastOrg && (lastOrg.sector || (lastOrg.tip && lastOrg.tip !== 'companie')) ? `<span>${esc([lastOrg.tip !== 'companie' ? lastOrg.tip : '', lastOrg.sector].filter(Boolean).join(' · '))}</span>` : ''}</div></div>
      ${lastOrg?.descriere ? `<p class="ld-org-d">${esc(tidy(lastOrg.descriere))}</p>` : `<p class="ld-org-d">${esc(first)} vine la Antreprenoria din partea ${esc(orgName)}. Un bun punct de pornire pentru discuție: ce face compania, pentru cine și cum a ajuns aici.</p>`}
      <ul class="ld-org-f">
        ${orgAlumni ? `<li>Companie din comunitatea Antreprenoria · ${plural(lastOrg.participari.length, 'participare', 'participări')}</li>` : ''}
        ${orgPeople.length ? `<li>Tot de acolo: ${orgPeople.slice(0, 3).map((o) => `<a href="${o.aparitii.length ? `/lideri/${esc(o.id)}` : `/comunitate/${esc(o.id)}`}">${esc(o.nume)}</a>`).join(', ')}</li>` : ''}
      </ul>
      ${lastOrg?.url ? `<a class="ld-link" href="${esc(lastOrg.url)}" target="_blank" rel="noopener">${esc(lastOrg.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))} ${ICON.out}</a>` : ''}
    </section>` : '';

  const wsRow = ({ e, w, rol }) => {
    const up = nx && nx.w.id === w.id;
    const t = T[w.tema];
    return `<li class="${up ? 'up' : ''}"><a href="${edUrl(e)}#agenda">
        <span class="ld-ws-d"><b>${edLabel(e)}</b><small>${w.data && w.data.startsWith(String(e.an)) ? shortDay(w.data) : `${esc(e.sezon)} ${e.an}`}</small></span>
        <span class="ld-ws-t"><b>${esc(cleanTitle(w.titlu))}</b><small>${esc(ROL[rol] || rol)}${t && t.format !== 'networking' ? ` · ${esc(t.format === 'full-day' ? 'full-day' : 'atelier de seară')}` : ''}${up ? ' · <em>urmează</em>' : ''}</small></span>
      </a></li>`;
  };
  const wsAll = d.ws.slice().reverse();
  const SHOW = 4;

  const main = areas[0]?.t;
  const peers = main ? everyone(ctx).filter((x) => x.p.id !== id && x.themes.includes(main.id)).slice(0, 4) : [];

  return `<main class="ld">
  <section class="ld-hero"><div class="wrap">
    <nav class="crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><a href="/lideri">Lideri</a><span>/</span><b>${esc(p.nume)}</b></nav>
    <div class="ld-head">
      <div class="ld-pic">${avatar(p, 384).replace(' loading="lazy"', ' fetchpriority="high"')}</div>
      <div class="ld-id">
        <p class="ld-badges"><span class="ld-badge">${esc(ROL[d.rol] || 'Invitat')}</span>${d.eds.length >= 5 ? `<span class="ld-badge ld-badge-soft">Revine din ${yr0}</span>` : ''}</p>
        <h1>${esc(p.nume)}</h1>
        ${d.fn || orgName ? `<p class="ld-org-line">${d.fn ? `${esc(d.fn)}${orgName ? ' · ' : ''}` : ''}${orgName ? `<a href="#companie">${esc(orgName)}</a>` : ''}</p>` : ''}
        <p class="ld-sum">${esc(sum)}</p>
        <div class="ld-act">
          ${nx ? `<a class="btn btn-primary" href="${edUrl(nx.e)}#agenda"><i class="dot-live"></i>Următorul atelier: ${fmtDay(nx.w.data)}</a>` : ''}
          ${qs.length ? `<a class="btn ${nx ? 'btn-ghost' : 'btn-primary'}" href="#intrebari">Ce poți întreba</a>` : ''}
          ${p.linkedin ? `<a class="btn btn-ghost" href="${esc(p.linkedin)}" target="_blank" rel="noopener">LinkedIn ${ICON.out}</a>` : ''}
        </div>
      </div>
      <dl class="ld-kpi" aria-label="Pe scurt">
        <div><dt>${d.eds.length}</dt><dd>${d.eds.length === 1 ? 'cohortă' : 'cohorte'}</dd></div>
        <div><dt>${d.ws.length}</dt><dd>${d.ws.length === 1 ? 'atelier' : 'ateliere'}</dd></div>
        <div><dt>${areas.length}</dt><dd>${areas.length === 1 ? 'arie' : 'arii'}</dd></div>
        <div><dt>${yr0}</dt><dd>primul atelier</dd></div>
      </dl>
    </div>
  </div></section>

  <div class="wrap ld-grid">
    <div class="ld-main">
      ${areas.length || extra.length ? `<section class="ld-card ld-exp" id="expertiza" aria-labelledby="ld-exp-h">
        <div class="ld-card-h"><p class="ld-k">Expertiză</p><h2 id="ld-exp-h">Când te poate ajuta</h2></div>
        ${extra.length ? `<ul class="ld-tags">${extra.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        <ul class="ld-areas">${areas.map(({ t, n, roles }) => `<li>
          <a class="ld-area-h" href="${themeUrl(t)}"><b>${esc(t.nume)}</b><span>${plural(n, 'atelier', 'ateliere')}${roles.length === 1 ? `<i> · ${esc((ROL[roles[0]] || roles[0]).toLowerCase())}</i>` : ''}</span></a>
          <i class="ld-bar" style="--w:${Math.round((n / max) * 100)}%"></i>
          ${GHID[t.id] ? `<p>Pentru tine dacă ${esc(GHID[t.id].cand)}.</p>` : ''}
        </li>`).join('')}</ul>
      </section>` : ''}

      ${qs.length ? `<section class="ld-card ld-qs" id="intrebari" aria-labelledby="ld-qs-h">
        <div class="ld-card-h"><p class="ld-k">Pregătește-te</p><h2 id="ld-qs-h">Întrebări pentru ${esc(first)}</h2><p class="ld-hint">Întrebări de pornire, după ce a povestit în ateliere. Alege-o pe cea mai aproape de problema firmei tale.</p></div>
        ${qThemes.length > 1 ? `<div class="ld-tabs" role="group" aria-label="Filtrează după temă"><button class="on" data-ld-q="">Toate</button>${qThemes.map((a) => `<button data-ld-q="${esc(a.t.id)}">${esc(a.t.nume)}</button>`).join('')}</div>` : ''}
        <ol class="ld-q-list">${qs.map((x) => `<li data-tema="${esc(x.tema)}"${x.top ? ' data-top' : qThemes.length > 1 ? ' hidden' : ''}><span>${esc(x.q)}</span><button class="ld-copy" type="button" data-copy="${esc(x.q)}" aria-label="Copiază întrebarea">${ICON.copy}<em>Copiat</em></button></li>`).join('')}</ol>
        ${qThemes.length > 1 && qs.some((x) => !x.top) ? `<p class="ld-q-more">Încă ${plural(qs.filter((x) => !x.top).length, 'întrebare', 'întrebări')} pe teme: alege una de mai sus.</p>` : ''}
      </section>` : ''}

      <section class="ld-card ld-ws" id="ateliere" aria-labelledby="ld-ws-h">
        <div class="ld-card-h ld-card-row"><div><p class="ld-k">Atelierele</p><h2 id="ld-ws-h">Unde a vorbit</h2></div><span class="ld-span">${esc(span(d.eds))}</span></div>
        <ol class="ld-ws-list">${wsAll.slice(0, SHOW).map(wsRow).join('')}</ol>
        ${wsAll.length > SHOW ? `<details class="ld-more"><summary><span>Toate cele ${wsAll.length} ${de(wsAll.length)}ateliere</span></summary><ol class="ld-ws-list">${wsAll.slice(SHOW).map(wsRow).join('')}</ol></details>` : ''}
      </section>
    </div>

    <aside class="ld-side" aria-label="Despre ${esc(p.nume)}">
      ${nx ? `<a class="ld-card ld-next" href="${edUrl(nx.e)}#agenda"><p class="ld-k"><i class="dot-live"></i>Urmează</p><b>${esc(cleanTitle(nx.w.titlu))}</b><span>${fmtDay(nx.w.data)} · Antreprenoria ${edLabel(nx.e)}${nx.w.locatie && nx.w.locatie !== 'TBD' ? ` · ${esc(nx.w.locatie)}` : ''}</span></a>` : ''}
      ${orgCard}
      ${d.co.length ? `<section class="ld-card ld-co" aria-labelledby="ld-co-h">
        <p class="ld-k" id="ld-co-h">Pe aceeași scenă</p>
        <ul>${d.co.slice(0, 5).map((c) => `<li><a href="/lideri/${esc(c.p.id)}">${avatar(c.p, 128)}<span><b>${esc(c.p.nume)}</b><small>${esc(company(ctx, c.p) || ROL[c.rol] || '')}</small></span><i>${c.n}×</i></a></li>`).join('')}</ul>
      </section>` : ''}
      ${peers.length ? `<section class="ld-card ld-co" aria-labelledby="ld-peer-h">
        <p class="ld-k" id="ld-peer-h">Tot despre ${esc(main.nume.toLowerCase())}</p>
        <ul>${peers.map((x) => `<li><a href="/lideri/${esc(x.p.id)}">${avatar(x.p, 128)}<span><b>${esc(x.p.nume)}</b><small>${esc(x.org || ROL[x.rol] || '')}</small></span></a></li>`).join('')}</ul>
      </section>` : ''}
      <div class="ld-card ld-cta">
        <b>Vrei să lucrezi cu oameni ca ${esc(first)}?</b>
        <p>Trei luni de ateliere, un grup selectat de antreprenori și comunitatea RBL.</p>
        <a class="btn btn-primary" href="/aplica">Aplică la Antreprenoria</a>
        <a class="ld-link" href="/lideri">Toți liderii →</a>
      </div>
    </aside>
  </div>
</main>`;
}

module.exports = { traineriBody, trainerBody, personData, everyone };
