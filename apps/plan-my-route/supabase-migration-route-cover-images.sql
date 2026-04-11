-- Add route cover image URLs for static map thumbnails/heroes/OG images
ALTER TABLE public.route
ADD COLUMN IF NOT EXISTS cover_image_thumb_url text,
ADD COLUMN IF NOT EXISTS cover_image_hero_url text,
ADD COLUMN IF NOT EXISTS cover_image_og_url text,
ADD COLUMN IF NOT EXISTS cover_image_generated_at timestamp with time zone;
