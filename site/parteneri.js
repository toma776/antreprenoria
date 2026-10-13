// /parteneri: partenerii edițiilor, sponsorii atelierelor, gazdele și cum te poți implica.
// Totul vine din ediții: partenerii din antetul fiecărei ediții, sponsorii și gazdele din ateliere.
const { esc, fmtDay, today } = require('./util');
const { implicareDialog } = require('./implicare');

const plural = (n, one, many) => `${n} ${n === 1 ? one : (n % 100 === 0 || n % 100 >= 20 ? 'de ' : '') + many}`;
const edUrl = (e) => (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`);
const edLabel = (e) => (e.serie === 'Cluj' ? `Cluj #${e.numar}` : `#${e.numar}`);
const cleanTitle = (t) => String(t || '').replace(/^(Atelier de Seară|COCKTAIL NETWORKING)\s*[-:]\s*/i, '').replace(/\.\s*$/, '');
const chrono = (D) => D.editii.slice().sort((a, b) => a.an - b.an || (a.sezon === b.sezon ? (a.serie === 'Cluj') - (b.serie === 'Cluj') : a.sezon === 'primăvară' ? -1 : 1));
const ROL = { 'partener strategic': 'Partener strategic', 'powered by': 'Powered by', 'partener ediție': 'Partener de ediție' };
const FULL = ['viziune', 'model-de-business', 'marketing', 'vanzari', 'cultura'];
const logo = (o, cls = '') => `<span class="logo-cell ${cls}">${o.logo ? `<img src="${esc(o.logo)}" alt="${esc(o.nume)}" loading="lazy">` : `<b>${esc(o.nume)}</b>`}</span>`;
// edițiile, compacte: #16–#18, #20, Cluj #1
const span = (eds) => { const b = eds.filter((e) => e.serie === 'București').map((e) => e.numar).sort((x, y) => x - y), out = []; for (let i = 0; i < b.length; i++) { let j = i; while (b[j + 1] === b[j] + 1) j++; out.push(j - i >= 2 ? `#${b[i]}–#${b[j]}` : b.slice(i, j + 1).map((n) => `#${n}`).join(', ')); i = j; } return [...out, ...eds.filter((e) => e.serie === 'Cluj').map(edLabel)].join(', '); };

function partnersData(ctx) {
  const { D, O, T } = ctx;
  const eds = chrono(D), byId = Object.fromEntries(D.editii.map((e) => [e.id, e]));
  const t0 = today();
  // partenerii edițiilor (antetul fiecărei ediții) și sponsorii atelierelor
  const map = new Map();
  const get = (id) => { if (!map.has(id)) map.set(id, { o: O[id], roles: [], ws: [], hosts: [] }); return map.get(id); };
  eds.forEach((e) => {
    e.parteneri.filter((x) => x.rol !== 'sponsor atelier' && O[x.organizatie]).forEach((x) => get(x.organizatie).roles.push({ e, rol: x.rol }));
    e.ateliere.forEach((a) => { if (a.sponsor && O[a.sponsor]) get(a.sponsor).ws.push({ e, a }); });
  });
  // gazdele: organizațiile locațiilor în care s-au ținut ateliere
  D.locatii.forEach((l) => { const x = map.get(l.organizatie); if (x) x.hosts.push(l); });
  const all = [...map.values()].filter((x) => x.o && x.o.id !== 'rbl');
  const strategic = all.filter((x) => x.roles.length).sort((a, b) => b.roles.length - a.roles.length || b.ws.length - a.ws.length);
  const sponsors = all.filter((x) => x.ws.length).sort((a, b) => b.ws.length - a.ws.length || a.o.nume.localeCompare(b.o.nume, 'ro'));
  // atelierele ediției în curs care încă își caută sponsor
  const open = eds.filter((e) => !/închis|încheiat/i.test(e.status || '')).flatMap((e) => e.ateliere.filter((a) => a.cauta_sponsor && (!a.data || a.data >= t0)).map((a) => ({ e, a })));
  const team = Object.fromEntries(D.program.contact.echipa.map((m) => [m.id, m]));
  return { all, strategic, sponsors, open, nWs: sponsors.reduce((n, x) => n + x.ws.length, 0), ciclu: all.filter((x) => x.o.ciclu), byId, T, team };
}

function parteneriBody(ctx, F) {
  const d = partnersData(ctx);
  const { T } = d;
  const contact = d.team['larisa-slavenie'] || d.team['raluca-bedereag'], spons = d.team['iulian-rizea'] || contact;
  const NAV = [['parteneri', 'Partenerii edițiilor'], ['sponsori', 'Sponsorii atelierelor'], ...(d.ciclu.length ? [['din-alumni', 'Din alumni, parteneri']] : []), ['implica-te', 'Implică-te']];
  return `<main>
  <section class="hero pg-hero"><div class="wrap">
    <nav class="crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><b>Parteneri</b></nav>
    <div class="hero-split">
      <div class="hero-copy">
        <p class="eyebrow">Parteneri și sponsori</p>
        <h1>Companiile care fac posibil programul.</h1>
        <p class="lead">Partenerii susțin câte o ediție întreagă, sponsorii câte un atelier, gazdele își deschid sediul pentru o zi de lucru. Antreprenoria e organizată de Fundația Romanian Business Leaders.</p>
        <div class="hero-actions"><a class="btn btn-primary btn-lg" href="?implicare=sponsorizare#implica-te" data-implica="">Devino partener</a><a class="btn btn-ghost btn-lg" href="#sponsori">Vezi sponsorii</a></div>
      </div>
      <aside class="pg-glance" aria-label="În cifre">
        <div class="ed-live-top"><span>În cifre</span><span>din ${d.byId ? chrono(ctx.D)[0].an : ''}</span></div>
        <dl>
          <div><dt>${plural(d.all.length, 'companie', 'companii')}</dt><dd>parteneri, sponsori și gazde</dd></div>
          <div><dt>${plural(d.strategic.length, 'partener', 'parteneri')}</dt><dd>ai edițiilor</dd></div>
          <div><dt>${plural(d.nWs, 'atelier sponsorizat', 'ateliere sponsorizate')}</dt><dd>de ${plural(d.sponsors.length, 'companie', 'companii')}</dd></div>
          ${d.ciclu.length ? `<div><dt>${plural(d.ciclu.length, 'companie alumni', 'companii alumni')}</dt><dd>revenite ca parteneri</dd></div>` : ''}
        </dl>
      </aside>
    </div>
  </div></section>
  <nav class="pg-nav" aria-label="Secțiunile paginii"><div class="wrap">${NAV.map(([k, t], i) => `<a href="#${k}"><i>0${i + 1}</i>${t}</a>`).join('')}</div></nav>

  <section class="sec" id="parteneri"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Partenerii edițiilor</p><h2>Alături de program, ediție cu ediție.</h2></div>
    <div class="pt-strategic">${d.strategic.map((x) => { const o = x.o, roles = [...new Set(x.roles.map((r) => r.rol))];
      return `<article class="pt-card" id="${esc(o.id)}">
        ${logo(o, 'pt-logo')}
        <div class="pt-tx">
          <h3>${esc(o.nume)}</h3>
          <div class="pt-roles">${roles.map((r) => `<span class="pt-tag">${esc(ROL[r] || r)} · ${esc(span(x.roles.filter((y) => y.rol === r).map((y) => y.e)))}</span>`).join('')}${x.ws.length ? `<span class="pt-tag soft">${plural(x.ws.length, 'atelier sponsorizat', 'ateliere sponsorizate')}</span>` : ''}${x.hosts.length ? `<span class="pt-tag soft">gazdă: ${esc(x.hosts.map((l) => l.nume).join(', '))}</span>` : ''}${o.ciclu ? '<span class="pt-tag alum">din alumni</span>' : ''}</div>
          ${o.descriere ? `<p>${esc(o.descriere.length > 240 ? o.descriere.slice(0, 237).replace(/\s+\S*$/, '') + '…' : o.descriere)}</p>` : ''}
          ${o.url ? `<a class="link-arrow" href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))} ↗</a>` : ''}
        </div>
      </article>`; }).join('')}</div>
  </div></section>

  <section class="sec sec-alt" id="sponsori"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Sponsorii atelierelor</p><h2>${plural(d.nWs, 'atelier susținut', 'ateliere susținute')} de ${plural(d.sponsors.length, 'companie', 'companii')}.</h2>
      <p class="lead">Sponsorul unui atelier își leagă numele de o temă și stă o zi cu antreprenorii care lucrează exact la problema aceea.</p></div>
    <div class="pt-grid">${d.sponsors.map((x) => { const o = x.o, themes = [...new Set(x.ws.map(({ a }) => a.tema).filter(Boolean))].map((t) => T[t]).filter(Boolean);
      return `<article class="pt-sp" id="${esc(o.id)}-sponsor">
        ${logo(o)}
        <h3>${esc(o.nume)}${o.ciclu ? ' <span class="pt-tag alum">din alumni</span>' : ''}</h3>
        <span class="pt-meta">${plural(x.ws.length, 'atelier', 'ateliere')} · ${esc(span([...new Set(x.ws.map(({ e }) => e))]))}</span>
        <ul>${x.ws.slice().reverse().slice(0, 3).map(({ e, a }) => `<li><a href="${edUrl(e)}#agenda">${esc(edLabel(e))}</a> ${esc(cleanTitle(a.titlu))}</li>`).join('')}${x.ws.length > 3 ? `<li class="more">și încă ${x.ws.length - 3}</li>` : ''}</ul>
        ${themes.length ? `<div class="pt-themes">${themes.slice(0, 4).map((t) => (FULL.includes(t.id) ? `<a href="/teme/${esc(t.id)}">${esc(t.nume)}</a>` : `<span>${esc(t.nume)}</span>`)).join('')}${themes.length > 4 ? `<span class="more">+${themes.length - 4}</span>` : ''}</div>` : ''}
      </article>`; }).join('')}</div>
  </div></section>

  ${d.ciclu.length ? `<section class="sec" id="din-alumni"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Din alumni, parteneri</p><h2>Vii ca participant. Revii ca partener.</h2>
      <p class="lead">${plural(d.ciclu.length, 'companie a trecut', 'companii au trecut')} prin program și s-au întors să-l susțină.</p></div><a class="link-arrow" href="/alumni">Alumnii →</a></div>
    <div class="al-cycle" style="--n:${d.ciclu.length}">${d.ciclu.map((x) => { const o = x.o, e0 = d.byId[o.ciclu.alumni_din]; return `<div class="al-cyc">${logo(o)}<b>${esc(o.nume)}</b><span>alumni ${esc(e0 ? edLabel(e0) : '')} → ${esc(o.ciclu.apoi.map((r) => r.replace(' atelier', '')).join(', '))}</span></div>`; }).join('')}</div>
  </div></section>` : ''}

  <section class="sec sec-alt" id="implica-te"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Implică-te</p><h2>Trei feluri de a susține programul.</h2></div>
    ${d.open.length ? `<div class="pt-open"><span class="ask-kicker">Caută sponsor acum</span><ul>${d.open.map(({ e, a }) => `<li><b>${esc(cleanTitle(a.titlu))}</b><span>ediția ${esc(edLabel(e))}${a.data ? ` · ${fmtDay(a.data)}` : ''}${a.locatie ? ` · ${esc(a.locatie)}` : ''}</span></li>`).join('')}</ul></div>` : ''}
    <div class="pt-ways">
      <div class="pt-way" id="sponsorizeaza"><span class="pt-n">01</span><h3>Sponsorizează un atelier</h3><p>Numele companiei tale pe pagina ediției și la atelier, o zi alături de 25 de antreprenori care lucrează la tema aleasă și un speaker din echipa ta, dacă vrei.</p><a class="btn btn-primary" href="?implicare=sponsorizare#implica-te" data-implica="sponsorizare">Scrie-ne despre sponsorizare</a></div>
      <div class="pt-way" id="gazduieste"><span class="pt-n">02</span><h3>Găzduiește un atelier</h3><p>O sală pentru o zi întreagă de lucru, pentru în jur de 30 de oameni. Atelierele s-au ținut până acum la ${esc(ctx.D.locatii.map((l) => l.nume.replace(/^Sediul /, '')).join(', '))}.</p><a class="btn btn-ghost" href="?implicare=gazduire#implica-te" data-implica="gazduire">Propune un spațiu</a></div>
      <div class="pt-way" id="mentor"><span class="pt-n">03</span><h3>Devino trainer sau mentor</h3><p>Trainerii și antreprenorii invitați vin din comunitatea Romanian Business Leaders și își împart experiența pro-bono.</p><a class="btn btn-ghost" href="?implicare=mentorat#implica-te" data-implica="mentorat">Scrie-ne</a></div>
    </div>
    ${contact ? `<p class="pt-contact">Parteneriate: <b>${esc(contact.nume)}</b>, <a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a>${spons && spons !== contact ? ` · Sponsorizări ateliere: <b>${esc(spons.nume)}</b>, <a href="mailto:${esc(spons.email)}">${esc(spons.email)}</a>` : ''}</p>` : ''}
  </div></section>
</main>
${implicareDialog()}`;
}

module.exports = { parteneriBody, partnersData };
