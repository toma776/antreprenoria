// Meniul principal (mega-meniu): fiecare secțiune a site-ului deschide un panou cu tot ce conține,
// generat din creier. Pe desktop panourile se deschid la hover sau click; pe mobil devin acordeon într-un meniu lateral.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'si').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const today = () => new Date().toISOString().slice(0, 10);
const MONTHS = ['ian.', 'feb.', 'mar.', 'apr.', 'mai', 'iun.', 'iul.', 'aug.', 'sep.', 'oct.', 'nov.', 'dec.'];
const shortDay = (d) => { const [, m, z] = d.split('-').map(Number); return `${z} ${MONTHS[m - 1]}`; };
const edUrl = (e) => (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`);
const edLabel = (e) => (e.serie === 'Cluj' ? `Cluj #${e.numar}` : `#${e.numar}`);
const pic = (p) => (p.imagine ? `<img src="${esc(p.imagine)}" alt="" loading="lazy">` : `<span class="ph">${esc(p.nume.split(' ').map((x) => x[0]).join('').slice(0, 2))}</span>`);

// o legătură din panou: titlu + descriere scurtă
const link = (href, title, desc, extra = '') => `<a class="mm-link" href="${esc(href)}"><b>${title}</b>${desc ? `<span>${desc}</span>` : ''}${extra}</a>`;
const col = (title, body, cls = '') => `<div class="mm-col ${cls}"><h3 class="mm-h">${esc(title)}</h3>${body}</div>`;

function panels(ctx, F) {
  const { D, P, O, T } = ctx;
  const themePeople = (t) => new Set(D.editii.flatMap((e) => e.ateliere.filter((a) => a.tema === t.id).flatMap((a) => a.program.flatMap((x) => x.speakeri.map((s) => s.persoana))))).size;
  const fullDay = D.teme.filter((t) => t.format === 'full-day');
  const evening = D.teme.filter((t) => t.format === 'seară');
  const ong = F.ongoing;
  const held = ong ? ong.ateliere.filter((a) => a.data && a.data < today() && a.data.startsWith(String(ong.an))).length : 0;
  const upcoming = ong ? ong.ateliere.filter((a) => a.data && a.data >= today() && a.data.startsWith(String(ong.an))).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 4) : [];
  const caute = ong ? ong.ateliere.filter((a) => a.cauta_sponsor).length : 0;
  const edChrono = D.editii.slice().sort((a, b) => (a.an - b.an) || (a.sezon === b.sezon ? (a.serie === 'Cluj') - (b.serie === 'Cluj') : a.sezon === 'primăvară' ? -1 : 1));
  const editii = D.editii.slice().sort((a, b) => (b.an - a.an) || (a.sezon === b.sezon ? (a.serie === 'Cluj') - (b.serie === 'Cluj') : a.sezon === 'toamnă' ? -1 : 1));
  const strategic = D.organizatii.filter((o) => o.logo && o.roluri.some((r) => ['partener strategic', 'powered by', 'partener ediție'].includes(r.rol)));
  const team = D.program.contact.echipa;

  return [
    { id: 'program', title: 'Program', href: '/program', intro: 'Ce primești, pentru cine e și cum intri.',
      cols: [
        col('Programul', [
          link('/program#cum', 'Cum funcționează', 'O zi de atelier: training dimineața, antreprenori după-amiaza, networking seara'),
          link('/program#format', 'Formatul unei ediții', 'Ateliere full-day, ateliere de seară, mastermind, petrecerea de final'),
          link('/program#metodologie', 'Metodologia', D.program.metodologie.map((m) => m.titlu.charAt(0) + m.titlu.slice(1).toLowerCase()).slice(0, 3).join(' · ') + ' …'),
        ].join('')),
        col('Înscrierea', [
          link('/program#pentru-cine', 'Pentru cine e', 'Companii de peste 1 mil. € sau 500.000 € cu avantaj inovativ'),
          link('/program#investitie', 'Investiția', 'Taxa de participare și ce include'),
          link('/aplica', 'Aplică', `Lista pentru ediția #${F.maxNr + 1}${F.cluj ? ` sau înscriere la Cluj #${F.cluj.numar}` : ''}`),
        ].join('')),
      ],
      feature: F.next ? `<a class="mm-feature" href="${esc(edUrl(ong))}#agenda">
          <span class="mm-kicker"><i class="dot-live"></i>Următorul atelier · ${shortDay(F.next.data)}</span>
          <b>${esc(F.next.titlu)}</b>
          <span class="mm-people">${F.next.program.flatMap((x) => x.speakeri).map((s) => P[s.persoana]).filter(Boolean).map((p) => `<span class="mm-face">${pic(p)}</span>`).join('')}</span>
          <span class="mm-more">Agenda ediției #${ong.numar} →</span></a>` : '' },

    { id: 'editii', title: 'Ediții', href: '/editii', intro: `Două ediții pe an în București, plus Cluj. Toate rămân în arhivă.`,
      cols: [
        col('Acum', [
          ong ? link(edUrl(ong), `Antreprenoria #${ong.numar}`, `${esc(ong.perioada)} · ${held} din ${ong.ateliere.length} ateliere ținute`, `<em class="mm-badge live">în desfășurare</em>`) : '',
          F.cluj ? link(edUrl(F.cluj), `Antreprenoria Cluj #${F.cluj.numar}`, `${esc(F.cluj.perioada)} · ${F.cluj.ateliere.length} ateliere`, `<em class="mm-badge open">înscrieri deschise</em>`) : '',
          link('/aplica', `Antreprenoria #${F.maxNr + 1}`, 'Următoarea ediție din București', '<em class="mm-badge">listă de așteptare</em>'),
        ].join('')),
        col('Arhiva', `<div class="mm-editions">${editii.filter((e) => !e.deschisa).map((e) => `<a href="${esc(edUrl(e))}"><b>${esc(edLabel(e))}</b><span>${esc(e.sezon)} ${e.an}</span><small>${e.participanti.length} participanți</small></a>`).join('')}</div>
          <a class="mm-all" href="/editii">Toată arhiva, cu agendele și participanții →</a>`, 'wide'),
      ],
      feature: ong ? `<a class="mm-feature" href="${esc(edUrl(ong))}">
          <span class="mm-kicker"><i class="dot-live"></i>Ediția #${ong.numar}</span>
          <b>${held} din ${ong.ateliere.length} ateliere</b>
          <span class="mm-progress"><i style="width:${Math.round((held / ong.ateliere.length) * 100)}%"></i></span>
          <span class="mm-sub">${ong.participanti.length} participanți · ${esc(ong.locatii.filter((l) => l !== 'TBD')[0] || '')}</span>
          <span class="mm-upcoming">${upcoming.map((a) => `<span><i>${shortDay(a.data)}</i>${esc(a.titlu.replace(/^(Atelier de Seară|COCKTAIL NETWORKING)\s*[-:]\s*/i, ''))}</span>`).join('')}</span>
          <span class="mm-more">Vezi ediția →</span></a>` : '' },

    { id: 'teme', title: 'Teme', href: '/teme', intro: 'Curriculum-ul: teme care se repetă și se îmbunătățesc de la o ediție la alta.',
      cols: [
        col('Ateliere full-day', fullDay.map((t, i) => link(`/teme/${t.id}`, `<i class="mm-n">${String(i + 1).padStart(2, '0')}</i>${esc(t.nume)}`, `${themePeople(t)} traineri și antreprenori · ${t.editii.length} ediții`)).join(''), 'wide'),
        col('Ateliere de seară', `<div class="mm-compact">${evening.map((t) => `<a href="/teme#${t.id}"><span>${esc(t.nume)}</span><b>${t.editii.length}</b></a>`).join('')}</div><p class="mm-note">număr de ediții în care a existat atelierul</p>`),
      ],
      feature: `<a class="mm-feature" href="/teme#matrice">
          <span class="mm-kicker">Curriculum pe ediții</span>
          <span class="mm-matrix">${D.teme.map((t) => `<span>${edChrono.map((e) => `<i class="${e.ateliere.some((a) => a.tema === t.id) ? 'on' : ''}"></i>`).join('')}</span>`).join('')}</span>
          <span class="mm-sub">${D.teme.length} teme × ${D.editii.length} ediții: cele 5 full-day sunt în toate edițiile, cele de seară s-au schimbat</span>
          <span class="mm-more">Vezi matricea →</span></a>` },

    { id: 'traineri', title: 'Traineri', href: '/traineri', intro: `${F.speakers} traineri și antreprenori invitați; ${F.constanti} revin în cel puțin cinci ediții.`,
      cols: [
        col('Cei mai prezenți', `<div class="mm-people-grid">${F.topTrainers.map((p) => `<a href="/traineri/${esc(p.id)}">${pic(p)}<b>${esc(p.nume)}</b><span>${esc(O[p.organizatii[0]]?.nume || p.functii[0] || '')} · ${p.editii.length} ediții</span></a>`).join('')}</div>`, 'wide'),
        col('După rol', [
          link('/traineri?rol=trainer', 'Traineri', `${D.oameni.filter((p) => p.tipuri.includes('trainer')).length} oameni care țin training-ul de dimineață`),
          link('/traineri?rol=antreprenor-invitat', 'Antreprenori invitați', `${D.oameni.filter((p) => p.tipuri.includes('antreprenor invitat')).length} antreprenori care își spun povestea`),
          link('/traineri?rol=facilitator', 'Facilitatori de seară', 'Mastermind, finanțare, board of advisors'),
          `<a class="mm-all" href="/traineri">Toți cei ${F.speakers} →</a>`,
        ].join('')),
      ] },

    { id: 'alumni', title: 'Alumni', href: '/alumni', intro: `${F.alumni} de companii în ultimele ${D.editii.filter((e) => e.participanti.length).length} ediții, din ${F.sectors.length} sectoare.`,
      cols: [
        col('Pe sectoare', `<div class="mm-sectors">${F.sectors.map(([s, n]) => `<a href="/alumni?sector=${esc(slug(s))}"><span>${esc(s)}</span><b>${n}</b></a>`).join('')}</div>`, 'wide'),
        col('Comunitatea', [
          link('/alumni/din-alumni-parteneri', 'Din alumni, parteneri', `${F.ciclu.length} companii revenite ca sponsori, gazde sau cu speakeri`),
          link('/alumni#cifre', 'Cine participă, în cifre', 'Mediane și intervale, fără date individuale'),
          link('/alumni', 'Directorul alumni', 'Filtrabil după sector și ediție'),
        ].join('')),
      ],
      feature: `<a class="mm-feature" href="/alumni#cifre">
          <span class="mm-kicker">Participantul tipic</span>
          <b>${(F.medianCa / 1e6).toLocaleString('ro-RO', { maximumFractionDigits: 1 })} mil. lei</b>
          <span class="mm-sub">cifra de afaceri mediană · ${F.medianAng} angajați la mediană</span>
          <span class="mm-more">Toate cifrele →</span></a>` },

    { id: 'parteneri', title: 'Parteneri', href: '/parteneri', intro: 'Companiile care fac posibil programul și cum li te poți alătura.',
      cols: [
        col('Parteneri', `<div class="mm-logos">${strategic.slice(0, 6).map((o) => `<a href="/parteneri#${esc(o.id)}" title="${esc(o.nume)}"><img src="${esc(o.logo)}" alt="${esc(o.nume)}" loading="lazy"></a>`).join('')}</div>
          <a class="mm-all" href="/parteneri">Toți partenerii și sponsorii →</a>`, 'wide'),
        col('Implică-te', [
          link('/parteneri/sponsorizare', 'Sponsorizează un atelier', caute ? `${caute === 1 ? 'Un atelier' : `${caute} ateliere`} din ediția #${ong.numar} ${caute === 1 ? 'caută' : 'caută'} încă sponsor` : 'Vizibilitate în fața antreprenorilor selectați'),
          link('/parteneri/gazda', 'Găzduiește o ediție', 'Atelierele s-au ținut la DWF și Zitec'),
          link('/parteneri/mentor', 'Devino trainer sau mentor', 'Pro-bono, din comunitatea RBL'),
        ].join('')),
      ],
      feature: `<a class="mm-feature" href="/alumni/din-alumni-parteneri">
          <span class="mm-kicker">Din alumni, parteneri</span>
          <b>Vii ca participant. Revii ca partener.</b>
          <span class="mm-sub">${F.ciclu.map((o) => esc(o.nume)).join(', ')}</span>
          <span class="mm-more">Poveștile lor →</span></a>` },

    { id: 'despre', title: 'Despre', href: '/despre', intro: `Un program al Fundației Romanian Business Leaders, din ${D.program.de_cand}.`,
      cols: [
        col('Despre noi', [
          link('/despre', 'Despre Antreprenoria', 'Cresc antreprenorii, crește România!'),
          link('/despre#rbl', 'Fundația Romanian Business Leaders', 'Organizatorul, cu o comunitate de peste 600 de membri'),
          link('/despre#istoric', 'Istoricul programului', `Din ${D.program.de_cand} până la ediția #${F.maxNr}`),
        ].join('')),
        col('Echipa', `<div class="mm-team">${team.map((m) => `<a href="/despre#${esc(m.id)}">${P[m.id] ? pic(P[m.id]) : ''}<b>${esc(m.nume)}</b><span>${esc(m.rol.split(' · ')[0].replace(/\s*\(.*\)$/, ''))}</span></a>`).join('')}</div>`),
        col('Contact', [
          link('/despre#contact', 'Scrie-ne', 'Întrebări despre program sau parteneriate'),
          link('/despre#contact', 'Calea Dorobanți 42', 'Sector 1, București'),
        ].join('')),
      ] },
  ];
}

function megaMenu(ctx, F) {
  return panels(ctx, F).map((p) => `
    <div class="mm-item" data-mm="${p.id}">
      <button class="mm-trigger" type="button" aria-expanded="false" aria-controls="mm-${p.id}">${esc(p.title)}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5"/></svg></button>
      <div class="mm-panel" id="mm-${p.id}" role="region" aria-label="${esc(p.title)}">
        <div class="wrap mm-in${p.feature ? '' : ' no-aside'}">
          <div class="mm-intro"><a class="mm-title" href="${esc(p.href)}">${esc(p.title)} <span>→</span></a><p>${p.intro}</p></div>
          <div class="mm-cols" style="--cols:${p.cols.reduce((n, c) => n + (c.includes('mm-col wide') ? 2 : 1), 0)}">${p.cols.join('')}</div>
          ${p.feature ? `<div class="mm-aside">${p.feature}</div>` : ''}
        </div>
      </div>
    </div>`).join('');
}

module.exports = { megaMenu };
