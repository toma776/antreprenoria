/* LEADS: aplicările trimise din formularul /aplica al site-ului (Supabase, tabelul aplicari).
   Se văd doar în panoul local (cheia de citire e în .env.local); pe Vercel panoul e public, deci nu le arată. */
const CA_LABEL = { 'sub-500k': 'Sub 500.000 €', '500k-1m': '500.000 – 1 mil. €', '1m-10m': '1 – 10 mil. €', 'peste-10m': 'Peste 10 mil. €' };
const edName = (id) => { const m = /^(cluj|bucuresti)-(\d+)$/.exec(id || ''); return m ? `${m[1] === 'cluj' ? 'Cluj' : 'București'} #${m[2]}` : id; };
const dt = (s) => new Date(s).toLocaleString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

routes.leads = async function renderLeads() {
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
      <button type="button" id="ap-csv"${all.length ? '' : ' disabled'}>Descarcă CSV</button></div>
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

// numărul de leads lângă „Leads” în meniu (doar local; pe Vercel lista nu e accesibilă)
fetch('/api/aplicari', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (Array.isArray(j)) $('#n-leads').textContent = j.length; }).catch(() => {});
