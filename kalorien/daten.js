// =============================================================
// Kalorien-Tracker – Grundlebensmittel, Online-Datenbank, Berechnungen
// =============================================================

// Grundlebensmittel (Werte pro 100 g, gerundete Durchschnittswerte)
// [Name, kcal, Eiweiß, Kohlenhydrate, Fett, Gramm pro Stück, Stück-Bezeichnung]
const BASIS = [
  // Obst
  ['Apfel', 52, 0.3, 11.4, 0.2, 180, 'Stück'], ['Banane', 93, 1.1, 20, 0.2, 120, 'Stück'], ['Birne', 57, 0.4, 12.4, 0.1, 170, 'Stück'],
  ['Orange', 47, 0.9, 9.4, 0.1, 150, 'Stück'], ['Mandarine', 50, 0.7, 10.1, 0.3, 70, 'Stück'], ['Kiwi', 58, 1.1, 10.3, 0.5, 75, 'Stück'],
  ['Erdbeeren', 33, 0.7, 5.5, 0.3], ['Heidelbeeren', 46, 0.7, 7.4, 0.3], ['Himbeeren', 43, 1.2, 4.8, 0.7],
  ['Weintrauben', 70, 0.7, 15.6, 0.3], ['Ananas', 55, 0.5, 12.4, 0.2], ['Mango', 62, 0.6, 12.8, 0.4, 300, 'Stück'],
  ['Wassermelone', 30, 0.6, 7.6, 0.2], ['Pfirsich', 41, 0.8, 8.9, 0.1, 150, 'Stück'], ['Avocado', 160, 2, 8.5, 14.7, 150, 'Stück'],
  ['Zitrone', 29, 1.1, 3.2, 0.3, 60, 'Stück'], ['Datteln, getrocknet', 282, 2.5, 66, 0.4, 8, 'Stück'], ['Rosinen', 299, 3.1, 68, 0.5],
  // Gemüse
  ['Tomate', 18, 0.9, 2.6, 0.2, 100, 'Stück'], ['Gurke', 12, 0.6, 1.8, 0.2], ['Paprika', 26, 1, 4.6, 0.3, 160, 'Stück'],
  ['Karotte', 36, 0.9, 6.9, 0.2, 80, 'Stück'], ['Brokkoli', 34, 3.8, 2.7, 0.4], ['Blumenkohl', 25, 2, 2.3, 0.3],
  ['Zucchini', 19, 1.6, 2.2, 0.4], ['Spinat', 23, 2.9, 0.6, 0.4], ['Kopfsalat', 14, 1.2, 1.1, 0.2],
  ['Eisbergsalat', 14, 0.9, 1.9, 0.1], ['Zwiebel', 40, 1.2, 7.6, 0.1, 80, 'Stück'], ['Knoblauch', 149, 6.4, 28, 0.5, 4, 'Zehe'],
  ['Champignons', 22, 3.1, 0.6, 0.3], ['Mais (Dose)', 82, 2.8, 15, 1.2], ['Erbsen', 81, 5.4, 12, 0.4],
  ['Grüne Bohnen', 31, 1.8, 5, 0.2], ['Süßkartoffel', 86, 1.6, 20, 0.1, 200, 'Stück'], ['Kartoffeln, gekocht', 78, 2, 17, 0.1, 80, 'Stück'],
  ['Pommes frites', 290, 3.4, 36, 15], ['Bratkartoffeln', 150, 2.5, 20, 6.5], ['Kartoffelpüree', 90, 2, 13, 3.3],
  // Getreide & Beilagen
  ['Haferflocken', 372, 13.5, 58.7, 7], ['Müsli (ungezuckert)', 360, 10, 60, 6.5], ['Cornflakes', 378, 7, 84, 0.9],
  ['Reis, gekocht', 130, 2.7, 28, 0.3], ['Reis, roh', 350, 7, 78, 0.6], ['Nudeln, gekocht', 150, 5.3, 30, 0.9],
  ['Nudeln, roh', 355, 12.5, 71, 1.5], ['Vollkornnudeln, gekocht', 140, 5.8, 26, 1.1], ['Couscous, gekocht', 112, 3.8, 23, 0.2],
  ['Quinoa, gekocht', 120, 4.4, 21, 1.9], ['Bulgur, gekocht', 83, 3.1, 18.6, 0.2],
  ['Toastbrot', 265, 8, 48, 3.6, 28, 'Scheibe'], ['Vollkornbrot', 220, 7.5, 40, 1.8, 50, 'Scheibe'],
  ['Mischbrot', 230, 6.5, 46, 1.2, 45, 'Scheibe'], ['Brötchen', 270, 9, 53, 1.8, 55, 'Stück'],
  ['Vollkornbrötchen', 250, 9.5, 44, 3, 60, 'Stück'], ['Laugenbrezel', 275, 8.5, 55, 2, 85, 'Stück'],
  ['Croissant', 410, 8, 45, 21, 60, 'Stück'], ['Wrap / Tortilla', 300, 8.5, 50, 7, 60, 'Stück'], ['Reiswaffel', 380, 8, 80, 3, 8, 'Stück'],
  // Milchprodukte & Eier
  ['Ei', 155, 13, 1.1, 11, 60, 'Stück'], ['Rührei', 150, 10, 1.5, 11.5], ['Milch 1,5 %', 47, 3.4, 4.8, 1.5],
  ['Milch 3,5 %', 64, 3.3, 4.8, 3.5], ['Hafermilch', 46, 0.5, 6.7, 1.5], ['Joghurt 1,5 %', 50, 3.6, 4.5, 1.5],
  ['Joghurt 3,5 %', 66, 3.4, 4.5, 3.5], ['Griechischer Joghurt 10 %', 130, 4, 4, 10], ['Skyr', 63, 11, 4, 0.2],
  ['Magerquark', 68, 12, 4, 0.3], ['Hüttenkäse', 98, 12.5, 2.7, 4.3], ['Gouda', 356, 25, 0, 28, 25, 'Scheibe'],
  ['Mozzarella', 254, 18, 1, 19.5, 125, 'Kugel'], ['Feta', 264, 14, 4, 21], ['Parmesan', 392, 36, 0, 26],
  ['Frischkäse', 250, 6, 3.5, 24], ['Butter', 741, 0.7, 0.6, 83, 10, 'Portion'], ['Sahne', 300, 2.4, 3.2, 31],
  ['Proteinpulver (Whey)', 380, 78, 6, 5, 30, 'Messlöffel'],
  // Fleisch & Fisch
  ['Hähnchenbrust, roh', 110, 23, 0, 1.5], ['Hähnchenbrust, gebraten', 165, 31, 0, 3.6], ['Putenbrust, roh', 105, 24, 0, 1],
  ['Rinderhackfleisch', 250, 18, 0, 20], ['Gemischtes Hackfleisch', 260, 18, 0, 21], ['Rindersteak, gebraten', 200, 29, 0, 9],
  ['Schweineschnitzel, roh', 106, 22, 0, 2], ['Schnitzel, paniert', 230, 18, 12, 12], ['Bratwurst', 300, 13, 1, 27, 100, 'Stück'],
  ['Wiener Würstchen', 270, 12, 1, 24, 50, 'Stück'], ['Salami', 380, 21, 1, 33, 6, 'Scheibe'], ['Kochschinken', 115, 19, 1, 4, 20, 'Scheibe'],
  ['Putenaufschnitt', 105, 20, 1.5, 2, 15, 'Scheibe'], ['Speck', 450, 14, 0, 43], ['Döner Kebab', 215, 11, 20, 10, 400, 'Stück'],
  ['Lachs', 200, 20, 0, 13], ['Thunfisch (Dose, Wasser)', 110, 25, 0, 1], ['Fischstäbchen', 210, 13, 18, 9, 30, 'Stück'],
  ['Garnelen', 99, 24, 0.2, 0.3],
  // Hülsenfrüchte, Nüsse, Vegetarisch
  ['Kidneybohnen (Dose)', 90, 6, 13, 0.5], ['Kichererbsen (Dose)', 120, 7, 16, 2.5], ['Linsen, gekocht', 116, 9, 20, 0.4],
  ['Tofu', 120, 13, 1.5, 7], ['Hummus', 280, 7.5, 13, 21], ['Erdnüsse', 585, 25, 13, 49], ['Mandeln', 600, 21, 7, 52],
  ['Walnüsse', 680, 15, 7, 65], ['Cashews', 580, 18, 30, 44], ['Erdnussbutter', 600, 25, 14, 50, 15, 'EL'],
  ['Chiasamen', 490, 17, 8, 31], ['Leinsamen', 535, 18, 2, 42],
  // Öle, Saucen, Brotaufstrich
  ['Olivenöl', 884, 0, 0, 100, 10, 'EL'], ['Rapsöl', 884, 0, 0, 100, 10, 'EL'], ['Mayonnaise', 680, 1, 1.5, 75, 15, 'EL'],
  ['Ketchup', 110, 1.2, 24, 0.2, 15, 'EL'], ['Senf', 80, 6, 5, 4, 10, 'TL'], ['Honig', 304, 0.3, 82, 0, 20, 'TL'],
  ['Marmelade', 250, 0.4, 60, 0.1, 20, 'Portion'], ['Nuss-Nougat-Creme', 540, 6, 57, 31, 20, 'Portion'], ['Zucker', 400, 0, 100, 0, 4, 'TL'],
  ['Pesto', 450, 5, 6, 45], ['Tomatensauce', 50, 1.5, 7, 1.5],
  // Gerichte & Snacks
  ['Pizza Margherita', 250, 11, 31, 9, 350, 'Pizza'], ['Spaghetti Bolognese', 150, 7.5, 18, 5], ['Burger', 250, 13, 24, 11, 220, 'Stück'],
  ['Currywurst', 230, 9, 10, 17, 250, 'Portion'], ['Lasagne', 160, 8, 13, 8], ['Chili con Carne', 110, 8, 9, 4.5],
  ['Schokolade, Vollmilch', 535, 7, 57, 30, 25, 'Riegel'], ['Zartbitterschokolade 70 %', 580, 8, 34, 43],
  ['Gummibärchen', 340, 6.5, 77, 0.2], ['Chips', 535, 6.5, 50, 34], ['Kekse', 480, 6, 68, 20, 10, 'Stück'],
  ['Müsliriegel', 410, 6, 63, 14, 25, 'Stück'], ['Proteinriegel', 360, 33, 30, 12, 45, 'Stück'], ['Eis (Vanille)', 210, 3.5, 24, 11],
  ['Popcorn, süß', 480, 6, 75, 17],
  // Getränke
  ['Cola', 42, 0, 10.6, 0], ['Cola Zero', 0.3, 0, 0, 0], ['Orangensaft', 45, 0.7, 10, 0.2], ['Apfelschorle', 24, 0, 5.5, 0],
  ['Bier', 43, 0.5, 3.6, 0, 500, 'Flasche'], ['Rotwein', 85, 0.1, 2.6, 0, 200, 'Glas'], ['Energy Drink', 45, 0, 11, 0, 250, 'Dose'],
  ['Kaffee, schwarz', 2, 0.1, 0, 0, 200, 'Tasse'], ['Cappuccino', 40, 2, 3.5, 2, 200, 'Tasse'], ['Latte Macchiato', 45, 2.4, 3.6, 2.3, 300, 'Glas'],
  ['Proteinshake (mit Milch)', 80, 9, 5, 2.5],
];

export const GRUNDLEBENSMITTEL = BASIS.map(([name, kcal, eiweiss, kh, fett, stueckG, stueckName]) => ({
  id: 'basis-' + name.toLowerCase().replace(/[^a-zäöüß0-9]+/g, '-'),
  name, quelle: 'basis',
  pro100: { kcal, eiweiss, kh, fett },
  portionen: stueckG ? [{ name: `1 ${stueckName}`, g: stueckG }] : [],
}));

// ---------- Open Food Facts (kostenlose Lebensmittel-Datenbank) --------
const OFF_FELDER = 'code,product_name,product_name_de,brands,nutriments,serving_quantity,serving_size,image_front_small_url,quantity';

function ausOff(p) {
  const n = p.nutriments || {};
  let kcal = n['energy-kcal_100g'];
  if (kcal == null && n['energy_100g'] != null) kcal = n['energy_100g'] / 4.184; // kJ -> kcal
  const name = (p.product_name_de || p.product_name || '').trim();
  if (!name || kcal == null) return null;
  const portionen = [];
  const sq = parseFloat(p.serving_quantity);
  if (sq > 0) portionen.push({ name: `1 Portion${p.serving_size ? ` (${p.serving_size})` : ''}`, g: sq });
  const packung = parseFloat(String(p.quantity || '').replace(',', '.'));
  if (packung > 0 && /g|ml/i.test(p.quantity || '') && !/kg|l\b/i.test(p.quantity || '')) portionen.push({ name: `1 Packung (${p.quantity})`, g: packung });
  return {
    id: 'off-' + p.code, code: p.code, name, marke: (p.brands || '').split(',')[0].trim(), quelle: 'off',
    bild: p.image_front_small_url || null,
    pro100: {
      kcal: Math.round(kcal), eiweiss: +(n.proteins_100g || 0), kh: +(n.carbohydrates_100g || 0), fett: +(n.fat_100g || 0),
      zucker: n.sugars_100g != null ? +n.sugars_100g : null, ballast: n.fiber_100g != null ? +n.fiber_100g : null,
    },
    portionen,
  };
}

export async function produktPerBarcode(code) {
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FELDER}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('Datenbank nicht erreichbar');
  const j = await r.json();
  if (!j.product || j.status === 0) return null;
  return ausOff({ ...j.product, code: j.product.code || code });
}

export async function sucheOnline(text, signal) {
  // 1. neue Suche, 2. Fallback auf die klassische Suche
  try {
    const r = await fetch(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(text)}&langs=de&page_size=25&fields=${OFF_FELDER}`, { signal });
    if (r.ok) {
      const j = await r.json();
      const liste = (j.hits || []).map((h) => ausOff({ ...h, product_name: typeof h.product_name === 'object' ? (h.product_name.de || h.product_name.main || Object.values(h.product_name)[0]) : h.product_name })).filter(Boolean);
      if (liste.length) return liste;
    }
  } catch (e) { if (e.name === 'AbortError') throw e; }
  const r = await fetch(`https://de.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(text)}&search_simple=1&action=process&json=1&page_size=25&fields=${OFF_FELDER}`, { signal });
  if (!r.ok) throw new Error('Suche gerade nicht erreichbar');
  const j = await r.json();
  return (j.products || []).map(ausOff).filter(Boolean);
}

export function sucheLokal(text, eigene = []) {
  const q = text.trim().toLowerCase();
  if (!q) return [];
  const teile = q.split(/\s+/);
  const passt = (l) => teile.every((t) => `${l.name} ${l.marke || ''}`.toLowerCase().includes(t));
  const alle = [...eigene, ...GRUNDLEBENSMITTEL].filter(passt);
  return alle.sort((a, b) => (a.name.toLowerCase().startsWith(q) ? -1 : 0) - (b.name.toLowerCase().startsWith(q) ? -1 : 0)).slice(0, 15);
}

// ---------- Berechnungen ----------------------------------------
export const MAHLZEITEN = [
  { id: 'fruehstueck', name: 'Frühstück', icon: '☕', anteil: 0.25, stunde: 8 },
  { id: 'mittag', name: 'Mittagessen', icon: '🍲', anteil: 0.35, stunde: 12 },
  { id: 'abend', name: 'Abendessen', icon: '🍽️', anteil: 0.30, stunde: 19 },
  { id: 'snacks', name: 'Snacks', icon: '🍎', anteil: 0.10, stunde: 16 },
];

export const AKTIVITAET = [
  { id: 'wenig', name: 'Kaum aktiv', text: 'Bürojob, wenig Bewegung', faktor: 1.2 },
  { id: 'leicht', name: 'Leicht aktiv', text: 'Viel stehen oder gehen', faktor: 1.375 },
  { id: 'mittel', name: 'Aktiv', text: 'Körperliche Arbeit, z. B. Handwerk', faktor: 1.55 },
  { id: 'hoch', name: 'Sehr aktiv', text: 'Schwere körperliche Arbeit', faktor: 1.725 },
];

export const MAKRO_VORLAGEN = [
  { id: 'ausgewogen', name: 'Ausgewogen', kh: 50, eiweiss: 20, fett: 30 },
  { id: 'protein', name: 'Proteinreich', kh: 40, eiweiss: 30, fett: 30 },
  { id: 'lowcarb', name: 'Low Carb', kh: 25, eiweiss: 35, fett: 40 },
];

/** Tagesziel nach Mifflin-St-Jeor; Training wird separat über den Gym-Tracker addiert */
export function berechneZiel(z) {
  const { gewicht, groesse, geburtsjahr, geschlecht = 'm', aktivitaet = 'leicht', ziel = 'halten', tempo = 0.5 } = z;
  if (!gewicht || !groesse || !geburtsjahr) return null;
  const alter = new Date().getFullYear() - geburtsjahr;
  const grund = 10 * gewicht + 6.25 * groesse - 5 * alter + (geschlecht === 'w' ? -161 : 5);
  const faktor = (AKTIVITAET.find((a) => a.id === aktivitaet) || AKTIVITAET[1]).faktor;
  const bedarf = grund * faktor;
  let kcal = bedarf;
  if (ziel === 'abnehmen') kcal = bedarf - (tempo * 7700) / 7;
  if (ziel === 'zunehmen') kcal = bedarf + (tempo * 7700) / 7;
  const minimum = geschlecht === 'w' ? 1200 : 1500;            // nicht gesundheitsschädlich niedrig
  kcal = Math.max(minimum, Math.round(kcal / 10) * 10);
  return { kcal, grundumsatz: Math.round(grund), bedarf: Math.round(bedarf) };
}

export function makroZiele(kcal, vorlageId = 'ausgewogen') {
  const v = MAKRO_VORLAGEN.find((m) => m.id === vorlageId) || MAKRO_VORLAGEN[0];
  return {
    kh: Math.round((kcal * v.kh) / 100 / 4),
    eiweiss: Math.round((kcal * v.eiweiss) / 100 / 4),
    fett: Math.round((kcal * v.fett) / 100 / 9),
  };
}

export function naehrwerte(lm, gramm) {
  const f = gramm / 100, p = lm.pro100;
  return {
    kcal: Math.round(p.kcal * f), eiweiss: Math.round(p.eiweiss * f * 10) / 10,
    kh: Math.round(p.kh * f * 10) / 10, fett: Math.round(p.fett * f * 10) / 10,
  };
}
