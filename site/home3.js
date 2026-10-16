// Homepage, varianta de recrutare (previzualizare: /previzualizare/acasa).
// Obiectivul central: antreprenori noi care aplică. Programul e selectiv: companii cu peste 500.000 € cifră de afaceri
// și un model de business scalabil; fiecare aplicare trece prin selecție. Hero-ul oferă însă un drum și celor care sunt
// deja în cohorta curentă și alumnilor („Ce te aduce aici?”). Sub hero: încrederea, cum intri, valoarea, dovezile, apelul final.
// Cifrele de afaceri apar doar agregat.
const fs = require('fs'), path = require('path');
const { esc, initials, fmtDay, today, img, de, temaUrl, TEME } = require('./util');
const { tx } = require('./texte');
const { themeInfo, NEEDS } = require('./home');
const { everyone } = require('./traineri');
const { alumniData, companyUrl } = require('./alumni');
const { partnersData } = require('./parteneri');

const edUrl = (e) => (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`);
const edLabel = (e) => (e.serie === 'Cluj' ? `Cluj #${e.numar}` : `#${e.numar}`);
const cleanTitle = (t) => String(t || '').replace(/^(Atelier de Seară|COCKTAIL NETWORKING)\s*[-:]\s*/i, '').replace(/\.\s*$/, '');
const face = (p, w = 160) => (p?.imagine ? `<img src="${esc(img(p.imagine, w))}" alt="" loading="lazy">` : `<span class="ph">${esc(initials(p?.nume || '?'))}</span>`);
const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const startOf = (a) => { const t = (a?.program || []).map((p) => (String(p.interval || '').match(/\d{1,2}:\d{2}/) || [])[0]).filter(Boolean).sort()[0]; return t || '09:00'; };
const LOGO_DIR = path.join(__dirname, 'assets', 'logos');
const logoFiles = () => Object.fromEntries((() => { try { return fs.readdirSync(LOGO_DIR); } catch { return []; } })().map((f) => [f.replace(/\.[a-z]+$/, ''), f]));

function home3Body(ctx, F) {
  const { D, P, O } = ctx;
  const prog = D.program;
  const ong = F.ongoing, nx = F.next, t0 = today();
  const ws = ong ? ong.ateliere.slice().sort((a, b) => (a.data || '9').localeCompare(b.data || '9')) : [];
  const held = ws.filter((a) => a.data && a.data < t0).length;
  const nxPeople = nx ? nx.program.flatMap((x) => x.speakeri).map((s) => P[s.persoana]).filter(Boolean) : [];
  const TR = everyone(ctx), AL = alumniData(ctx), LF = logoFiles();
  const invited = TR.filter((x) => x.roluri.includes('antreprenor invitat'));
  const COS = [...new Set([...invited, ...TR].map((x) => x.org).filter((n) => n && D.organizatii.some((o) => o.nume === n)))];
  const LOGOS = COS.map((n) => D.organizatii.find((o) => o.nume === n)).filter((o) => o && LF[o.id]).map((o) => [o, LF[o.id]]);
  const PARTNERS = partnersData(ctx).all.map((x) => ({ o: x.o, src: x.o.logo || (LF[x.o.id] ? `/assets/logos/${LF[x.o.id]}` : null) })).filter((x) => x.src);
  const needs = NEEDS.map(([id, label]) => ({ id, label, info: themeInfo(ctx, F, id) })).filter((x) => x.info);
  const cifra = (k) => (prog.cifre.find((c) => c.ce.includes(k)) || {}).valoare || '';

  // companiile care au crescut cu programul: participanți confirmați în cohortele încheiate, cu logo, după mărime
  const closed = D.editii.filter((e) => /închis|încheiat/i.test(e.status || ''));
  const inClosed = (o) => closed.some((e) => e.participanti.some((p) => p.organizatie === o.id));
  const caMax = (o) => Math.max(0, ...closed.flatMap((e) => e.participanti.filter((p) => p.organizatie === o.id).map((p) => p.cifra_afaceri || 0)));
  const grown = D.organizatii.map((o) => ({ ...o, logo: o.logo || (LF[o.id] ? `/assets/logos/${LF[o.id]}` : null) })).filter((o) => o.logo && inClosed(o)).sort((a, b) => caMax(b) - caMax(a));

  // verificarea potrivirii: distribuția cifrei de afaceri (doar numărul de companii pe intervale)
  const ca = D.editii.flatMap((e) => e.participanti).map((p) => p.cifra_afaceri).filter((x) => x != null);
  const BINS = [[0, 1e6, '<1'], [1e6, 2.5e6, '1–2,5'], [2.5e6, 5e6, '2,5–5'], [5e6, 1e7, '5–10'], [1e7, 2.5e7, '10–25'], [2.5e7, 5e7, '25–50'], [5e7, Infinity, '50+']];
  const hist = BINS.map(([a, b, l]) => ({ l, a, b, n: ca.filter((x) => x >= a && x < b).length }));
  const hMax = Math.max(...hist.map((h) => h.n));
  const fit = { q1: F.q1, med: F.medianCa, q3: F.q3, medAng: F.medianAng, prag: 2.5e6, bins: hist.map((h) => [h.a, h.b === Infinity ? 1e12 : h.b]) };

  // locurile: cohorta următoare din București și Cluj (dacă are înscrieri deschise)
  const lastB = D.editii.filter((e) => e.serie === 'București').sort((x, y) => y.numar - x.numar)[0];
  const nextSez = lastB ? (lastB.sezon === 'toamnă' ? `primăvară ${lastB.an + 1}` : `toamnă ${lastB.an}`) : '';
  const nextB = F.maxNr + 1;
  const clujPrice = F.cluj?.preturi.find((p) => !p.ascuns);
  const fmtPrice = (s) => s.replace(/(\d)(\d{3})\b/, '$1.$2');
  const R = 46, C = 2 * Math.PI * R, pct = ws.length ? held / ws.length : 0;

  const seats = [
    F.cluj ? { href: edUrl(F.cluj), tag: 'Înscrieri deschise', open: true, t: `Cluj #${F.cluj.numar}`, s: F.cluj.perioada, m: clujPrice ? fmtPrice(clujPrice.pret_text) : '' } : null,
    { href: '/aplica', tag: 'Selecție în curs', open: false, t: `București #${nextB}`, s: nextSez, m: 'listă de așteptare' },
  ].filter(Boolean);

  return `<main class="x h3">
  <!-- 01 · hero: recrutarea în centru; un drum și pentru cei din cohortă și pentru alumni -->
  <section class="x-hero h3-hero">
    <div class="wrap h3-hero-in">
      <div class="x-copy">
        <p class="x-eyebrow"><span class="x-chip">Acceleratorul Romanian Business Leaders</span><span>din ${prog.de_cand}</span></p>
        <h1>${esc(tx(D, 'acasa.titlu'))}</h1>
        <p class="x-lead">Trei luni de ateliere cu fondatori și CEO care au construit companii de top, într-o cohortă de aproximativ 25 de antreprenori. Fiecare aplicare trece prin selecție.</p>
        <ul class="h3-crit" aria-label="Cine poate aplica">
          <li>${CHECK}<span><b>Peste 500.000 €</b> cifră de afaceri anuală</span></li>
          <li>${CHECK}<span><b>Model de business</b> scalabil</span></li>
          <li>${CHECK}<span><b>Selecție</b> pe baza aplicării</span></li>
        </ul>
        <div class="x-actions"><a class="x-btn x-btn-glow" href="/aplica">Aplică pentru un loc ${ARROW}</a><a class="x-btn x-btn-glass" href="#potrivire">Verifică dacă te califici</a></div>
        <p class="h3-note">Durează aproximativ 6 minute. Răspunsul vine în cel mult 10 zile lucrătoare.</p>
      </div>

      <aside class="x-glass h3-paths" aria-label="Ce te aduce aici?" data-x-navi>
        <p class="x-k">Ce te aduce aici?</p>
        <div class="h3-tabs" role="tablist">
          <button type="button" role="tab" id="ht-nou" aria-controls="hp-nou" aria-selected="true">Vreau să intru</button>
          ${ong ? `<button type="button" role="tab" id="ht-acum" aria-controls="hp-acum" aria-selected="false" tabindex="-1">Sunt în cohortă</button>` : ''}
          <button type="button" role="tab" id="ht-alumni" aria-controls="hp-alumni" aria-selected="false" tabindex="-1">Sunt alumni</button>
        </div>

        <div class="h3-panel" role="tabpanel" id="hp-nou" aria-labelledby="ht-nou">
          <p class="h3-panel-t">Locuri pentru cohortele următoare</p>
          ${seats.map((x) => `<a class="h3-seat" href="${esc(x.href)}"><span class="h3-seat-tag${x.open ? ' open' : ''}">${x.tag}</span><b>${esc(x.t)}</b><span>${esc(x.s)}${x.m ? ` · ${esc(x.m)}` : ''}</span><i>${ARROW}</i></a>`).join('')}
          <a class="x-btn x-btn-glow h3-panel-cta" href="/aplica">Aplică pentru un loc ${ARROW}</a>
        </div>

        ${ong ? `<div class="h3-panel" role="tabpanel" id="hp-acum" aria-labelledby="ht-acum" hidden>
          <div class="h3-now">
            <div class="x-ring h3-ring" style="--p:${pct}">
              <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${R}" class="x-ring-bg"/><circle cx="60" cy="60" r="${R}" class="x-ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/></svg>
              <span><b>${held}<small>/${ws.length}</small></b><em>întâlniri</em></span>
            </div>
            ${nx ? `<div class="x-count" data-x-countdown="${nx.data}T${startOf(nx)}:00">
              <span class="x-k">Următorul atelier începe în</span>
              <div class="x-clock"><div><b data-u="d">–</b><small>zile</small></div><div><b data-u="h">–</b><small>ore</small></div><div><b data-u="m">–</b><small>min</small></div><div><b data-u="s">–</b><small>sec</small></div></div>
            </div>` : ''}
          </div>
          ${nx ? `<p class="h3-next"><b>${esc(cleanTitle(nx.titlu))}</b><span>${fmtDay(nx.data)} · ${startOf(nx)}${nx.locatie && nx.locatie !== 'TBD' ? ' · ' + esc(nx.locatie) : ''}${nxPeople.length ? ` · cu ${esc(nxPeople.map((p) => p.nume).join(', '))}` : ''}</span></p>` : ''}
          <div class="h3-links"><a href="${edUrl(ong)}#agenda">Agenda cohortei ${ARROW}</a><a href="${edUrl(ong)}#participanti">Colegii de cohortă ${ARROW}</a></div>
        </div>` : ''}

        <div class="h3-panel" role="tabpanel" id="hp-alumni" aria-labelledby="ht-alumni" hidden>
          <p class="h3-panel-t">${AL.L.length} ${de(AL.L.length)}antreprenori în comunitate</p>
          <div class="h3-links h3-links-col">
            <a href="/comunitate#lista">Caută în comunitate un serviciu sau un partener ${ARROW}</a>
            <a href="/comunitate">Completează-ți profilul, ca să te găsească cine are nevoie de tine ${ARROW}</a>
            <a href="/parteneri">Revino ca partener, gazdă sau lider de atelier ${ARROW}</a>
          </div>
        </div>
      </aside>
    </div>

    <!-- încrederea, imediat sub hero -->
    <div class="wrap h3-trust">
      <div><b>${new Date().getFullYear() - prog.de_cand} ani</b><span>de program, din ${prog.de_cand}</span></div>
      <div><b>${F.maxNr} ${de(F.maxNr)}cohorte</b><span>în București, plus Cluj</span></div>
      <div><b>${esc(cifra('IMM'))}</b><span>businessuri transformate</span></div>
      <div><b>${TR.length} ${de(TR.length)}lideri</b><span>fondatori, CEO și traineri</span></div>
      <div class="h3-rbl"><span>Organizat de</span><b>Romanian Business Leaders</b></div>
    </div>
    <div class="x-marq-row"><p class="x-marq-label">Liderii care predau conduc companii precum</p>
      <div class="x-marq x-marq-logos" aria-label="Companiile liderilor care predau"><div class="x-marq-in">${[0, 1].map((k) => `<div${k ? ' aria-hidden="true"' : ''}>${LOGOS.map(([o, f]) => `<span class="x-lg x-lg-${esc(o.id)}"><img src="/assets/logos/${esc(f)}" alt="${k ? '' : esc(o.nume)}" loading="lazy"></span>`).join('')}</div>`).join('')}</div></div>
    </div>
  </section>

  <!-- 02 · cum intri: pașii selecției și verificarea potrivirii -->
  <section class="x-sec h3-join" id="cum-intri"><div class="wrap">
    <div class="x-head"><p class="x-eyebrow"><span>Cum intri în program</span></p><h2>Un program selectiv, pentru companii care vor să scaleze.</h2><p>Cohorta e mică intenționat: discuțiile au valoare doar între antreprenori cu provocări pe măsură.</p></div>
    <div class="h3-join-grid">
      <ol class="h3-steps">
        <li><span>1</span><div><b>Aplici online</b><p>Șapte pași scurți despre companie, echipă și ambiție. Aproximativ 6 minute, cu salvare pe parcurs.</p></div></li>
        <li><span>2</span><div><b>Comisia de selecție analizează</b><p>Ne uităm la cifre, la modelul de business, la echipă și la cât de departe vrei să duci compania. Răspunsul vine în cel mult 10 zile lucrătoare.</p></div></li>
        <li><span>3</span><div><b>Intri în cohortă</b><p>Trei luni, ${ws.length || 9} întâlniri, aproximativ 25 de colegi antreprenori și acces la comunitatea RBL.</p></div></li>
        <li class="h3-steps-cta"><a class="btn btn-primary btn-lg" href="/aplica">Începe aplicarea</a><a class="x-link" href="/despre#pentru-cine">Criteriile complete ${ARROW}</a></li>
      </ol>
      <article class="x-tile x-fit" id="potrivire" data-x-fit='${esc(JSON.stringify(fit))}'>
        <div class="x-tile-h"><span class="x-k">Verifică dacă te califici</span><span class="x-pill">doar cifre agregate</span></div>
        <h3>Unde s-ar așeza compania ta în cohortă?</h3>
        <label class="x-range"><span>Cifra de afaceri anuală <b data-x-o="ca">–</b></span><input type="range" min="0" max="1000" value="560" data-x-i="ca" aria-label="Cifra de afaceri anuală"></label>
        <label class="x-range"><span>Angajați <b data-x-o="ang">–</b></span><input type="range" min="0" max="1000" value="420" data-x-i="ang" aria-label="Numărul de angajați"></label>
        <div class="x-hist" aria-hidden="true">${hist.map((h) => `<i style="--h:${Math.max(6, Math.round((h.n / hMax) * 100))}%"><small>${h.l}</small></i>`).join('')}</div>
        <p class="x-hist-l">Companiile din ultimele cohorte, după cifra de afaceri (mil. lei)</p>
        <p class="x-fit-v" data-x-o="verdict" aria-live="polite"></p>
      </article>
    </div>
  </div></section>

  <!-- 03 · valoarea: problema ta -> tema, liderii, următorul atelier -->
  <section class="x-sec x-navsec" id="navigator"><div class="wrap">
    <div class="x-head"><p class="x-eyebrow"><span>Ce primești</span></p><h2>Ce vrei să rezolvi în compania ta?</h2><p>Alege o provocare. Îți arătăm tema din program, liderii care o predau și când e următorul atelier.</p></div>
    <div class="x-navi" data-x-navi>
      <div class="x-navi-q" role="tablist" aria-label="Provocarea ta">${needs.map((x, i) => `<button type="button" role="tab" aria-selected="${i === 0}" aria-controls="xn-${x.id}" id="xt-${x.id}" tabindex="${i ? -1 : 0}"><i>0${i + 1}</i>${esc(x.label)}</button>`).join('')}</div>
      <div class="x-navi-a x-glass-light">${needs.map((x, i) => {
        const { t, ws: tws, people, desc, next, cluj } = x.info;
        const n = new Set(tws.map(({ e }) => e.id)).size;
        return `<div class="x-navi-p" role="tabpanel" id="xn-${x.id}" aria-labelledby="xt-${x.id}"${i ? ' hidden' : ''}>
          <div class="x-navi-top"><span class="x-k">Tema din program</span><span class="x-pill">${n} ${de(n)}cohorte · ${people.length} ${de(people.length)}lideri</span></div>
          <h3>${esc(t.nume)}</h3>
          <p>${esc(desc.length > 220 ? desc.slice(0, 217).replace(/\s+\S*$/, '') + '…' : desc)}</p>
          <div class="x-navi-ppl">${people.slice(0, 4).map(({ p, n: k }) => `<a href="/lideri/${esc(p.id)}">${face(p, 96)}<span><b>${esc(p.nume)}</b><small>${esc(O[p.organizatii[0]]?.nume || '')} · ${k}×</small></span></a>`).join('')}</div>
          <div class="x-navi-ft">
            <span>${next ? `<i class="dot-live"></i>Următorul: <b>${fmtDay(next.a.data)}</b>, cohorta ${esc(edLabel(next.e))}` : cluj ? `Următorul: <b>Cluj #${cluj.e.numar}</b>, ${esc(cluj.e.perioada)}` : `Următorul: <b>cohorta #${nextB}</b>`}</span>
            <a class="x-link" href="${esc(temaUrl(t))}">${TEME ? 'Despre temă' : 'Liderii temei'} ${ARROW}</a>
          </div>
        </div>`;
      }).join('')}</div>
    </div>
  </div></section>

  <!-- 04 · dovezile: companiile care au crescut, liderii, partenerii -->
  <section class="x-sec h3-proof"><div class="wrap">
    <div class="x-head x-head-row"><div><p class="x-eyebrow"><span>Rezultate</span></p><h2>Companii care au crescut și cu ajutorul programului.</h2></div><a class="x-link" href="/comunitate">Toată comunitatea ${ARROW}</a></div>
    <div class="h3-grown">${grown.slice(0, 9).map((o) => `<span><a href="${esc(companyUrl(AL.L, o))}" title="${esc(o.nume.replace(/\s*\(.*\)$/, ''))} în comunitate"><img src="${esc(o.logo)}" alt="${esc(o.nume.replace(/\s*\(.*\)$/, ''))}" loading="lazy"></a></span>`).join('')}</div>
    <div class="h3-figs">
      <div><b>${AL.L.length}</b><span>${de(AL.L.length)}antreprenori în comunitate, din ${AL.sectors.length} ${de(AL.sectors.length)}industrii</span></div>
      <div><b>${AL.medianAng}</b><span>${de(AL.medianAng)}angajați la mediană, în companiile din comunitate</span></div>
      <div><b>${F.ciclu.length}</b><span>${de(F.ciclu.length)}companii s-au întors ca parteneri</span></div>
    </div>
  </div></section>

  <section class="x-sec x-railsec"><div class="wrap">
    <div class="x-head x-head-row"><div><p class="x-eyebrow"><span>Cine îți predă</span></p><h2>Oameni care au construit ce predau.</h2></div><a class="x-link" href="/lideri">Toți cei ${TR.length} ${ARROW}</a></div>
  </div>
    <div class="x-rail" data-x-rail><div class="x-rail-in">${[0, 1].map((k) => invited.concat(TR.filter((x) => !x.roluri.includes('antreprenor invitat'))).slice(0, 14).map((x) => `<a class="x-person" href="/lideri/${esc(x.p.id)}"${k ? ' aria-hidden="true" tabindex="-1"' : ''}>${face(x.p, 320)}<span><em>${x.rol === 'antreprenor invitat' ? 'Fondator · CEO' : x.rol === 'trainer' ? 'Trainer' : 'Facilitator'}</em><b>${esc(x.p.nume)}</b><small>${esc(x.org)}</small></span></a>`).join('')).join('')}</div></div>
  </section>

  <section class="x-sec h3-partners"><div class="wrap">
    <div class="x-tile x-pband">
      <div class="x-pband-h"><div><span class="x-k">Parteneri</span><h3>Companii care au ajutat Antreprenoria să crească</h3></div><a class="x-link" href="/parteneri">Construiește un parteneriat ${ARROW}</a></div>
      <div class="x-pband-rail"><div class="x-pband-in">${[0, 1].map((k) => `<div${k ? ' aria-hidden="true"' : ''}>${PARTNERS.map(({ o, src }) => `<a class="x-plg" href="/parteneri#${esc(o.id)}" title="${esc(o.nume)}"${k ? ' tabindex="-1"' : ''}><img src="${esc(src)}" alt="${k ? '' : esc(o.nume)}" loading="lazy"></a>`).join('')}</div>`).join('')}</div></div>
    </div>
  </div></section>

  <!-- 05 · apelul final -->
  <section class="x-cta"><div class="wrap x-cta-in">
    <div><p class="x-eyebrow"><span>Locul tău</span></p><h2>Aplică pentru cohorta următoare.</h2><p class="x-lead">Locurile sunt limitate la aproximativ 25 pe cohortă. Aplicarea durează câteva minute, iar răspunsul vine în cel mult 10 zile lucrătoare.</p></div>
    <div class="x-seats">${seats.map((x) => `<a class="x-seat x-glass" href="${esc(x.href)}"><span class="x-tag${x.open ? ' x-tag-open' : ''}">${x.tag}</span><b>${esc(x.t)}</b><span>${esc(x.s)}</span>${x.m ? `<small>${esc(x.m)}</small>` : ''}<em>${x.open ? 'Detalii și înscriere' : 'Aplică'} ${ARROW}</em></a>`).join('')}</div>
  </div></section>
</main>`;
}

module.exports = { home3Body };
