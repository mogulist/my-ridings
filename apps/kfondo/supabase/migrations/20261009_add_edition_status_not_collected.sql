-- 대회는 개최되지만 해당 연도의 기록 수집을 하지 않는 상태.
BEGIN;
ALTER TABLE public.event_editions
  DROP CONSTRAINT IF EXISTS event_editions_status_check;
ALTER TABLE public.event_editions
  ADD CONSTRAINT event_editions_status_check
  CHECK (status IN ('upcoming', 'completed', 'ready', 'preparing', 'cancelled', 'not_collected'));
COMMIT;
