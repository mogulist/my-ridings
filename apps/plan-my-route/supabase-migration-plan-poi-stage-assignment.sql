-- Explicit itinerary ownership and candidate/contact metadata for plan POIs.
-- Existing rows remain distance-assigned planned POIs.
ALTER TABLE public.plan_poi
    ADD COLUMN IF NOT EXISTS assignment_mode text NOT NULL DEFAULT 'distance',
    ADD COLUMN IF NOT EXISTS stage_id uuid,
    ADD COLUMN IF NOT EXISTS intent text NOT NULL DEFAULT 'planned',
    ADD COLUMN IF NOT EXISTS phone text,
    ADD COLUMN IF NOT EXISTS address_name text,
    ADD COLUMN IF NOT EXISTS place_url text;

ALTER TABLE public.plan_poi
    DROP CONSTRAINT IF EXISTS plan_poi_assignment_mode_check,
    ADD CONSTRAINT plan_poi_assignment_mode_check
        CHECK (assignment_mode IN ('stage', 'distance', 'plan')),
    DROP CONSTRAINT IF EXISTS plan_poi_intent_check,
    ADD CONSTRAINT plan_poi_intent_check
        CHECK (intent IN ('candidate', 'planned', 'confirmed')),
    DROP CONSTRAINT IF EXISTS plan_poi_stage_id_fkey,
    ADD CONSTRAINT plan_poi_stage_id_fkey FOREIGN KEY (stage_id)
        REFERENCES public.stage (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS plan_poi_stage_id_idx ON public.plan_poi (stage_id);
