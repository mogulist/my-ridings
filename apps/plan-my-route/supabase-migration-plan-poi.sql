-- Plan-scoped POIs (map pins with name, type, memo; shared via public plan API)
CREATE TABLE IF NOT EXISTS public.plan_poi (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    plan_id uuid NOT NULL,
    kakao_place_id text,
    name text NOT NULL,
    poi_type text NOT NULL,
    memo text,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    assignment_mode text NOT NULL DEFAULT 'distance'
        CHECK (assignment_mode IN ('stage', 'distance', 'plan')),
    stage_id uuid,
    intent text NOT NULL DEFAULT 'planned'
        CHECK (intent IN ('candidate', 'planned', 'confirmed')),
    phone text,
    address_name text,
    place_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT plan_poi_pkey PRIMARY KEY (id),
    CONSTRAINT plan_poi_plan_id_fkey FOREIGN KEY (plan_id)
        REFERENCES public.plan (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT plan_poi_stage_id_fkey FOREIGN KEY (stage_id)
        REFERENCES public.stage (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS plan_poi_plan_id_idx ON public.plan_poi (plan_id);
CREATE INDEX IF NOT EXISTS plan_poi_stage_id_idx ON public.plan_poi (stage_id);

GRANT ALL ON TABLE public.plan_poi TO postgres;
GRANT ALL ON TABLE public.plan_poi TO service_role;
