# Stage Memo Feature Design

## Overview

각 스테이지에 메모를 추가하는 기능. StageCard에 1줄 미리보기를 표시하고, 클릭 시 전용 MemoPane이 StagesPane 오른쪽에 슬라이드되어 편집 가능.

## Approach: Inline Preview + Memo Pane (E안)

짧은 메모는 카드에서 바로 확인, 긴 메모는 넓은 전용 패널에서 편집.

## DB Schema

`stage` 테이블에 `memo text` 컬럼 추가.

```sql
ALTER TABLE public.stage ADD COLUMN IF NOT EXISTS memo text;
```

## API

기존 `PUT /api/stages/[id]`의 updatePayload에 `memo` 필드 추가. 새 엔드포인트 불필요.

## Frontend Type

`Stage` 타입에 `memo?: string` 추가. `normalizeDbStages`에서 memo 매핑.

## UI Components

### StageCard 변경

- 카드 하단에 메모 1줄 미리보기 (`line-clamp-1`, 회색 텍스트)
- 메모가 없으면 미리보기 영역 숨김
- 클릭 시 `onMemoClick(stageId)` 호출

### MemoPane (신규)

- `PlanStagesPane`과 동일한 `w-80` 너비
- 상단: 스테이지 번호 + 날짜 라벨 + 닫기 버튼
- 본문: `<textarea>` (flex-1, 스크롤)
- 하단: 저장 버튼 (명시적 저장)
- 저장: `PUT /api/stages/[id]` { memo } 호출

### RouteViewer 레이아웃

- `memoPaneStageId: string | null` state 추가
- memo pane 열림 → `planListCollapsed = true` 자동 축소
- memo pane 닫힘 → `planListCollapsed = false` 복원

레이아웃:

```
[PlanList(축소)] [StagesPane(w-80)] [MemoPane(w-80)] [Map + Elevation]
```

## Data Flow

```
StageCard → onMemoClick(stageId) → RouteViewer.setMemoPaneStageId
                                  → RouteViewer.setPlanListCollapsed(true)
MemoPane → textarea → 저장 버튼 → PUT /api/stages/[id] { memo }
                                → stages 로컬 상태 optimistic update
MemoPane 닫기 → setMemoPaneStageId(null)
              → setPlanListCollapsed(false)
```

## Decisions

- 저장 방식: 저장 버튼 (명시적)
- PlanList 복원: memo pane 닫을 때 자동 복원
