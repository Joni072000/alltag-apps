// =============================================================
// Supabase Edge Function „gym-push“
// - GET ?modus=key      -> öffentlicher Schlüssel für die App
// - POST {modus:"test"} -> Test-Mitteilung an das eigene Gerät (mit Login)
// - POST {modus:"cron"} -> stündlich vom Zeitplan aufgerufen: Erinnerungen
// =============================================================
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

// ---------- Maskottchen (Kopie aus gym/maskottchen.js – bei Änderungen beide anpassen) ----------
const STUFEN = [
  { name: 'Winzling', ab: 0 },
  { name: 'Rookie', ab: 150 },
  { name: 'Athlet', ab: 500 },
  { name: 'Biest', ab: 1200 },
  { name: 'Titan', ab: 2500 },
  { name: 'Legende', ab: 5000 },
];

const tagKey = (d: Date | string) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

/** Futter (Energie) und Kraft, die ein Training bringt */
function futterVon(t: any) {
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
function berechneMaskottchen(trainings: any[], bis: Date = new Date()) {
  const ende = new Date(bis); ende.setHours(23, 59, 59, 999);
  const proTag = new Map<string, any[]>();
  for (const t of trainings) {
    if (new Date(t.starts_at) > ende) continue;
    const k = tagKey(t.starts_at);
    if (!proTag.has(k)) proTag.set(k, []);
    proTag.get(k)!.push(t);
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

/** Text für Erinnerungs-Mitteilungen */
function hungerNachricht(m: any, name = 'Pumpi') {
  if (m.stimmung === 'elend') return { titel: `${name} geht es schlecht 😢`, text: `Seit ${m.tageOhne} Tagen kein Training. ${name} wird schwach und dick – rette ihn!` };
  if (m.stimmung === 'traurig') return { titel: `${name} ist traurig 😕`, text: `Seit ${m.tageOhne} Tagen kein Training. Ein kurzes Workout würde ihn glücklich machen.` };
  return { titel: `${name} hat Hunger 🍗`, text: `Seit ${m.tageOhne} Tagen kein Training. Zeit, ${name} zu füttern!` };
}


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
