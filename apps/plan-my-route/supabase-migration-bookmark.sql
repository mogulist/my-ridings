-- Migration: Add bookmark table for accommodation bookmarks
-- Run this in Supabase SQL Editor if you already have the app deployed

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

GRANT ALL ON TABLE public.bookmark TO postgres;
GRANT ALL ON TABLE public.bookmark TO service_role;
