// Pagina /despre: programul, istoricul, organizatorul (RBL), echipa și contactul, într-o singură pagină cu secțiuni.
// Cifrele mari sunt cele declarate pe site-ul vechi (/despre-noi); arhiva detaliată începe cu ediția #16.
const { esc, initials } = require('./util');

const plural = (n, one, many) => `${n} ${n === 1 ? one : (n % 100 === 0 || n % 100 >= 20 ? 'de ' : '') + many}`;
const edUrl = (e) => (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`);
const sentence = (s) => { s = String(s || '').trim(); return s.charAt(0).toUpperCase() + s.slice(1); };
const SOCIAL = {
  Facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.87.25-1.46 1.5-1.46h1.55V4.47A20 20 0 0 0 14.3 4.3c-2.2 0-3.7 1.34-3.7 3.8v2.4H8.1v3h2.5V21z"/></svg>',
  LinkedIn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.06c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.77 2.65 4.77 6.1V21h-4v-5.1c0-1.22-.02-2.79-1.7-2.79-1.7 0-1.96 1.33-1.96 2.7V21h-4z"/></svg>',
  YouTube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.3 5 12 5 12 5s-6.3 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.7 19 12 19 12 19s6.3 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3z"/></svg>',
};

function despreBody(ctx, F) {
  const { D, P, O } = ctx;
  const prog = D.program;
  const cifre = prog.cifre.filter((c) => c.sursa === '/despre-noi');
  const rblLogo = (prog.logouri || []).find((l) => l.id === 'rbl-logo-oficial');
  const arhiva = D.editii.filter((e) => e.serie === 'București').sort((a, b) => a.numar - b.numar);
  const first = arhiva[0];
  const speakers = D.oameni.filter((p) => p.aparitii.length).length;
  const NAV = [['program', 'Programul'], ['istoric', 'Istoricul'], ['rbl', 'Organizatorul'], ['echipa', 'Echipa'], ['contact', 'Contact']];
  // alumni menționați pe site-ul vechi; unde îi avem în creier, cu logo
  const byName = new Map(D.organizatii.map((o) => [o.nume.toLowerCase(), o]));
  const alumni = prog.alumni_mentionati.map((n) => ({ n, o: byName.get(n.toLowerCase()) || D.organizatii.find((o) => o.nume.toLowerCase().startsWith(n.toLowerCase())) }));
  const roleShort = (r) => r.split(' · ')[0].replace(/\s*\(.*\)$/, '');

  return `<main>
  <section class="hero pg-hero ab-hero"><div class="wrap">
    <nav class="crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><b>Despre</b></nav>
    <div class="hero-split">
      <div class="hero-copy">
        <p class="eyebrow">Despre Antreprenoria · din ${prog.de_cand}</p>
        <h1>Cresc antreprenorii, crește România.</h1>
        <p class="lead">${esc(sentence(prog.descriere || '').replace(/\s*–\s*/g, ': '))}</p>
      </div>
      <aside class="pg-glance ab-figs" aria-label="În cifre">
        <div class="ed-live-top"><span>În cifre</span><span>declarate de RBL</span></div>
        <dl>${cifre.map((c) => `<div><dt>${esc(c.valoare)}</dt><dd>${esc(c.ce)}</dd></div>`).join('')}
          <div><dt>${F.maxNr} ediții</dt><dd>în București din ${prog.de_cand}, plus Cluj din ${F.cluj ? F.cluj.an : ''}</dd></div></dl>
      </aside>
    </div>
  </div>
  <nav class="pg-nav" aria-label="Secțiunile paginii"><div class="wrap">${NAV.map(([id, t], i) => `<a href="#${id}"><i>0${i + 1}</i>${t}</a>`).join('')}</div></nav>
  </section>

  <section class="sec" id="program"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Programul</p><h2>Cel mai longeviv program educațional al RBL.</h2>
      <p class="lead">${esc(sentence(prog.audienta ? 'Se adresează companiilor cu ' + prog.audienta.replace(/^companii cu /i, '') : ''))}</p></div>
      <a class="link-arrow" href="/program">Cum funcționează →</a></div>
    <div class="ab-grid">
      ${prog.ce_obtii.map((x, i) => `<div class="ab-card"><span class="step-n">0${i + 1}</span><p>${esc(x)}</p></div>`).join('')}
      <div class="ab-card ab-alumni"><h3 class="who-h">Companii care au crescut și cu ajutorul programului</h3>
        <div class="ab-logos">${alumni.map(({ n, o }) => (o?.logo ? `<span title="${esc(n)}"><img src="${esc(o.logo)}" alt="${esc(n)}" loading="lazy"></span>` : `<span><b>${esc(n)}</b></span>`)).join('')}</div>
        <p class="fine-muted">Câteva dintre cele peste 550 de companii, așa cum le menționează programul.</p></div>
    </div>
  </div></section>

  <section class="sec sec-alt" id="istoric"><div class="wrap">
    <div class="sec-head row"><div><p class="eyebrow">Istoricul</p><h2>Din ${prog.de_cand} până la ediția #${F.maxNr}.</h2>
      <p class="lead">Două ediții pe an în București${F.cluj ? `, iar din ${F.cluj.an} și la Cluj` : ''}. Arhiva detaliată, cu agendele și participanții, începe cu ediția #${first.numar}.</p></div>
      <a class="link-arrow" href="/editii">Toate edițiile →</a></div>
    <div class="hist">
      <div class="hist-start"><b>${prog.de_cand}</b><span>Prima ediție</span><small>edițiile #1–#${first.numar - 1}, înainte de arhiva de pe site</small></div>
      ${arhiva.map((e) => `<a class="hist-ed ${F.ongoing && e.id === F.ongoing.id ? 'live' : ''}" href="${edUrl(e)}"><b>#${e.numar}</b><span>${esc(e.sezon)} ${e.an}</span><small>${F.ongoing && e.id === F.ongoing.id ? 'în desfășurare' : plural(e.participanti.length, 'participant', 'participanți')}</small></a>`).join('')}
      ${F.cluj ? `<a class="hist-ed cluj" href="${edUrl(F.cluj)}"><b>Cluj #${F.cluj.numar}</b><span>${esc(F.cluj.sezon)} ${F.cluj.an}</span><small>înscrieri deschise</small></a>` : ''}
      <a class="hist-ed next" href="/aplica"><b>#${F.maxNr + 1}</b><span>următoarea</span><small>listă de așteptare</small></a>
    </div>
    <div class="ab-stats">
      <div><b>${F.participanti}</b><span>antreprenori și manageri în edițiile #${first.numar}–#${F.maxNr}</span></div>
      <div><b>${speakers}</b><span>traineri și antreprenori invitați</span></div>
      <div><b>${F.ateliere}</b><span>ateliere în arhivă</span></div>
      <div><b>${F.ciclu.length}</b><span>companii alumni revenite ca parteneri</span></div>
    </div>
  </div></section>

  <section class="sec sec-dark" id="rbl"><div class="wrap ab-rbl">
    <div>
      <p class="eyebrow">Organizatorul</p>
      <h2>${esc(prog.organizator.nume)}</h2>
      ${prog.organizator.descriere.split(/(?<=\.)\s+/).reduce((acc, s, i) => { const k = Math.floor(i / 2); (acc[k] = acc[k] || []).push(s); return acc; }, []).map((g) => `<p>${esc(g.join(' '))}</p>`).join('')}
      <a class="btn btn-light btn-lg" href="${esc(prog.organizator.url)}" target="_blank" rel="noopener">rbls.ro ↗</a>
    </div>
    <div class="ab-rbl-side">
      ${rblLogo ? `<div class="ab-rbl-logo"><img src="${esc(rblLogo.fisier)}" alt="Romanian Business Leaders"></div>` : ''}
      <dl>${cifre.filter((c) => /RBL|pro-bono/.test(c.ce)).map((c) => `<div><dt>${esc(c.valoare)}</dt><dd>${esc(c.ce)}</dd></div>`).join('')}</dl>
    </div>
  </div></section>

  <section class="sec" id="echipa"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Echipa</p><h2>Oamenii din spatele programului.</h2></div>
    <div class="team">${prog.contact.echipa.map((m) => { const p = P[m.id];
      return `<div class="team-card" id="${esc(m.id)}">${p?.imagine ? `<img src="${esc(p.imagine)}" alt="" loading="lazy">` : `<span class="ph">${esc(initials(m.nume))}</span>`}
        <b>${esc(m.nume)}</b><span>${esc(roleShort(m.rol))}</span>
        ${m.email ? `<a href="mailto:${esc(m.email)}">${esc(m.email)}</a>` : ''}${m.telefon ? `<a href="tel:${esc(m.telefon.replace(/\D/g, ''))}">${esc(m.telefon)}</a>` : ''}</div>`; }).join('')}</div>
  </div></section>

  <section class="cta-band" id="contact"><div class="wrap cta-band-in">
    <div class="cta-band-copy">
      <p class="eyebrow">Contact</p>
      <h2>Scrie-ne sau treci pe la noi.</h2>
      <p>${esc(prog.contact.adresa)}</p>
      <div class="ab-social">${prog.social.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(s.retea)}">${SOCIAL[s.retea] || ''}<span>${esc(s.retea)}</span></a>`).join('')}</div>
    </div>
    <div class="ab-contacts">${prog.contact.echipa.filter((m) => m.email).slice(0, 3).map((m) => `<a class="ask-card" href="mailto:${esc(m.email)}"><span class="ask-kicker">${esc(roleShort(m.rol))}</span><b>${esc(m.nume)}</b><span>${esc(m.email)}</span></a>`).join('')}</div>
  </div></section>
</main>`;
}

module.exports = { despreBody };
