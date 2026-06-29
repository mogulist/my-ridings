# 5. Vercel Blob 업로드 및 에디션 URL

[← 허브로](../ADD_EVENT.md)

원본·정렬 JSON은 **Vercel Blob**에 올리고, `event_editions`의 `records_blob_url` / `sorted_records_blob_url`에 반영합니다. Blob 객체 경로 접두어는 보통 `records/` · `sorted-records/` 입니다(업로드 시 자동 생성).

## 방법 A — 어드민 UI (권장: 수동 검토)

1. 어드민 **이벤트 상세 → 개최정보**에서 해당 연도 에디션 **수정**을 엽니다.
2. **원본 기록 JSON** / **정렬 기록 JSON** 파일을 선택해 저장합니다.
   - 내부적으로 `POST /api/admin/event-editions/[editionId]/records-upload`가 Blob에 올린 뒤 에디션 URL을 갱신합니다. (관리자 로그인·`admin_whitelist` 필요)

## 방법 B — CLI (원격·자동화)

`.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BLOB_READ_WRITE_TOKEN`을 두고:

```bash
bun run publish:edition-records -- \
  --slug <이벤트 slug> --year <연도> \
  --records ./data/<slug>_<연도>.json \
  --sorted ./data/sorted-msec/<slug>_<연도>.json \
  --status completed
```

또는 에디션 UUID를 이미 알면 `--edition-id <uuid>` 만으로 지정할 수 있습니다. 상세·주의사항은 [`docs/PLAN_CLI_RECORDS_UPLOAD.md`](../PLAN_CLI_RECORDS_UPLOAD.md)를 참고합니다.

| 구분        | Blob 경로 접두(예)       | 에디션 컬럼               |
|-------------|--------------------------|---------------------------|
| 원본 기록   | `records/...json`        | `records_blob_url`        |
| 정렬된 기록 | `sorted-records/...json` | `sorted_records_blob_url` |

- **원본**이 있어야 참가자 수 집계·추세 차트 등이 동작합니다. 정렬본만 있으면 일부 기능이 비거나 제한됩니다.
- 서비스 롤 키는 RLS를 우회하므로 **저장소·본인 머신에서만** 사용하고 커밋하지 않습니다.

## KOM 기록 (구간 타임, 선택)

KOM이 **일반 완주 기록 JSON과 별도 파일**인 경우에만 해당합니다. 원본은 보통 `data/preliminary/{slug}_{연도}_kom.json`에 두고, [sorted-msec](./sorted-msec.md) 단계에서 `data/sorted-msec/{slug}_{연도}_kom.json`을 생성합니다.

| 구분 | Blob 경로 접두(예) | 에디션 컬럼 |
|------|---------------------|-------------|
| KOM 원본 | `kom-records/...` | `kom_records_blob_url` |
| KOM 정렬 | `kom-sorted-records/...` | `kom_sorted_records_blob_url` |

CLI 예시(같은 에디션에 일반 기록을 함께 올릴 수도 있음):

```bash
bun run publish:edition-records -- \
  --slug <이벤트 slug> --year <연도> \
  --kom-records ./data/preliminary/<slug>_<연도>_kom.json \
  --kom-sorted ./data/sorted-msec/<slug>_<연도>_kom.json \
  --has-kom granfondo
```

### `--has-kom`은 KOM을 UI에서 쓰려면 사실상 필수

`--has-kom`은 Blob이 아니라 **`courses` 행의 `has_kom`**을 `true`로 바꿉니다. 인자는 Supabase **`courses.course_type`**과 정확히 같아야 합니다(여러 코스면 콤마로 나열: `granfondo,mediofondo`).

에디션에 `kom_records_blob_url`만 있고 **`has_kom`이 false인 코스**는, 대회 상세의 분포 차트 등에서 **KOM 범위 전환이 열리지 않습니다**(앱이 Blob 존재와 `hasKom`을 함께 검사함).

- KOM Blob 업로드와 **같은 `publish` 호출에 `--has-kom`을 포함**하는 것을 기본으로 한다.
- 실수로 빠졌다면, 같은 `--slug` / `--year`(또는 `--edition-id`)로 **`--has-kom granfondo`만** 다시 실행해 보정할 수 있다.

다음: [에디션·코스 마무리](./edition-wrap-up.md)
