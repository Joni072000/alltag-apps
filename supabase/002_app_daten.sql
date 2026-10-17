-- =============================================================
-- Alltag-Apps: Speicher für App-Einstellungen und Vorlagen
-- (z. B. Trainingspläne, eigene Übungen, Rezepte ...)
-- In Supabase einfügen: SQL Editor -> New query -> einfügen -> Run
-- Kann gefahrlos mehrfach ausgeführt werden.
-- =============================================================

create table if not exists public.app_data (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  app        text not null,           -- z. B. 'gym'
  key        text not null,           -- z. B. 'routinen', 'eigene_uebungen'
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, app, key)
);

drop trigger if exists app_data_updated_at on public.app_data;
create trigger app_data_updated_at before update on public.app_data
  for each row execute function public.set_updated_at();

alter table public.app_data enable row level security;

drop policy if exists "eigene App-Daten" on public.app_data;
create policy "eigene App-Daten" on public.app_data
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
