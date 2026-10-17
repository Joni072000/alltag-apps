// =============================================================
// Mitteilungen für alle Apps – nutzt den Service Worker unter /gym/
// (ein Gerät = ein Abo, egal aus welcher App aktiviert)
// =============================================================
import * as core from './core.js';

const PUSH_URL = core.SUPABASE_URL + '/functions/v1/gym-push';
const SW_PFAD = new URL('../gym/sw.js', import.meta.url).href;
const SW_SCOPE = new URL('../gym/', import.meta.url).href;

export const unterstuetzt = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const istIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
export const alsAppGestartet = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

async function registrierung() {
  return (await navigator.serviceWorker.getRegistration(SW_SCOPE)) || navigator.serviceWorker.register(SW_PFAD, { scope: SW_SCOPE });
}

async function bereit(reg) {
  if (reg.active) return reg;
  await new Promise((ok) => {
    const sw = reg.installing || reg.waiting;
    if (!sw) return ok();
    sw.addEventListener('statechange', () => { if (sw.state === 'activated') ok(); });
    setTimeout(ok, 5000);
  });
  return reg;
}

export async function aktiv() {
  if (!unterstuetzt() || Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  return !!(reg && await reg.pushManager.getSubscription());
}

const b64 = (b) => {
  const s = (b + '='.repeat((4 - (b.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};

/** Merkt sich, zu welcher App dieses Abo gehört (iPhone: jede Home-Bildschirm-App hat ein eigenes Abo) */
export async function speichern(abo, app) {
  const j = abo.toJSON();
  const { data: alt } = await core.sb.from('push_subscriptions').select('apps').eq('endpoint', j.endpoint).maybeSingle();
  const apps = [...new Set([...(alt?.apps || []), app])];
  const zeile = {
    endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, apps,
    zeitzone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin', geraet: navigator.userAgent.slice(0, 150),
  };
  let { error } = await core.sb.from('push_subscriptions').upsert(zeile, { onConflict: 'endpoint' });
  if (error && /apps/.test(error.message)) {
    // Spalte noch nicht angelegt (005_mitteilungen_pro_app.sql fehlt) – ohne App-Zuordnung speichern
    delete zeile.apps;
    ({ error } = await core.sb.from('push_subscriptions').upsert(zeile, { onConflict: 'endpoint' }));
  }
  if (error) throw new Error(error.message);
}

export async function aktivieren(app = 'gym') {
  if (!unterstuetzt()) throw new Error(istIOS && !alsAppGestartet ? 'Auf dem iPhone: App erst zum Home-Bildschirm hinzufügen und von dort öffnen.' : 'Dieser Browser unterstützt keine Mitteilungen.');
  if (await Notification.requestPermission() !== 'granted') throw new Error('Mitteilungen wurden nicht erlaubt.');
  const reg = await bereit(await registrierung());
  const r = await fetch(PUSH_URL + '?modus=key', { headers: { apikey: core.SUPABASE_KEY } }).catch(() => null);
  if (!r?.ok) throw new Error('Die Mitteilungs-Funktion in Supabase ist nicht erreichbar.');
  const { publicKey } = await r.json();
  let abo = await reg.pushManager.getSubscription();
  abo = abo || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(publicKey) });
  await speichern(abo, app);
}

/** Beim Öffnen einer App still zuordnen, falls dieses Gerät schon ein Abo hat */
export async function zuordnen(app) {
  try {
    if (!unterstuetzt() || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
    const abo = reg && await reg.pushManager.getSubscription();
    if (abo) await speichern(abo, app);
  } catch { /* egal */ }
}

export async function testSenden(app = 'gym') {
  const { data } = await core.sb.auth.getSession();
  const r = await fetch(PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: core.SUPABASE_KEY, Authorization: `Bearer ${data.session?.access_token}` },
    body: JSON.stringify({ modus: 'test', app }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.fehler || 'Funktion nicht erreichbar');
  return j.gesendet || 0;
}
