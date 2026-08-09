-- Route official specs (주최측·설계자 공식 거리·고도·출발·도착)
ALTER TABLE public.route
  ADD COLUMN IF NOT EXISTS official_distance_km numeric,
  ADD COLUMN IF NOT EXISTS official_elevation_m integer,
  ADD COLUMN IF NOT EXISTS official_start_name text,
  ADD COLUMN IF NOT EXISTS official_finish_name text;
