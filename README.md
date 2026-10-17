# Alltag-Apps

Eigene Apps für den Alltag – einzeln nutzbar, aber über eine gemeinsame Supabase-Datenbank verknüpft.

| App | Ordner | Status |
|---|---|---|
| Gym-Tracker | `gym/` | ✅ |
| Kalender | – | geplant |
| Kalorien-Tracker | – | geplant |

## Aufbau
- `shared/core.js` – Login und Datenzugriff für alle Apps (ein Konto für alles)
- `supabase/*.sql` – Datenbank-Einrichtung, der Reihe nach im Supabase SQL Editor ausführen
- Gemeinsame Zeitachse `events`: jede App legt dort Einträge ab (`app`, `kind`, `data`), z. B. Trainings mit verbrannten kcal

Läuft über GitHub Pages: `https://joni072000.github.io/alltag-apps/`
