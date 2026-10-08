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

Edițiile sunt grupuri cu **același set de sub-entități**. Oamenii, companiile, partenerii și temele sunt **registre globale**, iar edițiile fac referire la ele prin id. Așa un trainer care revine în 7 ediții e o singură entitate.

| Categorie | Grupuri |
|---|---|
| Program | identitate, metodologie, cifre declarate, contact & echipă |
| Ediții | câte un grup pe ediție (`bucuresti-16` … `bucuresti-22`, `cluj-1`), fiecare cu: **program**, **ateliere**, **participanți**, **traineri & speakeri**, **parteneri** |
| Oameni | traineri, antreprenori invitați, facilitatori, participanți, echipă |
| Companii | companiile participanților, pe sectoare, cu cifra de afaceri și angajații declarați la fiecare ediție |
| Parteneri | parteneri de ediție, sponsori de ateliere |
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
- `teme.json` – curriculum-ul: fiecare titlu de atelier se potrivește cu o temă prin regex.

O ediție nouă: `npm run sync`, apoi completează în `companii.json` participanții noi. Scriptul de build îi listează în Audit drept „Participant fără companie în curare”.
