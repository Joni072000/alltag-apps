// =============================================================
// Supabase Edge Function „gym-push“
// - GET ?modus=key      -> öffentlicher Schlüssel für die App
// - POST {modus:"test"} -> Test-Mitteilung an das eigene Gerät (mit Login)
// - POST {modus:"cron"} -> stündlich vom Zeitplan aufgerufen: Erinnerungen
// =============================================================
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { berechneMaskottchen, hungerNachricht } from 'https://joni072000.github.io/alltag-apps/gym/maskottchen.js';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; zeitzone: string };
type Nachricht = { title: string; body: string; url?: string; tag?: string };

// ---------- Schlüssel (werden beim ersten Aufruf automatisch erzeugt) ----------
async function config(): Promise<Record<string, string>> {
  let { data } = await sb.from('push_config').select('key,value');
  let c = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
  if (!c.vapid_public || !c.vapid_private) {
    const k = webpush.generateVAPIDKeys();
    await sb.from('push_config').upsert(
      [{ key: 'vapid_public', value: k.publicKey }, { key: 'vapid_private', value: k.privateKey }],
      { onConflict: 'key', ignoreDuplicates: true },
    );
    ({ data } = await sb.from('push_config').select('key,value'));
    c = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
  }
  webpush.setVapidDetails('https://joni072000.github.io/alltag-apps/', c.vapid_public, c.vapid_private);
  return c;
}

async function senden(subs: Sub[], n: Nachricht) {
  let ok = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(n),
        { TTL: 6 * 3600 },
      );
      ok++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await sb.from('push_subscriptions').delete().eq('id', s.id); // Gerät abgemeldet
      else console.error('Senden fehlgeschlagen', code, (e as Error).message);
    }
  }
  return ok;
}

// ---------- Datum in der Zeitzone des Nutzers ----------
const lokalDatum = (d: Date | string, tz: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));
function jetztIn(tz: string) {
  const teile = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false, weekday: 'short' })
    .formatToParts(new Date());
  const get = (t: string) => teile.find((p) => p.type === t)?.value || '';
  const isoTag = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday')) + 1;
  return { stunde: Number(get('hour')) % 24, isoTag, heute: lokalDatum(new Date(), tz) };
}
function tageZurueck(datum: string, n: number) {
  const d = new Date(datum + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// ---------- Welche Mitteilung bekommt ein Nutzer gerade? ----------
async function nachrichtFuer(userId: string, tz: string): Promise<Nachricht | null> {
  const { data: prof } = await sb.from('profiles').select('settings').eq('id', userId).maybeSingle();
  const st = (prof?.settings || {}) as Record<string, unknown>;
  if (st.gym_push_aus) return null;
  const j = jetztIn(tz);
  if (j.stunde !== Number(st.gym_push_stunde ?? 18)) return null;

  const { data: tr } = await sb.from('events').select('starts_at,ends_at,data')
    .eq('user_id', userId).eq('app', 'gym').eq('kind', 'training')
    .order('starts_at', { ascending: false }).limit(1000);
  const trainings = tr || [];
  if (!trainings.length) return null;

  const name = String(st.gym_maskottchen_name || 'Pumpi');
  const m = berechneMaskottchen(trainings);
  const montag = tageZurueck(j.heute, j.isoTag - 1);
  const dieseWoche = trainings.filter((t) => lokalDatum(t.starts_at, tz) >= montag);
  const heuteTrainiert = trainings.some((t) => lokalDatum(t.starts_at, tz) === j.heute);

  // Sonntag: Wochenrückblick
  if (j.isoTag === 7 && st.gym_push_rueckblick !== false && dieseWoche.length) {
    const tonnen = dieseWoche.reduce((s, t) => s + (t.data?.volumen || 0), 0) / 1000;
    return {
      title: 'Dein Wochenrückblick 📊',
      body: `${dieseWoche.length} ${dieseWoche.length === 1 ? 'Training' : 'Trainings'}, ${tonnen.toLocaleString('de-DE', { maximumFractionDigits: 1 })} t bewegt. Schau dir deine Woche an!`,
      url: './#rueckblick', tag: 'gym-rueckblick',
    };
  }
  if (heuteTrainiert) return null;

  // Maskottchen hat Hunger
  const tage = Number(st.gym_push_tage ?? 2);
  const ohne = Math.round((Date.parse(j.heute) - Date.parse(lokalDatum(trainings[0].starts_at, tz))) / 864e5);
  if (ohne >= tage) {
    const h = hungerNachricht({ ...m, tageOhne: ohne }, name);
    return { title: h.titel, body: h.text, url: './', tag: 'gym-erinnerung' };
  }

  // Streak in Gefahr
  const ziel = Number(st.gym_wochenziel ?? 3);
  const fehlt = ziel - dieseWoche.length;
  const tageUebrig = 8 - j.isoTag; // inkl. heute
  if (fehlt > 0 && fehlt >= tageUebrig) {
    return {
      title: 'Streak in Gefahr 🔥',
      body: `Noch ${fehlt} ${fehlt === 1 ? 'Training' : 'Trainings'} diese Woche, damit dein Streak hält. ${name} zählt auf dich!`,
      url: './', tag: 'gym-erinnerung',
    };
  }
  return null;
}

// ---------- Einstieg ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = new URL(req.url);
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const modus = body.modus || url.searchParams.get('modus') || 'key';

  try {
    const c = await config();

    if (modus === 'key') return json({ publicKey: c.vapid_public });

    if (modus === 'test') {
      const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      const { data: u, error } = await sb.auth.getUser(token);
      if (error || !u.user) return json({ fehler: 'Nicht angemeldet' }, 401);
      const { data: subs } = await sb.from('push_subscriptions').select('*').eq('user_id', u.user.id);
      const { data: prof } = await sb.from('profiles').select('settings').eq('id', u.user.id).maybeSingle();
      const name = prof?.settings?.gym_maskottchen_name || 'Pumpi';
      const ok = await senden((subs || []) as Sub[], {
        title: 'Mitteilungen funktionieren ✅', body: `${name} sagt Hallo! 👋`, url: './', tag: 'gym-test',
      });
      return json({ gesendet: ok });
    }

    if (modus === 'cron') {
      if (req.headers.get('x-cron-secret') !== c.cron_secret) return json({ fehler: 'Nicht erlaubt' }, 401);
      const { data: subs } = await sb.from('push_subscriptions').select('*');
      const proUser = new Map<string, Sub[]>();
      for (const s of (subs || []) as Sub[]) {
        if (!proUser.has(s.user_id)) proUser.set(s.user_id, []);
        proUser.get(s.user_id)!.push(s);
      }
      let gesendet = 0;
      for (const [userId, liste] of proUser) {
        const n = await nachrichtFuer(userId, liste[0].zeitzone || 'Europe/Berlin');
        if (n) gesendet += await senden(liste, n);
      }
      return json({ nutzer: proUser.size, gesendet });
    }

    return json({ fehler: 'Unbekannter Modus' }, 400);
  } catch (e) {
    console.error(e);
    return json({ fehler: (e as Error).message }, 500);
  }
});
