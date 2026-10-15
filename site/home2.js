// Homepage, varianta „2029” (previzualizare, doar local: /previzualizare/acasa).
// Un centru de comandă viu în loc de broșură: cohorta în desfășurare și numărătoarea până la următorul atelier,
// navigatorul „ce vrei să rezolvi”, verificarea potrivirii cu cohorta (doar cifre agregate), lideri, comunitate, parteneri.
// Totul vine din creier; cifrele de afaceri apar doar agregat (mediană, intervale, distribuție).
const { esc, initials, fmtDay, today, img, de } = require('./util');
const { tx } = require('./texte');
const { themeInfo, pulse, NEEDS } = require('./home');
const { everyone } = require('./traineri');
const { alumniData } = require('./alumni');

const edUrl = (e) => (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`);
const edLabel = (e) => (e.serie === 'Cluj' ? `Cluj #${e.numar}` : `#${e.numar}`);
const cleanTitle = (t) => String(t || '').replace(/^(Atelier de Seară|COCKTAIL NETWORKING)\s*[-:]\s*/i, '').replace(/\.\s*$/, '');
const face = (p, w = 160) => (p?.imagine ? `<img src="${esc(img(p.imagine, w))}" alt="" loading="lazy">` : `<span class="ph">${esc(initials(p?.nume || '?'))}</span>`);
const mil = (n) => (n / 1e6).toLocaleString('ro-RO', { maximumFractionDigits: n < 1e7 ? 1 : 0 });
const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const LUNI = ['ian.', 'feb.', 'mar.', 'apr.', 'mai', 'iun.', 'iul.', 'aug.', 'sep.', 'oct.', 'nov.', 'dec.'];
const shortDay = (d) => { const [, m, z] = d.split('-').map(Number); return `${z} ${LUNI[m - 1]}`; };
const KIND = { next: 'Urmează', done: 'Ținut', cycle: 'Comunitate', host: 'Gazdă', open: 'Înscrieri', wait: 'Listă' };

// ora de început a unui atelier, din agenda lui
const startOf = (a) => { const t = (a?.program || []).map((p) => (String(p.interval || '').match(/\d{1,2}:\d{2}/) || [])[0]).filter(Boolean).sort()[0]; return t || '09:00'; };

function home2Body(ctx, F) {
  const { D, P, O } = ctx;
  const ong = F.ongoing, nx = F.next, t0 = today();
  const ws = ong ? ong.ateliere.slice().sort((a, b) => (a.data || '9').localeCompare(b.data || '9')) : [];
  const held = ws.filter((a) => a.data && a.data < t0).length;
  const pct = ws.length ? held / ws.length : 0;
  const nxPeople = nx ? nx.program.flatMap((x) => x.speakeri).map((s) => P[s.persoana]).filter(Boolean) : [];
  const TR = everyone(ctx), AL = alumniData(ctx);
  const invited = TR.filter((x) => x.roluri.includes('antreprenor invitat'));
  const COS = [...new Set([...invited, ...TR].map((x) => x.org).filter((n) => n && D.organizatii.some((o) => o.nume === n)))];
  const partners = F.partners.filter((o) => o.logo).slice(0, 6);
  const feed = pulse(ctx, F).slice(0, 3);
  const needs = NEEDS.map(([id, label]) => ({ id, label, info: themeInfo(ctx, F, id) })).filter((x) => x.info);

  // distribuția cifrei de afaceri a participanților: doar numărul de companii pe intervale (agregat)
  const ca = D.editii.flatMap((e) => e.participanti).map((p) => p.cifra_afaceri).filter((x) => x != null);
  const BINS = [[0, 1e6, '<1'], [1e6, 2.5e6, '1–2,5'], [2.5e6, 5e6, '2,5–5'], [5e6, 1e7, '5–10'], [1e7, 2.5e7, '10–25'], [2.5e7, 5e7, '25–50'], [5e7, Infinity, '50+']];
  const hist = BINS.map(([a, b, l]) => ({ l, a, b, n: ca.filter((x) => x >= a && x < b).length }));
  const hMax = Math.max(...hist.map((h) => h.n));
  const fit = { q1: F.q1, med: F.medianCa, q3: F.q3, medAng: F.medianAng, prag: 2.5e6, bins: hist.map((h) => [h.a, h.b === Infinity ? 1e12 : h.b]) };

  const sectors = AL.sectors.slice(0, 5), sMax = sectors[0]?.[1] || 1;
  const nextB = `#${F.maxNr + 1}`;
  const lastB = D.editii.filter((e) => e.serie === 'București').sort((x, y) => y.numar - x.numar)[0];
  const nextSez = lastB ? (lastB.sezon === 'toamnă' ? `primăvară ${lastB.an + 1}` : `toamnă ${lastB.an}`) : '';
  const clujPrice = F.cluj?.preturi.find((p) => !p.ascuns);
  const R = 52, C = 2 * Math.PI * R;

  return `<main class="x">
  <!-- 01 · hero: promisiunea și centrul de comandă al cohortei în desfășurare -->
  <section class="x-hero">
    <div class="x-aurora" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="x-grid" aria-hidden="true"></div>
    <div class="wrap x-hero-in">
      <div class="x-copy" data-x-in>
        <p class="x-eyebrow"><span class="x-chip"><i class="dot-live"></i>${ong ? `Cohorta #${ong.numar} e live` : 'Înscrieri deschise'}</span><span>Acceleratorul Romanian Business Leaders · din ${D.program.de_cand}</span></p>
        <h1>${esc(tx(D, 'acasa.titlu'))}</h1>
        <p class="x-lead">${esc(tx(D, 'acasa.lead'))}</p>
        <div class="x-actions">
          <a class="x-btn x-btn-glow" href="/aplica">Aplică pentru un loc ${ARROW}</a>
          <a class="x-btn x-btn-glass" href="#navigator">Găsește-ți tema</a>
        </div>
        <dl class="x-kpis">
          <div><dt data-x-count="${F.maxNr}">${F.maxNr}</dt><dd>${de(F.maxNr)}cohorte</dd></div>
          <div><dt data-x-count="${TR.length}">${TR.length}</dt><dd>${de(TR.length)}lideri care predau</dd></div>
          <div><dt data-x-count="${AL.L.length}">${AL.L.length}</dt><dd>${de(AL.L.length)}antreprenori în comunitate</dd></div>
        </dl>
      </div>

      ${ong ? `<aside class="x-cc x-glass" aria-label="Cohorta în desfășurare" data-x-in>
        <div class="x-cc-top"><span class="x-tag"><i class="dot-live"></i>Live</span><a href="${edUrl(ong)}">Cohorta #${ong.numar} · ${esc(ong.perioada)} ${ARROW}</a></div>
        <div class="x-cc-main">
          <div class="x-ring" style="--p:${pct}">
            <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${R}" class="x-ring-bg"/><circle cx="60" cy="60" r="${R}" class="x-ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-x-ring="${C * (1 - pct)}"/></svg>
            <span><b>${held}<small>/${ws.length}</small></b><em>ateliere ținute</em></span>
          </div>
          ${nx ? `<div class="x-count" data-x-countdown="${nx.data}T${startOf(nx)}:00">
            <span class="x-k">Următorul atelier începe în</span>
            <div class="x-clock" aria-live="off"><div><b data-u="d">–</b><small>zile</small></div><div><b data-u="h">–</b><small>ore</small></div><div><b data-u="m">–</b><small>min</small></div><div><b data-u="s">–</b><small>sec</small></div></div>
            <p class="x-count-t">${esc(cleanTitle(nx.titlu))}</p>
            <p class="x-count-m">${fmtDay(nx.data)} · ${startOf(nx)}${nx.locatie && nx.locatie !== 'TBD' ? ' · ' + esc(nx.locatie) : ''}</p>
          </div>` : ''}
        </div>
        ${nxPeople.length ? `<div class="x-cc-ppl"><span class="x-stack">${nxPeople.slice(0, 5).map((p) => `<a href="/lideri/${esc(p.id)}" title="${esc(p.nume)}">${face(p, 96)}</a>`).join('')}</span><span>cu <b>${esc(nxPeople.slice(0, 2).map((p) => p.nume).join(', '))}</b>${nxPeople.length > 2 ? ` și încă ${nxPeople.length - 2}` : ''}</span></div>` : ''}
        <div class="x-cc-track" aria-label="Agenda cohortei">${ws.map((a) => `<i class="${a.data && a.data < t0 ? 'done' : nx && a.id === nx.id ? 'next' : ''}" title="${esc(cleanTitle(a.titlu))}${a.data ? ' · ' + fmtDay(a.data) : ''}"></i>`).join('')}</div>
      </aside>` : ''}
    </div>
    <div class="x-marq" aria-label="Companiile liderilor care predau"><div class="x-marq-in">${[0, 1].map((k) => `<div${k ? ' aria-hidden="true"' : ''}>${COS.map((c) => `<span>${esc(c)}</span>`).join('<i>✦</i>')}<i>✦</i></div>`).join('')}</div></div>
  </section>

  <!-- 02 · navigatorul: problema ta -> tema, oamenii care o predau, următorul atelier -->
  <section class="x-sec x-navsec" id="navigator"><div class="wrap">
    <div class="x-head" data-x-in><p class="x-eyebrow"><span>Navigator</span></p><h2>Ce vrei să rezolvi în compania ta?</h2><p>Alege o provocare. Îți arătăm tema din program, liderii care o predau și când e următorul atelier.</p></div>
    <div class="x-navi" data-x-navi data-x-in>
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
            <span>${next ? `<i class="dot-live"></i>Următorul: <b>${fmtDay(next.a.data)}</b>, cohorta ${esc(edLabel(next.e))}` : cluj ? `Următorul: <b>Cluj #${cluj.e.numar}</b>, ${esc(cluj.e.perioada)}` : `Următorul: <b>cohorta ${nextB}</b>`}</span>
            <a class="x-link" href="/teme/${esc(t.id)}">Despre temă ${ARROW}</a>
          </div>
        </div>`;
      }).join('')}</div>
    </div>
  </div></section>

  <!-- 03 · bento: potrivirea, parcursul, oamenii, comunitatea, partenerii, pulsul -->
  <section class="x-sec x-bentosec"><div class="wrap">
    <div class="x-head" data-x-in><p class="x-eyebrow"><span>Programul, în timp real</span></p><h2>Totul, dintr-o privire.</h2></div>
    <div class="x-bento">
      <article class="x-tile x-fit" data-x-fit='${esc(JSON.stringify(fit))}' data-x-in>
        <div class="x-tile-h"><span class="x-k">Verifică potrivirea</span><span class="x-pill">doar cifre agregate</span></div>
        <h3>Unde s-ar așeza compania ta în cohortă?</h3>
        <label class="x-range"><span>Cifra de afaceri anuală <b data-x-o="ca">–</b></span><input type="range" min="0" max="1000" value="560" data-x-i="ca" aria-label="Cifra de afaceri anuală"></label>
        <label class="x-range"><span>Angajați <b data-x-o="ang">–</b></span><input type="range" min="0" max="1000" value="420" data-x-i="ang" aria-label="Numărul de angajați"></label>
        <div class="x-hist" aria-hidden="true">${hist.map((h) => `<i style="--h:${Math.max(6, Math.round((h.n / hMax) * 100))}%"><small>${h.l}</small></i>`).join('')}</div>
        <p class="x-hist-l">Companiile din ultimele cohorte, după cifra de afaceri (mil. lei)</p>
        <p class="x-fit-v" data-x-o="verdict" aria-live="polite"></p>
      </article>

      ${ong ? `<article class="x-tile x-journey" data-x-in>
        <div class="x-tile-h"><span class="x-k">Parcursul unei cohorte</span><span class="x-pill">${esc(ong.perioada)}</span></div>
        <h3>Trei luni, ${ws.length} întâlniri.</h3>
        <ol class="x-steps">${ws.map((a) => `<li class="${a.data && a.data < t0 ? 'done' : nx && a.id === nx.id ? 'next' : ''}"><i></i><span><small>${a.data ? shortDay(a.data) : 'în curând'}</small><b>${esc(cleanTitle(a.titlu))}</b></span></li>`).join('')}</ol>
        <a class="x-link" href="${edUrl(ong)}#agenda">Agenda completă ${ARROW}</a>
      </article>` : ''}

      <a class="x-tile x-people" href="/lideri" data-x-in>
        <div class="x-tile-h"><span class="x-k">Lideri</span></div>
        <b class="x-big">${TR.length}</b>
        <p>fondatori, CEO și traineri, de la ${COS.length} ${de(COS.length)}companii</p>
        <span class="x-stack x-stack-lg">${invited.slice(0, 6).map((x) => face(x.p, 96)).join('')}</span>
        <span class="x-link">Vezi liderii ${ARROW}</span>
      </a>

      <a class="x-tile x-comm" href="/comunitate" data-x-in>
        <div class="x-tile-h"><span class="x-k">Comunitatea</span></div>
        <b class="x-big">${AL.L.length}</b>
        <p>antreprenori, din ${AL.sectors.length} ${de(AL.sectors.length)}industrii</p>
        <ul class="x-bars">${sectors.map(([s, n]) => `<li><span>${esc(s)}</span><i style="--w:${Math.round((n / sMax) * 100)}%"></i><b>${n}</b></li>`).join('')}</ul>
      </a>

      <div class="x-tile x-pulse" data-x-in>
        <div class="x-tile-h"><span class="x-k"><i class="dot-live"></i>Pulsul programului</span></div>
        <ul>${feed.map((f) => `<li><a href="${esc(f.href)}"><em>${KIND[f.kind] || ''}</em><b>${esc(f.title)}</b><small>${esc(f.text)}</small></a></li>`).join('')}</ul>
      </div>
      <a class="x-tile x-partners" href="/parteneri" data-x-in>
        <div class="x-tile-h"><span class="x-k">Parteneri</span></div>
        <div class="x-logos">${partners.map((o) => `<span><img src="${esc(o.logo)}" alt="${esc(o.nume)}" loading="lazy"></span>`).join('')}</div>
        <span class="x-link">Construiește un parteneriat ${ARROW}</span>
      </a>

    </div>
  </div></section>

  <!-- 04 · liderii, în mișcare -->
  <section class="x-sec x-railsec"><div class="wrap">
    <div class="x-head x-head-row" data-x-in><div><p class="x-eyebrow"><span>Cine îți predă</span></p><h2>Oameni care au construit ce predau.</h2></div><a class="x-link" href="/lideri">Toți cei ${TR.length} ${ARROW}</a></div>
  </div>
    <div class="x-rail" data-x-rail><div class="x-rail-in">${[0, 1].map((k) => invited.concat(TR.filter((x) => !x.roluri.includes('antreprenor invitat'))).slice(0, 14).map((x) => `<a class="x-person" href="/lideri/${esc(x.p.id)}"${k ? ' aria-hidden="true" tabindex="-1"' : ''}>${face(x.p, 320)}<span><em>${x.rol === 'antreprenor invitat' ? 'Fondator · CEO' : x.rol === 'trainer' ? 'Trainer' : 'Facilitator'}</em><b>${esc(x.p.nume)}</b><small>${esc(x.org)}</small></span></a>`).join('')).join('')}</div></div>
  </section>

  <!-- 05 · locul tău -->
  <section class="x-cta"><div class="x-aurora x-aurora-2" aria-hidden="true"><i></i><i></i></div><div class="wrap x-cta-in">
    <div data-x-in><p class="x-eyebrow"><span>Locul tău</span></p><h2>Următoarea cohortă se formează acum.</h2><p class="x-lead">În jur de 25 de antreprenori, selectați ca discuțiile să fie între egali.</p></div>
    <div class="x-seats">
      ${F.cluj ? `<a class="x-seat x-glass" href="${edUrl(F.cluj)}" data-x-in><span class="x-tag x-tag-open">Înscrieri deschise</span><b>Cluj #${F.cluj.numar}</b><span>${esc(F.cluj.perioada)}</span>${clujPrice ? `<small>${esc(clujPrice.pret_text.replace(/(\d)(\d{3})\b/, '$1.$2'))}</small>` : ''}<em>Detalii și înscriere ${ARROW}</em></a>` : ''}
      <a class="x-seat x-glass" href="/aplica" data-x-in><span class="x-tag">Listă de așteptare</span><b>București ${nextB}</b><span>${esc(nextSez)}</span><small>primii anunțați la deschidere</small><em>Intră pe listă ${ARROW}</em></a>
    </div>
  </div></section>
</main>`;
}

module.exports = { home2Body };
