/* Homepage „2029” (previzualizare): numărătoarea inversă, inelul cohortei, navigatorul, verificarea potrivirii,
   apariția la scroll, cifrele care cresc și lumina care urmărește cursorul pe carduri. */
(() => {
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (n, d = 0) => n.toLocaleString('ro-RO', { maximumFractionDigits: d, minimumFractionDigits: d });

  // ---------- apariția la scroll, inelul, cifrele ----------
  const countUp = (el) => {
    const to = Number(el.dataset.xCount); if (!to || calm) return;
    const t0 = performance.now(), dur = 1100;
    const tick = (now) => { const p = Math.min(1, (now - t0) / dur); el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  };
  const seen = (el) => {
    el.classList.add('in');
    $$('[data-x-count]', el).forEach(countUp);
    $$('[data-x-ring]', el).forEach((c) => { c.style.strokeDashoffset = c.dataset.xRing; });
  };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); seen(e.target); } }), { threshold: 0.15 }) : null;
  $$('[data-x-in]').forEach((el) => (io ? io.observe(el) : seen(el)));

  // ---------- numărătoarea până la următorul atelier ----------
  $$('[data-x-countdown]').forEach((box) => {
    const end = new Date(box.dataset.xCountdown).getTime();
    const u = Object.fromEntries($$('[data-u]', box).map((b) => [b.dataset.u, b]));
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      let s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      if (s === 0) { $('.x-k', box).textContent = 'Atelierul e în desfășurare'; }
      const d = Math.floor(s / 86400); s -= d * 86400;
      const h = Math.floor(s / 3600); s -= h * 3600;
      const m = Math.floor(s / 60); s -= m * 60;
      u.d.textContent = d; u.h.textContent = pad(h); u.m.textContent = pad(m); u.s.textContent = pad(s);
    };
    tick(); setInterval(tick, 1000);
  });

  // ---------- navigatorul: tab-uri cu tastatura și cu atingerea ----------
  $$('[data-x-navi]').forEach((box) => {
    const tabs = $$('[role="tab"]', box);
    const pick = (t, focus) => {
      tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; $('#' + x.getAttribute('aria-controls')).hidden = !on; });
      if (focus) t.focus();
      const row = t.parentElement;
      if (row.scrollWidth > row.clientWidth) row.scrollTo({ left: t.offsetLeft - 16, behavior: calm ? 'auto' : 'smooth' });
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => pick(t));
      t.addEventListener('keydown', (e) => {
        const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (d) { e.preventDefault(); pick(tabs[(i + d + tabs.length) % tabs.length], true); }
      });
    });
  });

  // ---------- verificarea potrivirii (doar cifre agregate ale cohortelor) ----------
  $$('[data-x-fit]').forEach((box) => {
    const C = JSON.parse(box.dataset.xFit);
    const ca = $('[data-x-i="ca"]', box), ang = $('[data-x-i="ang"]', box);
    const bars = $$('.x-hist i', box), out = (k) => $(`[data-x-o="${k}"]`, box);
    // scale logaritmice: 0,2–500 mil. lei și 1–1.000 de angajați
    const logv = (v, a, b) => Math.exp(Math.log(a) + (v / 1000) * (Math.log(b) - Math.log(a)));
    const money = (x) => (x >= 1e6 ? `${fmt(x / 1e6, x < 1e7 ? 1 : 0)} mil. lei` : `${fmt(Math.round(x / 1e4) * 1e4)} lei`);
    const update = () => {
      const v = logv(+ca.value, 2e5, 5e8), n = Math.round(logv(+ang.value, 1, 1000));
      [ca, ang].forEach((r) => r.style.setProperty('--v', `${r.value / 10}%`));
      out('ca').textContent = money(v);
      out('ang').textContent = fmt(n);
      bars.forEach((b, i) => b.classList.toggle('on', v >= C.bins[i][0] && v < C.bins[i][1]));
      const vd = out('verdict');
      let t, cls = 'ok';
      if (v < C.prag) { t = 'Sub pragul de aproximativ 500.000 € pe an. Aplică totuși dacă ai un avantaj inovativ: comitetul se uită și la ambiție.'; cls = 'low'; }
      else if (v < C.q1) t = `Ai fi printre companiile mai mici din cohortă, cu mult loc de creștere. Jumătate dintre colegi au între ${money(C.q1)} și ${money(C.q3)}.`;
      else if (v <= C.q3) t = `Ești în inima cohortei: jumătate dintre companii au între ${money(C.q1)} și ${money(C.q3)}.`;
      else t = 'Ai fi printre companiile mari din cohortă: ai multe de dat și de luat în discuțiile dintre egali.';
      vd.textContent = `${t}${C.medAng ? ` Mediana echipelor: ${fmt(C.medAng)} ${C.medAng % 100 >= 20 || C.medAng % 100 === 0 ? 'de ' : ''}angajați.` : ''}`;
      vd.className = `x-fit-v ${cls}`;
    };
    [ca, ang].forEach((r) => r.addEventListener('input', update));
    update();
  });

  // ---------- lumina care urmărește cursorul pe carduri (doar cu mouse) ----------
  if (matchMedia('(hover: hover)').matches) {
    $$('.x-tile').forEach((t) => t.addEventListener('pointermove', (e) => {
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', `${e.clientX - r.left}px`); t.style.setProperty('--my', `${e.clientY - r.top}px`);
    }));
  }

  // ---------- header-ul: mai compact și mai opac după primul scroll ----------
  const hdr = $('.hdr');
  if (hdr) { const on = () => hdr.classList.toggle('is-scrolled', scrollY > 12); addEventListener('scroll', on, { passive: true }); on(); }
})();
