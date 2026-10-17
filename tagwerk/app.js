// =============================================================
// Tagwerk – tägliche Aufgaben für Gesundheit, Produktivität & Co.
// Daten: events (app='tagwerk': erledigt, tausch, challenge),
//        app_data tagwerk/einstellungen
// Liest Gym-Trainings, Wasser/Mahlzeiten und neue Termine, um
// passende Aufgaben automatisch abzuhaken.
// =============================================================
import * as core from '../shared/core.js';
import * as push from '../shared/push.js';
import { esc, fmt, toast, sheet, bestaetigen, store, tagKey, tagStart, plusTage, wochenStart, uid } from '../shared/ui.js';
import { BEREICHE, XP, aufgabenFuer, aufgabeMitId, challengeFuer, levelAusXp, ABZEICHEN } from './aufgaben.js';

const APP = 'tagwerk';
const $app = document.getElementById('app');
const $nav = document.getElementById('nav');

let tab = 'heute';
let nutzer = '';
let E = [];                     // tagwerk-Events
let fremd = { gym: [], kal: [], termine: [] };
let cfg = { anzahl: 5, schwierigkeit: 'normal', bereiche: BEREICHE.map((b) => b.id), eigene: [] };
const P = { morgen: 7, abend: 20, aus: false };
const offen = new Set();       // aufgeklappte „Warum?“

const bereich = (id) => BEREICHE.find((b) => b.id === id) || BEREICHE[0];
const heuteStr = () => tagKey(new Date());

// ---------- Tagesdaten --------------------------------------
const erledigtAm = (d) => E.filter((e) => e.kind === 'erledigt' && e.data?.datum === d);
const tauschAm = (d) => E.filter((e) => e.kind === 'tausch' && e.data?.datum === d).sort((a, b) => new Date(a.created_at || a.starts_at) - new Date(b.created_at || b.starts_at)).map((e) => ({ alt: e.data.alt }));

function heutigeAufgaben(d = heuteStr()) {
  const liste = aufgabenFuer(d, nutzer, cfg, tauschAm(d));
  // Erledigte, die nach einer Einstellungsänderung nicht mehr in der Liste sind, trotzdem zeigen
  for (const e of erledigtAm(d)) {
    if (e.data.eigen) continue;
    const a = aufgabeMitId(e.data.id);
    if (a && !liste.some((x) => x.id === a.id)) liste.push(a);
  }
  return liste;
}

const istErledigt = (id, d = heuteStr()) => erledigtAm(d).find((e) => e.data.id === id);
const geschafftSchwelle = () => Math.max(1, Math.ceil(cfg.anzahl * 0.6));

// ---------- Statistik ---------------------------------------
function statistik() {
  const proTag = {};
  let xp = 0, gesamt = 0, schwer = 0;
  const bereiche = new Set(), proBereich = {};
  for (const e of E) {
    if (e.kind === 'erledigt') {
      xp += e.data.xp || 0;
      if (e.data.eigen) continue;
      gesamt++;
      proTag[e.data.datum] = (proTag[e.data.datum] || 0) + 1;
      bereiche.add(e.data.bereich);
      proBereich[e.data.bereich] = (proBereich[e.data.bereich] || 0) + 1;
      if (e.data.stufe === 3) schwer++;
    }
    if (e.kind === 'challenge') xp += e.data.xp || 0;
  }
  const schwelle = geschafftSchwelle();
  const geschafft = (d) => (proTag[d] || 0) >= schwelle;
  let d = heuteStr();
  if (!geschafft(d)) d = tagKey(plusTage(new Date(), -1));
  let streak = 0;
  while (geschafft(d)) { streak++; d = tagKey(plusTage(new Date(d + 'T12:00'), -1)); }
  let besterStreak = 0, lauf = 0;
  const tage = Object.keys(proTag).sort();
  if (tage.length) {
    for (let x = new Date(tage[0] + 'T12:00'); tagKey(x) <= heuteStr(); x = plusTage(x, 1)) {
      if (geschafft(tagKey(x))) { lauf++; besterStreak = Math.max(besterStreak, lauf); } else lauf = 0;
    }
  }
  const volleTage = Object.values(proTag).filter((n) => n >= cfg.anzahl).length;
  return { xp, gesamt, schwer, bereiche: bereiche.size, proBereich, proTag, streak, besterStreak, volleTage, challenges: E.filter((e) => e.kind === 'challenge').length };
}

// ---------- Fremde Apps (Auto-Erkennung) ---------------------
async function ladeFremd() {
  const ws = wochenStart(new Date());
  const heute = tagStart(new Date());
  const [gym, kal, termine] = await Promise.all([
    core.listEvents({ app: 'gym', kind: 'training', from: ws }).catch(() => []),
    core.listEvents({ app: 'kalorien', from: ws, limit: 3000 }).catch(() => []),
    core.listEvents({ app: 'kalender', kind: 'termin', limit: 5000 }).catch(() => []),
  ]);
  fremd = { gym, kal, termine: termine.filter((t) => new Date(t.created_at || 0) >= heute) };
}

function autoErfuellt(a, d = heuteStr()) {
  if (!a.auto) return false;
  const am = (liste) => liste.filter((e) => tagKey(e.starts_at) === d);
  switch (a.auto.typ) {
    case 'gym': return am(fremd.gym).length > 0;
    case 'wasser': return am(fremd.kal).filter((e) => e.kind === 'wasser').reduce((s, e) => s + (e.data?.ml || 0), 0) >= a.auto.ml;
    case 'mahlzeiten': return new Set(am(fremd.kal).filter((e) => e.kind === 'mahlzeit').map((e) => e.data?.mahlzeit)).size >= a.auto.n;
    case 'termin': return fremd.termine.length > 0;
    default: return false;
  }
}

async function autoAbhaken() {
  const neu = [];
  for (const a of heutigeAufgaben()) {
    if (!istErledigt(a.id) && autoErfuellt(a)) {
      try { await abhaken(a, true); neu.push(a); } catch { /* später nochmal */ }
    }
  }
  if (neu.length) toast(`Automatisch erkannt: ${neu.map((a) => bereich(a.bereich).icon).join(' ')} ✓`);
  await challengePruefen();
}

// ---------- Aktionen -----------------------------------------
async function eintragen(kind, data) {
  const e = await core.addEvent({ app: APP, kind, title: kind, starts_at: new Date().toISOString(), data });
  E.push(e);
  return e;
}

async function abhaken(a, auto = false) {
  await eintragen('erledigt', { id: a.id, datum: heuteStr(), xp: XP[a.stufe], bereich: a.bereich, stufe: a.stufe, auto });
  const n = erledigtAm(heuteStr()).filter((e) => !e.data.eigen).length;
  if (n === cfg.anzahl) { konfetti(); setTimeout(() => toast('Alle Aufgaben geschafft! 🎉'), 300); }
}

async function challengePruefen() {
  const ws = tagKey(wochenStart(new Date()));
  const c = challengeFuer(ws, nutzer);
  if (E.some((e) => e.kind === 'challenge' && e.data.woche === ws)) return;
  if (challengeStand(c, ws) >= c.ziel) {
    try { await eintragen('challenge', { woche: ws, id: c.id, xp: c.xp }); konfetti(); toast(`Wochen-Challenge geschafft! +${c.xp} XP 🎯`); } catch { /* egal */ }
  }
}

function challengeStand(c, ws) {
  const inWoche = (d) => d >= ws;
  const erl = E.filter((e) => e.kind === 'erledigt' && !e.data.eigen && inWoche(e.data.datum));
  switch (c.typ) {
    case 'aufgaben': return erl.length;
    case 'gym': return fremd.gym.filter((t) => tagKey(t.starts_at) >= ws).length;
    case 'volletage': { const p = {}; for (const e of erl) p[e.data.datum] = (p[e.data.datum] || 0) + 1; return Object.values(p).filter((n) => n >= cfg.anzahl).length; }
    case 'wassertage': { const p = {}; for (const e of fremd.kal) if (e.kind === 'wasser' && tagKey(e.starts_at) >= ws) p[tagKey(e.starts_at)] = (p[tagKey(e.starts_at)] || 0) + (e.data?.ml || 0); return Object.values(p).filter((ml) => ml >= 2000).length; }
    case 'bereiche': return new Set(erl.map((e) => e.data.bereich)).size;
    case 'schwer': return erl.filter((e) => e.data.stufe === 3).length;
    default: return 0;
  }
}

function konfetti() {
  const k = document.createElement('div'); k.className = 'konfetti';
  const farben = ['#7C5CFF', '#F5C542', '#3DDC84', '#FF7A9A', '#5AB8FF', '#FF7A1A'];
  k.innerHTML = Array.from({ length: 40 }, () => `<i style="left:${Math.random() * 100}%;background:${farben[Math.floor(Math.random() * farben.length)]};animation-delay:${Math.random() * 0.4}s;animation-duration:${1.3 + Math.random()}s"></i>`).join('');
  document.body.appendChild(k);
  setTimeout(() => k.remove(), 2600);
}

// ---------- Timer --------------------------------------------
function timerStarten(a) {
  const ende = Date.now() + a.timer * 60000;
  store.set('tw-timer', { id: a.id, ende, datum: heuteStr() });
  timerSheet();
}

function timerSheet() {
  const t = store.get('tw-timer'); if (!t) return;
  const a = aufgabeMitId(t.id); if (!a) { store.set('tw-timer', null); return; }
  const gesamt = a.timer * 60000;
  sheet(`<h2 style="text-align:center">${bereich(a.bereich).icon} ${esc(a.text)}</h2>
    <div class="timer-ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="var(--card2)" stroke-width="7"/>
      <circle data-kreis cx="50" cy="50" r="44" fill="none" stroke="${bereich(a.bereich).farbe}" stroke-width="7" stroke-linecap="round" stroke-dasharray="0 277"/></svg>
      <div class="mitte" data-zeit></div></div>
    <p class="muted small" style="text-align:center">Du kannst die App schließen – der Timer läuft weiter.</p>
    <div class="sheet-actions"><button class="btn btn-danger" data-a="stop">Abbrechen</button><button class="btn" data-a="zu">Minimieren</button></div>`,
  (el, close) => {
    const tick = async () => {
      const rest = t.ende - Date.now();
      if (!document.body.contains(el)) { clearInterval(iv); return; }
      if (rest <= 0) {
        clearInterval(iv); store.set('tw-timer', null); close();
        navigator.vibrate?.([200, 100, 200]);
        if (!istErledigt(a.id)) { try { await abhaken(a); } catch { /* egal */ } }
        toast('Geschafft! ⏱️ ✓'); render(); return;
      }
      const m = Math.floor(rest / 60000), s = Math.floor((rest % 60000) / 1000);
      el.querySelector('[data-zeit]').textContent = `${m}:${String(s).padStart(2, '0')}`;
      el.querySelector('[data-kreis]').setAttribute('stroke-dasharray', `${((1 - rest / gesamt) * 276.5).toFixed(1)} 277`);
    };
    const iv = setInterval(tick, 500); tick();
    el.querySelector('[data-a="stop"]').onclick = () => { clearInterval(iv); store.set('tw-timer', null); close(); render(); };
    el.querySelector('[data-a="zu"]').onclick = () => { clearInterval(iv); close(); render(); };
  });
}

async function timerPruefen() {
  const t = store.get('tw-timer'); if (!t) return;
  if (t.datum !== heuteStr()) { store.set('tw-timer', null); return; }
  if (Date.now() >= t.ende) {
    store.set('tw-timer', null);
    const a = aufgabeMitId(t.id);
    if (a && !istErledigt(a.id)) { try { await abhaken(a); toast('Timer fertig – Aufgabe erledigt ✓'); } catch { /* egal */ } }
  }
}

// ---------- Seiten -------------------------------------------
function render() {
  $nav.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  ({ heute: seiteHeute, erfolge: seiteErfolge, einstellungen: seiteEinstellungen })[tab]();
}

function ringSvg(anteil, farbe) {
  const r = 42, u = 2 * Math.PI * r;
  return `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--card2)" stroke-width="10"/>
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="${farbe}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(Math.max(0.001, Math.min(1, anteil)) * u).toFixed(1)} ${u.toFixed(1)}"/></svg>`;
}

function seiteHeute() {
  const d = heuteStr();
  const liste = heutigeAufgaben(d);
  const erl = erledigtAm(d);
  const fertig = liste.filter((a) => istErledigt(a.id, d)).length;
  const st = statistik();
  const lv = levelAusXp(st.xp);
  const xpHeute = erl.reduce((s, e) => s + (e.data.xp || 0), 0);
  const tauschUebrig = Math.max(0, 2 - tauschAm(d).length);
  const ws = tagKey(wochenStart(new Date()));
  const c = challengeFuer(ws, nutzer);
  const cStand = Math.min(c.ziel, challengeStand(c, ws));
  const cFertig = E.some((e) => e.kind === 'challenge' && e.data.woche === ws);
  const timer = store.get('tw-timer');
  const h = new Date().getHours();

  $app.innerHTML = `
    <div class="page-head"><div><div class="muted small">${new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <h1>${h < 11 ? 'Guten Morgen' : h < 18 ? 'Dein Tag' : 'Guten Abend'} ☀️</h1></div></div>

    <div class="card tag-hero">
      <div class="mini-ring">${ringSvg(fertig / Math.max(1, liste.length), fertig >= liste.length ? 'var(--ok)' : '#F5C542')}
        <div class="mitte"><div><b class="num">${fertig}/${liste.length}</b><span>erledigt</span></div></div></div>
      <div class="grow">
        <div><b>Level ${lv.level}</b> <span class="muted small">· ${fmt(st.xp, 0)} XP</span></div>
        <div class="xpbar" style="margin-top:6px"><i style="width:${Math.round(lv.fortschritt * 100)}%"></i></div>
        <div class="hero-zeile"><span>🔥 ${st.streak} ${st.streak === 1 ? 'Tag' : 'Tage'}</span><span style="color:#F5C542">+${xpHeute} XP heute</span></div>
      </div>
    </div>
    ${timer ? `<button class="btn btn-block" data-a="timer-zeigen" style="margin-top:10px;color:var(--accent2)">⏱️ Timer läuft – anzeigen</button>` : ''}

    <div class="section-title">Deine Aufgaben <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:600">${tauschUebrig} × tauschen übrig</span></div>
    ${liste.map((a) => {
      const b = bereich(a.bereich), e = istErledigt(a.id, d);
      return `<div class="aufgabe ${e ? 'fertig' : ''}" style="--b-farbe:${b.farbe}">
        <div class="bicon">${b.icon}</div>
        <div class="grow">
          <div class="titel">${esc(a.text)}</div>
          <div class="meta">
            <span class="tag xp">+${XP[a.stufe]} XP</span><span class="tag">${'●'.repeat(a.stufe)}${'○'.repeat(3 - a.stufe)}</span>
            ${a.auto ? `<span class="tag auto">⚡ automatisch</span>` : ''}
            ${e?.data.auto ? '<span class="tag auto">erkannt ✓</span>' : ''}
            ${a.timer && !e ? `<button class="mini-btn" data-a="timer" data-id="${a.id}">▶ ${a.timer} Min</button>` : ''}
            ${!e && tauschUebrig ? `<button class="mini-btn" data-a="tausch" data-id="${a.id}">↻ Tauschen</button>` : ''}
            <button class="mini-btn" data-a="warum" data-id="${a.id}" style="color:var(--muted)">${offen.has(a.id) ? 'Weniger' : 'Warum?'}</button>
          </div>
          ${offen.has(a.id) ? `<div class="warum">${esc(a.warum)}</div>` : ''}
        </div>
        <button class="haken ${e ? 'an' : ''}" data-a="haken" data-id="${a.id}" aria-label="Erledigt">✓</button>
      </div>`;
    }).join('')}

    <div class="section-title">Wochen-Challenge</div>
    <div class="card challenge">
      <div class="row"><span style="font-size:24px">🎯</span><div class="grow"><b>${esc(c.text)}</b><div class="muted small">+${c.xp} XP · endet Sonntag</div></div>${cFertig ? '<span class="pill on">Geschafft ✓</span>' : ''}</div>
      <div class="fortschritt"><i style="width:${(cStand / c.ziel) * 100}%"></i></div>
      <div class="muted small num">${cStand} / ${c.ziel}</div>
    </div>

    <div class="section-title">Feste Gewohnheiten <button data-a="tab-einst">Bearbeiten</button></div>
    <div class="card">${cfg.eigene.length ? cfg.eigene.map((g) => {
      const e = istErledigt(g.id, d);
      return `<button class="gewohnheit" data-a="eigen" data-id="${g.id}"><span class="haken ${e ? 'an' : ''}">✓</span><span class="grow" style="${e ? 'text-decoration:line-through;opacity:.6' : ''}">${esc(g.text)}</span><span class="tag xp">+5</span></button>`;
    }).join('') : '<p class="muted small" style="margin:0">Füge im Profil Dinge hinzu, die du jeden Tag machen willst – z. B. „Zähne putzen mit Zahnseide“ oder „Vitamin D nehmen“.</p>'}</div>`;
}

function seiteErfolge() {
  const st = statistik();
  const lv = levelAusXp(st.xp);
  const heute = tagStart(new Date());
  const ab = plusTage(wochenStart(heute), -77);
  let heat = '';
  for (let i = 0; i < 84; i++) {
    const d = plusTage(ab, i), k = tagKey(d), n = st.proTag[k] || 0;
    const a = Math.min(1, n / cfg.anzahl);
    heat += `<span title="${k}: ${n}" style="${d > heute ? 'opacity:0' : n ? `background:rgba(245,197,66,${0.25 + 0.75 * a})` : ''}${k === tagKey(heute) ? ';outline:2px solid var(--text);outline-offset:1px' : ''}"></span>`;
  }
  const bMax = Math.max(1, ...Object.values(st.proBereich));
  $app.innerHTML = `
    <div class="page-head"><h1>Erfolge</h1></div>
    <div class="card" style="text-align:center;padding:20px">
      <div class="muted small">Level</div><div style="font-size:52px;font-weight:900;line-height:1.1">${lv.level}</div>
      <div class="xpbar"><i style="width:${Math.round(lv.fortschritt * 100)}%"></i></div>
      <div class="muted small" style="margin-top:6px">${fmt(st.xp - lv.start, 0)} / ${fmt(lv.ende - lv.start, 0)} XP bis Level ${lv.level + 1}</div>
    </div>
    <div class="stats3" style="margin-top:10px">
      <div class="stat"><b class="num">🔥 ${st.streak}</b><span>Streak (Beste: ${st.besterStreak})</span></div>
      <div class="stat"><b class="num">${st.gesamt}</b><span>Aufgaben</span></div>
      <div class="stat"><b class="num">${st.volleTage}</b><span>Perfekte Tage</span></div>
    </div>
    <p class="muted small" style="margin:8px 2px 0">Ein Tag zählt für den Streak ab ${geschafftSchwelle()} von ${cfg.anzahl} erledigten Aufgaben.</p>

    <div class="section-title">Letzte 12 Wochen</div>
    <div class="card"><div class="heat">${heat}</div></div>

    <div class="section-title">Nach Bereichen</div>
    <div class="card">${BEREICHE.map((b) => `<div class="balken-zeile"><span>${b.icon} ${b.name}</span><div><i style="width:${((st.proBereich[b.id] || 0) / bMax) * 100}%;background:${b.farbe}"></i></div><b class="num">${st.proBereich[b.id] || 0}</b></div>`).join('')}</div>

    <div class="section-title">Abzeichen</div>
    <div class="abzeichen">${ABZEICHEN.map((a) => `<div class="${a.test(st) ? '' : 'zu'}"><b>${a.icon}</b>${a.name}</div>`).join('')}</div>`;
}

async function seiteEinstellungen() {
  $app.innerHTML = `
    <div class="page-head"><h1>Profil</h1></div>
    <div class="section-title">Aufgaben pro Tag</div>
    <div class="card">
      <div class="seg" data-seg="anzahl">${[3, 4, 5, 6].map((n) => `<button data-v="${n}" class="${cfg.anzahl === n ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="field" style="margin:14px 0 0"><span>Schwierigkeit</span>
        <div class="seg" data-seg="schwierigkeit">${[['entspannt', 'Entspannt'], ['normal', 'Normal'], ['ehrgeizig', 'Ehrgeizig']].map(([k, n]) => `<button data-v="${k}" class="${cfg.schwierigkeit === k ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    </div>

    <div class="section-title">Bereiche</div>
    <div class="card"><div class="chips">${BEREICHE.map((b) => `<button data-a="bereich" data-id="${b.id}" class="${cfg.bereiche.includes(b.id) ? 'on' : ''}">${b.icon} ${b.name}</button>`).join('')}</div>
      <p class="muted small" style="margin:10px 0 0">Mindestens 2 Bereiche. Änderungen wirken sofort auf die heutigen Aufgaben.</p></div>

    <div class="section-title">Feste Gewohnheiten</div>
    <div class="card">
      ${cfg.eigene.map((g) => `<div class="row" style="padding:6px 0;border-bottom:1px solid var(--line)"><span class="grow">${esc(g.text)}</span><button class="icon-btn" data-a="eigen-weg" data-id="${g.id}" style="color:var(--danger)" aria-label="Entfernen">×</button></div>`).join('')}
      <div style="display:flex;gap:8px;margin-top:10px"><input class="search" data-neu placeholder="z. B. Vitamin D nehmen" maxlength="80"><button class="btn btn-primary" data-a="eigen-neu">+</button></div>
    </div>

    <div class="section-title">Mitteilungen</div>
    <div class="card" id="push-karte"><div class="muted small">Wird geprüft …</div></div>

    <div class="section-title">Konto</div>
    <a class="list-item" href="../" style="text-decoration:none;color:inherit"><span class="grow">← Alle Apps</span></a>
    <button class="list-item" data-a="logout" style="color:var(--danger)"><span class="grow">Abmelden</span></button>`;

  $app.querySelectorAll('[data-seg] button').forEach((b) => b.onclick = async () => {
    const k = b.closest('[data-seg]').dataset.seg;
    cfg[k] = k === 'anzahl' ? Number(b.dataset.v) : b.dataset.v;
    await speichereCfg(); render();
  });
  const el = document.getElementById('push-karte');
  if (!push.unterstuetzt()) {
    el.innerHTML = push.istIOS && !push.alsAppGestartet ? '<p style="margin:0">📱 Am iPhone erst über <b>Teilen → Zum Home-Bildschirm</b> hinzufügen und von dort öffnen.</p>' : '<p class="muted" style="margin:0">Dieser Browser unterstützt keine Mitteilungen.</p>';
    return;
  }
  if (!(await push.aktiv())) {
    el.innerHTML = `<p style="margin:0 0 12px">Morgens deine neuen Aufgaben, abends eine Erinnerung, wenn noch etwas offen ist.</p><button class="btn btn-primary btn-block" data-a="push-an">🔔 Mitteilungen aktivieren</button>`;
    return;
  }
  const opt = (sel, von, bis) => Array.from({ length: bis - von + 1 }, (_, i) => i + von).map((h) => `<option value="${h}" ${h === sel ? 'selected' : ''}>${h}:00 Uhr</option>`).join('');
  el.innerHTML = `<label class="check-row"><input type="checkbox" data-p="aus" ${P.aus ? '' : 'checked'}> Tagwerk-Mitteilungen</label>
    <div class="portion-row" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">
      <label class="field" style="margin:0"><span>Morgens</span><select data-p="morgen">${opt(P.morgen, 5, 11)}</select></label>
      <label class="field" style="margin:0"><span>Abends (falls offen)</span><select data-p="abend">${opt(P.abend, 17, 23)}</select></label></div>`;
  el.querySelectorAll('[data-p]').forEach((inp) => inp.onchange = async () => {
    const k = inp.dataset.p;
    const patch = k === 'aus' ? { tw_push_aus: !inp.checked } : { [`tw_push_${k}`]: Number(inp.value) };
    try { await core.updateSettings(patch); if (k === 'aus') P.aus = !inp.checked; else P[k] = Number(inp.value); toast('Gespeichert ✓'); } catch { toast('Speichern fehlgeschlagen', true); }
  });
}

async function speichereCfg() {
  try {
    await core.setAppData(APP, 'einstellungen', cfg);
    await core.updateSettings({ tw_aktiv: true, tw_anzahl: cfg.anzahl });
  } catch { toast('Speichern fehlgeschlagen', true); }
}

// ---------- Klicks -------------------------------------------
$app.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a, id = b.dataset.id;
  if (a === 'haken') {
    const auf = aufgabeMitId(id); const vorh = istErledigt(id);
    b.disabled = true;
    try {
      if (vorh) { await core.deleteEvent(vorh.id); E = E.filter((x) => x.id !== vorh.id); }
      else { await abhaken(auf); navigator.vibrate?.(20); await challengePruefen(); }
    } catch { toast('Speichern fehlgeschlagen', true); }
    const y = window.scrollY; render(); window.scrollTo(0, y);
  }
  if (a === 'eigen') {
    const g = cfg.eigene.find((x) => x.id === id); const vorh = istErledigt(id);
    try {
      if (vorh) { await core.deleteEvent(vorh.id); E = E.filter((x) => x.id !== vorh.id); }
      else await eintragen('erledigt', { id, datum: heuteStr(), xp: 5, eigen: true, text: g?.text });
    } catch { toast('Speichern fehlgeschlagen', true); }
    const y = window.scrollY; render(); window.scrollTo(0, y);
  }
  if (a === 'warum') { offen.has(id) ? offen.delete(id) : offen.add(id); const y = window.scrollY; render(); window.scrollTo(0, y); }
  if (a === 'tausch') {
    if (!(await bestaetigen('Aufgabe tauschen?', 'Du bekommst eine andere Aufgabe aus dem gleichen Bereich. 2 Tausche pro Tag.', 'Tauschen', false))) return;
    try { await eintragen('tausch', { datum: heuteStr(), alt: id }); } catch { toast('Tauschen fehlgeschlagen', true); }
    render();
  }
  if (a === 'timer') timerStarten(aufgabeMitId(id));
  if (a === 'timer-zeigen') timerSheet();
  if (a === 'tab-einst') { tab = 'einstellungen'; render(); window.scrollTo(0, 0); }
  if (a === 'bereich') {
    const neu = cfg.bereiche.includes(id) ? cfg.bereiche.filter((x) => x !== id) : [...cfg.bereiche, id];
    if (neu.length < 2) { toast('Mindestens 2 Bereiche', true); return; }
    cfg.bereiche = neu; await speichereCfg(); render();
  }
  if (a === 'eigen-neu') {
    const inp = $app.querySelector('[data-neu]'); const v = inp.value.trim(); if (!v) return;
    cfg.eigene = [...cfg.eigene, { id: 'eigen-' + uid(), text: v }]; await speichereCfg(); render();
  }
  if (a === 'eigen-weg') { cfg.eigene = cfg.eigene.filter((x) => x.id !== id); await speichereCfg(); render(); }
  if (a === 'push-an') {
    b.disabled = true; b.textContent = '…';
    try { await push.aktivieren('tagwerk'); await core.updateSettings({ tw_push_aus: false, tw_aktiv: true, tw_anzahl: cfg.anzahl }); P.aus = false; toast('Mitteilungen aktiviert 🔔'); } catch (err) { toast(err.message, true); }
    render();
  }
  if (a === 'logout') core.logout();
});

$nav.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  tab = b.dataset.tab; render(); window.scrollTo(0, 0);
});

let letzterTag = heuteStr();
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || $nav.classList.contains('hidden')) return;
  try {
    await ladeFremd(); await timerPruefen(); await autoAbhaken();
    if (heuteStr() !== letzterTag) letzterTag = heuteStr();
    if (!document.querySelector('.backdrop')) render();
  } catch { /* offline */ }
});

// ---------- Start --------------------------------------------
async function init() {
  const user = await core.getUser();
  if (!user) { core.renderLogin($app, { appName: 'Tagwerk', onDone: () => location.reload() }); return; }
  nutzer = user.id;
  try {
    const [c, ev, profil] = await Promise.all([
      core.getAppData(APP, 'einstellungen', null),
      core.listEvents({ app: APP, limit: 5000 }),
      core.getProfile(),
      ladeFremd(),
    ]);
    E = ev;
    if (c) cfg = { ...cfg, ...c };
    else await speichereCfg();
    const st = profil?.settings || {};
    P.morgen = st.tw_push_morgen ?? 7; P.abend = st.tw_push_abend ?? 20; P.aus = !!st.tw_push_aus;
  } catch (err) {
    console.error(err);
    $app.innerHTML = `<div class="loading"><div style="text-align:center;max-width:340px"><h2>Verbindung fehlgeschlagen</h2>
      <p class="muted">${esc(err.message || '')}</p><button class="btn btn-primary" onclick="location.reload()">Nochmal versuchen</button></div></div>`;
    return;
  }
  $nav.classList.remove('hidden');
  push.zuordnen('tagwerk');
  await timerPruefen();
  render();
  await autoAbhaken();
  render();
  if (store.get('tw-timer')) timerSheet();
}

core.onAuthChange((u) => { if (!u && !$nav.classList.contains('hidden')) location.reload(); });
init();
