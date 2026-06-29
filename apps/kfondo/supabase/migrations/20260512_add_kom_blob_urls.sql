-- KOM 구간 기록 Blob URL (전체구간과 분리 저장)
ALTER TABLE event_editions
  ADD COLUMN IF NOT EXISTS kom_records_blob_url TEXT,
  ADD COLUMN IF NOT EXISTS kom_sorted_records_blob_url TEXT;
