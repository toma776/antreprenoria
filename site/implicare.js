// Formularul „Susține programul” de pe /parteneri: aceiași pași ca în „Construiește parteneriatul” (formatul, tema, echipa), apoi datele de contact.
// Orice buton îl deschide precompletat (configuratorul, „Propune un spațiu”, „Scrie-ne”, „Rezervă”); toate cererile ajung ca tip = cerere-sponsorizare,
// cu alegerile scrise în mesaj. Aceeași validare în pagină (site.js) și pe server; ajung în Supabase (tabelul implicari) și în panou › Leads.
const { esc } = require('./util');

const FORMATE_IDS = ['atelier', 'editie', 'an'];

// validarea datelor; întoarce { ok, errors, data }
function validate(input) {
  const v = (k) => String(input?.[k] ?? '').trim();
  const data = { tip: 'cerere-sponsorizare', format: v('format'), nume: v('nume'), companie: v('companie'), functie: v('functie'), email: v('email').toLowerCase(), telefon: v('telefon'), mesaj: v('mesaj'), acord: input?.acord === true || input?.acord === 'on' };
  const errors = {};
  if (!FORMATE_IDS.includes(data.format)) errors.format = 'Alege formatul.';
  if (data.nume.split(/\s+/).filter(Boolean).length < 2) errors.nume = 'Scrie numele și prenumele.';
  if (data.companie.length < 2) errors.companie = 'Scrie numele companiei.';
  // poziția e opțională
  if (data.functie.length > 120) errors.functie = 'Poziția e prea lungă.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) errors.email = 'Adresa de email nu pare corectă.';
  const cifre = data.telefon.replace(/\D/g, '');
  if (!data.telefon) errors.telefon = 'Scrie numărul de telefon.';
  else if (cifre.length < 9) errors.telefon = 'Numărul de telefon pare prea scurt.';
  else if (cifre.length > 15 || /[^\d\s+().-]/.test(data.telefon)) errors.telefon = 'Numărul de telefon nu pare corect.';
  if (data.mesaj.length > 3000) errors.mesaj = 'Mesajul e prea lung (maxim 3.000 de caractere).';
  if (!data.acord) errors.acord = 'Avem nevoie de acordul tău ca să te putem contacta.';
  return { ok: !Object.keys(errors).length, errors, data };
}

// fereastra cu formularul (se deschide din butoanele [data-implica] sau din adresa ?implicare=…)
// formate, echipa: aceleași ca în configurator (site/parteneri.js); themes: temele atelierelor; cluj: textul despre cohorta din Cluj
function implicareDialog({ formate, echipa, themes, cluj = '' }) {
  const field = (name, label, attrs) => `<div class="af-field" data-f="${name}">
        <label for="im-${name}">${label}</label>
        <input id="im-${name}" name="${name}" aria-describedby="im-${name}-err" ${attrs}><small class="af-err" id="im-${name}-err"></small>
      </div>`;
  return `<dialog class="im-dlg" id="implica" aria-labelledby="im-title">
  <form class="af im-form" id="im-form" novalidate method="dialog">
    <div class="im-head"><h2 id="im-title">Susține programul</h2><button type="button" class="im-x" data-im-close aria-label="Închide">✕</button></div>
    <fieldset class="sp-step im-step" data-f="format" aria-describedby="im-format-err"><legend><i>1</i>Formatul</legend>
      <div class="sp-tiers">${formate.map((f) => `<label class="sp-tier"><input type="radio" name="format" value="${f.id}" data-rol="${esc(f.rol)}" data-t="${esc(f.titlu)}"><span><small>${esc(f.rol)}</small><b>${esc(f.titlu)}</b><em>${esc(f.text.replace('{cluj}', cluj))}</em></span></label>`).join('')}</div>
      <small class="af-err" id="im-format-err"></small>
    </fieldset>
    <fieldset class="sp-step im-step" data-only="atelier" hidden><legend><i>2</i>Tema atelierului</legend>
      <div class="sp-chips">${themes.map((t, i) => `<label><input type="radio" name="tema" value="${esc(t.nume)}" data-f="${esc(t.format)}"${i === 0 ? ' checked' : ''}><span>${esc(t.nume)}<small>${t.format === 'seară' ? 'seară' : 'o zi'}</small></span></label>`).join('')}</div>
    </fieldset>
    <fieldset class="sp-step im-step"><legend><i class="im-n">3</i>Implică-ți echipa <span class="af-opt">opțional</span></legend>
      <div class="sp-team">${echipa.map(([k, t, s]) => `<label class="sp-sw"><input type="checkbox" name="echipa" value="${k}" data-t="${esc(t)}"><span><b>${esc(t)}</b><small>${esc(s)}</small></span><i aria-hidden="true"></i></label>`).join('')}</div>
    </fieldset>
    <fieldset class="af-group sp-step im-step"><legend><i class="im-n">4</i>Datele tale</legend>
      ${field('nume', 'Nume și prenume', 'type="text" autocomplete="name" autocapitalize="words" required')}
      ${field('companie', 'Companie', 'type="text" autocomplete="organization" required')}
      ${field('functie', 'Poziția în companie <span class="af-opt">opțional</span>', 'type="text" autocomplete="organization-title" maxlength="120" placeholder="ex. CEO, Director de marketing"')}
      ${field('email', 'Email', 'type="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" required')}
      ${field('telefon', 'Telefon', 'type="tel" autocomplete="tel" inputmode="tel" maxlength="30" placeholder="07xx xxx xxx" required')}
      <div class="af-field" data-f="mesaj"><label for="im-mesaj">Mesaj <span class="af-opt">opțional</span></label><textarea id="im-mesaj" name="mesaj" aria-describedby="im-mesaj-err" rows="3" maxlength="2500" placeholder="Ceva ce ar trebui să știm? de exemplu, perioada care ți se potrivește."></textarea><small class="af-err" id="im-mesaj-err"></small></div>
    </fieldset>
    <div class="af-consent" data-f="acord">
      <label><input type="checkbox" name="acord" required aria-describedby="im-acord-err"><span>Sunt de acord ca Fundația Romanian Business Leaders să folosească aceste date ca să mă contacteze despre implicarea în program. <a class="af-policy" href="/confidentialitate" target="_blank" rel="noopener">Politica de confidențialitate</a></span></label>
      <small class="af-err" id="im-acord-err"></small>
    </div>
    <input class="af-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div class="af-submit"><button class="btn btn-primary btn-lg" type="submit">Trimite</button><small>Primești propunerea pe email în câteva zile lucrătoare.</small></div>
    <div class="af-status" role="status" aria-live="polite"></div>
  </form>
  <div class="af-done im-done" hidden tabindex="-1"><span class="af-done-ic">✓</span><h2>Mulțumim!</h2><p>Am primit cererea. Te contactăm în câteva zile lucrătoare.</p><button type="button" class="btn btn-ghost" data-im-close>Închide</button></div>
</dialog>`;
}

module.exports = { validate, implicareDialog };
