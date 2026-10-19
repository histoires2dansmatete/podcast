-- Mesures agrégées, sans adresse IP, email ni user-agent complet.
-- Seules les données issues d'un consentement explicite sont enregistrées.
CREATE TABLE IF NOT EXISTS visits (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 day TEXT NOT NULL,
 time TEXT NOT NULL,
 session_digest TEXT NOT NULL,
 page TEXT NOT NULL,
 event TEXT NOT NULL CHECK(event IN ('pageview','audio_play','platform_click','story_end')),
 referrer_host TEXT NOT NULL,
 country TEXT NOT NULL,
 device TEXT NOT NULL CHECK(device IN ('mobile','tablet','desktop','other')),
 browser TEXT NOT NULL DEFAULT 'other'
);
CREATE INDEX IF NOT EXISTS idx_visits_day ON visits(day);
CREATE INDEX IF NOT EXISTS idx_visits_event_day ON visits(event,day);
CREATE INDEX IF NOT EXISTS idx_visits_digest_time ON visits(session_digest,time);

-- Etat éditorial : 1 = publié, 0 = masqué. Absence = publié.
CREATE TABLE IF NOT EXISTS story_states (
  slug TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Limitation des tentatives de connexion admin sur 15 minutes.
-- bucket : HMAC anonymisé de l'adresse source, sans IP brute enregistrée.
CREATE TABLE IF NOT EXISTS admin_login_limits (
  bucket TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL
);

-- V14 : liens MP3/épisodes administrés sans redéployer le site statique.
-- Les MP3 eux-mêmes restent hébergés sur R2 ou un service HTTPS public.
CREATE TABLE IF NOT EXISTS story_audio_overrides (
 slug TEXT PRIMARY KEY,
 audio_url TEXT NOT NULL DEFAULT '',
 platforms_json TEXT NOT NULL DEFAULT '{}',
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
