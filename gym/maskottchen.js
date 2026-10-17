// =============================================================
// Maskottchen – wird durch Training gefüttert.
// Reine Logik + SVG als Text (kein DOM), damit auch die
// Supabase-Funktion für Mitteilungen dieselbe Datei nutzen kann.
// =============================================================

export const STUFEN = [
  { name: 'Winzling', ab: 0 },
  { name: 'Rookie', ab: 150 },
  { name: 'Athlet', ab: 500 },
  { name: 'Biest', ab: 1200 },
  { name: 'Titan', ab: 2500 },
  { name: 'Legende', ab: 5000 },
];

const tagKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

/** Futter (Energie) und Kraft, die ein Training bringt */
export function futterVon(t) {
  const d = t.data || {};
  const min = d.dauer_min || 0, saetze = d.saetze || 0, vol = d.volumen || 0;
  return {
    energie: Math.min(45, 15 + min * 0.5),
    kraft: min * 0.5 + saetze * 1.5 + (vol / 1000) * 2,
  };
}

/**
 * Spielt alle Trainings Tag für Tag durch und berechnet den Zustand des Maskottchens.
 * bis: Stichtag (Standard: heute). Trainings nach dem Stichtag werden ignoriert.
 */
export function berechneMaskottchen(trainings, bis = new Date()) {
  const ende = new Date(bis); ende.setHours(23, 59, 59, 999);
  const proTag = new Map();
  for (const t of trainings) {
    if (new Date(t.starts_at) > ende) continue;
    const k = tagKey(t.starts_at);
    if (!proTag.has(k)) proTag.set(k, []);
    proTag.get(k).push(t);
  }
  let energie = 60, kraft = 0, tageOhne = null;
  if (proTag.size) {
    const ersterTag = [...proTag.keys()].sort()[0];
    const tag = new Date(ersterTag + 'T12:00:00');
    const letzter = tagKey(ende);
    let ohne = 0;
    while (tagKey(tag) <= letzter) {
      const heute = proTag.get(tagKey(tag));
      if (heute) {
        for (const t of heute) { const f = futterVon(t); energie += f.energie; kraft += f.kraft; }
        energie = Math.min(100, energie);
        ohne = 0;
      } else {
        ohne++;
        energie -= ohne === 1 ? 4 : ohne === 2 ? 8 : 12;
        if (ohne >= 4) kraft *= 0.97;
        energie = Math.max(0, energie);
      }
      tag.setDate(tag.getDate() + 1);
    }
    tageOhne = ohne;
  }
  let stufeIndex = 0;
  while (stufeIndex + 1 < STUFEN.length && kraft >= STUFEN[stufeIndex + 1].ab) stufeIndex++;
  const naechste = STUFEN[stufeIndex + 1] || null;
  const stufeFortschritt = naechste ? (kraft - STUFEN[stufeIndex].ab) / (naechste.ab - STUFEN[stufeIndex].ab) : 1;
  const stimmung = energie >= 75 ? 'super' : energie >= 50 ? 'gut' : energie >= 25 ? 'traurig' : 'elend';
  return {
    energie: Math.round(energie), kraft: Math.round(kraft), stufeIndex, stufe: STUFEN[stufeIndex],
    naechste, stufeFortschritt: Math.max(0, Math.min(1, stufeFortschritt)),
    stimmung, dick: Math.max(0, Math.min(1, (60 - energie) / 60)), tageOhne,
  };
}

/** Sprechblase passend zur Stimmung */
export function spruch(m, name = 'Pumpi') {
  if (m.tageOhne === null) return `Hi, ich bin ${name}! Füttere mich mit deinem ersten Training 🍗`;
  if (m.tageOhne === 0) return m.stimmung === 'super' ? 'Mmmh, lecker Training! Ich fühl mich stark 💪' : 'Danke fürs Füttern! Weiter so 😊';
  if (m.stimmung === 'super') return 'Ich bin topfit! Ruhetag ist auch okay 😌';
  if (m.stimmung === 'gut') return m.tageOhne >= 2 ? 'Ich bekomme langsam Hunger … 🍗' : 'Alles gut! Bis zum nächsten Training 👋';
  if (m.stimmung === 'traurig') return `Seit ${m.tageOhne} Tagen kein Training … mir ist langweilig 😕`;
  return `${m.tageOhne} Tage ohne Training. Ich werde ganz schwach und dick 😢`;
}

/** Text für Erinnerungs-Mitteilungen */
export function hungerNachricht(m, name = 'Pumpi') {
  if (m.stimmung === 'elend') return { titel: `${name} geht es schlecht 😢`, text: `Seit ${m.tageOhne} Tagen kein Training. ${name} wird schwach und dick – rette ihn!` };
  if (m.stimmung === 'traurig') return { titel: `${name} ist traurig 😕`, text: `Seit ${m.tageOhne} Tagen kein Training. Ein kurzes Workout würde ihn glücklich machen.` };
  return { titel: `${name} hat Hunger 🍗`, text: `Seit ${m.tageOhne} Tagen kein Training. Zeit, ${name} zu füttern!` };
}

/** Das Maskottchen als SVG-Text */
export function maskottchenSvg(m, groesse = 160) {
  const s = m.stufeIndex, d = m.dick;
  const traurig = m.stimmung === 'traurig' || m.stimmung === 'elend';
  const farbeO = traurig ? '#8A90B8' : '#A48BFF';
  const farbeU = traurig ? '#5E6488' : '#6A48F0';
  const bauchF = traurig ? '#A9AECB' : '#C9B9FF';
  const rx = 50 + d * 20, ry = 52 + d * 5;          // Körper wird breiter, wenn dick
  const cy = 122;
  const arm = 8 + s * 2.2 - d * 2;                   // Bizeps wächst mit Stufe
  const armY = cy - 6;
  const flex = s >= 1 && !traurig;                   // starke & glückliche Tiere spannen an

  const armL = flex
    ? `<path d="M${100 - rx + 6},${armY} Q${100 - rx - 22},${armY - 4} ${100 - rx - 20},${armY - 34}" stroke="${farbeU}" stroke-width="${arm * 0.9}" stroke-linecap="round" fill="none"/>
       <circle cx="${100 - rx - 14}" cy="${armY - 8}" r="${arm * 0.95}" fill="${farbeO}"/>
       <circle cx="${100 - rx - 20}" cy="${armY - 36}" r="${arm * 0.62}" fill="${farbeU}"/>`
    : `<path d="M${100 - rx + 6},${armY} Q${100 - rx - 12},${armY + 14} ${100 - rx - 8},${armY + 34}" stroke="${farbeU}" stroke-width="${arm * 0.8}" stroke-linecap="round" fill="none"/>`;
  const armR = flex
    ? `<path d="M${100 + rx - 6},${armY} Q${100 + rx + 22},${armY - 4} ${100 + rx + 20},${armY - 34}" stroke="${farbeU}" stroke-width="${arm * 0.9}" stroke-linecap="round" fill="none"/>
       <circle cx="${100 + rx + 14}" cy="${armY - 8}" r="${arm * 0.95}" fill="${farbeO}"/>
       <circle cx="${100 + rx + 20}" cy="${armY - 36}" r="${arm * 0.62}" fill="${farbeU}"/>`
    : `<path d="M${100 + rx - 6},${armY} Q${100 + rx + 12},${armY + 14} ${100 + rx + 8},${armY + 34}" stroke="${farbeU}" stroke-width="${arm * 0.8}" stroke-linecap="round" fill="none"/>`;

  // Gesicht
  const ay = cy - 22;
  let augen, mund, extra = '';
  if (m.stimmung === 'super') {
    augen = `<path d="M78,${ay} q6,-8 12,0 M110,${ay} q6,-8 12,0" stroke="#1B1340" stroke-width="4" stroke-linecap="round" fill="none"/>`;
    mund = `<path d="M86,${ay + 14} q14,16 28,0 z" fill="#1B1340"/><path d="M93,${ay + 20} q7,5 14,0" fill="#FF7A9A"/>`;
    extra = `<ellipse cx="72" cy="${ay + 10}" rx="7" ry="4" fill="#FF7A9A" opacity=".55"/><ellipse cx="128" cy="${ay + 10}" rx="7" ry="4" fill="#FF7A9A" opacity=".55"/>`;
  } else if (m.stimmung === 'gut') {
    augen = `<circle cx="84" cy="${ay}" r="6" fill="#1B1340"/><circle cx="116" cy="${ay}" r="6" fill="#1B1340"/><circle cx="86" cy="${ay - 2}" r="2" fill="#fff"/><circle cx="118" cy="${ay - 2}" r="2" fill="#fff"/>`;
    mund = `<path d="M90,${ay + 14} q10,8 20,0" stroke="#1B1340" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
  } else {
    augen = `<circle cx="84" cy="${ay + 2}" r="5.5" fill="#1B1340"/><circle cx="116" cy="${ay + 2}" r="5.5" fill="#1B1340"/>
      <path d="M74,${ay - 7} l14,-6 M126,${ay - 7} l-14,-6" stroke="#1B1340" stroke-width="3" stroke-linecap="round"/>`;
    mund = `<path d="M90,${ay + 20} q10,-9 20,0" stroke="#1B1340" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
    if (m.stimmung === 'elend') extra = `<path d="M80,${ay + 9} q-3,7 0,10 q3,-3 0,-10z" fill="#5AB8FF"/>`;
  }

  // Sixpack, wenn stark und nicht dick
  const sixpack = s >= 2 && d < 0.25
    ? [0, 1, 2].map((r) => `<rect x="90" y="${cy + 6 + r * 11}" width="8" height="8" rx="3" fill="${farbeU}" opacity=".35"/><rect x="102" y="${cy + 6 + r * 11}" width="8" height="8" rx="3" fill="${farbeU}" opacity=".35"/>`).join('')
    : '';

  // Zubehör je Stufe
  const kopfY = cy - ry + 6;
  const stirnband = s >= 1 ? `<path d="M${100 - rx * 0.78},${kopfY + 16} Q100,${kopfY + 4} ${100 + rx * 0.78},${kopfY + 16}" stroke="#FF4D6D" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M${100 + rx * 0.74},${kopfY + 15} l14,6 l-4,-12z" fill="#FF4D6D"/>` : '';
  const baender = s >= 3 && flex ? `<rect x="${100 - rx - 26}" y="${armY - 26}" width="12" height="6" rx="2" fill="#F5C542"/><rect x="${100 + rx + 14}" y="${armY - 26}" width="12" height="6" rx="2" fill="#F5C542"/>` : '';
  const krone = s >= 5 ? `<path d="M84,${kopfY - 4} l4,-16 l8,9 l4,-13 l4,13 l8,-9 l4,16z" fill="#FFB800" stroke="#C98A00" stroke-width="1.5"/>` : '';
  const funken = m.stimmung === 'super' ? `<g fill="#FFC24A"><path d="M30,40 l3,7 7,3 -7,3 -3,7 -3,-7 -7,-3 7,-3z"/><path d="M168,58 l2,5 5,2 -5,2 -2,5 -2,-5 -5,-2 5,-2z"/></g>` : '';
  const fliegen = m.stimmung === 'elend' ? `<g fill="#8C94A6" opacity=".7"><circle cx="40" cy="70" r="2.5"/><circle cx="160" cy="88" r="2.5"/><path d="M36,66 q4,-4 8,0 M156,84 q4,-4 8,0" stroke="#8C94A6" fill="none"/></g>` : '';

  return `<svg viewBox="0 0 200 200" width="${groesse}" height="${groesse}" class="pet pet-${m.stimmung}" aria-label="Maskottchen">
    <defs><linearGradient id="petK-${m.stimmung}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${farbeO}"/><stop offset="1" stop-color="${farbeU}"/></linearGradient></defs>
    <ellipse cx="100" cy="186" rx="${rx * 0.9}" ry="7" fill="#000" opacity=".3"/>
    ${funken}${fliegen}
    <g class="pet-body">
      <rect x="${100 - rx * 0.5 - 8}" y="${cy + ry - 14}" width="18" height="24" rx="9" fill="${farbeU}"/>
      <rect x="${100 + rx * 0.5 - 10}" y="${cy + ry - 14}" width="18" height="24" rx="9" fill="${farbeU}"/>
      ${armL}${armR}${baender}
      <ellipse cx="100" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#petK-${m.stimmung})"/>
      <ellipse cx="100" cy="${cy + 18 + d * 4}" rx="${rx * 0.55 + d * 8}" ry="${ry * 0.45 + d * 6}" fill="${bauchF}" opacity=".55"/>
      ${sixpack}${stirnband}${krone}
      ${augen}${mund}${extra}
    </g>
  </svg>`;
}
