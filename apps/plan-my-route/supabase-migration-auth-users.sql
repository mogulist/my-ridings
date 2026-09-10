-- Plan My Route: next_auth.users → auth.users 마이그레이션
--
-- 실행 전 필수:
-- 1. Supabase Dashboard에서 GitHub provider 활성화
-- 2. 변경 코드 배포 후 GitHub로 한 번 로그인해 auth.users 행 생성
-- 3. 아래 SELECT 결과에서 old_id와 new_id가 모두 채워졌는지 확인
--
-- 검증 (실행 전):
-- SELECT na.id AS old_id, na.email, au.id AS new_id
-- FROM next_auth.accounts na_acc
-- JOIN next_auth.users na ON na.id = na_acc."userId"
-- LEFT JOIN auth.users au ON lower(au.email) = lower(na.email)
-- WHERE na_acc.provider = 'github';

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
    LEFT JOIN auth.users au ON lower(au.email) = lower(na.email)
    WHERE na_acc.provider = 'github'
    GROUP BY na.id
    HAVING count(au.id) <> 1
  ) invalid_mappings;

  IF invalid_mapping_count > 0 THEN
    RAISE EXCEPTION 'GitHub 사용자 중 auth.users와 정확히 하나로 매핑되지 않는 사용자가 %명 있습니다.', invalid_mapping_count;
  END IF;
END $$;

CREATE TEMP TABLE auth_user_migration_map ON COMMIT DROP AS
SELECT DISTINCT
  na.id AS old_user_id,
  au.id AS new_user_id
FROM next_auth.accounts na_acc
JOIN next_auth.users na ON na.id = na_acc."userId"
JOIN auth.users au ON lower(au.email) = lower(na.email)
WHERE na_acc.provider = 'github';

ALTER TABLE auth_user_migration_map
  ADD CONSTRAINT auth_user_migration_map_old_user_id_key UNIQUE (old_user_id),
  ADD CONSTRAINT auth_user_migration_map_new_user_id_key UNIQUE (new_user_id);

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
  LEFT JOIN auth_user_migration_map migration
    ON migration.old_user_id = referenced_users.referenced_user_id
  LEFT JOIN auth.users existing_auth_user
    ON existing_auth_user.id = referenced_users.referenced_user_id
  WHERE migration.old_user_id IS NULL
    AND existing_auth_user.id IS NULL;

  IF cardinality(unmapped_user_ids) > 0 THEN
    RAISE EXCEPTION 'GitHub 사용자로 매핑할 수 없는 기존 소유자 ID가 있습니다: %', unmapped_user_ids;
  END IF;
END $$;

ALTER TABLE public.route DROP CONSTRAINT IF EXISTS route_user_id_fkey;
ALTER TABLE public.bookmark DROP CONSTRAINT IF EXISTS bookmark_user_id_fkey;
ALTER TABLE public.place_review DROP CONSTRAINT IF EXISTS place_review_user_id_fkey;
ALTER TABLE public.user_profile DROP CONSTRAINT IF EXISTS user_profile_user_id_fkey;
ALTER TABLE public.summit_catalog DROP CONSTRAINT IF EXISTS summit_catalog_created_by_fkey;
ALTER TABLE public.event DROP CONSTRAINT IF EXISTS event_created_by_fkey;

UPDATE public.route target
SET user_id = migration.new_user_id
FROM auth_user_migration_map migration
WHERE target.user_id = migration.old_user_id;

UPDATE public.bookmark target
SET user_id = migration.new_user_id
FROM auth_user_migration_map migration
WHERE target.user_id = migration.old_user_id;

UPDATE public.place_review target
SET user_id = migration.new_user_id
FROM auth_user_migration_map migration
WHERE target.user_id = migration.old_user_id;

UPDATE public.user_profile target
SET user_id = migration.new_user_id
FROM auth_user_migration_map migration
WHERE target.user_id = migration.old_user_id;

UPDATE public.summit_catalog target
SET created_by = migration.new_user_id
FROM auth_user_migration_map migration
WHERE target.created_by = migration.old_user_id;

UPDATE public.event target
SET created_by = migration.new_user_id
FROM auth_user_migration_map migration
WHERE target.created_by = migration.old_user_id;

ALTER TABLE public.route
  ADD CONSTRAINT route_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE public.bookmark
  ADD CONSTRAINT bookmark_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE public.place_review
  ADD CONSTRAINT place_review_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE public.user_profile
  ADD CONSTRAINT user_profile_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE public.summit_catalog
  ADD CONSTRAINT summit_catalog_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.event
  ADD CONSTRAINT event_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users (id) ON DELETE CASCADE;

COMMIT;

-- 실행 후 아래 결과는 여섯 행 모두 orphan_count = 0이어야 합니다.
SELECT 'route.user_id' AS reference, count(*) AS orphan_count
FROM public.route target LEFT JOIN auth.users au ON au.id = target.user_id
WHERE au.id IS NULL
UNION ALL
SELECT 'bookmark.user_id', count(*)
FROM public.bookmark target LEFT JOIN auth.users au ON au.id = target.user_id
WHERE au.id IS NULL
UNION ALL
SELECT 'place_review.user_id', count(*)
FROM public.place_review target LEFT JOIN auth.users au ON au.id = target.user_id
WHERE au.id IS NULL
UNION ALL
SELECT 'user_profile.user_id', count(*)
FROM public.user_profile target LEFT JOIN auth.users au ON au.id = target.user_id
WHERE au.id IS NULL
UNION ALL
SELECT 'summit_catalog.created_by', count(*)
FROM public.summit_catalog target LEFT JOIN auth.users au ON au.id = target.created_by
WHERE target.created_by IS NOT NULL AND au.id IS NULL
UNION ALL
SELECT 'event.created_by', count(*)
FROM public.event target LEFT JOIN auth.users au ON au.id = target.created_by
WHERE target.created_by IS NOT NULL AND au.id IS NULL;
