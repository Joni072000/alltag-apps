// =============================================================
// Kalorien-Tracker – Teil der Alltag-Apps
// Einträge landen in der gemeinsamen Zeitachse (events, app='kalorien'),
// Trainings kommen aus dem Gym-Tracker (events, app='gym').
// =============================================================
import * as core from '../shared/core.js';
import { esc, uid, zahl, fmt, fmtDatum, store, toast, sheet, bestaetigen, tagKey, tagStart, plusTage, wochenStart } from '../shared/ui.js';
import {
  MAHLZEITEN, AKTIVITAET, MAKRO_VORLAGEN, berechneZiel, makroZiele, naehrwerte,
  sucheLokal, sucheOnline, produktPerBarcode,
} from './daten.js';

const APP = 'kalorien';
const $app = document.getElementById('app');
const $nav = document.getElementById('nav');

const S = {
  name: '', gewicht: null, geschlecht: 'm', groesse: null, geburtsjahr: null, aktivitaet: 'leicht',
  ziel: 'halten', tempo: 0.5, zielgewicht: null, kcalManuell: null, makro: 'ausgewogen',
  wasserZiel: 2000, trainingAddieren: true, petName: 'Pumpi',
};
let tab = 'tagebuch';
let tag = tagStart(new Date());
let eintraege = [];        // kalorien-Events (mahlzeit, wasser, gewicht)
let trainings = [];        // gym-Trainings
let geladenAb = null;
let eigene = [], favoriten = [], zuletzt = [];
let anaArt = 'woche', anaVersatz = 0;

// ---------- Ziele -------------------------------------------
function tagesziel() {
  const auto = berechneZiel(S);
  const kcal = S.kcalManuell || auto?.kcal || 2000;
  return { kcal, ...makroZiele(kcal, S.makro), auto };
}

// ---------- Daten -------------------------------------------
async function ladeBereich(von) {
  const [k, g] = await Promise.all([
    core.listEvents({ app: APP, from: von, to: geladenAb || plusTage(tagStart(new Date()), 2), limit: 5000 }),
    core.listEvents({ app: 'gym', kind: 'training', from: von, to: geladenAb || plusTage(tagStart(new Date()), 2) }),
  ]);
  eintraege = [...eintraege, ...k];
  trainings = [...trainings, ...g];
  geladenAb = von;
}

async function ladeAlles() {
  const [profil, e, f, z, gew] = await Promise.all([
    core.getProfile(),
    core.getAppData(APP, 'eigene_lebensmittel', []),
    core.getAppData(APP, 'favoriten', []),
    core.getAppData(APP, 'zuletzt', []),
    core.listEvents({ app: APP, kind: 'gewicht', limit: 1000 }),
  ]);
  const st = profil?.settings || {};
  Object.assign(S, {
    name: st.name || '', gewicht: st.gewicht || null, geschlecht: st.geschlecht || 'm',
    groesse: st.groesse || null, geburtsjahr: st.geburtsjahr || null, aktivitaet: st.aktivitaet || 'leicht',
    ziel: st.kal_ziel || 'halten', tempo: st.kal_tempo || 0.5, zielgewicht: st.kal_zielgewicht || null,
    kcalManuell: st.kal_kcal_manuell || null, makro: st.kal_makro || 'ausgewogen',
    wasserZiel: st.kal_wasser_ziel || 2000, trainingAddieren: st.kal_training_addieren !== false,
    petName: st.gym_maskottchen_name || 'Pumpi',
  });
  eigene = e || []; favoriten = f || []; zuletzt = z || [];
  geladenAb = null; eintraege = []; trainings = [];
  await ladeBereich(plusTage(tagStart(new Date()), -120));
  // Gewichtseinträge können älter sein – vollständig übernehmen
  const ids = new Set(eintraege.map((x) => x.id));
  for (const g of gew) if (!ids.has(g.id)) eintraege.push(g);
}

async function sicherGeladen(datum) {
  if (geladenAb && datum < geladenAb) {
    try { await ladeBereich(plusTage(wochenStart(datum), -60)); } catch { toast('Laden fehlgeschlagen', true); }
  }
}

const amTag = (liste, d) => { const k = tagKey(d); return liste.filter((x) => tagKey(x.starts_at) === k); };

function tagesWerte(d) {
  const e = amTag(eintraege, d);
  const essen = e.filter((x) => x.kind === 'mahlzeit');
  const sum = { kcal: 0, eiweiss: 0, kh: 0, fett: 0 };
  for (const x of essen) for (const k in sum) sum[k] += x.data?.[k] || 0;
  const wasser = e.filter((x) => x.kind === 'wasser').reduce((s, x) => s + (x.data?.ml || 0), 0);
  const gym = amTag(trainings, d);
  const verbrannt = gym.reduce((s, t) => s + (t.data?.kcal || 0), 0);
  return { essen, sum, wasser, gym, verbrannt };
}

function aktuellesGewicht(bis = null) {
  const g = eintraege.filter((x) => x.kind === 'gewicht' && (!bis || new Date(x.starts_at) < bis))
    .sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at));
  return g[0]?.data?.kg ?? (bis ? null : S.gewicht);
}

function streakTage() {
  const tage = new Set(eintraege.filter((x) => x.kind === 'mahlzeit').map((x) => tagKey(x.starts_at)));
  let d = tagStart(new Date());
  if (!tage.has(tagKey(d))) d = plusTage(d, -1);
  let n = 0;
  while (tage.has(tagKey(d))) { n++; d = plusTage(d, -1); }
  return n;
}

async function merkeZuletzt(lm) {
  const kurz = { ...lm };
  zuletzt = [kurz, ...zuletzt.filter((x) => x.id !== lm.id)].slice(0, 30);
  core.setAppData(APP, 'zuletzt', zuletzt).catch(() => {});
}

// ---------- Kleine Grafiken -----------------------------------
function ringSvg(anteil, farbe = 'var(--accent)', dicke = 12, ueber = false) {
  const r = 50 - dicke / 2, u = 2 * Math.PI * r;
  const a = Math.max(0, Math.min(1, anteil));
  return `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--card2)" stroke-width="${dicke}"/>
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="${ueber ? 'var(--danger)' : farbe}" stroke-width="${dicke}" stroke-linecap="round"
      stroke-dasharray="${(a * u).toFixed(1)} ${u.toFixed(1)}"/></svg>`;
}

const ICON_SCAN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8"/></svg>';

// ---------- Seiten ------------------------------------------
function render() {
  $nav.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  ({ tagebuch: seiteTagebuch, analyse: seiteAnalyse, profil: seiteProfil })[tab]();
}

function seiteTagebuch() {
  const z = tagesziel();
  const w = tagesWerte(tag);
  const budget = z.kcal + (S.trainingAddieren ? w.verbrannt : 0);
  const uebrig = Math.round(budget - w.sum.kcal);
  const heute = tagKey(tag) === tagKey(new Date());
  const ws = wochenStart(tag);
  const streak = streakTage();

  const tageHtml = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = plusTage(ws, i);
    const tw = tagesWerte(d);
    const b = z.kcal + (S.trainingAddieren ? tw.verbrannt : 0);
    return `<button class="day ${tagKey(d) === tagKey(tag) ? 'sel' : ''} ${tagKey(d) === tagKey(new Date()) ? 'heute' : ''}" data-a="tag" data-d="${tagKey(d)}">
      ${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][i]}
      ${ringSvg(tw.sum.kcal / b, 'var(--accent2)', 14, tw.sum.kcal > b * 1.05)}
      <b>${d.getDate()}</b></button>`;
  }).join('');

  const makro = (name, ist, soll, farbe) => `<div class="makro"><span>${name}</span>
    <div class="bar"><i style="width:${Math.min(100, (ist / soll) * 100)}%;background:${farbe}"></i></div>
    <b class="num">${fmt(ist, 0)}</b><span class="muted small" style="display:inline"> / ${soll} g</span></div>`;

  const gl = Math.max(4, Math.round(S.wasserZiel / 250));
  const voll = Math.round(w.wasser / 250);
  const gewicht = aktuellesGewicht();

  $app.innerHTML = `
    <div class="page-head">
      <div><div class="muted small">${heute ? 'Heute' : fmtDatum(tag, { weekday: 'long' })}</div>
        <h1>${fmtDatum(tag, { day: 'numeric', month: 'long' })}</h1></div>
      ${streak ? `<span class="streak-pill">🔥 ${streak}</span>` : ''}
    </div>

    <div class="weekstrip">
      <button class="icon-btn" data-a="woche" data-v="-7" aria-label="Vorige Woche">‹</button>
      <div class="days">${tageHtml}</div>
      <button class="icon-btn" data-a="woche" data-v="7" aria-label="Nächste Woche">›</button>
    </div>

    <div class="card summary">
      <div class="summary-top">
        <div class="side"><b class="num">${fmt(w.sum.kcal, 0)}</b><span>Gegessen</span></div>
        <div class="ring">${ringSvg(w.sum.kcal / budget, 'var(--accent)', 10, uebrig < 0)}
          <div class="mitte ${uebrig < 0 ? 'drueber' : ''}"><div><b class="num">${fmt(Math.abs(uebrig), 0)}</b><span>${uebrig < 0 ? 'zu viel' : 'Übrig'}</span></div></div></div>
        <div class="side"><b class="num">${fmt(w.verbrannt, 0)}</b><span>Verbrannt</span></div>
      </div>
      <div class="makros">
        ${makro('Kohlenhydrate', w.sum.kh, z.kh, 'var(--kh)')}
        ${makro('Eiweiß', w.sum.eiweiss, z.eiweiss, 'var(--eiweiss)')}
        ${makro('Fett', w.sum.fett, z.fett, 'var(--fett)')}
      </div>
    </div>

    <div class="section-title">Ernährung</div>
    ${MAHLZEITEN.map((m) => {
      const liste = w.essen.filter((x) => x.data?.mahlzeit === m.id);
      const kc = liste.reduce((s, x) => s + (x.data?.kcal || 0), 0);
      return `<div class="card meal">
        <div class="meal-head">
          <div class="meal-icon">${m.icon}</div>
          <div class="grow"><h3>${m.name}</h3><div class="muted small num">${fmt(kc, 0)} / ${fmt(Math.round(z.kcal * m.anteil), 0)} kcal</div></div>
          <button class="add-btn" data-a="add" data-m="${m.id}" aria-label="${m.name} hinzufügen">+</button>
        </div>
        ${liste.map((x) => `<button class="entry" data-a="eintrag" data-id="${x.id}">
          <div class="grow"><div class="ellipsis"><b>${esc(x.data.lm?.name || x.title)}</b></div>
          <div class="muted small ellipsis">${esc(mengenText(x.data))}${x.data.lm?.marke ? ` · ${esc(x.data.lm.marke)}` : ''}</div></div>
          <span class="kc">${fmt(x.data.kcal, 0)} kcal</span></button>`).join('')}
      </div>`;
    }).join('')}

    <div class="section-title">Aktivität <a href="../gym/" class="btn-ghost small" style="text-decoration:none;font-weight:700">Gym öffnen ›</a></div>
    <div class="card">
      ${w.gym.length ? w.gym.map((t) => `<div class="akt"><div class="ico">🏋️</div>
        <div class="grow"><b>${esc(t.title || 'Training')}</b><div class="muted small">${t.data?.dauer_min || '–'} min · ${t.data?.saetze || 0} Sätze</div></div>
        <b class="num">${fmt(t.data?.kcal || 0, 0)} kcal</b></div>`).join('')
        : `<div class="akt"><div class="ico">💤</div><div class="grow"><b>Kein Training</b><div class="muted small">${heute ? `${esc(S.petName)} wartet auf sein Futter 💪` : 'An diesem Tag nicht trainiert'}</div></div></div>`}
      ${w.gym.length && !S.trainingAddieren ? '<p class="muted small" style="margin:8px 0 0">Trainingskalorien werden nicht zum Budget addiert (Profil).</p>' : ''}
    </div>

    <div class="section-title">Wasser</div>
    <div class="card">
      <div class="row"><div class="grow"><b class="num">${fmt(w.wasser / 1000, 2)} l</b> <span class="muted">/ ${fmt(S.wasserZiel / 1000, 1)} l</span></div>
        <button class="add-btn sm" data-a="wasser" data-v="-1" aria-label="Glas entfernen">−</button>
        <button class="add-btn sm" data-a="wasser" data-v="1" aria-label="Glas hinzufügen">+</button></div>
      <div class="glaeser">${Array.from({ length: Math.min(gl, 16) }, (_, i) => `<button class="glas ${i < voll ? 'voll' : ''} ${i === voll ? 'naechstes' : ''}" data-a="glas" data-i="${i}" aria-label="Glas ${i + 1}"></button>`).join('')}</div>
    </div>

    <div class="section-title">Gewicht</div>
    <div class="card row">
      <div class="grow">
        <div class="gewicht-big num">${gewicht ? fmt(gewicht) + ' kg' : '–'}</div>
        <div class="muted small">${S.zielgewicht ? `Ziel: ${fmt(S.zielgewicht)} kg${gewicht ? ` · noch ${fmt(Math.abs(gewicht - S.zielgewicht))} kg` : ''}` : 'Ziel im Profil festlegen'}</div>
      </div>
      <button class="btn btn-primary" data-a="gewicht">+ Eintragen</button>
    </div>
  `;
}

function mengenText(d) {
  if (d.menge == null) return 'Schnell eingetragen';
  if (d.portion) return `${fmt(d.portion.anzahl)} × ${d.portion.name.replace(/^1 /, '')} (${fmt(d.menge, 0)} g)`;
  return `${fmt(d.menge, 0)} g`;
}

// ---------- Hinzufügen -------------------------------------
function hinzufuegen(mahlzeit) {
  let q = '', liste = 'zuletzt', ctrl = null, timer = null;
  const mName = MAHLZEITEN.find((m) => m.id === mahlzeit)?.name;
  sheet(`<h2>${mName}</h2>
    <div class="add-search">
      <input class="search" placeholder="Lebensmittel suchen …" data-q autocomplete="off">
      <button class="scan-btn" data-a="scan" aria-label="Barcode scannen">${ICON_SCAN}</button>
    </div>
    <div data-inhalt></div>`,
  (el, close, bd) => {
    const inhalt = el.querySelector('[data-inhalt]');
    const zeile = (lm) => {
      const p = lm.portionen?.[0];
      return `<div class="food" data-id="${esc(lm.id)}">
        ${lm.bild ? `<img class="bild" src="${esc(lm.bild)}" alt="" loading="lazy">` : `<div class="ph">${lm.quelle === 'eigen' ? '✏️' : lm.quelle === 'off' ? '📦' : '🥗'}</div>`}
        <div class="info" data-a="waehle"><b>${esc(lm.name)}</b>
          <span class="muted small">${lm.marke ? esc(lm.marke) + ' · ' : ''}${fmt(lm.pro100.kcal, 0)} kcal / 100 g${p ? ` · ${esc(p.name)}` : ''}</span></div>
        <button class="add-btn sm" data-a="schnell" aria-label="Hinzufügen">+</button>
      </div>`;
    };
    let aktuelle = [];
    const zeige = (lms, extra = '') => { aktuelle = lms; inhalt.innerHTML = lms.map(zeile).join('') + extra; };

    const startseite = () => {
      const quellen = { zuletzt, favoriten, eigene };
      const leer = { zuletzt: 'Noch nichts eingetragen.', favoriten: 'Markiere Lebensmittel mit ☆ als Favorit.', eigene: 'Noch keine eigenen Lebensmittel.' };
      aktuelle = quellen[liste];
      inhalt.innerHTML = `
        <div class="tabs-mini">
          ${[['zuletzt', 'Zuletzt'], ['favoriten', 'Favoriten'], ['eigene', 'Eigene']].map(([k, n]) => `<button class="pill ${liste === k ? 'on' : ''}" data-liste="${k}">${n}</button>`).join('')}
        </div>
        ${aktuelle.length ? aktuelle.map(zeile).join('') : `<p class="muted" style="padding:14px 2px">${leer[liste]}</p>`}
        <div class="add-links">
          <button class="btn" data-a="eigen-neu">✏️ Eigenes Lebensmittel</button>
          <button class="btn" data-a="schnell-kcal">⚡ Kalorien schnell</button>
        </div>`;
    };

    const suchen = () => {
      const text = q.trim();
      if (!text) { startseite(); return; }
      const lokal = sucheLokal(text, eigene);
      zeige(lokal, `<div class="lade"><div class="spinner"></div>Suche in der Lebensmittel-Datenbank …</div>`);
      ctrl?.abort(); ctrl = new AbortController();
      const meine = ctrl;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const online = await sucheOnline(text, meine.signal);
          if (meine.signal.aborted) return;
          const ids = new Set(lokal.map((l) => l.id));
          const alle = [...lokal, ...online.filter((o) => !ids.has(o.id))];
          zeige(alle, alle.length ? '' : '<p class="muted" style="padding:14px 2px">Nichts gefunden. Leg es als eigenes Lebensmittel an.</p><div class="add-links"><button class="btn" data-a="eigen-neu">✏️ Eigenes Lebensmittel</button><button class="btn" data-a="schnell-kcal">⚡ Kalorien schnell</button></div>');
        } catch (err) {
          if (err.name === 'AbortError') return;
          zeige(lokal, '<p class="muted small" style="padding:10px 2px">Online-Suche gerade nicht erreichbar – nur Grundlebensmittel.</p>');
        }
      }, 450);
    };

    el.querySelector('[data-q]').addEventListener('input', (e) => { q = e.target.value; suchen(); });
    el.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-liste]');
      if (tabBtn) { liste = tabBtn.dataset.liste; startseite(); return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'scan') { scanner(mahlzeit); return; }
      if (a === 'eigen-neu') { eigenesLebensmittel({ name: q.trim() }, (lm) => portion(lm, { mahlzeit })); return; }
      if (a === 'schnell-kcal') { schnellKcal(mahlzeit); return; }
      const id = b.closest('[data-id]')?.dataset.id;
      const lm = aktuelle.find((x) => x.id === id); if (!lm) return;
      if (a === 'waehle') portion(lm, { mahlzeit });
      if (a === 'schnell') {
        const p = lm.portionen?.[0];
        speichereEintrag(lm, { mahlzeit, menge: p ? p.g : 100, portion: p ? { ...p, anzahl: 1 } : null });
        b.textContent = '✓'; b.disabled = true;
      }
    });
    bd.addEventListener('zu', () => { ctrl?.abort(); render(); });
    startseite();
  });
}

function eintragZeit(mahlzeit) {
  const m = MAHLZEITEN.find((x) => x.id === mahlzeit);
  const d = new Date(tag);
  if (tagKey(d) === tagKey(new Date())) return new Date();
  d.setHours(m?.stunde ?? 12, 0, 0, 0);
  return d;
}

async function speichereEintrag(lm, { mahlzeit, menge, portion: por }, bestehend = null) {
  const nw = naehrwerte(lm, menge);
  const data = {
    mahlzeit, menge, portion: por || null, ...nw,
    lm: { id: lm.id, name: lm.name, marke: lm.marke || '', quelle: lm.quelle, code: lm.code || null, pro100: lm.pro100, portionen: lm.portionen || [], bild: lm.bild || null },
  };
  try {
    if (bestehend) {
      const neu = await core.updateEvent(bestehend.id, { data, title: lm.name });
      eintraege = eintraege.map((x) => (x.id === neu.id ? neu : x));
      toast('Gespeichert ✓');
    } else {
      const neu = await core.addEvent({ app: APP, kind: 'mahlzeit', title: lm.name, starts_at: eintragZeit(mahlzeit).toISOString(), data });
      eintraege.push(neu);
      merkeZuletzt(lm);
      toast(`${lm.name} hinzugefügt ✓`);
    }
  } catch (err) {
    console.error(err); toast('Speichern fehlgeschlagen', true);
  }
}

// Portion wählen / Eintrag bearbeiten
function portion(lm, { mahlzeit, eintrag = null }) {
  const vorher = eintrag?.data;
  const einheiten = [{ name: 'Gramm', g: 1 }, ...(lm.portionen || [])];
  let einheit = vorher?.portion ? einheiten.findIndex((e) => e.name === vorher.portion.name) : (lm.portionen?.length ? 1 : 0);
  if (einheit < 0) einheit = 0;
  let anzahl = vorher ? (vorher.portion ? vorher.portion.anzahl : vorher.menge) : (einheit ? 1 : 100);
  let mz = mahlzeit;
  let fav = favoriten.some((f) => f.id === lm.id);

  sheet(`
    <div class="row" style="align-items:flex-start"><div class="grow"><h2 style="margin-bottom:2px">${esc(lm.name)}</h2>
      <p class="muted small" style="margin:0 0 6px">${lm.marke ? esc(lm.marke) + ' · ' : ''}${fmt(lm.pro100.kcal, 0)} kcal / 100 g</p></div>
      <button class="stern ${fav ? 'an' : ''}" data-a="fav" aria-label="Favorit">${fav ? '★' : '☆'}</button></div>
    <div class="portion-kcal"><b class="num" data-kcal></b> <span class="muted">kcal</span></div>
    <div class="portion-row">
      <input inputmode="decimal" data-anzahl value="${String(Math.round(anzahl * 100) / 100).replace('.', ',')}">
      <select data-einheit>${einheiten.map((e, i) => `<option value="${i}" ${i === einheit ? 'selected' : ''}>${esc(e.name)}${i && !/\d\s*g\)/.test(e.name) ? ` · ${fmt(e.g, 0)} g` : ''}</option>`).join('')}</select>
    </div>
    <div class="mini-makros" data-makros></div>
    <div class="field" style="margin-top:14px"><span>Mahlzeit</span>
      <div class="seg seg4">${MAHLZEITEN.map((m) => `<button type="button" data-mz="${m.id}" class="${m.id === mz ? 'on' : ''}">${m.name.replace('essen', '')}</button>`).join('')}</div></div>
    <div class="sheet-actions">
      ${eintrag ? '<button class="btn btn-danger" data-a="del">Löschen</button>' : ''}
      <button class="btn btn-primary" data-a="ok">${eintrag ? 'Speichern' : 'Hinzufügen'}</button>
    </div>`,
  (el, close) => {
    const gramm = () => (zahl(el.querySelector('[data-anzahl]').value) || 0) * einheiten[einheit].g;
    const aktualisieren = () => {
      const nw = naehrwerte(lm, gramm());
      el.querySelector('[data-kcal]').textContent = fmt(nw.kcal, 0);
      el.querySelector('[data-makros]').innerHTML = `
        <div><b class="num">${fmt(nw.kh)} g</b><span style="color:var(--kh)">Kohlenhydrate</span></div>
        <div><b class="num">${fmt(nw.eiweiss)} g</b><span style="color:var(--eiweiss)">Eiweiß</span></div>
        <div><b class="num">${fmt(nw.fett)} g</b><span style="color:var(--fett)">Fett</span></div>`;
    };
    el.querySelector('[data-anzahl]').addEventListener('input', aktualisieren);
    el.querySelector('[data-anzahl]').addEventListener('focus', (e) => e.target.select());
    el.querySelector('[data-einheit]').addEventListener('change', (e) => {
      const alt = einheit; einheit = +e.target.value;
      const inp = el.querySelector('[data-anzahl]');
      if (alt !== einheit) inp.value = einheit ? '1' : String(Math.round(zahl(inp.value) * einheiten[alt].g) || 100);
      if (!einheit && !zahl(inp.value)) inp.value = '100';
      aktualisieren();
    });
    el.querySelectorAll('[data-mz]').forEach((b) => b.onclick = () => { mz = b.dataset.mz; el.querySelectorAll('[data-mz]').forEach((x) => x.classList.toggle('on', x === b)); });
    el.querySelector('[data-a="fav"]').onclick = async (e) => {
      fav = !fav;
      favoriten = fav ? [lm, ...favoriten.filter((f) => f.id !== lm.id)] : favoriten.filter((f) => f.id !== lm.id);
      e.target.textContent = fav ? '★' : '☆'; e.target.classList.toggle('an', fav);
      core.setAppData(APP, 'favoriten', favoriten).catch(() => toast('Speichern fehlgeschlagen', true));
    };
    el.querySelector('[data-a="ok"]').onclick = async () => {
      const g = gramm();
      if (!(g > 0)) { toast('Gib eine Menge ein', true); return; }
      const anz = zahl(el.querySelector('[data-anzahl]').value);
      close();
      await speichereEintrag(lm, { mahlzeit: mz, menge: g, portion: einheit ? { ...einheiten[einheit], anzahl: anz } : null }, eintrag);
      render();
    };
    el.querySelector('[data-a="del"]')?.addEventListener('click', async () => {
      close();
      await loescheEintrag(eintrag);
    });
    aktualisieren();
  });
}

async function loescheEintrag(e) {
  try { await core.deleteEvent(e.id); eintraege = eintraege.filter((x) => x.id !== e.id); toast('Gelöscht'); render(); }
  catch { toast('Löschen fehlgeschlagen', true); }
}

function eintragOeffnen(id) {
  const e = eintraege.find((x) => x.id === id); if (!e) return;
  if (e.data.menge == null) { schnellKcal(e.data.mahlzeit, e); return; }
  portion(e.data.lm, { mahlzeit: e.data.mahlzeit, eintrag: e });
}

function schnellKcal(mahlzeit, eintrag = null) {
  const d = eintrag?.data || {};
  let mz = mahlzeit;
  sheet(`<h2>Kalorien schnell eintragen</h2>
    <label class="field"><span>Bezeichnung (optional)</span><input data-n value="${esc(d.lm?.name && d.lm.name !== 'Schnell eingetragen' ? d.lm.name : '')}" placeholder="z. B. Kantinenessen"></label>
    <label class="field"><span>Kalorien (kcal)</span><input data-k inputmode="numeric" value="${d.kcal ?? ''}" placeholder="z. B. 650"></label>
    <div class="portion-row" style="grid-template-columns:1fr 1fr 1fr">
      <input data-kh inputmode="decimal" placeholder="KH g" value="${d.kh || ''}">
      <input data-ei inputmode="decimal" placeholder="Eiweiß g" value="${d.eiweiss || ''}">
      <input data-fe inputmode="decimal" placeholder="Fett g" value="${d.fett || ''}">
    </div>
    <div class="seg seg4">${MAHLZEITEN.map((m) => `<button type="button" data-mz="${m.id}" class="${m.id === mz ? 'on' : ''}">${m.name.replace('essen', '')}</button>`).join('')}</div>
    <div class="sheet-actions">${eintrag ? '<button class="btn btn-danger" data-a="del">Löschen</button>' : ''}<button class="btn btn-primary" data-a="ok">${eintrag ? 'Speichern' : 'Hinzufügen'}</button></div>`,
  (el, close) => {
    el.querySelectorAll('[data-mz]').forEach((b) => b.onclick = () => { mz = b.dataset.mz; el.querySelectorAll('[data-mz]').forEach((x) => x.classList.toggle('on', x === b)); });
    el.querySelector('[data-a="del"]')?.addEventListener('click', () => { close(); loescheEintrag(eintrag); });
    el.querySelector('[data-a="ok"]').onclick = async () => {
      const kcal = zahl(el.querySelector('[data-k]').value);
      if (!(kcal >= 0)) { toast('Gib die Kalorien ein', true); return; }
      const name = el.querySelector('[data-n]').value.trim() || 'Schnell eingetragen';
      const data = {
        mahlzeit: mz, menge: null, kcal: Math.round(kcal),
        kh: zahl(el.querySelector('[data-kh]').value) || 0, eiweiss: zahl(el.querySelector('[data-ei]').value) || 0, fett: zahl(el.querySelector('[data-fe]').value) || 0,
        lm: { id: 'schnell', name, quelle: 'schnell' },
      };
      close();
      try {
        if (eintrag) { const n = await core.updateEvent(eintrag.id, { data, title: name }); eintraege = eintraege.map((x) => (x.id === n.id ? n : x)); }
        else eintraege.push(await core.addEvent({ app: APP, kind: 'mahlzeit', title: name, starts_at: eintragZeit(mz).toISOString(), data }));
        toast('Gespeichert ✓');
      } catch { toast('Speichern fehlgeschlagen', true); }
      render();
    };
    setTimeout(() => el.querySelector('[data-k]').focus(), 100);
  });
}

function eigenesLebensmittel(vorlage = {}, danach) {
  sheet(`<h2>Eigenes Lebensmittel</h2>
    <label class="field"><span>Name</span><input data-f="name" value="${esc(vorlage.name || '')}" placeholder="z. B. Omas Kartoffelsalat"></label>
    <label class="field"><span>Marke (optional)</span><input data-f="marke" value="${esc(vorlage.marke || '')}"></label>
    <p class="muted small" style="margin:4px 0 8px">Nährwerte pro 100 g (steht auf der Verpackung)</p>
    <div class="portion-row" style="grid-template-columns:1fr 1fr">
      <input data-f="kcal" inputmode="decimal" placeholder="kcal *">
      <input data-f="kh" inputmode="decimal" placeholder="Kohlenhydrate g">
      <input data-f="eiweiss" inputmode="decimal" placeholder="Eiweiß g">
      <input data-f="fett" inputmode="decimal" placeholder="Fett g">
    </div>
    <label class="field"><span>Portion (optional)</span>
      <div class="portion-row" style="grid-template-columns:1.4fr 1fr;margin:0"><input data-f="pname" placeholder="z. B. Schüssel"><input data-f="pg" inputmode="decimal" placeholder="Gramm"></div></label>
    <label class="field"><span>Barcode (optional)</span><input data-f="code" inputmode="numeric" value="${esc(vorlage.code || '')}"></label>
    <div class="sheet-actions"><button class="btn" data-a="x">Abbrechen</button><button class="btn btn-primary" data-a="ok">Speichern</button></div>`,
  (el, close) => {
    const v = (k) => el.querySelector(`[data-f="${k}"]`).value.trim();
    el.querySelector('[data-a="x"]').onclick = close;
    el.querySelector('[data-a="ok"]').onclick = async () => {
      const kcal = zahl(v('kcal'));
      if (!v('name') || kcal == null) { toast('Name und kcal sind Pflicht', true); return; }
      const pg = zahl(v('pg'));
      const lm = {
        id: 'eigen-' + uid(), name: v('name'), marke: v('marke'), quelle: 'eigen', code: v('code') || null,
        pro100: { kcal: Math.round(kcal), kh: zahl(v('kh')) || 0, eiweiss: zahl(v('eiweiss')) || 0, fett: zahl(v('fett')) || 0 },
        portionen: pg ? [{ name: `1 ${v('pname') || 'Portion'}`, g: pg }] : [],
      };
      eigene = [lm, ...eigene];
      try { await core.setAppData(APP, 'eigene_lebensmittel', eigene); } catch { toast('Speichern fehlgeschlagen', true); return; }
      close(); danach?.(lm);
    };
    setTimeout(() => el.querySelector('[data-f="name"]').focus(), 100);
  });
}

// ---------- Barcode-Scanner ---------------------------------
let Detektor = null;
async function detektorLaden() {
  if (Detektor) return Detektor;
  if ('BarcodeDetector' in window) {
    try {
      const formate = await window.BarcodeDetector.getSupportedFormats();
      if (formate.includes('ean_13')) { Detektor = window.BarcodeDetector; return Detektor; }
    } catch { /* weiter mit Ersatz */ }
  }
  const mod = await import('https://cdn.jsdelivr.net/npm/barcode-detector@2/+esm');
  Detektor = mod.BarcodeDetector;
  return Detektor;
}

function scanner(mahlzeit) {
  let stream = null, laeuft = true;
  sheet(`<h2>Barcode scannen</h2>
    <div class="scanner"><video playsinline muted></video><div class="rahmen"></div><div class="linie"></div></div>
    <p class="scan-status muted" data-status>Kamera wird gestartet …</p>
    <div class="add-search"><input class="search" data-code inputmode="numeric" placeholder="Oder Barcode eintippen"><button class="btn btn-primary" data-a="suchen">Suchen</button></div>`,
  async (el, close, bd) => {
    const status = (t) => { el.querySelector('[data-status]').textContent = t; };
    const stopp = () => { laeuft = false; stream?.getTracks().forEach((t) => t.stop()); };
    bd.addEventListener('zu', stopp);

    const gefunden = async (code) => {
      stopp(); navigator.vibrate?.(60);
      status(`Barcode ${code} – suche Produkt …`);
      const meins = eigene.find((x) => x.code === code);
      if (meins) { close(); portion(meins, { mahlzeit }); return; }
      try {
        const lm = await produktPerBarcode(code);
        if (lm) { close(); portion(lm, { mahlzeit }); return; }
        status('');
        el.querySelector('[data-status]').innerHTML = `Produkt <b>${esc(code)}</b> nicht gefunden.<br><button class="btn btn-primary" data-a="anlegen" style="margin-top:10px">Selbst anlegen</button>`;
        el.querySelector('[data-a="anlegen"]').onclick = () => { close(); eigenesLebensmittel({ code }, (lm2) => portion(lm2, { mahlzeit })); };
      } catch { status('Datenbank nicht erreichbar. Prüfe deine Internetverbindung.'); }
    };

    el.querySelector('[data-a="suchen"]').onclick = () => { const c = el.querySelector('[data-code]').value.replace(/\D/g, ''); if (c.length >= 6) gefunden(c); else toast('Barcode zu kurz', true); };

    if (!navigator.mediaDevices?.getUserMedia) { status('Kamera nicht verfügbar – tippe den Barcode ein.'); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (!laeuft) { stopp(); return; }
      const video = el.querySelector('video');
      video.srcObject = stream; await video.play();
      status('Halte den Barcode in den Rahmen');
      const D = await detektorLaden();
      const det = new D({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
      const schleife = async () => {
        if (!laeuft) return;
        try {
          if (video.readyState >= 2) {
            const res = await det.detect(video);
            if (res.length && laeuft) { gefunden(res[0].rawValue); return; }
          }
        } catch { /* nächster Versuch */ }
        setTimeout(schleife, 180);
      };
      schleife();
    } catch (err) {
      status(err.name === 'NotAllowedError' ? 'Kamera-Zugriff wurde nicht erlaubt. Erlaube ihn in den Browser-Einstellungen oder tippe den Barcode ein.' : 'Kamera konnte nicht gestartet werden – tippe den Barcode ein.');
    }
  });
}

// ---------- Wasser & Gewicht ---------------------------------
async function wasser(delta, ziel = null) {
  const heute = amTag(eintraege, tag).filter((x) => x.kind === 'wasser').sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at));
  let n = ziel != null ? ziel - heute.length : delta;
  try {
    while (n > 0) { eintraege.push(await core.addEvent({ app: APP, kind: 'wasser', title: 'Wasser', starts_at: eintragZeit('snacks').toISOString(), data: { ml: 250 } })); n--; }
    while (n < 0 && heute.length) { const x = heute.shift(); await core.deleteEvent(x.id); eintraege = eintraege.filter((e) => e.id !== x.id); n++; }
  } catch { toast('Speichern fehlgeschlagen', true); }
  render();
}

function gewichtEintragen() {
  const alt = aktuellesGewicht();
  sheet(`<h2>Gewicht eintragen</h2>
    <p class="muted small" style="margin-top:-8px">Für ${tagKey(tag) === tagKey(new Date()) ? 'heute' : fmtDatum(tag, { day: 'numeric', month: 'long' })} – wird auch im Gym-Tracker für deine Ränge genutzt.</p>
    <div class="portion-row" style="grid-template-columns:1fr"><input data-kg inputmode="decimal" value="${alt ? fmt(alt) : ''}" placeholder="kg"></div>
    <div class="sheet-actions"><button class="btn" data-a="x">Abbrechen</button><button class="btn btn-primary" data-a="ok">Speichern</button></div>`,
  (el, close) => {
    el.querySelector('[data-a="x"]').onclick = close;
    el.querySelector('[data-a="ok"]').onclick = async () => {
      const kg = zahl(el.querySelector('[data-kg]').value);
      if (!(kg > 25 && kg < 400)) { toast('Bitte ein gültiges Gewicht eingeben', true); return; }
      close();
      try {
        const zeit = tagKey(tag) === tagKey(new Date()) ? new Date() : new Date(new Date(tag).setHours(9));
        // pro Tag nur ein Gewicht: alten Eintrag des Tages ersetzen
        for (const x of amTag(eintraege, tag).filter((e) => e.kind === 'gewicht')) { await core.deleteEvent(x.id); eintraege = eintraege.filter((e) => e.id !== x.id); }
        eintraege.push(await core.addEvent({ app: APP, kind: 'gewicht', title: 'Gewicht', starts_at: zeit.toISOString(), data: { kg } }));
        const neuestes = aktuellesGewicht();
        if (neuestes === kg) { await core.updateSettings({ gewicht: kg }); S.gewicht = kg; }
        toast('Gewicht gespeichert ✓');
      } catch { toast('Speichern fehlgeschlagen', true); }
      render();
    };
    setTimeout(() => el.querySelector('[data-kg]').select(), 100);
  });
}

// ---------- Analyse -----------------------------------------
function zeitraum(art, versatz) {
  if (art === 'woche') {
    const von = plusTage(wochenStart(new Date()), 7 * versatz);
    const bis = plusTage(von, 7);
    return { von, bis, titel: `${fmtDatum(von, { day: 'numeric', month: 'short' })} – ${fmtDatum(plusTage(bis, -1), { day: 'numeric', month: 'short', year: 'numeric' })}` };
  }
  const h = new Date();
  const von = new Date(h.getFullYear(), h.getMonth() + versatz, 1);
  const bis = new Date(h.getFullYear(), h.getMonth() + versatz + 1, 1);
  return { von, bis, titel: von.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }) };
}

function balken(werte, labels, ziel) {
  const W = 340, H = 150, pb = 18, pt = 10, n = werte.length;
  const max = Math.max(ziel * 1.2, ...werte, 1);
  const y = (v) => pt + (1 - v / max) * (H - pt - pb);
  const gap = W / n, bw = gap * 0.6;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">
    ${werte.map((v, i) => {
      const x = i * gap + (gap - bw) / 2;
      const h = v ? Math.max(3, (H - pb) - y(v)) : 0;
      const farbe = v > ziel * 1.05 ? 'var(--danger)' : 'var(--accent2)';
      return `${h ? `<rect x="${x}" y="${H - pb - h}" width="${bw}" height="${h}" rx="${Math.min(4, bw / 2)}" fill="${farbe}"/>` : `<rect x="${x}" y="${H - pb - 2}" width="${bw}" height="2" fill="var(--line)"/>`}
        ${labels[i] ? `<text class="lbl" x="${x + bw / 2}" y="${H - 4}" text-anchor="middle">${labels[i]}</text>` : ''}`;
    }).join('')}
    <line x1="0" x2="${W}" y1="${y(ziel)}" y2="${y(ziel)}" stroke="var(--ok)" stroke-dasharray="4 4" stroke-width="1.5"/>
    <text class="lbl" x="${W - 2}" y="${y(ziel) - 4}" text-anchor="end" fill="var(--ok)">Ziel ${fmt(ziel, 0)}</text>
  </svg>`;
}

function linie(punkte, einheit = 'kg') {
  if (punkte.length < 2) return '<p class="muted small" style="text-align:center;padding:16px 0">Trage dein Gewicht an mindestens zwei Tagen ein, um den Verlauf zu sehen.</p>';
  const W = 340, H = 140, pl = 34, pr = 10, pt = 12, pb = 22;
  const ys = punkte.map((p) => p.y);
  let min = Math.min(...ys, S.zielgewicht || Infinity), max = Math.max(...ys);
  if (max - min < 2) { min -= 1; max += 1; }
  const t0 = +new Date(punkte[0].x), t1 = +new Date(punkte.at(-1).x);
  const x = (t) => pl + ((+new Date(t) - t0) / Math.max(1, t1 - t0)) * (W - pl - pr);
  const y = (v) => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
  const pfad = punkte.map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">
    ${[min, (min + max) / 2, max].map((v) => `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}"/><text class="lbl" x="${pl - 6}" y="${y(v) + 3}" text-anchor="end">${fmt(v, 0)}</text>`).join('')}
    ${S.zielgewicht ? `<line x1="${pl}" x2="${W - pr}" y1="${y(S.zielgewicht)}" y2="${y(S.zielgewicht)}" stroke="var(--ok)" stroke-dasharray="4 4"/>` : ''}
    <path class="line" d="${pfad}"/>${punkte.map((p) => `<circle class="dot" cx="${x(p.x)}" cy="${y(p.y)}" r="3"/>`).join('')}
    <text class="lbl" x="${pl}" y="${H - 6}">${fmtDatum(punkte[0].x, { day: 'numeric', month: 'short' })}</text>
    <text class="lbl" x="${W - pr}" y="${H - 6}" text-anchor="end">${fmtDatum(punkte.at(-1).x, { day: 'numeric', month: 'short' })}</text>
    <text class="lbl" x="${pl}" y="9">${einheit}</text></svg>`;
}

async function seiteAnalyse() {
  const z = zeitraum(anaArt, anaVersatz);
  if (geladenAb && z.von < geladenAb) { $app.innerHTML = '<div class="loading"><div class="spinner"></div></div>'; await sicherGeladen(z.von); }
  const ziel = tagesziel();
  const tage = [];
  for (let d = new Date(z.von); d < z.bis; d = plusTage(d, 1)) tage.push(new Date(d));
  const werte = tage.map((d) => tagesWerte(d));
  const mitEssen = werte.filter((w) => w.essen.length);
  const schnitt = (k) => (mitEssen.length ? mitEssen.reduce((s, w) => s + w.sum[k], 0) / mitEssen.length : 0);
  const kcalSchnitt = schnitt('kcal');
  const imZiel = werte.filter((w) => {
    if (!w.essen.length) return false;
    const b = ziel.kcal + (S.trainingAddieren ? w.verbrannt : 0);
    return Math.abs(w.sum.kcal - b) <= b * 0.1;   // ±10 % gilt als im Ziel
  }).length;
  const verbrannt = werte.reduce((s, w) => s + w.verbrannt, 0);
  const trainingsAnz = werte.reduce((s, w) => s + w.gym.length, 0);
  const kh = schnitt('kh'), ei = schnitt('eiweiss'), fe = schnitt('fett');
  const makroKcal = kh * 4 + ei * 4 + fe * 9 || 1;
  const labels = anaArt === 'woche' ? ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] : tage.map((d, i) => ([0, 9, 19].includes(i) || i === tage.length - 1 ? String(d.getDate()) : ''));

  // Top-Lebensmittel nach kcal
  const top = {};
  for (const w of werte) for (const e of w.essen) { const n = e.data.lm?.name || e.title; top[n] = (top[n] || 0) + (e.data.kcal || 0); }
  const topListe = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const gewichte = eintraege.filter((x) => x.kind === 'gewicht').sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)).map((x) => ({ x: x.starts_at, y: x.data.kg }));
  const gZeitraum = gewichte.filter((g) => new Date(g.x) >= z.von && new Date(g.x) < z.bis);
  const gDelta = gZeitraum.length >= 2 ? gZeitraum.at(-1).y - gZeitraum[0].y : null;

  $app.innerHTML = `
    <div class="page-head"><h1>Analyse</h1></div>
    <div class="seg" style="margin-bottom:12px">
      <button data-a="ana-art" data-v="woche" class="${anaArt === 'woche' ? 'on' : ''}">Woche</button>
      <button data-a="ana-art" data-v="monat" class="${anaArt === 'monat' ? 'on' : ''}">Monat</button>
    </div>
    <div class="rb-nav">
      <button class="icon-btn" data-a="ana-nav" data-v="-1" aria-label="Zurück">‹</button><b>${z.titel}</b>
      <button class="icon-btn" data-a="ana-nav" data-v="1" ${anaVersatz >= 0 ? 'disabled' : ''} aria-label="Weiter">›</button>
    </div>

    <div class="card rb-hero">
      <div class="muted small">Ø Kalorien pro Tag</div>
      <div class="row" style="align-items:baseline;gap:10px"><span class="rb-big num">${fmt(kcalSchnitt, 0)}</span><span class="muted">/ ${fmt(ziel.kcal, 0)} kcal</span></div>
      <div class="muted small">${mitEssen.length} von ${tage.length} Tagen eingetragen · ${imZiel} im Ziel</div>
    </div>

    <div class="section-title">Kalorien pro Tag</div>
    <div class="card">${balken(werte.map((w) => Math.round(w.sum.kcal)), labels, ziel.kcal)}</div>

    <div class="section-title">Ø Makronährstoffe</div>
    <div class="card">
      ${[['Kohlenhydrate', kh, ziel.kh, 4, 'var(--kh)'], ['Eiweiß', ei, ziel.eiweiss, 4, 'var(--eiweiss)'], ['Fett', fe, ziel.fett, 9, 'var(--fett)']].map(([n, ist, soll, f, c]) => `
        <div class="makro" style="margin-bottom:10px"><div class="row" style="justify-content:space-between"><span>${n}</span><span class="muted small num">${fmt(ist, 0)} / ${soll} g · ${fmt((ist * f / makroKcal) * 100, 0)} %</span></div>
        <div class="bar"><i style="width:${Math.min(100, (ist / soll) * 100)}%;background:${c}"></i></div></div>`).join('')}
    </div>

    <div class="section-title">Training (aus dem Gym-Tracker)</div>
    <div class="stats3">
      <div class="stat"><b class="num">${trainingsAnz}</b><span>Trainings</span></div>
      <div class="stat"><b class="num">${fmt(verbrannt, 0)}</b><span>kcal verbrannt</span></div>
      <div class="stat"><b class="num">${trainingsAnz ? fmt(verbrannt / trainingsAnz, 0) : '–'}</b><span>kcal / Training</span></div>
    </div>

    <div class="section-title">Gewicht</div>
    <div class="card">
      ${gDelta != null ? `<div style="margin-bottom:8px"><b class="num" style="font-size:20px;color:${(S.ziel === 'zunehmen' ? gDelta >= 0 : gDelta <= 0) ? 'var(--ok)' : 'var(--fire)'}">${gDelta > 0 ? '+' : ''}${fmt(gDelta)} kg</b> <span class="muted small">in diesem Zeitraum</span></div>` : ''}
      ${linie(gewichte.slice(-60))}
    </div>

    ${topListe.length ? `<div class="section-title">Meiste Kalorien aus</div><div class="card">
      ${topListe.map(([n, k]) => `<div class="row" style="justify-content:space-between;padding:5px 0"><span class="ellipsis">${esc(n)}</span><span class="muted num">${fmt(k, 0)} kcal</span></div>`).join('')}</div>` : ''}
  `;
}

// ---------- Profil -------------------------------------------
function seiteProfil() {
  const z = tagesziel();
  $app.innerHTML = `
    <div class="page-head"><h1>Profil</h1></div>
    <div class="card" style="text-align:center">
      <div class="muted small">Dein Tagesziel</div>
      <div class="ziel-zahl num">${fmt(z.kcal, 0)} <span class="muted" style="font-size:16px;font-weight:600">kcal</span></div>
      <div class="muted small">${z.kh} g Kohlenhydrate · ${z.eiweiss} g Eiweiß · ${z.fett} g Fett</div>
      ${z.auto ? `<div class="muted small" style="margin-top:6px">Grundumsatz ${fmt(z.auto.grundumsatz, 0)} · Bedarf ohne Training ${fmt(z.auto.bedarf, 0)} kcal${S.trainingAddieren ? ' · Trainings kommen dazu' : ''}</div>` : ''}
    </div>

    <div class="section-title">Ziel</div>
    <form class="card" id="ziel-form">
      <div class="field"><span>Was möchtest du?</span><div class="seg" data-seg="ziel">
        ${[['abnehmen', 'Abnehmen'], ['halten', 'Halten'], ['zunehmen', 'Zunehmen']].map(([k, n]) => `<button type="button" data-v="${k}" class="${S.ziel === k ? 'on' : ''}">${n}</button>`).join('')}</div></div>
      <label class="field" data-tempo ${S.ziel === 'halten' ? 'hidden' : ''}><span>Tempo</span>
        <select name="tempo">${[0.25, 0.5, 0.75].map((t) => `<option value="${t}" ${t === S.tempo ? 'selected' : ''}>${fmt(t, 2)} kg pro Woche${t === 0.75 ? ' (ambitioniert)' : ''}</option>`).join('')}</select></label>
      <label class="field"><span>Zielgewicht (kg)</span><input name="zielgewicht" inputmode="decimal" value="${S.zielgewicht ?? ''}" placeholder="optional"></label>
      <label class="field"><span>Aktivität im Alltag (ohne Training)</span>
        <select name="aktivitaet">${AKTIVITAET.map((a) => `<option value="${a.id}" ${a.id === S.aktivitaet ? 'selected' : ''}>${a.name} – ${a.text}</option>`).join('')}</select></label>
      <div class="field"><span>Makro-Verteilung</span><div class="seg" data-seg="makro">
        ${MAKRO_VORLAGEN.map((m) => `<button type="button" data-v="${m.id}" class="${S.makro === m.id ? 'on' : ''}">${m.name}</button>`).join('')}</div></div>
      <label class="field"><span>Eigenes Kalorienziel (optional, überschreibt die Berechnung)</span><input name="manuell" inputmode="numeric" value="${S.kcalManuell ?? ''}" placeholder="automatisch"></label>
      <label class="field"><span>Wasserziel</span>
        <select name="wasser">${[1500, 2000, 2500, 3000, 3500].map((m) => `<option value="${m}" ${m === S.wasserZiel ? 'selected' : ''}>${fmt(m / 1000, 1)} Liter</option>`).join('')}</select></label>
      <label class="check-row"><input type="checkbox" name="training" ${S.trainingAddieren ? 'checked' : ''}> Trainingskalorien zum Tagesbudget addieren</label>
      <button class="btn btn-primary btn-block" type="submit" style="margin-top:12px">Speichern</button>
    </form>

    <div class="section-title">Über dich</div>
    <form class="card" id="koerper-form">
      <div class="portion-row" style="grid-template-columns:1fr 1fr">
        <label class="field" style="margin:0"><span>Größe (cm)</span><input name="groesse" inputmode="numeric" value="${S.groesse ?? ''}"></label>
        <label class="field" style="margin:0"><span>Geburtsjahr</span><input name="geburtsjahr" inputmode="numeric" value="${S.geburtsjahr ?? ''}"></label>
      </div>
      <div class="field"><span>Geschlecht</span><div class="seg" data-seg="geschlecht">
        <button type="button" data-v="m" class="${S.geschlecht === 'm' ? 'on' : ''}">Männlich</button><button type="button" data-v="w" class="${S.geschlecht === 'w' ? 'on' : ''}">Weiblich</button></div></div>
      <p class="muted small" style="margin:0 0 10px">Gewicht trägst du im Tagebuch ein – es gilt auch für den Gym-Tracker.</p>
      <button class="btn btn-primary btn-block" type="submit">Speichern</button>
    </form>

    <div class="section-title">Konto</div>
    <a class="list-item" href="../gym/" style="text-decoration:none;color:inherit"><span class="grow">🏋️ Zum Gym-Tracker</span><span class="chev">›</span></a>
    <a class="list-item" href="../" style="text-decoration:none;color:inherit"><span class="grow">← Alle Apps</span></a>
    <button class="list-item" data-a="logout" style="color:var(--danger)"><span class="grow">Abmelden</span></button>
  `;
  const segWert = {};
  $app.querySelectorAll('[data-seg]').forEach((seg) => {
    segWert[seg.dataset.seg] = seg.querySelector('.on')?.dataset.v;
    seg.querySelectorAll('button').forEach((b) => b.onclick = () => {
      segWert[seg.dataset.seg] = b.dataset.v;
      seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      if (seg.dataset.seg === 'ziel') $app.querySelector('[data-tempo]').hidden = b.dataset.v === 'halten';
    });
  });
  $app.querySelector('#ziel-form').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const patch = {
      kal_ziel: segWert.ziel, kal_tempo: +f.get('tempo'), kal_zielgewicht: zahl(f.get('zielgewicht')),
      aktivitaet: f.get('aktivitaet'), kal_makro: segWert.makro, kal_kcal_manuell: zahl(f.get('manuell')) || null,
      kal_wasser_ziel: +f.get('wasser'), kal_training_addieren: !!f.get('training'),
    };
    try {
      await core.updateSettings(patch);
      Object.assign(S, { ziel: patch.kal_ziel, tempo: patch.kal_tempo, zielgewicht: patch.kal_zielgewicht, aktivitaet: patch.aktivitaet, makro: patch.kal_makro, kcalManuell: patch.kal_kcal_manuell, wasserZiel: patch.kal_wasser_ziel, trainingAddieren: patch.kal_training_addieren });
      toast('Gespeichert ✓'); render();
    } catch { toast('Speichern fehlgeschlagen', true); }
  };
  $app.querySelector('#koerper-form').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const patch = { groesse: zahl(f.get('groesse')), geburtsjahr: zahl(f.get('geburtsjahr')), geschlecht: segWert.geschlecht };
    try { await core.updateSettings(patch); Object.assign(S, patch); toast('Gespeichert ✓'); render(); }
    catch { toast('Speichern fehlgeschlagen', true); }
  };
}

// ---------- Einrichtung beim ersten Start --------------------
function einrichtung() {
  let ziel = S.ziel, g = S.geschlecht;
  sheet(`<h2>Willkommen! 🥗</h2>
    <p class="muted" style="margin-top:-6px">Für dein Kalorienziel brauche ich ein paar Angaben. Name, Gewicht und Geschlecht kommen aus dem Gym-Tracker.</p>
    <div class="field"><span>Was möchtest du?</span><div class="seg" data-s="ziel">
      ${[['abnehmen', 'Abnehmen'], ['halten', 'Halten'], ['zunehmen', 'Zunehmen']].map(([k, n]) => `<button type="button" data-v="${k}" class="${ziel === k ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <div class="portion-row" style="grid-template-columns:1fr 1fr 1fr">
      <label class="field" style="margin:0"><span>Gewicht</span><input data-f="gewicht" inputmode="decimal" value="${S.gewicht ?? ''}" placeholder="kg"></label>
      <label class="field" style="margin:0"><span>Größe</span><input data-f="groesse" inputmode="numeric" placeholder="cm"></label>
      <label class="field" style="margin:0"><span>Geburtsjahr</span><input data-f="geburtsjahr" inputmode="numeric" placeholder="z. B. 2005"></label>
    </div>
    <div class="field"><span>Geschlecht</span><div class="seg" data-s="g"><button type="button" data-v="m" class="${g === 'm' ? 'on' : ''}">Männlich</button><button type="button" data-v="w" class="${g === 'w' ? 'on' : ''}">Weiblich</button></div></div>
    <label class="field"><span>Aktivität im Alltag (ohne Training)</span>
      <select data-f="aktivitaet">${AKTIVITAET.map((a) => `<option value="${a.id}" ${a.id === S.aktivitaet ? 'selected' : ''}>${a.name} – ${a.text}</option>`).join('')}</select></label>
    <div class="sheet-actions"><button class="btn" data-a="spaeter">Später</button><button class="btn btn-primary" data-a="ok">Ziel berechnen</button></div>`,
  (el, close) => {
    el.querySelectorAll('[data-s] button').forEach((b) => b.onclick = () => {
      const s = b.closest('[data-s]').dataset.s;
      if (s === 'ziel') ziel = b.dataset.v; else g = b.dataset.v;
      b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    });
    el.querySelector('[data-a="spaeter"]').onclick = close;
    el.querySelector('[data-a="ok"]').onclick = async () => {
      const v = (k) => el.querySelector(`[data-f="${k}"]`).value;
      const patch = { kal_ziel: ziel, geschlecht: g, gewicht: zahl(v('gewicht')), groesse: zahl(v('groesse')), geburtsjahr: zahl(v('geburtsjahr')), aktivitaet: v('aktivitaet') };
      if (!patch.gewicht || !patch.groesse || !patch.geburtsjahr) { toast('Bitte Gewicht, Größe und Geburtsjahr eintragen', true); return; }
      try {
        await core.updateSettings(patch);
        Object.assign(S, { ziel, geschlecht: g, gewicht: patch.gewicht, groesse: patch.groesse, geburtsjahr: patch.geburtsjahr, aktivitaet: patch.aktivitaet });
        close(); render();
        toast(`Dein Tagesziel: ${fmt(tagesziel().kcal, 0)} kcal`);
      } catch { toast('Speichern fehlgeschlagen', true); }
    };
  });
}

// ---------- Klicks -------------------------------------------
$app.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a;
  if (a === 'tag') { const [y, m, d] = b.dataset.d.split('-').map(Number); tag = new Date(y, m - 1, d); render(); }
  if (a === 'woche') { tag = plusTage(tag, Number(b.dataset.v)); await sicherGeladen(tag); render(); }
  if (a === 'add') hinzufuegen(b.dataset.m);
  if (a === 'eintrag') eintragOeffnen(b.dataset.id);
  if (a === 'wasser') wasser(Number(b.dataset.v));
  if (a === 'glas') { const i = Number(b.dataset.i); const voll = b.classList.contains('voll'); wasser(0, voll && !b.nextElementSibling?.classList.contains('voll') ? i : i + 1); }
  if (a === 'gewicht') gewichtEintragen();
  if (a === 'ana-art') { anaArt = b.dataset.v; anaVersatz = 0; render(); }
  if (a === 'ana-nav') { anaVersatz = Math.min(0, anaVersatz + Number(b.dataset.v)); render(); }
  if (a === 'logout') core.logout();
});

$nav.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  tab = b.dataset.tab; render(); window.scrollTo(0, 0);
});

// Beim Zurückkehren in die App (z. B. nach einem Training) neu laden
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !geladenAb) return;
  try {
    const von = plusTage(tagStart(new Date()), -2);
    const [k, g] = await Promise.all([
      core.listEvents({ app: APP, from: von, limit: 2000 }),
      core.listEvents({ app: 'gym', kind: 'training', from: von }),
    ]);
    eintraege = [...eintraege.filter((x) => new Date(x.starts_at) < von), ...k];
    trainings = [...trainings.filter((x) => new Date(x.starts_at) < von), ...g];
    if (!document.querySelector('.backdrop')) render();
  } catch { /* offline */ }
});

// ---------- Start --------------------------------------------
async function init() {
  const user = await core.getUser();
  if (!user) {
    $nav.classList.add('hidden');
    core.renderLogin($app, { appName: 'Kalorien', onDone: () => location.reload() });
    return;
  }
  try { await ladeAlles(); }
  catch (err) {
    console.error(err);
    $app.innerHTML = `<div class="loading"><div style="text-align:center;max-width:340px"><h2>Verbindung fehlgeschlagen</h2>
      <p class="muted">${esc(err.message || 'Unbekannter Fehler')}</p><button class="btn btn-primary" onclick="location.reload()">Nochmal versuchen</button></div></div>`;
    return;
  }
  $nav.classList.remove('hidden');
  render();
  if ((!S.groesse || !S.geburtsjahr) && !store.get('kal-einrichtung-spaeter')) { einrichtung(); store.set('kal-einrichtung-spaeter', true); }
}

core.onAuthChange((u) => { if (!u && !$nav.classList.contains('hidden')) location.reload(); });
init();
