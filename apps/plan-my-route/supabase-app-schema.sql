-- ==========================================
-- Plan My Route - Schema definitions
-- ==========================================

-- 1. Routes Table
CREATE TABLE IF NOT EXISTS public.route (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    name text NOT NULL,
    rwgps_url text NOT NULL,
    total_distance numeric,
    elevation_gain numeric,
    elevation_loss numeric,
    smoothing_param numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT route_pkey PRIMARY KEY (id),
    CONSTRAINT "route_user_id_fkey" FOREIGN KEY (user_id)
        REFERENCES next_auth.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

-- Index for querying routes by user efficiently
CREATE INDEX IF NOT EXISTS route_user_id_idx ON public.route (user_id);

-- 2. Plans Table
CREATE TABLE IF NOT EXISTS public.plan (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    route_id uuid NOT NULL,
    name text NOT NULL,
    sort_order integer,
    start_date date,
    public_share_token uuid,
    shared_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT plan_pkey PRIMARY KEY (id),
    CONSTRAINT "plan_route_id_fkey" FOREIGN KEY (route_id)
        REFERENCES public.route (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

-- Index for querying plans by route efficiently
CREATE INDEX IF NOT EXISTS plan_route_id_idx ON public.plan (route_id);
CREATE UNIQUE INDEX IF NOT EXISTS plan_public_share_token_idx ON public.plan (public_share_token);

-- 3. Stages Table
CREATE TABLE IF NOT EXISTS public.stage (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    plan_id uuid NOT NULL,
    title text,
    start_distance numeric,
    end_distance numeric,
    elevation_gain numeric,
    elevation_loss numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT stage_pkey PRIMARY KEY (id),
    CONSTRAINT "stage_plan_id_fkey" FOREIGN KEY (plan_id)
        REFERENCES public.plan (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

-- Index for querying stages by plan efficiently
CREATE INDEX IF NOT EXISTS stage_plan_id_idx ON public.stage (plan_id);

-- 4. Bookmarks Table (숙박업소 찜)
CREATE TABLE IF NOT EXISTS public.bookmark (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    place_id text NOT NULL,
    place_name text NOT NULL,
    place_url text,
    address_name text,
    lat numeric,
    lng numeric,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT bookmark_pkey PRIMARY KEY (id),
    CONSTRAINT bookmark_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES next_auth.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT bookmark_user_place_unique UNIQUE (user_id, place_id)
);

CREATE INDEX IF NOT EXISTS bookmark_user_id_idx ON public.bookmark (user_id);

-- 5. Place reviews (interested/neutral/dismissed + note + route/plan/stage context)
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

-- 6. User profile (공개 표시용 닉네임 등)
CREATE TABLE IF NOT EXISTS public.user_profile (
    user_id uuid NOT NULL,
    nickname text,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_profile_pkey PRIMARY KEY (user_id),
    CONSTRAINT user_profile_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES next_auth.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT user_profile_nickname_length CHECK (
        nickname IS NULL OR (char_length(trim(nickname)) >= 1 AND char_length(nickname) <= 40)
    )
);

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON TABLE public.route TO postgres;
GRANT ALL ON TABLE public.route TO service_role;
-- (Assuming public API access might be handled via RLS later, but for now service_role manages it)

GRANT ALL ON TABLE public.plan TO postgres;
GRANT ALL ON TABLE public.plan TO service_role;

GRANT ALL ON TABLE public.stage TO postgres;
GRANT ALL ON TABLE public.stage TO service_role;

GRANT ALL ON TABLE public.bookmark TO postgres;
GRANT ALL ON TABLE public.bookmark TO service_role;

GRANT ALL ON TABLE public.place_review TO postgres;
GRANT ALL ON TABLE public.place_review TO service_role;

GRANT ALL ON TABLE public.user_profile TO postgres;
GRANT ALL ON TABLE public.user_profile TO service_role;

-- If stage table already exists without elevation columns, run:
-- ALTER TABLE public.stage ADD COLUMN IF NOT EXISTS elevation_gain numeric;
-- ALTER TABLE public.stage ADD COLUMN IF NOT EXISTS elevation_loss numeric;
