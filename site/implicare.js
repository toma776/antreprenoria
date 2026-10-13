// Formularul „Susține programul” de pe /parteneri: sponsorizare, găzduire, mentorat.
// Aceeași validare în pagină (site.js) și pe server; mesajele ajung în Supabase (tabelul implicari) și în panou › Leads.
const { esc } = require('./util');

const TIPURI = [
  ['sponsorizare', 'Sponsorizează un atelier', 'Numele companiei la un atelier și o zi alături de antreprenori'],
  ['gazduire', 'Găzduiește un atelier', 'O sală pentru o zi de lucru, pentru în jur de 30 de oameni'],
  ['mentorat', 'Devino trainer sau mentor', 'Experiența ta, pro-bono, pentru antreprenorii din program'],
];

// validarea datelor; întoarce { ok, errors, data }
function validate(input) {
  const v = (k) => String(input?.[k] ?? '').trim();
  const data = { tip: v('tip'), nume: v('nume'), companie: v('companie'), email: v('email').toLowerCase(), telefon: v('telefon'), mesaj: v('mesaj'), acord: input?.acord === true || input?.acord === 'on' };
  const errors = {};
  if (!TIPURI.some(([k]) => k === data.tip)) errors.tip = 'Alege cum vrei să te implici.';
  if (data.nume.split(/\s+/).filter(Boolean).length < 2) errors.nume = 'Scrie numele și prenumele.';
  if (data.companie.length < 2) errors.companie = 'Scrie numele companiei.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) errors.email = 'Adresa de email nu pare corectă.';
  if (data.telefon && data.telefon.replace(/\D/g, '').length < 9) errors.telefon = 'Numărul de telefon pare prea scurt.';
  if (data.mesaj.length > 3000) errors.mesaj = 'Mesajul e prea lung (maxim 3.000 de caractere).';
  if (!data.acord) errors.acord = 'Avem nevoie de acordul tău ca să te putem contacta.';
  return { ok: !Object.keys(errors).length, errors, data };
}

// fereastra cu formularul (se deschide din butoanele [data-implica] sau din adresa ?implicare=…)
function implicareDialog() {
  const field = (name, label, attrs, hint = '') => `<div class="af-field" data-f="${name}">
        <label for="im-${name}">${label}</label>
        <input id="im-${name}" name="${name}" ${attrs}>${hint ? `<small class="af-hint">${hint}</small>` : ''}<small class="af-err" role="alert"></small>
      </div>`;
  return `<dialog class="im-dlg" id="implica" aria-labelledby="im-title">
  <form class="af im-form" id="im-form" novalidate method="dialog">
    <div class="im-head"><h2 id="im-title">Susține programul</h2><button type="button" class="im-x" data-im-close aria-label="Închide">✕</button></div>
    <fieldset class="af-group im-tip" data-f="tip">
      <legend>Cum vrei să te implici?</legend>
      <div class="af-eds">${TIPURI.map(([k, t, s]) => `<label class="af-ed"><input type="radio" name="tip" value="${k}"><span><b>${esc(t)}</b><small>${esc(s)}</small></span></label>`).join('')}</div>
      <small class="af-err" role="alert"></small>
    </fieldset>
    <fieldset class="af-group">
      ${field('nume', 'Nume și prenume', 'type="text" autocomplete="name" autocapitalize="words" required')}
      ${field('companie', 'Companie', 'type="text" autocomplete="organization" required')}
      ${field('email', 'Email', 'type="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" required')}
      ${field('telefon', 'Telefon <span class="af-opt">opțional</span>', 'type="tel" autocomplete="tel" inputmode="tel"')}
      <div class="af-field" data-f="mesaj"><label for="im-mesaj">Mesaj <span class="af-opt">opțional</span></label><textarea id="im-mesaj" name="mesaj" rows="4" maxlength="3000" placeholder="Ce ai avea în minte? De exemplu, tema atelierului sau spațiul pe care îl propui."></textarea><small class="af-err" role="alert"></small></div>
    </fieldset>
    <div class="af-consent" data-f="acord">
      <label><input type="checkbox" name="acord" required><span>Sunt de acord ca Fundația Romanian Business Leaders să folosească aceste date ca să mă contacteze despre implicarea în program.</span></label>
      <small class="af-err" role="alert"></small>
    </div>
    <input class="af-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div class="af-submit"><button class="btn btn-primary btn-lg" type="submit">Trimite</button><small>Îți răspundem în câteva zile lucrătoare.</small></div>
    <div class="af-status" role="status" aria-live="polite"></div>
  </form>
  <div class="af-done im-done" hidden tabindex="-1"><span class="af-done-ic">✓</span><h2>Mulțumim!</h2><p>Am primit mesajul. Te contactăm în câteva zile lucrătoare.</p><button type="button" class="btn btn-ghost" data-im-close>Închide</button></div>
</dialog>`;
}

module.exports = { TIPURI, validate, implicareDialog };
