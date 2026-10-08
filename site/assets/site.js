/* Interacțiunile site-ului: mega-meniul (desktop: hover/click; mobil: meniu lateral cu acordeon) și testul „Ești potrivit?”. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const btn = $('.menu-btn'), nav = $('#nav'), scrim = $('.mm-scrim');
  const items = $$('.mm-item');
  const desktop = matchMedia('(min-width: 1181px)');

  function setOpen(item, open) {
    item.classList.toggle('open', open);
    $('.mm-trigger', item).setAttribute('aria-expanded', String(open));
  }
  function openOnly(item) {
    items.forEach((i) => setOpen(i, i === item));
    if (scrim) scrim.hidden = !(item && desktop.matches);
  }
  const closeAll = () => openOnly(null);

  // desktop: se deschide la hover (cu o mică întârziere, ca să nu clipească la trecerea mouse-ului) și la click
  let timer;
  items.forEach((item) => {
    const trigger = $('.mm-trigger', item);
    item.addEventListener('mouseenter', () => { if (!desktop.matches) return; clearTimeout(timer); timer = setTimeout(() => openOnly(item), 90); });
    item.addEventListener('mouseleave', () => { if (!desktop.matches) return; clearTimeout(timer); timer = setTimeout(closeAll, 160); });
    trigger.addEventListener('click', () => {
      clearTimeout(timer);
      if (item.classList.contains('open')) { setOpen(item, false); if (scrim) scrim.hidden = true; } else openOnly(item);
    });
  });
  scrim?.addEventListener('click', closeAll);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = items.find((i) => i.classList.contains('open'));
    if (open) { closeAll(); $('.mm-trigger', open).focus(); } else if (nav.classList.contains('open')) toggleNav(false);
  });
  // focusul care iese din meniu îl închide (navigare cu tastatura)
  nav?.addEventListener('focusout', (e) => { if (desktop.matches && !nav.contains(e.relatedTarget)) closeAll(); });

  // mobil: butonul deschide meniul lateral
  function toggleNav(open) {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Închide meniul' : 'Deschide meniul');
    document.body.style.overflow = open ? 'hidden' : '';
    if (!open) closeAll();
  }
  btn?.addEventListener('click', () => toggleNav(!nav.classList.contains('open')));
  desktop.addEventListener('change', () => { toggleNav(false); closeAll(); });

  // ?meniu=<secțiune> deschide direct un panou (pentru previzualizări și capturi)
  const m = new URLSearchParams(location.search).get('meniu'), deschis = items.find((i) => i.dataset.mm === m);
  if (deschis) { if (!desktop.matches) toggleNav(true); openOnly(deschis); }

  // ---------- apariția la scroll ----------
  // Titlurile urcă rând cu rând dintr-o mască, restul elementelor apar discret, pe rând; cifrele numără până la valoare.
  // Pornește doar cu html.rv (setat în <head> când „reduce motion” e oprit). Hero-ul nu se animă.
  if (document.documentElement.classList.contains('rv') && 'IntersectionObserver' in window) {
    const STEP = 60, MAX_STEPS = 8;
    const TITLES = '.sec h2, .cycle h3, .cta-in h2';
    const ITEMS = ['.sec .eyebrow', '.sec .lead', '.sec .link-arrow', '.proof .stat', '.step', '.theme', '.person', '.fig', '.fine', '.sector',
      '.cycle-copy > p:not(.eyebrow)', '.cycle-item', '.tl', '.checks li', '.quiz', '.logo-cell', '.cta-in p', '.cta-in .hero-actions'].join(', ');

    // întârzierea: poziția elementului printre frații lui animați, ca un grup să apară pe rând
    const order = new Map();
    const delay = (el) => { const p = el.parentElement, n = order.get(p) || 0; order.set(p, n + 1); return Math.min(n, MAX_STEPS) * STEP; };

    // împarte un titlu în rânduri (după cum le așază browserul) și învelește fiecare rând într-o mască
    function splitLines(el) {
      const original = el.innerHTML;
      const escH = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
      el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="rv-w">${escH(w)}</span>`).join(' ');
      const lines = [];
      el.querySelectorAll('.rv-w').forEach((w) => {
        const last = lines[lines.length - 1];
        if (last && Math.abs(last.top - w.offsetTop) < 4) last.words.push(w.innerHTML); else lines.push({ top: w.offsetTop, words: [w.innerHTML] });
      });
      el.innerHTML = lines.map((l, i) => `<span class="rv-ln"><span style="--rv-d:${i * 90}ms">${l.words.join(' ')}</span></span>`).join('');
      el.classList.add('rv-title');
      // după animație, titlul revine la textul original, ca să se reașeze normal la redimensionare
      el._restore = () => setTimeout(() => { el.innerHTML = original; el.classList.remove('rv-title'); }, 900 + lines.length * 90);
    }

    // cifrele numără de la 0 la valoare
    const fmt = (v, dec) => v.toLocaleString('ro-RO', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    function count(el) {
      el.querySelectorAll('[data-count]').forEach((n) => {
        const to = parseFloat(n.dataset.count), dec = Number(n.dataset.dec || 0), start = performance.now() + 150, dur = 1100;
        n.textContent = fmt(0, dec);
        const tick = (now) => {
          const p = Math.min(1, Math.max(0, (now - start) / dur));
          n.textContent = fmt(to * (1 - Math.pow(1 - p, 3)), dec);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }

    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add('in');
      if (el.querySelector('[data-count]')) count(el);
      el._restore?.();
      io.unobserve(el);
    }), { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    // după încărcarea fonturilor, ca rândurile titlurilor să fie măsurate corect
    (document.fonts?.ready || Promise.resolve()).then(() => {
      $$(TITLES).forEach((el) => { splitLines(el); io.observe(el); });
      $$(ITEMS).forEach((el) => { el.setAttribute('data-rv', ''); el.style.setProperty('--rv-d', delay(el) + 'ms'); io.observe(el); });
      $$('.timeline').forEach((el) => io.observe(el));
    });
  }

  // „Ești potrivit?”: răspuns imediat, fără date trimise nicăieri
  const quiz = $('#quiz'), out = $('#quiz-out');
  quiz?.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(quiz));
    if (!v.ca || !v.rol || !v.nevoie) { out.innerHTML = '<b>Mai ai o întrebare</b>Răspunde la toate trei ca să vezi rezultatul.'; return; }
    const tema = { vanzari: 'Vânzări și Motorul de Vânzări', echipa: 'Cultura organizațională', strategie: 'Modelul de business', finantare: 'atelierul de seară de Finanțare' }[v.nevoie];
    if (v.ca === 'sub') {
      out.innerHTML = `<b>Poate puțin prea devreme</b>Programul e gândit pentru companii de peste 500.000 €. Intră pe lista de așteptare și te anunțăm când ești pregătit sau când apare un format potrivit. <a href="/aplica">Lista de așteptare →</a>`;
    } else if (v.rol === 'altul') {
      out.innerHTML = `<b>Recomandă-l cuiva din conducere</b>Atelierele sunt pentru fondatori și manageri de top, cei care pot duce schimbările în companie. <a href="/program">Trimite-le programul →</a>`;
    } else {
      out.innerHTML = `<b>Pari potrivit pentru Antreprenoria</b>Pentru ce vrei să rezolvi, te interesează mai ales ${tema}. <a href="/aplica">Aplică acum →</a>`;
    }
  });
})();
