# Stage Memo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 각 스테이지에 메모 기능을 추가하여, StageCard에 1줄 미리보기를 표시하고 별도 MemoPane에서 편집할 수 있게 한다.

**Architecture:** stage 테이블에 memo 컬럼 추가 → 기존 PUT API에 memo 필드 추가 → Stage 타입 확장 → StageCard에 미리보기 → MemoPane 신규 컴포넌트 → RouteViewer에서 pane 상태 관리

**Tech Stack:** Next.js Pages Router, React, Supabase, Tailwind CSS, lucide-react

---

### Task 1: DB 스키마 — memo 컬럼 추가

**Files:**
- Create: `apps/plan-my-route/supabase-migration-stage-memo.sql`

**Step 1: 마이그레이션 SQL 작성**

```sql
ALTER TABLE public.stage ADD COLUMN IF NOT EXISTS memo text;
```

**Step 2: Supabase에서 실행**

Supabase dashboard SQL editor에서 실행.

**Step 3: Commit**

```bash
git add apps/plan-my-route/supabase-migration-stage-memo.sql
git commit -m "feat: add memo column to stage table"
```

---

### Task 2: API — PUT /api/stages/[id]에 memo 필드 추가

**Files:**
- Modify: `apps/plan-my-route/app/api/stages/[id]/route.ts:17-44`

**Step 1: memo를 destructuring에 추가하고 updatePayload 조건 추가**

`const { title, start_distance, end_distance, elevation_gain, elevation_loss }` 라인에 `memo`를 추가.

`if (memo !== undefined) updatePayload.memo = memo;` 추가.

**Step 2: Commit**

```bash
git add apps/plan-my-route/app/api/stages/[id]/route.ts
git commit -m "feat: support memo field in stage PUT API"
```

---

### Task 3: 타입 확장 — Stage에 memo 추가

**Files:**
- Modify: `apps/plan-my-route/app/types/plan.ts:23-32`
- Modify: `apps/plan-my-route/app/components/RouteViewer.tsx:19-25` (DbStage 타입)
- Modify: `apps/plan-my-route/app/components/RouteViewer.tsx:27-41` (normalizeDbStages)

**Step 1: Stage 타입에 memo 추가**

`plan.ts`의 Stage interface에 `memo?: string;` 추가.

**Step 2: DbStage에 memo 추가**

RouteViewer.tsx의 DbStage 타입에 `memo?: string | null;` 추가.

**Step 3: normalizeDbStages에서 memo 매핑**

`normalizeDbStages` 함수의 반환 객체에 `memo: s.memo ?? undefined` 추가.

**Step 4: Commit**

```bash
git add apps/plan-my-route/app/types/plan.ts apps/plan-my-route/app/components/RouteViewer.tsx
git commit -m "feat: add memo to Stage type and normalize function"
```

---

### Task 4: StageCard — 메모 1줄 미리보기 + 클릭 핸들러

**Files:**
- Modify: `apps/plan-my-route/app/components/StageCard.tsx`

**Step 1: props에 onMemoClick 추가**

StageCardProps에 `onMemoClick?: (stageId: string) => void;` 추가.

**Step 2: 카드 하단에 메모 미리보기 영역 추가**

거리·고도 영역(`<div className="flex items-center justify-between text-sm">`) 아래에:

```tsx
{(stage.memo || onMemoClick) && (
  <button
    type="button"
    className="mt-2 flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-xs text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
    onClick={(e) => {
      e.stopPropagation();
      onMemoClick?.(stage.id);
    }}
  >
    <StickyNoteIcon className="h-3 w-3 shrink-0" />
    {stage.memo ? (
      <span className="line-clamp-1 text-zinc-500 dark:text-zinc-400">{stage.memo}</span>
    ) : (
      <span className="text-zinc-400 dark:text-zinc-500">메모 추가</span>
    )}
  </button>
)}
```

lucide-react에서 `StickyNoteIcon` import 추가.

**Step 3: Commit**

```bash
git add apps/plan-my-route/app/components/StageCard.tsx
git commit -m "feat: add memo preview and click handler to StageCard"
```

---

### Task 5: MemoPane 컴포넌트 생성

**Files:**
- Create: `apps/plan-my-route/app/components/MemoPane.tsx`

**Step 1: MemoPane 컴포넌트 작성**

- w-80, StagesPane과 동일한 스타일의 패널
- 상단: 스테이지 번호/날짜 + 닫기(X) 버튼
- 본문: textarea (flex-1)
- 하단: 저장 버튼
- 저장 시 `PUT /api/stages/[id]` { memo } 호출
- 저장 성공 시 `onSave(stageId, memo)` 콜백으로 부모에 알림

**Step 2: Commit**

```bash
git add apps/plan-my-route/app/components/MemoPane.tsx
git commit -m "feat: create MemoPane component"
```

---

### Task 6: PlanStagesPane — onMemoClick 전달

**Files:**
- Modify: `apps/plan-my-route/app/components/PlanStagesPane.tsx`

**Step 1: props에 onMemoClick 추가**

PlanStagesPaneProps에 `onMemoClick?: (stageId: string) => void;` 추가.

**Step 2: StageCard에 onMemoClick 전달**

```tsx
<StageCard
  ...
  onMemoClick={onMemoClick}
/>
```

**Step 3: Commit**

```bash
git add apps/plan-my-route/app/components/PlanStagesPane.tsx
git commit -m "feat: pass onMemoClick through PlanStagesPane"
```

---

### Task 7: RouteViewer — memo pane 상태 관리 + 레이아웃

**Files:**
- Modify: `apps/plan-my-route/app/components/RouteViewer.tsx`

**Step 1: 상태 추가**

```tsx
const [memoPaneStageId, setMemoPaneStageId] = useState<string | null>(null);
const [planListWasCollapsed, setPlanListWasCollapsed] = useState(false);
```

**Step 2: memo pane 열기 핸들러**

```tsx
const handleOpenMemo = useCallback((stageId: string) => {
  setMemoPaneStageId(stageId);
  setPlanListWasCollapsed(planListCollapsed);
  setPlanListCollapsed(true);
}, [planListCollapsed]);
```

**Step 3: memo pane 닫기 핸들러**

```tsx
const handleCloseMemo = useCallback(() => {
  setMemoPaneStageId(null);
  setPlanListCollapsed(planListWasCollapsed);
}, [planListWasCollapsed]);
```

**Step 4: memo 저장 핸들러**

```tsx
const handleSaveMemo = useCallback((stageId: string, memo: string) => {
  setDbStages((prev) =>
    prev.map((s) => (s.id === stageId ? { ...s, memo: memo || undefined } : s))
  );
}, []);
```

**Step 5: 레이아웃에 MemoPane 추가**

PlanStagesPane 아래에:

```tsx
{memoPaneStageId && (
  <MemoPane
    stage={stages.find((s) => s.id === memoPaneStageId)!}
    dateLabel={stageDayLabel(
      stages.find((s) => s.id === memoPaneStageId)!.dayNumber,
      effectivePlanStartDate,
    )}
    onClose={handleCloseMemo}
    onSave={handleSaveMemo}
  />
)}
```

PlanStagesPane에 `onMemoClick={handleOpenMemo}` 전달.

**Step 6: 플랜 전환 시 memo pane 닫기**

handlePlanSelect에서 `setMemoPaneStageId(null)` 추가.

**Step 7: Commit**

```bash
git add apps/plan-my-route/app/components/RouteViewer.tsx
git commit -m "feat: wire MemoPane into RouteViewer layout with auto-collapse"
```

---
