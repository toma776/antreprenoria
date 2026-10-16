/* /aplica: criteriile, apoi 7 pași. Fiecare pas se verifică pe loc (aceleași reguli ca serverul, din site/aplica.js) și se salvează:
   pasul 1 creează aplicarea (pentru remindere), următorii o completează. Ciorna rămâne și în browser; ?reia=<token> o aduce din Supabase. */
(() => {
  const form = document.getElementById('ax');
  if (!form) return;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const ids = JSON.parse(form.dataset.ids || '[]');
  const STEPS = JSON.parse($('#ax-model').textContent);
  const N = STEPS.length;
  const FIELDS = STEPS.flatMap((s, i) => s.fields.map((f) => ({ ...f, pas: i + 1 })));
  const status = $('#af-status'), nav = $('.ax-nav', form), next = $('.ax-next', form);
  const KEY = 'antreprenoria-aplica-v2';
  const qs = new URLSearchParams(location.search);
  let cur = 0, maxSeen = 0, token = null, saving = null, sending = false;
  // ciorna din browser expiră după 30 de zile (date personale pe un calculator care poate fi al altcuiva)
  const DRAFT_DAYS = 30;

  // ---------- reguli (aceleași ca pe server) ----------
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
  function fieldError(f, d) {
    const v = d[f.k];
    if (f.showIf && d[f.showIf[0]] !== f.showIf[1]) return '';
    const empty = Array.isArray(v) ? !v.length : f.t === 'consent' ? !v : !String(v ?? '').trim();
    if (empty) return f.req ? ({ consent: 'Avem nevoie de acordul tău ca să putem evalua aplicarea.', one: 'Alege o variantă.', many: 'Alege cel puțin o variantă.', editie: 'Alege cohorta.' }[f.t] || { nume: 'Scrie numele și prenumele.', companie: 'Scrie numele companiei.', email: 'Scrie adresa de email.', telefon: 'Scrie numărul de telefon.', cui: 'Scrie CUI-ul companiei.' }[f.k] || 'Scrie câteva fraze.') : '';
    if (f.k === 'nume' && String(v).split(/\s+/).filter(Boolean).length < 2) return 'Scrie numele și prenumele.';
    if (f.t === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Adresa de email nu pare corectă.';
    if (f.t === 'tel' && String(v).replace(/\D/g, '').length < 9) return 'Numărul de telefon pare prea scurt.';
    if (f.t === 'cui' && !validCUI(v)) return 'CUI-ul nu e valid. Verifică cifrele (cu sau fără RO).';
    if (f.t === 'many' && v.length > f.max) return `Alege cel mult ${f.max}.`;
    if (f.t === 'area' && String(v).trim().length < f.min) return `Mai scrie puțin (măcar ${f.min} de caractere).`;
    if (f.t === 'editie' && !ids.includes(v)) return 'Alege cohorta.';
    return '';
  }

  // ---------- date ----------
  const read = () => {
    const fd = new FormData(form), d = {};
    FIELDS.forEach((f) => { d[f.k] = f.t === 'many' ? fd.getAll(f.k).map(String) : f.t === 'consent' ? fd.get(f.k) === 'on' : String(fd.get(f.k) || '').trim(); });
    d.email = (d.email || '').toLowerCase();
    return d;
  };
  const fill = (d) => {
    FIELDS.forEach((f) => {
      const v = d[f.k];
      if (v == null || v === '') return;
      if (f.t === 'consent') { form.elements.acord.checked = !!v; return; }
      if (['one', 'many', 'editie'].includes(f.t)) { const vals = Array.isArray(v) ? v : [v]; $$(`[name="${f.k}"]`, form).forEach((i) => { i.checked = vals.includes(i.value); }); return; }
      const el = form.elements[f.k]; if (el) el.value = v;
    });
    sync();
  };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ token, cur, maxSeen, d: read(), t: Date.now() })); } catch (e) {} };

  // ---------- afișarea erorilor ----------
  const show = (k, msg) => {
    const box = form.querySelector(`[data-f="${k}"]`), err = $(`#e-${k}`);
    if (err) err.textContent = msg || '';
    box?.classList.toggle('bad', !!msg);
    const input = form.querySelector(`[name="${k}"]`);
    if (input && !['radio', 'checkbox'].includes(input.type)) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    // la alegeri (variante, cohortă, acord), starea „invalid” o poartă grupul sau bifa
    const grp = box?.querySelector('[role="radiogroup"], [role="group"]') || (input && input.type === 'checkbox' && k === 'acord' ? input : null);
    if (grp) grp.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };
  const touched = new Set();
  const check = (k) => { const f = FIELDS.find((x) => x.k === k); if (!f) return true; const m = fieldError(f, read()); show(k, m); return !m; };

  // ---------- comportamentele câmpurilor ----------
  function sync() {
    const d = read();
    $$('[data-show]', form).forEach((el) => { const [k, v] = el.dataset.show.split('='); el.hidden = d[k] !== v; });
    $$('[data-warn]', form).forEach((el) => { el.hidden = d[el.dataset.warn] !== 'sub-500k'; });
    $$('[data-max]', form).forEach((g) => { const max = +g.dataset.max, ch = $$('input:checked', g).length; $$('input', g).forEach((i) => { i.disabled = !i.checked && ch >= max; }); g.classList.toggle('full', ch >= max); });
    $$('textarea[data-min]', form).forEach((t) => { const n = t.value.trim().length, min = +t.dataset.min, c = $(`.ax-count[data-for="${t.name}"]`, form); if (c) { c.textContent = n < min ? `${n} / ${min}` : '✓'; c.classList.toggle('ok', n >= min); } });
  }
  form.addEventListener('focusout', (e) => { const n = e.target.name; if (n && !['radio', 'checkbox'].includes(e.target.type) && e.target.value.trim()) { touched.add(n); check(n); } });
  form.addEventListener('input', (e) => { const n = e.target.name; sync(); if (touched.has(n)) check(n); save(); });
  form.addEventListener('change', (e) => { const n = e.target.name; sync(); if (['radio', 'checkbox'].includes(e.target.type)) check(n); if (n === 'sursa' && e.target.value === 'Altceva') setTimeout(() => form.elements.sursa_alta?.focus(), 30); save(); });
  // Enter într-un câmp de text trece la pasul următor (în textarea rămâne rând nou)
  form.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && !['radio', 'checkbox'].includes(e.target.type)) { e.preventDefault(); go(cur + 1); } });

  // ---------- navigarea ----------
  const fill$ = $('#ax-fill'), rail = $$('.ax-steps li');
  function paint() {
    $$('.ax-step', form).forEach((s) => { s.hidden = +s.dataset.step !== cur; });
    nav.hidden = cur === 0;
    $('.ax-back', form).hidden = cur <= 1;
    next.querySelector('span').textContent = cur === N ? 'Trimite aplicarea' : cur === 1 ? 'Salvează și continuă' : 'Continuă';
    next.classList.toggle('ax-send', cur === N);
    fill$.style.width = `${(Math.max(cur, 0) / N) * 100}%`;
    $('#ax-bar-step').textContent = cur ? `Pasul ${cur} din ${N}` : 'Înainte să începi';
    $('#ax-bar-name').textContent = cur === N ? 'Verifici și trimiți' : cur ? `Urmează: ${STEPS[cur].titlu}` : '';
    document.querySelector('.ax').classList.toggle('is-intro', cur === 0);
    rail.forEach((li) => { const i = +li.dataset.i; li.classList.toggle('on', i === cur); li.classList.toggle('done', i < cur || (i <= maxSeen && i !== cur)); li.toggleAttribute('data-go', i <= maxSeen); });
    if (cur === N) review();
    status.className = 'af-status'; status.textContent = '';
  }
  function focusStep() {
    const top = $('.ax-main').getBoundingClientRect().top + scrollY - 90;
    if (scrollY > top || window.innerWidth < 900) window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
    const h = $(`.ax-step[data-step="${cur}"] .ax-h`, form) || $('.ax-intro h1', form);
    h?.focus({ preventScroll: true });
  }
  function stepErrors(i) {
    const d = read();
    return STEPS[i - 1].fields.map((f) => { const m = fieldError(f, d); show(f.k, m); return m ? f.k : null; }).filter(Boolean);
  }
  async function go(to, opt = {}) {
    if (to > cur && cur >= 1) {
      const bad = stepErrors(cur);
      bad.forEach((k) => touched.add(k));
      if (bad.length) {
        const el = form.querySelector(`[data-f="${bad[0]}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // focusul pe primul câmp cu probleme (și la alegeri, pe prima variantă), plus un anunț cu câte sunt
        setTimeout(() => { const i = form.querySelector(`[name="${bad[0]}"]:checked`) || form.querySelector(`[name="${bad[0]}"]`); if (i) i.focus({ preventScroll: true }); }, 300);
        status.className = 'af-status err'; status.textContent = bad.length === 1 ? 'Un câmp trebuie completat sau corectat.' : `${bad.length} câmpuri trebuie completate sau corectate.`;
        return;
      }
      if (cur === N) return submit();
      // pasul 1 trebuie salvat ca să avem tokenul; restul pleacă în fundal. Dacă salvarea nu reușește, omul află (răspunsurile rămân în browser)
      push(cur).then(({ r }) => { if (!r || !r.ok) { status.className = 'af-status err'; status.textContent = 'Nu am putut salva pasul pe server. Răspunsurile tale rămân aici și le trimitem la final; verifică legătura la internet.'; } });
      if (cur === 1) await saving;
    }
    cur = Math.max(0, Math.min(N, to));
    maxSeen = Math.max(maxSeen, cur);
    paint(); save();
    if (!opt.silent) { history.pushState({ step: cur }, '', `#pas-${cur}`); focusStep(); }
  }
  window.addEventListener('popstate', (e) => { const s = e.state?.step ?? (+(/^#pas-(\d)$/.exec(location.hash) || [])[1] || 0); if (s <= maxSeen) { cur = s; paint(); focusStep(); } });
  form.addEventListener('submit', (e) => { e.preventDefault(); go(cur + 1); });
  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]'); if (b && form.contains(b)) { e.preventDefault(); go(+b.dataset.go); }
    if (e.target.closest('[data-back]')) go(cur - 1);
    const ed = e.target.closest('[data-edit]'); if (ed) { cur = +ed.dataset.edit; paint(); history.pushState({ step: cur }, '', `#pas-${cur}`); focusStep(); }
  });
  $('.ax-rail').addEventListener('click', (e) => { const li = e.target.closest('li[data-go]'); if (!li) return; const i = +li.dataset.i; if (i < cur || i <= maxSeen) { cur = i; paint(); history.pushState({ step: cur }, '', `#pas-${cur}`); focusStep(); } });

  // ---------- salvarea ----------
  function push(pas, final = false) {
    const body = JSON.stringify({ ...read(), token, pas, final, website: form.elements.website.value });
    saving = fetch('/api/aplica', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (r.ok && j.token) { token = j.token; save(); } return { r, j }; })
      .catch(() => ({ r: null, j: {} }));
    return saving;
  }

  // ---------- recapitularea de la ultimul pas ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function review() {
    const d = read(), lab = (f) => { const v = d[f.k]; if (Array.isArray(v)) return v.map((x) => f.opts.find(([k]) => k === x)?.[1] || x).join(', '); return f.opts ? f.opts.find(([k]) => k === v)?.[1] || v : v; };
    $('#ax-review').innerHTML = `<p class="af-label">Rezumatul aplicării</p>${STEPS.slice(0, N - 1).map((s, i) => `<div class="ax-rv">
      <div class="ax-rv-h"><b>${i + 1}. ${esc(s.titlu)}</b><button type="button" data-edit="${i + 1}">Modifică</button></div>
      <dl>${s.fields.filter((f) => f.t !== 'consent' && (Array.isArray(d[f.k]) ? d[f.k].length : d[f.k])).map((f) => `<div${f.t === 'area' ? ' class="wide"' : ''}><dt>${esc(f.label)}</dt><dd>${esc(lab(f))}</dd></div>`).join('')}</dl></div>`).join('')}`;
  }

  // ---------- trimiterea ----------
  async function submit() {
    if (sending) return; // un Enter în plus nu mai trimite a doua oară
    sending = true;
    next.disabled = true; next.querySelector('span').textContent = 'Se trimite…';
    if (saving) await saving;
    const { r, j } = await push(N, true);
    if (r && r.ok) return done();
    sending = false;
    next.disabled = false; next.querySelector('span').textContent = 'Trimite aplicarea';
    if (r && r.status === 422 && j.errors) {
      const first = FIELDS.find((f) => j.errors[f.k]);
      Object.entries(j.errors).forEach(([k, m]) => show(k, m));
      if (first && first.pas !== N) { cur = first.pas; paint(); focusStep(); }
    }
    status.className = 'af-status err';
    status.textContent = r && r.status === 422 ? 'Verifică răspunsurile marcate.' : 'Aplicarea nu a plecat. Răspunsurile tale au rămas aici; încearcă din nou peste un minut sau scrie-ne direct.';
  }
  function done() {
    const d = read(), ed = $(`[name="editie"]:checked`, form)?.closest('label')?.querySelector('b')?.textContent || '';
    try { localStorage.removeItem(KEY); } catch (e) {}
    history.replaceState(null, '', location.pathname);
    rail.forEach((li) => { li.classList.remove('on'); li.classList.add('done'); li.removeAttribute('data-go'); });
    fill$.style.width = '100%';
    $('#ax-bar-step').textContent = 'Aplicare trimisă'; $('#ax-bar-name').textContent = '';
    form.innerHTML = `<div class="ax-done" tabindex="-1">
      <span class="ax-done-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      <h2>Mulțumim, ${esc(d.nume.split(/\s+/)[0])}.</h2>
      <p class="lead">Aplicarea ta pentru <b>${esc(ed)}</b> a ajuns la comisia de selecție.</p>
      <ol class="ax-next-steps">
        <li><b>Analiza aplicării</b><span>Comisia se uită la cifre, la echipă și, mai ales, la ambiția ta.</span></li>
        <li><b>O discuție scurtă</b><span>Dacă avem întrebări, te sunăm pentru câteva minute.</span></li>
        <li><b>Decizia, în cel mult 10 zile lucrătoare</b><span>Primești răspunsul pe email, la ${esc(d.email)}.</span></li>
      </ol>
      <a class="btn btn-ghost" href="/despre">Între timp, vezi cum arată programul</a>
    </div>`;
    const box = $('.ax-done', form); focusStep(); box.focus({ preventScroll: true });
  }

  // ---------- pornirea: ciorna din browser, linkul de reluare, cohorta din adresă ----------
  async function start() {
    let st = null;
    try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (st?.t && Date.now() - st.t > DRAFT_DAYS * 864e5) { st = null; try { localStorage.removeItem(KEY); } catch (e) {} }
    const reia = qs.get('reia');
    if (reia) {
      const j = await fetch(`/api/aplica?reia=${encodeURIComponent(reia)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (j) { token = reia; st = { token, cur: Math.min((j.pas || 1) + 1, N), maxSeen: Math.min((j.pas || 1) + 1, N), d: { ...j, acord: true } }; }
    }
    if (st?.d) {
      fill(st.d); token = st.token || null;
      maxSeen = Math.min(st.maxSeen || st.cur || 0, N);
    }
    if (qs.get('editie')) { const r = form.querySelector(`[name="editie"][value="${CSS.escape(qs.get('editie'))}"]`); if (r) r.checked = true; }
    const resumeAt = Math.min(st?.cur || 0, N);
    if (resumeAt >= 1 && st?.d?.nume) {
      const box = $('#ax-resume');
      box.hidden = false;
      box.innerHTML = `<div><b>Bine ai revenit, ${esc(st.d.nume.split(/\s+/)[0])}.</b><span>Aplicarea ta e salvată la pasul ${resumeAt} din ${N}: ${esc(STEPS[resumeAt - 1].titlu)}.</span></div>
        <button class="btn btn-primary" type="button" data-go="${resumeAt}">Continuă de aici</button>`;
      $('.ax-start .btn', form).classList.replace('btn-primary', 'btn-ghost');
      $('.ax-start .btn', form).firstChild.textContent = 'Ia-o de la pasul 1 ';
      $('.ax-start .btn', form).dataset.go = '1';
      if (reia) { cur = 0; }
    }
    history.replaceState({ step: 0 }, '', location.pathname + location.search);
    paint();
  }
  start();
})();
