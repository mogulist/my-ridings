-- Add memo column to stage table
ALTER TABLE public.stage ADD COLUMN IF NOT EXISTS memo text;
