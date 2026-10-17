// =============================================================
// Alltag-Apps – gemeinsame Basis für alle Apps
// Alle Apps laufen auf derselben Adresse (joni072000.github.io),
// dadurch gilt ein Login automatisch für alle Apps.
// =============================================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://vwmyvenszvsccbwdotdh.supabase.co';
// Öffentlicher Schlüssel – darf im Code stehen, Schutz läuft über Row Level Security.
export const SUPABASE_KEY = 'sb_publishable_k_n-hJ6U4xF9SpC_K7aQNA_5Zs_mgkf';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'alltag-auth' },
});

// ---------- Login ----------------------------------------------
export async function getUser() {
  const { data } = await sb.auth.getSession();
  return data.session?.user ?? null;
}

export function onAuthChange(cb) {
  sb.auth.onAuthStateChange((_ev, session) => cb(session?.user ?? null));
}

export async function logout() {
  await sb.auth.signOut();
  location.reload();
}

/** Zeigt ein Login-/Registrier-Formular in `el` und ruft `onDone(user)` nach Erfolg. */
export function renderLogin(el, { appName = 'Alltag', onDone } = {}) {
  let mode = 'login';
  const draw = (msg = '', isErr = false) => {
    el.innerHTML = `
      <div class="auth">
        <div class="auth-card">
          <div class="auth-logo">${appName}</div>
          <p class="auth-sub">${mode === 'login' ? 'Melde dich an – ein Konto für alle deine Apps.' : 'Neues Konto anlegen'}</p>
          <form class="auth-form">
            <input name="email" type="email" placeholder="E-Mail" autocomplete="email" required>
            <input name="pw" type="password" placeholder="Passwort (min. 6 Zeichen)" minlength="6"
                   autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" required>
            <button type="submit" class="btn btn-primary btn-block">${mode === 'login' ? 'Anmelden' : 'Registrieren'}</button>
          </form>
          ${msg ? `<p class="auth-msg ${isErr ? 'err' : ''}">${msg}</p>` : ''}
          <button class="auth-switch" type="button">
            ${mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Schon ein Konto? Anmelden'}
          </button>
        </div>
      </div>`;
    el.querySelector('.auth-switch').onclick = () => { mode = mode === 'login' ? 'signup' : 'login'; draw(); };
    el.querySelector('form').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const email = f.get('email').trim(), password = f.get('pw');
      const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = '…';
      try {
        if (mode === 'login') {
          const { data, error } = await sb.auth.signInWithPassword({ email, password });
          if (error) throw error;
          onDone?.(data.user);
        } else {
          const { data, error } = await sb.auth.signUp({
            email, password, options: { emailRedirectTo: location.href.split('#')[0] },
          });
          if (error) throw error;
          if (data.session) onDone?.(data.user);
          else { mode = 'login'; draw('Fast geschafft! Bestätige den Link in deiner E-Mail und melde dich dann an.'); }
        }
      } catch (err) {
        draw(uebersetzeFehler(err.message), true);
      }
    };
  };
  draw();
}

function uebersetzeFehler(m = '') {
  if (/Invalid login/i.test(m)) return 'E-Mail oder Passwort falsch.';
  if (/Email not confirmed/i.test(m)) return 'Bitte bestätige zuerst den Link in deiner E-Mail.';
  if (/already registered/i.test(m)) return 'Für diese E-Mail gibt es schon ein Konto.';
  if (/rate limit/i.test(m)) return 'Zu viele Versuche – warte kurz und probier es nochmal.';
  return m || 'Unbekannter Fehler.';
}

// ---------- Gemeinsame Zeitachse (events) ----------------------
export async function listEvents({ app, kind, from, to, limit = 2000 } = {}) {
  let q = sb.from('events').select('*').order('starts_at', { ascending: false }).limit(limit);
  if (app) q = q.eq('app', app);
  if (kind) q = q.eq('kind', kind);
  if (from) q = q.gte('starts_at', new Date(from).toISOString());
  if (to) q = q.lt('starts_at', new Date(to).toISOString());
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function addEvent(ev) {
  const { data, error } = await sb.from('events').insert(ev).select().single();
  if (error) throw error;
  return data;
}

export async function updateEvent(id, patch) {
  const { data, error } = await sb.from('events').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteEvent(id) {
  const { error } = await sb.from('events').delete().eq('id', id);
  if (error) throw error;
}

// ---------- App-Daten (Vorlagen, Einstellungen pro App) --------
export async function getAppData(app, key, fallback = null) {
  const { data, error } = await sb.from('app_data').select('value').eq('app', app).eq('key', key).maybeSingle();
  if (error) throw error;
  return data ? data.value : fallback;
}

export async function setAppData(app, key, value) {
  const { error } = await sb.from('app_data').upsert({ app, key, value }, { onConflict: 'user_id,app,key' });
  if (error) throw error;
}

// ---------- Profil (gilt für alle Apps) ------------------------
export async function getProfile() {
  const user = await getUser();
  if (!user) return null;
  const { data, error } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) throw error;
  if (data) return data;
  const { data: created, error: e2 } = await sb.from('profiles').insert({ id: user.id }).select().single();
  if (e2) throw e2;
  return created;
}

export async function updateSettings(patch) {
  const p = await getProfile();
  const settings = { ...(p.settings || {}), ...patch };
  const { data, error } = await sb.from('profiles').update({ settings }).eq('id', p.id).select().single();
  if (error) throw error;
  return data;
}
