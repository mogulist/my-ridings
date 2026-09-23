# Plan My Route App (Expo)

`apps/plan-my-route-app`는 `plan-my-route` 웹 API와 연동되는 Expo 앱입니다.  
Supabase GitHub Auth, 세션 저장(`expo-secure-store`), 네이버 지도 연동을 포함합니다.

## 요구사항

- Node.js 20+
- Xcode (iOS 시뮬레이터) 또는 Android Studio (Android 에뮬레이터)
- 실제 기기 테스트 시 iOS/Android 개발자 서명 환경
- Expo/EAS 계정 로그인 (`bunx expo login`, `bunx eas login`)

## 1) 환경변수 설정

`apps/plan-my-route-app/.env.local` 파일을 만들고 아래 값을 설정합니다.

```bash
EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN=https://plan-my-route.vercel.app
EXPO_PUBLIC_SUPABASE_URL=https://frcpzyokxrztvlemzmhk.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
EXPO_PUBLIC_NAVER_MAP_CLIENT_ID=...
```

중요:

- Supabase Auth의 Redirect URLs에 `planmyrouteapp://auth/callback`과 `planmyrouteapp-dev://auth/callback`을 등록합니다.
- GitHub OAuth App의 Authorized callback URL은 Supabase가 안내하는 `https://frcpzyokxrztvlemzmhk.supabase.co/auth/v1/callback`을 사용합니다.
- publishable key는 클라이언트 공개용 키이며 service role 또는 secret key를 앱에 넣으면 안 됩니다.
- `.env.local` 수정 후에는 Metro/앱을 완전히 재시작해야 반영됩니다.

## 2) 의존성 설치

저장소 루트에서:

```bash
bun install
```

## 3) 로컬 시뮬레이터 실행

앱 폴더로 이동:

```bash
cd apps/plan-my-route-app
```

네이티브 설정 꼬임/빌드 캐시 이슈가 있으면 먼저 prebuild를 초기화합니다.

```bash
bunx expo prebuild --clean
```

### iOS 시뮬레이터

```bash
bun run ios
```

### Android 에뮬레이터

```bash
bun run android
```

## 4) 실제 기기 실행

이 프로젝트는 네이티브 모듈을 사용하므로 `Expo Go` 대신 **Development Build** 사용을 권장합니다.

### A. EAS 클라우드 빌드 사용

```bash
cd apps/plan-my-route-app
bun run build:debug:ios
bun run build:debug:android
```

빌드 결과(설치 링크/QR)로 기기에 설치 후:

```bash
bun run start:debug
```

`start:debug`는 개발 앱 전용 스킴(`planmyrouteapp-dev`)을 사용합니다.
기존 앱이 함께 설치되어 있어도 Metro의 실행 링크는 `(Dev)` 앱을 엽니다.

`@expo/ui`, `expo-widgets`, AsyncStorage 등 네이티브 패키지를 추가하거나
업데이트했다면 **Metro 재시작만으로는 반영되지 않습니다.** 시뮬레이터와
iPhone 각각 새 Development Build를 설치한 뒤 Metro에 연결하세요.
`Cannot find native module` 오류가 나면 실행 중인 앱의 빌드부터 확인합니다.

시뮬레이터용 개발 앱을 다시 만들 때:

```bash
APP_VARIANT=development bunx expo prebuild --platform ios
APP_VARIANT=development bunx expo run:ios --no-bundler
bun run start:debug
```

### B. 로컬 빌드 사용(선택)

```bash
cd apps/plan-my-route-app
bun run build:debug:ios:local
bun run build:debug:android:local
```

## 5) OAuth 동작 확인 체크리스트

- 로그인 화면에서 GitHub 로그인을 시작합니다.
- 인증 후 앱으로 돌아와 Home 화면이 표시되는지 확인합니다.
- 앱을 재시작해도 로그인 상태가 유지되는지 확인합니다.
- 설정 화면에서 로그아웃 후 로그인 화면으로 이동하는지 확인합니다.

## 라이딩 실시간 현황 (iOS)

- 플랜 목록에서 **라이딩 시작**을 누르면 실제 등록된 편의점·마트 중 현재 스테이지의
  미방문 보급소 3곳을 경로 순서로 표시합니다. 방문·제외 상태와 명시적 스테이지 배정을 반영합니다.
- 위치 권한은 **앱을 사용하는 동안 허용**, 이후 **항상 허용**을 선택해야 잠금 중에도
  자동 갱신됩니다. 거부한 경우 스테이지 화면의 **잠금화면 보급정보 → iPhone 설정**에서 변경합니다.
- 거리와 획득고도는 GPS를 경로에 투영한 지점부터의 값입니다. 경로에서 장소까지의 우회 구간은
  포함하지 않습니다. 경로에서 300m 이상 이탈하거나 GPS가 부정확하면 수치 대신 안내를 표시합니다.
- 처음 받은 경로와 보급소는 로컬에 저장하여 오프라인 위치 갱신에 사용합니다.
  서버에서 수정한 POI는 플랜 데이터를 다시 받을 때 반영됩니다.
- 홈의 **라이딩 종료** 또는 로그아웃은 위치 추적과 실시간 현황을 종료합니다.
  **여기서 스테이지 종료**는 현재 실시간 현황을 일시 정지합니다. 다음 라이딩 전에 **다시 시작**을 누릅니다.
- iOS의 활동당 8시간 제한 때문에 장시간 라이딩 중에는 휴식할 때 앱을 열어 주세요.
  시작 후 7시간이 지난 활동은 앱이 활성화되어 있을 때 교체합니다. 잠금 상태에서 만료된 활동을
  새로 시작할 수는 없습니다. 앱을 강제 종료하면 위치 갱신도 중단됩니다.
- 잠금화면의 갱신 시각을 확인하세요. GPS 수신이나 OS의 백그라운드 실행이 끊기면 마지막 표시가
  남을 수 있습니다. 실제 기기의 배터리 사용량·장시간 GPS 동작은 실주행으로 확인해야 합니다.
- 실험실의 목 라이딩은 별도 PoC입니다. 실행하면 실제 라이딩 실시간 현황을 일시 정지합니다.
- `expo-task-manager`와 iOS background location 설정이 추가되어 **새 네이티브 빌드가 필요**합니다.
  1.0.1 빌드 14에는 이 연결이 없습니다. 런타임을 1.0.2로 분리해 구버전에 OTA로 전달되지 않게 합니다.

검증 명령: `bun test`, `bun run lint`, `bunx tsc --noEmit`.
수명주기 테스트는 네이티브 경계를 대체하며, 잠금 중 업데이트·권한 거부·종료·중복 생성·복원을 확인합니다.
실제 iOS에서는 라이딩 시작 → GPS 이동 → 화면 잠금 → 보급소 통과 → 잠금 해제 → 라이딩 종료를 확인합니다.

개발 빌드는 로그인 없이 **잠금화면 PoC → GPS 검증 시작**으로 실제 위치 추적 경로를 검증할 수 있습니다.
가상 경로만 로컬에 주입하며 서버 데이터는 수정하지 않습니다. 시뮬레이터 위치를 `37,127.01`부터
`37,127.019` → `37,127.028` → `37,127.032`로 이동하면 거리 감소와 첫 보급소 통과를 확인합니다.
검증 후 **GPS 검증 종료**를 누릅니다. 이 기능은 프로덕션에 표시되지 않습니다.

## 스크립트

- `bun run start`: Expo 서버 실행
- `bun run start:debug`: Dev Client 모드 서버 실행
- `bun run ios`: iOS 실행
- `bun run android`: Android 실행
- `bun run lint`: lint 실행
