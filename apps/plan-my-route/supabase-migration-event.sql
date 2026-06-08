-- event: 범용 이벤트/코스 테이블 (그란폰도, 울트라레이스, 백두대간 등)
CREATE TABLE IF NOT EXISTS public.event (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'gran_fondo'
    CHECK (event_type IN ('gran_fondo', 'ultra_race', 'running_race', 'course')),
  event_date date NOT NULL,
  route_id uuid REFERENCES public.route(id) ON DELETE SET NULL,
  official_distance_km numeric,
  official_elevation_m integer,
  search_keywords text[],
  organizer_name text,
  organizer_url text,
  is_public boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES next_auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(name, event_date)
);

CREATE INDEX IF NOT EXISTS event_event_date_idx ON public.event (event_date);
CREATE INDEX IF NOT EXISTS event_is_public_idx ON public.event (is_public);

GRANT ALL ON TABLE public.event TO postgres;
GRANT ALL ON TABLE public.event TO service_role;

-- event_waypoint: 이벤트별 경유 지점 (보급소, 컷오프, 체크포인트 등)
CREATE TABLE IF NOT EXISTS public.event_waypoint (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL REFERENCES public.event(id) ON DELETE CASCADE,
  name text NOT NULL,
  waypoint_type text NOT NULL
    CHECK (waypoint_type IN ('start', 'finish', 'checkpoint', 'supply', 'water', 'cutoff', 'summit', 'rest')),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  elevation_m integer,
  distance_from_start_km numeric,
  cutoff_seconds_from_start integer,
  supplies_available text,
  is_mandatory_stop boolean NOT NULL DEFAULT false,
  memo text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_waypoint_event_id_idx ON public.event_waypoint (event_id, distance_from_start_km);

GRANT ALL ON TABLE public.event_waypoint TO postgres;
GRANT ALL ON TABLE public.event_waypoint TO service_role;

-- RLS: plan-my-route 서버(service_role)만 접근. anon 직접 접근 차단.
-- strava-boost는 /api/public/events API를 통해 조회함.
ALTER TABLE public.event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_waypoint ENABLE ROW LEVEL SECURITY;
