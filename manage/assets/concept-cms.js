/* Preview: entitățile ca CMS al site-ului. Toate tipurile au listă, editare și adăugare; nimic nu se salvează. */
const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const initials = (n) => String(n || '').split(/[\s-]+/).filter(Boolean).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2400); };
const IC = {
  program: '<path d="M12 2l2.6 6.2L21 9l-5 4.4L17.5 20 12 16.6 6.5 20 8 13.4 3 9l6.4-.8z"/>',
  editii: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  oameni: '<path d="M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3 3 0 100-6 3 3 0 000 6zM21 19v-1a4 4 0 00-3-3.9M15.5 4.1a3 3 0 010 5.8"/>',
  companii: '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5"/>',
  teme: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5zM4 19.5A2.5 2.5 0 006.5 22H20v-5"/>',
  texte: '<path d="M4 6h16M4 12h10M4 18h13"/>',
};
const icon = (id) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[id]}</svg>`;

let D, ED = {}, O = {}, P = {}, L = {}, T = {};
const pending = [], drafts = new Set(), hidden = new Set();
const edLabel = (id) => { const e = ED[id]; return e ? (e.serie === 'Cluj' ? `Cluj #${e.numar}` : `#${e.numar}`) : id; };
const edUrl = (id) => { const e = ED[id]; return e ? (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`) : '/editii'; };
const FULL = ['viziune', 'model-de-business', 'marketing', 'vanzari', 'cultura'];
const fmtDay = (s) => (s ? new Date(s + 'T12:00').toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const edsSorted = () => D.editii.slice().sort((a, b) => (b.an - a.an) || (a.sezon === b.sezon ? 0 : a.sezon === 'toamnă' ? -1 : 1));

/* ---------- câmpuri de formular ---------- */
const inp = (k, label, v, o = {}) => `<div class="f"><label>${label}</label><input name="${k}" value="${esc(v ?? '')}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.type ? `type="${o.type}"` : ''} ${o.list ? `list="${o.list}"` : ''} autocomplete="off">${o.hint ? `<small>${o.hint}</small>` : ''}</div>`;
const area = (k, label, v, o = {}) => `<div class="f"><label>${label}</label><textarea name="${k}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} style="${o.tall ? 'min-height:120px' : ''}">${esc(v ?? '')}</textarea>${o.hint ? `<small>${o.hint}</small>` : ''}</div>`;
const sel = (k, label, opts, v, o = {}) => `<div class="f"><label>${label}</label><select name="${k}">${o.empty ? `<option value="">${o.empty}</option>` : ''}${opts.map(([val, l]) => `<option value="${esc(val)}" ${val === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>${o.hint ? `<small>${o.hint}</small>` : ''}</div>`;
const checks = (k, opts, on, type = 'checkbox') => `<div class="checks-r">${opts.map(([val, l]) => `<label><input type="${type}" name="${k}" value="${esc(val)}" ${[].concat(on || []).includes(val) ? 'checked' : ''}>${esc(l)}</label>`).join('')}</div>`;
const fs = (title, body, extra = '') => `<div class="fs"><h4>${title}${extra}</h4>${body}</div>`;
const f2 = (...a) => `<div class="f2">${a.join('')}</div>`;
// listă de rânduri editabile (beneficii, puncte, prețuri)
const rows = (label, items, cols) => `<div class="f"><label>${label}</label><div class="lrows">${items.map((it) => `<div class="lrow">${cols.map(([k, ph, w]) => `<input value="${esc(typeof it === 'string' ? it : it[k] ?? '')}" placeholder="${esc(ph)}" style="flex:${w || 1}">`).join('')}<button class="sm" title="Șterge">✕</button></div>`).join('')}</div><button class="sm add-row">+ rând</button></div>`;
// legături spre alte entități: etichete + căutare
const rel = (label, items, ph, list, hint) => `<div class="f"><label>${label}</label><div class="rel">${items.map((x) => `<span>${x}<button title="Scoate">✕</button></span>`).join('')}</div><input placeholder="${esc(ph)}" list="${list}" class="rel-add">${hint ? `<small>${hint}</small>` : ''}</div>`;
const ro = (html) => `<div class="ro-box">${html}</div>`;
const photo = (img, label = 'fotografie', round = true) => `<div class="photo"><span class="av ${round ? '' : 'sq'}">${img ? `<img class="av ${round ? '' : 'sq'}" src="${esc(img)}" alt="">` : '?'}</span><div class="drop">Trage aici ${label === 'logo' ? 'logo-ul (SVG sau PNG)' : 'o fotografie'} sau <a href="#">alege un fișier</a><br><small>${label === 'logo' ? 'Pe fundal transparent, ideal SVG.' : 'Se decupează și se micșorează automat pentru site.'}</small></div></div>`;
const vis = (id) => fs('Vizibilitate', checks('vis', [['on', 'Apare pe site'], ['off', 'Ascuns (rămâne în panou)']], hidden.has(id) ? 'off' : 'on', 'radio'));

/* ---------- TIPURILE DE ENTITĂȚI ---------- */
// fiecare tip: de unde vin elementele, cum arată rândul, câmpurile, previzualizarea de pe site și paginile pe care apare
const personRow = (p) => ({ img: p.imagine, title: p.nume, meta: `${(p.companii || [])[0] || ''}${p.editii?.length ? ` · ${p.editii.length === 1 ? '1 ediție' : p.editii.length + ' ediții'}: ${p.editii.slice(-4).map(edLabel).join(', ')}` : ''}` });
const ROLE_OPTS = [['trainer', 'Trainer'], ['antreprenor invitat', 'Antreprenor invitat'], ['facilitator', 'Facilitator'], ['participant', 'Participant (alumni)'], ['echipă', 'Echipă']];
const roleLabel = (t) => (t.includes('trainer') ? 'Trainer' : t.includes('antreprenor invitat') ? 'Antreprenor invitat' : t.includes('facilitator') ? 'Facilitator' : t.includes('participant') ? 'Alumni' : t.includes('echipă') ? 'Echipă' : 'Rol');
function personFields(p, kind) {
  const team = D.program.contact.echipa.find((x) => x.id === p.id) || {};
  const part = kind === 'participant' ? D.editii.flatMap((e) => e.participanti.filter((x) => x.persoana === p.id).map((x) => ({ e, x }))) : [];
  return fs('Cine e', `${inp('nume', 'Nume și prenume', p.nume, { ph: 'ex. Andreea Popescu' })}<div class="dup" id="dup" hidden></div>${photo(p.imagine)}${inp('linkedin', 'LinkedIn', p.linkedin, { ph: 'https://www.linkedin.com/in/…' })}`)
    + fs('Rol în program', `${checks('tipuri', ROLE_OPTS, p.tipuri)}<small class="ro">Un om poate avea mai multe roluri: un alumni care revine ca invitat rămâne aceeași fișă.</small>`)
    + fs('Companie și funcție', f2(inp('companie', 'Companie', (p.companii || [])[0], { list: 'dl-org', ph: 'Caută sau scrie una nouă', hint: 'Dacă nu există, se creează și în Organizații.' }), inp('functie', 'Funcția afișată', (p.functii || [])[0], { ph: 'ex. Fondator & CEO' })))
    + (kind === 'echipă' ? fs('Contact', f2(inp('rol', 'Rol în echipă', team.rol), inp('email', 'Email', team.email, { type: 'email' })) + inp('telefon', 'Telefon', team.telefon)) : '')
    + (kind === 'participant' ? fs('Participări <span class="tag warn">doar în panou</span>', `${part.length ? `<table class="mini"><tr><th>Ediția</th><th>Companie</th><th>Cifra de afaceri</th><th>Angajați</th></tr>${part.map(({ e, x }) => `<tr><td>${edLabel(e.id)}</td><td>${esc(O[x.organizatie]?.nume || '')}</td><td><input value="${esc(x.cifra_afaceri ?? '')}"></td><td><input value="${esc(x.angajati ?? '')}"></td></tr>`).join('')}</table>` : ''}<button class="sm">+ Participare la o ediție</button><small class="ro">Cifrele individuale nu apar pe site; intră doar în cifrele agregate ale edițiilor.</small>`) : '')
    + (kind !== 'participant' && kind !== 'echipă' ? fs('Prezentare <span class="tag ok">câmp nou</span>', area('bio', 'Câteva rânduri despre el/ea', '', { ph: 'Apare pe fișa de pe site. 2–3 fraze.' })) : '')
    + (kind !== 'participant' && kind !== 'echipă' ? fs('Unde apare în program', `${p.aparitii?.length ? `<ul class="ro">${p.aparitii.slice(-5).reverse().map((a) => `<li><b>${edLabel(a.editie)}</b> · ${esc(a.titlu || a.tema || '')} · ${esc(a.rol)}</li>`).join('')}</ul>` : '<p class="ro" style="margin:0">Încă nicăieri.</p>'}<small class="ro">Aparițiile se adaugă din Ediții → Atelier, alegând omul din listă.</small>`) : '')
    + vis(p.id);
}
function personWhere(v, kind) {
  const w = [], t = [].concat(v.tipuri || []);
  if (kind === 'echipă' || t.includes('echipă')) w.push(['/despre#echipa', 'echipa, pe pagina Despre'], ['/aplica', 'contactul de pe Aplică'], ['/', 'footerul tuturor paginilor']);
  if (t.some((x) => ['trainer', 'antreprenor invitat', 'facilitator'].includes(x))) w.push(['/traineri', 'lista trainerilor și invitaților'], [`/traineri/${v.id || 'nume-nou'}`, 'fișa proprie']);
  if (t.includes('participant')) w.push(['/alumni', 'lista alumnilor']);
  (v.editii || []).slice(-3).forEach((e) => w.push([edUrl(e), `ediția ${edLabel(e)}`]));
  [...new Set((v.aparitii || []).map((a) => a.tema))].filter((x) => FULL.includes(x)).slice(0, 2).forEach((x) => w.push([`/teme/${x}`, `tema ${T[x]?.nume || x}`]));
  return w;
}
const personCard = (v) => `<div class="sp-card"><div class="ph" style="${v.imagine ? `background-image:url('${esc(v.imagine)}')` : ''}">${v.imagine ? '' : initials(v.nume) || '?'}</div><div class="tx"><b>${esc(v.nume || 'Nume Prenume')}</b><small>${esc(v.functie || '')}${v.functie && v.companie ? ', ' : ''}${esc(v.companie || 'Companie')}</small><br><span class="pill">${esc(roleLabel([].concat(v.tipuri || [])))}</span></div></div>`;
const personType = (kind, label, one, desc) => ({
  label, one, cat: 'Oameni', desc,
  items: () => D.oameni.filter((p) => kind === 'facilitator' ? p.tipuri.includes('facilitator') || p.tipuri.includes('invitat') : p.tipuri.includes(kind)),
  row: personRow, blank: () => ({ tipuri: [kind], aparitii: [], editii: [] }),
  fields: (p) => personFields(p, kind),
  values: (p) => ({ nume: p.nume, imagine: p.imagine, companie: (p.companii || [])[0], functie: (p.functii || [])[0], tipuri: p.tipuri }),
  preview: personCard, where: (v) => personWhere(v, kind), dup: (q) => D.oameni.filter((p) => norm(q).split(/\s+/).every((x) => norm(p.nume).includes(x))),
});

const STATUS = [['în desfășurare', 'În desfășurare'], ['înscrieri deschise', 'Înscrieri deschise'], ['încheiată', 'Încheiată'], ['în pregătire', 'În pregătire']];
const TYPES = {
  /* PROGRAM */
  identitate: { label: 'Identitate', one: null, cat: 'Program', single: true, desc: 'Numele, descrierea și publicul programului.',
    items: () => [{ id: 'program', ...D.program }], row: () => ({ title: D.program.nume, meta: D.program.slogan }),
    fields: (x) => fs('Programul', inp('nume', 'Numele programului', x.nume) + inp('slogan', 'Slogan', x.slogan) + f2(inp('de_cand', 'Din anul', x.de_cand), inp('organizator', 'Organizator', x.organizator?.nume || 'Romanian Business Leaders')))
      + fs('Descriere', area('descriere', 'Ce este Antreprenoria', x.descriere, { tall: true }) + area('audienta', 'Cui se adresează', x.audienta)),
    values: (x) => ({ nume: x.nume, slogan: x.slogan, descriere: x.descriere }),
    preview: (v) => `<div class="sp-hero"><small>DESPRE ANTREPRENORIA</small><b>${esc(cap(v.slogan || ''))}</b><p>${esc(String(v.descriere || '').slice(0, 220))}…</p></div>`,
    where: () => [['/despre', 'pagina Despre'], ['/program', 'introducerea din Program'], ['/', 'footerul tuturor paginilor']] },
  metodologie: { label: 'Metodologie', one: 'pas de metodologie', cat: 'Program', desc: 'Pașii metodei, cu punctele fiecăruia.',
    items: () => D.program.metodologie.map((m, i) => ({ id: 'm' + i, ...m })), row: (m) => ({ num: m.id.slice(1) * 1 + 1, title: cap(m.titlu.toLowerCase()), meta: `${m.puncte.length} puncte` }),
    blank: () => ({ titlu: '', puncte: ['', ''] }),
    fields: (m) => fs('Pasul', inp('titlu', 'Titlu', cap(String(m.titlu || '').toLowerCase()), { ph: 'ex. Ateliere aplicate' }) + rows('Puncte', m.puncte, [['p', 'Un punct, o frază']])),
    values: (m) => ({ titlu: cap(String(m.titlu || '').toLowerCase()), puncte: m.puncte }),
    preview: (v) => `<div class="sp-box"><b>${esc(v.titlu || 'Titlul pasului')}</b><ul>${[].concat(v.puncte || []).filter(Boolean).slice(0, 3).map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`,
    where: () => [['/program#metodologie', 'Metodologia, pe pagina Program']] },
  cifre: { label: 'Cifre', one: 'cifră', cat: 'Program', desc: 'Cifrele declarate ale programului.',
    items: () => D.program.cifre.map((c, i) => ({ id: 'c' + i, ...c })), row: (c) => ({ num: c.valoare, title: c.ce, meta: `sursa: ${c.sursa || '—'}` }),
    blank: () => ({ valoare: '', ce: '' }),
    fields: (c) => fs('Cifra', f2(inp('valoare', 'Valoare', c.valoare, { ph: 'ex. 550+' }), inp('ce', 'Ce înseamnă', c.ce, { ph: 'ex. IMM-uri care au trecut prin program' })) + inp('sursa', 'Sursa (pentru echipă)', c.sursa, { hint: 'Nu apare pe site.' })),
    values: (c) => ({ valoare: c.valoare, ce: c.ce }),
    preview: (v) => `<div class="sp-num"><b>${esc(v.valoare || '0')}</b><span>${esc(v.ce || 'ce înseamnă cifra')}</span></div>`,
    where: () => [['/despre', 'cifrele de pe Despre'], ['/', 'banda de cifre de pe homepage']] },
  echipa: personType('echipă', 'Echipa', 'om din echipă', 'Oamenii din echipa programului.'),

  /* EDIȚII */
  editii: { label: 'Ediții', one: 'ediție', cat: 'Ediții', desc: 'Fiecare ediție, cu ateliere, participanți și parteneri.',
    items: () => edsSorted(), row: (e) => ({ num: edLabel(e.id), title: `Antreprenoria ${edLabel(e.id)}`, meta: `${e.perioada} · ${e.ateliere.length} ateliere · ${e.participanti.length} participanți · ${e.status}` }),
    blank: () => ({ serie: 'București', numar: Math.max(...D.editii.filter((e) => e.serie === 'București').map((e) => e.numar)) + 1, ateliere: [], participanti: [], parteneri: [], beneficii: [], preturi: [{ eticheta: 'Preț', pret_text: '' }], status: 'în pregătire' }),
    fields: (e) => fs('Ediția', f2(sel('serie', 'Serie', [['București', 'București'], ['Cluj', 'Cluj']], e.serie), inp('numar', 'Număr', e.numar, { type: 'number' })) + f2(inp('perioada', 'Perioada', e.perioada, { ph: 'ex. septembrie – decembrie 2026' }), sel('status', 'Stare', STATUS, e.status)) + inp('subtitlu', 'Subtitlu', e.subtitlu) + checks('deschisa', [['da', 'Înscrieri deschise (apare în formularul Aplică)']], e.deschisa ? 'da' : ''))
      + fs('Preț', rows('Prețuri', e.preturi || [], [['eticheta', 'Etichetă, ex. Early bird', 1], ['pret_text', 'Preț, ex. 7.700 lei + TVA', 1], ['nota', 'Notă, ex. până la 11 sept.', 1]]) + inp('valoare', 'Valoare estimată', e.valoare_estimata))
      + fs('Ce primește participantul', rows('Beneficii', e.beneficii || [], [['b', 'Un beneficiu']]))
      + fs(`Ateliere <span class="n">${e.ateliere.length}</span>`, `<div class="mini-list">${e.ateliere.map((a) => `<a href="#" data-edit-type="ateliere" data-edit-id="${a.id}"><b>${a.nr}</b><span>${esc(a.titlu)}</span><small>${fmtDay(a.data) || 'fără dată'}</small></a>`).join('')}</div><button class="sm" data-new="ateliere">+ Atelier în această ediție</button>`)
      + fs(`Participanți <span class="n">${e.participanti.length}</span>`, rel('', e.participanti.slice(0, 12).map((x) => esc(x.nume)).concat(e.participanti.length > 12 ? [`+${e.participanti.length - 12}`] : []), 'Adaugă un participant (caută în Oameni)', 'dl-people', 'Cifrele companiei se completează pe fișa participantului.'))
      + fs(`Parteneri <span class="n">${e.parteneri.length}</span>`, rel('', e.parteneri.map((x) => `${esc(O[x.organizatie]?.nume || x.organizatie)} <i>${esc(x.rol)}</i>`), 'Adaugă un partener (caută în Organizații)', 'dl-org'))
      + vis(e.id),
    values: (e) => ({ serie: e.serie, numar: e.numar, perioada: e.perioada, status: e.status, subtitlu: e.subtitlu }),
    preview: (v) => `<div class="sp-ed"><span class="${v.status === 'încheiată' ? '' : 'live'}">${esc(cap(v.status || ''))}</span><b>${v.serie === 'Cluj' ? 'Cluj ' : ''}#${esc(v.numar || '')}</b><small>${esc(v.perioada || 'perioada')}</small></div>`,
    where: (v) => [[v.serie === 'Cluj' ? `/editii/cluj-${v.numar}` : `/editii/${v.numar}`, 'pagina ediției'], ['/editii', 'lista edițiilor'], ['/', 'homepage (ediția curentă și arhiva)'], ['/aplica', 'formularul Aplică, dacă e deschisă']] },
  ateliere: { label: 'Ateliere', one: 'atelier', cat: 'Ediții', desc: 'Atelierele fiecărei ediții: dată, temă, locație, oameni.',
    items: () => edsSorted().flatMap((e) => e.ateliere.map((a) => ({ ...a, editie: e.id }))), row: (a) => ({ num: `${edLabel(a.editie)}·${a.nr}`, title: a.titlu, meta: `${fmtDay(a.data) || 'fără dată'} · ${a.format}${a.locatie ? ' · ' + a.locatie : ''}` }),
    blank: () => ({ editie: edsSorted()[0].id, format: 'full-day', program: [] }),
    fields: (a) => fs('Atelierul', f2(sel('editie', 'Ediția', edsSorted().map((e) => [e.id, `Antreprenoria ${edLabel(e.id)}`]), a.editie), inp('data', 'Data', a.data, { type: 'date' })) + f2(sel('tema', 'Tema (din Curriculum)', D.teme.map((t) => [t.id, `${t.nume} · ${t.format}`]), a.tema, { empty: 'Alege tema' }), sel('format', 'Format', [['full-day', 'Full-day'], ['seară', 'Seară'], ['networking', 'Networking']], a.format)) + inp('titlu', 'Titlul afișat', a.titlu, { hint: 'Implicit e numele temei; îl poți schimba pentru ediția asta.' }) + area('descriere', 'Descriere', cap(a.descriere || '')))
      + fs('Unde și cu cine', f2(sel('loc', 'Locația', D.locatii.map((l) => [l.id, l.nume]), a.loc, { empty: 'Alege locația' }), sel('sponsor', 'Sponsorul atelierului', D.organizatii.filter((o) => o.tipuri.some((t) => ['sponsor', 'partener'].includes(t))).map((o) => [o.id, o.nume]), a.sponsor, { empty: 'Fără sponsor' })) + checks('cauta', [['da', 'Căutăm sponsor (apare pe site ca invitație)']], a.cauta_sponsor ? 'da' : ''))
      + fs('Agenda zilei', `<div class="lrows">${(a.program || []).map((s) => `<div class="lrow"><input value="${esc(s.interval)}" style="flex:.6"><input value="${esc(s.activitate)}" style="flex:1.2"><span class="rel" style="flex:1.2">${(s.speakeri || []).map((x) => `<span>${esc(P[x.persoana]?.nume || x.persoana)} <i>${esc(x.rol || "")}</i><button>✕</button></span>`).join('')}<input class="rel-add" list="dl-people" placeholder="+ om"></span><button class="sm">✕</button></div>`).join('')}</div><button class="sm add-row">+ moment în agendă</button><small class="ro">Oamenii se aleg din Oameni; dacă nu există, îi adaugi de aici și primesc fișă.</small>`),
    values: (a) => ({ titlu: a.titlu, data: a.data, format: a.format, editie: a.editie, loc: a.loc }),
    preview: (v) => `<div class="sp-ag"><span>${esc(fmtDay(v.data) || 'Data')}</span><b>${esc(v.titlu || 'Titlul atelierului')}</b><small>${esc(cap(v.format || ''))}${v.loc ? ' · ' + esc(L[v.loc]?.nume || '') : ''}</small></div>`,
    where: (v) => [[edUrl(v.editie) + '#agenda', 'agenda ediției'], ...(FULL.includes(v.tema) ? [[`/teme/${v.tema}`, 'pagina temei']] : []), ['/', 'pulsul programului de pe homepage'], ['/program', 'calendarul din Program']] },
  locatii: { label: 'Locații', one: 'locație', cat: 'Ediții', desc: 'Unde se țin atelierele și cine găzduiește.',
    items: () => D.locatii, row: (l) => ({ title: l.nume, meta: `${l.oras} · ${l.tip} · ${l.ateliere.length} ateliere` }), blank: () => ({ oras: 'București', ateliere: [] }),
    fields: (l) => fs('Locația', inp('nume', 'Nume', l.nume, { ph: 'ex. Sediul Zitec' }) + f2(inp('oras', 'Oraș', l.oras), inp('tip', 'Tip', l.tip, { ph: 'ex. sediu partener, hotel' })) + inp('adresa', 'Adresa', l.adresa, { ph: 'Strada, număr' }) + inp('gazda', 'Gazda (din Organizații)', O[l.organizatie]?.nume, { list: 'dl-org' })),
    values: (l) => ({ nume: l.nume, oras: l.oras }),
    preview: (v) => `<div class="sp-ag"><span>Locația</span><b>${esc(v.nume || 'Numele locației')}</b><small>${esc(v.oras || '')}</small></div>`,
    where: () => [['/editii/22#agenda', 'agenda edițiilor în care e folosită'], ['/program', 'calendarul din Program']] },

  /* OAMENI */
  traineri: personType('trainer', 'Traineri', 'trainer', 'Trainerii atelierelor full-day.'),
  invitati: personType('antreprenor invitat', 'Antreprenori invitați', 'antreprenor invitat', 'Antreprenorii care povestesc în a doua parte a zilei.'),
  facilitatori: personType('facilitator', 'Facilitatori', 'facilitator', 'Cei care țin atelierele de seară.'),
  participanti: personType('participant', 'Participanți', 'participant', 'Alumnii fiecărei ediții.'),

  /* ORGANIZAȚII */
  ...Object.fromEntries([['alumni', 'Companii alumni', 'companie alumni', (o) => o.tipuri.includes('alumni')], ['parteneri', 'Parteneri & sponsori', 'partener', (o) => ['partener', 'sponsor', 'organizator'].some((t) => o.tipuri.includes(t))], ['speakeri', 'Companiile speakerilor', 'companie', (o) => o.tipuri.includes('speaker')]].map(([k, label, one, f]) => [k, {
    label, one, cat: 'Organizații', desc: '', logo: true,
    items: () => D.organizatii.filter(f).sort((a, b) => a.nume.localeCompare(b.nume, 'ro')), row: (o) => ({ img: o.logo, sq: true, title: o.nume, meta: `${o.tip || o.sector || ''}${o.editii?.length ? ` · ${o.editii.map(edLabel).join(', ')}` : ''}` }),
    blank: () => ({ tipuri: k === 'parteneri' ? ['partener'] : k === 'alumni' ? ['alumni'] : ['speaker'], roluri: [], editii: [], oameni: [] }),
    fields: (o) => fs('Organizația', `${inp('nume', 'Nume', o.nume)}<div class="dup" id="dup" hidden></div>${photo(o.logo, 'logo', false)}${f2(inp('tip', 'Tip', o.tip, { ph: 'ex. Bancă, Software' }), inp('sector', 'Sector', o.sector))}${inp('url', 'Site', o.url, { ph: 'https://' })}${area('descriere', 'Descriere scurtă', o.descriere)}`)
      + fs('Roluri pe ediții', `<div class="lrows">${(o.roluri || []).slice(0, 8).map((r) => `<div class="lrow"><select style="flex:1">${edsSorted().map((e) => `<option ${e.id === r.editie ? 'selected' : ''}>${edLabel(e.id)}</option>`).join('')}</select><select style="flex:1.4">${['participant', 'partener strategic', 'sponsor atelier', 'gazdă', 'speaker', 'organizator'].map((x) => `<option ${x === r.rol ? 'selected' : ''}>${x}</option>`).join('')}</select><button class="sm">✕</button></div>`).join('')}</div><button class="sm add-row">+ rol într-o ediție</button><small class="ro">Aceeași companie poate fi alumni într-o ediție și partener în alta; parcursul ei se calculează de aici.</small>`)
      + fs('Oameni', rel('', (o.oameni || []).slice(0, 10).map((id) => esc(P[id]?.nume || id)), 'Leagă un om (caută în Oameni)', 'dl-people'))
      + vis(o.id),
    values: (o) => ({ nume: o.nume, logo: o.logo, tip: o.tip, tipuri: o.tipuri }),
    preview: (v) => `<div class="sp-logo">${v.logo ? `<img src="${esc(v.logo)}" alt="">` : `<b>${esc(v.nume || 'Logo')}</b>`}</div>`,
    where: (v) => [...(k === 'parteneri' ? [['/parteneri', 'pagina Parteneri'], ['/', 'banda de parteneri de pe homepage']] : []), ...(k === 'alumni' ? [['/alumni', 'companiile alumni']] : []), ...(v.editii || []).slice(-3).map((e) => [edUrl(e), `ediția ${edLabel(e)}`])],
    dup: (q) => D.organizatii.filter((o) => norm(o.nume).includes(norm(q))),
  }])),

  /* CURRICULUM */
  ...Object.fromEntries([['full-day', 'Ateliere full-day', 'temă full-day'], ['seara', 'Ateliere de seară', 'temă de seară'], ['networking', 'Networking', 'temă de networking']].map(([k, label, one]) => [k, {
    label, one, cat: 'Curriculum', desc: '',
    items: () => D.teme.filter((t) => t.format === (k === 'seara' ? 'seară' : k)), row: (t) => ({ title: t.nume, meta: `în ${t.editii.length} ediții · ${t.editii.map(edLabel).join(', ')}` }),
    blank: () => ({ format: k === 'seara' ? 'seară' : k, editii: [], titluri: [] }),
    fields: (t) => fs('Tema', `${inp('nume', 'Numele temei', t.nume)}<div class="dup" id="dup" hidden></div>${sel('format', 'Format', [['full-day', 'Full-day'], ['seară', 'Seară'], ['networking', 'Networking']], t.format)}${area('desc', 'Descriere pentru pagina temei', '', { ph: 'Ce problemă rezolvă atelierul și ce iei cu tine.', tall: true })}`)
      + fs('Ce afli', rows('Puncte', ['', '', ''], [['p', 'Un lucru concret pe care îl afli']]))
      + fs('Istoric', `<p class="ro" style="margin:0">Titluri folosite: ${(t.titluri || []).map(esc).join(' · ') || '—'}</p>${t.nota ? `<p class="ro">${esc(t.nota)}</p>` : ''}<small class="ro">Edițiile și trainerii temei se completează singuri din ateliere.</small>`),
    values: (t) => ({ nume: t.nume, format: t.format, id: t.id }),
    preview: (v) => `<div class="sp-box"><small>${esc(cap(v.format || ''))}</small><b>${esc(v.nume || 'Numele temei')}</b><p>${esc(v.desc || 'Descrierea apare aici.')}</p></div>`,
    where: (v) => (k === 'full-day' ? [[`/teme/${v.id || 'tema-noua'}`, 'pagina temei'], ['/teme', 'lista temelor'], ['/', 'curriculumul de pe homepage']] : [[`/teme#${v.id || 'tema-noua'}`, 'secțiunea ei din Teme']]),
    dup: (q) => D.teme.filter((t) => norm(t.nume).includes(norm(q))),
  }])),
};

/* ---------- TEXTE DE PE SITE ---------- */
const TEXTE = {
  acasa: { label: 'Acasă', url: '/', blocks: [['Eticheta de sus', 'Acceleratorul Romanian Business Leaders · din 2013'], ['Titlul mare', 'Crește-ți compania alături de antreprenorii care au făcut-o deja.'], ['Textul de sub titlu', 'Trei luni de ateliere cu lideri de business români, un grup selectat de colegi antreprenori și acces la comunitatea RBL.'], ['Cum funcționează · titlu', 'Un trimestru în care te uiți strategic la compania ta.'], ['Oameni · titlu', 'Oameni care vorbesc din ce trăiesc.'], ['Pentru cine e · titlu', 'Ești potrivit pentru Antreprenoria?'], ['Parteneri · titlu', 'Companiile care fac posibil programul.']] },
  despre: { label: 'Despre', url: '/despre', blocks: [['Titlul mare', 'Cresc antreprenorii, crește România.'], ['Programul · titlu', 'Cel mai longeviv program educațional al RBL.'], ['Echipa · titlu', 'Oamenii din spatele programului.'], ['Contact · titlu', 'Scrie-ne sau treci pe la noi.'], ['Adresa', 'Calea Dorobanți 42, et. 3, ap. 5, Sector 1, București']] },
  program: { label: 'Program', url: '/program', blocks: [['Titlul mare', 'Trei luni în care te uiți strategic la compania ta.'], ['O zi de atelier · titlu', 'O zi de atelier, de la cafea la networking.'], ['O zi de atelier · text', 'Fiecare atelier full-day are aceeași structură: dimineața un trainer lucrează aplicat cu grupa, după-amiaza doi antreprenori povestesc cum au rezolvat exact problema zilei, seara networking cu colegii.'], ['Formatul · text', 'Temele full-day sunt aceleași de la o ediție la alta; atelierele de seară s-au schimbat.']] },
  aplica: { label: 'Aplică', url: '/aplica', blocks: [['Titlul mare', 'Locul tău la Antreprenoria.'], ['Textul de sub titlu', 'Durează două minute. Echipa programului verifică eligibilitatea companiei și te contactează. Nu plătești nimic acum.'], ['Cine poate aplica', 'Companii cu cifra de afaceri între 0,5 și 10 mil. €'], ['Textul acordului', 'Sunt de acord ca Fundația Romanian Business Leaders să folosească aceste date pentru selecția participanților și să mă contacteze despre program.']] },
  meniu: { label: 'Meniu & footer', url: '/', blocks: [['Footer · mesaj', 'Cresc antreprenorii, crește România.'], ['Footer · text', 'Program al Fundației Romanian Business Leaders, din 2013.'], ['Meniu · Ediții', 'Două ediții pe an în București, plus Cluj.'], ['Buton principal', 'Aplică']] },
};
function vTexte(k) {
  const t = TEXTE[k];
  return `${pendingBar()}<div class="head"><div><div class="crumb">← Texte de pe site · entități › Texte de pe site › ${t.label}</div><h1>${t.label}</h1></div><a class="btn" href="${t.url}" target="_blank">Vezi pagina ↗</a><button class="primary" data-save-texts>Salvează</button></div>
  <div class="chips">${Object.entries(TEXTE).map(([id, x]) => `<button class="${id === k ? 'on' : ''}" data-texte="${id}">${x.label} · ${x.blocks.length}</button>`).join('')}</div>
  <div class="txt-grid"><div>${t.blocks.map(([l, v]) => `<div class="fs" style="gap:6px"><div class="f"><label>${l}</label>${v.length > 70 ? `<textarea name="t">${esc(v)}</textarea>` : `<input name="t" value="${esc(v)}">`}<small>${v.length} caractere</small></div></div>`).join('')}</div>
    <div class="sitebox"><div class="sp"><div class="sp-lab">Cum arată pe site</div><div class="sp-hero" id="txt-prev"><small>${esc(t.blocks[0][1]).slice(0, 60)}</small><b>${esc(t.blocks[1]?.[1] || t.blocks[0][1])}</b><p>${esc(t.blocks[2]?.[1] || '')}</p></div></div>
    <p class="ro">Textele care vin din entități (nume, cifre, date, liste) nu apar aici: se schimbă din entitatea lor. Aici sunt doar titlurile și frazele paginilor.</p></div></div>`;
}

/* ---------- PRIVIREA DE ANSAMBLU ---------- */
const CATS = [
  { t: 'Program', ic: 'program', d: 'Identitatea programului, metodologia, cifrele și echipa.', site: ['/despre', '/program'], lists: ['identitate', 'metodologie', 'cifre', 'echipa'] },
  { t: 'Ediții', ic: 'editii', d: 'Fiecare ediție cu atelierele, participanții și partenerii ei.', site: ['/editii/…', '/aplica'], lists: ['editii', 'ateliere', 'locatii'] },
  { t: 'Oameni', ic: 'oameni', d: 'O singură fișă pe om, chiar dacă are mai multe roluri.', site: ['/traineri', '/alumni'], lists: ['traineri', 'invitati', 'facilitatori', 'participanti', 'echipa'] },
  { t: 'Organizații', ic: 'companii', d: 'O singură fișă pe companie, cu toate rolurile ei.', site: ['/parteneri'], lists: ['alumni', 'parteneri', 'speakeri'], views: () => [['Din alumni, parteneri', D.organizatii.filter((o) => o.ciclu).length], ['Cu mai multe roluri', D.organizatii.filter((o) => o.tipuri.filter((t) => t !== 'organizator').length > 1).length]] },
  { t: 'Curriculum', ic: 'teme', d: 'Temele atelierelor, refolosite de la o ediție la alta.', site: ['/teme', '/teme/…'], lists: ['full-day', 'seara', 'networking'], views: () => [['Matricea pe ediții', null]] },
  { t: 'Texte de pe site', ic: 'texte', d: 'Titlurile și frazele paginilor, care nu țin de o entitate anume.', site: ['/', '/despre', '/program', '/aplica'], texte: true },
];
function vEnt() {
  return `${pendingBar()}<div class="head"><div><div class="crumb">manage › entități</div><h1>Entitățile Antreprenoria</h1></div>
    <input type="search" placeholder="Caută oameni, organizații, ateliere…"><button class="primary" data-new="">+ Adaugă</button></div>
  <div class="grid">${CATS.map((c) => {
    const lists = c.texte ? Object.entries(TEXTE).map(([k, x]) => `<div class="gl"><a href="#" data-texte="${k}">${x.label}</a><em>${x.blocks.length}</em></div>`).join('')
      : c.lists.map((k) => `<div class="gl"><a href="#" data-list="${k}">${TYPES[k].label}</a><em>${TYPES[k].single ? '' : TYPES[k].items().length}</em>${TYPES[k].one ? `<button class="add" data-new="${k}" title="Adaugă ${esc(TYPES[k].one)}">+</button>` : ''}</div>`).join('');
    const n = c.texte ? Object.values(TEXTE).reduce((s, x) => s + x.blocks.length, 0) : c.lists.reduce((s, k) => s + (TYPES[k].single ? 0 : TYPES[k].items().length), 0);
    return `<div class="card cat"><div class="cat-top"><span class="cat-ic">${icon(c.ic)}</span><span class="cat-n">${n}</span></div>
      <div><h3>${c.t} ${c.texte ? '<span class="tag ok">nou</span>' : ''}</h3><p>${c.d}</p></div>
      <div class="onsite">Pe site: ${c.site.map((s) => `<code>${s}</code>`).join(' ')}</div>
      <div class="glist">${lists}${c.views ? `<div class="glabel">Vederi calculate</div>${c.views().map(([v, k]) => `<div class="gl calc"><a href="#">${v}</a><em>${k ?? ''}</em><i>automat</i></div>`).join('')}` : ''}</div></div>`;
  }).join('')}</div>
  <div class="card" style="margin-top:18px"><h3>Ce s-a schimbat față de acum</h3><ul class="note-list">
    <li><b>Aceleași 5 categorii, în același loc.</b> Se adaugă doar <b>Texte de pe site</b>, pentru titlurile și frazele paginilor.</li>
    <li>Fiecare categorie spune <b>în ce pagini apare pe site</b>.</li>
    <li><b>Toate listele</b> au <b>+</b> pentru adăugare și se deschid în același tip de editor: câmpurile în stânga, cum arată pe site în dreapta, plus paginile afectate.</li>
    <li><b>Vederile calculate</b> se completează singure din liste și nu se editează.</li>
    <li>Legăturile dintre entități se <b>aleg</b>, nu se scriu: atelierul își alege tema, locația, sponsorul și oamenii; ediția își alege participanții și partenerii.</li></ul></div>`;
}

/* ---------- LISTA unui tip ---------- */
function vList(k) {
  const ty = TYPES[k], items = ty.items(), cat = CATS.find((c) => c.lists?.includes(k));
  return `${pendingBar()}<div class="head"><div><div class="crumb">← ${cat.t} · entități › ${cat.t} › ${ty.label}</div><h1>${ty.label} <span class="n" style="font-weight:400;color:var(--muted);font-size:15px">${ty.single ? '' : items.length}</span></h1></div>
    ${ty.single ? '' : '<input type="search" id="lq" placeholder="Filtrează…">'}${ty.one ? `<button class="primary" data-new="${k}">+ Adaugă ${esc(ty.one)}</button>` : ''}</div>
  <p class="lead" style="margin-top:-6px">${esc(ty.desc || '')} Click pe un rând îl deschide pentru editare.</p>
  <div class="chips">${cat.lists.map((x) => `<button class="${x === k ? 'on' : ''}" data-list="${x}">${TYPES[x].label}${TYPES[x].single ? '' : ' · ' + TYPES[x].items().length}</button>`).join('')}</div>
  <div class="rows">${items.slice(0, 60).map((x) => rowHtml(k, x)).join('')}${items.length > 60 ? `<p class="ro">… și încă ${items.length - 60}. Filtrează ca să găsești restul.</p>` : ''}</div>`;
}
function rowHtml(k, x) {
  const r = TYPES[k].row(x), id = x.id;
  const st = drafts.has(k + ':' + id) ? '<span class="st draft">modificat, nepublicat</span>' : hidden.has(id) ? '<span class="st off">ascuns pe site</span>' : '<span class="st on">pe site</span>';
  const lead = r.img ? `<img class="av ${r.sq ? 'sq' : ''}" src="${esc(r.img)}" alt="" loading="lazy">` : r.num != null ? `<span class="av num">${esc(r.num)}</span>` : `<span class="av">${initials(r.title)}</span>`;
  return `<div class="row" data-edit-type="${k}" data-edit-id="${esc(id)}" data-q="${esc(norm(r.title + ' ' + r.meta))}">${lead}<div><h3>${esc(r.title)}</h3><div class="meta">${esc(r.meta || '')}</div></div><div class="acts">${st}<button class="sm">Editează</button></div></div>`;
}

/* ---------- EDITORUL (același pentru toate tipurile) ---------- */
let cur = null;
function openEditor(k, x, isNew) {
  const ty = TYPES[k], dr = $('#drawer');
  cur = { k, x, isNew };
  const v = ty.values(x);
  dr.innerHTML = `<div class="dr-head"><h2>${isNew ? `Adaugă ${esc(ty.one)}` : esc(ty.row(x).title)}</h2><span class="tag grey">${esc(ty.cat)} · ${esc(ty.label)}</span><button data-close>Închide ✕</button></div>
  <div class="dr-body"><form id="ef" onsubmit="return false">${ty.fields(x)}</form>
    <div class="sitebox"><div class="sp"><div class="sp-lab">Cum arată pe site</div><div id="sp">${ty.preview(v)}</div></div>
      <div><div class="sp-lab">Apare pe aceste pagini</div><div class="where" id="where">${whereHtml(ty.where({ ...x, ...v }))}</div></div></div></div>
  <div class="dr-foot"><span>${isNew ? 'Se salvează ca ciornă. Apare pe site după „Publică”.' : 'Modificările rămân în panou până apeși „Publică pe site”.'}</span>${isNew || ty.single ? '' : '<button class="danger">Șterge</button>'}<button data-close>Anulează</button><button class="primary" data-save>${isNew ? 'Adaugă' : 'Salvează'}</button></div>`;
  dr.classList.add('on'); $('#scrim').classList.add('on'); dr.scrollTop = 0;
  const sync = () => {
    const f = $('#ef'), val = { ...v };
    $$('input[name],textarea[name],select[name]', f).forEach((el) => {
      if (el.type === 'checkbox') { if (!Array.isArray(val[el.name]) || !val._c?.[el.name]) { val[el.name] = []; (val._c ||= {})[el.name] = 1; } if (el.checked) val[el.name].push(el.value); }
      else if (el.type === 'radio') { if (el.checked) val[el.name] = el.value; }
      else val[el.name] = el.value;
    });
    const rowsVals = $$('.lrows input', f).map((i) => i.value);
    if (k === 'metodologie') val.puncte = rowsVals;
    $('#sp').innerHTML = ty.preview(val);
    $('#where').innerHTML = whereHtml(ty.where({ ...x, ...val }));
    if (isNew && ty.dup && $('#dup')) dupCheck(ty, val.nume || '', k);
  };
  dr.oninput = sync; dr.onchange = sync;
  setTimeout(() => $('input,textarea', $('#ef'))?.focus(), 260);
}
const whereHtml = (w) => w.map(([u, l]) => `<a href="${u}" target="_blank"><span>${esc(l)}</span><small>${esc(u)}</small></a>`).join('') || '<p class="ro">Completează câmpurile ca să vezi unde apare.</p>';
function dupCheck(ty, q, k) {
  const box = $('#dup');
  if (norm(q).trim().length < 3) { box.hidden = true; return; }
  const hits = ty.dup(q.trim()).slice(0, 3);
  box.hidden = !hits.length;
  box.innerHTML = `<b>Există deja în entități:</b>${hits.map((h) => `<div class="d-row">${h.imagine || h.logo ? `<img class="av ${h.logo ? 'sq' : ''}" src="${esc(h.imagine || h.logo)}" alt="">` : `<span class="av">${initials(h.nume)}</span>`}<div><b>${esc(h.nume)}</b><br><small>${h.tipuri ? esc(h.tipuri.join(', ')) : esc(h.format || '')}${h.editii?.length ? ' · ' + h.editii.map(edLabel).join(', ') : ''}</small></div><button class="sm" data-dup-open="${esc(h.id)}">Deschide fișa</button></div>`).join('')}<small>Dacă e același, deschide fișa existentă și adaugă rolul nou, în loc să creezi încă una.</small>`;
}
function closeEditor() { $('#drawer').classList.remove('on'); $('#scrim').classList.remove('on'); }
function findType(id) { for (const [k, ty] of Object.entries(TYPES)) { const x = ty.items().find((i) => i.id === id); if (x) return [k, x]; } return []; }

function pickNew() {
  const dr = $('#drawer');
  dr.innerHTML = `<div class="dr-head"><h2>Ce vrei să adaugi?</h2><button data-close>Închide ✕</button></div>
  <div style="padding:20px;overflow:auto">${CATS.filter((c) => c.lists).map((c) => `<div class="fs"><h4>${c.t}</h4><div class="checks-r">${[...new Set(c.lists)].filter((k) => TYPES[k].one).map((k) => `<button data-new="${k}">+ ${esc(TYPES[k].one)}</button>`).join('')}</div></div>`).join('')}</div>`;
  dr.classList.add('on'); $('#scrim').classList.add('on');
}

/* ---------- PUBLICARE ---------- */
function pendingBar() {
  return `<div class="pending" ${pending.length ? '' : 'hidden'}><span><b>${pending.length} ${pending.length === 1 ? 'modificare nepublicată' : 'modificări nepublicate'}</b> · ${pending.map(esc).join(', ')}</span><button>Vezi diferențele</button><button class="primary" data-publish>Publică pe site</button></div>`;
}
function vPub() {
  return `<div class="head"><div><div class="crumb">preview</div><h1>Cum ajunge o modificare pe site</h1></div></div>
  <div class="flow"><div><i>1</i><b>Editezi în panou</b>Orice entitate sau text. Vezi pe loc cum va arăta.</div><div><i>2</i><b>Se salvează ca ciornă</b>Bara „modificări nepublicate” arată ce s-a schimbat.</div><div><i>3</i><b>Publică pe site</b>Un buton. Site-ul se regenerează din entități.</div><div><i>4</i><b>Online în ~1 minut</b>Se actualizează toate paginile afectate: fișa, ediția, tema, homepage-ul.</div></div>
  <div class="grid2" style="margin-top:16px">
    <div class="card"><h3>Ce rămâne neatins</h3><ul class="note-list"><li><b>Datele preluate de pe site-ul vechi</b> rămân punctul de pornire. Ce editezi se păstrează separat, deasupra lor, deci nu se pierde.</li><li><b>Vederile calculate</b> (parcursul companiilor, matricea temelor, cifrele agregate) se refac singure.</li><li><b>Cifrele de business</b> ale participanților rămân doar în panou. Pe site apar numai agregate.</li></ul></div>
    <div class="card"><h3>De hotărât înainte de construcție</h3><ul class="note-list"><li><b>Cine editează și de unde.</b> Acum panoul de pe Vercel e doar pentru vizualizare. Pentru editare online e nevoie de cont cu parolă și de o bază de date pentru modificări (același Supabase ca la Leads).</li><li><b>Publicare imediată sau cu aprobare.</b></li><li><b>Fotografiile și logo-urile</b> încărcate din panou au nevoie de un loc de stocare (tot Supabase).</li></ul></div></div>`;
}

/* ---------- navigare ---------- */
let view = { v: 'ent' };
function render() {
  $$('.pv-bar [data-pv]').forEach((b) => b.classList.toggle('on', b.dataset.pv === view.pv));
  $('#view').innerHTML = view.v === 'list' ? vList(view.k) : view.v === 'texte' ? vTexte(view.k) : view.v === 'pub' ? vPub() : vEnt();
  window.scrollTo(0, 0);
}
const DEMO = { ent: () => ({ v: 'ent' }), editii: () => ({ v: 'list', k: 'editii', open: ['editii', ED['bucuresti-22']] }), ateliere: () => ({ v: 'list', k: 'ateliere', open: ['ateliere', TYPES.ateliere.items()[0]] }), oameni: () => ({ v: 'list', k: 'traineri' }), org: () => ({ v: 'list', k: 'parteneri', open: ['parteneri', O['garanti-bbva']] }), teme: () => ({ v: 'list', k: 'full-day', open: ['full-day', T.vanzari] }), texte: () => ({ v: 'texte', k: 'acasa' }), new: () => ({ v: 'ent', pick: true }), pub: () => ({ v: 'pub' }) };
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-pv],[data-list],[data-texte],[data-edit-type],[data-new],[data-close],[data-save],[data-save-texts],[data-publish],[data-dup-open],.add-row');
  if (!t) { if (e.target.id === 'scrim') closeEditor(); return; }
  e.preventDefault();
  const d = t.dataset;
  if (t.classList.contains('add-row')) { const box = t.previousElementSibling.classList.contains('lrows') ? t.previousElementSibling : t.parentElement.querySelector('.lrows'); const last = box.lastElementChild; if (last) { const c = last.cloneNode(true); $$('input', c).forEach((i) => { i.value = ''; }); box.append(c); } return; }
  if (d.pv) { closeEditor(); const s = DEMO[d.pv](); view = { ...s, pv: d.pv }; render(); if (s.open) openEditor(s.open[0], s.open[1]); if (s.pick) pickNew(); return; }
  if (d.list) { closeEditor(); view = { v: 'list', k: d.list, pv: view.pv }; render(); return; }
  if (d.texte) { closeEditor(); view = { v: 'texte', k: d.texte, pv: view.pv }; render(); return; }
  if (d.editType) { const x = TYPES[d.editType].items().find((i) => String(i.id) === d.editId); if (x) openEditor(d.editType, x); return; }
  if (d.dupOpen) { const [k, x] = findType(d.dupOpen); if (k) openEditor(k, x); return; }
  if (d.new !== undefined) { if (!d.new) return pickNew(); const ty = TYPES[d.new]; openEditor(d.new, ty.blank ? ty.blank() : {}, true); return; }
  if (d.close !== undefined) { closeEditor(); return; }
  if (d.save !== undefined) { const nm = $('#ef [name=nume]')?.value || $('#ef [name=titlu]')?.value || $('#ef [name=ce]')?.value || TYPES[cur.k].one || 'modificare'; if (!cur.isNew) drafts.add(cur.k + ':' + cur.x.id); pending.push(nm.trim() || TYPES[cur.k].one); closeEditor(); render(); toast(`Salvat: ${nm}. Încă nepublicat.`); return; }
  if (d.saveTexts !== undefined) { pending.push(`texte ${TEXTE[view.k].label}`); render(); toast('Texte salvate. Încă nepublicate.'); return; }
  if (d.publish !== undefined) { toast(`În varianta reală: ${pending.length} modificări publicate pe site.`); pending.length = 0; drafts.clear(); render(); }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'lq') { const q = norm(e.target.value); $$('.row').forEach((r) => { r.hidden = q && !r.dataset.q.includes(q); }); }
  if (e.target.name === 't' && view.v === 'texte') { const v = $$('[name=t]').map((i) => i.value); $('#txt-prev').innerHTML = `<small>${esc(v[0]).slice(0, 60)}</small><b>${esc(v[1] || v[0])}</b><p>${esc(v[2] || '')}</p>`; }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeEditor(); });

fetch('/api/entitati').then((r) => r.json()).then((d) => {
  D = d;
  D.editii.forEach((e) => { ED[e.id] = e; }); D.organizatii.forEach((o) => { O[o.id] = o; }); D.oameni.forEach((p) => { P[p.id] = p; }); D.locatii.forEach((l) => { L[l.id] = l; }); D.teme.forEach((t) => { T[t.id] = t; });
  $('#n-ent').textContent = D.editii.length + D.editii.reduce((n, e) => n + e.ateliere.length, 0) + D.oameni.length + D.organizatii.length + D.locatii.length + D.teme.length;
  document.body.insertAdjacentHTML('beforeend', `<datalist id="dl-org">${D.organizatii.map((o) => `<option value="${esc(o.nume)}">`).join('')}</datalist><datalist id="dl-people">${D.oameni.map((p) => `<option value="${esc(p.nume)}">`).join('')}</datalist>`);
  view.pv = 'ent'; render();
});
