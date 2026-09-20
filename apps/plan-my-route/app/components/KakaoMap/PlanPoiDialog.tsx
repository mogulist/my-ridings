"use client";

import {
	Button,
	cn,
	Field,
	FieldGroup,
	FieldLabel,
	Input,
	Label,
	RadioGroup,
	RadioGroupItem,
	Textarea,
} from "@my-ridings/ui";
import { X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import {
	isPlanPoiType,
	PLAN_POI_TYPES,
	type PlanPoiAssignmentMode,
	type PlanPoiIntent,
	type PlanPoiRow,
	type PlanPoiType,
} from "@/app/types/planPoi";
import type { NearbyCategoryId } from "./nearbyCategoryId";

const POI_TYPE_LABELS: Record<PlanPoiType, string> = {
	convenience: "편의점",
	mart: "마트",
	accommodation: "숙소",
	cafe: "카페",
	restaurant: "음식점",
};

const INTENT_LABELS: Record<PlanPoiIntent, string> = {
	candidate: "후보",
	planned: "이용 예정",
	confirmed: "확정",
};

type StageOption = { id: string; dayNumber: number };

function categoryToDefaultPoiType(categoryId: NearbyCategoryId): PlanPoiType {
	if (categoryId === "restaurant") return "restaurant";
	if (categoryId === "cafe") return "cafe";
	if (categoryId === "convenience") return "convenience";
	if (categoryId === "mart") return "mart";
	return "accommodation";
}

function rowToDefaultPoiType(poiType: string): PlanPoiType {
	return isPlanPoiType(poiType) ? poiType : "accommodation";
}

export type PlanPoiDialogProps =
	| {
			mode: "create";
			open: boolean;
			onOpenChange: (open: boolean) => void;
			initialPlaceName: string;
			defaultCategoryId: NearbyCategoryId;
			kakaoPlaceId: string;
			lat: number;
			lng: number;
			phone: string | null;
			addressName: string | null;
			placeUrl: string | null;
			stages: StageOption[];
			currentStageId: string | null;
			distanceAssignmentLabel: string | null;
			hasActivePlan: boolean;
			onSave: (payload: {
				kakao_place_id: string | null;
				name: string;
				poi_type: PlanPoiType;
				memo: string | null;
				lat: number;
				lng: number;
				assignment_mode: PlanPoiAssignmentMode;
				stage_id: string | null;
				intent: PlanPoiIntent;
				phone: string | null;
				address_name: string | null;
				place_url: string | null;
			}) => Promise<PlanPoiRow | null>;
	  }
	| {
			mode: "edit";
			open: boolean;
			onOpenChange: (open: boolean) => void;
			row: PlanPoiRow;
			stages: StageOption[];
			distanceAssignmentLabel: string | null;
			onSave: (payload: {
				name: string;
				poi_type: PlanPoiType;
				memo: string | null;
				assignment_mode: PlanPoiAssignmentMode;
				stage_id: string | null;
				intent: PlanPoiIntent;
			}) => Promise<PlanPoiRow | null>;
	  };

export function PlanPoiDialog(props: PlanPoiDialogProps) {
	const { open, onOpenChange, mode } = props;
	const titleId = useId();
	const baseId = useId();
	const typeLegendId = `${baseId}-type-label`;
	const nameId = `${baseId}-name`;
	const memoId = `${baseId}-memo`;
	const assignmentStageId = `${baseId}-assignment-stage`;
	const assignmentDistanceId = `${baseId}-assignment-distance`;
	const assignmentPlanId = `${baseId}-assignment-plan`;

	const [name, setName] = useState("");
	const [poiType, setPoiType] = useState<PlanPoiType>("accommodation");
	const [memo, setMemo] = useState("");
	const [assignmentMode, setAssignmentMode] = useState<PlanPoiAssignmentMode>("distance");
	const [stageId, setStageId] = useState<string>("");
	const [intent, setIntent] = useState<PlanPoiIntent>("planned");
	const [isSaving, setIsSaving] = useState(false);

	const formSyncKey =
		props.mode === "create"
			? `create:${props.initialPlaceName}:${props.defaultCategoryId}:${props.currentStageId ?? ""}`
			: `edit:${props.row.id}:${props.row.updated_at}`;

	// formSyncKey에 이름·카테고리·row 버전이 포함되어 열림/데이터 변경 시만 동기화된다.
	// biome-ignore lint/correctness/useExhaustiveDependencies: formSyncKey is the intentional form reset boundary.
	useEffect(() => {
		if (!open) return;
		if (props.mode === "create") {
			setName(props.initialPlaceName);
			setPoiType(categoryToDefaultPoiType(props.defaultCategoryId));
			setMemo("");
			setAssignmentMode(props.currentStageId ? "stage" : "distance");
			setStageId(props.currentStageId ?? props.stages[0]?.id ?? "");
			setIntent(props.defaultCategoryId === "accommodation" ? "candidate" : "planned");
			return;
		}
		setName(props.row.name);
		setPoiType(rowToDefaultPoiType(props.row.poi_type));
		setMemo(props.row.memo ?? "");
		setAssignmentMode(
			props.row.assignment_mode === "stage" && !props.row.stage_id
				? "distance"
				: (props.row.assignment_mode ?? "distance"),
		);
		setStageId(props.row.stage_id ?? props.stages[0]?.id ?? "");
		setIntent(props.row.intent ?? "planned");
	}, [open, formSyncKey]);

	const handleClose = useCallback(() => {
		if (isSaving) return;
		onOpenChange(false);
	}, [isSaving, onOpenChange]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") handleClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, handleClose]);

	const handleSave = async () => {
		if (mode === "create" && !props.hasActivePlan) {
			alert("플랜을 먼저 선택해 주세요.");
			return;
		}
		const trimmed = name.trim();
		if (!trimmed) {
			alert("이름을 입력해 주세요.");
			return;
		}
		setIsSaving(true);
		if (assignmentMode === "stage" && !stageId) {
			alert("스테이지를 선택해 주세요.");
			setIsSaving(false);
			return;
		}
		try {
			if (mode === "create") {
				const row = await props.onSave({
					kakao_place_id: props.kakaoPlaceId || null,
					name: trimmed,
					poi_type: poiType,
					memo: memo.trim() || null,
					lat: props.lat,
					lng: props.lng,
					assignment_mode: assignmentMode,
					stage_id: assignmentMode === "stage" ? stageId : null,
					intent,
					phone: props.phone,
					address_name: props.addressName,
					place_url: props.placeUrl,
				});
				if (row) onOpenChange(false);
			} else {
				const row = await props.onSave({
					name: trimmed,
					poi_type: poiType,
					memo: memo.trim() || null,
					assignment_mode: assignmentMode,
					stage_id: assignmentMode === "stage" ? stageId : null,
					intent,
				});
				if (row) onOpenChange(false);
			}
		} finally {
			setIsSaving(false);
		}
	};

	if (!open) return null;

	const title = mode === "create" ? "플랜에 POI 추가" : "POI 수정";

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: backdrop clicks dismiss the modal; Escape is handled globally.
		<div
			className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-10 sm:items-center sm:pt-4"
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) handleClose();
			}}
		>
			<div
				className="border-border bg-card text-card-foreground flex max-h-[90vh] w-full max-w-md flex-col rounded-lg border shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div className="border-border flex items-center justify-between border-b px-4 py-3">
					<h2 id={titleId} className="text-base font-semibold">
						{title}
					</h2>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={handleClose}
						disabled={isSaving}
						className="text-muted-foreground size-8 shrink-0"
						aria-label="닫기"
					>
						<X className="size-5" />
					</Button>
				</div>
				<FieldGroup className="overflow-y-auto p-4">
					<Field>
						<FieldLabel htmlFor={nameId}>이름</FieldLabel>
						<Input id={nameId} type="text" value={name} onChange={(e) => setName(e.target.value)} />
					</Field>
					<Field>
						<FieldLabel>일정에서 사용할 위치</FieldLabel>
						<RadioGroup
							value={assignmentMode}
							onValueChange={(v) => setAssignmentMode(v as PlanPoiAssignmentMode)}
							disabled={isSaving}
							className="grid gap-2"
						>
							{props.stages.length > 0 ? (
								<label
									htmlFor={assignmentStageId}
									className="border-input flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm"
								>
									<RadioGroupItem id={assignmentStageId} value="stage" className="mt-0.5" />
									<span className="flex-1">
										<span className="block font-medium">특정 스테이지에서 사용할 장소</span>
										<span className="text-muted-foreground text-xs">
											실제 위치와 관계없이 선택한 일정에 표시합니다.
										</span>
									</span>
								</label>
							) : null}
							<label
								htmlFor={assignmentDistanceId}
								className="border-input flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm"
							>
								<RadioGroupItem id={assignmentDistanceId} value="distance" className="mt-0.5" />
								<span>
									<span className="block font-medium">
										거리 기준 자동 배정
										{props.distanceAssignmentLabel
											? ` · 예상 ${props.distanceAssignmentLabel}`
											: ""}
									</span>
									<span className="text-muted-foreground text-xs">
										경로에서 가장 가까운 지점의 스테이지에 표시합니다.
									</span>
								</span>
							</label>
							<label
								htmlFor={assignmentPlanId}
								className="border-input flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm"
							>
								<RadioGroupItem id={assignmentPlanId} value="plan" className="mt-0.5" />
								<span>
									<span className="block font-medium">플랜 전체에만 저장</span>
									<span className="text-muted-foreground text-xs">
										아직 어느 스테이지에서 사용할지 정하지 않습니다.
									</span>
								</span>
							</label>
						</RadioGroup>
						{assignmentMode === "stage" ? (
							<select
								value={stageId}
								onChange={(e) => setStageId(e.target.value)}
								disabled={isSaving}
								className="border-input bg-background mt-2 h-9 w-full rounded-md border px-3 text-sm"
							>
								{props.stages.map((stage) => (
									<option key={stage.id} value={stage.id}>
										스테이지 {stage.dayNumber}
									</option>
								))}
							</select>
						) : null}
					</Field>
					<Field>
						<FieldLabel>이용 계획</FieldLabel>
						<RadioGroup
							value={intent}
							onValueChange={(v) => setIntent(v as PlanPoiIntent)}
							disabled={isSaving}
							className="flex flex-wrap gap-2"
						>
							{(Object.keys(INTENT_LABELS) as PlanPoiIntent[]).map((value) => {
								const itemId = `${baseId}-intent-${value}`;
								return (
									<div key={value}>
										<RadioGroupItem value={value} id={itemId} className="peer sr-only" />
										<Label
											htmlFor={itemId}
											className="border-input peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary inline-flex cursor-pointer rounded-full border px-3 py-1.5 text-sm"
										>
											{INTENT_LABELS[value]}
										</Label>
									</div>
								);
							})}
						</RadioGroup>
					</Field>
					<Field>
						<FieldLabel id={typeLegendId}>타입</FieldLabel>
						<RadioGroup
							aria-labelledby={typeLegendId}
							value={poiType}
							onValueChange={(v) => setPoiType(v as PlanPoiType)}
							disabled={isSaving}
							className="flex flex-wrap gap-2 pt-0.5"
						>
							{PLAN_POI_TYPES.map((t) => {
								const itemId = `${baseId}-type-${t}`;
								return (
									<div key={t} className="relative">
										<RadioGroupItem value={t} id={itemId} className="peer sr-only" />
										<Label
											htmlFor={itemId}
											className={cn(
												"border-input bg-background text-foreground inline-flex cursor-pointer rounded-full border px-3 py-1.5 text-sm font-normal transition-colors",
												"hover:bg-accent hover:text-accent-foreground",
												"peer-focus-visible:ring-ring peer-focus-visible:ring-offset-background peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2",
												"peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary",
												"peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
											)}
										>
											{POI_TYPE_LABELS[t]}
										</Label>
									</div>
								);
							})}
						</RadioGroup>
					</Field>
					<Field>
						<FieldLabel htmlFor={memoId}>메모</FieldLabel>
						<Textarea
							id={memoId}
							rows={mode === "create" ? 3 : 4}
							value={memo}
							onChange={(e) => setMemo(e.target.value)}
						/>
					</Field>
				</FieldGroup>
				<div className="border-border flex justify-end gap-2 border-t px-4 py-3">
					<Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
						취소
					</Button>
					<Button
						type="button"
						variant="default"
						onClick={() => void handleSave()}
						disabled={isSaving}
					>
						{isSaving ? "저장 중…" : "저장"}
					</Button>
				</div>
			</div>
		</div>
	);
}
