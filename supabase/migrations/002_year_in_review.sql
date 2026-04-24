ALTER TABLE activities ADD COLUMN IF NOT EXISTS excluded_from_competition BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS activity_kudos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  kudos_giver_strava_id BIGINT NOT NULL,
  kudos_giver_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_kudos_unique ON activity_kudos(activity_id, kudos_giver_strava_id);
CREATE INDEX IF NOT EXISTS idx_activity_kudos_activity ON activity_kudos(activity_id);

INSERT INTO settings (key, value) VALUES ('feature_year_in_review', 'false') ON CONFLICT (key) DO NOTHING;
