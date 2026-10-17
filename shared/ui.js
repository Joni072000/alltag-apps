// =============================================================
// Gemeinsame UI-Helfer (Sheets, Toasts, Formatierung)
// Passend zum Design aus gym/style.css
// =============================================================
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
export const zahl = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
export const fmt = (n, d = 1) => (n == null || Number.isNaN(n) ? '–' : Number(n).toLocaleString('de-DE', { maximumFractionDigits: d }));
export const fmtDatum = (d, opt = { weekday: 'short', day: 'numeric', month: 'short' }) => new Date(d).toLocaleDateString('de-DE', opt);

export const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* egal */ } },
};

export function toast(msg, err = false) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2400);
}

/** Popup von unten. onMount(el, close), onDismiss() wenn per Hintergrund geschlossen */
export function sheet(html, onMount, onDismiss) {
  const bd = document.createElement('div');
  bd.className = 'backdrop';
  bd.innerHTML = `<div class="sheet"><div class="grabber"></div>${html}</div>`;
  let offen = true;
  const close = () => { if (!offen) return; offen = false; bd.remove(); bd.dispatchEvent(new Event('zu')); };
  bd.addEventListener('click', (e) => { if (e.target === bd) { close(); onDismiss?.(); } });
  document.body.appendChild(bd);
  onMount?.(bd.querySelector('.sheet'), close, bd);
  return close;
}

export function bestaetigen(titel, text, ja = 'Ja', gefahr = true) {
  return new Promise((resolve) => {
    sheet(`<h2>${esc(titel)}</h2><p class="muted">${esc(text)}</p>
      <div class="sheet-actions"><button class="btn" data-n>Zurück</button><button class="btn ${gefahr ? 'btn-danger' : 'btn-primary'}" data-y>${esc(ja)}</button></div>`,
    (el, cl) => {
      el.querySelector('[data-n]').onclick = () => { cl(); resolve(false); };
      el.querySelector('[data-y]').onclick = () => { cl(); resolve(true); };
    }, () => resolve(false));
  });
}

export const tagKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
export const tagStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const plusTage = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const wochenStart = (d) => { const x = tagStart(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
