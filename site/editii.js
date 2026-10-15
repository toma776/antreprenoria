// /editii: toate cohortele — cele active sus (în desfășurare, cu înscrieri deschise), apoi arhiva, pe ani.
const { esc, initials, fmtDay, today, img, de } = require('./util');

const plural = (n, one, many) => `${n} ${n === 1 ? one : (n % 100 === 0 || n % 100 >= 20 ? 'de ' : '') + many}`;
const edUrl = (e) => (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`);
const edLabel = (e) => (e.serie === 'Cluj' ? `Cluj #${e.numar}` : `#${e.numar}`);
const cleanTitle = (t) => String(t || '').replace(/^(Atelier de Seară|COCKTAIL NETWORKING)\s*[-:]\s*/i, '').replace(/\.\s*$/, '');
const face = (src, nume) => (src ? `<img src="${esc(img(src, 128))}" alt="" loading="lazy">` : `<span class="ph">${esc(initials(nume || '?'))}</span>`);
const chrono = (D) => D.editii.slice().sort((a, b) => a.an - b.an || (a.sezon === b.sezon ? (a.serie === 'Cluj') - (b.serie === 'Cluj') : a.sezon === 'primăvară' ? -1 : 1));
// starea unei cohorte, aceeași regulă ca pe pagina ei: arhivată doar prin panou
function stateOf(e) {
  if (/închis|încheiat/i.test(e.status || '')) return 'past';
  const t0 = today(), dated = e.ateliere.filter((a) => a.data && a.data.startsWith(String(e.an)));
  if (dated.some((a) => a.data < t0)) return 'live';
  return e.deschisa ? 'open' : 'soon';
}
const LABEL = { live: ['În desfășurare', 'live'], open: ['Înscrieri deschise', 'open'], soon: ['Urmează', 'open'], past: ['Încheiată', 'done'] };

function editiiBody(ctx, F) {
  const { D, P, T } = ctx;
  const eds = chrono(D).slice().reverse();
  // active: întâi cea în desfășurare, apoi cele cu înscrieri deschise, apoi cele care urmează
  const ORD = { live: 0, open: 1, soon: 2 };
  const active = eds.filter((e) => stateOf(e) !== 'past').sort((a, b) => ORD[stateOf(a)] - ORD[stateOf(b)]);
  const past = eds.filter((e) => stateOf(e) === 'past');
  const t0 = today();
  const totalPart = D.editii.reduce((n, e) => n + e.participanti.length, 0);
  const totalWs = D.editii.reduce((n, e) => n + e.ateliere.length, 0);
  const years = [...new Set(past.map((e) => e.an))];

  // cardul mare al unei cohorte active: progresul și următoarea întâlnire
  const activeCard = (e) => {
    const st = stateOf(e), ws = e.ateliere.slice().sort((a, b) => (a.data || '9').localeCompare(b.data || '9'));
    const held = ws.filter((a) => a.data && a.data < t0).length;
    const next = ws.find((a) => a.data && a.data >= t0);
    const price = e.deschisa && st !== 'live' ? e.preturi.find((p) => !p.ascuns) : null;
    return `<a class="ex-active is-${st}" href="${edUrl(e)}">
      <div class="ex-top"><span class="ed-badge ${LABEL[st][1]}">${st === 'live' ? '<i class="dot-live"></i>' : ''}${LABEL[st][0]}</span><span class="ex-where">${esc(e.serie)}</span></div>
      <b class="ex-num">${esc(edLabel(e))}</b>
      <span class="ex-per">${esc(e.perioada || '')}</span>
      ${ws.length ? `<div class="ex-prog" aria-label="${held} din ${ws.length} ${de(ws.length)}întâlniri ținute">${ws.map((a) => `<i class="${a.data && a.data < t0 ? 'done' : next && a.id === next.id ? 'next' : ''}"></i>`).join('')}</div>
      <span class="ex-meta">${held ? `${held} din ${plural(ws.length, 'întâlnire', 'întâlniri')} ținute` : plural(ws.length, 'întâlnire', 'întâlniri')}${e.participanti.length ? ` · ${plural(e.participanti.length, 'participant', 'participanți')}` : ''}</span>` : ''}
      ${next ? `<span class="ex-next"><small>${st === 'live' ? 'Următorul atelier' : 'Primul atelier'}</small><b>${esc(cleanTitle(next.titlu))}</b><span>${fmtDay(next.data)}${next.locatie && next.locatie !== 'TBD' ? ' · ' + esc(next.locatie) : ''}</span></span>` : ''}
      ${price ? `<span class="ex-price">${esc(price.pret_text.replace(/(\d)(\d{3})\b/, '$1.$2'))}${price.nota ? ` · ${esc(price.nota)}` : ''}</span>` : ''}
      <span class="ex-go">${st === 'live' ? 'Vezi agenda' : 'Detalii și înscriere'} →</span>
    </a>`;
  };
  // cardul unei cohorte din arhivă: perioada, cifrele și câteva fețe din grupă
  const pastCard = (e) => {
    const themes = [...new Set(e.ateliere.map((a) => a.tema).filter(Boolean))].map((t) => T[t]).filter((t) => t && t.format === 'full-day');
    const faces = e.participanti.filter((x) => x.imagine || P[x.persoana]?.imagine).slice(0, 6);
    return `<a class="ex-past" href="${edUrl(e)}">
      <div class="ex-past-top"><b class="ex-num">${esc(edLabel(e))}</b><span>${esc(e.sezon)} ${e.an}</span></div>
      <span class="ex-per">${esc(e.perioada || '')}</span>
      <span class="ex-figs"><span><b>${e.participanti.length}</b> ${de(e.participanti.length)}participanți</span><span><b>${e.ateliere.length}</b> ${de(e.ateliere.length)}ateliere</span></span>
      ${faces.length ? `<span class="ex-faces">${faces.map((x) => face(P[x.persoana]?.imagine || x.imagine, x.nume)).join('')}${e.participanti.length > faces.length ? `<em>+${e.participanti.length - faces.length}</em>` : ''}</span>` : ''}
      ${themes.length ? `<span class="ex-themes">${themes.map((t) => `<i>${esc(t.nume)}</i>`).join('')}</span>` : ''}
    </a>`;
  };
  return `<main>
  <section class="hero pg-hero"><div class="wrap">
    <nav class="crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><b>Cohorte</b></nav>
    <div class="hero-split">
      <div class="hero-copy">
        <p class="eyebrow">Cohorte</p>
        <h1>Două cohorte pe an, din ${esc(String(chrono(D)[0]?.an || ''))}.</h1>
        <p class="lead">Fiecare cohortă e un grup de în jur de 25 de antreprenori care parcurg împreună, în trei luni, cele cinci teme ale programului. În București, primăvara și toamna; din ${esc(String(D.editii.find((e) => e.serie === 'Cluj')?.an || ''))}, și la Cluj.</p>
      </div>
      <aside class="pg-glance" aria-label="În cifre">
        <div class="ed-live-top"><span>În cifre</span><span>toate cohortele</span></div>
        <dl>
          <div><dt>${plural(D.editii.length, 'cohortă', 'cohorte')}</dt><dd>${plural(past.length, 'încheiată', 'încheiate')}, ${plural(active.length, 'activă', 'active')}</dd></div>
          <div><dt>${plural(totalPart, 'participant', 'participanți')}</dt><dd>antreprenori și manageri</dd></div>
          <div><dt>${plural(totalWs, 'atelier', 'ateliere')}</dt><dd>full-day, de seară și networking</dd></div>
        </dl>
      </aside>
    </div>
  </div></section>

  ${active.length ? `<section class="sec ex-now" id="acum"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Acum</p><h2>${active.length === 1 ? 'Cohorta activă.' : 'Cohortele active.'}</h2></div>
    <div class="ex-actives" style="--n:${active.length}">${active.map(activeCard).join('')}</div>
  </div></section>` : ''}

  <section class="sec sec-alt" id="arhiva"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Arhiva</p><h2>${plural(past.length, 'cohortă încheiată', 'cohorte încheiate')}.</h2></div>
    ${years.map((y) => `<div class="ex-year"><h3>${y}</h3><div class="ex-pasts">${past.filter((e) => e.an === y).map(pastCard).join('')}</div></div>`).join('')}
  </div></section>

  <section class="cta-band"><div class="wrap cta-band-in">
    <div class="cta-band-copy">
      <p class="eyebrow">Cohorta următoare</p>
      <h2>Vrei în următoarea cohortă?</h2>
      <p>Lasă-ne datele și te anunțăm primul când se deschid înscrierile.</p>
      <div class="hero-actions"><a class="btn btn-light btn-lg" href="/aplica">Aplică</a><a class="btn btn-outline-light btn-lg" href="/despre#cum">Cum funcționează</a></div>
    </div>
  </div></section>
</main>`;
}

module.exports = { editiiBody };
