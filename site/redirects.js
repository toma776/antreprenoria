// Adresele site-ului vechi antreprenoria.ro (cel actual și cel WordPress, 2018–2021) -> paginile noi, cu 301.
// Contează după mutarea domeniului: linkurile din Google, din newslettere și de pe rețelele sociale ajung pe pagina potrivită.
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data', 'entitati.json');

// pagini fixe (fără „/” la final și fără .html; comparate cu litere mici)
const FIXED = {
  '/index.php': '/',
  '/despre-noi': '/despre',
  '/ateliere': '/despre',
  '/scaleup': '/despre',
  '/aplicatia': '/aplica',
  '/privacy-policy': '/confidentialitate',
  '/speakeri-page': '/lideri',
  '/mentori-page': '/lideri',
  '/adviseri-page': '/lideri',
  '/antreprenori': '/lideri',
  '/sponsorizeaza': '/parteneri#sponsorizeaza',
  '/doneaza': '/parteneri#sponsorizeaza',
  '/crowdfunding': '/parteneri#sponsorizeaza',
  '/probono': '/parteneri#sponsorizeaza',
};
// programe vechi, fără echivalent pe site-ul nou: duc la prima pagină
const OLD_PROGRAMS = ['/mentorapp', '/mentoria', '/povesti-mentorat', '/intraprenoria', '/ateliere-intraprenoria', '/advisoria', '/startup', '/talks', '/de10', '/help', '/copilot'];
// profilurile vechi al căror nume diferă de cel din date
const PEOPLE_ALIAS = { 'silviu-hotaran-2': 'silviu-hotaran' };

let cache = null;
function load() {
  const st = fs.statSync(DATA).mtimeMs;
  if (cache && cache.st === st) return cache;
  const D = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  const eds = Object.fromEntries(D.editii.filter((e) => e.slug).map((e) => [`/${e.slug.toLowerCase()}`, e.serie === 'Cluj' ? `/editii/cluj-${e.numar}` : `/editii/${e.numar}`]));
  cache = { st, eds, people: new Set(D.oameni.map((p) => p.id)) };
  return cache;
}

// adresa nouă pentru o adresă veche, sau null dacă nu e una dintre ele
function oldUrl(url) {
  let u = url.toLowerCase().replace(/\.html?$/, '').replace(/\/+$/, '') || '/';
  if (u === '/') return null;
  if (u in FIXED) return FIXED[u];
  if (OLD_PROGRAMS.includes(u)) return '/';
  const { eds, people } = load();
  if (eds[u]) return eds[u];
  const m = /^\/antreprenori\/([a-z0-9-]+)$/.exec(u);
  if (m) {
    const id = PEOPLE_ALIAS[m[1]] || m[1];
    return people.has(id) ? `/lideri/${id}` : '/lideri';
  }
  // imaginile vechi (inclusiv imaginea de distribuire de pe Facebook/LinkedIn) au copii locale
  const im = /^\/images\/(.+)$/.exec(url);
  // /pagina.html -> /pagina (site-ul vechi avea și adrese .html)
  if (/\.html?$/i.test(url)) return u;
  if (im && fs.existsSync(path.join(__dirname, 'assets', 'vechi', decodeURIComponent(im[1])))) return `/assets/vechi/${im[1]}`;
  return null;
}

module.exports = { oldUrl };
