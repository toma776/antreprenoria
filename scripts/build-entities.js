// Construiește data/entitati.json din extracția brută (data/extract/editii-brut.json) + curarea manuală (data/curare/*.json).
// Model: registre globale (oameni, organizații, locații, teme) + ediții care fac referire la ele prin id.
// Organizațiile sunt un singur registru: aceeași firmă poate fi alumni, partener, sponsor, gazdă și angajatorul unui speaker.
const fs = require('fs');
const path = require('path');
const { ORIGIN, SOURCE, text, slug, readJson, writeJson, today } = require('./lib');

const brut = readJson('extract/editii-brut.json');
const curOameni = readJson('curare/oameni.json');
const curCompanii = readJson('curare/companii.json');
const curParteneri = readJson('curare/parteneri.json');
const curTeme = readJson('curare/teme.json');
const curOrg = readJson('curare/organizatii.json');
const curCorectii = readJson('curare/corectii.json') || { date_ateliere: [] };
if (!brut) throw new Error('Rulează întâi: npm run extract');

const plain = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const observatii = [];
const obs = (nivel, zona, text, extra = {}) => observatii.push({ id: `o${observatii.length + 1}`, nivel, zona, text, ...extra });
const addTo = (arr, v) => { if (v && !arr.includes(v)) arr.push(v); };

// ---------- ediții: identitate ----------
function editionId(e) {
  const m = e.slug.match(/^antreprenoria-(\d+)$/);
  return m ? { id: `bucuresti-${m[1]}`, serie: 'București', numar: Number(m[1]), cheie: m[1] } : { id: 'cluj-1', serie: 'Cluj', numar: 1, cheie: 'cluj' };
}
function period(p) {
  const m = String(p || '').match(/([A-Za-zăâîșț]+)\s*-\s*([A-Za-zăâîșț]+)\s+(\d{4})/);
  if (!m) return { an: null, sezon: null };
  return { an: Number(m[3]), sezon: /^mar/i.test(m[1]) ? 'primăvară' : 'toamnă' };
}

// ---------- teme ----------
const teme = curTeme.teme.map((t) => ({ id: t.id, nume: t.nume, format: t.format, nota: t.nota || null, titluri: [], editii: [], ateliere: 0 }));
const temaById = Object.fromEntries(teme.map((t) => [t.id, t]));
const temaFor = (titlu) => curTeme.teme.find((t) => t.potriviri.some((re) => new RegExp(re).test(plain(titlu))))?.id || null;

// ---------- organizații ----------
const orgs = new Map();
function org(id, nume) {
  if (!orgs.has(id)) orgs.set(id, { id, nume, tip: 'companie', sector: null, url: null, logo: null, descriere: null, incert: false, nota: null, roluri: [], participari: [], oameni: [] });
  return orgs.get(id);
}
const roleKey = (r) => `${r.editie}|${r.rol}|${r.atelier ?? ''}|${r.persoana ?? ''}`;
function addRole(o, rol) {
  if (!o.roluri.some((r) => roleKey(r) === roleKey(rol))) o.roluri.push(rol);
}
// partenerii (parteneri.json), recunoscuți după domeniul linkului sau numele logo-ului
curParteneri.parteneri.forEach((p) => Object.assign(org(p.id, p.nume), { tip: p.tip, url: p.url }));
function partnerFor(url, logo) {
  const hay = plain(`${url || ''} ${String(logo || '').split('/').pop()}`);
  const p = curParteneri.parteneri.find((x) => x.potriviri.some((k) => hay.includes(plain(k))));
  return p ? orgs.get(p.id) : null;
}
const heroRole = (label) => (!label ? 'partener ediție' : /powered/i.test(label) ? 'powered by' : /strategic/i.test(label) ? 'partener strategic' : label);
// companiile participanților (companii.json); cele care sunt și parteneri se unesc cu partenerul (organizatii.json › uneste)
const compByKey = {};
curCompanii.companii.forEach((c) => {
  const o = org(curOrg.uneste[c.nume] || slug(c.nume), c.nume);
  Object.assign(o, { sector: c.sector, incert: !!c.incert, nota: c.nota || null });
  c.participanti.forEach((k) => (compByKey[k] = o));
});
// afilierile speakerilor: textul de pe site -> organizație (sau null pentru titluri ca „Trainer”)
const affKey = (c) => plain(c).replace(/[^a-z0-9]/g, '');
const AFIL = Object.fromEntries(Object.entries(curOrg.afilieri).filter(([k]) => k !== '_despre').map(([k, v]) => [affKey(k), v]));
function orgForAffiliation(afisat) {
  const a = AFIL[affKey(afisat)];
  if (!a) return { org: null, functie: null, necunoscut: true };
  if (!a.org) return { org: null, functie: a.functie || null };
  return { org: orgs.get(a.org) || org(slug(a.org), a.org), functie: a.functie || null };
}
// locațiile atelierelor; organizația-gazdă primește tipul locației dacă nu e deja partener sau companie participantă
const locatii = curOrg.locatii.map((l) => {
  const known = orgs.has(l.organizatie);
  const o = orgs.get(l.organizatie) || org(slug(l.organizatie), l.organizatie);
  if (!known) o.tip = l.tip;
  return { id: l.id, nume: l.nume, oras: l.oras, tip: l.tip, organizatie: o.id, ateliere: [], editii: [] };
});
const locFor = (t) => { const i = curOrg.locatii.findIndex((l) => l.potriviri.some((k) => plain(t).includes(k))); return i < 0 ? null : locatii[i]; };

// ---------- oameni ----------
const oameni = new Map();
const personId = (nume) => { const s = slug(nume); return curOameni.aliasuri[s] || s; };
function person(id, nume) {
  if (!oameni.has(id)) oameni.set(id, { id, nume: curOameni.nume_corect[id] || nume, variante: [], tipuri: [], imagine: null, linkedin: null, companii: [], organizatii: [], functii: [], aparitii: [], editii: [] });
  const p = oameni.get(id);
  if (nume && nume !== p.nume && !p.variante.includes(nume)) p.variante.push(nume);
  return p;
}
const rolFromActivity = (a, format) => (/^training/i.test(a) ? 'trainer' : /prezentare/i.test(a) ? 'antreprenor invitat' : format === 'seară' ? 'facilitator' : 'invitat');

// ---------- ediții ----------
const editii = brut.editii.map((e) => {
  const idn = editionId(e);
  const per = period(e.perioada);
  const ed = { ...idn, slug: e.slug, url: e.url, titlu: e.titlu, subtitlu: e.subtitlu, perioada: e.perioada, ...per, status: e.status,
    deschisa: /deschise/i.test(e.status || ''), link_inscriere: e.link_inscriere, beneficii: e.beneficii, valoare_estimata: e.valoare_estimata,
    preturi: e.preturi, metodologie: e.metodologie, participanti_titlu: e.participanti_titlu, locatii: [], ateliere: [], participanti: [], parteneri: [] };

  // parteneri din hero
  e.parteneri_hero.logo.forEach((logo) => {
    const p = partnerFor(null, logo);
    if (!p) return obs('minor', 'Date', `Logo de partener nerecunoscut în hero-ul ${ed.id}: ${logo}`, { editie: ed.id });
    p.logo ||= logo;
    const rol = heroRole(e.parteneri_hero.eticheta);
    addRole(p, { editie: ed.id, rol });
    ed.parteneri.push({ organizatie: p.id, rol });
  });

  // ateliere
  e.ateliere.forEach((a) => {
    const tema = temaFor(a.titlu);
    const format = tema ? temaById[tema].format : 'full-day';
    if (!tema) obs('minor', 'Date', `Atelier fără temă din curriculum: „${a.titlu}” (${ed.id})`, { editie: ed.id });
    let sponsor = null;
    if (a.sponsor) {
      const p = partnerFor(a.sponsor.url, a.sponsor.logo);
      if (p) {
        p.logo = a.sponsor.logo || p.logo; // logo-urile de sponsor stau pe fundal alb; cele din hero pot fi variante albe
        sponsor = p.id;
        addRole(p, { editie: ed.id, rol: 'sponsor atelier', atelier: a.nr });
        if (!ed.parteneri.some((x) => x.organizatie === p.id && x.rol === 'sponsor atelier')) ed.parteneri.push({ organizatie: p.id, rol: 'sponsor atelier' });
        // link și logo care arată spre parteneri diferiți
        const byUrl = partnerFor(a.sponsor.url, null), byLogo = partnerFor(null, a.sponsor.logo);
        if (byUrl && byLogo && byUrl.id !== byLogo.id) obs('mediu', 'Conținut', `${ed.id}, atelierul ${a.nr}: logo-ul sponsorului (${byLogo.nume}) duce spre site-ul altui partener (${a.sponsor.url}).`, { editie: ed.id, url: e.url });
        if (!a.sponsor.url) obs('minor', 'Conținut', `${ed.id}, atelierul ${a.nr}: logo-ul sponsorului ${p.nume} nu are link.`, { editie: ed.id, url: e.url });
      } else obs('minor', 'Date', `Sponsor nerecunoscut: ${a.sponsor.url || a.sponsor.logo} (${ed.id} #${a.nr})`, { editie: ed.id });
    }
    addTo(ed.locatii, a.locatie);
    const loc = a.locatie ? locFor(a.locatie) : null;
    if (loc) {
      loc.ateliere.push({ editie: ed.id, atelier: a.nr });
      addTo(loc.editii, ed.id);
      addRole(orgs.get(loc.organizatie), { editie: ed.id, rol: 'gazdă' });
    }
    const program = a.program.map((p) => ({
      interval: p.interval, activitate: p.activitate || null,
      speakeri: p.speakeri.filter((s) => !curOameni.ignora.includes(slug(s.nume))).map((s) => {
        const id = personId(s.nume), pers = person(id, s.nume), rol = rolFromActivity(p.activitate, format);
        addTo(pers.tipuri, rol);
        pers.imagine = s.imagine || pers.imagine; // ultima fotografie folosită pe site
        pers.linkedin ||= s.linkedin;
        addTo(pers.companii, s.companie && s.companie !== 'Trainer' ? s.companie.trim() : null);
        addTo(pers.editii, ed.id);
        // organizația speakerului: din afilierea afișată sau, dacă lipsește, din curare
        const af = s.companie ? orgForAffiliation(s.companie) : { org: orgs.get(curOrg.afiliere_lipsa[`${ed.id}#${a.nr}:${id}`]) || null };
        if (af.necunoscut) obs('minor', 'Date', `Afiliere fără curare: „${s.companie}” (${pers.nume}, ${ed.id} #${a.nr}); adaug-o în data/curare/organizatii.json.`, { editie: ed.id, persoana: id });
        if (af.org) {
          addRole(af.org, { editie: ed.id, rol: 'speaker', atelier: a.nr, persoana: id });
          addTo(af.org.oameni, id);
          addTo(pers.organizatii, af.org.id);
        }
        addTo(pers.functii, af.functie);
        pers.aparitii.push({ editie: ed.id, atelier: a.nr, tema, titlu: a.titlu, rol, companie: s.companie || null, organizatie: af.org?.id || null, data: a.data });
        return { persoana: id, rol, companie: s.companie || null, organizatie: af.org?.id || null };
      }),
    }));
    const placeholders = a.program.flatMap((p) => p.speakeri).filter((s) => curOameni.ignora.includes(slug(s.nume)));
    if (placeholders.length) obs('mediu', 'Conținut', `${ed.id}, atelierul ${a.nr} („${a.titlu}”): speaker necompletat („${placeholders.map((s) => s.nume).join('”, „')}”).`, { editie: ed.id, url: e.url });
    if (tema) { const t = temaById[tema]; t.ateliere++; addTo(t.titluri, a.titlu); addTo(t.editii, ed.id); }
    ed.ateliere.push({ id: `${ed.id}-a${a.nr}`, nr: a.nr, data: a.data, data_text: a.data_text, locatie: a.locatie, loc: loc?.id || null, titlu: a.titlu, tema, format,
      descriere: a.descriere, sponsor, cauta_sponsor: !!a.cauta_sponsor, program });
  });

  // participanți
  e.participanti.forEach((p) => {
    const key = `${idn.cheie}:${p.nume}`;
    const c = compByKey[key];
    const id = personId(p.nume), pers = person(id, p.nume);
    addTo(pers.tipuri, 'participant');
    pers.imagine ||= p.imagine;
    addTo(pers.editii, ed.id);
    if (c) {
      addTo(pers.companii, c.nume);
      addTo(pers.organizatii, c.id);
      addTo(c.oameni, id);
      // dintre descrierile participanților, cea mai scurtă e de obicei doar despre firmă, fără bio-ul persoanei
      if (p.descriere && (!c.descriere || p.descriere.length < c.descriere.length)) c.descriere = p.descriere;
      c.participari.push({ editie: ed.id, persoana: id, cifra_afaceri: p.cifra_afaceri, angajati: p.angajati });
      addRole(c, { editie: ed.id, rol: 'participant', persoana: id });
    } else if (!curCompanii.fara_companie.participanti.includes(key)) {
      obs('minor', 'Date', `Participant fără companie în curare: ${key}`, { editie: ed.id });
    }
    ed.participanti.push({ persoana: id, nume: p.nume, organizatie: c?.id || null, cifra_afaceri: p.cifra_afaceri, angajati: p.angajati, descriere: p.descriere, imagine: p.imagine });
  });

  // ---- inconsecvențe pe ediție ----
  const an = per.an;
  ed.ateliere.filter((a) => a.data && an && Number(a.data.slice(0, 4)) !== an)
    .forEach((a) => obs('critic', 'Conținut', `${ed.id}, atelierul ${a.nr} („${a.titlu}”): data „${a.data_text}” nu e în anul ediției (${an}).`, { editie: ed.id, url: e.url }));
  // corecturile confirmate (data/curare/corectii.json) se aplică după ce observația a notat greșeala de pe sursă
  curCorectii.date_ateliere.filter((c) => c.editie === ed.id).forEach((c) => {
    const a = ed.ateliere.find((x) => x.nr === c.atelier);
    if (a) Object.assign(a, { data: c.data, data_text: c.data_text, corectat: c.nota });
  });
  const nedatate = ed.ateliere.filter((a) => !a.data).length;
  if (nedatate) obs(nedatate === ed.ateliere.length ? 'mediu' : 'minor', 'Conținut', `${ed.id}: ${nedatate} din ${ed.ateliere.length} ateliere nu au dată pe pagină.`, { editie: ed.id, url: e.url });
  const numeric = (re) => Number((e.beneficii.find((b) => re.test(b)) || '').match(/\d+/)?.[0]) || null;
  const colegi = numeric(/colegi/);
  if (colegi && e.participanti.length && colegi !== e.participanti.length) obs('mediu', 'Conținut', `${ed.id}: „${colegi} de colegi antreprenori” în beneficii, dar pagina listează ${e.participanti.length} participanți.`, { editie: ed.id, url: e.url });
  const fullDay = numeric(/full day/), seara = numeric(/de seară/);
  const realFull = ed.ateliere.filter((a) => a.format === 'full-day').length;
  const realSeara = ed.ateliere.filter((a) => a.format === 'seară' && a.tema !== 'mastermind').length;
  if (fullDay && fullDay !== realFull) obs('mediu', 'Conținut', `${ed.id}: beneficiile anunță ${fullDay} ateliere full-day, agenda are ${realFull}.`, { editie: ed.id, url: e.url });
  if (seara && seara !== realSeara) obs('minor', 'Conținut', `${ed.id}: beneficiile anunță ${seara} ateliere de seară, agenda are ${realSeara} (fără mastermind).`, { editie: ed.id, url: e.url });
  if (ed.deschisa) {
    const start = ed.ateliere.map((a) => a.data).filter((d) => d && Number(d.slice(0, 4)) === an).sort()[0];
    if (start && start < today()) obs('critic', 'Conversie', `${ed.id} apare cu „${e.status}”, dar primul atelier a avut loc pe ${start}.`, { editie: ed.id, url: e.url });
    e.preturi.filter((p) => !p.ascuns).forEach((p) => {
      const m = (p.nota || '').match(/(\d{1,2})\s+([a-zăâîșț]+)\s+(\d{4})/i);
      if (m && p.eticheta) obs('critic', 'Conversie', `${ed.id}: prețul „${p.pret_text}” e afișat cu „${p.eticheta}” și termen „${p.nota}”, deși termenul a trecut.`, { editie: ed.id, url: e.url });
    });
    const vizibile = e.preturi.filter((p) => !p.ascuns);
    if (vizibile.length && vizibile.every((p) => !/standard/i.test(p.nota || '')) && ed.serie === 'București') obs('mediu', 'Conversie', `${ed.id}: e afișat doar prețul early-bird; prețul standard nu apare pe pagină.`, { editie: ed.id, url: e.url });
  }
  if (!e.participanti.length && !ed.deschisa) obs('minor', 'Date', `${ed.id}: pagina nu listează participanții.`, { editie: ed.id });
  return ed;
});

// RBL organizează fiecare ediție („Proiect creat în cadrul Fundației Romanian Business Leaders”)
editii.forEach((e) => addRole(orgs.get('rbl'), { editie: e.id, rol: 'organizator' }));

// ---------- program (Antreprenoria + RBL) ----------
const despre = fs.existsSync(path.join(SOURCE, 'despre-noi.html')) ? fs.readFileSync(path.join(SOURCE, 'despre-noi.html'), 'utf8') : '';
const despreTxt = text(despre);
const grab = (re) => (despreTxt.match(re) || [])[1]?.trim() || null;
const ed22 = editii.find((e) => e.id === 'bucuresti-22') || editii[editii.length - 1];
const program = {
  nume: 'Atelierele Antreprenoria',
  slogan: 'cresc antreprenorii, crește România!',
  url: ORIGIN,
  organizator: { nume: 'Fundația Romanian Business Leaders', url: 'https://www.rbls.ro/', descriere: grab(/(Fundația Romanian Business Leaders este o organizație[^]*?Uniunii Europene\.)/) },
  descriere: grab(/(Atelierele de Antreprenoriat reprezintă[^]*?propria rețetă de scalare\.)/),
  de_cand: 2013,
  audienta: grab(/Audiența noastră (companii cu cifră[^]*?semnificativă\.)/),
  ce_obtii: [grab(/Ce obții\? (Acces direct[^]*?afacerii tale\.)/), grab(/(Înțelegerea aprofundată[^]*?constante\.)/)].filter(Boolean),
  format_declarat: grab(/Ce mai primești\? ([^]*?lectori\.)/),
  alumni_mentionati: (grab(/amintim ([^]*?) etc\./) || '').split(/,\s*/).filter(Boolean),
  metodologie: ed22.metodologie,
  cifre: [
    { valoare: '550+', ce: 'IMM-uri care au trecut prin programe din 2013', sursa: '/despre-noi' },
    { valoare: '500+', ce: 'lideri de business care contribuie pro-bono', sursa: '/despre-noi' },
    { valoare: '600+', ce: 'membri în comunitatea RBL', sursa: '/despre-noi' },
    { valoare: '8', ce: 'filiale locale RBL', sursa: '/despre-noi' },
    { valoare: '15.000 EUR', ce: 'valoarea estimată a accesului la expertiză (pe ediție)', sursa: '/antreprenoria-22' },
  ],
  contact: {
    adresa: 'Calea Dorobanți, 42, etaj 3, ap. 5, Sector 1, București',
    echipa: curOameni.echipa,
    inscriere: [...new Set(editii.map((e) => e.link_inscriere).filter(Boolean))],
  },
  social: [
    { retea: 'Facebook', url: 'https://www.facebook.com/antreprenoria/' },
    { retea: 'LinkedIn', url: 'https://www.linkedin.com/company/antreprenoria' },
    { retea: 'YouTube', url: 'https://www.youtube.com/user/RBLSummit/playlists' },
  ],
};
curOameni.echipa.forEach((m) => { const p = person(m.id, m.nume); addTo(p.tipuri, 'echipă'); p.rol_echipa = m.rol; });

// inconsecvențe la nivel de program
obs('mediu', 'Conținut', `/despre-noi anunță „${program.format_declarat}”, edițiile recente au 5 ateliere full-day, 2–3 de seară și un mastermind.`, { url: ORIGIN + '/despre-noi' });
obs('minor', 'Conținut', '/despre-noi spune „500+ lideri de business” pro-bono și „600+ membri” RBL; homepage-ul și paginile ediției nu folosesc aceleași cifre.', { url: ORIGIN + '/despre-noi' });
obs('mediu', 'Date', 'Edițiile #1–#15 (2013–2023) nu au pagini pe site; istoria programului începe vizibil abia cu #16.', { url: ORIGIN });
const tbdLoc = editii.flatMap((e) => e.ateliere.filter((a) => a.locatie === 'TBD').map((a) => `${e.id} #${a.nr}`));
if (tbdLoc.length) obs('minor', 'Conținut', `Locație „TBD” la: ${tbdLoc.join(', ')}.`);

// ---------- finalizare registre ----------
// ordinea cronologică a edițiilor (Cluj #1 rulează în paralel cu #22)
const edRank = Object.fromEntries(editii.map((e) => [e.id, e.an * 10 + (e.sezon === 'primăvară' ? 0 : 5) + (e.serie === 'Cluj' ? 1 : 0)]));
const ROL_TIP = { participant: 'alumni', speaker: 'speaker', 'gazdă': 'gazdă', 'sponsor atelier': 'sponsor', organizator: 'organizator' };
const orgList = [...orgs.values()].map((o) => {
  o.roluri.sort((a, b) => edRank[a.editie] - edRank[b.editie] || (a.atelier || 0) - (b.atelier || 0));
  const eds = [...new Set(o.roluri.map((r) => r.editie))];
  // parcursul pe ediții: ce roluri a avut organizația în fiecare
  const parcurs = eds.map((ed) => ({ editie: ed, roluri: [...new Set(o.roluri.filter((r) => r.editie === ed).map((r) => r.rol))] }));
  // ciclul: participant într-o ediție, apoi partener / sponsor / gazdă / speaker într-o ediție ulterioară
  const primaEd = o.participari.map((p) => p.editie).sort((a, b) => edRank[a] - edRank[b])[0];
  const dupa = primaEd ? o.roluri.filter((r) => r.rol !== 'participant' && edRank[r.editie] > edRank[primaEd]) : [];
  return { ...o, tipuri: [...new Set(o.roluri.map((r) => ROL_TIP[r.rol] || 'partener'))], editii: eds, parcurs,
    revine: new Set(o.participari.map((p) => p.editie)).size > 1,
    ciclu: dupa.length ? { alumni_din: primaEd, apoi: [...new Set(dupa.map((r) => r.rol))] } : null };
});
orgList.filter((o) => !o.roluri.length).forEach((o) => obs('minor', 'Date', `Organizația „${o.nume}” din curare nu apare în nicio ediție (verifică numele).`));
const orgsUsed = orgList.filter((o) => o.roluri.length);
locatii.filter((l) => !l.ateliere.length).forEach((l) => obs('minor', 'Date', `Locația „${l.nume}” din curare nu apare la niciun atelier.`));

const oameniList = [...oameni.values()].map((p) => ({ ...p, nr_aparitii: p.aparitii.length }));
// variante de companie pentru același speaker (afiliere schimbată sau scrisă diferit)
// diferențele doar de majuscule, spații sau un titlu în plus („Founder of …”) nu contează
oameniList.filter((p) => !p.tipuri.includes('participant')).forEach((p) => {
  // păstrăm doar cheile care nu sunt incluse în altă cheie mai lungă
  const keys = [...new Set(p.companii.map(affKey))];
  const distinct = keys.filter((k) => !keys.some((o) => o !== k && o.includes(k)));
  if (distinct.length > 1) obs('minor', 'Conținut', `${p.nume} apare cu afilieri diferite: ${p.companii.join(' / ')}.`, { persoana: p.id });
});
oameniList.filter((p) => p.variante.length)
  .forEach((p) => obs('minor', 'Conținut', `Numele „${p.nume}” e scris diferit pe site: ${p.variante.map((v) => `„${v}”`).join(', ')}.`, { persoana: p.id }));

const out = {
  meta: {
    sursa: ORIGIN, extras_la: brut.extras_la, generat: new Date().toISOString(),
    pagini: fs.readdirSync(SOURCE).filter((f) => f.endsWith('.html')).length,
    metoda: 'paginile edițiilor (/antreprenoria-16 … /antreprenoria-22, /antreprenoria-cluj) + /despre-noi + /contact; companii, organizații, aliasuri, parteneri și teme curate manual în data/curare/',
  },
  program,
  editii,
  oameni: oameniList,
  organizatii: orgsUsed,
  locatii: locatii.filter((l) => l.ateliere.length),
  teme: teme.filter((t) => t.ateliere),
  sectoare: curCompanii.sectoare,
  observatii,
};
writeJson('entitati.json', out);
const nTip = (t) => orgsUsed.filter((o) => o.tipuri.includes(t)).length;
console.log(`ediții ${editii.length} · ateliere ${editii.reduce((n, e) => n + e.ateliere.length, 0)} · participări ${editii.reduce((n, e) => n + e.participanti.length, 0)}`);
console.log(`oameni ${oameniList.length} (speakeri ${oameniList.filter((p) => p.aparitii.length).length}) · organizații ${orgsUsed.length} (alumni ${nTip('alumni')}, parteneri ${nTip('partener')}, sponsori ${nTip('sponsor')}, gazde ${nTip('gazdă')}, ale speakerilor ${nTip('speaker')}) · locații ${out.locatii.length}`);
console.log(`ciclu alumni → alt rol: ${orgsUsed.filter((o) => o.ciclu).map((o) => `${o.nume} (${o.ciclu.apoi.join(', ')})`).join('; ')}`);
console.log(`teme ${out.teme.length} · observații ${observatii.length}`);
