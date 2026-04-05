"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import {
	Button,
	cn,
	Field,
	FieldGroup,
	FieldLabel,
	Input,
	Textarea,
} from "@my-ridings/ui";
import {
	isPlanPoiType,
	PLAN_POI_TYPES,
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

const SELECT_TRIGGER_CLASS = cn(
	"border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
);

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
			hasActivePlan: boolean;
			onSave: (payload: {
				kakao_place_id: string | null;
				name: string;
				poi_type: PlanPoiType;
				memo: string | null;
				lat: number;
				lng: number;
			}) => Promise<PlanPoiRow | null>;
	  }
	| {
			mode: "edit";
			open: boolean;
			onOpenChange: (open: boolean) => void;
			row: PlanPoiRow;
			onSave: (payload: {
				name: string;
				poi_type: PlanPoiType;
				memo: string | null;
			}) => Promise<PlanPoiRow | null>;
	  };

export function PlanPoiDialog(props: PlanPoiDialogProps) {
	const { open, onOpenChange, mode } = props;
	const titleId = useId();
	const baseId = useId();
	const typeId = `${baseId}-type`;
	const nameId = `${baseId}-name`;
	const memoId = `${baseId}-memo`;

	const [name, setName] = useState("");
	const [poiType, setPoiType] = useState<PlanPoiType>("accommodation");
	const [memo, setMemo] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	const formSyncKey =
		props.mode === "create"
			? `create:${props.initialPlaceName}:${props.defaultCategoryId}`
			: `edit:${props.row.id}:${props.row.updated_at}`;

	// formSyncKey에 이름·카테고리·row 버전이 포함되어 열림/데이터 변경 시만 동기화된다.
	useEffect(() => {
		if (!open) return;
		if (props.mode === "create") {
			setName(props.initialPlaceName);
			setPoiType(categoryToDefaultPoiType(props.defaultCategoryId));
			setMemo("");
			return;
		}
		setName(props.row.name);
		setPoiType(rowToDefaultPoiType(props.row.poi_type));
		setMemo(props.row.memo ?? "");
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
		try {
			if (mode === "create") {
				const row = await props.onSave({
					kakao_place_id: props.kakaoPlaceId || null,
					name: trimmed,
					poi_type: poiType,
					memo: memo.trim() || null,
					lat: props.lat,
					lng: props.lng,
				});
				if (row) onOpenChange(false);
			} else {
				const row = await props.onSave({
					name: trimmed,
					poi_type: poiType,
					memo: memo.trim() || null,
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
		<div
			className="absolute inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-10 sm:items-center sm:pt-4"
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) handleClose();
			}}
		>
			<div
				className="border-border bg-card text-card-foreground w-full max-w-md rounded-lg border shadow-xl"
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
				<FieldGroup className="p-4">
					<Field>
						<FieldLabel htmlFor={typeId}>타입</FieldLabel>
						<select
							id={typeId}
							value={poiType}
							onChange={(e) => setPoiType(e.target.value as PlanPoiType)}
							className={SELECT_TRIGGER_CLASS}
						>
							{PLAN_POI_TYPES.map((t) => (
								<option key={t} value={t}>
									{POI_TYPE_LABELS[t]}
								</option>
							))}
						</select>
					</Field>
					<Field>
						<FieldLabel htmlFor={nameId}>이름</FieldLabel>
						<Input
							id={nameId}
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
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
					<Button
						type="button"
						variant="outline"
						onClick={handleClose}
						disabled={isSaving}
					>
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
