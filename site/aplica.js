// Pagina /aplica: aplicarea în 7 pași, precedată de criteriile de selecție.
// Pasul 1 (contact) se salvează imediat, ca echipa să poată trimite remindere celor care nu termină; restul se completează pe parcurs.
// Întrebările de mai jos (STEPS) sunt aceleași în pagină, pe server (validare) și în panou (etichetele din Leads).
const { esc } = require('./util');
const { tx } = require('./texte');

const edUrl = (e) => (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`);

// k = câmpul; t = tipul (text, email, tel, cui, one, many, area, editie, consent); req = obligatoriu
const STEPS = [
  { id: 'contact', titlu: 'Să ne cunoaștem', sub: 'Datele de contact, ca să știm cui îi răspundem.', nota: 'Salvăm aplicarea pe măsură ce avansezi. Dacă te întrerupi, o poți relua de unde ai rămas.', fields: [
    { k: 'nume', t: 'text', label: 'Nume și prenume', req: true, auto: 'name' },
    { k: 'companie', t: 'text', label: 'Compania', req: true, auto: 'organization', hint: 'Numele firmei pe care vrei s-o scalezi.' },
    { k: 'email', t: 'email', label: 'Email', req: true, auto: 'email' },
    { k: 'telefon', t: 'tel', label: 'Telefon', req: true, auto: 'tel' },
    { k: 'acord', t: 'consent', req: true },
  ] },
  { id: 'compania', titlu: 'Compania', sub: 'Modelul de business nu contează. Vrem doar să înțelegem de unde pornești.', fields: [
    { k: 'cui', t: 'cui', label: 'Codul unic de înregistrare (CUI)', req: true, ph: 'ex. RO12345678', hint: 'Îl folosim doar ca să verificăm datele publice ale firmei.' },
    { k: 'industrie', t: 'one', ui: 'chips', label: 'Domeniul principal', req: true, opts: [['productie', 'Producție'], ['comert', 'Comerț și distribuție'], ['servicii-b2b', 'Servicii B2B'], ['tech', 'Tehnologie și IT'], ['constructii', 'Construcții și imobiliare'], ['horeca', 'HoReCa și turism'], ['sanatate', 'Sănătate'], ['agro', 'Agricultură și alimentar'], ['retail', 'Retail și e-commerce'], ['altul', 'Alt domeniu']] },
    { k: 'vechime', t: 'one', ui: 'seg', label: 'De câți ani există compania?', req: true, opts: [['sub-3', 'Sub 3 ani'], ['3-5', '3–5 ani'], ['5-10', '5–10 ani'], ['peste-10', 'Peste 10 ani']] },
    { k: 'rol', t: 'one', ui: 'seg', label: 'Rolul tău în companie', req: true, opts: [['fondator', 'Fondator / CEO'], ['asociat', 'Asociat'], ['director', 'Director general'], ['alt-rol', 'Alt rol de conducere']] },
  ] },
  { id: 'cifre', titlu: 'Cifrele', sub: 'Unde e compania azi și cât de repede a crescut până aici.', nota: 'Cifrele rămân confidențiale. Le vede doar comitetul de selecție.', fields: [
    { k: 'cifra_afaceri', t: 'one', ui: 'seg3', label: 'Cifra de afaceri pe ultimul an', req: true, opts: [['sub-500k', 'Sub 500.000 €'], ['500k-1m', '0,5 – 1 mil. €'], ['1m-3m', '1 – 3 mil. €'], ['3m-10m', '3 – 10 mil. €'], ['10m-25m', '10 – 25 mil. €'], ['peste-25m', 'Peste 25 mil. €']],
      warn: { sub500k: 'Programul e gândit pentru companii de la 500.000 € în sus. Poți continua: dacă ești foarte aproape de prag și ai o creștere puternică, comitetul ia în calcul și asta.' } },
    { k: 'crestere', t: 'one', ui: 'seg', label: 'Cum a evoluat cifra de afaceri în ultimii 2 ani?', req: true, opts: [['scadere', 'A scăzut'], ['stabila', 'Stabilă'], ['10-30', 'Creștere 10–30%'], ['30-50', 'Creștere 30–50%'], ['peste-50', 'Peste 50%']] },
    { k: 'angajati', t: 'one', ui: 'seg', label: 'Câți oameni lucrează în companie?', req: true, opts: [['1-9', '1–9'], ['10-49', '10–49'], ['50-99', '50–99'], ['100-249', '100–249'], ['250+', '250+']] },
    { k: 'profit', t: 'one', ui: 'seg3', label: 'Compania e profitabilă?', req: true, opts: [['da', 'Da'], ['zero', 'Pe zero'], ['nu', 'Încă nu']] },
  ] },
  { id: 'echipa', titlu: 'Echipa', sub: 'Scalarea depinde de oamenii din jurul tău, nu doar de tine.', fields: [
    { k: 'echipa', t: 'one', ui: 'cards', label: 'Ai o echipă de management?', req: true, opts: [['completa', 'Da, completă', 'Oameni-cheie care conduc fiecare arie importantă.'], ['partiala', 'Parțial', 'Unul-doi oameni de încredere, restul trece pe la mine.'], ['nu', 'Nu încă', 'Decid aproape totul eu.']] },
    { k: 'absenta', t: 'one', ui: 'cards', label: 'Dacă lipsești o lună, compania…', req: true, opts: [['merge', 'Merge mai departe', 'Fără mine, la fel de bine.'], ['incetineste', 'Merge, dar încetinește', 'Deciziile importante așteaptă după mine.'], ['se-opreste', 'Se oprește', 'Aproape totul trece pe la mine.']] },
    { k: 'timp', t: 'one', ui: 'seg3', label: 'Unde îți petreci cea mai mare parte din timp?', req: true, opts: [['operational', 'În operațional'], ['jumatate', 'Jumătate-jumătate'], ['strategic', 'Pe strategie și creștere']] },
  ] },
  { id: 'ambitie', titlu: 'Ambiția', sub: 'Partea cea mai importantă pentru noi. Fii cât de concret poți.', fields: [
    { k: 'tinta', t: 'one', ui: 'seg', label: 'În 3 ani, unde vrei să fie cifra de afaceri?', req: true, opts: [['x1.5', 'Cu 50% mai mare'], ['x2', 'Dublă'], ['x3-5', 'De 3–5 ori mai mare'], ['x5+', 'De peste 5 ori mai mare']] },
    { k: 'directii', t: 'many', ui: 'chips', max: 3, label: 'Pe unde crești?', hint: 'Alege până la 3.', req: true, opts: [['externe', 'Piețe externe'], ['produse', 'Produse sau servicii noi'], ['regiuni', 'Alte regiuni din țară'], ['clienti', 'Clienți mai mari'], ['achizitii', 'Achiziții'], ['investitori', 'Investitori sau finanțare'], ['francize', 'Francize sau parteneriate'], ['eficienta', 'Eficiență și automatizare']] },
    { k: 'ambitie', t: 'area', label: 'Unde vrei să duci compania?', ph: 'ex. Să devenim cel mai mare distribuitor din regiune și să intrăm în Ungaria și Bulgaria până în 2028, cu o echipă de management care conduce fără mine.', hint: '2–3 fraze despre ce vrei să construiești.' },
  ] },
  { id: 'drum', titlu: 'Drumul până acolo', sub: 'Ce stă azi între compania ta și ambiția ta.', fields: [
    { k: 'blocaje', t: 'many', ui: 'chips', max: 3, label: 'Ce te oprește acum cel mai mult?', hint: 'Alege până la 3.', req: true, opts: [['oameni', 'Oamenii potriviți'], ['management', 'Echipa de management'], ['procese', 'Procese și sisteme'], ['vanzari', 'Vânzări și marketing'], ['finantare', 'Finanțarea'], ['timp', 'Timpul meu: sunt prins în operațional'], ['strategie', 'O strategie clară'], ['cultura', 'Cultura organizațională']] },
    { k: 'schimbare', t: 'area', label: 'Ce vrei să fie diferit în companie după cele 3 luni de program?', ph: 'ex. Să am un plan de creștere pe 3 ani asumat de echipă și doi directori care preiau vânzările și operațiunile.' },
    { k: 'angajament', t: 'one', ui: 'cards', label: 'Poți fi prezent la toate atelierele, timp de 3 luni?', req: true, opts: [['da', 'Da, îmi blochez zilele de acum', 'Atelierele full-day și serile de networking.'], ['probabil', 'Cel mai probabil', 'Pot lipsi cel mult o dată.'], ['nesigur', 'Nu sunt sigur încă', 'Depinde de perioadă.']] },
  ] },
  { id: 'final', titlu: 'Ultimul pas', sub: 'Alege cohorta și verifică-ți răspunsurile înainte să trimiți.', fields: [
    { k: 'editie', t: 'editie', label: 'Cohorta', req: true },
    { k: 'sursa', t: 'one', ui: 'chips', label: 'Cum ai aflat de Antreprenoria?', opts: [['Recomandare de la un alumni', 'Recomandare de la un alumni'], ['LinkedIn', 'LinkedIn'], ['Facebook', 'Facebook'], ['Google', 'Google'], ['Comunitatea RBL', 'Comunitatea RBL'], ['Altceva', 'Altceva']] },
    { k: 'sursa_alta', t: 'text', label: 'Unde?', showIf: ['sursa', 'Altceva'] },
  ] },
];
const FIELDS = STEPS.flatMap((s, i) => s.fields.map((f) => ({ ...f, pas: i + 1 })));
const COLS = ['nume', 'email', 'telefon', 'companie', 'cui', 'cifra_afaceri', 'editie', 'sursa', 'sursa_alta']; // restul merge în „raspunsuri”

// CUI românesc: cifră de control cu cheia 753217532 (acceptă și prefixul RO)
function validCUI(v) {
  const c = String(v || '').toUpperCase().replace(/\s+/g, '').replace(/^RO/, '');
  if (!/^\d{2,10}$/.test(c)) return false;
  const body = c.slice(0, -1).padStart(9, '0'), key = '753217532';
  let s = 0;
  for (let i = 0; i < 9; i++) s += Number(body[i]) * Number(key[i]);
  let r = (s * 10) % 11;
  if (r === 10) r = 0;
  return r === Number(c.slice(-1));
}

// cohortele la care se poate aplica: cele cu înscrieri deschise (încă neîncepute) și lista de așteptare pentru următoarea din București
function options(ctx, F) {
  const { D } = ctx;
  const t0 = new Date().toISOString().slice(0, 10);
  const open = D.editii.filter((e) => e.deschisa && !e.ateliere.some((a) => a.data && a.data < t0 && a.data.startsWith(String(e.an))))
    .map((e) => { const p = e.preturi.find((x) => !x.ascuns); return { id: e.id, title: `${e.serie === 'Cluj' ? 'Cluj' : 'București'} #${e.numar}`, tag: 'Înscrieri deschise', sub: `${e.perioada}${p ? ' · ' + p.pret_text.replace(/(\d)(\d{3})\b/, '$1.$2') : ''}`, href: edUrl(e) }; });
  const next = { id: `bucuresti-${F.maxNr + 1}`, title: `București #${F.maxNr + 1}`, tag: 'Listă de așteptare', sub: 'Următoarea cohortă; te anunțăm primii când se deschid înscrierile', href: null };
  return [...open, next];
}

// regula unui câmp (aceeași în browser, în assets/aplica.js); întoarce mesajul de eroare sau ''
function fieldError(f, d, ids) {
  const v = d[f.k];
  if (f.showIf && d[f.showIf[0]] !== f.showIf[1]) return '';
  const empty = Array.isArray(v) ? !v.length : f.t === 'consent' ? !v : !String(v ?? '').trim();
  if (empty) return f.req ? ({ consent: 'Avem nevoie de acordul tău ca să putem evalua aplicarea.', one: 'Alege o variantă.', many: 'Alege cel puțin o variantă.', editie: 'Alege cohorta.' }[f.t] || { nume: 'Scrie numele și prenumele.', companie: 'Scrie numele companiei.', email: 'Scrie adresa de email.', telefon: 'Scrie numărul de telefon.', cui: 'Scrie CUI-ul companiei.' }[f.k] || 'Scrie câteva fraze.') : '';
  if (f.k === 'nume' && String(v).split(/\s+/).filter(Boolean).length < 2) return 'Scrie numele și prenumele.';
  if (f.t === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Adresa de email nu pare corectă.';
  if (f.t === 'tel' && String(v).replace(/\D/g, '').length < 9) return 'Numărul de telefon pare prea scurt.';
  if (f.t === 'cui' && !validCUI(v)) return 'CUI-ul nu e valid. Verifică cifrele (cu sau fără RO).';
  if (f.t === 'one' && !f.opts.some(([k]) => k === v)) return 'Alege o variantă.';
  if (f.t === 'many' && v.some((x) => !f.opts.some(([k]) => k === x))) return 'Alege dintre variantele de mai sus.';
  if (f.t === 'many' && v.length > f.max) return `Alege cel mult ${f.max}.`;
  if (f.t === 'area' && String(v).trim().length < f.min) return `Mai scrie puțin (măcar ${f.min} de caractere).`;
  if (f.t === 'editie' && !ids.includes(v)) return 'Alege cohorta.';
  return '';
}

// validarea pașilor 1..pas; întoarce { ok, errors, data }
function validate(input, ids, pas = STEPS.length) {
  const data = {};
  FIELDS.forEach((f) => {
    const v = input?.[f.k];
    data[f.k] = f.t === 'many' ? (Array.isArray(v) ? v.map(String).slice(0, 12) : []) : f.t === 'consent' ? v === true || v === 'on' : String(v ?? '').trim().slice(0, f.t === 'area' ? 2000 : 200);
  });
  data.email = data.email.toLowerCase();
  data.cui = data.cui.toUpperCase().replace(/\s+/g, '');
  const errors = {};
  FIELDS.filter((f) => f.pas <= pas).forEach((f) => { const m = fieldError(f, data, ids); if (m) errors[f.k] = m; });
  return { ok: !Object.keys(errors).length, errors, data };
}

// rândul pentru Supabase: coloanele cunoscute + celelalte răspunsuri
function record(d, { token, pas, finalizata, pagina }) {
  const rec = { token: token || null, pas, finalizata, sursa_pagina: pagina || null, raspunsuri: {} };
  COLS.forEach((k) => { rec[k] = d[k] || null; });
  if (rec.sursa !== 'Altceva') rec.sursa_alta = null;
  FIELDS.forEach((f) => { if (!COLS.includes(f.k) && f.t !== 'consent' && (Array.isArray(d[f.k]) ? d[f.k].length : d[f.k])) rec.raspunsuri[f.k] = d[f.k]; });
  return rec;
}

// ---------- pagina ----------
const ARROW = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-4.5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const BACK = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 10H5m4.5-5-5 5 5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function fieldHtml(f, D, opts, pre) {
  // eroarea fiecărui câmp e legată de el (aria-describedby); anunțul de ansamblu îl face #af-status
  const id = `f-${f.k}`, err = `<small class="af-err" id="e-${f.k}"></small>`;
  const desc = ` aria-describedby="${f.hint ? `h-${f.k} ` : ''}e-${f.k}"`, req = f.req ? ' aria-required="true"' : '';
  const hint = f.hint ? `<small class="af-hint" id="h-${f.k}">${esc(f.hint)}</small>` : '';
  const show = f.showIf ? ` data-show="${esc(f.showIf.join('='))}" hidden` : '';
  if (['text', 'email', 'tel', 'cui'].includes(f.t)) {
    const attrs = { text: `type="text"${f.auto === 'name' ? ' autocapitalize="words"' : ''}`, email: 'type="email" inputmode="email" autocapitalize="off" spellcheck="false"', tel: 'type="tel" inputmode="tel"', cui: 'type="text" autocapitalize="characters" spellcheck="false"' }[f.t];
    return `<div class="af-field" data-f="${f.k}"${show}><label for="${id}">${esc(f.label)}</label>
      <input id="${id}" name="${f.k}" ${attrs}${f.auto ? ` autocomplete="${f.auto}"` : ''}${f.ph ? ` placeholder="${esc(f.ph)}"` : ''}${desc}${req} maxlength="200">${hint}${err}</div>`;
  }
  if (f.t === 'area') {
    return `<div class="af-field" data-f="${f.k}"><label for="${id}">${esc(f.label)}${f.req ? '' : ' <span class="af-opt">opțional</span>'}</label>
      <textarea id="${id}" name="${f.k}" rows="4" maxlength="2000"${f.min ? ` data-min="${f.min}"` : ''} placeholder="${esc(f.ph || '')}"${desc}${req}></textarea>
      <div class="ax-meta">${hint}${f.min ? `<small class="ax-count" data-for="${f.k}" aria-hidden="true"></small>` : ''}</div>${err}</div>`;
  }
  if (f.t === 'one' || f.t === 'many') {
    const type = f.t === 'one' ? 'radio' : 'checkbox';
    const cls = { chips: 'af-chips', seg: 'ax-seg', seg3: 'ax-seg ax-seg3', cards: 'ax-cards' }[f.ui];
    const warn = f.warn ? `<small class="af-note" data-warn="${f.k}" hidden>${esc(f.warn.sub500k)}</small>` : '';
    return `<div class="af-field" data-f="${f.k}"${show}><span class="af-label" id="l-${f.k}">${esc(f.label)}${f.req ? '' : ' <span class="af-opt">opțional</span>'}</span>${f.hint ? `<small class="af-hint ax-hint-top">${esc(f.hint)}</small>` : ''}
      <div class="${cls}" role="${f.t === 'one' ? 'radiogroup' : 'group'}" aria-labelledby="l-${f.k}"${desc}${f.t === 'one' ? req : ''}${f.max ? ` data-max="${f.max}"` : ''}>${f.opts.map(([k, l, d]) => `<label><input type="${type}" name="${f.k}" value="${esc(k)}"><span>${f.ui === 'cards' ? `<b>${esc(l)}</b><small>${esc(d)}</small>` : esc(l)}</span></label>`).join('')}</div>${warn}${err}</div>`;
  }
  if (f.t === 'editie') {
    return `<div class="af-field" data-f="editie"><span class="af-label" id="l-editie">${esc(f.label)}</span><div class="af-eds" role="radiogroup" aria-labelledby="l-editie"${desc}${req}>${opts.map((o) => `<label class="af-ed"><input type="radio" name="editie" value="${esc(o.id)}" ${o.id === pre.id ? 'checked' : ''}>
      <span><b>${esc(o.title)}</b><em class="${o.href ? 'open' : ''}">${esc(o.tag)}</em><small>${esc(o.sub)}</small></span></label>`).join('')}</div>${err}</div>`;
  }
  if (f.t === 'consent') {
    return `<div class="af-consent" data-f="acord"><label><input type="checkbox" name="acord"${desc}${req}><span>${esc(tx(D, 'aplica.acord'))} <a class="af-policy" href="/confidentialitate" target="_blank" rel="noopener">Politica de confidențialitate</a></span></label>${err}</div>`;
  }
  return '';
}

function aplicaBody(ctx, F, opt = {}) {
  const { D } = ctx;
  const opts = options(ctx, F);
  const pre = opts.find((o) => o.id === opt.editie) || opts[opts.length - 1];
  const team = Object.fromEntries(D.program.contact.echipa.map((p) => [p.id, p]));
  const r = team['raluca-bedereag'];
  const N = STEPS.length;
  const model = STEPS.map((s) => ({ id: s.id, titlu: s.titlu, fields: s.fields.map(({ k, t, req, min, max, opts: o, showIf, label }) => ({ k, t, req, min, max, showIf, label, opts: o && o.map(([a, b]) => [a, b]) })) }));

  return `<main class="ax" id="ax-top">
  <div class="wrap ax-wrap">
    <aside class="ax-rail" aria-label="Pașii aplicării">
      <p class="ax-kicker">Aplicare · Antreprenoria</p>
      <ol class="ax-steps">${STEPS.map((s, i) => `<li data-i="${i + 1}"><i>${i + 1}</i><span>${esc(s.titlu)}</span></li>`).join('')}</ol>
      ${r ? `<div class="ax-help"><span>Ai întrebări despre aplicare?</span><b>${esc(r.nume)}</b>
        <div>${r.telefon ? `<a href="tel:${esc(r.telefon.replace(/\D/g, ''))}">${esc(r.telefon)}</a>` : ''}<a href="mailto:${esc(r.email)}">${esc(r.email)}</a></div></div>` : ''}
    </aside>

    <section class="ax-main">
      <div class="ax-bar" aria-hidden="true"><div class="ax-bar-txt"><b id="ax-bar-step"></b><span id="ax-bar-name"></span></div><div class="ax-track"><i id="ax-fill"></i></div></div>

      <form class="ax-form" id="ax" novalidate data-ids="${esc(JSON.stringify(opts.map((o) => o.id)))}">
        <script type="application/json" id="ax-model">${JSON.stringify(model).replace(/</g, '\\u003c')}</script>

        <div class="ax-step ax-intro" data-step="0">
          <p class="eyebrow">Înainte să începi</p>
          <h1>${esc(tx(D, 'aplica.titlu'))}</h1>
          <p class="lead">${esc(tx(D, 'aplica.lead'))}</p>
          <ul class="ax-crit">
            <li><i>01</i><div><b>O afacere care crește</b><span>O cifră de afaceri de cel puțin <strong>500.000 €</strong> pe an și dorința de a duce compania la nivelul următor.</span></div></li>
            <li><i>02</i><div><b>Ambiția ta contează cel mai mult</b><span>Poți veni din orice industrie, cu orice model de business. Ne interesează cât de departe vrei să duci compania și cât de deschis ești să lucrezi la ea.</span></div></li>
            <li><i>03</i><div><b>Fiecare aplicare, citită cu atenție</b><span><strong>Comitetul de selecție</strong> se uită la cifre, la echipă, la ambiția și la disponibilitatea ta, ca să formeze o grupă în care toți au de câștigat. Primești răspunsul în cel mult <strong>10 zile lucrătoare</strong>.</span></div></li>
          </ul>
          <p class="ax-why">Când în sală sunt antreprenori cu ambiții pe măsură, fiecare învață și de la ceilalți. De asta alegem grupa cu grijă.</p>
          <div class="ax-start">
            <button class="btn btn-primary btn-lg" type="button" data-go="1">Încep aplicarea ${ARROW}</button>
            <span class="ax-facts"><span>${N} pași</span><span>aproximativ 6 minute</span><span>se salvează pe parcurs</span></span>
          </div>
          <div class="ax-resume" id="ax-resume" hidden></div>
        </div>

        ${STEPS.map((s, i) => `<fieldset class="ax-step" data-step="${i + 1}" hidden>
          <legend class="ax-head"><span class="ax-n">Pasul ${i + 1} din ${N}</span><span class="ax-h" tabindex="-1">${esc(s.titlu)}</span></legend>
          <p class="ax-sub">${esc(s.sub)}</p>
          <div class="ax-fields">${s.fields.map((f) => fieldHtml(f, D, opts, pre)).join('')}</div>
          ${i + 1 === N ? '<div class="ax-review" id="ax-review"></div>' : ''}
          ${s.nota ? `<p class="ax-nota">${esc(s.nota)}</p>` : ''}
        </fieldset>`).join('')}

        <input class="af-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="af-status" id="af-status" role="status" aria-live="polite"></div>

        <div class="ax-nav" hidden>
          <button class="ax-back" type="button" data-back>${BACK}<span>Înapoi</span></button>
          <button class="btn btn-primary btn-lg ax-next" type="submit"><span>Continuă</span>${ARROW}</button>
        </div>
      </form>
    </section>
  </div>
</main>`;
}

module.exports = { aplicaBody, validate, validCUI, options, record, STEPS };
