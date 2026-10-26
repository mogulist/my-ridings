-- Boost only. Safe to run alongside plan-my-route; no public/auth objects are changed.
BEGIN;
CREATE SCHEMA IF NOT EXISTS strava_boost;
REVOKE ALL ON SCHEMA strava_boost FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA strava_boost TO service_role;

CREATE TABLE IF NOT EXISTS strava_boost.activities (
 owner_id BIGINT NOT NULL CHECK (owner_id > 0),
 activity_id BIGINT NOT NULL CHECK (activity_id > 0),
 data JSONB NOT NULL,
 PRIMARY KEY (owner_id, activity_id)
);
CREATE TABLE IF NOT EXISTS strava_boost.sync_state (
 owner_id BIGINT PRIMARY KEY CHECK (owner_id > 0),
 last_sync_at BIGINT NOT NULL CHECK (last_sync_at > 0)
);
CREATE TABLE IF NOT EXISTS strava_boost.strava_activity_changes (
 owner_id BIGINT NOT NULL,
 activity_id BIGINT NOT NULL,
 version UUID NOT NULL,
 received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY (owner_id, activity_id)
);

ALTER TABLE strava_boost.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_boost.sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_boost.strava_activity_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON strava_boost.activities, strava_boost.sync_state,
 strava_boost.strava_activity_changes FROM PUBLIC, anon, authenticated;
-- Only server routes access these tables, after validating the Strava athlete.
GRANT SELECT, INSERT, UPDATE, DELETE ON strava_boost.activities TO service_role;
GRANT SELECT, INSERT, UPDATE ON strava_boost.sync_state TO service_role;
GRANT SELECT, INSERT, UPDATE ON strava_boost.strava_activity_changes TO service_role;
COMMIT;

-- Run after 20261025_add_shared_database.sql. Only Boost objects are changed.
BEGIN;
CREATE TABLE IF NOT EXISTS strava_boost.garages (
 owner_id BIGINT PRIMARY KEY CHECK (owner_id > 0),
 state JSONB NOT NULL DEFAULT '{"bikes":[],"parts":[],"installations":[],"assignments":[],"presets":[],"rules":[],"services":[]}'::jsonb,
 revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE strava_boost.garages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON strava_boost.garages FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON strava_boost.garages TO service_role;

-- Invoker permissions; revision comparison prevents overwriting another device's edits.
CREATE OR REPLACE FUNCTION strava_boost.save_garage(p_owner BIGINT, p_revision INTEGER, p_state JSONB)
RETURNS INTEGER LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE next_revision INTEGER;
BEGIN
 INSERT INTO strava_boost.garages(owner_id) VALUES(p_owner) ON CONFLICT DO NOTHING;
 UPDATE strava_boost.garages SET state = p_state, revision = revision + 1, updated_at = now()
 WHERE owner_id = p_owner AND revision = p_revision RETURNING revision INTO next_revision;
 RETURN next_revision;
END;
$$;
REVOKE ALL ON FUNCTION strava_boost.save_garage(BIGINT, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION strava_boost.save_garage(BIGINT, INTEGER, JSONB) TO service_role;
COMMIT;
NOTIFY pgrst, 'reload schema';
