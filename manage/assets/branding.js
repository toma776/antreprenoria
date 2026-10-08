/* BRANDING: variantele de identitate vizuală din data/brand.json, cu detaliile lor, previzualizarea site-ului
   și butonul care schimbă varianta folosită pe site (/manage/branding). */

// fonturile variantelor se încarcă o singură dată, ca mostrele de tipografie să arate corect
function loadBrandFonts(B) {
  B.variante.forEach((v) => {
    const id = 'gf-' + v.id;
    if (document.getElementById(id)) return;
    const l = document.createElement('link');
    l.id = id; l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?${v.google_fonts}&display=swap`;
    document.head.appendChild(l);
  });
}
const fontStack = (t) => `'${t.font}', ${t.rezerva}`;
const colorOf = (v, token) => v.culori.find((c) => c.token === token)?.hex;

function variantHtml(v, activ) {
  const T = v.tipografie, isOn = v.id === activ;
  const main = v.culori.filter((c) => c.principala), rest = v.culori.filter((c) => !c.principala);
  const swatch = (c, big) => `<div class="bsw-c ${big ? 'big' : ''}"><span style="background:${esc(c.hex)}"></span><b>${esc(c.nume)}</b><code>${esc(c.hex)}</code><small>${esc(c.rol)}</small></div>`;
  return `<section class="card brand-var ${isOn ? 'is-on' : ''}" data-var="${esc(v.id)}">
    <div class="bv-head">
      <div><h2>${esc(v.id.toUpperCase())} · ${esc(v.nume)} ${isOn ? '<span class="tag ok">activ pe site</span>' : ''}</h2>
        <p class="lead" style="margin:6px 0 0">${esc(v.descriere)}</p>
        <p class="small" style="margin-top:6px"><b>De ce:</b> ${esc(v.de_ce)}</p></div>
      <div class="bv-act">
        ${isOn ? '<button class="primary" disabled>Folosită pe site</button>' : `<button class="primary" data-activate="${esc(v.id)}">Activează pe site</button>`}
        <a class="btn" href="/?brand=${encodeURIComponent(v.id)}" target="_blank" rel="noopener">Previzualizează ↗</a>
      </div>
    </div>

    <h4 class="bh">Culori principale</h4>
    <div class="bsw-grid">${main.map((c) => swatch(c, true)).join('')}</div>
    <details class="all-colors"><summary>Toate culorile (${v.culori.length})</summary>
      <div class="bsw-grid small-grid">${rest.map((c) => swatch(c)).join('')}</div></details>

    <h4 class="bh">Tipografie</h4>
    <div class="type-spec" style="background:${esc(colorOf(v, 'bg'))};color:${esc(colorOf(v, 'ink'))};border-radius:${esc(v.forme.raza)}">
      <div>
        <small style="color:${esc(colorOf(v, 'muted'))}">Titluri · ${esc(T.titluri.font)} ${T.titluri.greutate}${T.titluri.latime !== '100%' ? ` · lățime ${esc(T.titluri.latime)}` : ''}</small>
        <p class="ts-display" style="font-family:${fontStack(T.titluri)};font-weight:${T.titluri.greutate};font-stretch:${esc(T.titluri.latime)};letter-spacing:${esc(T.titluri.spatiere)}">Crește-ți compania alături de antreprenorii care au făcut-o deja.</p>
      </div>
      <div>
        <small style="color:${esc(colorOf(v, 'muted'))}">Text · ${esc(T.text.font)} · Cifre · ${esc(T.cifre.font)} · Etichete · ${esc(T.etichete.font)}</small>
        <p style="font-family:${fontStack(T.text)};color:${esc(colorOf(v, 'muted'))};margin:6px 0 14px">Trei luni, ateliere full-day și de seară cu lideri de business români. Diacritice: ă â î ș ț Ă Â Î Ș Ț.</p>
        <div class="ts-row">
          <span class="ts-num" style="font-family:${fontStack(T.cifre)};font-weight:${T.titluri.greutate};font-stretch:${esc(T.titluri.latime)};color:${esc(v.schema === 'dark' ? colorOf(v, 'accent') : colorOf(v, 'ink'))}">6,4<em> mil. lei</em></span>
          <span class="ts-btn" style="background:${esc(colorOf(v, 'primary'))};color:${esc(colorOf(v, 'primary-ink'))};border-radius:${esc(v.forme.raza_buton)};font-family:${fontStack(T.text)}">Aplică</span>
          <span class="ts-btn ghost" style="border-color:${esc(colorOf(v, 'line'))};border-radius:${esc(v.forme.raza_buton)};font-family:${fontStack(T.text)}">Cum funcționează</span>
          <span class="ts-eyebrow" style="font-family:${fontStack(T.etichete)};color:${esc(v.schema === 'dark' ? colorOf(v, 'accent') : colorOf(v, 'primary'))}">ACCELERATORUL RBL</span>
        </div>
      </div>
    </div>

    <h4 class="bh">Forme</h4>
    <dl class="kv"><dt>Colțuri carduri</dt><dd>${esc(v.forme.raza)}</dd><dt>Colțuri butoane</dt><dd>${esc(v.forme.raza_buton)}</dd><dt>Schemă</dt><dd>${v.schema === 'dark' ? 'fundal închis' : 'fundal deschis'}</dd></dl>

    <h4 class="bh">Homepage în această variantă</h4>
    <div class="bv-preview"><iframe src="/?brand=${encodeURIComponent(v.id)}" title="Previzualizare ${esc(v.nume)}" loading="lazy" tabindex="-1"></iframe></div>
  </section>`;
}

// previzualizarea e site-ul la 1440px, micșorat cât să umple lățimea cardului
function fitPreviews() {
  $(".bv-preview").forEach((box) => { const f = $("iframe", box), s = box.clientWidth / 1440; f.style.transform = `scale(${s})`; box.style.height = Math.round(900 * s) + "px"; });
}
window.addEventListener("resize", fitPreviews);

routes.branding = async function renderBranding() {
  $('#view').innerHTML = '<div class="empty">Se încarcă…</div>';
  const B = await api.get('/api/brand');
  if (!B) { $('#view').innerHTML = '<div class="card empty"><b>Lipsește data/brand.json</b></div>'; return; }
  loadBrandFonts(B);
  const activ = B.variante.find((v) => v.id === B.activ);
  $('#view').innerHTML = `
    <div class="head"><div><div class="crumb">manage › branding · data/brand.json</div><h1>Branding</h1></div>
      <a class="btn" href="/" target="_blank" rel="noopener">Deschide site-ul ↗</a></div>
    <p class="lead">Variantele de identitate vizuală ale site-ului. Cea activă se aplică imediat pe toate paginile: culori, fonturi, colțuri. Acum e activă <b>${esc(activ.id.toUpperCase())} · ${esc(activ.nume)}</b>.</p>
    ${[activ, ...B.variante.filter((v) => v !== activ)].map((v) => variantHtml(v, B.activ)).join('')}`;
  fitPreviews();
};

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-activate]');
  if (!b) return;
  b.disabled = true;
  try {
    const r = await api.send('/api/brand/activ', 'PUT', { id: b.dataset.activate });
    await routes.branding();
    window.scrollTo(0, 0);
    toast(`Varianta ${r.activ.toUpperCase()} e acum activă pe site`);
  } catch { b.disabled = false; toast('Nu s-a putut schimba varianta'); }
});
