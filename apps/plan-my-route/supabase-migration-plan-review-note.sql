-- Private review note written while comparing candidate plans.
ALTER TABLE public.plan
    ADD COLUMN IF NOT EXISTS review_note text DEFAULT NULL;

COMMENT ON COLUMN public.plan.review_note IS
    'Private note for reviewing and comparing candidate plans';
