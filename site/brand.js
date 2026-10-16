// Identitatea vizuală din data/brand.json -> variabile CSS și fonturi pentru site.
// Varianta activă se setează din panou; ?brand=<id> afișează temporar altă variantă (previzualizare), fără să schimbe nimic.
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'brand.json');
// local, cu modificările de brand încă nepublicate din panou (brand-local.json); pe Vercel, doar ce e publicat
const LOCAL = path.join(__dirname, '..', 'data', 'brand-local.json');
const load = () => JSON.parse(fs.readFileSync(!process.env.VERCEL && fs.existsSync(LOCAL) ? LOCAL : FILE, 'utf8'));

// varianta afișată: cea cerută pentru previzualizare, dacă există, altfel cea activă
function pick(B, preview) {
  return B.variante.find((v) => v.id === preview) || B.variante.find((v) => v.id === B.activ) || B.variante[0];
}

const stack = (t) => `"${t.font}", ${t.rezerva}`;
// detaliile stilului (Branding › Detaliile stilului); valorile implicite sunt cele ale stilului de acum
const STIL = { inaltime_header: '64px', inaltime_buton: '48px', inaltime_buton_mare: '64px', linie_accent: '2px', sageata_butoane: true };
const stil = (v) => ({ ...STIL, ...(v.stil || {}) });
function tokens(v) {
  const T = v.tipografie, F = v.forme, S = stil(v);
  return [
    ...v.culori.map((c) => `--${c.token}: ${c.hex};`),
    `--f-display: ${stack(T.titluri)};`, `--f-body: ${stack(T.text)};`, `--f-num: ${stack(T.cifre)};`, `--eyebrow-font: ${stack(T.etichete)};`,
    `--d-weight: ${T.titluri.greutate};`, `--d-stretch: ${T.titluri.latime};`, `--d-stretch-hero: ${T.titluri.latime_hero || T.titluri.latime};`, `--d-track: ${T.titluri.spatiere};`,
    `--radius: ${F.raza};`, `--radius-btn: ${F.raza_buton};`, `--shadow: ${F.umbra};`,
    `--hdr-h: ${S.inaltime_header};`, `--btn-h: ${S.inaltime_buton};`, `--btn-h-lg: ${S.inaltime_buton_mare};`, `--accent-line: ${S.linie_accent};`, `--btn-arrow: ${S.sageata_butoane ? 'inline-block' : 'none'};`,
    `color-scheme: ${v.schema};`,
  ].join(' ');
}

// CSS-ul tuturor variantelor; :root primește varianta activă
function css() {
  const B = load(), activ = pick(B);
  return `/* generat din data/brand.json – nu edita manual */\n:root { ${tokens(activ)} }\n${B.variante.map((v) => `[data-brand="${v.id}"] { ${tokens(v)} }`).join('\n')}\n`;
}

const fontsHref = (v) => `https://fonts.googleapis.com/css2?${v.google_fonts}&display=swap`;

module.exports = { load, pick, css, fontsHref, FILE, STIL, stil };
