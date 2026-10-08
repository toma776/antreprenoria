// Identitatea vizuală din data/brand.json -> variabile CSS și fonturi pentru site.
// Varianta activă se setează din panou; ?brand=<id> afișează temporar altă variantă (previzualizare), fără să schimbe nimic.
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'brand.json');
const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

// varianta afișată: cea cerută pentru previzualizare, dacă există, altfel cea activă
function pick(B, preview) {
  return B.variante.find((v) => v.id === preview) || B.variante.find((v) => v.id === B.activ) || B.variante[0];
}

const stack = (t) => `"${t.font}", ${t.rezerva}`;
function tokens(v) {
  const T = v.tipografie, F = v.forme;
  return [
    ...v.culori.map((c) => `--${c.token}: ${c.hex};`),
    `--f-display: ${stack(T.titluri)};`, `--f-body: ${stack(T.text)};`, `--f-num: ${stack(T.cifre)};`, `--eyebrow-font: ${stack(T.etichete)};`,
    `--d-weight: ${T.titluri.greutate};`, `--d-stretch: ${T.titluri.latime};`, `--d-track: ${T.titluri.spatiere};`,
    `--radius: ${F.raza};`, `--radius-btn: ${F.raza_buton};`, `--shadow: ${F.umbra};`,
    `color-scheme: ${v.schema};`,
  ].join(' ');
}

// CSS-ul tuturor variantelor; :root primește varianta activă
function css() {
  const B = load(), activ = pick(B);
  return `/* generat din data/brand.json – nu edita manual */\n:root { ${tokens(activ)} }\n${B.variante.map((v) => `[data-brand="${v.id}"] { ${tokens(v)} }`).join('\n')}\n`;
}

const fontsHref = (v) => `https://fonts.googleapis.com/css2?${v.google_fonts}&display=swap`;

module.exports = { load, pick, css, fontsHref, FILE };
