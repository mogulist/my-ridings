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

## 통합 화면에서 차례대로 살펴보기

현재 시뮬레이터는 `codex/ultra-validation-final`의 `/terrain-preview`다. 실제 백두대간 플랜이 아니라 30km 합성 경로이며, PR 2·3·4·8의 화면이 함께 보인다. 먼저 여기에서 사용감을 검토한 뒤, 각 PR을 병합하기 직전에 해당 브랜치로 바꿔 변경 범위를 확인하는 순서를 권한다. 통합 화면으로 개별 PR의 독립 동작을 검증했다고 판단하지 않는다.

2026-10-11: 직접 진입했을 때 이전 화면이 없어도 나갈 수 있게 예시 화면 상단에 뒤로가기를 추가했다. 이전 화면이 있으면 뒤로, 없으면 홈으로 이동한다. PR 2와 이를 포함하는 브랜치에 반영했고 시뮬레이터에서 실제로 홈 복귀를 확인했다. 실제 플랜의 지형 화면에는 이미 일정 복귀 처리가 있다.

1. **PR 1 (#28): 계산 기반.** 독립 화면이 없다. 다음 단계에서 평지·낙타등·약내리막·본격 오르막이 구분되는지 함께 확인한다. 테스트와 분석 기준은 PR 설명에서 검토한다. 합성 예시를 실제 대회 경로 정확도의 근거로 삼지 않는다.
2. **PR 2 (#29): 지금 화면의 핵심 안내.** `예시 상태 바꾸기` → `기본` → `오르막 전`을 선택한다. 다음 보급소 CU 강변점까지 14.0km, 다음 오르막 시작까지 4.9km다. `보급소까지`·`오르막 시작까지`·`정상까지`·`오늘 끝까지`를 바꾸며 해당 구간의 거리·획득고도·지형 순서를 확인한다. 시작까지는 평지 3.0km와 낙타등 1.9km이고, 오르막 자체는 약 4.1km·+193m다. 시작까지 필요한 노력과 오르막 자체가 구분되어 읽히는지가 핵심이다. 시간 표시와 하단 고도 그래프는 각각 PR 8·4에서 본다. `보급 없음`에서는 남은 오르막, `둘 다 없음`에서는 오늘 끝까지, `고도 누락`에서는 미확인 구간, `위치 대기`에서는 실시간 위치로 오인하지 않는 안내를 확인한다. 시나리오를 바꾸면 위치 상태는 유지되므로 기준을 비교할 때 `오르막 전`도 다시 선택한다.
3. **PR 3 (#30): 잠금화면.** `기본` + `오르막 전`에서 `잠금화면 예시 시작`을 누르고 시뮬레이터를 잠근다. 작은 화면에서도 보급소와 오르막까지 거리·지형이 읽히는지 확인한다. 앱으로 돌아와 `예시 종료`, `보급 없음`으로 바꾼 뒤 다시 시작해 오르막 안내가 남는지 확인한다. 검토 후 `예시 종료`한다. 예시 배너는 개발용 화면으로 연결되므로 실제 플랜의 잠금화면 탭→같은 플랜 상세 및 로그인 복귀는 별도 확인 대상이다.
4. **PR 4 (#31): 같은 화면 하단 고도 그래프.** `기본` + `오르막 전`으로 돌아와 아래로 스크롤한다. `20km 구간 고도 확대`와 전체 범위를 번갈아 보고 그래프 지점을 누른다. 거리·고도 수치, 현재 위치, 지형 띠를 보고 평지가 내리막처럼 느껴지지 않는지 확인한다. `고도 누락`에서는 빈 구간이 이어진 곡선으로 채워지지 않는지 본다.
5. **PR 5 (#32): `/map-preview`, 네이티브 앱.** 처음 스테이지 2에 맞춰 지도 범위가 잡히는지, 스테이지/전체를 전환하면 경로·마커·화면 범위가 함께 바뀌는지 확인한다. 실제 플랜에서는 스테이지의 `이 스테이지 지도 열기`도 확인한다. 웹 예시는 실제 네이버 지도를 표시하지 않는다.
6. **PR 6 (#33): `/climb-preview`.** 후보의 시작·정상·거리·획득고도를 읽고 이름을 입력하거나 기존 고개를 선택해 등록한다. 후보 감소, 제외와 복원을 확인한다. 예시 저장은 화면 내 모의 처리다. 실제 플랜 등록은 테스트 DB 마이그레이션과 해당 API 실행 후 별도 확인한다.
7. **PR 7 (#34): `/finish-preview`.** GPS 없이 종료 지점을 8km로 입력한다. 오늘 종료점·다음 스테이지 시작점·이동할 보급소를 미리 보고 저장한다. 첫 저장은 의도적으로 실패하므로 오류 안내 후 같은 지점으로 다시 저장해 성공하는지 확인한다. 11km 입력은 허용 범위 밖으로 거부되어야 한다. 실제 DB는 바뀌지 않는다. 이 기능의 범위는 다음 스테이지가 있는 조기 종료점 조정이다.
8. **PR 8 (#35): 다시 `/terrain-preview`.** `기본` + `오르막 전`에서 `예상 시간의 속도 기준 조정`을 연다. 평지 속도를 낮추면 시간이 늘어나는지, 저장한 설정이 다시 열어도 유지되는지, 잘못된 속도가 거부되는지, 기본값 복원이 되는지 확인한다. `고도 누락`은 확정 시간을 표시하지 않아야 한다. 휴식 제외 예상 주행 시간이라는 의미가 명확한지도 본다.

시뮬레이터에서 예시 화면을 직접 여는 명령이다. 실행 중인 development client가 localhost:8090 서버에 연결되어 있어야 한다. 다른 예시 화면에는 아직 공통 검토 메뉴가 없으므로 이 명령으로 이동한다.

```sh
xcrun simctl openurl booted 'planmyrouteapp-dev://terrain-preview'
xcrun simctl openurl booted 'planmyrouteapp-dev://map-preview'
xcrun simctl openurl booted 'planmyrouteapp-dev://climb-preview'
xcrun simctl openurl booted 'planmyrouteapp-dev://finish-preview'
```

웹으로 확인하려면 서버 주소 뒤에 같은 경로를 붙인다. 예: `http://localhost:8090/climb-preview`.

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
