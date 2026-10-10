# 울트라 로드 실사용 개선 — PR 검토·실행 안내

작성일: 2026-10-10. 사용자 승인에 따라 순차 개발·검증·PR 생성을 완료했다. GitHub PR은 모두 열린 상태이며 병합하지 않았다.

| 순서 | PR | 브랜치 | 기반 |
|---|---|---|---|
| 1 | [#28 지형 분석·이름 없는 오르막 탐지](https://github.com/mogulist/my-ridings/pull/28) | `codex/ultra-terrain` | main |
| 2 | [#29 앱 상세·직접 진입](https://github.com/mogulist/my-ridings/pull/29) | `codex/ultra-ride-detail` | PR 1 |
| 3 | [#30 잠금화면 지형·오르막 안내](https://github.com/mogulist/my-ridings/pull/30) | `codex/ultra-lock-terrain` | PR 2 |
| 4 | [#31 스테이지 고도프로필](https://github.com/mogulist/my-ridings/pull/31) | `codex/ultra-elevation` | PR 3 |
| 5 | [#32 스테이지 지도](https://github.com/mogulist/my-ridings/pull/32) | `codex/ultra-stage-map-view` | main, 독립 |
| 6 | [#33 오르막 스캔·고개 등록 추천](https://github.com/mogulist/my-ridings/pull/33) | `codex/ultra-climb-recommend` | PR 4 |
| 7 | [#34 GPS 없이 종료 지점 지정](https://github.com/mogulist/my-ridings/pull/34) | `codex/ultra-stage-recovery` | main, 독립 |
| 8 | [#35 지형별 예상 주행 시간](https://github.com/mogulist/my-ridings/pull/35) | `codex/ultra-terrain-time` | PR 2 |

의존하는 브랜치에는 선행 PR 코드가 포함된다. PR 5·7은 각각 독립 실행할 수 있다. PR 8만 체크아웃하면 PR 3·4·5·6·7의 기능은 포함되지 않는다. 모든 변경을 결합한 `codex/ultra-validation-final`은 한꺼번에 실행하는 검증용 브랜치이며, main으로 병합하지 않았다.

## 실행

브랜치를 가져와 선택한 다음 저장소 루트에서 의존성을 준비하고 모바일 앱 폴더에서 실행한다. 기존 Expo development build를 사용한다.

```sh
git fetch origin
git switch --track origin/codex/ultra-ride-detail
bun install
cd apps/plan-my-route-app
APP_VARIANT=development bunx expo start --dev-client --web --port 8090
```

이미 로컬 브랜치가 있으면 `git switch <브랜치>`를 쓴다. 시뮬레이터에서 development client로 서버에 연결한다. 웹 예시는 `http://localhost:8090/terrain-preview`에 접속한다. 실제 플랜은 로그인과 해당 브랜치의 API가 필요하다. API를 로컬에서 실행하면 앱의 `EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN`을 해당 서버 주소로 지정한다. 예시 화면은 개발 빌드에서만 표시된다.

| 개발 예시 | 포함 브랜치 | 재현 내용 |
|---|---|---|
| `/terrain-preview` | PR 2 및 의존 브랜치 | 보급소/오르막 유무, 오르막 전·중·후, 위치 대기, 고도 누락. PR 3 이후에는 실제 예시 Live Activity 시작/종료. PR 4 이후에는 고도 확대·지점 선택. PR 8에는 시간·속도 설정 |
| `/map-preview` | PR 5 | 가상 3스테이지의 실제 네이버 지도. 스테이지 2 기본 범위와 전체 전환 |
| `/climb-preview` | PR 6 | 후보 검토·이름 입력·기존 고개 선택·등록 후 후보 감소·제외/복원. 저장은 화면 내 모의 처리 |
| `/finish-preview` | PR 7 | GPS 없음·거리 지정·변경 미리보기·첫 저장 실패·재시도 성공. 실제 DB 변경 없음 |

## DB 적용 항목

실제 등록·종료 저장을 테스트하려면 테스트 DB에 각각 적용해야 한다. 운영 DB에는 적용하지 않았다.

- PR 6: `supabase-migration-plan-climbs.sql`. 새 고개 이름/기존 고개 참조를 플랜에 저장한다. 전역 공식 고개 카탈로그를 수정하지 않는다. 추천 제외는 기기에 저장하며 라이딩 지형 안내를 지우지 않는다.
- PR 7: `supabase-migration-stage-finish-atomic.sql`. 두 스테이지 경계·POI 이동·재시도 결과를 같은 트랜잭션에 저장한다. 다음 스테이지가 있는 **조기 종료점 조정**이다. 계획 종료점 이후 연장·마지막 스테이지 완료 기록은 포함하지 않는다.

DB 검증 스크립트는 임시로 설치한 [PGlite](https://pglite.dev/docs/) 0.5.8을 사용하며 제품 의존성은 추가하지 않았다. 웹 앱 폴더에서 다음처럼 실행한다.

```sh
mkdir -p /tmp/ultra-pg-validation
bun add --cwd /tmp/ultra-pg-validation @electric-sql/pglite@0.5.8
PGLITE_MODULE_PATH=/tmp/ultra-pg-validation/node_modules/@electric-sql/pglite/dist/index.js bun scripts/verify-plan-climbs.ts
PGLITE_MODULE_PATH=/tmp/ultra-pg-validation/node_modules/@electric-sql/pglite/dist/index.js bun scripts/verify-stage-finish-atomic.ts
```

## 확인한 결과와 남은 검증

- 모든 최신 PR을 로컬에서 충돌 없이 결합했다. 공용 계산 31개, 모바일 74개, 서버 83개 테스트가 통과했다. 세 프로젝트의 TypeScript 검사와 diff check도 통과했다.
- Expo 서버를 실행해 iPhone 17 Pro 시뮬레이터에서 앱 상세·실제 Live Activity 배너·실제 네이버 지도·고도 확대·고개 연결 입력/예시 등록·종료 미리보기/예시 재시도·시간 설정을 확인했다.
- 390px 웹에서 상태별 표시, 고도 지점 선택/확대, 추천 등록/제외/복원, 종료 오류/재시도, 속도 오류/저장/새로고침 유지, 기본값 복원, 고도 누락을 확인했다. 라이트/다크와 웹 글자 크기 1.4배에서 가로 넘침이 없었다. 이것은 네이티브 큰 글자 검증을 대신하지 않는다.
- 분리된 PostgreSQL에서 두 마이그레이션을 실제 실행했다. 고개 등록의 동일 행 재시도·제약·권한을 확인했다. 종료 저장은 두 경계와 POI, 강제 실패 후 전체 롤백, 같은 요청 재시도, 오래된 경계/POI/다른 소유자 거부, 미확인 고도 null 저장, 일반 인증 역할의 RPC 실행 거부를 확인했다.
- 실제 백두대간 GPX와 개인 주행 속도 교정, 운영 Supabase 저장, 여러 DB 연결의 동시 요청, 실기기 GPS/배터리·큰 글자, 앱 종료 상태의 잠금화면 탭→로그인→같은 플랜 상세 복귀는 사용자 기기에서 추가 확인해야 한다. 합성 데이터와 네이티브 경계 모의 테스트를 실제 대회 검증으로 표현하지 않았다.

예상 시간 초기값은 평지 22 / 약내리막 25 / 내리막 28 / 낙타등 18 / 완만한 오르막·본격 오르막 각각 10km/h이며 앱에서 조정한다. 지형별 거리÷속도의 합이고 휴식·바람·피로를 반영한 도착 시각은 아니다. 고도 미확인 구간은 시간을 확정하지 않는다.

각 PR 설명에는 개별 검증 범위·실행 절차와 iOS 스크린샷을 첨부했다. 순서대로 브랜치를 실행해 확인하고 사용자가 직접 병합한다.
