/* CMS-ul panoului: editare, adăugare, ascundere și publicare pentru toate entitățile și textele paginilor.
   Modificările se scriu prin PUT /api/editari în data/curare/editari.json; serverul reconstruiește entitățile imediat,
   iar „Publică pe site” le trimite pe git (Vercel publică singur). Pe Vercel panoul rămâne doar pentru vizualizare. */
const CMS = (() => {
  const S = { on: false, pagini: [], texte: {}, pending: [], E: null };
  let D = null;
  const nrm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
  const ED = (id) => D.editii.find((e) => e.id === id);
  const eLab = (id) => { const e = ED(id); return e ? (e.serie === 'Cluj' ? `Cluj #${e.numar}` : `#${e.numar}`) : id; };
  const eUrl = (id) => { const e = ED(id); return e ? (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`) : '/editii'; };
  const Pid = (id) => D.oameni.find((p) => p.id === id), Oid = (id) => D.organizatii.find((o) => o.id === id);
  const eds = () => D.editii.slice().sort((a, b) => (b.an - a.an) || (a.sezon === b.sezon ? 0 : a.sezon === 'toamnă' ? -1 : 1) || (a.serie === 'Cluj') - (b.serie === 'Cluj'));
  const FULL = ['viziune', 'model-de-business', 'marketing', 'vanzari', 'cultura'];
  const dayRo = (s) => (s ? new Date(s + 'T12:00').toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const hidden = (tip, id) => (S.E?.ascunse || []).includes(`${tip}:${id}`);
  const isNew = (tip, id) => !!S.E?.modificari?.[tip]?.[id]?._nou;

  /* ---------- câmpuri ---------- */
  const inp = (k, label, v, o = {}) => `<div class="f"><label>${label}</label><input name="${k}" value="${esc(v ?? '')}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.type ? `type="${o.type}"` : ''} ${o.list ? `list="${o.list}"` : ''} ${o.req ? 'required' : ''} autocomplete="off">${o.hint ? `<small>${o.hint}</small>` : ''}</div>`;
  const area = (k, label, v, o = {}) => `<div class="f"><label>${label}</label><textarea name="${k}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.tall ? 'class="tall"' : ''}>${esc(v ?? '')}</textarea>${o.hint ? `<small>${o.hint}</small>` : ''}</div>`;
  const sel = (k, label, opts, v, o = {}) => { if (v && !opts.some(([x]) => String(x) === String(v))) opts = [[v, v], ...opts]; return `<div class="f"><label>${label}</label><select name="${k}">${o.empty != null ? `<option value="">${o.empty}</option>` : ''}${opts.map(([val, l]) => `<option value="${esc(val)}" ${String(val) === String(v ?? '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>${o.hint ? `<small>${o.hint}</small>` : ''}</div>`; };
  const checks = (k, opts, on, type = 'checkbox') => `<div class="checks-r">${opts.map(([val, l]) => `<label><input type="${type}" name="${k}" value="${esc(val)}" ${[].concat(on ?? []).includes(val) ? 'checked' : ''}>${esc(l)}</label>`).join('')}</div>`;
  const fs_ = (title, body) => `<div class="fs"><h4>${title}</h4>${body}</div>`;
  const f2 = (...a) => `<div class="f2">${a.join('')}</div>`;
  // rânduri repetabile: fiecare rând are câmpuri cu data-c (cheia coloanei)
  const rows = (name, label, items, cols, addLabel = '+ rând') => `<div class="f" data-rows="${name}"><label>${label}</label><div class="lrows">${(items.length ? items : [{}]).map((it) => rowTpl(cols, it)).join('')}</div><button type="button" class="sm" data-add-row>${addLabel}</button></div>`;
  const rowTpl = (cols, it) => `<div class="lrow">${cols.map(([k, ph, w, kind]) => kind === 'chips' ? chipBox(k, it[k] || [], ph) : kind?.select ? `<select data-c="${k}" style="flex:${w || 1}">${kind.select.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(it[k] ?? '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>` : `<input data-c="${k}" value="${esc(typeof it === 'string' ? it : it[k] ?? '')}" placeholder="${esc(ph)}" style="flex:${w || 1}" ${kind === 'num' ? 'inputmode="numeric"' : ''}>`).join('')}<button type="button" class="sm" data-del-row title="Șterge rândul">✕</button></div>`;
  // etichete (oameni, organizații) alese din listă
  const chipBox = (k, ids, ph, list = 'cms-people') => `<div class="rel" data-chips="${k}" style="flex:1.4">${ids.map((x) => chip(x)).join('')}<input class="rel-add" list="${list}" placeholder="${esc(ph)}"></div>`;
  const chip = (x) => { const v = typeof x === 'string' ? { id: x } : x; const p = Pid(v.persoana || v.id); return `<span data-v="${esc(JSON.stringify(v))}">${esc(p?.nume || Oid(v.organizatie || v.id)?.nume || v.nume || v.persoana || v.id)}${v.rol ? ` <i>${esc(v.rol)}</i>` : ''}<button type="button" data-del-chip title="Scoate">✕</button></span>`; };
  const photo = (k, img, logo) => `<div class="photo" data-photo="${k}"><span class="av ${logo ? 'sq' : ''}">${img ? `<img class="av ${logo ? 'sq' : ''}" src="${esc(img)}" alt="">` : '?'}</span><div class="drop"><input type="hidden" name="${k}" value="${esc(img || '')}">Trage aici ${logo ? 'logo-ul (SVG sau PNG)' : 'o fotografie'} sau <label class="lnk">alege un fișier<input type="file" accept="image/*" hidden></label>${img ? ' · <a href="#" data-photo-clear>scoate</a>' : ''}<br><small>${logo ? 'Ideal SVG sau PNG pe fundal transparent.' : 'Se micșorează automat pentru site.'}</small></div></div>`;
  const visField = (tip, id) => (S.on ? fs_('Vizibilitate', checks('_vis', [['on', 'Apare pe site'], ['off', 'Ascuns (rămâne în panou)']], hidden(tip, id) ? 'off' : 'on', 'radio')) : '');

  /* ---------- tipurile ---------- */
  // rolurile care se pot pune de mână (cât timp omul nu e încă în agenda vreunui atelier); participarea vine doar din ediții
  const ROLE_MANUAL = [['trainer', 'Trainer'], ['antreprenor invitat', 'Antreprenor invitat'], ['facilitator', 'Facilitator'], ['echipă', 'Echipa programului']];
  const RL = { trainer: 'Trainer', 'antreprenor invitat': 'Antreprenor invitat', facilitator: 'Facilitator', invitat: 'Invitat' };
  const t0 = () => new Date().toISOString().slice(0, 10);
  // participanții devin alumni doar după arhivarea ediției (starea „Ediție închisă”), nu automat la final
  const edEnded = (e) => /închis|încheiat/i.test(e.status || '');
  const partsOf = (id) => D.editii.filter((e) => e.participanti.some((x) => x.persoana === id));
  // rolurile unui om, cu edițiile lor, calculate din agende și participări
  function rolesOf(p) {
    const out = [], by = {};
    (p.aparitii || []).forEach((a) => { (by[a.rol] ||= new Set()).add(a.editie); });
    Object.entries(by).forEach(([r, s]) => out.push([RL[r] || cap(r), [...s]]));
    const parts = partsOf(p.id), alumni = parts.filter(edEnded), now = parts.filter((e) => !edEnded(e));
    if (now.length) out.push(['Participant', now.map((e) => e.id)]);
    if (alumni.length) out.push(['Alumni', alumni.map((e) => e.id)]);
    return out;
  }
  const roleLabel = (t, id) => { const parts = id ? partsOf(id) : []; return t.includes('trainer') ? 'Trainer' : t.includes('antreprenor invitat') ? 'Antreprenor invitat' : t.includes('facilitator') ? 'Facilitator' : parts.some((e) => !edEnded(e)) ? 'Participant' : t.includes('participant') ? 'Alumni' : t.includes('echipă') ? 'Echipă' : 'Participant'; };
  const personRow = (p) => ({ img: p.imagine, title: p.nume, meta: `${p.companii?.[p.companii.length - 1] || ''}${p.editii?.length ? ` · ${p.editii.length === 1 ? '1 ediție' : p.editii.length + ' ediții'}: ${p.editii.slice(-4).map(eLab).join(', ')}` : ''}` });
  const personCard = (v) => `<div class="sp-card"><div class="ph" style="${v.imagine ? `background-image:url('${esc(v.imagine)}')` : ''}">${v.imagine ? '' : initials(v.nume) || '?'}</div><div class="tx"><b>${esc(v.nume || 'Nume Prenume')}</b><small>${esc(v.functie || '')}${v.functie && v.companie ? ', ' : ''}${esc(v.companie || '')}</small><br><span class="pill">${esc(roleLabel([].concat(v.tipuri || []), v.id))}</span></div></div>`;
  function personWhere(v) {
    const w = [], t = [].concat(v.tipuri || []);
    if (t.includes('echipă')) w.push(['/despre#echipa', 'echipa, pe pagina Despre']);
    if (t.some((x) => ['trainer', 'antreprenor invitat', 'facilitator', 'invitat'].includes(x))) w.push(['/', 'traineri pe homepage'], ['/traineri', 'lista trainerilor (în lucru)']);
    (v.editii || []).slice(-3).forEach((e) => w.push([eUrl(e), `ediția ${eLab(e)}`]));
    if (v.id && partsOf(v.id).length) w.push(['/', 'cifrele agregate ale edițiilor (fără nume)']);
    [...new Set((v.aparitii || []).map((a) => a.tema))].filter((x) => FULL.includes(x)).slice(0, 2).forEach((x) => w.push([`/teme/${x}`, 'pagina temei']));
    return w;
  }
  // pagina de alumni: aceeași regulă ca pe site (site/alumni.js › hasPage): alumnus + text „despre” completat
  function alumniPage(p) {
    const parts = p.id ? partsOf(p.id) : [];
    if (!parts.length) return '';
    const isAlum = parts.some(edEnded), full = (p.bio || '').trim().length > 20;
    const msg = !isAlum ? 'Devine alumnus când ediția e arhivată. Pagina lui de alumni apare atunci, dacă textul de mai sus e completat.'
      : full ? `Are pagină de alumni pe site: <a href="/alumni/${esc(p.id)}" target="_blank" rel="noopener">/alumni/${esc(p.id)} ↗</a>`
      : `Nu are încă pagină de alumni. Apare când completezi textul de mai sus (cel puțin o frază). <a href="/alumni/${esc(p.id)}?previzualizare" target="_blank" rel="noopener">Previzualizează ↗</a>`;
    return `<div class="al-status ${full && isAlum ? 'ok' : ''}">${msg}</div>`;
  }
  // compania curentă a omului (ultima din fișă) și adresa de site scrisă fără „https://”
  const orgOf = (p) => Oid(p.organizatii?.[p.organizatii.length - 1]) || D.organizatii.find((o) => nrm(o.nume) === nrm(p.companii?.[p.companii.length - 1]));
  const normUrl = (u) => { u = String(u || '').trim(); return !u ? null : /^https?:\/\//i.test(u) ? u : 'https://' + u; };
  // ediția la care se adaugă de obicei participanți: cea mai nouă care nu s-a încheiat
  const edDefault = () => eds().find((e) => !edEnded(e))?.id || eds()[0].id;
  const personType = (kind, label, one, desc) => ({
    tip: 'oameni', label, one, desc, kind,
    items: () => D.oameni.filter((p) => (kind === 'facilitator' ? p.tipuri.includes('facilitator') || p.tipuri.includes('invitat') : p.tipuri.includes(kind))),
    row: personRow, blank: () => ({ tipuri: kind === 'participant' ? [] : [kind], aparitii: [], editii: [], companii: [], functii: [], _addPart: kind === 'participant' ? edDefault() : null }),
    fields: (p) => {
      const part = partsOf(p.id).map((e) => { const x = e.participanti.find((y) => y.persoana === p.id); return { editie: e.id, companie: Oid(x.organizatie)?.nume || '', cifra_afaceri: x.cifra_afaceri ?? '', angajati: x.angajati ?? '' }; });
      if (p._addPart && !part.some((x) => x.editie === p._addPart)) part.unshift({ editie: p._addPart, companie: p.companii?.[p.companii.length - 1] || '', cifra_afaceri: '', angajati: '' });
      const showParts = kind === 'participant' || part.length;
      const roles = p.id ? rolesOf(p) : [];
      const manualOn = (p.tipuri || []).filter((t) => t === 'echipă' || !(p.aparitii || []).some((a) => a.rol === t));
      return fs_('Cine e', `${inp('nume', 'Nume și prenume', p.nume, { ph: 'ex. Andreea Popescu', req: true })}<div class="dup" id="dup" hidden></div>${photo('imagine', p.imagine)}${inp('linkedin', 'LinkedIn', p.linkedin, { ph: 'https://www.linkedin.com/in/…' })}`)
        + (showParts ? fs_('Participări la ediții <span class="tag warn">cifrele rămân doar în panou</span>', rows('participari', 'Ediția, compania și cifrele declarate la înscriere', part, [['editie', '', 1, { select: eds().map((e) => [e.id, `${eLab(e.id)}${edEnded(e) ? '' : ' · în curs'}`]) }], ['companie', 'Companie', 1.4], ['cifra_afaceri', 'Cifra de afaceri (lei)', 1, 'num'], ['angajati', 'Angajați', .6, 'num']], '+ participare la altă ediție') + '<small class="ro">Până la arhivarea ediției omul apare ca participant; după arhivare devine alumnus. Pe site apar doar cifrele agregate.</small>') : '')
        + fs_('Roluri în program', `${roles.length ? `<div class="roles">${roles.map(([r, L]) => `<span><b>${esc(r)}</b> ${L.map(eLab).join(', ')}</span>`).join('')}</div><small class="ro">Se calculează singure: din agenda atelierelor (trainer, invitat) și din participări (participant, alumni).</small>` : '<small class="ro">Încă fără roluri în ediții. Participarea se adaugă mai sus; trainerii și invitații se pun în agenda atelierelor.</small>'}
          <div class="f"><label>Adaugă manual</label>${checks('tipuri', ROLE_MANUAL, manualOn)}<small>Pentru cine nu e încă în agenda unui atelier (de ex. un trainer nou) sau face parte din echipă.</small></div>`)
        + fs_('Companie și funcție', f2(inp('companie', 'Companie', p.companii?.[p.companii.length - 1], { list: 'cms-orgs', ph: 'Caută sau scrie una nouă', hint: 'Dacă nu există, se adaugă și în Organizații.' }), inp('functie', 'Funcția afișată', p.functii?.[p.functii.length - 1], { ph: 'ex. Fondator & CEO' })) + inp('site', 'Site-ul companiei', orgOf(p)?.url, { ph: 'https://…', hint: 'Se salvează la companie și apare pe pagina de alumni („Site-ul companiei”).' }))
        + fs_('Prezentare', area('bio', 'Câteva rânduri despre el/ea', p.bio, { ph: kind === 'participant' ? '2–3 fraze. Apare pe pagina lui de alumni.' : '2–3 fraze. Apare pe fișa de pe site.' }) + alumniPage(p))
        + (p.aparitii?.length ? fs_('Unde apare în program', `<ul class="ro">${p.aparitii.slice(-6).reverse().map((a) => `<li><b>${eLab(a.editie)}</b> · ${esc(a.titlu || '')} · ${esc(a.rol)}</li>`).join('')}</ul><small class="ro">Aparițiile se schimbă din atelier: Ediții › ediția › Construiește › Traineri și invitați.</small>`) : '')
        + visField('oameni', p.id);
    },
    values: (p) => ({ id: p.id, nume: p.nume, imagine: p.imagine, companie: p.companii?.[p.companii.length - 1], functie: p.functii?.[p.functii.length - 1], tipuri: p.tipuri }),
    preview: personCard, where: personWhere,
    dup: (q) => D.oameni.filter((p) => nrm(q).split(/\s+/).every((x) => nrm(p.nume).includes(x))),
    async save(f, p, nou) {
      const v = form(f);
      if (!v.nume.trim()) throw new Error('Scrie numele.');
      const want = rowsVal(f, 'participari').filter((x) => x.editie);
      if (kind === 'participant' && !want.length) throw new Error('Alege ediția la care participă.');
      if (new Set(want.map((x) => x.editie)).size < want.length) throw new Error('Aceeași ediție apare de două ori la participări.');
      let orgId = null;
      if (v.companie.trim()) {
        const o = D.organizatii.find((x) => nrm(x.nume) === nrm(v.companie));
        orgId = o?.id || (await put({ op: 'entitate', tip: 'organizatii', nou: true, date: { nume: v.companie.trim(), tip: 'companie' }, eticheta: `companie nouă: ${v.companie.trim()}` })).id;
      }
      // site-ul ține de companie: îl actualizăm acolo dacă s-a schimbat
      const site = normUrl(v.site);
      if (orgId && site !== (Oid(orgId)?.url || null)) await put({ op: 'entitate', tip: 'organizatii', id: orgId, date: { url: site }, eticheta: `site: ${v.companie.trim()}` });
      const comp = [...(p.companii || []).filter((c) => nrm(c) !== nrm(v.companie)), v.companie.trim()].filter(Boolean);
      const fn = [...(p.functii || []).filter((c) => c !== v.functie), v.functie.trim()].filter(Boolean);
      // rolurile bifate de mână; participarea și aparițiile din agende se adaugă singure la reconstruire
      const date = { nume: v.nume.trim(), imagine: v.imagine || null, linkedin: v.linkedin || null, companii: comp, functii: fn, tipuri: v.tipuri, organizatii: [...new Set([...(p.organizatii || []), orgId].filter(Boolean))] };
      if (v.bio !== undefined) date.bio = v.bio.trim() || null;
      const r = await put({ op: 'entitate', tip: 'oameni', id: p.id, nou, date, eticheta: `${nou ? 'om nou' : 'om'}: ${date.nume}` });
      const id = r.id || p.id;
      if ($('[data-rows="participari"]', f)) {
        const touched = new Set([...want.map((x) => x.editie), ...partsOf(id).map((e) => e.id)]);
        for (const eid of touched) {
          const e = ED(eid), cur = e.participanti.find((x) => x.persoana === id), w = want.find((x) => x.editie === eid);
          let L = e.participanti.filter((x) => x.persoana !== id);
          if (w) {
            const o = D.organizatii.find((x) => nrm(x.nume) === nrm(w.companie || v.companie));
            const oname = (w.companie || v.companie).trim();
            const oid = o?.id || (oname ? (await put({ op: 'entitate', tip: 'organizatii', nou: true, date: { nume: oname, tip: 'companie' }, eticheta: `companie nouă: ${oname}` })).id : null);
            L = [...L, { ...(cur || {}), persoana: id, nume: date.nume, organizatie: oid, cifra_afaceri: num(w.cifra_afaceri), angajati: num(w.angajati), descriere: cur?.descriere || null, imagine: date.imagine || cur?.imagine || null }];
          }
          if (JSON.stringify(L) !== JSON.stringify(e.participanti)) await put({ op: 'participanti', id: eid, lista: L, eticheta: `participanți ${eLab(eid)}: ${date.nume}` });
        }
      }
      await visSave(f, 'oameni', id);
      return date.nume;
    },
  });
  const num = (v) => { const d = String(v ?? '').replace(/[^\d]/g, ''); return d ? Number(d) : null; };

  const STATUS = [['În pregătire', 'În pregătire'], ['Înscrieri deschise', 'Înscrieri deschise'], ['În desfășurare', 'În desfășurare'], ['Ediție închisă', 'Ediție închisă']];
  const ORG_ROLES = [['partener strategic', 'Partener strategic'], ['powered by', 'Powered by'], ['partener ediție', 'Partener ediție'], ['sponsor atelier', 'Sponsor atelier']];
  const T = {
    identitate: { tip: 'program', label: 'Identitate', single: true, desc: 'Numele, sloganul, descrierea și publicul programului.',
      items: () => [{ id: 'program', ...D.program }], row: () => ({ title: D.program.nume, meta: D.program.slogan }),
      fields: (x) => fs_('Programul', inp('nume', 'Numele programului', x.nume) + inp('slogan', 'Slogan', x.slogan) + inp('de_cand', 'Din anul', x.de_cand))
        + fs_('Descriere', area('descriere', 'Ce este Antreprenoria', x.descriere, { tall: true }) + area('audienta', 'Cui se adresează', x.audienta)),
      values: (x) => ({ slogan: x.slogan, descriere: x.descriere }),
      preview: (v) => `<div class="sp-hero"><small>Despre Antreprenoria</small><b>${esc(cap(v.slogan || ''))}</b><p>${esc(String(v.descriere || '').slice(0, 220))}…</p></div>`,
      where: () => [['/despre', 'pagina Despre'], ['/program', 'introducerea din Program']],
      async save(f) { const v = form(f); await put({ op: 'entitate', tip: 'program', date: { nume: v.nume, slogan: v.slogan, de_cand: num(v.de_cand) || v.de_cand, descriere: v.descriere, audienta: v.audienta }, eticheta: 'identitatea programului' }); return 'identitatea programului'; } },
    metodologie: listType('metodologie', 'Metodologie', 'pas de metodologie', 'Pașii metodei, cu punctele fiecăruia.',
      (m, i) => ({ num: i + 1, title: cap(String(m.titlu).toLowerCase()), meta: `${m.puncte.length} puncte` }),
      (m) => fs_('Pasul', inp('titlu', 'Titlu', cap(String(m.titlu || '').toLowerCase()), { ph: 'ex. Ateliere aplicate', req: true }) + rows('puncte', 'Puncte', (m.puncte || []).map((p) => ({ p })), [['p', 'Un punct, o frază']])),
      (f) => { const v = form(f); return { titlu: v.titlu.toUpperCase(), puncte: rowsVal(f, 'puncte').map((r) => r.p).filter(Boolean) }; },
      (v) => `<div class="sp-box"><b>${esc(v.titlu || 'Titlul pasului')}</b></div>`, () => [['/program#metodologie', 'Metodologia, pe pagina Program']], { titlu: '', puncte: [] }),
    cifre: listType('cifre', 'Cifre', 'cifră', 'Cifrele declarate ale programului.',
      (c) => ({ num: c.valoare, title: c.ce, meta: c.sursa ? `sursa: ${c.sursa}` : '' }),
      (c) => fs_('Cifra', f2(inp('valoare', 'Valoare', c.valoare, { ph: 'ex. 550+', req: true }), inp('ce', 'Ce înseamnă', c.ce, { ph: 'ex. IMM-uri care au trecut prin program' })) + inp('sursa', 'Sursa (pentru echipă)', c.sursa, { hint: 'Nu apare pe site.' })),
      (f) => { const v = form(f); return { valoare: v.valoare, ce: v.ce, sursa: v.sursa || null }; },
      (v) => `<div class="sp-num"><b>${esc(v.valoare || '0')}</b><span>${esc(v.ce || 'ce înseamnă cifra')}</span></div>`, () => [['/despre', 'cifrele de pe Despre'], ['/', 'cifrele de pe homepage']], { valoare: '', ce: '' }),
    echipa: { tip: 'echipa', label: 'Echipa', one: 'om în echipă', desc: 'Oamenii din echipa programului.',
      items: () => D.program.contact.echipa, row: (m) => ({ img: Pid(m.id)?.imagine, title: m.nume, meta: `${m.rol || ''}${m.email ? ' · ' + m.email : ''}` }), blank: () => ({}),
      fields: (m) => fs_('Omul', `${inp('nume', 'Nume și prenume', m.nume, { req: true })}${photo('imagine', Pid(m.id)?.imagine)}${inp('rol', 'Rol în echipă', m.rol, { ph: 'ex. Project Manager' })}${f2(inp('email', 'Email', m.email, { type: 'email' }), inp('telefon', 'Telefon', m.telefon))}`) + visField('echipa', m.id),
      values: (m) => ({ nume: m.nume, imagine: Pid(m.id)?.imagine, functie: m.rol, tipuri: ['echipă'] }),
      preview: personCard, where: () => [['/despre#echipa', 'echipa, pe pagina Despre'], ['/aplica', 'contactul de pe Aplică'], ['/', 'contactul din footer']],
      async save(f, m, nou) {
        const v = form(f);
        if (!v.nume.trim()) throw new Error('Scrie numele.');
        const r = await put({ op: 'entitate', tip: 'echipa', id: m.id, nou, date: { nume: v.nume.trim(), rol: v.rol, email: v.email, telefon: v.telefon || null }, eticheta: `echipa: ${v.nume}` });
        const id = r.id || m.id, p = Pid(id);
        if (v.imagine !== (p?.imagine || '')) await put({ op: 'entitate', tip: 'oameni', id, nou: !p, date: { nume: v.nume.trim(), imagine: v.imagine || null, tipuri: [...new Set([...(p?.tipuri || []), 'echipă'])] }, eticheta: `fotografie: ${v.nume}` });
        await visSave(f, 'echipa', id);
        return v.nume;
      } },

    editii: { tip: 'editii', label: 'Ediții', one: 'ediție', desc: 'Fiecare ediție, cu ateliere, participanți și parteneri.',
      items: () => eds(), row: (e) => ({ num: eLab(e.id), title: `Antreprenoria ${eLab(e.id)}`, meta: `${e.perioada || ''} · ${e.ateliere.length} ateliere · ${e.participanti.length} participanți · ${e.status}` }),
      blank: () => { const n = Math.max(...D.editii.filter((e) => e.serie === 'București').map((e) => e.numar)) + 1; return { serie: 'București', numar: n, an: new Date().getFullYear() + 1, sezon: 'primăvară', ateliere: [], participanti: [], parteneri: [], beneficii: [], preturi: [], status: 'În pregătire' }; },
      fields: (e) => fs_('Ediția', f2(sel('serie', 'Serie', [['București', 'București'], ['Cluj', 'Cluj']], e.serie), inp('numar', 'Număr', e.numar, { type: 'number', req: true })) + f2(inp('an', 'Anul', e.an, { type: 'number' }), sel('sezon', 'Sezonul', [['primăvară', 'Primăvară'], ['toamnă', 'Toamnă']], e.sezon)) + f2(inp('perioada', 'Perioada afișată', e.perioada, { ph: 'ex. Septembrie – Decembrie 2026' }), sel('status', 'Stare', STATUS, e.status)) + inp('subtitlu', 'Subtitlu', e.subtitlu) + checks('deschisa', [['da', 'Înscrieri deschise (apare în formularul Aplică)']], e.deschisa ? 'da' : '') + inp('link_inscriere', 'Link de plată / înscriere (opțional)', e.link_inscriere))
        + fs_('Preț', rows('preturi', 'Prețuri', e.preturi || [], [['eticheta', 'Etichetă, ex. Early bird'], ['pret_text', 'Preț, ex. 7700 lei + TVA'], ['nota', 'Notă, ex. până la 11 sept.']]) + inp('valoare_estimata', 'Valoare estimată', e.valoare_estimata))
        + fs_('Ce primește participantul', rows('beneficii', 'Beneficii', (e.beneficii || []).map((b) => ({ b })), [['b', 'Un beneficiu']]))
        + (e.id ? fs_(`Ateliere · ${e.ateliere.length}`, `<div class="mini-list">${e.ateliere.map((a) => `<a href="#" data-cms-edit="ateliere" data-cms-id="${a.id}"><b>${a.nr}</b><span>${esc(a.titlu)}</span><small>${dayRo(a.data) || 'fără dată'}</small></a>`).join('')}</div>${S.on ? `<button type="button" class="sm" data-cms-new="ateliere" data-cms-editie="${e.id}">+ Atelier în această ediție</button>` : ''}`) : '')
        + (e.id ? fs_(`Participanți · ${e.participanti.length}`, `<div class="rel" data-chips="participanti">${e.participanti.map((x) => chip(x)).join('')}<input class="rel-add" list="cms-people" placeholder="+ participant (caută în Oameni)"></div><small class="ro">Compania și cifrele se completează pe fișa participantului (Oameni › Participanți).</small>`) : '')
        + (e.id ? fs_(`Parteneri · ${e.parteneri.filter((x) => x.rol !== 'sponsor atelier').length}`, rows('parteneri', 'Partenerii ediției (sponsorii de atelier se aleg în atelier)', e.parteneri.filter((x) => x.rol !== 'sponsor atelier').map((x) => ({ org: Oid(x.organizatie)?.nume || x.organizatie, rol: x.rol })), [['org', 'Organizația', 1.4], ['rol', '', 1, { select: ORG_ROLES.filter(([r]) => r !== 'sponsor atelier') }]], '+ partener')) : '')
        + visField('editii', e.id),
      values: (e) => ({ serie: e.serie, numar: e.numar, perioada: e.perioada, status: e.status }),
      preview: (v) => `<div class="sp-ed"><span class="${/închis/i.test(v.status || '') ? '' : 'live'}">${esc(cap(v.status || ''))}</span><b>${v.serie === 'Cluj' ? 'Cluj ' : ''}#${esc(v.numar || '')}</b><small>${esc(v.perioada || 'perioada')}</small></div>`,
      where: (v) => [[v.serie === 'Cluj' ? `/editii/cluj-${v.numar}` : `/editii/${v.numar}`, 'pagina ediției'], ['/', 'homepage'], ['/aplica', 'formularul Aplică, dacă e deschisă']],
      async save(f, e, nou) {
        const v = form(f);
        const date = { serie: v.serie, numar: num(v.numar), an: num(v.an), sezon: v.sezon, perioada: v.perioada, status: v.status, subtitlu: v.subtitlu, deschisa: v.deschisa.includes('da'), link_inscriere: v.link_inscriere || null,
          preturi: rowsVal(f, 'preturi').filter((r) => r.pret_text).map((r, i) => ({ ...(e.preturi?.[i] || {}), eticheta: r.eticheta, pret_text: r.pret_text, pret: num(r.pret_text), nota: r.nota || null, ascuns: false })),
          beneficii: rowsVal(f, 'beneficii').map((r) => r.b).filter(Boolean), valoare_estimata: v.valoare_estimata || null };
        if (nou) Object.assign(date, { titlu: `Antreprenoria ${v.serie === 'Cluj' ? 'Cluj ' : ''}#${date.numar}`, cheie: `${v.serie === 'Cluj' ? 'cluj' : 'bucuresti'}-${date.numar}` });
        const r = await put({ op: 'entitate', tip: 'editii', id: e.id, nou, date, eticheta: `${nou ? 'ediție nouă' : 'ediția'} ${v.serie === 'Cluj' ? 'Cluj ' : ''}#${date.numar}` });
        const id = r.id || e.id;
        lastEd = id;
        if (!nou) {
          const part = chipsVal(f, 'participanti');
          const L = [];
          for (const c of part) {
            const old = e.participanti.find((x) => x.persoana === c.persoana);
            if (old) { L.push(old); continue; }
            let pid = c.persoana;
            if (!pid) pid = (await put({ op: 'entitate', tip: 'oameni', nou: true, date: { nume: c.nume, tipuri: ['participant'] }, eticheta: `om nou: ${c.nume}` })).id;
            const p = Pid(pid);
            L.push({ persoana: pid, nume: p?.nume || c.nume, organizatie: p?.organizatii?.[p.organizatii.length - 1] || null, cifra_afaceri: null, angajati: null, descriere: null, imagine: p?.imagine || null });
          }
          if (JSON.stringify(L) !== JSON.stringify(e.participanti)) await put({ op: 'participanti', id, lista: L, eticheta: `participanți ${eLab(id)}` });
          const parts = [];
          for (const r2 of rowsVal(f, 'parteneri').filter((x) => x.org)) {
            const o = D.organizatii.find((x) => nrm(x.nume) === nrm(r2.org));
            const oid = o?.id || (await put({ op: 'entitate', tip: 'organizatii', nou: true, date: { nume: r2.org, tip: 'companie', tipuri: ['partener'] }, eticheta: `partener nou: ${r2.org}` })).id;
            parts.push({ organizatie: oid, rol: r2.rol });
          }
          const L2 = [...parts, ...e.parteneri.filter((x) => x.rol === 'sponsor atelier')];
          if (JSON.stringify(L2) !== JSON.stringify(e.parteneri)) await put({ op: 'parteneri', id, lista: L2, eticheta: `parteneri ${eLab(id)}` });
        }
        await visSave(f, 'editii', id);
        return `ediția ${eLab(id) || '#' + date.numar}`;
      } },

    ateliere: { tip: 'ateliere', label: 'Ateliere', one: 'atelier', desc: 'Atelierele fiecărei ediții: dată, temă, locație, oameni.',
      items: () => eds().flatMap((e) => e.ateliere.map((a) => ({ ...a, editie: e.id }))), row: (a) => ({ num: `${eLab(a.editie)}·${a.nr}`, title: a.titlu, meta: `${dayRo(a.data) || 'fără dată'} · ${a.format}${a.locatie ? ' · ' + a.locatie : ''}` }),
      blank: () => ({ editie: eds()[0].id, format: 'full-day', program: [] }),
      fields: (a) => fs_('Atelierul', f2(a.id ? `<div class="f"><label>Ediția</label><input value="Antreprenoria ${esc(eLab(a.editie))}" disabled></div>` : sel('editie', 'Ediția', eds().map((e) => [e.id, `Antreprenoria ${eLab(e.id)}`]), a.editie), inp('data', 'Data', a.data, { type: 'date' })) + f2(sel('tema', 'Tema (din Curriculum)', D.teme.map((t) => [t.id, `${t.nume} · ${t.format}`]), a.tema, { empty: 'Alege tema' }), sel('format', 'Format', [['full-day', 'Full-day'], ['seară', 'Seară'], ['networking', 'Networking']], a.format)) + inp('titlu', 'Titlul afișat', a.titlu, { hint: 'Dacă îl lași gol, se folosește numele temei.' }) + area('descriere', 'Descriere', cap(a.descriere || '')))
        + fs_('Unde și cu cine', f2(sel('loc', 'Locația', D.locatii.map((l) => [l.id, l.nume]), a.loc, { empty: 'Încă nestabilită' }), sel('sponsor', 'Sponsorul atelierului', D.organizatii.slice().sort((x, y) => x.nume.localeCompare(y.nume, 'ro')).map((o) => [o.id, o.nume]), a.sponsor, { empty: 'Fără sponsor' })) + checks('cauta_sponsor', [['da', 'Căutăm sponsor (apare pe site ca invitație)']], a.cauta_sponsor ? 'da' : ''))
        + fs_('Agenda zilei', rows('program', 'Momentele zilei și oamenii lor', (a.program || []).map((m) => ({ interval: m.interval, activitate: m.activitate, speakeri: m.speakeri })), [['interval', '09:00 - 09:30', .7], ['activitate', 'ex. Training', 1.1], ['speakeri', '+ om', 1.4, 'chips']], '+ moment în agendă') + '<small class="ro">Oamenii se aleg din Oameni. Un nume nou primește automat fișă.</small>'),
      values: (a) => ({ titlu: a.titlu, data: a.data, format: a.format, editie: a.editie, loc: a.loc, tema: a.tema }),
      preview: (v) => `<div class="sp-ag"><span>${esc(dayRo(v.data) || 'Data')}</span><b>${esc(v.titlu || D.teme.find((t) => t.id === v.tema)?.nume || 'Titlul atelierului')}</b><small>${esc(cap(v.format || ''))}${v.loc ? ' · ' + esc(D.locatii.find((l) => l.id === v.loc)?.nume || '') : ''}</small></div>`,
      where: (v) => [[eUrl(v.editie) + '#agenda', 'agenda ediției'], ...(FULL.includes(v.tema) ? [[`/teme/${v.tema}`, 'pagina temei']] : []), ['/', 'pulsul de pe homepage'], ['/program', 'calendarul din Program']],
      async save(f, a, nou) {
        const v = form(f), tema = D.teme.find((t) => t.id === v.tema), loc = D.locatii.find((l) => l.id === v.loc);
        const titlu = v.titlu.trim() || tema?.nume || '';
        if (!titlu) throw new Error('Alege tema sau scrie un titlu.');
        const date = { data: v.data || null, data_text: v.data ? dayRo(v.data).toUpperCase() : null, tema: v.tema || null, format: v.format, titlu, descriere: v.descriere, loc: v.loc || null, locatie: v.loc === a.loc ? a.locatie ?? null : loc?.nume || null, sponsor: v.sponsor || null, cauta_sponsor: v.cauta_sponsor.includes('da') };
        const r = await put({ op: 'entitate', tip: 'ateliere', id: a.id, nou, editie: v.editie || a.editie, date, eticheta: `${nou ? 'atelier nou' : 'atelier'}: ${titlu}` });
        const id = r.id || a.id;
        const prog = [];
        for (const m of rowsVal(f, 'program')) {
          if (!m.interval && !m.activitate && !m.speakeri.length) continue;
          const sp = [];
          for (const s of m.speakeri) {
            let pid = s.persoana;
            if (!pid) pid = (await put({ op: 'entitate', tip: 'oameni', nou: true, date: { nume: s.nume }, eticheta: `om nou: ${s.nume}` })).id;
            const p = Pid(pid), rol = s.rol || (/^training/i.test(m.activitate) ? 'trainer' : /prezentare/i.test(m.activitate) ? 'antreprenor invitat' : v.format === 'seară' ? 'facilitator' : 'invitat');
            sp.push({ persoana: pid, rol, companie: s.companie ?? p?.companii?.[p.companii.length - 1] ?? null, organizatie: s.organizatie ?? p?.organizatii?.[p.organizatii.length - 1] ?? null });
          }
          prog.push({ interval: m.interval, activitate: m.activitate || null, speakeri: sp });
        }
        if (JSON.stringify(prog) !== JSON.stringify(a.program || [])) await put({ op: 'agenda', id, lista: prog, eticheta: `agenda: ${titlu}` });
        return titlu;
      } },

    locatii: { tip: 'locatii', label: 'Locații', one: 'locație', desc: 'Unde se țin atelierele și cine găzduiește.',
      items: () => D.locatii, row: (l) => ({ title: l.nume, meta: `${l.oras} · ${l.tip || ''} · ${l.ateliere.length} ateliere` }), blank: () => ({ oras: 'București' }),
      fields: (l) => fs_('Locația', inp('nume', 'Nume', l.nume, { ph: 'ex. Sediul Zitec', req: true }) + f2(inp('oras', 'Oraș', l.oras), inp('tip', 'Tip', l.tip, { ph: 'ex. sediu partener, hotel' })) + inp('adresa', 'Adresa', l.adresa, { ph: 'Strada, număr' }) + inp('gazda', 'Gazda (din Organizații)', Oid(l.organizatie)?.nume, { list: 'cms-orgs' })) + visField('locatii', l.id),
      values: (l) => ({ nume: l.nume, oras: l.oras }),
      preview: (v) => `<div class="sp-ag"><span>Locația</span><b>${esc(v.nume || 'Numele locației')}</b><small>${esc(v.oras || '')}</small></div>`,
      where: () => [['/editii/22#agenda', 'agenda edițiilor'], ['/program', 'calendarul din Program']],
      async save(f, l, nou) { const v = form(f); if (!v.nume.trim()) throw new Error('Scrie numele.'); const o = D.organizatii.find((x) => nrm(x.nume) === nrm(v.gazda)); const r = await put({ op: 'entitate', tip: 'locatii', id: l.id, nou, date: { nume: v.nume.trim(), oras: v.oras, tip: v.tip, adresa: v.adresa || null, organizatie: o?.id || null }, eticheta: `locație: ${v.nume}` }); await visSave(f, 'locatii', r.id || l.id); return v.nume; } },

  };
  // listele program.metodologie / program.cifre: fiecare element se editează separat, dar se salvează lista întreagă
  function listType(key, label, one, desc, row, fields, collect, preview, where, blank) {
    return { tip: key, label, one, desc, list: true, items: () => (D.program[key] || []).map((x, i) => ({ id: `${key}-${i}`, _i: i, ...x })), row: (x) => row(x, x._i), blank: () => ({ ...blank }),
      fields, values: (x) => x, preview, where,
      async save(f, x, nou) { const L = (D.program[key] || []).map((y) => ({ ...y })), v = collect(f); if (nou) L.push(v); else L[x._i] = { ...L[x._i], ...v }; await put({ op: 'entitate', tip: key, lista: L, eticheta: `${label.toLowerCase()}: ${v.titlu || v.ce || v.valoare}` }); return v.titlu || v.ce || one; },
      async remove(x) { const L = (D.program[key] || []).filter((_, i) => i !== x._i); await put({ op: 'entitate', tip: key, lista: L, eticheta: `${one} scos` }); } };
  }
  Object.assign(T, {
    traineri: personType('trainer', 'Traineri', 'trainer', 'Trainerii atelierelor full-day.'),
    invitati: personType('antreprenor invitat', 'Antreprenori invitați', 'antreprenor invitat', 'Antreprenorii care povestesc în a doua parte a zilei.'),
    facilitatori: personType('facilitator', 'Facilitatori & invitați de seară', 'facilitator', 'Cei care țin atelierele de seară.'),
    participanti: personType('participant', 'Participanți', 'participant', 'Alumnii fiecărei ediții.'),
  });
  T.oameni = personType('', 'Oameni', 'om', '');
  // organizațiile: trei liste, același editor
  const orgType = (label, one, f, tipuri) => ({ tip: 'organizatii', label, one, desc: '',
    items: () => D.organizatii.filter(f).sort((a, b) => a.nume.localeCompare(b.nume, 'ro')), row: (o) => ({ img: o.logo, sq: true, title: o.nume, meta: `${o.tip || o.sector || ''}${o.editii?.length ? ` · ${o.editii.map(eLab).join(', ')}` : ''}` }),
    blank: () => ({ tipuri, roluri: [], editii: [], oameni: [] }),
    fields: (o) => fs_('Organizația', `${inp('nume', 'Nume', o.nume, { req: true })}<div class="dup" id="dup" hidden></div>${photo('logo', o.logo, true)}${f2(inp('tip', 'Tip', o.tip, { ph: 'ex. Bancă, Software' }), inp('sector', 'Sector', o.sector))}${inp('url', 'Site', o.url, { ph: 'https://' })}${area('descriere', 'Descriere scurtă', o.descriere)}`)
      + (o.roluri?.length ? fs_('Roluri pe ediții', `<ul class="ro">${(o.parcurs || []).map((p) => `<li><b>${eLab(p.editie)}</b> · ${p.roluri.map(esc).join(', ')}</li>`).join('')}</ul><small class="ro">Rolurile vin din ediții: partenerii se aleg în ediție, sponsorii și gazdele în atelier, alumnii din participanți.</small>`) : '')
      + (o.oameni?.length ? fs_('Oameni', `<div class="rel">${o.oameni.slice(0, 16).map((id) => `<span>${esc(Pid(id)?.nume || id)}</span>`).join('')}</div>`) : '')
      + visField('organizatii', o.id),
    values: (o) => ({ nume: o.nume, logo: o.logo, editii: o.editii }),
    preview: (v) => `<div class="sp-logo">${v.logo ? `<img src="${esc(v.logo)}" alt="">` : `<b>${esc(v.nume || 'Logo')}</b>`}</div>`,
    where: (v) => [['/', 'banda de parteneri de pe homepage'], ...(v.editii || []).slice(-3).map((e) => [eUrl(e), `ediția ${eLab(e)}`])],
    dup: (q) => D.organizatii.filter((o) => nrm(o.nume).includes(nrm(q))),
    async save(f, o, nou) { const v = form(f); if (!v.nume.trim()) throw new Error('Scrie numele.'); const date = { nume: v.nume.trim(), logo: v.logo || null, tip: v.tip, sector: v.sector || null, url: v.url || null, descriere: v.descriere || null }; if (nou) date.tipuri = tipuri; const r = await put({ op: 'entitate', tip: 'organizatii', id: o.id, nou, date, eticheta: `${nou ? 'organizație nouă' : 'organizație'}: ${date.nume}` }); await visSave(f, 'organizatii', r.id || o.id); return date.nume; } });
  Object.assign(T, {
    alumni: orgType('Companii alumni', 'companie alumni', (o) => o.tipuri.includes('alumni'), ['alumni']),
    parteneri: orgType('Parteneri & sponsori', 'partener', (o) => ['partener', 'sponsor', 'organizator'].some((t) => o.tipuri.includes(t)), ['partener']),
    speakeri: orgType('Companiile speakerilor', 'companie', (o) => o.tipuri.includes('speaker'), ['speaker']),
    organizatii: orgType('Organizații', 'organizație', () => true, []),
  });
  // temele: trei liste, același editor
  const temaType = (label, one, fmt) => ({ tip: 'teme', label, one, desc: '',
    items: () => D.teme.filter((t) => !fmt || t.format === fmt), row: (t) => ({ title: t.nume, meta: `în ${t.editii.length} ediții · ${t.editii.map(eLab).join(', ')}` }), blank: () => ({ format: fmt || 'full-day', editii: [], titluri: [] }),
    fields: (t) => fs_('Tema', `${inp('nume', 'Numele temei', t.nume, { req: true })}<div class="dup" id="dup" hidden></div>${sel('format', 'Format', [['full-day', 'Full-day'], ['seară', 'Seară'], ['networking', 'Networking']], t.format)}${area('descriere', 'Descriere pentru pagina temei', t.descriere, { ph: 'Ce problemă rezolvă atelierul. Dacă e gol, se folosește descrierea din ultimul atelier.', tall: true })}`)
      + (t.titluri?.length ? fs_('Istoric', `<p class="ro" style="margin:0">Titluri folosite: ${t.titluri.map(esc).join(' · ')}</p>${t.nota ? `<p class="ro">${esc(t.nota)}</p>` : ''}<small class="ro">Edițiile și trainerii temei se completează singuri din ateliere.</small>`) : '')
      + visField('teme', t.id),
    values: (t) => ({ nume: t.nume, format: t.format, id: t.id, descriere: t.descriere }),
    preview: (v) => `<div class="sp-box"><small>${esc(cap(v.format || ''))}</small><b>${esc(v.nume || 'Numele temei')}</b><p>${esc(v.descriere || '')}</p></div>`,
    where: (v) => (v.format === 'full-day' ? [[`/teme/${v.id || 'tema-noua'}`, 'pagina temei'], ['/teme', 'lista temelor'], ['/', 'curriculumul de pe homepage']] : [[`/teme#${v.id || ''}`, 'secțiunea ei din Teme']]),
    dup: (q) => D.teme.filter((t) => nrm(t.nume).includes(nrm(q))),
    async save(f, t, nou) { const v = form(f); if (!v.nume.trim()) throw new Error('Scrie numele temei.'); const r = await put({ op: 'entitate', tip: 'teme', id: t.id, nou, date: { nume: v.nume.trim(), format: v.format, descriere: v.descriere || null }, eticheta: `${nou ? 'temă nouă' : 'tema'}: ${v.nume}` }); await visSave(f, 'teme', r.id || t.id); return v.nume; } });
  Object.assign(T, { 'full-day': temaType('Ateliere full-day', 'temă full-day', 'full-day'), seara: temaType('Ateliere de seară', 'temă de seară', 'seară'), networking: temaType('Networking', 'temă de networking', 'networking'), teme: temaType('Teme', 'temă', null) });
  delete T.teme_;

  // grupurile din panou (entityCategories) -> tipul editabil
  const GROUP = { program: { identitate: 'identitate', metodologie: 'metodologie', cifre: 'cifre', contact: 'echipa' }, oameni: { traineri: 'traineri', invitati: 'invitati', facilitatori: 'facilitatori', participanti: 'participanti', echipa: 'echipa' }, organizatii: { alumni: 'alumni', parteneri: 'parteneri', speakeri: 'speakeri', locatii: 'locatii' }, teme: { 'full-day': 'full-day', seara: 'seara', networking: 'networking' } };
  const CALC = { organizatii: ['ciclu', 'multirol'], teme: ['matrice'] };
  const SITE = { program: ['/despre', '/program'], editii: ['/editii/…', '/aplica'], oameni: ['/', '/editii/…', '/teme/…'], organizatii: ['/', '/editii/…'], teme: ['/teme', '/teme/…'], texte: ['/', '/despre', '/program', '/aplica'] };

  /* ---------- formular: citire ---------- */
  function form(f) {
    const v = {};
    $$('[name]', f).forEach((el) => {
      if (el.closest('[data-rows]')) return;
      if (el.type === 'checkbox') { (v[el.name] ||= []); if (el.checked) v[el.name].push(el.value); }
      else if (el.type === 'radio') { if (el.checked) v[el.name] = el.value; else v[el.name] ??= ''; }
      else v[el.name] = el.value;
    });
    $$('[name]', f).forEach((el) => { if (el.type === 'checkbox') v[el.name] ||= []; });
    return new Proxy(v, { get: (o, k) => (k in o ? o[k] : typeof k === 'string' && !k.startsWith('_') ? '' : undefined) });
  }
  const rowsVal = (f, name) => $$(`[data-rows="${name}"] .lrow`, f).map((r) => Object.fromEntries([...$$('[data-c]', r).map((i) => [i.dataset.c, i.value.trim()]), ...$$('[data-chips]', r).map((c) => [c.dataset.chips, chipVals(c)])]));
  const chipVals = (c) => $$('span[data-v]', c).map((s) => JSON.parse(s.dataset.v));
  const chipsVal = (f, name) => chipVals($(`[data-chips="${name}"]`, f));
  async function visSave(f, tip, id) {
    const r = $('[name="_vis"]:checked', f);
    if (!r || !id) return;
    const want = r.value === 'off';
    if (want !== hidden(tip, id)) await put({ op: 'ascuns', tip, id, ascuns: want, eticheta: `${want ? 'ascuns' : 'arătat din nou'}: ${tip} ${id}` });
  }

  /* ---------- server ---------- */
  let GRUP = null;
  const newGroup = () => { GRUP = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  async function put(b) {
    const r = await api.send('/api/editari', 'PUT', { ...b, grup: GRUP || undefined });
    S.pending = r.nepublicate || S.pending;
    sideCard();
    return r;
  }
  async function refresh() {
    const [e, c] = await Promise.all([api.get('/api/entitati'), api.get('/api/cms')]);
    store.entitati = e; D = e; if (e) indexEntities(e);
    if (c) { S.on = c.editabil; S.pagini = c.pagini; S.texte = c.texte; S.pending = c.nepublicate; S.E = c.editari; }
    updateCounts(); datalists(); sideCard();
  }
  // cardul din bara stângă: panoul local (editabil) sau cel publicat, plus modificările nepublicate
  function sideCard() {
    const card = $('#side-card');
    if (!card) return;
    card.classList.toggle('ro', !S.on);
    $('#side-mode').textContent = S.on ? 'Panou local · editabil' : 'Versiunea publicată · doar vizualizare';
    const n = S.on ? pendingGroups().length : 0, p = $('#side-pending');
    p.hidden = !n;
    p.innerHTML = n ? `<span>${n} ${n === 1 ? 'modificare nepublicată' : 'modificări nepublicate'}</span><b>→</b>` : '';
  }
  function datalists() {
    $('#cms-dl')?.remove();
    document.body.insertAdjacentHTML('beforeend', `<div id="cms-dl" hidden><datalist id="cms-orgs">${D.organizatii.map((o) => `<option value="${esc(o.nume)}">`).join('')}</datalist><datalist id="cms-sectoare">${(D.sectoare || []).map((x) => `<option value="${esc(x)}">`).join('')}</datalist><datalist id="cms-people">${D.oameni.map((p) => `<option value="${esc(p.nume)}">${esc(p.companii?.[p.companii.length - 1] || '')}</option>`).join('')}</datalist></div>`);
  }

  /* ---------- editorul ---------- */
  let cur = null, lastEd = null;
  function shell() {
    if ($('#cms-drawer')) return;
    document.body.insertAdjacentHTML('beforeend', '<div class="scrim" id="cms-scrim"></div><div class="drawer" id="cms-drawer" role="dialog" aria-modal="true"></div>');
  }
  function open(key, x, nou) {
    shell();
    const ty = T[key], dr = $('#cms-drawer');
    cur = { key, x, nou };
    const v = ty.values(x), title = nou ? `Adaugă ${ty.one}` : ty.row(x, x._i).title;
    const canDel = S.on && !nou && !ty.single && (ty.list || isNew(ty.tip, x.id));
    dr.innerHTML = `<div class="dr-head"><h2>${esc(title)}</h2><span class="tag grey">${esc(ty.label)}</span>${!nou && fullHref(key, x) ? `<a class="btn" href="${fullHref(key, x)}">Fișa completă</a>` : ''}<button type="button" data-cms-close>Închide ✕</button></div>
      <div class="dr-body"><form id="cms-f" onsubmit="return false" ${S.on ? '' : 'inert'}>${S.on ? '' : '<div class="ro-note">Pe versiunea publicată panoul e doar pentru vizualizare. Editarea se face din panoul local.</div>'}${ty.fields(x)}</form>
        <div class="sitebox"><div class="sp"><div class="sp-lab">Cum arată pe site</div><div id="cms-sp">${ty.preview(v)}</div></div>
          <div><div class="sp-lab">Apare pe aceste pagini</div><div class="where" id="cms-where">${whereHtml(ty.where({ ...x, ...v }))}</div></div></div></div>
      <div class="dr-foot"><span>${S.on ? (nou ? 'Apare pe site local imediat; pe site-ul public după „Publică pe site”.' : 'Se vede imediat pe site-ul local; pe cel public după „Publică pe site”.') : ''}</span>
        ${canDel ? '<button type="button" class="danger" data-cms-del>Șterge</button>' : ''}<button type="button" data-cms-close>${S.on ? 'Anulează' : 'Închide'}</button>${S.on ? `<button type="button" class="primary" data-cms-save>${nou ? 'Adaugă' : 'Salvează'}</button>` : ''}</div>`;
    dr.classList.add('on'); $('#cms-scrim').classList.add('on');
    const f = $('#cms-f');
    const sync = () => {
      const val = { ...v, ...Object.fromEntries(Object.entries(form(f))) };
      if (val.companie !== undefined) val.companie = val.companie || v.companie;
      $('#cms-sp').innerHTML = ty.preview(val);
      $('#cms-where').innerHTML = whereHtml(ty.where({ ...x, ...val }));
      if (nou && ty.dup && $('#dup')) dupCheck(ty, form(f).nume || '');
    };
    dr.oninput = sync; dr.onchange = sync;
    setTimeout(() => $('input:not([type=hidden]):not([disabled]),textarea', f)?.focus(), 250);
  }
  const fullHref = (key, x) => (T[key].tip === 'oameni' ? `/manage/entitati/oameni/p/${x.id}` : T[key].tip === 'organizatii' ? `/manage/entitati/organizatii/o/${x.id}` : T[key].tip === 'editii' ? `/manage/entitati/editii/${x.id}` : '');
  const whereHtml = (w) => w.map(([u, l]) => `<a href="${u}" target="_blank" rel="noopener"><span>${esc(l)}</span><small>${esc(u)}</small></a>`).join('') || '<p class="ro">—</p>';
  function dupCheck(ty, q) {
    const box = $('#dup');
    if (nrm(q).trim().length < 3) { box.hidden = true; return; }
    const hits = ty.dup(q.trim()).slice(0, 3);
    box.hidden = !hits.length;
    box.innerHTML = `<b>Există deja:</b>${hits.map((h) => `<div class="d-row">${h.imagine || h.logo ? `<img class="av ${h.logo ? 'sq' : ''}" src="${esc(h.imagine || h.logo)}" alt="">` : `<span class="av">${initials(h.nume)}</span>`}<div><b>${esc(h.nume)}</b><br><small>${esc((h.tipuri || [h.format]).join(', '))}${h.editii?.length ? ' · ' + h.editii.map(eLab).join(', ') : ''}</small></div><button type="button" class="sm primary" data-cms-dup="${esc(h.id)}">${T[cur.key]?.kind === 'participant' ? 'Folosește această fișă' : 'Deschide fișa'}</button></div>`).join('')}<small>${T[cur.key]?.kind === 'participant' ? 'A mai fost în program? Folosește fișa lui: i se adaugă participarea la ediția nouă, fără o fișă dublă.' : 'Dacă e același, deschide fișa existentă și adaugă rolul nou, în loc să creezi încă una.'}</small>`;
  }
  function close() { $('#cms-drawer')?.classList.remove('on'); $('#cms-scrim')?.classList.remove('on'); cur = null; }
  async function save(btn) {
    const ty = T[cur.key], f = $('#cms-f');
    const bad = $$('[required]', f).find((i) => !i.value.trim());
    if (bad) { bad.focus(); toast('Completează câmpurile obligatorii.'); return; }
    btn.disabled = true; btn.textContent = 'Se salvează…';
    try {
      const wasNewEd = cur.key === 'editii' && cur.nou;
      const name = await ty.save(f, cur.x, cur.nou);
      close(); await refresh();
      if (wasNewEd && lastEd) navigate(`/manage/entitati/editii/${lastEd}/construieste/calendar`); else go(routeFromPath());
      toast(`Salvat: ${name}. Se vede pe site-ul local; pe cel public după „Publică pe site”.`);
    } catch (e) { toast(e.message); btn.disabled = false; btn.textContent = cur.nou ? 'Adaugă' : 'Salvează'; }
  }
  async function del() {
    const ty = T[cur.key], x = cur.x;
    if (!confirm(`Ștergi „${ty.row(x, x._i).title}”?`)) return;
    try {
      if (ty.remove) await ty.remove(x);
      else await put({ op: 'sterge', tip: ty.tip, id: x.id, eticheta: `șters: ${ty.row(x).title}` });
      close(); await refresh(); go(routeFromPath()); toast('Șters.');
    } catch (e) { toast(e.message); }
  }
  // imaginile: micșorate în browser (max. 1000 px), apoi urcate în site/assets/uploads
  async function upload(file, box) {
    let data = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(file); });
    if (!/svg/.test(file.type)) {
      const im = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = data; });
      const k = Math.min(1, 1000 / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      data = c.toDataURL(/png/.test(file.type) ? 'image/png' : 'image/jpeg', .86);
    }
    try {
      const r = await api.send('/api/upload', 'POST', { nume: $('#cms-f [name=nume]')?.value || $('#bld-pf [name=p_nume]')?.value || file.name, data });
      $('input[type=hidden]', box).value = r.url;
      $('.av', box).outerHTML = `<span class="av ${box.querySelector('.sq') ? 'sq' : ''}"><img class="av ${box.querySelector('.sq') ? 'sq' : ''}" src="${esc(r.url)}" alt=""></span>`;
      $('#cms-f')?.dispatchEvent(new Event('input', { bubbles: true }));
      toast('Imagine încărcată.');
    } catch (e) { toast(e.message); }
  }
  function pickNew(only) {
    shell();
    const groups = [['Program', ['metodologie', 'cifre', 'echipa']], ['Ediții', ['editii', 'ateliere']], ['Oameni', ['traineri', 'invitati', 'facilitatori', 'participanti']], ['Organizații', ['parteneri', 'alumni', 'speakeri', 'locatii']], ['Curriculum', ['full-day', 'seara', 'networking']]].filter(([g]) => !only || g === only);
    $('#cms-drawer').innerHTML = `<div class="dr-head"><h2>Ce vrei să adaugi?</h2><button type="button" data-cms-close>Închide ✕</button></div><div style="padding:20px;overflow:auto">${groups.map(([g, L]) => `<div class="fs"><h4>${g}</h4><div class="checks-r">${L.map((k) => `<button type="button" data-cms-new="${k}">+ ${esc(T[k].one)}</button>`).join('')}</div></div>`).join('')}</div>`;
    $('#cms-drawer').classList.add('on'); $('#cms-scrim').classList.add('on');
  }

  /* ---------- bucăți pentru paginile din entitati.js ---------- */
  // modificările nepublicate: un rând pentru fiecare salvare (pașii ei, dacă au fost mai mulți), cu Publică și Renunță
  const pendingGroups = () => {
    const g = new Map();
    S.pending.forEach((p) => { const k = p.grup || p.id; if (!g.has(k)) g.set(k, { ids: [], ce: [], cand: p.cand }); const x = g.get(k); x.ids.push(p.id); if (!x.ce.includes(p.ce)) x.ce.push(p.ce); x.cand = p.cand; });
    return [...g.values()].reverse();
  };
  const pendingBar = () => {
    if (!S.on) return '<div class="pending ro-mode"><span>Pe versiunea publicată panoul e doar pentru vizualizare. Editarea și publicarea se fac din panoul local.</span></div>';
    const G = pendingGroups();
    if (!G.length) return '';
    const when = (c) => new Date(c).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `<div class="pending pending-list"><div class="pending-top"><b>${G.length} ${G.length === 1 ? 'modificare nepublicată' : 'modificări nepublicate'}</b>${G.length > 1 ? '<button class="primary" data-cms-publish="">Publică toate</button>' : ''}</div>
      <ol>${G.map((x) => `<li><time>${esc(when(x.cand))}</time><span>${x.ce.map(esc).join('<br>')}</span><span class="pending-act"><button class="sm" data-cms-discard="${esc(x.ids.join(','))}" title="Anulează modificarea (local)">Renunță</button><button class="sm primary" data-cms-publish="${esc(x.ids.join(','))}">Publică</button></span></li>`).join('')}</ol></div>`;
  };
  const addBtn = (key, label) => (S.on && T[key]?.one ? `<button class="primary" data-cms-new="${key}">${label || '+ Adaugă ' + esc(T[key].one)}</button>` : '');
  function rowHtml(key, x) {
    const ty = T[key], r = ty.row(x, x._i), off = hidden(ty.tip, x.id), nw = isNew(ty.tip, x.id);
    const lead = r.img ? `<img class="av ${r.sq ? 'sq' : ''}" src="${esc(r.img)}" alt="" loading="lazy">` : r.num != null ? `<span class="av num">${esc(r.num)}</span>` : `<span class="av">${initials(r.title)}</span>`;
    return `<div class="row" data-cms-edit="${key}" data-cms-id="${esc(x.id)}" data-s>${lead}<div><h3>${esc(r.title)}</h3><div class="meta">${esc(r.meta || '')}</div></div><div class="acts">${nw ? '<span class="st draft">adăugat din panou</span>' : ''}${off ? '<span class="st off">ascuns pe site</span>' : ''}<button class="sm">${S.on ? 'Editează' : 'Vezi'}</button></div></div>`;
  }
  const listHtml = (key) => { const L = T[key].items(); return `<div class="rows">${L.map((x) => rowHtml(key, x)).join('') || '<div class="card empty">Nimic încă.</div>'}</div>`; };
  function sample(key) {
    const ty = T[key], L = ty.items();
    if (ty.single) return `<p class="ro sg-quote">${esc(cut(ty.row(L[0]).meta || '', 90))}</p>`;
    return `<div class="sg-sample">${L.slice(0, 5).map((x) => { const r = ty.row(x, x._i); return r.img ? `<img class="av ${r.sq ? 'sq' : ''}" src="${esc(r.img)}" alt="" title="${esc(r.title)}" loading="lazy">` : `<span class="sg-pill">${esc(cut(String(r.title), 26))}</span>`; }).join('')}${L.length > 5 ? `<span class="sg-more">+${L.length - 5}</span>` : ''}</div>`;
  }
  const typeSite = (ty) => { const x = ty.items()[0] || ty.blank?.() || {}; return [...new Set(ty.where({ ...x, ...ty.values(x) }).map(([u]) => u.split('#')[0].replace(/^\/(traineri|editii|teme)\/.+$/, '/$1/…')))].slice(0, 3); };

  /* ---------- texte de pe site ---------- */
  function textePage(pid) {
    const p = S.pagini.find((x) => x.id === pid) || S.pagini[0];
    const val = (k) => S.texte[`${p.id}.${k}`] ?? null;
    return `<div class="head"><div><div class="crumb"><a href="/manage/entitati/texte">← Texte de pe site</a> · entități › Texte de pe site › ${esc(p.nume)}</div><h1><span class="cat-ico">${icon('teme')}</span>${esc(p.nume)}</h1></div><a class="btn" href="${p.url}" target="_blank" rel="noopener">Vezi pagina ↗</a>${S.on ? '<button class="primary" data-cms-texte-save>Salvează textele</button>' : ''}</div>
      ${pendingBar()}
      <div class="pills">${S.pagini.map((x) => `<a href="/manage/entitati/texte/${x.id}" class="${x.id === p.id ? 'on' : ''}">${esc(x.nume)} · ${x.blocuri.length}</a>`).join('')}</div>
      <div class="txt-grid" id="cms-texte" data-pagina="${p.id}"><div>${p.blocuri.map(([k, l, def]) => { const v = val(k) ?? def; return `<div class="fs" style="gap:6px"><div class="f"><label>${esc(l)}${val(k) != null && val(k) !== def ? ' <span class="tag warn">modificat</span>' : ''}</label>${def.length > 70 || def.includes('\n') ? `<textarea data-t="${p.id}.${k}" ${S.on ? '' : 'disabled'}>${esc(v)}</textarea>` : `<input data-t="${p.id}.${k}" value="${esc(v)}" ${S.on ? '' : 'disabled'}>`}<small>Implicit: ${esc(cut(def, 90))}${S.on && val(k) != null && val(k) !== def ? ` · <a href="#" data-cms-texte-reset="${p.id}.${k}">revino la implicit</a>` : ''}</small></div></div>`; }).join('')}</div>
      <div class="sitebox"><p class="ro">Aici sunt doar titlurile și frazele paginilor. Numele, cifrele, datele și listele vin din entități și se schimbă din entitatea lor.</p><a class="btn" href="${p.url}" target="_blank" rel="noopener">Deschide ${esc(p.url)} ↗</a></div></div>`;
  }
  function texteCat() {
    return `<div class="head"><div><div class="crumb"><a href="/manage/entitati">← Toate categoriile</a> · manage › entități › Texte de pe site</div><h1><span class="cat-ico">${icon('teme')}</span>Texte de pe site</h1></div></div>
      ${pendingBar()}<p class="lead">Titlurile și frazele paginilor, care nu țin de o entitate anume.</p>
      <div class="cats">${S.pagini.map((p) => `<div class="cat sg" data-href="/manage/entitati/texte/${p.id}"><div class="cat-top"><span class="cat-ico">${icon('teme')}</span><span class="cat-total">${p.blocuri.length}</span></div><h3>${esc(p.nume)}</h3><div class="onsite">Pe site: <code>${esc(p.url)}</code></div><p class="ro sg-quote">„${esc(cut(S.texte[`${p.id}.${p.blocuri[0][0]}`] || p.blocuri[0][2], 100))}”</p><span class="cat-open">Editează textele →</span></div>`).join('')}</div>`;
  }

  /* ---------- CONSTRUCTORUL DE EDIȚIE: pașii, în ordinea în care se construiește o ediție ---------- */
  const PASI = [['baza', 'Datele ediției'], ['calendar', 'Atelierele'], ['oameni', 'Traineri și invitați'], ['inscrieri', 'Preț și înscrieri'], ['parteneri', 'Parteneri și sponsori'], ['participanti', 'Participanți'], ['site', 'Pe site']];
  const isTraining = (m) => /training/i.test(m.activitate || ''), isTalk = (m) => /prezentare/i.test(m.activitate || '');
  // oamenii unui atelier, pe roluri, citiți din agendă
  function slots(a) {
    const sp = (a.program || []).flatMap((m) => m.speakeri.map((s) => ({ ...s, m })));
    if (a.format === 'full-day') return { trainer: sp.filter((s) => isTraining(s.m) || s.rol === 'trainer').map((s) => s.persoana), invitati: sp.filter((s) => !isTraining(s.m) && s.rol !== 'trainer').map((s) => s.persoana) };
    return { facilitatori: [...new Set(sp.map((s) => s.persoana))] };
  }
  // agenda tip pentru un format: ultima folosită în program pentru același format (fără oameni)
  function agendaTip(fmt, tema) {
    const L = eds().flatMap((e) => e.ateliere).filter((a) => a.format === fmt && a.program?.length);
    const a = L.find((x) => x.tema === tema) || L[0];
    return (a?.program || []).map((m) => ({ interval: m.interval, activitate: m.activitate, speakeri: [] }));
  }
  // agenda nouă după ce s-au ales oamenii: trainerii la training, invitații pe rând la prezentări
  function agendaCu(a, sl) {
    let prog = (a.program?.length ? a.program : agendaTip(a.format, a.tema)).map((m) => ({ ...m, speakeri: [] }));
    const person = (id, rol) => { const p = Pid(id); return { persoana: id, rol, companie: p?.companii?.[p.companii.length - 1] || null, organizatie: p?.organizatii?.[p.organizatii.length - 1] || null }; };
    if (a.format === 'full-day') {
      if (sl.trainer.length && !prog.some(isTraining)) prog.push({ interval: '', activitate: 'Training', speakeri: [] });
      prog.filter(isTraining).forEach((m, i) => { if (i === 0) m.speakeri = sl.trainer.map((id) => person(id, 'trainer')); });
      let talks = prog.filter(isTalk);
      while (talks.length < sl.invitati.length && talks.length < 2) { const m = { interval: '', activitate: `Prezentare vorbitor ${talks.length + 1}`, speakeri: [] }; prog.push(m); talks = prog.filter(isTalk); }
      sl.invitati.forEach((id, i) => { const m = talks[Math.min(i, talks.length - 1)]; m.speakeri.push(person(id, 'antreprenor invitat')); });
    } else if (sl.facilitatori.length) {
      if (!prog.length) prog = [{ interval: '18:00 - 21:00', activitate: a.titlu, speakeri: [] }];
      const m = prog.find((x) => !/pauz|cafea|prânz|networking/i.test(x.activitate || '')) || prog[0];
      m.speakeri = sl.facilitatori.map((id) => person(id, a.format === 'seară' ? 'facilitator' : 'invitat'));
    }
    return prog;
  }
  // ce mai lipsește, pe pași (pentru bifele din stânga și pasul „Pe site”)
  function verifica(e) {
    const ws = e.ateliere, fd = ws.filter((a) => a.format === 'full-day');
    const c = {
      baza: [[!!e.perioada, 'perioada ediției'], [!!e.an, 'anul']],
      calendar: [[ws.length > 0, 'cel puțin un atelier'], [ws.every((a) => a.data), 'data fiecărui atelier'], [ws.every((a) => a.loc || a.locatie), 'locația fiecărui atelier']],
      oameni: ws.length ? [[fd.every((a) => slots(a).trainer.length), 'un trainer la fiecare atelier full-day'], [fd.every((a) => slots(a).invitati.length), 'antreprenori invitați la fiecare full-day']] : [[false, 'întâi atelierele (pasul 2)']],
      inscrieri: [[!e.deschisa || e.preturi.some((p) => p.pret_text), 'prețul (înscrierile sunt deschise)'], [e.beneficii.length > 0, 'ce primește participantul']],
      parteneri: [],
      participanti: ws.some((a) => a.data && a.data <= new Date().toISOString().slice(0, 10)) ? [[e.participanti.length > 0, 'participanții (ediția a început)']] : [],
      site: [[!hidden('editii', e.id), 'ediția e vizibilă pe site']],
    };
    return c;
  }
  const done = (L) => L.every(([ok]) => ok);
  function builder(eid, pas) {
    const e = ED(eid);
    if (!e) return '<div class="card empty"><b>Ediția nu există.</b></div>';
    const ck = verifica(e), cur = PASI.some(([k]) => k === pas) ? pas : 'baza';
    const idx = PASI.findIndex(([k]) => k === cur), next = PASI[idx + 1];
    const off = hidden('editii', e.id), url = `${eUrl(e.id)}${off ? '?previzualizare' : ''}`;
    const count = { calendar: e.ateliere.length, participanti: e.participanti.length, parteneri: e.parteneri.length };
    return `<div class="head"><div><div class="crumb"><a href="/manage/entitati/editii">← Ediții</a> · entități › Ediții › ${esc(eLab(e.id))}</div>
        <h1><span class="cat-ico">${icon('editii')}</span>Construiește Antreprenoria ${esc(eLab(e.id))} ${off ? '<span class="tag warn">ascunsă pe site</span>' : '<span class="tag ok">pe site</span>'}</h1></div>
        <a class="btn" href="${url}" target="_blank" rel="noopener">${off ? 'Previzualizează pagina' : 'Vezi pagina'} ↗</a><a class="btn" href="/manage/entitati/editii/${e.id}">Fișa ediției</a></div>
      ${pendingBar()}${archiveBanner(e)}
      <div class="bld">
        <nav class="bld-steps">${PASI.map(([k, l], i) => { const ok = done(ck[k]), opt = !ck[k].length; return `<a href="/manage/entitati/editii/${e.id}/construieste/${k}" class="${k === cur ? 'on' : ''} ${ok && !opt ? 'ok' : ''}"><i>${ok && !opt ? '✓' : i + 1}</i><span>${l}${count[k] != null ? ` <em>${count[k]}</em>` : ''}${opt ? ` <small>${{ participanti: 'după selecție', parteneri: 'dacă sunt' }[k] || 'opțional'}</small>` : !ok ? ` <small>${ck[k].filter(([o]) => !o).length} de completat</small>` : ''}</span></a>`; }).join('')}</nav>
        <div class="bld-main" id="bld" data-editie="${e.id}" data-pas="${cur}">
          ${S.on ? '' : '<div class="ro-note">Pe versiunea publicată panoul e doar pentru vizualizare.</div>'}
          ${STEP[cur](e, ck)}
          ${S.on && cur !== 'site' ? `<div class="bld-foot">${cur === 'participanti' ? `<a class="btn primary" href="/manage/entitati/editii/${e.id}/construieste/${next[0]}">Continuă: ${next[1]} →</a>` : `<button class="primary" data-bld-save>${next ? `Salvează și continuă: ${next[1]} →` : 'Salvează'}</button>`}${next ? `${cur === 'participanti' ? '' : `<a href="/manage/entitati/editii/${e.id}/construieste/${next[0]}">sari peste</a>`}` : ''}</div>` : ''}
        </div>
      </div>`;
  }
  const lipsa = (L) => (L.some(([o]) => !o) ? `<div class="bld-miss">De completat: ${L.filter(([o]) => !o).map(([, t]) => esc(t)).join(', ')}.</div>` : '');
  const STEP = {
    baza: (e, ck) => `<h2>Datele ediției</h2><p class="lead">Numele, perioada și textul de sub titlu, așa cum apar sus pe pagina ediției.</p>${lipsa(ck.baza)}
      <form id="bld-f" class="fs">${f2(`<div class="f"><label>Ediția</label><input value="Antreprenoria ${esc(eLab(e.id))}" disabled></div>`, sel('status', 'Stare', STATUS, e.status))}
        ${f2(inp('an', 'Anul', e.an, { type: 'number' }), sel('sezon', 'Sezonul', [['primăvară', 'Primăvară'], ['toamnă', 'Toamnă']], e.sezon))}
        ${inp('perioada', 'Perioada afișată', e.perioada, { ph: 'ex. Martie – Iunie 2027', hint: perioadaAuto(e) ? `Din datele atelierelor: <a href="#" data-bld-perioada="${esc(perioadaAuto(e))}">${esc(perioadaAuto(e))}</a>` : 'Se poate calcula din datele atelierelor, după ce le pui în calendar.' })}
        ${inp('subtitlu', 'Subtitlu', e.subtitlu, { ph: 'O frază despre ediție, sub titlu' })}</form>`,
    calendar: (e, ck) => {
      const prev = eds().filter((x) => x.id !== e.id && x.ateliere.length);
      const teme = D.teme.slice().sort((a, b) => ['full-day', 'seară', 'networking'].indexOf(a.format) - ['full-day', 'seară', 'networking'].indexOf(b.format));
      const add = `<div class="bld-add"><span>Adaugă un atelier:</span>${teme.map((t) => `<button type="button" class="sm" data-bld-tema="${t.id}">+ ${esc(t.nume)} <small>${esc(t.format)}</small></button>`).join('')}</div>`;
      if (!e.ateliere.length) return `<h2>Atelierele</h2><p class="lead">Cel mai simplu: pornești de la o ediție anterioară și schimbi doar datele. Sau le adaugi pe rând, din temele programului.</p>
        <div class="bld-start"><form class="fs" id="bld-copy"><h4>Pornește de la o ediție anterioară</h4>
          ${sel('din', 'Copiază structura de la', prev.map((x) => [x.id, `Antreprenoria ${eLab(x.id)} · ${x.ateliere.length} ateliere`]), prev[0]?.id)}
          ${checks('ce', [['locatii', 'păstrează locațiile'], ['oameni', 'păstrează trainerii și invitații'], ['beneficii', 'copiază ce primește participantul'], ['preturi', 'copiază prețul']], ['beneficii', 'preturi'])}
          <small class="ro">Se copiază atelierele (temele, titlurile, descrierile, agenda zilei). Datele le pui tu în pasul ăsta.</small>
          ${S.on ? '<button type="button" class="primary" data-bld-copy>Copiază structura</button>' : ''}</form>
          <div class="fs"><h4>Sau adaugă-le pe rând</h4>${add}</div></div>`;
      return `<h2>Atelierele</h2><p class="lead">Data, tema și locația fiecărui atelier. Pentru agendă, descriere și sponsor, deschide atelierul.</p>${lipsa(ck.calendar)}
        <form id="bld-f"><div class="bld-ws">${e.ateliere.slice().sort((a, b) => (a.data || '9').localeCompare(b.data || '9') || a.nr - b.nr).map((a) => `<div class="bld-w" data-aid="${a.id}">
          <b class="n">${a.nr}</b>
          <input type="date" data-k="data" value="${esc(a.data || '')}" aria-label="Data">
          <select data-k="tema" aria-label="Tema">${D.teme.map((t) => `<option value="${t.id}" ${t.id === a.tema ? 'selected' : ''}>${esc(t.nume)}</option>`).join('')}</select>
          <select data-k="loc" aria-label="Locația"><option value="">Locație nestabilită</option>${D.locatii.map((l) => `<option value="${l.id}" ${l.id === a.loc ? 'selected' : ''}>${esc(l.nume)}</option>`).join('')}</select>
          <span class="tag grey">${esc(a.format)}</span>
          <button type="button" class="sm" data-cms-edit="ateliere" data-cms-id="${a.id}">Detalii</button>
          ${S.on && isNew('ateliere', a.id) ? `<button type="button" class="sm danger" data-bld-del="${a.id}" title="Scoate atelierul">✕</button>` : ''}
        </div>`).join('')}</div></form>${S.on ? add : ''}`;
    },
    oameni: (e, ck) => `<h2>Traineri și invitați</h2><p class="lead">Pentru fiecare atelier: cine ține trainingul și cine povestește după-amiaza. Scrie numele; dacă omul nu există, primește fișă nouă.</p>${lipsa(ck.oameni)}
      ${e.ateliere.length ? `<form id="bld-f"><div class="bld-ppl">${e.ateliere.slice().sort((a, b) => (a.data || '9').localeCompare(b.data || '9') || a.nr - b.nr).map((a) => { const sl = slots(a); return `<div class="fs" data-aid="${a.id}"><h4>${a.nr}. ${esc(a.titlu)} <span class="tag grey">${esc(dayRo(a.data) || 'fără dată')}</span></h4>
        ${a.format === 'full-day' ? f2(`<div class="f"><label>Trainer (dimineața)</label>${chipBox('trainer', sl.trainer.map((id) => ({ persoana: id })), '+ trainer')}</div>`, `<div class="f"><label>Antreprenori invitați (după-amiaza)</label>${chipBox('invitati', sl.invitati.map((id) => ({ persoana: id })), '+ invitat')}</div>`)
          : a.format === 'networking' ? '<small class="ro">Networking: fără speakeri.</small>' : `<div class="f"><label>Facilitatori / invitați</label>${chipBox('facilitatori', sl.facilitatori.map((id) => ({ persoana: id })), '+ om')}</div>`}</div>`; }).join('')}</div></form>` : '<div class="card empty">Adaugă întâi atelierele, în pasul anterior.</div>'}`,
    inscrieri: (e, ck) => { const prev = eds().find((x) => x.id !== e.id && x.beneficii.length); return `<h2>Preț și înscrieri</h2><p class="lead">Când deschizi înscrierile, ediția apare în formularul Aplică.</p>${lipsa(ck.inscrieri)}
      <form id="bld-f">
        <div class="fs">${checks('deschisa', [['da', 'Înscrieri deschise (apare în formularul Aplică)']], e.deschisa ? 'da' : '')}${inp('link_inscriere', 'Link de plată / înscriere (opțional)', e.link_inscriere)}</div>
        <div class="fs">${rows('preturi', 'Prețuri', e.preturi || [], [['eticheta', 'Etichetă, ex. Early bird'], ['pret_text', 'Preț, ex. 7700 lei + TVA'], ['nota', 'Notă, ex. până la 1 martie']], '+ preț')}${inp('valoare_estimata', 'Valoare estimată', e.valoare_estimata)}</div>
        <div class="fs">${rows('beneficii', 'Ce primește participantul', (e.beneficii || []).map((b) => ({ b })), [['b', 'ex. 5 ateliere full day']], '+ beneficiu')}${!e.beneficii.length && prev ? `<button type="button" class="sm" data-bld-ben="${prev.id}">Copiază de la ${esc(eLab(prev.id))}</button>` : ''}</div>
      </form>`; },
    parteneri: (e) => `<h2>Parteneri și sponsori</h2><p class="lead">Partenerii ediției apar sus pe pagină; sponsorul unui atelier apare la atelierul lui.</p>
      <form id="bld-f"><div class="fs">${rows('parteneri', 'Partenerii ediției', e.parteneri.filter((x) => x.rol !== 'sponsor atelier').map((x) => ({ org: Oid(x.organizatie)?.nume || x.organizatie, rol: x.rol })), [['org', 'Organizația (scrie sau alege)', 1.4], ['rol', '', 1, { select: ORG_ROLES.filter(([r]) => r !== 'sponsor atelier') }]], '+ partener')}</div>
        <div class="fs"><h4>Sponsorii atelierelor</h4>${e.ateliere.slice().sort((a, b) => a.nr - b.nr).map((a) => `<div class="bld-sp" data-aid="${a.id}"><span>${a.nr}. ${esc(a.titlu)}</span><select data-k="sponsor"><option value="">Fără sponsor</option>${D.organizatii.slice().sort((x, y) => x.nume.localeCompare(y.nume, 'ro')).map((o) => `<option value="${o.id}" ${o.id === a.sponsor ? 'selected' : ''}>${esc(o.nume)}</option>`).join('')}</select><label class="ro"><input type="checkbox" data-k="cauta_sponsor" ${a.cauta_sponsor ? 'checked' : ''}> căutăm sponsor</label></div>`).join('') || '<small class="ro">Apar aici după ce adaugi atelierele.</small>'}</div></form>`,
    participanti: (e) => {
      const L = e.participanti, sum = L.reduce((n, x) => n + (x.cifra_afaceri || 0), 0);
      return `<h2>Participanți</h2><p class="lead">Antreprenorii selectați, unul câte unul. Se completează după selecție; din ziua primului atelier pasul devine obligatoriu. Cifrele rămân în panou, pe site apar doar agregat.</p>
      <div class="fs"><h4>În ediție · ${L.length}${L.length ? ` <span class="tag grey">cifră de afaceri cumulată ${esc(leiShort(sum))}</span>` : ''}</h4>
        ${L.length ? `<div class="bld-plist">${L.map((x) => { const p = Pid(x.persoana), o = Oid(x.organizatie); return `<div class="bld-p">${p?.imagine || x.imagine ? `<img class="av" src="${esc(p?.imagine || x.imagine)}" alt="">` : `<span class="av">${initials(x.nume)}</span>`}
          <div><b>${esc(x.nume)}</b><small>${esc(o?.nume || 'fără companie')}${p?.functii?.length ? ' · ' + esc(p.functii[p.functii.length - 1]) : ''}</small></div>
          <span class="num">${x.cifra_afaceri ? esc(leiShort(x.cifra_afaceri)) : '<i>fără cifră</i>'}</span><span class="num">${x.angajati ?? '—'} ang.</span>
          <button type="button" class="sm" data-cms-edit="participanti" data-cms-id="${esc(x.persoana)}">Fișa</button>${S.on ? `<button type="button" class="sm danger" data-bld-prem="${esc(x.persoana)}" title="Scoate din ediție">✕</button>` : ''}</div>`; }).join('')}</div>` : '<p class="ro" style="margin:0">Încă niciun participant.</p>'}</div>
      ${S.on ? `<form class="fs bld-pf" id="bld-pf" onsubmit="return false"><h4>Adaugă un participant</h4>
        <input type="hidden" name="p_id">
        <div class="f"><label>Nume și prenume *</label><input name="p_nume" placeholder="Scrie numele; dacă a mai fost în program, îl găsești aici" autocomplete="off"><div id="bld-pdup" class="bld-pdup" hidden></div><div id="bld-pchosen" class="bld-chosen" hidden></div></div>
        ${f2(inp('p_companie', 'Compania *', '', { list: 'cms-orgs', ph: 'Caută sau scrie una nouă' }), inp('p_functie', 'Funcția', '', { ph: 'ex. Fondator & CEO' }))}
        ${f2(inp('p_cifra', 'Cifra de afaceri (lei)', '', { ph: 'ex. 12.500.000' }), inp('p_angajati', 'Angajați', '', { ph: 'ex. 45' }))}
        ${f2(inp('p_sector', 'Sectorul companiei', '', { list: 'cms-sectoare', ph: 'Alege sau scrie' }), inp('p_linkedin', 'LinkedIn', '', { ph: 'https://www.linkedin.com/in/…' }))}
        ${inp('p_site', 'Site-ul companiei', '', { ph: 'https://…' })}
        ${photo('p_imagine', '')}
        ${area('p_bio', 'Despre el/ea', '', { ph: '2–3 fraze despre om și ce face. Apare pe pagina lui de alumni.' })}
        ${area('p_descriere', 'Despre companie', '', { ph: 'Ce face compania, în 1–2 fraze.' })}
        <small class="ro">Pe pagina lui de pe site vor apărea: fotografia, numele, funcția, compania, sectorul, LinkedIn, textele de mai sus și edițiile la care a participat. Cifra de afaceri și angajații nu apar niciodată individual, doar în totalul ediției.</small>
        <div class="bld-pact"><button type="button" class="primary" data-bld-padd>Adaugă în ediție</button><button type="button" data-bld-pclear>Golește</button><small class="ro">După adăugare, formularul se golește pentru următorul.</small></div>
      </form>
      <div class="fs" id="bld-leads" data-editie="${e.id}"><h4>Din aplicări</h4><p class="ro" style="margin:0">Se încarcă aplicările pentru această ediție…</p></div>` : ''}`;
    },
    site: (e, ck) => { const all = PASI.flatMap(([k, l]) => ck[k].map(([ok, t]) => [ok, t, k, l])); const off = hidden('editii', e.id); return `<h2>Pe site</h2><p class="lead">Verifică ce lipsește, apoi arată ediția pe site.</p>
      <div class="fs"><h4>Verificare</h4><ul class="bld-check">${all.map(([ok, t, k, l]) => `<li class="${ok ? 'ok' : ''}"><i>${ok ? '✓' : '!'}</i>${esc(cap(t))} <a href="/manage/entitati/editii/${e.id}/construieste/${k}">${esc(l)}</a></li>`).join('')}</ul></div>
      <div class="fs"><h4>Vizibilitate</h4><p class="ro" style="margin:0">${off ? 'Ediția e ascunsă: nu apare în meniu, pe homepage sau în listele de ediții. O poți previzualiza din butonul de sus.' : 'Ediția apare pe site-ul local; pe cel public după „Publică pe site”.'}</p>
        ${S.on ? `<div><button class="${off ? 'primary' : ''}" data-bld-vis="${off ? 'on' : 'off'}">${off ? 'Arată ediția pe site' : 'Ascunde ediția de pe site'}</button></div>` : ''}</div>`; },
  };
  function perioadaAuto(e) {
    const d = e.ateliere.map((a) => a.data).filter(Boolean).sort();
    if (!d.length) return '';
    const m = (s) => cap(new Date(s + 'T12:00').toLocaleDateString('ro-RO', { month: 'long' }));
    const y1 = d[0].slice(0, 4), y2 = d[d.length - 1].slice(0, 4);
    return `${m(d[0])}${y1 !== y2 ? ' ' + y1 : ''} – ${m(d[d.length - 1])} ${y2}`;
  }
  // salvarea unui pas
  async function bldSave(btn) {
    const box = $('#bld'), e = ED(box.dataset.editie), pas = box.dataset.pas, f = $('#bld-f');
    btn.disabled = true; btn.textContent = 'Se salvează…';
    try {
      if (pas === 'baza') { const v = form(f); await put({ op: 'entitate', tip: 'editii', id: e.id, date: { status: v.status, an: num(v.an), sezon: v.sezon, perioada: v.perioada, subtitlu: v.subtitlu }, eticheta: `ediția ${eLab(e.id)}: datele` }); }
      if (pas === 'calendar' && f) {
        for (const r of $$('.bld-w', f)) {
          const a = e.ateliere.find((x) => x.id === r.dataset.aid), v = Object.fromEntries($$('[data-k]', r).map((i) => [i.dataset.k, i.value || null]));
          if (v.data === (a.data || null) && v.tema === a.tema && v.loc === (a.loc || null)) continue;
          const t = D.teme.find((x) => x.id === v.tema), l = D.locatii.find((x) => x.id === v.loc);
          await put({ op: 'entitate', tip: 'ateliere', id: a.id, date: { data: v.data, data_text: v.data ? dayRo(v.data).toUpperCase() : null, tema: v.tema, titlu: v.tema !== a.tema ? t?.nume || a.titlu : a.titlu, format: t?.format || a.format, loc: v.loc, locatie: v.loc === a.loc ? a.locatie : l?.nume || null }, eticheta: `atelier ${a.nr}, ${eLab(e.id)}` });
        }
      }
      if (pas === 'oameni' && f) {
        for (const r of $$('[data-aid]', f)) {
          const a = e.ateliere.find((x) => x.id === r.dataset.aid);
          const ids = async (k) => { const out = []; for (const c of chipVals($(`[data-chips="${k}"]`, r) || document.createElement('i'))) out.push(c.persoana || (await put({ op: 'entitate', tip: 'oameni', nou: true, date: { nume: c.nume }, eticheta: `om nou: ${c.nume}` })).id); return out; };
          const sl = a.format === 'full-day' ? { trainer: await ids('trainer'), invitati: await ids('invitati') } : { facilitatori: await ids('facilitatori') };
          if (JSON.stringify(sl) === JSON.stringify(slots(a))) continue;
          await refreshData();
          await put({ op: 'agenda', id: a.id, lista: agendaCu(a, sl), eticheta: `oamenii atelierului ${a.nr}, ${eLab(e.id)}` });
        }
      }
      if (pas === 'inscrieri') { const v = form(f); await put({ op: 'entitate', tip: 'editii', id: e.id, date: { deschisa: v.deschisa.includes('da'), link_inscriere: v.link_inscriere || null, valoare_estimata: v.valoare_estimata || null, preturi: rowsVal(f, 'preturi').filter((r) => r.pret_text).map((r) => ({ eticheta: r.eticheta, pret_text: r.pret_text, pret: num(r.pret_text), nota: r.nota || null, ascuns: false })), beneficii: rowsVal(f, 'beneficii').map((r) => r.b).filter(Boolean) }, eticheta: `ediția ${eLab(e.id)}: preț și înscrieri` }); }
      if (pas === 'parteneri') {
        const parts = [];
        for (const r of rowsVal(f, 'parteneri').filter((x) => x.org)) { const o = D.organizatii.find((x) => nrm(x.nume) === nrm(r.org)); parts.push({ organizatie: o?.id || (await put({ op: 'entitate', tip: 'organizatii', nou: true, date: { nume: r.org, tip: 'companie', tipuri: ['partener'] }, eticheta: `partener nou: ${r.org}` })).id, rol: r.rol }); }
        const L = [...parts, ...e.parteneri.filter((x) => x.rol === 'sponsor atelier')];
        if (JSON.stringify(L) !== JSON.stringify(e.parteneri)) await put({ op: 'parteneri', id: e.id, lista: L, eticheta: `parteneri ${eLab(e.id)}` });
        for (const r of $$('.bld-sp', f)) {
          const a = e.ateliere.find((x) => x.id === r.dataset.aid), sp = $('[data-k=sponsor]', r).value || null, cs = $('[data-k=cauta_sponsor]', r).checked;
          if (sp !== (a.sponsor || null) || cs !== !!a.cauta_sponsor) await put({ op: 'entitate', tip: 'ateliere', id: a.id, date: { sponsor: sp, cauta_sponsor: cs }, eticheta: `sponsor atelier ${a.nr}, ${eLab(e.id)}` });
        }
      }
      await refresh();
      const i = PASI.findIndex(([k]) => k === pas);
      navigate(`/manage/entitati/editii/${e.id}/construieste/${(PASI[i + 1] || PASI[i])[0]}`);
      toast('Salvat. Se vede pe site-ul local.');
    } catch (err) { toast(err.message); btn.disabled = false; btn.textContent = 'Salvează'; }
  }
  const refreshData = async () => { D = store.entitati = await api.get('/api/entitati'); };
  async function bldAction(fn, msg) { try { await fn(); await refresh(); go(routeFromPath()); if (msg) toast(msg); } catch (err) { toast(err.message); } }

  /* ---------- arhivarea: după ultimul atelier, ediția se poate închide oficial ---------- */
  const lastDay = (e) => e.ateliere.map((a) => a.data).filter(Boolean).sort().pop();
  const archived = (e) => /închis|încheiat/i.test(e.status || '');
  // de arhivat: are ateliere datate, toate au trecut, dar starea nu e încă „Ediție închisă”
  const toArchive = (e) => !archived(e) && e.ateliere.some((a) => a.data) && e.ateliere.every((a) => !a.data || a.data < t0());
  const archiveBanner = (e) => (toArchive(e) ? `<div class="arch"><div><b>Ediția ${esc(eLab(e.id))} s-a încheiat pe ${esc(dayRo(lastDay(e)))}.</b><span>Arhivarea închide înscrierile, scoate prețul de pe site și trece pagina ediției în formatul edițiilor anterioare. Participanții devin alumni.</span></div>${S.on ? `<button class="primary" data-cms-archive="${esc(e.id)}">Arhivează</button>` : ''}</div>` : '');
  async function archive(id, btn) {
    const e = ED(id);
    if (!confirm(`Arhivezi ediția ${eLab(id)}?\n\n• starea devine „Ediție închisă”\n• înscrierile se închid și prețul dispare de pe site\n• pagina ediției trece în formatul edițiilor anterioare\n• cei ${e.participanti.length} participanți devin alumni`)) return;
    btn.disabled = true; btn.textContent = 'Se arhivează…';
    try {
      await put({ op: 'entitate', tip: 'editii', id, date: { status: 'Ediție închisă', deschisa: false, preturi: (e.preturi || []).map((p) => ({ ...p, ascuns: true })) }, eticheta: `ediția ${eLab(id)} arhivată` });
      await refresh(); go(routeFromPath());
      toast(`Ediția ${eLab(id)} e arhivată. Se vede pe site-ul local; pe cel public după „Publică pe site”.`);
    } catch (err) { toast(err.message); btn.disabled = false; btn.textContent = 'Arhivează'; }
  }

  /* ---------- participanții unei ediții: formularul de adăugare ---------- */
  function pdupShow(q) {
    const box = $('#bld-pdup'), n = nrm(q).trim();
    if (!box) return;
    if (n.length < 3 || $('#bld-pf [name=p_id]').value) { box.hidden = true; return; }
    const hits = D.oameni.filter((p) => n.split(/\s+/).every((x) => nrm(p.nume).includes(x))).slice(0, 4);
    box.hidden = !hits.length;
    box.innerHTML = `<small>A mai fost în program? Alege fișa lui, ca să nu se dubleze:</small>${hits.map((p) => `<button type="button" data-bld-pick="${esc(p.id)}">${p.imagine ? `<img class="av" src="${esc(p.imagine)}" alt="">` : `<span class="av">${initials(p.nume)}</span>`}<span><b>${esc(p.nume)}</b><small>${esc(p.companii?.[p.companii.length - 1] || '')}${p.editii.length ? ' · ' + p.editii.map(eLab).join(', ') : ''}</small></span><em>Folosește</em></button>`).join('')}`;
  }
  // alege o fișă existentă: completează formularul cu ce știm deja despre om
  function pPick(id) {
    const p = Pid(id), f = $('#bld-pf');
    if (!p) return;
    const set = (k, v) => { const i = $(`[name=${k}]`, f); if (i && v != null && !i.value) i.value = v; };
    $('[name=p_id]', f).value = id; $('[name=p_nume]', f).value = p.nume;
    const last = D.editii.flatMap((e) => e.participanti.filter((x) => x.persoana === id).map((x) => ({ e, x }))).sort((a, b) => (b.e.an || 0) - (a.e.an || 0))[0];
    set('p_companie', Oid(last?.x.organizatie)?.nume || p.companii?.[p.companii.length - 1]);
    set('p_functie', p.functii?.[p.functii.length - 1]); set('p_linkedin', p.linkedin); set('p_site', Oid(last?.x.organizatie || p.organizatii?.[p.organizatii.length - 1])?.url); set('p_bio', p.bio);
    set('p_sector', Oid(last?.x.organizatie || p.organizatii?.[p.organizatii.length - 1])?.sector);
    if (p.imagine) { const box = $('[data-photo=p_imagine]', f); $('input[type=hidden]', box).value = p.imagine; $('.av', box).innerHTML = `<img class="av" src="${esc(p.imagine)}" alt="">`; }
    $('#bld-pdup').hidden = true;
    const ch = $('#bld-pchosen'); ch.hidden = false;
    ch.innerHTML = `Fișă existentă: <b>${esc(p.nume)}</b>${p.editii.length ? ` · a mai fost la ${p.editii.map(eLab).join(', ')}` : ''}. Cifrele de mai jos sunt pentru ediția asta. <a href="#" data-bld-pclear>alt om</a>`;
    $('[name=p_cifra]', f).focus();
  }
  function pClear() {
    const f = $('#bld-pf'); if (!f) return;
    $$('input,textarea', f).forEach((i) => { if (i.type !== 'file') i.value = ''; });
    $('[data-photo=p_imagine] .av', f).innerHTML = '?';
    $('#bld-pdup').hidden = true; $('#bld-pchosen').hidden = true;
    $('[name=p_nume]', f).focus();
  }
  async function pAdd(btn) {
    const box = $('#bld'), e = ED(box.dataset.editie), f = $('#bld-pf'), v = Object.fromEntries($$('[name]', f).map((i) => [i.name, i.value.trim()]));
    if (!v.p_nume) { $('[name=p_nume]', f).focus(); return toast('Scrie numele participantului.'); }
    if (!v.p_companie) { $('[name=p_companie]', f).focus(); return toast('Scrie compania.'); }
    if (v.p_id && e.participanti.some((x) => x.persoana === v.p_id)) return toast('E deja în ediție.');
    btn.disabled = true; btn.textContent = 'Se adaugă…';
    try {
      let o = D.organizatii.find((x) => nrm(x.nume) === nrm(v.p_companie));
      const oid = o?.id || (await put({ op: 'entitate', tip: 'organizatii', nou: true, date: { nume: v.p_companie, tip: 'companie', sector: v.p_sector || null, descriere: v.p_descriere || null, url: normUrl(v.p_site) }, eticheta: `companie nouă: ${v.p_companie}` })).id;
      if (o && v.p_site && normUrl(v.p_site) !== o.url) await put({ op: 'entitate', tip: 'organizatii', id: o.id, date: { url: normUrl(v.p_site) }, eticheta: `site: ${o.nume}` });
      if (o && ((v.p_sector && !o.sector) || (v.p_descriere && !o.descriere))) await put({ op: 'entitate', tip: 'organizatii', id: o.id, date: { ...(v.p_sector && !o.sector ? { sector: v.p_sector } : {}), ...(v.p_descriere && !o.descriere ? { descriere: v.p_descriere } : {}) }, eticheta: `companie: ${o.nume}` });
      const p = v.p_id ? Pid(v.p_id) : null;
      const date = { nume: v.p_nume, imagine: v.p_imagine || p?.imagine || null, linkedin: v.p_linkedin || p?.linkedin || null,
        companii: [...(p?.companii || []).filter((c) => nrm(c) !== nrm(v.p_companie)), v.p_companie], functii: [...(p?.functii || []).filter((c) => c !== v.p_functie), v.p_functie].filter(Boolean),
        organizatii: [...new Set([...(p?.organizatii || []), oid])] };
      if (v.p_bio) date.bio = v.p_bio;
      const pid = (await put({ op: 'entitate', tip: 'oameni', id: p?.id, nou: !p, date, eticheta: `${p ? 'om' : 'om nou'}: ${v.p_nume}` })).id || p.id;
      await refreshData();
      const ed = ED(e.id);
      await put({ op: 'participanti', id: e.id, lista: [...ed.participanti, { persoana: pid, nume: v.p_nume, organizatie: oid, cifra_afaceri: num(v.p_cifra), angajati: num(v.p_angajati), descriere: v.p_descriere || null, imagine: date.imagine }], eticheta: `participant ${eLab(e.id)}: ${v.p_nume}` });
      await refresh(); go(routeFromPath());
      toast(`Adăugat: ${v.p_nume}. Poți adăuga următorul.`);
      setTimeout(() => $('#bld-pf [name=p_nume]')?.focus(), 50);
    } catch (err) { toast(err.message); btn.disabled = false; btn.textContent = 'Adaugă în ediție'; }
  }
  // aplicările primite prin formularul de pe site pentru ediția asta (doar local)
  const CA_LABEL = { 'sub-500k': 'sub 500.000 €', '500k-1m': '500.000 – 1 mil. €', '1m-10m': '1 – 10 mil. €', 'peste-10m': 'peste 10 mil. €' };
  let LEADS = null;
  async function loadLeads() {
    const box = $('#bld-leads');
    if (!box) return;
    if (!LEADS) { try { LEADS = await api.get('/api/aplicari'); } catch (e) { LEADS = null; } }
    const e = ED(box.dataset.editie), L = (Array.isArray(LEADS) ? LEADS : []).filter((a) => a.editie === e.id);
    const inEd = new Set(e.participanti.map((x) => nrm(x.nume)));
    box.innerHTML = `<h4>Din aplicări · ${L.length}</h4>${L.length ? `<div class="bld-leads">${L.map((a, i) => `<div class="bld-lead"><div><b>${esc(a.nume)}</b><small>${esc(a.companie)} · CUI ${esc(a.cui)} · ${esc(CA_LABEL[a.cifra_afaceri] || a.cifra_afaceri || '')}</small></div>${inEd.has(nrm(a.nume)) ? '<span class="tag ok">în ediție</span>' : `<button type="button" class="sm" data-bld-lead="${i}">Completează formularul</button>`}</div>`).join('')}</div><small class="ro">Aplicarea completează numele și compania; cifra exactă și restul le adaugi tu.</small>` : `<p class="ro" style="margin:0">${Array.isArray(LEADS) ? 'Nicio aplicare pentru această ediție încă. Aplicările din formularul de pe site apar aici.' : 'Aplicările se văd doar în panoul local.'}</p>`}`;
    box._leads = L;
  }
  function leadFill(i) {
    const a = $('#bld-leads')._leads[i], f = $('#bld-pf');
    pClear();
    $('[name=p_nume]', f).value = a.nume; $('[name=p_companie]', f).value = a.companie;
    pdupShow(a.nume);
    f.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  const afterRender = () => { if ($('#bld-leads')) loadLeads(); };

  /* ---------- evenimente ---------- */
  document.addEventListener('click', async (e) => {
    newGroup();
    const t = e.target.closest('[data-cms-edit],[data-cms-new],[data-cms-close],[data-cms-save],[data-cms-del],[data-cms-dup],[data-cms-publish],[data-cms-discard],[data-cms-pick],[data-cms-texte-save],[data-cms-texte-reset],[data-add-row],[data-del-row],[data-del-chip],[data-photo-clear],[data-bld-save],[data-bld-perioada],[data-bld-copy],[data-bld-tema],[data-bld-del],[data-bld-ben],[data-bld-vis],[data-cms-archive],[data-bld-padd],[data-bld-pclear],[data-bld-pick],[data-bld-prem],[data-bld-lead],.sg[data-href],.cat[data-href]');
    if (!t) { if (e.target.id === 'cms-scrim') close(); return; }
    if (t.matches('.sg[data-href],.cat[data-href]')) { if (e.target.closest('button,a')) return; e.preventDefault(); navigate(t.dataset.href); return; }
    e.preventDefault();
    const d = t.dataset;
    const bid = $('#bld')?.dataset.editie;
    if (d.bldSave !== undefined) { bldSave(t); return; }
    if (d.cmsArchive) { archive(d.cmsArchive, t); return; }
    if (d.bldPadd !== undefined) { pAdd(t); return; }
    if (d.bldPclear !== undefined) { pClear(); return; }
    if (d.bldPick) { pPick(d.bldPick); return; }
    if (d.bldLead) { leadFill(+d.bldLead); return; }
    if (d.bldPrem) { const ed = ED(bid), x = ed.participanti.find((y) => y.persoana === d.bldPrem); if (!confirm(`Scoți ${x?.nume} din ediție? Fișa omului rămâne.`)) return; return bldAction(() => put({ op: 'participanti', id: bid, lista: ed.participanti.filter((y) => y.persoana !== d.bldPrem), eticheta: `participant scos din ${eLab(bid)}: ${x?.nume}` }), 'Scos din ediție.'); }
    if (d.bldPerioada) { const i = $('#bld-f [name=perioada]'); if (i) i.value = d.bldPerioada; return; }
    if (d.bldCopy !== undefined) { const v = form($('#bld-copy')); t.disabled = true; t.textContent = 'Se copiază…'; return bldAction(() => put({ op: 'copiaza', id: bid, din: v.din, ce: Object.fromEntries(['ateliere', ...v.ce].map((k) => [k, true])), eticheta: `ediția ${eLab(bid)}: structura de la ${eLab(v.din)}` }), 'Structura a fost copiată. Acum pune datele atelierelor.'); }
    if (d.bldTema) { const tm = D.teme.find((x) => x.id === d.bldTema); return bldAction(async () => { const r2 = await put({ op: 'entitate', tip: 'ateliere', nou: true, editie: bid, date: { tema: tm.id, titlu: tm.nume, format: tm.format, descriere: '', data: null }, eticheta: `atelier nou: ${tm.nume}` }); const prog = agendaTip(tm.format, tm.id); if (prog.length) await put({ op: 'agenda', id: r2.id, lista: prog, eticheta: `agenda: ${tm.nume}` }); }, `Atelier adăugat: ${tm.nume}`); }
    if (d.bldDel) { if (!confirm('Scoți atelierul din ediție?')) return; return bldAction(() => put({ op: 'sterge', tip: 'ateliere', id: d.bldDel, eticheta: 'atelier scos' }), 'Atelier scos.'); }
    if (d.bldBen) { const src = ED(d.bldBen), box = $('[data-rows=beneficii] .lrows'); const tpl = box.firstElementChild; box.innerHTML = ''; src.beneficii.forEach((b) => { const c = tpl.cloneNode(true); $('input', c).value = b; box.append(c); }); t.remove(); return; }
    if (d.bldVis) { return bldAction(() => put({ op: 'ascuns', tip: 'editii', id: bid, ascuns: d.bldVis === 'off', eticheta: `ediția ${eLab(bid)} ${d.bldVis === 'off' ? 'ascunsă' : 'arătată pe site'}` }), d.bldVis === 'off' ? 'Ediția e ascunsă de pe site.' : 'Ediția apare acum pe site-ul local.'); }
    if (d.cmsEdit) { const ty = T[d.cmsEdit], x = ty.items().find((i) => String(i.id) === d.cmsId); if (x) open(d.cmsEdit, x); return; }
    if (d.cmsDup && T[cur.key].tip === 'oameni') { const k = cur.key, p = Pid(d.cmsDup); if (p) open(k, { ...p, _addPart: T[k].kind === 'participant' ? edDefault() : null }); return; }
    if (d.cmsDup) { const k = cur.key; const x = T[k].tip === 'oameni' ? Pid(d.cmsDup) : T[k].tip === 'organizatii' ? Oid(d.cmsDup) : D.teme.find((y) => y.id === d.cmsDup); if (x) open(T[k].tip === 'oameni' ? 'oameni' : T[k].tip === 'organizatii' ? 'organizatii' : 'teme', x); return; }
    if (d.cmsNew !== undefined) { if (!d.cmsNew) return pickNew(); const ty = T[d.cmsNew]; const b = ty.blank ? ty.blank() : {}; if (d.cmsEditie) b.editie = d.cmsEditie; open(d.cmsNew, b, true); return; }
    if (d.cmsPick !== undefined) { pickNew(d.cmsPick); return; }
    if (d.cmsClose !== undefined) { close(); return; }
    if (d.cmsSave !== undefined) { save(t); return; }
    if (d.cmsDel !== undefined) { del(); return; }
    if (d.cmsPublish !== undefined) {
      const ids = d.cmsPublish ? d.cmsPublish.split(',') : null;
      const G = pendingGroups(), label = ids ? G.find((x) => x.ids.join(',') === d.cmsPublish)?.ce.join(', ') : `toate cele ${G.length} modificări`;
      if (!confirm(`Publici pe site-ul public: ${label}?

Se trimite pe git și apare online în ~1 minut.`)) return;
      t.disabled = true; t.textContent = 'Se publică…';
      try { const r = await api.send('/api/publica', 'POST', ids ? { ids } : {}); await refresh(); go(routeFromPath()); toast(r.mesaj); } catch (err) { toast(err.message); t.disabled = false; t.textContent = 'Publică'; }
      return;
    }
    if (d.cmsDiscard) {
      const x = pendingGroups().find((y) => y.ids.join(',') === d.cmsDiscard);
      if (!confirm(`Renunți la: ${x?.ce.join(', ')}?

Modificarea dispare și din panou, și de pe site-ul local. Nu se poate reface.`)) return;
      t.disabled = true;
      try { await api.send('/api/renunta', 'POST', { ids: d.cmsDiscard.split(',') }); await refresh(); go(routeFromPath()); toast('Modificarea a fost anulată.'); } catch (err) { toast(err.message); t.disabled = false; }
      return;
    }
    if (d.cmsTexteSave !== undefined) {
      const box = $('#cms-texte'), page = S.pagini.find((p) => p.id === box.dataset.pagina);
      const vals = Object.fromEntries($$('[data-t]', box).map((i) => [i.dataset.t, i.value]));
      const changed = Object.fromEntries(Object.entries(vals).filter(([k, v]) => v !== (S.texte[k] ?? page.blocuri.find(([b]) => `${page.id}.${b}` === k)[2])));
      if (!Object.keys(changed).length) { toast('Nimic schimbat.'); return; }
      try { await put({ op: 'texte', texte: changed, eticheta: `texte ${page.nume}` }); await refresh(); go(routeFromPath()); toast('Texte salvate. Se văd pe site-ul local.'); } catch (err) { toast(err.message); }
      return;
    }
    if (d.cmsTexteReset) { try { await put({ op: 'texte', texte: { [d.cmsTexteReset]: '' }, eticheta: 'text revenit la implicit' }); await refresh(); go(routeFromPath()); } catch (err) { toast(err.message); } return; }
    if (d.addRow !== undefined) { const box = t.previousElementSibling; const first = box.firstElementChild; const c = first.cloneNode(true); $$('input', c).forEach((i) => { i.value = ''; }); $$('span[data-v]', c).forEach((s) => s.remove()); box.append(c); $('input', c)?.focus(); return; }
    if (d.delRow !== undefined) { const r = t.closest('.lrow'), box = r.parentElement; if (box.children.length > 1) r.remove(); else { $$('input', r).forEach((i) => { i.value = ''; }); $$('span[data-v]', r).forEach((s) => s.remove()); } $('#cms-f')?.dispatchEvent(new Event('input', { bubbles: true })); return; }
    if (d.delChip !== undefined) { t.closest('span').remove(); return; }
    if (d.photoClear !== undefined) { const box = t.closest('[data-photo]'); $('input[type=hidden]', box).value = ''; $('.av', box).innerHTML = '?'; $('#cms-f')?.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  // etichete: la Enter sau la alegerea din listă, numele devine etichetă (om sau organizație existentă, ori una nouă)
  function addChip(input) {
    const name = input.value.trim(); if (!name) return;
    const p = D.oameni.find((x) => nrm(x.nume) === nrm(name));
    const v = p ? { persoana: p.id } : { nume: name };
    input.insertAdjacentHTML('beforebegin', `<span data-v="${esc(JSON.stringify(v))}">${esc(p?.nume || name)}${p ? '' : ' <i>nou</i>'}<button type="button" data-del-chip title="Scoate">✕</button></span>`);
    input.value = '';
  }
  document.addEventListener('input', (e) => { if (e.target.matches('#bld-pf [name=p_nume]')) { $('#bld-pf [name=p_id]').value = ''; $('#bld-pchosen').hidden = true; pdupShow(e.target.value); } });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') newGroup();
    if (e.key === 'Escape' && cur) close();
    if (e.key === 'Enter' && e.target.matches('.rel-add')) { e.preventDefault(); addChip(e.target); }
    if (e.key === 'Enter' && e.target.matches('#bld-pf input')) { e.preventDefault(); pAdd($('[data-bld-padd]')); }
  });
  document.addEventListener('change', (e) => {
    if (e.target.matches('.rel-add')) addChip(e.target);
    if (e.target.matches('[data-photo] input[type=file]') && e.target.files[0]) upload(e.target.files[0], e.target.closest('[data-photo]'));
  });
  document.addEventListener('dragover', (e) => { if (e.target.closest?.('[data-photo]')) e.preventDefault(); });
  document.addEventListener('drop', (e) => { const box = e.target.closest?.('[data-photo]'); if (box && e.dataTransfer.files[0]) { e.preventDefault(); upload(e.dataTransfer.files[0], box); } });

  return { S, T, GROUP, CALC, SITE, builder, afterRender, archiveBanner, toArchive, archived, refresh, open, pickNew, pendingBar, addBtn, listHtml, rowHtml, sample, typeSite, textePage, texteCat, get on() { return S.on; } };
})();
