// Utilitare comune pentru generatorul site-ului.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const today = () => new Date().toISOString().slice(0, 10);
const MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
const fmtDay = (d) => { const [, m, z] = d.split('-').map(Number); return `${z} ${MONTHS[m - 1]}`; };
const median = (arr) => { const a = arr.filter((x) => x != null).sort((x, y) => x - y); return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null; };
const quantile = (arr, q) => { const a = arr.filter((x) => x != null).sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) * q)] : null; };
const milLei = (n) => `${(n / 1e6).toLocaleString('ro-RO', { maximumFractionDigits: 1 })}`;
const initials = (n) => n.split(/[\s-]+/).map((x) => x[0]).slice(0, 2).join('');

module.exports = { esc, today, MONTHS, fmtDay, median, quantile, milLei, initials };
