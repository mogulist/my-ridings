-- Add public share columns to plan table
ALTER TABLE public.plan
  ADD COLUMN IF NOT EXISTS public_share_token uuid,
  ADD COLUMN IF NOT EXISTS shared_at timestamp with time zone;

CREATE UNIQUE INDEX IF NOT EXISTS plan_public_share_token_idx
  ON public.plan (public_share_token);
