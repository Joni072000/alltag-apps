// =============================================================
// Gym-Tracker – Teil der Alltag-Apps
// Trainings landen in der gemeinsamen Zeitachse (events, app='gym'),
// Routinen und eigene Übungen in app_data.
// =============================================================
import * as core from '../shared/core.js';
import { UEBUNGEN, MUSKELN, RAENGE, e1rm, effGewicht, rangFuer, levelAusXp, rangBadge } from './daten.js';
import { berechneMaskottchen, maskottchenSvg, spruch, futterVon } from './maskottchen.js';
import { muskelkarteSvg } from './muskelkarte.js';
import * as pushShared from '../shared/push.js';
import { vorkommen, lokalStr } from '../kalender/termine.js';

const APP = 'gym';
const $app = document.getElementById('app');
const $nav = document.getElementById('nav');
const PUSH_URL = core.SUPABASE_URL + '/functions/v1/gym-push';

const S = {
  name: '', gewicht: null, geschlecht: 'm', wochenziel: 3, pause: 90, petName: 'Pumpi',
  pushStunde: 18, pushTage: 2, pushRueckblick: true,
};
let karteModus = 'erholung';          // Muskelkarte auf der Startseite
let verlaufAnsicht = 'liste';         // 'liste' | 'rueckblick' | 'fortschritt'
let fsUeb = null, fsWert = 'kg';   // Fortschritt-Diagramm
let rbArt = 'woche', rbVersatz = 0;   // Rückblick
let trainings = [];      // neueste zuerst
let kalTermine = [];     // Termine aus dem Kalender (für „heute geplant“)
let routinen = [];
let eigene = [];
let tab = 'start';
let aktiv = null;        // laufendes Training
let minimiert = false;
let stats = null;
let filterMuskel = null, sucheText = '';

// ---------- Hilfsfunktionen ----------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const zahl = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const fmt = (n, d = 1) => (n == null ? '–' : Number(n).toLocaleString('de-DE', { maximumFractionDigits: d }));
const fmtDauer = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; };
const fmtDatum = (d, opt = { weekday: 'short', day: 'numeric', month: 'short' }) => new Date(d).toLocaleDateString('de-DE', opt);
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* egal */ } },
};

function toast(msg, err = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

function alleUebungen() { return [...UEBUNGEN, ...eigene]; }
function findUeb(id, fallback) {
  return alleUebungen().find((u) => u.id === id)
    || (fallback ? { id, name: fallback.name || 'Übung', muskel: fallback.muskel || 'Bauch', neben: [], typ: fallback.typ || 'gewicht', std: null } : null);
}

const ICON = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17l9-10"/></svg>',
  flame: (on) => `<svg class="flame ${on ? '' : 'off'}" viewBox="0 0 24 24"><defs><linearGradient id="fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF4D1A"/><stop offset="1" stop-color="#FFC24A"/></linearGradient></defs><path fill="url(#fl)" d="M12 2c1 3.5 5.5 6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.4 1.2-4 2.4-5.2.2 1.7 1 2.9 2.2 3.4C10.6 8.6 11 5 12 2z"/></svg>`,
};

// ---------- Sheets (Popups von unten) --------------------------
function sheet(html, onMount, onDismiss) {
  const bd = document.createElement('div');
  bd.className = 'backdrop';
  bd.innerHTML = `<div class="sheet"><div class="sheet-top"><div class="grabber"></div><button class="sheet-x" type="button" aria-label="Schließen">×</button></div>${html}</div>`;
  const close = () => bd.remove();
  bd.addEventListener('click', (e) => { if (e.target === bd) { close(); onDismiss?.(); } });
  bd.querySelector('.sheet-x').addEventListener('click', () => { close(); onDismiss?.(); });
  document.body.appendChild(bd);
  onMount?.(bd.querySelector('.sheet'), close);
  return close;
}

function bestaetigen(titel, text, ja = 'Ja', gefahr = true) {
  return new Promise((resolve) => {
    sheet(`<h2>${esc(titel)}</h2><p class="muted">${esc(text)}</p>
      <div class="sheet-actions"><button class="btn" data-n>Zurück</button><button class="btn ${gefahr ? 'btn-danger' : 'btn-primary'}" data-y>${esc(ja)}</button></div>`,
    (el, cl) => {
      el.querySelector('[data-n]').onclick = () => { cl(); resolve(false); };
      el.querySelector('[data-y]').onclick = () => { cl(); resolve(true); };
    }, () => resolve(false));
  });
}

// ---------- Statistik ----------------------------------------
function berechne() {
  const proUeb = {};
  let xp = 0, volumen = 0, saetze = 0;
  for (const t of [...trainings].reverse()) {
    const d = t.data || {};
    xp += d.xp || 0; volumen += d.volumen || 0; saetze += d.saetze || 0;
    const kg_k = d.koerpergewicht || S.gewicht;
    for (const ex of d.uebungen || []) {
      const ueb = findUeb(ex.id, ex);
      const fertig = (ex.saetze || []).filter((s) => s.done && !s.warm);
      if (!fertig.length) continue;
      let b1 = 0, bKg = 0, bWdh = 0, bZeit = 0, vol = 0;
      for (const s of fertig) {
        if (ueb.typ === 'zeit') { bZeit = Math.max(bZeit, s.wdh || 0); continue; }
        const eff = effGewicht(ueb, s.kg, kg_k);
        const v = e1rm(eff, s.wdh);
        if (v > b1) b1 = v;
        if ((s.kg || 0) > bKg || ((s.kg || 0) === bKg && s.wdh > bWdh)) { bKg = s.kg || 0; bWdh = s.wdh; }
        vol += eff * (s.wdh || 0);
      }
      const p = (proUeb[ex.id] ||= { einheiten: [], best1rm: 0, bestKg: 0, bestWdh: 0, bestZeit: 0 });
      p.einheiten.push({ datum: t.starts_at, trainingId: t.id, best1rm: b1, bestKg: bKg, bestWdh: bWdh, saetze: ex.saetze.filter((s) => s.done), vol, zeit: bZeit });
      p.best1rm = Math.max(p.best1rm, b1);
      p.bestZeit = Math.max(p.bestZeit, bZeit);
      if (bKg > p.bestKg || (bKg === p.bestKg && bWdh > p.bestWdh)) { p.bestKg = bKg; p.bestWdh = bWdh; }
    }
  }
  stats = { proUeb, xp, volumen, saetze };
  return stats;
}

function rangVon(id) {
  const ueb = findUeb(id);
  const p = stats?.proUeb[id];
  return rangFuer(ueb, p?.best1rm, S.gewicht, S.geschlecht);
}

function wochenStart(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function streakWochen() {
  const proWoche = {};
  for (const t of trainings) { const k = wochenStart(t.starts_at).getTime(); proWoche[k] = (proWoche[k] || 0) + 1; }
  const w = wochenStart(new Date());
  let n = 0;
  if ((proWoche[w.getTime()] || 0) >= S.wochenziel) n++;
  w.setDate(w.getDate() - 7);
  while ((proWoche[w.getTime()] || 0) >= S.wochenziel) { n++; w.setDate(w.getDate() - 7); }
  return n;
}

/**
 * Erholung pro Muskel in % (100 = voll erholt).
 * Jeder Arbeitssatz erzeugt Ermüdung: Hauptmuskel 1 Satz, Nebenmuskel ½ Satz.
 * ERHOLUNG_VOLL_SAETZE effektive Sätze = 100 % erschöpft; die Ermüdung eines
 * Trainings baut sich über ERHOLUNG_STUNDEN linear ab.
 */
const ERHOLUNG_VOLL_SAETZE = 10;
const ERHOLUNG_STUNDEN = 72;
function erholung() {
  const jetzt = Date.now(), last = {};
  for (const m of MUSKELN) last[m] = 0;
  for (const t of trainings) {
    const std = (jetzt - new Date(t.ends_at || t.starts_at).getTime()) / 3.6e6;
    const rest = 1 - Math.max(0, std) / ERHOLUNG_STUNDEN;
    if (!(rest > 0)) continue; // auch bei ungültigem Datum (NaN)
    for (const ex of t.data?.uebungen || []) {
      const ueb = findUeb(ex.id, ex);
      const n = (ex.saetze || []).filter((s) => s.done && !s.warm).length;
      if (!n || !ueb) continue;
      if (MUSKELN.includes(ueb.muskel)) last[ueb.muskel] += n * rest;
      for (const nm of ueb.neben || []) if (MUSKELN.includes(nm) && nm !== ueb.muskel) last[nm] += n * 0.5 * rest;
    }
  }
  const res = {};
  for (const m of MUSKELN) res[m] = Math.round(100 - Math.min(100, (last[m] / ERHOLUNG_VOLL_SAETZE) * 100));
  return res;
}

function letzteSaetze(exId) {
  return letzteEinheit(exId)?.saetze || [];
}

/** Letztes gespeichertes Training mit dieser Übung: { datum, saetze } */
function letzteEinheit(exId) {
  for (const t of trainings) {
    const ex = (t.data?.uebungen || []).find((e) => e.id === exId);
    if (ex) return { datum: t.starts_at, saetze: ex.saetze.filter((s) => s.done) };
  }
  return null;
}

// ---------- Daten laden / speichern ---------------------------
async function ladeAlles() {
  const [profil, tr, r, e, kt] = await Promise.all([
    core.getProfile(),
    core.listEvents({ app: APP, kind: 'training' }),
    core.getAppData(APP, 'routinen', []),
    core.getAppData(APP, 'eigene_uebungen', []),
    core.listEvents({ app: 'kalender', kind: 'termin', limit: 5000 }).catch(() => []),
  ]);
  const st = profil?.settings || {};
  S.name = st.name || '';
  S.gewicht = st.gewicht || null;
  S.geschlecht = st.geschlecht || 'm';
  S.wochenziel = st.gym_wochenziel || 3;
  S.pause = st.gym_pause || 90;
  S.petName = st.gym_maskottchen_name || 'Pumpi';
  S.pushStunde = st.gym_push_stunde ?? 18;
  S.pushTage = st.gym_push_tage ?? 2;
  S.pushRueckblick = st.gym_push_rueckblick !== false;
  trainings = tr;
  routinen = r || [];
  eigene = e || [];
  kalTermine = (kt || []).map((x) => ({ ...x.data, titel: x.title }));
  berechne();
}

const speichereRoutinen = () => core.setAppData(APP, 'routinen', routinen).catch(() => toast('Speichern fehlgeschlagen', true));
const speichereEigene = () => core.setAppData(APP, 'eigene_uebungen', eigene).catch(() => toast('Speichern fehlgeschlagen', true));

// ---------- Seiten -------------------------------------------
function render() {
  $nav.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  ({ start: seiteStart, verlauf: seiteVerlauf, uebungen: seiteUebungen, rang: seiteRang, profil: seiteProfil })[tab]();
  renderMini();
  window.scrollTo(0, 0);
}

function seiteStart() {
  const lv = levelAusXp(stats.xp);
  const streak = streakWochen();
  const ws = wochenStart(new Date());
  const tageMitTraining = new Set(trainings.filter((t) => new Date(t.starts_at) >= ws).map((t) => (new Date(t.starts_at).getDay() + 6) % 7));
  const heute = (new Date().getDay() + 6) % 7;
  const dieseWoche = trainings.filter((t) => new Date(t.starts_at) >= ws).length;
  const erh = erholung();
  const farbe = (p) => (p < 40 ? 'var(--danger)' : p < 80 ? 'var(--fire)' : 'var(--ok)');

  $app.innerHTML = `
    <div class="page-head">
      <div><div class="muted small">${fmtDatum(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <h1>${S.name ? `Hey ${esc(S.name)}` : 'Bereit?'} 💪</h1></div>
    </div>

    ${maskottchenKarte()}
    ${geplantKarte()}

    <div class="hero" style="margin-top:10px">
      <div class="card level-card">
        <div class="muted small">Level</div>
        <div class="level-num num">${lv.level}</div>
        <div class="xpbar"><i style="width:${Math.round(lv.fortschritt * 100)}%"></i></div>
        <div class="muted small num" style="margin-top:6px">${fmt(stats.xp - lv.start, 0)} / ${fmt(lv.ende - lv.start, 0)} XP</div>
      </div>
      <div class="card streak-card">
        <div class="muted small">Streak</div>
        <div class="streak-num num">${ICON.flame(streak > 0)}${streak}</div>
        <div class="muted small" style="margin-top:6px">${streak === 1 ? 'Woche' : 'Wochen'} · ${dieseWoche}/${S.wochenziel} diese Woche</div>
      </div>
    </div>

    <div class="card" style="margin-top:10px">
      <div class="week">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((t, i) => `<span class="${tageMitTraining.has(i) ? 'done' : ''} ${i === heute ? 'today' : ''}">${t}</span>`).join('')}</div>
    </div>

    <button class="btn btn-primary btn-block btn-lg" style="margin-top:16px" data-a="leer">${aktiv ? 'Training fortsetzen' : 'Leeres Training starten'}</button>

    <div class="section-title">Routinen <button data-a="neue-routine">+ Neu</button></div>
    ${routinen.length ? routinen.map((r) => `
      <div class="card routine">
        <div class="grow" data-a="routine-bearbeiten" data-id="${r.id}" style="cursor:pointer">
          <h3 class="ellipsis">${esc(r.name)}</h3>
          <p class="muted small ellipsis">${r.uebungen.map((u) => esc(findUeb(u.id, u)?.name)).join(' · ') || 'Keine Übungen'}</p>
        </div>
        <button class="start-btn" data-a="routine-start" data-id="${r.id}" aria-label="Starten">${ICON.play}</button>
      </div>`).join('') : `<div class="empty">Leg deine erste Routine an, z. B. „Push“, „Pull“ und „Beine“.</div>`}

    <div class="section-title">Muskelkarte</div>
    <div class="card">
      <div class="seg" style="margin-bottom:12px">
        <button data-a="karte" data-m="erholung" class="${karteModus === 'erholung' ? 'on' : ''}">Erholung</button>
        <button data-a="karte" data-m="woche" class="${karteModus === 'woche' ? 'on' : ''}">Diese Woche</button>
      </div>
      ${karteHtml(erh, ws)}
    </div>
    <div class="card recovery" style="margin-top:10px">
      ${MUSKELN.map((m) => `<div class="rec-item"><div class="row"><span>${m}</span><span class="muted num">${erh[m]}%</span></div>
        <div class="rec-bar"><i style="width:${erh[m]}%;background:${farbe(erh[m])}"></i></div></div>`).join('')}
    </div>
  `;
}

function karteHtml(erh, ws) {
  const saetze = muskelSaetze(ws, new Date(ws.getTime() + 7 * 864e5));
  const max = Math.max(10, ...Object.values(saetze));
  const werte = {};
  for (const m of MUSKELN) werte[m] = karteModus === 'erholung' ? (100 - erh[m]) / 100 : (saetze[m] || 0) / max;
  const farbe = karteModus === 'erholung' ? 'var(--fire)' : 'var(--accent2)';
  return `<div class="mk-wrap" data-karte='${JSON.stringify({ erh, saetze })}'>${muskelkarteSvg(werte, farbe)}</div>
    <p class="muted small mk-info">${karteModus === 'erholung' ? 'Orange = noch erschöpft. Tippe auf einen Muskel.' : 'Lila = viele Sätze diese Woche. Tippe auf einen Muskel.'}</p>`;
}

/** Arbeitssätze pro Muskel im Zeitraum (Nebenmuskeln zählen halb) */
function muskelSaetze(von, bis) {
  const res = {};
  for (const t of trainings) {
    const d = new Date(t.starts_at);
    if (d < von || d >= bis) continue;
    for (const ex of t.data?.uebungen || []) {
      const ueb = findUeb(ex.id, ex);
      const n = (ex.saetze || []).filter((s) => s.done && !s.warm).length;
      res[ueb.muskel] = (res[ueb.muskel] || 0) + n;
      for (const m of ueb.neben || []) res[m] = (res[m] || 0) + n * 0.5;
    }
  }
  for (const k in res) res[k] = Math.round(res[k] * 10) / 10;
  return res;
}

function geplantKarte() {
  const heute = lokalStr(new Date());
  const sport = vorkommen(kalTermine, heute, heute).filter((v) => v.termin.kategorie === 'sport');
  if (!sport.length) return '';
  const schonTrainiert = trainings.some((t) => lokalStr(new Date(t.starts_at)) === heute);
  return `<a class="card row" href="../kalender/" style="margin-top:10px;text-decoration:none;color:inherit">
    <span style="font-size:24px">🎯</span>
    <div class="grow"><div class="muted small">Heute im Kalender geplant</div>
      <b>${sport.map((v) => esc(v.termin.titel) + (v.termin.zeit ? ` · ${v.termin.zeit} Uhr` : '')).join(', ')}</b></div>
    ${schonTrainiert ? '<span class="pill on">Erledigt ✓</span>' : '<span class="chev">›</span>'}
  </a>`;
}

function maskottchenKarte() {
  const m = berechneMaskottchen(trainings);
  return `<div class="card pet-card">
    <div class="pet-stage">${maskottchenSvg(m, 132)}</div>
    <div class="grow">
      <div class="row" style="gap:8px;justify-content:space-between"><b style="font-size:18px">${esc(S.petName)}</b><span class="pill">${m.stufe.name}</span></div>
      <div class="bubble">${esc(spruch(m, S.petName))}</div>
      <div class="pet-bar"><span>Energie</span><div><i style="width:${m.energie}%;background:${m.energie < 25 ? 'var(--danger)' : m.energie < 50 ? 'var(--fire)' : 'var(--ok)'}"></i></div><b class="num">${m.energie}</b></div>
      <div class="pet-bar"><span>Kraft</span><div><i style="width:${Math.round(m.stufeFortschritt * 100)}%;background:var(--accent2)"></i></div><b class="num">${fmt(m.kraft, 0)}</b></div>
      <div class="muted small" style="margin-top:4px">${m.naechste ? `Noch ${fmt(m.naechste.ab - m.kraft, 0)} Kraft bis <b>${m.naechste.name}</b>` : 'Höchste Stufe erreicht 👑'}</div>
    </div>
  </div>`;
}

function trainingItem(t) {
  const d = t.data || {};
  return `<button class="list-item" data-a="training" data-id="${t.id}">
    <div class="grow">
      <div class="row" style="gap:8px"><b class="ellipsis">${esc(t.title || 'Training')}</b>${d.prs?.length ? `<span class="pill" style="color:#FFC24A">🏆 ${d.prs.length}</span>` : ''}</div>
      <div class="muted small">${fmtDatum(t.starts_at)} · ${d.dauer_min ?? '–'} min · ${fmt((d.volumen || 0) / 1000, 1)} t · ${d.saetze || 0} Sätze</div>
    </div><span class="chev">›</span></button>`;
}

function seiteVerlauf() {
  let html = `<div class="page-head"><h1>Verlauf</h1></div>
    <div class="seg" style="margin-bottom:16px">
      <button data-a="verlauf-ansicht" data-v="liste" class="${verlaufAnsicht === 'liste' ? 'on' : ''}">Trainings</button>
      <button data-a="verlauf-ansicht" data-v="fortschritt" class="${verlaufAnsicht === 'fortschritt' ? 'on' : ''}">Fortschritt</button>
      <button data-a="verlauf-ansicht" data-v="rueckblick" class="${verlaufAnsicht === 'rueckblick' ? 'on' : ''}">Rückblick</button>
    </div>`;
  if (verlaufAnsicht === 'rueckblick') { $app.innerHTML = html + rueckblickHtml(); return; }
  if (verlaufAnsicht === 'fortschritt') { $app.innerHTML = html + fortschrittHtml(); return; }
  if (!trainings.length) {
    html += `<div class="empty">Noch keine Trainings. Dein erstes Training erscheint hier.</div>`;
  } else {
    html += `<div class="stats3">
      <div class="stat"><b class="num">${trainings.length}</b><span>Trainings</span></div>
      <div class="stat"><b class="num">${fmt(stats.volumen / 1000, 1)} t</b><span>Volumen</span></div>
      <div class="stat"><b class="num">${fmt(stats.saetze, 0)}</b><span>Sätze</span></div></div>`;
    let monat = '';
    for (const t of trainings) {
      const m = fmtDatum(t.starts_at, { month: 'long', year: 'numeric' });
      if (m !== monat) { monat = m; html += `<div class="month">${m}</div>`; }
      html += trainingItem(t);
    }
  }
  $app.innerHTML = html;
}

// ---------- Fortschritt (Diagramme) --------------------------
/** Name/Typ einer Übung aus alten Trainings (falls eigene Übung gelöscht wurde) */
function uebAusTrainings(id) {
  for (const t of trainings) { const ex = (t.data?.uebungen || []).find((e) => e.id === id); if (ex) return ex; }
  return { name: 'Übung' };
}

// Fortschritt zeigt nur echte Bestleistungen (bester Satz je Training), keine berechneten Werte
const FS_WERTE = {
  kg: { name: 'Gewicht', titel: 'Bestleistung: schwerster Satz', einheit: 'kg', wert: (e) => e.bestKg },
  wdh: { name: 'Wdh.', titel: 'Bestleistung: Wiederholungen', einheit: 'Wdh', wert: (e) => e.bestWdh },
};
/** "100 kg × 5" für den besten Satz einer Einheit */
function bestSatzText(ueb, e) {
  if (ueb.typ === 'zeit') return `${e.zeit} s`;
  if (ueb.typ === 'koerper') return e.bestKg ? `+${fmt(e.bestKg)} kg × ${e.bestWdh}` : `${e.bestWdh} Wdh.`;
  return `${fmt(e.bestKg)} kg × ${e.bestWdh}`;
}

function fortschrittHtml() {
  const liste = Object.entries(stats.proUeb)
    .filter(([, p]) => p.einheiten.length)
    .map(([id, p]) => ({ id, ueb: findUeb(id, uebAusTrainings(id)), p, zuletzt: p.einheiten.at(-1).datum }))
    .sort((a, b) => new Date(b.zuletzt) - new Date(a.zuletzt));
  if (!liste.length) return `<div class="empty">Sobald du ein Training gespeichert hast, siehst du hier deinen Fortschritt.</div>`;
  if (!fsUeb || !stats.proUeb[fsUeb]) fsUeb = liste[0].id;
  const { ueb, p } = liste.find((x) => x.id === fsUeb);
  const zeit = ueb.typ === 'zeit', koerper = ueb.typ === 'koerper';
  const erlaubt = zeit ? [] : koerper ? (p.bestKg ? ['wdh', 'kg'] : ['wdh']) : ['kg', 'wdh'];
  if (!zeit && !erlaubt.includes(fsWert)) fsWert = erlaubt[0];
  const def = zeit ? { titel: 'Bestleistung: Zeit', einheit: 's', wert: (e) => e.zeit } : FS_WERTE[fsWert];
  const einheiten = p.einheiten.slice(-30);
  const punkte = einheiten.map((e) => ({ x: e.datum, y: def.wert(e) || 0 }));
  const erster = punkte[0]?.y || 0, jetzt = punkte.at(-1)?.y || 0;
  const diff = jetzt - erster;
  const allzeit = zeit ? `${p.bestZeit} s` : bestSatzText(ueb, { bestKg: p.bestKg, bestWdh: p.bestWdh });
  const einh = def.einheit === 'kg' ? ' kg' : def.einheit === 's' ? ' s' : '';

  // Gesamtvolumen der letzten 8 Wochen
  const wochen = [], labels = [];
  const ws0 = wochenStart(new Date());
  for (let k = 7; k >= 0; k--) {
    const von = new Date(ws0); von.setDate(von.getDate() - 7 * k);
    const bis = new Date(von); bis.setDate(bis.getDate() + 7);
    const r = auswerten(von, bis);
    wochen.push(Math.round(r.volumen / 100) / 10);
    labels.push(k === 0 ? 'jetzt' : fmtDatum(von, { day: 'numeric', month: 'numeric' }));
  }

  return `
    <label class="fs-wahl"><span class="muted small">Übung</span>
      <select data-f="fs-ueb">${liste.map((x) => `<option value="${esc(x.id)}" ${x.id === fsUeb ? 'selected' : ''}>${esc(x.ueb.name)} (${x.p.einheiten.length}×)</option>`).join('')}</select>
    </label>
    ${erlaubt.length > 1 ? `<div class="pills">${erlaubt.map((k) => `<button class="pill ${k === fsWert ? 'on' : ''}" data-a="fs-wert" data-v="${k}">${FS_WERTE[k].name}</button>`).join('')}</div>` : ''}
    <div class="card">
      <div class="row" style="justify-content:space-between;align-items:baseline;margin-bottom:6px">
        <b>${def.titel}</b>
        ${punkte.length > 1 ? `<span class="delta ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">${diff > 0 ? '▲ +' : diff < 0 ? '▼ ' : '±'}${fmt(diff)}${einh}</span>` : ''}
      </div>
      ${chartSvg(punkte, def.einheit)}
    </div>
    <div class="stats3" style="margin-top:10px">
      <div class="stat"><b class="num">${bestSatzText(ueb, einheiten.at(-1))}</b><span>Zuletzt bester Satz</span></div>
      <div class="stat"><b class="num">${allzeit}</b><span>Bestleistung</span></div>
      <div class="stat"><b class="num">${p.einheiten.length}</b><span>Einheiten</span></div>
    </div>
    <button class="btn btn-ghost" style="width:100%;margin-top:10px" data-a="uebung" data-id="${esc(fsUeb)}">Alle Einheiten dieser Übung ›</button>
    <div class="section-title">Gesamtvolumen pro Woche (t)</div>
    <div class="card">${balkenSvg(wochen, labels)}</div>`;
}

// ---------- Wochen- und Monatsrückblick ----------------------
function zeitraum(art, versatz) {
  if (art === 'woche') {
    const von = wochenStart(new Date());
    von.setDate(von.getDate() + 7 * versatz);
    const bis = new Date(von); bis.setDate(bis.getDate() + 7);
    const letzter = new Date(bis); letzter.setDate(letzter.getDate() - 1);
    return { von, bis, titel: `${fmtDatum(von, { day: 'numeric', month: 'short' })} – ${fmtDatum(letzter, { day: 'numeric', month: 'short', year: 'numeric' })}`, vorher: 'Vorwoche' };
  }
  const h = new Date();
  const von = new Date(h.getFullYear(), h.getMonth() + versatz, 1);
  const bis = new Date(h.getFullYear(), h.getMonth() + versatz + 1, 1);
  return { von, bis, titel: von.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }), vorher: 'Vormonat' };
}

function auswerten(von, bis) {
  const liste = trainings.filter((t) => { const d = new Date(t.starts_at); return d >= von && d < bis; });
  const r = { liste, anzahl: liste.length, minuten: 0, volumen: 0, saetze: 0, prs: [], proUeb: {} };
  for (const t of liste) {
    const d = t.data || {};
    r.minuten += d.dauer_min || 0; r.volumen += d.volumen || 0; r.saetze += d.saetze || 0;
    for (const p of d.prs || []) r.prs.push({ ...p, datum: t.starts_at });
    for (const ex of d.uebungen || []) r.proUeb[ex.id] = (r.proUeb[ex.id] || 0) + ex.saetze.filter((s) => !s.warm).length;
  }
  return r;
}

/** Bestes geschätztes Maximum pro Übung aus allen Trainings vor `datum` */
function besteVor(datum) {
  const best = {};
  for (const t of trainings) {
    if (new Date(t.starts_at) >= datum) continue;
    const kgK = t.data?.koerpergewicht || S.gewicht;
    for (const ex of t.data?.uebungen || []) {
      const ueb = findUeb(ex.id, ex);
      if (ueb.typ === 'zeit') continue;
      for (const s of ex.saetze) if (s.done && !s.warm) best[ex.id] = Math.max(best[ex.id] || 0, e1rm(effGewicht(ueb, s.kg, kgK), s.wdh));
    }
  }
  return best;
}

function balkenSvg(werte, labels, farbe = 'var(--accent2)') {
  const W = 340, H = 120, pb = 18, n = werte.length;
  const max = Math.max(1, ...werte);
  const bw = (W / n) * 0.62, gap = W / n;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">
    <line class="grid" x1="0" x2="${W}" y1="${H - pb}" y2="${H - pb}"/>
    ${werte.map((v, i) => {
      const h = v ? Math.max(4, (v / max) * (H - pb - 14)) : 0;
      const x = i * gap + (gap - bw) / 2;
      return `${h ? `<rect x="${x}" y="${H - pb - h}" width="${bw}" height="${h}" rx="${Math.min(5, bw / 2)}" fill="${farbe}"/>` : `<rect x="${x}" y="${H - pb - 2}" width="${bw}" height="2" rx="1" fill="var(--line)"/>`}
        ${labels[i] ? `<text class="lbl" x="${x + bw / 2}" y="${H - 4}" text-anchor="middle">${labels[i]}</text>` : ''}
        ${v && n <= 7 ? `<text class="lbl" x="${x + bw / 2}" y="${H - pb - h - 4}" text-anchor="middle">${v}</text>` : ''}`;
    }).join('')}
  </svg>`;
}

function vergleich(jetzt, vorher, einheit = '') {
  if (!vorher && !jetzt) return '';
  if (!vorher) return `<span class="delta up">neu</span>`;
  const p = Math.round(((jetzt - vorher) / vorher) * 100);
  if (p === 0) return `<span class="delta">±0 %</span>`;
  return `<span class="delta ${p > 0 ? 'up' : 'down'}">${p > 0 ? '▲' : '▼'} ${Math.abs(p)} %${einheit}</span>`;
}

function rueckblickHtml() {
  const z = zeitraum(rbArt, rbVersatz);
  const zv = zeitraum(rbArt, rbVersatz - 1);
  const r = auswerten(z.von, z.bis), rv = auswerten(zv.von, zv.bis);
  const kopf = `
    <div class="seg" style="margin-bottom:12px">
      <button data-a="rb-art" data-v="woche" class="${rbArt === 'woche' ? 'on' : ''}">Woche</button>
      <button data-a="rb-art" data-v="monat" class="${rbArt === 'monat' ? 'on' : ''}">Monat</button>
    </div>
    <div class="rb-nav">
      <button class="icon-btn" data-a="rb-nav" data-v="-1" aria-label="Zurück">‹</button>
      <b>${z.titel}</b>
      <button class="icon-btn" data-a="rb-nav" data-v="1" ${rbVersatz >= 0 ? 'disabled' : ''} aria-label="Weiter">›</button>
    </div>`;

  const mEnde = berechneMaskottchen(trainings, new Date(Math.min(Date.now(), z.bis.getTime() - 1)));
  const mStart = berechneMaskottchen(trainings, new Date(z.von.getTime() - 1));

  if (!r.anzahl) {
    return kopf + `<div class="card" style="text-align:center;padding:28px 16px">
      ${maskottchenSvg(mEnde, 110)}
      <p class="muted">Keine Trainings in diesem Zeitraum.</p></div>`;
  }

  // Diagramm: Minuten pro Tag (Woche) bzw. pro Tag im Monat
  let werte, labels;
  if (rbArt === 'woche') {
    werte = Array(7).fill(0);
    for (const t of r.liste) werte[(new Date(t.starts_at).getDay() + 6) % 7] += t.data?.dauer_min || 0;
    labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  } else {
    const tage = Math.round((z.bis - z.von) / 864e5);
    werte = Array(tage).fill(0);
    for (const t of r.liste) werte[new Date(t.starts_at).getDate() - 1] += t.data?.dauer_min || 0;
    labels = werte.map((_, i) => ([0, 9, 19].includes(i) || i === tage - 1 ? String(i + 1) : ''));
  }

  // Rangaufstiege im Zeitraum
  const vorher = besteVor(z.von), nachher = besteVor(z.bis);
  const aufstiege = [];
  if (S.gewicht) {
    for (const id of Object.keys(nachher)) {
      const ueb = findUeb(id); if (!ueb?.std) continue;
      const a = rangFuer(ueb, vorher[id] || 0, S.gewicht, S.geschlecht), b = rangFuer(ueb, nachher[id], S.gewicht, S.geschlecht);
      if (b && (!a || b.index > a.index)) aufstiege.push({ ueb, rang: b, alt: a });
    }
  }
  const topId = Object.entries(r.proUeb).sort((a, b) => b[1] - a[1])[0];
  const ms = muskelSaetze(z.von, z.bis);
  const msMax = Math.max(1, ...Object.values(ms));
  const werteKarte = Object.fromEntries(MUSKELN.map((m) => [m, (ms[m] || 0) / msMax]));
  const topMuskeln = Object.entries(ms).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const kraftPlus = mEnde.kraft - mStart.kraft;
  const zielText = rbArt === 'woche'
    ? (r.anzahl >= S.wochenziel ? `<span class="pill on">Wochenziel erreicht ✓</span>` : `<span class="pill">${r.anzahl} von ${S.wochenziel} fürs Wochenziel</span>`)
    : '';

  return kopf + `
    <div class="card rb-hero">
      <div class="muted small">Trainings</div>
      <div class="row" style="align-items:baseline;gap:10px"><span class="rb-big num">${r.anzahl}</span>${vergleich(r.anzahl, rv.anzahl)}</div>
      <div class="muted small">${rv.anzahl} in der ${z.vorher} ${zielText}</div>
    </div>
    <div class="stats3" style="margin-top:10px">
      <div class="stat"><b class="num">${Math.floor(r.minuten / 60)}:${String(r.minuten % 60).padStart(2, '0')} h</b><span>Zeit ${vergleich(r.minuten, rv.minuten)}</span></div>
      <div class="stat"><b class="num">${fmt(r.volumen / 1000, 1)} t</b><span>Volumen ${vergleich(r.volumen, rv.volumen)}</span></div>
      <div class="stat"><b class="num">${r.saetze}</b><span>Sätze ${vergleich(r.saetze, rv.saetze)}</span></div>
    </div>

    <div class="section-title">Trainingsminuten</div>
    <div class="card">${balkenSvg(werte, labels)}</div>

    <div class="section-title">Trainierte Muskeln</div>
    <div class="card">
      <div class="mk-wrap">${muskelkarteSvg(werteKarte, 'var(--accent2)')}</div>
      <div style="margin-top:8px">${topMuskeln.map(([m, n]) => `<div class="row" style="justify-content:space-between;padding:4px 0"><span>${m}</span><span class="muted num">${fmt(n)} Sätze</span></div>`).join('')}</div>
    </div>

    ${r.prs.length || aufstiege.length || topId ? `<div class="section-title">Highlights</div>` : ''}
    ${aufstiege.map((a) => `<div class="pr-item">${rangBadge(a.rang, 36)}<div class="grow"><b>${esc(a.ueb.name)}</b><div class="muted small">${a.alt ? `${a.alt.name} → ` : ''}<b style="color:${a.rang.farbe}">${a.rang.name}</b></div></div></div>`).join('')}
    ${r.prs.map((p) => `<div class="pr-item"><span class="trophy">🏆</span><div class="grow"><b>${esc(p.name)}</b><div class="muted small">Rekord am ${fmtDatum(p.datum, { day: 'numeric', month: 'short' })}: ${fmt(p.e1rm)} kg geschätztes Maximum</div></div></div>`).join('')}
    ${topId ? `<div class="pr-item"><span class="trophy">⭐</span><div class="grow"><b>${esc(findUeb(topId[0], { name: 'Übung' }).name)}</b><div class="muted small">Häufigste Übung · ${topId[1]} Sätze</div></div></div>` : ''}

    <div class="section-title">${esc(S.petName)}</div>
    <div class="card pet-card">
      <div class="pet-stage">${maskottchenSvg(mEnde, 104)}</div>
      <div class="grow">
        <div><b>${kraftPlus >= 0 ? '+' : ''}${fmt(kraftPlus, 0)} Kraft</b> ${rbArt === 'woche' ? 'diese Woche' : 'diesen Monat'}</div>
        <div class="muted small">Stufe: ${mEnde.stufe.name}${mEnde.stufeIndex > mStart.stufeIndex ? ` · aufgestiegen von ${mStart.stufe.name} 🎉` : ''}</div>
        <div class="muted small">Energie am Ende: ${mEnde.energie}</div>
      </div>
    </div>`;
}

function seiteUebungen() {
  const liste = alleUebungen()
    .filter((u) => !filterMuskel || u.muskel === filterMuskel)
    .filter((u) => !sucheText || u.name.toLowerCase().includes(sucheText.toLowerCase()))
    .sort((a, b) => (stats.proUeb[b.id]?.einheiten.length || 0) - (stats.proUeb[a.id]?.einheiten.length || 0) || a.name.localeCompare(b.name, 'de'));

  $app.innerHTML = `
    <div class="page-head"><h1>Übungen</h1><button class="icon-btn" data-a="eigene-uebung" aria-label="Eigene Übung">+</button></div>
    <input class="search" placeholder="Übung suchen …" value="${esc(sucheText)}" data-f="suche">
    <div class="pills">
      <button class="pill ${!filterMuskel ? 'on' : ''}" data-a="filter" data-m="">Alle</button>
      ${MUSKELN.map((m) => `<button class="pill ${filterMuskel === m ? 'on' : ''}" data-a="filter" data-m="${m}">${m}</button>`).join('')}
    </div>
    <div id="ueb-liste">${liste.map((u) => {
      const p = stats.proUeb[u.id];
      return `<button class="list-item" data-a="uebung" data-id="${u.id}">
        ${u.std ? rangBadge(rangVon(u.id), 34) : '<div style="width:34px"></div>'}
        <div class="grow"><div class="ellipsis"><b>${esc(u.name)}</b></div>
        <div class="muted small">${u.muskel}${p ? ` · ${p.einheiten.length}× · ${u.typ === 'zeit' ? `${p.bestZeit} s` : `Best ${bestSatzText(u, p)}`}` : ''}</div></div>
        <span class="chev">›</span></button>`;
    }).join('') || '<div class="empty">Nichts gefunden.</div>'}</div>`;
}

// ---------- Ränge ------------------------------------------
function gesamtRang() {
  const raenge = alleUebungen().map((u) => rangVon(u.id)).filter(Boolean);
  const schnitt = raenge.length ? Math.round(raenge.reduce((a, r) => a + r.index, 0) / raenge.length) : null;
  return { gesamt: schnitt != null ? { index: schnitt, ...RAENGE[schnitt] } : null, anzahl: raenge.length };
}

/** Pro Muskel der beste Rang aus allen Übungen, die diesen Muskel als Hauptmuskel trainieren */
function muskelRaenge() {
  const res = {};
  for (const m of MUSKELN) {
    const liste = alleUebungen().filter((u) => u.muskel === m && u.std)
      .map((u) => ({ u, r: rangVon(u.id) })).filter((x) => x.r)
      .sort((a, b) => b.r.anteil - a.r.anteil);
    res[m] = { beste: liste[0] || null, liste };
  }
  return res;
}

function seiteRang() {
  const { gesamt, anzahl } = gesamtRang();
  const mr = muskelRaenge();
  const werte = {}, farben = {}, info = {};
  for (const m of MUSKELN) {
    const b = mr[m].beste;
    if (b) { werte[m] = 1; farben[m] = b.r.farbe; }
    info[m] = b ? { rang: b.r.name, farbe: b.r.farbe, ueb: b.u.name } : null;
  }
  const erreicht = new Set(Object.values(mr).filter((x) => x.beste).map((x) => x.beste.r.index));
  const alle = alleUebungen().filter((u) => u.std).map((u) => ({ u, r: rangVon(u.id) })).filter((x) => x.r).sort((a, b) => b.r.anteil - a.r.anteil);

  $app.innerHTML = `
    <div class="page-head"><h1>Ränge</h1></div>
    ${!S.gewicht ? `<div class="card" style="text-align:center"><p style="margin:0 0 12px">Trag im Profil dein Körpergewicht ein, damit deine Ränge berechnet werden können.</p><button class="btn btn-primary" data-a="zum-profil">Zum Profil</button></div>` : ''}
    <div class="card rank-hero">
      ${rangBadge(gesamt, 76)}
      <div class="rank-name" style="${gesamt ? `color:${gesamt.farbe}` : ''}">${gesamt ? gesamt.name : 'Noch kein Rang'}</div>
      <div class="muted small">${anzahl ? `Gesamtrang aus ${anzahl} ${anzahl === 1 ? 'Übung' : 'Übungen'}` : 'Trainiere Übungen mit Rang, z. B. Bankdrücken oder Kniebeugen.'}</div>
    </div>

    <div class="section-title">Muskelkarte</div>
    <div class="card">
      <div class="mk-wrap" data-rang='${esc(JSON.stringify(info))}'>${muskelkarteSvg(werte, farben)}</div>
      <p class="muted small mk-info">Jeder Muskel leuchtet in der Farbe seines besten Rangs. Tippe auf einen Muskel.</p>
      <div class="rang-legende">${RAENGE.map((r, i) => `<span class="${erreicht.has(i) ? 'an' : ''}"><i style="background:${r.farbe}"></i>${r.name}</span>`).join('')}</div>
    </div>

    <div class="section-title">Nach Muskeln</div>
    ${MUSKELN.map((m) => {
      const b = mr[m].beste;
      if (!b) return `<div class="list-item rang-zeile leer">${rangBadge(null, 40)}<div class="grow"><b>${m}</b><div class="muted small">Noch kein Rang</div></div></div>`;
      return `<button class="list-item rang-zeile" data-a="uebung" data-id="${b.u.id}">
        ${rangBadge(b.r, 40)}
        <div class="grow" style="min-width:0"><div class="row" style="gap:6px"><b>${m}</b><span class="rang-name" style="color:${b.r.farbe}">${b.r.name}</span></div>
          <div class="muted small ellipsis">${esc(b.u.name)}${mr[m].liste.length > 1 ? ` · ${mr[m].liste.length} Übungen` : ''}</div>
          <div class="rank-prog" style="margin:6px 0 0;height:6px"><i style="width:${Math.round(b.r.fortschritt * 100)}%;background:${b.r.naechster?.farbe || b.r.farbe}"></i></div>
          <div class="muted small" style="margin-top:3px">${b.r.naechster ? `nächster Rang: <b style="color:${b.r.naechster.farbe}">${b.r.naechster.name}</b>` : 'Höchster Rang 👑'}</div></div>
        <span class="chev">›</span></button>`;
    }).join('')}

    ${alle.length ? `<div class="section-title">Alle Übungen mit Rang</div>
    ${alle.map((x) => `<button class="list-item" data-a="uebung" data-id="${x.u.id}">${rangBadge(x.r, 34)}<div class="grow" style="min-width:0"><div class="ellipsis"><b>${esc(x.u.name)}</b></div><div class="muted small">${x.u.muskel} · <span style="color:${x.r.farbe};font-weight:700">${x.r.name}</span></div></div><span class="chev">›</span></button>`).join('')}` : ''}
  `;
}

function seiteProfil() {
  const raenge = alleUebungen().map((u) => rangVon(u.id)).filter(Boolean);
  const schnitt = raenge.length ? Math.round(raenge.reduce((a, r) => a + r.index, 0) / raenge.length) : null;
  const gesamt = schnitt != null ? { index: schnitt, ...RAENGE[schnitt] } : null;
  const lv = levelAusXp(stats.xp);

  $app.innerHTML = `
    <div class="page-head"><h1>Profil</h1></div>
    <div class="card rank-hero">
      ${rangBadge(gesamt, 76)}
      <div class="rank-name">${gesamt ? gesamt.name : 'Noch kein Rang'}</div>
      <div class="muted small">Gesamtrang aus ${raenge.length} Übungen · Level ${lv.level}</div>
    </div>

    <div class="section-title">Einstellungen</div>
    <form class="card" id="profil-form">
      <label class="field"><span>Name</span><input name="name" value="${esc(S.name)}" placeholder="Wie soll ich dich nennen?"></label>
      <label class="field"><span>Körpergewicht (kg) – wichtig für Ränge</span><input name="gewicht" inputmode="decimal" value="${S.gewicht ?? ''}" placeholder="z. B. 75"></label>
      <div class="field"><span>Geschlecht (für Rang-Standards)</span>
        <div class="seg" data-seg="geschlecht"><button type="button" data-v="m" class="${S.geschlecht === 'm' ? 'on' : ''}">Männlich</button><button type="button" data-v="w" class="${S.geschlecht === 'w' ? 'on' : ''}">Weiblich</button></div></div>
      <label class="field"><span>Wochenziel (Trainings pro Woche)</span>
        <select name="wochenziel">${[1, 2, 3, 4, 5, 6, 7].map((n) => `<option ${n === S.wochenziel ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="field"><span>Standard-Pause</span>
        <select name="pause">${[45, 60, 90, 120, 150, 180, 240].map((n) => `<option value="${n}" ${n === S.pause ? 'selected' : ''}>${fmtDauer(n * 1000)} min</option>`).join('')}</select></label>
      <label class="field"><span>Name deines Maskottchens</span><input name="petName" value="${esc(S.petName)}" maxlength="20"></label>
      <button class="btn btn-primary btn-block" type="submit">Speichern</button>
    </form>

    <div class="section-title">Mitteilungen</div>
    <div class="card" id="push-karte"><div class="muted small">Wird geladen …</div></div>

    <div class="section-title">Konto</div>
    <a class="list-item" href="../kalorien/" style="text-decoration:none;color:inherit"><span class="grow">🥗 Zum Kalorien-Tracker</span><span class="chev">›</span></a>
    <a class="list-item" href="../" style="text-decoration:none;color:inherit"><span class="grow">← Alle Apps</span></a>
    <button class="list-item" data-a="logout" style="color:var(--danger)"><span class="grow">Abmelden</span></button>
  `;
  let geschlecht = S.geschlecht;
  $app.querySelectorAll('[data-seg] button').forEach((b) => b.onclick = () => {
    geschlecht = b.dataset.v;
    $app.querySelectorAll('[data-seg] button').forEach((x) => x.classList.toggle('on', x === b));
  });
  $app.querySelector('#profil-form').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const patch = {
      name: f.get('name').trim(), gewicht: zahl(f.get('gewicht')), geschlecht,
      gym_wochenziel: +f.get('wochenziel'), gym_pause: +f.get('pause'),
      gym_maskottchen_name: f.get('petName').trim() || 'Pumpi',
    };
    try {
      await core.updateSettings(patch);
      Object.assign(S, { name: patch.name, gewicht: patch.gewicht, geschlecht, wochenziel: patch.gym_wochenziel, pause: patch.gym_pause, petName: patch.gym_maskottchen_name });
      berechne(); toast('Gespeichert ✓'); render();
    } catch { toast('Speichern fehlgeschlagen', true); }
  };
  zeichnePushKarte();
}

// ---------- Mitteilungen (Push) ------------------------------
const istIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const alsAppGestartet = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

async function swRegistrierung() {
  if (!('serviceWorker' in navigator)) return null;
  try { return await navigator.serviceWorker.register('sw.js'); } catch { return null; }
}

async function aktuellesAbo() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

async function zeichnePushKarte() {
  const el = document.getElementById('push-karte'); if (!el) return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    el.innerHTML = istIOS && !alsAppGestartet
      ? `<p style="margin:0">📱 Auf dem iPhone gehen Mitteilungen nur, wenn die App auf dem Home-Bildschirm liegt: in Safari auf <b>Teilen</b> → <b>Zum Home-Bildschirm</b>, dann die App von dort öffnen.</p>`
      : `<p class="muted" style="margin:0">Dieser Browser unterstützt keine Mitteilungen.</p>`;
    return;
  }
  const abo = await aktuellesAbo();
  if (!abo || Notification.permission !== 'granted') {
    el.innerHTML = `<p style="margin:0 0 12px">Lass dich erinnern, wenn ${esc(S.petName)} Hunger hat, dein Streak in Gefahr ist oder dein Wochenrückblick da ist.</p>
      ${Notification.permission === 'denied' ? `<p class="muted small">Mitteilungen sind in deinen Browser-Einstellungen blockiert. Erlaube sie dort für diese Seite.</p>` : ''}
      <button class="btn btn-primary btn-block" data-a="push-an">🔔 Mitteilungen aktivieren</button>`;
    return;
  }
  el.innerHTML = `
    <div class="row" style="margin-bottom:12px"><span class="grow">🔔 Mitteilungen sind <b style="color:var(--ok)">aktiv</b></span></div>
    <label class="field"><span>Uhrzeit für Erinnerungen</span>
      <select data-push="gym_push_stunde">${Array.from({ length: 17 }, (_, i) => i + 6).map((h) => `<option value="${h}" ${h === S.pushStunde ? 'selected' : ''}>${h}:00 Uhr</option>`).join('')}</select></label>
    <label class="field"><span>${esc(S.petName)} meldet sich nach</span>
      <select data-push="gym_push_tage">${[1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${n === S.pushTage ? 'selected' : ''}>${n} ${n === 1 ? 'Tag' : 'Tagen'} ohne Training</option>`).join('')}</select></label>
    <label class="check-row"><input type="checkbox" data-push="gym_push_rueckblick" ${S.pushRueckblick ? 'checked' : ''}> Wochenrückblick am Sonntag</label>
    <div class="sheet-actions">
      <button class="btn" data-a="push-test">Test senden</button>
      <button class="btn btn-danger" data-a="push-aus">Ausschalten</button>
    </div>`;
  el.querySelectorAll('[data-push]').forEach((inp) => inp.onchange = async () => {
    const k = inp.dataset.push;
    const v = inp.type === 'checkbox' ? inp.checked : Number(inp.value);
    try {
      await core.updateSettings({ [k]: v, gym_push_aus: false });
      if (k === 'gym_push_stunde') S.pushStunde = v;
      if (k === 'gym_push_tage') S.pushTage = v;
      if (k === 'gym_push_rueckblick') S.pushRueckblick = v;
      toast('Gespeichert ✓');
    } catch { toast('Speichern fehlgeschlagen', true); }
  });
}

function base64zuBytes(b64) {
  const s = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function pushAn(btn) {
  btn.disabled = true; btn.textContent = '…';
  try {
    const erlaubt = await Notification.requestPermission();
    if (erlaubt !== 'granted') throw new Error('Mitteilungen wurden nicht erlaubt.');
    await swRegistrierung();
    const reg = await navigator.serviceWorker.ready;
    const r = await fetch(PUSH_URL + '?modus=key', { headers: { apikey: core.SUPABASE_KEY } }).catch(() => null);
    if (!r?.ok) throw new Error('Die Mitteilungs-Funktion in Supabase ist noch nicht eingerichtet.');
    const { publicKey } = await r.json();
    let abo = await reg.pushManager.getSubscription();
    if (abo) {
      const alt = abo.options?.applicationServerKey;
      const passt = alt && btoa(String.fromCharCode(...new Uint8Array(alt))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') === publicKey.replace(/=+$/, '');
      if (!passt) { await abo.unsubscribe(); abo = null; }
    }
    abo = abo || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64zuBytes(publicKey) });
    await pushShared.speichern(abo, 'gym');
    await core.updateSettings({ gym_push_aus: false });
    toast('Mitteilungen aktiviert 🔔');
  } catch (err) {
    toast(err.message || 'Aktivieren fehlgeschlagen', true);
  }
  zeichnePushKarte();
}

async function pushAus() {
  try {
    const abo = await aktuellesAbo();
    if (abo) {
      await core.sb.from('push_subscriptions').delete().eq('endpoint', abo.endpoint);
      await abo.unsubscribe();
    }
    toast('Mitteilungen ausgeschaltet');
  } catch { toast('Ausschalten fehlgeschlagen', true); }
  zeichnePushKarte();
}

async function pushTest(btn) {
  btn.disabled = true;
  try {
    const { data } = await core.sb.auth.getSession();
    const r = await fetch(PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: core.SUPABASE_KEY, Authorization: `Bearer ${data.session?.access_token}` },
      body: JSON.stringify({ modus: 'test', app: 'gym' }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.fehler || 'Funktion nicht erreichbar');
    toast(j.gesendet ? 'Test gesendet – kommt gleich an 📬' : 'Kein Gerät gefunden – aktiviere die Mitteilungen neu.', !j.gesendet);
  } catch (err) { toast(err.message, true); }
  btn.disabled = false;
}

// ---------- Detail-Ansichten ---------------------------------
function chartSvg(punkte, einheit = 'kg') {
  if (punkte.length < 2) return `<p class="muted small" style="text-align:center;padding:20px 0">Ab zwei Einheiten siehst du hier deinen Verlauf.</p>`;
  const W = 340, H = 150, pl = 34, pr = 10, pt = 12, pb = 22;
  const ys = punkte.map((p) => p.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (max - min < 1) { min -= 1; max += 1; }
  const pad = (max - min) * 0.15; min -= pad; max += pad;
  const x = (i) => pl + (i / (punkte.length - 1)) * (W - pl - pr);
  const y = (v) => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
  const pfad = punkte.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
  const flaeche = `${pfad} L${x(punkte.length - 1)},${H - pb} L${pl},${H - pb} Z`;
  const ticks = [0, 0.5, 1].map((f) => min + f * (max - min));
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">
    <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A48BFF" stop-opacity=".35"/><stop offset="1" stop-color="#A48BFF" stop-opacity="0"/></linearGradient></defs>
    ${ticks.map((v) => `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}"/><text class="lbl" x="${pl - 6}" y="${y(v) + 3}" text-anchor="end">${fmt(v, max - min < 6 ? 1 : 0)}</text>`).join('')}
    <path class="area" d="${flaeche}"/><path class="line" d="${pfad}"/>
    ${punkte.map((p, i) => `<circle class="dot" cx="${x(i)}" cy="${y(p.y)}" r="3.5"/>`).join('')}
    <text class="lbl" x="${pl}" y="${H - 6}">${fmtDatum(punkte[0].x, { day: 'numeric', month: 'short' })}</text>
    <text class="lbl" x="${W - pr}" y="${H - 6}" text-anchor="end">${fmtDatum(punkte.at(-1).x, { day: 'numeric', month: 'short' })}</text>
    <text class="lbl" x="${pl}" y="9">${einheit}</text>
  </svg>`;
}

function satzText(ueb, s) {
  if (ueb.typ === 'zeit') return `${s.wdh} s`;
  if (ueb.typ === 'koerper') return s.kg ? `+${fmt(s.kg)} kg × ${s.wdh}` : `${s.wdh} Wdh.`;
  return `${fmt(s.kg)} kg × ${s.wdh}`;
}

function zeigeUebung(id) {
  const ueb = findUeb(id);
  const p = stats.proUeb[id];
  const rang = rangVon(id);
  let rangHtml = '';
  if (ueb.std) {
    if (!S.gewicht) rangHtml = `<div class="card" style="text-align:center"><p class="muted">Trag im Profil dein Körpergewicht ein, um Ränge freizuschalten.</p></div>`;
    else if (!rang) rangHtml = `<div class="card rank-hero">${rangBadge(null, 72)}<div class="rank-name">Noch kein Rang</div><p class="muted small">Absolviere einen Satz, um deinen Rang zu erfahren.</p></div>`;
    else {
      const fehlt = rang.ziel1rm ? rang.ziel1rm - p.best1rm : 0;
      rangHtml = `<div class="card rank-hero">
        ${rangBadge(rang, 76)}
        <div class="rank-name" style="color:${rang.farbe}">${rang.name}</div>
        <div class="rank-prog"><i style="width:${Math.round(rang.fortschritt * 100)}%;background:${rang.naechster?.farbe || rang.farbe}"></i></div>
        <div class="muted small">${rang.naechster ? `Noch ${fmt(Math.max(0, fehlt))} kg geschätztes Maximum bis <b style="color:${rang.naechster.farbe}">${rang.naechster.name}</b>` : 'Höchster Rang erreicht 👑'}</div>
      </div>`;
    }
  }
  const einheiten = p?.einheiten || [];
  const nachWdh = ueb.typ === 'koerper';
  const punkte = einheiten.slice(-20).map((e) => ({ x: e.datum, y: ueb.typ === 'zeit' ? e.zeit : nachWdh ? e.bestWdh : e.bestKg }));
  const close = sheet(`
    <h2>${esc(ueb.name)}</h2>
    <p class="muted small" style="margin:-8px 0 14px">${ueb.muskel}${ueb.neben?.length ? ' · ' + ueb.neben.join(', ') : ''}</p>
    ${rangHtml}
    <div class="stats3" style="margin-top:10px">
      ${ueb.typ === 'zeit'
        ? `<div class="stat"><b class="num">${p ? p.bestZeit + ' s' : '–'}</b><span>Beste Zeit</span></div>`
        : `<div class="stat"><b class="num">${p ? bestSatzText(ueb, p) : '–'}</b><span>Bestleistung</span></div>
           <div class="stat"><b class="num">${einheiten.length ? bestSatzText(ueb, einheiten.at(-1)) : '–'}</b><span>Zuletzt</span></div>`}
      <div class="stat"><b class="num">${einheiten.length}</b><span>Einheiten</span></div>
    </div>
    <div class="section-title">${ueb.typ === 'zeit' ? 'Beste Zeit' : nachWdh ? 'Bestleistung (Wdh.) pro Training' : 'Schwerster Satz pro Training'}</div>
    <div class="card">${chartSvg(punkte, ueb.typ === 'zeit' ? 's' : nachWdh ? 'Wdh' : 'kg')}</div>
    <div class="section-title">Letzte Einheiten</div>
    ${einheiten.length ? [...einheiten].reverse().slice(0, 10).map((e) => `
      <div class="card"><div class="muted small" style="margin-bottom:4px">${fmtDatum(e.datum)}</div>
      ${e.saetze.map((s) => `<div class="num">${s.warm ? '<span class="muted">W</span> ' : ''}${satzText(ueb, s)}</div>`).join('')}</div>`).join('')
      : '<div class="empty">Noch nicht trainiert.</div>'}
    ${ueb.id.startsWith('eigen-') ? `<div class="sheet-actions"><button class="btn btn-danger" data-a="del">Übung löschen</button></div>` : ''}
  `, (el, cl) => {
    el.querySelector('[data-a="del"]')?.addEventListener('click', async () => {
      if (!(await bestaetigen('Übung löschen?', 'Vergangene Trainings bleiben erhalten.', 'Löschen'))) return;
      eigene = eigene.filter((u) => u.id !== id); await speichereEigene(); cl(); render();
    });
  });
  return close;
}

function zeigeTraining(id) {
  const t = trainings.find((x) => x.id === id);
  if (!t) return;
  const d = t.data || {};
  sheet(`
    <h2>${esc(t.title || 'Training')}</h2>
    <p class="muted small" style="margin:-8px 0 14px">${fmtDatum(t.starts_at, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${new Date(t.starts_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
    <div class="stats3">
      <div class="stat"><b class="num">${d.dauer_min ?? '–'} min</b><span>Dauer</span></div>
      <div class="stat"><b class="num">${fmt((d.volumen || 0) / 1000, 2)} t</b><span>Volumen</span></div>
      <div class="stat"><b class="num">+${d.xp || 0}</b><span>XP</span></div>
    </div>
    ${(d.prs || []).map((p) => `<div class="pr-item"><span class="trophy">🏆</span><div class="grow"><b>${esc(p.name)}</b><div class="muted small">Neuer Rekord: ${fmt(p.e1rm)} kg geschätztes Maximum</div></div></div>`).join('')}
    ${(d.uebungen || []).map((ex) => {
      const ueb = findUeb(ex.id, ex);
      return `<div class="card" style="margin-top:10px"><b>${esc(ueb.name)}</b>
        ${ex.notiz ? `<div class="muted small">${esc(ex.notiz)}</div>` : ''}
        ${ex.saetze.map((s, i) => `<div class="num small" style="margin-top:4px"><span class="muted">${s.warm ? 'W' : i + 1}</span>&nbsp;&nbsp;${satzText(ueb, s)}</div>`).join('')}</div>`;
    }).join('')}
    <div class="sheet-actions">
      <button class="btn" data-a="als-routine">Als Routine speichern</button>
      <button class="btn btn-danger" data-a="del">Löschen</button>
    </div>
  `, (el, cl) => {
    el.querySelector('[data-a="del"]').onclick = async () => {
      if (!(await bestaetigen('Training löschen?', 'Das kann nicht rückgängig gemacht werden.', 'Löschen'))) return;
      try { await core.deleteEvent(t.id); trainings = trainings.filter((x) => x.id !== t.id); berechne(); cl(); render(); toast('Gelöscht'); }
      catch { toast('Löschen fehlgeschlagen', true); }
    };
    el.querySelector('[data-a="als-routine"]').onclick = () => { cl(); alsRoutineSpeichern(t.title, d.uebungen); };
  });
}

async function alsRoutineSpeichern(name, uebungen) {
  const r = { id: uid(), name: name || 'Neue Routine', uebungen: (uebungen || []).map((ex) => ({ id: ex.id, name: ex.name, saetze: ex.saetze.filter((s) => !s.warm).length || 3 })) };
  routinen.push(r); await speichereRoutinen(); toast('Routine gespeichert ✓'); render();
}

// ---------- Übungs-Auswahl -----------------------------------
function waehleUebungen(onFertig, { mehrfach = true } = {}) {
  const gewaehlt = new Set();
  let muskel = null, q = '';
  sheet(`<h2>Übung hinzufügen</h2>
    <input class="search" placeholder="Suchen …" data-q>
    <div class="pills" data-pills></div>
    <div data-list></div>
    <button class="btn btn-ghost btn-block" data-a="eigene" style="margin-top:10px">+ Eigene Übung erstellen</button>
    <div class="pick-foot"><button class="btn btn-primary btn-block" data-a="ok" disabled>Hinzufügen</button></div>`,
  (el, cl) => {
    const zeichne = () => {
      el.querySelector('[data-pills]').innerHTML = `<button class="pill ${!muskel ? 'on' : ''}" data-m="">Alle</button>` + MUSKELN.map((m) => `<button class="pill ${muskel === m ? 'on' : ''}" data-m="${m}">${m}</button>`).join('');
      const liste = alleUebungen().filter((u) => (!muskel || u.muskel === muskel) && (!q || u.name.toLowerCase().includes(q.toLowerCase())))
        .sort((a, b) => (stats.proUeb[b.id]?.einheiten.length || 0) - (stats.proUeb[a.id]?.einheiten.length || 0) || a.name.localeCompare(b.name, 'de'));
      el.querySelector('[data-list]').innerHTML = liste.map((u) => `<button class="pick-item ${gewaehlt.has(u.id) ? 'sel' : ''}" data-id="${u.id}">
        <span class="check">${gewaehlt.has(u.id) ? '✓' : ''}</span><span class="grow"><b>${esc(u.name)}</b><br><span class="muted small">${u.muskel}</span></span></button>`).join('') || '<p class="muted">Nichts gefunden.</p>';
      const ok = el.querySelector('[data-a="ok"]');
      ok.disabled = !gewaehlt.size; ok.textContent = gewaehlt.size ? `Hinzufügen (${gewaehlt.size})` : 'Hinzufügen';
    };
    el.querySelector('[data-q]').oninput = (e) => { q = e.target.value; zeichne(); };
    el.addEventListener('click', (e) => {
      const pill = e.target.closest('[data-m]');
      if (pill) { muskel = pill.dataset.m || null; zeichne(); return; }
      const it = e.target.closest('.pick-item');
      if (it) {
        const id = it.dataset.id;
        if (!mehrfach) { cl(); onFertig([id]); return; }
        gewaehlt.has(id) ? gewaehlt.delete(id) : gewaehlt.add(id); zeichne(); return;
      }
      if (e.target.closest('[data-a="ok"]')) { cl(); onFertig([...gewaehlt]); }
      if (e.target.closest('[data-a="eigene"]')) eigeneUebungErstellen((u) => { gewaehlt.add(u.id); zeichne(); });
    });
    zeichne();
  });
}

function eigeneUebungErstellen(nachher) {
  let typ = 'gewicht';
  sheet(`<h2>Eigene Übung</h2>
    <label class="field"><span>Name</span><input data-n placeholder="z. B. Kabelzug Pullover"></label>
    <label class="field"><span>Hauptmuskel</span><select data-m>${MUSKELN.map((m) => `<option>${m}</option>`).join('')}</select></label>
    <div class="field"><span>Art</span><div class="seg"><button type="button" data-t="gewicht" class="on">Gewicht</button><button type="button" data-t="koerper">Körpergewicht</button><button type="button" data-t="zeit">Zeit</button></div></div>
    <div class="sheet-actions"><button class="btn" data-a="x">Abbrechen</button><button class="btn btn-primary" data-a="ok">Erstellen</button></div>`,
  (el, cl) => {
    el.querySelectorAll('[data-t]').forEach((b) => b.onclick = () => { typ = b.dataset.t; el.querySelectorAll('[data-t]').forEach((x) => x.classList.toggle('on', x === b)); });
    el.querySelector('[data-a="x"]').onclick = cl;
    el.querySelector('[data-a="ok"]').onclick = async () => {
      const name = el.querySelector('[data-n]').value.trim();
      if (!name) { toast('Gib einen Namen ein', true); return; }
      const u = { id: 'eigen-' + uid(), name, muskel: el.querySelector('[data-m]').value, neben: [], typ, std: null };
      eigene.push(u); await speichereEigene(); cl(); nachher?.(u);
      if (tab === 'uebungen' && !aktiv) render();
    };
    setTimeout(() => el.querySelector('[data-n]').focus(), 100);
  });
}

// ---------- Routinen -----------------------------------------
function routineBearbeiten(id) {
  const vorhanden = routinen.find((r) => r.id === id);
  const r = vorhanden ? structuredClone(vorhanden) : { id: uid(), name: '', uebungen: [] };
  sheet(`<h2>${vorhanden ? 'Routine bearbeiten' : 'Neue Routine'}</h2>
    <label class="field"><span>Name</span><input data-n value="${esc(r.name)}" placeholder="z. B. Push, Pull, Beine"></label>
    <div data-list></div>
    <button class="btn btn-block" data-a="add" style="margin-top:10px">+ Übung hinzufügen</button>
    <div class="sheet-actions">
      ${vorhanden ? '<button class="btn btn-danger" data-a="del">Löschen</button>' : ''}
      <button class="btn btn-primary" data-a="ok">Speichern</button></div>`,
  (el, cl) => {
    const zeichne = () => {
      el.querySelector('[data-list]').innerHTML = r.uebungen.map((u, i) => `
        <div class="card row" style="padding:10px 12px">
          <div class="grow ellipsis"><b>${esc(findUeb(u.id, u)?.name)}</b></div>
          <button class="icon-btn" data-a="minus" data-i="${i}">−</button>
          <span class="num" style="min-width:52px;text-align:center">${u.saetze} Sätze</span>
          <button class="icon-btn" data-a="plus" data-i="${i}">+</button>
          <button class="icon-btn" data-a="weg" data-i="${i}" style="color:var(--danger)">×</button>
        </div>`).join('') || '<div class="empty">Noch keine Übungen.</div>';
    };
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const i = +b.dataset.i;
      if (b.dataset.a === 'minus') { r.uebungen[i].saetze = Math.max(1, r.uebungen[i].saetze - 1); zeichne(); }
      if (b.dataset.a === 'plus') { r.uebungen[i].saetze = Math.min(12, r.uebungen[i].saetze + 1); zeichne(); }
      if (b.dataset.a === 'weg') { r.uebungen.splice(i, 1); zeichne(); }
      if (b.dataset.a === 'add') waehleUebungen((ids) => { ids.forEach((x) => r.uebungen.push({ id: x, name: findUeb(x).name, saetze: 3 })); zeichne(); });
      if (b.dataset.a === 'del') {
        if (!(await bestaetigen('Routine löschen?', `„${r.name}“ wird gelöscht.`, 'Löschen'))) return;
        routinen = routinen.filter((x) => x.id !== r.id); await speichereRoutinen(); cl(); render();
      }
      if (b.dataset.a === 'ok') {
        r.name = el.querySelector('[data-n]').value.trim() || 'Routine';
        if (vorhanden) routinen = routinen.map((x) => (x.id === r.id ? r : x)); else routinen.push(r);
        await speichereRoutinen(); cl(); render(); toast('Routine gespeichert ✓');
      }
    });
    zeichne();
  });
}

// ---------- Aktives Training ---------------------------------
const neuerSatz = () => ({ kg: '', wdh: '', done: false, warm: false });

async function starteTraining(routine) {
  if (aktiv) {
    if (!routine) { minimiert = false; renderTraining(); return; }
    if (!(await bestaetigen('Laufendes Training verwerfen?', 'Du hast schon ein Training gestartet.', 'Verwerfen'))) { minimiert = false; renderTraining(); return; }
  }
  aktiv = {
    titel: routine?.name || (new Date().getHours() < 12 ? 'Morgentraining' : new Date().getHours() < 18 ? 'Mittagstraining' : 'Abendtraining'),
    start: Date.now(), routineId: routine?.id || null,
    uebungen: (routine?.uebungen || []).map((u) => uebungEintrag(u.id, u.saetze)),
  };
  minimiert = false; sichern(); renderTraining();
}

function uebungEintrag(id, n = 3) {
  const ueb = findUeb(id);
  return { key: uid(), id, name: ueb.name, muskel: ueb.muskel, typ: ueb.typ, notiz: '', zeigNotiz: false,
    saetze: Array.from({ length: Math.max(n, 1) }, neuerSatz) };
}

const sichern = () => store.set('gym-aktiv', aktiv);

function prevFuer(ex, i) {
  const prev = letzteSaetze(ex.id).filter((s) => !s.warm);
  // normale Sätze zählen ohne Aufwärmsätze
  const nr = ex.saetze.slice(0, i + 1).filter((s) => !s.warm).length - 1;
  if (ex.saetze[i].warm) return null;
  return prev[nr] || null;
}

function satzZeile(ex, s, i) {
  const ueb = findUeb(ex.id, ex);
  const p = prevFuer(ex, i);
  const nr = ex.saetze.slice(0, i + 1).filter((x) => !x.warm).length;
  const kgFeld = ueb.typ === 'zeit'
    ? '<span class="muted" style="text-align:center">–</span>'
    : `<input inputmode="decimal" data-f="kg" value="${s.kg}" placeholder="${p ? fmt(p.kg) : (ueb.typ === 'koerper' ? '0' : 'kg')}">`;
  return `<div class="set ${s.done ? 'done' : ''}" data-i="${i}">
    <button class="nr ${s.warm ? 'warm' : ''}" data-a="satz-menu">${s.warm ? 'W' : nr}</button>
    ${p ? `<button class="prev" data-a="prev-uebernehmen" aria-label="Werte vom letzten Mal übernehmen">${satzText(ueb, p)}</button>` : '<span class="prev">–</span>'}
    ${kgFeld}
    <input inputmode="numeric" data-f="wdh" value="${s.wdh}" placeholder="${p ? p.wdh : (ueb.typ === 'zeit' ? 's' : 'Wdh')}">
    <button class="chk" data-a="check" aria-label="Satz abhaken">${ICON.check}</button>
  </div>`;
}

function uebungKarte(ex) {
  const ueb = findUeb(ex.id, ex);
  const kgKopf = ueb.typ === 'koerper' ? '+kg' : ueb.typ === 'zeit' ? '' : 'kg';
  return `<div class="ex-card" data-ex="${ex.key}">
    <div class="ex-head"><h3 class="grow ellipsis" data-a="ex-info">${esc(ueb.name)}</h3>
      <button class="icon-btn" data-a="ex-menu" aria-label="Optionen">⋯</button></div>
    ${letztesMalHtml(ex, ueb)}
    ${ex.zeigNotiz || ex.notiz ? `<textarea class="ex-note" rows="1" data-f="notiz" placeholder="Notiz …">${esc(ex.notiz)}</textarea>` : ''}
    <div class="sets-head"><span>Satz</span><span>Vorher</span><span>${kgKopf}</span><span>${ueb.typ === 'zeit' ? 'Sek' : 'Wdh'}</span><span></span></div>
    <div data-saetze>${ex.saetze.map((s, i) => satzZeile(ex, s, i)).join('')}</div>
    <button class="add-set" data-a="satz-plus">+ Satz hinzufügen</button>
  </div>`;
}

function letztesMalHtml(ex, ueb) {
  const l = letzteEinheit(ex.id);
  if (!l) return `<div class="last-time neu">Erstes Mal – noch keine Werte vom letzten Training</div>`;
  const tage = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(l.datum).setHours(0, 0, 0, 0)) / 864e5);
  const wann = tage <= 0 ? 'heute' : tage === 1 ? 'gestern' : tage < 7 ? `vor ${tage} Tagen` : fmtDatum(l.datum);
  const arbeit = l.saetze.filter((s) => !s.warm);
  const zeig = arbeit.length ? arbeit : l.saetze;
  return `<div class="last-time"><div class="lt-kopf">Letztes Mal · ${wann}</div>
    <div class="lt-saetze">${zeig.map((s) => `<span>${satzText(ueb, s)}</span>`).join('')}</div></div>`;
}

let $w = null, uhrTimer = null;

function renderTraining() {
  if (!aktiv) { $w?.remove(); $w = null; renderMini(); return; }
  if (minimiert) { $w?.remove(); $w = null; renderMini(); return; }
  document.querySelector('.mini')?.remove();
  if (!$w) {
    $w = document.createElement('div');
    $w.className = 'workout';
    document.body.appendChild($w);
    $w.addEventListener('input', trainingInput);
    $w.addEventListener('click', trainingKlick);
    document.body.style.overflow = 'hidden';
  }
  const scroll = $w.scrollTop;
  $w.innerHTML = `<div class="workout-inner">
    <div class="w-head">
      <button class="icon-btn" data-a="minimieren" aria-label="Minimieren">⌄</button>
      <div class="w-title"><input data-f="titel" value="${esc(aktiv.titel)}"><div class="muted num" data-uhr>${fmtDauer(Date.now() - aktiv.start)}</div></div>
      <button class="btn btn-ok" data-a="fertig">Fertig</button>
    </div>
    ${aktiv.uebungen.map(uebungKarte).join('') || '<div class="empty" style="margin:20px 0">Füge deine erste Übung hinzu.</div>'}
    <button class="btn btn-block" data-a="ueb-plus" style="margin-top:6px;color:var(--accent2)">+ Übung hinzufügen</button>
    <button class="btn btn-danger btn-block" data-a="abbrechen" style="margin-top:10px">Training abbrechen</button>
  </div>`;
  $w.scrollTop = scroll;
  starteUhr();
  if (pause) zeichnePause();
}

function starteUhr() {
  clearInterval(uhrTimer);
  uhrTimer = setInterval(() => {
    if (!aktiv) { clearInterval(uhrTimer); return; }
    const t = fmtDauer(Date.now() - aktiv.start);
    document.querySelectorAll('[data-uhr]').forEach((el) => (el.textContent = t));
  }, 1000);
}

function renderMini() {
  document.querySelector('.mini')?.remove();
  document.body.style.overflow = aktiv && !minimiert ? 'hidden' : '';
  if (!aktiv || !minimiert) return;
  const b = document.createElement('button');
  b.className = 'mini';
  b.innerHTML = `<span class="dotlive"></span><span class="grow ellipsis" style="text-align:left">${esc(aktiv.titel)}</span><span class="mini-pause num" data-pause>${pause && pause.ende > Date.now() ? `⏱ ${fmtDauer(pause.ende - Date.now() + 999)}` : ''}</span><span class="num" data-uhr>${fmtDauer(Date.now() - aktiv.start)}</span>`;
  b.onclick = () => { minimiert = false; renderTraining(); };
  document.body.appendChild(b);
  starteUhr();
}

function exAus(el) { const k = el.closest('[data-ex]')?.dataset.ex; return aktiv.uebungen.find((e) => e.key === k); }

function trainingInput(e) {
  const f = e.target.dataset.f; if (!f) return;
  if (f === 'titel') { aktiv.titel = e.target.value; sichern(); return; }
  const ex = exAus(e.target); if (!ex) return;
  if (f === 'notiz') { ex.notiz = e.target.value; sichern(); return; }
  const i = +e.target.closest('[data-i]').dataset.i;
  ex.saetze[i][f] = e.target.value;
  sichern();
}

async function trainingKlick(e) {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a;
  if (a === 'minimieren') { minimiert = true; renderTraining(); return; }
  if (a === 'ueb-plus') { waehleUebungen((ids) => { ids.forEach((id) => aktiv.uebungen.push(uebungEintrag(id, 3))); sichern(); renderTraining(); setTimeout(() => $w?.scrollTo({ top: $w.scrollHeight, behavior: 'smooth' }), 50); }); return; }
  if (a === 'abbrechen') {
    if (await bestaetigen('Training abbrechen?', 'Alle Einträge dieses Trainings gehen verloren.', 'Abbrechen')) { aktiv = null; sichern(); stoppePause(); renderTraining(); render(); }
    return;
  }
  if (a === 'fertig') { beendeTraining(); return; }

  const ex = exAus(b); if (!ex) return;
  if (a === 'ex-info') { zeigeUebung(ex.id); return; }
  if (a === 'satz-plus') {
    const letzter = ex.saetze.at(-1);
    ex.saetze.push({ ...neuerSatz(), kg: letzter?.kg ?? '', wdh: letzter?.wdh ?? '' });
    sichern(); renderTraining(); return;
  }
  if (a === 'ex-menu') { uebungMenue(ex); return; }

  const zeile = b.closest('[data-i]'); const i = +zeile.dataset.i; const s = ex.saetze[i];
  if (a === 'prev-uebernehmen') {
    const p = prevFuer(ex, i); if (!p || s.done) return;
    if (ex.typ !== 'zeit' && findUeb(ex.id, ex).typ !== 'zeit') s.kg = String(p.kg ?? '').replace('.', ',');
    s.wdh = String(p.wdh ?? '');
    sichern(); renderTraining(); return;
  }
  if (a === 'satz-menu') { satzMenue(ex, i); return; }
  if (a === 'check') {
    const ueb = findUeb(ex.id, ex);
    if (!s.done) {
      const kgIn = zeile.querySelector('[data-f="kg"]'), wdhIn = zeile.querySelector('[data-f="wdh"]');
      if (kgIn && s.kg === '' && kgIn.placeholder && zahl(kgIn.placeholder) != null) s.kg = kgIn.placeholder.replace('.', '').replace(',', '.') ;
      if (ueb.typ === 'koerper' && s.kg === '') s.kg = '0';
      if (s.wdh === '' && zahl(wdhIn.placeholder) != null) s.wdh = wdhIn.placeholder;
      if (zahl(s.wdh) == null || zahl(s.wdh) <= 0) { toast(ueb.typ === 'zeit' ? 'Gib die Sekunden ein' : 'Gib die Wiederholungen ein', true); wdhIn.focus(); return; }
      if (ueb.typ === 'gewicht' && zahl(s.kg) == null) { toast('Gib das Gewicht ein', true); kgIn.focus(); return; }
      s.done = true;
      if (kgIn) kgIn.value = s.kg;
      wdhIn.value = s.wdh;
      navigator.vibrate?.(15);
      if (!s.warm) startePause(S.pause);
    } else s.done = false;
    zeile.classList.toggle('done', s.done);
    sichern();
  }
}

function uebungMenue(ex) {
  const idx = aktiv.uebungen.indexOf(ex);
  sheet(`<h2>${esc(ex.name)}</h2><div class="menu">
    <button data-m="notiz">📝 Notiz hinzufügen</button>
    ${idx > 0 ? '<button data-m="hoch">↑ Nach oben</button>' : ''}
    ${idx < aktiv.uebungen.length - 1 ? '<button data-m="runter">↓ Nach unten</button>' : ''}
    <button data-m="tauschen">⇄ Übung ersetzen</button>
    <button data-m="weg" class="danger">Übung entfernen</button></div>`,
  (el, cl) => el.addEventListener('click', (e) => {
    const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return;
    cl();
    if (m === 'notiz') ex.zeigNotiz = true;
    if (m === 'hoch') aktiv.uebungen.splice(idx - 1, 0, aktiv.uebungen.splice(idx, 1)[0]);
    if (m === 'runter') aktiv.uebungen.splice(idx + 1, 0, aktiv.uebungen.splice(idx, 1)[0]);
    if (m === 'weg') aktiv.uebungen.splice(idx, 1);
    if (m === 'tauschen') {
      waehleUebungen(([id]) => { const neu = uebungEintrag(id, ex.saetze.length); aktiv.uebungen[idx] = neu; sichern(); renderTraining(); }, { mehrfach: false });
      return;
    }
    sichern(); renderTraining();
    if (m === 'notiz') setTimeout(() => $w.querySelector(`[data-ex="${ex.key}"] .ex-note`)?.focus(), 50);
  }));
}

function satzMenue(ex, i) {
  const s = ex.saetze[i];
  sheet(`<h2>Satz</h2><div class="menu">
    <button data-m="warm">${s.warm ? 'Als normalen Satz markieren' : '🔥 Als Aufwärmsatz markieren'}</button>
    <button data-m="weg" class="danger">Satz löschen</button></div>`,
  (el, cl) => el.addEventListener('click', (e) => {
    const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return;
    if (m === 'warm') s.warm = !s.warm;
    if (m === 'weg') ex.saetze.splice(i, 1);
    cl(); sichern(); renderTraining();
  }));
}

// ---------- Pausen-Timer -------------------------------------
let pause = null, pauseTimer = null;

function startePause(sek) {
  pause = { ende: Date.now() + sek * 1000, dauer: sek * 1000 };
  zeichnePause();
  clearInterval(pauseTimer);
  pauseTimer = setInterval(zeichnePause, 250);
}

function stoppePause() { clearInterval(pauseTimer); pause = null; document.querySelector('.rest')?.remove(); const m = document.querySelector('.mini [data-pause]'); if (m) m.textContent = ''; }

function zeichnePause() {
  if (!pause) return;
  const rest = pause.ende - Date.now();
  if (rest <= 0) {
    stoppePause(); piep(); navigator.vibrate?.([200, 100, 200]); toast('Pause vorbei – nächster Satz! 💪');
    // Wenn die App im Hintergrund ist: Mitteilung (klappt, solange der Browser die Seite noch laufen lässt)
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      navigator.serviceWorker?.ready.then((r) => r.showNotification('Pause vorbei 💪', { body: 'Weiter mit dem nächsten Satz!', tag: 'gym-pause', icon: 'icon-192.png' })).catch(() => {});
    }
    return;
  }
  let el = document.querySelector('.rest');
  // Die Pausen-Leiste nur im geöffneten Training zeigen. Außerhalb läuft die Pause weiter und steht in der Mini-Leiste.
  if (!aktiv || minimiert || !$w) {
    el?.remove();
    const m = document.querySelector('.mini [data-pause]');
    if (m) m.textContent = `⏱ ${fmtDauer(rest + 999)}`;
    return;
  }
  if (!el) {
    el = document.createElement('div');
    el.className = 'rest';
    el.innerHTML = `<div class="grow"><div class="muted small">Pause</div><div class="time num"></div></div>
      <button class="rbtn" data-r="-15">−15</button><button class="rbtn" data-r="15">+15</button><button class="rbtn" data-r="skip">Weiter</button><div class="bar"></div>`;
    el.addEventListener('click', (e) => {
      const r = e.target.closest('[data-r]')?.dataset.r; if (!r) return;
      if (r === 'skip') return stoppePause();
      pause.ende += +r * 1000; pause.dauer = Math.max(1000, pause.dauer + +r * 1000); zeichnePause();
    });
    document.body.appendChild(el);
  }
  el.querySelector('.time').textContent = fmtDauer(rest + 999);
  el.querySelector('.bar').style.width = `${(rest / pause.dauer) * 100}%`;
}

function piep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.22].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.25, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
    });
  } catch { /* kein Ton möglich */ }
}

// ---------- Training beenden ---------------------------------
async function beendeTraining() {
  const uebungen = aktiv.uebungen
    .map((ex) => ({ id: ex.id, name: ex.name, muskel: ex.muskel, typ: ex.typ, notiz: ex.notiz || '',
      saetze: ex.saetze.filter((s) => s.done).map((s) => ({ kg: zahl(s.kg) ?? 0, wdh: zahl(s.wdh) ?? 0, warm: !!s.warm, done: true })) }))
    .filter((ex) => ex.saetze.length);

  if (!uebungen.length) {
    if (await bestaetigen('Keine Sätze abgehakt', 'Ohne abgehakte Sätze wird nichts gespeichert. Training verwerfen?', 'Verwerfen')) {
      aktiv = null; sichern(); stoppePause(); renderTraining(); render();
    }
    return;
  }
  const offen = aktiv.uebungen.reduce((n, ex) => n + ex.saetze.filter((s) => !s.done).length, 0);
  if (offen && !(await bestaetigen('Training beenden?', `${offen} ${offen === 1 ? 'Satz ist' : 'Sätze sind'} nicht abgehakt und ${offen === 1 ? 'wird' : 'werden'} nicht gespeichert.`, 'Beenden', false))) return;

  const kgK = S.gewicht;
  let volumen = 0, saetze = 0;
  const prs = [], rangAuf = [];
  const vorher = stats;
  for (const ex of uebungen) {
    const ueb = findUeb(ex.id, ex);
    let b1 = 0;
    for (const s of ex.saetze) {
      if (s.warm) continue;
      saetze++;
      if (ueb.typ === 'zeit') continue;
      const eff = effGewicht(ueb, s.kg, kgK);
      volumen += eff * s.wdh;
      b1 = Math.max(b1, e1rm(eff, s.wdh));
    }
    const alt = vorher.proUeb[ex.id]?.best1rm || 0;
    if (alt > 0 && b1 > alt + 0.01) prs.push({ id: ex.id, name: ueb.name, e1rm: Math.round(b1 * 10) / 10 });
    if (ueb.std && kgK) {
      const rAlt = rangFuer(ueb, alt, kgK, S.geschlecht), rNeu = rangFuer(ueb, Math.max(b1, alt), kgK, S.geschlecht);
      if (rNeu && (!rAlt || rNeu.index > rAlt.index)) rangAuf.push({ name: ueb.name, rang: rNeu });
    }
  }
  const ende = Date.now();
  const dauerMin = Math.max(1, Math.round((ende - aktiv.start) / 60000));
  const xp = 50 + saetze * 10 + Math.floor(volumen / 100) + prs.length * 50;
  const kcal = Math.round(5 * (kgK || 75) * (dauerMin / 60)); // grobe Schätzung (MET 5)

  const ev = {
    app: APP, kind: 'training', title: aktiv.titel.trim() || 'Training',
    starts_at: new Date(aktiv.start).toISOString(), ends_at: new Date(ende).toISOString(),
    data: { uebungen, volumen: Math.round(volumen), saetze, xp, prs, dauer_min: dauerMin, kcal, koerpergewicht: kgK, routine_id: aktiv.routineId },
  };

  const lvVorher = levelAusXp(vorher.xp).level;
  const petVorher = berechneMaskottchen(trainings);
  try {
    const gespeichert = await core.addEvent(ev);
    trainings.unshift(gespeichert);
  } catch (err) {
    toast('Speichern fehlgeschlagen – bitte nochmal versuchen', true);
    console.error(err);
    return;
  }
  const ausRoutine = aktiv.routineId;
  aktiv = null; sichern(); stoppePause(); renderTraining();
  berechne();
  const lvNachher = levelAusXp(stats.xp).level;
  const petNachher = berechneMaskottchen(trainings);
  const futter = futterVon(ev);
  tab = 'start'; render();

  sheet(`<div class="summary-hero">
      <div style="font-size:44px">${prs.length || rangAuf.length ? '🏆' : '🎉'}</div>
      <h2 style="margin:6px 0 2px">Training gespeichert!</h2>
      <div class="big num">+${xp} XP</div>
      ${lvNachher > lvVorher ? `<div class="pill on" style="margin-top:6px">Level ${lvNachher} erreicht!</div>` : ''}
    </div>
    <div class="stats3">
      <div class="stat"><b class="num">${dauerMin} min</b><span>Dauer</span></div>
      <div class="stat"><b class="num">${fmt(volumen / 1000, 2)} t</b><span>Volumen</span></div>
      <div class="stat"><b class="num">${saetze}</b><span>Sätze</span></div>
    </div>
    ${rangAuf.map((r) => `<div class="pr-item">${rangBadge(r.rang, 36)}<div class="grow"><b>${esc(r.name)}</b><div class="muted small">Neuer Rang: <b style="color:${r.rang.farbe}">${r.rang.name}</b></div></div></div>`).join('')}
    ${prs.map((p) => `<div class="pr-item"><span class="trophy">🏆</span><div class="grow"><b>${esc(p.name)}</b><div class="muted small">Neuer Rekord: ${fmt(p.e1rm)} kg geschätztes Maximum</div></div></div>`).join('')}
    <div class="pet-card card" style="margin-top:10px">
      <div class="pet-stage">${maskottchenSvg(petNachher, 92)}</div>
      <div class="grow"><b>${esc(S.petName)} wurde gefüttert! 🍗</b>
        <div class="muted small">+${fmt(Math.max(0, petNachher.energie - petVorher.energie), 0)} Energie · +${fmt(futter.kraft, 0)} Kraft</div>
        ${petNachher.stufeIndex > petVorher.stufeIndex ? `<div class="pill on" style="margin-top:6px">Neue Stufe: ${petNachher.stufe.name}!</div>` : ''}
      </div>
    </div>
    <p class="muted small" style="text-align:center;margin-top:14px">ca. ${kcal} kcal verbrannt · wird für den Kalorien-Tracker gespeichert</p>
    <div class="sheet-actions">
      ${!ausRoutine ? '<button class="btn" data-a="routine">Als Routine speichern</button>' : ''}
      <button class="btn btn-primary" data-a="ok">Super!</button></div>`,
  (el, cl) => {
    el.querySelector('[data-a="ok"]').onclick = cl;
    el.querySelector('[data-a="routine"]')?.addEventListener('click', () => { cl(); alsRoutineSpeichern(ev.title, uebungen); });
  });
}

// ---------- Seiten-Klicks ------------------------------------
$app.addEventListener('click', (e) => {
  // Tipp auf einen Muskel in der Karte
  const teil = e.target.closest('.mk-teil');
  if (teil) {
    const wrap = teil.closest('.mk-wrap');
    const info = wrap?.parentElement.querySelector('.mk-info');
    const daten = wrap?.dataset.karte ? JSON.parse(wrap.dataset.karte) : null;
    const m = teil.dataset.muskel;
    wrap.querySelectorAll('.mk-teil').forEach((p) => p.classList.toggle('mk-sel', p.dataset.muskel === m));
    if (info && wrap.dataset.rang) {
      const r = JSON.parse(wrap.dataset.rang)[m];
      info.innerHTML = r ? `<b style="color:var(--text)">${esc(m)}</b> · <b style="color:${r.farbe}">${esc(r.rang)}</b> · ${esc(r.ueb)}` : `<b style="color:var(--text)">${esc(m)}</b> · noch kein Rang`;
      return;
    }
    if (info && daten) info.innerHTML = `<b style="color:var(--text)">${m}</b> · ${daten.erh[m]}% erholt · ${fmt(daten.saetze[m] || 0)} Sätze diese Woche`;
    return;
  }
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a, id = b.dataset.id;
  if (a === 'leer') starteTraining(null);
  if (a === 'routine-start') starteTraining(routinen.find((r) => r.id === id));
  if (a === 'routine-bearbeiten') routineBearbeiten(id);
  if (a === 'neue-routine') routineBearbeiten(null);
  if (a === 'training') zeigeTraining(id);
  if (a === 'uebung') zeigeUebung(id);
  if (a === 'zum-profil') { tab = 'profil'; render(); }
  if (a === 'eigene-uebung') eigeneUebungErstellen();
  if (a === 'filter') { filterMuskel = b.dataset.m || null; render(); }
  if (a === 'karte') { karteModus = b.dataset.m; seiteStart(); }
  if (a === 'verlauf-ansicht') { verlaufAnsicht = b.dataset.v; rbVersatz = 0; render(); }
  if (a === 'rb-art') { rbArt = b.dataset.v; rbVersatz = 0; seiteVerlauf(); }
  if (a === 'fs-wert') { fsWert = b.dataset.v; seiteVerlauf(); }
  if (a === 'rb-nav') { rbVersatz = Math.min(0, rbVersatz + Number(b.dataset.v)); seiteVerlauf(); }
  if (a === 'push-an') pushAn(b);
  if (a === 'push-aus') pushAus();
  if (a === 'push-test') pushTest(b);
  if (a === 'logout') core.logout();
});

$app.addEventListener('change', (e) => {
  if (e.target.dataset.f === 'fs-ueb') { fsUeb = e.target.value; seiteVerlauf(); }
});

$app.addEventListener('input', (e) => {
  if (e.target.dataset.f === 'suche') {
    sucheText = e.target.value;
    const pos = e.target.selectionStart;
    seiteUebungen();
    const inp = $app.querySelector('[data-f="suche"]'); inp.focus(); inp.setSelectionRange(pos, pos);
  }
});

$nav.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  tab = b.dataset.tab; render();
});

// ---------- Start --------------------------------------------
function ersteEinrichtung() {
  let g = 'm';
  sheet(`<h2>Willkommen! 👋</h2>
    <p class="muted" style="margin-top:-6px">Damit deine Ränge stimmen, brauche ich kurz zwei Angaben.</p>
    <label class="field"><span>Name</span><input data-n placeholder="Dein Vorname"></label>
    <label class="field"><span>Körpergewicht (kg)</span><input data-g inputmode="decimal" placeholder="z. B. 75"></label>
    <div class="field"><span>Geschlecht</span><div class="seg"><button type="button" data-v="m" class="on">Männlich</button><button type="button" data-v="w">Weiblich</button></div></div>
    <div class="sheet-actions"><button class="btn" data-a="spaeter">Später</button><button class="btn btn-primary" data-a="ok">Los geht's</button></div>`,
  (el, cl) => {
    el.querySelectorAll('[data-v]').forEach((b) => b.onclick = () => { g = b.dataset.v; el.querySelectorAll('[data-v]').forEach((x) => x.classList.toggle('on', x === b)); });
    el.querySelector('[data-a="spaeter"]').onclick = cl;
    el.querySelector('[data-a="ok"]').onclick = async () => {
      const patch = { name: el.querySelector('[data-n]').value.trim(), gewicht: zahl(el.querySelector('[data-g]').value), geschlecht: g };
      try { await core.updateSettings(patch); Object.assign(S, patch); berechne(); cl(); render(); }
      catch { toast('Speichern fehlgeschlagen', true); }
    };
  });
}

async function init() {
  const user = await core.getUser();
  if (!user) {
    $nav.classList.add('hidden');
    core.renderLogin($app, { appName: 'Gym', onDone: () => location.reload() });
    return;
  }
  try {
    await ladeAlles();
  } catch (err) {
    console.error(err);
    const fehlt = /app_data|relation|schema cache/i.test(err.message || '');
    $app.innerHTML = `<div class="loading"><div style="text-align:center;max-width:340px">
      <h2>Verbindung fehlgeschlagen</h2>
      <p class="muted">${fehlt ? 'Die Datenbank ist noch nicht vollständig eingerichtet. Führe <b>002_app_daten.sql</b> in Supabase aus.' : esc(err.message || 'Unbekannter Fehler')}</p>
      <button class="btn btn-primary" onclick="location.reload()">Nochmal versuchen</button></div></div>`;
    return;
  }
  aktiv = store.get('gym-aktiv');
  minimiert = !!aktiv;
  $nav.classList.remove('hidden');
  swRegistrierung();
  pushShared.zuordnen('gym');
  hashOeffnen();
  render();
  if (aktiv) renderMini();
  if (!S.gewicht && !store.get('gym-einrichtung-spaeter')) { ersteEinrichtung(); store.set('gym-einrichtung-spaeter', true); }
}

// Links aus Mitteilungen, z. B. #rueckblick
function hashOeffnen() {
  if (location.hash === '#rueckblick') {
    tab = 'verlauf'; verlaufAnsicht = 'rueckblick'; rbArt = 'woche'; rbVersatz = 0;
    history.replaceState(null, '', location.pathname);
    return true;
  }
  return false;
}
window.addEventListener('hashchange', () => { if (stats && hashOeffnen()) render(); });

core.onAuthChange((u) => { if (!u && $nav && !$nav.classList.contains('hidden')) location.reload(); });
init();
