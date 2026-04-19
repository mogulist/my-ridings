# weather-service 구축 계획

> 모노레포(`my-ridings`) 안의 신규 서비스 `apps/weather-service`. UI 없이 **(1) 기상청 예보를 주기 수집해 DB에 저장하고 (2) 우리 앱들이 쓰기 좋은 형태의 HTTP API를 제공**하는 백엔드 서비스. Vercel + Vercel Cron으로 운영.
>
> 목적: `plan-my-route-app`의 1300km 종주 같은 장거리 경로 날씨 브리핑을, 기상청 API limit과 무관하게, 어떤 앱에서도 빠르게 조회할 수 있게 한다.

---

## 0. 사용자(=프로젝트 오너)가 먼저 해 둘 일 — **여기부터 직접 처리해 주세요**

아래 항목들은 외부 가입/승인이 필요해서 에이전트가 대신 못 합니다. 끝나면 발급받은 키만 알려주시면 그 뒤는 제가 이어갑니다.

### 0-1. 기상청 API 키 발급 (필수)

둘 중 한쪽만 발급해도 되지만, **API 허브 쪽을 권장**합니다 (제공 데이터셋이 풍부하고 한도 관리가 명확).

**옵션 A — 기상청 API 허브 (권장)**
1. <https://apihub.kma.go.kr> 회원가입 + 로그인.
2. "마이페이지 → 인증키 관리"에서 `AuthKey` 발급 (일반적으로 즉시 발급).
3. 아래 API 두 개를 활용 신청:
   - **단기예보** (`getVilageFcst` 계열, 3일치, 1~3시간 단위, 격자(nx,ny) 단위)
   - **중기예보 — 육상** (`getMidLandFcst`, 3~10일치, 지역코드 단위)
   - **중기예보 — 기온** (`getMidTa`, 3~10일치, 지역코드 단위)
4. 일일 호출 한도 확인(보통 키당 수만~수십만 건 — 우리 수집 패턴은 한참 못 미침).

**옵션 B — 공공데이터포털 (`data.go.kr`)**
1. <https://www.data.go.kr> 회원가입.
2. "기상청_단기예보 ((구)_동네예보) 조회서비스" 활용신청 (자동승인, 보통 수 분 내).
3. "기상청_중기예보 조회서비스" 활용신청.
4. "마이페이지 → 일반 인증키(Decoding)" 값을 메모.

### 0-2. 발급키를 전달할 위치 (둘 중 편하신 쪽)

방법 1 — **로컬 .env 작성** (제가 코드를 짤 때 바로 쓸 수 있음):
```
# apps/weather-service/.env.local
KMA_API_KEY=...               # 발급받은 키 (허브 AuthKey 또는 포털 Decoding key)
KMA_API_PROVIDER=hub          # 'hub' | 'data-go-kr'
CRON_SECRET=...               # 임의 32자 hex (openssl rand -hex 32)
INTERNAL_API_KEY=...          # 임의 32자 hex — 우리 다른 앱이 호출할 때 사용
```

방법 2 — **채팅으로만 전달**: 키 값을 채팅창에 붙여 주시면 제가 위 형태로 `.env.local`을 작성합니다 (gitignore 처리됨).

### 0-3. (선택) Vercel 프로젝트 미리 생성

지금 안 하셔도 Phase W7에서 같이 진행 가능. 미리 하실 거면:
1. Vercel 대시보드에서 신규 프로젝트 생성, 이름 `weather-service`.
2. Root Directory를 `apps/weather-service`로 지정 (이 폴더는 Phase W1에서 만들 예정 — 미리 생성만 해두고 첫 배포는 W7에서).
3. 위 .env 변수들을 Vercel 환경변수에 등록.

### 0-4. (선택) DB 위치 결정

기존 `plan-my-route` 가 쓰는 Supabase Postgres에 **별도 스키마 `weather`** 를 만들어 같이 살게 하는 것을 권장합니다 (운영 인스턴스 1개로 통합, 비용 0 추가). 별도 Supabase 프로젝트로 분리하고 싶으시면 말씀 주세요.

---

> **여기까지 완료되면 "기상청 키 발급 완료" 라고만 알려주세요. 그 시점부터 아래 Phase W1 ~ W9 를 제가 이어 진행합니다.**

---

## 1. 한눈에 보는 아키텍처

```
[plan-my-route-app (Expo)]      [plan-my-route (Next.js Web)]      [향후 다른 앱들]
            │                                │                              │
            └──────── HTTP (INTERNAL_API_KEY) ┴──────────────────────────────┘
                                  │
                                  ▼
                ┌────────────────────────────────────────┐
                │  apps/weather-service (Next.js / Vercel) │
                │                                        │
                │  app/api/v1/forecast/point/route.ts    │ ← 좌표 1점 예보
                │  app/api/v1/forecast/along/route.ts    │ ← 경로(polyline) 구간별 예보
                │  app/api/v1/forecast/daily/route.ts    │ ← 중기예보(일별)
                │  app/api/internal/tracked-grids/...    │ ← 관심 격자 등록
                │                                        │
                │  app/api/cron/ingest-short-term/...    │ ← Vercel Cron 트리거
                │  app/api/cron/ingest-mid-term/...      │ ← Vercel Cron 트리거
                └────────────────────────────────────────┘
                                  │
                       ┌──────────┴──────────┐
                       ▼                     ▼
             [기상청 API 허브]          [Supabase Postgres]
              (수집 워커만 호출)         schema: weather
                                          - weather_grid_meta
                                          - weather_short_term
                                          - weather_mid_term
                                          - tracked_grids
                                          - ingest_runs (감사 로그)
```

핵심 원칙:
- **앱은 절대 기상청을 직접 호출하지 않는다.** 우리 서비스만 호출.
- **수집 워커는 `tracked_grids`만 폴링** (사용 기반). 전국 풀수집 X (적어도 초기엔).
- 새 플랜이 만들어지거나 조회될 때, 그 경로의 격자가 자동으로 `tracked_grids`에 등록된다. → 사용자가 늘어나도 호출량은 격자 수에만 비례.

---

## 2. 기술 스택 결정

| 결정 | 선택 | 근거 |
|---|---|---|
| 런타임 | **Next.js 16 App Router** (Route Handlers만, page 없음) | Vercel Cron이 HTTP 트리거 → Route Handler가 가장 마찰 없음. 모노레포의 `plan-my-route`와 동일 스택, tsconfig·biome·Supabase 클라이언트 그대로 재사용 |
| 호스팅 | **Vercel** (Hobby → 필요시 Pro) | Cron + Functions 통합. 다른 서비스와 동일 운영 |
| 스케줄러 | **Vercel Cron** (`vercel.json`) | 발표회차에 맞춘 정확한 트리거. 별도 워커 프로세스 불필요 |
| DB | **Supabase Postgres** (`weather` 스키마) | 모노레포 기존 인프라. PK upsert로 idempotent 수집 |
| ORM | **Drizzle ORM** | 타입 안전, 마이그레이션 관리, plan-my-route의 raw SQL 마이그레이션 패턴보다 weather-service에선 Drizzle이 깔끔 |
| 검증 | **zod** | 외부 노출 API 입력/출력 스키마, 공유 타입 패키지에서도 사용 |
| 로깅 | Vercel 기본 + 구조화 JSON | 별도 APM 도입 안 함 (필요해지면 그때) |
| 패키지 매니저 | Bun (모노레포 표준) | — |

---

## 3. DB 스키마 (Drizzle 기준, 의사코드)

```ts
// schema: weather
export const weatherGridMeta = pgTable('weather_grid_meta', {
  nx: integer('nx').notNull(),
  ny: integer('ny').notNull(),
  lat: numeric('lat', { precision: 9, scale: 6 }).notNull(),  // 격자 중심 좌표
  lng: numeric('lng', { precision: 9, scale: 6 }).notNull(),
  midRegionLand: text('mid_region_land'),                     // 중기예보 지역코드 (육상)
  midRegionTemp: text('mid_region_temp'),                     // 중기예보 지역코드 (기온)
  primaryKey: [nx, ny],
});

export const weatherShortTerm = pgTable('weather_short_term', {
  nx: integer('nx').notNull(),
  ny: integer('ny').notNull(),
  forecastAt: timestamp('forecast_at', { withTimezone: true }).notNull(), // KST→UTC 정규화
  baseAt: timestamp('base_at', { withTimezone: true }).notNull(),         // 발표회차
  tempC: numeric('temp_c'),
  popPct: integer('pop_pct'),                                 // 강수확률 0~100
  sky: smallint('sky'),                                       // 1맑음 3구름많음 4흐림
  pty: smallint('pty'),                                       // 0없음 1비 2비/눈 3눈 4소나기
  windMs: numeric('wind_ms'),
  humidityPct: integer('humidity_pct'),
  rainMm: numeric('rain_mm'),
  snowCm: numeric('snow_cm'),
  ingestedAt: timestamp('ingested_at').defaultNow(),
  primaryKey: [nx, ny, forecastAt, baseAt],
});
// idx: (nx, ny, forecastAt desc) — latest-by-base 조회 가속

export const weatherMidTerm = pgTable('weather_mid_term', {
  regionLandCode: text('region_land_code').notNull(),
  regionTempCode: text('region_temp_code').notNull(),
  forecastDate: date('forecast_date').notNull(),
  baseAt: timestamp('base_at', { withTimezone: true }).notNull(),
  tmn: integer('tmn'), tmx: integer('tmx'),                   // 최저/최고
  amSky: text('am_sky'), pmSky: text('pm_sky'),
  amPop: integer('am_pop'), pmPop: integer('pm_pop'),
  ingestedAt: timestamp('ingested_at').defaultNow(),
  primaryKey: [regionLandCode, regionTempCode, forecastDate, baseAt],
});

export const trackedGrids = pgTable('tracked_grids', {
  nx: integer('nx').notNull(),
  ny: integer('ny').notNull(),
  reason: text('reason'),                                     // 예: 'plan:uuid'
  lastRequestedAt: timestamp('last_requested_at').defaultNow(),
  expiresAt: timestamp('expires_at'),                         // 미조회 N일 후 만료
  primaryKey: [nx, ny],
});

export const ingestRuns = pgTable('ingest_runs', {            // 감사/디버깅
  id: serial('id').primaryKey(),
  kind: text('kind').notNull(),                               // 'short' | 'mid'
  startedAt: timestamp('started_at').defaultNow(),
  finishedAt: timestamp('finished_at'),
  baseAt: timestamp('base_at'),
  cellsRequested: integer('cells_requested'),
  cellsSucceeded: integer('cells_succeeded'),
  cellsFailed: integer('cells_failed'),
  errorSummary: text('error_summary'),
});
```

핵심 결정:
- **PK에 `baseAt` 포함** → 발표회차별 이력 보존, 최신만 필요하면 view로.
- 격자 단위 저장. 위경도 좌표는 보조 컬럼.
- `tracked_grids.expiresAt`로 자연스러운 GC.

---

## 4. 외부 노출 HTTP API

모든 응답은 `Cache-Control: public, s-maxage=600, stale-while-revalidate=3600` 기본.
인증: `Authorization: Bearer <INTERNAL_API_KEY>`.

### 4-1. `GET /api/v1/forecast/point`
좌표 1점의 시계열 예보.
```
?lat=37.123&lng=128.456&from=2026-04-26T00:00:00Z&to=2026-04-29T00:00:00Z
→ {
  grid: { nx, ny, lat, lng },
  baseAt: "...",
  hourly: [{ at, tempC, popPct, sky, pty, windMs, humidityPct, rainMm, snowCm }]
}
```

### 4-2. `POST /api/v1/forecast/along`
경로 polyline + 출발시각 + 평균속도 → 구간별 예보. **앱이 가장 많이 쓸 엔드포인트.**
```
body: {
  polyline: [[lat,lng], [lat,lng], ...],   // 단순화된 점들 (앱에서 미리 thinning)
  segments: 4,                              // 구간 수
  departAt: "2026-04-26T05:00:00+09:00",
  paceKmh: 18
}
→ {
  totalKm: 142,
  segments: [
    {
      index: 0, fromKm: 0, toKm: 35.5, midpoint: { lat, lng },
      etaAt: "2026-04-26T06:58:00+09:00",
      grid: { nx, ny },
      forecast: { tempC, popPct, sky, pty, windMs, ... }
    },
    ...
  ]
}
```
부수효과: 호출 시 polyline의 격자들을 `tracked_grids`에 자동 upsert (`reason: 'along:<hash>'`).

### 4-3. `GET /api/v1/forecast/daily`
중기예보(3~10일).
```
?lat=&lng=&from=&to=
→ { regionLandCode, regionTempCode, baseAt, days: [{ date, tmn, tmx, amSky, pmSky, amPop, pmPop }] }
```

### 4-4. `POST /api/internal/tracked-grids`
플랜 생성 시 즉시 prefetch 등록 (선택, `/along` 호출만으로도 자동 등록되므로 보조).

---

## 5. Cron / 수집 전략

`vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/ingest-short-term", "schedule": "10 17,20,23,2,5,8,11,14 * * *" },
    { "path": "/api/cron/ingest-mid-term",   "schedule": "10 21,9 * * *" }
  ]
}
```
- 단기: 기상청 발표 02/05/08/11/14/17/20/23시(KST) + 10분 = UTC로 변환된 cron 식 (위는 UTC).
- 중기: 06시·18시 발표 + 약간의 버퍼.
- cron 라우트는 헤더 `Authorization: Bearer ${CRON_SECRET}` 검증 (Vercel Cron 자동 첨부).

수집 절차 (`/api/cron/ingest-short-term`):
1. `tracked_grids`에서 만료 안 된 격자 조회 (없으면 즉시 종료).
2. 격자 목록을 N개 샤드로 분할 (Vercel 함수 타임아웃 대비 — 패턴 A).
3. 각 샤드는 기상청 단기예보 API 호출 → 정규화 → `weather_short_term` upsert.
4. `ingest_runs`에 결과 한 줄 기록.
5. 실패 격자는 다음 회차에 자연 회복 (idempotent).

패턴 A로 시작, `tracked_grids`가 수천을 넘으면 Patten B (Upstash QStash) 검토.

---

## 6. 패키지 분할 (모노레포 컨벤션 준수)

`packages/plan-geometry`처럼 **순수 TS 패키지**로 잘게 분리:

```
packages/
  weather-grid/         ← LCC 격자 변환 (lat,lng) ↔ (nx,ny). 순수 함수 + Jest
  kma-client/           ← 기상청 호출 래퍼 (단기/중기). fetch + zod 파싱. 키는 인자로 주입
  weather-types/        ← 외부 API 응답 zod 스키마 + 추론 타입. 다른 앱이 import해서 사용

apps/
  weather-service/      ← Next.js. 위 패키지 조합 + DB + Cron + HTTP API
```

- `weather-grid`, `kma-client`는 **DB도 모르고 Next도 모름** → 단위 테스트 100% 가능.
- `weather-types`는 모바일/웹 모두에서 import (zod는 RN 호환 OK).

---

## 7. Phase 분할

원칙은 plan-my-route-app 플랜과 동일:
- 각 Phase 끝에는 **수동으로 검증 가능한 가시적 변화**가 하나.
- 순수 로직은 **Jest로 TDD**.
- 한 Phase는 가능하면 1~3시간 분량.

### Phase W0 — 사전 준비 (사용자)
- W0-1. 기상청 API 키 발급 (위 0번 항목).
- W0-2. 키 전달 / `.env.local` 작성.
- W0-3. (선택) Vercel 프로젝트 생성 / DB 위치 결정.
- **검증**: 키로 단기예보 API에 curl 1회 성공.

### Phase W1 — `packages/weather-grid` (격자 변환)
- W1-a. 패키지 뼈대 (`package.json`, `tsconfig`, `src/index.ts`).
- W1-b. `latLngToGrid(lat, lng): { nx, ny }` + `gridToLatLng(nx, ny): { lat, lng }` (LCC 공식).
- W1-c. Jest 테스트: 서울시청(60,127), 부산시청(98,76) 등 **알려진 좌표 vs 격자** 검증.
- **검증**: `bun test` 그린.

### Phase W2 — `packages/kma-client` (기상청 호출)
- W2-a. 패키지 뼈대 + zod 스키마 (단기예보 응답).
- W2-b. `fetchVilageFcst({ nx, ny, baseDate, baseTime, authKey })` 함수.
- W2-c. 응답 정규화 (코드 → 의미값, 시각 KST→UTC, 카테고리 → 명시 필드).
- W2-d. Jest 테스트: 실제 응답 샘플 fixture로 파싱 검증 (네트워크 없는 단위 테스트).
- W2-e. 중기예보 (`fetchMidLandFcst`, `fetchMidTa`) 동일 패턴.
- **검증**: 로컬에서 실 키로 1회 fetch → 콘솔에 정상 객체.

### Phase W3 — `packages/weather-types` + DB 스키마
- W3-a. `weather-types` 패키지 (외부 노출 API의 zod 스키마와 추론 타입).
- W3-b. `apps/weather-service` Next.js 뼈대 생성 + Drizzle 셋업.
- W3-c. 위 4개 테이블 + 인덱스 마이그레이션 작성 + 적용.
- W3-d. `weather_grid_meta` 시드 스크립트 (한국 격자 ~38천 셀 + 중기예보 region 매핑 테이블 — 기상청 공시 자료 기반 일회성 시드).
- **검증**: Supabase Studio에서 4개 테이블 + 시드 row count 확인.

### Phase W4 — 단기예보 수집 워커
- W4-a. `/api/cron/ingest-short-term` 라우트, `CRON_SECRET` 검증.
- W4-b. `tracked_grids` 비어 있을 때의 처리(즉시 정상 종료) + `ingest_runs` 기록.
- W4-c. 임의 격자 1개를 수동으로 `tracked_grids`에 넣고 cron 라우트를 로컬에서 호출 → DB에 row 적재.
- W4-d. 샤딩 파라미터 (`?shard=&total=`) 추가, 함수 내 처리량 측정 후 적정 샤드 수 결정.
- **검증**: 로컬 호출 → `weather_short_term`에 한 격자×n시각 row 생성.

### Phase W5 — 외부 노출 API: `point`
- W5-a. `GET /api/v1/forecast/point` 구현 (입력 zod, 격자 변환, DB 조회, 정규화 응답).
- W5-b. `INTERNAL_API_KEY` 인증 미들웨어.
- W5-c. 캐시 헤더 + ETag.
- W5-d. 통합 테스트 (실 DB 사용, 격자 1개에 미리 적재된 데이터로 검증).
- **검증**: curl로 시점/좌표 주면 시계열 JSON 응답.

### Phase W6 — 외부 노출 API: `along`
- W6-a. polyline → 등분 점 추출 유틸 (단순 거리 비례, `plan-geometry` 보조 활용 가능 여부 검토).
- W6-b. ETA 계산 (departAt + 누적km / paceKmh).
- W6-c. 각 구간 좌표 → 격자 → DB lookup → 응답 조립.
- W6-d. 호출 시 격자들을 `tracked_grids` upsert (자동 prefetch).
- W6-e. 통합 테스트.
- **검증**: curl로 plan-my-route-app 한 스테이지의 polyline 보내면 4구간 예보 응답.

### Phase W7 — Vercel 배포 + Cron 가동
- W7-a. `vercel.json` cron 등록.
- W7-b. Vercel 환경변수 등록 (`KMA_API_KEY`, `CRON_SECRET`, `INTERNAL_API_KEY`, DB URL).
- W7-c. 첫 배포.
- W7-d. cron 한 회차 자연 발생 후 `ingest_runs` + `weather_short_term` 증분 확인.
- **검증**: Vercel 대시보드 cron 로그 + DB row 증가.

### Phase W8 — 중기예보
- W8-a. `/api/cron/ingest-mid-term` 라우트.
- W8-b. `GET /api/v1/forecast/daily`.
- W8-c. 통합 테스트.
- **검증**: 다음 발표회차 후 `weather_mid_term` 적재 + curl 응답.

### Phase W9 — plan-my-route-app 연동
- W9-a. `apps/plan-my-route-app/src/features/api/weather.ts`에 `fetchAlongForecast` 추가 (weather-service 호출).
- W9-b. plan-my-route-app의 Phase 7-c (일정 카드 인라인 4-아이콘) 구현 → 본 weather-service에서 데이터 받아옴.
- W9-c. plan-my-route-app의 Phase 7-d (전용 브리핑 스크린).
- **검증**: 앱에서 일정 카드에 날씨 아이콘 + 브리핑 스크린 표시.
- → 이 시점에 plan-my-route-app 의 기존 Plan 7-a/7-b (자체 프록시) 는 폐기.

### Phase W10+ (옵션, 본 Plan 밖)
- 강수 알림 (cron이 다음 24시간 강수확률 80%+ 검출 시 푸시 큐에 enqueue).
- 태풍/특보 API 추가 수집.
- Public read API 분리 (rate-limit + API key 발급) → 외부에 무료 자전거 날씨 API로 공개.
- 운영 대시보드 (`apps/weather-service/app/admin/`).
- 큐(QStash) 기반 수집으로 진화.

---

## 8. 위험 및 가정

| 항목 | 내용 | 대응 |
|---|---|---|
| 기상청 API 응답 포맷 불안정 | 카테고리 코드/값 형식이 가끔 바뀜 | zod 파싱 실패 시 raw payload를 `ingest_runs.error_summary`에 저장, 알림은 Vercel 로그 모니터링으로 |
| 함수 타임아웃 | 한 회차에 격자 수천 처리 시 60s 초과 가능 | 샤딩(W4-d)으로 분할. 더 늘면 QStash 큐 |
| 한국 IP 의존성 | 기상청 일부 엔드포인트가 해외 IP 차단 가능성 | API 허브는 일반적으로 글로벌 허용. 차단 발생 시 Vercel region을 `icn1` (서울)로 강제 |
| 격자 시드의 정확성 | 수동 정리 자료 기반 | LCC 공식으로 자체 산출 + 알려진 도시 좌표로 검증 |
| 시간대 혼동 | KST/UTC 혼용 위험 | DB는 항상 UTC, KMA fetch 함수 안에서만 KST 변환 |
| 비용 | Vercel Hobby 한계 | 초기엔 Hobby 충분. 함수 호출/실행시간이 늘면 Pro 검토 |
| 라이선스/이용약관 | 기상청 데이터 재배포 조건 | 외부 공개 시 출처 표기 의무 — 응답 footer/약관 문구 추가, 내부 사용은 무관 |

---

## 9. plan-my-route-app 기존 Plan과의 관계

`/.cursor/plans/plan-my-route-app_detail_screens_946bb5ba.plan.md` 의 Phase 7 (`p7-a-weather-proxy`, `p7-b-weather-segments`)는 **본 Plan으로 흡수**되어 폐기됩니다.

남는 Phase 7 항목:
- `p7-c-schedule-inline-icons` → 본 Plan W9-b로 이동.
- `p7-d-weather-briefing-screen` → 본 Plan W9-c로 이동.

→ Phase W9가 끝나는 시점에 위 todo들을 completed 처리하면 됩니다.

---

## 10. 다음 단계

1. **사용자**: §0 (기상청 API 키 발급) 완료 후 알려주세요.
2. **에이전트**: Phase W1부터 순차 진행. 각 Phase 끝에 검증 결과 보고 후 다음 Phase 진행 여부를 확인합니다.

본 Plan 자체에 추가/수정하고 싶은 부분이 있다면 (예: DB 분리, public API 우선순위, 다른 외부 데이터 소스 추가 등) 진행 전에 말씀 주세요. 보완 라운드를 한두 번 더 돌리고 W1로 들어가는 게 좋습니다.
