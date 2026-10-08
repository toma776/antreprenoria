// Punctul de intrare pe Vercel: toate cererile sunt rescrise aici (vercel.json) și trec prin același handler ca local.
// Rescrierea trimite calea originală în parametrul __p; o refacem înainte de handler.
const handler = require('../server');

module.exports = (req, res) => {
  const original = req.url;
  const u = new URL(req.url, 'http://local');
  const p = u.searchParams.get('__p');
  if (p !== null) {
    u.searchParams.delete('__p');
    const q = u.searchParams.toString();
    req.url = '/' + p + (q ? '?' + q : '');
  }
  // diagnostic temporar: ce cale primește funcția după rescriere
  if (u.pathname === '/api/debug-rewrite' || req.url.startsWith('/api/index')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ original, rewritten: req.url, matched: req.headers['x-matched-path'] || null, forwarded: req.headers['x-forwarded-uri'] || null, now: req.headers['x-now-route-matches'] || null }));
  }
  return handler(req, res);
};
