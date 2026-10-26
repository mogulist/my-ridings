# Strava 개별 재동기화와 웹훅

## 동작

- 홈의 일반 동기화는 수정 시점과 관계없이 활동 날짜 기준 최근 4주(28일)만 다시 가져온다. 오래된 활동의 자전거 등을 수정했을 때는 홈의 **전체 다시 동기화**로 기간 제한 없이 목록을 갱신하거나, 해당 활동 상세 화면의 **다시 동기화**를 사용한다. 브라우저 새로고침만으로 Strava 데이터를 다시 가져오지는 않는다.

- 활동 목록의 각 항목에 있는 **다시 동기화** 버튼으로 상세 화면 이동 없이 갱신할 수 있다. 완료하면 현재 필터·연도·정렬을 유지한 채 목록과 통계를 다시 읽는다. 변경 후 필터 조건에 맞지 않는 활동은 목록에서 제외된다.
- 활동 상세 화면의 **다시 동기화**는 활동 ID 하나의 최신 상세 정보와 경로·고도 스트림을 가져온다. 다른 활동이나 전체 동기화 시각은 변경하지 않는다.
- 제목·활동 유형·공개 범위 변경 시 Strava 웹훅은 서버에 활동 ID와 무작위 버전만 기록한다. 브라우저는 화면이 보일 때 5초 간격으로 변경 버전을 확인하고, 기존에 가져온 활동만 Strava에서 다시 조회한다. 숨겨진 탭은 멈추고 다시 보일 때 확인한다.
- 활동과 동기화 시각은 공유 DB의 `strava_boost` 스키마에 저장한다. IndexedDB는 활동 상세·스트림 캐시로 유지한다. 앱이 닫힌 동안에는 서버에 변경 알림을 보관하고 다음 접속 때 적용한다. OAuth 토큰은 기존처럼 브라우저에만 저장한다.
- 삭제되었거나 권한 변경으로 Strava 상세 조회가 404를 반환한 활동은 DB 활동과 로컬 활동·스트림을 제거한다. 401/429/서버 오류는 알림을 처리 완료로 표시하지 않고 최대 60초 간격으로 재시도한다.
- 변경 확인 API는 Strava `/athlete`로 사용자를 검증해 1시간짜리 읽기 전용 티켓을 발급한다. 5초마다 Strava 인증 조회를 반복하지 않는다. 테이블은 `service_role`로만 접근하고 조회는 티켓의 사용자 ID로 제한한다.
- 변경 버전은 브라우저별로 기억하므로 여러 기기가 각각 반영한다. 웹훅 재전송이나 순서가 뒤바뀐 알림도 Strava의 현재 값을 조회하므로 과거 값으로 덮어쓰지 않는다.

## 배포 설정

현재 로컬 환경에는 Supabase 설정이 없어 웹훅 자동 반영은 아래 설정 후 활성화된다. 수동 재동기화는 별도 Supabase 설정 없이 사용할 수 있다.

1. [공유 DB 설정](../supabase/README.md)에 따라 plan-my-route 프로젝트에 부스트 스키마를 추가한다. 기존 plan-my-route 테이블·권한·Auth 설정은 유지한다.
2. 서버 환경변수를 설정한다. 서버 키와 비밀값에는 `NEXT_PUBLIC_` 접두사를 붙이지 않는다.

   ```dotenv
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
   STRAVA_CLIENT_SECRET=your-existing-strava-client-secret
   STRAVA_WEBHOOK_BASE_URL=https://your-deployment.example
   STRAVA_WEBHOOK_VERIFY_TOKEN=independent-random-secret
   STRAVA_WEBHOOK_CALLBACK_SECRET=another-independent-random-secret
   # 구독 등록 결과를 받은 뒤 설정
   STRAVA_WEBHOOK_SUBSCRIPTION_ID=12345
   # 서명 헤더를 사용하는 구독의 signing secret이 제공된 경우 반드시 설정
   STRAVA_WEBHOOK_SIGNING_SECRET=your-subscription-signing-secret
   ```

   `STRAVA_WEBHOOK_VERIFY_TOKEN`과 `STRAVA_WEBHOOK_CALLBACK_SECRET`은 각각 `openssl rand -hex 32`로 생성한다. 서명을 사용하지 않는 구독에서는 `STRAVA_WEBHOOK_SIGNING_SECRET`을 생략한다. 콜백 URL의 비밀 query 값이 POST 요청을 보호하며, 서명 비밀값이 설정되면 서명과 5분 이내 타임스탬프도 검증한다. 전체 콜백 URL을 로그나 공개 문서에 기록하지 않는다.

3. 공개 HTTPS 주소로 먼저 배포한다. GET `/api/strava/webhook`은 Strava의 challenge 검증을 처리한다. 앱에서 승인한 OAuth 범위는 기존과 같이 `activity:read_all`이며, 예전에 이 범위를 승인하지 않았다면 Strava 재연결이 필요하다.
4. 위 환경변수를 가진 로컬 환경에서 `bun run webhook:register`를 실행한다. 등록된 다른 콜백이 있으면 자동 삭제하지 않고 중단한다. Strava는 앱당 하나의 구독만 허용한다.
5. 출력된 ID를 `STRAVA_WEBHOOK_SUBSCRIPTION_ID`에 설정하고 재배포한다. 웹훅 DB와 앱을 같은 지역에 배치하고 콜백이 2초 이내에 응답하는지 확인한다. DB 저장에 실패하면 503으로 응답하여 Strava 재전송을 요청한다.

서버의 변경 테이블은 활동마다 한 행을 보관한다. 오프라인 기기의 변경 누락을 막기 위해 임의로 삭제하지 않는다. 신규 활동 자동 가져오기는 이 기능의 범위가 아니며 기존 전체/최근 동기화를 사용한다.

## 검증

- `bun run typecheck`
- `bun test lib/server/ lib/sync-activity.test.ts lib/riding-profile-utils.test.ts`
- `bun run build` (포트 바인딩이 제한된 샌드박스에서는 `bun run build --webpack`)
- 운영 확인: 앱에서 기존 활동을 열고 Strava에서 제목·유형·공개 범위를 각각 바꿔 수 초 후 반영되는지 확인한다. 앱을 닫은 채 수정한 후 다시 열어도 반영되어야 한다. 설명이나 경로를 수정한 경우 **다시 동기화**로 반영한다. 네트워크 오류 후 재시도와 삭제된 활동의 제거도 확인한다.

공식 문서: https://developers.strava.com/docs/webhooks/ 및 https://developers.strava.com/docs/reference/#api-Activities-getActivityById
