# Scripts 사용법

## 1. 사전 준비

- bun이 설치되어 있어야 합니다.
- (권장) 프로젝트 루트에서 `bun install`로 의존성 설치 (dayjs 등)

## 2. 기록 데이터 변환 스크립트 실행

### 목적

- `/data` 폴더 내 원본 json 파일을 코스별 msec 오름차순 배열로 변환하여 `/data/sorted-msec` 폴더에 저장합니다.
- 이미 변환된 파일이 있으면 건너뜁니다.

### 실행 방법

```sh
# 프로젝트 루트에서 실행
bun run scripts/generate_sorted_msec.ts
```

- 또는, ts-node가 전역 설치되어 있다면:

```sh
bun run scripts/generate_sorted_msec.ts
```

- 또는, 빌드 후 node로 실행:

```sh
tsc scripts/generate_sorted_msec.ts && node scripts/generate_sorted_msec.js
```

### 동작 설명

- `/data/*.json` 파일을 순회하며, `/data/sorted-msec/${eventId}_${year}.json` 파일이 없으면 생성합니다.
- 각 파일에는 코스별로 완주자 기록(msec)이 오름차순 배열로 저장됩니다.
- 변환/스킵된 파일은 콘솔에 로그로 출력됩니다.

### 예시 결과 파일

```json
{
  "granfondo": [12345678, 12345789, ...],
  "mediofondo": [23456789, ...],
  "otherCourse": [ ... ]
}
```
