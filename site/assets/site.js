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

  // ---------- tab-uri (întrebarea din hero, curriculum) ----------
  // fiecare [data-tabs] are butoane [role=tab][data-tab] și panouri [data-panel]; săgețile stânga/dreapta mută selecția
  $$('[data-tabs]').forEach((box) => {
    const tabs = $$('[role="tab"]', box);
    const select = (t, focus) => {
      tabs.forEach((x) => x.setAttribute('aria-selected', String(x === t)));
      $$('[data-panel]', box).forEach((p) => (p.hidden = p.dataset.panel !== t.dataset.tab));
      // rândurile de tab-uri care se derulează orizontal (pe mobil) aduc tab-ul ales în vizor
      const row = t.parentElement;
      if (row.scrollWidth > row.clientWidth) row.scrollTo({ left: Math.max(0, t.offsetLeft - row.offsetLeft - 16), behavior: 'smooth' });
      // elementele din panourile ascunse n-au apucat animația de apariție la scroll: le arătăm direct
      $$('[data-rv]', box).forEach((el) => el.classList.add('in'));
      // pe mobil, răspunsul poate fi sub ecran: îl aducem în vizor
      if (!focus && matchMedia('(max-width: 720px)').matches && box.classList.contains('ask')) {
        const p = $(`[data-panel="${t.dataset.tab}"]`, box), r = p.getBoundingClientRect();
        if (r.top > innerHeight * 0.75) p.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (focus) t.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        select(tabs[(i + d + tabs.length) % tabs.length], true);
      });
    });
  });

  // ---------- apariția la scroll ----------
  // Titlurile urcă rând cu rând dintr-o mască, restul elementelor apar discret, pe rând; cifrele numără până la valoare.
  // Pornește doar cu html.rv (setat în <head> când „reduce motion” e oprit). Hero-ul nu se animă.
  if (document.documentElement.classList.contains('rv') && 'IntersectionObserver' in window) {
    const STEP = 60, MAX_STEPS = 8;
    const TITLES = '.sec h2, .cycle h3, .cta-band h2';
    const ITEMS = ['.sec .eyebrow', '.sec .lead', '.sec .link-arrow', '.proof .stat', '.step', '.cur', '.pulse-stat', '.feed-item', '.person', '.fig', '.fine', '.sector',
      '.cycle-copy > p:not(.eyebrow)', '.cycle-item', '.tl', '.checks li', '.quiz', '.logo-cell', '.cta-band-copy > p:not(.eyebrow)', '.cta-band .hero-actions', '.agenda-card',
      '.ag-item', '.ed-person', '.ed-part', '.benefit', '.ed-strategic', '.ed-sponsor', '.ed-nav a'].join(', ');

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
        // garanție: valoarea finală apare chiar dacă browserul a oprit animațiile (tab în fundal, economie de energie)
        setTimeout(() => { n.textContent = fmt(to, dec); }, 150 + dur + 300);
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

  // ---------- mozaicul din hero ----------
  // Din câteva în câteva secunde, un portret ales la întâmplare lasă locul altui antreprenor din rezervă.
  // Se oprește când mozaicul nu se vede, când tab-ul e în fundal și pentru „reduce motion”.
  const mosaic = $('.mosaic');
  if (mosaic && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const pool = JSON.parse(mosaic.dataset.pool || '[]');
    const tiles = $$('figure.mz', mosaic);
    let ptr = 0, last = null, visible = true;
    function swap() {
      if (!visible || document.hidden || pool.length <= tiles.length) return;
      const free = tiles.filter((t) => t !== last && !t.matches(':hover'));
      const t = free[Math.floor(Math.random() * free.length)];
      if (!t) return;
      const shown = new Set(tiles.map((x) => Number(x.dataset.k)));
      // următorul portret nefolosit; piesele mari iau doar poze la rezoluție mare (traineri, invitați)
      const big = t.hasAttribute('data-big');
      for (let n = 0; n < pool.length && (shown.has(ptr % pool.length) || (big && !pool[ptr % pool.length].s)); n++) ptr++;
      const k = ptr++ % pool.length, p = pool[k];
      if (shown.has(k)) return;
      const front = $('img.on', t), back = $$('img', t).find((i) => i !== front);
      t.dataset.k = k;
      const show = () => {
        back.classList.add('on'); front.classList.remove('on');
      };
      // aceeași poză deja încărcată în stratul din spate nu mai declanșează „load”
      if (back.src === p.i && back.complete) show(); else { back.onload = show; back.src = p.i; }
      last = t;
    }
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(mosaic);
    setInterval(swap, 2400);
  }

  // ---------- „Vezi toate” (pe mobil, listele lungi arată doar primele elemente) ----------
  $$('[data-more]').forEach((b) => b.addEventListener('click', () => { b.previousElementSibling?.classList.add('all'); b.remove(); }));

  // ---------- bara de acțiune de jos (doar pe mobil) ----------
  // Apare după primul ecran; dispare când se vede banda finală sau footerul (au deja acțiunile) și când e deschis meniul.
  const mcta = $('.mcta');
  if (mcta) {
    const mobile = matchMedia('(max-width: 720px)');
    const ends = $$('.cta-band, .ftr');
    const atEnd = new Set();
    const update = () => {
      const on = mobile.matches && scrollY > innerHeight * 0.8 && !atEnd.size && !nav?.classList.contains('open');
      mcta.classList.toggle('on', on);
      document.body.classList.toggle('has-mcta', mobile.matches);
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? atEnd.add(e.target) : atEnd.delete(e.target))); update(); });
      ends.forEach((el) => io.observe(el));
    }
    addEventListener('scroll', update, { passive: true });
    mobile.addEventListener('change', update);
    btn?.addEventListener('click', () => setTimeout(update, 0));
    update();
  }

  const isMobile = () => matchMedia('(max-width: 720px)').matches;

  // ---------- conținut care se derulează orizontal: estompare pe marginea unde mai e ceva ----------
  // (tab-uri, istoricul, meniul de secțiuni, matricea, benzile de oameni și logo-uri)
  $$('.cur-tabs, .hist, .pg-nav .wrap, .tm-matrix-wrap, .ed-tablist, .ask-chips, .people, .logos, .ed-people').forEach((el) => {
    const upd = () => {
      const more = el.scrollWidth - el.clientWidth > 4;
      el.classList.toggle('sx-l', more && el.scrollLeft > 4);
      el.classList.toggle('sx-r', more && el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    };
    el.addEventListener('scroll', upd, { passive: true });
    addEventListener('resize', upd);
    upd();
  });

  // ---------- meniul de secțiuni (Program, Despre, Teme): marchează secțiunea în care ești ----------
  const pgnav = $('.pg-nav');
  if (pgnav && 'IntersectionObserver' in window) {
    const links = $$('a[href^="#"]', pgnav), row = $('.wrap', pgnav);
    const targets = links.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
    const seen = new Map();
    const mark = () => {
      const cur = targets.filter((t) => seen.get(t)).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
      links.forEach((a) => {
        const on = cur && a.getAttribute('href') === '#' + cur.id;
        if (on && !a.classList.contains('on') && row.scrollWidth > row.clientWidth) row.scrollTo({ left: Math.max(0, a.offsetLeft - row.offsetLeft - 16), behavior: 'smooth' });
        a.classList.toggle('on', !!on);
      });
    };
    const io = new IntersectionObserver((es) => { es.forEach((e) => seen.set(e.target, e.isIntersecting)); mark(); }, { rootMargin: '-140px 0px -55% 0px' });
    targets.forEach((t) => io.observe(t));
  }

  // ---------- footer pe mobil: listele de linkuri se deschid la atingere ----------
  $$('.ftr-cols nav h4').forEach((h) => {
    h.setAttribute('role', 'button'); h.tabIndex = 0;
    const toggle = () => { if (!isMobile()) return; const open = h.parentElement.classList.toggle('open'); h.setAttribute('aria-expanded', String(open)); };
    h.setAttribute('aria-expanded', 'false');
    h.addEventListener('click', toggle);
    h.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });

  // ---------- agenda ediției pe mobil: atelierul următor rămâne închis (pe desktop e deschis) ----------
  if (isMobile()) $$('details.ag-item[open]').forEach((d) => d.removeAttribute('open'));

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
