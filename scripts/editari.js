// Modificările făcute din panou (data/curare/editari.json), aplicate peste entitățile construite din site-ul vechi.
// Ce se editează în panou se păstrează aici, separat, deci nu se pierde la o nouă preluare (npm run sync).
//   modificari: { tip: { id: { câmpuri } } }   tip = oameni | organizatii | editii | ateliere | locatii | teme | echipa
//               un element nou are _nou: true (atelierele noi au și editie)
//   program, metodologie, cifre: identitatea programului, pașii metodei și cifrele (listele se înlocuiesc întregi)
//   agende: { atelier: [momente] }   participanti: { editie: [...] }   parteneri: { editie: [...] }
//   ascunse: ["tip:id"]   texte: { "pagina.bloc": "text" }   nepublicate: [{ cand, ce }]
// După aplicare, legăturile derivate (aparițiile oamenilor, rolurile organizațiilor, edițiile locațiilor și temelor)
// se recalculează din ediții, ca datele să rămână consecvente.

const LISTS = ['oameni', 'organizatii', 'editii', 'ateliere', 'locatii', 'teme', 'echipa'];
const EMPTY = () => ({ modificari: Object.fromEntries(LISTS.map((t) => [t, {}])), program: {}, metodologie: null, cifre: null, agende: {}, participanti: {}, parteneri: {}, ascunse: [], texte: {}, nepublicate: [] });
const addTo = (arr, v) => { if (v && !arr.includes(v)) arr.push(v); };
const SKELETON = {
  oameni: (id) => ({ id, nume: '', variante: [], tipuri: [], imagine: null, linkedin: null, companii: [], organizatii: [], functii: [], aparitii: [], editii: [], nr_aparitii: 0 }),
  organizatii: (id) => ({ id, nume: '', tip: 'companie', sector: null, url: null, logo: null, descriere: null, incert: false, nota: null, roluri: [], participari: [], oameni: [], tipuri: [], editii: [], parcurs: [], revine: false, ciclu: null }),
  editii: (id) => ({ id, serie: 'București', numar: null, cheie: id, slug: null, url: null, titlu: '', subtitlu: '', perioada: '', an: null, sezon: null, status: 'în pregătire', deschisa: false, link_inscriere: null, beneficii: [], valoare_estimata: null, preturi: [], metodologie: [], participanti_titlu: null, locatii: [], ateliere: [], participanti: [], parteneri: [] }),
  ateliere: (id) => ({ id, nr: null, data: null, data_text: null, locatie: null, loc: null, titlu: '', tema: null, format: 'full-day', descriere: '', sponsor: null, cauta_sponsor: false, program: [] }),
  locatii: (id) => ({ id, nume: '', oras: 'București', tip: '', organizatie: null, ateliere: [], editii: [] }),
  teme: (id) => ({ id, nume: '', format: 'full-day', nota: null, titluri: [], editii: [], ateliere: 0 }),
  echipa: (id) => ({ id, nume: '', rol: '', email: '' }),
};

function apply(out, E) {
  E = { ...EMPTY(), ...(E || {}) };
  const M = { ...EMPTY().modificari, ...E.modificari };
  const list = (tip) => (tip === 'echipa' ? out.program.contact.echipa : tip === 'ateliere' ? out.editii.flatMap((e) => e.ateliere) : out[tip]);
  const fields = (p) => Object.fromEntries(Object.entries(p).filter(([k]) => !k.startsWith('_') && k !== 'id'));

  // 1. elementele noi, apoi câmpurile modificate (atelierele după ediții, ca o ediție nouă să le poată primi)
  for (const tip of ['editii', 'oameni', 'organizatii', 'locatii', 'teme', 'echipa', 'ateliere']) {
    for (const [id, p] of Object.entries(M[tip] || {})) {
      let x = list(tip).find((i) => i.id === id);
      if (!x && p._nou) {
        x = SKELETON[tip](id);
        if (tip === 'ateliere') { const ed = out.editii.find((e) => e.id === p._editie); if (!ed) continue; ed.ateliere.push(x); }
        else if (tip === 'echipa') out.program.contact.echipa.push(x);
        else out[tip].push(x);
        x.adaugat_din_panou = true;
      }
      if (x) Object.assign(x, fields(p));
    }
  }
  Object.assign(out.program, fields(E.program || {}));
  if (Array.isArray(E.metodologie)) out.program.metodologie = E.metodologie;
  if (Array.isArray(E.cifre)) out.program.cifre = E.cifre;

  // 2. relațiile: agenda atelierelor, participanții și partenerii edițiilor
  for (const [aid, prog] of Object.entries(E.agende || {})) { const a = list('ateliere').find((x) => x.id === aid); if (a) a.program = prog; }
  for (const [eid, L] of Object.entries(E.participanti || {})) { const e = out.editii.find((x) => x.id === eid); if (e) e.participanti = L; }
  for (const [eid, L] of Object.entries(E.parteneri || {})) { const e = out.editii.find((x) => x.id === eid); if (e) e.parteneri = L; }

  // 3. legăturile derivate, refăcute din ediții
  relink(out, M);

  // 4. ascunse (rămân în panou, site-ul le sare) și textele paginilor
  for (const k of E.ascunse || []) { const [tip, id] = k.split(':'); const x = list(tip)?.find((i) => i.id === id); if (x) x.ascuns = true; }
  out.texte = E.texte || {};
  return out;
}

// aceleași reguli ca în build-entities.js, aplicate pe datele finale
const ROL_TIP = { participant: 'alumni', speaker: 'speaker', 'gazdă': 'gazdă', 'sponsor atelier': 'sponsor', organizator: 'organizator' };
const SPEAKER_TIP = ['trainer', 'antreprenor invitat', 'facilitator', 'invitat'];
function relink(out, M) {
  const P = Object.fromEntries(out.oameni.map((p) => [p.id, p]));
  const O = Object.fromEntries(out.organizatii.map((o) => [o.id, o]));
  const L = Object.fromEntries(out.locatii.map((l) => [l.id, l]));
  const T = Object.fromEntries(out.teme.map((t) => [t.id, t]));
  const edRank = Object.fromEntries(out.editii.map((e) => [e.id, (e.an || 9999) * 10 + (e.sezon === 'primăvară' ? 0 : 5) + (e.serie === 'Cluj' ? 1 : 0)]));
  const keepTip = (p) => p.tipuri.filter((t) => !SPEAKER_TIP.includes(t) && t !== 'participant');
  out.oameni.forEach((p) => { p._keep = keepTip(p); p._tip = []; p.aparitii = []; p.editii = []; });
  out.organizatii.forEach((o) => { o.roluri = []; o.participari = []; });
  out.locatii.forEach((l) => { l.ateliere = []; l.editii = []; });
  out.teme.forEach((t) => { t.editii = []; t.ateliere = 0; });
  const roleKey = (r) => `${r.editie}|${r.rol}|${r.atelier ?? ''}|${r.persoana ?? ''}`;
  const addRole = (o, r) => { if (o && !o.roluri.some((x) => roleKey(x) === roleKey(r))) o.roluri.push(r); };

  for (const ed of out.editii) {
    ed.locatii = [];
    for (const x of ed.parteneri) if (x.rol !== 'sponsor atelier') addRole(O[x.organizatie], { editie: ed.id, rol: x.rol });
    for (const a of ed.ateliere) {
      if (a.sponsor) addRole(O[a.sponsor], { editie: ed.id, rol: 'sponsor atelier', atelier: a.nr });
      const loc = L[a.loc];
      if (loc) { loc.ateliere.push({ editie: ed.id, atelier: a.nr }); addTo(loc.editii, ed.id); addRole(O[loc.organizatie], { editie: ed.id, rol: 'gazdă' }); }
      addTo(ed.locatii, a.locatie);
      for (const m of a.program || []) for (const s of m.speakeri || []) {
        const pers = P[s.persoana];
        if (!pers) continue;
        addTo(pers._tip, s.rol);
        addTo(pers.editii, ed.id);
        if (s.organizatie && O[s.organizatie]) { addRole(O[s.organizatie], { editie: ed.id, rol: 'speaker', atelier: a.nr, persoana: pers.id }); addTo(O[s.organizatie].oameni, pers.id); }
        pers.aparitii.push({ editie: ed.id, atelier: a.nr, tema: a.tema, titlu: a.titlu, rol: s.rol, companie: s.companie || null, organizatie: s.organizatie || null, data: a.data });
      }
      const t = T[a.tema];
      if (t) { t.ateliere++; addTo(t.titluri, a.titlu); addTo(t.editii, ed.id); }
    }
    for (const x of ed.participanti) {
      const pers = P[x.persoana];
      if (pers) { addTo(pers._tip, 'participant'); addTo(pers.editii, ed.id); }
      const c = O[x.organizatie];
      if (c) { addTo(c.oameni, x.persoana); c.participari.push({ editie: ed.id, persoana: x.persoana, cifra_afaceri: x.cifra_afaceri, angajati: x.angajati }); addRole(c, { editie: ed.id, rol: 'participant', persoana: x.persoana }); }
    }
    addRole(O.rbl, { editie: ed.id, rol: 'organizator' });
  }
  // tipurile oamenilor: din apariții și participări, plus cele puse manual (echipă) sau bifate în panou
  out.oameni.forEach((p) => {
    const manual = M.oameni?.[p.id]?.tipuri;
    p.tipuri = manual ? [...manual] : [...p._tip, ...p._keep.filter((t) => !p._tip.includes(t))];
    delete p._tip; delete p._keep;
    p.nr_aparitii = p.aparitii.length;
  });
  out.organizatii.forEach((o) => {
    o.roluri.sort((a, b) => edRank[a.editie] - edRank[b.editie] || (a.atelier || 0) - (b.atelier || 0));
    const eds = [...new Set(o.roluri.map((r) => r.editie))];
    o.parcurs = eds.map((ed) => ({ editie: ed, roluri: [...new Set(o.roluri.filter((r) => r.editie === ed).map((r) => r.rol))] }));
    const primaEd = o.participari.map((p) => p.editie).sort((a, b) => edRank[a] - edRank[b])[0];
    const dupa = primaEd ? o.roluri.filter((r) => r.rol !== 'participant' && edRank[r.editie] > edRank[primaEd]) : [];
    const manual = M.organizatii?.[o.id]?.tipuri;
    o.tipuri = manual ? [...manual] : o.roluri.length ? [...new Set(o.roluri.map((r) => ROL_TIP[r.rol] || 'partener'))] : o.tipuri;
    o.editii = eds;
    o.revine = new Set(o.participari.map((p) => p.editie)).size > 1;
    o.ciclu = dupa.length ? { alumni_din: primaEd, apoi: [...new Set(dupa.map((r) => r.rol))] } : null;
  });
}

module.exports = { apply, relink, EMPTY, LISTS };
