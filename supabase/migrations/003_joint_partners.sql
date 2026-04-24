-- Add joint_partner_names to store Strava athlete names from related activities
-- These can be any Strava user, not just PacePact members
ALTER TABLE activities ADD COLUMN IF NOT EXISTS joint_partner_names text[] DEFAULT '{}';
