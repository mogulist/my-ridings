# Plan My Route Supabase Auth 통일 설계

## 목표

`plan-my-route` 웹과 Expo 앱의 인증을 Supabase Auth GitHub OAuth로 통일한다. 기존 Auth.js, Supabase Adapter, 모바일 전용 OAuth 교환 API와 자체 JWT를 제거하고, 기존 GitHub 사용자에게 연결된 데이터를 보존한다.

Google 로그인과 Google 계정 데이터는 이전하지 않는다.

## 현재 구조

- 웹은 Auth.js와 `@auth/supabase-adapter`를 사용한다.
- 웹 사용자는 `next_auth.users`, 계정은 `next_auth.accounts`, 세션은 `next_auth.sessions`에 저장된다.
- Expo 앱은 GitHub OAuth code를 서버의 `/api/mobile/auth/github`로 보내며, 서버가 자체 access token을 발급한다.
- API는 Auth.js 쿠키 또는 자체 Bearer token을 검증한다.
- 사용자 소유 데이터는 `next_auth.users.id`를 외래키로 참조한다.

## 목표 구조

### 웹

- `@supabase/ssr` browser/server client를 사용한다.
- 로그인 화면은 Supabase Auth의 `signInWithOAuth({ provider: "github" })`를 호출한다.
- `/auth/callback` route가 PKCE code를 세션으로 교환한다.
- Next.js `proxy.ts`가 인증 쿠키를 갱신한다.
- Header는 Supabase 사용자 상태를 읽고 `signOut()`을 호출한다.
- 서버 API는 쿠키 사용자는 server client의 `auth.getUser()`, Expo Bearer token은 admin client의 `auth.getUser(token)`으로 검증한다.

### Expo

- `@supabase/supabase-js` client 하나가 OAuth와 세션을 관리한다.
- `signInWithOAuth`의 URL을 `WebBrowser.openAuthSessionAsync`로 연다.
- `planmyrouteapp://auth/callback` deep link에서 access/refresh token을 받아 Supabase session을 설정한다.
- 기존 API 호출 구조를 유지하기 위해 `getStoredAccessToken()`은 Supabase session의 access token을 반환한다.
- 로그아웃은 `supabase.auth.signOut()`을 호출한다.
- Google OAuth UI와 환경변수, 모바일 GitHub/Google 교환 API, 자체 JWT를 제거한다.

## 데이터 마이그레이션

새 인증 사용자가 먼저 생성되어야 하므로 다음 순서로 진행한다.

1. Supabase Dashboard에서 GitHub provider와 redirect URL을 설정한다.
2. 변경 코드를 배포한다.
3. GitHub로 한 번 로그인해 `auth.users` 사용자를 생성한다.
4. 제공된 SQL을 Supabase SQL Editor에서 실행한다.

SQL은 트랜잭션 안에서 다음을 수행한다.

1. `next_auth.accounts.provider = 'github'`인 기존 사용자를 찾는다.
2. 기존 사용자와 이메일이 같은 `auth.users`가 정확히 한 명인지 검증한다.
3. 사용자 외래키를 일시적으로 제거한다.
4. 아래 컬럼의 기존 UUID를 새 `auth.users.id`로 변경한다.
   - `public.route.user_id`
   - `public.bookmark.user_id`
   - `public.place_review.user_id`
   - `public.user_profile.user_id`
   - `public.summit_catalog.created_by`
   - `public.event.created_by`
5. 외래키를 `auth.users(id)` 대상으로 다시 생성한다.

첫 마이그레이션에서는 롤백과 검증을 위해 `next_auth` 스키마를 삭제하지 않는다. 데이터 확인 후 별도 정리 SQL로 제거한다.

## Supabase Dashboard 설정

- GitHub provider를 활성화하고 기존 OAuth Client ID/Secret을 등록한다.
- GitHub OAuth App callback URL을 Supabase Dashboard에 표시되는 `https://<project-ref>.supabase.co/auth/v1/callback`으로 변경한다.
- Auth URL Configuration에 다음 redirect를 허용한다.
  - `https://plan-my-route.vercel.app/auth/callback`
  - Preview 배포가 필요하면 해당 preview 패턴
  - `planmyrouteapp://auth/callback`
  - 개발 빌드용 `planmyrouteapp-dev://auth/callback`

## 환경변수

웹과 Expo 모두 같은 Supabase 프로젝트를 사용한다.

- 웹:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 또는 현재 프로젝트의 anon key
  - `SUPABASE_SERVICE_ROLE_KEY`은 기존 서버 관리 작업에만 유지
- Expo:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN`은 API 호출용으로 유지

다음 변수는 제거 대상이다.

- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_SECRET` / `NEXTAUTH_SECRET`
- `MOBILE_AUTH_GITHUB_*`
- `MOBILE_AUTH_GOOGLE_*`
- `EXPO_PUBLIC_GITHUB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
- 기존 provider별 OAuth redirect URI 변수

## 보안

- 브라우저와 Expo에는 publishable/anon key만 노출한다.
- `SUPABASE_SERVICE_ROLE_KEY`은 서버 밖으로 노출하지 않는다.
- API 권한 판단은 로컬 저장 session 객체가 아니라 Supabase가 검증한 사용자 결과를 사용한다.
- 현재 API의 service-role DB 접근과 `user_id` 소유권 검사는 유지한다.
- 사용자 권한에 `user_metadata`를 사용하지 않는다.

## 오류 처리

- OAuth 시작 실패는 로그인 화면에 사용자 메시지를 표시한다.
- callback의 code 교환 실패는 `/signin?error=oauth`로 돌려보낸다.
- API의 만료되거나 잘못된 token은 기존과 동일하게 인증되지 않은 사용자로 처리한다.
- Expo는 세션이 없거나 갱신할 수 없으면 로그인 화면으로 이동한다.

## 테스트 및 검증

- callback redirect의 `next` 값이 외부 URL로 열리지 않는지 테스트한다.
- 쿠키 사용자와 Bearer token 사용자 변환 로직을 테스트한다.
- Expo OAuth callback URL에서 session token을 읽는 로직을 테스트한다.
- `plan-my-route` unit test, typecheck, build를 실행한다.
- Expo lint와 TypeScript 검사를 실행한다.
- Preview에서 웹 GitHub 로그인과 로그아웃을 수동 확인한다.
- 모바일 deep link는 개발 빌드 또는 실제 기기에서 최종 확인한다.
- SQL 실행 전후에 외래키별 행 수와 사용자 UUID를 조회해 데이터 보존을 확인한다.

## 롤백

- 코드 롤백 시 `next_auth` 스키마가 남아 있어 기존 Auth.js 인증으로 되돌릴 수 있다.
- SQL 실행 후 코드까지 롤백해야 한다면 제공하는 역방향 SQL로 사용자 UUID와 외래키 대상을 `next_auth.users`로 복구한다.
- 데이터 검증이 끝나기 전에는 `next_auth` 스키마를 삭제하지 않는다.
