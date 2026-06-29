# Supabase 설정 가이드

## Phase 1: events 테이블 마이그레이션

### 1. Vercel에서 Supabase 생성

1. [Vercel Dashboard](https://vercel.com) → 프로젝트 선택
2. Storage 탭 → Create Database → Supabase 선택
3. 프로젝트 생성 완료 시 환경변수 자동 설정됨:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. 테이블 생성

Supabase Dashboard → SQL Editor에서 `schema.sql` 내용 실행:

```sql
-- supabase/schema.sql 파일 내용을 복사하여 실행
```

### 3. 데이터 마이그레이션

```bash
# Supabase Dashboard > Settings > API에서 키 확인 후 실행
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
bun run scripts/migrate-events.ts
```

### 4. 확인

Supabase Dashboard → Table Editor → events 테이블에서 데이터 확인

---

## 마이그레이션: 코스 링크 URL (1단계)

기존 DB에 이미 `courses` 테이블이 있는 경우, Supabase SQL Editor에서 다음 파일을 실행해 컬럼만 추가할 수 있습니다:

- `supabase/migrations/20260225_add_course_link_urls.sql` — `official_site_url`, `strava_url`, `ride_with_gps_url` 컬럼 추가

새로 스키마를 만드는 경우에는 `schema.sql`에 이미 포함되어 있으므로 별도 실행 불필요합니다.

---

## 파일 구조

```
supabase/
├── README.md          # 이 파일
├── schema.sql         # 테이블 스키마 (전체 초기화용)
├── migrations/        # 기존 DB에 컬럼만 추가하는 마이그레이션
│   └── 20260225_add_course_link_urls.sql

lib/
├── supabase.ts        # Supabase 클라이언트
├── database.types.ts  # DB 타입 정의
└── db/
    └── events.ts      # events 조회 함수 (하이브리드)

scripts/
└── migrate-events.ts  # 마이그레이션 스크립트
```

---

## 하이브리드 동작 방식

`lib/db/events.ts`의 함수들은 다음과 같이 동작합니다:

1. Supabase 환경변수가 설정되어 있으면 → DB에서 조회
2. 환경변수가 없거나 DB 오류 시 → `events.config.ts` (JSON) 폴백

이렇게 하면:
- 로컬 개발 시 Supabase 없이도 동작
- 프로덕션에서 DB 장애 시에도 서비스 유지
- 점진적 마이그레이션 가능

---

## 다음 단계 (Phase 2)

Phase 2에서는 `event_years`와 `courses` 테이블을 분리하여 정규화합니다.
현재는 `year_details`를 JSONB로 저장하고 있습니다.
