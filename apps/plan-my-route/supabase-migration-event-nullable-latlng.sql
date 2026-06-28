-- event_waypoint: lat, lng 를 nullable 로 변경
-- 거리(distance_from_start_km)만으로도 경유지 등록 가능하도록
ALTER TABLE public.event_waypoint
  ALTER COLUMN lat DROP NOT NULL,
  ALTER COLUMN lng DROP NOT NULL;
