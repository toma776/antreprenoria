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
