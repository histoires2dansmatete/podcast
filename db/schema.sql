-- Mesures agrégées, sans adresse IP, email ni user-agent complet.
-- Seules les données issues d'un consentement explicite sont enregistrées.
CREATE TABLE IF NOT EXISTS visits (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 day TEXT NOT NULL,
 time TEXT NOT NULL,
 session_digest TEXT NOT NULL,
 page TEXT NOT NULL,
 event TEXT NOT NULL CHECK(event IN ('pageview','audio_play','platform_click')),
 referrer_host TEXT NOT NULL,
 country TEXT NOT NULL,
 device TEXT NOT NULL CHECK(device IN ('mobile','tablet','desktop','other')),
 browser TEXT NOT NULL DEFAULT 'other'
);
CREATE INDEX IF NOT EXISTS idx_visits_day ON visits(day);
CREATE INDEX IF NOT EXISTS idx_visits_event_day ON visits(event,day);
CREATE INDEX IF NOT EXISTS idx_visits_digest_time ON visits(session_digest,time);
