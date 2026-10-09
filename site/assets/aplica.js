/* Formularul /aplica: verificare pe loc (aceleași reguli ca serverul, din site/aplica.js), ciornă păstrată în browser,
   trimitere fără reîncărcarea paginii și confirmare. */
(() => {
  const form = document.getElementById('af');
  if (!form) return;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const ids = JSON.parse(form.dataset.ids || '[]');
  const status = $('#af-status');
  const KEY = 'antreprenoria-aplica';

  // aceleași reguli ca pe server
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
  const RULES = {
    editie: (d) => (ids.includes(d.editie) ? '' : 'Alege ediția.'),
    nume: (d) => (d.nume.split(/\s+/).filter(Boolean).length >= 2 ? '' : 'Scrie numele și prenumele.'),
    email: (d) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email) ? '' : 'Adresa de email nu pare corectă.'),
    telefon: (d) => (d.telefon.replace(/\D/g, '').length >= 9 ? '' : 'Numărul de telefon pare prea scurt.'),
    companie: (d) => (d.companie.length >= 2 ? '' : 'Scrie numele companiei.'),
    cui: (d) => (validCUI(d.cui) ? '' : 'CUI-ul nu e valid. Verifică cifrele (cu sau fără RO).'),
    cifra_afaceri: (d) => (d.cifra_afaceri ? '' : 'Alege intervalul cifrei de afaceri.'),
    acord: (d) => (d.acord ? '' : 'Avem nevoie de acordul tău ca să procesăm aplicarea.'),
  };
  const read = () => {
    const f = new FormData(form), g = (k) => String(f.get(k) || '').trim();
    return { editie: g('editie'), nume: g('nume'), email: g('email').toLowerCase(), telefon: g('telefon'), companie: g('companie'), cui: g('cui'),
      cifra_afaceri: g('cifra_afaceri'), sursa: g('sursa'), sursa_alta: g('sursa_alta'), acord: f.get('acord') === 'on', website: g('website') };
  };
  const show = (name, msg) => {
    const box = form.querySelector(`[data-f="${name}"]`) || $(`#e-${name}`)?.parentElement;
    const err = $(`#e-${name}`);
    if (err) err.textContent = msg || '';
    box?.classList.toggle('bad', !!msg);
    const input = form.querySelector(`[name="${name}"]`);
    if (input && input.type !== 'radio') input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };
  const check = (name) => { const msg = RULES[name]?.(read()) || ''; show(name, msg); return !msg; };

  // verificarea unui câmp când îl părăsești; după prima greșeală, și pe măsură ce scrii
  const touched = new Set();
  form.addEventListener('focusout', (e) => { const n = e.target.name; if (RULES[n] && e.target.type !== 'radio' && e.target.value.trim()) { touched.add(n); check(n); } });
  form.addEventListener('input', (e) => { const n = e.target.name; if (touched.has(n) || e.target.type === 'radio' || e.target.type === 'checkbox') check(n); save(); });
  form.addEventListener('change', (e) => {
    const n = e.target.name;
    if (n === 'sursa') { const other = $('.af-other', form); other.hidden = e.target.value !== 'Altceva'; if (!other.hidden) $('input', other).focus(); }
    if (n === 'cifra_afaceri') $('#n-ca').hidden = e.target.value !== 'sub-500k';
    if (RULES[n]) check(n);
    save();
  });

  // ciorna: dacă închizi pagina din greșeală, datele rămân în acest browser (nu pleacă nicăieri până nu trimiți)
  function save() { try { const d = read(); delete d.website; localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d) {
      ['nume', 'email', 'telefon', 'companie', 'cui', 'sursa_alta'].forEach((k) => { if (d[k]) form.elements[k].value = d[k]; });
      ['cifra_afaceri', 'sursa'].forEach((k) => { const r = form.querySelector(`[name="${k}"][value="${CSS.escape(d[k] || '')}"]`); if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); } });
      if (!new URLSearchParams(location.search).get('editie')) { const r = form.querySelector(`[name="editie"][value="${CSS.escape(d.editie || '')}"]`); if (r) r.checked = true; }
    }
  } catch (e) {}

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bad = Object.keys(RULES).filter((n) => !check(n));
    Object.keys(RULES).forEach((n) => touched.add(n));
    if (bad.length) {
      status.className = 'af-status err';
      status.textContent = bad.length === 1 ? 'Mai e un câmp de completat.' : `Mai sunt ${bad.length} câmpuri de completat.`;
      const first = form.querySelector(`[data-f="${bad[0]}"], #e-${bad[0]}`);
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => form.querySelector(`[name="${bad[0]}"]`)?.focus({ preventScroll: true }), 350);
      return;
    }
    const btn = $('button[type="submit"]', form);
    btn.disabled = true; btn.textContent = 'Se trimite…';
    status.className = 'af-status'; status.textContent = '';
    try {
      const r = await fetch('/api/aplica', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(read()) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) return done();
      if (r.status === 422 && j.errors) { Object.entries(j.errors).forEach(([n, m]) => show(n, m)); throw new Error(j.error); }
      throw new Error(r.status === 503 ? 'unavailable' : j.error || 'eroare');
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Trimite aplicarea';
      status.className = 'af-status err';
      const c = $('.ap-contact');
      status.innerHTML = err.message === 'unavailable'
        ? `Momentan nu putem primi aplicări online. Datele tale au rămas completate aici; ${c ? 'ne poți scrie sau suna direct (vezi alături)' : 'încearcă din nou mai târziu'}.`
        : `Aplicarea nu a plecat: ${err.message === 'eroare' ? 'încearcă din nou' : err.message}`;
    }
  });

  function done() {
    const d = read(), ed = form.querySelector(`[name="editie"]:checked`)?.closest('label')?.querySelector('b')?.textContent || '';
    try { localStorage.removeItem(KEY); } catch (e) {}
    const first = d.nume.split(/\s+/)[0];
    form.innerHTML = `<div class="af-done" tabindex="-1">
      <span class="af-done-ic" aria-hidden="true">✓</span>
      <h2>Mulțumim, ${first.replace(/[<>&"]/g, '')}!</h2>
      <p>Am primit aplicarea pentru <b>${ed}</b>. Echipa programului verifică eligibilitatea companiei și te contactează la <b>${d.email.replace(/[<>&"]/g, '')}</b>.</p>
      <a class="btn btn-ghost" href="/program">Între timp, vezi cum funcționează programul</a>
    </div>`;
    const box = $('.af-done', form); box.scrollIntoView({ behavior: 'smooth', block: 'start' }); box.focus({ preventScroll: true });
  }
})();
