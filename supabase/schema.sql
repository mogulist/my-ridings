-- Phase 3: Vercel Blob Migration Schema
-- Supabase SQL Editor에서 이 전체 스크립트를 실행하면 스키마가 초기화됩니다 (데이터 삭제됨).
-- 운영 중인 DB에는 사용하지 말고, 전체 재생성 시에만 사용하세요.

-- 기존 테이블 삭제 (초기화)
DROP TABLE IF EXISTS records; -- Phase 3에서 제거됨
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS event_editions;
DROP TABLE IF EXISTS events;

-- 1. Events 테이블 (대회 기본 정의)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE, -- URL용 식별자 (예: muju)
  name TEXT NOT NULL, -- 대회명 (예: 무주 그란폰도)
  location TEXT NOT NULL, -- 개최 지역 (예: 무주)
  color_from TEXT NOT NULL,
  color_to TEXT NOT NULL,
  meta_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  meta_image TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Event Editions 테이블 (연도별 개최 정보)
CREATE TABLE event_editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'ready', 'preparing', 'cancelled')),
  url TEXT, -- 대회 공식 홈페이지 등
  records_blob_url TEXT, -- Vercel Blob URL (원본 기록) [Phase 3 NEW]
  sorted_records_blob_url TEXT, -- Vercel Blob URL (정렬된 기록) [Phase 3 NEW]
  kom_records_blob_url TEXT, -- Vercel Blob URL (KOM 원본 기록)
  kom_sorted_records_blob_url TEXT, -- Vercel Blob URL (KOM 정렬 기록)
  comment TEXT,
  notice TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, year) -- 같은 대회가 같은 연도에 두 번 열리지 않음
);

-- 3. Courses 테이블 (종목/코스 정보)
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID NOT NULL REFERENCES event_editions(id) ON DELETE CASCADE,
  course_type TEXT NOT NULL, -- id 역할 (예: granfondo, mediofondo)
  name TEXT NOT NULL, -- 표시 이름 (예: 그란폰도)
  distance DOUBLE PRECISION NOT NULL, -- km
  elevation INTEGER NOT NULL, -- m
  registered_count INTEGER DEFAULT 0, -- 접수 인원
  has_kom BOOLEAN NOT NULL DEFAULT false, -- 해당 코스에 KOM 기록/토글 노출
  official_site_url TEXT,
  strava_url TEXT,
  ride_with_gps_url TEXT,
  gpx_blob_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Records 테이블 제거됨 (Phase 3: Vercel Blob으로 대체)

-- 업데이트 시 updated_at 자동 갱신 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 적용
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_editions_updated_at BEFORE UPDATE ON event_editions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 설정
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- 읽기 정책: 모든 사용자 허용
CREATE POLICY "Allow public read access on events" ON events FOR SELECT USING (true);
CREATE POLICY "Allow public read access on event_editions" ON event_editions FOR SELECT USING (true);
CREATE POLICY "Allow public read access on courses" ON courses FOR SELECT USING (true);

-- 인덱스 생성
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_editions_year ON event_editions(year);
CREATE INDEX idx_courses_edition ON courses(edition_id);
