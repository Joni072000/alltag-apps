// =============================================================
// Bund – Trainingsplan, Dienstgrade, Strafen
// Ziel: Basis-Fitness-Test der Bundeswehr (Stand Okt. 2026)
//   Pendellauf 11 × 10 m: max. 60 s (sehr gut: 42 s)
//   Klimmhang: mind. 5 s (gut: 45 s, sehr gut: 65 s)
//   1000-m-Lauf: max. 6:30 min
// Alles ist reine Rechnung aus Datum + Stufe – nichts davon wird gespeichert.
// =============================================================

export const BFT = [
  { id: 'pendel', name: 'Pendellauf 11 × 10 m', einheit: 's', ziel: 60, sehrGut: 42, besserWenig: true, hinweis: 'Mindestanforderung: unter 60 Sekunden' },
  { id: 'hang', name: 'Klimmhang', einheit: 's', ziel: 5, sehrGut: 65, besserWenig: false, hinweis: 'Mindestanforderung: 5 Sekunden halten' },
  { id: 'lauf', name: '1000-m-Lauf', einheit: 'min', ziel: 390, sehrGut: 240, besserWenig: true, hinweis: 'Mindestanforderung: unter 6:30 Minuten' },
];

export const DIENSTGRADE = [
  { ab: 0, name: 'Rekrut', abz: '◦' },
  { ab: 5, name: 'Gefreiter', abz: '›' },
  { ab: 10, name: 'Obergefreiter', abz: '»' },
  { ab: 15, name: 'Hauptgefreiter', abz: '⋙' },
  { ab: 21, name: 'Stabsgefreiter', abz: '≫' },
  { ab: 28, name: 'Unteroffizier', abz: '▲' },
  { ab: 36, name: 'Feldwebel', abz: '▲▲' },
  { ab: 45, name: 'Hauptfeldwebel', abz: '▲▲▲' },
  { ab: 56, name: 'Leutnant', abz: '★' },
  { ab: 70, name: 'Hauptmann', abz: '★★★' },
];

export function dienstgrad(stufe) {
  let i = 0;
  while (i + 1 < DIENSTGRADE.length && stufe >= DIENSTGRADE[i + 1].ab) i++;
  const d = DIENSTGRADE[i], n = DIENSTGRADE[i + 1];
  return { ...d, index: i, naechster: n || null, fortschritt: n ? (stufe - d.ab) / (n.ab - d.ab) : 1 };
}

export const TEST_ALLE = 14;      // alle 14 Tage ein Probe-Test (Tag 1, 15, 29 …)
export const MAX_STRAFEN = 3;     // höchstens 3 offene Strafen

const r = (x) => Math.round(x);
const minMax = (v, a, b) => Math.max(a, Math.min(b, v));

/** Einfacher Zahlen-Hash, damit derselbe Tag immer dieselbe Variante bekommt */
export function hash(s) {
  let h = 2166136261;
  for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}

// ---------- Bausteine (skalieren mit der Stufe L) -------------
const B = {
  liegestuetz(L) {
    const wdh = minMax(r(4 + L * 0.55), 4, 30);
    const saetze = L >= 40 ? 4 : 3;
    return { text: `${saetze} × ${wdh} Liegestütze`, info: L < 8 ? 'Knie am Boden erlaubt. Körper bleibt gerade, Brust fast bis zum Boden.' : 'Körper gerade wie ein Brett, Brust bis eine Faust über dem Boden.' };
  },
  klimmhang(L) {
    if (L < 6) return { text: `3 × ${5 + L} s Hang mit Fußhilfe`, info: 'An der Klimmzugstange (Gym, Spielplatz): Kinn über die Stange, Füße leicht auf einer Bank abstützen und halten. Ohne Stange: 3 × 10 Tisch-Rudern.' };
    const sek = minMax(r(5 + (L - 6) * 1.2), 5, 70);
    return { text: `3 × ${sek} s Klimmhang`, info: 'Mit Aufsprung hoch, Kinn über der Stange, Arme gebeugt halten – genau wie im Test. Kein Kinn auf der Stange ablegen. Ohne Stange: 3 × 12 Tisch-Rudern.' };
  },
  kniebeuge(L) { return { text: `3 × ${minMax(r(10 + L * 0.7), 10, 50)} Kniebeugen`, info: 'Füße schulterbreit, Po nach hinten, Knie zeigen in Richtung Zehen.' }; },
  rumpf(L) {
    const sek = minMax(r(20 + L * 1.8), 20, 120);
    return { text: `3 × ${sek} s Unterarmstütz`, info: 'Ellbogen unter den Schultern, Bauch fest, kein Hohlkreuz.' };
  },
  situps(L) { return { text: `3 × ${minMax(r(8 + L * 0.6), 8, 40)} Crunches`, info: 'Langsam hoch und runter, Nacken locker lassen.' }; },
  lauf(L) {
    if (L < 10) {
      const runden = minMax(5 + Math.floor(L / 3), 5, 8);
      return { text: `${runden} × (1 min laufen + 1 min gehen)`, info: 'Lockeres Tempo – du solltest dabei noch reden können. Davor 3 min zügig gehen.', min: runden * 2 + 3 };
    }
    if (L < 30) {
      const min = minMax(r(8 + (L - 10) * 0.4), 8, 16);
      return { text: `${min} min Dauerlauf am Stück`, info: 'Gleichmäßiges, ruhiges Tempo. Lieber langsamer als stehen bleiben.', min };
    }
    const reps = 3;
    const strecke = L < 45 ? 400 : 500;
    return { text: `${reps} × ${strecke} m zügig, je 2 min Gehpause`, info: 'Etwas schneller als dein 1000-m-Zieltempo. Davor 5 min einlaufen.', min: reps * 4 + 5 };
  },
  sprint(L) {
    const n = minMax(4 + Math.floor(L / 4), 4, 10);
    if (L < 12) return { text: `${n} × 20 m Antritt, zurückgehen`, info: 'Erst locker einlaufen. Schnell starten, nicht voll ausreizen – Zerrungsgefahr.', min: 6 };
    const p = minMax(2 + Math.floor((L - 12) / 20), 2, 3);
    return { text: `${p} × Pendellauf 11 × 10 m (Zeit stoppen)`, info: 'Wie im Test: an jeder Linie mit einem Fuß drüber, tief wenden. 2–3 min Pause zwischen den Läufen.', min: p * 3 + 2 };
  },
  burpees(L) { return { text: `3 × ${minMax(r(5 + L * 0.35), 5, 20)} Burpees`, info: L < 10 ? 'Einsteiger-Version: ohne Liegestütz und ohne Sprung.' : 'Runter in den Liegestütz, Füße ran, Strecksprung.' }; },
  marsch(L) {
    const min = minMax(r(10 + L * 0.12), 10, 15);
    const kg = L < 12 ? 0 : L < 30 ? 5 : 8;
    return { text: `${min} min Marsch zügig${kg ? ` mit ${kg} kg Rucksack` : ''}`, info: kg ? 'Wasserflaschen im Rucksack gehen auch. Gute Schuhe, Rucksack eng am Rücken.' : 'Zügig gehen, so dass du leicht ins Schwitzen kommst.', min };
  },
};

// ---------- Tagesplan nach Wochentag --------------------------
// 1 = Montag … 7 = Sonntag
const WOCHE = {
  1: { art: 'kraft', titel: 'Kraft Oberkörper', icon: '💪', teile: ['liegestuetz', 'klimmhang', 'rumpf'] },
  2: { art: 'ausdauer', titel: 'Ausdauer', icon: '🏃', teile: ['lauf'] },
  3: { art: 'schnell', titel: 'Schnelligkeit & Rumpf', icon: '⚡', teile: ['sprint', 'situps', 'rumpf'] },
  4: { art: 'kraft', titel: 'Kraft Ganzkörper', icon: '🎯', teile: ['kniebeuge', 'liegestuetz', 'klimmhang'] },
  5: { art: 'ausdauer', titel: 'Ausdauer', icon: '🏃', teile: ['lauf'] },
  6: { art: 'marsch', titel: 'Marsch & Zirkel', icon: '🎒', teile: ['marsch', 'burpees'] },
  7: { art: 'ruhe', titel: 'Ruhetag', icon: '🛏️', teile: [] },
};

export const isoWochentag = (d) => ((new Date(d).getDay() + 6) % 7) + 1;

/**
 * Challenge für einen Tag.
 * @param tagNr  Tag der Ausbildung (1 = erster Tag)
 * @param datum  'YYYY-MM-DD'
 * @param L      Stufe am Morgen dieses Tages
 */
export function challengeFuer(tagNr, datum, L) {
  if (tagNr === 1 || (tagNr - 1) % TEST_ALLE === 0) {
    return {
      art: 'test', titel: tagNr === 1 ? 'Einstufungstest' : 'Probe-Test', icon: '⏱️', ruhe: false, test: true,
      teile: [
        { text: 'Pendellauf 11 × 10 m', info: 'Zwei Linien im Abstand von 10 m. 11 Strecken so schnell wie möglich, jede Linie mit einem Fuß übertreten. Zeit stoppen.' },
        { text: 'Klimmhang so lange wie möglich', info: 'Kinn über der Stange, Arme gebeugt halten. Zeit stoppen, sobald das Kinn unter die Stange rutscht.' },
        { text: '1000 m so schnell wie möglich', info: 'Mit einer Lauf-App oder auf der 400-m-Bahn (2,5 Runden). Gehpausen sind erlaubt.' },
      ],
      dauer: 20,
      hinweis: 'Gut aufwärmen (5 min locker laufen, Arme kreisen). Du musst nichts bestehen – es geht nur darum zu sehen, wo du stehst. Trag danach deine Werte ein.',
    };
  }
  const w = WOCHE[isoWochentag(datum + 'T12:00')];
  if (w.art === 'ruhe') {
    return {
      art: 'ruhe', titel: 'Ruhetag', icon: '🛏️', ruhe: true,
      teile: [{ text: '10 min Dehnen & Mobilität', info: 'Beine, Hüfte, Schultern. Jede Dehnung 30 s halten, nicht wippen.' }],
      dauer: 10, hinweis: 'Erholung gehört zur Ausbildung. Freiwillig – wer heute nichts macht, bekommt keine Strafe.',
    };
  }
  const teile = w.teile.map((k) => B[k](L));
  const dauer = minMax(teile.reduce((s, t) => s + (t.min || 4), 0), 10, 20);
  return { art: w.art, titel: w.titel, icon: w.icon, ruhe: false, teile, dauer };
}

// ---------- Strafen -------------------------------------------
const SPORT_STRAFEN = [
  (L) => `${minMax(20 + L, 20, 60)} Kniebeugen extra`,
  (L) => `${minMax(10 + Math.floor(L / 2), 10, 40)} Liegestütze extra (Knie erlaubt), in so vielen Sätzen wie nötig`,
  (L) => `${minMax(30 + L * 2, 30, 100)} Hampelmänner`,
  (L) => `${minMax(60 + L * 3, 60, 180)} s Unterarmstütz – in Etappen`,
  (L) => `${minMax(8 + Math.floor(L / 3), 8, 25)} Burpees (Einsteiger-Version erlaubt)`,
  () => '15 min zusätzlich zügig spazieren gehen',
];
const BUND_STRAFEN = [
  'Bett bauen wie in der Kaserne: Laken straff, Decke auf Kante – 3 Tage lang jeden Morgen',
  'Kleiderschrank aufräumen: alles auf Kante falten wie im Spind',
  'Revierreinigen: dein Zimmer saugen und Staub wischen',
  'Schuhe putzen – alle, die im Flur stehen',
  'Heute ab 21 Uhr eine Stunde Handy-Pause',
  'Heute nicht zocken',
  'Morgen ohne Schlummertaste aufstehen – erster Wecker, raus',
  'Zum Abschluss der nächsten Dusche 30 s kalt duschen',
];

/** Strafe für einen verpassten Tag: abwechselnd Sport und Bund-Dienst */
export function strafeFuer(datum, L) {
  const h = hash('strafe' + datum);
  if (h % 2 === 0) return { art: 'sport', icon: '🏋️', text: SPORT_STRAFEN[(h >>> 1) % SPORT_STRAFEN.length](L) };
  return { art: 'dienst', icon: '🧹', text: BUND_STRAFEN[(h >>> 1) % BUND_STRAFEN.length] };
}

// ---------- Sprüche -------------------------------------------
export const SPRUECHE = {
  geschafft: ['Sauber ausgeführt, Kamerad.', 'Auftrag erfüllt. Weitermachen!', 'So sieht Disziplin aus.', 'Wegtreten – morgen wird’s härter.', 'Stark. Der Spieß wäre zufrieden.'],
  verpasst: ['Das gibt eine Strafe. Morgen besser.', 'Abgehakt ist anders. Strafe kommt.', 'Kopf hoch – aber die Strafe bleibt.'],
  ruhe: ['Ruhetag. Muskeln wachsen in der Pause.', 'Heute erholen – morgen wieder Dienst.'],
};
export const spruch = (art, datum) => { const l = SPRUECHE[art]; return l[hash(art + datum) % l.length]; };

/** Sekunden → "m:ss" */
export const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
