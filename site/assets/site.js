/* Interacțiunile site-ului: meniul pe mobil și testul „Ești potrivit?”. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);

  // meniul pe mobil
  const btn = $('.menu-btn'), nav = $('#nav');
  btn?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });

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
