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

## 스크립트

- `bun run start`: Expo 서버 실행
- `bun run start:debug`: Dev Client 모드 서버 실행
- `bun run ios`: iOS 실행
- `bun run android`: Android 실행
- `bun run lint`: lint 실행
