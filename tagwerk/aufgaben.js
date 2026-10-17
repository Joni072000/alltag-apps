// =============================================================
// Tagwerk – Aufgaben-Pool und tägliche Auswahl
// =============================================================

export const BEREICHE = [
  { id: 'bewegung', name: 'Bewegung', icon: '🏃', farbe: '#FF7A1A' },
  { id: 'ernaehrung', name: 'Ernährung', icon: '🥗', farbe: '#3DDC84' },
  { id: 'schlaf', name: 'Schlaf & Erholung', icon: '😴', farbe: '#5AB8FF' },
  { id: 'geist', name: 'Achtsamkeit', icon: '🧘', farbe: '#A48BFF' },
  { id: 'produktiv', name: 'Produktivität', icon: '✅', farbe: '#F5C542' },
  { id: 'lernen', name: 'Lernen', icon: '📚', farbe: '#4FD1C5' },
  { id: 'sozial', name: 'Soziales', icon: '💬', farbe: '#FF7A9A' },
  { id: 'ordnung', name: 'Ordnung', icon: '🧹', farbe: '#C9D1DA' },
  { id: 'geld', name: 'Finanzen', icon: '💶', farbe: '#8BD17C' },
];

export const XP = { 1: 10, 2: 20, 3: 35 };

// [Text, Schwierigkeit 1–3, Warum, Extra { timer: Minuten | auto: {...} }]
const POOL = {
  bewegung: [
    ['Geh 20 Minuten spazieren', 1, 'Bewegung an der frischen Luft senkt Stress und macht den Kopf frei.', { timer: 20 }],
    ['Mach 30 Kniebeugen über den Tag verteilt', 1, 'Kurze Bewegungspausen bringen den Kreislauf in Schwung.'],
    ['Trainiere heute im Gym', 3, 'Regelmäßiges Krafttraining ist eine der besten Investitionen in deine Gesundheit.', { auto: { typ: 'gym' } }],
    ['Dehne dich 10 Minuten', 1, 'Dehnen beugt Verspannungen vor – besonders nach körperlicher Arbeit.', { timer: 10 }],
    ['Nimm heute überall die Treppe statt Aufzug', 1, 'Kleine Alltagsbewegung summiert sich über den Tag.'],
    ['Mach eine 5-Minuten-Bewegungspause nach jeder Stunde Sitzen', 2, 'Langes Sitzen am Stück belastet Rücken und Kreislauf.'],
    ['Erreiche heute 10.000 Schritte', 2, 'Ein einfacher Richtwert für einen aktiven Tag.'],
    ['Fahr eine Strecke mit dem Rad statt mit Auto oder Bus', 2, 'Bewegung, die sich ganz nebenbei in den Alltag einbaut.'],
    ['Mach 3 Sätze Liegestütze so viele du schaffst', 2, 'Ein Mini-Workout, für das du nichts brauchst.'],
    ['Halte 3 × 45 Sekunden Plank', 2, 'Eine starke Körpermitte schützt deinen Rücken.'],
    ['Geh 30 Minuten joggen oder zügig gehen', 3, 'Ausdauer stärkt Herz, Laune und Schlafqualität.', { timer: 30 }],
    ['Mach 10 Minuten Mobility für Schultern und Hüfte', 1, 'Beweglichkeit hilft dir im Gym und auf der Baustelle.', { timer: 10 }],
  ],
  ernaehrung: [
    ['Trink heute mindestens 2 Liter Wasser', 1, 'Schon leichter Flüssigkeitsmangel macht müde und unkonzentriert.', { auto: { typ: 'wasser', ml: 2000 } }],
    ['Trage heute alle Mahlzeiten im Kalorien-Tracker ein', 2, 'Wer aufschreibt, was er isst, isst bewusster.', { auto: { typ: 'mahlzeiten', n: 3 } }],
    ['Iss heute mindestens 2 Portionen Obst', 1, 'Obst liefert Vitamine und Ballaststoffe.'],
    ['Iss zu jeder Hauptmahlzeit etwas Gemüse', 2, 'Gemüse macht satt und liefert viele Nährstoffe bei wenig Kalorien.'],
    ['Verzichte heute auf zuckerhaltige Getränke', 2, 'Softdrinks enthalten viel Zucker, der kaum satt macht.'],
    ['Nimm dir heute ein selbstgemachtes Essen mit zur Arbeit', 2, 'Spart Geld und du weißt, was drin ist.'],
    ['Iss heute ohne Handy oder Fernseher', 1, 'Bewusst essen hilft, Sättigung besser zu spüren.'],
    ['Frühstücke heute in Ruhe', 1, 'Ein guter Start gibt Energie für den Vormittag.'],
    ['Iss heute eine eiweißreiche Mahlzeit (Ei, Quark, Fleisch, Hülsenfrüchte)', 1, 'Eiweiß hält lange satt und unterstützt deine Muskeln.'],
    ['Koch heute etwas Neues', 3, 'Kochen ist eine Fähigkeit fürs Leben – und macht Spaß.'],
    ['Kein Snack nach 21 Uhr', 2, 'Spätes Essen kann den Schlaf verschlechtern.'],
  ],
  schlaf: [
    ['Geh heute vor 23 Uhr ins Bett', 2, 'Genug Schlaf ist die Basis für Laune, Training und Konzentration.'],
    ['Kein Handy in der letzten halben Stunde vor dem Schlafen', 2, 'Weniger Bildschirm am Abend hilft beim Einschlafen.'],
    ['Lüfte dein Schlafzimmer vor dem Schlafen', 1, 'Kühle, frische Luft verbessert den Schlaf.'],
    ['Steh heute zur gleichen Zeit auf wie gestern', 2, 'Ein fester Rhythmus macht das Aufstehen leichter.'],
    ['Kein Koffein mehr nach 15 Uhr', 2, 'Koffein wirkt viele Stunden nach.'],
    ['Mach heute 15 Minuten echte Pause – ohne Bildschirm', 1, 'Kurze Erholung steigert die Leistung danach.', { timer: 15 }],
    ['Leg morgens 10 Minuten Tageslicht ein', 1, 'Morgenlicht stellt deine innere Uhr.', { timer: 10 }],
    ['Bereite heute Abend schon Kleidung und Tasche für morgen vor', 1, 'Ein ruhiger Morgen beginnt am Abend vorher.'],
  ],
  geist: [
    ['Mach 5 Minuten Atemübung oder Meditation', 1, 'Schon wenige Minuten senken nachweislich das Stresslevel.', { timer: 5 }],
    ['Schreib 3 Dinge auf, für die du heute dankbar bist', 1, 'Dankbarkeit lenkt den Blick auf das, was gut läuft.'],
    ['Verbring eine Stunde komplett ohne Handy', 2, 'Abstand vom Bildschirm schafft Ruhe im Kopf.', { timer: 60 }],
    ['Schreib 5 Minuten Tagebuch: Wie geht es dir gerade?', 1, 'Gedanken aufzuschreiben ordnet den Kopf.', { timer: 5 }],
    ['Mach 10 Minuten etwas nur für dich (Musik, Hobby, Zeichnen)', 1, 'Zeit für dich lädt die Batterien auf.', { timer: 10 }],
    ['Verzichte heute auf Social Media', 3, 'Weniger Vergleichen, mehr eigenes Leben.'],
    ['Geh ohne Kopfhörer spazieren und achte auf deine Umgebung', 1, 'Achtsames Gehen ist Meditation in Bewegung.'],
    ['Lob dich heute bewusst für eine Sache, die du gut gemacht hast', 1, 'Eigene Erfolge wahrnehmen stärkt das Selbstvertrauen.'],
    ['Begrenze deine Bildschirmzeit heute auf unter 3 Stunden (außer Arbeit)', 3, 'Mehr Zeit für Dinge, die dir wirklich wichtig sind.'],
    ['Mach 10 tiefe Atemzüge, bevor du in einer stressigen Situation reagierst', 1, 'Eine kurze Pause verhindert Ärger, den du später bereust.'],
  ],
  produktiv: [
    ['Schreib morgens deine 3 wichtigsten Aufgaben für heute auf', 1, 'Klare Prioritäten verhindern, dass der Tag einfach verfliegt.'],
    ['Erledige die unangenehmste Aufgabe zuerst', 2, '„Eat the frog“ – danach fühlt sich der Rest leicht an.'],
    ['Arbeite 25 Minuten fokussiert an einer Sache (Pomodoro)', 2, 'Konzentrierte Blöcke schaffen mehr als Multitasking.', { timer: 25 }],
    ['Plane deine Woche im Kalender', 2, 'Was einen festen Platz hat, wird auch gemacht.', { auto: { typ: 'termin' } }],
    ['Beantworte alle offenen Nachrichten, die schon länger warten', 1, 'Offene Schleifen kosten im Kopf Energie.'],
    ['Erledige eine Sache, die du schon lange aufschiebst', 3, 'Das gute Gefühl danach ist es wert.'],
    ['Mach eine 2-Minuten-Regel-Runde: alles, was unter 2 Minuten dauert, sofort erledigen', 1, 'Kleine Dinge sofort erledigen hält den Kopf frei.'],
    ['Sortiere deine Mails oder Downloads', 1, 'Digitale Ordnung spart Suchzeit.'],
    ['Schalte für 1 Stunde alle Benachrichtigungen aus', 2, 'Jede Unterbrechung kostet Minuten, bis du wieder drin bist.', { timer: 60 }],
    ['Bereite morgen schon heute vor: To-dos für morgen notieren', 1, 'So startest du morgen ohne Grübeln.'],
    ['Schreib ein Ziel für diesen Monat auf und den ersten kleinen Schritt', 2, 'Große Ziele werden durch kleine Schritte erreichbar.'],
  ],
  lernen: [
    ['Lerne 20 Minuten für die Berufsschule', 2, 'Regelmäßig ein bisschen ist effektiver als kurz vor der Prüfung viel.', { timer: 20 }],
    ['Wiederhole eine Formel oder Regel aus der Elektrotechnik', 1, 'Wiederholen festigt Wissen für die Prüfung.'],
    ['Lies 15 Minuten in einem Buch', 1, 'Lesen trainiert Konzentration und Wortschatz.', { timer: 15 }],
    ['Schau ein lehrreiches Video zu einem Thema, das dich interessiert', 1, 'Neugier ist der beste Lehrer.'],
    ['Lerne 10 Minuten eine Sprache', 1, 'Täglich kleine Einheiten bringen langfristig viel.', { timer: 10 }],
    ['Erklär jemandem etwas, das du gerade gelernt hast', 2, 'Wer erklärt, versteht es selbst am besten.'],
    ['Lies deine Notizen aus der letzten Berufsschulwoche durch', 2, 'Kurzes Wiederholen verhindert Vergessen.'],
    ['Probier etwas Neues aus, das du noch nie gemacht hast', 3, 'Neue Erfahrungen halten das Gehirn fit.'],
    ['Schreib das Berichtsheft für diese Woche weiter', 2, 'Zeitnah schreiben ist viel einfacher als nachträglich.'],
  ],
  sozial: [
    ['Ruf jemanden an, mit dem du lange nicht gesprochen hast', 2, 'Gute Beziehungen sind einer der stärksten Faktoren für Zufriedenheit.'],
    ['Mach jemandem ein ehrliches Kompliment', 1, 'Kostet nichts und macht zwei Menschen froh.'],
    ['Hilf heute jemandem ohne Gegenleistung', 2, 'Helfen tut auch dir selbst gut.'],
    ['Verbring Zeit mit Familie oder Freunden – ohne Handy', 2, 'Echte Zeit miteinander zählt mehr als Nachrichten.'],
    ['Schreib einer Person, dass du an sie denkst', 1, 'Kleine Gesten halten Freundschaften lebendig.'],
    ['Plane ein Treffen mit Freunden für diese Woche', 2, 'Was geplant ist, findet auch statt.'],
    ['Bedank dich bei einem Kollegen oder Ausbilder für etwas Konkretes', 1, 'Wertschätzung verbessert das Arbeitsklima.'],
    ['Hör heute in einem Gespräch richtig zu, ohne zu unterbrechen', 2, 'Zuhören ist eine unterschätzte Stärke.'],
  ],
  ordnung: [
    ['Räum 10 Minuten dein Zimmer auf', 1, 'Ordnung außen bringt Ruhe innen.', { timer: 10 }],
    ['Mach dein Bett direkt nach dem Aufstehen', 1, 'Die erste erledigte Aufgabe des Tages.'],
    ['Miste 5 Dinge aus, die du nicht mehr brauchst', 2, 'Weniger Zeug, weniger Ballast.'],
    ['Räum deine Arbeitstasche bzw. dein Werkzeug auf', 1, 'Wer sein Werkzeug findet, arbeitet schneller.'],
    ['Wasch und räum die Wäsche komplett weg', 2, 'Ein erledigter Wäscheberg ist ein gutes Gefühl.'],
    ['Lass heute abends kein dreckiges Geschirr stehen', 1, 'Ein aufgeräumter Morgen beginnt am Abend.'],
    ['Putz deinen Handybildschirm und deinen Schreibtisch', 1, 'Kleine Pflege, großer Unterschied.'],
    ['Lösch 20 alte Fotos oder Apps, die du nicht brauchst', 1, 'Digitales Aufräumen schafft Platz und Übersicht.'],
  ],
  geld: [
    ['Schreib heute alle Ausgaben auf', 1, 'Wer seine Ausgaben kennt, kann sie steuern.'],
    ['Gib heute kein Geld für Dinge aus, die du nicht brauchst', 2, 'Ein „No-Spend-Day“ zeigt, worauf du verzichten kannst.'],
    ['Leg einen festen Betrag zur Seite – auch wenn es nur 5 € sind', 1, 'Sparen ist vor allem eine Gewohnheit.'],
    ['Prüf deine Abos und kündige eins, das du nicht nutzt', 2, 'Kleine monatliche Beträge summieren sich.'],
    ['Vergleiche vor einem Kauf zwei Angebote', 1, 'Ein kurzer Vergleich spart oft viel.'],
    ['Setz dir ein Sparziel mit Betrag und Datum', 2, 'Konkrete Ziele motivieren mehr als „irgendwann sparen“.'],
    ['Lies 10 Minuten etwas über Geld oder Finanzen', 1, 'Finanzwissen zahlt sich ein Leben lang aus.', { timer: 10 }],
  ],
};

export const AUFGABEN = [];
for (const [bereich, liste] of Object.entries(POOL)) {
  liste.forEach(([text, stufe, warum, extra = {}], i) => AUFGABEN.push({ id: `${bereich}-${i}`, bereich, text, stufe, warum, ...extra }));
}
export const aufgabeMitId = (id) => AUFGABEN.find((a) => a.id === id);

// ---------- Zufall mit festem Startwert (gleicher Tag = gleiche Aufgaben) ----------
function zufall(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}

const GEWICHTE = { entspannt: { 1: 6, 2: 3, 3: 1 }, normal: { 1: 4, 2: 4, 3: 2 }, ehrgeizig: { 1: 2, 2: 4, 3: 4 } };

function wahl(rnd, liste, modus) {
  const g = GEWICHTE[modus] || GEWICHTE.normal;
  const summe = liste.reduce((s, a) => s + g[a.stufe], 0);
  let r = rnd() * summe;
  for (const a of liste) { r -= g[a.stufe]; if (r <= 0) return a; }
  return liste.at(-1);
}

function rohAuswahl(datum, nutzer, e, ausschluss = new Set()) {
  const rnd = zufall(`${nutzer}|${datum}`);
  const bereiche = [...e.bereiche].sort(() => rnd() - 0.5);
  const res = [];
  let i = 0;
  while (res.length < e.anzahl && i < e.anzahl * 6) {
    const b = bereiche[i % bereiche.length]; i++;
    const kandidaten = AUFGABEN.filter((a) => a.bereich === b && !ausschluss.has(a.id) && !res.includes(a));
    if (!kandidaten.length) continue;
    // pro Bereich höchstens eine Aufgabe, solange genug Bereiche aktiv sind
    if (bereiche.length >= e.anzahl && res.some((r) => r.bereich === b)) continue;
    res.push(wahl(rnd, kandidaten, e.schwierigkeit));
  }
  return res;
}

const minusTage = (s, n) => { const [y, m, d] = s.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, d - n)); return x.toISOString().slice(0, 10); };

/**
 * Aufgaben für einen Tag. e = { anzahl, schwierigkeit, bereiche[] }.
 * tausch = Liste { alt, nr } der getauschten Aufgaben an diesem Tag.
 */
export function aufgabenFuer(datum, nutzer, e, tausch = []) {
  // die Aufgaben der letzten 2 Tage möglichst nicht wiederholen
  const vorher = new Set();
  for (const n of [1, 2]) for (const a of rohAuswahl(minusTage(datum, n), nutzer, e)) vorher.add(a.id);
  let liste = rohAuswahl(datum, nutzer, e, vorher);
  if (liste.length < e.anzahl) liste = rohAuswahl(datum, nutzer, e);
  tausch.forEach((t, nr) => {
    const i = liste.findIndex((a) => a.id === t.alt);
    if (i < 0) return;
    const rnd = zufall(`${nutzer}|${datum}|tausch${nr}`);
    const bereich = liste[i].bereich;
    let kandidaten = AUFGABEN.filter((a) => a.bereich === bereich && !liste.includes(a));
    if (!kandidaten.length) kandidaten = AUFGABEN.filter((a) => e.bereiche.includes(a.bereich) && !liste.includes(a));
    liste[i] = kandidaten[Math.floor(rnd() * kandidaten.length)];
  });
  return liste;
}

// ---------- Wochen-Challenges ----------
export const CHALLENGES = [
  { id: 'c-aufgaben', text: 'Erledige diese Woche 20 Aufgaben', ziel: 20, typ: 'aufgaben', xp: 100 },
  { id: 'c-gym', text: 'Trainiere diese Woche 3-mal im Gym', ziel: 3, typ: 'gym', xp: 100 },
  { id: 'c-tage', text: 'Schaffe an 5 Tagen alle Tagesaufgaben', ziel: 5, typ: 'volletage', xp: 120 },
  { id: 'c-wasser', text: 'Erreiche an 5 Tagen dein Wasserziel (2 l)', ziel: 5, typ: 'wassertage', xp: 100 },
  { id: 'c-bereiche', text: 'Erledige Aufgaben aus 6 verschiedenen Bereichen', ziel: 6, typ: 'bereiche', xp: 80 },
  { id: 'c-schwer', text: 'Schaffe diese Woche 4 schwere Aufgaben', ziel: 4, typ: 'schwer', xp: 100 },
];
export function challengeFuer(wochenStartStr, nutzer) {
  const rnd = zufall(`${nutzer}|woche|${wochenStartStr}`);
  return CHALLENGES[Math.floor(rnd() * CHALLENGES.length)];
}

export function levelAusXp(xp) {
  const level = Math.floor(Math.sqrt(xp / 60)) + 1;
  const start = 60 * (level - 1) ** 2, ende = 60 * level ** 2;
  return { level, start, ende, fortschritt: (xp - start) / (ende - start) };
}

export const ABZEICHEN = [
  { id: 'erste', icon: '🌱', name: 'Erste Aufgabe', test: (s) => s.gesamt >= 1 },
  { id: 'voll', icon: '⭐', name: 'Erster perfekter Tag', test: (s) => s.volleTage >= 1 },
  { id: 's3', icon: '🔥', name: '3 Tage Streak', test: (s) => s.besterStreak >= 3 },
  { id: 's7', icon: '⚡', name: '7 Tage Streak', test: (s) => s.besterStreak >= 7 },
  { id: 's30', icon: '🏆', name: '30 Tage Streak', test: (s) => s.besterStreak >= 30 },
  { id: 'a50', icon: '💪', name: '50 Aufgaben', test: (s) => s.gesamt >= 50 },
  { id: 'a200', icon: '🚀', name: '200 Aufgaben', test: (s) => s.gesamt >= 200 },
  { id: 'alle', icon: '🌈', name: 'Alle Bereiche geschafft', test: (s) => s.bereiche >= BEREICHE.length },
  { id: 'schwer', icon: '🦾', name: '25 schwere Aufgaben', test: (s) => s.schwer >= 25 },
  { id: 'chall', icon: '🎯', name: 'Erste Wochen-Challenge', test: (s) => s.challenges >= 1 },
];
