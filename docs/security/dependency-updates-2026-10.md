# 2026-10 의존성 보안 업데이트 검증

두 단계로 업데이트한다. 첫 PR은 Critical, 두 번째 PR은 나머지 수정 가능한 권고를 처리한다. `zod`와 `xlsx`는 업데이트 대상에서 제외한다.

## 보안 감사

`bun audit --json` 결과에서 패키지별 동일 권고 URL을 중복 제거했다. CVE와 GHSA를 함께 포함하며, 실제 배포 환경에서 악용 가능한 취약점 수와는 다르다.

| 상태 | Critical | High | Moderate | Low |
| --- | ---: | ---: | ---: | ---: |
| 업데이트 전 main | 8 | 74 | 73 | 16 |
| Critical 수정 후 | 0 | 53 | 52 | 9 |
| 후속 수정 후 | 0 | 4 | 0 | 0 |

남은 권고:

- `zod` 3.25.76 / 4.3.6: 요청에 따라 유지. [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
- `xlsx` 0.18.5: 요청에 따라 유지. [CVE-2023-30533](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6), [CVE-2024-22363](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9).
- `node-forge` 1.4.0: Expo CLI / 코드 서명 도구의 간접 의존성. 점검 당시 npm 최신 배포도 1.4.0이며 수정판이 없다. [CVE-2026-85393](https://github.com/advisories/GHSA-86w9-cpqp-85rv). 임의의 암호 구현 패치는 추가하지 않는다.

## 간접 의존성 호환성

- `dompurify`, `handlebars`, `shell-quote`는 Critical 수정판을 루트 overrides로 고정한다.
- `esbuild` 0.28.2는 drizzle-kit의 오래된 esbuild-kit 및 tsx가 사용하는 취약 버전을 교체한다. tsx TypeScript 실행과 drizzle-kit 버전 명령을 확인했다. 실제 DB 마이그레이션은 실행하지 않았다.
- `uuid` 11.1.1은 xcode의 uuid 7을 교체한다. xcode가 사용하는 CommonJS v4 기반 프로젝트 ID 생성은 별도 테스트로 확인한다.
- `decode-uri-component` 0.5.0은 ESM이다. 기존 `query-string` 7.1.3의 CommonJS require는 모듈 객체를 함수로 호출하여 실패하므로 `patches/query-string@7.1.3.patch`에서 함수 또는 default export를 선택한다. query-string을 ESM 전용 새 메이저로 교체하지 않는다.
- 이 패치는 `bun install`의 patchedDependencies로 재현된다. 향후 상위 Expo/React Navigation이 호환되는 query-string을 제공하면 override와 패치를 함께 제거할 수 있다.

## 자동 검증 결과

격리된 최신 main에서 업데이트 전후를 동일한 로컬 fixture와 가짜 키로 비교했다. 운영 DB 및 외부 OAuth 계정으로 쓰기 작업을 하지 않았다.

| 검사 | 업데이트 전 | 업데이트 후 |
| --- | --- | --- |
| 공용·웹·모바일 Bun 테스트 | 290개 통과 | 290개 통과 |
| kfondo Playwright i18n | 6개 통과 | 6개 통과 |
| plan-my-route 타입 검사 | 통과 | 통과 |
| strava-boost 타입 검사 | 통과 | 통과 |
| plan-my-route / strava-boost / kfondo 프로덕션 빌드 | 통과 | 통과 |
| kfondo Jest | 8 suite 통과 / 2 suite 실패 | 동일 |
| weather 타입 검사·빌드 | 기존 타입 오류 | 동일 |
| kfondo 타입 검사 | 기존 진단 97건 | 동일 |
| 모바일 타입 검사 | 기존 CSS 선언 오류 | 동일 |
| 모바일 의존성 호환 테스트 | 새로 추가 | 3개 통과 |
| Expo iOS JS/Hermes 번들 생성 | 별도 기준 미측정 | 통과 |

기존 실패 원인:

- weather: `testing-library__jest-dom` 암시적 타입 정의를 찾지 못한다.
- kfondo: 주로 React 타입 간 Key 불일치 등 97개 타입 진단. 빌드의 `ignoreBuildErrors`는 기존 설정이므로 별도 타입 검사를 실행했다.
- 모바일: `animated-icon.module.css` 타입 선언 누락.
- kfondo Jest: participants fixture 기대값 불일치 2개 테스트와 marazone crawler의 import.meta 변환 오류. 통과 30개, 실패 2개이며 crawler suite는 로딩 단계에서 실패한다.

타입 검사 진단 텍스트는 업데이트 전후 동일하다. 통과한 검증 범위에서 새 회귀를 발견하지 않았지만 모든 사용자 흐름의 무회귀를 보장하지는 않는다.

재실행 명령:

```sh
bun install --frozen-lockfile
bun audit --json
bun run test:dependency-compatibility
bun test packages apps/plan-my-route/lib apps/strava-boost/lib apps/weather/lib apps/plan-my-route-app/src
bun run --cwd apps/kfondo test --runInBand
bun run --cwd apps/kfondo test:e2e:i18n --workers=2
# 각 앱: bun run tsc --noEmit --incremental false -p apps/<app>/tsconfig.json
# 각 웹 앱 폴더: 필요한 로컬 테스트 환경값을 설정하고 bun run build
# 모바일 폴더: bun run expo export --platform ios --output-dir /tmp/security-ios-export
```

Node 22.14.0 / Bun 1.3.6으로 테스트했으며, 프로젝트 선언 Bun 1.3.9의 frozen 설치도 변경 없이 재현됨을 별도로 확인했다. 빌드용 가짜 Supabase URL은 `http://127.0.0.1:4319`이고 kfondo fixture 서버는 `bun apps/kfondo/e2e/fixtures/server.mjs`로 실행한다. 필요한 비밀 키 환경값에는 테스트 문자열만 사용한다.

## 미리보기·실기기 확인

병합 전 별도 계정/테스트 데이터로 다음을 확인한다.

- plan-my-route: Supabase 로그인·로그아웃, 경로 조회·지도, 공유 링크, 경로 편집·저장.
- strava-boost: Strava OAuth 복귀, 활동 조회·필터, 테스트 활동 재동기화.
- kfondo: 관리자 로그인, 한국어/영어 URL 전환, 검색·순위 조회, 재검증 액션.
- weather: 기존 타입 문제 해결 후 빌드 및 테스트 환경의 예보 API 응답.
- 모바일: 실제 기기의 OAuth/deep link, 지도, 경로 선택, 개발 메뉴. iOS 번들 생성은 네이티브 빌드·실기기 실행을 대체하지 않는다.

첫 PR을 먼저 병합하고 후속 PR의 base를 main으로 바꿔 독립된 차이를 다시 확인한다.
