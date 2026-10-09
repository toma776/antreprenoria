// Pagina /program: tot ce trebuie să știi înainte să aplici, într-o singură pagină cu secțiuni (ancorele din meniu duc aici).
// Conținutul vine din creier: descrierea și audiența de pe /despre-noi, metodologia, agenda ediției curente, prețurile.
// Profilul participanților apare doar agregat.
const { esc, initials, milLei, img } = require('./util');

const plural = (n, one, many) => `${n} ${n === 1 ? one : (n % 100 === 0 || n % 100 >= 20 ? 'de ' : '') + many}`;
const avatar = (p) => (p?.imagine ? `<img src="${esc(img(p.imagine, 128))}" alt="" loading="lazy">` : `<span class="ph">${esc(initials(p?.nume || '?'))}</span>`);
const edUrl = (e) => (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`);
const cleanTitle = (t) => String(t || '').replace(/^(Atelier de Seară|COCKTAIL NETWORKING)\s*[-:]\s*/i, '');
const sentence = (s) => { s = String(s || '').trim(); return s.charAt(0).toUpperCase() + s.slice(1); };
const mins = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
// prima propoziție dintr-o descriere de atelier (unele sunt scrise cu majuscule pe site-ul vechi)
const firstSentence = (d) => { let t = String(d || '').trim(); if (t && t === t.toUpperCase()) t = t.toLowerCase(); t = (t.match(/^[^.!?]+[.!?]/) || [t])[0]; return sentence(t); };
const ROLE = { trainer: 'Trainer', 'antreprenor invitat': 'Antreprenor invitat' };

function programBody(ctx, F) {
  const { D, P, O, T } = ctx;
  const ong = F.ongoing || D.editii.filter((e) => e.serie === 'București').sort((a, b) => b.numar - a.numar)[0];
  const ws = ong.ateliere.slice().sort((a, b) => a.nr - b.nr);
  const byFormat = (f) => ws.filter((a) => a.format === f);
  const fullDay = byFormat('full-day'), evening = byFormat('seară'), networking = byFormat('networking');
  const mastermind = evening.filter((a) => a.tema === 'mastermind'), eveningOther = evening.filter((a) => a.tema !== 'mastermind');

  // o zi de atelier: primul atelier full-day al ediției curente cu programul complet
  const day = fullDay.find((a) => a.program.length >= 5) || fullDay[0];
  const blocks = (day?.program || []).map((x) => { const [a, b] = x.interval.split('-').map((s) => s.trim()); return { ...x, from: a, to: b, len: mins(b) - mins(a) }; }).filter((x) => x.len > 0);
  const total = blocks.reduce((n, x) => n + x.len, 0) || 1;
  const kind = (x) => (/training/i.test(x.activitate) ? 'train' : /vorbitor|prezentare|speaker/i.test(x.activitate) ? 'talk' : /networking/i.test(x.activitate) ? 'net' : 'break');
  const KIND_LABEL = { train: 'Training aplicat', talk: 'Antreprenor invitat', net: 'Networking', break: 'Pauză' };

  // pentru cine e: criteriile din textul de audiență, scrise ca listă
  const criterii = [
    ['Peste 1 milion de euro', 'cifră de afaceri anuală'],
    ['Peste 500.000 de euro', 'cu un avantaj competitiv inovativ'],
    ['Sub 500.000 de euro', 'dacă e fondată de antreprenori seniori, cu o investiție semnificativă'],
  ];
  const maxSector = F.sectors[0]?.[1] || 1;

  // investiția: prețurile vizibile ale edițiilor deschise și ce include o ediție
  const priced = D.editii.filter((e) => e.deschisa).map((e) => ({ e, p: e.preturi.find((x) => !x.ascuns) })).filter((x) => x.p);
  const benefits = (ong.beneficii.length ? ong.beneficii : D.editii.find((e) => e.beneficii.length)?.beneficii || []).map((b) => { const m = /^(\d+)\s+(.*)$/.exec(b.trim()); return m ? [m[1], m[2].replace(/success/i, 'succes')] : ['1', b]; });
  const valoare = ong.valoare_estimata || D.editii.find((e) => e.valoare_estimata)?.valoare_estimata;
  const team = Object.fromEntries(D.program.contact.echipa.map((p) => [p.id, p]));
  const raluca = team['raluca-bedereag'];

  const NAV = [['cum', 'Cum funcționează'], ['format', 'Formatul'], ['metodologie', 'Metodologia'], ['pentru-cine', 'Pentru cine e'], ['investitie', 'Investiția']];

  return `<main>
  <section class="hero pg-hero"><div class="wrap">
    <nav class="crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><b>Program</b></nav>
    <div class="hero-split">
      <div class="hero-copy">
        <p class="eyebrow">Programul · din ${D.program.de_cand}</p>
        <h1>Trei luni în care te uiți strategic la compania ta.</h1>
        <p class="lead">${esc(sentence(D.program.descriere || '').replace(/\s*–\s*/g, ': ').split('. ').slice(0, 2).join('. ').replace(/\.?$/, '.'))}</p>
        <div class="hero-actions"><a class="btn btn-primary btn-lg" href="/aplica">Aplică</a><a class="btn btn-ghost btn-lg" href="#pentru-cine">Ești potrivit?</a></div>
      </div>
      <aside class="pg-glance" aria-label="Pe scurt">
        <div class="ed-live-top"><span>Pe scurt</span><span>o ediție</span></div>
        <dl>
          <div><dt>3 luni</dt><dd>${esc(ong.perioada.replace(/\s*-\s*/, '–'))}, la ediția #${ong.numar}</dd></div>
          <div><dt>${fullDay.length} ateliere full-day</dt><dd>câte o temă: ${fullDay.map((a) => esc(T[a.tema]?.nume || cleanTitle(a.titlu))).join(', ')}</dd></div>
          <div><dt>${evening.length} ateliere de seară</dt><dd>${evening.map((a) => esc(cleanTitle(a.titlu))).join(', ')}</dd></div>
          <div><dt>~25 de antreprenori</dt><dd>selectați, ca discuțiile să fie între oameni cu provocări asemănătoare</dd></div>
          ${networking.length ? `<div><dt>Petrecerea de final</dt><dd>${esc(cleanTitle(networking[0].titlu))}, cu comunitatea RBL</dd></div>` : ''}
        </dl>
      </aside>
    </div>
  </div>
  </section>
  <nav class="pg-nav" aria-label="Secțiunile paginii"><div class="wrap">${NAV.map(([id, t], i) => `<a href="#${id}"><i>0${i + 1}</i>${t}</a>`).join('')}</div></nav>

  ${day ? `<section class="sec" id="cum"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Cum funcționează</p><h2>O zi de atelier, de la cafea la networking.</h2>
      <p class="lead">Fiecare atelier full-day are aceeași structură: dimineața un trainer lucrează aplicat cu grupa, după-amiaza doi antreprenori povestesc cum au rezolvat exact problema zilei, seara networking cu colegii.</p></div></div>
    <div class="day">
      <div class="day-bar" aria-hidden="true">${blocks.map((x) => `<i class="${kind(x)}" style="flex:${x.len}"></i>`).join('')}</div>
      <ol class="day-list" style="grid-template-columns:${blocks.map((x) => (kind(x) === 'break' ? 'minmax(84px, .6fr)' : 'minmax(150px, 1.4fr)')).join(' ')}">${blocks.map((x) => { const ppl = x.speakeri.map((s) => ({ p: P[s.persoana], s })).filter((y) => y.p);
        return `<li class="${kind(x)}" style="--w:${Math.max(x.len / total, 0.06)}"><time>${esc(x.from)}</time><b>${esc(kind(x) === 'break' ? x.activitate : KIND_LABEL[kind(x)])}</b>
          ${ppl.map(({ p, s }) => `<a class="day-person" href="/traineri/${esc(p.id)}">${avatar(p)}<span><b>${esc(p.nume)}</b><small>${esc(O[s.organizatie]?.nume || (s.companie !== 'Trainer' ? s.companie : '') || ROLE[s.rol] || '')}</small></span></a>`).join('')}</li>`; }).join('')}</ol>
      <p class="day-note">Exemplu real: atelierul „${esc(cleanTitle(day.titlu))}”, ediția #${ong.numar}. <a href="${edUrl(ong)}#agenda">Toată agenda ediției →</a></p>
    </div>
  </div></section>` : ''}

  <section class="sec sec-alt" id="format"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Formatul unei ediții</p><h2>${plural(ws.length, 'întâlnire', 'întâlniri')} într-un trimestru.</h2>
      <p class="lead">Temele full-day sunt aceleași de la o ediție la alta; atelierele de seară s-au schimbat.</p></div>
      <a class="link-arrow" href="/teme">Toate temele →</a></div>
    <div class="fmt">
      <div class="fmt-card big"><b>${fullDay.length}</b><h3>Ateliere full-day</h3><ul>${fullDay.map((a) => `<li><a href="/teme/${esc(a.tema)}">${esc(T[a.tema]?.nume || cleanTitle(a.titlu))}</a></li>`).join('')}</ul></div>
      ${eveningOther.length ? `<div class="fmt-card"><b>${eveningOther.length}</b><h3>Ateliere de seară</h3><ul>${eveningOther.map((a) => `<li>${esc(cleanTitle(a.titlu))}</li>`).join('')}</ul></div>` : ''}
      ${mastermind.length ? `<div class="fmt-card"><b>${mastermind.length}</b><h3>Mastermind</h3><p>${esc(firstSentence(mastermind[0].descriere))}</p></div>` : ''}
      ${networking.length ? `<div class="fmt-card"><b>${networking.length}</b><h3>Petrecerea de final</h3><p>${esc(cleanTitle(networking[0].titlu))}. ${esc(firstSentence(networking[0].descriere))}</p></div>` : ''}
    </div>
    <div class="fmt-line" aria-label="Calendarul ediției #${ong.numar}">${ws.filter((a) => a.data).map((a) => `<span class="${a.format === 'full-day' ? 'fd' : a.format === 'networking' ? 'nw' : 'ev'}" title="${esc(cleanTitle(a.titlu))}"><i></i><small>${Number(a.data.slice(8))}.${a.data.slice(5, 7)}</small></span>`).join('')}</div>
    <p class="day-note">Calendarul ediției #${ong.numar}: <i class="k fd"></i>full-day <i class="k ev"></i>seară <i class="k nw"></i>networking</p>
  </div></section>

  <section class="sec" id="metodologie"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Metodologia</p><h2>Cinci lucruri pe care le primești, nu doar cursuri.</h2></div>
    <ol class="steps ed-steps">${D.program.metodologie.map((m, k) => `<li class="step"><span class="step-n">0${k + 1}</span><h3>${esc(m.titlu.charAt(0) + m.titlu.slice(1).toLowerCase())}</h3>
      <ul>${m.puncte.map((x) => `<li>${esc(x.replace(/;$/, '.').replace(/\bANTREPRENORI\b/g, 'antreprenori').replace(/provocarile/g, 'provocările'))}</li>`).join('')}</ul></li>`).join('')}</ol>
  </div></section>

  <section class="sec sec-dark" id="pentru-cine"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Pentru cine e</p><h2>Pentru fondatori și manageri de companii care vor să scaleze.</h2></div>
    <div class="who">
      <div>
        <h3 class="who-h">Cifra de afaceri a companiei</h3>
        <div class="crit">${criterii.map(([a, b]) => `<div><b>${a}</b><span>${b}</span></div>`).join('')}</div>
        <h3 class="who-h">Ce obții</h3>
        <ul class="checks">${D.program.ce_obtii.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>
      <div>
        <h3 class="who-h">Cine a participat până acum</h3>
        <div class="figures who-figs">
          <div class="fig"><b>${milLei(F.q1)}–${milLei(F.q3)}<em> mil. lei</em></b><span>cifra de afaceri a jumătății „de mijloc” a companiilor</span></div>
          <div class="fig"><b>${F.medianAng}</b><span>angajați, la mediană</span></div>
        </div>
        <div class="sectors">${F.sectors.slice(0, 7).map(([s, n]) => `<div class="sector"><span>${esc(s)}</span><i style="--w:${(n / maxSector) * 100}%"></i><b>${n}</b></div>`).join('')}</div>
        <p class="fine">${F.participanti} de participanți din edițiile #16–#${F.maxNr}. Cifre agregate din datele declarate la înscriere.</p>
      </div>
    </div>
  </div></section>

  <section class="sec" id="investitie"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Investiția</p><h2>Ce plătești și ce primești.</h2>
      ${valoare ? `<p class="lead">Valoarea estimată a unei ediții e de ${esc(valoare.replace(/^valoare estimată:\s*/i, ''))}: atelierele, accesul la traineri și antreprenori, sprijinul partenerilor și comunitatea.</p>` : ''}</div></div>
    <div class="price-row">
      ${priced.map(({ e, p }) => { const live = F.ongoing && e.id === F.ongoing.id;
        return `<a class="price ${live ? 'ref' : ''}" href="${edUrl(e)}"><span class="ask-kicker">${e.serie === 'Cluj' ? `Cluj #${e.numar}` : `Ediția #${e.numar}`} · ${live ? 'în desfășurare' : 'înscrieri deschise'}</span><b>${esc(p.pret_text.replace(/(\d)(\d{3})\b/, '$1.$2'))}</b>
        <span>${live ? 'taxa la ediția în curs, ca reper; înscrierile s-au încheiat' : esc(p.nota ? p.nota.replace(/\.$/, '') : p.eticheta || '')}</span><em>Vezi ediția →</em></a>`; }).join('')}
      <a class="price next" href="/aplica"><span class="ask-kicker">Ediția #${F.maxNr + 1} · București</span><b>Listă de așteptare</b><span>Te anunțăm primul când se deschid înscrierile și cât costă.</span><em>Intră pe listă →</em></a>
    </div>
    ${benefits.length ? `<h3 class="who-h" style="margin-top:36px">Ce include o ediție</h3><div class="benefits">${benefits.map(([n, t]) => `<div class="benefit"><b>${esc(n)}</b><span>${esc(t)}</span></div>`).join('')}</div>` : ''}
  </div></section>

  <section class="cta-band"><div class="wrap cta-band-in">
    <div class="cta-band-copy">
      <p class="eyebrow">Aplică</p>
      <h2>Crești mai repede alături de oameni care au trecut prin asta.</h2>
      <p>Intră pe lista pentru ediția #${F.maxNr + 1} din București${F.cluj ? ` sau aplică la Cluj #${F.cluj.numar}` : ''}.</p>
      <div class="hero-actions"><a class="btn btn-light btn-lg" href="/aplica">Intră pe lista de așteptare</a>${F.cluj ? `<a class="btn btn-outline-light btn-lg" href="${edUrl(F.cluj)}">Aplică la Cluj #${F.cluj.numar}</a>` : ''}</div>
    </div>
    ${raluca ? `<div class="ask-card"><span class="ask-kicker">Ai întrebări înainte să aplici?</span><b>${esc(raluca.nume)}</b><span>${esc(raluca.rol.split('·')[0].trim())}</span>
      <a href="mailto:${esc(raluca.email)}">${esc(raluca.email)}</a>${raluca.telefon ? `<a href="tel:${esc(raluca.telefon.replace(/\D/g, ''))}">${esc(raluca.telefon)}</a>` : ''}</div>` : ''}
  </div></section>
</main>`;
}

module.exports = { programBody };
