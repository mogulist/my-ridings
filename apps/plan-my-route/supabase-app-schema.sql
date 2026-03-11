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

-- 3. Stages Table
CREATE TABLE IF NOT EXISTS public.stage (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    plan_id uuid NOT NULL,
    title text,
    start_distance numeric,
    end_distance numeric,
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

-- Grants
GRANT ALL ON TABLE public.route TO postgres;
GRANT ALL ON TABLE public.route TO service_role;
-- (Assuming public API access might be handled via RLS later, but for now service_role manages it)

GRANT ALL ON TABLE public.plan TO postgres;
GRANT ALL ON TABLE public.plan TO service_role;

GRANT ALL ON TABLE public.stage TO postgres;
GRANT ALL ON TABLE public.stage TO service_role;
