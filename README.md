# Antreprenoria – local

Entitățile site-ului [antreprenoria.ro](https://antreprenoria.ro/) și panoul de administrare local.

## Pornire

Fără dependențe, doar Node.js 18+.

```bash
npm start
```

- `http://localhost:3200/manage` – dashboard
- `http://localhost:3200/manage/entitati` – entitățile, pe 3 niveluri: categorie → grup → entități

Portul se schimbă cu variabila `PORT`.

## Modelul de entități

Edițiile sunt grupuri cu **același set de sub-entități**. Oamenii, organizațiile, locațiile și temele sunt **registre globale**, iar edițiile fac referire la ele prin id. Așa un trainer care revine în 7 ediții e o singură entitate.

**Organizațiile** sunt un singur registru. Aceeași firmă poate avea mai multe roluri, fiecare legat de o ediție (și, după caz, de un atelier sau o persoană):

- `participant` (alumni);
- `organizator`;
- `partener strategic`, `powered by`, `partener ediție`;
- `sponsor atelier`;
- `gazdă`;
- `speaker` (angajatorul unui speaker).

Din roluri se calculează `parcurs` (rolurile pe fiecare ediție) și `ciclu` (alumni care revin într-o ediție ulterioară ca sponsor, gazdă sau cu un speaker).

| Categorie | Grupuri |
|---|---|
| Program | identitate, metodologie, cifre declarate, contact & echipă |
| Ediții | câte un grup pe ediție (`bucuresti-16` … `bucuresti-22`, `cluj-1`), fiecare cu: **program**, **ateliere**, **participanți**, **traineri & speakeri**, **parteneri** |
| Oameni | traineri, antreprenori invitați, facilitatori, participanți, echipă |
| Organizații | din alumni parteneri, cu mai multe roluri, companii alumni, parteneri & sponsori, companiile speakerilor, locații |
| Presă | apariții (cu tip și greutate ca dovadă), citate exacte, istoricul programului pe ani (2013 → azi), publicații; fiecare apariție și citat se validează în panou |
| Curriculum | matricea temelor pe ediții; teme full-day, de seară, networking |
| Audit | inconsecvențele găsite la extragere (date, conținut, conversie) |

Cheia unei ediții e `serie-număr`, nu slug-ul paginii, ca să nu se strice la Cluj #2.

## Actualizare date

```bash
npm run sync
```

| Pas | Script | Ce face |
|---|---|---|
| `npm run crawl` | `scripts/crawl.js` | descarcă homepage-ul și paginile legate din el în `source/site/` (site-ul nu are sitemap) |
| `npm run extract` | `scripts/extract-editions.js` | citește paginile edițiilor → `data/extract/editii-brut.json` |
| `npm run build` | `scripts/build-entities.js` | brut + curare → `data/entitati.json` (registre, ediții, observații) |

### Curare manuală (`data/curare/`)

Site-ul e scris de mână, așa că unele lucruri nu se pot deduce automat:

- `companii.json` – compania și sectorul fiecărui participant (cheia e `<ediție>:<nume>`). Pe site, compania apare doar în descriere. Intrările cu `incert: true` au numele dedus.
- `oameni.json` – aliasuri de nume („Alex Lapusan” = „Alexandru Lăpușan”), forma corectă a numelui, placeholder-e de ignorat, echipa.
- `parteneri.json` – partenerii, recunoscuți după domeniul linkului sau numele logo-ului.
- `organizatii.json`:
  - `uneste`: companiile alumni care sunt și parteneri;
  - `afilieri`: textul afișat sub fiecare speaker → organizație și funcție; `null` pentru titluri ca „Trainer”;
  - `afiliere_lipsa`: speakerii fără afiliere pe site;
  - `locatii`: locațiile atelierelor și organizația-gazdă.

  O afiliere nouă care nu e în listă apare în Audit.
- `presa.json` – aparițiile în presă și pe alte canale. Origine: extern, culese manual. Fiecare apariție are:
  - publicația, data, tipul și greutatea ca dovadă;
  - edițiile menționate (inclusiv cele de dinainte de #16);
  - oamenii și organizațiile din creier;
  - faptele aflate;
  - citatele copiate literal.

  Starea de validare (propus / validat / respins) se salvează din panou în `data/presa-status.json`.
- `teme.json` – curriculum-ul: fiecare titlu de atelier se potrivește cu o temă prin regex.

O ediție nouă: `npm run sync`, apoi completează în `companii.json` participanții noi. Scriptul de build îi listează în Audit drept „Participant fără companie în curare”.
