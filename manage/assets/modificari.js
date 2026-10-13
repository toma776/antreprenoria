/* MODIFICĂRI: tot ce s-a schimbat din panou.
   - nepublicate: active doar local (site-ul local le arată, cel public nu), fiecare cu Publică / Respinge
   - istoricul publicărilor: fiecare publicare e o versiune a site-ului; se poate reveni la oricare
   Publicarea și respingerea folosesc aceleași butoane ca bara de modificări (cms.js); revenirea e aici. */
const when = (c) => new Date(c).toLocaleString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const TIP_V = { publicare: ['Publicare', 'ok'], revenire: ['Revenire', 'warn'], pornire: ['Pornire', 'grey'] };

routes.modificari = async function renderModificari() {
  $('#view').innerHTML = '<div class="head"><div><div class="crumb">manage › modificări</div><h1>Modificări</h1></div></div><div class="card empty">Se încarcă…</div>';
  const H = await api.get('/api/istoric');
  if (!H) { $('#view').innerHTML = '<div class="card empty"><b>Nu am putut încărca istoricul.</b></div>'; return; }
  const G = CMS.pendingGroups();
  const V = H.versiuni;
  const cur = V[0];
  $('#view').innerHTML = `
    <div class="head"><div><div class="crumb">manage › modificări</div><h1>Modificări</h1></div>
      ${H.editabil && G.length > 1 ? '<button class="primary" data-cms-publish="">Publică toate</button>' : ''}</div>
    <p class="lead">Tot ce se schimbă din panou. Modificările noi sunt active doar pe site-ul local până le publici; fiecare publicare devine o versiune a site-ului, la care poți reveni oricând.</p>

    <section><h2>De publicat <span class="n">${G.length}</span></h2>
      ${!H.editabil ? '<div class="card empty">Pe versiunea publicată panoul e doar pentru vizualizare. Modificările se fac și se publică din panoul local.</div>'
        : G.length ? `<div class="mod-list">${G.map((x) => `<div class="mod-row">
          <span class="mod-st"><span class="tag warn">activă local</span></span>
          <div class="mod-tx"><b>${x.ce.map(esc).join('<br>')}</b><small>${esc(when(x.cand))}</small></div>
          <div class="mod-act"><button data-cms-discard="${esc(x.ids.join(','))}">Respinge</button><button class="primary" data-cms-publish="${esc(x.ids.join(','))}">Publică</button></div>
        </div>`).join('')}</div>` : '<div class="card empty">Nicio modificare nepublicată. Tot ce vezi pe site-ul local e și pe cel public.</div>'}
    </section>

    <section><h2>Istoricul publicărilor <span class="n">${V.length}</span></h2>
      ${V.length ? `<ol class="mod-hist">${V.map((v, i) => `<li class="${i === 0 ? 'is-cur' : ''}">
          <i class="mod-dot"></i>
          <div class="mod-tx"><div class="mod-meta">${tags(TIP_V[v.tip]?.[0] || v.tip, TIP_V[v.tip]?.[1] || 'grey')}${i === 0 ? '<span class="tag ok">versiunea de acum</span>' : ''}<small>${esc(when(v.cand))}</small></div>
            <b>${(v.ce || []).map(esc).join('<br>')}</b></div>
          ${i > 0 && H.editabil ? `<button data-restore="${esc(v.id)}" data-when="${esc(when(v.cand))}">Revino la această versiune</button>` : ''}
        </li>`).join('')}</ol>` : '<div class="card empty">Nicio publicare încă. Prima publicare din panou creează și o versiune de pornire, la care poți reveni.</div>'}
      <p class="muted small">Revenirea readuce site-ul public la datele publicate atunci. Modificările nepublicate rămân pe listă. Revenirea apare și ea în istoric, deci poate fi anulată la rândul ei.</p>
    </section>`;
};

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-restore]');
  if (!b) return;
  if (!confirm(`Readuci site-ul public la versiunea din ${b.dataset.when}?\n\nToate publicările de după ea dispar de pe site (rămân în istoric, ca să poți reveni). Se trimite pe git și apare online în ~1 minut.`)) return;
  b.disabled = true; b.textContent = 'Se revine…';
  try {
    const r = await api.send('/api/restaureaza', 'POST', { versiune: b.dataset.restore });
    await CMS.refresh(); go(routeFromPath()); toast(r.mesaj);
  } catch (err) { toast(err.message); b.disabled = false; b.textContent = 'Revino la această versiune'; }
});
