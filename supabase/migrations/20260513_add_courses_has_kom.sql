-- 코스별 KOM 구간 기록 토글 (에디션별 courses 행)
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS has_kom BOOLEAN NOT NULL DEFAULT false;
