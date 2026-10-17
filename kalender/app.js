// =============================================================
// Kalender – Teil der Alltag-Apps
// Termine: events (app='kalender', kind='termin'); zeigt zusätzlich
// Trainings aus dem Gym-Tracker und Kalorien aus dem Kalorien-Tracker.
// =============================================================
import * as core from '../shared/core.js';
import * as push from '../shared/push.js';
import { esc, toast, sheet, bestaetigen, fmt } from '../shared/ui.js';
import {
  KATEGORIEN, WIEDERHOLUNG, ERINNERUNG_ZEIT, ERINNERUNG_GANZTAG, BUNDESLAENDER,
  vorkommen, feiertage, plus, wochentag, lokalStr, teile, dStr, tageZwischen, spanne,
} from './termine.js';

const APP = 'kalender';
const $app = document.getElementById('app');
const $nav = document.getElementById('nav');
const $fab = document.getElementById('fab');

const S = { land: 'HE', erinnerung: 30, petName: 'Pumpi' };
let tab = 'kalender', ansicht = 'monat';
let heute = lokalStr(new Date());
let auswahl = heute;
let monat = heute.slice(0, 7);          // 'YYYY-MM'
let termine = [];                       // Events
let gym = [];                           // Trainings
let kcal = {};                          // 'YYYY-MM-DD' -> kcal
const geladen = new Set();              // geladene Monate für Gym/Kalorien
let suche = '';

const WT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const kat = (id) => KATEGORIEN.find((k) => k.id === id) || KATEGORIEN[0];
const alsTermin = (e) => ({ ...e.data, id: e.id, titel: e.title, ereignis: e });
const datumText = (s, opt = { weekday: 'long', day: 'numeric', month: 'long' }) => { const [y, m, d] = teile(s); return new Date(y, m - 1, d).toLocaleDateString('de-DE', opt); };
const feiertagCache = {};
function feiertag(s) {
  const y = s.slice(0, 4);
  const k = y + S.land;
  if (!feiertagCache[k]) feiertagCache[k] = feiertage(+y, S.land);
  return feiertagCache[k].get(s);
}

// ---------- Daten -------------------------------------------
async function ladeTermine() {
  termine = (await core.listEvents({ app: APP, kind: 'termin', limit: 5000 })).map(alsTermin);
}

async function ladeMonat(m) {
  if (geladen.has(m)) return;
  geladen.add(m);
  const [y, mo] = m.split('-').map(Number);
  const von = new Date(y, mo - 1, 1 - 7), bis = new Date(y, mo, 1 + 7);
  try {
    const [g, k] = await Promise.all([
      core.listEvents({ app: 'gym', kind: 'training', from: von, to: bis }),
      core.listEvents({ app: 'kalorien', kind: 'mahlzeit', from: von, to: bis, limit: 5000 }),
    ]);
    const ids = new Set(gym.map((x) => x.id));
    gym.push(...g.filter((x) => !ids.has(x.id)));
    const neu = {};
    for (const e of k) { const s = lokalStr(new Date(e.starts_at)); neu[s] = (neu[s] || 0) + (e.data?.kcal || 0); }
    Object.assign(kcal, neu);
  } catch { geladen.delete(m); }
}

const gymAm = (s) => gym.filter((t) => lokalStr(new Date(t.starts_at)) === s);

// ---------- Darstellung -------------------------------------
function render() {
  heute = lokalStr(new Date());
  $nav.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $fab.classList.toggle('hidden', tab === 'einstellungen');
  ({ kalender: seiteKalender, liste: seiteListe, einstellungen: seiteEinstellungen })[tab]();
}

function zeitText(t, v) {
  if (t.ganztaegig) return v?.teil ? `<span>Tag ${v.teil.i + 1}/${v.teil.n}</span>` : '<span>ganztägig</span>';
  return `${esc(t.zeit || '')}${t.endZeit ? `<span>${esc(t.endZeit)}</span>` : ''}`;
}

function terminKarte(v) {
  const t = v.termin, k = kat(t.kategorie);
  const wdh = t.wiederholung?.art && t.wiederholung.art !== 'keine';
  return `<button class="termin" data-a="termin" data-id="${t.id}" data-start="${v.start}">
    <div class="strich" style="background:${k.farbe}"></div>
    <div class="zeit">${zeitText(t, v)}</div>
    <div class="was"><b>${esc(t.titel)}</b>
      <span class="muted small">${[t.ort ? '📍 ' + esc(t.ort) : '', wdh ? '🔁' : '', t.erinnerung != null ? '🔔' : '', k.name].filter(Boolean).join(' · ')}</span></div>
  </button>`;
}

function tagesInhalt(s, kompakt = false) {
  const v = vorkommen(termine, s, s);
  const ft = feiertag(s);
  const tr = gymAm(s);
  const kc = kcal[s];
  let html = '';
  if (ft && !kompakt) html += `<div style="margin-bottom:8px"><span class="feiertag-chip">🎉 ${esc(ft)}</span></div>`;
  html += v.map(terminKarte).join('');
  html += tr.map((t) => `<a class="termin extern" href="../gym/">
    <div class="strich" style="background:var(--accent)"></div>
    <div class="zeit">${new Date(t.starts_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
    <div class="was"><b>🏋️ ${esc(t.title || 'Training')}</b><span class="muted small">${t.data?.dauer_min || '–'} min · ${t.data?.saetze || 0} Sätze · ${fmt(t.data?.kcal || 0, 0)} kcal</span></div></a>`).join('');
  if (kc && !kompakt) html += `<a class="termin extern" href="../kalorien/"><div class="strich" style="background:var(--ok)"></div>
    <div class="zeit">🥗</div><div class="was"><b>${fmt(kc, 0)} kcal gegessen</b><span class="muted small">Im Kalorien-Tracker ansehen</span></div></a>`;
  if (!v.length && !tr.length && !(kc && !kompakt)) html += `<div class="leer-tag">${kompakt ? 'Frei' : 'Keine Termine. Tippe auf <b>+</b>, um einen anzulegen.'}</div>`;
  return html;
}

function seiteKalender() {
  const war = geladen.has(monat);
  zeichneKalender();
  if (!war) ladeMonat(monat).then(() => { if (tab === 'kalender' && !document.querySelector('.backdrop')) zeichneKalender(); });
}

function zeichneKalender() {
  const [y, m] = monat.split('-').map(Number);
  const erster = dStr(y, m, 1);
  const start = plus(erster, -wochentag(erster));
  const letzter = dStr(y, m, new Date(y, m, 0).getDate());
  const ende = plus(letzter, 6 - wochentag(letzter));
  const vk = vorkommen(termine, start, ende);
  const proTag = {};
  for (const v of vk) (proTag[v.tag] ||= []).push(v);

  let gitter = '';
  if (ansicht === 'monat') {
    for (let s = start; s <= ende; s = plus(s, 1)) {
      const liste = proTag[s] || [];
      const ft = feiertag(s);
      const cls = [s.slice(0, 7) !== monat ? 'fremd' : '', s === heute ? 'heute' : '', s === auswahl ? 'sel' : '', ft ? 'feiertag' : '', wochentag(s) >= 5 ? 'we' : ''].join(' ');
      const ganz = liste.filter((v) => v.termin.ganztaegig).slice(0, 2);
      const punkte = liste.filter((v) => !v.termin.ganztaegig).slice(0, 4);
      gitter += `<button class="zelle ${cls}" data-a="tag" data-d="${s}" aria-label="${datumText(s)}">
        <span class="nr">${+s.slice(8)}</span>
        ${ganz.map((v) => `<span class="balken" style="background:${kat(v.termin.kategorie).farbe}"></span>`).join('')}
        <span class="punkte">${punkte.map((v) => `<i class="punkt" style="background:${kat(v.termin.kategorie).farbe}"></i>`).join('')}</span>
        ${gymAm(s).length ? '<span class="gym">🏋️</span>' : ''}
      </button>`;
    }
  }

  let unten;
  if (ansicht === 'monat') {
    unten = `<div class="tag-kopf"><h2>${auswahl === heute ? 'Heute' : datumText(auswahl, { weekday: 'long' })}, ${datumText(auswahl, { day: 'numeric', month: 'long' })}</h2></div>
      ${tagesInhalt(auswahl)}`;
  } else {
    const ws = plus(auswahl, -wochentag(auswahl));
    unten = '';
    for (let i = 0; i < 7; i++) {
      const s = plus(ws, i), ft = feiertag(s);
      unten += `<div class="woche-tag ${s === heute ? 'heute' : ''}"><h3>${datumText(s, { weekday: 'short', day: 'numeric', month: 'short' })}${ft ? ` <span class="feiertag-chip">${esc(ft)}</span>` : ''}</h3>
        ${tagesInhalt(s, true)}</div>`;
    }
  }

  const ws = plus(auswahl, -wochentag(auswahl));
  const titel = ansicht === 'monat'
    ? new Date(y, m - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    : `${+ws.slice(8)}.${ws.slice(5, 7) !== plus(ws, 6).slice(5, 7) ? datumText(ws, { month: 'short' }).replace('.', '') + '.' : ''}–${datumText(plus(ws, 6), { day: 'numeric', month: 'short' })}`;

  $app.innerHTML = `
    <div class="monat-kopf">
      <button class="icon-btn" data-a="zurueck" aria-label="Zurück">‹</button>
      <h1 class="${ansicht === 'woche' ? 'klein' : ''}">${titel}</h1>
      <button class="heute-btn" data-a="heute">Heute</button>
      <button class="icon-btn" data-a="weiter" aria-label="Weiter">›</button>
    </div>
    <div class="seg" style="margin-bottom:12px">
      <button data-a="ansicht" data-v="monat" class="${ansicht === 'monat' ? 'on' : ''}">Monat</button>
      <button data-a="ansicht" data-v="woche" class="${ansicht === 'woche' ? 'on' : ''}">Woche</button>
    </div>
    ${ansicht === 'monat' ? `<div class="wt">${WT.map((w) => `<span>${w}</span>`).join('')}</div><div class="grid7">${gitter}</div>` : ''}
    ${unten}`;
}

function seiteListe() {
  const bis = plus(heute, 60);
  let vk = vorkommen(termine, heute, bis).filter((v) => !v.teil || v.teil.i === 0 || v.tag === heute);
  if (suche) vk = vk.filter((v) => `${v.termin.titel} ${v.termin.ort || ''} ${v.termin.notiz || ''}`.toLowerCase().includes(suche.toLowerCase()));
  // Feiertage mit in die Liste
  const eintraege = vk.map((v) => ({ tag: v.tag, html: terminKarte(v) }));
  if (!suche) {
    for (let s = heute; s <= bis; s = plus(s, 1)) { const ft = feiertag(s); if (ft) eintraege.push({ tag: s, html: `<div style="margin-bottom:8px"><span class="feiertag-chip">🎉 ${esc(ft)}</span></div>`, ft: true }); }
  }
  eintraege.sort((a, b) => a.tag.localeCompare(b.tag) || (b.ft ? 1 : 0) - (a.ft ? 1 : 0));
  let html = `<div class="page-head"><h1>Demnächst</h1></div>
    <input class="search" placeholder="Termine durchsuchen …" value="${esc(suche)}" data-f="suche" style="margin-bottom:6px">`;
  let tag = '';
  for (const e of eintraege) {
    if (e.tag !== tag) {
      tag = e.tag;
      const diff = tageZwischen(heute, tag);
      html += `<div class="month">${diff === 0 ? 'Heute' : diff === 1 ? 'Morgen' : datumText(tag, { weekday: 'long', day: 'numeric', month: 'long' })}</div>`;
    }
    html += e.html;
  }
  if (!eintraege.length) html += `<div class="empty" style="margin-top:12px">${suche ? 'Nichts gefunden.' : 'Keine Termine in den nächsten 2 Monaten.'}</div>`;
  $app.innerHTML = html;
}

async function seiteEinstellungen() {
  $app.innerHTML = `
    <div class="page-head"><h1>Profil</h1></div>
    <div class="section-title">Kalender</div>
    <div class="card">
      <label class="field"><span>Bundesland (für Feiertage)</span>
        <select data-s="kal_bundesland">${BUNDESLAENDER.map(([k, n]) => `<option value="${k}" ${k === S.land ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="field" style="margin:0"><span>Standard-Erinnerung für neue Termine</span>
        <select data-s="kal_erinnerung">${ERINNERUNG_ZEIT.map((e) => `<option value="${e.m ?? ''}" ${e.m === S.erinnerung ? 'selected' : ''}>${e.name}</option>`).join('')}</select></label>
    </div>

    <div class="section-title">Mitteilungen</div>
    <div class="card" id="push-karte"><div class="muted small">Wird geprüft …</div></div>

    <div class="section-title">Kategorien</div>
    <div class="card"><div class="kat-chips">${KATEGORIEN.map((k) => `<button type="button" tabindex="-1"><i style="background:${k.farbe}"></i>${k.name}</button>`).join('')}</div>
      <p class="muted small" style="margin:10px 0 0">Termine in „Sport“ erscheinen auch im Gym-Tracker als geplantes Training.</p></div>

    <div class="section-title">Konto</div>
    <a class="list-item" href="../gym/" style="text-decoration:none;color:inherit"><span class="grow">🏋️ Zum Gym-Tracker</span><span class="chev">›</span></a>
    <a class="list-item" href="../kalorien/" style="text-decoration:none;color:inherit"><span class="grow">🥗 Zum Kalorien-Tracker</span><span class="chev">›</span></a>
    <a class="list-item" href="../" style="text-decoration:none;color:inherit"><span class="grow">← Alle Apps</span></a>
    <button class="list-item" data-a="logout" style="color:var(--danger)"><span class="grow">Abmelden</span></button>`;
  $app.querySelectorAll('[data-s]').forEach((sel) => sel.onchange = async () => {
    const v = sel.value === '' ? null : (sel.dataset.s === 'kal_erinnerung' ? Number(sel.value) : sel.value);
    try {
      await core.updateSettings({ [sel.dataset.s]: v });
      if (sel.dataset.s === 'kal_bundesland') S.land = v; else S.erinnerung = v;
      toast('Gespeichert ✓');
    } catch { toast('Speichern fehlgeschlagen', true); }
  });
  const el = document.getElementById('push-karte');
  if (!push.unterstuetzt()) {
    el.innerHTML = push.istIOS && !push.alsAppGestartet
      ? '<p style="margin:0">📱 Am iPhone gehen Mitteilungen nur, wenn die App auf dem Home-Bildschirm liegt: in Safari <b>Teilen</b> → <b>Zum Home-Bildschirm</b>, dann von dort öffnen.</p>'
      : '<p class="muted" style="margin:0">Dieser Browser unterstützt keine Mitteilungen.</p>';
    return;
  }
  const an = await push.aktiv();
  el.innerHTML = an
    ? `<p style="margin:0 0 12px">🔔 Mitteilungen sind <b style="color:var(--ok)">aktiv</b>. Termine mit Erinnerung melden sich pünktlich – auch wenn die App zu ist.</p>
       <button class="btn btn-block" data-a="push-test">Test senden</button>`
    : `<p style="margin:0 0 12px">Aktiviere Mitteilungen, damit dich deine Termine erinnern.</p>
       ${Notification.permission === 'denied' ? '<p class="muted small">Mitteilungen sind in den Browser-Einstellungen blockiert.</p>' : ''}
       <button class="btn btn-primary btn-block" data-a="push-an">🔔 Mitteilungen aktivieren</button>`;
}

// ---------- Termin-Editor -----------------------------------
function editor(vorlage = {}, ereignis = null, start = null) {
  const t = {
    titel: '', datum: auswahl, ganztaegig: false, zeit: '09:00', endZeit: '10:00', endDatum: null, kategorie: 'privat',
    ort: '', notiz: '', wiederholung: { art: 'keine', bis: null, ausnahmen: [] }, erinnerung: S.erinnerung, ...vorlage,
  };
  const istSerie = ereignis && t.wiederholung?.art !== 'keine';
  // Bei Serien zeigt der Editor das angeklickte Vorkommen
  const vorkommenDatum = start || t.datum;
  let ganz = t.ganztaegig, katId = t.kategorie;
  const erinnOptionen = () => (ganz ? ERINNERUNG_GANZTAG : ERINNERUNG_ZEIT);

  sheet(`<h2>${ereignis ? 'Termin bearbeiten' : 'Neuer Termin'}</h2>
    <label class="field"><span>Titel</span><input data-f="titel" value="${esc(t.titel)}" placeholder="z. B. Berufsschule, Zahnarzt, Push-Training"></label>
    <label class="check-row" style="margin-bottom:10px"><input type="checkbox" data-f="ganz" ${ganz ? 'checked' : ''}> Ganztägig</label>
    <div data-zeiten></div>
    <div class="field"><span>Kategorie</span><div class="kat-chips">${KATEGORIEN.map((k) => `<button type="button" data-kat="${k.id}" class="${k.id === katId ? 'on' : ''}"><i style="background:${k.farbe}"></i>${k.name}</button>`).join('')}</div></div>
    <div class="portion-row" style="grid-template-columns:1fr 1fr;margin-bottom:0">
      <label class="field"><span>Wiederholen</span><select data-f="wdh">${WIEDERHOLUNG.map((w) => `<option value="${w.id}" ${w.id === t.wiederholung.art ? 'selected' : ''}>${w.name}</option>`).join('')}</select></label>
      <label class="field" data-bis-feld ${t.wiederholung.art === 'keine' ? 'hidden' : ''}><span>Endet am (optional)</span><input type="date" data-f="wdhBis" value="${t.wiederholung.bis || ''}"></label>
    </div>
    <label class="field"><span>Erinnerung</span><select data-f="erinnerung"></select></label>
    <label class="field"><span>Ort</span><input data-f="ort" value="${esc(t.ort)}" placeholder="optional"></label>
    <label class="field"><span>Notiz</span><textarea data-f="notiz" rows="2" placeholder="optional">${esc(t.notiz)}</textarea></label>
    <div class="sheet-actions">
      ${ereignis ? '<button class="btn btn-danger" data-a="del">Löschen</button>' : ''}
      <button class="btn btn-primary" data-a="ok">Speichern</button>
    </div>`,
  (el, close) => {
    const f = (k) => el.querySelector(`[data-f="${k}"]`);
    const zeiten = () => {
      el.querySelector('[data-zeiten]').innerHTML = ganz
        ? `<div class="zeit-reihe ganz">
            <label class="field"><span>Von</span><input type="date" data-f="datum" value="${istSerie ? vorkommenDatum : t.datum}"></label>
            <label class="field"><span>Bis (optional)</span><input type="date" data-f="endDatum" value="${t.endDatum && !istSerie ? t.endDatum : ''}"></label></div>`
        : `<div class="zeit-reihe">
            <label class="field"><span>Datum</span><input type="date" data-f="datum" value="${istSerie ? vorkommenDatum : t.datum}"></label>
            <label class="field"><span>Von</span><input type="time" data-f="zeit" value="${t.zeit || '09:00'}"></label>
            <label class="field"><span>Bis</span><input type="time" data-f="endZeit" value="${t.endZeit || ''}"></label></div>`;
      const ops = erinnOptionen();
      const aktuell = ops.some((o) => o.m === t.erinnerung) ? t.erinnerung : (ganz ? -480 : S.erinnerung);
      f('erinnerung').innerHTML = ops.map((o) => `<option value="${o.m ?? ''}" ${o.m === aktuell ? 'selected' : ''}>${o.name}</option>`).join('');
      if (!ganz) {
        f('zeit').addEventListener('change', () => {
          // Ende automatisch eine Stunde später, wenn es davor liegt
          const [h, m] = f('zeit').value.split(':').map(Number);
          if (!f('endZeit').value || f('endZeit').value <= f('zeit').value) f('endZeit').value = `${String(Math.min(23, h + 1)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        });
      }
    };
    zeiten();
    f('ganz').onchange = () => { ganz = f('ganz').checked; zeiten(); };
    f('wdh').onchange = () => { el.querySelector('[data-bis-feld]').hidden = f('wdh').value === 'keine'; };
    el.querySelectorAll('[data-kat]').forEach((b) => b.onclick = () => { katId = b.dataset.kat; el.querySelectorAll('[data-kat]').forEach((x) => x.classList.toggle('on', x === b)); });

    const lesen = () => {
      const datum = f('datum').value;
      const art = f('wdh').value;
      const erinn = f('erinnerung').value === '' ? null : Number(f('erinnerung').value);
      return {
        titel: f('titel').value.trim(), datum, ganztaegig: ganz,
        zeit: ganz ? null : f('zeit').value, endZeit: ganz ? null : (f('endZeit').value || null),
        endDatum: ganz && f('endDatum').value > datum ? f('endDatum').value : null,
        kategorie: katId, ort: f('ort').value.trim(), notiz: f('notiz').value.trim(), erinnerung: erinn,
        wiederholung: { art, bis: art !== 'keine' ? (f('wdhBis').value || null) : null, ausnahmen: art !== 'keine' ? (t.wiederholung.ausnahmen || []) : [] },
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin',
      };
    };

    el.querySelector('[data-a="ok"]').onclick = async () => {
      const neu = lesen();
      if (!neu.titel) { toast('Gib einen Titel ein', true); f('titel').focus(); return; }
      if (!neu.datum) { toast('Wähle ein Datum', true); return; }
      let nurDieser = false;
      if (istSerie) {
        const wahl = await serienFrage('Termin speichern');
        if (wahl === null) return;
        nurDieser = wahl === 'einer';
      }
      close();
      try {
        if (!ereignis) await speichern(neu);
        else if (nurDieser) {
          await ausnahmeHinzufuegen(ereignis, vorkommenDatum);
          await speichern({ ...neu, wiederholung: { art: 'keine', bis: null, ausnahmen: [] } });
        } else {
          // Ganze Serie: Datum-Verschiebung des Vorkommens auf den Serienstart übertragen
          if (istSerie) neu.datum = plus(t.datum, tageZwischen(vorkommenDatum, neu.datum));
          await speichern(neu, ereignis);
        }
        toast('Gespeichert ✓');
        auswahl = neu.datum;
        monat = auswahl.slice(0, 7);
      } catch (err) { console.error(err); toast('Speichern fehlgeschlagen', true); }
      render();
    };

    el.querySelector('[data-a="del"]')?.addEventListener('click', async () => {
      let nurDieser = false;
      if (istSerie) {
        const wahl = await serienFrage('Termin löschen');
        if (wahl === null) return;
        nurDieser = wahl === 'einer';
      } else if (!(await bestaetigen('Termin löschen?', `„${t.titel}“ wird gelöscht.`, 'Löschen'))) return;
      close();
      try {
        if (nurDieser) await ausnahmeHinzufuegen(ereignis, vorkommenDatum);
        else { await core.deleteEvent(ereignis.id); termine = termine.filter((x) => x.id !== ereignis.id); }
        toast('Gelöscht');
      } catch { toast('Löschen fehlgeschlagen', true); }
      render();
    });
    if (!ereignis) setTimeout(() => f('titel').focus(), 120);
  });
}

function serienFrage(titel) {
  return new Promise((resolve) => {
    sheet(`<h2>${titel}</h2><p class="muted">Das ist ein wiederkehrender Termin.</p>
      <div class="menu"><button data-w="einer">Nur diesen Termin</button><button data-w="alle">Alle Termine der Serie</button></div>`,
    (el, cl) => el.querySelectorAll('[data-w]').forEach((b) => b.onclick = () => { cl(); resolve(b.dataset.w); }),
    () => resolve(null));
  });
}

function zeitpunkt(datum, zeit) {
  const [y, m, d] = teile(datum);
  const [h, mi] = (zeit || '00:00').split(':').map(Number);
  return new Date(y, m - 1, d, h, mi);
}

async function speichern(t, ereignis = null) {
  const { titel, ...data } = t;
  const start = zeitpunkt(t.datum, t.ganztaegig ? '00:00' : t.zeit);
  let ende = t.ganztaegig ? zeitpunkt(plus(t.endDatum || t.datum, 1), '00:00') : (t.endZeit ? zeitpunkt(t.datum, t.endZeit) : null);
  if (ende && ende <= start) ende = new Date(ende.getTime() + 864e5);   // endet nach Mitternacht
  const zeile = { title: titel, starts_at: start.toISOString(), ends_at: ende ? ende.toISOString() : null, data };
  if (ereignis) {
    const e = await core.updateEvent(ereignis.id, zeile);
    termine = termine.map((x) => (x.id === e.id ? alsTermin(e) : x));
  } else {
    const e = await core.addEvent({ app: APP, kind: 'termin', ...zeile });
    termine.push(alsTermin(e));
  }
}

async function ausnahmeHinzufuegen(ereignis, datum) {
  const data = { ...ereignis.data, wiederholung: { ...ereignis.data.wiederholung, ausnahmen: [...new Set([...(ereignis.data.wiederholung?.ausnahmen || []), datum])] } };
  const e = await core.updateEvent(ereignis.id, { data });
  termine = termine.map((x) => (x.id === e.id ? alsTermin(e) : x));
}

function terminOeffnen(id, start) {
  const t = termine.find((x) => x.id === id); if (!t) return;
  const { ereignis, id: _id, ...rest } = t;
  editor(rest, ereignis, start);
}

// ---------- Klicks -------------------------------------------
$app.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a;
  if (a === 'tag') {
    auswahl = b.dataset.d;
    if (auswahl.slice(0, 7) !== monat) monat = auswahl.slice(0, 7);
    render();
    document.querySelector('.tag-kopf')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (a === 'zurueck' || a === 'weiter') {
    const r = a === 'weiter' ? 1 : -1;
    if (ansicht === 'monat') {
      const [y, m] = monat.split('-').map(Number);
      const d = new Date(y, m - 1 + r, 1);
      monat = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      auswahl = monat === heute.slice(0, 7) ? heute : `${monat}-01`;
    } else { auswahl = plus(auswahl, 7 * r); monat = auswahl.slice(0, 7); }
    render();
  }
  if (a === 'heute') { auswahl = heute; monat = heute.slice(0, 7); render(); }
  if (a === 'ansicht') { ansicht = b.dataset.v; render(); }
  if (a === 'termin') terminOeffnen(b.dataset.id, b.dataset.start);
  if (a === 'logout') core.logout();
  if (a === 'push-an') {
    b.disabled = true; b.textContent = '…';
    try { await push.aktivieren('kalender'); toast('Mitteilungen aktiviert 🔔'); } catch (err) { toast(err.message, true); }
    render();
  }
  if (a === 'push-test') {
    b.disabled = true;
    try { const n = await push.testSenden('kalender'); toast(n ? 'Test gesendet 📬' : 'Kein Gerät gefunden – neu aktivieren', !n); } catch (err) { toast(err.message, true); }
    b.disabled = false;
  }
});

$app.addEventListener('input', (e) => {
  if (e.target.dataset.f === 'suche') {
    suche = e.target.value;
    const pos = e.target.selectionStart;
    seiteListe();
    const inp = $app.querySelector('[data-f="suche"]'); inp.focus(); inp.setSelectionRange(pos, pos);
  }
});

$fab.onclick = () => editor({ datum: tab === 'kalender' ? auswahl : heute });
$nav.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  tab = b.dataset.tab; render(); window.scrollTo(0, 0);
});

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || $nav.classList.contains('hidden')) return;
  try { await ladeTermine(); geladen.clear(); gym = []; kcal = {}; if (!document.querySelector('.backdrop')) render(); } catch { /* offline */ }
});

// ---------- Start --------------------------------------------
async function init() {
  const user = await core.getUser();
  if (!user) { core.renderLogin($app, { appName: 'Kalender', onDone: () => location.reload() }); return; }
  try {
    const [profil] = await Promise.all([core.getProfile(), ladeTermine(), ladeMonat(monat)]);
    const st = profil?.settings || {};
    S.land = st.kal_bundesland || 'HE';
    S.erinnerung = st.kal_erinnerung !== undefined ? st.kal_erinnerung : 30;
    S.petName = st.gym_maskottchen_name || 'Pumpi';
  } catch (err) {
    console.error(err);
    $app.innerHTML = `<div class="loading"><div style="text-align:center;max-width:340px"><h2>Verbindung fehlgeschlagen</h2>
      <p class="muted">${esc(err.message || '')}</p><button class="btn btn-primary" onclick="location.reload()">Nochmal versuchen</button></div></div>`;
    return;
  }
  $nav.classList.remove('hidden');
  push.zuordnen('kalender');
  render();
}

core.onAuthChange((u) => { if (!u && !$nav.classList.contains('hidden')) location.reload(); });
init();
