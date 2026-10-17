// =============================================================
// Neustart – Gewohnheit ablegen (Teil der Alltag-Apps)
// Daten: events (app='neustart': checkin, rueckfall, drang, aufgabe),
//        app_data neustart/einstellungen (Start, Gründe)
// Bewusst neutral benannt; optionale PIN-Sperre pro Gerät.
// =============================================================
import * as core from '../shared/core.js';
import * as push from '../shared/push.js';
import { esc, fmt, toast, sheet, bestaetigen, store, tagKey, tagStart, plusTage, wochenStart } from '../shared/ui.js';
import { MEILENSTEINE, AUSLOESER, ALTERNATIVEN, PHASEN, aufgabeFuer, phaseFuer, meilensteinInfo, levelAusXp } from './plan.js';

const APP = 'neustart';
const $app = document.getElementById('app');
const $nav = document.getElementById('nav');
const $sos = document.getElementById('sos');

let tab = 'heute';
let E = [];                                   // alle Einträge
let cfg = { start: null, gruende: [] };
const S = { pushStunde: 21, pushAus: false };
let uhr = null;

// ---------- Berechnungen ------------------------------------
const art = (k) => E.filter((e) => e.kind === k);
const tagNr = (von, bis = new Date()) => Math.floor((tagStart(bis) - tagStart(von)) / 864e5);

function zahlen() {
  const start = new Date(cfg.start);
  const rueck = art('rueckfall').map((e) => new Date(e.starts_at)).filter((d) => d >= start).sort((a, b) => a - b);
  const letzter = rueck.at(-1);
  const streakStart = letzter && letzter > start ? letzter : start;
  const jetzt = new Date();
  const ms = Math.max(0, jetzt - streakStart);
  const tage = Math.floor(ms / 864e5);
  // längste Serie
  let bester = 0, vorher = start;
  for (const r of [...rueck, jetzt]) { bester = Math.max(bester, r - vorher); vorher = r; }
  const rueckTage = new Set(rueck.map((d) => tagKey(d)));
  const gesamtTage = tagNr(start) + 1;
  const sauberTage = Math.max(0, gesamtTage - rueckTage.size - 1); // heute zählt erst morgen
  const xp = art('checkin').length * 10 + art('aufgabe').length * 20 + art('drang').length * 15 + sauberTage * 10;
  return { streakStart, ms, tage, besterTage: Math.floor(bester / 864e5), rueckTage, rueckfaelle: rueck.length, sauberTage, draenge: art('drang').length, xp, planTag: tagNr(start) + 1 };
}

const checkinHeute = () => E.find((e) => e.kind === 'checkin' && tagKey(e.starts_at) === tagKey(new Date()));
const aufgabeErledigt = (id) => E.some((e) => e.kind === 'aufgabe' && e.data?.id === id);

function dauerText(ms) {
  const t = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4), s = Math.floor((ms % 6e4) / 1000);
  return `${t} T · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ringSvg(anteil, farbe) {
  const r = 44, u = 2 * Math.PI * r, a = Math.max(0.02, Math.min(1, anteil));
  return `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--card2)" stroke-width="8"/>
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="${farbe}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(a * u).toFixed(1)} ${u.toFixed(1)}"/></svg>`;
}

async function eintragen(kind, data = {}, zeit = new Date()) {
  const e = await core.addEvent({ app: APP, kind, title: kind, starts_at: zeit.toISOString(), data });
  E.push(e);
  return e;
}

// ---------- Seiten ------------------------------------------
function render() {
  clearInterval(uhr);
  $nav.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $sos.classList.toggle('hidden', tab === 'profil');
  ({ heute: seiteHeute, plan: seitePlan, verlauf: seiteVerlauf, profil: seiteProfil })[tab]();
}

function seiteHeute() {
  const z = zahlen();
  const mi = meilensteinInfo(z.tage);
  const lv = levelAusXp(z.xp);
  const ci = checkinHeute();
  const auf = aufgabeFuer(z.planTag);
  const fertig = aufgabeErledigt(auf.id);
  const grund = cfg.gruende.length ? cfg.gruende[new Date().getDate() % cfg.gruende.length] : null;
  const stimmungen = ['😞', '🙁', '😐', '🙂', '😄'];

  $app.innerHTML = `
    <div class="page-head"><div><div class="muted small">Level ${lv.level} · ${fmt(z.xp, 0)} XP</div><h1>Neustart</h1></div></div>

    <div class="card streak-hero">
      <div class="streak-ring">${ringSvg(mi.fortschritt, 'var(--gruen)')}
        <div class="mitte"><div><div class="tage num">${z.tage}</div><div class="lbl">${z.tage === 1 ? 'Tag' : 'Tage'} stark</div></div></div></div>
      <div class="timer" data-uhr>${dauerText(z.ms)}</div>
      <div class="meilenstein muted">${mi.naechster ? `Nächstes Ziel: <b style="color:var(--text)">${mi.naechster.icon} ${mi.naechster.name}</b> · noch ${mi.naechster.tage - z.tage} ${mi.naechster.tage - z.tage === 1 ? 'Tag' : 'Tage'}` : 'Alle Meilensteine erreicht 👑'}</div>
    </div>

    <div class="stats3" style="margin-top:10px">
      <div class="stat"><b class="num">${z.besterTage}</b><span>Beste Serie</span></div>
      <div class="stat"><b class="num">${z.sauberTage}</b><span>Starke Tage</span></div>
      <div class="stat"><b class="num">${z.draenge}</b><span>Drang besiegt</span></div>
    </div>

    <div class="section-title">Täglicher Check-in</div>
    ${ci ? `<div class="card row"><span style="font-size:30px">${stimmungen[(ci.data.stimmung || 3) - 1]}</span>
        <div class="grow"><b>Erledigt ✓</b><div class="muted small">${ci.data.notiz ? esc(ci.data.notiz).slice(0, 80) : 'Danke, dass du ehrlich zu dir bist.'}</div></div>
        <button class="btn" data-a="checkin">Ändern</button></div>`
      : `<button class="btn btn-primary btn-block btn-lg" data-a="checkin">Wie war dein Tag? ✨</button>`}

    <div class="section-title">Aufgabe für Tag ${z.planTag} <button data-a="tab" data-v="plan">Plan ›</button></div>
    <div class="card aufgabe">
      <button class="haken ${fertig ? 'an' : ''}" data-a="aufgabe" data-id="${auf.id}" aria-label="Erledigt">✓</button>
      <div class="grow"><div class="muted small">${phaseFuer(z.planTag).name}</div><b>${esc(auf.text)}</b></div>
    </div>

    <div class="section-title">Dein Warum <button data-a="tab" data-v="profil">Bearbeiten</button></div>
    <div class="card">${grund ? `<div class="grund">„${esc(grund)}“</div>` : '<p class="muted" style="margin:0">Schreib im Profil auf, warum du das machst. In schwachen Momenten zeigt dir die App deine eigenen Gründe.</p>'}</div>

    <div class="section-title">Meilensteine</div>
    <div class="card"><div class="chips" style="justify-content:flex-start">
      ${MEILENSTEINE.map((m) => `<button type="button" tabindex="-1" style="${z.besterTage >= m.tage ? '' : 'opacity:.35'}">${m.icon} ${m.name}</button>`).join('')}</div></div>

    <button class="leise" data-a="rueckfall">Rückfall eintragen</button>`;

  uhr = setInterval(() => { const el = $app.querySelector('[data-uhr]'); if (el) el.textContent = dauerText(Date.now() - zahlen().streakStart); }, 1000);
}

function seitePlan() {
  const z = zahlen();
  let html = `<div class="page-head"><h1>Dein Plan</h1></div>
    <p class="muted" style="margin-top:-8px">90 Tage in vier Phasen. Jeden Tag eine kleine Aufgabe – der Plan läuft auch nach einem Rückfall einfach weiter.</p>`;
  for (const p of PHASEN) {
    html += `<div class="phase"><h3>${p.name} · Tag ${p.ab}–${p.bis}</h3><div class="muted small" style="margin-bottom:8px">${p.text}</div>`;
    for (let t = p.ab; t <= p.bis; t++) {
      const a = aufgabeFuer(t), f = aufgabeErledigt(a.id);
      const cls = f ? 'fertig' : t === z.planTag ? 'heute' : t > z.planTag ? 'zukunft' : '';
      html += `<div class="plan-tag ${cls}" ${t <= z.planTag ? `data-a="aufgabe" data-id="${a.id}"` : ''}><span class="nr">${f ? '✓' : t}</span><span class="grow small">${esc(a.text)}</span></div>`;
    }
    html += '</div>';
  }
  $app.innerHTML = html;
  $app.querySelector('.plan-tag.heute')?.scrollIntoView({ block: 'center' });
}

function seiteVerlauf() {
  const z = zahlen();
  const start = tagStart(new Date(cfg.start));
  const heute = tagStart(new Date());
  // Heatmap: 12 Wochen
  const ab = plusTage(wochenStart(heute), -77);
  let heat = '';
  for (let i = 0; i < 84; i++) {
    const d = plusTage(ab, i);
    let cls = '';
    if (d > heute) cls = 'zukunft';
    else if (d < start) cls = 'vor';
    else if (z.rueckTage.has(tagKey(d))) cls = 'rueck';
    else if (d < heute) cls = 'sauber';
    heat += `<span class="${cls} ${tagKey(d) === tagKey(heute) ? 'heute' : ''}" title="${tagKey(d)}" ${cls === 'zukunft' ? 'style="opacity:0"' : ''}></span>`;
  }
  // Tageszeiten
  const zeiten = { 'Morgens (5–11)': 0, 'Mittags (11–17)': 0, 'Abends (17–22)': 0, 'Nachts (22–5)': 0 };
  for (const e of [...art('drang'), ...art('rueckfall')]) {
    const h = new Date(e.starts_at).getHours();
    const k = h >= 5 && h < 11 ? 'Morgens (5–11)' : h >= 11 && h < 17 ? 'Mittags (11–17)' : h >= 17 && h < 22 ? 'Abends (17–22)' : 'Nachts (22–5)';
    zeiten[k]++;
  }
  const zMax = Math.max(1, ...Object.values(zeiten));
  // Auslöser
  const aus = {};
  for (const e of E) for (const a of e.data?.ausloeser || []) aus[a] = (aus[a] || 0) + 1;
  const ausListe = Object.entries(aus).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const aMax = Math.max(1, ...ausListe.map((x) => x[1]));
  // Stimmung letzte 14 Tage
  const stimm = [];
  for (let i = 13; i >= 0; i--) {
    const d = plusTage(heute, -i);
    const c = E.find((e) => e.kind === 'checkin' && tagKey(e.starts_at) === tagKey(d));
    stimm.push(c?.data?.stimmung || 0);
  }
  // Tagebuch
  const tb = E.filter((e) => (e.kind === 'checkin' && e.data?.notiz) || e.kind === 'rueckfall' || e.kind === 'drang')
    .sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at)).slice(0, 30);

  $app.innerHTML = `
    <div class="page-head"><h1>Verlauf</h1></div>
    <div class="stats3">
      <div class="stat"><b class="num">${z.sauberTage}</b><span>Starke Tage</span></div>
      <div class="stat"><b class="num">${z.rueckfaelle}</b><span>Rückfälle</span></div>
      <div class="stat"><b class="num">${z.planTag > 1 ? fmt((z.sauberTage / (z.planTag - 1)) * 100, 0) : '–'} %</b><span>Erfolgsquote</span></div>
    </div>

    <div class="section-title">Letzte 12 Wochen</div>
    <div class="card"><div class="heat">${heat}</div>
      <div class="legende"><span><i style="background:var(--gruen)"></i>Stark</span><span><i style="background:var(--danger)"></i>Rückfall</span><span><i style="background:var(--card2)"></i>Heute / offen</span></div></div>

    <div class="section-title">Wann kommt der Drang?</div>
    <div class="card">${Object.values(zeiten).some(Boolean)
      ? Object.entries(zeiten).map(([k, n]) => `<div class="balken-zeile"><span>${k}</span><div><i style="width:${(n / zMax) * 100}%"></i></div><b class="num">${n}</b></div>`).join('')
      : '<p class="muted small" style="margin:0">Noch keine Daten. Nutze den SOS-Button, wenn ein Drang kommt – dann siehst du hier Muster.</p>'}</div>

    ${ausListe.length ? `<div class="section-title">Häufigste Auslöser</div><div class="card">
      ${ausListe.map(([k, n]) => `<div class="balken-zeile"><span>${esc(k)}</span><div><i style="width:${(n / aMax) * 100}%;background:var(--fire)"></i></div><b class="num">${n}</b></div>`).join('')}</div>` : ''}

    <div class="section-title">Stimmung (14 Tage)</div>
    <div class="card"><div style="display:flex;align-items:flex-end;gap:4px;height:70px">
      ${stimm.map((s) => `<div style="flex:1;height:${s ? s * 20 : 3}%;background:${s ? (s >= 4 ? 'var(--gruen)' : s === 3 ? 'var(--accent2)' : 'var(--fire)') : 'var(--line)'};border-radius:4px"></div>`).join('')}
    </div></div>

    <div class="section-title">Tagebuch</div>
    ${tb.length ? tb.map((e) => `<div class="eintrag">
      <div class="muted small">${new Date(e.starts_at).toLocaleString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${e.kind === 'checkin' ? 'Check-in' : e.kind === 'drang' ? '💪 Drang besiegt' : '↺ Rückfall'}</div>
      ${e.data?.notiz ? `<div style="margin-top:4px">${esc(e.data.notiz)}</div>` : ''}
      ${e.data?.ausloeser?.length ? `<div class="muted small" style="margin-top:4px">${e.data.ausloeser.map(esc).join(' · ')}</div>` : ''}
    </div>`).join('') : '<div class="empty">Noch keine Einträge.</div>'}`;
}

async function seiteProfil() {
  const hatPin = !!store.get('nst-pin');
  $app.innerHTML = `
    <div class="page-head"><h1>Profil</h1></div>

    <div class="section-title">Meine Gründe</div>
    <div class="card">
      ${cfg.gruende.map((g, i) => `<div class="row" style="padding:6px 0;border-bottom:1px solid var(--line)"><span class="grow">${esc(g)}</span><button class="icon-btn" data-a="grund-weg" data-i="${i}" aria-label="Entfernen" style="color:var(--danger)">×</button></div>`).join('')}
      <div class="add-row" style="display:flex;gap:8px;margin-top:10px"><input class="search" data-grund placeholder="z. B. Mehr Energie und Fokus" maxlength="140"><button class="btn btn-primary" data-a="grund-neu">+</button></div>
    </div>

    <div class="section-title">Erinnerung</div>
    <div class="card" id="push-karte"><div class="muted small">Wird geprüft …</div></div>

    <div class="section-title">Privatsphäre</div>
    <div class="card">
      <p style="margin:0 0 12px">${hatPin ? '🔒 App-Sperre ist <b style="color:var(--ok)">aktiv</b> auf diesem Gerät.' : 'Schütze die App mit einer 4-stelligen PIN. Sie gilt nur für dieses Gerät.'}</p>
      <div class="sheet-actions" style="margin:0">${hatPin ? '<button class="btn" data-a="pin-neu">PIN ändern</button><button class="btn btn-danger" data-a="pin-weg">PIN entfernen</button>' : '<button class="btn btn-primary" data-a="pin-neu">PIN festlegen</button>'}</div>
      <p class="muted small" style="margin:12px 0 0">Name, Symbol und Mitteilungen der App sind bewusst neutral gehalten.</p>
    </div>

    <div class="section-title">Start</div>
    <div class="card">
      <p style="margin:0 0 12px">Gestartet am <b>${new Date(cfg.start).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}</b></p>
      <button class="btn btn-block" data-a="start-aendern">Startdatum ändern</button>
    </div>

    <div class="section-title">Hilfe</div>
    <div class="card"><p class="muted small" style="margin:0">Rückfälle gehören für viele dazu – entscheidend ist, dass du weitermachst. Wenn du merkst, dass dich das Thema stark belastet oder dir allein nicht gelingt, kann ein Gespräch mit einer Beratungsstelle oder einem Arzt helfen. Das ist kein Zeichen von Schwäche.</p></div>

    <div class="section-title">Konto</div>
    <a class="list-item" href="../" style="text-decoration:none;color:inherit"><span class="grow">← Alle Apps</span></a>
    <button class="list-item" data-a="logout" style="color:var(--danger)"><span class="grow">Abmelden</span></button>`;
  zeichnePush();
}

async function zeichnePush() {
  const el = document.getElementById('push-karte'); if (!el) return;
  const stundeSel = `<label class="field" style="margin:12px 0 0"><span>Uhrzeit</span><select data-a-change="stunde">${Array.from({ length: 17 }, (_, i) => i + 7).map((h) => `<option value="${h}" ${h === S.pushStunde ? 'selected' : ''}>${h}:00 Uhr</option>`).join('')}</select></label>`;
  if (!push.unterstuetzt()) {
    el.innerHTML = push.istIOS && !push.alsAppGestartet ? '<p style="margin:0">📱 Am iPhone erst über <b>Teilen → Zum Home-Bildschirm</b> hinzufügen und von dort öffnen.</p>' : '<p class="muted" style="margin:0">Dieser Browser unterstützt keine Mitteilungen.</p>';
    return;
  }
  const an = await push.aktiv();
  if (!an) {
    el.innerHTML = `<p style="margin:0 0 12px">Eine tägliche, neutrale Erinnerung an deinen Check-in („Zeit für deinen kurzen Check-in ✨“).</p>
      <button class="btn btn-primary btn-block" data-a="push-an">🔔 Mitteilungen aktivieren</button>`;
    return;
  }
  el.innerHTML = `<label class="check-row"><input type="checkbox" data-a-change="aus" ${S.pushAus ? '' : 'checked'}> Tägliche Check-in-Erinnerung</label>${stundeSel}
    <p class="muted small" style="margin:10px 0 0">Kommt nur, wenn du an dem Tag noch keinen Check-in gemacht hast.</p>`;
  el.querySelectorAll('[data-a-change]').forEach((inp) => inp.onchange = async () => {
    const patch = inp.dataset.aChange === 'aus' ? { nst_push_aus: !inp.checked } : { nst_push_stunde: Number(inp.value) };
    try { await core.updateSettings(patch); if ('nst_push_aus' in patch) S.pushAus = patch.nst_push_aus; else S.pushStunde = patch.nst_push_stunde; toast('Gespeichert ✓'); }
    catch { toast('Speichern fehlgeschlagen', true); }
  });
}

// ---------- Check-in ----------------------------------------
function checkinSheet() {
  const alt = checkinHeute();
  const d = { stimmung: 3, drang: 0, rueckfall: false, ausloeser: [], notiz: '', ...(alt?.data || {}) };
  const sel = new Set(d.ausloeser);
  sheet(`<h2>Wie war dein Tag?</h2>
    <div class="field"><span>Stimmung</span><div class="skala">${['😞', '🙁', '😐', '🙂', '😄'].map((s, i) => `<button type="button" data-st="${i + 1}" class="${d.stimmung === i + 1 ? 'on' : ''}">${s}</button>`).join('')}</div></div>
    <div class="field"><span>Wie stark war der Drang heute?</span><div class="skala vier">${['Kein', 'Leicht', 'Mittel', 'Stark'].map((s, i) => `<button type="button" data-dr="${i}" class="${d.drang === i ? 'on' : ''}">${s}</button>`).join('')}</div></div>
    <div class="field"><span>Gab es heute einen Rückfall?</span><div class="seg"><button type="button" data-rf="0" class="${!d.rueckfall ? 'on' : ''}">Nein 💪</button><button type="button" data-rf="1" class="${d.rueckfall ? 'on' : ''}">Ja</button></div></div>
    <div class="field"><span>Auslöser (optional)</span><div class="chips" style="justify-content:flex-start">${AUSLOESER.map((a) => `<button type="button" data-au="${esc(a)}" class="${sel.has(a) ? 'on' : ''}">${esc(a)}</button>`).join('')}</div></div>
    <label class="field"><span>Notiz (optional)</span><textarea data-n rows="3" placeholder="Was lief gut? Was war schwierig?">${esc(d.notiz)}</textarea></label>
    <div class="sheet-actions"><button class="btn btn-primary" data-a="ok">Speichern</button></div>`,
  (el, close) => {
    const wahl = (attr, cb) => el.querySelectorAll(`[${attr}]`).forEach((b) => b.onclick = () => { el.querySelectorAll(`[${attr}]`).forEach((x) => x.classList.toggle('on', x === b)); cb(b.getAttribute(attr)); });
    wahl('data-st', (v) => { d.stimmung = +v; });
    wahl('data-dr', (v) => { d.drang = +v; });
    wahl('data-rf', (v) => { d.rueckfall = v === '1'; });
    el.querySelectorAll('[data-au]').forEach((b) => b.onclick = () => { const a = b.dataset.au; sel.has(a) ? sel.delete(a) : sel.add(a); b.classList.toggle('on'); });
    el.querySelector('[data-a="ok"]').onclick = async () => {
      d.ausloeser = [...sel]; d.notiz = el.querySelector('[data-n]').value.trim();
      close();
      try {
        if (alt) { const n = await core.updateEvent(alt.id, { data: d }); E = E.map((x) => (x.id === n.id ? n : x)); }
        else await eintragen('checkin', d);
        const schonRueck = E.some((e) => e.kind === 'rueckfall' && tagKey(e.starts_at) === tagKey(new Date()));
        if (d.rueckfall && !schonRueck) { await eintragen('rueckfall', { ausloeser: d.ausloeser, notiz: d.notiz }); render(); trost(); return; }
        toast(d.rueckfall ? 'Gespeichert' : 'Check-in gespeichert – stark! 💪');
      } catch { toast('Speichern fehlgeschlagen', true); }
      render();
    };
  });
}

// ---------- Rückfall ----------------------------------------
function rueckfallSheet() {
  const sel = new Set();
  sheet(`<h2>Rückfall eintragen</h2>
    <p class="muted" style="margin-top:-6px">Ehrlich sein ist der wichtigste Schritt. Dein Fortschritt geht nicht verloren.</p>
    <div class="field"><span>Wann?</span><input type="datetime-local" data-zeit value="${new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16)}" style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--card)"></div>
    <div class="field"><span>Was war der Auslöser?</span><div class="chips" style="justify-content:flex-start">${AUSLOESER.map((a) => `<button type="button" data-au="${esc(a)}">${esc(a)}</button>`).join('')}</div></div>
    <label class="field"><span>Was machst du nächstes Mal anders? (optional)</span><textarea data-n rows="3"></textarea></label>
    <div class="sheet-actions"><button class="btn" data-a="x">Abbrechen</button><button class="btn btn-primary" data-a="ok">Eintragen</button></div>`,
  (el, close) => {
    el.querySelectorAll('[data-au]').forEach((b) => b.onclick = () => { const a = b.dataset.au; sel.has(a) ? sel.delete(a) : sel.add(a); b.classList.toggle('on'); });
    el.querySelector('[data-a="x"]').onclick = close;
    el.querySelector('[data-a="ok"]').onclick = async () => {
      const zeit = new Date(el.querySelector('[data-zeit]').value || Date.now());
      if (zeit > new Date()) { toast('Der Zeitpunkt liegt in der Zukunft', true); return; }
      close();
      try { await eintragen('rueckfall', { ausloeser: [...sel], notiz: el.querySelector('[data-n]').value.trim() }, zeit); } catch { toast('Speichern fehlgeschlagen', true); return; }
      render(); trost();
    };
  });
}

function trost() {
  const z = zahlen();
  sheet(`<div style="text-align:center;padding:6px 0">
      <div style="font-size:46px">🌱</div>
      <h2 style="margin:8px 0">Neuer Anlauf – nicht von vorne</h2>
      <p class="muted">Du hast schon <b style="color:var(--text)">${z.sauberTage} starke Tage</b> geschafft, deine beste Serie waren <b style="color:var(--text)">${z.besterTage} Tage</b>. Das bleibt. Schau dir in „Verlauf“ an, wann es schwierig wird, und plane für diese Momente etwas anderes.</p>
    </div>
    <div class="sheet-actions"><button class="btn btn-primary" data-a="ok">Weiter geht's</button></div>`,
  (el, close) => { el.querySelector('[data-a="ok"]').onclick = close; });
}

// ---------- Notfall ------------------------------------------
function notfall() {
  const sel = new Set();
  let vorschlaege = [];
  const neueVorschlaege = () => { vorschlaege = [...ALTERNATIVEN].sort(() => Math.random() - 0.5).slice(0, 3); };
  neueVorschlaege();
  const el = document.createElement('div');
  el.className = 'notfall';
  const zeichne = () => {
    el.innerHTML = `<div class="notfall-inner">
      <div class="row" style="justify-content:space-between"><b>Atme mit</b><button class="icon-btn" data-a="zu" aria-label="Schließen">×</button></div>
      <div class="atem"><div class="kreis"></div><div><div class="wort" data-wort>Einatmen</div><span class="sek" data-sek>4</span></div></div>
      <p class="muted">Der Drang wird stärker und geht dann vorbei – meist nach wenigen Minuten. Bleib bei deinem Atem.</p>
      ${cfg.gruende.length ? `<div class="section-title" style="justify-content:center">Dein Warum</div>${cfg.gruende.map((g) => `<div class="vorschlag" style="justify-content:center;text-align:center">„${esc(g)}“</div>`).join('')}` : ''}
      <div class="section-title" style="justify-content:space-between">Mach stattdessen <button data-a="neu">Andere ↻</button></div>
      ${vorschlaege.map((v) => `<div class="vorschlag"><span>👉</span>${esc(v)}</div>`).join('')}
      <a class="btn btn-block" href="../gym/" style="margin-top:8px;text-decoration:none">🏋️ Workout starten</a>
      <div class="section-title" style="justify-content:center">Was hat den Drang ausgelöst?</div>
      <div class="chips">${AUSLOESER.map((a) => `<button type="button" data-au="${esc(a)}" class="${sel.has(a) ? 'on' : ''}">${esc(a)}</button>`).join('')}</div>
      <button class="btn btn-ok btn-block btn-lg" data-a="geschafft" style="margin-top:18px">Drang überstanden 💪</button>
    </div>`;
  };
  zeichne();
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';

  // Box-Atmung 4-4-4-4
  const phasen = [['Einatmen', true], ['Halten', true], ['Ausatmen', false], ['Halten', false]];
  let p = 0, s = 4;
  const schritt = () => {
    const kreis = el.querySelector('.kreis'); if (!kreis) return;
    if (s === 4) { kreis.classList.toggle('gross', phasen[p][1]); el.querySelector('[data-wort]').textContent = phasen[p][0]; }
    el.querySelector('[data-sek]').textContent = s;
    s--;
    if (s === 0) { s = 4; p = (p + 1) % 4; }
  };
  schritt();
  const t = setInterval(schritt, 1000);
  const zu = () => { clearInterval(t); el.remove(); document.body.style.overflow = ''; };

  el.addEventListener('click', async (e) => {
    const au = e.target.closest('[data-au]');
    if (au) { const a = au.dataset.au; sel.has(a) ? sel.delete(a) : sel.add(a); au.classList.toggle('on'); return; }
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'zu') zu();
    if (b.dataset.a === 'neu') { neueVorschlaege(); const st = { kreisGross: el.querySelector('.kreis')?.classList.contains('gross') }; zeichne(); el.querySelector('.kreis')?.classList.toggle('gross', st.kreisGross); }
    if (b.dataset.a === 'geschafft') {
      b.disabled = true;
      try { await eintragen('drang', { ausloeser: [...sel] }); toast('Stark! +15 XP 💪'); } catch { toast('Speichern fehlgeschlagen', true); }
      zu(); render();
    }
  });
}

// ---------- PIN ---------------------------------------------
async function hash(t) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('neustart:' + t));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function pinEingabe(titel, cb) {
  let pin = '';
  const el = document.createElement('div');
  el.className = 'sperre';
  el.innerHTML = `<div style="text-align:center"><div style="font-size:34px">🔒</div><h2 style="margin-top:8px">${esc(titel)}</h2>
    <div class="pin-punkte">${'<i></i>'.repeat(4)}</div>
    <div class="tasten">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((k) => `<button type="button" data-k="${k}">${k}</button>`).join('')}</div></div>`;
  document.body.appendChild(el);
  const punkte = () => el.querySelectorAll('.pin-punkte i').forEach((p, i) => p.classList.toggle('voll', i < pin.length));
  el.addEventListener('click', async (e) => {
    const k = e.target.closest('[data-k]')?.dataset.k; if (k === undefined || k === '') return;
    if (k === '⌫') pin = pin.slice(0, -1); else if (pin.length < 4) pin += k;
    punkte();
    if (pin.length === 4) {
      const ok = await cb(pin);
      if (ok) el.remove();
      else { const pp = el.querySelector('.pin-punkte'); pp.classList.add('falsch'); setTimeout(() => { pp.classList.remove('falsch'); pin = ''; punkte(); }, 400); }
    }
  });
  return el;
}

function entsperren() {
  return new Promise((resolve) => {
    const gespeichert = store.get('nst-pin');
    if (!gespeichert) return resolve();
    pinEingabe('PIN eingeben', async (pin) => { if (await hash(pin) === gespeichert) { resolve(); return true; } return false; });
  });
}

function pinFestlegen() {
  pinEingabe('Neue PIN', async (erste) => {
    setTimeout(() => pinEingabe('PIN wiederholen', async (zweite) => {
      if (zweite !== erste) { toast('PINs stimmen nicht überein', true); return true; }
      store.set('nst-pin', await hash(zweite)); toast('PIN gespeichert 🔒'); render(); return true;
    }), 50);
    return true;
  });
}

let verstecktSeit = null;
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'hidden') { verstecktSeit = Date.now(); return; }
  if (verstecktSeit && Date.now() - verstecktSeit > 60000 && store.get('nst-pin') && !document.querySelector('.sperre')) await entsperren();
  if (tab === 'heute' && !document.querySelector('.backdrop, .notfall')) render();
});

// ---------- Einrichtung -------------------------------------
function einrichtung() {
  return new Promise((resolve) => {
    const gruende = [];
    sheet(`<h2>Willkommen bei Neustart 🌱</h2>
      <p class="muted" style="margin-top:-6px">Zwei kurze Fragen, dann geht's los. Alles bleibt privat in deinem Konto.</p>
      <div class="field"><span>Seit wann bist du dabei?</span><div class="seg" data-seg><button type="button" data-v="jetzt" class="on">Ab jetzt</button><button type="button" data-v="frueher">Schon länger</button></div></div>
      <label class="field" data-frueher hidden><span>Startdatum</span><input type="date" data-datum max="${tagKey(new Date())}" style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--card)"></label>
      <label class="field"><span>Warum machst du das? (mind. 1 Grund)</span>
        <input data-g1 placeholder="z. B. Mehr Energie und Fokus" class="search" style="margin-bottom:6px">
        <input data-g2 placeholder="z. B. Mich selbst respektieren" class="search" style="margin-bottom:6px">
        <input data-g3 placeholder="optional" class="search"></label>
      <div class="sheet-actions"><button class="btn btn-primary" data-a="ok">Los geht's</button></div>`,
    (el, close) => {
      let modus = 'jetzt';
      el.querySelectorAll('[data-seg] button').forEach((b) => b.onclick = () => { modus = b.dataset.v; el.querySelectorAll('[data-seg] button').forEach((x) => x.classList.toggle('on', x === b)); el.querySelector('[data-frueher]').hidden = modus === 'jetzt'; });
      el.querySelector('[data-a="ok"]').onclick = async () => {
        for (const k of ['g1', 'g2', 'g3']) { const v = el.querySelector(`[data-${k}]`).value.trim(); if (v) gruende.push(v); }
        if (!gruende.length) { toast('Schreib mindestens einen Grund auf', true); return; }
        let start = new Date();
        if (modus === 'frueher') {
          const v = el.querySelector('[data-datum]').value;
          if (!v) { toast('Wähle ein Startdatum', true); return; }
          const [y, m, d] = v.split('-').map(Number); start = new Date(y, m - 1, d);
        }
        cfg = { start: start.toISOString(), gruende };
        try { await core.setAppData(APP, 'einstellungen', cfg); await core.updateSettings({ nst_aktiv: true }); }
        catch { toast('Speichern fehlgeschlagen', true); return; }
        close(); resolve();
      };
    });
  });
}

// ---------- Klicks -------------------------------------------
$app.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a;
  if (a === 'tab') { tab = b.dataset.v; render(); window.scrollTo(0, 0); }
  if (a === 'checkin') checkinSheet();
  if (a === 'rueckfall') rueckfallSheet();
  if (a === 'aufgabe') {
    const id = b.dataset.id;
    const vorhanden = E.find((x) => x.kind === 'aufgabe' && x.data?.id === id);
    try {
      if (vorhanden) { await core.deleteEvent(vorhanden.id); E = E.filter((x) => x.id !== vorhanden.id); }
      else { await eintragen('aufgabe', { id }); toast('Aufgabe erledigt +20 XP ✓'); }
    } catch { toast('Speichern fehlgeschlagen', true); }
    const y = window.scrollY; render(); window.scrollTo(0, y);
  }
  if (a === 'grund-neu') {
    const inp = $app.querySelector('[data-grund]'); const v = inp.value.trim(); if (!v) return;
    cfg.gruende = [...cfg.gruende, v];
    try { await core.setAppData(APP, 'einstellungen', cfg); render(); } catch { toast('Speichern fehlgeschlagen', true); }
  }
  if (a === 'grund-weg') {
    cfg.gruende = cfg.gruende.filter((_, i) => i !== Number(b.dataset.i));
    try { await core.setAppData(APP, 'einstellungen', cfg); render(); } catch { toast('Speichern fehlgeschlagen', true); }
  }
  if (a === 'pin-neu') pinFestlegen();
  if (a === 'pin-weg') { if (await bestaetigen('PIN entfernen?', 'Die App ist dann auf diesem Gerät ohne PIN offen.', 'Entfernen')) { store.set('nst-pin', null); render(); } }
  if (a === 'start-aendern') {
    sheet(`<h2>Startdatum ändern</h2><p class="muted" style="margin-top:-6px">Ab wann zählt dein Plan? Rückfälle und Einträge bleiben erhalten.</p>
      <input type="date" data-datum max="${tagKey(new Date())}" value="${tagKey(cfg.start)}" style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--card)">
      <div class="sheet-actions"><button class="btn btn-primary" data-a="ok">Speichern</button></div>`,
    (el, close) => el.querySelector('[data-a="ok"]').onclick = async () => {
      const v = el.querySelector('[data-datum]').value; if (!v) return;
      const [y, m, d] = v.split('-').map(Number);
      cfg.start = new Date(y, m - 1, d).toISOString();
      try { await core.setAppData(APP, 'einstellungen', cfg); close(); render(); toast('Gespeichert ✓'); } catch { toast('Speichern fehlgeschlagen', true); }
    });
  }
  if (a === 'push-an') {
    b.disabled = true; b.textContent = '…';
    try { await push.aktivieren(); await core.updateSettings({ nst_push_aus: false }); S.pushAus = false; toast('Erinnerung aktiviert 🔔'); } catch (err) { toast(err.message, true); }
    render();
  }
  if (a === 'logout') core.logout();
});

$sos.onclick = notfall;
$nav.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  tab = b.dataset.tab; render(); window.scrollTo(0, 0);
});

// ---------- Start --------------------------------------------
async function init() {
  const user = await core.getUser();
  if (!user) { core.renderLogin($app, { appName: 'Neustart', onDone: () => location.reload() }); return; }
  await entsperren();
  try {
    const [c, ev, profil] = await Promise.all([
      core.getAppData(APP, 'einstellungen', null),
      core.listEvents({ app: APP, limit: 5000 }),
      core.getProfile(),
    ]);
    E = ev;
    const st = profil?.settings || {};
    S.pushStunde = st.nst_push_stunde ?? 21;
    S.pushAus = !!st.nst_push_aus;
    if (c?.start) cfg = { gruende: [], ...c };
    else { $app.innerHTML = ''; await einrichtung(); }
  } catch (err) {
    console.error(err);
    $app.innerHTML = `<div class="loading"><div style="text-align:center;max-width:340px"><h2>Verbindung fehlgeschlagen</h2>
      <p class="muted">${esc(err.message || '')}</p><button class="btn btn-primary" onclick="location.reload()">Nochmal versuchen</button></div></div>`;
    return;
  }
  $nav.classList.remove('hidden');
  render();
}

core.onAuthChange((u) => { if (!u && !$nav.classList.contains('hidden')) location.reload(); });
init();
