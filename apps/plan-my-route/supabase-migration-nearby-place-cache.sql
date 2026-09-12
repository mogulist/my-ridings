-- 주변 장소 캐시 (지리 격자 단위, 경로와 무관).
--
-- 카카오 로컬 쿼터가 사용자 수에 비례해 늘어나지 않게 한다. 같은 땅을 지나는 검색은
-- 어느 라우트에서 왔든 같은 셀을 가리키므로, 라우트를 복제하거나 일부 구간만 겹치는
-- 경우에도 그대로 재활용된다.
--
-- 경로별 값(진행거리·이탈거리)은 저장하지 않는다. 라우트가 편집되면 누적 거리가 밀려
-- 전부 무효가 되기 때문에, 읽을 때 트랙 포인트로 계산한다.
--
-- nearby_scan_cell이 "이 셀은 훑었다"를 기록한다. 이게 없으면 장소 테이블이 비었을 때
-- "아직 안 훑음"과 "훑었는데 없음"을 구분할 수 없다.

CREATE TABLE IF NOT EXISTS public.nearby_place (
    provider text NOT NULL DEFAULT 'kakao',
    place_id text NOT NULL,
    category text NOT NULL,
    -- 장소 좌표에서 유도한 격자 셀 'latIdx:lngIdx'
    cell_key text NOT NULL,
    place_name text NOT NULL,
    place_url text,
    address_name text,
    road_address_name text,
    phone text,
    category_name text,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT nearby_place_pkey PRIMARY KEY (provider, place_id, category)
);

CREATE INDEX IF NOT EXISTS nearby_place_cell_idx
    ON public.nearby_place (cell_key, category);

CREATE TABLE IF NOT EXISTS public.nearby_scan_cell (
    cell_key text NOT NULL,
    category text NOT NULL,
    scanned_at timestamp with time zone NOT NULL DEFAULT now(),
    place_count integer NOT NULL DEFAULT 0,
    -- 45개 캡에 걸려 이 셀을 다 못 훑었는지
    is_truncated boolean NOT NULL DEFAULT false,
    CONSTRAINT nearby_scan_cell_pkey PRIMARY KEY (cell_key, category)
);

GRANT ALL ON TABLE public.nearby_place TO postgres;
GRANT ALL ON TABLE public.nearby_place TO service_role;
GRANT ALL ON TABLE public.nearby_scan_cell TO postgres;
GRANT ALL ON TABLE public.nearby_scan_cell TO service_role;
