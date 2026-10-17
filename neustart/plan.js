// =============================================================
// Neustart – Plan, Meilensteine, Berechnungen
// =============================================================

export const MEILENSTEINE = [
  { tage: 1, name: 'Erster Tag', icon: '🌱' },
  { tage: 3, name: '3 Tage', icon: '🌿' },
  { tage: 7, name: '1 Woche', icon: '🔥' },
  { tage: 14, name: '2 Wochen', icon: '⚡' },
  { tage: 30, name: '1 Monat', icon: '🏅' },
  { tage: 60, name: '2 Monate', icon: '💎' },
  { tage: 90, name: '90 Tage', icon: '🏆' },
  { tage: 180, name: 'Halbes Jahr', icon: '🚀' },
  { tage: 365, name: '1 Jahr', icon: '👑' },
];

export const AUSLOESER = ['Langeweile', 'Stress', 'Müdigkeit', 'Einsamkeit', 'Abends im Bett', 'Social Media', 'Alleine zuhause', 'Schlechte Laune', 'Alkohol', 'Morgens'];

export const ALTERNATIVEN = [
  '20 Liegestütze oder Kniebeugen – sofort', 'Kalt duschen oder Gesicht kalt waschen', 'Raus an die frische Luft – 10 Minuten gehen',
  'Ein großes Glas Wasser trinken', 'Jemandem schreiben oder anrufen', 'Handy in einen anderen Raum legen',
  'Ins Gym oder ein kurzes Workout starten', 'Zimmer aufräumen – 5 Minuten', 'Musik an und laut mitsingen',
  'Etwas für die Berufsschule lernen', '10 tiefe Atemzüge', 'Aufschreiben, was du gerade fühlst',
  'Etwas kochen oder einen Snack machen', 'Ein Video-Tutorial zu einem Hobby schauen', 'Licht an, Tür auf, unter Leute gehen',
];

// Phasen des 90-Tage-Plans und Tagesaufgaben
export const PHASEN = [
  { ab: 1, bis: 7, name: 'Start', text: 'Verstehen, wann und warum der Drang kommt.' },
  { ab: 8, bis: 30, name: 'Umbauen', text: 'Alte Gewohnheiten durch neue ersetzen.' },
  { ab: 31, bis: 60, name: 'Festigen', text: 'Die neuen Gewohnheiten werden normal.' },
  { ab: 61, bis: 90, name: 'Selbstläufer', text: 'Du bist jemand, der das nicht mehr braucht.' },
];

const AUFGABEN = [
  // Start (Tag 1–7)
  'Schreib im Profil mindestens 3 Gründe auf, warum du das machst.',
  'Richte die Bildschirmzeit- bzw. Jugendschutz-Einstellungen an deinem Handy ein.',
  'Notiere heute jedes Mal, wenn ein Drang kommt – Uhrzeit und Situation.',
  'Lade das Handy heute Nacht außerhalb vom Bett bzw. Schlafzimmer.',
  'Überleg dir 3 Dinge, die du statt dessen machst, wenn der Drang kommt.',
  'Entfolge Accounts, die dich triggern.',
  'Probier die Atemübung im Notfall-Bereich einmal in Ruhe aus.',
  // Umbauen (Tag 8–30)
  'Mach heute mindestens 20 Minuten Sport.', 'Geh vor Mitternacht schlafen.', 'Verbring heute Zeit mit Freunden oder Familie.',
  'Schreib einen Tagebucheintrag: Wie fühlst du dich nach der ersten Woche?', 'Lies 15 Minuten in einem Buch.',
  'Plane deinen nächsten Abend mit etwas Konkretem.', 'Steh morgens auf, ohne zuerst aufs Handy zu schauen.',
  'Geh 30 Minuten spazieren – ohne Kopfhörer.', 'Lerne etwas Neues für Beruf oder Hobby.',
  'Schau in deine Statistik: Zu welcher Uhrzeit ist der Drang am stärksten? Plane für diese Zeit etwas.',
  'Mach heute etwas, auf das du stolz bist.', 'Räum dein Zimmer auf.', 'Trink über den Tag 2 Liter Wasser.',
  'Schreib auf, was sich seit dem Start verändert hat.', 'Probier kalt zu duschen.',
  // Festigen (Tag 31–60)
  'Setz dir ein neues Ziel für die nächsten 30 Tage (Sport, Lernen, Geld).', 'Verbring einen Abend komplett offline.',
  'Hilf heute jemandem.', 'Lies deine Gründe noch einmal und ergänze einen neuen.', 'Mach einen langen Spaziergang oder eine Radtour.',
  'Plane dein Wochenende mit festen Aktivitäten.', 'Schreib dir selbst einen Brief für schwache Momente.',
  // Selbstläufer (Tag 61–90)
  'Überleg dir, welche Situationen früher kritisch waren und heute nicht mehr.', 'Gönn dir etwas als Belohnung für deinen Fortschritt.',
  'Schreib auf, was du anderen raten würdest, die gerade anfangen.',
];

/** Aufgabe für Plantag n (1-basiert) */
export function aufgabeFuer(tag) {
  if (tag <= 7) return { id: `a${tag}`, text: AUFGABEN[tag - 1] };
  const rest = AUFGABEN.slice(7);
  const i = (tag - 8) % rest.length;
  return { id: `a${tag}`, text: rest[i] };
}
export const phaseFuer = (tag) => PHASEN.find((p) => tag >= p.ab && tag <= p.bis) || PHASEN.at(-1);

export function meilensteinInfo(tage) {
  let erreicht = null;
  for (const m of MEILENSTEINE) if (tage >= m.tage) erreicht = m;
  const naechster = MEILENSTEINE.find((m) => m.tage > tage) || null;
  const vorher = erreicht ? erreicht.tage : 0;
  return { erreicht, naechster, fortschritt: naechster ? (tage - vorher) / (naechster.tage - vorher) : 1 };
}

export function levelAusXp(xp) {
  const level = Math.floor(Math.sqrt(xp / 40)) + 1;
  const start = 40 * (level - 1) ** 2, ende = 40 * level ** 2;
  return { level, start, ende, fortschritt: (xp - start) / (ende - start) };
}
