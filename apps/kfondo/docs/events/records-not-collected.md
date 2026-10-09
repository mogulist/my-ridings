# 기록 수집 제외 상태

`event_editions.status = 'not_collected'`는 대회가 취소된 것이 아니라 해당 연도의 기록을 수집하지 않음을 뜻한다.

- 관리 화면의 개최정보 상태에서 **기록 수집 제외**를 선택한다.
- 홈의 다가오는 대회 및 최근 기록 업데이트에서 제외하고 전체 대회 목록과 이전 연도 기록은 유지한다.
- 상세 페이지의 기록 대기 중 안내를 표시하지 않는다.
- 기록 수집 자동화 대상에서도 제외한다.

## 적용 순서

1. `supabase/migrations/20261009_add_edition_status_not_collected.sql`의 제약조건 변경을 적용한다.
2. 새 상태를 지원하는 앱 코드를 배포한다.
3. 관리 화면에서 양평 2026을 변경하거나 아래 SQL을 실행한다.
4. 캐시를 갱신한다: layout, `event-yangpyeong`, `/yangpyeong` 및 홈. SQL만 실행하면 기존 캐시가 남을 수 있다.

```sql
UPDATE public.event_editions AS ed
SET status = 'not_collected'
FROM public.events AS e
WHERE ed.event_id = e.id
  AND e.slug = 'yangpyeong'
  AND ed.year = 2026
RETURNING ed.id, ed.year, ed.status;
```

기존 JSON/Blob, 코스, 등록 인원은 변경하지 않는다. 수집을 다시 진행할 경우 관리 화면에서 상태를 변경한다.
