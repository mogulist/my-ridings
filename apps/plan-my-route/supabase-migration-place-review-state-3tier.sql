-- Migration: place_review.review_state 4단계 → 3단계 (interested / neutral / dismissed)
-- 선행: place_review 테이블 존재. 스크립트 전체를 한 번에 실행하세요.
--
-- 에덴파크장 행처럼 화면에는 interested인데 CHECK 실패하는 경우:
-- - review_state에 Zero-width space(U+200B), BOM(U+FEFF) 등이 섞였거나
-- - 컬럼이 char(n)이라 공백 패딩된 경우
-- 가 있으면 SQL 리터럴 'interested'와 바이트가 달라집니다.

-- place_review에 붙은 모든 CHECK 제약 제거
DO $$
DECLARE
	r record;
BEGIN
	FOR r IN
		SELECT c.conname
		FROM pg_constraint c
		WHERE c.conrelid = 'public.place_review'::regclass
			AND c.contype = 'c'
	LOOP
		EXECUTE format('ALTER TABLE public.place_review DROP CONSTRAINT IF EXISTS %I', r.conname);
	END LOOP;
END $$;

-- char(n) 패딩 제거 + 반드시 text
ALTER TABLE public.place_review
	ALTER COLUMN review_state SET DATA TYPE text
	USING trim(both from review_state::text);

-- 흔한 보이지 않는 문자 제거 후 소문자·trim
UPDATE public.place_review
SET review_state = trim(both from lower(
	translate(
		translate(translate(review_state, CHR(8203), ''), CHR(65279), ''),
		CHR(8288),
		''
	)
))
WHERE review_state IS NOT NULL;

-- 남은 값을 SQL 소스에 적은 세 문자열만으로 덮어씀 (앱·DB와 동일 바이트 보장)
UPDATE public.place_review
SET review_state =
	CASE review_state
		WHEN 'up2' THEN 'interested'
		WHEN 'up1' THEN 'interested'
		WHEN 'down' THEN 'dismissed'
		WHEN 'interested' THEN 'interested'
		WHEN 'neutral' THEN 'neutral'
		WHEN 'dismissed' THEN 'dismissed'
		ELSE 'neutral'
	END;

ALTER TABLE public.place_review
	ADD CONSTRAINT place_review_review_state_check
	CHECK (review_state IN ('interested', 'neutral', 'dismissed'));
