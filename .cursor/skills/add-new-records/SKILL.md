---
name: add-new-records
description: >-
  Guides adding new Granfondo-style race records to K-Fondo: crawl preliminary
  JSON, align Event labels to DB course names, generate sorted-msec, publish to
  Blob and edition URLs, optional KOM JSON with --has-kom. Korean triggers: 새로운
  그란폰도 이벤트 대회의 기록을 추가, 대회 기록 수집, 기록 반영, 크롤링, SPTC,
  SmartChip, preliminary, sorted-msec, KOM, has-kom, publish:edition-records,
  revalidate. Use when the user wants to collect or upload records for an edition
  that typically already exists in admin. Follows docs/ADD_EVENT.md; does not
  include creating events/editions from scratch (see docs/events/supabase-prep.md
  separately).
disable-model-invocation: false
---

# 새 대회 기록 추가 (`add-new-records`)

## 전제 (통상)

- **어드민에서 이벤트·에디션·코스는 이미 만들어져 있다**고 가정한다.
- 이 스킬 범위에 **에디션/코스 신규 생성 절차는 넣지 않는다.** 그때는 참고용으로만 `docs/events/supabase-prep.md`를 쓴다.

## 먼저 읽을 문서

- 개요·단계 링크: `docs/ADD_EVENT.md`
- 단계별 상세: `docs/events/` — 크롤부터면 `crawl-records.md`, 정제·sorted·Blob은 각각 해당 파일.
- **`docs/events/supabase-prep.md`는 이 스킬 플로우에 포함하지 않는다.** (메타데이터를 처음부터 만들 때만 별도 참고)

## 작업 시작 시 사용자에게 요청할 것 (순서)

1. **이벤트 slug** — `/{slug}` 및 Supabase에 등록된 slug와 동일한지 확인할 수 있도록 **반드시** 사용자에게 알려 달라고 한다.
2. **데이터 제공처**와 **이벤트 식별자** (SPTC `EVENT_NO`, SmartChip `usedata` 등).
3. **연도** (파일명·에디션 매칭에 필요할 때).
4. **검증용 BIB 3~5개**와 각 **기대 총시간** 또는 **기대 Status**(DNF 등).

## SmartChip(HTML)

- 응답은 JSON이 아니라 HTML이라 레이아웃이 바뀔 수 있다.
- **기존 크롤러**로 위 샘플 BIB만 먼저 수집해(`--bibs` 등) 기대값과 비교하고, 맞으면/틀리면 사용자에게 피드백한다.
- 샘플이 맞지 않으면 사용자와 수집 방법을 맞춘 뒤 `crawlers/` 코드를 수정한다.

## 샘플 통과 후

- **전체** (예: BIB 1~9999) 수집 vs **소량 파일럿**(예: ~100)으로 이상 패턴을 먼저 볼지 **사용자에게 확인**한다.

## 그 다음

`docs/events/`의 정제 → sorted-msec → Blob 순서를 `ADD_EVENT.md` 개요에 따라 진행한다. **DB 코스명과 `Event` 문자열 정합**은 정제·검증 단계 문서를 따른다. 명령어·표는 문서에만 두고 스킬 본문에는 중복하지 않는다.

## KOM 구간 기록 (별도 JSON이 있을 때)

- **수집물 위치**: `data/preliminary/{slug}_{연도}_kom.json` (일반 완주 기록과 동일하게 `Event`·코스명은 DB와 맞출 것 — `docs/events/refine-records.md`·`supabase-prep.md` 참고).
- **sorted-msec**: `docs/events/sorted-msec.md` 대로 생성 스크립트를 돌리면 `data/sorted-msec/{slug}_{연도}_kom.json`이 생긴다.
- **Blob·publish**: `docs/events/blob-publish.md`의 **KOM 기록** 절을 따른다.
- **`--has-kom` 누락 금지**: `publish:edition-records`로 KOM Blob을 올릴 때 **같은 실행에** `--has-kom <course_type>`을 넣는다. `course_type`은 Supabase `courses`의 값과 일치해야 한다(예: `granfondo`). 이걸 빼면 `kom_*_blob_url`만 채워지고 **`courses.has_kom`이 false로 남아** 대회 상세 차트 등에서 KOM 전환이 열리지 않는다. Blob만 먼저 올렸다면 이후에 `--has-kom`만으로도 보정 가능하다.
