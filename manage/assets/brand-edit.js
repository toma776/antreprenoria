/* BRANDING › editare: logo-uri, culori, tipografie, forme.
   Fiecare salvare e o modificare de brand în jurnal (PUT /api/editari, op „brand”): se vede imediat pe site-ul local,
   pe cel public după „Publică” din Modificări, și intră în istoric (cu revenire). */

// fonturi Google verificate (greutăți disponibile); „latime” doar pentru Archivo, care are axa de lățime
const FONTS = {
  Archivo: { spec: 'Archivo:wdth,wght@62..125,400..900', w: true },
  Inter: { spec: 'Inter:wght@400..800' },
  Manrope: { spec: 'Manrope:wght@400..800' },
  'Plus Jakarta Sans': { spec: 'Plus+Jakarta+Sans:wght@400..800' },
  'DM Sans': { spec: 'DM+Sans:wght@400..800' },
  'Space Grotesk': { spec: 'Space+Grotesk:wght@400..700' },
  Sora: { spec: 'Sora:wght@400..800' },
  Outfit: { spec: 'Outfit:wght@400..800' },
  Montserrat: { spec: 'Montserrat:wght@400..800' },
  'Work Sans': { spec: 'Work+Sans:wght@400..800' },
  Poppins: { spec: 'Poppins:wght@400;500;600;700;800' },
  'IBM Plex Sans': { spec: 'IBM+Plex+Sans:wght@400;500;600;700' },
  Fraunces: { spec: 'Fraunces:wght@400..800' },
  'Playfair Display': { spec: 'Playfair+Display:wght@400..800' },
};
const ROLURI = [['titluri', 'Titluri'], ['text', 'Text'], ['cifre', 'Cifre'], ['etichete', 'Etichete (eyebrow)']];
const fontsParam = (T) => [...new Set(ROLURI.map(([k]) => T[k].font))].map((f) => `family=${FONTS[f]?.spec || f.replace(/ /g, '+')}`).join('&');
const loadFont = (f) => { const id = 'bf-' + f.replace(/\W/g, ''); if (document.getElementById(id) || !FONTS[f]) return; const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?family=${FONTS[f].spec}&display=swap`; document.head.appendChild(l); };
const UMBRE = [['none', 'Fără umbră'], ['0 1px 2px rgba(11, 37, 69, .06)', 'Discretă'], ['0 1px 2px rgba(11, 37, 69, .06), 0 12px 32px -16px rgba(11, 37, 69, .25)', 'Medie (inițială)'], ['0 2px 4px rgba(11, 37, 69, .08), 0 20px 44px -16px rgba(11, 37, 69, .38)', 'Pronunțată']];
const RAZE = ['0px', '2px', '4px', '6px', '8px', '10px', '12px', '16px', '20px', '24px'];
const RAZE_BTN = [...RAZE, '999px'];
const opt = (list, val) => list.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('');

let BE = null; // { v: varianta (copie de lucru), sec }
function bDrawer(html) {
  if (!$('#b-drawer')) document.body.insertAdjacentHTML('beforeend', '<div class="scrim" id="b-scrim"></div><div class="drawer" id="b-drawer" role="dialog" aria-modal="true"></div>');
  $('#b-drawer').innerHTML = html;
  $('#b-drawer').classList.add('on'); $('#b-scrim').classList.add('on');
}
const bClose = () => { $('#b-drawer')?.classList.remove('on'); $('#b-scrim')?.classList.remove('on'); BE = null; };
const shell = (title, body, preview) => `<div class="dr-head"><h2>${esc(title)}</h2><span class="tag grey">Branding · varianta ${esc(BE.v.id.toUpperCase())}</span><button type="button" data-bclose>Închide ✕</button></div>
  <div class="dr-body"><form id="b-form" onsubmit="return false">${body}</form><div class="sitebox"><div class="sp"><div class="sp-lab">Previzualizare</div><div id="b-prev">${preview}</div></div><p class="ro">Salvarea apare imediat pe site-ul local. Pe cel public, după „Publică” din Modificări.</p></div></div>
  <div class="dr-foot"><span>Se poate reveni oricând din Modificări › Istoric.</span><button type="button" data-bclose>Anulează</button><button type="button" class="primary" data-bsave>Salvează</button></div>`;

/* ---------- culori ---------- */
const culoriForm = (v) => `<div class="b-colors">${v.culori.map((c, i) => `<div class="b-color" data-i="${i}">
    <input type="color" value="${esc(c.hex)}" data-c="pick" aria-label="${esc(c.nume)}"><input type="text" value="${esc(c.hex)}" data-c="hex" maxlength="7" spellcheck="false">
    <div><b>${esc(c.nume)}${c.principala ? ' <span class="tag">principală</span>' : ''}</b><small>${esc(c.rol)}</small></div></div>`).join('')}</div>`;
const culoriPrev = (v) => { const c = (t) => v.culori.find((x) => x.token === t)?.hex; return `<div class="b-prev-site" style="background:${c('bg')};color:${c('ink')};border-radius:${v.forme.raza}"><small style="color:${c('primary')}">EYEBROW</small><b>Titlu de secțiune</b><p style="color:${c('muted')}">Text de paragraf, în culoarea secundară.</p><span class="b-prev-btn" style="background:${c('primary')};color:${c('primary-ink') || '#fff'};border-radius:${v.forme.raza_buton}">Aplică</span> <span class="b-prev-tag" style="background:${c('accent')}">live</span><div class="b-prev-dark" style="background:${c('dark')};color:${c('dark-ink') || '#fff'}">Secțiune închisă</div></div>`; };
/* ---------- tipografie ---------- */
const tipoForm = (v) => { const T = v.tipografie; return ROLURI.map(([k, l]) => `<div class="fs" data-rol="${k}"><h4>${l}</h4>
    <div class="f"><label>Font</label><select data-t="font">${opt(Object.keys(FONTS).map((f) => [f, f]), T[k].font)}</select></div>
    ${k === 'titluri' ? `<div class="f2"><div class="f"><label>Grosime</label><select data-t="greutate">${opt([400, 500, 600, 700, 800, 900].map((w) => [w, w]), T[k].greutate)}</select></div>
      <div class="f"><label>Spațiere între litere</label><select data-t="spatiere">${opt(['-0.04em', '-0.03em', '-0.02em', '-0.01em', '0em', '0.01em'].map((x) => [x, x]), T[k].spatiere)}</select></div></div>
      <div class="f"><label>Lățime <small>(doar pentru Archivo)</small></label><select data-t="latime">${opt(['88%', '94%', '100%', '106%', '112%', '118%', '125%'].map((x) => [x, x]), T[k].latime)}</select></div>` : ''}
  </div>`).join(''); };
const tipoPrev = (v) => { const T = v.tipografie, st = (t) => `'${t.font}', ${t.rezerva || 'system-ui, sans-serif'}`; ROLURI.forEach(([k]) => loadFont(T[k].font));
  return `<div class="b-prev-site"><small style="font-family:${st(T.etichete)}">ACCELERATORUL RBL</small><b style="font-family:${st(T.titluri)};font-weight:${T.titluri.greutate};font-stretch:${T.titluri.latime};letter-spacing:${T.titluri.spatiere};font-size:26px;line-height:1.1">Crește-ți compania alături de antreprenorii care au făcut-o deja.</b><p style="font-family:${st(T.text)}">Trei luni de ateliere cu lideri de business români. Diacritice: ă â î ș ț.</p><span style="font-family:${st(T.cifre)};font-size:34px;font-weight:${T.titluri.greutate}">6,4 mil. lei</span></div>`; };
/* ---------- forme ---------- */
const formeForm = (v) => `<div class="fs"><div class="f2"><div class="f"><label>Colțurile cardurilor</label><select data-f="raza">${opt(RAZE.map((x) => [x, x]), v.forme.raza)}</select></div>
  <div class="f"><label>Colțurile butoanelor</label><select data-f="raza_buton">${opt(RAZE_BTN.map((x) => [x, x === '999px' ? 'rotunjite complet' : x]), v.forme.raza_buton)}</select></div></div>
  <div class="f"><label>Umbra cardurilor</label><select data-f="umbra">${opt(UMBRE, v.forme.umbra)}</select></div></div>`;
const formePrev = (v) => { const c = (t) => v.culori.find((x) => x.token === t)?.hex; return `<div class="b-prev-card" style="border-radius:${v.forme.raza};box-shadow:${v.forme.umbra}"><b>Card de pe site</b><p>Colțuri ${esc(v.forme.raza)}</p><span class="b-prev-btn" style="background:${c('primary')};color:#fff;border-radius:${v.forme.raza_buton}">Buton</span></div>`; };
/* ---------- logo ---------- */
const logoForm = (v) => { const L = v.logo, ids = L.variante.map((x) => [x.id, x.nume]);
  return `<div class="fs"><h4>Unde apare pe site</h4><div class="f2"><div class="f"><label>Header</label><select data-l="header">${opt(ids, L.pe_site.header)}</select></div><div class="f"><label>Footer</label><select data-l="footer">${opt(ids, L.pe_site.footer)}</select></div></div>
    <div class="f2"><div class="f"><label>Iconița de tab (favicon)</label><div class="b-file" data-file="favicon"><img src="${esc(L.pe_site.favicon)}" alt=""><label class="lnk">înlocuiește<input type="file" accept="image/png,image/svg+xml" hidden></label></div></div>
      <div class="f"><label>Iconița pe telefon (180 px)</label><div class="b-file" data-file="apple_touch"><img src="${esc(L.pe_site.apple_touch)}" alt=""><label class="lnk">înlocuiește<input type="file" accept="image/png" hidden></label></div></div></div></div>
    <div class="fs"><h4>Fișierele logo-ului</h4><div class="b-logos">${L.variante.map((x, i) => `<div class="b-logo" data-i="${i}"><span class="blogo-img" style="background:${x.fundal === 'închis' ? '#34373E' : '#fff'}"><img src="${esc(x.web || x.fisier)}" alt=""></span><b>${esc(x.nume)}</b><label class="btn sm">Înlocuiește<input type="file" accept="image/png,image/svg+xml,image/webp" hidden></label></div>`).join('')}</div>
    <small class="ro">Încarcă fișierul nou pe fundal transparent (ideal SVG sau PNG). Varianta „pe fundal închis” trebuie să aibă textul deschis.</small></div>`; };
const logoPrev = (v) => { const L = v.logo, f = (id) => L.variante.find((x) => x.id === id); const h = f(L.pe_site.header), ft = f(L.pe_site.footer);
  return `<div class="b-prev-hdr"><img src="${esc(h?.web || h?.fisier || '')}" alt=""><span>Program · Ediții · Teme</span></div><div class="b-prev-ftr"><img src="${esc(ft?.web || ft?.fisier || '')}" alt=""></div>`; };

const ED_SEC = { culori: ['Culori', culoriForm, culoriPrev], tipografie: ['Tipografie', tipoForm, tipoPrev], forme: ['Forme', formeForm, formePrev], logo: ['Logo', logoForm, logoPrev] };
function openBrandEditor(sec, varId) {
  const v = JSON.parse(JSON.stringify(window.BRAND_DATA.variante.find((x) => x.id === varId)));
  BE = { v, sec };
  const [title, form, prev] = ED_SEC[sec];
  bDrawer(shell(`Editează: ${title}`, form(v), prev(v)));
}
// formularul -> varianta de lucru (BE.v), apoi previzualizarea
function readForm() {
  const f = $('#b-form'), v = BE.v;
  if (BE.sec === 'culori') $$('.b-color', f).forEach((row) => { const c = v.culori[row.dataset.i], hex = $('[data-c=hex]', row).value.trim(); if (/^#[0-9a-f]{6}$/i.test(hex)) c.hex = hex.toUpperCase(); });
  if (BE.sec === 'tipografie') $$('[data-rol]', f).forEach((box) => { const t = v.tipografie[box.dataset.rol]; $$('[data-t]', box).forEach((s) => { t[s.dataset.t] = s.dataset.t === 'greutate' ? Number(s.value) : s.value; }); if (box.dataset.rol === 'titluri' && !FONTS[t.font]?.w) t.latime = '100%'; });
  if (BE.sec === 'forme') $$('[data-f]', f).forEach((s) => { v.forme[s.dataset.f] = s.value; });
  if (BE.sec === 'logo') $$('[data-l]', f).forEach((s) => { v.logo.pe_site[s.dataset.l] = s.value; });
  $('#b-prev').innerHTML = ED_SEC[BE.sec][2](v);
}
async function uploadFile(file) {
  const data = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(file); });
  const r = await api.send('/api/upload', 'POST', { nume: 'logo-' + file.name.replace(/\.[a-z]+$/i, ''), data });
  return r.url;
}
document.addEventListener('input', (e) => {
  if (!BE || !e.target.closest('#b-form')) return;
  // culoarea: selectorul și codul hex rămân sincronizate
  const row = e.target.closest('.b-color');
  if (row) { if (e.target.dataset.c === 'pick') $('[data-c=hex]', row).value = e.target.value.toUpperCase(); else if (/^#[0-9a-f]{6}$/i.test(e.target.value)) $('[data-c=pick]', row).value = e.target.value; }
  readForm();
});
document.addEventListener('change', async (e) => {
  if (!BE) return;
  if (e.target.closest('#b-form') && e.target.tagName === 'SELECT') readForm();
  const inp = e.target.closest('#b-form input[type=file]');
  if (!inp || !inp.files[0]) return;
  try {
    const url = await uploadFile(inp.files[0]);
    const lg = inp.closest('.b-logo'), fav = inp.closest('[data-file]');
    if (lg) { const x = BE.v.logo.variante[lg.dataset.i]; x.fisier = url; x.web = url; x.sursa = 'încărcat din panou'; $('img', lg).src = url; }
    if (fav) { BE.v.logo.pe_site[fav.dataset.file] = url; $('img', fav).src = url; }
    readForm(); toast('Fișier încărcat. Apasă Salvează ca să-l folosești.');
  } catch (err) { toast(err.message); }
});
document.addEventListener('click', async (e) => {
  const ed = e.target.closest('[data-bedit]');
  if (ed) { openBrandEditor(ed.dataset.bedit, ed.dataset.var); return; }
  if (e.target.closest('[data-bclose]') || e.target.id === 'b-scrim') { bClose(); return; }
  const sv = e.target.closest('[data-bsave]');
  if (!sv || !BE) return;
  readForm();
  const v = BE.v, valori = { [BE.sec]: v[BE.sec] };
  if (BE.sec === 'tipografie') valori.google_fonts = fontsParam(v.tipografie);
  sv.disabled = true; sv.textContent = 'Se salvează…';
  try {
    await api.send('/api/editari', 'PUT', { op: 'brand', varianta: v.id, valori, eticheta: `branding: ${ED_SEC[BE.sec][0].toLowerCase()} (varianta ${v.id.toUpperCase()})` });
    bClose(); await CMS.refresh(); const y = window.scrollY; await routes.branding(); window.scrollTo(0, y);
    toast('Salvat. Se vede pe site-ul local; pe cel public după „Publică” din Modificări.');
  } catch (err) { toast(err.message); sv.disabled = false; sv.textContent = 'Salvează'; }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && BE) bClose(); });
