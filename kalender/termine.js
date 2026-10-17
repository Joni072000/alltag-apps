// =============================================================
// Kalender – reine Datumslogik (ohne DOM, ohne Zeitzone)
// Daten werden als 'YYYY-MM-DD' gerechnet. Die Datei wird auch vom
// Gym-Tracker und (als Kopie) von der Mitteilungs-Funktion benutzt.
// =============================================================

export const KATEGORIEN = [
  { id: 'privat', name: 'Privat', farbe: '#A48BFF' },
  { id: 'arbeit', name: 'Arbeit', farbe: '#5AB8FF' },
  { id: 'schule', name: 'Berufsschule', farbe: '#4FD1C5' },
  { id: 'sport', name: 'Sport', farbe: '#FF7A1A' },
  { id: 'wichtig', name: 'Wichtig', farbe: '#FF4D6D' },
  { id: 'geburtstag', name: 'Geburtstag', farbe: '#F5C542' },
];

export const WIEDERHOLUNG = [
  { id: 'keine', name: 'Nie' },
  { id: 'taeglich', name: 'Täglich' },
  { id: 'werktags', name: 'Werktags (Mo–Fr)' },
  { id: 'woechentlich', name: 'Wöchentlich' },
  { id: 'zweiwoechentlich', name: 'Alle 2 Wochen' },
  { id: 'monatlich', name: 'Monatlich' },
  { id: 'jaehrlich', name: 'Jährlich' },
];

// Minuten vor Beginn (bei ganztägig: vor 0:00 Uhr; negativ = am Tag selbst)
export const ERINNERUNG_ZEIT = [
  { m: null, name: 'Keine' }, { m: 0, name: 'Zum Beginn' }, { m: 10, name: '10 Min. vorher' },
  { m: 30, name: '30 Min. vorher' }, { m: 60, name: '1 Std. vorher' }, { m: 120, name: '2 Std. vorher' },
  { m: 1440, name: '1 Tag vorher' },
];
export const ERINNERUNG_GANZTAG = [
  { m: null, name: 'Keine' }, { m: -480, name: 'Am Tag um 8:00' }, { m: 360, name: 'Am Vortag um 18:00' },
  { m: 2520, name: '2 Tage vorher um 18:00' },
];

// ---------- Datum als Text ----------
export const pad = (n) => String(n).padStart(2, '0');
export const dStr = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
export const teile = (s) => s.split('-').map(Number);
export function plus(s, n) {
  const [y, m, d] = teile(s);
  const x = new Date(Date.UTC(y, m - 1, d + n));
  return dStr(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate());
}
export const wochentag = (s) => { const [y, m, d] = teile(s); return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; }; // 0 = Mo
export const tageZwischen = (a, b) => { const [y1, m1, d1] = teile(a), [y2, m2, d2] = teile(b); return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5); };
export const lokalStr = (d) => dStr(d.getFullYear(), d.getMonth() + 1, d.getDate());

/** Dauer eines Termins in Tagen (mehrtägig ganztägig), mind. 1 */
export const spanne = (t) => (t.ganztaegig && t.endDatum && t.endDatum > t.datum ? tageZwischen(t.datum, t.endDatum) + 1 : 1);

/**
 * Alle Starttage eines Termins zwischen von und bis (inklusive), als 'YYYY-MM-DD'.
 * t: { datum, wiederholung: { art, bis, ausnahmen[] } }
 */
export function starttage(t, von, bis) {
  const w = t.wiederholung || { art: 'keine' };
  const ende = w.bis && w.bis < bis ? w.bis : bis;
  const aus = new Set(w.ausnahmen || []);
  const res = [];
  const lang = spanne(t) - 1;                       // mehrtägige Termine früher anfangen lassen
  const ab = plus(von, -lang);
  const add = (s) => { if (s >= ab && s <= ende && !aus.has(s)) res.push(s); };
  if (t.datum > ende) return res;
  switch (w.art) {
    case 'taeglich':
    case 'werktags': {
      let s = t.datum > ab ? t.datum : ab;
      for (; s <= ende; s = plus(s, 1)) if (w.art === 'taeglich' || wochentag(s) < 5) add(s);
      break;
    }
    case 'woechentlich':
    case 'zweiwoechentlich': {
      const schritt = w.art === 'woechentlich' ? 7 : 14;
      let s = t.datum;
      if (s < ab) s = plus(s, Math.ceil(tageZwischen(s, ab) / schritt) * schritt);
      for (; s <= ende; s = plus(s, schritt)) add(s);
      break;
    }
    case 'monatlich': {
      const [y0, m0, d0] = teile(t.datum);
      for (let i = 0; i < 1200; i++) {
        const y = y0 + Math.floor((m0 - 1 + i) / 12), m = ((m0 - 1 + i) % 12) + 1;
        if (new Date(Date.UTC(y, m, 0)).getUTCDate() < d0) continue;   // z. B. 31. im Februar überspringen
        const s = dStr(y, m, d0);
        if (s > ende) break;
        add(s);
      }
      break;
    }
    case 'jaehrlich': {
      const [y0, m0, d0] = teile(t.datum);
      const [yv] = teile(ab);
      for (let y = Math.max(y0, yv - 1); ; y++) {
        const s = m0 === 2 && d0 === 29 && new Date(Date.UTC(y, 1, 29)).getUTCMonth() !== 1 ? dStr(y, 2, 28) : dStr(y, m0, d0);
        if (s > ende) break;
        add(s);
      }
      break;
    }
    default: add(t.datum);
  }
  return res;
}

/** Vorkommen pro Kalendertag (mehrtägige Termine erscheinen an jedem Tag) */
export function vorkommen(termine, von, bis) {
  const res = [];
  for (const t of termine) {
    const n = spanne(t);
    for (const s of starttage(t, von, bis)) {
      for (let i = 0; i < n; i++) {
        const tag = plus(s, i);
        if (tag >= von && tag <= bis) res.push({ termin: t, start: s, tag, teil: n > 1 ? { i, n } : null });
      }
    }
  }
  return res.sort((a, b) => a.tag.localeCompare(b.tag) || (b.termin.ganztaegig ? 1 : 0) - (a.termin.ganztaegig ? 1 : 0) || (a.termin.zeit || '').localeCompare(b.termin.zeit || ''));
}

// ---------- Feiertage ----------
function ostern(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31), tag = ((h + l - 7 * m + 114) % 31) + 1;
  return dStr(y, monat, tag);
}

export const BUNDESLAENDER = [
  ['BW', 'Baden-Württemberg'], ['BY', 'Bayern'], ['BE', 'Berlin'], ['BB', 'Brandenburg'], ['HB', 'Bremen'], ['HH', 'Hamburg'],
  ['HE', 'Hessen'], ['MV', 'Mecklenburg-Vorpommern'], ['NI', 'Niedersachsen'], ['NW', 'Nordrhein-Westfalen'], ['RP', 'Rheinland-Pfalz'],
  ['SL', 'Saarland'], ['SN', 'Sachsen'], ['ST', 'Sachsen-Anhalt'], ['SH', 'Schleswig-Holstein'], ['TH', 'Thüringen'],
];

export function feiertage(y, land = 'HE') {
  const o = ostern(y);
  const liste = [
    [dStr(y, 1, 1), 'Neujahr'], [plus(o, -2), 'Karfreitag'], [o, 'Ostersonntag'], [plus(o, 1), 'Ostermontag'],
    [dStr(y, 5, 1), 'Tag der Arbeit'], [plus(o, 39), 'Christi Himmelfahrt'], [plus(o, 49), 'Pfingstsonntag'], [plus(o, 50), 'Pfingstmontag'],
    [dStr(y, 10, 3), 'Tag der Deutschen Einheit'], [dStr(y, 12, 25), '1. Weihnachtstag'], [dStr(y, 12, 26), '2. Weihnachtstag'],
  ];
  const in_ = (...l) => l.includes(land);
  if (in_('BW', 'BY', 'ST')) liste.push([dStr(y, 1, 6), 'Heilige Drei Könige']);
  if (in_('BE', 'MV')) liste.push([dStr(y, 3, 8), 'Frauentag']);
  if (in_('BW', 'BY', 'HE', 'NW', 'RP', 'SL')) liste.push([plus(o, 60), 'Fronleichnam']);
  if (in_('SL', 'BY')) liste.push([dStr(y, 8, 15), 'Mariä Himmelfahrt']);
  if (in_('TH')) liste.push([dStr(y, 9, 20), 'Weltkindertag']);
  if (in_('BB', 'MV', 'SN', 'ST', 'TH', 'HB', 'HH', 'NI', 'SH')) liste.push([dStr(y, 10, 31), 'Reformationstag']);
  if (in_('BW', 'BY', 'NW', 'RP', 'SL')) liste.push([dStr(y, 11, 1), 'Allerheiligen']);
  if (in_('SN')) {
    // Mittwoch vor dem 23. November
    let s = dStr(y, 11, 22);
    while (wochentag(s) !== 2) s = plus(s, -1);
    liste.push([s, 'Buß- und Bettag']);
  }
  return new Map(liste);
}
