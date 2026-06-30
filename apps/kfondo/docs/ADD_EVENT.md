# 대회 기록 반영 가이드 (크롤링 → 정제 → Blob → DB)

K-Fondo에 **이미 등록된 대회**의 새 연도 기록을 넣거나, 신규 대회를 데이터까지 연결할 때의 절차입니다.

> **중요 (2025년 이후 워크플로)**  
> - **이벤트·에디션·코스 메타데이터의 소스 오브 트루스는 Supabase(어드민)** 입니다.  
> - **`events.config.ts`는 더 이상 운영 데이터의 근거가 아닙니다.** (레거시·참고용일 수 있음)  
> - **원본 기록 JSON**과 **정렬된 기록 JSON**은 **Vercel Blob**에 올리고, 에디션에 **공개 URL**을 붙입니다.

---

## 필요한 정보

- 이벤트 **slug** (`/{slug}` URL, 예: `dinosour`) — **Supabase 이벤트 slug와 일치**하는지 확인
- **연도**
- 기록 **제공처**(SPTC / 스마트칩 등)와 해당 시스템의 **이벤트 식별자**(예: SPTC `EVENT_NO`, SmartChip `usedata`)
- (권장) **검증용 BIB 3~5개**와 기대 **총시간** 또는 **DNF 등 Status** — 특히 SmartChip은 HTML 파싱이므로 샘플 검증 필수. 상세는 [크롤링 문서](./events/crawl-records.md) 참고
- (선택) 대회 공식 사이트 URL — 코스·일정 확인용

---

## 작업 순서 개요

단계별 명령·주의사항은 **`docs/events/`** 아래 문서에 나누어 두었습니다. 현재 단계에 맞는 파일만 열면 됩니다.

1. [DB(어드민) 준비](./events/supabase-prep.md) — 이벤트 / 에디션 / 코스, `Event`·코스명 정합
2. [데이터 크롤링](./events/crawl-records.md) — `data/preliminary/{이름}.json`
3. [Event 필드 정제](./events/refine-records.md) — `data/{slug}_{연도}.json`
4. [sorted-msec 생성](./events/sorted-msec.md) — `data/sorted-msec/{slug}_{연도}.json` (KOM 별도 JSON이 있으면 동 문서의 KOM 경로)
5. [Blob 업로드 및 에디션 URL](./events/blob-publish.md) — 일반 기록 + (선택) **KOM Blob과 `--has-kom`** (`blob-publish.md`의 KOM 절 필독)
6. [에디션·코스 마무리](./events/edition-wrap-up.md)
7. [검증 체크리스트](./events/verify-checklist.md)

[단계 목록(표)](./events/README.md) · [로컬 개발 팁](./events/local-dev.md)

---

## AI/에이전트에 시킬 때 예시

허브와 **현재 단계 문서**를 함께 참조합니다.

```text
@docs/ADD_EVENT.md @docs/events/crawl-records.md 기준으로 {대회명} {연도} 기록 수집부터 해줘.
- slug: ...
- 제공처·이벤트 번호: ...
- 검증용 BIB·기대 기록: ...
```

정제·배포까지 포함할 때는 `refine-records.md`, `sorted-msec.md`, `blob-publish.md`를 단계에 맞게 추가합니다. **KOM 구간 기록**이 있으면 `blob-publish.md`의 KOM 절과 **`--has-kom`**을 반드시 포함합니다.

---

## 문서·스킬·자동화

| 방식 | 용도 |
|------|------|
| **이 허브(`ADD_EVENT.md`) + `docs/events/*.md`** | 절차의 단일 근거. 상세는 주제별 파일만 갱신하면 됨 |
| **프로젝트 스킬** `add-new-records` | 통상 **어드민에 에디션·코스가 이미 있는 경우** 기록 수집·정제·배포용 **행동 체크리스트**. slug·제공처·검증 BIB 요청, SmartChip 샘플 검증 등. DB 메타 신규 생성은 [supabase-prep](./events/supabase-prep.md) 참고(스킬 기본 범위 밖) |
| **스크립트** | `bun run publish:edition-records` — Blob 업로드 및 에디션 URL·(선택) 상태 갱신. **KOM** 업로드 시 `--has-kom <course_type>`까지 포함(누락 시 UI에서 KOM 비활성). 시크릿은 `.env.local`에만 둡니다 |
