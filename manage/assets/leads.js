/* LEADS: aplicările trimise din formularul /aplica al site-ului (Supabase, tabelul aplicari).
   Se văd doar în panoul local (cheia de citire e în .env.local); pe Vercel panoul e public, deci nu le arată. */
const CA_LABEL = { 'sub-500k': 'Sub 500.000 €', '500k-1m': '500.000 – 1 mil. €', '1m-10m': '1 – 10 mil. €', 'peste-10m': 'Peste 10 mil. €' };
const edName = (id) => { const m = /^(cluj|bucuresti)-(\d+)$/.exec(id || ''); return m ? `${m[1] === 'cluj' ? 'Cluj' : 'București'} #${m[2]}` : id; };
const dt = (s) => new Date(s).toLocaleString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

routes.leads = async function renderLeads() {
  if (new URLSearchParams(location.search).get('lista') === 'sustinere') {
    $('#view').innerHTML = `<div class="head"><div><div class="crumb">manage › leads · mesajele din formularul de pe /parteneri (Supabase)</div><h1>Leads</h1></div></div>${leadsTabs('sustinere')}<div id="im-box"></div><p class="muted small">Datele personale de aici nu se publică: panoul de pe Vercel nu are acces la ele.</p>`;
    return renderSustinere($('#im-box'));
  }
  $('#view').innerHTML = `<div class="head"><div><div class="crumb">manage › leads · aplicările din formularul /aplica (Supabase)</div><h1>Leads</h1></div></div><div class="card empty">Se încarcă…</div>`;
  const r = await fetch('/api/aplicari', { cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    $('#view').innerHTML = `<div class="head"><div><div class="crumb">manage › leads</div><h1>Leads</h1></div></div>
      <div class="card empty"><b>${esc(j.error || 'Nu am putut încărca aplicările.')}</b><p class="muted small">Aplicările conțin date personale, așa că se văd doar în panoul pornit local, nu pe varianta publicată.</p></div>`;
    return;
  }
  const all = Array.isArray(j) ? j : [];
  const eds = [...new Set(all.map((a) => a.editie))];
  const state = { ed: 'toate', q: '' };

  const draw = () => {
    const q = state.q.trim().toLowerCase();
    const list = all.filter((a) => (state.ed === 'toate' || a.editie === state.ed) && (!q || [a.nume, a.email, a.companie, a.cui, a.telefon].join(' ').toLowerCase().includes(q)));
    $('#ap-list').innerHTML = list.length ? `<div class="tbl"><table>
      <thead><tr><th>Primit</th><th>Ediția</th><th>Nume</th><th>Companie</th><th>CUI</th><th>Cifra de afaceri</th><th>Contact</th><th>De unde</th></tr></thead>
      <tbody>${list.map((a) => `<tr${a.cifra_afaceri === 'sub-500k' ? ' class="warn-row"' : ''}>
        <td class="small">${esc(dt(a.primit))}</td><td><span class="tag">${esc(edName(a.editie))}</span></td><td><b>${esc(a.nume)}</b></td>
        <td>${esc(a.companie)}</td><td><a href="https://www.termene.ro/firma/${esc(a.cui.replace(/^RO/i, ''))}" target="_blank" rel="noopener" title="Verifică firma">${esc(a.cui)}</a></td>
        <td class="small">${esc(CA_LABEL[a.cifra_afaceri] || a.cifra_afaceri)}${a.cifra_afaceri === 'sub-500k' ? ' <span class="tag bad">sub prag</span>' : ''}</td>
        <td class="small"><a href="mailto:${esc(a.email)}">${esc(a.email)}</a><br><a href="tel:${esc(a.telefon.replace(/[^\d+]/g, ''))}">${esc(a.telefon)}</a></td>
        <td class="small muted">${esc(a.sursa === 'Altceva' ? a.sursa_alta || 'Altceva' : a.sursa || '—')}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="card empty">${all.length ? 'Nicio aplicare nu se potrivește filtrului.' : 'Încă nu a venit nicio aplicare.'}</div>`;
    $('#ap-count').textContent = `${list.length} din ${all.length}`;
  };

  $('#view').innerHTML = `<div class="head"><div><div class="crumb">manage › leads · aplicările din formularul /aplica (Supabase)</div><h1>Leads <span class="n" id="ap-count"></span></h1></div>
      <button type="button" id="ap-csv"${all.length ? '' : ' disabled'}>Descarcă CSV</button></div>${leadsTabs('aplicari')}
    <div class="toolbar"><div class="seg-chips" id="ap-eds">${['toate', ...eds].map((e) => `<button type="button" data-ed="${esc(e)}" class="${e === 'toate' ? 'on' : ''}">${e === 'toate' ? 'Toate' : esc(edName(e))} · ${e === 'toate' ? all.length : all.filter((a) => a.editie === e).length}</button>`).join('')}</div>
      <input type="search" id="ap-q" placeholder="Caută nume, email, companie, CUI…"></div>
    <div id="ap-list"></div>
    <p class="muted small">Datele personale de aici nu se publică: panoul de pe Vercel nu are acces la ele. Linkul pe CUI deschide firma pe termene.ro, pentru verificarea cifrei de afaceri.</p>`;
  $('#ap-eds').onclick = (e) => { const b = e.target.closest('[data-ed]'); if (!b) return; state.ed = b.dataset.ed; $$('#ap-eds button').forEach((x) => x.classList.toggle('on', x === b)); draw(); };
  $('#ap-q').oninput = (e) => { state.q = e.target.value; draw(); };
  $('#ap-csv').onclick = () => {
    const cols = ['primit', 'editie', 'nume', 'email', 'telefon', 'companie', 'cui', 'cifra_afaceri', 'sursa', 'sursa_alta', 'stare'];
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    download(`aplicari-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + [cols.join(','), ...all.map((a) => cols.map((c) => cell(a[c])).join(','))].join('\n'), 'text/csv;charset=utf-8');
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
    const list = all.filter((a) => (state.tip === 'toate' || a.tip === state.tip) && (!q || [a.nume, a.email, a.companie, a.telefon, a.mesaj].join(' ').toLowerCase().includes(q)));
    $('#im-list').innerHTML = list.length ? `<div class="tbl"><table>
      <thead><tr><th>Primit</th><th>Ce vrea</th><th>Nume</th><th>Companie</th><th>Contact</th><th>Mesaj</th></tr></thead>
      <tbody>${list.map((a) => `<tr><td class="small">${esc(dt(a.primit))}</td><td><span class="tag">${esc(TIP_LABEL[a.tip] || a.tip)}</span></td><td><b>${esc(a.nume)}</b></td><td>${esc(a.companie)}</td>
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
    const cols = ['primit', 'tip', 'nume', 'companie', 'email', 'telefon', 'mesaj', 'stare'];
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    download(`sustinere-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + [cols.join(','), ...all.map((a) => cols.map((c) => cell(a[c])).join(','))].join('\n'), 'text/csv;charset=utf-8');
  };
  draw();
}
