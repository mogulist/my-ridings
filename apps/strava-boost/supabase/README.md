# 공유 Supabase 설정

부스트는 기존 **plan-my-route Supabase 프로젝트** 안의 `strava_boost` 스키마만 사용한다.
장비·정비 기능이나 새로운 UI, Supabase 회원 가입은 포함하지 않는다.

## 적용 순서

1. plan-my-route 프로젝트의 SQL Editor에서 `migrations/20261025_add_shared_database.sql`을 실행한다.
   신규 DB 초기화에는 동일한 내용의 `schema.sql`을 사용한다. 둘 다 실행할 필요는 없다.
2. Data API 설정의 **Exposed schemas** 목록에 `strava_boost`를 추가한다.
   기존 `public` 등 목록은 유지한다. 기존 기본 권한이나 Auth 설정은 바꾸지 않는다.
3. **부스트 서버**에만 다음 환경변수를 설정하고 재배포한다.

   ```dotenv
   SUPABASE_URL=https://<plan-my-route-project>.supabase.co
   SUPABASE_SECRET_KEY=<server-only-secret-key>
   # 기존 프로젝트의 SUPABASE_SERVICE_ROLE_KEY도 대체 값으로 지원한다.
   ```

   Strava client ID, client secret, redirect URI와 웹훅 설정은 기존 값을 유지한다.
   브라우저용 Supabase anon 키는 부스트에서 사용하지 않는다.
   plan-my-route 환경변수와 Supabase Auth의 공급자·리디렉션 URL을 변경할 필요가 없다.
4. 기존 Strava 계정으로 로그인하고 **전체 다시 동기화**를 실행한다.
   브라우저에 남은 예전 캐시는 다른 계정의 자료일 수 있어 DB로 자동 업로드하지 않는다.
   새 기기에서도 같은 Strava 계정으로 로그인하면 같은 활동과 동기화 시각을 읽는다.
5. 기존 배포에서 웹훅 테이블을 사용했다면 적용/배포 직후 **전체 다시 동기화**한다.
   이전 public 테이블은 삭제하거나 복사하지 않는다. 전환 중의 알림은 전체 동기화로 반영한다.

## 저장과 접근 범위

- `activities`: 사용자별 활동 데이터. 복합 키 `(owner_id, activity_id)`.
- `sync_state`: 사용자별 마지막 동기화 시각.
- `strava_activity_changes`: 기존 웹훅 변경 알림.
- OAuth 토큰과 스트림·기어 캐시는 기존처럼 브라우저에 둔다. DB에 토큰을 저장하지 않는다.
- 모든 DB 요청은 서버에서 Strava `/athlete`로 확인한 사용자 ID를 사용한다.
  Data API 클라이언트는 항상 `strava_boost` 스키마를 지정한다.
- RLS를 활성화하고 `anon`/`authenticated` 접근을 차단한다. `service_role`에는 실제 작업에 필요한 테이블 권한만 명시한다.
- 설정이 없으면 기존 IndexedDB 방식이 유지된다. 설정된 DB의 장애는 오류로 표시한다.
  DB 장애 시 로컬 저장만 성공한 것으로 취급하지 않는다.

## plan-my-route에 미치는 범위

마이그레이션은 `strava_boost` 안에만 객체와 권한을 만든다. 기존 `public`, `auth`,
`next_auth` 테이블·정책·회원 계정에는 변경이 없다. 두 앱은 동일 프로젝트의 용량과
장애 범위를 공유한다. 서버 secret/service_role 키는 프로젝트 전체에 권한이 있으므로
스키마 분리만으로 두 서버의 권한을 완전히 격리하는 것은 아니다.

아직 운영 DB에 적용하지 않은 SQL의 검증과 운영 연결 확인은 구분해야 한다.
배포 후 두 브라우저에서 같은 Strava 계정의 활동 수·동기화 시각·개별 수정 반영을 확인하고,
plan-my-route의 기존 로그인과 경로 조회·저장이 정상인지 확인한다.

## 이번 변경의 검증 결과

- 부스트 단위·API 테스트, 타입 검사, webpack 프로덕션 빌드 통과.
- PostgreSQL 호환 임시 DB(PGlite)에서 SQL 적용/재실행 및 schema.sql과의 일치 확인.
  기존 public/auth/next_auth의 테이블·권한·정책·데이터가 유지되는지 비교했다.
  부스트의 RLS 활성화, 서버 역할 접근, anon/authenticated 접근 차단도 확인했다.
- 독립 브라우저 컨텍스트 2개에서 공유 저장소 응답을 모킹해 동일 활동 조회,
  개별 재동기화 반영, 필터·정렬 유지 확인. 운영 Supabase/Strava 연동 테스트는 아니다.
- plan-my-route 및 공용 packages·의존성 lockfile·turbo 설정의 변경 없음.
  최신 main 리베이스 후 의존성을 독립 설치하여 plan-my-route 테스트 83개가 모두 통과했다.
  앞선 React 의존성 경로 오류는 재현되지 않았다.
- 운영 DB 변경, Data API 설정, 배포는 수행하지 않았다. 위 적용 순서 이후 운영 확인이 필요하다.

### 2026-10-26 main 리베이스 후 재검증

- 기준 main: `ec190b0` (Critical 및 후속 의존성 보안 업데이트 포함).
- `bun install --frozen-lockfile`로 별도 설치. lockfile 변경 없음.
- 실제 설치 Next.js `16.4.3`, Axios `1.20.0` 확인.
- 부스트 테스트 36개, plan-my-route 테스트 83개, 의존성 호환 테스트 3개 통과.
- 부스트 webpack 프로덕션 빌드 및 재생성된 Next.js 타입 기준 타입 검사 통과.
- 임시 DB에서 마이그레이션 격리·재실행 검증 재통과. 운영 DB 적용 여부는 그대로다.
