# Plan My Route Mobile

`plan-my-route`의 **iOS 우선** 모바일 앱(Expo **Development Build**). Expo Go는 사용하지 않습니다.

## Kakao Map feasibility (2025-04 기준 `@react-native-kakao/map@2.2.7`)

| 항목 | 결과 | 비고 |
|------|------|------|
| 지도 표시 + 카메라(줌 레벨) 제어 | **PASS (예상)** | `KakaoMapView` + `camera.zoomLevel` 갱신, `KakaoMap.initializeKakaoMapSDK` |
| 줌 인/아웃 | **PASS (예상)** | 화면의 Zoom ± 버튼으로 `zoomLevel` 변경 |
| 라우트 Polyline | **FAIL** | 패키지 iOS 네이티브(`RNCKakaoMapView.mm`)에 경로/폴리라인 레이어 바인딩 없음, JS API 없음 |
| 커스텀 마커 | **FAIL** | 동일 이유로 JS/API 미제공 |

**후속 권고:** 라이딩 경로·POI 오버레이가 필수면 (1) `@react-native-kakao/map` 포크/네이티브 확장, (2) 다른 지도 SDK, (3) 지도만 WebView(Kakao JS) 등 **별도 스파이크**가 필요합니다. 본 앱은 네이티브 전용 스파이크 조건을 따랐으며, 위 FAIL은 **라이브러리 스코프 한계**입니다.

## 사전 요구

- Xcode / CocoaPods (iOS)
- [Kakao Developers](https://developers.kakao.com/) 네이티브 앱 키
- iOS 번들 ID: `com.myridings.planmyroute.mobile` (Kakao 콘솔에 플랫폼 등록)

## 환경 변수

앱 디렉터리 또는 모노레포 루트에 `.env`를 두고 다음을 설정합니다.

```bash
cp .env.example .env
# KAKAO_NATIVE_APP_KEY=...
```

`KAKAO_NATIVE_APP_KEY`가 있을 때만 `app.config.ts`의 `@react-native-kakao/core` config plugin이 iOS URL scheme 등을 주입합니다. 키 없이는 네이티브 연동 prebuild가 불완전할 수 있습니다.

## 설치

모노레포 루트에서:

```bash
bun install
```

## iOS Development Build

```bash
cd apps/plan-my-route-mobile
npx expo prebuild --platform ios
npx expo run:ios
```

번들러(Metro):

```bash
cd apps/plan-my-route-mobile
bun run dev
```

## 모노레포에서 필터 실행

```bash
bun --filter @my-ridings/plan-my-route-mobile dev
```

## 제약

- `@react-native-kakao/map`는 **New Architecture(Fabric)** 만 지원합니다. `app.config.ts`의 `newArchEnabled: true`를 유지하세요.
