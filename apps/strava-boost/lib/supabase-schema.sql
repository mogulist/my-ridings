-- Supabase에서 실행할 SQL 스크립트
-- Supabase Dashboard > SQL Editor에서 실행

-- users 테이블 생성
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strava_id BIGINT UNIQUE NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Browser access currently uses the anon Data API client.
GRANT SELECT, INSERT, UPDATE ON public.users TO anon;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_strava_id ON users(strava_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 데이터만 읽을 수 있음
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  USING (true); -- 일단 모든 사용자가 읽을 수 있도록 (나중에 strava_id로 필터링)

-- 정책: 사용자는 자신의 데이터만 업데이트할 수 있음
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  USING (true); -- 일단 모든 사용자가 업데이트할 수 있도록 (나중에 strava_id로 필터링)

-- 정책: 사용자는 자신의 데이터만 삽입할 수 있음
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  WITH CHECK (true); -- 일단 모든 사용자가 삽입할 수 있도록 (나중에 strava_id로 필터링)

-- Run for existing projects AND fresh setup. No activity data or OAuth tokens are stored here.
CREATE TABLE IF NOT EXISTS public.strava_activity_changes (
  owner_id BIGINT NOT NULL,
  activity_id BIGINT NOT NULL,
  version UUID NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, activity_id)
);
ALTER TABLE public.strava_activity_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.strava_activity_changes FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.strava_activity_changes TO service_role;
-- No public policies: only server API routes use service_role, after verifying the athlete.
