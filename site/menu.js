// Meniul principal (mega-meniu): fiecare secțiune a site-ului deschide un panou cu tot ce conține,
// generat din creier. Pe desktop panourile se deschid la hover sau click; pe mobil devin acordeon într-un meniu lateral.
const { img, slug, de, TEME } = require('./util');
const { alumniData, ideas, connectMail } = require('./alumni');
const { everyone } = require('./traineri');
const { partnersData } = require('./parteneri');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const today = () => new Date().toISOString().slice(0, 10);
const MONTHS = ['ian.', 'feb.', 'mar.', 'apr.', 'mai', 'iun.', 'iul.', 'aug.', 'sep.', 'oct.', 'nov.', 'dec.'];
const shortDay = (d) => { const [, m, z] = d.split('-').map(Number); return `${z} ${MONTHS[m - 1]}`; };
const edUrl = (e) => (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`);
const edLabel = (e) => (e.serie === 'Cluj' ? `Cluj #${e.numar}` : `#${e.numar}`);
const pic = (p) => (p.imagine ? `<img src="${esc(img(p.imagine, 256))}" alt="" loading="lazy">` : `<span class="ph">${esc(p.nume.split(' ').map((x) => x[0]).join('').slice(0, 2))}</span>`);

// o legătură din panou: titlu + descriere scurtă
const link = (href, title, desc, extra = '') => `<a class="mm-link" href="${esc(href)}"><b>${title}</b>${desc ? `<span>${desc}</span>` : ''}${extra}</a>`;
const CONTRIB = '<a class="mm-link mm-contrib" href="/parteneri#construieste"><b>Contribuie la program</b><span>Sponsorizează, găzduiește un atelier sau devino mentor</span><i aria-hidden="true">→</i></a>';
const col = (title, body, cls = '') => `<div class="mm-col ${cls}"><h3 class="mm-h">${esc(title)}</h3>${body}</div>`;

// fețele din peretele comunității: câte una din fiecare industrie, pe rând, ca să se vadă cât de diversă e
function faces(L, n) {
  const by = new Map();
  L.filter((a) => a.imagine).forEach((a) => { const k = a.sector || ''; if (!by.has(k)) by.set(k, []); by.get(k).push(a); });
  const out = [], lists = [...by.values()];
  for (let i = 0; out.length < n && lists.some((l) => l[i]); i++) lists.forEach((l) => { if (l[i] && out.length < n) out.push(l[i]); });
  return out;
}

function community(ctx, AL) {
  const sec = AL.sectors.slice(0, 8), max = AL.sectors[0]?.[1] || 1, mail = connectMail(ctx.D);
  const wall = faces(AL.L, 18);
  // cei mai noi membri: din ultima cohortă încheiată, alții decât cei din perete
  const lastEd = AL.eds[AL.eds.length - 1];
  const fresh = AL.L.filter((a) => a.eds.includes(lastEd) && a.desc && !wall.includes(a)).slice(0, 4);
  return `<div class="wrap mm-in mmc" data-mail="${esc(mail)}">
    <div class="mmc-main">
      <p class="mmc-kicker"><i class="dot-live"></i>Comunitatea Antreprenoria · ${AL.L.length} de antreprenori</p>
      <a class="mmc-title" href="/comunitate">Ce cauți? Cineva din comunitate face asta.</a>
      <form class="mmc-search" action="/comunitate" role="search">
        <svg class="mmc-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input name="q" type="search" placeholder="Un serviciu, un produs, o companie…" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" aria-controls="mmc-res" aria-autocomplete="list" aria-label="Caută în comunitate">
        <kbd class="mmc-kbd" aria-hidden="true">Ctrl K</kbd>
        <button type="submit" aria-label="Caută în comunitate"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
      </form>
      <div class="mmc-ideas"><span>Căutate des</span>${ideas(AL.L).map((w) => `<a href="/comunitate?q=${encodeURIComponent(w)}#lista" data-idea="${esc(w)}">${esc(w)}</a>`).join('')}</div>
      <div class="mmc-res" id="mmc-res" role="listbox" aria-label="Rezultate" hidden></div>
      <div class="mmc-new"><h3 class="mm-h">Nou în comunitate · ${esc(edLabel(lastEd))}, ${esc(lastEd.sezon)} ${lastEd.an}</h3>
        <div>${fresh.map((a) => `<a href="${esc(a.page ? `/comunitate/${a.id}` : `/comunitate?membru=${a.id}#lista`)}"><span class="mmc-av">${pic(a)}</span><span><b>${esc(a.nume)}</b><span>${esc(a.org?.nume || '')}</span></span></a>`).join('')}</div></div>
    </div>
    <div class="mmc-explore">
      <h3 class="mm-h">Pe industrii</h3>
      <div class="mmc-sectors">${sec.map(([s, n]) => `<a href="/comunitate?sector=${esc(slug(s))}#lista"><span>${esc(s)}</span><i style="--w:${Math.round((n / max) * 100)}%"></i><b>${n}</b></a>`).join('')}</div>
      <a class="mm-all" href="/comunitate#exploreaza">Toate cele ${AL.sectors.length} ${de(AL.sectors.length)}industrii →</a>
      <h3 class="mm-h mmc-h2">Pe cohorte</h3>
      <div class="mmc-eds">${AL.eds.slice().reverse().map((e) => `<a href="/comunitate?editie=${e.numar}#lista"><b>${esc(edLabel(e))}</b><span>${e.participanti.length}</span></a>`).join('')}</div>
    </div>
    <a class="mmc-wall" href="/comunitate">
      <span class="mmc-faces" aria-hidden="true">${wall.map((a) => `<span>${pic(a)}</span>`).join('')}</span>
      <span class="mmc-wall-tx">
        <span class="mm-kicker">Toată comunitatea</span>
        <b>${AL.L.length} de antreprenori, ${AL.companies} de companii</b>
        <span class="mm-sub">din ${AL.sectors.length} ${de(AL.sectors.length)}industrii și ${AL.eds.length} ${de(AL.eds.length)}cohorte încheiate, fiecare cu ce face și ce oferă</span>
        <span class="mm-more">Intră în comunitate →</span>
      </span>
    </a>
  </div>`;
}

function panels(ctx, F) {
  const { D, P, O, T } = ctx;
  const themePeople = (t) => new Set(D.editii.flatMap((e) => e.ateliere.filter((a) => a.tema === t.id).flatMap((a) => a.program.flatMap((x) => x.speakeri.map((s) => s.persoana))))).size;
  const fullDay = D.teme.filter((t) => t.format === 'full-day');
  // alumnii, ca pe pagina /comunitate (aceleași numere în meniu și în filtre)
  const AL = alumniData(ctx);
  const TR = everyone(ctx), nRol = (r) => TR.filter((x) => x.roluri.includes(r)).length;
  // companiile liderilor: întâi ale antreprenorilor invitați, apoi ale celorlalți (fără duplicate)
  const COS = [...new Set([...TR.filter((x) => x.roluri.includes('antreprenor invitat')), ...TR].map((x) => x.org).filter((n) => n && D.organizatii.some((o) => o.nume === n)))];
  const evening = D.teme.filter((t) => t.format === 'seară');
  const ong = F.ongoing;
  const held = ong ? ong.ateliere.filter((a) => a.data && a.data < today() && a.data.startsWith(String(ong.an))).length : 0;
  const upcoming = ong ? ong.ateliere.filter((a) => a.data && a.data >= today() && a.data.startsWith(String(ong.an))).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 4) : [];
  const caute = ong ? ong.ateliere.filter((a) => a.cauta_sponsor).length : 0;
  const edChrono = D.editii.slice().sort((a, b) => (a.an - b.an) || (a.sezon === b.sezon ? (a.serie === 'Cluj') - (b.serie === 'Cluj') : a.sezon === 'primăvară' ? -1 : 1));
  const editii = D.editii.slice().sort((a, b) => (b.an - a.an) || (a.sezon === b.sezon ? (a.serie === 'Cluj') - (b.serie === 'Cluj') : a.sezon === 'toamnă' ? -1 : 1));
  const strategic = D.organizatii.filter((o) => o.logo && o.roluri.some((r) => ['partener strategic', 'powered by', 'partener ediție'].includes(r.rol)));
  const team = D.program.contact.echipa;
  // cohortele: perioada scurtă (sep.–dec. 2026), următoarea din București și începutul arhivei online
  const LUNI = { ianuarie: 'ian.', februarie: 'feb.', martie: 'mar.', aprilie: 'apr.', mai: 'mai', iunie: 'iun.', iulie: 'iul.', august: 'aug.', septembrie: 'sep.', octombrie: 'oct.', noiembrie: 'nov.', decembrie: 'dec.' };
  const per = (e) => { const p = /^(\p{L}+)\s*-\s*(\p{L}+)\s+(\d{4})$/u.exec((e.perioada || '').trim()); return p ? `${LUNI[p[1].toLowerCase()] || p[1]}–${LUNI[p[2].toLowerCase()] || p[2]} ${p[3]}` : `${e.sezon} ${e.an}`; };
  const nextEd = D.editii.find((e) => e.serie === 'București' && e.numar === F.maxNr + 1);
  // fără ea în date: sezonul de după ultima cohortă din București (toamna e urmată de primăvara anului următor)
  const lastB = D.editii.filter((e) => e.serie === 'București').sort((x, y) => y.numar - x.numar)[0];
  const nextSez = lastB ? (lastB.sezon === 'toamnă' ? `primăvară ${lastB.an + 1}` : `toamnă ${lastB.an}`) : 'urmează';
  const arh = D.editii.filter((e) => e.serie === 'București' && e.participanti.length).sort((x, y) => x.numar - y.numar)[0];
  const firstNr = arh ? arh.numar : 1, firstAn = arh ? arh.an - (arh.sezon === 'toamnă' ? 0 : 1) : D.program.de_cand;
  const coBox = (href, nr, perioada, sub, st) => `<a class="mm-co is-${st}" href="${esc(href)}"><b>${esc(nr)}${st === 'live' ? '<i class="dot-live"></i>' : ''}</b><span>${esc(perioada)}</span><small>${esc(sub)}</small></a>`;
  // cifrele declarate ale programului (550+, 500+, 600+), după ce descriu
  const cifra = (k) => (D.program.cifre.find((c) => c.ce.includes(k)) || {}).valoare || '';
  // cui scrii, după întrebare
  const byId = Object.fromEntries(team.map((x) => [x.id, x]));
  const CONTACT = [['Despre program', byId['raluca-bedereag']], ['Parteneriate', byId['larisa-slavenie']], ['Sponsorizări ateliere', byId['iulian-rizea']]].filter(([, x]) => x && x.email);
  const PD = partnersData(ctx), deN = (n) => `${n}${n % 100 === 0 || n % 100 >= 20 ? ' de' : ''}`;

  return [
    { id: 'program', title: 'Program', href: '/program', intro: 'Ce primești, pentru cine e și cum intri.',
      cols: [
        col('Programul', [
          link('/program#cum', 'Cum funcționează', 'O zi de atelier: training dimineața, antreprenori după-amiaza, networking seara'),
          link('/program#format', 'Formatul unei cohorte', 'Ateliere full-day, ateliere de seară, mastermind, petrecerea de final'),
          link('/program#metodologie', 'Metodologia', D.program.metodologie.map((m) => m.titlu.charAt(0) + m.titlu.slice(1).toLowerCase()).slice(0, 3).join(' · ') + ' …'),
        ].join('')),
        col('Înscrierea', [
          link('/program#pentru-cine', 'Pentru cine e', 'Companii de peste 1 mil. € sau 500.000 € cu avantaj inovativ'),
          link('/program#investitie', 'Investiția', 'Taxa de participare și ce include'),
          link('/aplica', 'Aplică', `Lista pentru cohorta #${F.maxNr + 1}${F.cluj ? ` sau înscriere la Cluj #${F.cluj.numar}` : ''}`),
        ].join('')),
      ],
      feature: F.next ? `<a class="mm-feature" href="${esc(edUrl(ong))}#agenda">
          <span class="mm-kicker"><i class="dot-live"></i>Următorul atelier · ${shortDay(F.next.data)}</span>
          <b>${esc(F.next.titlu)}</b>
          <span class="mm-people">${F.next.program.flatMap((x) => x.speakeri).map((s) => P[s.persoana]).filter(Boolean).map((p) => `<span class="mm-face">${pic(p)}</span>`).join('')}</span>
          <span class="mm-more">Agenda cohortei #${ong.numar} →</span></a>` : '' },

    // cohortele (cohortele): toate, în casete compacte, de la cea mai nouă; starea fiecăreia dintr-o privire
    { id: 'editii', title: 'Cohorte', href: '/editii', intro: `Două cohorte pe an în București, plus Cluj. ${F.maxNr} ${de(F.maxNr)}cohorte din ${D.program.de_cand}.`,
      cols: [
        col('Toate cohortele', `<div class="mm-cohorts">${[
          coBox('/aplica', `#${F.maxNr + 1}`, nextEd ? `${nextEd.sezon} ${nextEd.an}` : nextSez, 'listă de așteptare', 'next'),
          ...editii.filter((e) => e.ateliere.length || e.participanti.length).map((e) => {
            const st = e === ong ? 'live' : e.deschisa ? 'open' : 'past';
            return coBox(edUrl(e), edLabel(e), per(e), st === 'live' ? 'în desfășurare' : st === 'open' ? 'înscrieri deschise' : `${e.participanti.length} ${de(e.participanti.length)}participanți`, st);
          }),
          coBox('/despre#istoric', `#1–#${firstNr - 1}`, `${D.program.de_cand}–${firstAn}`, 'primele cohorte', 'old'),
        ].join('')}</div>
          <a class="mm-all" href="/editii">Toate cohortele, cu agendele și participanții →</a>`, 'wide'),
      ],
      feature: ong ? `<a class="mm-feature" href="${esc(edUrl(ong))}">
          <span class="mm-kicker"><i class="dot-live"></i>Cohorta #${ong.numar}</span>
          <b>${held} din ${ong.ateliere.length} ${de(ong.ateliere.length)}ateliere</b>
          <span class="mm-progress"><i style="width:${Math.round((held / ong.ateliere.length) * 100)}%"></i></span>
          <span class="mm-sub">${ong.participanti.length} ${de(ong.participanti.length)}participanți · ${esc(ong.locatii.filter((l) => l !== 'TBD')[0] || '')}</span>
          <span class="mm-upcoming">${upcoming.map((a) => `<span><i>${shortDay(a.data)}</i>${esc(a.titlu.replace(/^(Atelier de Seară|COCKTAIL NETWORKING)\s*[-:]\s*/i, ''))}</span>`).join('')}</span>
          <span class="mm-more">Vezi cohorta →</span></a>` : '' },

    { id: 'teme', title: 'Teme', href: '/teme', intro: 'Curriculum-ul: teme care se repetă și se îmbunătățesc de la o cohortă la alta.',
      cols: [
        col('Ateliere full-day', fullDay.map((t, i) => link(`/teme/${t.id}`, `<i class="mm-n">${String(i + 1).padStart(2, '0')}</i>${esc(t.nume)}`, `${themePeople(t)} ${de(themePeople(t))}traineri și antreprenori · ${t.editii.length} ${de(t.editii.length)}cohorte`)).join(''), 'wide'),
        col('Ateliere de seară', `<div class="mm-compact">${evening.map((t) => `<a href="/teme#${t.id}"><span>${esc(t.nume)}</span><b>${t.editii.length}</b></a>`).join('')}</div><p class="mm-note">număr de cohorte în care a existat atelierul</p>`),
      ],
      feature: `<a class="mm-feature" href="/teme#matrice">
          <span class="mm-kicker">Curriculum pe cohorte</span>
          <span class="mm-matrix">${D.teme.map((t) => `<span>${edChrono.map((e) => `<i class="${e.ateliere.some((a) => a.tema === t.id) ? 'on' : ''}"></i>`).join('')}</span>`).join('')}</span>
          <span class="mm-sub">${D.teme.length} ${de(D.teme.length)}teme × ${D.editii.length} ${de(D.editii.length)}cohorte: cele 5 full-day sunt în toate cohortele, cele de seară s-au schimbat</span>
          <span class="mm-more">Vezi matricea →</span></a>` },

    // liderii: antreprenorii invitați în față (fondatori și CEO), apoi trainerii și facilitatorii; companiile din spatele lor dau greutatea
    { id: 'traineri', title: 'Lideri', href: '/lideri', intro: `${TR.length} de fondatori, CEO și traineri care predau din ce au construit. ${F.constanti} dintre ei revin în cel puțin cinci cohorte.`,
      cols: [
        col('Fondatori și CEO invitați', `<div class="mm-people-grid">${TR.filter((x) => x.roluri.includes('antreprenor invitat')).slice(0, 8).map((x) => `<a href="/lideri/${esc(x.p.id)}">${pic(x.p)}<b>${esc(x.p.nume)}</b><span>${esc(x.org)}${x.p.editii.length > 1 ? ` · ${x.p.editii.length} ${de(x.p.editii.length)}cohorte` : ''}</span></a>`).join('')}</div>`, 'wide'),
        col('Cine predă', [
          link('/lideri?rol=antreprenor-invitat#lista', 'Antreprenori invitați', `${nRol('antreprenor invitat')} fondatori și CEO care povestesc cum au rezolvat problema zilei`),
          link('/lideri?rol=trainer#lista', 'Traineri', `${nRol('trainer')} specialiști pentru partea aplicată, dimineața`),
          link('/lideri?rol=facilitator#lista', 'Facilitatori', `${nRol('facilitator')} pentru mastermind, finanțare și board of advisors`),
          `<a class="mm-all" href="/lideri#lista">Toți cei ${TR.length} →</a>`,
        ].join('')),
      ],
      feature: `<a class="mm-feature" href="/lideri?rol=antreprenor-invitat#lista">
          <span class="mm-kicker">Companiile din spatele lor</span>
          <b>${COS.length} de companii</b>
          <span class="mm-cos">${COS.slice(0, 18).map((c) => `<i>${esc(c)}</i>`).join('')}</span>
          <span class="mm-more">Antreprenorii invitați →</span></a>` },

    { id: 'alumni', title: 'Comunitate', href: '/comunitate', body: community(ctx, AL) },

    // parteneri: pentru brandurile care caută un CSR cu impact; aceeași ordine ca pagina (formatul, costul real, brandurile, ce e liber acum)
    { id: 'parteneri', title: 'Parteneri', href: '/parteneri', intro: `CSR cu impact: brandul tău, o zi întreagă cu fondatorii care angajează și investesc în România. ${deN(PD.all.length)} branduri au fost deja alături de noi.`,
      cols: [
        col('Alege formatul', [
          link('/parteneri?format=atelier#construieste', 'Un atelier', 'Sponsor de atelier · o zi'),
          link('/parteneri?format=editie#construieste', 'O cohortă', 'Partener de cohortă · 3 luni'),
          link('/parteneri?format=an#construieste', 'Un an', 'Partener strategic · tot anul'),
          link('/parteneri#cost-real', 'Costul real', 'Din impozitul plătit oricum'),
        ].join(''), 'mm-tiles'),
        col('Alături de noi', `<div class="mm-logos">${PD.all.filter((x) => x.o.logo).slice(0, 6).map((x) => `<a href="/parteneri#${esc(x.o.id)}" title="${esc(x.o.nume)}"><img src="${esc(x.o.logo)}" alt="${esc(x.o.nume)}" loading="lazy"></a>`).join('')}</div>
          <a class="mm-all" href="/parteneri#branduri">Toate cele ${deN(PD.all.length)} branduri →</a>
          ${CONTRIB}`, 'wide mm-hide-m'),
        `<div class="mm-col mm-show-m">${CONTRIB}</div>`, // pe mobil coloana cu logo-urile e ascunsă; cardul rămâne
      ],
      feature: PD.open.length ? `<a class="mm-feature" href="/parteneri#vreau">
          <span class="mm-kicker"><i class="dot-live"></i>Disponibile acum</span>
          <b>${PD.open.length === 1 ? 'Un atelier caută' : `${PD.open.length} ${de(PD.open.length)}ateliere caută`} sponsor</b>
          <span class="mm-upcoming">${PD.open.slice(0, 3).map(({ e, a }) => `<span><i>${a.data ? shortDay(a.data) : edLabel(e)}</i>${esc(a.titlu.replace(/^(Atelier de Seară|COCKTAIL NETWORKING)\s*[-:]\s*/i, ''))}</span>`).join('')}</span>
          <span class="mm-more">Rezervă un atelier →</span></a>` : `<a class="mm-feature" href="/parteneri#vreau">
          <span class="mm-kicker">Vreau și eu</span>
          <b>Un click acum. Antreprenori mai puternici la anul.</b>
          <span class="mm-sub">Propunerea și contractul vin pe email; ne vedem doar dacă vrei.</span>
          <span class="mm-more">Scrie-ne →</span></a>` },

    // despre: încrederea (cine organizează, de când, cine e în spate) și un om de contact pentru fiecare întrebare
    { id: 'despre', title: 'Despre', href: '/despre', intro: `Ce primești, cum funcționează, pentru cine e și cine e în spate. Un program al Fundației Romanian Business Leaders, din ${D.program.de_cand}. ${F.maxNr} de cohorte până acum, cu sprijinul liderilor din comunitatea RBL.`,
      cols: [
        col('Cunoaște-ne', [
          link('/despre#de-ce', 'Ce primești', 'Cinci lucruri, nu doar cursuri'),
          link('/despre#cum', 'Cum funcționează', 'O zi de atelier și formatul cohortei'),
          link('/despre#pentru-cine', 'Ești potrivit?', 'Criteriile și cine a mai participat'),
          link('/despre#investitie', 'Investiția', 'Taxa și ce include o cohortă'),
          link('/despre#istoric', 'Din ' + D.program.de_cand, `${F.maxNr} ${de(F.maxNr)}cohorte până acum`),
          link('/despre#echipa', 'Cine e în spate', `Fundația RBL · ${cifra('membri')} de membri`),
        ].join(''), 'mm-tiles'),
        col('În cifre', `<dl class="mm-figs">${D.program.cifre.filter((c) => c.sursa === '/despre-noi').map((c) => `<div><dt>${esc(c.valoare)}</dt><dd>${esc(c.ce.replace(/ din \d{4}$/, ''))}</dd></div>`).join('')}</dl>`, 'mm-hide-m'),
      ],
      feature: `<div class="mm-feature mm-ct">
          <span class="mm-kicker">Vorbește cu noi</span>
          <b>Un om pentru fiecare întrebare.</b>
          <span class="mm-ct-list">${CONTACT.map(([l, m]) => `<a href="mailto:${esc(m.email)}">${P[m.id] ? pic(P[m.id]) : `<span class="ph">${esc(m.nume.split(' ').map((x) => x[0]).join(''))}</span>`}<i>${l}</i><b>${esc(m.nume)}</b><span>${esc(m.email)}</span></a>`).join('')}</span>
          <a class="mm-more" href="/despre#contact">${esc(D.program.contact.adresa.split(',').slice(0, 2).join(''))} · toate datele →</a></div>` },
  ];
}

function megaMenu(ctx, F) {
  return panels(ctx, F).filter((p) => p.id !== 'program' && (TEME || p.id !== 'teme')).sort((a, b) => (b.id === 'despre') - (a.id === 'despre')).map((p) => `
    <div class="mm-item" data-mm="${p.id}">
      <button class="mm-trigger" type="button" aria-expanded="false" aria-controls="mm-${p.id}">${esc(p.title)}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5"/></svg></button>
      <div class="mm-panel" id="mm-${p.id}" role="region" aria-label="${esc(p.title)}">
        ${p.body || `<div class="wrap mm-in${p.feature ? '' : ' no-aside'}">
          <div class="mm-intro"><a class="mm-title" href="${esc(p.href)}">${esc(p.title)} <span>→</span></a><p>${p.intro}</p></div>
          <div class="mm-cols" style="--cols:${p.cols.reduce((n, c) => n + (c.includes('mm-col wide') ? 2 : 1), 0)}">${p.cols.join('')}</div>
          ${p.feature ? `<div class="mm-aside">${p.feature}</div>` : ''}
        </div>`}
      </div>
    </div>`).join('');
}

module.exports = { megaMenu };
