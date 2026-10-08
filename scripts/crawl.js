// Descarcă paginile site-ului în source/site/<slug>.html.
// Lista de pagini vine din linkurile homepage-ului (site-ul nu are sitemap.xml).
const fs = require('fs');
const path = require('path');
const { ORIGIN, SOURCE, get } = require('./lib');

(async () => {
  fs.mkdirSync(SOURCE, { recursive: true });
  const home = await get(ORIGIN + '/');
  fs.writeFileSync(path.join(SOURCE, 'index.html'), home);
  const slugs = [...new Set([...home.matchAll(/href="\/([a-z0-9-]+)(?:#[^"]*)?"/g)].map((m) => m[1]))];
  console.log(`homepage + ${slugs.length} pagini`);
  for (const s of slugs) {
    try {
      const html = await get(`${ORIGIN}/${s}`);
      fs.writeFileSync(path.join(SOURCE, s + '.html'), html);
      console.log(`  ✓ /${s}  ${(html.length / 1024).toFixed(0)} KB`);
    } catch (e) {
      console.log(`  ✗ /${s}  ${e.message}`);
    }
  }
})();
