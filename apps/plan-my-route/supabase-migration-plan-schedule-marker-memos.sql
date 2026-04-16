-- Per-plan notes for CP and summit rows on the schedule (keys: cp:{id}, summit:{uuid})
ALTER TABLE public.plan
    ADD COLUMN IF NOT EXISTS schedule_marker_memos jsonb DEFAULT NULL;

COMMENT ON COLUMN public.plan.schedule_marker_memos IS
    'JSON object: rowKey -> memo string for schedule CP/summit markers (cp:number, summit:uuid)';
