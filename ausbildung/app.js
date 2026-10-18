// =============================================================
// Ausbildung – Lernen, Berichtsheft, Berufsschule, Formeln
// Daten: events (app='ausbildung': bericht, note, lernen)
//        app_data ausbildung/einstellungen, /karten, /eigene_karten
// =============================================================
import * as core from '../shared/core.js';
import { esc, toast, sheet, bestaetigen, uid, tagKey, plusTage, wochenStart } from '../shared/ui.js';
import { FRAGEN, THEMEN, thema, BOX_TAGE, noteAusPunkten, mischen } from './fragen.js';
import { KAT_BETRIEB, KAT_SCHULE, vorschlag, lerne, RECHNER, FORMELSAMMLUNG, num, fz } from './daten.js';
import * as buch from './buch.js';

const APP = 'ausbildung';
const $app = document.getElementById('app');
const $nav = document.getElementById('nav');
const TAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const TAGE_LANG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

let tab = 'start';
let E = [];
let cfg = {
  beginn: '', dauerMonate: 42, pruefung1: '', pruefung2: '',
  kategorien: { betrieb: [...KAT_BETRIEB], schule: [...KAT_SCHULE] },
  stundenplan: { 1: [], 2: [], 3: [], 4: [], 5: [] },
  wortschatz: {}, neuProTag: 10,
};
let karten = {};        // id -> { box, faellig, r, f }
let eigene = [];        // eigene Karteikarten
let berichtWoche = wochenStart(new Date());
let schulTag = Math.min(5, Math.max(1, new Date().getDay() || 1));
let buchTreffer = null, buchFrage = '';
const offenRechner = new Set(['ohm']);
const rechnerWerte = {};

const heute = () => tagKey(new Date());
const datumAus = (k) => new Date(k + 'T12:00');
const kw = (d) => { const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const t = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - t); const j = new Date(Date.UTC(x.getUTCFullYear(), 0, 1)); return Math.ceil(((x - j) / 864e5 + 1) / 7); };
const fmtD = (k, o = { weekday: 'short', day: 'numeric', month: 'short' }) => datumAus(k).toLocaleDateString('de-DE', o);
const alleKarten = () => [...FRAGEN, ...eigene.map((e) => ({ ...e, eigen: true, thema: 'eigen' }))];

// ---------- Speichern -----------------------------------------
async function speichereCfg() { try { await core.setAppData(APP, 'einstellungen', cfg); } catch { toast('Speichern fehlgeschlagen', true); } }
let kartenTimer;
function speichereKarten() { clearTimeout(kartenTimer); kartenTimer = setTimeout(() => core.setAppData(APP, 'karten', karten).catch(() => toast('Lernstand nicht gespeichert', true)), 400); }
async function speichereEigene() { try { await core.setAppData(APP, 'eigene_karten', eigene); } catch { toast('Speichern fehlgeschlagen', true); } }
async function eintragen(kind, title, data, starts_at = new Date().toISOString()) {
  const e = await core.addEvent({ app: APP, kind, title, starts_at, data });
  E.unshift(e); return e;
}

// ---------- Lernstand ------------------------------------------
function faellige() {
  const h = heute();
  return alleKarten().filter((k) => karten[k.id] && karten[k.id].faellig <= h);
}
function neueKarten(n) { return alleKarten().filter((k) => !karten[k.id]).slice(0, n); }
function bewerte(id, richtig) {
  const alt = karten[id] || { box: 0, r: 0, f: 0 };
  const box = richtig ? Math.min(5, alt.box + 1) : 1;
  karten[id] = { box, faellig: tagKey(plusTage(new Date(), richtig ? BOX_TAGE[box] : 1)), r: alt.r + (richtig ? 1 : 0), f: alt.f + (richtig ? 0 : 1) };
  speichereKarten();
}
function lernStatistik() {
  const tage = new Set(E.filter((e) => e.kind === 'lernen').map((e) => tagKey(e.starts_at)));
  let d = heute(); if (!tage.has(d)) d = tagKey(plusTage(new Date(), -1));
  let streak = 0; while (tage.has(d)) { streak++; d = tagKey(plusTage(datumAus(d), -1)); }
  const gesamt = alleKarten().length;
  const sicher = Object.values(karten).filter((k) => k.box >= 3).length;
  const gesehen = Object.keys(karten).length;
  return { streak, gesamt, sicher, gesehen, faellig: faellige().length, heute: tage.has(heute()) };
}
function themaStand(id) {
  const liste = FRAGEN.filter((f) => f.thema === id);
  const punkte = liste.reduce((s, f) => s + Math.min(3, karten[f.id]?.box || 0), 0);
  return { n: liste.length, anteil: punkte / (liste.length * 3) };
}

// ---------- Ausbildungs-Infos ---------------------------------
function ausbildungsInfo() {
  if (!cfg.beginn) return null;
  const b = datumAus(cfg.beginn), jetzt = new Date();
  const monate = (jetzt.getFullYear() - b.getFullYear()) * 12 + jetzt.getMonth() - b.getMonth() - (jetzt.getDate() < b.getDate() ? 1 : 0);
  const ende = new Date(b); ende.setMonth(ende.getMonth() + cfg.dauerMonate);
  const anteil = Math.min(1, Math.max(0, (jetzt - b) / (ende - b)));
  return { jahr: Math.min(4, Math.floor(Math.max(0, monate) / 12) + 1), anteil, ende, vorBeginn: jetzt < b };
}
function naechstePruefung() {
  const h = heute();
  return [['Teil 1', cfg.pruefung1], ['Teil 2', cfg.pruefung2]].filter(([, d]) => d && d >= h)
    .map(([n, d]) => ({ name: n, datum: d, tage: Math.round((datumAus(d) - datumAus(h)) / 864e5) })).sort((a, b) => a.tage - b.tage)[0] || null;
}
const istSchultag = (d) => (cfg.stundenplan[datumAus(d).getDay()] || []).length > 0;

// ---------- Berichtsheft --------------------------------------
const berichte = () => E.filter((e) => e.kind === 'bericht');
function berichtWocheListe(ws) {
  const von = tagKey(ws), bis = tagKey(plusTage(ws, 7));
  return berichte().filter((e) => e.data.datum >= von && e.data.datum < bis);
}
function wocheAlsText(ws) {
  const liste = berichtWocheListe(ws);
  const teile = [];
  for (const [ort, titel] of [['betrieb', 'Betriebliche Tätigkeiten'], ['schule', 'Berufsschule']]) {
    const l = liste.filter((e) => e.data.ort === ort);
    if (!l.length) continue;
    const gruppen = {};
    for (const e of l) (gruppen[e.data.kategorie || 'Ohne Kategorie'] ||= []).push(e);
    const std = l.reduce((s, e) => s + (e.data.stunden || 0), 0);
    teile.push(`${titel}${std ? ` (${fz(std, 3)} Std.)` : ''}\n` + Object.entries(gruppen).map(([k, es]) =>
      `${k}\n` + es.sort((a, b) => a.data.datum.localeCompare(b.data.datum)).map((e) => `- ${e.data.text}`).join('\n')).join('\n\n'));
  }
  return `KW ${kw(ws)} (${fmtD(tagKey(ws), { day: '2-digit', month: '2-digit' })} – ${fmtD(tagKey(plusTage(ws, 4)), { day: '2-digit', month: '2-digit', year: 'numeric' })})\n\n` + teile.join('\n\n');
}

// ---------- Noten ---------------------------------------------
const noten = () => E.filter((e) => e.kind === 'note');
function schnitt(liste) {
  const g = liste.reduce((s, e) => s + (e.data.gewicht || 1), 0);
  return g ? liste.reduce((s, e) => s + e.data.note * (e.data.gewicht || 1), 0) / g : null;
}
function faecher() {
  const s = new Set();
  Object.values(cfg.stundenplan).flat().forEach((x) => x.fach && s.add(x.fach));
  noten().forEach((e) => s.add(e.data.fach));
  return [...s].sort((a, b) => a.localeCompare(b, 'de', { numeric: true }));
}
const noteFarbe = (n) => (n == null ? 'var(--muted)' : n <= 2 ? 'var(--ok)' : n <= 3.5 ? '#F5C542' : 'var(--danger)');

// =============================================================
// Seiten
// =============================================================
function render() {
  $nav.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  ({ start: seiteStart, lernen: seiteLernen, bericht: seiteBericht, schule: seiteSchule, formeln: seiteFormeln })[tab]();
}
const bleib = (fn) => { const y = window.scrollY; fn(); window.scrollTo(0, y); };

function seiteStart() {
  const ai = ausbildungsInfo(), p = naechstePruefung(), ls = lernStatistik();
  const h = heute(), dow = new Date().getDay();
  const plan = cfg.stundenplan[dow] || [];
  const woche = berichtWocheListe(wochenStart(new Date()));
  const tageMit = new Set(woche.filter((e) => { const t = datumAus(e.data.datum).getDay(); return t >= 1 && t <= 5; }).map((e) => e.data.datum)).size;
  const werktage = Math.min(5, ((dow + 6) % 7) + 1);
  const gs = schnitt(noten());
  const stunde = new Date().getHours();

  $app.innerHTML = `
    <div class="page-head"><div><div class="muted small">${new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <h1>${stunde < 11 ? 'Moin' : stunde < 18 ? 'Weiter geht’s' : 'Feierabend'} ⚡</h1></div>
      <button class="icon-btn" data-a="einst" aria-label="Einstellungen">⚙︎</button></div>

    <div class="card az-hero">
      ${ai ? `<div class="row"><div class="grow"><div class="muted small">${ai.vorBeginn ? 'Ausbildung startet bald' : 'Ausbildungsjahr'}</div>
          <div class="az-gross">${ai.vorBeginn ? '0' : ai.jahr}<span>. Jahr</span></div></div>
          <div style="text-align:right"><div class="muted small">geschafft</div><div class="az-gross">${Math.round(ai.anteil * 100)}<span>%</span></div></div></div>
        <div class="xpbar az-bar"><i style="width:${ai.anteil * 100}%"></i></div>
        <div class="muted small" style="margin-top:6px">Ende vorauss. ${ai.ende.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</div>`
      : `<b>Elektroniker/-in für Energie- und Gebäudetechnik</b><p class="muted small" style="margin:6px 0 12px">Trag deinen Ausbildungsbeginn ein, dann siehst du hier deinen Fortschritt.</p><button class="btn btn-primary btn-block" data-a="einst">Ausbildung einrichten</button>`}
      ${p ? `<div class="az-pruef"><span>🎯 Prüfung ${p.name}</span><b>${p.tage === 0 ? 'heute!' : `in ${p.tage} ${p.tage === 1 ? 'Tag' : 'Tagen'}`}</b></div>` : ''}
    </div>

    <div class="section-title">Heute</div>
    <div class="card">
      ${plan.length ? `<div class="row" style="margin-bottom:8px"><span class="az-ort schule">🏫 Berufsschule</span></div>
        ${plan.map((s) => `<div class="stunde"><span class="num muted">${esc(s.von || '')}${s.bis ? '–' + esc(s.bis) : ''}</span><b class="grow">${esc(s.fach)}</b><span class="muted small">${esc(s.raum || '')}</span></div>`).join('')}`
      : `<div class="row"><span class="az-ort">${dow === 0 || dow === 6 ? '🛋️ Wochenende' : '🔧 Betrieb'}</span></div>`}
    </div>

    <div class="stats3" style="margin-top:10px">
      <button class="stat az-stat" data-a="lernen-start"><b class="num">${ls.faellig || (ls.heute ? '✓' : 0)}</b><span>${ls.faellig ? 'Karten fällig' : ls.heute ? 'Heute gelernt' : 'fällig'}</span></button>
      <button class="stat az-stat" data-a="tab" data-tab="lernen"><b class="num">🔥 ${ls.streak}</b><span>Lern-Streak</span></button>
      <button class="stat az-stat" data-a="tab" data-tab="schule"><b class="num" style="color:${noteFarbe(gs)}">${gs == null ? '–' : fz(gs, 2)}</b><span>Notenschnitt</span></button>
    </div>

    <div class="section-title">Berichtsheft · KW ${kw(new Date())} <button data-a="tab" data-tab="bericht">Öffnen</button></div>
    <div class="card">
      <div class="row"><div class="grow"><b>${tageMit} von ${dow === 0 || dow === 6 ? 5 : werktage} Tagen</b> eingetragen<div class="muted small">${woche.length} ${woche.length === 1 ? 'Tätigkeit' : 'Tätigkeiten'} diese Woche</div></div>
        <button class="btn btn-primary" data-a="bericht-neu">+ Eintrag</button></div>
      <div class="az-tage">${[0, 1, 2, 3, 4].map((i) => { const k = tagKey(plusTage(wochenStart(new Date()), i)); return `<span class="${woche.some((e) => e.data.datum === k) ? 'an' : ''} ${k === h ? 'heute' : ''}">${TAGE[(i + 1) % 7]}</span>`; }).join('')}</div>
    </div>

    <div class="section-title">Schnell</div>
    <div class="az-schnell">
      <button class="list-item" data-a="lernen-start"><span>🃏</span><span class="grow">Karteikarten</span><span class="chev">›</span></button>
      <button class="list-item" data-a="pruefung" data-teil="1"><span>📝</span><span class="grow">Probeprüfung Teil 1</span><span class="chev">›</span></button>
      <button class="list-item" data-a="tab" data-tab="formeln"><span>🧮</span><span class="grow">Formelrechner</span><span class="chev">›</span></button>
    </div>`;
}

async function seiteLernen() {
  const ls = lernStatistik();
  const pruef = E.filter((e) => e.kind === 'lernen' && e.data.modus === 'pruefung').slice(0, 5);
  const b = await buch.laden();
  if (tab !== 'lernen') return;
  $app.innerHTML = `
    <div class="page-head"><h1>Lernen</h1></div>
    <div class="card az-lernhero">
      <div class="row"><div class="grow"><div class="muted small">Sicher gelernt</div><div class="az-gross">${ls.sicher}<span> / ${ls.gesamt}</span></div></div>
        <div style="text-align:right"><div class="muted small">Streak</div><div class="az-gross">🔥${ls.streak}</div></div></div>
      <div class="xpbar"><i style="width:${(ls.sicher / Math.max(1, ls.gesamt)) * 100}%"></i></div>
      <button class="btn btn-primary btn-block btn-lg" data-a="lernen-start" style="margin-top:14px">🃏 ${ls.faellig ? `${ls.faellig} fällige Karten lernen` : 'Karteikarten lernen'}</button>
    </div>

    <div class="section-title">Probeprüfung</div>
    <div class="az-zwei">
      <button class="card az-pruefkarte" data-a="pruefung" data-teil="1"><b>Teil 1</b><span>20 Fragen · 30 Min</span><small>Grundlagen, Schutz, Prüfen, Installation</small></button>
      <button class="card az-pruefkarte" data-a="pruefung" data-teil="2"><b>Teil 2</b><span>25 Fragen · 40 Min</span><small>Alles inkl. Antriebe, Steuerung, KNX, WiSo</small></button>
    </div>
    ${pruef.length ? `<div class="card" style="margin-top:10px">${pruef.map((e) => { const n = noteAusPunkten(e.data.punkte); return `<div class="stunde"><span class="muted small">${fmtD(tagKey(e.starts_at))}</span><span class="grow">Teil ${e.data.teil}</span><b class="num">${e.data.punkte} P.</b><span class="pill" style="color:${noteFarbe(n.note)}">Note ${n.note}</span></div>`; }).join('')}</div>` : ''}

    <div class="section-title">Themen</div>
    <div class="card">${THEMEN.map((t) => { const s = themaStand(t.id); return `<button class="az-thema" data-a="thema" data-id="${t.id}">
      <span class="bicon" style="--b-farbe:${t.farbe}">${t.icon}</span>
      <span class="grow"><b>${t.name}</b><span class="balken"><i style="width:${s.anteil * 100}%;background:${t.farbe}"></i></span></span>
      <span class="muted small num">${s.n}</span></button>`; }).join('')}</div>

    <div class="section-title">Eigene Karten <button data-a="karte-neu">+ Neu</button></div>
    <div class="card">${eigene.length ? eigene.map((k) => `<button class="az-eigen" data-a="karte-bearb" data-id="${k.id}"><span class="grow"><b>${esc(k.frage)}</b><span class="muted small">${esc(k.antwort).slice(0, 90)}${k.seite ? ` · S. ${esc(k.seite)}` : ''}</span></span><span class="chev">›</span></button>`).join('')
      : '<p class="muted small" style="margin:0">Schreib dir Fragen aus deinem Buch oder der Berufsschule auf – sie landen automatisch im Karteikasten.</p>'}</div>

    <div class="section-title">Ausbildungsbuch ${b ? '<button data-a="buch-weg">Entfernen</button>' : ''}</div>
    <div class="card">
      ${b ? `<div class="row"><span style="font-size:22px">📖</span><div class="grow"><b class="ellipsis" style="display:block">${esc(b.name)}</b><span class="muted small">${b.seiten.length} ${b.pdf ? 'Seiten' : 'Abschnitte'} · nur auf diesem Gerät</span></div></div>
        <form class="az-suche" data-form="buch"><input class="search" name="q" placeholder="Im Buch suchen, z. B. Schleifenimpedanz" value="${esc(buchFrage)}" enterkeyhint="search"><button class="btn btn-primary">Suchen</button></form>
        ${buchTreffer ? (buchTreffer.length ? buchTreffer.map((t) => `<div class="az-treffer"><div class="row"><b>${b.pdf ? 'Seite' : 'Abschnitt'} ${t.seite}</b><span class="grow"></span><button class="mini-btn" data-a="karte-aus-buch" data-seite="${t.seite}">+ Karte</button></div><p>${markiere(t.auszug, t.woerter)}</p></div>`).join('') : '<p class="muted small">Nichts gefunden. Versuch andere oder weniger Wörter.</p>') : ''}`
      : `<p class="muted small" style="margin:0 0 12px">Lade dein Ausbildungsbuch als PDF (mit markierbarem Text) oder TXT. Dann kannst du darin suchen und findest sofort die richtige Seite. Die Datei bleibt auf diesem Gerät.</p>
        <label class="btn btn-block"><input type="file" accept=".pdf,.txt,application/pdf,text/plain" data-buch hidden>📖 Buch hochladen</label><p class="muted small" data-buch-status style="margin:8px 0 0"></p>`}
    </div>`;
}

function markiere(text, w) {
  let h = esc(text);
  for (const x of w) if (x.length > 2) h = h.replace(new RegExp(`(${x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
  return h;
}

function seiteBericht() {
  const ws = berichtWoche;
  const liste = berichtWocheListe(ws);
  const std = (o) => liste.filter((e) => e.data.ort === o).reduce((s, e) => s + (e.data.stunden || 0), 0);
  const tage = [0, 1, 2, 3, 4, 5].map((i) => tagKey(plusTage(ws, i)));
  const alle = berichte();
  const abdeckung = {};
  alle.forEach((e) => { if (e.data.ort === 'betrieb') abdeckung[e.data.kategorie] = (abdeckung[e.data.kategorie] || 0) + 1; });
  const max = Math.max(1, ...Object.values(abdeckung));

  $app.innerHTML = `
    <div class="page-head"><h1>Berichtsheft</h1><button class="btn btn-primary" data-a="bericht-neu">+ Eintrag</button></div>
    <div class="az-kwnav card">
      <button class="icon-btn" data-a="woche" data-d="-1" aria-label="Vorige Woche">‹</button>
      <div class="grow" style="text-align:center"><b>KW ${kw(ws)}</b><div class="muted small">${fmtD(tagKey(ws), { day: 'numeric', month: 'short' })} – ${fmtD(tagKey(plusTage(ws, 4)), { day: 'numeric', month: 'short', year: 'numeric' })}</div></div>
      <button class="icon-btn" data-a="woche" data-d="1" aria-label="Nächste Woche">›</button>
    </div>
    <div class="stats3" style="margin-top:10px">
      <div class="stat"><b class="num">${liste.length}</b><span>Tätigkeiten</span></div>
      <div class="stat"><b class="num">${fz(std('betrieb'), 3)}</b><span>Std. Betrieb</span></div>
      <div class="stat"><b class="num">${fz(std('schule'), 3)}</b><span>Std. Schule</span></div>
    </div>
    ${tage.map((d) => {
      const es = liste.filter((e) => e.data.datum === d);
      if (!es.length && datumAus(d).getDay() === 6) return '';
      return `<div class="section-title">${fmtD(d, { weekday: 'long', day: 'numeric', month: 'short' })} ${d <= heute() ? `<button data-a="bericht-neu" data-datum="${d}">+ Hinzufügen</button>` : ''}</div>
        ${es.length ? es.map((e) => `<button class="list-item az-eintrag" data-a="bericht-bearb" data-id="${e.id}">
          <span class="az-ortpunkt ${e.data.ort}"></span>
          <span class="grow"><span class="az-text">${esc(e.data.text)}</span><span class="muted small">${esc(e.data.kategorie || 'Ohne Kategorie')}${e.data.stunden ? ` · ${fz(e.data.stunden, 3)} Std.` : ''}</span></span></button>`).join('')
        : `<div class="muted small az-leer">${istSchultag(d) ? '🏫 Schultag – noch nichts eingetragen' : 'Noch nichts eingetragen'}</div>`}`;
    }).join('')}
    ${liste.length ? `<button class="btn btn-block" data-a="woche-kopieren" style="margin-top:18px">📋 Woche als Text kopieren</button>` : ''}

    ${Object.keys(abdeckung).length ? `<div class="section-title">Abdeckung im Betrieb (gesamt)</div>
    <div class="card">${cfg.kategorien.betrieb.map((k) => `<div class="balken-zeile"><span class="ellipsis" title="${esc(k)}">${esc(k)}</span><div><i style="width:${((abdeckung[k] || 0) / max) * 100}%"></i></div><b class="num">${abdeckung[k] || 0}</b></div>`).join('')}
      <p class="muted small" style="margin:10px 0 0">So siehst du, welche Bereiche aus deinem Ausbildungsrahmenplan noch zu kurz kommen.</p></div>` : ''}`;
}

function seiteSchule() {
  const plan = cfg.stundenplan[schulTag] || [];
  const alleNoten = noten();
  const fs = faecher();
  const gs = schnitt(alleNoten);
  $app.innerHTML = `
    <div class="page-head"><h1>Berufsschule</h1></div>
    <div class="section-title">Stundenplan <button data-a="stunde-neu">+ Stunde</button></div>
    <div class="seg" data-seg="tag">${[1, 2, 3, 4, 5].map((d) => `<button data-v="${d}" class="${schulTag === d ? 'on' : ''}">${TAGE[d]}${(cfg.stundenplan[d] || []).length ? ' •' : ''}</button>`).join('')}</div>
    <div class="card" style="margin-top:10px">${plan.length ? plan.map((s, i) => `<button class="stunde az-stunde" data-a="stunde-bearb" data-i="${i}"><span class="num muted">${esc(s.von || '–')}${s.bis ? '–' + esc(s.bis) : ''}</span><b class="grow">${esc(s.fach)}</b><span class="muted small">${esc(s.raum || '')}</span></button>`).join('')
      : `<p class="muted small" style="margin:0">${TAGE_LANG[schulTag]} ist kein Schultag. Trag deine Stunden ein, dann erkennt die App deine Schultage – auch fürs Berichtsheft.</p>`}</div>

    <div class="section-title">Noten <button data-a="note-neu">+ Note</button></div>
    <div class="card az-schnitt"><div class="grow"><div class="muted small">Gesamtschnitt (gewichtet)</div><div class="az-gross" style="color:${noteFarbe(gs)}">${gs == null ? '–' : fz(gs, 3)}</div></div><div class="muted small" style="text-align:right">${alleNoten.length} ${alleNoten.length === 1 ? 'Note' : 'Noten'}<br>${fs.length} ${fs.length === 1 ? 'Fach' : 'Fächer'}</div></div>
    ${fs.map((f) => {
      const ns = alleNoten.filter((e) => e.data.fach === f).sort((a, b) => a.data.datum.localeCompare(b.data.datum));
      const s = schnitt(ns);
      return `<div class="card az-fach"><div class="row"><b class="grow">${esc(f)}</b><b class="num" style="color:${noteFarbe(s)}">${s == null ? '–' : fz(s, 3)}</b></div>
        ${ns.length ? `<div class="az-noten">${ns.map((e) => `<button class="az-note" data-a="note-bearb" data-id="${e.id}" style="--n:${noteFarbe(e.data.note)}" title="${esc(e.data.art)} ${fmtD(e.data.datum)}"><b>${fz(e.data.note, 2)}</b><span>${esc(kurzArt(e.data.art))}</span></button>`).join('')}</div>` : '<div class="muted small" style="margin-top:6px">Noch keine Noten</div>'}</div>`;
    }).join('') || '<div class="empty">Noch keine Noten. Leg los mit „+ Note“.</div>'}`;
}
const kurzArt = (a) => ({ Klassenarbeit: 'KA', Test: 'Test', Mündlich: 'mdl.', Referat: 'Ref.', Praxis: 'Prax.' }[a] || a || '');

function seiteFormeln() {
  $app.innerHTML = `
    <div class="page-head"><h1>Formeln</h1></div>
    ${RECHNER.map((r) => `<div class="card az-rechner" data-r="${r.id}">
      <button class="az-rkopf" data-a="rechner" data-id="${r.id}"><b class="grow">${r.name}</b><span class="chev">${offenRechner.has(r.id) ? '▾' : '▸'}</span></button>
      ${offenRechner.has(r.id) ? `${r.hinweis ? `<p class="muted small" style="margin:2px 0 10px">${r.hinweis}</p>` : ''}
      <div class="az-felder">${r.felder.map(([k, label, einheit, std = '', typ]) => {
        const wert = rechnerWerte[r.id]?.[k] ?? std;
        if (String(einheit).startsWith('wahl:')) return `<label class="field"><span>${label}</span><select data-in="${k}">${einheit.slice(5).split(';').map((o) => { const [v, t] = o.split('|'); return `<option value="${v}" ${wert === v ? 'selected' : ''}>${t}</option>`; }).join('')}</select></label>`;
        return `<label class="field ${typ === 'text' ? 'breit' : ''}"><span>${label}${einheit ? ` <em>${einheit}</em>` : ''}</span><input data-in="${k}" inputmode="${typ === 'text' ? 'text' : 'decimal'}" value="${esc(wert)}" autocomplete="off"></label>`;
      }).join('')}</div>
      <div class="az-erg" data-erg></div>
      <button class="mini-btn" data-a="rechner-leeren" data-id="${r.id}">Leeren</button>` : ''}
    </div>`).join('')}
    <div class="section-title">Formelsammlung</div>
    <div class="card az-sammlung">${FORMELSAMMLUNG.map(([n, f]) => `<div><span class="muted small">${n}</span><b>${f}</b></div>`).join('')}</div>`;
  RECHNER.filter((r) => offenRechner.has(r.id)).forEach(rechnen);
}

function rechnen(r) {
  const el = $app.querySelector(`[data-r="${r.id}"]`); if (!el) return;
  const v = {};
  el.querySelectorAll('[data-in]').forEach((i) => { v[i.dataset.in] = i.value; });
  rechnerWerte[r.id] = v;
  const e = r.rechne(v);
  el.querySelector('[data-erg]').innerHTML = e.warn ? `<span class="az-warn">${e.warn}</span>` : e.info ? `<span class="muted">${e.info}</span>`
    : `<div class="az-ergwerte">${e.erg.map((x) => `<b>${x}</b>`).join('')}</div>${e.okText ? `<div style="color:${e.ok ? 'var(--ok)' : 'var(--danger)'};font-weight:700;margin-top:6px">${e.okText}</div>` : ''}${e.extra ? `<div class="small" style="margin-top:6px">${e.extra}</div>` : ''}<div class="az-formel">${e.formel}</div>`;
}

// =============================================================
// Sheets & Lernsitzungen
// =============================================================
function einstellungen() {
  const liste = (ort) => cfg.kategorien[ort].map((k, i) => `<div class="az-kat"><span class="grow">${esc(k)}</span><button class="icon-btn" data-k="weg" data-ort="${ort}" data-i="${i}" aria-label="Entfernen">×</button></div>`).join('');
  sheet(`<h2>Einstellungen</h2>
    <div class="az-zwei"><label class="field"><span>Ausbildungsbeginn</span><input type="date" data-c="beginn" value="${esc(cfg.beginn)}"></label>
      <label class="field"><span>Dauer</span><select data-c="dauerMonate">${[[24, '2 Jahre'], [30, '2,5 Jahre'], [36, '3 Jahre'], [42, '3,5 Jahre']].map(([v, t]) => `<option value="${v}" ${cfg.dauerMonate === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
    <div class="az-zwei"><label class="field"><span>Prüfung Teil 1</span><input type="date" data-c="pruefung1" value="${esc(cfg.pruefung1)}"></label>
      <label class="field"><span>Prüfung Teil 2</span><input type="date" data-c="pruefung2" value="${esc(cfg.pruefung2)}"></label></div>
    <div class="section-title">Kategorien Betrieb</div><div data-liste="betrieb">${liste('betrieb')}</div>
    <form class="az-suche" data-k-neu="betrieb"><input class="search" placeholder="Neue Kategorie" maxlength="140"><button class="btn">+</button></form>
    <div class="section-title">Kategorien Berufsschule</div><div data-liste="schule">${liste('schule')}</div>
    <form class="az-suche" data-k-neu="schule"><input class="search" placeholder="Neue Kategorie" maxlength="140"><button class="btn">+</button></form>
    <div class="section-title">Konto</div>
    <a class="list-item" href="../" style="text-decoration:none;color:inherit"><span class="grow">← Alle Apps</span></a>
    <button class="list-item" data-k="logout" style="color:var(--danger)"><span class="grow">Abmelden</span></button>
    <div class="sheet-actions"><button class="btn btn-primary" data-k="zu">Fertig</button></div>`,
  (el, close) => {
    el.querySelectorAll('[data-c]').forEach((i) => i.onchange = async () => {
      cfg[i.dataset.c] = i.dataset.c === 'dauerMonate' ? Number(i.value) : i.value;
      await speichereCfg(); toast('Gespeichert ✓');
    });
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      if (b.dataset.k === 'zu') { close(); render(); }
      if (b.dataset.k === 'logout') core.logout();
      if (b.dataset.k === 'weg') {
        const ort = b.dataset.ort, i = Number(b.dataset.i), name = cfg.kategorien[ort][i];
        const n = berichte().filter((x) => x.data.kategorie === name).length;
        if (n && !(await bestaetigen('Kategorie entfernen?', `„${name}“ hat ${n} Einträge. Die bleiben erhalten, aber du kannst die Kategorie nicht mehr neu auswählen.`, 'Entfernen'))) { einstellungen(); return; }
        cfg.kategorien[ort].splice(i, 1); await speichereCfg();
        el.querySelector(`[data-liste="${ort}"]`).innerHTML = liste(ort);
        if (n) einstellungen();
      }
    });
    el.querySelectorAll('[data-k-neu]').forEach((f) => f.onsubmit = async (e) => {
      e.preventDefault();
      const ort = f.dataset.kNeu, inp = f.querySelector('input'), v = inp.value.trim(); if (!v) return;
      if (!cfg.kategorien[ort].some((k) => k.toLowerCase() === v.toLowerCase())) cfg.kategorien[ort].push(v);
      inp.value = ''; await speichereCfg();
      el.querySelector(`[data-liste="${ort}"]`).innerHTML = liste(ort);
    });
  }, () => render());
}

// ---------- Berichtsheft-Eintrag -------------------------------
function berichtNeu(datum = heute()) {
  let ort = istSchultag(datum) ? 'schule' : 'betrieb';
  let zeilen = [];
  const katOpts = (o, sel) => `<option value="">Ohne Kategorie</option>` + cfg.kategorien[o].map((k) => `<option ${k === sel ? 'selected' : ''}>${esc(k)}</option>`).join('');
  sheet(`<h2>Was hast du gemacht?</h2>
    <div class="az-zwei"><label class="field"><span>Datum</span><input type="date" data-f="datum" value="${datum}" max="${heute()}"></label>
      <label class="field"><span>Stunden gesamt</span><input data-f="stunden" inputmode="decimal" placeholder="z. B. 8"></label></div>
    <div class="seg" data-f="ort"><button data-v="betrieb" class="${ort === 'betrieb' ? 'on' : ''}">🔧 Betrieb</button><button data-v="schule" class="${ort === 'schule' ? 'on' : ''}">🏫 Schule</button></div>
    <label class="field" style="margin-top:12px"><span>Tätigkeiten – eine pro Zeile</span>
      <textarea data-f="text" rows="5" placeholder="Leitungen im Neubau verlegt&#10;Steckdosen gesetzt und angeschlossen&#10;Isolationsmessung durchgeführt"></textarea></label>
    <div data-vorschau></div>
    <div class="sheet-actions"><button class="btn" data-x="zu">Abbrechen</button><button class="btn btn-primary" data-x="ok">Speichern</button></div>`,
  (el, close) => {
    const $t = el.querySelector('[data-f="text"]'), $v = el.querySelector('[data-vorschau]');
    const zeichne = () => {
      const alt = zeilen;
      zeilen = $t.value.split('\n').map((s) => s.replace(/^[-•*\s]+/, '').trim()).filter(Boolean).map((text, i) => {
        const vorher = alt[i];
        const v = vorschlag(text, cfg.kategorien[ort], cfg.wortschatz);
        return { text, kategorie: vorher && vorher.text === text && vorher.manuell ? vorher.kategorie : (v || ''), vorschlag: !!v, manuell: vorher?.text === text ? vorher.manuell : false };
      });
      $v.innerHTML = zeilen.length ? `<div class="muted small" style="margin-bottom:6px">Zuordnung – bei Bedarf ändern:</div>` + zeilen.map((z, i) => `<div class="az-vzeile"><span>${esc(z.text)}</span><select data-zeile="${i}">${katOpts(ort, z.kategorie)}</select></div>`).join('') : '';
    };
    let t; $t.oninput = () => { clearTimeout(t); t = setTimeout(zeichne, 250); };
    $v.onchange = (e) => { const s = e.target.closest('[data-zeile]'); if (!s) return; zeilen[s.dataset.zeile].kategorie = s.value; zeilen[s.dataset.zeile].manuell = true; };
    el.querySelectorAll('[data-f="ort"] button').forEach((b) => b.onclick = () => {
      ort = b.dataset.v; el.querySelectorAll('[data-f="ort"] button').forEach((x) => x.classList.toggle('on', x === b));
      zeilen.forEach((z) => { z.manuell = false; }); zeichne();
    });
    el.querySelector('[data-f="datum"]').onchange = (e) => {
      const neu = istSchultag(e.target.value) ? 'schule' : 'betrieb';
      if (neu !== ort) el.querySelector(`[data-f="ort"] [data-v="${neu}"]`).click();
    };
    el.querySelector('[data-x="zu"]').onclick = close;
    el.querySelector('[data-x="ok"]').onclick = async (e) => {
      zeichne();
      if (!zeilen.length) { toast('Schreib mindestens eine Tätigkeit auf', true); return; }
      const d = el.querySelector('[data-f="datum"]').value || heute();
      const gesamt = num(el.querySelector('[data-f="stunden"]').value);
      const proZeile = gesamt > 0 ? Math.round((gesamt / zeilen.length) * 100) / 100 : null;
      e.target.disabled = true;
      try {
        for (const z of zeilen) {
          await eintragen('bericht', z.text, { datum: d, ort, kategorie: z.kategorie, text: z.text, stunden: proZeile }, datumAus(d).toISOString());
          if (z.kategorie) cfg.wortschatz = lerne(cfg.wortschatz, z.kategorie, z.text);
        }
        await speichereCfg();
        toast(`${zeilen.length} ${zeilen.length === 1 ? 'Eintrag' : 'Einträge'} gespeichert ✓`);
        berichtWoche = wochenStart(datumAus(d));
        close(); render();
      } catch { e.target.disabled = false; toast('Speichern fehlgeschlagen', true); }
    };
    setTimeout(() => $t.focus(), 250);
  });
}

function berichtBearbeiten(ev) {
  const d = ev.data;
  sheet(`<h2>Eintrag bearbeiten</h2>
    <label class="field"><span>Tätigkeit</span><textarea data-f="text" rows="3">${esc(d.text)}</textarea></label>
    <div class="az-zwei"><label class="field"><span>Datum</span><input type="date" data-f="datum" value="${d.datum}"></label>
      <label class="field"><span>Stunden</span><input data-f="stunden" inputmode="decimal" value="${d.stunden ? fz(d.stunden, 3) : ''}"></label></div>
    <div class="seg" data-f="ort"><button data-v="betrieb" class="${d.ort === 'betrieb' ? 'on' : ''}">🔧 Betrieb</button><button data-v="schule" class="${d.ort === 'schule' ? 'on' : ''}">🏫 Schule</button></div>
    <label class="field" style="margin-top:12px"><span>Kategorie</span><select data-f="kategorie"></select></label>
    <div class="sheet-actions"><button class="btn btn-danger" data-x="weg">Löschen</button><button class="btn btn-primary" data-x="ok">Speichern</button></div>`,
  (el, close) => {
    let ort = d.ort;
    const opts = () => { const l = cfg.kategorien[ort]; el.querySelector('[data-f="kategorie"]').innerHTML = `<option value="">Ohne Kategorie</option>` + [...new Set([...(d.ort === ort && d.kategorie && !l.includes(d.kategorie) ? [d.kategorie] : []), ...l])].map((k) => `<option ${k === d.kategorie ? 'selected' : ''}>${esc(k)}</option>`).join(''); };
    opts();
    el.querySelectorAll('[data-f="ort"] button').forEach((b) => b.onclick = () => { ort = b.dataset.v; el.querySelectorAll('[data-f="ort"] button').forEach((x) => x.classList.toggle('on', x === b)); opts(); });
    el.querySelector('[data-x="weg"]').onclick = async () => {
      try { await core.deleteEvent(ev.id); E = E.filter((x) => x.id !== ev.id); close(); render(); toast('Gelöscht'); } catch { toast('Löschen fehlgeschlagen', true); }
    };
    el.querySelector('[data-x="ok"]').onclick = async () => {
      const text = el.querySelector('[data-f="text"]').value.trim(); if (!text) return;
      const datum = el.querySelector('[data-f="datum"]').value || d.datum;
      const kategorie = el.querySelector('[data-f="kategorie"]').value;
      const data = { ...d, text, datum, ort, kategorie, stunden: num(el.querySelector('[data-f="stunden"]').value) || null };
      try {
        const neu = await core.updateEvent(ev.id, { title: text, data, starts_at: datumAus(datum).toISOString() });
        E = E.map((x) => (x.id === ev.id ? neu : x));
        if (kategorie && kategorie !== d.kategorie) { cfg.wortschatz = lerne(cfg.wortschatz, kategorie, text); speichereCfg(); }
        close(); render();
      } catch { toast('Speichern fehlgeschlagen', true); }
    };
  });
}

// ---------- Stundenplan & Noten --------------------------------
function stundeSheet(i = null) {
  const s = i == null ? { von: '', bis: '', fach: '', raum: '' } : cfg.stundenplan[schulTag][i];
  const vorschlaege = faecher();
  sheet(`<h2>${i == null ? 'Stunde hinzufügen' : 'Stunde bearbeiten'} · ${TAGE_LANG[schulTag]}</h2>
    <label class="field"><span>Fach / Lernfeld</span><input data-f="fach" list="az-faecher" value="${esc(s.fach)}" placeholder="z. B. LF5 oder Deutsch"></label>
    <datalist id="az-faecher">${[...new Set([...vorschlaege, ...cfg.kategorien.schule.map((k) => k.split(' ')[0])])].map((f) => `<option value="${esc(f)}">`).join('')}</datalist>
    <div class="az-drei"><label class="field"><span>Von</span><input type="time" data-f="von" value="${esc(s.von)}"></label>
      <label class="field"><span>Bis</span><input type="time" data-f="bis" value="${esc(s.bis)}"></label>
      <label class="field"><span>Raum</span><input data-f="raum" value="${esc(s.raum)}"></label></div>
    <div class="sheet-actions">${i != null ? '<button class="btn btn-danger" data-x="weg">Löschen</button>' : ''}<button class="btn btn-primary" data-x="ok">Speichern</button></div>`,
  (el, close) => {
    const wert = (k) => el.querySelector(`[data-f="${k}"]`).value.trim();
    el.querySelector('[data-x="ok"]').onclick = async () => {
      const neu = { fach: wert('fach'), von: wert('von'), bis: wert('bis'), raum: wert('raum') };
      if (!neu.fach) { toast('Fach eintragen', true); return; }
      const tag = [...(cfg.stundenplan[schulTag] || [])];
      if (i == null) tag.push(neu); else tag[i] = neu;
      cfg.stundenplan[schulTag] = tag.sort((a, b) => (a.von || '99').localeCompare(b.von || '99'));
      await speichereCfg(); close(); render();
    };
    el.querySelector('[data-x="weg"]')?.addEventListener('click', async () => {
      cfg.stundenplan[schulTag].splice(i, 1); await speichereCfg(); close(); render();
    });
  });
}

function noteSheet(ev = null) {
  const d = ev?.data || { fach: '', note: '', art: 'Klassenarbeit', gewicht: 2, datum: heute(), thema: '' };
  const ARTEN = [['Klassenarbeit', 2], ['Test', 1], ['Mündlich', 1], ['Referat', 1], ['Praxis', 1]];
  sheet(`<h2>${ev ? 'Note bearbeiten' : 'Neue Note'}</h2>
    <label class="field"><span>Fach</span><input data-f="fach" list="az-faecher2" value="${esc(d.fach)}" placeholder="z. B. LF2"></label>
    <datalist id="az-faecher2">${faecher().map((f) => `<option value="${esc(f)}">`).join('')}</datalist>
    <div class="field"><span>Note</span><div class="az-notenwahl">${[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6].map((n) => `<button data-n="${n}" class="${Number(d.note) === n ? 'on' : ''}">${fz(n)}</button>`).join('')}</div>
      <input data-f="note" inputmode="decimal" value="${d.note === '' ? '' : fz(d.note, 3)}" placeholder="oder eintippen, z. B. 2,3" style="margin-top:8px"></div>
    <div class="field"><span>Art</span><div class="chips">${ARTEN.map(([a, g]) => `<button data-art="${a}" data-g="${g}" class="${d.art === a ? 'on' : ''}">${a}</button>`).join('')}</div></div>
    <div class="az-zwei"><label class="field"><span>Gewichtung</span><input data-f="gewicht" inputmode="decimal" value="${fz(d.gewicht || 1)}"></label>
      <label class="field"><span>Datum</span><input type="date" data-f="datum" value="${d.datum}"></label></div>
    <label class="field"><span>Thema (optional)</span><input data-f="thema" value="${esc(d.thema || '')}"></label>
    <div class="sheet-actions">${ev ? '<button class="btn btn-danger" data-x="weg">Löschen</button>' : ''}<button class="btn btn-primary" data-x="ok">Speichern</button></div>`,
  (el, close) => {
    let art = d.art;
    const f = (k) => el.querySelector(`[data-f="${k}"]`);
    el.querySelectorAll('[data-n]').forEach((b) => b.onclick = () => { f('note').value = fz(Number(b.dataset.n)); el.querySelectorAll('[data-n]').forEach((x) => x.classList.toggle('on', x === b)); });
    el.querySelectorAll('[data-art]').forEach((b) => b.onclick = () => { art = b.dataset.art; f('gewicht').value = b.dataset.g; el.querySelectorAll('[data-art]').forEach((x) => x.classList.toggle('on', x === b)); });
    el.querySelector('[data-x="ok"]').onclick = async () => {
      const note = num(f('note').value), fach = f('fach').value.trim();
      if (!fach) { toast('Fach eintragen', true); return; }
      if (!(note >= 1 && note <= 6)) { toast('Note zwischen 1 und 6', true); return; }
      const data = { fach, note, art, gewicht: num(f('gewicht').value) || 1, datum: f('datum').value || heute(), thema: f('thema').value.trim() };
      try {
        if (ev) { const neu = await core.updateEvent(ev.id, { title: `${fach}: ${note}`, data, starts_at: datumAus(data.datum).toISOString() }); E = E.map((x) => (x.id === ev.id ? neu : x)); }
        else await eintragen('note', `${fach}: ${note}`, data, datumAus(data.datum).toISOString());
        close(); render();
      } catch { toast('Speichern fehlgeschlagen', true); }
    };
    el.querySelector('[data-x="weg"]')?.addEventListener('click', async () => {
      try { await core.deleteEvent(ev.id); E = E.filter((x) => x.id !== ev.id); close(); render(); } catch { toast('Löschen fehlgeschlagen', true); }
    });
  });
}

// ---------- Eigene Karten --------------------------------------
function karteSheet(k = null, seite = '') {
  const d = k || { frage: '', antwort: '', seite };
  sheet(`<h2>${k ? 'Karte bearbeiten' : 'Neue Karteikarte'}</h2>
    <label class="field"><span>Frage</span><textarea data-f="frage" rows="2">${esc(d.frage)}</textarea></label>
    <label class="field"><span>Antwort</span><textarea data-f="antwort" rows="4">${esc(d.antwort)}</textarea></label>
    <label class="field"><span>Buchseite (optional)</span><input data-f="seite" value="${esc(d.seite || '')}" inputmode="numeric"></label>
    <div class="sheet-actions">${k ? '<button class="btn btn-danger" data-x="weg">Löschen</button>' : ''}<button class="btn btn-primary" data-x="ok">Speichern</button></div>`,
  (el, close) => {
    const f = (x) => el.querySelector(`[data-f="${x}"]`).value.trim();
    el.querySelector('[data-x="ok"]').onclick = async () => {
      if (!f('frage') || !f('antwort')) { toast('Frage und Antwort eintragen', true); return; }
      const neu = { id: k?.id || 'e' + uid(), frage: f('frage'), antwort: f('antwort'), seite: f('seite') };
      eigene = k ? eigene.map((x) => (x.id === k.id ? neu : x)) : [...eigene, neu];
      await speichereEigene(); close(); render();
    };
    el.querySelector('[data-x="weg"]')?.addEventListener('click', async () => {
      eigene = eigene.filter((x) => x.id !== k.id); delete karten[k.id]; speichereKarten();
      await speichereEigene(); close(); render();
    });
    setTimeout(() => el.querySelector('[data-f="frage"]').focus(), 250);
  });
}

// ---------- Vollbild-Sitzungen ---------------------------------
function vollbild(onMount) {
  const el = document.createElement('div');
  el.className = 'vollbild';
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  const zu = () => { el.remove(); document.body.style.overflow = ''; render(); };
  onMount(el, zu);
}

/** Lernsitzung mit sofortigem Feedback (Karteikarten oder Themen-Training) */
function lernSitzung(stapel, titel) {
  if (!stapel.length) { toast('Gerade nichts zu lernen – super! 🎉'); return; }
  const start = Date.now();
  let i = 0, richtig = 0, beantwortet = false, umgedreht = false;
  const nochmal = [];
  vollbild((el, zu) => {
    const beenden = async () => {
      if (i > 0 || richtig) { try { await eintragen('lernen', titel, { modus: 'karten', titel, richtig, gesamt: i, dauer: Math.round((Date.now() - start) / 1000) }); } catch { /* egal */ } }
      zu();
    };
    const zeig = () => {
      if (i >= stapel.length) {
        const q = Math.round((richtig / stapel.length) * 100);
        el.innerHTML = `<div class="vb-kopf"><span class="grow"></span><button class="icon-btn" data-x="zu">×</button></div>
          <div class="vb-ende"><div style="font-size:64px">${q >= 80 ? '🏆' : q >= 50 ? '💪' : '📚'}</div><h2>${richtig} von ${stapel.length} richtig</h2>
          <p class="muted">${q >= 80 ? 'Stark! Das sitzt.' : q >= 50 ? 'Gut dabei – die falschen kommen morgen wieder.' : 'Dranbleiben – Wiederholung macht den Meister.'}</p>
          ${nochmal.length ? `<button class="btn btn-block" data-x="nochmal">Falsche nochmal (${nochmal.length})</button>` : ''}
          <button class="btn btn-primary btn-block btn-lg" data-x="fertig" style="margin-top:10px">Fertig</button></div>`;
        return;
      }
      const k = stapel[i]; beantwortet = false; umgedreht = false;
      const t = k.eigen ? { name: 'Eigene Karte', icon: '✍️', farbe: '#A48BFF' } : thema(k.thema);
      const opts = k.eigen ? null : mischen(k.antworten);
      el.innerHTML = `<div class="vb-kopf"><button class="icon-btn" data-x="zu" aria-label="Beenden">×</button>
          <div class="grow vb-fort"><i style="width:${(i / stapel.length) * 100}%"></i></div><span class="num muted small">${i + 1}/${stapel.length}</span></div>
        <div class="vb-karte" style="--b-farbe:${t.farbe}">
          <span class="tag">${t.icon} ${t.name}${!k.eigen && karten[k.id] ? ` · Box ${karten[k.id].box}` : !k.eigen ? ' · neu' : ''}</span>
          <h2 class="vb-frage">${esc(k.frage)}</h2>
          ${k.eigen ? `<div class="vb-antwort hidden" data-antwort>${esc(k.antwort).replace(/\n/g, '<br>')}${k.seite ? `<div class="muted small" style="margin-top:8px">📖 Seite ${esc(k.seite)}</div>` : ''}</div>`
            : `<div class="vb-opts">${opts.map((o) => `<button class="vb-opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
               <div class="vb-erkl hidden" data-erkl></div>`}
        </div>
        <div class="vb-fuss" data-fuss>${k.eigen ? '<button class="btn btn-primary btn-block btn-lg" data-x="zeigen">Antwort zeigen</button>' : ''}</div>`;
    };
    const weiter = () => { i++; zeig(); };
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-x],[data-o]'); if (!b) return;
      const k = stapel[i];
      if (b.dataset.x === 'zu') { if (i === 0 || await bestaetigen('Lernen beenden?', 'Dein Fortschritt bis hier ist gespeichert.', 'Beenden', false)) beenden(); return; }
      if (b.dataset.x === 'fertig') { beenden(); return; }
      if (b.dataset.x === 'nochmal') { stapel = [...nochmal]; nochmal.length = 0; i = 0; richtig = 0; zeig(); return; }
      if (b.dataset.x === 'zeigen' && !umgedreht) {
        umgedreht = true;
        el.querySelector('[data-antwort]').classList.remove('hidden');
        el.querySelector('[data-fuss]').innerHTML = `<div class="az-zwei"><button class="btn btn-danger btn-lg" data-x="nein">✗ Nicht gewusst</button><button class="btn btn-ok btn-lg" data-x="ja">✓ Gewusst</button></div>`;
        return;
      }
      if (b.dataset.x === 'ja' || b.dataset.x === 'nein') {
        const ok = b.dataset.x === 'ja'; bewerte(k.id, ok); if (ok) richtig++; else nochmal.push(k); weiter(); return;
      }
      if (b.dataset.x === 'weiter') { weiter(); return; }
      if (b.dataset.o != null && !beantwortet) {
        beantwortet = true;
        const ok = b.dataset.o === k.richtig;
        navigator.vibrate?.(ok ? 15 : [40, 40, 40]);
        el.querySelectorAll('.vb-opt').forEach((o) => { o.disabled = true; if (o.dataset.o === k.richtig) o.classList.add('richtig'); else if (o === b) o.classList.add('falsch'); });
        const er = el.querySelector('[data-erkl]'); er.innerHTML = `<b>${ok ? '✓ Richtig!' : '✗ Leider falsch.'}</b> ${esc(k.erkl)}`; er.classList.remove('hidden'); er.classList.toggle('ok', ok);
        bewerte(k.id, ok); if (ok) richtig++; else nochmal.push(k);
        el.querySelector('[data-fuss]').innerHTML = `<button class="btn btn-primary btn-block btn-lg" data-x="weiter">${i + 1 < stapel.length ? 'Weiter' : 'Ergebnis'}</button>`;
      }
    });
    zeig();
  });
}

function karteikarten() {
  const f = mischen(faellige());
  const neu = neueKarten(Math.max(0, Math.min(cfg.neuProTag, 20 - f.length)));
  lernSitzung([...f.slice(0, 20), ...neu], 'Karteikarten');
}

/** Probeprüfung: kein Feedback bis zum Schluss, mit Zeitlimit */
function probepruefung(teil) {
  const anzahl = teil === 1 ? 20 : 25, minuten = teil === 1 ? 30 : 40;
  const pool = teil === 1 ? FRAGEN.filter((f) => f.teil === 1) : FRAGEN;
  // gleichmäßig über die Themen verteilen
  const proThema = {};
  mischen(pool).forEach((f) => (proThema[f.thema] ||= []).push(f));
  const fragen = [];
  while (fragen.length < anzahl && Object.values(proThema).some((l) => l.length)) for (const l of mischen(Object.values(proThema))) if (l.length && fragen.length < anzahl) fragen.push(l.pop());
  const stapel = mischen(fragen).map((f) => ({ ...f, opts: mischen(f.antworten) }));
  const antworten = {};
  const ende = Date.now() + minuten * 60000, start = Date.now();
  let i = 0, fertig = false, iv;
  vollbild((el, zu) => {
    const abgeben = async () => {
      if (fertig) return; fertig = true; clearInterval(iv);
      const richtig = stapel.filter((f) => antworten[f.id] === f.richtig).length;
      const punkte = Math.round((richtig / stapel.length) * 100), n = noteAusPunkten(punkte);
      stapel.forEach((f) => bewerte(f.id, antworten[f.id] === f.richtig));
      try { await eintragen('lernen', `Probeprüfung Teil ${teil}`, { modus: 'pruefung', teil, richtig, gesamt: stapel.length, punkte, dauer: Math.round((Date.now() - start) / 1000) }); } catch { /* egal */ }
      const falsch = stapel.filter((f) => antworten[f.id] !== f.richtig);
      el.innerHTML = `<div class="vb-kopf"><span class="grow"><b>Ergebnis Teil ${teil}</b></span><button class="icon-btn" data-x="zu">×</button></div>
        <div class="vb-scroll">
          <div class="card" style="text-align:center;padding:22px"><div class="muted small">Punkte</div><div class="az-riesig" style="color:${noteFarbe(n.note)}">${punkte}</div>
            <div><b>Note ${n.note}</b> · ${n.text}</div><div class="muted small" style="margin-top:6px">${richtig} von ${stapel.length} richtig · ${Math.round((Date.now() - start) / 60000)} Min</div>
            ${punkte < 50 ? '<p class="small" style="margin:10px 0 0">Unter 50 Punkten gilt eine Prüfung als nicht bestanden. Die falschen Fragen kommen jetzt öfter in deinen Karteikarten.</p>' : ''}</div>
          ${falsch.length ? `<div class="section-title">Das solltest du dir nochmal ansehen</div>${falsch.map((f) => `<div class="card vb-review"><b>${esc(f.frage)}</b>
            ${antworten[f.id] ? `<div class="vb-r falsch">Deine Antwort: ${esc(antworten[f.id])}</div>` : '<div class="vb-r falsch">Nicht beantwortet</div>'}
            <div class="vb-r richtig">Richtig: ${esc(f.richtig)}</div><p class="muted small" style="margin:6px 0 0">${esc(f.erkl)}</p></div>`).join('')}` : '<div class="empty">Alles richtig – Wahnsinn! 🏆</div>'}
          <button class="btn btn-primary btn-block btn-lg" data-x="zu" style="margin:18px 0 30px">Fertig</button>
        </div>`;
    };
    const uhr = () => {
      const rest = Math.max(0, ende - Date.now());
      const u = el.querySelector('[data-uhr]');
      if (u) { u.textContent = `${Math.floor(rest / 60000)}:${String(Math.floor((rest % 60000) / 1000)).padStart(2, '0')}`; u.classList.toggle('knapp', rest < 120000); }
      if (!rest) { toast('Zeit ist um!'); abgeben(); }
    };
    const zeig = () => {
      const f = stapel[i], t = thema(f.thema);
      const n = Object.keys(antworten).length;
      el.innerHTML = `<div class="vb-kopf"><button class="icon-btn" data-x="abbruch" aria-label="Abbrechen">×</button>
          <div class="grow vb-fort"><i style="width:${(n / stapel.length) * 100}%"></i></div><span class="num vb-uhr" data-uhr></span></div>
        <div class="vb-karte" style="--b-farbe:${t.farbe}">
          <span class="tag">Aufgabe ${i + 1} von ${stapel.length} · ${t.icon} ${t.name}</span>
          <h2 class="vb-frage">${esc(f.frage)}</h2>
          <div class="vb-opts">${f.opts.map((o) => `<button class="vb-opt ${antworten[f.id] === o ? 'gewaehlt' : ''}" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
        </div>
        <div class="vb-fuss">
          <div class="vb-punkte">${stapel.map((x, j) => `<button data-j="${j}" class="${antworten[x.id] ? 'an' : ''} ${j === i ? 'jetzt' : ''}">${j + 1}</button>`).join('')}</div>
          <div class="az-zwei"><button class="btn" data-x="zurueck" ${i ? '' : 'disabled'}>‹ Zurück</button>
            ${i + 1 < stapel.length ? '<button class="btn btn-primary" data-x="vor">Weiter ›</button>' : '<button class="btn btn-ok" data-x="abgeben">Abgeben</button>'}</div>
        </div>`;
      uhr();
    };
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-x],[data-o],[data-j]'); if (!b) return;
      if (fertig) { if (b.dataset.x === 'zu') zu(); return; }
      if (b.dataset.o != null) { antworten[stapel[i].id] = b.dataset.o; navigator.vibrate?.(10); if (i + 1 < stapel.length) { i++; } zeig(); return; }
      if (b.dataset.j != null) { i = Number(b.dataset.j); zeig(); return; }
      if (b.dataset.x === 'vor') { i++; zeig(); }
      if (b.dataset.x === 'zurueck') { i--; zeig(); }
      if (b.dataset.x === 'abgeben') {
        const offen = stapel.length - Object.keys(antworten).length;
        if (!offen || await bestaetigen('Prüfung abgeben?', `Du hast noch ${offen} ${offen === 1 ? 'Aufgabe' : 'Aufgaben'} offen.`, 'Abgeben', false)) abgeben();
      }
      if (b.dataset.x === 'abbruch') { if (await bestaetigen('Prüfung abbrechen?', 'Die Prüfung wird nicht gewertet.', 'Abbrechen')) { fertig = true; clearInterval(iv); zu(); } }
    });
    iv = setInterval(uhr, 1000);
    zeig();
  });
}

// =============================================================
// Klicks
// =============================================================
$app.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a, id = b.dataset.id;
  if (a === 'tab') { tab = b.dataset.tab; render(); window.scrollTo(0, 0); }
  if (a === 'einst') einstellungen();
  if (a === 'lernen-start') karteikarten();
  if (a === 'pruefung') probepruefung(Number(b.dataset.teil));
  if (a === 'thema') lernSitzung(mischen(FRAGEN.filter((f) => f.thema === id)).slice(0, 10), `Training: ${thema(id).name}`);
  if (a === 'karte-neu') karteSheet();
  if (a === 'karte-bearb') karteSheet(eigene.find((k) => k.id === id));
  if (a === 'karte-aus-buch') karteSheet(null, b.dataset.seite);
  if (a === 'buch-weg') { if (await bestaetigen('Buch entfernen?', 'Das Buch wird von diesem Gerät gelöscht. Deine Karteikarten bleiben.', 'Entfernen')) { await buch.entfernen(); buchTreffer = null; render(); } }
  if (a === 'bericht-neu') berichtNeu(b.dataset.datum || heute());
  if (a === 'bericht-bearb') berichtBearbeiten(E.find((x) => x.id === id));
  if (a === 'woche') { berichtWoche = plusTage(berichtWoche, 7 * Number(b.dataset.d)); bleib(render); }
  if (a === 'woche-kopieren') {
    const t = wocheAlsText(berichtWoche);
    try { await navigator.clipboard.writeText(t); toast('Kopiert – jetzt ins Berichtsheft einfügen 📋'); }
    catch { sheet(`<h2>Woche als Text</h2><textarea class="search" rows="14" readonly>${esc(t)}</textarea><p class="muted small">Markieren und kopieren.</p>`); }
  }
  if (a === 'stunde-neu') stundeSheet();
  if (a === 'stunde-bearb') stundeSheet(Number(b.dataset.i));
  if (a === 'note-neu') noteSheet();
  if (a === 'note-bearb') noteSheet(E.find((x) => x.id === id));
  if (a === 'rechner') { offenRechner.has(id) ? offenRechner.delete(id) : offenRechner.add(id); bleib(render); }
  if (a === 'rechner-leeren') { delete rechnerWerte[id]; bleib(render); }
});

$app.addEventListener('click', (e) => {
  const b = e.target.closest('[data-seg] button'); if (!b) return;
  if (b.closest('[data-seg]').dataset.seg === 'tag') { schulTag = Number(b.dataset.v); bleib(render); }
});

$app.addEventListener('input', (e) => {
  const r = e.target.closest('[data-r]'); if (r && e.target.matches('[data-in]')) rechnen(RECHNER.find((x) => x.id === r.dataset.r));
});
$app.addEventListener('change', async (e) => {
  const r = e.target.closest('[data-r]'); if (r && e.target.matches('select[data-in]')) rechnen(RECHNER.find((x) => x.id === r.dataset.r));
  if (e.target.matches('[data-buch]')) {
    const datei = e.target.files?.[0]; if (!datei) return;
    const st = $app.querySelector('[data-buch-status]');
    try { await buch.einlesen(datei, (t) => { if (st) st.textContent = t; }); toast('Buch gespeichert 📖'); render(); }
    catch (err) { if (st) st.textContent = err.message || 'Konnte die Datei nicht lesen.'; }
  }
});
$app.addEventListener('submit', async (e) => {
  if (e.target.dataset.form !== 'buch') return;
  e.preventDefault();
  buchFrage = e.target.q.value.trim();
  const bu = await buch.laden();
  buchTreffer = bu && buchFrage ? buch.suchen(bu, buchFrage) : null;
  bleib(render);
});

$nav.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  tab = b.dataset.tab; render(); window.scrollTo(0, 0);
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !$nav.classList.contains('hidden') && !document.querySelector('.backdrop,.vollbild')) render();
});

// ---------- Start --------------------------------------------
async function init() {
  const user = await core.getUser();
  if (!user) { core.renderLogin($app, { appName: 'Ausbildung', onDone: () => location.reload() }); return; }
  try {
    const [c, k, ei, ev] = await Promise.all([
      core.getAppData(APP, 'einstellungen', null),
      core.getAppData(APP, 'karten', {}),
      core.getAppData(APP, 'eigene_karten', []),
      core.listEvents({ app: APP, limit: 5000 }),
    ]);
    E = ev; karten = k || {}; eigene = ei || [];
    if (c) cfg = { ...cfg, ...c, kategorien: { ...cfg.kategorien, ...(c.kategorien || {}) }, stundenplan: { ...cfg.stundenplan, ...(c.stundenplan || {}) } };
    else await speichereCfg();
  } catch (err) {
    console.error(err);
    $app.innerHTML = `<div class="loading"><div style="text-align:center;max-width:340px"><h2>Verbindung fehlgeschlagen</h2>
      <p class="muted">${esc(err.message || '')}</p><button class="btn btn-primary" onclick="location.reload()">Nochmal versuchen</button></div></div>`;
    return;
  }
  const t = location.hash.slice(1);
  if (['start', 'lernen', 'bericht', 'schule', 'formeln'].includes(t)) tab = t;
  $nav.classList.remove('hidden');
  render();
}

core.onAuthChange((u) => { if (!u && !$nav.classList.contains('hidden')) location.reload(); });
init();
