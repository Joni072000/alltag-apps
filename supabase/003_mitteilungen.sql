-- =============================================================
-- Alltag-Apps: Mitteilungen (Push-Benachrichtigungen)
-- In Supabase einfügen: SQL Editor -> New query -> einfügen -> Run
-- Kann gefahrlos mehrfach ausgeführt werden.
-- =============================================================

-- 1) Geräte, die Mitteilungen bekommen sollen ---------------------
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  zeitzone   text not null default 'Europe/Berlin',
  geraet     text,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
drop policy if exists "eigene Geräte" on public.push_subscriptions;
create policy "eigene Geräte" on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2) Interne Einstellungen (Schlüssel) – nur für den Server lesbar
create table if not exists public.push_config (
  key   text primary key,
  value text not null
);
alter table public.push_config enable row level security;   -- keine Regeln = kein Zugriff aus den Apps

insert into public.push_config (key, value)
values ('cron_secret', md5(random()::text || clock_timestamp()::text) || md5(random()::text))
on conflict (key) do nothing;

-- 3) Zeitplan: jede Stunde (Minute 5) die Erinnerungs-Funktion aufrufen
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'gym-push',
  '5 * * * *',
  $$
  select net.http_post(
    url     := 'https://vwmyvenszvsccbwdotdh.supabase.co/functions/v1/gym-push',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', (select value from public.push_config where key = 'cron_secret')),
    body    := '{"modus":"cron"}'::jsonb
  );
  $$
);
