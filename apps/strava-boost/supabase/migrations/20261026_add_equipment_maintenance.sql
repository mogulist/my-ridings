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
