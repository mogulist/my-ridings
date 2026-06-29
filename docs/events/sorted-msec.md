# 4. sorted-msec (기록으로 찾기용) 생성

[← 허브로](../ADD_EVENT.md)

```bash
bun run scripts/generate_sorted_msec.ts
```

- 입력: **`data/` 바로 아래**의 `*.json` (하위 폴더 제외, `sorted-msec` 제외)
- 출력: **`data/sorted-msec/{slug}_{연도}.json`**
- **KOM(구간) 별도 JSON**: `data/preliminary/{slug}_{연도}_kom.json` 파일명이 `*_kom.json`인 것만 추가로 읽어, **`data/sorted-msec/`에 동일 파일명**으로 쓴다(예: `preliminary/hongcheon_2025_kom.json` → `sorted-msec/hongcheon_2025_kom.json`).
- **완주자만** (시간 있음, DNF/DNS 제외) 코스별 밀리초 배열을 오름차순으로 넣습니다.

**재생성**: 출력 파일이 이미 있으면 스크립트가 **스킵**합니다. 다시 만들려면 해당 `sorted-msec` 파일을 지운 뒤 다시 실행합니다.

다음: [Blob 업로드 및 에디션 URL](./blob-publish.md)
