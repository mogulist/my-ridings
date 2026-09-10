-- Plan My Route: auth.users → next_auth.users 롤백
--
-- Supabase Auth 마이그레이션을 되돌리고 Auth.js 코드로 롤백할 때만 실행합니다.
-- auth.users와 next_auth.users는 삭제하지 않습니다.

BEGIN;

DO $$
DECLARE
  invalid_mapping_count integer;
BEGIN
  SELECT count(*) INTO invalid_mapping_count
  FROM (
    SELECT na.id
    FROM next_auth.accounts na_acc
    JOIN next_auth.users na ON na.id = na_acc."userId"
    LEFT JOIN auth.identities ai
      ON ai.provider = 'github'
      AND ai.provider_id = na_acc."providerAccountId"
    WHERE na_acc.provider = 'github'
    GROUP BY na.id
    HAVING count(DISTINCT ai.user_id) <> 1
  ) invalid_mappings;

  IF invalid_mapping_count > 0 THEN
    RAISE EXCEPTION 'GitHub provider ID로 정확히 하나의 롤백 사용자를 매핑할 수 없는 사용자가 %명 있습니다.', invalid_mapping_count;
  END IF;
END $$;

CREATE TEMP TABLE auth_user_rollback_map ON COMMIT DROP AS
SELECT DISTINCT
  na.id AS old_user_id,
  ai.user_id AS new_user_id
FROM next_auth.accounts na_acc
JOIN next_auth.users na ON na.id = na_acc."userId"
JOIN auth.identities ai
  ON ai.provider = 'github'
  AND ai.provider_id = na_acc."providerAccountId"
WHERE na_acc.provider = 'github';

ALTER TABLE auth_user_rollback_map
  ADD CONSTRAINT auth_user_rollback_map_old_user_id_key UNIQUE (old_user_id),
  ADD CONSTRAINT auth_user_rollback_map_new_user_id_key UNIQUE (new_user_id);

DO $$
DECLARE
  unmapped_user_ids uuid[];
BEGIN
  SELECT array_agg(DISTINCT referenced_user_id) INTO unmapped_user_ids
  FROM (
    SELECT user_id AS referenced_user_id FROM public.route
    UNION ALL
    SELECT user_id FROM public.bookmark
    UNION ALL
    SELECT user_id FROM public.place_review
    UNION ALL
    SELECT user_id FROM public.user_profile
    UNION ALL
    SELECT created_by FROM public.summit_catalog WHERE created_by IS NOT NULL
    UNION ALL
    SELECT created_by FROM public.event WHERE created_by IS NOT NULL
  ) referenced_users
  LEFT JOIN auth_user_rollback_map rollback
    ON rollback.new_user_id = referenced_users.referenced_user_id
  LEFT JOIN next_auth.users existing_next_auth_user
    ON existing_next_auth_user.id = referenced_users.referenced_user_id
  WHERE rollback.new_user_id IS NULL
    AND existing_next_auth_user.id IS NULL;

  IF cardinality(unmapped_user_ids) > 0 THEN
    RAISE EXCEPTION 'next_auth.users로 롤백할 수 없는 소유자 ID가 있습니다: %', unmapped_user_ids;
  END IF;
END $$;

ALTER TABLE public.route DROP CONSTRAINT IF EXISTS route_user_id_fkey;
ALTER TABLE public.bookmark DROP CONSTRAINT IF EXISTS bookmark_user_id_fkey;
ALTER TABLE public.place_review DROP CONSTRAINT IF EXISTS place_review_user_id_fkey;
ALTER TABLE public.user_profile DROP CONSTRAINT IF EXISTS user_profile_user_id_fkey;
ALTER TABLE public.summit_catalog DROP CONSTRAINT IF EXISTS summit_catalog_created_by_fkey;
ALTER TABLE public.event DROP CONSTRAINT IF EXISTS event_created_by_fkey;

UPDATE public.route target
SET user_id = rollback.old_user_id
FROM auth_user_rollback_map rollback
WHERE target.user_id = rollback.new_user_id;

UPDATE public.bookmark target
SET user_id = rollback.old_user_id
FROM auth_user_rollback_map rollback
WHERE target.user_id = rollback.new_user_id;

UPDATE public.place_review target
SET user_id = rollback.old_user_id
FROM auth_user_rollback_map rollback
WHERE target.user_id = rollback.new_user_id;

UPDATE public.user_profile target
SET user_id = rollback.old_user_id
FROM auth_user_rollback_map rollback
WHERE target.user_id = rollback.new_user_id;

UPDATE public.summit_catalog target
SET created_by = rollback.old_user_id
FROM auth_user_rollback_map rollback
WHERE target.created_by = rollback.new_user_id;

UPDATE public.event target
SET created_by = rollback.old_user_id
FROM auth_user_rollback_map rollback
WHERE target.created_by = rollback.new_user_id;

ALTER TABLE public.route
  ADD CONSTRAINT route_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES next_auth.users (id) ON DELETE CASCADE;

ALTER TABLE public.bookmark
  ADD CONSTRAINT bookmark_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES next_auth.users (id) ON DELETE CASCADE;

ALTER TABLE public.place_review
  ADD CONSTRAINT place_review_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES next_auth.users (id) ON DELETE CASCADE;

ALTER TABLE public.user_profile
  ADD CONSTRAINT user_profile_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES next_auth.users (id) ON DELETE CASCADE;

ALTER TABLE public.summit_catalog
  ADD CONSTRAINT summit_catalog_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES next_auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.event
  ADD CONSTRAINT event_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES next_auth.users (id) ON DELETE CASCADE;

COMMIT;

-- 실행 후 아래 결과는 여섯 행 모두 orphan_count = 0이어야 합니다.
SELECT 'route.user_id' AS reference, count(*) AS orphan_count
FROM public.route target LEFT JOIN next_auth.users na ON na.id = target.user_id
WHERE na.id IS NULL
UNION ALL
SELECT 'bookmark.user_id', count(*)
FROM public.bookmark target LEFT JOIN next_auth.users na ON na.id = target.user_id
WHERE na.id IS NULL
UNION ALL
SELECT 'place_review.user_id', count(*)
FROM public.place_review target LEFT JOIN next_auth.users na ON na.id = target.user_id
WHERE na.id IS NULL
UNION ALL
SELECT 'user_profile.user_id', count(*)
FROM public.user_profile target LEFT JOIN next_auth.users na ON na.id = target.user_id
WHERE na.id IS NULL
UNION ALL
SELECT 'summit_catalog.created_by', count(*)
FROM public.summit_catalog target LEFT JOIN next_auth.users na ON na.id = target.created_by
WHERE target.created_by IS NOT NULL AND na.id IS NULL
UNION ALL
SELECT 'event.created_by', count(*)
FROM public.event target LEFT JOIN next_auth.users na ON na.id = target.created_by
WHERE target.created_by IS NOT NULL AND na.id IS NULL;
