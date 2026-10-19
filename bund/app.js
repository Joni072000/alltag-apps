// =============================================================
// Bund – jeden Tag eine Sport-Challenge im Bundeswehr-Stil
// Daten: events (app='bund'):
//   ergebnis        { datum, status: 'geschafft'|'verpasst' }
//   strafe_erledigt { datum }   (Datum des verpassten Tages)
//   test            { datum, pendel, hang, lauf }  (Sekunden)
// app_data bund/einstellungen { start: 'YYYY-MM-DD' }
// Stufe, Strafen und Dienstgrad werden jedes Mal aus dem Verlauf berechnet.
// =============================================================
import * as core from '../shared/core.js';
import * as push from '../shared/push.js';
import { esc, fmt, toast, sheet, bestaetigen, tagKey, plusTage, wochenStart } from '../shared/ui.js';
import { BFT, dienstgrad, challengeFuer, strafeFuer, spruch, mmss, MAX_STRAFEN } from './plan.js';

const APP = 'bund';
const $app = document.getElementById('app');
const $nav = document.getElementById('nav');
const PLAN_TAGE = 84;

let tab = 'heute';
let E = [];
let cfg = null;
const P = { morgen: 7, abend: 19, aus: false };
const offenInfo = new Set();

const heuteStr = () => tagKey(new Date());
const tagDatum = (k) => new Date(k + 'T12:00');
const naechsterTag = (k) => tagKey(plusTage(tagDatum(k), 1));

// ---------- Verlauf berechnen ---------------------------------
function ergebnisAm(d) {
  const l = E.filter((e) => e.kind === 'ergebnis' && e.data?.datum === d);
  return l.sort((a, b) => new Date(b.created_at || b.starts_at) - new Date(a.created_at || a.starts_at))[0] || null;
}
const strafeErledigt = (d) => E.find((e) => e.kind === 'strafe_erledigt' && e.data?.datum === d) || null;
const testAm = (d) => E.find((e) => e.kind === 'test' && e.data?.datum === d) || null;

/**
 * Spielt alle Tage seit dem Start durch.
 * Geschafft: Stufe +1. Verpasst (oder nicht eingetragen): Strafe.
 * 3 verpasste Tage in Folge: Rückstufung um 2 Stufen, danach jeder weitere Tag −1.
 * Mehr als 3 offene Strafen: die älteste verfällt, dafür −1 Stufe.
 */
function verlauf() {
  const heute = heuteStr();
  const tage = [];
  const strafen = [];
  let L = 0, folgeVerpasst = 0;
  if (!cfg?.start) return { L, tage, strafen, heute: null };
  for (let d = cfg.start, nr = 1; d <= heute; d = naechsterTag(d), nr++) {
    const c = challengeFuer(nr, d, L);
    const erg = ergebnisAm(d);
    const tag = { datum: d, nr, c, stufeVorher: L, status: 'offen', hinweis: null };
    if (d === heute && !erg) { tage.push(tag); break; }
    let status = erg?.data?.status || 'verpasst';
    if (c.ruhe && status !== 'geschafft') status = 'ruhe';
    tag.status = status;
    if (status === 'geschafft') {
      L += c.ruhe ? 0 : 1;
      folgeVerpasst = 0;
    } else if (status === 'verpasst') {
      folgeVerpasst++;
      if (folgeVerpasst <= 3) {
        const offene = strafen.filter((s) => !s.verfallen && !(s.erledigt && tagKey(s.erledigt.starts_at) <= d));
        let neue = true;
        if (offene.length >= MAX_STRAFEN) {
          if (folgeVerpasst < 3) {
            offene[0].verfallen = true;
            L = Math.max(0, L - 1);
            tag.hinweis = 'Älteste Strafe verfallen · −1 Stufe';
          } else neue = false;   // am 3. Tag kommt stattdessen die Rückstufung
        }
        if (neue) strafen.push({ datum: d, ...strafeFuer(d, L), erledigt: strafeErledigt(d), verfallen: false });
      }
      if (folgeVerpasst === 3) { L = Math.max(0, L - 2); tag.hinweis = 'Rückstufung: 3 Tage verpasst · −2 Stufen'; }
      else if (folgeVerpasst > 3) { L = Math.max(0, L - 1); tag.hinweis = 'Weiter verpasst · −1 Stufe'; }
    }
    tag.stufeNachher = L;
    tage.push(tag);
  }
  const letzter = tage.at(-1) || null;
  return { L, tage, strafen, heute: letzter?.datum === heute ? letzter : null, folgeVerpasst };
}

function streak(v) {
  let n = 0;
  const liste = [...v.tage].reverse();
  for (const t of liste) {
    if (t.status === 'offen') continue;      // heute noch nicht entschieden
    if (t.status === 'ruhe') continue;       // Ruhetage unterbrechen nicht
    if (t.status === 'geschafft') n++; else break;
  }
  return n;
}

function besterStreak(v) {
  let n = 0, best = 0;
  for (const t of v.tage) {
    if (t.status === 'geschafft') { n++; best = Math.max(best, n); }
    else if (t.status === 'verpasst') n = 0;
  }
  return best;
}

const tests = () => E.filter((e) => e.kind === 'test' && cfg?.start && e.data?.datum >= cfg.start)
  .sort((a, b) => a.data.datum.localeCompare(b.data.datum));

function bestwerte() {
  const b = {};
  for (const t of tests()) for (const x of BFT) {
    const v = t.data[x.id];
    if (v == null) continue;
    if (b[x.id] == null || (x.besserWenig ? v < b[x.id] : v > b[x.id])) b[x.id] = v;
  }
  return b;
}

// ---------- Aktionen ------------------------------------------
async function eintragen(kind, data) {
  const e = await core.addEvent({ app: APP, kind, title: kind, starts_at: new Date().toISOString(), data });
  E.push(e);
  return e;
}

async function ergebnisSetzen(status) {
  const d = heuteStr();
  const alt = ergebnisAm(d);
  if (alt) { await core.deleteEvent(alt.id); E = E.filter((x) => x.id !== alt.id); }
  await eintragen('ergebnis', { datum: d, status });
}

async function heuteLoeschen(arten) {
  const d = heuteStr();
  for (const e of E.filter((x) => arten.includes(x.kind) && x.data?.datum === d)) {
    await core.deleteEvent(e.id);
    E = E.filter((x) => x.id !== e.id);
  }
}
const rueckgaengig = () => heuteLoeschen(['ergebnis', 'test']);

function konfetti() {
  const k = document.createElement('div'); k.className = 'konfetti';
  const farben = ['#8BC34A', '#C9B26B', '#5E7A35', '#F2F4F8', '#A5C46A'];
  k.innerHTML = Array.from({ length: 36 }, () => `<i style="left:${Math.random() * 100}%;background:${farben[Math.floor(Math.random() * farben.length)]};animation-delay:${Math.random() * 0.4}s;animation-duration:${1.3 + Math.random()}s"></i>`).join('');
  document.body.appendChild(k);
  setTimeout(() => k.remove(), 2600);
}

function zeitLesen(v) {
  const s = String(v || '').trim().replace(',', '.');
  if (!s) return null;
  if (s.includes(':')) { const [m, x] = s.split(':'); const n = Number(m) * 60 + Number(x); return Number.isFinite(n) && n > 0 ? n : NaN; }
  const n = Number(s); return Number.isFinite(n) && n > 0 ? n : NaN;
}

function testEintragen() {
  sheet(`<h2>Testergebnisse</h2>
    <p class="muted small" style="margin:-4px 0 14px">Lass ein Feld leer, wenn du eine Disziplin nicht gemacht hast.</p>
    <label class="field"><span>Pendellauf 11 × 10 m – Sekunden</span><input data-t="pendel" inputmode="decimal" placeholder="z. B. 58,4"></label>
    <label class="field"><span>Klimmhang – Sekunden</span><input data-t="hang" inputmode="decimal" placeholder="z. B. 8"></label>
    <label class="field"><span>1000-m-Lauf – Minuten:Sekunden</span><input data-t="lauf" inputmode="text" placeholder="z. B. 6:45"></label>
    <div class="sheet-actions"><button class="btn" data-a="zu">Abbrechen</button><button class="btn btn-primary" data-a="ok">Speichern</button></div>`,
  (el, close) => {
    el.querySelector('[data-a="zu"]').onclick = close;
    el.querySelector('[data-a="ok"]').onclick = async (ev) => {
      const w = {};
      for (const k of ['pendel', 'hang', 'lauf']) {
        const v = zeitLesen(el.querySelector(`[data-t="${k}"]`).value);
        if (Number.isNaN(v)) { toast('Bitte nur Zahlen eintragen (1000 m z. B. 6:45)', true); return; }
        w[k] = v == null ? null : Math.round(v * 10) / 10;
      }
      if (w.pendel == null && w.hang == null && w.lauf == null) { toast('Mindestens einen Wert eintragen', true); return; }
      ev.target.disabled = true;
      try {
        if (!testAm(heuteStr())) await eintragen('test', { datum: heuteStr(), ...w });
        await ergebnisSetzen('geschafft');
        close(); konfetti(); toast('Test gespeichert ✓'); render();
      } catch { ev.target.disabled = false; toast('Speichern fehlgeschlagen', true); }
    };
  });
}

// ---------- Darstellung ---------------------------------------
function render() {
  $nav.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  ({ heute: seiteHeute, verlauf: seiteVerlauf, profil: seiteProfil })[tab]();
}

function teileHtml(c, d) {
  return c.teile.map((t, i) => {
    const k = `${d}-${i}`;
    return `<div class="bund-teil">
      <button class="bund-teil-kopf" data-a="info" data-id="${k}"><span class="grow">${esc(t.text)}</span><span class="bund-wie">${offenInfo.has(k) ? '−' : 'Wie?'}</span></button>
      ${offenInfo.has(k) ? `<div class="bund-info">${esc(t.info)}</div>` : ''}
    </div>`;
  }).join('');
}

function bftHtml() {
  const b = bestwerte();
  const letzte = tests().at(-1);
  return BFT.map((x) => {
    const v = letzte?.data?.[x.id] ?? null, best = b[x.id] ?? null;
    const anzeige = (n) => (n == null ? '–' : x.id === 'lauf' ? mmss(n) : `${fmt(n)} s`);
    const zielText = x.id === 'lauf' ? mmss(x.ziel) : `${x.ziel} s`;
    let anteil = 0, ok = false;
    if (best != null) {
      ok = x.besserWenig ? best <= x.ziel : best >= x.ziel;
      anteil = x.besserWenig ? Math.min(1, x.ziel / best) : Math.min(1, best / x.ziel);
    }
    return `<div class="bft-zeile">
      <div class="row" style="gap:8px"><span class="grow">${x.name}</span>${ok ? '<span class="pill bund-ok">bestanden</span>' : ''}<span class="muted small">Ziel ${x.besserWenig ? '≤' : '≥'} ${zielText}</span></div>
      <div class="bund-balken"><i style="width:${Math.round(anteil * 100)}%;${ok ? 'background:var(--ok)' : ''}"></i></div>
      <div class="muted small">Zuletzt: <b style="color:var(--text)">${anzeige(v)}</b> · Bestwert: ${anzeige(best)}</div>
    </div>`;
  }).join('');
}

function seiteHeute() {
  const v = verlauf();
  const t = v.heute;
  const d = heuteStr();
  if (!t) { $app.innerHTML = '<div class="empty" style="margin-top:40px">Deine Ausbildung beginnt erst später. Starte sie im Profil neu, um heute anzufangen.</div>'; return; }
  const dg = dienstgrad(v.L);
  const st = streak(v);
  const offeneStrafen = v.strafen.filter((s) => !s.erledigt && !s.verfallen);
  const nr = t?.nr || 1;
  const c = t?.c;
  const status = t?.status || 'offen';
  const morgenNr = nr + 1, morgenDatum = naechsterTag(d);
  const morgen = challengeFuer(morgenNr, morgenDatum, v.L);
  const warnung = v.folgeVerpasst >= 2 && status === 'offen';

  let aktion;
  if (status === 'geschafft') {
    aktion = `<div class="bund-erledigt"><b>✓ ${c.ruhe ? 'Erholt' : 'Auftrag erfüllt'}</b><div class="small" style="opacity:.85;margin-top:2px">${esc(spruch(c.ruhe ? 'ruhe' : 'geschafft', d))}</div></div>
      <button class="bund-link" data-a="rueck">Rückgängig</button>`;
  } else if (status === 'verpasst') {
    aktion = `<div class="bund-erledigt bund-verpasst"><b>✗ Nicht geschafft</b><div class="small" style="opacity:.85;margin-top:2px">${esc(spruch('verpasst', d))}</div></div>
      <button class="bund-link" data-a="rueck">Rückgängig</button>`;
  } else {
    aktion = `<button class="bund-haupt" data-a="${c.test ? 'test' : 'geschafft'}">${c.test ? 'Ergebnisse eintragen' : c.ruhe ? 'Gedehnt ✓' : 'Geschafft'}</button>
      ${c.ruhe ? '' : '<button class="bund-link" data-a="verpasst">Nicht geschafft</button>'}`;
  }

  $app.innerHTML = `
    <div class="page-head"><div><div class="muted small">${new Date().toLocaleDateString('de-DE', { weekday: 'long' })} · Tag ${nr}</div><h1>Bund</h1></div>
      <span class="pill bund-streak">🔥 ${st}</span></div>

    ${warnung ? `<div class="card bund-warn">⚠️ ${v.folgeVerpasst} Tage in Folge verpasst. ${v.folgeVerpasst === 2 ? 'Verpasst du heute auch, wirst du um 2 Stufen zurückgestuft.' : 'Du wurdest zurückgestuft – jeder weitere verpasste Tag kostet eine Stufe.'}</div>` : ''}

    <div class="bund-hero ${c.ruhe ? 'ruhe' : ''} ${c.test ? 'test' : ''}">
      <div class="bund-label">${c.test ? 'Heute: ' + esc(c.titel) : 'Heutige Challenge'} · ${c.icon} ${c.test ? 'BFT' : esc(c.titel)}</div>
      <div class="bund-teile">${teileHtml(c, d)}</div>
      <div class="small" style="opacity:.8;margin:10px 0 14px">ca. ${c.dauer} min${c.hinweis ? ' · ' + esc(c.hinweis) : ''}</div>
      ${aktion}
    </div>

    ${offeneStrafen.length ? `<div class="section-title">Strafen <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:600">${offeneStrafen.length} / ${MAX_STRAFEN} offen</span></div>
      ${offeneStrafen.map((s) => `<div class="bund-strafe">
        <div class="bicon">${s.icon}</div>
        <div class="grow"><div style="font-weight:700;line-height:1.35">${esc(s.text)}</div><div class="muted small" style="margin-top:3px">für ${new Date(s.datum + 'T12:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })} · ${s.art === 'sport' ? 'Sport-Strafe' : 'Bund-Dienst'}</div></div>
        <button class="btn btn-ok" data-a="strafe" data-id="${s.datum}" style="padding:9px 12px">Erledigt</button></div>`).join('')}` : ''}

    <div class="stats3" style="margin-top:16px">
      <div class="stat"><b class="num">${dg.name}</b><span>Dienstgrad</span></div>
      <div class="stat"><b class="num">${nr <= PLAN_TAGE ? `${nr}/${PLAN_TAGE}` : nr}</b><span>${nr <= PLAN_TAGE ? 'Tage' : 'Tage im Dienst'}</span></div>
      <div class="stat"><b class="num">${offeneStrafen.length}</b><span>Strafen offen</span></div>
    </div>
    <div class="card" style="margin-top:10px">
      <div class="row"><span class="grow small"><b>Stufe ${v.L}</b> <span class="muted">· ${dg.naechster ? `noch ${dg.naechster.ab - v.L} bis ${dg.naechster.name}` : 'höchster Dienstgrad'}</span></span></div>
      <div class="bund-balken" style="margin-top:8px"><i style="width:${Math.round(dg.fortschritt * 100)}%"></i></div>
    </div>

    <div class="section-title">Basis-Fitness-Test</div>
    <div class="card">${tests().length ? bftHtml() : '<p class="muted small" style="margin:0">Nach deinem ersten Test siehst du hier, wie weit du von der Mindestanforderung entfernt bist.</p>'}</div>

    <div class="section-title">Morgen</div>
    <div class="list-item"><span style="font-size:20px">${morgen.icon}</span><span class="grow"><b>${esc(morgen.titel)}</b><br><span class="muted small">${morgen.teile.map((x) => esc(x.text)).join(' · ')}</span></span></div>`;
}

function seiteVerlauf() {
  const v = verlauf();
  const heute = heuteStr();
  const geschafft = v.tage.filter((t) => t.status === 'geschafft' && !t.c.ruhe).length;
  const verpasst = v.tage.filter((t) => t.status === 'verpasst').length;
  const ab = wochenStart(tagDatum(heute));
  const start = plusTage(ab, -77);
  const proTag = Object.fromEntries(v.tage.map((t) => [t.datum, t]));
  let heat = '';
  for (let i = 0; i < 84; i++) {
    const k = tagKey(plusTage(start, i)), t = proTag[k];
    const farbe = !t ? '' : t.status === 'geschafft' ? (t.c.test ? '#C9B26B' : 'var(--ok)') : t.status === 'verpasst' ? 'var(--danger)' : t.status === 'ruhe' ? '#3A4255' : '';
    heat += `<span title="${k}" style="${k > heute ? 'opacity:0' : farbe ? `background:${farbe}` : ''}${k === heute ? ';outline:2px solid var(--text);outline-offset:1px' : ''}"></span>`;
  }
  const alleStrafen = [...v.strafen].reverse();
  const tl = tests();
  $app.innerHTML = `
    <div class="page-head"><h1>Verlauf</h1></div>
    <div class="stats3">
      <div class="stat"><b class="num">${geschafft}</b><span>Geschafft</span></div>
      <div class="stat"><b class="num">${verpasst}</b><span>Verpasst</span></div>
      <div class="stat"><b class="num">🔥 ${besterStreak(v)}</b><span>Beste Serie</span></div>
    </div>

    <div class="section-title">Letzte 12 Wochen</div>
    <div class="card"><div class="heat">${heat}</div>
      <div class="bund-legende"><span><i style="background:var(--ok)"></i>geschafft</span><span><i style="background:var(--danger)"></i>verpasst</span><span><i style="background:#C9B26B"></i>Test</span><span><i style="background:#3A4255"></i>Ruhetag</span></div></div>

    <div class="section-title">Tests</div>
    ${tl.length ? `<div class="card" style="padding:0;overflow:hidden"><table class="bund-tab">
      <tr><th>Datum</th><th>Pendel</th><th>Hang</th><th>1000 m</th></tr>
      ${[...tl].reverse().map((t) => `<tr><td>${new Date(t.data.datum + 'T12:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}</td>
        <td>${t.data.pendel != null ? fmt(t.data.pendel) + ' s' : '–'}</td><td>${t.data.hang != null ? fmt(t.data.hang) + ' s' : '–'}</td><td>${t.data.lauf != null ? mmss(t.data.lauf) : '–'}</td></tr>`).join('')}
    </table></div>` : '<div class="empty">Noch kein Test gemacht. Alle 14 Tage gibt es einen Probe-Test.</div>'}

    <div class="section-title">Ereignisse</div>
    ${v.tage.filter((t) => t.hinweis).reverse().slice(0, 10).map((t) => `<div class="list-item"><span>📉</span><span class="grow small"><b>${new Date(t.datum + 'T12:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}</b> · ${esc(t.hinweis)}</span></div>`).join('') || '<p class="muted small">Keine Rückstufungen – weiter so.</p>'}

    <div class="section-title">Strafbuch</div>
    ${alleStrafen.length ? alleStrafen.slice(0, 30).map((s) => `<div class="list-item"><span>${s.icon}</span><span class="grow small" style="${s.erledigt || s.verfallen ? 'opacity:.6' : ''}">${esc(s.text)}<br><span class="muted">${new Date(s.datum + 'T12:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} · ${s.erledigt ? 'abgeleistet ✓' : s.verfallen ? 'verfallen (−1 Stufe)' : 'offen'}</span></span></div>`).join('') : '<p class="muted small">Noch keine Strafen. Sauber.</p>'}`;
}

async function seiteProfil() {
  $app.innerHTML = `
    <div class="page-head"><h1>Profil</h1></div>
    <div class="section-title">So funktioniert Bund</div>
    <div class="card small" style="line-height:1.55">${regelnHtml()}</div>

    <div class="section-title">Mitteilungen</div>
    <div class="card" id="push-karte"><div class="muted small">Wird geprüft …</div></div>

    <div class="section-title">Ausbildung</div>
    <div class="card small"><div>Gestartet am <b>${new Date(cfg.start + 'T12:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}</b></div>
      <button class="btn btn-danger btn-block" data-a="neustart" style="margin-top:12px">Ausbildung neu starten</button></div>

    <div class="section-title">Konto</div>
    <a class="list-item" href="../" style="text-decoration:none;color:inherit"><span class="grow">← Alle Apps</span></a>
    <button class="list-item" data-a="logout" style="color:var(--danger)"><span class="grow">Abmelden</span></button>`;

  const el = document.getElementById('push-karte');
  if (!push.unterstuetzt()) {
    el.innerHTML = push.istIOS && !push.alsAppGestartet ? '<p style="margin:0">📱 Am iPhone erst über <b>Teilen → Zum Home-Bildschirm</b> hinzufügen und von dort öffnen.</p>' : '<p class="muted" style="margin:0">Dieser Browser unterstützt keine Mitteilungen.</p>';
    return;
  }
  if (!(await push.aktiv())) {
    el.innerHTML = `<p style="margin:0 0 12px">Morgens dein Tagesbefehl, abends eine Erinnerung, falls die Challenge noch offen ist.</p><button class="btn btn-primary btn-block" data-a="push-an">🔔 Mitteilungen aktivieren</button>`;
    return;
  }
  const opt = (sel, von, bis) => Array.from({ length: bis - von + 1 }, (_, i) => i + von).map((h) => `<option value="${h}" ${h === sel ? 'selected' : ''}>${h}:00 Uhr</option>`).join('');
  el.innerHTML = `<label class="check-row"><input type="checkbox" data-p="aus" ${P.aus ? '' : 'checked'}> Bund-Mitteilungen</label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">
      <label class="field" style="margin:0"><span>Tagesbefehl</span><select data-p="morgen">${opt(P.morgen, 5, 11)}</select></label>
      <label class="field" style="margin:0"><span>Erinnerung (falls offen)</span><select data-p="abend">${opt(P.abend, 16, 22)}</select></label></div>`;
  el.querySelectorAll('[data-p]').forEach((inp) => inp.onchange = async () => {
    const k = inp.dataset.p;
    const patch = k === 'aus' ? { bund_push_aus: !inp.checked } : { [`bund_push_${k}`]: Number(inp.value) };
    try { await core.updateSettings(patch); if (k === 'aus') P.aus = !inp.checked; else P[k] = Number(inp.value); toast('Gespeichert ✓'); } catch { toast('Speichern fehlgeschlagen', true); }
  });
}

function regelnHtml() {
  return `<div>📋 Jeden Tag eine Challenge, ca. 10–20 Minuten. Mit jeder geschafften wird die nächste ein Stück schwerer.</div>
    <div style="margin-top:6px">🛏️ Sonntag ist Ruhetag – Dehnen ist freiwillig.</div>
    <div style="margin-top:6px">⏱️ Am ersten Tag und dann alle 14 Tage: Probe-Test wie beim Basis-Fitness-Test.</div>
    <div style="margin-top:6px">⚠️ Verpasst oder nicht eingetragen = Strafe (Sport oder Bund-Dienst). Höchstens ${MAX_STRAFEN} offen.</div>
    <div style="margin-top:6px">📉 3 Tage in Folge verpasst = Rückstufung, die Challenges werden wieder leichter.</div>
    <div style="margin-top:6px">🩹 Bei Schmerzen sofort abbrechen – das ist kein Versagen. Bist du krank, trag „Nicht geschafft“ ein und erhol dich.</div>`;
}

function willkommen() {
  sheet(`<div style="text-align:center;font-size:44px;margin-top:4px">🪖</div>
    <h2 style="text-align:center">Willkommen zur Grundausbildung</h2>
    <p class="muted small" style="text-align:center;margin:6px 0 14px">12 Wochen Vorbereitung auf den Basis-Fitness-Test und den Sport bei der Bundeswehr. Du startest auf Einsteiger-Niveau.</p>
    <div class="card small" style="line-height:1.55">${regelnHtml()}</div>
    <div class="sheet-actions"><button class="btn btn-primary btn-block btn-lg" data-a="los">Dienst antreten</button></div>`,
  (el, close) => {
    el.querySelector('[data-a="los"]').onclick = async (ev) => {
      ev.target.disabled = true;
      try { await starten(heuteStr()); close(); render(); }
      catch { ev.target.disabled = false; toast('Speichern fehlgeschlagen', true); }
    };
  }, () => { if (!cfg) setTimeout(willkommen, 50); });
}

async function starten(datum) {
  cfg = { ...(cfg || {}), start: datum };
  await core.setAppData(APP, 'einstellungen', cfg);
  await core.updateSettings({ bund_aktiv: true, bund_start: datum });
}

// ---------- Klicks --------------------------------------------
$app.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a, id = b.dataset.id;
  const neuZeichnen = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };
  if (a === 'info') { offenInfo.has(id) ? offenInfo.delete(id) : offenInfo.add(id); neuZeichnen(); return; }
  if (a === 'geschafft') {
    b.disabled = true;
    try { await ergebnisSetzen('geschafft'); navigator.vibrate?.(30); konfetti(); } catch { toast('Speichern fehlgeschlagen', true); }
    neuZeichnen();
  }
  if (a === 'verpasst') {
    if (!(await bestaetigen('Nicht geschafft?', 'Dafür gibt es eine Strafe. Du kannst es heute noch rückgängig machen.', 'Eintragen'))) return;
    try { await ergebnisSetzen('verpasst'); } catch { toast('Speichern fehlgeschlagen', true); }
    neuZeichnen();
  }
  if (a === 'test') testEintragen();
  if (a === 'rueck') {
    try { await rueckgaengig(); } catch { toast('Rückgängig fehlgeschlagen', true); }
    neuZeichnen();
  }
  if (a === 'strafe') {
    b.disabled = true;
    try { await eintragen('strafe_erledigt', { datum: id }); toast('Strafe abgeleistet ✓'); } catch { toast('Speichern fehlgeschlagen', true); }
    neuZeichnen();
  }
  if (a === 'neustart') {
    if (!(await bestaetigen('Ausbildung neu starten?', 'Du fängst wieder bei Tag 1 als Rekrut an. Offene Strafen werden gelöscht, alte Einträge bleiben gespeichert.', 'Neu starten'))) return;
    try { await heuteLoeschen(['ergebnis', 'test', 'strafe_erledigt']); await starten(heuteStr()); tab = 'heute'; render(); toast('Neustart – Tag 1 🪖'); } catch { toast('Speichern fehlgeschlagen', true); }
  }
  if (a === 'push-an') {
    b.disabled = true; b.textContent = '…';
    try { await push.aktivieren('bund'); await core.updateSettings({ bund_push_aus: false, bund_aktiv: true }); P.aus = false; toast('Mitteilungen aktiviert 🔔'); } catch (err) { toast(err.message, true); }
    render();
  }
  if (a === 'logout') core.logout();
});

$nav.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  tab = b.dataset.tab; render(); window.scrollTo(0, 0);
});

let letzterTag = heuteStr();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !cfg || $nav.classList.contains('hidden')) return;
  if (heuteStr() !== letzterTag) { letzterTag = heuteStr(); offenInfo.clear(); }
  if (!document.querySelector('.backdrop')) render();
});

// ---------- Start ---------------------------------------------
async function init() {
  const user = await core.getUser();
  if (!user) { core.renderLogin($app, { appName: 'Bund', onDone: () => location.reload() }); return; }
  try {
    const [c, ev, profil] = await Promise.all([
      core.getAppData(APP, 'einstellungen', null),
      core.listEvents({ app: APP, limit: 5000 }),
      core.getProfile(),
    ]);
    cfg = c?.start ? c : null;
    E = ev;
    const st = profil?.settings || {};
    P.morgen = st.bund_push_morgen ?? 7; P.abend = st.bund_push_abend ?? 19; P.aus = !!st.bund_push_aus;
  } catch (err) {
    console.error(err);
    $app.innerHTML = `<div class="loading"><div style="text-align:center;max-width:340px"><h2>Verbindung fehlgeschlagen</h2>
      <p class="muted">${esc(err.message || '')}</p><button class="btn btn-primary" onclick="location.reload()">Nochmal versuchen</button></div></div>`;
    return;
  }
  $nav.classList.remove('hidden');
  push.zuordnen('bund');
  if (!cfg) { $app.innerHTML = '<div class="loading"><div class="spinner"></div></div>'; willkommen(); return; }
  render();
}

core.onAuthChange((u) => { if (!u && !$nav.classList.contains('hidden')) location.reload(); });
init();
