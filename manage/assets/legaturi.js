/* LEGĂTURI: graful creierului Antreprenoria. Noduri = entitățile din data/entitati.json; legături = relațiile dintre ele
   (atelier -> ediție, temă, locație, sponsor, speakeri; participant -> ediție, companie; speaker -> companie;
   partener -> ediție; locație -> organizația gazdă). Fiecare tip e un „lob” legat de Antreprenoria, în centru. */
const GRAPH_CATS = {
  brand: ['Antreprenoria', '#5B9BE0', 'program'],
  editii: ['Ediții', '#FADC3A', 'editii'],
  ateliere: ['Ateliere', '#8DB6F0', 'editii'],
  teme: ['Teme', '#B9A3E3', 'teme'],
  speakeri: ['Traineri & invitați', '#F28B82', 'oameni/traineri'],
  participanti: ['Participanți', '#7FC8A9', 'oameni/participanti'],
  alumni: ['Companii alumni', '#9FD38A', 'organizatii/alumni'],
  parteneri: ['Parteneri & sponsori', '#F2B36B', 'organizatii/parteneri'],
  companii: ['Companiile speakerilor', '#A9B0BC', 'organizatii/speakeri'],
  locatii: ['Locații', '#7AD3D6', 'organizatii/locatii'],
  echipa: ['Echipa', '#E8919F', 'oameni/echipa'],
};
const loadScript = (id, url) => new Promise((ok, err) => {
  if (document.getElementById(id)) return ok();
  const s = Object.assign(document.createElement('script'), { id, src: url, onload: ok, onerror: err });
  document.head.appendChild(s);
});
const normTxt = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const cleanWs = (t) => String(t || '').replace(/^(Atelier de Seară|COCKTAIL NETWORKING)\s*[-:]\s*/i, '');

function graphData(D) {
  const nodes = new Map(), links = [], seen = new Set();
  const node = (id, nume, cat, extra = {}) => { if (!nodes.has(id)) nodes.set(id, { id, nume, cat, ...extra }); return id; };
  const rel = (a, b, tip = 'rel') => {
    if (!a || !b || a === b || !nodes.has(a) || !nodes.has(b)) return;
    const k = a < b ? a + '|' + b : b + '|' + a;
    if (!seen.has(k)) { seen.add(k); links.push({ source: a, target: b, tip }); }
  };

  node('brand', 'Antreprenoria', 'brand', { centru: true });
  for (const [c, [t]] of Object.entries(GRAPH_CATS)) if (c !== 'brand') { node('lob:' + c, t, c, { lob: true }); rel('brand', 'lob:' + c, 'lob'); }
  const add = (id, nume, cat, extra) => { node(id, nume, cat, extra); rel('lob:' + cat, id, 'lob'); return id; };

  // cine e cine: oamenii și organizațiile primesc lobul după rolul principal
  const personCat = (p) => (p.tipuri.includes('echipă') ? 'echipa' : p.aparitii.length || p.tipuri.some((t) => ['trainer', 'antreprenor invitat', 'facilitator', 'invitat'].includes(t)) ? 'speakeri' : 'participanti');
  const orgCat = (o) => (o.tipuri.some((t) => ['sponsor', 'partener', 'gazdă', 'organizator'].includes(t)) ? 'parteneri' : o.tipuri.includes('alumni') ? 'alumni' : 'companii');
  const label = (e) => (e.serie === 'Cluj' ? `Cluj #${e.numar}` : `#${e.numar}`);

  for (const e of D.editii) add('e:' + e.id, `Antreprenoria ${label(e)}`, 'editii', { important: true, sub: e.perioada });
  for (const t of D.teme) add('t:' + t.id, t.nume, 'teme', { important: true, sub: t.format });
  for (const l of D.locatii) add('l:' + l.id, l.nume, 'locatii', { important: true, sub: l.oras });
  for (const p of D.oameni) { const c = personCat(p); add('p:' + p.id, p.nume, c, { important: c === 'speakeri' && p.editii.length >= 3, sub: (IX.O[p.organizatii[0]]?.nume || p.companii[0] || '') }); }
  for (const o of D.organizatii) { const c = orgCat(o); add('o:' + o.id, o.nume, c, { important: c === 'parteneri' || !!o.ciclu, sub: o.sector || '' }); }

  for (const e of D.editii) {
    for (const a of e.ateliere) {
      const id = add('a:' + a.id, `${cleanWs(a.titlu)} · ${label(e)}`, 'ateliere', { sub: a.data ? fmtDay(a.data) : '' });
      rel(id, 'e:' + e.id);
      if (a.tema) rel(id, 't:' + a.tema);
      if (a.loc) rel(id, 'l:' + a.loc);
      if (a.sponsor) rel(id, 'o:' + a.sponsor, 'sponsor');
      for (const x of a.program) for (const s of x.speakeri) rel(id, 'p:' + s.persoana);
    }
    for (const p of e.participanti) { rel('p:' + p.persoana, 'e:' + e.id); if (p.organizatie) rel('p:' + p.persoana, 'o:' + p.organizatie); }
    for (const x of e.parteneri) rel('o:' + x.organizatie, 'e:' + e.id);
  }
  // speakerii -> companiile lor; locațiile -> organizația gazdă
  for (const p of D.oameni) for (const o of p.organizatii) rel('p:' + p.id, 'o:' + o);
  for (const l of D.locatii) if (l.organizatie) rel('l:' + l.id, 'o:' + l.organizatie);

  const deg = new Map();
  for (const l of links) if (l.tip !== 'lob') for (const k of [l.source, l.target]) deg.set(k, (deg.get(k) || 0) + 1);
  for (const n of nodes.values()) n.deg = deg.get(n.id) || 0;
  return { nodes: [...nodes.values()], links };
}

routes.legaturi = function renderLegaturi() {
  const D = store.entitati;
  if (!D) { $('#view').innerHTML = '<div class="card empty"><b>Lipsește data/entitati.json</b></div>'; return; }
  $('#view').innerHTML = `
    <div class="head"><div><div class="crumb">manage › legături · din data/entitati.json</div><h1>Legături</h1></div></div>
    <div class="brain" id="brain"></div>`;
  renderGraph(D, $('#brain'), (path) => navigate('/manage/entitati/' + path));
};

async function renderGraph(D, el, openCat) {
  el.innerHTML = '<div class="brain-load">Se încarcă graful…</div>';
  try { await loadScript('d3js', 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js'); }
  catch { el.innerHTML = '<div class="brain-load">Nu s-a putut încărca biblioteca grafică (d3, cdnjs).</div>'; return; }
  const { nodes, links } = graphData(D);
  const real = links.filter((l) => l.tip !== 'lob');
  const hidden = new Set();
  el.innerHTML = `
    <div class="brain-head">
      <div><b>Harta creierului Antreprenoria</b><div class="brain-sub">${nodes.filter((n) => !n.lob && !n.centru).length} entități · ${real.length} legături între ele. Treci cu mouse-ul peste un nod ca să vezi cu ce se leagă; click pentru detalii, click pe un lob ca să deschizi categoria.</div></div>
      <div class="brain-tools"><button type="button" class="brain-iso" aria-pressed="false">Arată ce e izolat</button><input type="search" class="brain-q" placeholder="Caută o entitate…" aria-label="Caută în graf"></div>
    </div>
    <div class="brain-legend">${Object.entries(GRAPH_CATS).map(([c, [t, col]]) => `<button type="button" data-gc="${c}" style="--c:${col}"><i></i>${esc(t)}</button>`).join('')}</div>
    <div class="brain-stage"><svg role="img" aria-label="Graful entităților"></svg><div class="brain-tip" hidden></div><div class="brain-info" hidden></div>
      <div class="brain-ctrl"><button type="button" data-z="1.3" title="Mărește">+</button><button type="button" data-z="0.77" title="Micșorează">−</button><button type="button" data-z="0" title="Toată imaginea">⤢</button></div></div>`;
  const stage = $('.brain-stage', el), tip = $('.brain-tip', el), info = $('.brain-info', el);
  const W = stage.clientWidth, H = stage.clientHeight;
  const svg = d3.select($('svg', el)).attr('viewBox', [-W / 2, -H / 2, W, H]);
  const glow = svg.append('defs').append('filter').attr('id', 'gglow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
  glow.append('feGaussianBlur').attr('stdDeviation', 3).attr('result', 'b');
  const fm = glow.append('feMerge'); fm.append('feMergeNode').attr('in', 'b'); fm.append('feMergeNode').attr('in', 'SourceGraphic');
  const root = svg.append('g');
  const zoom = d3.zoom().scaleExtent([0.15, 5]).on('zoom', (e) => root.attr('transform', e.transform));
  svg.call(zoom);

  const col = (n) => GRAPH_CATS[n.cat][1];
  const rad = (n) => (n.centru ? 26 : n.lob ? 11 : 3 + Math.min(9, Math.sqrt(n.deg) * 1.6) + (n.important ? 2 : 0));
  const cats = Object.keys(GRAPH_CATS).filter((c) => c !== 'brand');
  const ang = Object.fromEntries(cats.map((c, i) => [c, (i / cats.length) * 2 * Math.PI - Math.PI / 2]));
  const R0 = Math.min(W, H) * 0.38;
  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id((d) => d.id).distance((l) => (l.tip === 'lob' ? (l.source.centru ? R0 * 0.8 : 55) : 70)).strength((l) => (l.tip === 'lob' ? (l.source.centru ? 0.9 : 0.25) : 0.05)))
    .force('charge', d3.forceManyBody().strength((n) => (n.centru ? -900 : n.lob ? -380 : -22)))
    .force('collide', d3.forceCollide((n) => rad(n) + 2.5))
    .force('x', d3.forceX((n) => (n.centru ? 0 : Math.cos(ang[n.cat] ?? 0) * (n.lob ? R0 * 0.62 : R0))).strength((n) => (n.centru ? 1 : 0.07)))
    .force('y', d3.forceY((n) => (n.centru ? 0 : Math.sin(ang[n.cat] ?? 0) * (n.lob ? R0 * 0.62 : R0) * 0.8)).strength((n) => (n.centru ? 1 : 0.08)));

  const linkSel = root.append('g').selectAll('line').data(links).join('line').attr('class', (l) => 'b-l ' + (l.tip === 'lob' ? 'lob' : ''));
  const pulses = root.append('g').attr('class', 'b-pulses');
  const nodeSel = root.append('g').selectAll('g').data(nodes).join('g').attr('class', (n) => 'b-n' + (n.lob ? ' lob' : '') + (n.centru ? ' centru' : ''))
    .call(d3.drag().on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.2).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; }).on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));
  nodeSel.append('circle').attr('r', rad).attr('fill', (n) => (n.lob || n.centru ? '#1C1E23' : col(n))).attr('stroke', col).attr('stroke-width', (n) => (n.lob || n.centru ? 2.5 : 0))
    .attr('filter', (n) => (n.centru || n.lob || n.important ? 'url(#gglow)' : null));
  nodeSel.filter((n) => n.lob || n.centru || (n.important && n.cat !== 'speakeri')).append('text').attr('dy', (n) => -rad(n) - 5).attr('text-anchor', 'middle')
    .attr('class', (n) => (n.lob || n.centru ? 'b-t lob' : 'b-t')).text((n) => cut(n.nume, 24));

  const nb = new Map(nodes.map((n) => [n.id, new Set()]));
  for (const l of links) { nb.get(l.source.id).add(l.target.id); nb.get(l.target.id).add(l.source.id); }
  const focus = (n) => {
    const set = n ? new Set([n.id, ...nb.get(n.id)]) : null;
    el.classList.toggle('b-focus', !!n);
    nodeSel.classed('on', (d) => !!set?.has(d.id));
    linkSel.classed('on', (l) => !!n && (l.source.id === n.id || l.target.id === n.id));
  };
  const center = (n, k = 1.6) => svg.transition().duration(600).call(zoom.transform, d3.zoomIdentity.scale(k).translate(-n.x, -n.y));
  const closeInfo = () => { info.hidden = true; delete info.dataset.id; focus(null); };

  nodeSel.on('mouseenter', (e, n) => {
    focus(n);
    const k = [...nb.get(n.id)].filter((id) => !id.startsWith('lob:') && id !== 'brand').length;
    tip.innerHTML = `<b>${esc(n.nume)}</b><span>${esc(GRAPH_CATS[n.cat][0])}${n.sub ? ' · ' + esc(n.sub) : ''}${n.lob || n.centru ? '' : ` · ${plural(k, 'legătură', 'legături')}`}</span>`;
    tip.hidden = false;
  }).on('mousemove', (e) => { const r = stage.getBoundingClientRect(); tip.style.left = e.clientX - r.left + 14 + 'px'; tip.style.top = e.clientY - r.top + 10 + 'px'; })
    .on('mouseleave', () => { tip.hidden = true; if (!info.dataset.id) focus(null); })
    .on('click', (e, n) => {
      e.stopPropagation();
      if (n.lob) return openCat(GRAPH_CATS[n.cat][2]);
      if (n.centru) return openCat('program');
      info.dataset.id = n.id; focus(n);
      const grp = {};
      for (const id of nb.get(n.id)) { const m = nodes.find((x) => x.id === id); if (!m.lob && !m.centru) (grp[m.cat] ||= []).push(m); }
      info.innerHTML = `<button type="button" class="b-x" aria-label="Închide">×</button>
        <div class="b-cat" style="--c:${col(n)}">${esc(GRAPH_CATS[n.cat][0])}</div><h4>${esc(n.nume)}</h4>${n.sub ? `<p class="small" style="margin:-6px 0 10px">${esc(n.sub)}</p>` : ''}
        ${Object.keys(grp).length ? Object.entries(grp).map(([c, a]) => `<div class="b-g"><span style="--c:${GRAPH_CATS[c][1]}">${esc(GRAPH_CATS[c][0])} · ${a.length}</span>${a.slice(0, 8).map((m) => `<a href="#" data-gn="${esc(m.id)}">${esc(cut(m.nume, 70))}</a>`).join('')}${a.length > 8 ? `<em>și încă ${a.length - 8}</em>` : ''}</div>`).join('') : '<p class="small">Nicio legătură directă: e legată doar de categoria ei.</p>'}
        <button type="button" class="sm" data-open="${GRAPH_CATS[n.cat][2]}">Deschide ${esc(GRAPH_CATS[n.cat][0])} →</button>`;
      info.hidden = false;
    });
  info.onclick = (e) => {
    if (e.target.closest('.b-x')) return closeInfo();
    const o = e.target.closest('[data-open]'); if (o) return openCat(o.dataset.open);
    const a = e.target.closest('[data-gn]');
    if (a) { e.preventDefault(); const m = nodes.find((x) => x.id === a.dataset.gn); nodeSel.filter((d) => d === m).dispatch('click'); center(m); }
  };
  svg.on('click', closeInfo);

  sim.on('tick', () => {
    linkSel.attr('x1', (l) => l.source.x).attr('y1', (l) => l.source.y).attr('x2', (l) => l.target.x).attr('y2', (l) => l.target.y);
    nodeSel.attr('transform', (n) => `translate(${n.x},${n.y})`);
  });

  // impulsuri de lumină pe legăturile reale
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && real.length) {
    const PL = d3.range(30).map(() => ({ l: real[Math.floor(Math.random() * real.length)], t: Math.random(), v: 0.004 + Math.random() * 0.008 }));
    const dots = pulses.selectAll('circle').data(PL).join('circle').attr('r', 1.8).attr('opacity', 0.85);
    const step = () => {
      if (!el.isConnected) return;
      for (const p of PL) { p.t += p.v; if (p.t >= 1 || hidden.has(p.l.source.cat) || hidden.has(p.l.target.cat)) { p.l = real[Math.floor(Math.random() * real.length)]; p.t = 0; } }
      dots.attr('cx', (p) => p.l.source.x + (p.l.target.x - p.l.source.x) * p.t).attr('cy', (p) => p.l.source.y + (p.l.target.y - p.l.source.y) * p.t).attr('fill', (p) => GRAPH_CATS[p.l.source.cat][1]);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // entitățile fără nicio legătură reală
  const iso = nodes.filter((n) => !n.lob && !n.centru && n.deg === 0);
  const isoBtn = $('.brain-iso', el);
  isoBtn.textContent = `Arată ce e izolat (${iso.length})`;
  isoBtn.onclick = () => {
    const on = isoBtn.getAttribute('aria-pressed') !== 'true';
    isoBtn.setAttribute('aria-pressed', on);
    el.classList.toggle('b-iso', on);
    nodeSel.classed('iso', (n) => iso.includes(n));
    if (!on) return closeInfo();
    focus(null); delete info.dataset.id;
    const grp = {}; for (const n of iso) (grp[n.cat] ||= []).push(n);
    info.innerHTML = `<button type="button" class="b-x" aria-label="Închide">×</button>
      <div class="b-cat" style="--c:#F28B82">De legat</div><h4>${plural(iso.length, 'entitate', 'entități')} fără nicio legătură</h4>
      <p class="small">Sunt legate doar de categoria lor: nu apar în nicio ediție, la niciun atelier și nu au o companie asociată. Merită legate sau verificate.</p>
      ${Object.entries(grp).map(([c, a]) => `<div class="b-g"><span style="--c:${GRAPH_CATS[c][1]}">${esc(GRAPH_CATS[c][0])} · ${a.length}</span>${a.map((m) => `<a href="#" data-gn="${esc(m.id)}">${esc(cut(m.nume, 70))}</a>`).join('')}</div>`).join('') || '<p>Toate entitățile au cel puțin o legătură.</p>'}`;
    info.hidden = false;
  };
  $('.brain-legend', el).onclick = (e) => {
    const b = e.target.closest('[data-gc]'); if (!b || b.dataset.gc === 'brand') return;
    const c = b.dataset.gc; hidden.has(c) ? hidden.delete(c) : hidden.add(c); b.classList.toggle('off', hidden.has(c));
    nodeSel.style('display', (n) => (hidden.has(n.cat) ? 'none' : null));
    linkSel.style('display', (l) => (hidden.has(l.source.cat) || hidden.has(l.target.cat) ? 'none' : null));
  };
  $('.brain-q', el).oninput = (e) => {
    const q = normTxt(e.target.value); if (q.length < 2) return focus(null);
    const m = nodes.find((n) => !n.lob && normTxt(n.nume).includes(q)); if (m) { focus(m); center(m); }
  };
  const fit = () => {
    const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const k = Math.min(2, 0.9 * Math.min(W / (x1 - x0 + 40), H / (y1 - y0 + 40)));
    svg.transition().duration(600).call(zoom.transform, d3.zoomIdentity.scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2));
  };
  $('.brain-ctrl', el).onclick = (e) => { const z = e.target.closest('[data-z]'); if (!z) return; const k = Number(z.dataset.z); k ? svg.transition().duration(300).call(zoom.scaleBy, k) : fit(); };
  sim.on('end', fit);
  setTimeout(fit, 2500);
}
