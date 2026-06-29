-- 개최정보(에디션) 상태에 'cancelled' 추가 (취소된 대회)
ALTER TABLE event_editions
  DROP CONSTRAINT IF EXISTS event_editions_status_check;
ALTER TABLE event_editions
  ADD CONSTRAINT event_editions_status_check
  CHECK (status IN ('upcoming', 'completed', 'ready', 'preparing', 'cancelled'));
