-- =============================================================
-- Alltag-Apps: Gemeinsames Grundgerüst
-- In Supabase einfügen: SQL Editor -> New query -> einfügen -> Run
-- Kann gefahrlos mehrfach ausgeführt werden.
-- =============================================================

-- 1) Profil pro Benutzer -----------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  settings     jsonb not null default '{}'::jsonb,   -- z. B. Kalorienziel, Gewicht, Einheiten
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 2) Gemeinsame Zeitachse für ALLE Apps --------------------------
-- Jede App legt hier ihre Einträge ab:
--   app = 'kalender' | 'gym' | 'kalorien' | ...
--   kind = was genau es ist, z. B. 'termin', 'training', 'mahlzeit'
--   data = alle app-spezifischen Details (Übungen, Kalorien, Ort ...)
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  app        text not null,
  kind       text not null,
  title      text,
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_user_time_idx on public.events (user_id, starts_at desc);
create index if not exists events_user_app_idx  on public.events (user_id, app, kind);

-- 3) updated_at automatisch setzen -------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

-- 4) Profil automatisch anlegen, wenn sich jemand registriert -----
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5) Sicherheit: jeder sieht und ändert NUR seine eigenen Daten ---
alter table public.profiles enable row level security;
alter table public.events   enable row level security;

drop policy if exists "eigenes Profil" on public.profiles;
create policy "eigenes Profil" on public.profiles
  for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "eigene Einträge" on public.events;
create policy "eigene Einträge" on public.events
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
