-- 1단계: 코스별 링크 URL (공식 사이트, Strava, RideWithGPS)
-- 기존 DB에 컬럼만 추가. Supabase SQL Editor에서 실행.

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS official_site_url TEXT,
  ADD COLUMN IF NOT EXISTS strava_url TEXT,
  ADD COLUMN IF NOT EXISTS ride_with_gps_url TEXT;
