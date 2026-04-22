-- Enable uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT        NOT NULL,
  email         TEXT        UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  threshold_hr  INTEGER     DEFAULT 175,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Strava Tokens ───────────────────────────────────────────────────────────
CREATE TABLE strava_tokens (
  user_id        UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  strava_user_id BIGINT      NOT NULL,
  access_token   TEXT        NOT NULL,
  refresh_token  TEXT        NOT NULL,
  expires_at     TIMESTAMPTZ NOT NULL,
  last_synced_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Activities ──────────────────────────────────────────────────────────────
CREATE TABLE activities (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  strava_id    BIGINT      UNIQUE NOT NULL,
  sport        TEXT        NOT NULL,
  duration_secs INTEGER    NOT NULL DEFAULT 0,
  distance_m   NUMERIC,
  avg_hr       NUMERIC,
  elevation_m  NUMERIC,
  start_lat    NUMERIC,
  start_lng    NUMERIC,
  polyline     TEXT,
  res_score    NUMERIC     NOT NULL DEFAULT 0,
  social_bonus NUMERIC     NOT NULL DEFAULT 0,
  total_score  NUMERIC     NOT NULL DEFAULT 0,
  score_tier   INTEGER     NOT NULL DEFAULT 3 CHECK (score_tier IN (1, 2, 3)),
  is_joint     BOOLEAN     NOT NULL DEFAULT FALSE,
  recorded_at  TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_user_id    ON activities(user_id);
CREATE INDEX idx_activities_recorded_at ON activities(recorded_at DESC);
CREATE INDEX idx_activities_strava_id  ON activities(strava_id);
CREATE INDEX idx_activities_sport      ON activities(sport);

-- ─── Competitions ─────────────────────────────────────────────────────────────
CREATE TABLE competitions (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT        NOT NULL,
  description         TEXT,
  sport_filter        TEXT,
  metric              TEXT        NOT NULL DEFAULT 'total_res'
                        CHECK (metric IN ('total_res', 'total_distance', 'total_duration', 'activity_count')),
  mode                TEXT        NOT NULL DEFAULT 'individual'
                        CHECK (mode IN ('individual', 'team', 'both')),
  start_date          DATE        NOT NULL,
  end_date            DATE        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'archived')),
  is_main             BOOLEAN     NOT NULL DEFAULT FALSE,
  location_lat        NUMERIC,
  location_lng        NUMERIC,
  location_radius_m   INTEGER,
  location_match_logic TEXT       DEFAULT 'route',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one main competition at a time
CREATE UNIQUE INDEX idx_competitions_is_main ON competitions(is_main) WHERE is_main = TRUE;

-- ─── Teams ───────────────────────────────────────────────────────────────────
CREATE TABLE teams (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT        NOT NULL,
  colour     TEXT        NOT NULL DEFAULT '#185FA5',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Team Memberships ─────────────────────────────────────────────────────────
CREATE TABLE team_memberships (
  user_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id   UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, team_id)
);

-- One team per user constraint: enforced at application level
-- (Supabase doesn't easily support this without a trigger)
CREATE UNIQUE INDEX idx_team_memberships_user ON team_memberships(user_id);

-- ─── Sport Multipliers ────────────────────────────────────────────────────────
CREATE TABLE sport_multipliers (
  sport      TEXT    PRIMARY KEY,
  multiplier NUMERIC NOT NULL DEFAULT 1.0
);

-- ─── Settings ────────────────────────────────────────────────────────────────
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ─── Invite Links ─────────────────────────────────────────────────────────────
CREATE TABLE invite_links (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code       TEXT        UNIQUE NOT NULL,
  created_by UUID        REFERENCES users(id),
  used_by    UUID        REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Seed Data ───────────────────────────────────────────────────────────────
INSERT INTO sport_multipliers (sport, multiplier) VALUES
  ('Swimming', 1.5),
  ('Running',  1.0),
  ('Strength', 0.9),
  ('Hiking',   0.5),
  ('Cycling',  0.5);

INSERT INTO settings (key, value) VALUES
  ('no_hr_penalty',      '0.7'),
  ('fallback_intensity', '40'),
  ('social_bonus_points','10');

-- Blaarmeersen Swims — pre-seeded location competition
-- Dates span current year; adjust as needed.
INSERT INTO competitions (
  name, description, sport_filter, metric, mode,
  start_date, end_date,
  location_lat, location_lng, location_radius_m, location_match_logic
) VALUES (
  'Blaarmeersen Swims',
  'Count your open-water swims at Blaarmeersen in Ghent. Must follow each other on Strava for joint detection.',
  'Swimming',
  'activity_count',
  'both',
  '2025-01-01',
  '2025-12-31',
  51.042599,
  3.687932,
  500,
  'route'
);
