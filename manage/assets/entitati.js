/* ENTITĂȚI: categorii -> grupuri -> entități (/manage/entitati[/categorie[/grup[/sub]]]).
   Edițiile sunt grupuri cu același set de sub-entități: program, ateliere, participanți, traineri & speakeri, parteneri.
   Oamenii, organizațiile, locațiile și temele sunt registre globale; edițiile le referă prin id.
   O organizație poate avea mai multe roluri: alumni, partener, sponsor, gazdă, angajatorul unui speaker. */

const IX = { P: {}, O: {}, L: {}, T: {}, ED: {} };
function indexEntities(D) {
  D.oameni.forEach((x) => (IX.P[x.id] = x));
  D.organizatii.forEach((x) => (IX.O[x.id] = x));
  D.locatii.forEach((x) => (IX.L[x.id] = x));
  D.teme.forEach((x) => (IX.T[x.id] = x));
  D.editii.forEach((x) => (IX.ED[x.id] = x));
}
const edLabel = (e) => (e.serie === 'Cluj' ? `Cluj #${e.numar}` : `#${e.numar}`);
const edShort = (id) => (IX.ED[id] ? edLabel(IX.ED[id]) : id);
const edLink = (id) => `<a href="/manage/entitati/editii/${id}">${esc(edShort(id))}</a>`;
// edițiile în ordine cronologică (Cluj după #22, aceeași perioadă)
const edOrder = (D) => D.editii.slice().sort((a, b) => (a.an - b.an) || (a.sezon === b.sezon ? 0 : a.sezon === 'primăvară' ? -1 : 1) || (a.serie === 'Cluj') - (b.serie === 'Cluj'));
const fmtClass = (f) => (f === 'seară' ? 'seara' : f === 'networking' ? 'networking' : '');
const ROLE_LABEL = { trainer: 'Trainer', 'antreprenor invitat': 'Antreprenor invitat', facilitator: 'Facilitator', invitat: 'Invitat', participant: 'Participant', 'echipă': 'Echipă' };
const LVL = ['critic', 'mediu', 'minor'];

function personChip(id, extra) {
  const p = IX.P[id];
  if (!p) return '';
  const pic = p.imagine ? `<img src="${esc(p.imagine)}" alt="" loading="lazy">` : `<span class="ini">${esc(initials(p.nume))}</span>`;
  return `<a class="chip" href="/manage/entitati/oameni/p/${p.id}">${pic}${esc(p.nume)}${extra ? ` <em>· ${esc(extra)}</em>` : ''}</a>`;
}
const partnerName = (id) => IX.O[id]?.nume || id;
const partnerLogo = (id) => (IX.O[id]?.logo ? `<img class="logo-sm" src="${esc(IX.O[id].logo)}" alt="${esc(partnerName(id))}" loading="lazy">` : '');
const orgHref = (id) => `/manage/entitati/organizatii/o/${id}`;
const orgLink = (id) => (IX.O[id] ? `<a href="${orgHref(id)}">${esc(IX.O[id].nume)}</a>` : '<span class="muted">—</span>');
// rolurile unei organizații, în ordinea în care contează pentru poveste
const ORG_TIP = [['alumni', 'Alumni', 'ok'], ['organizator', 'Organizator', ''], ['partener', 'Partener', ''], ['sponsor', 'Sponsor', ''], ['gazdă', 'Gazdă', 'warn'], ['speaker', 'Angajatorul unui speaker', 'grey']];
const orgTags = (o) => ORG_TIP.filter(([t]) => o.tipuri.includes(t)).map(([, l, c]) => `<span class="tag ${c}">${l}</span>`).join('');
// rolul dintr-o ediție -> tipul organizației (la fel ca în build)
const ROL_TIP_UI = { participant: 'alumni', speaker: 'speaker', 'gazdă': 'gazdă', 'sponsor atelier': 'sponsor', organizator: 'organizator' };
// organizațiile care susțin o ediție: organizator, parteneri, sponsori, gazde (fără participanți și angajatorii speakerilor)
function editionPartners(D, e) {
  const order = ['organizator', 'partener strategic', 'powered by', 'partener ediție', 'gazdă', 'sponsor atelier'];
  return D.organizatii.map((o) => ({ o, roluri: o.roluri.filter((r) => r.editie === e.id && r.rol !== 'participant' && r.rol !== 'speaker') }))
    .filter((x) => x.roluri.length)
    .sort((a, b) => Math.min(...a.roluri.map((r) => order.indexOf(r.rol))) - Math.min(...b.roluri.map((r) => order.indexOf(r.rol))));
}
const kvRow = (k, v) => (v ? `<dt>${esc(k)}</dt><dd>${v}</dd>` : '');

/* ---------- categorii ---------- */
function entityCategories(D) {
  return [
    { id: 'program', icon: 'program', title: 'Program', desc: 'Ce este Antreprenoria: identitate, organizatorul RBL, metodologia, cifrele declarate și contactul.',
      groups: ['identitate', 'metodologie', 'cifre', 'contact'] },
    { id: 'editii', icon: 'editii', title: 'Ediții', desc: 'Câte un grup pentru fiecare ediție, cu același set de sub-entități: program, ateliere, participanți, traineri & speakeri, parteneri.',
      groups: edOrder(D).map((e) => e.id).reverse() },
    { id: 'oameni', icon: 'oameni', title: 'Oameni', desc: 'Registru global: trainerii, antreprenorii invitați, facilitatorii, participanții și echipa, cu toate edițiile în care apar.',
      groups: ['traineri', 'invitati', 'facilitatori', 'participanti', 'echipa'] },
    { id: 'organizatii', icon: 'companii', title: 'Organizații', desc: 'Registru unic: aceeași firmă poate fi alumni, partener, sponsor, gazdă sau angajatorul unui speaker. Fiecare are parcursul ei pe ediții.',
      groups: ['ciclu', 'multirol', 'alumni', 'parteneri', 'speakeri', 'locatii'] },
    { id: 'teme', icon: 'teme', title: 'Curriculum', desc: 'Temele atelierelor care se repetă de la o ediție la alta, cu titlurile folosite și trainerii fiecărei teme.',
      groups: ['matrice', 'full-day', 'seara', 'networking'] },
    { id: 'seo', icon: 'seo', title: 'Audit', audit: true, desc: 'Nu sunt entități: inconsecvențele găsite la extragere (date, conținut, conversie).',
      groups: ['observatii'] },
  ];
}

/* ---------- grupuri: titlu, număr, descriere, html ---------- */
function groupInfo(D, catId, g) {
  const people = (fn) => D.oameni.filter(fn);
  switch (catId) {
    case 'program': return {
      identitate: { title: 'Identitate', count: null, desc: 'Numele, organizatorul, descrierea și audiența programului.', html: () => programIdentity(D) },
      metodologie: { title: 'Metodologie', count: D.program.metodologie.length, desc: 'Cum se desfășoară programul, din pagina ediției curente.', html: () => programMethod(D) },
      cifre: { title: 'Cifre declarate', count: D.program.cifre.length, desc: 'Cifrele folosite pe site, cu sursa.', html: () => programFigures(D) },
      contact: { title: 'Contact & echipă', count: D.program.contact.echipa.length, desc: 'Adresa, oamenii din echipă, formularele de înscriere și rețelele sociale.', html: () => programContact(D) },
    }[g];
    case 'editii': { const e = IX.ED[g]; return e && { title: `Antreprenoria ${edLabel(e)}`, count: e.ateliere.length, desc: `${e.perioada} · ${e.status}`, html: null }; }
    case 'oameni': {
      const def = {
        traineri: ['Traineri', 'Trainerii care țin partea de training a atelierelor full-day.', (p) => p.tipuri.includes('trainer')],
        invitati: ['Antreprenori invitați', 'Antreprenorii care își prezintă experiența în a doua parte a atelierelor.', (p) => p.tipuri.includes('antreprenor invitat')],
        facilitatori: ['Facilitatori & invitați de seară', 'Cei care susțin atelierele de seară: mastermind, finanțare, board of advisors, AI.', (p) => p.tipuri.includes('facilitator') || p.tipuri.includes('invitat')],
        participanti: ['Participanți', 'Antreprenorii selectați în fiecare ediție (alumni).', (p) => p.tipuri.includes('participant')],
        echipa: ['Echipa', 'Oamenii din echipa programului, din paginile de contact.', (p) => p.tipuri.includes('echipă')],
      }[g];
      if (!def) return null;
      const list = people(def[2]);
      return { title: def[0], count: list.length, desc: def[1], html: () => (g === 'participanti' ? participantsRegistry(list) : g === 'echipa' ? teamList(D) : speakersList(list, g)) };
    }
    case 'organizatii': {
      const O = D.organizatii, has = (t) => (o) => o.tipuri.includes(t);
      const ciclu = O.filter((o) => o.ciclu);
      const multi = O.filter((o) => o.tipuri.filter((t) => t !== 'organizator').length > 1);
      const alumni = O.filter(has('alumni'));
      const part = O.filter((o) => ['partener', 'sponsor', 'organizator'].some((t) => o.tipuri.includes(t)));
      const spk = O.filter(has('speaker'));
      return {
        ciclu: { title: 'Din alumni, parteneri', count: ciclu.length, desc: 'Companii care au participat la program și s-au întors într-o ediție ulterioară ca sponsor, gazdă sau cu un speaker.', html: () => orgCards(ciclu) },
        multirol: { title: 'Cu mai multe roluri', count: multi.length, desc: 'Organizațiile care apar pe site în cel puțin două roluri diferite.', html: () => orgCards(multi) },
        alumni: { title: 'Companii alumni', count: alumni.length, desc: 'Companiile participanților, cu sectorul, cifra de afaceri și angajații declarați la fiecare ediție.', html: () => alumniTable(D, alumni) },
        parteneri: { title: 'Parteneri & sponsori', count: part.length, desc: 'Organizatorul, partenerii din antetul edițiilor și sponsorii de ateliere.', html: () => partnersList(part) },
        speakeri: { title: 'Companiile speakerilor', count: spk.length, desc: 'Firmele din care vin trainerii și antreprenorii invitați.', html: () => speakerOrgs(spk) },
        locatii: { title: 'Locații', count: D.locatii.length, desc: 'Unde s-au ținut atelierele și cine a găzduit.', html: () => locationsList(D) },
      }[g];
    }
    case 'teme': {
      if (g === 'matrice') return { title: 'Curriculum pe ediții', count: null, desc: 'Ce teme a avut fiecare ediție, într-o singură matrice.', html: () => curriculumMatrix(D) };
      const f = { 'full-day': 'full-day', seara: 'seară', networking: 'networking' }[g];
      if (!f) return null;
      const list = D.teme.filter((t) => t.format === f);
      return { title: { 'full-day': 'Ateliere full-day', seara: 'Ateliere de seară', networking: 'Networking' }[g], count: list.length, desc: list.map((t) => t.nume).join(', '), html: () => themesList(D, list) };
    }
    case 'seo': return g === 'observatii' && { title: 'Observații', count: D.observatii.length, desc: 'Inconsecvențele găsite la extragere.', html: () => obsHtml(D) };
  }
  return null;
}

/* ---------- PROGRAM ---------- */
function programIdentity(D) {
  const P = D.program;
  return `<div class="card"><dl class="kv">
    ${kvRow('Nume', `<b>${esc(P.nume)}</b>`)}
    ${kvRow('Slogan', esc(P.slogan))}
    ${kvRow('Site', link(P.url, 'antreprenoria.ro'))}
    ${kvRow('Organizator', `${link(P.organizator.url, P.organizator.nume)}<div class="muted small">${esc(P.organizator.descriere)}</div>`)}
    ${kvRow('Din', String(P.de_cand))}
    ${kvRow('Descriere', esc(P.descriere))}
    ${kvRow('Audiența', esc(P.audienta))}
    ${kvRow('Ce obții', `<ul class="clean">${P.ce_obtii.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`)}
    ${kvRow('Format declarat', esc(P.format_declarat))}
    ${kvRow('Alumni menționați', tags(P.alumni_mentionati, ''))}
    ${kvRow('Ediții pe site', D.editii.map((e) => edLink(e.id)).join(' · '))}
  </dl>${src([SITE + '/despre-noi'])}</div>`;
}
function programMethod(D) {
  return `<div class="grid">${D.program.metodologie.map((m, i) => `<div class="card"><h3>${i + 1}. ${esc(m.titlu.charAt(0) + m.titlu.slice(1).toLowerCase())}</h3>
    <ul class="clean small">${m.puncte.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div>`;
}
function programFigures(D) {
  return `<div class="kpis">${D.program.cifre.map((c) => `<div class="kpi"><b>${esc(c.valoare)}</b><span>${esc(c.ce)}</span><div class="small">${link(SITE + c.sursa, c.sursa)}</div></div>`).join('')}</div>`;
}
function programContact(D) {
  const C = D.program.contact;
  return `<div class="card"><dl class="kv">
    ${kvRow('Adresă', esc(C.adresa))}
    ${kvRow('Echipă', C.echipa.map((m) => `${personChip(m.id)} <span class="muted small">${esc(m.rol)} · ${esc(m.email || '')}${m.telefon ? ' · ' + esc(m.telefon) : ''}</span>`).join('<br>'))}
    ${kvRow('Înscriere', C.inscriere.map((u) => link(u, u.replace(/^https?:\/\//, ''))).join('<br>'))}
    ${kvRow('Social', D.program.social.map((s) => link(s.url, s.retea)).join(' · '))}
  </dl>${src([SITE + '/contact'])}</div>`;
}

/* ---------- EDIȚII ---------- */
function editionCards(D) {
  return `<div class="ed-cards">${edOrder(D).reverse().map((e) => `
    <a class="ed-card ${e.serie === 'Cluj' ? 'cluj' : ''}" href="/manage/entitati/editii/${e.id}">
      <div class="cat-top"><span class="ed-num">${esc(edLabel(e))}<small>${esc(e.serie)}</small></span>${tags(e.status, e.deschisa ? 'ok' : 'grey')}</div>
      <div class="muted small">${esc(e.perioada)}${e.locatii.length ? ' · ' + esc(e.locatii.filter((l) => l !== 'TBD')[0] || '') : ''}</div>
      <div class="ed-stats"><span><b>${e.ateliere.length}</b> ateliere</span><span><b>${e.participanti.length}</b> participanți</span><span><b>${new Set(e.ateliere.flatMap((a) => a.program.flatMap((p) => p.speakeri.map((s) => s.persoana)))).size}</b> speakeri</span><span><b>${editionPartners(D, e).length}</b> parteneri</span></div>
    </a>`).join('')}</div>`;
}
const ED_SUBS = [['program', 'Program'], ['ateliere', 'Ateliere'], ['participanti', 'Participanți'], ['speakeri', 'Traineri & speakeri'], ['parteneri', 'Parteneri']];
function editionSpeakers(e) {
  const m = new Map();
  e.ateliere.forEach((a) => a.program.forEach((p) => p.speakeri.forEach((s) => {
    if (!m.has(s.persoana)) m.set(s.persoana, { id: s.persoana, roluri: new Set(), ateliere: [] });
    const x = m.get(s.persoana); x.roluri.add(s.rol); x.ateliere.push(a);
  })));
  return [...m.values()];
}
function editionPage(D, e, sub) {
  const sp = editionSpeakers(e);
  const counts = { program: null, ateliere: e.ateliere.length, participanti: e.participanti.length, speakeri: sp.length, parteneri: editionPartners(D, e).length };
  const obs = D.observatii.filter((o) => o.editie === e.id);
  const order = edOrder(D), i = order.findIndex((x) => x.id === e.id);
  const prev = order[i - 1], next = order[i + 1];
  let body = '';
  if (sub === 'program') {
    const vis = e.preturi.filter((p) => !p.ascuns);
    body = `<div class="grid2"><div class="card"><dl class="kv">
        ${kvRow('Titlu pe pagină', esc(e.titlu))}
        ${kvRow('Subtitlu', esc(e.subtitlu))}
        ${kvRow('Serie', `${esc(e.serie)} · ediția ${e.numar}`)}
        ${kvRow('Perioadă', `${esc(e.perioada)} <span class="muted">(${esc(e.sezon)} ${e.an})</span>`)}
        ${kvRow('Status', tags(e.status, e.deschisa ? 'ok' : 'grey'))}
        ${kvRow('Locații', e.locatii.map(esc).join(' · '))}
        ${kvRow('Format', ['full-day', 'seară', 'networking'].map((f) => { const n = e.ateliere.filter((a) => a.format === f).length; return n ? `<span class="tag ${f === 'full-day' ? '' : 'grey'}">${n} ${f}</span>` : ''; }).join(''))}
        ${kvRow('Prețuri', e.preturi.map((p) => `<div><b>${esc(p.pret_text)}</b> ${p.eticheta ? tags(p.eticheta, 'warn') : ''} <span class="muted small">${esc(p.nota || '')}${p.ascuns ? ' · ascuns pe pagină' : ''}</span></div>`).join('') || (vis.length ? '' : '<span class="muted">nu apare pe pagină</span>'))}
        ${kvRow('Valoare estimată', esc(e.valoare_estimata))}
        ${kvRow('Înscriere', e.link_inscriere ? link(e.link_inscriere, e.link_inscriere.replace(/^https?:\/\//, '')) : '')}
      </dl>${src([e.url])}</div>
      <div class="card"><h3>Ce primește participantul</h3>${e.beneficii.length ? `<ul class="clean">${e.beneficii.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : '<p>Pagina nu are secțiunea „Ai acces la”.</p>'}
        <h3 style="margin-top:14px">Calendar</h3>${editionTimeline(e)}
        ${obs.length ? `<h3 style="margin-top:14px">Observații pe această ediție</h3>${obs.map((o) => `<div class="small" style="margin-top:6px"><span class="lvl ${o.nivel}">${o.nivel}</span> ${esc(o.text)}</div>`).join('')}` : ''}
      </div></div>`;
  } else if (sub === 'ateliere') {
    body = e.ateliere.map(workshopHtml).join('');
  } else if (sub === 'participanti') {
    const total = e.participanti.reduce((n, p) => n + (p.cifra_afaceri || 0), 0);
    const comps = new Set(e.participanti.map((p) => p.organizatie).filter(Boolean));
    body = e.participanti.length ? `
      <div class="kpis"><div class="kpi"><b>${e.participanti.length}</b><span>participanți</span></div><div class="kpi"><b>${comps.size}</b><span>companii</span></div>
        <div class="kpi"><b>${leiShort(median(e.participanti.map((p) => p.cifra_afaceri)))}</b><span>cifră de afaceri mediană</span></div>
        <div class="kpi"><b>${median(e.participanti.map((p) => p.angajati)) ?? '—'}</b><span>angajați (median)</span></div></div>
      ${e.participanti_titlu ? `<p class="lead">„${esc(e.participanti_titlu)}”</p>` : ''}
      <div class="tbl"><table><thead><tr><th>Participant</th><th>Companie</th><th>Sector</th><th class="num">Cifră de afaceri</th><th class="num">Angajați</th></tr></thead><tbody>
      ${e.participanti.slice().sort((a, b) => (b.cifra_afaceri || 0) - (a.cifra_afaceri || 0)).map((p) => { const c = IX.O[p.organizatie]; return `<tr>
        <td>${personChip(p.persoana)}</td>
        <td>${c ? `${orgLink(c.id)}${c.incert ? ' <span class="tag warn" title="numele nu apare explicit pe site">dedus</span>' : ''}${c.tipuri.length > 1 ? ' <span class="tag" title="are și alte roluri în program">+ roluri</span>' : ''}` : '<span class="muted">—</span>'}</td>
        <td class="small">${esc(c?.sector || '')}</td><td class="num">${lei(p.cifra_afaceri)}</td><td class="num">${p.angajati ?? '—'}</td></tr>`; }).join('')}
      </tbody></table></div><p class="muted small">Suma cifrelor de afaceri declarate: ${lei(total)} (companiile cu mai mulți participanți sunt numărate o dată pentru fiecare).</p>`
      : '<div class="card empty"><b>Fără participanți pe pagină</b>Ediția nu are încă lista de participanți publicată.</div>';
  } else if (sub === 'speakeri') {
    body = `<div class="pgrid">${sp.sort((a, b) => [...a.roluri][0].localeCompare([...b.roluri][0])).map((x) => { const p = IX.P[x.id]; return `<div class="pcard">
      ${p.imagine ? `<img src="${esc(p.imagine)}" alt="" loading="lazy">` : `<span class="avatar">${esc(initials(p.nume))}</span>`}
      <div><b><a href="/manage/entitati/oameni/p/${p.id}">${esc(p.nume)}</a></b>${tags([...x.roluri].map((r) => ROLE_LABEL[r] || r), '')}
      <div class="small muted">${x.ateliere.map((a) => `#${a.nr} ${esc(a.titlu)}`).join('<br>')}</div>
      <div class="small">${plural(p.editii.length, 'ediție', 'ediții')} în total: ${p.editii.map(edLink).join(', ')}</div></div></div>`; }).join('')}</div>`;
  } else if (sub === 'parteneri') {
    const part = editionPartners(D, e);
    body = `<div class="tbl"><table><thead><tr><th>Organizație</th><th>Rol în ediție</th><th>Ateliere</th><th>Alte roluri în program</th></tr></thead><tbody>
      ${part.map(({ o, roluri }) => { const at = [...new Set(roluri.filter((r) => r.atelier && r.rol === 'sponsor atelier').map((r) => r.atelier))]; return `<tr>
        <td>${partnerLogo(o.id)} <b>${orgLink(o.id)}</b><div class="small muted">${esc(o.tip)}</div></td>
        <td>${[...new Set(roluri.map((r) => r.rol))].map((r) => tags(r, r === 'sponsor atelier' ? 'grey' : r === 'gazdă' ? 'warn' : '')).join('')}</td>
        <td class="small">${at.map((n) => { const a = e.ateliere.find((w) => w.nr === n); return `#${n} ${esc(a?.titlu || '')}`; }).join('<br>')}</td>
        <td class="small">${orgTags({ tipuri: o.tipuri.filter((t) => !roluri.some((r) => (ROL_TIP_UI[r.rol] || 'partener') === t)) })}</td></tr>`; }).join('')}
      </tbody></table></div>
      ${e.ateliere.some((a) => a.cauta_sponsor) ? `<p class="muted small" style="margin-top:10px">Ateliere care încă caută sponsor: ${e.ateliere.filter((a) => a.cauta_sponsor).map((a) => `#${a.nr} ${esc(a.titlu)}`).join(' · ')}</p>` : ''}`;
  }
  return `
    <div class="head"><div>
      <div class="crumb"><a href="/manage/entitati/editii">← Ediții</a> · entități › ediții › ${esc(edLabel(e))}</div>
      <h1><span class="cat-ico">${icon('editii')}</span>Antreprenoria ${esc(edLabel(e))} <span class="muted" style="font-weight:400;font-size:15px">${esc(e.perioada)}</span></h1></div>
      ${prev ? `<a class="btn" href="/manage/entitati/editii/${prev.id}/${sub}">← ${esc(edLabel(prev))}</a>` : ''}${next ? `<a class="btn" href="/manage/entitati/editii/${next.id}/${sub}">${esc(edLabel(next))} →</a>` : ''}
      <a class="btn" href="${esc(e.url)}" target="_blank" rel="noopener">↗ pagina ediției</a>
    </div>
    <nav class="subtabs">${ED_SUBS.map(([id, t]) => `<a href="/manage/entitati/editii/${e.id}/${id}" class="${id === sub ? 'on' : ''}">${t}${counts[id] != null ? `<span>${counts[id]}</span>` : ''}</a>`).join('')}</nav>
    ${body}`;
}
function workshopHtml(a) {
  const t = a.tema && IX.T[a.tema];
  return `<div class="ws ${fmtClass(a.format)}" data-s>
    <div class="ws-nr">${a.nr}</div>
    <div>
      <h3>${esc(a.titlu)}</h3>
      <div class="ws-meta"><span>${a.data ? fmtDay(a.data) : '<i>fără dată</i>'}</span><span>${a.loc && IX.L[a.loc] ? `<a href="${orgHref(IX.L[a.loc].organizatie)}">${esc(a.locatie)}</a>` : esc(a.locatie || '—')}</span><span class="tag ${a.format === 'full-day' ? '' : 'grey'}">${esc(a.format)}</span>
        ${t ? `<a href="/manage/entitati/teme/${a.format === 'seară' ? 'seara' : a.format}">temă: ${esc(t.nume)}</a>` : '<span class="tag warn">fără temă</span>'}
        ${a.sponsor ? `<span>sponsor: <a href="${orgHref(a.sponsor)}">${partnerLogo(a.sponsor) || esc(partnerName(a.sponsor))}</a></span>` : a.cauta_sponsor ? '<span class="tag grey">caută sponsor</span>' : ''}</div>
      ${a.descriere ? `<p class="ws-desc">${esc(a.descriere)}</p>` : ''}
      ${a.program.length ? `<div class="slots">${a.program.map((p) => `<div class="slot"><time>${esc(p.interval)}</time><div>${esc(p.activitate || '')} ${p.speakeri.map((s) => personChip(s.persoana, IX.O[s.organizatie]?.nume || s.companie)).join('')}</div></div>`).join('')}</div>` : ''}
    </div></div>`;
}
function editionTimeline(e) {
  const dated = e.ateliere.filter((a) => a.data);
  if (!dated.length) return '<p>Atelierele nu au date pe pagină.</p>';
  const inYear = dated.filter((a) => Number(a.data.slice(0, 4)) === e.an);
  const ts = inYear.map((a) => +new Date(a.data));
  const min = Math.min(...ts), max = Math.max(...ts), span = Math.max(max - min, 1);
  return `<div class="tl-track" style="margin:8px 6px 4px">${dated.map((a) => {
    const bad = Number(a.data.slice(0, 4)) !== e.an;
    const x = bad ? 0 : ((+new Date(a.data) - min) / span) * 100;
    return `<span class="tl-dot ${fmtClass(a.format)} ${bad ? 'bad' : ''}" style="left:${x}%" title="#${a.nr} ${esc(a.titlu)} · ${fmtDay(a.data)}${bad ? ' · an greșit pe site' : ''}"></span>`;
  }).join('')}</div><div class="small muted" style="display:flex;justify-content:space-between"><span>${fmtDay(new Date(min).toISOString().slice(0, 10))}</span><span>${fmtDay(new Date(max).toISOString().slice(0, 10))}</span></div>`;
}
function median(arr) {
  const a = arr.filter((x) => x != null).sort((x, y) => x - y);
  if (!a.length) return null;
  return a.length % 2 ? a[(a.length - 1) / 2] : Math.round((a[a.length / 2 - 1] + a[a.length / 2]) / 2);
}

/* ---------- OAMENI ---------- */
function speakersList(list, g) {
  const sorted = list.slice().sort((a, b) => b.editii.length - a.editii.length || a.nume.localeCompare(b.nume));
  return `<div class="pgrid">${sorted.map((p) => `<div class="pcard" data-s>
    ${p.imagine ? `<img src="${esc(p.imagine)}" alt="" loading="lazy">` : `<span class="avatar">${esc(initials(p.nume))}</span>`}
    <div><b><a href="/manage/entitati/oameni/p/${p.id}">${esc(p.nume)}</a></b>
      <div class="small muted">${esc(p.companii.join(' / '))}</div>
      <div class="small">${plural(p.editii.length, 'ediție', 'ediții')}: ${p.editii.map(edLink).join(', ')}</div>
      <div class="small muted">${[...new Set(p.aparitii.map((a) => a.tema && IX.T[a.tema]?.nume).filter(Boolean))].join(' · ')}</div>
    </div></div>`).join('')}</div>`;
}
function participantsRegistry(list) {
  return `<div class="tbl"><table><thead><tr><th>Participant</th><th>Companie</th><th>Ediții</th></tr></thead><tbody>
    ${list.slice().sort((a, b) => a.nume.localeCompare(b.nume)).map((p) => `<tr data-s><td>${personChip(p.id)}</td><td class="small">${esc(p.companii.join(' / ') || '—')}</td><td class="small">${p.editii.map(edLink).join(', ')}</td></tr>`).join('')}
  </tbody></table></div>`;
}
function teamList(D) {
  return `<div class="pgrid">${D.program.contact.echipa.map((m) => { const p = IX.P[m.id]; return `<div class="pcard" data-s>
    ${p?.imagine ? `<img src="${esc(p.imagine)}" alt="">` : `<span class="avatar">${esc(initials(m.nume))}</span>`}
    <div><b><a href="/manage/entitati/oameni/p/${m.id}">${esc(m.nume)}</a></b><div class="small">${esc(m.rol)}</div>
    <div class="small muted">${esc(m.email || '')}${m.telefon ? ' · ' + esc(m.telefon) : ''}</div>${src([SITE + m.sursa])}</div></div>`; }).join('')}</div>`;
}
function personPage(D, id) {
  const p = IX.P[id];
  if (!p) return '<div class="card empty"><b>Persoană inexistentă</b></div>';
  const part = D.editii.flatMap((e) => e.participanti.filter((x) => x.persoana === id).map((x) => ({ e, x })));
  const team = D.program.contact.echipa.find((m) => m.id === id);
  return `
    <div class="head"><div><div class="crumb"><a href="/manage/entitati/oameni">← Oameni</a> · entități › oameni › ${esc(p.nume)}</div>
      <h1>${p.imagine ? `<img src="${esc(p.imagine)}" alt="" style="width:44px;height:44px;border-radius:50%;object-fit:cover">` : `<span class="avatar">${esc(initials(p.nume))}</span>`}${esc(p.nume)}</h1></div></div>
    <div class="grid2"><div class="card"><dl class="kv">
      ${kvRow('Roluri', tags(p.tipuri.map((r) => ROLE_LABEL[r] || r), ''))}
      ${kvRow('Variante de nume pe site', p.variante.length ? tags(p.variante, 'warn') : '')}
      ${kvRow('Organizații', p.organizatii.map(orgLink).join(' · '))}
      ${kvRow('Funcții', esc(p.functii.join(' · ')))}
      ${kvRow('Afilieri afișate pe site', p.companii.length > 1 ? tags(p.companii, 'grey') : '')}
      ${kvRow('Ediții', p.editii.map(edLink).join(', '))}
      ${kvRow('LinkedIn', p.linkedin ? link(p.linkedin, p.linkedin.replace(/^https?:\/\/(www\.)?/, '')) : '')}
      ${kvRow('În echipă', team ? `${esc(team.rol)}<div class="muted small">${esc(team.email || '')}${team.telefon ? ' · ' + esc(team.telefon) : ''}</div>` : '')}
    </dl></div>
    ${part.length ? `<div class="card"><h3>Participări</h3>${part.map(({ e, x }) => `<p>${edLink(e.id)} · ${orgLink(x.organizatie)} ·${lei(x.cifra_afaceri)} · ${x.angajati ?? '—'} angajați</p><p class="small">${esc(x.descriere || '')}</p>`).join('')}</div>` : ''}
    </div>
    ${p.aparitii.length ? `<section style="margin-top:18px"><h2>Apariții în ateliere <span class="n">${p.aparitii.length}</span></h2><div class="tbl"><table><thead><tr><th>Ediție</th><th>#</th><th>Atelier</th><th>Temă</th><th>Rol</th><th>Afiliere afișată</th><th>Data</th></tr></thead><tbody>
      ${p.aparitii.map((a) => `<tr><td>${edLink(a.editie)}</td><td>${a.atelier}</td><td>${esc(a.titlu)}</td><td class="small">${esc(IX.T[a.tema]?.nume || '—')}</td><td>${tags(ROLE_LABEL[a.rol] || a.rol, '')}</td><td class="small">${a.organizatie ? orgLink(a.organizatie) : esc(a.companie || '')}</td><td class="small">${fmtDay(a.data)}</td></tr>`).join('')}
    </tbody></table></div></section>` : ''}`;
}

/* ---------- ORGANIZAȚII ---------- */
const last = (c) => c.participari[c.participari.length - 1];
// rândul cu parcursul pe ediții: o bulină pe fiecare ediție, cu rolurile din ea
function orgJourney(D, o) {
  const eds = edOrder(D);
  return `<div class="journey">${eds.map((e) => {
    const p = o.parcurs.find((x) => x.editie === e.id);
    const tip = p ? [...new Set(p.roluri.map((r) => ROL_TIP_UI[r] || 'partener'))] : [];
    return `<span class="j-step ${p ? 'on' : ''}" title="${esc(edLabel(e))}${p ? ': ' + esc(p.roluri.join(', ')) : ''}">
      <i class="${tip.map((t) => 'j-' + t.replace('ă', 'a')).join(' ')}"></i><small>${esc(edLabel(e))}</small></span>`;
  }).join('')}</div>`;
}
const JOURNEY_LEGEND = `<div class="j-legend small muted">${ORG_TIP.map(([t, l]) => `<span><i class="j-${t.replace('ă', 'a')}"></i>${l}</span>`).join('')}</div>`;
function orgCards(list) {
  const D = store.entitati;
  return `${JOURNEY_LEGEND}<div class="pgrid">${list.slice().sort((a, b) => b.tipuri.length - a.tipuri.length || b.editii.length - a.editii.length).map((o) => `<div class="card" data-s>
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><h3><a href="${orgHref(o.id)}">${esc(o.nume)}</a></h3>${partnerLogo(o.id)}</div>
    <div>${orgTags(o)}</div>
    ${o.ciclu ? `<p><b>Alumni ${esc(edShort(o.ciclu.alumni_din))}</b>, apoi ${esc(o.ciclu.apoi.join(', '))}</p>` : ''}
    ${orgJourney(D, o)}
  </div>`).join('')}</div>`;
}
function alumniTable(D, list) {
  return `<div class="tbl"><table><thead><tr><th>Companie</th><th>Sector</th><th>Ediții</th><th>Participanți</th><th class="num">Cifră de afaceri (ultima)</th><th class="num">Angajați</th></tr></thead><tbody>
    ${list.slice().sort((a, b) => (last(b)?.cifra_afaceri || 0) - (last(a)?.cifra_afaceri || 0)).map((c) => `<tr data-s>
      <td><a href="${orgHref(c.id)}"><b>${esc(c.nume)}</b></a>${c.incert ? ' <span class="tag warn">dedus</span>' : ''}${c.tipuri.length > 1 ? ' <span class="tag">+ roluri</span>' : ''}</td>
      <td class="small">${esc(c.sector || '')}</td>
      <td class="small">${[...new Set(c.participari.map((p) => p.editie))].map(edLink).join(', ')}</td>
      <td>${[...new Set(c.participari.map((p) => p.persoana))].map((id) => personChip(id)).join('')}</td>
      <td class="num">${lei(last(c)?.cifra_afaceri)}</td><td class="num">${last(c)?.angajati ?? '—'}</td></tr>`).join('')}
  </tbody></table></div>`;
}
function partnersList(list) {
  const nonPart = (o) => o.roluri.filter((r) => r.rol !== 'participant' && r.rol !== 'speaker');
  return `<div class="tbl"><table><thead><tr><th>Organizație</th><th>Roluri</th><th>Ediții ca partener</th><th class="num">Ateliere sponsorizate</th></tr></thead><tbody>
    ${list.slice().sort((a, b) => nonPart(b).length - nonPart(a).length).map((o) => `<tr data-s>
      <td>${partnerLogo(o.id)} <a href="${orgHref(o.id)}"><b>${esc(o.nume)}</b></a><div class="small muted">${esc(o.tip)}</div></td>
      <td>${orgTags(o)}</td>
      <td class="small">${[...new Set(nonPart(o).map((r) => r.editie))].map(edLink).join(', ')}</td>
      <td class="num">${o.roluri.filter((r) => r.rol === 'sponsor atelier').length || '—'}</td></tr>`).join('')}
  </tbody></table></div>`;
}
function speakerOrgs(list) {
  return `<div class="tbl"><table><thead><tr><th>Organizație</th><th>Speakeri</th><th>Ediții</th><th>Alte roluri</th></tr></thead><tbody>
    ${list.slice().sort((a, b) => b.roluri.filter((r) => r.rol === 'speaker').length - a.roluri.filter((r) => r.rol === 'speaker').length).map((o) => {
      const sp = o.roluri.filter((r) => r.rol === 'speaker');
      return `<tr data-s><td><a href="${orgHref(o.id)}"><b>${esc(o.nume)}</b></a></td>
        <td>${[...new Set(sp.map((r) => r.persoana))].map((id) => personChip(id)).join('')}</td>
        <td class="small">${[...new Set(sp.map((r) => r.editie))].map(edLink).join(', ')}</td>
        <td>${orgTags({ tipuri: o.tipuri.filter((t) => t !== 'speaker') })}</td></tr>`;
    }).join('')}
  </tbody></table></div>`;
}
function locationsList(D) {
  return `<div class="pgrid">${D.locatii.map((l) => `<div class="card" data-s>
    <h3>${esc(l.nume)}</h3><div class="small muted">${esc(l.oras)} · ${esc(l.tip)}</div>
    <p>Gazdă: ${orgLink(l.organizatie)}</p>
    <p>${plural(l.ateliere.length, 'atelier', 'ateliere')} · ${l.editii.map(edLink).join(', ')}</p>
  </div>`).join('')}</div>`;
}
function orgPage(D, id) {
  const o = IX.O[id];
  if (!o) return '<div class="card empty"><b>Organizație inexistentă</b></div>';
  const atTitle = (r) => { const a = r.atelier && IX.ED[r.editie]?.ateliere.find((w) => w.nr === r.atelier); return a ? `#${a.nr} ${a.titlu}` : ''; };
  const loc = D.locatii.filter((l) => l.organizatie === id);
  return `
    <div class="head"><div><div class="crumb"><a href="/manage/entitati/organizatii">← Organizații</a> · entități › organizații › ${esc(o.nume)}</div>
      <h1><span class="cat-ico">${icon('companii')}</span>${esc(o.nume)} ${partnerLogo(o.id)}</h1></div></div>
    <div class="grid2"><div class="card"><dl class="kv">
      ${kvRow('Roluri în program', orgTags(o))}
      ${kvRow('Tip', esc(o.tip))}
      ${kvRow('Sector', esc(o.sector))}
      ${kvRow('Nume', o.incert ? `${esc(o.nume)} ${tags('dedus din descriere', 'warn')}` : '')}
      ${kvRow('Notă', esc(o.nota))}
      ${kvRow('Site', o.url ? link(o.url, o.url.replace(/^https?:\/\/(www\.)?/, '')) : '')}
      ${kvRow('Locații găzduite', loc.map((l) => `${esc(l.nume)} · ${plural(l.ateliere.length, 'atelier', 'ateliere')}`).join('<br>'))}
      ${kvRow('Oameni', o.oameni.map((pid) => personChip(pid)).join(''))}
      ${kvRow('Descriere (de pe site)', esc(o.descriere))}
    </dl></div>
    <div class="card"><h3>Parcurs pe ediții</h3>${o.ciclu ? `<p><b>Alumni ${esc(edShort(o.ciclu.alumni_din))}</b>, apoi ${esc(o.ciclu.apoi.join(', '))}.</p>` : ''}
      ${orgJourney(D, o)}${JOURNEY_LEGEND}</div></div>
    <section style="margin-top:18px"><h2>Toate rolurile <span class="n">${o.roluri.length}</span></h2><div class="tbl"><table><thead><tr><th>Ediție</th><th>Rol</th><th>Atelier</th><th>Persoană</th><th class="num">Cifră de afaceri</th><th class="num">Angajați</th></tr></thead><tbody>
      ${o.roluri.map((r) => { const p = r.rol === 'participant' && o.participari.find((x) => x.editie === r.editie && x.persoana === r.persoana); return `<tr>
        <td>${edLink(r.editie)}</td><td>${tags(r.rol, r.rol === 'participant' ? 'ok' : r.rol === 'gazdă' ? 'warn' : r.rol === 'speaker' ? 'grey' : '')}</td>
        <td class="small">${esc(atTitle(r))}</td><td>${r.persoana ? personChip(r.persoana) : ''}</td>
        <td class="num">${p ? lei(p.cifra_afaceri) : ''}</td><td class="num">${p ? p.angajati ?? '—' : ''}</td></tr>`; }).join('')}
    </tbody></table></div></section>`;
}

/* ---------- CURRICULUM ---------- */
function curriculumMatrix(D) {
  const eds = edOrder(D);
  return `<div class="tbl"><table class="matrix"><thead><tr><th>Temă</th>${eds.map((e) => `<th>${edLink(e.id)}</th>`).join('')}<th>Total</th></tr></thead><tbody>
    ${D.teme.map((t) => `<tr><td><b>${esc(t.nume)}</b> <span class="muted small">${esc(t.format)}</span></td>${eds.map((e) => { const a = e.ateliere.filter((w) => w.tema === t.id); return `<td>${a.length ? `<span class="mx ${fmtClass(t.format)}" title="${esc(a.map((w) => `#${w.nr} ${w.titlu}`).join(' · '))}"></span>` : ''}</td>`; }).join('')}<td class="num">${t.ateliere}</td></tr>`).join('')}
    <tr class="row-group"><td>Ateliere pe ediție</td>${eds.map((e) => `<td>${e.ateliere.length}</td>`).join('')}<td class="num">${eds.reduce((n, e) => n + e.ateliere.length, 0)}</td></tr>
  </tbody></table></div><p class="muted small" style="margin-top:8px">Pătrat albastru = full-day, bleumarin = seară, galben = networking. Treci cu mouse-ul peste pătrat pentru titlul atelierului.</p>`;
}
function themesList(D, list) {
  return list.map((t) => {
    const ws = D.editii.flatMap((e) => e.ateliere.filter((a) => a.tema === t.id).map((a) => ({ e, a })));
    const ppl = {};
    ws.forEach(({ a }) => a.program.forEach((p) => p.speakeri.forEach((s) => (ppl[s.persoana] = (ppl[s.persoana] || 0) + 1))));
    return `<details class="item" data-s><summary><span class="name">${esc(t.nume)}</span><span class="tag">${plural(t.ateliere, 'atelier', 'ateliere')} · ${plural(t.editii.length, 'ediție', 'ediții')}</span></summary>
      <div class="item-body">
        ${t.nota ? `<p class="small">${esc(t.nota)}</p>` : ''}
        <h4>Titluri folosite pe site</h4>${tags(t.titluri, 'grey wrap')}
        <h4>Oameni care au susținut tema</h4>${Object.entries(ppl).sort((a, b) => b[1] - a[1]).map(([id, n]) => personChip(id, n > 1 ? `${n}×` : '')).join('')}
        <h4>Ateliere</h4><ul class="clean small">${ws.map(({ e, a }) => `<li>${edLink(e.id)} #${a.nr} · ${esc(a.titlu)} · ${fmtDay(a.data)}</li>`).join('')}</ul>
      </div></details>`;
  }).join('');
}

/* ---------- AUDIT ---------- */
const obsUI = { nivel: '', zona: '' };
function obsHtml(D) {
  const zone = [...new Set(D.observatii.map((o) => o.zona))];
  const list = D.observatii.filter((o) => (!obsUI.nivel || o.nivel === obsUI.nivel) && (!obsUI.zona || o.zona === obsUI.zona))
    .sort((a, b) => LVL.indexOf(a.nivel) - LVL.indexOf(b.nivel));
  return `<div class="obs-bar">
      <button class="sm ${!obsUI.nivel ? 'on' : ''}" data-obs-nivel="">Toate · ${D.observatii.length}</button>
      ${LVL.map((n) => `<button class="sm ${obsUI.nivel === n ? 'on' : ''}" data-obs-nivel="${n}">${n} · ${D.observatii.filter((o) => o.nivel === n).length}</button>`).join('')}
      <span class="grow"></span>
      <button class="sm ${!obsUI.zona ? 'on' : ''}" data-obs-zona="">Toate zonele</button>
      ${zone.map((z) => `<button class="sm ${obsUI.zona === z ? 'on' : ''}" data-obs-zona="${esc(z)}">${esc(z)}</button>`).join('')}
    </div>
    <div class="card" style="padding:0">${list.map((o) => `<div class="obs" data-s><span class="lvl ${o.nivel}">${o.nivel}</span><div class="obs-main">${esc(o.text)}
      <div class="obs-check">${esc(o.zona)}${o.editie ? ` · ${edLink(o.editie)}` : ''}${o.persoana ? ` · <a href="/manage/entitati/oameni/p/${o.persoana}">persoana</a>` : ''}${o.url ? ` · ${link(o.url)}` : ''}</div></div></div>`).join('') || '<div class="empty">Nicio observație pentru filtrul ales.</div>'}</div>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-obs-nivel], [data-obs-zona]');
  if (!b) return;
  if (b.dataset.obsNivel !== undefined) obsUI.nivel = b.dataset.obsNivel;
  if (b.dataset.obsZona !== undefined) obsUI.zona = b.dataset.obsZona;
  routes.entitati();
});

/* ---------- căutare ---------- */
function searchIndex(D) {
  return [
    ...D.editii.map((e) => ({ t: 'Ediție', n: `Antreprenoria ${edLabel(e)}`, d: e.perioada, u: `/manage/entitati/editii/${e.id}` })),
    ...D.editii.flatMap((e) => e.ateliere.map((a) => ({ t: 'Atelier', n: a.titlu, d: `${edLabel(e)} · #${a.nr} · ${a.data ? fmtDay(a.data) : ''}`, u: `/manage/entitati/editii/${e.id}/ateliere` }))),
    ...D.oameni.map((p) => ({ t: ROLE_LABEL[p.tipuri[0]] || 'Persoană', n: p.nume, d: `${p.companii.join(' / ')} · ${p.editii.map(edShort).join(', ')}`, x: p.variante.join(' '), u: `/manage/entitati/oameni/p/${p.id}` })),
    ...D.organizatii.map((o) => ({ t: 'Organizație', n: o.nume, d: `${ORG_TIP.filter(([t]) => o.tipuri.includes(t)).map(([, l]) => l).join(', ')} · ${o.sector || o.tip} · ${o.editii.map(edShort).join(', ')}`, x: o.descriere, u: orgHref(o.id) })),
    ...D.locatii.map((l) => ({ t: 'Locație', n: l.nume, d: `${l.oras} · ${l.editii.map(edShort).join(', ')}`, u: orgHref(l.organizatie) })),
    ...D.teme.map((t) => ({ t: 'Temă', n: t.nume, d: t.titluri.join(' · '), u: `/manage/entitati/teme/${t.format === 'seară' ? 'seara' : t.format}` })),
  ];
}
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function searchAll(D, q) {
  const box = $('#results'), cats = $('#cats');
  cats.classList.toggle('hidden', !!q);
  box.classList.toggle('hidden', !q);
  if (!q) return;
  const nq = norm(q);
  const hits = searchIndex(D).filter((h) => norm(`${h.n} ${h.d} ${h.x || ''}`).includes(nq)).slice(0, 80);
  box.innerHTML = hits.length ? `<div class="tbl"><table><tbody>${hits.map((h) => `<tr><td style="width:150px">${tags(h.t, h.t === 'Ediție' ? '' : 'grey')}</td><td><a href="${h.u}"><b>${esc(h.n)}</b></a><div class="small muted">${esc(cut(h.d, 140))}</div></td></tr>`).join('')}</tbody></table></div>`
    : '<div class="card empty"><b>Niciun rezultat</b>Încearcă alt termen.</div>';
}
function filterIn(box, q) {
  const nq = norm(q);
  $$('[data-s]', box).forEach((el) => (el.hidden = !!nq && !norm(el.textContent).includes(nq)));
}

/* ---------- randare ---------- */
routes.entitati = function renderEntitati() {
  const D = store.entitati;
  if (!D) { $('#view').innerHTML = '<div class="card empty"><b>Lipsește data/entitati.json</b>Rulează <code>npm run sync</code>.</div>'; return; }
  const CATS = entityCategories(D);
  const [catId, grpId, sub] = location.pathname.replace(/^\/manage\/entitati\/?/, '').split('/');
  const cat = CATS.find((c) => c.id === catId);
  const G = (c, g) => groupInfo(D, c.id, g);
  const total = (c) => (c.audit ? 0 : c.id === 'editii' ? c.groups.length : c.id === 'oameni' ? D.oameni.length : c.id === 'organizatii' ? D.organizatii.length : c.groups.reduce((n, g) => n + (G(c, g)?.count || 0), 0));

  // pagini de detaliu
  if (cat?.id === 'oameni' && grpId === 'p') { $('#view').innerHTML = personPage(D, sub); return; }
  if (cat?.id === 'organizatii' && grpId === 'o') { $('#view').innerHTML = orgPage(D, sub); return; }
  if (cat?.id === 'editii' && IX.ED[grpId]) { $('#view').innerHTML = editionPage(D, IX.ED[grpId], ED_SUBS.some(([s]) => s === sub) ? sub : 'program'); return; }

  if (!cat) {
    $('#view').innerHTML = `
      <div class="head">
        <div><div class="crumb">manage › entități · sursa: ${link(D.meta.sursa, 'antreprenoria.ro')} (${esc(D.meta.extras_la)}) · ${D.meta.pagini} pagini citite</div><h1>Entitățile Antreprenoria</h1></div>
        <input type="search" id="q" placeholder="Caută oameni, organizații, ateliere…" aria-label="Caută în entități">
        <button id="exp">Export JSON</button>
      </div>
      <div class="cats" id="cats">${CATS.map((c) => `
        <a class="cat ${c.audit ? 'audit' : ''}" href="/manage/entitati/${c.id}">
          <div class="cat-top"><span class="cat-ico">${icon(c.icon)}</span>${c.audit ? `<span class="tag bad">${D.observatii.filter((o) => o.nivel === 'critic').length} critice</span>` : `<span class="cat-total">${total(c)}</span>`}</div>
          <h3>${esc(c.title)}</h3>
          <p>${esc(c.desc)}</p>
          <div class="cat-subs">${c.groups.map((g) => { const x = G(c, g); return `<span>${esc(c.id === 'editii' ? edLabel(IX.ED[g]) : x.title)}${x.count != null && c.id !== 'editii' ? ` <b>${x.count}</b>` : ''}</span>`; }).join('')}</div>
          <span class="cat-open">Deschide →</span>
        </a>`).join('')}
      </div>
      <div id="results" class="hidden"></div>`;
    $('#exp').onclick = () => download('antreprenoria-entitati.json', JSON.stringify(D, null, 2), 'application/json');
    $('#q').addEventListener('input', (e) => searchAll(D, e.target.value.trim()));
    return;
  }

  const pills = `<div class="pills">${CATS.map((c) => `<a href="/manage/entitati/${c.id}" class="${c.id === cat.id ? 'on' : ''}">${esc(c.title)}${total(c) ? ` · ${total(c)}` : ''}</a>`).join('')}</div>`;
  const grp = cat.groups.includes(grpId) ? grpId : cat.groups.length === 1 ? cat.groups[0] : null;

  if (!grp) {
    $('#view').innerHTML = `
      <div class="head"><div>
        <div class="crumb"><a href="/manage/entitati">← Toate categoriile</a> · manage › entități › ${esc(cat.title)}</div>
        <h1><span class="cat-ico">${icon(cat.icon)}</span>${esc(cat.title)}</h1></div></div>
      <p class="lead">${esc(cat.desc)}</p>
      ${pills}
      ${cat.id === 'editii' ? editionCards(D) : `<div class="cats">${cat.groups.map((g) => { const x = G(cat, g); return `
        <a class="cat" href="/manage/entitati/${cat.id}/${g}">
          <div class="cat-top"><span class="cat-ico">${icon(cat.icon)}</span>${x.count != null ? `<span class="cat-total">${x.count}</span>` : ''}</div>
          <h3>${esc(x.title)}</h3><p>${esc(cut(x.desc, 220))}</p><span class="cat-open">Deschide →</span>
        </a>`; }).join('')}</div>`}`;
    return;
  }

  const x = G(cat, grp);
  const multi = cat.groups.length > 1;
  $('#view').innerHTML = `
    <div class="head"><div>
      <div class="crumb">${multi ? `<a href="/manage/entitati/${cat.id}">← ${esc(cat.title)}</a> · <a href="/manage/entitati">entități</a> › ${esc(cat.title)} › ${esc(x.title)}` : `<a href="/manage/entitati">← Toate categoriile</a> · entități › ${esc(cat.title)}`}</div>
      <h1><span class="cat-ico">${icon(cat.icon)}</span>${esc(x.title)}${x.count != null ? ` <span class="muted" style="font-weight:400;font-size:16px">${x.count}</span>` : ''}</h1></div>
      <input type="search" id="qg" placeholder="Filtrează…" aria-label="Filtrează">
    </div>
    <p class="lead">${esc(x.desc)}</p>
    ${multi ? `<div class="pills">${cat.groups.map((g) => { const y = G(cat, g); return `<a href="/manage/entitati/${cat.id}/${g}" class="${g === grp ? 'on' : ''}">${esc(y.title)}${y.count != null ? ` · ${y.count}` : ''}</a>`; }).join('')}</div>` : ''}
    <section id="grp">${x.html()}</section>`;
  $('#qg').addEventListener('input', (e) => filterIn($('#grp'), e.target.value.trim()));
};
