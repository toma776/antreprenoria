// Pagina /aplica: formularul propriu de înscriere (în locul JotForm / Formester de pe site-ul vechi).
// Aceleași informații ca formularele vechi (nume, email, telefon, companie, CUI, cum ai aflat, acordul), plus ediția aleasă
// și intervalul cifrei de afaceri, ca echipa să vadă eligibilitatea din prima. Validarea de aici e folosită și de server.
const { esc } = require('./util');

const edUrl = (e) => (e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`);
const CA = [['sub-500k', 'Sub 500.000 €'], ['500k-1m', '500.000 – 1 mil. €'], ['1m-10m', '1 – 10 mil. €'], ['peste-10m', 'Peste 10 mil. €']];
const SURSE = ['Recomandare de la un alumni', 'LinkedIn', 'Facebook', 'Google', 'Comunitatea RBL', 'Altceva'];

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

// edițiile la care se poate aplica: cele cu înscrieri deschise (încă neîncepute) și lista de așteptare pentru următoarea din București
function options(ctx, F) {
  const { D } = ctx;
  const t0 = new Date().toISOString().slice(0, 10);
  const open = D.editii.filter((e) => e.deschisa && !e.ateliere.some((a) => a.data && a.data < t0 && a.data.startsWith(String(e.an))))
    .map((e) => { const p = e.preturi.find((x) => !x.ascuns); return { id: e.id, title: `${e.serie === 'Cluj' ? 'Cluj' : 'București'} #${e.numar}`, tag: 'Înscrieri deschise', sub: `${e.perioada}${p ? ' · ' + p.pret_text.replace(/(\d)(\d{3})\b/, '$1.$2') : ''}`, href: edUrl(e) }; });
  const next = { id: `bucuresti-${F.maxNr + 1}`, title: `București #${F.maxNr + 1}`, tag: 'Listă de așteptare', sub: 'Următoarea ediție; te anunțăm primii când se deschid înscrierile', href: null };
  return [...open, next];
}

// validarea datelor (aceeași regulă în browser și pe server); întoarce { ok, errors, data }
function validate(input, ids) {
  const v = (k) => String(input?.[k] ?? '').trim();
  const data = { editie: v('editie'), nume: v('nume'), email: v('email').toLowerCase(), telefon: v('telefon'), companie: v('companie'), cui: v('cui').toUpperCase().replace(/\s+/g, ''), cifra_afaceri: v('cifra_afaceri'), sursa: v('sursa'), sursa_alta: v('sursa_alta'), acord: input?.acord === true || input?.acord === 'on' };
  const errors = {};
  if (!ids.includes(data.editie)) errors.editie = 'Alege ediția.';
  if (data.nume.split(/\s+/).filter(Boolean).length < 2) errors.nume = 'Scrie numele și prenumele.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) errors.email = 'Adresa de email nu pare corectă.';
  if (data.telefon.replace(/\D/g, '').length < 9) errors.telefon = 'Numărul de telefon pare prea scurt.';
  if (data.companie.length < 2) errors.companie = 'Scrie numele companiei.';
  if (!validCUI(data.cui)) errors.cui = 'CUI-ul nu e valid. Verifică cifrele (cu sau fără RO).';
  if (!CA.some(([k]) => k === data.cifra_afaceri)) errors.cifra_afaceri = 'Alege intervalul cifrei de afaceri.';
  if (!data.acord) errors.acord = 'Avem nevoie de acordul tău ca să procesăm aplicarea.';
  return { ok: !Object.keys(errors).length, errors, data };
}

function aplicaBody(ctx, F, opt = {}) {
  const { D } = ctx;
  const opts = options(ctx, F);
  const pre = opts.find((o) => o.id === opt.editie) || opts[opts.length - 1];
  const team = Object.fromEntries(D.program.contact.echipa.map((p) => [p.id, p]));
  const r = team['raluca-bedereag'];
  const field = (name, label, attrs, hint = '') => `<div class="af-field" data-f="${name}">
      <label for="f-${name}">${label}</label>
      <input id="f-${name}" name="${name}" ${attrs}>
      ${hint ? `<small class="af-hint">${hint}</small>` : ''}<small class="af-err" id="e-${name}" role="alert"></small>
    </div>`;

  return `<main class="ap">
  <section class="hero ap-hero"><div class="wrap">
    <nav class="crumbs" aria-label="Unde ești"><a href="/">Acasă</a><span>/</span><b>Aplică</b></nav>
    <p class="eyebrow">Aplică</p>
    <h1>Locul tău la Antreprenoria.</h1>
    <p class="lead">Durează două minute. Echipa programului verifică eligibilitatea companiei și te contactează. Nu plătești nimic acum.</p>
  </div></section>

  <section class="ap-sec"><div class="wrap ap-grid">
    <form class="af" id="af" novalidate data-ids="${esc(JSON.stringify(opts.map((o) => o.id)))}">
      <fieldset class="af-group">
        <legend><i>1</i>Ediția</legend>
        <div class="af-eds">${opts.map((o) => `<label class="af-ed"><input type="radio" name="editie" value="${esc(o.id)}" ${o.id === pre.id ? 'checked' : ''} required>
          <span><b>${esc(o.title)}</b><em class="${o.href ? 'open' : ''}">${esc(o.tag)}</em><small>${esc(o.sub)}</small></span></label>`).join('')}</div>
        <small class="af-err" id="e-editie" role="alert"></small>
      </fieldset>

      <fieldset class="af-group">
        <legend><i>2</i>Despre tine</legend>
        ${field('nume', 'Nume și prenume', 'type="text" autocomplete="name" autocapitalize="words" required')}
        ${field('email', 'Email', 'type="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" required')}
        ${field('telefon', 'Telefon', 'type="tel" autocomplete="tel" inputmode="tel" required')}
      </fieldset>

      <fieldset class="af-group">
        <legend><i>3</i>Despre companie</legend>
        ${field('companie', 'Numele companiei', 'type="text" autocomplete="organization" required', 'Complet, așa cum apare în documentele statutare.')}
        ${field('cui', 'Cod unic de înregistrare (CUI)', 'type="text" inputmode="text" autocapitalize="characters" spellcheck="false" placeholder="ex. RO12345678" required', 'Îl folosim doar pentru verificarea eligibilității și a cifrei de afaceri.')}
        <div class="af-field" data-f="cifra_afaceri">
          <span class="af-label" id="l-ca">Cifra de afaceri anuală a companiei (sau a grupului)</span>
          <div class="af-seg" role="radiogroup" aria-labelledby="l-ca">${CA.map(([k, l]) => `<label><input type="radio" name="cifra_afaceri" value="${k}" required><span>${l}</span></label>`).join('')}</div>
          <small class="af-note" id="n-ca" hidden>Programul e gândit pentru companii de peste 500.000 €. Poți aplica oricum: te anunțăm dacă apare un format potrivit.</small>
          <small class="af-err" id="e-cifra_afaceri" role="alert"></small>
        </div>
      </fieldset>

      <fieldset class="af-group">
        <legend><i>4</i>Cum ai aflat de noi? <span class="af-opt">opțional</span></legend>
        <div class="af-chips">${SURSE.map((s) => `<label><input type="radio" name="sursa" value="${esc(s)}"><span>${esc(s)}</span></label>`).join('')}</div>
        <div class="af-field af-other" data-f="sursa_alta" hidden>
          <label for="f-sursa_alta">Unde?</label><input id="f-sursa_alta" name="sursa_alta" type="text" maxlength="120">
        </div>
      </fieldset>

      <div class="af-consent" data-f="acord">
        <label><input type="checkbox" name="acord" required><span>Sunt de acord ca Fundația Romanian Business Leaders să folosească aceste date pentru selecția participanților și să mă contacteze despre program.</span></label>
        <small class="af-err" id="e-acord" role="alert"></small>
      </div>
      <input class="af-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">

      <div class="af-submit">
        <button class="btn btn-primary btn-lg" type="submit">Trimite aplicarea</button>
        <small>Nu plătești nimic acum. Te contactăm înainte de orice confirmare.</small>
      </div>
      <div class="af-status" id="af-status" role="status" aria-live="polite"></div>
    </form>

    <aside class="ap-side">
      <div class="ap-card">
        <span class="ask-kicker">Cine poate aplica</span>
        <ul class="checks">
          <li>Companii cu cifra de afaceri între 0,5 și 10 mil. €</li>
          <li>Fondatori sau manageri de top care pot duce schimbările în companie</li>
          <li>În jur de 25 de locuri pe ediție</li>
        </ul>
      </div>
      <div class="ap-card">
        <span class="ask-kicker">Ce urmează</span>
        <ol class="ap-steps"><li><b>Trimiți aplicarea</b><span>Două minute, de pe telefon sau calculator.</span></li>
          <li><b>Verificăm eligibilitatea</b><span>Pe baza CUI-ului și a cifrei de afaceri.</span></li>
          <li><b>Te contactăm</b><span>Cu rezultatul selecției și pașii pentru confirmarea locului.</span></li></ol>
      </div>
      ${r ? `<div class="ap-card ap-contact"><span class="ask-kicker">Ai întrebări?</span><b>${esc(r.nume)}</b><span>${esc(r.rol.split('·')[0].trim())}</span>
        <div class="ap-contact-btns">${r.telefon ? `<a class="btn btn-ghost" href="tel:${esc(r.telefon.replace(/\D/g, ''))}">Sună</a>` : ''}<a class="btn btn-ghost" href="mailto:${esc(r.email)}">Scrie</a></div></div>` : ''}
    </aside>
  </div></section>
</main>`;
}

module.exports = { aplicaBody, validate, validCUI, options };
