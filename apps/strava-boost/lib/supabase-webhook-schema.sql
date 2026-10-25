-- Run for existing projects AND fresh setup. No activity data or OAuth tokens are stored here.
CREATE TABLE IF NOT EXISTS public.strava_activity_changes (
  owner_id BIGINT NOT NULL,
  activity_id BIGINT NOT NULL,
  version UUID NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, activity_id)
);
ALTER TABLE public.strava_activity_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.strava_activity_changes FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.strava_activity_changes TO service_role;
-- No public policies: only server API routes use service_role, after verifying the athlete.
