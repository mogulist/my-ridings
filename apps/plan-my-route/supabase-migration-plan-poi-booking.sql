-- Candidate accommodation booking research and a durable Naver Map link.
ALTER TABLE public.plan_poi
    ADD COLUMN IF NOT EXISTS naver_place_url text,
    ADD COLUMN IF NOT EXISTS booking_method text NOT NULL DEFAULT 'unconfirmed',
    ADD COLUMN IF NOT EXISTS booking_url text,
    ADD COLUMN IF NOT EXISTS booking_checked_at timestamp with time zone;

ALTER TABLE public.plan_poi
    DROP CONSTRAINT IF EXISTS plan_poi_booking_method_check,
    ADD CONSTRAINT plan_poi_booking_method_check
        CHECK (booking_method IN ('unconfirmed', 'naver', 'secretmall', 'yeogi', 'agoda', 'phone', 'walk_in', 'other'));
