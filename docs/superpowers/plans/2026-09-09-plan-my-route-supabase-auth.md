# Plan My Route Supabase Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `plan-my-route` 웹과 Expo 앱을 GitHub 단일 Supabase Auth로 전환하고 기존 GitHub 사용자 데이터를 보존한다.

**Architecture:** 웹은 `@supabase/ssr` 쿠키 세션, Expo는 `@supabase/supabase-js`와 SecureStore 세션을 사용한다. API는 웹 쿠키 또는 모바일 Bearer access token을 Supabase Auth로 검증하며, 데이터 마이그레이션 SQL이 기존 `next_auth.users` 외래키를 새 `auth.users` 사용자로 이동한다.

**Tech Stack:** Next.js 16, React 19, Expo SDK 55, Supabase Auth/SSR, TypeScript, Bun

## Global Constraints

- GitHub 로그인만 유지하고 Google 로그인은 제거한다.
- 기존 GitHub 사용자 소유 데이터는 이메일 기준으로 새 Supabase Auth 사용자에게 이전한다.
- service-role key는 서버에서만 사용한다.
- 인증된 사용자 ID는 Supabase가 검증한 세션 또는 access token에서만 가져온다.
- `next_auth` 스키마는 데이터 검증 전까지 삭제하지 않는다.

---

### Task 1: 웹 Supabase Auth 기반 구성

**Files:**
- Create: `apps/plan-my-route/lib/supabase/env.ts`
- Create: `apps/plan-my-route/lib/supabase/client.ts`
- Create: `apps/plan-my-route/lib/supabase/server.ts`
- Create: `apps/plan-my-route/lib/supabase/middleware.ts`
- Create: `apps/plan-my-route/proxy.ts`
- Modify: `apps/plan-my-route/package.json`
- Delete: `apps/plan-my-route/auth.ts`
- Delete: `apps/plan-my-route/app/api/auth/[...nextauth]/route.ts`
- Delete: `apps/plan-my-route/app/components/SessionProvider.tsx`

**Interfaces:**
- Produces `createClient()` browser/server factories and `updateSession(request)`.
- Requires `NEXT_PUBLIC_SUPABASE_URL` and publishable/anon key.

- [ ] Add `@supabase/ssr` and remove Auth.js dependencies.
- [ ] Implement browser and server clients with `getAll`/`setAll` cookie adapters.
- [ ] Implement Next.js 16 `proxy.ts` session refresh using `supabase.auth.getClaims()`.
- [ ] Remove Auth.js route/config/provider files.
- [ ] Run `bun install` and verify lockfile changes.

### Task 2: 웹 로그인 UI와 API 인증 전환

**Files:**
- Create: `apps/plan-my-route/lib/auth-utils.ts`
- Test: `apps/plan-my-route/lib/auth-utils.test.ts`
- Create: `apps/plan-my-route/app/auth/callback/route.ts`
- Modify: `apps/plan-my-route/app/signin/SignInPageClient.tsx`
- Modify: `apps/plan-my-route/app/components/HeaderAuth.tsx`
- Modify: `apps/plan-my-route/lib/get-authenticated-user.ts`
- Modify: `apps/plan-my-route/app/page.tsx`
- Modify: `apps/plan-my-route/app/routes/[id]/page.tsx`
- Modify: `apps/plan-my-route/app/layout.tsx`

**Interfaces:**
- Produces `normalizeCallbackPath`, `parseBearerToken`, `toAuthenticatedUser`.
- API auth accepts Supabase cookie sessions and Supabase access-token Bearer headers.

- [ ] Test callback path allow-listing, Bearer parsing, and user conversion.
- [ ] Confirm tests fail against the pre-migration implementation.
- [ ] Implement GitHub `signInWithOAuth` and PKCE callback exchange.
- [ ] Replace NextAuth session consumers with Supabase verified users.
- [ ] Implement client sign-out, refresh the server-rendered tree, and preserve existing profile/menu behavior.
- [ ] Run unit tests and typecheck.

### Task 3: Expo Supabase Auth 전환

**Files:**
- Create: `apps/plan-my-route-app/src/features/auth/supabase-client.ts`
- Create: `apps/plan-my-route-app/src/features/auth/oauth.ts`
- Test: `apps/plan-my-route-app/src/features/auth/oauth.test.ts`
- Modify: `apps/plan-my-route-app/src/features/auth/session.ts`
- Modify: `apps/plan-my-route-app/src/app/login.tsx`
- Modify: `apps/plan-my-route-app/src/app/(tabs)/_layout.tsx`
- Modify: `apps/plan-my-route-app/src/app/(tabs)/settings.tsx`
- Modify: `apps/plan-my-route-app/src/app/_layout.tsx`
- Modify: `apps/plan-my-route-app/package.json`
- Delete: `apps/plan-my-route/app/api/mobile/auth/github/route.ts`
- Delete: `apps/plan-my-route/app/api/mobile/auth/google/route.ts`
- Delete: `apps/plan-my-route/lib/mobile-auth.ts`

**Interfaces:**
- `getStoredAccessToken()` returns a current Supabase access token.
- `clearStoredAccessToken()` signs out the Supabase session.
- OAuth returns through `planmyrouteapp://auth/callback` or `planmyrouteapp-dev://auth/callback`.

- [ ] Test callback query parsing for valid access/refresh tokens and OAuth errors.
- [ ] Confirm tests fail before callback parser implementation.
- [ ] Configure Supabase client with SecureStore and native auth lifecycle refresh.
- [ ] Replace direct provider OAuth/code exchange with Supabase GitHub OAuth.
- [ ] Keep existing API functions unchanged by returning the Supabase access token.
- [ ] Remove Google and custom JWT endpoints/code.
- [ ] Run Expo lint and TypeScript checks.

### Task 4: 데이터 보존 마이그레이션 SQL

**Files:**
- Create: `apps/plan-my-route/supabase-migration-auth-users.sql`

**Interfaces:**
- Requires a new `auth.users` row created by GitHub login.
- Maps only existing `next_auth.accounts.provider = 'github'` users.

- [ ] Add preflight assertions for exactly one email match and no unmapped referenced owner IDs.
- [ ] Update all six user-reference columns inside one transaction.
- [ ] Recreate foreign keys against `auth.users(id)` with original delete behavior.
- [ ] Add pre/post verification queries and keep `next_auth` intact.
- [ ] Validate SQL syntax and constraint/table coverage against repository schemas.

### Task 5: 전체 검증 및 전달

**Files:**
- Modify: `docs/superpowers/specs/2026-09-09-plan-my-route-supabase-auth-design.md` only if implementation differs.

- [ ] Run `bun test lib` and `bun run typecheck` in `apps/plan-my-route`.
- [ ] Run `bun run build` in `apps/plan-my-route`.
- [ ] Run Expo lint and `tsc --noEmit`.
- [ ] Run Biome on changed web TypeScript files.
- [ ] Review `git diff` for deleted Auth.js/Google/custom JWT remnants.
- [ ] Commit each logical change, push, and update PR #14 with setup and SQL execution order.
