-- =============================================================
-- Alltag-Apps: Mitteilungen nur an die passende App schicken
-- (auf dem iPhone hat jede App auf dem Home-Bildschirm ein eigenes Abo)
-- In Supabase einfügen: SQL Editor -> New query -> einfügen -> Run
-- =============================================================

alter table public.push_subscriptions
  add column if not exists apps text[] not null default '{}';
