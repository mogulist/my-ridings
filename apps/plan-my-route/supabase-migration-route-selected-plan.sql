-- 라우트별로 실제 라이딩에 사용할 플랜 하나를 선택한다.
ALTER TABLE public.route
  ADD COLUMN IF NOT EXISTS selected_plan_id uuid;

ALTER TABLE public.route
  DROP CONSTRAINT IF EXISTS route_selected_plan_id_fkey;

ALTER TABLE public.route
  ADD CONSTRAINT route_selected_plan_id_fkey
  FOREIGN KEY (selected_plan_id)
  REFERENCES public.plan (id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS route_selected_plan_id_idx
  ON public.route (selected_plan_id);
