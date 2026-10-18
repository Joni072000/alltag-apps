// =============================================================
// Ausbildung – Standardwerte, Kategorien-Vorschläge, Formeln
// =============================================================

export const KAT_BETRIEB = [
  '1. Berufsbildung, Arbeits- und Tarifrecht',
  '2. Aufbau und Organisation des Ausbildungsbetriebes',
  '3. Sicherheit und Gesundheitsschutz bei der Arbeit',
  '4. Umweltschutz',
  '5. Betriebliche und technische Kommunikation',
  '6. Planen und Organisieren der Arbeit, Bewerten der Arbeitsergebnisse, Qualitätsmanagement',
  '7. Beraten und Betreuen von Kunden, Verkauf',
  '8. Einrichten des Arbeitsplatzes',
  '9. Montieren und Installieren',
  '10. Installieren von Systemkomponenten und Netzwerken',
  '11. Messen und Analysieren',
  '12. Prüfen der Schutzmaßnahmen',
  '13. Aufbau und Prüfen von Steuerungen',
  '14. Durchführen von Serviceleistungen',
  '15. Analysieren von Fehlern und Instandhaltung von Geräten und Systemen',
  '1.1 Konzipieren von Systemen',
  '2.2 Installieren und Inbetriebnehmen von Energiewandlungssystemen und ihren Leiteinrichtungen',
];

export const KAT_SCHULE = [
  'LF1 Elektrotechnische Systeme analysieren, Funktionen prüfen und Fehler beheben',
  'LF2 Elektrische Systeme planen und installieren',
  'LF3 Steuerungen und Regelungen analysieren und realisieren',
  'LF4 Informationstechnische Systeme bereitstellen',
  'LF5 Elektroenergieversorgung und Sicherheit von Anlagen und Geräten konzipieren',
  'LF6 Elektrotechnische Systeme analysieren und prüfen',
  'LF7 Steuerungen und Regelungen für Systeme programmieren und realisieren',
  'LF8 Energiewandlungssysteme auswählen und integrieren',
  'LF9 Kommunikation von Systemen in Wohn- und Zweckbauten planen und realisieren',
  'LF10 Elektrische Geräte und Anlagen der Haustechnik planen, in Betrieb nehmen und übergeben',
  'LF11 Energietechnische Systeme errichten, in Betrieb nehmen und instand halten',
  'LF12 Energie- und gebäudetechnische Anlagen planen und realisieren',
  'LF13 Energie- und gebäudetechnische Systeme anpassen und dokumentieren',
  'Deutsch / Kommunikation',
  'Wirtschafts- und Sozialkunde',
];

/** Startwörter, damit Vorschläge schon ohne Lernhistorie funktionieren.
 *  Zugeordnet über ein Muster im Kategorienamen – klappt auch, wenn du Namen leicht änderst. */
const SAAT = [
  [/berufsbildung|tarif/i, 'ausbildung vertrag berichtsheft ausbildungsnachweis tarif lohn urlaub zeugnis'],
  [/aufbau und organisation/i, 'betrieb abteilung lager organisation büro firma werkstatt'],
  [/sicherheit und gesundheit/i, 'sicherheit psa unterweisung sicherheitsunterweisung gefährdung leiter helm sicherheitsregeln freigeschaltet freischalten erste hilfe absturz'],
  [/umweltschutz/i, 'entsorgt entsorgen müll recycling abfall schrott sortiert umwelt verpackung'],
  [/kommunikation/i, 'schaltplan zeichnung dokumentation telefon besprechung stromlaufplan gespräch plan skizze lesen'],
  [/planen und organisieren/i, 'material materialliste aufmaß angebot arbeitsablauf qualität abnahme kontrolle bestellt bestellung kommissioniert'],
  [/kunden/i, 'kunde kunden beratung verkauf übergabe einweisung beraten'],
  [/einrichten des arbeitsplatzes/i, 'baustelle eingerichtet einrichten werkzeug arbeitsplatz aufgeräumt aufräumen abgesperrt baustrom transport fahrzeug geladen'],
  [/montieren und installieren/i, 'verlegt verlegen schlitze schlitz dosen dose steckdosen steckdose schalter leitung leitungen kabel montiert montage unterputz aufputz gebohrt bohren gestemmt stemmen kabelkanal rohr rohre leuchte leuchten lampe lampen verteiler unterverteilung angeschlossen anschließen gesetzt eingezogen'],
  [/systemkomponenten|netzwerk/i, 'netzwerk lan router cat patchfeld patch datendose sat antenne knx bus rauchmelder sprechanlage klingel wlan smarthome switch'],
  [/messen und analysieren/i, 'gemessen messung messen multimeter spannung strom zange oszilloskop'],
  [/prüfen der schutz/i, 'geprüft prüfen prüfung isolation isolationsmessung schleifenimpedanz rcd fi schutzleiter protokoll e-check vde durchgängigkeit'],
  [/steuerung/i, 'steuerung schütz schütze sps logo relais zeitrelais motor schaltschrank stern dreieck'],
  [/service/i, 'service wartung kundendienst ausgetauscht austausch getauscht ersetzt reparatur'],
  [/fehler|instandhaltung/i, 'fehler fehlersuche defekt störung instandgesetzt instandhaltung repariert ausgefallen kurzschluss'],
  [/konzipieren/i, 'konzept konzipiert planung entwurf'],
  [/energiewandlung/i, 'pv photovoltaik wechselrichter wallbox wärmepumpe speicher solar module modul'],
  [/^lf1\b/i, 'ohm widerstand grundlagen reihenschaltung parallelschaltung stromkreis spannung strom leistung'],
  [/^lf2\b/i, 'installationsschaltung wechselschaltung kreuzschaltung querschnitt leitungsschutz installationsplan'],
  [/^lf3\b/i, 'steuerung regelung logik verknüpfung schütz'],
  [/^lf4\b/i, 'netzwerk computer pc ip subnetz informationstechnik'],
  [/^lf5\b/i, 'schutzmaßnahmen netzsystem netzsysteme tn tt rcd transformator trafo energieversorgung'],
  [/^lf6\b/i, 'prüfen messen prüfung vde 0100-600 isolationswiderstand'],
  [/^lf7\b/i, 'sps programmieren programm logo ablaufsteuerung'],
  [/^lf8\b/i, 'motor motoren antrieb drehstrom asynchron generator energiewandlung'],
  [/^lf9\b/i, 'knx bus gebäudesystemtechnik kommunikation'],
  [/^lf10\b/i, 'haustechnik herd durchlauferhitzer inbetriebnahme hausgeräte'],
  [/^lf11\b/i, 'energietechnisch instandhaltung verteilung hausanschluss'],
  [/^lf12\b/i, 'photovoltaik pv wärmepumpe gebäudetechnische'],
  [/^lf13\b/i, 'dokumentieren anpassen dokumentation'],
  [/deutsch/i, 'deutsch bewerbung erörterung text'],
  [/wirtschafts|sozial/i, 'wiso sozialversicherung tarifvertrag betriebsrat wirtschaft politik'],
];

const STOPP = new Set('der die das und oder ein eine einer eines einem einen ist sind war wurde wurden mit von zu zum zur für auf aus bei im in an am den dem des nicht auch es ich wir habe haben hat sowie dann danach heute über unter vom beim alle neue neuen'.split(' '));

export function woerter(text) {
  return String(text || '').toLowerCase().replace(/[^a-zäöüß0-9\- ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOPP.has(w));
}

const passt = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && (a.startsWith(b.slice(0, 5)) && b.startsWith(a.slice(0, 5))));

/** Bewertet alle Kategorien für einen Text. wortschatz = gelernte Wörter { kategorie: { wort: n } } */
export function vorschlag(text, kategorien, wortschatz = {}) {
  const w = woerter(text);
  if (!w.length || !kategorien.length) return null;
  let best = null, bestS = 0;
  for (const k of kategorien) {
    let s = 0;
    const gelernt = wortschatz[k] || {};
    const saat = SAAT.filter(([re]) => re.test(k)).flatMap(([, liste]) => liste.split(' '));
    const name = woerter(k);
    for (const x of w) {
      for (const [g, n] of Object.entries(gelernt)) if (passt(x, g)) s += 2 * Math.min(n, 5);
      if (saat.some((y) => passt(x, y))) s += 3;
      if (name.some((y) => passt(x, y))) s += 2;
    }
    if (s > bestS) { bestS = s; best = k; }
  }
  return best;
}

export function lerne(wortschatz, kategorie, text) {
  const ws = { ...wortschatz };
  const k = { ...(ws[kategorie] || {}) };
  for (const x of new Set(woerter(text))) k[x] = (k[x] || 0) + 1;
  // nicht unendlich wachsen lassen
  const top = Object.entries(k).sort((a, b) => b[1] - a[1]).slice(0, 80);
  ws[kategorie] = Object.fromEntries(top);
  return ws;
}

// ---------- Formeln --------------------------------------------
export const num = (v) => { v = String(v ?? '').trim().replace(/\s/g, '').replace(',', '.'); if (v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : NaN; };
export const fz = (n, d = 4) => (Number.isFinite(n) ? n.toLocaleString('de-DE', { maximumSignificantDigits: d }) : '–');
export const NORM_QS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];

export const RECHNER = [
  {
    id: 'ohm', name: 'Ohmsches Gesetz & Leistung', hinweis: 'Zwei beliebige Werte eintragen',
    felder: [['U', 'Spannung U', 'V'], ['I', 'Strom I', 'A'], ['R', 'Widerstand R', 'Ω'], ['P', 'Leistung P', 'W']],
    rechne(v) {
      const k = ['U', 'I', 'R', 'P'], g = k.filter((x) => num(v[x]) !== null);
      if (g.some((x) => !(num(v[x]) > 0))) return { warn: 'Nur positive Zahlen eintragen.' };
      if (g.length < 2) return { info: `Noch ${2 - g.length} Wert${g.length ? '' : 'e'} eintragen.` };
      if (g.length > 2) return { warn: 'Genau zwei Werte eintragen.' };
      let { U, I, R, P } = Object.fromEntries(k.map((x) => [x, num(v[x])])); let f = '';
      switch (g.join('')) {
        case 'UI': R = U / I; P = U * I; f = 'R = U / I · P = U · I'; break;
        case 'UR': I = U / R; P = U * U / R; f = 'I = U / R · P = U² / R'; break;
        case 'UP': I = P / U; R = U * U / P; f = 'I = P / U · R = U² / P'; break;
        case 'IR': U = I * R; P = I * I * R; f = 'U = R · I · P = I² · R'; break;
        case 'IP': U = P / I; R = P / (I * I); f = 'U = P / I · R = P / I²'; break;
        case 'RP': U = Math.sqrt(P * R); I = Math.sqrt(P / R); f = 'U = √(P · R) · I = √(P / R)'; break;
      }
      return { erg: [`U = ${fz(U)} V`, `I = ${fz(I)} A`, `R = ${fz(R)} Ω`, `P = ${fz(P)} W`], formel: f };
    },
  },
  {
    id: 'ds', name: 'Drehstrom-Leistung', hinweis: 'Strom ODER Wirkleistung eintragen',
    felder: [['U', 'Außenleiterspannung', 'V', '400'], ['cos', 'cos φ', '', '0,85'], ['I', 'Strom I', 'A'], ['P', 'Wirkleistung P', 'kW']],
    rechne(v) {
      const U = num(v.U), cos = num(v.cos), I = num(v.I), Pk = num(v.P), s3 = Math.sqrt(3);
      if (!(U > 0) || !(cos > 0 && cos <= 1)) return { warn: 'Spannung und cos φ (0 bis 1) angeben.' };
      if (I !== null && Pk !== null) return { warn: 'Nur Strom oder Leistung eintragen, nicht beides.' };
      if (I === null && Pk === null) return { info: 'Strom oder Wirkleistung eintragen.' };
      let i = I, p = Pk * 1000, f;
      if (I !== null) { p = s3 * U * I * cos; f = 'P = √3 · U · I · cos φ'; } else { i = p / (s3 * U * cos); f = 'I = P / (√3 · U · cos φ)'; }
      if (!(i > 0) || !(p > 0)) return { warn: 'Bitte nur positive Zahlen.' };
      const S = s3 * U * i, Q = S * Math.sqrt(1 - cos * cos);
      return { erg: [`I = ${fz(i)} A`, `P = ${fz(p / 1000)} kW`, `S = ${fz(S / 1000)} kVA`, `Q = ${fz(Q / 1000)} kvar`], formel: f + ' · S = √3 · U · I' };
    },
  },
  {
    id: 'sf', name: 'Spannungsfall & Querschnitt', hinweis: 'Kupfer κ = 56, Aluminium κ = 35',
    felder: [['netz', 'Netz', 'wahl:1|1~ 230 V;3|3~ 400 V', '1'], ['l', 'Leitungslänge (einfach)', 'm'], ['I', 'Strom I', 'A'], ['A', 'Querschnitt A', 'mm²', '1,5'], ['cos', 'cos φ', '', '1'], ['kappa', 'κ', 'm/(Ω·mm²)', '56'], ['max', 'max. Spannungsfall', '%', '3']],
    rechne(v) {
      const drei = v.netz === '3', U = drei ? 400 : 230, k = drei ? Math.sqrt(3) : 2;
      const l = num(v.l), I = num(v.I), A = num(v.A), cos = num(v.cos), ka = num(v.kappa), max = num(v.max);
      if (!(l > 0) || !(I > 0)) return { info: 'Leitungslänge und Strom eintragen.' };
      if (!(A > 0) || !(ka > 0) || !(cos > 0 && cos <= 1) || !(max > 0)) return { warn: 'Querschnitt, κ, cos φ und Grenze prüfen.' };
      const dU = k * l * I * cos / (ka * A), pr = dU / U * 100;
      const Amin = k * l * I * cos / (ka * (max / 100 * U));
      const naechst = NORM_QS.find((s) => s >= Amin - 1e-9);
      return {
        erg: [`ΔU = ${fz(dU, 3)} V`, `= ${fz(pr, 3)} %`],
        ok: pr <= max, okText: pr <= max ? `Innerhalb der ${fz(max)} %` : `Über der Grenze von ${fz(max)} %`,
        extra: `Mindestquerschnitt: ${fz(Amin, 3)} mm² → ${naechst ? fz(naechst) + ' mm²' : 'über 240 mm²'}. Strombelastbarkeit und Abschaltbedingung zusätzlich prüfen!`,
        formel: `ΔU = ${drei ? '√3' : '2'} · l · I · cos φ / (κ · A)`,
      };
    },
  },
  {
    id: 'rw', name: 'Leitungswiderstand',
    felder: [['l', 'Länge (gesamt, hin + zurück)', 'm'], ['A', 'Querschnitt', 'mm²', '1,5'], ['kappa', 'κ', 'm/(Ω·mm²)', '56']],
    rechne(v) {
      const l = num(v.l), A = num(v.A), ka = num(v.kappa);
      if (!(l > 0) || !(A > 0) || !(ka > 0)) return { info: 'Länge, Querschnitt und κ eintragen.' };
      return { erg: [`R = ${fz(l / (ka * A), 3)} Ω`], formel: 'R = l / (κ · A)' };
    },
  },
  {
    id: 'res', name: 'Reihe & Parallel', hinweis: 'Widerstände mit Leerzeichen trennen, z. B. 100 220 470',
    felder: [['liste', 'Widerstände', 'Ω', '', 'text']],
    rechne(v) {
      const l = String(v.liste || '').split(/[;\s]+/).filter(Boolean).map(num);
      if (l.length < 2) return { info: 'Mindestens zwei Widerstände eintragen.' };
      if (l.some((x) => !(x > 0))) return { warn: 'Nur positive Zahlen.' };
      const r = l.reduce((a, b) => a + b, 0), p = 1 / l.reduce((a, b) => a + 1 / b, 0);
      return { erg: [`Reihe: ${fz(r)} Ω`, `Parallel: ${fz(p)} Ω`], formel: 'R = R₁ + R₂ + … · 1/R = 1/R₁ + 1/R₂ + …' };
    },
  },
  {
    id: 'kosten', name: 'Energiekosten',
    felder: [['P', 'Leistung', 'W'], ['h', 'Betriebsdauer', 'h'], ['preis', 'Strompreis', 'ct/kWh', '35']],
    rechne(v) {
      const P = num(v.P), h = num(v.h), pr = num(v.preis);
      if (!(P > 0) || !(h > 0) || !(pr > 0)) return { info: 'Leistung, Dauer und Preis eintragen.' };
      const W = P * h / 1000;
      return { erg: [`W = ${fz(W)} kWh`, `Kosten = ${fz(W * pr / 100, 3)} €`], formel: 'W = P · t · Kosten = W · Preis' };
    },
  },
];

export const FORMELSAMMLUNG = [
  ['Ohmsches Gesetz', 'U = R · I'],
  ['Leistung', 'P = U · I = I² · R = U² / R'],
  ['Arbeit', 'W = P · t'],
  ['Leitungswiderstand', 'R = l / (κ · A)'],
  ['Reihenschaltung', 'R = R₁ + R₂ + … · I gleich'],
  ['Parallelschaltung', '1/R = 1/R₁ + 1/R₂ + … · U gleich'],
  ['Wechselstrom-Leistung', 'P = U · I · cos φ · S = U · I'],
  ['Drehstrom-Leistung', 'P = √3 · U · I · cos φ'],
  ['Stern', 'U = √3 · U_Str · I = I_Str'],
  ['Dreieck', 'U = U_Str · I = √3 · I_Str'],
  ['Leistungsdreieck', 'S² = P² + Q² · cos φ = P / S'],
  ['Wirkungsgrad', 'η = P_ab / P_zu'],
  ['Transformator', 'U₁ / U₂ = N₁ / N₂ = I₂ / I₁'],
  ['Synchrondrehzahl', 'n = f · 60 / p (p = Polpaare)'],
  ['Spannungsfall 1~', 'ΔU = 2 · l · I · cos φ / (κ · A)'],
  ['Spannungsfall 3~', 'ΔU = √3 · l · I · cos φ / (κ · A)'],
  ['Kurzschlussstrom', 'Ik = U₀ / Zs'],
  ['Kapazitiver Blindwiderstand', 'Xc = 1 / (2π · f · C)'],
  ['Induktiver Blindwiderstand', 'XL = 2π · f · L'],
];
