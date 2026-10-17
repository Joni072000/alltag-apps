# Alltag-Apps

Eigene Apps für den Alltag – einzeln nutzbar, aber über eine gemeinsame Supabase-Datenbank verknüpft.

| App | Ordner | Status |
|---|---|---|
| Gym-Tracker | `gym/` | ✅ |
| Kalender | `kalender/` | ✅ |
| Kalorien-Tracker | `kalorien/` | ✅ |
| Neustart | `neustart/` | ✅ |
| Tagwerk | `tagwerk/` | ✅ |

## Aufbau
- `shared/core.js` – Login und Datenzugriff für alle Apps (ein Konto für alles)
- `supabase/*.sql` – Datenbank-Einrichtung, der Reihe nach im Supabase SQL Editor ausführen
- Gemeinsame Zeitachse `events`: jede App legt dort Einträge ab (`app`, `kind`, `data`), z. B. Trainings mit verbrannten kcal

## Mitteilungen
- `supabase/003_mitteilungen.sql` – Tabellen + stündlicher Zeitplan
- `supabase/004_kalender_erinnerungen.sql` – Zeitplan alle 5 Minuten für Termin-Erinnerungen
- `supabase/005_mitteilungen_pro_app.sql` – merkt sich pro Abo die App (keine doppelten Mitteilungen)
- `supabase/functions/gym-push/index.ts` – Supabase Edge Function (JWT-Prüfung aus), verschickt Erinnerungen

Läuft über GitHub Pages: `https://joni072000.github.io/alltag-apps/`
