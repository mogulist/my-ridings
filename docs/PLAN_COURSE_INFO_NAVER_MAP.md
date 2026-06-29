# 코스 정보 어드민 및 UpcomingSection 플랜 (업데이트)

- **카카오맵 제외**: 네이버맵만 2단계에서 다룸.
- **참고 프로젝트**: [gps-map-tracker](/Users/lim/repos/gps-map-tracker) — 네이버맵에 Strava 경로를 Polyline으로 그려 줌. 경로 데이터는 `[lat, lng][]` 형태로 NaverMap 컴포넌트에 전달.

---

## 1단계: 코스별 링크만 (공식 사이트, Strava, RideWithGPS)

### 목표

- 어드민에서 코스별로 **공식 사이트**, **Strava**, **RideWithGPS** URL만 입력 가능하게 한다.
- 이벤트 상세 페이지 **UpcomingSection**에서 스크린샷처럼 코스 카드 + 공식 사이트 / Strava / RideWithGPS 버튼만 보여 준다.

### 1.1 DB 스키마 (courses)

`courses` 테이블에 nullable 컬럼 추가:

- `official_site_url` (TEXT, nullable)
- `strava_url` (TEXT, nullable)
- `ride_with_gps_url` (TEXT, nullable)

카카오맵·네이버맵·GPX 관련 컬럼은 1단계에서 추가하지 않음.

### 1.2 어드민

- **CourseFormDialog**: 기존 필드(에디션, 코스 타입, 코스명, 거리, 고도, 접수 인원) 아래에 다음 입력 필드 추가.
  - 공식 사이트 URL (optional)
  - Strava URL (optional)
  - RideWithGPS URL (optional)
- zod 스키마 및 Supabase insert/update에 위 필드 포함.
- **CoursesTab** 테이블: 1단계에서는 컬럼 추가 없이 폼만 확장해도 됨 (선택).

### 1.3 타입 및 데이터 매핑

- **lib/database.types.ts**: `courses` Row/Insert/Update에 `official_site_url`, `strava_url`, `ride_with_gps_url` 반영.
- **lib/types.ts**: `RaceCategory`에 optional `officialSiteUrl?`, `stravaUrl?`, `rideWithGpsUrl?` 추가.
- **lib/db/events.ts**: `mapRowToEvent` 내부에서 `edition.courses` → `RaceCategory` 매핑 시 위 필드 포함.

### 1.4 이벤트 상세 UpcomingSection

- **표시 조건**: 최신 연도(`event.years` 중 max)의 `yearDetails[latestYear].courses`가 있으면 "코스 정보" 섹션 렌더.
- **레이아웃**: 제목 "코스 정보" 아래, 코스 카드 가로 배치(그리드/flex). 각 카드:
  - 코스명 + 거리 (예: "그란폰도 (130km)")
  - 버튼 3개: **공식 사이트**, **Strava**, **RideWithGPS**
- **버튼 동작**:
  - URL이 있으면: 새 탭으로 해당 URL 열기.
  - URL이 없으면: 버튼은 보이되 **비활성화** (회색, 클릭 불가).
- **스타일**: 스크린샷과 같이 pill 형태, 플랫폼별 색상(공식 사이트 회색, Strava 주황, RideWithGPS 파랑), 흰색 텍스트 + 외부 링크 아이콘.

---

## 2단계: 네이버맵 (경로 업로드 + 새 탭에서 경로 표시)

### 목표

- 어드민에서 코스별 **경로 파일 업로드** (GPX 등).
- 이벤트 상세 **UpcomingSection** 코스 정보에 **네이버맵** 버튼 추가.
- 네이버맵 버튼 클릭 시 **새 탭**에서 **넓은 화면**으로 해당 코스 경로를 네이버맵 위에 Polyline으로 표시.
- 사용자가 네이버맵에서 **줌인/줌아웃**하며 경로를 살펴볼 수 있게 한다.

### 2.1 gps-map-tracker 참고 사항

- **NaverMap 컴포넌트** (`gps-map-tracker/src/components/NaverMap.tsx`):
  - `polylines`: `[number, number][][]` — 경로별 좌표 배열. 각 경로는 `[lat, lng][]`.
  - Naver Maps API: `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}` 로드.
  - `maps.Polyline({ path: latlngs, map, strokeColor, strokeWeight })` 로 선 그리기.
  - 경로가 있으면 `fitBounds`로 전체 경로가 보이게 조정.
  - 줌 인/아웃 버튼 제공.
- **타입**: `gps-map-tracker/src/types/naver-maps.d.ts` — `window.naver.maps`, `LatLng`, `LatLngBounds`, `Polyline`, `Marker` 등.

fondo-scope에서는 **GPX 업로드 → 좌표 추출 → [lat, lng][] 형태로 저장 또는 API에서 반환** 후, 전용 지도 페이지에서 NaverMap에 전달하는 흐름이 필요함.

### 2.2 DB 스키마 (courses, 2단계)

- `gpx_blob_url` (TEXT, nullable) — Vercel Blob에 업로드한 GPX 파일 URL.
- 또는 경로만 쓸 경우: 업로드 시 GPX를 파싱해 **폴리라인 좌표를 JSON으로 저장**할 컬럼(예: `route_geojson` 또는 `route_latlngs` TEXT)을 둘 수 있음. 네이버맵은 `[lat, lng][]`만 있으면 되므로, GPX URL만 저장하고 **지도 페이지에서 GPX fetch 후 클라이언트 파싱**도 가능.

### 2.3 어드민 (2단계)

- **CourseFormDialog**에 추가:
  - **경로 파일 업로드**: GPX 파일 선택 → API로 전송 → Vercel Blob에 저장 → 반환 URL을 `gpx_blob_url`에 저장.
  - (선택) 업로드된 파일이 있으면 "현재 경로 있음" 표시 및 교체/삭제.
- **API**: `app/api/courses/gpx-upload/route.ts` (또는 동일한 역할의 경로). POST, multipart/form-data 등으로 GPX 수신 → `@vercel/blob` `put()` → URL 반환. 어드민 인증 적용.

### 2.4 이벤트 상세 UpcomingSection (2단계)

- 코스 카드 버튼에 **네이버맵** 추가 (공식 사이트, Strava, RideWithGPS 옆 또는 아래).
- 해당 코스에 `gpx_blob_url`(또는 저장된 경로 데이터)이 있을 때만 네이버맵 버튼 **활성화**, 없으면 비활성화.

### 2.5 네이버맵 전용 페이지 (새 탭, 넓은 화면)

- **경로**: 예: `/[event]/course/[courseId]/map` 또는 `/[event]/map/[courseId]` (쿼리로 연도 지정 가능).
- **역할**:
  - URL에서 event slug, courseId(및 필요 시 year)를 받아 해당 코스의 경로 데이터 조회.
  - 경로 데이터: `gpx_blob_url`이 있으면 해당 URL에서 GPX fetch 후 **클라이언트에서 파싱**해 `[lat, lng][]` 배열 생성. (또는 서버/API에서 파싱해 JSON으로 전달.)
  - **NaverMap** 컴포넌트를 **전체 화면에 가깝게** 렌더 (width/height 100% 또는 고정 큰 영역).
  - NaverMap에 `polylines={[parsedPath]}` 전달하고, 경로가 있으면 `fitBounds`로 전체가 보이게 (gps-map-tracker와 동일).
  - 줌 인/줌 아웃은 gps-map-tracker의 NaverMap처럼 버튼 또는 지도 컨트롤로 제공.
- **진입**: UpcomingSection의 "네이버맵" 버튼이 이 페이지로의 링크 (`target="_blank"`).

### 2.6 네이버맵 API 설정

- [Naver Cloud Platform](https://www.ncloud.com/) Maps 사용 설정 후 Client ID 발급.
- fondo-scope에 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` 환경 변수 설정.
- 지도 페이지에서 gps-map-tracker와 동일하게 스크립트 로드:  
  `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`

### 2.7 GPX 파싱

- **클라이언트**: GPX URL을 fetch한 뒤 `<trkpt lat="..." lon="...">` 등을 파싱해 `[lat, lng][]` 배열 생성. (또는 `xml2js` / 브라우저 DOMParser 등 사용.)
- **서버**: 업로드 시 또는 API에서 GPX를 파싱해 JSON으로 저장해 두고, 지도 페이지는 JSON만 fetch해도 됨. 구현 선택 사항.

---

## 파일 변경 요약

| 단계 | 대상 | 변경 내용 |
|------|------|-----------|
| 1단계 | DB (courses) | official_site_url, strava_url, ride_with_gps_url 추가 |
| 1단계 | lib/database.types.ts | courses 타입에 위 3컬럼 반영 |
| 1단계 | lib/types.ts | RaceCategory에 officialSiteUrl?, stravaUrl?, rideWithGpsUrl? |
| 1단계 | lib/db/events.ts | mapRowToEvent에서 courses 매핑 시 위 필드 포함 |
| 1단계 | course-form-dialog.tsx | 공식 사이트 / Strava / RideWithGPS URL 입력 필드 추가 |
| 1단계 | UpcomingSection.tsx | 코스 정보 섹션, 카드 + 3버튼(없으면 비활성화), 스크린샷 디자인 |
| 2단계 | DB (courses) | gpx_blob_url (및 필요 시 경로 JSON 컬럼) 추가 |
| 2단계 | API (gpx-upload) | GPX 파일 받아 Vercel Blob put, URL 반환 |
| 2단계 | course-form-dialog.tsx | 경로(GPX) 업로드 UI |
| 2단계 | UpcomingSection.tsx | 네이버맵 버튼 추가 (경로 있으면 활성화) |
| 2단계 | 지도 전용 페이지 | /[event]/course/[courseId]/map 등, NaverMap + polylines + fitBounds + 줌 |
| 2단계 | NaverMap 컴포넌트 | gps-map-tracker 참고해 fondo-scope에 구현 또는 유사 컴포넌트 사용 |
| 2단계 | 환경 변수 | NEXT_PUBLIC_NAVER_MAP_CLIENT_ID |

---

## 정리

- **카카오맵**: 제외. DB/UI/플랜에 포함하지 않음.
- **1단계**: 코스별 공식 사이트, Strava, RideWithGPS만 어드민 입력 + UpcomingSection에 스크린샷처럼 표시.
- **2단계**: 어드민에 경로(GPX) 업로드, UpcomingSection에 네이버맵 버튼, 클릭 시 새 탭에서 넓은 화면의 네이버맵에 경로 Polyline 표시, 줌인/줌아웃 가능. 네이버맵 구현은 gps-map-tracker 프로젝트 참고.
