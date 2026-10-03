-- 공개 영어 콘텐츠. 기존 한국어 컬럼은 그대로 유지합니다.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location_en text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS comment_en text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS meta_title_en text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS meta_description_en text;
ALTER TABLE public.event_editions ADD COLUMN IF NOT EXISTS comment_en text;
ALTER TABLE public.event_editions ADD COLUMN IF NOT EXISTS notice_en text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS name_en text;
