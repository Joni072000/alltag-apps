// =============================================================
// Ausbildungsbuch – PDF/TXT einlesen und durchsuchen.
// Das Buch bleibt nur auf diesem Gerät (IndexedDB), es wird
// nicht hochgeladen.
// =============================================================
import { woerter } from './daten.js';

const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs';
const PDFJS_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

function db() {
  return new Promise((ok, fail) => {
    const r = indexedDB.open('azubi-buch', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('buch');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error);
  });
}

async function idb(mode, fn) {
  const d = await db();
  return new Promise((ok, fail) => {
    const tx = d.transaction('buch', mode);
    const req = fn(tx.objectStore('buch'));
    tx.oncomplete = () => ok(req?.result);
    tx.onerror = () => fail(tx.error);
  });
}

let cache;
export async function laden() {
  if (cache !== undefined) return cache;
  try { cache = (await idb('readonly', (s) => s.get('aktuell'))) || null; } catch { cache = null; }
  return cache;
}

export async function entfernen() {
  cache = null;
  try { await idb('readwrite', (s) => s.delete('aktuell')); } catch { /* egal */ }
}

/** Liest eine Datei ein. fortschritt(text) wird zwischendurch aufgerufen. */
export async function einlesen(datei, fortschritt = () => {}) {
  let seiten = [];
  if (/\.pdf$/i.test(datei.name) || datei.type === 'application/pdf') {
    fortschritt('PDF-Leser wird geladen …');
    const pdfjs = await import(PDFJS);
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    const pdf = await pdfjs.getDocument({ data: await datei.arrayBuffer() }).promise;
    for (let i = 1; i <= pdf.numPages; i++) {
      const s = await pdf.getPage(i);
      const t = await s.getTextContent();
      seiten.push(t.items.map((x) => x.str).join(' ').replace(/\s+/g, ' ').trim());
      if (i % 10 === 0 || i === pdf.numPages) fortschritt(`Seite ${i} von ${pdf.numPages} gelesen …`);
    }
    if (!seiten.some((s) => s.length > 40)) throw new Error('In dieser PDF ist kein markierbarer Text (wahrscheinlich eingescannt).');
  } else {
    const text = await datei.text();
    // TXT in Abschnitte von ca. 2500 Zeichen teilen
    for (let i = 0; i < text.length; i += 2500) seiten.push(text.slice(i, i + 2500).replace(/\s+/g, ' ').trim());
  }
  const buch = { name: datei.name.replace(/\.(pdf|txt)$/i, ''), seiten, pdf: /\.pdf$/i.test(datei.name), am: new Date().toISOString() };
  fortschritt('Wird gespeichert …');
  await idb('readwrite', (s) => s.put(buch, 'aktuell'));
  cache = buch;
  return buch;
}

/** Sucht Seiten, die möglichst viele Suchwörter enthalten. */
export function suchen(buch, frage, max = 8) {
  const w = woerter(frage).map((x) => (x.length > 6 ? x.slice(0, -2) : x));
  if (!w.length) return [];
  const treffer = [];
  buch.seiten.forEach((text, i) => {
    const t = text.toLowerCase();
    let score = 0, erste = -1, gefunden = 0;
    for (const x of w) {
      let p = t.indexOf(x), n = 0;
      if (p >= 0) { gefunden++; if (erste < 0 || p < erste) erste = p; }
      while (p >= 0 && n < 20) { n++; p = t.indexOf(x, p + x.length); }
      score += n ? 3 + Math.log2(1 + n) : 0;
    }
    if (!gefunden) return;
    score *= gefunden / w.length;
    const von = Math.max(0, erste - 90);
    treffer.push({ seite: i + 1, score, auszug: (von ? '… ' : '') + text.slice(von, von + 260) + ' …', woerter: w });
  });
  return treffer.sort((a, b) => b.score - a.score).slice(0, max);
}
