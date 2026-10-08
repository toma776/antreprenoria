// Extrage datele brute din paginile edițiilor (source/site/antreprenoria-*.html) -> data/extract/editii-brut.json.
// Fiecare pagină de ediție are același șablon: hero, „Ai acces la”, agendă (agenda-item), valoare, prețuri, participanți.
const fs = require('fs');
const path = require('path');
const { ORIGIN, SOURCE, text, num, writeJson, today } = require('./lib');

const MONTHS = { ianuarie: 1, februarie: 2, martie: 3, aprilie: 4, mai: 5, iunie: 6, iulie: 7, august: 8, septembrie: 9, octombrie: 10, noiembrie: 11, decembrie: 12 };
// „25 SEPTEMBRIE 2026” -> 2026-09-25
function isoDate(s) {
  const m = String(s).toLowerCase().match(/(\d{1,2})\s+([a-zăâîșț]+)\s+(\d{4})/);
  if (!m || !MONTHS[m[2]]) return null;
  return `${m[3]}-${String(MONTHS[m[2]]).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}
const imgUrl = (src) => (src ? new URL(src, ORIGIN + '/').href : null);
const first = (re, s) => (s.match(re) || [])[1];

// împarte HTML-ul după un marcaj de început de bloc
function blocks(html, marker) {
  const parts = html.split(marker);
  parts.shift();
  return parts;
}

function parseSpeaker(box) {
  return {
    nume: text(first(/<strong>([\s\S]*?)<\/strong>/, box)),
    companie: text(first(/<span>([\s\S]*?)<\/span>/, box)) || null,
    linkedin: first(/href="(https?:\/\/[^"]*linkedin[^"]*)"/, box) || null,
    imagine: imgUrl(first(/<img[^>]*src="([^"]+)"/, box)),
    status: text(first(/class="status[^"]*">([\s\S]*?)<\/div>/, box)) || null,
  };
}

function parseAgendaItem(chunk) {
  const nr = Number(first(/<span>(\d+)<\/span>/, chunk));
  const dateBlock = first(/<div class="date">([\s\S]*?)<div class="lm-main-container">/, chunk) || '';
  const dateLines = text(dateBlock.replace(/<\/div>/g, '|')).split('|').map((x) => x.trim()).filter(Boolean);
  // blocul de dată are 0–2 rânduri: data și/sau locația (edițiile vechi au doar locația)
  const dateText = dateLines.find((l) => isoDate(l)) || null;
  const locatie = dateLines.find((l) => !isoDate(l)) || null;
  // la Cluj blocul de sponsor e ascuns (display: none)
  const topHidden = /<div class="top-section[^"]*"[^>]*display:\s*none/.test(chunk);
  const top = topHidden ? '' : first(/<div class="top-section[^"]*"[^>]*>([\s\S]*?)<h3/, chunk) || '';
  let sponsor = null;
  if (/atelier sponsorizat de/i.test(top)) {
    const href = first(/<a[^>]*href="([^"]+)"/, top);
    const src = first(/<img[^>]*src="([^"]+)"/, top);
    sponsor = { url: href || null, logo: imgUrl(src), alt: first(/<img[^>]*alt="([^"]*)"/, top) || null };
  }
  const caută = /Sponsorizează acest atelier/i.test(top) ? text(first(/<div class="is-popup">([\s\S]*?)<\/div>/, top)) : null;
  const titlu = text(first(/<h3[^>]*>([\s\S]*?)<\/h3>/, chunk));
  const descriere = text(first(/<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/, chunk)) || null;
  const list = first(/<div class="agenda-list">([\s\S]*)$/, chunk) || '';
  const program = blocks(list, '<div class="item">').map((it) => {
    const boxes = blocks(it, 'class="speaker-box"');
    return {
      interval: text(first(/<strong>([\s\S]*?)<\/strong>/, it)),
      activitate: text(first(/<\/strong>\s*<div>([\s\S]*?)<\/div>/, it)),
      speakeri: boxes.map(parseSpeaker).filter((s) => s.nume),
    };
  });
  return {
    nr,
    data_text: dateText,
    data: dateText ? isoDate(dateText) : null,
    locatie,
    titlu,
    descriere,
    sponsor,
    cauta_sponsor: caută,
    program,
  };
}

function parseEdition(file) {
  const html = fs.readFileSync(path.join(SOURCE, file), 'utf8');
  const slugPage = file.replace(/\.html$/, '');
  const hero = first(/<div class="hero-section">([\s\S]*?)<div class="big-carousel-container on-top">|<div class="hero-section">([\s\S]*?)<div id="agenda-section"/, html)
    || html.split('<div class="hero-section">')[1]?.split('id="agenda-section"')[0] || '';
  const right = first(/<div class="right-side[^"]*">([\s\S]*?)<div class="hero-label/, hero) || '';
  const heroPartners = [...right.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/g)].map((m) => imgUrl(m[1]));
  const heroPartnerLabel = text(first(/<div class="lm-mb-xs[^"]*">([\s\S]*?)<\/div>/, right)).replace(/:$/, '') || null;

  // „Ai acces la”
  const acces = first(/<div class="big-carousel-container on-top">([\s\S]*?)id="agenda-section"/, html) || '';
  const beneficii = [...acces.matchAll(/<h3>([\s\S]*?)<\/h3>/g)].map((m) => text(m[1]));
  const agendaIntro = text(first(/id="agenda-section"[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/, html)) || null;

  const agendaHtml = (html.split('<div class="agenda-section">')[1] || '').split('best-value-section')[0].split('id="prices-section"')[0].split('id="participant-section"')[0];
  const ateliere = blocks(agendaHtml, '<div class="agenda-item">').map(parseAgendaItem);

  const valoare = text(first(/class="best-value-section[^"]*">\s*<h2[^>]*>([\s\S]*?)<\/h2>/, html)) || null;
  const pricesHtml = first(/id="prices-section"([\s\S]*?)(?:id="participant-section"|class="program-container)/, html) || '';
  const preturi = blocks(pricesHtml, '<div class="lm-box offer').map((b) => ({
    eticheta: text(first(/<label>([\s\S]*?)<\/label>/, b)) || null,
    pret_text: text(first(/<div class="price">([\s\S]*?)<\/div>/, b)),
    pret: num(first(/<div class="price">([\s\S]*?)<\/div>/, b)),
    nota: text(first(/<\/div>\s*<p>([\s\S]*?)<\/p>/, b)) || null,
    link: first(/href="([^"]+)"/, b) || null,
    ascuns: /^\s*lm-none/.test(b),
  }));

  const partHtml = (html.split('id="participant-section"')[1] || '').split('<footer')[0];
  const participantiTitlu = text(first(/<h2[^>]*>([\s\S]*?)<\/h2>/, partHtml)) || null;
  const participanti = blocks(partHtml, '<div class="swiper-slide">').map((s) => {
    const ps = [...s.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => m[1]);
    const cifre = ps.find((p) => /cifr/.test(p)) || '';
    const strongs = [...cifre.matchAll(/<strong>([\s\S]*?)<\/strong>/g)].map((m) => text(m[1]));
    return {
      nume: text(first(/<h3>([\s\S]*?)<\/h3>/, s)),
      imagine: imgUrl(first(/<img[^>]*src="([^"]+)"/, s)),
      descriere: text(ps.find((p) => !/cifr/.test(p)) || '') || null,
      cifra_afaceri: num(strongs[0]),
      cifra_afaceri_text: strongs[0] || null,
      angajati: num(strongs[1]),
    };
  }).filter((p) => p.nume);

  // metodologia („Cum se desfășoară programul”) – doar unde există
  const progHtml = first(/class="program-container[^"]*">([\s\S]*?)(?:id="participant-section"|<footer)/, html) || '';
  const metodologie = blocks(progHtml, '<div class="item">').map((b) => ({
    titlu: text(first(/<h3>([\s\S]*?)<\/h3>/, b)),
    puncte: [...b.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => text(m[1])),
  })).filter((x) => x.titlu);

  return {
    slug: slugPage,
    url: `${ORIGIN}/${slugPage}`,
    titlu: text(first(/<h1[^>]*>([\s\S]*?)<\/h1>/, html)),
    subtitlu: text(first(/<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/, html)) || null,
    perioada: text(first(/<p class="lm-font-bold">([\s\S]*?)<\/p>/, right)) || null,
    status: text(first(/<div class="hero-label[^"]*">\s*<p>([\s\S]*?)<\/p>/, html)) || null,
    parteneri_hero: { eticheta: heroPartnerLabel, logo: heroPartners },
    beneficii,
    agenda_intro: agendaIntro,
    ateliere,
    valoare_estimata: valoare,
    preturi,
    participanti_titlu: participantiTitlu,
    participanti,
    metodologie,
    link_inscriere: first(/href="(https:\/\/(?:form\.jotform\.com|[a-z0-9]+\.formester\.com|www\.rbls\.ro\/produs)[^"]+)"/, html) || null,
  };
}

const files = fs.readdirSync(SOURCE).filter((f) => /^antreprenoria-[a-z0-9-]+\.html$/.test(f));
const editii = files.map(parseEdition);
writeJson('extract/editii-brut.json', { extras_la: today(), sursa: ORIGIN, editii });
for (const e of editii) {
  const sp = e.ateliere.reduce((n, a) => n + a.program.reduce((k, p) => k + p.speakeri.length, 0), 0);
  console.log(`${e.slug.padEnd(22)} ${String(e.perioada).padEnd(30)} ateliere ${e.ateliere.length}  speakeri ${sp}  participanți ${e.participanti.length}  prețuri ${e.preturi.length}  [${e.status}]`);
}
