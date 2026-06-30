-- 2단계: 코스별 경로(GPX) 파일 URL (Vercel Blob)
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS gpx_blob_url TEXT;
