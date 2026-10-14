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
    // panoul rămâne deschis cât timp cineva scrie în el (căutarea din Comunitate), chiar dacă mouse-ul pleacă
    item.addEventListener('mouseleave', () => { if (!desktop.matches) return; clearTimeout(timer); if (item.contains(document.activeElement) && document.activeElement.matches('input')) return; timer = setTimeout(closeAll, 160); });
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

// căutarea după nume sau companie, comună pentru /alumni și /traineri
// numele: întâi potrivirile de la început de cuvânt; la greșeli de tastare, cel mai apropiat nume
// compania: toți oamenii din compania care conține cuvintele căutate (la început de cuvânt)
const peopleSearch = (() => {
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  // distanța de editare (pentru greșeli de tastare în nume)
  const lev = (a, b) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  };
  // cât de bine se potrivește un nume: fiecare cuvânt căutat trebuie găsit; începutul de cuvânt contează mai mult
  const nameScore = (n, words) => {
    const parts = n.split(' ');
    let s = 0;
    for (const w of words) {
      if (parts.some((p) => p === w)) s += 3;
      else if (parts.some((p) => p.startsWith(w))) s += 2;
      else if (n.includes(w)) s += 1;
      else return 0;
    }
    return s;
  };
  // numele și compania fiecărui card, fără diacritice, plus ordinea inițială (refăcută când se golește căutarea)
  const prep = (cards, nameSel, coSel) => cards.forEach((c, i) => { c._i = i; c._n = norm(c.querySelector(nameSel)?.textContent); c._c = norm(c.querySelector(coSel)?.textContent); });
  const find = (cards, raw) => {
    const q = norm(raw), words = q.split(' ');
    const byCo = cards.filter((c) => c._c && words.every((w) => c._c.split(' ').some((p) => p.startsWith(w))));
    const scored = cards.map((c) => [c, nameScore(c._n, words)]).filter(([, s]) => s);
    const strong = scored.filter(([, s]) => s >= words.length * 2);
    const byName = (strong.length ? strong : scored).sort((a, b) => b[1] - a[1]).map(([c]) => c);
    let shown = [...new Set([...byName, ...byCo])], fuzzy = false;
    if (!shown.length && q.length >= 3) {
      const tol = (w) => (w.length >= 7 ? 2 : w.length >= 4 ? 1 : 0);
      const near = cards.map((c) => {
        const parts = c._n.split(' ');
        let sum = 0;
        for (const w of words) {
          const d = Math.min(...parts.map((p) => Math.min(lev(w, p), p.length > w.length ? lev(w, p.slice(0, w.length)) : 99)));
          if (d > tol(w)) return [c, 99];
          sum += d;
        }
        return [c, sum];
      }).filter(([, d]) => d < 99).sort((a, b) => a[1] - b[1]);
      if (near.length) { shown = near.filter(([, d]) => d === near[0][1]).slice(0, 4).map(([c]) => c); fuzzy = true; }
    }
    return { shown, fuzzy };
  };
  // leagă un câmp de căutare: așteaptă puțin după tastare, Escape golește, ?q= din adresă pornește căutarea
  const bind = (input, onChange) => {
    if (!input) return;
    // pe ecranele înguste, textul lung din câmp s-ar tăia: folosim varianta scurtă
    if (input.dataset.short && matchMedia('(max-width: 480px)').matches) input.placeholder = input.dataset.short;
    let t;
    input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => onChange(input.value.trim()), 120); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { input.value = ''; onChange(''); } });
    const q0 = new URLSearchParams(location.search).get('q');
    if (q0) { input.value = q0; onChange(q0); }
  };
  return { prep, find, bind };
})();

// /lideri/<id>: întrebările, filtrate după temă, și copierea uneia (de pus în notițe înainte de atelier)
(() => {
  const box = document.querySelector('.ld-qs');
  if (!box) return;
  const items = [...box.querySelectorAll('.ld-q-list li')];
  box.querySelectorAll('[data-ld-q]').forEach((b) => b.addEventListener('click', () => {
    box.querySelectorAll('[data-ld-q]').forEach((x) => x.classList.toggle('on', x === b));
    items.forEach((li) => { li.hidden = b.dataset.ldQ ? li.dataset.tema !== b.dataset.ldQ : !('top' in li.dataset); });
    const more = box.querySelector('.ld-q-more'); if (more) more.hidden = !!b.dataset.ldQ;
  }));
  box.addEventListener('click', async (ev) => {
    const b = ev.target.closest('.ld-copy');
    if (!b) return;
    try { await navigator.clipboard.writeText(b.dataset.copy); } catch { return; }
    b.classList.add('done');
    setTimeout(() => b.classList.remove('done'), 1400);
  });
})();

// /lideri: filtrele după rol și după temă (se combină) și căutarea după nume sau companie
(() => {
  const grid = document.querySelector('.tr-grid');
  if (!grid) return;
  const cards = [...grid.querySelectorAll('.tr-card')];
  peopleSearch.prep(cards, '.tr-tx b', '.tr-tx > span');
  const input = document.querySelector('#tr-q'), note = document.querySelector('.tr-q-note'), empty = document.querySelector('.tr-empty');
  const tema = document.querySelector('#tr-tema'), count = document.querySelector('.tr-count');
  const state = { rol: '', tema: '', q: '' };
  const key = (v) => String(v || '').replace(/\s+/g, '-');
  // adresa se actualizează la fiecare filtru sau căutare (?rol=, ?tema=, ?q=)
  const syncUrl = () => {
    const u = new URL(location.href);
    state.rol ? u.searchParams.set('rol', key(state.rol)) : u.searchParams.delete('rol');
    state.tema ? u.searchParams.set('tema', state.tema) : u.searchParams.delete('tema');
    state.q ? u.searchParams.set('q', state.q) : u.searchParams.delete('q');
    history.replaceState(null, '', u.pathname + u.search + u.hash);
  };
  const apply = () => {
    let shown = [];
    note.hidden = true;
    if (!state.q) {
      cards.slice().sort((a, b) => a._i - b._i).forEach((c) => grid.append(c));
      cards.forEach((c) => { const ok = (!state.rol || c.dataset.rol.split('|').includes(state.rol)) && (!state.tema || c.dataset.teme.split(' ').includes(state.tema)); c.hidden = !ok; if (ok) shown.push(c); });
    } else {
      const r = peopleSearch.find(cards, state.q);
      shown = r.shown;
      if (r.fuzzy) { note.textContent = `Nu am găsit exact „${state.q}”. Cel mai apropiat:`; note.hidden = false; }
      cards.forEach((c) => { c.hidden = !shown.includes(c); });
      [...shown, ...cards.filter((c) => !shown.includes(c))].forEach((c) => grid.append(c));
    }
    empty.hidden = shown.length > 0;
    if (count) count.innerHTML = shown.length === cards.length ? `<b>${cards.length}</b> oameni care au predat în program` : `<b>${shown.length}</b> din ${cards.length}`;
  };
  const setFilter = (g, b) => { g.querySelectorAll('[data-tr]').forEach((x) => x.classList.toggle('on', x === b)); state[g.dataset.trGroup] = b.dataset.tr; };
  document.querySelectorAll('[data-tr-group]').forEach((g) => g.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tr]');
    if (!b) return;
    setFilter(g, b);
    // un filtru ales golește căutarea
    if (state.q) { state.q = ''; if (input) input.value = ''; }
    apply();
    syncUrl();
  }));
  // filtrele din adresă: ?rol=antreprenor-invitat, ?tema=vanzari
  const q = new URLSearchParams(location.search);
  if (tema) {
    tema.addEventListener('change', () => { state.tema = tema.value; if (state.q) { state.q = ''; if (input) input.value = ''; } apply(); syncUrl(); });
    const t0 = q.get('tema');
    if (t0 && [...tema.options].some((o) => o.value === t0)) { tema.value = t0; state.tema = t0; }
  }
  [['rol', 'rol']].forEach(([p, gname]) => {
    const v = q.get(p), g = document.querySelector(`[data-tr-group="${gname}"]`);
    const b = v && g && [...g.querySelectorAll('[data-tr]')].find((x) => x.dataset.tr && key(x.dataset.tr) === v);
    if (b) { setFilter(g, b); if (g.scrollWidth > g.clientWidth) g.scrollLeft = b.offsetLeft - g.offsetLeft - 16; }
  });
  apply();
  // căutarea se face în toți oamenii: filtrele revin la „Toți” / „Toate temele”
  peopleSearch.bind(input, (v) => {
    state.q = v;
    if (v) { document.querySelectorAll('[data-tr-group]').forEach((g) => setFilter(g, g.querySelector('[data-tr=""]'))); if (tema) { tema.value = ''; state.tema = ''; } }
    apply();
    syncUrl();
  });
})();

// „Ce vrei să rezolvi?” pe mobil: contorul cu săgeți și o mică mișcare a rândului la prima vedere
(() => {
  const box = document.querySelector('.ask');
  if (!box) return;
  const tabs = [...box.querySelectorAll('[role="tab"]')], count = box.querySelector('.ask-count'), row = box.querySelector('.ask-chips');
  const idx = () => tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
  const sync = () => { if (count) count.textContent = `${idx() + 1} din ${tabs.length}`; };
  tabs.forEach((t) => t.addEventListener('click', () => setTimeout(sync)));
  box.querySelectorAll('[data-ask-step]').forEach((b) => b.addEventListener('click', () => {
    const i = (idx() + Number(b.dataset.askStep) + tabs.length) % tabs.length;
    tabs[i].click();
  }));
  if (!row || !matchMedia('(max-width: 720px)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const io = new IntersectionObserver((es) => {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    setTimeout(() => { row.scrollTo({ left: 90, behavior: 'smooth' }); setTimeout(() => row.scrollTo({ left: 0, behavior: 'smooth' }), 700); }, 400);
  }, { threshold: 0.8 });
  io.observe(row);
})();

// benzile care se derulează orizontal pe mobil (oameni, logo-uri): săgeți și o mică mișcare la prima vedere
(() => {
  const mobile = matchMedia('(max-width: 720px)');
  if (!mobile.matches) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.people, .ed-people, .logos').forEach((row) => {
    const items = [...row.children].filter((x) => !x.hidden && x.offsetParent !== null);
    if (row.scrollWidth <= row.clientWidth + 8 || items.length < 3) return;
    const bar = document.createElement('div');
    bar.className = 'strip-nav';
    bar.innerHTML = '<span class="strip-btns"><button type="button" aria-label="Înapoi">‹</button><button type="button" aria-label="Înainte">›</button></span>';
    row.after(bar);
    const [prev, next] = bar.querySelectorAll('button');
    // săgețile se dezactivează la capetele benzii
    const update = () => {
      prev.disabled = row.scrollLeft < 8;
      next.disabled = row.scrollLeft + row.clientWidth >= row.scrollWidth - 8;
    };
    // saltul merge din card în card (rândul are fixare pe carduri, deci ținta trebuie să fie exact începutul unui card)
    const go = (dir) => {
      const x0 = row.getBoundingClientRect().left + parseFloat(getComputedStyle(row).paddingLeft || 0);
      const pos = items.map((x) => x.getBoundingClientRect().left - x0 + row.scrollLeft);
      // cardul cel mai apropiat de poziția curentă, apoi următorul / anteriorul
      const cur = pos.reduce((b, p, k) => (Math.abs(p - row.scrollLeft) < Math.abs(pos[b] - row.scrollLeft) ? k : b), 0);
      const i = Math.max(0, Math.min(items.length - 1, cur + dir));
      row.scrollTo({ left: pos[i], behavior: 'smooth' });
      // unele browsere ignoră derularea lină pe rândurile cu fixare: atunci sărim direct
      setTimeout(() => { if (Math.abs(row.scrollLeft - pos[i]) > 6) row.scrollTo({ left: pos[i] }); update(); }, 450);
    };
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    let tm;
    row.addEventListener('scroll', () => { clearTimeout(tm); tm = setTimeout(update, 60); }, { passive: true });
    update();
    if (still) return;
    const io = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      if (row.scrollLeft > 8) return;
      setTimeout(() => { row.scrollTo({ left: 70, behavior: 'smooth' }); setTimeout(() => row.scrollTo({ left: 0, behavior: 'smooth' }), 650); }, 350);
    }, { threshold: 0.6 });
    io.observe(row);
  });
})();

// /alumni și /traineri deschise cu un filtru în adresă (fără #lista): pornesc direct de la filtre și listă
(() => {
  const list = document.getElementById('lista');
  if (!list) return;
  const q = new URLSearchParams(location.search);
  if (location.hash !== '#lista' && !['sector', 'editie', 'rol', 'tema', 'oras', 'q'].some((k) => q.get(k))) return;
  // după fonturi și imagini titlul de sus își schimbă înălțimea: ne repoziționăm, dacă omul n-a derulat între timp
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; // la reîncărcare, browserul nu mai pune poziția veche peste a noastră
  const go = () => list.scrollIntoView({ block: 'start' });
  go();
  let moved = false;
  addEventListener('wheel', () => { moved = true; }, { once: true, passive: true });
  addEventListener('touchstart', () => { moved = true; }, { once: true, passive: true });
  const again = () => { if (!moved) go(); };
  document.fonts?.ready.then(again);
  addEventListener('load', again);
})();
// /parteneri: formularul „Susține programul” (sponsorizare, găzduire, mentorat), deschis cu opțiunea butonului deja bifată
(() => {
  const dlg = document.getElementById('implica');
  if (!dlg) return;
  const form = dlg.querySelector('#im-form'), done = dlg.querySelector('.im-done'), status = form.querySelector('.af-status');
  // msg: mesajul precompletat (configuratorul și butoanele „Rezervă” de pe /parteneri)
  const open = (tip, msg) => {
    form.hidden = false; done.hidden = true; status.textContent = ''; status.className = 'af-status';
    if (msg) form.elements.mesaj.value = msg;
    // butonul fără opțiune („Devino partener”) deschide formularul fără nicio alegere bifată
    form.querySelectorAll('input[name="tip"]').forEach((r) => { r.checked = !!tip && r.value === tip; });
    dlg.showModal();
    // după alegerea opțiunii, primul câmp gol primește focusul
    setTimeout(() => (form.querySelector('input[name="tip"]:checked') ? form.querySelector('#im-nume') : form.querySelector('input[name="tip"]')).focus(), 50);
  };
  document.querySelectorAll('[data-implica]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); open(b.dataset.implica, b.dataset.imMsg); }));
  window.spImplica = open;
  dlg.querySelectorAll('[data-im-close]').forEach((b) => b.addEventListener('click', () => dlg.close()));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }); // click pe fundal
  // aceeași validare ca pe server (site/implicare.js)
  const check = () => {
    const v = (k) => (form.elements[k]?.value || '').trim(), errs = {};
    if (!form.querySelector('input[name="tip"]:checked')) errs.tip = 'Alege cum vrei să te implici.';
    if (v('nume').split(/\s+/).filter(Boolean).length < 2) errs.nume = 'Scrie numele și prenumele.';
    if (v('companie').length < 2) errs.companie = 'Scrie numele companiei.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'))) errs.email = 'Adresa de email nu pare corectă.';
    if (v('telefon') && v('telefon').replace(/\D/g, '').length < 9) errs.telefon = 'Numărul de telefon pare prea scurt.';
    if (!form.elements.acord.checked) errs.acord = 'Avem nevoie de acordul tău ca să te putem contacta.';
    return errs;
  };
  const show = (errs) => {
    form.querySelectorAll('[data-f]').forEach((f) => { const m = errs[f.dataset.f]; f.classList.toggle('bad', !!m); const e = f.querySelector('.af-err'); if (e) e.textContent = m || ''; });
    const first = form.querySelector('.bad input, .bad textarea');
    if (first) first.focus();
  };
  form.addEventListener('input', (e) => { const f = e.target.closest('[data-f]'); if (f?.classList.contains('bad')) show(Object.fromEntries(Object.entries(check()).filter(([k]) => form.querySelector(`[data-f="${k}"]`).classList.contains('bad')))); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errs = check();
    show(errs);
    if (Object.keys(errs).length) return;
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true; btn.textContent = 'Se trimite…';
    const data = Object.fromEntries(new FormData(form));
    data.acord = form.elements.acord.checked;
    try {
      const r = await fetch('/api/implicare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 422 && j.errors) { show(j.errors); throw new Error(j.error); }
      if (!r.ok) throw new Error('Nu am putut trimite mesajul acum. Încearcă din nou sau scrie-ne pe email.');
      form.reset(); form.hidden = true; done.hidden = false; done.focus();
    } catch (err) {
      status.textContent = err.message || 'Nu am putut trimite mesajul.'; status.className = 'af-status err';
    } finally { btn.disabled = false; btn.textContent = 'Trimite'; }
  });
  // deschis din adresă: /parteneri?implicare=sponsorizare
  const q = new URLSearchParams(location.search).get('implicare');
  if (q !== null) open(q);
})();


// motorul de căutare al comunității, comun pentru pagina /comunitate și pentru căutarea din meniu
// fiecare element (card sau rând din index) primește prin prep() câmpurile normalizate: nume, companie, sector, descriere
const cmEngine = (() => {
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const words = (s) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);
  const escH = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  // cuvintele din întrebare care nu spun ce cauți
  const STOP = new Set('am as avem caut cautam cineva ceva care ce cu de din doresc este eu in la ma mi nevoie o pe pentru sa se si un una unei unui vreau vrem imi trebuie servicii serviciu firma companie solutii'.split(' '));
  // câteva sinonime: cum ar căuta cineva vs cum scrie compania despre ea
  const SYN = { seo: ['seo', 'marketing digital', 'search'], it: ['it', 'software', 'aplicatii', 'digital'], site: ['site', 'web', 'website'], web: ['web', 'site', 'website'], ads: ['ads', 'publicitate', 'reclame', 'paid'],
    reclama: ['reclama', 'publicitate', 'marketing'], contabil: ['contabil', 'contabilitate', 'fiscal'], avocat: ['avocat', 'juridic', 'legal'], angajari: ['angajari', 'recrutare', 'resurse umane', 'hr'], transport: ['transport', 'logistica', 'curierat'],
    casa: ['casa', 'locuinte', 'rezidential', 'constructii'], mancare: ['mancare', 'food', 'catering', 'alimentar', 'restaurant'], eveniment: ['eveniment', 'evenimente', 'conferinte'] };
  // rădăcina unui cuvânt (fără terminațiile românești): turbină, turbine, turbinei -> turbin
  const stem = (w) => (w.length > 5 ? w.slice(0, Math.max(4, w.length - 2)) : w);
  const same = (w, x) => (x.length <= 3 ? w === x : w.startsWith(stem(x)));
  const hit = (ws, term) => { const t = term.split(' '); return t.length > 1 ? ws.join(' ').includes(term) : ws.some((w) => same(w, t[0])); };
  const W = { n: 6, co: 6, o: 5, s: 3, d: 2 };
  const prep = (it, f) => { it._d = f.d || ''; it._f = { n: words(f.n), co: words(f.co), o: words(f.o), s: words(f.s), d: words(f.d) }; return it; };
  // scorul unui element pentru un termen (cu sinonimele lui): cel mai bun câmp în care apare
  const termScore = (it, alts) => Math.max(0, ...Object.keys(W).map((k) => (alts.some((a) => hit(it._f[k], a)) ? W[k] : 0)));
  // toate cuvintele trebuie găsite; dacă nu iese nimic, potrivirile parțiale (marcate ca atare)
  const search = (items, raw) => {
    const terms = words(raw).filter((w) => !STOP.has(w));
    if (!terms.length) return { list: null, terms: [] };
    const alts = terms.map((t) => SYN[t] || SYN[stem(t)] || [t]);
    const scored = items.map((it) => { const s = alts.map((a) => termScore(it, a)); return [it, s.filter(Boolean).length, s.reduce((x, y) => x + y, 0)]; });
    let list = scored.filter(([, n]) => n === terms.length), partial = false;
    if (!list.length && terms.length > 1) { list = scored.filter(([, n]) => n > 0); partial = list.length > 0; }
    list.sort((a, b) => b[1] - a[1] || b[2] - a[2]);
    return { list: list.map(([it]) => it), terms: alts.flat(), partial };
  };
  // cuvintele găsite apar marcate; cu `from`, textul pornește cu câteva cuvinte înaintea primei potriviri
  const marked = (it, terms, from = 0) => {
    const tw = terms.flatMap((t) => t.split(' '));
    const parts = it._d.split(/(\s+)/);
    const ok = parts.map((w) => { const n = words(w)[0]; return !!n && tw.some((x) => same(n, x)); });
    const start = from ? Math.max(0, ok.indexOf(true) - from * 2) : 0;
    return (start > 0 ? '… ' : '') + parts.slice(start).map((w, i) => (ok[i + start] ? `<mark>${escH(w)}</mark>` : escH(w))).join('');
  };
  return { prep, search, marked, escH };
})();

// /comunitate: căutarea după nevoie, explorarea pe felii, filtrele directorului și profilul rapid
(() => {
  const grid = document.querySelector('.cm-grid');
  if (!grid) return;
  const cards = [...grid.querySelectorAll('.cm-card')];
  const { escH } = cmEngine;
  const search = (raw) => cmEngine.search(cards, raw);
  const marked = cmEngine.marked;
  cards.forEach((c, i) => { c._i = i; cmEngine.prep(c, { n: c.querySelector('.cm-n').textContent, co: c.querySelector('.cm-co').textContent, s: c.dataset.sector, o: c.dataset.of, d: c.querySelector('.cm-d:not(.cm-d-empty)')?.textContent || '' }); });
  const mark = (c, terms) => {
    const p = c.querySelector('.cm-d:not(.cm-d-empty)');
    if (!p) return;
    c._terms = terms;
    if (!terms.length) { p.textContent = c._d; return; }
    p.innerHTML = marked(c, terms, 7);
  };

  const qIn = document.getElementById('cm-q'), qBar = document.getElementById('cm-q2');
  const sels = [...document.querySelectorAll('.cm-sel select')];
  const count = document.querySelector('.cm-count'), reset = document.querySelector('.cm-reset'), note = document.querySelector('.cm-note'), empty = document.querySelector('.cm-empty');
  const list = document.getElementById('lista');
  const state = { q: qIn?.value.trim() || '' };
  const f = (k) => sels.find((s) => s.dataset.f === k)?.value || '';
  const apply = () => {
    const r = search(state.q);
    const ok = (c) => (!f('sector') || c.dataset.sector === f('sector')) && (!f('ed') || c.dataset.ed.split(' ').includes(f('ed'))) && (!f('city') || c.dataset.city === f('city'));
    const order = r.list || cards.slice().sort((a, b) => a._i - b._i);
    const shown = order.filter(ok);
    cards.forEach((c) => { c.hidden = !shown.includes(c); mark(c, r.list ? r.terms : []); });
    [...shown, ...cards.filter((c) => !shown.includes(c))].forEach((c) => grid.append(c));
    count.innerHTML = `<b>${shown.length}</b> ${shown.length === 1 ? 'membru' : 'membri'}${state.q ? ` pentru „${escH(state.q)}”` : ''}`;
    note.hidden = !r.partial; if (r.partial) note.textContent = 'Nimeni nu se potrivește pe toate cuvintele. Iată potrivirile parțiale:';
    empty.hidden = shown.length > 0;
    reset.hidden = !state.q && !sels.some((s) => s.value);
    const u = new URL(location.href);
    sels.forEach((s) => { const q = s.selectedOptions[0]?.dataset.q; q ? u.searchParams.set(s.dataset.param, q) : u.searchParams.delete(s.dataset.param); });
    state.q ? u.searchParams.set('q', state.q) : u.searchParams.delete('q');
    history.replaceState(null, '', u.pathname + u.search + u.hash);
  };
  const setQ = (v, from) => { state.q = v; if (qIn && from !== qIn) qIn.value = v; if (qBar && from !== qBar) qBar.value = v; apply(); };
  const toList = () => list.scrollIntoView({ behavior: 'smooth', block: 'start' });
  [qIn, qBar].forEach((inp) => {
    if (!inp) return;
    if (inp.dataset.short && matchMedia('(max-width: 480px)').matches) inp.placeholder = inp.dataset.short;
    let t;
    inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => setQ(inp.value.trim(), inp), 140); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Escape') { inp.value = ''; setQ('', inp); } });
  });
  document.querySelector('.cm-search')?.addEventListener('submit', (e) => { e.preventDefault(); setQ(qIn.value.trim(), qIn); toList(); });
  document.querySelectorAll('[data-idea]').forEach((b) => b.addEventListener('click', () => { setQ(b.dataset.idea); toList(); }));
  sels.forEach((s) => s.addEventListener('change', apply));
  reset.addEventListener('click', () => { sels.forEach((s) => { s.value = ''; }); setQ(''); });
  // explorarea: filele (industrie, ediție, oraș) și felia aleasă devine filtru în director
  const tabs = [...document.querySelectorAll('.cm-tabs [role="tab"]')];
  tabs.forEach((t) => t.addEventListener('click', () => {
    tabs.forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    document.querySelectorAll('.cm-tiles').forEach((p) => { p.hidden = p.dataset.panel !== t.dataset.tab; });
  }));
  document.querySelectorAll('.cm-tile').forEach((b) => b.addEventListener('click', () => {
    sels.forEach((s) => { s.value = s.dataset.f === b.dataset.pick ? (b.dataset.id || b.dataset.val) : ''; });
    setQ('');
    toList();
  }));
  if (state.q) apply();

  // profilul rapid: panou lateral (de jos, pe mobil), cu ce face compania și conectarea prin echipă
  const dr = document.getElementById('cm-drawer'), panel = dr.querySelector('.cm-panel'), body = dr.querySelector('.cm-p-body');
  let back = null;
  const open = (c) => {
    const d = c.dataset, name = c.querySelector('.cm-n').textContent, co = c.querySelector('.cm-co').textContent;
    const av = c.querySelector('.cm-av').innerHTML.replace(/w=128/, 'w=384');
    const same = cards.filter((x) => x !== c && d.sector && x.dataset.sector === d.sector).slice(0, 3);
    const mail = dr.dataset.mail;
    const subj = encodeURIComponent(`Cerere de conectare: ${name}${co ? ` (${co})` : ''}`);
    const txt = encodeURIComponent(`Bună,\n\nAș vrea să fiu pus în legătură cu ${name}${co ? ` de la ${co}` : ''}, din comunitatea Antreprenoria.\n\nDe ce: \n\nMulțumesc!`);
    body.innerHTML = `
      <div class="cm-p-head"><span class="cm-p-av">${av}</span><div><p class="cm-p-eds">Alumni ${escH(d.eds)}</p><h2 id="cm-p-name">${escH(name)}</h2><p class="cm-p-co">${escH([d.fn, co].filter(Boolean).join(' · '))}</p></div></div>
      ${d.sector || d.city ? `<div class="cm-p-tags">${d.sector ? `<span class="cm-tag">${escH(d.sector)}</span>` : ''}${d.city ? `<span class="cm-tag">${escH(d.city)}</span>` : ''}</div>` : ''}
      <div class="cm-p-sec"><h3>Ce face</h3><p>${c._d ? (c._terms?.length ? marked(c, c._terms) : escH(c._d)) : 'Profilul e în curs de completare.'}</p></div>
      <div class="cm-p-sec cm-p-soon"><h3>Ce oferă și pentru cine</h3><p>Se completează împreună cu fiecare membru: servicii, produse și clienții potriviți.</p></div>
      <div class="cm-p-act">
        ${mail ? `<a class="btn btn-primary btn-lg" href="mailto:${escH(mail)}?subject=${subj}&body=${txt}">Cere o conectare</a>` : ''}
        ${d.url ? `<a class="btn btn-ghost" href="${escH(d.url)}" target="_blank" rel="noopener">Site ↗</a>` : ''}
        ${d.li ? `<a class="btn btn-ghost" href="${escH(d.li)}" target="_blank" rel="noopener">LinkedIn ↗</a>` : ''}
        ${d.href ? `<a class="btn btn-ghost" href="${escH(d.href)}">Pagina completă →</a>` : ''}
      </div>
      <p class="cm-p-fine">Echipa programului face introducerea. Datele de contact ale membrilor nu sunt publice.</p>
      ${same.length ? `<div class="cm-p-sec"><h3>Tot din ${escH(d.sector)}</h3><div class="cm-p-same">${same.map((x) => `<button type="button" data-open="${escH(x.dataset.id)}"><span class="cm-av">${x.querySelector('.cm-av').innerHTML}</span><span><b>${escH(x.querySelector('.cm-n').textContent)}</b><span>${escH(x.querySelector('.cm-co').textContent)}</span></span></button>`).join('')}</div></div>` : ''}`;
    if (dr.hidden) { back = document.activeElement; dr.hidden = false; document.documentElement.style.paddingRight = `${innerWidth - document.documentElement.clientWidth}px`; document.documentElement.classList.add('cm-lock'); requestAnimationFrame(() => dr.classList.add('on')); }
    panel.scrollTop = 0;
    panel.focus({ preventScroll: true });
  };
  const close = () => {
    dr.classList.remove('on');
    document.documentElement.classList.remove('cm-lock');
    document.documentElement.style.paddingRight = '';
    const u = new URL(location.href); if (u.searchParams.has('membru')) { u.searchParams.delete('membru'); history.replaceState(null, '', u.pathname + u.search + u.hash); }
    setTimeout(() => { dr.hidden = true; }, 260);
    back?.focus({ preventScroll: true });
  };
  grid.addEventListener('click', (e) => { const c = e.target.closest('.cm-card'); if (c) open(c); });
  dr.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) return close();
    const o = e.target.closest('[data-open]');
    if (o) open(cards.find((c) => c.dataset.id === o.dataset.open));
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !dr.hidden) close(); });
  // ?membru=<id> (rezultatele din căutarea din meniu) deschide direct profilul rapid
  const m0 = cards.find((c) => c.dataset.id === new URLSearchParams(location.search).get('membru'));
  if (m0) open(m0);
})();
// /parteneri: roata din hero, configuratorul de parteneriat, calculatorul fiscal, inventarul brandurilor
(() => {
  const root = document.querySelector('main.sp');
  if (!root) return;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (n, d = 0) => n.toLocaleString('ro-RO', { maximumFractionDigits: d, minimumFractionDigits: 0 });

  // ---------- roata: antreprenori -> companii -> România -> branduri ----------
  const fw = $('.sp-fw');
  if (fw) {
    const nodes = $$('.sp-fw-n', fw), vals = $$('.sp-fw-v', fw), prog = $('.sp-fw-prog', fw);
    let i = 0, timer, visible = true;
    const show = (k, wrap) => {
      i = k;
      nodes.forEach((n, j) => n.classList.toggle('on', j === k));
      vals.forEach((v, j) => v.classList.toggle('on', j === k));
      // arcul crește până la nodul activ; după ultimul nod se închide cercul și o ia de la capăt
      if (wrap) {
        prog.style.strokeDasharray = '100 100';
        setTimeout(() => { prog.style.transition = 'none'; prog.style.strokeDasharray = '0 100'; prog.getBoundingClientRect(); prog.style.transition = ''; }, 1150);
      } else prog.style.strokeDasharray = `${k * 25 + 0.01} 100`;
    };
    const next = () => { if (!visible || document.hidden) return; show((i + 1) % nodes.length, i === nodes.length - 1); };
    const play = () => { clearInterval(timer); if (!calm) timer = setInterval(next, 3200); };
    nodes.forEach((n, k) => {
      n.addEventListener('click', () => { show(k); play(); });
      n.addEventListener('mouseenter', () => { clearInterval(timer); show(k); });
      n.addEventListener('mouseleave', play);
    });
    if ('IntersectionObserver' in window) new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(fw);
    show(0); play();
  }

  // cifrele din hero numără până la valoare
  if (!calm) $$('.sp-hero-figs dt[data-to]').forEach((el) => {
    const to = Number(el.dataset.to), t0 = performance.now() + 200, dur = 1300;
    const tick = (now) => { const p = Math.min(1, Math.max(0, (now - t0) / dur)); el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    setTimeout(() => { el.textContent = fmt(to); }, 200 + dur + 300);
  });

  // ---------- configuratorul ----------
  const cfgEl = $('.sp-cfg');
  if (cfgEl) {
    const C = JSON.parse(cfgEl.dataset.cfg);
    const out = (k) => $(`[data-o="${k}"]`, cfgEl);
    const cta = $('.sp-out-cta', cfgEl);
    // cifrele animate: de la valoarea afișată la cea nouă
    const tween = (el, to, render) => {
      const from = Number(el.dataset.v || 0), t0 = performance.now(), dur = calm ? 0 : 600;
      el.dataset.v = to;
      const tick = (now) => { const p = dur ? Math.min(1, (now - t0) / dur) : 1; el.innerHTML = render(from + (to - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    };
    const money = (v) => (v >= 1e9 ? `${fmt(v / 1e9, 1)}<small> mld. lei</small>` : `${fmt(v / 1e6, 0)}<small> mil. lei</small>`);
    function update() {
      const f = $('input[name="sp-fmt"]:checked', cfgEl).value;
      const tema = $('input[name="sp-tema"]:checked', cfgEl);
      const team = $$('input[name="sp-echipa"]:checked', cfgEl).map((x) => x.value);
      $$('[data-only]', cfgEl).forEach((s) => { s.hidden = s.dataset.only !== f; });
      $('.sp-step-n', cfgEl).textContent = f === 'atelier' ? '3' : '2';
      const groups = f === 'an' ? (C.wsCluj ? 3 : 2) : 1;
      const h = f === 'atelier' ? (C.H[tema.dataset.f] || 8) : f === 'editie' ? C.hEd : C.hEd * 2 + C.hCluj;
      tween(out('ant'), C.g * groups, (v) => fmt(Math.round(v)));
      tween(out('ore'), C.g * h, (v) => fmt(Math.round(v / 5) * 5));
      tween(out('ca'), C.g * groups * C.avgCa, money);
      tween(out('ang'), C.g * groups * C.avgAng, (v) => fmt(Math.round(v / 10) * 10));
      $('.sp-out-rol', cfgEl).textContent = C.fmt[f].rol;
      const ben = C.fmt[f].ben.map((b) => b.replace('{tema}', tema ? tema.dataset.n : ''));
      $('.sp-out-ben', cfgEl).innerHTML = [...ben.map((b) => `<li>${b}</li>`), ...team.map((t) => `<li class="add">${C.echipa[t]}</li>`)].map((li, k) => li.replace('<li', `<li style="animation-delay:${k * 40}ms"`)).join('');
      const what = f === 'atelier' ? `sponsor al unui atelier (tema: ${tema.dataset.n})` : f === 'editie' ? 'partener al unei ediții întregi' : 'partener strategic pentru un an';
      const extra = team.map((t) => C.msg[t]);
      cta.dataset.imMsg = `Vreau să fiu ${what}.${extra.length ? ` Mi-ar plăcea și: ${extra.join('; ')}.` : ''}`;
    }
    const f0 = new URLSearchParams(location.search).get('format'), r0 = f0 && $(`input[name="sp-fmt"][value="${f0}"]`, cfgEl);
    if (r0) r0.checked = true;
    cfgEl.addEventListener('change', update);
    update();
  }

  // ---------- calculatorul fiscal ----------
  const calc = $('.sp-calc');
  if (calc) {
    let mode = 'profit';
    const ca = $('#sp-ca'), imp = $('#sp-imp'), v = $('#sp-tax-v'), why = $('#sp-tax-why');
    const num = (el) => Number(String(el.value).replace(/\D/g, '')) || 0;
    // separatorul de mii, păstrând poziția cursorului
    const pretty = (el) => { const n = num(el), end = el.value.length - el.selectionStart; el.value = n ? fmt(n) : ''; const p = Math.max(0, el.value.length - end); el.setSelectionRange?.(p, p); };
    function update() {
      const i = num(imp), c = num(ca);
      let r, txt;
      if (mode === 'micro') { r = i * 0.2; txt = '20% din impozitul pe venit al microîntreprinderii.'; }
      else { const a = c * 0.0075, b = i * 0.2; r = Math.min(a, b); txt = a < b ? 'Limita: 0,75% din cifra de afaceri (mai mică decât 20% din impozit).' : 'Limita: 20% din impozitul pe profit (mai mică decât 0,75% din cifra de afaceri).'; }
      v.textContent = `${fmt(Math.round(r))} lei`;
      why.textContent = r ? `${txt} Bani care altfel ajung la buget.` : 'Completează cifrele companiei tale.';
    }
    $$('.sp-calc-seg button', calc).forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.m;
      $$('.sp-calc-seg button', calc).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', String(x === b)); });
      $('.sp-calc-f[data-m="profit"]', calc).hidden = mode !== 'profit';
      $('[data-lbl]', calc).textContent = mode === 'micro' ? 'Impozitul pe venit anual (micro)' : 'Impozitul pe profit anual';
      update();
    }));
    [ca, imp].forEach((el) => el.addEventListener('input', () => { pretty(el); update(); }));
    update();
  }

  // ---------- inventarul brandurilor ----------
  const inv = $('.sp-inv');
  if (inv) {
    const cards = $$('.sp-br', inv), q = $('#sp-q'), count = $('.sp-inv-count'), empty = $('.sp-inv-empty');
    const st = { k: '', y: '', q: '' };
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    function apply() {
      let n = 0;
      cards.forEach((c) => {
        const ok = (!st.k || c.dataset.k.split(' ').includes(st.k)) && (!st.y || c.dataset.y.split(' ').includes(st.y)) && (!st.q || norm(c.dataset.q).includes(st.q));
        c.hidden = !ok; if (ok) n++;
      });
      count.textContent = st.k || st.y || st.q ? `${n} din ${cards.length} branduri` : `${cards.length} branduri, de la cele mai implicate`;
      empty.hidden = n > 0;
    }
    const group = (sel, key) => $$(sel).forEach((b) => b.addEventListener('click', () => { $$(sel).forEach((x) => x.classList.toggle('on', x === b)); st[key] = b.dataset[key]; apply(); }));
    group('.sp-seg button', 'k');
    group('.sp-years button', 'y');
    q?.addEventListener('input', () => { st.q = norm(q.value); apply(); });
    apply();

    // detaliile unui brand, în fereastră
    const dlg = $('#sp-br-dlg'), box = $('.sp-dlg-in', dlg);
    const open = (id, push) => {
      const t = document.querySelector(`template[data-br="${CSS.escape(id)}"]`);
      if (!t) return;
      box.replaceChildren(t.content.cloneNode(true));
      // butonul „Vreau și eu” din fereastră deschide formularul
      $$('[data-implica]', box).forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); dlg.close(); window.spImplica?.(b.dataset.implica, `Am văzut pe site partenerii Antreprenoria și vreau să fiu și eu alături de program.`); }));
      dlg.showModal(); dlg.scrollTop = 0;
      if (push) history.replaceState(null, '', '#' + id);
    };
    cards.forEach((c) => c.addEventListener('click', () => open(c.id, true)));
    $('[data-close]', dlg).addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => { if (cards.some((c) => '#' + c.id === location.hash)) history.replaceState(null, '', location.pathname + location.search); });
    // din banda de logo-uri sau din adresă (/parteneri#dwf): cardul se evidențiază și se deschide
    const fromHash = () => {
      const c = cards.find((x) => '#' + x.id === location.hash);
      if (!c) return;
      c.hidden = false; c.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
      c.classList.remove('hit'); void c.offsetWidth; c.classList.add('hit');
      setTimeout(() => open(c.id), calm ? 0 : 650);
    };
    $$('.sp-marq-it').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); history.replaceState(null, '', a.getAttribute('href')); fromHash(); }));
    if (location.hash) setTimeout(fromHash, 300);
  }

  // ---------- butonul „Vreau și eu” fix, pe mobil ----------
  const fab = $('.sp-fab'), hero = $('.sp-hero'), fin = $('#vreau');
  if (fab && 'IntersectionObserver' in window) {
    const seen = new Map();
    const io = new IntersectionObserver((es) => { es.forEach((e) => seen.set(e.target, e.isIntersecting)); fab.classList.toggle('show', !seen.get(hero) && !seen.get(fin)); });
    io.observe(hero); io.observe(fin);
  }
})();

// meniul Comunitate: căutarea cu rezultate live (indexul /comunitate.json se încarcă la prima deschidere), săgeți + Enter, Ctrl/⌘ K
(() => {
  const box = document.querySelector('.mmc');
  if (!box) return;
  const item = box.closest('.mm-item'), form = box.querySelector('.mmc-search'), input = form.querySelector('input'), res = box.querySelector('.mmc-res'), ideas = box.querySelector('.mmc-ideas');
  const { escH } = cmEngine;
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  box.querySelector('.mmc-kbd').textContent = mac ? '⌘ K' : 'Ctrl K';
  if (matchMedia('(max-width: 480px)').matches) input.placeholder = 'Un serviciu, o companie…';
  const go = (q, id) => { location.href = `/comunitate?q=${encodeURIComponent(q)}${id ? `&membru=${encodeURIComponent(id)}` : ''}#lista`; };

  // indexul: din /comunitate.json; dacă ruta lipsește (server vechi), din cardurile paginii /comunitate
  let index = null, loading = null;
  const load = () => loading || (loading = fetch('/comunitate.json').then((r) => (r.ok ? r.json() : Promise.reject())).catch(() =>
    fetch('/comunitate').then((r) => r.text()).then((h) => [...new DOMParser().parseFromString(h, 'text/html').querySelectorAll('.cm-card')].map((c) => ({
      id: c.dataset.id, n: c.querySelector('.cm-n').textContent, co: c.querySelector('.cm-co').textContent, s: c.dataset.sector,
      d: c.querySelector('.cm-d:not(.cm-d-empty)')?.textContent || '', img: c.querySelector('.cm-av img')?.getAttribute('src') || '', ed: (c.querySelector('.cm-eds')?.textContent || '').trim() }))))
    .then((L) => { index = L.map((x) => cmEngine.prep(x, x)); return index; }));
  item.addEventListener('mouseenter', load, { once: true });
  input.addEventListener('focus', load, { once: true });

  let active = -1, last = '';
  const opts = () => [...res.querySelectorAll('.mmc-r')];
  const setActive = (i) => {
    const o = opts();
    active = o.length ? (i + o.length) % o.length : -1;
    o.forEach((x, k) => x.setAttribute('aria-selected', String(k === active)));
    if (active >= 0) { o[active].scrollIntoView({ block: 'nearest' }); input.setAttribute('aria-activedescendant', o[active].id); } else input.removeAttribute('aria-activedescendant');
  };
  const render = (q) => {
    last = q;
    const empty = !q;
    res.hidden = empty; ideas.hidden = !empty; box.querySelector('.mmc-new').hidden = !empty; box.classList.toggle('typing', !empty);
    input.setAttribute('aria-expanded', String(!empty));
    if (empty) { res.innerHTML = ''; active = -1; return; }
    if (!index) { res.innerHTML = '<p class="mmc-wait">Se încarcă comunitatea…</p>'; load().then(() => { if (last === q) render(q); }); return; }
    const r = cmEngine.search(index, q), L = r.list || [];
    const mail = box.dataset.mail;
    if (!L.length) {
      res.innerHTML = `<div class="mmc-none"><b>Nimic încă pentru „${escH(q)}”.</b><span>Spune-ne ce cauți: echipa întreabă în comunitate și revine cu un om potrivit.</span>${mail ? `<a href="mailto:${escH(mail)}?subject=${encodeURIComponent(`Caut în comunitate: ${q}`)}">Cere o recomandare →</a>` : ''}</div>`;
      active = -1; return;
    }
    res.innerHTML = `${r.partial ? '<p class="mmc-note">Potriviri parțiale:</p>' : ''}${L.slice(0, 5).map((x, i) => `<a class="mmc-r" id="mmc-r${i}" role="option" aria-selected="false" href="${x.h ? escH(x.h) : `/comunitate?q=${encodeURIComponent(q)}&membru=${encodeURIComponent(x.id)}#lista`}">
        <span class="mmc-av">${x.img ? `<img src="${escH(x.img)}" alt="" loading="lazy">` : `<span class="ph">${escH(x.n.split(' ').map((w) => w[0]).join('').slice(0, 2))}</span>`}</span>
        <span class="mmc-r-tx"><span class="mmc-r-top"><b>${escH(x.n)}</b><span>${escH(x.co)}</span></span>${x.d ? `<span class="mmc-r-d">${cmEngine.marked(x, r.terms, 4)}</span>` : ''}</span>
        <span class="mmc-r-meta">${x.s ? `<em>${escH(x.s)}</em>` : ''}<small>${escH(x.ed)}</small></span></a>`).join('')}
      <a class="mmc-all" href="/comunitate?q=${encodeURIComponent(q)}#lista"><span>${L.length > 5 ? `Toate cele ${L.length} rezultate` : L.length === 1 ? 'Vezi rezultatul' : `Vezi cele ${L.length} rezultate`} pentru „${escH(q)}”</span><kbd>Enter</kbd></a>`;
    active = -1;
  };
  let t;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => render(input.value.trim()), 90); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Escape' && input.value) { e.stopPropagation(); input.value = ''; render(''); }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (active >= 0) { opts()[active].click(); return; }
    if (q) go(q); else input.focus();
  });
  res.addEventListener('mousemove', (e) => { const o = e.target.closest('.mmc-r'); if (o) setActive(opts().indexOf(o)); });
  // sugestiile completează căutarea în loc să plece de pe pagină
  ideas.addEventListener('click', (e) => { const a = e.target.closest('[data-idea]'); if (!a) return; e.preventDefault(); input.value = a.dataset.idea; input.focus(); render(a.dataset.idea); });

  // Ctrl/⌘ K deschide căutarea din orice pagină
  addEventListener('keydown', (e) => {
    if (!(e.key === 'k' || e.key === 'K') || !(e.ctrlKey || e.metaKey) || e.altKey) return;
    e.preventDefault();
    const trigger = item.querySelector('.mm-trigger');
    if (!item.classList.contains('open')) trigger.click();
    const nav = document.getElementById('nav'), btn = document.querySelector('.menu-btn');
    if (btn && getComputedStyle(btn).display !== 'none' && !nav.classList.contains('open')) btn.click();
    setTimeout(() => { input.focus(); input.select(); }, 60);
  });
})();

// pagina unui membru: „Copiază linkul”
(() => {
  const b = document.querySelector('.mp [data-share]');
  if (!b) return;
  b.addEventListener('click', async () => {
    const url = location.origin + location.pathname;
    try { if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ title: document.title, url }); return; } await navigator.clipboard.writeText(url); } catch { return; }
    const t = b.querySelector('span'), was = t.textContent;
    t.textContent = 'Link copiat'; b.classList.add('done');
    setTimeout(() => { t.textContent = was; b.classList.remove('done'); }, 1800);
  });
})();
