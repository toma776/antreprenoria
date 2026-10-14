/* LEADS: aplicările din /aplica (Supabase, tabelul aplicari). Aplicarea se salvează din pasul 1, deci aici apar și cele neterminate,
   cu linkul de reluare pentru reminder. Se văd doar în panoul local (cheia de citire e în .env.local); pe Vercel panoul e public, deci nu le arată. */
const edName = (id) => { const m = /^(cluj|bucuresti)-(\d+)$/.exec(id || ''); return m ? `${m[1] === 'cluj' ? 'Cluj' : 'București'} #${m[2]}` : id || '—'; };
const dt = (s) => new Date(s).toLocaleString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

routes.leads = async function renderLeads() {
  if (new URLSearchParams(location.search).get('lista') === 'sustinere') {
    $('#view').innerHTML = `<div class="head"><div><div class="crumb">manage › leads · mesajele din formularul de pe /parteneri (Supabase)</div><h1>Leads</h1></div></div>${leadsTabs('sustinere')}<div id="im-box"></div><p class="muted small">Datele personale de aici nu se publică: panoul de pe Vercel nu are acces la ele.</p>`;
    return renderSustinere($('#im-box'));
  }
  $('#view').innerHTML = `<div class="head"><div><div class="crumb">manage › leads · aplicările din formularul /aplica (Supabase)</div><h1>Leads</h1></div></div><div class="card empty">Se încarcă…</div>`;
  const [r, steps] = await Promise.all([fetch('/api/aplicari', { cache: 'no-store' }), fetch('/api/aplica-model').then((x) => x.json()).catch(() => [])]);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    $('#view').innerHTML = `<div class="head"><div><div class="crumb">manage › leads</div><h1>Leads</h1></div></div>
      <div class="card empty"><b>${esc(j.error || 'Nu am putut încărca aplicările.')}</b><p class="muted small">Aplicările conțin date personale, așa că se văd doar în panoul pornit local, nu pe varianta publicată.</p></div>`;
    return;
  }
  const N = steps.length || 7;
  const FIELDS = steps.flatMap((s) => s.fields);
  const label = (k, v) => { const f = FIELDS.find((x) => x.k === k); if (!f || !f.opts) return v; const one = (x) => (f.opts.find(([a]) => a === x) || [null, x])[1]; return Array.isArray(v) ? v.map(one).join(', ') : one(v); };
  const all = Array.isArray(j) ? j : [];
  const done = (a) => a.finalizata !== false; // aplicările de dinainte de pași nu au câmpul
  const eds = [...new Set(all.map((a) => a.editie).filter(Boolean))];
  const state = { ed: 'toate', st: 'toate', q: '', open: null };
  const reia = (a) => `${SITE}/aplica?reia=${a.token}`;

  // toate răspunsurile unei aplicări, pe pași
  const answers = (a) => {
    const d = { ...a, ...(a.raspunsuri || {}) };
    const body = steps.map((s, i) => {
      const rows = s.fields.filter((f) => f.t !== 'consent' && d[f.k] != null && d[f.k] !== '' && !(Array.isArray(d[f.k]) && !d[f.k].length));
      return rows.length ? `<div><h4>${i + 1}. ${esc(s.titlu)}</h4><dl>${rows.map((f) => `<dt>${esc(f.label)}</dt><dd>${esc(f.k === 'editie' ? edName(d[f.k]) : label(f.k, d[f.k]))}</dd>`).join('')}</dl></div>` : '';
    }).join('');
    return `<tr class="ap-detail"><td colspan="7"><div class="ap-ans">${body || '<p class="muted small">Doar datele de contact, deocamdată.</p>'}</div></td></tr>`;
  };

  const draw = () => {
    const q = state.q.trim().toLowerCase();
    const list = all.filter((a) => (state.ed === 'toate' || a.editie === state.ed) && (state.st === 'toate' || (state.st === 'trimise') === done(a))
      && (!q || [a.nume, a.email, a.companie, a.cui, a.telefon].join(' ').toLowerCase().includes(q)));
    $('#ap-list').innerHTML = list.length ? `<div class="tbl"><table>
      <thead><tr><th>Ultima activitate</th><th>Stadiu</th><th>Nume și companie</th><th>Cifra de afaceri</th><th>Ediția</th><th>Contact</th><th></th></tr></thead>
      <tbody>${list.map((a) => `<tr${a.cifra_afaceri === 'sub-500k' ? ' class="warn-row"' : ''}>
        <td class="small">${esc(dt(a.actualizat || a.primit))}</td>
        <td>${done(a) ? '<span class="tag ok">trimisă</span>' : `<span class="tag warn">pasul ${a.pas || 1} din ${N}</span>`}</td>
        <td><b>${esc(a.nume)}</b><div class="small">${esc(a.companie)}${a.cui ? ` · <a href="https://www.termene.ro/firma/${esc(a.cui.replace(/^RO/i, ''))}" target="_blank" rel="noopener" title="Verifică firma">${esc(a.cui)}</a>` : ''}</div></td>
        <td class="small">${a.cifra_afaceri ? esc(label('cifra_afaceri', a.cifra_afaceri)) : '—'}${a.cifra_afaceri === 'sub-500k' ? ' <span class="tag bad">sub prag</span>' : ''}</td>
        <td>${a.editie ? `<span class="tag">${esc(edName(a.editie))}</span>` : '<span class="muted">—</span>'}</td>
        <td class="small"><a href="mailto:${esc(a.email)}">${esc(a.email)}</a><br><a href="tel:${esc(String(a.telefon || '').replace(/[^\d+]/g, ''))}">${esc(a.telefon)}</a></td>
        <td class="small ap-acts"><button type="button" data-open="${esc(a.id)}">${state.open === a.id ? 'Ascunde' : 'Răspunsuri'}</button>${!done(a) && a.token ? `<button type="button" data-copy="${esc(reia(a))}" title="Linkul cu care omul își reia aplicarea de unde a rămas">Copiază linkul de reluare</button>` : ''}</td></tr>
        ${state.open === a.id ? answers(a) : ''}`).join('')}</tbody></table></div>`
      : `<div class="card empty">${all.length ? 'Nicio aplicare nu se potrivește filtrului.' : 'Încă nu a venit nicio aplicare.'}</div>`;
    $('#ap-count').textContent = `${list.length} din ${all.length}`;
  };

  const nDone = all.filter(done).length;
  $('#view').innerHTML = `<div class="head"><div><div class="crumb">manage › leads · aplicările din formularul /aplica (Supabase)</div><h1>Leads <span class="n" id="ap-count"></span></h1></div>
      <button type="button" id="ap-csv"${all.length ? '' : ' disabled'}>Descarcă CSV</button></div>${leadsTabs('aplicari')}
    <div class="toolbar"><div class="seg-chips" id="ap-st">${[['toate', 'Toate', all.length], ['trimise', 'Trimise', nDone], ['neterminate', 'Neterminate', all.length - nDone]].map(([k, l, n]) => `<button type="button" data-st="${k}" class="${k === 'toate' ? 'on' : ''}">${l} · ${n}</button>`).join('')}</div>
      <div class="seg-chips" id="ap-eds">${['toate', ...eds].map((e) => `<button type="button" data-ed="${esc(e)}" class="${e === 'toate' ? 'on' : ''}">${e === 'toate' ? 'Toate edițiile' : esc(edName(e))}</button>`).join('')}</div>
      <input type="search" id="ap-q" placeholder="Caută nume, email, companie, CUI…"></div>
    <div id="ap-list"></div>
    <p class="muted small">Neterminate = au lăsat datele de contact, dar n-au trimis aplicarea. Pentru reminder, trimite-le linkul de reluare: îi duce la pasul la care au rămas, cu răspunsurile completate. Datele personale de aici nu se publică: panoul de pe Vercel nu are acces la ele.</p>`;
  $('#ap-st').onclick = (e) => { const b = e.target.closest('[data-st]'); if (!b) return; state.st = b.dataset.st; $$('#ap-st button').forEach((x) => x.classList.toggle('on', x === b)); draw(); };
  $('#ap-eds').onclick = (e) => { const b = e.target.closest('[data-ed]'); if (!b) return; state.ed = b.dataset.ed; $$('#ap-eds button').forEach((x) => x.classList.toggle('on', x === b)); draw(); };
  $('#ap-q').oninput = (e) => { state.q = e.target.value; draw(); };
  $('#ap-list').onclick = async (e) => {
    const o = e.target.closest('[data-open]');
    if (o) { state.open = state.open === o.dataset.open ? null : o.dataset.open; draw(); return; }
    const c = e.target.closest('[data-copy]');
    if (c) { await navigator.clipboard.writeText(c.dataset.copy).catch(() => {}); c.textContent = 'Copiat ✓'; setTimeout(() => { c.textContent = 'Copiază linkul de reluare'; }, 1800); }
  };
  $('#ap-csv').onclick = () => {
    const keys = FIELDS.filter((f) => f.t !== 'consent').map((f) => f.k);
    const cols = ['primit', 'actualizat', 'finalizata', 'pas', 'stare', ...keys];
    const cell = (v) => `"${String(Array.isArray(v) ? v.join('; ') : v ?? '').replace(/"/g, '""')}"`;
    const row = (a) => { const d = { ...a, ...(a.raspunsuri || {}) }; return cols.map((c) => cell(keys.includes(c) && c !== 'editie' ? label(c, d[c]) : d[c])).join(','); };
    download(`aplicari-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + [cols.join(','), ...all.map(row)].join('\n'), 'text/csv;charset=utf-8');
  };
  draw();
};

// filele de sus: aplicările la program și mesajele celor care vor să-l susțină
const LEADS_N = { aplicari: null, sustinere: null };
const leadsTabs = (on) => `<div class="pills"><a href="/manage/leads" class="${on === 'aplicari' ? 'on' : ''}">Aplicări${LEADS_N.aplicari != null ? ' · ' + LEADS_N.aplicari : ''}</a><a href="/manage/leads?lista=sustinere" class="${on === 'sustinere' ? 'on' : ''}">Susținere (sponsori, gazde, traineri)${LEADS_N.sustinere != null ? ' · ' + LEADS_N.sustinere : ''}</a></div>`;
// numărul de leads lângă „Leads” în meniu (doar local; pe Vercel lista nu e accesibilă)
Promise.all(['/api/aplicari', '/api/implicari'].map((u) => fetch(u, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null))).then(([a, b]) => {
  if (Array.isArray(a)) LEADS_N.aplicari = a.length;
  if (Array.isArray(b)) LEADS_N.sustinere = b.length;
  if (Array.isArray(a) || Array.isArray(b)) $('#n-leads').textContent = (a?.length || 0) + (b?.length || 0);
});

/* LEADS › Susținere: mesajele din formularul „Susține programul” de pe /parteneri (Supabase, tabelul implicari) */
const TIP_LABEL = { sponsorizare: 'Sponsorizare atelier', gazduire: 'Găzduire atelier', mentorat: 'Trainer / mentor' };
async function renderSustinere(box) {
  box.innerHTML = '<div class="card empty">Se încarcă…</div>';
  const r = await fetch('/api/implicari', { cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { box.innerHTML = `<div class="card empty"><b>${esc(j.error || 'Nu am putut încărca mesajele.')}</b></div>`; return; }
  const all = Array.isArray(j) ? j : [];
  const state = { tip: 'toate', q: '' };
  const draw = () => {
    const q = state.q.trim().toLowerCase();
    const list = all.filter((a) => (state.tip === 'toate' || a.tip === state.tip) && (!q || [a.nume, a.functie, a.email, a.companie, a.telefon, a.mesaj].join(' ').toLowerCase().includes(q)));
    $('#im-list').innerHTML = list.length ? `<div class="tbl"><table>
      <thead><tr><th>Primit</th><th>Ce vrea</th><th>Nume</th><th>Companie</th><th>Contact</th><th>Mesaj</th></tr></thead>
      <tbody>${list.map((a) => `<tr><td class="small">${esc(dt(a.primit))}</td><td><span class="tag">${esc(TIP_LABEL[a.tip] || a.tip)}</span></td><td><b>${esc(a.nume)}</b>${a.functie ? `<div class="small muted">${esc(a.functie)}</div>` : ''}</td><td>${esc(a.companie)}</td>
        <td class="small"><a href="mailto:${esc(a.email)}">${esc(a.email)}</a>${a.telefon ? `<br><a href="tel:${esc(a.telefon.replace(/[^\d+]/g, ''))}">${esc(a.telefon)}</a>` : ''}</td>
        <td class="small">${esc(a.mesaj || '—')}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="card empty">${all.length ? 'Niciun mesaj nu se potrivește filtrului.' : 'Încă nu a venit niciun mesaj din formularul de pe /parteneri.'}</div>`;
  };
  box.innerHTML = `<div class="toolbar"><div class="seg-chips" id="im-tips">${['toate', ...Object.keys(TIP_LABEL)].map((t) => `<button type="button" data-tip="${t}" class="${t === 'toate' ? 'on' : ''}">${t === 'toate' ? 'Toate' : esc(TIP_LABEL[t])} · ${t === 'toate' ? all.length : all.filter((a) => a.tip === t).length}</button>`).join('')}</div>
      <input type="search" id="im-q" placeholder="Caută nume, email, companie…"><button type="button" id="im-csv"${all.length ? '' : ' disabled'}>Descarcă CSV</button></div>
    <div id="im-list"></div>`;
  $('#im-tips').onclick = (e) => { const b = e.target.closest('[data-tip]'); if (!b) return; state.tip = b.dataset.tip; $$('#im-tips button').forEach((x) => x.classList.toggle('on', x === b)); draw(); };
  $('#im-q').oninput = (e) => { state.q = e.target.value; draw(); };
  $('#im-csv').onclick = () => {
    const cols = ['primit', 'tip', 'nume', 'functie', 'companie', 'email', 'telefon', 'mesaj', 'stare'];
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    download(`sustinere-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + [cols.join(','), ...all.map((a) => cols.map((c) => cell(a[c])).join(','))].join('\n'), 'text/csv;charset=utf-8');
  };
  draw();
}
