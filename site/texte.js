// Textele paginilor care nu țin de o entitate anume (titluri, fraze de introducere), editabile din panou › Entități › Texte de pe site.
// Aici stă textul implicit; ce se schimbă în panou ajunge în data/curare/editari.json › texte și, la build, în entitati.json › texte.
const PAGINI = [
  { id: 'acasa', nume: 'Acasă', url: '/', blocuri: [
    ['titlu', 'Titlul mare', 'Crește-ți compania alături de antreprenorii care au făcut-o deja.'],
    ['lead', 'Textul de sub titlu', 'Trei luni de ateliere cu lideri de business români, un grup selectat de colegi antreprenori și acces la comunitatea RBL.'],
    ['cum.titlu', 'Cum funcționează · titlu', 'Un trimestru în care te uiți strategic la compania ta.'],
    ['cum.text', 'Cum funcționează · text', 'La fiecare atelier: dimineața training aplicat, după-amiaza antreprenori care povestesc cum au rezolvat exact problema despre care vorbiți. Seara, networking cu colegii.'],
    ['oameni.titlu', 'Traineri · titlu', 'Oameni care vorbesc din ce trăiesc.'],
    ['potrivit.titlu', 'Pentru cine e · titlu', 'Ești potrivit pentru Antreprenoria?'],
    ['potrivit.text', 'Pentru cine e · text', 'Selectăm în jur de 25 de antreprenori pe ediție, ca discuțiile să fie între oameni cu provocări asemănătoare. Trei întrebări îți spun dacă merită să aplici.'],
    ['parteneri.titlu', 'Parteneri · titlu', 'Companiile care fac posibil programul.'],
    ['final.titlu', 'Banda finală · titlu', 'Cresc antreprenorii, crește România.'],
    ['final.text', 'Banda finală · text', 'Următoarea ediție din București se formează acum. Lasă-ne datele și te anunțăm primul când se deschid înscrierile.'],
  ] },
  { id: 'despre', nume: 'Despre', url: '/despre', blocuri: [
    ['titlu', 'Titlul mare', 'Cresc antreprenorii, crește România.'],
    ['program.titlu', 'Programul · titlu', 'Cel mai longeviv program educațional al RBL.'],
    ['echipa.titlu', 'Echipa · titlu', 'Oamenii din spatele programului.'],
    ['contact.titlu', 'Contact · titlu', 'Scrie-ne sau treci pe la noi.'],
  ] },
  { id: 'program', nume: 'Program', url: '/program', blocuri: [
    ['titlu', 'Titlul mare', 'Trei luni în care te uiți strategic la compania ta.'],
    ['zi.titlu', 'O zi de atelier · titlu', 'O zi de atelier, de la cafea la networking.'],
    ['zi.text', 'O zi de atelier · text', 'Fiecare atelier full-day are aceeași structură: dimineața un trainer lucrează aplicat cu grupa, după-amiaza doi antreprenori povestesc cum au rezolvat exact problema zilei, seara networking cu colegii.'],
  ] },
  { id: 'aplica', nume: 'Aplică', url: '/aplica', blocuri: [
    ['titlu', 'Titlul mare', 'Antreprenoria e pentru cei care vor să crească.'],
    ['lead', 'Textul de sub titlu', 'Un program pentru antreprenorii care vor să-și ducă afacerea la nivelul următor. Înainte să aplici, iată ce căutăm la participanți.'],
    ['acord', 'Textul acordului', 'Sunt de acord ca Fundația Romanian Business Leaders să folosească aceste date pentru selecția participanților și să mă contacteze despre program, inclusiv ca să reiau aplicarea dacă nu o termin.'],
  ] },
  { id: 'footer', nume: 'Footer', url: '/', blocuri: [
    ['mesaj', 'Mesajul mare (Enter = rând nou)', 'Cresc antreprenorii,\ncrește România.'],
  ] },
];
const IMPLICIT = Object.fromEntries(PAGINI.flatMap((p) => p.blocuri.map(([k, , t]) => [`${p.id}.${k}`, t])));

// textul unui bloc: cel din panou, dacă există, altfel cel implicit
const tx = (D, id) => { const v = D?.texte?.[id]; return typeof v === 'string' && v.trim() ? v : IMPLICIT[id] ?? ''; };

module.exports = { PAGINI, IMPLICIT, tx };
