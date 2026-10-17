// =============================================================
// Muskelkarte – Körper von vorne und hinten, eingefärbt pro Muskelgruppe
// werte: { Brust: 0..1, ... }  (1 = volle Farbe)
// =============================================================

const NEUTRAL = 'var(--card2)';
const UMRISS = 'var(--line)';

// Linke Körperhälfte; die rechte wird gespiegelt (x -> 120 - x)
const VORNE = [
  // [Muskel, SVG-Form]
  ['Schultern', 'M34,50 C24,50 19,60 20,70 C26,66 32,64 39,62 C41,56 39,51 34,50Z'],
  ['Brust', 'M58,54 C50,52 42,54 39,62 C38,70 42,78 50,79 C55,79 58,76 58,72Z'],
  ['Bizeps', 'M21,73 C17,80 17,92 20,99 C24,99 28,95 30,88 C31,80 29,73 25,70Z'],
  ['Bauch', 'M51,82 C55,82 58,82 58,82 L58,122 C54,122 50,118 49,112 C47,102 48,90 51,82Z'],
  ['Beine', 'M41,128 C36,142 37,165 42,180 C46,184 52,182 54,176 C57,162 57,142 55,130 C50,124 44,123 41,128Z'],
  ['Waden', 'M42,196 C39,206 40,222 44,232 C48,232 50,226 50,216 C50,206 49,198 46,194Z'],
];
const VORNE_NEUTRAL = [
  'M60,6 C51,6 47,13 47,22 C47,31 52,38 60,38 Z',                       // Kopf (Hälfte)
  'M53,38 L60,38 L60,48 L52,48Z',                                         // Hals
  'M19,101 C16,110 15,122 17,130 C20,131 23,129 24,124 C26,116 27,108 27,100Z', // Unterarm
  'M16,132 C13,136 13,142 16,145 C19,145 21,141 21,136Z',                 // Hand
  'M40,64 C40,90 42,110 46,124 L58,126 L58,124 C50,122 46,114 46,100 C45,88 48,80 47,80 C42,78 39,72 40,64Z', // Flanke
  'M44,182 C42,186 42,192 43,196 L47,194 C49,190 50,186 52,182Z',         // Knie
  'M43,234 C40,238 40,242 44,243 L52,243 C53,239 51,235 49,233Z',         // Fuß
];

const HINTEN = [
  ['Rücken', 'M60,44 C54,44 46,47 39,51 C44,56 52,60 60,64Z'],                 // Nacken/Trapez
  ['Schultern', 'M35,51 C25,51 20,60 20,70 C26,66 32,62 39,57Z'],
  ['Rücken', 'M40,60 C38,74 42,92 52,104 C56,106 58,104 58,100 L58,68 C52,64 46,61 40,60Z'], // Latissimus
  ['Trizeps', 'M21,73 C17,80 17,92 20,99 C24,99 28,95 30,88 C31,80 29,73 25,70Z'],
  ['Rücken', 'M52,107 C55,110 58,111 58,111 L58,122 C54,121 51,117 50,112Z'],  // unterer Rücken
  ['Po', 'M58,124 C50,122 42,124 40,132 C39,142 46,148 54,148 C57,147 58,144 58,140Z'],
  ['Beinbeuger', 'M41,150 C37,160 38,172 42,182 C46,186 52,184 54,178 C56,168 56,158 55,150 C50,148 44,148 41,150Z'],
  ['Waden', 'M42,192 C37,200 38,214 43,226 C48,228 51,222 51,212 C51,202 49,194 46,190Z'],
];
const HINTEN_NEUTRAL = [
  'M60,6 C51,6 47,13 47,22 C47,31 52,38 60,38 Z',
  'M53,38 L60,38 L60,44 L52,46Z',
  'M19,101 C16,110 15,122 17,130 C20,131 23,129 24,124 C26,116 27,108 27,100Z',
  'M16,132 C13,136 13,142 16,145 C19,145 21,141 21,136Z',
  'M44,184 C42,186 42,188 43,190 L47,189 C49,188 50,186 51,184Z',
  'M43,228 C40,234 40,240 44,243 L52,243 C53,238 51,232 49,229Z',
];

const spiegel = (pfad) => pfad.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${120 - x},${y}`);

function figur(teile, neutral, werte, farbe, versatz) {
  let out = `<g transform="translate(${versatz},0)">`;
  for (const p of neutral) {
    out += `<path d="${p}" fill="${NEUTRAL}" stroke="${UMRISS}" stroke-width=".8"/><path d="${spiegel(p)}" fill="${NEUTRAL}" stroke="${UMRISS}" stroke-width=".8"/>`;
  }
  for (const [muskel, p] of teile) {
    const w = werte[muskel] || 0;
    const fill = w > 0.02 ? farbe : NEUTRAL;
    const op = w > 0.02 ? (0.25 + 0.75 * Math.min(1, w)).toFixed(2) : 1;
    for (const d of [p, spiegel(p)]) {
      out += `<path d="${d}" fill="${fill}" fill-opacity="${op}" stroke="${UMRISS}" stroke-width=".8" data-muskel="${muskel}" class="mk-teil"/>`;
    }
  }
  return out + '</g>';
}

/** farbe: CSS-Farbe für belastete Muskeln */
export function muskelkarteSvg(werte, farbe = 'var(--fire)') {
  return `<svg class="muskelkarte" viewBox="0 0 260 250" role="img" aria-label="Muskelkarte">
    ${figur(VORNE, VORNE_NEUTRAL, werte, farbe, 5)}
    ${figur(HINTEN, HINTEN_NEUTRAL, werte, farbe, 135)}
    <text x="65" y="249" text-anchor="middle" class="mk-lbl">Vorne</text>
    <text x="195" y="249" text-anchor="middle" class="mk-lbl">Hinten</text>
  </svg>`;
}
