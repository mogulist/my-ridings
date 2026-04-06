-- Summit catalog (global official summit points shared across all users)
CREATE TABLE IF NOT EXISTS public.summit_catalog (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    name_normalized text NOT NULL,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    elevation_m integer,
    is_official boolean NOT NULL DEFAULT true,
    status text NOT NULL DEFAULT 'approved'
        CHECK (status IN ('approved', 'pending', 'rejected')),
    created_by uuid,
    source_route_id uuid,
    source_plan_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT summit_catalog_pkey PRIMARY KEY (id),
    CONSTRAINT summit_catalog_created_by_fkey FOREIGN KEY (created_by)
        REFERENCES next_auth.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT summit_catalog_source_route_id_fkey FOREIGN KEY (source_route_id)
        REFERENCES public.route (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT summit_catalog_source_plan_id_fkey FOREIGN KEY (source_plan_id)
        REFERENCES public.plan (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS summit_catalog_lat_lng_idx
    ON public.summit_catalog (lat, lng);

CREATE INDEX IF NOT EXISTS summit_catalog_status_idx
    ON public.summit_catalog (status, is_official);

CREATE UNIQUE INDEX IF NOT EXISTS summit_catalog_near_name_unique_idx
    ON public.summit_catalog (
        round(lat::numeric, 4),
        round(lng::numeric, 4),
        name_normalized
    );

GRANT ALL ON TABLE public.summit_catalog TO postgres;
GRANT ALL ON TABLE public.summit_catalog TO service_role;
