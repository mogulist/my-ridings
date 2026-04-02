-- Migration: Add place_review table (generalized place evaluation)
-- Replaces bookmark conceptually; supports interested/neutral/dismissed + note + route/plan/stage context.
-- Run after supabase-migration-bookmark.sql (or supabase-app-schema.sql which defines bookmark).

-- review_state: interested = 관심, neutral = 미평가, dismissed = 비선호
CREATE TABLE IF NOT EXISTS public.place_review (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    provider text NOT NULL DEFAULT 'kakao',
    place_id text NOT NULL,
    place_name text NOT NULL,
    place_url text,
    address_name text,
    lat numeric,
    lng numeric,
    place_kind text NOT NULL DEFAULT 'accommodation',
    review_state text NOT NULL DEFAULT 'neutral'
        CHECK (review_state IN ('interested', 'neutral', 'dismissed')),
    note text,
    route_id uuid,
    plan_id uuid,
    stage_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT place_review_pkey PRIMARY KEY (id),
    CONSTRAINT place_review_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES next_auth.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT place_review_route_id_fkey FOREIGN KEY (route_id)
        REFERENCES public.route (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT place_review_plan_id_fkey FOREIGN KEY (plan_id)
        REFERENCES public.plan (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT place_review_stage_id_fkey FOREIGN KEY (stage_id)
        REFERENCES public.stage (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT place_review_user_provider_place_unique UNIQUE (user_id, provider, place_id)
);

CREATE INDEX IF NOT EXISTS place_review_user_id_idx ON public.place_review (user_id);
CREATE INDEX IF NOT EXISTS place_review_place_kind_idx ON public.place_review (user_id, place_kind);

GRANT ALL ON TABLE public.place_review TO postgres;
GRANT ALL ON TABLE public.place_review TO service_role;

-- Backfill: copy existing bookmarks into place_review as up1 + accommodation
INSERT INTO public.place_review (
    user_id,
    provider,
    place_id,
    place_name,
    place_url,
    address_name,
    lat,
    lng,
    place_kind,
    review_state,
    created_at,
    updated_at
)
SELECT
    user_id,
    'kakao',
    place_id,
    place_name,
    place_url,
    address_name,
    lat,
    lng,
    'accommodation',
    'interested',
    created_at,
    created_at
FROM public.bookmark
ON CONFLICT (user_id, provider, place_id) DO NOTHING;
