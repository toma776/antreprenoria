/* Interacțiunile site-ului: meniul pe mobil, testul „Ești potrivit?” și comutatorul de direcții de brand (doar pentru concept). */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // meniul pe mobil
  const btn = $('.menu-btn'), nav = $('#nav');
  btn?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });

  // direcția de brand: salvată local, ca să rămână la navigare
  const setBrand = (k) => {
    document.documentElement.dataset.brand = k;
    try { localStorage.setItem('brand', k); } catch (e) { /* fără stocare: rămâne doar pe pagina curentă */ }
    $$('[data-brand-set]').forEach((b) => b.classList.toggle('on', b.dataset.brandSet === k));
  };
  setBrand(document.documentElement.dataset.brand || 'a');
  $$('[data-brand-set]').forEach((b) => b.addEventListener('click', () => setBrand(b.dataset.brandSet)));
  $$('[data-brand-go]').forEach((a) => a.addEventListener('click', () => { try { localStorage.setItem('brand', a.dataset.brandGo); } catch (e) { /* idem */ } }));

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
