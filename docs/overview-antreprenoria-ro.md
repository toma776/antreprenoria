# Antreprenoria.ro: overview

*Scanare făcută pe 8 octombrie 2026. Am analizat homepage-ul, paginile Ediția #22, Cluj, Despre noi și Contact, plus sursa HTML.*

## 1. Ce este

**Atelierele Antreprenoria** sunt un program de accelerare (*scale-up*) pentru antreprenori cu business deja funcțional. Programul e creat în cadrul **Fundației Romanian Business Leaders (RBL)**.

- Rulează din **2013** și e cel mai vechi program educațional RBL pentru antreprenori.
- Are **2 ediții pe an**: martie–iunie și septembrie–decembrie. Acum rulează **ediția #22** în București.
- Din toamna 2026 există și **Antreprenoria Cluj #1**, cu partenerul strategic Cluj Business Campus.
- Cifre declarate: **550+ companii** au trecut prin program, **500+ lideri de business** au contribuit pro-bono și **600+ membri** sunt în comunitatea RBL.

## 2. Public țintă

Programul se adresează companiilor cu **cifră de afaceri de peste 1 mil. EUR** sau cu un avantaj competitiv inovativ.

Participanții de la #22 provin din tech, logistică, sănătate, imobiliare, servicii și economie circulară. Au cifre de afaceri între aproximativ **340 mii și 182 mil. lei**.

## 3. Produsul (ediția #22, București)

| Element | Detalii |
|---|---|
| Format | 7 ateliere full-day, 2 ateliere de seară (Finanțare, Board of Advisors), 1 mastermind, 1 petrecere de networking |
| Durată | septembrie–decembrie 2026, cam o sesiune la 2 săptămâni |
| Locație | sediul Zitec, București |
| Grupă | aproximativ 24 de antreprenori |
| Preț | **7.700 lei + TVA** (early-bird, cu termen pe 11 septembrie) |
| Ancoră de valoare | „acces la expertiză de peste 15.000 EUR” |
| Status | „Ultimele 2 locuri”, deși programul a început pe 25 septembrie |

**Temele atelierelor:** Viziune și Leadership, Modele de business în era AI, Marketing și Inovare, Vânzări, Cultură organizațională, Finanțare, Board of Advisors.

**Traineri:** Hansen Beck, StarTech Team, The Network, Leadder, Human Synergistics și alții.

**Cluj #1** are o structură asemănătoare: 1 mastermind și 7 ateliere. Costă **7.500 lei + TVA** la preț redus sau **9.000 lei + TVA** la preț standard.

**Parteneri:** Garanti BBVA (strategic), Zitec, UniCredit, **DWF** (logo pe homepage), plus sponsori pe ateliere (Radial Solutions, The Marketer, CargoTrack, WLC și alții).

**Contact:** Sorin Drăghici este Project Leader (adresa lui e `@dwf.ro`), iar Raluca Bedereag este Project Manager (RBL). Pentru parteneriate, contactul e Larisa Slavenie.

## 4. Structura site-ului

```
/                       Homepage: selector de ediții (#22 până la #16, plus Cluj)
├── /antreprenoria-22   ediția curentă: hero, beneficii, agendă, participanți, metodologie
├── /antreprenoria-cluj ediția Cluj #1
├── /antreprenoria-16 … /antreprenoria-21   arhivă cu edițiile închise (agendă și participanți)
├── /despre-noi
├── /contact
└── /confidentialitate, /termeni-si-conditii, /politica-cookies
```

- Fiecare ediție are o pagină proprie, cu ancore `#agenda-section` și `#participant-section`.
- **Înscrierea** se face printr-un formular JotForm extern (`form.jotform.com/Antreprenoria/ateliere-antreprenoria`).
- Nu există blog, secțiune de testimoniale dedicată, FAQ sau secțiune de alumni.
- Social media: Facebook, LinkedIn și YouTube (playlist-urile RBL Summit).

## 5. Tehnic

- Site **custom în HTML/CSS/JS**, fără CMS vizibil (nu e WordPress). Folosește jQuery 2.1.3 (din 2015) și Swiper.
- Server LiteSpeed, cu HTTP/3. Timpul de răspuns e bun (0,1–0,2 s).
- Tracking: Google Tag Manager (`GTM-PCH2SN9F`).

## 6. Findings și oportunități

**SEO tehnic (prioritate mare)**

- `robots.txt` și `sitemap.xml` dau **404**.
- **HTTP nu face redirect la HTTPS**, iar `www` nu face redirect la varianta fără `www`. Fiecare pagină e servită pe 4 variante, deci are conținut duplicat.
- Nu există **meta description** și nici `canonical`.
- Titlurile paginilor sunt slug-uri (`antreprenoria`, `atelierele-antreprenoria`), nu titluri optimizate.
- Pagina nu are **niciun `<h1>`**: homepage-ul folosește doar `h2` și `h3`.
- Atributul `lang="en"` e greșit, pentru că site-ul e în română.
- Open Graph e configurat, dar cu o descriere minimală („Ateliere Antreprenoriat”).

**Conținut și conversie**

- Mesajele de urgență sunt expirate: „Ultimele 2 locuri” și prețul early-bird cu termen pe 11 septembrie apar încă, deși ediția a început.
- Cifrele sunt inconsistente între pagini: 24 sau 30 de participanți, „5 module full-day / 3 seri / 18 lectori” față de „7 full-day / 2 seri”, „500+” sau „600+” membri RBL.
- Homepage-ul e doar un selector de ediții. Nu are o propunere de valoare clară, social proof agregat sau CTA principal deasupra fold-ului.
- Nu există pagini evergreen care să atragă trafic organic: blog, studii de caz cu alumni, FAQ, pagini „Pentru cine e programul”.
- Înscrierea prin JotForm extern rupe experiența și face tracking-ul conversiilor mai greu.

**Accesibilitate și UX**

- `user-scalable=no` blochează zoom-ul pe mobil.
- Multe imagini au `alt=""` sau alt-uri generice („Sponsor Logo”).
- jQuery 2.1.3 e o versiune veche, cu vulnerabilități cunoscute.

## 7. Concluzie

Antreprenoria e un brand matur, cu un produs solid și multă credibilitate: 13 ani de istorie, ecosistemul RBL, traineri cunoscuți și transparență mare asupra participanților.

Site-ul funcționează mai degrabă ca arhivă de ediții decât ca instrument de achiziție. Câștigurile rapide sunt în SEO-ul tehnic: redirect-uri, sitemap, titluri, H1 și meta description. Câștigurile mari sunt în homepage-ul de conversie și în conținutul evergreen.
