/* PRESĂ: aparițiile programului în presă și pe alte canale (origine externă), cu citatele lor.
   Fiecare apariție și fiecare citat se validează (propus / validat / respins) înainte de folosire pe site. */

const PRESA_ST = [['propus', 'Propus', 'warn'], ['validat', 'Validat', 'ok'], ['respins', 'Respins', 'bad']];
const PRESA_TIP = {
  interviu: ['Interviu', 'ok'], articol: ['Articol', 'ok'], 'comunicat-preluat': ['Comunicat preluat', ''], 'blog-participant': ['Blog de participant', ''],
  'blog-partener': ['Blog de partener', 'grey'], blog: ['Blog', 'grey'], 'canal-propriu': ['Canal propriu RBL', 'grey'], advertorial: ['Advertorial', 'bad'],
};
const presaUI = { tip: '', status: '' };
const stOf = (id) => store.presaStatus?.[id]?.status || 'propus';
const stTag = (id) => { const x = PRESA_ST.find((s) => s[0] === stOf(id)); return `<span class="tag ${x[2]}">${x[1].toLowerCase()}</span>`; };
const tipTag = (t) => { const x = PRESA_TIP[t] || [t, 'grey']; return `<span class="tag ${x[1]}">${esc(x[0])}</span>`; };
const greutateTag = (g) => `<span class="tag ${g === 'ridicată' ? 'ok' : g === 'medie' ? '' : 'grey'}" title="greutate ca dovadă">${esc(g)}</span>`;
const presaById = (D, id) => D.presa.aparitii.find((a) => a.id === id);
const citatAutor = (c) => (c.persoana && IX.P[c.persoana] ? personChip(c.persoana, c.autor.split(', ').slice(1).join(', ')) : `<b>${esc(c.autor)}</b>`);

// butoanele de validare, aceleași pentru apariții și citate
function statusBox(id) {
  const nota = store.presaStatus?.[id]?.nota || '';
  return `<div class="status-box" data-presa="${esc(id)}">
    ${stTag(id)}
    ${stOf(id) !== 'validat' ? '<button class="sm" data-presa-set="validat">Validează</button>' : ''}
    ${stOf(id) !== 'respins' ? '<button class="sm danger" data-presa-set="respins">Respinge</button>' : ''}
    ${stOf(id) !== 'propus' ? '<button class="sm" data-presa-set="propus">Înapoi la propus</button>' : ''}
    <input class="presa-nota" placeholder="Notă (opțional)" value="${esc(nota)}" style="flex:1;min-width:160px;padding:4px 8px">
  </div>`;
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-presa-set]');
  if (!b) return;
  const box = b.closest('[data-presa]');
  const id = box.dataset.presa, status = b.dataset.presaSet, nota = $('.presa-nota', box).value.trim();
  try {
    await api.send('/api/presa/status', 'PUT', { id, status, nota });
    store.presaStatus = (await api.get('/api/presa/status')) || {};
    const y = window.scrollY;
    go(routeFromPath());
    window.scrollTo(0, y);
    toast(status === 'validat' ? 'Validat' : status === 'respins' ? 'Respins' : 'Înapoi la propus');
  } catch { toast('Nu s-a putut salva'); }
});

function presaGroups(D) {
  const A = D.presa.aparitii, C = A.flatMap((a) => a.citate.map((c) => ({ ...c, aparitie: a })));
  const publicatii = [...new Set(A.map((a) => a.publicatie))];
  return {
    aparitii: { title: 'Apariții', count: A.length, desc: 'Articole, interviuri, comunicate preluate și bloguri despre program, de la prima ediție (2013) până azi.', html: () => presaList(D, A) },
    citate: { title: 'Citate', count: C.length, desc: 'Citate exacte despre program, cu autorul și sursa. Doar cele validate ajung pe site.', html: () => citateList(C) },
    istoric: { title: 'Istoricul programului', count: null, desc: 'Ce aflăm din presă despre edițiile de dinainte de #16 și despre evoluția programului, pe ani, lângă edițiile din creier.', html: () => istoricHtml(D) },
    publicatii: { title: 'Publicații', count: publicatii.length, desc: 'Unde a apărut programul și cu ce greutate.', html: () => publicatiiHtml(D, publicatii) },
  };
}

function presaList(D, A) {
  const list = A.filter((a) => (!presaUI.tip || a.tip === presaUI.tip) && (!presaUI.status || stOf(a.id) === presaUI.status)).slice().reverse();
  const tipuri = [...new Set(A.map((a) => a.tip))];
  return `<div class="obs-bar">
      <button class="sm ${!presaUI.tip ? 'on' : ''}" data-presa-tip="">Toate tipurile</button>
      ${tipuri.map((t) => `<button class="sm ${presaUI.tip === t ? 'on' : ''}" data-presa-tip="${t}">${esc(PRESA_TIP[t]?.[0] || t)} · ${A.filter((a) => a.tip === t).length}</button>`).join('')}
      <span class="grow"></span>
      <button class="sm ${!presaUI.status ? 'on' : ''}" data-presa-st="">Toate</button>
      ${PRESA_ST.map(([s, l]) => `<button class="sm ${presaUI.status === s ? 'on' : ''}" data-presa-st="${s}">${l} · ${A.filter((a) => stOf(a.id) === s).length}</button>`).join('')}
    </div>
    ${list.map((a) => aparitieHtml(a)).join('') || '<div class="card empty">Nicio apariție pentru filtrul ales.</div>'}
    ${D.presa.respinse.length ? `<details class="obs-done"><summary>Găsite și eliminate la culegere · ${D.presa.respinse.length}</summary>${D.presa.respinse.map((r) => `<p class="small">${link(r.url, r.publicatie)} ${r.data ? '· ' + fmtDay(r.data) : ''} · <span class="muted">${esc(r.motiv)}</span></p>`).join('')}</details>` : ''}`;
}
function aparitieHtml(a, open = false) {
  return `<details class="item" data-s ${open ? 'open' : ''}><summary>
      <span class="name">${esc(a.titlu)}</span>
      <span>${tipTag(a.tip)} ${greutateTag(a.greutate)} ${a.citate.length ? `<span class="tag">${plural(a.citate.length, 'citat', 'citate')}</span>` : ''} ${stTag(a.id)}</span>
      <span class="muted small" style="flex-basis:100%">${esc(a.publicatie)} · ${a.data ? fmtDay(a.data) : 'fără dată'}${a.autor ? ' · ' + esc(a.autor) : ''}${a.relevanta === 'precursor' ? ' · <b>program precursor</b>' : ''}</span>
    </summary><div class="item-body">
      <dl class="kv" style="margin-top:12px">
        ${kvRow('Link', link(a.url, a.url.replace(/^https?:\/\/(www\.)?/, '')))}
        ${kvRow('Notă', esc(a.nota))}
        ${kvRow('Ediții menționate', [...a.editii_istorice.map((t) => `<span class="tag grey">${esc(t)}</span>`), ...a.editii.map(edLink)].join(' '))}
        ${kvRow('Oameni din creier', a.oameni.map((id) => personChip(id)).join(''))}
        ${kvRow('Alți oameni menționați', esc(a.alti_oameni.join(', ')))}
        ${kvRow('Organizații', a.organizatii.map(orgLink).join(' · '))}
        ${kvRow('Alumni menționați', a.alumni_mentionati ? tags(a.alumni_mentionati, '') : '')}
      </dl>
      ${a.fapte.length ? `<h4>Ce aflăm</h4><ul class="clean small">${a.fapte.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
      ${a.citate.length ? `<h4>Citate</h4>${a.citate.map((c) => citatHtml({ ...c, aparitie: a }, false)).join('')}` : ''}
      ${statusBox(a.id)}
    </div></details>`;
}
function citatHtml(c, withSource = true) {
  return `<div class="card" data-s style="margin-bottom:8px">
    <blockquote class="quote">„${esc(c.text)}”</blockquote>
    <div class="small" style="margin-top:6px">${citatAutor(c)} <span class="muted">· despre ${esc(c.despre)}</span></div>
    ${withSource ? `<div class="small muted" style="margin-top:4px">${link(c.aparitie.url, c.aparitie.publicatie)} · ${c.aparitie.data ? fmtDay(c.aparitie.data) : ''} · ${tipTag(c.aparitie.tip)}</div>` : ''}
    ${statusBox(c.id)}
  </div>`;
}
function citateList(C) {
  return C.slice().sort((a, b) => (b.aparitie.data || '').localeCompare(a.aparitie.data || '')).map((c) => citatHtml(c)).join('');
}
// istoricul pe ani: faptele din presă + edițiile din creier
function istoricHtml(D) {
  const years = {};
  D.presa.aparitii.forEach((a) => { if (a.an) (years[a.an] ||= { presa: [], editii: [] }).presa.push(a); });
  D.editii.forEach((e) => (years[e.an] ||= { presa: [], editii: [] }).editii.push(e));
  return `<div class="timeline-y">${Object.keys(years).sort().map((y) => `
    <div class="ty-row"><div class="ty-year">${y}</div><div class="ty-body">
      ${years[y].editii.map((e) => `<div class="ty-ed"><a href="/manage/entitati/editii/${e.id}"><b>Antreprenoria ${esc(edLabel(e))}</b></a> <span class="muted small">· ${esc(e.perioada)} · ${e.participanti.length} participanți · pagină pe site</span></div>`).join('')}
      ${years[y].presa.map((a) => `<div class="ty-p">
        <div class="small">${a.editii_istorice.map((t) => `<span class="tag grey">${esc(t)}</span>`).join('')} ${tipTag(a.tip)} <span class="muted">${link(a.url, a.publicatie)}</span></div>
        <ul class="clean small">${a.fapte.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div>`).join('')}
    </div></div>`).join('')}</div>`;
}
function publicatiiHtml(D, pubs) {
  const A = D.presa.aparitii;
  return `<div class="tbl"><table><thead><tr><th>Publicație</th><th>Apariții</th><th>Tipuri</th><th>Ani</th><th>Citate</th></tr></thead><tbody>
    ${pubs.map((p) => { const L = A.filter((a) => a.publicatie === p); return `<tr data-s><td><b>${esc(p)}</b></td><td>${L.length}</td><td>${[...new Set(L.map((a) => a.tip))].map(tipTag).join('')}</td>
      <td class="small">${[...new Set(L.map((a) => a.an).filter(Boolean))].join(', ')}</td><td>${L.reduce((n, a) => n + a.citate.length, 0) || ''}</td></tr>`; }).join('')}
  </tbody></table></div>`;
}
// secțiunea „În presă” de pe pagina unei persoane sau organizații
function presaSection(D, ids) {
  if (!ids?.length) return '';
  const L = ids.map((id) => presaById(D, id)).filter(Boolean);
  return `<section style="margin-top:18px"><h2>În presă <span class="n">${L.length}</span></h2>${L.map((a) => aparitieHtml(a)).join('')}</section>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-presa-tip], [data-presa-st]');
  if (!b) return;
  if (b.dataset.presaTip !== undefined) presaUI.tip = b.dataset.presaTip;
  if (b.dataset.presaSt !== undefined) presaUI.status = b.dataset.presaSt;
  routes.entitati();
});
