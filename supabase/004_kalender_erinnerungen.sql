-- =============================================================
-- Alltag-Apps: Termin-Erinnerungen aus dem Kalender
-- In Supabase einfügen: SQL Editor -> New query -> einfügen -> Run
-- Voraussetzung: 003_mitteilungen.sql wurde schon ausgeführt.
-- =============================================================

-- Merkt sich, welche Erinnerung schon verschickt wurde (keine doppelten Mitteilungen)
create table if not exists public.push_gesendet (
  schluessel text primary key,
  created_at timestamptz not null default now()
);
alter table public.push_gesendet enable row level security;   -- nur der Server hat Zugriff

-- Alle 5 Minuten nach fälligen Termin-Erinnerungen schauen
select cron.schedule(
  'kalender-push',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://vwmyvenszvsccbwdotdh.supabase.co/functions/v1/gym-push',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', (select value from public.push_config where key = 'cron_secret')),
    body    := '{"modus":"kalender"}'::jsonb
  );
  $$
);
