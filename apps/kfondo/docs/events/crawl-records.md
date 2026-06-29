# 2. 데이터 크롤링 (통합 크롤러)

[← 허브로](../ADD_EVENT.md)

## 크롤러 실행

```bash
bun run crawler <sptc|smartchip> <출력파일베이스명> <EVENT_NO또는식별자> [시작BIB] [끝BIB] [--period ms]
```

- 출력: **`data/preliminary/{출력파일베이스명}.json`** (예: 베이스명 `dinosour_2026` → `dinosour_2026.json`)
- **SmartChip** 일부 BIB만 검증할 때: `--bibs 573,657,778` (구간 인자는 무시되고 목록만 순회)

### 예시

SPTC, BIB 1~9999:

```bash
bun run crawler sptc dinosour_2026 2026040401 1 9999
```

범위를 좁힌 파일럿 (예: `3000`~`3200`):

```bash
bun run crawler sptc dinosour_2026 2026040401 3000 3200
```

SmartChip, 검증용 BIB만:

```bash
bun run crawler smartchip 춘천배후령_검증 202650000073 --bibs 573,657,778
```

스마트칩 등 다른 타입은 `smartchip`과 해당 `event-id`(예: `usedata`) 규칙을 따릅니다.

---

## 수집 전에 확보할 정보 (운영·에이전트 공통)

1. **이벤트 slug** — 사이트 `/{slug}` 및 Supabase 이벤트와 동일한지 확인한다.
2. **데이터 제공처**와 **이벤트 식별자** — 예: SPTC `EVENT_NO`, SmartChip `usedata` 문자열.
3. **검증용 BIB 3~5개**와 각각의 **기대 총시간**(또는 DNF 등 **기대 Status**). 샘플이 맞으면 파서·총시간 계산 로직을 신뢰할 수 있다.

---

## SmartChip(HTML) 주의

- 응답은 **JSON이 아니라 HTML**이며, 레이아웃이 바뀔 수 있다.
- **먼저** 사용자가 준 샘플 BIB로 기존 크롤러를 돌려 `Time` / `Status` / `Event`가 기대와 맞는지 확인하고, 결과를 사용자에게 피드백한다.
- HTML이 바뀌어 샘플이 틀리면, 사용자와 **새 수집 전략**(엔드포인트·파싱 규칙)을 맞춘 뒤 `crawlers/` 코드를 수정한다.
- (선택) 민감 정보를 제거한 HTML 스냅샷을 레포에 두면 회귀 확인에 유리하다.

---

## 샘플 검증 후 범위 선택

샘플이 통과하면 **사용자에게** 다음 중 하나를 확인한다.

- **전체 구간** (예: BIB `1`~`9999`) 한 번에 수집할지
- **소량 파일럿** (예: 연속 100개 또는 무작위 N개)으로 이상 레이아웃·빈 필드 패턴을 먼저 볼지

API 부하·차단 리스크를 줄이려면 소량 파일럿 후 전체를 권장한다.

다음: [Event 필드 정제](./refine-records.md)
