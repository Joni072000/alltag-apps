// =============================================================
// Gym-Tracker – Übungsbibliothek, Ränge, Berechnungen
// =============================================================

// Muskelgruppen (für Filter und Erholung)
export const MUSKELN = ['Brust', 'Rücken', 'Schultern', 'Bizeps', 'Trizeps', 'Beine', 'Beinbeuger', 'Po', 'Waden', 'Bauch'];

// typ: 'gewicht' (kg × Wdh.) | 'koerper' (Zusatzgewicht × Wdh., Körpergewicht zählt mit) | 'zeit' (Sekunden)
// std: geschätztes 1RM / Körpergewicht eines fortgeschrittenen Mannes (Basis für Ränge). null = kein Rang.
// Bei Kurzhantel-Übungen gilt das Gewicht pro Hand.
export const UEBUNGEN = [
  // Brust
  { id: 'bankdruecken', name: 'Bankdrücken (Langhantel)', muskel: 'Brust', neben: ['Trizeps', 'Schultern'], typ: 'gewicht', std: 1.5 },
  { id: 'schraegbank', name: 'Schrägbankdrücken (Langhantel)', muskel: 'Brust', neben: ['Schultern', 'Trizeps'], typ: 'gewicht', std: 1.3 },
  { id: 'kh-bankdruecken', name: 'Bankdrücken (Kurzhantel)', muskel: 'Brust', neben: ['Trizeps', 'Schultern'], typ: 'gewicht', std: 0.55 },
  { id: 'kh-schraegbank', name: 'Schrägbankdrücken (Kurzhantel)', muskel: 'Brust', neben: ['Schultern', 'Trizeps'], typ: 'gewicht', std: 0.48 },
  { id: 'butterfly', name: 'Butterfly (Maschine)', muskel: 'Brust', neben: [], typ: 'gewicht', std: 1.0 },
  { id: 'kabelzug-fly', name: 'Kabelzug-Fly', muskel: 'Brust', neben: [], typ: 'gewicht', std: 0.4 },
  { id: 'brustpresse', name: 'Brustpresse (Maschine)', muskel: 'Brust', neben: ['Trizeps'], typ: 'gewicht', std: 1.4 },
  { id: 'dips', name: 'Dips', muskel: 'Brust', neben: ['Trizeps', 'Schultern'], typ: 'koerper', std: 1.9 },
  { id: 'liegestuetze', name: 'Liegestütze', muskel: 'Brust', neben: ['Trizeps'], typ: 'koerper', std: null },
  // Rücken
  { id: 'kreuzheben', name: 'Kreuzheben', muskel: 'Rücken', neben: ['Beinbeuger', 'Po'], typ: 'gewicht', std: 2.4 },
  { id: 'klimmzuege', name: 'Klimmzüge', muskel: 'Rücken', neben: ['Bizeps'], typ: 'koerper', std: 1.7 },
  { id: 'latzug', name: 'Latzug', muskel: 'Rücken', neben: ['Bizeps'], typ: 'gewicht', std: 1.15 },
  { id: 'lh-rudern', name: 'Rudern (Langhantel)', muskel: 'Rücken', neben: ['Bizeps'], typ: 'gewicht', std: 1.3 },
  { id: 'kh-rudern', name: 'Rudern einarmig (Kurzhantel)', muskel: 'Rücken', neben: ['Bizeps'], typ: 'gewicht', std: 0.6 },
  { id: 'kabelrudern', name: 'Rudern am Kabel (sitzend)', muskel: 'Rücken', neben: ['Bizeps'], typ: 'gewicht', std: 1.2 },
  { id: 't-bar', name: 'T-Bar-Rudern', muskel: 'Rücken', neben: ['Bizeps'], typ: 'gewicht', std: 1.3 },
  { id: 'hyperextension', name: 'Hyperextensions', muskel: 'Rücken', neben: ['Po', 'Beinbeuger'], typ: 'koerper', std: null },
  // Schultern
  { id: 'schulterdruecken', name: 'Schulterdrücken (Langhantel)', muskel: 'Schultern', neben: ['Trizeps'], typ: 'gewicht', std: 1.0 },
  { id: 'kh-schulterdruecken', name: 'Schulterdrücken (Kurzhantel)', muskel: 'Schultern', neben: ['Trizeps'], typ: 'gewicht', std: 0.4 },
  { id: 'seitheben', name: 'Seitheben (Kurzhantel)', muskel: 'Schultern', neben: [], typ: 'gewicht', std: 0.3 },
  { id: 'kabel-seitheben', name: 'Seitheben am Kabel', muskel: 'Schultern', neben: [], typ: 'gewicht', std: 0.2 },
  { id: 'facepulls', name: 'Face Pulls', muskel: 'Schultern', neben: ['Rücken'], typ: 'gewicht', std: 0.6 },
  { id: 'reverse-fly', name: 'Reverse Fly (Maschine)', muskel: 'Schultern', neben: ['Rücken'], typ: 'gewicht', std: 0.7 },
  // Arme
  { id: 'lh-curls', name: 'Bizepscurls (Langhantel)', muskel: 'Bizeps', neben: [], typ: 'gewicht', std: 0.75 },
  { id: 'kh-curls', name: 'Bizepscurls (Kurzhantel)', muskel: 'Bizeps', neben: [], typ: 'gewicht', std: 0.35 },
  { id: 'hammercurls', name: 'Hammercurls', muskel: 'Bizeps', neben: [], typ: 'gewicht', std: 0.38 },
  { id: 'sz-curls', name: 'SZ-Curls', muskel: 'Bizeps', neben: [], typ: 'gewicht', std: 0.7 },
  { id: 'kabel-curls', name: 'Bizepscurls am Kabel', muskel: 'Bizeps', neben: [], typ: 'gewicht', std: 0.6 },
  { id: 'trizepsdruecken', name: 'Trizepsdrücken am Kabel', muskel: 'Trizeps', neben: [], typ: 'gewicht', std: 0.75 },
  { id: 'french-press', name: 'French Press (SZ)', muskel: 'Trizeps', neben: [], typ: 'gewicht', std: 0.7 },
  { id: 'overhead-trizeps', name: 'Überkopf-Trizeps am Kabel', muskel: 'Trizeps', neben: [], typ: 'gewicht', std: 0.6 },
  { id: 'enges-bankdruecken', name: 'Enges Bankdrücken', muskel: 'Trizeps', neben: ['Brust'], typ: 'gewicht', std: 1.3 },
  // Beine
  { id: 'kniebeugen', name: 'Kniebeugen', muskel: 'Beine', neben: ['Po', 'Beinbeuger'], typ: 'gewicht', std: 2.0 },
  { id: 'frontkniebeugen', name: 'Frontkniebeugen', muskel: 'Beine', neben: ['Po'], typ: 'gewicht', std: 1.6 },
  { id: 'beinpresse', name: 'Beinpresse', muskel: 'Beine', neben: ['Po'], typ: 'gewicht', std: 3.6 },
  { id: 'hackenschmidt', name: 'Hackenschmidt-Kniebeugen', muskel: 'Beine', neben: ['Po'], typ: 'gewicht', std: 2.4 },
  { id: 'beinstrecker', name: 'Beinstrecker', muskel: 'Beine', neben: [], typ: 'gewicht', std: 1.3 },
  { id: 'bulgarian', name: 'Bulgarian Split Squats (Kurzhantel)', muskel: 'Beine', neben: ['Po'], typ: 'gewicht', std: 0.6 },
  { id: 'ausfallschritte', name: 'Ausfallschritte (Kurzhantel)', muskel: 'Beine', neben: ['Po'], typ: 'gewicht', std: 0.5 },
  { id: 'rumaenisch', name: 'Rumänisches Kreuzheben', muskel: 'Beinbeuger', neben: ['Po', 'Rücken'], typ: 'gewicht', std: 1.8 },
  { id: 'beinbeuger-liegend', name: 'Beinbeuger (liegend)', muskel: 'Beinbeuger', neben: [], typ: 'gewicht', std: 1.0 },
  { id: 'beinbeuger-sitzend', name: 'Beinbeuger (sitzend)', muskel: 'Beinbeuger', neben: [], typ: 'gewicht', std: 1.1 },
  { id: 'hip-thrust', name: 'Hip Thrust', muskel: 'Po', neben: ['Beinbeuger'], typ: 'gewicht', std: 2.4 },
  { id: 'abduktoren', name: 'Abduktoren (Maschine)', muskel: 'Po', neben: [], typ: 'gewicht', std: 1.3 },
  { id: 'wadenheben-stehend', name: 'Wadenheben (stehend)', muskel: 'Waden', neben: [], typ: 'gewicht', std: 2.0 },
  { id: 'wadenheben-sitzend', name: 'Wadenheben (sitzend)', muskel: 'Waden', neben: [], typ: 'gewicht', std: 1.4 },
  // Bauch
  { id: 'crunches', name: 'Crunches', muskel: 'Bauch', neben: [], typ: 'koerper', std: null },
  { id: 'kabel-crunch', name: 'Kabel-Crunch', muskel: 'Bauch', neben: [], typ: 'gewicht', std: 1.0 },
  { id: 'beinheben', name: 'Hängendes Beinheben', muskel: 'Bauch', neben: [], typ: 'koerper', std: null },
  { id: 'plank', name: 'Plank', muskel: 'Bauch', neben: [], typ: 'zeit', std: null },
];

// Ränge (Anteil vom Standard)
export const RAENGE = [
  { name: 'Holz',     ab: 0,    farbe: '#8B5E3C' },
  { name: 'Eisen',    ab: 0.25, farbe: '#8A939E' },
  { name: 'Bronze',   ab: 0.40, farbe: '#CD7F32' },
  { name: 'Silber',   ab: 0.55, farbe: '#C9D1DA' },
  { name: 'Gold',     ab: 0.70, farbe: '#F5C542' },
  { name: 'Platin',   ab: 0.85, farbe: '#4FD1C5' },
  { name: 'Diamant',  ab: 1.00, farbe: '#5AB8FF' },
  { name: 'Champion', ab: 1.20, farbe: '#A86BFF' },
  { name: 'Titan',    ab: 1.45, farbe: '#FF4D6D' },
  { name: 'Olymp',    ab: 1.75, farbe: '#FFB800' },
];

// Geschätztes 1-Wiederholungs-Maximum (Epley)
export function e1rm(kg, wdh) {
  if (!kg || !wdh) return 0;
  return wdh === 1 ? kg : kg * (1 + wdh / 30);
}

// Effektives Gewicht eines Satzes (bei Körpergewichtsübungen zählt das Körpergewicht mit)
export function effGewicht(ueb, kg, koerpergewicht) {
  return ueb.typ === 'koerper' ? (koerpergewicht || 0) + (kg || 0) : (kg || 0);
}

export function rangFuer(ueb, best1rm, koerpergewicht, geschlecht) {
  if (!ueb?.std || !best1rm || !koerpergewicht) return null;
  const unterkoerper = ['Beine', 'Beinbeuger', 'Po', 'Waden'].includes(ueb.muskel);
  const faktor = geschlecht === 'w' ? (unterkoerper ? 0.75 : 0.62) : 1;
  const anteil = best1rm / koerpergewicht / (ueb.std * faktor);
  let i = 0;
  while (i + 1 < RAENGE.length && anteil >= RAENGE[i + 1].ab) i++;
  const naechster = RAENGE[i + 1];
  const fortschritt = naechster ? (anteil - RAENGE[i].ab) / (naechster.ab - RAENGE[i].ab) : 1;
  // kg (1RM), die zum nächsten Rang fehlen
  const ziel1rm = naechster ? naechster.ab * ueb.std * faktor * koerpergewicht : null;
  return { index: i, ...RAENGE[i], anteil, fortschritt: Math.max(0, Math.min(1, fortschritt)), naechster, ziel1rm };
}

// Level aus Gesamt-XP
export function levelAusXp(xp) {
  const level = Math.floor(Math.sqrt(xp / 50)) + 1;
  const start = 50 * (level - 1) ** 2, ende = 50 * level ** 2;
  return { level, start, ende, fortschritt: (xp - start) / (ende - start) };
}

// Hexagon-Abzeichen für einen Rang
export function rangBadge(rang, groesse = 36) {
  if (!rang) {
    return `<svg class="badge" width="${groesse}" height="${groesse}" viewBox="0 0 40 40" aria-label="Kein Rang">
      <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="none" stroke="var(--line)" stroke-width="2" stroke-dasharray="3 3"/>
      <text x="20" y="25" text-anchor="middle" font-size="13" fill="var(--muted)" font-weight="700">–</text></svg>`;
  }
  const buchst = rang.name[0];
  return `<svg class="badge" width="${groesse}" height="${groesse}" viewBox="0 0 40 40" aria-label="Rang ${rang.name}">
    <defs><linearGradient id="g${rang.index}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${rang.farbe}"/><stop offset="1" stop-color="${rang.farbe}" stop-opacity=".55"/></linearGradient></defs>
    <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="url(#g${rang.index})" stroke="${rang.farbe}" stroke-width="1.5"/>
    <polygon points="20,7 31.5,13.5 31.5,26.5 20,33 8.5,26.5 8.5,13.5" fill="rgba(0,0,0,.25)"/>
    <text x="20" y="25" text-anchor="middle" font-size="13" fill="#fff" font-weight="800">${buchst}</text></svg>`;
}
