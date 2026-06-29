# 새 대회 기록 추가

K-Fondo에 이미 등록된 대회의 기록을 수집·정제·배포하는 작업을 안내합니다.
에디션·코스 신규 생성은 이 커맨드 범위 밖입니다 (`docs/events/supabase-prep.md` 참고).

## 시작 시 사용자에게 물어볼 것

아래 정보를 **순서대로** 수집합니다. 한 번에 다 묻지 말고, 답변이 올 때마다 다음 질문으로 넘어가세요.

1. **이벤트 slug** — Supabase에 등록된 slug (`/{slug}` URL과 동일한지 확인 요청)
2. **연도** (예: `2026`)
3. **데이터 제공처** — SPTC / SmartChip / RaceResult / Marazone 중 하나
4. **전체 기록 이벤트 식별자** — SPTC `EVENT_NO`, SmartChip `usedata` 값, RaceResult `event_id` 등
5. **검증용 BIB 3~5개**와 각각의 기대 총시간 또는 기대 Status (DNF 등)
   - SmartChip은 HTML 파싱이라 반드시 샘플 검증 필요
6. **KOM 구간 기록** 여부 및 식별자
   - 대부분의 대회에 KOM 기록이 있으며, SPTC는 KOM을 **별도 EVENT_NO**로 제공
   - KOM이 있으면: KOM 이벤트 식별자 + 검증용 KOM BIB 2~3개와 기대 구간 시간
7. **수집 속도** — 기본 150ms/요청(약 6~7 req/s). 빠르게 하려면 100ms 이하도 가능하나 서버 차단 위험 있음. 변경할지 확인
8. **수집 순서** — 전체 기록을 먼저 배포해 사용자가 빨리 볼 수 있도록 **순차(전체 → KOM)** 할지, 두 크롤러를 **병렬**로 동시에 돌릴지 확인

---

## 작업 흐름

수집한 정보를 바탕으로 아래 단계를 순서대로 진행합니다.
각 단계의 명령·주의사항은 `docs/events/` 아래 파일에 있으니 해당 파일을 읽고 따릅니다.

### 1단계 — 크롤링 (`docs/events/crawl-records.md`)

통합 크롤러로 preliminary JSON 생성:

```bash
bun run crawler <sptc|smartchip> <slug>_<연도> <EVENT_NO 또는 식별자> [시작BIB] [끝BIB] [--period ms]
```

- SmartChip이면 샘플 BIB(`--bibs`) 먼저 돌려 기대값과 비교, 결과를 사용자에게 피드백
- SPTC는 샘플 BIB 범위(예: 검증 BIB 최솟값~최댓값)로 먼저 파일럿 실행 후 기대값과 비교
- 샘플 통과 후 전체 범위(예: 1~9999) 수집
- RaceResult / Marazone은 해당 크롤러(`crawl:raceresult`, `crawl:marazone`) 사용
- 출력: `data/preliminary/{slug}_{연도}.json`

**KOM 수집 (별도 이벤트 식별자가 있는 경우)**

사용자가 선택한 순서에 따라:
- **순차**: 전체 기록 수집 완료 → 정제 → Blob 업로드(사용자에게 결과 확인) → KOM 수집 시작
- **병렬**: 전체 기록과 KOM을 동시에 수집 (두 터미널 또는 background 실행)

KOM 출력 파일은 **반드시** `data/preliminary/{slug}_{연도}_kom.json` 으로 저장:

```bash
bun run crawler sptc <slug>_<연도>_kom <KOM_EVENT_NO> 1 9999 [--period ms]
```

### 2단계 — Event 필드 정제 (`docs/events/refine-records.md`)

- `data/preliminary/...json`의 `Event` 문자열을 DB 코스명과 일치시킴
- 최종 파일: `data/{slug}_{연도}.json`

### 3단계 — sorted-msec 생성 (`docs/events/sorted-msec.md`)

```bash
bun run generate:sorted-msec
```

- 출력: `data/sorted-msec/{slug}_{연도}.json`
- KOM JSON이 있으면 `data/preliminary/{slug}_{연도}_kom.json` → `data/sorted-msec/{slug}_{연도}_kom.json`
- 이미 파일이 있으면 스킵 → 재생성 시 해당 파일 삭제 후 재실행

### 4단계 — Blob 업로드 및 에디션 URL (`docs/events/blob-publish.md`)

```bash
bun run publish:edition-records -- \
  --slug <slug> --year <연도> \
  --records ./data/<slug>_<연도>.json \
  --sorted ./data/sorted-msec/<slug>_<연도>.json \
  --status completed
```

KOM이 있는 경우 **같은 호출 또는 별도 호출에 반드시 `--has-kom` 포함**:

```bash
bun run publish:edition-records -- \
  --slug <slug> --year <연도> \
  --kom-records ./data/preliminary/<slug>_<연도>_kom.json \
  --kom-sorted ./data/sorted-msec/<slug>_<연도>_kom.json \
  --has-kom granfondo
```

> `--has-kom`을 빠뜨리면 `courses.has_kom`이 false로 남아 UI에서 KOM 전환이 열리지 않음

### 5단계 — 에디션·코스 마무리 (`docs/events/edition-wrap-up.md`)

- 에디션 상태 → `completed`
- 코스별 `registered_count` 실제 접수 인원으로 반영
- KOM Blob 올렸다면 해당 코스 `has_kom` 확인

### 6단계 — 검증 (`docs/events/verify-checklist.md`)

- [ ] `data/{slug}_{연도}.json`의 `Event` 값이 DB 코스명과 일치
- [ ] `data/sorted-msec/{slug}_{연도}.json` 생성 완료
- [ ] (KOM) `sorted-msec/{slug}_{연도}_kom.json` 생성 및 Blob 업로드
- [ ] (KOM) 해당 코스 `has_kom` = true
- [ ] Blob 원본·정렬본 업로드 및 에디션 URL 저장
- [ ] 대회 상세: 참가자 추세, 기록 분포, 기록으로 찾기 정상 동작
