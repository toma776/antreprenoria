/* Nucleul panoului: utilitare, date, rutare, iconițe, dashboard. */
const SITE = 'https://antreprenoria.ro';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const shortUrl = (u) => String(u || '').replace(/^https?:\/\/(www\.)?antreprenoria\.ro/, '') || '/';
const link = (u, t) => (u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t ?? shortUrl(u))}</a>` : '<span class="muted">—</span>');
const lei = (n) => (n == null || n === '' ? '—' : `${Number(n).toLocaleString('ro-RO')} lei`);
const leiShort = (n) => (n == null ? '—' : n >= 1e6 ? `${(n / 1e6).toLocaleString('ro-RO', { maximumFractionDigits: 1 })} mil. lei` : n >= 1e3 ? `${Math.round(n / 1e3).toLocaleString('ro-RO')} mii lei` : lei(n));
const tags = (list, cls = 'grey') => [].concat(list || []).filter(Boolean).map((t) => `<span class="tag ${cls}">${esc(t)}</span>`).join('');
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const cut = (s, n = 60) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const fmtDay = (s) => (s ? new Date(s + 'T12:00').toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const initials = (n) => String(n || '').split(/[\s-]+/).filter(Boolean).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2200); };
const download = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); };
const src = (list) => {
  const L = [...new Set([].concat(list || []).filter(Boolean))];
  if (!L.length) return '';
  return `<details class="src"><summary>${plural(L.length, 'pagină', 'pagini')}</summary>${L.map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(shortUrl(u))}</a>`).join('')}</details>`;
};

const api = {
  get: (u) => fetch(u, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  send: (u, method, body) => fetch(u, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status); return j; }),
};
const store = { entitati: null };

/* ---------- iconițe (stroke 24×24) ---------- */
const ICON = {
  program: '<path d="M12 2l2.6 6.2L21 9l-5 4.4L17.5 20 12 16.6 6.5 20 8 13.4 3 9l6.4-.8z"/>',
  editii: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M7.5 13h3M7.5 17h3M13.5 13h3"/>',
  oameni: '<path d="M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3 3 0 100-6 3 3 0 000 6zM21 19v-1a4 4 0 00-3-3.9M15.5 4.1a3 3 0 010 5.8"/>',
  companii: '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M9 10h.01M15 10h.01M9 13h.01M15 13h.01"/>',
  parteneri: '<path d="M8 12l3 3 5-6M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z"/>',
  teme: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5zM4 19.5A2.5 2.5 0 006.5 22H20v-5M9 7h7M9 11h5"/>',
};
const icon = (id, size = 20) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[id] || ICON.program}</svg>`;

/* ---------- rutare ---------- */
const routes = {};
function routeFromPath() {
  const seg = location.pathname.replace(/^\/manage\/?/, '').split('/')[0];
  return routes[seg] ? seg : 'dashboard';
}
function go(route) {
  $$('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === route));
  routes[route]();
}
function navigate(path) {
  history.pushState({}, '', path);
  go(routeFromPath());
  window.scrollTo(0, 0);
}
// orice link intern spre /manage/... se deschide fără reîncărcare
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="/manage"]');
  if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  navigate(a.getAttribute('href'));
});
window.addEventListener('popstate', () => go(routeFromPath()));

// numărul total de entități din creier: ediții, ateliere, oameni, organizații, locații, teme (aceleași noduri ca în Sinapse)
const entityTotal = (D) => D.editii.length + D.editii.reduce((n, e) => n + e.ateliere.length, 0) + D.oameni.length + D.organizatii.length + D.locatii.length + D.teme.length;
function updateCounts() {
  const E = store.entitati;
  $('#n-entitati').textContent = E ? entityTotal(E) : '';
}

/* ---------- DASHBOARD ---------- */
routes.dashboard = function renderDashboard() {
  const E = store.entitati;
  if (!E) { $('#view').innerHTML = '<div class="card empty"><b>Lipsește data/entitati.json</b>Rulează <code>npm run sync</code>.</div>'; return; }
  const curr = E.editii.filter((e) => e.deschisa);
  const topPeople = E.oameni.filter((p) => p.aparitii.length).sort((a, b) => b.editii.length - a.editii.length).slice(0, 6);
  const alumni = E.organizatii.filter((o) => o.tipuri.includes('alumni'));
  const ciclu = E.organizatii.filter((o) => o.ciclu);
  const sect = {};
  alumni.forEach((c) => (sect[c.sector] = (sect[c.sector] || 0) + 1));
  const topSect = Object.entries(sect).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = topSect[0]?.[1] || 1;

  $('#view').innerHTML = `
    <div class="head"><div><div class="crumb">manage</div><h1>Dashboard</h1></div></div>
    <div class="kpis">
      <a class="kpi" href="/manage/entitati/editii"><b>${E.editii.length}</b><span>ediții pe site</span></a>
      <div class="kpi"><b>${E.editii.reduce((n, e) => n + e.ateliere.length, 0)}</b><span>ateliere</span></div>
      <a class="kpi" href="/manage/entitati/oameni"><b>${E.oameni.filter((p) => p.aparitii.length).length}</b><span>traineri & speakeri</span></a>
      <a class="kpi" href="/manage/entitati/organizatii/alumni"><b>${alumni.length}</b><span>companii alumni</span></a>
      <a class="kpi" href="/manage/entitati/organizatii"><b>${E.organizatii.length}</b><span>organizații</span></a>
      <a class="kpi" href="/manage/entitati/organizatii/ciclu"><b>${ciclu.length}</b><span>alumni deveniți parteneri</span></a>
    </div>
    <div class="grid2">
      <div class="card">
        <h3><a href="/manage/entitati/editii">Ediții în curs →</a></h3>
        ${curr.map((e) => `<p><a href="/manage/entitati/editii/${e.id}"><b>${esc(edLabel(e))}</b></a> · ${esc(e.perioada)} · ${tags(e.status, 'ok')}<br>${plural(e.ateliere.length, 'atelier', 'ateliere')}, ${plural(e.participanti.length, 'participant', 'participanți')}${e.preturi.filter((p) => !p.ascuns).map((p) => ` · ${esc(p.pret_text)}`).join('')}</p>`).join('')}
      </div>
      <div class="card">
        <h3><a href="/manage/entitati/organizatii/ciclu">Din alumni, parteneri →</a></h3>
        ${ciclu.map((o) => `<p><a href="/manage/entitati/organizatii/o/${o.id}"><b>${esc(o.nume)}</b></a> <span class="muted">· alumni ${esc(edShort(o.ciclu.alumni_din))}, apoi ${esc(o.ciclu.apoi.join(', '))}</span></p>`).join('')}
      </div>
      <div class="card">
        <h3><a href="/manage/entitati/oameni/traineri">Cei mai constanți traineri →</a></h3>
        ${topPeople.map((p) => `<p><a href="/manage/entitati/oameni/p/${p.id}">${esc(p.nume)}</a> <span class="muted">· ${plural(p.editii.length, 'ediție', 'ediții')} · ${esc(p.companii[p.companii.length - 1] || '')}</span></p>`).join('')}
      </div>
      <div class="card">
        <h3><a href="/manage/entitati/organizatii/alumni">Companii alumni pe sectoare →</a></h3>
        ${topSect.map(([k, v]) => `<div class="small" style="margin:8px 0 0">${esc(k)} <span class="muted">· ${v}</span><div class="bar"><i style="width:${(v / max) * 100}%"></i></div></div>`).join('')}
      </div>
    </div>
    <p class="muted small" style="margin-top:16px">Extras din ${link(E.meta.sursa, 'antreprenoria.ro')} la ${esc(E.meta.extras_la)} · ${E.meta.pagini} pagini citite</p>`;
};
