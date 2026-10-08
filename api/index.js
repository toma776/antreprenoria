// Punctul de intrare pe Vercel: toate cererile sunt rescrise aici (vercel.json) și trec prin același handler ca local.
// Rescrierea trimite calea originală în parametrul __p; o refacem înainte de handler.
const handler = require('../server');

module.exports = (req, res) => {
  const u = new URL(req.url, 'http://local');
  const p = u.searchParams.get('__p');
  if (p !== null) {
    u.searchParams.delete('__p');
    const q = u.searchParams.toString();
    req.url = '/' + p + (q ? '?' + q : '');
  }
  return handler(req, res);
};
