-- Manual preference order for accommodation candidates within an automatically derived distance group.
ALTER TABLE public.plan_poi
    ADD COLUMN IF NOT EXISTS candidate_sort_order integer;

ALTER TABLE public.plan_poi
    DROP CONSTRAINT IF EXISTS plan_poi_candidate_sort_order_check,
    ADD CONSTRAINT plan_poi_candidate_sort_order_check
        CHECK (candidate_sort_order IS NULL OR candidate_sort_order >= 0);
