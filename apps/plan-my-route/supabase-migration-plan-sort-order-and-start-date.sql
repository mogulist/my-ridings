-- Add sort_order and start_date to plan table
-- sort_order: display order in plan list (nulls last when ordering)
-- start_date: optional start date for stage day labels (m.d(요일))
ALTER TABLE public.plan
  ADD COLUMN IF NOT EXISTS sort_order integer,
  ADD COLUMN IF NOT EXISTS start_date date;
