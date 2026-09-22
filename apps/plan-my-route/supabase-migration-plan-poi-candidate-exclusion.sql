ALTER TABLE public.plan_poi
  ADD COLUMN IF NOT EXISTS is_candidate_excluded boolean NOT NULL DEFAULT false;
