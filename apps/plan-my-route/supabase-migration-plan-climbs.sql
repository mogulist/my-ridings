-- Plan-local summit names/links; global official catalog is not changed.
CREATE TABLE IF NOT EXISTS public.plan_climb_marker (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 plan_id uuid NOT NULL REFERENCES public.plan(id) ON DELETE CASCADE,
 summit_id uuid REFERENCES public.summit_catalog(id) ON DELETE SET NULL,
 name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
 distance_m integer NOT NULL CHECK (distance_m >= 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(plan_id, distance_m)
);
ALTER TABLE public.plan_climb_marker ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.plan_climb_marker FROM anon, authenticated;
GRANT ALL ON public.plan_climb_marker TO service_role;
